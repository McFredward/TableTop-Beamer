export function resolveRoomAnimationEffectType(type, roomGlobalEquivalentMap) {
  if (type === "nest") {
    return "special-nest";
  }
  if (type === "dekompression") {
    return "special-decompression";
  }
  return roomGlobalEquivalentMap[type] ?? type;
}

export function getRoomEquivalentType(type, roomGlobalEquivalentMap) {
  return roomGlobalEquivalentMap[type] ?? null;
}
