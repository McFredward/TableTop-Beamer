import { createGameObserver } from "./game-observer.js";

export function createAnimationCameraBindings(board, registration, width, height) {
  const at = ([x, y]) => {
    const point = registration.at({ x, y });
    return { x: point.x / width, y: point.y / height };
  };
  const roomZones = board.roomCatalog.filter(room => room.polygon?.length >= 3).map(room => ({
    id: room.id, name: room.name, polygon: room.polygon.map(at),
    corridor: /^(?:\d{3}-\d{3}(?:-\d+)?|TC(?:-\d+)?)$/.test(room.name),
  }));
  const boardZone = { id: null, name: "Board", polygon: [[0, 0], [1, 0], [1, 1], [0, 1]].map(at) };
  const feeds = new Map();
  for (const scope of ["room", "inside", "outside"]) {
    for (const { id, name, cameraTrigger } of board[scope + "Fx"]?.animations ?? []) {
      const { modelId, className, minConfidence, verificationOpacity } = cameraTrigger ?? {};
      if (typeof modelId !== "string" || !modelId || typeof className !== "string" || !className) continue;
      const state = createGameObserver({
        zones: scope === "room" ? roomZones : [boardZone],
        effects: { [className]: { id, name } }, slots: [],
      }, { kinds: [className], minConfidence: Number.isFinite(minConfidence) ? Math.max(0.25, Math.min(1, minConfidence)) : 0.62,
        checkVisibility: scope === "room" && Number.isFinite(verificationOpacity), allZones: true });
      const feed = feeds.get(modelId) ?? [];
      feed.push({ id, scope, className, verificationOpacity, state, targeted: new Set(), lastCheck: new Map() });
      feeds.set(modelId, feed);
    }
  }

  function observe(modelId, reading) {
    const effects = [], actions = [];
    const timestamp = Number(reading.frameId.split("-")[0]);
    for (const binding of feeds.get(modelId) ?? []) {
      if (!reading.classes.includes(binding.className)) continue;
      for (const effect of binding.state.observe(reading).effects) {
        effects.push({ ...effect, scope: binding.scope });
        const roomId = effect.roomId;
        const target = { scope: binding.scope, animationId: binding.id, roomId };
        const tracked = binding.targeted.has(roomId);
        if (effect.active && !tracked) {
          binding.targeted.add(roomId);
          actions.push({ ...target, action: "start" });
        } else if (effect.status === "removed" && tracked) {
          binding.targeted.delete(roomId);
          binding.lastCheck.delete(roomId);
          actions.push({ ...target, action: "stop" });
        } else if (binding.scope === "room" && binding.verificationOpacity != null && effect.active &&
                   (effect.status === "overexposed" || effect.status === "checking") &&
                   timestamp - (binding.lastCheck.get(roomId) ?? 0) >= 6500) {
          binding.lastCheck.set(roomId, timestamp);
          actions.push({ ...target, action: "verify" });
        }
      }
    }
    return { effects, actions };
  }

  const needsVisibility = id => feeds.get(id)?.some(binding => binding.scope === "room" &&
    Number.isFinite(binding.verificationOpacity)) ?? false;
  return { modelIds: [...feeds.keys()], needsVisibility, observe };
}
