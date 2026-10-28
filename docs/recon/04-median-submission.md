# 04 · The median rebuild (what to avoid)

Sampled ~40 public repos pushed Jul–Oct 2026 that rebuild Higgsfield, many of them for this same take-home, plus the large open-source references (Open-Generative-AI, open-higgsfield, fal video-starter-kit, blinkshot). Individual candidate repos are deliberately not named here.

## The typical submission
- **Stack:** Next.js App Router, React 19, Tailwind v4, lucide, shadcn; Supabase or Neon; Vercel.
- **Generation:** fal.ai (Flux, Seedance, Kling), keyless endpoints, or bring-your-own-key; roughly half fall back to a mock provider.
- **Access:** credit ledgers with refund-on-failure (~10/40), guest/demo modes (~11/40), pricing pages without payments (~22/40).
- **Process:** `.agent-logs/` (required), AGENTS/CLAUDE.md, spec/audit docs — table stakes, not differentiators.
- **Layout:** top nav copied from Higgsfield (Explore · Image · Video · Cinema Studio · Pricing); studio = left rail + results grid + docked composer + lightbox.

## Five clichés
1. Near-black background with Higgsfield's lime accent, Geist/Inter, lime pill CTAs.
2. Centered hero headline with the second half in the accent colour, "No sign-up, no card" underneath.
3. A chip row (Model ▾ · 16:9 · 5s · 1080p) beside "Generate · 5 credits", skeleton tiles, a lightbox with Copy prompt / Reuse / Download.
4. Higgsfield's information architecture copied as-is; camera moves as a flat list of names or a CSS Ken Burns pan.
5. The "what's real vs. UI-only" README table — once distinctive, now standard. Prompt lineage/forking and a light editorial look are also already taken.

## Openings nobody has taken
- Treat the **camera move** as the primary object, shown as a motion diagram, not a name.
- Add the **review** step (dailies: side-by-side takes, keep/reject, print the keeper). None of the 40 do review.
- A visual language that isn't black + lime: an edit-bay / film-leader look, timecode mono, one tally-red accent.
- Film-set language instead of SaaS language ("Roll", "Take 3", "Print").

Sources: github.com/search?q=higgsfield+clone; Anil-matcha/Open-Generative-AI; wide-trace/open-higgsfield; fal-ai-community/video-starter-kit; Nutlope/blinkshot.
