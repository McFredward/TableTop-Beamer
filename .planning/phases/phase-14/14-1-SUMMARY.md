# 14-1 SUMMARY — Inventory + Dead Code Purge

Status: **CLOSED PASS**
Commits: `f09a3e5` (inventory) → `fd3defe` → `f6bdd29` → `579c68e`

## Scope

Plan 14-1 was scoped to identify and remove unused / redundant code from the
runtime file and its dependencies, before the module split. No behavioral
change; harnesses remain GREEN throughout.

## LOC delta

| File | Before | After | Δ |
|---|---:|---:|---:|
| `src/app/runtime/runtime-orchestration.js` | 14 658 | 14 574 | **−84** |
| `src/app/persistence/board-profiles.js` | 232 | 188 | **−44** |
| **Total** | **14 890** | **14 762** | **−128** |

Matches inventory projection of 100–300 LOC removed.

## Symbols removed

| # | Symbol | Location | Reason |
|---|---|---|---|
| D1 | `loadLegacyRoomGeometryByBoard` (runtime local stub) | runtime-orchestration.js:3446 | Always returned defaults after Phase 13-1 removed localStorage |
| D2 | `loadLegacySpecialPolygonsByBoard` (runtime local stub) | runtime-orchestration.js:3450 | Same pattern |
| D3 | `legacyHitarea` / `legacyRoomGeometry` / `legacySpecialPolygons` parameter thread in `buildMigratedBoardProfiles` | board-profiles.js + runtime-orchestration.js | Dead after D1/D2; fallback branches inside `buildMigratedBoardProfiles` collapsed |
| D4 | `removeLegacyRoomHoldControl` | runtime-orchestration.js:277 | `#room-hold` no longer in index.html |
| D5 | `ensureInsideLoopUntilStopControl` | runtime-orchestration.js:254 | `#inside-loop-until-stop` always present in index.html, function body unreachable |
| D6 | `boardZoomRangeInput = null`, `boardZoomValue = null` | runtime-orchestration.js:233-234 | Placeholders with zero references anywhere |
| D11 | `loadHitareaCalibrationMap` (runtime local stub) | runtime-orchestration.js:4104 | Same pattern as D1/D2 |
| D12 | `persistHitareaCalibrationMap` | runtime-orchestration.js:4111 | 1-line wrapper with misleading name; inlined to `persistBoardProfiles()` at both call sites |
| — | Unused imports `writePersistenceJson`, `loadLegacy*FromPersistence`, `loadHitareaCalibrationMapFromPersistence` | runtime-orchestration.js:1889-1894 | Imported but never called after D1/D2/D11 removal |
| — | `loadLegacyRoomGeometryByBoard`, `loadLegacySpecialPolygonsByBoard`, `loadHitareaCalibrationMap` (persistence module) | board-profiles.js:86-119 | No remaining callers |

## Non-regression

4 harnesses run after each commit:
- `debug/p11-hf4-acceptance-regression.mjs` → PASS
- `debug/p11-hf6-acceptance-regression.mjs` → PASS
- `debug/p12-1-acceptance-regression.mjs` → PASS
- `debug/p13-hf13-acceptance-regression.mjs` → PASS

Older harnesses (p13-1, p13-2, p13-3, p13-hf7..hf12) are location-pinned on
code patterns that were superseded by later hotfixes. Their current FAIL
state is historical and not a regression — see `EXECUTE.md` and
`ACCEPTANCE.md`. They are not live gates for Phase 14.

## Handoff to Plan 14-2

The remaining monolith is **14 574 LOC** with **549** top-level functions.
The target (< 1500 LOC) requires moving ~13 000 LOC into domain modules.
Plan 14-2 begins immediately with `MODULE-BOUNDARIES.md` and the
shared-state seam.
