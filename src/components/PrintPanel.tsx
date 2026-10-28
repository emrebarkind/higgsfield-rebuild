"use client";

import { MOVES, type OutAspect } from "@/src/lib/moves";
import type { TakeRecipe } from "@/src/lib/render/scene";
import { printPrompt, printWithAI } from "@/src/lib/print/hf";
import { printJobs, usePrintJob } from "@/src/lib/print/jobs";
import { TakePlayer, usePrefersReducedMotion } from "./TakePlayer";

export const PRINT_LABEL = "Experimental · free community GPU · may queue for minutes or be unavailable";

export function PrintPanel(props: { takeId: string; recipe: TakeRecipe; shot: number; take: number; aspect: OutAspect }) {
  const { takeId, recipe, shot, take, aspect } = props;
  const state = usePrintJob(takeId);
  const reduced = usePrefersReducedMotion();

  const start = () =>
    printJobs.start(takeId, (onStatus, signal) =>
      printWithAI(recipe.frame, printPrompt(MOVES[recipe.moveId].plain, recipe.frame.prompt), onStatus, signal),
    );

  const status = state.kind === "working" ? state.status : null;
  return (
    <div className="w-full border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-3">
        {state.kind === "working" ? (
          <>
            <span role="status" className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
              <span className="h-2 w-2 motion-safe:animate-pulse rounded-full bg-tally" aria-hidden="true" />
              {status?.state === "queued" && status.position ? `In the GPU queue · position ${status.position}` : status?.state === "queued" ? "Waiting for a community GPU…" : "Printing on a community GPU…"}
            </span>
            <button type="button" onClick={() => printJobs.cancel(takeId)} className="text-xs text-muted underline hover:text-paper">
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={start} className="rounded border border-paper px-3 py-1.5 text-sm hover:bg-paper hover:text-bg">
            {state.kind === "done" ? "Print again" : "Print with AI motion"}
          </button>
        )}
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{PRINT_LABEL}</span>
      </div>
      <p className="mt-1.5 text-xs text-muted">
        A generative video model re-imagines this frame with your move. Unlike the 2.5D take, subjects can move — and details may change.
      </p>
      {state.kind === "failed" && (
        <p role="alert" className="mt-2 text-sm">
          Community GPU is busy — your take is safe.
          {state.detail && <span className="block text-xs text-muted">{state.detail}</span>}
        </p>
      )}
      {state.kind === "done" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <figure>
            <TakePlayer recipe={recipe} playing={!reduced} aspect={aspect} className="w-full rounded-sm" />
            <figcaption className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">2.5D take · exact camera</figcaption>
          </figure>
          <figure>
            <video src={state.url} controls loop muted playsInline autoPlay={!reduced} className="w-full rounded-sm bg-[#0b0b0a]" />
            <figcaption className="mt-1 flex justify-between font-mono text-[11px] uppercase tracking-wider text-muted">
              <span>AI print · experimental</span>
              <a href={state.url} download={`dailies-shot${String(shot).padStart(2, "0")}-take${take}-print.mp4`} className="underline hover:text-paper">
                Download
              </a>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
