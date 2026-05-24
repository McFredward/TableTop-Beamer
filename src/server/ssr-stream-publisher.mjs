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
 * Bitrate cap derived from the active Stream-Quality preset + FPS cap.
 *
 * Phase 32 D-A3: bitrate scales with streamFpsCap per Research §"Bitrate
 * Scaling for FPS Lift":
 *   30fps  → 8 Mbit/s  (current balanced)
 *   45fps  → 12 Mbit/s (current high-quality)
 *   60fps  → 16 Mbit/s (new high-fps — LAN gigabit handles it easily)
 *   native → 16 Mbit/s (same cap as 60; hardware is the ceiling)
 *
 * Override via SSR_INITIAL_BITRATE env (single number, not per-layer);
 * we then split it across simulcast layers proportionally.
 *
 * @param {{ effectiveStreamFpsCap?: number }} [opts]
 * @returns {{ low: number, mid: number, high: number, total: number }}
 */
function deriveSimulcastBitrates({ effectiveStreamFpsCap = 60, configuredBitrate = null } = {}) {
  let total;
  const envOverride = Number(process.env.SSR_INITIAL_BITRATE);
  if (Number.isFinite(envOverride) && envOverride > 0) {
    total = envOverride;
  } else if (Number.isFinite(configuredBitrate) && configuredBitrate > 0) {
    // Phase 50 (2026-05-24): explicit bitrate from
    // serverRendering.streamBitrateMbps slider takes precedence over the
    // legacy fps-derived fallback. Bypasses fps-scaling because the
    // operator's slider value is the source of truth.
    total = configuredBitrate;
  } else if (effectiveStreamFpsCap >= 60) {
    total = 16_000_000; // 60fps or native → 16 Mbit/s
  } else if (effectiveStreamFpsCap >= 45) {
    total = 12_000_000; // 45fps → 12 Mbit/s
  } else {
    total = 8_000_000;  // 30fps → 8 Mbit/s baseline
  }
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
 *
 * Phase 32 D-A3: effectiveStreamFpsCap drives getDisplayMedia frameRate
 * constraint (0=native maps to 60 before reaching here via resolveEncoderConfig).
 *
 * @param {{ encoderConfig?: object|null, effectiveStreamFpsCap?: number, viewport?: {width:number,height:number} }} [opts]
 */
export function buildInPagePublisherScript({ encoderConfig = null, effectiveStreamFpsCap = 60, viewport = { width: 1920, height: 1080 } } = {}) {
  // Phase 50: encoderConfig.bitrate is the operator's slider value in
  // bits/s. Pass through to deriveSimulcastBitrates as the explicit
  // override; fps-derived fallback kicks in only when bitrate is unset.
  const configuredBitrate = Number(encoderConfig?.bitrate);
  const bitrates = deriveSimulcastBitrates({ effectiveStreamFpsCap, configuredBitrate });
  const targetWidth = Math.max(1, Math.round(viewport?.width || 1920));
  const targetHeight = Math.max(1, Math.round(viewport?.height || 1080));
  // h18: pick simulcast vs single-layer based on encoder. x264-software
  // is CPU-bound — running 3 spatial layers triples encode cost and
  // commonly caps the stream around 20 fps on x86_64 workstations. With
  // hardware encoders (vaapi / nvenc / videotoolbox) the cost is in
  // fixed-function silicon and 3 layers run essentially free.
  // Phase 32 hotfix h8 (2026-05-07): FORCE single-layer until hardware
  // encoding is verified working in Chrome 131. The Phase 32 D-A6 VAAPI
  // detection (probeLibvaRuntime) correctly detects libva on the host,
  // setting encoder="vaapi" — but Chrome 131's VaapiVideoEncoder feature
  // flag is a no-op in the bundled puppeteer binary, so Chrome falls back
  // to OpenH264 software encoding regardless. With useSimulcast=true the
  // publisher requests 3 layers, but the actual encode is still software
  // → 3× CPU cost → encoder lags → consumer track stalls → 8s no-frame
  // → Pi heartbeat-stale → disconnect → reconnect storm. Phase 31's
  // useSimulcast=false (always single-layer for x264-software) WAS rock-
  // stable; restoring single-layer behavior is the smallest change to
  // close the connection regression. When hardware encoding is verified
  // (a future phase), revert this and re-enable hardware-conditional
  // simulcast.
  const enc = encoderConfig?.encoder || "x264-software";
  const isSoftwareEncoder = enc === "x264-software";
  const useSimulcast = false;
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

  // Phase 50 (2026-05-24): codec + content-hint operator controls.
  // - codecPreference: "h264" (default, broad compatibility) or "vp9"
  //   (better compression efficiency, ~30-50% sharper at same bitrate).
  // - contentHint: tells the encoder how to bias rate-control.
  //   "detail" = preserve fine spatial detail (board game default);
  //   "motion" = preserve motion smoothness;
  //   "text" = legibility-first (even higher detail priority);
  //   "default" = no hint (encoder uses its built-in heuristics).
  //   Bench result: contentHint="motion" makes encoder use ~370 kbps
  //   on static content; contentHint="detail" pushes the encoder to
  //   use more of the bitrate budget for sharper individual frames.
  const codecPreference = encoderConfig?.codecPreference === "vp9" ? "vp9" : "h264";
  const contentHintValue = ["default", "detail", "motion", "text"].includes(encoderConfig?.contentHint)
    ? encoderConfig.contentHint
    : "detail";
  const codecMimeMatch = codecPreference === "vp9" ? "video/vp9" : "video/h264";
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
        width: { ideal: ${targetWidth} },
        height: { ideal: ${targetHeight} },
        // Phase 32 D-A3: frameRate driven by streamFpsCap config.
        // h18 previously hardcoded 60 — now uses effectiveStreamFpsCap so
        // operator-configured cap flows through from config to capture.
        frameRate: { ideal: ${effectiveStreamFpsCap}, max: ${effectiveStreamFpsCap} },
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
    // Phase 32 D-A3: lock in configured fps cap via applyConstraints.
    // Best-effort — Chromium falls back to source natural rate if page can't sustain.
    try {
      await videoTrack.applyConstraints({ frameRate: { ideal: ${effectiveStreamFpsCap}, max: ${effectiveStreamFpsCap} } });
    } catch (e) {
      console.warn("[ssr-publisher] applyConstraints frameRate failed", e?.message);
    }
    // Phase 47 gap-closure-18: try to upgrade the captured track to
    // 1920x1080 via applyConstraints. The initial getDisplayMedia uses
    // "ideal" hints which Chromium clamps on headless=new (~800x450 source
    // cap) and on Win32 headful (~1920x956 due to chrome UI overhead).
    // applyConstraints can renegotiate the source if Chromium has spare
    // headroom (e.g. headless surface can grow, or DPR can change).
    // Non-fatal: if the source genuinely can't go higher, OverconstrainedError
    // is caught and the existing lower-res track stays in use.
    try {
      await videoTrack.applyConstraints({
        width: { min: ${targetWidth}, ideal: ${targetWidth} },
        height: { min: ${targetHeight}, ideal: ${targetHeight} },
      });
      console.log("[ssr-publisher] applyConstraints upgraded to ${targetWidth}x${targetHeight}");
    } catch (e) {
      console.warn("[ssr-publisher] applyConstraints ${targetWidth}x${targetHeight} not satisfiable:", e?.message);
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

    // 4. D-A3 encoding layers + D-A2/Phase 50 codec preference.
    // h18 (2026-05-06): single-layer on software encoders (x264) so the
    // CPU isn't paying triple encode cost. Hardware encoders keep 3
    // simulcast layers for adaptive-bitrate quality.
    const videoEncodings = ${encodingsLiteral};
    console.log("[ssr-publisher] encoder=${enc} codec=${codecPreference} contentHint=${contentHintValue} simulcast=${simulcastLabel} bitrate=${totalBitrate}");

    // Phase 50 (2026-05-24): set contentHint BEFORE produce(). This is
    // a track-level hint that tells the encoder how to bias rate-control.
    // For "detail" / "text" the encoder favors spatial sharpness over
    // motion smoothness, even on screen-capture tracks (which Chromium
    // otherwise defaults to "motion" for).
    try {
      videoTrack.contentHint = ${JSON.stringify(contentHintValue === "default" ? "" : contentHintValue)};
      console.log("[ssr-publisher] track.contentHint set to '" + videoTrack.contentHint + "'");
    } catch (e) {
      console.warn("[ssr-publisher] contentHint assignment failed:", e?.message);
    }

    // Phase 50 (2026-05-24): videoGoogleStartBitrate is the encoder's
    // initial target in kbps. Default 1000 (1 Mbit/s) meant a static
    // scene encoded at ~1 Mbit/s and GCC had no signal to probe higher.
    // Start at the configured slider value so the encoder reaches the
    // operator's target immediately.
    // Phase 50/59 (2026-05-24): videoGoogleStartBitrate sets the encoder's
    // initial target in kbps. We also tested videoGoogleMinBitrate (would
    // force minimum bitrate even on static content) but empirically the
    // Chromium 131 encoder ignores it for OpenH264 -- sendBps stayed at
    // ~140 kbps even with min=5_000_000 set. Left it out as a no-op.
    const codecOptions = { videoGoogleStartBitrate: ${Math.round(totalBitrate / 1000)} };

    // Phase 50 (2026-05-24): pick the codec specified by the operator.
    // Both H.264 and VP9 are declared in mediasoup's MEDIA_CODECS.
    // If the requested codec isn't in rtpCapabilities (e.g. mediasoup
    // didn't advertise it for some reason), fall back to H.264.
    const codecMime = ${JSON.stringify(codecMimeMatch)};
    let chosenCodec = device.rtpCapabilities.codecs.find(
      (c) => c.mimeType && c.mimeType.toLowerCase() === codecMime,
    );
    if (!chosenCodec) {
      chosenCodec = device.rtpCapabilities.codecs.find(
        (c) => c.mimeType && c.mimeType.toLowerCase() === "video/h264",
      );
      console.warn("[ssr-publisher] requested codec '" + codecMime + "' not in rtpCapabilities; using H.264 fallback");
    }
    const produceOpts = { track: videoTrack, encodings: videoEncodings, codecOptions: codecOptions };
    if (chosenCodec) produceOpts.codec = chosenCodec;
    const videoProducer = await sendTransport.produce(produceOpts);

    // Phase 50 (2026-05-24): set degradationPreference="maintain-resolution"
    // when the operator wants detail/text optimization. This prevents
    // Chromium from secretly lowering resolution under CPU/network
    // pressure (the default "balanced" can degrade both res AND fps).
    // For motion-priority content we leave the default ("balanced").
    try {
      const sender = videoProducer.rtpSender;
      if (sender && typeof sender.getParameters === "function" && typeof sender.setParameters === "function") {
        const params = sender.getParameters();
        const desiredPref = ${JSON.stringify(
          contentHintValue === "detail" || contentHintValue === "text"
            ? "maintain-resolution"
            : contentHintValue === "motion"
              ? "maintain-framerate"
              : "balanced",
        )};
        params.degradationPreference = desiredPref;
        await sender.setParameters(params);
        console.log("[ssr-publisher] degradationPreference set to '" + desiredPref + "'");
      }
    } catch (e) {
      console.warn("[ssr-publisher] degradationPreference failed:", e?.message);
    }

    window.__ssrProducerIds = { video: videoProducer.id };
    console.log("[ssr-publisher] producer up:", window.__ssrProducerIds);

    // Phase 50 (2026-05-24): read back the RTCRtpSender parameters to
    // verify the configured maxBitrate from the encodings array actually
    // reached Chromium's encoder. If mediasoup-client silently drops the
    // maxBitrate field (or if Chromium overrides it), we'll see the
    // discrepancy here. Polled once at 500ms (after the producer has
    // settled) and once at 5s (steady state). NOTE: this whole block is
    // inside a backtick template literal in buildInPagePublisherScript --
    // do NOT use backticks for inline code spans in comments here, they
    // close the outer template early.
    function __readBackSenderParams(label) {
      try {
        const rtpSender = videoProducer?.rtpSender;
        if (!rtpSender || typeof rtpSender.getParameters !== "function") {
          console.warn("[ssr-publisher] no rtpSender on producer (label=" + label + ")");
          return;
        }
        const params = rtpSender.getParameters();
        const encs = (params && params.encodings) || [];
        const summary = encs.map((e) => ({
          rid: e.rid ?? null,
          active: e.active ?? null,
          maxBitrate: e.maxBitrate ?? null,
          scaleResolutionDownBy: e.scaleResolutionDownBy ?? null,
        }));
        console.log(
          "[ssr-publisher] sender params [" + label + "]: " + JSON.stringify(summary),
        );
      } catch (e) {
        console.warn("[ssr-publisher] sender params readback failed:", e?.message);
      }
    }
    setTimeout(() => __readBackSenderParams("t+500ms"), 500);
    setTimeout(() => __readBackSenderParams("t+5s"), 5000);

    // Phase 50 (2026-05-24): poll outbound-rtp stats to read the
    // encoder's CURRENT targetBitrate (what the encoder is actually
    // trying to hit) and bytesSent rate (what's actually flowing).
    // If targetBitrate is << sender.maxBitrate, the cap isn't the
    // bottleneck -- content / rate-control is.
    let __prevBytes = 0;
    let __prevAt = performance.now();
    async function __pollEncoderStats(label) {
      try {
        const stats = await videoProducer.getStats();
        const entries = [];
        stats.forEach((s) => {
          if (s.type === "outbound-rtp" && s.kind === "video") {
            entries.push(s);
          }
        });
        for (const o of entries) {
          const now = performance.now();
          const dt = now - __prevAt;
          const dBytes = (o.bytesSent || 0) - __prevBytes;
          const sendBps = dt > 0 ? (dBytes * 8 * 1000) / dt : 0;
          __prevBytes = o.bytesSent || 0;
          __prevAt = now;
          console.log(
            "[ssr-publisher] enc-stats [" + label + "]: " +
            "targetBitrate=" + (o.targetBitrate ?? "n/a") +
            " framesEncoded=" + (o.framesEncoded ?? "n/a") +
            " framesPerSecond=" + (o.framesPerSecond ?? "n/a") +
            " sendBps=" + Math.round(sendBps) +
            " qualityLimitReason=" + (o.qualityLimitationReason ?? "n/a") +
            " encoderImpl=" + (o.encoderImplementation ?? "n/a")
          );
        }
      } catch (e) {
        console.warn("[ssr-publisher] enc-stats readback failed:", e?.message);
      }
    }
    setTimeout(() => __pollEncoderStats("t+8s"), 8000);
    setTimeout(() => __pollEncoderStats("t+12s"), 12000);
    setTimeout(() => __pollEncoderStats("t+18s"), 18000);

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
        // h21 (2026-05-06): WebGL renderer for hardware identification.
        // CRITICAL — this MUST be cached after first read, or we leak
        // a WebGL context every second. Chromium caps active WebGL
        // contexts at 16; once the cap hits, the OLDEST context is
        // evicted — that's the mesh-warp's GL context, which then
        // fails to re-init ("shaderSource ... not of type WebGLShader")
        // and the warp stops rendering. Symptom user reported in h20:
        // "Ich sehe immer noch keinerlei Veränderung wenn ich
        // irgendwas transformiere" — the drag was applied to grid
        // points but the warp couldn't render the change.
        if (typeof window.__ttbCachedWebglRenderer === "undefined") {
          let cached = "";
          try {
            const c = document.createElement("canvas");
            const gl = c.getContext("webgl2") || c.getContext("webgl");
            if (gl) {
              const ext = gl.getExtension("WEBGL_debug_renderer_info");
              if (ext) {
                // Prefer the UNMASKED renderer (e.g. "ANGLE (Mesa, llvmpipe)").
                cached = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "").slice(0, 60);
              }
              // Fallback: masked RENDERER (always available — typically
              // "WebKit WebGL" but still better than "?").
              if (!cached) {
                cached = String(gl.getParameter(gl.RENDERER) || "WebGL").slice(0, 60);
              }
              // Aggressively release the context immediately.
              const lose = gl.getExtension("WEBGL_lose_context");
              try { lose && lose.loseContext(); } catch (_) {}
            }
          } catch (_) { /* swallow — diagnostic, not critical */ }
          window.__ttbCachedWebglRenderer = cached || "unavailable";
        }
        out.webglRenderer = window.__ttbCachedWebglRenderer;
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
export async function injectInPagePublisher(page, { logger = console, timeoutMs = 20000, encoderConfig = null, effectiveStreamFpsCap = 60, viewport = { width: 1920, height: 1080 } } = {}) {
  const script = buildInPagePublisherScript({ encoderConfig, effectiveStreamFpsCap, viewport });
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
