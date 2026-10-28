// Export a take by re-rendering it offline, frame by frame, with the same
// renderer the preview uses: WebCodecs H.264 → mp4-muxer (docs/spikes.md §3),
// or MediaRecorder WebM where the browser can't encode H.264.
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { poseAt, type MoveId, type OutAspect } from '../moves';
import { createScene, type TakeRecipe } from '../render/scene';
import { frameBitmap } from '../render/bitmap';

export type ExportPath = 'webcodecs-mp4' | 'mediarecorder-webm';
export interface ExportOptions {
  height: 720 | 1080;
  aspect: OutAspect;
  fps: 30;
}

export function pickExportPath(caps: { videoEncoder: boolean; mediaRecorder: boolean }): ExportPath | null {
  if (caps.videoEncoder) return 'webcodecs-mp4';
  if (caps.mediaRecorder) return 'mediarecorder-webm';
  return null;
}

export function exportCaps() {
  return { videoEncoder: typeof VideoEncoder !== 'undefined', mediaRecorder: typeof MediaRecorder !== 'undefined' };
}

export function frameCount(durationS: number, fps: number): number {
  return Math.max(2, Math.round(durationS * fps));
}

/** `p` is the short edge: 1080p 9:16 is 1080×1920. Edges stay even for H.264. */
export function exportSize(p: 720 | 1080, aspect: OutAspect): { width: number; height: number } {
  const even = (n: number) => Math.round(n / 2) * 2;
  if (aspect === '1:1') return { width: p, height: p };
  const long = even((p * 16) / 9);
  return aspect === '16:9' ? { width: long, height: p } : { width: p, height: long };
}

export function exportFileName(shot: number, take: number, moveId: MoveId, ext: 'mp4' | 'webm'): string {
  return `dailies-shot${String(shot).padStart(2, '0')}-take${take}-${moveId}.${ext}`;
}

/** A second call while the first is running gets the same promise. */
export function createSingleFlight<T>(fn: () => Promise<T>): () => Promise<T> {
  let running: Promise<T> | null = null;
  return () =>
    (running ??= fn().finally(() => {
      running = null;
    }));
}

const H264 = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028'];

async function supportedConfig(width: number, height: number, fps: number): Promise<VideoEncoderConfig | null> {
  const bitrate = height * width >= 1920 * 1080 ? 10_000_000 : 5_000_000;
  for (const codec of H264) {
    const config: VideoEncoderConfig = { codec, width, height, bitrate, framerate: fps };
    try {
      if ((await VideoEncoder.isConfigSupported(config)).supported) return config;
    } catch {
      // try the next profile
    }
  }
  return null;
}

const aborted = () => new DOMException('Export cancelled', 'AbortError');
const yieldToUi = () => new Promise((r) => setTimeout(r, 0));

export async function exportTake(
  recipe: TakeRecipe,
  opts: ExportOptions,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const { width, height } = exportSize(opts.height, opts.aspect);
  const n = frameCount(recipe.params.durationS, opts.fps);
  const bitmap = await frameBitmap(recipe.frame);
  const path = pickExportPath(exportCaps());
  if (!path) throw new Error('This browser can’t record video.');
  const config = path === 'webcodecs-mp4' ? await supportedConfig(width, height, opts.fps) : null;

  // OffscreenCanvas when encoding; a (detached) <canvas> when MediaRecorder needs captureStream.
  const canvas: HTMLCanvasElement | OffscreenCanvas =
    config && typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : document.createElement('canvas');
  const scene = createScene(canvas, bitmap, recipe.depth, { lensMm: recipe.params.lensMm, preserveDrawingBuffer: true });
  scene.resize(width, height, opts.aspect);
  const aspect = recipe.frame.width / recipe.frame.height;
  const draw = (i: number) => {
    scene.setPose(poseAt(recipe.moveId, recipe.params, i / (n - 1), recipe.seed, aspect));
    scene.render();
  };

  try {
    if (config) return await encodeMp4(canvas, config, n, opts.fps, draw, onProgress, signal);
    return await recordWebm(canvas as HTMLCanvasElement, n, opts.fps, draw, onProgress, signal);
  } finally {
    scene.dispose();
  }
}

async function encodeMp4(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  config: VideoEncoderConfig,
  n: number,
  fps: number,
  draw: (i: number) => void,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: config.width, height: config.height, frameRate: fps },
    fastStart: 'in-memory',
  });
  let failure: unknown = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => (failure = e),
  });
  encoder.configure(config);
  const frameUs = 1e6 / fps;
  try {
    for (let i = 0; i < n; i++) {
      if (signal?.aborted) throw aborted();
      if (failure) throw failure;
      draw(i);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(i * frameUs), duration: Math.round(frameUs) });
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      onProgress(i + 1, n);
      while (encoder.encodeQueueSize > 4) await yieldToUi();
      if (i % 4 === 0) await yieldToUi();
    }
    await encoder.flush();
    if (failure) throw failure;
    muxer.finalize();
    return new Blob([muxer.target.buffer], { type: 'video/mp4' });
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
}

async function recordWebm(
  canvas: HTMLCanvasElement,
  n: number,
  fps: number,
  draw: (i: number) => void,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((r) => (rec.onstop = () => r()));
  draw(0);
  rec.start();
  try {
    // MediaRecorder timestamps in real time, so frames are stepped at the frame rate.
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      if (signal?.aborted) throw aborted();
      draw(i);
      onProgress(i + 1, n);
      const due = t0 + ((i + 1) * 1000) / fps;
      await new Promise((r) => setTimeout(r, Math.max(0, due - performance.now())));
    }
  } finally {
    if (rec.state !== 'inactive') rec.stop();
    stream.getTracks().forEach((t) => t.stop());
  }
  await stopped;
  return new Blob(chunks, { type: 'video/webm' });
}
