import { describe, expect, test } from 'vitest';
import {
  MOVES,
  STRENGTH_CAPS,
  ease,
  fitFrame,
  poseAt,
  usesFocus,
  type CameraPose,
  type Easing,
  type MoveId,
  type MoveParams,
} from '@/src/lib/moves';

const IDS = Object.keys(MOVES) as MoveId[];

const p: MoveParams = {
  strength: 0.5,
  durationS: 5,
  easing: 'linear',
  lensMm: 35,
  focus: { x: 0.5, y: 0.5 },
  handheld: 0.6,
};

function expectPoseClose(a: CameraPose, b: CameraPose, eps = 1e-9) {
  for (const k of ['x', 'y', 'z', 'yawDeg', 'pitchDeg', 'fovDeg'] as const) {
    expect(Math.abs(a[k] - b[k]), k).toBeLessThan(eps);
  }
}

describe('poseAt', () => {
  test('has all 9 moves', () => {
    expect(IDS.sort()).toEqual(
      ['crane-up', 'crash-zoom', 'dolly-zoom', 'orbit', 'pan-left', 'pan-right', 'pull-back', 'push-in', 'static'],
    );
  });

  test('t=0 is the base pose for every move at the same lens (pull-back ends there instead)', () => {
    const base = poseAt('static', { ...p, handheld: 0 }, 0);
    for (const id of IDS) {
      if (id === 'pull-back') continue;
      expectPoseClose(poseAt(id, p, 0, 7), base);
    }
    expectPoseClose(poseAt('pull-back', { ...p, handheld: 0 }, 1), base);
  });

  test('push-in moves toward the plane monotonically', () => {
    const zs = [0, 0.25, 0.5, 1].map((t) => poseAt('push-in', { ...p, handheld: 0 }, t).z);
    for (let i = 1; i < zs.length; i++) expect(zs[i]).toBeLessThan(zs[i - 1]);
  });

  test('pull-back is push-in reversed', () => {
    for (const t of [0, 0.2, 0.5, 0.9, 1]) {
      expect(poseAt('pull-back', p, t).z).toBeCloseTo(poseAt('push-in', p, 1 - t).z, 9);
    }
  });

  test('dolly-zoom keeps subject height constant and swings the FOV', () => {
    const q = { ...p, strength: 1, handheld: 0 };
    const k = (pose: CameraPose) => pose.z * Math.tan((pose.fovDeg * Math.PI) / 360);
    const k0 = k(poseAt('dolly-zoom', q, 0));
    for (const t of [0.1, 0.3, 0.6, 1]) expect(Math.abs(k(poseAt('dolly-zoom', q, t)) - k0)).toBeLessThan(1e-6);
    const swing = poseAt('dolly-zoom', q, 1).fovDeg - poseAt('dolly-zoom', q, 0).fovDeg;
    expect(swing).toBeGreaterThanOrEqual(14);
  });

  test('strength is capped', () => {
    for (const id of IDS) {
      const over = poseAt(id, { ...p, strength: 5 }, 1, 3);
      const atCap = poseAt(id, { ...p, strength: STRENGTH_CAPS[id] }, 1, 3);
      expectPoseClose(over, atCap);
    }
  });

  test('static with handheld 0 never moves', () => {
    const base = poseAt('static', { ...p, handheld: 0 }, 0);
    for (const t of [0.1, 0.37, 0.8, 1]) expectPoseClose(poseAt('static', { ...p, handheld: 0 }, t, 9), base);
  });

  test('handheld varies with t, is deterministic per seed and differs across seeds', () => {
    const q = { ...p, handheld: 1 };
    const a = poseAt('static', q, 0.5, 1);
    const b = poseAt('static', q, 0.8, 1);
    expect(a.x === b.x && a.y === b.y && a.yawDeg === b.yawDeg).toBe(false);
    expect(poseAt('static', q, 0.5, 1)).toEqual(a);
    const c = poseAt('static', q, 0.5, 2);
    expect(c.x === a.x && c.y === a.y).toBe(false);
  });

  test('handheld stays small: <= 0.01 scene units and <= 0.3 degrees', () => {
    const base = poseAt('static', { ...p, handheld: 0 }, 0);
    for (let i = 0; i <= 50; i++) {
      const pose = poseAt('static', { ...p, handheld: 1 }, i / 50, 5);
      expect(Math.abs(pose.x - base.x)).toBeLessThanOrEqual(0.01 + 1e-12);
      expect(Math.abs(pose.y - base.y)).toBeLessThanOrEqual(0.01 + 1e-12);
      expect(Math.abs(pose.yawDeg)).toBeLessThanOrEqual(0.3 + 1e-12);
      expect(Math.abs(pose.pitchDeg)).toBeLessThanOrEqual(0.3 + 1e-12);
    }
  });
});

describe('focus point', () => {
  const off = { ...p, handheld: 0, strength: 1, focus: { x: 0.8, y: 0.2 } };
  // half-height of the view on the z = 0 plane, from the camera pose
  const halfH = (pose: CameraPose) => pose.z * Math.tan((pose.fovDeg * Math.PI) / 360);

  test('push-in travels toward the focus point and keeps the view inside the frame', () => {
    const end = poseAt('push-in', off, 1, 0, 1);
    const fx = (0.8 - 0.5) * 2;
    const fy = (0.5 - 0.2) * 2;
    expect(end.x).toBeGreaterThan(0);
    expect(end.y).toBeGreaterThan(0);
    // the camera sits on the line from the base camera to the focus point
    expect(end.x / fx).toBeCloseTo(end.y / fy, 9);
    expect(end.y + halfH(end)).toBeLessThanOrEqual(1 + 1e-9);
    expect(end.x + halfH(end)).toBeLessThanOrEqual(1 + 1e-9);
  });

  test('pull-back starts on the focus point and ends on the base pose', () => {
    expect(poseAt('pull-back', off, 0, 0, 1).x).toBeCloseTo(poseAt('push-in', off, 1, 0, 1).x, 9);
    expectPoseClose(poseAt('pull-back', off, 1, 0, 1), poseAt('static', off, 0));
  });

  test('crash-zoom zooms about the focus point: it stays put on screen and the view stays inside the frame', () => {
    const fy = (0.5 - 0.2) * 2;
    for (const t of [0.3, 1]) {
      const pose = poseAt('crash-zoom', off, t, 0, 1);
      const h = halfH(pose);
      // focus point's screen position (in half-heights from centre) is unchanged from the base view
      expect((fy - pose.y) / h).toBeCloseTo(fy / 1, 9);
      expect(pose.y + h).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  test('usesFocus names exactly the moves that react to it', () => {
    const users = IDS.filter((id) => usesFocus(id)).sort();
    expect(users).toEqual(['crane-up', 'crash-zoom', 'orbit', 'pull-back', 'push-in']);
    for (const id of IDS) {
      const moved = JSON.stringify(poseAt(id, off, 0.5, 0, 1)) !== JSON.stringify(poseAt(id, { ...off, focus: { x: 0.5, y: 0.5 } }, 0.5, 0, 1));
      expect(moved, id).toBe(usesFocus(id));
    }
  });
});

describe('ease', () => {
  const easings: Easing[] = ['linear', 'ease-in-out', 'snap'];
  test('returns 0 at t=0 and 1 at t=1 for every easing', () => {
    for (const e of easings) {
      expect(ease(e, 0)).toBeCloseTo(0, 12);
      expect(ease(e, 1)).toBeCloseTo(1, 12);
    }
  });
  test('snap reaches >= 0.9 by t=0.5', () => {
    expect(ease('snap', 0.5)).toBeGreaterThanOrEqual(0.9);
  });
});

describe('fitFrame', () => {
  test('letterboxes a 5:1 panorama into 9:16 with the full width visible', () => {
    const f = fitFrame(5000, 1000, '9:16');
    expect(f.letterbox).toBe(true);
    expect(f.offsetX).toBeCloseTo(0, 9);
    expect(f.offsetY).toBeGreaterThan(0.4);
    // displayed width as a share of the output width
    expect((f.scale * 5) / (9 / 16)).toBeCloseTo(1, 9);
  });
  test('a 16:9 frame in 16:9 fills exactly', () => {
    const f = fitFrame(1920, 1080, '16:9');
    expect(f).toEqual({ scale: 1, offsetX: 0, offsetY: 0, letterbox: false });
  });
  test('a 9:16 phone photo pillarboxes inside 16:9 without stretching', () => {
    const f = fitFrame(1080, 1920, '16:9');
    expect(f.letterbox).toBe(true);
    expect(f.scale).toBe(1);
    expect(f.offsetY).toBe(0);
    expect(f.offsetX).toBeCloseTo((1 - (9 / 16) / (16 / 9)) / 2, 9);
  });
});

describe('MOVES', () => {
  test('every move has a plain sentence, defaults within its cap and a diagram path', () => {
    for (const id of IDS) {
      const m = MOVES[id];
      expect(m.id).toBe(id);
      expect(m.plain).toMatch(/^The camera .+\.$/);
      expect(m.defaults.strength).toBeLessThanOrEqual(STRENGTH_CAPS[id]);
      expect(m.diagram.path.length).toBeGreaterThan(1);
    }
  });
});
