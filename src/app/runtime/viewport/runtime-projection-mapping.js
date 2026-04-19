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

  const DEFAULT_COUNT = 5; // 5 lines = 4 columns/rows

  function makeEvenLines(n) {
    const lines = [];
    for (let i = 0; i < n; i++) lines.push(i / (n - 1));
    return lines;
  }

  const grid = {
    srcXs: makeEvenLines(DEFAULT_COUNT),
    srcYs: makeEvenLines(DEFAULT_COUNT),
    // points[row][col] = { x, y }. Built from srcXs/srcYs initially.
    points: null, // initialized in buildDefaultPoints()
  };

  function buildDefaultPoints() {
    const pts = [];
    for (let row = 0; row < grid.srcYs.length; row++) {
      pts[row] = [];
      for (let col = 0; col < grid.srcXs.length; col++) {
        pts[row][col] = { x: grid.srcXs[col], y: grid.srcYs[row] };
      }
    }
    grid.points = pts;
  }
  buildDefaultPoints();

  const CORNER_KEYS = ["topLeft", "topRight", "bottomRight", "bottomLeft"];

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getPoint(row, col) {
    return grid.points[row]?.[col] ?? { x: grid.srcXs[col] ?? 0, y: grid.srcYs[row] ?? 0 };
  }

  function setPoint(row, col, x, y) {
    if (grid.points[row]) grid.points[row][col] = { x, y };
  }

  /** Check whether any points differ from their default positions. */
  function hasGridDisplacements() {
    for (let row = 0; row < grid.srcYs.length; row++) {
      for (let col = 0; col < grid.srcXs.length; col++) {
        const pt = getPoint(row, col);
        if (Math.abs(pt.x - grid.srcXs[col]) > 1e-6 || Math.abs(pt.y - grid.srcYs[row]) > 1e-6) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Remap a normalized point (0-1) through the grid distortion.
   * Finds which source cell the point falls in, then bilinearly interpolates
   * within the displaced cell. Returns { x, y } in 0-1 range.
   */
  function remapPoint(nx, ny) {
    if (!hasGridDisplacements()) return { x: nx, y: ny };
    // Find cell
    let ci = 0, ri = 0;
    for (let i = 0; i < grid.srcXs.length - 1; i++) {
      if (nx <= grid.srcXs[i + 1] || i === grid.srcXs.length - 2) { ci = i; break; }
    }
    for (let i = 0; i < grid.srcYs.length - 1; i++) {
      if (ny <= grid.srcYs[i + 1] || i === grid.srcYs.length - 2) { ri = i; break; }
    }
    // Interpolation within the cell
    const sx = grid.srcXs[ci + 1] - grid.srcXs[ci];
    const sy = grid.srcYs[ri + 1] - grid.srcYs[ri];
    const tx = sx > 1e-10 ? (nx - grid.srcXs[ci]) / sx : 0;
    const ty = sy > 1e-10 ? (ny - grid.srcYs[ri]) / sy : 0;
    const tl = getPoint(ri, ci);
    const tr = getPoint(ri, ci + 1);
    const bl = getPoint(ri + 1, ci);
    const br = getPoint(ri + 1, ci + 1);
    // Bilinear interpolation
    const topX = tl.x + (tr.x - tl.x) * tx;
    const topY = tl.y + (tr.y - tl.y) * tx;
    const botX = bl.x + (br.x - bl.x) * tx;
    const botY = bl.y + (br.y - bl.y) * tx;
    return { x: topX + (botX - topX) * ty, y: topY + (botY - topY) * ty };
  }

  // ── Apply transform (no-op — all warping is done via canvas mesh) ──────────

  function applyTransform() {
    // No CSS transform — the unified grid mesh warp handles everything
    if (ctx?.stage) ctx.stage.style.transform = "none";
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

    // Clear and redraw through grid: source = evenly spaced, dest = per-point
    canvasCtx.clearRect(0, 0, w, h);

    for (let row = 0; row < grid.srcYs.length - 1; row++) {
      for (let col = 0; col < grid.srcXs.length - 1; col++) {
        // Source: evenly spaced cell from the snapshot
        const srcX = grid.srcXs[col] * w;
        const srcY = grid.srcYs[row] * h;
        const srcW = (grid.srcXs[col + 1] - grid.srcXs[col]) * w;
        const srcH = (grid.srcYs[row + 1] - grid.srcYs[row]) * h;
        if (srcW < 0.5 || srcH < 0.5) continue;

        // Destination: use top-left and bottom-right point positions
        // (drawImage can only do rect-to-rect, so we use the bounding rect
        // of the displaced cell — full perspective per-cell requires triangulation)
        const tl = getPoint(row, col);
        const br = getPoint(row + 1, col + 1);
        const dstX = tl.x * w;
        const dstY = tl.y * h;
        const dstW = (br.x - tl.x) * w;
        const dstH = (br.y - tl.y) * h;
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
    lineCanvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:auto;z-index:9997;cursor:default;outline:none;";
    lineCanvas.tabIndex = 0; // Make focusable for keyboard events
    document.body.appendChild(lineCanvas);
    lineCtx = lineCanvas.getContext("2d");

    lineCanvas.addEventListener("pointerdown", onLinePointerDown);
    lineCanvas.addEventListener("pointermove", onLineHover);
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
      lineCanvas.removeEventListener("pointermove", onLineHover);
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

    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;

    // Create handles at ALL grid intersections — freely draggable
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const el = document.createElement("div");
        el.className = "projection-corner-handle";
        el.dataset.gridRow = String(row);
        el.dataset.gridCol = String(col);
        const size = 18;
        el.style.cssText = `
          position: fixed;
          width: ${size}px; height: ${size}px;
          border-radius: 50%;
          background: rgba(0, 220, 200, 0.85);
          border: 2px solid rgba(255, 255, 255, 0.9);
          cursor: grab;
          z-index: 9999;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          transform: translate(-50%, -50%);
        `;

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
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;
    let idx = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const el = handleElements[idx];
        if (el) {
          const pt = getPoint(row, col);
          el.style.left = `${pt.x * vw}px`;
          el.style.top = `${pt.y * vh}px`;
          const key = `${row}-${col}`;
          if (key === activeHandleKey) {
            el.style.background = "rgba(255, 200, 30, 0.95)";
          } else {
            el.style.background = "rgba(0, 220, 200, 0.85)";
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

    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;

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

    // Draw drag-handle indicators BETWEEN intersections on each line segment
    // Horizontal lines: ↕ badges between each pair of adjacent column intersections
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const p1 = getPoint(row, col);
        const p2 = getPoint(row, col + 1);
        const px = ((p1.x + p2.x) / 2) * vw;
        const py = ((p1.y + p2.y) / 2) * vh;
        lineCtx.fillStyle = "rgba(0, 220, 180, 0.7)";
        lineCtx.beginPath();
        lineCtx.roundRect(px - 16, py - 8, 32, 16, 4);
        lineCtx.fill();
        lineCtx.fillStyle = "#fff";
        lineCtx.font = "bold 11px sans-serif";
        lineCtx.textAlign = "center";
        lineCtx.textBaseline = "middle";
        lineCtx.fillText("↕", px, py);
      }
    }
    // Vertical lines: ↔ badges between each pair of adjacent row intersections
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows - 1; row++) {
        const p1 = getPoint(row, col);
        const p2 = getPoint(row + 1, col);
        const px = ((p1.x + p2.x) / 2) * vw;
        const py = ((p1.y + p2.y) / 2) * vh;
        lineCtx.fillStyle = "rgba(0, 220, 180, 0.7)";
        lineCtx.beginPath();
        lineCtx.roundRect(px - 8, py - 16, 16, 32, 4);
        lineCtx.fill();
        lineCtx.fillStyle = "#fff";
        lineCtx.font = "bold 11px sans-serif";
        lineCtx.textAlign = "center";
        lineCtx.textBaseline = "middle";
        lineCtx.fillText("↔", px, py);
      }
    }

    // Filled quad from corners (semi-transparent)
    lineCtx.fillStyle = "rgba(255, 50, 50, 0.06)";
    lineCtx.beginPath();
    const lastRow = rows - 1;
    const lastCol = cols - 1;
    const quadCorners = [
      getPoint(0, 0),
      getPoint(0, cols - 1),
      getPoint(rows - 1, cols - 1),
      getPoint(rows - 1, 0),
    ];
    for (let i = 0; i < 4; i++) {
      const px = quadCorners[i].x * vw;
      const py = quadCorners[i].y * vh;
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

    // Move the intersection point freely in X+Y
    const newX = Math.max(0, Math.min(1, dragState.startPtX + dx));
    const newY = Math.max(0, Math.min(1, dragState.startPtY + dy));
    setPoint(dragState.row, dragState.col, newX, newY);

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

  function onLineHover(e) {
    if (lineDragState || !lineCanvas) return;
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
    lineCanvas.style.cursor = "default";
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
        // Capture start positions for all points on this row
        const startPts = [];
        for (let c = 0; c < cols; c++) startPts.push({ ...getPoint(row, c) });
        lineDragState = { axis: "horizontal", lineIndex: row, startY: my, startPts };
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
        const startPts = [];
        for (let r = 0; r < rows; r++) startPts.push({ ...getPoint(r, col) });
        lineDragState = { axis: "vertical", lineIndex: col, startX: mx, startPts };
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
    const cols = grid.srcXs.length;
    const rows = grid.srcYs.length;

    if (lineDragState.axis === "horizontal") {
      // Move all points on this row vertically only
      const dy = (e.clientY - lineDragState.startY) / vh;
      const row = lineDragState.lineIndex;
      for (let col = 0; col < cols; col++) {
        const start = lineDragState.startPts[col];
        setPoint(row, col, start.x, Math.max(0, Math.min(1, start.y + dy)));
      }
    } else {
      // Move all points on this column horizontally only
      const dx = (e.clientX - lineDragState.startX) / vw;
      const col = lineDragState.lineIndex;
      for (let row = 0; row < rows; row++) {
        const start = lineDragState.startPts[row];
        setPoint(row, col, Math.max(0, Math.min(1, start.x + dx)), start.y);
      }
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
    if (!handlesVisible) return;

    if (e.key === "Escape") {
      e.preventDefault();
      resetGrid();
      return;
    }

    if (!activeHandleKey) return;

    if (e.key === "Tab") {
      e.preventDefault();
      // Cycle through all handle keys
      const rows = grid.srcYs.length;
      const cols = grid.srcXs.length;
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
    for (let i = 1; i < grid.srcYs.length - 1; i++) {
      if (Math.abs(grid.srcYs[i] - normY) < nearLineThreshold) {
        nearHLine = i;
        break;
      }
    }
    // Check interior vertical lines
    for (let i = 1; i < grid.srcXs.length - 1; i++) {
      if (Math.abs(grid.srcXs[i] - normX) < nearLineThreshold) {
        nearVLine = i;
        break;
      }
    }

    const items = [];
    if (nearHLine >= 0 && grid.srcYs.length > 3) {
      // Can remove if more than edge lines + 1 interior line
      items.push({
        label: "Remove this horizontal line",
        action: () => removeHorizontalLine(nearHLine),
      });
    }
    if (nearVLine >= 0 && grid.srcXs.length > 3) {
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
    const newSrcYs = [...new Set([...grid.srcYs, normY])].sort((a, b) => a - b);
    grid.srcYs = newSrcYs;
    grid.srcXs = makeEvenLines(grid.srcXs.length); // keep X count
    buildDefaultPoints(); // reset all points to default positions
    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); }
  }

  function addVerticalLine(normX) {
    normX = Math.max(0.02, Math.min(0.98, normX));
    const newSrcXs = [...new Set([...grid.srcXs, normX])].sort((a, b) => a - b);
    grid.srcXs = newSrcXs;
    grid.srcYs = makeEvenLines(grid.srcYs.length); // keep Y count
    buildDefaultPoints();
    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); }
  }

  function removeHorizontalLine(index) {
    if (grid.srcYs.length <= 3) return;
    if (index === 0 || index === grid.srcYs.length - 1) return;
    grid.srcYs.splice(index, 1);
    buildDefaultPoints();
    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); }
  }

  function removeVerticalLine(index) {
    if (grid.srcXs.length <= 3) return;
    if (index === 0 || index === grid.srcXs.length - 1) return;
    grid.srcXs.splice(index, 1);
    buildDefaultPoints();
    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); }
  }

  function resetGrid() {
    grid.srcXs = makeEvenLines(DEFAULT_COUNT);
    grid.srcYs = makeEvenLines(DEFAULT_COUNT);
    buildDefaultPoints();
    applyTransform();
    try {
      localStorage.removeItem(LS_KEY_V2);
      localStorage.removeItem(LS_KEY_OLD);
    } catch { /* ignore */ }
    if (handlesVisible) { rebuildHandleElements(); drawLines(); }
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  // ── Show / Hide (unified — everything in one go) ───────────────────────────

  function showHandles() {
    if (handlesVisible) return;
    createHandles();
    // Bind keyboard globally so ESC works regardless of focus
    document.addEventListener("keydown", onKeyDown);
    activeHandleKey = "0-0";
  }

  function hideHandles() {
    if (!handlesVisible) return;
    document.removeEventListener("keydown", onKeyDown);
    removeHandles();
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
    getGrid: () => ({ srcXs: grid.srcXs.slice(), srcYs: grid.srcYs.slice(), points: grid.points }),
    resetGrid,
  };
})();
