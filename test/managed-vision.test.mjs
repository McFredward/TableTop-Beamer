import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createManagedVision, localVisionOptions } from "../src/server/managed-vision.mjs";

test("the configured detector starts for its board and recovers from a process exit", () => {
  let time = 0;
  let state = { phase: "not-connected" };
  const workers = [];
  const vision = {
    modelStatus: () => state,
    reportModelStatus: ({ phase, error }) => { state = { phase, ...(error && { error }) }; },
  };
  const managed = createManagedVision({
    root: process.cwd(), python: process.execPath, checkpoint: process.execPath, vision, now: () => time,
    start(executable, args) {
      const worker = new EventEmitter();
      worker.kill = () => { worker.killed = true; };
      workers.push({ executable, worker, args });
      return worker;
    },
  });
  assert.equal(managed.manages("some-other-model"), false);
  state = { phase: "ready" };
  managed.start(4173, () => false);
  assert.equal(workers.length, 0);
  state = { phase: "disconnected" };
  managed.ensure(false, 4173);
  assert.equal(workers.length, 1);
  assert.equal(state.phase, "starting");
  assert.equal(workers[0].args[workers[0].args.indexOf("--device") + 1], "cpu");
  workers[0].worker.emit("close", 1);
  assert.deepEqual(state, { phase: "error", error: "worker" });
  time = 4999;
  managed.ensure(false, 4173);
  assert.equal(workers.length, 1);
  time++;
  managed.ensure(false, 4173);
  assert.equal(workers.length, 2);
  managed.stop();
  assert.equal(workers[1].worker.killed, true);
  workers[1].worker.emit("close", 1);
  time += 10_000;
  managed.ensure(false, 4173);
  assert.equal(workers.length, 2);
});

test("server startup runs the local detector before any camera or dashboard is connected", t => {
  const root = mkdtempSync(join(tmpdir(), "ttb-vision-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, ".vision", "venv", "Scripts"), { recursive: true });
  writeFileSync(join(root, ".vision", "nemesis.pth"), "");
  writeFileSync(join(root, ".vision", "venv", "Scripts", "python.exe"), "");
  writeFileSync(join(root, ".vision", "settings.json"), '\uFEFF{"roi":"790,250,2290,1400","tileSize":1280}');
  const options = localVisionOptions({ root, env: {}, platform: "win32" });
  const calls = [];
  const worker = new EventEmitter();
  worker.kill = () => { worker.killed = true; };
  const managed = createManagedVision({ ...options, vision: {
    modelStatus: () => ({ phase: "not-connected" }),
    reportModelStatus: ({ modelId, phase }) => assert.deepEqual([modelId, phase], ["nemesis", "starting"]),
  }, start: (executable, args) => { calls.push({ executable, args }); return worker; } });
  t.after(() => managed.stop());
  managed.start(19217, () => false);
  managed.start(19217, () => false);
  assert.equal(calls.length, 1);
  assert.deepEqual(managed.modelIds, ["nemesis"]);
  assert.equal(calls[0].executable, join(root, ".vision", "venv", "Scripts", "python.exe"));
  assert.ok(calls[0].args.includes("19217"));
  assert.ok(calls[0].args.includes("790,250,2290,1400"));
  assert.ok(calls[0].args.includes("1280"));
  assert.equal(localVisionOptions({ root, platform: "win32", env: {
    TT_BEAMER_VISION_AUTOSTART: "0", TT_BEAMER_VISION_DEVICE: "cuda",
  } }).enabled, false);
});
