# 05 · Logged-in addendum — 29 Oct 2026, after the build

**When and how.** Added at 01:45 UTC on 29 Oct, about 14 hours into the 24, after Dailies was built and deployed. It is not part of the research that shaped the product, and it isn't presented as if it were. Emre signed in to a free Higgsfield account, paid nothing and took six screenshots (`recon/screens/17`–`22`). The account avatar and a personal promo code are covered in the copies. As far as the screenshots show, one Generate press hit the paywall and no generation finished.

**Why.** The brief asks to sign up and use every flow end to end. Reports 01–04 were done logged out, and 01 marked the post-login states UNVERIFIED.

## What the screens show

| # | Screen | What it shows |
|---|---|---|
| 17 | Explore, signed in | The promo bar has a countdown ("Discount expires in 02h 37m"). Below it: the launch carousel (Genjutsu Lite, Playable, Content Factory, Kling 4.0) and a second countdown on an "Unlimited Seedance 2.5 for 30 days" banner. The top nav still overflows sideways (about 18 items in view, then cut off). |
| 18 | Image | "Start creating with Higgsfield Soul Cinema". Prompt bar: GPT Image 2 · Auto · High · 2K · 1/4. The Generate button shows its cost, ~~8.5~~ 6.5 credits. An Academy nudge sits at the top. |
| 19 | Generate on GPT Image 2, free account | A full-screen **"Unlock GPT Image 2.0"** modal: Starter or higher needed. A personal 55% promo is already applied, with a third countdown (02:37:10). Annual prices: Starter €19 / 270 credits, Plus ~~€59~~ €35 / 1,200, Ultra ~~€129~~ €70 / 3,000. Free generations per plan are listed (Genjutsu Lite, AI Influencer, Ads Studio). |
| 20 | Video → Create Video | The left rail matches report 01: the preset card "General · Seedance 2.5", References, Prompt, Model, Duration 5 s, Aspect 16:9, Quality 1080p, Bitrate High, then **Generate ✦80**. The right pane has History and "How it works": "250+ presets for camera control, framing, and high-quality VFX", then Add image → Choose preset → Get video. |
| 21 | MCP | "Generate images & videos in ChatGPT with Higgsfield", with tabs for ChatGPT, Claude, Claude Code, Telegram and CLI, and an MCP endpoint. |
| 22 | AI Influencer | A character builder (type, gender, build, hairstyle…) with a **"Use free gens · 5 left"** toggle and Generate ✦1.125. |

## What it confirms

- **A camera move is a preset handed to a generative model.** Screen 20 calls camera control one of "250+ presets", next to VFX. The move is picked as a preset card, then the clip is generated for 80 credits. This is the premise Dailies is built on: there the move is geometry you see before anything renders.
- **Cost is shown, but the maths doesn't add up.** Plus says 1,200 credits ≈ "80 Seedance 2.5 videos". At the video page's default settings (5 s, 1080p, High bitrate) the button costs ✦80 a clip, so 1,200 credits buy 15. Report 01 flagged this mismatch logged out. Logged in, the numbers sit one click apart.

## What is new

- **The gate comes after the effort.** On a free account you write a prompt, pick settings and press Generate before you learn the model needs a plan (18 → 19). Dailies has no gate: the camera, takes and MP4 export need no account, and only two optional buttons send anything out.
- **Urgency is everywhere.** The same countdown appears in the promo bar, on a banner CTA and inside the paywall. Discounts are shown as struck-through prices with a personal promo already applied.
- **Free usage is per tool.** "Use free gens · 5 left" on AI Influencer, plus the free-generation lists on the plan cards. None of the six screens shows free credit for the image or video models themselves.
- **Agents are a channel now.** MCP for ChatGPT, Claude, Claude Code and Telegram has its own top-nav item.

## What it changes for Dailies

Scope stays the same. The screens back the two bets in [DECISIONS.md](../../DECISIONS.md): the camera should be exact and visible before you commit, and trying should cost nothing. Pricing and copy stay as they are; Dailies has no credits to explain.

## Still unverified

Generation progress and queue display, a finished result, a populated History, cancel, and what a free account actually gets for video. Running one of those would have meant spending the account's free generations or paying, so it wasn't done.
