---
phase: 36
plan: A1
type: execute
wave: 1
depends_on: [W0]
files_modified:
  - src/app/runtime/output-receiver/boot-handle-ui.js
  - src/app/runtime/output-receiver/output-live-sync.js
  - src/app/runtime/viewport/runtime-projection-grid-state.js
  - src/app/runtime/runtime-orchestration.js
autonomous: true
requirements_addressed: [D-01, D-07]
gap_closure: false
must_haves:
  truths:
    - "bootHandleUi exists as a NEW exported function in src/app/runtime/output-receiver/boot-handle-ui.js"
    - "bootHandleUi accepts the full §2 RESEARCH-locked single-arg-object signature with explicit named fields covering the §1.5 inventory (DOM roots, state, role, liveSync, liveSyncCoreOverride, polygon contract/normalizers/board-access, polygon-state, interactions, persistence, sync, dashboard, callbacks, alignModeDirtyEndpoint, logger)"
    - "bootHandleUi returns { stop, hitTestVertex } per §2 returned-shape"
    - "output-live-sync.js exports a new method emitLiveMutation(mutationType, payload) that wraps ws.send with the canonical live-mutation envelope"
    - "grid-state.js's broadcastGridSnapshot uses an injected liveSyncCoreOverride dep when present (init-time DI), falling back to window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE for dashboard back-compat"
    - "runtime-trace harness exists in runtime-orchestration.js, gated by URL flag ?ctx-trace=1, wrapping mappingDepBag and POLYGON_EDITOR.init's ctx via Proxy and exposing window._ctxTraceDump()"
    - "Dashboard's existing align-mode UX is UNCHANGED — runtime-orchestration.js's MAPPING.init at line 412 and POLYGON_EDITOR.init at line 1890 are NOT yet refactored to call bootHandleUi (deferred to M3-LATE per RESEARCH §2 dashboard-migration risk-mitigation note)"
    - "test/phase-36-boot-handle-ui-shape.test.mjs flips RED→GREEN (bootHandleUi exists, returns {stop, hitTestVertex}, throws on missing args)"
    - "Connection-stability fail=0 preserved (D-08)"
  artifacts:
    - path: "src/app/runtime/output-receiver/boot-handle-ui.js"
      provides: "Option-H thin-export entry-point that wraps MAPPING.init + POLYGON_EDITOR.init"
      min_lines: 200
      exports: ["bootHandleUi"]
    - path: "src/app/runtime/output-receiver/output-live-sync.js"
      provides: "Existing 211-LOC subscription module + NEW emitLiveMutation method"
      contains: "emitLiveMutation"
    - path: "src/app/runtime/viewport/runtime-projection-grid-state.js"
      provides: "broadcastGridSnapshot with optional liveSyncCoreOverride DI"
      contains: "liveSyncCoreOverride"
    - path: "src/app/runtime/runtime-orchestration.js"
      provides: "Original dashboard init UNCHANGED + new ?ctx-trace=1 Proxy harness"
      contains: "_ctxTraceDump"
  key_links:
    - from: "boot-handle-ui.js"
      to: "window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING.init + window.TT_BEAMER_RUNTIME_POLYGON_EDITOR.init"
      via: "single bootHandleUi(...) call wrapping both inits with explicit dep-bag"
      pattern: "TT_BEAMER_RUNTIME_PROJECTION_MAPPING\\.init"
    - from: "output-live-sync.js emitLiveMutation"
      to: "ws.send"
      via: "JSON.stringify({type:'live-mutation', mutationId, mutationType, payload, clientSentAt})"
      pattern: "ws\\?.send|ws\\.send"
    - from: "grid-state.js broadcastGridSnapshot"
      to: "liveSyncCoreOverride.emitLiveMutation OR window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE.emitLiveMutation"
      via: "init-time DI fall-through"
      pattern: "liveSyncCoreOverride"
threat_model:
  threats:
    - id: T-XSS-1
      title: "XSS via ctx field passed to handle-ui"
      stride: Tampering
      asvs: V5
      severity: low
      description: "If bootHandleUi accepts a malicious renderRoomOverlay or showToast callback, attacker could trigger script execution"
      existing_mitigation: "bootHandleUi is only called from trusted call-sites (output-align-mode-loader.js + future runtime-orchestration.js); no user-controllable input flows to args"
      new_mitigation: "Document call-site trust requirement in boot-handle-ui.js header comment"
---

<objective>
Implement Option-H thin-export per CONTEXT.md D-01 + RESEARCH §2: a NEW `boot-handle-ui.js` module that wraps the existing `MAPPING.init` + `POLYGON_EDITOR.init` fan-out with explicit named args. Per RESEARCH §2 init-bundle-question, `bootHandleUi` does NOT introduce new sub-boots — it ADAPTS the existing dashboard init pattern to be callable from `/output/`.

This wave is **additive** — the dashboard's existing implicit injection (runtime-orchestration.js lines 412 + 1890) is preserved unchanged. Wave M3-LATE (deferred to M3 plan) migrates dashboard to also call bootHandleUi.

This wave also adds:
1. **`emitLiveMutation` method on output-live-sync.js** — RESEARCH §1.5 + §1.3 critical-fix-#1. New method wraps the private `ws.send(...)` so /output/ can broadcast grid snapshots.
2. **`liveSyncCoreOverride` DI on grid-state.js** — RESEARCH §1.3 recommendation (ii). Smaller diff than wrapping window-globals; falls back to existing window lookup for dashboard.
3. **Runtime-trace harness in runtime-orchestration.js** — RESEARCH §1.4 + CONTEXT.md D-07. Gated by `?ctx-trace=1` URL flag. Operator drives every align-mode interaction; `window._ctxTraceDump()` produces the union inventory for cross-check.

Purpose: Establish the boot function and broadcast plumbing. Subsequent waves (A2, M3-M5) wire up consumers and flip RED tests.

Output: A working `bootHandleUi(...)` callable from output-align-mode-loader.js (wired in A2). Dashboard regression unchanged.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-36/36-CONTEXT.md
@.planning/phases/phase-36/36-RESEARCH.md
@.planning/phases/phase-35/35-CLOSURE-ITER2-ADDENDUM.md
@src/app/runtime/output-receiver/output-live-sync.js
@src/app/runtime/output-receiver/output-align-mode.js
@src/app/runtime/output-receiver/output-align-mode-loader.js
@src/app/runtime/viewport/runtime-projection-grid-state.js
@src/app/runtime/viewport/runtime-projection-mapping.js
@src/app/runtime/runtime-orchestration.js

<interfaces>
<!-- Verified module surfaces. Executor MUST use these — no exploration. -->

From src/app/runtime/output-receiver/output-live-sync.js (Phase 35-B, 211 LOC):
```js
// Existing return shape (PRESERVED, EXTENDED with emitLiveMutation):
{
  onAnimationStart, onAnimationStop, onClearAll,
  onAlignModeChange, onProjectionProfileChange,
  onConnect, onDisconnect,
  getAlignMode, getActiveProjectionProfileId, getCurrentClientId,
  stop,
  // NEW (Phase 36 A1):
  emitLiveMutation,  // (mutationType: string, payload: any) => void
}
```

From src/app/runtime/viewport/runtime-projection-mapping.js (lines 340-410 init pattern):
```js
// MAPPING.init(deps) does the fan-out. Phase 36 passes liveSyncCoreOverride
// in the deps bag so grid-state can pick it up.
window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING.init({
  ...allDepFields,                  // existing 30+ fields
  liveSyncCoreOverride,             // NEW (Phase 36 A1) — Object | null
});
```

From src/app/runtime/viewport/runtime-projection-grid-state.js (line ~389 hidden global):
```js
// CURRENT (Phase 35 + earlier):
const liveSyncCore = window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE;
if (liveSyncCore?.emitLiveMutation) {
  liveSyncCore.emitLiveMutation("align-grid-snapshot", payload);
} else {
  console.warn("[grid-state] no liveSyncCore — drop snapshot");
}

// PHASE 36 (A1): same logic, but the lookup prefers the injected override:
const liveSyncCore = (typeof _initDeps?.liveSyncCoreOverride === "object" && _initDeps.liveSyncCoreOverride)
  ? _initDeps.liveSyncCoreOverride
  : window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE;
```

From src/app/runtime/output-receiver/output-align-mode.js (Phase 35-A historical reference, 359 LOC, NOT loaded today):
```js
// Phase 35-A pattern — reuse arg-bag SHAPE; do NOT load this file.
// Group fields: boardAccess, polygonContract, normalizers, polygonState,
// interactions, persistence, sync, dashboard. Stub fields with no-op rationale.
```

From src/app/runtime/runtime-orchestration.js (existing dashboard init):
```js
// Line ~412: MAPPING.init({...}) — existing implicit-injection, KEEP unchanged in A1
// Line ~1890: POLYGON_EDITOR.init({...}) — existing, KEEP unchanged in A1
// Phase 36 A1 ONLY adds the optional ?ctx-trace=1 Proxy wrapper BEFORE these calls.
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add emitLiveMutation method to output-live-sync.js + liveSyncCoreOverride DI to grid-state.js</name>
  <files>
    - src/app/runtime/output-receiver/output-live-sync.js
    - src/app/runtime/viewport/runtime-projection-grid-state.js
  </files>
  <read_first>
    - src/app/runtime/output-receiver/output-live-sync.js (full 211 LOC — locate the private ws variable + return-object construction)
    - src/app/runtime/viewport/runtime-projection-grid-state.js (locate broadcastGridSnapshot function around line 380-453, init() function for dep-bag access)
    - .planning/phases/phase-36/36-RESEARCH.md §1.3 (critical fix #1 + recommendation (ii))
    - .planning/phases/phase-36/36-RESEARCH.md §1.5 (Live-sync subscription + Live-sync-core override sub-sections — exact emitLiveMutation envelope)
  </read_first>
  <behavior>
    - output-live-sync.js: Adds a function `emitLiveMutation(mutationType, payload)` that:
      - Returns silently if `ws` is null or `ws.readyState !== WebSocket.OPEN`
      - Calls `ws.send(JSON.stringify({type: "live-mutation", mutationId: \`${mutationType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}\`, mutationType, payload, clientSentAt: new Date().toISOString()}))`
      - Catches and logs any send error via `console.warn("[output-live-sync] emitLiveMutation failed:", err.message)`
    - output-live-sync.js's existing return object gets `emitLiveMutation` added as a new key. All existing keys preserved.
    - grid-state.js: `init(deps)` stores `_liveSyncCoreOverride = deps?.liveSyncCoreOverride || null` in module scope.
    - grid-state.js: `broadcastGridSnapshot(...)` uses `_liveSyncCoreOverride || window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE` for the lookup. All existing throttle/payload/error-handling logic UNCHANGED.
    - When `liveSyncCoreOverride` is null (dashboard case), behavior is byte-identical to current implementation.
    - When `liveSyncCoreOverride` is provided (/output/ case via A2), broadcasts go through the injected `emitLiveMutation`.
  </behavior>
  <action>
**Sub-task 1a — Modify `src/app/runtime/output-receiver/output-live-sync.js`:**

Locate the `bootOutputLiveSync(...)` function. Inside it, find the private `let ws = null;` declaration (or equivalent). After the function declarations for `onAnimationStart`, `onAnimationStop`, etc., and BEFORE the `return { ... }` statement, add:

```js
function emitLiveMutation(mutationType, payload) {
  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("[output-live-sync] emitLiveMutation skipped — ws not OPEN");
      return;
    }
    const mutationId = `${mutationType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    ws.send(JSON.stringify({
      type: "live-mutation",
      mutationId,
      mutationType,
      payload,
      clientSentAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.warn("[output-live-sync] emitLiveMutation failed:", err?.message || err);
  }
}
```

Then in the return object, add `emitLiveMutation` as a new key (e.g. `return { ..., emitLiveMutation };` — preserve all existing returned keys verbatim).

**Sub-task 1b — Modify `src/app/runtime/viewport/runtime-projection-grid-state.js`:**

1. At module-scope (top of the IIFE body), add:
   ```js
   let _liveSyncCoreOverride = null;
   ```

2. In the `init(...)` function (the existing init that receives the dep-bag from MAPPING.init), add ONE LINE near the top:
   ```js
   _liveSyncCoreOverride = (deps && typeof deps.liveSyncCoreOverride === "object" && deps.liveSyncCoreOverride) || null;
   ```

3. In `broadcastGridSnapshot(...)` at approximately line 389 where `window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE` is read, replace:
   ```js
   const liveSyncCore = window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE;
   ```
   With:
   ```js
   const liveSyncCore = _liveSyncCoreOverride || window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE;
   ```

   ALL other lines of broadcastGridSnapshot (throttle, payload assembly, error logs, return early-outs) UNCHANGED.

4. Do NOT export `_liveSyncCoreOverride`. It is module-private state set only by init().

This change is a no-op for dashboard (which never passes `liveSyncCoreOverride`) and routes /output/ broadcasts through the injected `emitLiveMutation` once A2 wires it.
  </action>
  <verify>
    <automated>node -e "import('./src/app/runtime/output-receiver/output-live-sync.js').then(m=>{const r=m.bootOutputLiveSync({onConnect:()=>{},onDisconnect:()=>{},dispatchSnapshot:()=>{}});console.log(typeof r.emitLiveMutation);r.stop();}).catch(e=>{console.error(e.message);process.exit(1);})"</automated>
    Expected output: `function`
  </verify>
  <acceptance_criteria>
    - `grep -c "emitLiveMutation" src/app/runtime/output-receiver/output-live-sync.js` returns ≥ 2 (function definition + return-object key)
    - `grep -c "_liveSyncCoreOverride" src/app/runtime/viewport/runtime-projection-grid-state.js` returns ≥ 3 (declaration + init assignment + broadcastGridSnapshot lookup)
    - `grep -nE "type:\s*\"live-mutation\"" src/app/runtime/output-receiver/output-live-sync.js` returns at least one match (envelope shape preserved)
    - `node test/phase-35-output-live-sync.test.mjs` (existing Phase 35 W0 unit) still passes — `node --test test/phase-35-output-live-sync.test.mjs 2>&1 | grep -E "^# (pass|fail)"` shows fail=0
    - JS suite: `node --test test/connection-stability/*.test.mjs` reports `fail=0` (D-08 hard gate)
    - Dashboard side regression: open `/` (handled in V wave) — for now just verify file is syntactically valid: `node -c src/app/runtime/viewport/runtime-projection-grid-state.js` exits 0 (or, since it's an IIFE module that may not be node-compatible, use `node --check src/app/runtime/output-receiver/output-live-sync.js`)
  </acceptance_criteria>
  <done>
    output-live-sync.js exposes emitLiveMutation; grid-state.js init reads liveSyncCoreOverride from deps and uses it in broadcastGridSnapshot. Dashboard regression intact (no liveSyncCoreOverride passed → existing window-global path).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create boot-handle-ui.js (Option-H thin-export entry-point)</name>
  <files>src/app/runtime/output-receiver/boot-handle-ui.js</files>
  <read_first>
    - .planning/phases/phase-36/36-RESEARCH.md §2 (full bootHandleUi signature + init-bundle-question)
    - .planning/phases/phase-36/36-RESEARCH.md §1.5 (authoritative inventory table — DOM roots, live-sync wires, board access, polygon contract, sync stubs, dashboard stubs, persistence, dirty endpoint, logger)
    - .planning/phases/phase-36/36-RESEARCH.md §1.2 (state sub-key inventory — for state-arg validation)
    - .planning/phases/phase-36/36-RESEARCH.md §1.3 (hidden window-globals — confirm bundle-load order)
    - src/app/runtime/output-receiver/output-align-mode.js (Phase 35-A historical ref — DO NOT IMPORT, only mimic shape of dep-bag construction)
    - src/app/runtime/viewport/runtime-projection-mapping.js (lines 340-410 — see how MAPPING.init's existing dep-bag is shaped)
    - test/phase-36-boot-handle-ui-shape.test.mjs (the RED unit this task flips GREEN)
  </read_first>
  <behavior>
    - File is an ES module (NOT IIFE) exporting a NAMED function `bootHandleUi(...)` per RESEARCH §2 signature.
    - On call: validates required args (throws if missing `state`, `outputRole`, `OUTPUT_ROLE_FINAL`, `OUTPUT_ROLE_CONTROL`).
    - Looks up the four IIFE modules from `window.TT_BEAMER_*`. Throws if any missing — bundle must be loaded BEFORE bootHandleUi is called (output-align-mode-loader.js handles this in A2).
    - Builds the polygonCtx dep-bag using exactly the named-args from the function signature. Every named arg maps to a corresponding `polygonCtx.X` field. Dashboard-only stubs are passed through (loader provides no-ops with rationale comments).
    - Calls `MAPPING.init({...})` with everything needed for the fan-out: stage, roomOverlay, videoEl, state, outputRole, role-constants, getRenderMode, getBoardId, the polygon-data fields, AND the new `liveSyncCoreOverride`.
    - Calls `POLYGON_EDITOR.init(polygonCtx)` after MAPPING.init returns.
    - Subscribes to `liveSync.onAlignModeChange((on) => { ... })` to toggle handles via `HANDLE_UI.showHandles(on)` and the `body.classList.toggle("align-mode-active", on)`.
    - Subscribes to `liveSync.onProjectionProfileChange(...)` to reload the active profile (via `MAPPING.reloadProfile?.()` if available, else no-op).
    - Returns `{ stop, hitTestVertex }`:
      - `stop()` removes the liveSync listeners, calls `HANDLE_UI.showHandles?.(false)`, calls a teardown helper that nulls module-locals, restores body class, restores overlay pointer-events.
      - `hitTestVertex(clientX, clientY)` delegates to `HANDLE_UI.hitTestVertex?.(clientX, clientY)` if available; else returns `null`.
    - Logger arg defaults to `console`; all `[boot-handle-ui]`-prefixed warnings go through it.
    - File header comment documents D-01 / D-07 / call-site-trust-requirement (per A1 threat T-XSS-1 mitigation).
  </behavior>
  <action>
Create `src/app/runtime/output-receiver/boot-handle-ui.js` (ES module, ~250 LOC). Header comment explains Option-H rationale and call-site trust requirement. Implementation skeleton:

```js
// src/app/runtime/output-receiver/boot-handle-ui.js
// Phase 36 D-01 (Option H) — first-class thin-export of the full handle-ui surface.
//
// Single entry-point that boots the align-mode UI for either /output/ (thin)
// or the dashboard (full). Wraps MAPPING.init (which fans out into
// grid-state, gl-renderer, 2d-fallback, handle-ui, profile-persistence) and
// POLYGON_EDITOR.init in the right order with explicit named args.
//
// Call-site trust: This module is called from output-align-mode-loader.js
// (which loads the IIFE bundle deterministically) and (M3-LATE) from
// runtime-orchestration.js. NO untrusted input reaches the args. Callbacks
// like `renderRoomOverlay` and `showToast` MUST be trusted, callable functions.
//
// Phase 35-A's bootAlignMode failed because the audit was grep-only; Phase 36
// uses §1.5 RESEARCH inventory (AST-union + state-key + window-global) and
// the runtime-trace harness (?ctx-trace=1) to keep the contract complete.

const _LOG_PREFIX = "[boot-handle-ui]";

function _required(value, name, logger) {
  if (value === undefined) {
    const err = new Error(`${_LOG_PREFIX} required arg "${name}" is undefined`);
    logger?.error?.(err.message);
    throw err;
  }
  return value;
}

function _resolveModule(name, logger) {
  const m = (typeof window !== "undefined") ? window[name] : null;
  if (!m || typeof m !== "object") {
    const err = new Error(`${_LOG_PREFIX} ${name} not loaded — bundle order error`);
    logger?.error?.(err.message);
    throw err;
  }
  return m;
}

export function bootHandleUi(args) {
  if (!args || typeof args !== "object") {
    throw new Error(`${_LOG_PREFIX} args object is required`);
  }
  const {
    // DOM roots
    stage, roomOverlay, videoEl = null, feedbackEl = null,
    // State + role
    state, outputRole, OUTPUT_ROLE_FINAL, OUTPUT_ROLE_CONTROL,
    // Live-sync
    liveSync, liveSyncCoreOverride = null,
    // Polygon data + normalizers
    polygonContract = null, normalizers = {}, boardAccess = {},
    polygonState = {}, interactions = {},
    // Persistence
    persistence = {}, alignModeDirtyEndpoint = "/api/align-mode-dirty",
    // Sync (dashboard) and dashboard-only stubs
    sync = {}, dashboard = {},
    // Cross-module callbacks
    renderRoomOverlay = null, showToast = null,
    getRenderMode = () => "auto",
    getBoardId = () => state?.boardId || null,
    // Diagnostic
    logger = console,
  } = args;

  // ── Validate required args ──
  _required(state, "state", logger);
  _required(outputRole, "outputRole", logger);
  _required(OUTPUT_ROLE_FINAL, "OUTPUT_ROLE_FINAL", logger);
  _required(OUTPUT_ROLE_CONTROL, "OUTPUT_ROLE_CONTROL", logger);
  _required(stage, "stage", logger);
  _required(roomOverlay, "roomOverlay", logger);
  _required(liveSync, "liveSync", logger);

  // ── Resolve IIFE modules (bundle MUST be loaded by caller before bootHandleUi) ──
  const MAPPING = _resolveModule("TT_BEAMER_RUNTIME_PROJECTION_MAPPING", logger);
  const POLYGON_EDITOR = _resolveModule("TT_BEAMER_RUNTIME_POLYGON_EDITOR", logger);
  const HANDLE_UI = _resolveModule("TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI", logger);

  // ── Build the polygon ctx dep-bag (full §1.5 inventory) ──
  // Every named arg above maps to a polygonCtx.X field. Dashboard-only stubs
  // come from the caller (loader) — bootHandleUi does NOT default them silently;
  // the caller is responsible for providing safe no-ops (with rationale comments
  // in the loader for /output/).
  const polygonCtx = {
    state,
    roomOverlay,
    outputRole,
    OUTPUT_ROLE_FINAL,
    OUTPUT_ROLE_CONTROL,
    triggerFeedback: feedbackEl,
    // boardAccess fields (read path on /output/, write path on dashboard)
    getBoard: boardAccess.getBoard,
    getBoards: boardAccess.getBoards,
    getRoomPolygonPoints: boardAccess.getRoomPolygonPoints,
    setRoomPolygonPoints: boardAccess.setRoomPolygonPoints,
    getShipPolygonPoints: boardAccess.getShipPolygonPoints,
    setShipPolygonPoints: boardAccess.setShipPolygonPoints,
    getPlayAreas: boardAccess.getPlayAreas,
    getRoomLabelPosition: boardAccess.getRoomLabelPosition,
    getSpecialRooms: boardAccess.getSpecialRooms,
    getRoomPoints: boardAccess.getRoomPoints,
    // polygonState
    getCurrentPolygonHandleScale: polygonState.getCurrentPolygonHandleScale,
    getActivePolygonRoomId: polygonState.getActivePolygonRoomId,
    setActivePolygonRoomId: polygonState.setActivePolygonRoomId,
    isRoomFrozen: polygonState.isRoomFrozen,
    getPolygonEditorHandleMetrics: polygonState.getPolygonEditorHandleMetrics,
    arePlayAreaVerticesEditable: polygonState.arePlayAreaVerticesEditable,
    getSelectedPlayAreaId: polygonState.getSelectedPlayAreaId,
    getBoardZoom: polygonState.getBoardZoom,
    // normalizers
    normalizeShipPolygon: normalizers.normalizeShipPolygon,
    normalizePolygonPoint: normalizers.normalizePolygonPoint,
    remapGridPoint: normalizers.remapGridPoint,
    hasGridDisplacements: normalizers.hasGridDisplacements,
    // interactions
    mapClientPointToNormalized: interactions.mapClientPointToNormalized,
    beginPolygonDragInteraction: interactions.beginPolygonDragInteraction,
    endPolygonDragInteraction: interactions.endPolygonDragInteraction,
    isPanArbitrating: interactions.isPanArbitrating,
    isAcceptablePolygonPointerEvent: interactions.isAcceptablePolygonPointerEvent,
    areRoomVerticesEditable: interactions.areRoomVerticesEditable,
    setPlayAreaPolygon: interactions.setPlayAreaPolygon,
    cacheRoomPolygonDragDomRefs: dashboard.cacheRoomPolygonDragDomRefs || (() => {}),
    cacheShipPolygonDragDomRefs: dashboard.cacheShipPolygonDragDomRefs || (() => {}),
    // persistence
    persistBoardProfiles: persistence.persistBoardProfiles || (() => {}),
    pushUndoState: persistence.pushUndoState || (() => {}),
    saveProjectionMapping: persistence.saveProjectionMapping || (() => {}),
    // dashboard-only (no-op on /output/ with rationale)
    handleQuickModeRoomTap: dashboard.handleQuickModeRoomTap
      || ((/* roomId */) => { /* no-op on /output/: quick-mode is dashboard-only */ }),
    applyRoomDraftTargetFromRoomClick: dashboard.applyRoomDraftTargetFromRoomClick
      || ((/* roomId */) => { /* no-op on /output/: settings panel is dashboard-only */ }),
    isQuickModeActive: dashboard.isQuickModeActive || (() => false),
    // sync (dashboard panels) — no-ops on /output/
    syncShipPolygonEditorStatus: sync.syncShipPolygonEditorStatus || (() => {}),
    syncShipPolygonVertexSelect: sync.syncShipPolygonVertexSelect || (() => {}),
    syncPolygonVertexSelect: sync.syncPolygonVertexSelect || (() => {}),
    syncPolygonEdgeSelect: sync.syncPolygonEdgeSelect || (() => {}),
    syncPolygonEditorStatus: sync.syncPolygonEditorStatus || (() => {}),
    syncPolygonEditorPanel: sync.syncPolygonEditorPanel || (() => {}),
    syncRoomPanelFromSelection: sync.syncRoomPanelFromSelection || (() => {}),
    syncSelectedRoomStateForBoard: sync.syncSelectedRoomStateForBoard || (() => {}),
    refreshPersistentRoomSelectionVisualState: sync.refreshPersistentRoomSelectionVisualState || (() => {}),
    // callbacks
    renderRoomOverlay: renderRoomOverlay
      || (() => POLYGON_EDITOR.renderRoomOverlay?.()),
    showToast: showToast || ((...args) => logger?.log?.(_LOG_PREFIX, "toast:", ...args)),
    polygonContract,
  };

  // ── Build the MAPPING.init dep-bag ──
  // MAPPING.init fans out into grid-state, gl-renderer, 2d-fallback, handle-ui,
  // profile-persistence. Pass the new liveSyncCoreOverride so grid-state picks it up.
  const mappingDeps = {
    stage,
    roomOverlay,
    videoEl,
    state,
    outputRole,
    OUTPUT_ROLE_FINAL,
    OUTPUT_ROLE_CONTROL,
    getRenderMode,
    getBoardId,
    liveSyncCoreOverride,         // NEW for Phase 36 — grid-state reads this
    alignModeDirtyEndpoint,        // NEW for Phase 36 — profile-persistence reads this if supplied
    logger,
    // Polygon data accessors (handle-ui consumes these via mapping fan-out)
    boardAccess,
    polygonState,
    normalizers,
    interactions,
    persistence,
    feedbackEl,
  };

  try {
    MAPPING.init(mappingDeps);
  } catch (err) {
    logger?.error?.(`${_LOG_PREFIX} MAPPING.init threw:`, err?.message || err);
    throw err;
  }

  try {
    POLYGON_EDITOR.init(polygonCtx);
  } catch (err) {
    logger?.error?.(`${_LOG_PREFIX} POLYGON_EDITOR.init threw:`, err?.message || err);
    throw err;
  }

  // ── liveSync subscriptions ──
  let _offAlignModeChange = null;
  let _offProjectionProfileChange = null;
  try {
    _offAlignModeChange = liveSync.onAlignModeChange?.((on) => {
      try {
        document.body?.classList?.toggle("align-mode-active", Boolean(on));
        HANDLE_UI.showHandles?.(Boolean(on));
        polygonCtx.renderRoomOverlay?.();
      } catch (err) {
        logger?.warn?.(`${_LOG_PREFIX} onAlignModeChange handler threw:`, err?.message || err);
      }
    });
    _offProjectionProfileChange = liveSync.onProjectionProfileChange?.((profileId) => {
      try {
        MAPPING.reloadProfile?.(profileId);
        polygonCtx.renderRoomOverlay?.();
      } catch (err) {
        logger?.warn?.(`${_LOG_PREFIX} onProjectionProfileChange handler threw:`, err?.message || err);
      }
    });
  } catch (err) {
    logger?.warn?.(`${_LOG_PREFIX} liveSync subscription failed:`, err?.message || err);
  }

  // Initial alignMode toggle (if liveSync already shows alignMode=true at boot time)
  try {
    if (liveSync.getAlignMode?.()) {
      document.body?.classList?.add("align-mode-active");
      HANDLE_UI.showHandles?.(true);
      polygonCtx.renderRoomOverlay?.();
    }
  } catch (err) {
    logger?.warn?.(`${_LOG_PREFIX} initial alignMode probe failed:`, err?.message || err);
  }

  // ── Window resize (handles re-render on viewport change) ──
  const _onResize = () => {
    try { HANDLE_UI.onResize?.(); } catch (err) { logger?.warn?.(`${_LOG_PREFIX} resize:`, err?.message || err); }
  };
  window.addEventListener("resize", _onResize, { passive: true });

  // ── Returned handle ──
  function stop() {
    try { _offAlignModeChange?.(); } catch (e) {}
    try { _offProjectionProfileChange?.(); } catch (e) {}
    try { window.removeEventListener("resize", _onResize); } catch (e) {}
    try { HANDLE_UI.showHandles?.(false); } catch (e) {}
    try { document.body?.classList?.remove("align-mode-active"); } catch (e) {}
    try { HANDLE_UI.teardown?.(); } catch (e) {}
    logger?.log?.(`${_LOG_PREFIX} stopped`);
  }

  function hitTestVertex(clientX, clientY) {
    try {
      return HANDLE_UI.hitTestVertex?.(clientX, clientY) ?? null;
    } catch (err) {
      logger?.warn?.(`${_LOG_PREFIX} hitTestVertex:`, err?.message || err);
      return null;
    }
  }

  return { stop, hitTestVertex };
}
```

Document at top of file: file is loaded via `<script type="module">` from output-align-mode-loader.js (A2 wires this).
  </action>
  <verify>
    <automated>node --test test/phase-36-boot-handle-ui-shape.test.mjs 2>&1 | grep -E "^# (pass|fail)"</automated>
    Expected output: `# pass 3` and `# fail 0` (RED→GREEN flip — bootHandleUi exists, returns {stop, hitTestVertex}, throws on missing args)
  </verify>
  <acceptance_criteria>
    - File `src/app/runtime/output-receiver/boot-handle-ui.js` exists with `wc -l` ≥ 200
    - File contains the literal string `export function bootHandleUi(` (named export)
    - File contains the literal `liveSyncCoreOverride` (passed to MAPPING.init mappingDeps)
    - File contains the literal `MAPPING.init` AND `POLYGON_EDITOR.init` (both called)
    - File contains the literal `onAlignModeChange` AND `onProjectionProfileChange` (subscriptions)
    - File contains the literal `hitTestVertex` (returned shape)
    - `node --test test/phase-36-boot-handle-ui-shape.test.mjs 2>&1 | grep -cE "^# pass [3-9]"` returns 1 (3+ passes)
    - `node --test test/phase-36-boot-handle-ui-shape.test.mjs 2>&1 | grep -cE "^# fail 0"` returns 1 (zero failures)
    - File can be parsed as ES module: `node -e "import('./src/app/runtime/output-receiver/boot-handle-ui.js').then(m=>console.log(typeof m.bootHandleUi)).catch(e=>{console.error(e.message);process.exit(1);})"` outputs `function`
    - No reference to `bootAlignMode` (the deprecated Phase 35-A entry — bootHandleUi is its successor)
    - File header comment includes `D-01` and `Option H` (audit traceability)
  </acceptance_criteria>
  <done>
    boot-handle-ui.js exists, exports bootHandleUi, its shape unit test goes GREEN, dashboard regression untouched (no changes to runtime-orchestration's existing inits in this task).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Add ?ctx-trace=1 runtime-trace harness to runtime-orchestration.js</name>
  <files>src/app/runtime/runtime-orchestration.js</files>
  <read_first>
    - .planning/phases/phase-36/36-RESEARCH.md §1.4 (full Proxy harness implementation + UAT script)
    - .planning/phases/phase-36/36-CONTEXT.md D-07 (ctx-inventur methodology)
    - src/app/runtime/runtime-orchestration.js (locate MAPPING.init at ~line 412 and POLYGON_EDITOR.init at ~line 1890; identify the dep-bag variable names being passed)
  </read_first>
  <behavior>
    - When URL has `?ctx-trace=1` query string: every `ctx.X` access on the dep-bags passed to MAPPING.init AND POLYGON_EDITOR.init is logged into `window._ctxTraceAccessed` Set.
    - `window._ctxTraceDump()` returns a sorted array of all accessed paths (e.g. `mapping.ctx.state.alignMode`, `polygon.ctx.state.polygonEditor.dragVertexIndex`).
    - When URL does NOT have the flag: dep-bags pass through UNCHANGED. Zero overhead, zero behavior change.
    - Dashboard regression intact — all existing init calls behave identically when flag absent.
    - Operator runs UAT per RESEARCH §1.4 sequence (15 interactions) and pastes `JSON.stringify(window._ctxTraceDump())` into a research-supplement note for cross-check against AST inventory.
  </behavior>
  <action>
Modify `src/app/runtime/runtime-orchestration.js`. Locate the section where MAPPING.init and POLYGON_EDITOR.init are called (per init context: lines ~412 and ~1890; verify with `grep -nE "MAPPING\.init|POLYGON_EDITOR\.init|TT_BEAMER_RUNTIME_PROJECTION_MAPPING\.init|TT_BEAMER_RUNTIME_POLYGON_EDITOR\.init" src/app/runtime/runtime-orchestration.js`).

**Step 1: Add the harness functions at module top (BEFORE the existing init flow):**

```js
// Phase 36 D-07 — ctx-trace harness (gated by ?ctx-trace=1 URL flag).
// When enabled, wraps the dep-bags passed to MAPPING.init and POLYGON_EDITOR.init
// with a Proxy that logs every property access to window._ctxTraceAccessed.
// Operator runs the dashboard UAT (15 align-mode interactions per RESEARCH §1.4)
// then dumps via window._ctxTraceDump() to validate the AST-based inventory.
const _ctxTraceEnabled = (typeof location !== "undefined") && /[?&]ctx-trace=1\b/.test(location.search || "");
if (_ctxTraceEnabled) {
  window._ctxTraceAccessed = new Set();
  window._ctxTraceDump = () => Array.from(window._ctxTraceAccessed).sort();
  console.log("[ctx-trace] enabled — exercise align-mode then call window._ctxTraceDump()");
}

function _wrapStateForTrace(state, label, accessed) {
  return new Proxy(state, {
    get(target, key) {
      if (typeof key === "string") accessed.add(`${label}.${key}`);
      const v = target[key];
      if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof HTMLElement)) {
        return _wrapStateForTrace(v, `${label}.${key}`, accessed);
      }
      return v;
    },
    set(target, key, val) {
      if (typeof key === "string") accessed.add(`${label}.${key}=`);
      target[key] = val;
      return true;
    },
  });
}

function _wrapCtxForTrace(ctx, label) {
  if (!_ctxTraceEnabled) return ctx;
  const accessed = window._ctxTraceAccessed;
  return new Proxy(ctx, {
    get(target, key) {
      if (typeof key === "string") accessed.add(`${label}.${key}`);
      const v = target[key];
      if (key === "state" && v && typeof v === "object") {
        return _wrapStateForTrace(v, `${label}.state`, accessed);
      }
      return v;
    },
    set(target, key, val) {
      if (typeof key === "string") accessed.add(`${label}.${key}=`);
      target[key] = val;
      return true;
    },
  });
}
```

**Step 2: Wrap the dep-bags at each init call site.**

Locate the existing call (example pattern; actual variable names may differ — read the file and use the local variable names verbatim):

```js
// CURRENT (Phase 35 + earlier):
window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING.init(mappingDepBag);
// or whatever local variable holds the deps.

// PHASE 36 A1:
window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING.init(_wrapCtxForTrace(mappingDepBag, "mapping.ctx"));
```

And similarly:

```js
// CURRENT:
window.TT_BEAMER_RUNTIME_POLYGON_EDITOR.init(polygonCtx);

// PHASE 36 A1:
window.TT_BEAMER_RUNTIME_POLYGON_EDITOR.init(_wrapCtxForTrace(polygonCtx, "polygon.ctx"));
```

When `_ctxTraceEnabled` is false, `_wrapCtxForTrace` returns the original `ctx` reference — zero overhead.

**Step 3: Verify dashboard regression.** No existing logic is modified; only the dep-bag is wrapped (transparently when flag absent). The existing init code paths remain.

**Step 4: Add a one-line console hint:** when the page loads with `?ctx-trace=1` and align-mode toggles, the harness silently records. Document this in a leading comment block.

**IMPORTANT:** Do NOT modify the dashboard's MAPPING.init or POLYGON_EDITOR.init body or the dep-bag CONTENTS — only wrap the deps with the optional Proxy at the call site. This is a non-breaking, additive change.
  </action>
  <verify>
    <automated>grep -c "_ctxTraceEnabled\|_wrapCtxForTrace" src/app/runtime/runtime-orchestration.js</automated>
    Expected output: ≥ 4 (declaration + use at MAPPING.init + use at POLYGON_EDITOR.init + helper function refs)
  </verify>
  <acceptance_criteria>
    - `grep -c "_ctxTraceEnabled" src/app/runtime/runtime-orchestration.js` returns ≥ 2 (declaration + at least one usage)
    - `grep -c "_wrapCtxForTrace" src/app/runtime/runtime-orchestration.js` returns ≥ 3 (function definition + 2 call-site wraps)
    - `grep -c "_wrapStateForTrace" src/app/runtime/runtime-orchestration.js` returns ≥ 2 (definition + recursive call from inside)
    - `grep -c "window._ctxTraceDump" src/app/runtime/runtime-orchestration.js` returns ≥ 1
    - `grep -nE "ctx-trace=1" src/app/runtime/runtime-orchestration.js` returns at least 1 match (URL flag check)
    - Existing MAPPING.init and POLYGON_EDITOR.init call STRUCTURE preserved — `grep -cE "TT_BEAMER_RUNTIME_PROJECTION_MAPPING\.init|TT_BEAMER_RUNTIME_POLYGON_EDITOR\.init" src/app/runtime/runtime-orchestration.js` returns the SAME count as before this task (verifiable by `git diff` — only the argument is wrapped, the call sites are unchanged)
    - Dashboard JS suite (post-task): `node --test test/phase-31-h43-eager-grid-apply.test.mjs test/phase-31-live-sync-apply-grid.test.mjs test/phase-32-boot-cleanup.test.mjs 2>&1 | grep -cE "^# fail 0"` returns 3 (no regression in init-related tests)
    - Connection-stability gate: `RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs' 2>&1 | grep -E "fail=" | head -1` shows `fail=0`
  </acceptance_criteria>
  <done>
    runtime-orchestration.js has the ?ctx-trace=1 harness; dashboard regression untouched; D-07 mechanism in place for operator UAT validation of the inventory.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Loader → bootHandleUi args | All callers are first-party (output-align-mode-loader.js + future runtime-orchestration.js); no untrusted input |
| Browser → /api/live/ws (emitLiveMutation) | Untrusted JSON payload; server validates via existing align-grid-snapshot validator (server.mjs:1138-1150) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-XSS-1 | Tampering | bootHandleUi callback args (renderRoomOverlay, showToast) | accept | Documented in module header: callers must pass trusted functions. No reflective execution. |
| T-DOS-1 | DoS | emitLiveMutation rate | accept | Existing 30Hz throttle in grid-state.broadcastGridSnapshot upstream of emitLiveMutation |
</threat_model>

<verification>
A1 wave closure gates:
- `node --test test/phase-36-boot-handle-ui-shape.test.mjs` → fail=0 (RED→GREEN flip)
- `node --test test/phase-35-output-live-sync.test.mjs` → fail=0 (no regression)
- `RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs'` → fail=0 (D-08 hard gate)
- `grep -c "<script[^>]*src=" output.html` ≤ 8 (D-09 budget — no change in A1)
- Dashboard regression: open `/`, toggle align-mode, drag a corner — dashboard handle-ui still functional (manual smoketest; full regression in V wave)
- `?ctx-trace=1` smoketest: open `/?ctx-trace=1`, toggle align-mode, run a drag, verify `window._ctxTraceDump()` returns a non-empty array
</verification>

<success_criteria>
- bootHandleUi exists and unit test GREEN
- emitLiveMutation method on output-live-sync.js
- liveSyncCoreOverride DI on grid-state.js (transparent when null)
- ?ctx-trace=1 harness exists; URL flag absent = zero overhead
- Dashboard runtime-orchestration.js init flow UNCHANGED in behavior (only Proxy-wrapping when flag set)
- D-08 connection-stability fail=0
- D-09 ≤8 src-based scripts (output.html unchanged in A1)
</success_criteria>

<output>
After completion, create `.planning/phases/phase-36/36-A1-SUMMARY.md` documenting:
- bootHandleUi signature delivered (full §2 args list)
- The exact lines added to grid-state.js for liveSyncCoreOverride DI
- The exact addition to output-live-sync.js for emitLiveMutation
- Confirmation that runtime-orchestration.js MAPPING.init / POLYGON_EDITOR.init call structure is preserved (only ctx-Proxy wrap added)
- D-08 fail=0 evidence
- Dashboard regression evidence (manual or test-based)
</output>
