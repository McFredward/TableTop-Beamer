# Critical Known Bugs — Test Coverage Requirements

This file captures bug classes that MUST be exercised by tests because they
are localhost-invisible or otherwise easy to regress.

---

## #1 — WebSocket frame fragmentation (server.mjs `tryDecodeWebSocketFrame`)

### Discovery

Phase 38 W10 (2026-05-12, commit `df69a74`). The operator suffered **9 weeks
of fixes** that addressed real bugs but missed THIS one because every test
ran over localhost.

### What the bug was

`server.mjs`'s hand-rolled WebSocket decoder assumed each
`socket.on("data", chunk)` event delivered a complete WS frame. There was
**NO per-socket reassembly buffer** and **NO accumulation across data events**.

On localhost (MTU 65536) every WS frame up to ~64 KB fits in one chunk →
every test passed, every UAT in dev passed.

On real Ethernet (MTU 1500) any WS frame larger than ~1380 bytes (typical
TCP MSS) splits across multiple TCP segments → server's WS handler
SILENTLY DROPS the message.

### What it looked like to the operator

- Simple profiles (3×3 = 9 points, ~1 KB payload) → always worked
- Complex profiles (9×9 = 81 points, ~3-5 KB) → desync EVERY profile-load
- Drag broadcasts (small per-step deltas) → always worked
- "ESC unstucks it sometimes after 3-6 presses" → TCP coalescing chance
  occasionally lands all bytes in a single delivered chunk (Nagle / cwnd /
  ack timing)
- "Wackel-test always works" → drag broadcasts are small enough
- "Profile-load sometimes works, sometimes doesn't" → small/large payload
  divergence

### Why every prior wave missed it

- W1 added CDP diagnostics. Tests posted via HTTP — never touched WS framing.
- W2-W4 fixed Pi /output/'s thin output-live-sync.js apply path. All tests
  on localhost.
- W5 fixed server cold-boot fallback for missing disk file. Server-side
  but not WS-layer.
- W6 built a UI-driven picker test loading xrandrv2. RAN ON LOCALHOST.
  Fragmentation didn't happen → test passed → false negative.
- W7 suppressed SSR's defensive broadcast.
- W8 suppressed Pi /output/'s defensive activate broadcast.
- W9 fixed overlay-on-align-off + slow-path key-ordering.

Every wave was a real bug. **None of them tested fragmented frames.**

### The fix

`server.mjs`: replaced `decodeWebSocketTextFrame(chunk)` with a streaming
`tryDecodeWebSocketFrame(buf) → {kind, consumed}` plus a per-socket
`recvBuf` accumulator. Drain loop yields complete frames as bytes become
decodable across multiple data events. 8 MB cap on both accumulator and
payload to bound memory.

### MANDATORY test rail: `test/phase-38-w10-ws-frame-fragmentation.test.mjs`

This test deliberately bypasses kernel coalescing by writing each half of
a large WS frame via separate `socket.write()` calls — forcing
`socket.on("data")` to receive multiple chunks. This mimics real-LAN
segment delivery.

**Any future change to `server.mjs`'s WS handling MUST keep this test
green.**

### Future test discipline

When adding a feature that broadcasts state via WebSocket:
- Compute approximate JSON payload size of the largest realistic case
- If > ~1380 bytes, the broadcast WILL fragment on real-LAN
- Add a fragmentation-stress test that sends a payload of similar size in
  TWO `socket.write()` calls (split anywhere except at the framing-header
  boundary)
- DO NOT rely on Playwright tests over localhost to catch this

### Symptoms to recognize this bug class in future operator UATs

If operator reports:
- Bug appears only with certain payload sizes / complex states
- Bug is intermittent — sometimes works, sometimes doesn't
- Bug appears on real hardware but tests pass on dev box
- Bug is "unstuck" by repeated identical actions

→ Suspect TCP fragmentation. Check whether the message format is
sensitive to it (WS frames, HTTP responses without Content-Length, etc.).

---

## #2 — Multiple handler subscriptions on same liveSync event

### Discovery

Phase 38 W11 (2026-05-12). Operator reported overlay didn't disappear on
align-off DESPITE the W9 fix to boot-handle-ui's subscription.

### What the bug was

`output-live-sync.js`'s subscription contract uses `Set` to hold handlers.
The Set iteration in `emit()`:
```js
for (const h of handlers[event]) { ... }
```

JavaScript Set iteration semantics: if a handler deletes another handler
from the Set before it's been visited, the deleted handler is SKIPPED for
THIS emit.

For align-mode-change:
- `output-align-mode-loader.js` subscribes FIRST (at module init)
- `boot-handle-ui.js` subscribes SECOND (only when loader.activate() runs)

On align-off:
- Loader's handler fires first → `deactivate()` → `_currentBootHandle.stop()`
- Inside `stop()`: `_offAlignModeChange()` removes boot-handle-ui's
  handler from the Set
- Iteration continues to the next handler... but boot-handle-ui's was
  just removed → SKIPPED
- Boot-handle-ui's actual teardown work (handles + lineCanvas + polygons)
  never runs

### The fix (commit pending)

In `boot-handle-ui.js`'s `stop()`: call `HANDLE_UI.onAlignModeChange(false)`
BEFORE unsubscribing the listeners. Teardown runs regardless of
iteration-deletion race.

### Future discipline

When you have multiple subscribers on the same event AND one subscriber's
handler unsubscribes other subscribers (via direct or chained `.stop()`),
either:
1. The unsubscribing handler should do all the cleanup work itself BEFORE
   unsubscribing, OR
2. The event emitter should snapshot the handler list before iterating
   (`for (const h of [...handlers[event]])`) to avoid mid-iteration deletion

Adding multiple subscribers to a shared event source is a footgun.
Document the order-of-subscription assumption when it matters.

---

## #3 — MP4 served as `application/octet-stream` causes silent decode failure (Chromium 131+)

### Discovery

Phase 39 D-01 (2026-05-12, commits `ed3e481` + `a956cf9`). Operator UAT after Phase 38
closure reported: GIF animations work in SSR, MP4 animations don't (Nemesis Lockdown
A's `sandstorm.mp4` outside-region animation shows a black frame).

### What the bug was

`server.mjs`'s MIME_TYPES table had no `.mp4` entry. `handleStaticFile` fell back
to `application/octet-stream` for any unknown extension. Chromium 131's
`<video>` element refuses to decode media served as `application/octet-stream`
regardless of file content — it sets `error.code = 4` (MEDIA_ELEMENT_ERROR) and
`readyState = 0` immediately.

The MIME table was missing ALL common video/audio types: `.mp4`, `.webm`, `.m4v`,
`.mov`, `.ogg`, `.aac`, `.m4a`. Plus `handleStaticFile` did not implement HTTP
Range requests — `<video>` clients that seek mid-stream would re-download the
entire file every time.

### What it looked like to the operator

- `[gif-probe] decode-success` for `.gif` (Chromium decodes via image pipeline)
- `<video>` for `.mp4` shows a black frame, `error={code:4, message:"Format error"}`
- `readyState=0`, `videoWidth=0`, `currentTime=0` permanently
- No console errors on the server side — file IS being served, just with wrong type
- Curl probe shows `Content-Type: application/octet-stream` instead of `video/mp4`

### Why every prior wave missed it

- Phase 17 Outside-MP4 module worked over `file://` URLs in dashboard before SSR
  pivot — file:// has different MIME-sniffing than http://
- Phase 31 SSR pivot moved everything to http:// served by `server.mjs` — exposed
  the missing MIME table
- Phase 35-iter2 / 36 / 37 / 38 testing focused on grid sync / WS fragmentation /
  align mode — never specifically validated MP4 decode on the SSR HTTP path
- `application/octet-stream` is a "silent" misconfiguration — server logs show 200
  OK, asset is served, no visible error anywhere except deep in Chromium's
  internal media-source decoder

### The fix

`server.mjs` MIME_TYPES extended with 7 video/audio entries (commit `ed3e481`):

```js
".mp4": "video/mp4",
".webm": "video/webm",
".m4v": "video/mp4",
".mov": "video/quicktime",
".ogg": "video/ogg",
".aac": "audio/aac",
".m4a": "audio/mp4",
```

`server.mjs` `handleStaticFile` extended with RFC 7233 single-range support
(commit `a956cf9`): parses `Range: bytes=N-M`, returns 206 + `Content-Range:
bytes N-M/total`, validates against `416 Range Not Satisfiable`, advertises
`Accept-Ranges: bytes` on ALL responses (not just 206) so clients know seek is
supported. Multi-range requests (rare in our LAN deployment) fall through to
200 full-file response per RFC 7233 §4.4.

### MANDATORY test rails

- `test/phase-39-d01-mime-and-range.test.mjs` (unit, source-regex)
- `test/live-e2e/test_phase39_d01_mp4_in_ssr.py` (live, attaches `<video>` to SSR
  tab, calls `play()`, probes `readyState/currentTime/videoWidth/error` via CDP)

**Any future change to `server.mjs`'s MIME table or static-file handler MUST keep
these tests green.**

### Future discipline

- When adding a new asset type, BOTH (a) extend MIME_TYPES table AND (b) add a
  test that asserts the server returns the correct `Content-Type` header — never
  rely on Chromium's MIME-sniffing for `<video>`, `<audio>`, or `<source>` elements.
- For any media element, verify `readyState >= 1` (HAVE_METADATA) within a
  reasonable timeout. `readyState=0` after `play()` indicates either MIME or
  codec failure — both class #3.
- If serving media files over http://, ALWAYS implement Range requests. Many
  decoders use Range to skip metadata atoms / seek to a specific timestamp; a
  server that ignores Range forces full re-download on every seek.

### Symptoms to recognize this bug class in future operator UATs

If operator reports:
- A media element shows a black/empty frame but the file is on disk
- Asset loads (server log shows 200 OK) but doesn't render
- Worked over `file://` (e.g., during dev) but breaks on `http://`
- Only certain extensions affected (e.g., `.gif` works, `.mp4` doesn't)

→ Suspect MIME-table misconfiguration. Curl the asset and check the
`Content-Type` response header. If it's `application/octet-stream`, you've
found the bug class.

---

## #4 — Cold-boot reconnect storms are state-machine classification artifacts

### Discovery

Phase 39 D-02 (2026-05-12, commits `bcd8538` + `3893ac7` + `fa4dc04`). Operator UAT
after Phase 38 closure reported: "once connected, connection is stable, but before
that there are repeated RECONNECT events" — visible "RECONNECTING — Xs (attempt N)"
banner flashing during the legitimate 3-10s publisher-boot race window.

### What the bug was

`receiver-bootstrap.js`'s `LEGAL_TRANSITIONS` had no state distinguishing
first-attempt cold-boot from steady-state reconnect. The initial state was `NEW`;
on `tryConnect()` it went directly to `CONNECTING`; on any failure it routed to
`RECONNECTING` — which fired the visible banner UI (showCountdownReconnect).

But during cold-boot:
- The SSR publisher tab needs ~3-10s to boot + open WebSocket + open mediasoup
  publisher RPC.
- The receiver attempts to connect IMMEDIATELY when the page loads.
- The first 1-5 connect attempts fail because the publisher isn't ready yet.
- Each failure transitions to RECONNECTING → fires the "RECONNECTING — attempt N"
  banner.
- Eventually the publisher is ready and the connect succeeds.

The visible state machine logically said "reconnect storm" — but reality was "the
publisher is in its normal 3-10s boot window." There was no real reconnect; this
was a classification error.

### What it looked like to the operator

- Hard-refresh /output/ on the projector
- 0-5 seconds: red "RECONNECTING — 1s (attempt 1)" banner flashes
- 5-10 seconds: more flashes "RECONNECTING — Xs (attempt N)"
- Eventually: stream connects, banner hides, video plays
- Once connected: connection is rock solid (no real reconnect storms)

### The fix

`receiver-bootstrap.js` extended with new state `ConnectionState.INITIAL_CONNECT`:

```js
LEGAL_TRANSITIONS: NEW -> {INITIAL_CONNECT, STOPPED}
                  INITIAL_CONNECT -> {CONNECTED, RECONNECTING, HOST_DOWN, STOPPED}
```

`tryConnect()` routes the first call through INITIAL_CONNECT (NEW -> CONNECTING is
no longer legal). `handleConnectFailure()` helper checks `elapsed since first
attempt < INITIAL_CONNECT_GRACE_MS (5000ms)` — under grace, retries silently;
after grace, escalates to RECONNECTING and the existing capped-retry budget engages.
`shouldGiveUp()` does NOT count INITIAL_CONNECT attempts against the
10-attempt / 120s budget (preserves Phase 33 capped-retry semantics).

`receiver-status-ui.js` `showInitialConnect()` reuses the existing CONNECTING
splash element — operator sees "Connecting to render server…" not "RECONNECTING".

### MANDATORY test rails

- `test/phase-39-d02-state-machine.test.mjs` (unit, 5 subtests asserting legal
  transitions)
- `test/connection-stability/phase-39-cold-boot.test.mjs` (integration, boots a
  fresh server, counts reconnectingEvents in 30s; assertion < 2)
- `test/connection-stability/receiver-state-machine.test.mjs` (Phase 33
  carry-forward, adapted to NEW -> INITIAL_CONNECT)

**Any future refactor of the receiver state machine MUST preserve the
NEW -> INITIAL_CONNECT routing and the INITIAL_CONNECT_GRACE_MS grace window.**

### Future discipline

- When a state machine has a "transient" state (cold-boot, publisher-boot,
  ICE-gathering), give it an EXPLICIT enum entry — don't reuse the
  steady-state "RECONNECTING" state. Otherwise the UI will show steady-state
  copy during a transient and confuse operators.
- Grace windows should be configurable (env + window override) so operators
  can tune for slow hardware.
- Capped-retry budgets should be partitioned by failure class — INITIAL_CONNECT
  attempts should not consume the same budget as steady-state reconnects.

### Symptoms to recognize this bug class in future operator UATs

If operator reports:
- "Reconnect storms before stable connection"
- "Banner says reconnecting but eventually it just works"
- "Cold boot looks scary but warm boot is fine"
- Timing correlates with another subsystem's boot duration (DB, tab, RPC, ICE)

→ Suspect state-machine classification. Add an explicit "INITIAL" state with a
grace window and silent retries. The UI copy should match the actual state, not
default to "reconnecting" for any pre-CONNECTED failure.

---

## #5 — Mesh-warp seams in SSR are sensitive to Chromium GL backend selection

### Discovery

Phase 39 D-03 (2026-05-12, commit `1a8cef2`). Operator UAT after Phase 38 closure
reported: "the visible seam lines... especially in solid-color animations are
obviously visible — they should completely disappear — in the past we've fixed this
problem before, after SSR implementation it returned."

### What the bug was

The mesh-warp fragment shader sampled `texture2D(uTex, vUV)` directly with the
interpolated UV coordinates. At triangle boundaries between mesh cells, GL's
linear texture filtering would sample BEYOND the cell boundary by 0.5 texels
(half-pixel offset inherent in linear sampling). Adjacent cells thus pulled
slightly different colors from the source texture at the shared edge → visible
1-px ridges along grid-cell boundaries.

This was particularly visible on solid-color overlays (where the cells should
render identically) but was a general artifact of any mesh-warp output.

But the fix depends on which GL backend Chromium chose:
- **renderMode=gl** (Mesa/native GL, ANGLE GLES): the fragment shader runs;
  the fix is a UV-inset epsilon in the shader (sub-path B).
- **renderMode=2d** or **gl->2d fallback**: Chromium fell back to 2D rasterizer;
  the fragment shader doesn't run; the fix is a Chrome flag swap to
  `--use-angle=swiftshader` to force GL on (sub-path A).
- **renderMode=swiftshader**: already on the software GL path; sub-path B applies.

Layering sub-path A onto sub-path B is safe; layering A alone on a system that
needs B leaves the seams; layering A on a Mesa-llvmpipe system risks the Phase 34
hotfix h2 synchronous-flush hang (D-08 fail>0).

### What it looked like to the operator

- Solid-color animations (e.g., red fill at 60% alpha) show faint or visible
  vertical/horizontal lines along grid-cell boundaries.
- 3×3 grid: subtle but present.
- 9×9 grid: clearly visible.
- Pre-Phase 30 was fixed once; Phase 31 SSR pivot re-introduced it because the
  post-warp pixel grid is now sampled via Chromium's compositor, which exposed
  fragment-shader sampling artifacts that didn't exist in the dashboard-only path.

### The fix

`runtime-projection-gl-renderer.js` fragment shader extended with UV inset
(commit `1a8cef2`):

```glsl
varying highp vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uTexSize;  // NEW
void main(){
  vec2 uv = clamp(vUV, 0.5 / uTexSize, 1.0 - 0.5 / uTexSize);  // NEW
  gl_FragColor = texture2D(uTex, uv);
}
```

JS-side `_glUniTexSize` uniform location + `gl.uniform2f(loc, w, h)` upload
before each `drawElements`. Null-guarded for cases where the GLSL optimizer
culls the uniform.

Sub-path A (Chrome flag swap) was NOT implemented — dev-box `renderMode=gl`,
so sub-path B alone is sufficient. The fallback contract in
`.planning/phases/phase-39/39-4-SUBPATH.md` documents how to layer sub-path A
if operator hardware shows a different renderMode.

### MANDATORY test rails

- `test/phase-39-d03-render-mode-probe.test.mjs` (integration, probes
  `window.__ttBeamerEffectiveRenderMode?.()` via CDP — asserts renderMode does
  NOT contain "2d"; appends every observation to `.planning/phases/phase-39/39-1-DIAG.md`)
- `test/live-e2e/test_phase39_d03_no_seams.py` (live, parametric 3×3 / 5×5 / 9×9,
  applies non-identity warp, triggers solid-color, measures per-line mean RGB
  delta along interior cell boundaries; assertion max_delta < 4)

**Any future fragment-shader change in `runtime-projection-gl-renderer.js` MUST
preserve the uTexSize uniform setup AND keep `test_phase39_d03_no_seams.py`
green on all 3 parametric grid sizes.**

### Future discipline

- Before touching ANY GL code in this project, query `[ssr-stats] renderMode=`
  from server logs (or `/api/diag/ssr-eval-in-tab?expr=window.__ttBeamerEffectiveRenderMode%3F.()`).
  If renderMode is `2d`, the fragment shader isn't even running — fixing the
  shader is a no-op. If renderMode is `gl`, the shader IS running — Chrome flag
  swaps are unnecessary and risk D-08 regression.
- Decision rule:
  - renderMode = `2d` or `gl->2d` → sub-path A (flag swap, with D-08 sanity check)
  - renderMode = `gl` or `swiftshader` → sub-path B (shader edit)
  - Both can be layered if needed; A alone never suffices for `gl` backends.
- ALWAYS run D-08 connection-stability (`live-fixture-smoke.test.mjs`) immediately
  after any Chrome-flag change. If `closed=true` or `producerReady>0` or
  `renderHostDown>0` appears, REVERT the flag — it's likely the Mesa-llvmpipe
  synchronous-flush hang from Phase 34 hotfix h2.

### Symptoms to recognize this bug class in future operator UATs

If operator reports:
- "Streaks/seams/lines along grid-cell boundaries"
- "Solid colors aren't quite uniform"
- "Worked before SSR pivot, broke after"
- "1-pixel-wide ridge along warped cell edges"

→ Read `renderMode` first, choose sub-path, apply fix, run D-08, ship. Never
guess which sub-path; the renderMode telemetry is deterministic.
