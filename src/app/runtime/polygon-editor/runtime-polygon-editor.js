// Phase 14-2: polygon editor drag/render + room overlay module.
//
// Owns the polygon editor interaction surface: vertex + area drag
// sessions for both ship polygon and room polygons, editor handle
// rendering (SVG vertex/edge markers), and the top-level
// renderRoomOverlay pipeline that composes polygons + handles.
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
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

  function renderShipPolygonEditorHandles() {
    const state = ctx.state;
    if (state.uiView !== "settings") {
      return;
    }
    if (state.polygonEditor.playAreaVerticesVisible === false) {
      return;
    }
    const selectedPlayAreaId = ctx.getSelectedPlayAreaId(state.boardId);
    const allAreas = ctx.getPlayAreas(state.boardId);
    const selectedArea = allAreas.find((entry) => entry.id === selectedPlayAreaId) ?? allAreas[0];
    const points = ctx.normalizeShipPolygon(selectedArea?.polygon).map(([x, y]) => [x * 1000, y * 1000]);
    if (points.length < 3) {
      return;
    }
    const zoomScale = ctx.getBoardZoom(state.boardId).scale;
    const {
      edgeHitRadius,
      edgeHandleRadius,
      vertexHitRadius,
      vertexHandleRadius,
      vertexLabelSize,
    } = ctx.getPolygonEditorHandleMetrics(zoomScale, ctx.getCurrentPolygonHandleScale());

    for (const area of allAreas) {
      const areaPoints = ctx.normalizeShipPolygon(area?.polygon).map(([x, y]) => [x * 1000, y * 1000]);
      if (areaPoints.length < 3) {
        continue;
      }
      const maskPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      maskPolygon.classList.add("ship-zone-mask");
      if (area.id === selectedPlayAreaId) {
        maskPolygon.classList.add("is-active");
      }
      maskPolygon.setAttribute("points", areaPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "));
      ctx.roomOverlay.append(maskPolygon);
    }

    for (let index = 0; index < points.length; index += 1) {
      const [aX, aY] = points[index];
      const [bX, bY] = points[(index + 1) % points.length];
      const edgeMarker = document.createElementNS("http://www.w3.org/2000/svg", "g");
      edgeMarker.classList.add("polygon-edge-marker", "ship-polygon-edge-marker");
      const edgeHitTarget = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      edgeHitTarget.classList.add("polygon-edge-hit-target", "ship-polygon-edge-hit-target");
      const edgeHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      edgeHandle.classList.add("polygon-edge-handle", "ship-polygon-edge-handle");
      if (index === state.shipPolygonEditor.selectedEdgeIndex) {
        edgeHandle.classList.add("is-active");
        edgeHitTarget.classList.add("is-active");
      }
      const centerX = ((aX + bX) / 2).toFixed(1);
      const centerY = ((aY + bY) / 2).toFixed(1);
      edgeHitTarget.setAttribute("cx", centerX);
      edgeHitTarget.setAttribute("cy", centerY);
      edgeHitTarget.setAttribute("r", edgeHitRadius.toFixed(2));
      edgeHandle.setAttribute("cx", centerX);
      edgeHandle.setAttribute("cy", centerY);
      edgeHandle.setAttribute("r", edgeHandleRadius.toFixed(2));
      edgeHitTarget.addEventListener("pointerdown", (event) => {
        if (ctx.isPanArbitrating() || !ctx.isAcceptablePolygonPointerEvent(event) || !ctx.arePlayAreaVerticesEditable()) {
          return;
        }
        event.stopPropagation();
        event.preventDefault();
        // Phase 18: detect double-click for Play Area edge midpoint
        const now = performance.now();
        const lastTap = state.shipPolygonEditor._lastEdgeTap;
        const isDoubleTap = lastTap
          && lastTap.edgeIndex === index
          && (now - lastTap.time) < 400;
        state.shipPolygonEditor._lastEdgeTap = { edgeIndex: index, time: now };
        if (isDoubleTap) {
          state.shipPolygonEditor._lastEdgeTap = null;
          if (Array.isArray(points) && points.length >= 3) {
            if (typeof ctx.pushUndoState === "function") ctx.pushUndoState("Insert Play Area vertex (double-click)");
            const nextIndex = (index + 1) % points.length;
            const a = points[index];
            const b = points[nextIndex];
            const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            points.splice(nextIndex, 0, ctx.normalizeShipPolygon([midpoint])[0] || midpoint);
            ctx.setShipPolygonPoints(state.boardId, points);
            ctx.persistBoardProfiles();
            state.shipPolygonEditor.selectedVertexIndex = nextIndex;
            state.shipPolygonEditor.selectedEdgeIndex = index;
            ctx.syncShipPolygonVertexSelect();
            ctx.syncShipPolygonEditorStatus();
            renderRoomOverlay();
          }
          return;
        }
        // Single tap: select edge
        state.shipPolygonEditor.selectedEdgeIndex = index;
        ctx.shipPolygonEdgeSelect.value = String(index);
        renderRoomOverlay();
        ctx.syncShipPolygonEditorStatus();
      });
      edgeMarker.append(edgeHitTarget, edgeHandle);
      ctx.roomOverlay.append(edgeMarker);
    }

    points.forEach(([x, y], index) => {
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
      marker.classList.add("polygon-vertex-marker", "ship-polygon-vertex-marker");
      const hitTarget = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      hitTarget.classList.add("polygon-vertex-hit-target", "ship-polygon-vertex-hit-target");
      const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      handle.classList.add("polygon-vertex-handle", "ship-polygon-vertex-handle");
      if (index === state.shipPolygonEditor.selectedVertexIndex) {
        handle.classList.add("is-active");
        marker.classList.add("is-active");
        hitTarget.classList.add("is-active");
      }
      hitTarget.dataset.vertexIndex = String(index);
      hitTarget.setAttribute("cx", x.toFixed(1));
      hitTarget.setAttribute("cy", y.toFixed(1));
      hitTarget.setAttribute("r", vertexHitRadius.toFixed(2));
      handle.setAttribute("cx", x.toFixed(1));
      handle.setAttribute("cy", y.toFixed(1));
      handle.setAttribute("r", vertexHandleRadius.toFixed(2));

      const indexLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      indexLabel.classList.add("polygon-vertex-index", "ship-polygon-vertex-index");
      if (index === state.shipPolygonEditor.selectedVertexIndex) {
        indexLabel.classList.add("is-active");
      }
      indexLabel.style.fontSize = `${vertexLabelSize.toFixed(2)}px`;
      indexLabel.setAttribute("x", x.toFixed(1));
      indexLabel.setAttribute("y", (y + 3).toFixed(1));
      indexLabel.textContent = String(index + 1);

      hitTarget.addEventListener("pointerdown", (event) => {
        if (ctx.isPanArbitrating() || !ctx.isAcceptablePolygonPointerEvent(event) || !ctx.arePlayAreaVerticesEditable()) {
          return;
        }
        event.stopPropagation();
        event.preventDefault();
        beginShipPolygonVertexDrag(event, index);
        state.shipPolygonEditor.selectedVertexIndex = index;
        ctx.syncShipPolygonVertexSelect();
      });
      marker.append(hitTarget, handle, indexLabel);
      ctx.roomOverlay.append(marker);
    });
  }

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

  function renderPolygonEditorHandles() {
    const state = ctx.state;
    if (state.uiView !== "settings") {
      return;
    }
    if (state.polygonEditor.roomVerticesVisible === false) {
      return;
    }
    const roomId = ctx.syncSelectedRoomStateForBoard(state.boardId);
    if (!roomId) {
      return;
    }
    ctx.setActivePolygonRoomId(state.boardId, roomId);
    const room = ctx.getBoard().rooms.find((entry) => entry.id === roomId);
    if (!room) {
      return;
    }
    const points = ctx.getRoomPoints(room, state.boardId);
    const zoomScale = ctx.getBoardZoom(state.boardId).scale;
    const {
      edgeHitRadius,
      edgeHandleRadius,
      vertexHitRadius,
      vertexHandleRadius,
      vertexLabelSize,
    } = ctx.getPolygonEditorHandleMetrics(zoomScale, ctx.getCurrentPolygonHandleScale());
    for (let index = 0; index < points.length; index += 1) {
      const [aX, aY] = points[index];
      const [bX, bY] = points[(index + 1) % points.length];
      const edgeMarker = document.createElementNS("http://www.w3.org/2000/svg", "g");
      edgeMarker.classList.add("polygon-edge-marker");
      const edgeHitTarget = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      edgeHitTarget.classList.add("polygon-edge-hit-target");
      const edgeHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      edgeHandle.classList.add("polygon-edge-handle");
      if (index === state.polygonEditor.selectedEdgeIndex) {
        edgeHandle.classList.add("is-active");
        edgeHitTarget.classList.add("is-active");
      }
      const centerX = ((aX + bX) / 2).toFixed(1);
      const centerY = ((aY + bY) / 2).toFixed(1);
      edgeHitTarget.setAttribute("cx", centerX);
      edgeHitTarget.setAttribute("cy", centerY);
      edgeHitTarget.setAttribute("r", edgeHitRadius.toFixed(2));
      edgeHandle.setAttribute("cx", centerX);
      edgeHandle.setAttribute("cy", centerY);
      edgeHandle.setAttribute("r", edgeHandleRadius.toFixed(2));
      edgeHitTarget.addEventListener("pointerdown", (event) => {
        if (ctx.isPanArbitrating() || !ctx.isAcceptablePolygonPointerEvent(event) || !ctx.areRoomVerticesEditable()) {
          return;
        }
        event.stopPropagation();
        event.preventDefault();
        // Phase 18: detect double-click manually — renderRoomOverlay destroys
        // SVG elements on each rebuild, so native dblclick never fires.
        const now = performance.now();
        const lastTap = state.polygonEditor._lastEdgeTap;
        const isDoubleTap = lastTap
          && lastTap.roomId === room.id
          && lastTap.edgeIndex === index
          && (now - lastTap.time) < 400;
        state.polygonEditor._lastEdgeTap = { roomId: room.id, edgeIndex: index, time: now };
        if (isDoubleTap) {
          // Double-tap: insert vertex at edge midpoint
          state.polygonEditor._lastEdgeTap = null;
          const roomPoints = ctx.getSpecialPolygonPoints(state.boardId, room.id);
          if (Array.isArray(roomPoints) && roomPoints.length >= 3) {
            if (typeof ctx.pushUndoState === "function") ctx.pushUndoState("Insert vertex (double-click)");
            const nextIndex = (index + 1) % roomPoints.length;
            const a = roomPoints[index];
            const b = roomPoints[nextIndex];
            const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            roomPoints.splice(nextIndex, 0, ctx.normalizePolygonPoint(midpoint));
            ctx.setSpecialPolygonPoints(state.boardId, room.id, roomPoints);
            ctx.persistBoardProfiles();
            // Keep the room selected after insert — suppress follow-up clicks
            // from the double-tap so they don't deselect or re-select another room
            state.selectedRoomId = room.id;
            state.selectedRoomByBoard[state.boardId] = room.id;
            state.polygonEditor.selectedVertexIndex = nextIndex;
            state.polygonEditor.selectedEdgeIndex = index;
            state.polygonEditor.suppressRoomClickUntil = performance.now() + 400;
            ctx.setActivePolygonRoomId(state.boardId, room.id);
            syncPolygonRoomSelection(room.id);
            ctx.syncPolygonEditorPanel();
            ctx.syncRoomPanelFromSelection({ preserveDraftState: true });
            renderRoomOverlay();
          }
          return;
        }
        // Single tap: select edge
        state.selectedRoomId = room.id;
        state.selectedRoomByBoard[state.boardId] = room.id;
        syncPolygonRoomSelection(room.id);
        state.polygonEditor.selectedEdgeIndex = index;
        state.polygonEditor.suppressRoomClickUntil = performance.now() + 220;
        ctx.syncPolygonEditorPanel();
        ctx.syncRoomPanelFromSelection({ preserveDraftState: true });
        ctx.polygonEdgeSelect.value = String(index);
        renderRoomOverlay();
        ctx.syncPolygonEditorStatus();
      });
      edgeMarker.append(edgeHitTarget, edgeHandle);
      ctx.roomOverlay.append(edgeMarker);
    }

    points.forEach(([x, y], index) => {
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
      marker.classList.add("polygon-vertex-marker");
      const hitTarget = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      hitTarget.classList.add("polygon-vertex-hit-target");
      const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      handle.classList.add("polygon-vertex-handle");
      if (index === state.polygonEditor.selectedVertexIndex) {
        handle.classList.add("is-active");
        marker.classList.add("is-active");
        hitTarget.classList.add("is-active");
      }
      handle.dataset.vertexIndex = String(index);
      hitTarget.dataset.vertexIndex = String(index);
      hitTarget.dataset.roomId = room.id;
      hitTarget.setAttribute("cx", x.toFixed(1));
      hitTarget.setAttribute("cy", y.toFixed(1));
      hitTarget.setAttribute("r", vertexHitRadius.toFixed(2));
      handle.setAttribute("cx", x.toFixed(1));
      handle.setAttribute("cy", y.toFixed(1));
      handle.setAttribute("r", vertexHandleRadius.toFixed(2));

      const indexLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      indexLabel.classList.add("polygon-vertex-index");
      if (index === state.polygonEditor.selectedVertexIndex) {
        indexLabel.classList.add("is-active");
      }
      indexLabel.style.fontSize = `${vertexLabelSize.toFixed(2)}px`;
      indexLabel.setAttribute("x", x.toFixed(1));
      indexLabel.setAttribute("y", (y + 3).toFixed(1));
      indexLabel.textContent = String(index + 1);

      hitTarget.addEventListener("pointerdown", (event) => {
        if (ctx.isPanArbitrating() || !ctx.isAcceptablePolygonPointerEvent(event) || !ctx.areRoomVerticesEditable()) {
          return;
        }
        event.stopPropagation();
        event.preventDefault();
        state.selectedRoomId = room.id;
        state.selectedRoomByBoard[state.boardId] = room.id;
        ctx.setActivePolygonRoomId(state.boardId, room.id);
        state.polygonEditor.selectedVertexIndex = index;
        state.polygonEditor.selectedEdgeIndex = index;
        state.polygonEditor.vertexSelectionActive = true;
        ctx.syncPolygonVertexSelect(room.id);
        ctx.syncPolygonEdgeSelect(room.id);
        ctx.syncRoomPanelFromSelection({ preserveDraftState: true });
        renderRoomOverlay();
        beginPolygonVertexDrag(event, room.id, index);
        ctx.syncPolygonEditorStatus();
      });
      marker.append(hitTarget, handle, indexLabel);
      ctx.roomOverlay.append(marker);
    });
  }

  function beginPolygonVertexDrag(event, roomId, vertexIndex) {
    if (typeof ctx.pushUndoState === "function") ctx.pushUndoState("Move room vertex");
    const state = ctx.state;
    state.polygonEditor.dragVertexIndex = vertexIndex;
    state.polygonEditor.dragPointerId = event.pointerId;
    state.polygonEditor.dragRoomId = roomId;
    state.polygonEditor.dragBoardId = state.boardId;
    const startPoints = ctx.getSpecialPolygonPoints(state.boardId, roomId);
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
    const startPoints = ctx.getSpecialPolygonPoints(boardId, roomId);
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
      ctx.setSpecialPolygonPoints(dragBoardId, dragRoomId, dragStartPoints);
    }
    renderRoomOverlay();
    ctx.syncPolygonEditorStatus();
    ctx.triggerFeedback.textContent = "Status: Polygon drag canceled";
  }

  function cancelPolygonAreaDrag() {
    const state = ctx.state;
    const { dragAreaBoardId, dragAreaRoomId, dragAreaStartPoints } = state.polygonEditor;
    if (dragAreaBoardId && dragAreaRoomId && Array.isArray(dragAreaStartPoints)) {
      ctx.setSpecialPolygonPoints(dragAreaBoardId, dragAreaRoomId, dragAreaStartPoints);
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

    for (const room of board.rooms) {
      const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      polygon.classList.add("room-zone");
      if (state.uiView === "settings") {
        polygon.classList.add("is-draggable");
      }
      if (ctx.isRoomFrozen(state.boardId, room.id)) {
        polygon.classList.add("is-frozen");
      }
      polygon.dataset.roomId = room.id;
      polygon.setAttribute(
        "points",
        ctx.getRoomPoints(room, state.boardId)
          .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
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
        syncPolygonRoomSelection(room.id);
        ctx.syncPolygonEditorPanel();
        ctx.syncRoomPanelFromSelection({ preserveDraftState: true });
        renderRoomOverlay();
        beginPendingPolygonAreaDrag(event, room.id);
      });
      if (state.selectedRoomId === room.id) {
        polygon.classList.add("is-selected");
      }
      ctx.roomOverlay.append(polygon);

      if (ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) {
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.classList.add("room-zone-label");
        const labelPosition = ctx.getRoomLabelPosition(room, state.boardId);
        label.setAttribute("x", String((labelPosition.x * 1000).toFixed(1)));
        label.setAttribute("y", String((labelPosition.y * 1000 + 8).toFixed(1)));
        // Phase 18: scale label font-size with polygon handle size slider
        const handleScale = ctx.getCurrentPolygonHandleScale();
        const labelFontSize = Math.max(8, Math.round(22 * handleScale));
        label.style.fontSize = `${labelFontSize}px`;
        const roomName = room.name ?? room.label;
        label.textContent = roomName.startsWith("Hex ") ? roomName.replace("Hex ", "") : roomName;
        ctx.roomOverlay.append(label);
      }
    }

    renderPolygonEditorHandles();
    renderShipPolygonEditorHandles();
  }

  window.TT_BEAMER_RUNTIME_POLYGON_EDITOR = {
    init,
    getNormalizedOverlayPoint,
    beginShipPolygonVertexDrag,
    clearShipPolygonDragSession,
    commitShipPolygonDrag,
    cancelShipPolygonDrag,
    finishShipPolygonVertexDrag,
    renderShipPolygonEditorHandles,
    syncPolygonRoomSelection,
    renderPolygonEditorHandles,
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
