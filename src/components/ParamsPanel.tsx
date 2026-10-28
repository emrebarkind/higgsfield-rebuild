"use client";

import type { ReactNode } from "react";
import { STRENGTH_CAPS, type Easing, type LensMm, type MoveId, type MoveParams } from "@/src/lib/moves";

const EASINGS: { id: Easing; label: string }[] = [
  { id: "linear", label: "Linear" },
  { id: "ease-in-out", label: "Ease" },
  { id: "snap", label: "Snap" },
];
const LENSES: LensMm[] = [24, 35, 50, 85];

type SetParam = <K extends keyof MoveParams>(k: K, v: MoveParams[K]) => void;

export function ParamsPanel({ moveId, params, setParam }: { moveId: MoveId; params: MoveParams; setParam: SetParam }) {
  const cap = STRENGTH_CAPS[moveId];
  return (
    <fieldset className="space-y-4">
      <legend className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">Settings</legend>
      <Slider
        label="Strength"
        value={params.strength}
        min={0}
        max={cap}
        step={0.01}
        display={`${Math.round((params.strength / cap) * 100)}%`}
        onChange={(v) => setParam("strength", v)}
        hint={cap < 1 ? "Capped so the edges of your frame stay clean." : undefined}
        disabled={moveId === "static"}
      />
      <Slider label="Duration" value={params.durationS} min={3} max={8} step={0.5} display={`${params.durationS} s`} onChange={(v) => setParam("durationS", v)} />
      <Segmented label="Easing" value={params.easing} options={EASINGS.map((e) => ({ value: e.id, label: e.label }))} onChange={(v) => setParam("easing", v)} />
      <Segmented
        label="Lens"
        value={params.lensMm}
        options={LENSES.map((l) => ({ value: l, label: `${l}mm` }))}
        onChange={(v) => setParam("lensMm", v)}
      />
      <Slider
        label="Handheld"
        value={params.handheld}
        min={0}
        max={1}
        step={0.05}
        display={params.handheld === 0 ? "Locked off" : `${Math.round(params.handheld * 100)}%`}
        onChange={(v) => setParam("handheld", v)}
      />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">Focus point</span>
        <span className="flex items-center gap-3">
          <span className="font-mono text-xs">
            {params.focus.x.toFixed(2)}, {params.focus.y.toFixed(2)}
          </span>
          {(params.focus.x !== 0.5 || params.focus.y !== 0.5) && (
            <button type="button" className="text-xs text-muted underline hover:text-paper" onClick={() => setParam("focus", { x: 0.5, y: 0.5 })}>
              Centre
            </button>
          )}
        </span>
      </div>
      <p className="-mt-2 text-xs text-muted">Click the preview to set what the camera aims at.</p>
    </fieldset>
  );
}

function Row({ label, display, children, hint }: { label: string; display?: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-muted">{label}</span>
        {display && <span className="font-mono text-xs">{display}</span>}
      </div>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <Row label={props.label} display={props.display} hint={props.hint}>
      <input
        type="range"
        aria-label={props.label}
        aria-valuetext={props.display}
        className="w-full accent-[var(--text)] disabled:opacity-40"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </Row>
  );
}

function Segmented<T extends string | number>(props: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <Row label={props.label}>
      <div role="radiogroup" aria-label={props.label} className="grid grid-flow-col gap-1">
        {props.options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === props.value}
            onClick={() => props.onChange(o.value)}
            className={`rounded border px-2 py-1 text-xs transition-colors ${
              o.value === props.value ? "border-paper bg-paper text-bg" : "border-line text-muted hover:text-paper"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Row>
  );
}
