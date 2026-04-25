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
| C3 | `readJson` function declaration | board-profiles.js:2–12 | 2 (decl + export) | 0 |
| C3 | `writeJson` function declaration | board-profiles.js:14–21 | 2 (decl + export) | 0 |
| C3 | `readJson, writeJson` entries in `window.TT_BEAMER_PERSISTENCE` export | board-profiles.js:185–186 | 2 | 0 |
| C3 | `CORNER_KEYS` declaration | runtime-projection-mapping.js:62 | 2 (decl + export) | 0 |
| C3 | `CORNER_KEYS, beginGridWarpFrame, endGridWarpFrame` exports + legacy-compat comment | runtime-projection-mapping.js:1944–1948 | 4 lines | 0 |
| C3 | `isPolygonDragActive` function declaration | runtime-polygon-drag-support.js:49–51 | 2 (decl + export) | 0 |
| C3 | `isPolygonDragActive` export entry | runtime-polygon-drag-support.js:273 | 1 | 0 |
| C3 | `buildPlaybackCard(scope, def, boardId)` + 3-line header comment | animation-editor-view.js:579–608 | 1 | 0 |
| C4 | `quickModeActivateButton`, `quickModeDeactivateButton` querySelector entries + Phase 22 W2e legacy comment (4 lines) | runtime-dom-refs.js:159–164 | 2 | 0 |
| C4 | `quickModeActivateButton, quickModeDeactivateButton` destructure entry | runtime-orchestration.js:122 | 1 | 0 |
| C4 | `quickModeActivateButton, quickModeDeactivateButton` ctx-thread (1st) | runtime-orchestration.js:1331–1332 | 2 | 0 |
| C4 | `quickModeActivateButton, quickModeDeactivateButton` ctx-thread (2nd) | runtime-orchestration.js:2516–2517 | 2 | 0 |
| C4 | `quickModeActivateButton, quickModeDeactivateButton` destructure entry | runtime-wire-navigation-binders.js:23–24 | 2 | 0 |
| C4 | `quickModeActivateButton?.addEventListener` + `quickModeDeactivateButton?.addEventListener` no-op handler blocks (8 lines incl. blank lines + 1 obsolete comment line) | runtime-wire-navigation-binders.js:127–133 | 2 | 0 |
| C4 | DOM-refs comment in module-header listing dead refs (cosmetic update) | runtime-quick-mode.js:8–9 | 2 | 0 |

## Kept (false positive)

(none in Wave 1)

## Deferred to later wave

| Commit | Identifier | Reason | Defer-to |
|--------|------------|--------|----------|
| C5 (dropped) | All 110 dead-DOM-id candidates from RESEARCH.md §E (DOM-ref cleanup) | Per the plan's universal procedure decision rule, "if any of Steps 1–3 produces a match outside the dom-refs.js declaration site, KEEP the ref." Every one of the 110 candidates fails Step 2: the HTML `id` is missing from `index.html`, but the camelCase ref name still has live JS consumers (`?.addEventListener`, `if (ctx.X)` guards, `replaceChildren()` patterns, etc.). Removing the `dom-refs.js` entry without also pruning consumers would leave dead `?.`-chained calls scattered across the runtime — that expands C5 well beyond Wave 1's "subtractive, mechanical, grep-verified, no behaviour change" scope. Orchestrator decision 2026-04-25: drop C5 entirely from Wave 1; refs + consumers will be pruned together when the affected modules are touched. | Wave 3 (file decomposition). The consumer modules (`runtime-orchestration.js`, `runtime-wire-*.js`, `animation-editor-view.js`, `runtime-polygon-edit.js`, etc.) are scheduled to be split there; refs and consumers get removed as a paired unit in the same commit set. |

### C5 per-theme counts (deferral evidence)

| Theme | Dead ids | Consumer files | Consumer lines |
|-------|----------|----------------|----------------|
| C5.1 (low-risk legacy nav/quick-mode) | 9 | 2 | 18 |
| C5.2 (output-mode legacy) | 10 | 1 | 20 |
| C5.3 (animation-editor / polygon-editor legacy) | 72 | 3 | 557 |
| C5.4 (runtime wiring + misc) | 19 | 15 | 154 |
| **Total** | **110** | **~21 (some overlap)** | **~749** |

Source: RESEARCH.md §E candidate list cross-referenced against ripgrep of camelCase ref names across `src/`. Each candidate had at least one live consumer outside `runtime-dom-refs.js`. Full per-id breakdown lives in the C5 STOP report on the orchestrator chat thread.

## Kept (user-confirmed)

| Identifier | Reason | Asked date |
|------------|--------|-----------|
| `resources/animations/malfunction2.mp4` (58 MB) | User confirmed: alternative animation offered by default; intentional content. C7 skipped per user decision. | 2026-04-25 |

## End-of-wave verification

(filled in after C6)
