// Phase 14-2: polygon editor panel sync module.
//
// Owns the DOM-facing sync helpers for the polygon editor panels:
// vertex/edge selects, status lines, room and play-area selectors,
// and the small visibility predicates that gate interaction.
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function areRoomVerticesEditable() {
    return ctx.state.polygonEditor.roomVerticesVisible !== false;
  }

  function arePlayAreaVerticesEditable() {
    return ctx.state.polygonEditor.playAreaVerticesVisible !== false;
  }

  function syncPolygonEditorStatus() {
    if (!ctx.polygonEditorStatus) return;
    const state = ctx.state;
    const selectedRoomId = ctx.syncSelectedRoomStateForBoard(state.boardId);
    if (!selectedRoomId) {
      ctx.polygonEditorStatus.textContent = "Polygon editor: no active room selected";
      return;
    }
    const roomId = selectedRoomId;
    const room = ctx.getBoard().rooms.find((entry) => entry.id === roomId);
    if (!room) {
      ctx.polygonEditorStatus.textContent = "Polygon editor: no rooms available on this board";
      return;
    }
    const points = ctx.getSpecialPolygonPoints(state.boardId, room.id);
    if (!areRoomVerticesEditable()) {
      ctx.polygonEditorStatus.textContent = `Polygon editor (${room.name ?? room.label}): vertices hidden (editing disabled)`;
      return;
    }
    const activeVertex = Math.max(0, Math.min(points.length - 1, state.polygonEditor.selectedVertexIndex));
    const activeEdge = Math.max(0, Math.min(points.length - 1, state.polygonEditor.selectedEdgeIndex));
    const handleSize = Math.round(ctx.getCurrentPolygonHandleScale() * 100);
    ctx.polygonEditorStatus.textContent = `Polygon editor (${room.name ?? room.label}): ${points.length} vertices | active vertex ${activeVertex + 1} | edge ${activeEdge + 1} | handle ${handleSize}%`;
  }

  function syncPolygonVertexSelect(roomId) {
    const state = ctx.state;
    ctx.polygonVertexSelect.replaceChildren();
    const roomVerticesVisible = state.polygonEditor.roomVerticesVisible !== false;
    const room = ctx.getBoard().rooms.find((entry) => entry.id === roomId);
    if (!room) {
      ctx.polygonVertexSelect.disabled = true;
      return;
    }
    const points = ctx.getSpecialPolygonPoints(state.boardId, room.id);
    for (let i = 0; i < points.length; i += 1) {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = `Vertex ${i + 1}`;
      ctx.polygonVertexSelect.append(option);
    }
    const maxIndex = Math.max(0, points.length - 1);
    state.polygonEditor.selectedVertexIndex = Math.min(state.polygonEditor.selectedVertexIndex, maxIndex);
    state.polygonEditor.selectedEdgeIndex = Math.min(state.polygonEditor.selectedEdgeIndex, maxIndex);
    ctx.polygonVertexSelect.value = String(state.polygonEditor.selectedVertexIndex);
    ctx.polygonVertexSelect.disabled = points.length === 0 || !roomVerticesVisible;
    ctx.polygonDeleteVertexButton.disabled = points.length <= 3 || !roomVerticesVisible;
  }

  function syncPolygonEdgeSelect(roomId) {
    const state = ctx.state;
    ctx.polygonEdgeSelect.replaceChildren();
    const roomVerticesVisible = state.polygonEditor.roomVerticesVisible !== false;
    const room = ctx.getBoard().rooms.find((entry) => entry.id === roomId);
    if (!room) {
      ctx.polygonEdgeSelect.disabled = true;
      return;
    }
    const points = ctx.getSpecialPolygonPoints(state.boardId, room.id);
    for (let i = 0; i < points.length; i += 1) {
      const option = document.createElement("option");
      const next = i === points.length - 1 ? 1 : i + 2;
      option.value = String(i);
      option.textContent = `Edge ${i + 1} (Vertex ${i + 1} -> ${next})`;
      ctx.polygonEdgeSelect.append(option);
    }
    const maxIndex = Math.max(0, points.length - 1);
    state.polygonEditor.selectedEdgeIndex = Math.min(state.polygonEditor.selectedEdgeIndex, maxIndex);
    ctx.polygonEdgeSelect.value = String(state.polygonEditor.selectedEdgeIndex);
    ctx.polygonEdgeSelect.disabled = points.length === 0 || !roomVerticesVisible;
  }

  function syncPolygonEditorPanel() {
    const state = ctx.state;
    const rooms = ctx.getSpecialRooms(state.boardId);
    const previous = ctx.polygonRoomSelect.value;
    const preferred = ctx.getActivePolygonRoomId(state.boardId);
    const activeRoomId = rooms.some((room) => room.id === preferred)
      ? preferred
      : rooms.some((room) => room.id === previous)
        ? previous
        : rooms[0]?.id;
    ctx.syncRoomSelect(ctx.polygonRoomSelect, rooms, activeRoomId);
    if (activeRoomId) {
      ctx.setActivePolygonRoomId(state.boardId, activeRoomId);
    }
    const disabled = rooms.length === 0;
    ctx.polygonInsertVertexButton.disabled = disabled;
    ctx.polygonResetRoomButton.disabled = disabled;
    ctx.polygonFocusRoomButton.disabled = disabled;
    if (ctx.roomRenameInput) {
      // Phase 21-1: defensive — early in boot or during a board switch,
      // ctx.getBoard() can return undefined before state.boardId is
      // wired. Guard so the rename input refresh doesn't throw and
      // abort the rest of syncPolygonEditorPanel.
      const boardForRename = ctx.getBoard();
      const activeRoom = Array.isArray(boardForRename?.rooms)
        ? boardForRename.rooms.find((entry) => entry.id === activeRoomId)
        : null;
      ctx.roomRenameInput.value = activeRoom?.name ?? activeRoom?.label ?? "";
      ctx.roomRenameInput.disabled = disabled;
    }
    const roomVerticesVisible = state.polygonEditor.roomVerticesVisible !== false;
    if (ctx.showRoomVerticesInput) {
      ctx.showRoomVerticesInput.checked = roomVerticesVisible;
    }
    ctx.polygonVertexSelect.disabled = disabled || !roomVerticesVisible;
    ctx.polygonEdgeSelect.disabled = disabled || !roomVerticesVisible;
    ctx.polygonInsertVertexButton.disabled = disabled || !roomVerticesVisible;
    ctx.polygonDeleteVertexButton.disabled = disabled || !roomVerticesVisible;
    syncPolygonVertexSelect(activeRoomId);
    syncPolygonEdgeSelect(activeRoomId);
    syncPolygonEditorStatus();
  }

  function syncShipPolygonEditorStatus() {
    if (!ctx.shipPolygonEditorStatus) return;
    const state = ctx.state;
    const points = ctx.getShipPolygonPoints(state.boardId);
    const selectedArea = ctx.getSelectedPlayArea(state.boardId);
    if (!arePlayAreaVerticesEditable()) {
      ctx.shipPolygonEditorStatus.textContent = "Play Area editor: vertices hidden (editing disabled)";
      return;
    }
    const activeVertex = Math.max(0, Math.min(points.length - 1, state.shipPolygonEditor.selectedVertexIndex));
    const activeEdge = Math.max(0, Math.min(points.length - 1, state.shipPolygonEditor.selectedEdgeIndex));
    const handleSize = Math.round(ctx.getCurrentPolygonHandleScale() * 100);
    ctx.shipPolygonEditorStatus.textContent =
      `Play Area editor (${selectedArea?.name ?? "n/a"}): ${points.length} vertices | active vertex ${activeVertex + 1} | edge ${activeEdge + 1} | handle ${handleSize}%`;
  }

  function syncShipPolygonVertexSelect() {
    const state = ctx.state;
    ctx.shipPolygonVertexSelect.replaceChildren();
    const playAreaVerticesVisible = state.polygonEditor.playAreaVerticesVisible !== false;
    const points = ctx.getShipPolygonPoints(state.boardId);
    for (let i = 0; i < points.length; i += 1) {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = `Vertex ${i + 1}`;
      ctx.shipPolygonVertexSelect.append(option);
    }
    const maxIndex = Math.max(0, points.length - 1);
    state.shipPolygonEditor.selectedVertexIndex = Math.min(state.shipPolygonEditor.selectedVertexIndex, maxIndex);
    state.shipPolygonEditor.selectedEdgeIndex = Math.min(state.shipPolygonEditor.selectedEdgeIndex, maxIndex);
    ctx.shipPolygonVertexSelect.value = String(state.shipPolygonEditor.selectedVertexIndex);
    ctx.shipPolygonDeleteVertexButton.disabled = points.length <= 3 || !playAreaVerticesVisible;
    ctx.shipPolygonVertexSelect.disabled = !playAreaVerticesVisible;
  }

  function syncShipPolygonEdgeSelect() {
    const state = ctx.state;
    ctx.shipPolygonEdgeSelect.replaceChildren();
    const playAreaVerticesVisible = state.polygonEditor.playAreaVerticesVisible !== false;
    const points = ctx.getShipPolygonPoints(state.boardId);
    for (let i = 0; i < points.length; i += 1) {
      const option = document.createElement("option");
      const next = i === points.length - 1 ? 1 : i + 2;
      option.value = String(i);
      option.textContent = `Edge ${i + 1} (Vertex ${i + 1} -> ${next})`;
      ctx.shipPolygonEdgeSelect.append(option);
    }
    const maxIndex = Math.max(0, points.length - 1);
    state.shipPolygonEditor.selectedEdgeIndex = Math.min(state.shipPolygonEditor.selectedEdgeIndex, maxIndex);
    ctx.shipPolygonEdgeSelect.value = String(state.shipPolygonEditor.selectedEdgeIndex);
    ctx.shipPolygonEdgeSelect.disabled = !playAreaVerticesVisible;
  }

  function syncShipPolygonEditorPanel() {
    const state = ctx.state;
    const playAreas = ctx.getPlayAreas(state.boardId);
    const selectedPlayAreaId = ctx.getSelectedPlayAreaId(state.boardId);
    if (ctx.playAreaSelect) {
      ctx.playAreaSelect.replaceChildren();
      for (const area of playAreas) {
        const option = document.createElement("option");
        option.value = area.id;
        option.textContent = area.name;
        ctx.playAreaSelect.append(option);
      }
      ctx.playAreaSelect.value = selectedPlayAreaId;
      ctx.playAreaSelect.disabled = playAreas.length === 0;
    }
    if (ctx.playAreaNameInput) {
      const selectedArea = ctx.getSelectedPlayArea(state.boardId);
      ctx.playAreaNameInput.value = selectedArea?.name ?? "";
      ctx.playAreaNameInput.disabled = playAreas.length === 0;
    }
    if (ctx.playAreaDeleteButton) {
      ctx.playAreaDeleteButton.disabled = playAreas.length <= 1;
    }
    if (ctx.playAreaCreateButton) {
      ctx.playAreaCreateButton.disabled = false;
    }
    const playAreaVerticesVisible = state.polygonEditor.playAreaVerticesVisible !== false;
    if (ctx.showPlayAreaVerticesInput) {
      ctx.showPlayAreaVerticesInput.checked = playAreaVerticesVisible;
    }
    ctx.shipPolygonVertexSelect.disabled = !playAreaVerticesVisible;
    ctx.shipPolygonEdgeSelect.disabled = !playAreaVerticesVisible;
    ctx.shipPolygonInsertVertexButton.disabled = !playAreaVerticesVisible;
    ctx.shipPolygonDeleteVertexButton.disabled = !playAreaVerticesVisible;
    syncShipPolygonVertexSelect();
    syncShipPolygonEdgeSelect();
    syncShipPolygonEditorStatus();
  }

  window.TT_BEAMER_RUNTIME_POLYGON_EDITOR_PANELS = {
    init,
    areRoomVerticesEditable,
    arePlayAreaVerticesEditable,
    syncPolygonEditorStatus,
    syncPolygonVertexSelect,
    syncPolygonEdgeSelect,
    syncPolygonEditorPanel,
    syncShipPolygonEditorStatus,
    syncShipPolygonVertexSelect,
    syncShipPolygonEdgeSelect,
    syncShipPolygonEditorPanel,
  };
})();
