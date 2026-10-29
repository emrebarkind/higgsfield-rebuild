"use client";

import { useState } from "react";
import { MOVES, type MoveId } from "@/src/lib/moves";
import { MoveDiagram } from "./MoveDiagram";

const IDS = Object.keys(MOVES) as MoveId[];

export function MoveStrip({ value, onChange }: { value: MoveId; onChange: (id: MoveId) => void }) {
  const [hover, setHover] = useState<MoveId | null>(null);
  return (
    <fieldset>
      <legend className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">Move</legend>
      <div className="grid grid-cols-3 gap-1.5">
        {IDS.map((id) => {
          const selected = id === value;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              title={MOVES[id].plain}
              onClick={() => onChange(id)}
              onMouseEnter={() => setHover(id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(id)}
              onBlur={() => setHover(null)}
              className={`rounded border p-1.5 text-left transition-colors ${
                selected ? "border-paper bg-panel" : "border-line hover:border-muted"
              }`}
            >
              <MoveDiagram moveId={id} active={selected || hover === id} className="w-full" />
              <span className={`mt-1 block text-xs ${selected ? "text-paper" : "text-muted"}`}>{MOVES[id].label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">{MOVES[hover ?? value].plain}</p>
    </fieldset>
  );
}
