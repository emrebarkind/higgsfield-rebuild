// Camera moves as pure functions of a recipe. Scene convention (Task 3):
// the frame plane sits at z = 0 with height 2; the base camera is on +z at
// the distance where the lens FOV exactly frames that height. The move
// geometry below matches docs/spikes.md §2, where STRENGTH_CAPS were measured.

export type MoveId =
  | 'static'
  | 'push-in'
  | 'pull-back'
  | 'pan-left'
  | 'pan-right'
  | 'orbit'
  | 'crane-up'
  | 'dolly-zoom'
  | 'crash-zoom';
export type Easing = 'linear' | 'ease-in-out' | 'snap';
export type LensMm = 24 | 35 | 50 | 85;
export type OutAspect = '16:9' | '9:16' | '1:1';

export interface MoveParams {
  strength: number;
  durationS: number;
  easing: Easing;
  lensMm: LensMm;
  focus: { x: number; y: number };
  handheld: number;
}
export interface CameraPose {
  x: number;
  y: number;
  z: number;
  yawDeg: number;
  pitchDeg: number;
  fovDeg: number;
}
export interface MoveDef {
  id: MoveId;
  label: string;
  plain: string;
  defaults: MoveParams;
  diagram: { path: [number, number][]; startFrame: number; endFrame: number };
}

/** How far the farthest depth recedes behind the plane, in scene units. */
export const DEPTH_SCALE = 0.6;
/** Vertical sensor height used to turn a focal length into a FOV. */
const SENSOR_MM = 24;

export const STRENGTH_CAPS: Record<MoveId, number> = {
  static: 1,
  'push-in': 1,
  'pull-back': 1,
  'pan-left': 0.2,
  'pan-right': 0.2,
  orbit: 0.4,
  'crane-up': 1,
  'dolly-zoom': 0.6,
  'crash-zoom': 1,
};

const RAD = Math.PI / 180;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function ease(e: Easing, t: number): number {
  const x = clamp01(t);
  if (e === 'linear') return x;
  if (e === 'ease-in-out') return x * x * (3 - 2 * x);
  // snap: fast exponential out, normalized so snap(1) = 1 exactly
  const k = 8;
  return (1 - Math.exp(-k * x)) / (1 - Math.exp(-k));
}

export function baseFovDeg(lensMm: LensMm): number {
  return 2 * Math.atan(SENSOR_MM / (2 * lensMm)) / RAD;
}

function baseDistance(lensMm: LensMm): number {
  return 1 / Math.tan((baseFovDeg(lensMm) / 2) * RAD);
}

/** FOV whose half-angle tangent is the base one divided by `zoom`. */
function zoomedFov(fov0: number, zoom: number): number {
  return (2 * Math.atan(Math.tan((fov0 / 2) * RAD) / zoom)) / RAD;
}

// --- handheld: 2-octave smoothed value noise, seeded with mulberry32 ---

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lattice(seed: number, channel: number, i: number): number {
  return mulberry32((seed * 73856093) ^ (channel * 19349663) ^ (i * 83492791))() * 2 - 1;
}

function valueNoise(seed: number, channel: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  return lattice(seed, channel, i) * (1 - s) + lattice(seed, channel, i + 1) * s;
}

/** In [-1, 1]; zero at time 0 so every take starts on the base pose. */
function shake(seed: number, channel: number, timeS: number): number {
  const n = (x: number) => 0.65 * valueNoise(seed, channel, x * 0.7) + 0.35 * valueNoise(seed, channel + 101, x * 1.9);
  return (n(timeS) - n(0)) / 2;
}

// --- poses ---

const FOCUS_MOVES: ReadonlySet<MoveId> = new Set(['push-in', 'pull-back', 'crash-zoom', 'orbit', 'crane-up']);

/** Whether the focus point changes this move (static, pans and dolly zoom ignore it). */
export function usesFocus(id: MoveId): boolean {
  return FOCUS_MOVES.has(id);
}

export function poseAt(id: MoveId, p: MoveParams, t: number, seed = 0, frameAspect = 1): CameraPose {
  const fov0 = baseFovDeg(p.lensMm);
  const d = baseDistance(p.lensMm);
  const s = Math.min(Math.max(0, p.strength), STRENGTH_CAPS[id]);
  const e = ease(p.easing, t);
  const focusX = (p.focus.x - 0.5) * 2 * frameAspect;
  const focusY = (0.5 - p.focus.y) * 2;
  const focusZ = -0.5 * DEPTH_SCALE;

  const pose: CameraPose = { x: 0, y: 0, z: d, yawDeg: 0, pitchDeg: 0, fovDeg: fov0 };

  switch (id) {
    case 'static':
      break;
    case 'push-in':
    case 'pull-back': {
      // along the line from the base camera to the focus point; the view on
      // the z = 0 plane stays inside the frame because |focus| <= 1
      const u = 0.45 * s * (id === 'push-in' ? e : 1 - e);
      pose.x = focusX * u;
      pose.y = focusY * u;
      pose.z = d * (1 - u);
      break;
    }
    case 'pan-left':
    case 'pan-right': {
      const dir = id === 'pan-left' ? 1 : -1;
      pose.yawDeg = dir * 10 * s * e;
      pose.fovDeg = zoomedFov(fov0, 1 + 0.5 * s * e);
      break;
    }
    case 'orbit': {
      // rigid rotation of the camera about the vertical axis through the focus point
      const a = 14 * s * e * RAD;
      const rx = 0 - focusX;
      const rz = d - focusZ;
      pose.x = focusX + rx * Math.cos(a) + rz * Math.sin(a);
      pose.z = focusZ - rx * Math.sin(a) + rz * Math.cos(a);
      pose.yawDeg = a / RAD;
      break;
    }
    case 'crane-up': {
      pose.y = 0.4 * s * e;
      const a0 = Math.atan2(focusY, d - focusZ);
      const a1 = Math.atan2(focusY - pose.y, d - focusZ);
      pose.pitchDeg = (a1 - a0) / RAD;
      break;
    }
    case 'dolly-zoom':
      pose.z = d * (1 - 0.5 * s * e);
      pose.fovDeg = (2 * Math.atan(1 / pose.z)) / RAD;
      break;
    case 'crash-zoom': {
      // zoom about the focus point: shift so it holds its place on screen
      const zoom = 1 + 1.5 * s * e;
      pose.fovDeg = zoomedFov(fov0, zoom);
      pose.x = focusX * (1 - 1 / zoom);
      pose.y = focusY * (1 - 1 / zoom);
      break;
    }
  }

  if (p.handheld > 0) {
    const h = clamp01(p.handheld);
    const time = clamp01(t) * p.durationS;
    pose.x += h * 0.01 * shake(seed, 1, time);
    pose.y += h * 0.01 * shake(seed, 2, time);
    pose.yawDeg += h * 0.3 * shake(seed, 3, time);
    pose.pitchDeg += h * 0.3 * shake(seed, 4, time);
  }
  return pose;
}

// --- framing ---

const ASPECTS: Record<OutAspect, number> = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1 };

/**
 * Contain-fit a frame inside the output. `scale` is the frame's height as a
 * share of the output height; offsets are the frame's top-left corner as a
 * share of the output width/height. Never stretches.
 */
export function fitFrame(frameW: number, frameH: number, outAspect: OutAspect) {
  const out = ASPECTS[outAspect];
  const frame = frameW / frameH;
  const scale = Math.min(1, out / frame);
  const shownW = (scale * frame) / out;
  const offsetX = (1 - shownW) / 2;
  const offsetY = (1 - scale) / 2;
  const letterbox = Math.abs(offsetX) > 1e-9 || Math.abs(offsetY) > 1e-9;
  return { scale, offsetX: letterbox ? offsetX : 0, offsetY: letterbox ? offsetY : 0, letterbox };
}

// --- library ---

const defaults = (over: Partial<MoveParams> = {}): MoveParams => ({
  strength: 0.6,
  durationS: 5,
  easing: 'ease-in-out',
  lensMm: 35,
  focus: { x: 0.5, y: 0.5 },
  handheld: 0.15,
  ...over,
});

/** Top-down path (x, z) and framing width at start/end, sampled from poseAt. */
function diagramFor(id: MoveId, p: MoveParams): MoveDef['diagram'] {
  const path: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const pose = poseAt(id, { ...p, handheld: 0 }, i / 8);
    path.push([pose.x, pose.z]);
  }
  const width = (pose: CameraPose) => pose.z * Math.tan((pose.fovDeg / 2) * RAD);
  const base = width(poseAt('static', { ...p, handheld: 0 }, 0));
  return {
    path,
    startFrame: width(poseAt(id, { ...p, handheld: 0 }, 0)) / base,
    endFrame: width(poseAt(id, { ...p, handheld: 0 }, 1)) / base,
  };
}

const LIBRARY: [MoveId, string, string, Partial<MoveParams>][] = [
  ['static', 'Static', 'The camera holds still, breathing slightly like it is handheld.', { strength: 1, handheld: 0.4 }],
  ['push-in', 'Push in', 'The camera glides toward your subject.', { strength: 0.6 }],
  ['pull-back', 'Pull back', 'The camera starts close and glides back to reveal the whole frame.', { strength: 0.6 }],
  ['pan-left', 'Pan left', 'The camera turns slowly to the left.', { strength: 0.15 }],
  ['pan-right', 'Pan right', 'The camera turns slowly to the right.', { strength: 0.15 }],
  ['orbit', 'Orbit', 'The camera circles around your subject.', { strength: 0.3 }],
  ['crane-up', 'Crane up', 'The camera rises while staying on your subject.', { strength: 0.6 }],
  ['dolly-zoom', 'Dolly zoom', 'The camera moves in while the lens widens, so the background stretches and the subject holds.', { strength: 0.5, lensMm: 35 }],
  ['crash-zoom', 'Crash zoom', 'The camera snaps into a tight zoom on your subject.', { strength: 0.6, easing: 'snap', durationS: 3, handheld: 0.3 }],
];

export const MOVES = Object.fromEntries(
  LIBRARY.map(([id, label, plain, over]) => {
    const p = defaults(over);
    return [id, { id, label, plain, defaults: p, diagram: diagramFor(id, p) }];
  }),
) as Record<MoveId, MoveDef>;
