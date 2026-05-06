// Phase 31 Wave 0 — encoder auto-detection unit tests.
// Covers Publishability constraint (CONTEXT.md): SSR pivot must NOT be
// hardcoded to the dev-server hardware (Lenovo IdeaCentre Mini, Intel
// Raptor Lake-P iGPU). Server-encoder selection auto-detects what is
// available on the host and picks the highest-priority encoder.
//
// Priority: nvenc > vaapi > videotoolbox > x264-software.
// x264-software is the universal fallback and is ALWAYS present.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ENCODER_PRIORITY,
  detectAvailableEncoders,
  pickPreferredEncoder,
} from "../src/server/server-encoder-detect.mjs";

test("ENCODER_PRIORITY ordering: nvenc > vaapi > videotoolbox > x264-software", () => {
  assert.deepEqual(ENCODER_PRIORITY, [
    "nvenc",
    "vaapi",
    "videotoolbox",
    "x264-software",
  ]);
});

test("pickPreferredEncoder: software-only env returns x264-software", () => {
  assert.equal(pickPreferredEncoder(["x264-software"]), "x264-software");
});

test("pickPreferredEncoder: vaapi available wins over software", () => {
  assert.equal(pickPreferredEncoder(["vaapi", "x264-software"]), "vaapi");
});

test("pickPreferredEncoder: nvenc available wins over vaapi + software", () => {
  assert.equal(
    pickPreferredEncoder(["nvenc", "vaapi", "x264-software"]),
    "nvenc",
  );
});

test("pickPreferredEncoder: empty array throws (detection-bug guard)", () => {
  assert.throws(() => pickPreferredEncoder([]), /empty availability list/);
});

test("detectAvailableEncoders: nvenc + vaapi env returns priority-ordered list", async () => {
  const result = await detectAvailableEncoders({
    probe: async () => ({
      ffmpegEncoders: ["h264_nvenc", "h264_vaapi", "libx264"],
      hasVaapiDevice: true,
      hasNvidiaSmi: true,
      platform: "linux",
    }),
  });
  assert.deepEqual(result, ["nvenc", "vaapi", "x264-software"]);
});

test("detectAvailableEncoders: software-only env returns just x264-software", async () => {
  const result = await detectAvailableEncoders({
    probe: async () => ({
      ffmpegEncoders: ["libx264"],
      hasVaapiDevice: false,
      hasNvidiaSmi: false,
      platform: "linux",
    }),
  });
  assert.deepEqual(result, ["x264-software"]);
});

test("detectAvailableEncoders: macOS env returns videotoolbox + software", async () => {
  const result = await detectAvailableEncoders({
    probe: async () => ({
      ffmpegEncoders: ["h264_videotoolbox", "libx264"],
      hasVaapiDevice: false,
      hasNvidiaSmi: false,
      platform: "darwin",
    }),
  });
  assert.deepEqual(result, ["videotoolbox", "x264-software"]);
});

test("detectAvailableEncoders: x264-software ALWAYS present as universal fallback", async () => {
  // Even when probe pretends ffmpeg has nothing, x264-software is appended.
  const result = await detectAvailableEncoders({
    probe: async () => ({
      ffmpegEncoders: [],
      hasVaapiDevice: false,
      hasNvidiaSmi: false,
      platform: "linux",
    }),
  });
  assert.ok(
    result.includes("x264-software"),
    "x264-software must always be in the result",
  );
});

test("detectAvailableEncoders: vaapi listed by ffmpeg but no /dev/dri device → not available", async () => {
  // Defensive: ffmpeg can advertise h264_vaapi without an actual device.
  const result = await detectAvailableEncoders({
    probe: async () => ({
      ffmpegEncoders: ["h264_vaapi", "libx264"],
      hasVaapiDevice: false,
      hasNvidiaSmi: false,
      platform: "linux",
    }),
  });
  assert.equal(result.includes("vaapi"), false);
  assert.deepEqual(result, ["x264-software"]);
});

test("detectAvailableEncoders: nvenc requires both ffmpeg-encoder AND nvidia-smi", async () => {
  // Defensive: ffmpeg may list h264_nvenc even when no nvidia driver is loaded.
  const result = await detectAvailableEncoders({
    probe: async () => ({
      ffmpegEncoders: ["h264_nvenc", "libx264"],
      hasVaapiDevice: false,
      hasNvidiaSmi: false,
      platform: "linux",
    }),
  });
  assert.equal(result.includes("nvenc"), false);
});
