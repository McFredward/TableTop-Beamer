---
status: partial
phase: 32-ssr-stream-performance-connection-stability
source: [32-VERIFICATION.md]
started: 2026-05-07T00:00:00Z
updated: 2026-05-07T00:00:00Z
---

## Current Test

[awaiting human testing — operator + Pi 4 hardware required]

## Tests

### 1. FPS lift measurable on hardware
expected: SSR fps chip shows ≥30 fps (ideally 50-60) on Nemesis Lockdown Board A after boot with `-fakescreenfps 120` Xvfb arg + Chromium VAAPI active. Compare to pre-Phase-32 baseline of ~25 fps.
result: [pending]

**How to test:**
1. `SSR_RENDER_HOST=1 SSR_PUBLISH=1 node server.mjs --host 0.0.0.0 --port 4173`
2. Open `/output/` on Pi
3. Read SSR fps from diagnostic-overlay chip (top-right)
4. Read STREAM fps via `consumer.getStats()` (devtools console)
5. Confirm ≥30; ideally ≥45 with VAAPI active
6. Check `[ssr-host] encoder=` log line shows `vaapi` (not `x264-software`)

### 2. Align-mode drag fluidity
expected: Operator perceives align-mode handle drags as "smooth" / "real-time" — no longer feels like 1+ second of input lag. Publisher align-mode boost polling loop (250ms) is wired and pushes frameRate to cap-max during drag.
result: [pending]

**How to test:**
1. Enter align-mode on `/output/` (via dashboard toggle or right-click menu)
2. Drag a corner handle continuously for ~5 seconds
3. Confirm streamed board follows handle smoothly without judder
4. Confirm SSR fps chip shows boosted rate during drag (60+ if Native), drops back to cap when idle

### 3. Cold-boot stable ×10 cycles
expected: 10/10 server-restart cycles connect cleanly within 10 seconds of Pi reload — no stuck-Reconnect, no need for second server-restart. Producer-readiness gate eliminates the storm at root.
result: [pending]

**How to test:**
1. `SSR_RENDER_HOST=1 SSR_PUBLISH=1 node server.mjs` then Ctrl+C, restart 10× in a row, with the Pi receiver page open
2. Each cycle: confirm Pi reconnects within 10s
3. Watch server stdout for `[ssr-signal] connect role=consumer` followed by stable producer-up
4. Watch Pi-side console for "PRODUCER READY" message before first consume attempt
5. Record any cycle that takes >10s or gets stuck

### 4. Pi-reload stable ×10 cycles
expected: 10/10 Pi-side page reloads (Ctrl+R / refresh) reconnect within 10s without server-restart. sessionStorage backoff state survives reload.
result: [pending]

**How to test:**
1. With server running stable, hit Ctrl+R on Pi 10× consecutively
2. Each reload: confirm Pi reconnects within 10s
3. Confirm "RECONNECTING — Xs (attempt N)" overlay appears briefly, then disappears once stable

### 5. Pi VC4 decode budget at 1080p@60fps
expected: Pi 4 VC4 H264 hardware decoder sustains 1080p@60fps without dropping frames. `videoEl.getVideoPlaybackQuality().droppedVideoFrames` stays low (<1% of totalVideoFrames) over a 5-minute steady-state window.
result: [pending]

**How to test:**
1. Set Stream FPS Cap = 60 in System & Performance > Server-side Rendering panel
2. Boot Pi receiver, let stream run for 5 minutes
3. In Pi browser devtools console:
   ```js
   const v = document.querySelector('video.ssr-video');
   const q = v.getVideoPlaybackQuality();
   console.log({ total: q.totalVideoFrames, dropped: q.droppedVideoFrames, ratio: q.droppedVideoFrames / q.totalVideoFrames });
   ```
4. Confirm `ratio < 0.01`

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

[none — automated 13/13, manual UAT pending live Pi hardware]
