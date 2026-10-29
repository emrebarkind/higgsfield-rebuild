"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { SAMPLES, type Sample } from "@/src/lib/samples";
import type { Frame } from "@/src/lib/frame";

export const FRAME_FILE_INPUT = "frame-file";

interface Props {
  frame: Frame | null;
  busy: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onSample: (s: Sample) => void;
  /** Slot for frame generation (Task 10). */
  children?: ReactNode;
}

export function FrameInput({ frame, busy, error, onFile, onSample, children }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };
  const activeSample = frame?.source === "sample" ? SAMPLES.find((s) => s.prompt === frame.prompt)?.id : undefined;
  return (
    <fieldset>
      <legend className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">Frame</legend>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={`rounded border border-dashed p-3 text-center text-sm transition-colors ${over ? "border-paper bg-panel" : "border-line"}`}
      >
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="rounded bg-paper px-3 py-1.5 font-medium text-bg disabled:opacity-50"
        >
          {busy ? "Opening…" : "Upload your image"}
        </button>
        <p className="mt-2 text-xs text-muted">or drop it here · JPG, PNG or WebP, up to 10 MB</p>
        <input
          ref={input}
          id={FRAME_FILE_INPUT}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-paper">
          {error}
        </p>
      )}
      {children}
      <div className="mt-3">
        <p className="mb-1.5 text-xs text-muted">Or start from a sample</p>
        <div className="grid grid-cols-4 gap-1.5">
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSample(s)}
              aria-pressed={activeSample === s.id}
              aria-label={`Sample: ${s.id}`}
              className={`relative overflow-hidden rounded border ${activeSample === s.id ? "border-paper" : "border-line hover:border-muted"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt="" className="aspect-square w-full object-cover" />
              <span className="absolute bottom-0 left-0 bg-bg/80 px-1 font-mono text-[9px] uppercase">Sample</span>
            </button>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
