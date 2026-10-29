# QA

Runbook rows from the plan (Task 13), run by hand. "Local" means `npm run dev` on the owner's Mac in the Claude desktop app's built-in browser (Chromium, WebGPU). "Prod" means https://higgsfield-rebuild-cyan.vercel.app in a fresh signed-out browser.

| Row | Check | Where | Result | Notes |
|---|---|---|---|---|
| CORE | Frame → take → export; the file plays outside the page | Local | PASS | 1080p 16:9 MP4 of a 4.7 s take: ffprobe h264 High 1920×1080 30 fps, 141 frames; ffmpeg decodes clean; AVFoundation (QuickTime's engine) `isPlayable = true`. Also exported by keyboard only. WebM fallback: VP9 1080p decodes clean |
| STATE | Refresh mid-shot restores the shot and its takes | Local | PASS | Orbit shot, take 2 circled → reload → same shot, circled take, move and "Roll 3 more takes"; also after closing the tab and opening a new one |
| STATE | Failed frame generation keeps the prompt | Local | PASS | Real failures: free GPU quota used up (message + reason) and, earlier, Pollinations' 403. Prompt kept each time |
| STATE | Print failure keeps the take | Local | PASS | Real quota failure: "Community GPU is busy — your take is safe." Take untouched, no retry loop. A successful print was not re-run here (quota); see docs/spikes.md §5 |
| INPUT | HEIC is rejected with the accepted types | Local | PASS | "Use a JPG, PNG or WebP image. HEIC and other formats aren’t supported yet." Current frame kept |
| INPUT | 11 MB image is rejected with the limit and its size | Local | PASS | "That image is 11.0 MB. The limit is 10 MB." Current frame kept |
| INPUT | 5:1 panorama letterboxes, never stretches | Local | PASS | 5000×1000 PNG → downscaled to 1536×307; in 9:16 the full width shows with bars above and below. Pinned by `fitFrame`/`viewportFor` tests |
| UX | 390 px and 1440 px: no horizontal scroll, Roll never covers content | Local | PASS | 390 px: scrollWidth = clientWidth; at the page end the last control ends at 732 px, the pinned Roll bar starts at 743 px |
| UX | Keyboard only: frame → move → roll → circle → export | Local | PASS | Real key presses: Enter on a sample, Enter on Orbit, Enter on Roll, 2, C, Enter on Export → `dailies-shot01-take2-orbit.mp4`. Focus point moves with arrow keys. Focus stays on Roll after rolling |
| PUBLIC | Fresh signed-out browser on the production URL | Prod | PASS | Deploy `2f2e27b` from `main` (29 Oct, 00:45 UTC), after both review fix passes. `curl` with no cookies: `/`, `/moves`, `/dailies` and the sample JPEG + depth PNG all 200, and the page carries the new storage note. Tab with no cookies and this origin's IndexedDB deleted: sample frame moving on load with 0 model fetches; double-clicked Roll → one roll of 3 takes; circled take 2 → Export MP4, switched to take 3 mid-render and back → the export still finished: `dailies-shot01-take2-push-in.mp4`, `video/mp4`, 1920×1080, 4.73 s, 2.2 MB (read in the page, not saved to disk); reload → Shot 01 · 3 takes, take 2 circled; `/dailies` lists it with "Only two buttons send anything out…"; no console errors. Chromium only. (Earlier pass: `7b17527`, 28 Oct, 14:30 UTC) |
| REPO | `.agent-logs/` and `CAPTURE-TEST.md` present | Repo | PASS | Logs committed with each task's code. Public at https://github.com/emrebarkind/higgsfield-rebuild (`main`) |
| SECRET | `git grep -i "key\|token\|secret"` shows no values | Repo | PASS | Only words match (React `key`, "Turnstile token" in docs). Pattern scans for assigned key/token values and `hf_`/`sk-`/`ghp_`/`github_pat_`/`vercel_`/AWS/private-key patterns over the whole history before publishing: none (one false match inside a heading anchor). `.vercel/` and `.env*` are ignored. The app has no keys at all |

Not run: Safari and Firefox (no driver for them in this session). Their paths are covered by code and tests: WASM depth when WebGPU is missing (`pickDepthDevice`), WebM when H.264 encoding is missing (`pickExportPath`, and the WebM path was exercised in Chromium by hiding `VideoEncoder`).
