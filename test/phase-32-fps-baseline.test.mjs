// test/phase-32-fps-baseline.test.mjs
//
// Phase 32 Wave 0 — RED-proof baseline. Records pre-patch values so that
// Wave 1 outcomes are provable. ALL tests in this file MUST PASS at Wave-0
// close — they assert the CURRENT (pre-fix) state. Wave 1 tasks will
// update these assertions when they flip values.
//
// Baseline contract (Wave 0):
//   FPS_VALUES = [30, 24, 15]   — NO 45, 60, or 0 yet
//   serverRendering schema lacks streamFpsCap  — Wave 1 will add
//   serverRendering schema lacks alignModeBoost — Wave 1 will add
//   MAX_RECONNECT_ATTEMPTS = 10 — Wave 1 will remove the hard cap
//   backoff formula caps at 10000ms — Wave 1 will replace with 30000ms

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { loadServerRenderingConfig, loadStatusUi } from "./helpers/phase-32-ssr-test-harness.mjs";

const cfg = await loadServerRenderingConfig();
const ui = await loadStatusUi();

// ── Baseline 1: FPS_VALUES pre-patch ─────────────────────────────────────

test("BASELINE: FPS_VALUES is currently [30, 24, 15] — Wave 1 will extend to include 45, 60, 0", () => {
  assert.deepEqual(
    cfg.FPS_VALUES,
    [30, 24, 15],
    "FPS_VALUES must be [30,24,15] before Wave 1 patch — this is the RED proof",
  );
});

// ── Baseline 2: streamFpsCap absent pre-patch ─────────────────────────────

test("BASELINE: serverRendering schema lacks streamFpsCap field — Wave 1 will add", () => {
  // Wave 1 will export STREAM_FPS_CAP_VALUES from ssr-server-rendering-config.mjs.
  // Pre-patch: that export does not exist.
  assert.equal(
    cfg.STREAM_FPS_CAP_VALUES,
    undefined,
    "STREAM_FPS_CAP_VALUES must NOT exist before Wave 1 adds it",
  );
});

// ── Baseline 3: alignModeBoost absent pre-patch ───────────────────────────

test("BASELINE: serverRendering schema lacks alignModeBoost field — Wave 1 will add", () => {
  // Wave 1 will add alignModeBoost to the validator and defaults.
  // Pre-patch: validateServerRenderingPatch accepts the KNOWN_KEYS set which
  // does NOT include alignModeBoost, so it is silently ignored (not validated).
  // We verify indirectly: SERVER_RENDERING_DEFAULTS() does NOT return alignModeBoost.
  const defaults = cfg.SERVER_RENDERING_DEFAULTS({ available: ["x264-software"] });
  assert.equal(
    defaults.alignModeBoost,
    undefined,
    "SERVER_RENDERING_DEFAULTS must NOT include alignModeBoost before Wave 1",
  );
});

// ── Baseline 4: MAX_RECONNECT_ATTEMPTS = 10 pre-patch ────────────────────

test("BASELINE: MAX_RECONNECT_ATTEMPTS exports value 10 — Wave 1 will remove the hard cap", () => {
  assert.equal(
    ui.MAX_RECONNECT_ATTEMPTS,
    10,
    "MAX_RECONNECT_ATTEMPTS must be 10 before Wave 1 converts to forever-retry",
  );
});

// ── Baseline 5: receiver-bootstrap backoff formula pre-patch ─────────────

test("BASELINE: receiver-bootstrap backoff formula caps at 10000ms — Wave 1 will replace with 30000ms schedule", () => {
  const src = readFileSync(
    new URL(
      "../src/app/runtime/output-receiver/receiver-bootstrap.js",
      import.meta.url,
    ),
    "utf8",
  );
  // The current formula: Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000)
  assert.ok(
    src.includes("Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000)"),
    "receiver-bootstrap.js must contain the old backoff formula before Wave 1 replaces it",
  );
});
