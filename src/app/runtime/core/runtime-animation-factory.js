// Phase 14-2: animation factory + small runtime helpers.
//
// Owns the monotonic animation id counter and the createAnimation
// factory that clamps inputs and stamps startedAt/startedAtEpochMs.
// Also owns flickerNoise (pseudo-random hash used by effect visuals),
// updateActiveBoardHitareaCalibration, and updateSelectedRoomGeometry.
(() => {
  let ctx = null;
  let animationIdCounter = 1;

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
  }) {
    const normalizedStartDelayMs = Math.max(0, Number(startDelayMs) || 0);
    const startedAt = performance.now() + normalizedStartDelayMs;
    const startedAtEpochMs = Date.now() + normalizedStartDelayMs;
    const effectiveHold = scope === "room" || scope === "cluster" ? true : hold;
    return {
      id: `anim-${animationIdCounter++}`,
      boardId,
      type,
      animationName: String(animationName || "").trim() || undefined,
      roomAssetType: String(roomAssetType || "").trim() || undefined,
      roomAssetRef: String(roomAssetRef || "").trim() || undefined,
      // Phase 15-9: carry the per-definition sound selection onto the
      // runtime animation entry so playSoundForAnimation can resolve
      // the path without reaching back through state.animationSoundMap.
      soundAssetRef: String(soundAssetRef || "").trim() || undefined,
      rotationDeg: Number(rotationDeg) || 0,
      stretchToPolygon: stretchToPolygon !== false,
      widthScale: Number(widthScale) || 1,
      heightScale: Number(heightScale) || 1,
      offsetXScale: Number(offsetXScale) || 0,
      offsetYScale: Number(offsetYScale) || 0,
      scope,
      roomId,
      intensity,
      speed: ctx.clampRoomSpeed(speed),
      opacity: ctx.clampRoomOpacity(opacity),
      playbackSpeed: ctx.clampRoomSpeed(speed),
      soundVolume: ctx.clampRoomSoundVolume(soundVolume),
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
