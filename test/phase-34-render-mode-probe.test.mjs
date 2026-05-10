// Phase 34 Wave 0 — Contract test for render-mode probe telemetry (Track A rails).
//
// D-01 requires: when an ssr-stats message arrives carrying a renderMode field,
// the server must emit a recognizable log line with that value. This provides
// ongoing evidence of whether the SSR tab is running GL or 2D-canvas.
//
// Current state (master): ssr-webrtc-signaling.mjs receives ssr-stats messages
// and stores them in state.ssrStats but does NOT call logger.info/log/warn with
// the renderMode value. This test is RED on master.
//
// Strategy: source-string regex on both ssr-webrtc-signaling.mjs and
// ssr-render-host.mjs combined. The test asserts that one of these files
// contains a logger call inside or gated on the ssr-stats handler that
// references renderMode.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SIGNALING_SRC = readFileSync("./src/server/ssr-webrtc-signaling.mjs", "utf8");
const RENDER_HOST_SRC = readFileSync("./src/server/ssr-render-host.mjs", "utf8");
const PUBLISHER_SRC = readFileSync("./src/server/ssr-stream-publisher.mjs", "utf8");

// Combined source for searching across both plausible log sinks.
const COMBINED_SERVER_SRC = SIGNALING_SRC + "\n" + RENDER_HOST_SRC;

// EXPECTED: RED on master, GREEN after 34-A
test("server logs ssr-stats renderMode for D-01 telemetry (post-34-A)", () => {
  // Post-34-A: the ssr-stats handler (in ssr-webrtc-signaling.mjs or
  // ssr-render-host.mjs) must contain a logger call that references renderMode.
  // Pattern: logger.info/log/warn called with renderMode in scope, inside or
  // shortly after the ssr-stats message processing block.
  //
  // The current signaling handler (line 447) stores ssrStats but never logs
  // renderMode. Track A must add: e.g.
  //   logger.info(`[ssr-signal] ssr-stats renderMode=${limited.renderMode ?? "?"}`);
  const loggerRenderModePattern = /logger\s*\.\s*(info|log|warn)\s*\([^)]*renderMode/s;
  const hasLogLine = loggerRenderModePattern.test(COMBINED_SERVER_SRC);
  assert.ok(
    hasLogLine,
    "Neither ssr-webrtc-signaling.mjs nor ssr-render-host.mjs contains a logger call " +
    "that references renderMode (pattern: logger.info/log/warn(...renderMode...)). " +
    "Track A (D-01) must add periodic renderMode logging to server stdout so the probe " +
    "is observable in server logs. Current master stores renderMode in state.ssrStats " +
    "but never emits a log line with its value.",
  );
});

// EXPECTED: GREEN on master (regression)
test("__ttBeamerEffectiveRenderMode is referenced in ssr-stream-publisher (regression)", () => {
  // ssr-stream-publisher.mjs already captures __ttBeamerEffectiveRenderMode()
  // inside the SSR tab (Phase 33 h18). This must stay intact through Phase 34
  // so that the renderMode is populated in the ssr-stats envelope that is
  // then received by the signaling handler.
  assert.ok(
    PUBLISHER_SRC.includes("__ttBeamerEffectiveRenderMode"),
    "ssr-stream-publisher.mjs must reference __ttBeamerEffectiveRenderMode " +
    "(Phase 33 h18 — source of renderMode value in ssr-stats envelope). " +
    "Track A must not remove this — it is the probe data source for D-01.",
  );
});
