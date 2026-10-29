"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MOVES } from "@/src/lib/moves";
import type { Shot, Take } from "@/src/lib/takes";
import * as db from "@/src/lib/store";
import { NOT_SAVING, studio, useStudio } from "@/src/lib/useStudio";

type Entry = { shot: Shot; takes: Take[] };

export function DailiesView() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [circledOnly, setCircledOnly] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  const { storageError } = useStudio();

  useEffect(() => {
    let gone = false;
    const urls: string[] = [];
    db.listShots()
      .then(async (list) => {
        if (gone) return;
        setEntries(list);
        const ids = [...new Set(list.map((e) => e.shot.frameId))];
        const pairs = await Promise.all(ids.map(async (id) => [id, await db.getFrame(id)] as const));
        if (gone) return;
        const next: Record<string, string> = {};
        for (const [id, f] of pairs) {
          if (!f) continue;
          next[id] = URL.createObjectURL(f.blob);
          urls.push(next[id]);
        }
        setThumbs(next);
      })
      .catch(() => {
        if (gone) return;
        setEntries([]);
        setReadFailed(true);
      });
    return () => {
      gone = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const shown = (entries ?? [])
    .map((e) => ({ ...e, takes: circledOnly ? e.takes.filter((t) => t.circled) : e.takes }))
    .filter((e) => e.takes.length > 0);

  const open = async (id: string) => {
    setOpening(id);
    if (await studio.openShot(id)) router.push("/");
    else setOpening(null);
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Dailies</h1>
          <p className="text-sm text-muted">Every shot you rolled, newest first. Open one to keep working on it.</p>
        </div>
        {entries && entries.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={circledOnly} onChange={(e) => setCircledOnly(e.target.checked)} className="accent-[var(--circle)]" />
            Circled only
          </label>
        )}
      </div>

      {entries === null ? (
        <p className="mt-8 font-mono text-xs uppercase tracking-wider text-muted">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="mt-8 rounded border border-dashed border-line p-8 text-center">
          <p className="font-mono text-sm uppercase tracking-wider text-muted">
            {circledOnly && entries.length > 0 ? "No circled takes yet." : "Nothing in the can yet."}
          </p>
          <p className="mt-2 text-sm text-muted">
            {circledOnly && entries.length > 0
              ? "Circle the takes you want to keep in the Studio."
              : "This is your history: every shot you roll in the Studio is saved here, on this device, with the take you circled."}
          </p>
          <Link href="/" className="mt-4 inline-block rounded bg-paper px-4 py-2 font-medium text-bg hover:bg-paper/90">
            {circledOnly && entries.length > 0 ? "Go to the Studio" : "Roll 3 takes on a sample"}
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {shown.map(({ shot, takes }) => (
            <li key={shot.id} className="flex flex-col gap-3 rounded border border-line p-3 sm:flex-row sm:items-center">
              {thumbs[shot.frameId] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbs[shot.frameId]} alt="" className="aspect-video w-full rounded-sm object-cover sm:w-40" />
              ) : (
                <div className="aspect-video w-full rounded-sm bg-panel sm:w-40" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs uppercase tracking-wider">
                  SHOT {String(shot.number).padStart(2, "0")} · {MOVES[shot.moveId].label.toUpperCase()} · {shot.base.lensMm}MM
                </p>
                <p className="mt-0.5 text-xs text-muted">{new Date(shot.createdAt).toLocaleString()}</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {takes.map((t) => (
                    <li
                      key={t.id}
                      className={`rounded px-2 py-0.5 font-mono text-[11px] uppercase ${t.circled ? "bg-circle font-bold text-bg" : "border border-line text-muted"}`}
                    >
                      Take {t.number}
                      {t.circled ? " · Circled" : ""}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => open(shot.id)}
                disabled={opening !== null}
                className="self-start rounded bg-paper px-3 py-1.5 text-sm font-medium text-bg disabled:opacity-50 sm:self-center"
              >
                {opening === shot.id ? "Opening…" : "Open in Studio"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 border-t border-line pt-4 text-sm text-muted">
        {storageError || readFailed ? (
          <p role="alert" className="text-paper">{NOT_SAVING}</p>
        ) : (
          <p>Stored on this device; clearing your browser’s site data removes it too. Only two buttons send anything out: Generate frame sends your prompt, and Print an AI variation sends the frame.</p>
        )}
        {entries && entries.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {confirming ? (
              <>
                <span className="text-paper">Delete every shot, take and frame on this device?</span>
                <button
                  type="button"
                  disabled={clearing}
                  onClick={async () => {
                    setClearing(true);
                    try {
                      await studio.clearDailies();
                      setEntries([]);
                      setThumbs({});
                      setConfirming(false);
                    } finally {
                      setClearing(false);
                    }
                  }}
                  className="rounded bg-paper px-3 py-1.5 font-medium text-bg disabled:opacity-50"
                >
                  {clearing ? "Clearing…" : "Yes, clear them"}
                </button>
                <button type="button" disabled={clearing} onClick={() => setConfirming(false)} className="min-h-6 px-1 py-1 underline hover:text-paper">
                  Keep them
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="rounded border border-line px-3 py-1.5 hover:border-paper hover:text-paper">
                Clear my dailies
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
