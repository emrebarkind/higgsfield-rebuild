// Pre-computed depth for the sample frames, shipped as greyscale PNGs, so the
// samples move instantly without downloading the depth model first.
import type { DepthMap } from './protocol';

export function depthFromGray(rgba: Uint8ClampedArray, width: number, height: number): DepthMap {
  const data = new Float32Array(width * height);
  for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4] / 255;
  return { width, height, data };
}

export function grayFromDepth(d: DepthMap): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(d.width * d.height * 4);
  for (let i = 0; i < d.data.length; i++) {
    const v = Math.round(d.data[i] * 255);
    rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = v;
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

export async function loadDepthAsset(url: string): Promise<DepthMap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Depth asset missing (${res.status})`);
  const bmp = await createImageBitmap(await res.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const { width, height } = bmp;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return depthFromGray(ctx.getImageData(0, 0, width, height).data, width, height);
}
