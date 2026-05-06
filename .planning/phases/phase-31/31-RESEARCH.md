# Phase 31: Server-Side Rendering Pivot — Research

**Researched:** 2026-05-06
**Domain:** Headless-browser server-side rendering + WebRTC streaming + Pi thin-client receiver
**Confidence:** HIGH on stack choices (D-X1, D-X2, D-X4, D-X5); MEDIUM on audio capture exact path (D-X8); HIGH on architecture risk-flagging.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Block A — Stream-Transport (LOCKED):**
- D-A1: WebRTC for streaming
- D-A2: h264 encode (Pi VC4 HW decode)
- D-A3: Adaptive 1080p ↔ 720p resolution
- D-A4: `<video>`-Element direct on Pi (no canvas, no JS-Hot-Path)

**Block B — Server-Render-Stack (LOCKED):**
- D-B1: Headless Chromium for server-side render (1:1 reuse of existing JS code)
- D-B2: ONE render instance per board, shared across all clients (Pi /output/ + Dashboard preview + tablet preview consume same stream). Hybrid-Variante (Dashboard rendert lokal weiter) deferred fallback.
- D-B3: Server-only authoritative state — Pi has NO runtime-state
- D-B4: Stream-only with EXPLICIT error UIs — verbindlicher User-Constraint: NIEMALS schwarzer Bildschirm bei Disconnect

**Block C — Latency & Resilience (LOCKED):**
- D-C1: <150ms operator-click → pixel-on-Pi target (LAN)
- D-C2: Auto-Reconnect with status UI on server restart
- D-C3: WebRTC default jitter-buffer + reconnect on extended outages
- D-C4: Heartbeat-WS + WebRTC connection-state + last-frame-timestamp tracking (drei Indikatoren parallel)

**Block D — User-Contract Touchpoints (LOCKED):**
- D-D1: Align-Mode = Touch/Mouse Pi → WS → Server, server renders mesh update
- D-D2: Audio in WebRTC stream (NOT Pi-local) — USER DEVIATED FROM RECOMMENDATION
- D-D3: Pi-local DOM = status UIs only (Diagnostic Chip, Reconnect Banner, Server Error)
- D-D4: TT-Beamer splash + connection status during init

### Claude's Discretion

- D-X1: Which WebRTC server library (Node)
- D-X2: Which headless browser (puppeteer / playwright)
- D-X3: Which frame-capture pipeline
- D-X4: Encoder pipeline (passthrough vs transcoding)
- D-X5: Multi-client distribution (Mesh vs SFU)
- D-X6: Adaptive resolution trigger mechanism
- D-X7: Server-side state-restore path on restart
- D-X8: Audio mixing pipeline in headless Chromium

### Deferred Ideas (OUT OF SCOPE)

- Multi-Server / Cluster-Render
- Internet / TURN-Server / WAN streaming (LAN-only)
- Browser-Recording / Frame-Snapshot-Endpoint
- Auto-Fallback Pi auf Local-Render (bewusst deaktiviert per D-B4)
- Adaptive-FPS-Senkung im Stream (deferred unless needed)
- Backwards-Compat zu Phase-30-Local-Render-Pfad als laufender Pfad
- Schema-Migrationen, neue Animations-Typen, UX-Redesign

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| M1 | Discuss-Phase Closure (CONTEXT.md fertig) | DONE — see CONTEXT.md |
| M2 | Research-Phase Closure: technische Validierung Streaming/Encode-Stack auf Pi | THIS DOCUMENT — see § Stack-Wahl + § Audio-Capture Risk |
| M3 | Server-Side-Render Bring-up | § Component sketch §1 — Server bring-up |
| M4 | Stream-Transport Bring-up: Pi zeigt Stream live, ≥20 fps validiert | § Component sketch §2 — capture/encode pipeline |
| M5 | User-Contract-Parity (Align, PM, Multi-Area, Animation-Timeline e2e via Stream) | § Component sketch §3 + §4 |
| M6 | Fallback + Resilience definiert + getestet | § Component sketch §6 + §7 + § Test/UAT Strategy |
| M7 | UAT Pi auf Test-Board ≥20 fps mit Phase-30-Defensive als Backup | § Performance Targets + § Test/UAT Strategy |
| Hard | Mesh-Warp + 4-Corner PM (Phase 19/27/28) bleibt user-konfigurierbar | § Component sketch §1 (Headless-Chromium reuses identical render code → pixel-identisch) |
| Hard | Multi-Area + per-board Polygon (Phase 8/13) | § State-Restore §5 (server reads `config/boards/<id>.json` already) |
| Hard | Animation-Layering-Contract (Phase 12: A→B == B→A, additive) | § Component sketch §1 — same `runtime-orchestration.js` code |
| Hard | Schema v4 (Phase 26+29) — keine Migration | § State-Restore §5 (reads existing files unchanged) |
| Hard | Phase-29 Test-Suite (40/40) muss grün bleiben | § Test/UAT Strategy |

</phase_requirements>

## Project Constraints (from project state)

> No `./CLAUDE.md` in repo root. No `.claude/skills/` or `.agents/skills/`. Project conventions inferred from `.planning/STATE.md`, ROADMAP, and recent phase verifications.

- **Manual UAT-only verification on Pi hardware** (Phase 26 / Phase 30 standard) — no headless pixel-diff for stream-receive.
- **Server-authoritative state** (Phase 13). Phase 31 extends to render too. Pi keeps NO runtime-state.
- **No browser-persistence** (Phase 13). All state in `config/boards/<id>.json` + `config/global-defaults.json`.
- **Phase-29 test suite (40/40)** must remain green at phase exit.
- **Phase-30 hotfixes h6-h15** remain in code as defense-in-depth (also active inside headless Chromium — see § Risks).
- **No backwards-compat to Phase-30 local-render path as runtime-active** (D-B4); code stays in repo as dead-code safety net.
- **Test board:** Nemesis Lockdown Board A (same as Phase 30 — comparable fps baseline).

## Summary

Phase 31 transforms the Pi from a renderer into a thin display client by re-hosting the entire existing `/output/` rendering code inside a headful (under Xvfb) Chromium tab on the server, capturing its tab as a `MediaStream` (audio + video) via the puppeteer-stream Chromium-extension API, and broadcasting that stream over WebRTC through a mediasoup SFU to one or more clients (Pi `<video>` + dashboard preview + optional tablet). The Pi `/output/` becomes a 30-line WebRTC receiver plus status-overlay DOM. Render code is reused 1:1 — no GIF-decoder / mesh-warp / animation-layering re-implementation.

**Primary recommendation:** Use **mediasoup** (Node-native SFU, C++ media plane) + **headful Chromium under Xvfb** (NOT `--headless=new` mode — that path disables audio playback and WebRTC) + **puppeteer-stream** for tab MediaStream capture (Chromium extension based; supports audio+video together) + **passthrough WebRTC** (Chromium speaks WebRTC natively → publish to mediasoup → SFU fan-out). This avoids ffmpeg transcoding entirely and yields the best latency profile.

**Risk-Flag (highest priority):** Audio-in-stream (D-D2) is feasible with the recommended stack (puppeteer-stream is purpose-built for tab audio+video capture in Chromium), but it has **two confirmed limitations** that must be acknowledged in the plan:
1. `--headless=new` mode disables audio playback. Server MUST run headful Chromium under Xvfb (virtual framebuffer).
2. puppeteer-stream historically reports "very CPU intensive" with poor framerates under sustained load. **Plan must include an early-bring-up gate to measure server CPU + fps before locking in the rest of the pipeline.** If puppeteer-stream proves unstable, fallback to ffmpeg-transcode-pipeline (raw frames via CDP screencast → x264 → mediasoup PlainTransport) is documented as Plan B (§ Risks).

## Standard Stack

### Core
| Library | Version (verified 2026-05-06) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| mediasoup | ^3.x (active, multi-CPU C++ workers) | Node-native WebRTC SFU | [VERIFIED: npmjs.com/package/mediasoup, github.com/versatica/mediasoup] Industry-standard SFU for Node. Producer/Consumer model. Routes RTP without re-encoding. Best fit for "1 server-rendered stream → N clients fan-out" (D-B2). |
| puppeteer | ^24.x (verify with `npm view puppeteer version` at plan time) | Headless Chromium driver | [CITED: puppeteer.dev] Standard. Required by puppeteer-stream. |
| puppeteer-stream | ^3.x (latest 3.0.22 published ~2025-09 per npm) | Tab MediaStream capture (audio + video) | [CITED: github.com/SamuelScheit/puppeteer-stream] Only library that captures Chromium tab audio + video as a single MediaStream via Chrome extension API. Required because Chromium DevTools Protocol `Page.startScreencast` is JPEG-video-only (no audio). |
| Xvfb | system package (`apt install xvfb`) | Virtual X framebuffer for headful Chromium | [CITED: Mux blog "Lessons learned building headless chrome as a service"] Required because audio + WebRTC are disabled in `--headless=new`. |

### Supporting
| Library | Purpose | When to Use |
|---------|---------|-------------|
| ws (already in project's hf9-command-pipeline) | Existing WebSocket lib pattern | Phase 31 reuses raw WebSocket server in `server.mjs` (RFC 6455 implementation already there). Add new path `/api/webrtc/signal`. |
| ffmpeg (system) | Transcode fallback | ONLY if puppeteer-stream proves unstable on bring-up. Plan B. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| mediasoup | werift-webrtc (pure-TS WebRTC) | werift is actively maintained ([CITED: github.com/shinyoshiaki/werift-webrtc] DTLS-Chrome-132 fix 2025); pure-Node, no native compile. BUT no SFU pattern — would need to hand-roll consumer fan-out. Reject for D-B2 (3+ clients). |
| mediasoup | wrtc / @roamhq/wrtc (node-webrtc native) | Spec-compliant peer bindings; would need hand-rolled SFU on top. mediasoup is purpose-built for this. Reject. |
| mediasoup | janus-gateway | Full-featured but written in C, requires separate process + custom plugin compile. Operational overhead too high for single-server LAN deployment. Reject. |
| puppeteer | playwright | Both wrap Chromium. Playwright supports more browsers but no advantage here. puppeteer-stream is puppeteer-only. Audio capture in playwright headless mode is documented as unsupported ([CITED: github.com/microsoft/playwright/issues/6460]). Reject playwright. |
| puppeteer-stream | CDP `Page.startScreencast` | Returns JPEG frames at limited fps; **no audio**. Fails D-D2. Reject. |
| puppeteer-stream | `getDisplayMedia` in second tab | Documented unsupported in headless mode ([CITED: github.com/microsoft/playwright/issues/6460]). Even in headful, requires user-permission popup. Brittle for kiosk. Reject. |
| Headful + Xvfb | `--headless=new` mode | [CITED: chromium.org WebRTC roadmap, Mux blog] Audio playback disabled in headless; WebRTC has historical issues. Reject — use Xvfb. |
| ffmpeg-transcode pipeline | passthrough WebRTC (Chromium produces, mediasoup fans out) | Transcode adds ~30-100ms encode latency + CPU. Passthrough leverages Chromium's existing WebRTC stack (which already encodes h264 via WebCodecs/libopenh264). ~2x lower latency. Use passthrough as default; ffmpeg as Plan B only. |

**Installation (verify versions in plan):**
```bash
sudo apt install -y xvfb chromium
npm install mediasoup puppeteer puppeteer-stream
# verify each:
npm view mediasoup version
npm view puppeteer version
npm view puppeteer-stream version
```

## Architecture Patterns

### Recommended Project Structure
```
server.mjs                          # existing - extend with new mounts
src/server/                         # NEW directory for SSR sub-modules
├── ssr-render-host.mjs             # Xvfb + puppeteer launch + tab lifecycle
├── ssr-stream-publisher.mjs        # puppeteer-stream → mediasoup PlainTransport
├── ssr-mediasoup-router.mjs        # mediasoup Worker/Router/Producer/Consumer
├── ssr-webrtc-signaling.mjs        # /api/webrtc/signal WebSocket handler
└── ssr-state-restore.mjs           # rebuild full runtime-state on restart (Phase 13/29 + new active-anims persistence)

src/app/runtime/output-receiver/    # NEW — Pi /output/ thin-client code
├── receiver-bootstrap.js           # boot path (replaces runtime-orchestration on /output/)
├── receiver-webrtc-client.js       # PeerConnection + signaling client
├── receiver-status-ui.js           # diagnostic chip + reconnect banner + error UI + splash
└── receiver-input-forwarder.js     # touch/mouse → WS for align-mode (D-D1)

# UNCHANGED — runs inside headless Chromium tab loaded from server:
src/app/runtime/runtime-orchestration.js
src/app/runtime/render/*
src/app/runtime/viewport/runtime-projection-{gl,2d-fallback,grid}-renderer.js
```

### Pattern 1: Headful-Chromium-Under-Xvfb Render Host
**What:** Server spawns Xvfb (virtual X display, e.g. `:99`), then puppeteer launches Chromium against that display, navigates to `http://localhost:4173/output?ssr=1`. The page runs the existing render pipeline byte-identical to current Pi behavior.

**When to use:** Always (Phase 31 default).

**Example (sketch):**
```js
// Source: synthesis from Mux blog + puppeteer docs + puppeteer-stream README
import { spawn } from "node:child_process";
import { launch, getStream } from "puppeteer-stream";

const xvfb = spawn("Xvfb", [":99", "-screen", "0", "1920x1080x24"]);
process.env.DISPLAY = ":99";

const browser = await launch({
  executablePath: "/usr/bin/chromium",
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  args: [
    "--no-sandbox",
    "--enable-features=VaapiVideoEncoder",  // Intel iGPU; remove on AMD/NVIDIA
    "--use-gl=egl",                          // GPU-accelerated canvas
    "--autoplay-policy=no-user-gesture-required",  // for audio
    "--disable-gpu-vsync",                   // free-running rAF (optional, for fps measurement)
  ],
});

const page = await browser.newPage();
await page.goto("http://127.0.0.1:4173/output?ssr=1");

const stream = await getStream(page, {
  audio: true,           // enables tab audio capture
  video: true,
  videoBitsPerSecond: 5_000_000,
  frameSize: 20,         // 20ms slice = 50fps cap; will be limited by rAF
});
// `stream` is a Node Readable yielding webm chunks (Opus + VP8/VP9/H264).
```

**Reuses:** Phase 30 hotfixes h6-h15 (GIF parser, mp4 freshness, GL stability) all run unchanged inside the tab.

### Pattern 2: Passthrough-WebRTC via mediasoup PlainTransport
**What:** Instead of decoding the puppeteer-stream webm chunks and re-encoding, treat the Chromium tab as if it were a WebRTC peer that produces media; mediasoup `PlainTransport` ingests RTP. Then any number of WebRTC consumer clients (Pi, dashboard, tablet) connect via mediasoup `WebRtcTransport` and consume the same Producer.

**Two implementation routes (researcher recommends Route B for simplicity):**

- **Route A (zero-decode):** puppeteer-stream → ffmpeg pipe → demux → mediasoup PlainTransport (RTP). Adds ffmpeg dependency, but no re-encode.
- **Route B (in-page WebRTC):** Inject script into the headless tab that runs `RTCPeerConnection` against mediasoup's signaling endpoint. The browser's own WebRTC stack uploads h264/Opus directly. **No ffmpeg needed.** This is the cleanest pattern and is documented in mediasoup's broadcast example tree.

**Recommendation:** Start with Route B (cleaner, browser already speaks WebRTC). Route A is the fallback if puppeteer-stream cannot be made to publish via in-page PeerConnection.

```js
// Route B sketch — inject into the page after navigation:
await page.evaluate(async (signalUrl, roomId) => {
  // Capture tab content via getDisplayMedia + getUserMedia in-page
  const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  // signal to mediasoup, attach as WebRTC sender
  const pc = new RTCPeerConnection();
  display.getTracks().forEach(t => pc.addTrack(t, display));
  // ... mediasoup-client publish flow ...
}, signalUrl, roomId);
```
*Note:* `getDisplayMedia` from inside the tab requires permission auto-grant (`--auto-select-desktop-capture-source` flag).

### Pattern 3: Pi /output/ Thin-Client Receiver
**What:** Replace `runtime-orchestration.js` boot on `/output/` with a 200-line receiver. Subscribe to mediasoup Consumer, attach `MediaStream` to `<video>`, run heartbeat WS in parallel, render status overlays.

**Example:**
```html
<!-- index.html — Pi /output/ DOM -->
<body data-output-role="final-output">
  <div id="ssr-splash" class="ssr-splash">  <!-- D-D4 -->
    <div class="ssr-splash-logo">TableTop Beamer</div>
    <div class="ssr-splash-status">Connecting to render server…</div>
    <div class="ssr-splash-spinner"></div>
  </div>
  <video id="ssr-video" autoplay muted playsinline></video>
  <div id="ssr-reconnect-banner" hidden>Server reconnecting…</div>
  <div id="ssr-error-overlay" hidden>
    <div class="ssr-error-title">Render server unreachable</div>
    <button id="ssr-retry-button">Retry</button>
  </div>
  <div id="output-status-chip">…</div>  <!-- existing diagnostic chip -->
</body>
```

```js
// receiver-webrtc-client.js — sketch
const pc = new RTCPeerConnection({ iceServers: [] });  // LAN-only, no STUN
pc.ontrack = (e) => { document.getElementById("ssr-video").srcObject = e.streams[0]; };
pc.onconnectionstatechange = () => updateStatus(pc.connectionState);

// signaling via existing WS or new path
const ws = new WebSocket(`ws://${location.host}/api/webrtc/signal?role=final-output`);
ws.onmessage = (e) => handleSignaling(JSON.parse(e.data));
```

### Anti-Patterns to Avoid
- **Hand-roll a WebRTC server**: SDP / ICE / DTLS / SRTP is 5 RFCs of complexity. Use mediasoup. (D-X1 confirms.)
- **Use `--headless=new`**: disables audio playback and WebRTC ([CITED: Mux blog]). USE Xvfb.
- **Use `Page.startScreencast` (CDP) for stream**: JPEG-only, no audio, capped fps. ([CITED: browserless.io blog].)
- **Re-implement render pipeline server-side in node-canvas / skia**: defeats the point of D-B1. Months of work, regression risk.
- **Run mesh-warp computation server-side AND on Pi**: D-A4 says Pi has no canvas; the server-rendered stream already contains the warp.
- **Decode the webm output of puppeteer-stream in node + re-encode**: kills latency. Use passthrough.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebRTC SFU / fan-out | DIY peer-to-peer broadcast | mediasoup | RTP routing, simulcast, congestion control = years of work |
| Headless tab audio+video capture | DIY chrome extension | puppeteer-stream | Already-working Chrome extension + Node API |
| Virtual display for headful Chromium | Build X server | Xvfb | apt-installable, ubiquitous |
| WebRTC signaling protocol | DIY SDP exchange | mediasoup-client + existing WS in `server.mjs` | mediasoup defines the message shape |
| h264 encode | Build encoder | Chromium's built-in WebRTC encoder (libopenh264 / VAAPI / NVENC depending on hardware) | The browser already does this |
| Adaptive bitrate (D-A3) | Build heuristics | WebRTC's built-in `googCpuOveruseDetection` + simulcast | Browser has been tuning this for 10 years |
| Reconnect logic | DIY everything | RTCPeerConnection's connectionstatechange + simple retry on `failed` / `disconnected` | Plus heartbeat WS as third indicator (D-C4) |
| Audio mixing across animations | DIY mixer | Web Audio API in the headless tab (existing `runtime-audio.js` pattern, just runs server-side now) | Browser-native, well-documented |

**Key insight:** Phase 31 succeeds because **Chromium itself handles 90% of the heavy lifting** (WebRTC peer, h264 encoder, audio capture, congestion control, jitter buffer on receiver side). The job of `server.mjs` is to (1) start the tab, (2) signal mediasoup, (3) keep the runtime-state alive across restarts. Don't reinvent what the browser already does.

## Common Pitfalls

### Pitfall 1: Headless mode disables audio (RISK ITEM, see § Audio-Capture Risk)
**What goes wrong:** Plan adopts `puppeteer.launch({ headless: "new" })`. Audio capture returns silent track or fails outright. WebRTC also flaky.
**Why it happens:** [CITED: Mux blog] Chromium intentionally disables audio playback in headless mode (anti-fingerprinting + resource savings) and historically disables WebRTC.
**How to avoid:** Use Xvfb + headful Chromium. Detect via `chrome://gpu` (audio status) and a basic audio-track presence check during bring-up.
**Warning signs:** Silent stream, or WebRTC offer fails to negotiate audio mid-line. UAT must include audio-confirmation step.

### Pitfall 2: Mesh-warp pixel drift between Pi-render and server-render
**What goes wrong:** Server-rendered mesh-warp doesn't perfectly match the Pi's prior pixel output. User notices alignment shift.
**Why it happens:** Different GPU drivers (server's likely NVIDIA/Intel, Pi's VC4) can produce minor sub-pixel differences in WebGL.
**How to avoid:** Same Chromium version on both. Force `--use-gl=swiftshader` (CPU rasterizer) on server if pixel-identity is required, at fps cost. UAT explicitly compares pre/post-pivot screenshots at corner points.
**Warning signs:** Squish bars, mid-line drags, internal grid points showing 1-2px shifts.

### Pitfall 3: Phase-30 hotfixes silently no-op in headless Chromium
**What goes wrong:** h7 / h11 / h14 (rAF yield, ImageBitmap pre-bake, parser yields) target Pi-VC4 timing. On a fast server they may not trigger, may even regress (e.g. T15 256px cap reduces server quality unnecessarily).
**Why it happens:** The hotfixes are *defensive* against Pi limits; they assume Pi-class CPU/GPU.
**How to avoid:** Audit each Phase-30 hotfix at plan-time. List which assume Pi limits (likely all of T7/T11/T14/T15 — GIF downsampling), gate behind a `serverSideRender` flag if necessary. ROADMAP says they "remain im Code als Defense-in-Depth" — confirm runtime-active status doesn't matter (server overcapacity absorbs the cost).
**Warning signs:** GIF quality drop on /output/ vs old Pi output. Solid-color seams reappear. Mp4 loop seam visible.

### Pitfall 4: Server-tab silently dies, stream freezes, no error surfacing
**What goes wrong:** Chromium crashes on server (OOM, GL driver). Stream still has the last frame buffered; clients see frozen image instead of error.
**Why it happens:** WebRTC is "lossy" by design — if the publisher dies, consumers don't get an explicit close, just freeze.
**How to avoid:** D-C4's heartbeat-WS is the primary signal. Plan task: server's render-host wraps `browser.process()` with crash handler → broadcast `render-host-down` over heartbeat WS → Pi shows error UI per D-D3/D-B4. Auto-restart with backoff.
**Warning signs:** Stream frozen but `RTCPeerConnection.connectionState === "connected"`. Last-frame-timestamp tracking (D-C4 indicator 2) catches this.

### Pitfall 5: `<audio>` per animation in headless tab not captured
**What goes wrong:** Existing `runtime-audio.js` uses HTML `<audio>` elements per animation event. In headless tab without proper autoplay policy + audio context, they may play silently or be muted.
**Why it happens:** Chromium autoplay restrictions; audio context suspended without user gesture.
**How to avoid:** Launch flag `--autoplay-policy=no-user-gesture-required` (per Pattern 1). Plan task: verify `runtime-audio.js` `<audio>` playback produces sound in the captured MediaStream during early bring-up (Wave 0 smoke test).
**Warning signs:** Silent audio in stream while video moves correctly. Web-Audio-API alternative (D-X8 fallback) is the contingency.

### Pitfall 6: Touch input from /output/ during align-mode is now an extra round-trip
**What goes wrong:** User drags mesh-warp corner on Pi. Drag feels laggy because of WS RTT + render + WebRTC frame.
**Why it happens:** D-D1 design. Inevitable with server-render. LAN keeps it tolerable.
**How to avoid:** Pi sends drag events at full input rate (touchmove fires ~60Hz). Server coalesces (the existing `runtime-live-sync-core.js` has `dequeueFairMutation` / coalescing already — Phase 31 reuses). Optionally, Pi can render a *local-only* SVG ghost of the dragged handle for instant visual feedback while the streamed frame catches up.
**Warning signs:** Align-mode drag feels >200ms lag. Plan task: instrument WS RTT + frame-arrival delta during align-mode UAT.

### Pitfall 7: mediasoup native compile failure on server
**What goes wrong:** `npm install mediasoup` fails to compile C++ workers on server.
**Why it happens:** mediasoup requires Python 3, gcc/clang, make. ARM64 servers may need extra flags.
**How to avoid:** Wave 0 task: verify `npm install mediasoup` succeeds on the target server. Document fallback: pre-built Docker image (versatica/mediasoup ships one) or werift-webrtc + DIY fan-out (one-tab-per-client — wasteful but functional).
**Warning signs:** Build error on `npm install`. CONTEXT says assumed server is "user's dev laptop or small box on LAN" — both likely x86_64 Linux/macOS, well-supported.

### Pitfall 8: Active-Animations layer NOT covered by Phase-13/29 state restore (D-X7 gap)
**What goes wrong:** Server restarts mid-show. Phase-13 restores boards, polygons, fx-config. But "alarm currently running in room R3" is in-memory only — it disappears.
**Why it happens:** Phase-13 considers config persistent. Active animations were ephemeral runtime-state on the (formerly) Pi.
**How to avoid:** § State-Restore §5 — Phase 31 must add a small persistence layer for `state.runningAnimations` (already a list in `runtime-orchestration.js`). Write to disk on mutation, replay on tab boot.
**Warning signs:** Server restart loses currently-playing room animations. UAT step: trigger animation, restart server, verify animation resumes.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data (server-disk)** | `config/global-defaults.json` (Phase 13/29 schema v4), `config/boards/<id>.json` (per-board state), `config/projection-profiles.json` (mesh-warp profiles), `config/asset-manifest.json` (sha256 hashes — Phase 28 B5). All HAVE on-disk persistence. | NONE — server already reads these. State-restore on tab-boot reads same paths. |
| **Stored data (in-memory only — GAP)** | `state.runningAnimations` (active-animations list in `runtime-orchestration.js`), `liveSessionState.snapshot.runtime` in `server.mjs` (already in-memory only — see line 116), `outsideMp4PlaybackStateByBoard` map | **NEW persistence layer needed** — write `runningAnimations` to disk debounced (~200ms, Phase-13 pattern) into `config/runtime-active-animations.json` (NEW file). Replay on tab boot. |
| **Live service config** | None — no n8n / external services. All config lives in repo. | NONE. |
| **OS-registered state** | None — server.mjs is invoked manually or via systemd/pm2 (out of repo scope). | NONE — operational concern, not phase scope. |
| **Secrets and env vars** | `process.env.HOST`, `process.env.PORT`, `process.env.TT_BEAMER_LIVE_LOG_PATH` (server.mjs lines 14-18). Phase 31 may add `process.env.SSR_DISPLAY=:99`, `process.env.SSR_BROWSER_BIN=/usr/bin/chromium`. | Document new env vars in plan; no secret rotation. |
| **Build artifacts / installed packages** | `node_modules/` (npm install adds mediasoup native C++ worker binaries). `package-lock.json` does NOT exist in repo per current ls (verify in plan). | Plan task: ensure `package.json` lists new deps with locked versions; Wave 0 verifies install succeeds. |

## Stack-Wahl Recommendations (D-X1..D-X8)

### D-X1: WebRTC Server Library → **mediasoup** [HIGH confidence]
- Node-native API, C++ media plane (multi-CPU workers).
- Purpose-built for Producer→N-Consumers fan-out (matches D-B2).
- Active maintenance ([CITED: github.com/versatica/mediasoup]).
- Spec-compliant; battle-tested (Mediasoft, Daily, dozens of others).
- **ARM64:** native build supported. If user's server is ARM (unlikely per CONTEXT "stronger hardware than Pi" hint), verify in Wave 0.
- Reject werift (no SFU pattern), wrtc (peer-only, no fan-out), janus (separate C process + plugin compile).

### D-X2: Headless Browser → **puppeteer + Xvfb (headful)** [HIGH confidence]
- puppeteer-stream is puppeteer-only; that closes the choice.
- Playwright's `getDisplayMedia` is documented unsupported in headless ([CITED: github.com/microsoft/playwright/issues/6460]).
- **Critical:** NOT `--headless=new` — must run headful under Xvfb. Audio + WebRTC are disabled in `--headless=new` ([CITED: Mux blog "Lessons learned"]).
- Memory footprint: ~200-400 MB per Chromium tab (CONTEXT estimate). One tab per board (D-B2) → very manageable on any server.

### D-X3: Frame Capture Pipeline → **puppeteer-stream MediaStream (audio+video together)** [HIGH confidence on capability, MEDIUM on stability]
- Returns Node Readable of webm chunks containing Opus audio + VP8/9 or H264 video.
- **Alternative considered:** in-page `getDisplayMedia` (Pattern 2 Route B) — actually preferred for the WebRTC path because it produces a real MediaStream that can be added directly to RTCPeerConnection inside the tab.
- **Final recommendation:** Use Route B (in-page `getDisplayMedia` + `RTCPeerConnection` to mediasoup) as primary. puppeteer-stream is the **fallback** if in-page WebRTC publishing has signaling complications.
- Reject CDP `Page.startScreencast`: JPEG-only, no audio.

### D-X4: Encoder Pipeline → **Passthrough (Chromium's WebRTC encoder publishes directly to mediasoup)** [HIGH confidence]
- Chromium contains a tuned h264 + Opus encoder + WebRTC sender stack. Reusing it is free.
- Passthrough latency: ~30-80 ms encode + RTP routing. Total Operator-click → pixel: WS-RTT (5-15ms LAN) + render frame (~16-33ms) + encode (30-80ms) + decode-display (16-33ms on Pi). **Realistic budget: 70-160ms — fits D-C1 (<150ms) under good conditions.**
- ffmpeg transcode would add 50-200ms encode latency + dependency. Reserved as Plan B.
- **Hardware encoder availability:** depends on user's server. Pass `--enable-features=VaapiVideoEncoder` (Intel iGPU), `--enable-features=Vp9HardwareEncode,H264HardwareEncode` (NVIDIA NVENC). Software libopenh264 is the fallback — workable for one stream at 1080p30 on any modern CPU.

### D-X5: Multi-Client Distribution → **SFU via mediasoup** (NOT mesh) [HIGH confidence]
- CONTEXT says "2-3 clients (Pi + dashboard + maybe tablet)". Mesh would mean Chromium tab handles 3 PeerConnections. Possible but doesn't scale and complicates server-tab JS.
- mediasoup SFU adds one Producer + N Consumers. CPU cost is RTP routing only (no re-encode). Marginal overhead.
- D-B2 says "ONE render instance per board, shared". SFU is the natural shape.

### D-X6: Adaptive Resolution (D-A3) → **WebRTC Simulcast (default behavior)** [HIGH confidence]
- Chromium produces simulcast layers natively when `RTCRtpSender.setParameters({ encodings: [{ rid: "low", scaleResolutionDownBy: 2 }, { rid: "high" }] })` is configured.
- mediasoup forwards the layer based on consumer's preferred-layers signal (`consumer.setPreferredLayers`).
- Trigger: `RTCPeerConnection.getStats()` reports `bitrate` and `packetLoss`. If consumer detects packetLoss > threshold for 5s, switch preferred layer down.
- Pi receiver implements simple heuristic: track `RTCRtpReceiver.getStats()` → packets-lost / framesDropped. Above threshold, signal server to drop simulcast layer.
- **Default config is fine for LAN.** Custom heuristics deferred unless UAT shows insufficient adaptation.

### D-X7: Server-State-Restore on Restart → **Phase-13 config files + NEW active-animations persistence** [HIGH confidence]
- Already on disk (read by `server.mjs`):
  - `config/boards/<id>.json` — boards, polygons, room catalog, fx-config (Phase 26+29 schema v4)
  - `config/global-defaults.json` — global animation speed, audio config, projection mapping defaults
  - `config/projection-profiles.json` — saved align-mode profiles
  - `config/asset-manifest.json` — sha256 hashes for cache-busting
- **GAP:** `state.runningAnimations` (active animations) is in-memory only. The server `liveSessionState.snapshot.runtime` is already in-memory only (`server.mjs:116`).
- **NEW persistence (Phase 31 task):**
  - File: `config/runtime-active-animations.json` (NEW)
  - Schema (proposal): `{ schema: "tt-beamer.runtime-state.v1", boardId, runningAnimations: [...] }`
  - Write debounced 200ms on `runningAnimations` mutation (reuse `scheduleGlobalConfigWrite` pattern from Phase 13).
  - Replay on tab boot: SSR bootstrap reads file, populates state.
  - **Note:** Replay must respect natural-end semantics — if the saved animation has `durationMs` and `startedAt`, and `now() - startedAt > durationMs` → drop, don't re-fire. (Phase 11 HF6 / Phase 12 contracts.)

### D-X8: Audio Mixing Pipeline → **HTML5 `<audio>` (existing pattern, runs in tab)** [MEDIUM confidence — needs Wave 0 verification]
- Existing `runtime-audio.js` + `runtime-wire-room-audio-binders.js` use HTML5 `<audio>` elements triggered on animation events. This code runs unchanged inside the headless tab.
- Tab capture (puppeteer-stream OR in-page `getDisplayMedia({audio:true})`) automatically captures all `<audio>` output mixed with the page audio context.
- **Required launch flags:** `--autoplay-policy=no-user-gesture-required` so HTML5 `<audio>.play()` doesn't reject.
- **Why MEDIUM confidence:** the existing `<audio>`-tag code path has not been validated under headless capture. Wave 0 verification step required (see § Audio-Capture Risk Assessment).
- Web Audio API alternative (pre-loaded buffers) reserved as fallback if `<audio>`-tag path is unreliable.

## Audio-Capture Risk Assessment (D-D2 Eskalations-Tor)

**This section is the highest-priority verification gate. The user explicitly deviated from the recommendation; the plan MUST not silently proceed if the audio path is unstable.**

### Verified facts (from research)

1. **`--headless=new` mode disables audio playback.** [CITED: Mux blog "Lessons learned building headless chrome as a service"; multiple Chromium issue references]. Confirmed.
2. **Headful Chromium under Xvfb fully supports audio.** Audio plays into the system audio device. With ALSA/PulseAudio configured, can be captured.
3. **puppeteer-stream is purpose-built for tab audio+video capture.** Uses Chrome extension `chrome.tabCapture` API to grab a MediaStream of the page audio + video. Latest 3.0.22 (~2025-09). Active maintenance.
4. **Known issue: puppeteer-stream has been reported as "very CPU intensive" with poor framerates** ([CITED: github.com/SamuelScheit/puppeteer-stream issues]). Severity is workload-dependent.
5. **`getDisplayMedia` inside the headful tab is supported** with `--auto-select-desktop-capture-source` and is the standard pattern for in-page WebRTC publish (per mediasoup broadcasting examples).

### Risk classification: **MEDIUM** (mitigable, not blocking)

The audio path is feasible. The mitigation is conservative — Wave 0 audio-capture smoke test:
- **Wave 0 gate:** Server starts Xvfb + Chromium + opens a test page that plays a known audio asset (e.g. `resources/sounds/alarm.mp3`). Capture stream via in-page `getDisplayMedia({audio: true})` OR puppeteer-stream. Pipe to `ffmpeg -f webm -i pipe:0 -map 0:a output.wav`. Verify output WAV contains the alarm tone (RMS amplitude > threshold).
- **If gate fails:** Eskalation. Two fallback paths, in priority order:
  - **Fallback A:** Switch to PulseAudio loopback module + ffmpeg capture (`pulseaudio --start && pactl load-module module-null-sink`). Captures *system* audio, decoupled from the page. Adds operational complexity but is the canonical "headless server records audio" recipe on Linux.
  - **Fallback B:** Re-open D-D2 with user. Recommend Pi-local audio path (the original recommendation): server broadcasts WS audio-trigger events; Pi's existing `runtime-wire-room-audio-binders.js` plays HTML5 `<audio>`. Sync drift exists but is typically <50ms over LAN. **This is the eskalation if Fallback A also fails.**

### Plan implication

The audio path MUST have a Wave 0 verification step BEFORE the rest of the plan locks in. The plan's task ledger should look like:
- Wave 0: Server-tab-bring-up + audio-capture smoke (if fails: eskalation)
- Wave 1: WebRTC video stream bring-up
- Wave 2: Pi receiver re-skin
- ... (rest of plan)

**Do NOT design around audio-in-stream until Wave 0 passes.** This is the verbindlicher User-Constraint check the researcher is required to call out.

## Code Examples

Verified patterns from official sources:

### Server-side bring-up (sketch)
```js
// Source: synthesis from puppeteer-stream README + mediasoup broadcasting demo
// File: src/server/ssr-render-host.mjs (NEW)
import { spawn } from "node:child_process";
import { launch, getStream } from "puppeteer-stream";
import * as mediasoup from "mediasoup";

export async function bootSsrHost({ port, mediasoupRouter }) {
  // Step 1: Xvfb
  const xvfb = spawn("Xvfb", [":99", "-screen", "0", "1920x1080x24"], { stdio: "inherit" });
  process.env.DISPLAY = ":99";
  await new Promise(r => setTimeout(r, 500));  // Xvfb ready

  // Step 2: Chromium via puppeteer-stream
  const browser = await launch({
    executablePath: "/usr/bin/chromium",
    headless: false,  // CRITICAL: not headless=new
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
    args: [
      "--no-sandbox",
      "--autoplay-policy=no-user-gesture-required",
      "--use-gl=egl",
    ],
  });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/output?ssr=1`);

  // Step 3: route page MediaStream into mediasoup
  // Route B (preferred): inject mediasoup-client signaling into the page
  await page.addScriptTag({ url: "https://unpkg.com/mediasoup-client@latest/lib/index.js" });
  await page.evaluate(async (rtpCapabilities, transportOptions) => {
    const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    // ... mediasoup-client publish flow ...
  }, mediasoupRouter.rtpCapabilities, /* transport options */);

  // Step 4: crash recovery
  browser.on("disconnected", () => {
    console.error("[ssr-host] Chromium tab died, restarting…");
    setTimeout(() => bootSsrHost({ port, mediasoupRouter }), 1000);
  });

  return { browser, page, xvfb };
}
```

### Pi receiver (sketch)
```js
// Source: synthesis from MDN WebRTC docs + mediasoup-client examples
// File: src/app/runtime/output-receiver/receiver-webrtc-client.js (NEW)
export async function bootReceiver() {
  const video = document.getElementById("ssr-video");
  const splash = document.getElementById("ssr-splash");
  const errorOverlay = document.getElementById("ssr-error-overlay");

  const ws = new WebSocket(`ws://${location.host}/api/webrtc/signal?role=final-output`);
  const pc = new RTCPeerConnection({ iceServers: [] });  // LAN-only

  pc.ontrack = (e) => {
    video.srcObject = e.streams[0];
    splash.hidden = true;
  };

  pc.onconnectionstatechange = () => {
    const s = pc.connectionState;
    if (s === "connected") splash.hidden = true;
    if (s === "disconnected" || s === "failed") {
      showReconnectBanner();  // D-C2
      setTimeout(reconnect, 1000);
    }
  };

  // D-C4: heartbeat WS as third indicator
  let lastHeartbeat = Date.now();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "heartbeat") lastHeartbeat = Date.now();
    if (msg.type === "render-host-down") showErrorOverlay();
  };
  setInterval(() => {
    if (Date.now() - lastHeartbeat > 3000) showReconnectBanner();
  }, 1000);

  // D-C4 indicator 2: last-frame-timestamp via requestVideoFrameCallback
  let lastFrameAt = 0;
  function trackFrames() {
    video.requestVideoFrameCallback(() => {
      lastFrameAt = performance.now();
      trackFrames();
    });
  }
  trackFrames();
  setInterval(() => {
    if (performance.now() - lastFrameAt > 3000 && pc.connectionState === "connected") {
      // Stream connected but frozen — server-tab likely crashed
      showErrorOverlay();
    }
  }, 1000);

  // ... signaling ...
}
```

### Align-Mode forwarding (sketch)
```js
// File: src/app/runtime/output-receiver/receiver-input-forwarder.js (NEW)
// Pi forwards touch/mouse → server WS. Server applies via existing live-sync-core.
const overlay = document.getElementById("ssr-align-overlay");
overlay.addEventListener("pointerdown", (e) => sendDrag(e, "start"));
overlay.addEventListener("pointermove", (e) => sendDrag(e, "move"));
overlay.addEventListener("pointerup", (e) => sendDrag(e, "end"));

function sendDrag(e, phase) {
  if (!alignModeActive) return;
  ws.send(JSON.stringify({
    type: "live-mutation",
    mutationType: "align-corner-drag",
    payload: { phase, x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight, vertexId: hitTestVertex(e) },
  }));
  // Optional: render local SVG ghost for instant feedback (Pitfall 6 mitigation)
}
```

## State of the Art

| Old Approach (Phase 30) | New Approach (Phase 31) | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pi runs full render pipeline at 1080p (fx-canvas + N rooms + GIF putImageData + mp4 drawImage + Mesh-Warp) | Server runs identical render pipeline; Pi is `<video>`-receiver | Phase 31 | fps lifted from ~12 to ≥20 (target ≥24) |
| Pi-local audio (HTML5 `<audio>` + WS triggers) | Audio in WebRTC stream from server | Phase 31 D-D2 | Guaranteed A/V sync; user deviation from recommendation |
| Pi has runtime-state slice (active animations, mesh-warp config) | Server-only authoritative state, Pi has zero runtime-state | Phase 31 D-B3 | Pi crashes don't lose state; reconnect just re-attaches stream |
| Diagnostic chip on Pi reads local rAF + frame cost | Diagnostic chip on Pi reads received-fps + connection state + heartbeat freshness | Phase 31 D-D3 | Different metrics but same UX position |
| Phase-30 GIF/mp4 hotfixes h6-h15 are critical for fps | Same hotfixes still in code, run server-side, but no longer on critical path | Phase 31 | Server overcapacity absorbs cost; hotfixes are defense-in-depth only |

**Deprecated/outdated approaches inside this codebase:**
- Pi-side mesh-warp triangle rasterization (still in `runtime-projection-2d-fallback-renderer.js`) — runs on server now; Pi's GL/2D fork is moot.
- Pi-side `outsideMp4PlaybackStateByBoard` mirror — exists for split-screen-like Phase-30 patterns; Pi runs zero render code in Phase 31.
- Phase-30 `?perf_skip_*` URL flags (already removed in 30-04 T5).

## Component-by-Component Implementation Sketch

### §1. Server Bring-Up Plan

**Files affected:**
- `server.mjs` — extend with Xvfb spawn + puppeteer launch + mediasoup boot.
- NEW: `src/server/ssr-render-host.mjs` — Xvfb + puppeteer lifecycle.
- NEW: `src/server/ssr-mediasoup-router.mjs` — mediasoup Worker/Router init, transport factories.
- NEW: `src/server/ssr-webrtc-signaling.mjs` — `/api/webrtc/signal` WS handler, signaling protocol per mediasoup-client.
- NEW: `src/server/ssr-state-restore.mjs` — read on-disk state + replay running animations.

**Boot sequence:**
1. `server.mjs` startup → load existing config files (Phase 13/29 unchanged).
2. NEW: load `config/runtime-active-animations.json` (Phase 31 §5 — replay state).
3. NEW: spawn mediasoup Worker + create Router with H264 + Opus rtpCapabilities.
4. NEW: spawn Xvfb (`:99`).
5. NEW: launch headful Chromium via puppeteer, navigate to `http://127.0.0.1:${PORT}/output?ssr=1`.
6. Page loads existing `runtime-orchestration.js`. Existing live-sync WS attaches as `role=ssr-tab` (NEW role).
7. Inject mediasoup-client signaling script into page; produce video + audio tracks via `getDisplayMedia`.
8. Existing `attachLiveWebSocket` continues to handle dashboard / Pi / tablet clients.
9. NEW: `attachWebRtcSignaling` on path `/api/webrtc/signal` accepts consumer connections (Pi + dashboard preview + tablet).

### §2. Capture+Encode Pipeline

**Concrete API calls:**
- In-page (after navigation): `await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30, width: 1920, height: 1080 }, audio: { autoGainControl: false, echoCancellation: false } })`.
- Add tracks to `RTCPeerConnection` configured with mediasoup transport ICE candidates.
- mediasoup Producer is created on the server via the WebRTC transport.
- Frame format: H264 (preferred for Pi VC4 hardware decode) — set via `RTCRtpSender.setCodecPreferences()`.
- FPS budget: rAF-driven (no explicit fps cap server-side); WebRTC adapts.

**Bandwidth at 1080p@30fps H264:** 4-8 Mbit/s sustained, 12 Mbit/s peak (typical h264 medium quality). LAN: trivial. Pi WLAN: tight but workable on 5GHz.

**Adaptive (D-A3):** Configure simulcast layers in `RTCRtpSender` with two encodings (`scaleResolutionDownBy: 1` and `2`). Pi reports `getStats()` packetLoss; if >5% over 5s, mediasoup-side `consumer.setPreferredLayers({ spatialLayer: 0 })`.

### §3. Pi /output/ Receiver Re-skin

**Files affected:**
- `index.html` — add `<video id="ssr-video">`, `<div id="ssr-splash">`, `<div id="ssr-reconnect-banner">`, `<div id="ssr-error-overlay">`. Hide existing `#stage`, `#fx-canvas`, `#fx-gl-canvas`, `#room-overlay` on `body[data-output-role="final-output"]`.
- `src/styles.css` — new section `.ssr-*` styles. Reconnect-banner + error-overlay use the same Phase-13-server-unreachable visual pattern.
- NEW: `src/app/runtime/output-receiver/receiver-bootstrap.js` — boot path activated when `body[data-output-role="final-output"]`.
- NEW: `src/app/runtime/output-receiver/receiver-webrtc-client.js`.
- NEW: `src/app/runtime/output-receiver/receiver-status-ui.js`.
- NEW: `src/app/runtime/output-receiver/receiver-input-forwarder.js` (align-mode).
- `src/app/runtime/runtime-orchestration.js` — add early-exit branch `if (outputRole === OUTPUT_ROLE_FINAL && !ssrLocalRender) return bootReceiver();`. (`?ssr=1` query is the in-tab marker that the SSR Chromium tab itself runs the FULL pipeline; Pi `/output/` does NOT have `?ssr=1` and runs the receiver.)

**Reconnect logic:** RTCPeerConnection `connectionstatechange` → `failed`/`disconnected` → 1s backoff → re-create PC + re-signal. Banner remains visible during reconnect.

**Status UI overlays:** absolute-positioned over `<video>`, z-index above. Existing `output-status-chip` retained but reads from new metrics source (received-frame-fps via `requestVideoFrameCallback`, connection-state, heartbeat freshness).

### §4. Align-Mode WebSocket Roundtrip (D-D1)

**Event shape (new mutationType added to `LIVE_MUTATION_TYPES` set in server.mjs:124):**
```js
{
  type: "live-mutation",
  mutationType: "align-corner-drag",
  payload: { phase: "start"|"move"|"end", vertexId: number, normalizedX: 0..1, normalizedY: 0..1, profileId: string }
}
```

**Server-side:** Reuse existing `enqueueLiveMutation` → `dequeueFairMutation` (server.mjs:1500+) — it already coalesces same-type events. Apply the drag updates the server's mesh-warp profile state. The SSR Chromium tab has the same `live-sync-core.js` listener wired (it's just another live-sync client) and re-renders the next frame with the new mesh — Pi sees the update via the WebRTC stream.

**Optional Pi-local SVG ghost** (Pitfall 6): receiver-input-forwarder.js renders an SVG circle at the dragged corner for instant visual feedback while waiting for the streamed frame. Removed on `pointerup`.

### §5. State-Restore on Server Restart (D-X7)

**Existing on-disk state (covers ~95%):**
- Boards (`config/boards/<id>.json`) — Phase 26+29 schema v4. Read by `server.mjs` at startup. Includes: roomCatalog, polygons, outsideFx, roomFx, defaultAnimations, lastUsedProfileName, etc.
- Global defaults (`config/global-defaults.json`) — read at startup.
- Projection profiles (`config/projection-profiles.json`) — read at startup.
- Asset manifest (`config/asset-manifest.json`).

**Gap to fill (NEW — Phase 31 task):**
- File: `config/runtime-active-animations.json` (NEW).
- Schema: `{ schema: "tt-beamer.runtime-active.v1", boardId: string, runningAnimations: [{...same shape as state.runningAnimations}], persistedAt: ISO8601 }`.
- Write trigger: every mutation to `state.runningAnimations` (debounced 200ms via `scheduleGlobalConfigWrite` pattern from Phase 13).
- Replay trigger: on SSR-tab boot, before the first `draw()` call. Filter expired (`startedAt + durationMs < now`) per Phase 11 HF6 + Phase 12 contracts. Re-fire `runAnimationFromTrigger` for each survivor.

**Trade-off:** Brief visual gap (1-2s) during server restart while tab boots. Pi shows reconnect banner during this window per D-C2.

### §6. Audio Mixing in Headless Chromium (D-X8)

**Recommended path:** existing `runtime-audio.js` HTML5 `<audio>` elements run unchanged inside the SSR tab. Tab's audio output is captured by `getDisplayMedia({audio: true})` (or puppeteer-stream's audio track).

**Required browser flags:** `--autoplay-policy=no-user-gesture-required`.

**Wave 0 verification (REQUIRED before plan locks):** Smoke test playing `resources/sounds/alarm.mp3` in tab, capturing audio track, decoding via ffmpeg, verifying RMS amplitude > silence threshold.

**Fallback (if HTML5 `<audio>` capture is unstable):** Web Audio API in tab — pre-load all sounds into `AudioBuffer`s, play via `AudioBufferSourceNode` connected to `AudioContext.destination`. Captured by the same MediaStream.

### §7. Dashboard Impact

**Recommendation: Dashboard preview consumes same WebRTC stream as Pi (per D-B2 default).**

Rationale:
- Single source of truth — operator sees identical pixels to projector.
- Lower complexity vs Hybrid (no dual render code paths to maintain).
- Bandwidth: dashboard is on LAN, no constraint.
- Latency: WebRTC LAN ~30-100ms — operator's input → server → render → stream → dashboard back is ~100ms loop. Tolerable for non-realtime dashboard interactions (the dashboard is *control*, not edit-while-projection).

**Concession to revisit:** if UAT shows dashboard feels laggy during align-mode editing, fall back to Hybrid (dashboard renders locally; Pi receives stream) — the Phase-30 render code is still in repo, gated behind a flag. Document in plan as a Wave-late checkpoint.

**Implementation:** Dashboard's main view (NOT settings, NOT panels) gets a `<video>` element in the same `#stage` slot, hidden when not in dashboard view. Receiver code is the same `receiver-webrtc-client.js` reused. Existing `runtime-orchestration.js` skips its render loop when dashboard is in stream-mode.

### §8. Status UI / Error UI on Pi (D-D3, D-D4)

**Splash (D-D4):**
```html
<div id="ssr-splash" class="ssr-splash">
  <div class="ssr-splash-content">
    <h1 class="ssr-splash-logo">TableTop Beamer</h1>
    <p class="ssr-splash-status" id="ssr-splash-status">Connecting to render server…</p>
    <div class="ssr-splash-spinner"></div>
  </div>
</div>
```
Visible on boot until first `ontrack` event. CSS: full-viewport, dark obsidian theme matching `dir-obsidian-dark`.

**Reconnect Banner (D-C2):** Top-of-viewport thin banner. Shown when (a) RTCPeerConnection.connectionState in `disconnected` or `failed`, OR (b) heartbeat WS silent >3s, OR (c) `requestVideoFrameCallback` no fire >3s.

**Server Error Overlay (D-B4):** Full-screen modal. Triggered when reconnect attempts exceed 10 retries, OR server explicitly sends `render-host-down`. Includes "Retry" button (matches Phase-13 server-unreachable pattern).

**Diagnostic Chip:** Existing `#output-status-chip` retained. Now reads:
- `received fps` — via `requestVideoFrameCallback` count over rolling window.
- `connection state` — `pc.connectionState`.
- `last frame age` — `performance.now() - lastFrameAt`.
- `heartbeat age` — `performance.now() - lastHeartbeatAt`.

## Performance / Resource Targets

| Component | Target | Notes |
|-----------|--------|-------|
| Server CPU | 1 core ~50-80% sustained for 1 board (1 Chromium tab + mediasoup worker) | Same render pipeline as Phase 30 + WebRTC encode. Modern x86_64 should easily handle one stream. |
| Server RAM | 400-600 MB per tab + ~100 MB mediasoup worker | Per CONTEXT estimate ~200-400 MB tab + room for OS. |
| Pi /output/ CPU | <15% sustained (was ~95% in Phase 30) | Pi just runs `<video>` with HW decode. Diagnostic chip still consumes some — keep the 500ms setInterval. |
| Pi /output/ GPU | VC4 H264 decoder ~50-70% capacity at 1080p30 | Hardware-accelerated, well within budget. |
| Bandwidth (1 client) | 4-8 Mbit/s sustained, ~12 Mbit/s peak | LAN: free. Pi WLAN 5GHz: comfortable. 2.4GHz risky — test in UAT. |
| Bandwidth (3 clients) | Same as 1 — SFU sends same Producer to N consumers; bandwidth scales with **server uplink** to clients, not server CPU | Mediasoup's whole point. |
| Operator-click → pixel-on-Pi | <150ms (D-C1) | WS-RTT (5-15ms) + render (16-33ms) + encode (30-80ms) + decode (16-33ms) = 67-161ms. Fits if encode is hardware-accelerated. |
| FPS on Pi /output/ | ≥24 fps, target 30 fps (matches stream) | Pi just decodes; bottleneck is now server render. |
| Server render fps | 30 fps target (rAF-driven on server) | Phase 30 baseline showed Pi at 12 fps; stronger server should easily hit 30. UAT confirms. |
| Stream startup time | <2 s from Pi boot to first frame | Splash visible during this period. |
| Reconnect time | <3 s from server-restart-complete to first frame | Includes mediasoup transport reset. |

## Risks & Mitigations

### Risk 1: Audio capture instability (HIGH-PRIORITY) — see § Audio-Capture Risk Assessment
**Mitigation:** Wave 0 audio smoke test gates the rest of the plan. Two fallback paths documented.

### Risk 2: puppeteer-stream / in-page WebRTC bring-up complexity
**Mitigation:** Wave 0 also includes WebRTC bring-up smoke (Pi receives test stream from server before any feature work). If puppeteer-stream is unstable, fall back to Route A (ffmpeg-pipe + mediasoup PlainTransport) — adds ~50ms latency but is well-trodden ground.

### Risk 3: Phase-30 hotfixes h6-h15 may misbehave in headful Chromium on server
**Mitigation:** Plan task per hotfix: re-validate it does not regress under headful-server conditions. Most are inert when fps is high (only fire under Pi-class pressure). T7+T15 (256px GIF cap) may unnecessarily reduce server-render quality — gate behind `if (renderEnvironment === "pi" || cssWidth < 800)` flag.

### Risk 4: Mesh-warp pixel non-identity (Phase 27 squish bars)
**Mitigation:** UAT explicitly compares pre/post-pivot screenshots at every projection-profile vertex point. Tolerance: <2px per vertex. If exceeded, force `--use-gl=swiftshader` on server (CPU rasterizer, slower but pixel-deterministic).

### Risk 5: Mediasoup native compile failure on server hardware
**Mitigation:** Wave 0 `npm install mediasoup` smoke. Document Docker fallback. CONTEXT suggests server is "user's dev laptop or small box on LAN" — both very likely x86_64 Linux/macOS, well-supported.

### Risk 6: Server-tab silently dies, stream freezes
**Mitigation:** D-C4's three-indicator monitoring (PC connection state + last-frame-timestamp + heartbeat WS). Crash recovery: server `browser.on("disconnected")` handler restarts tab + emits `render-host-down` to Pi.

### Risk 7: Active-animations not persisted across server restart (D-X7 gap)
**Mitigation:** NEW persistence layer (§5). Phase-13 200ms-debounce write pattern reused.

### Risk 8: WLAN 2.4GHz cannot sustain 4-8 Mbit/s WebRTC
**Mitigation:** Document in operator notes. Phase 31 is LAN-only; assume 5GHz or wired. UAT step verifies bandwidth on actual deployment network.

### Risk 9: Existing `runtime-audio.js` autoplay restrictions
**Mitigation:** `--autoplay-policy=no-user-gesture-required` Chromium flag. Wave 0 audio smoke verifies.

### Risk 10: Phase 31 doubles server's runtime memory if both old and new code paths coexist
**Mitigation:** Phase-30 local-render code stays in repo but is *not loaded* on /output/ — receiver-bootstrap.js short-circuits the orchestration loader. Memory cost is zero.

## Test/UAT Strategy

### UAT (manual, on Pi hardware) — primary gate per Phase 26/30 tradition

**Required UAT scenarios:**

1. **Boot from cold:** Power Pi → first frame visible within 3s, splash visible during initial connect.
2. **Server restart resilience:** Trigger animation, restart server, verify (a) reconnect banner shown, (b) animation resumes from server-side persistence, (c) <3s recovery.
3. **Server crash resilience:** `kill -9` Chromium tab on server. Verify (a) error overlay shown on Pi, (b) render-host auto-restart, (c) reconnect succeeds.
4. **Network hiccup:** Unplug LAN for 2s, replug. Verify Pi reconnects; UI shows banner during outage.
5. **Align-Mode round-trip:** Drag a mesh-warp corner on Pi, verify <200ms perceived latency, verify save persists.
6. **Audio sync:** Trigger animation with sound (alarm). Verify audio is in stream + Pi speaker plays it (not Pi-local).
7. **Multi-client stream:** Pi + dashboard + tablet preview all show identical pixels to within 1 frame (~33ms).
8. **Phase-12 contract:** Trigger A→B and B→A in same room — both visible additively.
9. **Phase-19/27/28 contract:** All align-mode features (squish bars, mid-line drag, 4-corner trapezoid) work over the round-trip.
10. **Bandwidth on WLAN 5GHz:** Verify sustained 30fps with 5min sandstorm.mp4 + 3 GIFs running.
11. **30+ minutes soak:** Run full test scenario for 30min — verify no memory leak, no fps degradation, no stream freeze.

### Automated tests (Phase-29 baseline must remain 40/40)

**Existing `test/**/*.test.mjs` must stay green** — none of the existing tests should require changes if SSR is purely additive (server.mjs gets new mounts; existing endpoints unchanged).

**NEW tests (Phase 31 additions):**
- `test/ssr-state-restore.test.mjs` — round-trip `runtime-active-animations.json` write+read.
- `test/ssr-webrtc-signaling.test.mjs` — signaling protocol smoke (mock mediasoup transport).
- `test/ssr-render-host-lifecycle.test.mjs` — Xvfb + puppeteer mocked spawn lifecycle (no real Chromium in CI).
- Existing `test/board-profile-fields.test.mjs` etc. unchanged.

### Performance gates (UAT measurements)

| Gate | Target | Pass Criterion |
|------|--------|----------------|
| Pi /output/ fps | ≥24, target 30 | Diagnostic chip reports stable >24 for 60s |
| Operator click → Pi pixel | <150ms | Stopwatch + recorded video frame analysis |
| Server CPU under load | <80% one core | `top` while running test scenario |
| Pi CPU under load | <20% | `top` on Pi during test scenario |
| Bandwidth | <8 Mbit/s sustained | `iftop` on server uplink |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | User's server is x86_64 Linux/macOS (per CONTEXT "stronger hardware than Pi" + "user's dev laptop") | § Risk 5 | If ARM, mediasoup compile may need flags. Wave 0 catches. |
| A2 | Pi's network is 5GHz WLAN or wired (sufficient for 4-8 Mbit/s) | § Risk 8 | If 2.4GHz, may need 720p-only resolution. UAT catches. |
| A3 | Existing `runtime-audio.js` HTML5 `<audio>` elements work in headful Chromium with `--autoplay-policy=no-user-gesture-required` | § Risk 9, § Audio-Capture Risk | Audio path needs Web Audio API rewrite. Wave 0 audio smoke catches. |
| A4 | Phase-30 hotfixes T7/T11/T14/T15 don't regress server-render quality (256px GIF cap, ImageBitmap pre-bake) | § Risk 3 | Server-side animations look pixelated. Audit at plan time. |
| A5 | Mediasoup latest 3.x supports H264 + Opus + simulcast on user's Node version | § D-X1, D-X4, D-X6 | Codec negotiation fails. Wave 0 install smoke catches. |
| A6 | puppeteer-stream 3.0.22 is sufficiently stable for sustained 1080p30 capture on user's hardware | § D-X3 | Plan B (ffmpeg pipe) activated. Wave 0 catches. |
| A7 | In-page `getDisplayMedia` + injected mediasoup-client publish is a working pattern (Route B) | § D-X3, § Component sketch §1 | Fallback to puppeteer-stream Route A. Both sketched. |
| A8 | `state.runningAnimations` lifecycle in `runtime-orchestration.js` can be serialized cleanly to JSON for restart-replay (no live ImageBitmap refs etc.) | § D-X7, § Component sketch §5 | Persistence schema needs custom serialization. Audit at plan time. |
| A9 | Existing `LIVE_MUTATION_TYPES` set in server.mjs:124 can absorb new `align-corner-drag` mutation type without coalescing-class breakage | § Component sketch §4 | New coalescing class needed. Reuse or extend, simple fix. |
| A10 | `chrome://gpu` reports VAAPI / NVENC available on user's server (for H264 hardware encode) | § Performance Targets | Software libopenh264 fallback works for 1 stream. Performance still meets target. |
| A11 | Pi VC4 H264 hardware decoder accepts WebRTC-encoded h264 stream (no exotic profile incompatibility) | § Performance Targets | Drop to baseline H264 profile via codec preferences. |
| A12 | Phase-29 test suite (40/40) does not depend on `outputRole === final-output` running the local render pipeline | § Test/UAT | If a test asserts on local render presence, refactor needed. Audit at plan time. |
| A13 | Server's mesh-warp output is pixel-identical (within tolerance) to Pi's prior output, given identical Chromium version | § Risk 4 | Force CPU rasterizer (`--use-gl=swiftshader`). Performance cost. |

## Open Questions

1. **What is the user's server hardware exactly?**
   - What we know: "deutlich stärkere Hardware" than Pi 4. CONTEXT hint: "user's dev laptop or small box on LAN".
   - What's unclear: x86_64 vs ARM64? Intel iGPU / NVIDIA / AMD / no-GPU? Total RAM?
   - Recommendation: Plan-Phase asks user for `lscpu` + `lspci | grep VGA` + `free -h`. Determines hardware encoder choice.

2. **Should dashboard preview use the WebRTC stream OR keep local rendering?**
   - What we know: D-B2 says shared stream is the default. Hybrid is a deferred option.
   - What's unclear: Does dashboard's frequent panel re-rendering interact poorly with the stream hidden in `<video>`?
   - Recommendation: Plan first-cuts shared-stream. UAT decides whether to fall back to Hybrid.

3. **How does the SSR tab handle dashboard config mutations during a render?**
   - What we know: Existing live-sync-core.js applies snapshots at `applyLiveRuntimeSnapshot` boundary. SSR tab just acts as another live-sync client.
   - What's unclear: Are there any code paths in `runtime-orchestration.js` that assume `outputRole === control`? (e.g. the chip moves to body for `final-output`.) The SSR tab navigates with `?ssr=1` — what role does it claim?
   - Recommendation: SSR tab uses `?ssr=1` query param and claims `role=control` (for live-sync) but renders the `final-output` view (no panels, full-bleed canvas). Plan task: audit the `outputRole` branches in `runtime-orchestration.js`.

4. **Does the existing live-sync mutation queue (server.mjs) correctly handle the SSR tab as just-another-client?**
   - What we know: Existing code is multi-client-aware (clients map, broadcast loop).
   - What's unclear: Edge case where the SSR tab IS BOTH the receiver of a mutation AND the source of next-frame state. Could create feedback loop.
   - Recommendation: Plan task to instrument SSR-tab specifically with mutation-pipeline trace logs; UAT step to verify no double-apply.

5. **How is the SSR tab restarted gracefully (vs hard-kill+restart)?**
   - What we know: `browser.close()` + new `browser.launch()` works. Takes ~2s.
   - What's unclear: Can we hot-reload the page (`page.reload()`) faster? Does mediasoup transport recover or need full reset?
   - Recommendation: Plan task to time both options. Likely reload-page-only is enough for in-place state changes (e.g. board switch) — full Chromium relaunch is reserved for crash-recovery.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | server.mjs (existing) | ✓ (assumed — project runs) | TBD verify in plan (likely 18+) | — |
| Xvfb | NEW SSR tab launcher | ✗ verify | — | Likely apt-installable on Linux server |
| Chromium / Google Chrome | NEW headful browser | ✗ verify | — | Most distros include Chromium; macOS has Chrome |
| ALSA / PulseAudio | NEW audio capture (system-level fallback path) | ✗ verify | — | Standard Linux desktop has it; servers may not |
| Python 3, gcc/g++, make | NEW mediasoup native compile | ✗ verify | — | apt-installable; Wave 0 smoke catches missing toolchain |
| Hardware H264 encoder (VAAPI / NVENC) | NEW server-side WebRTC encode (bonus) | ✗ verify | — | Software libopenh264 always available in Chromium |

**Missing dependencies with no fallback:** None — every dependency has a viable path.

**Missing dependencies with fallback:**
- Hardware encoder → software libopenh264 (CPU cost is acceptable for 1 stream).
- Audio system module → if PulseAudio unavailable, use puppeteer-stream's Chrome-extension audio path (which doesn't go through PulseAudio).

**Wave 0 environment check (REQUIRED before plan locks):**
```bash
# Run these on the target server, capture output for the plan:
which Xvfb chromium-browser google-chrome ffmpeg
node --version
npm --version
lscpu | grep -i 'model name\|architecture'
lspci | grep -i 'vga\|3d'
free -h
df -h /tmp
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node --test` (Node built-in test runner) |
| Config file | none — uses default discovery `test/**/*.test.mjs` |
| Quick run command | `node --test "test/**/*.test.mjs"` |
| Full suite command | `node --test "test/**/*.test.mjs"` (same — small enough) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| M2 | Wave 0 environment + audio capture verified | manual + smoke | bash + `node test/ssr-audio-capture-smoke.test.mjs` | ❌ Wave 0 |
| M3 | Server bring-up: SSR tab launches and produces a stream | smoke | `node test/ssr-render-host-lifecycle.test.mjs` (mocked) | ❌ Wave 0 |
| M4 | Pi receives stream, ≥20 fps | manual UAT | (Pi diagnostic chip read by user) | manual |
| M5 | Align-mode + PM + Multi-Area + animation-timeline e2e via stream | manual UAT | (UAT scenarios 5, 8, 9 above) | manual |
| M6 | Server-restart resilience + reconnect UI | manual UAT + unit | UAT scenario 2 + `node test/ssr-state-restore.test.mjs` | ❌ Wave 0 |
| M7 | Pi UAT ≥20 fps with all defenses active | manual UAT | UAT scenario 11 (30min soak) | manual |
| Hard | Phase-29 40/40 tests stay green | unit | `node --test "test/**/*.test.mjs"` | ✅ existing |
| D-X7 | active-animations persisted across restart | unit + UAT | `node test/ssr-state-restore.test.mjs` + UAT scenario 2 | ❌ Wave 0 |
| D-D2 | Audio in stream verified | manual UAT | UAT scenario 6 | manual |
| D-C4 | Three-indicator disconnect detection | unit + UAT | `node test/ssr-receiver-disconnect-detection.test.mjs` + UAT scenarios 3+4 | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test "test/**/*.test.mjs"` (existing 40/40 must stay green; new tests join the suite).
- **Per wave merge:** full suite + smoke audio test if changes touch SSR/audio paths.
- **Phase gate:** Full automated suite green + complete manual UAT scenarios 1-11 PASS on Pi hardware.

### Wave 0 Gaps
- [ ] `test/ssr-audio-capture-smoke.test.mjs` — covers M2 / D-D2 / Audio-Capture Risk gate.
- [ ] `test/ssr-render-host-lifecycle.test.mjs` — covers M3 (mocked Xvfb + puppeteer).
- [ ] `test/ssr-state-restore.test.mjs` — covers D-X7 / M6 (round-trip `runtime-active-animations.json`).
- [ ] `test/ssr-webrtc-signaling.test.mjs` — covers signaling protocol contract (mocked mediasoup).
- [ ] `test/ssr-receiver-disconnect-detection.test.mjs` — covers D-C4 three-indicator logic.
- [ ] Wave 0 environment-availability shell-script: `scripts/wave0-environment-check.sh` (NEW) — runs the bash block in § Environment Availability.
- [ ] Wave 0 audio-end-to-end ffmpeg verification (manual run, not in `node --test`): play known asset in tab → capture → ffmpeg decode → assert non-silent.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 31 is LAN-only kiosk; no user accounts. CONTEXT explicitly out-of-scope. |
| V3 Session Management | partial | WebRTC signaling WS is unauthenticated by design (LAN). Existing live-sync WS pattern unchanged. |
| V4 Access Control | partial | No new endpoints expose write paths beyond existing live-sync. WebRTC signaling is read-mostly (consumer wants to subscribe). |
| V5 Input Validation | yes | New `align-corner-drag` mutationType payload must be validated server-side (existing `LIVE_MUTATION_TYPES` set + handler validation pattern reused). |
| V6 Cryptography | implicit | WebRTC always uses DTLS+SRTP (mandatory by spec). No hand-rolled crypto. |

### Known Threat Patterns for Node.js + WebRTC + Headless-Chromium stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Untrusted SDP causes DoS in mediasoup | DoS | mediasoup validates SDP per spec. Limit Producers to one (the SSR tab); Consumers are read-only — they cannot inject media. |
| `align-corner-drag` payload injection (negative coordinates, NaN, profile-id mismatch) | Tampering | Validate `0 <= normalizedX <= 1`, `Number.isFinite`, sanitize `profileId` against existing profile list. Pattern matches existing live-sync handlers in `server.mjs`. |
| WebSocket signaling spoofing (rogue client claims `role=ssr-tab`) | Spoofing | Restrict `role=ssr-tab` to localhost-only signaling endpoint; reject from non-127.0.0.1 origins. |
| Headful Chromium with `--no-sandbox` running on server | Privilege escalation | `--no-sandbox` is required for puppeteer in containerized / non-root contexts. Mitigate by running server.mjs as a low-privilege user (`tt-beamer` system user); document in operator notes. |
| Resource exhaustion: too many WebRTC consumers | DoS | Cap consumer count per Producer at 10 (well above expected 3). Reject excess connections with explicit error. |
| Unbounded `runtime-active-animations.json` growth | DoS | Cap `runningAnimations.length` at existing `maxRenderAnimationsPerFrame = 96` (Phase 12). Trim oldest on overflow. |

**Notes:**
- LAN-only deployment removes the largest threat surface (no WAN exposure).
- TURN server explicitly out-of-scope (CONTEXT) — would be required for WAN.
- Existing Phase-13 server-authoritative-config + Phase-29 schema-validation patterns transfer to Phase 31 unchanged.

## Sources

### Primary (HIGH confidence)
- `.planning/phases/phase-31/31-CONTEXT.md` — locked-in user decisions (read directly).
- `.planning/phases/phase-30/SUMMARY.md` — Phase-30 plateau diagnosis (read directly).
- `.planning/phases/phase-30/30-RESEARCH-PI-PERF.md` — per-frame cost model (read directly).
- `.planning/phases/phase-13/CLOSURE.md` — server-authoritative pattern (read directly).
- `.planning/phases/phase-12/12-1-VERIFICATION.md` — animation layering contract (read directly).
- `server.mjs` (3820 LOC) — existing WebSocket + Express server, attachLiveWebSocket pattern, broadcastLiveSession (read directly, lines 1-200, 1380-1540).
- `index.html` — DOM structure, diagnostic chip rAF, output-status-chip (read directly, lines 1-260, 920-1020).
- `src/app/runtime/runtime-orchestration.js` — entry to render pipeline (read directly, lines 1-80).
- `src/app/runtime/wire/runtime-wire-room-audio-binders.js` — current Pi-local audio path (read directly).
- `src/app/runtime/live-sync/runtime-live-sync-core.js` — snapshot fanout and live mutation pipeline (read directly).

### Secondary (MEDIUM confidence — verified WebSearch)
- [mediasoup project + GitHub](https://github.com/versatica/mediasoup) — Node-native SFU, active.
- [mediasoup official site](https://mediasoup.org/) — broadcasting examples.
- [puppeteer-stream npm](https://www.npmjs.com/package/puppeteer-stream) — 3.0.22 published ~2025-09; tab MediaStream capture lib.
- [puppeteer-stream GitHub](https://github.com/SamuelScheit/puppeteer-stream) — open issues confirm "very CPU intensive" reports + headless audio issue tracker.
- [Mux blog: Lessons learned building headless chrome as a service](https://www.mux.com/blog/lessons-learned-building-headless-chrome-as-a-service) — confirms headless mode disables audio + WebRTC; recommends Xvfb pattern.
- [Playwright issue 6460: getDisplayMedia in headless](https://github.com/microsoft/playwright/issues/6460) — confirms playwright headless does not support getDisplayMedia.
- [werift-webrtc GitHub](https://github.com/shinyoshiaki/werift-webrtc) — actively maintained 2025-2026, but no SFU pattern (rejected for D-X1).
- [@roamhq/wrtc npm](https://www.npmjs.com/package/@roamhq/wrtc) — node-webrtc fork; peer-only.
- [Raspberry Pi Forums: HW H264 decode 1080p](https://forums.raspberrypi.com/viewtopic.php?t=346840) — confirms VC4 1080p60 decode ceiling.
- [LeMaRiva: RPi 4 hardware accelerated video decoding in Chromium](https://lemariva.com/blog/2020/08/raspberry-pi-4-video-acceleration-decode-chromium) — V4L2 + MojoVideoDecoder configuration.

### Tertiary (LOW confidence — community / single-source, flagged)
- [Medium: Recording WebRTC with ghost participant using puppeteer](https://medium.com/@toshvelaga/recording-webrtc-with-a-ghost-participant-using-puppeteer-104756e2be40) — confirms pattern feasibility but quality of implementation varies.
- [Speaker Deck: Node.js x Chrome headless for WebRTC MCU](https://speakerdeck.com/mganeko/node-dot-js-x-chrome-headless-for-webrtc-mcu) — historical precedent (2017) for same architecture.
- [browserless.io: Puppeteer screencast with audio](https://www.browserless.io/blog/puppeteer-screencasts) — operational notes.

## Metadata

**Confidence breakdown:**
- Stack choices D-X1 (mediasoup), D-X2 (puppeteer+Xvfb), D-X4 (passthrough), D-X5 (SFU): **HIGH** — multiple authoritative sources agree, mature libraries, proven architecture pattern.
- Audio-capture pipeline D-X8: **MEDIUM** — feasible per docs, but stability claims need bring-up smoke before locking. Risk-flag is the appropriate tone.
- D-X3 (puppeteer-stream vs in-page getDisplayMedia): **MEDIUM-HIGH** — both routes documented; recommendation is in-page WebRTC publish (Route B) primary, puppeteer-stream as fallback.
- D-X7 state-restore: **HIGH** — direct read of existing config files confirms 95% coverage; gap (active-animations) is well-scoped.
- Performance targets: **MEDIUM** — based on Chromium tracker numbers + Pi 4 H264 decode published specs; needs UAT confirmation.
- Risk inventory: **HIGH** — every risk maps to specific code path or documented limitation.

**Research date:** 2026-05-06
**Valid until:** ~30 days (stable upstream; mediasoup + puppeteer-stream version churn is moderate). Re-research if puppeteer-stream major version bumps or if mediasoup 4.x ships.

---

## Resolved Environment Questions (User-Provided 2026-05-06)

The 5 open questions surfaced in the initial research summary were resolved
mid-workflow. Captured here so the planner doesn't re-ask.

### Q1: Server Hardware

User confirmed: **Lenovo IdeaCentre Mini 01IRH10R** running **Ubuntu 24.04.4 LTS**.

| Component | Value | Implication |
|---|---|---|
| CPU | Intel Core 7 240H (10-core, Raptor Lake-P, 5.0/5.2 GHz boost) | Plenty of headroom for headful Chromium + mediasoup. Software x264 ultrafast comfortably hits 1080p@30. |
| GPU | Intel Raptor Lake-P iGPU (i915 driver, Mesa 25.2.8) | **VAAPI hardware h264 encode available** via `ffmpeg -c:v h264_vaapi`. Drops encode CPU ~80%. |
| RAM | 32 GiB (7.86 GiB used at idle, ~25 GiB free) | Headful Chromium ~400 MB plus mediasoup ~150 MB is trivial. |
| Storage | 953 GB NVMe (Micron) | I/O is not a constraint. |
| Network | 1 Gbit Ethernet (`enp46s0`) currently up | Server-side bandwidth not a bottleneck. |
| Audio | PipeWire 1.0.5 (active) + ALSA k6.17 | PipeWire-loopback fallback path (§ Risks Pitfall 1 mitigation) is **available** if puppeteer-stream audio-capture proves unreliable. |

**Plan implication for D-X4 (encoder):** Default to **passthrough** (Chromium's
WebRTC speaks h264 directly to mediasoup). Document **VAAPI fallback** for the
ffmpeg-transcode Plan B route — `ffmpeg -vaapi_device /dev/dri/renderD128 -c:v h264_vaapi`.

**Plan implication for D-X8 (audio mixing):** PipeWire-loopback is a credible
Pitfall-1 mitigation if `puppeteer-stream` tab-audio-capture proves flaky.
Wave 0 smoke can A/B both paths if needed.

### Q2: Pi Network Topology

User confirmed: **Pi connects via 5 GHz WLAN** (server is wired-Ethernet).

**Implications:**
- Realistic throughput: 50-200 Mbit/s (Pi side often capped by VC4/wifi-radio at ~80-150 Mbit/s).
- 4-8 Mbit/s h264 stream: well within budget.
- Adaptive 1080p ↔ 720p (D-A3) is the **right** call — covers WLAN jitter (e.g., other house traffic).
- Latency: 5-15 ms typical, 30-50 ms under contention. Click-to-pixel <150 ms (D-C1) is realistic with margin.
- Reconnect logic (D-C2 + D-C3) genuinely needed — WLAN drops do happen.
- WebRTC SFU bitrate-adaptation will run as default mediasoup behavior; Plan documents it but doesn't tune below default unless UAT shows issues.

### Q3: Dashboard Preview — Shared Stream or Hybrid Local-Render?

**Default per CONTEXT.md D-B2:** shared stream (one render instance per board,
fan-out via SFU to Pi /output/ + dashboard + optional tablet).

**Researcher recommendation:** Implement **shared-stream** as the primary path.
The dashboard already runs on user's strong hardware (laptop/desktop) so its
local-render pipeline isn't broken — but having a single source of truth
(server-rendered stream) eliminates dashboard-vs-output drift entirely. This
is consistent with the user's "kein doppeltes Render-Truth" intent in D-B3.

**Hybrid fallback** (dashboard renders locally, only Pi /output/ consumes
stream) is documented as deferred (`Phase 31 deferred — § canonical_refs`)
if shared-stream proves problematic during Wave 5 UAT.

### Q4: SSR Tab Role-Claim During Live-Sync

The headful Chromium tab on the server navigates to `/output/?ssr=1` (or
similar query param). It needs to behave as a `final-output` role for the
animation runtime to render correctly (e.g., to NOT show the dashboard
control panel chrome).

**Researcher decision:** The SSR tab claims `outputRole = final-output` via
the same URL query param the Pi currently uses (`/output/` path). The `?ssr=1`
flag is added so the tab can:
1. Suppress any dashboard-style chrome
2. Apply the Phase-30 hotfix gating (see § Pitfall 3 mitigation)
3. Be detectable in WebSocket live-sync as a "render-host" client (server
   needs to NOT count it toward concurrent-output count)

**Server-side implication:** `server.mjs` adds a check in the live-sync
fanout that filters `?ssr=1` tabs out of the human-client tally — they're
infrastructure, not operators.

### Q5: SSR Tab Restart Strategy

**Researcher decision:**
- **Board-switch:** `page.goto('/output/?ssr=1&board=<new-id>')` (~500ms re-init,
  faster than full Chromium relaunch). The mediasoup transport stays alive
  across page navigations within the same Chromium process — clients see a
  brief "Reconnecting..." (D-C2) then resume.
- **Crash:** Monitor process via Node `child_process` events. On crash:
  full puppeteer.launch() relaunch (~2s). Node-side state-restore reads
  `config/runtime-active-animations.json` (the new file from D-X7) and
  re-injects active-animations via WebSocket on first WS-handshake from
  the new tab.
- **Health:** ping the SSR tab every 5s via CDP `Runtime.evaluate({expression:'1+1'})`.
  If 3 consecutive pings fail (15s) → relaunch.

These are all **internal server concerns** — the Pi /output/ never sees
these events directly; it just sees a brief stream gap absorbed by D-C2/D-C3.
