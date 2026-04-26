// Unified Grid Projection — handle UI.
//
// Sub-module of runtime-projection-mapping. Owns:
//  - All handle drag state (handleElements, lineCanvas, lineCtx,
//    dragState, lineDragState, panDragState, rotateDragState,
//    rotateHandleElements, activeHandleKey, contextMenu, handlesVisible).
//  - Handle creation/teardown (createHandles, removeHandles,
//    rebuildHandleElements, rebuildRotateHandles, positionHandles,
//    positionRotateHandles, drawLines).
//  - Drag handlers (onHandlePointerDown, onDragMove, onDragEnd,
//    onLineHover, onLinePointerDown, onPanDragMove, onPanDragEnd,
//    onLineDragMove, onLineDragEnd, onRotate*).
//  - Context menu (onContextMenu, showContextMenu,
//    dismissContextMenu, dismissContextMenuOnOutside).
//  - Grid line add/remove (addHorizontalLine, addVerticalLine,
//    removeHorizontalLine, removeVerticalLine).
//  - Show/hide + Align Mode integration (showHandles, hideHandles,
//    onAlignModeChange).
//  - Arrow-key fine-tuning (onKeyDown).
//
// Reads grid + helpers via injected refs from grid-state. Reads
// applyTransform + profile flow callbacks from the shim. Reads ctx
// for outputRole / renderRoomOverlay.
(() => {
  let ctx = null;

  // Grid bindings injected at init time.
  let grid = null;
  let getPoint = () => ({ x: 0, y: 0 });
  let setPoint = () => {};
  let pushUndo = () => {};
  let undo = () => {};
  let clearUndo = () => {};
  let saveToLocalStorage = () => {};
  let resetGrid = () => {};

  // Cross-module callbacks injected at init time.
  let applyTransform = () => {};
  let profileSaveFlow = () => {};
  let profileLoadFlow = () => {};
  let profileDeleteFlow = () => {};
  // gridState reference (W3.2-C4 deviation): init-injected so the
  // moved bodies of createHandles / removeHandles can keep their
  // pre-split form `gridState.setHandlesVisible(true|false)`
  // byte-identical.
  let gridState = { setHandlesVisible: () => {} };

  let handleElements = [];    // All grid point handle divs
  let lineCanvas = null;      // Canvas overlay for grid lines
  let lineCtx = null;
  let handlesVisible = false;
  let dragState = null;       // { row, col, startX, startY, startPtX, startPtY }
  let activeHandleKey = null; // "row-col" of selected handle for arrow keys
  let contextMenu = null;     // Context menu DOM element

  // Grid line drag state
  let lineDragState = null;
  // Whole-grid pan state (click on empty area + drag)
  let panDragState = null;
  // Rotate state — corner handles can rotate the whole grid around its centroid
  let rotateDragState = null;
  let rotateHandleElements = [];
  const LINE_HIT_THRESHOLD = 15; // px

  function createHandles() {
    if (handlesVisible) return;
    handlesVisible = true;
    gridState.setHandlesVisible(true);

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
    gridState.setHandlesVisible(false);

    for (const el of handleElements) {
      el.removeEventListener("pointerdown", onHandlePointerDown);
      el.remove();
    }
    handleElements = [];

    for (const el of rotateHandleElements) {
      el.removeEventListener("pointerdown", onRotateHandlePointerDown);
      el.remove();
    }
    rotateHandleElements = [];

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

    rebuildRotateHandles();
    positionHandles();
    positionRotateHandles();
  }

  // ── Rotate handles (one per corner — rotate whole grid around centroid) ────

  // corner keys: TL, TR, BR, BL
  const ROTATE_CORNERS = [
    { key: "TL", rowFn: () => 0,                          colFn: () => 0,                          offX: -30, offY: -30 },
    { key: "TR", rowFn: () => 0,                          colFn: () => grid.srcXs.length - 1,      offX:  30, offY: -30 },
    { key: "BR", rowFn: () => grid.srcYs.length - 1,      colFn: () => grid.srcXs.length - 1,      offX:  30, offY:  30 },
    { key: "BL", rowFn: () => grid.srcYs.length - 1,      colFn: () => 0,                          offX: -30, offY:  30 },
  ];

  function rebuildRotateHandles() {
    for (const el of rotateHandleElements) {
      el.removeEventListener("pointerdown", onRotateHandlePointerDown);
      el.remove();
    }
    rotateHandleElements = [];
    for (const corner of ROTATE_CORNERS) {
      const el = document.createElement("div");
      el.className = "projection-rotate-handle";
      el.dataset.rotateCorner = corner.key;
      el.textContent = "↻";
      const size = 22;
      el.style.cssText = `
        position: fixed;
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: rgba(255, 160, 30, 0.9);
        border: 2px solid rgba(255, 255, 255, 0.95);
        color: #fff;
        font-size: 14px;
        font-weight: bold;
        line-height: ${size - 4}px;
        text-align: center;
        cursor: crosshair;
        z-index: 10000;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        transform: translate(-50%, -50%);
      `;
      el.addEventListener("pointerdown", onRotateHandlePointerDown);
      document.body.appendChild(el);
      rotateHandleElements.push(el);
    }
  }

  function positionRotateHandles() {
    if (rotateHandleElements.length !== ROTATE_CORNERS.length) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (let i = 0; i < ROTATE_CORNERS.length; i++) {
      const c = ROTATE_CORNERS[i];
      const row = c.rowFn();
      const col = c.colFn();
      const pt = getPoint(row, col);
      rotateHandleElements[i].style.left = `${pt.x * vw + c.offX}px`;
      rotateHandleElements[i].style.top = `${pt.y * vh + c.offY}px`;
    }
  }

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
    setPoint(dragState.row, dragState.col, newX, newY);

    // If this is an edge point, proportionally scale all inner points
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;
    const lastRow = rows - 1;
    const lastCol = cols - 1;
    const r = dragState.row;
    const c = dragState.col;
    const sp = dragState.allStartPts;

    const isEdge = r === 0 || r === lastRow || c === 0 || c === lastCol;
    if (isEdge) {
      // Compute new bounding box from all 4 edges (using their current positions)
      // For X: left edge = avg of col 0 points, right edge = avg of last col points
      // Simpler: use the actual moved point to determine the scale
      // Scale X: if col=0 or col=lastCol moved, remap all inner cols proportionally
      if (c === 0 || c === lastCol) {
        // Get old and new X for this edge column across all rows
        for (let ri = 0; ri < rows; ri++) {
          // Move all points on this edge row's column to match
          setPoint(ri, c, newX, getPoint(ri, c).y);
        }
        // Proportionally adjust inner columns
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
      if (r === 0 || r === lastRow) {
        // Move all points on this edge row to match
        for (let ci = 0; ci < cols; ci++) {
          setPoint(r, ci, getPoint(r, ci).x, newY);
        }
        // Proportionally adjust inner rows
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
    }

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

  // ── Arrow key fine-tuning ──────────────────────────────────────────────────

  function onKeyDown(e) {
    if (!handlesVisible) return;

    // Ctrl+Z / Cmd+Z → undo
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      undo();
      return;
    }

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
    pushUndo();
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
    positionRotateHandles();
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
      label: "Save profile...",
      action: () => profileSaveFlow(),
    });
    items.push({
      label: "Load profile...",
      action: () => profileLoadFlow(),
    });
    items.push({
      label: "Delete profile...",
      action: () => profileDeleteFlow(),
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
      document.addEventListener("pointerdown", dismissContextMenuOnOutside, true);
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
    document.removeEventListener("pointerdown", dismissContextMenuOnOutside, true);
  }

  // ── Grid line add/remove ───────────────────────────────────────────────────

  function addHorizontalLine(normY) {
    normY = Math.max(0.02, Math.min(0.98, normY));
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;

    // Compute each row's average screen-space Y (reflects current deformation)
    const avgYs = [];
    for (let r = 0; r < rows; r++) {
      let s = 0;
      for (let c = 0; c < cols; c++) s += grid.points[r][c].y;
      avgYs.push(s / cols);
    }

    // Find insertion index in screen space
    let insertIdx = rows;
    for (let i = 0; i < rows; i++) {
      if (normY < avgYs[i]) { insertIdx = i; break; }
    }
    if (insertIdx === 0) insertIdx = 1;
    if (insertIdx >= rows) insertIdx = rows - 1;
    const above = insertIdx - 1;
    const below = insertIdx;
    const yA = avgYs[above];
    const yB = avgYs[below];
    if (Math.abs(yB - yA) < 1e-6) return;
    const t = (normY - yA) / (yB - yA);
    if (t < 0.01 || t > 0.99) return; // too close to an existing line

    const newSrcY = grid.srcYs[above] + t * (grid.srcYs[below] - grid.srcYs[above]);
    for (const y of grid.srcYs) if (Math.abs(y - newSrcY) < 1e-6) return;
    pushUndo();

    // Interpolate new row's points between above and below at screen-space t
    const newRow = [];
    for (let c = 0; c < cols; c++) {
      const pA = grid.points[above][c];
      const pB = grid.points[below][c];
      newRow.push({
        x: pA.x + (pB.x - pA.x) * t,
        y: pA.y + (pB.y - pA.y) * t,
      });
    }
    grid.srcYs.splice(insertIdx, 0, newSrcY);
    grid.points.splice(insertIdx, 0, newRow);

    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); }
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function addVerticalLine(normX) {
    normX = Math.max(0.02, Math.min(0.98, normX));
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;

    const avgXs = [];
    for (let c = 0; c < cols; c++) {
      let s = 0;
      for (let r = 0; r < rows; r++) s += grid.points[r][c].x;
      avgXs.push(s / rows);
    }

    let insertIdx = cols;
    for (let i = 0; i < cols; i++) {
      if (normX < avgXs[i]) { insertIdx = i; break; }
    }
    if (insertIdx === 0) insertIdx = 1;
    if (insertIdx >= cols) insertIdx = cols - 1;
    const left = insertIdx - 1;
    const right = insertIdx;
    const xA = avgXs[left];
    const xB = avgXs[right];
    if (Math.abs(xB - xA) < 1e-6) return;
    const t = (normX - xA) / (xB - xA);
    if (t < 0.01 || t > 0.99) return;

    const newSrcX = grid.srcXs[left] + t * (grid.srcXs[right] - grid.srcXs[left]);
    for (const x of grid.srcXs) if (Math.abs(x - newSrcX) < 1e-6) return;
    pushUndo();

    for (let r = 0; r < rows; r++) {
      const pL = grid.points[r][left];
      const pR = grid.points[r][right];
      const newPt = {
        x: pL.x + (pR.x - pL.x) * t,
        y: pL.y + (pR.y - pL.y) * t,
      };
      grid.points[r].splice(insertIdx, 0, newPt);
    }
    grid.srcXs.splice(insertIdx, 0, newSrcX);

    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); }
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function removeHorizontalLine(index) {
    if (grid.srcYs.length <= 3) return;
    if (index === 0 || index === grid.srcYs.length - 1) return;
    pushUndo();
    grid.srcYs.splice(index, 1);
    grid.points.splice(index, 1);
    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); }
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function removeVerticalLine(index) {
    if (grid.srcXs.length <= 3) return;
    if (index === 0 || index === grid.srcXs.length - 1) return;
    pushUndo();
    grid.srcXs.splice(index, 1);
    for (const row of grid.points) row.splice(index, 1);
    saveToLocalStorage();
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
    clearUndo();
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

  function init(dependencies) {
    ctx = dependencies;
    // Grid-state bindings.
    if (dependencies?.grid) grid = dependencies.grid;
    if (typeof dependencies?.getPoint === "function") getPoint = dependencies.getPoint;
    if (typeof dependencies?.setPoint === "function") setPoint = dependencies.setPoint;
    if (typeof dependencies?.pushUndo === "function") pushUndo = dependencies.pushUndo;
    if (typeof dependencies?.undo === "function") undo = dependencies.undo;
    if (typeof dependencies?.clearUndo === "function") clearUndo = dependencies.clearUndo;
    if (typeof dependencies?.saveToLocalStorage === "function") saveToLocalStorage = dependencies.saveToLocalStorage;
    if (typeof dependencies?.resetGrid === "function") resetGrid = dependencies.resetGrid;
    // Cross-module callbacks.
    if (typeof dependencies?.applyTransform === "function") applyTransform = dependencies.applyTransform;
    if (typeof dependencies?.profileSaveFlow === "function") profileSaveFlow = dependencies.profileSaveFlow;
    if (typeof dependencies?.profileLoadFlow === "function") profileLoadFlow = dependencies.profileLoadFlow;
    if (typeof dependencies?.profileDeleteFlow === "function") profileDeleteFlow = dependencies.profileDeleteFlow;
    if (dependencies?.gridState && typeof dependencies.gridState.setHandlesVisible === "function") {
      gridState = dependencies.gridState;
    }
  }

  function getHandlesVisible() { return handlesVisible; }

  window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI = {
    init,
    showHandles,
    hideHandles,
    onAlignModeChange,
    rebuildHandleElements,
    positionHandles,
    positionRotateHandles,
    drawLines,
    showContextMenu,
    dismissContextMenu,
    getHandlesVisible,
  };
})();
