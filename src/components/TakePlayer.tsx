"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { poseAt, type OutAspect } from "@/src/lib/moves";
import { createScene, type Scene, type TakeRecipe } from "@/src/lib/render/scene";
import { frameBitmap } from "@/src/lib/render/bitmap";
import { watchContextLoss } from "@/src/lib/render/context";
import { createClock, type Clock } from "@/src/lib/clock";

export const ASPECT_CSS: Record<OutAspect, string> = { "16:9": "16 / 9", "9:16": "9 / 16", "1:1": "1 / 1" };
/** Pause on the last pose before looping, so the end of a move reads. */
const HOLD_S = 0.6;

interface Props {
  recipe: TakeRecipe;
  playing: boolean;
  /** The parent's clock, in seconds since the take started (synced players). Without one the player keeps its own. */
  clock?: Clock;
  aspect: OutAspect;
  className?: string;
  children?: ReactNode;
}

export function TakePlayer({ recipe, playing, clock, aspect, className = "", children }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const scene = useRef<Scene | null>(null);
  const own = useRef(0);
  const live = useRef({ recipe, clock, aspect });
  useLayoutEffect(() => {
    live.current = { recipe, clock, aspect };
  });
  // The browser dropped this player's WebGL context; bumping `generation` builds a fresh one.
  const [lost, setLost] = useState(false);
  const [generation, setGeneration] = useState(0);

  const draw = useCallback(() => {
    const s = scene.current;
    if (!s || s.lost()) return;
    const { recipe: r, clock: c } = live.current;
    const seconds = c ? c.get() : own.current;
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
    const reload = () => {
      setLost(false);
      setGeneration((g) => g + 1);
    };
    const unwatch = watchContextLoss(canvas, () => setLost(true), reload);
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
      unwatch();
      ro?.disconnect();
      scene.current?.dispose();
      scene.current = null;
      canvas.remove();
    };
  }, [recipe.frame, recipe.depth, recipe.params.lensMm, draw, generation]);

  // Re-fit when the output aspect changes.
  useEffect(() => {
    const host = wrap.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    scene.current?.resize(Math.round(host.clientWidth * dpr), Math.round(host.clientHeight * dpr), aspect);
    draw();
  }, [aspect, draw]);

  // Controlled: redraw on each tick of the parent's clock, and when the recipe changes.
  useEffect(() => {
    if (!clock) return;
    draw();
    return clock.subscribe(draw);
  }, [clock, recipe, draw]);

  // Uncontrolled: run our own real-time clock while playing; otherwise draw the current pose.
  useEffect(() => {
    if (clock) return;
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
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, clock, recipe, draw]);

  return (
    <div ref={wrap} className={`relative overflow-hidden bg-[#0b0b0a] ${className}`} style={{ aspectRatio: ASPECT_CSS[aspect] }}>
      {children}
      {lost && (
        // A span, not a button: players sit inside the take buttons. A click here reloads and goes no further.
        <span
          className="absolute inset-0 flex cursor-pointer items-center justify-center bg-bg/85 p-3 text-center font-mono text-xs uppercase tracking-wider text-paper"
          role="status"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setLost(false);
            setGeneration((g) => g + 1);
          }}
        >
          Paused · the browser needed the graphics memory back. Click or tap to reload.
        </span>
      )}
    </div>
  );
}

/** One clock for several players: real time, looping after the longest take plus a short hold. */
export function useSyncedClock(durationsS: number[], playing: boolean) {
  const [clock] = useState(createClock);
  const loop = Math.max(0, ...durationsS) + HOLD_S;
  useEffect(() => {
    if (!playing || loop <= HOLD_S) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      clock.advance((now - last) / 1000, loop);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clock, playing, loop]);
  return { clock, loopS: loop };
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
