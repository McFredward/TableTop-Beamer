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
// h38 (2026-05-06): raised from 10 to 50. The original cap was a DoS
// guard for a hostile WAN-exposed scenario, but the user's deployment
// is LAN-only and during a reconnect storm transient over-counts (old
// WS connections in close-progress while new ones open) hit the 10-
// cap and started rejecting legitimate reconnect attempts — once
// stuck, only a server restart freed the slots. 50 leaves ample
// headroom for transient over-counts while still bounding worst-case
// memory use; the underlying reconnect-storm root cause is being
// investigated separately.
const MAX_CONSUMER_CONNECTIONS = 50; // T-31-02-04 DoS cap

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
  // h38 (2026-05-06): per-IP connection registry. Originally one entry per
  // IP — meant to clean up Pi-zombie sockets after a fast reconnect.
  //
  // Phase 33 (Suspect 9, 2026-05-08): refactored to Map<addr, Set<entry>>
  // so multiple healthy consumers from the same IP coexist (e.g. operator's
  // local browser + Pi receiver both behind same NAT). The stale-guard in
  // the connect handler now only destroys entries whose underlying socket
  // is already half-open / closing — alive sockets are left intact and
  // the new consumer is added alongside.
  //
  // Cap=10 (MAX_CONSUMER_CONNECTIONS) and the per-socket close handler
  // bound the worst case if zombies accumulate before TCP keepalive fires.
  const connectionsByAddr = new Map();
  function _allConsumerEntries() {
    const out = [];
    for (const set of connectionsByAddr.values()) {
      for (const entry of set) {
        if (entry?.conn?.role === "consumer") out.push(entry);
      }
    }
    return out;
  }

  // Phase 32 D-B5: broadcast producer-ready to all consumer sockets when the
  // video producer transitions null → non-null. Defined here (not module-level)
  // so it has closure access to connectionsByAddr.
  function broadcastProducerReady() {
    const frame = encodeTextFrame(JSON.stringify({ type: "producer-ready" }));
    for (const entry of _allConsumerEntries()) {
      try {
        entry.socket.write(frame);
      } catch {
        // swallow per-socket errors; consumers will reconnect via their own logic
      }
    }
  }

  // Phase 33 Plan 01-T3 (Suspect 7): generic consumer fanout helper. Used
  // by ssr-render-host to emit `render-host-down` when health-ping detects
  // CDP unresponsiveness (3 consecutive failures = 15 s) — gives the
  // consumer a deterministic signal so its UI flips to the "Render host
  // crashed" overlay instead of the generic "Reconnecting…" countdown.
  // Returns the count of sockets the message was attempted on.
  function broadcastToConsumers(payload) {
    let frame;
    try { frame = encodeTextFrame(JSON.stringify(payload)); } catch { return 0; }
    let n = 0;
    for (const entry of _allConsumerEntries()) {
      try {
        entry.socket.write(frame);
        n += 1;
      } catch {
        // swallow per-socket errors; consumers will reconnect via their own logic
      }
    }
    return n;
  }

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
    // h17: SSR tab also posts a richer { type: "ssr-stats", stats: {...} }
    // envelope every 1s carrying decoder method, board id, GIF cache
    // counts, render-method, etc. We piggyback the FULL stats blob on
    // every consumer heartbeat so the receiver chip can paint the
    // extended overlay without round-tripping its own RPCs.
    ssrStats: null,
    ssrStatsAtMs: 0,
    // h17: server-side encoder/preset info — set once at boot via
    // `setServerInfo`, included on every consumer heartbeat so the chip
    // can show "encoder=x264-software bitrate=8.0M preset=balanced".
    serverInfo: null,
    // Phase 33 Plan 02-T2 (Suspect 6): timestamp of the last "publisher is
    // alive" signal received from the ssr-tab WS. Updated on every ssr-fps /
    // ssr-stats envelope (1 s cadence). The render-host watchdog reads this
    // to detect "Chromium CDP is up but the publisher's WS dropped" — the
    // BUG-B failure mode where state.videoProducer stays null forever.
    publisherWsLastPongMs: 0,
    // Sticky flag — flipped true once on the first ssr-tab WS upgrade and
    // never reset for the process lifetime. The watchdog uses this so it
    // does NOT misfire during cold boot (publisher hasn't reached WS-upgrade
    // yet — getPublisherWsAgeMs() would return Infinity, tripping the
    // staleness gate and emitting a bogus render-host-down to consumers).
    // Once true, the watchdog is armed; if the publisher's WS later
    // disconnects (resetting publisherWsLastPongMs to 0 → age=Infinity),
    // the watchdog correctly detects BUG-B and triggers a restart.
    publisherHasEverConnected: false,
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
    conn.remoteAddr = req.socket?.remoteAddress ?? null;

    // h38 + Phase 33 Suspect 9 (2026-05-08): zombie-only stale-guard.
    // The original h38 pre-emptive destroy was per-IP, which broke when
    // two healthy consumers connected from the same IP (e.g. operator's
    // local browser + Pi receiver behind the same NAT). Now: only destroy
    // entries whose socket is already closing/closed/destroyed (true
    // zombies that haven't been reaped yet). Healthy peers from the same
    // IP coexist alongside the new connection.
    //
    // h10 (2026-05-07) preserved: only consumer connections are registered;
    // the ssr-tab (singleton publisher) is never tracked in connectionsByAddr.
    if (role === "consumer" && conn.remoteAddr) {
      const set = connectionsByAddr.get(conn.remoteAddr);
      if (set) {
        for (const entry of [...set]) {
          const sock = entry?.socket;
          if (!sock) {
            set.delete(entry);
            continue;
          }
          // writable===false means socket is closing/closed; destroy it
          // and drop the entry.
          if (sock.destroyed || sock.writable === false) {
            try { sock.destroy(); } catch (_) {}
            set.delete(entry);
          }
        }
        if (set.size === 0) connectionsByAddr.delete(conn.remoteAddr);
      }
    }
    if (conn.remoteAddr && role === "consumer") {
      const entry = { socket, conn };
      let set = connectionsByAddr.get(conn.remoteAddr);
      if (!set) {
        set = new Set();
        connectionsByAddr.set(conn.remoteAddr, set);
      }
      set.add(entry);
      // Stash the entry on the socket so the close handler can find + remove
      // it without scanning the set.
      socket._connByAddrEntry = entry;
    }

    if (role === "consumer") state.consumerCount += 1;

    // Phase 33 Plan 02-T2 (Suspect 6): seed publisher-liveness timestamp on
    // ssr-tab connect so the watchdog doesn't misfire during the brief
    // window before the first ssr-fps envelope arrives (~1 s). Also flip
    // the sticky publisherHasEverConnected flag — that arms the watchdog.
    // Before this point the watchdog is intentionally disabled (cold-boot
    // window: the publisher script is still navigating + injecting; the
    // CDP-fail path will catch real failures, the watchdog must not
    // double-fire on a healthy boot).
    if (role === "ssr-tab") {
      state.publisherWsLastPongMs = Date.now();
      state.publisherHasEverConnected = true;
    }

    // h4 hotfix (2026-05-06): D-C4 heartbeat. The receiver expects
    // {type:"heartbeat"} every ~1-2s on the same WS. Without it the
    // 3s heartbeat-stale indicator fires and causes a reconnect storm.
    // Heartbeats are cheap (~30 bytes per consumer per second).
    let heartbeatTimer = null;
    if (role === "consumer" || role === "ssr-tab") {
      heartbeatTimer = setInterval(() => {
        try {
          // h17: piggyback FULL ssr-stats blob (which includes fps) plus
          // the static server-info snapshot so the consumer's diagnostic
          // overlay can render decoder, encoder, board, gifs, etc. on
          // every tick without its own polling. Backwards-compatible:
          // older consumers still read `ssrFps`.
          const ssrFresh = state.ssrFps !== null && (Date.now() - state.ssrFpsAtMs) < 5000;
          const ssrStatsFresh = state.ssrStats !== null && (Date.now() - state.ssrStatsAtMs) < 5000;
          const payload = { type: "heartbeat", t: Date.now() };
          if (role === "consumer") {
            if (ssrFresh) payload.ssrFps = state.ssrFps;
            if (ssrStatsFresh) payload.ssrStats = state.ssrStats;
            if (state.serverInfo) payload.serverInfo = state.serverInfo;
          }
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
        // Phase 33 Plan 02-T2 (Suspect 6): publisher liveness timestamp.
        // The ssr-tab posts ssr-fps + ssr-stats every 1 s — that's our
        // "publisher WS still alive" signal. Render-host watchdog reads it.
        state.publisherWsLastPongMs = Date.now();
        const f = Number(msg.fps);
        if (Number.isFinite(f) && f >= 0 && f <= 240) {
          state.ssrFps = Math.round(f * 10) / 10;
          state.ssrFpsAtMs = Date.now();
        }
        return;
      }

      // h17: extended ssr-stats envelope (board, decoder, gifs, output
      // resolution, etc.). Like ssr-fps it's fire-and-forget telemetry,
      // accepted only from the trusted ssr-tab role. We sanitize before
      // caching: the heartbeat sender will copy this verbatim out to
      // every consumer.
      if (msg.type === "ssr-stats" && conn.role === "ssr-tab") {
        // Phase 33 Plan 02-T2 (Suspect 6): publisher liveness timestamp.
        state.publisherWsLastPongMs = Date.now();
        const incoming = msg.stats;
        if (incoming && typeof incoming === "object" && !Array.isArray(incoming)) {
          const sanitized = {};
          for (const [k, v] of Object.entries(incoming)) {
            if (typeof k !== "string" || k.length > 32) continue;
            if (
              typeof v === "string" ? v.length <= 200 :
              typeof v === "number" ? Number.isFinite(v) :
              typeof v === "boolean" ? true :
              false
            ) {
              sanitized[k] = v;
            }
          }
          // Cap total payload size as a defensive measure (~32 fields).
          const limited = Object.fromEntries(Object.entries(sanitized).slice(0, 32));
          state.ssrStats = limited;
          state.ssrStatsAtMs = Date.now();
          // Keep the legacy fps cache in sync so older consumers still work.
          if (typeof limited.fps === "number") {
            state.ssrFps = limited.fps;
            state.ssrFpsAtMs = Date.now();
          }
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
          // Phase 32 D-B5: broadcast producer-ready on null→non-null transition.
          const wasNull = state.videoProducer == null;
          state.videoProducer = producer;
          if (wasNull) {
            logger.info("[ssr-signal] producer up — broadcasting producer-ready to consumers");
            broadcastProducerReady();
          }
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
          // Phase-31 h19 (2026-05-06): instead of immediately rejecting
          // with `no-producer-yet` (which triggers the receiver's
          // reconnect storm — observed as 10+ "connect role=consumer
          // / disconnect" cycles at boot before stable), we HOLD the
          // request for up to 30 s while the SSR Chromium tab finishes
          // booting + publishing. The receiver's RPC has a 10 s ceiling
          // so cap to a slightly shorter window (8 s) to surface a
          // single, debuggable error if the publisher genuinely fails.
          let producer = state.videoProducer;
          if (!producer) {
            // Phase-31 h26 (2026-05-06): tighter 50 ms poll interval
            // (was 200 ms) so a fresh producer is picked up within ~50 ms
            // of being available. With the typical SSR-tab publish time
            // of 1.5-2 s, this means the receiver waits the bare minimum
            // for the producer instead of an extra 200 ms-aligned tick.
            const waitDeadline = Date.now() + 8000;
            while (Date.now() < waitDeadline) {
              await new Promise((r) => setTimeout(r, 50));
              producer = state.videoProducer;
              if (producer) break;
            }
            if (!producer) {
              sendErr("no-producer-yet", requestId);
              return;
            }
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
          // Phase 33 iter-3 (2026-05-09): force PLI on every consumer
          // resume. ROOT CAUSE of "Pi reload → schwarzes Bild + RECONNECTING":
          // when the FIRST consumer disconnects and the SECOND consumer
          // subscribes to the same producer, the second consumer's H264
          // decoder needs a keyframe (SPS/PPS) to start. mediasoup's
          // auto-keyframe-on-new-consumer is unreliable on the same
          // producer (observed: video.readyState reaches 4 but currentTime
          // never advances past 0 — decoder stalled waiting for SPS/PPS).
          // Explicitly request a keyframe forces the publisher to send one.
          //
          // Sent AFTER replying so the consumer doesn't wait on PLI roundtrip.
          send({ type: "consumer-resumed", requestId });
          // Phase 33 iter-4: single keyframe request after resume — heavier
          // PLI burst was reverted because it correlated with publisher-tab
          // freezes (the watchdog kept killing the SSR-tab while it was
          // busy responding to many PLIs at once + decoding GIFs).
          if (c.kind === "video" && typeof c.requestKeyFrame === "function") {
            c.requestKeyFrame().catch((err) =>
              logger.warn(`[ssr-signal] requestKeyFrame failed: ${err?.message ?? err}`)
            );
          }
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
      // Phase 33 Plan 02-T2 (Suspect 6): on ssr-tab disconnect, mark the
      // publisher-WS as gone so the watchdog detects it on the next tick.
      // (We zero the timestamp; getPublisherWsAgeMs returns Infinity when
      // it's 0, which trips the watchdog's stale-threshold immediately.)
      if (conn.role === "ssr-tab") {
        state.publisherWsLastPongMs = 0;
      }
      if (conn.role === "consumer") {
        state.consumerCount = Math.max(0, state.consumerCount - 1);
      }
      // h38 + Phase 33 Suspect 9: drop just THIS socket's entry from the
      // per-IP set. Other healthy peers from the same IP (Pi + operator's
      // local browser) stay registered.
      if (conn.remoteAddr) {
        const set = connectionsByAddr.get(conn.remoteAddr);
        const entry = socket._connByAddrEntry;
        if (set && entry) {
          set.delete(entry);
          if (set.size === 0) connectionsByAddr.delete(conn.remoteAddr);
        }
      }
      logger.info(`[ssr-signal] disconnect role=${conn.role}`);
    });
    socket.on("error", (err) => {
      // h38: log and force-destroy on socket error so a half-broken
      // connection doesn't sit holding a consumerCount slot. The close
      // handler above runs after destroy() and decrements the cap.
      logger.warn(`[ssr-signal] socket error role=${conn.role}: ${err?.message || err}`);
      try { socket.destroy(); } catch (_) {}
    });
  });

  // Phase 33 Plan 01-T3 (Suspect 7): expose the generic fanout helper +
  // a typed `broadcastRenderHostDown` shortcut. ssr-render-host calls the
  // shortcut from its health-ping path the moment 3 consecutive CDP
  // failures cross the threshold, BEFORE scheduleRestart() initiates a
  // backoff-sleep + relaunch. Consumers see the host-down event ~15 s
  // earlier than the previous frame-stale-only path.
  state.broadcastToConsumers = broadcastToConsumers;
  state.broadcastRenderHostDown = () => broadcastToConsumers({ type: "render-host-down" });
  state.broadcastProducerReady = broadcastProducerReady;

  // Phase 33 Plan 02-T2 (Suspect 6): publisher-WS-age accessor used by
  // ssr-render-host's watchdog. Three return states:
  //   * -1: cold-boot (publisher has never connected) → DO NOT fire watchdog.
  //         The CDP-fail path catches real cold-boot failures; firing the
  //         watchdog here would emit bogus render-host-down events to
  //         every consumer mid-startup.
  //   * Infinity: publisher connected at least once but timestamp is 0
  //         (WS closed) → fire watchdog (BUG-B: WS dropped, CDP healthy).
  //   * finite ms: time since last ssr-fps/ssr-stats from publisher.
  state.getPublisherWsAgeMs = () => {
    if (!state.publisherHasEverConnected) return -1;
    if (!state.publisherWsLastPongMs) return Infinity;
    return Date.now() - state.publisherWsLastPongMs;
  };

  // h17: expose setServerInfo so server.mjs can publish boot-time
  // encoder/preset/bitrate info into every consumer heartbeat. The
  // shape is intentionally free-form (a string→primitive map) so we
  // can extend it without a wire-protocol revision.
  state.setServerInfo = (info) => {
    if (info && typeof info === "object") {
      const sanitized = {};
      for (const [k, v] of Object.entries(info)) {
        if (typeof k !== "string" || k.length > 32) continue;
        if (
          typeof v === "string" ? v.length <= 200 :
          typeof v === "number" ? Number.isFinite(v) :
          typeof v === "boolean" ? true :
          false
        ) {
          sanitized[k] = v;
        }
      }
      state.serverInfo = Object.fromEntries(Object.entries(sanitized).slice(0, 32));
    } else {
      state.serverInfo = null;
    }
  };

  return state;
}

// Test-only exports (prefixed __test_ to make their non-public nature explicit).
// These are used by test/ssr-webrtc-signaling.test.mjs to lock the protocol
// contract without spinning up a live socket.
export const __test_KNOWN_ACTIONS = KNOWN_ACTIONS;
export const __test_validateDtlsParameters = validateDtlsParameters;
export const __test_validateRtpParameters = validateRtpParameters;
export const __test_MAX_CONSUMER_CONNECTIONS = MAX_CONSUMER_CONNECTIONS;
