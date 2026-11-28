import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createGameObserver, makeGameLayout, trackActivation, trackAnimationBindings } from "../src/app/runtime/vision/game-observer.js";
import { prepareTrackBeads } from "../src/app/runtime/vision/track-beads.js";

function polygon(x, y, w, h) {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

const board = {
  boardId: "nemesis-board-a",
  roomCatalog: [
    { id: "room", name: "005", polygon: polygon(0.08, 0.10, 0.31, 0.30) },
    { id: "other", name: "015", polygon: polygon(0.48, 0.10, 0.30, 0.30) },
    { id: "corridor", name: "005-015", polygon: polygon(0.39, 0.28, 0.09, 0.07) },
    { id: "special-cryoschlaf", name: "011", polygon: polygon(0.47, 0.52, 0.28, 0.24) },
    { id: "technical-corridor", name: "TC", polygon: polygon(0.12, 0.58, 0.08, 0.08) },
  ],
  roomFx: { animations: [
    { id: "feuer", name: "Fire", assetRef: "/resources/animations/fire.gif" },
    { id: "lichtflackern", name: "Light Flicker", assetRef: "hull-flicker" },
    { id: "kaputt", name: "Malfunction", assetRef: "/resources/animations/malfunction.gif" },
    { id: "alarm", name: "Alarm", assetRef: "intruder-alert" },
    { id: "scanning", name: "Scanning", assetRef: "special-scanning" },
  ] },
  insideFx: { animations: [{ id: "intruder-alert", name: "Intruder Alert", assetRef: "intruder-alert" }] },
};
const layout = makeGameLayout(board, { at: ({ x, y }) => ({ x: x * 1920, y: y * 1080 }) }, 1920, 1080);

test("track analysis samples the slot heights of both Nemesis sides", () => {
  const frame = { width: 960, height: 540, pixels: new Uint8Array(960 * 540) };
  const registration = { at: ({ x, y }) => ({ x: x * frame.width, y: y * frame.height }) };
  for (const [side, centerY] of [["a", 0.9514], ["b", 0.9632]]) {
    const definition = { ...board, boardId: `nemesis-board-${side}` };
    const { slots } = makeGameLayout(definition, registration, frame.width, frame.height);
    const beads = prepareTrackBeads(slots, registration, frame, frame);
    assert.ok(beads.some(slot => slot.track === "round"));
    assert.ok(beads.some(slot => slot.track === "self-destruct"));
    for (const bead of beads) {
      assert.ok(Math.abs(bead.anchor[1] - centerY) < 1e-9);
      const center = bead.samples[Math.floor(bead.samples.length / 2)];
      assert.equal(center.y, centerY * frame.height);
    }
  }
});

function item(kind, x, y) {
  return { kind, confidence: 0.91, anchor: [x, y], box: [x - 0.008, y - 0.008, 0.016, 0.016] };
}

function newRun() {
  const observer = createGameObserver(layout);
  let i = 0;
  return (objects, classes = ["noise", "fire", "malfunction", "alien", "character", "track-marker"], coverage = [0, 0, 1, 1]) =>
    observer.observe({ frameId: `${1795718000000 + i * 700}-1-${++i}`, classes, coverage, objects });
}

test("noise, malfunction, fire and alien alarm can coexist and characters alone never start an alarm", () => {
  const observe = newRun();
  const room = [item("fire", 0.20, 0.17), item("malfunction", 0.25, 0.22), item("noise", 0.43, 0.31),
    item("character", 0.61, 0.35)];
  const aliens = [item("alien", 0.31, 0.24), item("alien", 0.31, 0.29)];
  observe(room.concat(aliens));
  const state = observe(room.concat(aliens));
  assert.deepEqual(state.effects.map(effect => [effect.effect.id, effect.roomId, effect.active]),
    [["feuer", "room", true], ["kaputt", "room", true], ["lichtflackern", "corridor", true], ["alarm", "room", true]]);
  const alarm = snapshot => snapshot.effects.find(effect => effect.kind === "alien");
  assert.equal(alarm(observe(room.concat(aliens[1]))).count, 1);
  const occluded = room.concat(item("character", 0.309, 0.29));
  for (let j = 0; j < 4; j++) assert.equal(alarm(observe(occluded)).status, "occluded");
  assert.equal(alarm(observe(room)).active, true);
  assert.equal(alarm(observe(room)).active, false);
});

test("a clear player label resolves a tentative alien without changing the nearby malfunction", () => {
  const observe = newRun();
  const alien = { ...item("alien", 0.31, 0.24), confidence: 0.78 };
  const player = item("character", 0.31, 0.24);
  const defect = item("malfunction", 0.29, 0.29);
  const alarm = snapshot => snapshot.effects.find(effect => effect.kind === "alien");
  observe([alien, defect]);
  assert.equal(alarm(observe([alien, defect])).active, true);
  assert.equal(alarm(observe([alien, player, defect])).status, "checking");
  const corrected = observe([alien, player, defect]);
  assert.equal(alarm(corrected).active, false);
  assert.equal(corrected.effects.find(effect => effect.kind === "malfunction").active, true);
  assert.equal(alarm(observe([alien, player, defect])).active, false);
});

test("a recognized corpse can clear a false fire while a nearby fire stays active", () => {
  const observe = newRun();
  const falseFire = item("fire", 0.21, 0.18);
  const trueFire = item("fire", 0.60, 0.24);
  const corpse = { ...item("corpse", 0.21, 0.18), reclassifiedFrom: { kind: "fire", box: falseFire.box } };
  const classes = ["corpse", "fire", "alien"];
  observe([falseFire, trueFire], classes);
  const before = observe([falseFire, trueFire], classes);
  assert.deepEqual(before.effects.map(({ roomId, active }) => [roomId, active]), [["room", true], ["other", true]]);
  observe([corpse, trueFire], classes);
  const after = observe([corpse, trueFire], classes);
  assert.deepEqual(after.effects.filter(effect => effect.active).map(effect => effect.roomId), ["other"]);
});

test("partial model coverage cannot clear a previously observed effect", () => {
  const observe = newRun();
  observe([item("fire", 0.2, 0.17)]);
  observe([item("fire", 0.2, 0.17)]);
  for (let round = 0; round < 4; round++) assert.equal(observe([], ["fire"], [0.47, 0, 0.5, 1]).effects[0].active, true);
});

test("removal needs two separate readings covering the marker's last position", () => {
  const fire = item("fire", 0.20, 0.17);
  const observer = createGameObserver(layout);
  const read = (sequence, objects, coverage = [0, 0, 1, 1]) => observer.observe({
    frameId: `${1795718000000 + sequence * 700}-1-${sequence}`, classes: ["fire"], objects, coverage,
  }).effects[0];
  read(1, [fire]);
  assert.equal(read(2, [fire]).active, true);
  const markerCrop = [0.17, 0.14, 0.08, 0.08];
  assert.equal(read(3, [], markerCrop).status, "checking");
  assert.equal(read(3, [], markerCrop).active, true);
  assert.equal(read(4, [], [0.205, 0.14, 0.08, 0.08]).status, "occluded");
  assert.equal(read(5, [], markerCrop).active, true);
  assert.equal(read(6, [], markerCrop).status, "removed");
});

test("a confirmed reclassification clears the false marker without treating the miniature as an occluder", () => {
  const observe = newRun();
  const wrong = item("malfunction", 0.20, 0.17);
  const alien = item("alien", 0.20, 0.17);
  const confirmed = { ...alien, reclassifiedFrom: { kind: wrong.kind, box: wrong.box } };
  const effect = result => result.effects.find(value => value.kind === "malfunction");
  observe([wrong]);
  assert.equal(effect(observe([wrong])).active, true);
  assert.equal(effect(observe([alien])).status, "occluded");
  assert.equal(effect(observe([confirmed])).status, "checking");
  const final = observe([confirmed]);
  assert.equal(effect(final).status, "removed");
  assert.equal(final.effects.find(value => value.kind === "alien").active, true);
});

test("a strong, explicit correction updates the old and new effects on the same frame", () => {
  const observer = createGameObserver(layout, { startOnStrongReading: true });
  const wrong = { ...item("malfunction", 0.2, 0.17), confidence: 0.98 };
  const corrected = { ...item("alien", 0.2, 0.17), confidence: 0.98,
    reclassifiedFrom: { kind: wrong.kind, box: wrong.box } };
  const frame = { classes: ["alien", "malfunction"], coverage: [0, 0, 1, 1] };
  observer.observe({ ...frame, frameId: "1795740000000-1-1", objects: [wrong] });
  observer.observe({ ...frame, frameId: "1795740003100-1-2", objects: [wrong] });
  const reading = observer.observe({ ...frame, frameId: "1795740006200-1-3", objects: [corrected] });
  assert.deepEqual(reading.effects.map(effect => [effect.kind, effect.active]), [["malfunction", false], ["alien", true]]);
});

test("dice trigger no effects and can temporarily cover a confirmed marker", () => {
  const run = newRun();
  const observe = (objects) => run(objects, ["fire", "dice"]);
  const die = item("dice", 0.2, 0.17);
  const fire = item("fire", 0.2, 0.17);
  assert.deepEqual(observe([die]).effects, []);
  assert.deepEqual(observe([die]).effects, []);
  observe([fire]);
  assert.equal(observe([fire]).effects[0].active, true);
  for (let i = 0; i < 4; i++) {
    const [state] = observe([die]).effects;
    assert.equal(state.status, "occluded");
    assert.equal(state.active, true);
  }
  assert.equal(observe([]).effects[0].active, true);
  assert.equal(observe([]).effects[0].active, false);
});

test("a fire marker can be confirmed when projected light alternates strong and weak readings", () => {
  const observe = newRun();
  const fire = item("fire", 0.20, 0.17);
  const washedOut = { ...item("fire", 0.201, 0.17), confidence: 0.48 };
  for (const reading of [fire, washedOut, fire, washedOut]) {
    assert.equal(observe([reading]).effects[0].active, false);
  }
  assert.equal(observe([fire]).effects[0].active, true);
  assert.equal(observe([washedOut]).effects[0].active, true);
  assert.equal(observe([]).effects[0].active, true);
  assert.equal(observe([]).effects[0].active, false);
});

test("fire confirmation requires repeated sightings of the same marker", () => {
  const observe = newRun();
  const fire = item("fire", 0.20, 0.17);
  const other = item("fire", 0.25, 0.19);
  for (const objects of [[fire], [other], [], [fire], [], [fire], [], [fire]]) {
    assert.ok(observe(objects).effects.every(effect => !effect.active));
  }
});

test("a stationary figure near a fire marker does not mask removal", () => {
  const observe = newRun();
  const fire = item("fire", 0.20, 0.17);
  const nearby = { ...item("character", 0.185, 0.18), box: [0.173, 0.160, 0.025, 0.040] };
  const widerBox = { ...nearby, box: [0.173, 0.160, 0.027, 0.040] };
  const overMarker = { ...nearby, box: [0.187, 0.160, 0.025, 0.040] };
  const state = (objects) => observe(objects).effects[0];

  state([fire, nearby]);
  assert.equal(state([fire, nearby]).active, true);
  for (let i = 0; i < 4; i++) {
    const hidden = state([overMarker]);
    assert.equal(hidden.status, "occluded");
    assert.equal(hidden.active, true);
  }

  assert.equal(state([fire, nearby]).status, "visible");
  assert.equal(state([widerBox]).active, true);
  const removed = state([nearby]);
  assert.equal(removed.status, "removed");
  assert.equal(removed.active, false);
});

test("moving a malfunction marker switches rooms even when the previous nearby alien stays put", () => {
  const observe = newRun();
  const marker = item("malfunction", 0.20, 0.17);
  const moved = item("malfunction", 0.61, 0.18);
  const alien = { ...item("alien", 0.226, 0.19), box: [0.197, 0.15, 0.053, 0.045] };
  const widerBox = { ...alien, box: [0.165, 0.145, 0.088, 0.050] };
  const current = result => Object.fromEntries(result.effects.filter(effect => effect.kind === "malfunction")
    .map(effect => [effect.roomId, effect.status]));
  observe([marker, alien]);
  assert.deepEqual(current(observe([marker, alien])), { room: "visible" });
  assert.deepEqual(current(observe([moved, widerBox])), { room: "checking", other: "checking" });
  assert.deepEqual(current(observe([moved, widerBox])), { room: "removed", other: "visible" });
});

test("strong malfunction readings on different parts of the room do not confirm a marker", () => {
  const observer = createGameObserver(layout, { startOnStrongReading: true });
  const see = (sequence, x) => observer.observe({
    frameId: `${1795740000000 + sequence * 2900}-1-${sequence}`, classes: ["malfunction"], coverage: [0, 0, 1, 1],
    objects: [{ ...item("malfunction", x, 0.20), confidence: 0.99 }],
  }).effects[0];
  assert.equal(see(1, 0.17).active, false);
  assert.equal(see(2, 0.21).active, false);
  assert.equal(see(3, 0.25).active, false);
  assert.equal(see(4, 0.253).active, true);
});

test("overexposure only holds an established fire until the position is readable", () => {
  const observer = createGameObserver(layout);
  const fire = item("fire", 0.20, 0.17);
  let i = 0;
  const observe = (objects, fireOverexposed) => observer.observe({
    frameId: `${1795718000000 + i * 700}-1-${++i}`, classes: ["fire"], coverage: [0, 0, 1, 1],
    objects, fireOverexposed,
  }).effects[0];
  const glare = box => {
    assert.deepEqual(box, fire.box);
    return true;
  };
  assert.equal(observe([], glare), undefined);
  observe([fire]);
  assert.equal(observe([fire]).active, true);
  assert.equal(observe([]).active, true);
  for (let j = 0; j < 4; j++) {
    const state = observe([], glare);
    assert.equal(state.status, "overexposed");
    assert.equal(state.active, true);
  }
  assert.equal(observe([]).active, true);
  assert.equal(observe([]).status, "removed");
  assert.equal(observe([], glare).active, false);
});

test("a confident die prevents a duplicate fire proposal without suppressing a nearby marker", () => {
  const observe = newRun();
  const dice = item("dice", 0.20, 0.17);
  const duplicate = item("fire", 0.201, 0.17);
  const realFire = item("fire", 0.23, 0.17);
  const classes = ["dice", "fire"];
  assert.deepEqual(observe([dice, duplicate], classes).effects, []);
  assert.deepEqual(observe([duplicate, dice], classes).effects, []);
  observe([realFire, duplicate, dice], classes);
  const [fire] = observe([realFire, duplicate, dice], classes).effects;
  assert.equal(fire.active, true);
  assert.equal(fire.count, 1);
});

test("a short miniature is assigned by its lower footprint when its base anchor overshoots the room", () => {
  const observe = newRun();
  const larva = { ...item("alien", 0.27, 0.406), box: [0.22, 0.35, 0.10, 0.061] };
  observe([larva]);
  const [alarm] = observe([larva]).effects;
  assert.equal(alarm.roomId, "room");
  assert.equal(alarm.active, true);
});

test("a tall miniature or an anchor on a corridor does not use the small-footprint fallback", () => {
  const observe = newRun();
  const tall = { ...item("alien", 0.27, 0.410), box: [0.22, 0.26, 0.10, 0.163] };
  const corridor = { ...item("alien", 0.402, 0.334), box: [0.33, 0.27, 0.08, 0.07] };
  assert.deepEqual(observe([tall, corridor]).effects, []);
  assert.deepEqual(observe([tall, corridor]).effects, []);
});

test("only noise starts an effect at the technical corridor symbol", () => {
  const observe = newRun();
  const objects = [item("noise", 0.16, 0.62), item("alien", 0.17, 0.62), item("fire", 0.18, 0.62)];
  observe(objects);
  assert.deepEqual(observe(objects).effects.map(effect => [effect.effect.id, effect.roomId, effect.active]),
    [["lichtflackern", "technical-corridor", true]]);
});

test("the blue section starts scanning in the cryochamber and self-destruct 3 alarms the ship", () => {
  const observe = newRun();
  const at = (kind, value) => {
    const slot = layout.slots.find(slot => slot.track === kind && slot.value === value);
    return item("track-marker", slot.x / 1600, 0.9514);
  };
  const newRound = [at("round", 8), at("self-destruct", 3)];
  observe(newRound);
  const on = observe(newRound);
  assert.deepEqual(on.tracks.map(x => x.value), [8, 3]);
  assert.deepEqual(on.effects.map(item => [item.effect.id, item.scope, item.roomId, item.active]),
    [["scanning", "room", "special-cryoschlaf", true], ["intruder-alert", "inside", null, true]]);
  const hidden = observe([]);
  assert.deepEqual(hidden.tracks.map(x => x.status), ["confirmed", "confirmed"]);
  assert.ok(hidden.effects.every(x => x.active));
  const moved = [at("round", 9), at("self-destruct", 4)];
  assert.ok(observe(moved).effects.every(x => x.active));
  assert.ok(observe(moved).effects.every(x => !x.active));
});

test("one missed counter reading does not break confirmation or later removal", () => {
  const observe = newRun();
  const three = item("track-marker", 236 / 1600, 0.9514);
  const four = item("track-marker", 174 / 1600, 0.9514);
  observe([three]);
  assert.equal(observe([]).tracks[0].status, "checking");
  assert.deepEqual(observe([three]).tracks, [{ kind: "self-destruct", value: 3, status: "confirmed" }]);
  for (let i = 0; i < 4; i++) observe([]);
  const hidden = observe([]);
  assert.equal(hidden.tracks[0].status, "uncertain");
  assert.equal(hidden.effects[0].active, true);
  assert.equal(observe([four]).effects[0].active, true);
  assert.equal(observe([four]).effects[0].active, false);
});

test("a readable empty self-destruct track switches off the alarm and ignores the starting symbol", () => {
  const observer = createGameObserver(layout);
  let i = 0;
  const advance = (objects, emptyDestruction = false) => observer.observe({
    frameId: `${1795718100000 + i * 700}-1-${++i}`,
    classes: ["track-marker"], coverage: [0, 0, 1, 1], objects, emptyDestruction,
  });
  const alarm = frame => frame.effects.find(effect => effect.kind === "self-destruct");
  const three = item("track-marker", 236 / 1600, 0.9514);
  const outside = item("track-marker", 60 / 1600, 0.9514);
  advance([three]);
  assert.equal(alarm(advance([three])).active, true);
  assert.equal(alarm(advance([outside])).active, true);
  assert.equal(alarm(advance([outside], true)).active, true);
  const cleared = advance([outside], true);
  assert.equal(alarm(cleared).active, false);
  assert.equal(cleared.tracks.find(track => track.kind === "self-destruct").status, "inactive");
});

test("Nemesis Board B reads its own tracks and applies the same piece rules to its rooms", () => {
  const definition = JSON.parse(readFileSync(new URL("../config/boards/nemesis-board-b.json", import.meta.url), "utf8")).board;
  const b = makeGameLayout(definition, { at: point => point }, 1, 1);
  assert.equal(b.cryo.name, "008");
  assert.equal(b.slots.length, 23);
  const point = (name) => {
    const { polygon } = b.zones.find(zone => zone.name === name);
    return ["x", "y"].map(axis => polygon.reduce((sum, p) => sum + p[axis], 0) / polygon.length);
  };
  const objects = [item("track-marker", 1190 / 1600, 0.9632), item("track-marker", 237 / 1600, 0.9632),
    item("noise", ...point("TC-2")), item("noise", 854 / 1600, 620 / 1094),
    item("fire", ...point("008")), item("malfunction", ...point("008")), item("alien", ...point("008"))];
  const game = createGameObserver(b);
  const frame = { coverage: [0, 0, 1, 1], classes: [...new Set(objects.map(entry => entry.kind))], objects };
  game.observe({ ...frame, frameId: "1795718100000-1-1" });
  const result = game.observe({ ...frame, frameId: "1795718100700-1-2" });
  assert.deepEqual(result.tracks.map(track => [track.kind, track.value]), [["round", 8], ["self-destruct", 3]]);
  assert.deepEqual(result.effects.map(effect => [effect.effect.name, effect.zone, effect.active]), [
    ["Light Flicker", "TC-2", true], ["Light Flicker", "011-013-2", true], ["Fire", "008", true],
    ["Malfunction", "008", true], ["Alarm", "008", true], ["Scanning", "008", true],
    ["Intruder Alert", "Ship interior", true],
  ]);
});

test("counter automation uses the selected board's cryochamber and validates both thresholds", () => {
  for (const [side, roomName] of [["a", "011"], ["b", "008"]]) {
    const definition = JSON.parse(readFileSync(new URL(`../config/boards/nemesis-board-${side}.json`, import.meta.url), "utf8")).board;
    const room = definition.roomCatalog.find(room => room.name === roomName);
    const rules = trackAnimationBindings(definition);
    assert.deepEqual(rules.map(rule => [rule.track, rule.scope, rule.roomId, rule.definition.id]),
      [["round", "room", room.id, "scanning"], ["self-destruct", "inside", null, "intruder-alert"]]);
  }
  assert.deepEqual([9, 8, 1, 0, null, 16].map(value => trackActivation("round", value)),
    [false, true, true, false, undefined, undefined]);
  assert.deepEqual([4, 3, 1, 0, null, -1].map(value => trackActivation("self-destruct", value)),
    [false, true, true, true, false, undefined]);
});
