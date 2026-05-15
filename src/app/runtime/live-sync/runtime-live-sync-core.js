// live-sync core module.
//
// Owns the live-sync command/snapshot pipeline:
//   - shouldApplySnapshotVersion (monotonic version gate)
//   - pollLiveSnapshotOnce (HTTP polling loop with backoff)
//   - emitLiveMutation (command POST with retry + trace)
//   - applyLiveRuntimeSnapshot (full snapshot apply with polygon
//     hydration, audio/visual side effects, version bookkeeping)
//   - connectLiveSyncSocket (WebSocket lifecycle + message routing)
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;

  // Phase-31 h22 (2026-05-06): page-load timestamp. Drags older than
  // this are by definition stale (they were sent BEFORE this page
  // loaded) and must not be replayed. The 5 s wall-clock check we had
  // in h21b can fail when the server's clock is slightly ahead, or
  // when a slow page load means the snapshot's drag-at is technically
  // within 5 s of "now" but predates the page mount.
  const _pageLoadAtMs = Date.now();
  // h31 diagnostic counter for align-grid-snapshot receive logs.
  let _gridSnapApplyLogCount = 0;

  // Phase-31 h29 (2026-05-06): after applying align-corner-drag, the
  // grid changes via gridState.setPoint — but neither projection
  // mapping's applyTransform (intentionally a no-op since Phase 30) nor
  // setPoint itself trigger handle/line redraw. The local handle-drag
  // module calls positionHandles + drawLines + positionRotateHandles
  // after every drag step (handle-drag.js:124-127, 232-235, 317-320,
  // 481-484, 545-548) — when a drag arrives via WS we need the same
  // post-step redraw on this side, otherwise the streamed video shows
  // the warped board updating but the handle/line overlay frozen at
  // the pre-drag positions. Critical on the SSR Chromium tab: its
  // handles + lines are encoded into the streamed frame the user sees.
  //
  // h37 (2026-05-06): also re-render the room polygon overlay after a
  // grid change. Both the SSR Chromium tab (whose polygons get encoded
  // into the streamed frame) and Pi /output/ (whose polygons overlay
  // the streamed video) need this — without it, the polygons stay at
  // pre-drag positions while the warped board reflects the drag, so
  // the user sees a desync between the streamed board and the room
  // outlines until something else triggers a re-render.
  function _redrawHandlesAfterCornerDrag() {
    try {
      const hUi = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
      if (hUi) {
        if (typeof hUi.getHandlesVisible !== "function" || hUi.getHandlesVisible()) {
          if (typeof hUi.positionHandles === "function") hUi.positionHandles();
          if (typeof hUi.positionRotateHandles === "function") hUi.positionRotateHandles();
          if (typeof hUi.drawLines === "function") hUi.drawLines();
        }
      }
      // h37: refresh the room polygon overlay so the streamed frame
      // (SSR tab) and the local /output/ overlay (Pi) both reflect
      // the new grid warp on the same frame as the handles.
      if (ctx && typeof ctx.renderRoomOverlay === "function") {
        try { ctx.renderRoomOverlay(); } catch (_) {}
      }
    } catch (err) {
      console.warn("[align-corner-drag] handle redraw failed:", err?.message || err);
    }
  }

  function init(dependencies) {
    ctx = dependencies;
  }

  function shouldApplySnapshotVersion(incomingVersion) {
    const liveSync = ctx.liveSync;
    if (!Number.isFinite(Number(incomingVersion))) {
      return false;
    }
    const normalizedIncomingVersion = Number(incomingVersion);
    if (normalizedIncomingVersion <= liveSync.lastAppliedVersion) {
      liveSync.applyRejectCounters.staleVersion += 1;
      return false;
    }
    return true;
  }

  async function pollLiveSnapshotOnce() {
    const liveSync = ctx.liveSync;
    if (!liveSync.pollingEnabled || liveSync.pollInFlight) {
      return;
    }
    liveSync.pollInFlight = true;
    try {
      const params = new URLSearchParams({
        sinceVersion: String(Math.max(0, Number(liveSync.lastAppliedVersion) || 0)),
      });
      const response = await fetch(`/api/live/snapshot?${params.toString()}`, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`snapshot fetch failed (${response.status})`);
      }
      const payload = await response.json();
      const envelope = ctx.normalizeSnapshotEnvelope(payload);
      const incomingVersion = envelope.version;
      if (incomingVersion !== null) {
        liveSync.lastSessionVersion = Math.max(liveSync.lastSessionVersion, incomingVersion);
      }
      if (shouldApplySnapshotVersion(incomingVersion) && envelope.snapshot) {
        // Phase-31 h43 (2026-05-06): eager grid apply BEFORE
        // applyLiveRuntimeSnapshot — see live-hello handler for why
        // (silent throw in 200+ lines of pre-grid apply code can hide
        // the grid apply at line ~490). The eager apply is idempotent
        // (gated by _lastAppliedAlignGridSnapshotKey).
        try {
          const pollRuntime = envelope.snapshot?.runtime;
          const pollGridSnap = pollRuntime?.lastAlignGridSnapshot;
          if (
            ctx.getOutputRole?.() === ctx.OUTPUT_ROLE_FINAL
            && pollGridSnap
            && typeof pollGridSnap === "object"
            && Array.isArray(pollGridSnap.srcXs)
            && Array.isArray(pollGridSnap.srcYs)
            && Array.isArray(pollGridSnap.points)
          ) {
            const localClientId = liveSync.clientId;
            const isOriginator =
              !!localClientId
              && pollGridSnap.originatorClientId === localClientId;
            if (!isOriginator) {
              const snapKey =
                `${pollGridSnap.at || ""}:`
                + `${pollGridSnap.profileId || ""}:`
                + `${pollGridSnap.points?.length || 0}`;
              if (ctx.state._lastAppliedAlignGridSnapshotKey !== snapKey) {
                const gridState = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
                if (gridState && typeof gridState.restoreGridSnapshot === "function") {
                  const points2D = [];
                  for (let r = 0; r < pollGridSnap.srcYs.length; r++) {
                    points2D[r] = [];
                    for (let c = 0; c < pollGridSnap.srcXs.length; c++) {
                      points2D[r][c] = {
                        x: pollGridSnap.srcXs[c],
                        y: pollGridSnap.srcYs[r],
                      };
                    }
                  }
                  for (const pt of pollGridSnap.points) {
                    if (
                      Number.isInteger(pt.row) && Number.isInteger(pt.col)
                      && points2D[pt.row] && points2D[pt.row][pt.col]
                    ) {
                      points2D[pt.row][pt.col] = { x: pt.x, y: pt.y };
                    }
                  }
                  gridState.restoreGridSnapshot({
                    srcXs: pollGridSnap.srcXs.slice(),
                    srcYs: pollGridSnap.srcYs.slice(),
                    points: points2D,
                  });
                  ctx.state._lastAppliedAlignGridSnapshotKey = snapKey;
                  _redrawHandlesAfterCornerDrag();
                  console.log(
                    `[align-grid-snapshot] poll eager-apply OK `
                    + `profile=${pollGridSnap.profileId} `
                    + `points=${pollGridSnap.points.length}`,
                  );
                }
              }
            }
          }
        } catch (err) {
          console.warn(
            "[align-grid-snapshot] poll eager-apply failed:",
            err?.message || err,
          );
        }
        // Phase-31 h44 (2026-05-06): eager alignMode apply, same shape
        // as the h43 eager grid apply. The 200-line normalizer trap
        // inside applyLiveRuntimeSnapshot CAN throw after state.alignMode
        // is set but BEFORE syncAlignModePanel runs — leaving the body
        // class `.align-mode-active` un-toggled, so renderRoomOverlay
        // never fires (overlay starts empty after replaceChildren and
        // CSS keeps display:none). Visible to the user as: align-mode
        // toggle on → polygons don't appear; align-mode toggle off →
        // polygons that DID appear (via drag re-renders) stay visible.
        // Eagerly applying alignMode + syncAlignModePanel guarantees
        // the class toggle + renderRoomOverlay regardless of whether
        // the slow-path completes.
        try {
          const pollSnap = envelope.snapshot;
          const pollRuntime = pollSnap?.runtime;
          let nextAlign = null;
          if (typeof pollSnap?.alignMode === "boolean") {
            nextAlign = pollSnap.alignMode;
          } else if (typeof pollRuntime?.alignMode === "boolean") {
            nextAlign = pollRuntime.alignMode;
          }
          if (nextAlign !== null && ctx.state) {
            ctx.state.alignMode = nextAlign;
            if (typeof ctx.syncAlignModePanel === "function") {
              ctx.syncAlignModePanel();
            }
          }
        } catch (err) {
          console.warn("[align-toggle] poll eager-apply failed:", err?.message || err);
        }
        const applied = applyLiveRuntimeSnapshot(envelope.snapshot, {
          version: incomingVersion,
          mutationEnvelope: null,
          mutationType: "snapshot-poll",
        });
        if (applied) {
          // Mark that the first server-driven snapshot has been applied
          ctx.liveSync.firstServerSnapshotApplied = true;
          ctx.resolvePendingMutationsByVersion(incomingVersion);
        }
      }
      liveSync.pollBackoffMs = 0;
      const hasPending = liveSync.pendingMutations.size > 0;
      if (!hasPending && ctx.triggerFeedback && ctx.getOutputRole() === ctx.OUTPUT_ROLE_CONTROL) {
        if (ctx.triggerFeedback.textContent?.includes("Pending:")) {
          ctx.triggerFeedback.textContent = "Status: snapshot synchronized";
        }
      }
      ctx.scheduleNextLiveSnapshotPoll();
    } catch {
      const nextBackoff = liveSync.pollBackoffMs > 0 ? Math.min(ctx.LIVE_POLL_MAX_BACKOFF_MS, Math.floor(liveSync.pollBackoffMs * 2)) : 400;
      const jitter = Math.floor(Math.random() * 120);
      liveSync.pollBackoffMs = Math.min(ctx.LIVE_POLL_MAX_BACKOFF_MS, nextBackoff + jitter);
      ctx.scheduleNextLiveSnapshotPoll(liveSync.pollBackoffMs);
    } finally {
      liveSync.pollInFlight = false;
    }
  }

  async function emitLiveMutation(mutationType, payload = {}) {
    const liveSync = ctx.liveSync;
    const normalizedPayload = ctx.normalizeLiveMutationPayload(mutationType, payload);
    const mutationId = `cmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const queuedAt = Date.now();
    if (mutationType === "context-update") {
      for (const [pendingMutationId, entry] of liveSync.pendingMutations.entries()) {
        if (entry?.mutationType === "context-update") {
          liveSync.pendingMutations.delete(pendingMutationId);
        }
      }
    }
    liveSync.pendingMutations.set(mutationId, {
      mutationId,
      mutationType,
      queuedAt,
      acceptedVersion: null,
    });
    ctx.recordMutationTrace(mutationId, "command_emit");
    try {
      let ack = null;
      for (let attempt = 1; attempt <= ctx.LIVE_COMMAND_RETRY_MAX_ATTEMPTS; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => {
          controller.abort();
        }, ctx.LIVE_COMMAND_TIMEOUT_MS);
        try {
          const response = await fetch("/api/live/command", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              accept: "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({
              mutationId,
              mutationType,
              role: ctx.getOutputRole(),
              clientId: liveSync.clientId ?? undefined,
              payload: {
                ...normalizedPayload,
                retryAttempt: attempt,
                retryMaxAttempts: ctx.LIVE_COMMAND_RETRY_MAX_ATTEMPTS,
              },
            }),
          });
          if (!response.ok) {
            const serverError = new Error(`command rejected (${response.status})`);
            serverError.status = response.status;
            throw serverError;
          }
          ack = await response.json();
          break;
        } catch (error) {
          const timeoutLike = error instanceof DOMException && error.name === "AbortError";
          const status = Number(error?.status);
          const retryable = timeoutLike || (Number.isFinite(status) && status >= 500);
          if (!retryable || attempt >= ctx.LIVE_COMMAND_RETRY_MAX_ATTEMPTS) {
            throw error;
          }
          const backoffMs = Math.min(1200, Math.round(ctx.LIVE_COMMAND_RETRY_BASE_DELAY_MS * (2 ** (attempt - 1))));
          ctx.recordMutationTrace(mutationId, `command_retry_${attempt}`);
          await new Promise((resolve) => {
            window.setTimeout(resolve, backoffMs);
          });
        } finally {
          window.clearTimeout(timeoutId);
        }
      }
      if (!ack) {
        throw new Error("command acknowledgement missing");
      }
      liveSync.lastCommandAcceptedAt = Date.now();
      if (Number.isFinite(Number(ack?.version))) {
        const version = Number(ack.version);
        liveSync.lastCommandAcceptedVersion = Math.max(liveSync.lastCommandAcceptedVersion, version);
        liveSync.lastSessionVersion = Math.max(liveSync.lastSessionVersion, version);
        const pendingEntry = liveSync.pendingMutations.get(mutationId);
        if (pendingEntry) {
          pendingEntry.acceptedVersion = version;
          liveSync.pendingMutations.set(mutationId, pendingEntry);
        }
      }
      ctx.recordMutationTrace(mutationId, "command_accepted");
      liveSync.preferFastPollingUntil = Date.now() + 2000;
      ctx.scheduleNextLiveSnapshotPoll(0);
      return ack;
    } catch (error) {
      const timeoutLike = error instanceof DOMException && error.name === "AbortError";
      const statusDetail = timeoutLike
        ? `Status: ${mutationType} command timed out after ${ctx.LIVE_COMMAND_TIMEOUT_MS}ms`
        : `Status: ${mutationType} command failed`;
      const backgroundContextSync = mutationType === "context-update"
        && String(payload?.reason || "").includes("room-draft-sync");
      if (ctx.getOutputRole() === ctx.OUTPUT_ROLE_CONTROL && !backgroundContextSync) {
        ctx.reportActionError(statusDetail, {
          toastText: timeoutLike
            ? `Command timeout: ${mutationType} did not respond`
            : `Command failed: ${mutationType}`,
          dedupeKey: `command-${mutationType}-${timeoutLike ? "timeout" : "failed"}`,
        });
      }
      liveSync.pendingMutations.delete(mutationId);
      throw error;
    }
  }

  function applyLiveRuntimeSnapshot(snapshot, { version = null, mutationEnvelope = null, mutationType = null } = {}) {
    const state = ctx.state;
    const liveSync = ctx.liveSync;
    const numericVersion = Number.isFinite(version) ? Number(version) : null;
    const envelopeVersion = Number.isFinite(Number(mutationEnvelope?.serverVersion))
      ? Number(mutationEnvelope.serverVersion)
      : null;
    const effectiveVersion = envelopeVersion ?? numericVersion;
    if (!ctx.shouldApplyMutationEnvelope(version, mutationEnvelope)) {
      return false;
    }
    const runtime = snapshot?.runtime;
    if (!runtime || typeof runtime !== "object") {
      return false;
    }
    // Phase-31 h44 (2026-05-06): hoist alignMode + syncAlignModePanel to
    // the TOP of applyLiveRuntimeSnapshot, BEFORE the throw-prone 200-line
    // normalizer block. Same root cause as h43's eager grid apply: any
    // throw in the normalizers (polygons, FX, runningAnimations, audio)
    // is silently swallowed by the outer message-handler try/catch, so
    // syncAlignModePanel down the line never runs — the body class
    // `.align-mode-active` never toggles, renderRoomOverlay never fires,
    // and align-mode UI looks broken on /output/. Three user-visible
    // symptoms collapse to this single bug: align-toggle ON without
    // polygons appearing, polygons appearing only after the first
    // transformation (the drag's broadcast fires renderRoomOverlay via
    // h37), and align-toggle OFF leaving polygons stuck visible. The
    // hoisted block is wrapped in its own try/catch so any throw here
    // doesn't block the rest of the function. syncAlignModePanel is
    // idempotent (its `_lastAlignModeState` gate fires onAlignModeChanged
    // only on real transitions), so a no-op call when state already
    // matched is harmless.
    try {
      let nextAlign = null;
      if (typeof snapshot?.alignMode === "boolean") {
        nextAlign = snapshot.alignMode;
      } else if (typeof runtime.alignMode === "boolean") {
        nextAlign = runtime.alignMode;
      }
      if (nextAlign !== null) {
        state.alignMode = nextAlign;
        if (typeof ctx.syncAlignModePanel === "function") {
          ctx.syncAlignModePanel();
        }
      }
    } catch (err) {
      console.warn("[align-toggle] hoisted apply failed:", err?.message || err);
    }
    const sharedOutsideFxByBoard =
      snapshot?.outsideFxByBoard && typeof snapshot.outsideFxByBoard === "object"
        ? snapshot.outsideFxByBoard
        : runtime?.outsideFxByBoard && typeof runtime.outsideFxByBoard === "object"
          ? runtime.outsideFxByBoard
          : null;
    const sharedInsideFxByBoard =
      snapshot?.insideFxByBoard && typeof snapshot.insideFxByBoard === "object"
        ? snapshot.insideFxByBoard
        : runtime?.insideFxByBoard && typeof runtime.insideFxByBoard === "object"
          ? runtime.insideFxByBoard
          : null;
    const sharedRoomFxByBoard =
      snapshot?.roomFxByBoard && typeof snapshot.roomFxByBoard === "object"
        ? snapshot.roomFxByBoard
        : runtime?.roomFxByBoard && typeof runtime.roomFxByBoard === "object"
          ? runtime.roomFxByBoard
          : null;
    const selectedBoard =
      (typeof snapshot?.selectedBoard === "string" && snapshot.selectedBoard) ||
      (typeof snapshot?.selectedLayout === "string" && snapshot.selectedLayout) ||
      (typeof runtime.selectedBoard === "string" && runtime.selectedBoard) ||
      (typeof runtime.selectedLayout === "string" && runtime.selectedLayout) ||
      (typeof runtime.boardId === "string" && runtime.boardId) ||
      (Array.isArray(runtime.runningAnimations)
        ? runtime.runningAnimations.reduce((first, animation) => {
          if (first) {
            return first;
          }
          const animationBoardId = typeof animation?.boardId === "string" ? animation.boardId.trim() : "";
          return animationBoardId || "";
        }, "")
        : "") ||
      state.boardId;
    state.boardId = selectedBoard;
    state.selectedBoard = selectedBoard;
    state.selectedLayout =
      (typeof snapshot?.selectedLayout === "string" && snapshot.selectedLayout) ||
      (typeof runtime.selectedLayout === "string" && runtime.selectedLayout) ||
      selectedBoard;
    state.selectedRoomId = runtime.selectedRoomId ?? state.selectedRoomId;
    state.selectedRoomByBoard =
      runtime.selectedRoomByBoard && typeof runtime.selectedRoomByBoard === "object"
        ? runtime.selectedRoomByBoard
        : state.selectedRoomByBoard;
    const polygonContract = ctx.polygonContract;
    const BOARDS = ctx.getBoards();
    if (polygonContract?.applySnapshotPolygonState) {
      const polygonHydration = polygonContract.applySnapshotPolygonState({
        state,
        snapshot,
        runtime,
        boardIds: BOARDS.map((board) => board.id),
        shipPolygonDefault: ctx.SHIP_POLYGON_DEFAULT,
      });
      if (polygonHydration && typeof polygonHydration === "object") {
        state.playAreasByBoard = polygonHydration.playAreasByBoard ?? state.playAreasByBoard;
        state.selectedPlayAreaIdByBoard = polygonHydration.selectedPlayAreaIdByBoard ?? state.selectedPlayAreaIdByBoard;
        ctx.reportCanonicalPolygonIssues(polygonHydration.issues, {
          sourceLabel: "live-snapshot",
        });
        state.shipPolygonsByBoard = Object.fromEntries(
          BOARDS.map((board) => [board.id, ctx.normalizeShipPolygon(ctx.getSelectedPlayArea(board.id)?.polygon ?? ctx.SHIP_POLYGON_DEFAULT)]),
        );
      }
    }
    if (sharedOutsideFxByBoard) {
      // The server's snapshot patch for an outside-related
      // mutation sometimes only carries a partial profile (e.g., just
      // { enabled, selectedAnimationId }). If we normalized that as-is,
      // normalizeOutsideFxProfile would repopulate the `animations` array
      // from the hard-coded defaults — silently discarding any edits
      // the user made (speed/intensity/direction/etc). Preserve the
      // local `animations` when the incoming profile is missing them.
      state.outsideFxByBoard = {
        ...state.outsideFxByBoard,
        ...Object.fromEntries(
          BOARDS.map((board) => {
            const incoming = sharedOutsideFxByBoard[board.id];
            const local = state.outsideFxByBoard[board.id];
            const hasIncomingAnimations = incoming
              && Array.isArray(incoming.animations)
              && incoming.animations.length > 0;
            const hasLocalAnimations = local
              && Array.isArray(local.animations)
              && local.animations.length > 0;
            const effective =
              incoming
                ? (hasIncomingAnimations || !hasLocalAnimations
                  ? incoming
                  : { ...incoming, animations: local.animations })
                : local;
            return [board.id, ctx.normalizeOutsideFxProfile(effective)];
          }),
        ),
      };
    }
    if (sharedInsideFxByBoard) {
      state.insideFxByBoard = {
        ...state.insideFxByBoard,
        ...Object.fromEntries(
          BOARDS.map((board) => [
            board.id,
            ctx.normalizeInsideFxProfile(sharedInsideFxByBoard[board.id] ?? state.insideFxByBoard[board.id]),
          ]),
        ),
      };
    }
    if (sharedRoomFxByBoard) {
      state.roomFxByBoard = {
        ...state.roomFxByBoard,
        ...Object.fromEntries(
          BOARDS.map((board) => [
            board.id,
            ctx.normalizeRoomFxProfile(sharedRoomFxByBoard[board.id] ?? state.roomFxByBoard?.[board.id]),
          ]),
        ),
      };
    }
    ctx.observeGlobalStopRevisions(runtime);
    ctx.observeGlobalClearRevision(runtime);
    if (mutationType === "clear-all") {
      liveSync.activeSeenOneShotRunByTriggerRevision.clear();
      liveSync.lastObservedGlobalClearRevision = Math.max(
        Number(liveSync.lastObservedGlobalClearRevision) || 0,
        1,
      );
    }
    const previousAnimationsById = new Map(
      state.runningAnimations
        .filter((animation) => animation && typeof animation.id === "string")
        .map((animation) => [animation.id, animation]),
    );
    const boardBoundRunningAnimations = ctx.filterRunningAnimationsForBoard(runtime.runningAnimations, selectedBoard);
    const primedRunningAnimations = ctx.primeGlobalTriggerRuntimeTimestamps(boardBoundRunningAnimations, previousAnimationsById);
    const reconciledRunningAnimations = ctx.reconcileHydratedAnimations(primedRunningAnimations);
    const retainedRunningAnimations = ctx.retainActiveSeenOneShotRuns(reconciledRunningAnimations);
    state.runningAnimations = ctx.hydrateRunningAnimationStartTimestamps(retainedRunningAnimations);
    // The outside-fx running mirror is created locally by
    // syncOutsideRuntimeMirror and never round-tripped through the
    // server (the mirror is a per-client placeholder for Live-Editor
    // edits, not a real broadcast trigger). Snapshot apply just wiped
    // it. On CONTROL the next syncRuntimePanelsFromState rebuilds it
    // (gated below at line ~411), but on /output/ that path is skipped,
    // so the mirror stays missing — and drawOutsideFxLayer's
    // pickInstance("speed", def.speed) falls back from the mirror's
    // hardcoded speed=1 to the user's slider value, which then enters
    // the outside-space velocity formula twice (in `age` and in
    // `speedFactor`) producing a roughly quadratic speedup. Rebuild
    // the mirror inline on every role so /output/ stays in sync.
    if (typeof ctx.syncOutsideRuntimeMirror === "function") {
      ctx.syncOutsideRuntimeMirror(state.boardId);
    }
    // Eagerly warm any GIF asset referenced by an incoming animation so
    // /output/ on a Pi doesn't have to lazy-decode after the first frame
    // request (which routinely missed short animations entirely because
    // decode latency exceeded the animation's lifetime).
    if (typeof ctx.warmGifAssetPath === "function") {
      for (const animation of state.runningAnimations) {
        if (animation?.roomAssetType === "gif" && typeof animation.roomAssetRef === "string" && animation.roomAssetRef) {
          ctx.warmGifAssetPath(animation.roomAssetRef, { reason: "trigger" });
        }
      }
    }
    // Preserve local-only edits (live editor) for animations that already
    // existed before this snapshot — but only on the control client and
    // only when the snapshot is NOT from an edit-room mutation (which
    // carries the authoritative edited values for all clients).
    if (ctx.getOutputRole() === ctx.OUTPUT_ROLE_CONTROL && mutationType !== "edit-room") {
      const LOCAL_EDIT_FIELDS = ["opacity", "intensity", "speed", "playbackSpeed", "soundVolume",
        "rotationDeg", "stretchToPolygon", "widthScale", "heightScale", "offsetXScale", "offsetYScale", "colorHex"];
      for (const animation of state.runningAnimations) {
        const previous = previousAnimationsById.get(animation.id);
        if (!previous) continue;
        for (const field of LOCAL_EDIT_FIELDS) {
          if (previous[field] !== undefined) {
            animation[field] = previous[field];
          }
        }
      }
    }
    ctx.reconcileStopPendingFromSnapshot();
    if (ctx.getOutputRole() !== ctx.OUTPUT_ROLE_CONTROL && runtime.roomDraft && typeof runtime.roomDraft === "object") {
      state.roomDraft = {
        ...state.roomDraft,
        ...runtime.roomDraft,
      };
    }
    state.animationSpeed = ctx.clampAnimationSpeed(runtime.animationSpeed ?? state.animationSpeed);
    if (runtime.audio && typeof runtime.audio === "object") {
      state.audio.enabled = Boolean(runtime.audio.enabled);
      state.audio.volume = ctx.clampAudioVolumePercent(Math.round(Number(runtime.audio.volume ?? state.audio.volume) * 100)) / 100;
    }
    if (runtime.mp4Performance && typeof runtime.mp4Performance === "object") {
      state.runtimePerf.mp4Controls = ctx.normalizeMp4PerformanceControls(runtime.mp4Performance);
      ctx.syncMp4PerformanceControlsPanel();
    }
    if (typeof snapshot?.alignMode === "boolean") {
      state.alignMode = snapshot.alignMode;
    } else if (typeof runtime.alignMode === "boolean") {
      state.alignMode = runtime.alignMode;
    }

    // Phase-31 h40 (2026-05-06): apply runtime.lastAlignGridSnapshot from
    // the snapshot envelope. This is the server-recorded latest broadcast
    // grid (from any client). On a fresh client connect / live-hello,
    // we receive the latest known grid and snap to it — even if the
    // broadcast originally fanout'd while we were offline. Without this,
    // a SSR Chromium tab that boots AFTER Pi has loaded its profile
    // misses Pi's broadcast (WS not yet connected) and renders the
    // streamed warped board against its own default grid, while Pi
    // shows lines at the profile's grid → user-reported entry-time
    // desync where lines + warped board don't match. Idempotent: the
    // _lastAppliedAlignGridSnapshotKey gate prevents repeated apply
    // of the same snapshot during regular polls.
    if (
      ctx.getOutputRole?.() === ctx.OUTPUT_ROLE_FINAL
      && runtime.lastAlignGridSnapshot
      && typeof runtime.lastAlignGridSnapshot === "object"
    ) {
      try {
        const snap = runtime.lastAlignGridSnapshot;
        const snapAt = snap.at ? Date.parse(snap.at) : 0;
        const snapKey = `${snap.at || ""}:${snap.profileId || ""}:${snap.points?.length || 0}`;
        const localClientId = ctx?.liveSync?.clientId ?? null;
        const isOriginator = !!localClientId && snap.originatorClientId === localClientId;
        const acceptable =
          Array.isArray(snap.srcXs) && Array.isArray(snap.srcYs)
          && Array.isArray(snap.points)
          && Number.isFinite(snapAt)
          && !isOriginator;
        if (acceptable && state._lastAppliedAlignGridSnapshotKey !== snapKey) {
          // Phase 38 W9 (2026-05-11): set the snap-key gate AFTER the apply,
          // not before. The previous (pre-W9) order set the key before the
          // gridState-readiness check — so when gridState was null (window
          // global not yet attached during very-early boot, or a transient
          // module-reset window), the key was marked applied even though
          // restoreGridSnapshot never ran. Subsequent broadcasts/polls
          // carrying the SAME `at` snap (e.g. the 1Hz poll repeating the
          // same lastAlignGridSnapshot until a new mutation lands) would
          // see the key matching and SKIP — leaving the grid stuck at the
          // earlier state. The fast-path at L986 doesn't use this gate so
          // it still applies new broadcasts; but the slow-path + poll
          // cooperate via the key, and the bug could create a window
          // where the only authoritative server snapshot doesn't reach
          // the grid until a NEW broadcast (new `at`) arrives.
          const gridState = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
          if (gridState && typeof gridState.restoreGridSnapshot === "function") {
            const points2D = [];
            for (let r = 0; r < snap.srcYs.length; r++) {
              points2D[r] = [];
              for (let c = 0; c < snap.srcXs.length; c++) {
                points2D[r][c] = { x: snap.srcXs[c], y: snap.srcYs[r] };
              }
            }
            for (const pt of snap.points) {
              if (
                Number.isInteger(pt.row) && Number.isInteger(pt.col)
                && points2D[pt.row] && points2D[pt.row][pt.col]
              ) {
                points2D[pt.row][pt.col] = { x: pt.x, y: pt.y };
              }
            }
            gridState.restoreGridSnapshot({
              srcXs: snap.srcXs.slice(),
              srcYs: snap.srcYs.slice(),
              points: points2D,
            });
            state._lastAppliedAlignGridSnapshotKey = snapKey;
            _redrawHandlesAfterCornerDrag();
            console.log(
              `[align-grid-snapshot] slow-path apply OK `
              + `dims=${snap.srcYs.length}×${snap.srcXs.length} `
              + `profile=${snap.profileId} `
              + `at=${snap.at}`,
            );
          } else {
            // Phase 38 W9: gridState not yet attached. Do NOT set the key —
            // the next poll/broadcast carrying the same `at` must be allowed
            // to retry the apply once gridState becomes available.
            console.warn(
              `[align-grid-snapshot] slow-path skipped: gridState not ready `
              + `(profile=${snap.profileId} at=${snap.at}) — key NOT set, will retry`,
            );
          }
        }
      } catch (err) {
        console.warn("[align-grid-snapshot] snapshot apply failed:", err?.message || err);
      }
    }

    // Phase-31 h18 (2026-05-06): apply align-corner-drag from the live
    // mutation envelope. The Pi receiver forwards pointer events as
    // align-corner-drag mutations; server records them on
    // runtime.lastAlignCornerDrag and broadcasts. The SSR tab is the
    // ONLY renderer that needs to act — when alignMode is on AND the
    // drag carries a fresher timestamp than what we last applied, we
    // map vertexId 0/1/2/3 to the four grid corners and update the
    // mesh-warp profile. The result flows back to the Pi via the next
    // streamed frame, completing the round-trip the user expects to
    // feel like local rendering.
    if (
      ctx.getOutputRole?.() === ctx.OUTPUT_ROLE_FINAL
      && runtime.lastAlignCornerDrag
      && typeof runtime.lastAlignCornerDrag === "object"
    ) {
      try {
        const drag = runtime.lastAlignCornerDrag;
        const dragKey = `${drag.at || ""}:${drag.vertexId}:${drag.phase}`;
        // h21b: gate against stale-drag replay on boot. Without these,
        // the server's persisted runtime.lastAlignCornerDrag from the
        // PREVIOUS session is applied to the freshly-loaded profile,
        // mutating its grid → "Unsaved" badge → align mode blocked.
        const dragAt = drag.at ? Date.parse(drag.at) : 0;
        const ageMs = Number.isFinite(dragAt) ? Date.now() - dragAt : Infinity;
        const alignActive = Boolean(state.alignMode);
        // h22: also reject drags that predate the page load. A server-
        // persisted alignMode=true + lastAlignCornerDrag from a prior
        // session would otherwise pass the alignActive+age gates and
        // silently mutate the freshly-loaded profile → dirty flag.
        const dragArrivedAfterLoad = Number.isFinite(dragAt) && dragAt >= _pageLoadAtMs;
        const acceptable = ageMs <= 5000 && alignActive && dragArrivedAfterLoad;
        if (acceptable && state._lastAppliedAlignCornerDragKey !== dragKey) {
          state._lastAppliedAlignCornerDragKey = dragKey;
          const gridState = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
          if (gridState) {
            const grid = gridState.getGrid?.();
            if (grid && Array.isArray(grid.srcXs) && Array.isArray(grid.srcYs)) {
              const lastRow = Math.max(0, grid.srcYs.length - 1);
              const lastCol = Math.max(0, grid.srcXs.length - 1);
              // Vertex IDs match receiver-bootstrap.js:hitTestVertex —
              // 0=TL, 1=TR, 2=BR, 3=BL.
              const cornerByVertex = [
                { row: 0, col: 0 },
                { row: 0, col: lastCol },
                { row: lastRow, col: lastCol },
                { row: lastRow, col: 0 },
              ];
              const corner = cornerByVertex[drag.vertexId];
              const x = Number(drag.normalizedX);
              const y = Number(drag.normalizedY);
              if (
                corner
                && Number.isFinite(x) && Number.isFinite(y)
                && x >= 0 && x <= 1 && y >= 0 && y <= 1
              ) {
                gridState.setPoint(corner.row, corner.col, x, y);
                // applyTransform is the existing hot-path redraw —
                // grid-state owns it, so trigger via the projection
                // mapping module's exposed API.
                const proj = window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING;
                if (proj && typeof proj.applyTransform === "function") {
                  proj.applyTransform();
                }
                // Phase-31 h29: refresh handles + lines so the SSR
                // tab's encoded frame shows the corners at the new
                // positions (without this, the streamed video shows
                // the warp updating while the line overlay stays
                // frozen at pre-drag positions until the next manual
                // redraw — looks broken to the operator).
                _redrawHandlesAfterCornerDrag();
                // Persist on `end` phase so the new corner survives
                // reload. `start`/`move` phases are transient.
                if (drag.phase === "end") {
                  try { gridState.saveToLocalStorage?.(); } catch {}
                }
              }
            }
          }
        }
      } catch (err) {
        // never let a malformed drag break live-sync apply
        console.warn("[align-corner-drag] apply failed:", err?.message || err);
      }
    }

    if (mutationType === "clear-all" || mutationType === "stop-animation") {
      ctx.hardStopRuntimeEffects({ clearVisuals: true });
    }

    const isFastFinalApply = ctx.getOutputRole() === ctx.OUTPUT_ROLE_FINAL && ctx.isControlCriticalMutationEnvelope(mutationEnvelope);

    ctx.enforceAudioLifecycleGuard();
    ctx.stopSoundsForInactiveAnimations();
    for (const animation of state.runningAnimations) {
      ctx.playSoundForAnimation(animation);
    }

    ctx.syncAlignModePanel();

    if (!isFastFinalApply && ctx.getOutputRole() !== ctx.OUTPUT_ROLE_FINAL) {
      ctx.syncRuntimePanelsFromState();
      ctx.renderRunningAnimationsList();
      ctx.refreshGlobalButtons();
    }
    ctx.renderRoomOverlay();
    if (numericVersion !== null) {
      liveSync.lastSessionVersion = Math.max(liveSync.lastSessionVersion, numericVersion);
    }
    if (effectiveVersion !== null) {
      liveSync.lastAppliedVersion = Math.max(liveSync.lastAppliedVersion, effectiveVersion);
    }
    if (mutationEnvelope?.mutationId) {
      ctx.rememberAppliedMutationId(mutationEnvelope.mutationId);
      ctx.recordMutationTrace(mutationEnvelope.mutationId, "client_apply");
      if (mutationType === "stop-animation" || mutationType === "clear-all") {
        ctx.recordMutationTrace(mutationEnvelope.mutationId, "client_visual_clear");
        ctx.recordMutationTrace(mutationEnvelope.mutationId, "client_audio_stop");
      }
      ctx.sendLiveMutationApplyAck(mutationEnvelope);
    }
    return true;
  }

  function connectLiveSyncSocket() {
    const liveSync = ctx.liveSync;
    try {
      const socket = new WebSocket(ctx.resolveLiveWebSocketUrl());
      const socketGeneration = liveSync.socketGeneration + 1;
      liveSync.socketGeneration = socketGeneration;
      liveSync.socket = socket;
      socket.addEventListener("open", () => {
        if (liveSync.socket !== socket || liveSync.socketGeneration !== socketGeneration) {
          return;
        }
        liveSync.wsConnected = true;
      });
      socket.addEventListener("message", (event) => {
        if (liveSync.socket !== socket || liveSync.socketGeneration !== socketGeneration) {
          return;
        }
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === "live-hello") {
            liveSync.clientId = payload.clientId ?? null;
            liveSync.dirtyHintUntil = Date.now() + 1200;
            // Phase-31 h43 (2026-05-06): apply runtime.lastAlignGridSnapshot
            // EAGERLY here — BEFORE applyLiveRuntimeSnapshot — so the grid
            // is restored even if applyLiveRuntimeSnapshot throws inside
            // its 200+ lines of pre-grid-apply code (polygon hydration,
            // FX normalizers, animations reconciliation). The outer
            // try/catch around this whole message handler silently
            // swallows any such throw ("ignore malformed live-sync
            // payloads"), which is why h40+h41+h42 alone weren't enough
            // — the grid apply at line ~490 is unreachable when an
            // earlier line throws on the freshly-booted SSR tab whose
            // state.* maps are still default-initialized. Guarding the
            // grid apply with its OWN try/catch and running it before
            // applyLiveRuntimeSnapshot decouples grid sync from the
            // success/failure of the rest of the snapshot apply.
            try {
              const helloRuntime = payload?.session?.snapshot?.runtime;
              const helloGridSnap = helloRuntime?.lastAlignGridSnapshot;
              if (
                ctx.getOutputRole?.() === ctx.OUTPUT_ROLE_FINAL
                && helloGridSnap
                && typeof helloGridSnap === "object"
                && Array.isArray(helloGridSnap.srcXs)
                && Array.isArray(helloGridSnap.srcYs)
                && Array.isArray(helloGridSnap.points)
              ) {
                const localClientId = liveSync.clientId;
                const isOriginator =
                  !!localClientId
                  && helloGridSnap.originatorClientId === localClientId;
                if (!isOriginator) {
                  const snapKey =
                    `${helloGridSnap.at || ""}:`
                    + `${helloGridSnap.profileId || ""}:`
                    + `${helloGridSnap.points?.length || 0}`;
                  if (ctx.state._lastAppliedAlignGridSnapshotKey !== snapKey) {
                    const gridState = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
                    if (gridState && typeof gridState.restoreGridSnapshot === "function") {
                      const points2D = [];
                      for (let r = 0; r < helloGridSnap.srcYs.length; r++) {
                        points2D[r] = [];
                        for (let c = 0; c < helloGridSnap.srcXs.length; c++) {
                          points2D[r][c] = {
                            x: helloGridSnap.srcXs[c],
                            y: helloGridSnap.srcYs[r],
                          };
                        }
                      }
                      for (const pt of helloGridSnap.points) {
                        if (
                          Number.isInteger(pt.row) && Number.isInteger(pt.col)
                          && points2D[pt.row] && points2D[pt.row][pt.col]
                        ) {
                          points2D[pt.row][pt.col] = { x: pt.x, y: pt.y };
                        }
                      }
                      gridState.restoreGridSnapshot({
                        srcXs: helloGridSnap.srcXs.slice(),
                        srcYs: helloGridSnap.srcYs.slice(),
                        points: points2D,
                      });
                      ctx.state._lastAppliedAlignGridSnapshotKey = snapKey;
                      _redrawHandlesAfterCornerDrag();
                      console.log(
                        `[align-grid-snapshot] live-hello eager-apply OK `
                        + `profile=${helloGridSnap.profileId} `
                        + `points=${helloGridSnap.points.length}`,
                      );
                    }
                  }
                }
              }
            } catch (err) {
              console.warn(
                "[align-grid-snapshot] live-hello eager-apply failed:",
                err?.message || err,
              );
            }
            // Phase-31 h44: eager alignMode apply (mirrors poll path).
            // See poll handler for rationale — silent throws in the
            // 200-line normalizer trap can bypass state.alignMode +
            // syncAlignModePanel handling and leave the body class
            // un-toggled, so renderRoomOverlay never runs and the
            // align-mode UI looks broken from /output/.
            try {
              const helloSnap = payload?.session?.snapshot;
              const helloRuntime = helloSnap?.runtime;
              let nextAlign = null;
              if (typeof helloSnap?.alignMode === "boolean") {
                nextAlign = helloSnap.alignMode;
              } else if (typeof helloRuntime?.alignMode === "boolean") {
                nextAlign = helloRuntime.alignMode;
              }
              if (nextAlign !== null && ctx.state) {
                ctx.state.alignMode = nextAlign;
                if (typeof ctx.syncAlignModePanel === "function") {
                  ctx.syncAlignModePanel();
                }
              }
            } catch (err) {
              console.warn("[align-toggle] live-hello eager-apply failed:", err?.message || err);
            }
            if (Number.isFinite(payload?.session?.version)) {
              const helloVersion = Number(payload.session.version);
              liveSync.lastSessionVersion = Math.max(liveSync.lastSessionVersion, helloVersion);
              const helloSnapshot = payload?.session?.snapshot;
              if (helloSnapshot && shouldApplySnapshotVersion(helloVersion)) {
                applyLiveRuntimeSnapshot(helloSnapshot, {
                  version: helloVersion,
                  mutationEnvelope: null,
                  mutationType: "live-hello",
                });
              }
              // live-hello is a server snapshot — mark as applied
              ctx.liveSync.firstServerSnapshotApplied = true;
            }
            // Phase 27 (B5): seed alignModeDirtyOnOutput from the hello envelope so the
            // dashboard reflects the current dirty state immediately on connect.
            const helloSnapshotForDirty = payload?.session?.snapshot;
            if (helloSnapshotForDirty && Object.prototype.hasOwnProperty.call(helloSnapshotForDirty, "alignModeDirtyOnOutput")) {
              ctx.state.alignModeDirtyOnOutput = Boolean(helloSnapshotForDirty.alignModeDirtyOnOutput);
              if (typeof ctx.syncAlignModeDirtyDashboardState === "function") {
                ctx.syncAlignModeDirtyDashboardState();
              }
            }
            ctx.scheduleNextLiveSnapshotPoll(0);
          }
          if (payload?.type === "live-session-update") {
            const sessionVersion = Number(payload?.session?.version ?? 0);
            const mutationType = typeof payload?.mutationType === "string" ? payload.mutationType : null;
            const shouldApplyImmediateStopSnapshot =
              mutationType === ctx.STOP_ANIMATION_MUTATION_TYPE
              || mutationType === "clear-all"
              || mutationType === "edit-room"
              || mutationType === "trigger-room"
              // Phase-31 h19 (2026-05-06): align-corner-drag must apply
              // IMMEDIATELY on the SSR tab — anything else makes the drag
              // feel like 1+ second of input lag (snapshot poll cadence).
              // Pi sends drag events at native pointermove rate (~120 Hz);
              // they hit the SSR tab via this path so the streamed warp
              // updates within the next captured frame.
              || mutationType === "align-corner-drag"
              // Phase-31 h30 (2026-05-06): align-grid-snapshot carries
              // the full grid for non-corner gestures (rotate/scale/line/
              // squish/inner-point drag). Same low-latency requirement as
              // align-corner-drag — apply immediately so the stream
              // reflects the gesture within the next encoded frame.
              || mutationType === "align-grid-snapshot"
              // Phase-31 h46 (2026-05-06): context-update carries the
              // alignMode toggle (and other context fields). Without
              // it in this fast-path, align-toggle DISABLE goes via
              // the deferred snapshot poll — which on the SSR tab
              // races with in-flight broadcastGridSnapshot POSTs and
              // can be killed by the AbortError at line ~259. End
              // result: SSR tab never applies enabled=false, so its
              // #room-overlay polygons stay visible in the stream
              // even after the user toggled align-mode off.
              || mutationType === "context-update";
            if (
              shouldApplyImmediateStopSnapshot
              && Number.isFinite(sessionVersion)
              && shouldApplySnapshotVersion(sessionVersion)
              && payload?.session?.snapshot
            ) {
              applyLiveRuntimeSnapshot(payload.session.snapshot, {
                version: sessionVersion,
                mutationEnvelope: payload?.mutationEnvelope ?? null,
                mutationType,
              });
              // Mark that the first server-driven snapshot has been applied
              ctx.liveSync.firstServerSnapshotApplied = true;
            }
            ctx.scheduleNextLiveSnapshotPoll(0);
          }
          // Phase-31 h30 (2026-05-06): direct fast-path for align-grid-snapshot.
          // Mirrors the align-corner-drag fast-path but operates on the
          // FULL grid. The originator (the client whose handle-drag fired
          // the broadcast) MUST skip applying its own broadcast back —
          // otherwise the stale server-roundtripped grid clobbers a fresh
          // local mid-drag state, producing visual judder. We compare
          // the snapshot's originatorClientId against the local
          // liveSync.clientId.
          //
          // h31 (2026-05-06): NO alignMode gate. The grid is just data;
          // applying it when alignMode is off is harmless (handles are
          // hidden, mesh-warp still renders correctly into the canvas).
          // The previous gate caused the very-first broadcast on align-
          // mode entry to be dropped because alignMode hadn't propagated
          // to the receiver yet.
          if (
            payload?.type === "live-session-update"
            && payload?.mutationType === "align-grid-snapshot"
            && ctx.getOutputRole?.() === ctx.OUTPUT_ROLE_FINAL
          ) {
            try {
              const snap = payload?.session?.snapshot?.runtime?.lastAlignGridSnapshot;
              const snapAt = snap?.at ? Date.parse(snap.at) : 0;
              const ageMs = Number.isFinite(snapAt) ? Date.now() - snapAt : Infinity;
              const arrivedAfterLoad = Number.isFinite(snapAt) && snapAt >= _pageLoadAtMs;
              const localClientId = ctx?.liveSync?.clientId ?? null;
              const isOriginator = !!localClientId
                && snap?.originatorClientId === localClientId;
              const accepts =
                snap && typeof snap === "object"
                && Array.isArray(snap.srcXs) && Array.isArray(snap.srcYs)
                && Array.isArray(snap.points)
                && ageMs <= 5000
                && arrivedAfterLoad
                && !isOriginator;
              // Phase 38 (2026-05-11): log EVERY align-grid-snapshot receive
              // unconditionally during diagnosis. Previous rate-limit (first 5
              // + every 30th) masked whether the SSR tab was actually applying
              // single-shot mutations after a burst of drag broadcasts. With
              // unconditional logging, operator/test can deterministically
              // verify the apply path for every broadcast.
              console.log(
                `[align-grid-snapshot] RECV `
                + `ageMs=${Math.round(ageMs)} `
                + `arrivedAfterLoad=${arrivedAfterLoad} `
                + `originator=${snap?.originatorClientId} local=${localClientId} `
                + `isOriginator=${isOriginator} accept=${accepts} `
                + `profile=${snap?.profileId} points=${snap?.points?.length}`,
              );
              _gridSnapApplyLogCount = (_gridSnapApplyLogCount || 0) + 1;
              if (accepts) {
                const gridState = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
                if (gridState && typeof gridState.restoreGridSnapshot === "function") {
                  const points2D = [];
                  for (let r = 0; r < snap.srcYs.length; r++) {
                    points2D[r] = [];
                    for (let c = 0; c < snap.srcXs.length; c++) {
                      points2D[r][c] = { x: snap.srcXs[c], y: snap.srcYs[r] };
                    }
                  }
                  for (const pt of snap.points) {
                    if (
                      Number.isInteger(pt.row) && Number.isInteger(pt.col)
                      && points2D[pt.row] && points2D[pt.row][pt.col]
                    ) {
                      points2D[pt.row][pt.col] = { x: pt.x, y: pt.y };
                    }
                  }
                  gridState.restoreGridSnapshot({
                    srcXs: snap.srcXs.slice(),
                    srcYs: snap.srcYs.slice(),
                    points: points2D,
                  });
                  _redrawHandlesAfterCornerDrag();
                  // 2026-05-15 fix: branch on snap.isBaseline.
                  //
                  // Baseline broadcast (profile-load / discard / new-profile
                  // / silent auto-load) — the dashboard set a fresh baseline
                  // and broadcast it. /output/ should NOT relay dirty=true.
                  // The server-side handler already cleared the dirty flag
                  // on this mutation; here we just recompute the local
                  // _dirty against the new grid (against /output/'s own
                  // _loadedProfileSnapshot which is usually null → false).
                  //
                  // Non-baseline (drag) — the dashboard mutated the grid
                  // via a gesture. /output/ relays dirty=true to the server
                  // via the existing notifyDirtyChanged path; the server
                  // broadcasts alignModeDirtyOnOutput=true to all clients
                  // so the dashboard chip shows "Unsaved on /output/".
                  try {
                    const profilePersist =
                      window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE;
                    if (snap?.isBaseline) {
                      // 2026-05-15 fix: capture this baseline as the LOCAL
                      // loaded profile snapshot. Without this, /output/'s
                      // _loadedProfileSnapshot stayed null after server
                      // restart (or any dashboard-only profile load) and
                      // isDirty() always returned false → Save/Discard
                      // buttons never activated on drag (operator UAT
                      // 2026-05-15). captureRemoteBaseline records the
                      // just-applied grid + profileId so subsequent drags
                      // correctly flip _dirty=true.
                      profilePersist?.captureRemoteBaseline?.(snap?.profileId);
                    } else {
                      profilePersist?.notifyDirtyChanged?.();
                    }
                  } catch (_) {}
                }
              }
            } catch (err) {
              console.warn("[align-grid-snapshot fast-path] apply failed:", err?.message || err);
            }
          }
          // Phase-31 h20 (2026-05-06): direct fast-path for align-corner-drag.
          // The applyLiveRuntimeSnapshot gate has version-tracking and
          // suppression guards that can drop a single drag mid-stream
          // (the pi sends 60+ drags per second; one suppression skip and
          // the user sees no movement). Bypass those gates entirely:
          // align-corner-drag is fire-and-forget and idempotent — applying
          // a stale one is harmless because the next one overwrites.
          if (
            payload?.type === "live-session-update"
            && payload?.mutationType === "align-corner-drag"
            && ctx.getOutputRole?.() === ctx.OUTPUT_ROLE_FINAL
          ) {
            try {
              const drag = payload?.session?.snapshot?.runtime?.lastAlignCornerDrag;
              const dragAt = drag?.at ? Date.parse(drag.at) : 0;
              const ageMs = Number.isFinite(dragAt) ? Date.now() - dragAt : Infinity;
              const alignActive = Boolean(ctx.state?.alignMode);
              const dragArrivedAfterLoad = Number.isFinite(dragAt) && dragAt >= _pageLoadAtMs;
              const accepts = drag && typeof drag === "object" && ageMs <= 5000 && alignActive && dragArrivedAfterLoad;
              // Phase-31 h24 (2026-05-06): one-line probe so the operator
              // can see in the SSR-tab console exactly why a drag was
              // accepted or rejected. Logs only on phase=start/end so
              // we don't spam during a continuous drag (move events fire
              // 60+ Hz).
              if (drag?.phase === "start" || drag?.phase === "end" || !accepts) {
                console.log(
                  `[align-fast-path] phase=${drag?.phase} v=${drag?.vertexId} `
                  + `xy=(${drag?.normalizedX?.toFixed(3)},${drag?.normalizedY?.toFixed(3)}) `
                  + `ageMs=${Math.round(ageMs)} alignActive=${alignActive} `
                  + `arrivedAfterLoad=${dragArrivedAfterLoad} accept=${accepts}`,
                );
              }
              if (accepts) {
                const gridState = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
                const grid = gridState?.getGrid?.();
                if (grid && Array.isArray(grid.srcXs) && Array.isArray(grid.srcYs)) {
                  const lastRow = Math.max(0, grid.srcYs.length - 1);
                  const lastCol = Math.max(0, grid.srcXs.length - 1);
                  const cornerByVertex = [
                    { row: 0, col: 0 },
                    { row: 0, col: lastCol },
                    { row: lastRow, col: lastCol },
                    { row: lastRow, col: 0 },
                  ];
                  const corner = cornerByVertex[drag.vertexId];
                  const x = Number(drag.normalizedX);
                  const y = Number(drag.normalizedY);
                  if (
                    corner
                    && Number.isFinite(x) && Number.isFinite(y)
                    && x >= 0 && x <= 1 && y >= 0 && y <= 1
                  ) {
                    gridState.setPoint(corner.row, corner.col, x, y);
                    // Phase-31 h29: also refresh the handle/line overlay
                    // so the streamed encoded frame on the SSR tab shows
                    // the corner under the user's drag in real time.
                    // The fast-path reaches here ahead of the slow-path's
                    // applyLiveRuntimeSnapshot redraw, so doing it here
                    // ensures even high-rate drag (60 Hz) feels live.
                    _redrawHandlesAfterCornerDrag();
                    if (drag.phase === "end") {
                      try { gridState.saveToLocalStorage?.(); } catch {}
                    }
                  }
                }
              }
            } catch (err) {
              console.warn("[align-corner-drag fast-path] apply failed:", err?.message || err);
            }
          }
          if (payload?.type === "state-dirty" || payload?.wake === true) {
            liveSync.dirtyHintUntil = Date.now() + 1500;
            ctx.scheduleNextLiveSnapshotPoll(0);
          }
          if (payload?.type === "global-config-update") {
            // Phase 28 B5: when the broadcast target is the asset manifest,
            // refetch /api/resources and update the client manifest mirror
            // independently of the localConfigDirty / suppress gates above —
            // those gates protect global-defaults user state, not asset URLs.
            if (payload.target === "config/asset-manifest.json") {
              void (async () => {
                try {
                  const resp = await fetch("/api/resources");
                  if (!resp.ok) return;
                  const body = await resp.json();
                  const m = window.TT_BEAMER_RUNTIME_ASSET_MANIFEST;
                  const gifPlayback = window.TT_BEAMER_RUNTIME_GIF_PLAYBACK;
                  if (m && typeof m.setManifest === "function" && body && typeof body.hashByPath === "object") {
                    // Phase 30 B2 Candidate C: capture pre-update hashes for
                    // every GIF cache entry so we can invalidate after the
                    // manifest swap. Symmetric to the MP4 path which checks
                    // currentAbs vs desiredAbs at runtime-outside-mp4.js:75-94.
                    const preUpdateHashes = new Map();
                    if (gifPlayback && typeof gifPlayback.getGifPlaybackCacheEntry === "function") {
                      for (const path of Object.keys(body.hashByPath)) {
                        const priorResolve = m.resolveAssetUrlWithHash?.(path) ?? path;
                        preUpdateHashes.set(path, priorResolve);
                      }
                    }
                    m.setManifest(body.hashByPath);
                    if (gifPlayback && typeof gifPlayback.invalidateGifCacheForPath === "function") {
                      for (const [path, priorUrl] of preUpdateHashes) {
                        const newUrl = m.resolveAssetUrlWithHash?.(path) ?? path;
                        if (priorUrl !== newUrl) {
                          gifPlayback.invalidateGifCacheForPath(path);
                        }
                      }
                    }
                  }
                } catch (err) {
                  console.warn(
                    "[asset-manifest] sync after broadcast failed:",
                    err?.message || err,
                  );
                }
              })();
            }
            if (ctx.state.localConfigDirty) {
              ctx.state.remoteConfigUpdateAwaiting = true;
              ctx.refreshApplyDiscardButtonsUi();
            } else if (ctx.shouldSuppressBroadcastReapply()) {
              // Our own save just broadcast this — skip re-fetch to
              // avoid overwriting local state changes in progress.
            } else if (
              // Phase-31 h24 (2026-05-06): on the SSR Chromium tab, skip
              // the cross-port API_UNREACHABLE-ridden refetch entirely.
              // The broadcast envelope already carries the full updated
              // snapshot; the SSR tab can apply directly from
              // payload.session.snapshot without HTTP round-tripping
              // through the port-fallback gauntlet (which under heavy
              // GIF decoding reliably times out → spammy
              // [global-config] broadcast refetch failed errors).
              ctx.getOutputRole?.() === ctx.OUTPUT_ROLE_FINAL
              && payload?.session?.snapshot
            ) {
              try {
                const runtimeExtras = payload.session.snapshot;
                if (typeof ctx.applyGlobalDefaultsPayloadToState === "function") {
                  // Use the snapshot itself as the payload; runtime fields
                  // ride on session.snapshot in the same shape applyGlobalDefaults
                  // expects (Phase 27 B5).
                  ctx.applyGlobalDefaultsPayloadToState(runtimeExtras, runtimeExtras);
                }
                if (typeof ctx.syncDiagnosticOverlayPanel === "function") {
                  ctx.syncDiagnosticOverlayPanel();
                }
              } catch (err) {
                console.warn("[global-config] in-envelope apply failed:", err?.message || err);
              }
            } else {
              void (async () => {
                try {
                  const loaded = await ctx.fetchGlobalDefaultsPayload();
                  // Phase 27 (B5): also propagate runtime-session fields from the envelope
                  // (alignModeDirtyOnOutput rides on session.snapshot, not global-defaults.json).
                  const runtimeExtras = payload?.session?.snapshot || null;
                  ctx.applyGlobalDefaultsPayloadToState(loaded.payload, runtimeExtras);
                  // Phase 30 B3 (Plan 30-01 Task 3 CASE D): explicit /output/-role
                  // fallback panel-sync. Probe-trace UAT (Task 2) confirmed that on
                  // /output/, hop5a fires (state.diagnosticOverlay flips) but hop5c
                  // (syncDiagnosticOverlayPanel → document.body.dataset write) never
                  // fires through the syncRuntimePanelsFromState() path, so the chip
                  // never updates. Calling it directly here for the final-output role
                  // closes the gap. Dashboard role keeps the existing path untouched.
                  if (
                    ctx.getOutputRole?.() === ctx.OUTPUT_ROLE_FINAL
                    && typeof ctx.syncDiagnosticOverlayPanel === "function"
                  ) {
                    ctx.syncDiagnosticOverlayPanel();
                  }
                  ctx.syncRuntimePanelsFromState();
                  ctx.renderRunningAnimationsList();
                  ctx.refreshGlobalButtons();
                  if (ctx.globalDefaultsStatus) {
                    ctx.globalDefaultsStatus.textContent =
                      `Global config: updated from peer (${loaded.endpoint || "server"})`;
                  }
                } catch (refetchError) {
                  console.warn(
                    "[global-config] broadcast refetch failed:",
                    refetchError?.message || refetchError,
                  );
                }
              })();
            }
          }
        } catch {
          // ignore malformed live-sync payloads
        }
      });
      socket.addEventListener("close", () => {
        if (liveSync.socket !== socket || liveSync.socketGeneration !== socketGeneration) {
          return;
        }
        liveSync.wsConnected = false;
        window.setTimeout(connectLiveSyncSocket, 1200);
      });
      socket.addEventListener("error", () => {
        if (liveSync.socket !== socket || liveSync.socketGeneration !== socketGeneration) {
          return;
        }
        liveSync.wsConnected = false;
      });
    } catch {
      liveSync.wsConnected = false;
    }
  }

  window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE = {
    init,
    shouldApplySnapshotVersion,
    pollLiveSnapshotOnce,
    emitLiveMutation,
    applyLiveRuntimeSnapshot,
    connectLiveSyncSocket,
  };
})();
