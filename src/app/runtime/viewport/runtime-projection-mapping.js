// Phase 19-4: Unified Grid Projection System.
//
// Replaces the dual 4-corner + grid-mesh approach with ONE unified grid.
// The grid IS the projection — corners, edges, and interior points are
// all part of the same grid.  Default 4x4 = 5x5 = 25 control points.
//
// - The 4 corner points control the CSS matrix3d perspective transform
//   on .stage (same homography math as Phase 19-2).
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

  // ── Grid state ─────────────────────────────────────────────────────────────
  //
  // The grid redistributes content by remapping source regions to destination
  // regions. Source lines are always evenly spaced. Destination lines (dstXs,
  // dstYs) are adjustable — moving a line compresses content on one side and
  // stretches it on the other.
  //
  // Example: 5 vertical lines at [0, 0.25, 0.5, 0.75, 1] (source, fixed).
  // If dstXs[2] is moved from 0.5 to 0.4, the second column (src 0.25-0.5)
  // gets squeezed into dst 0.25-0.4, and the third (src 0.5-0.75) stretches
  // into dst 0.4-0.75.

  const DEFAULT_COUNT = 5; // 5 lines = 4 columns/rows

  function makeEvenLines(n) {
    const lines = [];
    for (let i = 0; i < n; i++) lines.push(i / (n - 1));
    return lines;
  }

  const grid = {
    srcXs: makeEvenLines(DEFAULT_COUNT),
    dstXs: makeEvenLines(DEFAULT_COUNT),
    srcYs: makeEvenLines(DEFAULT_COUNT),
    dstYs: makeEvenLines(DEFAULT_COUNT),
  };

  // Legacy compat
  const CORNER_KEYS = ["topLeft", "topRight", "bottomRight", "bottomLeft"];

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Check whether any destination lines differ from source (= grid is active). */
  function hasGridDisplacements() {
    for (let i = 1; i < grid.dstXs.length - 1; i++) {
      if (Math.abs(grid.dstXs[i] - grid.srcXs[i]) > 1e-6) return true;
    }
    for (let i = 1; i < grid.dstYs.length - 1; i++) {
      if (Math.abs(grid.dstYs[i] - grid.srcYs[i]) > 1e-6) return true;
    }
    return false;
  }

  // Legacy compat aliases used by the rest of the module
  function getPoint(row, col) {
    return { x: grid.dstXs[col] ?? 0, y: grid.dstYs[row] ?? 0 };
  }

  /**
   * Remap a normalized point (0-1) through the grid distortion.
   * Uses piecewise linear interpolation: find which source cell the point
   * falls in, then interpolate to the corresponding destination cell.
   * Returns { x, y } in 0-1 range.
   */
  function remapPoint(nx, ny) {
    if (!hasGridDisplacements()) return { x: nx, y: ny };
    return { x: remapAxis(nx, grid.srcXs, grid.dstXs), y: remapAxis(ny, grid.srcYs, grid.dstYs) };
  }

  function remapAxis(val, src, dst) {
    // Find which segment val falls in
    for (let i = 0; i < src.length - 1; i++) {
      if (val <= src[i + 1]) {
        const segLen = src[i + 1] - src[i];
        if (segLen < 1e-10) return dst[i];
        const t = (val - src[i]) / segLen;
        return dst[i] + t * (dst[i + 1] - dst[i]);
      }
    }
    return dst[dst.length - 1];
  }

  /** Check whether the 4 corners are at their default positions. */
  function cornersAreDefault() {
    const lastRow = grid.dstYs.length - 1;
    const lastCol = grid.dstXs.length - 1;
    const corners = [
      getPoint(0, 0),
      getPoint(0, lastCol),
      getPoint(lastRow, lastCol),
      getPoint(lastRow, 0),
    ];
    const defaults = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    for (let i = 0; i < 4; i++) {
      if (Math.abs(corners[i].x - defaults[i].x) > 1e-6 ||
          Math.abs(corners[i].y - defaults[i].y) > 1e-6) {
        return false;
      }
    }
    return true;
  }

  // ── Homography math ─────────────────────────────────────────────────────────

  function computeMatrix3d(w, h, dst) {
    const x0 = dst[0].x, y0 = dst[0].y;
    const x1 = dst[1].x, y1 = dst[1].y;
    const x2 = dst[2].x, y2 = dst[2].y;
    const x3 = dst[3].x, y3 = dst[3].y;

    const dx1 = x1 - x2;
    const dx2 = x3 - x2;
    const dx3 = x0 - x1 + x2 - x3;
    const dy1 = y1 - y2;
    const dy2 = y3 - y2;
    const dy3 = y0 - y1 + y2 - y3;

    const denom = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(denom) < 1e-10) {
      return "none";
    }

    const g = (dx3 * dy2 - dx2 * dy3) / denom;
    const h_ = (dx1 * dy3 - dx3 * dy1) / denom;

    const a = x1 - x0 + g * x1;
    const b = x3 - x0 + h_ * x3;
    const c = x0;
    const d = y1 - y0 + g * y1;
    const e = y3 - y0 + h_ * y3;
    const f = y0;

    const ha = a / w;
    const hb = b / h;
    const hc = c;
    const hd = d / w;
    const he = e / h;
    const hf = f;
    const hg = g / w;
    const hh = h_ / h;

    return `matrix3d(${ha},${hd},0,${hg}, ${hb},${he},0,${hh}, 0,0,1,0, ${hc},${hf},0,1)`;
  }

  // ── Apply CSS transform ────────────────────────────────────────────────────

  function applyTransform() {
    if (!ctx || ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) return;
    const stage = ctx.stage;
    if (!stage) return;

    if (cornersAreDefault()) {
      stage.style.transform = "none";
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const lastRow = grid.dstYs.length - 1;
    const lastCol = grid.dstXs.length - 1;

    // Corner points in pixel coordinates
    const tl = getPoint(0, 0);
    const tr = getPoint(0, lastCol);
    const br = getPoint(lastRow, lastCol);
    const bl = getPoint(lastRow, 0);

    const dst = [
      { x: tl.x * vw, y: tl.y * vh },
      { x: tr.x * vw, y: tr.y * vh },
      { x: br.x * vw, y: br.y * vh },
      { x: bl.x * vw, y: bl.y * vh },
    ];

    const matrix = computeMatrix3d(vw, vh, dst);
    stage.style.transform = matrix;
    stage.style.transformOrigin = "0 0";
  }

  // ── Post-draw mesh warp ────────────────────────────────────────────────────
  //
  // Called from the draw loop after all rendering completes.
  // If any non-corner grid points are displaced, takes a snapshot of the
  // canvas content and redraws it through the displaced grid mesh.

  let _warpTmpCanvas = null;
  let _warpTmpCtx = null;

  function postDrawMeshWarp(canvas, canvasCtx) {
    if (!ctx || ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) return;
    if (!hasGridDisplacements()) return;

    const w = canvas.width;
    const h = canvas.height;

    // Reuse cached temp canvas
    if (!_warpTmpCanvas) {
      _warpTmpCanvas = document.createElement("canvas");
      _warpTmpCtx = _warpTmpCanvas.getContext("2d");
    }
    if (_warpTmpCanvas.width !== w || _warpTmpCanvas.height !== h) {
      _warpTmpCanvas.width = w;
      _warpTmpCanvas.height = h;
    }

    // Snapshot current content
    _warpTmpCtx.clearRect(0, 0, w, h);
    _warpTmpCtx.drawImage(canvas, 0, 0);

    // Clear and redraw through grid: source = evenly spaced, dest = adjusted
    canvasCtx.clearRect(0, 0, w, h);

    for (let row = 0; row < grid.srcYs.length - 1; row++) {
      for (let col = 0; col < grid.srcXs.length - 1; col++) {
        // Source: evenly spaced columns/rows from the snapshot
        const srcX = grid.srcXs[col] * w;
        const srcY = grid.srcYs[row] * h;
        const srcW = (grid.srcXs[col + 1] - grid.srcXs[col]) * w;
        const srcH = (grid.srcYs[row + 1] - grid.srcYs[row]) * h;
        if (srcW < 0.5 || srcH < 0.5) continue;

        // Destination: adjusted line positions
        const dstX = grid.dstXs[col] * w;
        const dstY = grid.dstYs[row] * h;
        const dstW = (grid.dstXs[col + 1] - grid.dstXs[col]) * w;
        const dstH = (grid.dstYs[row + 1] - grid.dstYs[row]) * h;
        if (dstW < 0.5 || dstH < 0.5) continue;

        canvasCtx.drawImage(
          _warpTmpCanvas,
          srcX, srcY, srcW, srcH,
          dstX, dstY, dstW, dstH,
        );
      }
    }
  }

  // ── Handle UI ──────────────────────────────────────────────────────────────

  let handleElements = [];    // All grid point handle divs
  let lineCanvas = null;      // Canvas overlay for grid lines
  let lineCtx = null;
  let handlesVisible = false;
  let dragState = null;       // { row, col, startX, startY, startPtX, startPtY }
  let activeHandleKey = null; // "row-col" of selected handle for arrow keys
  let contextMenu = null;     // Context menu DOM element

  // Grid line drag state
  let lineDragState = null;
  const LINE_HIT_THRESHOLD = 15; // px

  function createHandles() {
    if (handlesVisible) return;
    handlesVisible = true;

    // Grid line canvas overlay — pointer-events enabled for line dragging
    lineCanvas = document.createElement("canvas");
    lineCanvas.id = "projection-grid-line-canvas";
    lineCanvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:auto;z-index:9997;cursor:default;";
    document.body.appendChild(lineCanvas);
    lineCtx = lineCanvas.getContext("2d");

    lineCanvas.addEventListener("pointerdown", onLinePointerDown);
    lineCanvas.addEventListener("contextmenu", onContextMenu);

    rebuildHandleElements();
    drawLines();
  }

  function removeHandles() {
    if (!handlesVisible) return;
    handlesVisible = false;

    for (const el of handleElements) {
      el.removeEventListener("pointerdown", onHandlePointerDown);
      el.remove();
    }
    handleElements = [];

    if (lineCanvas) {
      lineCanvas.removeEventListener("pointerdown", onLinePointerDown);
      lineCanvas.removeEventListener("contextmenu", onContextMenu);
      lineCanvas.remove();
      lineCanvas = null;
      lineCtx = null;
    }

    dismissContextMenu();
  }

  function rebuildHandleElements() {
    // Remove old handles
    for (const el of handleElements) {
      el.removeEventListener("pointerdown", onHandlePointerDown);
      el.remove();
    }
    handleElements = [];

    const rows = grid.dstYs.length;
    const cols = grid.dstXs.length;
    const lastRow = rows - 1;
    const lastCol = cols - 1;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const isCorner = (row === 0 || row === lastRow) && (col === 0 || col === lastCol);
        const isEdge = !isCorner && (row === 0 || row === lastRow || col === 0 || col === lastCol);

        const el = document.createElement("div");
        el.className = isCorner ? "projection-corner-handle" : "projection-grid-handle";
        el.dataset.gridRow = String(row);
        el.dataset.gridCol = String(col);

        let cornerLabel = "";
        if (isCorner) {
          if (row === 0 && col === 0) cornerLabel = "1";
          else if (row === 0 && col === lastCol) cornerLabel = "2";
          else if (row === lastRow && col === lastCol) cornerLabel = "3";
          else cornerLabel = "4";
        }

        if (isCorner) {
          el.textContent = cornerLabel;
          el.style.cssText = `
            position: fixed;
            width: 28px; height: 28px;
            border-radius: 50%;
            background: rgba(220, 30, 30, 0.85);
            border: 2px solid rgba(255, 255, 255, 0.9);
            color: #fff;
            font-family: "Barlow Condensed", sans-serif;
            font-size: 13px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: grab;
            z-index: 9999;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            transform: translate(-50%, -50%);
          `;
        } else if (isEdge) {
          const isHorizontalEdge = row === 0 || row === lastRow;
          el.style.cssText = `
            position: fixed;
            width: ${isHorizontalEdge ? "12px" : "16px"};
            height: ${isHorizontalEdge ? "16px" : "12px"};
            border-radius: 3px;
            background: rgba(100, 160, 255, 0.8);
            border: 2px solid rgba(255, 255, 255, 0.85);
            cursor: ${isHorizontalEdge ? "ew-resize" : "ns-resize"};
            z-index: 9999;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
            box-shadow: 0 1px 6px rgba(0,0,0,0.4);
            transform: translate(-50%, -50%);
          `;
        } else {
          // Interior point
          el.style.cssText = `
            position: fixed;
            width: 14px; height: 14px;
            border-radius: 50%;
            background: rgba(0, 220, 200, 0.85);
            border: 2px solid rgba(255, 255, 255, 0.9);
            cursor: move;
            z-index: 9999;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
            box-shadow: 0 1px 6px rgba(0,0,0,0.5);
            transform: translate(-50%, -50%);
          `;
        }

        el.addEventListener("pointerdown", onHandlePointerDown);
        document.body.appendChild(el);
        handleElements.push(el);
      }
    }

    positionHandles();
  }

  function positionHandles() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rows = grid.dstYs.length;
    const cols = grid.dstXs.length;
    let idx = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const pt = getPoint(row, col);
        const px = pt.x * vw;
        const py = pt.y * vh;
        const el = handleElements[idx];
        if (el) {
          el.style.left = `${px}px`;
          el.style.top = `${py}px`;

          // Highlight active handle
          const key = `${row}-${col}`;
          const isCorner = (row === 0 || row === rows - 1) && (col === 0 || col === cols - 1);
          if (isCorner && key === activeHandleKey) {
            el.style.background = "rgba(255, 200, 30, 0.95)";
            el.style.color = "#000";
          } else if (isCorner) {
            el.style.background = "rgba(220, 30, 30, 0.85)";
            el.style.color = "#fff";
          }
        }
        idx++;
      }
    }
  }

  function drawLines() {
    if (!lineCanvas || !lineCtx) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    lineCanvas.width = vw * dpr;
    lineCanvas.height = vh * dpr;
    lineCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lineCtx.clearRect(0, 0, vw, vh);

    const rows = grid.dstYs.length;
    const cols = grid.dstXs.length;

    // Draw horizontal grid lines
    for (let row = 0; row < rows; row++) {
      const isEdge = row === 0 || row === rows - 1;
      lineCtx.strokeStyle = isEdge ? "rgba(220, 30, 30, 0.7)" : "rgba(0, 220, 180, 0.45)";
      lineCtx.lineWidth = isEdge ? 2 : 1;
      lineCtx.beginPath();
      for (let col = 0; col < cols; col++) {
        const pt = getPoint(row, col);
        const px = pt.x * vw;
        const py = pt.y * vh;
        if (col === 0) lineCtx.moveTo(px, py);
        else lineCtx.lineTo(px, py);
      }
      lineCtx.stroke();
    }

    // Draw vertical grid lines
    for (let col = 0; col < cols; col++) {
      const isEdge = col === 0 || col === cols - 1;
      lineCtx.strokeStyle = isEdge ? "rgba(220, 30, 30, 0.7)" : "rgba(0, 220, 180, 0.45)";
      lineCtx.lineWidth = isEdge ? 2 : 1;
      lineCtx.beginPath();
      for (let row = 0; row < rows; row++) {
        const pt = getPoint(row, col);
        const px = pt.x * vw;
        const py = pt.y * vh;
        if (row === 0) lineCtx.moveTo(px, py);
        else lineCtx.lineTo(px, py);
      }
      lineCtx.stroke();
    }

    // Filled quad from corners (semi-transparent)
    lineCtx.fillStyle = "rgba(255, 50, 50, 0.06)";
    lineCtx.beginPath();
    const lastRow = rows - 1;
    const lastCol = cols - 1;
    const corners = [
      getPoint(0, 0),
      getPoint(0, lastCol),
      getPoint(lastRow, lastCol),
      getPoint(lastRow, 0),
    ];
    for (let i = 0; i < 4; i++) {
      const px = corners[i].x * vw;
      const py = corners[i].y * vh;
      if (i === 0) lineCtx.moveTo(px, py);
      else lineCtx.lineTo(px, py);
    }
    lineCtx.closePath();
    lineCtx.fill();
  }

  // ── Handle drag ────────────────────────────────────────────────────────────

  function onHandlePointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const row = Number(e.currentTarget.dataset.gridRow);
    const col = Number(e.currentTarget.dataset.gridCol);
    const pt = getPoint(row, col);

    activeHandleKey = `${row}-${col}`;

    dragState = {
      row,
      col,
      startX: e.clientX,
      startY: e.clientY,
      startPtX: pt.x,
      startPtY: pt.y,
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

    const row = dragState.row;
    const col = dragState.col;
    const lastRow = grid.dstYs.length - 1;
    const lastCol = grid.dstXs.length - 1;
    const isCorner = (row === 0 || row === lastRow) && (col === 0 || col === lastCol);

    if (isCorner) {
      // Corners: move both X and Y freely (perspective control)
      grid.dstXs[col] = Math.max(0, Math.min(1, dragState.startPtX + dx));
      grid.dstYs[row] = Math.max(0, Math.min(1, dragState.startPtY + dy));
    } else {
      // Non-corner handles move the entire LINE they belong to.
      // Interior/edge column handles → move the vertical line (X only)
      const prevX = grid.dstXs[col - 1] ?? 0;
      const nextX = grid.dstXs[col + 1] ?? 1;
      grid.dstXs[col] = Math.max(prevX + 0.01, Math.min(nextX - 0.01, dragState.startPtX + dx));

      // Interior/edge row handles → move the horizontal line (Y only)
      const prevY = grid.dstYs[row - 1] ?? 0;
      const nextY = grid.dstYs[row + 1] ?? 1;
      grid.dstYs[row] = Math.max(prevY + 0.01, Math.min(nextY - 0.01, dragState.startPtY + dy));
    }

    positionHandles();
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

  function onLinePointerDown(e) {
    if (e.button !== 0) return; // Left click only — right is context menu
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mx = e.clientX;
    const my = e.clientY;
    const rows = grid.dstYs.length;
    const cols = grid.dstXs.length;

    // Check horizontal lines: use dstYs positions directly
    for (let row = 0; row < rows; row++) {
      const lineY = grid.dstYs[row] * vh;
      if (Math.abs(my - lineY) < LINE_HIT_THRESHOLD) {
        e.preventDefault();
        e.stopPropagation();
        lineDragState = {
          axis: "horizontal",
          lineIndex: row,
          startY: my,
          startVal: grid.dstYs[row],
        };
        lineCanvas.style.cursor = "ns-resize";
        lineCanvas.setPointerCapture(e.pointerId);
        document.addEventListener("pointermove", onLineDragMove);
        document.addEventListener("pointerup", onLineDragEnd);
        document.addEventListener("pointercancel", onLineDragEnd);
        return;
      }
    }

    // Check vertical lines: use dstXs positions directly
    for (let col = 0; col < cols; col++) {
      const lineX = grid.dstXs[col] * vw;
      if (Math.abs(mx - lineX) < LINE_HIT_THRESHOLD) {
        e.preventDefault();
        e.stopPropagation();
        lineDragState = {
          axis: "vertical",
          lineIndex: col,
          startX: mx,
          startVal: grid.dstXs[col],
        };
        lineCanvas.style.cursor = "ew-resize";
        lineCanvas.setPointerCapture(e.pointerId);
        document.addEventListener("pointermove", onLineDragMove);
        document.addEventListener("pointerup", onLineDragEnd);
        document.addEventListener("pointercancel", onLineDragEnd);
        return;
      }
    }
  }

  function onLineDragMove(e) {
    if (!lineDragState) return;
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (lineDragState.axis === "horizontal") {
      const dy = (e.clientY - lineDragState.startY) / vh;
      const row = lineDragState.lineIndex;
      const prevY = grid.dstYs[row - 1] ?? 0;
      const nextY = grid.dstYs[row + 1] ?? 1;
      grid.dstYs[row] = Math.max(prevY + 0.01, Math.min(nextY - 0.01, lineDragState.startVal + dy));
    } else {
      const dx = (e.clientX - lineDragState.startX) / vw;
      const col = lineDragState.lineIndex;
      const prevX = grid.dstXs[col - 1] ?? 0;
      const nextX = grid.dstXs[col + 1] ?? 1;
      grid.dstXs[col] = Math.max(prevX + 0.01, Math.min(nextX - 0.01, lineDragState.startVal + dx));
    }

    positionHandles();
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

  // ── Arrow key fine-tuning ──────────────────────────────────────────────────

  function onKeyDown(e) {
    if (!handlesVisible || !activeHandleKey) return;

    if (e.key === "Tab") {
      e.preventDefault();
      // Cycle through all handle keys
      const rows = grid.dstYs.length;
      const cols = grid.dstXs.length;
      const parts = activeHandleKey.split("-").map(Number);
      let row = parts[0];
      let col = parts[1];
      col++;
      if (col >= cols) { col = 0; row++; }
      if (row >= rows) { row = 0; }
      activeHandleKey = `${row}-${col}`;
      positionHandles();
      return;
    }

    const arrowMap = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const dir = arrowMap[e.key];
    if (!dir) return;

    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const parts = activeHandleKey.split("-").map(Number);
    const row = parts[0];
    const col = parts[1];
    const pt = getPoint(row, col);

    pt.x += (dir[0] * step / vw);
    pt.y += (dir[1] * step / vh);
    pt.x = Math.max(0, Math.min(1, pt.x));
    pt.y = Math.max(0, Math.min(1, pt.y));

    setPoint(row, col, pt.x, pt.y);
    positionHandles();
    drawLines();
    applyTransform();
    saveToLocalStorage();
  }

  // ── Context menu ───────────────────────────────────────────────────────────

  function onContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const normX = e.clientX / vw;
    const normY = e.clientY / vh;

    const nearLineThreshold = 0.03;
    let nearHLine = -1;
    let nearVLine = -1;

    // Check interior horizontal lines (indices 1..length-2 in ys)
    for (let i = 1; i < grid.dstYs.length - 1; i++) {
      if (Math.abs(grid.dstYs[i] - normY) < nearLineThreshold) {
        nearHLine = i;
        break;
      }
    }
    // Check interior vertical lines
    for (let i = 1; i < grid.dstXs.length - 1; i++) {
      if (Math.abs(grid.dstXs[i] - normX) < nearLineThreshold) {
        nearVLine = i;
        break;
      }
    }

    const items = [];
    if (nearHLine >= 0 && grid.dstYs.length > 3) {
      // Can remove if more than edge lines + 1 interior line
      items.push({
        label: "Remove this horizontal line",
        action: () => removeHorizontalLine(nearHLine),
      });
    }
    if (nearVLine >= 0 && grid.dstXs.length > 3) {
      items.push({
        label: "Remove this vertical line",
        action: () => removeVerticalLine(nearVLine),
      });
    }
    items.push({
      label: "Add horizontal line here",
      action: () => addHorizontalLine(normY),
    });
    items.push({
      label: "Add vertical line here",
      action: () => addVerticalLine(normX),
    });
    items.push({
      label: "Reset all",
      action: () => resetGrid(),
    });

    showContextMenu(e.clientX, e.clientY, items);
  }

  function showContextMenu(x, y, items) {
    dismissContextMenu();
    const menu = document.createElement("div");
    menu.className = "board-context-menu";
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    for (const item of items) {
      const btn = document.createElement("button");
      btn.className = "board-context-menu-item";
      btn.textContent = item.label;
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        dismissContextMenu();
        item.action();
      });
      menu.appendChild(btn);
    }

    document.body.appendChild(menu);
    contextMenu = menu;

    // Ensure menu stays in viewport
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menu.style.left = `${window.innerWidth - rect.width - 4}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menu.style.top = `${window.innerHeight - rect.height - 4}px`;
      }
    });

    setTimeout(() => {
      document.addEventListener("pointerdown", dismissContextMenuOnOutside);
    }, 0);
  }

  function dismissContextMenuOnOutside(e) {
    if (contextMenu && !contextMenu.contains(e.target)) {
      dismissContextMenu();
    }
  }

  function dismissContextMenu() {
    if (contextMenu) {
      contextMenu.remove();
      contextMenu = null;
    }
    document.removeEventListener("pointerdown", dismissContextMenuOnOutside);
  }

  // ── Grid line add/remove ───────────────────────────────────────────────────

  function addHorizontalLine(normY) {
    normY = Math.max(0.02, Math.min(0.98, normY));
    // Insert into ys array (which always includes 0 and 1)
    const newYs = grid.dstYs.slice();
    newYs.push(normY);
    newYs.sort((a, b) => a - b);
    // Deduplicate
    grid.dstYs = [...new Set(newYs)];
    // Clear displacements — grid topology changed
    // grid lines changed — rebuild srcXs/srcYs to match new count
    grid.srcXs = makeEvenLines(grid.dstXs.length);
    grid.srcYs = makeEvenLines(grid.dstYs.length);
    saveToLocalStorage();
    if (handlesVisible) {
      rebuildHandleElements();
      drawLines();
    }
  }

  function addVerticalLine(normX) {
    normX = Math.max(0.02, Math.min(0.98, normX));
    const newXs = grid.dstXs.slice();
    newXs.push(normX);
    newXs.sort((a, b) => a - b);
    grid.dstXs = [...new Set(newXs)];
    // grid lines changed — rebuild srcXs/srcYs to match new count
    grid.srcXs = makeEvenLines(grid.dstXs.length);
    grid.srcYs = makeEvenLines(grid.dstYs.length);
    saveToLocalStorage();
    if (handlesVisible) {
      rebuildHandleElements();
      drawLines();
    }
  }

  function removeHorizontalLine(index) {
    if (grid.dstYs.length <= 3) return; // Need at least edges + 1
    // Don't remove first or last (edges)
    if (index === 0 || index === grid.dstYs.length - 1) return;
    grid.dstYs.splice(index, 1);
    // grid lines changed — rebuild srcXs/srcYs to match new count
    grid.srcXs = makeEvenLines(grid.dstXs.length);
    grid.srcYs = makeEvenLines(grid.dstYs.length);
    saveToLocalStorage();
    if (handlesVisible) {
      rebuildHandleElements();
      drawLines();
    }
  }

  function removeVerticalLine(index) {
    if (grid.dstXs.length <= 3) return;
    if (index === 0 || index === grid.dstXs.length - 1) return;
    grid.dstXs.splice(index, 1);
    // grid lines changed — rebuild srcXs/srcYs to match new count
    grid.srcXs = makeEvenLines(grid.dstXs.length);
    grid.srcYs = makeEvenLines(grid.dstYs.length);
    saveToLocalStorage();
    if (handlesVisible) {
      rebuildHandleElements();
      drawLines();
    }
  }

  function resetGrid() {
    grid.dstXs = DEFAULT_XS.slice();
    grid.dstYs = DEFAULT_YS.slice();
    // grid lines changed — rebuild srcXs/srcYs to match new count
    grid.srcXs = makeEvenLines(grid.dstXs.length);
    grid.srcYs = makeEvenLines(grid.dstYs.length);
    applyTransform();
    saveToLocalStorage();
    if (handlesVisible) {
      rebuildHandleElements();
      drawLines();
    }
  }

  // ── Show / Hide (unified — everything in one go) ───────────────────────────

  function showHandles() {
    if (handlesVisible) return;
    createHandles();
    document.addEventListener("keydown", onKeyDown);
    // Set initial active handle to first corner
    activeHandleKey = "0-0";
  }

  function hideHandles() {
    if (!handlesVisible) return;
    removeHandles();
    document.removeEventListener("keydown", onKeyDown);
  }

  // ── Align mode integration ─────────────────────────────────────────────────

  function onAlignModeChange(enabled) {
    if (!ctx || ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) return;
    if (enabled) {
      applyTransform();
      showHandles();
    } else {
      hideHandles();
      // Keep transform applied — calibration persists
      saveToLocalStorage();
    }
  }

  // ── Resize handling ────────────────────────────────────────────────────────

  function onWindowResize() {
    if (!ctx || ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) return;
    applyTransform();
    if (handlesVisible) {
      positionHandles();
      drawLines();
    }
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  const LS_KEY_V2 = "tt-beamer.projection-mapping-v2";
  const LS_KEY_OLD = "tt-beamer.projection-mapping.corners";

  function saveToLocalStorage() {
    try {
      localStorage.setItem(LS_KEY_V2, JSON.stringify({
        dstXs: grid.dstXs,
        dstYs: grid.dstYs,
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
          if (Array.isArray(parsed.dstXs) && parsed.dstXs.length >= 2) {
            grid.dstXs = parsed.dstXs.filter((v) => typeof v === "number" && v >= 0 && v <= 1);
            grid.dstXs.sort((a, b) => a - b);
            if (grid.dstXs[0] !== 0) grid.dstXs.unshift(0);
            if (grid.dstXs[grid.dstXs.length - 1] !== 1) grid.dstXs.push(1);
          }
          if (Array.isArray(parsed.dstYs) && parsed.dstYs.length >= 2) {
            grid.dstYs = parsed.dstYs.filter((v) => typeof v === "number" && v >= 0 && v <= 1);
            grid.dstYs.sort((a, b) => a - b);
            if (grid.dstYs[0] !== 0) grid.dstYs.unshift(0);
            if (grid.dstYs[grid.dstYs.length - 1] !== 1) grid.dstYs.push(1);
          }
          // Rebuild source lines to match count
          grid.srcXs = makeEvenLines(grid.dstXs.length);
          grid.srcYs = makeEvenLines(grid.dstYs.length);
          return;
        }
      }
    } catch {
      // ignore corrupt localStorage
    }
  }

  // ── Legacy compat ──────────────────────────────────────────────────────────

  function getCorners() {
    const lastRow = grid.dstYs.length - 1;
    const lastCol = grid.dstXs.length - 1;
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
    loadFromLocalStorage();
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
    CORNER_KEYS,
    // Legacy compat — grid warp is now post-draw, no begin/end needed.
    // These are kept so nothing crashes if called.
    beginGridWarpFrame: () => null,
    endGridWarpFrame: () => {},
    getGrid: () => ({ dstXs: grid.dstXs.slice(), dstYs: grid.dstYs.slice(), srcXs: grid.srcXs.slice(), srcYs: grid.srcYs.slice() }),
    resetGrid,
  };
})();
