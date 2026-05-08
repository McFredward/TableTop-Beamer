# Phase 33 — WebRTC Reconnection Patterns: Production Reference Brief

**Compiled:** 2026-05-08
**Audience:** tt-beamer engineers designing the Phase-33 connection state-machine.
**Scope:** patterns drawn from Twilio Programmable Video, Daily.co (`daily-js`), Jitsi Meet (`lib-jitsi-meet`), LiveKit (`client-sdk-js` + `livekit_rtc.proto`), and the canonical `versatica/mediasoup-demo`. Plus Chrome-131 + Xvfb + mediasoup-publisher specifics.

This brief is intended to be the input to `33-STATE-MACHINE.md`. It is deliberately concrete — every recommendation cites a real reference impl or RFC. tt-beamer is **same-LAN, no TURN, single-publisher / single-consumer**, so several SaaS patterns are over-engineered for our case; those are flagged.

---

## 1. How production WebRTC services handle reconnect

### 1.1 Twilio Programmable Video

Twilio exposes a clean two-event reconnect surface and a 3-state Room model.

**State enum** (`Room.state`):
```
"connected" | "reconnecting" | "disconnected"
```

**Events** (`twilio-video.js`):
```js
room.on('reconnecting', error => { /* error.code: 53001 (signaling) | 53405 (media) */ });
room.on('reconnected',  () => { /* room.state === 'connected' */ });
// Per-participant since SDK 2.1.0:
room.on('participantReconnecting', remoteParticipant => { ... });
room.on('participantReconnected',  remoteParticipant => { ... });
```

**Strategy** — **both**: signaling reconnect is independent of media reconnect, and the SDK transparently performs ICE-restart when the media path drops. Application code does NOT manually call `restartIce()`; you only consume the events. Failure terminates with code `53000` ("reconnection attempts exhausted") which is opaque — Twilio does not document the schedule. Token expiry (20104) is a non-recoverable failure mode handled outside the reconnect flow.

**Heartbeat / liveness** — internal, not exposed. The SDK distinguishes "signaling lost" (53001) from "media lost" (53405) so the application UI can downgrade gracefully.

**Producer/consumer state recovery** — automatic. `RemoteParticipant` objects survive a reconnect window; tracks resubscribe transparently.

**Failure-mode handling**:
- token expired → emit `disconnected` with code 20104 (no retry)
- exhausted attempts → emit `disconnected` with 53000 (no retry, app must rejoin)
- graceful page-leave → `window.beforeunload → room.disconnect()` is the documented contract

Source: <https://www.twilio.com/docs/video/reconnection-states-and-events>

### 1.2 Daily.co (`daily-js`)

Daily uses a **tiered model**: a single signaling WebSocket + zero-or-more media transports (P2P or SFU). The signaling connection is the source of truth; media is allowed to flap as long as signaling holds.

**Events**:
- `network-quality-change` — emits `{ networkState, networkStateReasons, threshold, quality }`
- `network-connection` — emits `{ type: 'signaling' | 'peer-to-peer' | 'sfu', event: 'connected' | 'interrupted' }`

**Strategy** — Daily explicitly time-bounds the signaling reconnect: **~20 seconds**. If signaling cannot recover inside that window, the participant is **ejected** from the call (no infinite retry). Media is allowed to reconnect repeatedly *as long as signaling is alive*. No exponential backoff is documented in the public API; this is delegated to the SDK internals.

**Producer/consumer state recovery** — tracks survive a media flap below 20s. Above 20s, full rejoin.

Source: <https://docs.daily.co/reference/daily-js/events/network-events>

**Lesson for tt-beamer:** the 20-second eject is a hard cap that prevents the "infinite-reconnect" UX trap. We currently have forever-retry — see §7.

### 1.3 Jitsi Meet (`lib-jitsi-meet`)

Jitsi is the most asymmetric of the SDKs. Three independent connections:

1. **XMPP/BOSH signaling** — survives via Strophe.js native reconnect.
2. **Bridge channel** to JVB — either a WebSocket or an SCTP DataChannel, configurable. WebSocket variant has its own retry loop in `BridgeChannel.js`. SCTP variant rides the PeerConnection.
3. **Media PeerConnection** — Jicofo signals an ICE restart by sending a new `transport-replace` over Jingle.

**Known issue** — `BridgeChannel` retry is asymmetric: the WebSocket transport reconnects but the DataChannel transport does not (Issue #950, "BridgeChannel stays closed after connection interruption"). This produces a "connection alive but no statistics" failure mode that is virtually identical to tt-beamer's "image-hang" symptom — connection looks healthy, but the side-channel is dead.

**ICE restart** — driven by the server (Jicofo). Upon ICE restart the videobridge **resets the TCC sequence number to 0** while the client continues incrementing — a known asymmetry the consumer must tolerate.

Source: <https://github.com/jitsi/lib-jitsi-meet/issues/950>, <https://github.com/jitsi/jitsi-videobridge/blob/master/doc/web-sockets.md>

**Lesson for tt-beamer:** if a heartbeat channel is added, it must reconnect symmetrically with the media path. Otherwise we will observe the same "all green, no frames" anti-pattern.

### 1.4 LiveKit (`client-sdk-js` + protocol)

LiveKit has the **most explicit and well-documented** reconnect state-machine of the four SaaS vendors and is the closest match for tt-beamer's architecture (single SFU, single signaling WS).

**State enum** (`Room.ts`):
```ts
enum ConnectionState {
  Disconnected      = 'disconnected',
  Connecting        = 'connecting',
  Connected         = 'connected',
  Reconnecting      = 'reconnecting',       // full reconnect path
  SignalReconnecting = 'signalReconnecting' // resume / ICE-restart path
}
```

**Two-tier reconnect:**

1. **Resume (preferred)** — signaling WS reconnect with `?reconnect=true` query param + `sid=<sessionId>`. Server replies with `ReconnectResponse` and triggers an **ICE restart** on the existing PeerConnection. Tracks survive. UI flicker is sub-second.
2. **Full reconnect (fallback)** — destroys engine via `recreateEngine(true)`, re-issues all subscriptions. Triggered when:
   - Resume fails (server lost session / `sid` unknown)
   - Server sends `LeaveRequest{ action: RECONNECT }`
   - Engine detects offline (`EngineEvent.Offline`)

**Server-driven branch selector** (from `livekit_rtc.proto`):
```protobuf
message LeaveRequest {
  enum Action {
    DISCONNECT = 0;  // do not retry
    RESUME     = 1;  // ICE-restart only — keep engine
    RECONNECT  = 2;  // tear down + rejoin
  }
}
message ReconnectResponse {
  repeated ICEServer       ice_servers          = 1;
  ClientConfiguration      client_configuration = 2;
  ServerInfo               server_info          = 3;
  uint32                   last_message_seq     = 4;  // for resync
}
```

**Backoff / reconcile** — `CONNECTION_RECONCILE_FREQUENCY_MS = 4000` (Room.ts). A periodic 4-second tick reconciles client state with server. The retry attempts inside the resume / reconnect loops are governed by `ReconnectPolicy` (an injectable interface — application can supply its own). The default policy uses exponential backoff with a finite cap.

**Heartbeat** — via signaling WS ping (LiveKit-specific `Ping`/`Pong` proto messages on the signal channel) plus the standard ICE consent freshness on the media path.

**Producer/consumer state recovery** — on resume: tracks persist. On full reconnect: client emits `ParticipantDisconnected` for everyone, then `Reconnecting`, then re-subscribes and emits `LocalTrackPublished` for each republished track.

**Failure modes** — `LeaveRequest{DISCONNECT}` is terminal. Network change (Wi-Fi ↔ cellular) triggers automatic resume. VPN drop — known issue #1746 — clients sometimes immediately disconnect rather than resume.

Sources: <https://docs.livekit.io/reference/internals/client-protocol/>, <https://github.com/livekit/client-sdk-js/blob/main/src/room/Room.ts>, <https://github.com/livekit/protocol/blob/main/protobufs/livekit_rtc.proto>

**Lesson for tt-beamer:** the tri-action server hint (`DISCONNECT | RESUME | RECONNECT`) is the canonical pattern for letting the server decide reconnect mode. tt-beamer should mirror this — the server knows whether the producer still exists. The Pi should not guess.

### 1.5 mediasoup-demo (the canonical mediasoup reference)

mediasoup-demo is **deliberately minimal** about reconnect. It relies on `protoo-client`'s WebSocket transport for signaling-level retry and exposes a manual `restartIce()` button — there is **no automatic ICE-restart loop**.

**Signaling layer** — `protooClient.WebSocketTransport(url)` wraps the `retry` library. Default options when `options.retry` is omitted:
```js
{ retries: 10, factor: 2, minTimeout: 1_000, maxTimeout: 8_000 }
// → schedule (jittered): 1s, 2s, 4s, 8s, 8s, 8s, 8s, 8s, 8s, 8s → give up
```
After 10 retries the WS is given up; UI shows "WebSocket connection failed" and the user must reload.

**Peer events** (RoomClient.js:340-377):
```js
this._protoo.on('open',         () => this._joinRoom());
this._protoo.on('failed',       () => notify('error', 'WebSocket connection failed'));
this._protoo.on('disconnected', () => store.dispatch(setRoomState('closed')));
this._protoo.on('close',        () => { if (this._closed) return; /* nothing else */ });
```
Critically — when the WS disconnects, mediasoup-demo dispatches `'closed'` state and **does not auto-recreate transports**. The commented-out lines (RoomClient.js:359-368) show the author considered closing transports on disconnect and explicitly chose not to.

**ICE restart** (RoomClient.js:1720-1755) is **manual only**:
```js
async restartIce() {
  if (this._sendTransport) {
    const { iceParameters } = await this._protoo.request('restartIce', {
      transportId: this._sendTransport.id,
    });
    await this._sendTransport.restartIce({ iceParameters });
  }
  if (this._recvTransport) {
    const { iceParameters } = await this._protoo.request('restartIce', {
      transportId: this._recvTransport.id,
    });
    await this._recvTransport.restartIce({ iceParameters });
  }
}
```

**Cold-boot ordering** (RoomClient.js:340) — the demo opens the WS, then on `'open'` fires `_joinRoom()`. The server pushes `newConsumer` requests (line 388) for already-existing producers as part of join. There is no separate "wait for producer" gate — joining a room with no producers is valid; the consumer waits for `newProducer` notifications afterwards.

Sources: <https://github.com/versatica/mediasoup-demo/blob/v3/app/src/RoomClient.js> (lines 332-377, 1720-1755), <https://protoo.versatica.com/>

**Lesson for tt-beamer:** mediasoup-demo is **not** a reconnect reference; it's a feature reference. Production users (LiveKit included) build their own reconnect on top. Our Phase-33 design should not look like mediasoup-demo — it should look like LiveKit using mediasoup as transport.

### 1.6 Comparison matrix

| Aspect              | Twilio       | Daily        | Jitsi        | LiveKit                | mediasoup-demo       |
|---------------------|--------------|--------------|--------------|------------------------|----------------------|
| Strategy            | both, opaque | tiered, 20s eject | per-channel | resume + full fallback | manual only          |
| Backoff             | internal     | internal     | per-channel  | reconcile@4s + policy  | retry: 1-2-4-8-...8s (10x) |
| Liveness            | internal     | network-quality event | XMPP ping + bridge ws | Ping/Pong + ICE consent | none                 |
| Server hints        | error code   | none         | Jingle xfer  | LeaveRequest.Action    | none                 |
| Recovery scope      | tracks survive | tracks survive <20s | per-channel | resume: yes / reconnect: republish | manual                |
| Cap on retries      | yes (53000)  | 20s eject    | per-channel  | policy-driven          | 10                   |

---

## 2. ICE restart vs full tear-down — when to use which

### 2.1 The IETF / RFC 7675 baseline

`iceConnectionState` transitions are governed by **RFC 7675 ICE Consent Freshness**:

- After 5s of missing STUN binding-request replies → state goes to `disconnected`.
- After 30s of missed consent → state goes to `failed`.

Per the mediasoup author Iñaki Baz Castillo (`ibc`), in the discourse forum:
> *"The peer connection should eventually reconnect from disconnected to connected automatically. Around 7 seconds. Make your client side app restart ICE when disconnection is detected. No need to ask for any internal magic in libmediasoupclient."*

And on `failed`:
> *"Restarting ICE is not going to help [once failed]. You must recreate the transport and produce/consume streams again."*

Sources: <https://datatracker.ietf.org/doc/html/rfc7675>, <https://mediasoup.discourse.group/t/transport-connectionstate-changes-do-disconnected/1443>

### 2.2 Decision table for tt-beamer

| Observed state                            | Action                                         | Why                                              |
|-------------------------------------------|------------------------------------------------|--------------------------------------------------|
| `disconnected` (transient, <7s)           | Do nothing. Wait.                              | Browser will self-recover.                       |
| `disconnected` (persistent, ≥7s)          | `restartIce()` on recv-transport.              | Browser won't auto-recover; ICE restart cheap.   |
| `failed`                                  | Tear down + rejoin (full reconnect).           | ICE restart is no-op once failed.                |
| `connected` but `framesReceived` stalled  | `restartIce()`, then if no recovery → tear-down | "Alive but dead" — see §4.                       |
| WS closed (1006 / abnormal)               | Reconnect WS with backoff, then resume.        | Signaling is the prerequisite.                   |
| WS closed (1000 normal, server-initiated) | Respect the close. Stop retrying.              | Server intent is "go away".                      |

### 2.3 mediasoup ICE-restart API for the recv-transport

Server side (mediasoup):
```js
const newIce = await router.appData.transport.restartIce(); // returns IceParameters
```

Client side (mediasoup-client):
```js
recvTransport.on('connectionstatechange', state => {
  if (state === 'disconnected') scheduleRestart();
  if (state === 'failed')       scheduleFullReconnect();
});

async function restartIceOnRecv() {
  const { iceParameters } = await signaling.request('restartIce', { transportId: recvTransport.id });
  await recvTransport.restartIce({ iceParameters });
}
```

Crucially, `recvTransport.restartIce({ iceParameters })` does NOT touch consumers. Existing `Consumer` objects continue to fire frames once ICE re-converges. There is no need to recreate consumers.

Source: <https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-restartIce>

### 2.4 Periodic ICE-restart pattern (community)

From the mediasoup discourse, Zaid Iqbal documented a community pattern:
> *"Implement periodic `restartIce()` calls approximately every 10 seconds and monitor `connectionstatechange`. Stop attempting restarts once the connection returns to `connected` state."*

This is **not** something to apply unconditionally — `ibc` warns it can mask underlying problems ("playing whack-a-mole with your firewall"). For tt-beamer LAN, the underlying problem is rarely a firewall — it's GPU-process restarts and producer-side flaps. The periodic-restart pattern is acceptable as a *bounded* recovery mechanism (3-5 attempts, then escalate).

Source: <https://mediasoup.discourse.group/t/reconnect-after-transport-connectionstate-failed/5084>

---

## 3. Cold-boot specifics — consumer-before-producer race

This is the canonical race and tt-beamer's `/api/ssr/ready` HTTP-poll is one valid response. The three patterns:

### 3.1 Pattern A — HTTP-poll-readiness-then-WS

What tt-beamer currently does: Pi polls `/api/ssr/ready`, then opens the WS. **Pros:** simple, debuggable, no race window. **Cons:** doubles cold-boot latency, two protocols to keep in sync. Useful when the server has a meaningful "not yet warm" state distinct from "WS up".

### 3.2 Pattern B — WS-then-listen-for-producer-event (mediasoup-demo)

The Pi opens the WS first. The server, on the join request, returns the *current* producer roster (possibly empty). Subsequent `newProducer` notifications are pushed as producers appear. The consumer state-machine treats "no producers yet" as a normal state, not an error.

```js
// On WS open
const { peers } = await signaling.request('join', { rtpCapabilities });
// peers may be empty; just wait
signaling.on('notification', n => {
  if (n.method === 'newProducer') consume(n.data);
});
```

### 3.3 Pattern C — Hybrid (LiveKit)

LiveKit opens the WS, joins the room, and the server's `JoinResponse` includes a `room.creation_time`, current participant list, and existing track roster. The client knows immediately whether to expect tracks. If none, it stays in `Connected` state with no subscriptions and reacts to `participant_joined` / `track_published` events.

### 3.4 Recommendation for tt-beamer

Drop the `/api/ssr/ready` HTTP poll and adopt **Pattern B/C hybrid**:

- Server's signaling layer always accepts WS connections — even before the producer exists.
- Server signaling responds to the consumer's `join` with `{ producerExists: bool, producerId?: string }`.
- If `producerExists === false`, the server starts/reuses the publisher tab on demand (lazy producer warm-up driven by first consumer attaching).
- Server pushes `producerReady` notification when the publisher tab finishes warm-up.
- Consumer waits in a single state (`AwaitingProducer`) — no separate HTTP poll loop, no WS recycle.

This eliminates the WS-flap-during-warmup window that we suspect is the trigger for the reconnect loop.

---

## 4. Heartbeat / liveness probing

### 4.1 Same-LAN cadence recommendation

tt-beamer is gigabit LAN. Network round-trip is sub-millisecond. Cadence guidance:

| Layer                           | Recommended interval | Recommended timeout |
|---------------------------------|----------------------|---------------------|
| Signaling WS ping/pong          | 5s                   | 10s (2x interval)   |
| `getStats()` poll               | 1s                   | 3s (3 missed = stalled) |
| ICE consent (RFC 7675, browser-managed) | (browser default 5s) | 30s (browser-default `failed`) |

The standard webrtcHacks recommendation for **production monitoring** is 100-200ms `getStats()` polling for fast-fail detection, dropping to 4-5s for steady-state cost. For tt-beamer's single-consumer single-publisher LAN, **1Hz is enough** and is much cheaper than 10Hz.

Source: <https://webrtchacks.com/power-up-getstats-for-client-monitoring/>

### 4.2 Detecting "connection alive but no frames"

The killer failure mode (image-hang) is `iceConnectionState === 'connected'` but `framesReceived` not advancing. Detect via:

```js
let last = 0, stalledSince = 0;
setInterval(async () => {
  const stats = await pc.getStats();
  let cur = 0;
  stats.forEach(s => { if (s.type === 'inbound-rtp' && s.kind === 'video') cur = s.framesReceived; });
  if (cur === last) {
    stalledSince ||= Date.now();
    if (Date.now() - stalledSince > 3000) handleStall();   // 3s no new frame
  } else {
    last = cur; stalledSince = 0;
  }
}, 1000);
```

Other useful inbound-rtp fields:
- `framesDecoded` — decoder progress (sometimes diverges from framesReceived under jitter-buffer stalls)
- `freezeCount`, `totalFreezesDuration` — Chrome-specific, post-M93
- `pliCount`, `firCount`, `nackCount` — recovery activity
- `bytesReceived` — for is-the-pipe-flowing-at-all

Sources: <https://developer.mozilla.org/en-US/docs/Web/API/RTCInboundRtpStreamStats>, <https://webrtchacks.com/power-up-getstats-for-client-monitoring/>

### 4.3 Heartbeat on the signaling WS

Even on LAN, a signaling-layer ping/pong is necessary — it's the only way to detect a dead WS that hasn't yet sent a TCP FIN/RST. Recommendation:

- Server sends `ping` every 5s.
- Client replies `pong` immediately.
- Either side that misses 2 consecutive pongs (i.e. silent for >10s) closes the WS with code 4001 ("heartbeat timeout") and the client's reconnect logic kicks in.

LiveKit, Twilio, and Daily all do something equivalent. mediasoup-demo's `protoo` does **not** — it relies on TCP keepalive, which on Linux defaults to 7200s (`net.ipv4.tcp_keepalive_time`). That is why mediasoup-demo's WS sometimes "stays open forever" on a dead network. **For tt-beamer, do not rely on TCP keepalive.**

---

## 5. State-machine contracts — published references

The clearest published state diagram is **LiveKit**'s `ConnectionState` enum (Room.ts) with explicit transitions documented in the engine (`RTCEngine.ts`). Reproduced from <https://github.com/livekit/client-sdk-js/blob/main/src/room/Room.ts>:

```
   ┌───────────────────────────────────────────────────┐
   │                                                   │
   │   ┌─────────────┐         ┌─────────────┐         │
   └──►│ Disconnected├────────►│ Connecting  │         │
       └─────────────┘         └──────┬──────┘         │
              ▲                       │                │
              │                       ▼                │
              │                ┌─────────────┐         │
              │                │  Connected  │◄────────┤
              │                └──────┬──────┘         │
              │                       │                │
              │                       │ EngineEvent.   │
              │                       │   Resuming     │
              │                       ▼                │
              │             ┌──────────────────┐       │
              │             │SignalReconnecting│───────┤ Resumed
              │             └──────────────────┘       │
              │                       │                │
              │                       │ resume fails   │
              │                       ▼                │
              │                ┌─────────────┐         │
              └────────────────┤Reconnecting │─────────┘ Resumed
                  give up      └─────────────┘   recreate engine
```

Twilio publishes a simpler 3-state machine (`connected | reconnecting | disconnected`) — see <https://www.twilio.com/docs/video/reconnection-states-and-events>.

**Recommendation for tt-beamer:** adopt LiveKit's 5-state model verbatim, mapping `SignalReconnecting` → "WS-only reconnect, reuse mediasoup transports" and `Reconnecting` → "tear down + recreate everything". Document each transition's **trigger event**, **timer**, and **next-state contract** in `33-STATE-MACHINE.md`.

---

## 6. Chrome 131-specific gotchas (publisher under Xvfb)

### 6.1 Confirmed gotchas

**`--use-gl=angle --use-angle=default`** is correct for Chrome 131 + Xvfb + Mesa-llvmpipe. Prior to 131 the working incantation was `--use-gl=egl`; the regression that triggered Phase-32 hotfix h9 is documented in chromium-discuss:
- Chromium uses ANGLE as the unified GL frontend post-M120.
- ANGLE-on-Linux defaults to selecting the Vulkan backend if available, otherwise GL desktop. With Mesa llvmpipe and no Vulkan ICD, the wrong default was crashing the GPU process.
- `--use-angle=default` lets ANGLE pick the right backend (GL on llvmpipe).

Source: <https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md>, <https://groups.google.com/a/chromium.org/g/chromium-discuss/c/NpsDdbtSRsU>

**SwiftShader as fallback** — if `--use-gl=angle` continues to crash, the documented fallback is SwiftShader (`--use-gl=swiftshader`). SwiftShader gives a deterministic but slower GL implementation and is the bot/CI standard at Google.

**VAAPI is not usable on this hardware in Chrome 131.** Chrome 131 changed the feature flag from `VaapiVideoDecodeLinuxGL` to `AcceleratedVideoDecodeLinuxZeroCopyGL,AcceleratedVideoDecodeLinuxGL,AcceleratedVideoEncoder`. Even with the new flags, Raptor Lake-P + Mesa intel-media-driver + ANGLE has documented incompatibility (saiarcot895/chromium-ubuntu-build #91 — "Chromium using ANGLE gl driver and VA-API not working"). **Phase-32 finding A2 is correct.** Software OpenH264 encode is the only working path on this hardware.

Source: <https://github.com/saiarcot895/chromium-ubuntu-build/issues/91>, <https://dev.to/archerallstars/chrome-flags-latest-2024-update-...>

**Simulcast under Xvfb + software H264** — Phase-32 hotfix h8 (force `useSimulcast = false`) is correct. The libwebrtc H264 encoder has spatial-layer-0 as the **highest** layer (opposite of VP8) and software-encoding 3 simulcast layers in parallel saturates the CPU at 4-6 fps total throughput on this hardware. Single-layer is the only viable configuration.

Sources: <https://github.com/versatica/mediasoup/issues/296>, <https://github.com/versatica/mediasoup/issues/215>

**puppeteer-stream + getDisplayMedia → page-close crash** — Puppeteer issue #13478 (open as of Jan 2026): closing a page that has an active getDisplayMedia stream crashes the puppeteer process. tt-beamer is technically headful + `chrome.tabCapture` not getDisplayMedia, but the same crash signature has been reported. **Mitigation:** stop all tracks (`stream.getTracks().forEach(t => t.stop())`) before navigating away or closing the tab.

Source: <https://github.com/puppeteer/puppeteer/issues/13478>

### 6.2 Recommended Chrome flags for tt-beamer publisher

```
--use-gl=angle
--use-angle=default
--enable-features=AcceleratedVideoEncoder
--disable-features=UseChromeOSDirectVideoDecoder
--disable-gpu-vsync
--ignore-gpu-blocklist
--no-sandbox                  (required under Xvfb)
--disable-dev-shm-usage       (Pi/server has limited /dev/shm)
--autoplay-policy=no-user-gesture-required
```

Avoid: `--use-gl=swiftshader-webgl` (different from `--use-gl=swiftshader`; this one is WebGL-only and breaks WebRTC encoder), `--enable-gpu-rasterization` (regressed for llvmpipe in M129+).

---

## 7. Anti-patterns — what NOT to do

### 7.1 Forever-retry without a cap is an anti-pattern

Every reference impl caps eventually:
- mediasoup-demo / protoo — 10 retries
- Daily — 20s signaling eject
- Twilio — internal but emits `disconnected` with code 53000
- LiveKit — `ReconnectPolicy.nextRetryDelayInMs(context)` returns `null` to give up

**The only one that doesn't cap is tt-beamer's current implementation.** Forever-retry with `[1s, 2s, 5s, 10s, 30s]` walking the schedule indefinitely is contrary to every reference implementation and produces:

- Mobile/Pi battery and CPU drain (less critical for tt-beamer Pi which is always on AC, but still wasteful).
- Server resource exhaustion when many clients hammer a down server (less critical at scale-of-1 but the principle holds).
- UX hell: operator has no signal that the system has truly given up.
- Auth failures (close code 1008) retry forever and never succeed — guaranteed pathological loop.

**Recommendation:** cap at **N=10** retries or **T=2 minutes** total, whichever first. After cap, transition to a `GivenUp` state. Operator UX shows a "Reconnect" button that resets the counter and starts fresh. This mirrors `Twilio` (53000) and `Daily` (20s eject) and is consistent with `dev.to/hexshift/robust-websocket-reconnection-strategies` ("a reconnection implementation should include maximum attempt limits").

Source: <https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1>

### 7.2 sessionStorage backoff state is half-right

Persisting backoff across page-reloads is correct in principle — without it, an operator hitting F5 during a reconnect storm would reset to 1s and hammer the server. But the **rule** must be: **any successful connect resets the counter**, including the page-reload case. tt-beamer's current impl reads sessionStorage on every retry — which is correct — but the reset must happen on:

1. `connected` event fires (consumer fully consuming frames, not just WS open).
2. Operator clicks the "Reconnect now" button.

If the reset is gated on WS-open, the system can chase its tail forever: WS open → consume fails → WS closes → counter never reset → backoff exhausts.

Source pattern: LiveKit `Room.ts` resets reconcile/backoff state in `EngineEvent.Resumed` and `EngineEvent.Restarted` handlers, **not** in WS-open.

### 7.3 In-flight flag wrapped only around `tryConnect()` is insufficient

Phase-32 hotfix h6/h7 wrapped `tryConnect()` in `tryConnectInFlight` with try/catch/finally. This protects against concurrent calls to `tryConnect()` itself but does NOT protect against:

- `tryConnect()` returning early because flag is set, but the parallel call's failure path resets the flag — so the next setTimeout fires another call before the first finishes.
- WebSocket `open` and `error` racing — both can call `scheduleReconnect()`.

**Better pattern**: a top-level **state machine** owns all transitions. There is no `tryConnect()` function callable from anywhere — there is `dispatch({ type: 'CONNECT' })` which the machine routes based on current state. Race-free by construction.

### 7.4 Stale-guard scoped to consumers only is correct but fragile

Phase-32 h10 (scope `connectionsByAddr.set` to `role === 'consumer'`) is the right fix for the immediate symptom. But it leaves the publisher (ssr-tab) without any stale-guard at all, meaning if the ssr-tab's WS goes zombie, the server will never clean it up. Long-term, the stale-guard should be **per-role** with **per-role** policies, not "consumers only".

### 7.5 HTTP-poll producer-readiness during cold-boot is acceptable but redundant

See §3.4. The double-protocol (HTTP poll + WS open) introduces a window where the HTTP poll says "ready" but the WS handshake then races against producer creation/destroy on the server. Single-protocol via WS-with-server-push (Pattern B) eliminates this race.

### 7.6 Symmetric clear without context-check (h46-style)

The Phase-31-h46 "symmetric clear" fix to `room-overlay` was correct in intent but reveals a deeper anti-pattern — relying on the absence of state being signalled implicitly via `setTimeout` cycles rather than explicit lifecycle events. State-machine boundaries (entering/exiting a state) should drive UI sync, not rAF/setInterval polling.

---

## 8. Synthesis — proposed contract direction for `33-STATE-MACHINE.md`

This section is a starting sketch — `33-STATE-MACHINE.md` will formalise.

**5 states** (LiveKit-aligned):
```
Disconnected → Connecting → Connected ⇄ SignalReconnecting (resume)
                                ⇄ Reconnecting (full)
                                → GivenUp (after N retries / T minutes)
```

**Transitions:**
- `Disconnected → Connecting` on operator action / boot.
- `Connecting → Connected` on `consumer.track.onunmute` first-frame.
- `Connecting → Disconnected` on WS-open timeout (10s, current).
- `Connected → SignalReconnecting` on WS close OR `iceConnectionState='disconnected'` ≥7s.
- `SignalReconnecting → Connected` on resume success (WS reopened + ICE re-converged + frames flowing).
- `SignalReconnecting → Reconnecting` on resume failure (server says session unknown, OR ICE goes to `failed`).
- `Reconnecting → Connected` on full rejoin success.
- `Reconnecting → GivenUp` on N=10 retries or T=2min total elapsed.
- `GivenUp → Connecting` on operator action only (button click).

**Server hint protocol** — adopt LiveKit's tri-action:
```js
// signaling response on reconnect attempt
{ action: 'RESUME' | 'RECONNECT' | 'DISCONNECT', reason: string, sessionId?: string }
```

**Heartbeat** — server sends `ping` every 5s; client closes (4001) on 2 missed (>10s silent). Client `getStats()` poll at 1Hz; transition to `SignalReconnecting` if `framesReceived` flat for 3s while `iceConnectionState === 'connected'`.

**Backoff** — `[1s, 2s, 5s, 10s, 30s]` schedule preserved, **capped at 10 retries OR 120s total** (whichever first), then `GivenUp`. SessionStorage persisted. Counter reset only on first-frame `Connected`.

**ICE-restart vs full** — driven by server hint; client default is ICE-restart on `disconnected`-≥7s, full-tear-down on `failed`.

---

## 9. Source index (URLs)

- Twilio reconnection events: <https://www.twilio.com/docs/video/reconnection-states-and-events>
- Daily.co network events: <https://docs.daily.co/reference/daily-js/events/network-events>
- LiveKit connect docs: <https://docs.livekit.io/home/client/connect/>
- LiveKit client protocol: <https://docs.livekit.io/reference/internals/client-protocol/>
- LiveKit Room.ts: <https://github.com/livekit/client-sdk-js/blob/main/src/room/Room.ts>
- LiveKit RTC proto: <https://github.com/livekit/protocol/blob/main/protobufs/livekit_rtc.proto>
- LiveKit ReconnectPolicy: <https://docs.livekit.io/client-sdk-js/interfaces/ReconnectPolicy.html>
- mediasoup-client API: <https://mediasoup.org/documentation/v3/mediasoup-client/api/>
- mediasoup-demo RoomClient.js: <https://github.com/versatica/mediasoup-demo/blob/v3/app/src/RoomClient.js>
- mediasoup discourse — disconnected: <https://mediasoup.discourse.group/t/transport-connectionstate-changes-do-disconnected/1443>
- mediasoup discourse — failed/restartIce: <https://mediasoup.discourse.group/t/reconnect-after-transport-connectionstate-failed/5084>
- protoo signaling framework: <https://protoo.versatica.com/>
- Jitsi BridgeChannel issue #950: <https://github.com/jitsi/lib-jitsi-meet/issues/950>
- Jitsi Videobridge web-sockets: <https://github.com/jitsi/jitsi-videobridge/blob/master/doc/web-sockets.md>
- RFC 7675 (ICE consent freshness): <https://datatracker.ietf.org/doc/html/rfc7675>
- WebSocket reconnection guide: <https://websocket.org/guides/reconnection/>
- Robust WS reconnection patterns: <https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1>
- webrtcHacks getStats client monitoring: <https://webrtchacks.com/power-up-getstats-for-client-monitoring/>
- MDN RTCInboundRtpStreamStats: <https://developer.mozilla.org/en-US/docs/Web/API/RTCInboundRtpStreamStats>
- Chrome 131 GL flags discussion: <https://groups.google.com/a/chromium.org/g/chromium-discuss/c/NpsDdbtSRsU>
- SwiftShader docs: <https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md>
- Chromium VA-API + ANGLE incompatibility: <https://github.com/saiarcot895/chromium-ubuntu-build/issues/91>
- mediasoup H264 simulcast issue #296: <https://github.com/versatica/mediasoup/issues/296>
- mediasoup H264 simulcast issue #215: <https://github.com/versatica/mediasoup/issues/215>
- Puppeteer getDisplayMedia crash #13478: <https://github.com/puppeteer/puppeteer/issues/13478>
- Chrome flags update 2024+: <https://dev.to/archerallstars/chrome-flags-latest-2024-update-web-browser-video-hardware-acceleration-on-linux-34k1>

---

*Phase-33 · 33-RESEARCH.md · 2026-05-08 · input artefact for 33-STATE-MACHINE.md*
