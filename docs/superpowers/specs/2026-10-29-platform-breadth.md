# Dailies — platform breadth (29 Oct 2026, 02:20 UTC)

**Why.** Emre's read after the signed-in screens: next to Higgsfield's ~18 sections, three pages make Dailies look unfinished to a first-time reviewer. He chose *Higgsfield's breadth in Dailies' own identity* over a 1:1 visual copy, which the brief forbids. Every new page must work for real and cost nothing; nothing is a mock.

**Goals**
- A reviewer who clicks around finds a platform: a home to explore, a page per job, pricing, a footer. Same job split as Higgsfield (Explore · Image · Video · presets · history · pricing), with Dailies' names and look.
- No regressions to the recorded path: the Studio stays at `/`, a sample still moves on first load, the walkthrough stays true.

**Pages**
| Route | Higgsfield counterpart | What it does |
|---|---|---|
| `/explore` | Explore | Hero with a live 2.5D player, links to Studio and Frames; one card per tool; "Add a frame → Choose a move → Get an MP4"; the nine move diagrams; the free-vs-✦80 comparison |
| `/` (Studio) | Video → Create | Unchanged |
| `/frames` | Image | Prompt bar pinned to the bottom (aspect, Generate · Free), results grid for this visit, "Shoot this frame" into the Studio, download; the samples when empty; honest quota errors with upload/sample ways out |
| `/moves` | Camera-control presets | Unchanged cards, plus category chips (All, In & out, Sideways, Up, Still) |
| `/dailies` | History / Assets | Unchanged |
| `/pricing` | Pricing | One plan, €0, no credits; why it can be free; what a credit buys elsewhere (from the signed-in screens) |

Nav: Explore · Studio · Frames · Moves · Dailies, and a "Pricing · Free" pill where Higgsfield puts "55% OFF". The nav scrolls sideways on phones. A footer on every page: product links, how it was made (README, decisions, agent logs, research), "Not affiliated with Higgsfield".

**Anti-goals.** No Higgsfield logo, name-as-brand, images or copy; no black-and-lime; no credits, counters, countdowns, paywalls, accounts or fake generations.

**Builder's calls.** Generated frames live in memory for the visit (they're saved to IndexedDB once shot in the Studio). The frame-generation rate limit and error wording are shared between the Studio and `/frames`.
