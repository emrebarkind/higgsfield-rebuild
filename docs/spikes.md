# Spikes (Task 2)

Run 28 Oct 2026, ~13:10–13:35 UTC, on the owner's Mac (Apple Silicon) in the Claude desktop app's built-in browser (Chromium, WebGPU available). Throwaway pages lived under `app/spike/*` and were deleted at the end.

## 1. Depth in the browser — PASS

`onnx-community/depth-anything-v2-small` through `@huggingface/transformers` 4.3, in a module Web Worker, on a 768 px wide landscape frame (output 768×439).

| Device | dtype | Download | Per frame (3 runs) |
|---|---|---|---|
| WebGPU | fp16 | 49.6 MB (`onnx/model_fp16.onnx`) | 219 ms (first), 118, 125 ms |
| WASM | q8 | 27.3 MB (`onnx/model_quantized.onnx`) | 5339, 5256, 5201 ms |

- Use: `device: 'webgpu', dtype: 'fp16'`; fallback `device: 'wasm', dtype: 'q8'`.
- Raw output is relative inverse depth (0 … ~5.7 on this frame, higher = nearer); normalize per frame to 0..1.
- WASM is ~40× slower. The UI must say once that depth is slower in this browser (spec §7 errors table).
- Model files are cached by the browser after the first load (second load: ~0.4 s).

## 2. 2.5D quality — PASS, caps below

Scene as the plan's convention: plane height 2, 6% overscan, 256×256 segments, vertices pushed back along the base camera's rays by `(1 − depth) × DEPTH_SCALE` (near stays on z = 0, so t = 0 looks exactly like the image). Base lens 35 mm (vertical FOV from a 24 mm sensor height). Background magenta; a "revealed edge" is any magenta pixel at t = 1.

Move geometry at strength `s` (Task 3 must use the same mapping, or the caps lose their meaning):

| Move | At t = 1 |
|---|---|
| push-in | camera z = d · (1 − 0.45 s) |
| orbit | arc of 14° · s around the focus point at z = −0.5 · DEPTH_SCALE |
| dolly-zoom | camera z = d · (1 − 0.5 s), FOV widened so the plane height stays framed |
| pan | yaw 10° · s about the camera, with a compensating zoom-in of (1 + 0.5 s) |
| crane-up | camera y = 0.4 s, looking at the focus point |

Revealed-edge share (% of pixels) at `DEPTH_SCALE = 0.6`, strengths 0.1 … 1.0:

| Move | Landscape (16:9) | Portrait (9:16) | Product (1:1) | Clean up to |
|---|---|---|---|---|
| push-in | 0 everywhere | 0 everywhere | 0 everywhere | 1.0 |
| orbit | first > 0 at 0.5 | first > 0 at 0.8 | first > 0 at 0.6 | **0.4** |
| dolly-zoom | first > 0 at 0.7 | first > 0 at 0.7 | first > 0 at 0.7 | **0.6** |
| pan (no zoom) | first > 0 at 0.3 | first > 0 at 0.2 | first > 0 at 0.2 | 0.1 |
| pan (+ zoom) | 0 everywhere | first > 0 at 0.3 | first > 0 at 0.5 | **0.2** |
| crane-up | 0 everywhere | 0 everywhere | 0 everywhere | 1.0 |

Resulting values for Task 3:

```ts
export const DEPTH_SCALE = 0.6;
export const STRENGTH_CAPS = {
  static: 1, 'push-in': 1, 'pull-back': 1, 'pan-left': 0.2, 'pan-right': 0.2,
  orbit: 0.4, 'crane-up': 1, 'dolly-zoom': 0.6, 'crash-zoom': 1,
};
```

- `pull-back` uses the push-in path reversed, so it has the push-in cap. `crash-zoom` only narrows the FOV and cannot reveal an edge. `static` moves only by handheld noise (≤ 0.01 units).
- Pan is limited by narrow frames: a 9:16 portrait reveals the edge first. The cap is set by the worst frame. Making the cap depend on the frame's aspect is a possible later improvement, not P0.
- Not measured: stretching, the "rubber" look on depth edges. Push-in and crane-up stay clean of reveals at 1.0 but stretch visibly on the portrait at 1.0. The defaults in `MOVES` should sit at about 60% of each cap.

## 3. MP4 export — PASS in Chromium, Safari not run

5 s, 1920×1080, 30 fps `OffscreenCanvas` (2D) → `VideoEncoder` (`avc1.640028`, 8 Mbit/s, keyframe every 60) → `mp4-muxer` 5.2 (`fastStart: 'in-memory'`).

- `isConfigSupported`: true. Encode of 150 frames: 1325 ms, 1341 ms (two runs).
- `ffprobe`: h264, 1920×1080, 30/1, 150 frames, 5.000 s. `ffmpeg -f null` decodes it with no errors. AVFoundation (QuickTime's engine) reports `isPlayable = true`, duration 5.0 s.
- **Safari: not run.** There is no Safari driver in this session. The QA in Task 13 covers Safari by hand; if Safari's `VideoEncoder` refuses `avc1.640028`, the export falls back to WebM.
- Real exports draw a WebGL scene per frame, so they will be slower than this 2D canvas. Progress is counted in frames.

## 4. Pollinations — keyless only from the visitor's browser

- **Keyless limit:** "1 image every 45 seconds per IP" (402 `FREE_LIMIT`). When busy, the server returns 503 `SERVICE_UNAVAILABLE`: "The Classic API is at its limit right now. Retry after 10s".
- **From a Vercel function** (preview deploy, egress IP 3.93.216.232): 6 calls → 0 succeeded (four 402 `FREE_LIMIT`, two 503). Vercel's egress IPs are shared with other projects, so the per-IP limit is effectively used up. 5 rapid calls in one request → one 503, the rest 402.
- **From a residential IP** (this Mac): 200 in 4.4–6.0 s, 43–87 KB JPEG at 1344×768 / 768×1344 / 1024×1024. A second call within 45 s → 402/503.
- **CORS:** `access-control-allow-origin: *`, so the browser can call it directly and read the bytes into a Blob.
- **The newer endpoint `gen.pollinations.ai`** answers 401 "A valid API key is required" for every model, even the ones listed as not paid-only. Keys need an account, and the plan rules out keys.
- **Consequence:** frame generation calls `image.pollinations.ai` from the visitor's browser (their own IP, their own 45 s budget), not through `/api/frame`. See the ruling in `DECISIONS.md`.

## 5. Experimental print — PASS (one run)

- Space: **`zerogpu-aoti/wan2-2-fp8da-aoti-faster`** (Wan 2.2 image-to-video, ZeroGPU A10G, RUNNING). Endpoint `/generate_video` with `input_image`, `prompt`, `steps`, `negative_prompt`, `duration_seconds`, `guidance_scale`, `guidance_scale_2`, `seed`, `randomize_seed`.
- `@gradio/client` 1.19.1, anonymous (no HF token), from Node on this Mac: connected in 0.9 s; queue position 0 of 1, Space ETA 53 s; result MP4 URL after **22.4 s** total (3 s clip, 4 steps).
- Status events carry `position`, `size` and `eta` while queued, then plain `pending` while running. That is enough for the "queued, position n" UI.
- Other live ZeroGPU candidates: `Lightricks/ltx-video-distilled` (`/image_to_video`), `multimodalart/wan2-1-fast`. Not timed.
- CORS: the Space reflects the browser origin (`access-control-allow-origin: https://higgsfield-rebuild-cyan.vercel.app`, credentials allowed), and the `queue/join` preflight passes. A full run from a real browser page is still unproven; Task 11 tries it first and cuts the feature if it fails.
- Anonymous ZeroGPU quota per IP is small. A visitor may get a single print, or none; the UI says so.

## Addendum (Task 10, 13:50 UTC) — Pollinations from a real browser page

- A real `fetch` from the app page (Chromium, `http://localhost:3000`) to `image.pollinations.ai` answers **403 `{"error":"Missing Turnstile token"}`**, with or without `referrer=`. The CORS check in §4 used curl with an `Origin` header, which is not what a browser sends. Pollinations gates browser traffic behind Cloudflare Turnstile; that is a bot check, so Dailies does not try to get around it.
- With the server path already ruled out (§4), frame generation moves to **FLUX.1 [schnell] on Hugging Face ZeroGPU** via `@gradio/client` in the browser: connect 1.1 s, a 1344×768 frame in 5.0 s, result readable with CORS, `events: ['data','status']` needed to see queue position and errors.
- Anonymous ZeroGPU quota: each call requests 90 s of GPU; after two frames from one IP the Space answered "You have exceeded your ZeroGPU quota (90s requested vs. 0s left)". The quota is per IP and shared by every ZeroGPU Space, including the one Task 11 would use.
