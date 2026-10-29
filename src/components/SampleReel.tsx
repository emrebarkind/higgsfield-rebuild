"use client";

import { useEffect, useState } from "react";
import { MOVES } from "@/src/lib/moves";
import { SAMPLES, type Sample } from "@/src/lib/samples";
import { prepareFrame, type Frame } from "@/src/lib/frame";
import { loadDepthAsset } from "@/src/lib/depth/asset";
import type { DepthMap } from "@/src/lib/depth/client";
import { TakePlayer, usePrefersReducedMotion } from "./TakePlayer";

export type LoadedSample = { sample: Sample; frame: Frame; depth: DepthMap };

/** The samples with their frames and pre-computed depth, ready to play; empty until loaded (or if loading fails). */
export function useLoadedSamples(): LoadedSample[] {
  const [items, setItems] = useState<LoadedSample[]>([]);
  useEffect(() => {
    let gone = false;
    Promise.all(
      SAMPLES.map(async (sample) => {
        const blob = await fetch(sample.src).then((r) => r.blob());
        const [frame, depth] = await Promise.all([prepareFrame(blob, "sample", sample.prompt), loadDepthAsset(sample.depth)]);
        return { sample, frame, depth };
      }),
    ).then(
      (loaded) => !gone && setItems(loaded),
      () => {},
    );
    return () => {
      gone = true;
    };
  }, []);
  return items;
}

export function SampleReel({ onUse }: { onUse: (s: Sample) => void }) {
  const reduced = usePrefersReducedMotion();
  const items = useLoadedSamples();
  const [playing, setPlaying] = useState<boolean | null>(null);
  const isPlaying = playing ?? !reduced;

  if (items.length === 0) return null;
  return (
    <section aria-label="Sample reel" className="mt-10">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide">Sample reel</h2>
        <button type="button" onClick={() => setPlaying(!isPlaying)} className="rounded border border-line px-3 py-1 font-mono text-xs uppercase hover:border-paper">
          {isPlaying ? "Pause reel" : "Play reel"}
        </button>
      </div>
      <p className="mb-3 text-sm text-muted">Pre-made shots on frames we generated, rendered live in your browser right now.</p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(({ sample, frame, depth }) => (
          <li key={sample.id}>
            <TakePlayer recipe={{ frame, depth, moveId: sample.moveId, params: sample.params, seed: 3 }} playing={isPlaying} aspect="16:9" className="w-full rounded-sm">
              <span className="absolute left-2 top-2 rounded bg-bg/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">Sample</span>
            </TakePlayer>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                Sample · {MOVES[sample.moveId].label} · {sample.params.lensMm}mm
              </p>
              <button type="button" onClick={() => onUse(sample)} className="min-h-6 shrink-0 px-1 py-1 text-xs text-muted underline hover:text-paper">
                Use this
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
