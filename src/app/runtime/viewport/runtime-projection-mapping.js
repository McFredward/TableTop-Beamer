// Unified Grid Projection System.
//
// Replaces the dual 4-corner + grid-mesh approach with ONE unified grid.
// The grid IS the projection — corners, edges, and interior points are
// all part of the same grid.  Default 4x4 = 5x5 = 25 control points.
//
// - The 4 corner points control the CSS matrix3d perspective transform
//   on .stage (same homography math as the original CSS-matrix3d implementation).
// - Edge points are constrained to their axis.
// - Interior points move freely for local canvas distortion.
// - Grid lines are draggable as whole rows/columns.
// - Right-click context menu to add/remove lines.
//
// Post-draw mesh warp: after the main draw() completes, if any interior
// points are displaced, a per-cell drawImage pass deforms the canvas
// content.  Zero overhead when no interior displacements exist.
//
// Persistence: localStorage key "tt-beamer.projection-mapping-v2".
// Falls back to old key "tt-beamer.projection-mapping.corners" for
// migration of the 4-corner positions.
(() => {
  let ctx = null;

  // Grid state, helpers, undo, persistence, and resetGrid live in
  // runtime-projection-grid-state.js (W3.2-C1). Destructure into local
  // bindings so the still-in-shim functions (handle UI, GL/2D
  // renderers, profile flows) can reference them by bare identifier
  // exactly as they did pre-split.
  const gridState = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
  const {
    grid,
    getPoint,
    setPoint,
    hasGridDisplacements,
    saveToLocalStorage,
    loadFromLocalStorage,
    pushUndo,
    undo,
    clearUndo,
    resetGrid,
    getCorners,
    buildDefaultPoints,
  } = gridState;

  // GL renderer (W3.2-C2). Aliased to _postDrawMeshWarpGL so the
  // postDrawMeshWarp body still calls it as a bare identifier.
  const glRenderer = window.TT_BEAMER_RUNTIME_PROJECTION_GL_RENDERER;
  const _postDrawMeshWarpGL = glRenderer.postDrawMeshWarpGL;

  // 2D-fallback renderer (W3.2-C3). Imports postDrawMeshWarp2D for
  // the GL-fallback branch in postDrawMeshWarp.
  const fallback = window.TT_BEAMER_RUNTIME_PROJECTION_2D_FALLBACK_RENDERER;
  const { postDrawMeshWarp2D } = fallback;

  // Handle UI (W3.2-C4). Imports the public surface so the shim's
  // public API can delegate to it; showContextMenu is destructured
  // back into the shim so showProfilePickerMenu (still in shim
  // until W3.2-C5 moves profile flows) keeps working.
  const handleUi = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
  const {
    showHandles,
    hideHandles,
    onAlignModeChange,
    showContextMenu,
  } = handleUi;

  /**
   * Remap a normalized point (0-1) through the grid distortion.
   * Splits each cell into 2 triangles along the TL-BR diagonal and uses
   * barycentric coords within the triangle. This matches the canvas mesh
   * warp (which uses the same triangulation) so SVG contours and canvas
   * animations stay perfectly aligned. Returns { x, y } in 0-1 range.
   */
  function remapPoint(nx, ny) {
    if (!hasGridDisplacements()) return { x: nx, y: ny };
    let ci = 0, ri = 0;
    for (let i = 0; i < grid.srcXs.length - 1; i++) {
      if (nx <= grid.srcXs[i + 1] || i === grid.srcXs.length - 2) { ci = i; break; }
    }
    for (let i = 0; i < grid.srcYs.length - 1; i++) {
      if (ny <= grid.srcYs[i + 1] || i === grid.srcYs.length - 2) { ri = i; break; }
    }
    const sx = grid.srcXs[ci + 1] - grid.srcXs[ci];
    const sy = grid.srcYs[ri + 1] - grid.srcYs[ri];
    const tx = sx > 1e-10 ? (nx - grid.srcXs[ci]) / sx : 0;
    const ty = sy > 1e-10 ? (ny - grid.srcYs[ri]) / sy : 0;
    const tl = getPoint(ri, ci);
    const tr = getPoint(ri, ci + 1);
    const bl = getPoint(ri + 1, ci);
    const br = getPoint(ri + 1, ci + 1);
    // Split cell by TL-BR diagonal:
    //  tx >= ty → upper-right triangle (TL, TR, BR)
    //  tx <  ty → lower-left  triangle (TL, BR, BL)
    if (tx >= ty) {
      const aTL = 1 - tx;
      const aTR = tx - ty;
      const aBR = ty;
      return {
        x: aTL * tl.x + aTR * tr.x + aBR * br.x,
        y: aTL * tl.y + aTR * tr.y + aBR * br.y,
      };
    } else {
      const aTL = 1 - ty;
      const aBR = tx;
      const aBL = ty - tx;
      return {
        x: aTL * tl.x + aBR * br.x + aBL * bl.x,
        y: aTL * tl.y + aBR * br.y + aBL * bl.y,
      };
    }
  }

  // ── Apply transform (no-op — all warping is done via canvas mesh) ──────────

  function applyTransform() {
    // Unified grid warps via canvas mesh (see postDrawMeshWarp) —
    // no CSS transform is applied from this module. We must NOT touch
    // stage.style.transform here, because the CONTROL client's .stage
    // carries the zoom/pan CSS rule `translate(var(--stage-pan-x), …)
    // scale(var(--stage-zoom-scale))` and writing `transform: none`
    // would make mouse-wheel/pinch zoom invisible.
  }

  // ── Post-draw mesh warp ────────────────────────────────────────────────────
  //
  // Called from the draw loop after all rendering completes.
  // If any non-corner grid points are displaced, takes a snapshot of the
  // canvas content and redraws it through the displaced grid mesh.
  //
  // GL state + _initMeshWarpGL + _postDrawMeshWarpGL moved to
  // runtime-projection-gl-renderer.js (W3.2-C2).
  // 2D-fallback state + drawAffineTriangle + the inline 2D body of
  // postDrawMeshWarp moved to runtime-projection-2d-fallback-renderer.js
  // (W3.2-C3) — see postDrawMeshWarp2D below.

  function postDrawMeshWarp(canvas, canvasCtx) {
    if (!ctx || ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) return;
    const isOutput = ctx.outputRole === ctx.OUTPUT_ROLE_FINAL;
    const glCanvasEl = isOutput ? document.getElementById("fx-gl-canvas") : null;
    if (!hasGridDisplacements()) {
      // No active warp — fx-canvas content is shown directly. Hide
      // the GL overlay so it can't display a stale frame.
      if (glCanvasEl && glCanvasEl.style.display !== "none") {
        glCanvasEl.style.display = "none";
      }
      return;
    }

    // WebGL path eliminates the per-triangle clip
    // seams that were visible on MP4 content. Falls back to the 2D
    // path below only if GL init fails (ancient browser / no GPU).
    if (_postDrawMeshWarpGL(canvas, canvasCtx)) {
      // In /output/ the GL canvas is the visible
      // surface, so show it now that we know it has fresh content.
      if (glCanvasEl && glCanvasEl.style.display !== "block") {
        glCanvasEl.style.display = "block";
      }
      return;
    }
    // GL failed — fall back to 2D warp on fx-canvas. Hide the GL
    // overlay so its (possibly stale) content can't show through.
    if (glCanvasEl && glCanvasEl.style.display !== "none") {
      glCanvasEl.style.display = "none";
    }
    // 2D mesh-warp body lives in postDrawMeshWarp2D (W3.2-C3).
    postDrawMeshWarp2D(canvas, canvasCtx);
  }

  // Handle UI (state, handles, rotate, lines, drag, arrow key,
  // context menu) moved to runtime-projection-handle-ui.js
  // (W3.2-C4). The shim destructures handle-ui exports below;
  // showContextMenu is destructured back so the still-in-shim
  // showProfilePickerMenu (W3.2-C5 will move it) keeps working.


  // ── Server-side profile flows ──────────────────────────────────────────────

  function getCurrentBoardId() {
    try {
      return typeof ctx?.getBoardId === "function" ? ctx.getBoardId() : null;
    } catch { return null; }
  }

  function buildGridPayload() {
    const pointsArr = [];
    for (let row = 0; row < grid.srcYs.length; row++) {
      for (let col = 0; col < grid.srcXs.length; col++) {
        const pt = getPoint(row, col);
        pointsArr.push({ row, col, x: pt.x, y: pt.y });
      }
    }
    return { srcXs: grid.srcXs.slice(), srcYs: grid.srcYs.slice(), points: pointsArr };
  }

  function applyGridPayload(data) {
    if (!data || typeof data !== "object") return;
    if (Array.isArray(data.srcXs) && data.srcXs.length >= 2) {
      grid.srcXs = data.srcXs.filter((v) => typeof v === "number").slice().sort((a, b) => a - b);
    }
    if (Array.isArray(data.srcYs) && data.srcYs.length >= 2) {
      grid.srcYs = data.srcYs.filter((v) => typeof v === "number").slice().sort((a, b) => a - b);
    }
    buildDefaultPoints();
    if (Array.isArray(data.points)) {
      for (const p of data.points) {
        if (typeof p.row === "number" && typeof p.col === "number"
          && typeof p.x === "number" && typeof p.y === "number") {
          setPoint(p.row, p.col, p.x, p.y);
        }
      }
    }
  }

  async function profileSaveFlow() {
    const boardId = getCurrentBoardId();
    if (!boardId) { alert("No board selected."); return; }
    const name = window.prompt("Profile name:", "");
    if (!name || !name.trim()) return;
    try {
      const resp = await fetch("/api/projection-profiles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId, name: name.trim(), data: buildGridPayload() }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } catch (err) {
      alert("Save failed: " + (err?.message || err));
    }
  }

  async function fetchProfileList(boardId) {
    const resp = await fetch(`/api/projection-profiles?boardId=${encodeURIComponent(boardId)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const body = await resp.json();
    return Array.isArray(body?.names) ? body.names : [];
  }

  async function profileLoadFlow() {
    const boardId = getCurrentBoardId();
    if (!boardId) { alert("No board selected."); return; }
    let names;
    try {
      names = await fetchProfileList(boardId);
    } catch (err) {
      alert("Could not fetch profiles: " + (err?.message || err));
      return;
    }
    if (names.length === 0) { alert("No saved profiles for this board."); return; }
    showProfilePickerMenu(names, async (name) => {
      try {
        const resp = await fetch(`/api/projection-profiles/load?boardId=${encodeURIComponent(boardId)}&name=${encodeURIComponent(name)}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const body = await resp.json();
        pushUndo();
        applyGridPayload(body?.data);
        saveToLocalStorage();
        if (handlesVisible) { rebuildHandleElements(); drawLines(); positionRotateHandles(); }
        applyTransform();
        if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
      } catch (err) {
        alert("Load failed: " + (err?.message || err));
      }
    });
  }

  async function profileDeleteFlow() {
    const boardId = getCurrentBoardId();
    if (!boardId) { alert("No board selected."); return; }
    let names;
    try {
      names = await fetchProfileList(boardId);
    } catch (err) {
      alert("Could not fetch profiles: " + (err?.message || err));
      return;
    }
    if (names.length === 0) { alert("No saved profiles to delete."); return; }
    showProfilePickerMenu(names, async (name) => {
      if (!confirm(`Delete profile "${name}"?`)) return;
      try {
        const resp = await fetch(`/api/projection-profiles?boardId=${encodeURIComponent(boardId)}&name=${encodeURIComponent(name)}`, { method: "DELETE" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } catch (err) {
        alert("Delete failed: " + (err?.message || err));
      }
    });
  }

  function showProfilePickerMenu(names, onPick) {
    // Put the menu at the center of the viewport
    const items = names.map((name) => ({
      label: name,
      action: () => onPick(name),
    }));
    items.push({ label: "Cancel", action: () => {} });
    showContextMenu(Math.round(window.innerWidth / 2), Math.round(window.innerHeight / 2), items);
  }

  // showContextMenu / dismissContextMenu / dismissContextMenuOnOutside,
  // Grid line add/remove (addHorizontalLine, addVerticalLine,
  // removeHorizontalLine, removeVerticalLine), showHandles,
  // hideHandles, and onAlignModeChange moved to
  // runtime-projection-handle-ui.js (W3.2-C4). The shim's
  // showProfilePickerMenu still calls showContextMenu via the
  // handle-ui destructure at the top of this IIFE.


  // ── Resize handling ────────────────────────────────────────────────────────

  function onWindowResize() {
    if (!ctx || ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) return;
    applyTransform();
    if (handlesVisible) {
      positionHandles();
      positionRotateHandles();
      drawLines();
    }
  }

  // Persistence (LS_KEY_V2, LS_KEY_OLD, saveToLocalStorage,
  // loadFromLocalStorage) and getCorners moved to
  // runtime-projection-grid-state.js (W3.2-C1).

  // ── Legacy compat ──────────────────────────────────────────────────────────

  function getCornersForPersistence() {
    return getCorners();
  }

  function loadCornersFromConfig(_globalDefaults) {
    // Legacy no-op — persistence is now via localStorage only
  }

  function resetCorners() {
    resetGrid();
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init(dependencies) {
    ctx = dependencies;
    // grid-state's undo() / resetGrid() bodies reference
    // rebuildHandleElements / positionRotateHandles / drawLines /
    // applyTransform / handlesVisible. After W3.2-C4 those handle-UI
    // functions live in handle-ui's IIFE; we forward handle-ui's
    // exports as the cross-module callbacks for grid-state.
    gridState.init(Object.assign({}, dependencies, {
      rebuildHandleElements: handleUi.rebuildHandleElements,
      positionRotateHandles: handleUi.positionRotateHandles,
      drawLines: handleUi.drawLines,
      applyTransform,
    }));
    // GL renderer (W3.2-C2): hand it ctx + grid + getPoint so its
    // moved bodies can resolve `grid.srcXs` / `getPoint(...)` via
    // IIFE-local refs.
    glRenderer.init(Object.assign({}, dependencies, {
      grid,
      getPoint,
    }));
    // 2D-fallback renderer (W3.2-C3): same grid/getPoint injection.
    fallback.init(Object.assign({}, dependencies, {
      grid,
      getPoint,
    }));
    // Handle UI (W3.2-C4): grid-state refs + applyTransform (shim) +
    // profile flow callbacks (still in shim until W3.2-C5) +
    // setGridStateHandlesVisible setter so its handlesVisible mirrors
    // into grid-state.
    handleUi.init(Object.assign({}, dependencies, {
      grid,
      getPoint,
      setPoint,
      pushUndo,
      undo,
      clearUndo,
      saveToLocalStorage,
      resetGrid,
      applyTransform,
      profileSaveFlow,
      profileLoadFlow,
      profileDeleteFlow,
      gridState,
    }));
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING = {
    init,
    applyTransform,
    showHandles,
    hideHandles,
    onAlignModeChange,
    onWindowResize,
    resetCorners,
    loadCornersFromConfig,
    getCornersForPersistence,
    postDrawMeshWarp,
    remapPoint,
    hasGridDisplacements,
    getCorners,
    getGrid: () => ({ srcXs: grid.srcXs.slice(), srcYs: grid.srcYs.slice(), points: grid.points }),
    resetGrid,
  };
})();
