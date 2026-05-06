// Phase 31 Plan 03 — Pi receiver three-indicator disconnect detection (D-C4).
// Tests the pure unit-export `evaluateDisconnect` (D-C4 indicator combination)
// and `isReceiverPath` (Pi /output/ vs SSR-tab gating).
//
// The receiver modules ship as browser-targeted ES modules with `window`/
// `document` references; the pure functions exercised here have NO browser
// dependencies and import-load cleanly under Node's ESM loader because the
// repo is `"type": "module"` (Plan 00 Task 0).

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

test("Plan 03: receiver-status-ui.js exists", () => {
  assert.ok(
    existsSync("./src/app/runtime/output-receiver/receiver-status-ui.js"),
    "Plan 03 must create src/app/runtime/output-receiver/receiver-status-ui.js",
  );
});

test("Plan 03: receiver-bootstrap.js exists", () => {
  assert.ok(
    existsSync("./src/app/runtime/output-receiver/receiver-bootstrap.js"),
    "Plan 03 must create src/app/runtime/output-receiver/receiver-bootstrap.js",
  );
});

test("Plan 03: receiver-webrtc-client.js exists", () => {
  assert.ok(
    existsSync("./src/app/runtime/output-receiver/receiver-webrtc-client.js"),
    "Plan 03 must create src/app/runtime/output-receiver/receiver-webrtc-client.js",
  );
});

const statusUiMod = await import("../src/app/runtime/output-receiver/receiver-status-ui.js");
const { evaluateDisconnect, DISCONNECT_THRESHOLD_MS, MAX_RECONNECT_ATTEMPTS } = statusUiMod;
const bootMod = await import("../src/app/runtime/output-receiver/receiver-bootstrap.js");
const { isReceiverPath } = bootMod;

test("evaluateDisconnect: pc-failed yields disconnected", () => {
  const r = evaluateDisconnect({
    pcConnectionState: "failed",
    lastFrameAtMs: 0,
    lastHeartbeatAtMs: 0,
    nowMs: 0,
  });
  assert.equal(r.disconnected, true);
  assert.ok(r.reasons.includes("pc-failed"));
});

test("evaluateDisconnect: pc-disconnected yields disconnected", () => {
  const r = evaluateDisconnect({
    pcConnectionState: "disconnected",
    lastFrameAtMs: 0,
    lastHeartbeatAtMs: 0,
    nowMs: 0,
  });
  assert.equal(r.disconnected, true);
  assert.ok(r.reasons.includes("pc-disconnected"));
});

test("evaluateDisconnect: frame stale > 3s yields disconnected when connected", () => {
  const r = evaluateDisconnect({
    pcConnectionState: "connected",
    lastFrameAtMs: 0,
    lastHeartbeatAtMs: 5000,
    nowMs: 5000,
  });
  assert.equal(r.disconnected, true);
  assert.ok(r.reasons.includes("frame-stale"));
});

test("evaluateDisconnect: heartbeat stale > 3s yields disconnected", () => {
  const r = evaluateDisconnect({
    pcConnectionState: "connected",
    lastFrameAtMs: 5000,
    lastHeartbeatAtMs: 0,
    nowMs: 5000,
  });
  assert.equal(r.disconnected, true);
  assert.ok(r.reasons.includes("heartbeat-stale"));
});

test("evaluateDisconnect: all healthy returns false", () => {
  const r = evaluateDisconnect({
    pcConnectionState: "connected",
    lastFrameAtMs: 4500,
    lastHeartbeatAtMs: 4800,
    nowMs: 5000,
  });
  assert.equal(r.disconnected, false);
  assert.deepEqual(r.reasons, []);
});

test("DISCONNECT_THRESHOLD_MS is 3000ms per RESEARCH.md § Pi receiver", () => {
  assert.equal(DISCONNECT_THRESHOLD_MS, 3000);
});

test("MAX_RECONNECT_ATTEMPTS is 10 per Plan 03 D-B4 contract", () => {
  assert.equal(MAX_RECONNECT_ATTEMPTS, 10);
});

test("isReceiverPath: /output/ → true", () => {
  assert.equal(isReceiverPath({ pathname: "/output/", search: "" }), true);
});
test("isReceiverPath: /output → true", () => {
  assert.equal(isReceiverPath({ pathname: "/output", search: "" }), true);
});
test("isReceiverPath: /output?ssr=1 → false (SSR tab)", () => {
  assert.equal(isReceiverPath({ pathname: "/output", search: "?ssr=1" }), false);
});
test("isReceiverPath: /output/?ssr=1&board=foo → false", () => {
  assert.equal(isReceiverPath({ pathname: "/output/", search: "?ssr=1&board=foo" }), false);
});
test("isReceiverPath: / (dashboard) → false", () => {
  assert.equal(isReceiverPath({ pathname: "/", search: "" }), false);
});
