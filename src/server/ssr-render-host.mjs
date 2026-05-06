// src/server/ssr-render-host.mjs
//
// Phase 31 Plan 01 — Wave 1: SSR render-host bring-up.
// Spawns Xvfb + headful Chromium via puppeteer-stream, navigates the tab to
// http://127.0.0.1:${PORT}/output?ssr=1, manages the lifecycle (start/stop/
// restart, CDP health-ping every 5s, 3 consecutive failures → relaunch).
//
// Per CONTEXT.md "Publishability & Hardware-Agnostic Defaults" (2026-05-06):
// at boot the host reads `config/global-defaults.json#serverRendering.encoder`
// (default "auto"); if "auto", the highest-priority available encoder
// (nvenc > vaapi > videotoolbox > x264-software) from Plan 00's
// `server-encoder-detect.mjs` is selected. The chosen encoder + preset
// (bitrate/fps/keyframe-interval) is logged exactly once per boot — this is
// the diagnostic surface other-user installations rely on.
//
// Per D-D2 reversal (2026-05-06): audio is Pi-local (NOT in the WebRTC
// stream). The Chromium launch still includes
// `--autoplay-policy=no-user-gesture-required` for general autoplay support
// (e.g. mp4 animations) but no audio capture is wired up.
//
// Per RESEARCH.md § Pitfall 1: headful (NOT --headless=new). § Pitfall 2:
// `--use-gl=egl` for GPU-accelerated canvas. § Pitfall 3: SSR tab adds
// `?ssr=1` query so Plan 05 can gate Pi-only hotfixes behind it.
//
// Wave 2 (Plan 02) wires the in-page WebRTC publish to mediasoup — this
// plan ONLY proves the tab boots, navigates, and is process-managed.

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { platform } from "node:os";

import { detectChromiumBinary } from "./ssr-browser-detect.mjs";

/**
 * Build the canonical Xvfb argument list for a given display + viewport.
 * Exported for unit-testability (Wave-0 test A9 imports this directly).
 *
 * Phase 32 D-A4 root-cause fix: `-fakescreenfps 120` lifts the Xvfb
 * BeginFrameSource above its default (~25 Hz), giving Chromium a 120 Hz
 * screen budget so the rAF loop can reach 60 fps. Without this flag the
 * BeginFrameSource caps at ~25 Hz regardless of --disable-frame-rate-limit.
 *
 * @param {{ display: string, width: number, height: number }} opts
 * @returns {string[]}
 */
export function getXvfbArgs({ display, width, height }) {
  return [
    display,
    "-screen", "0", `${width}x${height}x24`,
    "-ac",
    "-dpi", "96",
    "+extension", "RANDR",
    "+extension", "RENDER",
    "+extension", "GLX",
    "+extension", "Composite",
    "-fakescreenfps", "120",  // Phase 32 D-A4 root-cause: lift Xvfb BeginFrameSource above default ~25Hz; Chromium will target 60fps with 120Hz screen budget
  ];
}
import { probeEnvironment, formatEnvironmentReport } from "./ssr-environment-bootstrap.mjs";
import path from "node:path";
import {
  detectAvailableEncoders,
  pickPreferredEncoder,
  ENCODER_PRIORITY,
} from "./server-encoder-detect.mjs";
import { injectInPagePublisher } from "./ssr-stream-publisher.mjs";

// ---------------------------------------------------------------------
// Stream-quality preset → concrete bitrate / fps / keyframe-interval map.
// Plan 04 will move this map into config/global-defaults.json#serverRendering;
// Plan 01 inlines it as the canonical default so SSR boot is self-contained.
// ---------------------------------------------------------------------
const QUALITY_PRESETS = {
  "low-latency":  { bitrate:  4_000_000, fpsTarget: 30, keyframeIntervalSec: 1, x264Preset: "ultrafast" },
  "balanced":     { bitrate:  8_000_000, fpsTarget: 30, keyframeIntervalSec: 2, x264Preset: "veryfast"  },
  "high-quality": { bitrate: 12_000_000, fpsTarget: 30, keyframeIntervalSec: 2, x264Preset: "fast"      },
};

/**
 * Resolve the encoder + preset to use for this server-boot.
 * Reads config/global-defaults.json#serverRendering when present; otherwise
 * runs auto-detection. ALWAYS returns a usable encoder — x264-software is
 * the universal fallback per CONTEXT.md.
 *
 * @param {object} [opts]
 * @param {string} [opts.rootDir]
 * @param {{info:Function, warn:Function, error:Function}} [opts.logger]
 * @returns {Promise<{
 *   encoder:string,
 *   source:"auto"|"user",
 *   available:string[],
 *   preset:string,
 *   bitrate:number,
 *   fpsTarget:number,
 *   keyframeIntervalSec:number,
 *   x264Preset:string,
 *   resolutionPreference:string,
 * }>}
 */
export async function resolveEncoderConfig({ rootDir = process.cwd(), logger = console } = {}) {
  const configPath = path.join(rootDir, "config", "global-defaults.json");
  let userChoice = "auto";
  let userPreset = null;
  let userResolution = "auto";
  let userFps = null;
  try {
    const raw = await readFile(configPath, "utf8");
    const cfg = JSON.parse(raw);
    const sr = (cfg && typeof cfg === "object" && cfg.serverRendering && typeof cfg.serverRendering === "object")
      ? cfg.serverRendering
      : {};
    if (typeof sr.encoder === "string") userChoice = sr.encoder;
    if (typeof sr.qualityPreset === "string") userPreset = sr.qualityPreset;
    if (typeof sr.resolutionPreference === "string") userResolution = sr.resolutionPreference;
    if (Number.isFinite(sr.fpsTarget)) userFps = sr.fpsTarget;
  } catch (err) {
    if (err && err.code !== "ENOENT") {
      logger.warn(`[ssr-host] could not parse config: ${err.message}`);
    }
  }

  // Phase 32 D-A3: read streamFpsCap + alignModeBoost from config block.
  // sr is already parsed above; access directly from the parsed cfg object.
  let userStreamFpsCap = 60;  // default per STREAM_FPS_CAP_DEFAULT
  let userAlignModeBoost = true;  // default per ALIGN_MODE_BOOST_DEFAULT
  try {
    const raw2 = await readFile(path.join(rootDir, "config", "global-defaults.json"), "utf8");
    const cfg2 = JSON.parse(raw2);
    const sr2 = (cfg2 && typeof cfg2 === "object" && cfg2.serverRendering && typeof cfg2.serverRendering === "object")
      ? cfg2.serverRendering
      : {};
    if (typeof sr2.streamFpsCap === "number" && Number.isFinite(sr2.streamFpsCap)) {
      userStreamFpsCap = sr2.streamFpsCap;
    }
    if (typeof sr2.alignModeBoost === "boolean") {
      userAlignModeBoost = sr2.alignModeBoost;
    }
  } catch {
    // config missing or unparseable — use defaults above
  }
  // effectiveStreamFpsCap: 0 = native (no cap) → use 60 as the actual constraint value.
  const effectiveStreamFpsCap = (userStreamFpsCap === 0) ? 60 : userStreamFpsCap;

  const available = await detectAvailableEncoders();
  logger.info(`[ssr-host] available encoders: ${available.join(", ")}`);

  let chosen;
  let source;
  if (userChoice === "auto") {
    chosen = pickPreferredEncoder(available);
    source = "auto";
  } else if (available.includes(userChoice)) {
    chosen = userChoice;
    source = "user";
  } else {
    logger.warn(
      `[ssr-host] user-selected encoder '${userChoice}' is not available on this host (available: ${available.join(", ")}); falling back to auto-pick`,
    );
    chosen = pickPreferredEncoder(available);
    source = "auto";
  }

  // Default preset depends on hardware capability per CONTEXT.md:
  //   NVENC/VAAPI/VideoToolbox present → "balanced"
  //   software-only                    → "low-latency" (conservative on weak CPUs)
  const defaultPreset = (chosen === "x264-software") ? "low-latency" : "balanced";
  const presetName = (userPreset && QUALITY_PRESETS[userPreset]) ? userPreset : defaultPreset;
  const preset = QUALITY_PRESETS[presetName];
  const fpsTarget = (userFps != null) ? userFps : preset.fpsTarget;

  logger.info(`[ssr-host] encoder=${chosen} source=${source}`);
  logger.info(
    `[ssr-host] qualityPreset=${presetName} bitrate=${preset.bitrate} fpsTarget=${fpsTarget} keyframeIntervalSec=${preset.keyframeIntervalSec}`,
  );
  logger.info(
    `[ssr-host] streamFpsCap=${userStreamFpsCap} effectiveStreamFpsCap=${effectiveStreamFpsCap} alignModeBoost=${userAlignModeBoost}`,
  );

  return {
    encoder: chosen,
    source,
    available,
    preset: presetName,
    bitrate: preset.bitrate,
    fpsTarget,
    keyframeIntervalSec: preset.keyframeIntervalSec,
    x264Preset: preset.x264Preset,
    resolutionPreference: userResolution,
    streamFpsCap: userStreamFpsCap,           // Phase 32 D-A3 (raw, incl. 0=native)
    effectiveStreamFpsCap,                    // Phase 32 D-A3 (resolved, 0→60)
    alignModeBoost: userAlignModeBoost,       // Phase 32 D-A2
  };
}

// ---------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------
const DEFAULT_DISPLAY = process.env.SSR_DISPLAY ?? ":99";
// DEFAULT_BROWSER_BIN is now resolved dynamically at boot via
// detectChromiumBinary() — see start(). The h0 hardcoded "/usr/bin/chromium"
// fallback was the source of the 2026-05-06 cross-platform issue
// (Ubuntu snap installs Chromium at /snap/bin/chromium, not /usr/bin/).
const DEFAULT_VIEWPORT = { width: 1920, height: 1080, deviceScaleFactor: 1 };
const HEALTH_PING_INTERVAL_MS = 5000;
const HEALTH_PING_FAIL_THRESHOLD = 3; // 3 * 5s = 15s
const RESTART_BACKOFF_MS_INITIAL = 1000;
const RESTART_BACKOFF_MS_MAX = 30000;

/**
 * @typedef {Object} SsrRenderHostStatus
 * @property {"idle"|"starting"|"running"|"reconnecting"|"stopping"|"crashed"} state
 * @property {number|null} xvfbPid
 * @property {boolean} browserConnected
 * @property {string|null} lastError
 * @property {number} restartCount
 * @property {object|null} encoderConfig
 */

/**
 * @typedef {Object} SsrRenderHost
 * @property {() => Promise<void>} start
 * @property {() => Promise<void>} stop
 * @property {() => Promise<void>} restart
 * @property {() => SsrRenderHostStatus} getStatus
 */

/**
 * Boot the SSR render host. Returns a control surface; if `autoStart` is
 * truthy (default), the host begins spawning processes immediately.
 *
 * @param {object} opts
 * @param {number} opts.port — required
 * @param {string} [opts.display]
 * @param {string} [opts.browserBin]
 * @param {{width:number, height:number, deviceScaleFactor:number}} [opts.viewport]
 * @param {boolean} [opts.autoStart]
 * @param {{info:Function, warn:Function, error:Function}} [opts.logger]
 * @returns {SsrRenderHost}
 */
export function bootSsrRenderHost({
  port,
  display = DEFAULT_DISPLAY,
  browserBin = null, // null → resolve at boot via detectChromiumBinary()
  viewport = DEFAULT_VIEWPORT,
  autoStart = true,
  logger = console,
} = {}) {
  if (!port) throw new Error("bootSsrRenderHost: `port` is required");

  /** @type {SsrRenderHostStatus} */
  const status = {
    state: "idle",
    xvfbPid: null,
    browserConnected: false,
    lastError: null,
    restartCount: 0,
    encoderConfig: null,
    osPlatform: platform(),
    needsXvfb: platform() === "linux" && !process.env.DISPLAY,
    resolvedBrowserPath: null,
    resolvedBrowserSource: null,
  };

  let xvfbProcess = null;
  let browser = null;
  let page = null;
  let cdpSession = null;
  let healthInterval = null;
  let healthFailCount = 0;
  let backoffMs = RESTART_BACKOFF_MS_INITIAL;
  let stopRequested = false;

  /**
   * h1: pick a free display number. /tmp/.X<N>-lock means display N is busy
   * (or stale-locked from a crashed Xvfb). Try the configured display first;
   * if locked, walk up to find a free one. Returns the display string used.
   */
  function pickFreeDisplay(preferred) {
    const tryDisplay = (n) => {
      const lockPath = `/tmp/.X${n}-lock`;
      if (!existsSync(lockPath)) return true;
      // Lock exists. Check whether the holding pid is still alive.
      try {
        const pid = parseInt(readFileSync(lockPath, "utf8").trim(), 10);
        if (Number.isFinite(pid) && pid > 0) {
          process.kill(pid, 0); // throws if pid is gone
          return false; // pid alive — display in use
        }
      } catch {
        // pid is gone — stale lock. Remove it and reuse the display.
        try { unlinkSync(lockPath); logger.info(`[ssr-host] removed stale Xvfb lock ${lockPath}`); } catch {}
        return true;
      }
      return false;
    };
    const m = (preferred || ":99").match(/^:(\d+)$/);
    const startN = m ? parseInt(m[1], 10) : 99;
    for (let n = startN; n < startN + 20; n += 1) {
      if (tryDisplay(n)) return `:${n}`;
    }
    return preferred || ":99"; // give up — let Xvfb spawn fail with a clear log
  }

  async function spawnXvfb() {
    const chosenDisplay = pickFreeDisplay(display);
    if (chosenDisplay !== display) {
      logger.info(`[ssr-host] display ${display} unavailable, using ${chosenDisplay} instead`);
      // Update the closure-bound display so launchBrowser inherits it via env.
      display = chosenDisplay;
    }
    return new Promise((resolve, reject) => {
      // Phase-31 h19 (2026-05-06): explicit X extensions for fps lift.
      // RANDR + RENDER + GLX are required for Chromium's compositor to
      // pick the GPU-accelerated path; without them the BeginFrameSource
      // falls back to a ~20 Hz software timer (h18 reported the cap
      // stayed at 21 fps despite --max-gum-fps + --disable-frame-rate-limit).
      // -ac disables host-based access control so the Chromium child
      // process doesn't ICE on auth handshake. -dpi 96 standardizes
      // pixel density (Chromium reads DPI for layout decisions).
      // Phase 32 D-A4: -fakescreenfps 120 lifts the BeginFrameSource above
      // the default (~25Hz), giving Chromium a 120Hz screen budget so the
      // rAF loop can reach 60fps. getXvfbArgs() is the canonical arg builder.
      const xvfbArgs = getXvfbArgs({ display: chosenDisplay, width: viewport.width, height: viewport.height });
      logger.info(`[ssr-host] Xvfb args: ${xvfbArgs.join(" ")}`);
      const proc = spawn("Xvfb", xvfbArgs, { stdio: ["ignore", "pipe", "pipe"] });
      let stderrTail = "";
      if (proc.stderr) {
        proc.stderr.on("data", (chunk) => {
          stderrTail = (stderrTail + chunk.toString("utf8")).slice(-512);
        });
      }
      proc.on("error", reject);
      proc.on("exit", (code, signal) => {
        if (!stopRequested && status.state !== "stopping") {
          const tail = stderrTail.split(/\r?\n/).filter(Boolean).slice(-2).join(" | ");
          logger.error(`[ssr-host] Xvfb exited unexpectedly code=${code} signal=${signal}${tail ? ` :: ${tail}` : ""}`);
          status.state = "reconnecting";
          status.lastError = `Xvfb exit ${code}/${signal}`;
          scheduleRestart();
        }
      });
      // Xvfb does not reliably signal readiness; small grace window.
      setTimeout(() => {
        if (proc.pid) {
          status.xvfbPid = proc.pid;
          resolve(proc);
        } else {
          reject(new Error("Xvfb failed to spawn (no pid)"));
        }
      }, 500);
    });
  }

  async function launchBrowser({ browserPath } = {}) {
    // Dynamic import so unit tests that don't have puppeteer-stream installed
    // can still import this module to test resolveEncoderConfig and idle-state.
    const puppeteerStream = await import("puppeteer-stream");
    const launcher = puppeteerStream.launch ?? puppeteerStream.default?.launch;
    if (typeof launcher !== "function") {
      throw new Error("puppeteer-stream did not export a launch() function");
    }
    // h4 hotfix (2026-05-06): app mode (no browser chrome at all — no
    // URL bar, no tabs, no menu) + popup suppression. The user reported
    // the captured stream was leaking the URL bar and tab strip, plus
    // any browser popups (translate, save-password, etc.) appeared in
    // the stream too. App-mode + the suppression flags below remove
    // every chrome surface so getDisplayMedia captures only the page.
    const ssrUrl = `http://127.0.0.1:${port}/output?ssr=1`;

    // Phase-31 h15 (2026-05-06): MERGED --disable-features / --enable-features.
    //
    // ROOT CAUSE of the GIF fetch hang: Chromium accepts only the LAST
    // `--disable-features=...` argument; passing the flag twice silently
    // discards the first set. We previously had:
    //
    //   --disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling,BackForwardCache
    //   --disable-features=Translate,TranslateUI,…
    //
    // Result: the h9 anti-occlusion / anti-throttle defenses NEVER took
    // effect. The Xvfb-headful SSR tab still got marked "occluded" by
    // Chromium, and once that flipped, the network service throttled the
    // renderer's outbound fetches — so malfunction.gif (loaded before the
    // throttle kicks in) succeeded, but burst.gif/fire.gif/slime.gif
    // (loaded a beat later) hung waiting for response headers FOREVER.
    // Same applies to --enable-features.
    //
    // Fix: build ONE `--disable-features=` and ONE `--enable-features=`
    // arg by merging all desired tokens. Hardware-agnostic — the merge
    // works the same on any host. Pairs with the helper module
    // src/server/static-resource-headers.mjs (Connection: close on
    // /resources/animations/*) and src/app/lib/shared/fetch-with-retry.js
    // (per-fetch abort+retry) for defense-in-depth.
    const disabledFeatures = [
      // h9 anti-throttle / anti-occlusion (was being silently dropped):
      "CalculateNativeWinOcclusion",
      "IntensiveWakeUpThrottling",
      "BackForwardCache",
      // h4 popup / infobar suppression so the captured frame is clean:
      "Translate",
      "TranslateUI",
      "PasswordManagerOnboarding",
      "InterestFeedV2",
      "AutofillServerCommunication",
    ];
    const hasIgpu = existsSync("/dev/dri/renderD128") || existsSync("/dev/dri/renderD129");
    const enabledFeatures = [
      ...(hasIgpu ? ["VaapiVideoEncoder", "VaapiVideoDecoder", "VaapiIgnoreDriverChecks"] : []),
      ...(status.encoderConfig?.encoder === "nvenc" ? ["H264HardwareEncode"] : []),
      ...(status.encoderConfig?.encoder === "videotoolbox" ? ["PlatformHEVCEncoderSupport"] : []),
      // h18: tab-capture fast-path lifts the implicit 30 fps cap on
      // getDisplayMedia tab capture. Pairs with --max-gum-fps=60 below
      // and the publisher's frameRate: { ideal: 60 } constraint.
      "TabCaptureFastPath",
    ];

    return launcher({
      executablePath: browserPath,
      headless: false, // CRITICAL: NOT --headless=new — disables WebRTC (RESEARCH § Pitfall 1)
      defaultViewport: viewport,
      ignoreDefaultArgs: ["--enable-automation"],
      args: [
        "--no-sandbox",
        "--autoplay-policy=no-user-gesture-required", // RESEARCH § Pitfall 5
        // Phase-31 h19 (2026-05-06): explicit ozone platform = x11.
        // Chromium's auto-pick under Xvfb sometimes falls through to
        // headless ozone, which caps the BeginFrameSource at ~20 Hz
        // (matching the user-reported 21 fps cap). x11 binding routes
        // frame production through the Xvfb display server's vsync,
        // which can hit higher rates given the +extension flags h19
        // also adds.
        "--ozone-platform=x11",
        // h7: let Chromium auto-detect GL backend — SwiftShader was
        // catastrophically slow (4 fps + tearing). egl + ignore-gpu-blocklist
        // (added below if iGPU present) lets libva use the iGPU.
        "--use-gl=egl",
        "--enable-unsafe-swiftshader",
        "--disable-dev-shm-usage",
        // h9: anti-throttling. These individual --disable-X flags are
        // separate from the merged --disable-features below. Both layers
        // together prevent Chromium from treating the Xvfb-headful tab
        // as background/occluded.
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-ipc-flooding-protection",
        // h10: lift fps cap. Chromium's software BeginFrameSource caps
        // ~20-30 Hz under Xvfb without these.
        "--disable-gpu-vsync",
        "--disable-frame-rate-limit",
        // h18 (2026-05-06): explicit getUserMedia / getDisplayMedia
        // frame-rate cap. Chromium's MediaStreamVideoSource defaults to
        // 30 fps even when the constraint says 60 — this flag lifts the
        // hard cap so the constraint can take effect. (TabCaptureFastPath
        // is in the merged --enable-features below.)
        "--max-gum-fps=60",
        `--app=${ssrUrl}`,
        `--window-size=${viewport.width},${viewport.height}`,
        "--window-position=0,0",
        "--start-fullscreen",
        // h4: tab-capture, page-only (no chrome surfaces in the stream).
        "--auto-select-tab-capture-source-by-title=TableTop Beamer",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-default-apps",
        // h4.1: do NOT --disable-extensions — puppeteer-stream's MV3
        // extension is required for getDisplayMedia tab capture.
        "--disable-prompt-on-repost",
        "--disable-popup-blocking",
        "--disable-notifications",
        "--disable-sync",
        "--mute-audio", // server doesn't play audio (D-D2 reversal — Pi-local)
        "--hide-crash-restore-bubble",
        "--disable-session-crashed-bubble",
        "--disable-infobars",
        // ONE merged --disable-features arg (multiple instances would be
        // silently overwritten — see h15 root-cause comment above).
        `--disable-features=${disabledFeatures.join(",")}`,
        // ONE merged --enable-features arg, only emit if non-empty.
        ...(enabledFeatures.length > 0 ? [`--enable-features=${enabledFeatures.join(",")}`] : []),
        // h5: companion flags only meaningful when the iGPU is present.
        ...(hasIgpu ? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : []),
        `--display=${display}`,
      ],
      env: { ...process.env, DISPLAY: display },
    });
  }

  async function startHealthPings() {
    if (healthInterval) clearInterval(healthInterval);
    healthFailCount = 0;
    healthInterval = setInterval(async () => {
      if (!cdpSession || stopRequested) return;
      try {
        const res = await cdpSession.send("Runtime.evaluate", {
          expression: "1+1",
          returnByValue: true,
        });
        if (res?.result?.value === 2) {
          healthFailCount = 0;
        } else {
          healthFailCount += 1;
        }
      } catch (err) {
        healthFailCount += 1;
        logger.warn(
          `[ssr-host] health ping failed (${healthFailCount}/${HEALTH_PING_FAIL_THRESHOLD}): ${err.message}`,
        );
      }
      if (healthFailCount >= HEALTH_PING_FAIL_THRESHOLD) {
        logger.error(`[ssr-host] health ping threshold breached, relaunching`);
        scheduleRestart();
      }
    }, HEALTH_PING_INTERVAL_MS);
  }

  function stopHealthPings() {
    if (healthInterval) {
      clearInterval(healthInterval);
      healthInterval = null;
    }
  }

  function scheduleRestart() {
    if (stopRequested) return;
    if (status.state === "reconnecting") return; // already in flight
    status.state = "reconnecting";
    status.restartCount += 1;
    const delay = backoffMs;
    backoffMs = Math.min(backoffMs * 2, RESTART_BACKOFF_MS_MAX);
    logger.info(`[ssr-host] restarting in ${delay}ms (attempt ${status.restartCount})`);
    sleep(delay).then(async () => {
      if (stopRequested) return;
      try {
        await teardown();
        await start();
        backoffMs = RESTART_BACKOFF_MS_INITIAL;
      } catch (err) {
        logger.error(`[ssr-host] restart failed: ${err.message}`);
        status.lastError = err.message;
        scheduleRestart(); // exponential backoff continues
      }
    });
  }

  async function start() {
    if (status.state === "running" || status.state === "starting") return;
    stopRequested = false;
    status.state = "starting";
    status.lastError = null;
    try {
      // h1 hotfix (2026-05-06): cross-platform environment probe BEFORE
      // anything else. Logs OS, browser path, Xvfb status, install hints
      // when something is missing. Auto-installs if SSR_AUTO_INSTALL=1.
      const envReport = await probeEnvironment({ logger });
      logger.info(formatEnvironmentReport(envReport));
      if (!envReport.ready) {
        const missing = [];
        if (envReport.needsVirtualDisplay && !envReport.hasVirtualDisplay) missing.push("Xvfb");
        if (!envReport.browserPath) missing.push("Chromium-family browser");
        if (!envReport.hasFfmpeg) missing.push("ffmpeg");
        throw new Error(
          `[ssr-host] Environment not ready: missing ${missing.join(", ")}. ` +
          `See [ssr-env] log lines above for OS-specific install commands.`,
        );
      }

      // Resolve browser binary cross-platform (env override → puppeteer
      // bundled → OS common paths). Honors explicit browserBin opt only if
      // the file actually exists.
      const browserDetect = browserBin
        ? { path: browserBin, source: "explicit", availablePaths: [] }
        : await detectChromiumBinary();
      if (!browserDetect.path) {
        throw new Error(
          `[ssr-host] No Chromium-family browser found. Set SSR_BROWSER_BIN to override, ` +
          `or run: npx puppeteer browsers install chrome`,
        );
      }
      status.resolvedBrowserPath = browserDetect.path;
      status.resolvedBrowserSource = browserDetect.source;
      logger.info(
        `[ssr-host] browser path resolved: ${browserDetect.path} (source=${browserDetect.source})`,
      );

      // Resolve encoder + preset BEFORE spawning anything (publishability).
      status.encoderConfig = await resolveEncoderConfig({
        rootDir: process.env.SSR_ROOT_DIR ?? process.cwd(),
        logger,
      });

      // Xvfb only on Linux without DISPLAY. macOS + Windows have native desktops.
      if (status.needsXvfb) {
        xvfbProcess = await spawnXvfb();
      } else {
        logger.info(
          `[ssr-host] skipping Xvfb (os=${status.osPlatform}` +
          (process.env.DISPLAY ? `, DISPLAY=${process.env.DISPLAY}` : "") +
          `)`,
        );
      }
      browser = await launchBrowser({ browserPath: browserDetect.path });
      page = await browser.newPage();
      // h9: forward SSR-Tab console messages + page errors to server log so
      // debugging the in-tab runtime doesn't require a separate DevTools.
      // Filter spammy `[ssr-publisher]` echo since we already log those.
      page.on?.("console", (msg) => {
        try {
          const t = msg.type();
          const text = msg.text();
          if (text.startsWith("[ssr-publisher]")) return; // already logged
          const fn = (t === "error" ? logger.error : t === "warning" ? logger.warn : logger.info).bind(logger);
          fn(`[ssr-tab:${t}] ${text.slice(0, 800)}`);
        } catch {}
      });
      page.on?.("pageerror", (err) => {
        try { logger.error(`[ssr-tab:pageerror] ${err?.stack ?? err?.message ?? err}`); } catch {}
      });
      page.on?.("requestfailed", (req) => {
        try { logger.warn(`[ssr-tab:reqfailed] ${req.url()} :: ${req.failure()?.errorText ?? "?"}`); } catch {}
      });
      cdpSession = await page.target().createCDPSession();
      await page.goto(`http://127.0.0.1:${port}/output?ssr=1`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      status.browserConnected = true;
      status.state = "running";
      // Plan 02: opt-in WebRTC publisher injection. Gated separately
      // from SSR_RENDER_HOST so Plan 01's tab-only smoke can still run
      // without mediasoup being available.
      if (process.env.SSR_PUBLISH === "1") {
        try {
          // h18: thread encoder config to the publisher so it can pick a
          // single-layer encoding when running on x264-software (3-layer
          // simulcast triples encode CPU on a software encoder; for
          // hardware encoders the cost is amortized in fixed-function
          // silicon and simulcast is fine).
          const producers = await injectInPagePublisher(page, {
            logger,
            encoderConfig: status.encoderConfig,
            effectiveStreamFpsCap: status.encoderConfig?.effectiveStreamFpsCap ?? 60,
            alignModeBoost: status.encoderConfig?.alignModeBoost ?? true,
          });
          status.producerIds = producers;
        } catch (err) {
          logger.error(`[ssr-host] in-page publisher failed: ${err.message}`);
          status.lastError = err.message;
          // Do NOT crash the whole host — the tab is still up; let the
          // health-ping decide whether to relaunch.
        }
      }
      browser.on("disconnected", () => {
        status.browserConnected = false;
        if (!stopRequested) {
          logger.error("[ssr-host] browser disconnected unexpectedly");
          scheduleRestart();
        }
      });
      await startHealthPings();
    } catch (err) {
      status.lastError = err.message;
      status.state = "crashed";
      await teardown();
      throw err;
    }
  }

  async function teardown() {
    stopHealthPings();
    try { if (cdpSession) await cdpSession.detach().catch(() => {}); } catch {}
    cdpSession = null;
    try { if (browser) await browser.close().catch(() => {}); } catch {}
    browser = null;
    page = null;
    try {
      if (xvfbProcess && xvfbProcess.pid) {
        xvfbProcess.kill("SIGTERM");
        // Give it 1s to die, then SIGKILL.
        await new Promise((r) => setTimeout(r, 1000));
        try { process.kill(xvfbProcess.pid, 0); xvfbProcess.kill("SIGKILL"); } catch {}
      }
    } catch {}
    xvfbProcess = null;
    status.xvfbPid = null;
    status.browserConnected = false;
  }

  async function stop() {
    stopRequested = true;
    status.state = "stopping";
    await teardown();
    status.state = "idle";
  }

  async function restart() {
    await stop();
    stopRequested = false;
    await start();
  }

  function getStatus() {
    return { ...status };
  }

  const host = { start, stop, restart, getStatus };

  if (autoStart) {
    start().catch((err) => logger.error(`[ssr-host] autoStart failed: ${err.message}`));
  }

  return host;
}

// ---------------------------------------------------------------------
// Active-host registry for graceful shutdown wired from server.mjs.
// ---------------------------------------------------------------------
let activeHost = null;

export function getActiveSsrRenderHost() {
  return activeHost;
}

export function setActiveSsrRenderHost(host) {
  activeHost = host;
}

export async function shutdownSsrRenderHost() {
  if (activeHost) {
    await activeHost.stop();
    activeHost = null;
  }
}

// Re-export the priority array so consumers can introspect without
// importing two modules.
export { ENCODER_PRIORITY };
