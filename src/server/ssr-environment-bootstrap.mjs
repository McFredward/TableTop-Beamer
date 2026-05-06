// src/server/ssr-environment-bootstrap.mjs
//
// Phase 31 h1 hotfix (2026-05-06): cross-platform environment bring-up.
// Ensures the SSR render-host has the OS resources it needs: a virtual
// display server (Linux only — Xvfb), a Chromium-family browser, and ffmpeg
// for the encoder pipeline.
//
// Best-effort auto-install when SSR_AUTO_INSTALL=1 is set (default OFF for
// safety — installing system packages without explicit consent is hostile to
// publishability). When auto-install is disabled but a dependency is
// missing, this module logs the exact install command the user should run
// and lets the render-host decide whether to abort or to retry with what's
// available.
//
// Platforms supported:
//   * Linux: apt-get / dnf / pacman / zypper / snap / flatpak (probe in order)
//   * macOS: Homebrew (brew)
//   * Windows: winget (preferred) or chocolatey (fallback)

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { platform } from "node:os";

import { detectChromiumBinary } from "./ssr-browser-detect.mjs";

/**
 * @typedef {Object} EnvironmentReport
 * @property {string} os                          One of: "linux" | "darwin" | "win32" | "other".
 * @property {boolean} needsVirtualDisplay        Linux + no DISPLAY env => true.
 * @property {boolean} hasVirtualDisplay          Xvfb binary detected.
 * @property {string|null} browserPath            Resolved Chromium binary, or null.
 * @property {"env"|"bundled"|"system"|"none"} browserSource
 * @property {boolean} hasFfmpeg                  ffmpeg on PATH.
 * @property {string[]} installCommandsSuggested  Human-readable list, run if user wants.
 * @property {string[]} installCommandsExecuted   What auto-install actually ran (empty if disabled or n/a).
 * @property {string[]} warnings                  Non-fatal diagnostics for the operator.
 * @property {boolean} ready                      True iff render-host can boot now.
 */

/**
 * Run a system command and capture exit-code + stdout. Returns
 * `{ ok, stdout }`. Used for `which`/`where` lookups; never throws.
 */
function runSync(cmd, args = [], opts = {}) {
  try {
    const r = spawnSync(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      ...opts,
    });
    return { ok: r.status === 0, stdout: (r.stdout || "").trim(), stderr: (r.stderr || "").trim() };
  } catch {
    return { ok: false, stdout: "", stderr: "" };
  }
}

/**
 * Cross-platform "is this binary on PATH?" — uses `which` on POSIX and
 * `where` on Windows. Returns the resolved path or null.
 */
function whichBinary(name) {
  const isWin = platform() === "win32";
  const probe = isWin ? "where" : "which";
  const result = runSync(probe, [name]);
  if (result.ok && result.stdout) {
    // Windows `where` can return multiple lines; first one is enough.
    return result.stdout.split(/\r?\n/)[0].trim();
  }
  return null;
}

/**
 * Probe which Linux package manager is available. Used to compose a sensible
 * install command. Returns `null` if none of the common ones is present.
 */
function detectLinuxPackageManager() {
  if (whichBinary("apt-get")) return "apt";
  if (whichBinary("dnf")) return "dnf";
  if (whichBinary("pacman")) return "pacman";
  if (whichBinary("zypper")) return "zypper";
  if (whichBinary("snap")) return "snap";
  if (whichBinary("flatpak")) return "flatpak";
  return null;
}

/**
 * Build install commands per OS. Pure data — does not execute anything.
 *
 * @param {Object} need What's missing.
 * @returns {string[]} commands to suggest to the operator.
 */
function suggestInstallCommands(need) {
  const os = platform();
  const cmds = [];

  if (os === "linux") {
    const pm = detectLinuxPackageManager();
    if (need.xvfb) {
      if (pm === "apt") cmds.push("sudo apt-get install -y xvfb");
      else if (pm === "dnf") cmds.push("sudo dnf install -y xorg-x11-server-Xvfb");
      else if (pm === "pacman") cmds.push("sudo pacman -S --noconfirm xorg-server-xvfb");
      else if (pm === "zypper") cmds.push("sudo zypper install -y xorg-x11-server-Xvfb");
      else cmds.push("# install Xvfb via your system package manager");
    }
    if (need.browser) {
      if (pm === "apt") cmds.push("sudo apt-get install -y chromium-browser");
      else if (pm === "snap") cmds.push("sudo snap install chromium");
      else if (pm === "dnf") cmds.push("sudo dnf install -y chromium");
      else if (pm === "pacman") cmds.push("sudo pacman -S --noconfirm chromium");
      else if (pm === "zypper") cmds.push("sudo zypper install -y chromium");
      else if (pm === "flatpak") cmds.push("flatpak install -y flathub org.chromium.Chromium");
      cmds.push("# or run as fallback:  npx puppeteer browsers install chrome");
    }
    if (need.ffmpeg) {
      if (pm === "apt") cmds.push("sudo apt-get install -y ffmpeg");
      else if (pm === "dnf") cmds.push("sudo dnf install -y ffmpeg");
      else if (pm === "pacman") cmds.push("sudo pacman -S --noconfirm ffmpeg");
      else if (pm === "zypper") cmds.push("sudo zypper install -y ffmpeg");
      else cmds.push("# install ffmpeg via your system package manager");
    }
  } else if (os === "darwin") {
    const hasBrew = !!whichBinary("brew");
    if (need.browser) {
      cmds.push(hasBrew
        ? "brew install --cask google-chrome"
        : "# install Homebrew first: https://brew.sh — then: brew install --cask google-chrome");
      cmds.push("# or run as fallback:  npx puppeteer browsers install chrome");
    }
    if (need.ffmpeg) {
      cmds.push(hasBrew
        ? "brew install ffmpeg"
        : "# install Homebrew first: https://brew.sh — then: brew install ffmpeg");
    }
    // Xvfb not needed on macOS (real desktop available).
  } else if (os === "win32") {
    const hasWinget = !!whichBinary("winget");
    const hasChoco = !!whichBinary("choco");
    if (need.browser) {
      if (hasWinget) cmds.push("winget install --silent Google.Chrome");
      else if (hasChoco) cmds.push("choco install -y googlechrome");
      else cmds.push("# install winget (Microsoft Store: 'App Installer'), then: winget install Google.Chrome");
      cmds.push("# or run as fallback:  npx puppeteer browsers install chrome");
    }
    if (need.ffmpeg) {
      if (hasWinget) cmds.push("winget install --silent Gyan.FFmpeg");
      else if (hasChoco) cmds.push("choco install -y ffmpeg");
      else cmds.push("# install ffmpeg from https://ffmpeg.org/download.html and add to PATH");
    }
    // Xvfb not needed on Windows.
  }

  return cmds;
}

/**
 * Best-effort auto-install when SSR_AUTO_INSTALL=1. Runs the suggested
 * commands non-interactively; logs successes and failures and continues.
 * Never elevates privileges (sudo -n is non-interactive — fails fast if
 * the user has no passwordless-sudo).
 *
 * @param {string[]} commands From suggestInstallCommands().
 * @param {{info:Function, warn:Function, error:Function}} logger
 * @returns {string[]} commands that actually executed (regardless of outcome).
 */
function tryAutoInstall(commands, logger) {
  const executed = [];
  for (const raw of commands) {
    const cmd = raw.trim();
    if (cmd.startsWith("#")) continue; // skip explanatory hints
    const parts = cmd.split(/\s+/);
    if (parts.length === 0) continue;
    // sudo -n: non-interactive — won't prompt for password.
    const argv = parts[0] === "sudo" ? ["-n", ...parts.slice(1)] : parts.slice(1);
    const bin = parts[0] === "sudo" ? "sudo" : parts[0];
    logger.info(`[ssr-env] auto-install: ${cmd}`);
    const r = runSync(bin, argv, { stdio: ["ignore", "pipe", "pipe"] });
    executed.push(cmd);
    if (r.ok) {
      logger.info(`[ssr-env] auto-install OK: ${cmd}`);
    } else {
      const reason = (r.stderr || r.stdout || "").split(/\r?\n/)[0].slice(0, 200);
      logger.warn(`[ssr-env] auto-install FAILED: ${cmd}  (${reason})`);
    }
  }
  return executed;
}

/**
 * Probe the runtime environment and (optionally) install missing pieces.
 * Returns a structured report the render-host can act on.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.autoInstall]   Default: env SSR_AUTO_INSTALL === "1".
 * @param {{info:Function, warn:Function, error:Function}} [opts.logger]
 * @returns {Promise<EnvironmentReport>}
 */
export async function probeEnvironment(opts = {}) {
  const logger = opts.logger ?? console;
  const autoInstall = opts.autoInstall ?? process.env.SSR_AUTO_INSTALL === "1";

  const os = platform();
  const osLabel = os === "linux" || os === "darwin" || os === "win32" ? os : "other";

  // Linux without DISPLAY needs Xvfb. macOS / Windows have a real desktop.
  const hasDisplayEnv = !!process.env.DISPLAY;
  const needsVirtualDisplay = os === "linux" && !hasDisplayEnv;
  const xvfbPath = whichBinary("Xvfb");
  let hasVirtualDisplay = !!xvfbPath;

  // Browser detection.
  const browserResult = await detectChromiumBinary();
  let browserPath = browserResult.path;
  let browserSource = browserResult.source;
  // If env override was given but the path doesn't exist, still treat as missing.
  const browserUsable = browserPath !== null
    && (browserSource === "env"
      ? existsSync(browserPath)
      : browserResult.availablePaths.includes(browserPath));

  // ffmpeg detection.
  const ffmpegPath = whichBinary("ffmpeg");
  let hasFfmpeg = !!ffmpegPath;

  const need = {
    xvfb: needsVirtualDisplay && !hasVirtualDisplay,
    browser: !browserUsable,
    ffmpeg: !hasFfmpeg,
  };

  const installCommandsSuggested = suggestInstallCommands(need);
  let installCommandsExecuted = [];

  if ((need.xvfb || need.browser || need.ffmpeg) && autoInstall && installCommandsSuggested.length > 0) {
    logger.info(`[ssr-env] SSR_AUTO_INSTALL=1 — attempting non-interactive install of missing dependencies`);
    installCommandsExecuted = tryAutoInstall(installCommandsSuggested, logger);

    // Re-probe after install attempts.
    if (need.xvfb) {
      const reXvfb = whichBinary("Xvfb");
      if (reXvfb) hasVirtualDisplay = true;
    }
    if (need.ffmpeg) {
      const reFfmpeg = whichBinary("ffmpeg");
      if (reFfmpeg) hasFfmpeg = true;
    }
    if (need.browser) {
      const reBrowser = await detectChromiumBinary();
      if (reBrowser.path && reBrowser.availablePaths.includes(reBrowser.path)) {
        browserPath = reBrowser.path;
        browserSource = reBrowser.source;
      }
    }
  }

  // Recompute final need-state after re-probes so `ready` reflects truth.
  const finalNeedsXvfb = needsVirtualDisplay && !hasVirtualDisplay;
  const finalBrowserUsable = browserPath !== null
    && (browserSource === "env" ? existsSync(browserPath) : true);

  const warnings = [];
  if (finalNeedsXvfb) warnings.push("Xvfb missing on Linux — render-host cannot run headful Chromium without a display");
  if (!finalBrowserUsable) warnings.push("No usable Chromium-family browser found");
  if (!hasFfmpeg) warnings.push("ffmpeg missing — encoder probing + transcode-fallback path will be unavailable");
  if (browserSource === "env" && !existsSync(browserPath)) {
    warnings.push(`SSR_BROWSER_BIN=${browserPath} but file does not exist`);
  }

  const ready = !finalNeedsXvfb && finalBrowserUsable && hasFfmpeg;

  return {
    os: osLabel,
    needsVirtualDisplay,
    hasVirtualDisplay,
    browserPath,
    browserSource,
    hasFfmpeg,
    installCommandsSuggested,
    installCommandsExecuted,
    warnings,
    ready,
  };
}

/**
 * Convenience formatter: turn an EnvironmentReport into a human-readable
 * multi-line string for the operator console at boot time.
 *
 * @param {EnvironmentReport} report
 * @returns {string}
 */
export function formatEnvironmentReport(report) {
  const lines = [];
  lines.push(`[ssr-env] OS: ${report.os}`);
  if (report.os === "linux") {
    lines.push(
      `[ssr-env] Virtual display: ${report.needsVirtualDisplay ? (report.hasVirtualDisplay ? "ready (Xvfb)" : "MISSING") : "not needed (DISPLAY env present)"}`,
    );
  } else {
    lines.push(`[ssr-env] Virtual display: not needed on ${report.os}`);
  }
  lines.push(`[ssr-env] Browser: ${report.browserPath ?? "NOT FOUND"} (source=${report.browserSource})`);
  lines.push(`[ssr-env] ffmpeg: ${report.hasFfmpeg ? "ready" : "MISSING"}`);
  if (report.warnings.length > 0) {
    lines.push(`[ssr-env] WARNINGS:`);
    for (const w of report.warnings) lines.push(`[ssr-env]   - ${w}`);
  }
  if (report.installCommandsSuggested.length > 0 && !report.ready) {
    lines.push(`[ssr-env] To make this environment ready, run:`);
    for (const c of report.installCommandsSuggested) lines.push(`[ssr-env]   ${c}`);
    lines.push(`[ssr-env] (Or set SSR_AUTO_INSTALL=1 to attempt non-interactive install at next boot.)`);
  }
  lines.push(`[ssr-env] Ready: ${report.ready ? "YES" : "NO"}`);
  return lines.join("\n");
}
