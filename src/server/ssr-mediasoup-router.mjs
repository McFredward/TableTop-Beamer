// src/server/ssr-mediasoup-router.mjs
//
// Phase 31 Plan 02 — Wave 2: WebRTC stream bring-up.
// Owns the mediasoup Worker + Router lifecycle and the WebRtcTransport
// factory used by the signaling endpoint. Per D-D2 reversal addendum
// (.planning/phases/phase-31/31-D-D2-REVERSAL-ADDENDUM.md), the router
// only advertises H264 video — audio is Pi-local via WebSocket trigger
// and therefore lives outside the WebRTC stream entirely.
//
// Per RESEARCH.md § Standard Stack: mediasoup ^3.x, Node-native SFU.
// Producer/Consumer model — one Producer (the SSR Chromium tab) is
// fanned out to N Consumers (Pi /output/, dashboard preview, test
// harness) via WebRtcTransport.

import * as mediasoup from "mediasoup";

const RTC_MIN_PORT = Number(process.env.SSR_RTC_MIN_PORT ?? 40000);
const RTC_MAX_PORT = Number(process.env.SSR_RTC_MAX_PORT ?? 40100);
const ANNOUNCED_IP = process.env.SSR_ANNOUNCED_IP ?? null; // null → mediasoup picks
const LISTEN_IP = process.env.SSR_LISTEN_IP ?? "0.0.0.0";

// D-D2 reversal: video-only. Audio lives on Pi /output/ via the
// existing runtime-wire-room-audio-binders.js path. We intentionally
// do NOT advertise audio/opus here so that no part of the pipeline
// can accidentally subscribe to a non-existent audio track.
const MEDIA_CODECS = [
  {
    kind: "video",
    mimeType: "video/H264",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "profile-level-id": "42e01f",
      "level-asymmetry-allowed": 1,
    },
  },
];

let activeWorker = null;
let activeRouter = null;

/**
 * Boot (idempotent) the mediasoup Worker + Router.
 * @param {{ logger?: { info: Function, warn: Function, error: Function } }} [opts]
 * @returns {Promise<{ worker: import('mediasoup').types.Worker, router: import('mediasoup').types.Router }>}
 */
export async function bootMediasoupRouter({ logger = console } = {}) {
  if (activeRouter && activeWorker) {
    return { worker: activeWorker, router: activeRouter };
  }
  activeWorker = await mediasoup.createWorker({
    logLevel: "warn",
    rtcMinPort: RTC_MIN_PORT,
    rtcMaxPort: RTC_MAX_PORT,
  });
  activeWorker.on("died", (err) => {
    logger.error(`[ssr-mediasoup] worker died: ${err?.message ?? "unknown"}`);
    activeWorker = null;
    activeRouter = null;
  });
  activeRouter = await activeWorker.createRouter({ mediaCodecs: MEDIA_CODECS });
  logger.info(
    `[ssr-mediasoup] router up — codecs: H264 (video-only per D-D2 reversal), ports ${RTC_MIN_PORT}-${RTC_MAX_PORT}`,
  );
  return { worker: activeWorker, router: activeRouter };
}

/**
 * Create a WebRtcTransport on the given (or active) router.
 * @param {{ router?: import('mediasoup').types.Router }} [opts]
 * @returns {Promise<import('mediasoup').types.WebRtcTransport>}
 */
export async function createWebRtcTransport({ router } = {}) {
  const r = router ?? activeRouter;
  if (!r) {
    throw new Error("createWebRtcTransport: router not initialized — call bootMediasoupRouter() first");
  }
  const transport = await r.createWebRtcTransport({
    listenIps: [{ ip: LISTEN_IP, announcedIp: ANNOUNCED_IP }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    // Bitrate target — derived from the active Stream-Quality preset
    // resolved at server boot (Plan 01 resolveEncoderConfig). Defaults to
    // 8 Mbit/s (`balanced` preset). Override via SSR_INITIAL_BITRATE.
    initialAvailableOutgoingBitrate: Number(process.env.SSR_INITIAL_BITRATE ?? 8_000_000),
  });
  return transport;
}

/**
 * @returns {import('mediasoup').types.Router | null}
 */
export function getRouter() {
  return activeRouter;
}

/**
 * @returns {import('mediasoup').types.Worker | null}
 */
export function getWorker() {
  return activeWorker;
}

/**
 * Cleanly close the active worker + router. Safe to call repeatedly.
 */
export async function shutdownMediasoupRouter() {
  if (activeRouter) {
    try { activeRouter.close(); } catch { /* already closed */ }
    activeRouter = null;
  }
  if (activeWorker) {
    try { activeWorker.close(); } catch { /* already closed */ }
    activeWorker = null;
  }
}
