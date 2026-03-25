export function clampRoomSoundVolume(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}
