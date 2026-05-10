// Phase 35 D-01 (Track A) — Pure-extract bootAlignMode orchestrator.
//
// Single entry-point that boots the align-mode UI for either /output/
// (thin) or the dashboard (full). All currently-injected refs are now
// explicit named arguments — `grid-state`, `applyTransform`, profile
// flow callbacks, polygon-editor's 60-field ctx, etc. The 4 IIFE
// modules' internal init() signatures are NOT modified — bootAlignMode
// is a NEW orchestrator that calls the existing inits in the right
// order with explicit args (per RESEARCH §A.2).
//
// Dependencies (resolved at call time, NOT parse time per RESEARCH §A.5
// risk mitigation):
//   - window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING
//   - window.TT_BEAMER_RUNTIME_POLYGON_EDITOR
//   - window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI
//   - window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE
//   - window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE (optional)
//
// Returns { stop, hitTestVertex }:
//   - stop()           — teardown: hides handles, removes window listeners,
//                        unsubscribes from liveSync.
//   - hitTestVertex(x, y) — handle-hit-testing for receiver-input-forwarder
//                           (replaces the Wave-4 4-corner approximation in
//                           receiver-bootstrap.js).

/**
 * @typedef {Object} BootAlignModeArgs
 * @property {HTMLElement} stage
 * @property {HTMLElement} roomOverlay
 * @property {HTMLElement} [videoEl]
 * @property {Object} state
 * @property {string} outputRole
 * @property {string} OUTPUT_ROLE_FINAL
 * @property {string} OUTPUT_ROLE_CONTROL
 * @property {Object} liveSync
 * @property {Object} [polygonContract]
 * @property {Object} [normalizers]
 * @property {Object} [boardAccess]
 * @property {Object} [polygonState]
 * @property {Object} [interactions]
 * @property {Object} [persistence]
 * @property {Object} [sync]
 * @property {Object} [dashboard]
 * @property {Function} [renderRoomOverlay]
 * @property {Function} [showToast]
 * @property {Function} [getRenderMode]
 * @property {Function} [getBoardId]
 * @property {Console} [logger]
 * @property {HTMLElement} [feedbackEl]
 *
 * @param {BootAlignModeArgs} args
 * @returns {{ stop: () => void, hitTestVertex: (clientX: number, clientY: number) => any }}
 */
export function bootAlignMode(args) {
  const a = args || {};
  const logger = a.logger ?? console;

  // ── 1. Resolve module references (lazy at call time per RESEARCH §A.5) ──
  const MAPPING = (typeof window !== "undefined")
    ? window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING
    : null;
  const POLYGON_EDITOR = (typeof window !== "undefined")
    ? window.TT_BEAMER_RUNTIME_POLYGON_EDITOR
    : null;
  const HANDLE_UI = (typeof window !== "undefined")
    ? window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI
    : null;
  const GRID_STATE = (typeof window !== "undefined")
    ? window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE
    : null;
  const PROFILE_PERSISTENCE = (typeof window !== "undefined")
    ? window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE
    : null;

  if (!MAPPING || !POLYGON_EDITOR || !HANDLE_UI || !GRID_STATE) {
    throw new Error(
      "[output-align-mode] required IIFE modules not loaded — check script-tag order " +
        "(MAPPING / POLYGON_EDITOR / HANDLE_UI / GRID_STATE)"
    );
  }

  // ── 2. Build mapping init args ──
  // mapping.init forwards internally to grid-state.init, gl-renderer.init,
  // 2d-fallback.init, handle-ui.init, profile-persistence.init. The 4 IIFE
  // modules' init signatures are unchanged (RESEARCH §A.2 — boundary-only).
  const mappingInitArgs = {
    stage: a.stage,
    outputRole: a.outputRole,
    OUTPUT_ROLE_FINAL: a.OUTPUT_ROLE_FINAL,
    OUTPUT_ROLE_CONTROL: a.OUTPUT_ROLE_CONTROL,
    renderRoomOverlay: typeof a.renderRoomOverlay === "function"
      ? a.renderRoomOverlay
      : () => {
          // Fallback: use polygon-editor's own renderRoomOverlay once init'd.
          try {
            POLYGON_EDITOR.renderRoomOverlay?.();
          } catch (_) { /* not ready yet */ }
        },
    getBoardId: typeof a.getBoardId === "function"
      ? a.getBoardId
      : () => a.state?.boardId ?? null,
    getRenderMode: typeof a.getRenderMode === "function"
      ? a.getRenderMode
      : () => a.state?.renderMode ?? "auto",
    showToast: typeof a.showToast === "function"
      ? a.showToast
      : () => {},
    saveProjectionMapping: a.persistence?.saveProjectionMapping ?? (() => {}),
  };
  MAPPING.init(mappingInitArgs);

  // ── 3. Build polygon-editor init args (60-field ctx) ──
  // Per RESEARCH §A.1: most fields can be no-op stubs on /output/ thin
  // path because in OUTPUT_ROLE_FINAL+alignMode the only exercised path
  // is renderRoomOverlay() (read-only). Drag handlers never fire on
  // /output/. Stubs are thus auditable as "never called when
  // outputRole === FINAL && alignMode === true && no drag UI gesture".
  // See Pitfall 6 in RESEARCH for stub blast-radius analysis.
  const noop = () => {};
  const noopReturnNull = () => null;
  const noopReturnFalse = () => false;
  const noopReturnTrue = () => true;
  const noopReturnEmptyArr = () => [];
  const identity = (x) => x;

  const boardAccess = a.boardAccess ?? {};
  const polygonState = a.polygonState ?? {};
  const normalizers = a.normalizers ?? {};
  const interactions = a.interactions ?? {};
  const persistence = a.persistence ?? {};
  const sync = a.sync ?? {};
  const dashboard = a.dashboard ?? {};

  const polygonCtx = {
    state: a.state,
    roomOverlay: a.roomOverlay,
    triggerFeedback: a.feedbackEl
      ?? (typeof document !== "undefined" ? document.createElement("div") : { textContent: "" }),
    shipPolygonEdgeSelect: null,
    polygonEdgeSelect: null,
    outputRole: a.outputRole,
    OUTPUT_ROLE_FINAL: a.OUTPUT_ROLE_FINAL,
    OUTPUT_ROLE_CONTROL: a.OUTPUT_ROLE_CONTROL,

    // boardAccess (RESEARCH §A.1):
    getBoard: boardAccess.getBoard ?? noopReturnNull,
    getBoards: boardAccess.getBoards ?? noopReturnEmptyArr,
    getRoomPoints: boardAccess.getRoomPoints ?? noopReturnEmptyArr,
    getRoomLabelPosition: boardAccess.getRoomLabelPosition ?? noopReturnNull,
    getSpecialRooms: boardAccess.getSpecialRooms ?? noopReturnEmptyArr,
    getShipPolygonPoints: boardAccess.getShipPolygonPoints ?? noopReturnEmptyArr,
    setShipPolygonPoints: boardAccess.setShipPolygonPoints ?? noop,
    getRoomPolygonPoints: boardAccess.getRoomPolygonPoints ?? noopReturnEmptyArr,
    setRoomPolygonPoints: boardAccess.setRoomPolygonPoints ?? noop,
    getPlayAreas: boardAccess.getPlayAreas ?? noopReturnEmptyArr,
    getSelectedPlayArea: boardAccess.getSelectedPlayArea ?? noopReturnNull,
    getSelectedPlayAreaId: boardAccess.getSelectedPlayAreaId ?? noopReturnNull,
    getBoardZoom: boardAccess.getBoardZoom ?? (() => 1),

    // polygonState (RESEARCH §A.1):
    getActivePolygonRoomId: polygonState.getActivePolygonRoomId ?? noopReturnNull,
    setActivePolygonRoomId: polygonState.setActivePolygonRoomId ?? noop,
    isRoomFrozen: polygonState.isRoomFrozen ?? noopReturnFalse,
    getCurrentPolygonHandleScale: polygonState.getCurrentPolygonHandleScale ?? (() => 1),
    getPolygonEditorHandleMetrics: polygonState.getPolygonEditorHandleMetrics ?? (() => ({ size: 12 })),

    // normalizers (RESEARCH §A.1):
    normalizePolygonPoint: normalizers.normalizePolygonPoint ?? identity,
    getNormalizedPolygonArea: normalizers.getNormalizedPolygonArea ?? (() => 0),
    isRenderableNormalizedPolygon: normalizers.isRenderableNormalizedPolygon ?? noopReturnFalse,
    normalizeShipPolygon: normalizers.normalizeShipPolygon ?? identity,
    remapGridPoint: normalizers.remapGridPoint ?? ((nx, ny) => ({ x: nx, y: ny })),
    hasGridDisplacements: normalizers.hasGridDisplacements ?? noopReturnFalse,

    // interactions (RESEARCH §A.1):
    beginPolygonDragInteraction: interactions.beginPolygonDragInteraction ?? noop,
    endPolygonDragInteraction: interactions.endPolygonDragInteraction ?? noop,
    isPanArbitrating: interactions.isPanArbitrating ?? noopReturnFalse,
    isAcceptablePolygonPointerEvent: interactions.isAcceptablePolygonPointerEvent ?? noopReturnTrue,
    arePlayAreaVerticesEditable: interactions.arePlayAreaVerticesEditable ?? noopReturnFalse,
    areRoomVerticesEditable: interactions.areRoomVerticesEditable ?? noopReturnFalse,
    mapClientPointToNormalized: interactions.mapClientPointToNormalized
      ?? ((cx, cy) => [cx, cy]),
    setPlayAreaPolygon: interactions.setPlayAreaPolygon ?? noop,

    // persistence (RESEARCH §A.1):
    persistBoardProfiles: persistence.persistBoardProfiles ?? noop,
    pushUndoState: persistence.pushUndoState ?? noop,
    saveProjectionMapping: persistence.saveProjectionMapping ?? noop,

    // sync — all no-op stubs on /output/ (RESEARCH §A.1):
    syncShipPolygonEditorStatus: sync.syncShipPolygonEditorStatus ?? noop,
    syncShipPolygonVertexSelect: sync.syncShipPolygonVertexSelect ?? noop,
    syncPolygonVertexSelect: sync.syncPolygonVertexSelect ?? noop,
    syncPolygonEdgeSelect: sync.syncPolygonEdgeSelect ?? noop,
    syncPolygonEditorStatus: sync.syncPolygonEditorStatus ?? noop,
    syncPolygonEditorPanel: sync.syncPolygonEditorPanel ?? noop,
    syncRoomPanelFromSelection: sync.syncRoomPanelFromSelection ?? noop,
    syncSelectedRoomStateForBoard: sync.syncSelectedRoomStateForBoard ?? noop,
    refreshPersistentRoomSelectionVisualState: sync.refreshPersistentRoomSelectionVisualState ?? noop,

    // dashboard — no-op stubs on /output/ (Pitfall 6 — RESEARCH §A.1):
    // cacheRoomPolygonDragDomRefs / cacheShipPolygonDragDomRefs are
    // ONLY called from drag handlers (beginShipPolygonVertexDrag etc.)
    // which are not entered on /output/ because no operator drag UI
    // gesture is initiated there. Verified safe per RESEARCH §A.1.
    isQuickModeActive: dashboard.isQuickModeActive ?? noopReturnFalse,
    handleQuickModeRoomTap: dashboard.handleQuickModeRoomTap ?? noop,
    applyRoomDraftTargetFromRoomClick: dashboard.applyRoomDraftTargetFromRoomClick ?? noop,
    cacheShipPolygonDragDomRefs: dashboard.cacheShipPolygonDragDomRefs ?? noopReturnNull,
    cacheRoomPolygonDragDomRefs: dashboard.cacheRoomPolygonDragDomRefs ?? noopReturnNull,
  };
  POLYGON_EDITOR.init(polygonCtx);

  // ── 4. Wire liveSync subscriptions (Track B integration) ──
  const liveSync = a.liveSync ?? null;
  let offAlignMode = noop;
  let offProfile = noop;

  if (liveSync) {
    // onAlignModeChange: toggle handle visibility + body class for CSS gating
    // (per src/styles.css:119 — `body[data-output-role="final-output"].align-mode-active #room-overlay`).
    if (typeof liveSync.onAlignModeChange === "function") {
      offAlignMode = liveSync.onAlignModeChange((enabled) => {
        const flag = Boolean(enabled);
        try {
          if (typeof HANDLE_UI.onAlignModeChange === "function") {
            HANDLE_UI.onAlignModeChange(flag);
          } else if (flag) {
            HANDLE_UI.showHandles?.();
          } else {
            HANDLE_UI.hideHandles?.();
          }
        } catch (e) {
          logger.warn?.("[output-align-mode] onAlignModeChange handler failed:", e);
        }
        // Mirror state for downstream readers + toggle CSS gating class.
        if (a.state) a.state.alignMode = flag;
        if (typeof document !== "undefined" && document.body) {
          document.body.classList.toggle("align-mode-active", flag);
        }
      }) ?? noop;

      // Apply the current state once at boot (catches the case where alignMode
      // was true at WS-hello time, before this handler was registered).
      try {
        const current = liveSync.getAlignMode?.();
        if (current === true) {
          if (typeof HANDLE_UI.onAlignModeChange === "function") {
            HANDLE_UI.onAlignModeChange(true);
          } else {
            HANDLE_UI.showHandles?.();
          }
          if (a.state) a.state.alignMode = true;
          if (typeof document !== "undefined" && document.body) {
            document.body.classList.add("align-mode-active");
          }
        }
      } catch (e) {
        logger.warn?.("[output-align-mode] initial align-mode apply failed:", e);
      }
    }

    // onProjectionProfileChange: relay to profile-persistence so the warp
    // profile is loaded when the operator switches profiles.
    if (typeof liveSync.onProjectionProfileChange === "function") {
      offProfile = liveSync.onProjectionProfileChange((profileId) => {
        try {
          if (PROFILE_PERSISTENCE
              && typeof PROFILE_PERSISTENCE.applyProjectionProfile === "function") {
            PROFILE_PERSISTENCE.applyProjectionProfile(profileId);
          }
        } catch (e) {
          logger.warn?.("[output-align-mode] onProjectionProfileChange handler failed:", e);
        }
      }) ?? noop;
    }
  }

  // ── 5. Window resize listener — relay to handle-ui ──
  function onResize() {
    try {
      if (typeof HANDLE_UI.onWindowResize === "function") {
        HANDLE_UI.onWindowResize();
      }
    } catch (e) {
      logger.warn?.("[output-align-mode] onWindowResize failed:", e);
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("resize", onResize);
  }

  // ── 6. hitTestVertex exposed for receiver-bootstrap consumption ──
  // Replaces the Wave-4 4-corner approximation in receiver-bootstrap.js
  // with real handle hit-testing routed through HANDLE_UI's DOM lookup.
  function hitTestVertex(clientX, clientY) {
    try {
      if (typeof HANDLE_UI.hitTestVertex === "function") {
        return HANDLE_UI.hitTestVertex(clientX, clientY);
      }
      // Fallback: walk .projection-corner-handle elements and find the one
      // whose bounding-box contains the pointer. This works because handle-ui
      // creates handles with class "projection-corner-handle" (or similar)
      // when showHandles() is called. Returns the handle's data-corner-id
      // (matching the receiver-input-forwarder's expected shape: an integer
      // id, or null if no handle hit).
      if (typeof document !== "undefined") {
        const els = document.querySelectorAll(".projection-corner-handle");
        for (const el of els) {
          const r = el.getBoundingClientRect();
          if (clientX >= r.left && clientX <= r.right
              && clientY >= r.top && clientY <= r.bottom) {
            const id = el.getAttribute?.("data-corner-id")
              ?? el.dataset?.cornerId
              ?? null;
            if (id != null) {
              const n = Number(id);
              return Number.isFinite(n) ? n : id;
            }
            // No id attribute — return 0 so the forwarder routes to the
            // server's mesh-warp profile resolver (matches the prior
            // 4-corner approximation's id semantics).
            return 0;
          }
        }
      }
    } catch (e) {
      logger.warn?.("[output-align-mode] hitTestVertex failed:", e);
    }
    return null;
  }

  // ── 7. Return shape ──
  return {
    stop() {
      try { offAlignMode(); } catch (_) {}
      try { offProfile(); } catch (_) {}
      if (typeof window !== "undefined") {
        try { window.removeEventListener("resize", onResize); } catch (_) {}
      }
      try { HANDLE_UI.hideHandles?.(); } catch (_) {}
      if (typeof document !== "undefined" && document.body) {
        try { document.body.classList.remove("align-mode-active"); } catch (_) {}
      }
    },
    hitTestVertex,
  };
}

// Phase 35 D-01 (Track A): also expose on window for non-module callers
// (runtime-orchestration.js is loaded as a plain `<script defer>`, not a
// module, so it cannot use the ES `import` syntax to consume bootAlignMode).
// Module consumers use the named export above; dashboard consumes the same
// function via window.TT_BEAMER_RUNTIME_BOOT_ALIGN_MODE — single source of
// truth, no duplicated logic.
if (typeof window !== "undefined") {
  window.TT_BEAMER_RUNTIME_BOOT_ALIGN_MODE = bootAlignMode;
}
