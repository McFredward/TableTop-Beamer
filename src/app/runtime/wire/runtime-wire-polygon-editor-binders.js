// polygon editor + play area event binders.
//
// Wires the polygon handle size slider, board zoom buttons, polygon
// room/vertex/edge selects, visibility toggles, vertex insert/delete/reset/
// focus buttons, play area CRUD, and ship polygon vertex/edge/insert/
// delete/reset controls. Exposed as wirePolygonEditorBinders(ctx).
//
// Phase 24 W3.6-C5b: the original 447-line `wirePolygonEditorBinders`
// function body has been decomposed into 17 named topical helpers per
// listener boundary. Each helper takes `ctx` and re-destructures only
// the vars it needs; the body of each `addEventListener` callback is
// byte-identical with the pre-W3.6 IIFE. The outer
// `wirePolygonEditorBinders` shell drops to a 19-line dispatch
// sequence.
(() => {
  function _wirePolygonHandleSize(ctx) {
    const {
      state,
      polygonHandleSizeInput,
      triggerFeedback,
      clampPolygonHandleScale,
      syncPolygonHandleSizePanel,
      syncPolygonEditorStatus,
      syncShipPolygonEditorStatus,
      renderRoomOverlay,
    } = ctx;

    polygonHandleSizeInput?.addEventListener("input", () => {
      const handleScale = clampPolygonHandleScale((Number(polygonHandleSizeInput.value) || 100) / 100);
      state.polygonEditor.handleScale = handleScale;
      syncPolygonHandleSizePanel();
      syncPolygonEditorStatus();
      syncShipPolygonEditorStatus();
      renderRoomOverlay();
      triggerFeedback.textContent = `Status: Polygon handle size (including Play Area) set to ${Math.round(handleScale * 100)}%`;
      window.TT_BEAMER_LOCAL_UI_PREFS?.persistLocalUiPrefs?.(state);
    });
  }

  function _wireBoardZoomFit(ctx) {
    const { boardZoomFitButton, endPanMode, fitZoomToActiveSpecialRoom, setPanCursorState } = ctx;

    boardZoomFitButton.addEventListener("click", () => {
      endPanMode(null, { canceled: true });
      fitZoomToActiveSpecialRoom();
      setPanCursorState();
    });
  }

  function _wireBoardZoomReset(ctx) {
    const { boardZoomResetButton, BOARD_ZOOM_DEFAULT, updateCurrentBoardZoom, endPanMode, setPanCursorState } = ctx;

    boardZoomResetButton.addEventListener("click", () => {
      updateCurrentBoardZoom(BOARD_ZOOM_DEFAULT, "Board zoom reset");
      endPanMode(null, { canceled: true });
      setPanCursorState();
    });
  }

  function _wirePolygonRoomSelectChange(ctx) {
    const {
      state,
      polygonRoomSelect,
      syncPolygonRoomSelection,
      getBoardZoom,
      getRoomCenterForZoom,
      updateCurrentBoardZoom,
      computePanForZoomFocus,
      syncRoomPanelFromSelection,
      syncPolygonEditorPanel,
      renderRoomOverlay,
      setPanCursorState,
    } = ctx;

    polygonRoomSelect.addEventListener("change", () => {
      const roomId = polygonRoomSelect.value;
      syncPolygonRoomSelection(roomId);
      // Mirror the ship-select fix — picking a room in
      // the dropdown moves editing intent to that room, so DELETE
      // should target room vertices regardless of which polygon the
      // user previously had focus on.
      state.lastPolygonFocus = "room";
      const zoom = getBoardZoom(state.boardId);
      const center = getRoomCenterForZoom(state.boardId, roomId);
      updateCurrentBoardZoom(computePanForZoomFocus(zoom.scale, center));
      syncRoomPanelFromSelection();
      syncPolygonEditorPanel();
      renderRoomOverlay();
      setPanCursorState();
      // Blur the select so DELETE / Ctrl+Z aren't
      // swallowed by isTypingShortcutTarget while focus still sits
      // on this dropdown.
      try { polygonRoomSelect.blur(); } catch {}
    });
  }

  function _wireShowRoomVerticesToggle(ctx) {
    const {
      state,
      showRoomVerticesInput,
      triggerFeedback,
      finishPolygonVertexDrag,
      finishPolygonAreaDrag,
      syncPolygonEditorPanel,
      renderRoomOverlay,
    } = ctx;

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
      window.TT_BEAMER_LOCAL_UI_PREFS?.persistLocalUiPrefs?.(state);
    });
  }

  function _wireShowRoomNamesToggle(ctx) {
    const {
      state,
      showRoomNamesInput,
      triggerFeedback,
      renderRoomOverlay,
    } = ctx;

    showRoomNamesInput?.addEventListener("change", () => {
      state.polygonEditor.roomNamesVisible = showRoomNamesInput.checked;
      renderRoomOverlay();
      triggerFeedback.textContent = `Status: Room names ${showRoomNamesInput.checked ? "shown" : "hidden"}`;
      window.TT_BEAMER_LOCAL_UI_PREFS?.persistLocalUiPrefs?.(state);
    });
  }

  function _wireShowPlayAreaVerticesToggle(ctx) {
    const {
      state,
      showPlayAreaVerticesInput,
      triggerFeedback,
      finishShipPolygonVertexDrag,
      syncShipPolygonEditorPanel,
      renderRoomOverlay,
    } = ctx;

    showPlayAreaVerticesInput?.addEventListener("change", () => {
      state.polygonEditor.playAreaVerticesVisible = showPlayAreaVerticesInput.checked;
      if (!showPlayAreaVerticesInput.checked && state.shipPolygonEditor.dragVertexIndex !== null) {
        finishShipPolygonVertexDrag(null, { cancel: true });
      }
      syncShipPolygonEditorPanel();
      renderRoomOverlay();
      triggerFeedback.textContent = `Status: Play Area vertices ${showPlayAreaVerticesInput.checked ? "shown" : "hidden"}`;
      window.TT_BEAMER_LOCAL_UI_PREFS?.persistLocalUiPrefs?.(state);
    });
  }

  function _wirePolygonVertexSelectChange(ctx) {
    const {
      state,
      polygonVertexSelect,
      areRoomVerticesEditable,
      getActivePolygonRoomId,
      syncPolygonEdgeSelect,
      renderRoomOverlay,
      syncPolygonEditorStatus,
    } = ctx;

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
  }

  function _wirePolygonEdgeSelectChange(ctx) {
    const {
      state,
      polygonEdgeSelect,
      areRoomVerticesEditable,
      renderRoomOverlay,
      syncPolygonEditorStatus,
    } = ctx;

    polygonEdgeSelect.addEventListener("change", () => {
      if (!areRoomVerticesEditable()) {
        return;
      }
      state.polygonEditor.selectedEdgeIndex = Math.max(0, Number(polygonEdgeSelect.value) || 0);
      renderRoomOverlay();
      syncPolygonEditorStatus();
    });
  }

  function _wirePolygonInsertVertex(ctx) {
    const {
      state,
      polygonInsertVertexButton,
      triggerFeedback,
      isPanArbitrating,
      areRoomVerticesEditable,
      resolvePolygonEditingRoomId,
      getSpecialPolygonPoints,
      setSpecialPolygonPoints,
      normalizePolygonPoint,
      pushUndoState,
      persistBoardProfiles,
      syncPolygonEditorPanel,
      renderRoomOverlay,
    } = ctx;

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
      if (typeof pushUndoState === "function") pushUndoState("Insert vertex");
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
  }

  function _wirePolygonDeleteVertex(ctx) {
    const { polygonDeleteVertexButton, deleteSelectedPolygonVertex } = ctx;

    polygonDeleteVertexButton.addEventListener("click", () => {
      deleteSelectedPolygonVertex();
    });
  }

  function _wirePolygonResetRoom(ctx) {
    const {
      state,
      polygonResetRoomButton,
      triggerFeedback,
      isPanArbitrating,
      areRoomVerticesEditable,
      getActivePolygonRoomId,
      getDefaultRoomPolygon,
      setSpecialPolygonPoints,
      pushUndoState,
      persistBoardProfiles,
      syncPolygonEditorPanel,
      renderRoomOverlay,
    } = ctx;

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
      if (typeof pushUndoState === "function") pushUndoState("Reset room polygon");
      setSpecialPolygonPoints(state.boardId, roomId, fallbackPolygon);
      const persisted = persistBoardProfiles();
      state.polygonEditor.selectedVertexIndex = 0;
      syncPolygonEditorPanel();
      renderRoomOverlay();
      triggerFeedback.textContent = persisted
        ? "Status: Room polygon reset to default"
        : "Status: Room polygon reset to default (persistence failed)";
    });
  }

  function _wirePolygonFocusRoom(ctx) {
    const {
      state,
      polygonFocusRoomButton,
      triggerFeedback,
      isPanArbitrating,
      getActivePolygonRoomId,
      syncRoomPanelFromSelection,
      renderRoomOverlay,
    } = ctx;

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
  }

  function _wirePlayAreaSelectChange(ctx) {
    const {
      state,
      playAreaSelect,
      triggerFeedback,
      setSelectedPlayAreaId,
      getShipPolygonPoints,
      captureCleanBaseline,
      persistBoardProfiles,
      syncShipPolygonEditorPanel,
      renderRoomOverlay,
    } = ctx;

    playAreaSelect?.addEventListener("change", () => {
      // Selection is a viewing/edit filter, not a
      // persistable edit. Switching the active play area shouldn't
      // flip localConfigDirty. The shipPolygonsByBoard cache still
      // has to be swapped so the editor + overlay render the new
      // polygon, but when the user was clean before the switch we
      // refresh the baseline so the dirty comparison doesn't treat
      // this as an edit. If they were already dirty, leave the
      // dirty state alone — their pending edits still matter.
      const wasClean = !state.localConfigDirty;
      setSelectedPlayAreaId(state.boardId, playAreaSelect.value);
      state.shipPolygonEditor.selectedVertexIndex = 0;
      state.shipPolygonEditor.selectedEdgeIndex = 0;
      // Switching the active play area moves the
      // user's editing intent to the new polygon. Flip lastPolygonFocus
      // to "ship" (and drop any stale room vertex selection) so DELETE
      // routes to the play-area delete path right away, without the
      // user having to click a vertex first.
      state.lastPolygonFocus = "ship";
      state.polygonEditor.vertexSelectionActive = false;
      state.shipPolygonsByBoard[state.boardId] = getShipPolygonPoints(state.boardId);
      // Blur the select so keyboard shortcuts (DELETE,
      // Ctrl+Z, …) aren't swallowed by isTypingShortcutTarget — which
      // treats any <select> as a typing target while it has focus.
      try { playAreaSelect.blur(); } catch {}
      if (wasClean && typeof captureCleanBaseline === "function") {
        captureCleanBaseline();
      } else {
        persistBoardProfiles();
      }
      syncShipPolygonEditorPanel();
      renderRoomOverlay();
      triggerFeedback.textContent = "Status: Active Play Area selected";
    });
  }

  function _wirePlayAreaNameInputChange(ctx) {
    const {
      state,
      playAreaNameInput,
      triggerFeedback,
      getPlayAreas,
      getSelectedPlayAreaId,
      setPlayAreas,
      persistBoardProfiles,
      syncShipPolygonEditorPanel,
      renderRoomOverlay,
    } = ctx;

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
  }

  function _wirePlayAreaCreate(ctx) {
    const {
      state,
      playAreaCreateButton,
      triggerFeedback,
      SHIP_POLYGON_DEFAULT,
      normalizePlayAreaId,
      normalizeShipPolygon,
      getPlayAreas,
      getSelectedPlayArea,
      setPlayAreas,
      persistBoardProfiles,
      syncShipPolygonEditorPanel,
      renderRoomOverlay,
    } = ctx;

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
  }

  function _wirePlayAreaDelete(ctx) {
    const {
      state,
      playAreaDeleteButton,
      triggerFeedback,
      getPlayAreas,
      getSelectedPlayArea,
      setPlayAreas,
      persistBoardProfiles,
      syncShipPolygonEditorPanel,
      renderRoomOverlay,
    } = ctx;

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
  }

  function _wireShipPolygonVertexSelect(ctx) {
    const {
      state,
      shipPolygonVertexSelect,
      arePlayAreaVerticesEditable,
      renderRoomOverlay,
      syncShipPolygonEditorStatus,
    } = ctx;

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
  }

  function _wireShipPolygonEdgeSelect(ctx) {
    const {
      state,
      shipPolygonEdgeSelect,
      arePlayAreaVerticesEditable,
      renderRoomOverlay,
      syncShipPolygonEditorStatus,
    } = ctx;

    shipPolygonEdgeSelect.addEventListener("change", () => {
      if (!arePlayAreaVerticesEditable()) {
        return;
      }
      state.shipPolygonEditor.selectedEdgeIndex = Math.max(0, Number(shipPolygonEdgeSelect.value) || 0);
      renderRoomOverlay();
      syncShipPolygonEditorStatus();
    });
  }

  function _wireShipPolygonInsertVertex(ctx) {
    const {
      state,
      shipPolygonInsertVertexButton,
      triggerFeedback,
      isPanArbitrating,
      arePlayAreaVerticesEditable,
      getShipPolygonPoints,
      setShipPolygonPoints,
      normalizePolygonPoint,
      persistBoardProfiles,
      syncShipPolygonEditorPanel,
      renderRoomOverlay,
    } = ctx;

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
  }

  function _wireShipPolygonDeleteVertex(ctx) {
    const {
      state,
      shipPolygonDeleteVertexButton,
      triggerFeedback,
      isPanArbitrating,
      arePlayAreaVerticesEditable,
      getShipPolygonPoints,
      setShipPolygonPoints,
      persistBoardProfiles,
      syncShipPolygonEditorPanel,
      renderRoomOverlay,
    } = ctx;

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
  }

  function _wireShipPolygonReset(ctx) {
    const {
      state,
      shipPolygonResetButton,
      SHIP_POLYGON_DEFAULT,
      triggerFeedback,
      isPanArbitrating,
      arePlayAreaVerticesEditable,
      setShipPolygonPoints,
      persistBoardProfiles,
      syncShipPolygonEditorPanel,
      renderRoomOverlay,
    } = ctx;

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

  function wirePolygonEditorBinders(ctx) {
    _wirePolygonHandleSize(ctx);
    _wireBoardZoomFit(ctx);
    _wireBoardZoomReset(ctx);
    _wirePolygonRoomSelectChange(ctx);
    _wireShowRoomVerticesToggle(ctx);
    _wireShowRoomNamesToggle(ctx);
    _wireShowPlayAreaVerticesToggle(ctx);
    _wirePolygonVertexSelectChange(ctx);
    _wirePolygonEdgeSelectChange(ctx);
    _wirePolygonInsertVertex(ctx);
    _wirePolygonDeleteVertex(ctx);
    _wirePolygonResetRoom(ctx);
    _wirePolygonFocusRoom(ctx);
    _wirePlayAreaSelectChange(ctx);
    _wirePlayAreaNameInputChange(ctx);
    _wirePlayAreaCreate(ctx);
    _wirePlayAreaDelete(ctx);
    _wireShipPolygonVertexSelect(ctx);
    _wireShipPolygonEdgeSelect(ctx);
    _wireShipPolygonInsertVertex(ctx);
    _wireShipPolygonDeleteVertex(ctx);
    _wireShipPolygonReset(ctx);
  }

  window.TT_BEAMER_RUNTIME_WIRE_POLYGON_EDITOR_BINDERS = {
    wirePolygonEditorBinders,
  };
})();
