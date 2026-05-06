---
phase: 32
plan: 02
subsystem: connection-stability
tags: [block-b, producer-readiness, adaptive-backoff, countdown-overlay, boot-cleanup, d-b2, d-b3, d-b4, d-b5]
dependency_graph:
  requires: [32-W0, 32-01]
  provides: [producer-readiness-gate, forever-retry-backoff, countdown-overlay, boot-purge]
  affects: [server.mjs, ssr-webrtc-signaling, ssr-mediasoup-router, receiver-bootstrap, receiver-status-ui]
tech_stack:
  added: [ssr-ready-handler.mjs]
  patterns: [adaptive-backoff-schedule, sessionstorage-persistence, countdown-overlay-with-stop, pkill-boot-cleanup]
key_files:
  created:
    - src/server/ssr-ready-handler.mjs
  modified:
    - server.mjs
    - src/server/ssr-webrtc-signaling.mjs
    - src/server/ssr-mediasoup-router.mjs
    - src/app/runtime/output-receiver/receiver-bootstrap.js
    - src/app/runtime/output-receiver/receiver-status-ui.js
    - test/phase-32-producer-ready.test.mjs
    - test/phase-32-reconnect-backoff.test.mjs
    - test/phase-32-cold-boot-reconnect-repro.test.mjs
    - test/phase-32-fps-baseline.test.mjs
    - test/phase-32-status-overlay.test.mjs
    - test/phase-32-boot-cleanup.test.mjs
    - test/ssr-receiver-disconnect-detection.test.mjs
decisions:
  - "buildSsrReadyResponse extracted to ssr-ready-handler.mjs for pure unit-testability without HTTP server spin-up"
  - "broadcastProducerReady placed as closure inside attachWebRtcSignaling to access connectionsByAddr via closure"
  - "purgeStaleMediasoupWorker uses callback-style exec interface (not execSync) to match test harness injection pattern"
  - "showCountdownReconnect uses module-level _overlayStore as default store; caller can pass explicit store for isolation"
  - "B10b test assertion changed from second-to-last to last text entry — 500ms ticks produce [5s, 5s, 4s] after 1100ms"
  - "ssr-receiver-disconnect-detection test updated: MAX_RECONNECT_ATTEMPTS=10 assertion replaced with typeof === undefined"
metrics:
  duration: "~45 minutes"
  completed_date: "2026-05-07"
  tasks: 3
  files_modified: 12
  files_created: 1
  tests_added: 19
  tests_flipped_from_skip: 13
---

# Phase 32 Plan 02: Block B Connection Stability Summary

One-liner: Three root-cause fixes close the Pi reconnect storm — producer-readiness gate (/api/ssr/ready + waitForProducer), forever-retry adaptive backoff [1s→30s] with sessionStorage persistence, and countdown overlay + server-side mediasoup-worker boot purge.

## What Was Built

### Task 1: Producer-Readiness Gate (D-B5) — commit b147dcd

**`src/server/ssr-ready-handler.mjs`** (new):
- `buildSsrReadyResponse(signalingState)` — pure helper returning `{status, body}` for `/api/ssr/ready`
- Returns 503 + `{ready:false, reason:"producer-starting"}` when `videoProducer == null`
- Returns 200 + `{ready:true, reason:"producer-up"}` when `videoProducer` is non-null
- Returns 503 + `{ready:false, reason:"signaling-not-attached"}` when signalingState is null

**`src/server/ssr-webrtc-signaling.mjs`**:
- Added `broadcastProducerReady()` closure inside `attachWebRtcSignaling` (has access to `connectionsByAddr`)
- Patched produce handler: on null→non-null `state.videoProducer` transition, broadcasts `{type:"producer-ready"}` to all consumer WebSocket connections

**`server.mjs`**:
- Import `buildSsrReadyResponse` from `ssr-ready-handler.mjs`
- Module-scoped `let signalingState = null` (populated on boot)
- Changed `const signalingState =` to `signalingState =` at call site
- New route `GET /api/ssr/ready` using `buildSsrReadyResponse(signalingState)`

**`src/app/runtime/output-receiver/receiver-bootstrap.js`**:
- Added `export async function waitForProducer({fetch, maxWaitMs=60000, pollIntervalMs=1000})` — polls `/api/ssr/ready` until `{ready:true}` or timeout

**Tests flipped GREEN**: B1, B2, B12, B13 + extra B2b (signaling-not-attached edge case)

---

### Task 2: Forever-Retry Adaptive Backoff + SessionStorage (D-B2/D-B5) — commit 496b3d3

**`src/app/runtime/output-receiver/receiver-status-ui.js`**:
- Removed `export const MAX_RECONNECT_ATTEMPTS = 10`
- Added `RECONNECT_BACKOFF_MS = [1000, 2000, 5000, 10000, 30000]`
- Added `STABLE_RESET_THRESHOLD_MS = 30000`, `OVERLAY_HIDE_AFTER_STABLE_MS = 5000`
- Added `getBackoffDelay(n)` — returns `RECONNECT_BACKOFF_MS[min(n, 4)]`
- Added `loadBackoffState(storage)`, `saveBackoffState(state, storage)`, `clearBackoffState(storage)` — sessionStorage key `ssr-reconnect-state`
- Added `markStable(storage)` — calls `clearBackoffState`
- Added `markConnectionStable({now, store})`, `evaluateOverlayHide({now, store, hideAfterMs})` — module-level `_overlayStore` as default
- Added `showCountdownReconnect({doc, delayMs, attemptN, tickMs=500})` — returns `stop()` function

**`src/app/runtime/output-receiver/receiver-bootstrap.js`**:
- Removed `MAX_RECONNECT_ATTEMPTS` from imports
- Added imports: `getBackoffDelay`, `loadBackoffState`, `saveBackoffState`, `clearBackoffState`, `markStable`, `STABLE_RESET_THRESHOLD_MS`, `showCountdownReconnect`, `markConnectionStable`, `evaluateOverlayHide`, `OVERLAY_HIDE_AFTER_STABLE_MS`
- `reconnectAttempts` initialised from `loadBackoffState(backoffStorage).attempts` (sessionStorage)
- `waitForProducer` pre-flight gate called before first `tryConnect()`
- Catch block: no hard cap; `saveBackoffState` on every failure; `getBackoffDelay` for schedule
- Monitor interval disconnect: `saveBackoffState` + `connectionStore.connectionStableAtMs = null` reset
- Stable-reset check in monitor: after `>=STABLE_RESET_THRESHOLD_MS`, resets `reconnectAttempts=0` + `clearBackoffState`
- Re-exports: `getBackoffDelay`, `loadBackoffState`, `saveBackoffState`, `clearBackoffState`, `markStable`, `STABLE_RESET_THRESHOLD_MS`

**`test/ssr-receiver-disconnect-detection.test.mjs`**:
- Updated `MAX_RECONNECT_ATTEMPTS === 10` test → asserts `typeof MAX_RECONNECT_ATTEMPTS === "undefined"`

**Tests flipped GREEN**: B3, B4, B5a, B5b, B5c, B6, B6b, B7, cold-boot GREEN, fps-baseline #4, fps-baseline #5

---

### Task 3: Countdown Overlay Wiring + Boot Purge (D-B3/D-B4) — commit 7acf16b

**`src/server/ssr-mediasoup-router.mjs`**:
- Import `execSync` from `node:child_process`
- Added `export async function purgeStaleMediasoupWorker({exec, gracePeriodMs=200})` — callback-style exec interface, calls `pkill -f mediasoup-worker`, swallows errors, awaits grace period

**`server.mjs`**:
- Import `purgeStaleMediasoupWorker` from `ssr-mediasoup-router.mjs`
- Boot block: `await purgeStaleMediasoupWorker()` BEFORE `await bootMediasoupRouter()`

**`src/app/runtime/output-receiver/receiver-bootstrap.js`**:
- `countdownStop`, `connectionStore`, `overlayHidePoller` variables at bootReceiver scope
- `onConnectionStateChange("connected")`: calls `markConnectionStable`, starts `overlayHidePoller` (500ms interval, hides after `OVERLAY_HIDE_AFTER_STABLE_MS`), stops countdown
- `failed/ws-closed/disconnected`: resets `connectionStore.connectionStableAtMs`, clears `overlayHidePoller`
- `host-down`: stops countdown + overlay poller
- Error catch: `showCountdownReconnect({doc:document, delayMs, attemptN})` replaces `ui.showReconnect`
- Monitor disconnect: `showCountdownReconnect` replaces `ui.showReconnect`
- `stop()`: clears `overlayHidePoller` + calls `countdownStop()`

**Tests flipped GREEN**: B9a, B9b, B9c, B10a, B10b, B11a, B11b

---

## Test Results

| Metric | Before (Wave 0) | After (32-02) |
|--------|-----------------|---------------|
| Total tests | 267 | 268 |
| Pass | 243 | 264 |
| Skip (Block B) | 13 | 0 |
| Fail | 0 | 0 |

**Phase-32 specific suite**: 53 tests, 53 pass, 0 fail, 0 skip

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] broadcastProducerReady at module scope couldn't access connectionsByAddr**
- **Found during:** T1 implementation
- **Issue:** Plan suggested a module-level `broadcastProducerReady(state)` function, but `connectionsByAddr` is local to `attachWebRtcSignaling`. Module-level function had no access to it.
- **Fix:** Placed `broadcastProducerReady()` as a closure inside `attachWebRtcSignaling` where it has lexical access to `connectionsByAddr`.
- **Files modified:** `src/server/ssr-webrtc-signaling.mjs`

**2. [Rule 1 - Bug] purgeStaleMediasoupWorker uses callback-style exec, not execSync**
- **Found during:** T3 — test harness injected `(cmd, _opts, cb) => { cb(null, ...) }` style
- **Issue:** Plan said default `exec` should be `(cmd) => execSync(cmd)` (sync, no callback). Wave-0 tests inject callback-style (`exec(cmd, opts, cb)`).
- **Fix:** Made the function use a callback-based interface internally, with a default exec wrapper that calls `execSync` synchronously and invokes the callback idiom.
- **Files modified:** `src/server/ssr-mediasoup-router.mjs`

**3. [Rule 1 - Bug] loadBackoffState/saveBackoffState API mismatch**
- **Found during:** T2 — test expects `loadBackoffState(storage)` and `saveBackoffState({attempts}, storage)` but plan spec said `loadBackoffState({storage})` and `saveBackoffState({storage}, state)`.
- **Fix:** Implemented with the signature the tests require (storage as positional arg).
- **Files modified:** `src/app/runtime/output-receiver/receiver-status-ui.js`, test files

**4. [Rule 1 - Bug] ssr-receiver-disconnect-detection test asserted MAX_RECONNECT_ATTEMPTS === 10**
- **Found during:** T2 full suite run — pre-existing test broke when export was removed
- **Fix:** Updated test to assert `typeof MAX_RECONNECT_ATTEMPTS === "undefined"` (correct post-patch behavior)
- **Files modified:** `test/ssr-receiver-disconnect-detection.test.mjs`
- **Commit:** 496b3d3

**5. [Rule 1 - Bug] B10b test assertion used texts[length-2] but last entry is "4s"**
- **Found during:** T3 — with 500ms ticks after 1100ms we get ["5s", "5s", "4s"]; second-to-last is "5s" not "4s"
- **Fix:** Changed assertion to check `texts[texts.length - 1]` (last entry) which correctly shows "4s" after ~1000ms elapsed
- **Files modified:** `test/phase-32-status-overlay.test.mjs`

## Commits

| Hash | Message |
|------|---------|
| b147dcd | feat(32-02-T1): /api/ssr/ready producer-readiness gate + producer-ready WS broadcast (D-B5) |
| 496b3d3 | feat(32-02-T2): forever-retry adaptive backoff + sessionStorage state + waitForProducer gate (D-B2/D-B5) |
| 7acf16b | feat(32-02-T3): countdown overlay + server boot mediasoup-worker purge (D-B3/D-B4) |

## Known Stubs

None. All three levers are fully wired end-to-end. The overlay hide poller and stable-reset timer are active in production runtime.

## Manual UAT Checklist (Pi Hardware)

### Cold-Boot Cycle Test (run 10×)

1. Stop server completely (`pkill node` or systemctl stop)
2. Start server fresh (`node server.mjs`)
3. Observe server log: confirm `[server] purging stale mediasoup-worker (D-B4)` appears before `[ssr-mediasoup] router up`
4. Load Pi `/output/` page
5. Observe Pi: `RECONNECTING — Xs (attempt N)` countdown overlay appears while SSR tab boots
6. Confirm Pi connects within 70s without operator intervention
7. Confirm overlay hides after ≥5s stable connection
8. Check Pi sessionStorage: `ssr-reconnect-state.attempts` should reset to 0 after ≥30s stable

**Pass criterion**: 10/10 cycles connect without manual server restart.

### Pi Page Reload Test (run 10×)

1. With server running and Pi connected + stable for >30s
2. Reload Pi `/output/` page (F5 or `location.reload()`)
3. Pi should reconnect within 5s (producer is already up, `/api/ssr/ready` returns 200 immediately)
4. No reconnect storm (single attempt, then connected)
5. Confirm `attempts` from sessionStorage starts at 0 (stable-reset cleared it)

**Pass criterion**: 10/10 reloads reconnect in <5s.

### Backoff Persistence Test

1. Kill server while Pi is connected
2. Observe Pi cycling through 1s, 2s, 5s, 10s, 30s delays
3. Reload Pi page while server is still down
4. Confirm Pi does NOT restart from 1s — it resumes from current backoff level (sessionStorage persists)

## Threat Flags

No new threat surface beyond what was documented in the plan's threat model. The `/api/ssr/ready` endpoint is read-only, LAN-only, and leaks only that an SSR host exists. The `pkill` call is scoped to the dev-server assumption documented in code comments.

## Self-Check: PASSED

- FOUND: src/server/ssr-ready-handler.mjs
- FOUND: .planning/phases/phase-32/32-02-SUMMARY.md
- FOUND commit b147dcd (T1)
- FOUND commit 496b3d3 (T2)
- FOUND commit 7acf16b (T3)
- Full suite: 268 tests, 264 pass, 0 fail, 4 skip
