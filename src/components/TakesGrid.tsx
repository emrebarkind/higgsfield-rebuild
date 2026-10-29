"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MAX_TAKES, type Shot, type Take } from "@/src/lib/takes";
import { STRENGTH_CAPS, type MoveParams, type OutAspect } from "@/src/lib/moves";
import type { Frame } from "@/src/lib/frame";
import type { DepthMap } from "@/src/lib/depth/client";
import type { Clock } from "@/src/lib/clock";
import { TakePlayer } from "./TakePlayer";
import { Slate } from "./Slate";

interface Props {
  shot: Shot | null;
  takes: Take[];
  frame: Frame | null;
  depth: DepthMap | null;
  aspect: OutAspect;
  focusedTake: string | null;
  playing: boolean;
  clock: Clock;
  onTogglePlay: () => void;
  onFocus: (id: string | null) => void;
  onCircle: (id: string) => void;
  onNudge: (id: string, params: MoveParams) => void;
  /** Rendered under the focused take (export lives here). */
  focusedActions?: (take: Take) => ReactNode;
}

export function TakesGrid(props: Props) {
  const { shot, takes, frame, depth, aspect, focusedTake, playing, clock, onTogglePlay, onFocus, onCircle, onNudge, focusedActions } = props;
  if (!shot || !frame || !depth || takes.length === 0) {
    return (
      <div className="rounded border border-dashed border-line p-6 text-center">
        <p className="font-mono text-sm uppercase tracking-wider text-muted">Nothing in the can yet.</p>
        <p className="mt-1 text-sm text-muted">Press Roll to shoot a few takes of this move. Each take varies a little, like real takes do.</p>
      </div>
    );
  }
  const focused = takes.find((t) => t.id === focusedTake) ?? null;
  return (
    <section aria-label={`Shot ${shot.number} takes`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide">
          Shot {String(shot.number).padStart(2, "0")} · {takes.length} {takes.length === 1 ? "take" : "takes"}
        </h2>
        <div className="flex items-center gap-3">
          <p className="hidden font-mono text-[11px] uppercase tracking-wider text-muted md:block">
            Space play · J/K/L scrub · 1–{takes.length} pick · C circle
          </p>
          <button type="button" onClick={onTogglePlay} className="rounded border border-line px-3 py-1 font-mono text-xs uppercase hover:border-paper">
            {playing ? "Pause all" : "Play all"}
          </button>
        </div>
      </div>
      <p className="mb-2 text-xs text-muted">
        Tap a take to export or nudge it. Circle your keeper: it stays marked in Dailies and can be printed as an AI variation.
      </p>
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {takes.map((take, i) => {
          const isFocused = take.id === focusedTake;
          return (
            <li key={take.id}>
              <div
                className={`rounded p-0.5 ${take.circled ? "ring-2 ring-circle" : ""} ${isFocused ? "outline outline-2 outline-offset-2 outline-paper" : ""}`}
              >
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => onFocus(isFocused ? null : take.id)}
                  aria-pressed={isFocused}
                  aria-label={`Take ${take.number}${take.circled ? ", circled" : ""}. Press ${i + 1} to pick.`}
                >
                  <TakePlayer
                    recipe={{ frame, depth, moveId: shot.moveId, params: take.params, seed: take.seed }}
                    playing={playing}
                    clock={clock}
                    aspect={aspect}
                    className="w-full rounded-sm"
                  />
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <Slate shot={shot.number} take={take.number} moveId={shot.moveId} lensMm={take.params.lensMm} className="truncate" />
                <button
                  type="button"
                  onClick={() => onCircle(take.id)}
                  aria-pressed={take.circled}
                  className={`min-h-6 shrink-0 rounded px-2 py-1 font-mono text-[11px] uppercase ${
                    take.circled ? "bg-circle font-bold text-bg" : "border border-line text-muted hover:text-paper"
                  }`}
                >
                  {take.circled ? "Circled" : "Circle"}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      {focused && (
        <FocusedTake
          key={focused.id}
          shot={shot}
          take={focused}
          canNudge={shot.takeIds.length < MAX_TAKES}
          onNudge={onNudge}
          actions={focusedActions?.(focused)}
        />
      )}
    </section>
  );
}

function FocusedTake(props: { shot: Shot; take: Take; canNudge: boolean; onNudge: (id: string, p: MoveParams) => void; actions?: ReactNode }) {
  const { shot, take, canNudge, onNudge, actions } = props;
  const [open, setOpen] = useState(false);
  const [p, setP] = useState(take.params);
  const cap = STRENGTH_CAPS[shot.moveId];
  // The panel renders under the whole grid; on a phone that's off-screen.
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => panel.current?.scrollIntoView({ block: "nearest" }), []);
  return (
    <div ref={panel} className="mt-4 scroll-mb-28 rounded border border-line bg-panel p-4 lg:scroll-mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Slate shot={shot.number} take={take.number} moveId={shot.moveId} lensMm={take.params.lensMm} className="text-paper" />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            disabled={!canNudge}
            aria-expanded={open}
            aria-describedby={`nudge-hint-${take.id}`}
            className="rounded border border-line px-3 py-1.5 text-sm hover:border-paper disabled:opacity-40"
          >
            Nudge
          </button>
          <span id={`nudge-hint-${take.id}`} className="text-xs text-muted">
            {canNudge ? "Tweak this take, save it as a new one" : `Shot full · ${MAX_TAKES} takes`}
          </span>
        </div>
      </div>
      {actions && <div className="mt-3 flex flex-wrap items-center gap-3">{actions}</div>}
      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <NudgeSlider label="Strength" min={0} max={cap} step={0.01} value={p.strength} show={`${Math.round((p.strength / cap) * 100)}%`} onChange={(v) => setP({ ...p, strength: v })} />
          <NudgeSlider label="Duration" min={3} max={8} step={0.1} value={p.durationS} show={`${p.durationS.toFixed(1)} s`} onChange={(v) => setP({ ...p, durationS: v })} />
          <NudgeSlider label="Handheld" min={0} max={1} step={0.05} value={p.handheld} show={`${Math.round(p.handheld * 100)}%`} onChange={(v) => setP({ ...p, handheld: v })} />
          <div className="sm:col-span-3">
            <button
              type="button"
              onClick={() => {
                onNudge(take.id, p);
                setOpen(false);
              }}
              className="rounded bg-paper px-3 py-1.5 text-sm font-medium text-bg hover:bg-paper/90"
            >
              Save as take {shot.takeIds.length + 1}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NudgeSlider(props: { label: string; min: number; max: number; step: number; value: number; show: string; onChange: (v: number) => void }) {
  return (
    <label className="block text-sm">
      <span className="flex justify-between text-muted">
        {props.label} <span className="font-mono text-xs text-paper">{props.show}</span>
      </span>
      <input
        type="range"
        className="w-full accent-[var(--text)]"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        aria-valuetext={props.show}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}
