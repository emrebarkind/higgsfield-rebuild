"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { poseAt, type OutAspect } from "@/src/lib/moves";
import { createScene, type Scene, type TakeRecipe } from "@/src/lib/render/scene";
import { frameBitmap } from "@/src/lib/render/bitmap";
import { watchContextLoss } from "@/src/lib/render/context";
import { createClock, type Clock } from "@/src/lib/clock";
import { witnessPath } from "@/src/lib/render/witness";
import { rackFocus } from "@/src/lib/focus";
import { witnessAllowed } from "@/src/lib/flags";

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
  /** Show the witness cam inset: the shot camera seen from outside, flying through the photo's relief. */
  witness?: boolean;
}

export function TakePlayer({ recipe, playing, clock, aspect, className = "", children, witness = false }: Props) {
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
  // Phones don't get the inset: at that size it's a smudge over the shot.
  const wide = useMinWidth(640);
  const withWitness = witness && wide && typeof window !== "undefined" && witnessAllowed(window.location.search);
  /** Where the inset sits, in % of the player, for its label. */
  const [inset, setInset] = useState<{ left: number; top: number } | null>(null);

  const draw = useCallback(() => {
    const s = scene.current;
    if (!s || s.lost()) return;
    const { recipe: r, clock: c } = live.current;
    const seconds = c ? c.get() : own.current;
    const t = Math.min(1, Math.max(0, seconds / r.params.durationS));
    s.setPose(poseAt(r.moveId, r.params, t, r.seed, r.frame.width / r.frame.height));
    s.setFocus(rackFocus(r.depth, r.params, t));
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
      scene.current = createScene(canvas, bmp, recipe.depth, { lensMm: recipe.params.lensMm, witness: withWitness });
      const size = () => {
        const dpr = playerDpr(live.current.recipe);
        const w = Math.round(host.clientWidth * dpr);
        const h = Math.round(host.clientHeight * dpr);
        scene.current?.resize(w, h, live.current.aspect);
        const r = scene.current?.witnessRect();
        setInset(r ? { left: (r.x / w) * 100, top: ((h - r.y - r.height) / h) * 100 } : null);
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
  }, [recipe.frame, recipe.depth, recipe.params.lensMm, draw, generation, withWitness]);

  // The witness view draws the whole path of the move (poseAt samples), so it follows the recipe.
  useEffect(() => {
    if (!withWitness) return;
    const r = recipe;
    scene.current?.setWitnessPath(witnessPath(r.moveId, r.params, r.seed, r.frame.width / r.frame.height));
    draw();
  }, [recipe, withWitness, draw, generation]);

  // Re-fit when the output aspect changes.
  useEffect(() => {
    const host = wrap.current!;
    const dpr = playerDpr(live.current.recipe);
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
      {withWitness && inset && (
        <span
          className="pointer-events-none absolute rounded-sm bg-circle px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ left: `${inset.left}%`, top: `${inset.top}%`, transform: "translate(6px, 6px)" }}
          aria-hidden="true"
        >
          Witness cam
        </span>
      )}
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

/**
 * Device pixels per CSS pixel for a player. Rack focus gathers 12 depth-weighted
 * taps per pixel; with a preview, six takes and the sample reel all racking at
 * a retina 2× the GPU fell over, so racking players draw at 1×. Export is
 * unaffected: it always renders at 1080p.
 */
function playerDpr(recipe: TakeRecipe): number {
  return Math.min(window.devicePixelRatio || 1, recipe.params.rack ? 1 : 2);
}

function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
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
