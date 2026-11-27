import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { createManagedVision } from "../src/server/managed-vision.mjs";

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
  managed.ensure(["some-other-model"], true, 4173);
  assert.equal(workers.length, 0);
  state = { phase: "ready" };
  managed.ensure(["nemesis"], true, 4173);
  assert.equal(workers.length, 0);
  state = { phase: "disconnected" };
  managed.ensure(["nemesis"], true, 4173);
  assert.equal(workers.length, 1);
  assert.equal(state.phase, "starting");
  assert.equal(workers[0].args[workers[0].args.indexOf("--device") + 1], "cpu");
  workers[0].worker.emit("close", 1);
  assert.deepEqual(state, { phase: "error", error: "worker" });
  time = 4999;
  managed.ensure(["nemesis"], true, 4173);
  assert.equal(workers.length, 1);
  time++;
  managed.ensure(["nemesis"], true, 4173);
  assert.equal(workers.length, 2);
  managed.stop();
  assert.equal(workers[1].worker.killed, true);
  workers[1].worker.emit("close", 1);
  time += 10_000;
  managed.ensure(["nemesis"], true, 4173);
  assert.equal(workers.length, 2);
});
