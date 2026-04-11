# DEAD-CODE — Phase 14 Plan 14-1 T2

Verification results for candidates D1..D10 from `INVENTORY.md`.

## Confirmed dead (safe to remove)

### D1 — `loadLegacyRoomGeometryByBoard` (runtime-orchestration.js:3446)
- Body: `return createDefaultRoomGeometryByBoard();` — always returns defaults since Phase 13-1 removed localStorage.
- Only caller: `loadBoardProfiles()` at line 3480.
- The persistence helper (`src/app/persistence/board-profiles.js:86`) is fed-from-localStorage and still live — but the runtime stub bypasses localStorage entirely by calling the default factory.
- **Action**: delete the stub, delete the `legacyRoomGeometry` local in `loadBoardProfiles`, drop the parameter thread.

### D2 — `loadLegacySpecialPolygonsByBoard` (runtime-orchestration.js:3450)
- Same pattern as D1: stub returns defaults.
- Only caller: `loadBoardProfiles()` at line 3481.
- **Action**: same pattern as D1.

### D3 — `buildMigratedBoardProfiles` `legacyHitarea` / `legacyRoomGeometry` / `legacySpecialPolygons` parameters (board-profiles.js:122)
- Used at board-profiles.js lines 169, 173, 180 as `legacy*[boardId]` fallbacks.
- After D1/D2 removal the caller passes defaults, making these fallbacks identical to the `createDefault*Map(boardId)` branches that follow them. The chain `profile.x ?? legacy[boardId] ?? createDefault(boardId)` collapses to `profile.x ?? createDefault(boardId)`.
- **Action**: drop the three parameters from the persistence module's signature, drop the fallback branches, and simplify the runtime caller accordingly. Also drop the thread-through re-exports in `window.TT_BEAMER_PERSISTENCE`.

### D4 — `removeLegacyRoomHoldControl` (runtime-orchestration.js:277)
- Queries `#room-hold`. Grep of `index.html` confirms the element is not in the template:
  ```bash
  grep -n '#room-hold\|room-hold' index.html
  # (no output)
  ```
- Only call site: line 283, immediate IIFE-time invocation.
- **Action**: delete both function and call site.

### D5 — `ensureInsideLoopUntilStopControl` (runtime-orchestration.js:254)
- Creates `#inside-loop-until-stop` **only if** `insideLoopUntilStopInput` is null. But line 219 already reads `document.querySelector("#inside-loop-until-stop")` and index.html line 406 ships the element, so `insideLoopUntilStopInput` is never null at startup.
- Verification:
  ```bash
  grep -n '#inside-loop-until-stop' index.html
  # index.html:406:          <input id="inside-loop-until-stop" type="checkbox" />
  ```
- The entire function body is unreachable on a fresh page load. Only call site is at line 282.
- **Action**: delete both function and call site.

### D11 — `loadHitareaCalibrationMap` (runtime-orchestration.js:4171) *(not in original inventory, found during T2 verification)*
- Same pattern as D1/D2: local stub returning `createDefaultHitareaCalibrationMap()`, with a comment that explicitly says "localStorage persistence removed; defaults only".
- Only caller: `loadBoardProfiles()` at line 3479.
- The imported version `loadHitareaCalibrationMapFromPersistence` (line 1923) is shadowed by this local stub and never actually called.
- **Action**: delete the local stub and its caller's `legacyHitarea` local. Drop the `loadHitareaCalibrationMap` re-export from `window.TT_BEAMER_PERSISTENCE` because nothing in the runtime uses it anymore.

### D12 — `persistHitareaCalibrationMap` (runtime-orchestration.js:4178) *(found during T2)*
- Body: `return persistBoardProfiles();` — a 1-line wrapper with misleading name.
- Two call sites (12100, 12109) both handle hit-area-calibration reset / apply UI events.
- **Action**: inline the single `persistBoardProfiles()` call at both sites, remove the wrapper.

## False positives (keep)

### D6 — `SETTINGS_EXCLUSIVE_CONTROL_IDS` entries
- Even though `export-global-defaults` / `import-global-defaults` / `board-zoom-range` controls are gone from the DOM, the `SETTINGS_EXCLUSIVE_CONTROL_IDS` array is iterated by a defensive-disable loop that silently skips missing elements:
  ```js
  const el = document.querySelector(`#${id}`);
  if (el) el.disabled = !inSettings;
  ```
  So stray entries are harmless AND the array serves as a historical index of IDs the settings view owns. Removal would require tracking what did/didn't come from each phase. Not worth the risk for 3 strings.
- **Action**: leave as-is. Document as intentional.

### D7 — HF12 frozen-transform symbols
- Already removed in HF13 commit `71f72cb`. Mentioned in inventory for non-regression guard only. `debug/p13-hf13-acceptance-regression.mjs` gate G13-HF13-6 proves they stay removed.
- **Action**: no code change.

### D8 — `toOverlayUnits`
- Already removed in HF11. No code change.

### D9 — Duplicate polygon normalization helpers
- Inventory flagged `normalizePolygonPoint` / `normalizeSpecialPolygon` / `isRenderableNormalizedPolygon` / `getNormalizedPolygonArea` as duplicates between `runtime-orchestration.js` and `src/app/runtime/polygon-contract.js`.
- **Not a duplicate**: the runtime version uses `clampRoomAbsoluteCoordinate` with range `[-0.2, 1.2]` (allowing off-board vertices), while the polygon-contract version uses `clampNormalizedCoordinate` with range `[0, 1]` (strict board bounds). Different semantics, intentional.
- **Action**: leave as-is. Annotate inline comments to explain the difference if Plan 14-2 extracts them into a module.

### D10 — Unreferenced functions
- Full-file cross-reference scan would require building a symbol graph. Out-of-scope for this T2 verification cycle; any symbols still unreferenced after Plan 14-2 extractions will be caught in a final sweep.
- **Action**: defer to end-of-phase cleanup.

## Removal plan

One commit per cluster:

1. **Commit 1** — D4 + D5 (startup DOM legacy stubs). ~30 LOC.
2. **Commit 2** — D1 + D2 + D11 (legacy localStorage stubs + `loadBoardProfiles` simplification). ~30 LOC.
3. **Commit 3** — D3 (drop `legacy*` parameter thread in `buildMigratedBoardProfiles`, simplify persistence fallbacks, simplify caller). Cross-file change: `runtime-orchestration.js` + `board-profiles.js`. ~40 LOC.
4. **Commit 4** — D12 (inline `persistHitareaCalibrationMap` wrapper). ~10 LOC.

Each commit ends with a full harness sweep:
```
node debug/p11-hf6-acceptance-regression.mjs
node debug/p12-1-acceptance-regression.mjs
node debug/p13-1-acceptance-regression.mjs
node debug/p13-2-acceptance-regression.mjs
node debug/p13-3-acceptance-regression.mjs
node debug/p13-hf7-acceptance-regression.mjs
node debug/p13-hf8-acceptance-regression.mjs
node debug/p13-hf9-acceptance-regression.mjs
node debug/p13-hf10-acceptance-regression.mjs
node debug/p13-hf11-acceptance-regression.mjs
node debug/p13-hf13-acceptance-regression.mjs
```

Expected total LOC delta from Plan 14-1: ~100 LOC removed from runtime-orchestration.js + ~10 LOC from board-profiles.js = ~110 LOC total.
