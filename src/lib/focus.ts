// Rack focus (council verdict, 29 Oct): the photo's own depth pulls focus
// during the move, from the background onto the subject under the focus
// point. Pure helpers; the blur itself is a depth-weighted gather in the
// scene's fragment shader, so preview, witness cam and export all match.
import type { DepthMap } from './depth/protocol';
import type { MoveParams } from './moves';
import { RACK_FOCUS } from './flags';

export const RACK = {
  /** Largest blur radius, in source-image pixels. */
  maxPx: 7,
  /** Blur radius per unit of depth away from the focal depth. */
  gain: 18,
  /** Share of the move over which focus travels; it holds on the subject after. */
  rackShare: 0.6,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Median depth in a 5×5 window under the focus point, so one noisy pixel can't steal focus. */
export function focusDepthAt(depth: DepthMap, focus: { x: number; y: number }): number {
  const cx = Math.round(clamp01(focus.x) * (depth.width - 1));
  const cy = Math.round(clamp01(focus.y) * (depth.height - 1));
  const vals: number[] = [];
  for (let y = cy - 2; y <= cy + 2; y++) {
    for (let x = cx - 2; x <= cx + 2; x++) {
      if (x >= 0 && y >= 0 && x < depth.width && y < depth.height) vals.push(depth.data[y * depth.width + x]);
    }
  }
  vals.sort((a, b) => a - b);
  return vals[Math.floor(vals.length / 2)];
}

const bgCache = new WeakMap<DepthMap, number>();
/** The far end of the frame: the 10th percentile of depth (1 = near). */
export function backgroundDepth(depth: DepthMap): number {
  const hit = bgCache.get(depth);
  if (hit !== undefined) return hit;
  const step = Math.max(1, Math.floor(depth.data.length / 20000));
  const vals: number[] = [];
  for (let i = 0; i < depth.data.length; i += step) vals.push(depth.data[i]);
  vals.sort((a, b) => a - b);
  const v = vals[Math.floor(vals.length * 0.1)];
  bgCache.set(depth, v);
  return v;
}

/** Focal depth at move time k (0..1): eases from `from` to `to` over the first rackShare of the move. */
export function rackAt(k: number, from: number, to: number): number {
  const u = clamp01(k / RACK.rackShare);
  const e = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
  return from + (to - from) * e;
}

/** Blur radius in source pixels for a point at depth d when focused at f. Mirrors the shader. */
export function cocPx(d: number, f: number): number {
  return Math.min(Math.abs(d - f) * RACK.gain, RACK.maxPx);
}

/** The focal depth for this frame of a take, or null when the take doesn't rack. */
export function rackFocus(depth: DepthMap, params: MoveParams, k: number): { focusDepth: number } | null {
  if (!RACK_FOCUS || !params.rack) return null;
  return { focusDepth: rackAt(k, backgroundDepth(depth), focusDepthAt(depth, params.focus)) };
}
