// src/server/ssr-stream-publisher.mjs
//
// Phase 31 Plan 02 — Wave 2: in-page WebRTC publisher.
//
// Per RESEARCH.md § Pattern 2 Route B: instead of decoding the
// puppeteer-stream webm output and re-encoding, we inject an in-page
// script into the SSR Chromium tab that runs mediasoup-client against
// our /api/webrtc/signal endpoint. The browser's own WebRTC stack does
// the h264 encode and uploads to mediasoup as a Producer — no ffmpeg,
// no transcode.
//
// Per D-D2 reversal addendum (.planning/phases/phase-31/31-D-D2-REVERSAL-ADDENDUM.md):
// The publisher captures VIDEO ONLY via getDisplayMedia({ video: true,
// audio: false }). Audio remains Pi-local via the existing
// runtime-wire-room-audio-binders.js path. The script must NOT capture
// or produce an audio track.
//
// Per D-A3 (CONTEXT.md): simulcast layers are configured for adaptive
// bitrate. Three RIDs (low / mid / high) covering 480p / 720p / 1080p.
//
// Per D-A2 (CONTEXT.md): h264 codec preference via codec selection on
// `sendTransport.produce({ codec })`.
//
// Wave 4 will swap the hardcoded simulcast bitrates for values pulled
// from `config/global-defaults.json#serverRendering.qualityPreset`.

import { readFile, writeFile, stat, mkdir } from "node:fs/promises";
import path from "node:path";
import { build as esbuild } from "esbuild";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..");

/**
 * Bitrate cap derived from the active Stream-Quality preset.
 * Matches Plan 01 resolveEncoderConfig defaults:
 *   low-latency  → 4 Mbit/s
 *   balanced     → 8 Mbit/s
 *   high-quality → 12 Mbit/s
 *
 * Override via SSR_INITIAL_BITRATE env (single number, not per-layer);
 * we then split it across simulcast layers proportionally.
 *
 * @returns {{ low: number, mid: number, high: number, total: number }}
 */
function deriveSimulcastBitrates() {
  const total = Number(process.env.SSR_INITIAL_BITRATE ?? 8_000_000);
  // Roughly: low=15%, mid=35%, high=100% of total per spatial layer.
  // The browser's congestion control will downscale layers as needed.
  return {
    low: Math.round(total * 0.15),
    mid: Math.round(total * 0.35),
    high: total,
    total,
  };
}

/**
 * Build the in-page bootstrap script. Runs in browser context inside
 * the SSR Chromium tab. Captures the tab via getDisplayMedia (auto-
 * granted via --auto-select-desktop-capture-source=Entire screen),
 * connects to /api/webrtc/signal as role=ssr-tab, creates a SendTransport
 * via mediasoup-client, and produces ONE simulcast video Producer.
 *
 * D-D2 reversal: explicit `audio: false` — no audio track is captured
 * or produced.
 */
export function buildInPagePublisherScript({ encoderConfig = null } = {}) {
  const bitrates = deriveSimulcastBitrates();
  // h18: pick simulcast vs single-layer based on encoder. x264-software
  // is CPU-bound — running 3 spatial layers triples encode cost and
  // commonly caps the stream around 20 fps on x86_64 workstations. With
  // hardware encoders (vaapi / nvenc / videotoolbox) the cost is in
  // fixed-function silicon and 3 layers run essentially free.
  const enc = encoderConfig?.encoder || "x264-software";
  const isSoftwareEncoder = enc === "x264-software";
  const useSimulcast = !isSoftwareEncoder;
  // For software encoder: single-layer at full resolution. We still
  // honor the bitrate cap; congestion-control will throttle as needed.
  const singleLayerBitrate = bitrates.high;
  // Build the encodings array literal as a string so we can splice it
  // into the publisher template with a single interpolation. Nesting
  // template literals doesn't work cleanly here — the inner backticks
  // close the outer template literal early.
  const encodingsLiteral = useSimulcast
    ? `[
      { rid: "low",  scaleResolutionDownBy: 4.0, maxBitrate: ${bitrates.low} },
      { rid: "mid",  scaleResolutionDownBy: 2.0, maxBitrate: ${bitrates.mid} },
      { rid: "high", scaleResolutionDownBy: 1.0, maxBitrate: ${bitrates.high} },
    ]`
    : `[
      { maxBitrate: ${singleLayerBitrate} },
    ]`;
  const simulcastLabel = useSimulcast ? "3-layer" : "single-layer";
  const totalBitrate = useSimulcast ? bitrates.total : singleLayerBitrate;
  return `
(async () => {
  try {
    if (!window.mediasoupClient) {
      const s = document.createElement("script");
      s.src = "/vendor/mediasoup-client.min.js";
      await new Promise((res, rej) => { s.onload = res; s.onerror = () => rej(new Error("failed to load mediasoup-client.min.js")); document.head.appendChild(s); });
    }
    const ms = window.mediasoupClient;
    if (!ms || typeof ms.Device !== "function") {
      throw new Error("mediasoup-client not exposed as window.mediasoupClient.Device");
    }
    const wsUrl = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/api/webrtc/signal?role=ssr-tab";
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let reqIdSeq = 0;
    function rpc(action, payload) {
      payload = payload || {};
      const requestId = String(++reqIdSeq);
      ws.send(JSON.stringify(Object.assign({ action: action, requestId: requestId }, payload)));
      return new Promise((res, rej) => {
        pending.set(requestId, { res: res, rej: rej });
        setTimeout(() => { if (pending.has(requestId)) { pending.delete(requestId); rej(new Error("rpc timeout: " + action)); } }, 15000);
      });
    }
    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg && msg.requestId && pending.has(msg.requestId)) {
        const { res, rej } = pending.get(msg.requestId);
        pending.delete(msg.requestId);
        if (msg.type === "error") rej(new Error(msg.reason)); else res(msg);
      }
    };
    ws.onerror = () => { window.__ssrPublisherError = "websocket-error"; };
    await new Promise((res, rej) => {
      ws.addEventListener("open", res, { once: true });
      ws.addEventListener("error", () => rej(new Error("ws-open-failed")), { once: true });
      setTimeout(() => rej(new Error("ws-open-timeout")), 10000);
    });

    // 1. Load router rtpCapabilities + create Device
    const caps = await rpc("get-router-rtp-capabilities");
    const device = new ms.Device();
    await device.load({ routerRtpCapabilities: caps.rtpCapabilities });

    // 2. Create SendTransport
    const tx = await rpc("create-send-transport");
    const sendTransport = device.createSendTransport({
      id: tx.id,
      iceParameters: tx.iceParameters,
      iceCandidates: tx.iceCandidates,
      dtlsParameters: tx.dtlsParameters,
    });
    sendTransport.on("connect", ({ dtlsParameters }, cb, eb) => {
      rpc("connect-transport", { transportId: tx.id, dtlsParameters: dtlsParameters }).then(() => cb()).catch(eb);
    });
    sendTransport.on("produce", ({ kind, rtpParameters }, cb, eb) => {
      rpc("produce", { kind: kind, rtpParameters: rtpParameters }).then((r) => cb({ id: r.id })).catch(eb);
    });

    // 3. Capture tab — D-D2 REVERSAL: video-only, no audio.
    // h4 hotfix: preferCurrentTab + selfBrowserSurface=include hint Chromium
    // to capture the page DOM only (not browser chrome / OS desktop / popups).
    // h5 hotfix: explicit frameRate + width/height + cursor: never. Without
    // the explicit constraints, Chromium picked a default ~15-20 fps for tab
    // capture, leading to user-reported 20 fps on /output/ even though the
    // tab itself rendered at 60 fps.
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        // h18: ask for 60 fps explicitly. The previous "ideal: 30" was
        // being honored literally, capping us at 30 even when the page
        // rendered higher. "max: 60" keeps the upper bound; congestion
        // control / encoder budget naturally clamps where needed.
        frameRate: { ideal: 60, max: 60 },
        cursor: "never",
      },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
      surfaceSwitching: "exclude",
      systemAudio: "exclude",
    });
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) throw new Error("getDisplayMedia returned no video track");
    // h18: lock in 60fps via applyConstraints. Best-effort — Chromium
    // falls back to the source's natural rate if the page can't sustain.
    try {
      await videoTrack.applyConstraints({ frameRate: { ideal: 60, max: 60 } });
    } catch (e) {
      console.warn("[ssr-publisher] applyConstraints frameRate failed", e?.message);
    }
    // h18: log effective track settings so the operator can read them
    // in the SSR-tab console when chasing fps issues.
    try {
      const settings = videoTrack.getSettings?.();
      if (settings) {
        console.log("[ssr-publisher] track settings:", JSON.stringify({
          frameRate: settings.frameRate,
          width: settings.width,
          height: settings.height,
          deviceId: settings.deviceId,
        }));
      }
    } catch {}

    // 4. D-A3 encoding layers + D-A2 H264 codec preference.
    // h18 (2026-05-06): single-layer on software encoders (x264) so the
    // CPU isn't paying triple encode cost. Hardware encoders keep 3
    // simulcast layers for adaptive-bitrate quality.
    const videoEncodings = ${encodingsLiteral};
    console.log("[ssr-publisher] encoder=${enc} simulcast=${simulcastLabel} bitrate=${totalBitrate}");
    const codecOptions = { videoGoogleStartBitrate: 1000 };
    const h264Codec = device.rtpCapabilities.codecs.find((c) => c.mimeType && c.mimeType.toLowerCase() === "video/h264");
    const produceOpts = { track: videoTrack, encodings: videoEncodings, codecOptions: codecOptions };
    if (h264Codec) produceOpts.codec = h264Codec;
    const videoProducer = await sendTransport.produce(produceOpts);

    window.__ssrProducerIds = { video: videoProducer.id };
    console.log("[ssr-publisher] producer up:", window.__ssrProducerIds);

    // h17: SSR-side stats reporter. Replaces h8's single-fps message
    // with a richer { type: "ssr-stats", stats: {...} } envelope so
    // the consumer's diagnostic overlay can show render method,
    // resolution, GIF counts, board, decoder, etc. Server piggybacks
    // the latest stats on heartbeat.
    let __ssrFpsFrames = 0;
    let __ssrFpsLastReported = performance.now();
    const __ssrFpsTick = () => {
      __ssrFpsFrames += 1;
      requestAnimationFrame(__ssrFpsTick);
    };
    requestAnimationFrame(__ssrFpsTick);

    // Collect non-fps stats once per tick. These poll cheap globals
    // populated by the runtime (TT_BEAMER_RUNTIME_*). All fields are
    // best-effort — missing values render as "?" in the consumer chip.
    function __collectSsrStats() {
      const out = {};
      try {
        // Output dims: the captured tab is the page itself, so the
        // window dims = the encoder input dims.
        out.outputW = Math.round(window.innerWidth);
        out.outputH = Math.round(window.innerHeight);
        out.devicePixelRatio = Number(window.devicePixelRatio || 1).toFixed(2);
      } catch {}
      try {
        // Active board + animation count exposed by the runtime
        // orchestration when it's mounted (final-output role).
        const state = window.__TT_BEAMER_STATE_FOR_DIAG__ || null;
        if (state) {
          out.boardId = String(state.boardId || "").slice(0, 32) || null;
          if (state.runningAnimations && typeof state.runningAnimations === "object") {
            out.activeAnimations = Object.keys(state.runningAnimations).length;
          }
          out.alignMode = Boolean(state.alignMode);
        }
      } catch {}
      try {
        // GIF cache state counts: how many GIFs are decoded, loading,
        // or in fallback. Surfaces decode-stalls in real time.
        const gp = window.TT_BEAMER_RUNTIME_GIF_PLAYBACK;
        if (gp && typeof gp.getGifPlaybackCacheEntry === "function") {
          // We only know the active board's animation ids — but the
          // runtime caches every GIF it has touched. The state machine
          // (status: idle | loading | ready | fallback) is the same
          // for all entries. Walk the manifest's animation paths.
          const m = window.TT_BEAMER_RUNTIME_ASSET_MANIFEST;
          if (m && typeof m.resolveAssetUrlWithHash === "function") {
            // No public iter API — use a sentinel global that the
            // playback module exposes for diagnostics.
            const counts = window.__TT_BEAMER_GIF_CACHE_COUNTS__;
            if (counts && typeof counts === "object") {
              out.gifsReady = Number(counts.ready || 0);
              out.gifsLoading = Number(counts.loading || 0);
              out.gifsFallback = Number(counts.fallback || 0);
              out.gifsTotal = Number(counts.total || 0);
            }
          }
        }
      } catch {}
      try {
        // WebGL renderer for hardware identification. ANGLE strings tell
        // us if the page is running on llvmpipe / SwiftShader / iGPU /
        // discrete GPU — the single biggest diagnostic on a publishable
        // build that may run on anything from a NUC to a workstation.
        const c = document.createElement("canvas");
        const gl = c.getContext("webgl2") || c.getContext("webgl");
        if (gl) {
          const ext = gl.getExtension("WEBGL_debug_renderer_info");
          if (ext) {
            const r = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "").slice(0, 60);
            if (r) out.webglRenderer = r;
          }
        }
      } catch {}
      try {
        // Render method (parser vs image-decoder) — the runtime sets
        // this global on each successful decode for diagnostic surfacing.
        const m = window.__TT_BEAMER_LAST_GIF_DECODE_METHOD__;
        if (typeof m === "string") out.lastDecodeVia = m;
      } catch {}
      try {
        // h18 (2026-05-06): effective render mode (gl/2d/auto + fallback
        // suffix). The runtime exposes __ttBeamerEffectiveRenderMode()
        // which composes state.renderMode with live GL-context-loss state
        // — so the chip honestly reports "gl→2d (loss x1)" if a context
        // loss is forcing a fallback even though the user configured GL.
        const m = window.__ttBeamerEffectiveRenderMode;
        if (typeof m === "function") {
          const v = m();
          if (typeof v === "string") out.renderMode = v.slice(0, 60);
        } else {
          // Fallback: read configured mode from state probe.
          const s = window.__ttBeamerStateProbe?.();
          if (s?.renderMode) out.renderMode = String(s.renderMode);
        }
      } catch {}
      return out;
    }

    setInterval(() => {
      const now = performance.now();
      const dt = now - __ssrFpsLastReported;
      const fps = dt > 0 ? (__ssrFpsFrames * 1000) / dt : 0;
      __ssrFpsFrames = 0;
      __ssrFpsLastReported = now;
      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          const stats = __collectSsrStats();
          stats.fps = Math.round(fps * 10) / 10;
          // h17 sends the new envelope. h8's message kept temporarily for
          // compatibility with consumers that haven't been updated.
          ws.send(JSON.stringify({ type: "ssr-stats", stats }));
          ws.send(JSON.stringify({ type: "ssr-fps", fps: stats.fps }));
        }
      } catch {}
    }, 1000);
  } catch (err) {
    console.error("[ssr-publisher] FAILED:", err);
    window.__ssrPublisherError = String((err && err.message) || err);
  }
})();
`.trim();
}

/**
 * Inject + run the publisher in the live SSR page. Polls until either
 * `window.__ssrProducerIds` (success) or `window.__ssrPublisherError`
 * appears, or the timeout elapses.
 *
 * @param {import('puppeteer').Page} page
 * @param {{ logger?: { info: Function, warn: Function, error: Function }, timeoutMs?: number }} [opts]
 * @returns {Promise<{ video: string }>}
 */
export async function injectInPagePublisher(page, { logger = console, timeoutMs = 20000, encoderConfig = null } = {}) {
  const script = buildInPagePublisherScript({ encoderConfig });
  await page.evaluate(script);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await page.evaluate(() => ({
      producers: window.__ssrProducerIds ?? null,
      error: window.__ssrPublisherError ?? null,
    }));
    if (result.error) {
      throw new Error(`[ssr-publisher] in-page error: ${result.error}`);
    }
    if (result.producers) {
      logger.info(`[ssr-publisher] producer up — video=${result.producers.video}`);
      return result.producers;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("[ssr-publisher] timeout waiting for producer");
}

// ---------------------------------------------------------------------
// Browser bundle for mediasoup-client. The npm package ships CommonJS
// and is therefore not directly loadable as a <script>. We bundle once
// on first request via esbuild (~1s, ~218 KB IIFE) and cache to disk
// under public/vendor/. Subsequent boots are instant.
// ---------------------------------------------------------------------
const VENDOR_DIR = path.join(ROOT_DIR, "public", "vendor");
const VENDOR_BUNDLE_PATH = path.join(VENDOR_DIR, "mediasoup-client.min.js");
const MEDIASOUP_CLIENT_ENTRY = path.join(ROOT_DIR, "node_modules", "mediasoup-client", "lib", "index.js");

let bundleBuildPromise = null;

/**
 * Ensure the bundled mediasoup-client browser blob exists on disk.
 * Idempotent + concurrency-safe (concurrent calls share the same build promise).
 *
 * @param {{ logger?: { info: Function, warn: Function, error: Function } }} [opts]
 * @returns {Promise<string>} path to the bundled file
 */
export async function ensureMediasoupClientBundle({ logger = console } = {}) {
  if (bundleBuildPromise) return bundleBuildPromise;
  bundleBuildPromise = (async () => {
    try {
      // If both source + bundle exist and bundle is newer, reuse.
      const [bundleStat, sourceStat] = await Promise.all([
        stat(VENDOR_BUNDLE_PATH).catch(() => null),
        stat(MEDIASOUP_CLIENT_ENTRY).catch(() => null),
      ]);
      if (!sourceStat) {
        throw new Error(
          `mediasoup-client not installed — run \`npm install\`. Looked at: ${MEDIASOUP_CLIENT_ENTRY}`,
        );
      }
      if (bundleStat && bundleStat.mtimeMs >= sourceStat.mtimeMs) {
        return VENDOR_BUNDLE_PATH;
      }
      await mkdir(VENDOR_DIR, { recursive: true });
      logger.info("[ssr-publisher] bundling mediasoup-client for browser…");
      await esbuild({
        entryPoints: [MEDIASOUP_CLIENT_ENTRY],
        bundle: true,
        format: "iife",
        globalName: "mediasoupClient",
        outfile: VENDOR_BUNDLE_PATH,
        platform: "browser",
        minify: true,
        target: ["chrome120"],
        define: {
          "process.env.NODE_ENV": '"production"',
          "process.env.DEBUG": '""',
          "process.env.DEBUG_COLORS": '""',
          "process.env.DEBUG_DEPTH": '"0"',
          global: "globalThis",
        },
        logLevel: "warning",
      });
      const { size } = await stat(VENDOR_BUNDLE_PATH);
      logger.info(`[ssr-publisher] mediasoup-client bundle ready: ${VENDOR_BUNDLE_PATH} (${size} bytes)`);
      return VENDOR_BUNDLE_PATH;
    } catch (err) {
      bundleBuildPromise = null; // allow retry on subsequent calls
      throw err;
    }
  })();
  return bundleBuildPromise;
}

/**
 * Read the bundled mediasoup-client browser blob.
 * @returns {Promise<Buffer>}
 */
export async function readMediasoupClientBundle({ logger = console } = {}) {
  await ensureMediasoupClientBundle({ logger });
  return readFile(VENDOR_BUNDLE_PATH);
}

export { VENDOR_BUNDLE_PATH as MEDIASOUP_CLIENT_BUNDLE_PATH };
