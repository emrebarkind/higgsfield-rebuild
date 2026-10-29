# Product film brief: Dailies, 30 s (adapted 29 Oct 2026)

Adapted from a motion-design brief written for another product (Klinia); its structure (opening, two product scenes linked by one continuous visual element, an explicit human action, a held logo close) is kept, its subject replaced by Dailies. Nothing below claims a capability Dailies doesn't have.

**Implementation.** The film is not a screen recording or a mock: it's drawn by `src/film/` on a 2D canvas, and every shot of the camera moving is rendered by Dailies' own `createScene` (the same 2.5D renderer as the app) and the witness cam, then encoded to MP4 in the browser with WebCodecs, like a take export. Open `/film` to play it, scrub it, or render the MP4. Colours, copy and timings live in one file, `src/film/config.ts`.

**Story.** Dailies turns a still image into real camera moves: a depth model in the browser, a 2.5D scene, nine moves. You roll three takes, circle one and export an MP4. The witness cam shows the camera itself.

**Names used.** Dailies, Studio, Takes, Witness cam. No invented features, statistics or integrations.

**Art direction.** The product's own identity: white, black ink, lime for "go", purple for "chosen", players dark like monitors. Archivo Narrow for display, Geist for text, JetBrains Mono for slates. Real product details (the sample frame, its depth map, the move chips, the slate text, the export readout), no stock imagery, no gradients, no particles.

| Time | Scene | On screen |
|---|---|---|
| 0–4 s | Opening | "A still. A real camera." in kinetic type; a lime line draws beneath it: the camera path, the connecting element |
| 4–12 s | Studio | Label "Studio", "Your photo. A real camera move." A frame lands in the monitor, its depth map sweeps across ("Reading depth · in your browser"), the "Push in" chip is chosen, the lime line becomes the move's progress, and the real camera pushes in |
| 12–17 s | Takes | Label "Takes", "Roll three. Keep one." The monitor becomes take 2; Roll 3 takes is pressed; takes 1 and 3 arrive; take 2 is circled in purple; the others step back |
| 17–23 s | Witness cam | Label "Witness cam", "See the camera, not just the shot." The circled take grows; beside it the witness cam: the photo as points, the camera as a lime frustum flying its path. The explicit action: Roll → Circle → Export, then "Export MP4 · 1080p" renders 141 / 141 frames |
| 23–30 s | Closing | The shot and its witness cam settle into one composition, then the wordmark: "DAILIES", "A real camera for your still images.", "Free · in your browser · no credits". Held still for 3 s |

**Delivery.** 16:9, 1920×1080, 30 fps, 30 s, silent, English on-screen copy. `docs/film/dailies-30s.mp4` is the rendered file.
