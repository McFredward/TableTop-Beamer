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
      const body = await resp.json();
      // Phase 46 iter2 (2026-05-16): unwrap the response envelope. The
      // /api/live/snapshot route returns
      // `{ ok, changed, sinceVersion, session: { version, snapshot, ... } }`
      // — the runtime payload lives at body.session.snapshot.runtime, NOT
      // body.runtime. Pre-iter2 we read body.runtime directly, which is
      // always undefined, so this helper unconditionally returned false →
      // autoLoadRememberedProjectionProfile fell back to
      // applyDefaultAndCaptureSnapshot (identity grid + broadcast isBaseline=true).
      // That baseline broadcast then OVERRODE the live-hello W5 apply on
      // every client, leaving the SSR Chromium tab's mesh-warp at identity
      // even though server.mjs's W5 fallback had correctly seeded
      // lastAlignGridSnapshot with the chosen profile. Matches the other
      // consumers' defensive unwrap pattern (output-align-mode-loader.js
      // line 663, output-live-sync.js line 405).
      const snap = body?.session?.snapshot ?? body?.snapshot ?? body ?? {};
      const lastSnap = snap?.runtime?.lastAlignGridSnapshot;
      if (!lastSnap || !Array.isArray(lastSnap.srcXs)
          || !Array.isArray(lastSnap.srcYs) || !Array.isArray(lastSnap.points)) {
        return false;
      }
      const persist = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE;
      if (!persist || typeof persist.applyAndCaptureSnapshot !== "function") {
        return false;
      }
      // Phase 46 fix (2026-05-16): route through applyAndCaptureSnapshot
      // instead of grid-state's restoreGridSnapshot directly. The bare
      // restore mutates grid.points but never calls applyTransform(),
      // rebuildHandleElements(), or refreshes _loadedProfileSnapshot —
      // so the SSR mesh-warp didn't re-render with the new geometry on
      // cold boot. Result: SSR streamed at identity while /output/'s
      // align-mode handles showed the W5-restored profile geometry. The
      // operator UAT screenshot (.planning/debug/desync/one_more_desync_bug.png)
      // captured this exact desync on a fresh install where projection-
      // profiles.json existed but runtime-active-grid.json did not.
      //
      // applyAndCaptureSnapshot performs the full post-restore sequence
      // (handle rebuild, drawLines, positionRotateHandles, applyTransform,
      // renderRoomOverlay, snapshot=loaded baseline, broadcast as
      // isBaseline=true), matching the path used by an explicit profile
      // load — which is why the bug disappeared once the operator
      // saved/loaded any profile.
      persist.applyAndCaptureSnapshot(
        {
          srcXs: lastSnap.srcXs,
          srcYs: lastSnap.srcYs,
          points: lastSnap.points,
        },
        lastSnap.profileId,
      );
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

  // Phase 49 gap-closure-26 (2026-05-18): when no remembered profile
  // name exists for the target board, fall back to the FIRST available
  // saved profile (via /api/projection-profiles?boardId=...) before
  // resorting to the 80%-inset default. Operator UAT: "wird beim
  // board wechsel immer das 80% default geladen - allerdings soll das
  // NUR der Fall sein, wenn das entsprechende board noch gar keine
  // Profile hat. Hat es Profile soll das zuletzt offene Profil wieder
  // geladen werden." We don't have a per-board "zuletzt offen" history
  // beyond `lastUsedProfileNameByBoard` (which is what `remembered`
  // already covers); the next-best deterministic pick is "the first
  // profile the server returns" — server orders alphabetically, so
  // this is stable across reboots.
  async function _autoLoadFallbackForBoard(boardId, persist) {
    if (!persist) return;
    try {
      const r = await fetch(`/api/projection-profiles?boardId=${encodeURIComponent(boardId)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = await r.json();
      const names = Array.isArray(body?.names) ? body.names : [];
      if (names.length === 0) {
        // No profiles for this board at all → clean 80%-inset default.
        persist.applyDefaultAndCaptureSnapshot?.();
        return;
      }
      // Load the first profile.
      const firstName = names[0];
      const loadResp = await fetch(
        `/api/projection-profiles/load?boardId=${encodeURIComponent(boardId)}`
        + `&name=${encodeURIComponent(firstName)}`,
      );
      if (!loadResp.ok) throw new Error(`load HTTP ${loadResp.status}`);
      const loadBody = await loadResp.json();
      if (!loadBody?.data) throw new Error("no data");
      persist.applyAndCaptureSnapshot?.(loadBody.data, firstName);
    } catch (_err) {
      // Network/HTTP failure → safest is the default. Logging here is
      // intentionally console-only; the operator's visual cue is the
      // grid resetting to identity-80%.
      console.warn("[autoLoad] fallback failed:", _err?.message || _err);
      persist.applyDefaultAndCaptureSnapshot?.();
    }
  }

  async function autoLoadRememberedProjectionProfile(boardId) {
    const persist = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE;
    if (!persist || !ctx?.state) return;
    const remembered = ctx.state.lastUsedProfileNameByBoard?.[boardId] ?? null;
    // Phase 49 gap-closure-24 (2026-05-18): on board switch we used to
    // fall back to `_tryApplyDiskRestoredGrid` (cross-board), which
    // bled the previously loaded board's geometry into the new board.
    // gap-closure-24 replaced that with `applyDefaultAndCaptureSnapshot`,
    // but operator follow-up (gap-closure-26): only use the default
    // when the board has zero saved profiles; otherwise auto-load the
    // first existing profile so the operator doesn't lose calibration
    // every time they switch boards. `_autoLoadFallbackForBoard` does
    // the projection-profiles list + first-load + safe default chain.
    if (!remembered) {
      await _autoLoadFallbackForBoard(boardId, persist);
      return;
    }
    try {
      const url = `/api/projection-profiles/load?boardId=${encodeURIComponent(boardId)}&name=${encodeURIComponent(remembered)}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        await _autoLoadFallbackForBoard(boardId, persist);
        return;
      }
      const body = await resp.json();
      if (!body?.data) {
        await _autoLoadFallbackForBoard(boardId, persist);
        return;
      }
      persist.applyAndCaptureSnapshot(body.data, remembered);
    } catch (_err) {
      await _autoLoadFallbackForBoard(boardId, persist);
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
    // Phase 47 gap-closure-12: defensive guard. ctx.getBoard returns
    // undefined when BOARDS is empty (e.g. /api/boards fetch failed or
    // hasn't finished). Without this guard, line 172 (board.id) threw a
    // TypeError that aborted bootstrap and left the dashboard blank.
    // Bail out quietly; the live-snapshot rehydrate path will retry once
    // boards arrive.
    if (!board) {
      console.warn(`[board-switch] aborted: no board found for id="${boardId}" (BOARDS may not be loaded yet)`);
      return;
    }
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
