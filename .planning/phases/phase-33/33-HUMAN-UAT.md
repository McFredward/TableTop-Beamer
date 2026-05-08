---
status: pending
phase: 33-connection-stability-deep-dive
source: [33-VERIFICATION.md]
started: 2026-05-08T22:00:00Z
updated: 2026-05-08T22:00:00Z
---

## Current Test

[awaiting human testing — operator + Pi hardware required]

## Pre-flight (do once)

The dev-cycle test suite has been verified green; on the production
server you mainly need to start fresh and exercise the system. To
restart the production server:

```bash
cd ~/tt-beamer && SSR_RENDER_HOST=1 SSR_PUBLISH=1 node server.mjs
```

The Pi side: just open `/output/` in the kiosk Chromium (or refresh
if already open).

## Tests

### 1. Cold-boot stable ×10
expected: Each Ctrl+C → restart cycle reconnects the Pi within 15s. RECONNECTING countdown appears briefly then disappears once the first frame arrives. No "stuck-reconnect-forever" loops.
result: [pending]

**How to test:**
1. Have the Pi `/output/` page open and visible.
2. Server-side: Ctrl+C the running server, then restart it: `SSR_RENDER_HOST=1 SSR_PUBLISH=1 node server.mjs`
3. Pi-side: confirm reconnect within 15s + first frame visible.
4. Repeat 10×.
5. Record any cycle that takes >15s, gets stuck, or shows "RECONNECTING — 0s" frozen.

### 2. Pi-reload stable ×10
expected: 10/10 Pi-side page reloads (Ctrl+R / refresh) reconnect within 15s without server-restart. sessionStorage is cleared on fresh page-load (no "first retry waits 30s" hang).
result: [pending]

**How to test:**
1. With server running stable, hit Ctrl+R on Pi 10× consecutively (wait for first frame between reloads).
2. Each reload: confirm Pi reconnects + shows frames within 15s.
3. Record any cycle that takes >15s.

### 3. ≥1 hour steady-state
expected: With server + Pi running normally, no spontaneous RECONNECTING banner appears within a 1h+ window. Stream stays stable.
result: [pending]

**How to test:**
1. Boot server, connect Pi, confirm stable.
2. Use the system normally (or just leave it idle) for at least 1 hour.
3. Observe Pi `/output/` view for any RECONNECTING flicker.
4. Bonus: in Pi devtools console, evaluate:
   ```js
   const v = document.querySelector('video.ssr-video');
   const q = v.getVideoPlaybackQuality();
   console.log({ total: q.totalVideoFrames, dropped: q.droppedVideoFrames, ratio: q.droppedVideoFrames/q.totalVideoFrames });
   ```
   Confirm `ratio < 0.01` (Pi VC4 H264 decoder healthy).

### 4. Fault-injection — kill mediasoup-worker
expected: Mediasoup-worker SIGKILL → server auto-respawns within ~5s → Pi reconnects automatically within ~30s. No operator action required.
result: [pending]

**How to test:**
1. Server running stable, Pi connected.
2. On server: `pgrep -P $(pgrep -f 'node server.mjs') | xargs -r ps -p | grep mediasoup`  → note the mediasoup-worker PID.
3. SIGKILL it: `kill -9 <PID>`
4. Pi-side: observe RECONNECTING banner; confirm it clears within 30s and frames return.
5. Server log should show `[ssr-mediasoup] worker died … auto-respawn attempt 1/5`.

### 5. Fault-injection — kill ssr-tab (Chromium)
expected: ssr-tab SIGKILL → server's render-host watchdog detects + restart-host within 20s → Pi reconnects within 60s.
result: [pending]

**How to test:**
1. Server running stable, Pi connected.
2. On server: `pgrep -P $(pgrep -f 'node server.mjs') | xargs -r ps -p | grep -i chrome`  → note Chromium PID(s).
3. SIGKILL chromium child: `kill -9 <PID>`
4. Pi-side: confirm RECONNECTING banner; banner clears within 60s with "Render host crashed" might show briefly, then resolves to live stream.

### 6. Operator telemetry surface (visual)
expected: When connection is broken, the RECONNECTING countdown shows below-line telemetry: last-error message + time since last-success.
result: [pending]

**How to test:**
1. Server running, Pi connected.
2. Stop the server (Ctrl+C).
3. Pi-side: confirm RECONNECTING banner shows + below it a small italic line with last-error + "letzte Verbindung: <time>".
4. Restart server.
5. Confirm Pi reconnects, banner disappears.

### 7. GIVEN_UP state (extreme — optional)
expected: After 10 consecutive failed attempts OR 2 minutes of failure, Pi shows actionable "Verbindung verloren" overlay with Retry button.
result: [pending]

**How to test:**
1. Stop the server permanently (don't restart).
2. Pi-side: wait ~2 minutes (10 retry cycles).
3. Confirm overlay flips to actionable error with Retry button.
4. Click Retry → it tries again (server is down, so it will retry-then-give-up again).
5. Restart server → click Retry → confirm reconnect.

### 8. mp4 outside-sandstorm playback (incidental)
expected: With Phase-32 h9 GPU fix (--use-gl=angle), the mp4 outside-sandstorm animation on Nemesis Lockdown Board A renders correctly (not black-screen).
result: [pending]

**How to test:**
1. Boot server, Pi connected, Nemesis Lockdown Board A loaded.
2. Trigger outside sandstorm animation.
3. Confirm sandstorm plays as expected (orange/dust haze, not black).

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## How to report results

When you have results, paste them as:
```
Test 1 (cold-boot ×10): PASS — all 10 cycles within 8s
Test 2 (Pi-reload ×10): FAIL — cycle 7 took 22s with stuck-reconnect
[etc.]
```

If any test fails, include:
- Pi devtools console snippet (errors, RECONNECTING messages)
- Server stdout snippet (look for `[ssr-mediasoup]`, `[ssr-host]`, `[ssr-signal]` lines around the failure)

## Gaps

- VC4 1080p@60fps decode budget is implicitly tested in Test 3 (steady-state) via the dropped-frames check. Not separated.
- Network-blip via `tc qdisc` packet loss simulation is automated in `fault-injection.test.mjs` but not in the human UAT — would require coordinated Pi-side action and isn't deemed worth manual time.
- Two-consumers-same-IP (S9) is automated (4/4 pass live); not in human UAT since the Pi is a single-consumer deployment.
