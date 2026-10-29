# Recon — before any code

Four parallel research passes, run on 28 Oct 2026 before a line of product code was written.
Each file is the condensed report; sources are listed in each.

| File | Question it answers |
|---|---|
| [01-product-teardown.md](01-product-teardown.md) | What is higgsfield.ai today, and what is its real differentiator? |
| [02-voice-of-user.md](02-voice-of-user.md) | What do real users love and hate about it? |
| [03-stack-feasibility.md](03-stack-feasibility.md) | What can we actually call for real generation, at what cost and speed? |
| [04-median-submission.md](04-median-submission.md) | What does the typical rebuild look like, so we can avoid it? |
| [05-logged-in-addendum.md](05-logged-in-addendum.md) | *Added 29 Oct, after the build:* what a free signed-in account shows (gate, credits, presets) |

## What the four reports say together

1. **Higgsfield's moat is curation of camera motion, not models.** Image + a previewable camera move → a cinematic clip is the magic moment. The 30+ model catalog is commodity.
2. **The product has sprawled.** ~24 top-nav items (Supercomputer, Playable, Content Factory, Katana…). A 24h rebuild that copies the information architecture copies the sprawl.
3. **The pain is economic, not visual.** The top complaints are opaque per-generation cost, "unlimited" plans that throttle, slow or stuck queues, and paying full price for takes you throw away.
4. **The median rebuild copies the surface.** Near-black + lime, Explore/Image/Video/Cinema Studio nav, a chip row next to "Generate · N credits", a lightbox, a credit ledger, an "honest engineering" README. Nobody builds the *review* step.
5. **Real generation is cheap enough to give away, carefully.** Through Vercel AI Gateway: a still costs ~$0.009 (FLUX 3 Klein), a 5s 480p draft clip ~$0.05 (Seedance 1.0 Pro Fast), a 5s Kling 2.5 Turbo clip ~$0.21 — one key, budgets, async video jobs.

Model IDs and prices above were re-checked against `https://ai-gateway.vercel.sh/v1/models` on 28 Oct 2026.
