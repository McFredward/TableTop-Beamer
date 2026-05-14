// Phase 35-iter2 hotfix h1 — Lazy-load align-mode bundle on /output/.
// Phase 36 A2 — Wire bootHandleUi (Option H thin-export) instead of
// the Phase 35-A pure-extract entry point. Append #stage + #room-overlay DOM via JS
// at bundle activation (NOT in static output.html — D-09 ≤8 src-based
// scripts budget preserved). receiver-bootstrap.js (D-02 (a) inversion)
// keeps overlay pointer-events permanently "none" so handle DOM at
// z:9999 captures clicks naturally.
//
// Problem this solves (operator-reported 2026-05-10):
//   - Original Phase 35-A loaded all 12 align-mode IIFE script tags via
//     `<script defer>` in output.html on every page load. That meant
//     /output/ had ~3700 LOC of polygon-editor + projection-renderer
//     code parsing in parallel with WebRTC ICE negotiation, producing
//     a long unstable connection phase before the stream stabilized.
//
//   - The polygon-editor's `boardAccess` was wired with no-op stubs that
//     returned `[]` for getRoomPolygonPoints / getShipPolygonPoints /
//     getBoard / getRoomPoints — so even when align-mode activated,
//     rooms rendered as default rectangles instead of the polygons the
//     operator drew on the dashboard.
//
//   - Phase 35-A's pure-extract entry point was incomplete (Phase 36
//     CONTEXT.md D-01 + 35-CLOSURE-ITER2-ADDENDUM): the audit was
//     grep-only and missed dynamic ctx.X accesses. Phase 36 D-01 LOCKED
//     Option H — the full handle-ui surface becomes a first-class
//     thin-exportable building block.
//
// Strategy:
//   1. /output/ page load: only this loader module + 4 other thin
//      scripts (5 total), no align-mode IIFEs. WebRTC connects
//      without main-thread contention.
//   2. After WebRTC stabilizes (2s post-load), prefetch the IIFE
//      bundle in the background so it's in the browser cache when
//      the operator hits align-mode.
//   3. When liveSync.onAlignModeChange(true) fires: dynamic-load
//      the bundle (cache-hit instantly if prefetched, ~500ms cold),
//      fetch /api/boards + /api/live/snapshot, append #stage + #room-overlay
//      DOM, build a real boardAccess wired to live data, then call
//      bootHandleUi() (Option H Phase 36 entry-point).
//   4. When alignMode goes false: stop the bootHandle, remove the
//      `align-mode-active` body class (CSS hides handles), hide the
//      stage div.
//
// The IIFE scripts are NOT ES modules — they register on
// `window.TT_BEAMER_RUNTIME_*`. Dynamic `import()` does not work for
// them; we use programmatic `<script src=…>` injection instead, then
// poll `window` for the registration to complete. boot-handle-ui.js
// IS an ES module and is loaded via dynamic `import()`.

const ALIGN_MODE_BUNDLE = [
  "/src/app/runtime/core/polygon-contract.js",
  "/src/app/runtime/state/runtime-polygon-normalizers.js",
  "/src/app/runtime/state/runtime-room-geometry.js",
  "/src/app/runtime/viewport/runtime-projection-grid-state.js",
  "/src/app/runtime/viewport/runtime-projection-gl-renderer.js",
  // 2026-05-14: 2D fallback retired; GL is the sole mesh-warp path.
  "/src/app/runtime/viewport/runtime-projection-profile-persistence.js",
  "/src/app/runtime/viewport/runtime-projection-handle-drag.js",
  "/src/app/runtime/viewport/runtime-projection-handle-ui.js",
  "/src/app/runtime/viewport/runtime-projection-mapping.js",
  "/src/app/runtime/polygon-editor/runtime-polygon-editor-handles.js",
  "/src/app/runtime/polygon-editor/runtime-polygon-editor.js",
];

const PREFETCH_DELAY_MS = 2000;

let bundlePromise = null;

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-align-mode-iife][src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`load failed: ${src}`)));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = false; // sequential when appended in order — preserves IIFE parse-time deps
    s.defer = false;
    s.dataset.alignModeIife = "true";
    s.onload = () => { s.dataset.loaded = "true"; resolve(); };
    s.onerror = () => reject(new Error(`load failed: ${src}`));
    document.head.appendChild(s);
  });
}

function loadBundleOnce() {
  if (bundlePromise) return bundlePromise;
  bundlePromise = (async () => {
    // Sequentially append script tags (in order) so IIFEs that have
    // parse-time window-lookup deps (handle-ui needs handle-drag —
    // RESEARCH §A.5 Pitfall 5) see their deps already registered.
    for (const src of ALIGN_MODE_BUNDLE) {
      await loadScriptOnce(src);
    }
  })();
  return bundlePromise;
}

async function fetchJson(url) {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}

function pickRuntimeBoardId(snapshot) {
  // snapshot.selectedBoard is the canonical authoritative board id
  // (server.mjs:567/688). Fall back to runtime.selectedBoardId if present.
  return (
    snapshot?.selectedBoard
    ?? snapshot?.runtime?.selectedBoardId
    ?? snapshot?.runtime?.selectedBoard
    ?? null
  );
}

function buildBoardAccess({ getRuntimeBoards, getActiveBoardId, logger }) {
  const findBoard = (boardId) => {
    const id = boardId ?? getActiveBoardId();
    return getRuntimeBoards().find((b) => b.id === id) ?? null;
  };
  return {
    getBoard: findBoard,
    getBoards: () => getRuntimeBoards(),
    getRoomPolygonPoints: (boardId, roomId) => {
      const board = findBoard(boardId);
      const room = board?.rooms?.find((r) => r.id === roomId);
      return room?.polygon ?? room?.points ?? [];
    },
    setRoomPolygonPoints: () => {
      // /output/ is read-only; vertex edits live on the dashboard
    },
    getShipPolygonPoints: (boardId) => {
      const board = findBoard(boardId);
      return board?.shipPolygonPoints ?? [];
    },
    setShipPolygonPoints: () => {},
    getRoomPoints: (room, boardId) => {
      // Prefer the runtime-room-geometry helper if the IIFE is loaded
      // and exposes getRoomPoints — that handles stretch/transform
      // correctly. Fallback returns the polygon scaled to viewBox 1000
      // (renderRoomOverlay's expected coordinate space).
      const RG = window.TT_BEAMER_RUNTIME_ROOM_GEOMETRY;
      if (RG && typeof RG.getRoomPoints === "function") {
        try { return RG.getRoomPoints(room, boardId); } catch (e) {
          logger?.warn?.("[align-loader] getRoomPoints helper threw — falling back:", e?.message);
        }
      }
      const polygon = room?.polygon ?? room?.points ?? [];
      return polygon.map(([x, y]) => [x * 1000, y * 1000]);
    },
    getRoomLabelPosition: () => null,
    getSpecialRooms: () => [],
    getPlayAreas: (boardId) => findBoard(boardId)?.playAreas ?? [],
    getSelectedPlayArea: () => null,
    getSelectedPlayAreaId: () => null,
    getBoardZoom: () => 1,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Phase 36 A2 helpers — NEW
// ────────────────────────────────────────────────────────────────────────────

// Phase 36 A2: append #stage + #room-overlay DOM via JS so output.html static
// markup stays under D-09 ≤8 src-based scripts (no static stage/overlay markup).
// Idempotent — re-invoking does NOT duplicate the elements (right-click add-line
// flow may re-trigger activation).
function _ensureStageAndOverlayDom(logger) {
  let stage = document.getElementById("stage");
  if (!stage) {
    stage = document.createElement("div");
    stage.id = "stage";
    // pointer-events:none on the container — handles + room-overlay set their
    // own pointer-events:auto. videoEl + fx-canvas live elsewhere; this stage
    // is a thin host for align-mode UI only.
    stage.style.cssText =
      "position:fixed;inset:0;z-index:5;pointer-events:none;";
    document.body.appendChild(stage);
    logger?.log?.("[align-loader] appended #stage to body");
  } else {
    // If a previous activate() set display:none on teardown, re-show it now.
    if (stage.style.display === "none") {
      stage.style.display = "";
      logger?.log?.("[align-loader] reactivated existing #stage");
    }
  }
  let roomOverlay = document.getElementById("room-overlay");
  if (!roomOverlay) {
    // SVG element — use createElementNS so the browser parses it as SVG.
    roomOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    roomOverlay.id = "room-overlay";
    roomOverlay.setAttribute("viewBox", "0 0 1000 1000");
    roomOverlay.setAttribute("preserveAspectRatio", "xMidYMid meet");
    roomOverlay.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:auto;";
    stage.appendChild(roomOverlay);
    logger?.log?.("[align-loader] appended #room-overlay (svg) to #stage");
  }
  return { stage, roomOverlay };
}

// Phase 36 A2: minimal /output/-local state factory covering the §1.2 RESEARCH
// inventory of ctx.state sub-keys exercised by handle-ui + polygon-editor on the
// read path. Dashboard uses a live state object built in runtime-orchestration.js;
// /output/ has no settings panel / animation editor / quick-mode, so most fields
// are sensible defaults.
function _createOutputState(boardId) {
  return {
    boardId: boardId || null,
    alignMode: true,
    uiView: "dashboard", // not "settings" — /output/ never enters settings panel paths
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

// Phase 36 A2: polygonState fan-out fields (RESEARCH §1.5). On /output/ this is
// a thin adapter onto _state — there's no settings panel that would let the
// operator manually freeze rooms or change handle-scale.
function _buildPolygonStateStub(state /*, boardAccess */) {
  return {
    getCurrentPolygonHandleScale: () => 1,
    getActivePolygonRoomId: (boardId) =>
      state.polygonEditor?.activeRoomIdByBoard?.[boardId] || null,
    setActivePolygonRoomId: (boardId, roomId) => {
      state.polygonEditor.activeRoomIdByBoard = state.polygonEditor.activeRoomIdByBoard || {};
      state.polygonEditor.activeRoomIdByBoard[boardId] = roomId;
    },
    isRoomFrozen: () => false,
    getPolygonEditorHandleMetrics: (zoomScale, handleScale) => ({
      size: 12 * (handleScale || 1),
      strokeWidth: 2,
    }),
    arePlayAreaVerticesEditable: () => false,
    getSelectedPlayAreaId: () => null,
    getBoardZoom: () => ({ scale: 1 }),
  };
}

// Phase 36 A2: normalizers fan-out (RESEARCH §1.5). On /output/ the IIFE bundle
// loads runtime-projection-mapping which exposes window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING
// — remapGridPoint + hasGridDisplacements proxy through it.
function _buildNormalizersStub() {
  return {
    normalizeShipPolygon: (pts) => Array.isArray(pts) ? pts.slice() : [],
    normalizePolygonPoint: (pt) => Array.isArray(pt) ? pt.slice() : pt,
    remapGridPoint: (nx, ny) => {
      const M = window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING;
      try {
        if (M && typeof M.remapPoint === "function") {
          const p = M.remapPoint(nx, ny);
          if (p && typeof p === "object") return p;
        }
      } catch { /* fall through to identity */ }
      return { x: nx, y: ny };
    },
    hasGridDisplacements: () => {
      const M = window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING;
      try {
        return Boolean(M?.hasDisplacements?.());
      } catch { return false; }
    },
  };
}

// Phase 36 A2: interactions fan-out (RESEARCH §1.5). mapClientPointToNormalized
// uses #stage's bounding box for client→normalized conversion on /output/.
// areRoomVerticesEditable returns false because /output/ does not host the
// dashboard's play-area editor (D-01 thin-output invariant).
function _buildInteractionsStub() {
  return {
    mapClientPointToNormalized: (cx, cy) => {
      const stage = document.getElementById("stage");
      if (!stage) return { x: 0, y: 0 };
      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
      return {
        x: (cx - rect.left) / rect.width,
        y: (cy - rect.top) / rect.height,
      };
    },
    beginPolygonDragInteraction: () => {},
    endPolygonDragInteraction: () => {},
    isPanArbitrating: () => false,
    isAcceptablePolygonPointerEvent: (event) => event?.button !== 2, // ignore raw right-click
    areRoomVerticesEditable: () => false,
    setPlayAreaPolygon: () => {}, // /output/ is read-only for play-area edits
  };
}

// Phase 36 A2: persistence fan-out (RESEARCH §1.5). All persistence is server-
// owned via emitLiveMutation through liveSync (grid-state.broadcastGridSnapshot
// uses liveSyncCoreOverride). /output/ never directly POSTs to /api/profiles.
// pushUndoState is a real client-local stack inside handle-ui — handle-ui owns
// it; this stub is the polygon-editor's drag-start hook which is no-op on
// /output/ (no polygon-vertex edits there).
function _buildPersistenceStub(/* liveSync */) {
  const noop = () => {};
  return {
    persistBoardProfiles: noop,    // server-owned via mutation broadcast
    pushUndoState: noop,           // polygon-editor drag-start hook (no-op on /output/)
    saveProjectionMapping: noop,   // dashboard-only
    discardChanges: noop,          // dashboard-only
    profileSaveFlow: noop,         // dashboard-only
    profileLoadFlow: noop,         // dashboard-only
    profileDeleteFlow: noop,       // dashboard-only
  };
}

// Phase 36 A2: sync stubs (RESEARCH §1.5). These fire only when uiView ===
// "settings" (dashboard side panel). /output/ has uiView="dashboard" forever —
// no settings panel exists. All no-ops with rationale.
function _buildSyncStubs() {
  const noop = () => {};
  return {
    syncShipPolygonEditorStatus: noop,
    syncShipPolygonVertexSelect: noop,
    syncPolygonVertexSelect: noop,
    syncPolygonEdgeSelect: noop,
    syncPolygonEditorStatus: noop,
    syncPolygonEditorPanel: noop,
    syncRoomPanelFromSelection: noop,
    syncSelectedRoomStateForBoard: noop,
    refreshPersistentRoomSelectionVisualState: noop,
  };
}

// Phase 36 A2: dashboard fan-out stubs (RESEARCH §1.5). Quick-mode + room-draft
// are dashboard-only. cacheRoomPolygonDragDomRefs is a perf hint that handle-ui
// uses to avoid layout thrash during drags — safe to no-op.
function _buildDashboardStubs() {
  const noop = () => {};
  return {
    handleQuickModeRoomTap: noop,
    applyRoomDraftTargetFromRoomClick: noop,
    isQuickModeActive: () => false,
    cacheShipPolygonDragDomRefs: noop,
    cacheRoomPolygonDragDomRefs: noop,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// /output/ align-mode loader — boot function
// ────────────────────────────────────────────────────────────────────────────

function getRequiredArgsAtBootTime() {
  // Read window.TT_BEAMER_RUNTIME_POLYGON_NORMALIZERS, etc. — these
  // become available only after loadBundleOnce resolves.
  const NORMS = window.TT_BEAMER_RUNTIME_POLYGON_NORMALIZERS;
  if (!NORMS) {
    throw new Error("polygon-normalizers IIFE did not register on window");
  }
  return {
    polygonContract: window.TT_BEAMER_POLYGON_CONTRACT ?? null,
    normalizers: {
      normalizePolygonPoint: NORMS.normalizePolygonPoint ?? ((p) => p),
      getNormalizedPolygonArea: NORMS.getNormalizedPolygonArea ?? (() => 0),
      isRenderableNormalizedPolygon: NORMS.isRenderableNormalizedPolygon ?? (() => false),
      normalizeShipPolygon: NORMS.normalizeShipPolygon ?? ((p) => p),
      remapGridPoint: ((nx, ny) => ({ x: nx, y: ny })),
      hasGridDisplacements: () => false,
    },
  };
}

/**
 * Boot the lazy align-mode loader on /output/. Subscribes to liveSync,
 * lazy-loads the IIFE bundle on first alignMode=true, fetches board
 * data, appends #stage + #room-overlay DOM, and wires bootHandleUi
 * (Phase 36 Option H) with REAL polygon data.
 *
 * @param {Object} args
 * @param {HTMLElement} args.stage          - DEPRECATED in Phase 36 A2 — loader
 *                                             appends its own #stage via JS. The
 *                                             arg is preserved for back-compat
 *                                             but ignored.
 * @param {SVGElement}  args.roomOverlay    - DEPRECATED in Phase 36 A2 — loader
 *                                             appends its own #room-overlay via JS.
 * @param {HTMLElement} [args.videoEl]      - The <video> element for stream.
 * @param {Object}      args.liveSync       - bootOutputLiveSync handle.
 * @param {Console}     [args.logger]
 * @returns {{ stop: () => void }}
 */
export function bootAlignModeLoader({
  // stage / roomOverlay args ignored — Phase 36 A2 appends them via JS.
  // eslint-disable-next-line no-unused-vars
  stage: _ignoredStage, // kept for back-compat; loader appends its own
  // eslint-disable-next-line no-unused-vars
  roomOverlay: _ignoredOverlay,
  videoEl, liveSync, logger = console,
}) {
  let runtimeBoards = [];
  let activeBoardId = null;
  /** @type {{stop: Function, hitTestVertex?: Function} | null} */
  let _currentBootHandle = null;
  let stopped = false;
  // Phase 36 M3 T1 — videoEl resize tracking (cleared on deactivate)
  let _videoEl = null;
  let _videoResizeFn = null;
  let _videoResizeObserver = null;

  async function refreshBoardCatalog() {
    try {
      const catalog = await fetchJson("/api/boards");
      runtimeBoards = Array.isArray(catalog?.runtimeBoards) ? catalog.runtimeBoards : [];
      logger?.log?.(`[align-loader] /api/boards loaded: ${runtimeBoards.length} board(s)`);
    } catch (err) {
      logger?.warn?.(`[align-loader] /api/boards fetch failed: ${err?.message ?? err}`);
    }
  }

  async function refreshSelectedBoard() {
    try {
      const j = await fetchJson("/api/live/snapshot");
      const snap = j?.snapshot ?? j?.session?.snapshot ?? j ?? {};
      activeBoardId = pickRuntimeBoardId(snap);
      logger?.log?.(`[align-loader] selected board: ${activeBoardId ?? "(none)"}`);
    } catch (err) {
      logger?.warn?.(`[align-loader] /api/live/snapshot fetch failed: ${err?.message ?? err}`);
    }
  }

  async function activate() {
    if (stopped) return;
    try {
      await loadBundleOnce();
      if (!runtimeBoards.length) await refreshBoardCatalog();
      if (!activeBoardId) await refreshSelectedBoard();

      // If the live-sync snapshot didn't carry a selectedBoard (e.g.
      // fresh server with no operator session yet), default to the
      // first available board so renderRoomOverlay has something to
      // draw. The operator can switch boards later — we listen to
      // onProjectionProfileChange and re-activate.
      if (!activeBoardId && runtimeBoards.length > 0) {
        activeBoardId = runtimeBoards[0]?.id ?? null;
        if (activeBoardId) {
          logger?.log?.(`[align-loader] no selectedBoard in snapshot — defaulting to ${activeBoardId}`);
        }
      }

      // Phase 36 A2: append stage + room-overlay DOM AFTER bundle loads but
      // BEFORE bootHandleUi is invoked — handle-ui's MAPPING.init reads
      // bbox during init, so the elements must exist + be laid out. JS
      // append (not static HTML) preserves D-09 ≤8 src-based scripts.
      const { stage: stageEl, roomOverlay: roomOverlayEl } =
        _ensureStageAndOverlayDom(logger);

      // Activate CSS gating BEFORE bootHandleUi renders — the
      // align-mode-active class is what makes #room-overlay visible
      // (src/styles.css:119). Without it, polygons render but stay hidden.
      document.body.classList.add("align-mode-active");

      const { polygonContract /* normalizers */ } = getRequiredArgsAtBootTime();

      const boardAccess = buildBoardAccess({
        getRuntimeBoards: () => runtimeBoards,
        getActiveBoardId: () => activeBoardId,
        logger,
      });

      // Phase 36 A2: build the FULL §1.5 RESEARCH inventory dep-bag.
      const _state = _createOutputState(activeBoardId);
      _state.runtime.activeProjectionProfileId =
        liveSync.getActiveProjectionProfileId?.() ?? null;
      // Phase 35-A's window.__ttbState pattern preserved for any IIFE that may
      // peek at it during load. Safe to keep — bootHandleUi reads from `state`
      // arg directly, not the global.
      window.__ttbState = _state;

      const polygonState = _buildPolygonStateStub(_state, boardAccess);
      const normalizers = _buildNormalizersStub();
      const interactions = _buildInteractionsStub();
      const persistence = _buildPersistenceStub(liveSync);
      const sync = _buildSyncStubs();
      const dashboard = _buildDashboardStubs();

      // Find the <video> element (passed-in or inferred from DOM)
      const v = videoEl
        || document.querySelector("video.ssr-video, video#ssr-video, video");

      // Stop any previous handle (idempotent re-activation, e.g. profile switch)
      if (_currentBootHandle) {
        try { _currentBootHandle.stop?.(); } catch { /* listener guard */ }
        _currentBootHandle = null;
      }

      // Phase 36 A2: dynamic ES-module import of bootHandleUi (Option H).
      // The IIFE bundle loaded above registers the TT_BEAMER_RUNTIME_*
      // globals that bootHandleUi resolves internally.
      const { bootHandleUi } = await import("/src/app/runtime/output-receiver/boot-handle-ui.js");

      _currentBootHandle = bootHandleUi({
        stage: stageEl,
        roomOverlay: roomOverlayEl,
        videoEl: v || null,
        feedbackEl: null, // /output/ has no toast/feedback target
        state: _state,
        outputRole: "final-output",
        OUTPUT_ROLE_FINAL: "final-output",
        OUTPUT_ROLE_CONTROL: "control",
        liveSync,
        // Phase 36 A1: liveSyncCoreOverride routes grid-state's
        // broadcastGridSnapshot through emitLiveMutation on the /output/
        // websocket (instead of the dashboard's window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE
        // which doesn't exist on /output/'s thin script-tag set).
        liveSyncCoreOverride: { emitLiveMutation: liveSync.emitLiveMutation },
        polygonContract: polygonContract
          || (window.TT_BEAMER_POLYGON_CONTRACT ?? null),
        normalizers,
        boardAccess,
        polygonState,
        interactions,
        persistence,
        // Q1 LOCKED — existing endpoint per CONTEXT.md D-06 reconciliation.
        // The W0 wave added a `[align-mode-dirty] received dirty=` stdout marker
        // server-side that T9 grep-asserts after handle-ui posts here.
        alignModeDirtyEndpoint: "/api/align-mode-dirty",
        sync,
        dashboard,
        renderRoomOverlay: () => {
          try {
            window.TT_BEAMER_RUNTIME_POLYGON_EDITOR?.renderRoomOverlay?.();
          } catch (e) {
            logger?.warn?.("[align-loader] renderRoomOverlay:", e?.message);
          }
        },
        showToast: (...args) => { try { logger?.log?.("[output-toast]", ...args); } catch { /* logger guard */ } },
        getRenderMode: () => _state.renderMode || "auto",
        getBoardId: () => _state.boardId,
        logger,
      });

      window.__ttbAlignMode = _currentBootHandle;
      logger?.log?.("[align-loader] bootHandleUi wired with live boardAccess + Option H");

      // Phase 36 M3 T1 — wire videoEl resize/loadedmetadata to HANDLE_UI's
      // re-position so the handle-frame snaps to the stream-content bbox even
      // when the video element's intrinsic dimensions arrive late (WebRTC
      // track first frame, fullscreen toggle, network bitrate switch). This
      // is in addition to handle-ui's internal _attachVideoResizeListener
      // which already covers the typical case — adding the loader-level hook
      // gives defense-in-depth for the case where the video re-arrives AFTER
      // bootHandleUi has already initialized.
      const HANDLE_UI = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
      const _videoResize = () => {
        try {
          HANDLE_UI?.onWindowResize?.();
          window.TT_BEAMER_RUNTIME_POLYGON_EDITOR?.renderRoomOverlay?.();
        } catch (err) {
          logger?.warn?.(`[align-loader] _videoResize threw: ${err?.message || err}`);
        }
      };
      if (v) {
        try { v.addEventListener("loadedmetadata", _videoResize, { passive: true }); } catch {}
        try { v.addEventListener("resize", _videoResize, { passive: true }); } catch {}
        if (typeof ResizeObserver !== "undefined") {
          try {
            _videoResizeObserver = new ResizeObserver(_videoResize);
            _videoResizeObserver.observe(v);
          } catch (err) {
            logger?.warn?.(`[align-loader] ResizeObserver attach failed: ${err?.message || err}`);
          }
        }
        // One immediate pass after bootHandleUi to align with current bbox
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(_videoResize);
        }
        _videoEl = v;
        _videoResizeFn = _videoResize;
      }

      // Trigger renderRoomOverlay manually — bootHandleUi wires the
      // onAlignModeChange listener to HANDLE_UI for handle visibility,
      // but it does NOT explicitly re-render the polygon-editor overlay
      // on activation. Without this call the SVG <#room-overlay> stays
      // empty until something else triggers a re-render.
      try {
        const PE = window.TT_BEAMER_RUNTIME_POLYGON_EDITOR;
        if (PE && typeof PE.renderRoomOverlay === "function") {
          PE.renderRoomOverlay();
          logger?.log?.("[align-loader] renderRoomOverlay() called");
        }
      } catch (e) {
        logger?.warn?.("[align-loader] initial renderRoomOverlay failed:", e?.message);
      }

      // Phase 38 W4 (2026-05-11): SEED Pi's grid from the server's
      // authoritative snapshot BEFORE the iter2-h2 defensive broadcast.
      //
      // Background: Pi /output/ does NOT load grid-state in its thin script
      // set — that module is part of the IIFE bundle loaded above (in
      // loadBundleOnce()). The W2/W3 wiring in output-live-sync.js routes
      // every incoming align-grid-snapshot through _applyAlignGridSnapshot;
      // when called BEFORE the bundle is loaded (live-hello, 1Hz poll)
      // the apply silently no-ops because window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE
      // doesn't exist yet. With W4's caching, that silent path now stashes
      // the latest snap in _pendingGridSnapshot.
      //
      // Drain the cache NOW — grid-state has just been loaded by the
      // bundle and bootHandleUi has just initialized handle-ui to read
      // from it. The pending snap (if any) is the latest authoritative
      // grid the server has seen (e.g. the dashboard's just-loaded 9×9
      // xrandrv2 profile). Applying it here means the iter2-h2 broadcast
      // below carries the CORRECT grid instead of Pi's 3×3 default.
      //
      // Without this seed, the iter2-h2 broadcast emits Pi's 3×3 identity,
      // server records it as the authoritative lastAlignGridSnapshot, and
      // fans out to SSR + dashboard — wiping the operator's loaded profile.
      // Operator UAT 2026-05-11 reproduces this as the "complex profile
      // desync" (Bug 3) and as part of the "lines snap back" feedback
      // (Bug 1 — same wipe mechanism).
      try {
        let seeded = false;
        if (typeof liveSync.applyPendingGridSnapshot === "function") {
          seeded = liveSync.applyPendingGridSnapshot();
          if (seeded) {
            logger?.log?.("[align-loader] W4 seed: applied pending grid snapshot from cache");
          }
        }
        // Even if the cache was empty (e.g. server hasn't broadcast any
        // grid yet), fetch /api/live/snapshot directly as a belt-and-braces
        // measure. The 1Hz poll will eventually catch up but the iter2-h2
        // broadcast fires immediately below, so we MUST have the server
        // state before broadcasting.
        if (!seeded) {
          try {
            const resp = await fetch("/api/live/snapshot");
            if (resp.ok) {
              const j = await resp.json();
              const snap = j?.snapshot ?? j?.session?.snapshot ?? j ?? {};
              const gridSnap = snap?.runtime?.lastAlignGridSnapshot;
              if (gridSnap && Array.isArray(gridSnap.srcXs)
                  && Array.isArray(gridSnap.srcYs)
                  && Array.isArray(gridSnap.points)) {
                const gs = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
                const localClientId = liveSync.getCurrentClientId?.() ?? null;
                const isOriginator = !!localClientId
                  && gridSnap.originatorClientId === localClientId;
                if (gs && typeof gs.restoreGridSnapshot === "function"
                    && !isOriginator) {
                  const points2D = [];
                  for (let r = 0; r < gridSnap.srcYs.length; r++) {
                    points2D[r] = [];
                    for (let c = 0; c < gridSnap.srcXs.length; c++) {
                      points2D[r][c] = { x: gridSnap.srcXs[c], y: gridSnap.srcYs[r] };
                    }
                  }
                  for (const pt of gridSnap.points) {
                    if (Number.isInteger(pt.row) && Number.isInteger(pt.col)
                        && points2D[pt.row] && points2D[pt.row][pt.col]) {
                      points2D[pt.row][pt.col] = { x: pt.x, y: pt.y };
                    }
                  }
                  gs.restoreGridSnapshot({
                    srcXs: gridSnap.srcXs.slice(),
                    srcYs: gridSnap.srcYs.slice(),
                    points: points2D,
                  });
                  const ui = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
                  try { ui?.rebuildHandleElements?.(); } catch {}
                  try { ui?.positionHandles?.(); } catch {}
                  try { ui?.positionRotateHandles?.(); } catch {}
                  try { ui?.drawLines?.(); } catch {}
                  seeded = true;
                  logger?.log?.("[align-loader] W4 seed: applied grid from /api/live/snapshot fetch");
                }
              }
            }
          } catch (err) {
            logger?.warn?.("[align-loader] W4 seed snapshot-fetch threw:", err?.message || err);
          }
        }
        if (!seeded) {
          logger?.log?.("[align-loader] W4 seed: no pending grid + no server grid — Pi will broadcast its initialized default");
        }
      } catch (err) {
        logger?.warn?.("[align-loader] W4 seed failed:", err?.message || err);
      }

      // Phase 38 W8 (2026-05-11): REMOVED Pi /output/'s defensive activate
      // broadcast (formerly Phase 36 iter2 h2/h3). Pi /output/ is a downstream
      // CONSUMER of the server's authoritative align-grid-snapshot, not a
      // PRODUCER on activate. It pulls via:
      //   1. live-hello envelope (output-live-sync.js dispatch → cache or apply)
      //   2. 1Hz GET /api/live/snapshot poll (output-live-sync.js pollOnce)
      //   3. WS live-session-update broadcasts (output-live-sync.js dispatch)
      //   4. W4 drain on align-mode activate (applyPendingGridSnapshot)
      // All four paths apply server's state TO Pi. Pi has no NEW information
      // about the grid that the server doesn't already have on activate.
      //
      // The defensive broadcast (h2/h3) was added 2026-05-10 to fix bug:
      //   "Profile-load on dashboard shows new lines on /output/ but stream
      //    doesn't update until a small drag."
      // That bug was actually a SEPARATE issue (W5 — SSR cold-boot fallback +
      // W6 — picker dimension change). W2/W3/W4 + W7 together now keep SSR
      // in lockstep with the authoritative server state via SSR's own poll
      // eager-apply path. Pi's defensive activate broadcast no longer serves
      // a purpose — it only causes harm:
      //
      // Bug (operator UAT 2026-05-11 post-W7): Pi's defensive broadcast
      // emitted with profileId=`unsaved-<boardId>` whenever
      // `_loadedProfileName` was null (fresh Pi LS, no profile match).
      // grid-state.broadcastGridSnapshot synthesizes the unsaved-* label;
      // server.mjs:1245-1277's align-grid-snapshot mutation handler
      // PERSISTS this synthetic profileId into runtime-active-grid.json
      // via persistActiveGrid, OVERWRITING the operator's previously-saved
      // profileId (e.g. `test`). Next server boot loads the corrupted
      // state — and the corruption compounds: every Pi-/output/ align-mode
      // activation re-clobbers the disk file.
      //
      // W8 fix (Fix B from 38-DEBUG-W8.md): remove the broadcast entirely.
      // W4's drain ensures Pi's local grid matches server's state by the
      // time activate() reaches this point; no broadcast needed because
      // the server already HAS the authoritative state. This mirrors W7
      // (SSR suppresses its own onAlignModeChange broadcast for the same
      // reason — SSR is a consumer, not a producer, on align-toggle).
      logger?.log?.(
        "[align-loader] post-activate broadcast SUPPRESSED (W8: Pi /output/ pulls, never pushes — mirrors W7 for SSR)",
      );
    } catch (err) {
      logger?.error?.("[align-loader] activate failed:", err);
    }
  }

  function deactivate() {
    document.body.classList.remove("align-mode-active");
    if (_currentBootHandle) {
      try { _currentBootHandle.stop?.(); } catch (e) { logger?.warn?.("[align-loader] stop threw:", e?.message); }
      _currentBootHandle = null;
    }
    // Phase 36 M3 T1 — tear down the videoEl resize listeners + ResizeObserver
    // so a subsequent re-activation builds a fresh wiring against the (possibly
    // new) <video> element.
    try {
      if (_videoEl && _videoResizeFn) {
        try { _videoEl.removeEventListener("loadedmetadata", _videoResizeFn); } catch {}
        try { _videoEl.removeEventListener("resize", _videoResizeFn); } catch {}
      }
      if (_videoResizeObserver) {
        try { _videoResizeObserver.disconnect(); } catch {}
      }
    } catch (e) {
      logger?.warn?.("[align-loader] _videoResize teardown:", e?.message);
    }
    _videoEl = null;
    _videoResizeFn = null;
    _videoResizeObserver = null;
    // Optionally hide the stage so it doesn't intercept layout queries while
    // align-mode is OFF. handle-ui's stop() removes its handle DOM children
    // already; hiding the host is a defensive nicety.
    const stage = document.getElementById("stage");
    if (stage) stage.style.display = "none";
    window.__ttbAlignMode = null;
  }

  // Subscribe to align-mode toggles
  liveSync.onAlignModeChange((active) => {
    if (active) activate();
    else deactivate();
  });

  // Phase 36 iter2 h7 (2026-05-10): h6 reverted — the permanent
  // onConnect broadcast caused storm-of-broadcasts on unstable WS
  // (each reconnect fired a force broadcast → smoothness regression
  // reported by operator). The proper fix is QUEUE-AND-FLUSH inside
  // output-live-sync.js itself, so any emit during WS down/closing
  // is retried on the next onopen — no caller awareness required.
  // See output-live-sync.js's _pendingLatestByType + flush-on-open.

  // Refetch board data when the projection profile changes (operator
  // switched boards or applied a new profile)
  if (typeof liveSync.onProjectionProfileChange === "function") {
    liveSync.onProjectionProfileChange(async () => {
      await refreshBoardCatalog();
      await refreshSelectedBoard();
      // If align-mode is currently active, the board may have changed
      // — re-activate so the polygon-editor reads the new state.
      if (liveSync.getAlignMode?.() === true) {
        await activate();
      }
    });
  }

  // If liveSync already knew alignMode=true at subscribe time (race
  // with the live-hello envelope), trigger activation now.
  if (liveSync.getAlignMode?.() === true) activate();

  // Background prefetch: kick off bundle download + board fetch after
  // WebRTC stabilizes so the first activation is cache-hit-fast.
  setTimeout(() => {
    if (stopped) return;
    loadBundleOnce().catch((e) => logger?.warn?.("[align-loader] prefetch bundle:", e?.message));
    refreshBoardCatalog().catch(() => {});
    refreshSelectedBoard().catch(() => {});
  }, PREFETCH_DELAY_MS);

  return {
    stop() {
      stopped = true;
      deactivate();
    },
  };
}
