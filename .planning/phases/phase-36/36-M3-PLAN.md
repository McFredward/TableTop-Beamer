---
phase: 36
plan: M3
type: execute
wave: 3
depends_on: [A2]
files_modified:
  - src/app/runtime/output-receiver/output-align-mode-loader.js
  - src/app/runtime/output-receiver/boot-handle-ui.js
  - src/app/runtime/runtime-orchestration.js
autonomous: true
requirements_addressed: [D-01, T1, T2, T10]
gap_closure: false
must_haves:
  truths:
    - "T1 (handle-frame sizing matches video.ssr-video bbox within 4px) PASSES on /output/"
    - "T2 (4 corner handles emit ≥4 align-grid-snapshot mutations) PASSES on /output/"
    - "T10 (no input-forwarder firing during align-mode-on drag; exactly 1 grid-snapshot, 0 corner-drag) PASSES on /output/"
    - "Dashboard regression: runtime-orchestration.js refactored to call bootHandleUi (M3-LATE step). test_phase35_dashboard_alignmode.py timeout-failure flips GREEN by virtue of dashboard now using the same bootHandleUi path."
    - "Connection-stability fail=0 preserved (D-08)"
    - "output.html ≤8 src-based scripts (D-09 grep gate preserved)"
    - "T3-T9 still RED (M4-M5's responsibility); T1+T2+T10 GREEN-only flip in M3"
  artifacts:
    - path: "src/app/runtime/output-receiver/boot-handle-ui.js"
      provides: "Sizing wiring (handle-frame to video bbox) + corner-pull broadcast path complete"
      contains: "videoEl"
    - path: "src/app/runtime/output-receiver/output-align-mode-loader.js"
      provides: "Boot-time sizing trigger after video first-frame; resize listener bridge"
      contains: "videoEl.addEventListener"
    - path: "src/app/runtime/runtime-orchestration.js"
      provides: "Dashboard MAPPING.init + POLYGON_EDITOR.init replaced with bootHandleUi(...) — single source of truth"
      contains: "bootHandleUi"
  key_links:
    - from: "boot-handle-ui.js videoEl bbox"
      to: "MAPPING.init resizeHandles + handle-ui showHandles"
      via: "videoEl.getBoundingClientRect() at boot + on video resize event"
      pattern: "getBoundingClientRect"
    - from: "/output/ corner drag onPointerUp"
      to: "broadcastGridSnapshot → emitLiveMutation → ws.send → server [align-grid-snapshot] server-recv stdout"
      via: "grid-state liveSyncCoreOverride routing (A1 wired)"
      pattern: "align-grid-snapshot"
    - from: "runtime-orchestration.js bootHandleUi(...)"
      to: "MAPPING.init AND POLYGON_EDITOR.init (now wrapped inside bootHandleUi instead of called directly)"
      via: "M3-LATE dashboard migration step"
      pattern: "bootHandleUi"
threat_model:
  threats:
    - id: T-DASH-1
      title: "Dashboard regression from M3-LATE migration"
      stride: DoS
      asvs: V11
      severity: medium
      description: "Refactoring dashboard's MAPPING.init + POLYGON_EDITOR.init into a single bootHandleUi call risks breaking existing dashboard align-mode UX"
      existing_mitigation: "test_phase35_dashboard_alignmode.py + Phase 36 dashboard parity test gate the migration"
      new_mitigation: "M3-LATE migration is the LAST task of M3; if any dashboard parity test fails, revert the dashboard call site only (loader stays on bootHandleUi). Phase 36 thin-/output/ keeps working independently."
---

<objective>
Wire T1 (sizing alignment) and T2 (corner pulls) on /output/, then complete the dashboard migration by replacing runtime-orchestration.js's MAPPING.init + POLYGON_EDITOR.init pair with a single `bootHandleUi(...)` call (M3-LATE step). This is the first wave that flips RED→GREEN for any of the T1-T10 rails.

Per RESEARCH §9: M3 is sequential with M4 + M5 (no parallelization). Per RESEARCH §10: M3 modifies boot-handle-ui.js + output-align-mode-loader.js + runtime-orchestration.js (M3-LATE).

Per RESEARCH §2 dashboard-migration risk-mitigation: M3-LATE comes AFTER /output/ T1+T2 are GREEN — that way if dashboard regression test breaks, the /output/ work is already locked in.

Purpose: First implementation wave. Establishes that bootHandleUi delivers visible handles aligned to the video, and that corner pulls flow through to server stdout via the new emitLiveMutation broadcast path.

Output: T1 + T2 + T10 GREEN. Dashboard regression test (Phase 35 W0) flips GREEN. T3-T9 still RED (M4-M5 work).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-36/36-CONTEXT.md
@.planning/phases/phase-36/36-RESEARCH.md
@.planning/phases/phase-36/36-A1-SUMMARY.md
@.planning/phases/phase-36/36-A2-SUMMARY.md
@src/app/runtime/output-receiver/boot-handle-ui.js
@src/app/runtime/output-receiver/output-align-mode-loader.js
@src/app/runtime/viewport/runtime-projection-handle-ui.js
@src/app/runtime/viewport/runtime-projection-mapping.js
@src/app/runtime/viewport/runtime-projection-grid-state.js
@src/app/runtime/runtime-orchestration.js
@test/live-e2e/test_phase36_align_handles.py
@test/live-e2e/test_phase35_dashboard_alignmode.py

<interfaces>
<!-- HANDLE_UI methods relevant to T1 sizing -->
From window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI (handle-ui.js IIFE):
```js
{
  showHandles(on: boolean): void,    // mounts/unmounts handle DOM elements
  hitTestVertex(cx, cy): {row, col} | null,
  onResize(): void,                  // re-runs the bbox math, repositions handles
  teardown(): void,
  // Other internal methods (subscribed via init dep-bag, NOT directly invoked from outside)
}
```

<!-- T1 mechanism: handle-ui's showHandles uses videoEl bbox via mapping.init dep -->
The videoEl bbox is read by handle-ui INSIDE its rebuild logic. The rebuild
runs on `MAPPING.init` and on subsequent `MAPPING.notifyResize?.()` (or equivalent).
For /output/, the videoEl arrives AFTER align-mode toggles ON because video starts
playing before align-mode is engaged BUT the loader's videoEl ref captures it
at bootHandleUi-call-time. If video resizes (window resize, fullscreen toggle),
HANDLE_UI.onResize() must be called.

<!-- T2 mechanism: drag → broadcastGridSnapshot → liveSyncCoreOverride.emitLiveMutation → ws.send -->
A1 wired liveSyncCoreOverride DI in grid-state.broadcastGridSnapshot.
A2 wired loader to pass liveSyncCoreOverride: { emitLiveMutation: liveSync.emitLiveMutation }.
M3 verifies the path end-to-end with T2.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Wire T1 (sizing) — videoEl bbox tracking + window resize bridge in bootHandleUi/loader</name>
  <files>
    - src/app/runtime/output-receiver/boot-handle-ui.js
    - src/app/runtime/output-receiver/output-align-mode-loader.js
  </files>
  <read_first>
    - src/app/runtime/output-receiver/boot-handle-ui.js (the file from A1 — locate the existing window.addEventListener("resize", _onResize) block)
    - src/app/runtime/output-receiver/output-align-mode-loader.js (the file from A2 — the bootHandleUi call site)
    - src/app/runtime/viewport/runtime-projection-handle-ui.js (find HANDLE_UI's resize/rebuild handler and bbox-read code)
    - src/app/runtime/viewport/runtime-projection-mapping.js (locate any "resize" / "notifyResize" / "rebuildHandles" exposed method)
    - test/live-e2e/test_phase36_align_handles.py::test_t1_handle_frame_matches_stream_content (the GREEN target)
  </read_first>
  <behavior>
    - When `bootHandleUi` is called, AFTER MAPPING.init + POLYGON_EDITOR.init complete, the handle frame is positioned using `videoEl.getBoundingClientRect()`. Since handle-ui IIFE already does this internally via the dep-bag, M3 ensures: (a) videoEl reference is non-null at boot time, (b) a resize-bridge calls HANDLE_UI.onResize on video resize event AND on window resize.
    - Loader: registers `videoEl.addEventListener("loadedmetadata", ...)` and `videoEl.addEventListener("resize", ...)` to call `HANDLE_UI.onResize()`. This handles late-arriving video dimensions (HLS/WebRTC frames).
    - Loader: also wires a ResizeObserver on the videoEl (modern API, supported by system Chrome) for layout-driven size changes.
    - bootHandleUi's existing `_onResize` (window resize) is preserved.
    - When video bbox changes for any reason → handle-frame snaps to the new bbox within one rAF.
    - T1 expectation: handle-frame's TL/TR/BL/BR center-of-handle bboxes are within 4px of `video.ssr-video` left/top/right/bottom. This is achieved by handle-ui's existing internal logic; M3 just keeps the resize plumbing healthy.
  </behavior>
  <action>
**Sub-task 1a — Modify `src/app/runtime/output-receiver/output-align-mode-loader.js`:**

After the bootHandleUi call (where `_currentBootHandle = bootHandleUi({...})` was added in A2), append video-resize wiring:

```js
// Phase 36 M3 T1 — wire videoEl resize/loadedmetadata to HANDLE_UI.onResize
// so the handle-frame snaps to the stream-content bbox even when the video
// element's intrinsic dimensions arrive late (WebRTC track first frame).
const HANDLE_UI = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
const _videoResize = () => {
  try {
    HANDLE_UI?.onResize?.();
    // Also notify polygon-editor — renderRoomOverlay re-runs polygon-points
    // recomputation on next paint
    window.TT_BEAMER_RUNTIME_POLYGON_EDITOR?.renderRoomOverlay?.();
  } catch (err) {
    console.warn("[loader] _videoResize threw:", err?.message || err);
  }
};
let _videoResizeObserver = null;
if (videoEl) {
  videoEl.addEventListener("loadedmetadata", _videoResize, { passive: true });
  videoEl.addEventListener("resize", _videoResize, { passive: true });
  if (typeof ResizeObserver !== "undefined") {
    _videoResizeObserver = new ResizeObserver(_videoResize);
    _videoResizeObserver.observe(videoEl);
  }
  // One immediate resize after bootHandleUi to align with current video bbox
  requestAnimationFrame(_videoResize);
}

// Wire teardown to remove video listeners on alignMode-OFF (extends the
// existing `if (!on && _currentBootHandle) { ... }` block):
function _teardownVideoResize() {
  if (videoEl) {
    try { videoEl.removeEventListener("loadedmetadata", _videoResize); } catch (e) {}
    try { videoEl.removeEventListener("resize", _videoResize); } catch (e) {}
  }
  try { _videoResizeObserver?.disconnect(); } catch (e) {}
  _videoResizeObserver = null;
}
// In the alignMode=false branch, call _teardownVideoResize() before nulling _currentBootHandle.
```

**Sub-task 1b — Modify `src/app/runtime/output-receiver/boot-handle-ui.js`:**

Inside bootHandleUi's existing flow, AFTER `POLYGON_EDITOR.init(polygonCtx)` returns, add a one-rAF re-render to flush handle positioning before the operator interacts:

```js
// Phase 36 M3 T1 — initial alignment pass after init completes
requestAnimationFrame(() => {
  try {
    HANDLE_UI.onResize?.();
    polygonCtx.renderRoomOverlay?.();
  } catch (err) {
    logger?.warn?.(`${_LOG_PREFIX} initial align pass threw:`, err?.message || err);
  }
});
```

(This is in addition to the existing `window.addEventListener("resize", _onResize, ...)` from A1.)

**Sub-task 1c — Verify HANDLE_UI exposes onResize:**

Run `grep -nE "onResize|notifyResize|rebuildHandles" src/app/runtime/viewport/runtime-projection-handle-ui.js`. If the IIFE registers `onResize` on `window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI`, no further change needed. If it registers under a different name (e.g. `repositionHandles`, `notifyVideoResize`), use that name in both files (loader and bootHandleUi). Document the chosen name in the M3 SUMMARY.

If HANDLE_UI does NOT expose any external resize method:
1. Add a method to handle-ui's IIFE return: `onResize: () => { /* re-compute bbox + reposition */ }` (delegating to the existing internal rebuild function — find via `grep -nE "rebuildHandle|repositionHandle|recomputeBbox" src/app/runtime/viewport/runtime-projection-handle-ui.js`).
2. This change is internal to handle-ui — does not impact dashboard's existing dep-bag.
  </action>
  <verify>
    <automated>pytest test/live-e2e/test_phase36_align_handles.py::test_t1_handle_frame_matches_stream_content -v 2>&1 | tail -10</automated>
    Expected: `1 passed` (T1 RED→GREEN flip)
  </verify>
  <acceptance_criteria>
    - `pytest test/live-e2e/test_phase36_align_handles.py::test_t1_handle_frame_matches_stream_content -v 2>&1 | grep -cE "1 passed"` returns 1
    - `grep -c "loadedmetadata" src/app/runtime/output-receiver/output-align-mode-loader.js` returns ≥ 1 (videoEl resize listener added)
    - `grep -c "ResizeObserver" src/app/runtime/output-receiver/output-align-mode-loader.js` returns ≥ 1
    - `grep -c "onResize\|requestAnimationFrame" src/app/runtime/output-receiver/boot-handle-ui.js` returns ≥ 2 (initial align pass + window resize)
    - HANDLE_UI exposes a public `onResize` (or equivalent — verified by `grep -nE "onResize:" src/app/runtime/viewport/runtime-projection-handle-ui.js`)
    - Existing JS unit tests pass: `node --test test/phase-31-h43-eager-grid-apply.test.mjs test/phase-32-boot-cleanup.test.mjs 2>&1 | grep -cE "^# fail 0"` returns 2
    - Connection-stability fail=0
    - T2 may be flipping incidentally — log it but do NOT count it as M3 Task-1 acceptance
  </acceptance_criteria>
  <done>
    T1 GREEN. videoEl bbox flows into handle-frame positioning via HANDLE_UI.onResize on loadedmetadata + ResizeObserver + window resize.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Verify T2 (corner pulls broadcast align-grid-snapshot) and T10 (no dual-path conflict) — confirm broadcast plumbing end-to-end</name>
  <files>
    - src/app/runtime/output-receiver/boot-handle-ui.js
    - src/app/runtime/output-receiver/output-align-mode-loader.js
  </files>
  <read_first>
    - src/app/runtime/viewport/runtime-projection-grid-state.js (broadcastGridSnapshot — confirm liveSyncCoreOverride is read AND used by the post-A1 code path)
    - src/app/runtime/output-receiver/output-live-sync.js (emitLiveMutation — verify ws envelope correctness)
    - test/live-e2e/test_phase36_align_handles.py::test_t2_corner_pulls_emit_align_grid_snapshot (the GREEN target)
    - test/live-e2e/test_phase36_align_handles.py::test_t10_no_duplicate_mutations (the GREEN target)
    - server.mjs lines 1138-1280 (align-grid-snapshot validator + log line)
  </read_first>
  <behavior>
    - T2: drag each of 4 corner handles 20px right+down → server stdout contains `[align-grid-snapshot] server-recv` ≥ 4 times.
    - T10: drag handle once → server stdout contains EXACTLY 1 `[align-grid-snapshot] server-recv` AND ZERO `[align-drag] received phase=start` AND ZERO `[input-forwarder] sent phase=start` console messages.
    - Both tests rely on: (a) handle-ui drag end → grid-state.broadcastGridSnapshot → emitLiveMutation → ws.send → server validates → server logs. The full chain was wired in A1+A2; M3 Task 2 ONLY VERIFIES (no new code if A1+A2 were correct) AND ADDS small fixes if any link is broken.
    - If a payload-shape mismatch surfaces between client (broadcastGridSnapshot's payload) and server (align-grid-snapshot validator at server.mjs:1138-1150), update the CLIENT payload to match (server is authoritative).
  </behavior>
  <action>
**Step 1: Run T2 + T10 in isolation.**

```
pytest test/live-e2e/test_phase36_align_handles.py::test_t2_corner_pulls_emit_align_grid_snapshot -v
pytest test/live-e2e/test_phase36_align_handles.py::test_t10_no_duplicate_mutations -v
```

**If both PASS:** T2/T10 already work end-to-end via A1+A2 plumbing. No M3 code changes needed. Skip to verification.

**If T2 FAILS with "expected ≥4 align-grid-snapshot, got 0":** broadcast path broken. Diagnose:
1. Open browser devtools console (Playwright: `page.on("console", lambda m: print(m.text))` in a temp test).
2. Look for `[output-live-sync] emitLiveMutation skipped — ws not OPEN` → ws not yet open at drag time → FIX: in loader, await `liveSync.onConnect(...)` before bootHandleUi-launching, OR rely on retry — the existing handle-ui drag-end runs ws-send opportunistically.
3. Look for `[grid-state] no liveSyncCore — drop snapshot` → liveSyncCoreOverride not threading through. FIX: verify in `output-align-mode-loader.js` that `liveSyncCoreOverride: { emitLiveMutation: liveSync.emitLiveMutation }` is passed (A2 acceptance criterion); if `liveSync.emitLiveMutation` is `undefined`, the A1 method addition was incomplete — return to A1 SUMMARY and verify.
4. Look for server-side `400 align-grid-snapshot validator rejected payload` → payload shape mismatch. FIX: read server.mjs validator + grid-state's broadcastGridSnapshot payload, align fields exactly. The validator expects: `{ profileId, points: [{row, col, x, y, srcX, srcY}, ...], cornerTL, cornerBR, ... }` — confirm by reading server.mjs:1138-1150.

**If T10 FAILS with "expected 0 align-corner-drag, got >0":** receiver-input-forwarder fired during drag → overlay pointer-events not "none". FIX: re-verify A2 Task 2 acceptance criteria — both occurrences of `overlayEl.style.pointerEvents = "none"` should be present in receiver-bootstrap.js.

**If T10 FAILS with "expected 1 align-grid-snapshot, got >1":** grid-state's throttle is bursting. FIX: confirm `_BROADCAST_MIN_INTERVAL_MS = 33` is intact in grid-state.js (no Phase 36 change should have removed it — RESEARCH §8 threat T-DOS-1 keeps existing throttle).

**Step 2: Add a console.debug line at boot in bootHandleUi for diagnostic visibility (one-line, harmless):**

```js
// Phase 36 M3 — boot trace for T2/T10 debugging visibility (single line)
logger?.log?.(`${_LOG_PREFIX} bootHandleUi(...) initialized — outputRole=${outputRole}, liveSyncCoreOverride=${Boolean(liveSyncCoreOverride)}, alignModeDirtyEndpoint=${alignModeDirtyEndpoint}`);
```

This appears in browser console; tests can capture it via `page.on("console", ...)` if any future debug needs it.

**Step 3: Run both tests again.** Document any non-trivial fixes in SUMMARY.

**Step 4: Run T1 again** to ensure Task 1's GREEN didn't regress.
  </action>
  <verify>
    <automated>pytest test/live-e2e/test_phase36_align_handles.py::test_t2_corner_pulls_emit_align_grid_snapshot test/live-e2e/test_phase36_align_handles.py::test_t10_no_duplicate_mutations -v 2>&1 | tail -10</automated>
    Expected: `2 passed` (T2 + T10 RED→GREEN flip)
  </verify>
  <acceptance_criteria>
    - `pytest test/live-e2e/test_phase36_align_handles.py::test_t2_corner_pulls_emit_align_grid_snapshot test/live-e2e/test_phase36_align_handles.py::test_t10_no_duplicate_mutations -v 2>&1 | grep -cE "2 passed"` returns 1
    - T1 still passes (regression check): `pytest test/live-e2e/test_phase36_align_handles.py::test_t1_handle_frame_matches_stream_content -v 2>&1 | grep -cE "1 passed"` returns 1
    - Connection-stability fail=0
    - T3-T9 still RED: `pytest test/live-e2e/test_phase36_align_handles.py::test_t3_vertex_drag_modifies_correct_vertex -v 2>&1 | grep -cE "FAILED|TimeoutError"` returns ≥ 1 (M4 will flip)
  </acceptance_criteria>
  <done>
    T2 + T10 GREEN. Broadcast plumbing verified end-to-end: drag → grid-state.broadcastGridSnapshot → emitLiveMutation → ws.send → server log.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: M3-LATE — Migrate dashboard runtime-orchestration.js to call bootHandleUi (replace MAPPING.init + POLYGON_EDITOR.init pair)</name>
  <files>src/app/runtime/runtime-orchestration.js</files>
  <read_first>
    - src/app/runtime/runtime-orchestration.js (the file from A1 with ?ctx-trace=1 harness — locate the EXISTING MAPPING.init at ~line 412 and POLYGON_EDITOR.init at ~line 1890, plus the variable names of dep-bags)
    - .planning/phases/phase-36/36-RESEARCH.md §2 (dashboard migration risk-mitigation note + "additive, no breaking change")
    - test/live-e2e/test_phase35_dashboard_alignmode.py (the test that should flip GREEN)
    - test/live-e2e/test_phase36_dashboard_parity.py (the parametrized parity rail — 6 tests should flip GREEN incrementally)
    - src/app/runtime/output-receiver/boot-handle-ui.js (the function to import)
  </read_first>
  <behavior>
    - Dashboard's existing two-call init (MAPPING.init at ~line 412, POLYGON_EDITOR.init at ~line 1890) is REPLACED with a SINGLE `bootHandleUi(...)` call.
    - All variables previously passed to MAPPING.init are mapped to the corresponding bootHandleUi named arg.
    - All variables previously passed to POLYGON_EDITOR.init are mapped to bootHandleUi's polygon* args.
    - `liveSyncCoreOverride` arg is `null` for dashboard (preserves existing window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE fallback in grid-state).
    - `alignModeDirtyEndpoint` is `"/api/align-mode-dirty"`.
    - Dashboard's render functions (`renderRoomOverlay`, `showToast`, `getRenderMode`, `getBoardId`) are passed through verbatim from existing dashboard code.
    - The `?ctx-trace=1` harness from A1 still works — bootHandleUi's args are wrapped via `_wrapCtxForTrace` IF the flag is set (the harness wraps the dep-bag passed to MAPPING.init INSIDE bootHandleUi; the wrap call must move INTO bootHandleUi or be replicated at the bootHandleUi call site).
    - Dashboard regression: `test_phase35_dashboard_alignmode.py` (which times out today on `wait_for_function('.projection-corner-handle')`) flips GREEN.
    - Dashboard parity rail: `test_phase36_dashboard_parity.py` paths `[/]` for T2/T7/T8 should flip GREEN. The `/output/` paths still depend on M5 for T7/T8 — only T2[/output/] should flip in M3.
  </behavior>
  <action>
**Step 1: Locate the existing two init calls** (RESEARCH §2 dashboard-migration: "lines 412-437 (MAPPING.init) and 1890-1951 (POLYGON_EDITOR.init)"). Use grep:

```
grep -nE "TT_BEAMER_RUNTIME_PROJECTION_MAPPING\.init|TT_BEAMER_RUNTIME_POLYGON_EDITOR\.init" src/app/runtime/runtime-orchestration.js
```

Read lines around the matches to understand the local variable names (e.g. `mappingDepBag`, `polygonCtx`, etc.).

**Step 2: Construct the bootHandleUi call.** The signature accepts grouped objects. The dashboard's existing dep-bags need to be re-grouped:

```js
import { bootHandleUi } from "/src/app/runtime/output-receiver/boot-handle-ui.js";

// REPLACE the existing two init calls with:
const _bootHandleUiArgs = {
  // DOM roots — read from dashboard's existing DOM
  stage: document.getElementById("stage"),
  roomOverlay: document.getElementById("room-overlay"),
  videoEl: null,                            // dashboard has no video
  feedbackEl: document.getElementById("triggerFeedback") || null,
  // State + role
  state: state,                             // dashboard's existing state object
  outputRole: ctx.outputRole,               // re-use existing ctx field
  OUTPUT_ROLE_FINAL: ctx.OUTPUT_ROLE_FINAL,
  OUTPUT_ROLE_CONTROL: ctx.OUTPUT_ROLE_CONTROL,
  // Live-sync — dashboard uses its own runtime-live-sync-core.js
  liveSync: dashboardLiveSync,              // whatever dashboard exposes today
  liveSyncCoreOverride: null,               // null → grid-state falls back to window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE (existing dashboard behavior)
  // Polygon data + normalizers — re-use existing dashboard ctx fields
  polygonContract: ctx.polygonContract || window.TT_BEAMER_RUNTIME_POLYGON_CONTRACT || null,
  normalizers: {
    normalizeShipPolygon: ctx.normalizeShipPolygon,
    normalizePolygonPoint: ctx.normalizePolygonPoint,
    remapGridPoint: ctx.remapGridPoint,
    hasGridDisplacements: ctx.hasGridDisplacements,
  },
  boardAccess: {
    getBoard: ctx.getBoard, getBoards: ctx.getBoards,
    getRoomPolygonPoints: ctx.getRoomPolygonPoints,
    setRoomPolygonPoints: ctx.setRoomPolygonPoints,
    getShipPolygonPoints: ctx.getShipPolygonPoints,
    setShipPolygonPoints: ctx.setShipPolygonPoints,
    getPlayAreas: ctx.getPlayAreas,
    getRoomLabelPosition: ctx.getRoomLabelPosition,
    getSpecialRooms: ctx.getSpecialRooms,
    getRoomPoints: ctx.getRoomPoints,
  },
  polygonState: {
    getCurrentPolygonHandleScale: ctx.getCurrentPolygonHandleScale,
    getActivePolygonRoomId: ctx.getActivePolygonRoomId,
    setActivePolygonRoomId: ctx.setActivePolygonRoomId,
    isRoomFrozen: ctx.isRoomFrozen,
    getPolygonEditorHandleMetrics: ctx.getPolygonEditorHandleMetrics,
    arePlayAreaVerticesEditable: ctx.arePlayAreaVerticesEditable,
    getSelectedPlayAreaId: ctx.getSelectedPlayAreaId,
    getBoardZoom: ctx.getBoardZoom,
  },
  interactions: {
    mapClientPointToNormalized: ctx.mapClientPointToNormalized,
    beginPolygonDragInteraction: ctx.beginPolygonDragInteraction,
    endPolygonDragInteraction: ctx.endPolygonDragInteraction,
    isPanArbitrating: ctx.isPanArbitrating,
    isAcceptablePolygonPointerEvent: ctx.isAcceptablePolygonPointerEvent,
    areRoomVerticesEditable: ctx.areRoomVerticesEditable,
    setPlayAreaPolygon: ctx.setPlayAreaPolygon,
  },
  persistence: {
    persistBoardProfiles: ctx.persistBoardProfiles,
    pushUndoState: ctx.pushUndoState,
    saveProjectionMapping: ctx.saveProjectionMapping,
  },
  alignModeDirtyEndpoint: "/api/align-mode-dirty",
  sync: {
    syncShipPolygonEditorStatus: ctx.syncShipPolygonEditorStatus,
    syncShipPolygonVertexSelect: ctx.syncShipPolygonVertexSelect,
    syncPolygonVertexSelect: ctx.syncPolygonVertexSelect,
    syncPolygonEdgeSelect: ctx.syncPolygonEdgeSelect,
    syncPolygonEditorStatus: ctx.syncPolygonEditorStatus,
    syncPolygonEditorPanel: ctx.syncPolygonEditorPanel,
    syncRoomPanelFromSelection: ctx.syncRoomPanelFromSelection,
    syncSelectedRoomStateForBoard: ctx.syncSelectedRoomStateForBoard,
    refreshPersistentRoomSelectionVisualState: ctx.refreshPersistentRoomSelectionVisualState,
  },
  dashboard: {
    handleQuickModeRoomTap: ctx.handleQuickModeRoomTap,
    applyRoomDraftTargetFromRoomClick: ctx.applyRoomDraftTargetFromRoomClick,
    isQuickModeActive: ctx.isQuickModeActive,
    cacheShipPolygonDragDomRefs: ctx.cacheShipPolygonDragDomRefs,
    cacheRoomPolygonDragDomRefs: ctx.cacheRoomPolygonDragDomRefs,
  },
  renderRoomOverlay: ctx.renderRoomOverlay,
  showToast: typeof showToast === "function" ? showToast : null,
  getRenderMode: ctx.getRenderMode || (() => state.renderMode || "auto"),
  getBoardId: () => state.boardId,
  logger: console,
};

// PRESERVE the ?ctx-trace=1 harness — wrap each grouped object before pass
// (since the Proxy from A1 wraps a top-level "ctx" — we need to wrap state and the polygonCtx-style bag).
// Simpler: leave the harness in place via _wrapCtxForTrace on the args.state.
// The harness already records state.X accesses recursively (A1 _wrapStateForTrace).
if (_ctxTraceEnabled) {
  _bootHandleUiArgs.state = _wrapStateForTrace(_bootHandleUiArgs.state, "dashboard.state", window._ctxTraceAccessed);
}

const _dashboardBootHandle = bootHandleUi(_bootHandleUiArgs);
// Dashboard does not unmount handles on align-mode-OFF the same way /output/ does;
// keep _dashboardBootHandle in scope for potential teardown if dashboard ever
// adds a "close projection" button. For now: bootHandleUi internally subscribes
// to liveSync.onAlignModeChange and toggles handles.
```

**Step 3: DELETE the old MAPPING.init and POLYGON_EDITOR.init call lines** (the originals). Surrounding code (state setup, dep-bag construction) is preserved. Only the two `.init(...)` lines + their immediate setup blocks (if entirely subsumed by bootHandleUi) are removed.

**Step 4: Run dashboard regression tests:**

```
pytest test/live-e2e/test_phase35_dashboard_alignmode.py -v
pytest 'test/live-e2e/test_phase36_dashboard_parity.py::test_t2_corner_pull_parity[/]' -v
```

Both should pass. If `test_phase35_dashboard_alignmode.py` still fails with `wait_for_function` timeout for `.projection-corner-handle`: bootHandleUi was not invoked or threw silently. Check console output via Playwright trace.

**Step 5: If dashboard regression FAILS after migration:**

Per RESEARCH §2 mitigation: revert ONLY the runtime-orchestration.js change. /output/ stays on bootHandleUi (loader path is independent). Document the dashboard-migration deferral in M3 SUMMARY and open a follow-up task. Phase 36 closure does NOT block on dashboard migration if /output/ tests T1-T10 are GREEN — RESEARCH §2 explicitly says dashboard-side migration is M3-LATE and risk-mitigated to be reversible.

In that case: leave MAPPING.init + POLYGON_EDITOR.init as the dashboard's path; mark the failure as a Phase 37 candidate or deferred-items entry.
  </action>
  <verify>
    <automated>pytest test/live-e2e/test_phase35_dashboard_alignmode.py 'test/live-e2e/test_phase36_dashboard_parity.py::test_t2_corner_pull_parity' -v 2>&1 | tail -15</automated>
    Expected: dashboard test passes; parametrized T2 [/] passes; T2 [/output/] passes (was GREEN from M3 Task 2)
  </verify>
  <acceptance_criteria>
    - Either: (a) `grep -c "bootHandleUi" src/app/runtime/runtime-orchestration.js` returns ≥ 2 (import + call), AND `grep -c "TT_BEAMER_RUNTIME_PROJECTION_MAPPING.init\|TT_BEAMER_RUNTIME_POLYGON_EDITOR.init" src/app/runtime/runtime-orchestration.js` returns 0 (legacy two-call pair removed) AND `pytest test/live-e2e/test_phase35_dashboard_alignmode.py -v 2>&1 | grep -cE "1 passed"` returns 1
    - OR: (b) M3-LATE deferred (dashboard migration reverted because regression failed): `grep -c "TT_BEAMER_RUNTIME_PROJECTION_MAPPING.init" src/app/runtime/runtime-orchestration.js` returns ≥ 1 (legacy retained), AND a deferred entry is created in `.planning/phases/phase-36/deferred-items.md` documenting the dashboard-migration deferral
    - In EITHER case: Phase 36 /output/ tests T1, T2, T10 stay GREEN
    - Connection-stability fail=0
    - `?ctx-trace=1` harness still operates: `grep -c "_wrapCtxForTrace\|_wrapStateForTrace" src/app/runtime/runtime-orchestration.js` returns ≥ 2 (preserved from A1)
  </acceptance_criteria>
  <done>
    Dashboard migration completed (path a) OR explicitly deferred with docs (path b). T1+T2+T10 on /output/ remain GREEN. Phase 35 dashboard regression test addressed (path a flips GREEN; path b documents deferral).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Dashboard refactor → existing dashboard align-mode UX | Refactor risk: changing call structure could break |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-DASH-1 | DoS / regression | runtime-orchestration.js single-bootHandleUi migration | mitigate | M3-LATE is the LAST step; if dashboard regression fails, revert ONLY runtime-orchestration.js (Path b) — /output/ stays GREEN |
| T-DOS-1 | DoS | broadcastGridSnapshot drag flood | accept | Existing 30Hz throttle preserved |
</threat_model>

<verification>
M3 wave closure gates:
- T1 GREEN: `pytest test/live-e2e/test_phase36_align_handles.py::test_t1_handle_frame_matches_stream_content -v` passes
- T2 GREEN: `pytest test/live-e2e/test_phase36_align_handles.py::test_t2_corner_pulls_emit_align_grid_snapshot -v` passes
- T10 GREEN: `pytest test/live-e2e/test_phase36_align_handles.py::test_t10_no_duplicate_mutations -v` passes
- T3-T9 still RED (M4-M5 work)
- Dashboard regression: either `test_phase35_dashboard_alignmode.py` GREEN (Path a) or formally deferred (Path b)
- T2[/], T2[/output/] parametrized parity: GREEN (T2 GREEN on both paths)
- `[ "$(grep -cE '<script[^>]*src=' output.html)" -le 8 ]` (D-09)
- Connection-stability fail=0 (D-08)
</verification>

<success_criteria>
- T1, T2, T10 RED→GREEN
- Dashboard migration handled (path a or b documented)
- D-08 + D-09 preserved
</success_criteria>

<output>
After completion, create `.planning/phases/phase-36/36-M3-SUMMARY.md` documenting:
- Exact T1+T2+T10 pass evidence (pytest output)
- Whether M3-LATE migration completed (Path a) or was deferred (Path b)
- If Path b: `.planning/phases/phase-36/deferred-items.md` updated with dashboard-migration entry
- D-08 fail=0 + D-09 ≤8 evidence
</output>
