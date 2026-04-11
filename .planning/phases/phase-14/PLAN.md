# PLAN — Phase 14 Refactoring + Module Split

## Objective

Reduce the largest runtime file from 14.6k LOC to a thin entry point (< ~1500 LOC) by extracting cohesive domain modules, and purge dead/legacy code in the process. No functional or visual changes.

## Non-functional constraints

- **Zero behavior change.** Every acceptance-regression harness in `debug/p11-*.mjs`, `debug/p12-*.mjs`, `debug/p13-*.mjs` must remain GREEN after each plan completion.
- **Atomic slices.** Each extraction is its own commit with a passing harness run. Half-extracted state does not land on master.
- **No speculative abstraction.** Extract modules around observable cohesion (same domain, same shared state). Do not introduce interfaces / adapters beyond what the extraction needs.
- **No file renames of currently-imported-by-HTML scripts** until a clear import graph is in place. Entry-point glue stays at its current path.

## Plan 14-1 — Inventory + Dead Code Purge

### Task list
1. **T1 Inventory.** Produce `INVENTORY.md` in the phase dir listing: file size matrix for `src/app/**`, number of top-level `function`s per file, exported symbols, and a candidate list of dead code (unused exports, commented-out blocks, legacy-Persistenzkommentare, `// removed`, `// legacy`, TODO graveyards).
2. **T2 Dead-code inventory verification.** For each dead-code candidate, prove disuse with a grep over the full repo (source + tests + debug). Produce `DEAD-CODE.md`.
3. **T3 Purge.** Delete each verified-dead candidate in its own atomic commit (one candidate per commit or one thematic cluster per commit). Run all harnesses after each commit.
4. **T4 Closure.** Summarise LOC delta per file in `14-1-SUMMARY.md`.

### Exit criteria
- `DEAD-CODE.md` enumerates every removed symbol with the grep that proved it dead.
- No Phase 11 / 12 / 13 harness regresses.
- Total LOC reduction quantified.

## Plan 14-2 — Runtime Module Split

### Candidate module boundaries (informed by section markers in the current file)

| New module | Scope |
|---|---|
| `src/app/runtime/state-bindings.js` | Shared state accessors + mutation helpers currently at the top of the file |
| `src/app/runtime/viewport-zoom.js` | Zoom/pan math, wheel + pinch handlers, cursor-anchored zoom, rAF pan writer |
| `src/app/runtime/touch-gesture.js` | Phase-13 HF4-HF7 touch gesture state machine |
| `src/app/runtime/polygon-editor.js` | Room polygon editor handles, vertex/edge/area drag pipeline, incremental SVG renderer, stable stretch anchor cache, HF9-HF13 drag math |
| `src/app/runtime/room-overlay.js` | `renderRoomOverlay`, per-room SVG assembly, transform helpers, hit-area calibration readers |
| `src/app/runtime/draw-loop.js` | `draw(now)`, `drawAnimation`, per-room composition, Phase 12 additive layering |
| `src/app/runtime/live-sync-glue.js` | `scheduleNextLiveSnapshotPoll`, live mutation emitters, snapshot apply, Phase 11 HF5/HF6 guards |
| `src/app/runtime/config-hydrate.js` | Phase 13-1 server-authoritative hydration, apply, dirty-flag, Apply/Discard UI wiring, Import-from-file |
| `src/app/runtime/settings-panels.js` | UI panel binding (room list, animation select, play area, inside/outside FX, hit area calibration) |
| `src/app/runtime/runtime-orchestration.js` | Thin entry point: imports modules, wires DOM, mounts event listeners, starts draw loop |

### Task list
1. **T1 Module boundary doc.** Produce `MODULE-BOUNDARIES.md` with: exact line ranges in the current file per module, entry symbols, shared-state touch matrix. Every function gets assigned to exactly one module; any function that touches shared state has its accessors listed.
2. **T2 Shared state seam.** Introduce a single shared-state accessor layer (one file) that every extracted module imports instead of reaching into the file-scope `state` / `liveSync` / DOM refs. Commit before any extraction.
3. **T3 Extract module A** (start with the lowest-coupling module, e.g. `viewport-zoom.js`). Move code out, leave only a re-export / delegation in the old file. Run all harnesses, commit atomically.
4. **T4..TN Extract subsequent modules** in dependency order (least coupled first, draw loop last). Each is its own commit with harnesses green.
5. **TN+1 Collapse the old file.** Once every module is extracted, the remaining `runtime-orchestration.js` should be a thin entry point (< ~1500 LOC).
6. **TN+2 Closure.** `14-2-SUMMARY.md` with pre/post LOC matrix and the new module map.

### Extraction rules
- **No behavior change.** Any diff that changes code other than moving it across files needs a written justification in the commit message.
- **Imports are explicit.** The extracted module imports only what it needs from the shared state layer, DOM, and other already-extracted modules. No circular imports.
- **Harness is the gate.** Each commit ends with `node debug/p13-hf13-acceptance-regression.mjs` (plus any other relevant harness) passing before it lands.
- **If an extraction would require > ~300 LOC of churn outside the moved code**, split it into a smaller extraction first.

### Exit criteria
- `src/app/runtime/runtime-orchestration.js` is under ~1500 LOC.
- No module in `src/app/**` exceeds ~1500 LOC as a soft cap. Hard cap: 2000 LOC.
- Every harness GREEN.
- `MODULE-BOUNDARIES.md` matches the shipped module layout.
- `14-2-SUMMARY.md` lists the new module tree and LOC per module.

## Risks (linked in `RISKS.md`)
- Hidden coupling via hoisted function references or module-scope `let` state.
- Hidden coupling via DOM query selectors executed at file load time.
- Live-sync glue touches both DOM and server; splitting may require introducing a small event bus.
- Startup order sensitivity: the current file is `<script>`-loaded and assumes declaration order.

## Success definition
User can grep `wc -l src/app/runtime/*.js` and see every file under ~1500 LOC. All Phase 11-13 acceptance harnesses still pass. No visible or functional differences at runtime.
