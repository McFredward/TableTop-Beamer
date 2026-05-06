// Phase 31 Plan 04 — serverRendering config schema tests.
//
// Covers all 17 required behaviors:
//   1-13: validateServerRenderingPatch enum + type rejection matrix
//   14:   strict-number type for fpsTarget (string "30" rejected)
//   15:   applyServerRenderingPatch ignores unknown keys silently
//   16:   round-trip — applyServerRenderingPatch → writeFullConfig →
//         readServerRenderingConfig returns the patched values for ALL FIVE
//   17:   SERVER_RENDERING_DEFAULTS picks "balanced" with HW encoder,
//         "low-latency" software-only
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
  AUDIO_ROUTE_VALUES,
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

test("Plan 04 cfg: enum value lists match spec", () => {
  assert.deepEqual(ENCODER_VALUES, ["auto", "nvenc", "vaapi", "videotoolbox", "x264-software"]);
  assert.deepEqual(QUALITY_PRESET_VALUES, ["low-latency", "balanced", "high-quality"]);
  assert.deepEqual(RESOLUTION_VALUES, ["auto", "1080p", "720p"]);
  assert.deepEqual(FPS_VALUES, [30, 24, 15]);
  // D-D2 reversal: enum stays ["in-stream", "pi-local"] — both accepted,
  // in-stream is currently a no-op until audio capture is wired.
  assert.deepEqual(AUDIO_ROUTE_VALUES, ["in-stream", "pi-local"]);
});

// ── Behavior 1-3: encoder validation ────────────────────────────────────

test("Plan 04 cfg #1: validate encoder=auto → valid", () => {
  assert.deepEqual(validateServerRenderingPatch({ encoder: "auto" }), { valid: true });
});

test("Plan 04 cfg #2: validate encoder=x264-software → valid", () => {
  assert.deepEqual(validateServerRenderingPatch({ encoder: "x264-software" }), { valid: true });
});

test("Plan 04 cfg #3: validate encoder=intel-magic → invalid", () => {
  assert.deepEqual(validateServerRenderingPatch({ encoder: "intel-magic" }), { valid: false, reason: "encoder-not-in-enum" });
});

// ── Behavior 4-5: qualityPreset validation ─────────────────────────────

test("Plan 04 cfg #4: validate qualityPreset=balanced → valid", () => {
  assert.deepEqual(validateServerRenderingPatch({ qualityPreset: "balanced" }), { valid: true });
});

test("Plan 04 cfg #5: validate qualityPreset=super-fast → invalid", () => {
  assert.deepEqual(validateServerRenderingPatch({ qualityPreset: "super-fast" }), { valid: false, reason: "qualityPreset-not-in-enum" });
});

// ── Behavior 6-7: resolutionPreference validation ──────────────────────

test("Plan 04 cfg #6: validate resolutionPreference=auto → valid", () => {
  assert.deepEqual(validateServerRenderingPatch({ resolutionPreference: "auto" }), { valid: true });
});

test("Plan 04 cfg #7: validate resolutionPreference=4k → invalid", () => {
  assert.deepEqual(validateServerRenderingPatch({ resolutionPreference: "4k" }), { valid: false, reason: "resolutionPreference-not-in-enum" });
});

// ── Behavior 8-9: fpsTarget validation ─────────────────────────────────

test("Plan 04 cfg #8: validate fpsTarget=30 → valid", () => {
  assert.deepEqual(validateServerRenderingPatch({ fpsTarget: 30 }), { valid: true });
});

test("Plan 04 cfg #9: validate fpsTarget=60 → invalid", () => {
  assert.deepEqual(validateServerRenderingPatch({ fpsTarget: 60 }), { valid: false, reason: "fpsTarget-not-in-enum" });
});

// ── Behavior 10-11: audioRoute validation ──────────────────────────────

test("Plan 04 cfg #10: validate audioRoute=in-stream → valid (deferred but enum-accepted)", () => {
  assert.deepEqual(validateServerRenderingPatch({ audioRoute: "in-stream" }), { valid: true });
});

test("Plan 04 cfg #11: validate audioRoute=random → invalid", () => {
  assert.deepEqual(validateServerRenderingPatch({ audioRoute: "random" }), { valid: false, reason: "audioRoute-not-in-enum" });
});

// ── Behavior 12-13: multi-key + empty patch ────────────────────────────

test("Plan 04 cfg #12: validate full 5-key patch → valid", () => {
  const r = validateServerRenderingPatch({
    encoder: "vaapi",
    qualityPreset: "balanced",
    resolutionPreference: "1080p",
    fpsTarget: 30,
    audioRoute: "in-stream",
  });
  assert.deepEqual(r, { valid: true });
});

test("Plan 04 cfg #13: validate empty patch → valid (partial-update support)", () => {
  assert.deepEqual(validateServerRenderingPatch({}), { valid: true });
});

// ── Behavior 14: strict-number fpsTarget ───────────────────────────────

test("Plan 04 cfg #14: validate fpsTarget='30' (string) → invalid (wrong-type)", () => {
  const r = validateServerRenderingPatch({ fpsTarget: "30" });
  assert.equal(r.valid, false);
  assert.match(r.reason, /fpsTarget-/);
});

// ── Behavior 15: applyServerRenderingPatch ignores unknowns ────────────

test("Plan 04 cfg #15: applyServerRenderingPatch deep-merges 5 keys; unknown ignored", () => {
  const current = {
    schema: "tt-beamer.global-defaults.v1",
    audio: { enabled: true, volume: 1 },
    serverRendering: {
      encoder: "auto",
      qualityPreset: "balanced",
      resolutionPreference: "1080p",
      fpsTarget: 30,
      audioRoute: "pi-local",
    },
  };
  const patch = {
    encoder: "vaapi", // known → applied
    fpsTarget: 24,    // known → applied
    foo: "bar",       // unknown → ignored
    nested: { drift: true }, // unknown → ignored
  };
  const next = applyServerRenderingPatch(current, patch);
  assert.equal(next.serverRendering.encoder, "vaapi");
  assert.equal(next.serverRendering.fpsTarget, 24);
  assert.equal(next.serverRendering.qualityPreset, "balanced"); // untouched
  assert.equal(next.serverRendering.resolutionPreference, "1080p");
  assert.equal(next.serverRendering.audioRoute, "pi-local");
  // Unknown keys NOT injected at top level OR inside serverRendering
  assert.equal(next.foo, undefined);
  assert.equal(next.serverRendering.foo, undefined);
  assert.equal(next.serverRendering.nested, undefined);
  // Top-level keys outside serverRendering preserved
  assert.equal(next.schema, "tt-beamer.global-defaults.v1");
  assert.deepEqual(next.audio, { enabled: true, volume: 1 });
});

// ── Behavior 16: round-trip — write + reload preserves ALL FIVE ────────

test("Plan 04 cfg #16: round-trip preserves all 5 fields after write+reload", async () => {
  const { rootDir, cleanup } = makeTmp();
  try {
    // Empty cfg in a fresh tmp dir → readServerRenderingConfig returns
    // HW-aware defaults (NVENC/VAAPI present → "balanced").
    const initial = await readServerRenderingConfig({
      rootDir,
      available: ["nvenc", "vaapi", "x264-software"],
    });
    assert.equal(initial.qualityPreset, "balanced");
    assert.equal(initial.resolutionPreference, "1080p");
    assert.equal(initial.audioRoute, "pi-local"); // D-D2 reversal default

    // Apply a 5-key patch through the full pipeline.
    const patch = {
      encoder: "vaapi",
      qualityPreset: "high-quality",
      resolutionPreference: "720p",
      fpsTarget: 24,
      audioRoute: "in-stream",
    };
    assert.equal(validateServerRenderingPatch(patch).valid, true);

    const current = await readFullConfig({ rootDir });
    const next = applyServerRenderingPatch(current, patch);
    await writeFullConfig({ rootDir, fullConfig: next });

    // Reload and assert ALL FIVE fields match.
    const reloaded = await readServerRenderingConfig({ rootDir });
    assert.equal(reloaded.encoder, "vaapi");
    assert.equal(reloaded.qualityPreset, "high-quality");
    assert.equal(reloaded.resolutionPreference, "720p");
    assert.equal(reloaded.fpsTarget, 24);
    assert.equal(reloaded.audioRoute, "in-stream");
  } finally {
    cleanup();
  }
});

// ── Behavior 17: HW-aware defaults factory ─────────────────────────────

test("Plan 04 cfg #17: SERVER_RENDERING_DEFAULTS is HW-aware (HW present → balanced/1080p; software-only → low-latency/720p)", () => {
  const hw = SERVER_RENDERING_DEFAULTS({ available: ["nvenc", "vaapi", "x264-software"] });
  assert.equal(hw.qualityPreset, "balanced");
  assert.equal(hw.resolutionPreference, "1080p");
  assert.equal(hw.audioRoute, "pi-local");

  const sw = SERVER_RENDERING_DEFAULTS({ available: ["x264-software"] });
  assert.equal(sw.qualityPreset, "low-latency");
  assert.equal(sw.resolutionPreference, "720p");
  assert.equal(sw.audioRoute, "pi-local");

  const empty = SERVER_RENDERING_DEFAULTS({});
  assert.equal(empty.qualityPreset, "low-latency");
});

// ── Reject patch-not-object ────────────────────────────────────────────

test("Plan 04 cfg: validate non-object patch → invalid", () => {
  assert.equal(validateServerRenderingPatch(null).valid, false);
  assert.equal(validateServerRenderingPatch("foo").valid, false);
  assert.equal(validateServerRenderingPatch([1, 2]).valid, false);
});
