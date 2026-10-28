# Product reconnaissance — evidence register

Date: 28 October 2026. Method: direct interaction in Chrome, logged out. Screenshots are unmodified viewport captures. Screenshots prove visible UI states, not hidden implementation details or successful generation. No account, subscription or paid generation was created during this review.

## Evidence index

| ID | Screenshot | Route | Action and observation |
| --- | --- | --- | --- |
| 01 | 01-home.jpg | / | Opened home; dense product navigation, promotions, cookie notice |
| 02 | 02-video-genjutsu.jpg | /ai/video | Opened Video; default Genjutsu motion/reference workflow and community library |
| 03 | 03-model-picker.jpg | /ai/video | Opened Model; many model choices and capability labels |
| 04 | 04-video-settings.jpg | /ai/video, Seedance 2.5 selected | Changed model; prompt, references, duration, ratio, quality, bitrate, cost shown |
| 05 | 05-history-logged-out.jpg | same video editor | Selected History; tutorial empty content plus filter/view controls |
| 06 | 06-image-editor.jpg | /ai/image?model=gpt_image_2 | Opened image editor; composer, model, ratio, quality, resolution, batch count |
| 07 | 07-result-signup-gate.jpg | same image editor | Entered neutral coffee-cup prompt, clicked Generate; transient queue then account gate |
| 08 | 08-login.jpg | same image editor | Clicked Sign in; Google/Apple/Microsoft and email choices; no credentials entered |
| 09 | 09-pricing.jpg | /pricing | Opened public plan page; subscription and credit presentation; no checkout started |
| 10 | 10-effect-setup.jpg | /effects/use | Floating fall; character required, location/products optional, resolution/ratio/free-gen controls |
| 11 | 11-effect-catalog.jpg | /effects/use | Clicked Change; searchable visual effects catalogue |
| 12 | 12-cinema-studio.jpg | /generate | Studio home, project sidebar, film/camera/light/color controls |
| 13 | 13-camera-movements.jpg | /generate | Opened camera movement gallery; visual choices and search |
| 14 | 14-camera-applied.jpg | /generate | Selected Dolly in; token appeared in prompt; no generation submitted |
| 15 | 15-layers.jpg | /layers | Editable layers entry and empty projects; no upload performed |
| 16 | 16-community.jpg | /community | Public project/creator discovery; no like or publish action |

The neutral prompt used for step 07 was: “A ceramic coffee cup on a wooden table, soft morning window light, simple studio composition.” The preview behind the gate was inaccessible, so there is no evidence that the requested image was actually produced. Do not label this a successful generation.

## What was and was not completed

| Flow family | Coverage | Next evidence required |
| --- | --- | --- |
| Discovery / public navigation | Inspected | Optional mobile discovery review |
| Authentication / onboarding | Gate and sign-in UI inspected | User signs in; capture onboarding without personal details |
| Text-to-image | Draft and signup gate inspected | Real job, output detail, download, stored history |
| Image-to-video | Settings and model switching inspected | Upload, actual job, preview, export |
| Motion transfer / object swap | Entry inspected | Authorized sample/reference upload and result |
| Effects | Setup and preset picker inspected | Apply preset to authorized asset; result/download |
| Cinema Studio | Controls, movement picker and prompt insertion inspected | Project creation, generation, saved project |
| Layers / image editing | Entry inspected | Upload, editing controls, saved output |
| History | Logged-out state inspected | Authenticated empty/populated/pending/failed states |
| Pricing | Public page inspected | Account limit message; no purchase is needed for research |
| Community | Public entry inspected | Project detail and reuse/remix behaviour |
| Audio / Content Factory / Playable / Influencer / Katana | Navigation only | Not yet inspected |
| Ads / Marketing / Supercomputer / Canvas | Navigation only | Not yet inspected |
| API / MCP / Plugins / Academy / Contests / Originals | Navigation only | Not yet inspected; record whether relevant to consumer flow |
| Account / billing / settings | Not inspected | View-only after login; no subscription changes |

The assignment explicitly asks for every flow, end to end. This research does not yet satisfy that requirement. Do not claim full coverage. After login, map each remaining family, follow its entry-to-output path where access permits, and record gates honestly. Inspection breadth and implementation breadth are separate: it is reasonable to inspect broadly and deliberately implement a narrow, complete product.

## Remaining research script

1. Sign in using Emre's account. Observe onboarding, initial credits and limits. Keep identity/payment screenshots out of public assets.
2. Use a self-owned or newly created non-personal image; record input dimensions and size. Follow one complete image-to-video job within an explicitly agreed credit budget.
3. Capture upload preview, submitted/queued, running, result controls, downloaded file and refreshed history. Verify media plays outside the page.
4. Inspect whether a failed/blocked attempt preserves input and explains cost. Do not deliberately spend credits to manufacture failures.
5. Exercise result reuse: determine which parameters are retained. Record differences between a new job and a variation.
6. Inspect the remaining listed modules; log visited, completed or blocked separately. Never bypass a paywall or signup gate.
7. Review mobile layout and keyboard operation. This package contains desktop screenshots only.

## Interpretation boundaries

- “Model overload” is a design hypothesis based on choice density, not a usability-study conclusion.
- “Signup arrives after Generate” is directly observed; server generation behaviour remains unknown.
- Credit figures and promotions are point-in-time UI observations, not provider API pricing.
- Preset motion is a prompt instruction, not guaranteed geometric camera control.
- All media in these screenshots belongs to its respective source. Use screenshots as research evidence; create or license separate product/demo assets.

## Capture compliance status

8x requires automatic raw prompts and final responses, UTC timestamps and model identity, two-session canaries, and interleaved commits. No manual reconstruction may be passed off as this capture. The current research was performed in ChatGPT Work; exact serving-model identity and an accessible automatic transcript feed were not verified. No CAPTURE-TEST.md with a pass result exists in this package.

Checks made: current 8x setup read; official hook documentation consulted; available tool registry inspected for transcript/export/capture; accessible /root/.codex and /workspace checked for session/transcript files; codex executable checked. These checks did not establish a working mechanism for this live chat. Use a fresh verified local assignment session before product implementation and preserve this package as external preparatory research.
