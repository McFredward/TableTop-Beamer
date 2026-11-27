import assert from "node:assert/strict";
import test from "node:test";
import cvModule from "@techstark/opencv-js";
import { createFireTracker, detectFireTokens, makeFireGeometry } from "../src/app/runtime/vision/fire-observer.js";

const room = { id: "a-02", name: "005", polygon: [[0.17, 0.2], [0.52, 0.2], [0.52, 0.65], [0.17, 0.65]] };
const frameWidth = 1200;
const frameHeight = 800;

function frame() {
  const rgba = new Uint8ClampedArray(frameWidth * frameHeight * 4);
  rgba.fill(25);
  return { width: frameWidth, height: frameHeight, rgba };
}

function fill(image, { x, y, w, h }, color) {
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) image.rgba.set(color, (row * image.width + col) * 4);
  }
}

const openCV = new Promise(resolve => {
  if (cvModule.Mat) resolve({ cv: cvModule });
  else cvModule.onRuntimeInitialized = () => resolve({ cv: cvModule });
});
const board = {
  at: ({ x, y }) => ({ x: 75 + x * 1050, y: 70 + y * 660 }),
  referenceAt: ({ x, y }) => ({ x: x / (frameWidth - 1), y: y / (frameHeight - 1) }),
};

test("fire recognition assigns a real-size orange component to a playable room", async () => {
  const { cv } = await openCV;
  const geometry = makeFireGeometry(board, [room], frameWidth, frameHeight);
  const image = frame();
  const orange = [175, 72, 29, 255];
  fill(image, { x: 370, y: 270, w: 18, h: 22 }, orange);
  fill(image, { x: 420, y: 270, w: 8, h: 9 }, orange);
  fill(image, { x: 690, y: 270, w: 22, h: 21 }, orange);
  const hits = detectFireTokens(cv, image, geometry);
  assert.deepEqual([...hits.keys()], ["a-02"]);
  assert.deepEqual(hits.get("a-02").box, { x: 370, y: 270, w: 18, h: 22 });

  const lit = frame();
  fill(lit, { x: 360, y: 260, w: 55, h: 45 }, [65, 69, 120, 255]);
  fill(lit, { x: 370, y: 270, w: 18, h: 22 }, [102, 68, 86, 255]);
  fill(lit, { x: 435, y: 270, w: 22, h: 20 }, [90, 63, 83, 255]);
  const litHits = detectFireTokens(cv, lit, geometry);
  assert.deepEqual([...litHits.keys()], ["a-02"]);
  assert.deepEqual(litHits.get("a-02").box, { x: 370, y: 270, w: 18, h: 22 });
});

test("a camera-brightened orange decoration is excluded by matched artwork", async () => {
  const { cv } = await openCV;
  const artwork = frame();
  const image = frame();
  const decoration = { x: 370, y: 270, w: 20, h: 24 };
  fill(artwork, decoration, [114, 88, 67, 255]);
  fill(image, decoration, [170, 114, 74, 255]);
  const geometry = makeFireGeometry(board, [room], frameWidth, frameHeight, artwork);
  assert.equal(detectFireTokens(cv, image, geometry).size, 0);

  const token = { x: 422, y: 300, w: 20, h: 21 };
  fill(image, token, [170, 114, 74, 255]);
  assert.deepEqual(detectFireTokens(cv, image, geometry).get(room.id)?.box, token);
});

test("a red alarm keeps the saturated token separate from neutral printed details", async () => {
  const { cv } = await openCV;
  const artwork = frame();
  const image = frame();
  const floor = { x: 255, y: 202, w: 365, h: 300 };
  const decoration = { x: 370, y: 270, w: 20, h: 24 };
  const token = { x: 420, y: 300, w: 20, h: 22 };
  fill(image, floor, [90, 53, 45, 255]);
  fill(artwork, decoration, [130, 151, 173, 255]);
  fill(image, decoration, [192, 95, 93, 255]);
  fill(image, token, [219, 119, 109, 255]);
  const geometry = makeFireGeometry(board, [room], frameWidth, frameHeight, artwork);
  assert.deepEqual(detectFireTokens(cv, image, geometry).get(room.id)?.box, token);
});

test("a warm halo connected to a marker does not replace its compact core", async () => {
  const { cv } = await openCV;
  const image = frame();
  const geometry = makeFireGeometry(board, [room], frameWidth, frameHeight);
  const token = { x: 371, y: 268, w: 23, h: 28 };
  fill(image, { x: 354, y: 263, w: 60, h: 38 }, [142, 118, 96, 255]);
  fill(image, token, [194, 91, 59, 255]);
  assert.deepEqual(detectFireTokens(cv, image, geometry).get(room.id)?.box, token);
});

test("moving points of projected fire are not combined into a stationary marker", () => {
  const tracker = createFireTracker();
  const image = frame();
  const first = { x: 370, y: 270, w: 18, h: 22 };
  const second = { ...first, x: 415, y: 298 };
  const nearSecond = { ...second, x: second.x + 2 };
  const observe = (id, box) => tracker.observe(image, new Map([[room.id, { room, box, area: 375 }]]), String(id), id * 700)[0];
  assert.equal(observe(1, first).active, false);
  assert.equal(observe(2, second).active, false);
  assert.equal(observe(3, nearSecond).active, false);
  assert.equal(observe(4, nearSecond).active, true);
  assert.deepEqual(observe(5, first).box, nearSecond);
  assert.deepEqual(observe(6, first).box, first);
});

test("an occlusion keeps fire active until the clear location is seen in three fresh frames", () => {
  const tracker = createFireTracker();
  const image = frame();
  const box = { x: 370, y: 270, w: 18, h: 22 };
  const hit = new Map([[room.id, { room, box, area: 376 }]]);
  const partial = new Map([[room.id, { room, box, area: 135 }]]);
  const covered = frame();
  fill(covered, { x: 344, y: 251, w: 68, h: 57 }, [117, 115, 112, 255]);
  const noHits = new Map();
  const observe = (photo, hits, id) => tracker.observe(photo, hits, String(id), id * 700)[0];
  assert.equal(observe(image, hit, 1).state, "uncertain");
  assert.equal(observe(image, hit, 1).state, "uncertain");
  assert.equal(observe(image, hit, 2).proposal, "Checking");
  assert.equal(observe(image, hit, 3).proposal, "Fire on");
  assert.equal(observe(covered, partial, 4).state, "occluded");
  for (let id = 5; id <= 8; id++) assert.equal(observe(covered, noHits, id).proposal, "Keep fire");
  assert.equal(observe(image, noHits, 9).proposal, "Keep fire");
  assert.equal(observe(image, noHits, 10).proposal, "Keep fire");
  assert.equal(observe(image, noHits, 15).proposal, "Keep fire");
  assert.equal(observe(image, noHits, 16).proposal, "Keep fire");
  assert.equal(observe(image, noHits, 17).proposal, "Fire off");
});
