// board switch module.
//
// Owns emitBoardLayoutContextMutation (context-update mutation),
// shouldPreserveLifecycleStatusFeedback (lifecycle-status guard),
// switchBoard (full active-board swap: image/select/status/room
// selection/geometry maps/panels/overlay/global buttons), and
// ensureBoardRoomStateMaps (fills missing per-room geometry +
// tombstone entries).
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

  // Phase 28 B1 (D-03): silent auto-load of the per-board last-used
  // projection profile. Fired fire-and-forget from switchBoard after the
  // panels and overlay have synced. If a remembered profile name exists for
  // this board AND the named profile loads cleanly, applyAndCaptureSnapshot
  // restores the geometry with snapshot=loaded so isDirty()===false. If the
  // name is null/missing OR the load fails (4xx, network error, malformed
  // JSON), applyDefaultAndCaptureSnapshot restores the new-profile default
  // geometry — also with snapshot=loaded so the dashboard's board-switch
  // dropdown does NOT auto-disable just because the user switched boards.
  // CRITICAL: this helper does NOT write state.lastUsedProfileNameByBoard
  // (D-01: only user-explicit save/load triggers do).
  // Phase 36 iter2 h5 (2026-05-10): operator UAT root cause discovery.
  // boards.json may have `lastUsedProfileName: null` while runtime-active-
  // grid.json (Phase-31 h41 server-disk-restore) holds a valid grid from a
  // previous broadcast. Pre-h5, this branched to applyDefaultAndCaptureSnapshot
  // (identity) — so the SSR tab booted with identity grid and the stream
  // showed full-screen default until the operator turned align-mode on
  // (which triggered /output/'s h2/h3 broadcast that re-pushed the disk-
  // restored grid via a different originator).
  //
  // Fix: when no remembered profile name exists, fetch /api/live/snapshot
  // and check `runtime.lastAlignGridSnapshot`. If present (server-disk-
  // restore originator OR any prior broadcast), apply it as the boot grid.
  // This makes the SSR tab's stream reflect the last-known-good grid even
  // when boards.json's lastUsedProfileName is out-of-sync with the
  // runtime-active-grid.json persisted state.
  async function _tryApplyDiskRestoredGrid() {
    try {
      const resp = await fetch("/api/live/snapshot");
      if (!resp.ok) return false;
      const snap = await resp.json();
      const lastSnap = snap?.runtime?.lastAlignGridSnapshot;
      if (!lastSnap || !Array.isArray(lastSnap.srcXs)
          || !Array.isArray(lastSnap.srcYs) || !Array.isArray(lastSnap.points)) {
        return false;
      }
      const persist = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE;
      const gridState = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
      if (!persist || !gridState || typeof gridState.restoreGridSnapshot !== "function") {
        return false;
      }
      // Convert from broadcast's flat point list into 2D points array.
      const points2D = [];
      for (let r = 0; r < lastSnap.srcYs.length; r++) {
        points2D[r] = [];
        for (let c = 0; c < lastSnap.srcXs.length; c++) {
          points2D[r][c] = { x: lastSnap.srcXs[c], y: lastSnap.srcYs[r] };
        }
      }
      for (const pt of lastSnap.points) {
        if (Number.isInteger(pt.row) && Number.isInteger(pt.col)
            && points2D[pt.row] && points2D[pt.row][pt.col]) {
          points2D[pt.row][pt.col] = { x: pt.x, y: pt.y };
        }
      }
      gridState.restoreGridSnapshot({
        srcXs: lastSnap.srcXs.slice(),
        srcYs: lastSnap.srcYs.slice(),
        points: points2D,
      });
      console.log(
        `[autoLoad h5] applied disk-restored grid `
        + `profile=${lastSnap.profileId} originator=${lastSnap.originatorClientId} `
        + `points=${lastSnap.points.length}`,
      );
      return true;
    } catch (err) {
      console.warn("[autoLoad h5] disk-restored grid apply failed:", err?.message || err);
      return false;
    }
  }

  async function autoLoadRememberedProjectionProfile(boardId) {
    const persist = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE;
    if (!persist || !ctx?.state) return;
    const remembered = ctx.state.lastUsedProfileNameByBoard?.[boardId] ?? null;
    if (!remembered) {
      // h5: try disk-restored runtime.lastAlignGridSnapshot first; only
      // fall back to identity-default if that's empty.
      const applied = await _tryApplyDiskRestoredGrid();
      if (!applied && typeof persist.applyDefaultAndCaptureSnapshot === "function") {
        persist.applyDefaultAndCaptureSnapshot();
      }
      return;
    }
    try {
      const url = `/api/projection-profiles/load?boardId=${encodeURIComponent(boardId)}&name=${encodeURIComponent(remembered)}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        const applied = await _tryApplyDiskRestoredGrid();
        if (!applied) persist.applyDefaultAndCaptureSnapshot();
        return;
      }
      const body = await resp.json();
      if (!body?.data) {
        const applied = await _tryApplyDiskRestoredGrid();
        if (!applied) persist.applyDefaultAndCaptureSnapshot();
        return;
      }
      persist.applyAndCaptureSnapshot(body.data, remembered);
    } catch (_err) {
      const applied = await _tryApplyDiskRestoredGrid();
      if (!applied) persist.applyDefaultAndCaptureSnapshot();
    }
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
    const isActualSwitch = previousBoardId !== board.id;
    if (isActualSwitch && typeof ctx.clearUndoStack === "function") ctx.clearUndoStack();
    state.boardId = board.id;
    state.selectedBoard = board.id;
    state.selectedLayout = board.id;
    // Persist the active board id in localStorage so a
    // page reload lands on whatever the user last had open (falling
    // back to the first available board if that id no longer exists).
    try {
      window.localStorage?.setItem("tt-beamer.last-board-id.v1", board.id);
    } catch { /* private mode / quota — ignore */ }
    ctx.boardImage.src = board.src;
    ctx.boardSelect.value = board.id;
    ctx.boardStatus.textContent = `Active board: ${board.label}`;
    // Mirror the label into the topbar brand sub-line.
    if (ctx.topbarBoardLabel) {
      ctx.topbarBoardLabel.textContent = board.label;
    }
    const rememberedRoom = state.selectedRoomByBoard[board.id];
    state.selectedRoomId = board.rooms.some((room) => room.id === rememberedRoom)
      ? rememberedRoom
      : board.rooms[0]?.id ?? null;
    state.selectedRoomByBoard[board.id] = state.selectedRoomId;
    ensureBoardRoomStateMaps(board.id);
    // Only clear outside mp4 state on actual board switches.
    // syncRuntimePanelsFromState calls switchBoard with the same boardId
    // on every snapshot apply — clearing playback state here would restart
    // the outside mp4 video every time a room animation starts/stops.
    if (isActualSwitch) {
      ctx.clearOutsideMp4PlaybackState(previousBoardId);
      ctx.clearOutsideTimelineState(previousBoardId);
    }
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
    // Phase 28 B1 (D-03): fire-and-forget the silent auto-load of the
    // per-board remembered projection profile. ONLY on actual board switches
    // — syncRuntimePanelsFromState calls switchBoard(sameId) on every
    // global-config-update snapshot, and an unconditional auto-load there
    // would overwrite in-progress align-mode edits with the persisted
    // profile every time the user moves a handle (28-h1 regression).
    if (isActualSwitch) {
      void autoLoadRememberedProjectionProfile(board.id);
    }
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
    for (const room of board.rooms) {
      if (!geometryMap[room.id]) {
        geometryMap[room.id] = ctx.normalizeRoomGeometry(ctx.ROOM_GEOMETRY_DEFAULT, room, boardId);
      }
    }
    state.roomGeometryByBoard[boardId] = geometryMap;
  }

  window.TT_BEAMER_RUNTIME_BOARD_SWITCH = {
    init,
    emitBoardLayoutContextMutation,
    shouldPreserveLifecycleStatusFeedback,
    switchBoard,
    // Phase 28 B1: exported so other modules / future tests can dry-run the
    // auto-load behavior without going through switchBoard.
    autoLoadRememberedProjectionProfile,
    ensureBoardRoomStateMaps,
  };
})();
