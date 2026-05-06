// Phase 31 Plan 03 — Pi-side WebRTC consumer.
// Connects to /api/webrtc/signal?role=consumer (Plan 02 endpoint), builds a
// mediasoup-client Device, creates a recv-transport, consumes the SSR tab's
// video Producer (D-D2 reversal: video-only — audio is Pi-local via
// runtime-wire-room-audio-binders.js), attaches the resulting MediaStream
// to the <video> element, and exposes hooks for the bootstrap's D-C4
// three-indicator disconnect monitor.
//
// `requestVideoFrameCallback` is the D-C4 indicator-2 source (last-frame
// timestamp). `render-host-down` from the heartbeat WS signals an
// explicit operator-actionable error per D-B4.

/**
 * @typedef {Object} ReceiverHandle
 * @property {() => void} stop - tear down PC + WS
 * @property {() => Promise<void>} restart - tear down + reconnect
 * @property {() => string} getConnectionState - current RTCPeerConnection.connectionState
 * @property {(cb: (state: string) => void) => void} onConnectionStateChange
 * @property {(cb: () => void) => void} onFrameReceived
 * @property {(cb: () => void) => void} onHeartbeat
 */

/**
 * Spin up a single WebRTC consumer attached to the existing Plan-02
 * signaling endpoint. Mediasoup-client is loaded from the vendored
 * `/vendor/mediasoup-client.min.js` blob (Plan 02 esbuild output) so the
 * Pi never reaches out to a CDN — preserves LAN-only publishability.
 *
 * @param {object} opts
 * @param {HTMLVideoElement} opts.videoEl - The <video> element to attach the MediaStream to
 * @param {string} [opts.signalUrl]
 * @param {Console} [opts.logger]
 * @returns {Promise<ReceiverHandle>}
 */
export async function createWebRtcReceiver({
  videoEl,
  signalUrl = `ws://${location.host}/api/webrtc/signal?role=consumer`,
  logger = console,
}) {
  // 1. Load vendored mediasoup-client (Plan 02 produces the bundle on
  //    first /vendor/mediasoup-client.min.js request, cached on disk).
  if (!window.mediasoupClient) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "/vendor/mediasoup-client.min.js";
      s.onload = res;
      s.onerror = () => rej(new Error("mediasoup-client load failed"));
      document.head.appendChild(s);
    });
  }
  const ms = window.mediasoupClient;

  // h17: ssrStats and serverInfo are piggybacked on heartbeat. We expose
  // them as separate channels so the bootstrap can route them to the
  // diagnostic overlay without parsing the heartbeat envelope itself.
  const subscribers = {
    connectionState: [],
    frame: [],
    heartbeat: [],
    ssrFps: [],
    ssrStats: [],
    serverInfo: [],
  };
  function emit(channel, ...args) {
    for (const cb of subscribers[channel]) {
      try {
        cb(...args);
      } catch (e) {
        logger.warn(e);
      }
    }
  }

  let ws = null;
  let recvTransport = null;
  let videoConsumer = null;
  let stopped = false;
  const pending = new Map();
  let reqIdSeq = 0;

  function rpc(action, payload = {}) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error(`ws not open for ${action}`));
    }
    const requestId = String(++reqIdSeq);
    ws.send(JSON.stringify({ action, requestId, ...payload }));
    return new Promise((res, rej) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        rej(new Error(`${action} timeout`));
      }, 10000);
      pending.set(requestId, { res, rej, timer });
    });
  }

  async function connect() {
    ws = new WebSocket(signalUrl);
    await new Promise((res, rej) => {
      const onOpen = () => {
        ws.removeEventListener("error", onErr);
        res();
      };
      const onErr = () => {
        ws.removeEventListener("open", onOpen);
        rej(new Error("ws open failed"));
      };
      ws.addEventListener("open", onOpen, { once: true });
      ws.addEventListener("error", onErr, { once: true });
    });
    ws.addEventListener("message", (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m.type === "heartbeat") {
        // h8: server piggybacks SSR-tab fps on heartbeat for diagnostic chip.
        if (typeof m.ssrFps === "number") emit("ssrFps", m.ssrFps);
        // h17: extended ssr-stats blob (board, decoder, gifs, output res, …)
        if (m.ssrStats && typeof m.ssrStats === "object") emit("ssrStats", m.ssrStats);
        // h17: server-info (encoder, preset, bitrate, …) — sent on every
        // heartbeat for resilience (consumer can join late and still get it).
        if (m.serverInfo && typeof m.serverInfo === "object") emit("serverInfo", m.serverInfo);
        emit("heartbeat");
        return;
      }
      // D-B4: explicit render-host-down message → bootstrap shows error UI
      if (m.type === "render-host-down") {
        emit("connectionState", "host-down");
        return;
      }
      if (m.requestId && pending.has(m.requestId)) {
        const { res, rej, timer } = pending.get(m.requestId);
        clearTimeout(timer);
        pending.delete(m.requestId);
        if (m.type === "error") rej(new Error(m.reason || "rpc-error"));
        else res(m);
      }
    });
    ws.addEventListener("close", () => {
      if (!stopped) emit("connectionState", "ws-closed");
    });

    const caps = await rpc("get-router-rtp-capabilities");
    const device = new ms.Device();
    await device.load({ routerRtpCapabilities: caps.rtpCapabilities });

    const tx = await rpc("create-recv-transport");
    recvTransport = device.createRecvTransport({
      id: tx.id,
      iceParameters: tx.iceParameters,
      iceCandidates: tx.iceCandidates,
      dtlsParameters: tx.dtlsParameters,
    });
    recvTransport.on("connect", ({ dtlsParameters }, cb, eb) => {
      rpc("connect-transport", { transportId: tx.id, dtlsParameters })
        .then(() => cb())
        .catch(eb);
    });
    recvTransport.on("connectionstatechange", (state) =>
      emit("connectionState", state),
    );

    // Video consumer (D-D2 reversal: video-only — no audio consumer).
    const videoMsg = await rpc("consume", {
      kind: "video",
      rtpCapabilities: device.rtpCapabilities,
    });
    videoConsumer = await recvTransport.consume({
      id: videoMsg.id,
      producerId: videoMsg.producerId,
      kind: videoMsg.kind,
      rtpParameters: videoMsg.rtpParameters,
    });
    await rpc("resume-consumer", { consumerId: videoMsg.id });

    videoEl.srcObject = new MediaStream([videoConsumer.track]);

    // D-C4 indicator 2: last-frame timestamp via requestVideoFrameCallback.
    // Falls back to `timeupdate` event when the API is unavailable (older
    // browser builds). `stopped` short-circuits the recursion on teardown.
    function trackFrames() {
      if (stopped) return;
      if (typeof videoEl.requestVideoFrameCallback === "function") {
        videoEl.requestVideoFrameCallback(() => {
          emit("frame");
          trackFrames();
        });
      } else {
        const onTU = () => emit("frame");
        videoEl.addEventListener("timeupdate", onTU);
      }
    }
    trackFrames();

    emit("connectionState", "connected");
  }

  function stop() {
    stopped = true;
    try {
      videoConsumer?.close();
    } catch {}
    try {
      recvTransport?.close();
    } catch {}
    try {
      ws?.close();
    } catch {}
  }

  async function restart() {
    stop();
    stopped = false;
    await connect();
  }

  await connect();

  return {
    stop,
    restart,
    getConnectionState: () =>
      recvTransport?.connectionState ?? "new",
    onConnectionStateChange: (cb) => subscribers.connectionState.push(cb),
    onFrameReceived: (cb) => subscribers.frame.push(cb),
    onHeartbeat: (cb) => subscribers.heartbeat.push(cb),
    onSsrFps: (cb) => subscribers.ssrFps.push(cb), // h8: SSR-tab internal render fps
    onSsrStats: (cb) => subscribers.ssrStats.push(cb), // h17: rich SSR stats blob
    onServerInfo: (cb) => subscribers.serverInfo.push(cb), // h17: encoder/preset/bitrate
    // h17: getStats access for the diagnostic overlay's consumer-side
    // RTC stats (codec, RTT, jitter, packet loss, frames decoded/dropped).
    // Returns the underlying RTCPeerConnection used by mediasoup-client's
    // recv-transport (best-effort — different mediasoup-client versions
    // may not expose `_handler._pc`).
    getRtcPeerConnection: () => {
      try {
        const t = recvTransport;
        if (!t) return null;
        const pc = t.handler?._pc || t._handler?._pc || t.pc || null;
        return pc;
      } catch {
        return null;
      }
    },
  };
}
