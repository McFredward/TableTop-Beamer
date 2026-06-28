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

  // ── Phase 58 Wave 3.7n: adaptive video quality controller ────────
  //
  // Operator feature (2026-06-05): "Einen (optionalen) Modus, in dem
  // die Videos automatisch runterskalieren und z.B. eine 480p-Variante
  // nutzen, sobald erkannt wird, dass es massive Framedrops gibt."
  // Per-instance playback (play-then-freeze) means N rooms = N×1080p
  // decoders; 2-3 rooms already drop fps badly. Permanent quality
  // reduction was explicitly rejected — the tier must adapt.
  //
  // Tier is GLOBAL (all non-loop room-mp4 instances share it):
  //   "full"     → original asset / full-res reverse cache
  //   "proxy480" → /api/animation-proxy (forward) and
  //                /api/animation-reverse&height=480 (reverse)
  // Loop-mode room mp4s are exempt by design: they share ONE video
  // element (= one decoder) per asset across all rooms, so they don't
  // produce the N×decoder pressure this controller exists for — and
  // their src is owned by the Phase 28 hash-bust, which the swap
  // machinery must not fight (Wave 3.7i lesson).
  //
  // DOWNSWITCH: sustained distress (fps EMA < 20 OR pressureLevel >= 2
  // for >= 2.5s continuously) AND >= 2 active PLAYING (non-frozen)
  // room-mp4 instances.
  // UPSWITCH (hysteresis): sustained health (fps EMA > 28 AND
  // pressure == 0 for >= 10s) AND <= 1 active playing instance.
  // The <=1 guard is the anti-oscillation choice: while the heavy
  // multi-video scene is still playing, returning to full would
  // immediately re-create the distress that caused the downswitch
  // (2.5s down / 10s up would otherwise cycle every ~12.5s). In
  // practice the upswitch lands when the burst is over (instances
  // frozen or removed) and NEW instances then start at full quality.
  // Frozen instances never swap mid-freeze (draw loop pins them to
  // their applied tier); they pick up the current tier on the next
  // phase change.
  const ADAPTIVE_QUALITY_LS_KEY = "tt-beamer.adaptive-video-quality.v1";
  const ADAPTIVE_DOWN_FPS = 20;
  const ADAPTIVE_DOWN_SUSTAIN_MS = 2500;
  const ADAPTIVE_DOWN_MIN_PLAYING_MP4 = 2;
  const ADAPTIVE_UP_FPS = 28;
  const ADAPTIVE_UP_SUSTAIN_MS = 10000;
  const ADAPTIVE_UP_MAX_PLAYING_MP4 = 1;
  const ADAPTIVE_FPS_EMA_ALPHA = 0.1;

  let _adaptiveTier = "full";
  let _adaptiveEnabledCache = null;
  let _frameIntervalEmaMs = 0;
  let _lastAdaptiveTickAtMs = 0;
  let _distressSinceMs = 0;
  let _healthySinceMs = 0;

  function isAdaptiveVideoQualityEnabled() {
    if (_adaptiveEnabledCache === null) {
      try {
        _adaptiveEnabledCache = window.localStorage?.getItem(ADAPTIVE_QUALITY_LS_KEY) !== "0";
      } catch {
        _adaptiveEnabledCache = true;
      }
    }
    return _adaptiveEnabledCache;
  }

  function setAdaptiveVideoQualityEnabled(enabled) {
    const value = enabled !== false;
    _adaptiveEnabledCache = value;
    try {
      window.localStorage?.setItem(ADAPTIVE_QUALITY_LS_KEY, value ? "1" : "0");
    } catch { /* private mode etc. */ }
    if (!value && _adaptiveTier !== "full") {
      _logQualityChange(_adaptiveTier, "full", "toggle-off");
      _adaptiveTier = "full";
    }
    _distressSinceMs = 0;
    _healthySinceMs = 0;
  }

  function getAdaptiveVideoQualityTier() {
    return _adaptiveTier;
  }

  function _adaptiveFpsEstimate() {
    return _frameIntervalEmaMs > 0 ? 1000 / _frameIntervalEmaMs : 60;
  }

  function _logQualityChange(from, to, reason, playingMp4Count = 0) {
    // Phase 58 Wave 3.7n: permanent diagnostic (established [58]
    // console.warn pattern) — fires only on tier changes.
    console.warn("[58] quality", JSON.stringify({
      from,
      to,
      reason,
      fps: Number(_adaptiveFpsEstimate().toFixed(1)),
      pressure: Math.max(0, Math.min(2, Number(ctx?.state?.runtimePerf?.pressureLevel) || 0)),
      activeMp4Count: playingMp4Count,
    }));
  }

  // Called once per draw frame (from recordRuntimeFrameCost). The
  // interval between calls approximates the rAF frame interval, which
  // an EMA smooths into the controller's fps estimate.
  function _updateAdaptiveVideoQuality(playingMp4Count) {
    const nowMs = performance.now();
    if (_lastAdaptiveTickAtMs > 0) {
      const intervalMs = nowMs - _lastAdaptiveTickAtMs;
      // Skip absurd intervals (tab hidden / debugger pause) so a single
      // multi-second gap doesn't poison the EMA.
      if (intervalMs > 0 && intervalMs < 1000) {
        _frameIntervalEmaMs = _frameIntervalEmaMs > 0
          ? _frameIntervalEmaMs + ADAPTIVE_FPS_EMA_ALPHA * (intervalMs - _frameIntervalEmaMs)
          : intervalMs;
      }
    }
    _lastAdaptiveTickAtMs = nowMs;

    if (!isAdaptiveVideoQualityEnabled()) {
      if (_adaptiveTier !== "full") {
        _logQualityChange(_adaptiveTier, "full", "toggle-off", playingMp4Count);
        _adaptiveTier = "full";
      }
      _distressSinceMs = 0;
      _healthySinceMs = 0;
      return;
    }

    const fps = _adaptiveFpsEstimate();
    const pressureLevel = Math.max(0, Math.min(2, Number(ctx.state.runtimePerf.pressureLevel) || 0));

    const distress = (fps < ADAPTIVE_DOWN_FPS || pressureLevel >= 2)
      && playingMp4Count >= ADAPTIVE_DOWN_MIN_PLAYING_MP4;
    if (distress) {
      if (_distressSinceMs === 0) _distressSinceMs = nowMs;
      if (_adaptiveTier === "full" && nowMs - _distressSinceMs >= ADAPTIVE_DOWN_SUSTAIN_MS) {
        const reason = fps < ADAPTIVE_DOWN_FPS ? `fps<${ADAPTIVE_DOWN_FPS}` : "pressure>=2";
        _logQualityChange("full", "proxy480", reason, playingMp4Count);
        _adaptiveTier = "proxy480";
        _healthySinceMs = 0;
      }
    } else {
      _distressSinceMs = 0;
    }

    const healthy = fps > ADAPTIVE_UP_FPS
      && pressureLevel === 0
      && playingMp4Count <= ADAPTIVE_UP_MAX_PLAYING_MP4;
    if (healthy) {
      if (_healthySinceMs === 0) _healthySinceMs = nowMs;
      if (_adaptiveTier === "proxy480" && nowMs - _healthySinceMs >= ADAPTIVE_UP_SUSTAIN_MS) {
        _logQualityChange("proxy480", "full", "recovered", playingMp4Count);
        _adaptiveTier = "full";
        _distressSinceMs = 0;
      }
    } else {
      _healthySinceMs = 0;
    }
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
    // Phase 58 Wave 3.7n: count playing (non-frozen) instances
    // alongside the total — the adaptive quality controller keys on
    // decode pressure, and frozen instances paint fallback-only
    // (v1.2.15) so they cost ~nothing.
    let playingMp4Count = 0;
    const mp4LoadCount = state.runningAnimations.filter((animation) => {
      if (!animation || animation.scope !== "room" || animation.boardId !== state.boardId) {
        return false;
      }
      const isMp4 = ctx.normalizeRoomAssetType(animation.roomAssetType) === "mp4";
      if (isMp4) {
        const phase = animation.playbackPhase || "forward";
        if (phase !== "frozen-last" && phase !== "frozen-first") {
          playingMp4Count += 1;
        }
      }
      return isMp4;
    }).length;
    _updateAdaptiveVideoQuality(playingMp4Count);
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
    // Phase 58 Wave 3.7n — adaptive video quality controller
    getAdaptiveVideoQualityTier,
    isAdaptiveVideoQualityEnabled,
    setAdaptiveVideoQualityEnabled,
  };
})();
