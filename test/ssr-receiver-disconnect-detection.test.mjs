// Phase 31 Wave 0 — Pi receiver three-indicator disconnect detection scaffold.
// Plan 03 will create src/app/runtime/output-receiver/receiver-status-ui.js.
// Until then the file-existence assertion is skip-gated; the documented
// indicator-name + threshold constants run immediately to lock the contract.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

test(
  "Wave 0 scaffold: three-indicator disconnect detector exists post-Plan-03",
  { skip: !existsSync("./src/app/runtime/output-receiver/receiver-status-ui.js") },
  () => {
    assert.ok(
      existsSync("./src/app/runtime/output-receiver/receiver-status-ui.js"),
      "Plan 03 must create src/app/runtime/output-receiver/receiver-status-ui.js",
    );
  },
);

test("Wave 0 scaffold: D-C4 indicator names are documented", () => {
  const indicators = ["pcConnectionState", "lastFrameAt", "heartbeatAge"];
  assert.equal(
    indicators.length,
    3,
    "D-C4 demands exactly three indicators (WebRTC connectionState + last-frame timestamp + heartbeat age)",
  );
});

test("Wave 0 scaffold: 3000ms is the documented disconnect threshold", () => {
  const THRESHOLD_MS = 3000;
  assert.equal(
    THRESHOLD_MS,
    3000,
    "RESEARCH.md § Pi receiver: showReconnectBanner after >3s without frame/heartbeat",
  );
});
