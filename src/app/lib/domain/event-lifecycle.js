// Event-lifecycle domain. Pure helpers for animation lifecycle math —
// is-this-event-expired checks, start-time + duration arithmetic.
// Used by both the dashboard runtime and the live-sync receiver.

(() => {
  function toFiniteNumber(value, fallback = null) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function resolveAnimationStartEpochMs(animation, nowEpochMs = Date.now()) {
    const directEpoch = toFiniteNumber(animation?.startedAtEpochMs, null);
    if (directEpoch !== null) {
      return directEpoch;
    }
    const startedAtPerf = toFiniteNumber(animation?.startedAt, null);
    if (startedAtPerf === null) {
      return nowEpochMs;
    }
    return nowEpochMs - (performance.now() - startedAtPerf);
  }

  function resolveAnimationDurationMs(animation) {
    if (animation?.hold === true) {
      return null;
    }
    return toFiniteNumber(animation?.durationMs, null);
  }

  function resolveAnimationTerminalState(animation, nowEpochMs = Date.now()) {
    const durationMs = resolveAnimationDurationMs(animation);
    if (durationMs === null || durationMs <= 0) {
      return {
        active: true,
        reason: null,
        startedAtEpochMs: resolveAnimationStartEpochMs(animation, nowEpochMs),
        expiresAtEpochMs: null,
      };
    }
    const hasExplicitStart = Number.isFinite(Number(animation?.startedAtEpochMs)) || Number.isFinite(Number(animation?.startedAt));
    if (!hasExplicitStart) {
      return {
        active: false,
        reason: "missing-start-timestamp",
        startedAtEpochMs: nowEpochMs,
        expiresAtEpochMs: nowEpochMs,
      };
    }
    const startedAtEpochMs = resolveAnimationStartEpochMs(animation, nowEpochMs);
    const expiresAtEpochMs = startedAtEpochMs + durationMs;
    if (expiresAtEpochMs <= nowEpochMs) {
      return {
        active: false,
        reason: "elapsed-duration",
        startedAtEpochMs,
        expiresAtEpochMs,
      };
    }
    return {
      active: true,
      reason: null,
      startedAtEpochMs,
      expiresAtEpochMs,
    };
  }

  function reconcileHydratedRunningAnimations(runningAnimations, nowEpochMs = Date.now()) {
    const activeAnimations = [];
    const terminalAnimations = [];
    for (const animation of Array.isArray(runningAnimations) ? runningAnimations : []) {
      if (!animation || typeof animation !== "object") {
        continue;
      }
      const lifecycle = resolveAnimationTerminalState(animation, nowEpochMs);
      if (!lifecycle.active) {
        terminalAnimations.push({
          ...animation,
          lifecycleState: "completed",
          completedAtEpochMs: lifecycle.expiresAtEpochMs ?? nowEpochMs,
          completedReason: lifecycle.reason,
          startedAtEpochMs: lifecycle.startedAtEpochMs,
        });
        continue;
      }
      activeAnimations.push({
        ...animation,
        startedAtEpochMs: lifecycle.startedAtEpochMs,
      });
    }
    return {
      activeAnimations,
      terminalAnimations,
    };
  }

  window.TT_BEAMER_EVENT_LIFECYCLE = {
    resolveAnimationStartEpochMs,
    resolveAnimationDurationMs,
    resolveAnimationTerminalState,
    reconcileHydratedRunningAnimations,
  };
})();
