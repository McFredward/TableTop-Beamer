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

function rectContains([x, y, w, h], point) {
  return point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h;
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

function pieceZone(zones, item) {
  const point = { x: item.anchor[0], y: item.anchor[1] };
  const containing = zones.filter(zone => (item.kind === "noise" || !zone.corridor) &&
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
  const effects = Object.fromEntries(Object.entries(rules).map(([kind, rule]) => {
    const bank = kind === "self-destruct" ? definition.insideFx : definition.roomFx;
    const effect = bank?.animations?.find(animation => animation.assetRef === rule.asset)
      ?? bank?.animations?.find(animation => animation.name === rule.label);
    return [kind, effect && { id: effect.id, name: effect.name }];
  }));
  const tracks = trackLayout.get(definition.boardId);
  const roundSlots = tracks?.round.map((x, i) => ({ x, value: 15 - i, enabled: i >= 7 && i <= 14, track: "round" })) ?? [];
  const destructionSlots = tracks?.destruction.map((x, i) => ({ x, value: 6 - i, enabled: i >= 3, track: "self-destruct" })) ?? [];
  const slots = [...roundSlots, ...destructionSlots].map(slot => {
    const x = slot.x / 1600, y = tracks.y;
    return { ...slot, polygon: [[x - 0.0116, y - 0.017], [x + 0.0116, y - 0.017],
      [x + 0.0116, y + 0.017], [x - 0.0116, y + 0.017]].map(at) };
  });
  return { zones, effects, slots, cryo: zones.find(zone => zone.id === "special-cryoschlaf") };
}

function updateBinary(track, seen, covered) {
  if (seen) {
    track.pending++;
    track.clear = 0;
    if (track.pending >= 2) track.active = true;
    track.status = track.active ? "visible" : "checking";
  } else {
    track.pending = 0;
    track.clear = covered ? 0 : track.clear + 1;
    if (track.clear >= 3) track.active = false;
    track.status = covered ? "occluded" : track.active ? "checking" : "removed";
  }
}

export function createGameObserver(layout) {
  const current = new Map();
  const tracks = new Map();
  const detectionThreshold = 0.62;
  let lastId, lastTime, lastGeneration, lastSequence;
  const occluders = new Set(["alien", "character", "hand", "dice"]);
  const activity = new Set(["noise", "fire", "malfunction", "alien"]);
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
    if (lastId && (timestamp - lastTime > 3500 || generation !== lastGeneration)) {
      for (const state of current.values()) state.pending = state.clear = 0;
      for (const track of tracks.values()) track.pending = 0;
    }
    lastId = frame.frameId;
    lastTime = timestamp;
    lastGeneration = generation;
    lastSequence = sequence;

    const hits = new Map();
    const dice = frame.classes.includes("dice") ? frame.objects.filter(item =>
      item.kind === "dice" && item.confidence >= detectionThreshold) : [];
    for (const item of frame.objects) {
      if (!activity.has(item.kind) || !frame.classes.includes(item.kind) || item.confidence < detectionThreshold ||
          !layout.effects[item.kind]) continue;
      if (item.kind === "fire" && dice.some(die =>
        overlap(item.box, die.box) >= 2 / 3 && overlap(die.box, item.box) >= 2 / 3)) continue;
      const zone = pieceZone(layout.zones, item);
      if (!zone) continue;
      const key = item.kind + ":" + zone.id;
      const entry = hits.get(key) ?? { kind: item.kind, zone, boxes: [] };
      entry.boxes.push(item.box);
      hits.set(key, entry);
    }

    for (const [key, hit] of hits) {
      const state = stateFor(key, { kind: hit.kind, zone: hit.zone });
      state.boxes = hit.boxes;
      state.count = hit.boxes.length;
      updateBinary(state, true, false);
      state.confirmed ||= state.active;
    }
    for (const [key, state] of current) {
      if (hits.has(key) || !activity.has(state.kind) || state.status === "removed") continue;
      const missingCoverage = !frame.classes.includes(state.kind)
        || !state.zone.polygon.every(point => rectContains(frame.coverage, point));
      const covered = state.boxes.some(box => frame.objects.some(item =>
        (occluders.has(item.kind) || item.kind === state.kind) && item.confidence >= 0.25 && overlap(box, item.box) > 0.25));
      updateBinary(state, false, missingCoverage || covered);
      if (!state.active) state.count = 0;
    }

    for (const kind of ["round", "self-destruct"]) {
      const zone = kind === "round" ? layout.cryo : { id: null, name: "Ship interior" };
      const slots = layout.slots.filter(slot => slot.track === kind);
      if (!slots.length || !zone || !layout.effects[kind]) continue;
      const matching = [];
      for (const object of frame.objects) {
        if (object.kind !== "track-marker" || object.confidence < detectionThreshold || !frame.classes.includes(object.kind)) continue;
        const point = { x: object.anchor[0], y: object.anchor[1] };
        const slot = slots.find(slot => polygonContains(slot.polygon, point));
        if (slot) matching.push(slot);
      }
      const empty = kind === "self-destruct" && !matching.length && frame.emptyDestruction;
      if (!tracks.has(kind) && !matching.length && !empty) continue;
      const reading = tracks.get(kind) ?? { value: null, pending: 0, status: "checking" };
      tracks.set(kind, reading);
      if (matching.length !== 1 && !empty) {
        reading.pending = 0;
        reading.status = "uncertain";
        if (current.has(kind)) current.get(kind).status = "uncertain";
        continue;
      }
      const value = empty ? null : matching[0].value;
      const candidate = empty ? "empty" : value;
      reading.pending = candidate === reading.candidate ? reading.pending + 1 : 1;
      reading.candidate = candidate;
      reading.status = "checking";
      if (current.has(kind)) current.get(kind).status = "checking";
      if (reading.pending >= 2) {
        reading.value = value;
        reading.status = empty ? "inactive" : "confirmed";
        const state = stateFor(kind, { kind, zone });
        state.active = !empty && matching[0].enabled;
        state.status = "confirmed";
        state.confirmed = true;
      }
    }
    return view();
  }
  return { observe };
}
