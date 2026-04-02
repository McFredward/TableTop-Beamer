import assert from "node:assert/strict";

function createBootstrapRunner() {
  let activeRun = null;
  return {
    run(initializer) {
      if (activeRun) {
        return activeRun;
      }
      activeRun = Promise.resolve().then(() => initializer());
      return activeRun;
    },
  };
}

const runner = createBootstrapRunner();
let initCallCount = 0;

await Promise.all([
  runner.run(async () => {
    initCallCount += 1;
    return "ready";
  }),
  runner.run(async () => {
    initCallCount += 1;
    return "ready";
  }),
]);

assert.equal(initCallCount, 1, "bootstrap must remain idempotent under duplicate starts");

function resolveProfile({ weakDevice, stored, url }) {
  const valid = new Set(["safe", "balanced", "aggressive"]);
  const normalizedUrl = valid.has(url) ? url : "balanced";
  if (normalizedUrl !== "balanced") {
    return normalizedUrl;
  }
  const normalizedStored = valid.has(stored) ? stored : "balanced";
  if (normalizedStored !== "balanced") {
    return normalizedStored;
  }
  return weakDevice ? "safe" : "balanced";
}

assert.equal(resolveProfile({ weakDevice: true, stored: null, url: null }), "safe", "weak devices must default to safe profile");
assert.equal(resolveProfile({ weakDevice: false, stored: "aggressive", url: null }), "aggressive", "stored override should remain supported");
assert.equal(resolveProfile({ weakDevice: false, stored: null, url: "safe" }), "safe", "url override should allow emergency safe mode");

console.log(JSON.stringify({
  suite: "p9-hf4-runtime-smoke",
  executedAt: new Date().toISOString(),
  checks: [
    "bootstrap-idempotency",
    "runtime-profile-default-safe-on-weak",
    "runtime-profile-override-paths",
  ],
  result: "PASS",
}, null, 2));
