import assert from "node:assert/strict";
import test from "node:test";
import { createAnimationCameraBindings } from "../src/app/runtime/vision/animation-camera-bindings.js";
import { checkCameraReading } from "../src/app/runtime/vision/camera-board-readings.js";
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
