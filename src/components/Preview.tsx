"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { fitFrame, type MoveId, type MoveParams, type OutAspect } from "@/src/lib/moves";
import type { Frame } from "@/src/lib/frame";
import type { DepthMap, DepthStatus } from "@/src/lib/depth/client";
import { grayFromDepth } from "@/src/lib/depth/asset";
import { ASPECT_CSS, TakePlayer } from "./TakePlayer";

interface Props {
  frame: Frame | null;
  depth: DepthMap | null;
  depthStatus: DepthStatus | null;
  depthError: string | null;
  onRetryDepth: () => void;
  moveId: MoveId;
  params: MoveParams;
  aspect: OutAspect;
  playing: boolean;
  onTogglePlay: () => void;
  onFocus?: (focus: { x: number; y: number }) => void;
}

// Frames are few and kept for the visit anyway, so their URLs are made once and kept.
const urls = new WeakMap<Blob, string>();
function objectUrl(blob: Blob | undefined) {
  if (!blob) return undefined;
  let u = urls.get(blob);
  if (!u) urls.set(blob, (u = URL.createObjectURL(blob)));
  return u;
}

/** Where the frame sits inside the output, as shares of the box (contain-fit, like the renderer). */
function frameBox(frame: Frame, aspect: OutAspect) {
  const fit = fitFrame(frame.width, frame.height, aspect);
  const out = aspect === "16:9" ? 16 / 9 : aspect === "9:16" ? 9 / 16 : 1;
  const w = (fit.scale * (frame.width / frame.height)) / out;
  return { left: (1 - w) / 2, top: (1 - fit.scale) / 2, width: w, height: fit.scale };
}

export function Preview(props: Props) {
  const { frame, depth, depthStatus, depthError, onRetryDepth, moveId, params, aspect, playing, onTogglePlay, onFocus } = props;
  const still = objectUrl(frame?.blob);
  const box = frame ? frameBox(frame, aspect) : null;
  const [showDepth, setShowDepth] = useState(false);
  const [showGuides, setShowGuides] = useState(false);

  const pickFocus = (e: MouseEvent<HTMLDivElement>) => {
    if (!onFocus || !box) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - box.left) / box.width;
    const y = ((e.clientY - r.top) / r.height - box.top) / box.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    onFocus({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
  };

  const STEP = 0.05;
  const moveFocus = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] }[e.key];
    if (!d || !onFocus) return;
    e.preventDefault();
    const clamp = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 100) / 100;
    onFocus({ x: clamp(params.focus.x + d[0]), y: clamp(params.focus.y + d[1]) });
  };

  // A stable recipe: a new one restarts the player's clock.
  const recipe = useMemo(() => (frame && depth ? { frame, depth, moveId, params, seed: 0 } : null), [frame, depth, moveId, params]);
  return (
    <div className="relative w-full">
      {recipe ? (
        <TakePlayer recipe={recipe} playing={playing} aspect={aspect} className="w-full">
          {showDepth && <DepthLayer box={box!} depth={recipe.depth} />}
          {showGuides && <Guides />}
          <FocusLayer box={box!} focus={params.focus} onClick={pickFocus} onKey={moveFocus} interactive={!!onFocus} />
        </TakePlayer>
      ) : (
        <div className="relative w-full overflow-hidden bg-[#0b0b0a]" style={{ aspectRatio: ASPECT_CSS[aspect] }}>
          {still && box && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={still}
              alt=""
              className="absolute object-fill opacity-60"
              style={{ left: `${box.left * 100}%`, top: `${box.top * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` }}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
            <DepthState status={depthStatus} error={depthError} onRetry={onRetryDepth} hasFrame={!!frame} />
          </div>
        </div>
      )}
      {recipe && (
        <>
          <button
            type="button"
            onClick={onTogglePlay}
            className="absolute bottom-3 left-3 rounded bg-bg/80 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-paper hover:bg-bg"
            aria-label={playing ? "Pause preview" : "Play preview"}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <div className="absolute bottom-3 right-3 flex gap-1.5">
            <Toggle on={showDepth} onClick={() => setShowDepth(!showDepth)} label="See the depth" />
            <Toggle on={showGuides} onClick={() => setShowGuides(!showGuides)} label="Guides" />
          </div>
        </>
      )}
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider ${on ? "bg-paper text-bg" : "bg-bg/80 text-paper hover:bg-bg"}`}
    >
      {label}
    </button>
  );
}

/** The depth map the camera moves through: white is near, black is far. */
function DepthLayer({ box, depth }: { box: ReturnType<typeof frameBox>; depth: DepthMap }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = depth.width;
    c.height = depth.height;
    c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(grayFromDepth(depth)), depth.width, depth.height), 0, 0);
  }, [depth]);
  return (
    <>
      <canvas
        ref={ref}
        aria-hidden="true"
        className="pointer-events-none absolute opacity-90"
        style={{ left: `${box.left * 100}%`, top: `${box.top * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` }}
      />
      <span className="pointer-events-none absolute left-3 top-3 rounded bg-bg/80 px-2 py-1 font-mono text-[11px] uppercase tracking-wider">
        Depth · white is near
      </span>
    </>
  );
}

/** Action-safe (90%) and title-safe (80%) frames with a centre mark, over the output. */
function Guides() {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
      <rect x="5" y="5" width="90" height="90" fill="none" stroke="var(--text)" strokeOpacity="0.45" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      <rect x="10" y="10" width="80" height="80" fill="none" stroke="var(--text)" strokeOpacity="0.3" strokeDasharray="2 2" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      <path d="M48 50h4M50 48v4" stroke="var(--text)" strokeOpacity="0.6" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function FocusLayer(props: {
  box: ReturnType<typeof frameBox>;
  focus: { x: number; y: number };
  onClick: (e: MouseEvent<HTMLDivElement>) => void;
  onKey: (e: KeyboardEvent<HTMLDivElement>) => void;
  interactive: boolean;
}) {
  const { box, focus, onClick, onKey, interactive } = props;
  const left = (box.left + focus.x * box.width) * 100;
  const top = (box.top + focus.y * box.height) * 100;
  return (
    <div
      className={`absolute inset-0 focus-visible:outline-offset-[-3px] ${interactive ? "cursor-crosshair" : ""}`}
      onClick={onClick}
      onKeyDown={interactive ? onKey : undefined}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "group" : undefined}
      aria-label={interactive ? `Focus point ${focus.x.toFixed(2)}, ${focus.y.toFixed(2)}. Click, or use the arrow keys, to move it.` : undefined}
      title={interactive ? "Click to set the focus point" : undefined}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-paper/80 ${interactive ? "" : "hidden"}`}
        style={{ left: `${left}%`, top: `${top}%` }}
      >
        <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper" />
      </span>
    </div>
  );
}

function DepthState({ status, error, onRetry, hasFrame }: { status: DepthStatus | null; error: string | null; onRetry: () => void; hasFrame: boolean }) {
  if (error) {
    return (
      <div className="rounded bg-bg/90 px-4 py-3 text-sm">
        <p>Couldn’t read the depth of this frame: {error}</p>
        <button type="button" onClick={onRetry} className="mt-2 rounded bg-paper px-3 py-1.5 font-medium text-bg">
          Try again
        </button>
      </div>
    );
  }
  if (!hasFrame) return <p className="font-mono text-xs uppercase tracking-wider text-muted">No frame yet</p>;
  const text =
    status?.phase === "download"
      ? `Downloading the depth model — first time only${typeof status.progress === "number" ? ` · ${Math.round(status.progress * 100)}%` : ""}`
      : status?.device === "wasm"
        ? "Reading depth… slower in this browser (no WebGPU), usually under 10 s"
        : "Reading depth…";
  return (
    <p role="status" className="rounded bg-bg/90 px-3 py-2 font-mono text-xs uppercase tracking-wider">
      <span className="mr-2 inline-block h-2 w-2 motion-safe:animate-pulse rounded-full bg-paper align-middle" aria-hidden="true" />
      {text}
    </p>
  );
}
