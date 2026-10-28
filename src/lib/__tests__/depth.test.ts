import { describe, expect, test } from 'vitest';
import { boxBlur3, normalizeDepth } from '../depth/process';

describe('normalizeDepth', () => {
  test('maps the raw range onto 0..1, keeping higher = nearer', () => {
    const out = normalizeDepth(new Float32Array([2, 4, 6]));
    expect(Array.from(out)).toEqual([0, 0.5, 1]);
  });

  test('a flat map becomes all zeros instead of NaN', () => {
    expect(Array.from(normalizeDepth(new Float32Array([3, 3, 3, 3])))).toEqual([0, 0, 0, 0]);
  });
});

describe('boxBlur3', () => {
  test('averages each pixel with its 3x3 neighbourhood', () => {
    // 3x3 with a single bright centre: the centre becomes 1/9, corners too
    const data = new Float32Array([0, 0, 0, 0, 9, 0, 0, 0, 0]);
    const out = boxBlur3(data, 3, 3);
    expect(out[4]).toBeCloseTo(1);
    expect(out[0]).toBeCloseTo(9 / 4); // corner sees 4 pixels, one of them 9
  });

  test('keeps a constant map constant, edges included', () => {
    const out = boxBlur3(new Float32Array(12).fill(0.4), 4, 3);
    for (const v of out) expect(v).toBeCloseTo(0.4);
  });

  test('does not modify its input', () => {
    const data = new Float32Array([1, 0, 0, 0]);
    boxBlur3(data, 2, 2);
    expect(Array.from(data)).toEqual([1, 0, 0, 0]);
  });
});
