// Unified Grid Projection — grid state, helpers, persistence, undo.
//
// Sub-module of runtime-projection-mapping. Owns:
//  - The `grid` object (srcXs, srcYs, points).
//  - Read/write helpers (getPoint, setPoint, hasGridDisplacements).
//  - Undo stack (snapshotGridState, restoreGridSnapshot, pushUndo, undo,
//    clearUndo, MAX_UNDO).
//  - localStorage persistence (LS_KEY_V2, LS_KEY_OLD,
//    saveToLocalStorage, loadFromLocalStorage).
//  - Reset + legacy corner accessor (resetGrid, getCorners).
//
// External cross-module callbacks (rebuildHandleElements,
// positionRotateHandles, drawLines, applyTransform) and the
// handlesVisible flag are injected via init({ ... }) and via the
// setHandlesVisible setter (called by handle-ui whenever its local
// state changes). This keeps the moved function bodies byte-identical
// while avoiding double sources of truth for handlesVisible.
(() => {
  let ctx = null;

  // External callbacks supplied by the shim at init time. Declared as
  // IIFE-local lets so the moved function bodies (undo, resetGrid) can
  // reference them as bare identifiers exactly as they did pre-split.
  let rebuildHandleElements = () => {};
  let positionRotateHandles = () => {};
  let drawLines = () => {};
  let applyTransform = () => {};
  let handlesVisible = false;

  // Phase 36 A1 — optional live-sync-core override (RESEARCH §1.3 (ii)).
  // When non-null (set via init() from bootHandleUi's mappingDeps on /output/),
  // broadcastGridSnapshot routes through this object's emitLiveMutation
  // instead of the dashboard's window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE.
  // Dashboard path (override null) is byte-identical to pre-Phase-36 behavior.
  let _liveSyncCoreOverride = null;

  // ── State ───────────────────────────────────────────────────────────────────
  //
  // ONE unified grid system. Each intersection stores its own {x, y} position.
  // The grid deforms the canvas content via per-cell drawImage (mesh warp).
  // No separate CSS perspective — everything is canvas mesh warp.
  //
  // points[row][col] = { x, y } in normalized canvas coords (0-1).
  // Default: evenly spaced (srcXs[col], srcYs[row]).
  // Intersection handles: freely draggable in X+Y.
  // Line handles (between intersections): move entire row/column in one axis.

  // Legacy: kept for diagnostics. New defaults use buildNewProfileDefaultGrid() (B6).
  const DEFAULT_COUNT = 5; // 5 lines = 4 columns/rows

  function makeEvenLines(n) {
    const lines = [];
    for (let i = 0; i < n; i++) lines.push(i / (n - 1));
    return lines;
  }

  function buildNewProfileDefaultGrid() {
    // Phase-31 h21b (2026-05-06): RESTORED Phase-27 10%/90% inset default.
    // The h20 identity-default was reverted because:
    //   1. Saved profiles still have 10/90 corners; loading any of them
    //      after h20 ran produced an immediate dirty-flag ON because
    //      `isDirty()` compares the current grid (identity) against the
    //      loaded snapshot (10/90) and they differ. The dirty flag then
    //      blocks entering align mode.
    //   2. The user explicitly asked for the 80% box back ("Weiterhin
    //      füllt das default immer noch den gesamten Bildschirm und
    //      nicht wie zuvor 80% aus").
    //
    // The original "board overflows the outer lines" complaint is fixed
    // by h20's OTHER change — hiding fx-canvas while GL warp is active
    // (runtime-projection-mapping.js). With the 10/90 GL warp output now
    // being the ONLY visible surface, the user sees the board cleanly
    // shrunk into the 80% destination box, no leakage.
    const srcXs = [0.0, 0.5, 1.0];
    const srcYs = [0.0, 0.5, 1.0];
    const dstXs = [0.10, 0.50, 0.90];
    const dstYs = [0.10, 0.50, 0.90];
    const points = [];
    for (let row = 0; row < dstYs.length; row++) {
      points[row] = [];
      for (let col = 0; col < dstXs.length; col++) {
        points[row][col] = { x: dstXs[col], y: dstYs[row] };
      }
    }
    return { srcXs, srcYs, points };
  }

  const _newProfileDefault = buildNewProfileDefaultGrid();
  const grid = {
    srcXs: _newProfileDefault.srcXs.slice(),
    srcYs: _newProfileDefault.srcYs.slice(),
    // points[row][col] = { x, y }. h1: pre-displaced 80%-shrink default.
    points: _newProfileDefault.points.map((row) => row.map((p) => ({ x: p.x, y: p.y }))),
  };

  function buildDefaultPoints() {
    // Legacy: kept for callers that explicitly want identity (points==srcXs).
    // Fresh-profile defaults now use buildNewProfileDefaultGrid() which
    // produces displaced points; do NOT call this from resetGrid (h1).
    const pts = [];
    for (let row = 0; row < grid.srcYs.length; row++) {
      pts[row] = [];
      for (let col = 0; col < grid.srcXs.length; col++) {
        pts[row][col] = { x: grid.srcXs[col], y: grid.srcYs[row] };
      }
    }
    grid.points = pts;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getPoint(row, col) {
    return grid.points[row]?.[col] ?? { x: grid.srcXs[col] ?? 0, y: grid.srcYs[row] ?? 0 };
  }

  function setPoint(row, col, x, y) {
    if (grid.points[row]) grid.points[row][col] = { x, y };
  }

  /**
   * Phase 30 B1 h6: detect "trivial 4-corner-only" grids — grids where
   * every inner point lies on the bilinear interpolation of the 4 outer
   * corners. The user's default Phase-27-W4-h1 grid (10/90 inset, edge
   * midpoints at midline, center at center) is trivial. Squish-bar
   * adjustments and mid-line drags produce non-trivial grids. Trivial
   * grids can be rendered via CSS transform on the stage (GPU-compositor,
   * single-quad, seam-free), bypassing canvas mesh-warp entirely.
   */
  function isTrivialFourCornerGrid() {
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;
    if (rows < 2 || cols < 2) return true; // degenerate; treat as trivial
    const TL = grid.points[0]?.[0];
    const TR = grid.points[0]?.[cols - 1];
    const BL = grid.points[rows - 1]?.[0];
    const BR = grid.points[rows - 1]?.[cols - 1];
    if (!TL || !TR || !BL || !BR) return true;
    const TOL = 0.0015; // ~1.5 normalized units; ~3 px on 1920-wide canvas
    for (let row = 0; row < rows; row++) {
      const sy = grid.srcYs[row];
      // Bilinear interp of corners using src coords as weights
      // (since srcXs[0]=0 and srcXs[cols-1]=1 by construction for the
      // canonical default; we use grid.srcXs[col] / grid.srcYs[row]
      // as the parametric weights).
      const ty = (sy - grid.srcYs[0]) / Math.max(1e-9, grid.srcYs[rows - 1] - grid.srcYs[0]);
      for (let col = 0; col < cols; col++) {
        const sx = grid.srcXs[col];
        const tx = (sx - grid.srcXs[0]) / Math.max(1e-9, grid.srcXs[cols - 1] - grid.srcXs[0]);
        // Expected position: bilinear of 4 corners at (tx, ty).
        const expectedX = (1 - tx) * (1 - ty) * TL.x + tx * (1 - ty) * TR.x
                        + (1 - tx) * ty * BL.x + tx * ty * BR.x;
        const expectedY = (1 - tx) * (1 - ty) * TL.y + tx * (1 - ty) * TR.y
                        + (1 - tx) * ty * BL.y + tx * ty * BR.y;
        const actual = grid.points[row]?.[col];
        if (!actual) return false;
        if (Math.abs(actual.x - expectedX) > TOL) return false;
        if (Math.abs(actual.y - expectedY) > TOL) return false;
      }
    }
    return true;
  }

  function getCornerPoints() {
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;
    return {
      TL: grid.points[0]?.[0] ?? { x: 0, y: 0 },
      TR: grid.points[0]?.[cols - 1] ?? { x: 1, y: 0 },
      BR: grid.points[rows - 1]?.[cols - 1] ?? { x: 1, y: 1 },
      BL: grid.points[rows - 1]?.[0] ?? { x: 0, y: 1 },
    };
  }

  /** Check whether any points differ from their default positions. */
  function hasGridDisplacements() {
    // Tolerate sub-pixel float drift in saved grids
    // without triggering the full mesh-warp pass. The mesh-warp is
    // fundamentally seam-prone on MP4 content (per-triangle affine
    // transforms diverge in the clip-overlap region and sample
    // slightly different source colours), so only run it when the
    // user has a displacement big enough to matter. 0.001 normalized
    // ≈ 1 px on a 1000-px canvas — below that we stay identity.
    const THRESHOLD = 0.001;
    for (let row = 0; row < grid.srcYs.length; row++) {
      for (let col = 0; col < grid.srcXs.length; col++) {
        const pt = getPoint(row, col);
        if (Math.abs(pt.x - grid.srcXs[col]) > THRESHOLD || Math.abs(pt.y - grid.srcYs[row]) > THRESHOLD) {
          return true;
        }
      }
    }
    return false;
  }

  // ── Undo stack (grid state snapshots) ──────────────────────────────────────
  const MAX_UNDO = 50;
  let undoStack = [];

  function snapshotGridState() {
    return {
      srcXs: grid.srcXs.slice(),
      srcYs: grid.srcYs.slice(),
      points: grid.points.map((row) => row.map((p) => ({ x: p.x, y: p.y }))),
    };
  }

  function restoreGridSnapshot(snap) {
    if (!snap) return;
    grid.srcXs = snap.srcXs.slice();
    grid.srcYs = snap.srcYs.slice();
    grid.points = snap.points.map((row) => row.map((p) => ({ x: p.x, y: p.y })));
  }

  function pushUndo() {
    undoStack.push(snapshotGridState());
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }

  function clearUndo() {
    undoStack = [];
  }

  function undo() {
    if (undoStack.length === 0) return;
    restoreGridSnapshot(undoStack.pop());
    saveToLocalStorage();
    if (handlesVisible) {
      rebuildHandleElements();
      positionRotateHandles();
      drawLines();
    }
    applyTransform();
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
    try { window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE?.notifyDirtyChanged?.(); } catch {}
    // Phase-31 h30: undo is a grid mutation too — broadcast so the
    // SSR tab follows. force=true so the user's Ctrl+Z immediately
    // shows up in the streamed frame even at low drag rates.
    try { broadcastGridSnapshot({ force: true }); } catch {}
    // Phase-31 h36: same delayed-redraw fix as discardChanges. If the
    // synchronous redraw above happened against a stale videoEl layout
    // (immediately after a stream resize), an rAF retry catches the
    // fresh bounding rect and re-positions the handles + lines.
    try {
      if (handlesVisible) {
        window.requestAnimationFrame?.(() => {
          try { rebuildHandleElements(); positionRotateHandles(); drawLines(); }
          catch (_) {}
        });
      }
    } catch (_) {}
  }

  function resetGrid() {
    pushUndo();
    const fresh = buildNewProfileDefaultGrid();
    grid.srcXs = fresh.srcXs.slice();
    grid.srcYs = fresh.srcYs.slice();
    // h1: use displaced points from buildNewProfileDefaultGrid (NOT
    // buildDefaultPoints — which would set points == srcXs and disable
    // the warp, leaving the board at 100% while alignment lines render
    // at 80%).
    grid.points = fresh.points.map((row) => row.map((p) => ({ x: p.x, y: p.y })));
    applyTransform();
    try {
      localStorage.removeItem(LS_KEY_V2);
      localStorage.removeItem(LS_KEY_OLD);
    } catch { /* ignore */ }
    if (handlesVisible) { rebuildHandleElements(); drawLines(); positionRotateHandles(); }
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
    // Phase-31 h30: resetGrid is a major grid mutation — broadcast.
    try { broadcastGridSnapshot({ force: true }); } catch {}
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  const LS_KEY_V2 = "tt-beamer.projection-mapping-v2";
  const LS_KEY_OLD = "tt-beamer.projection-mapping.corners";

  function saveToLocalStorage() {
    try {
      // Serialize per-point grid state
      const pointsArr = [];
      for (let row = 0; row < grid.srcYs.length; row++) {
        for (let col = 0; col < grid.srcXs.length; col++) {
          const pt = getPoint(row, col);
          pointsArr.push({ row, col, x: pt.x, y: pt.y });
        }
      }
      localStorage.setItem(LS_KEY_V2, JSON.stringify({
        srcXs: grid.srcXs,
        srcYs: grid.srcYs,
        points: pointsArr,
      }));
    } catch {
      // ignore storage errors
    }
  }

  function loadFromLocalStorage() {
    try {
      const rawV2 = localStorage.getItem(LS_KEY_V2);
      if (rawV2) {
        const parsed = JSON.parse(rawV2);
        if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.srcXs) && parsed.srcXs.length >= 2) {
            grid.srcXs = parsed.srcXs.filter((v) => typeof v === "number" && v >= 0 && v <= 1);
            grid.srcXs.sort((a, b) => a - b);
          }
          if (Array.isArray(parsed.srcYs) && parsed.srcYs.length >= 2) {
            grid.srcYs = parsed.srcYs.filter((v) => typeof v === "number" && v >= 0 && v <= 1);
            grid.srcYs.sort((a, b) => a - b);
          }
          buildDefaultPoints(); // initialize grid
          if (Array.isArray(parsed.points)) {
            for (const p of parsed.points) {
              if (typeof p.row === "number" && typeof p.col === "number"
                && typeof p.x === "number" && typeof p.y === "number") {
                setPoint(p.row, p.col, p.x, p.y);
              }
            }
          }
          return;
        }
      }
    } catch {
      // ignore corrupt localStorage
    }
  }

  // ── Legacy compat ──────────────────────────────────────────────────────────

  function getCorners() {
    const lastRow = grid.srcYs.length - 1;
    const lastCol = grid.srcXs.length - 1;
    const tl = getPoint(0, 0);
    const tr = getPoint(0, lastCol);
    const br = getPoint(lastRow, lastCol);
    const bl = getPoint(lastRow, 0);
    return {
      topLeft:     { x: tl.x * 100, y: tl.y * 100 },
      topRight:    { x: tr.x * 100, y: tr.y * 100 },
      bottomRight: { x: br.x * 100, y: br.y * 100 },
      bottomLeft:  { x: bl.x * 100, y: bl.y * 100 },
    };
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init(dependencies) {
    ctx = dependencies;
    // Cross-module callbacks (provided by shim).
    if (typeof dependencies?.rebuildHandleElements === "function") rebuildHandleElements = dependencies.rebuildHandleElements;
    if (typeof dependencies?.positionRotateHandles === "function") positionRotateHandles = dependencies.positionRotateHandles;
    if (typeof dependencies?.drawLines === "function") drawLines = dependencies.drawLines;
    if (typeof dependencies?.applyTransform === "function") applyTransform = dependencies.applyTransform;
    // Phase 36 A1 — optional liveSyncCoreOverride DI (RESEARCH §1.3 (ii)).
    // Dashboard never passes this → null → broadcastGridSnapshot falls back to
    // window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE (existing path). /output/ passes
    // a {emitLiveMutation} object via bootHandleUi → bypasses the window global.
    _liveSyncCoreOverride = (dependencies && typeof dependencies.liveSyncCoreOverride === "object" && dependencies.liveSyncCoreOverride) || null;
    loadFromLocalStorage();
  }

  // Setter so handle-ui (post-W3.2-C4) can mirror its local
  // handlesVisible flag into this module without breaking byte-identical
  // body source for undo() / resetGrid() (which read `handlesVisible`
  // as a bare identifier). The listener registry (W3.2-C5) lets other
  // sub-modules (profile-persistence) subscribe so their own
  // handlesVisible mirror stays in sync.
  const _handlesVisibleListeners = [];
  function setHandlesVisible(v) {
    handlesVisible = v;
    for (const cb of _handlesVisibleListeners) {
      try { cb(v); } catch { /* listener guard */ }
    }
  }
  function addHandlesVisibleListener(cb) {
    if (typeof cb === "function") _handlesVisibleListeners.push(cb);
  }

  // Phase 31 h30 (2026-05-06) — broadcast the full grid to the SSR
  // Chromium tab so its mesh-warp matches Pi's local handle-drag in
  // real time. Throttled to ~30 Hz: rAF cadence is enough for the
  // streamed encoded frames (typically 30 fps), and avoids hammering
  // /api/live/command at the native pointermove rate (~120 Hz).
  //
  // h31 (2026-05-06): no alignMode gate — grid-state's ctx is the
  // projection-mapping shim's dependency bag (outputRole, getBoardId,
  // getRenderMode, …) and does NOT carry the runtime state object,
  // so the previous `ctx.state.alignMode` check returned undefined
  // and the broadcast never fired. The receive side already filters
  // by alignActive (live-sync-core's fast-path) so we don't need a
  // local gate. Brief diagnostic log on each emit so the operator
  // can verify the round-trip from the server stdout.
  let _broadcastScheduled = false;
  let _broadcastLastEmittedAtMs = 0;
  let _broadcastLogCount = 0;
  const _BROADCAST_MIN_INTERVAL_MS = 33; // ~30 Hz
  function broadcastGridSnapshot({ force = false } = {}) {
    try {
      // Phase 36 A1 — prefer init-time-injected liveSyncCoreOverride (set by
      // bootHandleUi on /output/), fall back to the dashboard's window global.
      const liveSyncCore = _liveSyncCoreOverride || window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE;
      if (!liveSyncCore || typeof liveSyncCore.emitLiveMutation !== "function") {
        if (_broadcastLogCount < 3) {
          console.warn("[align-grid-snapshot] live-sync core not ready — broadcast skipped");
          _broadcastLogCount += 1;
        }
        return;
      }
      const profilePersist = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE;
      let profileId = profilePersist?.getLoadedProfileName?.() || null;
      if (typeof profileId !== "string" || profileId.length === 0) {
        // No saved profile loaded — synthesize a stable id derived from
        // the active board so the server-side V5 ASVS check passes.
        const boardId = profilePersist?.getCurrentBoardId?.() || "unknown";
        profileId = `unsaved-${String(boardId).slice(0, 180)}`;
      }
      const now = Date.now();
      if (!force && (now - _broadcastLastEmittedAtMs) < _BROADCAST_MIN_INTERVAL_MS) {
        if (_broadcastScheduled) return;
        _broadcastScheduled = true;
        const wait = _BROADCAST_MIN_INTERVAL_MS - (now - _broadcastLastEmittedAtMs);
        setTimeout(() => {
          _broadcastScheduled = false;
          broadcastGridSnapshot({ force: true });
        }, Math.max(1, wait));
        return;
      }
      _broadcastLastEmittedAtMs = now;
      // Compact "points" payload — server validates length === rows*cols.
      const points = [];
      for (let row = 0; row < grid.srcYs.length; row++) {
        for (let col = 0; col < grid.srcXs.length; col++) {
          const pt = getPoint(row, col);
          points.push({ row, col, x: pt.x, y: pt.y });
        }
      }
      // First N broadcasts log so operator can confirm the path works.
      // Subsequent ones (during dense drags at ~30 Hz) stay quiet.
      if (_broadcastLogCount < 5 || force) {
        const corners = `(${grid.points[0]?.[0]?.x?.toFixed(2)},${grid.points[0]?.[0]?.y?.toFixed(2)})..`
          + `(${grid.points[grid.srcYs.length - 1]?.[grid.srcXs.length - 1]?.x?.toFixed(2)},${grid.points[grid.srcYs.length - 1]?.[grid.srcXs.length - 1]?.y?.toFixed(2)})`;
        const msg = `EMIT force=${force} corners=${corners} profile=${profileId}`;
        try {
          const ui = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
          if (ui && typeof ui.piDiag === "function") {
            ui.piDiag("align-grid-snapshot", msg);
          } else {
            console.log(`[align-grid-snapshot] ${msg}`);
          }
        } catch (_) {
          console.log(`[align-grid-snapshot] ${msg}`);
        }
        _broadcastLogCount += 1;
      }
      void liveSyncCore.emitLiveMutation("align-grid-snapshot", {
        srcXs: grid.srcXs.slice(),
        srcYs: grid.srcYs.slice(),
        points,
        profileId,
      });
    } catch (err) {
      // Never let a broadcast error break the local drag.
      console.warn("[align-grid-snapshot] broadcast failed:", err?.message || err);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE = {
    init,
    grid,
    getPoint,
    setPoint,
    hasGridDisplacements,
    saveToLocalStorage,
    loadFromLocalStorage,
    pushUndo,
    undo,
    clearUndo,
    snapshotGridState,
    restoreGridSnapshot,
    LS_KEY_V2,
    LS_KEY_OLD,
    MAX_UNDO,
    getCorners,
    resetGrid,
    getGrid: () => ({ srcXs: grid.srcXs.slice(), srcYs: grid.srcYs.slice(), points: grid.points }),
    setHandlesVisible,
    addHandlesVisibleListener,
    buildDefaultPoints,
    buildNewProfileDefaultGrid,
    isTrivialFourCornerGrid,
    getCornerPoints,
    // Phase 31 h30: full-grid broadcast for handle-drag → SSR tab sync.
    broadcastGridSnapshot,
  };
})();
