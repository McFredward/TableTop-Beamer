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
    // B6 (Phase 27, hotfix h1): 80%-centered 3×3 grid — outer corners
    // displaced to 10%/90% so the GL mesh-warp actively shrinks the board
    // content into 80% of the screen. The original h0 implementation set
    // BOTH srcXs/srcYs and points to [0.10, 0.50, 0.90], which made
    // hasGridDisplacements() return false (points equal srcXs) — so the
    // GL warp was bypassed and the underlying fx-canvas continued to
    // render at 100% of the screen, with the alignment lines drawn at
    // 80% on top. Result: parts of the board fell outside the outermost
    // alignment lines.
    //
    // The fix: srcXs/srcYs cover the full source canvas (0..1), and the
    // points are pre-displaced to 0.10..0.90 so the GL warp samples the
    // entire board content and squishes it into the 80% destination box.
    // hasGridDisplacements() now returns true (point.x !== srcXs[col]),
    // so the GL warp activates on a fresh-default grid.
    //
    // D-07: still applies to FRESH profiles only; existing saved profiles
    // load verbatim via applyGridPayload(), which replaces both srcXs/srcYs
    // AND points wholesale.
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
  };
})();
