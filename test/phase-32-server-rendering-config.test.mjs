// test/phase-32-server-rendering-config.test.mjs
//
// Phase 32 Wave 1 — Block A tests A4-A7 (GREEN — flipped from skip by 32-01-T2).
// Verifies STREAM_FPS_CAP_VALUES, streamFpsCap, and alignModeBoost added to
// ssr-server-rendering-config.mjs per Phase 32 D-A2/D-A3.
//
// Contains: phase-32-server-rendering-config

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { loadServerRenderingConfig } from "./helpers/phase-32-ssr-test-harness.mjs";

// ── A4: STREAM_FPS_CAP_VALUES enum ───────────────────────────────────────

test(
  "A4a: STREAM_FPS_CAP_VALUES export exists and equals [30, 45, 60, 0]",
  async () => {
    const cfg = await loadServerRenderingConfig();
    assert.deepEqual(
      cfg.STREAM_FPS_CAP_VALUES,
      [30, 45, 60, 0],
      "STREAM_FPS_CAP_VALUES must be [30, 45, 60, 0]",
    );
  },
);

test(
  "A4b: validateServerRenderingPatch({ streamFpsCap: 30 }) → valid",
  async () => {
    const { validateServerRenderingPatch } = await loadServerRenderingConfig();
    assert.deepEqual(
      validateServerRenderingPatch({ streamFpsCap: 30 }),
      { valid: true },
    );
  },
);

test(
  "A4c: validateServerRenderingPatch({ streamFpsCap: 45 }) → valid",
  async () => {
    const { validateServerRenderingPatch } = await loadServerRenderingConfig();
    assert.deepEqual(
      validateServerRenderingPatch({ streamFpsCap: 45 }),
      { valid: true },
    );
  },
);

test(
  "A4d: validateServerRenderingPatch({ streamFpsCap: 60 }) → valid",
  async () => {
    const { validateServerRenderingPatch } = await loadServerRenderingConfig();
    assert.deepEqual(
      validateServerRenderingPatch({ streamFpsCap: 60 }),
      { valid: true },
    );
  },
);

test(
  "A4e: validateServerRenderingPatch({ streamFpsCap: 0 }) → valid (0 = native/no cap)",
  async () => {
    const { validateServerRenderingPatch } = await loadServerRenderingConfig();
    assert.deepEqual(
      validateServerRenderingPatch({ streamFpsCap: 0 }),
      { valid: true },
    );
  },
);

test(
  "A4f: validateServerRenderingPatch({ streamFpsCap: 99 }) → invalid with reason streamFpsCap-not-in-enum",
  async () => {
    const { validateServerRenderingPatch } = await loadServerRenderingConfig();
    const r = validateServerRenderingPatch({ streamFpsCap: 99 });
    assert.equal(r.valid, false);
    assert.equal(r.reason, "streamFpsCap-not-in-enum");
  },
);

test(
  'A4g: validateServerRenderingPatch({ streamFpsCap: "60" }) → invalid with reason streamFpsCap-wrong-type',
  async () => {
    const { validateServerRenderingPatch } = await loadServerRenderingConfig();
    const r = validateServerRenderingPatch({ streamFpsCap: "60" });
    assert.equal(r.valid, false);
    assert.equal(r.reason, "streamFpsCap-wrong-type");
  },
);

// Phase 32 D-A2 alignModeBoost validators retired in Phase 40 — the
// publisher always runs at the configured streamFpsCap.

// ── A6: SERVER_RENDERING_DEFAULTS includes streamFpsCap ──────────────────

test(
  "A6: SERVER_RENDERING_DEFAULTS({ available: ['x264-software'] }) returns streamFpsCap: 60",
  async () => {
    const { SERVER_RENDERING_DEFAULTS } = await loadServerRenderingConfig();
    const defaults = SERVER_RENDERING_DEFAULTS({ available: ["x264-software"] });
    assert.equal(defaults.streamFpsCap, 60, "streamFpsCap must default to 60");
  },
);

// ── A7: applyServerRenderingPatch preserves streamFpsCap ─────────────────

test(
  "A7: applyServerRenderingPatch preserves streamFpsCap when other fields change",
  async () => {
    const { applyServerRenderingPatch } = await loadServerRenderingConfig();
    const current = {
      schema: "tt-beamer.global-defaults.v1",
      serverRendering: {
        encoder: "auto",
        qualityPreset: "balanced",
        resolutionPreference: "1080p",
        fpsTarget: 30,
        streamFpsCap: 60,
      },
    };
    const patched = applyServerRenderingPatch(current, { encoder: "vaapi" });
    assert.equal(patched.serverRendering.streamFpsCap, 60, "streamFpsCap must be preserved");
    assert.equal(patched.serverRendering.encoder, "vaapi", "encoder must be updated");
  },
);
