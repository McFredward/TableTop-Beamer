// Unified Grid Projection — handle UI shell.
//
// Sub-module of runtime-projection-mapping. After W3.6-Cextra-handle-ui
// (minimal Option-B split), drag handlers live in
// runtime-projection-handle-drag.js. This shell owns:
//  - DOM lifecycle for grid handles + line canvas (handleElements,
//    lineCanvas, lineCtx, rotateHandleElements, contextMenu,
//    handlesVisible, activeHandleKey).
//  - Handle creation/teardown (createHandles, removeHandles,
//    rebuildHandleElements, rebuildRotateHandles).
//  - Render fns called by drag handlers (positionHandles,
//    positionRotateHandles, drawLines).
//  - Context menu (onContextMenu, showContextMenu,
//    dismissContextMenu, dismissContextMenuOnOutside).
//  - Grid line add/remove (addHorizontalLine, addVerticalLine,
//    removeHorizontalLine, removeVerticalLine).
//  - Show/hide + Align Mode integration (showHandles, hideHandles,
//    onAlignModeChange) and resize handling (onWindowResize).
//  - Arrow-key fine-tuning (onKeyDown).
//
// Reads grid + helpers via injected refs from grid-state. Reads
// applyTransform + profile flow callbacks from the shim. Reads ctx
// for outputRole / renderRoomOverlay. Forwards drag listener fn
// refs from the handle-drag sub-module via DOM addEventListener.
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

  // Handle-drag sub-module (W3.6-Cextra-handle-ui). Listener fn refs
  // resolved at parse time from the global namespace; exact functions
  // are aliased into IIFE-local lets so the shell's createHandles /
  // removeHandles / rebuildHandleElements / rebuildRotateHandles
  // bodies can attach/remove them as bare identifiers (byte-identical
  // to the pre-split form).
  const dragModule = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_DRAG;
  const {
    onHandlePointerDown,
    onRotateHandlePointerDown,
    onLinePointerDown,
    onLineHover,
  } = dragModule;

  let handleElements = [];    // All grid point handle divs
  let lineCanvas = null;      // Canvas overlay for grid lines
  let lineCtx = null;
  let handlesVisible = false;
  let activeHandleKey = null; // "row-col" of selected handle for arrow keys
  let contextMenu = null;     // Context menu DOM element

  let rotateHandleElements = [];

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
    dragModule.setLineCanvas(lineCanvas);

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
    dragModule.setLineCanvas(null);

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

  // Rotate handle drag handlers moved to handle-drag sub-module
  // (W3.6-Cextra-handle-ui): onRotateHandlePointerDown,
  // onRotateDragMove, onRotateDragEnd.

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

  // Handle drag handlers moved to handle-drag sub-module
  // (W3.6-Cextra-handle-ui): onHandlePointerDown, onDragMove, onDragEnd.

  // Grid line drag + whole-grid pan handlers moved to handle-drag
  // sub-module (W3.6-Cextra-handle-ui): onLineHover, onLinePointerDown,
  // onPanDragMove, onPanDragEnd, onLineDragMove, onLineDragEnd.

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
    // Handle-drag sub-module init (W3.6-Cextra-handle-ui). Forward
    // grid bindings + applyTransform + the shell's render fns +
    // setActiveHandleKey setter so drag bodies resolve them via
    // bare identifiers (byte-identical post-split).
    dragModule.init(Object.assign({}, dependencies, {
      grid,
      getPoint,
      setPoint,
      pushUndo,
      saveToLocalStorage,
      applyTransform,
      positionHandles,
      positionRotateHandles,
      drawLines,
      setActiveHandleKey,
    }));
  }

  // Shell setter for activeHandleKey (W3.6-Cextra-handle-ui bridge).
  // The drag sub-module's onHandlePointerDown calls this so the
  // shell's `let activeHandleKey` (read by positionHandles, onKeyDown,
  // showHandles) stays the source of truth.
  function setActiveHandleKey(key) {
    activeHandleKey = key;
  }

  function getHandlesVisible() { return handlesVisible; }

  window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI = {
    init,
    showHandles,
    hideHandles,
    onAlignModeChange,
    onWindowResize,
    rebuildHandleElements,
    positionHandles,
    positionRotateHandles,
    drawLines,
    showContextMenu,
    dismissContextMenu,
    getHandlesVisible,
  };
})();
