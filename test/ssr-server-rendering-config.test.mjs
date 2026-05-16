// serverRendering config schema tests.
//
// Covers the validator + read/write helpers for
// config/global-defaults.json#serverRendering.
//
// Phase 40 (2026-05-15): audioRoute + alignModeBoost were retired from
// the schema; the validator now covers four enum keys (encoder,
// qualityPreset, resolutionPreference, fpsTarget) plus streamFpsCap.
//
// All tests use mkdtempSync isolated tmp dirs — never touch the real
// config/global-defaults.json.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ENCODER_VALUES,
  QUALITY_PRESET_VALUES,
  RESOLUTION_VALUES,
  FPS_VALUES,
  STREAM_FPS_CAP_VALUES,
  SERVER_RENDERING_DEFAULTS,
  validateServerRenderingPatch,
  applyServerRenderingPatch,
  readServerRenderingConfig,
  readFullConfig,
  writeFullConfig,
} from "../src/server/ssr-server-rendering-config.mjs";

function makeTmp() {
  const root = mkdtempSync(path.join(tmpdir(), "ttbeamer-srcfg-"));
  return { rootDir: root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

// ── Enum sanity ──────────────────────────────────────────────────────────

test("cfg: enum value lists match spec", () => {
  assert.deepEqual(ENCODER_VALUES, ["auto", "nvenc", "vaapi", "videotoolbox", "x264-software"]);
  assert.deepEqual(QUALITY_PRESET_VALUES, ["low-latency", "balanced", "high-quality", "extra-high", "ultra-high"]);
  assert.deepEqual(RESOLUTION_VALUES, ["auto", "1080p", "720p"]);
  assert.deepEqual(FPS_VALUES, [30, 24, 15]);
  assert.deepEqual(STREAM_FPS_CAP_VALUES, [30, 45, 60, 0]);
});

// ── encoder validation ─────────────────────────────────────────────────

test("cfg: validate encoder=auto → valid", () => {
  assert.deepEqual(validateServerRenderingPatch({ encoder: "auto" }), { valid: true });
});

test("cfg: validate encoder=x264-software → valid", () => {
  assert.deepEqual(validateServerRenderingPatch({ encoder: "x264-software" }), { valid: true });
});

test("cfg: validate encoder=intel-magic → invalid", () => {
  assert.deepEqual(validateServerRenderingPatch({ encoder: "intel-magic" }), { valid: false, reason: "encoder-not-in-enum" });
});

// ── qualityPreset validation ───────────────────────────────────────────

test("cfg: validate qualityPreset=balanced → valid", () => {
  assert.deepEqual(validateServerRenderingPatch({ qualityPreset: "balanced" }), { valid: true });
});

test("cfg: validate qualityPreset=super-fast → invalid", () => {
  assert.deepEqual(validateServerRenderingPatch({ qualityPreset: "super-fast" }), { valid: false, reason: "qualityPreset-not-in-enum" });
});

// ── resolutionPreference validation ────────────────────────────────────

test("cfg: validate resolutionPreference=auto → valid", () => {
  assert.deepEqual(validateServerRenderingPatch({ resolutionPreference: "auto" }), { valid: true });
});

test("cfg: validate resolutionPreference=4k → invalid", () => {
  assert.deepEqual(validateServerRenderingPatch({ resolutionPreference: "4k" }), { valid: false, reason: "resolutionPreference-not-in-enum" });
});

// ── fpsTarget validation ───────────────────────────────────────────────

test("cfg: validate fpsTarget=30 → valid", () => {
  assert.deepEqual(validateServerRenderingPatch({ fpsTarget: 30 }), { valid: true });
});

test("cfg: validate fpsTarget=60 → invalid", () => {
  assert.deepEqual(validateServerRenderingPatch({ fpsTarget: 60 }), { valid: false, reason: "fpsTarget-not-in-enum" });
});

test("cfg: validate fpsTarget='30' (string) → invalid (wrong-type)", () => {
  const r = validateServerRenderingPatch({ fpsTarget: "30" });
  assert.equal(r.valid, false);
  assert.match(r.reason, /fpsTarget-/);
});

// ── streamFpsCap validation ────────────────────────────────────────────

test("cfg: validate streamFpsCap=60 → valid", () => {
  assert.deepEqual(validateServerRenderingPatch({ streamFpsCap: 60 }), { valid: true });
});

test("cfg: validate streamFpsCap=0 (native) → valid", () => {
  assert.deepEqual(validateServerRenderingPatch({ streamFpsCap: 0 }), { valid: true });
});

test("cfg: validate streamFpsCap=120 → invalid", () => {
  assert.deepEqual(validateServerRenderingPatch({ streamFpsCap: 120 }), { valid: false, reason: "streamFpsCap-not-in-enum" });
});

// ── multi-key + empty patch ────────────────────────────────────────────

test("cfg: validate full patch → valid", () => {
  const r = validateServerRenderingPatch({
    encoder: "vaapi",
    qualityPreset: "balanced",
    resolutionPreference: "1080p",
    fpsTarget: 30,
    streamFpsCap: 60,
  });
  assert.deepEqual(r, { valid: true });
});

test("cfg: validate empty patch → valid (partial-update support)", () => {
  assert.deepEqual(validateServerRenderingPatch({}), { valid: true });
});

// ── applyServerRenderingPatch ignores unknowns ─────────────────────────

test("cfg: applyServerRenderingPatch deep-merges known keys; unknown ignored", () => {
  const current = {
    schema: "tt-beamer.global-defaults.v1",
    audio: { enabled: true, volume: 1 },
    serverRendering: {
      encoder: "auto",
      qualityPreset: "balanced",
      resolutionPreference: "1080p",
      fpsTarget: 30,
      streamFpsCap: 60,
    },
  };
  const patch = {
    encoder: "vaapi", // known → applied
    fpsTarget: 24,    // known → applied
    foo: "bar",       // unknown → ignored
    nested: { drift: true }, // unknown → ignored
    audioRoute: "in-stream", // retired → ignored
    alignModeBoost: true,    // retired → ignored
  };
  const next = applyServerRenderingPatch(current, patch);
  assert.equal(next.serverRendering.encoder, "vaapi");
  assert.equal(next.serverRendering.fpsTarget, 24);
  assert.equal(next.serverRendering.qualityPreset, "balanced");
  assert.equal(next.serverRendering.resolutionPreference, "1080p");
  assert.equal(next.serverRendering.streamFpsCap, 60);
  // Retired and unknown keys NOT injected
  assert.equal(next.serverRendering.audioRoute, undefined);
  assert.equal(next.serverRendering.alignModeBoost, undefined);
  assert.equal(next.foo, undefined);
  assert.equal(next.serverRendering.foo, undefined);
  assert.equal(next.serverRendering.nested, undefined);
  // Top-level keys outside serverRendering preserved
  assert.equal(next.schema, "tt-beamer.global-defaults.v1");
  assert.deepEqual(next.audio, { enabled: true, volume: 1 });
});

// ── round-trip — write + reload preserves all fields ───────────────────

test("cfg: round-trip preserves all fields after write+reload", async () => {
  const { rootDir, cleanup } = makeTmp();
  try {
    // Empty cfg in a fresh tmp dir → defaults (Phase 43 set extra-high
    // / 1080p / 60-fps cap regardless of detected encoder list).
    const initial = await readServerRenderingConfig({
      rootDir,
      available: ["nvenc", "vaapi", "x264-software"],
    });
    assert.equal(initial.qualityPreset, "extra-high");
    assert.equal(initial.resolutionPreference, "1080p");
    assert.equal(initial.streamFpsCap, 60);

    const patch = {
      encoder: "vaapi",
      qualityPreset: "high-quality",
      resolutionPreference: "720p",
      fpsTarget: 24,
      streamFpsCap: 30,
    };
    assert.equal(validateServerRenderingPatch(patch).valid, true);

    const current = await readFullConfig({ rootDir });
    const next = applyServerRenderingPatch(current, patch);
    await writeFullConfig({ rootDir, fullConfig: next });

    const reloaded = await readServerRenderingConfig({ rootDir });
    assert.equal(reloaded.encoder, "vaapi");
    assert.equal(reloaded.qualityPreset, "high-quality");
    assert.equal(reloaded.resolutionPreference, "720p");
    assert.equal(reloaded.fpsTarget, 24);
    assert.equal(reloaded.streamFpsCap, 30);
  } finally {
    cleanup();
  }
});

// ── HW-aware defaults factory ──────────────────────────────────────────

test("cfg: SERVER_RENDERING_DEFAULTS returns extra-high / 1080p / 60 regardless of encoder list (Phase 43)", () => {
  for (const available of [["nvenc", "vaapi", "x264-software"], ["x264-software"], []]) {
    const d = SERVER_RENDERING_DEFAULTS({ available });
    assert.equal(d.encoder, "auto");
    assert.equal(d.qualityPreset, "extra-high");
    assert.equal(d.resolutionPreference, "1080p");
    assert.equal(d.fpsTarget, 30);
    assert.equal(d.streamFpsCap, 60);
  }
});

// ── Reject patch-not-object ────────────────────────────────────────────

test("cfg: validate non-object patch → invalid", () => {
  assert.equal(validateServerRenderingPatch(null).valid, false);
  assert.equal(validateServerRenderingPatch("foo").valid, false);
  assert.equal(validateServerRenderingPatch([1, 2]).valid, false);
});
