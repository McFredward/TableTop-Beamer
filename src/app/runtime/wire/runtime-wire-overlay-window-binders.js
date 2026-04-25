// roomOverlay pointer + document/window event binders.
//
// Wires the polygon drag pointer lifecycle on roomOverlay (pointermove/
// up/cancel/down/click), document keyboard shortcuts (Ctrl+C/V, Delete,
// Space, Escape for drag cancel), the global button-click delegation
// handler, and window-level blur/visibility/orientation/resize/
// fullscreen/scroll reactions. Exposed as wireOverlayWindowBinders(ctx).
(() => {
  function wireOverlayWindowBinders(ctx) {
    const {
      state,
      liveSync,
      roomOverlay,
      triggerFeedback,
      dashboardGlobalLoopUntilStopInput,
      dashboardGlobalPlaySoundInput,
      outputRole,
      OUTPUT_ROLE_CONTROL,
      GLOBAL_ONE_SHOT_DURATION_SEC,
      arePlayAreaVerticesEditable,
      areRoomVerticesEditable,
      getShipPolygonPoints,
      setShipPolygonPoints,
      getNormalizedOverlayPoint,
      clampDisplayNormalizedCoordinate,
      applyIncrementalShipDrag,
      applyIncrementalRoomDrag,
      syncShipPolygonEditorStatus,
      syncPolygonEditorStatus,
      maybePromotePendingPolygonAreaDrag,
      clampRoomAbsoluteCoordinate,
      setSpecialPolygonPoints,
      getSpecialPolygonPoints,
      getBoard,
      getRoomPoints,
      projectDisplayNormalizedToRoomRaw,
      finishShipPolygonVertexDrag,
      finishPolygonAreaDrag,
      finishPolygonVertexDrag,
      preserveRoomSelectionAfterPointerLifecycle,
      clearPendingPolygonAreaDragSession,
      canStartPanModeFromEvent,
      startPanMode,
      endPanMode,
      isPanArbitrating,
      scheduleZoomUpdate,
      setPanCursorState,
      clearSelectedRoomSelection,
      isTypingShortcutTarget,
      isPlayAreaShortcutContext,
      copySelectedRoomToClipboard,
      pasteRoomFromClipboard,
      deleteSelectedPolygonVertex,
      deleteSelectedRoom,
      getActivePolygonRoomId,
      polygonUndo,
      polygonRedo,
      resetClearAllGuard,
      clearAllQuickModeInflight,
      scheduleNextLiveSnapshotPoll,
      scheduleStageViewportLifecycle,
      syncDashboardZoneVisibility,
      syncMobileStickyOffsets,
      runOrientationStateRegression,
      runNavigationStateRegression,
      runMobileProjectionVisibilityGuard,
      validateViewNavigationVisibility,
      shouldSuppressRapidTap,
      recordTriggerIntent,
      setDashboardZone,
      upsertGlobalAnimation,
    } = ctx;

    roomOverlay.addEventListener("pointermove", (event) => {
      if (state.panMode.active) {
        if (state.panMode.pointerId !== event.pointerId) {
          return;
        }
        const deltaX = event.clientX - state.panMode.startClientX;
        const deltaY = event.clientY - state.panMode.startClientY;
        scheduleZoomUpdate({
          panX: state.panMode.startPanX + deltaX,
          panY: state.panMode.startPanY + deltaY,
        });
        return;
      }
      if (state.shipPolygonEditor.dragVertexIndex !== null && state.uiView === "settings") {
        if (!arePlayAreaVerticesEditable()) {
          finishShipPolygonVertexDrag(event, { cancel: true });
          return;
        }
        if (state.shipPolygonEditor.dragPointerId !== event.pointerId) {
          return;
        }
        const boardId = state.shipPolygonEditor.dragBoardId;
        const points = getShipPolygonPoints(boardId);
        // Previous clamp pinned `pointer` to [0,1]
        // BEFORE applying the grab offset — but that still let the
        // vertex land at `boundary - offset` when the pointer left the
        // board. Result: vertex floats just INSIDE the edge instead of
        // hugging it. Switch strategy — use the grab offset only while
        // the pointer is inside the board; once the pointer exits on
        // either axis, drop the offset for that axis and pin the
        // vertex directly to the board edge.
        const [pointerXRaw, pointerYRaw] = getNormalizedOverlayPoint(event);
        const offX = state.shipPolygonEditor.dragVertexOffsetX || 0;
        const offY = state.shipPolygonEditor.dragVertexOffsetY || 0;
        const outsideX = pointerXRaw <= 0 || pointerXRaw >= 1;
        const outsideY = pointerYRaw <= 0 || pointerYRaw >= 1;
        const nextX = clampDisplayNormalizedCoordinate(
          outsideX ? pointerXRaw : pointerXRaw + offX,
        );
        const nextY = clampDisplayNormalizedCoordinate(
          outsideY ? pointerYRaw : pointerYRaw + offY,
        );
        points[state.shipPolygonEditor.dragVertexIndex] = [nextX, nextY];
        setShipPolygonPoints(boardId, points);
        state.shipPolygonEditor.dragMoved = true;
        const shipRaw = getShipPolygonPoints(boardId);
        const shipOverlay = shipRaw.map(([x, y]) => [x * 1000, y * 1000]);
        applyIncrementalShipDrag(state.shipPolygonEditor.dragDomRefs, shipOverlay);
        syncShipPolygonEditorStatus();
        return;
      }
      maybePromotePendingPolygonAreaDrag(event);
      if (state.polygonEditor.dragAreaPointerId !== null && state.uiView === "settings") {
        if (!areRoomVerticesEditable()) {
          finishPolygonAreaDrag(event, { cancel: true });
          return;
        }
        if (state.polygonEditor.dragAreaPointerId !== event.pointerId) {
          return;
        }
        const roomId = state.polygonEditor.dragAreaRoomId;
        const boardId = state.polygonEditor.dragAreaBoardId;
        const startPoints = state.polygonEditor.dragAreaStartPoints;
        const startPointer = state.polygonEditor.dragAreaStartPointerPoint;
        if (!roomId || !boardId || !Array.isArray(startPoints) || !Array.isArray(startPointer)) {
          return;
        }
        const [currentX, currentY] = getNormalizedOverlayPoint(event);
        const [startX, startY] = startPointer;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        const moved = Math.hypot(deltaX, deltaY) >= 0.0005;
        const shifted = startPoints.map(([x, y]) => [
          clampRoomAbsoluteCoordinate(x + deltaX),
          clampRoomAbsoluteCoordinate(y + deltaY),
        ]);
        setSpecialPolygonPoints(boardId, roomId, shifted);
        state.polygonEditor.dragAreaMoved = state.polygonEditor.dragAreaMoved || moved;
        const areaBoard = getBoard(boardId);
        const areaRoom = areaBoard?.rooms?.find((entry) => entry.id === roomId);
        if (areaRoom) {
          applyIncrementalRoomDrag(
            state.polygonEditor.dragAreaDomRefs,
            getRoomPoints(areaRoom, boardId),
          );
        }
        syncPolygonEditorStatus();
        return;
      }
      if (state.polygonEditor.dragVertexIndex === null || state.uiView !== "settings") {
        return;
      }
      if (!areRoomVerticesEditable()) {
        finishPolygonVertexDrag(event, { cancel: true });
        return;
      }
      if (state.polygonEditor.dragPointerId !== event.pointerId) {
        return;
      }
      const roomId = state.polygonEditor.dragRoomId;
      const boardId = state.polygonEditor.dragBoardId;
      if (!roomId) {
        return;
      }
      const vertexBoard = getBoard(boardId);
      const vertexRoom = vertexBoard?.rooms?.find((entry) => entry.id === roomId);
      if (!vertexRoom) {
        return;
      }
      // Same boundary-pin strategy as ship polygon
      // — drop the grab offset on any axis where the pointer leaves
      // the board so the vertex hugs the edge instead of floating
      // at `edge - offset` when the cursor exits.
      const [pointerXRaw, pointerYRaw] = getNormalizedOverlayPoint(event);
      const rOffX = state.polygonEditor.dragVertexOffsetX || 0;
      const rOffY = state.polygonEditor.dragVertexOffsetY || 0;
      const rOutsideX = pointerXRaw <= 0 || pointerXRaw >= 1;
      const rOutsideY = pointerYRaw <= 0 || pointerYRaw >= 1;
      const nextDisplayX = clampDisplayNormalizedCoordinate(
        rOutsideX ? pointerXRaw : pointerXRaw + rOffX,
      );
      const nextDisplayY = clampDisplayNormalizedCoordinate(
        rOutsideY ? pointerYRaw : pointerYRaw + rOffY,
      );
      const [rawNextX, rawNextY] = projectDisplayNormalizedToRoomRaw(
        nextDisplayX, nextDisplayY, vertexRoom, boardId,
      );
      const points = getSpecialPolygonPoints(boardId, roomId);
      points[state.polygonEditor.dragVertexIndex] = [rawNextX, rawNextY];
      setSpecialPolygonPoints(boardId, roomId, points);
      state.polygonEditor.dragMoved = true;
      applyIncrementalRoomDrag(
        state.polygonEditor.dragDomRefs,
        getRoomPoints(vertexRoom, boardId),
      );
      syncPolygonEditorStatus();
    });

    roomOverlay.addEventListener("pointerup", (event) => {
      if (state.panMode.active && state.panMode.pointerId === event.pointerId) {
        endPanMode(event, { canceled: false });
        return;
      }
      if (
        state.shipPolygonEditor.dragVertexIndex !== null &&
        state.shipPolygonEditor.dragPointerId === event.pointerId
      ) {
        finishShipPolygonVertexDrag(event, { cancel: false });
        return;
      }
      if (
        state.polygonEditor.dragAreaPointerId !== null &&
        state.polygonEditor.dragAreaPointerId === event.pointerId
      ) {
        finishPolygonAreaDrag(event, { cancel: false });
        preserveRoomSelectionAfterPointerLifecycle();
        return;
      }
      if (state.polygonEditor.pendingAreaPointerId === event.pointerId) {
        clearPendingPolygonAreaDragSession();
        preserveRoomSelectionAfterPointerLifecycle();
        return;
      }
      if (
        state.polygonEditor.dragVertexIndex === null ||
        state.polygonEditor.dragPointerId !== event.pointerId
      ) {
        return;
      }
      finishPolygonVertexDrag(event, { cancel: false });
      preserveRoomSelectionAfterPointerLifecycle();
    });

    roomOverlay.addEventListener("pointercancel", (event) => {
      if (state.panMode.active && state.panMode.pointerId === event.pointerId) {
        endPanMode(event, { canceled: true });
        return;
      }
      if (state.shipPolygonEditor.dragPointerId === event.pointerId) {
        finishShipPolygonVertexDrag(event, { cancel: true });
        return;
      }
      if (state.polygonEditor.dragAreaPointerId === event.pointerId) {
        finishPolygonAreaDrag(event, { cancel: true });
        return;
      }
      if (state.polygonEditor.pendingAreaPointerId === event.pointerId) {
        clearPendingPolygonAreaDragSession();
        return;
      }
      if (state.polygonEditor.dragPointerId !== event.pointerId) {
        return;
      }
      finishPolygonVertexDrag(event, { cancel: true });
    });

    roomOverlay.addEventListener("pointerdown", (event) => {
      if (!canStartPanModeFromEvent(event)) {
        return;
      }
      const pointerType = String(event.pointerType || "").toLowerCase();
      const isTouchPointer = pointerType === "touch" || pointerType === "pen";
      clearPendingPolygonAreaDragSession();
      if (state.shipPolygonEditor.dragVertexIndex !== null) {
        finishShipPolygonVertexDrag(event, { cancel: true });
      }
      if (state.polygonEditor.dragAreaPointerId !== null) {
        finishPolygonAreaDrag(event, { cancel: true });
      }
      if (state.polygonEditor.dragVertexIndex !== null) {
        finishPolygonVertexDrag(event, { cancel: true });
      }
      event.preventDefault();
      event.stopPropagation();
      const trigger = isTouchPointer
        ? "touch"
        : event.button === 1
          ? "middle"
          : "space";
      startPanMode(event, trigger);
    });

    roomOverlay.addEventListener("click", (event) => {
      if (performance.now() < (state.polygonEditor.suppressRoomClickUntil || 0)) {
        return;
      }
      if (event.target !== roomOverlay) {
        return;
      }
      if (isPanArbitrating()) {
        return;
      }
      if (
        state.polygonEditor.dragVertexIndex !== null ||
        state.polygonEditor.dragAreaPointerId !== null ||
        state.shipPolygonEditor.dragVertexIndex !== null ||
        state.polygonEditor.pendingAreaPointerId !== null
      ) {
        return;
      }
      clearSelectedRoomSelection("Room management: selection cleared (empty board click)");
    });

    document.addEventListener("keydown", (event) => {
      if (state.uiView === "settings" && outputRole === OUTPUT_ROLE_CONTROL && !event.defaultPrevented) {
        const key = String(event.key || "").toLowerCase();
        const modifierPressed = event.ctrlKey || event.metaKey;
        const typingTarget = isTypingShortcutTarget(event.target);
        const playAreaContext = isPlayAreaShortcutContext(event.target);
        // Ctrl+Z = undo, Ctrl+Shift+Z = redo. Works in any Settings subtab —
        // the undo is global to polygon/play-area edits regardless of which
        // subtab is currently open.
        if (!typingTarget && modifierPressed && !event.altKey && key === "z") {
          event.preventDefault();
          if (event.shiftKey) {
            polygonRedo();
          } else {
            polygonUndo();
          }
          return;
        }
        if (!typingTarget && !playAreaContext && modifierPressed && !event.altKey && !event.shiftKey && key === "c") {
          event.preventDefault();
          copySelectedRoomToClipboard();
          return;
        }
        if (!typingTarget && !playAreaContext && modifierPressed && !event.altKey && !event.shiftKey && key === "v") {
          event.preventDefault();
          pasteRoomFromClipboard();
          return;
        }
        if (
          !typingTarget &&
          !modifierPressed &&
          !event.altKey &&
          (key === "delete" || event.code === "Delete")
        ) {
          // Route DELETE by `state.lastPolygonFocus`
          // so whichever polygon the user most recently clicked wins.
          // Fall back to the legacy "whoever has the active flag"
          // checks when the focus marker isn't set yet (fresh session).
          const lastFocus = state.lastPolygonFocus;
          const shipPts = state.shipPolygonsByBoard?.[state.boardId];
          const playAreaVisible = state.polygonEditor.playAreaVerticesVisible !== false;
          const shipIndex = state.shipPolygonEditor?.selectedVertexIndex;
          const canDeleteShipVertex =
            playAreaVisible
            && Number.isInteger(shipIndex)
            && Array.isArray(shipPts)
            && shipPts.length > 3;
          const roomVertexActive =
            state.polygonEditor.vertexSelectionActive
            && areRoomVerticesEditable()
            && Boolean(getActivePolygonRoomId(state.boardId));

          if (lastFocus === "ship" && canDeleteShipVertex) {
            event.preventDefault();
            const button = document.querySelector("#ship-polygon-delete-vertex");
            if (button && !button.disabled) button.click();
            return;
          }
          if (lastFocus === "room" && roomVertexActive) {
            event.preventDefault();
            deleteSelectedPolygonVertex();
            return;
          }
          // No explicit focus marker — legacy fallbacks.
          if (roomVertexActive) {
            event.preventDefault();
            deleteSelectedPolygonVertex();
            return;
          }
          if (canDeleteShipVertex) {
            event.preventDefault();
            const button = document.querySelector("#ship-polygon-delete-vertex");
            if (button && !button.disabled) button.click();
            return;
          }
          if (!playAreaContext) {
            event.preventDefault();
            deleteSelectedRoom();
          }
          return;
        }
      }
      if (event.code === "Space") {
        if (event.repeat) {
          return;
        }
        state.panMode.spacePressed = true;
        if (state.polygonEditor.dragVertexIndex !== null) {
          finishPolygonVertexDrag(null, { cancel: true });
        }
        if (state.polygonEditor.dragAreaPointerId !== null) {
          finishPolygonAreaDrag(null, { cancel: true });
        }
        if (state.polygonEditor.pendingAreaPointerId !== null) {
          clearPendingPolygonAreaDragSession();
        }
        if (state.shipPolygonEditor.dragVertexIndex !== null) {
          finishShipPolygonVertexDrag(null, { cancel: true });
        }
        setPanCursorState();
        return;
      }
      if (event.key === "Escape") {
        if (state.polygonEditor.dragVertexIndex !== null) {
          finishPolygonVertexDrag(null, { cancel: true });
          return;
        }
        if (state.polygonEditor.dragAreaPointerId !== null) {
          finishPolygonAreaDrag(null, { cancel: true });
          return;
        }
        if (state.shipPolygonEditor.dragVertexIndex !== null) {
          finishShipPolygonVertexDrag(null, { cancel: true });
        }
      }
    });

    document.addEventListener("keyup", (event) => {
      if (event.code !== "Space") {
        return;
      }
      state.panMode.spacePressed = false;
      if (state.panMode.active && state.panMode.trigger === "space") {
        endPanMode(null, { canceled: false });
      } else {
        setPanCursorState();
      }
    });

    window.addEventListener("blur", () => {
      state.panMode.spacePressed = false;
      if (state.shipPolygonEditor.dragVertexIndex !== null) {
        finishShipPolygonVertexDrag(null, { cancel: true });
      }
      if (state.polygonEditor.dragAreaPointerId !== null) {
        finishPolygonAreaDrag(null, { cancel: true });
      }
      if (state.polygonEditor.pendingAreaPointerId !== null) {
        clearPendingPolygonAreaDragSession();
      }
      endPanMode(null, { canceled: true });
      resetClearAllGuard();
      clearAllQuickModeInflight();
      setPanCursorState();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        liveSync.preferFastPollingUntil = Date.now() + 2000;
        scheduleNextLiveSnapshotPoll(0);
        return;
      }
      scheduleNextLiveSnapshotPoll();
    });

    window.addEventListener("orientationchange", () => {
      scheduleStageViewportLifecycle("orientationchange");
      syncDashboardZoneVisibility();
      syncMobileStickyOffsets();
      // CSS layout may not have settled yet when orientationchange
      // fires. Schedule additional recomputes after a delay so the canvas
      // picks up the final stage dimensions (fixes outside animation scaling).
      setTimeout(() => {
        scheduleStageViewportLifecycle("orientationchange-settled-200");
        syncMobileStickyOffsets();
      }, 200);
      setTimeout(() => {
        scheduleStageViewportLifecycle("orientationchange-settled-600");
        syncMobileStickyOffsets();
      }, 600);
      const orientationOk = runOrientationStateRegression();
      const navigationOk = runNavigationStateRegression();
      const projectionOk = runMobileProjectionVisibilityGuard({ context: "orientationchange" });
      const ok = orientationOk && navigationOk && projectionOk;
      triggerFeedback.textContent = ok
        ? "Status: Orientation changed, UI state/navigation/board visibility stable"
        : "Status: Orientation guard detected drift in state, navigation, or board visibility";
    });

    window.addEventListener("resize", () => {
      scheduleStageViewportLifecycle("window-resize");
    });

    document.addEventListener("fullscreenchange", () => {
      scheduleStageViewportLifecycle("fullscreenchange");
    });

    window.addEventListener(
      "scroll",
      () => {
        syncMobileStickyOffsets();
        const navigationOk = validateViewNavigationVisibility({ silent: true, context: "scroll" });
        const projectionOk = runMobileProjectionVisibilityGuard({ silent: true, context: "scroll" });
        if (!navigationOk || !projectionOk) {
          triggerFeedback.textContent =
            "Status: Scroll guard detected navigation/board overlap in mobile layout";
        }
      },
      { passive: true },
    );

    document.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("button[data-global]") : null;
      if (!button) {
        return;
      }
      const type = button.dataset.global;
      if (shouldSuppressRapidTap(`global-${type}`)) {
        return;
      }
      recordTriggerIntent();
      setDashboardZone("trigger");
      const loopUntilStopped = Boolean(dashboardGlobalLoopUntilStopInput?.checked);
      const playSound = dashboardGlobalPlaySoundInput ? dashboardGlobalPlaySoundInput.checked : true;
      upsertGlobalAnimation(type, GLOBAL_ONE_SHOT_DURATION_SEC, { loopUntilStopped, playSound });
    });
  }

  window.TT_BEAMER_RUNTIME_WIRE_OVERLAY_WINDOW_BINDERS = {
    wireOverlayWindowBinders,
  };
})();
