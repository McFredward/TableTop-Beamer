// Phase 19-2: Projection mapping — 4-corner warp for /output via CSS matrix3d.
//
// Computes a perspective homography from 4 user-positioned corners and
// applies it as a CSS matrix3d() transform on the .stage element.
// Only active on /output (OUTPUT_ROLE_FINAL).
//
// Owns: corner state, homography math, CSS matrix3d application,
// drag handles, arrow key fine-tuning, persistence to global-defaults.
(() => {
  let ctx = null;

  // Corner positions in percentages (0-100) of the viewport.
  // Order: topLeft, topRight, bottomRight, bottomLeft.
  const DEFAULT_CORNERS = {
    topLeft:     { x: 0, y: 0 },
    topRight:    { x: 100, y: 0 },
    bottomRight: { x: 100, y: 100 },
    bottomLeft:  { x: 0, y: 100 },
  };

  const CORNER_KEYS = ["topLeft", "topRight", "bottomRight", "bottomLeft"];
  const CORNER_LABELS = { topLeft: "1", topRight: "2", bottomRight: "3", bottomLeft: "4" };
  // Edges: each connects two corners. Dragging an edge moves both corners.
  const EDGE_DEFS = [
    { id: "top",    corners: ["topLeft", "topRight"],     label: "T" },
    { id: "right",  corners: ["topRight", "bottomRight"], label: "R" },
    { id: "bottom", corners: ["bottomRight", "bottomLeft"], label: "B" },
    { id: "left",   corners: ["bottomLeft", "topLeft"],   label: "L" },
  ];

  let corners = deepCloneCorners(DEFAULT_CORNERS);
  let activeCornerIndex = 0; // which corner is "active" for arrow keys
  let handleElements = [];   // 4 draggable corner handle divs
  let edgeHandleElements = []; // 4 draggable edge (side) handle divs
  let lineCanvas = null;     // canvas overlay for connecting lines
  let lineCtx = null;
  let handlesVisible = false;
  let dragState = null;      // { cornerKey, startX, startY, startCornerX, startCornerY }
  let edgeDragState = null;  // { edgeDef, startX, startY, startCorners }

  function init(dependencies) {
    ctx = dependencies;
    // Load saved corners from localStorage on this client
    loadCornersFromLocalStorage();
  }

  // ── Deep clone helpers ──────────────────────────────────────────────────────

  function deepCloneCorners(c) {
    const out = {};
    for (const k of CORNER_KEYS) {
      out[k] = { x: c[k].x, y: c[k].y };
    }
    return out;
  }

  function cornersAreDefault() {
    for (const k of CORNER_KEYS) {
      if (corners[k].x !== DEFAULT_CORNERS[k].x || corners[k].y !== DEFAULT_CORNERS[k].y) {
        return false;
      }
    }
    return true;
  }

  // ── Homography math ─────────────────────────────────────────────────────────
  //
  // Given source rect (0,0)-(w,h) and 4 destination points, compute the
  // 3x3 perspective transform H such that H * [src] ~ [dst].
  // Then convert to CSS matrix3d (column-major 4x4).
  //
  // We use the adjugate-based approach (no SVD needed for exactly 4 points
  // mapping from a rectangle):
  //
  // Source quad: (0,0), (w,0), (w,h), (0,h)
  // Dest quad:   (x0,y0), (x1,y1), (x2,y2), (x3,y3)

  function computeMatrix3d(w, h, dst) {
    // dst = [{ x, y }, { x, y }, { x, y }, { x, y }] in px
    // Maps from source rectangle to destination quadrilateral.
    //
    // We compute the perspective transform using the standard algorithm:
    // H maps (0,0)->(x0,y0), (w,0)->(x1,y1), (w,h)->(x2,y2), (0,h)->(x3,y3)
    //
    // First compute the transform from unit square to dst quad, then
    // compose with the transform from src rect to unit square.

    const x0 = dst[0].x, y0 = dst[0].y;
    const x1 = dst[1].x, y1 = dst[1].y;
    const x2 = dst[2].x, y2 = dst[2].y;
    const x3 = dst[3].x, y3 = dst[3].y;

    // Transform from unit square [0,1]x[0,1] to quad (x0..x3, y0..y3)
    // Using the algorithm from Paul Heckbert's thesis / Projective Mappings.
    const dx1 = x1 - x2;
    const dx2 = x3 - x2;
    const dx3 = x0 - x1 + x2 - x3;
    const dy1 = y1 - y2;
    const dy2 = y3 - y2;
    const dy3 = y0 - y1 + y2 - y3;

    const denom = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(denom) < 1e-10) {
      // Degenerate — return identity
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
    // g, h_ already computed
    // i = 1

    // H_unit maps unit square to dst:
    // H_unit = [[a, b, c], [d, e, f], [g, h_, 1]]

    // Now compose with source rect -> unit square:
    // S = [[1/w, 0, 0], [0, 1/h, 0], [0, 0, 1]]
    // Final H = H_unit * S

    const ha = a / w;
    const hb = b / h;
    const hc = c;
    const hd = d / w;
    const he = e / h;
    const hf = f;
    const hg = g / w;
    const hh = h_ / h;
    // hi = 1

    // Convert 3x3 homography to CSS matrix3d (4x4, column-major)
    // CSS matrix3d(a1,a2,a3,a4, b1,b2,b3,b4, c1,c2,c3,c4, d1,d2,d3,d4)
    // where columns are:
    //   col0: [a1,a2,a3,a4]  col1: [b1,b2,b3,b4]  col2: [c1,c2,c3,c4]  col3: [d1,d2,d3,d4]
    //
    // From 3x3 [ha,hb,hc; hd,he,hf; hg,hh,1] we embed into 4x4:
    //   [ha, hb, 0, hc]
    //   [hd, he, 0, hf]
    //   [ 0,  0, 1,  0]
    //   [hg, hh, 0,  1]
    //
    // CSS matrix3d is column-major:
    return `matrix3d(${ha},${hd},0,${hg}, ${hb},${he},0,${hh}, 0,0,1,0, ${hc},${hf},0,1)`;
  }

  // ── Apply transform ─────────────────────────────────────────────────────────

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

    // Convert percentage corners to pixel positions
    const dst = CORNER_KEYS.map((k) => ({
      x: (corners[k].x / 100) * vw,
      y: (corners[k].y / 100) * vh,
    }));

    const matrix = computeMatrix3d(vw, vh, dst);
    stage.style.transform = matrix;
    stage.style.transformOrigin = "0 0";
  }

  // ── Handle UI ───────────────────────────────────────────────────────────────

  function createHandles() {
    if (handleElements.length > 0) return;

    // Line canvas overlay
    lineCanvas = document.createElement("canvas");
    lineCanvas.id = "projection-line-canvas";
    lineCanvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9998;";
    document.body.appendChild(lineCanvas);
    lineCtx = lineCanvas.getContext("2d");

    for (let i = 0; i < 4; i++) {
      const key = CORNER_KEYS[i];
      const el = document.createElement("div");
      el.className = "projection-corner-handle";
      el.dataset.cornerIndex = String(i);
      el.dataset.cornerKey = key;
      el.textContent = CORNER_LABELS[key];
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
        transition: background 120ms ease, transform 120ms ease;
      `;
      el.addEventListener("pointerdown", onHandlePointerDown);
      document.body.appendChild(el);
      handleElements.push(el);
    }

    // Create edge (side) handles — small rectangles at midpoints of each edge
    for (let i = 0; i < EDGE_DEFS.length; i++) {
      const edge = EDGE_DEFS[i];
      const el = document.createElement("div");
      el.className = "projection-edge-handle";
      el.dataset.edgeIndex = String(i);
      el.dataset.edgeId = edge.id;
      const isVertical = edge.id === "left" || edge.id === "right";
      el.style.cssText = `
        position: fixed;
        width: ${isVertical ? "12px" : "28px"};
        height: ${isVertical ? "28px" : "12px"};
        border-radius: 4px;
        background: rgba(100, 160, 255, 0.8);
        border: 2px solid rgba(255, 255, 255, 0.85);
        cursor: ${isVertical ? "ew-resize" : "ns-resize"};
        z-index: 9998;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        transition: background 120ms ease;
      `;
      el.addEventListener("pointerdown", onEdgePointerDown);
      document.body.appendChild(el);
      edgeHandleElements.push(el);
    }

    positionHandles();
    drawLines();
  }

  function removeHandles() {
    for (const el of handleElements) {
      el.removeEventListener("pointerdown", onHandlePointerDown);
      el.remove();
    }
    handleElements = [];
    for (const el of edgeHandleElements) {
      el.removeEventListener("pointerdown", onEdgePointerDown);
      el.remove();
    }
    edgeHandleElements = [];
    if (lineCanvas) {
      lineCanvas.remove();
      lineCanvas = null;
      lineCtx = null;
    }
  }

  function positionHandles() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (let i = 0; i < handleElements.length; i++) {
      const key = CORNER_KEYS[i];
      const px = (corners[key].x / 100) * vw;
      const py = (corners[key].y / 100) * vh;
      handleElements[i].style.left = `${px - 14}px`;
      handleElements[i].style.top = `${py - 14}px`;
      // Active corner highlight
      if (i === activeCornerIndex) {
        handleElements[i].style.background = "rgba(255, 200, 30, 0.95)";
        handleElements[i].style.transform = "scale(1.25)";
        handleElements[i].style.color = "#000";
      } else {
        handleElements[i].style.background = "rgba(220, 30, 30, 0.85)";
        handleElements[i].style.transform = "scale(1)";
        handleElements[i].style.color = "#fff";
      }
    }
    // Position edge handles at midpoints of each edge
    for (let i = 0; i < edgeHandleElements.length; i++) {
      const edge = EDGE_DEFS[i];
      const c1 = corners[edge.corners[0]];
      const c2 = corners[edge.corners[1]];
      const mx = ((c1.x + c2.x) / 2 / 100) * vw;
      const my = ((c1.y + c2.y) / 2 / 100) * vh;
      const isVertical = edge.id === "left" || edge.id === "right";
      edgeHandleElements[i].style.left = `${mx - (isVertical ? 6 : 14)}px`;
      edgeHandleElements[i].style.top = `${my - (isVertical ? 14 : 6)}px`;
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

    lineCtx.strokeStyle = "rgba(220, 30, 30, 0.7)";
    lineCtx.lineWidth = 2;
    lineCtx.beginPath();
    for (let i = 0; i < 4; i++) {
      const k = CORNER_KEYS[i];
      const px = (corners[k].x / 100) * vw;
      const py = (corners[k].y / 100) * vh;
      if (i === 0) lineCtx.moveTo(px, py);
      else lineCtx.lineTo(px, py);
    }
    lineCtx.closePath();
    lineCtx.stroke();

    // Filled quad (semi-transparent)
    lineCtx.fillStyle = "rgba(255, 50, 50, 0.06)";
    lineCtx.beginPath();
    for (let i = 0; i < 4; i++) {
      const k = CORNER_KEYS[i];
      const px = (corners[k].x / 100) * vw;
      const py = (corners[k].y / 100) * vh;
      if (i === 0) lineCtx.moveTo(px, py);
      else lineCtx.lineTo(px, py);
    }
    lineCtx.closePath();
    lineCtx.fill();
  }

  // ── Drag handling ───────────────────────────────────────────────────────────

  function onHandlePointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const idx = Number(e.currentTarget.dataset.cornerIndex);
    const key = CORNER_KEYS[idx];
    activeCornerIndex = idx;

    dragState = {
      cornerKey: key,
      startX: e.clientX,
      startY: e.clientY,
      startCornerX: corners[key].x,
      startCornerY: corners[key].y,
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
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const newX = dragState.startCornerX + (dx / vw) * 100;
    const newY = dragState.startCornerY + (dy / vh) * 100;
    corners[dragState.cornerKey].x = Math.max(0, Math.min(100, newX));
    corners[dragState.cornerKey].y = Math.max(0, Math.min(100, newY));
    positionHandles();
    drawLines();
    applyTransform();
  }

  function onDragEnd(e) {
    if (!dragState) return;
    dragState = null;
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);
    document.removeEventListener("pointercancel", onDragEnd);
    positionHandles();
  }

  // ── Edge (side) drag handling ──────────────────────────────────────────────

  function onEdgePointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const idx = Number(e.currentTarget.dataset.edgeIndex);
    const edge = EDGE_DEFS[idx];

    edgeDragState = {
      edgeDef: edge,
      startX: e.clientX,
      startY: e.clientY,
      startCorners: {
        [edge.corners[0]]: { ...corners[edge.corners[0]] },
        [edge.corners[1]]: { ...corners[edge.corners[1]] },
      },
    };

    e.currentTarget.setPointerCapture(e.pointerId);
    document.addEventListener("pointermove", onEdgeDragMove);
    document.addEventListener("pointerup", onEdgeDragEnd);
    document.addEventListener("pointercancel", onEdgeDragEnd);
  }

  function onEdgeDragMove(e) {
    if (!edgeDragState) return;
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dx = ((e.clientX - edgeDragState.startX) / vw) * 100;
    const dy = ((e.clientY - edgeDragState.startY) / vh) * 100;
    for (const ck of edgeDragState.edgeDef.corners) {
      const start = edgeDragState.startCorners[ck];
      corners[ck].x = Math.max(0, Math.min(100, start.x + dx));
      corners[ck].y = Math.max(0, Math.min(100, start.y + dy));
    }
    positionHandles();
    drawLines();
    applyTransform();
  }

  function onEdgeDragEnd() {
    if (!edgeDragState) return;
    edgeDragState = null;
    document.removeEventListener("pointermove", onEdgeDragMove);
    document.removeEventListener("pointerup", onEdgeDragEnd);
    document.removeEventListener("pointercancel", onEdgeDragEnd);
    positionHandles();
  }

  // ── Arrow key fine-tuning ───────────────────────────────────────────────────

  function onKeyDown(e) {
    if (!handlesVisible) return;

    if (e.key === "Tab") {
      e.preventDefault();
      activeCornerIndex = (activeCornerIndex + 1) % 4;
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
    const key = CORNER_KEYS[activeCornerIndex];
    corners[key].x += (dir[0] * step / vw) * 100;
    corners[key].y += (dir[1] * step / vh) * 100;
    corners[key].x = Math.max(0, Math.min(100, corners[key].x));
    corners[key].y = Math.max(0, Math.min(100, corners[key].y));
    positionHandles();
    drawLines();
    applyTransform();
  }

  // ── Show / Hide ─────────────────────────────────────────────────────────────

  function showHandles() {
    if (handlesVisible) return;
    handlesVisible = true;
    createHandles();
    document.addEventListener("keydown", onKeyDown);
  }

  function hideHandles() {
    if (!handlesVisible) return;
    handlesVisible = false;
    removeHandles();
    document.removeEventListener("keydown", onKeyDown);
  }

  // ── Persistence (localStorage — per-client, not global) ─────────────────────

  const LOCAL_STORAGE_KEY = "tt-beamer.projection-mapping.corners";

  function loadCornersFromLocalStorage() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      for (const k of CORNER_KEYS) {
        if (parsed[k] && typeof parsed[k].x === "number" && typeof parsed[k].y === "number") {
          corners[k] = { x: parsed[k].x, y: parsed[k].y };
        }
      }
    } catch {
      // ignore corrupt localStorage
    }
  }

  function saveCornersToLocalStorage() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(deepCloneCorners(corners)));
    } catch {
      // ignore storage errors
    }
  }

  // Legacy compat — loadCornersFromConfig still works if called
  function loadCornersFromConfig(globalDefaults) {
    const pm = globalDefaults?.projectionMapping;
    if (!pm || !pm.corners) return;
    for (const k of CORNER_KEYS) {
      if (pm.corners[k] && typeof pm.corners[k].x === "number" && typeof pm.corners[k].y === "number") {
        corners[k] = { x: pm.corners[k].x, y: pm.corners[k].y };
      }
    }
  }

  function getCornersForPersistence() {
    return deepCloneCorners(corners);
  }

  function resetCorners() {
    corners = deepCloneCorners(DEFAULT_CORNERS);
    applyTransform();
    saveCornersToLocalStorage();
    if (handlesVisible) {
      positionHandles();
      drawLines();
    }
  }

  // ── Align mode integration ──────────────────────────────────────────────────

  function onAlignModeChange(enabled) {
    if (ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) return;
    if (enabled) {
      applyTransform();
      showHandles();
    } else {
      hideHandles();
      // Keep transform applied — calibration persists
      // Save corners
      saveCorners();
    }
  }

  function saveCorners() {
    saveCornersToLocalStorage();
  }

  // ── Resize handling ─────────────────────────────────────────────────────────

  function onWindowResize() {
    if (ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) return;
    applyTransform();
    if (handlesVisible) {
      positionHandles();
      drawLines();
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING = {
    init,
    applyTransform,
    showHandles,
    hideHandles,
    loadCornersFromConfig,
    getCornersForPersistence,
    resetCorners,
    onAlignModeChange,
    onWindowResize,
    getCorners: () => deepCloneCorners(corners),
    getActiveCornerIndex: () => activeCornerIndex,
    CORNER_KEYS,
  };
})();
