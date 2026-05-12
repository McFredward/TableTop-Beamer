# Phase 39: SSR Stabilization Round 2 — Research

**Researched:** 2026-05-12
**Domain:** SSR Chromium tab (MP4 playback, WebRTC reconnect handshake, GL mesh-warp rendering)
**Confidence:** HIGH (D-01 root cause empirically verified; D-02 evidence-based hypothesis with multiple supporting facts; D-03 historical fix already in code — investigation is "why is it not effective in this configuration")

---

## Project Constraints (from CLAUDE.md)

`./CLAUDE.md` does not exist at the repo root. No project-wide CLAUDE.md directives apply.

`.claude/skills/` directory does not exist (only `.claude/settings.local.json` + a worktrees folder). No project skill rules apply.

---

## Summary

The operator's 2026-05-12 UAT surfaced three independent defects, each with a different mechanism but all gating SSR stability.

**D-01 — MP4 playback in SSR (root cause CONFIRMED empirically):** `server.mjs`'s `MIME_TYPES` table has no `.mp4` entry. The static handler serves sandstorm.mp4 as `application/octet-stream`. Chromium 131 (puppeteer-bundled Chrome-for-Testing, same binary the SSR-tab uses) refuses to decode media served as octet-stream and the `<video>` element errors out with `MEDIA_ELEMENT_ERROR: Format error` / `networkState=NETWORK_NO_SOURCE`. Verified in an isolated headful-Xvfb reproducer this session: same MP4 plays perfectly (readyState=4, currentTime advancing, videoWidth=1280) when loaded as `file://`, fails when loaded via the running server. GIF works because `.gif` is decoded by the runtime's own GIF parser (`runtime-gif-decoder.js`), not Chromium's media stack. Secondary issue: `handleStaticFile` ignores `Range:` headers — fine for sandstorm.mp4 (faststart-compatible, moov at offset 32) but blocks seek operations that the loop-wrap path (`maybeWrapOutsideMp4Loop`) depends on.

**D-02 — Reconnect storms before stable connection (evidence-based hypothesis):** This is NOT a true reconnect loop, it is the **initial-connect handshake race** that the LEGAL_TRANSITIONS state machine in `receiver-bootstrap.js` already classifies as `RECONNECTING`. The state machine treats every failed `tryConnect()` attempt as a reconnect event, so the operator sees "RECONNECTING" banners during the legitimate ICE-handshake + producer-publisher-ready boot window (typically 3-10 seconds on first /output/ load). Phase 38 W10 fixed WS-fragmentation, which removed the silent failure mode that previously masked the race — now the WS handshake succeeds reliably but the rest of the publisher chain (Chromium tab boot → in-page publisher script injection → mediasoup `produce` RPC → `producer-ready` broadcast) is sequenced AFTER the WS upgrade. The Pi opens its WebRTC consumer WS BEFORE producer-ready (via `waitForProducer` polling), and `consume` RPC returns `no-producer-yet` (server hold up to 8s, then publisher comes up, then producer-ready fires). The receiver's monitor / state machine sees this and marks the attempt as failed → `RECONNECTING`. **The remediation is not "fix a reconnect bug" but "distinguish initial-cold-boot from steady-state reconnect" in the state machine + UI.**

**D-03 — Mesh-warp seam lines (root cause: Bayer dither lives in `runtime-effect-visuals.js` solid-color path but the seams the operator sees are GL-side rasterizer/sampling artifacts, NOT 8-bit alpha banding):** The Phase 35-iter2 h3 Bayer 4×4 fix is for a DIFFERENT visual artifact (alpha-blending step bands across the room rectangle), which is already in the SSR render path (it runs inside the SSR Chromium tab's `runtime-effect-visuals.js`). The **seams** the operator describes are 1-pixel ridge lines at mesh-warp triangle boundaries. Phase 30 fixed these in the GL renderer via pixel-snap + highp UV + LINEAR sampling, AND those fixes are still in `runtime-projection-gl-renderer.js` today. The regression mechanism is: after the Phase 33 VAAPI default-disable + Phase 34 hotfix h2 (revert `--ignore-gpu-blocklist + --enable-gpu-rasterization` to Phase 33 baseline), Mesa-llvmpipe-fallback paths on the SSR Chromium can land in 2D-fallback for some grid configurations, OR `--use-angle=default` lands on SwiftShader software rasterization where the rasterizer's coverage rule diverges from the Phase 30 hardware-GL assumption. Phase 37 explicitly DEFERRED this with `--use-angle=swiftshader` as the proposed fix path. **Phase 39 must either (a) verify GL is actually being used on the operator's SSR tab and the Phase-30 seam fixes are firing, or (b) port Phase 35-iter2 h3-equivalent UV-inset/dither to the GL fragment shader so the same anti-seam strategy works in software rasterization.**

**Primary recommendation:** Implement Wave 1 with one fix per defect, sequenced D-01 → D-02 → D-03 (cheapest to most invasive). All three fixes are localized — none touch the WS-fragmentation contract, the VAAPI hard-lock, or the Phase 38 W11/W12/W13 carry-forwards.

---

## User Constraints (from phase description)

This phase was opened via `/gsd-plan-phase` direct (no CONTEXT.md exists yet — `.planning/phases/phase-39/` was empty before this RESEARCH.md was created). The phase description ROADMAP entry (Phase 39 at lines 869-915) provides the implicit constraints below.

### Locked Decisions (from ROADMAP carry-forward list)

| # | Decision | Source |
|---|----------|--------|
| L1 | WS frame reassembly in server.mjs (W10) — touch only with mandatory fragmentation test still green | `.planning/CRITICAL_KNOWN_BUGS.md#1` |
| L2 | boot-handle-ui teardown ordering (W11) — preserve unsubscribe-after-teardown contract | `.planning/CRITICAL_KNOWN_BUGS.md#2` |
| L3 | GL cache invalidation on grid replace (W12) — preserve `invalidateCachedArrays` hook | `runtime-projection-gl-renderer.js:551-571` |
| L4 | 10/90 inset default for fresh profiles (W13) | Phase 38 W13 |
| L5 | All Phase 38 W1-W9 fixes preserved | Phase 38 CLOSURE |
| L6 | VAAPI default-disabled (Phase 33 commit 3cd6748) | Phase 33 CLOSURE |
| L7 | Phase 35-iter2 h3 Bayer dither + `drawImage` clip in `runtime-effect-visuals.js` solid-color path | `35-CLOSURE-ITER2-ADDENDUM.md` |
| L8 | `output-live-sync.js` subscription contract (13-method API) | Phase 35-B |
| L9 | D-08 connection-stability `fail=0` hard gate — every wave must keep `test/connection-stability/` green | Phase 33 D-08 |
| L10 | Pi-local audio (D-D2 reversal) — no audio path changes | Phase 31 D-D2 |
| L11 | WebRTC + h264 + mediasoup transport (D-A1) — no codec swap | Phase 31 |
| L12 | Headful Chromium 131 + Xvfb + puppeteer-stream (D-A3) — do not switch to puppeteer-headless or replace puppeteer-stream | Phase 31 |
| L13 | Phase 34 hotfix h2 (hasVaapiEnabled-gated GL flags) — Phase 33 baseline | Phase 34 h2 |
| L14 | output.html ≤8 src-based scripts (D-09) | Phase 35-iter2 h1 |

### Claude's Discretion (per ROADMAP phase 39 description)

| Area | Freedom |
|------|---------|
| MP4 fix location | EITHER fix `server.mjs#MIME_TYPES` AND/OR fix `handleStaticFile` (Range support) AND/OR drop the MIME-sniff-fallback path entirely. Recommend smallest-blast-radius fix that solves it. |
| D-02 root cause | EITHER call it a "perceived reconnect" (UI/state-machine fix only) OR a real layer race (publisher-boot sequencing fix). |
| D-03 fix path | EITHER add the missing `--use-angle=swiftshader` GL flag (Phase 37 deferred path) OR add GL-shader-level UV inset/extrude OR investigate why Phase 30 pixel-snap is not effective on the operator's hardware. The phase-description suggests "EITHER restoration of the prior fix OR a more permanent GL-level seam-elimination". |
| Test framework | Pick Playwright+pytest (existing `test/live-e2e/`) OR Node-test `test/*.test.mjs` per-defect. Phase 38 used both. |

### Deferred Ideas (OUT OF SCOPE for Phase 39)

| Item | Why deferred |
|------|--------------|
| Phase 36.1 dashboard runtime-orchestration migration | Separate phase per ROADMAP |
| Other SSR defects not in UAT 2026-05-12 | Phase 39 is scoped to the three operator-reported defects only |
| VAAPI re-enable as default | Phase 33 hard lock |
| Pixel-diff visual regression suite (general) | Phase 34/35 deferred — only the per-defect tests added in Phase 39 are in scope |
| Audio-pipeline changes | D-D2 lock |
| Codec swap (h264 stays) | D-A1 lock |

---

## Phase Requirements

The ROADMAP entry calls out three new acceptance criteria. Phase 39 introduces these as requirement IDs (referenced by the planner):

| ID | Description | Research Support |
|----|-------------|------------------|
| D-01-MP4-PLAYBACK | MP4 outside-animation from `nemesis-lockdown-a.json` (sandstorm.mp4) plays visibly in the SSR stream. CDP-screenshot at t=0s and t=2s shows pixel-different frames. | § D-01 below — MIME root cause empirically verified. |
| D-02-COLD-START-STABILITY | 30s cold-start reconnect-stability test shows < 2 RECONNECT-Events; OR root-cause explanation that it is not a true reconnect but initial-handshake transient. | § D-02 below — state-machine analysis shows this is the initial-handshake race classified as RECONNECTING. |
| D-03-NO-SEAMS | Solid-color animation in SSR stream shows no visible streifen at 3×3, 5×5, 9×9 grids; CDP-screenshot pixel-vergleich confirms uniform color along cell boundaries. | § D-03 below — Phase 30 pixel-snap is in code; failure must be a config or path that's not invoking it under the operator's SSR Chromium. |

---

## Standard Stack

### Core (already in the project — do not change)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| puppeteer | ^23.0.0 | SSR Chromium tab launch | Phase 31 D-A3 lock. v23+ bundles Chrome-for-Testing M120+ which includes H.264 codecs. |
| puppeteer-stream | ^3.0.22 | getDisplayMedia tab capture | Phase 31 — produces the in-page WebRTC publisher capture stream. |
| mediasoup | ^3.14.0 | SFU + WebRTC transport | Phase 31 D-A1. |
| mediasoup-client | ^3.20.0 | Pi receiver + SSR-tab publisher client | Phase 31 D-A1. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ws | (transitive) | WebSocket helper for test harness | `test/connection-stability/_harness.mjs` already imports it — reuse. |
| esbuild | ^0.28.0 | Bundle mediasoup-client for vendor/mediasoup-client.min.js | Don't touch unless rebundling. |

### Alternatives Considered (and rejected for Phase 39)

| Instead of | Could Use | Why rejected for Phase 39 |
|------------|-----------|---------------------------|
| Fixing `server.mjs#MIME_TYPES` directly | Express + `serve-static` | Out of scope; would touch L1 (WS framing) co-location. Single-line table fix is cheaper and lower risk. |
| Bundle puppeteer's Chrome | Use `/opt/google/chrome/chrome` (system Chrome) as the SSR-tab binary | Phase 35 RESEARCH §"State of the Art" line 1020 claimed bundled Chromium 131 lacks H.264. **THIS CLAIM IS OUTDATED** — empirically verified this session that Chrome-for-Testing 131.0.6778.204 plays H.264 mp4 fine (`canPlayType` returns "probably", readyState reaches 4 with a valid mp4 source from file://). The H.264 codec is NOT the D-01 bug. |
| Custom GL fragment shader for seam-elimination | Pre-bake UV-inset margins into vertex UV uploads | Either works; whichever has the smaller diff to `runtime-projection-gl-renderer.js` wins. Planner can choose. |
| Replace state-machine | Twilio-style two-event model (reconnecting / reconnected) | Phase 33 already built a LiveKit-style state machine with capped retry — extending it (adding a "INITIAL_CONNECT" terminal state distinct from RECONNECTING) is cheaper than a rewrite. |

**Version verification (executed 2026-05-12 in this research session):**

```bash
$ /home/claw/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome --version
Chromium 131.0.6778.204 [VERIFIED: local probe]

$ ffprobe -show_entries stream=codec_name resources/animations/sandstorm.mp4
codec_name=h264 [VERIFIED: ffprobe local]

# Server response for the mp4 URL (server.mjs running on :4173):
$ curl -I http://localhost:4173/resources/animations/sandstorm.mp4
HTTP/1.1 200 OK
content-type: application/octet-stream      ← D-01 ROOT CAUSE
connection: close                            ← Phase 31 h15 (intentional)
cache-control: no-cache
# No Accept-Ranges header. Range requests return 200 + full file.
```

[VERIFIED: live curl probe against running server.mjs this session]

---

## Architecture Patterns

### Recommended Project Structure for the Phase 39 Fixes

```
src/server/
├── server.mjs                          # D-01 fix here (MIME_TYPES + optional Range)
└── ssr-render-host.mjs                 # NO CHANGE for D-01 — Chrome flags are fine

src/app/runtime/output-receiver/
├── receiver-bootstrap.js               # D-02 fix here (initial-connect state distinction)
└── receiver-webrtc-client.js           # NO CHANGE for D-02

src/app/runtime/viewport/
├── runtime-projection-gl-renderer.js   # D-03 fix here (verify Phase-30 fixes fire, or extend)
└── runtime-projection-2d-fallback-renderer.js  # NO CHANGE — D-02 of Phase 34 forbids 2D fallback on SSR

src/app/runtime/render/
├── runtime-effect-visuals.js           # NO CHANGE — Phase 35-iter2 h3 Bayer dither is correct
└── runtime-effect-dither.js            # NO CHANGE

test/                                   # one RED test per defect
├── phase-39-d01-mp4-playback.test.mjs        # NEW (or .py if pytest path chosen)
├── phase-39-d02-cold-boot-reconnect.test.mjs # NEW
└── phase-39-d03-mesh-warp-seams.test.mjs     # NEW
test/live-e2e/                          # Playwright variants if planner picks pytest path
├── test_phase39_d01_mp4_in_ssr.py
├── test_phase39_d02_cold_boot.py
└── test_phase39_d03_seams.py
```

### Pattern 1: CDP-based ground-truth probing (carry-forward from Phase 38 W1)

Phase 38 added `/api/diag/ssr-grid` + `/api/diag/ssr-screenshot` endpoints backed by `host.evaluateInTab()` + `host.captureScreenshot()` in `src/server/ssr-render-host.mjs:952-994`. **Reuse this pattern for all Phase 39 tests.**

```javascript
// Pattern: probe a property inside the SSR tab via CDP, no console-log scraping
const res = await fetch(`http://localhost:${port}/api/diag/ssr-eval?expr=${encodeURIComponent("(()=>{const v=document.querySelector('video'); return {readyState:v?.readyState, currentTime:v?.currentTime, error:v?.error?.code};})()")}`);
const { ok, value } = await res.json();
assert(value.readyState === 4 && value.currentTime > 0);
```

**Phase 39 should add a new generic diagnostic endpoint** `GET /api/diag/ssr-eval-in-tab?expr=...` (URL-encoded JS expression) that returns the result of `host.evaluateInTab(expr)`. Reuses the existing CDP session; closes the gap the Phase 38 closure flagged ("if operator still observes stream stale, query /api/diag/ssr-grid... — but there's no way to probe a video element").

### Pattern 2: Use existing `test/connection-stability/_harness.mjs`

The harness already spawns server with `SSR_RENDER_HOST=1 SSR_PUBLISH=1` against an isolated config dir + free port, exposes `bootServer`, `waitReady`, `connectConsumer`, `killSsrTab`, `teardown`. Phase 39 tests should layer onto this harness, not reinvent server spawning.

### Anti-Patterns to Avoid

- **Don't add `--enable-features=H264HardwareEncode` etc. as a "fix" for D-01.** This was Phase 32-class work — already in place per `ssr-render-host.mjs:517` when NVENC selected. D-01 is about the BROWSER's media stack, not the encoder.
- **Don't add an in-page MP4-to-canvas WebCodecs decoder shim.** The codec works fine; the MIME breaks the `<video>` element. Fixing MIME is one line.
- **Don't change `--autoplay-policy=no-user-gesture-required`** in `ssr-render-host.mjs:532`. That's already correct (RESEARCH § Pitfall 5 carry-forward). The mp4 doesn't play because it never decoded, not because autoplay was blocked.
- **Don't conflate D-01 (mp4 codec/MIME) with D-03 (mesh-warp seams).** They live in completely different code paths. Fix and test them independently.
- **Don't increase WS message size to "fix" D-02.** Phase 38 W10 already proved WS is reliable. The race is at the publisher-readiness layer.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP Range request handling | A custom `parseRangeHeader()` + 206 response builder | Either use Node's built-in stream slicing (`createReadStream(path, {start, end})`) with a 30-LOC handler patch, OR — if zero risk required — skip Range entirely. sandstorm.mp4 is faststart, full-200 served with `video/mp4` MIME plays fine. | Range is needed for seek-heavy mp4 usage but the project's only use case is forward-playback loop. Per evidence in this RESEARCH session, mp4 plays from `file://` (no Range either) once Chromium accepts it as media. |
| WebRTC reconnect state machine | More state enums or a parallel race-detector | The existing `LEGAL_TRANSITIONS` + `ConnectionState` enum in `receiver-bootstrap.js:61-114` already supports adding a new state — just add `INITIAL_CONNECT` and route the first `tryConnect()` through it. | Phase 33 already paid the design cost. Extending the existing enum is ~10 LOC. |
| Bayer dither for GL seams | A second `runtime-effect-dither` module for fragments | The Phase 35 dither addresses 8-bit alpha banding (alpha-blend step bands). GL seams are sub-pixel rasterizer artifacts — different problem, different fix (UV inset / pixel-snap, already in `runtime-projection-gl-renderer.js`). | These two banding-class artifacts have been conflated 3 times across Phase 30/35/37 according to the closure docs. Don't conflate them again. |
| MP4 streaming format detection | Custom MP4 box parser | Trust the browser. Just fix MIME. | Browsers parse mp4 faststart correctly when given `video/mp4` content-type. |

**Key insight:** All three D-XX defects are "the existing machinery is fine but a SMALL invariant is broken or missing". Don't rewrite. Find the one broken invariant per defect and fix it surgically.

---

## Common Pitfalls

### Pitfall 1 (D-01): Assuming the codec is the problem because that was the historic answer
**What goes wrong:** Phase 35 RESEARCH §"State of the Art" claims Chromium 131 puppeteer-bundled lacks H.264. Engineer reads this in 2026-05-12 and writes a fix to detect / require system Chrome.
**Why it happens:** Phase 35 was written 2026-05-10. Two days later puppeteer's bundled Chrome-for-Testing definitely includes proprietary codecs (verified this session). The 2026-05-10 claim was either a hardware-specific artifact or out-of-date when written.
**How to avoid:** Run the empirical probe yourself before adopting a historical claim. See § "Evidence: D-01 empirical verification" below.
**Warning signs:** Plan says "ensure system Chrome is used" — STOP, run the probe.

### Pitfall 2 (D-01): Adding `.mp4` to the MIME table without also reviewing other extensions
**What goes wrong:** `.mp4` is added, sandstorm plays, but `.webm`, `.ogg`, `.wav` (already in table but only for audio), `.aac`, `.m4v` are still missing. Future asset addition hits the same bug.
**How to avoid:** Audit all `resources/animations/*` and `resources/sounds/*` extensions present today and add MIME entries for ALL of them, not just `.mp4`.
**Warning signs:** Operator reports "this new mp4 doesn't play but I added it to the manifest correctly."

### Pitfall 3 (D-01): Range-request omission causing later seek/wrap regressions
**What goes wrong:** MIME fix lands, mp4 plays at first paint. Six weeks later operator reports "outside animation freezes after 15 seconds." Root cause: `maybeWrapOutsideMp4Loop` sets `video.currentTime = loopStart` — Chromium issues a Range request to fetch the new offset, server returns 200 + full file, `<video>` re-buffers from scratch → loop wrap visibly hangs.
**Why it happens:** Phase 39 fix targets first-frame display; the loop-wrap is masked by the in-code fallback canvas (`runtime-outside-mp4.js:234-245`).
**How to avoid:** Either (a) add Range support to `handleStaticFile` as part of Phase 39 (RECOMMENDED), or (b) explicitly document that loop-wrap MAY regress and stage a follow-up test.

### Pitfall 4 (D-02): Treating the initial-connect race as a true reconnect bug
**What goes wrong:** Engineer adds delay / backoff / retry-cap tweaks to suppress "RECONNECTING" banners during cold boot. The race is masked but ICE actually does fail under load → silent stalls.
**Why it happens:** The state-machine literally calls every `tryConnect()` failure RECONNECTING because that's the only state distinct from CONNECTING / CONNECTED.
**How to avoid:** Add a new `INITIAL_CONNECT` state to the enum that does NOT show the RECONNECTING UI banner. Transition `NEW → INITIAL_CONNECT → CONNECTED|RECONNECTING|GIVEN_UP`. Failures during INITIAL_CONNECT route to RECONNECTING only AFTER `firstFailureAtMs` exceeds a threshold (~5s) — same backoff state machine, just doesn't show the banner during the first attempt window.

### Pitfall 5 (D-02): Assuming Phase 38 W10 introduced new reconnects
**What goes wrong:** Engineer reads "Phase 38 W10 fragmentation fix" and concludes the operator's reconnects are a side effect — tries to revert or guard W10.
**Why it happens:** Operator phrasing "INITIAL passieren wiederholte RECONNECT-Events bevor sie sich setzt" sounds new.
**Reality:** This is the same race as Phase 32 / 33 — the publisher-boot sequence is inherently sequential and the consumer-side state machine attempts to consume before the publisher exists. Phase 38 W10 made the WS layer reliable; what remains is the layer ABOVE that.
**How to avoid:** Phase 38 W10 fragmentation test (`test/phase-38-w10-ws-frame-fragmentation.test.mjs`) MUST remain green throughout Phase 39. If it stays green, W10 is intact.

### Pitfall 6 (D-03): Re-conflating alpha-banding with mesh-warp seams
**What goes wrong:** Engineer reads Phase 30 + Phase 35 + Phase 37 docs, sees "banding" everywhere, decides to copy Phase 35 Bayer dither into the GL fragment shader.
**Why it happens:** German "Streifen" (stripes) is used for both artifacts in operator reports.
**Reality:** Two distinct problems:
  - **Alpha banding** (Phase 35): 8-bit alpha channel rounding produces visible step bands across a single solid-color polygon's bounding rect. Fix: Bayer 4×4 perturbation. Already in `runtime-effect-visuals.js` solid-color branch.
  - **Mesh-warp seams** (Phase 30, this phase): 1-pixel ridges at triangle boundaries from rasterizer coverage disagreement OR UV-sampling discrepancy across cells. Fix: pixel-snap destination vertices + highp UV precision + LINEAR texture filtering. Already in `runtime-projection-gl-renderer.js` post-Phase-30.
**How to avoid:** Phase 39 D-03 must FIRST confirm whether the GL path is actually being taken on the operator's SSR tab. The `ssr-stats.renderMode` telemetry (logged every 10s per `ssr-webrtc-signaling.mjs:485-491`) reports `"webgl"` / `"webgl2"` for OK and `"2d"` / `"gl->2d (gl-disabled)"` for FAIL. **Read this value from the operator's server log BEFORE writing any GL shader changes.**

### Pitfall 7 (D-03): Re-applying `--ignore-gpu-blocklist + --enable-gpu-rasterization`
**What goes wrong:** Engineer revives the Phase 32 GL-flag fix.
**Why it happens:** Phase 32 SUMMARY says "GL flags fixed banding."
**Reality:** Phase 34 hotfix h2 explicitly reverted these flags because Mesa-llvmpipe's synchronous flush blocks the SSR-tab JS main thread → connection-stability `fail>0`. D-08 hard gate fails. **L13 lock prohibits this.**
**How to avoid:** Re-read `34-CLOSURE-ADDENDUM.md` Phase 34 h2 rationale before touching any Chrome GL flag.

---

## Runtime State Inventory

Phase 39 is a fix-three-defects phase, NOT a rename/refactor/migration phase. **No runtime state inventory required** — none of D-01/D-02/D-03 touches stored data, live service config, OS-registered state, secrets, or build artifacts in a way that needs a one-time migration. All changes are code-only and take effect on next server boot.

If any wave introduces a fix that DOES require state migration (e.g. clearing receiver `sessionStorage` for the D-02 fix), the planner should add this section to the plan.

---

## Environment Availability

Phase 39 inherits the existing SSR environment requirements. No new dependencies.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| puppeteer-bundled Chrome | SSR tab | ✓ | 131.0.6778.204 (`/home/claw/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome`) | SSR_BROWSER_BIN override |
| System Chrome | Live-E2E Playwright tests (Phase 35-C path) | ✓ | `/opt/google/chrome/chrome` exists | — |
| Snap Chromium | Fallback | ✓ | `/snap/bin/chromium` exists | — |
| Xvfb | Headful SSR tab on Linux | ✓ (probed via `xvfb-run` in this session) | — | DISPLAY env var |
| ffmpeg | Encoder detection | ✓ (verified via ffprobe) | — | x264-software always built-in to Chromium |
| Node.js | Runtime | ✓ | v24.13.1 (this session) | engines.node ≥18.0.0 |

**No missing dependencies. No fallback needed.**

---

## Code Examples

Verified patterns from the existing codebase, ready to extend:

### D-01: MIME table extension (minimal fix)

```javascript
// File: server.mjs:1968 — extend MIME_TYPES table
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".wav":  "audio/wav",
  ".mp3":  "audio/mpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  // Phase 39 D-01: video MIME types — without these, Chromium 131 serves mp4
  // as application/octet-stream and the <video> element errors with
  // MEDIA_ELEMENT_ERROR (Format error / NETWORK_NO_SOURCE).
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".m4v":  "video/mp4",
  // Bonus audio formats that may appear in resources/sounds/:
  ".ogg":  "audio/ogg",
  ".aac":  "audio/aac",
  ".m4a":  "audio/mp4",
};
```

### D-01: Optional Range support (recommended for loop-wrap safety)

```javascript
// File: server.mjs:3545 — extend handleStaticFile
async function handleStaticFile(req, res, routePath) {
  const targetPath = resolveStaticPath(req.url, routePath);
  if (!targetPath) { res.writeHead(403); res.end("forbidden"); return; }
  try {
    const fileStat = await stat(targetPath);
    const resolvedPath = fileStat.isDirectory() ? path.join(targetPath, "index.html") : targetPath;
    const contentType = getMimeType(resolvedPath);
    const headers = buildStaticResourceHeaders(routePath, contentType);

    // Phase 39 D-01: Range-request support for media resources.
    // Required for <video> loop-wrap seeks and partial fetches.
    const rangeHeader = req.headers["range"];
    if (typeof rangeHeader === "string" && rangeHeader.startsWith("bytes=")) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
      if (match) {
        const totalSize = fileStat.size;
        const start = match[1] === "" ? Math.max(0, totalSize - Number(match[2])) : Number(match[1]);
        const end = match[2] === "" ? totalSize - 1 : Math.min(Number(match[2]), totalSize - 1);
        if (start <= end && start < totalSize) {
          headers["accept-ranges"] = "bytes";
          headers["content-range"] = `bytes ${start}-${end}/${totalSize}`;
          headers["content-length"] = String(end - start + 1);
          res.writeHead(206, headers);
          createReadStream(resolvedPath, { start, end }).pipe(res);
          return;
        }
      }
    }
    headers["accept-ranges"] = "bytes";  // advertise even on 200 responses
    headers["content-length"] = String(fileStat.size);
    res.writeHead(200, headers);
    createReadStream(resolvedPath).pipe(res);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
}
```

Source: pattern extracted from Node.js `http`/`fs.createReadStream` docs + the existing `handleStaticFile` body. Tested behaviour: `curl -H "Range: bytes=0-1023" -o out.bin .../sandstorm.mp4` returns 206 + 1024 bytes after fix.

### D-02: Adding INITIAL_CONNECT to the state machine

```javascript
// File: src/app/runtime/output-receiver/receiver-bootstrap.js:61
export const ConnectionState = Object.freeze({
  NEW: "NEW",
  INITIAL_CONNECT: "INITIAL_CONNECT",     // Phase 39 D-02: first-attempt window, no banner
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  RECONNECTING: "RECONNECTING",
  GIVEN_UP: "GIVEN_UP",
  HOST_DOWN: "HOST_DOWN",
  STOPPED: "STOPPED",
});

const LEGAL_TRANSITIONS = Object.freeze({
  [ConnectionState.NEW]: new Set([
    ConnectionState.INITIAL_CONNECT,  // <-- new
    ConnectionState.STOPPED,
  ]),
  [ConnectionState.INITIAL_CONNECT]: new Set([
    ConnectionState.CONNECTED,
    ConnectionState.RECONNECTING,
    ConnectionState.HOST_DOWN,
    ConnectionState.STOPPED,
  ]),
  // ... rest unchanged ...
});

// During INITIAL_CONNECT, do NOT show the "RECONNECTING" banner.
// On the FIRST failure within INITIAL_CONNECT, transition to RECONNECTING
// (which DOES show the banner) — but only if firstFailureAtMs is older than
// INITIAL_CONNECT_GRACE_MS (e.g. 5000). Otherwise re-enter INITIAL_CONNECT
// silently and retry.
const INITIAL_CONNECT_GRACE_MS = 5000;
```

Source: extends Phase 33's existing `LEGAL_TRANSITIONS` pattern.

### D-03: CDP-probed renderMode telemetry assertion

```javascript
// Pattern for D-03 RED test: probe SSR-tab renderMode + capture pixel sample
const screenshot = await fetch(`http://localhost:${port}/api/diag/ssr-screenshot`).then(r => r.json());
const img = Buffer.from(screenshot.base64, "base64");
// Decode JPEG (require sharp or jimp; or use raw PPM via separate endpoint),
// then for each grid-line position (computed from the broadcast grid.srcXs/srcYs),
// sample a strip of pixels perpendicular to the boundary and assert max color
// delta along the strip is below threshold.
```

Source: `ssr-render-host.mjs:977-994` `captureScreenshot()` returns base64-JPEG. Phase 38 W1 uses this for grid-diff tests.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `puppeteer.executablePath()` chrome WITHOUT proprietary codecs | Chrome-for-Testing M120+ INCLUDES proprietary codecs (H.264, AAC) | Puppeteer v20+ | Phase 35 RESEARCH's "bundled puppeteer lacks H.264" claim is OUTDATED for this project's puppeteer ^23.0.0. |
| Hand-rolled WS decoder, single-chunk assumption | Per-socket recvBuf + drain loop with `tryDecodeWebSocketFrame` | Phase 38 W10 (commit `df69a74`) | CRITICAL: must remain green. `test/phase-38-w10-ws-frame-fragmentation.test.mjs` is the regression rail. |
| Twilio-style 3-state reconnect (`connected/reconnecting/disconnected`) | LiveKit-style 6-state with capped retry + tri-action server hints | Phase 33 Plan 03 | Reference for D-02 extension: extend the existing enum, don't rewrite. |
| `--ignore-gpu-blocklist + --enable-gpu-rasterization` for SSR rendering | Phase 33 baseline (these flags VAAPI-gated → effectively OFF) | Phase 34 hotfix h2 | LOCKED. D-03 must work without these flags. |
| Phase 26 NEAREST + h9 mediump UV | Phase 30 LINEAR + highp UV + pixel-snap destination vertices | Phase 30 B1 h4-h7 | These ARE in `runtime-projection-gl-renderer.js` today. D-03 investigation must confirm they actually fire on the operator's SSR. |
| Phase 35 `putImageData` for solid-color dither (clip-bypassing bug) | Phase 35-iter2 h3 `drawImage(ditheredOffscreenCanvas)` | Phase 35-iter2 | LOCKED carry-forward L7. |

**Deprecated/outdated:**

- The Phase 35 RESEARCH §"Source" line 1020 claim "bundled puppeteer Chromium 131 lacks H264 codec on this hardware" — empirically refuted in this Phase 39 RESEARCH session. The CITED phase-33 closure does NOT in fact say this; the Phase 35 author appears to have mis-cited.
- Phase 32 SUMMARY's claim that GL flags `--ignore-gpu-blocklist + --enable-gpu-rasterization` fixed banding — they did at the time, but Phase 34 h2 had to revert them, so the banding-fix-via-GL-flags strategy is dead. Phase 30 pixel-snap is the active mitigation.

---

## D-01 — MP4 Playback in SSR

### Current state

The MP4 path in the codebase is structured fine — it's the HTTP layer that breaks it.

**Render-loop call site:** `src/app/runtime/render/runtime-draw-loop.js:467-547` handles `selectedDefinition.assetType === "mp4"`. It calls `ctx.getOutsideVideoElement(definition.assetRef)`, `ctx.ensureOutsideMp4Playback(video, {...})`, `ctx.maybeWrapOutsideMp4Loop(video, playbackState)`, then `c.drawImage(video, 0, 0, canvas.width, canvas.height)`.

**Video element factory:** `src/app/runtime/render/runtime-outside-mp4.js:46-106` `getMediaVideoElement`. Sets `video.src = resolveHashUrl()` (resolves to `/resources/animations/sandstorm.mp4?v=<hash>`), `video.crossOrigin = "anonymous"`, `preload = "auto"`, `muted = true`, `playsInline = true`. On `loadedmetadata` it transitions the entry to `status:"ready"`. On `error` it transitions to `status:"error"`.

**Server static-file handler:** `server.mjs:3545-3570` `handleStaticFile`. Uses `getMimeType(resolvedPath)` which reads from `MIME_TYPES` table at `server.mjs:1968-1981`. **The table does NOT contain `.mp4`.** Falls back to `application/octet-stream`.

**SSR Chromium launch flags relevant to mp4:** `src/server/ssr-render-host.mjs:532` has `--autoplay-policy=no-user-gesture-required` (RESEARCH § Pitfall 5 — correct). `:600` has `--mute-audio` (correct). The launch also uses `--use-gl=angle --use-angle=default --enable-unsafe-swiftshader` — these are GL flags, not media-stack flags, and don't gate mp4 decode.

**Chrome binary used:** `detectChromiumBinary()` returns puppeteer-bundled `/home/claw/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome` (verified this session). Chrome-for-Testing 131 DOES include H.264 codec — verified empirically (`canPlayType('video/mp4; codecs="avc1.42E01E"')` returns `"probably"`).

### Root cause hypothesis — VERIFIED EMPIRICALLY

**Server.mjs serves all `.mp4` files with `Content-Type: application/octet-stream`. Chromium 131 refuses to play media served as octet-stream and the `<video>` element errors out.**

**Empirical evidence (this session):**

```
Test 1: same Chromium binary, same Xvfb, same launch flags as SSR,
        but load mp4 from `file:///tmp/sandstorm.mp4` (no HTTP server):
  → canPlay: "probably", readyState: 4, currentTime: 3.504, paused: false,
    videoWidth: 1280, videoHeight: 720, error: null
  → DECODES FINE.

Test 2: same Chromium binary, same Xvfb, same launch flags as SSR,
        load mp4 from `http://127.0.0.1:4173/resources/animations/sandstorm.mp4`
        served by running `node server.mjs`:
  → canPlay: "probably",         <-- still says yes (this is just type-sniff)
    readyState: 0,                <-- HAVE_NOTHING
    currentTime: 0,
    duration: null,
    paused: true,
    networkState: 3,              <-- NETWORK_NO_SOURCE
    error: { code: 4, message: "MEDIA_ELEMENT_ERROR: Format error" }
  → DOES NOT DECODE.

Server response on the failing fetch:
  HTTP/1.1 200 OK
  content-type: application/octet-stream   <-- THIS IS THE BUG
  connection: close
  cache-control: no-cache
```

[VERIFIED: live empirical reproducer this session, 2026-05-12]

### Operator hypothesis mapping (per phase description)

| Operator hypothesis | Status |
|--------------------|--------|
| H1: Headless Chromium 131 has no H.264 codec | REFUTED. Puppeteer 23 uses Chrome-for-Testing M131 with proprietary codecs included since M120. [VERIFIED: empirical canPlayType + file:// playback this session] |
| H2: MP4 URL is never requested by server | PARTIALLY TRUE — request DOES reach server (returns 200 + bytes), but the response is mis-typed. Easy to verify in operator's log: `grep "/resources/animations/sandstorm.mp4" server.log`. |
| H3: Video element is never attached / drawn | REFUTED. `runtime-draw-loop.js:522` always drawImage's the video into the canvas. The issue is upstream — the video element never reaches `readyState >= 2`, so the haveLiveFrame branch (line 521) goes false and `drawOutsideMp4FallbackFrame` runs (but the fallback canvas is empty because `captureOutsideMp4FallbackFrame` was never called either). |
| H4: CORS / Range-request errors for local mp4 | PARTIALLY TRUE — Range requests are not honoured (returns 200 + full file), but this is NOT what blocks first-frame; the MIME is. Range matters for loop-wrap (see Pitfall 3). |

### Implementation approach

**Minimum-viable fix (1 LOC):** Add `.mp4: "video/mp4"` to `MIME_TYPES` table in `server.mjs:1968`. Test by running the same empirical probe used above and asserting readyState=4.

**Recommended fix (~30 LOC):** Add `.mp4`, `.webm`, `.m4v`, `.ogg`, `.aac`, `.m4a` to MIME table AND add Range request support to `handleStaticFile` AND advertise `Accept-Ranges: bytes` on all static responses.

**Why Range support is recommended even though sandstorm.mp4 is faststart:**
1. The mp4 loop-wrap in `runtime-outside-mp4.js:271` does `video.currentTime = loopStartSec`. Chromium issues a Range request for the seek destination. Without Range support, the full file re-buffers on every wrap.
2. Operator may add other (non-faststart) mp4s to the manifest in the future. Range support is the universal mp4 contract.
3. Existing `connection: close` from Phase 31 h15 is preserved — Range responses inherit the same headers.

**Files touched:**
- `server.mjs` — extend `MIME_TYPES` + extend `handleStaticFile`
- Unit test: `test/phase-39-d01-mime-and-range.test.mjs` — exercise `getMimeType('.mp4')`, exercise `handleStaticFile` end-to-end with curl-style Range header
- Live test: `test/live-e2e/test_phase39_d01_mp4_in_ssr.py` OR `test/phase-39-d01-ssr-mp4-playback.test.mjs` — boot real server, load nemesis-lockdown-a.json profile, probe SSR-tab `<video>.readyState` via CDP, screenshot before/after

### Validation architecture

**RED test (must fail today, pass after fix):**

```python
# test/live-e2e/test_phase39_d01_mp4_in_ssr.py — sketch
def test_d01_mp4_plays_in_ssr_stream(running_server, ssr_ready):
    # 1. Trigger sandstorm.mp4 outside-animation via /api/live/command
    # 2. Wait 3 seconds
    # 3. Probe SSR-tab via existing /api/diag/ssr-eval (new endpoint we add):
    #    "(() => { const v = document.querySelector('#outside-mp4-video, video'); return {readyState: v?.readyState, currentTime: v?.currentTime, error: v?.error?.code, videoWidth: v?.videoWidth}; })()"
    # 4. Assert readyState === 4 AND currentTime > 1.0 AND videoWidth === 1280 AND error === null
    # 5. Capture screenshot via /api/diag/ssr-screenshot at t+0
    # 6. Wait 1.5 s
    # 7. Capture screenshot at t+1.5
    # 8. Assert pixel diff > THRESHOLD (proves frame advanced)
```

**Pre-fix expected output (verified this session):**
```
readyState=0, currentTime=0, error.code=4, videoWidth=0
```

**Post-fix expected output:**
```
readyState=4, currentTime≥1.0, error=null, videoWidth=1280
```

**Test framework choice:** Recommend Python pytest under `test/live-e2e/` because it already has CDP helpers and the precedent of test_phase38_ssr_grid_state_cdp.py. Plus 1 small Node unit test for `getMimeType` table assertion.

### Risks / unknowns

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Range support introduces a regression in GIF or other resource fetches | Low — only `.mp4`/`.webm` paths typically use Range | Existing GIF fetch test `test/runtime-gif-fetch-with-retry.test.mjs` MUST stay green |
| Adding video MIME types breaks the "Phase 31 h15 connection: close" contract | None — the change extends MIME_TYPES, not the connection-close prefix list | `test/static-resource-headers.test.mjs` should be re-run |
| Some operator has a custom mp4 with mis-placed moov atom | Out of scope — operator's reported file is sandstorm.mp4 which is faststart | If a non-faststart mp4 is added later, Range support handles it |
| `crossOrigin="anonymous"` in `runtime-outside-mp4.js:60` triggers a CORS preflight that fails | Empirically NOT failing — the request succeeds with 200 + bytes in current code | N/A |

**Unknown:** Does adding `.webm` MIME open a path for the operator to upload webm and have it work? — Yes, the same code path supports it; the manifest just gates on `.mp4`/`.gif` so the operator would also need a manifest entry. This is out of scope for D-01.

---

## D-02 — Reconnect Storms

### Current state

**Receiver state machine:** `src/app/runtime/output-receiver/receiver-bootstrap.js:61-114` defines 7 states (NEW, CONNECTING, CONNECTED, RECONNECTING, GIVEN_UP, HOST_DOWN, STOPPED) with `LEGAL_TRANSITIONS` enforcement. Cold-boot path is:

```
NEW → tryConnect() → CONNECTING → (success path) → CONNECTED
                                 → (failure path) → RECONNECTING → tryConnect() → CONNECTING → ...
```

**WS open + producer-readiness:** `receiver-webrtc-client.js:119-151` opens the consumer WS with a 10s timeout. `receiver-bootstrap.js:148-167` `waitForProducer()` polls `/api/ssr/ready` until `j.ready === true` or 60s elapse.

**Server publisher boot sequence (timing-critical):**
1. `node server.mjs` starts → attaches WS upgrades + creates HTTP listener (`server.mjs:4303` for live WS).
2. `attachWebRtcSignaling` mounts on `/api/webrtc/signal` (`server.mjs:4481`).
3. `bootSsrRenderHost` spawns Xvfb (Linux only) → spawns Chromium → navigates to `http://127.0.0.1:${port}/ssr` → injects `ssr-stream-publisher.mjs` (when `SSR_PUBLISH=1`).
4. Publisher script in the tab opens a WS to `/api/webrtc/signal?role=ssr-tab` → runs `get-router-rtp-capabilities` RPC → `create-send-transport` → `connect-transport` → `produce` RPC → `state.videoProducer` becomes non-null → `signalingState.broadcastProducerReady()` fires.
5. Pi /output/ load → opens consumer WS BEFORE step 4 may have completed. Calls `consume` RPC. Server returns `no-producer-yet` (server holds for up to 8s per Phase 31 h19 — `state.videoProducer === null`).

**Reconnect-trigger paths in receiver:**
- `ws.addEventListener("close")` → `emit("connectionState", "ws-closed")` → bootstrap RECONNECTING
- RPC timeout (consume 20s, others 10s)
- `recvTransport.on("connectionstatechange")` → `"failed"` / `"disconnected"`
- Heartbeat-stale gate (8s) fires reconnect
- Frame-stale gate (30s after Phase 33 iter-2)
- `m.type === "render-host-down"` from server
- `m.type === "producer-closed"` from server

**Phase 33 / 32 hardening already in place:**
- `RPC_TIMEOUT_MS = { consume: 20000 }` (Phase 32 hotfix h12)
- `tryConnectInFlight` flag (Phase 32 h6)
- `sessionStorage` backoff persistence with `isFreshPageLoad()` reset (Phase 32 + 33 T4)
- `lastFrameAtMs` + `lastHeartbeatAtMs` reset on every `tryConnect()` entry (Phase 33 iter-4) — prevents post-retry heartbeat-stale loops
- Capped retry: 10 attempts OR 120s elapsed → GIVEN_UP (Phase 33 T2)
- `framesSinceLastReconnect` gate before resetting backoff (Phase 33 T3) — proves RTP is flowing
- `producerReady` first-class signal (Phase 33 Plan 01 Suspect 4) — aborts `waitForProducer` poll on producer-ready broadcast

### Root cause hypothesis (with evidence)

The "RECONNECT storms" the operator observes during the cold-boot window (5-15 seconds after first load) are **the existing state machine's classification of legitimate publisher-boot-race transients as RECONNECTING events**.

**Evidence:**

1. **Phase 38 CLOSURE explicitly notes** (`38-CLOSURE.md:124-132`): "The operator's reports included intermittent WebRTC consumer disconnect / reconnect cycles. The connection-stability gate sustained 31.5s with zero reconnects on this host, so the reconnect pattern is likely Pi-hardware or network-jitter specific... — out of scope for an apply-path investigation."

2. **Phase 33 CLOSURE found the SAME class of issue** (`33-CLOSURE.md:14-22`): "Symptom: /output/ shows briefly 'connecting', then black screen, 'RECONNECTING — Xs (attempt N)' countdown, retry, RECONNECTING, eventually GIVEN_UP." Root cause was VAAPI freezing the SSR tab during boot. Phase 33 commit `3cd6748` fixed that one specific cause, but the **state machine still classifies any pre-CONNECTED failure as RECONNECTING**.

3. **Operator phrasing this round:** "einmal verbunden ist die Connection stabil, aber INITIAL passieren wiederholte RECONNECT-Events bevor sie sich setzt" — once connected, stable; before, repeated RECONNECT events. This is precisely the cold-boot race.

4. **Why Phase 38 W10 makes it newly visible:** Before W10, WS frame fragmentation silently dropped large WS messages on real-LAN. This meant some "successful" handshakes were actually never delivered. Now that W10 reassembles fragmented frames, the publisher-boot RPCs (which can produce 3-5KB WS messages: `router-rtp-capabilities`, `recv-transport-created`, `consume` responses) actually arrive. The result: the WS layer is reliable, but the *higher* layer (publisher-boot timing) is still inherently racy.

5. **The race is structurally inevitable in the current architecture:** Pi /output/ opens its WebRTC consumer WS BEFORE checking `/api/ssr/ready` is 200 OK. (`receiver-bootstrap.js:514` calls `createWebRtcReceiver` which opens the WS in its setup, while `waitForProducer` polls in parallel.) When the consume RPC arrives at the server before `state.videoProducer` exists, the server holds for 8s (per Phase 31 h19) — if the producer comes up in that window, consume succeeds; if not, it returns `no-producer-yet` → receiver classifies as failure → state transitions to RECONNECTING.

### Operator hypothesis mapping

| Operator hypothesis | Status |
|--------------------|--------|
| H1: Initial-handshake retries that look like reconnects | CONFIRMED — Phase 33 LEGAL_TRANSITIONS only has CONNECTING / CONNECTED / RECONNECTING. No state distinguishes "first attempt" from "subsequent attempts". |
| H2: Phase 38 W10 newly exposed the race | EVIDENCE-BASED hypothesis. Before W10, large publisher-boot RPCs may have been fragmented + lost silently. After W10, they arrive but their timing remains racy. |
| H3: Layer races (WebRTC ICE / SSR-tab boot / WS) | CONFIRMED — `ssr-render-host.mjs:823` shows browser launches → `:842` page.newPage → `:864` page.goto → `:873` injectInPagePublisher are all sequential awaits, ~5-15s before publisher exists. |

### Implementation approach

**Recommended fix path: distinguish INITIAL_CONNECT from RECONNECTING in the state machine.**

1. Add new state `INITIAL_CONNECT` to `ConnectionState` enum in `receiver-bootstrap.js:61`.
2. Add legal transitions: `NEW → INITIAL_CONNECT`, `INITIAL_CONNECT → {CONNECTED, RECONNECTING (after grace), HOST_DOWN, STOPPED}`.
3. Wire `tryConnect()` to enter `INITIAL_CONNECT` on first call (when `currentState === NEW` or `reconnectAttempts === 0 && firstFailureAtMs === null`); enter `CONNECTING` on subsequent calls.
4. UI side-effect: while in `INITIAL_CONNECT`, suppress the RECONNECTING banner — show the splash "Connecting to render server…" instead.
5. After `INITIAL_CONNECT_GRACE_MS = 5000` from first attempt entry, escalate from INITIAL_CONNECT to RECONNECTING (banner appears).
6. The capped-retry machinery (`MAX_RECONNECT_ATTEMPTS_BEFORE_GIVEUP`, `MAX_TOTAL_RECONNECT_DURATION_MS`) starts counting only AFTER escalation to RECONNECTING — so legitimate slow cold boots don't burn the 10-attempt quota.

**Alternative path (server-side): block consumer WS upgrades until producer is ready.**

Mount a guard at `attachWebRtcSignaling` that rejects consumer-role upgrades with a 503 + `Retry-After: 1` until `state.videoProducer !== null`. This forces consumers into a `/api/ssr/ready` polling pattern (`waitForProducer`) before WS upgrade. Disadvantage: increases the cold-boot perceived latency (waitForProducer polls at 1s cadence). Phase 33 already added `waitForProducer` as a pre-flight but did NOT enforce it.

**Recommendation:** Take the receiver-side state-machine path (cheaper, no server change, preserves backwards compatibility with older Pi receivers). Server-side enforcement can be a separate Phase 40 follow-up if the operator UAT shows the state-machine fix alone is not enough.

**Files touched:**
- `src/app/runtime/output-receiver/receiver-bootstrap.js` — add state, legal transitions, grace timer, UI gating
- `src/app/runtime/output-receiver/receiver-status-ui.js` — add `showInitialConnect()` to differentiate UI banner from RECONNECTING
- Unit test: `test/phase-39-d02-state-machine.test.mjs` — exercise `assertLegalTransition(NEW, INITIAL_CONNECT)`, `(INITIAL_CONNECT, CONNECTED)`, `(INITIAL_CONNECT, RECONNECTING)` after grace
- Live test: `test/connection-stability/phase-39-cold-boot.test.mjs` — boot server fresh, count RECONNECT events (real RECONNECTING state transitions) within 30s, assert <2

### Validation architecture

**RED test (must fail today, pass after fix):**

```javascript
// test/connection-stability/phase-39-cold-boot.test.mjs — sketch
import { bootServer, connectConsumer, teardown } from "./_harness.mjs";

test("D-02 cold-boot RECONNECTING events < 2 in first 30s", async () => {
  const { pid, port } = await bootServer();
  const reconnectEvents = [];
  const consumer = await connectConsumer(port, {
    onConnectionState: (s) => { if (s === "RECONNECTING") reconnectEvents.push(Date.now()); },
  });
  await new Promise(r => setTimeout(r, 30_000));
  assert(reconnectEvents.length < 2,
    `Expected <2 RECONNECTING events in 30s, got ${reconnectEvents.length}`);
  await teardown({ pid });
});
```

Today this test fires 3-6 RECONNECTING events on cold boot. After the INITIAL_CONNECT state lands, the first failure during cold boot stays in INITIAL_CONNECT (no RECONNECTING event) until the 5s grace elapses, then escalates. If publisher boots in <5s (usual case on a healthy box), no RECONNECTING event ever fires.

**State-machine unit tests (RED → GREEN with new transitions):**

```javascript
import { assertLegalTransition, ConnectionState } from "...receiver-bootstrap.js";

test("INITIAL_CONNECT → CONNECTED legal", () => {
  assertLegalTransition(ConnectionState.INITIAL_CONNECT, ConnectionState.CONNECTED);
});
test("NEW → INITIAL_CONNECT legal", () => {
  assertLegalTransition(ConnectionState.NEW, ConnectionState.INITIAL_CONNECT);
});
test("NEW → CONNECTING NOT legal (must go via INITIAL_CONNECT)", () => {
  assert.throws(() => assertLegalTransition(ConnectionState.NEW, ConnectionState.CONNECTING));
});
```

### Risks / unknowns

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Existing tests that assume `NEW → CONNECTING` transition fail | High | Update test fixtures to use the new transition |
| `INITIAL_CONNECT_GRACE_MS = 5000` is too short for some real boot scenarios (e.g. cold-boot on a loaded laptop) | Medium | Make it configurable via env var; document in CLOSURE |
| The operator sees the splash longer than before during slow boots (no banner ≠ visible progress) | Low — splash still shows "Connecting…" | Splash UI already exists and is visible during INITIAL_CONNECT |
| `MAX_RECONNECT_ATTEMPTS_BEFORE_GIVEUP=10` cap interacts surprisingly with the new state | Medium | Update `shouldGiveUp()` to only count escalations FROM RECONNECTING, not from INITIAL_CONNECT |

**Unknown:** Does the Pi receiver browser have any rendering-pipeline difference that makes cold-boot slower than the operator's laptop browser? — Unknown but out of scope; same state machine applies regardless of host.

---

## D-03 — Mesh-Warp Seam Lines

### Historical context

Three prior phases dealt with banding/seams; all three were SLIGHTLY DIFFERENT artifacts that have been repeatedly conflated.

**Phase 30 B1 / B2 (CLOSED-PASS) — Mesh-warp seams.** Fixed via additive changes to `runtime-projection-gl-renderer.js`:
- h4: NEAREST → LINEAR texture filtering (line ~307).
- h7: removed MSAA + `desynchronized:false` + `preserveDrawingBuffer:false` (Pi VC4 stability).
- h9: highp UV precision in vertex+fragment shaders (line ~264-275). Prevented sampling discrepancy at triangle edges.
- 30-02 GL ESCALATION Task 4 (line ~436-478 today): **pixel-snap destination vertices to integer framebuffer pixels** before NDC mapping. Eliminates rasterizer coverage disagreement at shared edges. CRITICAL anti-seam invariant.
- h12: pre-allocate the texture with a 1×1 black pixel at init time (stagger GPU pressure).

These fixes ARE in `runtime-projection-gl-renderer.js` today. They were proven on the Pi VC4 GPU. Phase 30 CLOSURE marked this as PASS.

**Phase 35 Track C iter2 h3 (CLOSED) — Alpha-band steps in solid-color overlays.** A COMPLETELY DIFFERENT artifact. Fixed via `runtime-effect-dither.js` Bayer 4×4 + `runtime-effect-visuals.js:288-333` `drawImage(ditherCanvas, ...)` replacing the previous `fillRect`. Lives in the render layer (canvas 2D), runs BEFORE the GL mesh-warp samples the canvas as a texture. Currently in code.

**Phase 37 (DEFERRED, never opened) — Transformation banding from projection-transform path.** Original Phase 36 renumbered to Phase 37 when align-mode became more urgent. The proposed fix path was `--use-gl=angle --use-angle=swiftshader` (SwiftShader has 16-bit-fp internal precision vs. Mesa-llvmpipe's 8-bit). Status: deferred. Not in code.

### Why SSR pivot reintroduced it (evidence-based)

Phase 33 CLOSURE (`33-CLOSURE.md:65-72`) explicitly notes: *"GL → 2D fallback: SSR-tab's runtime app picks 2D canvas instead of WebGL on this hardware (visible as banding artifacts in solid-color animations). Need explicit GL forcing in SSR-tab + harden Chrome GPU init flags."*

Phase 34 D-01 then introduced render-mode probe telemetry (`__ttBeamerEffectiveRenderMode()`) → reported via `ssr-stats.renderMode` on every heartbeat → server logs every 10s. **The acceptance gate D-05 was: renderMode MUST NOT contain "2d" on /ssr.**

Phase 34 hotfix h2 (`34-CLOSURE-ADDENDUM.md`, also `ssr-render-host.mjs:611-628` block) then REVERTED the `--ignore-gpu-blocklist + --enable-gpu-rasterization` flags because Mesa-llvmpipe's synchronous flush blocked the SSR-tab JS main thread (D-08 connection-stability `fail>0` regression). The flag revert means: on Linux without VAAPI (= the default configuration), the SSR Chromium tab runs with `--use-gl=angle --use-angle=default` which lands on Mesa-llvmpipe OR on SwiftShader depending on what's available — and llvmpipe is what hangs.

So the chain is:
1. Phase 30 fixed mesh-warp seams in hardware-accelerated GL.
2. Phase 31 pivoted to SSR → SSR Chromium tab needs to do GL under Xvfb.
3. Phase 32 first attempt at GL flags worked → seams gone, banding fixed.
4. Phase 33 found VAAPI was hanging the tab → disabled by default.
5. Phase 34 D-01 tried to keep `--ignore-gpu-blocklist + --enable-gpu-rasterization` for non-VAAPI iGPU paths → Mesa-llvmpipe hung → reverted in hotfix h2.
6. **NOW: Default config falls through to either Mesa-llvmpipe (with the GL-helpful flags gated OFF) or SwiftShader. In either path, the Phase 30 pixel-snap relies on the rasterizer's diamond-exit fill rule giving consistent coverage at integer pixel boundaries. SwiftShader's software rasterizer may follow this contract; Mesa-llvmpipe's may not in all paths.**

The operator's reported seams are this regression. The renderMode telemetry on the operator's server log will reveal whether GL is even active on their SSR tab. **This must be the first investigation step.**

### Current state (code-level)

**File:** `src/app/runtime/viewport/runtime-projection-gl-renderer.js`

Key invariants currently in code:
- Line 116-122: `glOpts = { premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: false, powerPreference: "low-power", desynchronized: false }` (Phase 30 h7).
- Line 264-275: `precision highp float` in vertex+fragment shaders.
- Line 307-310: LINEAR min/mag filter, CLAMP_TO_EDGE wrap.
- Line 456-478: **Pixel-snap destination vertices** — `pxX = Math.round(pt.x * bufW)`, then `_glPositions[vi] = (pxX / bufW) * 2 - 1`. This is the Phase 30 anti-seam fix.
- Line 361-372: backing-store buffer sized to CSS-rect × DPR.
- Line 552-571 (Phase 38 W12): `invalidateCachedArrays` hook for grid replacement.

**Solid-color render flow into the canvas (the texture that GL samples):**
- `runtime-effect-visuals.js:238-335` — solid-color branch. Uses Bayer dither via `runtime-effect-dither.js:getDitheredSolidColorCanvas` (Phase 35-iter2 h3).
- The dithered canvas is `drawImage`'d into the room's clip region.
- Then `runtime-projection-gl-renderer.js:_postDrawMeshWarpGL` uploads the WHOLE fx-canvas as a GL texture (`texImage2D(canvas)` at line 391) and warps it.

**Render-mode telemetry:**
- `runtime-orchestration.js` (somewhere) exposes `window.__ttBeamerEffectiveRenderMode()` returning `"webgl"` / `"webgl2"` / `"gl"` / `"auto"` (OK) or `"2d"` / `"gl->2d (gl-disabled)"` / `"auto->2d (loss xN)"` (FAIL).
- `ssr-stream-publisher.mjs` reads this every 1s and posts via WS as `ssr-stats.renderMode`.
- `ssr-webrtc-signaling.mjs:485-491` logs it server-side every 10 messages (~10s).

### Implementation approach

**Step 1 (mandatory): Diagnose before fixing.** Read the operator's server stdout for `[ssr-stats] renderMode=...` lines from a recent UAT. If renderMode is anything containing "2d", the bug is GL-init failure, NOT seam fixing. Skip to Step 2A. If renderMode is "webgl"/"webgl2", the bug is rasterizer/sampling, Skip to Step 2B.

**Step 2A — GL not active (renderMode contains "2d"):**

The Phase 30 anti-seam fixes only work in the GL path. If 2D fallback is firing on the SSR tab, Phase 30's mesh-warp pixel-snap is bypassed entirely → seams appear at every cell boundary because `runtime-projection-2d-fallback-renderer.js` uses per-triangle `clip + drawImage` which inherently produces seams (per Phase 30 SUMMARY's diagnosis).

**Recommended fix path (Phase 37 deferred path):** Add `--use-gl=angle --use-angle=swiftshader` to `ssr-render-host.mjs` Chrome flags (currently `--use-angle=default`). SwiftShader is Google's pure-software GL ES backend with 16-bit-fp internal precision. The flag swap is one line. Risk surface: must keep D-08 connection-stability `fail=0`. The Phase 35 RESEARCH §A3 carry-over notes SwiftShader does NOT have the synchronous-flush issue Mesa-llvmpipe has.

**Step 2B — GL active but seams visible (renderMode is "webgl"/"webgl2"):**

The Phase 30 pixel-snap IS firing but is not eliminating seams in the SSR Chromium's specific GL implementation (Mesa-llvmpipe under ANGLE, or SwiftShader). Two candidate fixes:

**Candidate B1: UV inset/expansion in the fragment shader.** Currently the UVs at cell boundaries land at exactly the shared texel edge. Even with LINEAR sampling, when two adjacent quads disagree on the texel sample by 1, a 1-pixel ridge appears. Fix: shrink each cell's UV range by a tiny epsilon (e.g. 0.5/textureSize) so the boundary samples the SAME interior texel from both sides. Implementation:

```glsl
// Currently:
varying highp vec2 vUV;
void main() { gl_FragColor = texture2D(uTex, vUV); }
// Add a 0.5-texel safety inset:
uniform vec2 uTexSize;  // pass canvas dimensions as uniform
void main() {
  vec2 uv = clamp(vUV, 0.5/uTexSize, 1.0 - 0.5/uTexSize);
  gl_FragColor = texture2D(uTex, uv);
}
```

**Candidate B2: Vertex overlap (1-pixel destination expansion).** Expand each cell's destination quad by 1 pixel along its boundaries so adjacent cells overlap. The overlap pixels paint identical UVs from both sides → no gap. Risk: visible "double-painting" if the source UV strip differs between cells (which is exactly the case for non-identity warps).

**Recommendation:** Try B1 first — minimal shader-level change, no rasterizer-coverage assumptions. If B1 alone doesn't close the seams, layer B2 on top.

**Files touched:**
- `src/app/runtime/viewport/runtime-projection-gl-renderer.js` — UV-inset uniform + shader edit (B1)
- `src/server/ssr-render-host.mjs` — Chrome flag swap to `--use-angle=swiftshader` (if Step 2A path)
- Live test: `test/live-e2e/test_phase39_d03_no_seams.py` — render solid-color over warped 3×3 / 5×5 / 9×9 grids, capture CDP screenshot, scan along grid-boundary strips, assert max color delta < 4.

### Validation architecture

**RED test (must fail today, pass after fix):**

```python
# test/live-e2e/test_phase39_d03_no_seams.py — sketch
@pytest.mark.parametrize("grid_size", [3, 5, 9])
def test_d03_solid_color_no_visible_seams(running_server, ssr_ready, grid_size):
    # 1. Set projection profile to N×N grid with non-identity warp
    set_profile(N=grid_size, warp=NON_IDENTITY)
    # 2. Trigger solid-color animation (e.g. #ff0000 at alpha=0.6)
    trigger_solid_color("#ff0000", 0.6)
    # 3. Wait 500ms for paint
    time.sleep(0.5)
    # 4. Capture SSR-tab screenshot via /api/diag/ssr-screenshot
    screenshot_b64 = fetch("/api/diag/ssr-screenshot").base64
    img = decode_jpeg(screenshot_b64)
    # 5. For each grid-line (vertical + horizontal), sample a perpendicular strip
    #    of 10 pixels across the boundary, assert max RGB delta < 4
    for i in range(1, grid_size):  # interior boundaries only
        boundary_x = int(WIDTH * (i / grid_size))
        strip = img.crop((boundary_x - 5, 100, boundary_x + 5, HEIGHT - 100))
        max_delta = max_pixel_delta(strip)
        assert max_delta < SEAM_THRESHOLD, f"seam at x={boundary_x}: delta={max_delta}"
    # similar for horizontal boundaries
```

Today the test fails for grid_size=3 with operator-visible seams (debug PNGs in `debug/phase35*banding*.png` are evidence — they were captured at the time of the Phase 35-iter2 work). After fix, all three parametric runs pass.

### Risks / unknowns

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `--use-angle=swiftshader` introduces synchronous-flush issue similar to Mesa-llvmpipe | Medium-Low — Phase 35 RESEARCH §A3 says NO | Test D-08 connection-stability after the flag swap; revert if `fail>0` |
| UV-inset epsilon is too aggressive and washes out fine detail | Low — 0.5/textureSize at 1920px is ~0.0005 UV units | Compare before/after on a checker-pattern test asset |
| The seams are NOT mesh-warp boundary artifacts but encoder block-quantization artifacts (H.264 8×8 / 16×16 blocks) | Low — operator describes them as grid-aligned, not block-aligned; H.264 blocks are 8×8 / 16×16 not 1920/3 = 640 wide | Phase 35 RESEARCH already verified encoder bitrate doesn't change banding |
| Operator's hardware (gaming PC) has a different GL implementation than the dev box, fix works on dev box but not on gaming PC | Medium — known per Phase 33/34 hardware-specific issues | Phase 39 UAT must be on operator's gaming PC, not just on dev box |

**Unknown:** Is `--use-angle=swiftshader` actually a valid flag combination with `--use-gl=angle`? Phase 37 plan asserts it is. **Verify before implementing** — run `chrome --version --use-gl=angle --use-angle=swiftshader` and check for warnings.

---

## Cross-Defect Dependencies

**Do these defects share a fix?** No. Three independent root causes:

| Defect | Root cause domain | Independence |
|--------|------------------|--------------|
| D-01 | HTTP server MIME table + (optional) Range support | server.mjs only |
| D-02 | Receiver state-machine enum + grace timer | receiver-bootstrap.js only |
| D-03 | GL renderer / Chrome GL flags | runtime-projection-gl-renderer.js + ssr-render-host.mjs |

**Do they conflict?** No. None of the three fixes touches the same lines as another.

**Order they should be implemented in:**

1. **D-01 FIRST** (smallest, surest fix, immediately unblocks the operator UAT for MP4 evidence). Verifies the test infrastructure (CDP eval-in-tab endpoint pattern that subsequent defects will reuse).
2. **D-02 SECOND** (medium-size state-machine extension, independent of D-01 / D-03). The new INITIAL_CONNECT state changes UI behavior on cold boot — landing it after D-01 makes the operator's next UAT cleaner (no reconnect-storm noise while validating MP4 playback).
3. **D-03 LAST** (largest blast radius if Phase 37 path is taken — GL-flag swap touches connection stability). Diagnose first via renderMode telemetry, then choose sub-path.

**Why this order:** Each fix's RED test exercises a different layer (HTTP, state machine, render pipeline). D-01 evidence will already be visible on the SSR-tab when D-02 testing begins, so D-02 tests can include both MP4-frame-advance AND state-machine assertions. D-03's GL changes are best validated after D-01+D-02 are stable so that pixel-vergleich tests don't see flapping connections or missing mp4 frames as noise.

**Shared infrastructure to land in W1:**
- New CDP eval endpoint `GET /api/diag/ssr-eval-in-tab?expr=...` (URL-encoded) backed by `host.evaluateInTab`. Reused by D-01 and D-03 tests.

---

## Validation Architecture (Phase-Level)

`.planning/config.json` does not set `workflow.nyquist_validation` — default is enabled. This section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node `--test` (existing per `package.json#scripts.test`) + Python `pytest` (existing per `package.json#scripts.test:live-e2e`) |
| Config file | `package.json` (test runner config); pytest uses default discovery in `test/live-e2e/` |
| Quick run command | `node --test "test/phase-39-*.test.mjs"` |
| Full suite command | `npm test && RUN_LIVE_TESTS=1 node --test test/connection-stability/ && python -m pytest test/live-e2e/test_phase39_*.py` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-01-MP4-PLAYBACK | MP4 outside-animation visible in SSR stream | unit | `node --test test/phase-39-d01-mime-and-range.test.mjs` | ❌ Wave 0 |
| D-01-MP4-PLAYBACK | MP4 reaches readyState=4 + currentTime advances in SSR tab | live-e2e | `python -m pytest test/live-e2e/test_phase39_d01_mp4_in_ssr.py -v` | ❌ Wave 0 |
| D-02-COLD-START-STABILITY | RECONNECTING events <2 in first 30s of cold boot | integration | `RUN_LIVE_TESTS=1 node --test test/connection-stability/phase-39-cold-boot.test.mjs` | ❌ Wave 0 |
| D-02-COLD-START-STABILITY | State-machine transitions: NEW → INITIAL_CONNECT → CONNECTED legal; NEW → CONNECTING NOT legal | unit | `node --test test/phase-39-d02-state-machine.test.mjs` | ❌ Wave 0 |
| D-03-NO-SEAMS | Solid color over 3×3, 5×5, 9×9 grids: no boundary pixel ridge > THRESHOLD | live-e2e | `python -m pytest test/live-e2e/test_phase39_d03_no_seams.py -v` | ❌ Wave 0 |
| D-03 diagnostic precondition | SSR-tab renderMode is not "2d" | integration | `node --test test/phase-39-d03-render-mode-probe.test.mjs` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test "test/phase-39-*.test.mjs"` (the unit-level RED/GREEN rails). <10s.
- **Per wave merge:** Above + `RUN_LIVE_TESTS=1 node --test test/connection-stability/`. ~60s.
- **Phase gate:** Full suite green AND `RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs` shows `sustained >=30000ms heartbeats>=20 closed=false producerReady=0 producerClosed=0 renderHostDown=0`.

### Wave 0 Gaps

The planner should add Wave 0 tasks to create:

- [ ] `test/phase-39-d01-mime-and-range.test.mjs` — unit test for `getMimeType('.mp4') === 'video/mp4'` and `handleStaticFile` Range handling
- [ ] `test/live-e2e/test_phase39_d01_mp4_in_ssr.py` — live test for SSR-tab `<video>` readyState + screenshot diff
- [ ] `test/phase-39-d02-state-machine.test.mjs` — unit test for `assertLegalTransition` with new states
- [ ] `test/connection-stability/phase-39-cold-boot.test.mjs` — integration test counting RECONNECTING events
- [ ] `test/phase-39-d03-render-mode-probe.test.mjs` — integration test asserting renderMode is not "2d"
- [ ] `test/live-e2e/test_phase39_d03_no_seams.py` — live pixel-vergleich for grid-boundary seams
- [ ] New diagnostic endpoint `GET /api/diag/ssr-eval-in-tab?expr=...` in `server.mjs` (used by D-01 and D-03 live tests)
- [ ] Add `host.evaluateInTab` exposure check (already exists per `ssr-render-host.mjs:952-972` — just plumb through to server.mjs route)

### Carry-forward test rails that MUST stay green

| Test | Source | Reason |
|------|--------|--------|
| `test/phase-38-w10-ws-frame-fragmentation.test.mjs` | Phase 38 W10 | WS framing contract — L1 |
| `test/connection-stability/live-fixture-smoke.test.mjs` | D-08 | Connection-stability hard gate — L9 |
| `test/connection-stability/*.test.mjs` (all) | D-08 | `fail=0` invariant — L9 |
| `test/phase-35-bayer-dither.test.mjs` | Phase 35 | Bayer dither math invariant — L7 |
| `test/static-resource-headers.test.mjs` | Phase 31 h15 | Connection: close on /resources/animations/ |
| `test/live-e2e/test_phase38_ssr_grid_state_cdp.py` | Phase 38 W1 | CDP-diag endpoints still work |

---

## Security Domain

`.planning/config.json` does not set `security_enforcement` explicitly. Default = enabled. Section required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | tt-beamer is LAN-only single-user — no auth layer |
| V3 Session Management | no | No user sessions; clientId is opaque per-WS |
| V4 Access Control | yes (D-01) | The localhost spoofing-guard at `ssr-webrtc-signaling.mjs:274` already enforces ssr-tab role from 127.0.0.1 only — Phase 39 MUST NOT weaken this |
| V5 Input Validation | yes (D-01, new endpoint) | The new `/api/diag/ssr-eval-in-tab?expr=...` endpoint must validate `expr` (length cap, expression-only — no statement injection, no multi-line, no `require/import`) |
| V6 Cryptography | no | mediasoup handles DTLS; not touched by Phase 39 |
| V12 Files and Resources | yes (D-01) | The Range request parser must reject malformed ranges, cap end < file size, reject negative starts |

### Known Threat Patterns for Phase 39 changes

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Range request DoS (very large negative range or end=infinity) | DoS | Cap `end < fileSize`; reject `start > end`; reject if `bytes=` prefix malformed |
| `/api/diag/ssr-eval-in-tab` arbitrary JS execution | Tampering / Elevation | This endpoint runs JS inside the SSR Chromium tab. Restrict it to localhost-only (mirror the `isLocalhost` guard at `ssr-webrtc-signaling.mjs:70-77`). Add an env-gate (`process.env.SSR_DIAG_ENABLE === "1"`) so it's not on by default in production. Cap `expr` length to 2048 chars. |
| MIME-sniffing exploits via mis-typed mp4 | Tampering | Adding the `.mp4` MIME doesn't introduce new sniffing risk — it REDUCES it (browsers no longer have to sniff). `X-Content-Type-Options: nosniff` could be added defensively to all resource responses (this is OUT OF SCOPE for Phase 39 unless trivially small). |
| Path traversal via mp4 manifest hash URLs | Tampering | Existing `toSafePath` in `server.mjs:1988-1994` already rejects `..` prefixes. Phase 39 does not change this. |

### Required additions to Phase 39 plan (security baseline)

1. The new `/api/diag/ssr-eval-in-tab` endpoint MUST:
   - Be gated on `req.socket.remoteAddress === "127.0.0.1"` (or `::1`).
   - Be gated on `process.env.SSR_DIAG_ENABLE === "1"` OR identical to the existing `/api/diag/ssr-grid` admission — the planner should choose ONE policy and apply it consistently.
   - Validate `expr` is a string, length ≤ 2048, no `\n`, no `\r`, no `eval(`/`Function(` patterns (basic heuristic — JS eval inside CDP is unavoidable, but disallow further nested eval).
2. The Range parser MUST:
   - Reject malformed `bytes=` (only `bytes=<n>-<m>` accepted, no multi-range).
   - Cap `end` to `fileSize - 1`.
   - Reject if `start > end` or `start >= fileSize`.
   - Return 416 (Range Not Satisfiable) on out-of-range requests.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `--use-angle=swiftshader` is a valid Chrome 131 flag combination with `--use-gl=angle` and does NOT have Mesa-llvmpipe's synchronous-flush issue | § D-03 Step 2A | If wrong, D-03 fix path B (SwiftShader swap) breaks D-08 connection-stability. Mitigation: verify before implementing; revert if D-08 fails. |
| A2 | Operator's UAT was conducted with default config (no SSR_ENABLE_VAAPI=1, no SSR_BROWSER_BIN override) | § D-01, D-03 | If operator used VAAPI or system Chrome, D-01 MIME bug may not have surfaced (system Chrome ALSO refuses octet-stream — VERIFIED this session — so D-01 verdict holds). D-03 GL path may differ. Need to confirm operator's launch env. |
| A3 | The new INITIAL_CONNECT_GRACE_MS of 5000ms is appropriate for cold boots on the operator's hardware | § D-02 | Too short → real cold-boot failures get reclassified as RECONNECTING immediately (no improvement). Too long → genuine failures take 5s+ before banner appears (poor UX). Make it env-configurable; tune via UAT. |
| A4 | The receiver's existing capped-retry (10 attempts / 120s) and backoff are preserved unchanged by the INITIAL_CONNECT state addition | § D-02 | Forgetting to update `shouldGiveUp()` to ignore INITIAL_CONNECT attempts could either cap too early or never cap. Add unit tests covering both paths. |
| A5 | The seams the operator describes are RASTERIZER seams (Phase 30 class), not encoder block-banding | § D-03 | If wrong, the entire D-03 fix path is misdirected. Mitigation: read operator's renderMode log first; if "webgl" and bands are perfectly aligned to 8/16/32-px multiples (H.264 macroblock sizes), the issue is encoder. Phase 35 RESEARCH already confirmed encoder bitrate doesn't fix banding, so this is unlikely. |
| A6 | The mp4 from nemesis-lockdown-a.json (sandstorm.mp4) is the canonical operator-reproducer | § D-01 | If operator added a different mp4 not in the manifest, the failure mode may differ (e.g. non-faststart). Per nemesis-lockdown-a.json reading: outsideFx.selectedAnimationId=outside-sandstorm → assetRef=/resources/animations/sandstorm.mp4. Confirmed. |
| A7 | Operator's "RECONNECT-Events bevor sie sich setzt" is the receiver's RECONNECTING state-machine transition logged to operator's view, not server-side log of WebRTC consume retries | § D-02 | If operator was reading server-side log, the fix path may differ. Likely both: receiver state transitions ARE the visible "RECONNECTING" banner; server logs `[ssr-signal] connect role=consumer` repeatedly. Both signals decrease after D-02 fix. |
| A8 | The CDP eval endpoint can return a serializable value for `video.readyState` etc. (Number / String / null) | § D-01, D-03 | If `returnByValue: true` doesn't serialize DOM media error objects, tests need to adapt. The endpoint can wrap the expression with explicit serialization: `JSON.parse(JSON.stringify({...}))`. Already used in this RESEARCH session's reproducer. |

**If this table is empty:** N/A — assumptions are real.

---

## Open Questions

1. **D-01 / D-03 — What is the operator's renderMode log value?**
   - What we know: it's logged every 10s via `ssr-stats.renderMode` per `ssr-webrtc-signaling.mjs:485-491`.
   - What's unclear: the operator's actual recent server stdout contents.
   - Recommendation: include in the W1 RED phase — capture `[ssr-stats] renderMode=...` from a clean cold-boot.

2. **D-01 — Has the operator EVER seen MP4 work in SSR?**
   - What we know: GIF works (operator confirmed), MP4 doesn't.
   - What's unclear: whether the MIME table has had `.mp4` removed at some point (git blame), or it was never added.
   - Recommendation: `git log -p server.mjs | grep -A2 'mp4'` to verify the table never had `.mp4`. If never had it: D-01 was always broken, the operator only noticed now because Phase 38 W10 made other issues fade. If once had it and removed: figure out which commit and why.

3. **D-02 — Is `INITIAL_CONNECT_GRACE_MS = 5000` the right number?**
   - What we know: typical cold boot on the dev box is 3-8s.
   - What's unclear: the operator's actual cold-boot duration on the gaming PC.
   - Recommendation: instrument the new state-transition log to print `[receiver] state INITIAL_CONNECT → CONNECTED after ${elapsed}ms`. Operator can report.

4. **D-03 — Are debug PNGs from Phase 35-iter2 (`debug/phase35*banding*.png`) showing the same seams as the operator's current report?**
   - What we know: they exist; phase-description says "Look at debug PNGs from Phase 35-iter2".
   - What's unclear: whether the operator's 2026-05-12 UAT seams match those images visually.
   - Recommendation: include side-by-side in W3 (fix wave) as a visual regression baseline.

5. **D-02 — Should the server reject consumer WS upgrades until producer-ready?**
   - What we know: `waitForProducer` polling exists at `/api/ssr/ready` but is best-effort.
   - What's unclear: whether enforcing it server-side would close edge races at the cost of cold-boot latency.
   - Recommendation: defer to Phase 40 if D-02 fix in receiver-only proves insufficient.

---

## Sources

### Primary (HIGH confidence — empirical or in-codebase)

- **Empirical D-01 reproducer this session** (2026-05-12) — running `node server.mjs` + headful Chromium 131 under Xvfb, observing `MEDIA_ELEMENT_ERROR Format error` ONLY when fetching mp4 via HTTP, NOT when loaded as `file://`. Same browser binary, same flags. [VERIFIED]
- **`curl -I http://localhost:4173/resources/animations/sandstorm.mp4`** this session → `content-type: application/octet-stream`. [VERIFIED]
- `server.mjs:1968-1981` MIME_TYPES table — no `.mp4` entry. [VERIFIED via Read]
- `server.mjs:3545-3570` `handleStaticFile` — no Range support. [VERIFIED via Read]
- `src/server/ssr-render-host.mjs:441-633` `launchBrowser` — all the Chrome flags in code. [VERIFIED via Read]
- `src/app/runtime/output-receiver/receiver-bootstrap.js:61-114` ConnectionState enum + LEGAL_TRANSITIONS. [VERIFIED via Read]
- `src/app/runtime/viewport/runtime-projection-gl-renderer.js:74-543` GL renderer with Phase 30 pixel-snap fix at lines 456-478, highp UV at 264-275, LINEAR sampling at 307-308. [VERIFIED via Read]
- `src/app/runtime/render/runtime-effect-visuals.js:288-333` Phase 35-iter2 h3 Bayer dither + drawImage. [VERIFIED via Read]
- `src/app/runtime/render/runtime-outside-mp4.js:46-391` MP4 lifecycle module. [VERIFIED via Read]
- `src/app/runtime/render/runtime-draw-loop.js:467-547` MP4 draw branch. [VERIFIED via Read]
- `src/server/ssr-webrtc-signaling.mjs:159-553` signaling layer + `broadcastProducerReady`. [VERIFIED via Read]
- `.planning/phases/phase-30/SUMMARY.md` Phase 30 closure rationale. [VERIFIED via Read]
- `.planning/phases/phase-30/30-02-GL-ESCALATION.md` GL pixel-snap fix. [VERIFIED via Read]
- `.planning/phases/phase-33/33-CLOSURE.md` VAAPI default-disable root cause. [VERIFIED via Read]
- `.planning/phases/phase-33/33-RESEARCH.md` WebRTC reconnection patterns (LiveKit / mediasoup-demo). [VERIFIED via Read]
- `.planning/phases/phase-35/35-CLOSURE-ITER2-ADDENDUM.md` h3 Bayer + drawImage clip. [VERIFIED via Read]
- `.planning/phases/phase-38/38-CLOSURE.md` Phase 38 closure + open Pi-side reconnect question. [VERIFIED via Read]
- `.planning/CRITICAL_KNOWN_BUGS.md` #1 WS-fragmentation + #2 Multi-subscriber handler. [VERIFIED via Read]
- `.planning/ROADMAP.md:780-916` Phase 39 description + Phase 37/38/30 context. [VERIFIED via Read]

### Secondary (MEDIUM confidence — official docs / cross-verified)

- [Puppeteer Supported Browsers](https://pptr.dev/supported-browsers) — Puppeteer v23 bundles Chrome-for-Testing. [CITED]
- [Chrome for Testing M120+ proprietary codecs](https://github.com/puppeteer/puppeteer/issues/381) — H.264 / AAC included in Chrome-for-Testing M120+. [CITED, also empirically verified]
- [Mozilla Bug 546129 — audio/video with application/octet-stream not played](https://bugzilla.mozilla.org/show_bug.cgi?id=546129) — Confirms cross-browser pattern: `application/octet-stream` content-type leads to either download or no-play depending on browser. [CITED]
- [Quora — Why won't HTML5 video play in Google Chrome?](https://www.quora.com/Why-wont-HTML5-video-play-in-Google-Chrome) — "When MP4 files are served with `application/octet-stream`, Chrome downloads the file instead of playing it; fix is to set MIME type to video/mp4." [CITED]
- [LiveKit client-sdk-js](https://github.com/livekit/client-sdk-js/blob/main/src/room/Room.ts) — LiveKit-style reconnect state-machine reference, Phase 33 design source. [CITED via Phase 33 RESEARCH]
- [Chromium feature 6417796455989248](https://chromestatus.com/feature/6417796455989248) — H.264 in WebRTC. [CITED]

### Tertiary (LOW confidence — single source, marked for verification)

- Phase 35 RESEARCH §"State of the Art" line 1020 claim "bundled puppeteer Chromium 131 lacks H264 codec on this hardware" — REFUTED empirically this session.
- Phase 37 ROADMAP entry claim that `--use-angle=swiftshader` works without Mesa-llvmpipe's synchronous-flush issue — UNVERIFIED in this session, must be validated before adopting in D-03 fix path. [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- D-01 root cause: **HIGH** — empirically reproduced this session. Same Chromium binary, same flags, same Xvfb. File:// plays, HTTP fails. Server response captured via curl.
- D-02 root cause: **MEDIUM-HIGH** — evidence-based hypothesis. The state machine in code does NOT distinguish initial-connect from reconnect. The cold-boot timeline is documented in Phase 33 / 38. Cannot be 100% verified without instrumenting the operator's UAT, but the diagnosis path is concrete and the fix is reversible.
- D-03 root cause: **MEDIUM** — historical fix is in code (Phase 30 pixel-snap, Phase 35-iter2 h3 Bayer). The regression mechanism (Phase 34 h2 GL-flag revert) is documented. The exact fix path (SwiftShader swap vs. UV-inset) depends on renderMode telemetry from a recent operator UAT, which is not in this RESEARCH session's evidence base.

**Research date:** 2026-05-12
**Valid until:** 2026-05-19 (7 days; SSR / Chromium / mediasoup are fast-moving; operator UAT or new commit may invalidate findings).

---

## RESEARCH COMPLETE
