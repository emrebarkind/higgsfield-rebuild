"use client";

import { useEffect, useRef, useState } from "react";
import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { prepareFrame } from "@/src/lib/frame";
import { frameBitmap } from "@/src/lib/render/bitmap";
import { loadDepthAsset } from "@/src/lib/depth/asset";
import { createScene } from "@/src/lib/render/scene";
import { witnessPath } from "@/src/lib/render/witness";
import { SAMPLES } from "@/src/lib/samples";
import { FILM, KEEPER, SAMPLE_ID, TAKES } from "@/src/film/config";
import { drawFilmFrame, type FilmAssets } from "@/src/film/draw";

type Render = { kind: "idle" } | { kind: "rendering"; done: number } | { kind: "done"; url: string; size: number } | { kind: "error"; message: string };

/** The family next/font registered for a CSS variable on <html>. */
const fontVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "sans-serif";

async function loadAssets(): Promise<FilmAssets> {
  const sample = SAMPLES.find((s) => s.id === SAMPLE_ID)!;
  const blob = await fetch(sample.src).then((r) => r.blob());
  const frame = await prepareFrame(blob, "sample", sample.prompt);
  const [bmp, depth, depthImage] = await Promise.all([
    frameBitmap(frame),
    loadDepthAsset(sample.depth),
    fetch(sample.depth).then((r) => r.blob()).then((b) => createImageBitmap(b)),
  ]);
  const shot = createScene(new OffscreenCanvas(1280, 720), bmp, depth, { lensMm: 35, preserveDrawingBuffer: true });
  shot.resize(1280, 720, "16:9");
  const witness = createScene(new OffscreenCanvas(2200, 1238), bmp, depth, { lensMm: 35, preserveDrawingBuffer: true, witness: true });
  witness.resize(2200, 1238, "16:9");
  const aspect = frame.width / frame.height;
  witness.setWitnessPath(witnessPath("push-in", TAKES[KEEPER].params, TAKES[KEEPER].seed, aspect));
  const fonts = { display: fontVar("--nf-display"), ui: fontVar("--nf-ui"), mono: fontVar("--nf-mono") };
  await Promise.all([document.fonts.load(`700 96px ${fonts.display}`), document.fonts.load(`500 40px ${fonts.ui}`), document.fonts.load(`700 22px ${fonts.mono}`)]);
  return { photo: bmp, depthImage, shot, witness, depth, frameAspect: aspect, fonts };
}

export function FilmView() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const assets = useRef<FilmAssets | null>(null);
  const [ready, setReady] = useState(false);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [render, setRender] = useState<Render>({ kind: "idle" });

  useEffect(() => {
    let gone = false;
    loadAssets().then(
      (a) => {
        if (gone) return a.shot.dispose(), a.witness.dispose();
        assets.current = a;
        setReady(true);
      },
      (e) => setRender({ kind: "error", message: String(e) }),
    );
    return () => {
      gone = true;
      assets.current?.shot.dispose();
      assets.current?.witness.dispose();
    };
  }, []);

  // Real-time preview: the same deterministic frame function the MP4 uses.
  useEffect(() => {
    if (!ready || !playing || render.kind === "rendering") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      setT((v) => (v + (now - last) / 1000) % FILM.durationS);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, playing, render.kind]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ready && ctx && assets.current && render.kind !== "rendering") drawFilmFrame(ctx, t, assets.current);
  }, [t, ready, render.kind]);

  const renderMp4 = async () => {
    const a = assets.current;
    const ctx = canvas.current?.getContext("2d");
    if (!a || !ctx || !canvas.current) return;
    setPlaying(false);
    setRender({ kind: "rendering", done: 0 });
    try {
      const { width, height, fps, durationS } = FILM;
      const config: VideoEncoderConfig = { codec: "avc1.640028", width, height, bitrate: 12_000_000, framerate: fps };
      if (!(await VideoEncoder.isConfigSupported(config)).supported) throw new Error("This browser can’t encode H.264 at 1080p.");
      const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width, height, frameRate: fps }, fastStart: "in-memory" });
      let failure: unknown = null;
      const encoder = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => (failure = e) });
      encoder.configure(config);
      const n = fps * durationS;
      for (let i = 0; i < n; i++) {
        if (failure) throw failure;
        drawFilmFrame(ctx, i / fps, a);
        const frame = new VideoFrame(canvas.current, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
        encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
        frame.close();
        while (encoder.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 0));
        if (i % 15 === 0) {
          setRender({ kind: "rendering", done: i });
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      await encoder.flush();
      encoder.close();
      muxer.finalize();
      const blob = new Blob([muxer.target.buffer], { type: "video/mp4" });
      setRender({ kind: "done", url: URL.createObjectURL(blob), size: blob.size });
    } catch (e) {
      setRender({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Product film</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">30 seconds, 1920×1080. Every camera shot in it was rendered by Dailies’ own renderer.</p>
      <video src="/film/dailies-30s.mp4" poster="/film/poster.jpg" controls playsInline muted autoPlay loop className="mt-4 w-full rounded border border-line bg-white" />
      <h2 className="mt-10 font-display text-2xl font-bold uppercase tracking-wide">The same film, rendered live</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Below, the film is drawn right now in your browser by the renderer, witness cam and rack focus, and “Render MP4” encodes it here, the
        same way a take is exported.
      </p>
      <canvas ref={canvas} width={FILM.width} height={FILM.height} className="mt-4 w-full rounded border border-line bg-white" aria-label="Dailies product film" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setPlaying(!playing)} disabled={!ready || render.kind === "rendering"} className="rounded border border-line px-3 py-1.5 font-mono text-xs uppercase hover:border-paper disabled:opacity-50">
          {playing ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          aria-label="Film time"
          min={0}
          max={FILM.durationS}
          step={1 / FILM.fps}
          value={t}
          onChange={(e) => {
            setPlaying(false);
            setT(Number(e.target.value));
          }}
          className="min-w-48 flex-1 accent-[var(--circle)]"
        />
        <span className="w-16 font-mono text-xs tabular-nums text-muted">{t.toFixed(1)} s</span>
        <button type="button" onClick={renderMp4} disabled={!ready || render.kind === "rendering"} className="rounded bg-go px-4 py-1.5 text-sm font-medium text-paper hover:bg-go/80 disabled:opacity-50">
          {render.kind === "rendering" ? `Rendering ${render.done} / ${FILM.fps * FILM.durationS}` : "Render MP4 · 1080p"}
        </button>
        {render.kind === "done" && (
          <a href={render.url} download="dailies-30s.mp4" className="text-sm underline hover:text-paper">
            Download dailies-30s.mp4 ({(render.size / 1e6).toFixed(1)} MB)
          </a>
        )}
        {render.kind === "error" && <span role="alert" className="text-sm">{render.message}</span>}
      </div>
    </div>
  );
}
