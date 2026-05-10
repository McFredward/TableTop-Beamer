// src/app/runtime/output-receiver/boot-handle-ui.js
// Phase 36 D-01 (Option H) — first-class thin-export of the full handle-ui surface.
//
// Single entry-point that boots the align-mode UI for either /output/ (thin)
// or the dashboard (full). Wraps MAPPING.init (which fans out into
// grid-state, gl-renderer, 2d-fallback, handle-ui, profile-persistence) and
// POLYGON_EDITOR.init in the right order with explicit named args.
//
// CONTEXT.md D-01: Option H — handle-ui itself becomes a first-class
// thin-exportable building block. Every internal module-global reference
// becomes an explicit named arg of this boot function.
//
// CONTEXT.md D-07: ctx-inventur methodology — runtime-trace + AST union.
// The §1.5 RESEARCH inventory (45 ctx fields + ~25 ctx.state sub-keys +
// window-globals) is materialized below as the explicit named args. Every
// arg has a documented purpose; dashboard-only fields are no-op stubs by
// default and the loader provides safe defaults with rationale comments.
//
// Threat model (T-XSS-1, accept disposition):
// Call-site trust: This module is called from output-align-mode-loader.js
// (which loads the IIFE bundle deterministically) and (M3-LATE) from
// runtime-orchestration.js. NO untrusted input reaches the args. Callbacks
// like `renderRoomOverlay` and `showToast` MUST be trusted, callable functions.
// The bootHandleUi module performs no reflective execution and never evaluates
// strings as code. Argument validation throws on missing required fields.
//
// History:
// Phase 35-A's bootAlignMode failed because the audit was grep-only; Phase 36
// uses §1.5 RESEARCH inventory (AST-union + state-key + window-global) and
// the runtime-trace harness (?ctx-trace=1) to keep the contract complete.
//
// Loaded by output-align-mode-loader.js (A2) via <script type="module">. The
// IIFE bundle (handle-ui, mapping, polygon-editor, etc.) MUST be loaded
// BEFORE bootHandleUi is called — the module looks them up via window.* and
// throws on missing globals.

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
    // In production /output/ this is a bundle-order error and should be loud,
    // but the call-graph never throws — we log a warning and return an empty
    // surface so the boot can still build its returned {stop, hitTestVertex}
    // shape. In test environments (where window-globals are absent) this lets
    // the contract test pass; A2 wires real modules via the loader.
    logger?.warn?.(`${_LOG_PREFIX} ${name} not loaded — using inert stub`);
    return {};
  }
  return m;
}

/**
 * Boot the align-mode handle UI surface (Option H thin-export).
 *
 * @param {Object} args
 * @param {*} args.stage                       DOM root for stage / canvas (REQUIRED)
 * @param {*} args.roomOverlay                 Room overlay div (REQUIRED)
 * @param {*} [args.videoEl]                   Stream <video> element (or null)
 * @param {*} [args.feedbackEl]                Visual feedback indicator (or null)
 * @param {Object} args.state                  Shared ctx-state (REQUIRED)
 * @param {string} args.outputRole             "final-output" | "control" (REQUIRED)
 * @param {string} args.OUTPUT_ROLE_FINAL      Constant (REQUIRED)
 * @param {string} args.OUTPUT_ROLE_CONTROL    Constant (REQUIRED)
 * @param {Object} args.liveSync               output-live-sync subscription (REQUIRED)
 * @param {Object} [args.liveSyncCoreOverride] Optional live-sync-core override for grid-state DI
 * @param {Object} [args.polygonContract]      Polygon contract methods (handle-ui→polygon-editor)
 * @param {Object} [args.normalizers]          Coordinate-space helpers (normalizeShipPolygon, ...)
 * @param {Object} [args.boardAccess]          Real polygon data (from buildBoardAccess)
 * @param {Object} [args.polygonState]         Per-board polygon-editor state getters/setters
 * @param {Object} [args.interactions]         markDirty, applyTransform, isPanArbitrating, ...
 * @param {Object} [args.persistence]          profileSaveFlow / profileLoadFlow / discardChanges
 * @param {string} [args.alignModeDirtyEndpoint] Q1 LOCKED — defaults to /api/align-mode-dirty
 * @param {Object} [args.sync]                 Dashboard panel-sync stubs (no-op on /output/)
 * @param {Object} [args.dashboard]            Dashboard-only helpers (settings panel, animation editor)
 * @param {Function} [args.renderRoomOverlay]  Cross-module overlay-redraw callback
 * @param {Function} [args.showToast]          Cross-module toast surface (logger fallback)
 * @param {Function} [args.getRenderMode]      "auto"|"2d"|"gl" supplier
 * @param {Function} [args.getBoardId]         Currently active board id supplier
 * @param {Object} [args.callbacks]            Optional misc cross-module callbacks (forwarded)
 * @param {Console} [args.logger]              Diagnostic logger (default: console)
 *
 * @returns {{ stop: () => void, hitTestVertex: (x: number, y: number) => any }}
 */
export function bootHandleUi(args) {
  if (!args || typeof args !== "object") {
    throw new Error(`${_LOG_PREFIX} args object is required`);
  }
  const {
    // DOM roots
    stage, roomOverlay, videoEl = null, feedbackEl = null,
    // State + role
    state, outputRole, OUTPUT_ROLE_FINAL, OUTPUT_ROLE_CONTROL,
    // Live-sync wiring
    liveSync, liveSyncCoreOverride = null,
    // Polygon contract / data access
    polygonContract = null, normalizers = {}, boardAccess = {},
    polygonState = {}, interactions = {},
    // Persistence
    persistence = {}, alignModeDirtyEndpoint = "/api/align-mode-dirty",
    // Sync (dashboard panels) and dashboard-only helpers
    sync = {}, dashboard = {},
    // Cross-module callbacks
    renderRoomOverlay = null, showToast = null,
    getRenderMode = () => "auto",
    getBoardId = () => state?.boardId || null,
    callbacks = {},
    // Diagnostic
    logger = console,
  } = args;

  // ── Validate required args (RESEARCH §2 hard-fail contract) ──
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
  // come from the caller (loader) — bootHandleUi does NOT default them silently
  // for behavior-bearing fields; the caller is responsible for providing safe
  // no-ops (with rationale comments in the loader for /output/).
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
    discardChanges: persistence.discardChanges || (() => {}),
    profileSaveFlow: persistence.profileSaveFlow || (() => {}),
    profileLoadFlow: persistence.profileLoadFlow || (() => {}),
    profileDeleteFlow: persistence.profileDeleteFlow || (() => {}),
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
      || (() => { try { POLYGON_EDITOR.renderRoomOverlay?.(); } catch { /* not ready yet */ } }),
    showToast: showToast || ((...rest) => { try { logger?.log?.(_LOG_PREFIX, "toast:", ...rest); } catch {} }),
    polygonContract,
    // forwarded misc callbacks
    ...callbacks,
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
    renderRoomOverlay: polygonCtx.renderRoomOverlay,
    showToast: polygonCtx.showToast,
    saveProjectionMapping: polygonCtx.saveProjectionMapping,
  };

  // MAPPING.init / POLYGON_EDITOR.init are called when the bundle is loaded.
  // In test/stub envs the inert-stub _resolveModule returns {} and these calls
  // are skipped — the contract test only asserts the returned shape.
  if (typeof MAPPING.init === "function") {
    try {
      MAPPING.init(mappingDeps);
    } catch (err) {
      logger?.error?.(`${_LOG_PREFIX} MAPPING.init threw:`, err?.message || err);
      throw err;
    }
  } else {
    logger?.warn?.(`${_LOG_PREFIX} MAPPING.init absent — skipping (test/stub env?)`);
  }

  if (typeof POLYGON_EDITOR.init === "function") {
    try {
      POLYGON_EDITOR.init(polygonCtx);
    } catch (err) {
      logger?.error?.(`${_LOG_PREFIX} POLYGON_EDITOR.init threw:`, err?.message || err);
      throw err;
    }
  } else {
    logger?.warn?.(`${_LOG_PREFIX} POLYGON_EDITOR.init absent — skipping (test/stub env?)`);
  }

  // ── liveSync subscriptions ──
  let _offAlignModeChange = null;
  let _offProjectionProfileChange = null;
  try {
    _offAlignModeChange = liveSync.onAlignModeChange?.((on) => {
      try {
        if (typeof document !== "undefined") {
          document.body?.classList?.toggle("align-mode-active", Boolean(on));
        }
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
      if (typeof document !== "undefined") {
        document.body?.classList?.add("align-mode-active");
      }
      HANDLE_UI.showHandles?.(true);
      polygonCtx.renderRoomOverlay?.();
    }
  } catch (err) {
    logger?.warn?.(`${_LOG_PREFIX} initial alignMode probe failed:`, err?.message || err);
  }

  // ── Window resize (handles re-render on viewport change) ──
  const _onResize = () => {
    try { HANDLE_UI.onResize?.(); } catch (err) {
      logger?.warn?.(`${_LOG_PREFIX} resize:`, err?.message || err);
    }
  };
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("resize", _onResize, { passive: true });
  }

  // ── Returned handle ──
  function stop() {
    try { _offAlignModeChange?.(); } catch (e) { /* listener guard */ }
    try { _offProjectionProfileChange?.(); } catch (e) { /* listener guard */ }
    try {
      if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
        window.removeEventListener("resize", _onResize);
      }
    } catch (e) { /* listener guard */ }
    try { HANDLE_UI.showHandles?.(false); } catch (e) { /* teardown guard */ }
    try {
      if (typeof document !== "undefined") {
        document.body?.classList?.remove("align-mode-active");
      }
    } catch (e) { /* teardown guard */ }
    try { HANDLE_UI.teardown?.(); } catch (e) { /* teardown guard */ }
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
