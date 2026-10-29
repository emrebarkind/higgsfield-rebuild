"use client";

import { useState } from "react";
import type { OutAspect } from "@/src/lib/moves";
import type { TakeRecipe } from "@/src/lib/render/scene";
import { exportCaps, exportFileName, exportTake, frameCount, pickExportPath } from "@/src/lib/export/mp4";
import { exportJobs, useExportJob } from "@/src/lib/export/jobs";

const WEBM_NOTE = "Your browser can’t make MP4 — exporting WebM instead.";

export function ExportButton(props: { takeId: string; recipe: TakeRecipe; shot: number; take: number; aspect: OutAspect }) {
  const { takeId, recipe, shot, take, aspect } = props;
  const [height, setHeight] = useState<720 | 1080>(1080);
  const status = useExportJob(takeId);
  const [path] = useState(() => (typeof window === "undefined" ? null : pickExportPath(exportCaps())));

  // The job runs in the store, so focusing another take or switching the aspect doesn't stop it.
  const run = () =>
    exportJobs.start(
      takeId,
      { total: frameCount(recipe.params.durationS, 30), aspect, height, name: (webm) => exportFileName(shot, take, recipe.moveId, webm ? "webm" : "mp4") },
      (onProgress, signal) => exportTake(recipe, { height, aspect, fps: 30 }, onProgress, signal),
    );

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
            Rendering {status.height}p {status.aspect} · {status.done} / {status.total} frames
          </span>
          <button type="button" onClick={() => exportJobs.cancel(takeId)} className="text-xs text-muted underline hover:text-paper">
            Cancel
          </button>
        </>
      ) : (
        <button type="button" onClick={run} className="rounded bg-paper px-3 py-1.5 text-sm font-medium text-bg">
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
