// Pure post-processing for the depth model's output, shared by the worker and tests.

/** Raw relative inverse depth → 0..1 with 1 = nearest. A flat map becomes 0. */
export function normalizeDepth(raw: Float32Array): Float32Array {
  let min = Infinity;
  let max = -Infinity;
  for (const v of raw) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min;
  const out = new Float32Array(raw.length);
  if (range <= 0) return out;
  for (let i = 0; i < raw.length; i++) out[i] = (raw[i] - min) / range;
  return out;
}

/** 3×3 box blur; edge pixels average only the neighbours that exist. */
export function boxBlur3(data: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          sum += data[yy * width + xx];
          n++;
        }
      }
      out[y * width + x] = sum / n;
    }
  }
  return out;
}
