# Decisions

One line of context per call: when, what, the evidence, and what it cost us. Newest at the bottom.
Clock started 28 Oct 2026 11:42 UTC.

| UTC | Decision | Evidence | Cost / trade-off |
|---|---|---|---|
| 11:50 | Capture via Claude Code hooks in `.claude/settings.json` (prompt event + end-of-turn re-render from the transcript) | 8x capture setup; hook input schema read from the installed CLI | ~20 min before any product work |
| 11:55 | Research before code: four parallel passes (product, users, stack, typical rebuild) | Brief: "understand the product fully before you write any code" | ~10 min of wall time, run in parallel |
| 12:05 | Build around the camera move, not the model catalog | recon/01: the moat is curated motion; ~24 nav areas are sprawl | We ship 2 models, not 30 |
| 12:05 | Fix the economics: cheap draft takes → review → print only the keeper | recon/02: top pains are invisible cost, slow queues, paying for discarded takes | Print is a re-render, not an upscale; we must say so |
| 12:05 | No black + lime, no copied nav, no lightbox gallery | recon/04: those are the median rebuild | We have to design an identity from scratch |
| 12:10 | Do not build on Higgsfield's own API | It shipped 16 Sep 2026; using it would skip the exercise | Must wire real providers ourselves |
| 12:15 | Merge the prior ChatGPT plan: its job reliability (idempotent submit, durable jobs, reconnecting state, failure keeps the draft), honesty rules (no fake progress or ETA, samples labelled), QA runbook and walkthrough storyboard | docs/recon/prior-plan | More engineering per feature, fewer features |
| 12:15 | No accounts: a signed visitor-pass cookie with a small daily allowance | Brief: live link must work for someone not signed in; screen 07 shows Higgsfield gating after Generate | No cross-device history |
| 12:15 | All generation through Vercel AI Gateway; Redis for state; Blob for media; no SQL | recon/03; model IDs and prices re-checked against the live Gateway list | Redis atomics instead of SQL transactions |
| 12:20 | Higgsfield paid flows are not exercised: no money is spent on Higgsfield | Owner's call; free sign-up gates and free gens remain open for research | Result/download/history of the original are documented from public sources and screens, not first-hand |
| 12:25 | A shot is frame + move + prompt frozen at first roll; same inputs add takes (max 4), changed inputs start a new shot | Builder check: review compares takes of one shot, so the shot must be stable | No mixing of directions inside one review grid |
| 12:25 | Visitor pass counted in real cents, one counter (~50¢/day), per-IP cap 3× | Builder check; recon/02: credit units hide real cost | Shows small money amounts openly, by design |
| 12:25 | Spike a real-person photo; switch drafts to Grok Imagine lite if Seedance refuses | recon/03: Seedance rejects real-person input images; graders will try a selfie | Drafts may cost 10¢ instead of 5¢ |
| 12:30 | Planning session rendered into `.agent-logs/` by the same renderer; build runs in fresh sessions where the hooks fire | Hooks did not attach to the already-running session after it moved into the repo; a fresh session did fire | One extra hand-off from planning to building |
| 12:45 | Zero spend on any provider. Generative video moves to an optional, experimental free path | Owner's call (job-application case). Checked: AI Gateway free tier has no image/video models; every Pollinations video model is paid-only | Rev. 1's draft→print economics no longer apply |
| 12:45 | Camera moves rendered for real in the browser: AI depth map (Depth Anything V2, in-browser) → 2.5D scene → exact, instant, free moves; export MP4 via WebCodecs | recon/02: camera control is what users praise; screen 14: Higgsfield's "camera move" is text pasted into a prompt | Subjects don't animate; edges stretch on big moves, so strength is capped and the limit is stated |
| 12:45 | Frames generated for free via Pollinations (keyless, tested: 200 OK in ~4s) | Live probe of gen.pollinations.ai/image/models: FLUX schnell, Z-Image Turbo, FLUX.2 Klein not paid-only | Third-party free service; rate limits outside our control |
| 12:45 | Experimental "Print with AI motion" via a free Hugging Face ZeroGPU Space, called from the visitor's browser | Only free generative-video route found; per-visitor anonymous quota | Unreliable by nature: labelled experimental, cut if the spike fails |
| 12:45 | No server storage: shots, takes (as recipes), frames and depth maps live in the visitor's IndexedDB | Nothing costs money or needs abuse limits once generation is local | History is per device |
