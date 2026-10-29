import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { DEPTH_SCALE, MOVES, poseAt } from '../moves';
import { WITNESS, insetRect, witnessPath, witnessView } from '../render/witness';
import { witnessAllowed } from '../flags';

describe('witnessPath', () => {
  test('is the move itself: samples of poseAt from t = 0 to 1, nothing invented', () => {
    const p = MOVES['dolly-zoom'].defaults;
    const path = witnessPath('dolly-zoom', p, 7, 1.5);
    expect(path).toHaveLength(WITNESS.samples + 1);
    expect(path[0]).toEqual(poseAt('dolly-zoom', p, 0, 7, 1.5));
    expect(path[30]).toEqual(poseAt('dolly-zoom', p, 30 / WITNESS.samples, 7, 1.5));
    expect(path.at(-1)).toEqual(poseAt('dolly-zoom', p, 1, 7, 1.5));
  });

  test('pan left turns the camera left and pan right turns it right', () => {
    const left = witnessPath('pan-left', MOVES['pan-left'].defaults, 0, 1.5).at(-1)!;
    const right = witnessPath('pan-right', MOVES['pan-right'].defaults, 0, 1.5).at(-1)!;
    expect(left.yawDeg).toBeGreaterThan(0);
    expect(right.yawDeg).toBeLessThan(0);
  });
});

describe('witnessView', () => {
  test('is fixed for a lens and aspect, raised and turned to one side, looking between the photo and the camera', () => {
    const a = witnessView(35, 1.5);
    expect(witnessView(35, 1.5)).toEqual(a);
    const [x, y, z] = a.position;
    const [, , tz] = a.target;
    expect(x).toBeGreaterThan(0);
    expect(y).toBeGreaterThan(0);
    expect(z).toBeGreaterThan(tz);
    expect(tz).toBeGreaterThan(-DEPTH_SCALE);
    expect(Math.atan2(y - a.target[1], Math.hypot(x - a.target[0], z - tz)) * (180 / Math.PI)).toBeCloseTo(WITNESS.pitchDeg, 5);
  });
});

describe('insetRect', () => {
  test('sits in the top-right corner of the frame (the player controls own the bottom), about a third of its width, inside it', () => {
    const frame = { x: 100, y: 50, width: 1280, height: 720 };
    const r = insetRect(frame);
    expect(r.width).toBe(Math.round(frame.width * WITNESS.insetWidth));
    expect(r.x + r.width).toBeLessThanOrEqual(frame.x + frame.width);
    expect(r.x).toBeGreaterThan(frame.x + frame.width / 2);
    expect(r.y + r.height).toBeLessThanOrEqual(frame.y + frame.height); // GL origin is bottom-left
    expect(r.y).toBeGreaterThan(frame.y + frame.height / 2);
  });
});

describe('export', () => {
  test('never draws the witness view into the MP4', () => {
    const src = readFileSync(new URL('../export/mp4.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/createScene\(/);
    expect(src).not.toMatch(/witness/i);
  });
});

describe('witnessAllowed', () => {
  test('on by default, off with ?witness=0', () => {
    expect(witnessAllowed('')).toBe(true);
    expect(witnessAllowed('?witness=1')).toBe(true);
    expect(witnessAllowed('?witness=0')).toBe(false);
  });
});
