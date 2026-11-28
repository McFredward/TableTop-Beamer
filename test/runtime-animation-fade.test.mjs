import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../src/app/runtime/core/runtime-animation-fade.js", import.meta.url), "utf8");

function fadeClock() {
  const window = {};
  const epoch = 100_000;
  let wallTime = epoch;
  runInNewContext(source, { window, Date: { now: () => wallTime } });
  return {
    at(animation, time) {
      wallTime = epoch + time;
      return window.TT_BEAMER_RUNTIME_ANIMATION_FADE.computeFadeMultiplier(animation, time);
    },
    epoch,
  };
}

test("a finite animation fades to zero by its scheduled end", () => {
  const { at } = fadeClock();
  const animation = { id: "one-shot", fadeEnabled: true, fadeDurationMs: 800, startedAt: 100, durationMs: 3000 };
  assert.equal(at(animation, 100), 0);
  assert.equal(at(animation, 500), 0.5);
  assert.equal(at(animation, 1700), 1);
  assert.equal(at(animation, 2700), 0.5);
  assert.equal(at(animation, 3100), 0);
});

test("stopping during a fade-in continues from the visible opacity", () => {
  const { at, epoch } = fadeClock();
  const animation = { id: "camera-loop", fadeEnabled: true, fadeDurationMs: 800, hold: true };
  assert.equal(at(animation, 100), 0);
  assert.equal(at(animation, 500), 0.5);
  animation.fadeOutStartedAtEpochMs = epoch + 500;
  assert.equal(at(animation, 500), 0.5);
  assert.equal(at(animation, 900), 0.25);
  assert.equal(at(animation, 1300), 0);
});
