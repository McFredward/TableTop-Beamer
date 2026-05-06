// test/phase-32-fps-baseline.test.mjs
//
// Phase 32 — Baseline + post-patch proof tests.
// Baselines 2+3 rewritten GREEN by 32-01-T2 (schema landed).
// Baselines 4+5 owned by 32-02 (Block B) — DO NOT TOUCH.
//
// State after 32-01-T2:
//   Baseline 1: FPS_VALUES = [30, 24, 15]            — unchanged (legacy compat)
//   Baseline 2: STREAM_FPS_CAP_VALUES = [30,45,60,0] — GREEN post-patch
//   Baseline 3: alignModeBoost = true in defaults     — GREEN post-patch
//   Baseline 4: MAX_RECONNECT_ATTEMPTS = 10           — owned by 32-02
//   Baseline 5: backoff formula caps at 10000ms       — owned by 32-02

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { loadServerRenderingConfig, loadStatusUi } from "./helpers/phase-32-ssr-test-harness.mjs";

const cfg = await loadServerRenderingConfig();
const ui = await loadStatusUi();

// ── Baseline 1: FPS_VALUES unchanged (legacy compat) ─────────────────────

test("BASELINE: FPS_VALUES is [30, 24, 15] — kept for backward compat (fpsTarget field)", () => {
  assert.deepEqual(
    cfg.FPS_VALUES,
    [30, 24, 15],
    "FPS_VALUES must remain [30,24,15] — legacy fpsTarget field preserved per Research Pitfall 5",
  );
});

// ── Baseline 2: streamFpsCap GREEN post-patch (rewritten by 32-01-T2) ────

test("POST-PATCH: STREAM_FPS_CAP_VALUES = [30, 45, 60, 0] (Phase 32 D-A3)", () => {
  assert.deepEqual(
    cfg.STREAM_FPS_CAP_VALUES,
    [30, 45, 60, 0],
    "STREAM_FPS_CAP_VALUES must be [30, 45, 60, 0] after 32-01-T2",
  );
});

// ── Baseline 3: alignModeBoost GREEN post-patch (rewritten by 32-01-T2) ──

test("POST-PATCH: SERVER_RENDERING_DEFAULTS includes alignModeBoost: true (Phase 32 D-A2)", () => {
  const defaults = cfg.SERVER_RENDERING_DEFAULTS({ available: ["x264-software"] });
  assert.equal(
    defaults.alignModeBoost,
    true,
    "SERVER_RENDERING_DEFAULTS must include alignModeBoost: true after 32-01-T2",
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
  assert.ok(
    src.includes("Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000)"),
    "receiver-bootstrap.js must contain the old backoff formula before Wave 1 replaces it",
  );
});
