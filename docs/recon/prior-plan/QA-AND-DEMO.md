# QA and submission runbook

All checks below are pending until run against the implementation. This is a test plan, not a pass report.

## Release acceptance

| ID | Test | Expected proof |
| --- | --- | --- |
| CAP-1 | Canary in a new assignment session | Exact prompt and final reply captured automatically with timestamp/model |
| CAP-2 | Canary in a second independent session | Same persistent mechanism works; both entries referenced by CAPTURE-TEST.md |
| CORE-1 | Upload authorized JPG/PNG and generate | Actual provider request and playable output |
| CORE-2 | Download completed output | Local media opens and corresponds to that generation |
| CORE-3 | Switch a preset | Visible prompt/settings change; request uses selected intention |
| CORE-4 | Make a variation | Original retained, new draft prefilled, new job only after submit |
| STATE-1 | Double-click Generate / repeat same request | One job and one usage reservation |
| STATE-2 | Refresh while queued/running | Same job id and recoverable state |
| STATE-3 | Provider/network failure | Honest error; inputs saved; no silent paid resubmit |
| STATE-4 | Completion arrives twice | One result and one settled usage record |
| STATE-5 | Poll fails temporarily | Reconnecting/unknown status, not fake failed or completed |
| DATA-1 | Return to My creations | Persisted history and immutable prompt/settings |
| DATA-2 | Request another user's generation id | Access denied; storage also protected |
| INPUT-1 | Invalid type, oversized file, empty prompt | Inline errors, no provider call |
| BUDGET-1 | Exhaust quota / send rapid requests | Server rejects before provider submit |
| UX-1 | 390px and 1440px viewport | No clipped controls or CTA covering input |
| UX-2 | Keyboard-only editor/preset/dialog | Focus visible, labels usable, dialog exit works |
| PUBLIC-1 | Fresh signed-out browser | Public URL and sample open without owner's session |
| REPO-1 | Public repository inspection | README, reproducible setup, .agent-logs/ and CAPTURE-TEST.md visible |
| SECRET-1 | Inspect code, git history and agent prompts | No private keys, tokens, personal screenshots or env values |
| VIDEO-1 | Watch exported recording | Camera visible, under 5:00, links correct |

Automated tests should target real failure risks: duplicate submit, illegal transitions, ownership and provider-error recovery. Use a clearly named test adapter to deterministically cover network/provider failures; this is not evidence of real inference. A real integration smoke must be recorded separately. Run tests once per relevant change, then focus on shipping.

## Production smoke evidence template

- Date / UTC:
- Commit / deployment:
- Browser/session:
- Authorized input asset:
- Provider / model / settings:
- Job id (not credential):
- Start / result timestamps:
- Output downloaded and played:
- Refresh test:
- Actual cost or provider quote:
- Limitations:

## README content for the public repository

Lead with the actual working capability and live link. Include a screenshot of our product, a 60-second try-it path, local setup with .env.example names only, architecture, genuine tradeoffs, test commands and results, sample/live distinction, research coverage limitations and capture evidence. Do not describe planned features as shipped. Link the original assignment/reference product and explain that this is an independent rebuild.

## Walkthrough storyboard — target 4:30

| Time | Show | Explain in plain English |
| --- | --- | --- |
| 0:00–0:25 | Camera and product | Who it helps and the single task it solves |
| 0:25–0:55 | Two research screenshots | What you observed and the decision it caused |
| 0:55–1:45 | Create workflow | Image, preset, editable prompt, supported settings, visible cost |
| 1:45–2:20 | Actual job lifecycle | Queued/running state; refresh preserves the same job |
| 2:20–2:55 | Real completed result | Play, download and reuse settings; distinguish an earlier completed job if used |
| 2:55–3:30 | Failure/recovery and mobile | Saved inputs, useful feedback and accessible controls |
| 3:30–4:05 | Repo, capture and test evidence | How you directed AI, verified output and corrected mistakes |
| 4:05–4:30 | Tradeoffs | What was deliberately omitted and what you would validate next |

Do not spend the video watching a long provider queue. Submit a new real job to show the lifecycle, then open an earlier completed job explicitly described as earlier. Only show a completed current job if it actually finished. Keep the camera overlay visible without covering controls. Show facts, not claims such as “production ready” or “better than Higgsfield” without evidence.

### Suggested opening — adapt to shipped reality

“I focused on one job: helping someone turn an image into a short video without needing to understand a long list of models. I explored Higgsfield's creation flows, then built a smaller workflow with clear settings, visible generation status and reusable results.”

Use this only after the described capabilities actually work. Do not claim to have explored every original flow until the coverage register is complete.

## Final submission fields

Links field:

Live product: [actual public deployed URL]

Public repository: [actual public repository URL]

Walkthrough field:

[actual recording URL; under five minutes; camera on]

The labels above are templates, not completed links. Verify links in a fresh browser before submission. The brief in this conversation requests the walkthrough; check the live form for any separate introductory-video field rather than assuming it is absent.

## Submission blockers

Do not send a localhost URL, private repository, broken demo, fake capture evidence or a recording of only a landing page. If an external dependency is still blocked, document it honestly. Never retrofit polished logs as if they were automatic records.
