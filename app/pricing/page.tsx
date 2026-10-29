import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Pricing — Dailies" };

const INCLUDED = [
  "Unlimited takes: roll, review, circle, roll again",
  "Nine camera moves, previewed live on your frame",
  "1080p MP4 export, as many as you like",
  "Frames from text on a free community GPU (a small quota per visitor)",
  "AI variation of a circled take (experimental, same free GPU)",
  "Your shots kept on this device, no account",
];

const WHY = [
  {
    title: "The camera runs on your device",
    line: "Depth, the 2.5D scene, every take and the MP4 encoder all run in your browser. A take costs no server time, so there is nothing to bill.",
  },
  {
    title: "The only GPU calls are free and labelled",
    line: "Frames from text and the AI variation use free community GPUs on Hugging Face. They can queue or run out; the app says so and your work stays put.",
  },
  {
    title: "No account to sell you",
    line: "No sign-up, no credit balance, no countdown. Clearing your browser's site data is the only way to lose your dailies.",
  },
];

const ELSEWHERE = [
  ["One 5 s 1080p video", "✦80 credits", "€0, and you see the move first"],
  ["A plan's monthly credits", "1,200 (card says ≈ 80 videos; 15 at those settings)", "No credits"],
  ["When you see the price", "After you press Generate", "Never"],
];

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
      <h1 className="font-display text-5xl font-bold uppercase tracking-wide">Pricing</h1>
      <p className="mt-2 max-w-xl text-muted">Free. No credits, no plans, no countdown.</p>

      <section aria-label="The plan" className="mt-8 max-w-md rounded border border-paper p-6">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted">The only plan</p>
        <p className="mt-1 font-display text-3xl font-bold uppercase tracking-wide">Everything</p>
        <p className="mt-3">
          <span className="font-display text-6xl font-bold">€0</span> <span className="text-muted">forever</span>
        </p>
        <ul className="mt-5 space-y-2 text-sm">
          {INCLUDED.map((i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden="true" className="text-circle">
                ✓
              </span>
              {i}
            </li>
          ))}
        </ul>
        <Link href="/" className="mt-6 block rounded bg-go px-4 py-2.5 text-center font-display text-lg font-bold uppercase tracking-wide text-paper hover:bg-go/80">
          Open the Studio
        </Link>
      </section>

      <section aria-label="Why it can be free" className="mt-12">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide">Why it can be free</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {WHY.map((w) => (
            <li key={w.title} className="rounded border border-line p-4">
              <p className="font-display text-lg font-bold uppercase tracking-wide">{w.title}</p>
              <p className="mt-1 text-sm text-muted">{w.line}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Compared with a credit-based generator" className="mt-12">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide">Compared with a credit-based generator</h2>
        <p className="mt-1 text-sm text-muted">
          Numbers from Higgsfield, seen in a free signed-in account on 29 Oct 2026 (
          <a
            href="https://github.com/emrebarkind/higgsfield-rebuild/blob/main/docs/recon/05-logged-in-addendum.md"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-paper"
          >
            screens and notes
          </a>
          ). A generator does things Dailies can’t: subjects move and new content appears.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-line font-mono text-[11px] uppercase tracking-wider text-muted">
                <th className="py-2 pr-4 font-normal" />
                <th className="py-2 pr-4 font-normal">Higgsfield</th>
                <th className="py-2 font-normal">Dailies</th>
              </tr>
            </thead>
            <tbody>
              {ELSEWHERE.map(([what, them, us]) => (
                <tr key={what} className="border-b border-line">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    {what}
                  </th>
                  <td className="py-2 pr-4 text-muted">{them}</td>
                  <td className="py-2">{us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
