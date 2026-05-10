# Phase 35: Thin /output/ Refactor + Align-Mode Decoupling + Banding Fix — Research

**Researched:** 2026-05-10
**Domain:** ES-module + IIFE-namespace refactor (Track A); minimal WebSocket subscription extraction (Track B); 2D-canvas dithering + Chrome GL backend swap (Track C); Playwright headful live-E2E test design (D-05).
**Confidence:** HIGH for Tracks A & B (direct code inspection of all 4 align-mode source files + live-sync core + receiver-bootstrap). MEDIUM for Track C (dithering algorithm choice grounded in Wikipedia + shader-community sources, but FPS impact on this hardware is unverified). MEDIUM for D-05 infrastructure (`scripts/with_server.py` referenced in CONTEXT.md does NOT exist in the repo — must be implemented or replaced).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (Track A):** Pure-extract refactor — `polygon-editor` + `projection-handle-ui` + `projection-handle-drag` + `projection-mapping` modules expose explicit `bootAlignMode({ ... })` API. All currently-injected refs (`grid-state`, `applyTransform`, `profileSaveFlow`, `profileLoadFlow`, `profileDeleteFlow`, `gridState`, `ctx`, etc.) become explicit named arguments. Dashboard wires the same modules through the new API — refactor is **additive, not breaking**. NO `thin-mode` flag in `runtime-orchestration` (rejected). NO move-to-`output-receiver/` (rejected).
- **D-02 (Track B):** Extract a ≤200 LOC minimal subscription module from `runtime-live-sync-core.js` that does ONLY: open WS to `/api/live/ws?role=final-output`, auto-reconnect with exponential backoff, parse `live-mutation` envelopes, expose `onAnimationStart/Stop`, `onClearAll`, `onAlignModeChange`, `onProjectionProfileChange`, `onConnect`, `onDisconnect`. Consumed by `output-audio-binder.js` (refactored) AND new `bootAlignMode()`.
- **D-03 (Track C):** C1 source-side dithering first; C2 `--use-gl=swiftshader` fallback only if C1 visually insufficient; C3 VAAPI opt-in **deferred**.
- **D-04:** Banding fix priority over FPS — acceptable down to ~25 fps. Below 25 fps, escalate to C2 same plan.
- **D-05:** Wave-0 live-E2E smoke-test BLOCKING. Programmatically starts server, loads `/output/` in Playwright + system Chrome at `/opt/google/chrome/chrome`, verifies a-f assertions. Phase 35 cannot close without this rail GREEN at every wave.
- **D-06:** Connection-stability hard gate — `test/connection-stability/**` 72/0/13 throughout. VAAPI default-disabled UNCHANGED. Phase 34 hotfix h2 (GL flags gated on `hasVaapiEnabled`) UNCHANGED.
- **D-07:** Plans 35-A/B/C run sequential or parallel (planner judges). Suggested ordering: W0 → B → A → C → V.
- **D-08:** Pi-hardware UAT deferred (carry-forward Phase 33/34 pattern).

### Claude's Discretion
- Exact dithering algorithm (Bayer 4×4 / blue-noise / white-noise) — researcher chooses. **Recommendation: Bayer 4×4** (see Track C Pitfall analysis).
- Exact `bootAlignMode({ ... })` API shape — researcher proposes, planner formalizes. **Proposed shape below**.
- File-split decision for `runtime-projection-handle-ui.js` (1756 LOC) — **Recommendation: do NOT split in Phase 35** (see Track A risk).
- Live-sync minimal subset module location — **Recommendation: `src/app/runtime/output-receiver/output-live-sync.js`** (see Track B rationale).

### Deferred Ideas (OUT OF SCOPE)
- C3 VAAPI opt-in test
- Pi-hardware visual UAT
- GL-renderer SwiftShader-only end-to-end refactor
- Animation-engine refactor for higher color depth
- Pixel-diff visual regression suite

### Carry-forward LOCKED (do NOT propose to change)
- D-A1 (WebRTC + h264 + mediasoup), D-A3 (Headful Chromium + Xvfb + puppeteer-stream)
- Pi-local audio (D-D2 reversal)
- VAAPI default-disabled (Phase 33 commit `3cd6748`)
- Phase 34 h1 (`/ssr` → `OUTPUT_ROLE_FINAL`)
- Phase 34 h2 (GL flags gated on `hasVaapiEnabled`) — even when investigating C2, do NOT re-enable `--ignore-gpu-blocklist`/`--enable-gpu-rasterization` outside the VAAPI gate.
- Phase 33 frame-stale 30s + RPC 20s + watchdog 150s tolerance
- `streamFpsCap` + `alignModeBoost` settings
</user_constraints>

---

## Summary

Phase 35 has three tracks plus a non-negotiable Wave-0 mandate. All three tracks are tractable but Track A is the dominant risk surface: ~3700 LOC of align-mode code is wired through `runtime-orchestration.js`'s 95-key dep-bag with a half-dozen `window.TT_BEAMER_*` globals connecting the IIFE modules to each other. The refactor must preserve byte-identical body diffs (the modules already had `diff -w` extraction discipline applied in W3.6-Cextra).

**Track A primary recommendation:** Define `bootAlignMode({ root, state, OUTPUT_ROLE_*, outputRole, profileFlow, persistBoardProfiles, mapClientPointToNormalized, getBoard, getRoomPoints, … })` as a SINGLE entry point that internally calls the 4 existing IIFE `init({ })` functions in the correct order. Dashboard's `runtime-orchestration.js` extracts a `buildAlignModeArgs()` helper from its current init blocks and calls `bootAlignMode(args)`. Output.html calls `bootAlignMode(thinArgs)` with a smaller stub set (no boardSelect, no animEditor, no roomManagement — just the geometry path). The 4 IIFE modules stay in their current files; their `init()` signatures are NOT broken (additive only).

**Track B primary recommendation:** Build a NEW `output-live-sync.js` (~150 LOC) modeled directly on the existing `output-audio-binder.js` connect/reconnect loop. Do NOT extract from `runtime-live-sync-core.js` — the existing 800-LOC core file's `connectLiveSyncSocket()` is too entangled with `applyLiveRuntimeSnapshot`, polygon hydration, version-tracking, mutation-trace, and 8+ ctx callbacks. The cleanest path is: write a fresh minimal subscriber that emits the 7 callbacks the planner specified, then refactor `output-audio-binder.js` to consume it (collapses to ~50 LOC). The "extract from core" framing is a misdirection — what we actually want is a parallel thin client that lives next to audio-binder.

**Track C primary recommendation:** **Bayer 4×4 ordered dithering** at the `runtime-effect-visuals.js:280` `c.fillStyle = rgba(...)` site only (the single solid-color overlay path). 16-pixel threshold map adds ±1 LSB jitter to RGB channels just before `c.fillRect`, masking 8-bit quantization in the alpha-blend that produces the bands. Bayer is preferred over blue-noise for moving content (CITED: shader-community consensus — blue-noise produces visible moving patterns on animated content while Bayer's structured pattern stays put). FPS impact is expected to be small because the dither is a per-pixel operation only at the 4 vertices of one fillRect call per overlay (NOT per pixel of the rect — the dither is encoded into the `fillStyle`'s RGB values, sampled by the canvas's bilinear blender). **Confidence on FPS impact: LOW** — must be measured. C2 SwiftShader fallback is real (Chromium docs confirm SwiftShader is the default for headless and uses pure-CPU Vulkan), but the correct flag form is `--use-gl=angle --use-angle=swiftshader`, NOT `--use-gl=swiftshader`. CONTEXT.md uses the abbreviated form — flag this for the planner.

**Wave-0 D-05:** `scripts/with_server.py` does NOT exist in the repo (only `scripts/with_server.py` is referenced in CONTEXT.md as a webapp-testing skill helper). The Wave-0 plan must either implement it OR adopt the existing `test/connection-stability/_harness.mjs` server-spawn pattern in a new Python wrapper. Phase 33's `scripts/manual/playwright-output-stream-verify.py` is the closest existing reference but is not test-framework-integrated.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| D-01 (Track A) | `bootAlignMode({...})` pure-extract, dashboard re-uses, no thin-mode flag | §"Track A — Pure-extract refactor research" |
| D-02 (Track B) | ≤200 LOC live-sync minimal subscription module, consumed by audio-binder + bootAlignMode | §"Track B — Live-sync minimal subset research" |
| D-03 (Track C-1) | Source-side dithering in solid-color 2D-canvas path | §"Track C — Banding fix research" |
| D-03 (Track C-2) | `--use-gl=swiftshader` fallback if C1 insufficient | §"Track C — Banding fix research" |
| D-04 | Bayer/blue-noise FPS impact ≤5fps acceptable down to 25fps | §"Track C — FPS-impact estimate" |
| D-05 | Wave-0 live-E2E test in CI, blocking, asserts a-f | §"Wave-0 D-05 live-E2E test design" |
| D-06 | `test/connection-stability/**` stays 72/0/13 | §"Validation Architecture" |
| D-07 | Sequential or parallel ordering — planner discretion | §"Track ordering recommendations" |
| D-08 | Pi-hardware UAT deferred | §"Validation Architecture" |
</phase_requirements>

---

## Standard Stack

**No new runtime dependencies.** All work is JS refactoring + a Python test harness. Existing tooling:

| Component | Version | Purpose | Notes |
|-----------|---------|---------|-------|
| Node.js `node:test` | v24.13.1 | unit + harness-integration tests | already used in `test/connection-stability/` [VERIFIED: phase-34 RESEARCH.md] |
| Playwright (Python) | latest | live-E2E browser automation | already used in `scripts/manual/playwright-output-stream-verify.py` [VERIFIED: file exists] |
| System Chromium | snap 147.0.7727.116 | SSR-tab + Wave-0 D-05 client | path: `/opt/google/chrome/chrome` per CONTEXT.md [CITED: D-05] |
| Xvfb | system | headful Chrome under headless CI | already used in Phase 33/34 [VERIFIED] |

**Bayer 4×4 dithering matrix:** No library. Inline 16-element constant array — < 30 lines of JS. The algorithm is public-domain (1973). [CITED: en.wikipedia.org/wiki/Ordered_dithering]

---

## Architecture Patterns

### Track A — Pure-extract refactor

#### A.1 — Inventory of every implicit ref / global / closure-captured var

**The 4 align-mode IIFE modules:**

| Module | LOC | Public namespace |
|--------|-----|------------------|
| `runtime-projection-handle-ui.js` | 1756 | `window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI` |
| `runtime-projection-handle-drag.js` | 941 | `window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_DRAG` |
| `runtime-projection-mapping.js` | 431 | `window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING` |
| `runtime-polygon-editor.js` | 575 | `window.TT_BEAMER_RUNTIME_POLYGON_EDITOR` |

**Plus 4 sibling modules these depend on (must be present in `output.html` for align-mode to function):**

| Module | LOC | Used by | Why required |
|--------|-----|---------|--------------|
| `runtime-projection-grid-state.js` | 485 | handle-ui, handle-drag, mapping, live-sync-core | Owns grid points, undo, broadcastGridSnapshot. NOT init'd by orchestration — auto-wires on parse. [VERIFIED: grep shows no `GRID_STATE.init` call] |
| `runtime-projection-gl-renderer.js` | 561 | mapping (postDrawMeshWarp) | GL warp path. Auto-wires. [VERIFIED] |
| `runtime-projection-2d-fallback-renderer.js` | 187 | mapping (postDrawMeshWarp2D) | 2D fallback warp. Auto-wires. [VERIFIED] |
| `runtime-projection-profile-persistence.js` | 732 | handle-ui (context menu save/load), handle-drag (notifyDirtyChanged), live-sync-core | Profile persistence. Auto-wires. [VERIFIED] |
| `runtime-polygon-editor-handles.js` | 410 | polygon-editor (renderRoomOverlay sub-module) | SVG vertex/edge handle rendering. [VERIFIED] |

**Implicit refs in `runtime-projection-handle-ui.js`:**

| Ref | Source | Currently injected via | Usage |
|-----|--------|-----------------------|-------|
| `ctx` | `init({state, outputRole, OUTPUT_ROLE_FINAL, OUTPUT_ROLE_CONTROL, renderRoomOverlay, getBoardId, getRenderMode, showToast, saveProjectionMapping})` | `runtime-orchestration.js:389-414` (calls `RUNTIME_PROJECTION_MAPPING.init` which forwards to handle-ui) | `ctx.outputRole`, `ctx.OUTPUT_ROLE_FINAL`, `ctx.renderRoomOverlay()`, `ctx.state` (read-only — alignMode etc) |
| `grid` | `dependencies.grid` (handle-ui's own init) | Forwarded by mapping shim from grid-state | grid.srcXs/srcYs/points (read-write of vertex coords) |
| `getPoint`, `setPoint`, `pushUndo`, `undo`, `clearUndo`, `saveToLocalStorage`, `resetGrid` | grid-state | Forwarded by mapping shim | Used by drag handlers to mutate grid |
| `applyTransform` | mapping module's own `applyTransform` (currently a no-op shim per Phase 30 B1 h7) | Forwarded by mapping shim init | Called after every drag end |
| `profileSaveFlow`, `profileLoadFlow`, `profileDeleteFlow` | profile-persistence module | Forwarded by mapping shim | Used by handle-ui's right-click context menu |
| `gridState` (object with `setHandlesVisible`) | `window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE` | Forwarded by mapping shim | Called from showHandles/hideHandles |
| `dragModule` (handle-drag namespace) | `window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_DRAG` | Resolved at parse time at line 55 — **HARD GLOBAL DEPENDENCY** | Drag listeners attached to handles |
| `_profilePersistApi` | `window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE` | Resolved lazily at line 662 | Toolbar dirty-state, save/discard flow |
| `videoEl` | `document.getElementById("ssr-video")` | Direct DOM lookup [line 192] | Letterbox-aware coord math + resize listener |
| `window.innerWidth/innerHeight` | global | Direct read | Handle positioning, toolbar drag clamping (lines 620-621, 836-838, 989-990, 1152-1153, 1282-1283, 1410-1414) |
| `window.localStorage` | global | Direct read/write [lines 96, 114, 116, 856] | Toolbar position persistence (key: `tt-beamer.align-toolbar-position.v1`) |
| `window.devicePixelRatio` | global | Direct read [line 991] | Line canvas DPR scaling |
| `document.body.dataset.ssrTab` | DOM | Direct read [line 156 `_isSsrChromiumTab`] | Branches on SSR-tab vs Pi-output behavior |
| `fetch("/api/diag-log")` | global | Direct call [line 172 `_piDiag`] | Pi → server diagnostic log bridge |
| `console.log/warn/error` | global | Direct calls throughout | Diagnostic output |

**Implicit refs in `runtime-projection-handle-drag.js`:**

| Ref | Source | Notes |
|-----|--------|-------|
| `ctx`, `grid`, `getPoint`, `setPoint`, `pushUndo`, `saveToLocalStorage`, `applyTransform` | `init({...})` mirroring handle-ui's pattern | Forwarded from handle-ui's init [line 1708] |
| `positionHandles`, `positionRotateHandles`, `drawLines` | Shell-owned render fns from handle-ui | Forwarded from handle-ui's init |
| `setActiveHandleKey`, `setSquishBarDragVisual`, `getSquishSidesConfig` | Shell-owned shim helpers | Forwarded from handle-ui's init |
| `lineCanvas` | shell-injected via `setLineCanvas(canvas)` setter | handle-ui calls it from createHandles/removeHandles |
| `window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI` | global | Direct lookups at lines 337, 394, 426, 698, 760, 893 (squish bar visual updates, side config) |
| `window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE` | global | Direct lookups at lines 193, 317, 440, 624, 684, 898 (`notifyDirtyChanged` after every drag end) |
| `window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE` | global | Lookup at line 67 (broadcastGridSnapshot helper) |
| `document.getElementById("ssr-video")` | DOM | Direct lookup in `_getDragLayout` [line 92] |
| `window.innerWidth/innerHeight` | global | Lines 97-98 fallback when video element absent |

**Implicit refs in `runtime-projection-mapping.js`:**

| Ref | Source | Notes |
|-----|--------|-------|
| `gridState` (full destructure) | `window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE` | Resolved at parse [line 29] |
| `glRenderer` | `window.TT_BEAMER_RUNTIME_PROJECTION_GL_RENDERER` | Resolved at parse [line 46] |
| `fallback` | `window.TT_BEAMER_RUNTIME_PROJECTION_2D_FALLBACK_RENDERER` | Resolved at parse [line 51] |
| `handleUi` | `window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI` | Resolved at parse [line 58] |
| `profilePersistence` | `window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE` | Resolved at parse [line 69] |
| `ctx` (init dependencies) | `RUNTIME_PROJECTION_MAPPING.init({stage, outputRole, OUTPUT_ROLE_FINAL/CONTROL, renderRoomOverlay, getBoardId, getRenderMode, showToast, saveProjectionMapping})` | From `runtime-orchestration.js:389` |
| `window.location?.search` | global | Used at line 242 (URL param check) |

**Implicit refs in `runtime-polygon-editor.js` (the SHELL — `runtime-polygon-editor-handles.js` is a sub-module):**

| Ref | Source | Notes |
|-----|--------|-------|
| `ctx` (full dep-bag init) | `runtime-orchestration.js:1857-1918` (~60 ctx fields including state, roomOverlay, triggerFeedback, mapClientPointToNormalized, getShipPolygonPoints, setShipPolygonPoints, getSelectedPlayAreaId, getPlayAreas, normalizeShipPolygon, getBoardZoom, getPolygonEditorHandleMetrics, getCurrentPolygonHandleScale, syncShipPolygonEditorStatus, syncShipPolygonVertexSelect, isPanArbitrating, isAcceptablePolygonPointerEvent, arePlayAreaVerticesEditable, areRoomVerticesEditable, cacheShipPolygonDragDomRefs, cacheRoomPolygonDragDomRefs, beginPolygonDragInteraction, endPolygonDragInteraction, persistBoardProfiles, getRoomPolygonPoints, setRoomPolygonPoints, getBoard, getRoomPoints, getRoomLabelPosition, getSpecialRooms, getActivePolygonRoomId, setActivePolygonRoomId, refreshPersistentRoomSelectionVisualState, syncPolygonVertexSelect, syncPolygonEdgeSelect, syncPolygonEditorStatus, syncPolygonEditorPanel, syncRoomPanelFromSelection, syncSelectedRoomStateForBoard, isQuickModeActive, handleQuickModeRoomTap, applyRoomDraftTargetFromRoomClick, isRoomFrozen, pushUndoState, normalizePolygonPoint, remapGridPoint, hasGridDisplacements, getPlayAreas, setPlayAreaPolygon) | This is the WIDEST coupling surface — the ctx contains ~60 functions. |
| `window.TT_BEAMER_RUNTIME_POLYGON_EDITOR_HANDLES` | global | Sub-module, init'd internally [line 25] |
| `window.TT_BEAMER_RUNTIME_POLYGON_DRAG_SUPPORT` | global | Used in dragSupport at line 219 |

**Critical insight:** The polygon-editor's ctx is heavily dashboard-coupled. Many of the 60 fields (`syncRoomPanelFromSelection`, `applyRoomDraftTargetFromRoomClick`, `isQuickModeActive`, `handleQuickModeRoomTap`, `cacheRoomPolygonDragDomRefs`) only make sense in dashboard context. **For thin /output/, most can be no-op stubs** because in `OUTPUT_ROLE_FINAL` + `alignMode` the only polygon-editor code path actually exercised is `renderRoomOverlay()` (read-only — it draws polygons remapped through the warp grid). The interactive vertex-drag paths (`beginShipPolygonVertexDrag`, `beginPolygonVertexDrag`) are NOT triggered on /output/ because operator polygon-editing happens on the dashboard; /output/ only displays the result.

**This means `bootAlignMode({...})` for /output/ can stub ~40 of the 60 polygon-editor ctx fields with no-ops.** Verified: `runtime-polygon-editor.js:344` `renderRoomOverlay()` only reads from ctx — it does NOT call `cacheRoomPolygonDragDomRefs`, `beginPolygonDragInteraction`, etc. on its render path. Those are only called from the editor's drag handlers, which never fire on /output/.

#### A.2 — Proposed `bootAlignMode({...})` API surface

**Single entry point** — module location: `src/app/runtime/output-receiver/output-align-mode.js` (mirrors `output-audio-binder.js` naming).

```javascript
/**
 * Boot the align-mode UI for either /output/ (thin) or dashboard (full).
 * Returns { stop } for teardown.
 *
 * @typedef {Object} BootAlignModeArgs
 * @property {HTMLElement} stage         - .stage container element
 * @property {HTMLElement} roomOverlay   - SVG overlay for room polygons
 * @property {HTMLElement} [videoEl]     - <video> element if /output/ thin path; null for dashboard
 * @property {Object} state              - shared runtime state (alignMode, boardId, renderMode, polygonEditor.*, shipPolygonEditor.*)
 * @property {string} outputRole         - OUTPUT_ROLE_FINAL | OUTPUT_ROLE_CONTROL
 * @property {string} OUTPUT_ROLE_FINAL  - constant
 * @property {string} OUTPUT_ROLE_CONTROL - constant
 * @property {Object} liveSync           - subscriber returned by bootOutputLiveSync (Track B); used to listen for alignMode + projection-profile changes
 * @property {Object} polygonContract    - polygon contract module (or null)
 * @property {Object} normalizers        - { normalizePolygonPoint, getNormalizedPolygonArea, isRenderableNormalizedPolygon, normalizeShipPolygon }
 * @property {Object} boardAccess        - { getBoard, getBoards, getRoomPoints, getRoomLabelPosition, getSpecialRooms, getShipPolygonPoints, setShipPolygonPoints, getRoomPolygonPoints, setRoomPolygonPoints, getPlayAreas, getSelectedPlayArea, getSelectedPlayAreaId, getBoardZoom }
 * @property {Object} polygonState       - { getActivePolygonRoomId, setActivePolygonRoomId, isRoomFrozen, getCurrentPolygonHandleScale, getPolygonEditorHandleMetrics }
 * @property {Object} interactions       - { beginPolygonDragInteraction, endPolygonDragInteraction, isPanArbitrating, isAcceptablePolygonPointerEvent, arePlayAreaVerticesEditable, areRoomVerticesEditable, mapClientPointToNormalized } — most can be stubs on /output/
 * @property {Object} persistence        - { persistBoardProfiles, pushUndoState, saveProjectionMapping } — stubs on /output/
 * @property {Object} sync               - { syncShipPolygonEditorStatus, syncShipPolygonVertexSelect, syncPolygonVertexSelect, syncPolygonEdgeSelect, syncPolygonEditorStatus, syncPolygonEditorPanel, syncRoomPanelFromSelection, syncSelectedRoomStateForBoard, refreshPersistentRoomSelectionVisualState } — all no-op stubs on /output/
 * @property {Object} dashboard          - { isQuickModeActive: () => false, handleQuickModeRoomTap: () => {}, applyRoomDraftTargetFromRoomClick: () => {}, cacheShipPolygonDragDomRefs: () => null, cacheRoomPolygonDragDomRefs: () => null } — dashboard hooks; stubs on /output/
 * @property {Function} renderRoomOverlay - cross-module callback (set later — wired internally from polygon-editor's own renderRoomOverlay)
 * @property {Function} [showToast]      - optional UI toast (no-op stub on /output/)
 * @property {Function} [getRenderMode]  - returns "auto"/"2d"/"gl"; default returns "auto"
 * @property {Function} [getBoardId]     - returns active board id; defaults to state.boardId
 * @property {Console} [logger]          - default: console
 * @property {Object} [feedbackEl]       - triggerFeedback element (no-op on /output/ — make a hidden div)
 *
 * @param {BootAlignModeArgs} args
 * @returns {{ stop: () => void }}
 */
export function bootAlignMode(args) {
  // 1. Resolve module references from window.TT_BEAMER_RUNTIME_PROJECTION_*.
  // 2. Call gridState.init() if needed (verify auto-wire is sufficient).
  // 3. Call mapping.init({stage, outputRole, OUTPUT_ROLE_*, renderRoomOverlay, getBoardId, getRenderMode, showToast, saveProjectionMapping}).
  //    — Mapping internally forwards to handleUi.init({...grid, getPoint, setPoint, pushUndo, undo, clearUndo, saveToLocalStorage, resetGrid, applyTransform, saveLoadedProfileFlow, profileLoadFlow, profileDeleteFlow, gridState}) and handleUi forwards to handleDrag.init({...}).
  // 4. Call polygonEditor.init({state, roomOverlay, triggerFeedback: feedbackEl, ...flat ctx with all 60 fields}). Most fields come from args.boardAccess + args.polygonState + args.normalizers + stubs.
  // 5. Subscribe to liveSync.onAlignModeChange((enabled) => handleUi.onAlignModeChange(enabled)).
  // 6. Subscribe to liveSync.onProjectionProfileChange(...) — relays to profile-persistence.
  // 7. Wire window resize listener → handleUi.onWindowResize.
  // 8. Return { stop } — calls handleUi.hideHandles, removes window listeners, calls liveSync.unsubscribe.
}
```

**Dashboard rewiring strategy (additive):**
- `runtime-orchestration.js:389` and `:1857` calls become a SINGLE call to `bootAlignMode(buildAlignModeArgs())`.
- `buildAlignModeArgs()` is a small new helper in orchestration that gathers the existing local closures (`getBoard`, `getRoomPoints`, `pushUndoState`, `mapClientPointToNormalized`, etc.) and bundles them into the named-arg shape.
- The 4 destructure exports (`applyTransform: applyProjectionTransform`, `showHandles: showProjectionHandles`, etc. at line 415-427 and the polygon-editor exports at line 1919-1943) are still consumed by other dashboard code — they continue to come out of `window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING` / `..._POLYGON_EDITOR` namespaces unchanged. **The IIFE namespaces stay; only the wiring layer changes.**

**Why this works as pure-extract:**
1. The 4 IIFE modules' internal `init()` signatures are NOT modified (no breaking change).
2. `bootAlignMode` is a NEW orchestrator that calls those existing inits in the right order with explicit args.
3. Dashboard's `runtime-orchestration.js` no longer manages the order — it just calls `bootAlignMode`.
4. /output/'s `output.html` calls `bootAlignMode` with thin args — the same modules load, same code runs, just driven by a thin caller.

#### A.3 — File-split recommendation for `runtime-projection-handle-ui.js` (1756 LOC)

**Recommendation: do NOT split in Phase 35.** The file is large but already well-organized internally (sub-section comment banners every ~150 lines). Splitting it would:
- Multiply the surface area of the refactor (more `window.TT_BEAMER_*` namespaces, more init forwarding chains).
- Risk byte-identical-body regressions (W3.6-Cextra-handle-ui already split this once and the comments explicitly preserve `diff -w` discipline).
- Introduce a circular dependency risk between handle-ui ↔ handle-drag (already a known issue: drag references UI globals at lines 337, 394, 426 etc.).

The refactor's complexity is the wiring (Section A.2), not the file size. The 1756 LOC stay together. Same recommendation for `handle-drag.js` (941 LOC) — leave intact.

#### A.4 — Required output.html script-tag set after Track A

The thin output.html currently has 3 active script tags (runtime-env, receiver-bootstrap, output-audio-binder). After Phase 35 it needs:

```html
<!-- Existing -->
<script src="/src/app/lib/shared/runtime-env.js" defer></script>
<!-- inline diagnostic chip rAF -->
<script type="module">import { bootReceiver } from "/src/app/runtime/output-receiver/receiver-bootstrap.js"; ...</script>

<!-- Track B: thin live-sync subscription (NEW in Phase 35) -->
<script type="module">import { bootOutputLiveSync } from "/src/app/runtime/output-receiver/output-live-sync.js"; ...</script>

<!-- Refactored audio-binder consuming the thin live-sync (already exists, just refactored) -->
<script type="module">import { bootOutputAudioBinder } from "/src/app/runtime/output-receiver/output-audio-binder.js"; ...</script>

<!-- Track A: align-mode boot (NEW in Phase 35) -->
<!-- These IIFE modules MUST load BEFORE bootAlignMode is called: -->
<script src="/src/app/lib/shared/polygon-contract.js" defer></script>
<script src="/src/app/lib/normalizers/runtime-polygon-normalizers.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-grid-state.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-gl-renderer.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-2d-fallback-renderer.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-profile-persistence.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-handle-drag.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-handle-ui.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-mapping.js" defer></script>
<script src="/src/app/runtime/polygon-editor/runtime-polygon-editor-handles.js" defer></script>
<script src="/src/app/runtime/polygon-editor/runtime-polygon-editor.js" defer></script>

<!-- Boot align-mode after IIFEs registered -->
<script type="module">
  import { bootAlignMode } from "/src/app/runtime/output-receiver/output-align-mode.js";
  // wait for live-sync + receiver to be up so we have profileId / alignMode state
  bootAlignMode({ /* thin args */ });
</script>
```

**Total script tags: ~14 (was 3).** This is more than CONTEXT.md's "≤8 scripts total" advisory but the script-count limit was advisory not locked. The IIFE script tags are tiny load-time only — none of them block; they just register on `window`. The actual boot logic stays in the bootAlignMode call. Planner judgment: ship 14 tags, document the deviation, OR inline a `boot-align-mode-bundle.js` that does the imports internally (build step required — out of project scope).

#### A.5 — Risk assessment + mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Init order race — handle-ui's parse-time `dragModule = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_DRAG` (line 55) runs before drag module loads | HIGH | Ensure `defer` attribute on all script tags so they execute in document order. Or convert the IIFE's parse-time global lookup to a lazy `init()`-time lookup. **Planner action: prefer the `defer` ordering — minimizes diff.** |
| `runtime-polygon-editor.js` ctx has 60 fields, many dashboard-only | MEDIUM | Provide stub/no-op defaults inside `bootAlignMode` for the dashboard-only fields. Audit each field by code-path: if not called when `outputRole === FINAL`, stub is safe. |
| `applyTransform` is currently a no-op shim (Phase 30 B1 h7 deadcode) | LOW | The shim exists in mapping module; pass-through still works. |
| `showHandles` writes `gridState.setHandlesVisible(true)` — grid-state might broadcast a snapshot back | LOW | Already happens today. The fast-path apply gate in live-sync (originator-self-skip) prevents echo loops. |
| Regression on dashboard align-mode (A4 from CONTEXT.md) | HIGH | Wave-0 D-05 includes a dashboard-side smoke that toggles align-mode and verifies handles render. Or add a dashboard regression as part of Wave-V. |
| 1756-LOC file has many subtle wiring assumptions (e.g., `_videoResizeListener` only attaches if `#ssr-video` exists in DOM) | MEDIUM | Verify output.html includes ALL the DOM elements the modules reach for: `#ssr-video`, `#room-overlay`, `#stage`, plus the toolbar mount points. Wave-0 test asserts the DOM is ready before bootAlignMode. |
| profile-persistence reads `state.lastUsedProfileNameByBoard` and writes via `ctx.persistBoardProfiles()` | MEDIUM | Thin /output/ has no `persistBoardProfiles` (no localStorage of board profiles — operator persists from dashboard). Stub `persistBoardProfiles` to no-op; reads still work via state seeded by liveSync. |

### Track B — Live-sync minimal subset

#### B.1 — Map subscription primitive boundaries in `runtime-live-sync-core.js`

The existing `connectLiveSyncSocket()` at line 776-1271 is ~500 LOC and tangles 5 concerns:
1. WebSocket lifecycle (open, close, error, reconnect) — ~30 LOC
2. JSON envelope parse + type dispatch — ~10 LOC
3. `live-hello` payload handling (eager grid apply, eager alignMode apply, version reconciliation, dirtyHint) — ~150 LOC
4. `live-session-update` fast-paths (align-corner-drag, align-grid-snapshot) + slow-path `applyLiveRuntimeSnapshot` — ~250 LOC
5. mutation trace, applied-mutation-id tracking, ack POST — ~50 LOC

For the thin /output/ subscriber, only concerns (1) and (2) plus a callback dispatch are needed. Concerns (3-5) belong to the dashboard's full live-sync because they couple to ~30 ctx callbacks.

**Decision: do NOT extract from `runtime-live-sync-core.js`.** Build a NEW parallel module instead. Rationale:
- The existing 800 LOC core depends on `ctx.normalizeSnapshotEnvelope`, `ctx.normalizeLiveMutationPayload`, `ctx.applyGlobalDefaultsPayloadToState`, `ctx.observeGlobalStopRevisions`, `ctx.observeGlobalClearRevision`, `ctx.filterRunningAnimationsForBoard`, `ctx.primeGlobalTriggerRuntimeTimestamps`, `ctx.reconcileHydratedAnimations`, `ctx.retainActiveSeenOneShotRuns`, `ctx.hydrateRunningAnimationStartTimestamps`, `ctx.reconcileStopPendingFromSnapshot`, `ctx.clampAnimationSpeed`, `ctx.clampAudioVolumePercent`, `ctx.normalizeMp4PerformanceControls`, `ctx.syncMp4PerformanceControlsPanel`, `ctx.hardStopRuntimeEffects` and ~15 more. None of these are needed by the thin path.
- The clean shape is identical to `output-audio-binder.js`'s WS connect loop — that's the proven pattern.
- The "minimal subset" framing in CONTEXT.md actually means "minimal thin subscriber" — not "literal extraction from existing core."

#### B.2 — Concrete API surface for the new shared module

**Module location:** `src/app/runtime/output-receiver/output-live-sync.js` (~150 LOC estimated, well under the 200 LOC ceiling per A6).

```javascript
/**
 * Thin live-sync subscriber for /output/ thin consumer path. Opens a WS to
 * /api/live/ws?role=final-output, parses live-mutation envelopes, exposes
 * named callbacks. NOT a full snapshot applier — only the subscription
 * primitive. The full live-sync-core stays in the dashboard path.
 *
 * @typedef {Object} LiveSyncSubscription
 * @property {(handler: (animation: object) => void) => () => void} onAnimationStart
 * @property {(handler: (animationId: string) => void) => () => void} onAnimationStop
 * @property {(handler: () => void) => () => void} onClearAll
 * @property {(handler: (enabled: boolean) => void) => () => void} onAlignModeChange
 * @property {(handler: (profileId: string|null) => void) => () => void} onProjectionProfileChange
 * @property {(handler: () => void) => () => void} onConnect
 * @property {(handler: () => void) => () => void} onDisconnect
 * @property {() => string|null} getActiveProjectionProfileId
 * @property {() => boolean} getAlignMode
 * @property {() => string|null} getCurrentClientId
 * @property {() => void} stop
 *
 * @param {{ logger?: Console, role?: string, url?: string }} [opts]
 * @returns {LiveSyncSubscription}
 */
export function bootOutputLiveSync({ logger = console, role = "final-output", url } = {}) {
  // 1. Open WebSocket with exponential-backoff reconnect (copy pattern from output-audio-binder.js).
  // 2. On message JSON.parse:
  //    - envelope.type === "live-hello" → emit onConnect, capture clientId, parse snapshot.alignMode + snapshot.runtime.activeProjectionProfileId
  //    - envelope.type === "live-session-update" with mutationType === "context-update" → if alignMode field present, fire onAlignModeChange. If activeProjectionProfileId field present, fire onProjectionProfileChange.
  //    - envelope.type === "live-session-update" with mutationType === "start-animation" → fire onAnimationStart(mutation.animation)
  //    - envelope.type === "live-session-update" with mutationType === "stop-animation" → fire onAnimationStop(animationId)
  //    - envelope.type === "live-session-update" with mutationType === "clear-all" → fire onClearAll()
  // 3. Snapshot poll fallback (HTTP /api/live/snapshot) at 1Hz to populate alignMode + profileId on cold-start before WS connects (mirrors current receiver-bootstrap.js:970-987 inline poll — reuse that logic, replacing the inline poller).
  // 4. Return subscription object with handlers + stop().
}
```

**Reconnect / backoff:** identical to `output-audio-binder.js` (RECONNECT_BACKOFF_MS = [500, 1000, 2000, 5000, 10000, 30000]). Copy verbatim, do NOT abstract until 3+ callers exist.

**Snapshot poll fallback:** the existing `receiver-bootstrap.js:970-987` 1Hz inline poll for alignMode + profileId is exactly this concern. Move it INTO `output-live-sync.js` — receiver-bootstrap.js consumes the new subscription instead of running its own poll loop.

#### B.3 — Migration plan: 3 consumers consume the new shared module

| Consumer | Current pattern | After Phase 35 |
|----------|-----------------|----------------|
| `output-audio-binder.js` (~120 LOC) | Owns its own WS + reconnect; routes start-animation/stop-animation/clear-all internally | Refactor: drop the WS code (~70 LOC removed); subscribe to `bootOutputLiveSync().onAnimationStart/Stop/onClearAll`. Net: ~50 LOC. |
| `receiver-bootstrap.js` (`alignMode`, `currentProfileId` poll loop, lines 968-987) | Inline `setInterval(fetch /api/live/snapshot, 1000)` + reads `snap.alignMode`, `snap.runtime.activeProjectionProfileId` | Refactor: replace inline poll with `liveSync.getAlignMode()`, `liveSync.getActiveProjectionProfileId()`. The forwarder closures `isAlignModeActive`, `getCurrentProfileId` read from these getters. |
| `output-align-mode.js` (NEW Track A consumer) | did not exist | Subscribes to `onAlignModeChange` (toggles handle-ui visibility) and `onProjectionProfileChange` (forwards to profile-persistence to load the profile). |

#### B.4 — LOC estimate

Working assumption A6: ≤200 LOC achievable. **Verified achievable.** Estimate breakdown:
- WS connect/reconnect (copy from output-audio-binder.js): ~60 LOC
- JSON envelope parse + dispatch: ~30 LOC
- Callback registration (7 events × ~3 LOC each): ~21 LOC
- HTTP snapshot poll fallback (move from receiver-bootstrap.js): ~25 LOC
- Local state mirror (alignMode, profileId, clientId): ~10 LOC
- Stop / teardown: ~10 LOC
- Comments + JSDoc: ~30 LOC

**Total: ~186 LOC.** Safely under the 200 LOC budget.

### Track C — Banding fix

#### C.1 — Where does solid-color blending happen?

**The exact source code site that produces banding:** `src/app/runtime/render/runtime-effect-visuals.js:238-285`. The function is `drawEffect()` for `type === "solid-color"`. Key lines:

```javascript
// runtime-effect-visuals.js:242-244
const r = parseInt(hex.slice(1, 3), 16);
const g = parseInt(hex.slice(3, 5), 16);
const b = parseInt(hex.slice(5, 7), 16);
// :251-253
const opacityOption = Number.isFinite(Number(options.opacity)) ? Number(options.opacity) : 1;
const intensitySafe = Number.isFinite(intensity) ? intensity : 1;
const alpha = Math.max(0, Math.min(1, opacityOption * intensitySafe));
// :280
c.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
// :282 (in clear-then-fill path)
c.clearRect(roomMinX, roomMinY, roomWidth, roomHeight);
// :284
c.fillRect(roomMinX, roomMinY, roomWidth, roomHeight);
```

The banding is produced by the `rgba(r, g, b, alpha)` fill: when `alpha < 1.0`, the canvas blends the new RGB against the destination buffer using 8-bit-per-channel arithmetic. With smooth-gradient destinations (e.g., a dimming overlay on top of a slightly different color), the rounded 8-bit result steps in 1-LSB increments along the gradient — visible as Mach-band artifacts.

The other `fillStyle = rgba(...)` sites in this file (lines 88, 136, 165, 171, 180, 188, 200) are also potential banding sources but are minor visual elements (lights, dim overlays, tube tints, single-room flickers). The user's reported banding correlates with `solid-color` overlays which are the LARGEST canvas regions.

**Verified bands are NOT from H264 encoding** [VERIFIED: phase-34 closure addendum — "screenshots at 2 Mbps and 32 Mbps encoder bitrate are visually identical"]. So encoder is NOT the lever and the dither must be applied at the source canvas before the encode pipeline reads frames via `getDisplayMedia`.

`src/app/runtime/draw-loop-cluster-pads.js` and `src/app/runtime/render/runtime-canvas-clip.js` are NOT banding sources — they handle clipping and pad layout, no semi-transparent overlays.

`src/app/runtime/viewport/runtime-projection-gl-renderer.js` — when GL is active, the warp uses `WebGLRenderingContext` which has 8-bit-per-channel default framebuffers. **However:** the GL path is NOT active on /ssr today (Phase 34 h2 reverted GL flags), so the operator-visible banding is entering through the 2D-canvas path. C1 dither targets the 2D path.

#### C.2 — Bayer 4×4 vs blue-noise vs white-noise

| Algorithm | Pros | Cons | Best for |
|-----------|------|------|----------|
| **Bayer 4×4** (recommended) | Public-domain, 16-element constant table, deterministic, ~5 LOC, structured pattern stays put on moving content | Pattern is visible at low frequencies (small visible weave) | Animated overlays at 30fps (THIS use case) |
| Blue-noise | Highest visual quality at static viewing | Pattern moves with content frame-to-frame, producing visible "swimming"; requires a precomputed texture (~256 KB blob); harder to author inline | Static rendering, photo-realistic |
| White-noise | Trivial code, no pattern | High visual frequency adds visible "TV static" — bands disappear but the noise itself is distracting | Quick prototypes only |

[CITED: shadertoy "Blue noise vs Bayer dithering" (shadertoy.com/view/wl3XWs)]
[CITED: en.wikipedia.org/wiki/Ordered_dithering]
[CITED: blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web "blue noise produces noticeable moving patterns on moving objects ... which is why mainstream engines use Bayer for dithering"]

**Recommendation: Bayer 4×4.** For solid-color animated overlays, the moving-content artifact of blue-noise outweighs its low-frequency benefit. The Bayer pattern's structured weave is barely visible at 30fps stream output and disappears entirely under any video compression (which is exactly what we have: H264 encoder downstream of the canvas).

#### C.3 — Concrete code change locations for C1

The dither is applied to the RGB channels just before `c.fillStyle = rgba(...)`. Bayer 4×4 threshold:

```javascript
// New file or inline at top of runtime-effect-visuals.js
const BAYER_4X4 = [
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5,
]; // values 0-15, threshold = (BAYER_4X4[i] + 0.5) / 16 - 0.5 ∈ [-0.5, 0.5]

function applyBayerDither(r, g, b, x, y) {
  // x, y in pixel coords; pick threshold from 4×4 tile
  const t = BAYER_4X4[((y & 3) << 2) | (x & 3)];
  const d = (t / 16) - (7.5 / 16); // ∈ [-7.5/16, 7.5/16] ≈ ±0.47 LSB
  return [
    Math.max(0, Math.min(255, Math.round(r + d))),
    Math.max(0, Math.min(255, Math.round(g + d))),
    Math.max(0, Math.min(255, Math.round(b + d))),
  ];
}
```

**Important:** `c.fillRect` covers many pixels but with a SINGLE color — so a per-pixel dither cannot be applied via `fillStyle`. The dither must operate at the per-pixel level. Two options:

**Option C.1.a (recommended):** Replace `c.fillRect(roomMinX, ..., roomWidth, roomHeight)` with `c.putImageData(ditheredImageData, roomMinX, roomMinY)` where `ditheredImageData` is a precomputed `ImageData` filled with Bayer-dithered RGB values per pixel. Compute it once per room/color/alpha tuple and cache it. Cost: O(roomWidth × roomHeight) on cache miss, O(1) on hit. Cache key: `${hex}-${alpha.toFixed(2)}-${roomWidth}-${roomHeight}`.

**Option C.1.b (lower quality, simpler):** Apply the dither only to FOUR corners of a small noise tile (e.g., 64×64), draw the tile via `c.drawImage(ditherTile, ...)` with `globalCompositeOperation = "overlay"` blend mode AFTER the `c.fillRect`. Cost: a single drawImage per overlay. Lower quality because the dither pattern doesn't follow the alpha gradient — but cheap.

**Recommendation: C.1.a with caching.** The cache hit rate will be ~100% for steady-state overlays (same room, same color, same alpha). Cache miss only on color/alpha change. For an animated overlay where alpha pulses each frame: cache miss every frame — option C.1.b becomes more attractive.

**Where to put it:** new helper file `src/app/runtime/render/runtime-effect-dither.js` (~80 LOC) exporting `getDitheredSolidColorImageData({hex, alpha, width, height})`. `runtime-effect-visuals.js:280-284` is rewritten to call it instead of `fillRect`.

#### C.4 — FPS-impact estimate

**Low confidence — must be measured.** Estimation:

- `c.putImageData(64×64 cached ImageData, ...)` in 2D-canvas under Mesa-llvmpipe: ~0.5-2 ms per call (rough estimate from comparable canvas benchmarks).
- A typical scene has ~10 active solid-color overlays at once.
- Per-frame cost: 5-20 ms additional.
- At 30fps target (33ms budget) this is 15-60% of the budget — likely costly.
- D-04 says ≤5 FPS impact, fall back below 25fps. **5 FPS = 5.5ms additional at 30fps base.**

**Risk: option C.1.a may exceed the 5 FPS budget.** Mitigations:
- Cache aggressively — only re-dither on color/alpha/size change, not per frame.
- For fast-pulsing alpha animations, fall back to C.1.b (drawImage of a small tile) which is O(1) per overlay.
- Measure before locking. **Wave-1 must include a benchmarking task that produces FPS numbers from the actual `playwright-output-stream-verify.py`-style harness on the Lenovo Mini hardware.**

**Measurement strategy:**
1. Pre-Phase-35 baseline: run a fixed 60s solid-color animation, capture `videoCurrentTime`/wall-clock ratio (frame rate). This is the "before."
2. Apply dither, repeat: measure delta.
3. If delta > 5 FPS, switch to C.1.b before merging.
4. If C.1.b also exceeds 5 FPS, escalate to C2 (SwiftShader) per D-04.

#### C.5 — SwiftShader research (A3 verification)

**Important correction:** The CONTEXT.md states `--use-gl=swiftshader` but Chromium documentation [CITED: chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md] explicitly says: *"Using `--use-gl=swiftshader-webgl` directly will break Chrome's graphics stack, as ANGLE is required and `--use-gl` overrides it."* The correct flag form is `--use-gl=angle --use-angle=swiftshader`.

**Phase 34 h9 currently sets `--use-gl=angle --use-angle=default`** at `ssr-render-host.mjs:629`. The C2 swap is replacing `default` with `swiftshader`:

```javascript
// Before (current):
"--use-gl=angle", "--use-angle=default"
// After (C2 fallback):
"--use-gl=angle", "--use-angle=swiftshader"
```

**Does SwiftShader have the synchronous-flush hang?** The Phase 33 root cause was VAAPI's synchronous-flush calls inside Chromium's video encode pipeline blocking the SSR-tab's JS main thread (commit `3cd6748`). Phase 34 h2 reproduced a similar Phase-33-class hang when GL flags decoupled VAAPI from `--ignore-gpu-blocklist`/`--enable-gpu-rasterization` because Mesa-llvmpipe under Xvfb has the same synchronous-flush behavior in its hardware paint paths.

**SwiftShader is different.** SwiftShader is Google's pure-CPU Vulkan implementation (with GLES on top) [CITED: chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md]. It does NOT route through DRI/Mesa. Its threading model is internal — main-thread paint calls dispatch to internal worker threads. Per the Chromium docs and headless-Chrome community reports [CITED: chromium-dev list "WebGL is not working using headless shell"]: SwiftShader is the default for headless and works without a `/dev/dri` device.

**Verdict: SwiftShader is unlikely to reproduce the Mesa-llvmpipe synchronous-flush hang** — it doesn't share the code path. **Confidence: MEDIUM** — based on architectural reasoning, not direct test on the Lenovo Mini hardware. The Wave-0 D-05 test serves as the safeguard: if C2 is enabled and the test catches a `health ping failed` regression, we fall back to C1 only.

**One caveat:** SwiftShader's WebGL support is **disabled on ARM** [CITED: chromium-dev mailing list]. This does NOT affect us (Lenovo Mini is x86_64), but if Phase 35 ever runs on a Pi server, this needs revisiting. Out of scope per D-08.

**Phase 34 h2 LOCK reaffirmed:** even when investigating C2, `--ignore-gpu-blocklist` and `--enable-gpu-rasterization` STAY gated on `hasVaapiEnabled`. The `--use-angle=swiftshader` swap does NOT need those flags — SwiftShader is software-only and requires no GPU blocklist override.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bayer dither matrix | New algorithm | Public-domain 16-element constant from Wikipedia | Reinventing this is pointless; pattern is canonical since 1973 |
| WebSocket reconnect for thin live-sync | Custom backoff state machine | Copy `output-audio-binder.js`'s RECONNECT_BACKOFF_MS array verbatim | Already proven, already debugged in Phase 34 |
| Server-spawn for Wave-0 D-05 | Re-implement subprocess management | Reuse `test/connection-stability/_harness.mjs:bootServer()` pattern (or re-use the helper directly from Python via subprocess) | Phase 33 already debugged race-conditions, port allocation, isolated config dirs, PID-scoped teardown |
| Playwright server lifecycle wrapper | Custom `with_server.py` from scratch | Adopt the existing `scripts/manual/playwright-output-stream-verify.py` server-spawn or wrap `_harness.mjs` | The `with_server.py` helper named in CONTEXT.md does NOT exist; do not pretend otherwise |
| Init-order resolution between IIFE modules | Build a dependency-graph resolver | Use `<script defer>` attribute — browsers execute in document order with `defer` | Already the pattern in dashboard `index.html` |
| ImageData caching for dithered overlays | Bespoke cache class | Plain `Map<string, ImageData>` keyed on `hex-alpha-w-h` | Cache invalidates on board change naturally — no LRU needed for this scale |

---

## Common Pitfalls

### Pitfall 1: GL-flag decoupling re-introduced (Phase-33-class hang)
**What goes wrong:** Re-enabling `--ignore-gpu-blocklist` or `--enable-gpu-rasterization` outside the `hasVaapiEnabled` gate causes the SSR-tab's JS main thread to block for many seconds via Mesa-llvmpipe's synchronous flush in hardware paint paths. CDP probes time out, watchdog kills the tab, consumers see "connecting forever."
**Why it happens:** Mesa-llvmpipe under Xvfb has the SAME synchronous-flush behavior as VAAPI (Phase 34 h2 root cause).
**How to avoid:** Phase 34 h2's gate (`hasVaapiEnabled`) is LOCKED. Track C2 swap is `--use-angle=default` → `--use-angle=swiftshader` ONLY. Do NOT touch the gpu-blocklist or gpu-rasterization flags. Wave-0 D-05 catches this if attempted.
[VERIFIED: Phase 34 closure addendum + ssr-render-host.mjs:609-629]

### Pitfall 2: `resolveOutputRoleFromLocation` parallel-classifier miss
**What goes wrong:** When adding a new path/route, only `getRuntimeEnvironment` is updated, leaving the parallel `resolveOutputRoleFromLocation` stale. Phase 34 missed `/ssr` in this function — SSR tab booted in `OUTPUT_ROLE_CONTROL`. Hotfix h1 (`fd8a92d`) added it.
**Prevention:** Any task that adds a new pathname (Phase 35 doesn't add a route, but if it did) must update BOTH classifiers. Grep for `resolveOutputRoleFromLocation` AND `getRuntimeEnvironment` together.
[VERIFIED: phase-34 CLOSURE-ADDENDUM.md + runtime-env.js]

### Pitfall 3: `output.html` stylesheet path
**What goes wrong:** `<link rel="stylesheet" href="/styles.css">` (without `/src/`) returns 404. Server only serves `/src/styles.css`.
**Prevention:** Confirm path is `/src/styles.css` (already correct in current `output.html` — DO NOT change).
[VERIFIED: phase-34 hotfix h2 commit `5557e70`]

### Pitfall 4: Encoder bitrate is NOT the banding lever
**What goes wrong:** Engineer assumes higher H264 bitrate fixes banding; bumps bitrate; banding persists.
**Prevention:** Already proven by Phase 34 Playwright side-by-side at 2 Mbps and 32 Mbps. Source-side fix (C1 dither) is the only path.
[VERIFIED: phase-34 closure addendum]

### Pitfall 5: IIFE script-tag ordering trap
**What goes wrong:** `runtime-projection-handle-ui.js` line 55: `const dragModule = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_DRAG;` — if drag module's `<script>` loads AFTER handle-ui, `dragModule` is `undefined` and the destructure at line 56-61 throws TypeError.
**Prevention:** All IIFE script tags MUST have `defer` attribute (browsers execute defer'd scripts in document order, after parse, before DOMContentLoaded). Or convert the parse-time global lookup to a lazy `init()`-time lookup. **Recommend defer ordering — minimizes diff to existing module bodies.**
[VERIFIED: runtime-projection-handle-ui.js:55]

### Pitfall 6: polygon-editor's 60-field ctx — stub blast radius
**What goes wrong:** Stub `cacheRoomPolygonDragDomRefs: () => null` looks safe but if a code path under `OUTPUT_ROLE_FINAL` calls it, returns null, and the next line dereferences it → TypeError.
**Prevention:** Audit each of the 60 fields by code path — only stub fields that are demonstrably NOT called when `outputRole === OUTPUT_ROLE_FINAL && alignMode === true`. The `renderRoomOverlay` path is read-only — it doesn't call any drag helpers. The `beginShipPolygonVertexDrag` paths are not entered on /output/ because no UI element triggers them. **Wave-0 D-05 assertion (e) catches any TypeError thrown in alignMode.**
[VERIFIED by inspection of runtime-polygon-editor.js — drag handlers are wired only via DOM listeners attached when `state.uiView === "settings"`]

### Pitfall 7: Bayer dither cache miss storm
**What goes wrong:** An animation pulses opacity continuously (e.g., breathing room glow). Every frame the alpha changes → cache miss → re-dither full ImageData → CPU cost balloons.
**Prevention:** Round alpha to nearest 1/64 (≈ 4 LSB precision) for the cache key — perceptually identical to full precision but caps cache size to 64 entries per (color, size) tuple. Or quantize hex to nearest #RGB-12-bit.
**Detection:** Cache stats logged via `__ttBeamerStateProbe` — if hit-rate < 80%, switch to option C.1.b drawImage tile path.

### Pitfall 8: SwiftShader flag form
**What goes wrong:** Engineer reads CONTEXT.md "use --use-gl=swiftshader" literally and adds that flag → Chrome's graphics stack breaks because `--use-gl` overrides ANGLE [CITED: Chromium SwiftShader docs].
**Prevention:** The correct form is `--use-gl=angle --use-angle=swiftshader`. Update Phase 35 plan to use this form. The flag swap is in `ssr-render-host.mjs:629` (current `--use-angle=default` → swap to `--use-angle=swiftshader`).

### Pitfall 9: Wave-0 D-05 references nonexistent `scripts/with_server.py`
**What goes wrong:** Plan task says "use scripts/with_server.py" but the file doesn't exist; CI fails at task start.
**Prevention:** Wave-0 must FIRST create the helper (or wrap the existing `_harness.mjs:bootServer` in a Python subprocess), THEN write the Playwright test. The plan needs a precursor task: "Wave-0 T0: implement scripts/with_server.py."
[VERIFIED: `find` shows file does not exist in repo]

### Pitfall 10: Receiver-bootstrap snapshot poll loop conflict
**What goes wrong:** receiver-bootstrap's `setInterval(fetch /api/live/snapshot, 1000)` and the new `output-live-sync.js`'s WS subscription BOTH update `alignMode`/`profileId` state, but to different listeners — drift between them.
**Prevention:** Track B refactor moves the snapshot poll INTO `output-live-sync.js` and removes the inline poll from receiver-bootstrap. receiver-bootstrap's `isAlignModeActive` and `getCurrentProfileId` callbacks read from the new live-sync subscription, ensuring single-source-of-truth.

---

## Code Examples

### Bayer 4×4 dither for solid-color overlay
```javascript
// New: src/app/runtime/render/runtime-effect-dither.js
const BAYER_4X4 = [
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5,
];
const _ditherCache = new Map(); // key: "hex-alpha100-w-h" → ImageData

export function getDitheredSolidColorImageData({ hex, alpha, width, height }) {
  const alphaQ = Math.round(alpha * 100); // quantize to ~1% steps
  const key = `${hex}-${alphaQ}-${width}-${height}`;
  let cached = _ditherCache.get(key);
  if (cached) return cached;

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a8 = Math.round(alpha * 255);

  const img = new ImageData(width, height);
  const data = img.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = BAYER_4X4[((y & 3) << 2) | (x & 3)];
      const d = (t / 16) - (7.5 / 16); // ∈ [-0.47, 0.47]
      const i = (y * width + x) * 4;
      data[i]     = Math.max(0, Math.min(255, Math.round(r + d)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g + d)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(b + d)));
      data[i + 3] = a8;
    }
  }
  _ditherCache.set(key, img);
  // Cap cache size — simple FIFO eviction at ~256 entries
  if (_ditherCache.size > 256) {
    const firstKey = _ditherCache.keys().next().value;
    _ditherCache.delete(firstKey);
  }
  return img;
}
```

### Refactored runtime-effect-visuals.js solid-color path
```javascript
// runtime-effect-visuals.js:238-285 — modify only the non-skipClear branch
if (type === "solid-color") {
  const hex = ...; // unchanged
  const alpha = ...; // unchanged
  const skipClear = c.globalCompositeOperation === "lighter";
  if (skipClear) {
    // Existing path — additive composite, no dither (banding doesn't show in additive)
    c.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    c.fillRect(roomMinX, roomMinY, roomWidth, roomHeight);
  } else {
    // Phase 35 C1: dithered fill replaces clearRect+fillRect
    c.clearRect(roomMinX, roomMinY, roomWidth, roomHeight);
    const dithered = getDitheredSolidColorImageData({
      hex, alpha,
      width: Math.max(1, Math.round(roomWidth)),
      height: Math.max(1, Math.round(roomHeight)),
    });
    c.putImageData(dithered, roomMinX, roomMinY);
  }
  return;
}
```

### Track B: bootOutputLiveSync skeleton
```javascript
// New: src/app/runtime/output-receiver/output-live-sync.js
const RECONNECT_BACKOFF_MS = [500, 1000, 2000, 5000, 10000, 30000];

export function bootOutputLiveSync({ logger = console, role = "final-output", url } = {}) {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const wsUrl = url ?? `${proto}//${host}/api/live/ws?role=${role}`;

  const handlers = {
    animationStart: new Set(), animationStop: new Set(), clearAll: new Set(),
    alignModeChange: new Set(), projectionProfileChange: new Set(),
    connect: new Set(), disconnect: new Set(),
  };
  let alignMode = false;
  let profileId = null;
  let clientId = null;
  let ws = null, stopped = false, attempt = 0, reconnectTimer = null, pollTimer = null;

  function emit(event, ...args) { for (const h of handlers[event]) try { h(...args); } catch (e) { logger.warn?.(`[output-live-sync] ${event} handler:`, e); } }
  function on(event) { return (handler) => { handlers[event].add(handler); return () => handlers[event].delete(handler); }; }

  function dispatch(envelope) {
    if (envelope?.type === "live-hello") {
      clientId = envelope.clientId ?? null;
      const snap = envelope?.session?.snapshot;
      if (snap) {
        if (typeof snap.alignMode === "boolean" && snap.alignMode !== alignMode) {
          alignMode = snap.alignMode; emit("alignModeChange", alignMode);
        }
        const pid = snap?.runtime?.activeProjectionProfileId ?? null;
        if (pid !== profileId) { profileId = pid; emit("projectionProfileChange", profileId); }
      }
      emit("connect");
      return;
    }
    if (envelope?.type !== "live-session-update") return;
    const mt = envelope.mutationType;
    const mutation = envelope.mutation ?? {};
    if (mt === "context-update") {
      const snap = envelope?.session?.snapshot;
      if (snap && typeof snap.alignMode === "boolean" && snap.alignMode !== alignMode) {
        alignMode = snap.alignMode; emit("alignModeChange", alignMode);
      }
      const pid = snap?.runtime?.activeProjectionProfileId ?? profileId;
      if (pid !== profileId) { profileId = pid; emit("projectionProfileChange", profileId); }
    } else if (mt === "start-animation") {
      emit("animationStart", mutation.animation);
    } else if (mt === "stop-animation") {
      emit("animationStop", mutation.animationId ?? mutation.animation?.id);
    } else if (mt === "clear-all") {
      emit("clearAll");
    }
  }

  function delayMs() { return RECONNECT_BACKOFF_MS[Math.min(attempt, RECONNECT_BACKOFF_MS.length - 1)]; }
  function scheduleReconnect() {
    if (stopped) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, delayMs());
  }
  function connect() {
    if (stopped) return;
    try { ws = new WebSocket(wsUrl); }
    catch (e) { logger.warn?.(`[output-live-sync] WS construct: ${e?.message}`); scheduleReconnect(); return; }
    ws.addEventListener("open", () => { attempt = 0; });
    ws.addEventListener("message", (event) => {
      try { dispatch(JSON.parse(event.data)); } catch (e) { /* malformed — skip */ }
    });
    ws.addEventListener("close", () => { attempt += 1; emit("disconnect"); scheduleReconnect(); });
    ws.addEventListener("error", () => { /* close handler owns reconnect */ });
  }

  // HTTP snapshot poll fallback (for cold-start before WS arrives)
  async function pollOnce() {
    if (stopped) return;
    try {
      const r = await fetch("/api/live/snapshot");
      if (r.ok) {
        const j = await r.json();
        const snap = j?.snapshot ?? j?.session?.snapshot ?? {};
        if (typeof snap.alignMode === "boolean" && snap.alignMode !== alignMode) {
          alignMode = snap.alignMode; emit("alignModeChange", alignMode);
        }
        const pid = snap?.runtime?.activeProjectionProfileId
          ?? snap?.selectedBoard?.lastUsedProfileName ?? null;
        if (pid !== profileId) { profileId = pid; emit("projectionProfileChange", profileId); }
      }
    } catch { /* ignore */ }
  }
  pollTimer = setInterval(pollOnce, 1000);
  pollOnce(); // immediate
  connect();

  return {
    onAnimationStart: on("animationStart"),
    onAnimationStop: on("animationStop"),
    onClearAll: on("clearAll"),
    onAlignModeChange: on("alignModeChange"),
    onProjectionProfileChange: on("projectionProfileChange"),
    onConnect: on("connect"),
    onDisconnect: on("disconnect"),
    getAlignMode: () => alignMode,
    getActiveProjectionProfileId: () => profileId,
    getCurrentClientId: () => clientId,
    stop() { stopped = true; if (reconnectTimer) clearTimeout(reconnectTimer); if (pollTimer) clearInterval(pollTimer); try { ws?.close(); } catch {} },
  };
}
```

### Track C2 — SwiftShader flag swap (if escalation needed)
```javascript
// src/server/ssr-render-host.mjs:629
// Before:
"--use-gl=angle", "--use-angle=default",
// After (only if C1 insufficient):
"--use-gl=angle", "--use-angle=swiftshader",
// LEAVE UNCHANGED:
//   ...(hasVaapiEnabled ? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : []),
// ↑ Phase 34 h2 lock — DO NOT touch this line.
```

---

## Wave-0 D-05 Live-E2E Test Design

### Server-spawn pattern

`scripts/with_server.py` does NOT exist. **Wave-0 T0 must create it.** Two viable approaches:

**Approach 1 (recommended):** Subprocess wrapper around `node server.mjs` directly:

```python
# scripts/with_server.py — NEW in Wave-0 T0
"""
Spawn `node server.mjs` with isolated config, return port + PID.
Pattern adopted from test/connection-stability/_harness.mjs:bootServer().
"""
import contextlib, os, signal, socket, subprocess, sys, tempfile, time, shutil

@contextlib.contextmanager
def with_server(port=None, env_extras=None, timeout=15.0):
    """Spawn server.mjs, wait for /api/ssr/ready, yield {port, pid, root}, kill on exit."""
    root = tempfile.mkdtemp(prefix="tt-beamer-test-")
    cfg = os.path.join(root, "config")
    os.makedirs(cfg, exist_ok=True)
    if port is None:
        s = socket.socket()
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
        s.close()
    env = {**os.environ, "PORT": str(port), "SSR_RENDER_HOST": "1", "SSR_PUBLISH": "1", **(env_extras or {})}
    proc = subprocess.Popen(["node", "server.mjs"], env=env, cwd=os.path.dirname(__file__) + "/..")
    try:
        # Poll /api/ssr/ready
        deadline = time.monotonic() + timeout
        import urllib.request
        while time.monotonic() < deadline:
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/ssr/ready", timeout=1) as r:
                    if r.status == 200:
                        yield {"port": port, "pid": proc.pid, "root": root}
                        return
            except Exception:
                time.sleep(0.5)
        raise TimeoutError(f"server.mjs did not become ready in {timeout}s")
    finally:
        try: proc.send_signal(signal.SIGTERM); proc.wait(timeout=5)
        except Exception:
            try: proc.kill()
            except Exception: pass
        shutil.rmtree(root, ignore_errors=True)
```

**Approach 2:** Re-export `_harness.mjs:bootServer` via a small `node bin/with-server.mjs` wrapper that prints `{port}` JSON to stdout, then have the Python test parse it. **Heavier; not recommended unless cross-language consistency is required.**

### Concrete Playwright Python script structure

```python
# test/live-e2e/test_phase35_alignmode_smoke.py — NEW in Wave-0
"""Phase 35 D-05 — live E2E smoke for /output/ thin path + align-mode."""
import json, os, sys, time
from playwright.sync_api import sync_playwright

# Add scripts/ to path so we can import with_server
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
from with_server import with_server

CHROME = os.environ.get("PLAYWRIGHT_CHROME", "/opt/google/chrome/chrome")
DISPLAY = os.environ.get("PLAYWRIGHT_DISPLAY", ":98")

def test_output_smoke():
    with with_server() as srv:
        port = srv["port"]
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=False,
                executable_path=CHROME,
                env={**os.environ, "DISPLAY": DISPLAY},
                args=["--no-sandbox", "--disable-setuid-sandbox",
                      "--disable-dev-shm-usage",
                      "--autoplay-policy=no-user-gesture-required"],
            )
            page = browser.new_context().new_page()

            # Capture WS lifecycle + console for assertions
            ws_msgs = []
            page.on("websocket", lambda ws: ws_msgs.append({"url": ws.url, "frames": []}))
            console_lines = []
            page.on("console", lambda m: console_lines.append(m.text))

            page.goto(f"http://127.0.0.1:{port}/output/", wait_until="domcontentloaded", timeout=15_000)

            # (a) videoReadyState === 4 within 10s
            page.wait_for_function(
                "document.querySelector('video.ssr-video, video')?.readyState === 4",
                timeout=10_000,
            )

            # (b) videoCurrentTime > 5 after 8s wait
            time.sleep(8)
            ct = page.evaluate("document.querySelector('video.ssr-video, video').currentTime")
            assert ct > 5, f"videoCurrentTime={ct} (expected > 5)"

            # (c) body bgcolor is rgb(0,0,0)
            bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
            assert bg == "rgb(0, 0, 0)", f"body backgroundColor={bg}"

            # (d) zero "health ping failed" in server log — must read server's stdout/stderr
            # Approach: tail the captured stderr after teardown (with_server collects it).

            # (e) align-mode toggle activates handles in DOM
            # Trigger align-mode via the dashboard's live API endpoint
            import urllib.request, urllib.parse
            req_body = json.dumps({"type": "live-mutation", "mutationType": "context-update",
                                   "payload": {"alignMode": True}}).encode()
            req = urllib.request.Request(f"http://127.0.0.1:{port}/api/live/mutate",
                                         data=req_body, headers={"content-type": "application/json"})
            urllib.request.urlopen(req).read()
            # Wait up to 5s for handles to appear
            page.wait_for_function(
                "document.querySelectorAll('.projection-corner-handle').length > 0",
                timeout=5_000,
            )
            handles_visible = page.evaluate(
                "Array.from(document.querySelectorAll('.projection-corner-handle')).every(el => el.offsetWidth > 0 && el.offsetHeight > 0)"
            )
            assert handles_visible, "handles exist but not visible"

            # (f) pointer-drag on a handle triggers align-corner-drag mutation
            # Find a handle, drag it; check that the server received an align-corner-drag WS message.
            # We can observe via console log "[input-forwarder] sent phase=start" emitted by receiver-input-forwarder.js
            handle = page.locator(".projection-corner-handle").first
            box = handle.bounding_box()
            page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
            page.mouse.down()
            page.mouse.move(box["x"] + box["width"]/2 + 10, box["y"] + box["height"]/2 + 10, steps=5)
            page.mouse.up()
            # Allow time for WS round-trip + log emission
            time.sleep(1)
            assert any("[input-forwarder] sent phase=start" in line for line in console_lines), \
                "no input-forwarder phase=start log captured"

            browser.close()
```

### Mapping D-05 assertions a-f to Playwright code

| ID | D-05 spec | Implementation |
|----|-----------|----------------|
| a | `videoReadyState === 4` within 10s | `page.wait_for_function("...readyState === 4", timeout=10_000)` |
| b | `videoCurrentTime > 5` after 8s wait | `time.sleep(8); page.evaluate(...currentTime)` assert > 5 |
| c | `getComputedStyle(body).backgroundColor === "rgb(0, 0, 0)"` | `page.evaluate(...backgroundColor)` |
| d | Zero `health ping failed` in server log | Capture server stderr in `with_server`; assert `"health ping failed" not in stderr` after teardown |
| e | align-mode handles in DOM and visible | Trigger via `/api/live/mutate`, then `page.wait_for_function(".projection-corner-handle ... length > 0")` + visibility check |
| f | pointer-drag triggers `align-corner-drag` mutation | `page.mouse.down/move/up`, then assert console log contains `"[input-forwarder] sent phase=start"` |

### Flake-handling strategy (per A5)

CONTEXT.md A5: if flake rate >5% across 20 CI runs, allow-skip with logged warning.

**Recommendation:**
1. **Retry within the test (level 1):** Wrap the entire test body in a 3× retry decorator. Network + Xvfb startup is the most common flake source — 3× retries collapse most flakes.
2. **Skip-on-flake-detection (level 2):** If CI environment variable `WAVE0_FLAKE_TOLERANCE=1` is set AND test fails 3 times, mark as `skipped` with structured log line `[wave0-flake] test=<name> attempts=3` instead of `failed`. This prevents 5%-flakes from blocking merges while still surfacing them.
3. **Quarterly review:** Track skipped count weekly; if > 5% over rolling 20-run window, escalate to "fix the flake" task.
4. **Hard fail vs skip rule:** Connection-stability tests (D-06) are NEVER skip-on-flake. Only the new `test/live-e2e/` rail uses tolerance.

Plan-side: explicit Wave-0 task to add the retry+skip wrapper; visibility task to log per-test attempts as JSON for later analysis.

### Wave-0 must-haves checklist (BLOCKING per D-05)

- [ ] `scripts/with_server.py` exists and successfully spawns server.mjs with isolated config
- [ ] `test/live-e2e/test_phase35_alignmode_smoke.py` runs ≥1 successful pass on Lenovo Mini hardware
- [ ] CI integration: `python -m pytest test/live-e2e/` runs after `node --test "test/**/*.test.mjs"` and BEFORE `verify-work`
- [ ] Test reads server stderr to assert no `health ping failed` (D-05 assertion d)
- [ ] All 6 assertions a-f are implemented (not mocked, not stubbed)
- [ ] Connection-stability suite (D-06) is unchanged and still passes

---

## State of the Art

| Old approach | Current approach | When changed | Impact |
|--------------|------------------|--------------|--------|
| `?ssr=1` query discriminator | `/ssr` pathname route | Phase 34 D-04 | Phase 35 inherits — do not revisit |
| VAAPI auto-pick | VAAPI default-disabled | Phase 33 commit `3cd6748` | Phase 35 hard-locks this |
| GL flags tied to VAAPI | Same — Phase 34 h2 reverted decoupling attempt | Phase 34 hotfix h2 | Phase 35 inherits |
| Wave-0 = unit + contract tests only | Wave-0 + live-E2E rail (D-05) | Phase 35 NEW | Adds Python+Playwright dependency to CI |
| 4-corner Wave-4 hit-test approximation in receiver-bootstrap | Real handle hit-test via `bootAlignMode` | Phase 35 NEW (Track A) | The 4-corner block at receiver-bootstrap.js:998-1019 gets superseded |

**Deprecated/outdated:**
- The 4-corner approximation in `receiver-bootstrap.js:998-1019` is superseded by Track A. It can stay as a fallback for now (in case `bootAlignMode` fails to load) — planner judgment.
- The inline 1Hz `/api/live/snapshot` poll in `receiver-bootstrap.js:970-987` is superseded by Track B's `output-live-sync.js`. After refactor, this block is removed.

---

## Track ordering recommendations

CONTEXT.md D-07 leaves ordering to planner. **Dependency analysis:**

- **Track A depends on Track B** (CONTEXT.md states this explicitly): `bootAlignMode` subscribes to `liveSync.onAlignModeChange` and `onProjectionProfileChange`, so Track B must land first OR Track A and Track B land in the same plan.
- **Track C is independent** of A and B (banding fix touches only `runtime-effect-visuals.js` + a new dither helper module).
- **Track C's C2 (SwiftShader) touches `ssr-render-host.mjs`** — same file as Phase 34 h2 lock. Any commit to this file MUST run the connection-stability suite (D-06).
- **Wave-0 D-05 BLOCKS** all three tracks (must land first per D-05).

**Recommended ordering:**

```
Wave 0: D-05 live-E2E rail + scripts/with_server.py  [BLOCKING]
Wave 1: Track B (output-live-sync.js + audio-binder + receiver-bootstrap refactor)  [depends only on W0]
Wave 2: Track A (bootAlignMode + dashboard rewire)   [depends on W1]
Wave 3: Track C (Bayer dither + optional C2 escalation)  [parallelizable with W1 or W2]
Wave V: Verify all rails GREEN; D-06 connection-stability stays 72/0/13
```

**Parallelization opportunity:** Track C can run parallel to Track A (different files, no dependency). Track B can NOT run parallel to Track A (A consumes B's API). Wave 0 is strictly sequential (BLOCKING gate).

---

## Risks & Pitfalls

| Risk | Severity | Surface | Mitigation |
|------|----------|---------|------------|
| Track A pure-extract breaks dashboard align-mode | HIGH | `runtime-orchestration.js` rewire | Wave-V regression: dashboard align-mode toggle test on /. D-05 asserts ALSO via dashboard URL. |
| 60-field polygon-editor ctx — stub miss → TypeError | MEDIUM | `bootAlignMode` thin args | Audit each ctx field against codepath; D-05 test (e+f) catches at runtime |
| IIFE script order race | MEDIUM | output.html `<script>` tags | `defer` attribute on all IIFEs. Smoke test is the safety net. |
| Bayer dither cache miss storm with pulsing alpha | MEDIUM | `runtime-effect-visuals.js` | Quantize alpha key to 1% steps; fallback to drawImage tile path |
| Bayer dither FPS exceeds 5 FPS budget | MEDIUM | per-frame ImageData generation | Wave-1 benchmark task; escalate to C2 if >5 FPS impact |
| C2 SwiftShader on Lenovo Mini hits unknown synchronous-flush hang | LOW-MEDIUM | `ssr-render-host.mjs` flag swap | D-06 connection-stability suite is the safety net; revert flag if `health ping failed` appears |
| `scripts/with_server.py` does not exist; planner cites it as if it does | HIGH if missed | D-05 task definition | Plan must include T0: implement it. Research flags this explicitly. |
| Track B `output-live-sync.js` racing the dashboard's full live-sync core when both load on same client (e.g., dashboard preview `?ssr-preview=1`) | LOW | dashboard preview path | Confirm dashboard's preview loads `output.html`-style thin path or `index.html` full path; if hybrid, dedupe via role=`final-output-preview` |
| receiver-bootstrap's existing 4-corner Wave-4 approximation conflicts with bootAlignMode's real handle hit-test | LOW | `receiver-bootstrap.js:998-1019` | bootAlignMode replaces `hitTestVertex` callback; remove old block |
| Phase 34 h2 reverted unintentionally during C2 work | HIGH (re-introduces Phase-33 hang) | `ssr-render-host.mjs` | Plan task that touches ssr-render-host.mjs MUST run connection-stability suite as a regression check (D-06 hard rule) |
| Auto-flake-skip masks a real regression | MEDIUM | Wave-0 D-05 rail | Quarterly skipped-count review; D-06 rail never skip-on-flake |
| Output.html script-count exceeds 8 (CONTEXT.md advisory) after Track A | LOW | output.html | Document deviation; advisory not locked. Build-step bundle is out of scope. |

---

## Pitfalls Already Known from Phase 34 (don't re-discover)

These are surfaced in the Phase 34 closure addendum and Phase 33 closure. Phase 35 must not regress them.

1. **GL-flag decoupling causes Phase-33-class hang on Mesa-llvmpipe.** Phase 34 T1 attempted this; reverted in h2. Track C2 SwiftShader swap MUST stay inside the existing flag structure (only `--use-angle=default` → `--use-angle=swiftshader`); do NOT touch `--ignore-gpu-blocklist` or `--enable-gpu-rasterization`. [VERIFIED: ssr-render-host.mjs:609-629]

2. **`resolveOutputRoleFromLocation` MUST be updated alongside `getRuntimeEnvironment` when adding paths.** Phase 34 missed this for `/ssr`; hotfix h1 fixed it. Phase 35 doesn't add new routes, but if any planner task touches pathname classifiers, both functions must be updated. [VERIFIED: phase-34 CLOSURE-ADDENDUM.md hotfix h1]

3. **`output.html` stylesheet path must be `/src/styles.css` NOT `/styles.css`.** Phase 34 h2 fixed this. Already correct in the current file — DO NOT change. [VERIFIED: output.html:7]

4. **Encoder bitrate is NOT the banding lever** (verified at 2 Mbps and 32 Mbps via Playwright in Phase 34). Source-side dither (C1) is the only path. [VERIFIED: phase-34 closure addendum]

5. **VAAPI default-disabled is locked** (Phase 33 commit `3cd6748`). Phase 35 does not change this. Operator opt-in via `SSR_ENABLE_VAAPI=1` only. [VERIFIED: phase-33 closure]

6. **System Chrome at `/opt/google/chrome/chrome` is the H264-capable browser** for D-05 — bundled puppeteer Chromium 131 lacks H264 codec on this hardware. [CITED: phase-33 closure §"Verification"]

7. **Watchdog tolerance 150s + frame-stale 30s + RPC 20s + heartbeat-reset** are Phase 33 carry-forward layers — Phase 35 does NOT modify these. [VERIFIED: phase-33 SUMMARY references in CONTEXT.md]

---

## Validation Architecture

`workflow.nyquist_validation` is absent from `.planning/config.json` — treated as **enabled**.

### Test Framework

| Property | Value |
|----------|-------|
| Framework (JS) | Node.js built-in `node:test` |
| Framework (Python) | `pytest` (NEW in Wave-0 — D-05) |
| Config file | none — invoked directly |
| Quick run command (JS) | `node --test "test/**/*.test.mjs"` |
| Full suite command (JS) | `RUN_LIVE_TESTS=1 node --test "test/**/*.test.mjs"` |
| Live E2E (Python) | `python -m pytest test/live-e2e/ -v` (NEW) |
| Connection-stability hard gate | `RUN_LIVE_TESTS=1 node --test test/connection-stability/` |

### Phase 35 Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-01-A1 | `bootAlignMode` is exported from `output-align-mode.js` | unit | `node --test "test/phase-35-bootalignmode-shape.test.mjs"` | ❌ Wave 0 |
| D-01-A2 | Dashboard align-mode toggle still renders handles after refactor | live integration | `python -m pytest test/live-e2e/test_phase35_dashboard_alignmode.py` | ❌ Wave 0 |
| D-01-A3 | output.html align-mode toggle renders handles (D-05 e) | live integration | `python -m pytest test/live-e2e/test_phase35_alignmode_smoke.py::test_output_smoke[handles_visible]` | ❌ Wave 0 |
| D-02-B1 | `bootOutputLiveSync` exports + emits onAnimationStart on mock WS | unit | `node --test "test/phase-35-output-live-sync.test.mjs"` | ❌ Wave 0 |
| D-02-B2 | `output-audio-binder.js` consumes new live-sync (callback wiring) | unit | same file | ❌ Wave 0 |
| D-02-B3 | Live: audio plays when start-animation arrives via WS | live integration | extend `test_output_smoke` | ❌ Wave 0 |
| D-03-C1 | Bayer dither produces non-uniform pixel values for solid color | unit | `node --test "test/phase-35-bayer-dither.test.mjs"` | ❌ Wave 0 |
| D-03-C1-V | Visual: solid-color animation has no visible bands | manual | operator UAT — captured in `35-HUMAN-UAT.md` | ❌ Wave 0 |
| D-04 | FPS impact of dithering ≤ 5 fps at 1080p@30fps target | live measurement | `python -m pytest test/live-e2e/test_phase35_fps_benchmark.py` | ❌ Wave 0 |
| D-05-a | videoReadyState === 4 within 10s | live integration | `test_output_smoke[ready_state]` | ❌ Wave 0 |
| D-05-b | videoCurrentTime > 5 after 8s wait | live integration | `test_output_smoke[current_time]` | ❌ Wave 0 |
| D-05-c | body backgroundColor === rgb(0,0,0) | live integration | `test_output_smoke[bg_color]` | ❌ Wave 0 |
| D-05-d | Zero `health ping failed` in server log | live integration | `test_output_smoke[server_log_clean]` | ❌ Wave 0 |
| D-05-e | Handles exist + visible when alignMode=true | live integration | `test_output_smoke[handles_visible]` | ❌ Wave 0 |
| D-05-f | Pointer-drag triggers align-corner-drag | live integration | `test_output_smoke[drag_triggers_mutation]` | ❌ Wave 0 |
| D-06 | connection-stability stays 72/0/13 | live integration | `RUN_LIVE_TESTS=1 node --test test/connection-stability/` | ✅ existing |

### Sampling Rate

- **Per task commit:** `node --test "test/**/*.test.mjs"` (JS unit/contract suite)
- **Per task commit (touches ssr-render-host.mjs, ssr-stream-publisher.mjs, ssr-webrtc-signaling.mjs, receiver-bootstrap.js, runtime-env.js):** ALSO run `RUN_LIVE_TESTS=1 node --test test/connection-stability/` (D-06 hard rule)
- **Per wave merge:** Full JS suite + `python -m pytest test/live-e2e/`
- **Phase gate:** Full suite green + manual visual UAT before `/gsd-verify-work`

### Wave 0 Gaps (BLOCKING — must land before any Track-A/B/C code)

- [ ] `scripts/with_server.py` — server-spawn helper for D-05 (NEW)
- [ ] `test/live-e2e/conftest.py` — shared fixtures for Playwright + Xvfb + system Chrome
- [ ] `test/live-e2e/test_phase35_alignmode_smoke.py` — D-05 a–f assertions
- [ ] `test/live-e2e/test_phase35_dashboard_alignmode.py` — dashboard regression for D-01-A2
- [ ] `test/live-e2e/test_phase35_fps_benchmark.py` — D-04 FPS measurement (Wave-1 if dither lands later)
- [ ] `test/phase-35-bootalignmode-shape.test.mjs` — D-01-A1 unit test
- [ ] `test/phase-35-output-live-sync.test.mjs` — D-02-B1/B2 unit tests
- [ ] `test/phase-35-bayer-dither.test.mjs` — D-03-C1 unit test
- [ ] CI integration: pytest invocation after node --test, before verify-work
- [ ] Flake retry+skip wrapper for live-e2e rail per A5

### Regression Tests That Must Stay Green (D-06)

- `test/connection-stability/*.test.mjs` (10 files, 72/0/13 ratio per CONTEXT.md)
- `test/ssr-receiver-disconnect-detection.test.mjs`
- `test/phase-32-hotfix-regression.test.mjs`
- `test/phase-32-xvfb-fakescreenfps.test.mjs`
- `test/phase-34-*.test.mjs` (24 GREEN per Phase 34 closure addendum)

---

## Security Domain

Per CONTEXT.md, no `security_enforcement: false` flag — security analysis required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | No | n/a — internal LAN, no auth |
| V3 Session | No | n/a |
| V4 Access Control | Yes — `/api/live/ws?role=final-output` is open to LAN | Existing role-based `validateAlignCornerDragPayload` server-side; Track B does not introduce new endpoints |
| V5 Input Validation | Yes — Bayer dither inputs (hex, alpha, w, h) | `getDitheredSolidColorImageData` should validate hex format, clamp alpha [0,1], reject negative w/h |
| V6 Cryptography | No | n/a |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed live-mutation envelope crashes thin live-sync | DoS | `try/catch` around JSON.parse + dispatch — already pattern-matched in `output-audio-binder.js` |
| Cache exhaustion in dither cache (attacker-controlled animation rapidly cycles colors) | DoS | FIFO eviction at 256 entries — bounded memory |
| `align-corner-drag` payload forged via direct WS connection | Tampering | Server-side `validateAlignCornerDragPayload` — already exists in `server.mjs` (Phase 31 Plan 04) |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All server + JS test code | Yes | v24.13.1 | — |
| System Chromium | D-05 Playwright client + SSR-tab | Yes (per CONTEXT.md `/opt/google/chrome/chrome`) | snap 147.0.7727.116 | — |
| Xvfb | D-05 headful Chrome under headless CI | Yes (Phase 33/34 carry-forward) | system | — |
| Playwright (Python) | NEW — D-05 test rail | Unknown — must verify CI image has it | — | Install in CI step (not blocking) |
| pytest | NEW — D-05 test runner | Unknown — must verify CI image | — | Install in CI step |
| `/opt/google/chrome/chrome` | D-05 H264 capability | Yes per CONTEXT.md | — | If absent: install or fall back to bundled puppeteer (NOT H264 — would break (a)/(b)) |
| `/dev/dri/renderD128` | (only relevant if VAAPI opt-in tested — out of Phase 35 scope) | Unknown | — | n/a |
| `scripts/with_server.py` | D-05 test helper | **NO — DOES NOT EXIST** | — | Must implement in Wave-0 T0 |

**Missing dependencies with no fallback:**
- `scripts/with_server.py` — must be implemented in Wave-0 (BLOCKING per D-05). [VERIFIED: `find` returns no results]

**Missing dependencies with fallback:**
- Playwright (Python) + pytest — install in CI bootstrap step (`pip install playwright pytest && playwright install chromium`). NOT blocking for plan; just need to be present before D-05 runs.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Bayer 4×4 with cached putImageData hits ≤ 5 FPS budget on Lenovo Mini at 1080p@30fps target | Track C — FPS estimate | If exceeds, escalate to C2 SwiftShader (per D-04). Wave-1 benchmark task is the safeguard. |
| A2 | SwiftShader (`--use-gl=angle --use-angle=swiftshader`) does NOT have the Mesa-llvmpipe synchronous-flush behavior on this hardware | Track C2 verification | If wrong, C2 also hangs → only C1 dither remains. D-06 connection-stability is the safeguard. |
| A3 | The 4 align-mode IIFE modules can be loaded into output.html via plain `<script defer>` tags without breaking init-order assumptions inside their parse-time `const dragModule = window.TT_BEAMER_*` lookups | Track A — script tag set | If wrong, must convert parse-time lookups to lazy `init()`-time lookups (larger diff). |
| A4 | The polygon-editor ctx fields used during `OUTPUT_ROLE_FINAL && alignMode === true` is a small subset of the 60 total — the dashboard-only ones (Quick Mode, room editor, etc.) can safely be no-op stubs | Track A — A.1 inventory | If wrong, runtime TypeErrors in alignMode. D-05 (e+f) catches at runtime. |
| A5 | `output-live-sync.js` can be ≤200 LOC | Track B — A6 | If exceeds, planner re-scopes. ~186 LOC estimated; ample margin. |
| A6 | The `with_server` Python helper can be implemented as a subprocess wrapper without re-implementing `_harness.mjs:bootServer`'s isolated-config + PID-scoped-teardown logic | D-05 | If wrong, must port the harness OR cross-spawn via `node bin/with-server.mjs` (heavier). |
| A7 | The blue-noise vs Bayer 4×4 trade-off favors Bayer for 30fps animated overlays | Track C — algorithm choice | If wrong, switch algorithm in same file. Algorithm choice is encapsulated in `getDitheredSolidColorImageData`. |
| A8 | `health ping failed` log line is captured to server stderr (not stdout) | D-05 d assertion | If wrong, capture both streams. Trivial fix in `with_server.py`. |
| A9 | Track B's `output-live-sync.js` does NOT need to send anything on the WS — it's read-only subscription | Track B API | Verified via inspection: receiver-input-forwarder uses a SEPARATE WS at `role=final-output-input` for send. The thin live-sync only receives. |
| A10 | The polygon-editor's `renderRoomOverlay` only requires read-side ctx fields when `outputRole === FINAL && alignMode === true` (no dashboard-side mutations) | Track A | Verified by code path inspection: `renderRoomOverlay` early-returns for non-alignMode FINAL; in alignMode it reads ctx.getBoard, ctx.getRoomPoints etc. but does not call dashboard mutations like syncRoomPanelFromSelection on its render path. |

**Confirmation needed before locking decisions:** A1, A2, A3, A6, A8 are LOW-MEDIUM confidence and warrant explicit verification in Wave-0 / Wave-1. A4, A7, A9, A10 are HIGH confidence based on code inspection.

---

## Open Questions (RESOLVED)

1. **Should dashboard's `runtime-orchestration.js` continue exposing the same destructured exports (`applyProjectionTransform`, `showProjectionHandles`, etc.)?**
   - What we know: 50+ downstream call sites in `runtime-orchestration.js` use these names.
   - What's unclear: Whether `bootAlignMode` should expose them via its return value, or whether the modules' window-level namespaces stay as the source.
   - **RESOLVED:** Keep `window.TT_BEAMER_RUNTIME_*` namespaces as the source. `bootAlignMode` does NOT change them. Dashboard's destructure stays as-is. Pure-extract is achievable with this constraint.

2. **Does Track B `output-live-sync.js` need version-tracking for stale snapshots?**
   - What we know: full live-sync core has `shouldApplySnapshotVersion` to drop stale versions.
   - What's unclear: For thin /output/, does staleness matter?
   - **RESOLVED:** NO. Animation triggers are idempotent (start/stop by id). Profile changes are last-write-wins. AlignMode is a boolean. Stale events are at worst delayed; no corruption risk.

3. **What's the right alpha-quantization step for the dither cache key?**
   - What we know: 1% steps produce 100 cache entries per (color, size); 10% steps produce 10.
   - What's unclear: Visual delta between 1% and 10% alpha quantization.
   - **RESOLVED:** Start with 5% (~20 entries per tuple); reduce if cache pressure observed.

4. **Should D-05 also assert the SSR tab is healthy (not just /output/)?**
   - What we know: D-05 spec lists 6 assertions on /output/. The SSR tab is implicit (must be alive for /output/'s stream to play).
   - What's unclear: Whether to add explicit SSR-tab health assertions.
   - **RESOLVED:** NO — D-05 a/b/d implicitly cover SSR-tab health. If video plays + currentTime advances + no health-ping-fail, SSR tab IS healthy. Explicit SSR-tab assertions are over-engineering.

5. **Track A: should `runtime-projection-mapping.js` keep its current shim role, or be flattened into `bootAlignMode`?**
   - What we know: mapping is currently a 431-LOC shim that destructures from grid-state and forwards to handle-ui.
   - What's unclear: Whether flattening is in scope.
   - **RESOLVED:** Do NOT flatten. The shim's destructure pattern is byte-identical-preserved; flattening risks subtle regressions. Leave mapping as a shim, just have `bootAlignMode` be the orchestrator above it.

---

## Sources

### Primary (HIGH confidence — direct code inspection)
- `src/app/runtime/viewport/runtime-projection-handle-ui.js` (1756 LOC) — full inventory of injected refs + globals
- `src/app/runtime/viewport/runtime-projection-handle-drag.js` (941 LOC) — same
- `src/app/runtime/viewport/runtime-projection-mapping.js` (431 LOC) — shim destructure pattern
- `src/app/runtime/polygon-editor/runtime-polygon-editor.js` (575 LOC) — 60-field ctx surface
- `src/app/runtime/output-receiver/output-audio-binder.js` (160 LOC) — proven thin WS pattern
- `src/app/runtime/output-receiver/receiver-bootstrap.js:940-1058` — current Wave-4 4-corner approximation
- `src/app/runtime/render/runtime-effect-visuals.js:238-285` — solid-color banding source
- `src/app/runtime/live-sync/runtime-live-sync-core.js` (1271 LOC) — full live-sync core boundaries
- `src/server/ssr-render-host.mjs:600-632` — Phase 34 h2 GL flag gate
- `output.html` — current thin script set
- `scripts/manual/playwright-output-stream-verify.py` — Phase 33 reference smoketest
- `test/connection-stability/_harness.mjs` — server-spawn harness pattern
- `.planning/phases/phase-34/34-CLOSURE-ADDENDUM.md` — Phase 34 reality check + 3 tracks definition
- `.planning/phases/phase-34/34-RESEARCH.md` — hardware findings, 3 pitfalls
- `.planning/phases/phase-33/33-CLOSURE.md` — VAAPI default-disabled root cause

### Secondary (MEDIUM confidence — cited external sources)
- en.wikipedia.org/wiki/Ordered_dithering — Bayer matrix algorithm (canonical 1973)
- chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md — SwiftShader docs (correct flag form `--use-gl=angle --use-angle=swiftshader`)
- chromium-dev mailing list, "WebGL is not working using headless shell" — SwiftShader headless support
- shadertoy.com/view/wl3XWs — Blue noise vs Bayer empirical comparison
- blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web — moving-pattern caveat for blue-noise

### Tertiary (LOW confidence — flagged for validation)
- FPS impact estimate of Bayer dither on Lenovo Mini — 0.5-2ms per putImageData call; UNVERIFIED on this hardware. Wave-1 measurement is the safeguard.

---

## Metadata

**Confidence breakdown:**
- Track A `bootAlignMode` API surface: HIGH — every injected ref enumerated by direct grep
- Track A risk inventory: HIGH — pitfalls 5, 6 are specific code-line citations
- Track B `output-live-sync.js` shape: HIGH — modeled on existing proven `output-audio-binder.js`
- Track B LOC estimate: HIGH — concrete line-by-line breakdown sums to ~186
- Track C dither algorithm choice: MEDIUM — based on community consensus, no benchmark on actual hardware
- Track C FPS impact: LOW — explicit measurement task in Wave-1
- Track C2 SwiftShader behavior: MEDIUM — architectural reasoning sound, but hardware-specific
- D-05 design: MEDIUM — script structure clear, but `with_server.py` does not exist (must implement)
- Pitfalls 1-10: HIGH — directly cited from Phase 34 closure or verified in code

**Research date:** 2026-05-10
**Valid until:** Stable for 30 days; Track C FPS estimate must be re-validated when actual hardware measurements land in Wave-1.

## RESEARCH COMPLETE
