# Dailies — design (rev. 2: zero-cost engine)

Higgsfield, rebuilt around its one real differentiator: camera motion on your own image.
8x Product Engineer take-home · 28 Oct 2026 · deadline 29 Oct 2026 11:42 UTC.

Rev. 2 replaces paid generative video with a free engine, at the owner's call. No money is spent on any provider; the rationale is in [DECISIONS.md](../../../DECISIONS.md). Rev. 1 is in git history.

Sources:
- Our recon: [docs/recon/](../../recon/README.md).
- The prior ChatGPT plan and its 16 screenshots: [docs/recon/prior-plan/](../../recon/prior-plan/PLAN.tr.md), [recon/screens/](../../../recon/screens/).

## 1. Intent

- **Higgsfield's magic moment:** *your image + a curated camera move → a cinematic clip* (recon 01; screens 04, 13, 14).
- **What users praise most:** camera control (recon 02).
- **Its weakness:** on Higgsfield a "camera move" is a direction handed to a model. You pay, wait minutes, and hope (recon 02). Higgsfield's own Cinema Studio just pastes "Dolly in" into the prompt (screen 14).
- **Our angle:** Dailies makes the camera *real*. An AI depth map of your frame becomes a 2.5D scene, and the camera move is rendered exactly as chosen: instantly, in the browser, at zero cost, as often as you like.

That turns Higgsfield's slot machine into a film set:

**Frame → Move → Roll takes → Review side by side → Circle the best → Export.**

A take costs nothing and lands in about a second, so you can do what professionals do: shoot several and keep one. One optional, clearly labelled **experimental** step sends a circled take to a free community GPU for full generative motion (§3.7).

**The product claim:** *the camera does exactly what you asked, instantly, and nothing is lost.*

**Honest limits, said in the UI and the walkthrough:**
- A 2.5D move animates the camera, not the subject. People don't walk and water doesn't flow.
- Large moves reveal stretched edges, so move strength is capped by default.

## 2. Who it serves

- **Primary (assumption, not research):** a solo creator making short social or product clips who wants a cinematic move on a still, without learning models or paying per try.
- **First users:** the graders. They open the live link signed out, and within a minute they must get their own image moving with a real camera move and download it.

## 3. Goals (P0)

1. **Frame.** You can start three ways:
   - Upload a JPG, PNG or WebP (≤ 10 MB, validated).
   - **Generate a frame from text**, free, through Pollinations (keyless). This is real AI image generation: about 4s for FLUX schnell or Z-Image Turbo.
   - Pick one of 4 sample frames.
   
   Changing the frame keeps the move and its settings.
2. **Depth.** On first use, the frame is read by a depth model running in the browser (Depth Anything V2 small via transformers.js; WebGPU, falling back to WASM). The first run downloads the model, about 25–50 MB, cached afterwards. The UI states that honestly. The depth map can be shown as an overlay (a nice "how it works" moment).
3. **Move.** A library of 8 moves:
   - Static (with handheld breathing), Push in, Pull back, Pan left/right, Orbit, Crane up, Dolly zoom (the "Vertigo" move), Crash zoom.
   - Each move is shown as a **motion diagram**: a top-down camera path plus start and end framing, and it previews live on the current frame.
   - Parameters: strength, duration (3–8s), easing (linear, ease-in-out, snap), lens (24/35/50/85mm), focus point (click on the frame), handheld amount.
4. **Roll.** "Roll 3 takes" creates takes of the current shot. Takes differ the way real takes do: slight variations in easing, handheld jitter, strength and timing (seeded, reproducible). A take is a *recipe* (frame + move + params + seed), rendered live; nothing is waiting on a server.
   - **Shot vs. take:** a shot is frame + move + base params, frozen at its first roll. Rolling again adds takes, up to 6. Changing the frame or move makes the button read "Roll new shot", which creates SHOT n+1.
5. **Review (the dailies).** Takes of a shot play side by side, synced.
   - Keyboard: Space plays and pauses all, J/K/L scrub, 1–6 focus a take, C circles it.
   - Circling a take keeps it; any take can be nudged (open it, tweak, and save as a new take).
6. **Export.** Render the circled take frame by frame to **MP4** (WebCodecs + mp4-muxer; WebM via MediaRecorder as fallback) at 720p or 1080p, in 16:9, 9:16 or 1:1. Real progress is shown, because frames rendered out of total are known. Download it.
7. **Print with AI motion (experimental, P0 only if the spike passes, otherwise cut and documented).** Send the circled take's frame + move direction to a free Hugging Face ZeroGPU Space (e.g. Wan 2.2 TI2V-5B) through `@gradio/client` from the visitor's browser, so each visitor uses their own anonymous GPU quota.
   - Always labelled "Experimental · free community GPU · may queue for minutes or be unavailable".
   - Shows real queue status from the Space.
   - Keeps the draft if it fails.
   - The result lands beside the 2.5D take for comparison.
8. **Dailies page (history).** Every shot and take, newest first, with a filter for circled takes. Stored in the browser (IndexedDB): frames as blobs, depth maps cached, takes as recipes. It survives refreshes and return visits. It shows a clear "stored on this device" note and a "Clear my dailies" control.
9. **Sample reel.** Pre-made shots on sample frames (frames generated by us), labelled "Sample". They play instantly.
10. **Never lose work.** A failed frame generation keeps the prompt, and a failed depth read offers a retry. A refresh mid-anything restores the current shot from IndexedDB. Export failures don't touch the take.

## 4. P1 (in order, only after QA passes)

1. **Reel:** play circled takes in sequence and export them as one MP4.
2. **Frame edit:** "re-dress the frame" with a free image-edit model (FLUX.2 Klein via Pollinations).
3. **Share:** a read-only link encoding a take recipe plus a hosted frame.

## 5. Non-goals

These are cut on purpose; the README lists them with reasons.

- Paid generation of any kind, accounts, plans, payments, pricing.
- A model catalog, community feed, characters, audio and lipsync, VFX apps, Cinema Studio rigs, canvas, layers.
- Server-side media storage. Everything stays on the visitor's device, and that is a feature: private, free, instant.
- Higgsfield's own API.

## 6. Anti-goals

- Black + lime, a centered gradient hero, or Higgsfield's navigation copied.
- Fake progress, fake AI claims (the 2.5D move is never called "AI video"), or samples presented as live.
- Dead buttons, "coming soon", upsells.
- Model jargon before the first take.
- Losing a user's frame, move or takes.

## 7. Experience

**Navigation:** **Studio** · **Moves** · **Dailies**. `/` opens the Studio directly with a sample frame loaded and the sample reel below. The value proposition is one line: *"A real camera for your still images."*

**First visit:**
1. A sample frame is loaded and a move is already previewing live.
2. Drop your own image, or type a frame description and press **Generate frame**.
3. Depth reads; the first time, a one-time model download with honest progress.
4. Pick a move from the strip of diagrams; it previews on your frame immediately.
5. Press **Roll 3 takes**. Three takes play side by side. Circle one, press **Export MP4**, and download.

**Layout:**
- **Desktop:** the left column holds frame, move and parameters. The right side holds the live preview on top and the takes grid below.
- **Mobile:** the preview first, with controls in a bottom sheet and the Roll button pinned without covering content.
- Check at 390px and 1440px.

**Errors:**

| Case | User sees | System does |
|---|---|---|
| Wrong type / too big | Real limits, file's size | Keeps current frame |
| Frame generation fails or rate-limited | "Couldn't generate that frame — try again or upload one." | Prompt kept |
| No WebGPU | Nothing (silent WASM fallback); slower depth noted once | — |
| Depth model download fails | Retry with reason | Frame kept |
| WebCodecs missing | Export falls back to WebM, says so | — |
| Print Space busy/unavailable | "Community GPU is busy — your take is safe." | Draft kept, no retries in a loop |

**Accessibility:** focus is visible; everything is keyboard-reachable; `prefers-reduced-motion` stops autoplay; status is never conveyed by color alone.

## 8. Visual language and voice

- **Look:** an edit bay.
  - Warm graphite background (not black), paper-white text.
  - Tally red only for "rolling/rendering", amber only for circled takes.
  - Inverted paper-white primary buttons.
- **Type:** a condensed grotesk for display, a neutral sans for UI, mono for timecode, slate labels and parameters.
- **Ornaments:** letterbox frames, safe-area guides, slate labels ("SHOT 03 · TAKE 2 · DOLLY ZOOM · 35MM"), the motion diagrams themselves. No gradients.
- **Voice:** film-set words, each paired with its plain meaning the first time: Roll, Take, Circle, Print, "Nothing in the can yet".

## 9. Technical decisions

- **Platform:** Next.js 16 (App Router, TypeScript) on Vercel Hobby (free), Tailwind v4 with our own tokens. Almost everything runs on the client.
- **Rendering:** three.js with a subdivided plane displaced by the depth map (or an equivalent depth-parallax shader), a perspective camera driven by the move. Dolly zoom couples the FOV with the dolly distance.
  - Edges: slight overscan, depth smoothing, and strength caps per move.
  - Deterministic: a take renders identically from its recipe and seed.
- **Depth:** `@huggingface/transformers` with a Depth Anything V2 small ONNX model, in a Web Worker so the UI never freezes.
- **Frames:** a thin Next.js route `/api/frame` proxies Pollinations (keyless). It normalizes size and aspect, applies a modest per-IP rate limit (in-memory), and sets a referrer. The returned image is cached in IndexedDB on the client.
- **Export:** WebCodecs `VideoEncoder` + `mp4-muxer`, rendering offline frame by frame from the same renderer. Fallback: `MediaRecorder` WebM.
- **Persistence:** IndexedDB (`idb-keyval` or Dexie) for frames (blobs), depth maps, shots, takes. No database, no Blob store, no Redis.
- **Experimental print:** `@gradio/client` in the browser against a public ZeroGPU Space chosen by the spike. Nothing server-side.
- **Tests:** vitest for the pure parts: move math (camera pose at time t), take variation seeding, recipe (de)serialization, shot/take rules. One Playwright smoke if time allows.

## 10. How we work

- **Evidence → decision → cut:** every call gets a line in `DECISIONS.md`.
- **Live early:** a deployed link within ~90 minutes; every slice ends deployed.
- **Order:**
  1. Capture test.
  2. Spikes (§11).
  3. Frame + depth + one move previewing live, deployed.
  4. Move library + diagrams.
  5. Takes + review + circle.
  6. Export MP4.
  7. Dailies persistence.
  8. Frame generation.
  9. Visual polish + mobile.
  10. QA.
  11. README + walkthrough.
  
  Experimental print slots after export if its spike passed. No new features in the last 3 hours.
- **Capture:** the build runs in sessions where the `.agent-logs/` hooks fire; logs are committed with the code they produced.
- **QA:** the prior plan's runbook, adapted to this architecture: CORE (frame → take → export plays outside the page), STATE (refresh mid-shot, failed frame generation, failed print), INPUT, UX (390/1440, keyboard), PUBLIC (fresh signed-out browser), REPO, SECRET.
- **Walkthrough:** the prior plan's 4:30 storyboard. Research screenshots → "a camera move on Higgsfield is a hopeful prompt" → live demo of a real move, takes, circle, export → honest limits → what's cut.

## 11. Spikes (≤ 45 min total, before UI work)

1. **Depth in the browser:** Depth Anything V2 small via transformers.js on WebGPU and WASM. Measure the download size and time per frame at 768px.
2. **2.5D quality:** push-in, orbit and dolly zoom on 3 frames (portrait, landscape, product). Set default strength caps where edges stay clean.
3. **MP4 export:** WebCodecs + mp4-muxer at 1080p, 5s, 30fps in Chrome and Safari. Measure encode time.
4. **Pollinations from a Vercel function:** latency, rate limits, image size options.
5. **Experimental print:** find a public ZeroGPU image-to-video Space reachable via `@gradio/client` anonymously from the browser. Measure queue + run time once. If it doesn't work within 15 minutes, cut it and record why.

## 12. Left to the builder

- Component structure, file layout, exact copy beyond the examples.
- The specific fonts within the direction.
- The exact shader/mesh approach and the per-move parameter ranges, within the strength-cap rule.
