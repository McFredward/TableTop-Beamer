---
phase: 35
plan: A
type: execute
wave: 2
depends_on:
  - 35-W0-PLAN
  - 35-B-PLAN
files_modified:
  - src/app/runtime/output-receiver/output-align-mode.js
  - src/app/runtime/runtime-orchestration.js
  - src/app/runtime/output-receiver/receiver-bootstrap.js
  - output.html
autonomous: true
requirements:
  - D-01
  - D-02
  - D-06
must_haves:
  truths:
    - "bootAlignMode is exported from src/app/runtime/output-receiver/output-align-mode.js with the EXACT named-arg shape from RESEARCH §A.2"
    - "Output.html loads the 4 align-mode IIFE modules + 4 sibling modules + 2 polygon-editor modules with `defer` attributes in the correct order, then calls bootAlignMode() with thin args"
    - "test/phase-35-bootalignmode-shape.test.mjs goes RED → GREEN — node --test exits 0"
    - "test/live-e2e/test_phase35_alignmode_smoke.py::test_handles_visible (D-05 e) goes RED → GREEN — handles render in /output/ when alignMode=true"
    - "test/live-e2e/test_phase35_alignmode_smoke.py::test_drag_triggers_mutation (D-05 f) goes RED → GREEN — pointer-drag emits [input-forwarder] sent phase=start log"
    - "Dashboard regression: test/live-e2e/test_phase35_dashboard_alignmode.py STAYS GREEN (additive refactor — runtime-orchestration.js calls bootAlignMode instead of inline init chain; existing IIFE namespaces unchanged)"
    - "receiver-bootstrap.js Wave-4 4-corner approximation block (lines 998-1019) REMOVED — bootAlignMode provides real handle hit-testing via attachInputForwarder({hitTestVertex})"
    - "test/connection-stability/** stays 72/0/13 (D-06 — receiver-bootstrap.js IS in 5-critical-files; runtime-env.js NOT touched but verify anyway)"
  artifacts:
    - path: "src/app/runtime/output-receiver/output-align-mode.js"
      provides: "NEW orchestrator module. Exports bootAlignMode({stage, roomOverlay, videoEl, state, outputRole, OUTPUT_ROLE_FINAL, OUTPUT_ROLE_CONTROL, liveSync, polygonContract, normalizers, boardAccess, polygonState, interactions, persistence, sync, dashboard, renderRoomOverlay, showToast, getRenderMode, getBoardId, logger, feedbackEl}). Returns { stop }."
      min_lines: 150
      contains: "bootAlignMode"
    - path: "src/app/runtime/runtime-orchestration.js"
      provides: "Refactored: replaces the inline RUNTIME_PROJECTION_MAPPING.init({...}) call (line 389) AND polygon-editor init (line 1857) with a single bootAlignMode(buildAlignModeArgs()) call. New helper buildAlignModeArgs() bundles existing local closures (getBoard, getRoomPoints, pushUndoState, mapClientPointToNormalized, etc.) into named-arg shape per RESEARCH §A.2."
    - path: "src/app/runtime/output-receiver/receiver-bootstrap.js"
      provides: "Wave-4 4-corner approximation block (lines 998-1019) REMOVED. Receiver-input-forwarder now receives a real hitTestVertex from bootAlignMode (passed via window.__ttbAlignMode getter)."
    - path: "output.html"
      provides: "Adds 11 IIFE script tags (with defer): polygon-contract, runtime-polygon-normalizers, runtime-projection-grid-state, gl-renderer, 2d-fallback-renderer, profile-persistence, handle-drag, handle-ui, mapping, polygon-editor-handles, polygon-editor. Plus a final type='module' script importing bootAlignMode and calling it with thin args."
  key_links:
    - from: "src/app/runtime/output-receiver/output-align-mode.js"
      to: "window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING"
      via: "RUNTIME_PROJECTION_MAPPING.init({stage, outputRole, OUTPUT_ROLE_*, renderRoomOverlay, getBoardId, getRenderMode, showToast, saveProjectionMapping})"
      pattern: "TT_BEAMER_RUNTIME_PROJECTION_MAPPING|window\\.TT_BEAMER_RUNTIME_PROJECTION_MAPPING"
    - from: "src/app/runtime/output-receiver/output-align-mode.js"
      to: "window.TT_BEAMER_RUNTIME_POLYGON_EDITOR"
      via: "POLYGON_EDITOR.init({state, roomOverlay, triggerFeedback, ...60 ctx fields})"
      pattern: "TT_BEAMER_RUNTIME_POLYGON_EDITOR"
    - from: "src/app/runtime/output-receiver/output-align-mode.js"
      to: "liveSync (from Track B)"
      via: "liveSync.onAlignModeChange + onProjectionProfileChange subscription"
      pattern: "onAlignModeChange|onProjectionProfileChange"
    - from: "src/app/runtime/runtime-orchestration.js"
      to: "src/app/runtime/output-receiver/output-align-mode.js"
      via: "import { bootAlignMode } + buildAlignModeArgs() + bootAlignMode(args)"
      pattern: "bootAlignMode"
    - from: "output.html"
      to: "src/app/runtime/output-receiver/output-align-mode.js"
      via: "<script type='module'> import + bootAlignMode({thin args})"
      pattern: "bootAlignMode"
    - from: "output.html"
      to: "11 IIFE scripts with defer"
      via: "<script src='...' defer></script>"
      pattern: "defer"
---

<objective>
Track A per D-01 (LOCKED): pure-extract refactor of the polygon-editor + projection-handle-ui + projection-handle-drag + projection-mapping modules into an explicit `bootAlignMode({...})` API. All currently-injected refs become explicit named arguments.

Constraints (per D-01):
- Dashboard's existing wiring must continue to work — refactor is ADDITIVE, not breaking.
- bootAlignMode is the SINGLE source of truth — no duplicated logic between dashboard and output.html.
- Pure-extract over hybrid (`thin-mode` flag) — flag would still load all dashboard modules in output.html.

Approach (per RESEARCH §A.2):
- The 4 IIFE modules' internal `init()` signatures stay UNCHANGED (no breaking diff).
- bootAlignMode is a NEW orchestrator that calls those existing inits in the right order with explicit args.
- Dashboard's runtime-orchestration.js no longer manages init order — it calls bootAlignMode.
- output.html calls bootAlignMode with thin args — same modules load, same code runs, just driven by a thin caller.

Track A depends on Track B (this plan's wave 2): bootAlignMode subscribes to liveSync.onAlignModeChange + onProjectionProfileChange. liveSync is the bootOutputLiveSync return value from Track B.

Output: 1 new orchestrator module + refactored runtime-orchestration.js + receiver-bootstrap.js (Wave-4 4-corner block removed) + output.html (11 IIFE script tags + bootAlignMode call). RED→GREEN transitions: D-01-A1 unit test, D-05 e, D-05 f.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-35/35-CONTEXT.md
@.planning/phases/phase-35/35-RESEARCH.md
@.planning/phases/phase-35/35-W0-SUMMARY.md
@.planning/phases/phase-35/35-B-SUMMARY.md

# The 4 align-mode modules being orchestrated by bootAlignMode (read for init signatures + parse-time global lookups)
@src/app/runtime/viewport/runtime-projection-handle-ui.js
@src/app/runtime/viewport/runtime-projection-handle-drag.js
@src/app/runtime/viewport/runtime-projection-mapping.js
@src/app/runtime/polygon-editor/runtime-polygon-editor.js

# 4 sibling modules they depend on (must be present in output.html)
@src/app/runtime/viewport/runtime-projection-grid-state.js
@src/app/runtime/viewport/runtime-projection-gl-renderer.js
@src/app/runtime/viewport/runtime-projection-2d-fallback-renderer.js
@src/app/runtime/viewport/runtime-projection-profile-persistence.js

# Files being modified
@src/app/runtime/runtime-orchestration.js
@src/app/runtime/output-receiver/receiver-bootstrap.js
@output.html

# Pattern source — output-audio-binder is the reference thin-orchestrator pattern
@src/app/runtime/output-receiver/output-audio-binder.js

# RED test that must transition to GREEN
@test/phase-35-bootalignmode-shape.test.mjs
@test/live-e2e/test_phase35_alignmode_smoke.py

# D-06 hard gate
@test/connection-stability/

# Dashboard regression rail
@test/live-e2e/test_phase35_dashboard_alignmode.py
</context>

<interfaces>
<!-- Full bootAlignMode API surface — paste verbatim from RESEARCH §A.2 -->

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
 * @property {Object} liveSync           - subscriber returned by bootOutputLiveSync (Track B)
 * @property {Object} polygonContract    - polygon contract module (or null)
 * @property {Object} normalizers        - { normalizePolygonPoint, getNormalizedPolygonArea, isRenderableNormalizedPolygon, normalizeShipPolygon }
 * @property {Object} boardAccess        - { getBoard, getBoards, getRoomPoints, getRoomLabelPosition, getSpecialRooms, getShipPolygonPoints, setShipPolygonPoints, getRoomPolygonPoints, setRoomPolygonPoints, getPlayAreas, getSelectedPlayArea, getSelectedPlayAreaId, getBoardZoom }
 * @property {Object} polygonState       - { getActivePolygonRoomId, setActivePolygonRoomId, isRoomFrozen, getCurrentPolygonHandleScale, getPolygonEditorHandleMetrics }
 * @property {Object} interactions       - { beginPolygonDragInteraction, endPolygonDragInteraction, isPanArbitrating, isAcceptablePolygonPointerEvent, arePlayAreaVerticesEditable, areRoomVerticesEditable, mapClientPointToNormalized }
 * @property {Object} persistence        - { persistBoardProfiles, pushUndoState, saveProjectionMapping }
 * @property {Object} sync               - { syncShipPolygonEditorStatus, syncShipPolygonVertexSelect, syncPolygonVertexSelect, syncPolygonEdgeSelect, syncPolygonEditorStatus, syncPolygonEditorPanel, syncRoomPanelFromSelection, syncSelectedRoomStateForBoard, refreshPersistentRoomSelectionVisualState }
 * @property {Object} dashboard          - { isQuickModeActive, handleQuickModeRoomTap, applyRoomDraftTargetFromRoomClick, cacheShipPolygonDragDomRefs, cacheRoomPolygonDragDomRefs }
 * @property {Function} renderRoomOverlay - cross-module callback
 * @property {Function} [showToast]      - optional UI toast
 * @property {Function} [getRenderMode]  - returns "auto"/"2d"/"gl"; default returns "auto"
 * @property {Function} [getBoardId]     - returns active board id; defaults to state.boardId
 * @property {Console} [logger]          - default: console
 * @property {HTMLElement} [feedbackEl]  - triggerFeedback element (no-op div on /output/)
 *
 * @param {BootAlignModeArgs} args
 * @returns {{ stop: () => void }}
 */
export function bootAlignMode(args) {
  // 1. Resolve module references from window.TT_BEAMER_RUNTIME_PROJECTION_*.
  // 2. Call gridState.init() if needed.
  // 3. Call mapping.init({stage, outputRole, OUTPUT_ROLE_*, renderRoomOverlay, getBoardId, getRenderMode, showToast, saveProjectionMapping}).
  //    — Mapping internally forwards to handleUi.init({...}) which forwards to handleDrag.init({...}).
  // 4. Call polygonEditor.init({state, roomOverlay, triggerFeedback: feedbackEl, ...flat ctx with all 60 fields}).
  // 5. Subscribe to liveSync.onAlignModeChange((enabled) => handleUi.onAlignModeChange(enabled)).
  // 6. Subscribe to liveSync.onProjectionProfileChange(...) — relays to profile-persistence.
  // 7. Wire window resize listener → handleUi.onWindowResize.
  // 8. Return { stop } — calls handleUi.hideHandles, removes window listeners, calls liveSync.unsubscribe.
}
```

The 60-field polygon-editor ctx (per RESEARCH §A.1) — fields that must be provided OR stubbed:

**From boardAccess:** getBoard, getBoards, getRoomPoints, getRoomLabelPosition, getSpecialRooms, getShipPolygonPoints, setShipPolygonPoints, getRoomPolygonPoints, setRoomPolygonPoints, getPlayAreas, getSelectedPlayArea, getSelectedPlayAreaId, getBoardZoom

**From polygonState:** getActivePolygonRoomId, setActivePolygonRoomId, isRoomFrozen, getCurrentPolygonHandleScale, getPolygonEditorHandleMetrics

**From normalizers:** normalizePolygonPoint, getNormalizedPolygonArea, isRenderableNormalizedPolygon, normalizeShipPolygon, remapGridPoint, hasGridDisplacements

**From interactions:** beginPolygonDragInteraction, endPolygonDragInteraction, isPanArbitrating, isAcceptablePolygonPointerEvent, arePlayAreaVerticesEditable, areRoomVerticesEditable, mapClientPointToNormalized, setPlayAreaPolygon

**From persistence:** persistBoardProfiles, pushUndoState, saveProjectionMapping

**From sync (no-ops on /output/, real on dashboard):** syncShipPolygonEditorStatus, syncShipPolygonVertexSelect, syncPolygonVertexSelect, syncPolygonEdgeSelect, syncPolygonEditorStatus, syncPolygonEditorPanel, syncRoomPanelFromSelection, syncSelectedRoomStateForBoard, refreshPersistentRoomSelectionVisualState

**From dashboard (no-ops on /output/, real on dashboard):** isQuickModeActive, handleQuickModeRoomTap, applyRoomDraftTargetFromRoomClick, cacheShipPolygonDragDomRefs, cacheRoomPolygonDragDomRefs, triggerFeedback

Required output.html script-tag set after Track A (per RESEARCH §A.4) — ALL must have `defer` attribute (Pitfall 5):
```html
<!-- Existing -->
<script src="/src/app/lib/shared/runtime-env.js" defer></script>
<!-- inline diagnostic chip rAF -->

<!-- Track B: thin live-sync subscription (already loaded as type=module from Track B) -->
<script type="module">
  import { bootOutputLiveSync } from "/src/app/runtime/output-receiver/output-live-sync.js";
  window.__ttbLiveSync = bootOutputLiveSync({...});
</script>

<!-- IIFE modules required by bootAlignMode — order: dependencies first, then handle-drag (so handle-ui's parse-time lookup succeeds), then handle-ui, then mapping, then polygon-editor-handles, then polygon-editor -->
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

<!-- Boot align-mode after IIFEs registered (defer guarantees document order) -->
<script type="module">
  import { bootAlignMode } from "/src/app/runtime/output-receiver/output-align-mode.js";
  // Wait for IIFEs to register on window — defer scripts run before DOMContentLoaded fires
  window.addEventListener("DOMContentLoaded", () => {
    window.__ttbAlignMode = bootAlignMode({ /* thin args */ });
  });
</script>
```

The Wave-4 4-corner block in receiver-bootstrap.js (lines ~998-1019) to be REMOVED:
```javascript
// 4-corner Wave-4 fallback hit-test (REMOVE after Track A lands)
function hitTestVertex(clientX, clientY) {
  // approximation: check distance to each of 4 corners of overlay bounding box
  // ...
}
```

After removal, receiver-bootstrap accepts a real hitTestVertex from bootAlignMode via:
```javascript
const realHitTest = window.__ttbAlignMode?.hitTestVertex; // exposed by bootAlignMode return value
```

OR bootAlignMode is wired DIRECTLY into bootReceiver via the liveSync arg. Executor judgment.
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create src/app/runtime/output-receiver/output-align-mode.js — bootAlignMode orchestrator</name>
  <read_first>
    - .planning/phases/phase-35/35-RESEARCH.md §A.2 (full bootAlignMode signature + body sketch)
    - .planning/phases/phase-35/35-RESEARCH.md §A.1 (every implicit ref/global enumerated — the SOURCE OF TRUTH for which fields go in which arg group)
    - test/phase-35-bootalignmode-shape.test.mjs (the contract — bootAlignMode is a function)
    - src/app/runtime/viewport/runtime-projection-mapping.js (init signature — `init({stage, outputRole, OUTPUT_ROLE_FINAL, OUTPUT_ROLE_CONTROL, renderRoomOverlay, getBoardId, getRenderMode, showToast, saveProjectionMapping})`)
    - src/app/runtime/viewport/runtime-projection-handle-ui.js (line 55 parse-time `dragModule = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_DRAG` — Pitfall 5)
    - src/app/runtime/polygon-editor/runtime-polygon-editor.js (60-field ctx init signature)
    - src/app/runtime/output-receiver/output-audio-binder.js (pattern reference for thin-orchestrator structure)
  </read_first>
  <behavior>
    - Test: bootAlignMode is exported as a function.
    - Test: calling bootAlignMode with mock args returns an object with `.stop` function.
    - Test: bootAlignMode subscribes to liveSync.onAlignModeChange and liveSync.onProjectionProfileChange (verifiable by passing a mock liveSync and asserting handlers registered).
    - Test: bootAlignMode looks up window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING and calls .init({...}) on it.
    - Test: bootAlignMode looks up window.TT_BEAMER_RUNTIME_POLYGON_EDITOR and calls .init({...}) on it.
    - Test: stop() unsubscribes from liveSync, removes window listeners.
  </behavior>
  <files>src/app/runtime/output-receiver/output-align-mode.js</files>
  <action>
Create `src/app/runtime/output-receiver/output-align-mode.js` per D-01.

The body MUST follow RESEARCH §A.2 step-by-step:

1. **Imports + constants** — module-level docstring referencing D-01.

2. **Resolve module references** at function-entry (NOT at parse time — RESEARCH §A.5 risk mitigation):
```javascript
const MAPPING = window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING;
const POLYGON_EDITOR = window.TT_BEAMER_RUNTIME_POLYGON_EDITOR;
const HANDLE_UI = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
const GRID_STATE = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
const PROFILE_PERSISTENCE = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE;
if (!MAPPING || !POLYGON_EDITOR || !HANDLE_UI || !GRID_STATE) {
  throw new Error("[output-align-mode] required IIFE modules not loaded — check script-tag order");
}
```

3. **Build mapping init args** (forwarded to handle-ui via mapping's shim):
```javascript
const mappingInitArgs = {
  stage: args.stage,
  outputRole: args.outputRole,
  OUTPUT_ROLE_FINAL: args.OUTPUT_ROLE_FINAL,
  OUTPUT_ROLE_CONTROL: args.OUTPUT_ROLE_CONTROL,
  renderRoomOverlay: args.renderRoomOverlay,
  getBoardId: args.getBoardId ?? (() => args.state?.boardId ?? null),
  getRenderMode: args.getRenderMode ?? (() => "auto"),
  showToast: args.showToast ?? (() => {}),
  saveProjectionMapping: args.persistence?.saveProjectionMapping ?? (() => {}),
};
MAPPING.init(mappingInitArgs);
```

4. **Build polygon-editor init args** (the 60-field ctx) — gather from args.boardAccess, args.polygonState, args.normalizers, args.interactions, args.persistence, args.sync, args.dashboard:
```javascript
const polygonCtx = {
  state: args.state,
  roomOverlay: args.roomOverlay,
  triggerFeedback: args.feedbackEl ?? document.createElement("div"),
  ...args.boardAccess,
  ...args.polygonState,
  ...args.normalizers,
  ...args.interactions,
  ...args.persistence,
  ...args.sync,
  ...args.dashboard,
};
POLYGON_EDITOR.init(polygonCtx);
```

5. **Wire liveSync subscriptions:**
```javascript
const offAlignMode = args.liveSync.onAlignModeChange((enabled) => {
  if (typeof HANDLE_UI.onAlignModeChange === "function") {
    HANDLE_UI.onAlignModeChange(enabled);
  } else if (typeof HANDLE_UI.showHandles === "function" && typeof HANDLE_UI.hideHandles === "function") {
    enabled ? HANDLE_UI.showHandles() : HANDLE_UI.hideHandles();
  }
  // Toggle body class for CSS gating (per src/styles.css:119)
  document.body.classList.toggle("align-mode-active", enabled);
});
const offProfile = args.liveSync.onProjectionProfileChange((profileId) => {
  if (PROFILE_PERSISTENCE && typeof PROFILE_PERSISTENCE.applyProjectionProfile === "function") {
    PROFILE_PERSISTENCE.applyProjectionProfile(profileId);
  }
});
```

6. **Window resize listener** — relay to handle-ui:
```javascript
function onResize() {
  if (typeof HANDLE_UI.onWindowResize === "function") HANDLE_UI.onWindowResize();
}
window.addEventListener("resize", onResize);
```

7. **Expose hitTestVertex on the return value** — receiver-bootstrap consumes this:
```javascript
function hitTestVertex(clientX, clientY) {
  if (typeof HANDLE_UI.hitTestVertex === "function") return HANDLE_UI.hitTestVertex(clientX, clientY);
  return null;
}
```

8. **Return shape:**
```javascript
return {
  stop() {
    offAlignMode(); offProfile();
    window.removeEventListener("resize", onResize);
    if (typeof HANDLE_UI.hideHandles === "function") HANDLE_UI.hideHandles();
  },
  hitTestVertex,
};
```

Stub fallbacks for fields that may not exist on /output/ thin path (per RESEARCH §A.1 "stub blast radius" Pitfall 6):
- For each ctx field that's expected only on dashboard, default to a no-op `() => {}` if not provided in args.
- Specifically per Pitfall 6: stub `cacheRoomPolygonDragDomRefs: () => null`, `cacheShipPolygonDragDomRefs: () => null`. These are auditable as "never called when outputRole === FINAL && alignMode === true && no drag UI gesture initiated" (verified by RESEARCH §A.1).

Total target: ~150-250 LOC. Add a sub-helper `buildPolygonCtx(args)` if the literal becomes unwieldy. Comments throughout pointing to RESEARCH sections for the design rationale.

After creating, run `node --test test/phase-35-bootalignmode-shape.test.mjs` — must transition RED → GREEN.
  </action>
  <verify>
    <automated>node --test test/phase-35-bootalignmode-shape.test.mjs</automated>
  </verify>
  <acceptance_criteria>
    - File exists at src/app/runtime/output-receiver/output-align-mode.js
    - File contains `export function bootAlignMode` (grep)
    - File contains all 5 window.TT_BEAMER_* lookups: MAPPING, POLYGON_EDITOR, HANDLE_UI, GRID_STATE, PROFILE_PERSISTENCE (grep each)
    - File contains `MAPPING.init(` and `POLYGON_EDITOR.init(` calls (grep)
    - File contains `liveSync.onAlignModeChange` and `liveSync.onProjectionProfileChange` (grep)
    - File contains `document.body.classList.toggle("align-mode-active"` (CSS gating per src/styles.css:119)
    - Returned object has `.stop` (verified by test)
    - File exposes `hitTestVertex` for receiver-bootstrap consumption (grep)
    - `node --test test/phase-35-bootalignmode-shape.test.mjs` exits 0 (RED → GREEN)
  </acceptance_criteria>
  <done>output-align-mode.js shipped; D-01-A1 unit test GREEN; orchestrator ready for output.html consumption.</done>
</task>

<task type="auto">
  <name>Task 2: Refactor runtime-orchestration.js — replace inline init chain with bootAlignMode call</name>
  <read_first>
    - src/app/runtime/runtime-orchestration.js lines 50-122 + 389-414 + 1857-1943 (the current init wiring being replaced)
    - src/app/runtime/output-receiver/output-align-mode.js (just created — bootAlignMode signature)
    - .planning/phases/phase-35/35-RESEARCH.md §A.2 "Dashboard rewiring strategy (additive)"
    - .planning/phases/phase-35/35-CONTEXT.md A4 (dashboard regression must NOT break — pure-extract additive)
    - test/live-e2e/test_phase35_dashboard_alignmode.py (the regression test that must STAY GREEN)
  </read_first>
  <files>src/app/runtime/runtime-orchestration.js</files>
  <action>
Refactor `runtime-orchestration.js` per RESEARCH §A.2 "Dashboard rewiring strategy (additive)":

1. **Add a new helper `buildAlignModeArgs()`** in runtime-orchestration. Bundles the existing local closures (`getBoard`, `getRoomPoints`, `pushUndoState`, `mapClientPointToNormalized`, etc.) into the named-arg shape per RESEARCH §A.2. The helper has access to all the local variables of orchestration's init scope, so closures capture them.

2. **Replace `RUNTIME_PROJECTION_MAPPING.init({...})` call** (around line 389) with `bootAlignMode(buildAlignModeArgs())`. NOTE: bootAlignMode internally calls MAPPING.init, so the orchestration code no longer needs to.

3. **Replace polygon-editor init section** (around lines 1857-1918) — the `POLYGON_EDITOR.init({state, roomOverlay, triggerFeedback, ...60 ctx fields})` call. bootAlignMode now does this.

4. **Keep the existing `RUNTIME_PROJECTION_MAPPING` destructure exports** at lines 415-427 — they're consumed by other dashboard code. Same for the polygon-editor exports at line 1919-1943. Per RESEARCH §A.2 "the IIFE namespaces stay; only the wiring layer changes."

5. **Pass dashboard's liveSync** — the dashboard already creates its own runtime-live-sync-core via `connectLiveSyncSocket`. For dashboard's bootAlignMode call, we need to give it a "liveSync"-shaped object. Two approaches:
   - **Option A (recommended):** Create a tiny adapter that wraps runtime-live-sync-core's existing event hooks into the bootOutputLiveSync interface (onAlignModeChange, onProjectionProfileChange, etc.). The adapter is dashboard-only, lives in runtime-orchestration.
   - **Option B:** Have the dashboard ALSO call bootOutputLiveSync from output-live-sync.js. This means TWO live-sync connections from dashboard (one full, one thin). Acceptable if memory/CPU allows. RESEARCH §"Risks" item 7 flags this as a low risk; both paths converge on same server state.

   **Choose Option A** — single live-sync per page, less load. Adapter shape:
```javascript
function buildLiveSyncAdapter() {
  // Hook into existing dashboard runtime-live-sync-core's emit points to mimic bootOutputLiveSync's API
  return {
    onAlignModeChange: (handler) => {
      // dashboard already has a state.alignMode mutation listener — register handler there
    },
    onProjectionProfileChange: (handler) => { /* ... */ },
    // ... other 5 methods stub or wire as needed
    // bootAlignMode for dashboard mostly only uses onAlignModeChange + onProjectionProfileChange
    onAnimationStart: () => () => {}, onAnimationStop: () => () => {}, onClearAll: () => () => {},
    onConnect: () => () => {}, onDisconnect: () => () => {},
    getAlignMode: () => state.alignMode,
    getActiveProjectionProfileId: () => state.runtime?.activeProjectionProfileId ?? null,
    getCurrentClientId: () => null,
    stop: () => {},
  };
}
```

6. **Verify dashboard alignMode toggle still renders handles** — run `python -m pytest test/live-e2e/test_phase35_dashboard_alignmode.py -v`. Must STAY GREEN.

7. **D-06 hard gate** — runtime-orchestration.js is NOT in the 5-critical-files list, but receiver-bootstrap.js IS. Run `RUN_LIVE_TESTS=1 node --test test/connection-stability/` after refactor. Must stay 72/0/13.
  </action>
  <verify>
    <automated>python -m pytest test/live-e2e/test_phase35_dashboard_alignmode.py -v 2>&1 | tail -5 && RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - runtime-orchestration.js contains `import { bootAlignMode }` from output-align-mode.js (grep)
    - runtime-orchestration.js contains `bootAlignMode(buildAlignModeArgs())` or equivalent call (grep `bootAlignMode`)
    - runtime-orchestration.js no longer contains the inline `RUNTIME_PROJECTION_MAPPING.init(` call directly — bootAlignMode owns it (verify via diff)
    - runtime-orchestration.js no longer contains the inline `POLYGON_EDITOR.init(` call directly — bootAlignMode owns it (verify via diff)
    - runtime-orchestration.js still exports the legacy `applyProjectionTransform`, `showProjectionHandles`, etc. destructures at lines 415-427 (preserved)
    - **Dashboard regression GREEN**: `python -m pytest test/live-e2e/test_phase35_dashboard_alignmode.py` PASSES
    - **D-06 hard gate**: `RUN_LIVE_TESTS=1 node --test test/connection-stability/` reports 72/0/13
    - Full JS suite still passes
  </acceptance_criteria>
  <done>runtime-orchestration.js refactored additively. Dashboard align-mode unchanged from user's POV. Single source of truth via bootAlignMode established. D-06 + dashboard regression hold.</done>
</task>

<task type="auto">
  <name>Task 3: Refactor receiver-bootstrap.js + output.html — wire bootAlignMode to /output/, remove 4-corner approximation</name>
  <read_first>
    - src/app/runtime/output-receiver/receiver-bootstrap.js lines 940-1021 (Wave-4 4-corner block to remove + attachInputForwarder integration point)
    - src/app/runtime/output-receiver/receiver-input-forwarder.js (the `hitTestVertex` callback shape — what bootAlignMode must provide)
    - output.html (current script-tag list — augment with 11 IIFE script tags + bootAlignMode call)
    - .planning/phases/phase-35/35-RESEARCH.md §A.4 (full required output.html script-tag set)
    - .planning/phases/phase-35/35-RESEARCH.md §"Pitfall 5" (defer attribute REQUIRED on all IIFE scripts)
    - .planning/phases/phase-35/35-RESEARCH.md §"Pitfall 10" (snapshot-poll-vs-WS conflict — solved in Track B, just verify)
    - .planning/phases/phase-35/35-CONTEXT.md (Pi /output/ thin path — must remain functional)
  </read_first>
  <files>src/app/runtime/output-receiver/receiver-bootstrap.js, output.html</files>
  <action>
**Part A — receiver-bootstrap.js:**

1. **REMOVE the Wave-4 4-corner approximation block** (lines ~998-1019 — the inline hitTestVertex with Pythagorean distance to 4 overlay-bbox corners). This block is superseded by bootAlignMode's real handle hit-testing.

2. **Make hitTestVertex come from window.__ttbAlignMode**:
```javascript
// In bootReceiver(), before attachInputForwarder:
const hitTestVertex = (clientX, clientY) => {
  const align = window.__ttbAlignMode;
  if (align && typeof align.hitTestVertex === "function") {
    return align.hitTestVertex(clientX, clientY);
  }
  // Fallback: no align-mode loaded — return null (no-op)
  return null;
};

attachInputForwarder({
  overlayEl,
  isAlignModeActive: () => liveSync ? liveSync.getAlignMode() : false,
  getCurrentProfileId: () => liveSync ? liveSync.getActiveProjectionProfileId() : null,
  getVideoEl: () => document.getElementById("ssr-video"),
  hitTestVertex,
});
```

3. **D-06 hard gate** — receiver-bootstrap.js IS in the 5-critical-files list. After removing the block, run `RUN_LIVE_TESTS=1 node --test test/connection-stability/` and verify still 72/0/13.

**Part B — output.html:**

Per RESEARCH §A.4, add the 11 IIFE script tags WITH `defer` attribute (Pitfall 5 — `defer` guarantees document order execution which is required for the parse-time `dragModule = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_DRAG` lookup at handle-ui:55):

```html
<!-- Existing scripts kept unchanged: -->
<!-- /src/styles.css link tag — DO NOT modify path (Pitfall 3) -->
<!-- runtime-env.js with defer -->
<!-- inline diagnostic chip rAF -->

<!-- Track B (already added by 35-B-PLAN): bootOutputLiveSync -->
<script type="module">
  import { bootOutputLiveSync } from "/src/app/runtime/output-receiver/output-live-sync.js";
  window.__ttbLiveSync = bootOutputLiveSync({ logger: console, role: "final-output" });
</script>

<!-- Track A (NEW in this plan): the 11 IIFE modules required by bootAlignMode. ALL HAVE `defer`. -->
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

<!-- Boot bootAlignMode after IIFEs registered + DOM ready -->
<script type="module">
  import { bootAlignMode } from "/src/app/runtime/output-receiver/output-align-mode.js";
  window.addEventListener("DOMContentLoaded", () => {
    // Construct minimal "thin" args. Most stubs since /output/ is read-only display.
    const stage = document.getElementById("stage") ?? document.body;
    const roomOverlay = document.getElementById("room-overlay");
    const videoEl = document.getElementById("ssr-video");
    const noop = () => {};
    const noopReturnNull = () => null;
    const noopReturnFalse = () => false;
    const noopReturnTrue = () => true;
    const state = window.__ttbState ?? { alignMode: false, polygonEditor: {}, shipPolygonEditor: {}, runtime: {} };
    window.__ttbState = state;
    window.__ttbAlignMode = bootAlignMode({
      stage, roomOverlay, videoEl, state,
      outputRole: "final-output",
      OUTPUT_ROLE_FINAL: "final-output",
      OUTPUT_ROLE_CONTROL: "control",
      liveSync: window.__ttbLiveSync,
      polygonContract: window.TT_BEAMER_POLYGON_CONTRACT ?? null,
      normalizers: window.TT_BEAMER_RUNTIME_POLYGON_NORMALIZERS ?? {
        normalizePolygonPoint: (p) => p, getNormalizedPolygonArea: () => 0,
        isRenderableNormalizedPolygon: () => false, normalizeShipPolygon: (p) => p,
        remapGridPoint: (p) => p, hasGridDisplacements: noopReturnFalse,
      },
      boardAccess: {
        getBoard: noopReturnNull, getBoards: () => [],
        getRoomPoints: () => [], getRoomLabelPosition: noopReturnNull, getSpecialRooms: () => [],
        getShipPolygonPoints: () => [], setShipPolygonPoints: noop,
        getRoomPolygonPoints: () => [], setRoomPolygonPoints: noop,
        getPlayAreas: () => [], getSelectedPlayArea: noopReturnNull, getSelectedPlayAreaId: noopReturnNull,
        getBoardZoom: () => 1,
      },
      polygonState: {
        getActivePolygonRoomId: noopReturnNull, setActivePolygonRoomId: noop,
        isRoomFrozen: noopReturnFalse, getCurrentPolygonHandleScale: () => 1,
        getPolygonEditorHandleMetrics: () => ({ size: 12 }),
      },
      interactions: {
        beginPolygonDragInteraction: noop, endPolygonDragInteraction: noop,
        isPanArbitrating: noopReturnFalse, isAcceptablePolygonPointerEvent: noopReturnTrue,
        arePlayAreaVerticesEditable: noopReturnFalse, areRoomVerticesEditable: noopReturnFalse,
        mapClientPointToNormalized: (cx, cy) => ({ x: cx, y: cy }),
        setPlayAreaPolygon: noop,
      },
      persistence: { persistBoardProfiles: noop, pushUndoState: noop, saveProjectionMapping: noop },
      sync: {
        syncShipPolygonEditorStatus: noop, syncShipPolygonVertexSelect: noop,
        syncPolygonVertexSelect: noop, syncPolygonEdgeSelect: noop,
        syncPolygonEditorStatus: noop, syncPolygonEditorPanel: noop,
        syncRoomPanelFromSelection: noop, syncSelectedRoomStateForBoard: noop,
        refreshPersistentRoomSelectionVisualState: noop,
      },
      dashboard: {
        isQuickModeActive: noopReturnFalse, handleQuickModeRoomTap: noop,
        applyRoomDraftTargetFromRoomClick: noop,
        cacheShipPolygonDragDomRefs: noopReturnNull, cacheRoomPolygonDragDomRefs: noopReturnNull,
      },
      renderRoomOverlay: noop, // overridden internally by polygon-editor's own renderRoomOverlay if available
      logger: console,
    });
  });
</script>

<!-- Existing receiver-bootstrap + output-audio-binder modules -->
```

DOM requirements (Pitfall 6 + handle-ui requires these):
- `<div id="stage">` (or body fallback)
- `<svg id="room-overlay">` (CSS gates handle visibility — `body[data-output-role="final-output"].align-mode-active #room-overlay { display: block !important; }`)
- `<video id="ssr-video" class="ssr-video">` (already present in current output.html)

Verify current output.html has #stage and #room-overlay; if not, ADD them inside the existing body (place after the video element, before the diagnostic-chip).

Total new script tags: 11 IIFE + 1 module = +12 vs current. Total script tags now ≈14. Per RESEARCH §A.4 this exceeds the CONTEXT.md "≤8 scripts" advisory but the advisory was NOT locked. Document deviation in a comment in output.html.
  </action>
  <verify>
    <automated>RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - receiver-bootstrap.js: the inline 4-corner hit-test block (was lines 998-1019) is REMOVED — `grep -c "Math.hypot.*overlayBbox\|4-corner.*Wave-4" receiver-bootstrap.js` returns 0
    - receiver-bootstrap.js: hitTestVertex now reads from `window.__ttbAlignMode` (grep)
    - output.html contains 11 IIFE `<script src="..." defer></script>` tags in the order specified (grep `defer` returns >= 12 occurrences)
    - output.html contains `import { bootAlignMode }` and the bootAlignMode({...}) call (grep)
    - output.html contains `window.__ttbAlignMode` assignment (grep)
    - output.html contains `<div id="stage">` and `<svg id="room-overlay"` (or equivalent — verify presence)
    - output.html still has `/src/styles.css` (NOT `/styles.css`) — Pitfall 3
    - **D-06 hard gate**: `RUN_LIVE_TESTS=1 node --test test/connection-stability/` reports 72/0/13
    - Full JS suite still passes
  </acceptance_criteria>
  <done>output.html loads bootAlignMode; receiver-bootstrap.js delegates real hit-testing to bootAlignMode; Wave-4 approximation removed. D-06 holds.</done>
</task>

<task type="auto">
  <name>Task 4: Live-E2E gate — D-05 e + f turn GREEN, dashboard stays GREEN, D-06 stays 72/0/13</name>
  <read_first>
    - test/live-e2e/test_phase35_alignmode_smoke.py (D-05 e + f are the gates that turn GREEN)
    - test/live-e2e/test_phase35_dashboard_alignmode.py (must STAY GREEN — Track A pure-extract is additive)
  </read_first>
  <files></files>
  <action>
Verification-only task. Run all live-E2E tests + connection-stability gate after Track A landing.

Commands:
1. `python -m pytest test/live-e2e/test_phase35_alignmode_smoke.py -v` — ALL 6 D-05 a-f tests should now PASS
2. `python -m pytest test/live-e2e/test_phase35_dashboard_alignmode.py -v` — STILL GREEN
3. `python -m pytest test/live-e2e/test_phase35_fps_benchmark.py -v` — still produces baseline FPS (Track C will impact this later)
4. `RUN_LIVE_TESTS=1 node --test test/connection-stability/` — STILL 72/0/13
5. `node --test test/**/*.test.mjs` — phase-35-bootalignmode-shape now GREEN; phase-35-output-live-sync GREEN (from Track B); phase-35-bayer-dither still RED (gated on Track C)

Specific failure modes to investigate:
- **D-05 e fails (handles not visible):** likely IIFE script tag order wrong, or DOM elements (#stage, #room-overlay) missing in output.html. Check `defer` attribute on every IIFE script. Check console for `[output-align-mode] required IIFE modules not loaded` error.
- **D-05 f fails (no input-forwarder log):** check that `window.__ttbAlignMode.hitTestVertex` actually returns a non-null result for a click ON a handle. Check that handle DOM elements have correct `.projection-corner-handle` class.
- **Dashboard regression fails (handles not rendering on `/`):** the buildAlignModeArgs helper in runtime-orchestration is missing a closure. Audit which ctx field is missing — likely a sync/dashboard field that the dashboard code path actually uses.
- **D-06 fails (connection-stability count drops):** receiver-bootstrap.js refactor broke a stability invariant. Investigate the removed 4-corner block — did anything else depend on it? Roll back the receiver-bootstrap diff and try a smaller change.
- **TypeError in browser console (Pitfall 6):** a stub returned `null` and the next line dereferenced it. Read the error stack trace, identify which polygon-editor ctx field needs a less-aggressive stub, audit per RESEARCH §A.1.

Document results in commit message OR Wave-2-merge note. Capture screenshots if possible (handles visible at /output/ confirms D-05 e visually).
  </action>
  <verify>
    <automated>python -m pytest test/live-e2e/test_phase35_alignmode_smoke.py -v 2>&1 | tail -10 ; RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - All 6 D-05 a-f Playwright tests PASS
    - test_phase35_dashboard_alignmode.py PASSES (no dashboard regression)
    - test_phase35_fps_benchmark.py runs and prints a baseline number
    - D-06 hard gate: connection-stability 72/0/13
    - Full JS suite: phase-35-bootalignmode-shape GREEN (transition); phase-35-output-live-sync GREEN; phase-35-bayer-dither RED (Track C not landed yet)
    - No regression in any pre-existing test (Phase 33, 34 rails still GREEN)
  </acceptance_criteria>
  <done>Track A wave-merge verification complete. /output/ now has working align-mode UI. Dashboard align-mode unchanged. D-06 + dashboard regression gates GREEN. Phase 35 may proceed to 35-C-PLAN.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser ←→ /api/projection-mapping/save | save endpoint may be hit when operator drags handles — same-origin, no auth on localhost |
| bootAlignMode ←→ window.TT_BEAMER_* IIFE namespaces | parse-time globals; tampering by browser extension possible but out-of-threat-model |
| /output/ ←→ /api/live/mutate | live-mutation endpoint — operator can submit context-update mutations from /output/ — currently no auth (carry-forward) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-35-A-01 | Tampering | polygon-editor 60-field ctx stub miss → TypeError | mitigate | RESEARCH §A.1 audit; D-05 e/f tests catch at runtime |
| T-35-A-02 | DoS | IIFE script-tag order race breaks parse-time global lookups | mitigate | `defer` attribute on ALL IIFE scripts (Pitfall 5); browsers execute defer'd scripts in document order |
| T-35-A-03 | Information disclosure | `console.log/warn/error` exposed in handle-ui | accept | Existing dashboard pattern; localhost only |
| T-35-A-04 | DoS | bootAlignMode loaded twice (output.html + dashboard) on hybrid pages | accept | Dashboard URL never loads output.html (different script-graph); /output/ never loads dashboard scripts |
| T-35-A-05 | Repudiation | drag mutations on /output/ have no audit trail beyond server WS log | accept | Existing pattern from Phase 34; no new exposure |
</threat_model>

<verification>
1. **D-01 unit test transition:** `node --test test/phase-35-bootalignmode-shape.test.mjs` RED → GREEN.
2. **D-05 e + f live tests:** test_handles_visible + test_drag_triggers_mutation RED → GREEN.
3. **Dashboard regression:** test_phase35_dashboard_alignmode.py STAYS GREEN (additive refactor proven).
4. **D-06 hard gate:** connection-stability 72/0/13 unchanged.
5. **No JS suite regression:** all pre-existing Phase 33 + 34 tests GREEN.
6. **Visual smoke** (manual UAT capture, optional in this wave): operator on gaming-PC opens /output/, toggles alignMode via dashboard, sees handles render at corners + drags one — handles snap to mouse, server logs `align-corner-drag` mutation.
</verification>

<success_criteria>
- [ ] src/app/runtime/output-receiver/output-align-mode.js exists with bootAlignMode export
- [ ] runtime-orchestration.js refactored to call bootAlignMode (additive)
- [ ] receiver-bootstrap.js Wave-4 4-corner block REMOVED; hitTestVertex sourced from window.__ttbAlignMode
- [ ] output.html has 11 new IIFE `<script defer>` tags + bootAlignMode call
- [ ] D-01-A1 unit test GREEN (RED→GREEN transition)
- [ ] D-05 e (handles visible) + D-05 f (drag triggers mutation) GREEN
- [ ] Dashboard regression GREEN (test_phase35_dashboard_alignmode.py)
- [ ] D-06 hard gate GREEN (connection-stability 72/0/13)
- [ ] No production code touched outside the 4 listed files_modified
</success_criteria>

<output>
After completion, create `.planning/phases/phase-35/35-A-SUMMARY.md` with:
- output-align-mode.js LOC count
- runtime-orchestration.js refactor summary (which inline blocks replaced)
- receiver-bootstrap.js Wave-4 block removal LOC count
- output.html script-tag count before/after
- D-05 a-f all-GREEN result lines
- Dashboard regression result line
- D-06 hard gate result line
- Confirmation: 35-C-PLAN may proceed (or has already started in parallel)
</output>
