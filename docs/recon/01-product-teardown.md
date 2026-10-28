# 01 · Product teardown — higgsfield.ai, 28 Oct 2026 (logged out)

## Surface map
Self-described "AI-native creative suite". The top nav scrolls sideways with ~24 items: Explore, Image, Video, Audio, MCP, API, Genjutsu, Content Factory, Playable, AI Influencer, Academy, Katana, ChatGPT Plugin, Ads Studio, Effects, Cinema Studio, Contests, Marketing Studio, Supercomputer, Edit, Community, Plugins, Canvas, Originals. A "Pricing 30% OFF" pill is always visible.

- **Image** (`/ai/image`): one prompt bar for text-to-image and edits. Own models Soul 2.0 / Soul Cinema; third-party GPT Image, Nano Banana, Seedream, FLUX, Ideogram, Recraft, Grok Imagine, Wan… Face Swap, Character Swap, Multi Reference live in the same picker.
- **Video** (`/ai/video`): tabs Create / Edit / Motion Control. Default model Seedance 2.5; also Kling 4.0/3.0, Wan 3.0, MiniMax H3, Veo 3.1, Hailuo, Grok Imagine, and their own **Higgsfield DoP** (the camera/effect preset model).
- **Presets / Effects**: "250+ presets for camera control, framing and VFX" (Crash Zoom, Earth Zoom Out, FPV Drone, Dolly Zoom, Bullet Time…), plus 40+ one-click Apps.
- **Genjutsu** (Sep 2026): video-to-video motion transfer / object swap. Heavily promoted.
- **Cinema Studio 4.0** (`/generate`): separate app shell; pickers for camera/lens, colour palette, lighting; up to 50 references; @characters.
- **Characters**: Soul ID trains a character from photos; "Elements" are @-referenced assets.
- **Popcorn** (storyboard sets): still live, buried in the footer.
- **Edit / Upscale / Audio / Lipsync / Ads Studio / Content Factory / Playable / Supercomputer (LLM agent) / Canvas / MCP / CLI / API / plugins / Community** — all present.

## Core loop
- Landing is an "Explore" billboard (launch carousel, model tiles, community projects), not a prompt box. Workspaces are usable logged-out.
- Video workspace: left rail (preset card → references → prompt with @Elements → model → duration/aspect/quality) and a lime **Generate** button that shows the cost (e.g. "✦80"). Right pane: History. Empty state: "Add image → Choose preset → Get video".
- Preset picker: full-pane grid of looping video thumbnails, model tabs, search, category chips (Trending, Effects, Basic Camera Control, Epic Camera Control, Mix).
- Model dropdown: searchable, badges for resolution and duration range.
- UNVERIFIED (needs login): progress display, logged-out Generate gate, how History resolves. Changelog mentions "Cancel queued generations" and "Usage History".

## Monetization
| Plan | Price | Credits / month |
|---|---|---|
| Free | €0 | 0 credits, 1 concurrent job |
| Starter | €19/mo annual | 270, limited models |
| Plus | €47 annual / €59 monthly | 1,200, all models |
| Ultra | €99 annual / €129 monthly | 3,000+ |

- Example costs: Nano Banana Pro 2 credits; Kling 3.0 ~7–8 per 5s; Veo 3.1 ~40 per 4s; Seedance 2.0 1080p ~60 per 5s.
- "Unlimited" applies to some models for limited windows, web only, in a slower shared queue.
- Cost is shown on the Generate button. Marketing math is inconsistent (plan card vs. button cost).
- Promo pressure: discount banner, popups, plan-picker quiz.

## Differentiator vs. commodity
- **Magic moment:** "one click to cinematic" — your image + a curated, previewable camera/VFX move → a polished clip. Genjutsu, Motion Control, Katana and "Recreate" are the same reference-to-recast idea.
- **Moat:** curation (presets), reusable characters, remixable community, shipping new models fast.
- **Commodity:** the model catalog, upscaling, face swap, TTS, LLM chat.

## 2026 timeline (changelog / press)
Feb Kling 3.0, Soul 2.0, Elements · Apr Seedance 2.0, Marketing Studio, MCP, Canvas · May Supercomputer · Aug Seedance 2.5, Cinema Studio 4.0 · Sep Genjutsu, public API · Oct AI Influencer rebuild, Katana, Community relaunch, Kling 4.0, Content Factory, Playable. Press (unaudited): $5.4B valuation, >$1B run-rate.

## Must nail / should skip (researcher's view)
- Nail: image + preset → video; a visual preset browser; jobs appear instantly and resolve in place; live cost on the button; reuse/recreate.
- Skip: Supercomputer/MCP/plugins; the 30-model catalog; plans/discounts; social layer; vertical studios.

Sources: higgsfield.ai (/, /ai/video, /ai/image, /pricing, /community, /generate, /genjutsu, /supercomputer, /popcorn, /apps, /creator-hub/changelog), trustpilot.com/review/higgsfield.ai, thenextweb.com, dealroom.co, creatify.ai pricing explainer.
