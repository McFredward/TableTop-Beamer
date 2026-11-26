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

test("fire recognition assigns a real-size orange component to a playable room", async () => {
  const { cv } = await new Promise(resolve => {
    if (cvModule.Mat) resolve({ cv: cvModule });
    else cvModule.onRuntimeInitialized = () => resolve({ cv: cvModule });
  });
  const board = { at: ({ x, y }) => ({ x: 75 + x * 1050, y: 70 + y * 660 }) };
  const geometry = makeFireGeometry(board, [room], frameWidth, frameHeight);
  const image = frame();
  const orange = [175, 72, 29, 255];
  fill(image, { x: 370, y: 270, w: 18, h: 22 }, orange);
  fill(image, { x: 420, y: 270, w: 8, h: 9 }, orange);
  fill(image, { x: 690, y: 270, w: 22, h: 21 }, orange);
  const hits = detectFireTokens(cv, image, geometry);
  assert.deepEqual([...hits.keys()], ["a-02"]);
  assert.deepEqual(hits.get("a-02").box, { x: 370, y: 270, w: 18, h: 22 });
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
  assert.equal(observe(image, hit, 2).proposal, "Fire on");
  assert.equal(observe(covered, partial, 3).state, "occluded");
  for (let id = 4; id <= 7; id++) assert.equal(observe(covered, noHits, id).proposal, "Keep fire");
  assert.equal(observe(image, noHits, 8).proposal, "Keep fire");
  assert.equal(observe(image, noHits, 9).proposal, "Keep fire");
  assert.equal(observe(image, noHits, 14).proposal, "Keep fire");
  assert.equal(observe(image, noHits, 15).proposal, "Keep fire");
  assert.equal(observe(image, noHits, 16).proposal, "Fire off");
});
