"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OutAspect } from "@/src/lib/moves";
import { describeFrameGenError, frameLimiter, generateFrame, MAX_PROMPT, validatePrompt } from "@/src/lib/framegen";
import { createSingleFlight } from "@/src/lib/ratelimit";
import { SAMPLES } from "@/src/lib/samples";
import { studio } from "@/src/lib/useStudio";

const ASPECTS: OutAspect[] = ["16:9", "9:16", "1:1"];
const ASPECT_CSS: Record<OutAspect, string> = { "16:9": "16 / 9", "9:16": "9 / 16", "1:1": "1 / 1" };

interface Result {
  id: number;
  url: string;
  blob: Blob;
  prompt: string;
  aspect: OutAspect;
}

type Status = { kind: "idle" } | { kind: "developing"; queuePosition: number | null } | { kind: "error"; message: string; detail?: string };

// Frames generated this visit, newest first. Module-level, so they survive moving to the Studio and back;
// a frame is saved to this device once it's shot in the Studio.
let visit: Result[] = [];
let nextId = 1;

export function FramesView() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<OutAspect>(() => studio.get().aspect);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [results, setResults] = useState<Result[]>(visit);
  const [once] = useState(createSingleFlight);
  const fileInput = useRef<HTMLInputElement>(null);
  // Restore this device's Studio first, so a frame sent from here isn't overwritten by it.
  useEffect(() => studio.ensureFrame(), []);

  const shoot = (blob: Blob, source: "generated" | "upload", text?: string, a: OutAspect = aspect) => {
    studio.setAspect(a);
    studio.setFrame(blob, source, text);
    router.push("/");
  };

  const go = () =>
    once(async () => {
      const invalid = validatePrompt(prompt);
      if (invalid) return setStatus({ kind: "error", message: invalid });
      const slot = frameLimiter.hit("me");
      if (!slot.ok) return setStatus({ kind: "error", message: `That’s a lot of frames in a minute — try again in ${slot.retryAfterS} s.` });
      setStatus({ kind: "developing", queuePosition: null });
      try {
        const blob = await generateFrame(prompt, aspect, Math.floor(Math.random() * 1_000_000), (s) =>
          setStatus({ kind: "developing", queuePosition: s.queuePosition }),
        );
        visit = [{ id: nextId++, url: URL.createObjectURL(blob), blob, prompt: prompt.trim(), aspect }, ...visit];
        setResults(visit);
        setStatus({ kind: "idle" });
      } catch (err) {
        setStatus({ kind: "error", ...describeFrameGenError(err) });
      }
    });

  const developing = status.kind === "developing";
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-48 pt-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Frames</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Describe a frame and a free community GPU paints it in a few seconds (FLUX.1 schnell on Hugging Face). Then shoot it with a real camera
        move in the Studio.
      </p>

      {results.length === 0 && !developing ? (
        <section aria-label="Start with a frame" className="mt-10 flex flex-col items-center text-center">
          <ul className="flex justify-center">
            {SAMPLES.map((s, i) => (
              <li key={s.id} className={i > 0 ? "-ml-6" : ""} style={{ transform: `rotate(${[-8, -3, 3, 8][i]}deg)` }}>
                <button
                  type="button"
                  onClick={() => {
                    studio.pickSample(s);
                    router.push("/");
                  }}
                  aria-label={`Shoot the ${s.id} sample in the Studio`}
                  className="block overflow-hidden rounded border-2 border-paper/80 shadow-lg transition-transform hover:-translate-y-1"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.src} alt="" className="h-24 w-32 object-cover sm:h-32 sm:w-44" />
                </button>
              </li>
            ))}
          </ul>
          <h2 className="mt-8 font-display text-4xl font-bold uppercase tracking-wide">Start with a frame</h2>
          <p className="mt-2 max-w-md text-muted">A scene, a place, a product, a face. Or tap a sample above to shoot it straight away.</p>
        </section>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {developing && (
            <li>
              <div
                className="flex items-center justify-center rounded bg-panel font-mono text-xs uppercase tracking-wider text-muted motion-safe:animate-pulse"
                style={{ aspectRatio: ASPECT_CSS[aspect] }}
                role="status"
              >
                {status.queuePosition ? `In the queue · position ${status.queuePosition}` : "Developing frame…"}
              </div>
            </li>
          )}
          {results.map((r) => (
            <li key={r.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.url} alt={r.prompt} className="w-full rounded bg-panel object-cover" style={{ aspectRatio: ASPECT_CSS[r.aspect] }} />
              <p className="mt-1.5 line-clamp-2 text-sm text-muted">{r.prompt}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => shoot(r.blob, "generated", r.prompt, r.aspect)} className="rounded bg-go px-3 py-1.5 text-sm font-medium text-paper hover:bg-go/80">
                  Shoot this frame →
                </button>
                <a href={r.url} download={`dailies-frame-${r.id}.jpg`} className="rounded border border-line px-3 py-1.5 text-sm hover:border-paper">
                  Download
                </a>
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{r.aspect}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* The prompt bar, pinned to the bottom like an image tool's. */}
      <form
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur"
        onSubmit={(e) => {
          e.preventDefault();
          void go();
        }}
      >
        <div className="mx-auto max-w-3xl">
          {status.kind === "error" && (
            <div role="alert" className="mb-2 text-sm">
              {status.message}
              {status.detail && <span className="block text-xs text-muted">{status.detail}</span>}
              <span className="mt-1.5 flex gap-2">
                <button type="button" onClick={() => fileInput.current?.click()} className="rounded border border-line px-2 py-1 text-xs hover:border-paper">
                  Upload an image
                </button>
                <button
                  type="button"
                  onClick={() => {
                    studio.pickSample(SAMPLES[0]);
                    router.push("/");
                  }}
                  className="rounded border border-line px-2 py-1 text-xs hover:border-paper"
                >
                  Use a sample
                </button>
              </span>
            </div>
          )}
          <div className="rounded border border-muted bg-panel p-2 focus-within:outline focus-within:outline-2 focus-within:outline-circle">
            <label htmlFor="frames-prompt" className="sr-only">
              Describe a frame
            </label>
            <textarea
              id="frames-prompt"
              name="prompt"
              autoComplete="off"
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
              placeholder="A lighthouse on a cliff at dusk, 35mm film…"
              className="w-full resize-none bg-transparent px-1.5 py-1 text-sm placeholder:text-muted focus:outline-none"
            />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div role="radiogroup" aria-label="Frame aspect" className="flex gap-1">
                {ASPECTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    role="radio"
                    aria-checked={aspect === a}
                    onClick={() => setAspect(a)}
                    className={`rounded border px-2 py-1 font-mono text-xs ${aspect === a ? "border-paper bg-paper text-bg" : "border-line text-muted hover:text-paper"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <span className="hidden font-mono text-[11px] uppercase tracking-wider text-muted sm:inline">FLUX.1 schnell · community GPU</span>
              <button
                type="submit"
                disabled={developing}
                className="ml-auto rounded bg-go px-4 py-1.5 font-display text-base font-bold uppercase tracking-wide text-paper hover:bg-go/80 disabled:opacity-50"
              >
                {developing ? "Developing…" : "Generate · Free"}
              </button>
            </div>
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) shoot(f, "upload");
            e.target.value = "";
          }}
        />
      </form>
    </div>
  );
}
