# Dailies

**A real camera for your still images.** Live: **https://higgsfield-rebuild-cyan.vercel.app** — free, no sign-in.

![Dailies studio: a sample frame with a push-in previewing live, three takes below](docs/screenshot.jpg)

Dailies is an 8x take-home that rebuilds [Higgsfield](https://higgsfield.ai) around its clearest differentiator, camera motion on your own image, and fixes the part users complain about most: paying and waiting for every try. (Users praise the model catalogue and output quality more; camera control ranks third, see [voice of user](docs/recon/02-voice-of-user.md).) The bet: for a solo creator who needs a camera move on a still, an exact move that previews instantly, re-rolls for free and exports deterministically beats a generative clip that costs credits and minutes per try. On Higgsfield a "camera move" is a word handed to a video model: you pay, wait minutes and hope. In Dailies the camera is real. Your frame gets an AI depth map, becomes a 2.5D scene, and the move is rendered exactly as chosen, in your browser, instantly, as often as you like, for free.

**Frame → Move → Roll takes → Review side by side → Circle the best → Export MP4.**

## Try it in 60 seconds

1. Open the link. A sample frame is already moving (a push-in).
2. Drop in your own JPG/PNG/WebP, or type a frame description and press **Generate frame**.
3. Pick a move from the strip of diagrams (try **Dolly zoom**). It previews on your frame at once.
4. Press **Roll 3 takes**. Three slightly different takes play side by side.
5. Press **1**, **2** or **3** to pick one, **C** to circle it, then **Export MP4**. The file downloads.

## What it is and why

- Research first: [product teardown, voice of the user, stack feasibility, the median rebuild](docs/recon/README.md), with the screens in [`recon/screens/`](recon/screens/). Signed-in screens were added after the build, on 29 Oct, as a dated [addendum](docs/recon/05-logged-in-addendum.md).
- Every call, with its evidence and cost: [DECISIONS.md](DECISIONS.md). Design: [spec](docs/superpowers/specs/2026-10-28-dailies-design.md). Plan: [plan](docs/superpowers/plans/2026-10-28-dailies.md). Spikes: [docs/spikes.md](docs/spikes.md).
- Higgsfield's moat is curated motion, not its 30-model catalogue. Dailies keeps the motion, makes it exact and free, and borrows the film set's way of working: shoot several takes, keep one.

## What is real, what is experimental, what is cut

| | What | How |
|---|---|---|
| **Real** | AI frames from text | FLUX.1 [schnell] on Hugging Face's free community GPUs, called from your browser |
| **Real** | AI depth | Depth Anything V2 (small) in a Web Worker: WebGPU, or WASM where WebGPU is missing |
| **Real** | Exact camera moves | 9 moves (push in, pull back, pan left/right, orbit, crane up, dolly zoom, crash zoom, handheld static), each a deterministic function of the take's recipe and seed |
| **Real** | MP4 export | The take is re-rendered offline frame by frame and encoded with WebCodecs H.264 + mp4-muxer; WebM via MediaRecorder where H.264 encoding is missing |
| **Real** | History | Shots, takes (as recipes), frames and depth maps in your browser's IndexedDB; survives refreshes and return visits |
| **Experimental** | Print an AI variation | A circled take's frame and move (in words; not its lens, strength, easing or duration) sent to Wan 2.2 image-to-video on a free community GPU. May queue or be unavailable; labelled so |
| **Cut** | Paid generation, accounts, credits | Zero spend by design ([DECISIONS.md](DECISIONS.md)) |
| **Cut** | Pollinations for frames | It refuses browser calls without a Turnstile token and rate-limits Vercel's shared IPs ([spikes](docs/spikes.md#addendum-task-10-1350-utc--pollinations-from-a-real-browser-page)). The four sample frames were made with it before that was known, so they carry its small logo |
| **Cut** | Model catalogue, community feed, characters, audio, VFX apps | Not the moat ([recon](docs/recon/01-product-teardown.md)) |
| **Later (P1)** | Reel export, frame edit, share links | Only after QA passed; not started |

## Honest limits

- A 2.5D move animates the camera, not the subject. People don't walk, water doesn't flow. The UI says so next to the preview.
- Big moves reveal the edges of the frame, so each move's strength is capped where the edges stayed clean in testing (orbit and pans have the tightest caps).
- The free community GPU gives each visitor a small anonymous quota (a few frames). When it runs out the app says so; uploading always works.
- Depth without WebGPU (Firefox, older Safari) takes about 5 s per frame instead of about 0.15 s.
- Everything lives on one device. Clearing site data, or another browser, starts empty.

## Architecture

```
Browser (everything that matters)                                  Vercel: static Next.js 16 app, no server code
┌──────────────────────────────────────────────────────────────┐
│ Frame ── upload / sample / FLUX.1 schnell (HF ZeroGPU, @gradio/client)
│   │  validate (JPG/PNG/WebP ≤ 10 MB) → downscale ≤ 1536 px → sha-256 id
│   ▼
│ Depth worker ── Depth Anything V2 small (transformers.js, WebGPU fp16 | WASM q8)
│   │  normalise, 3×3 blur → DepthMap (cached in memory + IndexedDB)
│   ▼
│ Scene (three.js) ── 256² plane, vertices pushed back along the base camera's rays
│   │  poseAt(move, params, t, seed) → camera   ← the take's recipe
│   ├─► Preview / takes grid (synced players, rAF)
│   └─► Export: same scene, offline, frame by frame → VideoEncoder → mp4-muxer → .mp4
│ Store ── IndexedDB (idb-keyval): frames, depth, shots + takes, draft
│ Print (experimental) ── Wan 2.2 i2v on HF ZeroGPU via @gradio/client
└──────────────────────────────────────────────────────────────┘
```

## Local setup

```bash
npm i && npm run dev
```

No environment variables, no keys. Open http://localhost:3000.

## Tests

```bash
npx vitest run
```

The pure parts are pinned by tests: camera poses and framing (`moves`), take variation and shot rules (`takes`, `studio`), frame validation and sizing (`frame`), depth post-processing and the sample depth assets (`depth`, `depth-asset`), the renderer's letterbox maths and camera mapping (`scene`), export paths, sizes and single-flight (`export`), storage round-trips with `fake-indexeddb` (`store`), frame generation and the print client against fake Gradio clients (`framegen`, `print`), and the rate limiter. QA by hand is in [docs/QA.md](docs/QA.md).

## Capture evidence

Every prompt and final response of the build sessions is logged automatically by Claude Code hooks into [`.agent-logs/`](.agent-logs/) and committed with the code it produced. How it works, and the two canary runs: [CAPTURE-TEST.md](CAPTURE-TEST.md).
