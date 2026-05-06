// test/phase-32-fps-baseline.test.mjs
//
// Phase 32 — Baseline + post-patch proof tests.
// All 5 baselines pass at Wave-0 close asserting the pre-patch state.
// 32-01-T2 will rewrite baselines 2 + 3 to GREEN when schema lands.
// Baselines 4 + 5 are owned by 32-02 (Block B) — DO NOT TOUCH.
//
// Current state (after 32-01-T1):
//   Baseline 1: FPS_VALUES = [30, 24, 15]  — unchanged
//   Baseline 2: STREAM_FPS_CAP_VALUES absent — will flip GREEN in T2
//   Baseline 3: alignModeBoost absent       — will flip GREEN in T2
//   Baseline 4: MAX_RECONNECT_ATTEMPTS = 10 — owned by 32-02
//   Baseline 5: backoff formula caps 10000  — owned by 32-02

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

// ── Baseline 2: streamFpsCap absent pre-patch (will be rewritten by T2) ──

test("BASELINE: serverRendering schema lacks streamFpsCap field — Wave 1 will add", () => {
  // Wave 1 T2 will export STREAM_FPS_CAP_VALUES from ssr-server-rendering-config.mjs.
  // Pre-patch: that export does not exist.
  assert.equal(
    cfg.STREAM_FPS_CAP_VALUES,
    undefined,
    "STREAM_FPS_CAP_VALUES must NOT exist before Wave 1 T2 adds it",
  );
});

// ── Baseline 3: alignModeBoost absent pre-patch (will be rewritten by T2) ─

test("BASELINE: serverRendering schema lacks alignModeBoost field — Wave 1 will add", () => {
  // Wave 1 T2 will add alignModeBoost to the validator and defaults.
  // Pre-patch: SERVER_RENDERING_DEFAULTS() does NOT return alignModeBoost.
  const defaults = cfg.SERVER_RENDERING_DEFAULTS({ available: ["x264-software"] });
  assert.equal(
    defaults.alignModeBoost,
    undefined,
    "SERVER_RENDERING_DEFAULTS must NOT include alignModeBoost before Wave 1 T2",
  );
});

// ── Baseline 4: MAX_RECONNECT_ATTEMPTS = 10 pre-patch (owned by 32-02) ───

test("BASELINE: MAX_RECONNECT_ATTEMPTS exports value 10 — Wave 1 will remove the hard cap", () => {
  assert.equal(
    ui.MAX_RECONNECT_ATTEMPTS,
    10,
    "MAX_RECONNECT_ATTEMPTS must be 10 before Wave 1 converts to forever-retry",
  );
});

// ── Baseline 5: receiver-bootstrap backoff formula pre-patch (owned by 32-02)

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
