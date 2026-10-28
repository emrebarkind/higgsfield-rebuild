// A frame is the still image a shot is built on: validated, downscaled and
// flattened onto graphite before depth ever sees it.

export interface Frame {
  id: string;
  blob: Blob;
  width: number;
  height: number;
  source: 'upload' | 'generated' | 'sample';
  prompt?: string;
  createdAt: number;
}

export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_EDGE = 1536;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
/** --bg; transparent pixels are composited on it. */
const GRAPHITE = '#1c1b19';

export function validateFile(f: { type: string; size: number }): { ok: true } | { ok: false; message: string } {
  if (!ACCEPTED.includes(f.type)) {
    return { ok: false, message: 'Use a JPG, PNG or WebP image. HEIC and other formats aren’t supported yet.' };
  }
  if (f.size > MAX_BYTES) {
    const mb = (f.size / (1024 * 1024)).toFixed(1);
    return { ok: false, message: `That image is ${mb} MB. The limit is 10 MB.` };
  }
  return { ok: true };
}

export function targetSize(w: number, h: number, maxEdge = MAX_EDGE): { width: number; height: number } {
  const long = Math.max(w, h);
  if (long <= maxEdge) return { width: w, height: h };
  const k = maxEdge / long;
  return w >= h
    ? { width: maxEdge, height: Math.round(h * k) }
    : { width: Math.round(w * k), height: maxEdge };
}

async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Decode, downscale to MAX_EDGE, flatten alpha onto graphite, re-encode as JPEG. */
export async function prepareFrame(file: Blob, source: Frame['source'], prompt?: string): Promise<Frame> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = targetSize(bitmap.width, bitmap.height);
  let blob: Blob;
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    draw(ctx, bitmap, width, height);
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext('2d')!, bitmap, width, height);
    blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode the frame'))), 'image/jpeg', 0.92),
    );
  }
  bitmap.close();
  // Hash the original bytes, so the same file always maps to the same frame (and depth cache).
  return { id: await sha256Hex(file), blob, width, height, source, prompt, createdAt: Date.now() };
}

function draw(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  width: number,
  height: number,
) {
  ctx.fillStyle = GRAPHITE;
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
}
