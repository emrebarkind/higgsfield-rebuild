import { describe, expect, test } from 'vitest';
import { RACK, backgroundDepth, cocPx, focusDepthAt, rackAt, rackFocus } from '../focus';
import { MOVES } from '../moves';
import type { DepthMap } from '../depth/protocol';

/** 20×10 map: far (0.1) everywhere, a near subject (0.9) in the middle. */
function map(): DepthMap {
  const width = 20;
  const height = 10;
  const data = new Float32Array(width * height).fill(0.1);
  for (let y = 3; y < 7; y++) for (let x = 8; x < 12; x++) data[y * width + x] = 0.9;
  return { width, height, data };
}

describe('focusDepthAt', () => {
  test('reads the depth under the focus point, ignoring a stray pixel', () => {
    const d = map();
    d.data[5 * 20 + 10] = 0.2; // one noisy pixel on the subject
    expect(focusDepthAt(d, { x: 0.5, y: 0.5 })).toBeCloseTo(0.9, 5);
    expect(focusDepthAt(d, { x: 0.05, y: 0.1 })).toBeCloseTo(0.1, 5);
  });
});

describe('backgroundDepth', () => {
  test('is the far end of the frame (10th percentile)', () => {
    expect(backgroundDepth(map())).toBeCloseTo(0.1, 5);
  });
});

describe('rackAt', () => {
  test('starts on the background, lands on the subject by 60% of the move, then holds', () => {
    expect(rackAt(0, 0.1, 0.9)).toBeCloseTo(0.1, 5);
    expect(rackAt(RACK.rackShare, 0.1, 0.9)).toBeCloseTo(0.9, 5);
    expect(rackAt(1, 0.1, 0.9)).toBeCloseTo(0.9, 5);
    const a = rackAt(0.2, 0.1, 0.9);
    const b = rackAt(0.4, 0.1, 0.9);
    expect(a).toBeGreaterThan(0.1);
    expect(b).toBeGreaterThan(a);
  });
});

describe('cocPx', () => {
  test('sharp at the focus depth, blurrier with distance, never past the cap', () => {
    expect(cocPx(0.5, 0.5)).toBe(0);
    expect(cocPx(0.6, 0.5)).toBeGreaterThan(0);
    expect(cocPx(0.6, 0.5)).toBeLessThan(cocPx(0.8, 0.5));
    expect(cocPx(1, 0)).toBe(RACK.maxPx);
  });
});

describe('rackFocus', () => {
  test('off unless the take asks for it: old shots without `rack` render exactly as before', () => {
    const old = { ...MOVES['push-in'].defaults };
    delete old.rack;
    expect(rackFocus(map(), old, 0.5)).toBeNull();
    expect(rackFocus(map(), { ...old, rack: false }, 0.5)).toBeNull();
  });

  test('racks from the background to the subject under the focus point', () => {
    const p = { ...MOVES['push-in'].defaults, rack: true, focus: { x: 0.5, y: 0.5 } };
    expect(rackFocus(map(), p, 0)!.focusDepth).toBeCloseTo(0.1, 5);
    expect(rackFocus(map(), p, 1)!.focusDepth).toBeCloseTo(0.9, 5);
  });
});
