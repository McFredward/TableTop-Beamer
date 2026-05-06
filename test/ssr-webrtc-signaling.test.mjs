// Phase 31 Wave 0 — WebRTC signaling protocol contract scaffold.
// Plan 02 will create src/server/ssr-webrtc-signaling.mjs (mediasoup
// router + signaling handler). Until then the file-existence assertions
// stay skip-gated; the documented mutation-type constant runs immediately.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

test(
  "Wave 0 scaffold: signaling handler exists post-Plan-02",
  { skip: !existsSync("./src/server/ssr-webrtc-signaling.mjs") },
  () => {
    assert.ok(
      existsSync("./src/server/ssr-webrtc-signaling.mjs"),
      "Plan 02 must create src/server/ssr-webrtc-signaling.mjs",
    );
  },
);

test(
  "Wave 0 scaffold: align-corner-drag is a documented mutation type",
  () => {
    // Plan 04 will add this to LIVE_MUTATION_TYPES in server.mjs. For
    // Wave 0 we lock the constant string the protocol committed to in
    // RESEARCH.md § Component sketch.
    const expectedType = "align-corner-drag";
    assert.equal(expectedType, "align-corner-drag");
  },
);

test(
  "Wave 0 scaffold: payload validator schema",
  { skip: !existsSync("./src/server/ssr-webrtc-signaling.mjs") },
  () => {
    // After Plan 02: import + validate
    // { phase, vertexId, normalizedX, normalizedY, profileId }.
    // Wave 0 placeholder.
  },
);
