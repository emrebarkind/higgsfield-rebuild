import { describe, expect, test } from 'vitest';
import { depthFromGray, grayFromDepth } from '../depth/asset';

describe('depth assets', () => {
  test('reads the red channel of RGBA pixels as 0..1 depth', () => {
    const rgba = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 51, 51, 51, 255]);
    const d = depthFromGray(rgba, 3, 1);
    expect([d.width, d.height]).toEqual([3, 1]);
    expect(Array.from(d.data).map((v) => Math.round(v * 100) / 100)).toEqual([0, 1, 0.2]);
  });

  test('writes depth as opaque grey RGBA, and reads back within 1/255', () => {
    const data = new Float32Array([0, 0.5, 1, 0.333]);
    const rgba = grayFromDepth({ width: 2, height: 2, data });
    expect(rgba.length).toBe(16);
    expect(Array.from(rgba.slice(4, 8))).toEqual([128, 128, 128, 255]);
    const back = depthFromGray(rgba, 2, 2);
    back.data.forEach((v, i) => expect(Math.abs(v - data[i])).toBeLessThanOrEqual(1 / 255));
  });
});
