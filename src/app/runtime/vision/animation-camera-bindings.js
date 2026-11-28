import { createGameObserver } from "./game-observer.js";

function overlapArea([x, y, w, h], [a, b, c, d]) {
  return Math.max(0, Math.min(x + w, a + c) - Math.max(x, a)) *
    Math.max(0, Math.min(y + h, b + d) - Math.max(y, b));
}

const COUNT_OCCLUDERS = new Set(["alien", "character", "dice", "hand", "door", "corpse"]);
const COUNT_CLEAR_CONFIRMATION = { frames: 4, duration: 1600 };

function countBoxMatches(a, b) {
  const covered = overlapArea(a, b);
  if (covered < 0.70 * Math.min(a[2] * a[3], b[2] * b[3])) return false;
  return Math.abs((a[0] + a[2] / 2) - (b[0] + b[2] / 2)) <= 0.40 * Math.max(a[2], b[2]) &&
    Math.abs((a[1] + a[3] / 2) - (b[1] + b[3] / 2)) <= 0.40 * Math.max(a[3], b[3]);
}

export function followDetectedCount(className, confidence) {
  let lastId, lastTime = -Infinity, accepted, candidate, newPositions = [], readings = 0, since = 0;
  const clearedZones = new Set();
  return (frame, { confirmedRemovals = [], positions } = {}) => {
    const now = Number(frame.frameId.split("-")[0]);
    if (frame.frameId === lastId || now < lastTime) return false;
    lastId = frame.frameId;
    lastTime = now;
    if (confirmedRemovals.length) {
      for (const { zoneId } of confirmedRemovals) clearedZones.add(zoneId);
      accepted = (accepted ?? []).filter(box => !confirmedRemovals.some(removal =>
        removal.boxes.some(removed => countBoxMatches(box, removed))));
      candidate = undefined;
      readings = 0;
    }
    const boxes = [];
    for (const { kind, confidence: score, box } of frame.objects) {
      if (kind !== className || score < confidence) continue;
      if (!boxes.some(other => countBoxMatches(box, other))) boxes.push(box);
    }
    const count = boxes.length;
    const [left, top, width, height] = frame.coverage ?? [0, 0, 1, 1];
    const stillSeen = box => boxes.some(current => overlapArea(box, current) >= 0.55 * box[2] * box[3]);
    const inspectable = ([x, y, w, h]) => x >= left && y >= top && x + w <= left + width && y + h <= top + height;
    const blocked = box => !inspectable(box) || frame.objects.some(item => item.confidence >= 0.25 &&
      (item.kind === className || COUNT_OCCLUDERS.has(item.kind)) && overlapArea(box, item.box) >= 0.24 * box[2] * box[3]);
    // A sighting in a cleared room is additional when the other positions
    // still have readings or are covered. A move from a visible position
    // leaves a clear vacancy and therefore does not count as an addition.
    const returns = clearedZones.size && accepted.every(box => stillSeen(box) || blocked(box))
      ? boxes.filter(box => positions?.has(box) && clearedZones.has(positions.get(box)) &&
          !accepted.some(previous => countBoxMatches(box, previous)))
      : [];
    if (!returns.length && accepted && count === accepted.length) {
      accepted = boxes;
      candidate = undefined;
      readings = 0;
      return false;
    }
    if (!returns.length && accepted && count < accepted.length) {
      const clear = accepted.every(box => stillSeen(box) || !blocked(box));
      if (!clear) {
        candidate = undefined;
        readings = 0;
        return false;
      }
    }
    const globalIncrease = accepted !== undefined && count > accepted.length;
    const increases = globalIncrease || returns.length > 0;
    const distinct = globalIncrease
      ? boxes.filter(box => returns.includes(box) || !accepted.some(previous => countBoxMatches(box, previous)))
      : returns;
    if (increases && !distinct.length) {
      candidate = undefined;
      readings = 0;
      return false;
    }
    const nextCandidate = increases ? "increase" : count;
    const stablePositions = distinct.filter(box => newPositions.some(previous => countBoxMatches(box, previous)));
    if (candidate !== nextCandidate || (increases && !stablePositions.length)) {
      candidate = nextCandidate;
      readings = 0;
      since = now;
    }
    newPositions = readings ? stablePositions : distinct;
    readings++;
    if (increases ? readings < 3 || now - since < 700
      : accepted ? readings < COUNT_CLEAR_CONFIRMATION.frames || now - since < COUNT_CLEAR_CONFIRMATION.duration
        : readings < 2) return false;
    if (increases) {
      for (const box of newPositions) clearedZones.delete(positions?.get(box));
    }
    accepted = increases && !globalIncrease
      ? [...accepted.filter(box => !newPositions.some(added => countBoxMatches(box, added))), ...newPositions]
      : boxes;
    return increases;
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
      const countIncrease = soundRule === "count-increase" && soundAssetRef && soundAssetRef !== "none"
        ? followDetectedCount(className, confidence) : null;
      const state = createGameObserver({
        zones: scope === "room" ? roomZones : [boardZone],
        effects: { [className]: { id, name } }, slots: [],
      }, { kinds: [className], minConfidence: confidence,
        checkVisibility: scope === "room" && Number.isFinite(verificationOpacity), allZones: true, startOnStrongReading: true,
        clearConfirmation: countIncrease ? COUNT_CLEAR_CONFIRMATION : undefined });
      const feed = feeds.get(modelId) ?? [];
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
      const observation = binding.state.observe(reading);
      if (binding.countIncrease?.(reading, observation)) {
        actions.push({ scope: binding.scope, animationId: binding.id, roomId: null, action: "announce" });
      }
      for (const effect of observation.effects) {
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
