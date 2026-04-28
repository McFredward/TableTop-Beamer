# Phase 24 Wave 3 — File / Function Decomposition (RESEARCH)

**Researched:** 2026-04-26
**Domain:** Vanilla-JS, IIFE-with-window-globals runtime; mechanical
file-decomposition under a strict no-behaviour-change rule.
**Confidence:** HIGH for measurements + module-loading architecture
(everything verified against the tree). MEDIUM for proposed split
boundaries (informed by source structure but the planner / executor
can re-cut as the work proceeds). LOW for wire-binders and rendering
files that were not explicitly named in the ROADMAP but exceed the
800-line acceptance threshold — flagged for planner judgement.

## Summary

Wave 3 is a refactor wave with no behaviour delta. The codebase is
Vanilla JS, served as `<script defer>` tags from `index.html` in a
hand-curated dependency order. Each runtime module is an IIFE that
exposes a `window.TT_BEAMER_RUNTIME_<NAME>` namespace; orchestration
reads those globals and calls each module's `init({ctx})` in a
specific order. That order matters — Wave 2 audited and preserved
**8 init-order constraints in `runtime-orchestration.js`** that any
split must respect.

Post-Wave-2 line counts confirm the four ROADMAP-named primary
targets are still oversized (orchestration 3037, projection-mapping
1945, animation-editor-view 1698, animation-lifecycle 1369). **Five
additional files exceed 800 lines** (fx-panels 985, room-audio
binders 924, fx-panel binders 923, polygon-editor 846, draw-loop
836) and either need inclusion in Wave 3 or an explicit deferral
decision from the planner. Only one runtime function exceeds 500
lines (`startRoomAnimationFromDraft` @ 637 lines in room-dispatch);
ten more functions exceed 150 lines. None of the four primary
targets contains a "monster" function — the size problem is many
medium-sized concerns coexisting in one file, not single giant
functions.

The pre-existing 20 section dividers in `runtime-projection-mapping.js`
were intentionally retained through Wave 2 specifically to serve as
Wave 3's split boundaries. That makes projection-mapping the
lowest-risk first split and the natural starting point.

**Primary recommendation:** slice Wave 3 into 6 sub-waves
(W3.1–W3.6), starting with utility consolidation (cheap groundwork),
then projection-mapping (boundaries pre-marked by Wave 2),
animation-editor-view (UI-only, no live-sync), animation-lifecycle
(touches cluster pads + Live Editor), orchestration last (highest
risk — wire-up center), and a final function-size pass for
≥150-line residuals. Re-export shells preserve the current
`window.TT_BEAMER_RUNTIME_<NAME>.init({ctx})` contract on the
original path so consumers never have to change the same commit
that splits a file.

## 1. Module-loading architecture overview

### IIFE-with-window-globals pattern

Every runtime module follows the same shape:

```javascript
// runtime-X.js
(() => {
  let ctx = null;
  // ... module-local state and helpers ...
  function init(dependencies) {
    ctx = dependencies;
    // bind dom listeners, wire ctx.* dependencies, etc.
  }
  window.TT_BEAMER_RUNTIME_X = {
    init,
    publicHelper1,
    publicHelper2,
    // ...
  };
})();
```

Verified against:
- `runtime-animation-lifecycle.js:15` (`(() => {`) → `:1351-1368`
  (`window.TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE = { ... }`).
- `runtime-projection-mapping.js:21` → `:1928-1944`
  (`window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING = { ... }`).
- `runtime-ui/animation-editor-view.js:25` → `:1689` (uses
  `window.TT_BEAMER_ANIMATION_EDITOR_VIEW`, no `RUNTIME` segment).

Two minor wrinkles to be aware of:

1. **`animation-editor-view.js` namespace skips the `RUNTIME` segment**
   (`window.TT_BEAMER_ANIMATION_EDITOR_VIEW`, not
   `window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_VIEW`). The orchestration
   `init()` site is correspondingly conditional:

   ```javascript
   // runtime-orchestration.js:1936
   if (window.TT_BEAMER_ANIMATION_EDITOR_VIEW) {
     window.TT_BEAMER_ANIMATION_EDITOR_VIEW.init({ ... });
   }
   ```

   Splits in this module must keep the same namespace key.

2. **Wire-binders** (`runtime-wire-*.js`) DON'T use `init()`; they
   expose a single `wireXxxBinders(ctx)` call. E.g.
   `wireOverlayWindowBinders(ctx)`,
   `wireFxPanelBinders(ctx)`. Outside the four primary targets
   but applies to the size-overflow secondaries listed below.

### `<script src=...>` load order (`index.html:804-882`)

79 deferred `<script>` tags load runtime in dependency order. The
order is sensitive: `runtime-orchestration.js` (line 881) and
`src/app.js` (line 882) are LAST because they consume every
`window.TT_BEAMER_*` namespace built up earlier in the load. Any
new sub-modules introduced by Wave 3 must:

- be inserted as `<script defer>` tags in `index.html`
- before the consumer that reads their namespace, AND
- before the original "shell" file (so the shell can re-export them).

Concretely: `runtime-projection-mapping.js` is at `index.html:871`.
If we split it into 5 sub-modules + a shim, the 5 sub-modules must
appear at lines 871a–871e and the shim stays at line 871. Easiest
ordering: split files share the same directory
(`src/app/runtime/viewport/`) and sit consecutively in the script
list. The shim takes the original line.

### `init({ctx})` dependency injection

Each module exposes `init(dependencies)` and stashes the dep bag in
its private `ctx` closure variable. Consumers call into the module
via destructured exports (sync, fast — no `await` anywhere in the
load chain because `defer` already orders execution).

`runtime-orchestration.js` makes 43 init calls in total (verified
via `grep -nE 'window\.TT_BEAMER_RUNTIME_[A-Z_]+\.init\(' | wc -l`):

```
242:  STAGE_VIEWPORT.init       (early — DOM refs only)
292:  PROJECTION_MAPPING.init
401:  GLOBAL_TRIGGER_TRACKER.init
419:  SNAPSHOT_HELPERS.init
455:  LIVE_SYNC_CORE.init
570:  POLYGON_METRICS.init
591:  ANIMATION_FACTORY.init
619:  ZONE_LOADER.init
658:  PLAY_AREA_GEOMETRY.init
714:  BOARD_PROFILES.init
761:  CONFIG_SYNC.init
790:  GLOBAL_DEFAULTS.init
850:  BOARD_STATE_ACCESSORS.init
907:  AUDIO.init
957:  ROOM_GEOMETRY.init
985:  LIVE_SYNC_HELPERS.init
1022: GIF_PLAYBACK.init
1065: CLAMP_SYNC_PANELS.init
1113: MOBILE_LAYOUT.init
1157: PERF.init
1192: RUNTIME_CONTROLS.init
1239: QUICK_MODE.init
1280: VIEW_VISIBILITY.init
1316: REGRESSION_TESTS.init
1377: POLYGON_EDITOR_PANELS.init
1425: ASSET_REFS.init
1459: FX_NORMALIZERS.init
1546: FX_PANELS.init
1692: POLYGON_EDITOR.init
1780: BOARD_SWITCH.init
1822: ROOM_MANAGEMENT.init
1896: POLYGON_CONTEXT_MENU.init
1922: POLYGON_ROTATION.init
1937: ANIMATION_EDITOR_VIEW.init  (conditional)
1982: POLYGON_UNDO.init
2020: ROOM_DRAFT.init
2085: ROOM_DISPATCH.init
2121: ANIMATION_LIFECYCLE.init
2239: CANVAS_CLIP.init
2261: EFFECT_VISUALS.init
2272: DRAW_LOOP.init
2385: POLYGON_DRAG_SUPPORT.init
2432: VIEWPORT_ZOOM.init
2923: SLIDER_TOUCH_GUARD.init  (no args)
2926: BOOTSTRAP.init           (last — kicks off the application)
```

After each `init()` block, orchestration **destructures the public
helpers** out of the module (e.g. `const { syncZoneLoaderStatus,
loadExternalBoardZones, ... } = window.TT_BEAMER_RUNTIME_ZONE_LOADER`).
This destructure pattern is the source of init-order constraints —
TDZ throws if the destructure is reached before the module's IIFE
ran, and ReferenceError fires if a sibling init's ctx-builder
references a name that hasn't been destructured yet.

The pattern of `ctx-arrow wrappers` (`getX: () => getX()`) is a
deliberate workaround: when module A's init needs a function that
will only be destructured later, the arrow defers the lookup until
call-time. This is used pervasively throughout orchestration. Any
split of orchestration must preserve every existing arrow-vs-direct
ref distinction at each call site.

### The 8 init-order constraints from Wave 2's pre-C1 sweep

Wave 2's INVENTORY (lines 92–104, "Kept (load-bearing WHY) → From
the 2026-04-25 sweep") records 8 init-order kernel comments that
were intentionally preserved in `runtime-orchestration.js`. Verified
against current file (post-Wave-2 line numbers):

| # | File:Line | Sub | Constraint kernel (verbatim) |
|---|-----------|-----|------------------------------|
| 1 | `runtime-orchestration.js:617-618` | C5.0a | "BOARDS is reassigned via the setBoards callback since the runtime-zone-loader module cannot mutate the outer let directly." |
| 2 | `runtime-orchestration.js:650-652` | C5.0b | "Init + destructure for the viewport-zoom module is placed later in the file (after touchGestureActive and polygon-drag-support are initialized, since the zoom module needs getCachedStageGeometry and getTouchGestureActive at call time)." |
| 3 | `runtime-orchestration.js:711-713` | C5.0c | "fx-normalizers and perf controls are injected via ctx arrows because their destructures sit below this position in orchestration." |
| 4 | `runtime-orchestration.js:785-788` | C5.0d | "board-profiles helpers are injected as direct refs (already destructured above). fx/config-sync helpers used only by loadAndApplyGlobalDefaults come from ctx arrows so downstream destructures can resolve later." |
| 5 | `runtime-orchestration.js:1456-1458` | C5.0e | "fx-normalizers' asset-ref normalizer dependencies are injected via ctx arrows because the asset-refs destructure above supplies them as top-level consts." |
| 6 | `runtime-orchestration.js:1543-1545` | C5.0f | "Editor draft storage and outsideResourceAssets remain in orchestration scope (passed by reference) — mutations to the objects propagate naturally to runtime-fx-panels." |
| 7 | `runtime-orchestration.js:1689-1691` | C5.0g | "All cross-module deps for the polygon editor are injected via ctx arrows so downstream destructures (room-geometry, room-management, room-draft, viewport-zoom) can land later without TDZ." |
| 8 | `runtime-orchestration.js:2081-2083` | C5.0h | "drawRoomComposition's init + destructure is deferred until after all upstream helpers (drawEffectVisual, clipToRoom, etc.) have been destructured — see the init block after flickerNoise below." |

Plus 5 multi-paragraph kernels at:
- `:54-58` (C5.0): destructure normalizeSpecialPolygon /
  isValidSpecialPolygon BEFORE wire-handlers.
- `:170-171` (C5.3): legacy DOM-id list to suppress missing-control
  log.
- `:905-906` (C5.1): ROOM_GEOMETRY init must follow
  BOARD_STATE_ACCESSORS (destructures from it).
- `:1963-1965` (C5.2): use raw setters not update* wrappers in
  animation-editor-view init.
- `:2382-2384` (C5.4): touch gesture flag — set by touch handlers,
  cleared on touchend, blocks rAF zoom-pan writer.

**Wave 3 implication:** orchestration's order is not a list — it is
a load-bearing topological sort. Splitting orchestration without
preserving all 13 of these constraints (8 + 5) breaks boot. The
planner must treat each as a hard constraint, not a hint.

### Other init-order surprises (TDZ, ReferenceError prevention)

- **Top-of-file destructure at `:54-65`**: orchestration destructures
  `normalizePolygonPoint, normalizeSpecialPolygon,
  isValidSpecialPolygon, ...` from
  `window.TT_BEAMER_RUNTIME_POLYGON_NORMALIZERS` BEFORE doing
  anything else. The polygon-normalizers script tag must therefore
  appear before orchestration in `index.html` (verified —
  `index.html:827`).

- **`get state() { return state; }` getter pattern** at
  `runtime-orchestration.js:256` (in stage-viewport init): some ctx
  bags use a getter (not a direct value) so that consumers see the
  *current* `state` reference. `state` is reassigned via
  `BOARD_STATE_ACCESSORS.init`'s callbacks; getters defer the read
  until use.

- **Conditional module init** at `:1936-1979`: `if (window.TT_BEAMER_ANIMATION_EDITOR_VIEW) { ... .init(...) }`. The
  `if` allows the module's `<script>` to fail to load (or be
  removed in some build) without crashing orchestration. Splits of
  this module must preserve the conditional.

- **`SLIDER_TOUCH_GUARD.init()` takes no args** (`:2922-2924`) — sits
  inside an `if` guard. Subtle outlier — most modules require a ctx
  bag.

## 2. Current size measurements (post-Wave-2)

Run: `find /home/claw/tt-beamer/src/app/runtime/ -name "*.js" -exec wc -l {} +`
Date: 2026-04-26.

### Top 20 by line count

| Rank | Lines | File |
|-----:|------:|------|
| 1 | **3037** | `runtime/runtime-orchestration.js` |
| 2 | **1945** | `runtime/viewport/runtime-projection-mapping.js` |
| 3 | **1698** | `runtime/ui/animation-editor-view.js` |
| 4 | **1369** | `runtime/animation/runtime-animation-lifecycle.js` |
| 5 | **985**  | `runtime/panels/runtime-fx-panels.js` |
| 6 | **924**  | `runtime/wire/runtime-wire-room-audio-binders.js` |
| 7 | **923**  | `runtime/wire/runtime-wire-fx-panel-binders.js` |
| 8 | **846**  | `runtime/polygon-editor/runtime-polygon-editor.js` |
| 9 | **836**  | `runtime/render/runtime-draw-loop.js` |
| 10 | 707  | `runtime/animation/runtime-room-management.js` |
| 11 | 659  | `runtime/animation/runtime-room-dispatch.js` |
| 12 | 574  | `runtime/state/runtime-fx-normalizers.js` |
| 13 | 548  | `runtime/live-sync/runtime-live-sync-core.js` |
| 14 | 538  | `runtime/wire/runtime-wire-overlay-window-binders.js` |
| 15 | 517  | `runtime/live-sync/runtime-global-defaults.js` |
| 16 | 500  | `runtime/panels/runtime-regression-tests.js` |
| 17 | 480  | `runtime/state/runtime-play-area-geometry.js` |
| 18 | 474  | `runtime/animation/runtime-quick-mode.js` |
| 19 | 459  | `runtime/wire/runtime-wire-polygon-editor-binders.js` |
| 20 | 428  | `runtime/render/runtime-audio.js` |

Total runtime LOC: 28 307.

### Files exceeding the 800-line acceptance threshold

The ROADMAP names 4 primary targets. The acceptance bar is **all**
of `src/app/runtime/`. Five files beyond the four primaries also
breach 800 lines:

| File | Lines | Mentioned in ROADMAP? | Note |
|------|------:|:----------------------|------|
| `runtime-orchestration.js` | 3037 | yes (target) | wire-up center |
| `runtime-projection-mapping.js` | 1945 | yes (target) | 20 pre-marked section dividers |
| `animation-editor-view.js` | 1698 | yes (target) | UI; no live-sync |
| `runtime-animation-lifecycle.js` | 1369 | yes (target) | cluster pads + Live Editor + render list |
| `runtime-fx-panels.js` | 985 | **no** | `syncRoomFxPanel` alone is 191 lines |
| `runtime-wire-room-audio-binders.js` | 924 | **no** | one mega `wireRoomAudioBinders(ctx)` |
| `runtime-wire-fx-panel-binders.js` | 923 | **no** | one mega `wireFxPanelBinders(ctx)` |
| `runtime-polygon-editor.js` | 846 | **no** | three render functions over 145 lines |
| `runtime-draw-loop.js` | 836 | **no** | four functions over 100 lines + `postDrawMeshWarp` already lives in projection-mapping |

**Planner decision needed:** include the 5 secondaries in Wave 3
(W3.6 or insert dedicated sub-wave), or accept them and renegotiate
the acceptance bar for Wave 3 closure. Recommendation: include
fx-panels (just one big function, easy peel) and the two wire-binders
(consistently structured, can split by topical group), defer
polygon-editor + draw-loop to Wave 5 (module-boundary cleanup) if
time-pressed — both are right at the edge (846 / 836) and a single
helper extraction may bring them under without a full split.

## 3. Function-size inventory (≥100 lines)

Heuristic: scan for `function NAME(...)` declarations and find the
matching close brace (depth-counted, comments + simple strings
stripped). Counts include both the signature line and the close
brace.

### ≥150-line functions (must-split per ROADMAP acceptance §"No function exceeds 150 lines")

| Lines | Function | File:Lines |
|------:|----------|------------|
| 898 | `wireFxPanelBinders` | `runtime-wire-fx-panel-binders.js:8-905` |
| 910 | `wireRoomAudioBinders` | `runtime-wire-room-audio-binders.js:10-919` |
| 637 | `startRoomAnimationFromDraft` | `runtime-room-dispatch.js:17-653` |
| 525 | `wireOverlayWindowBinders` | `runtime-wire-overlay-window-binders.js:9-533` |
| 447 | `wirePolygonEditorBinders` | `runtime-wire-polygon-editor-binders.js:8-454` |
| 397 | `wireStageGestureBinders` | `runtime-wire-stage-gesture-binders.js:8-404` |
| 369 | `renderRunningAnimationsList` | `runtime-animation-lifecycle.js:719-1087` |
| 298 | `collectDomRefs` | `runtime-dom-refs.js:7-304` |
| 191 | `syncRoomFxPanel` | `runtime-fx-panels.js:436-626` |
| 188 | `initializeApplication` | `runtime-bootstrap.js:71-258` |
| 176 | `decodeGifPlaybackFramesWithParser` | `runtime-gif-decoder.js:191-366` |
| 174 | `openLiveEditor` | `runtime-animation-lifecycle.js:147-320` |
| 171 | `renderPolygonEditorHandles` | `runtime-polygon-editor.js:270-440` |
| 159 | `renderShipPolygonEditorHandles` | `runtime-polygon-editor.js:89-247` |

### 100–149 line functions (planner may split or accept)

| Lines | Function | File:Lines |
|------:|----------|------------|
| 146 | `renderRoomOverlay` | `runtime-polygon-editor.js:642-787` |
| 139 | `buildSoundPickerRow` | `animation-editor-view.js:836-974` |
| 136 | `buildAssetPickerRow` | `animation-editor-view.js:669-804` |
| 132 | `_postDrawMeshWarpGL` | `runtime-projection-mapping.js:274-405` |
| 128 | `playSoundForAnimation` | `runtime-audio.js:189-316` |
| 127 | `wireNavigationBinders` | `runtime-wire-navigation-binders.js:8-134` |
| 115 | `connectLiveSyncSocket` | `runtime-live-sync-core.js:424-538` |
| 115 | `drawClusterPadCanvases` | `runtime-draw-loop.js:560-674` |
| 113 | `init` (lifecycle module) | `runtime-animation-lifecycle.js:20-132` |
| 110 | `applyBoardProfilesToState` | `runtime-board-profiles.js:125-234` |
| 110 | `draw` | `runtime-draw-loop.js:676-785` |
| 109 | `loadExternalBoardZones` | `runtime-zone-loader.js:34-142` |
| 108 | `runLayoutScrollRegression` | `runtime-regression-tests.js:35-142` |
| 103 | `drawLines` | `runtime-projection-mapping.js:868-970` |
| 102 | `closeLiveEditor` | `runtime-animation-lifecycle.js:337-438` |
| 101 | `drawAnimation` | `runtime-draw-loop.js:279-379` |
| 101 | `drawOutsideFxLayer` | `runtime-draw-loop.js:396-496` |
| 100 | `renderClusterPads` | `runtime-animation-lifecycle.js:1164-1263` |

### Notes on the 4 primary targets' largest internals

- **`runtime-orchestration.js`**: only 4 top-level `function` decls
  (`shouldSuppressRapidTap`, `createConditionalFieldMountSlot`,
  `setConditionalFieldMounted`, `deleteSelectedPolygonVertex`) —
  all under 50 lines. The "size" is in the 43 init blocks +
  destructures + a final `runApplicationBootstrap` call. Splitting
  is about *grouping inits*, not splitting any one function.

- **`runtime-projection-mapping.js`**: 2 funcs ≥100 lines
  (`_postDrawMeshWarpGL` 132, `drawLines` 103). Both are tight,
  domain-specific, and stay inside their proposed sub-modules
  (GL-renderer / handle-UI). Neither fights the 150 cap, so no
  forced sub-split.

- **`animation-editor-view.js`**: 2 funcs in 136–139 line range
  (`buildSoundPickerRow`, `buildAssetPickerRow`). Both are picker-
  row builders for the edit-pane sub-module. Still under 150, but
  near the line — planner may pre-emptively extract the per-asset-
  type branches into helpers as part of the split.

- **`runtime-animation-lifecycle.js`**: 5 funcs ≥100 lines, 2 ≥150
  (`renderRunningAnimationsList` 369 — by far the worst,
  `openLiveEditor` 174). These ARE forced splits — both must drop
  below 150 in W3.4 or the dedicated W3.6 function-size pass.

## 4. Decomposition plan per primary target

### 4.1 `runtime-projection-mapping.js` (1945 → 5 files + shim)

**Why this is first:** Wave 2 retained 20 section dividers in this
file *specifically* to mark Wave 3's split lines. Confirmed
present at:

| Line | Section |
|-----:|---------|
| 24   | `// ── State ──` |
| 62   | `// ── Helpers ──` |
| 139  | `// ── Apply transform (no-op — all warping is done via canvas mesh) ──` |
| 150  | `// ── Post-draw mesh warp ──` |
| 560  | `// ── Handle UI ──` |
| 579  | `// ── Undo stack (grid state snapshots) ──` |
| 713  | `// ── Rotate handles (one per corner — rotate whole grid around centroid) ──` |
| 972  | `// ── Handle drag ──` |
| 1103 | `// ── Grid line drag (move entire row/column) ──` |
| 1348 | `// ── Arrow key fine-tuning ──` |
| 1411 | `// ── Context menu ──` |
| 1483 | `// ── Server-side profile flows ──` |
| 1657 | `// ── Grid line add/remove ──` |
| 1791 | `// ── Show / Hide (unified — everything in one go) ──` |
| 1808 | `// ── Align mode integration ──` |
| 1822 | `// ── Resize handling ──` |
| 1834 | `// ── Persistence ──` |
| 1890 | `// ── Legacy compat ──` |
| 1919 | `// ── Init ──` |
| 1926 | `// ── Public API ──` |

**Proposed module breakdown** (matches ROADMAP wording):

| New module | Source range | Purpose |
|------------|--------------|---------|
| `runtime-projection-grid-state.js` | 24–138 + 1834–1888 | grid data structure, helpers, persistence (LS keys, save/load) |
| `runtime-projection-gl-renderer.js` | 159–405 (`_glCanvas...` block + `_initMeshWarpGL` + `_postDrawMeshWarpGL`) | WebGL mesh-warp path |
| `runtime-projection-2d-fallback-renderer.js` | 150–158 + 406–558 | 2D-canvas per-triangle fallback path |
| `runtime-projection-handle-ui.js` | 560–712 + 713–971 + 972–1102 + 1103–1347 + 1348–1410 + 1411–1482 + 1657–1790 + 1791–1820 | handle creation, drag, rotate, lines, context menu, grid-line add/remove, show/hide |
| `runtime-projection-profile-persistence.js` | 1483–1656 | server-side profile save/load/list/delete |
| `runtime-projection-mapping.js` (SHIM) | 1–22, 139–149, 1822–1832, 1890–1944 | re-export shell + apply transform + resize + legacy compat (`getCorners`, `loadCornersFromConfig`, `resetCorners`) + public API + module-init that calls each sub-module's init in order |

**External call surface** of each new module (dest — source):

- **grid-state**: exports `grid`, `getPoint`, `setPoint`,
  `hasGridDisplacements`, `buildDefaultPoints`, `loadFromLocalStorage`,
  `saveToLocalStorage`, `LS_KEY_V2`, `LS_KEY_OLD`, `MAX_UNDO`,
  `pushUndo`/`undo`/`clearUndo`/`snapshotGridState`/`restoreGridSnapshot`
  (the undo stack closures over `grid`).
- **gl-renderer**: exports `postDrawMeshWarpGL`, `tryInitGL`,
  `dropGL`. Imports `grid`, `getPoint` from grid-state.
- **2d-fallback-renderer**: exports `postDrawMeshWarp2D`. Imports
  `grid`, `getPoint`.
- **handle-ui**: exports `showHandles`, `hideHandles`,
  `rebuildHandleElements`, `positionHandles`, `positionRotateHandles`,
  `drawLines`, `onKeyDown`, plus internal handle/line/rotate/pan
  drag state. Imports grid-state + a callback from main shim to
  trigger `applyTransform`/`renderRoomOverlay`.
- **profile-persistence**: exports `profileSaveFlow`,
  `profileLoadFlow`, `profileDeleteFlow`, `fetchProfileList`,
  `applyGridPayload`, `buildGridPayload`. Imports grid-state.
- **shim**: exports the existing
  `window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING` namespace, calling
  through to sub-modules.

**Risk areas:**
- Module-local closures: `_warpTmpCanvas`, `_warpTmpCtx`, all `_gl*`
  state at lines 156–184. **These belong to gl-renderer and
  2d-fallback-renderer**; they cannot stay in grid-state. The
  `_warpTmp*` belongs to the 2D fallback; the `_gl*` belongs to GL.
- Shared mutation of `grid.points` from undo (handle-ui) AND from
  applyGridPayload (profile-persistence) AND from
  loadFromLocalStorage (grid-state). All three writers need the
  same module-internal `grid` reference. Promote `grid` to a
  shared scope (the shim) and pass by reference to sub-modules via
  init-ctx.
- The `ctx` variable (referring to the `ctx` injected by
  orchestration's `init(dependencies)`) is closed over by every
  function. Each sub-module needs its own `init(deps)` and its
  own private `ctx`. The shim's `init` fans out to each sub-module's
  `init`.

### 4.2 `animation-editor-view.js` (1698 → 4 files + shim)

ROADMAP target: editor-shell, library-list, edit-pane, live-preview.
The file already has a clean function-name vocabulary that
discriminates the four areas:

| New module | Functions (verified at file:line) |
|------------|-----------------------------------|
| `animation-editor-shell.js` | `init`, `bindDom`, `populateBoardSelect`, `isOpen`, `open`, `close`, `handleBack`, `flashDirtyBar`, `syncDirtyBar`, `getEditorBoardId`, `notifySelection`, `getSelection`, `onSelectionChange` (mostly :40–229, :1670–1688) |
| `animation-editor-library-list.js` | `collectAnimations`, `render`, `renderScopeTabs`, `renderList` (:230–263, :1566–1669) |
| `animation-editor-edit-pane.js` | `renderPane`, `buildHeader`, `scopeLabel`, `buildIdentityCard`, `buildDefaultsCard`, `getDefaultFields`, `buildSliderRow`, `buildToggleRow`, `buildColorCard`, `buildSourceCard`, `buildAssetPickerRow`, `buildSoundCard`, `buildSoundPickerRow`, `buildSelectRow`, `createAnimation`, `deleteAnimation`, `sanitizeName`, `findDefinition`, `patchAnimation`, `updatePaneDynamicBits` (:264–1021, :1399–1565) |
| `animation-editor-live-preview.js` | `renderPreview`, `buildPreviewSwatch`, `startCodedPreview`, `stopCodedPreview`, `startGifPreview`, `toResourceUrl`, `buildPreviewMeta`, `formatAssetType`, `applyMediaPreviewProps`, `updatePreviewDynamicBits`, `buildPreviewMissingNotice` (:1022–1398) |
| `animation-editor-view.js` (SHIM) | header + namespace declaration; init() that calls each sub-module's init() in order; assembles the public `window.TT_BEAMER_ANIMATION_EDITOR_VIEW` |

**External call surface:**

- **shell**: owns module-private `state` (scope, search,
  selectedIds, open, editorBoardId), `listeners` Set. Exports
  `getState`, `getEditorBoardId`, `setEditorBoardId`, the open/close
  flow, dirty-bar helpers. Reads `ctx.animEditorPage` etc. (DOM
  refs).
- **library-list**: needs `getState` + `setSelection` from shell;
  needs `renderPane`/`renderPreview` callbacks (passed at init) so
  selection changes trigger re-render in edit-pane + preview.
- **edit-pane**: needs `getState` + `getEditorBoardId` + `markDirty` /
  `flashDirtyBar` from shell; needs `renderList` callback (from
  library-list) so an `applyAndRefresh` after a patch redraws the
  list.
- **live-preview**: needs `getState` + `getEditorBoardId`; reads
  ctx.animEditorPreview only.
- **shim**: assembles `window.TT_BEAMER_ANIMATION_EDITOR_VIEW =
  { init, open, close, isOpen, render, getSelection,
  onSelectionChange }` from sub-modules' helpers.

**Risk areas:**
- Module-local `state` object and `listeners` Set are accessed by
  all four sub-modules. Promote to shell; expose via getters.
- Mutual call patterns: list selection → re-render pane + preview;
  pane Apply → refresh list. Resolve by passing callbacks at init
  time (no circular import).
- `state.selectedIds` is plural ({inside, outside, room}) and
  scope-keyed. Shell owns the mutation; pane + list are read-only
  consumers.

### 4.3 `runtime-animation-lifecycle.js` (1369 → 5 files + shim)

ROADMAP target: cluster rail, cluster dispatch, draft-promotion,
prune, lifecycle state mgmt. Mapping to actual functions:

| New module | Functions (verified) |
|------------|----------------------|
| `runtime-lifecycle-state.js` | top-of-IIFE local state (`liveEditorAnimationId`, `liveEditorSnapshot`, `liveEditorDirty`); helpers `markLiveEditorDirty`, `applyLiveEditorValue` |
| `runtime-lifecycle-stop-pipeline.js` | `collectAnimationStopIds`, `isStopPendingForAnimationId`, `markStopPending`, `clearStopPending`, `reconcileStopPendingFromSnapshot`, `buildStopCommandTargetMeta`, `emitStopAnimationCommand`, `stopAnimation` (:464–632) |
| `runtime-lifecycle-live-editor.js` | `openLiveEditor`, `editAnimation`, `discardLiveEditor`, `closeLiveEditor`, `applyLiveEditorValue`, `markLiveEditorDirty` (:147–462) |
| `runtime-lifecycle-running-list.js` | `renderRunningAnimationsList` (:719-1087, **369 lines — exceeds 150 cap; must be split internally**), `isRunningListInteractionActive`, `validateRunningListParity`, `refreshGlobalButtons` (:1089-1142) |
| `runtime-lifecycle-cluster-pads.js` | `updateClusterPadsRect`, `renderClusterPads` (:1164–1263, **100 lines, near edge**), `dispatchClusterByTapAction`, `dispatchClusterToggle`, `dispatchClusterClear` (:1268–1349); plus the rAF rail-tracker now in `init` body (lines 23–52) — must move with the cluster module |
| `runtime-animation-lifecycle.js` (SHIM) | re-export shell wiring `init` that fans into each sub-module |

**Sub-split required for `renderRunningAnimationsList` (369 lines):**
the function builds list rows for running animations. Probable
internal split: `buildRunningRow(anim, ...)` extraction (per-row
DOM build) + `applyRunningRow(...)` updater. Acceptable to defer
this to W3.6 *if* the host file already passes 800.

**External call surface:**
- **state**: pure module-private state; exports getters/setters.
- **stop-pipeline**: stateless transformations + `liveSync` mutation
  emit. Imports `state.runningAnimations`, `liveSync`,
  `STOP_ANIMATION_MUTATION_TYPE`.
- **live-editor**: imports `state.runningAnimations`, ctx DOM refs
  (liveEditorPanel, liveEditorOpacity, etc.), `clampRoom*`,
  `state` setters from board-profiles, `markLiveEditorDirty`.
- **running-list**: imports `runningAnimationsList` ref, `state`,
  `editAnimation`, `stopAnimation`, `clampRoom*`.
- **cluster-pads**: imports `state.runningAnimations`,
  `cluster-pads` DOM, `startRoomAnimationFromDraft`, `stopAnimation`,
  `getClusterTargetById`, `setRoomFxProfile`/`getRoomFxProfile`.
- **shim**: `window.TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE =
  { init, collectAnimationStopIds, ..., closeLiveEditor }` (see
  current `:1351-1368` for the full export list).

**Risk areas:**
- The rAF rail-tracker at `init` lines 23–52 is *registered once*
  via `window.requestAnimationFrame(rafTick)` and runs forever.
  This single rAF must move into cluster-pads' init (not stay in
  the shim). Otherwise the cluster pad rail freezes.
- `liveEditorAnimationId` and `liveEditorSnapshot` are read by both
  `openLiveEditor` and the slider event-handlers wired in `init`.
  Promote to the state module; sub-modules access via getter/setter.
- The Live Editor sliders are wired in `init` (see line 55–131:
  `ctx.liveEditorOpacity.addEventListener("input", ...)`). When
  this wiring moves, the listeners must still see the same
  `applyLiveEditorValue` and `clampRoom*` references.
- `closeLiveEditor` is called from outside the module
  (`runtime-orchestration.js:2236` destructures it). Shim must
  still export the symbol.

### 4.4 `runtime-orchestration.js` (3037 → wire-up shell + 6 area files)

**This is the riskiest split.** Recommended LAST (W3.5). The current
file is the dependency-injection root. Splitting it requires every
move to preserve all 8 + 5 init-order constraints from §1.

Per ROADMAP ("state/dom/render/lifecycle/wire/ui"), candidate
breakdown — each becomes a top-level module that orchestration calls
into:

| New module | Lines (approx, current) | Content |
|------------|------------------------:|---------|
| `runtime-wire-state.js` | ~120 (top-of-file destructures: `:1-237`) | TT_BEAMER_CONFIG / RUNTIME_ENV / LOGGER / POLYGON_CONTRACT / DOM_REFS reads + `BOARDS` setup + outputRole detection |
| `runtime-wire-dom.js` | ~70 | DOM-ref destructure (`:67-237`) + canvas init (`:240`) |
| `runtime-wire-render.js` | ~250 | stage-viewport + projection-mapping + canvas-clip + effect-visuals + draw-loop init blocks |
| `runtime-wire-lifecycle.js` | ~600 | room-draft + room-dispatch + animation-lifecycle + room-management init blocks; the stop-pipeline ctx-arrow wiring |
| `runtime-wire-ui.js` | ~600 | fx-panels + animation-editor-view + polygon-editor-panels + view-visibility + clamp-sync-panels init blocks |
| `runtime-wire-network.js` | ~450 | live-sync-core + live-sync-helpers + zone-loader + global-defaults + config-sync + snapshot-helpers + global-trigger-tracker |
| `runtime-orchestration.js` (SHIM) | ~600 | top-level functions (`shouldSuppressRapidTap`, `createConditionalFieldMountSlot`, `setConditionalFieldMounted`, `deleteSelectedPolygonVertex`); ctx-builder for downstream wire-binders; the final `runApplicationBootstrap` call; the 8 + 5 INIT-ORDER kernels stay HERE |

**Caveat:** the boundaries above are loose. Orchestration's reality
is "every helper destructured by every other module", so a clean
state/render/ui split may require *each new file to take a slice of
the orchestration timeline AND a slice of the destructure list*.
Per the C5.0a–C5.0h kernels, several modules are deferred (zoom is
init'd at :2432 because it needs polygon-drag-support which is
init'd at :2385). The split must keep the *SAME timeline*; that
means each new file is more like a "phase of orchestration" than a
"topical concern". Likely concrete grouping by execution phase:

- **W3.5a phase 1 (early, lines 1–456)**: top-of-file destructures,
  stage-viewport, projection-mapping, global-trigger-tracker,
  snapshot-helpers, live-sync-core init.
- **W3.5b phase 2 (lines 456–1156)**: polygon-metrics, animation-
  factory, zone-loader, play-area-geometry, board-profiles,
  config-sync, global-defaults, board-state-accessors, audio,
  room-geometry, live-sync-helpers, gif-playback, clamp-sync-panels,
  mobile-layout init.
- **W3.5c phase 3 (lines 1156–1820)**: perf, runtime-controls,
  quick-mode, view-visibility, regression-tests, polygon-editor-
  panels, asset-refs, fx-normalizers, fx-panels, polygon-editor,
  board-switch, room-management init + animation-editor-view.
- **W3.5d phase 4 (lines 1820–2236)**: polygon-context-menu,
  polygon-rotation, polygon-undo, room-draft, room-dispatch,
  animation-lifecycle init.
- **W3.5e phase 5 (lines 2236–2476)**: canvas-clip, effect-visuals,
  draw-loop, polygon-drag-support, viewport-zoom init.
- **W3.5f phase 6 (lines 2476–end)**: wire-binders (room-audio,
  fx-panel, overlay-window, navigation, stage-gesture, polygon-
  editor); slider-touch-guard; bootstrap.init (runs the app).

Each phase becomes a module exporting a single
`runOrchestrationPhaseN(state, ...sharedRefs)` function. The
shim's job is then to call each phase function in order, threading
the shared mutable refs (`BOARDS`, `state`, `ctx`, the
top-level functions) through.

**Risk areas (severe):**
- The 4 top-level functions (`shouldSuppressRapidTap` etc.) are
  closures over module-top destructures. Moving them to a phase
  module breaks the closure. Either keep them in the SHIM (which is
  the recommendation) and pass refs as args, or duplicate the
  destructures.
- The shim's `state` reference is mutable (reassigned by
  `BOARD_STATE_ACCESSORS.init`'s callbacks). Phase modules must read
  `state` via a getter, not a captured value.
- The 13 init-order kernels MUST stay in the SHIM (or in the phase
  module that owns the relevant init). Each kernel's verbatim text
  is load-bearing; moving it changes nothing about the code but
  breaks Wave 2's commitment to preserve them.
- `index.html` script load order: every phase file must appear
  BEFORE `runtime-orchestration.js`. The shim is still last.

**Alternative if the above is too risky:** keep orchestration as
ONE file but extract the top-level functions + the ctx-builder
(2620–3037) into a `runtime-orchestration-ctx-builder.js` and accept
that orchestration stays at ~2400 lines for Wave 3. Use the
ROADMAP-allowed exception: "excluding the orchestration wire-up
which is allowed to be a re-export shell". Treat orchestration as
that exception. **Recommendation: prefer this safer cut unless the
planner can budget 2+ days of careful incremental splitting on the
big cut.**

## 5. Shared utilities inventory

The ROADMAP names polygon BBox, alpha clamp, generic `clamp(min,
max, v)`. Verified with grep:

### Generic `clamp(value, min, max, fallback)`

Found ONCE in the codebase, inline inside a normalizer:

| File:Line | Definition |
|-----------|------------|
| `runtime-fx-normalizers.js:414-418` | `const clamp = (value, min, max, fallback) => { const n = Number(value); if (!Number.isFinite(n)) return fallback; return Math.max(min, Math.min(max, n)); };` |

Other clamps are **named** (`clampRoomOpacity`, `clampRoomIntensity`,
`clampRoomSpeed`, etc.) and live in `lib/shared/normalizers.js` /
`runtime-fx-normalizers.js`. The ROADMAP-suggested generic
`clamp(min, max, v)` would replace inline `Math.max(a, Math.min(b,
v))` patterns across the codebase. Inline occurrences:

| File:Line | Pattern |
|-----------|---------|
| `runtime-slider-touch-guard.js:94` | `Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))` |
| `runtime-polygon-drag-support.js:216` | `Math.max(0, Math.min(1, Number(value) || 0))` |
| `runtime-global-defaults.js:413` | `Math.max(0, Math.min(1, nextVolume))` |
| `animation-editor-view.js:1286` | `Math.max(0, Math.min(1, opacity * intensity))` |
| `animation-editor-view.js:1363` | `Math.max(0, Math.min(1, opacity * intensity))` |
| `runtime-wire-room-audio-binders.js:365` | `Math.max(0, Math.min(100, Number(roomSoundVolumeInput.value) || 0))` |
| `runtime-board-profiles.js:71` | `Math.max(0, Math.min(1, Number(state.audio.volume) || 0))` |
| `runtime-board-profiles.js:108` | `Math.max(0, Math.min(1, nextVolume))` |
| `runtime-wire-fx-panel-binders.js:315` | `Math.max(0, Math.min(100, Math.round(Number(roomDefSoundVolumeInput.value) || 0)))` |
| `polygon-contract.js:7` | `Math.max(0, Math.min(1, numeric))` |
| `runtime-animation-lifecycle.js:81-110` (10 inline clamps in slider handlers) | various `Math.max/Math.min` ranges |

Total ~25 inline occurrences. A generic `clamp(min, max, v)` plus a
`clamp01(v)` shorthand (since [0,1] is by far the dominant range)
covers most of these.

### Polygon BBox (min/max over [x,y] points)

Found 4 occurrences:

| File:Line | Pattern |
|-----------|---------|
| `runtime-viewport-zoom.js:223-232` | `let minX = Number.POSITIVE_INFINITY; ...; for (const [x,y] of points) { minX = Math.min(minX, x); ... }` |
| `runtime-room-geometry.js:180-191` | identical pattern; also computes radius alongside |
| `runtime-projection-mapping.js:1203-1213` | `let minX = Infinity, maxX = -Infinity, ...; for (let r=0; r<rows; r++) for (let c=0; c<cols; c++) { ... }` (2D iteration variant) |
| `runtime-polygon-editor.js:760-769` | `let minX = 1000; let maxX = 0; ... for (const [px, py] of points)` (uses 1000/0 sentinels because polygon coords are 0–1000 SVG units) |

The first two are exact duplicates — straightforward consolidation.
The third is structurally different (2D grid iteration). The fourth
uses a different sentinel — the planner can either generalize the
sentinel or keep `runtime-polygon-editor.js`'s variant local.

### Duplicate zoom-around-anchor math (Wave 2 §6 deferral)

Wave 2's INVENTORY claims duplication at:
- `runtime-viewport-zoom.js:310` (now :311 post-Wave-2)
- `runtime-orchestration.js:2574` (now :2412 post-Wave-2)

Verified: the **comment derivation** is duplicated at both sites
(orchestration:2412–2431 and viewport-zoom:307–310 + the body of
`applyZoomScaleAroundClientPoint` at viewport-zoom:311–339). The
**code itself is single-source** in viewport-zoom.js:311–339;
orchestration imports the function via destructure at
`:2475` (`applyZoomScaleAroundClientPoint`) and re-exposes it via
`ctx`-arrow at `:2486` (
`applyZoomScaleAroundClientPoint: (scale, x, y, label) => applyZoomScaleAroundClientPoint(scale, x, y, label)`).

**So: there is NO actual code duplication to dedupe at the code
level. The Wave 2 INVENTORY's claim was about the comment
derivation, which both sites carry verbatim per Wave 2's "duplicated
comment kept verbatim" decision.** Wave 3 dedupe action: drop the
comment block in orchestration (since the math is implemented and
fully documented in viewport-zoom). Single-line breadcrumb pointing
to viewport-zoom suffices. This is a pure-comment edit, near-zero
risk.

### Other consolidation candidates

| Helper | Where | Notes |
|--------|-------|-------|
| `cloneBoardEntry` | orchestration scope | only one definition; not a duplicate. Skip. |
| `getRoomPoints` / `getRawRoomCenter` / etc. | already in dedicated modules | not duplicates |
| `Number.isFinite` guards followed by `Number(x) \|\| 0` | dozens of sites | already covered by named clamps. Don't try to unify. |

### Recommended `runtime-utils.js`

Top-of-`src/app/runtime/` location: `src/app/runtime/runtime-utils.js`.
Loaded BEFORE all sub-modules in `index.html` (immediately after
`lib/shared/normalizers.js` already at line 812, but BEFORE
`runtime/state/runtime-polygon-normalizers.js` at line 827 so that
runtime utils are available to every runtime module).

Initial export surface (conservative — only items with verified
duplication ≥2):

```javascript
// src/app/runtime/runtime-utils.js
(() => {
  function clamp(min, max, v) {
    return Math.max(min, Math.min(max, v));
  }
  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }
  function bboxOfPolygon(points) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const [x, y] of points) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return { minX, maxX, minY, maxY };
  }
  window.TT_BEAMER_RUNTIME_UTILS = { clamp, clamp01, bboxOfPolygon };
})();
```

DO NOT pull in named clamps from `normalizers.js` —
`clampRoomOpacity` etc. carry domain-specific defaults (e.g.,
"opacity defaults to 1.0 when invalid"), which the generic `clamp`
can't replicate. Keep both.

## 6. Re-export shell strategy

The IIFE-with-window-globals pattern allows splits to be
non-disruptive: each new sub-module gets its own
`<script>` tag and its own IIFE; the shim is a thin file at the
original path that calls each sub-module's `init` and aggregates
their public APIs into the original namespace key.

### Pattern recipe

For example, splitting `runtime-projection-mapping.js`:

**Step 1 — Add new sub-module files**, each with its own IIFE:

```javascript
// src/app/runtime/viewport/runtime-projection-grid-state.js
(() => {
  let ctx = null;
  const grid = { srcXs: [...], srcYs: [...], points: null };
  function init(deps) { ctx = deps; loadFromLocalStorage(); }
  function getPoint(r, c) { /* ... */ }
  // ...
  window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE = {
    init, grid, getPoint, setPoint, hasGridDisplacements,
    saveToLocalStorage, loadFromLocalStorage,
    pushUndo, undo, clearUndo,
  };
})();
```

Each new file is an INDEPENDENT IIFE that publishes its own
`window.TT_BEAMER_RUNTIME_<SUBNAME>` namespace.

**Step 2 — `index.html` script-tag insertion**:

```html
<!-- BEFORE the original projection-mapping line (which is :871) -->
<script src="/src/app/runtime/viewport/runtime-projection-grid-state.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-gl-renderer.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-2d-fallback-renderer.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-handle-ui.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-profile-persistence.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-mapping.js" defer></script>  <!-- the SHIM, was :871 -->
```

The new files are inserted BEFORE the original line so that when
the original (now a shim) executes its IIFE, every sub-module's
namespace is already populated on `window`.

**Step 3 — The shim** at the original path:

```javascript
// src/app/runtime/viewport/runtime-projection-mapping.js (SHIM)
(() => {
  const gridState = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
  const glRenderer = window.TT_BEAMER_RUNTIME_PROJECTION_GL_RENDERER;
  const fallback = window.TT_BEAMER_RUNTIME_PROJECTION_2D_FALLBACK_RENDERER;
  const handleUi = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
  const profilePersistence = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE;

  function init(deps) {
    // Fan out the same dep bag (or filtered slices) to each sub-module
    gridState.init(deps);
    glRenderer.init({ ...deps, getGrid: () => gridState.grid, getPoint: gridState.getPoint });
    fallback.init({ ...deps, getGrid: () => gridState.grid, getPoint: gridState.getPoint });
    handleUi.init({ ...deps, /* ... */ });
    profilePersistence.init({ ...deps, applyGridPayload: ... });
  }

  function applyTransform() { /* small thin function — keep here */ }
  function onWindowResize() { /* unchanged */ }
  // legacy compat (getCorners, loadCornersFromConfig, resetCorners) lives here

  window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING = {
    init,
    applyTransform,
    showHandles: (...args) => handleUi.showHandles(...args),
    hideHandles: (...args) => handleUi.hideHandles(...args),
    onAlignModeChange: (...args) => handleUi.onAlignModeChange(...args),
    onWindowResize,
    resetCorners: () => gridState.resetGrid(),
    loadCornersFromConfig: () => {},  // no-op preserved
    getCornersForPersistence: () => /* legacy compat */,
    postDrawMeshWarp: (...args) => glRenderer.postDrawMeshWarpGL(...args)
                                || fallback.postDrawMeshWarp2D(...args),
    remapPoint: handleUi.remapPoint,
    hasGridDisplacements: () => gridState.hasGridDisplacements(),
    getCorners: () => gridState.getCorners(),
    getGrid: () => gridState.getGrid(),
    resetGrid: () => gridState.resetGrid(),
  };
})();
```

The shim's `window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING` is bit-for-
bit equivalent (same keys, same call-time behaviour) to the
pre-split namespace. Orchestration's existing destructure
`const { applyTransform, showHandles, ... } = window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING;`
keeps working without a single change in orchestration.

### What MUST be preserved per re-export shell

1. **The exact public-API key set** (call `Object.keys(window.TT_BEAMER_RUNTIME_X)` before AND after split — must match).
2. **The exact namespace key string** (`PROJECTION_MAPPING`, not `PROJ_MAPPING`).
3. **The exact init-call signature** (`init({ deps })` with the
   dep bag's exact shape; sub-modules can take a *narrower* bag,
   but the shim's `init` must accept the orchestration's bag).
4. **`<script>` order**: sub-modules ALWAYS load before the shim;
   the shim ALWAYS loads before orchestration.
5. **The IIFE wrapper**: each new file is `(() => { ... })();` so
   no top-level identifiers leak.

### Single-failure mode warning

If one sub-module's `init` is forgotten in the shim, the entire
namespace silently fails — orchestration's destructure returns
`undefined` for missing keys, then the first call site throws
`TypeError: undefined is not a function`. Pre-commit verification
**must** include a `node --check` AND a manual smoke that loads the
dashboard + `/output` to surface this class of bug immediately.

### `<script>` load-order pitfall

If the shim is *before* its sub-modules in `index.html`, the shim's
`window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE` reference is
`undefined` at IIFE-execute time, and the shim's namespace setter
references `undefined.init` → TypeError. Verification: in every
commit that adds new sub-modules, also verify the `<script>` order
in `index.html` (sub-modules BEFORE shim BEFORE orchestration).

## 7. Recommended commit slicing for Wave 3

Six sub-waves, ordered low→high risk, with bisect-friendly atomic
commits inside each.

### W3.1 — Utility consolidation (LOWEST risk)

**Goal:** create `src/app/runtime/runtime-utils.js` with `clamp`,
`clamp01`, `bboxOfPolygon`. Replace verified duplicate sites.

**Commits:**
- C1: introduce `runtime-utils.js` + `<script>` tag in
  `index.html` (NO call sites yet — purely additive). Smoke: page
  loads.
- C2: replace 4 polygon BBox sites with `bboxOfPolygon`. One commit
  per call-site if any introduces structural diff (likely just
  one commit covers all 2 simple cases; the 2D-grid site and the
  1000-sentinel site stay local).
- C3: replace `Math.max(0, Math.min(1, ...))` patterns with
  `clamp01`. One commit per file (~10 commits) OR one commit
  per topical group (~3 commits). Recommend per-topical-group:
  audio sliders, polygon drag, fx-panel binders.
- C4: drop the duplicate zoom-anchor comment from orchestration.

**Atomic-commit count:** ~6.

### W3.2 — `runtime-projection-mapping.js` split (MEDIUM)

**Goal:** 1945 lines → 5 sub-modules (each <800) + a <300-line shim.

**Commits (one per sub-module extraction):**
- C1: extract `runtime-projection-grid-state.js` (state, helpers,
  persistence, undo). Shim unchanged externally; internally
  delegates to grid-state.
- C2: extract `runtime-projection-gl-renderer.js`.
- C3: extract `runtime-projection-2d-fallback-renderer.js`.
- C4: extract `runtime-projection-handle-ui.js` (largest cut —
  ~1100 lines moved). May need 2 commits if too noisy: one for
  handle creation, one for drag/rotate/lines.
- C5: extract `runtime-projection-profile-persistence.js`.
- C6: shim cleanup (delete dead lines, verify `Object.keys` parity
  vs. pre-split).

**Atomic-commit count:** ~6–7.

**Smoke per commit:** dashboard loads, `/output` loads,
`Align Mode` toggle works, drag a corner handle, save+load profile.

### W3.3 — `animation-editor-view.js` split (MEDIUM)

**Goal:** 1698 lines → 4 sub-modules + a shim.

**Commits:**
- C1: extract `animation-editor-shell.js` (state + open/close).
- C2: extract `animation-editor-library-list.js`.
- C3: extract `animation-editor-edit-pane.js` (largest cut).
- C4: extract `animation-editor-live-preview.js`.
- C5: shim cleanup.

**Atomic-commit count:** ~5.

**Smoke per commit:** open editor, switch board picker, switch
scope tabs, edit a coded effect default, watch preview swatch
update, Apply, Discard, Back.

### W3.4 — `runtime-animation-lifecycle.js` split (HIGH)

**Goal:** 1369 lines → 5 sub-modules + a shim. Highest pre-
orchestration risk because cluster pads + Live Editor + cluster
dispatch are deeply tied to runtime state and live-sync.

**Commits:**
- C1: extract `runtime-lifecycle-state.js` (private state +
  helpers).
- C2: extract `runtime-lifecycle-stop-pipeline.js`.
- C3: extract `runtime-lifecycle-live-editor.js` (touch every
  Live Editor slider's listener — high-risk).
- C4: extract `runtime-lifecycle-running-list.js`.
- C5: extract `runtime-lifecycle-cluster-pads.js` (the rAF tracker
  must move with this).
- C6: shim cleanup.

**Atomic-commit count:** ~6.

**Smoke per commit:** trigger an animation (each scope: room,
inside, outside, cluster), open Live Editor, drag every slider,
discard / save, click cluster pad, Clear, ensure rail glues to
stage during pan.

### W3.5 — `runtime-orchestration.js` split (HIGHEST risk)

**Goal:** 3037 lines → 6 phase-modules + a <600-line shim.

**Recommended approach (safer):** SKIP the full split. Extract only
the 4 top-level functions + the ctx-builder block (`:2725-3022`)
into `runtime-orchestration-ctx-builder.js`. This brings
orchestration to ~2400 lines, still over 800 but explicitly allowed
by ROADMAP ("excluding the orchestration wire-up which is allowed
to be a re-export shell"). Treat this as the closure of W3.5.

**Recommended approach (full):** if planner budgets it, slice into
6 phase-modules per §4.4 above. Each phase-module is a single
function `runOrchestrationPhase<N>(refs)`. Shim remains the entry
point + the 13 init-order kernels.

**Atomic-commit count:** safer 1, full ~6+.

**Smoke per commit:** every feature in the Wave 3 ROADMAP test
plan (boards switch, room create, polygon edit, cluster pads,
animation triggers, Live Editor, Tap-Action, /output, Align Mode,
theme, sounds, export/import, live-sync). This is the
make-or-break wave for full regression.

### W3.6 — Function-size pass + secondary-file pass

**Goal:**
1. Split residual ≥150-line functions in any remaining file.
2. Decide on the 5 secondary >800-line files: `runtime-fx-panels.js`
   (985), wire-room-audio-binders (924), wire-fx-panel-binders
   (923), runtime-polygon-editor (846), runtime-draw-loop (836).

**Commits:**
- C1: split `wireFxPanelBinders` into helper-bound topical groups
  (e.g., outside-fx, inside-fx, room-fx).
- C2: split `wireRoomAudioBinders` similarly.
- C3: split `startRoomAnimationFromDraft` (637 lines) into named
  helpers per validation step.
- C4: split `renderRunningAnimationsList` if not already done in
  W3.4.
- C5: split `wireOverlayWindowBinders` and
  `wirePolygonEditorBinders` (both ~450+).
- C6: optional: peel one helper out of `runtime-polygon-editor.js`
  and `runtime-draw-loop.js` to bring each under 800.
- C7: extract `syncRoomFxPanel` helpers to bring under 150.

**Atomic-commit count:** ~7–8.

**Smoke per commit:** focused on the function's caller (e.g., split
`wireFxPanelBinders` → exercise every fx-panel binder).

### Wave 3 totals

| Sub-wave | Commits | Risk |
|----------|--------:|------|
| W3.1 utilities | ~6 | LOW |
| W3.2 projection-mapping | ~6 | MEDIUM |
| W3.3 animation-editor-view | ~5 | MEDIUM |
| W3.4 animation-lifecycle | ~6 | HIGH |
| W3.5 orchestration | 1 (safe) or ~6+ (full) | HIGHEST |
| W3.6 function-size + secondaries | ~7 | MEDIUM-HIGH |
| **Total** | **~31 (safe path) or ~36 (full path)** | — |

That's an order of magnitude more commits than Wave 1 (6) or
Wave 2 (12). Plan accordingly.

## 8. Test plan for the wave

### Per-commit (mandatory before push)

1. `node --check src/app/**/*.js` — syntax sanity for any modified
   .js (a typo'd close-brace in a 1700-line file is otherwise not
   surfaced until runtime).
2. **Browser smoke (control client)**: open `/`, observe console
   for **zero red errors**, verify `Status: Ready` appears.
3. **Browser smoke (output)**: open `/output`, observe console for
   zero red errors, verify a known animation renders.
4. **Adjacent feature smoke** (per primary target):
   - W3.1 utility commits: trigger one animation in each scope.
   - W3.2 projection-mapping: align mode toggle, drag a corner,
     drag an interior point, save+load a profile.
   - W3.3 animation-editor: open editor, edit one coded effect,
     edit one GIF, Apply, Discard.
   - W3.4 animation-lifecycle: trigger a coded room animation, open
     Live Editor, drag every slider, click cluster pad, Clear.
   - W3.5 orchestration: full ROADMAP regression checklist (this is
     unavoidable — orchestration touches everything).
   - W3.6 function-size: targeted to the function's call site.

### End-of-wave (mandatory before declaring W3 done)

Full ROADMAP "Test plan" (lines 203–275 of ROADMAP.md). Run on
fresh `node server.mjs`. ~10–15 min manual pass.

### Most-likely break per primary target

| Target | Failure mode | Symptom |
|--------|--------------|---------|
| Utility consolidation | wrong clamp range | sliders feel "stiff" or jump |
| projection-mapping | seams in `/output` rendering | black hairlines between mesh cells (regression of WebGL→2D fallback) |
| projection-mapping | align mode handles disappear | calibration unusable |
| animation-editor | preview swatch stops updating | editor still works, but preview frozen |
| animation-editor | Apply doesn't persist | profile changes lost on reload |
| animation-lifecycle | cluster pad rail freezes | rail stays in last position during pan |
| animation-lifecycle | Live Editor sliders don't edit running anim | sliders move, animation doesn't change |
| animation-lifecycle | running list doesn't render | dashboard shows zero running animations even when active |
| orchestration | TDZ ReferenceError on boot | dashboard never loads; black screen |
| orchestration | wrong ctx-arrow reference | one feature dead, rest works |
| orchestration | init-order kernel violated | intermittent / timing-dependent boot failure |

### Wave-level verification grep targets

After Wave 3 closes:

```bash
# No file in src/app/runtime/ exceeds 800 lines (orchestration shim allowed).
find src/app/runtime/ -name "*.js" -exec wc -l {} + | awk '$1 > 800 && $2 != "total"'
# Expected output: at most one line — the orchestration shim, if the safer path is taken.

# No function exceeds 150 lines.
node /tmp/find-large-funcs2.js src/app/runtime/**/*.js | grep -E '1[5-9][0-9] lines|[2-9][0-9][0-9] lines'
# Expected output: empty.
```

## 9. Risk areas the planner must be careful about

1. **The 13 init-order kernels** (8 from §1's sweep, 5 multi-paragraph
   rewrites). Splitting orchestration must preserve every kernel's
   relative position to the relevant init block, AND the kernel's
   verbatim text (Wave 2 INVENTORY committed to that text).

2. **Module-local closures over IIFE state.** Each of the 4 primary
   targets has private `let` variables at the top of the IIFE
   (`let ctx`, `let liveEditorAnimationId`, `let _glCanvasOnStage`,
   `let _glInitOk`, `const grid = {...}`, `let handlesVisible`,
   etc.). When functions split into a sub-file, the closure breaks.
   Two repair patterns:
   - Promote the state to the shim and pass via init-ctx (good for
     small singletons).
   - Move the state into the sub-file along with the functions
     that own it (good for the gl-renderer's `_gl*` state, which
     only the GL functions touch).

3. **Direct `state.X` mutations inside extracted functions.** If a
   function previously read/wrote `state.runningAnimations`
   directly (as a closure over the shim's `state`), the moved
   function needs `ctx.state.runningAnimations` access via init-
   injected ctx. Easy to miss; easier to detect — `grep state\\.`
   in each new file should yield zero matches that aren't via
   `ctx.state.`.

4. **Re-export shell correctness.** The shim's exported namespace
   must be byte-for-byte equivalent in shape. Recommended pre-
   commit check: `git stash`, capture
   `Object.keys(window.TT_BEAMER_RUNTIME_X)` in browser DevTools;
   `git stash pop`; do the split commit; reload; capture again;
   diff. **Zero diff required.**

5. **`index.html` `<script>` ordering.** New files must appear
   BEFORE the consumer that reads their namespace, AND before the
   shim. Getting this wrong fails silently in a way that surfaces
   as `TypeError: undefined is not a function` at first call.

6. **The rAF rail-tracker in `runtime-animation-lifecycle.js:23-52`.**
   Registered once via `window.requestAnimationFrame(rafTick)` and
   self-loops forever. When extracting to a cluster-pads sub-module,
   the registration MUST move with the function. If it stays in the
   shim's init, the rail freezes silently (no error — just stale
   CSS variables).

7. **The `state` reassignment** at orchestration `:36`
   (`let BOARDS = ...`) plus the `setBoards` callback pattern at
   `:626`. `BOARDS` is a `let` reassigned externally. Any phase-
   module that reads `BOARDS` must use a getter, never a captured
   value. Same for `state` (reassigned via BOARD_STATE_ACCESSORS
   callbacks).

8. **The `if (window.TT_BEAMER_ANIMATION_EDITOR_VIEW)` conditional
   guard** at orchestration `:1936`. Must be preserved on the shim
   side after the editor split.

9. **The mutually-recursive editor render flow.** library-list
   selection → edit-pane re-render + live-preview re-render;
   edit-pane Apply → library-list refresh. Resolve via init-time
   callback wiring, not via direct cross-imports.

10. **Wire-binder files (W3.6 secondary pass)** use a different
    entry-point pattern (`wireXxxBinders(ctx)`, not `init(ctx)`).
    Splits must preserve that pattern OR introduce a new wrapper —
    don't silently switch a wire-binder to the `init` pattern; the
    orchestration call site at `runtime-orchestration.js:2478`
    (and similar) calls `wireStageGestureBinders({...})` directly.

## 10. Out of scope for Wave 3

Reaffirmed from ROADMAP:

- **No naming changes** — `syncFooFromBar` vs `applyFoo` etc. stay
  as-is. Wave 4 owns naming.
- **No module-boundary cleanup beyond mechanical necessity for the
  splits.** Don't reroute imports just because the split surfaces
  an awkward dependency. Wave 5 owns boundary cleanup.
- **No behaviour changes.** Bit-for-bit identical UX from the
  user's perspective.
- **No new dependencies.** No npm packages, no build step, no
  bundler.
- **No public API changes** to the WebSocket / live-sync protocol,
  the export-bundle JSON schema, or `localStorage` keys.
- **No test framework introduction.** Manual smoke pass only.
- **No README rewrites** (Phase 23 owned that).
- **No performance optimizations** beyond what falls out
  mechanically from removing dead branches (which mostly happened
  in Wave 1 anyway).

## Sources

### Primary (HIGH confidence)
- `/home/claw/tt-beamer/.planning/phases/phase-24/ROADMAP.md` —
  Phase 24 plan (lines 123–150 are Wave 3 spec).
- `/home/claw/tt-beamer/.planning/phases/phase-24/wave-1/INVENTORY.md` —
  Wave 1 results, including 110-DOM-id deferral that lands in Wave 3.
- `/home/claw/tt-beamer/.planning/phases/phase-24/wave-2/INVENTORY.md` —
  Wave 2 results, including the 8 init-order kernels (lines 92–104),
  the 20 projection-mapping section dividers, and the duplicate zoom-
  math deferral (lines 152–154).
- `/home/claw/tt-beamer/index.html` — `<script>` load order at
  lines 804–882.
- `/home/claw/tt-beamer/src/app/runtime/runtime-orchestration.js` —
  init-order witness for all 43 init calls + 13 kernel comments.
- `/home/claw/tt-beamer/src/app/runtime/animation/runtime-animation-lifecycle.js` —
  IIFE pattern, public API surface, rAF rail-tracker.
- `/home/claw/tt-beamer/src/app/runtime/viewport/runtime-projection-mapping.js` —
  20 section dividers, IIFE/namespace pattern.
- `/home/claw/tt-beamer/src/app/runtime/ui/animation-editor-view.js` —
  function vocabulary mapping to ROADMAP's editor-shell / library /
  edit-pane / live-preview split.

### Secondary (MEDIUM confidence — derived measurements)
- Function-size scanner output (`/tmp/find-large-funcs.js`) — heuristic
  brace-depth count; cross-checked against 3 hand-spotted samples
  (renderRunningAnimationsList, openLiveEditor, _postDrawMeshWarpGL).
  Edge cases: arrow-function expressions are NOT scanned, so a few
  large arrow functions may be missed.
- `wc -l` on every runtime .js — verified post-Wave-2 line counts
  match (orchestration 3037, projection-mapping 1945, editor-view
  1698, lifecycle 1369). The ROADMAP's "3258 / 1952 / 1729 / 1421"
  numbers were the pre-Wave-1 baseline; Wave 1+2 dropped 200+ lines
  total which closes the gap to the new totals.

### Tertiary (LOW confidence — needs validation during execution)
- The 6-module orchestration split in §4.4 is a SUGGESTION. The
  planner / executor is encouraged to start with the SAFER path
  (just extract the ctx-builder + the 4 top-level functions) and
  re-evaluate after seeing the resulting orchestration size.

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | The shim's `Object.keys(window.TT_BEAMER_RUNTIME_X)` will be byte-for-byte equivalent post-split if the planner uses the recipe in §6 | §6 | Some downstream call site reads a key the shim forgot to re-export → silent TypeError at first call. Mitigation: snapshot keys before each split commit; assert match after. |
| A2 | All 13 init-order kernels in `runtime-orchestration.js` are still the COMPLETE set (no kernel was added since the Wave 2 sweep on 2026-04-25) | §1 | Splits could violate a constraint that wasn't catalogued. Mitigation: re-run Wave 2's pre-C1 sweep grep before W3.5 starts. |
| A3 | The proposed 5-way split for projection-mapping respects every cross-section call (none of the existing functions calls another in a way the proposed module split forbids) | §4.1 | A `handle-ui` function may directly call `loadFromLocalStorage` (which moves to grid-state). Mitigation: `grep` each function's call set inside the file before split; route via init-ctx if cross-module. |
| A4 | The 4 polygon-bbox sites are functionally equivalent (same min/max math) | §5 | One site uses 1000-sentinels, suggesting it operates on a fundamentally different coord space. Mitigation: keep the 1000-sentinel version local; only consolidate the 2 truly-equivalent variants. |
| A5 | The orchestration safer-path (extract only the ctx-builder + top-level functions) brings orchestration under the ROADMAP exception clause "the orchestration wire-up which is allowed to be a re-export shell" | §4.4, §7 | If the ROADMAP wording is interpreted strictly ("must split fully"), the safer path doesn't satisfy acceptance. Mitigation: confirm with user / planner; the wording is genuinely ambiguous. |
| A6 | The function-size scanner caught every ≥150-line function | §3 | Arrow-function-as-const expressions and methods on object literals are NOT caught. Mitigation: spot-check via `awk` on top-N largest files. |
| A7 | No new top-level `<script>` (e.g., a worker, an inline `<script>` block) needs to load between sub-modules and the shim | §6 | If `index.html:42` (the inline `<script>`) reads a runtime namespace, the load order matters more than the recipe assumes. Mitigation: read `index.html:42` and confirm it touches no `TT_BEAMER_RUNTIME_*` namespace. |

## Open Questions

1. **Should the 5 secondary >800-line files be in scope?**
   - What we know: ROADMAP names 4 primary targets but the
     acceptance bar applies to all of `src/app/runtime/`.
   - What's unclear: was the ROADMAP author aware of the 5
     secondaries when they wrote "ten largest modules"? "Ten
     largest" suggests yes, but only 4 are explicitly broken
     down.
   - Recommendation: include `runtime-fx-panels.js` and the two
     wire-binders in W3.6 (each is mostly one giant function;
     splits are mechanical). Defer `runtime-polygon-editor.js`
     and `runtime-draw-loop.js` to Wave 5 if W3 budget is tight
     (both are right at the edge — 846 / 836).

2. **Full vs safer orchestration split (§4.4, §7).**
   - What we know: full split is 6 phase-modules; safer split is
     just the ctx-builder extraction.
   - What's unclear: which path the planner / user prefers.
   - Recommendation: SAFER, because the ROADMAP's exception
     clause exists for exactly this case, and the full split
     compounds risk on a wave that already has 25+ atomic
     refactors.

3. **`runtime-utils.js` location.**
   - What we know: `src/app/lib/shared/normalizers.js` already
     exists with named clamps.
   - What's unclear: whether the new generic `clamp` should join
     `lib/shared/normalizers.js` instead of getting its own
     `runtime-utils.js`.
   - Recommendation: ROADMAP says "single `runtime-utils.js`" —
     follow ROADMAP wording. New file, in `src/app/runtime/`
     (NOT `src/app/lib/`), loaded as a `<script>` early.

## Environment Availability

This wave depends only on `node` (for `node --check`) and a browser
(for smoke). No external runtime / DB / service deps. Skipped.

## Validation Architecture

The project has no automated test framework. Wave 2's INVENTORY
explicitly notes: "ROADMAP regression checklist: NOT YET RUN. The
full ~10–15 min manual smoke pass (ROADMAP §"Test plan", lines
203–275) remains pending and is the user's responsibility before
declaring Wave 2 done. Comment-only changes are mathematically zero
behavior delta — the per-commit primary gate verified each commit
added/removed no executable line — but the manual smoke covers any
pre-existing oddity that overlapped with this wave's edits."

For Wave 3, the same manual smoke is the gate. There is no
automated regression. **Per-commit verification gates** are:
- `node --check <changed file>` (deterministic)
- `<dashboard URL>` opens without console errors (manual)
- `<output URL>` opens without console errors (manual)
- The feature-specific smoke per §8 (manual)

**End-of-wave gate:** the full ROADMAP test plan, manually executed.

The lack of automation is a known phase-24 limit — ROADMAP "Out of
scope" §lines 305–307 explicitly defers test framework
introduction.

## Project Constraints (from ROADMAP)

Phase 24 hard constraints (verbatim from ROADMAP, lines 60–70):

- **No behaviour changes.** Bit-for-bit identical UX from the
  user's perspective.
- **No public-API changes** to the WebSocket / live-sync protocol,
  the export-bundle JSON schema, or `localStorage` keys.
- **No dependency changes.** Same Node version, same browser
  targets, same npm packages.
- **One commit per logical refactor.** No 50-file mega-commits;
  each commit must be revertable cleanly if it breaks something.
- **Full feature regression after every wave.**

Wave 3-specific:
- **No file in `src/app/runtime/` may exceed 800 lines** post-wave
  (orchestration shim allowed exception).
- **No function may exceed 150 lines** post-wave.
- **Re-exports preserved** so import sites don't all change at once.

## Metadata

**Confidence breakdown:**
- Module-loading architecture: HIGH — every claim verified against
  source.
- Size measurements: HIGH — `wc -l` is mechanical.
- Function-size inventory: MEDIUM — heuristic scanner, ~95% sure
  the ≥150-line list is complete, but arrow-function expressions
  may add 1–2 more.
- Decomposition plans: MEDIUM — the proposed splits track the
  source structure but actual cuts may need 1-line adjustments
  during execution.
- Re-export shell strategy: HIGH — the IIFE pattern is well-
  documented in the existing code; the recipe is a faithful
  application.
- Commit slicing recommendation: MEDIUM — the relative ordering is
  defensible (low→high risk); the absolute commit count is an
  estimate.
- Risk areas: HIGH — every item is grounded in a specific source
  line.

**Research date:** 2026-04-26
**Valid until:** ~2026-05-26 (30 days; the codebase is stable enough
that line counts won't drift unless a Wave 3 commit lands).
