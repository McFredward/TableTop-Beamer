---
phase: 32
plan: W0
subsystem: testing
tags: [node-test, ssr, webrtc, reconnect, fps, xvfb, vaapi, mediasoup]

# Dependency graph
requires:
  - phase: phase-31
    provides: "SSR pipeline (ssr-render-host, ssr-stream-publisher, receiver-bootstrap, receiver-status-ui, server-encoder-detect, ssr-server-rendering-config) — Phase 32 tests extend these modules"
provides:
  - "11 new test files: 1 harness helper + 5 Block-A scaffolds + 5 Block-B scaffolds"
  - "Skip-gated assertions for all Phase-32 acceptance criteria (A1-A9, B1-B13)"
  - "RED-proof baseline: FPS_VALUES=[30,24,15], MAX_RECONNECT_ATTEMPTS=10, backoff cap=10000ms captured before any patches"
  - "Cold-boot reconnect-storm RED proof: hard cap check EXISTS in receiver-bootstrap.js"
affects:
  - "32-01 (FPS Lift Wave 1) — must flip A1-A9 skip-gated tests to GREEN"
  - "32-02 (Connection Stability Wave 1) — must flip B1-B13 skip-gated tests to GREEN"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Skip-gated test pattern: test('name', { skip: 'Wave 1 will...' }, () => { ... })"
    - "RED-proof baseline pattern: assert current (broken) state so Wave 1 GREEN is provable"
    - "Dynamic ESM loader helpers: loadXxx() wrapper for deferred module imports in unit tests"
    - "Mock factory pattern: mockSessionStorage(), mockDocument(), mockExistsSync() for browser-API stubs"

key-files:
  created:
    - test/helpers/phase-32-ssr-test-harness.mjs
    - test/phase-32-fps-baseline.test.mjs
    - test/phase-32-fps-presets.test.mjs
    - test/phase-32-server-rendering-config.test.mjs
    - test/phase-32-encoder-detect-vaapi.test.mjs
    - test/phase-32-xvfb-fakescreenfps.test.mjs
    - test/phase-32-producer-ready.test.mjs
    - test/phase-32-reconnect-backoff.test.mjs
    - test/phase-32-boot-cleanup.test.mjs
    - test/phase-32-status-overlay.test.mjs
    - test/phase-32-cold-boot-reconnect-repro.test.mjs
  modified: []

key-decisions:
  - "Skip-gate ALL Wave-1 assertions; only RED-proof baselines pass at Wave-0 close — ensures no false positives before patches land"
  - "Use fs.readFileSync source-grep for assertions that cannot import browser-targeted ESM modules (receiver-bootstrap.js, ssr-render-host.mjs)"
  - "B6b test checks receiver-status-ui.js (not bootstrap) for MAX_RECONNECT_ATTEMPTS = 10 — that's where the export lives"
  - "B9 test imports from ssr-mediasoup-router.mjs — Wave 1 must add purgeStaleMediasoupWorker export there or to a new module"

patterns-established:
  - "Phase-32 test naming: test/phase-32-{slug}.test.mjs"
  - "Harness helper at test/helpers/phase-32-ssr-test-harness.mjs — shared dynamic loaders + mocks"
  - "RED proof: baseline tests assert CURRENT broken state and MUST stay green at Wave-0 close"
  - "GREEN gate: skip-gated tests assert POST-patch state — Wave 1 removes skip when fix lands"

requirements-completed:
  - phase-32-block-A
  - phase-32-block-B

# Metrics
duration: 18min
completed: 2026-05-07
---

# Phase 32 Plan W0: SSR Stream Performance + Connection Stability Wave 0 Summary

**Skip-gated test scaffolding for 48 Phase-32 acceptance criteria across Block A (FPS lift) and Block B (reconnect stability), with RED-proof baseline capturing pre-patch state (FPS_VALUES=[30,24,15], MAX_RECONNECT_ATTEMPTS=10, backoff cap=10000ms)**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-05-07T00:00Z (approx)
- **Completed:** 2026-05-07T00:18Z (approx)
- **Tasks:** 3
- **Files created:** 11

## Accomplishments

- Created `test/helpers/phase-32-ssr-test-harness.mjs` with 8 exports (5 dynamic ESM loaders + 3 mock factories: mockSessionStorage, mockDocument, mockExistsSync)
- Created 5 Block-A test scaffolds (A1-A9): fps-presets, server-rendering-config, encoder-detect-vaapi, xvfb-fakescreenfps, fps-baseline — 27 tests, 5 pass (baseline), 22 skip-gated
- Created 5 Block-B test scaffolds (B1-B13): producer-ready, reconnect-backoff, boot-cleanup, status-overlay, cold-boot-reconnect-repro — 21 tests, 1 pass (RED proof), 20 skip-gated
- Phase 31 baseline preserved: full suite 263/217 pass / 0 fail / 46 skip (was 215/211/0/4)

## Task Commits

Each task was committed atomically:

1. **Task 1: Block-A test scaffolds + harness helper** - `4ca1d32` (feat)
2. **Task 2: Block-B test scaffolds** - `5d4e1da` (feat)
3. **Task 3: Full suite verification** - `cb1723e` (test)

## Files Created

- `test/helpers/phase-32-ssr-test-harness.mjs` — 8 exports: loadServerRenderingConfig, loadEncoderDetect, loadRenderHost, loadStatusUi, loadReceiverBootstrap, mockSessionStorage, mockDocument, mockExistsSync
- `test/phase-32-fps-baseline.test.mjs` — 5 RED-proof baseline tests, all pass (FPS_VALUES, STREAM_FPS_CAP_VALUES absent, alignModeBoost absent, MAX_RECONNECT_ATTEMPTS=10, backoff cap=10000ms)
- `test/phase-32-fps-presets.test.mjs` — 4 skip-gated A1-A3 (QUALITY_PRESETS streamFpsCap, resolveEncoderConfig, buildInPagePublisherScript)
- `test/phase-32-server-rendering-config.test.mjs` — 11 skip-gated A4-A7 (STREAM_FPS_CAP_VALUES enum, streamFpsCap validator x7, alignModeBoost validator x3, SERVER_RENDERING_DEFAULTS, applyServerRenderingPatch)
- `test/phase-32-encoder-detect-vaapi.test.mjs` — 4 skip-gated A8 (libva-decoupled VAAPI probe: hasVaapiDevice+hasLibva combo, probeLibvaRuntime export)
- `test/phase-32-xvfb-fakescreenfps.test.mjs` — 2 skip-gated A9 (-fakescreenfps arg in xvfbArgs, valid numeric value)
- `test/phase-32-producer-ready.test.mjs` — 4 skip-gated B1-B2/B12-B13 (/api/ssr/ready 503+200, waitForProducer true+false)
- `test/phase-32-reconnect-backoff.test.mjs` — 7 skip-gated B3-B7 (getBackoffDelay schedule, cap at 30s, sessionStorage round-trip, forever-retry, stable reset)
- `test/phase-32-boot-cleanup.test.mjs` — 3 skip-gated B9 (purgeStaleMediasoupWorker pkill, error-swallow, server.mjs ordering)
- `test/phase-32-status-overlay.test.mjs` — 4 skip-gated B10-B11 (showCountdownReconnect format, countdown decrement, markConnectionStable+evaluateOverlayHide thresholds)
- `test/phase-32-cold-boot-reconnect-repro.test.mjs` — 1 RED baseline (passes: hard cap check EXISTS) + 1 GREEN skip-gated (producer-readiness gate recovery simulation)

## Decisions Made

- Skip-gate all Wave-1 assertions so Wave-0 close is clean green; RED-proof baselines assert current broken state
- Use `fs.readFileSync` + string grep for modules that cannot be cleanly imported as ESM in test context (receiver-bootstrap.js has browser globals)
- B12/B13 (waitForProducer) inline mock implementation in test body to verify contract without importing the not-yet-existing export
- B9 test imports from `ssr-mediasoup-router.mjs` — Wave 1 must add `purgeStaleMediasoupWorker` export there

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Minor: `import.meta.url` path resolution for `readFileSync` in `phase-32-fps-baseline.test.mjs` initially used `../../src/...` (two levels up from helpers/) but file is in `test/` so corrected to `../src/...`. Fixed inline before commit.

## Skip-Gated Tests Wave 1 Must Flip GREEN

### Block A — FPS Lift (32-01 plans)

| Test ID | File | Skip Reason |
|---------|------|-------------|
| A1 | phase-32-fps-presets.test.mjs | Wave 1 will wire streamFpsCap into QUALITY_PRESETS/resolveEncoderConfig |
| A2 | phase-32-fps-presets.test.mjs | Wave 1 will add resolveEncoderConfig with streamFpsCap |
| A3a/A3b | phase-32-fps-presets.test.mjs | Wave 1 will wire streamFpsCap into buildInPagePublisherScript |
| A4a-A4g | phase-32-server-rendering-config.test.mjs | Wave 1 will add STREAM_FPS_CAP_VALUES + validator |
| A5a-A5c | phase-32-server-rendering-config.test.mjs | Wave 1 will add alignModeBoost to validator |
| A6 | phase-32-server-rendering-config.test.mjs | Wave 1 will add streamFpsCap/alignModeBoost to defaults |
| A7 | phase-32-server-rendering-config.test.mjs | Wave 1 will add new fields to KNOWN_KEYS |
| A8a-A8d | phase-32-encoder-detect-vaapi.test.mjs | Wave 1 will add libva probe to detectAvailableEncoders |
| A9a-A9b | phase-32-xvfb-fakescreenfps.test.mjs | Wave 1 will add -fakescreenfps to spawnXvfb() args |

### Block B — Connection Stability (32-02 plans)

| Test ID | File | Skip Reason |
|---------|------|-------------|
| B1-B2 | phase-32-producer-ready.test.mjs | Wave 1 will add /api/ssr/ready endpoint |
| B12-B13 | phase-32-producer-ready.test.mjs | Wave 1 will export waitForProducer from receiver-bootstrap.js |
| B3-B4 | phase-32-reconnect-backoff.test.mjs | Wave 1 will export getBackoffDelay with D-B2 schedule |
| B5a-B5c | phase-32-reconnect-backoff.test.mjs | Wave 1 will export loadBackoffState/saveBackoffState |
| B6-B6b | phase-32-reconnect-backoff.test.mjs | Wave 1 will remove MAX_RECONNECT_ATTEMPTS=10 hard cap |
| B7 | phase-32-reconnect-backoff.test.mjs | Wave 1 will export markStable |
| B9a-B9c | phase-32-boot-cleanup.test.mjs | Wave 1 will add purgeStaleMediasoupWorker to ssr-mediasoup-router.mjs |
| B10a-B10b | phase-32-status-overlay.test.mjs | Wave 1 will export showCountdownReconnect |
| B11a-B11b | phase-32-status-overlay.test.mjs | Wave 1 will export markConnectionStable + evaluateOverlayHide |
| GREEN repro | phase-32-cold-boot-reconnect-repro.test.mjs | Wave 1 will add producer-readiness gate |

## Full Suite Results at Wave-0 Close

| Metric | Before W0 | After W0 | Delta |
|--------|-----------|----------|-------|
| Total tests | 215 | 263 | +48 |
| Pass | 211 | 217 | +6 |
| Fail | 0 | 0 | 0 |
| Skip | 4 | 46 | +42 |

## Self-Check

- All 11 files exist at their specified paths ✓
- Commits 4ca1d32, 5d4e1da, cb1723e exist ✓
- Full suite exit code 0 ✓
- Pass count 217 ≥ 215 ✓
- Fail count 0 ✓
- Skip count 46 ≥ 24 ✓

## Self-Check: PASSED

---
*Phase: 32*
*Completed: 2026-05-07*
