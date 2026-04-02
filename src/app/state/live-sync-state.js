(() => {
  function createLiveSyncState() {
    return {
      socket: null,
      socketGeneration: 0,
      wsConnected: false,
      clientId: null,
      lastCommandAcceptedAt: null,
      lastCommandAcceptedVersion: 0,
      lastSessionVersion: 0,
      lastAppliedVersion: 0,
      appliedMutationIds: new Set(),
      pendingMutations: new Map(),
      dirtyHintUntil: 0,
      pollTimerId: null,
      pollInFlight: false,
      pollBackoffMs: 0,
      pollingEnabled: true,
      preferFastPollingUntil: 0,
      tracesByMutationId: new Map(),
      applyRejectCounters: {
        staleVersion: 0,
        duplicateMutation: 0,
      },
      globalTriggerRevisionSeenByKey: new Map(),
      globalStopRevisionSeenByKey: new Map(),
      pendingStopAnimationIds: new Set(),
    };
  }

  function createLiveSyncHelpers({ liveSync, mutationLimit = 4000 } = {}) {
    function rememberAppliedMutationId(mutationId) {
      if (typeof mutationId !== "string" || !mutationId) {
        return;
      }
      liveSync.appliedMutationIds.add(mutationId);
      if (liveSync.appliedMutationIds.size <= mutationLimit) {
        return;
      }
      const oldest = liveSync.appliedMutationIds.values().next().value;
      if (oldest) {
        liveSync.appliedMutationIds.delete(oldest);
      }
    }

    function recordMutationTrace(mutationId, marker, ts = Date.now()) {
      if (typeof mutationId !== "string" || !mutationId) {
        return;
      }
      const existing = liveSync.tracesByMutationId.get(mutationId) ?? {
        mutationId,
        markers: {},
      };
      existing.markers[marker] = ts;
      liveSync.tracesByMutationId.set(mutationId, existing);
      // Keep trace memory bounded so diagnostics stay useful without unbounded growth.
      if (liveSync.tracesByMutationId.size > mutationLimit) {
        const oldest = liveSync.tracesByMutationId.keys().next().value;
        if (oldest) {
          liveSync.tracesByMutationId.delete(oldest);
        }
      }
    }

    function getLiveTraceSnapshot() {
      const traces = [...liveSync.tracesByMutationId.values()].map((entry) => ({
        mutationId: entry.mutationId,
        markers: entry.markers,
      }));
      return {
        connected: liveSync.wsConnected,
        clientId: liveSync.clientId,
        lastSessionVersion: liveSync.lastSessionVersion,
        lastAppliedVersion: liveSync.lastAppliedVersion,
        pendingMutationCount: liveSync.pendingMutations.size,
        applyRejectCounters: liveSync.applyRejectCounters,
        traces,
      };
    }

    return {
      rememberAppliedMutationId,
      recordMutationTrace,
      getLiveTraceSnapshot,
    };
  }

  window.TT_BEAMER_LIVE_SYNC_STATE = {
    createLiveSyncState,
    createLiveSyncHelpers,
  };
})();
