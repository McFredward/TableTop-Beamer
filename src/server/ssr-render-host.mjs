// src/server/ssr-render-host.mjs
//
// Phase 31 Plan 01 — Wave 1: SSR render-host bring-up.
// Spawns Xvfb + headful Chromium via puppeteer-stream, navigates the tab to
// http://127.0.0.1:${PORT}/ssr (Phase 34 D-04 route split), manages
// the lifecycle (start/stop/restart, CDP health-ping every 5s, 3 consecutive
// failures → relaunch).
//
// Phase 34 D-04: the SSR tab is now identified at server-route level by
// pathname /ssr; the legacy `?ssr=1` query is tolerated by runtime-env.js
// but no longer emitted by this module. Both navigation sites (ssrUrl
// constant below and page.goto call in launchBrowser) use /ssr.
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
// `--use-gl=egl` for GPU-accelerated canvas.
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
 * Phase 32 D-A4 root-cause fix: `-fakescreenfps 60` lifts the Xvfb
 * BeginFrameSource above its default (~25 Hz), giving Chromium a 60 Hz
 * screen budget so the rAF loop can reach 60 fps. Without this flag the
 * BeginFrameSource caps at ~25 Hz regardless of --disable-frame-rate-limit.
 *
 * Phase 32 hotfix h3 (2026-05-07): tightened from 120 → 60 Hz.
 * 120 caused two regressions: (1) outside-mp4 (sandstorm.mp4) decode
 * pipeline went black — Composite extension + VaapiVideoDecoder
 * buffer-recycle race with the over-aggressive screen tick; (2) actual
 * stream fps did NOT lift to 60+ despite the higher fakescreen target.
 * 60 Hz matches our publisher's `getDisplayMedia({ frameRate: { max: 60 } })`
 * — no benefit going higher and several drawbacks.
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
    "-fakescreenfps", "60",  // Phase 32 D-A4 root-cause + h3: lift Xvfb BeginFrameSource above default ~25Hz; matches publisher's 60-fps cap (was 120; broke mp4 + did not help)
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
  // Phase 42: extra-high / ultra-high — operator opt-in for cleaner
  // textures on LAN setups with hardware encoders. x264-software at
  // ≥16 Mbit/s costs noticeable CPU; only pick on capable hosts.
  "extra-high":   { bitrate: 16_000_000, fpsTarget: 30, keyframeIntervalSec: 2, x264Preset: "fast"      },
  "ultra-high":   { bitrate: 20_000_000, fpsTarget: 30, keyframeIntervalSec: 2, x264Preset: "medium"    },
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
  let userStreamFpsCap = 60;
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
    if (typeof sr.streamFpsCap === "number" && Number.isFinite(sr.streamFpsCap)) {
      userStreamFpsCap = sr.streamFpsCap;
    }
  } catch (err) {
    if (err && err.code !== "ENOENT") {
      logger.warn(`[ssr-host] could not parse config: ${err.message}`);
    }
  }

  // Phase 32 D-A3: effectiveStreamFpsCap. 0 = native (no cap) → 60 actual constraint.
  const effectiveStreamFpsCap = (userStreamFpsCap === 0) ? 60 : userStreamFpsCap;

  let available = await detectAvailableEncoders();
  // Phase 33 iter-4c (2026-05-09): VAAPI hardware encoder default-off.
  // Observed on user's gaming PC: VAAPI encoder hot-loop starves the
  // SSR-tab's main thread, CDP probes time out, consumers can't
  // negotiate WebRTC → endless reconnect loop. Set SSR_ENABLE_VAAPI=1
  // to opt back in. NVENC/VideoToolbox unaffected.
  if (process.env.SSR_ENABLE_VAAPI !== "1") {
    available = available.filter((e) => e !== "vaapi");
  }
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
    `[ssr-host] streamFpsCap=${userStreamFpsCap} effectiveStreamFpsCap=${effectiveStreamFpsCap}`,
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
// Phase 33 iter-4 (2026-05-09): bumped 3→12 ticks (15s→60s tolerance).
// User's gaming-PC server log showed the watchdog killing healthy tabs
// during slime.gif decode + heavy H264 encode bursts (CDP probes timeout
// 3× → "Target closed" → tab killed → publisher reset → consumer never
// gets stable stream). 60s tolerance allows the SSR-tab to do legitimate
// 30s+ heavy work without being prematurely killed. The publisher-WS
// freshness check (below) is the PRIMARY liveness signal — CDP probe is
// a backstop for the BUG-B case (publisher WS dropped + Chromium alive).
// Phase 33 iter-4: watchdog disarmed by default — 30 ticks = 150s, meaning
// only a genuine 2.5min freeze triggers a relaunch. Pre-Phase-33 SSR worked
// fine WITHOUT a watchdog at all; we keep the safety net for the BUG-B
// (publisher-WS-dropped-but-CDP-alive) edge case while accepting that
// transient SSR-tab freezes (slime.gif decode bursts, encode pressure)
// resolve themselves without restart. Pre-Phase-32 testing showed the
// watchdog was killing healthy tabs during normal load bursts.
const HEALTH_PING_FAIL_THRESHOLD = 30; // 30 * 5s = 150s
const PUBLISHER_WS_FRESH_MS = 60000;   // trust publisher heartbeat up to 60s old
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
  // Phase 33 Plan 01-T3 (Suspect 7): optional callback used to broadcast
  // `render-host-down` to all WebRTC consumers when health-ping detects a
  // dead Chromium tab. Wired by server.mjs via `signalingState.broadcastRenderHostDown`.
  // No-op by default so unit tests that boot the host in isolation are unaffected.
  onHostDown = null,
  // Phase 33 Plan 02-T2 (Suspect 6): optional accessor for the age (ms) of
  // the publisher-WS's last ssr-fps/ssr-stats envelope. When CDP is healthy
  // (Chromium tab process still alive) but the timestamp is stale, the
  // publisher WS dropped silently and the host must restart — closing
  // BUG-B from phase-32-connect-head-trace.md. The signaling layer's
  // tri-state contract (-1 / Infinity / finite ms) is honored: -1 means
  // "publisher has never connected" (cold-boot window) → DO NOT fire.
  //
  // Default threshold of 45 s gives legitimate event-loop starvation
  // bursts (heavy GIF decode, large mp4 preload, garbage-collection
  // pauses) ample headroom. The publisher script's ssr-fps setInterval
  // runs at 1 s on the JS thread; under heavy load (e.g. decoding a 22 MB
  // slime.gif during initial board-load) the thread can stall for 10-15 s
  // while WebSockets continue to flow at TCP layer. 45 s ensures the
  // watchdog only fires on genuine BUG-B (publisher WS truly dropped).
  getPublisherWsAgeMs = null,
  publisherWsStaleThresholdMs = Number(process.env.SSR_PUBLISHER_WS_STALE_MS ?? 180000),
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
  // Phase 33 Plan 02-T2 (Suspect 6): debounce watchdog fires + onHostDown
  // broadcasts. Once the watchdog declares the publisher stale we want
  // EXACTLY ONE render-host-down broadcast and EXACTLY ONE scheduleRestart;
  // the next watchdog probe should not re-fire until a successful start()
  // resets it. Same logic for onHostDown across the three invocation
  // paths (CDP-fail / browser-disconnected / publisher-WS-stale).
  let onHostDownLatched = false;

  /**
   * Phase 33 Plan 02-T2 (Suspect 6): single entry point for emitting the
   * `render-host-down` broadcast. Latched so the three trigger paths
   * (CDP fail × 3, browser.disconnected, publisher-WS stale) emit at most
   * once until the next successful start(). `reason` is logged to make
   * sequence-debugging easier.
   */
  function fireHostDown(reason) {
    if (onHostDownLatched) return false;
    onHostDownLatched = true;
    logger.error(`[ssr-host] host-down latched (reason=${reason})`);
    if (typeof onHostDown === "function") {
      try { onHostDown(); } catch (err) {
        logger.warn(`[ssr-host] onHostDown threw: ${err?.message ?? err}`);
      }
    }
    return true;
  }

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
    // Phase 34 D-04: SSR Chromium tab navigates to /ssr (full app HTML).
    // /output is now the thin consumer route (output.html). The legacy
    // `?ssr=1` query is no longer used as a runtime discriminator —
    // runtime-env.js classifies pathname /ssr as "server-ssr" (34-B Task 1).
    const ssrUrl = `http://127.0.0.1:${port}/ssr`;

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
    // Phase 34 D-01 (Track A): decouple iGPU-device presence (relevant for
    // GL-helpful Chrome flags) from VAAPI opt-in (relevant for
    // VaapiVideoEncoder feature). Pre-Phase-34 the two were gated by a
    // single `hasIgpu` constant that required SSR_ENABLE_VAAPI=1 — which
    // meant the GL-helpful flags --ignore-gpu-blocklist and
    // --enable-gpu-rasterization were NEVER added in the default
    // (VAAPI-disabled) configuration, even when an iGPU was physically
    // present. Result: ANGLE fell through to llvmpipe/SwiftShader, the
    // mesh-warp WebGL context was unstable, the runtime fell back to 2D
    // canvas, and the user saw banding in solid-color animations.
    //
    // Phase 33 iter-4c (commit 3cd6748) carry-forward: VAAPI is still
    // default-DISABLED (D-06 hard lock). VAAPI re-enable is opt-in via
    // SSR_ENABLE_VAAPI=1 — UNCHANGED.
    const hasIgpuDev =
      existsSync("/dev/dri/renderD128") || existsSync("/dev/dri/renderD129");
    const hasVaapiEnabled =
      process.env.SSR_ENABLE_VAAPI === "1" && hasIgpuDev;

    const enabledFeatures = [
      // VAAPI features ONLY when explicitly enabled (D-06 lock).
      ...(hasVaapiEnabled ? ["VaapiVideoEncoder", "VaapiVideoDecoder", "VaapiIgnoreDriverChecks"] : []),
      ...(status.encoderConfig?.encoder === "nvenc" ? ["H264HardwareEncode"] : []),
      ...(status.encoderConfig?.encoder === "videotoolbox" ? ["PlatformHEVCEncoderSupport"] : []),
      // h18: tab-capture fast-path lifts the implicit 30 fps cap on
      // getDisplayMedia tab capture. Pairs with --max-gum-fps=60 below
      // and the publisher's frameRate: { ideal: 60 } constraint.
      "TabCaptureFastPath",
    ];

    // Phase 46 iter15 (2026-05-17): Windows-specific launch tweaks.
    // Operator UAT: on Win11 with their normal Chrome already running,
    // the SSR launch entered a crash loop — chrome.exe ATTACHED to the
    // user's existing Chrome (single-instance behaviour), forwarded the
    // --app=URL there, and the puppeteer-launched process exited. The
    // dev tools connection failed → ERR_ABORTED → restart loop, with
    // white "/ssr"-titled tabs piling up in the user's normal browser.
    //
    // Defenses (Windows only):
    //   1. force a unique --user-data-dir under tmp so Chrome can't
    //      attach to an existing profile (the user-data-dir IS the
    //      single-instance key)
    //   2. use --app=about:blank instead of the real /ssr URL — the
    //      subsequent page.goto navigates the puppeteer-owned tab,
    //      and about:blank is safe to load if it ever leaks
    //   3. skip --ozone-platform=x11 (Linux-only; on Windows Chrome
    //      logs a warning and ignores it but better to be explicit)
    //   4. skip --start-fullscreen and shove the window off-screen via
    //      --window-position so it can't pop up over the operator's
    //      desktop while the SSR pipeline is running
    const isWin32 = process.platform === "win32";
    let winUserDataDir = null;
    if (isWin32) {
      try {
        const tmp = (await import("node:os")).tmpdir();
        const path = await import("node:path");
        const fsMod = await import("node:fs/promises");
        winUserDataDir = path.join(tmp, `ttb-ssr-${process.pid}-${Date.now()}`);
        await fsMod.mkdir(winUserDataDir, { recursive: true });
      } catch (e) {
        logger.warn(`[ssr-host] could not create temp user-data-dir: ${e.message}`);
      }
    }

    return launcher({
      executablePath: browserPath,
      headless: false, // CRITICAL: NOT --headless=new — disables WebRTC (RESEARCH § Pitfall 1)
      defaultViewport: viewport,
      ignoreDefaultArgs: ["--enable-automation"],
      // userDataDir at the Puppeteer-options level so puppeteer-stream
      // also honors it for its own bookkeeping. Linux path retains
      // puppeteer's auto-generated temp dir (no-op when undefined).
      ...(winUserDataDir ? { userDataDir: winUserDataDir } : {}),
      args: [
        "--no-sandbox",
        "--autoplay-policy=no-user-gesture-required", // RESEARCH § Pitfall 5
        // Linux only: explicit ozone platform = x11 for Xvfb binding.
        // Phase-31 h19. On Windows Chrome ignores it (different display
        // backend), but suppress to keep the launch arg list clean.
        ...(isWin32 ? [] : ["--ozone-platform=x11"]),
        // Chrome 131 ("Chrome for Testing", the bundled puppeteer binary)
        // removed support for --use-gl=egl. Without --use-gl=angle the
        // GPU process crashes at launch and Chromium silently falls back to
        // SwiftShader, which collapses to 2-5 fps compositor output under
        // animation load — heartbeats stale, consumer reconnects forever.
        // ANGLE abstraction lands on Mesa llvmpipe under Xvfb and reaches
        // ~60 fps with mp4 decode working. ignore-gpu-blocklist +
        // enable-gpu-rasterization are appended below only when VAAPI is
        // explicitly enabled (D-06 lock).
        "--use-gl=angle",
        "--use-angle=default",
        "--enable-unsafe-swiftshader",
        "--disable-dev-shm-usage",
        // Anti-throttling: prevent Chromium from treating the Xvfb-headful
        // tab as background/occluded.
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-ipc-flooding-protection",
        // Lift fps cap. Chromium's software BeginFrameSource caps ~20-30 Hz
        // under Xvfb without these.
        "--disable-gpu-vsync",
        "--disable-frame-rate-limit",
        // Explicit getUserMedia / getDisplayMedia frame-rate cap.
        // Chromium's MediaStreamVideoSource defaults to 30 fps even when
        // the constraint says 60; this flag lifts the hard cap so the
        // 60-fps publisher constraint can take effect.
        "--max-gum-fps=60",
        // Phase 46 iter15 Windows fix: --app=about:blank on Win to avoid
        // single-instance-attach hijack. page.goto navigates the
        // puppeteer-owned tab to /ssr immediately after launch (line
        // ~840). On Linux keep the direct app-URL form (works fine).
        isWin32 ? "--app=about:blank" : `--app=${ssrUrl}`,
        `--window-size=${viewport.width},${viewport.height}`,
        // Windows: shove the window off-screen instead of fullscreen so
        // it doesn't take over the operator's desktop. Linux fullscreen
        // under Xvfb is invisible anyway.
        isWin32 ? "--window-position=-32000,-32000" : "--window-position=0,0",
        ...(isWin32 ? [] : ["--start-fullscreen"]),
        // Tab-capture, page-only (no chrome surfaces in the stream).
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
        // Phase 34 hotfix h2 (2026-05-10) — REVERT 34-A T1 GL-flag decoupling.
        //
        // Track A T1 moved --ignore-gpu-blocklist and --enable-gpu-rasterization
        // off the VAAPI gate so they fired whenever an iGPU DRI device existed.
        // The hypothesis was that those flags were the missing piece for GL on
        // Mesa-llvmpipe under Xvfb. The actual effect on this hardware:
        // Chrome's GPU process attempts hardware paint paths through Mesa
        // llvmpipe, which has the SAME synchronous-flush behavior as VAAPI
        // (Phase 33 root cause) — the SSR-tab JS main thread blocks for 4+s
        // at a stretch, CDP health-pings time out, the publisher's getDisplay-
        // Media frame pump stalls, and consumers see "connecting forever"
        // with no video. User-confirmed regression on /output/ UAT.
        //
        // Restore Phase 33 baseline: GL flags gated on VAAPI opt-in, same as
        // pre-Phase-34. The 2D-fallback / banding visual issue (Track A's
        // original target) is reverted to its pre-Phase-34 state — that is a
        // visual quality issue, not a connection-stability blocker. We trade
        // it back for a working stream. Re-enable via SSR_ENABLE_VAAPI=1 at
        // the operator's discretion (same opt-in as VAAPI itself).
        ...(hasVaapiEnabled ? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : []),
        `--display=${display}`,
      ],
      env: { ...process.env, DISPLAY: display },
    });
  }

  async function startHealthPings() {
    if (healthInterval) clearInterval(healthInterval);
    healthFailCount = 0;
    healthInterval = setInterval(async () => {
      // Phase 33 Plan 02-T2: hard-skip the entire health/watchdog tick
      // when the host is mid-reconnect or shutting down. Without this, a
      // tick that arrives during teardown() / start() would (a) try to
      // probe a torn-down cdpSession and increment healthFailCount, or
      // (b) trigger the publisher-WS watchdog because the publisher has
      // not yet re-connected to the fresh ssr-tab.
      if (!cdpSession || stopRequested) return;
      if (status.state !== "running") return;

      // Phase 33 iter-4 (2026-05-09): publisher-WS heartbeat is the REAL
      // liveness signal. If the publisher script is sending heartbeats over
      // its WebSocket, the SSR-tab is responsive at the application level
      // even if a single CDP Runtime.evaluate happens to be slow (e.g.
      // because the tab is in the middle of decoding a 22MB GIF — this is
      // the slime.gif decode burst the user reported as the trigger for
      // the "RECONNECTING loop"). When the publisher heartbeat is fresh
      // (<10s ago), trust it and skip the CDP probe entirely. This makes
      // the watchdog much more tolerant of legitimate load bursts while
      // still catching the BUG-B failure (publisher WS dropped + CDP
      // responsive) via the explicit publisherWsAge check below.
      const _wsAge = typeof getPublisherWsAgeMs === "function"
        ? getPublisherWsAgeMs() : -1;
      if (_wsAge >= 0 && _wsAge < PUBLISHER_WS_FRESH_MS) {
        // Publisher heartbeat fresh → tab is alive at the app layer. Reset
        // any accumulated CDP-fail count and don't even probe CDP.
        healthFailCount = 0;
      } else {
        // No fresh publisher heartbeat — fall through to CDP probe.
        // Use Promise.race with explicit 4s timeout so the tick doesn't
        // hang on puppeteer's default 180s protocolTimeout when the tab
        // is genuinely unresponsive. Failing fast lets the threshold
        // (HEALTH_PING_FAIL_THRESHOLD * HEALTH_PING_INTERVAL_MS = 15s)
        // actually mean what it says.
        try {
          const res = await Promise.race([
            cdpSession.send("Runtime.evaluate", {
              expression: "1+1", returnByValue: true,
            }),
            new Promise((_, rej) => setTimeout(
              () => rej(new Error("cdp-ping-timeout-4s")), 4000,
            )),
          ]);
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
      }
      if (healthFailCount >= HEALTH_PING_FAIL_THRESHOLD) {
        logger.error(`[ssr-host] health ping threshold breached, relaunching`);
        // Phase 33 Plan 01-T3 (Suspect 7): notify all consumers BEFORE the
        // restart sleep so their UI flips to the "Render host crashed" overlay
        // instead of the generic "Reconnecting…" countdown. Latched so the
        // next health-ping tick doesn't double-fire the broadcast.
        fireHostDown(`cdp-fail-${healthFailCount}/${HEALTH_PING_FAIL_THRESHOLD}`);
        scheduleRestart();
        return;
      }

      // Phase 33 Plan 02-T2 (Suspect 6): publisher-WS watchdog. Detects
      // BUG-B from phase-32-connect-head-trace.md — Chromium tab process
      // is still alive (CDP responsive) but the publisher's WebSocket to
      // /api/webrtc/signal dropped silently, so state.videoProducer is
      // null forever and consumers loop on `no-producer-yet`. The CDP
      // health-ping above CANNOT detect this; the only signal is the
      // absence of ssr-fps / ssr-stats envelopes from the ssr-tab role.
      //
      // We only fire when CDP is healthy (`healthFailCount === 0`); if
      // CDP is failing the threshold-breach path above will restart anyway.
      if (typeof getPublisherWsAgeMs === "function" && healthFailCount === 0) {
        let pubAge;
        try { pubAge = getPublisherWsAgeMs(); } catch { pubAge = -1; }
        // Tri-state contract (signaling.getPublisherWsAgeMs):
        //   * -1: publisher has NEVER connected (cold-boot window). DO NOT
        //         fire watchdog — the CDP-fail path or browser.disconnected
        //         catches real cold-boot failures.
        //   * Infinity: publisher connected then disconnected (WS closed).
        //         FIRE watchdog — this is the BUG-B failure mode.
        //   * finite ms: time since last ssr-fps/ssr-stats. FIRE if >threshold.
        const stale = (pubAge === Infinity) ||
          (Number.isFinite(pubAge) && pubAge > publisherWsStaleThresholdMs);
        if (stale) {
          const ageDesc = pubAge === Infinity ? "WS-closed" : `${Math.round(pubAge)}ms`;
          logger.error(
            `[ssr-host] publisher WS stale (age=${ageDesc} > ${publisherWsStaleThresholdMs}ms) — CDP healthy but publisher dropped, restarting render-host (BUG-B)`,
          );
          fireHostDown(`publisher-ws-stale-${ageDesc}`);
          scheduleRestart();
        }
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
      // Phase 33 Plan 02-T2 (race fix): wire browser.on("disconnected") IMMEDIATELY
      // after launch — BEFORE any further `await` (newPage / page.goto / publisher
      // injection). Otherwise a fast Chromium kill during start()'s tail (~5-15s
      // window of awaits) leaves the disconnect listener un-registered, so
      // fireHostDown never fires for that kill. The watchdog ALSO can't catch it
      // because publisherHasEverConnected stays false during the boot window.
      // Result: stress-run #4 saw `renderHostDown=0` after killSsrTab — fixed here.
      browser.on("disconnected", () => {
        status.browserConnected = false;
        if (!stopRequested) {
          logger.error("[ssr-host] browser disconnected unexpectedly");
          // Phase 33 Plan 01-T3 (Suspect 7): same render-host-down broadcast
          // as the health-ping breach path — Chromium-process-died is the
          // analogous "host gone" event from the consumer's POV. Latched.
          fireHostDown("browser-disconnected");
          scheduleRestart();
        }
      });
      page = await browser.newPage();
      // Forward SSR-tab errors + warnings to the server log so debugging
      // the in-tab runtime doesn't require a separate DevTools. Info/log
      // levels are suppressed by default (too noisy at steady-state);
      // enable with SSR_TAB_CONSOLE_VERBOSE=1 if needed.
      page.on?.("console", (msg) => {
        try {
          const t = msg.type();
          const text = msg.text();
          if (text.startsWith("[ssr-publisher]")) return; // already logged
          if (t !== "error" && t !== "warning" && process.env.SSR_TAB_CONSOLE_VERBOSE !== "1") return;
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
      // Phase 34 D-04: same /ssr route as the launch URL above. Two sites kept
      // in lockstep — see Pitfall 3 in 34-RESEARCH.md.
      await page.goto(`http://127.0.0.1:${port}/ssr`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      status.browserConnected = true;
      status.state = "running";
      // Phase 44: publisher injection is always-on (SSR is the only render
      // path). The previous SSR_PUBLISH=1 gating is retired.
      {
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
          });
          status.producerIds = producers;
        } catch (err) {
          logger.error(`[ssr-host] in-page publisher failed: ${err.message}`);
          status.lastError = err.message;
          // Do NOT crash the whole host — the tab is still up; let the
          // health-ping decide whether to relaunch.
        }
      }
      // Phase 33 Plan 02-T2: clear the latch on a clean start so the next
      // genuine host-down event can fire its broadcast. The disconnect
      // listener is now wired immediately after launchBrowser() (above)
      // so this latch reset is the LAST thing before health-pings start —
      // any disconnect in the publisher-injection window has already been
      // handled by the early-registered listener.
      onHostDownLatched = false;
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

  // Phase 38 W0 diagnostic: evaluate a JS expression inside the SSR tab via
  // CDP and return the value. Used by /api/diag/ssr-eval to verify the SSR
  // tab's actual runtime state (e.g. grid.points after a broadcast) without
  // depending on console log scraping. Returns null if the CDP session is
  // not currently attached.
  async function evaluateInTab(expression, { timeoutMs = 2000 } = {}) {
    if (!cdpSession) return { ok: false, reason: "no-cdp-session" };
    try {
      const res = await Promise.race([
        cdpSession.send("Runtime.evaluate", {
          expression,
          returnByValue: true,
          awaitPromise: true,
        }),
        new Promise((_, rej) => setTimeout(
          () => rej(new Error(`cdp-eval-timeout-${timeoutMs}ms`)), timeoutMs,
        )),
      ]);
      if (res?.exceptionDetails) {
        return { ok: false, reason: "exception", details: res.exceptionDetails };
      }
      return { ok: true, value: res?.result?.value };
    } catch (err) {
      return { ok: false, reason: "error", message: err?.message || String(err) };
    }
  }

  // Phase 38 W0 — capture a JPEG screenshot of the SSR tab via CDP so tests
  // can compare actual rendered pixels before/after a broadcast. Returns
  // base64-encoded JPEG bytes (CDP default format), or null on failure.
  async function captureScreenshot({ timeoutMs = 4000, quality = 60 } = {}) {
    if (!cdpSession) return { ok: false, reason: "no-cdp-session" };
    try {
      const res = await Promise.race([
        cdpSession.send("Page.captureScreenshot", {
          format: "jpeg",
          quality,
          captureBeyondViewport: false,
        }),
        new Promise((_, rej) => setTimeout(
          () => rej(new Error(`cdp-screenshot-timeout-${timeoutMs}ms`)), timeoutMs,
        )),
      ]);
      return { ok: true, base64: res?.data || "" };
    } catch (err) {
      return { ok: false, reason: "error", message: err?.message || String(err) };
    }
  }

  const host = { start, stop, restart, getStatus, evaluateInTab, captureScreenshot };

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
