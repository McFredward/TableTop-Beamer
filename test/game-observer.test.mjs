import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createGameObserver, makeGameLayout } from "../src/app/runtime/vision/game-observer.js";

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
  assert.equal(alarm(observe(room)).active, true);
  assert.equal(alarm(observe(room)).active, false);
});

test("partial model coverage cannot clear a previously observed effect", () => {
  const observe = newRun();
  observe([item("fire", 0.2, 0.17)]);
  observe([item("fire", 0.2, 0.17)]);
  for (let round = 0; round < 4; round++) assert.equal(observe([], ["fire"], [0.47, 0, 0.5, 1]).effects[0].active, true);
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
  assert.equal(state([nearby]).active, true);
  const removed = state([widerBox]);
  assert.equal(removed.status, "removed");
  assert.equal(removed.active, false);
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
  assert.deepEqual(hidden.tracks.map(x => x.status), ["uncertain", "uncertain"]);
  assert.ok(hidden.effects.every(x => x.active));
  const moved = [at("round", 9), at("self-destruct", 4)];
  assert.ok(observe(moved).effects.every(x => x.active));
  assert.ok(observe(moved).effects.every(x => !x.active));
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
