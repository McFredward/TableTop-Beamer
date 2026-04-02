(() => {
  function shouldSuppressRapidTap({ state, actionKey, thresholdMs = 320 }) {
    const now = performance.now();
    const lastAt = state.touchActionGuard[actionKey] ?? 0;
    if (now - lastAt < thresholdMs) {
      return true;
    }
    state.touchActionGuard[actionKey] = now;
    return false;
  }

  function recordTriggerIntent(state) {
    state.mobilePerf.pendingTriggerAt = performance.now();
  }

  window.TT_BEAMER_INPUT_GUARDS = {
    shouldSuppressRapidTap,
    recordTriggerIntent,
  };
})();
