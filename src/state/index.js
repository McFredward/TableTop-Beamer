export function clampRoomIntensity(value) {
  return Math.max(0.2, Math.min(1.5, value));
}

export function clampRoomOpacity(value) {
  return Math.max(0.1, Math.min(1, Number(value) || 1));
}

export function clampGifPlaybackSpeed(value) {
  return Math.max(0.25, Math.min(3, Number(value) || 1));
}

export function clampRoomDurationSec(value) {
  return Math.max(1, Math.min(180, value));
}

export function clampAlienCount(value) {
  return Math.max(0, Math.min(2, Math.round(Number(value) || 0)));
}

export function clampRoomSpeed(value) {
  return Math.max(0.5, Math.min(2.5, Number(value) || 1));
}

export function clampAudioVolumePercent(value) {
  return Math.max(0, Math.min(100, value));
}

export function clampAnimationSpeed(value) {
  return Math.max(0.5, Math.min(2.5, Number(value) || 1));
}

export function clampOutsideIntensity(value, defaultValue = 0.7) {
  return Math.max(0.2, Math.min(1.5, Number(value) || defaultValue));
}

export function clampOutsideSpeed(value, defaultValue = 1) {
  return Math.max(0.3, Math.min(2.5, Number(value) || defaultValue));
}

export function normalizeOutsideMode(value) {
  return value === "immersive" ? "immersive" : "standard";
}

export function normalizeOutsideDirection(value) {
  return value === "reverse" ? "reverse" : "forward";
}

export function normalizeRoomGeometryMode(mode) {
  return mode === "absolute" ? "absolute" : "relative";
}
