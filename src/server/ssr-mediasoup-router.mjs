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
import { networkInterfaces } from "node:os";

const RTC_MIN_PORT = Number(process.env.SSR_RTC_MIN_PORT ?? 40000);
const RTC_MAX_PORT = Number(process.env.SSR_RTC_MAX_PORT ?? 40100);
const LISTEN_IP = process.env.SSR_LISTEN_IP ?? "0.0.0.0";

/**
 * h3 hotfix: WebRTC clients (Pi, dashboard from another laptop, etc.) need
 * an announcedIp that's actually reachable from their network — 0.0.0.0
 * is invalid as a connection target, so without an explicit announcedIp
 * the SDP carries an unusable address and consume() silently times out
 * after a few seconds (which is exactly what the user saw: rapid
 * connect/disconnect cycles in the signaling log).
 *
 * Resolution priority:
 *   1. SSR_ANNOUNCED_IP env override (operator wins).
 *   2. First non-internal IPv4 address on a UP interface (LAN IP).
 *   3. Fall back to null and log a clear warning so the operator can set
 *      SSR_ANNOUNCED_IP manually.
 */
function detectAnnouncedIp(logger) {
  const explicit = process.env.SSR_ANNOUNCED_IP;
  if (explicit && explicit.length > 0) return explicit;

  const ifaces = networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const addr of ifaces[name] ?? []) {
      if (addr.family !== "IPv4") continue;
      if (addr.internal) continue; // skip 127.0.0.1
      if (typeof addr.address !== "string") continue;
      // Skip docker / virtual interfaces by name heuristic — the operator can
      // still override via SSR_ANNOUNCED_IP if their LAN goes through one of
      // these.
      if (/^(docker|br-|veth|virbr|tailscale|tun|tap)/i.test(name)) continue;
      logger?.info?.(`[ssr-mediasoup] announcedIp auto-detected: ${addr.address} (interface=${name})`);
      return addr.address;
    }
  }
  logger?.warn?.(
    `[ssr-mediasoup] no non-internal IPv4 found — set SSR_ANNOUNCED_IP=<server-LAN-IP> if remote clients can't connect`,
  );
  return null;
}

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
let activeAnnouncedIp = null;

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
  activeAnnouncedIp = detectAnnouncedIp(logger);
  logger.info(
    `[ssr-mediasoup] router up — codecs: H264 (video-only per D-D2 reversal), ports ${RTC_MIN_PORT}-${RTC_MAX_PORT}, announcedIp=${activeAnnouncedIp ?? "(none — remote clients may not connect)"}`,
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
    listenIps: [{ ip: LISTEN_IP, announcedIp: activeAnnouncedIp }],
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
