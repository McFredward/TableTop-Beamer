// viewport zoom + pan module.
//
// Owns the entire zoom/pan state machine: profile normalization,
// bounds clamping, zoom panel sync, pan mode state, rAF-coalesced
// zoom update writer, cursor-anchored zoom math, fit-to-room helper.
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;
  let pendingZoomUpdate = null;
  let pendingZoomFrameHandle = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function clampBoardZoomScale(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 1;
    return Math.max(ctx.BOARD_ZOOM_SCALE_MIN, Math.min(ctx.BOARD_ZOOM_SCALE_MAX, numeric));
  }

  function normalizeBoardZoomProfile(profile) {
    const scale = clampBoardZoomScale(Number(profile?.scale) || ctx.BOARD_ZOOM_DEFAULT.scale);
    return clampPanToBounds({
      scale,
      panX: Number(profile?.panX) || 0,
      panY: Number(profile?.panY) || 0,
    });
  }

  function getStagePanBounds(scale) {
    const stage = ctx.stage;
    const width = stage?.clientWidth || 0;
    const height = stage?.clientHeight || 0;
    // Always allow panning at any zoom level. The base overshoot
    // (40% of stage size) ensures the board can be pushed off-screen even
    // when fully zoomed out. At higher zoom, the normal zoom-based range
    // adds on top of the overshoot for full reachability.
    const baseOvershoot = Math.max(width, height) * 0.4;
    const zoomRange = Math.max(0, (width * (scale - 1)) / 2);
    const maxPanX = zoomRange + baseOvershoot;
    const zoomRangeY = Math.max(0, (height * (scale - 1)) / 2);
    const maxPanY = zoomRangeY + baseOvershoot;
    return { maxPanX, maxPanY };
  }

  function clampPanToBounds(profile) {
    const scale = clampBoardZoomScale(Number(profile?.scale) || 1);
    const { maxPanX, maxPanY } = getStagePanBounds(scale);
    return {
      scale,
      panX: Math.max(-maxPanX, Math.min(maxPanX, Number(profile?.panX) || 0)),
      panY: Math.max(-maxPanY, Math.min(maxPanY, Number(profile?.panY) || 0)),
    };
  }

  function computePanForZoomFocus(scale, focus = null) {
    const stage = ctx.stage;
    const width = stage?.clientWidth || 0;
    const height = stage?.clientHeight || 0;
    const center = focus ?? { x: 0.5, y: 0.5 };
    const rawPanX = -((center.x - 0.5) * width * scale);
    const rawPanY = -((center.y - 0.5) * height * scale);
    return clampPanToBounds({ scale, panX: rawPanX, panY: rawPanY });
  }

  function createDefaultBoardZoomByBoard() {
    return Object.fromEntries(ctx.getBoards().map((board) => [board.id, { ...ctx.BOARD_ZOOM_DEFAULT }]));
  }

  function getBoardZoom(boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    return normalizeBoardZoomProfile(ctx.state.boardZoomByBoard[effectiveBoardId]);
  }

  function setBoardZoom(boardId, profile) {
    ctx.state.boardZoomByBoard[boardId] = normalizeBoardZoomProfile(profile);
  }

  function getRoomCenterForZoom(boardId, roomId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const effectiveRoomId = roomId ?? ctx.getActivePolygonRoomId(effectiveBoardId);
    const room = ctx.getBoard(effectiveBoardId).rooms.find((entry) => entry.id === effectiveRoomId);
    if (!room) {
      return {
        x: ctx.BOARD_ZOOM_DEFAULT.originX,
        y: ctx.BOARD_ZOOM_DEFAULT.originY,
      };
    }
    const points = ctx.getRoomPoints(room, effectiveBoardId);
    if (!points.length) {
      const fallback = ctx.getRawRoomCenter(room, effectiveBoardId);
      return { x: fallback.x, y: fallback.y };
    }
    const center = points.reduce(
      (acc, [x, y]) => ({ x: acc.x + x / 1000, y: acc.y + y / 1000 }),
      { x: 0, y: 0 },
    );
    return {
      x: center.x / points.length,
      y: center.y / points.length,
    };
  }

  function syncStageZoomTransform() {
    const state = ctx.state;
    // Zoom/pan state now persists across both dashboard and
    // settings views so the user can drag the board around during a
    // session. Previously the CSS vars reset to default outside of
    // settings, which made pan/zoom feel like it was "lost".
    const zoom = getBoardZoom(state.boardId);
    ctx.stage.style.setProperty("--stage-zoom-scale", String(zoom.scale));
    ctx.stage.style.setProperty("--stage-pan-x", `${zoom.panX.toFixed(2)}px`);
    ctx.stage.style.setProperty("--stage-pan-y", `${zoom.panY.toFixed(2)}px`);
    // Cluster rail position:fixed mirror needs to
    // re-sync to the stage's new bounding rect on every pan/zoom
    // tick. Read on next frame so the transform CSS has settled.
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => {
        const rail = document.getElementById("cluster-pads");
        if (!rail) return;
        const rect = ctx.stage.getBoundingClientRect();
        if (rect.width <= 0) return;
        rail.style.setProperty("--rail-left", `${rect.left}px`);
        rail.style.setProperty("--rail-top", `${rect.top}px`);
        rail.style.setProperty("--rail-height", `${rect.height}px`);
        const layoutWidth = ctx.stage.clientWidth || rect.width;
        rail.style.setProperty("--rail-scale", String(rect.width / Math.max(1, layoutWidth)));
      });
    }
  }

  function syncBoardZoomStatus() {
    const state = ctx.state;
    // Skip this expensive status line update during an
    // active touch gesture. It reads stage.clientWidth/clientHeight +
    // writes to boardZoomStatus.textContent on every call, which forces
    // synchronous layout when interleaved with CSS variable writes in
    // the hot rAF path. The bar refreshes once the gesture ends.
    if (ctx.getTouchGestureActive()) return;
    const zoom = getBoardZoom(state.boardId);
    const percent = Math.round(zoom.scale * 100);
    const bounds = getStagePanBounds(zoom.scale);
    const modeLabel = state.panMode.active
      ? "PAN active (dragging)"
      : state.panMode.spacePressed
        ? "PAN ready (Space pressed)"
        : "Edit mode";
    ctx.boardZoomStatus.textContent = `Zoom: ${percent}% (Min ${Math.round(ctx.BOARD_ZOOM_SCALE_MIN * 100)}%, Max ${Math.round(ctx.BOARD_ZOOM_SCALE_MAX * 100)}%) | Pan X ${Math.round(zoom.panX)}px, Y ${Math.round(zoom.panY)}px | Bounds ±${Math.round(bounds.maxPanX)}px/±${Math.round(bounds.maxPanY)}px`;
    if (ctx.boardPanStatus) {
      const hint = zoom.scale > 1
        ? "Space + drag or middle mouse button: move board"
        : "Pan is available above zoom > 100%";
      ctx.boardPanStatus.textContent = `Pan status: ${modeLabel} | ${hint}`;
    }
  }

  function syncBoardZoomPanel() {
    // Kept for ABI stability of ~20 call sites: refreshes the status line
    // and the stage transform without writing to a slider/label.
    syncPolygonHandleSizePanel();
    syncBoardZoomStatus();
    syncStageZoomTransform();
  }

  function syncPolygonHandleSizePanel() {
    const percent = Math.round(ctx.getCurrentPolygonHandleScale() * 100);
    if (ctx.polygonHandleSizeInput) {
      ctx.polygonHandleSizeInput.value = String(percent);
    }
    if (ctx.polygonHandleSizeValue) {
      ctx.polygonHandleSizeValue.textContent = `${percent}%`;
    }
  }

  function updateCurrentBoardZoom(partial, statusText = null) {
    const current = getBoardZoom(ctx.state.boardId);
    const next = clampPanToBounds({
      ...current,
      ...partial,
    });
    setBoardZoom(ctx.state.boardId, next);
    syncBoardZoomPanel();
    setPanCursorState();
    if (statusText) {
      ctx.triggerFeedback.textContent = `Status: ${statusText}`;
    }
  }

  // rAF-coalesced zoom/pan writer: collapses many same-frame calls
  // (from pan, wheel, pinch) into one updateCurrentBoardZoom() + DOM
  // write per frame, fixing mobile pan lag.
  function scheduleZoomUpdate(partial, statusText = null) {
    pendingZoomUpdate = pendingZoomUpdate
      ? { ...pendingZoomUpdate, ...partial, statusText: statusText ?? pendingZoomUpdate.statusText }
      : { ...partial, statusText };
    if (pendingZoomFrameHandle !== null) return;
    pendingZoomFrameHandle = window.requestAnimationFrame(() => {
      pendingZoomFrameHandle = null;
      const payload = pendingZoomUpdate || {};
      pendingZoomUpdate = null;
      const { statusText: pendingStatus, ...rest } = payload;
      updateCurrentBoardZoom(rest, pendingStatus ?? null);
    });
  }

  function fitZoomToActiveSpecialRoom() {
    const state = ctx.state;
    const roomId = ctx.getActivePolygonRoomId(state.boardId);
    const room = ctx.getBoard(state.boardId).rooms.find((entry) => entry.id === roomId);
    if (!room) {
      updateCurrentBoardZoom(ctx.BOARD_ZOOM_DEFAULT, "Zoom reset to default");
      return;
    }

    const points = ctx.getRoomPoints(room, state.boardId).map(([x, y]) => [x / 1000, y / 1000]);
    if (!points.length) {
      updateCurrentBoardZoom(ctx.BOARD_ZOOM_DEFAULT, "Zoom reset to default");
      return;
    }

    const { minX, maxX, minY, maxY } = window.TT_BEAMER_RUNTIME_UTILS.bboxOfPolygon(points);

    const boxSize = Math.max(0.05, maxX - minX, maxY - minY);
    const targetCoverage = 0.45;
    const scale = clampBoardZoomScale(targetCoverage / boxSize);
    const center = getRoomCenterForZoom(state.boardId, room.id);
    const viewport = computePanForZoomFocus(scale, center);
    updateCurrentBoardZoom(viewport, `${room.name ?? room.label} zoomed (${Math.round(scale * 100)}%)`);
  }

  function canStartPanModeFromEvent(event) {
    const state = ctx.state;
    // Pan is always allowed at any zoom level. Users need the
    // freedom to reposition the board even when zoomed out. The opt-in
    // mechanism (middle-click or space-drag) prevents accidental panning.
    return event.button === 1 || state.panMode.spacePressed;
  }

  function isPanArbitrating() {
    return ctx.state.panMode.spacePressed || ctx.state.panMode.active;
  }

  function setPanCursorState() {
    const state = ctx.state;
    // Skip during an active touch gesture. The class
    // toggles do minimal work but the follow-up syncBoardZoomStatus is
    // expensive (stage.clientWidth/Height reads). The gesture-end
    // handler re-runs this once the user lifts their finger.
    if (ctx.getTouchGestureActive()) return;
    const zoom = getBoardZoom(state.boardId);
    // Pan is always available at any zoom level.
    ctx.stage.classList.toggle("is-panning", state.panMode.active);
    ctx.roomOverlay.classList.toggle("is-pan-enabled", true);
    ctx.roomOverlay.classList.toggle("is-pan-ready", state.panMode.spacePressed && !state.panMode.active);
    ctx.roomOverlay.classList.toggle("is-panning", state.panMode.active);
    syncBoardZoomStatus();
  }

  function startPanMode(event, trigger) {
    const state = ctx.state;
    const zoom = getBoardZoom(state.boardId);
    state.panMode.active = true;
    state.panMode.pointerId = event.pointerId;
    state.panMode.startClientX = event.clientX;
    state.panMode.startClientY = event.clientY;
    state.panMode.startPanX = zoom.panX;
    state.panMode.startPanY = zoom.panY;
    state.panMode.trigger = trigger;
    try {
      ctx.roomOverlay.setPointerCapture(event.pointerId);
    } catch {
      // ignore unsupported pointer capture
    }
    setPanCursorState();
    ctx.triggerFeedback.textContent = "Status: Pan mode active (moving board)";
  }

  function endPanMode(event, { canceled = false } = {}) {
    const state = ctx.state;
    if (!state.panMode.active) {
      return;
    }
    const pointerId = state.panMode.pointerId;
    if (pointerId !== null && event && ctx.roomOverlay.hasPointerCapture(pointerId)) {
      ctx.roomOverlay.releasePointerCapture(pointerId);
    }
    state.panMode.active = false;
    state.panMode.pointerId = null;
    state.panMode.trigger = null;
    setPanCursorState();
    ctx.triggerFeedback.textContent = canceled
      ? "Status: Pan mode canceled"
      : "Status: Pan mode ended";
  }

  // Cursor-accurate zoom-around-anchor math for the stage's
  // CSS `transform-origin: 50% 50%`. The previous absolute-anchor approach used the parent rect +
  // offsetLeft which implicitly assumes `transform-origin: 0 0` and
  // produced the wrong anchor on every zoom.
  function applyZoomScaleAroundClientPoint(nextScale, clientX, clientY, reason) {
    const state = ctx.state;
    if (!ctx.stage) return;
    const geo = ctx.getCachedStageGeometry();
    const rect = geo.rect;
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const layoutWidth = geo.layoutWidth;
    const layoutHeight = geo.layoutHeight;
    if (layoutWidth <= 0 || layoutHeight <= 0) return;

    const current = getBoardZoom(state.boardId);
    const currentScale = Math.max(0.0001, Number(current.scale) || 1);
    const clamped = clampBoardZoomScale(nextScale);
    if (!Number.isFinite(clamped) || clamped <= 0) return;

    const fracX = (clientX - rect.left) / rect.width;
    const fracY = (clientY - rect.top) / rect.height;
    const stageLocalX = fracX * layoutWidth;
    const stageLocalY = fracY * layoutHeight;

    const scaleDelta = clamped - currentScale;
    const newPanX = current.panX + (layoutWidth / 2 - stageLocalX) * scaleDelta;
    const newPanY = current.panY + (layoutHeight / 2 - stageLocalY) * scaleDelta;

    scheduleZoomUpdate(
      clampPanToBounds({ scale: clamped, panX: newPanX, panY: newPanY }),
      reason || `Board zoom -> ${Math.round(clamped * 100)}%`,
    );
  }

  window.TT_BEAMER_RUNTIME_VIEWPORT_ZOOM = {
    init,
    clampBoardZoomScale,
    normalizeBoardZoomProfile,
    getStagePanBounds,
    clampPanToBounds,
    computePanForZoomFocus,
    createDefaultBoardZoomByBoard,
    getBoardZoom,
    setBoardZoom,
    getRoomCenterForZoom,
    syncStageZoomTransform,
    syncBoardZoomStatus,
    syncBoardZoomPanel,
    syncPolygonHandleSizePanel,
    updateCurrentBoardZoom,
    scheduleZoomUpdate,
    fitZoomToActiveSpecialRoom,
    canStartPanModeFromEvent,
    isPanArbitrating,
    setPanCursorState,
    startPanMode,
    endPanMode,
    applyZoomScaleAroundClientPoint,
  };
})();
