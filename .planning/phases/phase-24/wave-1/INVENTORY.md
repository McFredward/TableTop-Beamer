# Phase 24 Wave 1 — Removal Inventory

Updated incrementally as each commit lands. Last update: 2026-04-25.

## Baseline (pre-flight)

| Grep | Initial count |
|------|---------------|
| `console.info(` in src/ | 10 |
| `__TT_*_DEBUG__` in src/ | 1 |
| `console.log(` in src/ | 0 |
| `console.debug(` in src/ | 1 |
| `TT_BEAMER_LIVE_SYNC_DEBUG` in src/ | 1 (runtime-bootstrap.js:230) |

Decisions:
- **Logger.js carve-out:** ACCEPTED. Acceptance amended to "zero `console.info(` outside `src/app/lib/shared/logger.js`."
- **`window.TT_BEAMER_LIVE_SYNC_DEBUG`:** REMOVE in C1. User decision 2026-04-25 — debug-only DevTools snapshot bag with zero src/ readers, parallel to `__TT_CLUSTER_DEBUG__`.
- **`malfunction2.mp4` (58 MB):** KEEP. User decision 2026-04-25 — alternative animation offered by default. C7 deferred / skipped entirely.
- **Pre-migration backup:** `git tag phase-24-w1-start` already set on pre-execution HEAD (`450902d`). Rollback target.
- **Pre-flight tree state:** uncommitted runtime config saves + a deleted readme gif were stashed as `phase-24-w1-prestart` to clear the working tree before C1.

## Removed

| Commit | Identifier | File:Line (pre) | Pre-grep | Post-grep |
|--------|------------|-----------------|----------|-----------|
| C1 | `if (window.__TT_CLUSTER_DEBUG__) { console.info("[cluster-pads] board=", ...) }` block | runtime-animation-lifecycle.js:1201–1208 | 1 | 0 |
| C1 | `console.info("[cluster-pad] click", ...)` | runtime-animation-lifecycle.js:1251 | 1 | 0 |
| C1 | `console.info("[cluster-pad] tap-action route", ...)` | runtime-animation-lifecycle.js:1302 | 1 | 0 |
| C1 | `console.info("[cluster-pad] toggle entry", ...)` | runtime-animation-lifecycle.js:1331–1337 | 1 | 0 |
| C1 | `console.info("[cluster-pad] -> STOP same-type path", ...)` | runtime-animation-lifecycle.js:1339 | 1 | 0 |
| C1 | `console.info("[cluster-pad] -> START path ...")` | runtime-animation-lifecycle.js:1347 | 1 | 0 |
| C1 | `console.info("[cluster-pad] startRoomAnimationFromDraft returned (sync)")` | runtime-animation-lifecycle.js:1360 | 1 | 0 |
| C1 | `console.info("[cluster-pad] dispatch toggle result", ...)` block (also kills `beforeClusterCount` ReferenceError) | runtime-animation-lifecycle.js:1377–1385 | 1 | 0 |
| C1 | `console.info("[cluster-pad] CLEAR all", ...)` | runtime-animation-lifecycle.js:1397 | 1 | 0 |
| C1 | `const beforeCount = state.runningAnimations.length;` (only consumer was deleted log) | runtime-animation-lifecycle.js:1321 | 1 | 0 |
| C1 | `window.TT_BEAMER_LIVE_SYNC_DEBUG = { getLiveTraceSnapshot: ... }` (debug-only DevTools snapshot bag) | runtime-bootstrap.js:230–232 | 1 | 0 |
| C2 | `runtime-wire-calibration-binders.js` (entire 23-line no-op module deleted) | src/app/runtime/wire/runtime-wire-calibration-binders.js | 3 (declaration + export object + module-global write) | 0 |
| C2 | `<script src=".../runtime-wire-calibration-binders.js" defer>` tag | index.html:862 | 1 | 0 |
| C2 | `window.TT_BEAMER_RUNTIME_WIRE_CALIBRATION_BINDERS.wireCalibrationBinders({ ... })` orchestration call (~32 lines incl. ctx-thread args + Phase 14-2 comment) | runtime-orchestration.js:2539–2570 | 1 | 0 |

## Kept (false positive)

| Commit | Identifier | Reason | Consumer |
|--------|------------|--------|----------|

## Kept (user-confirmed)

| Identifier | Reason | Asked date |
|------------|--------|-----------|
| `resources/animations/malfunction2.mp4` (58 MB) | User confirmed: alternative animation offered by default; intentional content. C7 skipped per user decision. | 2026-04-25 |

## End-of-wave verification

(filled in after C6)
