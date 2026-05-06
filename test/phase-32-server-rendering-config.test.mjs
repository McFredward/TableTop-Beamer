// test/phase-32-server-rendering-config.test.mjs
//
// Phase 32 Wave 0 — Block A tests A4-A7 (SKIP-GATED).
// These tests will be flipped GREEN by Wave 1 when STREAM_FPS_CAP_VALUES,
// streamFpsCap, and alignModeBoost are added to ssr-server-rendering-config.mjs.
//
// Contains: phase-32-server-rendering-config

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { loadServerRenderingConfig } from "./helpers/phase-32-ssr-test-harness.mjs";

// ── A4: STREAM_FPS_CAP_VALUES enum ───────────────────────────────────────

test(
  "A4a: STREAM_FPS_CAP_VALUES export exists and equals [30, 45, 60, 0]",
  { skip: "Wave 1 will add STREAM_FPS_CAP_VALUES to ssr-server-rendering-config.mjs" },
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
  { skip: "Wave 1 will add streamFpsCap to validateServerRenderingPatch" },
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
  { skip: "Wave 1 will add streamFpsCap to validateServerRenderingPatch" },
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
  { skip: "Wave 1 will add streamFpsCap to validateServerRenderingPatch" },
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
  { skip: "Wave 1 will add streamFpsCap to validateServerRenderingPatch" },
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
  { skip: "Wave 1 will add streamFpsCap to validateServerRenderingPatch" },
  async () => {
    const { validateServerRenderingPatch } = await loadServerRenderingConfig();
    const r = validateServerRenderingPatch({ streamFpsCap: 99 });
    assert.equal(r.valid, false);
    assert.equal(r.reason, "streamFpsCap-not-in-enum");
  },
);

test(
  'A4g: validateServerRenderingPatch({ streamFpsCap: "60" }) → invalid with reason streamFpsCap-wrong-type',
  { skip: "Wave 1 will add streamFpsCap to validateServerRenderingPatch" },
  async () => {
    const { validateServerRenderingPatch } = await loadServerRenderingConfig();
    const r = validateServerRenderingPatch({ streamFpsCap: "60" });
    assert.equal(r.valid, false);
    assert.equal(r.reason, "streamFpsCap-wrong-type");
  },
);

// ── A5: alignModeBoost validation ─────────────────────────────────────────

test(
  "A5a: validateServerRenderingPatch({ alignModeBoost: true }) → valid",
  { skip: "Wave 1 will add alignModeBoost to validateServerRenderingPatch" },
  async () => {
    const { validateServerRenderingPatch } = await loadServerRenderingConfig();
    assert.deepEqual(
      validateServerRenderingPatch({ alignModeBoost: true }),
      { valid: true },
    );
  },
);

test(
  "A5b: validateServerRenderingPatch({ alignModeBoost: false }) → valid",
  { skip: "Wave 1 will add alignModeBoost to validateServerRenderingPatch" },
  async () => {
    const { validateServerRenderingPatch } = await loadServerRenderingConfig();
    assert.deepEqual(
      validateServerRenderingPatch({ alignModeBoost: false }),
      { valid: true },
    );
  },
);

test(
  'A5c: validateServerRenderingPatch({ alignModeBoost: "yes" }) → invalid with reason alignModeBoost-wrong-type',
  { skip: "Wave 1 will add alignModeBoost to validateServerRenderingPatch" },
  async () => {
    const { validateServerRenderingPatch } = await loadServerRenderingConfig();
    const r = validateServerRenderingPatch({ alignModeBoost: "yes" });
    assert.equal(r.valid, false);
    assert.equal(r.reason, "alignModeBoost-wrong-type");
  },
);

// ── A6: SERVER_RENDERING_DEFAULTS includes new fields ────────────────────

test(
  "A6: SERVER_RENDERING_DEFAULTS({ available: ['x264-software'] }) returns streamFpsCap: 60 and alignModeBoost: true",
  { skip: "Wave 1 will add streamFpsCap and alignModeBoost to SERVER_RENDERING_DEFAULTS" },
  async () => {
    const { SERVER_RENDERING_DEFAULTS } = await loadServerRenderingConfig();
    const defaults = SERVER_RENDERING_DEFAULTS({ available: ["x264-software"] });
    assert.equal(defaults.streamFpsCap, 60, "streamFpsCap must default to 60");
    assert.equal(defaults.alignModeBoost, true, "alignModeBoost must default to true");
  },
);

// ── A7: applyServerRenderingPatch preserves new fields ───────────────────

test(
  "A7: applyServerRenderingPatch preserves streamFpsCap and alignModeBoost when other fields change",
  { skip: "Wave 1 will add streamFpsCap and alignModeBoost to KNOWN_KEYS" },
  async () => {
    const { applyServerRenderingPatch } = await loadServerRenderingConfig();
    const current = {
      schema: "tt-beamer.global-defaults.v1",
      serverRendering: {
        encoder: "auto",
        qualityPreset: "balanced",
        resolutionPreference: "1080p",
        fpsTarget: 30,
        audioRoute: "pi-local",
        streamFpsCap: 60,
        alignModeBoost: true,
      },
    };
    const patched = applyServerRenderingPatch(current, { encoder: "vaapi" });
    assert.equal(patched.serverRendering.streamFpsCap, 60, "streamFpsCap must be preserved");
    assert.equal(patched.serverRendering.alignModeBoost, true, "alignModeBoost must be preserved");
    assert.equal(patched.serverRendering.encoder, "vaapi", "encoder must be updated");
  },
);
