# Phase 32 Connection Regression — Static Analysis

Date: 2026-05-07
HEAD: `97d4dd3` (Phase 32 with h1+h2+h3 applied + h4 reverted)
Baseline: `7d4063a` (`phase-31-end`)
Diff scope: `server.mjs`, `src/server/ssr-{webrtc-signaling,mediasoup-router,ready-handler}.mjs`, `src/app/runtime/output-receiver/receiver-{bootstrap,status-ui}.js`

---

## 1 — Diff Summary (file-by-file)

### 1.1 `server.mjs` (+25/-2)
- New module-scope `let signalingState = null;` so the readiness route can read state.
- New route handler `GET /api/ssr/ready` at line 3464–3473 that calls `buildSsrReadyResponse(signalingState)`.
- New boot step before `bootMediasoupRouter()`: `await purgeStaleMediasoupWorker()` (line 4216–4217).
- Hoisted `signalingState` from `const` to `=` assignment (line 4219).

### 1.2 `src/server/ssr-ready-handler.mjs` (NEW, 22 lines)
Pure function `buildSsrReadyResponse(signalingState)`:
- Returns `503 { ready:false, reason:"signaling-not-attached" }` if `signalingState == null`.
- Returns `503 { ready:false, reason:"producer-starting" }` if `signalingState.videoProducer == null`.
- Returns `200 { ready:true, reason:"producer-up" }` once producer is set.

Trivial; no failure modes that matter beyond "producer never comes up", which would also break the legacy path.

### 1.3 `src/server/ssr-webrtc-signaling.mjs` (+21/-0)
- Defines `broadcastProducerReady()` inside `attachWebRtcSignaling` so it has closure access to `connectionsByAddr`.
- On null→non-null `state.videoProducer` transition (line 466–470), broadcasts `{type:"producer-ready"}` text frame to every consumer-role socket.

**Important finding: the receiver never reads this message.**

```javascript
// receiver-webrtc-client.js, lines 120–149 — message handler:
// Only handles m.type === "heartbeat", m.type === "render-host-down", and m.requestId.
// `producer-ready` is silently dropped (no handler).
```

`grep -rn "producer-ready" src/app/` returns no consumer-side hit. So the broadcast is dead weight. Not the cause of the bug, but worth flagging because the Phase-32 plan claimed it as a "fast-path" and it isn't.

### 1.4 `src/server/ssr-mediasoup-router.mjs` (+49/-0)
- New `purgeStaleMediasoupWorker({ exec, gracePeriodMs=200 })` that runs `pkill -f mediasoup-worker` then sleeps 200 ms.
- `pkill` is best-effort: exit code 1 (no match) is treated as success.

**Risk:** on a host running TWO concurrent dev servers, this kills the other server's worker. Probably not the user's case (single-server LAN). A bigger risk: if the user's process supervisor (systemd, pm2, nodemon, etc.) restarts the server while the parent process still holds child handles, the pkill could kill children of the OUTGOING parent before the incoming one binds. Probably not the cause but cannot fully exclude without runtime trace.

### 1.5 `src/app/runtime/output-receiver/receiver-status-ui.js` (+133/-1)
Replaces `MAX_RECONNECT_ATTEMPTS = 10` constant with:
- `RECONNECT_BACKOFF_MS = [1000, 2000, 5000, 10000, 30000]`
- `STABLE_RESET_THRESHOLD_MS = 30000`, `OVERLAY_HIDE_AFTER_STABLE_MS = 5000`
- New helpers: `getBackoffDelay(n)`, `loadBackoffState(storage)`, `saveBackoffState`, `clearBackoffState`, `markStable`, `markConnectionStable`, `evaluateOverlayHide`, `showCountdownReconnect`.

`getBackoffDelay` is bounded (`Math.min(n, RECONNECT_BACKOFF_MS.length-1)` + Number.isFinite check) — **cannot return Infinity / NaN**. The "corrupt state → infinite delay" hypothesis is ruled out by code evidence at lines 38-42 and 49-61.

`loadBackoffState` validates with `Number.isFinite(attempts) && attempts >= 0`, so even `{"attempts": Infinity}` or `{"attempts": "abc"}` in sessionStorage decode to 0. This whole sub-system is defensive.

### 1.6 `src/app/runtime/output-receiver/receiver-bootstrap.js` (+168/-20)
- Imports `waitForProducer` (NEW), `getBackoffDelay`, backoff-state helpers, `showCountdownReconnect`, etc.
- Exports a NEW `waitForProducer({ fetch, maxWaitMs=60000, pollIntervalMs=1000 })` that polls `/api/ssr/ready` until 200 OK + `ready:true`.
- Inside `bootReceiver`:
  - Line 119–122: loads `reconnectAttempts` from sessionStorage.
  - Line 178–203: on `connectionState === "connected"`, clears backoff, marks stable, starts overlay-hide poller.
  - Line 264–287: on connect-error, increments attempts, saves backoff, shows countdown, `setTimeout(tryConnect, delay)`. **No hard cap** (forever-retry).
  - Line 348: `monitorInterval = setInterval(...)` — D-C4 disconnect monitor (unchanged from baseline).
  - **Line 437–444 (NEW): `await waitForProducer({ maxWaitMs:60000, pollIntervalMs:1000 })`**
  - Line 446: `await tryConnect();` (unchanged conceptually, but now fires ONLY AFTER the 60s wait completes).

The structural difference vs. baseline:

```
BASELINE (7d4063a):                    HEAD (97d4dd3):
  monitorInterval = setInterval(...)    monitorInterval = setInterval(...)
  await tryConnect();   ←IMMEDIATE      await waitForProducer({ 60000ms });  ←UP TO 60s
                                        await tryConnect();   ←DELAYED
```

---

## 2 — Hypothesis Ranking

### 2.1 ★★★★★ (most likely) — `waitForProducer` runs AFTER `monitorInterval` is armed → monitor phantom-fires before tryConnect

**Evidence:** receiver-bootstrap.js lines 348 and 437-446.

Trace (cold-boot worst case):

1. `T=0` ms — `bootReceiver` enters. Line 128–129 set `lastHeartbeatAtMs = lastFrameAtMs = performance.now()` (≈ 0).
2. `T≈10` ms — Line 348 `monitorInterval = setInterval(..., 1000)` armed.
3. `T≈10` ms — Line 437 `await waitForProducer({ maxWaitMs:60000, pollIntervalMs:1000 })` enters. The Pi polls `/api/ssr/ready`; if the SSR Chromium tab takes >1 s to publish (typical: 1.5-2 s on a Pi class machine), waitForProducer keeps returning false and polls again.
4. `T≈8000` ms — monitor's tick-7 evaluates `evaluateDisconnect({ pcConnectionState: "new", lastHeartbeatAtMs: ~0, nowMs: ~8000 })`. Because **`8000 - 0 > 8000` (DISCONNECT_THRESHOLD_MS)**, `reasons = ["heartbeat-stale"]`, `disconnected = true`.
5. Guard at line 356 `(dec.disconnected && reconnectAttempts === 0 && pcState !== "host-down")` is satisfied (reconnectAttempts is still 0 because tryConnect has not been called yet). Monitor:
   - `reconnectAttempts → 1`
   - `saveBackoffState({attempts:1})`
   - `countdownStop = showCountdownReconnect(...)` displays a "RECONNECTING" banner
   - `tryConnect()` (NOT awaited) fires
6. Now we have a phantom tryConnect that opens a WS, while the original `await waitForProducer` is still polling.
7. When the producer comes up (say `T≈12000` ms), `waitForProducer` resolves true and **line 446 fires a SECOND `await tryConnect()`**. At line 171, `receiver` may already point to the phantom (if its createWebRtcReceiver resolved). `receiver.stop()` tears down the working phantom connection, then a brand-new createWebRtcReceiver opens WS-B. This is **observable as "connect → instant disconnect → connect" flicker**, exactly matching the user's "heftige connect-Probleme" description.
8. If the phantom tryConnect was still mid-flight at line 446's entry (`receiver` still null in the closure), TWO concurrent WS handshakes from the same IP race; the server's h38 same-IP-stale guard at lines 250-255 destroys the older one. Either way, the user sees flicker.

This explains both reported symptoms:
- **"fails to connect"** → phantom's RPC `consume` may hit a `no-producer-yet` because the phantom races the producer; the phantom's catch retries with backoff while the original line-446 path is still waiting on waitForProducer.
- **"reconnects in a loop without ever stabilizing"** → on subsequent loops, line 446 keeps tearing down successful phantom connections.

This regression is purely a **call-ordering bug introduced by Phase 32 D-B5**. The baseline did not have it because tryConnect ran immediately after monitor setup, so the heartbeat WS was already open before the monitor's first tick at T+1000ms.

### 2.2 ★★ — `producer-ready` broadcast is dead-wired

The server emits the message but the receiver-webrtc-client does not listen for it. So the documented "WS fast-path" doesn't exist. This is **NOT the connection bug** (the polling path still works), but it explains why the WaitForProducer path takes the full pollIntervalMs to react to producer-up instead of being event-driven.

### 2.3 ★★ — `purgeStaleMediasoupWorker` could kill a sibling worker

Only relevant if the user runs two server instances concurrently or a process supervisor leaves a stale worker child during restart. Cannot reproduce from static analysis alone. The 200 ms grace period is enough for kernel cleanup. **Not ranked higher** because the user did not report multi-server runs.

### 2.4 ★ — backoff-state corruption

Already ruled out: `loadBackoffState` (lines 49-61) and `getBackoffDelay` (lines 38-42) both defend against Infinity/NaN/non-numeric values. Cannot produce an infinite setTimeout delay.

### 2.5 ★ — Xvfb `-fakescreenfps 60`

Affects the SSR-tab's render loop, not mediasoup transport / DTLS / ICE. Independent of the connection establishment pipeline. Already reverted from 120→60 in h3 with no observed change in connection behavior.

### 2.6 ★ — `showCountdownReconnect` blocking reconnect

The countdown's `setTimeout(tick, tickMs)` at line 150 of receiver-status-ui.js does NOT block the bootstrap's `setTimeout(tryConnect, delay)` at line 285 of receiver-bootstrap.js. They are independent timers. h1 already fixed the visibility-mechanism conflict.

---

## 3 — Proposed Fixes

### 3.1 Fix A — surgical (RECOMMENDED): start `tryConnect` BEFORE `waitForProducer`; let the monitor's natural retry cover the rare cold-boot race

**File:** `src/app/runtime/output-receiver/receiver-bootstrap.js`
**Change:** Remove the `await waitForProducer(...)` block (lines 432-444) and revert to the baseline's "tryConnect immediately, then let the catch-branch retry on no-producer-yet" pattern.

**Rationale:** The server's h19 hold (ssr-webrtc-signaling.mjs lines 478-496) ALREADY waits up to 8 s on the server side for the producer when the consumer issues `consume`. Adding a 60-s client-side gate on top of an 8-s server-side hold is redundant AND introduces the monitor-races-tryConnect bug above. The original Phase-31 stable behavior was: open WS → consume holds 8 s → producer up → consume succeeds.

**Patch (proposed):**

```javascript
// receiver-bootstrap.js — DELETE lines 432-444:
//   Phase 32 D-B5: producer-readiness gate. Best-effort 60s wait before
//   ...
//   try {
//     const producerReady = await waitForProducer({ maxWaitMs: 60000, pollIntervalMs: 1000 });
//     if (!producerReady) {
//       logger.warn("[receiver] waitForProducer timed out after 60s — entering retry loop anyway");
//     }
//   } catch (e) {
//     logger.warn("[receiver] waitForProducer threw:", e?.message);
//   }
//
// Keep line 446 unchanged: `await tryConnect();`
```

This brings tryConnect timing back to baseline: ~10 ms after bootstrap entry. The first heartbeat lands at ~1.5 s, well before the monitor's 8 s threshold.

**What this preserves:**
- `waitForProducer` export remains in place (tests in `phase-32-producer-ready.test.mjs` and `phase-32-cold-boot-reconnect-repro.test.mjs` continue passing — they only test the function in isolation).
- `/api/ssr/ready` endpoint stays available for diagnostics or future use.
- Forever-retry adaptive backoff schedule (D-B2) preserved.
- Countdown overlay (D-B3) preserved.
- `purgeStaleMediasoupWorker` (D-B4) preserved.
- `producer-ready` broadcast preserved (still dead, but not in our scope to fix here).
- Xvfb FPS lift (Block A) untouched.

**Risk assessment:** LOW. We are reverting to known-good Phase-31 behavior for ONE micro-step (the gate). The server's existing h19 hold already provides the cold-boot defense the gate was meant to add.

### 3.2 Fix B — alternative: keep waitForProducer, but DELAY monitor arming until after first tryConnect attempt

**File:** `src/app/runtime/output-receiver/receiver-bootstrap.js`
**Change:** Move `monitorInterval = setInterval(...)` from line 348 to AFTER `await tryConnect()` at line 446.

**Patch (proposed):**

```javascript
// Move the entire monitorInterval = setInterval(...) block (lines 348-430)
// to AFTER `await tryConnect();` at line 446.
//
// New ordering:
//   try { await waitForProducer(...); } catch (...) { ... }
//   await tryConnect();
//   monitorInterval = setInterval(...);   ← moved here
```

**What this preserves:** All Phase 32 D-B2/D-B3/D-B4/D-B5 behavior. Just reorders monitor arming.

**Risk assessment:** MEDIUM. The monitor catches subsequent disconnects after a successful initial connect — moving it does not affect that. But the test suite may have implicit ordering assumptions; needs the reconnect-backoff tests rerun.

### 3.3 Fix C — alternative: kick off `tryConnect` NON-AWAITED before waitForProducer; let the WS consume() do the holding

**File:** `src/app/runtime/output-receiver/receiver-bootstrap.js`
**Change:** at line 437 region:

```javascript
// Kick off the connect attempt immediately so the WS opens and heartbeats flow.
// The server's h19 hold (8s) gives the producer time to come up. If the consume
// times out, the catch branch retries with backoff. waitForProducer is now a
// pure observability hook (logs only).
const connectPromise = tryConnect();
try {
  const producerReady = await waitForProducer({ maxWaitMs: 60000, pollIntervalMs: 1000 });
  if (!producerReady) {
    logger.warn("[receiver] waitForProducer timed out after 60s — connect path will retry");
  }
} catch (e) {
  logger.warn("[receiver] waitForProducer threw:", e?.message);
}
await connectPromise;  // surface any thrown error from the original connect attempt
```

**Risk assessment:** MEDIUM-HIGH. Two concurrent async paths in flight; subtle interaction with backoff state. Fix A is cleaner.

### Recommendation: **Fix A.** Smallest blast radius, highest confidence in restoring stable connect.

---

## 4 — Test Strategy

### 4.1 Unit tests (no server boot required)

**Add a new test in `test/phase-32-cold-boot-reconnect-repro.test.mjs`** that proves the call-ordering invariant:

```javascript
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

test(
  "Phase 32 fix: tryConnect() must be called BEFORE the disconnect monitor's first tick",
  () => {
    const src = readFileSync(
      new URL("../src/app/runtime/output-receiver/receiver-bootstrap.js", import.meta.url),
      "utf8",
    );
    // The monitor's setInterval is armed; the first tryConnect (at top-level)
    // must come BEFORE any awaitable longer than DISCONNECT_THRESHOLD_MS (8s).
    const monitorIdx = src.indexOf("monitorInterval = setInterval");
    const tryConnectIdx = src.indexOf("await tryConnect()", monitorIdx);
    const waitForProducerIdx = src.indexOf("await waitForProducer", monitorIdx);
    assert.ok(monitorIdx !== -1, "monitorInterval setup must exist");
    assert.ok(tryConnectIdx !== -1, "await tryConnect must exist after monitor setup");
    if (waitForProducerIdx !== -1) {
      assert.ok(
        waitForProducerIdx > tryConnectIdx,
        "waitForProducer (if present) must NOT precede the top-level tryConnect — that creates an 8s+ gap during which the monitor phantom-fires",
      );
    }
  },
);
```

This is a static-analysis test — it reads the source file and asserts the ordering. Survives refactoring because it grep-locates the relevant identifiers.

### 4.2 Behavioral test (mocked time)

Extend `test/phase-32-cold-boot-reconnect-repro.test.mjs` with a fake-timer test that drives the bootstrap via mocks:

```javascript
test(
  "Phase 32 fix: monitor does NOT phantom-fire reconnect during the cold-boot pre-connect window",
  async () => {
    // Set up MockStorage, MockFetch, fake document. Drive bootReceiver in a
    // node:test environment where window/document are stubbed via globalThis.
    // Advance fake time past 8s while the server's "ready" mock returns 503.
    // Assert: at no point during the 0..8s window should the monitor have
    // called tryConnect (count via spy on tryConnect dispatch).
    // [Implementation deferred — requires DOM stubbing harness per
    //  test/phase-32-status-overlay.test.mjs pattern.]
  },
);
```

### 4.3 Manual server validation (after applying Fix A)

1. `pkill -f mediasoup-worker` to ensure clean state.
2. Start server with `SSR_RENDER_HOST=1 SSR_PUBLISH=1`. Wait for `[ssr-publisher] producer up` log.
3. Open `http://<server>:4173/output/` on the Pi. Watch the network tab and the diagnostic chip.
4. Expected:
   - Single `WS /api/webrtc/signal?role=consumer` connection.
   - `pc=connected` within 2-3 s.
   - No reconnect-banner flicker.
   - `attempts=0` in the chip.
5. Cold-boot worst case: kill the SSR Chromium tab manually (`pkill chromium`); refresh the Pi page IMMEDIATELY (server will relaunch the tab; Pi loads while producer is still down). Expect: countdown overlay shows "RECONNECTING" while the consume() server-side h19 hold waits, then connection succeeds within 8 s. NO double-connect-disconnect-connect flicker.

---

## 5 — Files / Lines Touched by Recommended Fix

Single-file edit:
- `/home/claw/tt-beamer/src/app/runtime/output-receiver/receiver-bootstrap.js` — delete lines 432-444 (the `await waitForProducer` try/catch block).

That's it. 13 lines deleted. No other Phase 32 code changes.

---

## RESEARCH COMPLETE

The Phase 32 connection regression has a single high-confidence root cause: in `receiver-bootstrap.js`, `waitForProducer({ maxWaitMs: 60000 })` was inserted between `monitorInterval = setInterval(...)` (line 348) and `await tryConnect()` (line 446). On a cold boot where the SSR Chromium tab takes longer than DISCONNECT_THRESHOLD_MS (8 s) to publish, the disconnect monitor's tick-7 evaluates `lastHeartbeatAtMs` (initialized at bootstrap-entry time) as stale — but `tryConnect` has not been called yet, so the only heartbeat source does not exist. The monitor's guard `reconnectAttempts === 0` is satisfied, so it phantom-fires `tryConnect()` at T+8s; meanwhile `await waitForProducer` continues polling and resolves later, at which point line 446's `await tryConnect()` tears down the working phantom connection. Net effect: connect → disconnect → reconnect flicker on every cold boot, exactly matching the user's report. The recommended fix is to delete the 13-line `await waitForProducer` block (Fix A), reverting tryConnect to baseline immediate-call timing while preserving every other Phase 32 change (forever-retry backoff, countdown overlay, producer-ready broadcast, mediasoup-worker purge, FPS lift). The server's existing h19 8-second consume-hold already provides the cold-boot defense the redundant client gate was trying to add.
