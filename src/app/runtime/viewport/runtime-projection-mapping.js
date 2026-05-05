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

  // Grid state lives in runtime-projection-grid-state.js (W3.2-C1).
  // Destructure into local bindings so the shim's remaining functions
  // (remapPoint, postDrawMeshWarp, getCornersForPersistence,
  // resetCorners, getGrid arrow) and its init forwarders can reference
  // them by bare identifier.
  const gridState = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
  const {
    grid,
    getPoint,
    setPoint,
    hasGridDisplacements,
    saveToLocalStorage,
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
  // public API can delegate to it. onWindowResize moved with the
  // handle-UI state in W3.2-C6 since its body reads handlesVisible /
  // positionHandles / positionRotateHandles / drawLines.
  const handleUi = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
  const {
    showHandles,
    hideHandles,
    onAlignModeChange,
    onWindowResize,
  } = handleUi;

  // Profile persistence (W3.2-C5). Imports the profile flow callbacks
  // so the shim can forward them into handle-ui's init (consumed by
  // its context-menu items).
  const profilePersistence = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE;
  const {
    profileLoadFlow,
    profileDeleteFlow,
    saveLoadedProfileFlow,
  } = profilePersistence;

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

  // ── Apply transform — Phase 30 B1 h6 CSS-warp fast-path ──────────────────

  function applyTransform() {
    const isOutput = ctx?.outputRole === ctx?.OUTPUT_ROLE_FINAL;
    const stageEl = ctx?.stage || document.getElementById("stage");
    if (!stageEl || !isOutput) return;
    // Phase 30 B1 h6: CSS-warp fast-path. When the grid is trivial
    // (all inner points = bilinear interp of 4 corners), apply the
    // 4-corner perspective via a CSS matrix3d transform on .stage.
    // The GPU compositor renders this as a single-quad with hardware
    // sampling — no triangulation seams, no GL context dependency.
    // For non-trivial grids (squish bars, mid-line drags), clear the
    // CSS transform and let canvas mesh-warp run.
    //
    // We must NOT touch stage.style.transform on the CONTROL client,
    // because its .stage carries the zoom/pan CSS rule
    // `translate(var(--stage-pan-x), …) scale(var(--stage-zoom-scale))`
    // and writing `transform: none` would make mouse-wheel/pinch zoom
    // invisible. Hence the early `if (!isOutput) return;` above.
    if (typeof gridState.isTrivialFourCornerGrid === "function"
        && gridState.isTrivialFourCornerGrid()
        && hasGridDisplacements()) {
      const c = gridState.getCornerPoints();
      const w = stageEl.clientWidth || stageEl.getBoundingClientRect().width || 1;
      const h = stageEl.clientHeight || stageEl.getBoundingClientRect().height || 1;
      // Source corners (untransformed stage = full screen, in stage CSS px)
      const src = [
        [0, 0], [w, 0], [w, h], [0, h],
      ];
      // Destination corners (in stage CSS px). c.TL etc. are normalized 0..1.
      const dst = [
        [c.TL.x * w, c.TL.y * h],
        [c.TR.x * w, c.TR.y * h],
        [c.BR.x * w, c.BR.y * h],
        [c.BL.x * w, c.BL.y * h],
      ];
      const m = computePerspectiveMatrix3d(src, dst);
      if (m) {
        stageEl.style.transform = `matrix3d(${m.join(",")})`;
        stageEl.style.transformOrigin = "0 0";
        stageEl.dataset.cssWarpActive = "true";
        return;
      }
    }
    // Non-trivial grid OR no displacement: clear CSS transform so
    // canvas mesh-warp can drive geometry directly.
    if (stageEl.style.transform) stageEl.style.transform = "";
    if (stageEl.dataset.cssWarpActive) delete stageEl.dataset.cssWarpActive;
  }

  // Phase 30 B1 h6: compute a CSS matrix3d that maps the 4 src corners
  // (axis-aligned rect [(0,0),(w,0),(w,h),(0,h)]) to the 4 dst corners
  // (arbitrary quadrilateral). This is a 2D homography; CSS matrix3d
  // is column-major 4×4 and we set the affine + perspective entries.
  // Algorithm: solve the 8x8 linear system for the 8 free coefficients
  // of a perspective transform mapping 4 point pairs.
  function computePerspectiveMatrix3d(src, dst) {
    // 4 point correspondences → 8 equations → solve [a,b,c,d,e,f,g,h]:
    //   x' = (a*x + b*y + c) / (g*x + h*y + 1)
    //   y' = (d*x + e*y + f) / (g*x + h*y + 1)
    // We write 8 equations and solve via Gaussian elimination.
    const A = [];
    const B = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i];
      const [xp, yp] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -x * xp, -y * xp]);
      A.push([0, 0, 0, x, y, 1, -x * yp, -y * yp]);
      B.push(xp);
      B.push(yp);
    }
    const sol = solveLinearSystem(A, B);
    if (!sol) return null;
    const [a, b, c, d, e, f, g, h] = sol;
    // CSS matrix3d is column-major:
    //   m11 m12 m13 m14   (col 0 = x basis)
    //   m21 m22 m23 m24   (col 1 = y basis)
    //   m31 m32 m33 m34   (col 2 = z basis)
    //   m41 m42 m43 m44   (col 3 = translation)
    // 2D homography in 4×4 form:
    //   [ a b 0 c ]
    //   [ d e 0 f ]
    //   [ 0 0 1 0 ]
    //   [ g h 0 1 ]
    // Column-major flattening:
    return [
      a, d, 0, g,
      b, e, 0, h,
      0, 0, 1, 0,
      c, f, 0, 1,
    ];
  }

  // Gaussian elimination with partial pivoting. Returns null on singular.
  function solveLinearSystem(A, B) {
    const n = A.length;
    const M = A.map((row, i) => [...row, B[i]]);
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
      }
      if (Math.abs(M[pivot][col]) < 1e-10) return null;
      if (pivot !== col) [M[col], M[pivot]] = [M[pivot], M[col]];
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const factor = M[r][col] / M[col][col];
        for (let c = col; c <= n; c++) {
          M[r][c] -= factor * M[col][c];
        }
      }
    }
    // After full Gauss-Jordan with pivots, the LHS is diagonal: row i
    // has only M[i][i] non-zero in the LHS, and M[i][n] is the augmented
    // RHS. So sol[i] = M[i][n] / M[i][i].
    return M.map((row, i) => row[n] / row[i]);
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
    // Phase 30 B1 diagnostic: ?nowarp=1 URL query param bypasses
    // postDrawMeshWarp entirely. Use this to confirm whether the user-
    // observed Streifen come from mesh-warp triangulation or from a
    // different upstream source. If Streifen disappear with ?nowarp=1,
    // mesh-warp IS the source. If they persist, the seams are in
    // fx-canvas content itself (rooms, outside-fx, polygon clip AA,
    // or some other upstream layer) and the GL/2D fixes target the
    // wrong layer.
    try {
      const params = new URLSearchParams(window.location?.search || "");
      if (params.get("nowarp") === "1") {
        // Hide GL canvas if it was visible — fx-canvas is the visible
        // surface in this no-warp mode.
        const isOutputNoWarp = ctx.outputRole === ctx.OUTPUT_ROLE_FINAL;
        const glCanvasElNoWarp = isOutputNoWarp ? document.getElementById("fx-gl-canvas") : null;
        if (glCanvasElNoWarp && glCanvasElNoWarp.style.display !== "none") {
          glCanvasElNoWarp.style.display = "none";
        }
        return;
      }
    } catch (_) { /* ignore */ }
    // Phase 30 B1 h6: when CSS-warp is active on .stage (trivial 4-
    // corner grid), the geometry warp is handled by the GPU compositor.
    // Skip canvas mesh-warp entirely — fx-canvas displays unwarped,
    // CSS transforms it to the projected quadrilateral. No mesh
    // triangulation = no seams.
    try {
      const stageEl = ctx.stage || document.getElementById("stage");
      if (stageEl?.dataset?.cssWarpActive === "true") {
        const isOutputCssWarp = ctx.outputRole === ctx.OUTPUT_ROLE_FINAL;
        const glCanvasElCssWarp = isOutputCssWarp ? document.getElementById("fx-gl-canvas") : null;
        if (glCanvasElCssWarp && glCanvasElCssWarp.style.display !== "none") {
          glCanvasElCssWarp.style.display = "none";
        }
        return;
      }
    } catch (_) { /* ignore */ }
    const isOutput = ctx.outputRole === ctx.OUTPUT_ROLE_FINAL;
    const glCanvasEl = isOutput ? document.getElementById("fx-gl-canvas") : null;

    // Server-driven render-mode override. "2d" forces the GL path off
    // entirely so /output/ never pays the per-frame texImage2D upload —
    // critical for Raspberry Pi smoothness. "gl" forces it on (for
    // diagnostic A/B comparisons). "auto" keeps the original behavior.
    const renderMode = typeof ctx.getRenderMode === "function" ? ctx.getRenderMode() : "auto";

    if (renderMode === "2d") {
      if (glCanvasEl && glCanvasEl.style.display !== "none") {
        glCanvasEl.style.display = "none";
      }
      if (!hasGridDisplacements()) return;
      postDrawMeshWarp2D(canvas, canvasCtx);
      return;
    }

    if (renderMode !== "gl" && !hasGridDisplacements()) {
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
    // profile flow callbacks (now from profile-persistence per
    // W3.2-C5) + gridState namespace so its createHandles /
    // removeHandles can mirror handlesVisible into grid-state.
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
      saveLoadedProfileFlow,    // Phase 27: replaces legacy profileSaveFlow
      profileLoadFlow,
      profileDeleteFlow,
      gridState,
    }));
    // Profile persistence (W3.2-C5): grid-state refs + handle-ui refs
    // (rebuildHandleElements / drawLines / positionRotateHandles /
    // showContextMenu) + applyTransform (shim) + gridState namespace
    // so it can subscribe to handlesVisible changes.
    // Phase 27: also inject gridStateApi so profile-persistence can call
    // snapshotGridState / restoreGridSnapshot / buildNewProfileDefaultGrid
    // for dirty-flag detection (B3/B4) and discard/load flows.
    profilePersistence.init(Object.assign({}, dependencies, {
      grid,
      getPoint,
      setPoint,
      pushUndo,
      saveToLocalStorage,
      buildDefaultPoints,
      applyTransform,
      rebuildHandleElements: handleUi.rebuildHandleElements,
      drawLines: handleUi.drawLines,
      positionRotateHandles: handleUi.positionRotateHandles,
      showContextMenu: handleUi.showContextMenu,
      gridState,
      gridStateApi: gridState,
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
