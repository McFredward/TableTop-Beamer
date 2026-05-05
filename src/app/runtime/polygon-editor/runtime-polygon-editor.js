// polygon editor drag/render + room overlay module.
//
// Owns the polygon editor interaction surface: vertex + area drag
// sessions for both ship polygon and room polygons, editor handle
// rendering (SVG vertex/edge markers), and the top-level
// renderRoomOverlay pipeline that composes polygons + handles.
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;

  // W3.6-C9: bridge bindings populated at init from
  // window.TT_BEAMER_RUNTIME_POLYGON_EDITOR_HANDLES so bare-identifier
  // calls in renderRoomOverlay (`renderPolygonEditorHandles()`,
  // `renderShipPolygonEditorHandles()`) stay byte-identical with the
  // pre-W3.6 IIFE.
  let renderPolygonEditorHandles = null;
  let renderShipPolygonEditorHandles = null;

  function init(dependencies) {
    ctx = dependencies;
    // W3.6-C9: forward shell-local fns to the handles sub-module so its
    // internal callbacks (renderRoomOverlay / beginShipPolygonVertexDrag /
    // beginPolygonVertexDrag / syncPolygonRoomSelection) resolve.
    const handlesModule = window.TT_BEAMER_RUNTIME_POLYGON_EDITOR_HANDLES;
    if (handlesModule) {
      handlesModule.init({
        ctx,
        renderRoomOverlay,
        beginShipPolygonVertexDrag,
        beginPolygonVertexDrag,
        syncPolygonRoomSelection,
      });
      renderPolygonEditorHandles = handlesModule.renderPolygonEditorHandles;
      renderShipPolygonEditorHandles = handlesModule.renderShipPolygonEditorHandles;
    }
  }

  function getNormalizedOverlayPoint(event) {
    return ctx.mapClientPointToNormalized(event.clientX, event.clientY);
  }

  function beginShipPolygonVertexDrag(event, vertexIndex) {
    if (typeof ctx.pushUndoState === "function") ctx.pushUndoState("Move Play Area vertex");
    const state = ctx.state;
    state.shipPolygonEditor.dragVertexIndex = vertexIndex;
    state.shipPolygonEditor.dragPointerId = event.pointerId;
    state.shipPolygonEditor.dragBoardId = state.boardId;
    const startPoints = ctx.getShipPolygonPoints(state.boardId);
    state.shipPolygonEditor.dragStartPoints = startPoints;
    state.shipPolygonEditor.dragMoved = false;
    const initialVertex = startPoints[vertexIndex] || [0, 0];
    const [pointerX, pointerY] = getNormalizedOverlayPoint(event);
    state.shipPolygonEditor.dragVertexOffsetX = initialVertex[0] - pointerX;
    state.shipPolygonEditor.dragVertexOffsetY = initialVertex[1] - pointerY;
    state.shipPolygonEditor.dragDomRefs = ctx.cacheShipPolygonDragDomRefs();
    ctx.beginPolygonDragInteraction();
    try {
      ctx.roomOverlay.setPointerCapture(event.pointerId);
    } catch {
      // pointer capture can fail on unsupported devices
    }
  }

  function clearShipPolygonDragSession() {
    const state = ctx.state;
    state.shipPolygonEditor.dragVertexIndex = null;
    state.shipPolygonEditor.dragPointerId = null;
    state.shipPolygonEditor.dragBoardId = null;
    state.shipPolygonEditor.dragStartPoints = null;
    state.shipPolygonEditor.dragMoved = false;
    state.shipPolygonEditor.dragVertexOffsetX = 0;
    state.shipPolygonEditor.dragVertexOffsetY = 0;
    state.shipPolygonEditor.dragDomRefs = null;
    ctx.endPolygonDragInteraction();
  }

  function commitShipPolygonDrag() {
    // Undo state was captured at drag start (beginShipPolygonVertexDrag)
    const persisted = ctx.persistBoardProfiles();
    ctx.triggerFeedback.textContent = persisted
      ? "Status: Play Area vertex moved"
      : "Status: Play Area vertex moved (persistence failed)";
  }

  function cancelShipPolygonDrag() {
    const state = ctx.state;
    const { dragBoardId, dragStartPoints } = state.shipPolygonEditor;
    if (dragBoardId && Array.isArray(dragStartPoints)) {
      ctx.setShipPolygonPoints(dragBoardId, dragStartPoints);
    }
    renderRoomOverlay();
    ctx.syncShipPolygonEditorStatus();
    ctx.triggerFeedback.textContent = "Status: Play Area drag canceled";
  }

  function finishShipPolygonVertexDrag(event, { cancel = false } = {}) {
    const state = ctx.state;
    const pointerId = state.shipPolygonEditor.dragPointerId;
    if (pointerId !== null && event && ctx.roomOverlay.hasPointerCapture(pointerId)) {
      ctx.roomOverlay.releasePointerCapture(pointerId);
    }
    const moved = state.shipPolygonEditor.dragMoved;
    if (cancel) {
      cancelShipPolygonDrag();
    } else if (moved) {
      commitShipPolygonDrag();
    }
    clearShipPolygonDragSession();
  }

  // W3.6-C9: `renderShipPolygonEditorHandles` (159 lines) moved to
  // runtime-polygon-editor-handles.js. The shell forwards
  // `renderRoomOverlay`, `beginShipPolygonVertexDrag`,
  // `beginPolygonVertexDrag`, `syncPolygonRoomSelection` to the sub-
  // module's init at boot so internal callbacks resolve. Local
  // namespace re-export below preserves the public API.

  function syncPolygonRoomSelection(roomId) {
    if (!roomId) {
      return;
    }
    const state = ctx.state;
    const rooms = ctx.getSpecialRooms(state.boardId);
    if (!rooms.some((room) => room.id === roomId)) {
      return;
    }
    const previousRoomId = ctx.getActivePolygonRoomId(state.boardId);
    const roomChanged = previousRoomId !== roomId;
    ctx.setActivePolygonRoomId(state.boardId, roomId);
    state.selectedRoomId = roomId;
    state.selectedRoomByBoard[state.boardId] = roomId;
    if (roomChanged) {
      state.polygonEditor.selectedVertexIndex = 0;
      state.polygonEditor.selectedEdgeIndex = 0;
      state.polygonEditor.vertexSelectionActive = false;
    }
  }

  // W3.6-C9: `renderPolygonEditorHandles` (171 lines) moved to
  // runtime-polygon-editor-handles.js — see comment block above the
  // ship-polygon move.

  function beginPolygonVertexDrag(event, roomId, vertexIndex) {
    if (typeof ctx.pushUndoState === "function") ctx.pushUndoState("Move room vertex");
    const state = ctx.state;
    state.polygonEditor.dragVertexIndex = vertexIndex;
    state.polygonEditor.dragPointerId = event.pointerId;
    state.polygonEditor.dragRoomId = roomId;
    state.polygonEditor.dragBoardId = state.boardId;
    const startPoints = ctx.getRoomPolygonPoints(state.boardId, roomId);
    state.polygonEditor.dragStartPoints = startPoints;
    state.polygonEditor.dragMoved = false;
    const board = ctx.getBoard(state.boardId);
    const room = board?.rooms?.find((entry) => entry.id === roomId);
    const initialVertexOverlay = room
      ? ctx.getRoomPoints(room, state.boardId)[vertexIndex]
      : [(startPoints[vertexIndex]?.[0] || 0) * 1000, (startPoints[vertexIndex]?.[1] || 0) * 1000];
    const initialVertexDisplayX = (initialVertexOverlay?.[0] || 0) / 1000;
    const initialVertexDisplayY = (initialVertexOverlay?.[1] || 0) / 1000;
    const [pointerX, pointerY] = getNormalizedOverlayPoint(event);
    state.polygonEditor.dragVertexOffsetX = initialVertexDisplayX - pointerX;
    state.polygonEditor.dragVertexOffsetY = initialVertexDisplayY - pointerY;
    state.polygonEditor.dragDomRefs = ctx.cacheRoomPolygonDragDomRefs(roomId);
    ctx.beginPolygonDragInteraction();
    try {
      ctx.roomOverlay.setPointerCapture(event.pointerId);
    } catch {
      // pointer capture can fail on unsupported devices
    }
  }

  function beginPendingPolygonAreaDrag(event, roomId) {
    const state = ctx.state;
    state.polygonEditor.pendingAreaPointerId = event.pointerId;
    state.polygonEditor.pendingAreaRoomId = roomId;
    state.polygonEditor.pendingAreaBoardId = state.boardId;
    state.polygonEditor.pendingAreaStartPointerPoint = getNormalizedOverlayPoint(event);
    ctx.beginPolygonDragInteraction();
  }

  function clearPendingPolygonAreaDragSession() {
    const state = ctx.state;
    state.polygonEditor.pendingAreaPointerId = null;
    state.polygonEditor.pendingAreaRoomId = null;
    state.polygonEditor.pendingAreaBoardId = null;
    state.polygonEditor.pendingAreaStartPointerPoint = null;
    ctx.endPolygonDragInteraction();
  }

  function preserveRoomSelectionAfterPointerLifecycle() {
    const state = ctx.state;
    state.polygonEditor.suppressRoomClickUntil = performance.now() + 220;
    ctx.refreshPersistentRoomSelectionVisualState();
  }

  function beginPolygonAreaDrag(event, roomId, { boardId = ctx.state.boardId, startPointerPoint = null } = {}) {
    const state = ctx.state;
    const startPoints = ctx.getRoomPolygonPoints(boardId, roomId);
    if (!Array.isArray(startPoints) || startPoints.length < 3) {
      return;
    }
    if (typeof ctx.pushUndoState === "function") ctx.pushUndoState("Move room area");
    state.polygonEditor.dragAreaPointerId = event.pointerId;
    state.polygonEditor.dragAreaRoomId = roomId;
    state.polygonEditor.dragAreaBoardId = boardId;
    state.polygonEditor.dragAreaStartPoints = startPoints;
    state.polygonEditor.dragAreaStartPointerPoint = Array.isArray(startPointerPoint)
      ? [...startPointerPoint]
      : getNormalizedOverlayPoint(event);
    state.polygonEditor.dragAreaMoved = false;
    clearPendingPolygonAreaDragSession();
    state.polygonEditor.dragAreaDomRefs = ctx.cacheRoomPolygonDragDomRefs(roomId);
    ctx.beginPolygonDragInteraction();
    ctx.roomOverlay.classList.add("is-room-dragging");
    try {
      ctx.roomOverlay.setPointerCapture(event.pointerId);
    } catch {
      // pointer capture can fail on unsupported devices
    }
  }

  function clearPolygonAreaDragSession() {
    const state = ctx.state;
    state.polygonEditor.dragAreaPointerId = null;
    state.polygonEditor.dragAreaRoomId = null;
    state.polygonEditor.dragAreaBoardId = null;
    state.polygonEditor.dragAreaStartPoints = null;
    state.polygonEditor.dragAreaStartPointerPoint = null;
    state.polygonEditor.dragAreaMoved = false;
    state.polygonEditor.dragAreaDomRefs = null;
    ctx.roomOverlay.classList.remove("is-room-dragging");
    ctx.endPolygonDragInteraction();
  }

  function maybePromotePendingPolygonAreaDrag(event) {
    const state = ctx.state;
    if (state.polygonEditor.dragAreaPointerId !== null) {
      return;
    }
    const pendingPointerId = state.polygonEditor.pendingAreaPointerId;
    if (pendingPointerId === null || pendingPointerId !== event.pointerId) {
      return;
    }
    if (state.uiView !== "settings" || !ctx.areRoomVerticesEditable()) {
      clearPendingPolygonAreaDragSession();
      return;
    }
    const startPointerPoint = state.polygonEditor.pendingAreaStartPointerPoint;
    const roomId = state.polygonEditor.pendingAreaRoomId;
    const boardId = state.polygonEditor.pendingAreaBoardId;
    if (!roomId || !boardId || !Array.isArray(startPointerPoint)) {
      clearPendingPolygonAreaDragSession();
      return;
    }
    const [currentX, currentY] = getNormalizedOverlayPoint(event);
    const [startX, startY] = startPointerPoint;
    const movedDistance = Math.hypot(currentX - startX, currentY - startY);
    if (movedDistance < 0.0025) {
      return;
    }
    beginPolygonAreaDrag(event, roomId, { boardId, startPointerPoint });
  }

  function clearPolygonDragSession() {
    const state = ctx.state;
    state.polygonEditor.dragVertexIndex = null;
    state.polygonEditor.dragPointerId = null;
    state.polygonEditor.dragRoomId = null;
    state.polygonEditor.dragBoardId = null;
    state.polygonEditor.dragStartPoints = null;
    state.polygonEditor.dragMoved = false;
    state.polygonEditor.dragVertexOffsetX = 0;
    state.polygonEditor.dragVertexOffsetY = 0;
    state.polygonEditor.dragDomRefs = null;
    ctx.endPolygonDragInteraction();
  }

  function commitPolygonDrag() {
    // Undo state was captured at drag start (beginPolygonVertexDrag)
    const persisted = ctx.persistBoardProfiles();
    ctx.triggerFeedback.textContent = persisted
      ? "Status: Polygon vertex moved"
      : "Status: Polygon vertex moved (persistence failed)";
  }

  function cancelPolygonDrag() {
    const state = ctx.state;
    const { dragBoardId, dragRoomId, dragStartPoints } = state.polygonEditor;
    if (dragBoardId && dragRoomId && Array.isArray(dragStartPoints)) {
      ctx.setRoomPolygonPoints(dragBoardId, dragRoomId, dragStartPoints);
    }
    renderRoomOverlay();
    ctx.syncPolygonEditorStatus();
    ctx.triggerFeedback.textContent = "Status: Polygon drag canceled";
  }

  function cancelPolygonAreaDrag() {
    const state = ctx.state;
    const { dragAreaBoardId, dragAreaRoomId, dragAreaStartPoints } = state.polygonEditor;
    if (dragAreaBoardId && dragAreaRoomId && Array.isArray(dragAreaStartPoints)) {
      ctx.setRoomPolygonPoints(dragAreaBoardId, dragAreaRoomId, dragAreaStartPoints);
    }
    renderRoomOverlay();
    ctx.syncPolygonEditorStatus();
    ctx.triggerFeedback.textContent = "Status: Room area drag canceled";
  }

  function finishPolygonVertexDrag(event, { cancel = false } = {}) {
    const state = ctx.state;
    const pointerId = state.polygonEditor.dragPointerId;
    if (pointerId !== null && event && ctx.roomOverlay.hasPointerCapture(pointerId)) {
      ctx.roomOverlay.releasePointerCapture(pointerId);
    }
    const moved = state.polygonEditor.dragMoved;
    if (cancel) {
      cancelPolygonDrag();
    } else if (moved) {
      commitPolygonDrag();
    }
    clearPolygonDragSession();
  }

  function finishPolygonAreaDrag(event, { cancel = false } = {}) {
    const state = ctx.state;
    const pointerId = state.polygonEditor.dragAreaPointerId;
    if (pointerId !== null && event && ctx.roomOverlay.hasPointerCapture(pointerId)) {
      ctx.roomOverlay.releasePointerCapture(pointerId);
    }
    const moved = state.polygonEditor.dragAreaMoved;
    if (cancel) {
      cancelPolygonAreaDrag();
    } else if (moved) {
      // Undo state was captured at drag start (beginPolygonAreaDrag)
      const persisted = ctx.persistBoardProfiles();
      state.polygonEditor.suppressRoomClickUntil = performance.now() + 220;
      ctx.triggerFeedback.textContent = persisted
        ? "Status: Room polygon moved as an area"
        : "Status: Room polygon moved as an area (persistence failed)";
    }
    clearPolygonAreaDragSession();
  }

  function renderRoomOverlay() {
    const state = ctx.state;
    const board = ctx.getBoard();
    ctx.syncSelectedRoomStateForBoard(state.boardId);
    ctx.roomOverlay.replaceChildren();

    if (ctx.outputRole === ctx.OUTPUT_ROLE_FINAL && !state.alignMode) {
      return;
    }

    // Board catalog may not be ready during the init-time nav regression.
    // Skip rendering room polygons until it is.
    if (!board || !Array.isArray(board.rooms)) {
      return;
    }

    // Polygon outline thickness scales linearly with the handle-size
    // slider so the stroke never out-grows the vertex dots. Old formula
    // floored at 0.8px which made tiny dots disappear inside a wide
    // line at low slider values.
    const overlayHandleScale = ctx.getCurrentPolygonHandleScale();
    const overlayStrokeWidth = Math.max(0.25, 2 * overlayHandleScale);

    for (const room of board.rooms) {
      const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      polygon.classList.add("room-zone");
      polygon.style.strokeWidth = `${overlayStrokeWidth.toFixed(2)}px`;
      if (state.uiView === "settings") {
        polygon.classList.add("is-draggable");
      }
      if (ctx.isRoomFrozen(state.boardId, room.id)) {
        polygon.classList.add("is-frozen");
      }
      // Visual indicator for rotation mode.
      if (state.polygonEditor?.rotatingRoomId === room.id) {
        polygon.classList.add("is-rotating");
      }
      polygon.dataset.roomId = room.id;
      // On /output, remap polygon points through grid warp
      const useGridRemap = ctx.outputRole === ctx.OUTPUT_ROLE_FINAL
        && typeof ctx.remapGridPoint === "function"
        && typeof ctx.hasGridDisplacements === "function"
        && ctx.hasGridDisplacements();
      polygon.setAttribute(
        "points",
        ctx.getRoomPoints(room, state.boardId)
          .map(([x, y]) => {
            if (useGridRemap) {
              const r = ctx.remapGridPoint(x / 1000, y / 1000);
              return `${(r.x * 1000).toFixed(1)},${(r.y * 1000).toFixed(1)}`;
            }
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" "),
      );
      polygon.addEventListener("click", (event) => {
        if (performance.now() < (state.polygonEditor.suppressRoomClickUntil || 0)) {
          return;
        }
        if (ctx.isPanArbitrating()) {
          return;
        }
        if (state.uiView === "dashboard" && ctx.isRoomFrozen(state.boardId, room.id)) {
          return;
        }
        if (ctx.outputRole === ctx.OUTPUT_ROLE_CONTROL && state.uiView === "dashboard" && ctx.isQuickModeActive()) {
          event.preventDefault();
          event.stopPropagation();
          ctx.handleQuickModeRoomTap(room.id);
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        state.selectedRoomId = room.id;
        state.selectedRoomByBoard[state.boardId] = room.id;
        ctx.applyRoomDraftTargetFromRoomClick(room.id);
        state.polygonEditor.vertexSelectionActive = false;
        // Clear any stale ship-vertex selection so DEL doesn't fall
        // through to a play-area handle that was clicked earlier.
        state.shipPolygonEditor.selectedVertexIndex = null;
        state.lastPolygonFocus = "room";
        syncPolygonRoomSelection(room.id);
        ctx.syncPolygonEditorPanel();
        ctx.syncRoomPanelFromSelection({ preserveDraftState: true });
        renderRoomOverlay();
      });
      polygon.addEventListener("pointerdown", (event) => {
        if (state.uiView !== "settings" || ctx.isPanArbitrating() || !ctx.isAcceptablePolygonPointerEvent(event) || !ctx.areRoomVerticesEditable()) {
          return;
        }
        if (
          state.polygonEditor.dragVertexIndex !== null ||
          state.shipPolygonEditor.dragVertexIndex !== null ||
          state.polygonEditor.dragAreaPointerId !== null
        ) {
          return;
        }
        state.selectedRoomId = room.id;
        state.selectedRoomByBoard[state.boardId] = room.id;
        state.polygonEditor.vertexSelectionActive = false;
        state.shipPolygonEditor.selectedVertexIndex = null;
        state.lastPolygonFocus = "room";
        syncPolygonRoomSelection(room.id);
        ctx.syncPolygonEditorPanel();
        ctx.syncRoomPanelFromSelection({ preserveDraftState: true });
        renderRoomOverlay();
        beginPendingPolygonAreaDrag(event, room.id);
      });
      // h17: dashboard selection has zero effect on /output/. The
      // is-selected class drives several visual rules (highlight stroke,
      // glow filter, hover overlay, rotating state colour); rather than
      // override every one of them in CSS, simply skip applying the
      // class on the projected output. The dashboard is the only place
      // that should reflect operator selection state.
      if (
        state.selectedRoomId === room.id
        && ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL
      ) {
        polygon.classList.add("is-selected");
      }
      ctx.roomOverlay.append(polygon);

      if (
        ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL
        && state.polygonEditor.roomNamesVisible !== false
      ) {
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.classList.add("room-zone-label");
        const labelPosition = ctx.getRoomLabelPosition(room, state.boardId);
        label.setAttribute("x", String((labelPosition.x * 1000).toFixed(1)));
        label.setAttribute("y", String((labelPosition.y * 1000 + 8).toFixed(1)));
        // Scale label font-size with polygon handle size slider.
        // ALSO scale by polygon size so tiny rooms don't
        // get a label that overruns the polygon. Compute the bounding-box
        // shorter side from the room's points (in 0–1000 SVG units) and
        // map to a multiplier in [0.4, 1.4]. The final font size is
        // clamped to [8, 38]px.
        const handleScale = ctx.getCurrentPolygonHandleScale();
        const points = ctx.getRoomPoints(room, state.boardId);
        let minX = 1000;
        let minY = 1000;
        let maxX = 0;
        let maxY = 0;
        for (const [px, py] of points) {
          if (px < minX) minX = px;
          if (py < minY) minY = py;
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;
        }
        const polyShorter = Math.min(maxX - minX, maxY - minY);
        // 200/1000 (= 20% of board) → 1×; below 80 (8%) → 0.4×; above 280 (28%) → 1.4×.
        const polyFactor = Math.max(0.4, Math.min(1.4, polyShorter / 200));
        const baseSize = 22 * handleScale * polyFactor;
        const labelFontSize = Math.max(8, Math.min(38, Math.round(baseSize)));
        label.style.fontSize = `${labelFontSize}px`;
        const roomName = room.name ?? room.label;
        label.textContent = roomName.startsWith("Hex ") ? roomName.replace("Hex ", "") : roomName;
        ctx.roomOverlay.append(label);
      }
    }

    renderPolygonEditorHandles();
    renderShipPolygonEditorHandles();
    // Render Play Area boundaries (mask only, no handles) during
    // align mode on /output so the operator can see projection boundaries.
    renderAlignModePlayAreaOverlay();
  }

  function renderAlignModePlayAreaOverlay() {
    const state = ctx.state;
    // Only render on /output when align mode is active
    if (ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL || !state.alignMode) {
      return;
    }
    const allAreas = ctx.getPlayAreas(state.boardId);
    if (!allAreas || allAreas.length === 0) {
      return;
    }
    for (const area of allAreas) {
      const areaPoints = ctx.normalizeShipPolygon(area?.polygon).map(([x, y]) => [x * 1000, y * 1000]);
      if (areaPoints.length < 3) {
        continue;
      }
      const maskPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      maskPolygon.classList.add("ship-zone-mask", "align-mode-play-area");
      const useGridRemap = typeof ctx.remapGridPoint === "function"
        && typeof ctx.hasGridDisplacements === "function"
        && ctx.hasGridDisplacements();
      maskPolygon.setAttribute("points", areaPoints.map(([x, y]) => {
        if (useGridRemap) {
          const r = ctx.remapGridPoint(x / 1000, y / 1000);
          return `${(r.x * 1000).toFixed(1)},${(r.y * 1000).toFixed(1)}`;
        }
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" "));
      ctx.roomOverlay.append(maskPolygon);
    }
  }

  // W3.6-C9: re-export the 2 render-handle keys from the sub-module
  // so the 24-key namespace contract stays intact for any downstream
  // caller. The handles `<script>` is loaded BEFORE this file in
  // index.html, so its namespace is already populated at parse-time
  // of this IIFE.
  const _handlesNs = window.TT_BEAMER_RUNTIME_POLYGON_EDITOR_HANDLES || {};
  window.TT_BEAMER_RUNTIME_POLYGON_EDITOR = {
    init,
    getNormalizedOverlayPoint,
    beginShipPolygonVertexDrag,
    clearShipPolygonDragSession,
    commitShipPolygonDrag,
    cancelShipPolygonDrag,
    finishShipPolygonVertexDrag,
    renderShipPolygonEditorHandles: _handlesNs.renderShipPolygonEditorHandles,
    syncPolygonRoomSelection,
    renderPolygonEditorHandles: _handlesNs.renderPolygonEditorHandles,
    beginPolygonVertexDrag,
    beginPendingPolygonAreaDrag,
    clearPendingPolygonAreaDragSession,
    preserveRoomSelectionAfterPointerLifecycle,
    beginPolygonAreaDrag,
    clearPolygonAreaDragSession,
    maybePromotePendingPolygonAreaDrag,
    clearPolygonDragSession,
    commitPolygonDrag,
    cancelPolygonDrag,
    cancelPolygonAreaDrag,
    finishPolygonVertexDrag,
    finishPolygonAreaDrag,
    renderRoomOverlay,
  };
})();
