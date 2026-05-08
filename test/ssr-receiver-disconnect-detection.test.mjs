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

test("evaluateDisconnect: frame stale > FRAME_STALE_THRESHOLD_MS yields disconnected when connected", () => {
  // Phase 33 iteration 2 (2026-05-09): FRAME_STALE_THRESHOLD_MS is now
  // 30000 ms (split from heartbeat threshold). Local GIF decode bursts on
  // /output/ legitimately pause requestVideoFrameCallback for 5-10 s; the
  // old 8s threshold mis-classified those as broken stream and tore down
  // the WS, producing the user's "endless connect/disconnect loop" in
  // production. Use 35000 ms gap to clearly exceed the new threshold.
  const r = evaluateDisconnect({
    pcConnectionState: "connected",
    lastFrameAtMs: 0,
    lastHeartbeatAtMs: 34900,
    nowMs: 35000,
  });
  assert.equal(r.disconnected, true);
  assert.ok(r.reasons.includes("frame-stale"));
});

test("evaluateDisconnect: frame stale within FRAME_STALE_THRESHOLD_MS is healthy (regression for the production reconnect loop)", () => {
  // The exact symptom the probe captured: pcState=connected,
  // lastFrameAgeMs=8797, lastHbAgeMs=801. Heartbeats fresh, frames lagging
  // because of GIF decode pressure. MUST NOT trigger disconnect.
  const r = evaluateDisconnect({
    pcConnectionState: "connected",
    lastFrameAtMs: 0,
    lastHeartbeatAtMs: 7999,
    nowMs: 8800,
  });
  assert.equal(r.disconnected, false);
  assert.deepEqual(r.reasons, []);
});

test("evaluateDisconnect: heartbeat stale > threshold yields disconnected", () => {
  // h36: threshold raised to 8000 ms. Use 10000 ms gap to clearly exceed.
  const r = evaluateDisconnect({
    pcConnectionState: "connected",
    lastFrameAtMs: 10000,
    lastHeartbeatAtMs: 0,
    nowMs: 10000,
  });
  assert.equal(r.disconnected, true);
  assert.ok(r.reasons.includes("heartbeat-stale"));
});

test("evaluateDisconnect: all healthy returns false", () => {
  // Within the 8 s h36 threshold — fresh enough to not declare disconnect.
  const r = evaluateDisconnect({
    pcConnectionState: "connected",
    lastFrameAtMs: 4500,
    lastHeartbeatAtMs: 4800,
    nowMs: 5000,
  });
  assert.equal(r.disconnected, false);
  assert.deepEqual(r.reasons, []);
});

test("DISCONNECT_THRESHOLD_MS is 8000ms per Phase-31 h36 reconnect-storm fix", () => {
  // h36 (2026-05-06): raised from 3000 to 8000 ms. Heavy align-mode drag
  // traffic causes the server's signaling-WS heartbeat to occasionally lag
  // past 3 s while the Node event loop processes mutation fanouts; the
  // old threshold then declared "heartbeat-stale" and dropped the WS,
  // creating a reconnect storm. 8 s leaves headroom for several missed
  // heartbeats while still surfacing real disconnects within an align-mode
  // session. Real crashes still surface instantly via host-down / pc-failed.
  assert.equal(DISCONNECT_THRESHOLD_MS, 8000);
});

// Phase 32 D-B2: MAX_RECONNECT_ATTEMPTS was 10 (Plan 03 original contract).
// 32-02-T2 removes the hard cap in favour of forever-retry adaptive backoff.
// Test updated to assert the export is gone (undefined = correct post-patch).
test("MAX_RECONNECT_ATTEMPTS is removed in Phase 32 D-B2 (forever-retry replaces hard cap)", () => {
  assert.equal(
    typeof MAX_RECONNECT_ATTEMPTS,
    "undefined",
    "MAX_RECONNECT_ATTEMPTS must be undefined after Phase 32 removes the hard cap",
  );
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
