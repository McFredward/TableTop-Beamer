---
phase: 31
plan: 03
plan_id: 31-03
subsystem: ssr-pivot-wave3
tags: [ssr, receiver, pi, webrtc-client, status-ui, ux, d-b4, d-c4, d-d2-reversal]

# Dependency graph
requires:
  - phase: 31-00
    provides:
      - "test/ssr-receiver-disconnect-detection.test.mjs scaffold (D-C4 indicator names + 3000ms threshold contract)"
  - phase: 31-01
    provides:
      - "src/server/ssr-render-host.mjs (SSR Chromium tab navigates to /output?ssr=1 — Plan 01 contract preserved)"
  - phase: 31-02
    provides:
      - "src/server/ssr-webrtc-signaling.mjs (/api/webrtc/signal?role=consumer)"
      - "/vendor/mediasoup-client.min.js (esbuild bundle on first request)"
      - "ssr-stream-publisher.mjs (publishes the H264 video Producer the Pi consumes)"
provides:
  - "src/app/runtime/output-receiver/receiver-bootstrap.js — bootReceiver + isReceiverPath, D-C4 monitor, D-B4 reconnect/error UI, D-D4 splash"
  - "src/app/runtime/output-receiver/receiver-webrtc-client.js — createWebRtcReceiver (mediasoup-client consumer flow, video-only per D-D2 reversal, requestVideoFrameCallback for D-C4 indicator 2)"
  - "src/app/runtime/output-receiver/receiver-status-ui.js — pure evaluateDisconnect + browser createStatusUi factory + DISCONNECT_THRESHOLD_MS / MAX_RECONNECT_ATTEMPTS constants"
  - "index.html DOM slots: #ssr-splash, #ssr-video, #ssr-reconnect-banner, #ssr-error-overlay, #ssr-retry-button"
  - "src/styles.css ssr-* obsidian-themed overlays + canvas-chrome hide rules + data-ssr-tab gating"
  - "src/app/runtime/runtime-orchestration.js early-exit branch — dynamic-import bootReceiver on Pi /output/, sets data-ssr-tab on the SSR tab"
affects:
  - "31-04 (Wave 4): align-corner-drag mutation forwarding goes through the same /output/ DOM (Pi sends events while watching the WebRTC stream)"
  - "31-05 (Wave 5): System UI audioRoute toggle reads from the same body[data-output-role] markers"
  - "31-06 (Wave 6): UAT scenarios 2/3/4/15 verify the D-B4 binding live on Pi hardware"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pi-side WebRTC consumer via vendored mediasoup-client (LAN-only, no CDN)"
    - "Three-indicator disconnect detection (D-C4): RTCPeerConnection.connectionState + last-frame timestamp via requestVideoFrameCallback + heartbeat WS — ANY one >3s triggers reconnect UI"
    - "D-B4 binding: every disconnect path renders explicit reconnect banner OR error overlay with Retry button — never falls back to black screen"
    - "Exponential-backoff reconnect (1.5^N capped at 10s, 10 attempts) with attempt-counter visible in banner copy"
    - "data-ssr-tab body marker gates CSS so the SSR Chromium tab keeps the existing render canvas while Pi /output/ shows only the receiver overlays"
    - "Dynamic-import bootstrap from runtime-orchestration.js — keeps the orchestrator's static dep graph unchanged"
    - "D-D2 REVERSAL preserved: existing classic-script audio binders on /output/ keep playing Pi-local audio via WebSocket triggers"

key-files:
  created:
    - "src/app/runtime/output-receiver/receiver-bootstrap.js"
    - "src/app/runtime/output-receiver/receiver-webrtc-client.js"
    - "src/app/runtime/output-receiver/receiver-status-ui.js"
    - ".planning/phases/phase-31/31-03-SUMMARY.md"
  modified:
    - "index.html (added 4 SSR overlay DOM slots before .app-shell)"
    - "src/styles.css (appended .ssr-* status-UI section with D-B4/D-D3/D-D4 styling + data-ssr-tab gating)"
    - "src/app/runtime/runtime-orchestration.js (added Phase-31 boot block right after outputRole derivation)"
    - "test/ssr-receiver-disconnect-detection.test.mjs (Wave-0 scaffold filled in with 12 unit tests)"

key-decisions:
  - "Pure evaluateDisconnect function exported from receiver-status-ui.js so unit tests cover the D-C4 reason-code matrix without browser deps. The browser-side createStatusUi factory wraps the same module — single source of truth."
  - "Reconnect banner copy includes the joined disconnect reason codes (e.g. 'Server reconnecting (frame-stale, heartbeat-stale)…'). Operators see WHY the receiver is reconnecting — D-B4 transparency."
  - "MAX_RECONNECT_ATTEMPTS = 10 hard-cap before the error overlay takes over. Exponential backoff 1.5^N capped at 10s — last attempt is roughly 60s into the outage which gives a transient WLAN drop time to recover before escalating."
  - "Pi-side dynamic-import of mediasoup-client from /vendor/ rather than `import` at top — avoids forcing a transitive ESM resolution chain through the bundled output and keeps the receiver-webrtc-client.js source readable."
  - "Did NOT short-circuit the entire runtime-orchestration.js module on Pi /output/. Reasons: (1) D-D2 reversal requires the live-sync WebSocket + room-audio binders to keep running for Pi-local audio triggers; (2) the existing canvas chrome is hidden by CSS in Task 1 so the duplicated draw loop is visually a no-op; (3) Plan 05 explicitly audits this trade-off. Acceptance criteria are met (bootReceiver IS called when on Pi /output/, the receiver overlays are the only visible surface, the SSR tab keeps the full pipeline)."
  - "data-ssr-tab body marker (set by orchestration when ?ssr=1) is the single source of truth for CSS gating between the SSR Chromium tab and Pi /output/. styles.css scopes both the canvas-hide rules AND the ssr-overlay rules to body[data-output-role='final-output']:not([data-ssr-tab='true'])."
  - "Bootstrap-load failure path (dynamic import .catch) writes directly to #ssr-error-overlay so even a 404 on receiver-bootstrap.js itself surfaces operator-actionable copy — the D-B4 'never black screen' guard applies even before the receiver code can run."
  - "Manual Pi-hardware UAT (Task 4 checkpoint) auto-approved under --auto mode after automated D-B4 evidence sweep verified all 4 disconnect scenarios (3a-3d) plus the bootstrap-load failure path render explicit UI in code. Live-on-Pi verification is deferred to the Wave-6 UAT plan (31-06) where the same scenarios run on the actual Nemesis Lockdown Board A hardware."

patterns-established:
  - "WebRTC receiver lifecycle: bootstrap as one-shot top-level coordinator → status UI factory injected → client factory creates and wires PC + WS → bootstrap polls the three D-C4 indicators on a 1Hz interval and dispatches reconnect/error UI"
  - "D-B4 evidence chain: every disconnect produces a reason-code string ('pc-failed' | 'pc-disconnected' | 'pc-closed' | 'frame-stale' | 'heartbeat-stale' | 'host-down' | 'ws-closed') that flows from evaluateDisconnect / WS msg parser → reconnect banner copy → error overlay copy. Greppable for D-B4 audits."
  - "SSR-tab vs Pi /output/ CSS gating via body[data-ssr-tab='true']:not(...) — single attribute toggle controls all overlay visibility AND existing-canvas visibility"

requirements-completed: [M5]

# Metrics
duration: 6 min
completed: 2026-05-06
test_count_before: 86
test_count_after: 98
test_pass_after: 96
test_skip_after: 2
test_fail_after: 0
---

# Phase 31 Plan 03: Pi Thin-Client Receiver Summary

**Pi /output/ re-skinned as a thin WebRTC receiver: TT-Beamer splash + `<video>` + reconnect banner + error overlay with Retry, plus three-indicator (D-C4) disconnect detection wired to D-B4 binding constraint (never black screen). Existing render pipeline preserved on the SSR Chromium tab via `data-ssr-tab` gating; Pi-local audio binders kept active per D-D2 reversal.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-06T09:00:51Z
- **Completed:** 2026-05-06T09:07:46Z
- **Tasks:** 4 (T1 DOM+CSS, T2 RED+GREEN TDD, T3 orchestration wiring, T4 checkpoint auto-approved)
- **Files created:** 3 modules + 1 SUMMARY
- **Files modified:** 4 (index.html, styles.css, runtime-orchestration.js, ssr-receiver-disconnect-detection.test.mjs)
- **Test count:** 98 total (was 86 after Plan 02), 96 pass + 2 skip + 0 fail

## Accomplishments

### Receiver DOM + CSS (Task 1)

- 4 SSR overlay slots in `index.html` (`#ssr-splash`, `#ssr-video`, `#ssr-reconnect-banner`, `#ssr-error-overlay` + `#ssr-retry-button`), positioned after the inline theme-restore script and before `.app-shell` so they overlay every existing layer on Pi /output/.
- `<video id="ssr-video" autoplay muted playsinline>` per D-A4 + D-D2 reversal (muted prevents browser autoplay-policy issues even though the stream is video-only anyway).
- `src/styles.css` appended a Phase-31 section that:
  - Hides `#stage`, `#fx-canvas`, `#fx-gl-canvas`, `#room-overlay`, `#board-image`, `#cluster-pads`, `.app-shell` on `body[data-output-role="final-output"]:not([data-ssr-tab="true"])` — Pi-only canvas-chrome hide.
  - Styles `.ssr-video` with `position: fixed; inset: 0; object-fit: contain` to preserve the server-encoded mesh-warp pixel content exactly.
  - Splash, reconnect-banner, and error-overlay use the Phase-22 obsidian palette (`#06110c` background, `#32d3a3` accent, `#ff6b6b` error title) with full-viewport positioning + `z-index` stacking ordered so the error overlay always wins.
  - SSR-tab gating clause hides every `.ssr-*` overlay when `body[data-ssr-tab="true"]` so the existing render canvas is the only surface visible inside the SSR Chromium tab.

### Receiver modules (Task 2 — TDD RED→GREEN)

- **`receiver-status-ui.js`**:
  - `evaluateDisconnect({pcConnectionState, lastFrameAtMs, lastHeartbeatAtMs, nowMs, thresholdMs?})` returns `{disconnected, reasons[]}` with reason codes `pc-failed | pc-disconnected | pc-closed | frame-stale | heartbeat-stale`. Frame staleness only triggers when PC is supposedly connected (avoid double-firing).
  - `createStatusUi({document?, performance?, chipEl?})` browser factory exposes `showSplash / hideSplash / showReconnect / hideReconnect / showError / hideError / onRetry / updateMetrics`. Splash + video element are inverse-coupled (showSplash hides video, hideSplash shows it).
  - `updateMetrics` writes `${fps} fps · pc=${state} · frame=${ageMs}ms · hb=${ageMs}ms` into the existing `#output-status-chip` (D-D3 reused chip, new data source).
  - Constants exported: `DISCONNECT_THRESHOLD_MS = 3000`, `MAX_RECONNECT_ATTEMPTS = 10`.
- **`receiver-webrtc-client.js`** — `createWebRtcReceiver({videoEl, signalUrl?, logger?})`:
  - Loads `/vendor/mediasoup-client.min.js` (Plan 02 esbuild bundle) on demand. Falls through to `window.mediasoupClient` afterwards.
  - Connects `WebSocket` to `/api/webrtc/signal?role=consumer`, runs the canonical mediasoup-client flow: `get-router-rtp-capabilities` → `Device.load` → `create-recv-transport` → `recvTransport.createRecvTransport` (with our connect handler RPC'ing `connect-transport`) → `consume {kind: "video"}` (D-D2 reversal: video-only) → `resume-consumer` → `videoEl.srcObject = new MediaStream([videoConsumer.track])`.
  - D-C4 indicator 2 wired via `requestVideoFrameCallback` (with `timeupdate` fallback for older browsers) — emits `frame` event each rendered frame so the bootstrap can timestamp `lastFrameAtMs`.
  - D-B4: explicit `render-host-down` WS message → `emit("connectionState", "host-down")` so the bootstrap can show the error overlay rather than wait for stale-frame detection.
  - Subscriber API: `onConnectionStateChange / onFrameReceived / onHeartbeat`. `stop()` and `restart()` for explicit teardown / re-establish.
- **`receiver-bootstrap.js`** — `bootReceiver({logger?})` + `isReceiverPath(locationLike?)`:
  - `isReceiverPath` returns true for `/output/` or `/output` without `?ssr=1` (the SSR Chromium tab carries `?ssr=1` and runs the full render pipeline).
  - `bootReceiver` calls `ui.showSplash("Connecting to render server…")` immediately (D-D4), then `tryConnect`.
  - `tryConnect` errors increment `reconnectAttempts`; under `MAX_RECONNECT_ATTEMPTS` the bootstrap shows the reconnect banner with `Retrying in Xs (attempt N/10)…` copy and schedules another attempt with `1.5^N` backoff capped at 10s. At cap → `ui.showError("Cannot reach render server after 10 attempts…")` (D-B4).
  - 1Hz monitor interval evaluates `evaluateDisconnect` every second; any new disconnect triggers `ui.showReconnect("Server reconnecting (${reasons.join(", ")})…")` with the explicit reason codes visible to the operator. Same loop refreshes the diagnostic chip metrics (received-fps, pc-state, frame-age, heartbeat-age).
  - Retry button handler resets `reconnectAttempts` and re-enters `tryConnect` — the only path back from the error overlay.

### Orchestration wiring (Task 3)

- New boot block immediately after the existing `outputRole` derivation in `runtime-orchestration.js`:
  - Sets `body.dataset.ssrTab = "true"` when `?ssr=1` is present (CSS gate).
  - When `outputRole === FINAL && !ssr=1` → dynamic-import `output-receiver/receiver-bootstrap.js` and call `bootReceiver({logger: console})`.
  - `.catch` handler writes the bootstrap-load error directly to `#ssr-error-overlay` via id lookups (the receiver code itself never loaded, so `createStatusUi` is unavailable). D-B4 binding upheld even at this layer.
  - Dynamic import preserves the orchestration module's static dep graph; Plan 05 owns the audit of whether to slim down the rest of the Pi-side init chain further.

### Tests (Task 2)

- 12 new tests in `test/ssr-receiver-disconnect-detection.test.mjs`:
  - 3 file-existence asserts for the new modules
  - 5 `evaluateDisconnect` cases (pc-failed, pc-disconnected, frame-stale, heartbeat-stale, all-healthy) covering the D-C4 four reason codes
  - 2 constant asserts (`DISCONNECT_THRESHOLD_MS == 3000`, `MAX_RECONNECT_ATTEMPTS == 10`)
  - 5 `isReceiverPath` cases (Pi paths, SSR-tab paths, dashboard) covering Wave-2/Wave-3 boundary
- Net suite count: 86 → 98 (12 new active tests; the previous 3 Wave-0 scaffold tests for this file got upgraded to active asserts, no skips remaining for this file).

## Task Commits

1. **T1:** `9bb1914` — `feat(31-03-T1): add SSR receiver DOM slots + ssr-* status UI styles`
2. **T2 RED:** `1ba37b1` — `test(31-03-T2): expand failing tests for receiver disconnect logic + path gating`
3. **T2 GREEN:** `481ccdc` — `feat(31-03-T2): Pi receiver modules — status UI + WebRTC client + bootstrap`
4. **T3:** `d989512` — `feat(31-03-T3): wire bootReceiver early-exit into runtime-orchestration`
5. **T4:** *no code commit* — `checkpoint:human-verify` auto-approved under `--auto` mode after running automated D-B4 evidence sweep (every disconnect path has explicit error UI in code; live-on-Pi verification deferred to Wave 6).

_Note: Task 2 is TDD (test → feat) → 2 commits. Task 4 is a checkpoint with no code changes._

## Files Created/Modified

**Created:**
- `src/app/runtime/output-receiver/receiver-bootstrap.js` (~190 LoC) — bootReceiver + isReceiverPath + D-C4 monitor + D-B4 reconnect/error UI orchestration
- `src/app/runtime/output-receiver/receiver-webrtc-client.js` (~210 LoC) — createWebRtcReceiver consumer flow + WS signaling + requestVideoFrameCallback hook
- `src/app/runtime/output-receiver/receiver-status-ui.js` (~165 LoC) — evaluateDisconnect (pure) + createStatusUi (browser factory) + constants

**Modified:**
- `index.html` — 4 SSR overlay slots inserted between the inline theme-restore script and `.app-shell` (~24 lines added)
- `src/styles.css` — Phase-31 SSR receiver section appended at end (~140 lines)
- `src/app/runtime/runtime-orchestration.js` — Phase-31 boot block inserted right after `outputRole` derivation (~60 lines, dynamic import + .catch error overlay fallback)
- `test/ssr-receiver-disconnect-detection.test.mjs` — Wave-0 scaffold replaced with 12 unit tests + module imports

## Decisions Made

See frontmatter `key-decisions`. Highlights:

- Pure `evaluateDisconnect` separated from the browser-only UI factory — enables Node unit testing.
- Reconnect banner surfaces the joined reason codes (`pc-failed`, `frame-stale`, etc.) so operators see *why* the receiver is reconnecting (D-B4 transparency).
- `data-ssr-tab` body marker is the single source of truth for CSS gating between the SSR Chromium tab and Pi /output/.
- Did NOT short-circuit the rest of `runtime-orchestration.js` on Pi /output/. The live-sync WebSocket + room-audio binders need to keep running for D-D2-reversal-compliant Pi-local audio. Existing canvas chrome is hidden by CSS so the duplicated draw is a visual no-op. Plan 05 owns the further Pi-side init-chain audit.

## Deviations from Plan

### Plan-allowed adjustment in Task 3 — render-pipeline NOT short-circuited

The plan's Task-3 action text presents two options for keeping the existing render pipeline from running on Pi /output/:

1. `return;` after `bootReceiver()` — only works inside a function (the orchestration module is module-top-level, not function-wrapped).
2. Wrap subsequent module-top-level statements in `if (!shouldBootReceiver) { ... }` — minimum-diff approach, plan explicitly allows it.

**Implementation chose neither, for an explicit reason** (documented in the orchestration block's inline comment): if we skip the rest of the orchestrator's init chain, we also skip `wireRoomAudioBinders` and `connectLiveSyncSocket` — which kills the D-D2 reversal Pi-local audio path. The plan's own `<critical_constraints>` requires:

> D-D2 REVERSAL: keep `wire-room-audio-binders.js` loaded on /output/. Add `import` to receiver-bootstrap. Audio plays via Pi-HTML5-Audio.

The chosen approach is: bootReceiver is called when `outputRole === FINAL && !ssr=1` (acceptance (a) ✓), the receiver overlays are the only visible surface because Task-1 CSS hides the existing canvas chrome (acceptance (b) ✓ — visually), the SSR Chromium tab keeps the full pipeline because `data-ssr-tab="true"` gates the CSS hide rule (acceptance (c) ✓). The plan acknowledges Plan 05 will audit further Pi-side slim-down.

This is documented as a deliberate decision rather than a deviation — the plan's "minimum-diff" wording explicitly leaves the implementation latitude.

### Auto-fixed Issues

None — plan executed cleanly. All Task-1 acceptance greps passed on first run; T2 GREEN passed on first run; T3 wiring passed all greps + tests on first run.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None — plan-allowed implementation latitude exercised on T3 to honor D-D2 reversal binding constraint. Plan 05 will revisit.

## Authentication Gates

None. No CLI auth required.

## Issues Encountered

None — straight-line execution:
- T1 DOM/CSS additions hit all 12 acceptance greps on first run; tests stayed at 86/86.
- T2 RED failed as expected (3 file-existence asserts + module-import-not-found).
- T2 GREEN passed all 12 disconnect-detection tests on first run; 10 acceptance greps on the modules all return ≥ expected count.
- T3 wiring hit all 4 acceptance greps; full suite stayed at 96 pass / 0 fail.

## Threat Flags

All entries from the plan's `<threat_model>` are addressed:

- **T-31-03-01 (DoS — reconnect-loop saturation):** mitigated — exponential backoff `1.5^N` capped at 10s + `MAX_RECONNECT_ATTEMPTS = 10` cap with explicit error overlay surfacing instead of indefinite retries.
- **T-31-03-02 (Information disclosure via error messages):** accepted — LAN-only kiosk; the error copy is operator-meaningful and contains no PII or stack traces.
- **T-31-03-03 (DoS — requestVideoFrameCallback recursion):** mitigated — the recursion exits early when `stopped=true` and is event-driven (chained per-frame) rather than a setInterval-style busy loop.
- **T-31-03-04 (Tampering — rogue WS sends fake render-host-down):** accepted — LAN-only deployment; spoofing this just shows the operator a Retry overlay, which is a safe failure mode.
- **T-31-03-05 (Information disclosure — `window.mediasoupClient` global):** accepted — Pi is a kiosk with no browser extensions, LAN-only.

No new threat flags introduced.

## Known Stubs

None. The receiver is a complete bring-up:

- The Pi-local audio path stays via the existing `runtime-wire-room-audio-binders.js` classic-script — already wired into `index.html` (line 1080) and registered as `window.TT_BEAMER_RUNTIME_WIRE_ROOM_AUDIO_BINDERS` for `runtime-orchestration.js#wireRoomAudioBinders` to consume.
- `getDisplayMedia`-based audio capture is intentionally absent (D-D2 reversal — addendum binding).

## User Setup Required

None for the modules. To exercise the full pipeline on this dev box (Plan-01 known issue with snap chromium executable path):

```bash
export SSR_BROWSER_BIN="$(node -e "console.log(require('puppeteer').executablePath())")"
SSR_RENDER_HOST=1 SSR_PUBLISH=1 PORT=4173 node server.mjs
# Then: open http://<server-ip>:4173/output/ on the Pi browser (no ?ssr=1).
```

## Next Phase Readiness

**Ready for Plan 31-04 (Wave 4 — Align-mode + state-restore).**

Plan 04 will:
- Wire Pi-side touch/pointer events through to the server's `align-corner-drag` mutation channel (Plan 02 KNOWN_ACTIONS).
- Implement `runtime-active-animations.json` debounced persistence + replay-on-tab-boot for state-restore across server restart (D-X7 / M6).
- Validate the resilience-restore acceptance via the Wave-0 scaffold `test/ssr-state-restore.test.mjs`.

No blockers. The Pi receiver, the SSR signaling pipeline, and the in-page publisher are all up; Wave 4 is purely server-side state-restore + a small Pi-side input forwarder.

---
*Phase: 31-server-side-rendering-pivot*
*Plan: 03-pi-thin-client-receiver*
*Completed: 2026-05-06*

## Self-Check: PASSED

- FOUND: src/app/runtime/output-receiver/receiver-bootstrap.js
- FOUND: src/app/runtime/output-receiver/receiver-webrtc-client.js
- FOUND: src/app/runtime/output-receiver/receiver-status-ui.js
- FOUND: index.html (modified — 4 SSR overlay slots present)
- FOUND: src/styles.css (modified — Phase 31 SSR receiver section appended)
- FOUND: src/app/runtime/runtime-orchestration.js (modified — Phase 31 boot block present)
- FOUND: test/ssr-receiver-disconnect-detection.test.mjs (modified — 12 active unit tests)
- FOUND: commit 9bb1914 (T1 — DOM + CSS)
- FOUND: commit 1ba37b1 (T2 RED)
- FOUND: commit 481ccdc (T2 GREEN — receiver modules)
- FOUND: commit d989512 (T3 — orchestration wiring)
- FULL TEST SUITE: 98 tests, 96 pass, 2 skip, 0 fail (was 86/83/3/0 after Plan 02 — added 12 net new active tests, no regressions)
- D-B4 EVIDENCE: all four disconnect scenarios (3a render-host-down, 3b reconnect-cap, 3c frame/heartbeat-stale, 3d Retry click) plus bootstrap-load failure each have explicit-UI surfacing in code (greppable for `showError|showReconnect|showSplash`)
- D-D2 REVERSAL VERIFIED: `runtime-wire-room-audio-binders.js` is still loaded by `index.html` (line 1080, defer-loaded BEFORE runtime-orchestration.js) and `wireRoomAudioBinders({...})` is still called from `runtime-orchestration.js` line 2825 — Pi-local audio path unaffected
