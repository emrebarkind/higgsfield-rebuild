"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MOVES, type MoveId } from "@/src/lib/moves";
import { studio } from "@/src/lib/useStudio";
import { MoveDiagram } from "./MoveDiagram";
import { SampleReel, useLoadedSamples } from "./SampleReel";
import { TakePlayer, usePrefersReducedMotion } from "./TakePlayer";

const TOOLS = [
  { n: "01", title: "Studio", line: "Your frame, a camera move, three takes side by side, one MP4.", href: "/", cta: "Open the Studio" },
  { n: "02", title: "Frames", line: "Describe a frame and a free community GPU paints it. Or bring your own photo.", href: "/frames", cta: "Generate a frame" },
  { n: "03", title: "Moves", line: "Nine camera moves, each drawn as the path the camera travels.", href: "/moves", cta: "See the moves" },
  { n: "04", title: "Dailies", line: "Every shot you rolled and the take you circled, kept on this device.", href: "/dailies", cta: "Open your dailies" },
  { n: "05", title: "AI variation", tag: "Experimental", line: "A video model re-imagines your circled take, subjects and all. Free GPU, so it may say no.", href: "/", cta: "Try it on a take" },
  { n: "06", title: "Pricing", line: "Free. No credits, no plans, no countdown.", href: "/pricing", cta: "Why it’s free" },
] as const;

const STEPS = [
  { n: "1", title: "Add a frame", line: "Upload a photo, pick a sample, or describe one and generate it." },
  { n: "2", title: "Choose a move", line: "Nine moves, each previewed live on your frame before anything renders." },
  { n: "3", title: "Get an MP4", line: "Roll three takes, circle the best, export a 1080p MP4. As often as you like." },
];

const IDS = Object.keys(MOVES) as MoveId[];

export function ExploreView() {
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const samples = useLoadedSamples();
  const hero = samples[0];
  const [hover, setHover] = useState<MoveId | null>(null);
  // Restore this device's Studio first, so a move or sample picked here isn't overwritten by it.
  useEffect(() => studio.ensureFrame(), []);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6">
      {/* Hero: the claim, and the camera actually moving next to it. */}
      <section className="grid items-center gap-8 lg:grid-cols-[5fr_6fr]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">Free · in your browser · no sign-in</p>
          <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-[0.95] tracking-wide sm:text-6xl">
            A real camera for your still images
          </h1>
          <p className="mt-4 max-w-md text-muted">
            Photo in, real camera move out. A depth model turns your frame into a 2.5D scene, and the camera moves through it exactly as you
            chose: live, instant, as often as you like.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="rounded bg-paper px-5 py-2.5 font-display text-lg font-bold uppercase tracking-wide text-bg hover:bg-paper/90">
              Open the Studio
            </Link>
            <Link href="/frames" className="rounded border border-paper px-5 py-2.5 font-display text-lg font-bold uppercase tracking-wide hover:bg-paper hover:text-bg">
              Generate a frame
            </Link>
          </div>
        </div>
        <figure>
          {hero ? (
            <TakePlayer
              recipe={{ frame: hero.frame, depth: hero.depth, moveId: hero.sample.moveId, params: hero.sample.params, seed: 3 }}
              playing={!reduced}
              aspect="16:9"
              className="w-full rounded"
            >
              <span className="absolute left-2 top-2 rounded bg-bg/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                Live · {MOVES[hero.sample.moveId].label} · rendered in your browser
              </span>
            </TakePlayer>
          ) : (
            <div className="aspect-video w-full rounded bg-[#0b0b0a]" />
          )}
        </figure>
      </section>

      {/* One card per tool, the way a platform shows its sections. */}
      <section aria-label="What you can do" className="mt-14">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide">What you can do</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <li key={t.n}>
              <Link href={t.href} className="group flex h-full flex-col rounded border border-line bg-panel p-4 transition-colors hover:border-paper">
                <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                  {t.n}
                  {"tag" in t && <span className="rounded border border-line px-1.5 py-0.5 text-[10px]">{t.tag}</span>}
                </span>
                <span className="mt-2 font-display text-xl font-bold uppercase tracking-wide">{t.title}</span>
                <span className="mt-1 flex-1 text-sm text-muted">{t.line}</span>
                <span className="mt-3 text-sm underline-offset-4 group-hover:underline">{t.cta} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="How it works" className="mt-14">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide">How it works</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded border border-line p-4">
              <span className="font-display text-4xl font-bold text-muted">{s.n}</span>
              <p className="mt-1 font-display text-lg font-bold uppercase tracking-wide">{s.title}</p>
              <p className="mt-1 text-sm text-muted">{s.line}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="The nine moves" className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide">Nine moves, drawn from above</h2>
          <Link href="/moves" className="text-sm text-muted underline hover:text-paper">
            All moves →
          </Link>
        </div>
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {IDS.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  studio.setMove(id);
                  router.push("/");
                }}
                onMouseEnter={() => setHover(id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(id)}
                onBlur={() => setHover(null)}
                className="block w-full rounded border border-line p-1.5 text-left hover:border-paper"
                aria-label={`${MOVES[id].label}: ${MOVES[id].plain} Open it in the Studio.`}
              >
                <MoveDiagram moveId={id} active={hover === id} className="w-full" />
                <span className="mt-1 block text-xs">{MOVES[id].label}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <SampleReel
        onUse={(sample) => {
          studio.pickSample(sample);
          router.push("/");
        }}
      />

      {/* The economics, stated plainly, with where the numbers come from. */}
      <section aria-label="What a take costs" className="mt-14 rounded border border-line p-5">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide">What a take costs</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-wider text-muted">Here</dt>
            <dd className="mt-1 font-display text-4xl font-bold">€0</dd>
            <dd className="text-sm text-muted">Every take, every export. The camera runs on your device.</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-wider text-muted">Preview</dt>
            <dd className="mt-1 font-display text-4xl font-bold">Instant</dd>
            <dd className="text-sm text-muted">You see the exact move on your frame before you roll.</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-wider text-muted">A typical generator</dt>
            <dd className="mt-1 font-display text-4xl font-bold">✦80</dd>
            <dd className="text-sm text-muted">
              Credits for one 5 s 1080p clip on Higgsfield, seen in a signed-in account on 29 Oct.{" "}
              <a
                href="https://github.com/emrebarkind/higgsfield-rebuild/blob/main/docs/recon/05-logged-in-addendum.md"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-paper"
              >
                Evidence
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
