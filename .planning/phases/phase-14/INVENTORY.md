# INVENTORY — Phase 14

Snapshot taken 2026-04-11 at commit `9accd14` (just after Phase 13 closure).

## File size matrix — `src/app/**`

```
LOC   File
14658 src/app/runtime/runtime-orchestration.js   ← the monster
  479 src/app/api/global-defaults-api.js
  466 src/app/shared/config.js
  427 src/app/runtime/core/polygon-contract.js
  246 src/app/shared/normalizers.js
  232 src/app/persistence/board-profiles.js
  178 src/app/domain/rooms.js
  168 src/app/state/runtime-state.js
   98 src/app/domain/event-lifecycle.js
   96 src/app/state/live-sync-state.js
   86 src/app/render/viewport-lifecycle.js
   81 src/app/shared/logger.js
   73 src/app/ui/runtime-panels-controller.js
   41 src/app/domain/live-sync-domain.js
   33 src/app/ui/settings/rooms.js
   25 src/app/shared/runtime-env.js
   25 src/app/boot/app-composition.js
   20 src/app/sync/sync-handlers.js
   20 src/app/settings/settings-controllers.js
   20 src/app/media/media-handlers.js
   20 src/app/input/interaction-guards.js
   20 src/app/editor/editor-flows.js
   14 src/app/boot/runtime-bootstrap.js
```

Total: **17 526** LOC across 23 files. `runtime-orchestration.js` alone is **83.6%** of the codebase and has **549** top-level `function` declarations plus ~260 other top-level `const`/`let` bindings (812 declarations total).

Every other file in `src/app/**` is already under the 1500 LOC soft cap. The refactor is single-target.

## Phase section markers inside `runtime-orchestration.js`

Below are the `// Phase ...` comment markers in the current file, used as anchors when assigning code to new modules in Plan 14-2 T1.

| Line | Comment |
|---:|---|
| 68 | Phase 13-1: Save-to-global + Load-apply buttons removed from DOM |
| 229 | Phase 13-2: zoom slider removed — wheel + pinch gestures replace it |
| 589 | Phase 13-HF3: opt-in save dirty-flag state |
| 597 | Phase 13-HF13: stable stretch-anchor cache |
| 2245 | Phase 13-2: zoom range [0.25, 4.0] + wheel + pinch anchors |
| 2317 | Phase 13-3: coarse-pointer detection |
| 2347 | Phase 13-3: polygon pointerdown acceptability guard |
| 3443 | Phase 13-1: legacy localStorage readers disabled (stubs) |
| 3473 | Phase 13-1: hydrate-from-bootstrap instead of localStorage |
| 3508 | Phase 13-HF3: every mutation flips localConfigDirty |
| 3608 | Phase 13-1: server-unreachable blocking overlay |
| 4384 | Phase 13-HF5: rAF-coalesced zoom/pan writer |
| 8884 | Phase 13-HF13: stable stretch-anchor getter |
| 12192 | Phase 13-2: zoom slider removed (wheel + pinch block start) |
| 12196 | Phase 13-HF6: global touch-gesture-active flag |
| 12203 | Phase 13-HF8: polygonDragActive flag |
| 12214 | Phase 13-HF8: scheduleRoomOverlayRender rAF coalescer |
| 12233 | Phase 13-HF9: incremental SVG drag renderer helpers |
| 12297 | Phase 13-HF11: incremental renderer consumes overlay-space points |
| 12360 | Phase 13-HF12: applyIncremental{Room,Ship}Drag signatures |
| 12379 | Phase 13-HF13: projectDisplayNormalizedToRoomRaw |
| 12402 | Phase 13-HF8: begin/endPolygonDragInteraction lifecycle |
| 12438 | Phase 13-HF6: cached stage geometry (avoid forced reflows) |
| 12465 | Phase 13-HF4: cursor-anchored zoom math |
| 14300 | Phase 13-1: runtime settings persistence via server |
| 14314 | Phase 13-1: Import-from-file JSON POST |
| 14364 | Phase 13-HF3: Apply / Discard buttons + beforeunload guard |
| 14391 | Phase 13-HF3: browser-native unload prompt |

## Proposed domain cuts (from section markers)

The markers cluster into a rough six-domain split:

1. **Zoom / pan + cursor-anchored math** — markers at 229, 2245, 4384, 12192, 12438, 12465. Estimated ~900–1100 LOC.
2. **Touch gesture state machine** — marker at 12196 plus surrounding blocks. Estimated ~600–800 LOC.
3. **Polygon editor + drag pipeline** — markers at 12203, 12214, 12233, 12297, 12360, 12379, 12402; plus the stretch-anchor cache at 597, 8884; plus the coarse-pointer helpers at 2317, 2347. Estimated ~2500–3000 LOC. Largest module.
4. **Room overlay render + hit testing** — the non-marker region around `renderRoomOverlay` (line ~9000) and `renderPolygonEditorHandles` (line ~8200). Estimated ~1500–1800 LOC.
5. **Config hydrate + opt-in save UI** — markers at 68, 589, 3443, 3473, 3508, 3608, 14300, 14314, 14364, 14391. Estimated ~1800–2200 LOC.
6. **Draw loop + animation composition** — `draw(now)` + `drawAnimation` + Phase 12 additive layering. Estimated ~1200–1500 LOC.

Remaining ~3000 LOC after these six cuts: shared state binding, UI panel binding (room list, animation select, inside/outside FX panels, play area panels), startup/wiring. This becomes the thin entry point plus one or two smaller modules (`settings-panels.js`, `state-bindings.js`).

## Dead-code candidates (pre-verification)

These are symbols that look dead by inspection. Each must be verified by a cross-repo grep in Plan 14-1 T2 before removal.

| # | Symbol / construct | Location | Why it looks dead |
|---|---|---|---|
| D1 | `loadLegacyRoomGeometryByBoard` | 3446 | Body returns `createDefaultRoomGeometryByBoard()`. Exists only to feed the now-server-authoritative `buildMigratedBoardProfiles`. |
| D2 | `loadLegacySpecialPolygonsByBoard` | 3450 | Same pattern as D1. |
| D3 | `buildMigratedBoardProfiles`'s `legacyHitarea` / `legacyRoomGeometry` / `legacySpecialPolygons` parameters | 3454 | All three callers pass defaults. The parameters are thread-through leftovers from the pre-Phase-13-1 localStorage migration path. |
| D4 | `removeLegacyRoomHoldControl` | 277 | Removes a DOM element that the Phase 11 template no longer contains. Runs once at startup; no-op for every load since the HTML was updated. |
| D5 | `ensureInsideLoopUntilStopControl` | 282 | Creates a DOM node (`#inside-loop-until-stop`) that the HTML template likely already ships with since HF1. Needs verification. |
| D6 | `SETTINGS_EXCLUSIVE_CONTROL_IDS` entries `export-global-defaults`, `import-global-defaults`, `board-zoom-range` | 291-305 | Comments in-place state these controls are removed from DOM. The ids may still be referenced elsewhere as lookup fallbacks. |
| D7 | Every HF12 literal: `createFrozenRoomTransform`, `projectRawToDisplayWithFrozenTransform`, `projectDisplayToRawWithFrozenTransform`, `computeRoomDisplayOverlayPointsFrozen`, `dragFrozenTransform` | — | Already verified removed in HF13 commit `71f72cb`; harness `debug/p13-hf13-acceptance-regression.mjs` gate G13-HF13-6 is the proof. No action needed but listed here for completeness. |
| D8 | `toOverlayUnits` helper | (removed in HF11) | Already removed. Listed for non-regression guard. |
| D9 | Commented-out `localStorage` references | unknown | Earlier phases left breadcrumb comments mentioning `localStorage`. These are docs, not code — grep to confirm no `localStorage.set/get` calls remain. |
| D10 | Any function not referenced anywhere | — | Full-file cross-reference scan to run in Plan 14-1 T2. |

## Non-monolith file observations

- `src/app/runtime/core/polygon-contract.js` (427 LOC) already defines `normalizePolygonPoint` / `normalizeSpecialPolygon` / `isRenderableNormalizedPolygon` / `getNormalizedPolygonArea`. `runtime-orchestration.js` at 2464, 2480, 2487 declares **duplicate** copies of the same functions. Candidate for dedup in Plan 14-2.
- `src/app/state/runtime-state.js` (168 LOC) already exports `createInitialState`. The stretch-anchor cache added in HF13 lives on the state as `state.roomStretchAnchorCache = new Map()` assigned after `createInitialState`. Plan 14-2 T2 can fold that into the state factory.
- `src/app/persistence/board-profiles.js` (232 LOC) owns `buildMigratedBoardProfiles` etc. Runtime file currently has a thin wrapper forwarding to it — so the wrapper plus `legacy*` stubs disappear together once D1–D3 are verified dead.

## Plan 14-1 exit from this inventory

- **D1 / D2 / D3** → likely one atomic commit removing the three legacy stubs + their call sites + the parameter thread.
- **D4 / D5** → each one commit, contingent on HTML template verification.
- **D6** → one commit for SETTINGS_EXCLUSIVE_CONTROL_IDS pruning (if grep confirms the ids are truly orphan).
- **D7 / D8** → no action; reference only.
- **D9 / D10** → full grep sweep first, then commits for whatever actually shows up.

Target LOC delta for Plan 14-1: 150–300 LOC removed from `runtime-orchestration.js`. Small in absolute terms, but it reduces the surface area Plan 14-2 has to move.
