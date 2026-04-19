// Phase 14-2: stage wheel + touch gesture state machine binders.
//
// Wires the stage wheel listener and the Phase 13-HF4 centralised touch
// gesture state machine (idle/tentative/panning/pinching/drag) with
// capture-phase pointerdown/move/up/cancel + contextmenu blocker.
// Exposed as wireStageGestureBinders(ctx).
(() => {
  function wireStageGestureBinders(ctx) {
    const {
      state,
      liveSync,
      stage,
      roomOverlay,
      getBoardZoom,
      applyZoomScaleAroundClientPoint,
      clampBoardZoomScale,
      canStartPanModeFromEvent,
      startPanMode,
      endPanMode,
      setPanCursorState,
      refreshStageGeometryCache,
      scheduleNextLiveSnapshotPoll,
      setTouchGestureActive,
      finishShipPolygonVertexDrag,
      finishPolygonAreaDrag,
      finishPolygonVertexDrag,
      beginShipPolygonVertexDrag,
      beginPolygonVertexDrag,
      beginPendingPolygonAreaDrag,
      setActivePolygonRoomId,
      syncPolygonRoomSelection,
      syncPolygonVertexSelect,
      syncPolygonEdgeSelect,
      syncPolygonEditorPanel,
      syncRoomPanelFromSelection,
      renderRoomOverlay,
      outputRole,
      OUTPUT_ROLE_FINAL,
    } = ctx;

    if (!stage) {
      return;
    }
    // /output (FINAL) must not be zoom-/pan-interactive — that view is
    // driven by the projection-mapping align system, not by the dashboard
    // zoom/pan controls.
    if (outputRole === OUTPUT_ROLE_FINAL) {
      return;
    }

    stage.addEventListener(
      "wheel",
      (event) => {
        if (!event.target || !stage.contains(event.target)) return;
        event.preventDefault();
        const current = getBoardZoom(state.boardId);
        const step = Math.exp(-event.deltaY * 0.0009);
        const nextScale = current.scale * step;
        applyZoomScaleAroundClientPoint(
          nextScale,
          event.clientX,
          event.clientY,
          `Board zoom wheel -> ${Math.round(clampBoardZoomScale(nextScale) * 100)}%`,
        );
      },
      { passive: false },
    );

    const TOUCH_HOLD_MS = 350;
    const TOUCH_MOVE_THRESHOLD_PX = 12;

    const touchGesture = {
      mode: "idle",
      primaryPointerId: null,
      primaryStartClientX: 0,
      primaryStartClientY: 0,
      primaryHitKind: "empty",
      primaryHitNode: null,
      primaryHitIndex: -1,
      primaryHitRoomId: null,
      holdTimerId: null,
      pinchPointers: new Map(),
      pinchLastDistance: 0,
    };

    function classifyTouchHitTarget(target) {
      if (!target?.closest) return { kind: "empty", node: null, index: -1, roomId: null };
      const node = target.closest(
        ".ship-polygon-vertex-hit-target, .ship-polygon-edge-hit-target, "
        + ".polygon-vertex-hit-target, .polygon-edge-hit-target, "
        + "polygon.room-zone",
      );
      if (!node) return { kind: "empty", node: null, index: -1, roomId: null };
      const indexAttr = Number(node.dataset?.vertexIndex ?? node.dataset?.edgeIndex);
      const index = Number.isFinite(indexAttr) ? indexAttr : -1;
      const roomId = node.dataset?.roomId ?? null;
      if (node.classList.contains("ship-polygon-vertex-hit-target")) {
        return { kind: "ship-vertex", node, index, roomId: null };
      }
      if (node.classList.contains("ship-polygon-edge-hit-target")) {
        return { kind: "ship-edge", node, index, roomId: null };
      }
      if (node.classList.contains("polygon-vertex-hit-target")) {
        return { kind: "room-vertex", node, index, roomId };
      }
      if (node.classList.contains("polygon-edge-hit-target")) {
        return { kind: "room-edge", node, index, roomId };
      }
      if (node.tagName === "polygon" && node.classList.contains("room-zone")) {
        return { kind: "room-area", node, index: -1, roomId: node.dataset?.roomId ?? null };
      }
      return { kind: "empty", node: null, index: -1, roomId: null };
    }

    function cancelActiveSingleFingerDragsForPinchTakeover() {
      try {
        if (state?.shipPolygonEditor?.dragVertexIndex !== null) {
          finishShipPolygonVertexDrag(null, { cancel: true });
        }
      } catch { /* best effort */ }
      try {
        if (state?.polygonEditor?.dragAreaPointerId !== null) {
          finishPolygonAreaDrag(null, { cancel: true });
        }
      } catch { /* best effort */ }
      try {
        if (state?.polygonEditor?.dragVertexIndex !== null) {
          finishPolygonVertexDrag(null, { cancel: true });
        }
      } catch { /* best effort */ }
      try {
        if (state?.panMode?.active === true) {
          endPanMode(null, { canceled: true });
        }
      } catch { /* best effort */ }
    }

    function touchGesturePinchDistance() {
      const pts = [...touchGesture.pinchPointers.values()];
      if (pts.length !== 2) return 0;
      return Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
    }
    function touchGesturePinchMidpoint() {
      const pts = [...touchGesture.pinchPointers.values()];
      if (pts.length !== 2) return { clientX: 0, clientY: 0 };
      return {
        clientX: (pts[0].clientX + pts[1].clientX) / 2,
        clientY: (pts[0].clientY + pts[1].clientY) / 2,
      };
    }

    function clearTouchHoldTimer() {
      if (touchGesture.holdTimerId !== null) {
        window.clearTimeout(touchGesture.holdTimerId);
        touchGesture.holdTimerId = null;
      }
    }

    function resetTouchGestureToIdle() {
      clearTouchHoldTimer();
      touchGesture.mode = "idle";
      touchGesture.primaryPointerId = null;
      touchGesture.primaryHitKind = "empty";
      touchGesture.primaryHitNode = null;
      touchGesture.primaryHitIndex = -1;
      touchGesture.primaryHitRoomId = null;
      touchGesture.pinchPointers.clear();
      touchGesture.pinchLastDistance = 0;
    }

    function startTouchPanFromPrimary() {
      if (touchGesture.mode === "panning") return;
      // Phase 18: now activate heavy-interaction pause (confirmed pan gesture)
      setTouchGestureActive(true);
      const zoom = getBoardZoom(state.boardId);
      if (zoom.scale <= 1 && state.uiView !== "settings") {
        // fallthrough
      }
      const syntheticEvent = {
        clientX: touchGesture.primaryStartClientX,
        clientY: touchGesture.primaryStartClientY,
        pointerId: touchGesture.primaryPointerId,
        pointerType: "touch",
        button: 0,
      };
      if (canStartPanModeFromEvent({ button: 1, pointerType: "touch" })) {
        try { roomOverlay.setPointerCapture(touchGesture.primaryPointerId); } catch { /* best effort */ }
        startPanMode(syntheticEvent, "touch");
      }
      touchGesture.mode = "panning";
    }

    function commitTouchHoldDrag() {
      const kind = touchGesture.primaryHitKind;
      if (kind === "empty") {
        startTouchPanFromPrimary();
        return;
      }
      const syntheticEvent = {
        clientX: touchGesture.primaryStartClientX,
        clientY: touchGesture.primaryStartClientY,
        pointerId: touchGesture.primaryPointerId,
        pointerType: "touch",
        button: 0,
        preventDefault() {},
        stopPropagation() {},
      };
      try {
        if (kind === "ship-vertex" && touchGesture.primaryHitIndex >= 0) {
          beginShipPolygonVertexDrag(syntheticEvent, touchGesture.primaryHitIndex);
        } else if (kind === "room-vertex" && touchGesture.primaryHitIndex >= 0 && touchGesture.primaryHitRoomId) {
          const roomId = touchGesture.primaryHitRoomId;
          state.selectedRoomId = roomId;
          state.selectedRoomByBoard[state.boardId] = roomId;
          setActivePolygonRoomId(state.boardId, roomId);
          state.polygonEditor.selectedVertexIndex = touchGesture.primaryHitIndex;
          state.polygonEditor.selectedEdgeIndex = touchGesture.primaryHitIndex;
          state.polygonEditor.vertexSelectionActive = true;
          syncPolygonRoomSelection(roomId);
          syncPolygonVertexSelect(roomId);
          syncPolygonEdgeSelect(roomId);
          syncPolygonEditorPanel();
          syncRoomPanelFromSelection({ preserveDraftState: true });
          renderRoomOverlay();
          beginPolygonVertexDrag(syntheticEvent, roomId, touchGesture.primaryHitIndex);
        } else if (kind === "room-area" && touchGesture.primaryHitRoomId) {
          state.selectedRoomId = touchGesture.primaryHitRoomId;
          state.selectedRoomByBoard[state.boardId] = touchGesture.primaryHitRoomId;
          syncPolygonRoomSelection(touchGesture.primaryHitRoomId);
          syncPolygonEditorPanel();
          syncRoomPanelFromSelection({ preserveDraftState: true });
          renderRoomOverlay();
          beginPendingPolygonAreaDrag(syntheticEvent, touchGesture.primaryHitRoomId);
        } else {
          startTouchPanFromPrimary();
          return;
        }
        touchGesture.mode = "drag";
      } catch (error) {
        console.warn("[touch-gesture] commit drag failed:", error?.message || error);
        startTouchPanFromPrimary();
      }
    }

    stage.addEventListener(
      "pointerdown",
      (event) => {
        if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
        event.stopImmediatePropagation();
        event.preventDefault?.();

        if (touchGesture.pinchPointers.size === 1 && touchGesture.primaryPointerId !== event.pointerId) {
          clearTouchHoldTimer();
          cancelActiveSingleFingerDragsForPinchTakeover();
          touchGesture.pinchPointers.set(event.pointerId, {
            clientX: event.clientX,
            clientY: event.clientY,
          });
          touchGesture.pinchLastDistance = touchGesturePinchDistance();
          touchGesture.mode = "pinching";
          // Phase 18: activate heavy-interaction pause (confirmed pinch gesture)
          setTouchGestureActive(true);
          return;
        }

        if (touchGesture.mode === "idle" || touchGesture.mode === "panning") {
          resetTouchGestureToIdle();
          refreshStageGeometryCache();
          // Phase 18: delay setTouchGestureActive(true) until the gesture is
          // confirmed as pan or pinch. Setting it on tentative pointerdown
          // causes a visible animation flicker on every quick tap (the draw
          // loop skips rendering during "heavy interaction").
          stage.classList.add("is-touch-gesture");
          try {
            if (liveSync?.pollTimerId !== null && liveSync?.pollTimerId !== undefined) {
              window.clearTimeout(liveSync.pollTimerId);
              liveSync.pollTimerId = null;
            }
          } catch { /* best effort */ }
          touchGesture.mode = "tentative";
          touchGesture.primaryPointerId = event.pointerId;
          touchGesture.primaryStartClientX = event.clientX;
          touchGesture.primaryStartClientY = event.clientY;
          const hit = classifyTouchHitTarget(event.target);
          touchGesture.primaryHitKind = hit.kind;
          touchGesture.primaryHitNode = hit.node;
          touchGesture.primaryHitIndex = hit.index;
          touchGesture.primaryHitRoomId = hit.roomId;
          touchGesture.pinchPointers.set(event.pointerId, {
            clientX: event.clientX,
            clientY: event.clientY,
          });
          touchGesture.holdTimerId = window.setTimeout(() => {
            touchGesture.holdTimerId = null;
            if (touchGesture.mode !== "tentative") return;
            commitTouchHoldDrag();
          }, TOUCH_HOLD_MS);
        }
      },
      { capture: true },
    );

    stage.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
        if (!touchGesture.pinchPointers.has(event.pointerId)) return;
        touchGesture.pinchPointers.set(event.pointerId, {
          clientX: event.clientX,
          clientY: event.clientY,
        });

        if (touchGesture.mode === "pinching" && touchGesture.pinchPointers.size === 2) {
          const distance = touchGesturePinchDistance();
          if (touchGesture.pinchLastDistance <= 0) {
            touchGesture.pinchLastDistance = distance;
            return;
          }
          const ratio = distance / touchGesture.pinchLastDistance;
          if (!Number.isFinite(ratio) || ratio <= 0) return;
          touchGesture.pinchLastDistance = distance;
          const midpoint = touchGesturePinchMidpoint();
          const current = getBoardZoom(state.boardId);
          applyZoomScaleAroundClientPoint(
            current.scale * ratio,
            midpoint.clientX,
            midpoint.clientY,
            `Board zoom pinch -> ${Math.round(clampBoardZoomScale(current.scale * ratio) * 100)}%`,
          );
          return;
        }

        if (touchGesture.mode === "tentative" && event.pointerId === touchGesture.primaryPointerId) {
          const dx = event.clientX - touchGesture.primaryStartClientX;
          const dy = event.clientY - touchGesture.primaryStartClientY;
          if (Math.hypot(dx, dy) > TOUCH_MOVE_THRESHOLD_PX) {
            clearTouchHoldTimer();
            startTouchPanFromPrimary();
          }
        }
      },
      { capture: true },
    );

    function endTouchGestureForPointer(event) {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      touchGesture.pinchPointers.delete(event.pointerId);

      if (event.pointerId === touchGesture.primaryPointerId) {
        clearTouchHoldTimer();
        if (touchGesture.mode === "panning") {
          try { endPanMode(null, { canceled: false }); } catch { /* best effort */ }
        }
        touchGesture.primaryPointerId = null;
      }

      if (touchGesture.mode === "pinching" && touchGesture.pinchPointers.size < 2) {
        touchGesture.mode = "idle";
        touchGesture.pinchLastDistance = 0;
        touchGesture.pinchPointers.clear();
      }
      if (touchGesture.pinchPointers.size === 0) {
        resetTouchGestureToIdle();
        setTouchGestureActive(false);
        stage.classList.remove("is-touch-gesture");
        setPanCursorState();
        try { scheduleNextLiveSnapshotPoll(0); } catch { /* best effort */ }
      }
    }
    stage.addEventListener("pointerup", endTouchGestureForPointer, { capture: true });
    stage.addEventListener("pointercancel", endTouchGestureForPointer, { capture: true });

    stage.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
  }

  window.TT_BEAMER_RUNTIME_WIRE_STAGE_GESTURE_BINDERS = {
    wireStageGestureBinders,
  };
})();
