// polygon-editor handle rendering — Play Area + room polygon edit
// handles (vertex + edge SVG markers, hit-targets, double-tap insert,
// pointerdown vertex-drag wiring).
//
// Phase 24 W3.6-C9 Option B per orchestrator decision: extracted from
// runtime-polygon-editor.js (Option B minimal split — shell drops 846
// → 516 to clear ≤800-line acceptance bar). Two functions move:
// `renderShipPolygonEditorHandles` (159 lines, file 89-247) and
// `renderPolygonEditorHandles` (171 lines, file 270-440). Both are
// called from `renderRoomOverlay` in the shell at the same step.
//
// Cross-IIFE bridges (4 total):
// - shell → handles via `init({...})`:
//   - renderRoomOverlay (rebuild trigger after vertex insert / select)
//   - beginShipPolygonVertexDrag (kicks ship-polygon drag session)
//   - beginPolygonVertexDrag (kicks room-polygon drag session)
//   - syncPolygonRoomSelection (cross-room selection state sync after
//     edge double-tap insert)
//
// Bare-identifier call sites in both render functions stay byte-
// identical with the pre-W3.6 IIFE — bridge refs live as module-
// private `let` bindings populated by the shell's init forward.
//
// `ctx` itself is also forwarded (read-only in this sub-module — every
// access goes through ctx.X for state / DOM helpers / metrics).
(() => {
  let ctx = null;
  let renderRoomOverlay = null;
  let beginShipPolygonVertexDrag = null;
  let beginPolygonVertexDrag = null;
  let syncPolygonRoomSelection = null;

  function init(deps) {
    ctx = deps?.ctx ?? null;
    if (typeof deps?.renderRoomOverlay === "function") renderRoomOverlay = deps.renderRoomOverlay;
    if (typeof deps?.beginShipPolygonVertexDrag === "function") beginShipPolygonVertexDrag = deps.beginShipPolygonVertexDrag;
    if (typeof deps?.beginPolygonVertexDrag === "function") beginPolygonVertexDrag = deps.beginPolygonVertexDrag;
    if (typeof deps?.syncPolygonRoomSelection === "function") syncPolygonRoomSelection = deps.syncPolygonRoomSelection;
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
      // Scale Play Area stroke linearly with the handle-size slider —
      // matches the room-zone path so both polygon types shrink in
      // proportion with their vertex dots.
      const paHandleScale = ctx.getCurrentPolygonHandleScale();
      maskPolygon.style.strokeWidth = `${Math.max(0.25, 2 * paHandleScale).toFixed(2)}px`;
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
        // Detect double-click for Play Area edge midpoint
        const now = performance.now();
        const lastTap = state.shipPolygonEditor._lastEdgeTap;
        const isDoubleTap = lastTap
          && lastTap.edgeIndex === index
          && (now - lastTap.time) < 400;
        state.shipPolygonEditor._lastEdgeTap = { edgeIndex: index, time: now };
        if (isDoubleTap) {
          state.shipPolygonEditor._lastEdgeTap = null;
          // Work in normalized 0-1 space, NOT the *1000 SVG-display array.
          // Otherwise setShipPolygonPoints would store huge values that
          // normalizeShipPolygon then resets to the default rectangle.
          const rawPoints = ctx.normalizeShipPolygon(selectedArea?.polygon);
          if (Array.isArray(rawPoints) && rawPoints.length >= 3) {
            if (typeof ctx.pushUndoState === "function") ctx.pushUndoState("Insert Play Area vertex (double-click)");
            const nextIndex = (index + 1) % rawPoints.length;
            const a = rawPoints[index];
            const b = rawPoints[nextIndex];
            const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            rawPoints.splice(nextIndex, 0, midpoint);
            ctx.setShipPolygonPoints(state.boardId, rawPoints);
            ctx.persistBoardProfiles();
            state.shipPolygonEditor.selectedVertexIndex = nextIndex;
            state.shipPolygonEditor.selectedEdgeIndex = index;
            state.polygonEditor.suppressRoomClickUntil = performance.now() + 400;
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

    // Hide vertex index labels once the handle gets small (under 50%
    // of the slider) — the numbers stop being legible inside a tiny
    // bubble anyway, and removing them lets the user dial handles down
    // for pixel-precise polygon placement.
    const showIndexLabels = ctx.getCurrentPolygonHandleScale() >= 0.5;

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

      let indexLabel = null;
      if (showIndexLabels) {
        indexLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        indexLabel.classList.add("polygon-vertex-index", "ship-polygon-vertex-index");
        if (index === state.shipPolygonEditor.selectedVertexIndex) {
          indexLabel.classList.add("is-active");
        }
        indexLabel.style.fontSize = `${vertexLabelSize.toFixed(2)}px`;
        indexLabel.setAttribute("x", x.toFixed(1));
        indexLabel.setAttribute("y", (y + vertexLabelSize * 0.35).toFixed(1));
        indexLabel.textContent = String(index + 1);
      }

      hitTarget.addEventListener("pointerdown", (event) => {
        if (ctx.isPanArbitrating() || !ctx.isAcceptablePolygonPointerEvent(event) || !ctx.arePlayAreaVerticesEditable()) {
          return;
        }
        event.stopPropagation();
        event.preventDefault();
        beginShipPolygonVertexDrag(event, index);
        state.shipPolygonEditor.selectedVertexIndex = index;
        // Mutual exclusion: clicking a play-area vertex deselects any
        // previously-selected room (and its vertex) so the highlight is
        // unambiguous.
        state.selectedRoomId = null;
        state.selectedRoomByBoard[state.boardId] = null;
        state.polygonEditor.selectedVertexIndex = null;
        state.polygonEditor.selectedEdgeIndex = null;
        // Flag this as the most-recently-interacted
        // polygon target so the DELETE keybinding routes the next
        // press to the ship-polygon delete path instead of an older
        // room-vertex selection that still sits in polygonEditor.
        state.lastPolygonFocus = "ship";
        state.polygonEditor.vertexSelectionActive = false;
        ctx.syncShipPolygonVertexSelect();
      });
      marker.append(hitTarget, handle);
      if (indexLabel) marker.append(indexLabel);
      ctx.roomOverlay.append(marker);
    });
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
    // In rotation mode, hide vertex + edge handles
    // immediately so the user gets a clean "rotate the whole polygon"
    // affordance rather than mixed rotate/edit controls.
    if (state.polygonEditor.rotatingRoomId === roomId) {
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
      strokeScale,
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
        // Detect double-click manually — renderRoomOverlay destroys
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

    // Hide vertex index labels when handles are <50% — they stop
    // being legible inside the small bubble anyway, and removing them
    // lets the user shrink handles for pixel-precise polygon editing.
    const showRoomIndexLabels = ctx.getCurrentPolygonHandleScale() >= 0.5;

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

      let indexLabel = null;
      if (showRoomIndexLabels) {
        indexLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        indexLabel.classList.add("polygon-vertex-index");
        if (index === state.polygonEditor.selectedVertexIndex) {
          indexLabel.classList.add("is-active");
        }
        indexLabel.style.fontSize = `${vertexLabelSize.toFixed(2)}px`;
        indexLabel.setAttribute("x", x.toFixed(1));
        indexLabel.setAttribute("y", (y + vertexLabelSize * 0.35).toFixed(1));
        indexLabel.textContent = String(index + 1);
      }

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
        // Mutual exclusion: clicking a room vertex clears any
        // previously-selected play-area vertex so the highlight only
        // ever shows on one element at a time.
        state.shipPolygonEditor.selectedVertexIndex = null;
        // Pair with the ship-vertex handler so DELETE
        // always targets the most-recently clicked polygon's vertex.
        state.lastPolygonFocus = "room";
        ctx.syncPolygonVertexSelect(room.id);
        ctx.syncPolygonEdgeSelect(room.id);
        ctx.syncRoomPanelFromSelection({ preserveDraftState: true });
        renderRoomOverlay();
        beginPolygonVertexDrag(event, room.id, index);
        ctx.syncPolygonEditorStatus();
      });
      marker.append(hitTarget, handle);
      if (indexLabel) marker.append(indexLabel);
      ctx.roomOverlay.append(marker);
    });
  }

  window.TT_BEAMER_RUNTIME_POLYGON_EDITOR_HANDLES = {
    init,
    renderShipPolygonEditorHandles,
    renderPolygonEditorHandles,
  };
})();
