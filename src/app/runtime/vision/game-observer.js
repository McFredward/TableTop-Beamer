// Track positions are measured in each board's printed artwork. X positions
// use a 1600-pixel-wide reference and Y is normalized to the artwork height.
const trackLayout = new Map([
  ["nemesis-board-a", {
    y: 0.9514,
    round: [895, 934, 973, 1012, 1051, 1090, 1129, 1192, 1231, 1269, 1308, 1347, 1385, 1424, 1462, 1523],
    destruction: [96, 137, 174, 236, 274, 313, 369],
  }],
  ["nemesis-board-b", {
    y: 0.9632,
    round: [895, 934, 972, 1011, 1050, 1089, 1128, 1190, 1229, 1268, 1307, 1346, 1385, 1423, 1462, 1520],
    destruction: [99, 138, 177, 237, 275, 314, 370],
  }],
]);

export function isClassicNemesisBoard(id) {
  return trackLayout.has(id);
}

const rules = {
  noise: { label: "Light Flicker", asset: "hull-flicker" },
  fire: { label: "Fire", asset: "/resources/animations/fire.gif" },
  malfunction: { label: "Malfunction", asset: "/resources/animations/malfunction.gif" },
  alien: { label: "Alarm", asset: "intruder-alert" },
  round: { label: "Scanning", asset: "special-scanning" },
  "self-destruct": { label: "Intruder Alert", asset: "intruder-alert" },
};

export function trackActivation(kind, value) {
  if (kind === "round" && Number.isInteger(value) && value >= 0 && value <= 15) return value >= 1 && value <= 8;
  if (kind === "self-destruct" && (value === null || Number.isInteger(value) && value >= 0 && value <= 6)) {
    return value !== null && value <= 3;
  }
}

function animationFor(board, kind) {
  const bank = kind === "self-destruct" ? board.insideFx : board.roomFx;
  const rule = rules[kind];
  return bank?.animations?.find(animation => animation.assetRef === rule.asset)
    ?? bank?.animations?.find(animation => animation.name === rule.label);
}

export function trackAnimationBindings(board) {
  if (!isClassicNemesisBoard(board.boardId)) return [];
  return ["round", "self-destruct"].flatMap(track => {
    const definition = animationFor(board, track);
    const scope = track === "round" ? "room" : "inside";
    const roomId = scope === "room" ? board.roomCatalog.find(room => room.id === "special-cryoschlaf")?.id : null;
    if (!definition || definition.cameraTrigger || roomId === undefined) return [];
    return [{ track, scope, roomId, definition }];
  });
}

function rectContains([x, y, w, h], point) {
  return point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h;
}

function rectCovers(rect, [x, y, w, h]) {
  return rectContains(rect, { x, y }) && rectContains(rect, { x: x + w, y: y + h });
}

function polygonContains(polygon, point) {
  let inside = false;
  for (const [i, a] of polygon.entries()) {
    const b = polygon[(i + 1) % polygon.length];
    if ((a.y > point.y) !== (b.y > point.y) &&
        point.x < a.x + (point.y - a.y) * (b.x - a.x) / (b.y - a.y)) inside = !inside;
  }
  return inside;
}

function overlap([x, y, w, h], [a, b, c, d]) {
  const width = Math.min(x + w, a + c) - Math.max(x, a);
  const height = Math.min(y + h, b + d) - Math.max(y, b);
  return width > 0 && height > 0 ? width * height / (w * h) : 0;
}

function samePosition(a, b) {
  return overlap(a, b) >= 0.6 && overlap(b, a) >= 0.6;
}

const miniatureKinds = new Set(["alien", "character"]);
const occluders = new Set([...miniatureKinds, "hand", "dice"]);
const uncertainThreshold = 0.25;
const MAX_CONFIRMATION_GAP_MS = 8000;
const COUNTER_READING_GAP_MS = 2500;

function recordFireSighting(state, boxes, figures, frameNumber) {
  // A projected flash can weaken a reading for one frame. For a gap,
  // require three strong sightings of the same marker within five frames.
  const recent = (state.fireSightings ?? []).filter(sighting => frameNumber - sighting.frameNumber <= 4);
  const confirmed = boxes.some(box => {
    const matching = recent.filter(sighting => sighting.boxes.some(previous => samePosition(box, previous)));
    return matching.length >= 2 || matching.at(-1)?.frameNumber === frameNumber - 1;
  });
  state.fireSightings = [...recent, { frameNumber, boxes, figures }];
  return confirmed;
}

function coversPosition(state, box, item) {
  if (reclassifies(state, box, item)) return false;
  const area = overlap(box, item.box);
  if (area <= 0.25) return false;
  const sightings = state.kind === "fire" ? state.fireSightings : state.markerSightings;
  if (!sightings || !miniatureKinds.has(item.kind)) return true;
  // Nearby figures can have boxes that extend into the marker even when
  // it is visible. Check for movement beyond the usual box jitter.
  return !sightings.some(sighting =>
    sighting.boxes.some(previous => samePosition(box, previous)) &&
    sighting.figures.some(previous => state.kind === "fire"
      ? samePosition(item.box, previous) && overlap(box, previous) + 0.15 >= area
      : previous.kind === item.kind && previous.anchor.every((position, axis) =>
        Math.abs(position - item.anchor[axis]) <= 0.28 * Math.min(previous.box[axis + 2], item.box[axis + 2]))));
}

function isPlayerAt(box, item, minConfidence = 0.80) {
  return item.kind === "character" && item.confidence >= minConfidence && samePosition(box, item.box);
}

function reclassifies(state, box, item) {
  return item.reclassifiedFrom?.kind === state.kind && samePosition(box, item.reclassifiedFrom.box);
}

function smallAlienRoom(zones, [x, y, width, height]) {
  const footprint = [0.3, 0.5, 0.7].map(fraction => ({ x: x + fraction * width, y: y + 0.7 * height }));
  const rooms = zones.filter(zone => !zone.corridor &&
    footprint.every(point => polygonContains(zone.polygon, point)));
  if (rooms.length !== 1) return null;
  const room = rooms[0];
  const xs = room.polygon.map(point => point.x);
  const ys = room.polygon.map(point => point.y);
  // A loose box can extend past the base of a short miniature. Require
  // a small footprint well within a single room before using it.
  return width * 2 <= Math.max(...xs) - Math.min(...xs) &&
    height * 2 <= Math.max(...ys) - Math.min(...ys) ? room : null;
}

function pieceZone(zones, item, allZones) {
  const point = { x: item.anchor[0], y: item.anchor[1] };
  const containing = zones.filter(zone => (allZones || item.kind === "noise" || !zone.corridor) &&
    polygonContains(zone.polygon, point));
  const corridors = containing.filter(zone => zone.corridor);
  const candidates = corridors.length ? corridors : containing;
  if (candidates.length === 1) return candidates[0];
  if (item.kind === "alien" && !candidates.length && !zones.some(zone => zone.corridor && polygonContains(zone.polygon, point))) {
    return smallAlienRoom(zones, item.box);
  }
  return null;
}

export function makeGameLayout(definition, cameraBoard, width, height) {
  const at = ([x, y]) => {
    const point = cameraBoard.at({ x, y });
    return { x: point.x / width, y: point.y / height };
  };
  const zones = definition.roomCatalog.filter(({ name, polygon }) =>
    /^(?:\d{3}(?:-\d{3}(?:-\d+)?)?|TC(?:-\d+)?)$/.test(name) && polygon?.length >= 3)
    .map(({ id, name, polygon }) => ({ id, name, corridor: !/^\d{3}$/.test(name), polygon: polygon.map(at) }));
  const effects = Object.fromEntries(Object.keys(rules).map(kind => {
    const effect = animationFor(definition, kind);
    return [kind, effect && { id: effect.id, name: effect.name }];
  }));
  const tracks = trackLayout.get(definition.boardId);
  const roundSlots = tracks?.round.map((x, i) => ({ x, value: 15 - i, track: "round" })) ?? [];
  const destructionSlots = tracks?.destruction.map((x, i) => ({ x, value: 6 - i, track: "self-destruct" })) ?? [];
  const slots = [...roundSlots, ...destructionSlots].map(slot => {
    const x = slot.x / 1600, y = tracks.y;
    return { ...slot, y, enabled: trackActivation(slot.track, slot.value), polygon: [[x - 0.0116, y - 0.017], [x + 0.0116, y - 0.017],
      [x + 0.0116, y + 0.017], [x - 0.0116, y + 0.017]].map(at) };
  });
  return { zones, effects, slots, cryo: zones.find(zone => zone.id === "special-cryoschlaf") };
}

export function createGameObserver(layout, {
  kinds = ["noise", "fire", "malfunction", "alien"], minConfidence = 0.62, checkVisibility = false, allZones = false,
  startOnStrongReading = false,
} = {}) {
  const current = new Map();
  const tracks = new Map();
  const detectionThreshold = minConfidence;
  const strongConfidence = Math.max(0.90, minConfidence + 0.12);
  let lastId, lastTime, lastGeneration, lastSequence;
  let frameNumber = 0;
  const activity = new Set(kinds);
  const stateFor = (key, init) => {
    if (!current.has(key)) current.set(key, { ...init, pending: 0, clear: 0, active: false });
    return current.get(key);
  };
  function view() {
    return {
      effects: [...current.values()].filter(item => item.status !== "removed" || item.confirmed)
        .map(({ kind, zone, status, active, count }) => ({ kind, zone: zone.name, effect: layout.effects[kind],
          scope: kind === "self-destruct" ? "inside" : "room",
          roomId: zone.id, active, status, count })),
      tracks: [...tracks].map(([kind, { value, status }]) => ({ kind, value, status })),
    };
  }

  function observe(frame) {
    if (frame.frameId === lastId) return view();
    const [timestamp, generation, sequence] = frame.frameId.split("-").map(Number);
    if (lastId && generation === lastGeneration && sequence <= lastSequence) return view();
    if (lastId && (timestamp - lastTime > MAX_CONFIRMATION_GAP_MS || generation !== lastGeneration)) {
      for (const state of current.values()) {
        state.pending = state.clear = 0;
        if (!state.active) state.fireSightings = [];
      }
      for (const track of tracks.values()) {
        track.pending = 0;
        track.observedAt = undefined;
      }
    }
    lastId = frame.frameId;
    lastTime = timestamp;
    lastGeneration = generation;
    lastSequence = sequence;
    frameNumber++;

    const hits = new Map();
    const possibleOccluders = frame.objects.filter(item => item.confidence >= uncertainThreshold);
    const figures = possibleOccluders.filter(item => miniatureKinds.has(item.kind));
    const figureBoxes = figures.map(item => item.box);
    const dice = frame.classes.includes("dice") ? frame.objects.filter(item =>
      item.kind === "dice" && item.confidence >= detectionThreshold) : [];
    for (const item of frame.objects) {
      if (!activity.has(item.kind) || !frame.classes.includes(item.kind) || item.confidence < detectionThreshold ||
          !layout.effects[item.kind]) continue;
      if (item.kind === "fire" && dice.some(die =>
        overlap(item.box, die.box) >= 2 / 3 && overlap(die.box, item.box) >= 2 / 3)) continue;
      if (item.kind === "alien" && possibleOccluders.some(other =>
        isPlayerAt(item.box, other, Math.max(0.80, item.confidence - 0.06)))) continue;
      const zone = pieceZone(layout.zones, item, allZones);
      if (!zone) continue;
      const key = item.kind + ":" + zone.id;
      const entry = hits.get(key) ?? { kind: item.kind, zone, boxes: [], verifiedAlienBoxes: [], strong: false };
      entry.boxes.push(item.box);
      if (item.kind === "alien" && item.confidence >= strongConfidence) entry.verifiedAlienBoxes.push(item.box);
      if (startOnStrongReading && item.kind !== "malfunction" && !entry.strong &&
          item.confidence >= strongConfidence && !current.get(key)?.active &&
          !possibleOccluders.some(other => other.kind !== item.kind && occluders.has(other.kind) &&
            other.confidence >= detectionThreshold && samePosition(item.box, other.box)) &&
          (item.kind !== "fire" || item.markerVerified === true || frame.confirmFire?.(item.box)) &&
          ((item.kind !== "fire" && !checkVisibility) || !frame.fireOverexposed?.(item.box))) {
        entry.strong = true;
      }
      hits.set(key, entry);
    }

    for (const [key, hit] of hits) {
      const state = stateFor(key, { kind: hit.kind, zone: hit.zone });
      state.boxes = hit.boxes;
      if (hit.kind === "alien") {
        state.verifiedAlienBoxes = state.boxes.filter(box => hit.verifiedAlienBoxes.includes(box) ||
          state.verifiedAlienBoxes?.some(previous => samePosition(box, previous)));
      }
      state.count = hit.boxes.length;
      state.pending++;
      state.clear = 0;
      let confirmed = state.pending >= 2;
      if (state.kind === "fire") {
        confirmed = recordFireSighting(state, hit.boxes, figureBoxes, frameNumber);
      } else if (state.kind === "malfunction") {
        const earlier = (state.markerSightings ?? []).filter(sighting => frameNumber - sighting.frameNumber <= 3);
        // A brief pulse can look like a marker. Confirm a repeated location
        // before starting its effect, even when a single reading is strong.
        confirmed = earlier.some(sighting => hit.boxes.some(box =>
          sighting.boxes.some(previous => samePosition(box, previous))));
        state.markerSightings = [...earlier, { boxes: hit.boxes, figures, frameNumber }];
      }
      state.active ||= confirmed || hit.strong;
      state.status = state.active ? "visible" : "checking";
      state.confirmed ||= state.active;
    }
    for (const [key, state] of current) {
      if (hits.has(key) || !activity.has(state.kind) || state.status === "removed") continue;
      const missingCoverage = !frame.classes.includes(state.kind)
        || !state.boxes.every(box => rectCovers(frame.coverage, box));
      const weakFireReading = state.kind === "fire" && possibleOccluders.some(item =>
        item.kind === "fire" && item.confidence < detectionThreshold &&
        state.boxes.some(box => samePosition(box, item.box)));
      const covered = state.boxes.some(box => {
        const player = state.kind === "alien" &&
          !state.verifiedAlienBoxes?.some(previous => samePosition(box, previous)) &&
          possibleOccluders.some(item => isPlayerAt(box, item));
        return possibleOccluders.some(item =>
          (occluders.has(item.kind) || (item.kind === state.kind && state.kind !== "fire")) &&
          !(player && item.kind !== "hand" && samePosition(box, item.box)) && coversPosition(state, box, item));
      });
      const positionOverexposed = state.kind === "malfunction" ? frame.malfunctionOverexposed : frame.fireOverexposed;
      const overexposed = (checkVisibility || state.kind === "fire") && state.active && !missingCoverage &&
        state.boxes.some(box => positionOverexposed?.(box));
      if (!state.active && (!weakFireReading || missingCoverage || covered)) state.fireSightings = [];
      const blocked = missingCoverage || covered || overexposed;
      state.pending = 0;
      state.clear = blocked || weakFireReading ? 0 : state.clear + 1;
      const corrected = startOnStrongReading && !blocked && state.boxes.every(box => possibleOccluders.some(item =>
        item.confidence >= strongConfidence && reclassifies(state, box, item)));
      if (state.clear >= 2 || corrected) state.active = false;
      state.status = overexposed ? "overexposed" : blocked ? "occluded"
        : state.active || weakFireReading ? "checking" : "removed";
      if (!state.active) {
        state.count = 0;
        if (state.status === "removed") state.markerSightings = undefined;
      }
    }

    for (const kind of ["round", "self-destruct"]) {
      const zone = kind === "round" ? layout.cryo : { id: null, name: "Ship interior" };
      const slots = layout.slots.filter(slot => slot.track === kind);
      if (!slots.length || !zone || !layout.effects[kind]) continue;
      const matching = [];
      for (const object of frame.objects) {
        if (object.kind !== "track-marker" || object.confidence < detectionThreshold || !frame.classes.includes(object.kind)) continue;
        const point = { x: object.anchor[0], y: object.anchor[1] };
        const slot = object.track === kind && Number.isInteger(object.value)
          ? slots.find(slot => slot.value === object.value)
          : slots.find(slot => polygonContains(slot.polygon, point));
        if (slot) matching.push(slot);
      }
      const empty = kind === "self-destruct" && !matching.length && frame.emptyDestruction;
      if (!tracks.has(kind) && !matching.length && !empty) continue;
      const reading = tracks.get(kind) ?? { value: null, pending: 0, status: "checking", initialized: false };
      tracks.set(kind, reading);
      if (matching.length !== 1 && !empty) {
        if (matching.length === 0 && timestamp - reading.observedAt <= COUNTER_READING_GAP_MS) continue;
        reading.pending = 0;
        reading.status = "uncertain";
        if (current.has(kind)) current.get(kind).status = "uncertain";
        continue;
      }
      const value = empty ? null : matching[0].value;
      const candidate = empty ? "empty" : value;
      reading.pending = candidate === reading.candidate && timestamp - reading.observedAt <= COUNTER_READING_GAP_MS
        ? reading.pending + 1 : 1;
      reading.candidate = candidate;
      reading.observedAt = timestamp;
      reading.status = "checking";
      if (current.has(kind)) current.get(kind).status = "checking";
      if (reading.pending >= 2 || (reading.initialized && value === reading.value)) {
        reading.value = value;
        reading.initialized = true;
        reading.status = empty ? "inactive" : "confirmed";
        const state = stateFor(kind, { kind, zone });
        state.active = !empty && matching[0].enabled;
        state.status = "confirmed";
        state.confirmed = true;
      }
    }
    return view();
  }
  return { observe, snapshot: view };
}
