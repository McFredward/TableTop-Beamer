---
phase: 32-ssr-stream-performance-connection-stability
verified: 2026-05-07T00:00:00Z
status: human_needed
score: 13/13 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Confirm SSR + stream FPS lifts to ≥30 (floor) and targets ≥40-60 on Nemesis Lockdown Board A"
    expected: "Diagnostic overlay SSR fps chip shows ≥30fps under typical board load; stream fps chip matches"
    why_human: "Xvfb -fakescreenfps 120 is wired (A9 verified), but whether it actually lifts the observed rAF rate from ~25fps to ≥30fps on this specific Chromium snap + iGPU combination requires a live server boot — not statically verifiable"
  - test: "Operator-perceived align-mode drag fluidity ('real-time')"
    expected: "Dragging room corner handles feels smooth with no perceptible lag at the operator's display"
    why_human: "Subjective UX requirement — cannot be evaluated programmatically. Publisher align-mode boost loop is wired and tested (A3b, A3d), but perceived smoothness requires physical verification"
  - test: "Cold-boot stable ×10 cycles — connect without server-restart intervention"
    expected: "10/10 cold-boot cycles: Pi connects within 70s without manual operator action"
    why_human: "D-B5 producer-readiness gate + forever-retry are wired and unit-tested (B1-B13), but actual cold-boot elimination across 10 real server-restart cycles requires Pi hardware and live measurement"
  - test: "Pi-reload stable ×10 cycles — reconnect in <5s when producer already up"
    expected: "10/10 Pi page reloads reconnect in <5s; no reconnect storm; sessionStorage backoff resets after ≥30s stable"
    why_human: "sessionStorage persistence and backoff reset logic are unit-tested (B3-B7), but the full end-to-end Pi reload scenario requires Pi hardware"
  - test: "Pi VC4 decode budget at 1080p@60fps — no dropped frames"
    expected: "videoEl.getVideoPlaybackQuality().droppedVideoFrames stays near 0 at the 60fps stream target"
    why_human: "Pi hardware not available in CI. Research marked this as ASSUMED (I-5). Required for UAT gate on stream quality."
---

# Phase 32: SSR Stream Performance + Connection Stability — Verification Report

**Phase Goal:** Lift SSR stream FPS from ~25fps toward 30 floor / 60 ceiling with operator-configurable cap; eliminate Pi cold-boot reconnect-storm at root cause with producer-readiness gate, forever-retry adaptive backoff, and server-side boot cleanup.

**Verified:** 2026-05-07
**Status:** HUMAN_NEEDED — all automated checks pass; 5 live-hardware UAT items required for phase closure
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Xvfb is launched with -fakescreenfps 120 (root-cause fix for 20-25fps cap) | VERIFIED | `grep -c "fakescreenfps" ssr-render-host.mjs` = 3; literal `"-fakescreenfps", "120"` confirmed in getXvfbArgs() |
| 2 | server-encoder-detect probes Chromium VAAPI via /dev/dri/renderD128 + libva.so.2 (decoupled from ffmpeg) | VERIFIED | `probeLibvaRuntime()` exported; 4 occurrences of libva.so.2 path candidates; 3 occurrences of hasLibva |
| 3 | serverRendering config schema validates streamFpsCap (30/45/60/0) and alignModeBoost (bool) | VERIFIED | `STREAM_FPS_CAP_VALUES = [30, 45, 60, 0]` exported; validator confirmed; 5 occurrences in config module |
| 4 | Publisher's getDisplayMedia frameRate constraint is driven by streamFpsCap config | VERIFIED | `frameRate: { ideal: ${effectiveStreamFpsCap}, max: ${effectiveStreamFpsCap} }` in template literal; applyConstraints uses same value |
| 5 | When alignModeBoost=true and runtime alignMode=true, publisher reactively bumps frameRate to cap-max=60 | VERIFIED | setInterval(250ms) polling `__TT_BEAMER_STATE_FOR_DIAG__.alignMode` confirmed in buildInPagePublisherScript template |
| 6 | Bitrate scales proportionally with streamFpsCap (8→12→16 Mbit/s) | VERIFIED | deriveSimulcastBitrates: 30fps→8M, 45fps→12M, ≥60fps→16M, confirmed in publisher |
| 7 | GET /api/ssr/ready returns 503 when state.videoProducer is null and 200 when non-null | VERIFIED | Route exists in server.mjs; delegates to buildSsrReadyResponse(signalingState) in ssr-ready-handler.mjs; B1/B2 tests pass |
| 8 | Pi receiver waits for producer-ready BEFORE first consume() — eliminating cold-boot race | VERIFIED | `waitForProducer()` exported from receiver-bootstrap.js; called at bootstrap init before tryConnect(); B12/B13 tests pass |
| 9 | Pi receiver retries forever with adaptive backoff [1s, 2s, 5s, 10s, 30s, 30s, …] — no MAX_RECONNECT_ATTEMPTS hard cap | VERIFIED | `grep MAX_RECONNECT_ATTEMPTS receiver-status-ui.js` = 0; `grep MAX_RECONNECT_ATTEMPTS receiver-bootstrap.js` = 0; `RECONNECT_BACKOFF_MS = [1000,2000,5000,10000,30000]` confirmed; B3-B7 pass |
| 10 | Backoff state persists across page reloads via sessionStorage (key ssr-reconnect-state); resets after ≥30s stable | VERIFIED | `loadBackoffState`, `saveBackoffState`, `clearBackoffState` exported; `ssr-reconnect-state` key confirmed; STABLE_RESET_THRESHOLD_MS wired in bootstrap |
| 11 | Pi-side 'RECONNECTING — Xs (attempt N)' countdown overlay updates every 500ms; hides after ≥5s stable | VERIFIED | `showCountdownReconnect`, `markConnectionStable`, `evaluateOverlayHide` exported from receiver-status-ui.js; wired in receiver-bootstrap.js (9 occurrences); B10-B11 pass |
| 12 | Server boot purges stale mediasoup-worker process before bootMediasoupRouter() | VERIFIED | `purgeStaleMediasoupWorker()` exported from ssr-mediasoup-router.mjs; `pkill -f mediasoup-worker` confirmed; line 4217 in server.mjs precedes line 4218 `bootMediasoupRouter()`; B9 tests pass |
| 13 | Operator can configure Stream FPS Cap and Align-Mode Boost via settings panel; settings persist to global-defaults.json | VERIFIED | 4 × `name="ssr-stream-fps-cap"` radios + `id="ssr-align-mode-boost-toggle"` in index.html; ssrStreamFpsCapRadios + ssrAlignModeBoostToggle in dom-refs and orchestration; reflectConfig + change handlers in server-rendering-panel.js; streamFpsCap: 60 + alignModeBoost: true confirmed in global-defaults.json; 32-03 settings-ui tests pass (6/6) |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/server/ssr-render-host.mjs` | Xvfb -fakescreenfps flag, getXvfbArgs export, fpsCap flow into resolveEncoderConfig | VERIFIED | `-fakescreenfps 120` in getXvfbArgs(); effectiveStreamFpsCap passed to injectInPagePublisher |
| `src/server/server-encoder-detect.mjs` | probeLibvaRuntime + Chromium VAAPI detection independent of ffmpeg | VERIFIED | export function probeLibvaRuntime() present; hasLibva probe wired into detectAvailableEncoders |
| `src/server/ssr-server-rendering-config.mjs` | STREAM_FPS_CAP_VALUES, validators, defaults for streamFpsCap + alignModeBoost | VERIFIED | STREAM_FPS_CAP_VALUES = [30, 45, 60, 0] exported; 5 total occurrences |
| `src/server/ssr-stream-publisher.mjs` | frameRate reads from streamFpsCap; reactive align-mode boost via applyConstraints | VERIFIED | buildInPagePublisherScript exported; effectiveStreamFpsCap interpolated into frameRate; setInterval boost loop present |
| `config/global-defaults.json` | serverRendering.streamFpsCap=60 + alignModeBoost=true | VERIFIED | `node -e` confirms: streamFpsCap: 60, alignModeBoost: true |
| `server.mjs` | GET /api/ssr/ready route + purgeStaleMediasoupWorker before boot | VERIFIED | Route present; signalingState module-scoped (6 references); purgeStaleMediasoupWorker at line 4217, bootMediasoupRouter at 4218 |
| `src/server/ssr-webrtc-signaling.mjs` | producer-ready WS push on null→non-null transition | VERIFIED | 4 occurrences of producer-ready; broadcastProducerReady (closure) with 2 call sites |
| `src/server/ssr-mediasoup-router.mjs` | export purgeStaleMediasoupWorker for boot cleanup | VERIFIED | export async function purgeStaleMediasoupWorker; pkill -f mediasoup-worker confirmed |
| `src/app/runtime/output-receiver/receiver-bootstrap.js` | waitForProducer pre-flight, forever-retry, sessionStorage backoff, no MAX_RECONNECT_ATTEMPTS | VERIFIED | All four properties confirmed; 5 occurrences of waitForProducer; 0 occurrences of MAX_RECONNECT_ATTEMPTS |
| `src/app/runtime/output-receiver/receiver-status-ui.js` | showCountdownReconnect, markConnectionStable, evaluateOverlayHide; MAX_RECONNECT_ATTEMPTS removed | VERIFIED | All three functions exported; MAX_RECONNECT_ATTEMPTS: 0 occurrences |
| `src/server/ssr-ready-handler.mjs` | buildSsrReadyResponse pure helper | VERIFIED | File exists; buildSsrReadyResponse exported; imported by server.mjs |
| `index.html` | Stream FPS Cap radio group (4 options) + Align-Mode Boost checkbox | VERIFIED | 4 × name="ssr-stream-fps-cap"; id="ssr-align-mode-boost-toggle" confirmed |
| `src/app/runtime/core/runtime-dom-refs.js` | ssrStreamFpsCapRadios + ssrAlignModeBoostToggle refs | VERIFIED | 1 occurrence each |
| `src/app/runtime/runtime-orchestration.js` | wires new refs into panel init | VERIFIED | ssrStreamFpsCapRadios appears twice (destructure + panel-init); ssrAlignModeBoostToggle same |
| `src/app/lib/ui/settings/server-rendering-panel.js` | reflectConfig + change handlers for streamFpsCap + alignModeBoost | VERIFIED | 3 occurrences each |
| `test/phase-32-*.test.mjs` (11 files) | Full test scaffolding for A1-A9 + B1-B13 | VERIFIED | 11 files present; 59/59 pass; 0 fail; 0 skip |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| ssr-render-host.mjs spawnXvfb() | Xvfb process args | getXvfbArgs() pushes "-fakescreenfps", "120" | WIRED | `getXvfbArgs` exported and called by spawnXvfb |
| ssr-server-rendering-config.mjs validator | config/global-defaults.json | validateServerRenderingPatch + SERVER_RENDERING_DEFAULTS | WIRED | streamFpsCap 60 + alignModeBoost true in JSON |
| ssr-stream-publisher.mjs template literal | browser getDisplayMedia + applyConstraints | frameRate: { ideal: ${effectiveStreamFpsCap}, max: ${effectiveStreamFpsCap} } | WIRED | Confirmed at lines 194 and 208 |
| Pi receiver bootstrap | /api/ssr/ready | fetch in waitForProducer() before WebRTC setup | WIRED | waitForProducer called at bootstrap init; 5 occurrences in receiver-bootstrap.js |
| ssr-webrtc-signaling.mjs producer-set hook | Pi receiver | ws push 'producer-ready' when videoProducer flips | WIRED | broadcastProducerReady closure confirmed |
| server.mjs boot block | bootMediasoupRouter | await purgeStaleMediasoupWorker() before boot | WIRED | line 4217 precedes line 4218 confirmed by grep -n |
| receiver-bootstrap.js retry loop | sessionStorage | loadBackoffState/saveBackoffState | WIRED | ssr-reconnect-state key confirmed; save on increment, clear on stable |
| index.html ssr-stream-fps-cap radios | server-rendering-panel.js | change handler → sendPatch → emitLiveMutation | WIRED | Change handlers and ssrStreamFpsCapRadios wired in panel |
| resolveEncoderConfig | buildInPagePublisherScript | effectiveStreamFpsCap + alignModeBoost passed through injectInPagePublisher call site | WIRED | Call site confirmed in ssr-render-host.mjs line 640 area |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| buildInPagePublisherScript | effectiveStreamFpsCap | resolveEncoderConfig reads global-defaults.json → streamFpsCap field | YES — config read from disk, validated enum value | FLOWING |
| buildInPagePublisherScript | alignModeBoost | resolveEncoderConfig reads global-defaults.json → alignModeBoost field | YES — config read from disk, boolean validated | FLOWING |
| /api/ssr/ready route | signalingState.videoProducer | module-scoped let signalingState populated by attachWebRtcSignaling() return value | YES — non-null when mediasoup producer registered | FLOWING |
| showCountdownReconnect | delayMs, attemptN | getBackoffDelay(reconnectAttempts - 1) + incremented reconnectAttempts | YES — live schedule values from RECONNECT_BACKOFF_MS | FLOWING |
| receiver-bootstrap.js init | reconnectAttempts | loadBackoffState(backoffStorage).attempts from sessionStorage | YES — real sessionStorage read with graceful fallback | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| STREAM_FPS_CAP_VALUES exported correctly | node -e check | [30, 45, 60, 0] confirmed | PASS |
| streamFpsCap + alignModeBoost in global-defaults.json | node -e check | 60 true | PASS |
| MAX_RECONNECT_ATTEMPTS absent from output-receiver | grep both files | 0 + 0 | PASS |
| RECONNECT_BACKOFF_MS schedule correct | grep check | [1000, 2000, 5000, 10000, 30000] confirmed | PASS |
| purgeStaleMediasoupWorker precedes bootMediasoupRouter | grep -n check | line 4217 before line 4218 | PASS |
| Full suite 274/270/0/4 | node --test test/**/*.test.mjs | 274 total, 270 pass, 0 fail, 4 skip | PASS |
| Phase-32 specific suite | node --test test/phase-32-*.test.mjs | 59 total, 59 pass, 0 fail, 0 skip | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|----------|
| phase-32-block-A | 32-W0, 32-01, 32-03 | Lift stream FPS from ~25 toward 30 floor / 60 ceiling with operator-configurable cap | SATISFIED (automated) + HUMAN-NEEDED (FPS lift observable) | All 5 Block-A artifacts wired; A1-A9 test suite 59/59; hardware UAT required for fps ≥ 40 exit criterion |
| phase-32-block-B | 32-W0, 32-02 | Eliminate cold-boot reconnect-storm at root with producer-readiness gate, forever-retry, boot cleanup | SATISFIED (automated) + HUMAN-NEEDED (10× cold-boot cycles) | All 5 Block-B artifacts wired; B1-B13 test suite pass; hardware UAT required for stability exit criterion |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| (none found) | — | — | — |

No TODOs, FIXMEs, return null stubs, hardcoded empty arrays, or placeholder patterns found in any of the 14 Phase 32 source files modified. Confirmed by grep scan.

---

### Context Decision Compliance (D-A1..D-A6, D-B1..D-B5)

| Decision | Requirement | Status | Evidence |
|----------|------------|--------|----------|
| D-A1 | Floor 30fps, ceiling 60fps, hardware maxed out | COMPLIANT | No fixed target hardcoded; streamFpsCap enum drives publisher constraint |
| D-A2 | Inside align-mode: stream fps decoupled, auto-boost to cap-max | COMPLIANT | setInterval polling loop in buildInPagePublisherScript; applyConstraints(60) on alignMode true→active |
| D-A3 | Operator-configurable Stream FPS Cap + Align-Mode Boost toggle; persists in global-defaults.json | COMPLIANT | 32-03 UI fully wired; streamFpsCap/alignModeBoost in global-defaults.json |
| D-A4 | Root-cause-first: Xvfb -fakescreenfps and libva probe, not symptom patches | COMPLIANT | Patches address verified root causes (RESEARCH.md I-1A confirmed); no symptom patches found |
| D-A5 | Quality-vs-FPS: auto drops to 720p to hold target | COMPLIANT | 32-01 plan explicitly documented this delegates to Chromium natural constraint-negotiation (design note in Task 2) |
| D-A6 | VAAPI auto-detection: probeLibvaRuntime independent of ffmpeg | COMPLIANT | probeLibvaRuntime exported; detectAvailableEncoders trusts hasVaapiDevice + hasLibva pair; encoder now detects vaapi on this hardware |
| D-B1 | Root-cause-first: producer race, hard cap, stale state | COMPLIANT | All three root causes addressed (RC1→waitForProducer, RC2→forever-retry, RC4→purgeStaleMediasoupWorker) |
| D-B2 | Adaptive backoff forever-retry [1s→30s]; reset after ≥30s stable; sessionStorage | COMPLIANT | RECONNECT_BACKOFF_MS = [1000,2000,5000,10000,30000]; STABLE_RESET_THRESHOLD_MS = 30000; sessionStorage confirmed |
| D-B3 | Pi-side "RECONNECTING — Xs" countdown overlay; hides after ≥5s stable | COMPLIANT | showCountdownReconnect with 500ms tick; evaluateOverlayHide with OVERLAY_HIDE_AFTER_STABLE_MS = 5000 |
| D-B4 | Server-side proactive boot-cleanup (purge mediasoup worker before boot) | COMPLIANT | purgeStaleMediasoupWorker() at line 4217 precedes bootMediasoupRouter() at 4218 |
| D-B5 | Producer-readiness gate before consumer attempts | COMPLIANT | waitForProducer() pre-flight in receiver-bootstrap init; /api/ssr/ready endpoint returns 503/200 |

---

### Phase 31 Baseline Preservation (Non-Regression Check)

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Total tests | ≥ 215 (Phase 31 baseline was 215) | 274 | PASS |
| Pass count | ≥ 211 | 270 | PASS |
| Fail count | 0 | 0 | PASS |
| Skip count | 4 (Phase 31 had 4 existing skips) | 4 | PASS |
| WebRTC + h264 + mediasoup | Untouched | mediasoup still primary; H264 codec confirmed in ssr-mediasoup-router.mjs | PASS |
| Headful Chromium + Xvfb + puppeteer-stream | Untouched | Xvfb + launchBrowser + injectInPagePublisher still present | PASS |
| Pi-local audio (D-D2-Reversal) | audioRoute = "pi-local" | Confirmed in global-defaults.json | PASS |
| Server-authoritative state | config/global-defaults.json | streamFpsCap/alignModeBoost correctly added to serverRendering block | PASS |

---

### Human Verification Required

**5 items require live-hardware testing before phase closure. All automated checks pass.**

#### 1. SSR + Stream FPS Lift to ≥30fps floor

**Test:** Boot server with Nemesis Lockdown Board A loaded. Observe diagnostic overlay SSR fps chip for 30 seconds under typical load (animations running).
**Expected:** SSR fps chip shows ≥30fps consistently; stream fps chip matches. Ideally 50-60fps targeting the configured cap.
**Why human:** The -fakescreenfps 120 flag is wired and unit-tested (A9), but whether it actually lifts the observed Chromium rAF rate from ~25fps to ≥30fps on this specific Chromium snap + Intel Raptor Lake-P combination is unverifiable without a live server boot. This is the primary gate from VALIDATION.md exit criterion 1.

#### 2. Operator-Perceived Align-Mode Drag Fluidity

**Test:** Enter align-mode (drag a room corner handle) with alignModeBoost=ON (default). Evaluate subjectively whether the drag feels "real-time" with no perceptible lag.
**Expected:** "Smooth, no lag" sensation during drag. With boost active, publisher should boost to 60fps during drag — verify `videoTrack.getSettings().frameRate` in SSR tab console spikes to 60 during drag and returns to configured cap afterward.
**Why human:** VALIDATION.md explicitly marks this as manual-only (subjective UX). The boost loop is wired and unit-tested (A3b, A3d), but operator perception cannot be evaluated programmatically.

#### 3. Cold-Boot Stable ×10 Cycles

**Test:** Stop server completely; start fresh; load Pi /output/ page. Repeat 10 times. Observe: (a) server log shows `[server] purging stale mediasoup-worker (D-B4)` before `[ssr-mediasoup] router up`; (b) `RECONNECTING — Xs (attempt N)` overlay appears while SSR tab boots; (c) Pi connects within 70s without manual intervention; (d) overlay hides after ≥5s stable.
**Expected:** 10/10 cycles connect without manual server restart.
**Why human:** waitForProducer gate + forever-retry are unit-tested (B1-B13), but actual cold-boot elimination across 10 real cycles with real timing requires Pi hardware and live measurement. This is VALIDATION.md exit criterion 3.

#### 4. Pi Page Reload Stable ×10 Cycles

**Test:** With server running and Pi connected + stable for >30s, reload Pi /output/ page (F5) 10 times. Observe reconnect within 5s (producer already up); no reconnect storm; `ssr-reconnect-state` in sessionStorage resets to attempts=0 after ≥30s stable.
**Expected:** 10/10 reloads reconnect in <5s.
**Why human:** sessionStorage persistence is unit-tested (B5, B7), but the full reload scenario with real timing requires Pi hardware. This is VALIDATION.md exit criterion 4.

#### 5. Pi VC4 Decode Budget at 1080p@60fps

**Test:** With stream running at 60fps (streamFpsCap=60 default), run on Pi for 60 seconds and read `videoEl.getVideoPlaybackQuality().droppedVideoFrames`. Also check `videoEl.getVideoPlaybackQuality().totalVideoFrames`.
**Expected:** droppedVideoFrames stays near 0 (< 1% of total frames) — Pi VC4 h264 HW decoder handles 1080p@60fps without dropped frames.
**Why human:** Research marked this as ASSUMED (I-5, Assumption A2). Pi hardware not available in CI. If Pi drops frames at 60fps, the default streamFpsCap must be lowered to 30fps for that hardware tier.

---

## Gaps Summary

No gaps found. All 13 observable truths verified programmatically. All artifacts exist and are substantive. All key links are wired with real data flowing. All D-A1..D-A6 and D-B1..D-B5 context decisions are honored in code.

The 5 human verification items are UAT requirements, not code deficiencies. They exist because:
- FPS lift requires live hardware measurement (cannot grep fps into existence)
- Cold-boot stability requires 10× real cycles (cannot mock a real cold boot)
- Pi VC4 decode budget requires Pi hardware (not in CI environment)

Phase 32 is code-complete. Ready for Pi hardware UAT session.

---

_Verified: 2026-05-07_
_Verifier: Claude (gsd-verifier)_
