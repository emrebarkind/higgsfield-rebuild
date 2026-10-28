"use client";

import { useEffect, useState } from "react";
import { useStudio } from "@/src/lib/useStudio";
import type { OutAspect } from "@/src/lib/moves";
import { FrameInput } from "./FrameInput";
import { MoveStrip } from "./MoveStrip";
import { ParamsPanel } from "./ParamsPanel";
import { Preview } from "./Preview";
import { TakesGrid } from "./TakesGrid";
import { ExportButton } from "./ExportButton";
import { usePrefersReducedMotion, useSyncedClock } from "./TakePlayer";

const ASPECTS: OutAspect[] = ["16:9", "9:16", "1:1"];
const SCRUB_S = 1 / 3;

function typingInto(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || el.isContentEditable;
}

export function Studio() {
  const s = useStudio();
  const reduced = usePrefersReducedMotion();
  const [previewPlay, setPreviewPlay] = useState<boolean | null>(null);
  const [takesPlay, setTakesPlay] = useState<boolean | null>(null);
  const previewPlaying = previewPlay ?? !reduced;
  const takesPlaying = takesPlay ?? !reduced;
  const { time, setTime, loopS } = useSyncedClock(s.takes.map((t) => t.params.durationS), takesPlaying);

  const { ensureFrame } = s;
  useEffect(() => ensureFrame(), [ensureFrame]);

  // Review keys: Space play/pause, J/K/L scrub, 1–6 pick a take, C circle it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingInto(e.target) || s.takes.length === 0) return;
      const k = e.key.toLowerCase();
      if (k === " " || k === "k") {
        e.preventDefault();
        setTakesPlay(!takesPlaying);
      } else if (k === "j" || k === "l") {
        setTakesPlay(false);
        setTime((t) => Math.min(loopS, Math.max(0, t + (k === "l" ? SCRUB_S : -SCRUB_S))));
      } else if (/^[1-6]$/.test(k)) {
        const take = s.takes[Number(k) - 1];
        if (take) s.focus(take.id);
      } else if (k === "c" && s.focusedTake) {
        s.circle(s.focusedTake);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s, takesPlaying, loopS, setTime]);

  const rollDisabled = s.rollState.disabled || s.rolling || !s.depth;
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 lg:grid lg:grid-cols-[minmax(300px,380px)_1fr] lg:gap-8 lg:pb-10">
      <section className="order-1 lg:order-2" aria-label="Preview and takes">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Studio</h1>
            <p className="text-sm text-muted">A real camera for your still images.</p>
          </div>
          <div role="radiogroup" aria-label="Output aspect" className="flex gap-1">
            {ASPECTS.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={s.aspect === a}
                onClick={() => s.setAspect(a)}
                className={`rounded border px-2 py-1 font-mono text-xs ${s.aspect === a ? "border-paper bg-paper text-bg" : "border-line text-muted hover:text-paper"}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className={s.aspect === "9:16" ? "mx-auto max-w-sm" : s.aspect === "1:1" ? "mx-auto max-w-xl" : ""}>
          <Preview
            frame={s.frame}
            depth={s.depth}
            depthStatus={s.depthStatus}
            depthError={s.depthError}
            onRetryDepth={s.retryDepth}
            moveId={s.moveId}
            params={s.base}
            aspect={s.aspect}
            playing={previewPlaying}
            onTogglePlay={() => setPreviewPlay(!previewPlaying)}
            onFocus={(f) => s.setParam("focus", f)}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Dailies moves a real camera through your image. Subjects stay still — it’s the camera that moves.
        </p>

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur lg:static lg:mt-4 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="mx-auto flex max-w-[1440px] items-center gap-3">
            <button
              type="button"
              onClick={() => s.roll(3)}
              disabled={rollDisabled}
              className="rounded bg-paper px-5 py-2.5 font-display text-lg font-bold uppercase tracking-wide text-bg disabled:cursor-not-allowed disabled:opacity-40"
            >
              {s.rolling ? (
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-tally" aria-hidden="true" /> Rolling…
                </span>
              ) : (
                s.rollState.label
              )}
            </button>
            <p className="text-xs text-muted" aria-live="polite">
              {!s.depth && s.frame ? "Waiting for depth…" : s.rollState.newShot && s.shot ? "You changed the frame, move or settings, so this starts a new shot." : ""}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <TakesGrid
            shot={s.shot}
            takes={s.takes}
            frame={s.shotFrame}
            depth={s.shotDepth}
            aspect={s.aspect}
            focusedTake={s.focusedTake}
            playing={takesPlaying}
            time={time}
            onTogglePlay={() => setTakesPlay(!takesPlaying)}
            onFocus={s.focus}
            onCircle={s.circle}
            onNudge={s.nudge}
            focusedActions={(take) =>
              s.shot && s.shotFrame && s.shotDepth ? (
                <ExportButton
                  key={`${take.id}-${s.aspect}`}
                  recipe={{ frame: s.shotFrame, depth: s.shotDepth, moveId: s.shot.moveId, params: take.params, seed: take.seed }}
                  shot={s.shot.number}
                  take={take.number}
                  aspect={s.aspect}
                />
              ) : null
            }
          />
        </div>
      </section>

      <aside className="order-2 mt-8 space-y-6 lg:order-1 lg:mt-0" aria-label="Frame, move and settings">
        <FrameInput frame={s.frame} busy={s.frameBusy} error={s.frameError} onFile={(f) => s.setFrame(f)} onSample={(x) => s.setFrame(x)} />
        <MoveStrip value={s.moveId} onChange={s.setMove} />
        <ParamsPanel moveId={s.moveId} params={s.base} setParam={s.setParam} />
      </aside>
    </div>
  );
}
