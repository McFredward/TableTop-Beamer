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
  const LINE_HIT_THRESHOLD = 15; // px

  // ── Rotate handle drag ─────────────────────────────────────────────────────

  function onRotateHandlePointerDown(e) {
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
  }

  // ── Handle drag ────────────────────────────────────────────────────────────

  function onHandlePointerDown(e) {
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

    if (lineDragState.axis === "horizontal") {
      const dy = (e.clientY - lineDragState.startY) / vh;
      const row = lineDragState.lineIndex;
      const isEdgeRow = row === 0 || row === lastRow;
      // Move all points on this row vertically
      for (let col = 0; col < cols; col++) {
        const start = lineDragState.startPts[col];
        setPoint(row, col, start.x, Math.max(0, Math.min(1, start.y + dy)));
      }
      // If edge row, proportionally adjust all inner rows
      if (isEdgeRow) {
        for (let ri = 1; ri < lastRow; ri++) {
          for (let ci = 0; ci < cols; ci++) {
            const oldTop = sp[0][ci].y;
            const oldBottom = sp[lastRow][ci].y;
            const newTop = getPoint(0, ci).y;
            const newBottom = getPoint(lastRow, ci).y;
            const oldRange = oldBottom - oldTop;
            const newRange = newBottom - newTop;
            if (Math.abs(oldRange) > 1e-6) {
              const t = (sp[ri][ci].y - oldTop) / oldRange;
              setPoint(ri, ci, getPoint(ri, ci).x, newTop + t * newRange);
            }
          }
        }
      }
    } else {
      const dx = (e.clientX - lineDragState.startX) / vw;
      const col = lineDragState.lineIndex;
      const isEdgeCol = col === 0 || col === lastCol;
      // Move all points on this column horizontally
      for (let row = 0; row < rows; row++) {
        const start = lineDragState.startPts[row];
        setPoint(row, col, Math.max(0, Math.min(1, start.x + dx)), start.y);
      }
      // If edge column, proportionally adjust all inner columns
      if (isEdgeCol) {
        for (let ci = 1; ci < lastCol; ci++) {
          for (let ri = 0; ri < rows; ri++) {
            const oldLeft = sp[ri][0].x;
            const oldRight = sp[ri][lastCol].x;
            const newLeft = getPoint(ri, 0).x;
            const newRight = getPoint(ri, lastCol).x;
            const oldRange = oldRight - oldLeft;
            const newRange = newRight - newLeft;
            if (Math.abs(oldRange) > 1e-6) {
              const t = (sp[ri][ci].x - oldLeft) / oldRange;
              setPoint(ri, ci, newLeft + t * newRange, getPoint(ri, ci).y);
            }
          }
        }
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
  };
})();
