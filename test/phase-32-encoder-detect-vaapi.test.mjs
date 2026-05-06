// test/phase-32-encoder-detect-vaapi.test.mjs
//
// Phase 32 Wave 0 — Block A test A8 (SKIP-GATED).
// These tests will be flipped GREEN by Wave 1 when server-encoder-detect.mjs
// is extended with a libva probe path independent of ffmpeg.
//
// Contains: phase-32-encoder-detect-vaapi

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { loadEncoderDetect } from "./helpers/phase-32-ssr-test-harness.mjs";

// ── A8: detectAvailableEncoders decoupled from ffmpeg for VAAPI ───────────

test(
  "A8a: detectAvailableEncoders({ probe: { hasVaapiDevice: true, hasLibva: true, ffmpegEncoders: [] } }) returns array containing 'vaapi'",
  { skip: "Wave 1 will add hasLibva probe path to detectAvailableEncoders" },
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
  { skip: "Wave 1 will add hasLibva check to vaapi detection" },
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
  { skip: "Wave 1 will require both hasVaapiDevice AND hasLibva for vaapi detection" },
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
  { skip: "Wave 1 will add probeLibvaRuntime export to server-encoder-detect.mjs" },
  async () => {
    const detect = await loadEncoderDetect();
    assert.equal(
      typeof detect.probeLibvaRuntime,
      "function",
      "probeLibvaRuntime must be exported as a function",
    );
  },
);
