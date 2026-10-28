"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { poseAt, type OutAspect } from "@/src/lib/moves";
import { createScene, type Scene, type TakeRecipe } from "@/src/lib/render/scene";
import { frameBitmap } from "@/src/lib/render/bitmap";

export const ASPECT_CSS: Record<OutAspect, string> = { "16:9": "16 / 9", "9:16": "9 / 16", "1:1": "1 / 1" };
/** Pause on the last pose before looping, so the end of a move reads. */
const HOLD_S = 0.6;

interface Props {
  recipe: TakeRecipe;
  playing: boolean;
  /** Seconds since the take started. When given, the parent owns the clock (synced players). */
  time?: number;
  onTime?: (seconds: number) => void;
  aspect: OutAspect;
  className?: string;
  children?: ReactNode;
}

export function TakePlayer({ recipe, playing, time, onTime, aspect, className = "", children }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const scene = useRef<Scene | null>(null);
  const own = useRef(0);
  const live = useRef({ recipe, time, aspect, onTime });
  useLayoutEffect(() => {
    live.current = { recipe, time, aspect, onTime };
  });

  const draw = useCallback(() => {
    const s = scene.current;
    if (!s) return;
    const { recipe: r, time: tc } = live.current;
    const seconds = tc ?? own.current;
    const t = Math.min(1, Math.max(0, seconds / r.params.durationS));
    s.setPose(poseAt(r.moveId, r.params, t, r.seed, r.frame.width / r.frame.height));
    s.render();
  }, []);

  // One WebGL scene per frame + depth + lens. A lost context can't be reused, so each gets a fresh canvas.
  useEffect(() => {
    const host = wrap.current!;
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 h-full w-full";
    canvas.setAttribute("aria-hidden", "true");
    host.prepend(canvas);
    let gone = false;
    let ro: ResizeObserver | null = null;
    frameBitmap(recipe.frame).then((bmp) => {
      if (gone) return;
      scene.current = createScene(canvas, bmp, recipe.depth, { lensMm: recipe.params.lensMm });
      const size = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        scene.current?.resize(Math.round(host.clientWidth * dpr), Math.round(host.clientHeight * dpr), live.current.aspect);
        draw();
      };
      ro = new ResizeObserver(size);
      ro.observe(host);
      size();
    });
    return () => {
      gone = true;
      ro?.disconnect();
      scene.current?.dispose();
      scene.current = null;
      canvas.remove();
    };
  }, [recipe.frame, recipe.depth, recipe.params.lensMm, draw]);

  // Re-fit when the output aspect changes.
  useEffect(() => {
    const host = wrap.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    scene.current?.resize(Math.round(host.clientWidth * dpr), Math.round(host.clientHeight * dpr), aspect);
    draw();
  }, [aspect, draw]);

  // Controlled: draw whenever the parent's clock or the recipe changes.
  useEffect(() => {
    if (time !== undefined) draw();
  }, [time, recipe, draw]);

  // Uncontrolled: run our own real-time clock while playing; otherwise draw the current pose.
  useEffect(() => {
    if (time !== undefined) return;
    if (!playing) {
      draw();
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      own.current += (now - last) / 1000;
      last = now;
      if (own.current > live.current.recipe.params.durationS + HOLD_S) own.current = 0;
      live.current.onTime?.(own.current);
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, time === undefined, recipe, draw]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={wrap} className={`relative overflow-hidden bg-[#0b0b0a] ${className}`} style={{ aspectRatio: ASPECT_CSS[aspect] }}>
      {children}
    </div>
  );
}

/** One clock for several players: real time, looping after the longest take plus a short hold. */
export function useSyncedClock(durationsS: number[], playing: boolean) {
  const [time, setTime] = useState(0);
  const loop = Math.max(0, ...durationsS) + HOLD_S;
  useEffect(() => {
    if (!playing || loop <= HOLD_S) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime((t) => (t + dt > loop ? 0 : t + dt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, loop]);
  return { time, setTime, loopS: loop };
}

const reducedQuery = "(prefers-reduced-motion: reduce)";
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(reducedQuery);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
}
