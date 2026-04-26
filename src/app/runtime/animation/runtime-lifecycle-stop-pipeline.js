// lifecycle-stop-pipeline sub-module — owns the
// stop-command pipeline: collectAnimationStopIds, the pendingStop*
// helpers (markStopPending / clearStopPending / isStopPendingForAnimationId
// / reconcileStopPendingFromSnapshot), buildStopCommandTargetMeta,
// emitStopAnimationCommand, and the high-level stopAnimation dispatcher.
//
// stopAnimation calls renderRunningAnimationsList + refreshGlobalButtons
// (currently still in the lifecycle shim until W3.4-C4a). These are
// injected via init-deps so the bare-name calls inside stopAnimation
// remain byte-identical.
(() => {
  let ctx = null;
  // Cross-module callbacks injected at init time so stopAnimation's
  // body can reference them by bare name byte-identically.
  let renderRunningAnimationsList = null;
  let refreshGlobalButtons = null;

  function init(dependencies) {
    ctx = dependencies?.ctx ?? dependencies;
    renderRunningAnimationsList = dependencies?.renderRunningAnimationsList ?? null;
    refreshGlobalButtons = dependencies?.refreshGlobalButtons ?? null;
  }

  function collectAnimationStopIds(targetAnimation, { mutateClusterMembership = false } = {}) {
    const { state, getClusterMemberAnimationIds } = ctx;
    const idsToStop = new Set();
    if (!targetAnimation || typeof targetAnimation.id !== "string") {
      return idsToStop;
    }
    idsToStop.add(targetAnimation.id);
    if (targetAnimation.scope === "cluster") {
      for (const memberId of getClusterMemberAnimationIds(targetAnimation)) {
        idsToStop.add(memberId);
      }
    }
    if (targetAnimation.scope === "room" && targetAnimation.parentClusterRunId) {
      const parentCluster = state.runningAnimations.find(
        (entry) => entry?.id === targetAnimation.parentClusterRunId && entry?.scope === "cluster",
      );
      if (parentCluster) {
        const nextMemberAnimationIds = getClusterMemberAnimationIds(parentCluster)
          .filter((memberId) => memberId !== targetAnimation.id);
        if (mutateClusterMembership) {
          parentCluster.memberAnimationIds = nextMemberAnimationIds;
          parentCluster.memberRoomIds = nextMemberAnimationIds
            .map((memberId) => state.runningAnimations.find((entry) => entry?.id === memberId)?.roomId ?? null)
            .filter(Boolean);
        }
        if (nextMemberAnimationIds.length === 0) {
          idsToStop.add(parentCluster.id);
        }
      }
    }
    return idsToStop;
  }

  function isStopPendingForAnimationId(animationId) {
    return typeof animationId === "string" && ctx.liveSync.pendingStopAnimationIds.has(animationId);
  }

  function markStopPending(animationIds) {
    for (const animationId of animationIds) {
      if (typeof animationId === "string" && animationId) {
        ctx.liveSync.pendingStopAnimationIds.add(animationId);
      }
    }
  }

  function clearStopPending(animationIds) {
    for (const animationId of animationIds) {
      if (typeof animationId === "string" && animationId) {
        ctx.liveSync.pendingStopAnimationIds.delete(animationId);
      }
    }
  }

  function reconcileStopPendingFromSnapshot() {
    const { state, liveSync } = ctx;
    if (liveSync.pendingStopAnimationIds.size === 0) {
      return;
    }
    const runningIds = new Set(
      state.runningAnimations
        .map((animation) => (typeof animation?.id === "string" ? animation.id : null))
        .filter(Boolean),
    );
    for (const pendingId of [...liveSync.pendingStopAnimationIds]) {
      if (!runningIds.has(pendingId)) {
        liveSync.pendingStopAnimationIds.delete(pendingId);
      }
    }
  }

  function buildStopCommandTargetMeta(targetAnimation) {
    if (!targetAnimation || typeof targetAnimation !== "object") {
      return {};
    }
    const targetScope = typeof targetAnimation.scope === "string" ? targetAnimation.scope.trim() : "";
    const targetType = typeof targetAnimation.type === "string" ? targetAnimation.type.trim() : "";
    const boardId = typeof targetAnimation.boardId === "string" ? targetAnimation.boardId.trim() : "";
    return {
      ...(targetScope ? { targetScope } : {}),
      ...(targetType ? { targetType } : {}),
      ...(boardId ? { boardId } : {}),
      ...(targetScope === "global"
        && (ctx.isOutsideAnimationType?.(targetType, boardId) || targetType === "outside-space")
        ? { outsideHint: true }
        : {}),
    };
  }

  function emitStopAnimationCommand(animationId, { priorityHint = "high", targetAnimation = null } = {}) {
    const { state, emitLiveMutation, STOP_ANIMATION_MUTATION_TYPE } = ctx;
    if (typeof animationId !== "string" || !animationId.trim()) {
      return Promise.reject(new Error("invalid animationId for stop command"));
    }
    const animationForMeta =
      targetAnimation
      ?? state.runningAnimations.find((entry) => entry?.id === animationId)
      ?? null;
    return emitLiveMutation(STOP_ANIMATION_MUTATION_TYPE, {
      animationId,
      priorityHint,
      ...buildStopCommandTargetMeta(animationForMeta),
    });
  }

  function stopAnimation(animationId) {
    const {
      state, getOutputRole, OUTPUT_ROLE_CONTROL,
      triggerFeedback, stopAnimationSound, clearRoomDraftEditTarget,
      updateOutsideFxProfile, persistBoardProfiles, syncOutsideFxPanel,
    } = ctx;
    const target = state.runningAnimations.find((item) => item.id === animationId) ?? null;
    if (!target) {
      return;
    }
    const idsToStop = collectAnimationStopIds(target, { mutateClusterMembership: true });
    if (getOutputRole() === OUTPUT_ROLE_CONTROL) {
      const idsToDispatch = [...idsToStop].filter((id) => !isStopPendingForAnimationId(id));
      if (idsToDispatch.length === 0) {
        triggerFeedback.textContent = `Pending: stop command for ${idsToStop.size} animation(s) already in flight`;
        return;
      }
      markStopPending(idsToDispatch);
      const commandPairs = idsToDispatch.map((id) => {
        const commandTarget = state.runningAnimations.find((entry) => entry?.id === id) ?? (id === target.id ? target : null);
        return [id, emitStopAnimationCommand(id, {
          priorityHint: "high",
          targetAnimation: commandTarget,
        })];
      });
      void Promise.allSettled(commandPairs.map(([, promise]) => promise)).then((results) => {
        const failedIds = results
          .map((result, index) => (result.status === "rejected" ? commandPairs[index][0] : null))
          .filter(Boolean);
        if (failedIds.length > 0) {
          clearStopPending(failedIds);
          triggerFeedback.textContent = `Status: stop command failed for ${failedIds.length} animation(s)`;
          return;
        }
        triggerFeedback.textContent = `Pending: stop command for ${idsToDispatch.length} animation(s) accepted (waiting for snapshot)`;
      });
      return;
    }
    for (const id of idsToStop) {
      stopAnimationSound(id);
    }
    state.runningAnimations = state.runningAnimations.filter((item) => !idsToStop.has(item.id));
    if (state.roomDraft.editTargetId && idsToStop.has(state.roomDraft.editTargetId)) {
      clearRoomDraftEditTarget();
    }
    if (target?.scope === "global"
      && (ctx.isOutsideAnimationType?.(target.type, target.boardId)
        || target.type === "outside-space")) {
      updateOutsideFxProfile(target.boardId, { enabled: false });
      persistBoardProfiles();
      if (target.boardId === state.boardId) {
        syncOutsideFxPanel();
      }
    }
    renderRunningAnimationsList();
    refreshGlobalButtons();
    for (const id of idsToStop) {
      const commandTarget = state.runningAnimations.find((entry) => entry?.id === id) ?? (id === target.id ? target : null);
      void emitStopAnimationCommand(id, {
        priorityHint: "high",
        targetAnimation: commandTarget,
      });
    }
  }

  window.TT_BEAMER_RUNTIME_LIFECYCLE_STOP_PIPELINE = {
    init,
    collectAnimationStopIds,
    isStopPendingForAnimationId,
    markStopPending,
    clearStopPending,
    reconcileStopPendingFromSnapshot,
    buildStopCommandTargetMeta,
    emitStopAnimationCommand,
    stopAnimation,
  };
})();
