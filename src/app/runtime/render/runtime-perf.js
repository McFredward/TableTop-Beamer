// runtime performance module.
//
// Owns the adaptive frame-budget feedback loop: quality-scale
// adjustment based on p90 frame cost, mp4 frame coalescing helpers,
// per-frame pressure-level reassignment, and the mobile performance
// status panel. The MP4 performance tuning UI was retired in Phase 40;
// the adaptive logic now runs on a fixed "balanced" tier — no
// operator-tunable knobs.
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;

  // Fixed "balanced" tier defaults. Tier-switching UI was removed in
  // Phase 40; the adaptive feedback loop below still adjusts quality
  // scale + pressure level + render caps at frame-time.
  const BALANCED_CONTROLS = Object.freeze({
    tier: "balanced",
    renderCap: 48,
    qualityFloor: 0.68,
    degradeThreshold: 1.35,
    recoverThreshold: 0.92,
  });

  function init(dependencies) {
    ctx = dependencies;
  }

  function percentile(values, p) {
    if (!values.length) {
      return 0;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)));
    return sorted[index];
  }

  function getRuntimeQualityScale() {
    const state = ctx.state;
    return Math.max(BALANCED_CONTROLS.qualityFloor, Math.min(1, Number(state.runtimePerf.qualityScale) || 1));
  }

  function getMp4TierDefaults(/* tier */) {
    return { ...BALANCED_CONTROLS };
  }

  function getMp4PerformanceControls() {
    return BALANCED_CONTROLS;
  }

  function computeAnimationCoalesceSeed(animation) {
    const id = typeof animation?.id === "string" ? animation.id : "";
    let hash = 0;
    for (let index = 0; index < id.length; index += 1) {
      hash = (hash * 33 + id.charCodeAt(index)) % 997;
    }
    return hash;
  }

  function isRenderCriticalAnimation(animation) {
    if (!animation || typeof animation !== "object") {
      return false;
    }
    if (animation.scope === "cluster" || animation.scope === "room") {
      return true;
    }
    if (animation.scope === "global") {
      // Loop-until-stopped globals (hold=true or null durationMs)
      // must render every frame — otherwise looped inside globals
      // (e.g. Hull Flicker) get coalesced down to a handful of frames
      // per second and visually appear to "not play". Finite-duration
      // globals and outside-space are always critical.
      if (animation.hold === true) {
        return true;
      }
      const durationMs = Number(animation.durationMs);
      if (Number.isFinite(durationMs) && durationMs > 0) {
        return true;
      }
      if (animation.durationMs === null) {
        return true;
      }
      const type = typeof animation.type === "string" ? animation.type : "";
      return type === "outside-space";
    }
    return false;
  }

  function shouldCoalesceNonCriticalAnimation(animation) {
    const state = ctx.state;
    if (isRenderCriticalAnimation(animation)) {
      return false;
    }
    const stride = Math.max(1, Number(state.runtimePerf.nonCriticalCoalesceStride) || 1);
    if (stride <= 1) {
      return false;
    }
    const frameIndex = Number(state.runtimePerf.frameIndex) || 0;
    const seed = computeAnimationCoalesceSeed(animation);
    return (frameIndex + seed) % stride !== 0;
  }

  function shouldSkipRoomMp4Frame(animation) {
    const state = ctx.state;
    const pressureLevel = Math.max(0, Math.min(2, Number(state.runtimePerf.pressureLevel) || 0));
    if (pressureLevel <= 0) {
      return false;
    }
    const stride = pressureLevel >= 2 ? 2 : 1;
    if (stride <= 1) {
      return false;
    }
    const frameIndex = Number(state.runtimePerf.frameIndex) || 0;
    const seed = computeAnimationCoalesceSeed(animation);
    return (frameIndex + seed) % stride !== 0;
  }

  function getRuntimeVisualCaps() {
    const state = ctx.state;
    const pressureLevel = Math.max(0, Math.min(2, Number(state.runtimePerf.pressureLevel) || 0));
    const outsideStarsPerLayer = Math.max(18, Number(state.runtimePerf.maxOutsideStarsPerLayer) || 110);
    const ashParticlesCap = Math.max(32, Number(state.runtimePerf.maxAshParticles) || 240);
    const nonCriticalDensityScale = pressureLevel >= 2 ? 0.54 : pressureLevel === 1 ? 0.74 : 1;
    return {
      pressureLevel,
      outsideStarsPerLayer,
      ashParticlesCap,
      nonCriticalDensityScale,
    };
  }

  function recordRuntimeFrameCost(frameCostMs) {
    const state = ctx.state;
    if (!Number.isFinite(frameCostMs) || frameCostMs <= 0) {
      return;
    }
    const samples = state.runtimePerf.frameCostSamples;
    samples.push(frameCostMs);
    if (samples.length > 240) {
      samples.shift();
    }
    const p90 = percentile(samples, 0.9);
    const targetMs = Number(state.runtimePerf.frameBudgetMs) || 16.7;
    const mp4LoadCount = state.runningAnimations.filter((animation) => {
      if (!animation || animation.scope !== "room" || animation.boardId !== state.boardId) {
        return false;
      }
      return ctx.normalizeRoomAssetType(animation.roomAssetType) === "mp4";
    }).length;
    const loadPenalty = mp4LoadCount >= 12 ? 0.18 : mp4LoadCount >= 8 ? 0.1 : mp4LoadCount >= 4 ? 0.04 : 0;
    const degradeThreshold = Math.max(1.05, BALANCED_CONTROLS.degradeThreshold - loadPenalty);
    const recoverThreshold = Math.max(0.55, Math.min(degradeThreshold - 0.05, BALANCED_CONTROLS.recoverThreshold));
    if (p90 > targetMs * degradeThreshold) {
      state.runtimePerf.qualityScale = Math.max(BALANCED_CONTROLS.qualityFloor, getRuntimeQualityScale() - 0.03);
    } else if (p90 < targetMs * recoverThreshold) {
      state.runtimePerf.qualityScale = Math.min(1, getRuntimeQualityScale() + 0.015);
    }
    if (p90 > targetMs * 1.9) {
      state.runtimePerf.pressureLevel = 2;
      state.runtimePerf.nonCriticalCoalesceStride = 3;
      state.runtimePerf.maxRenderAnimationsPerFrame = Math.min(BALANCED_CONTROLS.renderCap, 28);
      state.runtimePerf.maxAshParticles = 80;
      state.runtimePerf.maxOutsideStarsPerLayer = 34;
    } else if (p90 > targetMs * 1.35) {
      state.runtimePerf.pressureLevel = 1;
      state.runtimePerf.nonCriticalCoalesceStride = 2;
      state.runtimePerf.maxRenderAnimationsPerFrame = Math.min(BALANCED_CONTROLS.renderCap, 56);
      state.runtimePerf.maxAshParticles = 150;
      state.runtimePerf.maxOutsideStarsPerLayer = 64;
    } else {
      state.runtimePerf.pressureLevel = 0;
      state.runtimePerf.nonCriticalCoalesceStride = 1;
      state.runtimePerf.maxRenderAnimationsPerFrame = Math.min(BALANCED_CONTROLS.renderCap, 96);
      state.runtimePerf.maxAshParticles = 240;
      state.runtimePerf.maxOutsideStarsPerLayer = 110;
    }
  }

  window.TT_BEAMER_RUNTIME_PERF = {
    init,
    percentile,
    getRuntimeQualityScale,
    getMp4TierDefaults,
    getMp4PerformanceControls,
    computeAnimationCoalesceSeed,
    isRenderCriticalAnimation,
    shouldCoalesceNonCriticalAnimation,
    shouldSkipRoomMp4Frame,
    getRuntimeVisualCaps,
    recordRuntimeFrameCost,
  };
})();
