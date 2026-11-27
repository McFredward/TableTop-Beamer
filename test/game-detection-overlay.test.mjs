import assert from "node:assert/strict";
import test from "node:test";
import { createGameDetectionOverlay } from "../src/app/runtime/ui/game-detection-overlay.js";

const alien = { kind: "alien", confidence: 0.84, box: [0.15, 0.22, 0.07, 0.07] };
const fire = { kind: "fire", confidence: 0.9, box: [0.42, 0.45, 0.03, 0.03] };
const read = (frameId, objects, modelId = "nemesis") => ({ frameId, objects, modelId, classes: ["alien", "fire"] });

test("brief model feed gaps preserve the overlay and mark it as last seen", () => {
  let now = 0;
  const overlay = createGameDetectionOverlay(() => now);
  assert.deepEqual(overlay(read("1-1-1", [alien, fire])).objects, [alien, fire]);
  now = 3500;
  assert.equal(overlay(null).delayed, true);
  assert.deepEqual(overlay(null).objects, [{ ...alien, held: true }, { ...fire, held: true }]);
  now = 7000;
  assert.deepEqual(overlay(null).objects, []);
});

test("one missed detection keeps a confident box until the next result", () => {
  const overlay = createGameDetectionOverlay(() => 0);
  overlay(read("1-1-1", [alien, fire]));
  const firstMiss = read("2-1-2", [fire]);
  assert.deepEqual(overlay(firstMiss).objects, [fire, { ...alien, held: true }]);
  assert.deepEqual(overlay(firstMiss).objects, [fire, { ...alien, held: true }]);
  assert.deepEqual(overlay(read("3-1-3", [fire])).objects, [fire]);
  overlay(read("4-1-4", [alien, fire]));
  assert.deepEqual(overlay(read("5-1-5", [fire], "different")).objects, [fire]);
});

test("a reclassified piece immediately replaces its obsolete label", () => {
  const overlay = createGameDetectionOverlay(() => 0);
  const wrong = { ...alien, kind: "malfunction" };
  const corrected = { ...alien, reclassifiedFrom: { kind: "malfunction", box: wrong.box } };
  const update = (seq, object) => overlay({ ...read(seq, [object]), classes: ["alien", "malfunction"] });
  update("1-1-1", wrong);
  assert.deepEqual(update("2-1-2", corrected).objects, [corrected]);
});
