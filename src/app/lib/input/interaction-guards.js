// Input guards. Shared rapid-tap and touch-suppression helpers used
// by runtime-runtime-controls and orchestration to debounce repeated
// pointer events.

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
