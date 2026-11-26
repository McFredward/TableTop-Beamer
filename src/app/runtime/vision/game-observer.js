// Slot centres measured in the artwork of Nemesis Board A, in a
// 1600-pixel-wide reference. They are independent of pose and camera.
const roundSlots = [895, 934, 973, 1012, 1051, 1090, 1129, 1192, 1231, 1269, 1308, 1347, 1385, 1424, 1462, 1523]
  .map((x, i) => ({ x, value: 15 - i, enabled: i >= 7 && i <= 14, track: "round" }));
const destructionSlots = [60, 96, 137, 174, 236, 274, 313, 369]
  .map((x, i) => ({ x, value: i === 0 ? null : 7 - i, enabled: i >= 4, track: "self-destruct" }));

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

export function makeGameLayout(definition, cameraBoard, width, height) {
  const at = ([x, y]) => {
    const point = cameraBoard.at({ x, y });
    return { x: point.x / width, y: point.y / height };
  };
  const zones = definition.roomCatalog.filter(({ name, polygon }) =>
    /^(\d{3})(-\d{3})?$/.test(name) && polygon?.length >= 3).map(({ id, name, polygon }) =>
    ({ id, name, corridor: name.includes("-"), polygon: polygon.map(at) }));
  const effects = Object.fromEntries(Object.entries(rules).map(([kind, rule]) => {
    const bank = kind === "self-destruct" ? definition.insideFx : definition.roomFx;
    const effect = bank?.animations?.find(animation => animation.assetRef === rule.asset)
      ?? bank?.animations?.find(animation => animation.name === rule.label);
    return [kind, effect && { id: effect.id, name: effect.name }];
  }));
  const slots = definition.boardId === "nemesis-board-a" ? [...roundSlots, ...destructionSlots].map(slot => {
    const x = slot.x / 1600, y = 0.9514;
    return { ...slot, polygon: [[x - 0.0116, y - 0.017], [x + 0.0116, y - 0.017],
      [x + 0.0116, y + 0.017], [x - 0.0116, y + 0.017]].map(at) };
  }) : [];
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
  let lastId, lastTime, lastGeneration, lastSequence;
  const figure = new Set(["alien", "character", "hand"]);
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
    for (const item of frame.objects) {
      if (!activity.has(item.kind) || !frame.classes.includes(item.kind) || item.confidence < 0.62 ||
          !layout.effects[item.kind]) continue;
      const point = { x: item.anchor[0], y: item.anchor[1] };
      const containing = layout.zones.filter(zone => (item.kind === "noise" || !zone.corridor) &&
        polygonContains(zone.polygon, point));
      const corridors = containing.filter(zone => zone.corridor);
      const candidates = corridors.length ? corridors : containing;
      if (candidates.length !== 1) continue;
      const [zone] = candidates;
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
        (figure.has(item.kind) || item.kind === state.kind) && item.confidence >= 0.25 && overlap(box, item.box) > 0.25));
      updateBinary(state, false, missingCoverage || covered);
      if (!state.active) state.count = 0;
    }

    for (const kind of ["round", "self-destruct"]) {
      const zone = kind === "round" ? layout.cryo : { id: null, name: "Ship interior" };
      const slots = layout.slots.filter(slot => slot.track === kind);
      if (!slots.length || !zone || !layout.effects[kind]) continue;
      const matching = [];
      for (const object of frame.objects) {
        if (object.kind !== "track-marker" || object.confidence < 0.62 || !frame.classes.includes(object.kind)) continue;
        const point = { x: object.anchor[0], y: object.anchor[1] };
        const slot = slots.find(slot => polygonContains(slot.polygon, point));
        if (slot) matching.push(slot);
      }
      if (!tracks.has(kind) && !matching.length) continue;
      const reading = tracks.get(kind) ?? { value: null, pending: 0, status: "checking" };
      tracks.set(kind, reading);
      if (matching.length !== 1) {
        reading.pending = 0;
        reading.status = "uncertain";
        if (current.has(kind)) current.get(kind).status = "uncertain";
        continue;
      }
      const [slot] = matching;
      reading.pending = slot.value === reading.candidate ? reading.pending + 1 : 1;
      reading.candidate = slot.value;
      reading.status = "checking";
      if (current.has(kind)) current.get(kind).status = "checking";
      if (reading.pending >= 2) {
        reading.value = slot.value;
        reading.status = "confirmed";
        const state = stateFor(kind, { kind, zone });
        state.active = slot.enabled;
        state.status = "confirmed";
        state.confirmed = true;
      }
    }
    return view();
  }
  return { observe };
}
