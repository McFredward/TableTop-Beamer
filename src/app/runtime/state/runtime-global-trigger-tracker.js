// Phase 14-2: global trigger revision + one-shot replay tracker.
//
// Owns the bookkeeping for global trigger revisions (stop, clear,
// start), the revision-key → seen-one-shot-run map, and the prime
// helper that reconciles hydrated runningAnimations with locally
// observed revisions. Shared state lives on liveSync (injected).
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function replayPendingLiveMutations() {
    // polling mode keeps pending entries until a newer snapshot version confirms them.
  }

  function getGlobalTriggerRevision(animation) {
    const revision = Number(animation?.triggerRevision);
    return Number.isInteger(revision) && revision > 0 ? revision : null;
  }

  function observeGlobalStopRevisions(runtime) {
    const liveSync = ctx.liveSync;
    const stopRevisions = runtime?.globalStopRevisions;
    if (!stopRevisions || typeof stopRevisions !== "object") {
      return;
    }
    for (const [triggerKey, rawRevision] of Object.entries(stopRevisions)) {
      if (!triggerKey) {
        continue;
      }
      const revision = Number(rawRevision);
      if (!Number.isInteger(revision) || revision <= 0) {
        continue;
      }
      const previous = Number(liveSync.globalStopRevisionSeenByKey.get(triggerKey) ?? 0);
      if (revision > previous) {
        liveSync.globalStopRevisionSeenByKey.set(triggerKey, revision);
      }
    }
  }

  function observeGlobalClearRevision(runtime) {
    const liveSync = ctx.liveSync;
    const revision = Number(runtime?.globalClearRevision);
    if (!Number.isInteger(revision) || revision <= 0) {
      return;
    }
    if (revision <= liveSync.lastObservedGlobalClearRevision) {
      return;
    }
    liveSync.lastObservedGlobalClearRevision = revision;
    liveSync.activeSeenOneShotRunByTriggerRevision.clear();
  }

  function buildSeenOneShotRunRevisionKey(triggerKey, triggerRevision) {
    if (!triggerKey) {
      return null;
    }
    const normalizedRevision = Number(triggerRevision);
    if (!Number.isInteger(normalizedRevision) || normalizedRevision <= 0) {
      return null;
    }
    return `${triggerKey}#${triggerRevision}`;
  }

  function rememberSeenOneShotRun(animation, {
    triggerKey,
    triggerRevision,
    nowEpochMs,
    nowPerfMs,
  } = {}) {
    const liveSync = ctx.liveSync;
    if (!ctx.isFiniteDurationGlobalAnimation(animation)) {
      return null;
    }
    const revisionKey = buildSeenOneShotRunRevisionKey(triggerKey, triggerRevision);
    if (!revisionKey) {
      return null;
    }
    const stopRevision = Number(liveSync.globalStopRevisionSeenByKey.get(triggerKey) ?? 0);
    if (stopRevision >= triggerRevision) {
      liveSync.activeSeenOneShotRunByTriggerRevision.delete(revisionKey);
      return null;
    }
    const existing = liveSync.activeSeenOneShotRunByTriggerRevision.get(revisionKey) ?? null;
    const durationMs = Math.max(1, Math.trunc(Number(animation.durationMs) || 0));
    if (existing) {
      const merged = {
        ...existing,
        id: String(animation.id || existing.id || ""),
        durationMs: durationMs > 0 ? durationMs : existing.durationMs,
        animationTemplate: {
          ...existing.animationTemplate,
          ...animation,
          triggerKey,
          triggerRevision,
        },
      };
      liveSync.activeSeenOneShotRunByTriggerRevision.set(revisionKey, merged);
      return merged;
    }
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      return null;
    }
    const record = {
      revisionKey,
      triggerKey,
      triggerRevision,
      id: String(animation.id || ""),
      durationMs,
      startedAtEpochMs: nowEpochMs,
      startedAt: nowPerfMs,
      animationTemplate: {
        ...animation,
        triggerKey,
        triggerRevision,
        startedAtEpochMs: nowEpochMs,
        startedAt: nowPerfMs,
        durationMs,
      },
    };
    liveSync.activeSeenOneShotRunByTriggerRevision.set(revisionKey, record);
    return record;
  }

  function retainActiveSeenOneShotRuns(runningAnimations, { nowEpochMs = Date.now(), nowPerfMs = performance.now() } = {}) {
    const liveSync = ctx.liveSync;
    const nextAnimations = Array.isArray(runningAnimations) ? [...runningAnimations] : [];
    const seenRevisionKeys = new Set();
    for (const animation of nextAnimations) {
      const triggerKey = ctx.getGlobalTriggerKey(animation);
      const triggerRevision = getGlobalTriggerRevision(animation);
      const revisionKey = buildSeenOneShotRunRevisionKey(triggerKey, triggerRevision);
      if (!revisionKey) {
        continue;
      }
      seenRevisionKeys.add(revisionKey);
    }

    for (const [revisionKey, record] of liveSync.activeSeenOneShotRunByTriggerRevision.entries()) {
      const triggerKey = record?.triggerKey ?? null;
      const triggerRevision = Number(record?.triggerRevision);
      const stopRevision = Number(triggerKey ? liveSync.globalStopRevisionSeenByKey.get(triggerKey) : 0);
      const durationMs = Math.max(0, Number(record?.durationMs) || 0);
      const startedAtEpochMs = Number(record?.startedAtEpochMs);
      const finished = !Number.isFinite(startedAtEpochMs)
        || !Number.isFinite(durationMs)
        || durationMs <= 0
        || nowEpochMs - startedAtEpochMs >= durationMs;
      if (
        !triggerKey
        || !Number.isInteger(triggerRevision)
        || triggerRevision <= 0
        || stopRevision >= triggerRevision
        || finished
      ) {
        liveSync.activeSeenOneShotRunByTriggerRevision.delete(revisionKey);
        continue;
      }
      if (seenRevisionKeys.has(revisionKey)) {
        continue;
      }
      const template = record?.animationTemplate;
      if (!template || !String(template.id || "").trim()) {
        continue;
      }
      nextAnimations.push({
        ...template,
        id: record.id,
        hold: false,
        durationMs,
        triggerKey,
        triggerRevision,
        startedAtEpochMs,
        startedAt: Number.isFinite(Number(record?.startedAt)) ? Number(record.startedAt) : nowPerfMs,
      });
    }

    return nextAnimations;
  }

  function primeGlobalTriggerRuntimeTimestamps(runningAnimations, previousAnimationsById = new Map()) {
    const liveSync = ctx.liveSync;
    const nextNowEpoch = Date.now();
    const nextNowPerf = performance.now();
    return (Array.isArray(runningAnimations) ? runningAnimations : []).map((animation) => {
      if (!animation || animation.scope !== "global") {
        return animation;
      }
      if (ctx.shouldSuppressTerminalOneShotReplay(animation)) {
        return null;
      }
      const triggerKey = ctx.getGlobalTriggerKey(animation);
      const triggerRevision = getGlobalTriggerRevision(animation);
      const previous = previousAnimationsById.get(animation.id);
      if (triggerKey && triggerRevision !== null) {
        const stopRevision = Number(liveSync.globalStopRevisionSeenByKey.get(triggerKey) ?? 0);
        if (stopRevision >= triggerRevision) {
          const revisionKey = buildSeenOneShotRunRevisionKey(triggerKey, triggerRevision);
          if (revisionKey) {
            liveSync.activeSeenOneShotRunByTriggerRevision.delete(revisionKey);
          }
          return null;
        }
        const highestSeenRevision = Number(liveSync.globalTriggerRevisionSeenByKey.get(triggerKey) ?? 0);
        const previousRevision = getGlobalTriggerRevision(previous);
        const isSameRevisionAsCurrent = previous && previousRevision === triggerRevision;
        if (triggerRevision > highestSeenRevision) {
          liveSync.globalTriggerRevisionSeenByKey.set(triggerKey, triggerRevision);
          const seenOneShotRun = rememberSeenOneShotRun(animation, {
            triggerKey,
            triggerRevision,
            nowEpochMs: nextNowEpoch,
            nowPerfMs: nextNowPerf,
          });
          if (seenOneShotRun) {
            return {
              ...animation,
              triggerKey,
              triggerRevision,
              startedAtEpochMs: seenOneShotRun.startedAtEpochMs,
              startedAt: seenOneShotRun.startedAt,
              durationMs: seenOneShotRun.durationMs,
            };
          }
          if (!isSameRevisionAsCurrent) {
            const startedAtEpochMs = ctx.getAnimationStartedAtEpochMs(animation);
            const ageMs = Math.max(0, nextNowEpoch - startedAtEpochMs);
            return {
              ...animation,
              triggerKey,
              triggerRevision,
              startedAtEpochMs,
              startedAt: nextNowPerf - ageMs,
            };
          }
        }
        if (isSameRevisionAsCurrent) {
          const seenOneShotRun = rememberSeenOneShotRun(animation, {
            triggerKey,
            triggerRevision,
            nowEpochMs: nextNowEpoch,
            nowPerfMs: nextNowPerf,
          });
          if (seenOneShotRun) {
            return {
              ...animation,
              triggerKey,
              triggerRevision,
              startedAtEpochMs: seenOneShotRun.startedAtEpochMs,
              startedAt: seenOneShotRun.startedAt,
              durationMs: seenOneShotRun.durationMs,
            };
          }
          return {
            ...animation,
            triggerKey,
            triggerRevision,
            startedAtEpochMs: ctx.getAnimationStartedAtEpochMs(previous),
            startedAt: Number(previous.startedAt) || nextNowPerf,
          };
        }
        return null;
      }
      if (previous) {
        return {
          ...animation,
          startedAtEpochMs: ctx.getAnimationStartedAtEpochMs(previous),
          startedAt: Number(previous.startedAt) || nextNowPerf,
        };
      }
      return animation;
    }).filter(Boolean);
  }

  window.TT_BEAMER_RUNTIME_GLOBAL_TRIGGER_TRACKER = {
    init,
    replayPendingLiveMutations,
    getGlobalTriggerRevision,
    observeGlobalStopRevisions,
    observeGlobalClearRevision,
    buildSeenOneShotRunRevisionKey,
    rememberSeenOneShotRun,
    retainActiveSeenOneShotRuns,
    primeGlobalTriggerRuntimeTimestamps,
  };
})();
