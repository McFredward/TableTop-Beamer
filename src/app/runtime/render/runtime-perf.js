// runtime performance module.
//
// Owns the mp4/quality performance pipeline: performance-tier
// normalization, adaptive quality-scale feedback loop, mp4 frame
// coalescing helpers, per-frame pressure-level reassignment,
// mobile performance status bar, and the mp4 performance settings
// panel.
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;

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
    const controls = getMp4PerformanceControls();
    return Math.max(controls.qualityFloor, Math.min(1, Number(state.runtimePerf.qualityScale) || 1));
  }

  function normalizeMp4PerformanceTier(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "quality" || normalized === "performance") {
      return normalized;
    }
    return "balanced";
  }

  function getMp4TierDefaults(tier) {
    if (tier === "quality") {
      return {
        renderCap: 72,
        qualityFloor: 0.78,
        degradeThreshold: 1.55,
        recoverThreshold: 0.9,
      };
    }
    if (tier === "performance") {
      return {
        renderCap: 32,
        qualityFloor: 0.55,
        degradeThreshold: 1.2,
        recoverThreshold: 0.8,
      };
    }
    return {
      renderCap: 48,
      qualityFloor: 0.68,
      degradeThreshold: 1.35,
      recoverThreshold: 0.92,
    };
  }

  function normalizeMp4PerformanceControls(raw = {}) {
    const tier = normalizeMp4PerformanceTier(raw.tier);
    const defaults = getMp4TierDefaults(tier);
    const degradeThreshold = Math.max(1.05, Math.min(2, Number(raw.degradeThreshold) || defaults.degradeThreshold));
    const recoverThreshold = Math.max(0.55, Math.min(1.2, Number(raw.recoverThreshold) || defaults.recoverThreshold));
    return {
      tier,
      renderCap: Math.max(8, Math.min(96, Math.round(Number(raw.renderCap) || defaults.renderCap))),
      qualityFloor: Math.max(0.45, Math.min(1, Number(raw.qualityFloor) || defaults.qualityFloor)),
      degradeThreshold,
      recoverThreshold: Math.min(degradeThreshold - 0.05, recoverThreshold),
    };
  }

  function getMp4PerformanceControls() {
    const state = ctx.state;
    state.runtimePerf.mp4Controls = normalizeMp4PerformanceControls(state.runtimePerf.mp4Controls);
    return state.runtimePerf.mp4Controls;
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
      // Loop-until-stopped globals (hold=true or null
      // durationMs) must also render every frame — otherwise an inside
      // loop like Hull Flicker gets coalesced down to a handful of
      // frames per second and visually appears to "not play" even
      // though it's in the list. Previously only finite-duration
      // globals and outside-space were treated as critical, which
      // meant looped inside globals fell into the non-critical budget
      // and could be skipped under any coalesce stride > 1.
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
    const controls = getMp4PerformanceControls();
    const pressureLevel = Math.max(0, Math.min(2, Number(state.runtimePerf.pressureLevel) || 0));
    if (pressureLevel <= 0 && controls.tier !== "performance") {
      return false;
    }
    const stride = controls.tier === "performance"
      ? (pressureLevel >= 2 ? 3 : 2)
      : pressureLevel >= 2
        ? 2
        : 1;
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
    const controls = getMp4PerformanceControls();
    const mp4LoadCount = state.runningAnimations.filter((animation) => {
      if (!animation || animation.scope !== "room" || animation.boardId !== state.boardId) {
        return false;
      }
      return ctx.normalizeRoomAssetType(animation.roomAssetType) === "mp4";
    }).length;
    const loadPenalty = mp4LoadCount >= 12 ? 0.18 : mp4LoadCount >= 8 ? 0.1 : mp4LoadCount >= 4 ? 0.04 : 0;
    const degradeThreshold = Math.max(1.05, controls.degradeThreshold - loadPenalty);
    const recoverThreshold = Math.max(0.55, Math.min(degradeThreshold - 0.05, controls.recoverThreshold));
    if (p90 > targetMs * degradeThreshold) {
      state.runtimePerf.qualityScale = Math.max(controls.qualityFloor, getRuntimeQualityScale() - 0.03);
    } else if (p90 < targetMs * recoverThreshold) {
      state.runtimePerf.qualityScale = Math.min(1, getRuntimeQualityScale() + 0.015);
    }
    if (p90 > targetMs * 1.9) {
      state.runtimePerf.pressureLevel = 2;
      state.runtimePerf.nonCriticalCoalesceStride = 3;
      state.runtimePerf.maxRenderAnimationsPerFrame = Math.min(controls.renderCap, 28);
      state.runtimePerf.maxAshParticles = 80;
      state.runtimePerf.maxOutsideStarsPerLayer = 34;
    } else if (p90 > targetMs * 1.35) {
      state.runtimePerf.pressureLevel = 1;
      state.runtimePerf.nonCriticalCoalesceStride = 2;
      state.runtimePerf.maxRenderAnimationsPerFrame = Math.min(controls.renderCap, 56);
      state.runtimePerf.maxAshParticles = 150;
      state.runtimePerf.maxOutsideStarsPerLayer = 64;
    } else {
      state.runtimePerf.pressureLevel = 0;
      state.runtimePerf.nonCriticalCoalesceStride = 1;
      state.runtimePerf.maxRenderAnimationsPerFrame = Math.min(controls.renderCap, 96);
      state.runtimePerf.maxAshParticles = 240;
      state.runtimePerf.maxOutsideStarsPerLayer = 110;
    }
  }

  function syncMobilePerformanceStatus() {
    const state = ctx.state;
    if (!ctx.mobilePerformanceStatus) {
      return;
    }
    const trigger = state.mobilePerf.triggerLatencySamples;
    const frames = state.mobilePerf.frameDeltaSamples;
    if (trigger.length === 0 || frames.length === 0) {
      ctx.mobilePerformanceStatus.textContent = "Mobile performance: no snapshot yet";
      return;
    }
    const p95Trigger = percentile(trigger, 0.95);
    const p95Frame = percentile(frames, 0.95);
    const approxFps = p95Frame > 0 ? (1000 / p95Frame).toFixed(1) : "0.0";
    const jankFrames = frames.filter((delta) => delta >= 40).length;
    const jankRate = frames.length > 0 ? (jankFrames / frames.length) * 100 : 0;
    const quality = Math.round(getRuntimeQualityScale() * 100);
    ctx.mobilePerformanceStatus.textContent =
      `Mobile Performance: Trigger p95 ${p95Trigger.toFixed(1)}ms | Frame p95 ${p95Frame.toFixed(1)}ms (~${approxFps} FPS) | Jank>=40ms ${jankRate.toFixed(1)}% | Quality ${quality}%`;
  }

  function syncMp4PerformanceControlsPanel() {
    const state = ctx.state;
    const controls = getMp4PerformanceControls();
    state.runtimePerf.maxRenderAnimationsPerFrame = Math.min(
      Number(state.runtimePerf.maxRenderAnimationsPerFrame) || 96,
      controls.renderCap,
    );
    if (ctx.mp4PerformanceTierInput) {
      ctx.mp4PerformanceTierInput.value = controls.tier;
    }
    if (ctx.mp4RenderCapInput) {
      ctx.mp4RenderCapInput.value = String(controls.renderCap);
    }
    if (ctx.mp4RenderCapValue) {
      ctx.mp4RenderCapValue.textContent = String(controls.renderCap);
    }
    if (ctx.mp4QualityFloorInput) {
      ctx.mp4QualityFloorInput.value = controls.qualityFloor.toFixed(2);
    }
    if (ctx.mp4QualityFloorValue) {
      ctx.mp4QualityFloorValue.textContent = controls.qualityFloor.toFixed(2);
    }
    if (ctx.mp4DegradeThresholdInput) {
      ctx.mp4DegradeThresholdInput.value = controls.degradeThreshold.toFixed(2);
    }
    if (ctx.mp4DegradeThresholdValue) {
      ctx.mp4DegradeThresholdValue.textContent = controls.degradeThreshold.toFixed(2);
    }
    if (ctx.mp4RecoverThresholdInput) {
      ctx.mp4RecoverThresholdInput.value = controls.recoverThreshold.toFixed(2);
    }
    if (ctx.mp4RecoverThresholdValue) {
      ctx.mp4RecoverThresholdValue.textContent = controls.recoverThreshold.toFixed(2);
    }
    if (ctx.mp4PerformanceStatus) {
      const pressure = Math.max(0, Math.min(2, Number(state.runtimePerf.pressureLevel) || 0));
      ctx.mp4PerformanceStatus.textContent =
        `MP4 controls: ${controls.tier} | cap ${controls.renderCap}/frame | floor ${controls.qualityFloor.toFixed(2)} | pressure ${pressure}`;
    }
  }

  function updateMp4PerformanceControls(partial, { announce = true } = {}) {
    const state = ctx.state;
    state.runtimePerf.mp4Controls = normalizeMp4PerformanceControls({
      ...getMp4PerformanceControls(),
      ...partial,
    });
    state.runtimePerf.maxRenderAnimationsPerFrame = Math.min(
      Number(state.runtimePerf.maxRenderAnimationsPerFrame) || 96,
      state.runtimePerf.mp4Controls.renderCap,
    );
    syncMp4PerformanceControlsPanel();
    ctx.persistRuntimeSoundSettingsChange("Status: MP4 controls updated, but persistence failed");
    if (announce) {
      const controls = getMp4PerformanceControls();
      ctx.triggerFeedback.textContent =
        `Status: MP4 controls updated (${controls.tier}, cap ${controls.renderCap}/frame, floor ${controls.qualityFloor.toFixed(2)})`;
    }
  }

  window.TT_BEAMER_RUNTIME_PERF = {
    init,
    percentile,
    getRuntimeQualityScale,
    normalizeMp4PerformanceTier,
    getMp4TierDefaults,
    normalizeMp4PerformanceControls,
    getMp4PerformanceControls,
    computeAnimationCoalesceSeed,
    isRenderCriticalAnimation,
    shouldCoalesceNonCriticalAnimation,
    shouldSkipRoomMp4Frame,
    getRuntimeVisualCaps,
    recordRuntimeFrameCost,
    updateMobilePerformanceStatus: syncMobilePerformanceStatus,
    syncMp4PerformanceControlsPanel,
    updateMp4PerformanceControls,
  };
})();
