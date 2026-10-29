// Witness cam: a second, fixed camera that films the shot camera flying
// through the photo's 3D relief. Moves are math, so the camera can be shown;
// a generated video has no camera to show. Pure helpers here; drawing is in
// scene.ts. Export never uses any of this.
import { baseFovDeg, DEPTH_SCALE, poseAt, type CameraPose, type LensMm, type MoveId, type MoveParams } from '../moves';

export const WITNESS = {
  /** Raised three-quarter view; steeper side angles show the relief's stretched edges. */
  yawDeg: 35,
  pitchDeg: 35,
  fovDeg: 40,
  /** Points on the drawn path. */
  samples: 60,
  /** Inset width as a share of the frame's width. */
  insetWidth: 0.32,
  insetAspect: 16 / 10,
};

const RAD = Math.PI / 180;
const OVERSCAN = 1.06;

type Rect = { x: number; y: number; width: number; height: number };
type Vec3 = [number, number, number];

/** The shot camera's path: poseAt sampled from t = 0 to 1. */
export function witnessPath(id: MoveId, p: MoveParams, seed: number, frameAspect: number, n = WITNESS.samples): CameraPose[] {
  return Array.from({ length: n + 1 }, (_, i) => poseAt(id, p, i / n, seed, frameAspect));
}

/** Where the witness camera stands and what it looks at, framing the relief and the shot camera. */
export function witnessView(lensMm: LensMm, frameAspect: number): { position: Vec3; target: Vec3; fovDeg: number } {
  const d = 1 / Math.tan((baseFovDeg(lensMm) / 2) * RAD);
  // From the back of the relief to the base camera; aim a little nearer the photo, where the detail is.
  const near = d;
  const far = -DEPTH_SCALE;
  const target: Vec3 = [0, 0, far + (near - far) * 0.25];
  const radius = Math.hypot(frameAspect * OVERSCAN, OVERSCAN, (near - far) / 2);
  const dist = (radius / Math.sin((WITNESS.fovDeg / 2) * RAD)) * 0.82;
  const yaw = WITNESS.yawDeg * RAD;
  const pitch = WITNESS.pitchDeg * RAD;
  const position: Vec3 = [
    target[0] + dist * Math.cos(pitch) * Math.sin(yaw),
    target[1] + dist * Math.sin(pitch),
    target[2] + dist * Math.cos(pitch) * Math.cos(yaw),
  ];
  return { position, target, fovDeg: WITNESS.fovDeg };
}

/** The inset's rect in canvas pixels (GL origin bottom-left): the frame's top-right corner, clear of the player controls at the bottom. */
export function insetRect(frame: Rect): Rect {
  const width = Math.round(frame.width * WITNESS.insetWidth);
  const height = Math.round(width / WITNESS.insetAspect);
  const margin = Math.max(4, Math.round(frame.width * 0.015));
  return { x: frame.x + frame.width - width - margin, y: frame.y + frame.height - height - margin, width, height };
}
