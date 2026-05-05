// roomOverlay pointer + document/window event binders.
//
// Wires the polygon drag pointer lifecycle on roomOverlay (pointermove/
// up/cancel/down/click), document keyboard shortcuts (Ctrl+C/V, Delete,
// Space, Escape for drag cancel), the global button-click delegation
// handler, and window-level blur/visibility/orientation/resize/
// fullscreen/scroll reactions. Exposed as wireOverlayWindowBinders(ctx).
//
// Phase 24 W3.6-C5a: the original 525-line `wireOverlayWindowBinders`
// function body has been decomposed into 14 named helpers per topical
// listener boundary. Each helper takes `ctx` and re-destructures only
// the vars it needs; the body of each `addEventListener` callback is
// byte-identical with the pre-W3.6 IIFE. The outer
// `wireOverlayWindowBinders` shell drops to a destructure-free
// dispatch sequence (~16 lines).
(() => {
  function _wireOverlayPointerMove(ctx) {
    const {
      state,
      roomOverlay,
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
      setRoomPolygonPoints,
      getRoomPolygonPoints,
      getBoard,
      getRoomPoints,
      projectDisplayNormalizedToRoomRaw,
      finishShipPolygonVertexDrag,
      finishPolygonAreaDrag,
      finishPolygonVertexDrag,
      scheduleZoomUpdate,
    } = ctx;

    // Gaming mice can fire pointermove at 1000Hz+. The drag handler
     // does real work each call (state mutation + SVG attribute writes
     // + status text rebuild) and was the source of the CPU/fan spike
     // the user noticed during polygon editing. Coalesce per
     // animation frame: store the latest event, schedule one rAF;
     // browser repaints at 60–120Hz anyway so dropping intermediate
     // events is invisible while the CPU bill drops by ~10×.
    let pendingMoveEvent = null;
    let pendingMoveRafId = null;
    function flushPendingMoveEvent() {
      pendingMoveRafId = null;
      const event = pendingMoveEvent;
      pendingMoveEvent = null;
      if (event) processMoveEvent(event);
    }

    roomOverlay.addEventListener("pointermove", (event) => {
      pendingMoveEvent = event;
      if (pendingMoveRafId === null) {
        pendingMoveRafId = window.requestAnimationFrame(flushPendingMoveEvent);
      }
    });

    function processMoveEvent(event) {
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
        applyIncrementalShipDrag(
          state.shipPolygonEditor.dragDomRefs,
          shipOverlay,
          state.shipPolygonEditor.dragVertexIndex,
        );
        // Status text shows vertex-count + active-index + handle-% —
        // none of those change while dragging a single vertex. The
        // syncShipPolygonEditorStatus call still fires on drag end
        // and on selection changes, which is when the line actually
        // needs to refresh.
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
        setRoomPolygonPoints(boardId, roomId, shifted);
        state.polygonEditor.dragAreaMoved = state.polygonEditor.dragAreaMoved || moved;
        const areaBoard = getBoard(boardId);
        const areaRoom = areaBoard?.rooms?.find((entry) => entry.id === roomId);
        if (areaRoom) {
          applyIncrementalRoomDrag(
            state.polygonEditor.dragAreaDomRefs,
            getRoomPoints(areaRoom, boardId),
          );
        }
        // Status line content doesn't change during a drag — see
        // ship-vertex branch comment above.
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
      const points = getRoomPolygonPoints(boardId, roomId);
      points[state.polygonEditor.dragVertexIndex] = [rawNextX, rawNextY];
      setRoomPolygonPoints(boardId, roomId, points);
      state.polygonEditor.dragMoved = true;
      applyIncrementalRoomDrag(
        state.polygonEditor.dragDomRefs,
        getRoomPoints(vertexRoom, boardId),
        state.polygonEditor.dragVertexIndex,
      );
      // Status line content doesn't change during a drag.
    }
  }

  function _wireOverlayPointerUp(ctx) {
    const {
      state,
      roomOverlay,
      endPanMode,
      finishShipPolygonVertexDrag,
      finishPolygonAreaDrag,
      finishPolygonVertexDrag,
      preserveRoomSelectionAfterPointerLifecycle,
      clearPendingPolygonAreaDragSession,
    } = ctx;

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
  }

  function _wireOverlayPointerCancel(ctx) {
    const {
      state,
      roomOverlay,
      endPanMode,
      finishShipPolygonVertexDrag,
      finishPolygonAreaDrag,
      finishPolygonVertexDrag,
      clearPendingPolygonAreaDragSession,
    } = ctx;

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
  }

  function _wireOverlayPointerDown(ctx) {
    const {
      state,
      roomOverlay,
      canStartPanModeFromEvent,
      startPanMode,
      finishShipPolygonVertexDrag,
      finishPolygonAreaDrag,
      finishPolygonVertexDrag,
      clearPendingPolygonAreaDragSession,
    } = ctx;

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
  }

  function _wireOverlayPointerClick(ctx) {
    const {
      state,
      roomOverlay,
      isPanArbitrating,
      clearSelectedRoomSelection,
    } = ctx;

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
  }

  function _wireOverlayKeydownShortcut(ctx) {
    const {
      state,
      outputRole,
      OUTPUT_ROLE_CONTROL,
      areRoomVerticesEditable,
      isTypingShortcutTarget,
      isPlayAreaShortcutContext,
      copySelectedRoomToClipboard,
      pasteRoomFromClipboard,
      deleteSelectedPolygonVertex,
      deleteSelectedRoom,
      getActivePolygonRoomId,
      polygonUndo,
      polygonRedo,
      finishShipPolygonVertexDrag,
      finishPolygonAreaDrag,
      finishPolygonVertexDrag,
      clearPendingPolygonAreaDragSession,
      setPanCursorState,
    } = ctx;

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
          // Room is focused but no vertex is active → delete the
          // whole room polygon. This branch matches the user's
          // expectation: "select a room, press DEL → polygon gone".
          // Has to come BEFORE the canDeleteShipVertex fallback,
          // otherwise a non-zero ship-vertex index intercepts every
          // DEL keystroke even when the user hasn't touched the play
          // area lately. (Phase 25 user feedback.)
          if (lastFocus === "room" && !playAreaContext) {
            event.preventDefault();
            deleteSelectedRoom();
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
  }

  function _wireOverlayKeyupShortcut(ctx) {
    const { state, endPanMode, setPanCursorState } = ctx;

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
  }

  function _wireOverlayWindowBlur(ctx) {
    const {
      state,
      finishShipPolygonVertexDrag,
      finishPolygonAreaDrag,
      clearPendingPolygonAreaDragSession,
      endPanMode,
      resetClearAllGuard,
      clearAllQuickModeInflight,
      setPanCursorState,
    } = ctx;

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
  }

  function _wireOverlayVisibilityChange(ctx) {
    const { liveSync, scheduleNextLiveSnapshotPoll } = ctx;

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        liveSync.preferFastPollingUntil = Date.now() + 2000;
        scheduleNextLiveSnapshotPoll(0);
        return;
      }
      scheduleNextLiveSnapshotPoll();
    });
  }

  function _wireOverlayOrientationChange(ctx) {
    const {
      triggerFeedback,
      scheduleStageViewportLifecycle,
      syncDashboardZoneVisibility,
      syncMobileStickyOffsets,
      runOrientationStateRegression,
      runNavigationStateRegression,
      runMobileProjectionVisibilityGuard,
    } = ctx;

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
  }

  function _wireOverlayResize(ctx) {
    const { scheduleStageViewportLifecycle } = ctx;

    window.addEventListener("resize", () => {
      scheduleStageViewportLifecycle("window-resize");
    });
  }

  function _wireOverlayFullscreenChange(ctx) {
    const { scheduleStageViewportLifecycle } = ctx;

    document.addEventListener("fullscreenchange", () => {
      scheduleStageViewportLifecycle("fullscreenchange");
    });
  }

  function _wireOverlayScroll(ctx) {
    const {
      triggerFeedback,
      syncMobileStickyOffsets,
      validateViewNavigationVisibility,
      runMobileProjectionVisibilityGuard,
    } = ctx;

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
  }

  function _wireOverlayGlobalButtonClick(ctx) {
    const {
      dashboardGlobalLoopUntilStopInput,
      dashboardGlobalPlaySoundInput,
      GLOBAL_ONE_SHOT_DURATION_SEC,
      shouldSuppressRapidTap,
      recordTriggerIntent,
      setDashboardZone,
      upsertGlobalAnimation,
    } = ctx;

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

  function wireOverlayWindowBinders(ctx) {
    _wireOverlayPointerMove(ctx);
    _wireOverlayPointerUp(ctx);
    _wireOverlayPointerCancel(ctx);
    _wireOverlayPointerDown(ctx);
    _wireOverlayPointerClick(ctx);
    _wireOverlayKeydownShortcut(ctx);
    _wireOverlayKeyupShortcut(ctx);
    _wireOverlayWindowBlur(ctx);
    _wireOverlayVisibilityChange(ctx);
    _wireOverlayOrientationChange(ctx);
    _wireOverlayResize(ctx);
    _wireOverlayFullscreenChange(ctx);
    _wireOverlayScroll(ctx);
    _wireOverlayGlobalButtonClick(ctx);
  }

  window.TT_BEAMER_RUNTIME_WIRE_OVERLAY_WINDOW_BINDERS = {
    wireOverlayWindowBinders,
  };
})();
