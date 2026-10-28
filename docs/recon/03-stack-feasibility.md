# 03 · Stack and generation feasibility

## Recommendation
- Next.js 16 (App Router) on Vercel, Node 24, AI SDK 7.
- **All generation through Vercel AI Gateway**: one credential (OIDC on Vercel), async video jobs, spend budgets.
- Stills: `bfl/flux-3-image-klein` ($0.009/image, ~1–5s). HQ option: `google/gemini-3.1-flash-image`.
- Draft clips: `bytedance/seedance-v1.0-pro-fast` at 480p ($0.0097/s → ~$0.05 per 5s). Alt: `spacexai/grok-imagine-video-1.5-lite` ($0.02/s at 480p).
- Final clips: `klingai/kling-v2.5-turbo-i2v` std ($0.042/s → $0.21 per 5s); Kling exposes `cameraControl` (simple mode: horizontal/vertical/pan/tilt/roll/zoom ±10) — docs show it on v3.0, smoke-test on 2.5 Turbo.
- Camera presets = prompt templates (+ Kling `cameraControl` where it maps).
- Media in Vercel Blob (provider URLs expire); jobs, history, quotas in Redis (Upstash via Marketplace). No Postgres needed.
- Fallback provider: fal.ai.

## Prices (verified against ai-gateway.vercel.sh/v1/models, 28 Oct 2026)
| Model | Use | Price |
|---|---|---|
| bfl/flux-3-image-klein | still | $0.009 / image |
| google/gemini-3.1-flash-image | HQ still | from $0.045 / image |
| bytedance/seedance-v1.0-pro-fast | draft clip | $0.0097/s 480p, $0.0206/s 720p |
| spacexai/grok-imagine-video-1.5-lite | draft clip | $0.02/s 480p, $0.03/s 720p |
| klingai/kling-v2.5-turbo-i2v | final clip | $0.042/s std, $0.07/s pro |
| google/veo-3.1-lite-generate-001 | final clip | $0.03/s 720p |
| klingai/kling-v3.0-i2v | premium | $0.168/s std |

Latency (unverified medians): stills 1–20s; 5s 720p clips ~30–90s; Seedance 2.x / 1080p 2.5–4 min.

## Public-demo economics
Visitor identity = signed httpOnly cookie + IP. Per generate request: BotID check → per-visitor and per-IP daily quotas → one active job per visitor → global daily spend counter in Redis → refund quota on failure. Backstops: Gateway budget, one Firewall rate-limit rule on `/api/generate*`. Pre-generated showcase clip per camera move costs nothing to serve.

## Backend notes
- Always copy results to Blob. Uploads via Blob client upload (bypasses the 4.5MB function body limit).
- Video jobs: client polls a short status route (start/status), optional signed webhook.
- Hobby Blob limits lock the store for 30 days if exceeded — watch usage while judged.

## Gotchas
- Deployment Protection: share the production domain; test in a private window.
- AI SDK 7 is ESM-only; video APIs are `experimental_`; start/status needs `ai@7.0.76+`.
- Return media URLs, never bytes (4.5MB response limit).
- Providers moderate content (Seedance rejects real-person input images); show refusals cleanly.
- Kling 2.x clips are 5s or 10s only.
- Higgsfield has had a public API since 16 Sep 2026 — deliberately not used: rebuilding Higgsfield on Higgsfield's own API would skip the exercise.

Sources: vercel.com/docs/ai-gateway (video generation, image-to-video, image generation, pricing, budgets, rate limits), vercel.com/docs/functions/limitations, /botid, /vercel-firewall, /vercel-blob pricing, ai-sdk.dev migration guide 7.0, fal.ai llms.txt, replicate data retention, higgsfield.ai/blog/higgsfield-api.
