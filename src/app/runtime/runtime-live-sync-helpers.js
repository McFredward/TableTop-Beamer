// Phase 14-2: live-sync helpers module.
//
// Owns the mutation payload normalizer, the outside-FX + room-draft
// outbound mutation emitters, the terminal one-shot replay guards,
// the hydrate timestamp rewriter, and the ACK / envelope gate
// helpers. Does NOT own applyLiveRuntimeSnapshot or
// connectLiveSyncSocket — those stay in runtime-orchestration.js
// until their downstream deps are extracted too.
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;
  let roomDraftSyncTimerId = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function normalizeLiveMutationPayload(mutationType, payload = {}) {
    const state = ctx.state;
    const nextPayload = payload && typeof payload === "object"
      ? structuredClone(payload)
      : {};
    const currentBoardId = typeof state.boardId === "string" ? state.boardId.trim() : "";

    if (mutationType === "trigger-room") {
      const animation = nextPayload.animation && typeof nextPayload.animation === "object"
        ? nextPayload.animation
        : null;
      const boardId =
        (typeof nextPayload.boardId === "string" && nextPayload.boardId.trim())
        || (typeof animation?.boardId === "string" && animation.boardId.trim())
        || currentBoardId
        || null;
      const targetScope =
        (typeof nextPayload.targetScope === "string" && nextPayload.targetScope.trim())
        || (typeof animation?.scope === "string" && animation.scope.trim())
        || "room";
      const targetType =
        (typeof nextPayload.targetType === "string" && nextPayload.targetType.trim())
        || (typeof animation?.type === "string" && animation.type.trim())
        || null;

      if (boardId) {
        nextPayload.boardId = boardId;
        if (animation && !animation.boardId) {
          animation.boardId = boardId;
        }
      }
      if (targetScope) {
        nextPayload.targetScope = targetScope;
      }
      if (targetType) {
        nextPayload.targetType = targetType;
      }
      if (!nextPayload.dispatchTraceId) {
        nextPayload.dispatchTraceId = `dispatch-${mutationType}-${Date.now().toString(36)}`;
      }
      nextPayload.dispatchLayer = "control-client";
      return nextPayload;
    }

    if (mutationType === "trigger-global") {
      const animation = nextPayload.animation && typeof nextPayload.animation === "object"
        ? nextPayload.animation
        : null;
      const boardId =
        (typeof nextPayload.boardId === "string" && nextPayload.boardId.trim())
        || (typeof animation?.boardId === "string" && animation.boardId.trim())
        || currentBoardId
        || null;
      const targetType =
        (typeof nextPayload.animationType === "string" && nextPayload.animationType.trim())
        || (typeof animation?.type === "string" && animation.type.trim())
        || null;

      if (boardId) {
        nextPayload.boardId = boardId;
        if (animation && !animation.boardId) {
          animation.boardId = boardId;
        }
      }
      nextPayload.targetScope = "global";
      if (targetType) {
        nextPayload.targetType = targetType;
        if (!nextPayload.animationType) {
          nextPayload.animationType = targetType;
        }
      }
      if (!nextPayload.dispatchTraceId) {
        nextPayload.dispatchTraceId = `dispatch-${mutationType}-${Date.now().toString(36)}`;
      }
      nextPayload.dispatchLayer = "control-client";
      return nextPayload;
    }

    return nextPayload;
  }

  function emitOutsideFxMutation(boardId, reason = "outside-settings") {
    const state = ctx.state;
    const effectiveBoardId = boardId ?? state.boardId;
    const normalizedProfile = ctx.normalizeOutsideFxProfile(state.outsideFxByBoard[effectiveBoardId]);
    ctx.emitLiveMutation("outside-update", {
      outsideBoardId: effectiveBoardId,
      reason,
      outsideFx: normalizedProfile,
      outsideFxByBoard: {
        [effectiveBoardId]: normalizedProfile,
      },
    });
  }

  function emitRoomDraftSyncMutation(reason = "room-draft-sync") {
    const state = ctx.state;
    if (ctx.getOutputRole() !== ctx.OUTPUT_ROLE_CONTROL) {
      return;
    }
    const roomDraftPayload = {
      ...(state.roomDraft && typeof state.roomDraft === "object" ? state.roomDraft : {}),
      staggerStart: Boolean(state.roomDraft.staggerStart),
      staggerOffsetMs: ctx.clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs),
    };
    void ctx.emitLiveMutation("context-update", {
      reason,
      draftBoardId: state.boardId,
      runtime: {
        roomDraft: roomDraftPayload,
      },
    }).catch(() => undefined);
  }

  function scheduleRoomDraftSync(reason = "room-draft-sync", delayMs = 120) {
    if (ctx.getOutputRole() !== ctx.OUTPUT_ROLE_CONTROL) {
      return;
    }
    if (roomDraftSyncTimerId !== null) {
      window.clearTimeout(roomDraftSyncTimerId);
    }
    roomDraftSyncTimerId = window.setTimeout(() => {
      roomDraftSyncTimerId = null;
      emitRoomDraftSyncMutation(reason);
    }, Math.max(0, Number(delayMs) || 0));
  }

  function hydrateRunningAnimationStartTimestamps(runningAnimations) {
    return (Array.isArray(runningAnimations) ? runningAnimations : []).map((animation) => {
      const startedAtEpochMs = ctx.getAnimationStartedAtEpochMs(animation);
      const ageMs = Math.max(0, Date.now() - startedAtEpochMs);
      const normalizedClusterMemberRoomIds = animation?.scope === "cluster"
        ? (() => {
          const directRoomIds = Array.isArray(animation.memberRoomIds)
            ? animation.memberRoomIds.map((roomId) => String(roomId || "").trim()).filter(Boolean)
            : [];
          if (directRoomIds.length > 0) {
            return Array.from(new Set(directRoomIds));
          }
          const fallbackCluster = ctx.getClusterTargetById(animation.clusterId, animation.boardId);
          return Array.from(new Set(
            Array.isArray(fallbackCluster?.roomIds)
              ? fallbackCluster.roomIds.map((roomId) => String(roomId || "").trim()).filter(Boolean)
              : [],
          ));
        })()
        : undefined;
      return {
        ...animation,
        ...(animation?.scope === "cluster"
          ? {
            memberRoomIds: normalizedClusterMemberRoomIds,
          }
          : {}),
        startedAtEpochMs,
        startedAt: performance.now() - ageMs,
      };
    });
  }

  function reconcileHydratedAnimations(runningAnimations) {
    const state = ctx.state;
    const reconciled = ctx.reconcileHydratedRunningAnimations(runningAnimations, Date.now());
    for (const terminalAnimation of reconciled?.terminalAnimations ?? []) {
      rememberTerminalOneShotReplay(terminalAnimation);
    }
    const activeAnimations = (reconciled?.activeAnimations ?? []).filter((animation) => !shouldSuppressTerminalOneShotReplay(animation));
    if (Array.isArray(reconciled?.terminalAnimations) && reconciled.terminalAnimations.length > 0) {
      ctx.logRuntime.info("rehydrate_terminal_events", {
        event: "rehydrate-terminal-events",
        droppedCount: reconciled.terminalAnimations.length,
        boardId: state.boardId,
      });
    }
    return activeAnimations;
  }

  function isFiniteDurationGlobalAnimation(animation) {
    if (!animation || animation.scope !== "global") {
      return false;
    }
    if (animation.hold === true) {
      return false;
    }
    const durationMs = Number(animation.durationMs);
    return Number.isFinite(durationMs) && durationMs > 0;
  }

  function buildTerminalOneShotFingerprint(animation) {
    const scope = typeof animation?.scope === "string" ? animation.scope : "unknown";
    const boardId = typeof animation?.boardId === "string" ? animation.boardId : "unknown";
    const type = typeof animation?.type === "string" ? animation.type : "unknown";
    const startedAtEpochMs = Math.trunc(ctx.getAnimationStartedAtEpochMs(animation));
    const durationMs = Math.trunc(Number(animation?.durationMs) || 0);
    return `${scope}|${boardId}|${type}|${startedAtEpochMs}|${durationMs}`;
  }

  function rememberTerminalOneShotReplay(animation) {
    const liveSync = ctx.liveSync;
    if (!isFiniteDurationGlobalAnimation(animation)) {
      return;
    }
    const triggerKey = ctx.getGlobalTriggerKey(animation);
    const triggerRevision = Number(animation?.triggerRevision);
    if (triggerKey && Number.isInteger(triggerRevision) && triggerRevision > 0) {
      const previous = Number(liveSync.terminalOneShotRevisionByKey.get(triggerKey) ?? 0);
      if (triggerRevision > previous) {
        liveSync.terminalOneShotRevisionByKey.set(triggerKey, triggerRevision);
      }
    }
    const fingerprint = buildTerminalOneShotFingerprint(animation);
    liveSync.terminalOneShotFingerprints.set(fingerprint, Date.now());
    if (liveSync.terminalOneShotFingerprints.size > 1800) {
      const oldestKey = liveSync.terminalOneShotFingerprints.keys().next().value;
      if (oldestKey) {
        liveSync.terminalOneShotFingerprints.delete(oldestKey);
      }
    }
  }

  function shouldSuppressTerminalOneShotReplay(animation) {
    const liveSync = ctx.liveSync;
    if (!isFiniteDurationGlobalAnimation(animation)) {
      return false;
    }
    const triggerKey = ctx.getGlobalTriggerKey(animation);
    const triggerRevision = Number(animation?.triggerRevision);
    if (triggerKey && Number.isInteger(triggerRevision) && triggerRevision > 0) {
      const terminalRevision = Number(liveSync.terminalOneShotRevisionByKey.get(triggerKey) ?? 0);
      if (terminalRevision >= triggerRevision) {
        return true;
      }
    }
    const fingerprint = buildTerminalOneShotFingerprint(animation);
    return liveSync.terminalOneShotFingerprints.has(fingerprint);
  }

  function filterRunningAnimationsForBoard(runningAnimations, boardId) {
    const normalizedBoardId = typeof boardId === "string" ? boardId.trim() : "";
    const inferredBoardId = normalizedBoardId || (Array.isArray(runningAnimations)
      ? runningAnimations.reduce((first, animation) => {
        if (first) {
          return first;
        }
        const animationBoardId = typeof animation?.boardId === "string" ? animation.boardId.trim() : "";
        return animationBoardId || "";
      }, "")
      : "");
    return (Array.isArray(runningAnimations) ? runningAnimations : []).filter((animation) => {
      if (!animation || typeof animation !== "object") {
        return false;
      }
      const animationBoardId = typeof animation.boardId === "string" ? animation.boardId.trim() : "";
      if (!inferredBoardId || !animationBoardId) {
        return false;
      }
      return animationBoardId === inferredBoardId;
    });
  }

  function isControlCriticalMutationEnvelope(envelope) {
    return envelope?.priority === "high" || envelope?.mutationClass === "control-critical";
  }

  function sendLiveMutationReceiveAck(envelope) {
    const liveSync = ctx.liveSync;
    if (!envelope?.mutationId || !liveSync.wsConnected || !liveSync.socket || liveSync.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    liveSync.socket.send(JSON.stringify({
      type: "live-receive-ack",
      mutationEnvelope: envelope,
      receivedAt: new Date().toISOString(),
    }));
  }

  function sendLiveMutationApplyAck(envelope) {
    const liveSync = ctx.liveSync;
    if (!envelope?.mutationId || !liveSync.wsConnected || !liveSync.socket || liveSync.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    liveSync.socket.send(JSON.stringify({
      type: "live-apply-ack",
      mutationEnvelope: envelope,
      appliedAt: new Date().toISOString(),
    }));
  }

  function shouldApplyMutationEnvelope(version, mutationEnvelope) {
    const liveSync = ctx.liveSync;
    const numericVersion = Number.isFinite(version) ? Number(version) : null;
    if (numericVersion !== null && numericVersion <= liveSync.lastAppliedVersion) {
      liveSync.applyRejectCounters.staleVersion += 1;
      return false;
    }
    const envelopeVersion = Number.isFinite(Number(mutationEnvelope?.serverVersion))
      ? Number(mutationEnvelope.serverVersion)
      : null;
    const effectiveVersion = envelopeVersion ?? numericVersion;
    if (effectiveVersion !== null && effectiveVersion <= liveSync.lastAppliedVersion) {
      liveSync.applyRejectCounters.staleVersion += 1;
      return false;
    }
    if (mutationEnvelope?.mutationId && liveSync.appliedMutationIds.has(mutationEnvelope.mutationId)) {
      liveSync.applyRejectCounters.duplicateMutation += 1;
      return false;
    }
    return true;
  }

  window.TT_BEAMER_RUNTIME_LIVE_SYNC_HELPERS = {
    init,
    normalizeLiveMutationPayload,
    emitOutsideFxMutation,
    emitRoomDraftSyncMutation,
    scheduleRoomDraftSync,
    hydrateRunningAnimationStartTimestamps,
    reconcileHydratedAnimations,
    isFiniteDurationGlobalAnimation,
    buildTerminalOneShotFingerprint,
    rememberTerminalOneShotReplay,
    shouldSuppressTerminalOneShotReplay,
    filterRunningAnimationsForBoard,
    isControlCriticalMutationEnvelope,
    sendLiveMutationReceiveAck,
    sendLiveMutationApplyAck,
    shouldApplyMutationEnvelope,
  };
})();
