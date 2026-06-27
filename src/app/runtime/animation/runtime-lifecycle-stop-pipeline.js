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

  // Phase 58 Wave 3.9d: self-heal grace. A stop dispatched while the id is
  // still present in snapshots may have been LOST server-side (the
  // sequence-stale drop the fair scheduler could trigger, a version-rejected
  // stop snapshot, or an id drift). If a pendingStop id is STILL present this
  // long after its last dispatch, reconcileStopPendingFromSnapshot re-emits
  // the stop (with a fresh clientSequence) so a "Stopping" instance always
  // self-heals without an operator re-toggle or a server restart.
  const STOP_RETRY_GRACE_MS = 2_500;

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

  // Phase 58 Wave 3.9d: per-id last-dispatch timestamps backing the
  // self-heal retry. Lazily created on liveSync so it resets with the
  // session and stays adjacent to pendingStopAnimationIds.
  function stopAttempts() {
    if (!(ctx.liveSync.pendingStopAttempts instanceof Map)) {
      ctx.liveSync.pendingStopAttempts = new Map();
    }
    return ctx.liveSync.pendingStopAttempts;
  }

  function stampStopAttempt(animationIds) {
    const now = Date.now();
    const attempts = stopAttempts();
    for (const animationId of animationIds) {
      if (typeof animationId === "string" && animationId) {
        attempts.set(animationId, now);
      }
    }
  }

  function markStopPending(animationIds) {
    for (const animationId of animationIds) {
      if (typeof animationId === "string" && animationId) {
        ctx.liveSync.pendingStopAnimationIds.add(animationId);
        // Phase 58 Wave 3.9d: permanent diagnostic — a future wedge must be
        // explainable from console output (stop-pending set / clear / retry).
        console.warn("[58] stop-pending-set", JSON.stringify({ id: animationId }));
      }
    }
  }

  function clearStopPending(animationIds) {
    const attempts = stopAttempts();
    for (const animationId of animationIds) {
      if (typeof animationId === "string" && animationId) {
        ctx.liveSync.pendingStopAnimationIds.delete(animationId);
        attempts.delete(animationId);
        console.warn("[58] stop-pending-clear", JSON.stringify({ id: animationId }));
      }
    }
  }

  function reconcileStopPendingFromSnapshot() {
    const { state, liveSync } = ctx;
    if (liveSync.pendingStopAnimationIds.size === 0) {
      return;
    }
    const runningById = new Map(
      state.runningAnimations
        .filter((animation) => typeof animation?.id === "string")
        .map((animation) => [animation.id, animation]),
    );
    const attempts = stopAttempts();
    const now = Date.now();
    for (const pendingId of [...liveSync.pendingStopAnimationIds]) {
      if (!runningById.has(pendingId)) {
        // Server confirmed removal -> the stop landed; clear pending.
        clearStopPending([pendingId]);
        continue;
      }
      // Phase 58 Wave 3.9d: the id is STILL present after a stop was
      // dispatched. The stop may have been lost server-side (sequence-stale
      // drop, version-rejected stop snapshot, or id drift). Once the grace
      // window elapses, re-emit the stop with a FRESH clientSequence so the
      // wedge self-heals — no operator re-toggle, no server restart.
      const lastAttempt = Number(attempts.get(pendingId));
      if (!Number.isFinite(lastAttempt)) {
        // Pending but never stamped (defensive): stamp now so the grace
        // window starts cleanly.
        attempts.set(pendingId, now);
        continue;
      }
      if (now - lastAttempt >= STOP_RETRY_GRACE_MS) {
        const target = runningById.get(pendingId) ?? null;
        attempts.set(pendingId, now);
        console.warn("[58] stop-pending-retry", JSON.stringify({
          id: pendingId,
          sinceMs: Math.round(now - lastAttempt),
        }));
        void emitStopAnimationCommand(pendingId, {
          priorityHint: "high",
          targetAnimation: target,
        });
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
    // Phase 58 Wave 3.9d: carry roomId so the server can fall back to a
    // scope+type+room+board match when the stop's id misses (id drift /
    // retried stop) — otherwise a room-loop stop with a stale id is a silent
    // server no-op and the client wedges on "Stopping".
    const roomId = typeof targetAnimation.roomId === "string" ? targetAnimation.roomId.trim() : "";
    return {
      ...(targetScope ? { targetScope } : {}),
      ...(targetType ? { targetType } : {}),
      ...(boardId ? { boardId } : {}),
      ...(roomId ? { roomId } : {}),
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
    const meta = buildStopCommandTargetMeta(animationForMeta);
    // Phase 58 Wave 3.9d: permanent diagnostic — single choke point for every
    // stop dispatch (initial, force re-issue, and self-heal retry).
    console.warn("[58] stop-emit", JSON.stringify({ animationId, priorityHint, ...meta }));
    return emitLiveMutation(STOP_ANIMATION_MUTATION_TYPE, {
      animationId,
      priorityHint,
      ...meta,
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
      // Phase 58 Wave 3.9d: a stop is ALWAYS re-dispatchable. Previously, if
      // every target id was already stop-pending, this bailed with "already
      // in flight" — leaving a LOST stop (sequence-stale drop / version-
      // rejected snapshot / id drift) wedged on "Stopping" with no escape but
      // a server restart. Now re-toggling a "Stopping" animation FORCE
      // re-issues the stop. The re-issue gets a fresh clientSequence, so it is
      // no longer vulnerable to the server's sequence-stale gate.
      const idsToDispatch = [...idsToStop];
      const freshIds = idsToDispatch.filter((id) => !isStopPendingForAnimationId(id));
      const isForce = freshIds.length === 0;
      markStopPending(freshIds);
      stampStopAttempt(idsToDispatch);
      console.warn("[58] stop-dispatch", JSON.stringify({
        ids: idsToDispatch,
        fresh: freshIds,
        force: isForce,
      }));
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
          // Only release ids that were FRESHLY marked by this dispatch; a
          // force re-issue must keep the prior pending state authoritative so
          // the self-heal retry stays armed.
          const clearable = failedIds.filter((id) => freshIds.includes(id));
          if (clearable.length > 0) {
            clearStopPending(clearable);
          }
          triggerFeedback.textContent = `Status: stop command failed for ${failedIds.length} animation(s)`;
          return;
        }
        triggerFeedback.textContent = isForce
          ? `Pending: stop re-issued for ${idsToDispatch.length} animation(s) (waiting for snapshot)`
          : `Pending: stop command for ${idsToDispatch.length} animation(s) accepted (waiting for snapshot)`;
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
