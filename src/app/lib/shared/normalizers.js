// Shared normalizers. Pure data-shape helpers - normalizeAnimationSoundMap,
// normalizeQuickMode, normalizePerRoomOpacityMap, etc. - used by both
// runtime and any future test harness. Reads TT_BEAMER_CONFIG for
// canonical defaults.

(() => {
  const {
    ALL_ANIMATION_TYPES,
    EVENT_SOUND_ASSETS,
    SOUND_MAPPING_NONE,
    ALL_SOUND_ASSET_PATHS,
  } = window.TT_BEAMER_CONFIG;

  function createDefaultAnimationSoundMap() {
    const defaults = {};
    for (const { id } of ALL_ANIMATION_TYPES) {
      defaults[id] = EVENT_SOUND_ASSETS[id]?.[0] ?? SOUND_MAPPING_NONE;
    }
    return defaults;
  }

  function getAnimationLabel(animationType) {
    return ALL_ANIMATION_TYPES.find((entry) => entry.id === animationType)?.label ?? animationType;
  }

  function getGlobalAnimationCategory(animationType, globalAnimations) {
    return globalAnimations.find((entry) => entry.id === animationType)?.category ?? "inside-ship";
  }

  function getGlobalCategoryRuntimeLabel(animationType, globalAnimations) {
    return getGlobalAnimationCategory(animationType, globalAnimations) === "outside-ship"
      ? "GLOBAL-OUTSIDE"
      : "GLOBAL-INSIDE";
  }

  function normalizeAnimationSoundPath(animationType, path) {
    if (path === SOUND_MAPPING_NONE) {
      return SOUND_MAPPING_NONE;
    }
    if (ALL_SOUND_ASSET_PATHS.includes(path)) {
      return path;
    }
    const defaultPath = EVENT_SOUND_ASSETS[animationType]?.[0];
    if (defaultPath && ALL_SOUND_ASSET_PATHS.includes(defaultPath)) {
      return defaultPath;
    }
    return SOUND_MAPPING_NONE;
  }

  function normalizeAnimationSoundMap(soundMap) {
    const defaults = createDefaultAnimationSoundMap();
    for (const animationType of Object.keys(defaults)) {
      defaults[animationType] = normalizeAnimationSoundPath(animationType, soundMap?.[animationType]);
    }
    return defaults;
  }

  function isFiniteUnitValue(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1;
  }

  function clampHitareaOffset(value) {
    return Math.max(-0.15, Math.min(0.15, value));
  }

  function clampHitareaScale(value) {
    return Math.max(0.85, Math.min(1.15, value));
  }

  function normalizeHitareaCalibration(calibration) {
    return {
      offsetX: clampHitareaOffset(Number(calibration?.offsetX) || 0),
      offsetY: clampHitareaOffset(Number(calibration?.offsetY) || 0),
      scale: clampHitareaScale(Number(calibration?.scale) || 1),
    };
  }

  function clampRoomRelativeOffset(value) {
    return Math.max(-0.25, Math.min(0.25, value));
  }

  function clampRoomAbsoluteCoordinate(value) {
    return Math.max(-0.2, Math.min(1.2, value));
  }

  window.TT_BEAMER_NORMALIZERS = {
    createDefaultAnimationSoundMap,
    getAnimationLabel,
    getGlobalAnimationCategory,
    getGlobalCategoryRuntimeLabel,
    normalizeAnimationSoundPath,
    normalizeAnimationSoundMap,
    isFiniteUnitValue,
    clampHitareaOffset,
    clampHitareaScale,
    normalizeHitareaCalibration,
    clampRoomRelativeOffset,
    clampRoomAbsoluteCoordinate,
  };
})();
