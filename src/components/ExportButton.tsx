"use client";

import { useEffect, useRef, useState } from "react";
import type { OutAspect } from "@/src/lib/moves";
import type { TakeRecipe } from "@/src/lib/render/scene";
import { createSingleFlight, exportCaps, exportFileName, exportTake, frameCount, pickExportPath } from "@/src/lib/export/mp4";

type Status =
  | { kind: "idle" }
  | { kind: "running"; done: number; total: number }
  | { kind: "done"; url: string; name: string; webm: boolean }
  | { kind: "error"; message: string };

const WEBM_NOTE = "Your browser can’t make MP4 — exporting WebM instead.";

export function ExportButton(props: { recipe: TakeRecipe; shot: number; take: number; aspect: OutAspect }) {
  const { recipe, shot, take, aspect } = props;
  const [height, setHeight] = useState<720 | 1080>(1080);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [path] = useState(() => (typeof window === "undefined" ? null : pickExportPath(exportCaps())));
  const abort = useRef<AbortController | null>(null);
  const live = useRef({ recipe, height, aspect, shot, take });
  useEffect(() => {
    live.current = { recipe, height, aspect, shot, take };
  });

  const doExport = async () => {
    const { recipe: r, height: h, aspect: a, shot: s, take: t } = live.current;
    abort.current = new AbortController();
    setStatus({ kind: "running", done: 0, total: frameCount(r.params.durationS, 30) });
    try {
      const blob = await exportTake(r, { height: h, aspect: a, fps: 30 }, (done, total) => setStatus({ kind: "running", done, total }), abort.current.signal);
      const webm = blob.type === "video/webm";
      const name = exportFileName(s, t, r.moveId, webm ? "webm" : "mp4");
      const url = URL.createObjectURL(blob);
      setStatus({ kind: "done", url, name, webm });
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") setStatus({ kind: "idle" });
      else setStatus({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  };
  // One export at a time: a double click joins the running one.
  const runner = useRef<(() => Promise<void>) | null>(null);
  const run = () => (runner.current ??= createSingleFlight(doExport))();

  // Free the last file when a new one replaces it or the panel goes away.
  const doneUrl = status.kind === "done" ? status.url : null;
  useEffect(() => () => void (doneUrl && URL.revokeObjectURL(doneUrl)), [doneUrl]);
  useEffect(() => () => abort.current?.abort(), []);

  if (!path) return <p className="text-sm text-muted">This browser can’t record video, so export isn’t available here.</p>;
  const running = status.kind === "running";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="Export size" className="flex gap-1">
        {([720, 1080] as const).map((h) => (
          <button
            key={h}
            type="button"
            role="radio"
            aria-checked={height === h}
            disabled={running}
            onClick={() => setHeight(h)}
            className={`rounded border px-2 py-1 font-mono text-xs ${height === h ? "border-paper bg-paper text-bg" : "border-line text-muted hover:text-paper"}`}
          >
            {h}p
          </button>
        ))}
      </div>
      {running ? (
        <>
          <span role="status" className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
            <span className="h-2 w-2 motion-safe:animate-pulse rounded-full bg-tally" aria-hidden="true" />
            Rendering {status.done} / {status.total} frames
          </span>
          <button type="button" onClick={() => abort.current?.abort()} className="text-xs text-muted underline hover:text-paper">
            Cancel
          </button>
        </>
      ) : (
        <button type="button" onClick={() => void run()} className="rounded bg-paper px-3 py-1.5 text-sm font-medium text-bg">
          {path === "mediarecorder-webm" ? "Export WebM" : "Export MP4"} · {aspect}
        </button>
      )}
      {status.kind === "done" && (
        <a href={status.url} download={status.name} className="text-xs text-muted underline hover:text-paper">
          Download {status.name} again
        </a>
      )}
      {status.kind === "error" && (
        <p role="alert" className="w-full text-sm">
          Export failed: {status.message}. Your take is safe — try again, or try 720p.
        </p>
      )}
      {(path === "mediarecorder-webm" || (status.kind === "done" && status.webm)) && <p className="w-full text-xs text-muted">{WEBM_NOTE}</p>}
    </div>
  );
}
