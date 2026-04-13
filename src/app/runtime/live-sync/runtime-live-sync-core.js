// Phase 14-2: live-sync core module.
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
        const applied = applyLiveRuntimeSnapshot(envelope.snapshot, {
          version: incomingVersion,
          mutationEnvelope: null,
          mutationType: "snapshot-poll",
        });
        if (applied) {
          // Phase 18: mark that the first server-driven snapshot has been applied
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
      state.outsideFxByBoard = {
        ...state.outsideFxByBoard,
        ...Object.fromEntries(
          BOARDS.map((board) => [
            board.id,
            ctx.normalizeOutsideFxProfile(sharedOutsideFxByBoard[board.id] ?? state.outsideFxByBoard[board.id]),
          ]),
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
              || mutationType === "trigger-room";
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
              // Phase 18: mark that the first server-driven snapshot has been applied
              ctx.liveSync.firstServerSnapshotApplied = true;
            }
            ctx.scheduleNextLiveSnapshotPoll(0);
          }
          if (payload?.type === "state-dirty" || payload?.wake === true) {
            liveSync.dirtyHintUntil = Date.now() + 1500;
            ctx.scheduleNextLiveSnapshotPoll(0);
          }
          if (payload?.type === "global-config-update") {
            if (ctx.state.localConfigDirty) {
              ctx.state.remoteConfigUpdateAwaiting = true;
              ctx.refreshApplyDiscardButtonsUi();
            } else if (ctx.shouldSuppressBroadcastReapply()) {
              // Our own save just broadcast this — skip re-fetch to
              // avoid overwriting local state changes in progress.
            } else {
              void (async () => {
                try {
                  const loaded = await ctx.fetchGlobalDefaultsPayload();
                  ctx.applyGlobalDefaultsPayloadToState(loaded.payload);
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
