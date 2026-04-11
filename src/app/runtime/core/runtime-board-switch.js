// Phase 14-2: board switch module.
//
// Owns emitBoardLayoutContextMutation (context-update mutation),
// shouldPreserveLifecycleStatusFeedback (lifecycle-status guard),
// switchBoard (full active-board swap: image/select/status/room
// selection/geometry maps/panels/overlay/global buttons), and
// ensureBoardRoomStateMaps (fills missing per-room geometry +
// state profile + tombstone entries).
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function emitBoardLayoutContextMutation(boardId = ctx.state.boardId, reason = "board-select") {
    const contextSwitchTransactionId = `context-switch-${boardId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    ctx.emitLiveMutation("context-update", {
      reason,
      contextSwitchTransactionId,
      selectedBoard: boardId,
      selectedLayout: boardId,
      boardId,
      layoutId: boardId,
    });
  }

  function shouldPreserveLifecycleStatusFeedback() {
    const text = typeof ctx.triggerFeedback?.textContent === "string" ? ctx.triggerFeedback.textContent : "";
    if (!text) {
      return false;
    }
    return /Pending:|\bstarted\b|\baccepted\b|\bStopping\.\.\.\b/i.test(text);
  }

  function switchBoard(boardId, { emitLiveContext = false, reason = "board-switch", announceStatus = true } = {}) {
    const state = ctx.state;
    const switchStartedAt = performance.now();
    const previousBoardId = state.boardId;
    const previousRoomId = state.selectedRoomId;
    if (previousBoardId && previousRoomId) {
      state.selectedRoomByBoard[previousBoardId] = previousRoomId;
    }

    const board = ctx.getBoard(boardId);
    state.boardId = board.id;
    state.selectedBoard = board.id;
    state.selectedLayout = board.id;
    ctx.boardImage.src = board.src;
    ctx.boardSelect.value = board.id;
    ctx.boardStatus.textContent = `Active board: ${board.label}`;
    const rememberedRoom = state.selectedRoomByBoard[board.id];
    state.selectedRoomId = board.rooms.some((room) => room.id === rememberedRoom)
      ? rememberedRoom
      : board.rooms[0]?.id ?? null;
    state.selectedRoomByBoard[board.id] = state.selectedRoomId;
    ensureBoardRoomStateMaps(board.id);
    ctx.clearOutsideMp4PlaybackState(previousBoardId);
    ctx.clearOutsideTimelineState(previousBoardId);
    ctx.warmRoomGifAssets({ reason: "board-switch" });
    ctx.prewarmBoardOutsideMp4Asset(board.id, { reason });
    ctx.syncRoomPanelFromSelection();
    ctx.syncHitareaCalibrationPanel();
    ctx.syncRoomGeometryPanel();
    ctx.syncPolygonEditorPanel();
    ctx.syncShipPolygonEditorPanel();
    ctx.syncRoomFxPanel();
    ctx.syncInsideFxPanel();
    ctx.syncOutsideFxPanel();
    ctx.syncOutsideRuntimeMirror(board.id);
    ctx.syncBoardZoomPanel();
    ctx.setPanCursorState();
    ctx.canvasCtx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.renderRoomOverlay();
    ctx.refreshGlobalButtons();
    if (announceStatus && !shouldPreserveLifecycleStatusFeedback()) {
      const durationMs = Math.round(Math.max(0, performance.now() - switchStartedAt));
      ctx.triggerFeedback.textContent = `Status: board switched (${durationMs}ms)`;
    }
    if (emitLiveContext) {
      emitBoardLayoutContextMutation(board.id, reason);
    }
  }

  function ensureBoardRoomStateMaps(boardId) {
    const state = ctx.state;
    const board = ctx.getBoard(boardId);
    const geometryMap = state.roomGeometryByBoard[boardId] ?? {};
    const stateMap = state.roomStateProfilesByBoard[boardId] ?? {};
    const tombstones = state.roomTombstonesByBoard?.[boardId] ?? [];
    for (const room of board.rooms) {
      if (!geometryMap[room.id]) {
        geometryMap[room.id] = ctx.normalizeRoomGeometry(ctx.ROOM_GEOMETRY_DEFAULT, room, boardId);
      }
      if (!stateMap[room.id]) {
        stateMap[room.id] = ctx.normalizeRoomStateProfile(ctx.ROOM_STATE_DEFAULT);
      }
    }
    state.roomGeometryByBoard[boardId] = geometryMap;
    state.roomStateProfilesByBoard[boardId] = stateMap;
    if (!state.roomTombstonesByBoard) {
      state.roomTombstonesByBoard = {};
    }
    state.roomTombstonesByBoard[boardId] = ctx.normalizeRoomTombstoneIds(tombstones, boardId);
  }

  window.TT_BEAMER_RUNTIME_BOARD_SWITCH = {
    init,
    emitBoardLayoutContextMutation,
    shouldPreserveLifecycleStatusFeedback,
    switchBoard,
    ensureBoardRoomStateMaps,
  };
})();
