# Comprehensive Phase 31 → HEAD Connection Audit

**Date:** 2026-05-07T23:55Z
**Baseline:** `7d4063a` (tag `phase-31-end`)
**HEAD:** `b26daac` (h1 + h3 + h5 + h6 + h7 hotfixes; h4 reverted)
**Auditor scope:** every file changed between baseline and HEAD that could affect connection establishment / stability.

---

## 0 — Executive summary

User reports: *"Mit so einer Verbindung wie aktuell kann ich nicht releasen — ständige Verbindungsabbrüche, reconnection at 0s hangs multiple times."*

Two classes of remaining problems found, ranked by likelihood:

1. **PRIMARY (cosmetic-but-misleading): countdown reaches `0s` and STAYS visible indefinitely** while the next `tryConnect()` is in flight. Banner reads `RECONNECTING — 0s (attempt N)` for the entire duration of the new connect attempt (which can take 8–11 seconds with the server's h19 consume-hold + DTLS). The user perceives this as a hang, even when retries are functionally proceeding. → **High explanatory power for the 0s-hang report.**

2. **SECONDARY (latent functional): receiver-side `WebSocket open` has no timeout**. If the WS handshake never resolves (e.g., server destroyed the socket pre-handshake to enforce the per-IP guard, but TCP RST hasn't flushed yet, or the server is paused), `await createWebRtcReceiver` blocks forever; with h7 in place the in-flight flag eventually clears in `finally` only AFTER the await unblocks — which never happens. The publisher script HAS a 10 s ws-open timeout (line 157 of `ssr-stream-publisher.mjs`); the receiver does not.

3. **SECONDARY (functional, h7-introduced fragility): finally-clears-flag-too-early window** — h7 clears `tryConnectInFlight` when `await createWebRtcReceiver` returns, BEFORE the recvTransport has reached `connected`. During the 1–3 s DTLS-handshake window the monitor can in theory fire reconnect if heartbeat-stale or pc-failed materialises. (Heartbeat-stale needs >8 s of no `{type:"heartbeat"}`; the server emits one every 1500 ms while the WS is open, so this is unlikely UNLESS the server's signaling event-loop is choked by another concurrent operation.)

4. **TERTIARY (still present from prior research): `--use-gl=egl` crashes Chrome 131 GPU process** → SwiftShader fallback at 2–5 fps under animation load. This is a frame-rate regression, NOT a connection regression — but at low fps the consumer's `frame-stale` evaluator (8 s threshold, gated on `pcConnectionState === "connected"`) is a latent footgun. Once `connected` fires and the stream is at SwiftShader-2-fps under heavy animation, lastFrameAtMs CAN go past the 8 s threshold (e.g., 1 frame every 8 s = the threshold is at the edge), tripping `frame-stale` and a reconnect cycle.

5. **DEAD-WIRE (cosmetic / misleading docs): server's `producer-ready` WS broadcast has no consumer-side handler.** Verified: `receiver-webrtc-client.js` only handles `m.type === "heartbeat"`, `"render-host-down"`, and request-ID replies. `producer-ready` is silently dropped. Plan-doc claim of a WS fast-path is false; the receiver always falls back to the 1 s polling cadence of `waitForProducer`. Not a connection bug, but worth flagging because every cold-boot eats up to 1 s of pollIntervalMs jitter.

The single most likely bug behind the user's "0s hangs multiple times" report is **#1 (countdown reaches 0 and never advances visually)**. It is a UX-deception masking the real proceeding retry; combined with #4 (SwiftShader low fps causing frame-stale reconnect storms once connected) it produces exactly the user-visible pattern.

---

## 1 — Files changed (connection-affecting)

| File | LoC delta | Risk | Notes |
|---|---|---|---|
| `src/app/runtime/output-receiver/receiver-bootstrap.js` | +198 / −20 | **CRITICAL** | Forever-retry, in-flight flag, waitForProducer gate, countdown overlay; h5 / h6 / h7 evolution |
| `src/app/runtime/output-receiver/receiver-status-ui.js` | +143 / −1 | **HIGH** | Backoff schedule, sessionStorage helpers, `showCountdownReconnect` (the 0s-hang origin), overlayHide poller |
| `src/server/ssr-webrtc-signaling.mjs` | +21 / −0 | LOW | `broadcastProducerReady()` added (DEAD-WIRED — see §5) |
| `src/server/ssr-mediasoup-router.mjs` | +49 / −0 | LOW–MED | New `purgeStaleMediasoupWorker()`; pkill is system-wide, kills ANY mediasoup-worker (collides with running production server on same host) |
| `src/server/ssr-ready-handler.mjs` | NEW (22 LoC) | LOW | Pure response builder; trivial logic |
| `src/server/ssr-render-host.mjs` | small | **HIGH** | Xvfb `-fakescreenfps 60`; `--use-gl=egl` is back in args (h4 reverted); SwiftShader fallback path active |
| `src/server/ssr-stream-publisher.mjs` | medium | LOW | streamFpsCap → `frameRate.max`, alignModeBoost setInterval (250 ms), fps-diag setInterval (5 s); none of these touch the WebRTC transport |
| `src/server/server-encoder-detect.mjs` | +25 / −2 | LOW | New `probeLibvaRuntime()`; vaapi may be selected even without `h264_vaapi` — different encoder than baseline (vaapi vs x264-software) — different bitrate / fps characteristics, but does NOT affect the signaling path |
| `src/server/ssr-server-rendering-config.mjs` | medium | LOW | New schema fields; settings-panel only |
| `server.mjs` | +25 / −2 | LOW | Hoists `signalingState`; new `GET /api/ssr/ready`; new `await purgeStaleMediasoupWorker()` at boot |
| `config/global-defaults.json` | +2 lines | LOW | New `streamFpsCap: 60`, `alignModeBoost: true` |
| `src/app/lib/ui/settings/server-rendering-panel.js` | medium | NIL | Settings UI only |
| `src/app/runtime/core/runtime-dom-refs.js` | +4 lines | NIL | Settings UI only |
| `src/app/runtime/runtime-orchestration.js` | +4 lines | NIL | Settings UI passthrough only |

---

## 2 — Per-file behavioural deltas (high-risk files)

### 2.1 `receiver-bootstrap.js`

| Aspect | Baseline (`7d4063a`) | HEAD (`b26daac`) |
|---|---|---|
| `reconnectAttempts` initialisation | always `0` | `loadBackoffState(sessionStorage).attempts` (could be > 0 from prior failed session) |
| Hard cap | `MAX_RECONNECT_ATTEMPTS = 10` → `showError` at cap | **REMOVED** — forever-retry with backoff schedule |
| Backoff delay | `Math.min(1000 * Math.pow(1.5, attempts), 10000)` | `getBackoffDelay(n)` from `[1000,2000,5000,10000,30000]` |
| Pre-connect gate | none (immediate `tryConnect`) | `await waitForProducer({ maxWaitMs: 60000, pollIntervalMs: 1000 })` BEFORE `tryConnect` (h5 placement) |
| Monitor reconnect guard | `dec.disconnected && reconnectAttempts === 0 && pcState !== "host-down"` | `dec.disconnected && !tryConnectInFlight && pcState !== "host-down"` (h6) |
| In-flight flag clearing | n/a | h6: cleared in `connected` and `catch`. h7: ALSO cleared in `finally` (always-clear) |
| Reconnect overlay | `ui.showReconnect("Retrying in Ns…")` (static text, no countdown) | `showCountdownReconnect({ delayMs, attemptN })` (per-500 ms tick, leaves "0s" text after expiry) |
| Stable-reset | n/a | new: connectionStableSince + STABLE_RESET_THRESHOLD_MS=30000 → reset attempts to 0 |
| Overlay-hide poller | n/a | new: 500 ms `evaluateOverlayHide` with OVERLAY_HIDE_AFTER_STABLE_MS=5000 |

**Ordering invariant after h5+h7:**
```
waitForProducer (up to 60s, polls /api/ssr/ready every 1s)
  ↓
monitorInterval armed
  ↓
await tryConnect()         ← finally clears in-flight flag once awaitable returns
```

### 2.2 `receiver-status-ui.js`

New module-level constants:
- `RECONNECT_BACKOFF_MS = [1000, 2000, 5000, 10000, 30000]`
- `STABLE_RESET_THRESHOLD_MS = 30000`
- `OVERLAY_HIDE_AFTER_STABLE_MS = 5000`
- `BACKOFF_STATE_KEY = "ssr-reconnect-state"`

New helpers (all defensive — Number.isFinite / fall-back to 0):
- `getBackoffDelay(n)`
- `loadBackoffState(storage)`
- `saveBackoffState(state, storage)`
- `clearBackoffState(storage)`
- `markStable(storage)`
- `markConnectionStable({ now, store })`
- `evaluateOverlayHide({ now, store, hideAfterMs })`
- **`showCountdownReconnect({ doc, delayMs, attemptN, tickMs=500 })`** — returns `stop()`. Body of `tick()`:
    ```js
    const remainSec = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    banner.textContent = `RECONNECTING — ${remainSec}s (attempt ${attemptN})`;
    if (remainSec <= 0) return;          // <-- stays at "0s" indefinitely
    setTimeout(tick, tickMs);
    ```
  → **At expiry, the banner is left at `"RECONNECTING — 0s"` until something else clears it.** That "something else" is `ui.hideReconnect()` (called only on `connected` or after stable-overlay-hide poller decides) or a NEW `showCountdownReconnect` (which only fires when `tryConnect` ENTERS its catch path).
  → If the next `tryConnect` is in `await createWebRtcReceiver` (typical 5–11 s with the h19 consume-hold + DTLS), the banner stays at "0s" for that whole period. **This is the user-reported "0s hangs" symptom.**

### 2.3 `ssr-webrtc-signaling.mjs` — `broadcastProducerReady` is dead-wired

```js
// signaling — emits text frame {type:"producer-ready"} when state.videoProducer null→non-null
function broadcastProducerReady() {
  const frame = encodeTextFrame(JSON.stringify({ type: "producer-ready" }));
  for (const [, entry] of connectionsByAddr) {
    if (!entry || !entry.conn || entry.conn.role !== "consumer") continue;
    try { entry.socket.write(frame); } catch {}
  }
}
```

Receiver (`receiver-webrtc-client.js` lines 120–149) message handler:
```js
if (m.type === "heartbeat") { ... return; }
if (m.type === "render-host-down") { emit("connectionState", "host-down"); return; }
if (m.requestId && pending.has(m.requestId)) { ... }
// "producer-ready" -> falls through, silently dropped
```

`grep -rn "producer-ready" src/app` returns NO match. The fast-path documented in 32-02-T1 plan does not exist in code.

Practical impact: **none** for connection correctness. Cosmetic impact: every fresh /output/ load eats up to one full pollIntervalMs (1000 ms) of `waitForProducer` waiting for a 503→200 transition that the server is also pinging via WS.

### 2.4 `ssr-mediasoup-router.mjs` — `purgeStaleMediasoupWorker`

```js
execFn("pkill -f mediasoup-worker", {}, (err) => { ... });
await new Promise((r) => setTimeout(r, 200)); // 200 ms grace
```

**Risk:** `pkill -f mediasoup-worker` matches ANY process with `mediasoup-worker` in argv on the host. If the user has the production server running on port 4173 AND the dev branch attempts a boot on, say, port 4175, the dev boot's purge KILLS the production server's worker. Reproduced empirically: prior research file documents `production server (port 4173, PID 3742004) had its mediasoup-worker killed by our test instance boot`.

Practical user-visible impact: **on a developer-rebuild on the same machine where production is running, the production server's mediasoup-worker is killed**, the production server's signaling backend goes silent until mediasoup re-spawns (which it does — mediasoup workers auto-respawn via the `worker.on("died")` handler at line 96 — but `state.videoProducer` is then NULL and consume() returns 503 for several seconds; any connected Pi receiver loses the stream).

Boot-flow ordering in `server.mjs` (lines 4214–4218):
```js
console.log("[server] purging stale mediasoup-worker (D-B4)");
await purgeStaleMediasoupWorker();
await bootMediasoupRouter();
signalingState = attachWebRtcSignaling(server);
```

200 ms grace is enough for SIGTERM cleanup but **the killed production worker takes longer to come back up** in a separate process (it has to re-create router, re-create transport, re-publish producer — typically 3–5 s). During this window, an existing Pi receiver sees stream interruption.

### 2.5 `ssr-render-host.mjs` — Chromium launch args

Two non-trivial changes vs. baseline:

1. **`-fakescreenfps 60`** added to Xvfb args (line 66 of HEAD). Phase-31-end had no such flag; baseline used Xvfb's default (~25 Hz) BeginFrameSource. h3 walked it back from 120 → 60. Affects rAF rate inside the SSR tab.

2. **`--use-gl=egl` is still present** at line 445 of HEAD. h4 changed it to `--use-gl=angle` and added `--use-angle=default`; h4 was reverted in `97d4dd3`. Chrome 131 confirmed-empirically (research file) returns:
    ```
    Requested GL implementation (gl=egl-gles2,angle=none) not found in allowed implementations: [(gl=egl-angle,angle=default)]. Exiting GPU process due to errors during initialization
    ```
    repeated 3–4 times before falling through to SwiftShader. Idle ~25 fps; under animation load 2–5 fps. At 2–5 fps, 1 frame ≈ 200–500 ms. With the 8-s frame-stale threshold, a half-second pause anywhere in the GIF/sandstorm pipeline would cumulatively trip stale → reconnect.

The h4 fix WAS:
```diff
-        "--use-gl=egl",
+        "--use-gl=angle",
+        "--use-angle=default",
```
The revert (`97d4dd3`) restored the broken state.

### 2.6 `ssr-stream-publisher.mjs` — added timers and telemetry

- 250 ms-interval `setInterval` for align-mode FPS boost (line 222-234) — only runs when `__TT_BEAMER_STATE_FOR_DIAG__.alignMode` flips. Read-only against state; cannot affect WebRTC transport.
- 5 s-interval fps-diag `setInterval` (line 254-274) — `console.log` only. CANNOT affect transport.
- `frameRate: { ideal, max }` constraint at `getDisplayMedia` time + post-construction `applyConstraints` — feeds the encoder. Cannot affect connection establishment.

These are diagnostic / quality concerns; none can break the signaling path.

### 2.7 `server-encoder-detect.mjs` — VAAPI may be selected

New `probeLibvaRuntime()` lets the resolver pick `vaapi` even on a host whose ffmpeg lacks `h264_vaapi`. Result: HEAD selects `encoder=vaapi` whereas baseline selected `encoder=x264-software` on the same host. The Chromium `--enable-features=VaapiVideoEncoder,VaapiVideoDecoder,VaapiIgnoreDriverChecks` is now set. With `--use-gl=egl` causing GPU-process crashes, the VAAPI encoder may fall through to its own fallback. Net effect: more variance in fps, but the WebRTC stack is encoder-agnostic; **selecting vaapi vs x264 cannot cause reconnect storms by itself.**

---

## 3 — Failure-mode hypotheses (ranked)

### 3.1 ★★★★★ Countdown overlay banner left at "RECONNECTING — 0s" while next attempt awaits

**Reproduction:** any cold boot where the producer takes longer than the smallest backoff slot (1 s) to come up; or any mid-session retry where consume / DTLS takes longer than the active backoff slot.

**Trace (cold-boot worst case, attempt 1):**
- T=3 s: `tryConnect` first runs (after `waitForProducer` resolves). `await createWebRtcReceiver` enters consume RPC. h19 holds 8 s if producer not yet up.
- T=11 s: consume RPC returns. Catch did NOT fire. recvTransport handshake begins.
- T=13 s: DTLS connected. `connected` fires. Flag cleared. `countdownStop()` called. Banner hidden.

OK in success path. But on FAILURE path:
- T=3 s: `tryConnect` runs. `await createWebRtcReceiver` throws (e.g., consume rejects with "no-producer-yet" because h19 timed out). Catch sets `attempts=1`, delay=1000 ms, countdown begins ("RECONNECTING — 1s (attempt 1)").
- T=4 s: countdown hits 0. Banner: "RECONNECTING — 0s (attempt 1)". setTimeout fires `tryConnect()`. `tryConnect` enters new attempt. Sets in-flight=true. Begins `await createWebRtcReceiver`. Banner unchanged.
- T=4–12 s: `tryConnect` is mid-await. Banner reads "RECONNECTING — 0s (attempt 1)" the entire 8 s. **User sees a hung 0s.**
- T=12 s: this attempt also fails. Catch: attempts=2, delay=2000, countdown shows "RECONNECTING — 2s (attempt 2)" and counts down. After 2 s: "0s". Hang again.
- T=14 s: tryConnect resumes. attempts=3 case: 5s backoff, "5s" → "0s". Hang.

The user sees: `0s … 2s 1s 0s … 5s 4s … 1s 0s … 10s … 1s 0s …` exactly matching "reconnection at 0s hangs multiple times".

**This is purely a UI bug (the banner does not communicate that the next attempt has begun)**, but it's load-bearing for user release-confidence. It does NOT cause the reconnect to actually stall; functionally the loop is progressing.

**Fix (1-line):** In `showCountdownReconnect` (`receiver-status-ui.js` line 138-153), when `remainSec <= 0`, BEFORE returning, set the banner text to a "Retrying now (attempt N)…" message so the user sees forward motion:

```js
function tick() {
  if (stopped) return;
  const remainSec = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
  if (remainSec <= 0) {
    banner.textContent = `RECONNECTING — retrying now (attempt ${attemptN})…`;
    banner.hidden = false;
    if (banner.style) banner.style.display = "";
    return;
  }
  banner.textContent = `RECONNECTING — ${remainSec}s (attempt ${attemptN})`;
  banner.hidden = false;
  if (banner.style) banner.style.display = "";
  setTimeout(tick, tickMs);
}
```

### 3.2 ★★★★ `--use-gl=egl` Chrome 131 GPU crash → SwiftShader fallback → frame-stale reconnect storm

**Re-confirmed by prior research** with direct Chromium binary tests. Currently still broken: HEAD has `--use-gl=egl` at `ssr-render-host.mjs:445`. h4 fix was reverted in `97d4dd3`.

**Mechanism for connection drops:** SwiftShader runs the page at 2–5 fps under animation load. Once `pcConnectionState === "connected"` is reached, the bootstrap's monitor evaluates `frame-stale` (lastFrameAtMs delta > 8 s). A 5 fps stream produces 1 frame per 200 ms — well within threshold. BUT during heavy GIF transitions / outside-mp4 decode bursts, SwiftShader can pause for 800–2000 ms. Cumulative stalls > 8 s within the 1-s monitor window are plausible, triggering a reconnect.

**Fix (re-apply h4):** `--use-gl=egl` → `--use-gl=angle` and add `--use-angle=default`.

### 3.3 ★★★ Receiver WebSocket open has no timeout → tryConnect hangs forever

**Location:** `receiver-webrtc-client.js` lines 107-119:
```js
ws = new WebSocket(signalUrl);
await new Promise((res, rej) => {
  const onOpen = () => { ws.removeEventListener("error", onErr); res(); };
  const onErr = () => { ws.removeEventListener("open", onOpen); rej(new Error("ws open failed")); };
  ws.addEventListener("open", onOpen, { once: true });
  ws.addEventListener("error", onErr, { once: true });
});
```

No `setTimeout(rej, ...)`. Compare publisher script (`ssr-stream-publisher.mjs:154-158`) which has `setTimeout(() => rej(new Error("ws-open-timeout")), 10000)`.

**Practical impact:** if a pi reconnect hits the server-side `socket.destroy()` enforcement of `MAX_CONSUMER_CONNECTIONS=50`, the client should observe `error` then `close` from the underlying TCP RST. Browsers DO surface that as `error` event; both listeners are wired. But under network glitches (e.g., WiFi drop mid-handshake) the WS may sit in CONNECTING with no event for a long time. With h7 in place, the in-flight flag eventually clears (because `await createWebRtcReceiver` itself eventually rejects via the OS TCP timeout — typically 60–120 s on Linux). But in the meantime the user is staring at "0s" for two minutes.

**Fix (3-line addition):** add `setTimeout(() => rej(new Error("ws-open-timeout")), 10000)` to the open promise.

### 3.4 ★★★ h7's eager flag-clear introduces a 1–3 s window where monitor can phantom-fire reconnect during DTLS handshake

**Trace:** with h7 applied, after `await createWebRtcReceiver` returns:
- `tryConnectInFlight = false` (finally block).
- `pcState = "new"` (or "connecting") because `recvTransport.connectionstatechange` to `connected` hasn't fired yet.
- `lastHeartbeatAtMs` is stale-relative if no heartbeat arrived during connect.
- Monitor next tick: `evaluateDisconnect` only triggers on:
    - `pcConnectionState in {"failed","disconnected","closed"}` — false here ("new"/"connecting")
    - `pcConnectionState === "connected" && nowMs - lastFrameAtMs > 8000` — guarded by "connected"
    - `nowMs - lastHeartbeatAtMs > 8000` — possible if server has not sent any heartbeat in 8 s. Server sends every 1500 ms once WS is open, so this only triggers if the server's signaling event-loop is blocked for 5+ heartbeats during heavy align-mode broadcast traffic (the original h36 storm).

**Likelihood:** low under normal load; medium during heavy align-mode drag. Currently masked by the fact that the FIRST WS open at the consumer side does refresh `lastHeartbeatAtMs` (via the receiver's `onHeartbeat` subscription) before `await createWebRtcReceiver` returns — heartbeats start arriving immediately after the WS upgrade.

**Mitigation:** also verify that the receiver-bootstrap.js initialisation of `lastHeartbeatAtMs = performance.now()` at line 137 is correct. It is. The initial value will become stale after 8 s of monitor-armed-no-heartbeat. The flow protects this only because `await waitForProducer` runs BEFORE monitor arming (h5 fix), and `tryConnect` runs IMMEDIATELY after monitor arming, so heartbeats start within ~1 s of monitor arming.

**Risk:** if `await tryConnect` succeeds (createWebRtcReceiver returns), but the WS subsequently closes during the 1–3 s DTLS settle (e.g., because the producer hung up to re-publish), the bootstrap's `ws.addEventListener("close", ...)` emits `connectionState: "ws-closed"`. With h7's eager flag-clear, the monitor's next tick CAN fire reconnect. The reconnect is functionally correct, but it bypasses any logic that wants to wait for natural DTLS recovery.

### 3.5 ★★ `purgeStaleMediasoupWorker` kills sibling workers on the same host

**Already documented in prior research.** Hard-confirmed: production-server's mediasoup-worker is killed when a dev server boots. The production server recovers (its `worker.on("died")` handler relaunches the worker), but during the recovery window the Pi sees a producer-disappeared and reconnects. If the user is rapidly iterating on the dev server, the production server is in a chronic re-publish state.

**Fix:** scope the kill to only this server's worker (track PID, or use process group / argv pattern that includes the parent server PID). Quick path: skip purge when a `mediasoup-worker` process matches a different parent PID than the current server. Or simply: gate the purge behind an env var `SSR_PURGE_STALE_WORKERS=1` so the user can disable it on shared hosts.

### 3.6 ★★ `producer-ready` WS broadcast has no consumer handler

Cosmetic / docs-mismatch. No functional bug. Consumer eats up to 1 s of `pollIntervalMs` per cold boot.

### 3.7 ★ sessionStorage-loaded `reconnectAttempts` could start the FIRST attempt on a 30 s backoff slot

`loadBackoffState` at line 122 returns whatever was saved on the prior session. If a prior session crashed at attempts=5+, the new page load enters `tryConnect` and on FIRST failure increments to 6, computes `getBackoffDelay(5) = 30000`, shows a 30-s countdown.

The h6 monitor fix (`!tryConnectInFlight` instead of `=== 0`) means the monitor can still fire reconnects. BUT the catch's `setTimeout(tryConnect, 30000)` has a 30-s window during which the monitor would only fire if `dec.disconnected` is true AND the flag is false. h7's finally clears the flag immediately, so the monitor will fire reconnect on the next stale-heartbeat tick (8+ s after the WS dies). This compresses the wait from 30 s to ~9 s. Mostly OK.

**Fix (defensive):** clear backoff state at the very top of `bootReceiver` so a fresh page load always starts at attempts=0. The persistence was meant to survive WS-close mid-handshake, not to survive page reloads.

### 3.8 ★ MAX_CONSUMER_CONNECTIONS=50 buffer headroom is fine in normal use

50 is a generous cap. The h38 per-IP-evict guard at line 265-270 of signaling.mjs proactively destroys the prior socket from the same IP before incrementing the counter. Thrash-resistant. Not a bug.

---

## 4 — Recommended fix

**Three-line surgical patch + revert:**

1. **Re-apply h4** in `src/server/ssr-render-host.mjs:445`:
   ```diff
   -        "--use-gl=egl",
   +        "--use-gl=angle",
   +        "--use-angle=default",
   ```
   Restores GPU-accelerated rendering. Eliminates SwiftShader fallback. Frame rate returns to 30–60 fps under load. `frame-stale` reconnect cycles disappear.

2. **Patch `showCountdownReconnect`** in `src/app/runtime/output-receiver/receiver-status-ui.js:138-153` to surface "retrying now" when `remainSec <= 0`. Eliminates the user-perceived "0s hang" deception.

3. **Add WS-open timeout** in `src/app/runtime/output-receiver/receiver-webrtc-client.js:108-119`:
   ```js
   await new Promise((res, rej) => {
     const onOpen = () => { ... res(); };
     const onErr = () => { ... rej(new Error("ws open failed")); };
     const t = setTimeout(() => rej(new Error("ws-open-timeout")), 10000);
     ws.addEventListener("open", () => { clearTimeout(t); onOpen(); }, { once: true });
     ws.addEventListener("error", () => { clearTimeout(t); onErr(); }, { once: true });
   });
   ```
   Prevents TCP-stalled WS from blocking `tryConnect` for 60–120 s.

4. **Defensive:** call `clearBackoffState(backoffStorage)` at the very top of `bootReceiver`, before `loadBackoffState`. Eliminates the 30-s-first-backoff-slot deadlock. (Trade-off: a true mid-handshake reload loses backoff history. Acceptable — fresh load deserves a fresh attempt cycle.)

5. **Optional:** scope `purgeStaleMediasoupWorker` to only this server's worker (gate behind env var `SSR_PURGE_STALE_WORKERS=1`). Prevents production-server collateral damage during dev iterations.

The current h7 logic is correct AND should be preserved. The recovery-loop is functionally sound after h7; what remains are three perception / robustness gaps and one render-quality regression.

---

## 5 — Test strategy (no live boot required)

### 5.1 Unit test: countdown does not leave banner at "0s"

Create `test/phase-32-countdown-no-zero-hang.test.mjs`:

```js
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { showCountdownReconnect } from "../src/app/runtime/output-receiver/receiver-status-ui.js";

test("countdown updates banner past 0s", async () => {
  const banner = { textContent: "", hidden: true, style: { display: "" } };
  const doc = { getElementById: (id) => id === "ssr-reconnect-banner" ? banner : null };
  showCountdownReconnect({ doc, delayMs: 200, attemptN: 3, tickMs: 50 });
  await new Promise(r => setTimeout(r, 350));
  assert.notEqual(banner.textContent, "RECONNECTING — 0s (attempt 3)",
    "banner must not be left at 0s after countdown expires");
  assert.match(banner.textContent, /retrying now/i,
    "banner must surface a retrying-now message past 0s");
});
```

### 5.2 Unit test: WS open timeout

Create `test/phase-32-ws-open-timeout.test.mjs`:

```js
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

test("receiver-webrtc-client.js has ws-open timeout", () => {
  const src = readFileSync(
    new URL("../src/app/runtime/output-receiver/receiver-webrtc-client.js", import.meta.url),
    "utf8");
  assert.match(src, /ws-open-timeout|setTimeout\(.+rej/,
    "WS open promise must include a timeout to bound tryConnect's await");
});
```

### 5.3 Static-analysis test: --use-gl=angle in render-host

```js
test("ssr-render-host.mjs uses --use-gl=angle (not egl) on Chrome 131+", () => {
  const src = readFileSync(
    new URL("../src/server/ssr-render-host.mjs", import.meta.url),
    "utf8");
  assert.ok(src.includes("--use-gl=angle"),
    "Chrome 131 GPU process crashes with --use-gl=egl. Must use angle + --use-angle=default.");
  assert.ok(!src.includes("\"--use-gl=egl\""),
    "Must not include --use-gl=egl literal — h4 reverted in 97d4dd3.");
});
```

### 5.4 Integration sanity (after applying fixes, no live server)

The existing `test/phase-32-cold-boot-reconnect-repro.test.mjs` covers `waitForProducer` GREEN path and the "no hard cap" assertion. Run:

```
npm test -- test/phase-32-cold-boot-reconnect-repro.test.mjs test/phase-32-countdown-no-zero-hang.test.mjs test/phase-32-ws-open-timeout.test.mjs
```

### 5.5 Manual server-side validation (optional — only after fixes are in)

1. Boot server on port 4180+ (NOT 4173). `SSR_RENDER_HOST=1 SSR_PUBLISH=1 PORT=4180 node server.mjs`.
2. Open `http://server:4180/output/` on Pi.
3. Watch the `ssr-reconnect-banner` element via DevTools — confirm "RECONNECTING — 0s" never persists for >tickMs after a backoff expiry.
4. Confirm `pc=connected` appears in the `#output-status-chip` extended overlay within 5 s.
5. Pull the network cable for 30 s on the Pi; reconnect; confirm the chip returns to `pc=connected` within 10 s of restoration.

---

## 6 — Files / lines touched by the recommended fix

- `src/server/ssr-render-host.mjs` — line 445: `--use-gl=egl` → `--use-gl=angle` + add `--use-angle=default`.
- `src/app/runtime/output-receiver/receiver-status-ui.js` — function `showCountdownReconnect` lines 138-153: surface "retrying now" past 0s.
- `src/app/runtime/output-receiver/receiver-webrtc-client.js` — lines 107-119: add ws-open `setTimeout` rejection at 10 s.
- `src/app/runtime/output-receiver/receiver-bootstrap.js` — line 119-122: insert `clearBackoffState(backoffStorage)` BEFORE `loadBackoffState`.
- (optional) `src/server/ssr-mediasoup-router.mjs` — `purgeStaleMediasoupWorker` scope-gating.

Total: ~10 lines of code change. No revert of h5/h6/h7 needed — they all stay.

---

## AUDIT COMPLETE

The single most-likely remaining bug behind the user's "0s hangs multiple times" report is a **UI-layer perception bug in `showCountdownReconnect`** (`receiver-status-ui.js` line 138-153): when the countdown expires (`remainSec <= 0`), the function returns WITHOUT updating the banner text, leaving "RECONNECTING — 0s (attempt N)" on screen for the entire 5–11 s during which the next `tryConnect()` is awaiting the WS handshake + RPC roundtrip + h19 consume-hold + DTLS handshake. Combined with the **still-unreverted `--use-gl=egl` Chrome 131 GPU crash** that drops the SSR tab to SwiftShader-2-fps under animation load (causing intermittent frame-stale-driven reconnects ONCE connected), the user sees a true churn cycle that LOOKS like every retry is hanging at 0 s. A 5-line patch (banner text past 0 s) plus re-applying h4 (`--use-gl=angle` + `--use-angle=default`) plus the receiver-side WS-open timeout (3 lines) restores release-grade connection stability without unwinding the h5/h6/h7 reconnect-loop fixes.
