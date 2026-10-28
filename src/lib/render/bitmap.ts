import type { Frame } from '../frame';

// One decoded bitmap per frame, shared by every player and the exporter.
const cache = new Map<string, Promise<ImageBitmap>>();

export function frameBitmap(frame: Frame): Promise<ImageBitmap> {
  let bmp = cache.get(frame.id);
  if (!bmp) {
    bmp = createImageBitmap(frame.blob);
    cache.set(frame.id, bmp);
    bmp.catch(() => cache.delete(frame.id));
  }
  return bmp;
}
