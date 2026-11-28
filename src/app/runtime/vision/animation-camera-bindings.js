import { createGameObserver } from "./game-observer.js";

export function followDetectedCount(className, confidence) {
  let lastId, accepted, candidate, readings = 0, since = 0;
  return frame => {
    if (frame.frameId === lastId) return false;
    lastId = frame.frameId;
    const now = Number(frame.frameId.split("-")[0]);
    const boxes = [];
    for (const { kind, confidence: score, box } of frame.objects) {
      if (kind !== className || score < confidence) continue;
      const [x, y, w, h] = box;
      const duplicate = boxes.some(([a, b, c, d]) => {
        const intersection = Math.max(0, Math.min(x + w, a + c) - Math.max(x, a)) *
          Math.max(0, Math.min(y + h, b + d) - Math.max(y, b));
        return intersection >= 0.70 * Math.max(w * h, c * d);
      });
      if (!duplicate) boxes.push(box);
    }
    const count = boxes.length;
    if (count !== candidate) {
      candidate = count;
      readings = 0;
      since = now;
    }
    readings++;
    if (readings < 2 || (accepted !== undefined && count < accepted && (readings < 4 || now - since < 8000))) return false;
    const increased = accepted !== undefined && count > accepted;
    accepted = count;
    return increased;
  };
}

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
    for (const { id, name, cameraTrigger, soundAssetRef } of board[scope + "Fx"]?.animations ?? []) {
      const { modelId, className, minConfidence, verificationOpacity, soundRule } = cameraTrigger ?? {};
      if (typeof modelId !== "string" || !modelId || typeof className !== "string" || !className) continue;
      const confidence = Number.isFinite(minConfidence) ? Math.max(0.25, Math.min(1, minConfidence)) : 0.62;
      const state = createGameObserver({
        zones: scope === "room" ? roomZones : [boardZone],
        effects: { [className]: { id, name } }, slots: [],
      }, { kinds: [className], minConfidence: confidence,
        checkVisibility: scope === "room" && Number.isFinite(verificationOpacity), allZones: true, startOnStrongReading: true });
      const feed = feeds.get(modelId) ?? [];
      const countIncrease = soundRule === "count-increase" && soundAssetRef && soundAssetRef !== "none"
        ? followDetectedCount(className, confidence) : null;
      feed.push({ id, scope, className, verificationOpacity, state, countIncrease, targeted: new Set(), lastCheck: new Map() });
      feeds.set(modelId, feed);
    }
  }

  function observe(modelId, reading) {
    const effects = [], actions = [];
    const timestamp = Number(reading.frameId.split("-")[0]);
    for (const binding of feeds.get(modelId) ?? []) {
      if (!reading.classes.includes(binding.className) || (reading.verificationUnavailable && binding.scope === "room" &&
          Number.isFinite(binding.verificationOpacity))) continue;
      if (binding.countIncrease?.(reading)) {
        actions.push({ scope: binding.scope, animationId: binding.id, roomId: null, action: "announce" });
      }
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
                   (effect.status === "overexposed" || effect.status === "checking" ||
                     (binding.className === "malfunction" && !binding.lastCheck.has(roomId))) &&
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
  const snapshots = () => [...feeds.values()].flatMap(bindings => bindings.flatMap(({ scope, state }) =>
    state.snapshot().effects.map(effect => ({ ...effect, scope }))));
  function retry(modelId, { scope, animationId, roomId, action }) {
    const binding = feeds.get(modelId)?.find(entry => entry.scope === scope && entry.id === animationId);
    if (!binding) return;
    if (action === "start") binding.targeted.delete(roomId);
    if (action === "stop") binding.targeted.add(roomId);
    if (action === "verify") binding.lastCheck.delete(roomId);
  }
  return { modelIds: [...feeds.keys()], needsVisibility, observe, snapshots, retry };
}
