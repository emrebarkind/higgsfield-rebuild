"use client";

import { useState } from "react";
import type { OutAspect } from "@/src/lib/moves";
import { describeFrameGenError, frameLimiter, generateFrame, MAX_PROMPT, validatePrompt } from "@/src/lib/framegen";
import { createSingleFlight } from "@/src/lib/ratelimit";
import { FRAME_FILE_INPUT } from "./FrameInput";

type Status =
  | { kind: "idle" }
  | { kind: "developing"; queuePosition: number | null }
  | { kind: "error"; message: string; detail?: string };

export function GenerateFrame({ aspect, onFrame, onUseSample }: { aspect: OutAspect; onFrame: (blob: Blob, prompt: string) => Promise<void> | void; onUseSample: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [once] = useState(createSingleFlight);

  const go = () => once(async () => {
    const invalid = validatePrompt(prompt);
    if (invalid) return setStatus({ kind: "error", message: invalid });
    const slot = frameLimiter.hit("me");
    if (!slot.ok) return setStatus({ kind: "error", message: `That’s a lot of frames in a minute — try again in ${slot.retryAfterS} s.` });
    setStatus({ kind: "developing", queuePosition: null });
    try {
      const blob = await generateFrame(prompt, aspect, Math.floor(Math.random() * 1_000_000), (s) =>
        setStatus({ kind: "developing", queuePosition: s.queuePosition }),
      );
      await onFrame(blob, prompt.trim());
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus({ kind: "error", ...describeFrameGenError(err) });
    }
  });

  const developing = status.kind === "developing";
  return (
    <form
      className="mt-3"
      onSubmit={(e) => {
        e.preventDefault();
        void go();
      }}
    >
      <label htmlFor="frame-prompt" className="mb-1.5 block text-xs text-muted">
        Or describe a frame and we’ll generate it
      </label>
      <textarea
        id="frame-prompt"
        rows={2}
        maxLength={MAX_PROMPT + 50}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void go();
          }
        }}
        placeholder="A lighthouse on a cliff at dusk, 35mm film"
        className="w-full resize-none rounded border border-line bg-panel px-2.5 py-2 text-sm placeholder:text-muted/70"
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={developing} className="rounded bg-go px-3 py-1.5 text-sm font-medium text-paper hover:bg-go/80 disabled:opacity-50">
          {developing ? "Developing frame…" : "Generate frame"}
        </button>
        <span className="text-xs text-muted">Free · FLUX.1 schnell on a community GPU · {aspect}</span>
      </div>
      {developing && status.queuePosition ? (
        <p role="status" className="mt-1.5 font-mono text-xs uppercase tracking-wider text-muted">
          In the queue · position {status.queuePosition}
        </p>
      ) : null}
      {status.kind === "error" && (
        <div role="alert" className="mt-1.5 text-sm">
          {status.message}
          {status.detail && <span className="block text-xs text-muted">{status.detail}</span>}
          <span className="mt-1.5 flex gap-2">
            {/* The GPU being busy shouldn't end the visit: the other two ways in, right here. */}
            <button type="button" onClick={() => document.getElementById(FRAME_FILE_INPUT)?.click()} className="rounded border border-line px-2 py-1 text-xs hover:border-paper">
              Upload an image
            </button>
            <button type="button" onClick={onUseSample} className="rounded border border-line px-2 py-1 text-xs hover:border-paper">
              Use a sample
            </button>
          </span>
        </div>
      )}
    </form>
  );
}
