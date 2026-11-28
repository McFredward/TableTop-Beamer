import assert from "node:assert/strict";
import test from "node:test";
import { createAnimationCameraBindings, followDetectedCount } from "../src/app/runtime/vision/animation-camera-bindings.js";
import { checkCameraReading, filterCameraObjects } from "../src/app/runtime/vision/camera-board-readings.js";
import { boardRegion } from "../src/app/runtime/calibration/calibration-math.js";

const roomCatalog = [{ id: "room-1", name: "Workshop", polygon: [[0.1, 0.1], [0.4, 0.1], [0.4, 0.4], [0.1, 0.4]] }];
const cameraTrigger = { modelId: "custom", className: "Gold idol", minConfidence: 0.8, verificationOpacity: 0.42 };
const makeBoard = () => ({
  roomCatalog,
  roomFx: { animations: [{ id: "purple-glow", name: "Purple glow", cameraTrigger }] },
  insideFx: { animations: [{ id: "broadcast", name: "Broadcast", cameraTrigger: { ...cameraTrigger, modelId: "other" } }] },
  outsideFx: { animations: [{ id: "weather", name: "Weather", cameraTrigger: { ...cameraTrigger, modelId: "other" } }] },
});
const item = { kind: "Gold idol", confidence: 0.9, box: [0.14, 0.18, 0.04, 0.04], anchor: [0.16, 0.20] };

test("count announcements confirm a new piece across frames and ignore movement or a short occlusion", () => {
  const follow = followDetectedCount(item.kind, 0.8);
  const elsewhere = { ...item, box: [0.6, 0.18, 0.04, 0.04], anchor: [0.62, 0.2] };
  let n = 0;
  const read = (objects, time) => follow({ frameId: `${1795740000000 + time}-1-${++n}`, objects });
  assert.equal(read([item], 0), false);
  assert.equal(read([elsewhere], 600), false);
  assert.equal(read([elsewhere, { ...elsewhere }], 1200), false);
  assert.equal(read([item, elsewhere], 1800), false);
  assert.equal(read([item, elsewhere], 2400), true);
  assert.equal(read([item], 3000), false);
  assert.equal(read([item], 3600), false);
  assert.equal(read([item, elsewhere], 4200), false);
  assert.equal(read([item, elsewhere], 4800), false);
});

test("an animation can publish its sound on a confirmed board-wide increase", () => {
  const board = makeBoard();
  board.roomFx.animations[0].soundAssetRef = "/resources/sounds/alert.mp3";
  board.roomFx.animations[0].cameraTrigger = { ...cameraTrigger, soundRule: "count-increase" };
  const controller = createAnimationCameraBindings(board, { at: point => point }, 1, 1);
  let n = 0;
  const read = objects => controller.observe("custom", {
    frameId: `${1795740000000 + n * 600}-1-${++n}`, classes: [item.kind], coverage: [0, 0, 1, 1], objects,
  }).actions;
  assert.deepEqual(read([]), []);
  assert.deepEqual(read([]), []);
  assert.deepEqual(read([item]), []);
  assert(read([item]).some(action => action.action === "announce" && action.roomId === null));
  assert(!read([item]).some(action => action.action === "announce"));
});

test("a visible defect is checked once after its projection starts", () => {
  const board = makeBoard();
  board.roomFx.animations[0].cameraTrigger = { ...cameraTrigger, className: "malfunction", verificationOpacity: 0.12 };
  const controller = createAnimationCameraBindings(board, { at: point => point }, 1, 1);
  const marker = { ...item, kind: "malfunction" };
  let n = 0;
  const read = () => controller.observe("custom", {
    frameId: `${1795740000000 + n * 600}-1-${++n}`, classes: [marker.kind],
    coverage: [0, 0, 1, 1], objects: [marker],
  }).actions.map(action => action.action);
  assert.deepEqual(read(), []);
  assert.deepEqual(read(), ["start"]);
  assert.deepEqual(read(), ["verify"]);
  assert.deepEqual(read(), []);
});

test("a saved model and class control an arbitrary room animation through glare and removal", () => {
  const controller = createAnimationCameraBindings(makeBoard(), { at: point => point }, 1, 1);
  let sequence = 0;
  const advance = (modelId, objects = [], glare = false) => controller.observe(modelId, {
    frameId: `${1795740000000 + sequence * 700}-1-${++sequence}`, classes: [item.kind],
    coverage: [0, 0, 1, 1], objects, fireOverexposed: () => glare,
  });
  const room = (action) => ({ action, scope: "room", animationId: "purple-glow", roomId: "room-1" });
  const weak = { ...item, confidence: 0.7 };
  assert.deepEqual(advance("unknown", [item]).actions, []);
  assert.deepEqual(advance("custom", [weak]).actions, []);
  assert.deepEqual(advance("custom", [weak]).actions, []);
  assert.deepEqual(advance("custom", [item]).actions, []);
  assert.deepEqual(advance("custom", [item]).actions, [room("start")]);
  assert.deepEqual(advance("custom", [], true).actions, [room("verify")]);
  assert.equal(advance("custom", [], true).effects[0].active, true);
  assert.deepEqual(advance("custom").actions, []);
  assert.deepEqual(advance("custom").actions, [room("stop")]);
  assert.deepEqual(advance("custom").actions, []);
});

test("a second detector can bind inside and outside animations independently of room bindings", () => {
  const controller = createAnimationCameraBindings(makeBoard(), { at: point => point }, 1, 1);
  const first = { frameId: "1795740000000-1-1", classes: [item.kind], coverage: [0, 0, 1, 1], objects: [item] };
  assert.deepEqual(controller.modelIds, ["custom", "other"]);
  assert.deepEqual(controller.observe("other", first).actions, []);
  assert.deepEqual(controller.observe("other", { ...first, frameId: "1795740000700-1-2" }).actions, [
    { action: "start", scope: "inside", animationId: "broadcast", roomId: null },
    { action: "start", scope: "outside", animationId: "weather", roomId: null },
  ]);
});

test("a strong result starts on one frame and a temporary feed gap leaves observations visible", () => {
  const controller = createAnimationCameraBindings(makeBoard(), { at: point => point }, 1, 1);
  const first = { frameId: "1795740000000-1-1", classes: [item.kind],
    coverage: [0, 0, 1, 1], objects: [{ ...item, confidence: 0.97 }] };
  const result = controller.observe("custom", first);
  assert.deepEqual(result.actions, [{ action: "start", scope: "room", animationId: "purple-glow", roomId: "room-1" }]);
  assert.deepEqual(controller.snapshots(), result.effects);
  assert.deepEqual(controller.observe("custom", { ...first, classes: [], objects: [] }).actions, []);
  assert.deepEqual(controller.snapshots(), result.effects);
  controller.retry("custom", result.actions[0]);
  assert.deepEqual(controller.observe("custom", { ...first, frameId: "1795740003100-1-2" }).actions, result.actions);
});

test("the fast path for fire still requires independent visual evidence", () => {
  const board = makeBoard();
  board.roomFx.animations[0] = { id: "fire", name: "Fire", cameraTrigger: { ...cameraTrigger, className: "fire" } };
  const create = () => createAnimationCameraBindings(board, { at: point => point }, 1, 1);
  const first = { frameId: "1795740000000-1-1", classes: ["fire"], coverage: [0, 0, 1, 1],
    objects: [{ ...item, kind: "fire", confidence: 0.98 }] };
  assert.deepEqual(create().observe("custom", first).actions, []);
  assert.equal(create().observe("custom", { ...first, confirmFire: () => true }).actions[0].action, "start");
  assert.deepEqual(create().observe("custom", { ...first, confirmFire: () => true, fireOverexposed: () => true }).actions, []);
});

test("a missing verification photo only blocks classes that require it", async () => {
  const board = makeBoard();
  board.roomFx.animations.push({
    id: "alarm", name: "Alarm", cameraTrigger: { modelId: "custom", className: "alien" },
  });
  const bindings = createAnimationCameraBindings(board, { at: point => point }, 1, 1);
  const model = { modelId: "custom", frameId: "1795740000000-1-1", classes: ["fire", "alien", item.kind],
    coverage: [0, 0, 1, 1], objects: [item, { ...item, kind: "alien", confidence: 0.97 }] };
  const checked = await checkCameraReading(model, { geometry: {}, bindings, checkedModels: new Map() },
    new AbortController().signal, null, model.frameId);
  assert.deepEqual(checked.classes, ["alien", item.kind]);
  assert.deepEqual(bindings.observe("custom", checked).actions, [
    { scope: "room", animationId: "alarm", roomId: "room-1", action: "start" },
  ]);
});

test("a perspective board edge excludes pieces and corrections whose anchors lie on the table", async () => {
  const at = ({ x, y }) => ({ x: 0.2 + 0.6 * x - 0.1 * y, y: 0.2 + 0.55 * y });
  const registration = { at, contains: boardRegion(at) };
  const bindings = createAnimationCameraBindings(makeBoard(), registration, 1, 1);
  const slope = { ...item, confidence: 0.99, box: [0.14, 0.22, 0.06, 0.09], anchor: [0.166, 0.28] };
  const onBoard = { ...item, box: [0.10, 0.40, 0.11, 0.20], anchor: [0.19, 0.59],
    reclassifiedFrom: { kind: "dice", box: slope.box } };
  const model = { modelId: "other", frameId: "1795740000000-1-1", classes: [item.kind, "dice"], coverage: [0, 0, 1, 1],
    objects: [slope, onBoard] };
  const setup = { width: 1, height: 1, registration, bindings, checkedModels: new Map() };
  const checked = await checkCameraReading(model, setup, new AbortController().signal);
  assert.deepEqual(checked.objects, [{ ...item, box: onBoard.box, anchor: onBoard.anchor }]);
  assert.deepEqual(checked.coverage, model.coverage);
  assert.equal(model.objects.length, 2);
});

test("boxes spanning several rooms are removed in board coordinates while large aliens remain", () => {
  const at = ({ x, y }) => ({ x: 0.2 + 0.6 * x - 0.08 * y, y: 0.2 + 0.55 * y });
  const referenceAt = ({ x, y }) => {
    const v = (y - 0.2) / 0.55;
    return { x: (x - 0.2 + 0.08 * v) / 0.6, y: v };
  };
  const giant = { kind: "character", confidence: 0.99, box: [0.32, 0.31, 0.3, 0.27], anchor: [0.47, 0.55] };
  const alien = { kind: "alien", confidence: 0.96, box: [0.32, 0.31, 0.124, 0.14], anchor: [0.38, 0.44],
    reclassifiedFrom: { kind: giant.kind, box: giant.box } };
  const corrected = filterCameraObjects({ objects: [giant, alien] },
    { width: 1, height: 1, registration: { contains: boardRegion(at), referenceAt } });
  assert.deepEqual(corrected.objects, [{ kind: alien.kind, confidence: alien.confidence, box: alien.box, anchor: alien.anchor }]);
});

test("a blue projection pulse requests a dimmed malfunction check before clearing the effect", async () => {
  const board = makeBoard();
  board.roomFx.animations[0].cameraTrigger = {
    ...cameraTrigger, className: "malfunction", verificationOpacity: 0.38,
  };
  const bindings = createAnimationCameraBindings(board, { at: point => point }, 1, 1);
  const setup = { width: 16, height: 16, bindings, checkedModels: new Map() };
  const controller = new AbortController();
  const camera = color => ({ width: 16, height: 16, rgba: Uint8Array.from({ length: 16 * 16 * 4 }, (_, i) => color[i % 4]) });
  const before = camera([80, 90, 95, 255]);
  const glare = camera([60, 115, 242, 255]);
  const mark = { ...item, kind: "malfunction", confidence: 0.94 };
  async function analyze(sequence, photo, objects = []) {
    const frameId = `${1795740000000 + sequence * 3000}-1-${sequence}`;
    const model = { modelId: "custom", frameId, objects, classes: ["malfunction"], coverage: [0, 0, 1, 1] };
    return bindings.observe("custom", await checkCameraReading(model, setup, controller.signal, photo, frameId));
  }
  assert.equal((await analyze(1, before, [mark])).actions.length, 0);
  assert.equal((await analyze(2, before, [mark])).actions[0].action, "start");
  const covered = await analyze(3, glare);
  assert.equal(covered.actions[0].action, "verify");
  assert.equal(covered.effects[0].status, "overexposed");
  assert.equal((await analyze(4, before)).effects[0].active, true);
  assert.equal((await analyze(5, before)).actions[0].action, "stop");
});
