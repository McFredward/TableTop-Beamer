// Board context menu for direct room creation.
//
// Right-click (contextmenu) or long-press (>500ms) on empty area of
// #room-overlay shows a small popup with "Add room here". Clicking
// creates a hexagon at the pointer position. Dismissed on click-outside,
// Escape, or any other interaction.
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;
  let menuEl = null;
  let longPressTimer = null;
  let longPressPointerId = null;
  let longPressStartX = 0;
  let longPressStartY = 0;
  const LONG_PRESS_MS = 500;
  const LONG_PRESS_MOVE_THRESHOLD = 10; // pixels

  function init(dependencies) {
    ctx = dependencies;
    createMenuElement();
    bindOverlayEvents();
    bindDismissEvents();
  }

  function createMenuElement() {
    menuEl = document.createElement("div");
    menuEl.className = "board-context-menu";
    menuEl.setAttribute("role", "menu");
    menuEl.style.display = "none";
    // Rotation mode toggle. Menu now carries three
    // possible actions depending on where the right-click landed:
    //  - empty board area + not rotating → "Add room here"
    //  - on a room polygon + not rotating → "Rotate polygon"
    //  - on a room polygon + already rotating THIS room → "Exit rotation"
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "board-context-menu-item";
    addBtn.dataset.action = "add";
    addBtn.setAttribute("role", "menuitem");
    addBtn.textContent = "Add room here";
    addBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      handleAddRoomHere();
    });
    addBtn.addEventListener("pointerdown", (event) => event.stopPropagation());

    const rotateBtn = document.createElement("button");
    rotateBtn.type = "button";
    rotateBtn.className = "board-context-menu-item";
    rotateBtn.dataset.action = "rotate";
    rotateBtn.setAttribute("role", "menuitem");
    rotateBtn.textContent = "Rotate polygon";
    rotateBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      handleRotateOrExit();
    });
    rotateBtn.addEventListener("pointerdown", (event) => event.stopPropagation());

    menuEl.append(addBtn, rotateBtn);
    document.querySelector(".app-shell").append(menuEl);
  }

  function isContextMenuAllowed() {
    const state = ctx.state;
    // Only in Settings view with Board subtab active
    if (state.uiView !== "settings") return false;
    if (state.settingsSubtab !== "board") return false;
    // Not during any drag operation
    if (state.polygonEditor.dragVertexIndex !== null) return false;
    if (state.polygonEditor.dragAreaPointerId !== null) return false;
    if (state.shipPolygonEditor.dragVertexIndex !== null) return false;
    if (ctx.isPanArbitrating()) return false;
    return true;
  }

  function isEmptyAreaClick(event) {
    // Check that the event target is the SVG overlay itself or a
    // non-room child (not a .room-zone polygon)
    const target = event.target;
    if (target === ctx.roomOverlay) return true;
    if (target instanceof SVGElement && !target.closest(".room-zone")) return true;
    return false;
  }

  // Detect when a right-click lands directly on a room
  // polygon SVG. Returns the roomId or null.
  function resolveRoomIdAtEvent(event) {
    const target = event.target;
    if (!(target instanceof Element)) return null;
    const zone = target.closest?.(".room-zone");
    if (!zone) return null;
    const roomId = zone.getAttribute("data-room-id") ?? zone.dataset?.roomId ?? null;
    return roomId || null;
  }

  function applyMenuMode({ mode, roomId }) {
    if (!menuEl) return;
    const addBtn = menuEl.querySelector("[data-action=\"add\"]");
    const rotateBtn = menuEl.querySelector("[data-action=\"rotate\"]");
    const isRotatingThis = ctx.state.polygonEditor?.rotatingRoomId
      && ctx.state.polygonEditor.rotatingRoomId === roomId;
    if (mode === "empty") {
      if (addBtn) addBtn.hidden = false;
      if (rotateBtn) rotateBtn.hidden = true;
    } else if (mode === "polygon") {
      if (addBtn) addBtn.hidden = true;
      if (rotateBtn) {
        rotateBtn.hidden = false;
        rotateBtn.textContent = isRotatingThis ? "Exit rotation mode" : "Rotate polygon";
      }
    }
    menuEl._mode = mode;
    menuEl._roomId = roomId;
  }

  function handleRotateOrExit() {
    const state = ctx.state;
    const targetRoomId = menuEl?._roomId ?? null;
    hideMenu();
    if (!targetRoomId) return;
    if (state.polygonEditor.rotatingRoomId === targetRoomId) {
      if (typeof ctx.exitRotationMode === "function") ctx.exitRotationMode();
      return;
    }
    if (typeof ctx.enterRotationMode === "function") {
      ctx.enterRotationMode(targetRoomId);
    }
  }

  function showMenu(clientX, clientY, normalizedX, normalizedY) {
    if (!menuEl) return;
    menuEl._normalizedX = normalizedX;
    menuEl._normalizedY = normalizedY;
    menuEl.style.display = "grid";
    // Position relative to viewport, then clamp within window bounds
    const rect = menuEl.getBoundingClientRect();
    let left = clientX;
    let top = clientY;
    // Place the menu, then adjust if it goes off-screen
    menuEl.style.left = `${left}px`;
    menuEl.style.top = `${top}px`;
    // After positioning, check for overflow
    requestAnimationFrame(() => {
      const menuRect = menuEl.getBoundingClientRect();
      if (menuRect.right > window.innerWidth) {
        menuEl.style.left = `${window.innerWidth - menuRect.width - 8}px`;
      }
      if (menuRect.bottom > window.innerHeight) {
        menuEl.style.top = `${window.innerHeight - menuRect.height - 8}px`;
      }
    });
  }

  function hideMenu() {
    if (menuEl) {
      menuEl.style.display = "none";
    }
  }

  function isMenuVisible() {
    return menuEl && menuEl.style.display !== "none";
  }

  function handleAddRoomHere() {
    const normalizedX = menuEl._normalizedX;
    const normalizedY = menuEl._normalizedY;
    hideMenu();

    if (typeof normalizedX !== "number" || typeof normalizedY !== "number") return;

    const state = ctx.state;
    const board = ctx.getBoard();
    const id = ctx.createRoomId(board);
    const fallbackName = `Room ${board.rooms.length + 1}`;
    const polygon = ctx.createHexagonPolygon({ x: normalizedX, y: normalizedY, radius: 0.055 });

    const room = {
      id,
      name: fallbackName,
      label: fallbackName,
      polygon: polygon.map((point) => [...point]),
      points: polygon.map((point) => [...point]),
      radius: 0.055,
      x: normalizedX,
      y: normalizedY,
      meta: {
        schema: "tt-beamer.room.v2",
        spawnShape: "hexagon",
        templateSource: null,
      },
    };
    board.rooms.push(room);
    ctx.ensureBoardRoomStateMaps(state.boardId);
    ctx.clearRoomTombstone(state.boardId, id);
    ctx.setSpecialPolygonPoints(state.boardId, id, room.polygon);
    state.selectedRoomId = id;
    state.selectedRoomByBoard[state.boardId] = id;
    state.roomDraft.targetType = "room";
    state.roomDraft.targetId = id;
    state.polygonEditor.vertexSelectionActive = false;
    ctx.setActivePolygonRoomId(state.boardId, id);

    // Push undo state if undo system is available
    if (typeof ctx.pushUndoState === "function") {
      ctx.pushUndoState(`Create ${fallbackName}`);
    }

    const persisted = ctx.persistBoardProfiles();
    ctx.syncRoomPanelFromSelection();
    ctx.syncPolygonEditorPanel();
    ctx.renderRoomOverlay();
    ctx.triggerFeedback.textContent = persisted
      ? `Status: ${fallbackName} created at board position`
      : `Status: ${fallbackName} created at board position (persistence failed)`;
  }

  function bindOverlayEvents() {
    const overlay = ctx.roomOverlay;

    // Desktop right-click context menu
    overlay.addEventListener("contextmenu", (event) => {
      if (!isContextMenuAllowed()) return;
      const roomId = resolveRoomIdAtEvent(event);
      const onEmpty = isEmptyAreaClick(event);
      if (!roomId && !onEmpty) return;
      event.preventDefault();
      event.stopPropagation();
      const [nx, ny] = ctx.mapClientPointToNormalized(event.clientX, event.clientY);
      applyMenuMode({ mode: roomId ? "polygon" : "empty", roomId });
      showMenu(event.clientX, event.clientY, nx, ny);
    });

    // Mobile long-press detection via pointerdown + timer
    overlay.addEventListener("pointerdown", (event) => {
      // Only track primary pointer for long-press
      if (!event.isPrimary) return;
      // Only for touch or pen (not mouse right-click — that uses contextmenu)
      if (event.pointerType === "mouse") return;
      if (!isContextMenuAllowed()) return;
      const roomId = resolveRoomIdAtEvent(event);
      const onEmpty = isEmptyAreaClick(event);
      if (!roomId && !onEmpty) return;

      clearLongPressTimer();
      longPressPointerId = event.pointerId;
      longPressStartX = event.clientX;
      longPressStartY = event.clientY;
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        // Verify conditions still hold
        if (!isContextMenuAllowed()) return;
        const [nx, ny] = ctx.mapClientPointToNormalized(longPressStartX, longPressStartY);
        applyMenuMode({ mode: roomId ? "polygon" : "empty", roomId });
        showMenu(longPressStartX, longPressStartY, nx, ny);
        longPressPointerId = null;
      }, LONG_PRESS_MS);
    });

    overlay.addEventListener("pointermove", (event) => {
      if (longPressTimer === null || event.pointerId !== longPressPointerId) return;
      const dx = event.clientX - longPressStartX;
      const dy = event.clientY - longPressStartY;
      if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_THRESHOLD) {
        clearLongPressTimer();
      }
    });

    overlay.addEventListener("pointerup", () => {
      clearLongPressTimer();
    });

    overlay.addEventListener("pointercancel", () => {
      clearLongPressTimer();
    });
  }

  function clearLongPressTimer() {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    longPressPointerId = null;
  }

  function bindDismissEvents() {
    // Click-outside dismissal
    document.addEventListener("pointerdown", (event) => {
      if (!isMenuVisible()) return;
      if (menuEl.contains(event.target)) return;
      hideMenu();
    }, true);

    // Escape key dismissal
    document.addEventListener("keydown", (event) => {
      if (!isMenuVisible()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        hideMenu();
      }
    }, true);

    // Scroll dismissal
    window.addEventListener("scroll", () => {
      hideMenu();
    }, true);
  }

  window.TT_BEAMER_RUNTIME_POLYGON_CONTEXT_MENU = {
    init,
    hideMenu,
    isMenuVisible,
  };
})();
