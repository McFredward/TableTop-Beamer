// Phase 14-2: polygon editor + play area event binders.
//
// Wires the polygon handle size slider, board zoom buttons, polygon
// room/vertex/edge selects, visibility toggles, vertex insert/delete/reset/
// focus buttons, play area CRUD, and ship polygon vertex/edge/insert/
// delete/reset controls. Exposed as wirePolygonEditorBinders(ctx).
(() => {
  function wirePolygonEditorBinders(ctx) {
    const {
      state,
      polygonHandleSizeInput,
      boardZoomFitButton,
      boardZoomResetButton,
      polygonRoomSelect,
      showRoomVerticesInput,
      showPlayAreaVerticesInput,
      polygonVertexSelect,
      polygonEdgeSelect,
      polygonInsertVertexButton,
      polygonDeleteVertexButton,
      polygonResetRoomButton,
      polygonFocusRoomButton,
      playAreaSelect,
      playAreaNameInput,
      playAreaCreateButton,
      playAreaDeleteButton,
      shipPolygonVertexSelect,
      shipPolygonEdgeSelect,
      shipPolygonInsertVertexButton,
      shipPolygonDeleteVertexButton,
      shipPolygonResetButton,
      SHIP_POLYGON_DEFAULT,
      BOARD_ZOOM_DEFAULT,
      triggerFeedback,
      clampPolygonHandleScale,
      normalizePolygonPoint,
      normalizeShipPolygon,
      normalizePlayAreaId,
      syncPolygonHandleSizePanel,
      syncPolygonEditorStatus,
      syncShipPolygonEditorStatus,
      syncPolygonEditorPanel,
      syncShipPolygonEditorPanel,
      syncRoomPanelFromSelection,
      syncPolygonEdgeSelect,
      renderRoomOverlay,
      endPanMode,
      fitZoomToActiveSpecialRoom,
      setPanCursorState,
      updateCurrentBoardZoom,
      getBoardZoom,
      getRoomCenterForZoom,
      computePanForZoomFocus,
      syncPolygonRoomSelection,
      areRoomVerticesEditable,
      arePlayAreaVerticesEditable,
      finishPolygonVertexDrag,
      finishPolygonAreaDrag,
      finishShipPolygonVertexDrag,
      getActivePolygonRoomId,
      isPanArbitrating,
      resolvePolygonEditingRoomId,
      getSpecialPolygonPoints,
      setSpecialPolygonPoints,
      getShipPolygonPoints,
      setShipPolygonPoints,
      persistBoardProfiles,
      getDefaultRoomPolygon,
      setSelectedPlayAreaId,
      getPlayAreas,
      getSelectedPlayAreaId,
      getSelectedPlayArea,
      setPlayAreas,
      deleteSelectedPolygonVertex,
    } = ctx;

    polygonHandleSizeInput?.addEventListener("input", () => {
      const handleScale = clampPolygonHandleScale((Number(polygonHandleSizeInput.value) || 100) / 100);
      state.polygonEditor.handleScale = handleScale;
      syncPolygonHandleSizePanel();
      syncPolygonEditorStatus();
      syncShipPolygonEditorStatus();
      renderRoomOverlay();
      triggerFeedback.textContent = `Status: Polygon handle size (including Play Area) set to ${Math.round(handleScale * 100)}%`;
    });

    boardZoomFitButton.addEventListener("click", () => {
      endPanMode(null, { canceled: true });
      fitZoomToActiveSpecialRoom();
      setPanCursorState();
    });

    boardZoomResetButton.addEventListener("click", () => {
      updateCurrentBoardZoom(BOARD_ZOOM_DEFAULT, "Board zoom reset");
      endPanMode(null, { canceled: true });
      setPanCursorState();
    });

    polygonRoomSelect.addEventListener("change", () => {
      const roomId = polygonRoomSelect.value;
      syncPolygonRoomSelection(roomId);
      const zoom = getBoardZoom(state.boardId);
      const center = getRoomCenterForZoom(state.boardId, roomId);
      updateCurrentBoardZoom(computePanForZoomFocus(zoom.scale, center));
      syncRoomPanelFromSelection();
      syncPolygonEditorPanel();
      renderRoomOverlay();
      setPanCursorState();
    });

    showRoomVerticesInput?.addEventListener("change", () => {
      state.polygonEditor.roomVerticesVisible = showRoomVerticesInput.checked;
      if (!showRoomVerticesInput.checked) {
        if (state.polygonEditor.dragVertexIndex !== null) {
          finishPolygonVertexDrag(null, { cancel: true });
        }
        if (state.polygonEditor.dragAreaPointerId !== null) {
          finishPolygonAreaDrag(null, { cancel: true });
        }
      }
      syncPolygonEditorPanel();
      renderRoomOverlay();
      triggerFeedback.textContent = `Status: Room vertices ${showRoomVerticesInput.checked ? "shown" : "hidden"}`;
    });

    showPlayAreaVerticesInput?.addEventListener("change", () => {
      state.polygonEditor.playAreaVerticesVisible = showPlayAreaVerticesInput.checked;
      if (!showPlayAreaVerticesInput.checked && state.shipPolygonEditor.dragVertexIndex !== null) {
        finishShipPolygonVertexDrag(null, { cancel: true });
      }
      syncShipPolygonEditorPanel();
      renderRoomOverlay();
      triggerFeedback.textContent = `Status: Play Area vertices ${showPlayAreaVerticesInput.checked ? "shown" : "hidden"}`;
    });

    polygonVertexSelect.addEventListener("change", () => {
      if (!areRoomVerticesEditable()) {
        return;
      }
      state.polygonEditor.selectedVertexIndex = Math.max(0, Number(polygonVertexSelect.value) || 0);
      state.polygonEditor.selectedEdgeIndex = state.polygonEditor.selectedVertexIndex;
      state.polygonEditor.vertexSelectionActive = true;
      syncPolygonEdgeSelect(getActivePolygonRoomId(state.boardId));
      renderRoomOverlay();
      syncPolygonEditorStatus();
    });

    polygonEdgeSelect.addEventListener("change", () => {
      if (!areRoomVerticesEditable()) {
        return;
      }
      state.polygonEditor.selectedEdgeIndex = Math.max(0, Number(polygonEdgeSelect.value) || 0);
      renderRoomOverlay();
      syncPolygonEditorStatus();
    });

    polygonInsertVertexButton.addEventListener("click", () => {
      if (isPanArbitrating()) {
        triggerFeedback.textContent = "Status: Pan active - polygon edit paused";
        return;
      }
      if (!areRoomVerticesEditable()) {
        triggerFeedback.textContent = "Status: Room vertices hidden - polygon edit paused";
        return;
      }
      const roomId = resolvePolygonEditingRoomId(state.boardId);
      if (!roomId) {
        triggerFeedback.textContent = "Status: No active room selected for polygon insert";
        return;
      }
      const points = getSpecialPolygonPoints(state.boardId, roomId);
      const index = Math.max(0, Math.min(points.length - 1, state.polygonEditor.selectedEdgeIndex));
      const nextIndex = (index + 1) % points.length;
      const a = points[index];
      const b = points[nextIndex];
      const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      points.splice(nextIndex, 0, normalizePolygonPoint(midpoint));
      setSpecialPolygonPoints(state.boardId, roomId, points);
      const persisted = persistBoardProfiles();
      state.polygonEditor.selectedEdgeIndex = index;
      state.polygonEditor.selectedVertexIndex = nextIndex;
      syncPolygonEditorPanel();
      renderRoomOverlay();
      triggerFeedback.textContent = persisted
        ? "Status: Polygon vertex inserted"
        : "Status: Polygon vertex inserted (persistence failed)";
    });

    polygonDeleteVertexButton.addEventListener("click", () => {
      deleteSelectedPolygonVertex();
    });

    polygonResetRoomButton.addEventListener("click", () => {
      if (isPanArbitrating()) {
        triggerFeedback.textContent = "Status: Pan active - polygon edit paused";
        return;
      }
      if (!areRoomVerticesEditable()) {
        triggerFeedback.textContent = "Status: Room vertices hidden - polygon edit paused";
        return;
      }
      const roomId = getActivePolygonRoomId(state.boardId);
      if (!roomId) {
        return;
      }
      const fallbackPolygon = getDefaultRoomPolygon(state.boardId, roomId);
      if (!fallbackPolygon) {
        triggerFeedback.textContent = "Status: No board default available for this room";
        return;
      }
      setSpecialPolygonPoints(state.boardId, roomId, fallbackPolygon);
      const persisted = persistBoardProfiles();
      state.polygonEditor.selectedVertexIndex = 0;
      syncPolygonEditorPanel();
      renderRoomOverlay();
      triggerFeedback.textContent = persisted
        ? "Status: Room polygon reset to default"
        : "Status: Room polygon reset to default (persistence failed)";
    });

    polygonFocusRoomButton.addEventListener("click", () => {
      if (isPanArbitrating()) {
        triggerFeedback.textContent = "Status: Pan active - polygon edit paused";
        return;
      }
      const roomId = getActivePolygonRoomId(state.boardId);
      if (!roomId) {
        return;
      }
      state.selectedRoomId = roomId;
      state.selectedRoomByBoard[state.boardId] = roomId;
      syncRoomPanelFromSelection();
      renderRoomOverlay();
      triggerFeedback.textContent = "Status: Special room focused in overlay";
    });

    playAreaSelect?.addEventListener("change", () => {
      setSelectedPlayAreaId(state.boardId, playAreaSelect.value);
      state.shipPolygonEditor.selectedVertexIndex = 0;
      state.shipPolygonEditor.selectedEdgeIndex = 0;
      state.shipPolygonsByBoard[state.boardId] = getShipPolygonPoints(state.boardId);
      persistBoardProfiles();
      syncShipPolygonEditorPanel();
      renderRoomOverlay();
      triggerFeedback.textContent = "Status: Active Play Area selected";
    });

    playAreaNameInput?.addEventListener("change", () => {
      const areas = getPlayAreas(state.boardId);
      const selectedId = getSelectedPlayAreaId(state.boardId);
      const nextName = String(playAreaNameInput.value || "").trim();
      const updated = areas.map((area) => (
        area.id === selectedId
          ? {
            ...area,
            name: nextName || area.name,
          }
          : area
      ));
      setPlayAreas(state.boardId, updated, { selectedPlayAreaId: selectedId });
      const persisted = persistBoardProfiles();
      syncShipPolygonEditorPanel();
      renderRoomOverlay();
      triggerFeedback.textContent = persisted
        ? "Status: Play Area name updated"
        : "Status: Play Area name updated (persistence failed)";
    });

    playAreaCreateButton?.addEventListener("click", () => {
      const currentAreas = getPlayAreas(state.boardId);
      const nextIndex = currentAreas.length + 1;
      const baseId = normalizePlayAreaId(`play-area-${nextIndex}`, nextIndex - 1);
      const idCandidates = new Set(currentAreas.map((entry) => entry.id));
      let nextId = baseId;
      let suffix = 2;
      while (idCandidates.has(nextId)) {
        nextId = `${baseId}-${suffix}`;
        suffix += 1;
      }
      const template = getSelectedPlayArea(state.boardId)?.polygon ?? SHIP_POLYGON_DEFAULT;
      const nextArea = {
        id: nextId,
        name: `Play Area ${nextIndex}`,
        polygon: normalizeShipPolygon(template),
      };
      setPlayAreas(state.boardId, [...currentAreas, nextArea], { selectedPlayAreaId: nextId });
      state.shipPolygonEditor.selectedVertexIndex = 0;
      state.shipPolygonEditor.selectedEdgeIndex = 0;
      const persisted = persistBoardProfiles();
      syncShipPolygonEditorPanel();
      renderRoomOverlay();
      triggerFeedback.textContent = persisted
        ? `Status: Created ${nextArea.name}`
        : `Status: Created ${nextArea.name} (persistence failed)`;
    });

    playAreaDeleteButton?.addEventListener("click", () => {
      const currentAreas = getPlayAreas(state.boardId);
      if (currentAreas.length <= 1) {
        triggerFeedback.textContent = "Status: At least one Play Area is required";
        return;
      }
      const selectedArea = getSelectedPlayArea(state.boardId);
      if (!selectedArea) {
        return;
      }
      const confirmed = window.confirm(`Delete ${selectedArea.name}? This removes its polygon.`);
      if (!confirmed) {
        return;
      }
      const remaining = currentAreas.filter((area) => area.id !== selectedArea.id);
      const fallbackSelectedId = remaining[0]?.id ?? "play-area-1";
      setPlayAreas(state.boardId, remaining, { selectedPlayAreaId: fallbackSelectedId });
      state.shipPolygonEditor.selectedVertexIndex = 0;
      state.shipPolygonEditor.selectedEdgeIndex = 0;
      const persisted = persistBoardProfiles();
      syncShipPolygonEditorPanel();
      renderRoomOverlay();
      triggerFeedback.textContent = persisted
        ? `Status: Deleted ${selectedArea.name}`
        : `Status: Deleted ${selectedArea.name} (persistence failed)`;
    });

    shipPolygonVertexSelect.addEventListener("change", () => {
      if (!arePlayAreaVerticesEditable()) {
        return;
      }
      state.shipPolygonEditor.selectedVertexIndex = Math.max(0, Number(shipPolygonVertexSelect.value) || 0);
      state.shipPolygonEditor.selectedEdgeIndex = state.shipPolygonEditor.selectedVertexIndex;
      ctx.syncShipPolygonEdgeSelect();
      renderRoomOverlay();
      syncShipPolygonEditorStatus();
    });

    shipPolygonEdgeSelect.addEventListener("change", () => {
      if (!arePlayAreaVerticesEditable()) {
        return;
      }
      state.shipPolygonEditor.selectedEdgeIndex = Math.max(0, Number(shipPolygonEdgeSelect.value) || 0);
      renderRoomOverlay();
      syncShipPolygonEditorStatus();
    });

    shipPolygonInsertVertexButton.addEventListener("click", () => {
      if (isPanArbitrating()) {
        triggerFeedback.textContent = "Status: Pan active - Play Area edit paused";
        return;
      }
      if (!arePlayAreaVerticesEditable()) {
        triggerFeedback.textContent = "Status: Play Area vertices hidden - polygon edit paused";
        return;
      }
      const points = getShipPolygonPoints(state.boardId);
      const index = Math.max(0, Math.min(points.length - 1, state.shipPolygonEditor.selectedEdgeIndex));
      const nextIndex = (index + 1) % points.length;
      const a = points[index];
      const b = points[nextIndex];
      const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      points.splice(nextIndex, 0, normalizePolygonPoint(midpoint));
      setShipPolygonPoints(state.boardId, points);
      const persisted = persistBoardProfiles();
      state.shipPolygonEditor.selectedEdgeIndex = index;
      state.shipPolygonEditor.selectedVertexIndex = nextIndex;
      syncShipPolygonEditorPanel();
      renderRoomOverlay();
      triggerFeedback.textContent = persisted
        ? "Status: Play Area vertex inserted"
        : "Status: Play Area vertex inserted (persistence failed)";
    });

    shipPolygonDeleteVertexButton.addEventListener("click", () => {
      if (isPanArbitrating()) {
        triggerFeedback.textContent = "Status: Pan active - Play Area edit paused";
        return;
      }
      if (!arePlayAreaVerticesEditable()) {
        triggerFeedback.textContent = "Status: Play Area vertices hidden - polygon edit paused";
        return;
      }
      const points = getShipPolygonPoints(state.boardId);
      if (points.length <= 3) {
        triggerFeedback.textContent = "Status: Play Area requires at least 3 vertices";
        return;
      }
      const index = Math.max(0, Math.min(points.length - 1, state.shipPolygonEditor.selectedVertexIndex));
      points.splice(index, 1);
      setShipPolygonPoints(state.boardId, points);
      const persisted = persistBoardProfiles();
      state.shipPolygonEditor.selectedVertexIndex = Math.max(0, Math.min(index, points.length - 1));
      state.shipPolygonEditor.selectedEdgeIndex = state.shipPolygonEditor.selectedVertexIndex;
      syncShipPolygonEditorPanel();
      renderRoomOverlay();
      triggerFeedback.textContent = persisted
        ? "Status: Play Area vertex deleted"
        : "Status: Play Area vertex deleted (persistence failed)";
    });

    shipPolygonResetButton.addEventListener("click", () => {
      if (isPanArbitrating()) {
        triggerFeedback.textContent = "Status: Pan active - Play Area edit paused";
        return;
      }
      if (!arePlayAreaVerticesEditable()) {
        triggerFeedback.textContent = "Status: Play Area vertices hidden - polygon edit paused";
        return;
      }
      setShipPolygonPoints(state.boardId, SHIP_POLYGON_DEFAULT);
      const persisted = persistBoardProfiles();
      state.shipPolygonEditor.selectedVertexIndex = 0;
      state.shipPolygonEditor.selectedEdgeIndex = 0;
      syncShipPolygonEditorPanel();
      renderRoomOverlay();
      triggerFeedback.textContent = persisted
        ? "Status: Play Area polygon reset to default"
        : "Status: Play Area polygon reset to default (persistence failed)";
    });
  }

  window.TT_BEAMER_RUNTIME_WIRE_POLYGON_EDITOR_BINDERS = {
    wirePolygonEditorBinders,
  };
})();
