import assert from "node:assert/strict";
import test from "node:test";
import { createCameraAutomation, removeCameraAnimations } from "../src/server/camera-automation.mjs";

test("switching off invalidates pending camera commands and reenabling requires a fresh reading", () => {
  let now = 1000;
  const automation = createCameraAutomation(() => now);
  assert.deepEqual(automation.status(), { enabled: false, phase: "off" });
  assert.equal(automation.heartbeat("first", "active"), null);
  assert.equal(automation.setEnabled(true), true);
  assert.equal(automation.accepts(undefined, now), false);
  const { token } = automation.heartbeat("first", "active");
  assert.equal(automation.heartbeat("second", "active"), null);
  assert.equal(automation.accepts(token, now - 1), false);
  assert.equal(automation.accepts(token, now), true);
  automation.setEnabled(false);
  assert.equal(automation.accepts(token, now), false);

  now += 500;
  automation.setEnabled(true);
  const next = automation.heartbeat("second", "model").token;
  assert.notEqual(next, token);
  assert.equal(automation.accepts(token, now), false);
  assert.equal(automation.accepts(next, now - 1), false);
  assert.equal(automation.accepts(next, now), true);
  now += 15_001;
  assert.equal(automation.status().phase, "host");
  assert.notEqual(automation.heartbeat("first", "active").token, next);
});

test("disabling camera effects stops only its instances, including the associated outside layer", () => {
  const boardId = "nemesis-board-b";
  const cameraFire = { boardId, id: "camera-fire", scope: "room", cameraTriggerOwner: '["room","feuer","r1"]' };
  const cameraWeather = { boardId, id: "camera-weather", scope: "global", type: "sandstorm",
    cameraTriggerOwner: '["outside","sandstorm",null]' };
  const alarm = { boardId, id: "manual-alarm", scope: "global", type: "intruder-alert" };
  const profiles = { [boardId]: { enabled: true, selectedAnimationId: "sandstorm" }, other: { enabled: true } };
  const stopped = removeCameraAnimations({ boardId, runningAnimations: [cameraFire, cameraWeather, alarm] }, profiles);
  assert.deepEqual(stopped.runtime.runningAnimations, [alarm]);
  assert.deepEqual(stopped.outsideFxByBoard, {
    [boardId]: { enabled: false, selectedAnimationId: "sandstorm" }, other: { enabled: true },
  });
});
