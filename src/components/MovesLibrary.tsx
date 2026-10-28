"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MOVES, type MoveId } from "@/src/lib/moves";
import { useStudio } from "@/src/lib/useStudio";
import { MoveDiagram } from "./MoveDiagram";
import { TakePlayer, usePrefersReducedMotion } from "./TakePlayer";

const IDS = Object.keys(MOVES) as MoveId[];

export function MovesLibrary() {
  const s = useStudio();
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const [hover, setHover] = useState<MoveId | null>(null);
  const { ensureFrame } = s;
  useEffect(() => ensureFrame(), [ensureFrame]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Moves</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Nine camera moves. Each diagram is the move itself, seen from above: the path the camera travels and what it frames at the start
        (dashed) and the end. The previews run on your current frame.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {IDS.map((id) => {
          const m = MOVES[id];
          const params = { ...m.defaults, lensMm: s.base.lensMm, focus: s.base.focus };
          return (
            <li
              key={id}
              className={`rounded border p-3 ${id === s.moveId ? "border-paper" : "border-line"}`}
              onMouseEnter={() => setHover(id)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="grid grid-cols-[2fr_3fr] gap-3">
                <MoveDiagram moveId={id} params={params} active={hover === id} className="w-full rounded bg-panel" />
                {s.frame && s.depth ? (
                  <TakePlayer recipe={{ frame: s.frame, depth: s.depth, moveId: id, params, seed: 0 }} playing={!reduced} aspect="16:9" className="w-full rounded-sm" />
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-sm bg-[#0b0b0a] font-mono text-[10px] uppercase text-muted">
                    {s.depthError ? "Depth failed — retry in Studio" : "Reading depth…"}
                  </div>
                )}
              </div>
              <h2 className="mt-3 font-display text-xl font-bold uppercase tracking-wide">{m.label}</h2>
              <p className="mt-1 text-sm text-muted">{m.plain}</p>
              <button
                type="button"
                onClick={() => {
                  s.setMove(id);
                  router.push("/");
                }}
                className="mt-3 rounded bg-paper px-3 py-1.5 text-sm font-medium text-bg"
              >
                Use this move
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
