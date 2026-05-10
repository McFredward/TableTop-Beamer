// Phase 35-iter2 hotfix h1 — Lazy-load align-mode bundle on /output/.
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
// Strategy:
//   1. /output/ page load: only this loader module + 4 other thin
//      scripts (5 total), no align-mode IIFEs. WebRTC connects
//      without main-thread contention.
//   2. After WebRTC stabilizes (2s post-load), prefetch the IIFE
//      bundle in the background so it's in the browser cache when
//      the operator hits align-mode.
//   3. When liveSync.onAlignModeChange(true) fires: dynamic-load
//      the bundle (cache-hit instantly if prefetched, ~500ms
//      cold), fetch /api/boards + /api/live/snapshot, build a real
//      boardAccess wired to the live data, then call bootAlignMode().
//   4. When alignMode goes false: stop and remove the
//      `align-mode-active` body class (CSS hides handles).
//
// The IIFE scripts are NOT ES modules — they register on
// `window.TT_BEAMER_RUNTIME_*`. Dynamic `import()` does not work for
// them; we use programmatic `<script src=…>` injection instead, then
// poll `window` for the registration to complete.

const ALIGN_MODE_BUNDLE = [
  "/src/app/runtime/core/polygon-contract.js",
  "/src/app/runtime/state/runtime-polygon-normalizers.js",
  "/src/app/runtime/state/runtime-room-geometry.js",
  "/src/app/runtime/viewport/runtime-projection-grid-state.js",
  "/src/app/runtime/viewport/runtime-projection-gl-renderer.js",
  "/src/app/runtime/viewport/runtime-projection-2d-fallback-renderer.js",
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
 * data, and wires bootAlignMode with REAL polygon data.
 *
 * @param {Object} args
 * @param {HTMLElement} args.stage          - The <#stage> container.
 * @param {SVGElement}  args.roomOverlay    - The <#room-overlay> SVG.
 * @param {HTMLElement} [args.videoEl]      - The <#ssr-video> element.
 * @param {Object}      args.liveSync       - bootOutputLiveSync handle.
 * @param {Console}     [args.logger]
 * @returns {{ stop: () => void }}
 */
export function bootAlignModeLoader({
  stage, roomOverlay, videoEl, liveSync, logger = console,
}) {
  let runtimeBoards = [];
  let activeBoardId = null;
  let activeHandle = null;
  let stopped = false;

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

      const { bootAlignMode } = await import("/src/app/runtime/output-receiver/output-align-mode.js");
      const { polygonContract, normalizers } = getRequiredArgsAtBootTime();

      const noop = () => {};
      const noopReturnNull = () => null;
      const noopReturnFalse = () => false;
      const noopReturnTrue = () => true;
      const noopReturnEmptyArr = () => [];

      const state = window.__ttbState ?? {
        alignMode: true,
        boardId: activeBoardId,
        renderMode: "auto",
        polygonEditor: { activeRoomIdByBoard: {} },
        shipPolygonEditor: {
          dragVertexIndex: null, dragPointerId: null, dragBoardId: null,
          dragStartPoints: null, dragMoved: false,
          dragVertexOffsetX: 0, dragVertexOffsetY: 0, dragDomRefs: null,
        },
        runtime: { activeProjectionProfileId: liveSync.getActiveProjectionProfileId?.() ?? null },
      };
      // Keep state.boardId in sync with the operator's selection
      state.boardId = activeBoardId ?? state.boardId;
      state.alignMode = true;
      window.__ttbState = state;

      // Activate CSS gating BEFORE bootAlignMode renders — the
      // align-mode-active class is what makes #room-overlay visible
      // (src/styles.css:119). Without it, polygons render but stay hidden.
      document.body.classList.add("align-mode-active");

      const boardAccess = buildBoardAccess({
        getRuntimeBoards: () => runtimeBoards,
        getActiveBoardId: () => activeBoardId,
        logger,
      });

      if (activeHandle) { try { activeHandle.stop?.(); } catch {} activeHandle = null; }

      activeHandle = bootAlignMode({
        stage, roomOverlay, videoEl, state,
        outputRole: "final-output",
        OUTPUT_ROLE_FINAL: "final-output",
        OUTPUT_ROLE_CONTROL: "control",
        liveSync,
        polygonContract,
        normalizers,
        boardAccess,
        polygonState: {
          getActivePolygonRoomId: noopReturnNull, setActivePolygonRoomId: noop,
          isRoomFrozen: noopReturnFalse,
          getCurrentPolygonHandleScale: () => 1,
          getPolygonEditorHandleMetrics: () => ({ size: 12 }),
        },
        interactions: {
          beginPolygonDragInteraction: noop, endPolygonDragInteraction: noop,
          isPanArbitrating: noopReturnFalse, isAcceptablePolygonPointerEvent: noopReturnTrue,
          arePlayAreaVerticesEditable: noopReturnFalse, areRoomVerticesEditable: noopReturnFalse,
          mapClientPointToNormalized: (cx, cy) => [cx, cy],
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
          cacheShipPolygonDragDomRefs: noopReturnNull,
          cacheRoomPolygonDragDomRefs: noopReturnNull,
        },
        renderRoomOverlay: noop, // bootAlignMode falls back to POLYGON_EDITOR.renderRoomOverlay
        logger,
      });

      window.__ttbAlignMode = activeHandle;
      logger?.log?.("[align-loader] bootAlignMode wired with live boardAccess");

      // Trigger renderRoomOverlay manually — bootAlignMode wires the
      // onAlignModeChange listener to HANDLE_UI for handle visibility,
      // but it does NOT explicitly re-render the polygon-editor overlay
      // on activation. Without this call the SVG <#room-overlay> stays
      // empty until something else triggers a re-render. Per
      // runtime-polygon-editor.js renderRoomOverlay() — when alignMode is
      // true and outputRole=FINAL, it iterates board.rooms and draws
      // each polygon.
      try {
        const PE = window.TT_BEAMER_RUNTIME_POLYGON_EDITOR;
        if (PE && typeof PE.renderRoomOverlay === "function") {
          PE.renderRoomOverlay();
          logger?.log?.("[align-loader] renderRoomOverlay() called");
        }
      } catch (e) {
        logger?.warn?.("[align-loader] initial renderRoomOverlay failed:", e?.message);
      }
    } catch (err) {
      logger?.error?.("[align-loader] activate failed:", err);
    }
  }

  function deactivate() {
    document.body.classList.remove("align-mode-active");
    if (activeHandle) {
      try { activeHandle.stop?.(); } catch (e) { logger?.warn?.("[align-loader] stop threw:", e?.message); }
      activeHandle = null;
    }
    window.__ttbAlignMode = null;
  }

  // Subscribe to align-mode toggles
  liveSync.onAlignModeChange((active) => {
    if (active) activate();
    else deactivate();
  });

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
