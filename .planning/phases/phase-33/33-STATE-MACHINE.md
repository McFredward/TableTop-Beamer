# Phase 33 — Connection State-Machine Contract

**Status:** Investigation artefact (D-01.3) for Phase 33 Connection Stability Deep Dive.
**Date:** 2026-05-08
**Audience:** every Phase-33 fix references this document. New code must cite the section it satisfies (or violates) before being merged.
**Reading order:** Section 1 (topology) → Section 2 (wire) → Section 3 (timers) → Section 4 (states) → Section 5 (failure paths) → Section 6 (suspect list).

The contract is written from the as-implemented codebase at `master / 7d4063a` (Phase 32 closed) — h1..h12 hotfixes are baked in, h4 is reverted, h9 reapplied. File:line references are exact to that commit unless noted.

---

## Section 1 — Three-Process Topology

The SSR / Pi pipeline runs in **three independent JavaScript contexts**. Each owns a distinct slice of state and depends on the others through narrow, well-defined interfaces. Mis-attribution between these processes is the single most common source of bugs, so the inventory below is the canonical map.

### 1.1 Server Node main (`node server.mjs`)

**Spawn:** the operator launches `SSR_RENDER_HOST=1 SSR_PUBLISH=1 PORT=4173 node server.mjs`. The boot order inside the process is:

1. `purgeStaleMediasoupWorker()` (`server.mjs:4217`) — system-wide `pkill -f mediasoup-worker` with 200 ms grace (`ssr-mediasoup-router.mjs`).
2. `bootMediasoupRouter()` (`server.mjs:4218`) — creates the mediasoup Worker + Router, advertises H264 only, binds RTC ports 40000-40100, auto-detects `announcedIp` (`ssr-mediasoup-router.mjs:87`).
3. `attachWebRtcSignaling(server)` (`server.mjs:4219`) — installs the `/api/webrtc/signal` upgrade handler and returns the shared `signalingState` object (the `state.videoProducer` slot lives here).
4. `bootSsrRenderHost({ port, autoStart: true })` (`server.mjs:4226`) — kicks off the Chromium-tab supervisor (a Node-side child that owns Xvfb + puppeteer-stream Chromium).
5. HTTP server starts listening on `PORT`.

**Lifecycle:** persists for the operator's session. SIGINT calls `shutdownSsrRenderHost()` then `shutdownMediasoupRouter()`.

**State it owns:**
- mediasoup `Worker` + `Router` (`ssr-mediasoup-router.mjs:78-80`).
- `signalingState.videoProducer` — the canonical slot for the *currently published* SSR video producer (`ssr-webrtc-signaling.mjs:188`).
- `signalingState.consumerCount` — DoS cap counter (`ssr-webrtc-signaling.mjs:190`).
- `signalingState.ssrFps`, `state.ssrStats`, `state.serverInfo` — telemetry caches piggybacked onto every consumer heartbeat.
- `connectionsByAddr` map — per-IP **consumer** registry only (h10 fixed scope, `ssr-webrtc-signaling.mjs:281`).
- The `bootSsrRenderHost(...)` closure owns the Xvfb child PID, the Chromium browser handle, the puppeteer page, the CDP session, the health-ping interval, and the restart back-off.

**State it depends on from peers:**
- The Chromium-tab process must hold a working WebSocket → `signalingState.videoProducer` is null until the in-page publisher script completes its `produce` RPC.
- The Pi consumer's continuous WS presence — but only as a customer of the signaling endpoint; no server logic is gated on consumer presence (consumer disappearance does NOT invalidate the producer).

### 1.2 Server Chromium tab (puppeteer-stream)

**Spawn:** `bootSsrRenderHost.start()` calls `launchBrowser()` (`ssr-render-host.mjs:364`) which uses `puppeteer-stream`. Boot order:

1. `probeEnvironment()` validates Xvfb + ffmpeg + Chromium binary.
2. `pickFreeDisplay(":99")` walks `/tmp/.X<N>-lock` to find a free DISPLAY.
3. `spawnXvfb()` if Linux without `$DISPLAY` (`ssr-render-host.mjs:622`).
4. `puppeteer-stream.launch(...)` with the merged `--use-gl=angle`, `--use-angle=default`, `--disable-features=…`, `--enable-features=TabCaptureFastPath,…` (`ssr-render-host.mjs:426-515`).
5. `page.goto(/output?ssr=1)` (`ssr-render-host.mjs:652`).
6. `injectInPagePublisher(page, ...)` evaluates the in-page publisher script (`ssr-stream-publisher.mjs:456`).

**The in-page publisher script** (string template at `ssr-stream-publisher.mjs:91-444`) is the critical bit — it runs *inside* the Chromium tab and is the only client that ever sends `role=ssr-tab` over the wire. It:

- Lazy-loads `/vendor/mediasoup-client.min.js`.
- Opens `ws://127.0.0.1:PORT/api/webrtc/signal?role=ssr-tab` with a **10 s open timeout** (`ssr-stream-publisher.mjs:171`).
- Drives `Device.load` → `create-send-transport` → `connect-transport` → `produce` (Section 2).
- Captures `getDisplayMedia({ video: true, audio: false })` and feeds it into the `produce` call.
- Posts `{type:"ssr-fps"}` and `{type:"ssr-stats"}` once per second.

**Lifecycle:** dies under any of:
- Xvfb exit → `proc.on("exit")` calls `scheduleRestart()` (`ssr-render-host.mjs:343`).
- Chromium browser disconnect → `browser.on("disconnected")` calls `scheduleRestart()` (`ssr-render-host.mjs:682`).
- 3 consecutive CDP `Runtime.evaluate` failures over 5 s ticks (`ssr-render-host.mjs:521-543`).
- The publisher script `throw` → caught by `injectInPagePublisher` → host logs the error but does **not** kill the browser (`ssr-render-host.mjs:675-680`). This is intentional: the page is still up, the operator could retry. **It is also one of the bugs (Suspect #6) — when the publisher fails, `state.videoProducer` stays null forever and only a CDP-failure recovery path exists.**

**State it owns:**
- The MediaStream from `getDisplayMedia` (one `videoTrack`).
- The mediasoup-client `Device`, `SendTransport`, `Producer`.
- Page-level globals: `window.__ssrProducerIds`, `window.__ssrPublisherError`, `__TT_BEAMER_STATE_FOR_DIAG__`.

**State it depends on from peers:**
- Server `signalingState.videoProducer` slot (it writes there via the `produce` RPC).
- The Node main's `/vendor/mediasoup-client.min.js` route returning a parseable IIFE.

### 1.3 Pi Chromium (`/output/`)

**Spawn:** the Pi's kiosk Chromium loads `http://server-lan-ip:PORT/output/`. The page's classic-script `defer` chain ends in `runtime-orchestration.js`, which detects `isReceiverPath()` and calls `bootReceiver()` (`receiver-bootstrap.js:94`).

**Boot order:**
1. `loadBackoffState(sessionStorage)` reads the persisted `attempts` (`receiver-bootstrap.js:122`).
2. `createStatusUi({ chipEl })` → `ui.showSplash("Connecting to render server…")`.
3. `waitForProducer({ maxWaitMs: 60000, pollIntervalMs: 1000 })` polls `/api/ssr/ready` until `200 OK + ready: true` (`receiver-bootstrap.js:392`).
4. `monitorInterval = setInterval(... 1000ms)` arms the three-indicator disconnect monitor (`receiver-bootstrap.js:404`). h5 ordering: monitor is armed AFTER `waitForProducer` resolves so the heartbeat-stale clock doesn't false-positive during the producer wait.
5. `await tryConnect()` (`receiver-bootstrap.js:499`).
6. `attachInputForwarder(...)` for align-mode pointer events.

**Lifecycle:** persists for the page lifetime. Refresh / Ctrl-R → fresh boot. No browser process restart logic on the Pi side; the page itself is the unit of recovery.

**State it owns:**
- `receiver` handle from `createWebRtcReceiver` (`receiver-webrtc-client.js:35`).
- `RTCPeerConnection` (recv-side) — owned by mediasoup-client's `recvTransport`.
- `WebSocket` to `/api/webrtc/signal?role=consumer`.
- `pcState`, `lastFrameAtMs`, `lastHeartbeatAtMs`, `frameCount`, `receivedFps`, `reconnectAttempts`, `tryConnectInFlight`.
- Local `<video id="ssr-video">` DOM element holding the `MediaStream`.
- `sessionStorage` key `"ssr-reconnect-state"` (survives page reload, NOT browser quit).

**State it depends on from peers:**
- Server `/api/ssr/ready` endpoint (the producer-readiness gate).
- Server signaling endpoint `/api/webrtc/signal?role=consumer` to do RPCs and receive heartbeats.
- The Producer existing on the server side at `consume` time (otherwise the 8 s `no-producer-yet` hold expires).

---

## Section 2 — WebSocket Message Catalog

All messages cross `ws://server:PORT/api/webrtc/signal`. The WebSocket handler is `attachWebRtcSignaling` at `ssr-webrtc-signaling.mjs:159`. Messages are JSON text frames.

`role=` query param determines authorization:
- `role=ssr-tab` — only accepted from `127.0.0.1` (`ssr-webrtc-signaling.mjs:221`). Allowed actions: every `KNOWN_ACTIONS` entry (`ssr-webrtc-signaling.mjs:24-32`). Plus the telemetry-only fire-and-forget envelopes `ssr-fps` / `ssr-stats`.
- `role=consumer` — accepted from any origin within the consumer cap (50, `ssr-webrtc-signaling.mjs:44`). Allowed actions: every `KNOWN_ACTIONS` entry except `produce` (`ssr-webrtc-signaling.mjs:453`).

### 2.1 Catalog (in-protocol)

For each message: **direction** (originator → receiver), **role** (who is allowed to send), **payload**, **trigger**, **side-effect**.

#### `get-router-rtp-capabilities` (request)
- **Dir:** client → server.
- **Role:** ssr-tab or consumer.
- **Payload:** `{ action: "get-router-rtp-capabilities", requestId }`.
- **Trigger:** every ssr-tab/consumer issues this as the first RPC after WS open, before constructing `mediasoup-client.Device`.
- **Side-effect on server:** `router.rtpCapabilities` is read and serialized; no state change.

#### `router-rtp-capabilities` (reply)
- **Dir:** server → client.
- **Payload:** `{ type: "router-rtp-capabilities", requestId, rtpCapabilities }` (`ssr-webrtc-signaling.mjs:408-414`).
- **Trigger:** reply to the above.
- **Side-effect on client:** `device.load({ routerRtpCapabilities })`.

#### `create-send-transport` (request)
- **Dir:** ssr-tab → server.
- **Role:** ssr-tab.
- **Payload:** `{ action: "create-send-transport", requestId }`.
- **Trigger:** publisher script after `Device.load` (`ssr-stream-publisher.mjs:180`).
- **Side-effect on server:** allocates a mediasoup `WebRtcTransport`, stores under `conn.sendTransport` (`ssr-webrtc-signaling.mjs:417-419`).

#### `send-transport-created` (reply)
- **Dir:** server → ssr-tab.
- **Payload:** `{ type: "send-transport-created", requestId, id, iceParameters, iceCandidates, dtlsParameters }`.
- **Trigger:** reply to the above.
- **Side-effect on client:** `device.createSendTransport(...)` materialised.

#### `create-recv-transport` (request)
- **Dir:** consumer → server.
- **Role:** consumer (ssr-tab also has this code path but never uses it).
- **Payload:** `{ action: "create-recv-transport", requestId }`.
- **Trigger:** receiver after `Device.load` (`receiver-webrtc-client.js:179`).
- **Side-effect on server:** allocates a `WebRtcTransport`, stores under `conn.recvTransport`.

#### `recv-transport-created` (reply)
- **Dir:** server → consumer.
- **Payload:** `{ type: "recv-transport-created", requestId, id, iceParameters, iceCandidates, dtlsParameters }`.

#### `connect-transport` (request)
- **Dir:** client → server.
- **Role:** ssr-tab or consumer.
- **Payload:** `{ action: "connect-transport", requestId, transportId, dtlsParameters }`.
- **Trigger:** mediasoup-client emits `transport.on("connect")` once it is ready to DTLS-handshake (`ssr-stream-publisher.mjs:187`, `receiver-webrtc-client.js:186`).
- **Validation:** `validateDtlsParameters` (`ssr-webrtc-signaling.mjs:47`).
- **Side-effect on server:** `transport.connect({ dtlsParameters })` — mediasoup completes the DTLS handshake.

#### `transport-connected` (reply)
- **Dir:** server → client.
- **Payload:** `{ type: "transport-connected", requestId }`.

#### `produce` (request)
- **Dir:** ssr-tab → server.
- **Role:** ssr-tab ONLY (`ssr-webrtc-signaling.mjs:453` — guard: `only-ssr-tab-can-produce`).
- **Payload:** `{ action: "produce", requestId, kind: "video", rtpParameters }`.
- **Validation:** `kind === "video"` (`only-video-supported`); `validateRtpParameters` shape gate.
- **Side-effect on server:**
  - `transport.produce(...)` creates the mediasoup Producer.
  - `state.videoProducer = producer`.
  - **If the slot was null** (boot or recovery): `broadcastProducerReady()` fans out a `{type:"producer-ready"}` text frame to every entry in `connectionsByAddr` whose `conn.role === "consumer"` (`ssr-webrtc-signaling.mjs:478`).
  - Wires `producer.on("transportclose")` to clear the slot.

#### `produced` (reply)
- **Dir:** server → ssr-tab.
- **Payload:** `{ type: "produced", requestId, id }`.

#### `producer-ready` (broadcast)
- **Dir:** server → consumer (broadcast).
- **Payload:** `{ type: "producer-ready" }`.
- **Trigger:** server-side `state.videoProducer` transitions null → non-null.
- **Side-effect on consumer:** **NONE** — `receiver-webrtc-client.js:140-170` does not handle this message type. It is **dead-wired** (Suspect #4). The consumer therefore polls `/api/ssr/ready` instead.

#### `consume` (request)
- **Dir:** consumer → server.
- **Role:** consumer.
- **Payload:** `{ action: "consume", requestId, kind: "video", rtpCapabilities }`.
- **Trigger:** receiver after `recvTransport` materialised (`receiver-webrtc-client.js:196`).
- **Validation:**
  - `kind === "audio"` → reject `audio-not-in-stream-use-pi-local-audio`.
  - `recvTransport` exists.
  - **Server-side hold up to 8 s** waiting for `state.videoProducer` to become non-null (`ssr-webrtc-signaling.mjs:511-527`). Polls every 50 ms. Timeout returns `no-producer-yet`.
  - `router.canConsume(...)`.
- **Side-effect on server:** `recvTransport.consume({ producerId, rtpCapabilities, paused: true })` — note **paused** until consumer signals ready.

#### `consumed` (reply)
- **Dir:** server → consumer.
- **Payload:** `{ type: "consumed", requestId, id, producerId, kind, rtpParameters }`.

#### `resume-consumer` (request)
- **Dir:** consumer → server.
- **Role:** consumer.
- **Payload:** `{ action: "resume-consumer", requestId, consumerId }`.
- **Trigger:** receiver after constructing the `mediasoup-client` Consumer (`receiver-webrtc-client.js:206`).
- **Side-effect:** `consumer.resume()` — RTP packets begin flowing.

#### `consumer-resumed` (reply)
- **Dir:** server → consumer.
- **Payload:** `{ type: "consumer-resumed", requestId }`.

### 2.2 Catalog (out-of-band envelopes)

These are not RPCs (no `requestId` correlation). They are fire-and-forget telemetry / lifecycle.

#### `heartbeat` (server-driven)
- **Dir:** server → ssr-tab AND server → consumer.
- **Trigger:** `setInterval(... 1500ms)` per-connection (`ssr-webrtc-signaling.mjs:293`).
- **Payload:** `{ type: "heartbeat", t }`. For `consumer` role, augmented with `ssrFps?` (cached from ssr-tab, fresh ≤5 s), `ssrStats?` (the rich envelope), `serverInfo?` (encoder/preset/bitrate set once at boot).
- **Receiver effect:** consumer side updates `lastHeartbeatAtMs` (`receiver-bootstrap.js:267`); routes `ssrFps`/`ssrStats`/`serverInfo` to the diagnostic chip; never closes the WS in response.

#### `ssr-fps` (telemetry; deprecated by `ssr-stats` but still sent for compat)
- **Dir:** ssr-tab → server.
- **Trigger:** publisher `setInterval(... 1000ms)` (`ssr-stream-publisher.mjs:435`).
- **Payload:** `{ type: "ssr-fps", fps }`.
- **Server effect:** validates `0 ≤ fps ≤ 240`, caches into `state.ssrFps`/`state.ssrFpsAtMs`.

#### `ssr-stats` (rich telemetry)
- **Dir:** ssr-tab → server.
- **Trigger:** same 1 s interval as above (`ssr-stream-publisher.mjs:434`).
- **Payload:** `{ type: "ssr-stats", stats: { fps, outputW, outputH, boardId, activeAnimations, alignMode, gifsReady, gifsLoading, gifsFallback, gifsTotal, webglRenderer, lastDecodeVia, renderMode, devicePixelRatio } }`.
- **Server effect:** sanitised (32-key cap, value-type whitelist) into `state.ssrStats`/`state.ssrStatsAtMs`.

#### `producer-closed` (server-driven, per-consumer)
- **Dir:** server → consumer.
- **Trigger:** mediasoup `consumer.on("producerclose")` fires when the upstream Producer closes (e.g., ssr-tab restart) (`ssr-webrtc-signaling.mjs:541`).
- **Payload:** `{ type: "producer-closed", consumerId }`.
- **Receiver effect:** **NONE** — `receiver-webrtc-client.js` doesn't handle this message type either (Suspect #5). Recovery comes from a different signal (`recvTransport.connectionstatechange` to `failed` after RTP stops, or heartbeat-stale).

#### `render-host-down` (server-driven, never actually sent)
- **Dir:** server → consumer.
- **Trigger:** documented but **never produced** in the current code (grep confirms: no `"render-host-down"` literal in any `src/server/**`). The consumer's handler at `receiver-webrtc-client.js:159` is wired and would emit `connectionState: "host-down"` to the bootstrap, but the server never sends it. Suspect #7.
- **Payload (would be):** `{ type: "render-host-down" }`.

#### `error` (server-driven, request-correlated)
- **Dir:** server → client.
- **Payload:** `{ type: "error", reason, requestId? }`.
- **Reasons emitted:** `invalid-json`, `invalid-message`, `unknown-action`, `router-not-ready`, `invalid-dtls`, `transport-not-found`, `only-ssr-tab-can-produce`, `only-video-supported (audio is Pi-local — see D-D2 reversal)`, `invalid-rtp-parameters`, `no-send-transport`, `no-recv-transport`, `audio-not-in-stream-use-pi-local-audio`, `no-producer-yet`, `cannot-consume`, `consumer-not-found`.
- **Receiver effect:** the `pending` RPC promise rejects with `Error(reason)`. The consumer's `tryConnect` catch rolls back into the back-off loop.

#### WebSocket close frames (RFC 6455 opcode 0x8)
- Either side may send. Server's `socket.on("close")` handler closes all per-conn producers/consumers/transports, decrements `consumerCount` if applicable, and removes the per-IP entry only if `entry.socket === socket` (`ssr-webrtc-signaling.mjs:572-595`).

---

## Section 3 — Timer Inventory

Every timer that participates in the connection path. Misalignments between these are the dominant failure-mode source.

### 3.1 Server-side timers

| File:line | Type | Duration | Bounds / measures | Fires what | Cleared by |
|-----------|------|---------:|-------------------|------------|------------|
| `ssr-webrtc-signaling.mjs:293` | `setInterval` | 1500 ms | Per-WS heartbeat cadence (consumer + ssr-tab). | Send `{type:"heartbeat",…}`. | `socket.on("close")` calls `clearInterval(heartbeatTimer)` (`ssr-webrtc-signaling.mjs:573`). |
| `ssr-webrtc-signaling.mjs:519` | `setTimeout` (loop) | 50 ms × N (max 8000 ms) | Server-side `consume` hold while waiting for `state.videoProducer != null`. | On expiry: emit `error: no-producer-yet`. | Implicit (loop exits on producer up or `Date.now() ≥ waitDeadline`). |
| `ssr-render-host.mjs:521` (`startHealthPings`) | `setInterval` | 5000 ms | CDP `Runtime.evaluate("1+1")` health probe. | Fail count tracked; `≥3` consecutive failures (i.e. 15 s) calls `scheduleRestart()`. | `stopHealthPings` on teardown / on browser disconnect. |
| `ssr-render-host.mjs:561` (`scheduleRestart` / `sleep(delay)`) | `setTimeout` | `backoffMs` | Exponential restart backoff: 1000 → 2000 → 4000 → … capped at 30 000 ms. | Tear-down + `start()`; reset to `RESTART_BACKOFF_MS_INITIAL=1000` on success. | Implicit on the awaited promise. |
| `ssr-render-host.mjs:353` | `setTimeout` | 500 ms | Xvfb spawn grace before considering it ready. | Resolves the spawn promise. | Implicit. |
| `ssr-render-host.mjs:709` | `setTimeout` | 1000 ms | Xvfb SIGTERM-to-SIGKILL grace during teardown. | SIGKILLs Xvfb if still alive. | Implicit. |
| `ssr-render-host.mjs:654` | Page goto timeout | 30 000 ms | Bound the initial `page.goto(/output?ssr=1)`. | Throws → `start()` catch → `status.state = "crashed"`. | Implicit on resolution. |
| `ssr-mediasoup-router.mjs` (`purgeStaleMediasoupWorker`) | `setTimeout` | 200 ms | Grace after `pkill -f mediasoup-worker`. | Resolves so boot can proceed. | Implicit. |

### 3.2 Server in-page publisher (Chromium tab)

| File:line | Type | Duration | Bounds / measures | Fires what | Cleared by |
|-----------|------|---------:|-------------------|------------|------------|
| `ssr-stream-publisher.mjs:155` | `setTimeout` | 15 000 ms | Per-RPC ceiling inside the publisher script. | Rejects pending RPC with `rpc timeout: <action>`. | Implicit on resolve. |
| `ssr-stream-publisher.mjs:171` | `setTimeout` | 10 000 ms | WS-open timeout for the publisher. | Rejects the open promise with `ws-open-timeout`. | Implicit. |
| `ssr-stream-publisher.mjs:237` (`alignModeBoost`) | `setInterval` | 250 ms | Polls `__TT_BEAMER_STATE_FOR_DIAG__.alignMode`; on edge transition calls `videoTrack.applyConstraints({frameRate})`. | None (effectful only on flip). | Never cleared — process-lifetime. |
| `ssr-stream-publisher.mjs:276` (`fps-diag`) | `setInterval` | 5000 ms | `console.log` rAF rate vs videoTrack frameRate. | Diagnostic console output only. | Never cleared. |
| `ssr-stream-publisher.mjs:422` (telemetry) | `setInterval` | 1000 ms | Send `ssr-stats` + `ssr-fps` envelopes. | WebSocket write. | Never cleared (kept for life of WS). |
| `ssr-stream-publisher.mjs:458-473` (`injectInPagePublisher`) | poll loop | 250 ms × N (cap 20 000 ms) | Wait for `__ssrProducerIds` or `__ssrPublisherError`. | On timeout: throws `[ssr-publisher] timeout waiting for producer`. | Implicit. |

### 3.3 Pi receiver-bootstrap

| File:line | Type | Duration | Bounds / measures | Fires what | Cleared by |
|-----------|------|---------:|-------------------|------------|------------|
| `receiver-bootstrap.js:62` (`waitForProducer`) | poll loop | 1000 ms × 60 (cap 60 000 ms) | Polls `/api/ssr/ready`; resolves on `{ ready: true }`. | Returns `true` (success) / `false` (timeout). Never throws. | Implicit. |
| `receiver-bootstrap.js:404` (`monitorInterval`) | `setInterval` | 1000 ms | D-C4 three-indicator monitor + chip refresh. | If `dec.disconnected && !tryConnectInFlight && pcState !== "host-down"`: `receiver?.stop()` + `tryConnect()`. | Cleared only by `bootReceiver().stop()`. |
| `receiver-bootstrap.js:208` (`overlayHidePoller`) | `setInterval` | 500 ms | After connect: poll `evaluateOverlayHide`; hide reconnect banner once stable for `OVERLAY_HIDE_AFTER_STABLE_MS=5000` ms. | `ui.hideReconnect()` + clears self. | Self-clears on hide; or on `{failed,ws-closed,disconnected}` (`receiver-bootstrap.js:229`). |
| `receiver-bootstrap.js:305` | `setTimeout` | `getBackoffDelay(reconnectAttempts-1)` ∈ `{1000,2000,5000,10000,30000}` | Catch-path retry delay after a `tryConnect` failure. | Calls `tryConnect()` recursively. | Implicit; not cancellable directly (fires regardless). |
| `receiver-bootstrap.js:524` (`snapshotInterval`) | `setInterval` | 1000 ms | Polls `/api/live/snapshot` for `alignMode` + active profile. | Updates local mirror. | Cleared only by `bootReceiver().stop()`. |
| `receiver-status-ui.js:161` (`tick` in `showCountdownReconnect`) | recursive `setTimeout` | 500 ms | Updates banner each tick during the per-attempt backoff window. | Mutates `banner.textContent`; h11 switches to `Connecting… (attempt N)` after `remainSec ≤ 0`. | The returned `stop()` (called on connect-up or supersession). |

### 3.4 Pi receiver-webrtc-client

| File:line | Type | Duration | Bounds / measures | Fires what | Cleared by |
|-----------|------|---------:|-------------------|------------|------------|
| `receiver-webrtc-client.js:88` | `setTimeout` | 10 000 ms | Per-RPC ceiling on the consumer side. | Rejects the pending promise with `${action} timeout`. | The reply handler `clearTimeout(timer)` (`receiver-webrtc-client.js:165`). |
| `receiver-webrtc-client.js:133` | `setTimeout` | 10 000 ms | h12 WS-open timeout. | `ws.close()` + reject with `ws open timeout (10s)`. | `cleanup()` on either `open` or `error`. |
| `receiver-webrtc-client.js:215` (`requestVideoFrameCallback` recursion) | `requestVideoFrameCallback` | per-frame | Drives `lastFrameAtMs` via `emit("frame")`. | Stops when `stopped` flag set. | `stop()` sets `stopped = true`. |

### 3.5 Threshold constants (not timers, but the hand-off points)

- `DISCONNECT_THRESHOLD_MS = 8000` (`receiver-status-ui.js:22`) — frame-stale and heartbeat-stale.
- `RECONNECT_BACKOFF_MS = [1000, 2000, 5000, 10000, 30000]` (`receiver-status-ui.js:27`).
- `STABLE_RESET_THRESHOLD_MS = 30000` (`receiver-status-ui.js:28`) — after this much continuous "connected" state, attempts resets to 0.
- `OVERLAY_HIDE_AFTER_STABLE_MS = 5000` (`receiver-status-ui.js:29`).
- `MAX_CONSUMER_CONNECTIONS = 50` (`ssr-webrtc-signaling.mjs:44`).
- `HEALTH_PING_INTERVAL_MS = 5000`, `HEALTH_PING_FAIL_THRESHOLD = 3` (`ssr-render-host.mjs:214-215`).
- `RESTART_BACKOFF_MS_INITIAL = 1000`, `RESTART_BACKOFF_MS_MAX = 30000` (`ssr-render-host.mjs:216-217`).

The interesting derived bounds:

- **Worst-case time from publisher script crash to producer up:** 15 s (CDP fail threshold) + 1 s (initial backoff) + ~3-5 s (relaunch) ≈ 19-21 s. **OR — if browser stays alive but the WS dropped — never** (Suspect #6).
- **Worst-case consumer cold-boot connect time:** 60 s `waitForProducer` + 8 s server-hold + ~2-3 s DTLS = up to ~70 s before the first error. With an 8 s producer-up, the typical happy path is ~10 s.
- **Backoff envelope on persistent failure:** 1, 2, 5, 10, 30, 30, 30, … s. After 5 attempts the receiver is at 30 s cadence forever (until `STABLE_RESET_THRESHOLD_MS` of stable connectivity).

---

## Section 4 — State Machine (as-implemented)

State machines for each of the three contexts. Not declared declaratively in code; reconstructed from inspection.

### 4.1 Server Node main — Render-host supervisor

The `bootSsrRenderHost` closure exposes a `status.state` enum. Transitions are implicit through `start` / `stop` / `restart` / `scheduleRestart`.

```
                     +-------+
       (constructor) | idle  |
                     +---+---+
                         | start()
                         v
                  +-------------+
                  |  starting   |
                  +------+------+
                         | spawnXvfb + launchBrowser + page.goto + injectInPagePublisher
                         | (success)
                         v
                  +-------------+   browser.on("disconnected")    +----------------+
                  |   running   |---------------------------------|  reconnecting  |
                  +-+----+------+   xvfbProcess.on("exit")        +---+------------+
                    |    |          health-ping ≥3 fail               |
                    |    | stop()                                     | sleep(backoff) → teardown → start()
                    |    v                                            |
                    | +-----------+                                   |
                    | | stopping  | <---- restart() = stop+start      |
                    | +-----+-----+                                   |
                    |       |                                         |
                    |       v                                         |
                    |   +--------+                                    |
                    +-> |  idle  | <---------------------------------- (fall through after teardown)
                        +--------+
                        ^   (from "starting" if init throws → "crashed", then teardown → caller's responsibility)
                        |
                  +------------+
                  |  crashed   |  set on init throw inside start(); no automatic transition out
                  +------------+
```

Key invariants:
- `state.videoProducer` (in `signalingState`, not in this state machine) is **independent** of this state machine. The host can be `running` while the publisher script silently failed mid-injection (Suspect #6).
- The "health ping" only checks Chromium's CDP responsiveness. It does NOT verify the WebSocket to `/api/webrtc/signal` is open.

### 4.2 Server Chromium tab — In-page publisher script (one-shot)

```
   [LOAD-MEDIASOUP]
        |
        v
   [WS-OPENING] --(timeout 10s)--> [FAIL: ws-open-timeout] --> window.__ssrPublisherError
        |
        | (open)
        v
   [RPC-CAPS]
        |
        v
   [DEVICE-LOAD]
        |
        v
   [RPC-CREATE-SEND-TRANSPORT]
        |
        v
   [DEVICE-CREATE-SEND-TRANSPORT]
        |
        | (gUM in parallel; Chromium event-driven)
        v
   [GET-DISPLAY-MEDIA]
        |
        v
   [TRACK-APPLY-CONSTRAINTS]
        |
        v
   [SEND-TRANSPORT-PRODUCE]   <----.
        |                          |  on "connect": rpc("connect-transport") -> server
        |                          |  on "produce": rpc("produce") -> server
        v                          |
   [PRODUCING] (steady-state) -----'
        |
        |  no explicit teardown — runs until tab closes / browser killed
```

Key facts:
- The script is a single async IIFE — there is no retry within the script. Any `throw` writes the message to `window.__ssrPublisherError` and the script exits.
- `injectInPagePublisher` polls for `__ssrProducerIds` or `__ssrPublisherError` for up to 20 s; if neither appears, throws `timeout waiting for producer`. The host catches and logs but does NOT relaunch (`ssr-render-host.mjs:675-680`).
- Once `[PRODUCING]` is reached, the WS owner (the publisher script) holds it for the lifetime of the tab. There is no re-publish after a WS drop. **This is the structural reason Suspect #6 exists.**

### 4.3 Pi receiver — Connection state machine

This is the richest state machine and the one most fixes will touch. It is *not* declared in code; it is the conjunction of `pcState`, `tryConnectInFlight`, `connectionStableSince`, `reconnectAttempts`, the `monitorInterval`, and the splash/banner/error UI elements.

```
                          +---------+
              bootReceiver| NEW     |
                          +----+----+
                               | (sessionStorage attempts loaded, splash shown)
                               v
                          +---------+
                          |WAIT-PRD |  waitForProducer up to 60s polling /api/ssr/ready
                          +----+----+
                               | (resolves true — or false after 60s)
                               | monitorInterval armed
                               v
                          +---------+
                          |OPENING  |  tryConnectInFlight=true
                          | -WS     |  new WebSocket(...)
                          +----+----+
                               |
              ws "error" or 10s| (open success)
                  timeout      |
                      \        v
                       \  +---------+
                        \ |WS-OPEN  |  ws.readyState===OPEN
                         \+----+----+
                          |    | rpc("get-router-rtp-capabilities")
                          |    v
                          | +---------+
                          | |RPC-CAPS |  await reply (per-RPC 10s timeout)
                          | +----+----+
                          |    | device.load
                          |    v
                          | +-----------+
                          | |RPC-       |  rpc("create-recv-transport") + DEVICE-CREATE-RECV
                          | |TRANSPORT  |
                          | +----+------+
                          |    |
                          |    | server-hold up to 8s for producer:
                          |    v rpc("consume") may return no-producer-yet
                          | +-----------+
                          | |RPC-CONSUME|  rpc("consume") + device.consume + rpc("resume-consumer")
                          | +----+------+
                          |    |
                          |    | (DTLS handshake completes; videoEl.srcObject set;
                          |    |  rVFC begins firing → emit("frame"))
                          |    v
                          | +-------------+
                          | | CONNECTED   |  reconnectAttempts=0; sessionStorage cleared;
                          | |             |  connectionStableSince=now; banner hidden.
                          | +------+------+
                          |        |
                          |        | (steady state: rVFC frames + heartbeat every 1.5s;
                          |        |  monitor evaluates DISCONNECT every 1s)
                          |        |
                          |        v 
                          |   {one of}:
                          |   * recvTransport.connectionstatechange → "failed" / "disconnected" / "closed"
                          |   * lastFrameAtMs > 8s old (FRAME-LOSS)
                          |   * lastHeartbeatAtMs > 8s old
                          |   * ws.onclose
                          |   * server emits {type:"render-host-down"} (currently never)
                          |
                          v (any of the above)
                     +-----------+
                     |WS-CLOSED  |  pcState set; UI shows reconnect banner;
                     |/FAILED/   |  monitor evaluates → !tryConnectInFlight → tryConnect()
                     |HOST-DOWN  |
                     +-----+-----+
                           |
            (tryConnectInFlight cleared by either:
              "connected" callback OR catch-block OR finally h7)
                           |
                           v
                     +-----------+
                     |RECONNECT  |  setTimeout(getBackoffDelay(n-1), tryConnect)
                     |-BACKOFF   |  countdown overlay ticks every 500ms; after 0s shows
                     +-----+-----+   "Connecting… (attempt N)"
                           |
                           +--> (back to OPENING-WS)
                           
  Terminal-ish:
   * HOST-DOWN — server-emit (currently dead-wired); UI shows error overlay; manual retry only.
   * STOPPED — bootReceiver().stop() called (only happens for diagnostic test); receiver, monitor, snapshot intervals all cleared.
```

The states the prompt asked us to enumerate map as follows:
- **NEW** — entry into `bootReceiver`.
- **OPENING-WS** — `new WebSocket(signalUrl)` to first `open`/`error`.
- **WS-OPEN** — `ws.readyState === OPEN`, RPCs may begin.
- **RPC-CAPS** — first RPC in flight.
- **RPC-TRANSPORT** — `create-recv-transport` + `connect-transport`.
- **RPC-CONSUME** — `consume` + `resume-consumer` (also covers the 8 s server hold).
- **CONNECTED** — `recvTransport.connectionState === "connected"`, frames flowing.
- **FRAME-LOSS** — derived state inside `evaluateDisconnect` when `connected && lastFrameAtMs > threshold`.
- **WS-CLOSED** — `ws.onclose` fired; `connectionState` event emitted with literal "ws-closed".
- **RECONNECTING** — `RECONNECT-BACKOFF` countdown active.
- **HOST-DOWN** — server told consumer the render host died (currently never sent).
- **STOPPED** — `stop()` called on the bootstrap.

---

## Section 5 — Failure Path Catalog

For each scenario: triggering event, message flow, state-machine path each side takes, and a verdict — does the system handle it cleanly, partially, or not at all.

### 5.1 Server cold-boot, Pi already loaded

**Scenario:** The Pi page is open showing "Connecting…"; the operator boots the server.

- Pi side: `waitForProducer` is polling `/api/ssr/ready`; gets connection refused / 503 / network error each tick. Returns `false` after up to 60 s but typically resolves once server boots (~5 s).
- Server side: boots through `bootMediasoupRouter` → `attachWebRtcSignaling` → `bootSsrRenderHost`. The Chromium tab takes ~3-5 s to navigate + inject + produce.
- Pi side: as soon as `/api/ssr/ready` returns 200 OK, `waitForProducer` resolves. Then `tryConnect` opens WS, drives RPCs, hits `consume` — server-hold may be fast (producer already up) or up to 8 s if server is in flight.
- Result on Pi: `CONNECTED` reached typically 5-15 s after server boot.

**Verdict:** **Cleanly handled.** Phase-31 baseline confirms ~5 s producer-up, ~10 s end-to-end. The h5 `waitForProducer` placement bug is fixed.

### 5.2 Pi reload (Ctrl-R) while server stable

- Pi side: page reload tears down the old WS (browser-managed); `sessionStorage` retains `attempts`. Bootstrap re-enters NEW → WAIT-PRD.
- Server side: `socket.on("close")` decrements `consumerCount`, removes IP entry, closes per-conn transports/consumers. The Producer is untouched.
- Pi side: `waitForProducer` immediately resolves (server has producer). `tryConnect` proceeds normally.

**Verdict:** **Cleanly handled** if `attempts==0`. **Partially handled** if `sessionStorage.attempts` was non-zero from a prior failed session — `getBackoffDelay(n-1)` could put the FIRST retry of this fresh page into a 30 s slot (Suspect #11). The audit flagged this and recommended `clearBackoffState` at top-of-bootReceiver — that fix has NOT been applied.

### 5.3 Server mediasoup-worker crash / restart

- Trigger: `worker.on("died")` fires (`ssr-mediasoup-router.mjs:96`).
- Server side: handler nulls `activeWorker` and `activeRouter`. **There is no automatic worker re-spawn** — the comment in §2.4 of the comprehensive audit suggesting auto-respawn is incorrect for this code path. Subsequent calls to `getRouter()` will return null, and signaling RPCs will fail with `router-not-ready`.
- Pi side: existing transport's RTP stops → `frame-stale` after 8 s → reconnect → RPCs fail with `router-not-ready` → infinite back-off loop until server restart.

**Verdict:** **Not handled.** The router doesn't recover. This is a Phase-33 candidate (Suspect #8) — needs an automatic `bootMediasoupRouter()` on `worker.on("died")`.

### 5.4 Server Chromium-tab crash / restart

Two sub-cases that are critically different:

**5.4.a Browser process actually died (CDP unresponsive):**
- `browser.on("disconnected")` fires OR `startHealthPings` ticks 3 consecutive failures.
- `scheduleRestart()` runs: `teardown()` (kills Xvfb, closes browser/page) → `sleep(backoffMs)` → `start()` again.
- The WS to `/api/webrtc/signal` was closed by Chromium dying → `socket.on("close")` cleans up server-side; the Producer's `transportclose` event nulls `state.videoProducer`.
- New Chromium boots, publisher script runs, `produce` RPC re-creates Producer; `wasNull===true` triggers `broadcastProducerReady()` (no-op for receivers per Suspect #4 but heartbeat-driven recovery proceeds).
- Pi side: `frame-stale` triggers within 8 s, monitor calls `tryConnect`. Possibly several retries while the server is in restart back-off (1-30 s). Eventually reaches `consume` after producer comes back; `CONNECTED`.

**5.4.b Browser still alive but publisher script failed / WS dropped:**
- The Chromium process is up; CDP `Runtime.evaluate` still returns 2; health pings stay green forever.
- The publisher's WS dropped → `socket.on("close")` server-side → `state.videoProducer = null`.
- Pi `consume` calls return `no-producer-yet` after 8 s, every retry.
- **Recovery: never.** The render-host has no signal that the publisher needs re-injecting.

**Verdict:** 5.4.a **handled**. 5.4.b **not handled** — Suspect #6, the BUG-B from `phase-32-connect-head-trace.md`.

### 5.5 Network blip (TCP RST / 1-second packet drop)

- Two failure modes:
  - **WS connection RST:** `ws.onclose` → `emit("connectionState", "ws-closed")` → bootstrap shows reconnect banner; monitor detects `disconnected` (heartbeat-stale within 8 s) → `tryConnect()` → fresh WS, fresh transports, fresh consume. Recovery in <10 s.
  - **DTLS-only RTP drop, WS still up:** RTP packets stop arriving; `videoEl` freezes; `requestVideoFrameCallback` stops firing. `frame-stale` triggers after 8 s. Heartbeat keeps arriving (WS healthy). Monitor sees `pcConnectionState === "connected" && frame-stale`, fires `tryConnect`. The receiver's `stop()` closes the WS; new WS, new transports, fresh stream. Recovery ~10 s.

**Verdict:** **Cleanly handled** via the 8 s monitor + back-off. Could be faster — h12 added the WS-open timeout, but the **8 s threshold dominates** the recovery time. This is intentional (the audit's ★★★ point on h36 — too tight a threshold caused storms during align-mode bursts).

### 5.6 Producer not ready when first consumer arrives

- Pi side: `waitForProducer` polls; eventually `tryConnect` runs.
- Server side: `consume` enters the 8 s hold loop (`ssr-webrtc-signaling.mjs:511-527`).
- Two outcomes:
  - Producer comes up within 8 s → `consume` succeeds, `CONNECTED`. Total user-visible latency: as long as it took the publisher script to finish.
  - Producer doesn't come up within 8 s → `consume` returns `no-producer-yet` → consumer `tryConnect` catch increments `attempts`, schedules retry per back-off. Cycles forever until producer up. Banner shows countdown then `Connecting… (attempt N)`.

**Verdict:** **Cleanly handled.** This is exactly what the h19 hold + h5 ordering + h12 timeout fixed.

### 5.7 Consumer connects but no frames arrive within Xs

- All RPCs succeed; `recvTransport.connectionstatechange` reaches `connected`. `pcState === "connected"`.
- BUT: RTP isn't flowing (e.g., NAT/firewall blocks the RTC ports despite the UDP signaling handshake; rare on LAN but observed when `announcedIp` resolves to a docker bridge address).
- `lastFrameAtMs` stays at boot time. After 8 s, `evaluateDisconnect` returns `frame-stale`.
- Monitor calls `tryConnect`, the new WS+transports+consume are tried again — same outcome (the underlying network problem persists).
- The receiver enters back-off and stays in the storm.

**Verdict:** **Partially handled.** The receiver detects the failure and surfaces a reconnect, but it has no way to break out of the loop because the symptom is consumer-side packet routing — not something a reconnect can fix. **Improvement candidate:** display the reason ("frame-stale") in the operator overlay so they can intervene (D-04 covers this). Suspect #10.

### 5.8 Two consumers from same IP

- E.g., the operator opens `/output/` on the server machine itself for local testing while the actual Pi receiver is also connected from the same NAT-translated IP.
- Server: per-IP guard at `ssr-webrtc-signaling.mjs:265-270` destroys the prior socket before opening the new connection. The displaced receiver's `ws.onclose` fires; it goes WS-CLOSED → tryConnect → opens a new WS that displaces the new operator. Ping-pong.
- Worse case: BUG-A (already fixed by h10): if the operator's tab is on `127.0.0.1` and the ssr-tab were ALSO in `connectionsByAddr`, the operator displaces the ssr-tab. **h10 fixed this** by scoping the registry to consumers only.
- Current behaviour: the two receivers thrash each other. Both are eventually stable because each new connection wins the slot, but the visual experience is `RECONNECTING` flashing.

**Verdict:** **Partially handled.** h10 fixed the ssr-tab-collision. Two genuine consumers from the same IP still thrash — the Phase-32 design assumed exactly one Pi per LAN, not "Pi + operator's local browser". Suspect #9.

---

## Section 6 — Suspect List for Phase 33

Numbered list of contract-violation candidates. "Phase-32 hotfix touched this area" indicates whether a recent fix is *adjacent* to the bug — relevant for regression-test design.

### Suspect 1 — Countdown overlay perceived hang past 0s (★★★★★ in audit)
- **File:line:** `receiver-status-ui.js:138-153` (function `showCountdownReconnect.tick`).
- **Contract violated:** countdown is the operator's only forward-progress indicator during `RECONNECT-BACKOFF` → `OPENING-WS` transition. UI MUST reflect that the next attempt is in progress.
- **Symptom under live conditions:** banner stays at "RECONNECTING — 0s (attempt N)" for 5-11 s while the next `tryConnect` is doing its WS+RPC roundtrip. User reports "0s reconnection hängt".
- **Phase-32 hotfix touched this area:** YES — h11 (commit `c7fc99b`) added the "Connecting… (attempt N)" branch when `remainSec ≤ 0` (`receiver-status-ui.js:148-149`). **This bug is FIXED in current HEAD per the comments at `:141-149`.** Verify on hardware: the symptom may be from before h11.

### Suspect 2 — `--use-gl=egl` GPU crash regression risk (★★★★ in audit)
- **File:line:** `ssr-render-host.mjs:464` — currently `--use-gl=angle`, h9 reapplied.
- **Contract violated:** rendering pipeline must not crash the GPU process. SwiftShader fallback at 2-5 fps then trips `frame-stale`.
- **Symptom:** GPU process crash logs (`Requested GL implementation … not found`); intermittent reconnect loops driven by `frame-stale` once "connected".
- **Phase-32 hotfix touched this area:** YES — h4 added the fix, h4 was reverted, h9 reapplied. **Currently fixed; flag for regression test that prevents future revert.**

### Suspect 3 — WS-open hang on TCP-stalled socket (★★★ in audit)
- **File:line:** `receiver-webrtc-client.js:107-139` — h12 timeout in place.
- **Contract violated:** every awaitable in `tryConnect` must be bounded so that `tryConnectInFlight` clears within a finite time.
- **Symptom:** if the server was unreachable but TCP didn't RST (rare, e.g., partial firewall), the consumer used to block on the OS-default ~75 s TCP timeout.
- **Phase-32 hotfix touched this area:** YES — h12. **Currently fixed; needs a regression test using a stalled-server fixture.**

### Suspect 4 — `producer-ready` broadcast is dead-wired (DEAD-WIRE in audit)
- **File:line:** server emits at `ssr-webrtc-signaling.mjs:478`; consumer handler at `receiver-webrtc-client.js:140-170` does NOT handle `m.type === "producer-ready"`.
- **Contract violated:** Plan-32 docs claim a WS fast-path replaces the 1 s `/api/ssr/ready` polling. The fast-path doesn't exist.
- **Symptom (cosmetic):** every cold boot eats up to 1 full `pollIntervalMs` of `waitForProducer` after the producer is actually up. Not a stability bug but slows recovery measurably.
- **Phase-32 hotfix touched this area:** YES — Phase 32 D-B5 added the broadcast (no consumer wire-up). NOT fixed.

### Suspect 5 — `producer-closed` broadcast is dead-wired (similar to #4)
- **File:line:** server emits at `ssr-webrtc-signaling.mjs:543`; consumer doesn't handle `m.type === "producer-closed"`.
- **Contract violated:** when the upstream Producer dies, the consumer should know immediately and trigger an explicit reconnect path — not wait for `frame-stale`.
- **Symptom:** 8-s `frame-stale` window after every server-side Chromium restart. Recovery is slower than it could be.
- **Phase-32 hotfix touched this area:** NO. Untouched since Phase 31. Carry forward to Phase 33 fix list.

### Suspect 6 — Render host doesn't recover if publisher WS dropped but Chromium alive (BUG-B from head-trace)
- **File:line:** `ssr-render-host.mjs:521-543` (`startHealthPings`); the WS health is invisible to the host.
- **Contract violated:** the render-host's "running" state must imply a working *signaling* path, not just CDP responsiveness.
- **Symptom:** `state.videoProducer` permanent null; consumers loop on `no-producer-yet`. Only a process restart recovers.
- **Phase-32 hotfix touched this area:** NO. Tagged BUG-B in `phase-32-connect-head-trace.md` and explicitly carried forward as item 5 of the 32-CLOSURE-ADDENDUM. **Phase-33 candidate — adopt either a server→host event when ssr-tab WS closes unexpectedly, OR have the publisher script auto-reopen its WS on close.**

### Suspect 7 — `render-host-down` is documented but never sent
- **File:line:** receiver handler at `receiver-webrtc-client.js:159` is wired; `grep "render-host-down" src/server` returns NO match.
- **Contract violated:** the Pi UI's `host-down` state shows a different overlay (D-B4 error) than `ws-closed`. The user gets the wrong UX when the host is actually down vs. the wire merely glitched.
- **Symptom:** Pi shows the generic reconnect banner instead of the actionable "Render host crashed" error during real host crashes.
- **Phase-32 hotfix touched this area:** NO. Untouched.

### Suspect 8 — Mediasoup worker `on("died")` doesn't auto-respawn
- **File:line:** `ssr-mediasoup-router.mjs:96-100`.
- **Contract violated:** the server claims "running" while the router has been silently nulled. No recovery path.
- **Symptom:** every signaling RPC returns `router-not-ready`; consumers loop forever; only a process restart recovers.
- **Phase-32 hotfix touched this area:** NO. The audit's claim of auto-respawn (§2.4 line 96) is incorrect — the handler only nulls the references.

### Suspect 9 — Two consumers from same IP thrash (h10 partial)
- **File:line:** `ssr-webrtc-signaling.mjs:265-283`.
- **Contract violated:** the per-IP guard was meant for stale-cleanup of a Pi reconnecting before its prior WS closed. It now also evicts a *legitimate* second consumer (e.g., operator's local browser).
- **Symptom:** local-browser /output/ tab opened on the server machine while the Pi is connected → both receivers ping-pong; visual `RECONNECTING` flicker.
- **Phase-32 hotfix touched this area:** YES — h10 narrowed the registry to consumers (no longer evicts the ssr-tab). The two-consumer-same-IP case still thrashes. Fix candidate: identify-by-WS-key instead of by-IP, or accept multiple consumers per IP.

### Suspect 10 — Operator has no telemetry surface for "frame-stale loop" failures (D-04)
- **File:line:** `receiver-bootstrap.js:418-438` and `receiver-status-ui.js:281-371`.
- **Contract violated:** D-04 requires a status-detail line under the countdown showing last-error / attempts-since-last-success / last-connected timestamp.
- **Symptom:** operator sees endless `RECONNECTING` countdown but cannot tell whether it's mid-handshake, awaiting producer, or in a frame-loss loop. Can't distinguish "wait 30 s" from "intervene now".
- **Phase-32 hotfix touched this area:** NO. Phase-33 D-04 deliverable.

### Suspect 11 — `sessionStorage` attempts can put first retry of fresh page-load on 30 s slot
- **File:line:** `receiver-bootstrap.js:122` (`loadBackoffState`).
- **Contract violated:** a fresh page load deserves a fresh attempts cycle. The persistence was meant to survive WS-close mid-handshake, not browser refresh.
- **Symptom:** after a previous failed session, the user reloads → first retry waits 30 s → looks like a hang.
- **Phase-32 hotfix touched this area:** indirectly (Phase-32 D-B2 introduced the persistence). Fix recommendation in audit: `clearBackoffState(backoffStorage)` at top-of-`bootReceiver` BEFORE `loadBackoffState`. NOT applied.

### Suspect 12 — `purgeStaleMediasoupWorker` collateral-kills sibling servers
- **File:line:** `ssr-mediasoup-router.mjs` (`purgeStaleMediasoupWorker`); invoked at `server.mjs:4217`.
- **Contract violated:** boot operations of one server must not affect another running server on the same host.
- **Symptom (deployment-only):** dev rebuild kills production server's mediasoup-worker; production goes "router-not-ready" for 3-5 s; connected Pi sees stream interruption.
- **Phase-32 hotfix touched this area:** YES — Phase-32 D-B4 introduced the purge. Phase-33 carry-forward item 6.

### Suspect 13 — Stable-overlay hide poll keeps running 5 s after connect even if connection drops mid-poll
- **File:line:** `receiver-bootstrap.js:208-220`. The poller is cleared on `failed/ws-closed/disconnected` but NOT on `host-down`.
- **Contract violated:** state-hold cleanups must be exhaustive across all terminal states.
- **Symptom (minor): `host-down` event fires while the overlay-hide-poller is running → poll keeps ticking; `ui.hideReconnect()` could clobber the error overlay.
- **Phase-32 hotfix touched this area:** YES — Phase-32 D-B3 introduced the poller. Subtle bug; low severity but easy fix.

### Suspect 14 — Monitor's `pcState !== "host-down"` guard is the only block; manual retry doesn't reset `pcState`
- **File:line:** `receiver-bootstrap.js:418` (the monitor guard) vs. `receiver-bootstrap.js:163-170` (retry handler).
- **Contract violated:** when operator clicks Retry after `host-down`, `pcState` is still `"host-down"`. The monitor remains gated. If the new `tryConnect` reaches a state that should re-arm the monitor's reconnect, it cannot.
- **Symptom:** after `host-down` + manual Retry that fails (e.g. produces no frames), the system never auto-retries — operator must click Retry repeatedly.
- **Phase-32 hotfix touched this area:** indirectly (Phase-31 D-B4 introduced host-down state; never end-to-end-tested). Untriaged.

---

*Phase: 33-connection-stability-deep-dive · State-Machine Contract · 2026-05-08 · supersedes ad-hoc Phase 32 hotfix reasoning*
