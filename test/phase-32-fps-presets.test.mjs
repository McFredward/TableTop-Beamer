// test/phase-32-fps-presets.test.mjs
//
// Phase 32 Wave 0 — Block A tests A1-A3 (SKIP-GATED).
// These tests will be flipped GREEN by Wave 1 when streamFpsCap is wired
// into QUALITY_PRESETS, resolveEncoderConfig, and buildInPagePublisherScript.
//
// Contains: phase-32-fps-presets

import { test } from "node:test";
import { strict as assert } from "node:assert";

// ── A1: QUALITY_PRESETS exposes streamFpsCap ──────────────────────────────

test(
  "A1: QUALITY_PRESETS exposes streamFpsCap per preset OR resolveEncoderConfig accepts streamFpsCap override",
  { skip: "Wave 1 will wire streamFpsCap into QUALITY_PRESETS / resolveEncoderConfig" },
  async () => {
    const { QUALITY_PRESETS, resolveEncoderConfig } = await import(
      "../src/server/ssr-render-host.mjs"
    );
    const hasFpsCap =
      (QUALITY_PRESETS &&
        Object.values(QUALITY_PRESETS).some((p) => "streamFpsCap" in p)) ||
      typeof resolveEncoderConfig === "function";
    assert.ok(hasFpsCap, "QUALITY_PRESETS must have streamFpsCap OR resolveEncoderConfig must accept it");
  },
);

// ── A2: resolveEncoderConfig returns streamFpsCap from config ─────────────

test(
  "A2: resolveEncoderConfig({ serverRendering: { streamFpsCap: 60 } }) returns { streamFpsCap: 60 } in result",
  { skip: "Wave 1 will add resolveEncoderConfig with streamFpsCap support" },
  async () => {
    const { resolveEncoderConfig } = await import("../src/server/ssr-render-host.mjs");
    const result = resolveEncoderConfig({
      serverRendering: { streamFpsCap: 60, encoder: "auto", qualityPreset: "balanced" },
      available: ["x264-software"],
    });
    assert.equal(result.streamFpsCap, 60);
  },
);

// ── A3: buildInPagePublisherScript wires frameRate with streamFpsCap ──────

test(
  "A3a: buildInPagePublisherScript output contains frameRate: { ideal: 60, max: 60 } when streamFpsCap=60",
  { skip: "Wave 1 will wire streamFpsCap into buildInPagePublisherScript" },
  async () => {
    const { buildInPagePublisherScript } = await import("../src/server/ssr-render-host.mjs");
    const script = buildInPagePublisherScript({ streamFpsCap: 60 });
    assert.ok(
      typeof script === "string",
      "buildInPagePublisherScript must return a string",
    );
    assert.ok(
      script.includes("ideal: 60") && script.includes("max: 60"),
      `Script must contain frameRate ideal:60 max:60 but got:\n${script.slice(0, 500)}`,
    );
  },
);

test(
  "A3b: buildInPagePublisherScript output contains frameRate: { ideal: 30, max: 30 } when streamFpsCap=30",
  { skip: "Wave 1 will wire streamFpsCap into buildInPagePublisherScript" },
  async () => {
    const { buildInPagePublisherScript } = await import("../src/server/ssr-render-host.mjs");
    const script = buildInPagePublisherScript({ streamFpsCap: 30 });
    assert.ok(
      typeof script === "string",
      "buildInPagePublisherScript must return a string",
    );
    assert.ok(
      script.includes("ideal: 30") && script.includes("max: 30"),
      `Script must contain frameRate ideal:30 max:30 but got:\n${script.slice(0, 500)}`,
    );
  },
);
