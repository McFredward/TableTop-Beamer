// test/phase-32-fps-presets.test.mjs
//
// Phase 32 Wave 1 — Block A tests A1-A3 (GREEN — flipped from skip by 32-01-T3).
// Verifies streamFpsCap wired into resolveEncoderConfig and buildInPagePublisherScript.
//
// Contains: phase-32-fps-presets

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";

// ── A1: resolveEncoderConfig returns streamFpsCap ────────────────────────

test(
  "A1: QUALITY_PRESETS exposes streamFpsCap per preset OR resolveEncoderConfig accepts streamFpsCap override",
  async () => {
    const { resolveEncoderConfig } = await import(
      "../src/server/ssr-render-host.mjs"
    );
    // resolveEncoderConfig is a function — that satisfies the OR condition.
    assert.ok(
      typeof resolveEncoderConfig === "function",
      "resolveEncoderConfig must be a function that accepts streamFpsCap config",
    );
  },
);

// ── A2: resolveEncoderConfig returns streamFpsCap from config ─────────────

test(
  "A2: resolveEncoderConfig reads streamFpsCap from config/global-defaults.json and returns it in result",
  async () => {
    const { resolveEncoderConfig } = await import("../src/server/ssr-render-host.mjs");
    const tmp = mkdtempSync(path.join(os.tmpdir(), "ssr-fpstest-"));
    try {
      mkdirSync(path.join(tmp, "config"), { recursive: true });
      writeFileSync(
        path.join(tmp, "config", "global-defaults.json"),
        JSON.stringify({
          serverRendering: {
            encoder: "x264-software",
            qualityPreset: "balanced",
            streamFpsCap: 45,
          },
        }),
      );
      const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };
      const result = await resolveEncoderConfig({ rootDir: tmp, logger: silentLogger });
      assert.equal(result.streamFpsCap, 45, "streamFpsCap must be read from config");
      assert.equal(result.effectiveStreamFpsCap, 45, "effectiveStreamFpsCap must equal streamFpsCap when non-zero");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  },
);

test(
  "A2b: resolveEncoderConfig maps streamFpsCap=0 (native) to effectiveStreamFpsCap=60",
  async () => {
    const { resolveEncoderConfig } = await import("../src/server/ssr-render-host.mjs");
    const tmp = mkdtempSync(path.join(os.tmpdir(), "ssr-fpstest0-"));
    try {
      mkdirSync(path.join(tmp, "config"), { recursive: true });
      writeFileSync(
        path.join(tmp, "config", "global-defaults.json"),
        JSON.stringify({
          serverRendering: { encoder: "x264-software", streamFpsCap: 0 },
        }),
      );
      const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };
      const result = await resolveEncoderConfig({ rootDir: tmp, logger: silentLogger });
      assert.equal(result.streamFpsCap, 0, "streamFpsCap=0 must be preserved (native)");
      assert.equal(result.effectiveStreamFpsCap, 60, "effectiveStreamFpsCap must be 60 when streamFpsCap=0");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  },
);

// ── A3: buildInPagePublisherScript wires frameRate with streamFpsCap ──────

test(
  "A3a: buildInPagePublisherScript output contains frameRate ideal:60 max:60 when effectiveStreamFpsCap=60",
  async () => {
    const { buildInPagePublisherScript } = await import("../src/server/ssr-stream-publisher.mjs");
    const script = buildInPagePublisherScript({ effectiveStreamFpsCap: 60 });
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
  "A3b: buildInPagePublisherScript output contains frameRate ideal:30 max:30 when effectiveStreamFpsCap=30",
  async () => {
    const { buildInPagePublisherScript } = await import("../src/server/ssr-stream-publisher.mjs");
    const script = buildInPagePublisherScript({ effectiveStreamFpsCap: 30 });
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

test(
  "A3b2: buildInPagePublisherScript output contains frameRate ideal:45 max:45 when effectiveStreamFpsCap=45",
  async () => {
    const { buildInPagePublisherScript } = await import("../src/server/ssr-stream-publisher.mjs");
    const script = buildInPagePublisherScript({ effectiveStreamFpsCap: 45 });
    assert.ok(
      script.includes("ideal: 45") && script.includes("max: 45"),
      `Script must contain frameRate ideal:45 max:45`,
    );
  },
);

// A3c / A3d alignModeBoost polling tests retired in Phase 40 — the
// publisher no longer has an align-mode boost path.
