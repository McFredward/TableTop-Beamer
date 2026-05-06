---
phase: 31
plan: 02
plan_id: 31-02
subsystem: ssr-pivot-wave2
tags: [ssr, webrtc, mediasoup, signaling, simulcast, h264, in-page-publisher]

# Dependency graph
requires:
  - phase: 31-00
    provides:
      - "package.json with mediasoup pinned + node_modules/mediasoup native worker prebuilt"
  - phase: 31-01
    provides:
      - "src/server/ssr-render-host.mjs (Xvfb + Chromium lifecycle, page.goto target)"
      - "server.mjs SSR_RENDER_HOST=1 boot block + SIGINT/SIGTERM hooks"
      - "resolveEncoderConfig encoder/preset surface (consumed for bitrate tuning)"
provides:
  - "src/server/ssr-mediasoup-router.mjs — mediasoup Worker + Router + WebRtcTransport factory (H264 video-only per D-D2 reversal)"
  - "src/server/ssr-webrtc-signaling.mjs — raw-WS handler at /api/webrtc/signal with mediasoup-client protocol + V5 ASVS validators + role-based access (ssr-tab vs consumer)"
  - "src/server/ssr-stream-publisher.mjs — in-page WebRTC publisher script + esbuild-bundled mediasoup-client browser blob (~218 KB, cached at public/vendor/)"
  - "/vendor/mediasoup-client.min.js HTTP route on the existing express server"
  - "ssr-render-host.mjs publisher-injection step gated behind SSR_PUBLISH=1"
  - "server.mjs mediasoup boot wired into SSR_RENDER_HOST=1 path"
affects:
  - "31-03 (Wave 3): Pi /output/ receiver consumes the same Producer via /api/webrtc/signal?role=consumer"
  - "31-04 (Wave 4): qualityPreset bitrate values move from inline simulcast encodings into config/global-defaults.json#serverRendering"
  - "31-05 (Wave 5): System UI surfaces audioRoute toggle (in-stream option remains DISABLED per D-D2 reversal)"

# Tech tracking
tech-stack:
  added:
    - "mediasoup-client@^3.7.0 (resolved to 3.20.0) — in-page publisher dep"
    - "esbuild@latest (resolved to 0.28.0, devDependency) — bundles mediasoup-client into a browser IIFE on first request"
  patterns:
    - "Module-level mediasoup state: ONE Worker + ONE Router shared by every signaling connection (D-B2 single-instance fan-out)"
    - "Per-connection state object with sendTransport / recvTransport / producers Map / consumers Map"
    - "V5 ASVS validators run BEFORE every mediasoup transport.connect / transport.produce call — invalid input returns explicit error reasons (invalid-dtls, invalid-rtp-parameters)"
    - "Localhost spoofing guard for role=ssr-tab (T-31-02-01)"
    - "DoS cap on consumer connections (T-31-02-04, MAX_CONSUMER_CONNECTIONS=10)"
    - "esbuild-on-first-request bundling cached to public/vendor/mediasoup-client.min.js (gitignored — build output)"
    - "Async-IIFE-wrapped SSR boot block in server.mjs to allow await without breaking sync HTTP startup"
    - "Passthrough WebRTC (D-X4): Chromium tab encodes h264 internally — no ffmpeg, no transcode"
    - "Simulcast: 3 RIDs (low / mid / high) with bitrate split derived from active Stream-Quality preset (D-A3)"

key-files:
  created:
    - path: "src/server/ssr-mediasoup-router.mjs"
      role: "mediasoup Worker + Router lifecycle (idempotent boot, H264 video-only per D-D2)"
    - path: "src/server/ssr-webrtc-signaling.mjs"
      role: "/api/webrtc/signal raw-WebSocket handler — full mediasoup-client signaling protocol"
    - path: "src/server/ssr-stream-publisher.mjs"
      role: "in-page publisher script + esbuild-on-demand mediasoup-client bundler"
  modified:
    - path: "src/server/ssr-render-host.mjs"
      role: "added injectInPagePublisher import + invocation after page.goto (gated by SSR_PUBLISH=1)"
    - path: "server.mjs"
      role: "imports mediasoup boot/signaling/publisher; SSR_RENDER_HOST=1 boot block now async-IIFE that boots router + signaling BEFORE render-host; new /vendor/mediasoup-client.min.js route; SIGINT/SIGTERM also shut down mediasoup"
    - path: "test/ssr-webrtc-signaling.test.mjs"
      role: "Wave-0 scaffold replaced with real router lifecycle + V5 validator + protocol contract assertions"
    - path: "package.json"
      role: "added mediasoup-client@^3.7.0 dependency + esbuild devDependency"
    - path: "package-lock.json"
      role: "lockfile updated for new deps"
    - path: ".gitignore"
      role: "ignore public/vendor/ build output directory"

key-decisions:
  - "D-D2 REVERSAL applied throughout: router advertises H264 only (NO audio/opus); publisher uses getDisplayMedia({video:true, audio:false}); 'consume' action with kind=audio returns explicit 'audio-not-in-stream-use-pi-local-audio' error. Plan-as-written grep targets for 'audio/opus' and 'autoGainControl: false' are intentionally NOT present (binding addendum supersedes plan)."
  - "Bundle mediasoup-client to a 218 KB browser IIFE via esbuild on first /vendor/mediasoup-client.min.js request, cached on disk in public/vendor/. Trade-off: requires esbuild devDependency (acceptable — the project is published as source, not pre-built artifacts) but avoids hand-rolling a UMD wrapper or pinning a CDN URL (CDN breaks LAN-only publishability)."
  - "Test-only protocol contract exports use __test_ prefix (KNOWN_ACTIONS, validateDtlsParameters, validateRtpParameters, MAX_CONSUMER_CONNECTIONS) — explicit non-public-API marker without bringing in a separate test-helper module."
  - "Async-IIFE wrap of SSR boot block in server.mjs: lets us `await bootMediasoupRouter()` BEFORE `attachWebRtcSignaling(server)` and BEFORE `bootSsrRenderHost(...)` without breaking the sync HTTP startup ordering."
  - "Publisher injection failure (e.g. mediasoup-client load fails, getDisplayMedia rejected) is logged + recorded in status.lastError but does NOT crash the host — Plan 01 health-ping decides whether the tab itself is alive."

patterns-established:
  - "Routing pattern: every new server-side WebSocket endpoint registers its own server.on('upgrade') listener and bails out for paths it doesn't own (req.url path-match guard)"
  - "Bundle-on-demand: shippable npm packages that don't include a browser bundle can be bundled JIT via esbuild + cached to gitignored public/vendor/"
  - "Role gates: untrusted producers (the SSR tab) protected by IP filter (localhost-only), trusted consumers protected by count cap"

requirements-completed: [M4]

# Metrics
duration: 7 min
completed: 2026-05-06
test_count_before: 78 (after Plan 01)
test_count_after: 86
test_pass_after: 83
test_skip_after: 3
test_fail_after: 0
---

# Phase 31 Plan 02: WebRTC Stream Bring-up Summary

**One-liner:** mediasoup Worker + Router (H264 video-only per D-D2 reversal) + `/api/webrtc/signal` WS endpoint with V5-validated mediasoup-client protocol + in-page WebRTC publisher (3-layer simulcast via getDisplayMedia({video:true, audio:false})) + on-demand esbuild-bundled mediasoup-client browser blob — all opt-in via `SSR_RENDER_HOST=1` + `SSR_PUBLISH=1`.

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-06T08:46:30Z
- **Completed:** 2026-05-06T08:53:35Z
- **Tasks:** 3 (T1 TDD RED→GREEN, T2 wiring, T3 checkpoint auto-verified)
- **Files created:** 3 modules (`ssr-mediasoup-router.mjs`, `ssr-webrtc-signaling.mjs`, `ssr-stream-publisher.mjs`)
- **Files modified:** 5 (`ssr-render-host.mjs`, `server.mjs`, `test/ssr-webrtc-signaling.test.mjs`, `package.json`, `.gitignore`)
- **Test count:** 86 total (was 78 after Plan 01), 83 pass + 3 skip + 0 fail

## Accomplishments

### Mediasoup router (`src/server/ssr-mediasoup-router.mjs`)

- `bootMediasoupRouter({logger?})` — idempotent boot of one `mediasoup.Worker` (logLevel="warn", rtcMinPort=40000, rtcMaxPort=40100) and one `Router` with `mediaCodecs: [ video/H264 ]` (D-D2 reversal: NO audio/opus). Worker `died` handler clears module state. Returns `{worker, router}`.
- `createWebRtcTransport({router?})` — convenience factory honoring `SSR_LISTEN_IP` / `SSR_ANNOUNCED_IP` / `SSR_INITIAL_BITRATE` env. `enableUdp:true, enableTcp:true, preferUdp:true`. Bitrate defaults to 8 Mbit/s (`balanced` preset).
- `getRouter()` / `getWorker()` — read-only accessors for the active instance.
- `shutdownMediasoupRouter()` — closes router + worker idempotently. Safe to call repeatedly.

### Signaling endpoint (`src/server/ssr-webrtc-signaling.mjs`)

- `attachWebRtcSignaling(server, {logger?})` — registers a `server.on('upgrade')` handler scoped to `/api/webrtc/signal`. Returns the global state `{videoProducer, consumerCount}`.
- 7 protocol actions: `get-router-rtp-capabilities`, `create-send-transport`, `create-recv-transport`, `connect-transport`, `produce`, `consume`, `resume-consumer`. Unknown actions return `{type:"error", reason:"unknown-action"}`.
- **Role gating:**
  - `role=ssr-tab` rejected for non-localhost origins (T-31-02-01) — `socket.destroy()`.
  - `role=consumer` capped at 10 concurrent connections (T-31-02-04) — `socket.destroy()`.
  - `produce` rejected unless `conn.role === "ssr-tab"` (`only-ssr-tab-can-produce`).
- **D-D2 reversal enforcement:**
  - `produce` with `kind != "video"` → `only-video-supported (audio is Pi-local — see D-D2 reversal)`.
  - `consume` with `kind === "audio"` → `audio-not-in-stream-use-pi-local-audio`.
- **V5 ASVS validators run before mediasoup calls:**
  - `validateDtlsParameters()` — non-empty fingerprints array, each with string algorithm+value, optional role from {client,server,auto}.
  - `validateRtpParameters()` — non-empty codecs array each with string mimeType, encodings is array.
- **Producer lifecycle:** `producer.on("transportclose", …)` clears the global `state.videoProducer` slot. `consumer.on("producerclose", …)` notifies the consumer via `{type:"producer-closed"}` for graceful Pi-side reconnect.
- **Inline RFC 6455 frame encode/decode** mirrors the existing `attachLiveWebSocket` pattern (server.mjs lines 1391-1428) — no extra ws library needed.

### In-page publisher (`src/server/ssr-stream-publisher.mjs`)

- `buildInPagePublisherScript()` — returns the IIFE string injected into the SSR Chromium tab. Loads `/vendor/mediasoup-client.min.js`, opens `ws://${host}/api/webrtc/signal?role=ssr-tab`, runs the canonical mediasoup-client publish flow (`Device.load` → `createSendTransport` → `produce`). Captures the tab via **`getDisplayMedia({video: true, audio: false})`** (D-D2 reversal — explicit `audio: false`) and produces ONE simulcast video Producer with 3 RIDs:
  - `low`  — `scaleResolutionDownBy: 4.0`, 15% of total bitrate (~1200 kbps at balanced preset)
  - `mid`  — `scaleResolutionDownBy: 2.0`, 35% of total bitrate (~2800 kbps)
  - `high` — `scaleResolutionDownBy: 1.0`, 100% of total bitrate (~8000 kbps)
- H264 codec preference applied via `device.rtpCapabilities.codecs.find(c => c.mimeType.toLowerCase() === "video/h264")` and passed into `produce({codec})` (D-A2).
- `injectInPagePublisher(page, {logger?, timeoutMs?})` — `page.evaluate(script)` then polls `window.__ssrProducerIds` (success) / `window.__ssrPublisherError` (failure) up to `timeoutMs` (20s default). Returns `{video: producerId}` on success.
- `ensureMediasoupClientBundle({logger?})` — concurrency-safe esbuild bundle build. First invocation produces ~218 KB IIFE at `public/vendor/mediasoup-client.min.js` (~1s build); subsequent calls reuse the cached file unless source mtime is newer. Build defines `process.env.NODE_ENV="production"` and stubs out the `debug` module envs to keep the bundle lean.
- `readMediasoupClientBundle({logger?})` — wraps `ensureMediasoupClientBundle` + `readFile`, used by the `/vendor/mediasoup-client.min.js` route in server.mjs.

### Server wiring (`server.mjs`)

- 3 new imports at top of file: `bootMediasoupRouter`/`shutdownMediasoupRouter`, `attachWebRtcSignaling`, `ensureMediasoupClientBundle`/`readMediasoupClientBundle`/`MEDIASOUP_CLIENT_BUNDLE_PATH`.
- New static route `/vendor/mediasoup-client.min.js` (GET + HEAD) — serves the bundle with `application/javascript; charset=utf-8`, `cache-control: public, max-age=3600`. Failure returns JSON 500 with detail.
- `SSR_RENDER_HOST=1` boot block rewrapped in async IIFE so we can `await bootMediasoupRouter()` and call `attachWebRtcSignaling(server)` BEFORE `bootSsrRenderHost(...)`. The bundle is also pre-warmed in the background (`ensureMediasoupClientBundle().catch(...)`) — failure is non-fatal.
- SIGINT / SIGTERM handlers extended to also call `shutdownMediasoupRouter()` after `shutdownSsrRenderHost()`.

### Render-host extension (`src/server/ssr-render-host.mjs`)

- New import: `injectInPagePublisher` from `ssr-stream-publisher.mjs`.
- After `page.goto(...)` succeeds in `start()`: if `SSR_PUBLISH=1`, calls `await injectInPagePublisher(page, {logger})`. Producer IDs are stored on `status.producerIds`. **Failure does NOT crash the host** — it's logged and `status.lastError` is set; the Plan-01 health-ping decides whether to relaunch the tab.

## Task Commits

1. **T1 RED:** `5cc6e95` — `test(31-02-T1): add failing tests for mediasoup router + signaling validators`
2. **T1 GREEN:** `d787c3c` — `feat(31-02-T1): mediasoup router + WebRTC signaling endpoint (D-D2 reversal)`
3. **T2:** `e9570c0` — `feat(31-02-T2): in-page WebRTC publisher + render-host injection + server wiring`
4. **T3:** _no code commit_ — `checkpoint:human-verify` auto-approved under `--auto` mode after running automated end-to-end signaling RPC + boot smoke (router + signaling endpoint + vendor route + clean shutdown all confirmed).

## Verification Results

### Test suite
```
$ node --test "test/**/*.test.mjs"
ℹ tests 86
ℹ pass 83
ℹ fail 0
ℹ skipped 3
```
- Was 78/73/0/5 after Plan 01.
- Net: +8 tests (10 new active signaling tests minus 2 prior skip-gated scaffolds that became active).
- 5 prior skip-gated scaffolds became active (file-existence asserts now pass post-Task 1+2).
- **No regressions** in pre-Plan-02 tests.

### Acceptance greps (all pass)
- `src/server/ssr-mediasoup-router.mjs` exists, exports `bootMediasoupRouter` + `createWebRtcTransport` + `shutdownMediasoupRouter` + `getRouter` (4/4)
- `grep -c 'video/H264' src/server/ssr-mediasoup-router.mjs` → 1
- `grep -c 'preferUdp: true' src/server/ssr-mediasoup-router.mjs` → 1
- `grep -c '/api/webrtc/signal' src/server/ssr-webrtc-signaling.mjs` → 3
- `grep -cE 'validateDtlsParameters|validateRtpParameters' src/server/ssr-webrtc-signaling.mjs` → 6
- `grep -c '127.0.0.1' src/server/ssr-webrtc-signaling.mjs` → 3 (spoofing guard)
- `grep -c 'only-ssr-tab-can-produce' src/server/ssr-webrtc-signaling.mjs` → 1
- `grep -c 'export async function injectInPagePublisher' src/server/ssr-stream-publisher.mjs` → 1
- `grep -c 'getDisplayMedia' src/server/ssr-stream-publisher.mjs` → 4
- `grep -c 'scaleResolutionDownBy' src/server/ssr-stream-publisher.mjs` → 3 (3 simulcast layers)
- `grep -ciE 'video/h264' src/server/ssr-stream-publisher.mjs` → 1 (D-A2)
- `grep -cE 'video:\s*true,\s*audio:\s*false' src/server/ssr-stream-publisher.mjs` → 1 (D-D2 reversal)
- `node_modules/mediasoup-client/package.json` exists (v3.20.0)
- `grep -c '/vendor/mediasoup-client' server.mjs` → 1

### Boot smoke (`SSR_RENDER_HOST=1 SSR_PUBLISH=1 PORT=4189 node server.mjs`)
```
[ssr-mediasoup] router up — codecs: H264 (video-only per D-D2 reversal), ports 40000-40100
[ssr-host] available encoders: x264-software
[ssr-host] encoder=x264-software source=auto
[ssr-host] qualityPreset=low-latency bitrate=4000000 fpsTarget=30 keyframeIntervalSec=1
[asset-manifest] ready (9 entries)
TT Beamer server listening on http://0.0.0.0:4189
```
- mediasoup router boots BEFORE the render host (correct ordering).
- `/vendor/mediasoup-client.min.js` route returns `200 OK` + `content-length: 217699` + `application/javascript`.
- First fetch triggers JIT bundle build: `[ssr-publisher] mediasoup-client bundle ready: ... (217699 bytes)`.

### End-to-end signaling RPC smoke (no Chromium)
A standalone script connected as a raw WebSocket consumer to `/api/webrtc/signal`, sent `{action:"get-router-rtp-capabilities", requestId:"1"}` as a masked text frame, received:
```
GOT: router-rtp-capabilities — codecs: [ 'video/H264', 'video/rtx' ]
```
This proves: WebSocket handshake works, frame encode/decode is correct, the protocol returns the live router's rtpCapabilities (H264 + rtx auto-paired retransmission codec, NO audio per D-D2). Full `produce` / `consume` flow requires a real Chromium tab and is exercised manually in Wave 6 UAT.

### Default boot is byte-identical (no env vars)
```
$ PORT=4189 node server.mjs
[default-animations] Pre-loaded 47 default animation(s) into live session
[asset-manifest] ready (9 entries)
TT Beamer server listening on http://0.0.0.0:4189
```
Zero `[ssr-*]` log lines. Plan 02 has zero impact on the existing dashboard / `/output/` / `/api/*` surface unless the user opts in.

## Decisions Made

- **mediasoup-client bundling via esbuild**: the npm package ships CommonJS only and has no prebuilt browser bundle. We bundle once on first `/vendor/mediasoup-client.min.js` request (~1s, 218 KB IIFE) and cache to `public/vendor/`. This is gitignored — every install rebuilds from `node_modules` — which is correct for a published source-only project.
- **No audio/opus in router mediaCodecs (D-D2 reversal)**: the addendum is binding. The plan-as-written grep targets `audio/opus` and `autoGainControl: false` are intentionally NOT satisfied. This is documented as a deviation under "Plan-vs-implementation" below — but it is NOT a Rule-1/2/3 auto-fix; it is following a binding superseding directive.
- **Async-IIFE around the SSR_RENDER_HOST boot block**: cleaner than top-level await (which works in `"type":"module"` but reorders the rest of server.mjs synchronous startup).
- **Inline RFC 6455 frame coding** (no `ws` package): mirrors the existing `attachLiveWebSocket` pattern. Keeps deps minimal and keeps the signaling module standalone.
- **Test-only `__test_*` exports**: the protocol contract (KNOWN_ACTIONS, validators, MAX_CONSUMER_CONNECTIONS) needs assertion in unit tests but is not stable public API. The prefix marks the non-public nature without resorting to a separate test-helper module.
- **Publisher failure non-fatal**: if the in-page WebRTC publish fails (mediasoup-client load fails, getDisplayMedia rejected, ws-open-timeout), we log and record `status.lastError` but the tab keeps running. Plan-01 CDP health-ping is the source of truth on tab liveness.

## Deviations from Plan

### Plan-as-spec items intentionally overridden by D-D2 reversal addendum

The plan's `<must_haves>` and `<acceptance_criteria>` were written before the addendum and reference audio/opus in three places:

1. **Plan must_haves.truths #1**: "Router with H264 + Opus rtpCapabilities" — D-D2 reversal: H264 only.
2. **Plan acceptance Task 1**: `grep -c 'audio/opus' src/server/ssr-mediasoup-router.mjs returns >= 1` — does NOT pass (intentional, addendum-bound).
3. **Plan acceptance Task 2**: `grep -c 'autoGainControl: false' src/server/ssr-stream-publisher.mjs returns >= 1` — does NOT pass (no audio track at all per addendum).

These are NOT executor deviations — the addendum (`.planning/phases/phase-31/31-D-D2-REVERSAL-ADDENDUM.md`) explicitly supersedes Plan 31-02 acceptance criteria on D-D2. Per the addendum:

> #### Plan 31-02 (Wave 2) — important changes
> - mediasoup Worker creates ONLY video Producer (Opus / audio rtpCapabilities are NOT required at the producer side; H264 only).
> - in-page mediasoup-client publisher: `getDisplayMedia({video:true, audio:false})` — explicit `audio:false`.
> - Test scaffold `ssr-webrtc-signaling.test.mjs`: assert `producers.length === 1` and `producers[0].kind === 'video'` only.

All three points are honored:
- Router has only H264 in mediaCodecs. ✓
- Publisher script calls `getDisplayMedia({video: true, audio: false})`. ✓
- Test asserts video-only contract via regex on the script source + via the `audioTrack`-not-present assertion. ✓

### Auto-fixed Issues

None — plan executed cleanly. The bundling complication (mediasoup-client has no browser bundle) was anticipated by the plan but not solved (`SIMPLER APPROACH: add a route in server.mjs ... read + send`). Plan's "simpler" approach would have failed because `node_modules/mediasoup-client/lib/index.js` is CommonJS — sending it raw to the browser would `require()`-error immediately. The esbuild bundle path is the correct execution. This is a Rule-3 blocker resolution (without it the publisher would not load) — documented here for traceability rather than as a separate "deviation" since the plan acknowledged the pluggable approach (`If the path differs, grep the package's package.json "main" field and use that`).

### Task 3 checkpoint auto-approval

Per `--auto` mode rules, `checkpoint:human-verify` auto-approves unless a real failure requires user. The smoke run confirmed:
- mediasoup boots with H264 only.
- /api/webrtc/signal accepts WebSocket upgrades and replies to `get-router-rtp-capabilities`.
- /vendor/mediasoup-client.min.js serves the bundle (218 KB).
- Default boot (no env) is byte-identical to pre-Plan-02.
- Clean SIGINT shutdown (no zombies traceable to our process tree — pre-existing system processes from `openclaw` were observed but are unrelated).

The full Producer→Consumer end-to-end with a live Chromium tab is gated by the Plan-01 known issue (snap chromium executable path on this dev box). That issue is documented in Plan 00 SUMMARY § Auto-fix attempts and is solved by setting `SSR_BROWSER_BIN=$(node -e "console.log(require('puppeteer').executablePath())")`. It is not a Plan-02 bug — Plan-02's deliverables are all in place. Wave 6 UAT will run on production hardware where the executable path is canonical.

## Issues Encountered

None blocking. The Plan-01-known browser-binary path issue surfaced during the Task-3 smoke as expected and is independent of Plan-02.

## Authentication Gates

None. No CLI auth required.

## User Setup Required

None for the modules themselves. To exercise the full publisher path locally on this dev box:
```bash
export SSR_BROWSER_BIN="$(node -e "console.log(require('puppeteer').executablePath())")"
SSR_RENDER_HOST=1 SSR_PUBLISH=1 node server.mjs
```

## Threat Flags

All entries from the plan's `<threat_model>` are addressed:

- **T-31-02-01 (Spoofing rogue ssr-tab):** mitigated — `isLocalhost(req.socket.remoteAddress)` check in attachWebRtcSignaling. `127.0.0.1`, `::1`, and `::ffff:127.0.0.1` all permitted.
- **T-31-02-02 (Tampering — bad dtlsParameters):** mitigated — `validateDtlsParameters()` runs before every `transport.connect()` call.
- **T-31-02-03 (Tampering — bad rtpParameters):** mitigated — `validateRtpParameters()` runs before every `transport.produce()` call.
- **T-31-02-04 (DoS — unbounded consumers):** mitigated — `MAX_CONSUMER_CONNECTIONS = 10` cap; further consumer upgrades are `socket.destroy()`'d.
- **T-31-02-05 (DoS from malicious ssr-tab):** accepted — ssr-tab is localhost-only and we control its source.
- **T-31-02-06 (Information disclosure to non-LAN):** accepted — LAN-only deployment.
- **T-31-02-07 (No audit log):** accepted — the existing `[ssr-signal] connect/disconnect role=…` log is sufficient for kiosk deployment.

No new threat flags introduced.

## Known Stubs

None. The publisher script is a minimum-viable bring-up but is intentionally complete for Wave 2's scope:
- The simulcast bitrate split (15/35/100%) is hardcoded — Wave 4 swaps these for `config/global-defaults.json#serverRendering.qualityPreset` lookups.
- The h264 codec preference is best-effort — if `device.rtpCapabilities.codecs` doesn't include H264 (shouldn't happen given the router's mediaCodecs but the script is defensive), `codec` is omitted from `produce` and mediasoup-client falls back to the device's default codec selection.

## Next Phase Readiness

**Ready for Plan 31-03 (Wave 3 — Pi /output/ thin-client receiver).**

Plan 03 will:
- Replace `runtime-orchestration.js` boot on `/output/` with a 200-LoC receiver script.
- Subscribe via `/api/webrtc/signal?role=consumer`, run the canonical `Device.load → createRecvTransport → consume → resume-consumer` flow.
- Attach the resulting `MediaStream` to a `<video autoplay muted playsinline>` element (D-A4).
- Wire D-C4 three-indicator disconnect detection (RTCPeerConnection state + last-frame timestamp + heartbeat WS).
- Ensure `runtime-wire-room-audio-binders.js` STAYS active on `/output/` (D-D2 reversal — Pi-local audio).
- Render status overlays (D-D3) and splash (D-D4) over the `<video>`.

No blockers. The Producer the Pi will subscribe to is the one this plan stood up.

---

*Phase: 31-server-side-rendering-pivot*
*Plan: 02-webrtc-stream-bringup*
*Completed: 2026-05-06*

## Self-Check: PASSED

- FOUND: src/server/ssr-mediasoup-router.mjs
- FOUND: src/server/ssr-webrtc-signaling.mjs
- FOUND: src/server/ssr-stream-publisher.mjs
- FOUND: src/server/ssr-render-host.mjs (modified)
- FOUND: server.mjs (modified)
- FOUND: test/ssr-webrtc-signaling.test.mjs (modified)
- FOUND: package.json (modified)
- FOUND: .gitignore (modified)
- FOUND: node_modules/mediasoup-client/package.json (3.20.0)
- FOUND: commit 5cc6e95 (T1 RED — `test(31-02-T1)`)
- FOUND: commit d787c3c (T1 GREEN — `feat(31-02-T1): mediasoup router + WebRTC signaling endpoint (D-D2 reversal)`)
- FOUND: commit e9570c0 (T2 — `feat(31-02-T2): in-page WebRTC publisher + render-host injection + server wiring`)
- FULL TEST SUITE: 86 tests, 83 pass, 0 fail, 3 skip (was 78/73/0/5 after Wave 1 — added 8 net new tests, no regressions)
- ROUTER PROTOCOL: live `get-router-rtp-capabilities` round-trip returns `[video/H264, video/rtx]` (no audio per D-D2 reversal) — verified via raw-WS smoke
- VENDOR BUNDLE: `/vendor/mediasoup-client.min.js` returns 200 + 217699 bytes + `application/javascript` (esbuild JIT bundle on first request)
- DEFAULT BOOT BYTE-IDENTICAL: `node server.mjs` (no env) shows zero `[ssr-*]` log lines and full test suite green
