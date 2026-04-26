// Live-sync domain. Pure helpers for normalising the live-sync envelope
// shape across emit and receive paths; no IO, no state.

(() => {
  function getAnimationStartedAtEpochMs(animation) {
    if (Number.isFinite(animation?.startedAtEpochMs)) {
      return Number(animation.startedAtEpochMs);
    }
    const startedAt = Number(animation?.startedAt);
    if (!Number.isFinite(startedAt)) {
      return Date.now();
    }
    return Date.now() - (performance.now() - startedAt);
  }

  function getGlobalTriggerKey(animation) {
    if (!animation || animation.scope !== "global") {
      return null;
    }
    const explicitKey = typeof animation.triggerKey === "string" ? animation.triggerKey.trim() : "";
    if (explicitKey) {
      return explicitKey;
    }
    const boardId = typeof animation.boardId === "string" ? animation.boardId.trim() : "";
    const type = typeof animation.type === "string" ? animation.type.trim() : "";
    return boardId && type ? `${boardId}:${type}` : null;
  }

  function buildAnimationSnapshotForLiveSync(animation) {
    if (!animation || typeof animation !== "object") {
      return null;
    }
    return {
      ...animation,
      startedAtEpochMs: getAnimationStartedAtEpochMs(animation),
    };
  }

  window.TT_BEAMER_LIVE_SYNC_DOMAIN = {
    getAnimationStartedAtEpochMs,
    getGlobalTriggerKey,
    buildAnimationSnapshotForLiveSync,
  };
})();
