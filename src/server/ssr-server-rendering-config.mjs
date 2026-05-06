// src/server/ssr-server-rendering-config.mjs
//
// Phase 31 Plan 04 — Wave 4 publishability gap.
//
// Validator + read/write helpers for `config/global-defaults.json#serverRendering`.
// The five settings (encoder, qualityPreset, resolutionPreference, fpsTarget,
// audioRoute) are surfaced via the System & Performance UI in Plan 05; the
// server-authoritative live-sync handler (`serverRendering-update` mutation)
// in server.mjs validates patches through this module and persists via the
// shared writer.
//
// D-D2 REVERSAL (2026-05-06): audioRoute default is now "pi-local" — NOT
// "in-stream". in-stream audio is deferred — see
// .planning/phases/phase-31/31-D-D2-REVERSAL-ADDENDUM.md
// The validator still ACCEPTS both enum values so the future feature flip
// requires no schema migration; the in-stream branch is currently a no-op
// in the SSR render-host (audio capture not wired).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// ── Enum value lists (locked by Plan 04 spec) ──────────────────────────
export const ENCODER_VALUES = ["auto", "nvenc", "vaapi", "videotoolbox", "x264-software"];
export const QUALITY_PRESET_VALUES = ["low-latency", "balanced", "high-quality"];
export const RESOLUTION_VALUES = ["auto", "1080p", "720p"];
export const FPS_VALUES = [30, 24, 15];
// in-stream audio is deferred — see 31-D-D2-REVERSAL-ADDENDUM.md
export const AUDIO_ROUTE_VALUES = ["in-stream", "pi-local"];

const KNOWN_KEYS = new Set([
  "encoder",
  "qualityPreset",
  "resolutionPreference",
  "fpsTarget",
  "audioRoute",
]);

/**
 * Hardware-aware default factory.
 * NVENC / VAAPI / VideoToolbox available  → "balanced" preset, 1080p
 * software-only (x264-software)           → "low-latency" preset, 720p
 *
 * D-D2 REVERSAL: audioRoute default = "pi-local" (was "in-stream").
 *
 * @param {{available?: string[]}} [opts]
 * @returns {{encoder:string, qualityPreset:string, resolutionPreference:string, fpsTarget:number, audioRoute:string}}
 */
export function SERVER_RENDERING_DEFAULTS({ available = [] } = {}) {
  const hasHwEncoder =
    available.includes("nvenc") ||
    available.includes("vaapi") ||
    available.includes("videotoolbox");
  if (hasHwEncoder) {
    return {
      encoder: "auto",
      qualityPreset: "balanced",
      resolutionPreference: "1080p",
      fpsTarget: 30,
      audioRoute: "pi-local", // D-D2 reversal default
    };
  }
  return {
    encoder: "auto",
    qualityPreset: "low-latency",
    resolutionPreference: "720p",
    fpsTarget: 30,
    audioRoute: "pi-local", // D-D2 reversal default
  };
}

/**
 * Validate a partial patch against the five-key schema. Empty `{}` is
 * valid (no-op partial update). Unknown keys are ignored at the apply
 * layer — the validator does NOT reject them; this keeps clients
 * forward-compatible if the schema grows.
 *
 * @param {object} patch
 * @returns {{valid: boolean, reason?: string}}
 */
export function validateServerRenderingPatch(patch) {
  if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
    return { valid: false, reason: "patch-not-object" };
  }
  if ("encoder" in patch) {
    if (typeof patch.encoder !== "string") return { valid: false, reason: "encoder-wrong-type" };
    if (!ENCODER_VALUES.includes(patch.encoder)) return { valid: false, reason: "encoder-not-in-enum" };
  }
  if ("qualityPreset" in patch) {
    if (typeof patch.qualityPreset !== "string") return { valid: false, reason: "qualityPreset-wrong-type" };
    if (!QUALITY_PRESET_VALUES.includes(patch.qualityPreset)) return { valid: false, reason: "qualityPreset-not-in-enum" };
  }
  if ("resolutionPreference" in patch) {
    if (typeof patch.resolutionPreference !== "string") return { valid: false, reason: "resolutionPreference-wrong-type" };
    if (!RESOLUTION_VALUES.includes(patch.resolutionPreference)) return { valid: false, reason: "resolutionPreference-not-in-enum" };
  }
  if ("fpsTarget" in patch) {
    // strict number type — string "30" must be rejected
    if (typeof patch.fpsTarget !== "number" || !Number.isFinite(patch.fpsTarget)) {
      return { valid: false, reason: "fpsTarget-wrong-type" };
    }
    if (!FPS_VALUES.includes(patch.fpsTarget)) return { valid: false, reason: "fpsTarget-not-in-enum" };
  }
  if ("audioRoute" in patch) {
    if (typeof patch.audioRoute !== "string") return { valid: false, reason: "audioRoute-wrong-type" };
    // in-stream audio is deferred — see 31-D-D2-REVERSAL-ADDENDUM.md
    if (!AUDIO_ROUTE_VALUES.includes(patch.audioRoute)) return { valid: false, reason: "audioRoute-not-in-enum" };
  }
  return { valid: true };
}

/**
 * Apply the patch to a full global-defaults config object. Only the 5
 * known keys flow into `currentCfg.serverRendering`; unknown keys in the
 * patch are silently ignored (defensive against config drift). Top-level
 * keys outside `serverRendering` are preserved untouched.
 *
 * Returns a NEW object — does NOT mutate currentCfg in place.
 *
 * @param {object} currentCfg
 * @param {object} patch
 * @returns {object}
 */
export function applyServerRenderingPatch(currentCfg, patch) {
  const baseCfg = (currentCfg && typeof currentCfg === "object" && !Array.isArray(currentCfg))
    ? currentCfg
    : {};
  const baseSr = (baseCfg.serverRendering && typeof baseCfg.serverRendering === "object" && !Array.isArray(baseCfg.serverRendering))
    ? baseCfg.serverRendering
    : {};
  const next = { ...baseSr };
  if (patch && typeof patch === "object" && !Array.isArray(patch)) {
    for (const key of Object.keys(patch)) {
      if (!KNOWN_KEYS.has(key)) continue;
      next[key] = patch[key];
    }
  }
  return { ...baseCfg, serverRendering: next };
}

/**
 * Read `config/global-defaults.json` and return the serverRendering block,
 * filling missing keys from SERVER_RENDERING_DEFAULTS({available}). ENOENT
 * returns full defaults.
 *
 * @param {object} opts
 * @param {string} opts.rootDir
 * @param {string[]} [opts.available]
 * @returns {Promise<{encoder:string, qualityPreset:string, resolutionPreference:string, fpsTarget:number, audioRoute:string}>}
 */
export async function readServerRenderingConfig({ rootDir, available = [] }) {
  if (!rootDir) throw new Error("readServerRenderingConfig: rootDir is required");
  const filePath = path.join(rootDir, "config", "global-defaults.json");
  const defaults = SERVER_RENDERING_DEFAULTS({ available });
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const sr = (parsed && typeof parsed === "object" && parsed.serverRendering && typeof parsed.serverRendering === "object")
      ? parsed.serverRendering
      : {};
    return {
      encoder: typeof sr.encoder === "string" && ENCODER_VALUES.includes(sr.encoder) ? sr.encoder : defaults.encoder,
      qualityPreset: typeof sr.qualityPreset === "string" && QUALITY_PRESET_VALUES.includes(sr.qualityPreset) ? sr.qualityPreset : defaults.qualityPreset,
      resolutionPreference: typeof sr.resolutionPreference === "string" && RESOLUTION_VALUES.includes(sr.resolutionPreference) ? sr.resolutionPreference : defaults.resolutionPreference,
      fpsTarget: typeof sr.fpsTarget === "number" && FPS_VALUES.includes(sr.fpsTarget) ? sr.fpsTarget : defaults.fpsTarget,
      audioRoute: typeof sr.audioRoute === "string" && AUDIO_ROUTE_VALUES.includes(sr.audioRoute) ? sr.audioRoute : defaults.audioRoute,
    };
  } catch (err) {
    if (err && err.code === "ENOENT") return defaults;
    throw err;
  }
}

/**
 * Read full global-defaults.json (for callers preparing a patch round-trip).
 * Returns `{}` on ENOENT.
 *
 * @param {object} opts
 * @param {string} opts.rootDir
 * @returns {Promise<object>}
 */
export async function readFullConfig({ rootDir }) {
  if (!rootDir) throw new Error("readFullConfig: rootDir is required");
  const filePath = path.join(rootDir, "config", "global-defaults.json");
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : {};
  } catch (err) {
    if (err && err.code === "ENOENT") return {};
    throw err;
  }
}

/**
 * Write the full config back to disk. Used by callers who already
 * prepared the new shape via applyServerRenderingPatch.
 *
 * @param {object} opts
 * @param {string} opts.rootDir
 * @param {object} opts.fullConfig
 * @returns {Promise<void>}
 */
export async function writeFullConfig({ rootDir, fullConfig }) {
  if (!rootDir) throw new Error("writeFullConfig: rootDir is required");
  const filePath = path.join(rootDir, "config", "global-defaults.json");
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(fullConfig, null, 2)}\n`, "utf8");
}

// ── Phase-13-style debounced writer for the live-sync handler ──────────
//
// The live-sync `serverRendering-update` mutation may fire multiple times
// per second (rapid slider drags in Plan 05's UI). Debounce 200ms so the
// global-defaults.json write rate is bounded. Last-write-wins semantics.
let pendingTimer = null;
let pendingFullCfg = null;
let pendingRootDir = null;
let pendingResolvers = [];
const WRITE_DEBOUNCE_MS = 200;

/**
 * @param {object} opts
 * @param {string} opts.rootDir
 * @param {object} opts.fullConfig
 * @returns {Promise<void>}
 */
export function scheduleServerRenderingWrite({ rootDir, fullConfig }) {
  pendingRootDir = rootDir;
  pendingFullCfg = fullConfig;
  if (pendingTimer) clearTimeout(pendingTimer);
  return new Promise((resolve, reject) => {
    pendingResolvers.push({ resolve, reject });
    pendingTimer = setTimeout(async () => {
      pendingTimer = null;
      const cfg = pendingFullCfg;
      const root = pendingRootDir;
      const resolvers = pendingResolvers;
      pendingFullCfg = null;
      pendingRootDir = null;
      pendingResolvers = [];
      try {
        await writeFullConfig({ rootDir: root, fullConfig: cfg });
        for (const r of resolvers) r.resolve();
      } catch (err) {
        for (const r of resolvers) r.reject(err);
      }
    }, WRITE_DEBOUNCE_MS);
  });
}

/** Test-only reset for module-scoped debounce state. */
export function _resetServerRenderingWriterForTests() {
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = null;
  pendingFullCfg = null;
  pendingRootDir = null;
  const resolvers = pendingResolvers;
  pendingResolvers = [];
  for (const r of resolvers) r.resolve();
}
