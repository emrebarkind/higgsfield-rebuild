# Build brief — give to the coding agent AFTER capture passes

Do not use this as the first prompt. First paste the complete current 8x capture setup from https://8x-internal.com/p/8x-agent-capture-setup into a fresh assignment session. Set up automatic capture, run both session canaries, inspect the actual records and commit CAPTURE-TEST.md. A manual summary or an agent claiming that a script works is not evidence that automatic capture fires across sessions.

## Mission

Build Frameflow, an independent, focused reinterpretation of Higgsfield's image-to-video creation loop for an 8x Product Engineer assignment. We are judged on speed, product judgement and UX/UI. Own the full path from an image and intention to a downloadable video. Target a novice solo creator. Read README.md and docs/RECON.md before coding. Treat unverified behaviours as unknowns, not facts.

## Non-negotiable gates

1. Capture confirmed in two genuine sessions, with prompt and final response visible for both, exact model, timestamps and a persistent project mechanism. Do not fake session tests.
2. Close the authenticated product-research gaps or explicitly document blockers. Do not claim every flow was tested when it was not.
3. Prove one real image-to-video provider request, result retrieval and download before spending hours on the UI. Do not expose keys or invent a successful provider result.
4. Keep real prompts and final responses in .agent-logs/, interleaved with implementation commits. Log failures honestly. Never include reasoning, tool-call dumps or secrets.

## Implementation order

First: confirm repository instructions and available stack, credentials and cost budget. Prefer Next.js/TypeScript, Supabase and Vercel when available. Select one supported async video endpoint by a real integration spike. Record its constraints, measured latency and actual quoted cost. Do not assume the models or credit prices observed in Higgsfield are available from our provider.

Then: implement a vertical slice: image upload → editable prompt → supported settings → server validation → durable job → queued/running/result → download. Deploy this early.

Next: owner-scoped persistent history, refresh/resume, preset instructions, variation creation, failure recovery, responsive layout and keyboard support. Only add text-to-image or comparison when the core slice and production checks pass.

## Product rules

- Three navigation destinations: Create, Presets, My creations.
- One primary CTA per state. Explain any disabled CTA inline.
- Six motion presets: Static, Slow push-in, Pull-back, Pan left, Pan right, Orbit. These are prompt-based intentions unless the provider exposes exact controls. Explain this accurately; do not promise deterministic motion.
- Keep prompt, input and settings when authentication or errors interrupt the user.
- Show the generation cost/usage before submit and distinguish sample mode from live mode.
- Make the public sample project inspectable without sign-in or charges. Label all prerecorded media as samples.
- No fake progress percentages, fake ETA, fake download buttons or unrelated stock video presented as generated output.
- A new variation creates a new generation; the old result remains intact.
- Use original or licensed media. No copied marketing/video corpus.
- Remove unimplemented actions instead of shipping dead buttons.

## System constraints

Use a server-owned model allowlist and validate inputs against provider capabilities. Store immutable generation settings and provider request id. Protect create with auth/guest-isolation, rate limits, per-user quota and global budget controls. Make submit idempotent. Reconcile unknown/timeout outcomes without blind re-submission. Treat provider completion and output-file readiness separately. Persist successful output in controlled storage before declaring it downloadable.

Use private owned storage and user ownership checks on every endpoint and database policy. A public sample uses separate read-only assets. Never put provider or service-role keys in public environment variables. Restrict downloaded output fetches to trusted provider outputs, not arbitrary user URLs. Validate uploaded files server-side as well as in the browser.

Keep the system small: one app, one database/storage layer, one provider adapter. No microservice framework, full payment platform, social graph or video timeline editor.

## Working style

Before each implementation slice, state the goal and the evidence needed. After it, report what works, what was tested and what remains unknown. Commit working slices with their actual logs. Avoid broad rewrites after the first deploy. When blocked, describe the specific missing dependency and continue independent work. The product must not imply that a sample replay is a live model call.

## Ready for review

Build, typecheck and lint pass. Meaningful automated checks cover job transition/idempotency/ownership and core browser flow with test provider fixtures. At least one real production generation and download pass separately. Refresh resumes a pending job, other users' jobs remain inaccessible, network/provider failures preserve the draft, and a fresh signed-out browser can open the public URL and sample.

## Suggested next prompts — send individually, not all at once

1. “Read the research package, list unresolved assumptions and propose the smallest complete vertical slice. Do not implement until capture is verified and the research gates are addressed.”
2. “Prove one real provider request using an authorized image and the approved cost limit. Record request state, result handling and constraints. Keep credentials out of logs.”
3. “Implement upload-to-result with a durable generation record and a real download. Deploy this slice and show the production evidence.”
4. “Add history, refresh recovery, idempotent submit and ownership checks. Test failures and duplicate requests.”
5. “Add the six presets, preserve draft state, improve mobile/keyboard usability and remove unused controls.”
6. “Run the submission checklist, test signed-out access, inspect logs and help prepare a truthful walkthrough of the implemented scope.”
