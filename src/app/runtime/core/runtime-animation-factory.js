// animation factory + small runtime helpers.
//
// Owns the monotonic animation id counter and the createAnimation
// factory that clamps inputs and stamps startedAt/startedAtEpochMs.
// Also owns flickerNoise (pseudo-random hash used by effect visuals),
// updateActiveBoardHitareaCalibration, and updateSelectedRoomGeometry.
(() => {
  let ctx = null;
  let animationIdCounter = 1;
  // Phase 58 Wave 3.7h (2026-06-05): per-page-load session suffix so
  // animation ids are collision-free ACROSS page loads and across
  // concurrent clients. Bare `anim-${counter}` with the counter
  // resetting to 1 per load meant a reload (or a second control client,
  // e.g. the mobile dashboard) reused ids of still-running instances —
  // the new instance then inherited the stale per-instance video /
  // playback caches keyed by `${assetRef}#${id}`: rVFC never re-bound,
  // the previous animation's frozen fallback frame painted forever
  // (phase-58-bugB-flicker.md root cause 2). Ids are treated as opaque
  // strings everywhere (server + client compare only), so the format
  // change is safe; global-* ids are generated separately and unchanged.
  const animationIdSessionSuffix =
    `${Date.now().toString(36)}${Math.floor(Math.random() * 0x7fffffff).toString(36)}`;

  function init(dependencies) {
    ctx = dependencies;
  }

  function createAnimation({
    type,
    animationName = "",
    roomAssetType = "",
    roomAssetRef = "",
    scope,
    boardId = ctx.state.boardId,
    roomId = null,
    intensity = 0.8,
    speed = 1,
    opacity = 0.9,
    soundVolume = 1,
    hold = false,
    durationSec = 15,
    startDelayMs = 0,
    soundAssetRef = "",
    rotationDeg = 0,
    stretchToPolygon = true,
    widthScale = 1,
    heightScale = 1,
    offsetXScale = 0,
    offsetYScale = 0,
    colorHex = "",
    mode = "",
    direction = "",
    // Phase 58: per-animation playback mode + on-retrigger sub-option.
    // Defaults preserve legacy loop behavior for any caller not yet
    // wired to pass these through. See 58-CONTEXT.md for state machine.
    playbackMode = "loop",
    onRetrigger = "instant-disappear",
    playbackDirection = "forward",
    // Phase 58-w3.8g: heat coded-effect options (see
    // normalizeRoomAnimationDefinition). Defaults match the
    // pre-option behavior: visible source, no pulse sync.
    heatShowSource = true,
    heatSyncNearestSource = false,
    // Phase 58-w3.8i: merged city-workers options (see
    // normalizeRoomAnimationDefinition). workerCount defaults to null
    // = legacy intensity-derived population, so a caller that misses
    // the field renders the historical look instead of a masked count.
    workerStyle = "dark",
    workerCount = null,
    workerGroups = "normal",
    workerLanternShare = 30,
    workerTrails = true,
    // Phase 58-w3.8s: "Größe der Bewohner" multiplier (0.5–2.0,
    // default 1.0). A missing field renders the historical figure size.
    workerSize = 1,
    // Phase 58-w3.9l: "Gehbewegung" walk-sway 0–150 % of the original gait
    // swing. Default 55 (calmer) — a missing field renders the calmer walk,
    // NOT the old amplitude (operator: the prior walk swung too much).
    workerSwayAmount = 55,
    // Phase 58-w3.8w: clothing brightness multiplier (0.3–2.0, default
    // 1.0 = current look), snow-trail intensity (0–100, default 100 =
    // current peak), and center-exclusion toggle + radius (0–60% of the
    // region radius, default 25, only active when the toggle is on).
    // Defaults reproduce the historical render byte-for-byte.
    workerClothingBrightness = 1,
    workerTrailIntensity = 100,
    workerCenterExclusion = false,
    workerCenterExclusionRadius = 25,
    // Phase 58-w3.9b: exclusion-zone centre offset + visible-ring toggle.
    workerExclusionOffsetX = 0,
    workerExclusionOffsetY = 0,
    workerExclusionRingVisible = true,
    // Phase 58-w3.8x: optional irregular (seeded) heat pulse. Default
    // off = the regular ~0.24 Hz breathing, byte-identical to before.
    heatIrregularPulse = false,
    // Phase 58-w3.9m: coded snow options — "Dichte" (snowDensity, 0–100 %
    // flake count), "Geschwindigkeit" (snowSpeed, 0–100 % fall rate) and
    // "Sturm" (snowStorm, bool). Defaults approximate the calm snow.mp4.
    snowDensity = 55,
    snowSpeed = 50,
    snowStorm = false,
    // Phase 58-w3.9h: optional fade-in/fade-out (per-definition, all
    // scopes + asset types). Defaults preserve the abrupt start/stop, so a
    // caller that misses these forwards the legacy behavior (Phase 50
    // factory-default-mask contract — every dispatch site forwards them).
    fadeEnabled = false,
    fadeDurationMs = 800,
  }) {
    const normalizedStartDelayMs = Math.max(0, Number(startDelayMs) || 0);
    const startedAt = performance.now() + normalizedStartDelayMs;
    const startedAtEpochMs = Date.now() + normalizedStartDelayMs;
    const effectiveHold = scope === "room" || scope === "cluster" ? true : hold;
    return {
      id: `anim-${animationIdSessionSuffix}-${animationIdCounter++}`,
      boardId,
      type,
      animationName: String(animationName || "").trim() || undefined,
      roomAssetType: String(roomAssetType || "").trim() || undefined,
      roomAssetRef: String(roomAssetRef || "").trim() || undefined,
      // Carry the per-definition sound selection onto the
      // runtime animation entry so playSoundForAnimation can resolve
      // the path directly from the animation. This per-animation ref is
      // the sole source of audio post-Phase-29.
      soundAssetRef: String(soundAssetRef || "").trim() || undefined,
      rotationDeg: Number(rotationDeg) || 0,
      stretchToPolygon: stretchToPolygon !== false,
      widthScale: Number(widthScale) || 1,
      heightScale: Number(heightScale) || 1,
      offsetXScale: Number(offsetXScale) || 0,
      offsetYScale: Number(offsetYScale) || 0,
      colorHex: typeof colorHex === "string" && /^#[0-9a-f]{6}$/i.test(colorHex) ? colorHex : undefined,
      scope,
      roomId,
      intensity,
      speed: ctx.clampRoomSpeed(speed),
      opacity: ctx.clampRoomOpacity(opacity),
      playbackSpeed: ctx.clampRoomSpeed(speed),
      soundVolume: ctx.clampRoomSoundVolume(soundVolume),
      // Carry per-instance outside knobs so the draw
      // path reads the values captured at trigger time (and later
      // mutated by the Live Editor) rather than the definition's
      // latest uncommitted edits. Leaves room/cluster entries
      // unaffected since upsert call sites don't pass these.
      mode: typeof mode === "string" && mode ? mode : undefined,
      direction: typeof direction === "string" && direction ? direction : undefined,
      // Phase 58 instance-level playback mode (see CONTEXT.md). Carried
      // from the animation DEFINITION at trigger time so the running
      // instance keeps the mode it was started with, even if the
      // operator later edits the definition's mode. Per-trigger
      // override (Wave 4) will also feed through this same channel.
      playbackMode: typeof playbackMode === "string" && playbackMode ? playbackMode : "loop",
      onRetrigger: typeof onRetrigger === "string" && onRetrigger ? onRetrigger : "instant-disappear",
      playbackDirection: typeof playbackDirection === "string" && playbackDirection ? playbackDirection : "forward",
      // Phase 58 playback phase state. Owned by the render path /
      // lifecycle observers. Values match the initial direction (set
      // here from playbackDirection so reverse-direction triggers start
      // in the reverse phase). Transitions on EOS for boomerang +
      // reverse-on-retrigger modes.
      playbackPhase: typeof playbackDirection === "string" && playbackDirection === "reverse"
        ? "reverse"
        : "forward",
      // Phase 58-w3.8g: heat options live on the instance (Phase 50
      // factory-default-mask precedent: every dispatch call site must
      // pass them explicitly or these defaults silently mask the
      // definition's values). Snapshots carry them via full-object
      // spread in buildAnimationSnapshotForLiveSync.
      heatShowSource: heatShowSource !== false,
      heatSyncNearestSource: heatSyncNearestSource === true,
      // Phase 58-w3.8i: merged city-workers options on the instance
      // (same factory-default-mask contract as the heat fields above;
      // snapshots carry them via the full-object spread).
      workerStyle: workerStyle === "lit" ? "lit" : "dark",
      workerCount: Number.isFinite(Number(workerCount)) && Number(workerCount) > 0
        ? Math.min(24, Number(workerCount))
        : null,
      workerGroups: ["off", "rare", "normal", "frequent"].includes(workerGroups)
        ? workerGroups
        : "normal",
      workerLanternShare: Number.isFinite(Number(workerLanternShare))
        ? Math.max(0, Math.min(100, Number(workerLanternShare)))
        : 30,
      workerTrails: workerTrails !== false,
      // Phase 58-w3.8s: figure-size multiplier, clamped 0.5–2.0
      // (default 1.0 = historical size).
      workerSize: Number.isFinite(Number(workerSize)) && Number(workerSize) > 0
        ? Math.max(0.5, Math.min(2, Number(workerSize)))
        : 1,
      // Phase 58-w3.9l: walk-sway amount, clamped 0–150 (% of the original
      // gait swing); missing/invalid → 55 (the calmer default).
      workerSwayAmount: Number.isFinite(Number(workerSwayAmount))
        ? Math.max(0, Math.min(150, Number(workerSwayAmount)))
        : 55,
      // Phase 58-w3.8w: clothing brightness / trail intensity / center
      // exclusion (same factory-default-mask contract as the fields
      // above — every dispatch call site forwards them explicitly).
      workerClothingBrightness: Number.isFinite(Number(workerClothingBrightness)) && Number(workerClothingBrightness) > 0
        ? Math.max(0.3, Math.min(2, Number(workerClothingBrightness)))
        : 1,
      // Phase 58-w3.9b: trail-intensity ceiling raised 100 → 300.
      workerTrailIntensity: Number.isFinite(Number(workerTrailIntensity))
        ? Math.max(0, Math.min(300, Number(workerTrailIntensity)))
        : 100,
      workerCenterExclusion: workerCenterExclusion === true,
      workerCenterExclusionRadius: Number.isFinite(Number(workerCenterExclusionRadius))
        ? Math.max(0, Math.min(60, Number(workerCenterExclusionRadius)))
        : 25,
      // Phase 58-w3.9b: exclusion-zone centre offset (−50..+50% of the
      // region half-extent) + visible-ring toggle (default on).
      workerExclusionOffsetX: Number.isFinite(Number(workerExclusionOffsetX))
        ? Math.max(-50, Math.min(50, Number(workerExclusionOffsetX)))
        : 0,
      workerExclusionOffsetY: Number.isFinite(Number(workerExclusionOffsetY))
        ? Math.max(-50, Math.min(50, Number(workerExclusionOffsetY)))
        : 0,
      workerExclusionRingVisible: workerExclusionRingVisible !== false,
      // Phase 58-w3.8x: optional irregular heat pulse.
      heatIrregularPulse: heatIrregularPulse === true,
      // Phase 58-w3.9m: coded snow options on the instance (same
      // factory-default-mask contract — every dispatch site forwards them).
      snowDensity: Number.isFinite(Number(snowDensity))
        ? Math.max(0, Math.min(100, Number(snowDensity)))
        : 55,
      snowSpeed: Number.isFinite(Number(snowSpeed))
        ? Math.max(0, Math.min(100, Number(snowSpeed)))
        : 50,
      snowStorm: snowStorm === true,
      // Phase 58-w3.9h: per-instance fade config (same factory-default-mask
      // contract as the fields above; snapshots carry these via the full
      // object spread in buildAnimationSnapshotForLiveSync). The render
      // applies the fade as a time-pure opacity multiplier; fadeOutStartedAt*
      // are stamped later (at stop) by the deferred fade-out pipeline.
      fadeEnabled: fadeEnabled === true,
      fadeDurationMs: Number.isFinite(Number(fadeDurationMs))
        ? Math.max(100, Math.min(5000, Number(fadeDurationMs)))
        : 800,
      hold: effectiveHold,
      durationMs: effectiveHold ? null : Math.max(1000, durationSec * 1000),
      startedAt,
      startedAtEpochMs,
    };
  }

  function flickerNoise(seed) {
    const raw = Math.sin(seed * 127.1) * 43758.5453123;
    return raw - Math.floor(raw);
  }

  function updateActiveBoardHitareaCalibration(partial) {
    const state = ctx.state;
    ctx.setHitareaCalibration(state.boardId, {
      ...ctx.getHitareaCalibration(state.boardId),
      ...partial,
    });
    ctx.syncHitareaCalibrationPanel();
    ctx.renderRoomOverlay();
    ctx.hitareaStatus.textContent = `${ctx.hitareaStatus.textContent} (not saved)`;
  }

  function updateSelectedRoomGeometry(partial, statusSuffix = "") {
    const state = ctx.state;
    const room = ctx.getSelectedRoom();
    if (!room) {
      return;
    }
    ctx.updateRoomGeometry(state.boardId, room.id, partial);
    const persisted = ctx.persistBoardProfiles();
    ctx.renderRoomOverlay();
    ctx.syncRoomGeometryPanel();
    if (statusSuffix) {
      ctx.triggerFeedback.textContent = persisted
        ? `Status: ${room.name ?? room.label} ${statusSuffix}`
        : `Status: ${room.name ?? room.label} ${statusSuffix} (persistence failed)`;
    }
  }

  window.TT_BEAMER_RUNTIME_ANIMATION_FACTORY = {
    init,
    createAnimation,
    flickerNoise,
    updateActiveBoardHitareaCalibration,
    updateSelectedRoomGeometry,
  };
})();
