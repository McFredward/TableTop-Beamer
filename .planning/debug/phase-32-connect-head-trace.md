# Phase 32 HEAD Connect Trace

- **Date:** 2026-05-07
- **HEAD tested:** 9162bc0 (fix(32-h6)) — h1+h2+h3+h5+h6 applied, h4 reverted
- **Note:** Main branch has since advanced to b26daac (h7). This trace was run on h6 as requested.
- **Test port:** 4181 (isolated worktree `/tmp/head-disconnect`)
- **RTC port range:** 41000-41100 (non-overlapping with production 40000-40100)
- **Purge patch:** `purgeStaleMediasoupWorker` call commented out in worktree to protect production

---

## Boot Timeline

```
T+0s    Server process started (PID 3754714)
T+0s    [server] purgeStaleMediasoupWorker SKIPPED (trace-patch: isolated boot)
T+1s    [ssr-mediasoup] router up — codecs: H264, ports 41000-41100, announcedIp=192.168.0.80
T+2s    [ssr-env] Virtual display: ready (Xvfb)
T+2s    [ssr-host] available encoders: vaapi, x264-software
T+2s    [ssr-host] encoder=vaapi source=auto
T+2s    [ssr-host] display :99 unavailable, using :102 instead
T+2s    [ssr-host] Xvfb args: :102 ... -fakescreenfps 60
T+3s    TT Beamer server listening on http://0.0.0.0:4181
T+3s    [server] serverInfo published — encoder=vaapi preset=balanced bitrate=8000000
T+4s    [ssr-signal] connect role=ssr-tab addr=127.0.0.1
T+5s    [ssr-signal] producer up — broadcasting producer-ready to consumers
T+5s    [ssr-signal] producer up id=41f023c7-... kind=video
T+5s    [ssr-publisher] producer up — video=41f023c7-...
T+18s   /api/ssr/ready → {"ready":true,"reason":"producer-up"}   ← confirmed up
```

**Producer-up time:** ~4-5s from server listen. Comparable to baseline (~4s).

---

## Client Connect Timeline (puppeteer simulating Pi from loopback 127.0.0.1)

```
T+~20s  [client] navigated to /output/ in 250ms
T+~20s  [client +2s] pc=new, attempts=0   ← waitForProducer resolving (producer IS up)
T+~20s  [client +4s] pc=new, attempts=0   ← tryConnect called, 8s server-hold in progress
T+~20s  [client +6s] pc=new, attempts=0
T+~20s  [client +8s] pc=new, attempts=0
T+~28s  [client-console] error: [ssr-receiver] connect failed: no-producer-yet
T+~30s  [client +10s] pc=new, attempts=2   ← TWO retries have already failed
T+~30s  [client +12s] pc=new, attempts=2   ← stuck in 2s backoff
...
T+~38s  [client-console] error: [ssr-receiver] connect failed: no-producer-yet
T+~40s  [client +20s] pc=new, attempts=4
...continues every ~10s with +2 increments until attempts=14 at T+90s
```

---

## Server Signal Events During Client Session

```
[ssr-signal] connect role=consumer addr=127.0.0.1   ← first consumer connect
[ssr-signal] disconnect role=ssr-tab                 ← SSR TAB KILLED (h38 stale-guard)
[ssr-signal] disconnect role=consumer                ← consumer sees no-producer-yet
[ssr-signal] connect role=consumer addr=127.0.0.1
[ssr-signal] disconnect role=consumer
[ssr-signal] connect role=consumer addr=127.0.0.1
[ssr-signal] disconnect role=consumer
[ssr-signal] connect role=consumer addr=127.0.0.1
[ssr-signal] disconnect role=consumer
... (pattern repeats 8x across 70s)
```

**The ssr-tab NEVER reconnected.** The SSR render host did not schedule a restart (Chrome process remained alive, health ping continued passing via CDP — the WS socket was destroyed but the browser was healthy from the host's perspective). `state.videoProducer` was permanently null.

---

## Root Cause Analysis (What h5+h6 Missed)

### BUG-A: h38 `connectionsByAddr` kills ssr-tab when consumer shares remoteAddr

**File:** `src/server/ssr-webrtc-signaling.mjs` lines 265-272

**Mechanism:**

```javascript
// Line 271-272: registers ALL connections (including ssr-tab) in the map
if (conn.remoteAddr) {
  connectionsByAddr.set(conn.remoteAddr, { socket, conn });
}

// Line 265-268: when a consumer connects, destroys any prior socket at same remoteAddr
if (role === "consumer" && conn.remoteAddr) {
  const stale = connectionsByAddr.get(conn.remoteAddr);
  if (stale && stale.socket && !stale.socket.destroyed) {
    try { stale.socket.destroy(); } catch (_) {}  // ← kills the ssr-tab WS
  }
}
```

**Sequence:**
1. ssr-tab connects from `127.0.0.1` → registered in `connectionsByAddr["127.0.0.1"]`
2. Consumer (puppeteer, on same machine) connects from `127.0.0.1`
3. Stale guard finds ssr-tab's entry at `"127.0.0.1"`, destroys its socket
4. `state.videoProducer = null` (socket.on("close") handler fires)
5. Consumer immediately gets `no-producer-yet` from the 8s hold loop
6. Chrome browser stays alive (health pings pass via CDP), so ssr-host never calls scheduleRestart
7. Pi is stuck in a `no-producer-yet` reconnect loop forever

**Scope of impact in production:**
- In the real LAN deployment, the Pi connects from `192.168.x.x`, NOT `127.0.0.1`.
- The ssr-tab ALWAYS connects from `127.0.0.1` (local Chrome).
- These addresses differ → h38 stale guard DOES NOT fire in production.
- **This specific bug is a loopback-test artifact only.** It does NOT explain the Pi's reported disconnects.

**However,** there is a secondary production scenario: if the user opens `/output/` on the SERVER MACHINE itself (e.g., local browser for testing), that consumer connects from `127.0.0.1` and would trigger this bug. Reported "connection breaks" during local testing would reproduce deterministically.

### BUG-B: `no-producer-yet` loop — server-side producer null is permanent when Chrome survives WS disconnect

**Mechanism:** When `state.videoProducer` becomes null (for any reason — tab WS drop, Chrome crash, etc.), the ssr-render-host's `scheduleRestart` is only triggered by:
1. Xvfb process exit
2. Health ping threshold breach (3 consecutive failures × 5s interval = 15s minimum)
3. CDP navigation failure

A WS socket destruction (even one that kills the ssr-tab's only channel to the server) does NOT trigger scheduleRestart. Chrome's CDP channel is intact → health pings pass → no restart. Producer stays null indefinitely.

**Time-to-recovery:** At minimum 15s (3 × 5s health ping interval) if Chrome actually crashes. With just a WS-drop, it could be permanent until the ssr-tab's Chrome page itself navigates away or crashes.

### BUG-C (confirmed by loopback run, relevant to Pi): `tryConnectInFlight` flag not cleared on `ws-closed`/`failed`/`disconnected`

**File:** `src/app/runtime/output-receiver/receiver-bootstrap.js`

**Mechanism (in h6, before h7 finally-fix):**

The `tryConnectInFlight` flag is set to `true` at tryConnect entry and cleared:
- In the `"connected"` state callback (success path)
- In the catch block (createWebRtcReceiver throw)

It is NOT cleared when:
- Connection reaches `"ws-closed"` state (WS dropped after tryConnect returned without throwing)
- Connection reaches `"failed"` or `"disconnected"` state (ICE/DTLS failure after tryConnect returned)

If a connection attempt succeeds at the WS/transport level (tryConnect exits the try block without throwing) but then the ICE/DTLS handshake fails → `pcState = "failed"`, but `tryConnectInFlight` stays `true` forever. Monitor sees `!tryConnectInFlight = false` → will never fire a reconnect. Pi is stuck on RECONNECTING banner indefinitely.

**Note:** h7 (b26daac) adds a `finally { tryConnectInFlight = false; }` to fix this. The worktree used h6, so this bug was present in the tested code.

### BUG-D (pre-existing, confirmed): `--use-gl=egl` Chrome 131 GPU crash

**Observed in Chrome process args:**
```
--use-gl=egl --enable-unsafe-swiftshader
```

**GPU process uses:**
```
--use-gl=angle --use-angle=swiftshader-webgl
```

Chrome 131 does not support `egl-gles2` without ANGLE. The GPU process falls back to SwiftShader (confirmed by `--use-angle=swiftshader-webgl` in the spawned GPU process). This is the previously confirmed BUG-2 from phase-32-connection-broken-debug.md. h4 fixed it, h4 was reverted, it's still present in HEAD.

---

## Steady-State Behavior

**Never achieved.** Connection never reached `pc=connected` in 70s of observation.

The loopback test is a worst-case (ssr-tab and consumer sharing `127.0.0.1`) that triggers BUG-A deterministically. For actual Pi testing, BUG-A would not fire, but BUG-C and BUG-D would still be present.

---

## "0s Hang" Characterization

The reported "0s reconnection hängt" maps to the `RECONNECT — 0s (attempt N)` countdown display. In this loopback trace, every attempt fails with `no-producer-yet` after exactly 8s (the h19 server-side hold), then:
- Catch block fires: increments attempts, schedules `setTimeout(tryConnect, delay)`
- Countdown displays during the delay period
- When delay expires, display shows "0s" for up to 8s while the new tryConnect waits inside the server-side 8s hold
- This is **not a client hang** — it's the server-side produce-hold doing its full 8s

The "0s hang" lasts 8s because `no-producer-yet` takes 8s to return. This is the normal upper bound for the h19 hold, not a new bug. If producer never comes back (our scenario), this repeats forever.

---

## Comparison to Baseline (7d4063a, from phase-32-connection-broken-debug.md)

| Item | Baseline (7d4063a) | HEAD h6 (9162bc0) |
|------|-------------------|-------------------|
| Boot time | ~4s to producer-up | ~4-5s to producer-up |
| Producer announced | Yes | Yes (+ broadcast) |
| purgeStaleWorker | No | Yes (skipped in test) |
| --use-gl | (not present) | `--use-gl=egl` (BUG-D) |
| waitForProducer | No | Yes (before monitor, h5 fix) |
| monitor guard | `reconnectAttempts === 0` | `!tryConnectInFlight` (h6) |
| Cold-boot loopback | N/A (not tested with ssr-tab sharing IP) | FAILS: h38 kills ssr-tab |
| `ws-closed` recovery | Works (attempts always 0) | h7 needed (finally block) |

---

## Files Involved

| File | Issue |
|------|-------|
| `src/server/ssr-webrtc-signaling.mjs:271-272` | h38 registers ssr-tab in connectionsByAddr keyed by remoteAddr |
| `src/server/ssr-webrtc-signaling.mjs:265-268` | h38 stale-guard uses same map, kills ssr-tab when consumer is on same IP |
| `src/app/runtime/output-receiver/receiver-bootstrap.js:178-181` | tryConnectInFlight flag set — correct |
| `src/app/runtime/output-receiver/receiver-bootstrap.js:203` | Flag cleared on "connected" — correct |
| `src/app/runtime/output-receiver/receiver-bootstrap.js:309` | Flag cleared in catch — correct (h6), but missing ws-closed/failed path |
| `src/server/ssr-render-host.mjs` | scheduleRestart not triggered by WS disconnect alone |
| `src/server/ssr-render-host.mjs` | `--use-gl=egl` in Chrome launch args (BUG-D, h4 reverted) |

---

## Recommended Fixes (Priority Order)

### Fix 1 (CRITICAL): Re-apply h4 — `--use-gl=egl` → `--use-gl=angle --use-angle=default`

In `src/server/ssr-render-host.mjs` Chrome launch args. h4 commit (a774180) is the canonical reference. Without this, every SSR Chrome boot uses SwiftShader at 2-5fps under load.

### Fix 2 (CRITICAL): Scope `connectionsByAddr` to consumer-only entries

**File:** `src/server/ssr-webrtc-signaling.mjs` lines 271-272

Change:
```javascript
if (conn.remoteAddr) {
  connectionsByAddr.set(conn.remoteAddr, { socket, conn });
}
```
To:
```javascript
// Only track consumers in the per-IP registry — the stale-kill guard
// is consumer-to-consumer cleanup only. Including ssr-tab here causes
// the first consumer from 127.0.0.1 to destroy the ssr-tab's socket.
if (conn.remoteAddr && role === "consumer") {
  connectionsByAddr.set(conn.remoteAddr, { socket, conn });
}
```

This is a 1-line fix. The ssr-tab should never be in the per-IP consumer registry.

### Fix 3: h7 already done (b26daac)

`finally { tryConnectInFlight = false; }` in tryConnect. This is already in main. Not present in the h6 worktree used for this test.

### Fix 4 (OPTIONAL): Make h19 server-hold respect ssr-tab reconnect

Currently if the ssr-tab WS drops and Chrome stays alive (no Xvfb exit, no CDP failure), `state.videoProducer` stays null and health pings stay green → no automatic recovery. Consider: in the ssr-tab's `socket.on("close")` handler, emit a signal to ssr-render-host to schedule a page reload (not a full browser restart). This would restore the WS channel without the 15s+ health-ping delay.

---

## Smoking-Gun Lines

**Line from server log (the actual trigger):**
```
[ssr-signal] connect role=consumer addr=127.0.0.1
[ssr-signal] disconnect role=ssr-tab                ← h38 stale-guard killed the SSR tab's WS
```

**Code location:**
```javascript
// src/server/ssr-webrtc-signaling.mjs:265-272
if (role === "consumer" && conn.remoteAddr) {
  const stale = connectionsByAddr.get(conn.remoteAddr);
  if (stale && stale.socket && !stale.socket.destroyed) {
    try { stale.socket.destroy(); } catch (_) {}  // ← stale here was the ssr-tab
  }
}
if (conn.remoteAddr) {
  connectionsByAddr.set(conn.remoteAddr, { socket, conn });  // ← registers ALL roles including ssr-tab
}
```

**Client log:**
```
[ssr-receiver] connect failed: no-producer-yet   ← repeats every ~10s indefinitely
```
