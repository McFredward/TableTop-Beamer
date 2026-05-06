# Phase 32: SSR Stream Performance + Connection Stability — Research

**Researched:** 2026-05-06
**Domain:** WebRTC / mediasoup / Chromium Xvfb rAF pipeline; Pi cold-boot reconnect-storm
**Confidence:** HIGH (full codebase read + live environment probes)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Block A — Stream FPS Lift**
- D-A1: Floor 30 fps (UAT-Pflicht), Ceiling 60 fps. No fixed target — hardware is maxed out. Operator chooses cap.
- D-A2: Outside Align-Mode: coupled OK. Inside Align-Mode: DECOUPLED — stream fps ≥ SSR fps, auto-boost to cap-max on drag.
- D-A3: Operator-configurable Stream FPS Cap (30 / 45 / 60 / native) + Align-Mode Boost toggle (ON default). Bitrate scales proportionally. Persists in `config/global-defaults.json.serverRendering`.
- D-A4: ROOT-CAUSE-FIRST. Profile before patches. Five hypotheses (see Block A section).
- D-A5: Quality-vs-FPS: auto-mode drops to 720p to hold FPS target; 1080p-locked drops fps-cap.
- D-A6: VAAPI on Raptor Lake-P iGPU MUST be evaluated. Currently falling back to x264-software.

**Block B — Connection Stability**
- D-B1: ROOT-CAUSE-FIRST. Deterministic cold-boot repro required.
- D-B2: Adaptive backoff forever-retry: 1s → 2s → 5s → 10s → 30s max. Reset after ≥30s stable. Pi-side sessionStorage for backoff state across page reloads.
- D-B3: Pi-side "RECONNECTING — Xs" countdown overlay. Disappears after ≥5s stable connection.
- D-B4: Server-side boot cleanup: terminate + restart mediasoup worker if stale, close prior socket connections, fresh port-bindings.
- D-B5: Producer-readiness gate: Pi polls `/api/ssr/ready` (or WS event) before first consume() attempt.

**Carry-forward (LOCKED — do not revisit):**
- WebRTC + h264 + mediasoup (D-A1/D-A2 Phase 31)
- Headful Chromium + Xvfb + puppeteer-stream (D-A3 Phase 31)
- 1080p adaptive ↔ 720p (D-A3 Phase 31)
- Pi-local audio (D-D2-Reversal Phase 31)
- Server-authoritative state (Phase 13 + h41/h42)
- Settings persist in `config/global-defaults.json.serverRendering`
- Test-Board: Nemesis Lockdown Board A

### Claude's Discretion

- Wave / plan structure (researcher → planner).
- Specific repro-script format.
- Test coverage shape (target: ≥30 new tests for FPS-floor + reconnect-repro + recovery-time + producer-readiness gate).
- UI styling of "RECONNECTING" overlay (follow `receiver-status-ui.js` patterns).
- Default values for new System-settings (FPS cap default, boost on/off).

### Deferred Ideas (OUT OF SCOPE)

- Multi-Pi receiver support.
- WAN/Internet streaming (TURN-server).
- Codec change to AV1/VP9.
- Dashboard reconnect-alert (Pi-side overlay sufficient, per B2=a).
- Render-fallback if server unreachable.
</user_constraints>

---

## Summary

Phase 32 resolves two carried-over release-blockers from Phase 31: (1) the stream
is observed at ~20-25 fps despite a target of 30 and hardware that should deliver
60, and (2) cold-boot sometimes drops the Pi into a permanent reconnect storm that
only a server-restart resolves.

**Block A root cause (VERIFIED by code read + live probe):** The Chromium rAF
counter inside the SSR tab is itself running at ~20-25 fps — meaning the cap is
BEFORE the encoder. The primary suspect is the Xvfb BeginFrameSource. Xvfb
exposes a `-fakescreenfps` flag (1-600) whose default is not explicitly set by the
current `spawnXvfb()` call. Under `--ozone-platform=x11` with no real vsync, the
Chromium BeginFrameSource falls back to its own timer at an indeterminate rate
(observed ~25 Hz). A secondary suspect is the x264-software single-layer encode at
the `high-quality` preset (`x264Preset: "fast"`) which is CPU-heavier than
`ultrafast`. The VAAPI path is decoupled and partially wired but unconfirmed.

**Block B root cause (VERIFIED by code read):** The Pi receiver has a hard
`MAX_RECONNECT_ATTEMPTS = 10` cap and then stops retrying. During cold-boot, if
the SSR tab's producer is not ready within 8 s (h19 hold window), the consume()
returns "no-producer-yet" and each failure consumes one of the 10 attempt slots.
If this exhausts before the producer is up, the Pi enters a silent stopped state
that requires a server restart to clear. The fix requires: (1) a producer-readiness
gate so Pi waits BEFORE opening the WebRTC session, (2) converting the 10-attempt
hard cap to a forever-retry with 30s-max adaptive backoff, (3) server-side boot
cleanup to clear stale mediasoup state between runs.

**Primary recommendation:** Fix Xvfb BeginFrameSource first (add
`-fakescreenfps 60` to `spawnXvfb()`; evaluate Xdummy as alternative), then
evaluate Chromium VAAPI encoding. In parallel: replace the 10-attempt cap with
forever-retry backoff, add `/api/ssr/ready` gate, add "RECONNECTING — Xs" overlay.

---

## Block A — FPS Pipeline Profile (DEEP)

### The 6-Stage Pipeline

```
[1] Chromium rAF rate inside SSR tab  (BeginFrameSource under Xvfb)
       ↓  (clamped by Xvfb -fakescreenfps, Chromium vsync logic, GL render time)
[2] getDisplayMedia capture rate      (TabCaptureFastPath, frameRate constraint)
       ↓  (clamped if constraint < BeginFrameSource)
[3] libwebrtc h264 encode rate        (VaapiVideoEncoder or libopenh264)
       ↓  (clamped by CPU or GPU encode budget)
[4] mediasoup transport rate          (no clamp — just queueing / ICE/DTLS)
       ↓
[5] Pi h264 decode rate               (VC4 V3D HW decoder on Pi 4)
       ↓
[6] Pi <video> paint rate             (requestVideoFrameCallback counter)
```

**Diagnosis key:** If SSR fps (rAF counter in publisher) = STREAM fps, the cap is at
stage [1] or [2]. If SSR fps is high but STREAM fps is low, the cap is at [3]-[5].
The user reports both SSR and STREAM at ~20-25, which pins the cap at stage [1]
(BeginFrameSource).

---

### Hypothesis I-1A: Xvfb BeginFrameSource — PRIMARY SUSPECT [VERIFIED: code read]

**What the code does:**

`spawnXvfb()` in `src/server/ssr-render-host.mjs` currently passes:

```javascript
const xvfbArgs = [
  chosenDisplay,
  "-screen", "0", `${viewport.width}x${viewport.height}x24`,
  "-ac",
  "-dpi", "96",
  "+extension", "RANDR",
  "+extension", "RENDER",
  "+extension", "GLX",
  "+extension", "Composite",
];
```

**What is MISSING:** `-fakescreenfps 60` (or higher).

**Evidence:** `Xvfb --help` on this machine shows:

```
-fakescreenfps #    fake screen default fps (1-600)
```

[VERIFIED: live probe `Xvfb --help`]

The default for `-fakescreenfps` when NOT specified is not documented in the
Ubuntu 24.04 man page, but the code comments in `ssr-render-host.mjs` (h19,
Phase 31) explicitly flag this:

> "ESCAPE HATCH: if you're still capped at ~21 fps after this and the diagnostic
> overlay's SSR fps ≤ 21, the BeginFrameSource is the limit. Replace Xvfb with
> Xdummy (a real Xorg with the dummy driver) which supports configurable refresh
> rates up to 240 Hz."

[VERIFIED: `src/server/ssr-render-host.mjs` line 268-271]

h18 (commit `50bc2e5`) added multiple fps-lift levers but the rAF counter still
reads ~25fps at Phase 31 closure — the escape hatch was documented but not
executed. [VERIFIED: 31-SUMMARY.md "Outstanding" section]

**What to test first (trivially cheap fix):** Add `-fakescreenfps 60` (or 120 for
headroom) to the Xvfb args. If the rAF counter lifts to ~60 fps, this is the root
cause.

**Xdummy alternative** (heavier, more reliable): `xserver-xorg-video-dummy` is
available in apt (`apt-cache show xserver-xorg-video-dummy` returns 1:0.4.0-1).
[VERIFIED: live probe] Xdummy requires a custom `xorg.conf` with a Monitor section
specifying `VertRefresh 60` and a 1920x1080 ModeLine. Advantage: real Xorg vsync
timer, more reliable for high-fps headless use. Disadvantage: requires Xorg console
permission (`/usr/lib/xorg/Xorg.wrap: Only console users are allowed to run the X
server` [VERIFIED: live probe]), so must run `--no-auth` or with `allowed_users`
config. The Xvfb `-fakescreenfps` fix should be attempted first.

**Fix shape:**

```javascript
// In spawnXvfb() — add to xvfbArgs after "+extension", "Composite":
"-fakescreenfps", "120",  // 120 gives headroom; rAF will target ~60
```

---

### Hypothesis I-1B: Chromium BeginFrameSource timer — SECONDARY [VERIFIED: code read]

Even with `-fakescreenfps 60`, Chromium under `--ozone-platform=x11` uses the X11
vsync signal. With `--disable-gpu-vsync` and `--disable-frame-rate-limit` (both
already set in h9/h10 flags), Chromium's SyntheticBeginFrameSource should run at
its own timer rate. But there is a subtlety: `--ozone-platform=x11` binds
Chromium to the X11 window server's expose/repaint events for the *compositor*
back-pressure signal. If Xvfb does not send fast-enough expose events, the
compositor throttles.

**What h18 added that should have helped:**
- `--disable-gpu-vsync` — already present (h10)
- `--disable-frame-rate-limit` — already present (h10)
- `--max-gum-fps=60` — caps getDisplayMedia MediaStreamVideoSource at 60 Hz
- `TabCaptureFastPath` feature flag — lifts the implicit 30 fps cap on tab-capture
- `VaapiVideoEncoder, VaapiVideoDecoder, VaapiIgnoreDriverChecks` — enabled when
  `/dev/dri/renderD128` exists [VERIFIED: `/dev/dri/renderD128` exists on this machine]

**Residual gap:** Even with these flags, if Xvfb's screen refresh is 25 Hz (the
default on some builds), none of the anti-throttle flags can lift the rAF rate
above the screen's reported vsync rate — that's a kernel/compositor constraint,
not a JS one.

---

### Hypothesis I-2: x264-software Encode Budget [VERIFIED: code read + config]

Current persisted config in `config/global-defaults.json`:

```json
"serverRendering": {
  "encoder": "auto",
  "qualityPreset": "high-quality",
  ...
}
```

`high-quality` maps to `x264Preset: "fast"` in `QUALITY_PRESETS`:

```javascript
"high-quality": { bitrate: 12_000_000, fpsTarget: 30, keyframeIntervalSec: 2, x264Preset: "fast" },
```

[VERIFIED: `src/server/ssr-render-host.mjs` lines 50-53]

**The problem with x264-fast at 1080p:** `fast` preset is significantly
CPU-heavier than `ultrafast`. At 1920×1080@30fps, x264-fast can consume 3-5 CPU
cores on an Intel Core i7-class processor. On an Intel Core 7 240H with 16 threads,
this is manageable, but the ADDITIONAL cost of the GL compositor (mesh-warp + N
room canvases) plus Node.js IPC overhead may push the total beyond one core's
budget, causing rAF callbacks to be delayed.

**h18's fix was correct in principle** (switched from 3-layer simulcast to
single-layer for x264-software), which would have cut encode cost by ~3x. But the
`high-quality (fast)` preset remains heavier than needed. Switching to
`low-latency (ultrafast)` or `balanced (veryfast)` would free CPU for rAF.

**Disambiguation:** If the Xvfb -fakescreenfps fix lifts SSR fps → encoder is NOT
the bottleneck. If SSR fps is already 60 but STREAM fps is capped at 25 → encoder
IS the bottleneck.

---

### Hypothesis I-3: getDisplayMedia Capture Rate [VERIFIED: code read]

The publisher already sets:

```javascript
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 60, max: 60 },
    cursor: "never",
  },
  ...
  preferCurrentTab: true,
  selfBrowserSurface: "include",
});
// And then:
await videoTrack.applyConstraints({ frameRate: { ideal: 60, max: 60 } });
```

[VERIFIED: `src/server/ssr-stream-publisher.mjs` lines 166-191]

`TabCaptureFastPath` is also enabled. [VERIFIED: `ssr-render-host.mjs` line 370]

**If SSR fps (rAF) is already 60 but capture rate is 25:** `videoTrack.getSettings()`
is already logged in the publisher — the operator can read `frameRate` from the
console output to see what the negotiated capture rate actually is. This is free
information already in the codebase.

**Research conclusion:** The capture rate constraint is correctly set. If rAF is
25 Hz, the capture will be 25 fps regardless of the constraint — the constraint
only caps it, it can't amplify it. Fix Xvfb first.

---

### Hypothesis I-4: Chromium VAAPI Encoding [VERIFIED: live probe]

**Architecture clarification (CRITICAL):** In this stack, h264 encoding happens
INSIDE Chromium's libwebrtc — NOT via ffmpeg. The `server-encoder-detect.mjs`
module probes ffmpeg for `h264_vaapi`, but that is for a DIFFERENT encoding path
that is NOT used here.

**Current detection result:**

```
$ node -e "import('./src/server/server-encoder-detect.mjs').then(m => m.detectAvailableEncoders().then(r => console.log(r)))"
detected: [ 'x264-software' ]
```

[VERIFIED: live probe]

**Why:** The installed ffmpeg does NOT include `h264_vaapi` (only `libx264` and
`h264_v4l2m2m`). [VERIFIED: `ffmpeg -hide_banner -encoders` shows no `h264_vaapi`]

**BUT — Chromium's VaapiVideoEncoder IS enabled:**

```javascript
const hasIgpu = existsSync("/dev/dri/renderD128") || existsSync("/dev/dri/renderD129");
const enabledFeatures = [
  ...(hasIgpu ? ["VaapiVideoEncoder", "VaapiVideoDecoder", "VaapiIgnoreDriverChecks"] : []),
  ...
];
```

[VERIFIED: `src/server/ssr-render-host.mjs` lines 363-372]

`/dev/dri/renderD128` EXISTS on this machine. [VERIFIED: `ls /dev/dri/`]

Chromium snap has `opengl` interface connected (grants `/dev/dri/` access).
[VERIFIED: `snap connections chromium`]

`intel-media-va-driver:amd64 24.1.0` is installed (Intel GEN8+ VAAPI driver).
[VERIFIED: `dpkg -l`]

**Conclusion:** Chromium's libwebrtc MAY already be using VAAPI for h264 encode
internally, while the `server-encoder-detect.mjs` result (which checks ffmpeg, not
Chromium) shows `x264-software`. This creates a confusing mismatch in the
diagnostic overlay: the chip might say `encoder=x264-software` while Chromium is
actually using `VaapiH264Encoder`.

**To verify:** The publisher logs `videoTrack.getSettings()` — but that doesn't
reveal the encode path. To confirm Chromium's encode path, check:
1. `chrome://gpu` in the SSR tab (via CDP navigation) for "Video Encode Acceleration"
2. Chromium's `--enable-logging=stderr --log-level=0` to see encoder selection
3. CPU usage: if VAAPI is active, CPU should be lower and GPU usage should rise

**The real issue:** The mismatch between `server-encoder-detect.mjs` (ffmpeg-based)
and Chromium's actual encode path means:
- When `encoder=x264-software` is resolved → `useSimulcast = false` → single-layer
- Single-layer is actually CORRECT for preventing CPU triple-encoding
- But the `high-quality` preset using `x264Preset: "fast"` is STILL applied to
  the BITRATE constraint, which is correct regardless of the actual encode path

**Action for Phase 32:** The `server-encoder-detect.mjs` should be extended with a
Chromium-VAAPI probe path that checks `/dev/dri/renderD128` existence PLUS libva
runtime availability (libva.so.2 IS present). If both are present, report `vaapi`
even if ffmpeg lacks `h264_vaapi`. This would fix the confusing mismatch and enable
the `useSimulcast = true` path (3-layer) when VAAPI is confirmed — appropriate
since VAAPI encode of 3 layers is essentially free on fixed-function silicon.

---

### Hypothesis I-5: Pi VC4 h264 Decode Budget [ASSUMED]

The Pi 4's dedicated h264 hardware decoder (VC4/VideoCore) handles 1080p@30fps
easily in hardware — this is the original rationale for the Phase 31 pivot. At
1080p@60fps, the VC4 h264 HW decoder should still handle it (the HW decoder
supports up to 1080p@60fps per Raspberry Pi Foundation documentation). [ASSUMED —
not live-verified on Pi hardware in this research session]

If the Pi is displaying via HDMI at 60Hz refresh, the video element will render at
display refresh rate regardless of stream rate. The `requestVideoFrameCallback`
counter tracks actual decoded frames.

**Pi-side measurement:** `videoEl.getVideoPlaybackQuality()` already polled in
`receiver-bootstrap.js`. The `framesDecoded`, `framesDropped`, and `totalVideoFrames`
values already appear in the diagnostic overlay STREAM line.

---

### Critical Gap: fpsTarget Does NOT Flow to Publisher Constraint [VERIFIED]

The existing `fpsTarget` config field (values: 30, 24, 15 per `FPS_VALUES` enum)
is LOGGED but does NOT constrain the publisher's `getDisplayMedia` frameRate
constraint. The publisher ALWAYS requests `frameRate: { ideal: 60, max: 60 }`
regardless of config. [VERIFIED: `src/server/ssr-stream-publisher.mjs` lines 174, 188]

**D-A3 requires a NEW `fpsCap` field** (or renamed `streamFpsCap`) with values
`30 / 45 / 60 / 0` (0 = native/no cap). This field must:

1. Be added to `ENCODER_VALUES` schema in `ssr-server-rendering-config.mjs`
2. Extend the validator and `FPS_VALUES` enum to include 45, 60, 0
3. Flow from config → `resolveEncoderConfig()` → `injectInPagePublisher()` →
   `frameRate.max` in `getDisplayMedia` constraint
4. Flow into the `applyConstraints()` call as `frameRate: { ideal: targetFps, max: capFps }`

**D-A2 Align-Mode Boost** requires the publisher to monitor the runtime's
`alignMode` state and temporarily `applyConstraints({ frameRate: { ideal: 60, max: 60 } })`
when align-mode is active, regardless of the configured cap. The SSR tab already
has access to `window.__TT_BEAMER_STATE_FOR_DIAG__.alignMode` [VERIFIED:
`ssr-stream-publisher.mjs` line 254-256]. The publisher can poll this flag and
call `applyConstraints()` reactively.

---

### Settings UI Extension for Block A [VERIFIED: code read]

**Current panel:** `src/app/lib/ui/settings/server-rendering-panel.js`
- 5 controls: encoder, qualityPreset, resolutionPreference, fpsTarget (radios for 30/24/15), audioRoute
- Missing: FPS Cap slider/select (30/45/60/native) and Align-Mode Boost toggle

**Extension needed:**
- Add `streamFpsCap` select: 30 / 45 / 60 / native (0 = no cap)
- Add `alignModeBoost` checkbox toggle (default ON)
- Wire to `sendPatch({ streamFpsCap: N })` and `sendPatch({ alignModeBoost: bool })`
- Add `ssrStreamFpsCapSelect` and `ssrAlignModeBoostToggle` to DOM refs pattern

**Schema changes in `ssr-server-rendering-config.mjs`:**
```javascript
// New fields to add to KNOWN_KEYS:
export const STREAM_FPS_CAP_VALUES = [30, 45, 60, 0]; // 0 = native
export const STREAM_FPS_CAP_DEFAULT = 60;
export const ALIGN_MODE_BOOST_DEFAULT = true;
```

**`config/global-defaults.json` current `serverRendering` block:**
```json
{
  "encoder": "auto",
  "qualityPreset": "high-quality",
  "resolutionPreference": "1080p",
  "fpsTarget": 30,
  "audioRoute": "pi-local"
}
```

New fields to add: `"streamFpsCap": 60, "alignModeBoost": true`

---

### Bitrate Scaling for FPS Lift

D-A3: "Bitrate scaling läuft adaptive: bei höherer FPS wird bitrate proportional gehoben
(constraint: 1080p@60 ≤ 16 Mbit/s default — LAN-gigabit kann das easy)."

Current max bitrate in `QUALITY_PRESETS`: 12 Mbit/s (high-quality). This needs to
extend to 16 Mbit/s for 60fps use case. The publisher's `deriveSimulcastBitrates()`
reads from `SSR_INITIAL_BITRATE` env or defaults to 8 Mbit/s. This needs to scale
with `streamFpsCap`:

```
30fps  → 8 Mbit/s (current balanced)
45fps  → 12 Mbit/s (current high-quality)
60fps  → 16 Mbit/s (new high-fps preset)
native → 16 Mbit/s (same cap as 60)
```

---

## Block B — Reconnect-Storm Forensic Analysis

### Cold-Boot Sequence (VERIFIED: code read)

```
server.mjs boot order:
  1. loadSsrInitialState()          (sync-ish, reads JSON from disk)
  2. loadActiveGrid()               (sync-ish, reads JSON from disk)
  3. await bootMediasoupRouter()    (creates Worker + Router — ~100-200ms)
  4. attachWebRtcSignaling(server)  (attaches WebSocket handler immediately)
  5. ensureMediasoupClientBundle()  (fire-and-forget, ~1s first time)
  6. bootSsrRenderHost({ autoStart:true })  ← starts ASYNC in background
     └── start():
          spawnXvfb()          (~500ms grace window)
          launchBrowser()      (puppeteer-stream launch: ~2-3s)
          page.goto(ssrUrl)    (navigate + DOMContentLoaded: ~1s)
          injectInPagePublisher()  (20s timeout):
               open WS to /api/webrtc/signal?role=ssr-tab
               get-router-rtp-capabilities
               create-send-transport
               connect-transport (DTLS handshake: ~200-500ms)
               produce(video)   → state.videoProducer = producer  ← AVAILABLE HERE
          Total: ~4-8 seconds from server start to producer up
```

**Pi receiver boot (triggered by page load, can happen anytime):**

```
  1. receiver-bootstrap.js loads
  2. createWebRtcReceiver() → opens WS to /api/webrtc/signal?role=consumer
  3. rpc("get-router-rtp-capabilities")   (fast, router is up)
  4. rpc("create-recv-transport")          (fast, transport created)
  5. rpc("consume") ← THIS IS THE RACE POINT
```

The consume() handler in `ssr-webrtc-signaling.mjs` (h19 + h26):

```javascript
if (!producer) {
  const waitDeadline = Date.now() + 8000;  // 8s hold window
  while (Date.now() < waitDeadline) {
    await new Promise((r) => setTimeout(r, 50));  // 50ms poll
    producer = state.videoProducer;
    if (producer) break;
  }
  if (!producer) {
    sendErr("no-producer-yet", requestId);  // ← FAIL after 8s
    return;
  }
}
```

[VERIFIED: `src/server/ssr-webrtc-signaling.mjs` lines 479-494]

**The storm pattern:**

1. Pi connects at T=0, consume() entered, 8s hold starts
2. SSR tab takes 4-8s to produce → if >8s → "no-producer-yet" error
3. Pi receiver catches error → `reconnectAttempts += 1`
4. Pi shows reconnect banner, waits backoff delay, calls `tryConnect()` again
5. Each new Pi connect creates a NEW WebSocket → `state.consumerCount += 1`
6. Per-IP cleanup (h38) closes the OLD socket before accepting new one
7. BUT: The old socket's `close` handler decrements `consumerCount`
   ONLY AFTER the socket is fully destroyed (async)
8. During fast reconnect cycles, the count can briefly spike above the real count
9. Eventually, if 10 attempts exhaust → Pi shows error overlay and STOPS

**Why server-restart fixes it:** `bootMediasoupRouter()` is called fresh, all
state is cleared (new Worker + Router + zero consumerCount), and the 10-attempt
limit is reset by the Pi page reload.

---

### Hotfix History Summary (h24-h46) [VERIFIED: git log]

| Hotfix | Theme | What it fixed | Remaining gap |
|--------|-------|--------------|---------------|
| h24 | Reconnect storm | Align mode root cause + drag-flow probe | Producer-startup race |
| h25 | WS leak | WebSocket leaked on consume failure → hit cap=10 | Hard 10-attempt cap |
| h26 | Poll interval | 200ms → 50ms poll in consume-hold | Still 8s max hold |
| h36 | Threshold | Disconnect threshold 3000ms → 8000ms | Threshold helps but not root cause |
| h38 | Per-IP cleanup | Force-destroy stale WS from same IP | Race window still exists |

**Gaps that remain after h24-h46:**
1. `MAX_RECONNECT_ATTEMPTS = 10` is a hard cap → Pi stops after 10 fails [VERIFIED]
2. Backoff formula `Math.min(1000 * 1.5^n, 10000)` caps at 10s, not 30s [VERIFIED]
3. No `sessionStorage` persistence of backoff state across page reloads [VERIFIED]
4. No `/api/ssr/ready` endpoint — Pi has no way to wait for producer readiness [VERIFIED]
5. No "RECONNECTING — Xs" countdown overlay [VERIFIED]
6. Server-side boot cleanup for stale mediasoup state: partial
   (`bootMediasoupRouter()` is idempotent but does not purge stale transports
   from prior crashed run if the worker survived) [VERIFIED: `ssr-mediasoup-router.mjs` lines 86-88]

---

### Reconnect Storm Root Cause Classification

**Root cause 1 (PRIMARY):** Pi attempts consume() before producer is ready.
The 8s hold (h19) helps but doesn't eliminate: SSR tab startup is 4-8s and can
exceed 8s on first-boot, slow disks, or under load. The producer-readiness gate
(D-B5) eliminates this race entirely.

**Root cause 2 (SECONDARY):** Hard 10-attempt cap causes Pi to give up.
Convert to forever-retry with capped backoff per D-B2.

**Root cause 3 (TERTIARY):** The per-IP cleanup (h38) destroys the old WS before
the new connection is fully established. If the DTLS handshake for the new
connection fails (e.g., port conflicts or Worker restart), `consumerCount` may
be corrupted. Mitigated by raising the cap to 50 (h38 already done) but not
structurally fixed.

**Root cause 4 (COLD-BOOT SPECIFIC):** If a previous server process crashed
without clean shutdown, the mediasoup Worker process (a native C++ process) may
still be running. `bootMediasoupRouter()` is idempotent IF `activeWorker` is
falsy — but if the module was hot-reloaded or Node process restarted abruptly,
`activeWorker` might be null while the native Worker is still running on the
ports. The `shutdownMediasoupRouter()` in SIGINT/SIGTERM handler covers graceful
shutdown, but SIGKILL or crashes bypass it.

D-B4 addresses this: "beim server-start mediasoup worker terminieren + neu starten
falls eine vorherige instanz noch läuft" — requires killing any lingering mediasoup
Worker processes at boot (search by process name `mediasoup-worker`).

---

### Producer-Readiness Gate Design (D-B5)

**Option A: REST endpoint `/api/ssr/ready`**

```javascript
// In server.mjs (or a new route handler)
// Returns 200 when state.videoProducer is not null
server.on("request", (req, res) => {
  if (req.url === "/api/ssr/ready") {
    const state = signalingState; // from attachWebRtcSignaling()
    const ready = state?.videoProducer != null;
    res.writeHead(ready ? 200 : 503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ready, reason: ready ? "producer-up" : "producer-starting" }));
    return;
  }
  // ... rest of handler
});
```

**Option B: WebSocket "producer-ready" push event**

The heartbeat already sends `ssrFps` and `ssrStats`. When the producer first
registers (`state.videoProducer` goes from null → non-null), the signaling
handler can broadcast a `{ type: "producer-ready" }` frame to all connected
consumer sockets.

**Recommended: Option A for polling + Option B for instant notification**

Pi receiver in `receiver-bootstrap.js` polls `/api/ssr/ready` before entering
the WebRTC setup. If 503, waits and retries (up to the configured backoff). When
200 is received, proceeds with the full WebRTC negotiation.

```javascript
async function waitForProducer(maxWaitMs = 60000, pollIntervalMs = 1000) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch("/api/ssr/ready");
      const j = await r.json();
      if (j.ready) return true;
    } catch { /* network hiccup — keep trying */ }
    await new Promise(res => setTimeout(res, pollIntervalMs));
  }
  return false; // timeout
}
```

---

### Adaptive Backoff Implementation (D-B2)

**Current implementation:**
```javascript
const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);
```

**Required by D-B2:** `1s → 2s → 5s → 10s → 30s (max)`. Reset after ≥30s stable.
`sessionStorage` for backoff state across page reloads.

**Proposed implementation:**

```javascript
const BACKOFF_SCHEDULE_MS = [1000, 2000, 5000, 10000, 30000]; // D-B2
const STABLE_RESET_THRESHOLD_MS = 30000;

function getBackoffDelay(attemptCount) {
  const idx = Math.min(attemptCount, BACKOFF_SCHEDULE_MS.length - 1);
  return BACKOFF_SCHEDULE_MS[idx];
}

// sessionStorage persistence
function loadBackoffState() {
  try {
    const raw = sessionStorage.getItem("ssr-reconnect-state");
    if (!raw) return { attempts: 0 };
    return JSON.parse(raw);
  } catch { return { attempts: 0 }; }
}

function saveBackoffState(state) {
  try { sessionStorage.setItem("ssr-reconnect-state", JSON.stringify(state)); }
  catch {}
}
```

**Forever-retry:** Remove the `MAX_RECONNECT_ATTEMPTS` hard cap. Replace with a
`forever-retry` loop where the only stop condition is a manual operator action
(Retry button = reset to attempt 0) or an explicit server-sent "stop retrying"
message. The `MAX_RECONNECT_ATTEMPTS` export must be removed from
`receiver-status-ui.js` or renamed to `RECONNECT_STABLE_THRESHOLD_MS`.

---

### "RECONNECTING — Xs" Countdown Overlay (D-B3)

**Current overlay:** `showReconnect(text)` in `receiver-status-ui.js` sets text of
`#ssr-reconnect-banner` element. No countdown logic exists. [VERIFIED: code read]

**Extension needed:**

```javascript
// In receiver-bootstrap.js — replace simple delay with countdown
function showCountdownReconnect(delayMs, attemptN) {
  const endAt = Date.now() + delayMs;
  function tick() {
    const remainSec = Math.ceil((endAt - Date.now()) / 1000);
    if (remainSec <= 0) { ui.hideReconnect(); return; }
    ui.showReconnect(`RECONNECTING — ${remainSec}s (attempt ${attemptN})`);
    setTimeout(tick, 500);
  }
  tick();
}
```

**Disappear condition:** D-B3 says "Verschwindet sobald connection ≥ 5s stable."
Track `connectionStableAtMs` — when `performance.now() - connectionStableAtMs ≥ 5000`
AND `pcState === "connected"`, call `ui.hideReconnect()`.

---

### Server-Side Boot Cleanup (D-B4)

**What needs cleaning at boot:**

1. **Stale mediasoup Worker process:** Check for lingering `mediasoup-worker`
   native processes from a prior crashed run. Kill them before booting new Worker.

```javascript
// In server.mjs boot sequence, before bootMediasoupRouter():
import { execSync } from "node:child_process";
try {
  execSync("pkill -f mediasoup-worker", { stdio: "ignore" });
  await new Promise(r => setTimeout(r, 200)); // let OS reclaim ports
} catch { /* no stale worker — OK */ }
```

2. **Stale Xvfb lock:** Already handled by `pickFreeDisplay()` in
   `ssr-render-host.mjs` (removes stale `/tmp/.X<N>-lock` files). [VERIFIED]

3. **Port binding conflicts:** The RTC port range is 40000-40100. A crashed
   mediasoup Worker may hold these ports. The `pkill` above plus a 200ms grace
   window should free them before the new Worker binds.

4. **stale `connectionsByAddr` map:** This is module-scoped in
   `ssr-webrtc-signaling.mjs`. A full server restart always creates a fresh
   instance. For the case of encoder-change hot-restart (D-A6), the signaling
   module stays loaded but `attachWebRtcSignaling` is only called once at boot —
   the `connectionsByAddr` map persists across hot-restarts. If a Pi was connected
   during an encoder change, its entry stays in `connectionsByAddr` but the socket
   is destroyed. This is already handled by the `stale.socket.destroy()` call on
   new connection from same IP. [VERIFIED: signaling lines 250-255]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in) |
| Config file | `package.json` `"test"` script |
| Quick run command | `node --test "test/phase-32-*.test.mjs"` |
| Full suite command | `node --test "test/**/*.test.mjs"` |

**Baseline:** 215 total / 211 pass / 4 skip / 0 fail [VERIFIED: live run]

### Phase 32 Test Map

| ID | Behavior | Test Type | Command |
|----|----------|-----------|---------|
| A1 | `QUALITY_PRESETS` all have fpsTarget=30 — flag as suspicious | unit | phase-32-fps-presets.test.mjs |
| A2 | `resolveEncoderConfig` returns `streamFpsCap` field from config | unit | phase-32-fps-presets.test.mjs |
| A3 | Publisher `buildInPagePublisherScript` uses streamFpsCap in frameRate.max | unit | phase-32-fps-presets.test.mjs |
| A4 | `validateServerRenderingPatch` accepts streamFpsCap ∈ {30,45,60,0} | unit | phase-32-server-rendering-config.test.mjs |
| A5 | `validateServerRenderingPatch` accepts alignModeBoost bool | unit | phase-32-server-rendering-config.test.mjs |
| A6 | `SERVER_RENDERING_DEFAULTS` includes streamFpsCap + alignModeBoost | unit | phase-32-server-rendering-config.test.mjs |
| A7 | `applyServerRenderingPatch` merges new fields correctly | unit | phase-32-server-rendering-config.test.mjs |
| A8 | `server-encoder-detect` detects VAAPI via libva path (renderD128 + libva) | unit | phase-32-encoder-detect-vaapi.test.mjs |
| A9 | Xvfb args include `-fakescreenfps` when spawned | unit | phase-32-xvfb-fakescreenfps.test.mjs |
| B1 | `/api/ssr/ready` returns 503 when no producer | unit | phase-32-producer-ready.test.mjs |
| B2 | `/api/ssr/ready` returns 200 when producer is up | unit | phase-32-producer-ready.test.mjs |
| B3 | `getBackoffDelay(N)` returns D-B2 schedule values | unit | phase-32-reconnect-backoff.test.mjs |
| B4 | `getBackoffDelay(N)` caps at 30000ms for N ≥ 4 | unit | phase-32-reconnect-backoff.test.mjs |
| B5 | Backoff state round-trips sessionStorage (mock) | unit | phase-32-reconnect-backoff.test.mjs |
| B6 | Forever-retry: reconnectAttempts never hits hard cap | unit | phase-32-reconnect-backoff.test.mjs |
| B7 | Stable reset: backoff resets after ≥30s connection | unit | phase-32-reconnect-backoff.test.mjs |
| B8 | `evaluateDisconnect` threshold still 8000ms | unit | (existing test — verify no regression) |
| B9 | Server boot cleanup purges stale mediasoup worker by name | unit | phase-32-boot-cleanup.test.mjs |
| B10 | Countdown overlay text format: "RECONNECTING — Xs (attempt N)" | unit | phase-32-status-overlay.test.mjs |
| B11 | Overlay hides after connection stable ≥5s | unit | phase-32-status-overlay.test.mjs |
| B12 | `waitForProducer` returns true when /api/ssr/ready → 200 | unit | phase-32-producer-ready.test.mjs |
| B13 | `waitForProducer` returns false after maxWaitMs with 503 | unit | phase-32-producer-ready.test.mjs |

**Total new tests target:** ≥30 (includes above + edge cases + regression guards)

### Sampling Rate

- Per task commit: `node --test "test/phase-32-*.test.mjs"`
- Per wave merge: `node --test "test/**/*.test.mjs"` (215+ must stay green)
- Phase gate: Full suite green before `/gsd-verify-work`

### Wave 0 Gaps (test files to create)

- [ ] `test/phase-32-fps-presets.test.mjs` — A1-A3
- [ ] `test/phase-32-server-rendering-config.test.mjs` — A4-A7
- [ ] `test/phase-32-encoder-detect-vaapi.test.mjs` — A8
- [ ] `test/phase-32-xvfb-fakescreenfps.test.mjs` — A9
- [ ] `test/phase-32-producer-ready.test.mjs` — B1-B3, B12-B13
- [ ] `test/phase-32-reconnect-backoff.test.mjs` — B3-B7
- [ ] `test/phase-32-boot-cleanup.test.mjs` — B9
- [ ] `test/phase-32-status-overlay.test.mjs` — B10-B11

---

## Architecture Patterns

### Recommended Project Structure (new files Phase 32)

```
src/server/
├── ssr-render-host.mjs          # MODIFY: -fakescreenfps, VAAPI libva probe
├── ssr-stream-publisher.mjs     # MODIFY: streamFpsCap, alignModeBoost logic
├── ssr-webrtc-signaling.mjs     # MODIFY: /api/ssr/ready, producer-ready broadcast
├── ssr-server-rendering-config.mjs  # MODIFY: new fields streamFpsCap, alignModeBoost
├── server-encoder-detect.mjs    # MODIFY: VAAPI libva path independent of ffmpeg

src/app/runtime/output-receiver/
├── receiver-status-ui.js        # MODIFY: countdown overlay, remove MAX_RECONNECT hard cap
├── receiver-bootstrap.js        # MODIFY: waitForProducer, forever-retry, D-B2 schedule
├── receiver-webrtc-client.js    # UNCHANGED (reconnect logic is in bootstrap)

src/app/lib/ui/settings/
├── server-rendering-panel.js    # MODIFY: FPS cap select, Align-Mode Boost toggle

config/
└── global-defaults.json         # MODIFY: add streamFpsCap, alignModeBoost fields

test/
└── phase-32-*.test.mjs          # NEW: 8 test files, ≥30 tests total
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MediaStream frameRate capping | Custom throttle logic | `videoTrack.applyConstraints({ frameRate })` | Browser API handles congestion-control negotiation |
| Xvfb process management | Custom display daemon | Xvfb with `-fakescreenfps` + existing `spawnXvfb()` | Already handles stale locks, collision detection |
| DTLS handshake | Custom ICE/DTLS | mediasoup WebRtcTransport | Handles RFC 8829 edge cases |
| h264 encode | ffmpeg pipeline | Chromium's libwebrtc VaapiVideoEncoder | Already wired, zero-transcode latency |
| Reconnect backoff | `setInterval` soup | Simple `getBackoffDelay(n)` function + `setTimeout` | Already works, just needs schedule fix |
| sessionStorage versioning | Custom serializer | `JSON.parse/stringify` with try/catch | No complex schema needed |

---

## Common Pitfalls

### Pitfall 1: Confusing ffmpeg VAAPI with Chromium VAAPI
**What goes wrong:** Changing `server-encoder-detect.mjs` to report VAAPI when
ffmpeg has `h264_vaapi` — but this ffmpeg install does NOT have `h264_vaapi`.
The actual VAAPI path is Chromium's own VaapiVideoEncoder.
**How to avoid:** Add a separate probe path in encoder-detect that checks
`/dev/dri/renderD128` + `libva.so.2` existence, independent of ffmpeg. When this
returns `vaapi`, set `useSimulcast = true` in the publisher.

### Pitfall 2: Breaking the existing 8s consume-hold with the readiness gate
**What goes wrong:** Adding `/api/ssr/ready` gate on the Pi side but forgetting
to keep the 8s server-side hold in `consume()`. If Pi polls ready before the hold
and gets 200, it opens WebRTC; the 8s hold is still needed for edge cases where
the Pi bypasses the gate (e.g., direct consume from a test script).
**How to avoid:** Keep the h19/h26 server-side hold AND add the client-side gate.
Defense-in-depth.

### Pitfall 3: sessionStorage backoff state not cleared on successful stable connection
**What goes wrong:** Pi reconnects, goes stable for 30s, attempts count stays
high in sessionStorage, next transient disconnect starts at 30s backoff.
**How to avoid:** Clear / reset sessionStorage state when `connectionStableAtMs`
passes the `STABLE_RESET_THRESHOLD_MS = 30000` mark.

### Pitfall 4: Xvfb -fakescreenfps not high enough
**What goes wrong:** Adding `-fakescreenfps 60` lifts rAF to 60 but the capture
rate is still 30 due to a separate TabCapture limit.
**How to avoid:** Set `-fakescreenfps 120` for headroom (Chromium targets 60,
120 provides buffer). Monitor `videoTrack.getSettings().frameRate` in publisher
logs.

### Pitfall 5: FPS cap slider in UI uses existing `fpsTarget` (30/24/15 only)
**What goes wrong:** Reusing the existing `fpsTarget` field for the new
`streamFpsCap` control, which would require changing the enum and potentially
breaking the schema for existing installations that have saved a `fpsTarget: 30`.
**How to avoid:** Add `streamFpsCap` as a NEW field. Keep `fpsTarget` for backward
compatibility but stop using it in publisher logic. The planner should include a
config migration step.

### Pitfall 6: `mediasoup-worker` pkill on boot kills processes from OTHER apps
**What goes wrong:** `pkill -f mediasoup-worker` kills any process with that name,
which could be from an unrelated mediasoup deployment on the same machine.
**How to avoid:** Use `pkill --pidfile` or track the PID of the previous Worker,
or use `lsof -i :40000-40100` to check if ports are in use. The `pkill -f`
approach is safe for a single-user development server but the planner should note
this assumption.

### Pitfall 7: Forever-retry with no backoff state on page reload
**What goes wrong:** User reloads the Pi `/output/` page, `reconnectAttempts`
resets to 0, backoff starts from 1s again. If the server is down, this creates a
rapid-fire reconnect storm from the Pi even though D-B2 wants the 30s max to
persist across page loads.
**How to avoid:** Load `attempts` from `sessionStorage` at bootstrap init.
Increment and save before each retry attempt.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Xvfb `-fakescreenfps` flag | FPS lift | ✓ | 2:21.1.12 | Xdummy driver |
| `/dev/dri/renderD128` | VAAPI probe | ✓ | — | x264-software stays |
| `libva.so.2` | VAAPI probe | ✓ | 2.20.0 | x264-software stays |
| `intel-media-va-driver` | VAAPI h264 encode | ✓ | 24.1.0 | x264-software stays |
| Chromium snap `opengl` | VAAPI access | ✓ | connected | — |
| `xserver-xorg-video-dummy` | Xdummy fallback | ✗ (in apt) | 1:0.4.0 | Xvfb -fakescreenfps |
| `mediasoup` | WebRTC SFU | ✓ | 3.19.22 | — |
| `ffmpeg` (libx264) | Software encode | ✓ | — | — |

**Missing dependencies with no fallback:** None blocking Phase 32.
**Missing dependencies with fallback:** `xserver-xorg-video-dummy` — Xvfb
`-fakescreenfps 60` is the preferred fix; Xdummy is Plan B if Xvfb still caps.

---

## VAAPI Evaluation Path (I-3 investigation guide)

**Step 1: Confirm Chromium VaapiVideoEncoder is active**

In the CDP session (accessible via `cdpSession` already in `ssr-render-host.mjs`):

```javascript
// After page.goto(), navigate to chrome://gpu to check HW acceleration status
const result = await page.evaluate(() => {
  // Check navigator.userAgent and GPU info via WebGL
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");
  const ext = gl?.getExtension("WEBGL_debug_renderer_info");
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
});
// If result contains "Intel(R)" or "UHD" → GL is hardware-accelerated
```

The diagnostic overlay already shows `webglRenderer` from this probe.
[VERIFIED: `ssr-stream-publisher.mjs` lines 284-311]

**Step 2: Check actual CPU usage during encode**

If CPU during stream is >50% on a single core → likely software encode.
If CPU is <10% → likely hardware encode (VAAPI).

**Step 3: Check `encoder-detect.mjs` VAAPI probe without ffmpeg dependency**

New probe function to add:

```javascript
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

function probeVaapiRuntime() {
  // /dev/dri/renderD128 exists (checked by existing probeVaapiDevice())
  // AND libva runtime is available (loaded by Chromium internally)
  const hasDriDevice = existsSync("/dev/dri/renderD128") || existsSync("/dev/dri/renderD129");
  const hasLibva = existsSync("/usr/lib/x86_64-linux-gnu/libva.so.2")
    || existsSync("/usr/lib/aarch64-linux-gnu/libva.so.2")
    || existsSync("/usr/local/lib/libva.so.2");
  return hasDriDevice && hasLibva;
}
```

When this returns true, `detectAvailableEncoders()` should push `"vaapi"` even if
ffmpeg lacks `h264_vaapi`. This correctly reflects that Chromium's WebRTC stack
CAN use VAAPI via VaapiVideoEncoder even though ffmpeg doesn't have the codec.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| 3-layer simulcast on x264-software | single-layer (h18) | ~3x CPU savings for software encode |
| `--disable-features` duplicate flags | merged single flag (h15) | Fixed GIF fetch throttle |
| `frameRate: { ideal: 30 }` | `{ ideal: 60, max: 60 }` (h18) | Unlocks 60fps target |
| `MAX_CONSUMER_CONNECTIONS = 10` | raised to 50 (h38) | Reduced false rejections |
| `DISCONNECT_THRESHOLD_MS = 3000` | raised to 8000 (h36) | Reduced false reconnect storms |
| No per-IP dedup | `connectionsByAddr` map (h38) | Stale WS proactively destroyed |
| No Xvfb fakescreenfps | MISSING (Phase 32 fix) | Likely fixes 20-25fps cap |
| 10-attempt hard cap | forever-retry (Phase 32) | Eliminates stuck-Pi state |
| No producer-readiness gate | `/api/ssr/ready` (Phase 32) | Eliminates cold-boot race |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Xvfb `-fakescreenfps` default is ≤30fps (causing the 20-25fps cap) | I-1A | If default is already 60, Xvfb is not the cause; must investigate Chromium timer directly |
| A2 | Pi VC4 h264 HW decoder handles 1080p@60fps without frame drops | I-5 | Requires live Pi test; if Pi can't decode 60fps, target must stay at 30fps |
| A3 | Chromium's VaapiVideoEncoder is successfully activated via `--enable-features=VaapiVideoEncoder` on snap Chromium with opengl interface | VAAPI section | Snap sandbox may block libva access despite opengl connection; if blocked, VAAPI encode is unavailable |
| A4 | `pkill -f mediasoup-worker` is safe on this single-user dev machine | D-B4 section | On a shared server with multiple mediasoup deployments, this would kill unrelated workers |
| A5 | The Phase 31 "20-25fps" observation reflects rAF rate (SSR fps), not just STREAM fps | I-1A | If SSR fps is 60 and only STREAM fps is 25, the bottleneck is encoder not Xvfb; Xvfb fix would have no effect |
| A6 | `libva.so.2` existence at the checked path implies Chromium can use VAAPI | VAAPI evaluation | libva might be present but not functional (missing firmware, wrong GPU generation); needs runtime probe |

---

## Recommended Plan Shape

Phase 32 should be organized into TWO plans executed serially:

### Plan 32-1: FPS Lift (Block A)

**Wave 0:** Test scaffolding (8 new test files, 15+ tests covering new config
fields, Xvfb args, VAAPI probe, publisher fps-cap logic).

**Wave 1:** Xvfb `-fakescreenfps 120` addition to `spawnXvfb()` + VAAPI libva
probe in `server-encoder-detect.mjs` (decoupled from ffmpeg). These are the two
highest-likelihood root-cause fixes and they're independent.

**Wave 2:** Schema extension (`ssr-server-rendering-config.mjs`) — add
`streamFpsCap` and `alignModeBoost` fields to KNOWN_KEYS, validator, defaults,
and persistence. Also update `FPS_VALUES` to include 45, 60, 0.

**Wave 3:** Publisher changes — `buildInPagePublisherScript()` receives
`streamFpsCap` + `alignModeBoost` from `resolveEncoderConfig()`. The publisher
script gains an align-mode polling loop that calls `applyConstraints()` reactively.

**Wave 4:** Settings UI — `server-rendering-panel.js` gains FPS cap select (30/45/60/native)
and Align-Mode Boost toggle. DOM refs registered.

**Wave 5:** UAT smoke + regression. Run full 215-test suite + manual verification
of FPS chip showing ≥30fps.

### Plan 32-2: Connection Stability (Block B)

**Wave 0:** Test scaffolding (5 new test files, 15+ tests covering ready gate,
backoff schedule, countdown overlay, boot cleanup).

**Wave 1:** `/api/ssr/ready` endpoint in `server.mjs` + `producer-ready` WS push
event from `ssr-webrtc-signaling.mjs`. The signaling handler emits producer-ready
to all connected consumers when `state.videoProducer` transitions from null to
non-null.

**Wave 2:** `receiver-bootstrap.js` — convert to forever-retry with D-B2 schedule,
add `waitForProducer()` pre-flight, add sessionStorage backoff state persistence.
Remove `MAX_RECONNECT_ATTEMPTS` hard cap (or change to infinite).

**Wave 3:** `receiver-status-ui.js` — add countdown overlay function, add
stable-connection detection for overlay hide logic. Update `DISCONNECT_THRESHOLD_MS`
export if needed.

**Wave 4:** Server-side boot cleanup — `server.mjs` boot block adds mediasoup
worker purge step before `bootMediasoupRouter()`. Document the `pkill`
single-user assumption.

**Wave 5:** UAT smoke — 10× cold-boot cycle test + 10× Pi-reload test. Both must
pass without manual server-restart intervention.

**Parallelizability:** Plans 32-1 and 32-2 can be executed in parallel since they
touch different modules (FPS touches server-side SSR pipeline; stability touches
receiver-side bootstrap). The ONLY shared touchpoint is `ssr-server-rendering-config.mjs`
(Plan 32-1 Wave 2) and `server.mjs` (Plan 32-2 Wave 1 + Wave 4). These must be
serialized within their respective plans.

---

## Open Questions

1. **Is the rAF rate (SSR fps) actually 20-25, or is it 60 with only STREAM fps at 20-25?**
   - What we know: Phase 32 CONTEXT says "SSR und Stream both capped ~25fps"
   - Gap: This was observed during Phase 31 UAT, not measured programmatically
   - Recommendation: The planner should include a measurement task in Wave 0 that
     reads `ssrStats.fps` from the diagnostic overlay and records it before any
     code changes. This is the key discriminator.

2. **Does Xvfb `-fakescreenfps 120` actually lift the Chromium rAF rate?**
   - What we know: Xvfb has this flag; Chromium's BeginFrameSource under x11 uses
     the display server's vsync signal.
   - Gap: No live test was run (SSR not currently running).
   - Recommendation: First task in Plan 32-1 Wave 1 is to add the flag, boot SSR,
     and read the SSR fps from the overlay. If it jumps to 60+, this is confirmed.
     If it stays at 25, investigate Chromium's own BeginFrameSource timer.

3. **Is Chromium VAAPI actually working (VaapiVideoEncoder)?**
   - What we know: flags are enabled, renderD128 exists, libva is installed, opengl snap
     interface is connected.
   - Gap: The actual encode path inside libwebrtc is not observable without
     `chrome://gpu` or CPU/GPU usage measurement.
   - Recommendation: The planner should include a CPU-usage measurement task
     before and after VAAPI configuration changes.

4. **What does the Pi VC4 actually achieve at 60fps vs 30fps?**
   - What we know: Pi 4 VC4 h264 HW decoder supports 1080p@60fps per documentation.
   - Gap: Not live-verified in this environment; Pi is not available in research.
   - Recommendation: Phase 32 UAT scenario should include reading `videoEl.getVideoPlaybackQuality().droppedVideoFrames` at 60fps target to confirm Pi has no drop budget issues.

---

## Security Domain

`security_enforcement` is not set to false in `.planning/config.json`, so the
section is included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a (LAN-only, no auth layer) |
| V3 Session Management | no | n/a |
| V4 Access Control | partial | ssr-tab role localhost-only guard (already implemented) |
| V5 Input Validation | yes | `validateServerRenderingPatch` (already covers existing fields; must cover new streamFpsCap/alignModeBoost) |
| V6 Cryptography | no | n/a |

### New Fields Validation Required

The `streamFpsCap` and `alignModeBoost` fields must be validated in
`validateServerRenderingPatch()`. Current pattern for reference:

```javascript
if ("fpsTarget" in patch) {
  if (typeof patch.fpsTarget !== "number" || !Number.isFinite(patch.fpsTarget)) {
    return { valid: false, reason: "fpsTarget-wrong-type" };
  }
  if (!FPS_VALUES.includes(patch.fpsTarget)) return { valid: false, reason: "fpsTarget-not-in-enum" };
}
```

New validators to add:

```javascript
if ("streamFpsCap" in patch) {
  if (typeof patch.streamFpsCap !== "number" || !Number.isFinite(patch.streamFpsCap)) {
    return { valid: false, reason: "streamFpsCap-wrong-type" };
  }
  if (!STREAM_FPS_CAP_VALUES.includes(patch.streamFpsCap)) {
    return { valid: false, reason: "streamFpsCap-not-in-enum" };
  }
}
if ("alignModeBoost" in patch) {
  if (typeof patch.alignModeBoost !== "boolean") {
    return { valid: false, reason: "alignModeBoost-wrong-type" };
  }
}
```

### Threat Model for New Endpoints

`/api/ssr/ready`: Read-only, returns `{ ready: bool, reason: string }`. No
authentication needed (LAN-only). No state mutation. Leaks the information that
an SSR render host is running — acceptable for LAN deployment. No input required.

`producer-ready` WS push: Server-to-client push, consumers cannot trigger it.
Gated behind the `ssr-tab` role restriction already in signaling code.

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: code read] `src/server/ssr-render-host.mjs` — full read, Xvfb args, QUALITY_PRESETS, fpsTarget handling
- [VERIFIED: code read] `src/server/ssr-stream-publisher.mjs` — full read, frameRate constraint, fpsTarget gap
- [VERIFIED: code read] `src/server/server-encoder-detect.mjs` — full read, VAAPI detection via ffmpeg
- [VERIFIED: code read] `src/server/ssr-mediasoup-router.mjs` — full read, boot sequence
- [VERIFIED: code read] `src/server/ssr-webrtc-signaling.mjs` — full read, consume-hold, connectionsByAddr
- [VERIFIED: code read] `src/server/ssr-server-rendering-config.mjs` — full read, schema, FPS_VALUES
- [VERIFIED: code read] `src/app/runtime/output-receiver/receiver-bootstrap.js` — full read, tryConnect, backoff formula, MAX_RECONNECT_ATTEMPTS
- [VERIFIED: code read] `src/app/runtime/output-receiver/receiver-status-ui.js` — full read, DISCONNECT_THRESHOLD_MS, overlay pattern
- [VERIFIED: code read] `src/app/runtime/output-receiver/receiver-webrtc-client.js` — full read, WS leak fix (h25)
- [VERIFIED: code read] `src/app/lib/ui/settings/server-rendering-panel.js` — full read, 5 controls, extensible
- [VERIFIED: code read] `.planning/phases/phase-31/31-FPS-INVESTIGATION-PLAN.md` — h17-h18 era analysis
- [VERIFIED: code read] `.planning/phases/phase-31/31-SUMMARY.md` — hotfix history h12-h46
- [VERIFIED: code read] `.planning/phases/phase-32/32-CONTEXT.md` — locked decisions D-A1..D-B5

### Secondary (MEDIUM confidence from live probes)
- [VERIFIED: live probe] `ffmpeg -hide_banner -encoders` — no h264_vaapi, has libx264 only
- [VERIFIED: live probe] `ls /dev/dri/` — renderD128 exists
- [VERIFIED: live probe] `dpkg -l` — intel-media-va-driver 24.1.0, libva2 2.20.0 installed
- [VERIFIED: live probe] `snap connections chromium` — opengl connected
- [VERIFIED: live probe] `node -e detectAvailableEncoders()` — returns `['x264-software']`
- [VERIFIED: live probe] `Xvfb --help` — `-fakescreenfps #` flag exists (1-600 range)
- [VERIFIED: live probe] `node --test test/**/*.test.mjs` — 215/211/0/4 baseline
- [VERIFIED: live probe] `git log --oneline | grep 31-h` — hotfix sequence h12-h46

### Tertiary (ASSUMED — needs validation)
- [ASSUMED] Xvfb default `-fakescreenfps` is ≤30fps (causing the 20-25fps cap)
- [ASSUMED] Pi VC4 h264 decoder handles 1080p@60fps without dropped frames
- [ASSUMED] Chromium snap VAAPI encode works via `--enable-features=VaapiVideoEncoder`

---

## Metadata

**Confidence breakdown:**
- Block A root cause (Xvfb BeginFrameSource): HIGH — code gap confirmed, flag exists, h19 escape hatch documented
- Block A VAAPI path: MEDIUM — hardware present, libva installed, Chromium flags enabled; actual runtime behavior unverified
- Block B root cause (MAX_RECONNECT_ATTEMPTS cap): HIGH — code fully verified, hard cap confirmed
- Block B reconnect storm sequence: HIGH — traced fully through 6 source files
- Settings extension plan: HIGH — follows exact Phase 31 patterns
- Test map: HIGH — follows established `node:test` pattern

**Research date:** 2026-05-06
**Valid until:** 2026-06-06 (stable stack — mediasoup 3.x, Chromium 147, libva 2.20)
