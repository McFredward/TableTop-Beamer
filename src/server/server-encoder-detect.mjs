// src/server/server-encoder-detect.mjs
//
// Phase 31: hardware-agnostic h264 encoder auto-detection at server boot.
// Per CONTEXT.md § "Publishability & Hardware-Agnostic Defaults", the
// SSR pivot is published — the implementation must NOT be hardcoded to
// the dev-server hardware (Lenovo IdeaCentre Mini, Intel Raptor Lake-P).
// This module probes the host for available h264 encoders and returns
// a priority-ordered list. x264-software is the universal fallback and
// is ALWAYS appended to the result, even when ffmpeg detection fails.
//
// Priority order: nvenc > vaapi > videotoolbox > x264-software.
//
// Exports:
//   ENCODER_PRIORITY         — locked priority array (constant)
//   detectAvailableEncoders  — async probe (mockable via opts.probe)
//   pickPreferredEncoder     — selects highest-priority encoder

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { platform } from "node:os";

// Priority order: nvenc > vaapi > videotoolbox > x264-software.
// (single-line literal kept identical to inline list for grep-ability)
export const ENCODER_PRIORITY = ["nvenc", "vaapi", "videotoolbox", "x264-software"];

/**
 * Probe ffmpeg for available h264 encoder names.
 * Returns array like ["h264_nvenc", "h264_vaapi", "libx264"] or [] on failure.
 * Never throws — a missing or broken ffmpeg returns [].
 */
async function probeFfmpegEncoders() {
  return new Promise((resolve) => {
    try {
      const proc = spawn(
        "ffmpeg",
        ["-hide_banner", "-encoders"],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let buf = "";
      proc.stdout.on("data", (d) => {
        buf += d.toString("utf8");
      });
      proc.on("error", () => resolve([]));
      proc.on("exit", () => {
        const found = [];
        if (/\bh264_nvenc\b/.test(buf)) found.push("h264_nvenc");
        if (/\bh264_vaapi\b/.test(buf)) found.push("h264_vaapi");
        if (/\bh264_videotoolbox\b/.test(buf)) found.push("h264_videotoolbox");
        if (/\blibx264\b/.test(buf)) found.push("libx264");
        resolve(found);
      });
    } catch {
      resolve([]);
    }
  });
}

/**
 * Probe nvidia-smi to confirm an NVIDIA driver is actually loaded.
 * ffmpeg may list h264_nvenc as a build-time capability without the
 * runtime driver being available — we require both signals.
 */
function probeNvidiaSmi() {
  return new Promise((resolve) => {
    try {
      const proc = spawn(
        "nvidia-smi",
        ["-L"],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      proc.on("error", () => resolve(false));
      proc.on("exit", (code) => resolve(code === 0));
    } catch {
      resolve(false);
    }
  });
}

/**
 * Check for a VAAPI-capable render node under Linux. Both renderD128
 * and renderD129 are common iGPU/dGPU device paths.
 */
function probeVaapiDevice() {
  return (
    existsSync("/dev/dri/renderD128") || existsSync("/dev/dri/renderD129")
  );
}

/**
 * Detect available h264 encoders on this host. Returns priority-ordered
 * list. x264-software is ALWAYS appended as universal fallback, so the
 * returned array is never empty.
 *
 * @param {object} [opts]
 * @param {() => Promise<{
 *   ffmpegEncoders: string[],
 *   hasVaapiDevice: boolean,
 *   hasNvidiaSmi: boolean,
 *   platform: string,
 * }>} [opts.probe] — mock injector for tests.
 * @returns {Promise<string[]>}
 */
export async function detectAvailableEncoders(opts = {}) {
  const probe =
    opts.probe ??
    (async () => ({
      ffmpegEncoders: await probeFfmpegEncoders(),
      hasVaapiDevice: probeVaapiDevice(),
      hasNvidiaSmi: await probeNvidiaSmi(),
      platform: platform(),
    }));
  const env = await probe();
  const enc = Array.isArray(env.ffmpegEncoders) ? env.ffmpegEncoders : [];
  const result = [];

  // NVENC: ffmpeg lists h264_nvenc AND nvidia-smi succeeds (driver loaded).
  if (enc.includes("h264_nvenc") && env.hasNvidiaSmi) {
    result.push("nvenc");
  }

  // VAAPI: ffmpeg lists h264_vaapi AND a /dev/dri/renderD12x exists.
  if (enc.includes("h264_vaapi") && env.hasVaapiDevice) {
    result.push("vaapi");
  }

  // VideoToolbox: ffmpeg lists h264_videotoolbox (typically darwin only).
  if (enc.includes("h264_videotoolbox")) {
    result.push("videotoolbox");
  }

  // x264-software: ALWAYS present as universal fallback.
  result.push("x264-software");

  return result;
}

/**
 * Pick the highest-priority encoder from an availability list.
 * Throws on empty input — detectAvailableEncoders always appends
 * x264-software, so an empty list signals a detection bug.
 *
 * @param {string[]} available
 * @returns {string}
 */
export function pickPreferredEncoder(available) {
  if (!Array.isArray(available) || available.length === 0) {
    throw new Error(
      "pickPreferredEncoder: empty availability list (detection bug — x264-software must always be present)",
    );
  }
  for (const candidate of ENCODER_PRIORITY) {
    if (available.includes(candidate)) {
      return candidate;
    }
  }
  // Should be unreachable if detectAvailableEncoders is used.
  return available[0];
}
