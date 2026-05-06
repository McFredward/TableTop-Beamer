// test/phase-32-fps-baseline.test.mjs
//
// Phase 32 — Baseline + post-patch proof tests.
// Baselines 2+3 rewritten GREEN by 32-01-T2 (schema landed).
// Baselines 4+5 rewritten GREEN by 32-02-T2 (Block B backoff patched).
//
// State after 32-02-T2:
//   Baseline 1: FPS_VALUES = [30, 24, 15]            — unchanged (legacy compat)
//   Baseline 2: STREAM_FPS_CAP_VALUES = [30,45,60,0] — GREEN post-patch (32-01)
//   Baseline 3: alignModeBoost = true in defaults     — GREEN post-patch (32-01)
//   Baseline 4: MAX_RECONNECT_ATTEMPTS REMOVED        — GREEN post-patch (32-02)
//   Baseline 5: RECONNECT_BACKOFF_MS = [1000,...,30000] — GREEN post-patch (32-02)

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

// ── Baseline 4: MAX_RECONNECT_ATTEMPTS REMOVED (owned by 32-02) ───────────
// Rewritten by 32-02-T2: assert the export is GONE (not = 10 as at Wave 0).

test("POST-PATCH: MAX_RECONNECT_ATTEMPTS export is REMOVED from receiver-status-ui.js (32-02 Block B)", async () => {
  const m = await import("../src/app/runtime/output-receiver/receiver-status-ui.js");
  assert.equal(
    typeof m.MAX_RECONNECT_ATTEMPTS,
    "undefined",
    "MAX_RECONNECT_ATTEMPTS export must be removed in Phase 32 Block B (32-02-T2)",
  );
});

// ── Baseline 5: RECONNECT_BACKOFF_MS schedule (owned by 32-02) ─────────────
// Rewritten by 32-02-T2: assert RECONNECT_BACKOFF_MS is exported with D-B2 values.

test("POST-PATCH: RECONNECT_BACKOFF_MS = [1000, 2000, 5000, 10000, 30000] (32-02 Block B D-B2)", async () => {
  const m = await import("../src/app/runtime/output-receiver/receiver-status-ui.js");
  assert.deepEqual(
    m.RECONNECT_BACKOFF_MS,
    [1000, 2000, 5000, 10000, 30000],
    "Backoff schedule must match D-B2 [1000, 2000, 5000, 10000, 30000]",
  );
});
