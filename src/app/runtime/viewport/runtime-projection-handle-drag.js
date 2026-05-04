// Unified Grid Projection — handle drag.
//
// Sub-module of runtime-projection-handle-ui (W3.6-Cextra-handle-ui,
// minimal Option-B split). Owns:
//  - All drag state (dragState, lineDragState, panDragState,
//    rotateDragState, LINE_HIT_THRESHOLD).
//  - Per-handle drag handlers (onHandlePointerDown, onDragMove,
//    onDragEnd).
//  - Line drag + whole-grid pan handlers (onLineHover,
//    onLinePointerDown, onPanDragMove, onPanDragEnd, onLineDragMove,
//    onLineDragEnd).
//  - Rotate-corner drag handlers (onRotateHandlePointerDown,
//    onRotateDragMove, onRotateDragEnd).
//
// Reads grid + helpers via injected refs (mirrors what handle-ui's
// init forwards from grid-state and the shim). Reads `lineCanvas`
// via shell-injected setter (handle-ui owns the canvas lifecycle).
// Reads handle-ui shell render fns (positionHandles,
// positionRotateHandles, drawLines) and the active-handle-key setter
// via init refs. Mutates ctx.renderRoomOverlay (cross-module).
//
// Body-identical extraction: every drag function body below is
// byte-identical to its pre-split form in handle-ui (verified via
// `diff -w`).
(() => {
  let ctx = null;

  // Grid bindings injected at init time (mirror handle-ui's pattern).
  let grid = null;
  let getPoint = () => ({ x: 0, y: 0 });
  let setPoint = () => {};
  let pushUndo = () => {};
  let saveToLocalStorage = () => {};

  // Cross-module callback injected at init time.
  let applyTransform = () => {};

  // Shell-owned render fns injected at init time. Drag bodies call
  // these as bare identifiers — keeps byte-identical post-drag UI
  // refresh.
  let positionHandles = () => {};
  let positionRotateHandles = () => {};
  let drawLines = () => {};

  // Shell-owned activeHandleKey setter (W3.6-Cextra-handle-ui bridge).
  // onHandlePointerDown's `activeHandleKey = ...` line becomes a call
  // to this setter so the shell's `let activeHandleKey` (read by
  // positionHandles, onKeyDown, showHandles) stays the source of
  // truth.
  let setActiveHandleKey = () => {};

  // Shell-owned lineCanvas mirror (W3.6-Cextra-handle-ui bridge).
  // handle-ui's createHandles / removeHandles call setLineCanvas(...)
  // when the canvas is created/destroyed; drag bodies read the local
  // `lineCanvas` shadow as a bare identifier.
  let lineCanvas = null;

  // Drag state — private to this module (handle-ui no longer owns
  // these per the Option-B split).
  let dragState = null;       // { row, col, startX, startY, startPtX, startPtY, allStartPts }
  let lineDragState = null;
  let panDragState = null;
  let rotateDragState = null;
  let squishDragState = null; // Phase 27 (B9): squish-bar drag state
  const LINE_HIT_THRESHOLD = 15; // px

  // ── Rotate handle drag ─────────────────────────────────────────────────────

  function onRotateHandlePointerDown(e) {
    // h9: ignore non-primary buttons (right-click → contextmenu, middle-click).
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    pushUndo();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Centroid of all grid points (in pixel coords)
    let cx = 0, cy = 0, n = 0;
    for (let r = 0; r < grid.srcYs.length; r++) {
      for (let col = 0; col < grid.srcXs.length; col++) {
        const p = grid.points[r][col];
        cx += p.x; cy += p.y; n++;
      }
    }
    cx = (cx / n) * vw;
    cy = (cy / n) * vh;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
    const allStartPts = [];
    for (let r = 0; r < grid.srcYs.length; r++) {
      allStartPts[r] = [];
      for (let col = 0; col < grid.srcXs.length; col++) {
        allStartPts[r][col] = { ...grid.points[r][col] };
      }
    }
    rotateDragState = { cx, cy, startAngle, allStartPts };
    e.currentTarget.setPointerCapture(e.pointerId);
    document.addEventListener("pointermove", onRotateDragMove);
    document.addEventListener("pointerup", onRotateDragEnd);
    document.addEventListener("pointercancel", onRotateDragEnd);
  }

  function onRotateDragMove(e) {
    if (!rotateDragState) return;
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { cx, cy, startAngle, allStartPts } = rotateDragState;
    const cur = Math.atan2(e.clientY - cy, e.clientX - cx);
    const delta = cur - startAngle;
    const cosD = Math.cos(delta);
    const sinD = Math.sin(delta);
    // Rotate each point around centroid (in pixel space to keep aspect)
    for (let r = 0; r < grid.srcYs.length; r++) {
      for (let col = 0; col < grid.srcXs.length; col++) {
        const p = allStartPts[r][col];
        const pxAbs = p.x * vw - cx;
        const pyAbs = p.y * vh - cy;
        const rxAbs = pxAbs * cosD - pyAbs * sinD;
        const ryAbs = pxAbs * sinD + pyAbs * cosD;
        grid.points[r][col].x = (rxAbs + cx) / vw;
        grid.points[r][col].y = (ryAbs + cy) / vh;
      }
    }
    positionHandles();
    positionRotateHandles();
    drawLines();
    applyTransform();
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function onRotateDragEnd() {
    if (!rotateDragState) return;
    rotateDragState = null;
    document.removeEventListener("pointermove", onRotateDragMove);
    document.removeEventListener("pointerup", onRotateDragEnd);
    document.removeEventListener("pointercancel", onRotateDragEnd);
    saveToLocalStorage();
    try { window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE?.notifyDirtyChanged?.(); } catch {}
  }

  // ── Scale handle drag (h12) ───────────────────────────────────────────────
  //
  // Four corner-anchored buttons (parallel to the rotate handles) that
  // proportionally scale the entire grid around its centroid. Drag outward
  // from the centroid → scale up; drag inward → scale down. Uniform scale
  // (preserves aspect ratio) — for non-uniform scaling the user has the
  // four squish bars (B9).

  let scaleDragState = null;

  function _computeGridCentroid() {
    let sumX = 0, sumY = 0, count = 0;
    for (let r = 0; r < grid.srcYs.length; r++) {
      for (let c = 0; c < grid.srcXs.length; c++) {
        const p = getPoint(r, c);
        sumX += p.x;
        sumY += p.y;
        count += 1;
      }
    }
    return count > 0 ? { x: sumX / count, y: sumY / count } : { x: 0.5, y: 0.5 };
  }

  function onScaleHandlePointerDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    pushUndo();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const centroid = _computeGridCentroid();
    const cxPx = centroid.x * vw;
    const cyPx = centroid.y * vh;
    const startDist = Math.hypot(e.clientX - cxPx, e.clientY - cyPx);
    if (!Number.isFinite(startDist) || startDist < 1) {
      // Click landed exactly on the centroid — invalid drag, abort.
      return;
    }
    const allStartPts = [];
    for (let r = 0; r < grid.srcYs.length; r++) {
      allStartPts[r] = [];
      for (let c = 0; c < grid.srcXs.length; c++) {
        const p = getPoint(r, c);
        allStartPts[r][c] = { x: p.x, y: p.y };
      }
    }
    // h14: store the element ref + its resting cursor so onScaleDragEnd
    // can restore the corner-specific cursor (nwse-resize for TL/BR,
    // nesw-resize for TR/BL) instead of leaving the temporary "grabbing"
    // cursor stuck after pointerup.
    const targetEl = e.currentTarget instanceof HTMLElement ? e.currentTarget : null;
    const restingCursor = targetEl?.dataset?.cursor || "grab";
    scaleDragState = {
      pointerId: e.pointerId,
      cornerKey: targetEl?.dataset?.scaleCorner || "",
      centroid,
      startDist,
      allStartPts,
      targetEl,
      restingCursor,
    };
    try { targetEl?.setPointerCapture?.(e.pointerId); } catch {}
    if (targetEl) targetEl.style.cursor = "grabbing";
    document.addEventListener("pointermove", onScaleDragMove);
    document.addEventListener("pointerup", onScaleDragEnd);
    document.addEventListener("pointercancel", onScaleDragEnd);
  }

  function onScaleDragMove(e) {
    if (!scaleDragState) return;
    if (e.pointerId !== scaleDragState.pointerId) return;
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cxPx = scaleDragState.centroid.x * vw;
    const cyPx = scaleDragState.centroid.y * vh;
    const curDist = Math.hypot(e.clientX - cxPx, e.clientY - cyPx);
    let factor = curDist / scaleDragState.startDist;
    if (!Number.isFinite(factor) || factor < 0.05) factor = 0.05;
    if (factor > 8) factor = 8;
    const cx = scaleDragState.centroid.x;
    const cy = scaleDragState.centroid.y;
    const sp = scaleDragState.allStartPts;
    for (let r = 0; r < grid.srcYs.length; r++) {
      for (let c = 0; c < grid.srcXs.length; c++) {
        const start = sp[r][c];
        const newX = cx + (start.x - cx) * factor;
        const newY = cy + (start.y - cy) * factor;
        setPoint(r, c, Math.max(0, Math.min(1, newX)), Math.max(0, Math.min(1, newY)));
      }
    }
    positionHandles();
    positionRotateHandles();
    drawLines();
    applyTransform();
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function onScaleDragEnd(e) {
    if (!scaleDragState) return;
    if (e && e.pointerId !== scaleDragState.pointerId) return;
    // h14: restore the corner-specific resting cursor so the next
    // mouseover doesn't get stuck on "grabbing".
    const { targetEl, restingCursor } = scaleDragState;
    if (targetEl) {
      targetEl.style.cursor = restingCursor || "nwse-resize";
    }
    scaleDragState = null;
    document.removeEventListener("pointermove", onScaleDragMove);
    document.removeEventListener("pointerup", onScaleDragEnd);
    document.removeEventListener("pointercancel", onScaleDragEnd);
    saveToLocalStorage();
    try { window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE?.notifyDirtyChanged?.(); } catch {}
  }

  // ── Handle drag ────────────────────────────────────────────────────────────

  function onHandlePointerDown(e) {
    // h9: ignore non-primary buttons (right-click → contextmenu, middle-click).
    // Without this guard, a right-click on a handle starts a phantom drag
    // session that ends with notifyDirtyChanged firing on pointerup —
    // making the dirty flag flicker/activate even though nothing moved.
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const row = Number(e.currentTarget.dataset.gridRow);
    const col = Number(e.currentTarget.dataset.gridCol);
    const pt = getPoint(row, col);

    setActiveHandleKey(`${row}-${col}`);
    pushUndo();

    // Snapshot ALL point positions at drag start for proportional edge scaling
    const allStartPts = [];
    for (let r = 0; r < grid.srcYs.length; r++) {
      allStartPts[r] = [];
      for (let c = 0; c < grid.srcXs.length; c++) {
        const p = getPoint(r, c);
        allStartPts[r][c] = { x: p.x, y: p.y };
      }
    }
    dragState = {
      row,
      col,
      startX: e.clientX,
      startY: e.clientY,
      startPtX: pt.x,
      startPtY: pt.y,
      allStartPts,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";

    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd);
    document.addEventListener("pointercancel", onDragEnd);

    positionHandles();
  }

  function onDragMove(e) {
    if (!dragState) return;
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dx = (e.clientX - dragState.startX) / vw;
    const dy = (e.clientY - dragState.startY) / vh;

    const newX = Math.max(0, Math.min(1, dragState.startPtX + dx));
    const newY = Math.max(0, Math.min(1, dragState.startPtY + dy));
    // B2 (D-02): no edge-driven proportional remesh — corner drags are local-only,
    // matching interior-point behavior. Outer-LINE drag (onLineDragMove) still
    // proportionally scales interior parallels — that path is intentionally kept (D-01).
    setPoint(dragState.row, dragState.col, newX, newY);

    positionHandles();
    positionRotateHandles();
    drawLines();
    applyTransform();
    // Re-render room overlay so SVG contours match the grid warp
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function onDragEnd() {
    if (!dragState) return;
    dragState = null;
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);
    document.removeEventListener("pointercancel", onDragEnd);
    positionHandles();
    saveToLocalStorage();
    try { window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE?.notifyDirtyChanged?.(); } catch {}
  }

  // ── Grid line drag (move entire row/column) ────────────────────────────────

  function onLineHover(e) {
    if (lineDragState || panDragState || !lineCanvas) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;
    // Check horizontal lines — use average Y of all points on that row
    for (let row = 0; row < rows; row++) {
      let avgY = 0;
      for (let col = 0; col < cols; col++) avgY += getPoint(row, col).y;
      avgY = (avgY / cols) * vh;
      if (Math.abs(e.clientY - avgY) < LINE_HIT_THRESHOLD) {
        lineCanvas.style.cursor = "ns-resize";
        return;
      }
    }
    // Check vertical lines — use average X of all points on that column
    for (let col = 0; col < cols; col++) {
      let avgX = 0;
      for (let row = 0; row < rows; row++) avgX += getPoint(row, col).x;
      avgX = (avgX / rows) * vw;
      if (Math.abs(e.clientX - avgX) < LINE_HIT_THRESHOLD) {
        lineCanvas.style.cursor = "ew-resize";
        return;
      }
    }
    // Empty area → show grab cursor (whole-grid pan)
    lineCanvas.style.cursor = "grab";
  }

  function onLinePointerDown(e) {
    if (e.button !== 0) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mx = e.clientX;
    const my = e.clientY;
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;

    // Check horizontal lines
    for (let row = 0; row < rows; row++) {
      let avgY = 0;
      for (let col = 0; col < cols; col++) avgY += getPoint(row, col).y;
      avgY = (avgY / cols) * vh;
      if (Math.abs(my - avgY) < LINE_HIT_THRESHOLD) {
        e.preventDefault();
        e.stopPropagation();
        pushUndo();
        // Capture start positions for all points on this row
        const startPts = [];
        for (let c = 0; c < cols; c++) startPts.push({ ...getPoint(row, c) });
        // Snapshot all points for proportional edge scaling
        const allStartPts = [];
        for (let r2 = 0; r2 < rows; r2++) {
          allStartPts[r2] = [];
          for (let c2 = 0; c2 < cols; c2++) allStartPts[r2][c2] = { ...getPoint(r2, c2) };
        }
        lineDragState = { axis: "horizontal", lineIndex: row, startY: my, startPts, allStartPts };
        lineCanvas.style.cursor = "ns-resize";
        lineCanvas.setPointerCapture(e.pointerId);
        document.addEventListener("pointermove", onLineDragMove);
        document.addEventListener("pointerup", onLineDragEnd);
        document.addEventListener("pointercancel", onLineDragEnd);
        return;
      }
    }

    // Check vertical lines
    for (let col = 0; col < cols; col++) {
      let avgX = 0;
      for (let row = 0; row < rows; row++) avgX += getPoint(row, col).x;
      avgX = (avgX / rows) * vw;
      if (Math.abs(mx - avgX) < LINE_HIT_THRESHOLD) {
        e.preventDefault();
        e.stopPropagation();
        pushUndo();
        const startPts = [];
        for (let r = 0; r < rows; r++) startPts.push({ ...getPoint(r, col) });
        const allStartPts = [];
        for (let r2 = 0; r2 < rows; r2++) {
          allStartPts[r2] = [];
          for (let c2 = 0; c2 < cols; c2++) allStartPts[r2][c2] = { ...getPoint(r2, c2) };
        }
        lineDragState = { axis: "vertical", lineIndex: col, startX: mx, startPts, allStartPts };
        lineCanvas.style.cursor = "ew-resize";
        lineCanvas.setPointerCapture(e.pointerId);
        document.addEventListener("pointermove", onLineDragMove);
        document.addEventListener("pointerup", onLineDragEnd);
        document.addEventListener("pointercancel", onLineDragEnd);
        return;
      }
    }

    // No line hit → start whole-grid pan
    e.preventDefault();
    e.stopPropagation();
    pushUndo();
    const allStartPts = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let r = 0; r < rows; r++) {
      allStartPts[r] = [];
      for (let c = 0; c < cols; c++) {
        const p = getPoint(r, c);
        allStartPts[r][c] = { x: p.x, y: p.y };
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }
    panDragState = {
      startX: mx,
      startY: my,
      allStartPts,
      minX, maxX, minY, maxY,
    };
    lineCanvas.style.cursor = "grabbing";
    lineCanvas.setPointerCapture(e.pointerId);
    document.addEventListener("pointermove", onPanDragMove);
    document.addEventListener("pointerup", onPanDragEnd);
    document.addEventListener("pointercancel", onPanDragEnd);
  }

  function onPanDragMove(e) {
    if (!panDragState) return;
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let dx = (e.clientX - panDragState.startX) / vw;
    let dy = (e.clientY - panDragState.startY) / vh;
    // Clamp translation so bounding box stays within [0, 1]
    dx = Math.max(-panDragState.minX, Math.min(1 - panDragState.maxX, dx));
    dy = Math.max(-panDragState.minY, Math.min(1 - panDragState.maxY, dy));

    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;
    const sp = panDragState.allStartPts;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        setPoint(r, c, sp[r][c].x + dx, sp[r][c].y + dy);
      }
    }

    positionHandles();
    positionRotateHandles();
    drawLines();
    applyTransform();
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function onPanDragEnd() {
    if (!panDragState) return;
    panDragState = null;
    if (lineCanvas) lineCanvas.style.cursor = "grab";
    document.removeEventListener("pointermove", onPanDragMove);
    document.removeEventListener("pointerup", onPanDragEnd);
    document.removeEventListener("pointercancel", onPanDragEnd);
    saveToLocalStorage();
    // h11: pan-drag (the "verschieben" gesture — drag empty canvas to
    // translate the whole grid) is the only mutation path that wasn't
    // wired to the dirty broadcaster. Every other drag-end handler
    // (onDragEnd / onLineDragEnd / onRotateDragEnd / onSquishDragEnd)
    // already calls notifyDirtyChanged. Add it here so pan-drags
    // correctly trigger the dirty flag.
    try { window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE?.notifyDirtyChanged?.(); } catch {}
  }

  function onLineDragMove(e) {
    if (!lineDragState) return;
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cols = grid.srcXs.length;
    const rows = grid.srcYs.length;

    const lastRow = rows - 1;
    const lastCol = cols - 1;
    const sp = lineDragState.allStartPts;

    // h8 (Phase 27 followup): outer-LINE drag now behaves identically to
    // inner-LINE drag — only the dragged line moves; interior parallel lines
    // stay fixed in absolute coordinates, so only the area between adjacent
    // lines compresses/stretches. This matches the inner-line semantics from
    // B1 (edge uniformity) and complements B9 (squish handles for whole-board
    // scaling). Variables `lastRow`/`lastCol` and `sp` are retained above for
    // legibility but the proportional-interior-scale blocks are removed.
    void sp; void lastRow; void lastCol;
    if (lineDragState.axis === "horizontal") {
      const dy = (e.clientY - lineDragState.startY) / vh;
      const row = lineDragState.lineIndex;
      // Move all points on this row vertically. NO proportional rescale of
      // adjacent rows — outer-line drag is now the same as inner-line drag.
      for (let col = 0; col < cols; col++) {
        const start = lineDragState.startPts[col];
        setPoint(row, col, start.x, Math.max(0, Math.min(1, start.y + dy)));
      }
    } else {
      const dx = (e.clientX - lineDragState.startX) / vw;
      const col = lineDragState.lineIndex;
      // Move all points on this column horizontally. NO proportional rescale
      // of adjacent columns — outer-line drag is now the same as inner-line drag.
      for (let row = 0; row < rows; row++) {
        const start = lineDragState.startPts[row];
        setPoint(row, col, Math.max(0, Math.min(1, start.x + dx)), start.y);
      }
    }

    positionHandles();
    positionRotateHandles();
    drawLines();
    applyTransform();
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function onLineDragEnd() {
    if (!lineDragState) return;
    lineDragState = null;
    if (lineCanvas) lineCanvas.style.cursor = "default";
    document.removeEventListener("pointermove", onLineDragMove);
    document.removeEventListener("pointerup", onLineDragEnd);
    document.removeEventListener("pointercancel", onLineDragEnd);
    saveToLocalStorage();
    try { window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE?.notifyDirtyChanged?.(); } catch {}
  }

  // ── Phase 27 (B9 + D-13 + D-14): squish-bar drag ─────────────────────────
  //
  // Math mirrors onLineDragMove isEdgeRow/isEdgeCol proportional-interior-scaling
  // (proven pattern, lines above). Trapezoid: edge vector + outward normal computed
  // at drag start from actual displaced corner positions; reduces to world axis for
  // rectangular grids (D-14). Opposite-side anchor stays fixed (D-13).
  //
  // Side configuration resolved from window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI
  // at call time (lazy — UI module exports SQUISH_SIDES after drag module loads).

  function _resolveSquishSideCfg(sideKey) {
    const ui = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI || null;
    if (!ui || typeof ui.getSquishSidesConfig !== "function") return null;
    return ui.getSquishSidesConfig().find((s) => s.key === sideKey) || null;
  }

  function onSquishBarPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const sideKey = e.currentTarget?.dataset?.squishSide;
    const sideCfg = _resolveSquishSideCfg(sideKey);
    if (!sideCfg) return;
    e.preventDefault();
    e.stopPropagation();
    pushUndo();

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;

    // Snapshot every point at drag start.
    const allStartPts = [];
    for (let r = 0; r < rows; r++) {
      allStartPts[r] = [];
      for (let c = 0; c < cols; c++) {
        const p = getPoint(r, c);
        allStartPts[r][c] = { x: p.x, y: p.y };
      }
    }

    // Compute edge-perpendicular outward normal (D-14 trapezoid path).
    // For a rectangular grid normalX=0/normalY=±1 or normalX=±1/normalY=0 — exact world axes.
    const edge = sideCfg.edgeAt();
    const a0 = allStartPts[edge[0].r][edge[0].c];
    const a1 = allStartPts[edge[1].r][edge[1].c];
    // Edge vector in screen pixels:
    const evx = (a1.x - a0.x) * vw;
    const evy = (a1.y - a0.y) * vh;
    const elen = Math.sqrt(evx * evx + evy * evy);
    const eux = elen > 1e-3 ? evx / elen : 1;
    const euy = elen > 1e-3 ? evy / elen : 0;
    // Candidate outward normal (perpendicular, 90° CCW):
    let nx = -euy;
    let ny =  eux;
    // Flip if it points opposite to the side's intended outward direction.
    const outwardSign = (sideCfg.outwardDX !== 0)
      ? Math.sign(sideCfg.outwardDX) * nx + Math.sign(sideCfg.outwardDY) * ny
      : Math.sign(sideCfg.outwardDY) * ny + Math.sign(sideCfg.outwardDX) * nx;
    if (outwardSign < 0) { nx = -nx; ny = -ny; }

    squishDragState = {
      sideCfg,
      sideKey,
      startClientX: e.clientX,
      startClientY: e.clientY,
      allStartPts,
      // nx/ny: outward unit normal in screen space (used to project drag delta).
      nx,
      ny,
    };

    // Apply dragging visual state via handle-ui.
    const ui = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
    if (ui && typeof ui.setSquishBarDragVisual === "function") {
      ui.setSquishBarDragVisual(sideKey, true);
    }

    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
    document.addEventListener("pointermove", onSquishDragMove);
    document.addEventListener("pointerup",   onSquishDragEnd);
    document.addEventListener("pointercancel", onSquishDragEnd);
  }

  function onSquishDragMove(e) {
    if (!squishDragState) return;
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;
    const sp = squishDragState.allStartPts;
    const { sideCfg, nx, ny } = squishDragState;

    // Drag delta in screen pixels.
    const dxPx = e.clientX - squishDragState.startClientX;
    const dyPx = e.clientY - squishDragState.startClientY;
    // Project onto outward normal: positive = expanding, negative = squishing.
    const projOutwardPx = dxPx * nx + dyPx * ny;

    // Convert projected pixel displacement back to normalized coords along each axis.
    const dxNorm = (projOutwardPx * nx) / vw;
    const dyNorm = (projOutwardPx * ny) / vh;

    // Determine whether the dragged edge is a shared row or shared col.
    const edge = sideCfg.edgeAt();
    const sharedRow = edge[0].r === edge[1].r ? edge[0].r : null;
    const sharedCol = edge[0].c === edge[1].c ? edge[0].c : null;
    const lastRow = rows - 1;
    const lastCol = cols - 1;

    // 1) Move every point on the DRAGGED edge.
    if (sharedRow !== null) {
      for (let c = 0; c < cols; c++) {
        const s = sp[sharedRow][c];
        setPoint(sharedRow, c,
          Math.max(0, Math.min(1, s.x + dxNorm)),
          Math.max(0, Math.min(1, s.y + dyNorm)));
      }
    } else if (sharedCol !== null) {
      for (let r = 0; r < rows; r++) {
        const s = sp[r][sharedCol];
        setPoint(r, sharedCol,
          Math.max(0, Math.min(1, s.x + dxNorm)),
          Math.max(0, Math.min(1, s.y + dyNorm)));
      }
    }

    // 2) Anchor edge (opposite side) stays fixed — its points were never mutated above.

    // 3) Interior proportional scaling — mirrors onLineDragMove isEdgeRow/isEdgeCol block.
    if (sharedRow !== null) {
      // Top (sharedRow=0) or Bottom (sharedRow=lastRow). Interior rows: 1..lastRow-1.
      for (let ri = 1; ri < lastRow; ri++) {
        for (let ci = 0; ci < cols; ci++) {
          // Proportional Y interpolation between the (now moved) top and the fixed bottom.
          const oldTopY    = sp[0][ci].y;
          const oldBotY    = sp[lastRow][ci].y;
          const newTopY    = getPoint(0, ci).y;
          const newBotY    = getPoint(lastRow, ci).y;
          const oldRangeY  = oldBotY - oldTopY;
          const newRangeY  = newBotY - newTopY;
          if (Math.abs(oldRangeY) > 1e-6) {
            const t = (sp[ri][ci].y - oldTopY) / oldRangeY;
            setPoint(ri, ci, getPoint(ri, ci).x, newTopY + t * newRangeY);
          }
          // Proportional X interpolation (handles trapezoid edge-perpendicular squish).
          const oldTopX    = sp[0][ci].x;
          const oldBotX    = sp[lastRow][ci].x;
          const newTopX    = getPoint(0, ci).x;
          const newBotX    = getPoint(lastRow, ci).x;
          const oldRangeX  = oldBotX - oldTopX;
          const newRangeX  = newBotX - newTopX;
          if (Math.abs(oldRangeX) > 1e-6) {
            const tX = (sp[ri][ci].x - oldTopX) / oldRangeX;
            setPoint(ri, ci, newTopX + tX * newRangeX, getPoint(ri, ci).y);
          }
        }
      }
    } else if (sharedCol !== null) {
      // Left (sharedCol=0) or Right (sharedCol=lastCol). Interior cols: 1..lastCol-1.
      for (let ci = 1; ci < lastCol; ci++) {
        for (let ri = 0; ri < rows; ri++) {
          // Proportional X interpolation between the (now moved) left and the fixed right.
          const oldLeftX   = sp[ri][0].x;
          const oldRightX  = sp[ri][lastCol].x;
          const newLeftX   = getPoint(ri, 0).x;
          const newRightX  = getPoint(ri, lastCol).x;
          const oldRangeX  = oldRightX - oldLeftX;
          const newRangeX  = newRightX - newLeftX;
          if (Math.abs(oldRangeX) > 1e-6) {
            const t = (sp[ri][ci].x - oldLeftX) / oldRangeX;
            setPoint(ri, ci, newLeftX + t * newRangeX, getPoint(ri, ci).y);
          }
          // Proportional Y interpolation (handles trapezoid edge-perpendicular squish).
          const oldLeftY   = sp[ri][0].y;
          const oldRightY  = sp[ri][lastCol].y;
          const newLeftY   = getPoint(ri, 0).y;
          const newRightY  = getPoint(ri, lastCol).y;
          const oldRangeY  = oldRightY - oldLeftY;
          const newRangeY  = newRightY - newLeftY;
          if (Math.abs(oldRangeY) > 1e-6) {
            const tY = (sp[ri][ci].y - oldLeftY) / oldRangeY;
            setPoint(ri, ci, getPoint(ri, ci).x, newLeftY + tY * newRangeY);
          }
        }
      }
    }

    positionHandles();
    positionRotateHandles();   // also repositions squish bars via Task 1 hook
    drawLines();
    applyTransform();
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function onSquishDragEnd() {
    if (!squishDragState) return;
    const sideKey = squishDragState.sideKey;
    squishDragState = null;
    document.removeEventListener("pointermove", onSquishDragMove);
    document.removeEventListener("pointerup",   onSquishDragEnd);
    document.removeEventListener("pointercancel", onSquishDragEnd);
    // Restore resting visual on the bar.
    const ui = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
    if (ui && typeof ui.setSquishBarDragVisual === "function") {
      ui.setSquishBarDragVisual(sideKey, false);
    }
    saveToLocalStorage();
    try { window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE?.notifyDirtyChanged?.(); } catch {}
  }

  // ── Init / lineCanvas setter ───────────────────────────────────────────────

  function init(dependencies) {
    ctx = dependencies;
    if (dependencies?.grid) grid = dependencies.grid;
    if (typeof dependencies?.getPoint === "function") getPoint = dependencies.getPoint;
    if (typeof dependencies?.setPoint === "function") setPoint = dependencies.setPoint;
    if (typeof dependencies?.pushUndo === "function") pushUndo = dependencies.pushUndo;
    if (typeof dependencies?.saveToLocalStorage === "function") saveToLocalStorage = dependencies.saveToLocalStorage;
    if (typeof dependencies?.applyTransform === "function") applyTransform = dependencies.applyTransform;
    if (typeof dependencies?.positionHandles === "function") positionHandles = dependencies.positionHandles;
    if (typeof dependencies?.positionRotateHandles === "function") positionRotateHandles = dependencies.positionRotateHandles;
    if (typeof dependencies?.drawLines === "function") drawLines = dependencies.drawLines;
    if (typeof dependencies?.setActiveHandleKey === "function") setActiveHandleKey = dependencies.setActiveHandleKey;
  }

  // Shell (handle-ui's createHandles / removeHandles) calls this when
  // the line-canvas element is created or destroyed. Drag bodies read
  // the local `lineCanvas` shadow as a bare identifier — keeps body
  // diff -w empty.
  function setLineCanvas(canvas) {
    lineCanvas = canvas || null;
  }

  window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_DRAG = {
    init,
    setLineCanvas,
    onHandlePointerDown,
    onRotateHandlePointerDown,
    onLinePointerDown,
    onLineHover,
    // Phase 27 (B9): squish-bar drag handlers.
    onSquishBarPointerDown,
    onSquishDragMove,
    onSquishDragEnd,
    // Phase 27 (h12): corner scale-handle drag handlers.
    onScaleHandlePointerDown,
    onScaleDragMove,
    onScaleDragEnd,
  };
})();
