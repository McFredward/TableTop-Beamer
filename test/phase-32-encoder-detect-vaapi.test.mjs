// test/phase-32-encoder-detect-vaapi.test.mjs
//
// Phase 32 Wave 1 — Block A test A8 (GREEN — flipped from skip by 32-01-T1).
// Verifies that server-encoder-detect.mjs detects VAAPI via libva path
// independent of ffmpeg, per Research I-4 and D-A6.
//
// Contains: phase-32-encoder-detect-vaapi

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { loadEncoderDetect } from "./helpers/phase-32-ssr-test-harness.mjs";

// ── A8: detectAvailableEncoders decoupled from ffmpeg for VAAPI ───────────

test(
  "A8a: detectAvailableEncoders({ probe: { hasVaapiDevice: true, hasLibva: true, ffmpegEncoders: [] } }) returns array containing 'vaapi'",
  async () => {
    const { detectAvailableEncoders } = await loadEncoderDetect();
    const result = await detectAvailableEncoders({
      probe: async () => ({
        ffmpegEncoders: [],
        hasVaapiDevice: true,
        hasLibva: true,
        hasNvidiaSmi: false,
        platform: "linux",
      }),
    });
    assert.ok(
      result.includes("vaapi"),
      `Expected result to include 'vaapi' when hasVaapiDevice+hasLibva=true, got: ${JSON.stringify(result)}`,
    );
  },
);

test(
  "A8b: detectAvailableEncoders({ probe: { hasVaapiDevice: true, hasLibva: false, ffmpegEncoders: [] } }) does NOT contain 'vaapi'",
  async () => {
    const { detectAvailableEncoders } = await loadEncoderDetect();
    const result = await detectAvailableEncoders({
      probe: async () => ({
        ffmpegEncoders: [],
        hasVaapiDevice: true,
        hasLibva: false,
        hasNvidiaSmi: false,
        platform: "linux",
      }),
    });
    assert.ok(
      !result.includes("vaapi"),
      `Expected result to NOT contain 'vaapi' when hasLibva=false, got: ${JSON.stringify(result)}`,
    );
  },
);

test(
  "A8c: detectAvailableEncoders({ probe: { hasVaapiDevice: false, hasLibva: true, ffmpegEncoders: [] } }) does NOT contain 'vaapi'",
  async () => {
    const { detectAvailableEncoders } = await loadEncoderDetect();
    const result = await detectAvailableEncoders({
      probe: async () => ({
        ffmpegEncoders: [],
        hasVaapiDevice: false,
        hasLibva: true,
        hasNvidiaSmi: false,
        platform: "linux",
      }),
    });
    assert.ok(
      !result.includes("vaapi"),
      `Expected result to NOT contain 'vaapi' when hasVaapiDevice=false, got: ${JSON.stringify(result)}`,
    );
  },
);

test(
  "A8d: probeLibvaRuntime() is exported as a function",
  async () => {
    const detect = await loadEncoderDetect();
    assert.equal(
      typeof detect.probeLibvaRuntime,
      "function",
      "probeLibvaRuntime must be exported as a function",
    );
  },
);
