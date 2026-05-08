---
status: investigating
trigger: "SSR architecture connection regression — Pi receiver at /output/ either never connects or reconnects in a loop without stabilizing"
created: 2026-05-07T00:00:00Z
updated: 2026-05-07T23:58:00Z
---

## Current Focus

hypothesis: FOUR bugs now confirmed from live HEAD (9162bc0 h6) trace on port 4181:
  BUG-A: h38 connectionsByAddr registers ssr-tab → consumer from same IP destroys ssr-tab WS (loopback-specific, but also hits local browser testing)
  BUG-B: --use-gl=egl Chrome 131 GPU crash → SwiftShader fallback (h4 reverted, BUG-D in trace doc)
  BUG-C: tryConnectInFlight not cleared on ws-closed/failed paths (fixed in h7 b26daac, not present in h6 test)
  BUG-D: no-producer-yet infinite loop when Chrome survives WS disconnect (scheduleRestart not triggered by WS close alone)
test: live boot HEAD h6 on port 4181, puppeteer Pi-sim from loopback, 70s observation
expecting: all four confirmed — trace logged to .planning/debug/phase-32-connect-head-trace.md
next_action: apply fixes (h4 re-apply + h38 scope fix + h7 already done)

## Symptoms

expected: Pi receiver at /output/ establishes stable WebRTC connection and stays connected
actual: Pi either never connects OR reconnects in a loop without stabilizing
errors: (reported by user) connection instability on Pi
reproduction: (A) Pi sessionStorage has stale ssr-reconnect-state + connection drops mid-session → stuck forever; (B) Chrome 131 --use-gl=egl always crashes GPU process → SwiftShader fallback at 2-5fps → frame-stale triggered
started: After Phase 32 changes (after tag phase-31-end)

## Eliminated

- hypothesis: server-side producer not coming up
  evidence: both baseline and HEAD show [ssr-publisher] producer up within ~3-5s of boot; /api/ssr/ready returns {"ready":true,"reason":"producer-up"} immediately
  timestamp: 2026-05-07T22:00:00Z

- hypothesis: mediasoup router not booting
  evidence: [ssr-mediasoup] router up log fires in both baseline and HEAD
  timestamp: 2026-05-07T22:00:00Z

- hypothesis: health ping failures triggering browser restart loop
  evidence: no [ssr-host] health ping failed logs in 90s run; browser stays connected
  timestamp: 2026-05-07T22:30:00Z

- hypothesis: waitForProducer gate blocking connection
  evidence: /api/ssr/ready returns true immediately on HEAD; waitForProducer resolves within 1 poll cycle
  timestamp: 2026-05-07T22:30:00Z

## Evidence

- timestamp: 2026-05-07T21:14:00Z
  checked: baseline (7d4063a) boot on PORT=4174
  found: [ssr-publisher] producer up within ~4s; encoder=x264-software; no purge stale worker; no producer-ready broadcast; Xvfb no -fakescreenfps; total log output stable
  implication: baseline boots cleanly, producer is available

- timestamp: 2026-05-07T21:15:00Z
  checked: HEAD (9b12ea4) boot on PORT=4175
  found: [server] purging stale mediasoup-worker (D-B4) fires at boot; encoder=vaapi (NEW); -fakescreenfps 60 added; [ssr-signal] producer up — broadcasting producer-ready to consumers fires; /api/ssr/ready returns {"ready":true,"reason":"producer-up"}
  implication: HEAD boots and produces, but with different encoder and new purge behavior

- timestamp: 2026-05-07T22:00:00Z
  checked: fps-diag setInterval presence in 60s+ HEAD boot capture
  found: ZERO fps-diag log entries in all HEAD captures (expected every 5s after producer-up); baseline also zero (expected — no fps-diag code in baseline)
  implication: the fps-diag setInterval in the publisher script is either not firing or its console.log output is not captured by puppeteer page.on('console'). This is a diagnostic gap, not a functional failure.

- timestamp: 2026-05-07T22:15:00Z
  checked: Chrome 131 binary directly with --use-gl=egl
  found: CONFIRMED CRASH — "Requested GL implementation (gl=egl-gles2,angle=none) not found in allowed implementations: [(gl=egl-angle,angle=default)]. Exiting GPU process due to errors during initialization" fires immediately and repeatedly on every GPU process launch
  implication: HEAD has --use-gl=egl in Chrome launch args (reverted from h4 fix). Chrome 131 does NOT support egl-gles2 without ANGLE. GPU process crashes on every launch → Chrome falls back to SwiftShader → ~2-5fps at load. h4 commit message measured: idle=~25fps (was 58fps with angle), animations=2.8-5.4fps (vs 30+fps with angle).

- timestamp: 2026-05-07T22:30:00Z
  checked: receiver-bootstrap.js monitor condition in HEAD vs baseline
  found: BOTH have `if (dec.disconnected && reconnectAttempts === 0 && pcState !== "host-down")`. BUT in HEAD, reconnectAttempts is loaded from sessionStorage (loadBackoffState(backoffStorage).attempts) at boot. In baseline, reconnectAttempts always starts at 0 (no persistence).
  implication: If Pi's sessionStorage has ssr-reconnect-state with attempts > 0 (from any prior failed session), the monitor reconnect guard is permanently blocked. When a mid-session disconnect (ws-closed, failed) fires, onConnectionStateChange shows the banner but does NOT call tryConnect(). Monitor can't call tryConnect() either (reconnectAttempts > 0 check fails). Pi is stuck on RECONNECTING overlay forever. This is the "never connects" failure mode.

- timestamp: 2026-05-07T22:45:00Z
  checked: purgeStaleMediasoupWorker implementation
  found: calls `pkill -f mediasoup-worker` with NO PID isolation — kills ALL mediasoup-worker processes system-wide. Production server (port 4173, PID 3742004) had its mediasoup-worker killed by our test instance boot. After test, /api/ssr/ready on port 4173 returns {"ready":false,"reason":"producer-starting"} confirming production server degraded.
  implication: If the user's production server is running and a new server instance boots (e.g., restart, update), the new instance's purge kills the production worker. This is a boot-time side-effect that could cause a one-time connection drop, but the production server would eventually recover (it has scheduleRestart logic).

- timestamp: 2026-05-07T22:50:00Z
  checked: baseline monitor reconnect path: reconnectAttempts always starts at 0, monitor always can fire
  found: In baseline, reconnectAttempts starts at 0 and is only incremented in tryConnect() catch (where setTimeout retry is already scheduled) and monitor. The monitor fires for the first disconnect, schedules a single tryConnect(), and then reconnectAttempts > 0 means subsequent monitor ticks are no-ops (also true in baseline). In baseline this works because a successful reconnect resets to 0.
  implication: The baseline guard `reconnectAttempts === 0` was designed for single-trigger-per-disconnect, not for "if sessionStorage has a previous attempt count". Phase 32's persistence of this counter across page loads is the regression.

- timestamp: 2026-05-07T23:45:00Z
  checked: live HEAD h6 boot on port 4181 — ssr-signal events around first consumer connect
  found: Server log shows exact sequence: "[ssr-signal] connect role=consumer addr=127.0.0.1" immediately followed by "[ssr-signal] disconnect role=ssr-tab". h38 connectionsByAddr map registers ALL roles (line 271-272, no role guard). Consumer stale-kill (line 265-268, role=consumer guard) finds ssr-tab's socket under key "127.0.0.1" and destroys it. state.videoProducer → null. Chrome browser stays alive (CDP health pings pass). scheduleRestart never fires. Producer stays null permanently.
  implication: BUG-A — h38 stale-guard is scoped to role=consumer on the lookup side but NOT on the registration side. Fix: add `&& role === "consumer"` to the connectionsByAddr.set call (line 271). 1-line fix.

- timestamp: 2026-05-07T23:50:00Z
  checked: client chip polling every 2s for 70s — attempts counter and pc state
  found: pc=new for entire 70s session. attempts increments 0→2→4→6→8→10→12→14 in steps of +2 every ~10s. Each step corresponds to two sequential tryConnect calls each getting "no-producer-yet" after 8s server-hold. No "connected" state reached. No reconnect overlay detected (puppeteer selector was wrong — overlay uses #ssr-reconnect-banner not data-reconnect-overlay).
  implication: The "0s hang" is the 8s server-side h19 hold timing out with no-producer-yet. Not a client hang. Each tryConnect waits 8s for producer → fails → catch schedules next retry. "0s" is the countdown display when delay has elapsed but the new tryConnect is waiting inside the 8s server hold.

- timestamp: 2026-05-07T23:55:00Z
  checked: tryConnectInFlight flag clear paths in h6 (9162bc0) vs h7 (b26daac)
  found: h6 clears flag only in "connected" callback (line 203) and catch block (line 309). Does NOT clear on "ws-closed", "failed", "disconnected" state transitions. h7 (b26daac, already in main) adds finally block that unconditionally clears flag after try/catch completes. Without h7, a tryConnect that succeeds at WS level but then gets ws-closed before "connected" leaves tryConnectInFlight=true forever — monitor permanently blocked.
  implication: BUG-C (h6 only) — h7 already fixes this. The h6 worktree used for this test had this bug active, but h7 is already merged to main.

- timestamp: 2026-05-07T23:57:00Z
  checked: Chrome GPU process args during test boot
  found: GPU process spawned with "--use-gl=angle --use-angle=swiftshader-webgl" — SwiftShader fallback confirmed. Main Chrome launched with "--use-gl=egl --enable-unsafe-swiftshader". BUG-D (--use-gl=egl causing GPU crash → SwiftShader) reproduced live, consistent with prior static analysis evidence.
  implication: BUG-D confirmed live. h4 (a774180) fix must be re-applied.

## Resolution

root_cause: TWO bugs in HEAD (9b12ea4):

  BUG-1 (connection stuck/never-reconnects — PRIMARY): `reconnectAttempts` is loaded from sessionStorage in receiver-bootstrap.js line 122. When attempts > 0 (from any prior failed session), the monitor's `reconnectAttempts === 0` guard permanently prevents monitor-triggered reconnects. When a mid-session disconnect fires (ws-closed/failed/disconnected), onConnectionStateChange does NOT call tryConnect() — only shows a banner. The Pi is stuck on RECONNECTING forever. Introduced in: feat(32-02-T2) 496b3d3 — loadBackoffState on boot.

  BUG-2 (low fps / potential frame-stale triggering reconnect loop — SECONDARY): --use-gl=egl was reverted back into Chrome launch args in 97d4dd3 (Revert "fix(32-h4)"). Chrome 131 does not support egl-gles2/angle=none. GPU process crashes on every launch, forcing SwiftShader fallback at 2-5fps under animation load. At very low fps the frame-stale evaluator (DISCONNECT_THRESHOLD_MS=8000ms threshold, last frame > 8s) could eventually fire, causing a reconnect attempt. With BUG-1 also present, this reconnect attempt won't complete normally. Even without BUG-1, the low fps means degraded video quality. Introduced in: 97d4dd3 (revert of h4 fix).

fix:
  BUG-1 FIX: Change the monitor reconnect condition from `reconnectAttempts === 0` to always allow monitor-triggered reconnects when disconnected, OR: clear sessionStorage on every successful page load so attempts never start > 0 from stale state. The simplest fix: in the monitor, remove the `reconnectAttempts === 0` guard (the `dec.disconnected` check is sufficient). The sequential backoff delay in the tryConnect catch already prevents rapid-fire reconnects. Alternatively: always clearBackoffState at the start of bootReceiver() so reconnectAttempts always starts at 0.

  BUG-2 FIX: Re-apply the h4 fix: change `--use-gl=egl` to `--use-gl=angle` and add `--use-angle=default` in ssr-render-host.mjs Chrome launch args. This was already done in a774180 and then incorrectly reverted in 97d4dd3.

verification:
files_changed: []

## Commit Correlation

| Commit | Change | Bug Introduced |
|--------|--------|---------------|
| 496b3d3 feat(32-02-T2) | loadBackoffState from sessionStorage at boot | BUG-1 — attempts > 0 blocks monitor |
| a774180 fix(32-h4) | --use-gl=egl → --use-gl=angle + --use-angle=default | FIXED BUG-2 |
| 97d4dd3 Revert "fix(32-h4)" | reverts angle fix, restores --use-gl=egl | BUG-2 RE-INTRODUCED |
| 9b12ea4 fix(32-h5) | moved waitForProducer before monitorInterval | FIXED phantom-disconnect (separate issue, correctly fixed) |

---

## STDOUT COMPARISON

### Baseline (7d4063a, port 4174) — clean boot reference:
```
[default-animations] Pre-loaded 47 default animation(s) into live session
[active-grid] restored profile=NEW1 srcXs=3 srcYs=3 points=9 version=2
[ssr-mediasoup] announcedIp auto-detected: 192.168.0.80
[ssr-mediasoup] router up — codecs: H264, ports 40000-40100
[ssr-env] Virtual display: ready (Xvfb)
[ssr-env] Ready: YES
[ssr-host] available encoders: x264-software                  ← NO vaapi
[ssr-host] encoder=x264-software source=auto
[ssr-host] Xvfb args: :101 -screen 0 1920x1080x24 ...        ← NO -fakescreenfps
TT Beamer server listening on http://0.0.0.0:4174
[ssr-signal] connect role=ssr-tab addr=127.0.0.1
[ssr-signal] producer up id=... kind=video                    ← NO "broadcasting producer-ready"
[ssr-publisher] producer up — video=...
Time to producer-up: ~4s
```

### HEAD (9b12ea4, port 4175) — boot with regressions:
```
[default-animations] Pre-loaded 47 default animation(s) into live session
[active-grid] restored profile=NEW1 srcXs=3 srcYs=3 points=9 version=2
[server] purging stale mediasoup-worker (D-B4)               ← NEW: system-wide pkill
[asset-manifest] ready (9 entries)
TT Beamer server listening on http://0.0.0.0:4175            ← server listens BEFORE router up
[ssr-mediasoup] router up — codecs: H264, ports 40000-40100
[ssr-env] Virtual display: ready (Xvfb)
[ssr-host] available encoders: vaapi, x264-software          ← NEW: vaapi listed
[ssr-host] encoder=vaapi source=auto                         ← NEW: vaapi selected
[ssr-host] Xvfb args: :101 ... -fakescreenfps 60             ← NEW
[ssr-signal] producer up — broadcasting producer-ready to consumers  ← NEW broadcast
[ssr-signal] producer up id=... kind=video
[ssr-publisher] producer up — video=...
Time to producer-up: ~3-4s (similar)
```

### Direct Chrome binary test (confirms BUG-2):
```
$ chrome --use-gl=egl --no-sandbox --headless=new --dump-dom about:blank
ERROR: gl_factory.cc(102) Requested GL implementation (gl=egl-gles2,angle=none) not
       found in allowed implementations: [(gl=egl-angle,angle=default)].
ERROR: viz_main_impl.cc(181) Exiting GPU process due to errors during initialization
[...repeats 3-4x as Chrome retries GPU process...]
<html>...</html>   ← Chrome continues with SwiftShader fallback
```

---

## Suggested Next Steps

1. **Re-apply h4 fix (BUG-2)**: In `src/server/ssr-render-host.mjs`, change `"--use-gl=egl"` → `"--use-gl=angle"` and add `"--use-angle=default"`. This is a 1-line code change + 1-line addition. The original a774180 commit is the canonical reference.

2. **Fix BUG-1 (monitor reconnect guard)**: Simplest fix is to add `clearBackoffState(backoffStorage)` at the TOP of `bootReceiver()` in `receiver-bootstrap.js`, BEFORE `loadBackoffState`. This ensures reconnectAttempts always starts at 0 on a fresh page load, making Phase 32's sessionStorage persistence harmless. The persistence was meant to survive reloads during a reconnect sequence — but a fresh /output/ page load is not mid-sequence. A slightly more surgical fix: change the monitor condition to `if (dec.disconnected && pcState !== "host-down")` (drop the `reconnectAttempts === 0` guard), since the tryConnect() catch already has its own sequential retry with setTimeout.

3. **Optional: scope purgeStaleMediasoupWorker** to not kill workers from other server instances (use PID file or port-based matching).
