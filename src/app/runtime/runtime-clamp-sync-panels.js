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

  function syncHitareaStatus() {
    const calibration = ctx.getHitareaCalibration();
    ctx.hitareaStatus.textContent = `Hitarea: X ${formatHitareaValue(calibration.offsetX)}, Y ${formatHitareaValue(calibration.offsetY)}, Scale ${formatHitareaValue(calibration.scale)}`;
  }

  function syncHitareaCalibrationPanel() {
    const calibration = ctx.getHitareaCalibration();
    ctx.hitareaOffsetXInput.value = String(calibration.offsetX);
    ctx.hitareaOffsetYInput.value = String(calibration.offsetY);
    ctx.hitareaScaleInput.value = String(calibration.scale);
    ctx.hitareaOffsetXValue.textContent = formatHitareaValue(calibration.offsetX);
    ctx.hitareaOffsetYValue.textContent = formatHitareaValue(calibration.offsetY);
    ctx.hitareaScaleValue.textContent = formatHitareaValue(calibration.scale);
    syncHitareaStatus();
  }

  function formatRoomGeometryValue(value) {
    return (Number(value) || 0).toFixed(3);
  }

  function syncRoomGeometryStatus() {
    const state = ctx.state;
    const room = ctx.getSelectedRoom();
    if (!room) {
      ctx.roomGeometryStatus.textContent = "Room geometry: select a room on the board";
      return;
    }
    const geometry = ctx.getRoomGeometry(state.boardId, room.id);
    if (geometry.mode === "absolute") {
      ctx.roomGeometryStatus.textContent = `Room geometry (${room.name ?? room.label}): ABS X ${formatRoomGeometryValue(geometry.absoluteX)}, Y ${formatRoomGeometryValue(geometry.absoluteY)} | Stretch ${formatRoomGeometryValue(geometry.stretchX)}:${formatRoomGeometryValue(geometry.stretchY)}`;
      return;
    }
    ctx.roomGeometryStatus.textContent = `Room geometry (${room.name ?? room.label}): REL dX ${formatRoomGeometryValue(geometry.offsetX)}, dY ${formatRoomGeometryValue(geometry.offsetY)} | Stretch ${formatRoomGeometryValue(geometry.stretchX)}:${formatRoomGeometryValue(geometry.stretchY)}`;
  }

  function syncRoomGeometryPanel() {
    const state = ctx.state;
    const room = ctx.getSelectedRoom();
    const disabled = !room;
    ctx.roomGeometryModeInput.disabled = disabled;
    ctx.roomGeometryXInput.disabled = disabled;
    ctx.roomGeometryYInput.disabled = disabled;
    ctx.roomGeometryStretchXInput.disabled = disabled;
    ctx.roomGeometryStretchYInput.disabled = disabled;
    if (!room) {
      ctx.roomGeometryModeInput.value = "relative";
      ctx.roomGeometryXInput.value = "0";
      ctx.roomGeometryYInput.value = "0";
      ctx.roomGeometryXValue.textContent = "0.000";
      ctx.roomGeometryYValue.textContent = "0.000";
      ctx.roomGeometryStretchXInput.value = "1";
      ctx.roomGeometryStretchYInput.value = "1";
      ctx.roomGeometryStretchXValue.textContent = "1.000";
      ctx.roomGeometryStretchYValue.textContent = "1.000";
      syncRoomGeometryStatus();
      return;
    }
    const geometry = ctx.getRoomGeometry(state.boardId, room.id);
    ctx.roomGeometryModeInput.value = geometry.mode;
    const usesAbsolute = geometry.mode === "absolute";
    ctx.roomGeometryXInput.min = usesAbsolute ? "-0.2" : "-0.25";
    ctx.roomGeometryXInput.max = usesAbsolute ? "1.2" : "0.25";
    ctx.roomGeometryYInput.min = usesAbsolute ? "-0.2" : "-0.25";
    ctx.roomGeometryYInput.max = usesAbsolute ? "1.2" : "0.25";
    const xValue = usesAbsolute ? geometry.absoluteX : geometry.offsetX;
    const yValue = usesAbsolute ? geometry.absoluteY : geometry.offsetY;
    ctx.roomGeometryXInput.value = String(xValue);
    ctx.roomGeometryYInput.value = String(yValue);
    ctx.roomGeometryXValue.textContent = formatRoomGeometryValue(xValue);
    ctx.roomGeometryYValue.textContent = formatRoomGeometryValue(yValue);
    ctx.roomGeometryStretchXInput.value = String(geometry.stretchX);
    ctx.roomGeometryStretchYInput.value = String(geometry.stretchY);
    ctx.roomGeometryStretchXValue.textContent = formatRoomGeometryValue(geometry.stretchX);
    ctx.roomGeometryStretchYValue.textContent = formatRoomGeometryValue(geometry.stretchY);
    syncRoomGeometryStatus();
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
