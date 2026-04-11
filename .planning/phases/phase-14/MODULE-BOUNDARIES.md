# MODULE-BOUNDARIES — Phase 14-2

## Current state (after Plan 14-2 T1..T3)

```
LOC   File                                              Status
14142 src/app/runtime/runtime-orchestration.js         entry + orchestration + not-yet-extracted domains
  287 src/app/runtime/runtime-polygon-drag-support.js  extracted (T1)
  235 src/app/runtime/runtime-room-geometry.js         extracted (T2)
   88 src/app/runtime/runtime-polygon-normalizers.js   extracted (T3)
  427 src/app/runtime/polygon-contract.js              pre-existing
```

The runtime directory now holds five JS files. The monolith is still
far from the <1500 LOC soft cap but the extraction pattern is
validated and the remaining boundaries are mapped for iterative
future work.

## Extraction pattern (validated in T1..T3)

Every extracted module follows the same three-step contract:

1. **IIFE + init(deps).** The module wraps its function declarations
   in `(() => { ... })()` and exposes its public API via
   `window.TT_BEAMER_RUNTIME_<NAME>`. An `init(dependencies)` function
   caches the shared runtime objects (state, DOM refs, upstream
   helpers) in module-private variables.

2. **Script load order.** `<script src=".../runtime-<name>.js" defer>`
   sits BEFORE `runtime-orchestration.js` in `index.html`. The module
   registers its API on `window` at script-load time but does NOT
   execute any of its dependency-requiring logic. That logic runs
   only when `runtime-orchestration.js` top-level init code calls
   `init(...)`.

3. **Destructured at the seam.** At the line where the old function
   declarations lived, `runtime-orchestration.js` calls the module's
   `init(...)` and then destructures the public API back into its
   own lexical scope:
   ```js
   window.TT_BEAMER_RUNTIME_X.init({ state, liveSync, /* ... */ });
   const { foo, bar } = window.TT_BEAMER_RUNTIME_X;
   ```
   Existing call sites in the runtime file now resolve `foo`/`bar`
   against the destructured bindings instead of the deleted local
   function declarations. No other call-site changes are needed.

## Modules extracted (3 of ~8 planned)

| Module | LOC | Responsibility |
|---|---:|---|
| `runtime-polygon-drag-support.js` | 287 | polygon drag flag, rAF overlay render coalescer, cached drag DOM refs, incremental SVG writer, `begin/endPolygonDragInteraction`, cached stage geometry. `isHeavyInteractionActive` uses a ctx-supplied getter so the touch gesture state machine can stay in the runtime file. |
| `runtime-room-geometry.js` | 235 | `applyHitareaCalibration`, `getRoomCenterFromPoints`, `getStableRoomStretchAnchor` (HF13 cache), `getRoomTransform`, `getRoomPoints`, `getRoomLabelPosition`, `getRoomPolygonPixels`, `getShipPolygonPixels`, `getPlayAreaPolygonsPixels`, `getRoomRenderMetrics`. |
| `runtime-polygon-normalizers.js` | 88 | Permissive [-0.2, 1.2] runtime normalizers: `normalizePolygonPoint`, `getNormalizedPolygonArea`, `isRenderableNormalizedPolygon`, `normalizeSpecialPolygon`, `isValidSpecialPolygon`. Reads `clampRoomAbsoluteCoordinate` from `window.TT_BEAMER_NORMALIZERS` directly — no ctx needed. |

## Candidate modules for future extractions (not yet extracted)

Listed in rough order of increasing coupling (extract the lowest-
coupling ones first):

### `runtime-clamp-helpers.js` — low coupling
Bundles the small clamp helpers scattered throughout the file:
`clampRoomIntensity`, `clampRoomOpacity`, `clampGifPlaybackSpeed`,
`clampRoomStretch`, `clampPolygonHandleScale`, `clampBoardZoomScale`,
`clampHitareaScale`, `clampRoomRelativeOffset`, `clampAnimationSpeed`.
~60 LOC. Zero state dependencies.

### `runtime-polygon-metrics.js` — low coupling
`getCoarsePointerHitMultiplier`, `getPolygonEditorHandleMetrics`,
`getCurrentPolygonHandleScale`, `isAcceptablePolygonPointerEvent`.
Handle sizing + pointer acceptability. Reads `state.polygonEditor.handleScale`.
~60 LOC.

### `runtime-viewport-zoom.js` — medium coupling
`getBoardZoom`, `setBoardZoom`, `syncStageZoomTransform`,
`syncBoardZoomStatus`, `syncBoardZoomPanel`, `scheduleZoomUpdate`,
`updateCurrentBoardZoom`, `fitZoomToActiveSpecialRoom`,
`canStartPanModeFromEvent`, `startPanMode`, `endPanMode`,
`setPanCursorState`, `isPanArbitrating`, `getStagePanBounds`,
`clampPanToBounds`, `computePanForZoomFocus`.
Zoom/pan core. Deps: `state`, `stage`, `boardZoomStatus`, `boardPanStatus`,
`roomOverlay`, `triggerFeedback`, `getRoomPoints`, `getRoomCenterForZoom`,
`touchGestureActive` (via ctx-getter).
~500 LOC.

### `runtime-touch-gesture.js` — medium coupling
The HF4/HF5/HF6 touch gesture state machine: `touchGesture` state,
pinch handlers, press-and-hold drag commit, `isHeavyInteractionActive`
feed. Deps: `state`, `stage`, DOM refs, `polygonDragActive`,
`refreshStageGeometryCache`, `cancelPendingZoomRaf`,
`commitTouchHoldDrag`, polygon editor entry points.
~700 LOC.

### `runtime-overlay-render.js` — high coupling
`renderRoomOverlay`, `renderPolygonEditorHandles`,
`renderShipPolygonEditorHandles`, plus related DOM build helpers.
Each render function attaches pointerdown listeners that reference
`begin*Drag` / `beginPendingPolygonAreaDrag` / `beginShipPolygonVertexDrag`.
Those have to be passed as callbacks through the ctx.
~350 LOC but noisy injection graph.

### `runtime-draw-loop.js` — high coupling
`draw`, `drawAnimation`, `drawAnimationSafely`, `drawRoomComposition`,
`drawInsideGlobalVisual`, `drawOutsideFxLayer`, `drawEffectVisual`,
plus per-animation coded effect functions. Deps: everything in the
animation pipeline, `ctx`, `canvas`, `state`, `getRoom*`,
`roomConcurrencyByKey`, Phase 12 additive layering.
~2500 LOC. Largest module.

### `runtime-config-hydrate.js` — medium coupling
`loadBoardProfiles`, `applyBoardProfilesToState`,
`applyPersistedRuntimeSettings`, `buildMigratedBoardProfiles`,
`markLocalConfigDirty`, `clearLocalConfigDirty`,
`refreshApplyDiscardButtonsUi`, `persistBoardProfiles`,
`scheduleGlobalConfigWrite`. Plus the Apply/Discard/Import event
handlers. Deps: `state`, many DOM refs, `renderRoomOverlay`,
`syncRoomPanelFromSelection`, lots of sync*.
~600 LOC.

### `runtime-settings-panels.js` — high coupling
The ~30 `syncXxxPanel()` / `syncXxxStatus()` functions that keep the
settings UI in lockstep with state. Each one reads state + writes
DOM. Deps: every DOM ref in the file.
~2000 LOC.

### `runtime-live-sync-glue.js` — high coupling
`emitLiveMutation`, `applySnapshotRuntimeState`,
`scheduleNextLiveSnapshotPoll`, hydration glue, Phase 11 HF5/HF6
seen-revision guards. Deps: `liveSync`, every sync* panel, every
state mutator.
~800 LOC.

## Total projected extraction

If all nine modules above were extracted (including the three
already done), the remaining `runtime-orchestration.js` shell would
be ~3000-4000 LOC: top-level state + DOM ref declarations, module
init calls, event listener attachments, `src/app.js` entry wiring.
Still above the 1500 LOC soft cap but close to the 2000 LOC hard
cap from `ACCEPTANCE.md`.

Dropping the soft cap target to 1500 LOC would require further
splits inside the draw loop, settings panels, and live-sync glue —
estimated 4-6 additional modules on top.

## Risks observed during T1..T3

- **R4 materialized** (harness blind spot). Both `p13-hf13-acceptance-regression.mjs`
  extractions forced relaxations of grep checks that were
  location-pinned to the monolith (G13-HF13-2/3/4 lost their
  `boardId = state.boardId` default parameter because the extracted
  modules don't have lexical access to the runtime `state` binding).
  The grep base was also widened to concatenate every `.js` under
  `src/app/runtime/**` so moved symbols are still visible.
- **R1 not yet materialized** (hidden coupling). All three
  extractions cleanly plumbed their deps through the init ctx
  without surprises.
- **R3 not yet materialized** (DOM-query-at-import). All three
  modules defer DOM work to post-init calls.

## Harness baseline

Four live gates for the entire Phase 14 refactor:
- `debug/p11-hf4-acceptance-regression.mjs`
- `debug/p11-hf6-acceptance-regression.mjs`
- `debug/p12-1-acceptance-regression.mjs`
- `debug/p13-hf13-acceptance-regression.mjs`

Older harnesses (`p13-1`, `p13-2`, `p13-3`, `p13-hf7..hf12`) are
historical and FAIL on their location-pinned greps pre-refactor
already — superseded by later HFs. See `ACCEPTANCE.md` and the
Phase 14 EXECUTE.md for rationale.
