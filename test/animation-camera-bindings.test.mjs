import assert from "node:assert/strict";
import test from "node:test";
import { createAnimationCameraBindings } from "../src/app/runtime/vision/animation-camera-bindings.js";

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
