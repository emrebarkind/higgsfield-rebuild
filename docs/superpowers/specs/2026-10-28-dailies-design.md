# Dailies — design

Higgsfield, rebuilt around its one real differentiator and its biggest pain.
8x Product Engineer take-home · written 28 Oct 2026 · deadline 29 Oct 2026 11:42 UTC.

Sources this design merges:
- Our recon: [docs/recon/](../../recon/README.md) (teardown, voice of user, stack feasibility, median rebuild).
- The prior plan prepared in ChatGPT, with 16 logged-out screenshots: [docs/recon/prior-plan/](../../recon/prior-plan/PLAN.tr.md), [recon/screens/](../../../recon/screens/).

## 1. Intent

Higgsfield's magic moment is *your image + a curated camera move → a cinematic clip* (recon 01; screens 04, 13, 14). Its loudest complaints are economic: you can't see what a generation costs or how long it takes, and you pay full price for takes you throw away (recon 02). The product has sprawled to ~24 top-level areas (screen 01), and the typical rebuild copies that surface, including the black-and-lime look (recon 04).

Dailies keeps the magic and fixes the economics with one loop borrowed from film sets:

**Frame → Move → Roll cheap takes → Circle the best → Print it in HD.**

On a set, the day's raw takes ("dailies") are cheap to shoot and reviewed together, and the script supervisor circles the good ones; only circled takes get printed. Here, a draft take costs about 5¢ and a print about 20¢, so you only pay for quality on the take you keep.

The product claim, stated plainly: *fewer decisions before you start, no surprise costs, and no lost work.*

## 2. Who it serves

- **Primary user (assumption, not research):** a solo creator making short social or product clips. They don't know model names and don't want to.
- **First real users:** the graders. They open the live link signed out and must reach a real, freshly generated result without creating an account.

## 3. Goals (P0: must ship)

1. **Frame.** Start from an uploaded image (JPG/PNG/WebP, ≤ 10 MB, validated in the browser and on the server) or one of 4 sample frames we generated ourselves. Changing the frame keeps the move and the prompt.
2. **Move.** A library of 8 camera moves: Static, Push in, Pull back, Pan left, Pan right, Orbit, Crane up, Crash zoom. Each move is shown as a small **motion diagram** (top-down camera path plus start and end framing) and, where we have one, a short sample take. Choosing a move writes a visible, editable direction into the prompt (Higgsfield does the same in Cinema Studio, screen 14). Moves are directions to the model, not guaranteed geometry, and the UI says so once in plain words.
3. **Roll.** Rolling a shot creates draft takes: 2 by default, 1–3 allowed, 5s at 480p. The roll button shows the exact cost and the typical wait *before* you press it. The typical wait is the median of our last real takes for that model, labelled "typical", never a countdown.
4. **Review (the dailies).** All takes of a shot play side by side, synced. Keyboard: Space plays and pauses all, J/K/L scrub, 1–3 focus a take, C circles it. A circled take is the one you keep.
5. **Print.** Printing a circled take renders it in HD with the same frame, move, prompt and seed. The UI is honest that a print is a new render, close to the draft but not pixel-identical. The original draft stays.
6. **Durable jobs.** A take is a job with states `queued → running → succeeded | failed`, plus `checking` when we temporarily can't reach the provider (shown as "Reconnecting…", never as failed). Submitting is idempotent: a double click makes one job. Refreshing or closing the tab loses nothing; on return, every pending take resumes from the server. No fake progress percentages.
7. **Dailies page (history).** Every shot and take for this visitor, newest first, with a filter for circled takes. It survives refreshes and return visits for 30 days. Any finished take can be downloaded. "Another take" reuses the shot's frame, move and prompt; old takes are never overwritten.
8. **Visitor pass (no sign-in).** Each visitor gets a signed, httpOnly cookie id and a daily allowance (proposal: 6 draft takes + 1 print per day). The remaining allowance is always visible. A failed take returns its allowance automatically. Server-side limits sit behind it: a per-IP cap, one concurrent roll per visitor, and a global daily spend cap. When the pass is used up, the visitor can still browse everything, including the sample reel.
9. **Sample reel.** A few shots we generated beforehand, each labelled "Sample — shot earlier". Opening them costs nothing and never looks like a live call.
10. **Cost honesty.** A server-owned price table, checked against the AI Gateway price list, drives every cost the UI shows. Every take records what it actually cost.

## 4. P1 (if time allows, in this order)

1. **Text to frame:** describe a frame and generate a still (FLUX 3 Klein, about 1¢, a few seconds) instead of uploading.
2. **Reel:** play circled prints in sequence and share a read-only link.
3. **Mobile review polish:** swipe between takes.

## 5. Non-goals

These are cut on purpose. The README will list them with reasons.

- Accounts and sign-in, plans, payments, any pricing page.
- A model catalog. Models hide behind two plain choices, Draft and Print.
- Community and explore feeds, contests, characters and Soul ID, audio and lipsync, effects and VFX apps, Cinema Studio rigs, canvas, layers and inpainting, timeline editing.
- Higgsfield's own API. Rebuilding Higgsfield on Higgsfield would skip the exercise.

## 6. Anti-goals

Shipping any of these would make the build a failure even if it works:

- Black + lime, a centered gradient hero, or Higgsfield's navigation copied.
- Fake progress bars, fake ETA countdowns, or a sample presented as a live result.
- Dead buttons, "coming soon" badges, upsell modals.
- Model jargon before the first take.
- Losing a user's frame, move or prompt to an error or a refresh.

## 7. Experience

**Navigation:** three places. **Studio** (set up and roll a shot), **Moves** (the camera move library), **Dailies** (every shot and take). There is no marketing landing page: `/` opens the Studio with the sample reel visible and a one-line value proposition.

**First visit, signed out:**
1. Studio opens. A sample frame is preselected, and the sample reel below shows what finished shots look like.
2. Pick a move from the strip; its diagram animates. The prompt fills in.
3. The button reads *"Roll 2 takes · 10¢ of your pass · typically ~45s"*. Press it.
4. Two take cards appear immediately in `queued` and update in place.
5. When they land, review side by side, circle one, and optionally print it.

**Studio layout (desktop):** the left column holds the frame, move, prompt and roll button. The right side holds the current shot's takes in a review grid. **Mobile:** the frame and takes come first, and the controls sit in a bottom sheet with the roll button pinned so it never covers the content. Check at 390px and 1440px.

**Error states (adopted from the prior plan):**

| Case | User sees | System does |
|---|---|---|
| Wrong file type | "Upload a JPG, PNG or WebP." | No upload starts |
| File too big | The real limit and the file's size | Draft kept |
| Missing frame | Reason next to the disabled roll button | No request sent |
| Pass used up | Allowance message before rolling | No job, no spend |
| Provider refuses (moderation) | Plain, editable message | Draft kept, allowance returned |
| Network drop while polling | "Reconnecting…" | Same job polled again, no resubmit |
| Provider failure | "This take failed. Your shot is saved." | Allowance returned |

**Accessibility:** focus is visible, everything is keyboard-reachable, `prefers-reduced-motion` turns diagram animation and autoplay off, and status is never conveyed by color alone.

## 8. Visual language and voice

- **Look:** an edit bay, not a neon SaaS.
  - Background: warm graphite, not pure black.
  - Text: paper white.
  - Tally red: only for the "rolling" indicator.
  - Amber: only for circled takes.
  - Primary action: an inverted paper-white button.
- **Type:** a condensed grotesk for display, a neutral sans for UI, and a monospace face for timecodes, slate labels and costs.
- **Ornaments:** these carry the identity, not gradients.
  - Letterbox frames.
  - Safe-area guides on the frame.
  - Slate-style labels such as "SHOT 03 · TAKE 2 · PUSH IN".
- **Voice:** film-set words, each paired with its plain meaning the first time it appears for a novice. Examples: "Roll" (generate), "Take", "Circle" (keep), "Print" (render in HD), "Nothing in the can yet" (empty state).

## 9. Technical decisions

- **Platform:** Next.js 16 (App Router, TypeScript) on Vercel, Node 24, Tailwind v4 with our own tokens.
- **Generation:** everything goes through **Vercel AI Gateway** via AI SDK 7, behind one provider adapter interface. A deterministic **test adapter** is used for tests and for failure drills, never in production.
  - **Draft model:** `bytedance/seedance-v1.0-pro-fast`, image-to-video, 480p, 5s (about $0.05).
  - **Print model:** decided by the spike in §11. Default: the same model at 1080p with the same seed. Fallback: `klingai/kling-v2.5-turbo-i2v` (std, about $0.21), with `cameraControl` where a move maps to it.
  - **Frame model (P1):** `bfl/flux-3-image-klein`.
- **Storage:** Vercel Blob. Uploads use the client-upload flow. Every finished take is copied to Blob before it counts as downloadable, because provider URLs expire.
- **State:** Upstash Redis via the Vercel Marketplace. It holds visitors, shots, takes, idempotency keys, allowance counters, the global spend counter, and recent latencies per model. No SQL database.
- **Abuse protection, checked on every roll and print, in order:**
  1. Signed cookie.
  2. Per-visitor and per-IP daily allowance.
  3. One active roll per visitor.
  4. Global daily spend cap.
  5. Gateway budget as the backstop.
  
  Optional: Vercel BotID.
- **Job reconciliation:** the client polls a short status route, and the route reconciles with the provider. A signed Gateway webhook is optional, added only if quick.
- **Secrets:** the Gateway key lives only in server environment variables (OIDC on Vercel). `.env*` files are never committed.

**Data (Redis keys):**
- `visitor:{vid}`
- `shot:{id}`: vid, frameUrl, moveId, prompt, createdAt, takeIds
- `take:{id}`: shotId, vid, kind (draft or print), model, an immutable settings snapshot, seed, status, providerJobId, outputUrl, error, costUsd, created/started/finished timestamps, idempotencyKey
- `vid:{vid}:shots`
- `idem:{vid}:{key}`: SET NX
- `allow:{vid}:{yyyy-mm-dd}` and `allow:ip:{ip}:{yyyy-mm-dd}`
- `spend:{yyyy-mm-dd}`
- `lat:{model}`: list of the last 20 durations

State transitions are compare-and-set: a take leaves a terminal state never, and settles its allowance exactly once.

**API:**

| Route | Purpose |
|---|---|
| `POST /api/upload` | Blob client-upload handshake (type and size enforced) |
| `POST /api/shots` | Create a shot from frame, move and prompt |
| `POST /api/shots/:id/takes` | Roll N draft takes; idempotency key; 202 |
| `POST /api/takes/:id/print` | Print a circled take; idempotency key; 202 |
| `POST /api/takes/:id/circle` | Toggle circled |
| `GET /api/takes/:id` | Status; reconciles a non-terminal take with the provider |
| `GET /api/dailies` | This visitor's shots and takes |
| `GET /api/pass` | Remaining allowance, price table, typical times |

## 10. How we work (the process signature)

- **Evidence → decision → cut.** Every product decision gets one line in `DECISIONS.md` (UTC time, decision, evidence, what it cost us), linked to recon or a screen.
- **Live early.** A deployed link exists within the first ~90 minutes, and every slice ends deployed.
- **Order:**
  1. Capture test.
  2. Provider spike.
  3. Frame → roll → take, deployed.
  4. Durable jobs and dailies.
  5. Review and circle.
  6. Print.
  7. Moves library and diagrams.
  8. Visitor pass and limits.
  9. Visual polish and mobile.
  10. QA.
  11. README and walkthrough.
  
  P1 only after QA passes. No new features in the last 3 hours.
- **Capture:** the build runs in sessions where the `.agent-logs/` hooks fire, and logs are committed with the code they produced.
- **QA:** the prior plan's runbook (`docs/recon/prior-plan/QA-AND-DEMO.md`), adapted. CAP, CORE, STATE, DATA, INPUT, BUDGET, UX, PUBLIC, REPO and SECRET all apply, with sign-in-based ownership replaced by visitor-cookie scoping.
- **Walkthrough:** the prior plan's 4:30 storyboard, with "research screenshots → decision" leading into the take, review and print loop.

## 11. Risks and the first spike (≤ 45 min, before any UI work)

1. **AI Gateway image-to-video:** confirm start and status with `seedance-v1.0-pro-fast` at 480p from a Blob-hosted frame. Measure latency and record the actual cost.
2. **Print fidelity:** test whether the same model at 1080p with the same seed stays close to the 480p draft. If it doesn't, print with Kling and label it "re-shot in HD".
3. **Kling `cameraControl`:** test whether it is accepted on 2.5 Turbo through the Gateway. If not, moves stay prompt-only.
4. **Money:** live generation needs AI Gateway credits. Until the budget is confirmed, the build runs on the test adapter and live calls stay off.

## 12. Left to the builder

- Component structure, file layout, exact copy beyond the examples, and the exact diagram rendering (SVG).
- The specific fonts within the stated direction.
- Test tooling: vitest for state and allowance logic; one Playwright smoke if time allows.
