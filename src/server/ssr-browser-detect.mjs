// src/server/ssr-browser-detect.mjs
//
// Phase 31 h1 hotfix (2026-05-06): cross-platform Chromium binary detection.
// Replaces the hard-coded /usr/bin/chromium default in ssr-render-host.mjs.
//
// Resolution priority (first match wins):
//   1. process.env.SSR_BROWSER_BIN (explicit user override)
//   2. puppeteer's bundled Chromium (puppeteer.executablePath()) — most
//      portable since `puppeteer` is a project dependency.
//   3. OS-specific common paths.
//   4. null (no browser found — caller decides what to do, typically
//      delegates to ssr-environment-bootstrap.mjs for install hints).
//
// This module deliberately does NOT call out to package managers or download
// browsers. It only DISCOVERS what is already installed. Auto-install is
// handled separately in ssr-environment-bootstrap.mjs so the discovery
// logic stays cheap and side-effect free.

import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import path from "node:path";

/**
 * OS-specific candidate paths to look for a Chromium-family browser.
 * All paths are absolute — no PATH lookup, no shelling out.
 */
function getOsCandidatePaths() {
  const os = platform();
  if (os === "linux") {
    return [
      "/snap/bin/chromium", // Ubuntu snap (the user's environment)
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/microsoft-edge",
      "/usr/bin/microsoft-edge-stable",
      "/var/lib/flatpak/exports/bin/com.google.Chrome",
      "/var/lib/flatpak/exports/bin/org.chromium.Chromium",
    ];
  }
  if (os === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      `${homedir()}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
      `${homedir()}/Applications/Chromium.app/Contents/MacOS/Chromium`,
    ];
  }
  if (os === "win32") {
    const programFiles = process.env["PROGRAMFILES"] || "C:\\Program Files";
    const programFilesX86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
    const localAppData = process.env["LOCALAPPDATA"] || path.join(homedir(), "AppData", "Local");
    return [
      path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFiles, "Chromium", "Application", "chrome.exe"),
      path.join(programFilesX86, "Chromium", "Application", "chrome.exe"),
      path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
    ];
  }
  return [];
}

/**
 * Try to ask puppeteer for its bundled-Chromium path. If puppeteer is
 * installed and downloaded its bundled Chromium during `npm install`, this
 * is by far the most reliable cross-platform path. Returns null if
 * puppeteer is not installed or the bundled binary doesn't exist.
 */
async function tryPuppeteerBundled() {
  try {
    const puppeteer = await import("puppeteer");
    const fn = puppeteer.executablePath ?? puppeteer.default?.executablePath;
    if (typeof fn !== "function") return null;
    const candidate = fn();
    if (typeof candidate === "string" && candidate.length > 0 && existsSync(candidate)) {
      return candidate;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * @typedef {Object} BrowserDetectResult
 * @property {string|null} path        Absolute path to the browser binary, or null.
 * @property {"env"|"bundled"|"system"|"none"} source  Where we got it from.
 * @property {string[]} triedPaths     System paths that were probed (debugging aid).
 * @property {string[]} availablePaths System paths that exist (for user-visible diagnostic).
 */

/**
 * Detect a usable Chromium-family browser on this machine. Pure function:
 * does NOT spawn anything, does NOT install anything, does NOT mutate state.
 *
 * @param {object} [opts]
 * @param {string} [opts.envOverride]   Override env var (defaults to process.env.SSR_BROWSER_BIN).
 * @param {(p: string) => boolean} [opts.fileExists]   Injectable for tests.
 * @returns {Promise<BrowserDetectResult>}
 */
export async function detectChromiumBinary(opts = {}) {
  const envOverride = opts.envOverride ?? process.env.SSR_BROWSER_BIN;
  const fileExists = opts.fileExists ?? existsSync;

  // 1. Explicit env override always wins (even if path doesn't exist — caller
  //    decides whether to surface that as an error).
  if (envOverride && envOverride.length > 0) {
    return {
      path: envOverride,
      source: "env",
      triedPaths: [envOverride],
      availablePaths: fileExists(envOverride) ? [envOverride] : [],
    };
  }

  // 2. Puppeteer bundled — best portability.
  const bundled = await tryPuppeteerBundled();
  if (bundled) {
    return {
      path: bundled,
      source: "bundled",
      triedPaths: [bundled],
      availablePaths: [bundled],
    };
  }

  // 3. OS-specific common paths.
  const candidates = getOsCandidatePaths();
  const found = candidates.find((p) => fileExists(p));
  const available = candidates.filter((p) => fileExists(p));

  if (found) {
    return {
      path: found,
      source: "system",
      triedPaths: candidates,
      availablePaths: available,
    };
  }

  // 4. Nothing found.
  return {
    path: null,
    source: "none",
    triedPaths: candidates,
    availablePaths: [],
  };
}

/**
 * Convenience: same as detectChromiumBinary() but throws if nothing found
 * with a clear error message containing the install hints. Used by
 * ssr-render-host.mjs at boot.
 *
 * @returns {Promise<BrowserDetectResult>}
 */
export async function detectChromiumBinaryOrThrow(opts) {
  const result = await detectChromiumBinary(opts);
  if (!result.path || (result.source !== "env" && !result.availablePaths.includes(result.path))) {
    const os = platform();
    const hint = INSTALL_HINTS[os] ?? INSTALL_HINTS.default;
    throw new Error(
      `[ssr-browser-detect] No Chromium-family browser found on this machine.\n` +
      `  Tried: ${result.triedPaths.join(", ") || "(none)"}\n` +
      `  To fix:\n${hint}\n` +
      `  Or set SSR_BROWSER_BIN=/path/to/chrome to override.`,
    );
  }
  return result;
}

const INSTALL_HINTS = {
  linux:
    "    apt:        sudo apt-get install -y chromium-browser\n" +
    "    snap:       sudo snap install chromium\n" +
    "    flatpak:    flatpak install flathub org.chromium.Chromium\n" +
    "    or run:     npx puppeteer browsers install chrome",
  darwin:
    "    brew:       brew install --cask google-chrome\n" +
    "    or run:     npx puppeteer browsers install chrome",
  win32:
    "    winget:     winget install Google.Chrome\n" +
    "    choco:      choco install googlechrome\n" +
    "    or run:     npx puppeteer browsers install chrome",
  default: "    Install Google Chrome or Chromium, or run: npx puppeteer browsers install chrome",
};
