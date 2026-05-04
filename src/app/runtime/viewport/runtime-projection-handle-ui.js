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
  let profileSaveFlow = () => {};   // Phase 27: points to saveLoadedProfileFlow via init
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
  // h12: corner scale-handles (proportional whole-board scale around centroid).
  let scaleHandleElements = [];

  // Phase 27 (B9): squish bars — 4 elements (TOP, BOTTOM, LEFT, RIGHT).
  let squishBarElements = [];

  // Phase 27: align-mode toolbar (B3 + B4) — only present on /output/ in align mode.
  let alignToolbarRoot = null;        // outer pill container (HTMLDivElement|null)
  let alignChipNameEl = null;          // span for profile name
  let alignChipDotEl = null;           // span for dirty dot
  let alignSaveBtn = null;
  let alignSaveAsBtn = null;
  let alignDiscardBtn = null;
  let _alignDirtyListener = null;
  let _profilePersistApi = null;       // resolved at first use from window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE

  // h6: toolbar position — null means use the default centered top placement.
  // Saved per-profile in the projection-profile JSON. Also persisted to
  // localStorage so it survives reloads when no profile is loaded.
  // Dragging the toolbar does NOT mark the profile dirty (geometry is what
  // counts for dirty); on profile save the current position is included.
  const TOOLBAR_POS_LS_KEY = "tt-beamer.align-toolbar-position.v1";
  let alignToolbarPosition = null;     // {x: number, y: number} or null
  let _toolbarDragState = null;        // {pointerId, startX, startY, originX, originY}
  try {
    const raw = window.localStorage?.getItem(TOOLBAR_POS_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
        alignToolbarPosition = { x: Number(parsed.x), y: Number(parsed.y) };
      }
    }
  } catch { /* ignore */ }

  function setAlignToolbarPosition(pos, { persist = false } = {}) {
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
      alignToolbarPosition = null;
    } else {
      alignToolbarPosition = { x: Number(pos.x), y: Number(pos.y) };
    }
    if (persist) {
      try {
        if (alignToolbarPosition) {
          window.localStorage?.setItem(TOOLBAR_POS_LS_KEY, JSON.stringify(alignToolbarPosition));
        } else {
          window.localStorage?.removeItem(TOOLBAR_POS_LS_KEY);
        }
      } catch { /* ignore */ }
    }
    _applyAlignToolbarPosition();
  }

  function getAlignToolbarPosition() {
    return alignToolbarPosition ? { x: alignToolbarPosition.x, y: alignToolbarPosition.y } : null;
  }

  function _applyAlignToolbarPosition() {
    if (!alignToolbarRoot) return;
    if (alignToolbarPosition) {
      // Custom position: anchor by top-left, no transform.
      alignToolbarRoot.style.left = `${alignToolbarPosition.x}px`;
      alignToolbarRoot.style.top = `${alignToolbarPosition.y}px`;
      alignToolbarRoot.style.transform = "none";
    } else {
      // Default: centered top.
      alignToolbarRoot.style.left = "50%";
      alignToolbarRoot.style.top = "16px";
      alignToolbarRoot.style.transform = "translateX(-50%)";
    }
  }

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
    removeAlignToolbar();
    removeSquishBars();
    // h12: tear down scale handles alongside rotate/squish handles.
    removeScaleHandles();
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
        // Phase 27 (B7/h3): forward contextmenu from the handle DOM to
        // the align-mode menu. Without this, right-clicks landing exactly
        // on an intersection-handle element show the native browser menu
        // because the handle (z-index 9999) sits above the lineCanvas
        // (z-index 9997) which is where the contextmenu listener lives.
        // onContextMenu's hit-test uses screen-space coordinates, so it
        // correctly identifies the click as an intersection regardless of
        // which DOM element received the event.
        el.addEventListener("contextmenu", onContextMenu);
        document.body.appendChild(el);
        handleElements.push(el);
      }
    }

    rebuildRotateHandles();
    rebuildSquishBars();
    // h12: corner scale-handles rebuild alongside rotate handles.
    rebuildScaleHandles();
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
    // B9: squish bars track handle positions — called after every drag/resize/undo.
    positionSquishBars();
    // h12: corner scale-handles track handle positions too.
    positionScaleHandles();
  }

  // ── Scale handles (h12) — proportional whole-board scale around centroid ─

  // Same corner mapping as ROTATE_CORNERS but offset further out (±50)
  // so the two handle types don't collide at the corners.
  const SCALE_CORNERS = [
    { key: "TL", rowFn: () => 0,                          colFn: () => 0,                          offX: -62, offY: -62 },
    { key: "TR", rowFn: () => 0,                          colFn: () => grid.srcXs.length - 1,      offX:  62, offY: -62 },
    { key: "BR", rowFn: () => grid.srcYs.length - 1,      colFn: () => grid.srcXs.length - 1,      offX:  62, offY:  62 },
    { key: "BL", rowFn: () => grid.srcYs.length - 1,      colFn: () => 0,                          offX: -62, offY:  62 },
  ];

  function rebuildScaleHandles() {
    for (const el of scaleHandleElements) {
      el.remove();
    }
    scaleHandleElements = [];
    for (const corner of SCALE_CORNERS) {
      const el = document.createElement("div");
      el.className = "projection-scale-handle";
      el.dataset.scaleCorner = corner.key;
      el.textContent = "⤢";
      el.title = "Drag to scale the whole board";
      const size = 22;
      // h14: cursor varies by corner so it visually matches the diagonal
      // the user is dragging along. TL/BR share the ↘↖ diagonal (nwse),
      // TR/BL share the ↗↙ diagonal (nesw). Stored in `data-cursor` so
      // the drag-end handler can restore it after the temporary "grabbing"
      // override during a drag.
      const cornerCursor = (corner.key === "TL" || corner.key === "BR") ? "nwse-resize" : "nesw-resize";
      el.dataset.cursor = cornerCursor;
      el.style.cssText = `
        position: fixed;
        width: ${size}px; height: ${size}px;
        border-radius: 4px;
        background: rgba(50, 211, 163, 0.92);
        border: 2px solid rgba(255, 255, 255, 0.95);
        color: #052016;
        font-size: 14px;
        font-weight: bold;
        line-height: ${size - 4}px;
        text-align: center;
        cursor: ${cornerCursor};
        z-index: 10000;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        transform: translate(-50%, -50%);
      `;
      // Pointerdown routes to drag handler (resolved lazily — drag module sets it after UI loads).
      el.addEventListener("pointerdown", (e) => {
        const fn = dragModule.onScaleHandlePointerDown;
        if (typeof fn === "function") fn(e);
      });
      document.body.appendChild(el);
      scaleHandleElements.push(el);
    }
  }

  function positionScaleHandles() {
    if (scaleHandleElements.length !== SCALE_CORNERS.length) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (let i = 0; i < SCALE_CORNERS.length; i++) {
      const c = SCALE_CORNERS[i];
      const row = c.rowFn();
      const col = c.colFn();
      const pt = getPoint(row, col);
      scaleHandleElements[i].style.left = `${pt.x * vw + c.offX}px`;
      scaleHandleElements[i].style.top = `${pt.y * vh + c.offY}px`;
    }
  }

  function removeScaleHandles() {
    for (const el of scaleHandleElements) {
      try { document.body.removeChild(el); } catch {}
    }
    scaleHandleElements = [];
  }

  // ── Phase 27 (B9): Squish bars — one per outer side ───────────────────────

  // SQUISH_SIDES constant — placed after ROTATE_CORNERS for reference symmetry.
  // Each entry describes one outer side:
  //   key        — identifies the bar (also stored in wrap.dataset.squishSide)
  //   barAxis    — "h" = bar is horizontal (top/bottom), "v" = vertical (left/right)
  //   cursor     — CSS cursor for the hit-target wrapper
  //   edgeAt()   — returns [{r,c},{r,c}] for the two outer corners on THIS edge
  //   anchorAt() — returns [{r,c},{r,c}] for the two outer corners on the OPPOSITE edge
  //   outwardDX/outwardDY — 30 px offset direction away from the grid (screen-space px)
  // D-13: opposite-side anchor; D-14: trapezoid edge-perpendicular axis.
  const SQUISH_SIDES = [
    { key: "TOP",    barAxis: "h", cursor: "ns-resize",
      edgeAt:   () => [{ r: 0,                          c: 0 },                          { r: 0,                          c: grid.srcXs.length - 1 }],
      anchorAt: () => [{ r: grid.srcYs.length - 1,      c: 0 },                          { r: grid.srcYs.length - 1,      c: grid.srcXs.length - 1 }],
      outwardDX: 0, outwardDY: -30 },
    { key: "BOTTOM", barAxis: "h", cursor: "ns-resize",
      edgeAt:   () => [{ r: grid.srcYs.length - 1,      c: 0 },                          { r: grid.srcYs.length - 1,      c: grid.srcXs.length - 1 }],
      anchorAt: () => [{ r: 0,                           c: 0 },                          { r: 0,                           c: grid.srcXs.length - 1 }],
      outwardDX: 0, outwardDY: 30 },
    { key: "LEFT",   barAxis: "v", cursor: "ew-resize",
      edgeAt:   () => [{ r: 0,                           c: 0 },                          { r: grid.srcYs.length - 1,      c: 0 }],
      anchorAt: () => [{ r: 0,                           c: grid.srcXs.length - 1 },      { r: grid.srcYs.length - 1,      c: grid.srcXs.length - 1 }],
      outwardDX: -30, outwardDY: 0 },
    { key: "RIGHT",  barAxis: "v", cursor: "ew-resize",
      edgeAt:   () => [{ r: 0,                           c: grid.srcXs.length - 1 },      { r: grid.srcYs.length - 1,      c: grid.srcXs.length - 1 }],
      anchorAt: () => [{ r: 0,                           c: 0 },                          { r: grid.srcYs.length - 1,      c: 0 }],
      outwardDX: 30, outwardDY: 0 },
  ];

  function rebuildSquishBars() {
    removeSquishBars();
    for (const side of SQUISH_SIDES) {
      const isH = side.barAxis === "h";
      const visualW = isH ? 60 : 10;
      const visualH = isH ? 10 : 60;
      const hitW    = isH ? 60 : 32;
      const hitH    = isH ? 32 : 60;

      // Outer wrapper: hit target (≥32 px on short axis — UI-SPEC Accessibility).
      const wrap = document.createElement("div");
      wrap.className = "projection-squish-bar";
      wrap.dataset.squishSide = side.key;
      wrap.style.cssText = `
        position: fixed;
        width: ${hitW}px;
        height: ${hitH}px;
        cursor: ${side.cursor};
        z-index: 10001;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
        transform: translate(-50%, -50%);
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
      `;

      // Inner visible bar.
      const bar = document.createElement("div");
      bar.style.cssText = `
        width: ${visualW}px;
        height: ${visualH}px;
        background: rgba(50,211,163,0.80);
        border: 1.5px solid rgba(255,255,255,0.85);
        border-radius: 5px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        transition: background 120ms ease, transform 120ms ease, border-color 120ms ease;
        position: relative;
        pointer-events: none;
      `;

      // Inner ridge — 2 px line centered across the SHORT axis, 80% of LONG axis.
      const ridge = document.createElement("div");
      ridge.style.cssText = isH
        ? "position:absolute;left:10%;top:50%;width:80%;height:2px;background:rgba(5,50,40,0.55);border-radius:1px;transform:translateY(-50%);pointer-events:none;"
        : "position:absolute;left:50%;top:10%;width:2px;height:80%;background:rgba(5,50,40,0.55);border-radius:1px;transform:translateX(-50%);pointer-events:none;";
      bar.appendChild(ridge);
      wrap.appendChild(bar);
      wrap._barInnerEl = bar;  // for hover/active styling

      // Hover styling on the wrapper.
      wrap.addEventListener("pointerenter", () => {
        const innerBar = wrap._barInnerEl;
        if (innerBar && !wrap.dataset.squishDragging) {
          innerBar.style.background = "rgba(50,211,163,1.0)";
          innerBar.style.borderColor = "rgba(255,255,255,1.0)";
          innerBar.style.transform = "scale(1.08)";
        }
      });
      wrap.addEventListener("pointerleave", () => {
        const innerBar = wrap._barInnerEl;
        if (innerBar && !wrap.dataset.squishDragging) {
          innerBar.style.background = "rgba(50,211,163,0.80)";
          innerBar.style.borderColor = "rgba(255,255,255,0.85)";
          innerBar.style.transform = "scale(1.0)";
        }
      });

      // Pointerdown routes to drag handler (resolved lazily — drag module sets it after UI loads).
      wrap.addEventListener("pointerdown", (e) => {
        const fn = dragModule.onSquishBarPointerDown;
        if (typeof fn === "function") fn(e);
      });

      document.body.appendChild(wrap);
      squishBarElements.push(wrap);
    }
    positionSquishBars();
  }

  function positionSquishBars() {
    if (squishBarElements.length !== SQUISH_SIDES.length) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (let i = 0; i < SQUISH_SIDES.length; i++) {
      const side = SQUISH_SIDES[i];
      const corners = side.edgeAt();
      const a = getPoint(corners[0].r, corners[0].c);
      const b = getPoint(corners[1].r, corners[1].c);
      // Midpoint of the (possibly trapezoid) outer edge in screen space.
      const midX = ((a.x + b.x) / 2) * vw;
      const midY = ((a.y + b.y) / 2) * vh;
      squishBarElements[i].style.left = `${midX + side.outwardDX}px`;
      squishBarElements[i].style.top  = `${midY + side.outwardDY}px`;
    }
  }

  function removeSquishBars() {
    for (const el of squishBarElements) {
      try { document.body.removeChild(el); } catch {}
    }
    squishBarElements = [];
  }

  // Called by drag handler to apply active-drag visual state on the inner bar.
  function setSquishBarDragVisual(sideKey, isDragging) {
    const el = squishBarElements.find((e) => e.dataset.squishSide === sideKey);
    if (!el || !el._barInnerEl) return;
    if (isDragging) {
      el.dataset.squishDragging = "1";
      el._barInnerEl.style.background = "rgba(30,163,120,0.95)";
      el._barInnerEl.style.transform = "scale(1.0)";
    } else {
      delete el.dataset.squishDragging;
      el._barInnerEl.style.background = "rgba(50,211,163,0.80)";
      el._barInnerEl.style.borderColor = "rgba(255,255,255,0.85)";
      el._barInnerEl.style.transform = "scale(1.0)";
    }
  }

  // ── Phase 27: Align-mode toolbar (B3 + B4) ────────────────────────────────

  function _getProfilePersistApi() {
    if (_profilePersistApi) return _profilePersistApi;
    _profilePersistApi = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE || null;
    return _profilePersistApi;
  }

  function rebuildAlignToolbar() {
    removeAlignToolbar();
    // UI-SPEC: pill is fixed top-center, z-index 9998, only on /output/ in align mode.
    // showHandles already gates outputRole === OUTPUT_ROLE_FINAL — this function trusts that gate.
    const root = document.createElement("div");
    root.className = "projection-align-toolbar";
    root.setAttribute("role", "status");
    root.setAttribute("aria-label", "Profile state and actions");
    root.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(14,22,34,0.92);
      border: 1px solid var(--c-border);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      z-index: 9998;
      font-family: 'Space Grotesk', sans-serif;
    `;

    // Chip pill: [● name] — also serves as the drag handle for h6.
    const chip = document.createElement("div");
    chip.className = "projection-align-chip";
    chip.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.2;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
    `;
    chip.title = "Drag to reposition";
    const dot = document.createElement("span");
    dot.textContent = "●";
    dot.style.cssText = "font-size:10px;color:var(--c-warn);display:none;";
    const nameEl = document.createElement("span");
    nameEl.style.cssText = "color:var(--c-text);";
    chip.appendChild(dot);
    chip.appendChild(nameEl);

    // Save profile button
    const saveBtn = document.createElement("button");
    saveBtn.className = "projection-align-action-btn projection-align-action-save";
    saveBtn.type = "button";
    saveBtn.textContent = "Save profile";
    saveBtn.style.cssText = `
      min-height: 28px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      line-height: 1.2;
      cursor: pointer;
      background: transparent;
      color: var(--c-text);
      border: 1px solid var(--c-border-str);
      transition: background 80ms ease, border-color 80ms ease, opacity 80ms ease;
    `;

    // h4: "New" button — prompts for a name and loads the default
    // geometry into the editor (replaces the older "Save as new…"
    // semantics, which preserved the current geometry).
    const saveAsBtn = document.createElement("button");
    saveAsBtn.className = "projection-align-action-btn projection-align-action-new";
    saveAsBtn.type = "button";
    saveAsBtn.textContent = "New";
    saveAsBtn.style.cssText = saveBtn.style.cssText;

    // h2: Load profile (the legacy right-click "Load profile..." menu was
    // removed in plan 27-03 but no replacement was added — leaving users
    // with no way to switch profiles. Mirror the Save / Save-as-new
    // pattern with a dedicated toolbar button that opens the profile
    // picker.)
    const loadBtn = document.createElement("button");
    loadBtn.className = "projection-align-action-btn projection-align-action-load";
    loadBtn.type = "button";
    loadBtn.textContent = "Load profile…";
    loadBtn.style.cssText = saveBtn.style.cssText;

    // Discard
    const discardBtn = document.createElement("button");
    discardBtn.className = "projection-align-action-btn projection-align-action-discard";
    discardBtn.type = "button";
    discardBtn.textContent = "Discard";
    discardBtn.style.cssText = `
      min-height: 28px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      line-height: 1.2;
      cursor: pointer;
      background: transparent;
      color: var(--c-danger);
      border: 1px solid rgba(255,91,91,0.35);
      transition: background 80ms ease, border-color 80ms ease, opacity 80ms ease;
    `;

    // Click bindings
    const api = _getProfilePersistApi();
    saveBtn.addEventListener("click", async (e) => { e.preventDefault(); if (api) await api.saveLoadedProfileFlow(); _refreshAlignToolbarVisual(); });
    saveAsBtn.addEventListener("click", async (e) => { e.preventDefault(); if (api) await api.createNewProfileFlow(); _refreshAlignToolbarVisual(); });
    loadBtn.addEventListener("click", async (e) => { e.preventDefault(); if (api) await api.profileLoadFlow(); _refreshAlignToolbarVisual(); });
    discardBtn.addEventListener("click", (e) => { e.preventDefault(); if (api) api.discardChanges(); _refreshAlignToolbarVisual(); });

    root.appendChild(chip);
    root.appendChild(saveBtn);
    root.appendChild(saveAsBtn);
    root.appendChild(loadBtn);
    root.appendChild(discardBtn);
    document.body.appendChild(root);

    alignToolbarRoot = root;
    alignChipNameEl = nameEl;
    alignChipDotEl = dot;
    alignSaveBtn = saveBtn;
    alignSaveAsBtn = saveAsBtn;
    alignDiscardBtn = discardBtn;

    // Subscribe to dirty changes from profile-persistence.
    if (api && typeof api.addDirtyListener === "function") {
      _alignDirtyListener = () => _refreshAlignToolbarVisual();
      api.addDirtyListener(_alignDirtyListener);
    }
    _refreshAlignToolbarVisual();

    // h6: apply persisted position (from localStorage or profile load)
    // and wire chip drag handlers.
    _applyAlignToolbarPosition();
    chip.addEventListener("pointerdown", _onToolbarChipPointerDown);
  }

  function _onToolbarChipPointerDown(e) {
    if (!alignToolbarRoot) return;
    if (e.button !== 0) return; // only primary button
    e.preventDefault();
    const rect = alignToolbarRoot.getBoundingClientRect();
    _toolbarDragState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
    };
    try { e.target.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (e.target instanceof HTMLElement) e.target.style.cursor = "grabbing";
    document.addEventListener("pointermove", _onToolbarChipPointerMove);
    document.addEventListener("pointerup", _onToolbarChipPointerUp);
    document.addEventListener("pointercancel", _onToolbarChipPointerUp);
  }

  function _onToolbarChipPointerMove(e) {
    if (!_toolbarDragState || !alignToolbarRoot) return;
    if (e.pointerId !== _toolbarDragState.pointerId) return;
    const dx = e.clientX - _toolbarDragState.startX;
    const dy = e.clientY - _toolbarDragState.startY;
    const nextX = Math.max(0, Math.min(window.innerWidth - 50, _toolbarDragState.originX + dx));
    const nextY = Math.max(0, Math.min(window.innerHeight - 30, _toolbarDragState.originY + dy));
    alignToolbarPosition = { x: nextX, y: nextY };
    alignToolbarRoot.style.left = `${nextX}px`;
    alignToolbarRoot.style.top = `${nextY}px`;
    alignToolbarRoot.style.transform = "none";
  }

  function _onToolbarChipPointerUp(e) {
    if (!_toolbarDragState) return;
    if (e.pointerId !== _toolbarDragState.pointerId) return;
    document.removeEventListener("pointermove", _onToolbarChipPointerMove);
    document.removeEventListener("pointerup", _onToolbarChipPointerUp);
    document.removeEventListener("pointercancel", _onToolbarChipPointerUp);
    _toolbarDragState = null;
    if (e.target instanceof HTMLElement) e.target.style.cursor = "grab";
    // Persist current position to localStorage so it survives reloads.
    try {
      if (alignToolbarPosition) {
        window.localStorage?.setItem(TOOLBAR_POS_LS_KEY, JSON.stringify(alignToolbarPosition));
      }
    } catch { /* ignore */ }
  }

  function _refreshAlignToolbarVisual() {
    if (!alignToolbarRoot) return;
    const api = _getProfilePersistApi();
    const name = api?.getLoadedProfileName?.() ?? null;
    const dirty = Boolean(api?.isCurrentlyDirty?.());
    // Chip name + color
    if (name) {
      alignChipNameEl.textContent = name;
    } else {
      alignChipNameEl.textContent = "Unsaved";
    }
    alignChipNameEl.style.color = dirty ? "var(--c-warn)" : (name ? "var(--c-text)" : "var(--c-text-2)");
    alignChipDotEl.style.display = dirty ? "inline" : "none";
    // Pill border on dirty
    alignToolbarRoot.style.borderColor = dirty ? "rgba(245,181,68,0.5)" : "var(--c-border)";

    // Save button: primary when dirty, ghost when clean
    if (dirty) {
      alignSaveBtn.style.background = "var(--c-accent)";
      alignSaveBtn.style.color = "var(--c-accent-fg)";
      alignSaveBtn.style.border = "1px solid transparent";
      alignSaveBtn.style.opacity = "1";
      alignSaveBtn.style.pointerEvents = "auto";
    } else {
      alignSaveBtn.style.background = "transparent";
      alignSaveBtn.style.color = "var(--c-text)";
      alignSaveBtn.style.border = "1px solid var(--c-border-str)";
      alignSaveBtn.style.opacity = "0.35";
      alignSaveBtn.style.pointerEvents = "none";
    }

    // Save as new: always visible; stays ghost
    alignSaveAsBtn.style.opacity = "1";
    alignSaveAsBtn.style.pointerEvents = "auto";

    // Discard: enabled only when dirty
    if (dirty) {
      alignDiscardBtn.style.opacity = "1";
      alignDiscardBtn.style.pointerEvents = "auto";
    } else {
      alignDiscardBtn.style.opacity = "0.35";
      alignDiscardBtn.style.pointerEvents = "none";
    }
  }

  function removeAlignToolbar() {
    const api = _getProfilePersistApi();
    if (api && typeof api.removeDirtyListener === "function" && _alignDirtyListener) {
      api.removeDirtyListener(_alignDirtyListener);
      _alignDirtyListener = null;
    }
    if (alignToolbarRoot) {
      try { document.body.removeChild(alignToolbarRoot); } catch {}
    }
    alignToolbarRoot = null;
    alignChipNameEl = null;
    alignChipDotEl = null;
    alignSaveBtn = null;
    alignSaveAsBtn = null;
    alignDiscardBtn = null;
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
      // B1 (D-01): outer + inner lines render identically (uniform teal stroke).
      lineCtx.strokeStyle = "rgba(0, 220, 180, 0.45)";
      lineCtx.lineWidth = 1;
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
      // B1 (D-01): outer + inner lines render identically.
      lineCtx.strokeStyle = "rgba(0, 220, 180, 0.45)";
      lineCtx.lineWidth = 1;
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
      // h5: ESC is now equivalent to clicking "Discard" — restore the
      // last-loaded profile geometry (or the new-profile default if no
      // profile is loaded). NOT a full reset (which would also clear
      // localStorage). Per D-04 there is no confirm modal.
      const api = _getProfilePersistApi();
      if (api && typeof api.discardChanges === "function") {
        api.discardChanges();
      } else {
        // Fallback if persistence module isn't ready yet.
        resetGrid();
      }
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

  // Phase 27 (B7 + B8 + D-10): hit-test priority for align-mode right-click.
  // Order: intersection (≤10 px) > line (≤6 px AND not within 10 px of an endpoint) > empty.
  // Distances are computed in SCREEN-SPACE pixels using actual displaced positions —
  // baseline srcXs/srcYs would be WRONG on a B2 trapezoid grid (Pitfall 1 in 27-RESEARCH.md).
  function _hitTestAlignContext(clientX, clientY) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;
    const INTERSECTION_PX = 10;
    const LINE_PX = 6;

    // 1) Intersection priority.
    let bestIxDist = Infinity;
    let bestIxRow = -1;
    let bestIxCol = -1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const pt = getPoint(r, c);
        const dx = pt.x * vw - clientX;
        const dy = pt.y * vh - clientY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestIxDist) {
          bestIxDist = d;
          bestIxRow = r;
          bestIxCol = c;
        }
      }
    }
    if (bestIxDist <= INTERSECTION_PX) {
      return { type: "intersection", row: bestIxRow, col: bestIxCol };
    }

    // 2) Line priority — for each row, walk segments between adjacent column points.
    //    A horizontal-line hit is a segment from (row, c) → (row, c+1).
    //    A vertical-line hit is a segment from (r, col) → (r+1, col).
    function _segDist(px, py, x1, y1, x2, y2) {
      // Perpendicular distance from (px,py) to segment (x1,y1)-(x2,y2) in pixels.
      const vx = x2 - x1, vy = y2 - y1;
      const wx = px - x1, wy = py - y1;
      const segLen2 = vx * vx + vy * vy;
      if (segLen2 < 1e-6) return Math.sqrt(wx * wx + wy * wy);
      let t = (wx * vx + wy * vy) / segLen2;
      t = Math.max(0, Math.min(1, t));
      const projX = x1 + t * vx;
      const projY = y1 + t * vy;
      const ddx = px - projX, ddy = py - projY;
      return Math.sqrt(ddx * ddx + ddy * ddy);
    }

    let bestLineDist = Infinity;
    let bestLineAxis = null;
    let bestLineIndex = -1;

    // Horizontal lines: row index, segments span cols 0..cols-1.
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const p1 = getPoint(row, col);
        const p2 = getPoint(row, col + 1);
        const d = _segDist(clientX, clientY, p1.x * vw, p1.y * vh, p2.x * vw, p2.y * vh);
        if (d < bestLineDist) {
          bestLineDist = d;
          bestLineAxis = "h";
          bestLineIndex = row;
        }
      }
    }
    // Vertical lines: col index, segments span rows 0..rows-1.
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows - 1; row++) {
        const p1 = getPoint(row, col);
        const p2 = getPoint(row + 1, col);
        const d = _segDist(clientX, clientY, p1.x * vw, p1.y * vh, p2.x * vw, p2.y * vh);
        if (d < bestLineDist) {
          bestLineDist = d;
          bestLineAxis = "v";
          bestLineIndex = col;
        }
      }
    }

    // Per UI-SPEC: line hit requires LINE_PX threshold AND cursor not within INTERSECTION_PX of any endpoint.
    // We already established (above) that the closest intersection is > INTERSECTION_PX away —
    // so the second clause is satisfied automatically by reaching this point.
    if (bestLineDist <= LINE_PX && bestLineAxis !== null) {
      return { type: "line", axis: bestLineAxis, lineIndex: bestLineIndex };
    }

    return { type: "empty" };
  }

  function onContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const normX = e.clientX / vw;
    const normY = e.clientY / vh;
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;
    const lastRow = rows - 1;
    const lastCol = cols - 1;

    const hit = _hitTestAlignContext(e.clientX, e.clientY);
    const items = [];

    if (hit.type === "intersection") {
      // Intersection: per locked D-10 + 27-UI-SPEC, show:
      //   - "Delete vertical line"   (hidden if outer)
      //   - "Delete horizontal line" (hidden if outer)
      //   - SINGLE "Add line through this point" item whose action adds BOTH a
      //     perpendicular horizontal AND a perpendicular vertical line at the
      //     click coordinate. This is the literal D-10/UI-SPEC contract and
      //     OVERRIDES the prior research-Q2 two-item recommendation.
      // Outer-line directions are HIDDEN (not greyed) per D-10.
      const colIsOuter = hit.col === 0 || hit.col === lastCol;
      const rowIsOuter = hit.row === 0 || hit.row === lastRow;

      // h8: only outer-line guards are kept; the lines>3 floor is removed
      // because interior lines must be deletable down to a 2-row/2-col outer
      // rectangle (the user wants the default mid-line in a 3×3 deletable).
      if (!colIsOuter && cols > 2) {
        items.push({
          label: "Delete vertical line",
          destructive: true,
          action: () => removeVerticalLine(hit.col),
        });
      }
      if (!rowIsOuter && rows > 2) {
        items.push({
          label: "Delete horizontal line",
          destructive: true,
          action: () => removeHorizontalLine(hit.row),
        });
      }
      // SINGLE "Add line through this point" — adds BOTH lines through the click coord (D-10).
      items.push({
        label: "Add line through this point",
        action: () => {
          addHorizontalLine(normY);
          addVerticalLine(normX);
        },
      });
    } else if (hit.type === "line") {
      // Line-only hit: D-10 menu = "Delete this line" + "Add line through this point".
      const isOuter = hit.lineIndex === 0
        || (hit.axis === "h" && hit.lineIndex === lastRow)
        || (hit.axis === "v" && hit.lineIndex === lastCol);
      // h8: same rule as the intersection branch — keep only the outer guard
      // and the 2-line floor; delete the >3 floor so the default mid-line is removable.
      if (!isOuter && (hit.axis === "h" ? rows > 2 : cols > 2)) {
        items.push({
          label: "Delete this line",
          destructive: true,
          action: () => {
            if (hit.axis === "h") removeHorizontalLine(hit.lineIndex);
            else removeVerticalLine(hit.lineIndex);
          },
        });
      }
      // "Add line through this point": for an h-line hit, insert a perpendicular (vertical) line
      // at click x; for a v-line hit, insert a perpendicular (horizontal) line at click y.
      items.push({
        label: "Add line through this point",
        action: () => {
          if (hit.axis === "h") addVerticalLine(normX);
          else addHorizontalLine(normY);
        },
      });
    } else {
      // Empty canvas: ONLY add options. NO delete options. (D-10)
      items.push({
        label: "Add horizontal line here",
        action: () => addHorizontalLine(normY),
      });
      items.push({
        label: "Add vertical line here",
        action: () => addVerticalLine(normX),
      });
    }

    // Defensive: outer-corner intersection always retains the single "Add line through this point",
    // so items is never empty in practice. Keep the guard regardless.
    if (items.length === 0) {
      return;
    }

    showContextMenu(e.clientX, e.clientY, items);
  }

  function showContextMenu(x, y, items) {
    dismissContextMenu();
    const menu = document.createElement("div");
    menu.className = "board-context-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Grid line options");
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    for (const item of items) {
      const btn = document.createElement("button");
      btn.className = "board-context-menu-item";
      if (item.destructive) {
        // UI-SPEC State Matrix: destructive items use color: var(--c-danger)
        btn.style.color = "var(--c-danger)";
      }
      btn.textContent = item.label;
      btn.setAttribute("role", "menuitem");
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
    const _ppApi = _getProfilePersistApi();
    if (_ppApi?.notifyDirtyChanged) _ppApi.notifyDirtyChanged();
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
    const _ppApi2 = _getProfilePersistApi();
    if (_ppApi2?.notifyDirtyChanged) _ppApi2.notifyDirtyChanged();
  }

  function removeHorizontalLine(index) {
    // h8: only outer rows are protected. Interior rows are removable
    // even on a 3×3 default grid (going to 2 rows = just outer rectangle
    // is a valid state — squish handles + corners still work).
    if (index === 0 || index === grid.srcYs.length - 1) return;
    if (grid.srcYs.length <= 2) return; // can't go below outer rectangle
    pushUndo();
    grid.srcYs.splice(index, 1);
    grid.points.splice(index, 1);
    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); }
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
    const _ppApi3 = _getProfilePersistApi();
    if (_ppApi3?.notifyDirtyChanged) _ppApi3.notifyDirtyChanged();
  }

  function removeVerticalLine(index) {
    // h8: same relaxation as removeHorizontalLine — only outer cols protected.
    if (index === 0 || index === grid.srcXs.length - 1) return;
    if (grid.srcXs.length <= 2) return;
    pushUndo();
    grid.srcXs.splice(index, 1);
    for (const row of grid.points) row.splice(index, 1);
    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); }
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
    const _ppApi4 = _getProfilePersistApi();
    if (_ppApi4?.notifyDirtyChanged) _ppApi4.notifyDirtyChanged();
  }

  // ── Show / Hide (unified — everything in one go) ───────────────────────────

  function showHandles() {
    if (handlesVisible) return;
    createHandles();
    // Bind keyboard globally so ESC works regardless of focus
    document.addEventListener("keydown", onKeyDown);
    activeHandleKey = "0-0";
    // Phase 27 (B3 + B4): align-mode toolbar (only on /output/ — showHandles already gates this).
    if (ctx && ctx.outputRole === ctx.OUTPUT_ROLE_FINAL) {
      rebuildAlignToolbar();
    }
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
    // Phase 27: saveLoadedProfileFlow replaces the legacy window.prompt-based profileSaveFlow.
    // Accept either name so the context-menu item keeps working during transition.
    if (typeof dependencies?.saveLoadedProfileFlow === "function") profileSaveFlow = dependencies.saveLoadedProfileFlow;
    else if (typeof dependencies?.profileSaveFlow === "function") profileSaveFlow = dependencies.profileSaveFlow;
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
      setSquishBarDragVisual,
      getSquishSidesConfig: () => SQUISH_SIDES,
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
    // Phase 27 (B9): squish-bar visual helpers — consumed by handle-drag.
    setSquishBarDragVisual,
    getSquishSidesConfig: () => SQUISH_SIDES,
    // Phase 27 (h6): toolbar-position bridge — consumed by profile-persistence.
    setAlignToolbarPosition,
    getAlignToolbarPosition,
  };
})();
