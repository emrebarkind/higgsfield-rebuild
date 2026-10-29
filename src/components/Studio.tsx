"use client";

import { useEffect, useRef, useState } from "react";
import { NOT_SAVING, useStudio } from "@/src/lib/useStudio";
import { usesFocus, type OutAspect } from "@/src/lib/moves";
import { FrameInput } from "./FrameInput";
import { MoveStrip } from "./MoveStrip";
import { ParamsPanel } from "./ParamsPanel";
import { Preview } from "./Preview";
import { TakesGrid } from "./TakesGrid";
import { ExportButton } from "./ExportButton";
import { GenerateFrame } from "./GenerateFrame";
import { PrintPanel } from "./PrintPanel";
import { SampleReel } from "./SampleReel";
import { SAMPLES } from "@/src/lib/samples";
import { usePrefersReducedMotion, useSyncedClock } from "./TakePlayer";

const ASPECTS: OutAspect[] = ["16:9", "9:16", "1:1"];
const SCRUB_S = 1 / 3;

const TEXT_INPUTS = new Set(["text", "search", "email", "number", "url", "tel", "password"]);
/** Typing into a field: no review shortcuts at all. */
function typingInto(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLInputElement) return TEXT_INPUTS.has(el.type);
  return el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}
/** On a button, checkbox or link, Space belongs to that control. */
function spaceBelongsTo(el: EventTarget | null) {
  return el instanceof HTMLElement && el !== document.body && el.matches("button, a, input, [role=radio], [role=button], [tabindex]");
}

export function Studio() {
  const s = useStudio();
  const reduced = usePrefersReducedMotion();
  const [previewPlay, setPreviewPlay] = useState<boolean | null>(null);
  const [takesPlay, setTakesPlay] = useState<boolean | null>(null);
  const previewPlaying = previewPlay ?? !reduced;
  const takesPlaying = takesPlay ?? !reduced;
  const { clock, loopS } = useSyncedClock(s.takes.map((t) => t.params.durationS), takesPlaying);

  // On a phone the takes land below the controls: after a press of Roll, bring them into view.
  const takesRef = useRef<HTMLElement>(null);
  const rolled = useRef(false);
  // A new shot can have as many takes as the last one, so watch the shot too.
  const rollKey = `${s.shot?.id}:${s.takes.length}`;
  useEffect(() => {
    if (!rolled.current || s.takes.length === 0) return;
    rolled.current = false;
    const el = takesRef.current;
    if (el && el.getBoundingClientRect().top > window.innerHeight - 160) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, [rollKey, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  const { ensureFrame } = s;
  useEffect(() => ensureFrame(), [ensureFrame]);

  // Review keys: Space play/pause, J/K/L scrub, 1–6 pick a take, C circle it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingInto(e.target) || s.takes.length === 0) return;
      const k = e.key.toLowerCase();
      if (k === " " && spaceBelongsTo(e.target)) return;
      if (k === " " || k === "k") {
        e.preventDefault();
        setTakesPlay(!takesPlaying);
      } else if (k === "j" || k === "l") {
        setTakesPlay(false);
        clock.set((t) => Math.min(loopS, Math.max(0, t + (k === "l" ? SCRUB_S : -SCRUB_S))));
      } else if (/^[1-6]$/.test(k)) {
        const take = s.takes[Number(k) - 1];
        if (take) s.focus(take.id);
      } else if (k === "c" && s.focusedTake) {
        s.circle(s.focusedTake);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s, takesPlaying, loopS, clock]);

  // Roll is only ever aria-disabled, never disabled, so keyboard focus isn't lost; the store ignores a press it can't take.
  const rollDisabled = s.rollState.disabled || !s.depth;
  return (
    // Phones read top to bottom: preview, then frame / move / settings, then takes and samples.
    // From lg the controls sit in a left column beside preview and takes.
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-6 pt-6 sm:px-6 lg:grid lg:grid-cols-[minmax(300px,380px)_1fr] lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:pb-10">
      <section className="lg:col-start-2 lg:row-start-1" aria-label="Preview">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Studio</h1>
            <p className="max-w-xl text-sm text-muted">Photo in, real camera move out. Pick a move, roll 3 versions, keep the best, download a 1080p MP4. Free, in your browser, no credits.</p>
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
            onFocus={usesFocus(s.moveId) ? (f) => s.setParam("focus", f) : undefined}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Dailies moves a real camera through your image. Subjects stay still — it’s the camera that moves.
        </p>
        {s.storageError && (
          <p role="alert" className="mt-1 text-xs text-paper">
            {NOT_SAVING}
          </p>
        )}

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:mt-4 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="mx-auto flex max-w-[1440px] items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!rollDisabled && !s.rolling) rolled.current = true;
                s.roll(3);
              }}
              aria-disabled={rollDisabled || s.rolling || undefined}
              className="rounded bg-paper px-5 py-2.5 font-display text-lg font-bold uppercase tracking-wide text-bg hover:bg-paper/90 aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
            >
              {s.rollState.label}
            </button>
            <p className="text-xs text-muted" aria-live="polite">
              {!s.depth && s.frame
                ? "Waiting for depth…"
                : s.rollState.disabled && s.shot
                  ? "Change the frame, move or settings to roll a new shot."
                  : s.rollState.newShot && s.shot
                    ? "You changed the frame, move or settings, so this starts a new shot."
                    : !s.shot
                      ? "Roll makes 3 slightly different versions of this move."
                      : ""}
            </p>
          </div>
        </div>
      </section>

      <aside className="mt-8 space-y-6 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0" aria-label="Frame, move and settings">
        <FrameInput frame={s.frame} busy={s.frameBusy} error={s.frameError} onFile={(f) => s.setFrame(f)} onSample={(x) => s.setFrame(x)}>
          <GenerateFrame aspect={s.aspect} onFrame={(blob, prompt) => s.setFrame(blob, "generated", prompt)} onUseSample={() => s.setFrame(SAMPLES[0])} />
        </FrameInput>
        <MoveStrip value={s.moveId} onChange={s.setMove} />
        <ParamsPanel moveId={s.moveId} params={s.base} setParam={s.setParam} />
      </aside>

      <section ref={takesRef} className="scroll-mt-4 lg:col-start-2 lg:row-start-2" aria-label="Takes">
        <div className="mt-8 lg:mt-6">
          <TakesGrid
            shot={s.shot}
            takes={s.takes}
            frame={s.shotFrame}
            depth={s.shotDepth}
            aspect={s.aspect}
            focusedTake={s.focusedTake}
            playing={takesPlaying}
            clock={clock}
            onTogglePlay={() => setTakesPlay(!takesPlaying)}
            onFocus={s.focus}
            onCircle={s.circle}
            onNudge={s.nudge}
            focusedActions={(take) =>
              s.shot && s.shotFrame && s.shotDepth ? (
                <>
                  <ExportButton
                    key={take.id}
                    takeId={take.id}
                    recipe={{ frame: s.shotFrame, depth: s.shotDepth, moveId: s.shot.moveId, params: take.params, seed: take.seed }}
                    shot={s.shot.number}
                    take={take.number}
                    aspect={s.aspect}
                  />
                  {take.circled && (
                    <PrintPanel
                      key={`print-${take.id}`}
                      takeId={take.id}
                      recipe={{ frame: s.shotFrame, depth: s.shotDepth, moveId: s.shot.moveId, params: take.params, seed: take.seed }}
                      shot={s.shot.number}
                      take={take.number}
                      aspect={s.aspect}
                    />
                  )}
                </>
              ) : null
            }
          />
        </div>
        <SampleReel
          onUse={(sample) => {
            s.pickSample(sample);
            window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
          }}
        />
      </section>
    </div>
  );
}
