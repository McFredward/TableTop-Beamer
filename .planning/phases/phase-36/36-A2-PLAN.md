---
phase: 36
plan: A2
type: execute
wave: 2
depends_on: [A1]
files_modified:
  - src/app/runtime/output-receiver/output-align-mode-loader.js
  - src/app/runtime/output-receiver/receiver-bootstrap.js
  - src/styles.css
autonomous: true
requirements_addressed: [D-01, D-02, D-09]
gap_closure: false
must_haves:
  truths:
    - "output-align-mode-loader.js imports bootHandleUi from boot-handle-ui.js (replacing the Phase 35-A bootAlignMode call)"
    - "Loader populates the FULL §1.5 RESEARCH inventory dep-bag including emitLiveMutation passed as liveSyncCoreOverride"
    - "Loader passes alignModeDirtyEndpoint = '/api/align-mode-dirty' (Q1 LOCKED — existing endpoint per D-06 reconciliation)"
    - "Loader appends #stage and #room-overlay divs to body via JS (NOT static HTML — D-09 budget unchanged)"
    - "receiver-bootstrap.js sets overlay.style.pointerEvents = 'none' both at boot AND on alignMode change (D-02 inversion)"
    - "Phase 35-A pointer-events:none !important CSS rule for projection-corner-handle / projection-grid-handle / projection-grid-line-canvas REMOVED from src/styles.css lines 198-213"
    - "output.html script-tag count remains ≤ 8 (D-09 grep gate preserved)"
    - "receiver-input-forwarder is dormant during align-mode-ON because overlay pointer-events stay 'none'"
    - "Connection-stability fail=0 preserved (D-08)"
  artifacts:
    - path: "src/app/runtime/output-receiver/output-align-mode-loader.js"
      provides: "Lazy-loader that imports bootHandleUi + populates full inventory dep-bag + appends stage/roomOverlay DOM"
      contains: "bootHandleUi"
    - path: "src/app/runtime/output-receiver/receiver-bootstrap.js"
      provides: "Overlay pointer-events permanently set to 'none' (no longer toggled by alignMode)"
      contains: "pointerEvents = \"none\""
    - path: "src/styles.css"
      provides: "Phase 35-A !important pointer-events block REMOVED"
      contains: "/* Phase 36 D-02 — overlay JS-toggled, no CSS override needed */"
  key_links:
    - from: "output-align-mode-loader.js onAlignModeChange(true)"
      to: "bootHandleUi(...)"
      via: "after loadBundleOnce + buildBoardAccess + DOM append"
      pattern: "bootHandleUi\\("
    - from: "loader's bootHandleUi call"
      to: "liveSyncCoreOverride: liveSync (so grid-state's broadcastGridSnapshot routes through emitLiveMutation)"
      via: "named arg in single-object signature"
      pattern: "liveSyncCoreOverride"
    - from: "receiver-bootstrap.js boot + alignModeChange handler"
      to: "overlayEl.style.pointerEvents = 'none'"
      via: "permanent JS toggle replacing Phase 34/35-iter2 conditional"
      pattern: "pointerEvents\\s*=\\s*[\"']none[\"']"
threat_model:
  threats:
    - id: T-DOS-1
      title: "DOS via /api/live/command flood after pointer-events flip"
      stride: DoS
      asvs: V11
      severity: low
      description: "If overlay pointer-events:none breaks the input-forwarder gate, drag events could escape into native browser scroll"
      existing_mitigation: "Handle DOM (z:9999, pointer-events:auto) captures clicks; receiver-input-forwarder is dormant; T10 verifies"
      new_mitigation: "T10 from W0 RED rail asserts no [input-forwarder] sent phase=start during align-mode drag"
---

<objective>
Wire `bootHandleUi` (from A1) into the lazy-loader (`output-align-mode-loader.js`) replacing the Phase 35-A `bootAlignMode` call. Implement D-02 (a) event-handling: invert receiver-bootstrap's overlay pointer-events logic so the overlay stays `"none"` and the handle DOM (z:9999) captures clicks naturally. Remove the Phase 35-A `!important` CSS rule that was the (c)-bubbling workaround.

Per RESEARCH §10, this wave does NOT touch `output.html` static markup — the lazy-load bundle's first action will be to APPEND `#stage` and `#room-overlay` divs to body when bootHandleUi is invoked. This preserves D-09 (≤8 src-based scripts initial).

This wave does NOT yet wire individual T1-T10 features — those flip RED→GREEN in M3 (T1, T2), M4 (T3, T4, T5), and M5 (T6, T7, T8, T9). A2 ONLY establishes the boot path + event-handling architecture.

Purpose: Bring the bootHandleUi entry-point online for `/output/`. After A2 lands, lazy-loaded handles render when align-mode toggles ON. Specific interactions may not yet be fully GREEN — that's M3-M5's job.

Output: A working `/output/` that renders handles when align-mode is on, with overlay routed through D-02(a). Phase 35-A CSS workaround is gone. D-08 + D-09 preserved.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-36/36-CONTEXT.md
@.planning/phases/phase-36/36-RESEARCH.md
@.planning/phases/phase-36/36-A1-SUMMARY.md
@src/app/runtime/output-receiver/output-align-mode-loader.js
@src/app/runtime/output-receiver/output-align-mode.js
@src/app/runtime/output-receiver/output-live-sync.js
@src/app/runtime/output-receiver/boot-handle-ui.js
@src/app/runtime/output-receiver/receiver-bootstrap.js
@src/styles.css
@output.html

<interfaces>
<!-- Verified module surfaces. -->

From src/app/runtime/output-receiver/boot-handle-ui.js (created in A1):
```js
export function bootHandleUi({
  stage, roomOverlay, videoEl, feedbackEl,
  state, outputRole, OUTPUT_ROLE_FINAL, OUTPUT_ROLE_CONTROL,
  liveSync, liveSyncCoreOverride,
  polygonContract, normalizers, boardAccess, polygonState, interactions,
  persistence, alignModeDirtyEndpoint,
  sync, dashboard,
  renderRoomOverlay, showToast, getRenderMode, getBoardId,
  logger,
}): { stop, hitTestVertex }
```

From src/app/runtime/output-receiver/output-live-sync.js (extended in A1):
```js
// Adds: emitLiveMutation(mutationType, payload) — wraps ws.send with envelope
// Loader passes the FULL liveSync object as bootHandleUi.liveSync
// AND ALSO passes { emitLiveMutation: liveSync.emitLiveMutation } as liveSyncCoreOverride
```

From src/app/runtime/output-receiver/output-align-mode-loader.js (Phase 35-iter2 h1 — 381 LOC):
```js
// CURRENT structure (preserved):
// 1. liveSync.onAlignModeChange((on) => { if (on) await loadBundleOnce(); ... });
// 2. loadBundleOnce() — dynamic <script src="..."> injection of 12 IIFE modules
// 3. buildBoardAccess(runtimeBoards) — builds real polygon-data accessors
// 4. CURRENT line ~268: window.TT_BEAMER_RUNTIME_OUTPUT_ALIGN_MODE.bootAlignMode(...)
// 5. PHASE 36 A2: REPLACE with bootHandleUi(...)
```

From src/app/runtime/output-receiver/receiver-bootstrap.js (line 992):
```js
// CURRENT (Phase 34 + Phase 35-iter2):
overlayEl.style.pointerEvents = alignMode ? "auto" : "none";

// PHASE 36 A2 (D-02 inversion):
overlayEl.style.pointerEvents = "none";
```

From src/styles.css lines 198-213 (Phase 35-A workaround — DELETE):
```css
body[data-output-role="final-output"].align-mode-active .projection-corner-handle,
body[data-output-role="final-output"].align-mode-active .projection-grid-handle,
body[data-output-role="final-output"].align-mode-active #projection-grid-line-canvas {
  pointer-events: none !important;
}
```

From output.html (verified — line 51):
```html
<div id="ssr-input-overlay" style="position:fixed;inset:0;z-index:4;touch-action:none;pointer-events:none"></div>
<!-- #stage and #room-overlay are NOT in static HTML (D-09 thin budget) — A2 loader appends them -->
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Refactor output-align-mode-loader.js to call bootHandleUi (replace bootAlignMode) and append stage/roomOverlay DOM</name>
  <files>src/app/runtime/output-receiver/output-align-mode-loader.js</files>
  <read_first>
    - src/app/runtime/output-receiver/output-align-mode-loader.js (full 381 LOC — locate buildBoardAccess at lines 104-146; bootAlignMode call at ~line 268; loadBundleOnce IIFE list)
    - src/app/runtime/output-receiver/output-align-mode.js (Phase 35-A historical — DO NOT IMPORT; reference dep-bag SHAPE)
    - src/app/runtime/output-receiver/boot-handle-ui.js (new module from A1 — see signature)
    - .planning/phases/phase-36/36-RESEARCH.md §1.5 (authoritative inventory)
    - .planning/phases/phase-36/36-RESEARCH.md §1.2 (state sub-key inventory — for state arg)
    - .planning/phases/phase-36/36-RESEARCH.md §10 (Plan A2 file touch list — keep loader IIFE list otherwise unchanged)
  </read_first>
  <behavior>
    - Loader's `onAlignModeChange((on) => { ... })` flow:
      1. If `on === true`: `await loadBundleOnce()` (existing — 12 IIFE bundle); `await fetchBoards()` and `await fetchSnapshot()` (existing); `boardAccess = buildBoardAccess(runtimeBoards)` (existing).
      2. NEW: append `<div id="stage">` and `<svg id="room-overlay">` to body if not already present (idempotent — Q3 add-line broadcast may re-trigger).
      3. NEW: import bootHandleUi from `./boot-handle-ui.js` (use ES dynamic import or static `<script type="module">` injection — pick whichever fits the existing loader pattern).
      4. NEW: call `bootHandleUi({...})` with full inventory:
         - `stage: document.getElementById("stage")`
         - `roomOverlay: document.getElementById("room-overlay")`
         - `videoEl: document.querySelector("video.ssr-video, video")`
         - `feedbackEl: null` (no visual feedback target on /output/; bootHandleUi defaults a detached div)
         - `state: createInitialState({ boardId: snapshot.selectedBoard || runtimeBoards[0]?.id, alignMode: true })` — see RESEARCH §1.2 for canonical shape; reuse the existing dashboard's state factory if accessible OR construct a minimal stub covering all sub-keys with sensible defaults
         - `outputRole: "final-output"`, `OUTPUT_ROLE_FINAL: "final-output"`, `OUTPUT_ROLE_CONTROL: "control"`
         - `liveSync: liveSync` (the existing thin liveSync handle)
         - `liveSyncCoreOverride: { emitLiveMutation: liveSync.emitLiveMutation }` (Phase 36 A1 added emitLiveMutation to output-live-sync.js)
         - `boardAccess: buildBoardAccess(runtimeBoards)` (existing h2 buildBoardAccess preserved)
         - `polygonContract`, `normalizers`, `polygonState`, `interactions`, `persistence`, `sync`, `dashboard`: stub no-ops mirroring Phase 35-A's output-align-mode.js groupings — see RESEARCH §1.5 + the four refactor-target IIFEs (handle-ui / handle-drag / mapping / polygon-editor) accept these via the dep-bag fan-out
         - `alignModeDirtyEndpoint: "/api/align-mode-dirty"` (Q1 LOCKED — existing endpoint per D-06 reconciliation)
         - `renderRoomOverlay: () => POLYGON_EDITOR.renderRoomOverlay?.()`
         - `showToast: (...args) => console.log("[output-toast]", ...args)`
         - `getRenderMode: () => "auto"`
         - `getBoardId: () => state.boardId`
         - `logger: console`
      5. The returned `{stop, hitTestVertex}` is stored in module-private state for teardown.
    - On `onAlignModeChange(false)`: call `_currentBootHandle?.stop()`. Optionally remove the appended `#stage` and `#room-overlay` from DOM (or hide them — implementation choice; teardown via `body.classList.remove("align-mode-active")` already handled in bootHandleUi).
    - On bundle-load failure: keep existing fallback (Phase 35-iter2 h1 retry / log).
    - Q3 follow-up note: line-add (right-click menu) immediate broadcast is wired in M5 — A2 just ensures the entry-point is reachable.
  </behavior>
  <action>
**Step 1: Locate the existing bootAlignMode call** (around line 268). The current code looks roughly like:

```js
window.TT_BEAMER_RUNTIME_OUTPUT_ALIGN_MODE.bootAlignMode({
  ...args
});
```

**Step 2: Add stage/roomOverlay DOM-append helper near top of file:**

```js
function _ensureStageAndOverlayDom() {
  let stage = document.getElementById("stage");
  if (!stage) {
    stage = document.createElement("div");
    stage.id = "stage";
    stage.style.cssText = "position:fixed;inset:0;z-index:5;pointer-events:none;";
    document.body.appendChild(stage);
  }
  let roomOverlay = document.getElementById("room-overlay");
  if (!roomOverlay) {
    roomOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    roomOverlay.id = "room-overlay";
    roomOverlay.setAttribute("viewBox", "0 0 1000 1000");
    roomOverlay.setAttribute("preserveAspectRatio", "xMidYMid meet");
    roomOverlay.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:auto;";
    stage.appendChild(roomOverlay);
  }
  return { stage, roomOverlay };
}
```

**Step 3: Add a state-factory helper** (covering all RESEARCH §1.2 sub-keys):

```js
function _createOutputState(boardId) {
  return {
    boardId: boardId || null,
    alignMode: true,
    uiView: "dashboard",
    selectedRoomId: null,
    selectedRoomByBoard: {},
    lastPolygonFocus: {},
    polygonEditor: {
      activeRoomIdByBoard: {},
      dragVertexIndex: null, dragPointerId: null,
      dragBoardId: null, dragRoomId: null,
      dragStartPoints: [], dragMoved: false,
      dragVertexOffsetX: 0, dragVertexOffsetY: 0,
      dragDomRefs: null,
      dragAreaBoardId: null, dragAreaRoomId: null,
      dragAreaPointerId: null, dragAreaStartPointerPoint: null,
      dragAreaStartPoints: [], dragAreaMoved: false,
      dragAreaDomRefs: null,
      pendingAreaBoardId: null, pendingAreaRoomId: null,
      pendingAreaPointerId: null, pendingAreaStartPointerPoint: null,
      selectedVertexIndex: null, selectedEdgeIndex: null,
      vertexSelectionActive: false,
      suppressRoomClickUntil: 0,
      roomNamesVisible: true,
      rotatingRoomId: null,
    },
    shipPolygonEditor: {
      dragVertexIndex: null, dragPointerId: null,
      dragBoardId: null,
      dragStartPoints: [], dragMoved: false,
      dragVertexOffsetX: 0, dragVertexOffsetY: 0,
      dragDomRefs: null,
      selectedVertexIndex: null, selectedEdgeIndex: null,
      _lastEdgeTap: null,
    },
    renderMode: "auto",
    runtime: { activeProjectionProfileId: null },
  };
}
```

**Step 4: Build the polygon dep-bag groupings** (boardAccess already exists; add stubs for the rest):

```js
function _buildPolygonStateStub(state, boardAccess) {
  return {
    getCurrentPolygonHandleScale: () => 1,
    getActivePolygonRoomId: (boardId) => state.polygonEditor.activeRoomIdByBoard?.[boardId] || null,
    setActivePolygonRoomId: (boardId, roomId) => {
      state.polygonEditor.activeRoomIdByBoard = state.polygonEditor.activeRoomIdByBoard || {};
      state.polygonEditor.activeRoomIdByBoard[boardId] = roomId;
    },
    isRoomFrozen: () => false,
    getPolygonEditorHandleMetrics: (zoomScale, handleScale) => ({ size: 12 * (handleScale || 1), strokeWidth: 2 }),
    arePlayAreaVerticesEditable: () => false,
    getSelectedPlayAreaId: () => null,
    getBoardZoom: () => ({ scale: 1 }),
  };
}

function _buildNormalizersStub() {
  // /output/ uses runtime-projection-mapping.remapPoint via window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING.
  // Concrete remapGridPoint/hasGridDisplacements set by mapping IIFE on init.
  // For polygon-editor's read path, identity normalizers suffice when align-mode is /output/-local.
  return {
    normalizeShipPolygon: (pts) => Array.isArray(pts) ? pts.slice() : [],
    normalizePolygonPoint: (pt) => Array.isArray(pt) ? pt.slice() : pt,
    remapGridPoint: (nx, ny) => {
      const M = window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING;
      return M?.remapPoint?.(nx, ny) || { x: nx, y: ny };
    },
    hasGridDisplacements: () => {
      const M = window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING;
      return Boolean(M?.hasDisplacements?.());
    },
  };
}

function _buildInteractionsStub() {
  return {
    mapClientPointToNormalized: (cx, cy) => {
      // Use stage bbox for normalization on /output/
      const stage = document.getElementById("stage");
      if (!stage) return { x: 0, y: 0 };
      const rect = stage.getBoundingClientRect();
      return {
        x: (cx - rect.left) / rect.width,
        y: (cy - rect.top) / rect.height,
      };
    },
    beginPolygonDragInteraction: () => {},
    endPolygonDragInteraction: () => {},
    isPanArbitrating: () => false,
    isAcceptablePolygonPointerEvent: (event) => event?.button !== 2,  // not right-click
    areRoomVerticesEditable: () => false,  // /output/ is read-only for polygon-VERTEX edits; only grid edits
    setPlayAreaPolygon: () => {},  // no-op on /output/
  };
}

function _buildPersistenceStub(liveSync) {
  return {
    persistBoardProfiles: () => {},  // server owns persistence; /output/ does not write
    pushUndoState: (desc) => {
      // Delegated to grid-state's local stack via HANDLE_UI's pushUndo; this stub
      // is for polygon-editor's drag-start which is no-op on /output/
    },
    saveProjectionMapping: () => {},  // dashboard-only
  };
}

function _buildSyncStubs() {
  // All dashboard-only — no-ops with rationale (handle-ui calls these from ui-side
  // sync paths that only fire when uiView === "settings", which is dashboard-only)
  const noop = () => {};
  return {
    syncShipPolygonEditorStatus: noop, syncShipPolygonVertexSelect: noop,
    syncPolygonVertexSelect: noop, syncPolygonEdgeSelect: noop,
    syncPolygonEditorStatus: noop, syncPolygonEditorPanel: noop,
    syncRoomPanelFromSelection: noop, syncSelectedRoomStateForBoard: noop,
    refreshPersistentRoomSelectionVisualState: noop,
  };
}

function _buildDashboardStubs() {
  // Dashboard-only callbacks. No-op on /output/.
  const noop = () => {};
  return {
    handleQuickModeRoomTap: noop,
    applyRoomDraftTargetFromRoomClick: noop,
    isQuickModeActive: () => false,
    cacheShipPolygonDragDomRefs: noop,
    cacheRoomPolygonDragDomRefs: noop,
  };
}
```

**Step 5: Replace the bootAlignMode call** (around line 268). Use ES dynamic import for bootHandleUi (since it's an ES module per A1):

```js
// REMOVE the old bootAlignMode call.
// REPLACE with:
const { stage, roomOverlay } = _ensureStageAndOverlayDom();
const videoEl = document.querySelector("video.ssr-video, video") || null;
const _state = _createOutputState(snapshot?.selectedBoard || runtimeBoards[0]?.id || null);
const polygonState = _buildPolygonStateStub(_state, boardAccess);
const normalizers = _buildNormalizersStub();
const interactions = _buildInteractionsStub();
const persistence = _buildPersistenceStub(liveSync);
const sync = _buildSyncStubs();
const dashboard = _buildDashboardStubs();

const { bootHandleUi } = await import("./boot-handle-ui.js");
const _bootHandle = bootHandleUi({
  stage, roomOverlay, videoEl, feedbackEl: null,
  state: _state,
  outputRole: "final-output",
  OUTPUT_ROLE_FINAL: "final-output",
  OUTPUT_ROLE_CONTROL: "control",
  liveSync,
  liveSyncCoreOverride: { emitLiveMutation: liveSync.emitLiveMutation },
  polygonContract: window.TT_BEAMER_RUNTIME_POLYGON_CONTRACT || null,
  normalizers,
  boardAccess,
  polygonState,
  interactions,
  persistence,
  alignModeDirtyEndpoint: "/api/align-mode-dirty",  // Q1 LOCKED — existing endpoint per D-06 reconciliation
  sync,
  dashboard,
  renderRoomOverlay: () => window.TT_BEAMER_RUNTIME_POLYGON_EDITOR?.renderRoomOverlay?.(),
  showToast: (...args) => console.log("[output-toast]", ...args),
  getRenderMode: () => "auto",
  getBoardId: () => _state.boardId,
  logger: console,
});

// Store handle for teardown on align-mode-OFF
_currentBootHandle = _bootHandle;
```

**Step 6: Wire teardown on alignMode=false:**

```js
if (!on && _currentBootHandle) {
  try { _currentBootHandle.stop(); } catch (e) { console.warn("[loader] stop():", e.message); }
  _currentBootHandle = null;
  // Optionally hide stage/roomOverlay (handle-ui's own teardown should remove handles)
  document.getElementById("stage")?.style?.setProperty("display", "none");
}
```

**Step 7: Preserve all existing loader logic** — the 2-second post-load prefetch, IIFE bundle list, fetchBoards, fetchSnapshot, error retry, etc. ALL UNCHANGED. The ONLY change is the boot call (bootAlignMode → bootHandleUi) and the new DOM-append + state-factory helpers.

**Step 8:** Q3 (immediate broadcast on add-line) is implemented in M5 — A2 just ensures the boot path lands the bundle.
  </action>
  <verify>
    <automated>grep -c "bootHandleUi" src/app/runtime/output-receiver/output-align-mode-loader.js && grep -c "bootAlignMode" src/app/runtime/output-receiver/output-align-mode-loader.js</automated>
    Expected output: line 1 ≥ 2 (import + call), line 2 = 0 (legacy call fully replaced)
  </verify>
  <acceptance_criteria>
    - `grep -c "bootHandleUi" src/app/runtime/output-receiver/output-align-mode-loader.js` returns ≥ 2
    - `grep -c "bootAlignMode\b" src/app/runtime/output-receiver/output-align-mode-loader.js` returns 0 (legacy call fully removed; output-align-mode.js stays in tree but is NOT imported)
    - File contains the literal `liveSyncCoreOverride: { emitLiveMutation: liveSync.emitLiveMutation }` (or equivalent — `grep -c "emitLiveMutation" output-align-mode-loader.js` ≥ 2)
    - File contains the literal `alignModeDirtyEndpoint: "/api/align-mode-dirty"` (Q1 reconciliation traceable)
    - File contains the literal `_ensureStageAndOverlayDom` (DOM append helper exists)
    - File contains the literal `_createOutputState` (state factory exists)
    - File contains the literal `import("./boot-handle-ui.js")` OR `from "./boot-handle-ui.js"` (boot-handle-ui linked)
    - JS unit tests pass: `node --test test/phase-36-boot-handle-ui-shape.test.mjs test/phase-35-output-live-sync.test.mjs 2>&1 | grep -cE "^# fail 0"` returns 2
    - Connection-stability gate: `RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs' 2>&1 | grep "fail=0"` returns at least 1 match
    - output.html script-tag count: `grep -cE "<script[^>]*src=" output.html` ≤ 8 (D-09 budget — output.html UNTOUCHED)
  </acceptance_criteria>
  <done>
    Loader now bootstraps via bootHandleUi instead of bootAlignMode. Stage/roomOverlay DOM is appended on first align-mode toggle. liveSyncCoreOverride routes broadcasts through emitLiveMutation. Q1 reconciliation traceable in source.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Invert receiver-bootstrap.js overlay pointer-events (D-02 inversion) and remove Phase 35-A !important CSS rule</name>
  <files>
    - src/app/runtime/output-receiver/receiver-bootstrap.js
    - src/styles.css
  </files>
  <read_first>
    - src/app/runtime/output-receiver/receiver-bootstrap.js (locate line ~992 — the `overlayEl.style.pointerEvents = alignMode ? "auto" : "none"` toggle and the onAlignModeChange handler that mirrors it)
    - src/styles.css lines 195-220 (the Phase 35-A `pointer-events:none !important` block to delete)
    - .planning/phases/phase-36/36-CONTEXT.md D-02 (event-handling architecture)
    - .planning/phases/phase-36/36-RESEARCH.md §3 (full code-change diff with rationale)
  </read_first>
  <behavior>
    - `receiver-bootstrap.js` line ~992 area: BOTH the boot-time assignment AND the onAlignModeChange callback set `overlayEl.style.pointerEvents = "none"` regardless of `alignMode` state. Phase 36 D-02(a): overlay never captures clicks; handle DOM does.
    - `src/styles.css`: the rule block targeting `body[data-output-role="final-output"].align-mode-active .projection-corner-handle, .projection-grid-handle, #projection-grid-line-canvas { pointer-events: none !important; }` is DELETED entirely. A short comment is left in place documenting the removal (audit traceability).
    - receiver-input-forwarder.js is NOT modified — it remains attached to overlayEl, but never receives events because overlayEl always has pointer-events:none in the Phase 36 model.
    - Existing receiver-bootstrap logic for non-overlay state (alignMode tracking, profileId, hitTestVertex Wave-4 fallback) is PRESERVED. Only the two `pointerEvents = ...` lines change.
  </behavior>
  <action>
**Sub-task 2a — Modify `src/app/runtime/output-receiver/receiver-bootstrap.js`:**

1. Locate the line(s) around line 992 where `overlayEl.style.pointerEvents` is assigned. There are TWO assignments per RESEARCH §3:
   - Initial (boot-time): `overlayEl.style.pointerEvents = alignMode ? "auto" : "none";`
   - In the onAlignModeChange callback: `overlayEl.style.pointerEvents = alignMode ? "auto" : "none";`

2. Replace BOTH occurrences with a permanent `"none"`:

```js
// CURRENT (delete):
overlayEl.style.pointerEvents = alignMode ? "auto" : "none";

// PHASE 36 (D-02 (a) — handle DOM at z:9999 captures clicks; overlay stays dormant):
overlayEl.style.pointerEvents = "none";
```

Add a one-line comment near the first occurrence:

```js
// Phase 36 D-02 (a): overlay pointer-events permanently "none" so handle DOM
// (z:9999, pointer-events:auto) captures clicks directly. receiver-input-forwarder
// remains attached but dormant — no events reach overlayEl in this model.
overlayEl.style.pointerEvents = "none";
```

Do NOT remove the onAlignModeChange subscription — keep it to maintain `alignMode` state tracking for `hitTestVertex` (the Wave-4 fallback when bootHandleUi is not active). Just change the pointer-events branch inside it.

**Sub-task 2b — Modify `src/styles.css` (lines 198-213 area):**

1. Locate the rule block:

```css
body[data-output-role="final-output"].align-mode-active .projection-corner-handle,
body[data-output-role="final-output"].align-mode-active .projection-grid-handle,
body[data-output-role="final-output"].align-mode-active #projection-grid-line-canvas {
  pointer-events: none !important;
}
```

2. DELETE this entire rule block.

3. Replace it with a single-line comment for audit traceability:

```css
/* Phase 36 D-02 — Phase 35-A's `pointer-events:none !important` on handles REMOVED.
   Overlay JS-toggled to "none" instead (receiver-bootstrap.js); handles' inline
   `pointer-events: auto` from handle-ui creation now wins without competition. */
```

4. Verify NO other `pointer-events: none !important` rules target handle classes by grepping.

**Sub-task 2c — Verify output.html UNCHANGED:**

The init context notes output.html line 51 already has `style="...;pointer-events:none"` on `#ssr-input-overlay` (verified). No change needed in output.html. The receiver-bootstrap.js change handles the runtime toggle (which is now a no-op-style permanent assignment).
  </action>
  <verify>
    <automated>grep -cE 'overlayEl\.style\.pointerEvents\s*=\s*"none"' src/app/runtime/output-receiver/receiver-bootstrap.js && ! grep -nE 'pointer-events:\s*none\s*!important' src/styles.css | grep -E 'projection-corner-handle|projection-grid-handle'</automated>
    Expected output: line 1: ≥ 2 (both assignments converted); line 2: nothing matches (rule deleted)
  </verify>
  <acceptance_criteria>
    - `grep -cE 'overlayEl\.style\.pointerEvents\s*=\s*"none"' src/app/runtime/output-receiver/receiver-bootstrap.js` returns ≥ 2 (both assignments converted to permanent "none")
    - `grep -cE 'overlayEl\.style\.pointerEvents\s*=\s*alignMode\s*\?' src/app/runtime/output-receiver/receiver-bootstrap.js` returns 0 (the conditional toggle is gone)
    - `grep -nE 'pointer-events:\s*none\s*!important' src/styles.css | grep -cE 'projection-corner-handle|projection-grid-handle|projection-grid-line-canvas'` returns 0 (rule deleted)
    - `grep -c "Phase 36 D-02" src/styles.css` returns ≥ 1 (audit-traceable comment)
    - `grep -c "Phase 36 D-02" src/app/runtime/output-receiver/receiver-bootstrap.js` returns ≥ 1 (audit-traceable comment)
    - output.html UNCHANGED — `git diff --name-only output.html` returns no result
    - JS unit tests still pass: `node --test test/connection-stability/*.test.mjs 2>&1 | grep "fail=0"` matches at least once
    - Existing receiver-bootstrap test suite (e.g. `test/ssr-receiver-disconnect-detection.test.mjs`): `node --test test/ssr-receiver-disconnect-detection.test.mjs 2>&1 | grep -E "^# fail 0"` shows fail=0
  </acceptance_criteria>
  <done>
    receiver-bootstrap.js permanently sets overlay pointer-events to "none". Phase 35-A CSS workaround REMOVED with audit comment. output.html unchanged. Connection-stability fail=0.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → /api/live/command (alignMode toggle) | Untrusted; existing server validation preserved |
| Loader → bootHandleUi args | First-party only; trust documented in A1 boot-handle-ui.js header |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-DOS-1 | DoS | overlay pointer-events:none breaking input gate | accept | T10 (W0 RED rail) verifies receiver-input-forwarder dormancy; bootHandleUi's stop() restores body class state |
| T-DOM-1 | Tampering | Stage/roomOverlay DOM injection from loader | accept | Loader is first-party; idempotent helper prevents duplicate elements |
</threat_model>

<verification>
A2 wave closure gates:
- output-align-mode-loader.js calls bootHandleUi (not bootAlignMode)
- liveSyncCoreOverride wired via emitLiveMutation
- alignModeDirtyEndpoint: "/api/align-mode-dirty" passed (Q1 LOCKED)
- receiver-bootstrap.js overlay pointer-events permanently "none"
- src/styles.css Phase 35-A !important rule removed
- output.html UNCHANGED (D-09 ≤8 src-based scripts)
- Connection-stability fail=0
- Live-E2E smoke (Phase 35 W0): `pytest test/live-e2e/test_phase35_alignmode_smoke.py -v` → still GREEN (no regression on existing rail)
- Phase 36 RED tests T1-T10 still RED (no implementation wave landed yet) — but `test_t1` should at least no longer fail at `wait_for_function('.projection-corner-handle')` because handles now CAN render via bootHandleUi (handles may be misaligned per T1 sizing assertion — that's M3's job)
</verification>

<success_criteria>
- bootHandleUi reachable from /output/ via lazy-loader
- D-02(a) inversion landed: overlay always "none", handles always capture
- Phase 35-A CSS workaround deleted with audit-comment
- output.html script-tag count UNCHANGED (D-09 verified)
- D-08 connection-stability fail=0
- Q1 dirty-flag endpoint reconciliation traceable (string `/api/align-mode-dirty` in loader call)
</success_criteria>

<output>
After completion, create `.planning/phases/phase-36/36-A2-SUMMARY.md` documenting:
- The exact lines added/removed in output-align-mode-loader.js (bootAlignMode → bootHandleUi)
- The exact lines changed in receiver-bootstrap.js (overlay toggle → permanent "none")
- The exact lines deleted from src/styles.css (Phase 35-A !important block)
- Confirmation output.html unchanged
- D-08 + D-09 evidence
</output>
