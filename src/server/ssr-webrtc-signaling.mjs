// src/server/ssr-webrtc-signaling.mjs
//
// Phase 31 Plan 02 — Wave 2: WebRTC signaling endpoint.
// Mounts a raw WebSocket handler on /api/webrtc/signal that speaks
// the mediasoup-client signaling protocol (KNOWN_ACTIONS below).
//
// Roles:
//   - "ssr-tab"  : the SSR Chromium tab (localhost-only). The ONLY role
//                  permitted to call action="produce". Spoofing guard
//                  rejects non-127.0.0.1 origins.
//   - "consumer" : Pi /output/, dashboard preview, test harness.
//                  Read-only — can subscribe to the live Producer.
//
// Per D-D2 reversal: only ONE Producer (kind="video"). Audio Consumer
// requests return an explicit error pointing the user to the Pi-local
// audio path.
//
// V5 ASVS — every untrusted parameter (DTLS fingerprints, RTP shapes,
// transport IDs, kind enum) is validated before hitting mediasoup.

import { createHash } from "node:crypto";
import { createWebRtcTransport, getRouter } from "./ssr-mediasoup-router.mjs";

const KNOWN_ACTIONS = new Set([
  "get-router-rtp-capabilities",
  "create-send-transport",
  "create-recv-transport",
  "connect-transport",
  "produce",
  "consume",
  "resume-consumer",
]);

const VALID_DTLS_ROLES = new Set(["client", "server", "auto"]);
const MAX_CONSUMER_CONNECTIONS = 10; // T-31-02-04 DoS cap

// V5 ASVS: validate dtlsParameters shape before passing to transport.connect()
function validateDtlsParameters(params) {
  if (!params || typeof params !== "object") return false;
  if (!Array.isArray(params.fingerprints) || params.fingerprints.length === 0) return false;
  for (const fp of params.fingerprints) {
    if (!fp || typeof fp !== "object") return false;
    if (typeof fp.algorithm !== "string" || typeof fp.value !== "string") return false;
  }
  if (params.role !== undefined && !VALID_DTLS_ROLES.has(params.role)) return false;
  return true;
}

// V5 ASVS: validate rtpParameters shape before passing to transport.produce()
function validateRtpParameters(rtp) {
  if (!rtp || typeof rtp !== "object") return false;
  if (!Array.isArray(rtp.codecs) || rtp.codecs.length === 0) return false;
  for (const c of rtp.codecs) {
    if (!c || typeof c !== "object") return false;
    if (typeof c.mimeType !== "string") return false;
  }
  if (!Array.isArray(rtp.encodings)) return false;
  return true;
}

function isLocalhost(addr) {
  if (!addr) return false;
  return (
    addr === "127.0.0.1" ||
    addr === "::1" ||
    addr === "::ffff:127.0.0.1"
  );
}

// Per-connection state.
function makeConnState(role) {
  return {
    role,
    sendTransport: null,
    recvTransport: null,
    producers: new Map(), // id -> producer
    consumers: new Map(), // id -> consumer
  };
}

/**
 * Encode a single text frame per RFC 6455 (server → client, no mask).
 * Replicates the inline pattern used by attachLiveWebSocket in server.mjs.
 */
function encodeTextFrame(json) {
  const payload = Buffer.from(json, "utf8");
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

/**
 * Decode a single text frame (client → server, MUST be masked per RFC 6455).
 * Returns { text } | { close: true } | null when frame is malformed.
 */
function decodeTextFrame(buf) {
  if (buf.length < 2) return null;
  const opcode = buf[0] & 0x0f;
  if (opcode === 0x8) return { close: true };
  if (opcode !== 0x1) return null; // we only handle text frames here
  const masked = (buf[1] & 0x80) !== 0;
  let len = buf[1] & 0x7f;
  let off = 2;
  if (len === 126) {
    if (buf.length < off + 2) return null;
    len = buf.readUInt16BE(off);
    off += 2;
  } else if (len === 127) {
    if (buf.length < off + 8) return null;
    len = Number(buf.readBigUInt64BE(off));
    off += 8;
  }
  let mask = null;
  if (masked) {
    if (buf.length < off + 4) return null;
    mask = buf.subarray(off, off + 4);
    off += 4;
  }
  if (buf.length < off + len) return null;
  const payload = Buffer.from(buf.subarray(off, off + len));
  if (masked && mask) {
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= mask[i & 3];
    }
  }
  return { text: payload.toString("utf8") };
}

/**
 * Attach a /api/webrtc/signal WebSocket handler to the given HTTP server.
 * Returns the global state object (`{ videoProducer }`) so callers can
 * inspect the current Producer for diagnostic / lifecycle purposes.
 *
 * @param {import('node:http').Server} server
 * @param {{ logger?: { info: Function, warn: Function, error: Function } }} [opts]
 */
export function attachWebRtcSignaling(server, { logger = console } = {}) {
  // Module-level shared state — there is exactly ONE active video Producer
  // at any time (the SSR tab). When the SSR tab restarts, the Producer is
  // re-created via the publisher script and `state.videoProducer` is updated.
  const state = {
    videoProducer: null,
    consumerCount: 0,
    // h8: SSR-tab posts its rAF fps every 1s; we keep latest so heartbeat
    // sender can include it in messages to consumers.
    ssrFps: null,
    ssrFpsAtMs: 0,
  };

  server.on("upgrade", (req, socket) => {
    let url;
    try {
      url = new URL(req.url || "/", "http://localhost");
    } catch {
      // Wrong URL shape — let other upgrade handlers try.
      return;
    }
    if (url.pathname !== "/api/webrtc/signal") return; // not for us

    const role = url.searchParams.get("role") === "ssr-tab" ? "ssr-tab" : "consumer";

    // T-31-02-01 spoofing guard: ssr-tab role is restricted to localhost.
    if (role === "ssr-tab" && !isLocalhost(req.socket.remoteAddress)) {
      logger.warn(
        `[ssr-signal] rejecting ssr-tab role from non-localhost ${req.socket.remoteAddress}`,
      );
      socket.destroy();
      return;
    }

    // T-31-02-04 DoS cap: throttle consumer count.
    if (role === "consumer" && state.consumerCount >= MAX_CONSUMER_CONNECTIONS) {
      logger.warn(`[ssr-signal] consumer cap (${MAX_CONSUMER_CONNECTIONS}) reached — rejecting`);
      socket.destroy();
      return;
    }

    const key = req.headers["sec-websocket-key"];
    if (!key) {
      socket.destroy();
      return;
    }
    const accept = createHash("sha1")
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`, "utf8")
      .digest("base64");
    socket.write(
      [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${accept}`,
        "",
        "",
      ].join("\r\n"),
    );

    const conn = makeConnState(role);
    if (role === "consumer") state.consumerCount += 1;

    // h4 hotfix (2026-05-06): D-C4 heartbeat. The receiver expects
    // {type:"heartbeat"} every ~1-2s on the same WS. Without it the
    // 3s heartbeat-stale indicator fires and causes a reconnect storm.
    // Heartbeats are cheap (~30 bytes per consumer per second).
    let heartbeatTimer = null;
    if (role === "consumer" || role === "ssr-tab") {
      heartbeatTimer = setInterval(() => {
        try {
          // h8: piggyback the SSR-tab's reported fps on the heartbeat for
          // consumers so the Pi diagnostic chip can show "Pi-fps · SSR-fps".
          // ssrFps is null until the SSR tab posts its first sample (~1s
          // after publisher init); receivers gracefully handle missing.
          const ssrFresh = state.ssrFps !== null && (Date.now() - state.ssrFpsAtMs) < 5000;
          const payload = { type: "heartbeat", t: Date.now() };
          if (role === "consumer" && ssrFresh) payload.ssrFps = state.ssrFps;
          const frame = encodeTextFrame(JSON.stringify(payload));
          socket.write(frame);
        } catch {
          // socket already closing — let close handler clean up
        }
      }, 1500);
      // Don't keep the process alive on the heartbeat alone.
      heartbeatTimer.unref?.();
    }
    logger.info(`[ssr-signal] connect role=${role} addr=${req.socket.remoteAddress}`);

    function send(obj) {
      try {
        socket.write(encodeTextFrame(JSON.stringify(obj)));
      } catch (err) {
        logger.warn(`[ssr-signal] send failed: ${err?.message ?? "unknown"}`);
      }
    }
    function sendErr(reason, requestId = null) {
      send({ type: "error", reason, requestId });
    }

    socket.on("data", async (buf) => {
      const frame = decodeTextFrame(buf);
      if (!frame) return;
      if (frame.close) {
        socket.end();
        return;
      }
      let msg;
      try {
        msg = JSON.parse(frame.text);
      } catch {
        sendErr("invalid-json");
        return;
      }
      if (!msg || typeof msg !== "object") {
        sendErr("invalid-message");
        return;
      }

      // h8: SSR-fps report from the publisher script. Not part of the
      // RPC contract — it's a fire-and-forget telemetry message. We
      // accept it only on ssr-tab connections to prevent consumers
      // from spoofing.
      if (msg.type === "ssr-fps" && conn.role === "ssr-tab") {
        const f = Number(msg.fps);
        if (Number.isFinite(f) && f >= 0 && f <= 240) {
          state.ssrFps = Math.round(f * 10) / 10;
          state.ssrFpsAtMs = Date.now();
        }
        return;
      }

      const { action, requestId = null } = msg;
      if (typeof action !== "string" || !KNOWN_ACTIONS.has(action)) {
        sendErr("unknown-action", requestId);
        return;
      }

      try {
        const router = getRouter();
        if (!router) {
          sendErr("router-not-ready", requestId);
          return;
        }

        if (action === "get-router-rtp-capabilities") {
          send({
            type: "router-rtp-capabilities",
            requestId,
            rtpCapabilities: router.rtpCapabilities,
          });
          return;
        }

        if (action === "create-send-transport" || action === "create-recv-transport") {
          const t = await createWebRtcTransport({ router });
          if (action === "create-send-transport") conn.sendTransport = t;
          else conn.recvTransport = t;
          send({
            type: action === "create-send-transport" ? "send-transport-created" : "recv-transport-created",
            requestId,
            id: t.id,
            iceParameters: t.iceParameters,
            iceCandidates: t.iceCandidates,
            dtlsParameters: t.dtlsParameters,
          });
          return;
        }

        if (action === "connect-transport") {
          if (!validateDtlsParameters(msg.dtlsParameters)) {
            sendErr("invalid-dtls", requestId);
            return;
          }
          const t =
            msg.transportId === conn.sendTransport?.id
              ? conn.sendTransport
              : msg.transportId === conn.recvTransport?.id
                ? conn.recvTransport
                : null;
          if (!t) {
            sendErr("transport-not-found", requestId);
            return;
          }
          await t.connect({ dtlsParameters: msg.dtlsParameters });
          send({ type: "transport-connected", requestId });
          return;
        }

        if (action === "produce") {
          if (conn.role !== "ssr-tab") {
            sendErr("only-ssr-tab-can-produce", requestId);
            return;
          }
          // D-D2 reversal: video-only Producer.
          if (msg.kind !== "video") {
            sendErr("only-video-supported (audio is Pi-local — see D-D2 reversal)", requestId);
            return;
          }
          if (!validateRtpParameters(msg.rtpParameters)) {
            sendErr("invalid-rtp-parameters", requestId);
            return;
          }
          if (!conn.sendTransport) {
            sendErr("no-send-transport", requestId);
            return;
          }
          const producer = await conn.sendTransport.produce({
            kind: "video",
            rtpParameters: msg.rtpParameters,
          });
          conn.producers.set(producer.id, producer);
          state.videoProducer = producer;
          // When the producer closes (SSR tab restart), clear the global slot
          // and notify any active consumers via producer-closed events.
          producer.on("transportclose", () => {
            if (state.videoProducer === producer) state.videoProducer = null;
          });
          send({ type: "produced", requestId, id: producer.id });
          logger.info(`[ssr-signal] producer up id=${producer.id} kind=video`);
          return;
        }

        if (action === "consume") {
          if (!conn.recvTransport) {
            sendErr("no-recv-transport", requestId);
            return;
          }
          // D-D2 reversal: audio is not in the stream.
          if (msg.kind === "audio") {
            sendErr("audio-not-in-stream-use-pi-local-audio", requestId);
            return;
          }
          const producer = state.videoProducer;
          if (!producer) {
            sendErr("no-producer-yet", requestId);
            return;
          }
          if (!router.canConsume({
            producerId: producer.id,
            rtpCapabilities: msg.rtpCapabilities,
          })) {
            sendErr("cannot-consume", requestId);
            return;
          }
          const consumer = await conn.recvTransport.consume({
            producerId: producer.id,
            rtpCapabilities: msg.rtpCapabilities,
            paused: true, // resume after client signals ready
          });
          conn.consumers.set(consumer.id, consumer);
          consumer.on("producerclose", () => {
            // Producer went away (e.g. SSR tab restart). Notify the consumer.
            send({ type: "producer-closed", consumerId: consumer.id });
          });
          send({
            type: "consumed",
            requestId,
            id: consumer.id,
            producerId: producer.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          });
          return;
        }

        if (action === "resume-consumer") {
          const c = conn.consumers.get(msg.consumerId);
          if (!c) {
            sendErr("consumer-not-found", requestId);
            return;
          }
          await c.resume();
          send({ type: "consumer-resumed", requestId });
          return;
        }
      } catch (err) {
        logger.error(`[ssr-signal] action=${action} error: ${err?.message}`);
        sendErr(err?.message ?? "internal-error", requestId);
      }
    });

    socket.on("close", () => {
      if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
      for (const p of conn.producers.values()) { try { p.close(); } catch {} }
      for (const c of conn.consumers.values()) { try { c.close(); } catch {} }
      if (conn.sendTransport) { try { conn.sendTransport.close(); } catch {} }
      if (conn.recvTransport) { try { conn.recvTransport.close(); } catch {} }
      // If this connection's producer was the global video producer, clear it.
      if (state.videoProducer && [...conn.producers.values()].includes(state.videoProducer)) {
        state.videoProducer = null;
      }
      if (conn.role === "consumer") {
        state.consumerCount = Math.max(0, state.consumerCount - 1);
      }
      logger.info(`[ssr-signal] disconnect role=${conn.role}`);
    });
    socket.on("error", () => {
      // The "close" handler above does the cleanup.
    });
  });

  return state;
}

// Test-only exports (prefixed __test_ to make their non-public nature explicit).
// These are used by test/ssr-webrtc-signaling.test.mjs to lock the protocol
// contract without spinning up a live socket.
export const __test_KNOWN_ACTIONS = KNOWN_ACTIONS;
export const __test_validateDtlsParameters = validateDtlsParameters;
export const __test_validateRtpParameters = validateRtpParameters;
export const __test_MAX_CONSUMER_CONNECTIONS = MAX_CONSUMER_CONNECTIONS;
