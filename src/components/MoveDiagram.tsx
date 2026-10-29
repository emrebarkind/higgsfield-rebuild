"use client";

// A motion diagram: the camera's path seen from above (from the side for
// crane-up), with the framing it sees at the start (dim) and the end (bright).
// Sampled from poseAt, so it is the move itself, not an illustration of it.
import { useEffect, useState } from "react";
import { MOVES, poseAt, type CameraPose, type MoveId, type MoveParams } from "@/src/lib/moves";
import { usePrefersReducedMotion } from "./TakePlayer";

const RAD = Math.PI / 180;
const W = 120;
const H = 90;
const ASPECT = 16 / 9;
/** Server and browser trig differ in the last digits; round so hydration matches. */
const r = (n: number) => Math.round(n * 100) / 100;

function useLoop(active: boolean, still: boolean, periodS = 2.4): number {
  const [t, setT] = useState(1);
  useEffect(() => {
    if (!active || still) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const phase = ((now - t0) / 1000 / periodS) % 1.25; // a beat of hold at the end
      setT(Math.min(1, phase));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setT(1);
    };
  }, [active, still, periodS]);
  return t;
}

export function MoveDiagram(props: { moveId: MoveId; params?: MoveParams; active?: boolean; className?: string }) {
  const { moveId, active = false, className = "" } = props;
  const p = { ...(props.params ?? MOVES[moveId].defaults), handheld: 0 };
  const reduced = usePrefersReducedMotion();
  const t = useLoop(active, reduced);
  const side = moveId === "crane-up";
  const d = poseAt("static", p, 0).z;
  const s = 64 / d; // px per scene unit, same on both axes so angles read true

  // top view: x right, z down from the plane; side view: z right from the plane, y up
  const P = (pose: CameraPose): [number, number] =>
    side ? [r(14 + pose.z * s), r(H / 2 - pose.y * s)] : [r(W / 2 + pose.x * s), r(12 + pose.z * s)];

  const poses = Array.from({ length: 25 }, (_, i) => poseAt(moveId, p, i / 24));
  const path = poses.map((q) => P(q).join(",")).join(" ");
  const now = poseAt(moveId, p, t);

  /** The two edges of the view, drawn until they meet the frame plane. */
  const cone = (q: CameraPose) => {
    const [cx, cy] = P(q);
    const half = side ? (q.fovDeg / 2) * RAD : Math.atan(Math.tan((q.fovDeg / 2) * RAD) * ASPECT);
    const dir = side ? q.pitchDeg * RAD : q.yawDeg * RAD;
    return [dir - half, dir + half].map((a) => {
      const run = q.z * Math.tan(a); // offset where this edge meets z = 0
      return side ? `${cx},${cy} 14,${r(H / 2 - (q.y + run) * s)}` : `${cx},${cy} ${r(W / 2 + (q.x - run) * s)},12`;
    });
  };

  const plane = side
    ? { x1: 14, y1: r(H / 2 - s), x2: 14, y2: r(H / 2 + s) }
    : { x1: r(W / 2 - ASPECT * s), y1: 12, x2: r(W / 2 + ASPECT * s), y2: 12 };
  const start = poses[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`${MOVES[moveId].label}: ${MOVES[moveId].plain}`}>
      <line {...plane} stroke="var(--muted)" strokeWidth="1.5" />
      {cone(start).map((pts, i) => (
        <polyline key={`s${i}`} points={pts} fill="none" stroke="var(--muted)" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2 2" />
      ))}
      {cone(now).map((pts, i) => (
        <polyline key={`e${i}`} points={pts} fill="none" stroke="var(--text)" strokeWidth="1" opacity="0.85" />
      ))}
      <polyline points={path} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={P(start)[0]} cy={P(start)[1]} r="2" fill="var(--muted)" />
      <rect x={r(P(now)[0] - 3.5)} y={r(P(now)[1] - 2.5)} width="7" height="5" rx="1" fill="var(--circle)" />
      <text x={W - 4} y={H - 4} textAnchor="end" fontSize="6" fill="var(--muted)" fontFamily="var(--font-mono)">
        {side ? "SIDE" : "TOP"}
      </text>
    </svg>
  );
}
