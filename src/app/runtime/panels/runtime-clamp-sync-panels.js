// Phase 14-2: clamp helpers + hitarea/room-geometry panel syncs.
//
// Owns assorted clamp helpers (room speed/sound-volume/cluster-stagger-
// offset/audio-volume/animation-speed/outside-intensity/outside-speed),
// normalizers (outside mode/direction), format/sync for the hitarea
// and room-geometry panels.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function clampRoomSpeed(value) {
    return Math.max(0.1, Math.min(2.5, Number(value) || 1));
  }

  function clampRoomSoundVolume(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function clampClusterStaggerOffsetMs(value) {
    const numeric = Math.round(Number(value));
    if (!Number.isFinite(numeric)) {
      return ctx.CLUSTER_STAGGER_OFFSET_DEFAULT_MS;
    }
    return Math.max(ctx.CLUSTER_STAGGER_OFFSET_MIN_MS, Math.min(ctx.CLUSTER_STAGGER_OFFSET_MAX_MS, numeric));
  }

  function syncRoomStaggerOffsetControl() {
    const state = ctx.state;
    const offsetMs = clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs);
    state.roomDraft.staggerOffsetMs = offsetMs;
    if (ctx.roomStaggerOffsetInput) {
      ctx.roomStaggerOffsetInput.value = String(offsetMs);
      ctx.roomStaggerOffsetInput.disabled = state.roomDraft.targetType !== "cluster";
    }
    if (ctx.roomStaggerOffsetValue) {
      ctx.roomStaggerOffsetValue.textContent = `${offsetMs}ms`;
    }
  }

  function clampAudioVolumePercent(value) {
    return Math.max(0, Math.min(100, value));
  }

  function clampAnimationSpeed(value) {
    return Math.max(0.5, Math.min(2.5, Number(value) || 1));
  }

  function clampOutsideIntensity(value) {
    return Math.max(0.2, Math.min(1.5, Number(value) || ctx.OUTSIDE_FX_DEFAULT.intensity));
  }

  function clampOutsideSpeed(value) {
    return Math.max(0.3, Math.min(2.5, Number(value) || ctx.OUTSIDE_FX_DEFAULT.speed));
  }

  function normalizeOutsideMode(value) {
    return value === "immersive" ? "immersive" : "standard";
  }

  function normalizeOutsideDirection(value) {
    return value === "reverse" ? "reverse" : "forward";
  }

  function formatHitareaValue(value) {
    const numeric = Number(value) || 0;
    return numeric.toFixed(3);
  }

  // Phase 15-2: no-op (panel removed).
  function syncHitareaStatus() {
    // intentionally empty
  }

  // Phase 15-2: legacy Hitarea Calibration panel removed from UI.
  // The underlying calibration state is preserved (so existing
  // board profiles still load and render polygons identically) but
  // the panel has no DOM to sync. No-op retained so call sites from
  // the runtime panels controller keep working without guards.
  function syncHitareaCalibrationPanel() {
    // intentionally empty
  }

  function formatRoomGeometryValue(value) {
    return (Number(value) || 0).toFixed(3);
  }

  // Phase 15-2: no-op (panel removed).
  function syncRoomGeometryStatus() {
    // intentionally empty
  }

  // Phase 15-2: legacy Room Geometry panel removed from UI.
  // Persisted roomGeometry state still flows through the transform
  // pipeline so polygons render identically; the user-facing sliders
  // and mode picker are gone. No-op retained for the runtime panels
  // controller call site.
  function syncRoomGeometryPanel() {
    // intentionally empty
  }

  window.TT_BEAMER_RUNTIME_CLAMP_SYNC_PANELS = {
    init,
    clampRoomSpeed,
    clampRoomSoundVolume,
    clampClusterStaggerOffsetMs,
    syncRoomStaggerOffsetControl,
    clampAudioVolumePercent,
    clampAnimationSpeed,
    clampOutsideIntensity,
    clampOutsideSpeed,
    normalizeOutsideMode,
    normalizeOutsideDirection,
    formatHitareaValue,
    syncHitareaStatus,
    syncHitareaCalibrationPanel,
    formatRoomGeometryValue,
    syncRoomGeometryStatus,
    syncRoomGeometryPanel,
  };
})();
