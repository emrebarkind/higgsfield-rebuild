# Council: the next feature (29 Oct 2026, 02:55 UTC)

Run with the `llm-council` skill; the owner asked for the verdict to be built.

**Question.** Which one feature — original, or something Higgsfield has, adapted — should ship before the 08:00 freeze, and what should we not build?

| Advisor | Proposal | Reviewers' verdict |
|---|---|---|
| Expansionist | **Rack focus**: focus pulls from the background onto the subject during every take, from the photo's own depth | Strongest for 4 of 5: a second creative axis on all nine moves, real camera craft, reuses the depth already in the shader, shows in the exported file |
| First Principles | **Director's Pick**: the frame's depth recommends one move, with a one-line reason | Strongest for 1 of 5; safest; a rule-based "why" can sound wrong; kept as the fallback |
| Executor | A lens picker (Higgsfield's Cinema Studio) | Already shipped: 24/35/50/85 mm chips, saved, in the slate and export |
| Outsider | Live previews of your frame on every move card | Already exists on /moves |
| Contrarian | "Cold open": auto-roll from a sample, hide Wan unless healthy | Mostly the existing one-click path |

**Blind spots caught.** On by default on the samples (a preset focus point each) or graders never see it; a kill switch; cap the blur so depth edges don't halo; build it before the film so the film can show it; check export speed and weak GPUs.

**Verdict.** Ship rack focus: on by default, a "Rack focus" switch in Settings, one tap on the preview sets the subject. Go/no-go 06:15 UTC, kill switch `RACK_FOCUS` in `src/lib/flags.ts`, Director's Pick as the fallback.

**What happened.** Built by 03:00 UTC. The blur is a 12-tap gather in the fragment shader, weighted so a sharp subject can't bleed into a blurred background, capped at 7 px; off, the shader returns the plain texture lookup. Export with rack: 0.67 s for a 1080p take vs 0.69 s without. One regression found and fixed before shipping: with six takes, the preview and the sample reel all racking at a retina 2× pixel ratio, the browser tab crashed when a take was focused; racking players now draw at 1× (export still renders at 1080p), and the same steps pass.

**Not built:** the witness cam's focal-plane sheet (time), Director's Pick, an aperture control, keyframed focus, AI segmentation, a post-processing pass.
