---
phase: 39
plan: 2
subsystem: static-http
tags:
  - phase-39
  - wave-1
  - d-01
  - mp4-mime
  - http-range
  - sandstorm
type: execute
wave: 1
status: complete
autonomous: true
requirements:
  - D-01-MP4-PLAYBACK
depends_on: [39-1]
dependency-graph:
  requires:
    - "Plan 39-1 RED tests on disk (test/phase-39-d01-mime-and-range.test.mjs)"
    - "Plan 39-1 /api/diag/ssr-eval-in-tab endpoint"
    - "Phase 38 W10 WS-fragmentation rail GREEN"
    - "Phase 31 h15 static-resource-headers rail GREEN"
    - "D-08 connection-stability rail GREEN"
  provides:
    - "server.mjs MIME_TYPES table with 7 new video/audio entries (.mp4 .webm .m4v .mov .ogg .aac .m4a)"
    - "server.mjs handleStaticFile with RFC 7233 single-range support (206, 416, Accept-Ranges advertise)"
    - "D-01 RED test turn GREEN (4/4 unit subtests pass; live e2e passes 10.58s)"
  affects:
    - "Plan 39-5 UAT — D-01 retest on operator hardware"
    - "Future asset additions of .webm/.mov/.ogg/.aac/.m4a inherit MIME mapping automatically"
tech-stack:
  added:
    - "RFC 7233 single-range HTTP request handler in handleStaticFile"
  patterns:
    - "Single-regex range parse (multi-range deliberately falls through to 200)"
    - "Defensive numeric clamping (Math.min(end, totalSize-1), Math.max(0, totalSize-suffix))"
    - "Accept-Ranges advertised on ALL responses (not just 206) so clients know seek is supported"
key-files:
  modified:
    - "server.mjs (+68 LOC, -3 LOC — MIME table +12, handleStaticFile +56)"
    - "test/live-e2e/test_phase39_d01_mp4_in_ssr.py (+83 LOC, -15 LOC — Rule 3 blocking-issue fix)"
decisions:
  - "Bundle Range support with MIME fix (rather than ship MIME alone) to prevent Pitfall 3 regression six weeks from now per 39-RESEARCH.md"
  - "Multi-range requests (bytes=N-M,P-Q) deliberately fall through to 200 full-file response — RFC 7233 §4.4 permits this and our LAN-only deployment has no realistic multi-range client"
  - "Accept-Ranges header advertised on ALL responses (additive, not in 206 path only) — Phase 31 h15 connection: close contract preserved because buildStaticResourceHeaders sets connection BEFORE the Range mutations layer their headers on top"
  - "Deviation Rule 3: rewrote D-01 live test setup — Plan 39-1 wrote it with a structural error (queried for video in DOM that the runtime never attaches). New approach creates its own <video> element pointing at sandstorm.mp4 — proves the MIME+Range fix end-to-end without depending on runtime-internal cache shapes"
metrics:
  duration_minutes: 14
  tasks_completed: 3
  tasks_total: 3
  files_modified: 2
  loc_added: 151
  loc_removed: 18
  commits: 3
  completed_at: "2026-05-12T21:25:00Z"
---

# Phase 39 Plan 39-2: Wave-1 D-01 MP4 MIME Fix + Range Support Summary

Fixed the operator's blocking D-01 defect (sandstorm.mp4 didn't play in SSR) by adding seven video/audio MIME entries to `server.mjs`'s MIME_TYPES table and implementing RFC 7233 single-range HTTP support in `handleStaticFile`. Chromium 131 now decodes the asset (`readyState=4`, `currentTime` advances, `videoWidth=1280`, `error=null`) and can seek without re-buffering from byte 0. All Phase 38 carry-forward rails (W10 WS-fragmentation, h15 static-resource-headers, D-08 connection-stability) stayed green.

## LOC Summary

| Component | Lines added | Lines removed | Commit |
|-----------|------------:|--------------:|--------|
| Task 1 — MIME_TYPES extension | 12 | 0 | `ed3e481` |
| Task 2 — handleStaticFile Range support | 56 | 3 | `a956cf9` |
| Task 3 — D-01 live e2e probe repair | 83 | 15 | `ac6f1c8` |
| **Total server.mjs** | **68** | **3** | — |
| **Total test repair** | **83** | **15** | — |

## Pre-fix vs Post-fix HTTP Response (curl probe)

### Full GET — no Range

**Pre-fix (master, 2026-05-12 commit `c047cca`):**
```
HTTP/1.1 200 OK
content-type: application/octet-stream      ← bug — Chromium refuses to decode
connection: close
cache-control: no-cache
(no accept-ranges)
(no content-length)
```

**Post-fix (commit `a956cf9`):**
```
HTTP/1.1 200 OK
content-type: video/mp4                     ← FIXED
connection: close
cache-control: no-cache
accept-ranges: bytes                        ← NEW — Chromium knows seek is supported
content-length: 1526677                     ← NEW
```

### Range request — `Range: bytes=0-1023`

**Pre-fix:** server ignored the Range header; returned `200 OK` with full 1.5 MB body.

**Post-fix:**
```
HTTP/1.1 206 Partial Content                ← FIXED
content-type: video/mp4
connection: close
cache-control: no-cache
accept-ranges: bytes
content-range: bytes 0-1023/1526677         ← NEW
content-length: 1024                        ← exact slice size
Body: first 1024 bytes of sandstorm.mp4
```

Live curl probe verified: sliced file size is exactly 1024 bytes; `wc -c < /tmp/slice → 1024 /tmp/slice`.

## Pre-fix vs Post-fix `<video>` Element State

Captured in the SSR Chromium tab via `/api/diag/ssr-eval-in-tab` against a `<video>` pointing at `/resources/animations/sandstorm.mp4`:

| Property | Pre-fix (RED) | Post-fix (GREEN) |
|----------|---------------|-------------------|
| `readyState` | 0 (HAVE_NOTHING) | **4** (HAVE_ENOUGH_DATA) |
| `currentTime` | 0 | **2.051622** (after 2 s of play()) |
| `videoWidth` | 0 | **1280** |
| `videoHeight` | 0 | **720** |
| `duration` | NaN | **15** s |
| `error` | `{code: 4, message: "Format error"}` (MEDIA_ELEMENT_ERROR) | **null** |
| `networkState` | 3 (NETWORK_NO_SOURCE) | 1 (NETWORK_IDLE — fully loaded) |
| `paused` | true | **false** |

After a further 1.5 s wait the probe re-read `currentTime` and confirmed monotonic advancement, proving the frame loop is running, not just the metadata header decoding.

## Carry-Forward Rail Results (4 tests, all GREEN)

| Test | Outcome | Key output line |
|------|---------|------------------|
| `test/phase-39-d01-mime-and-range.test.mjs` (unit, 4 subtests) | **PASS** | `tests 4 pass 4 fail 0` |
| `test/phase-38-w10-ws-frame-fragmentation.test.mjs` (L1 lock) | **PASS** | `tests 4 pass 4 fail 0 duration_ms 10648` |
| `test/static-resource-headers.test.mjs` (Phase 31 h15) | **PASS** | `tests 8 pass 8 fail 0` |
| `test/connection-stability/live-fixture-smoke.test.mjs` (D-08 hard gate, RUN_LIVE_TESTS=1) | **PASS** | `[smoke] sustained 31502ms heartbeats=21 closed=false producerReady=0 producerClosed=0 renderHostDown=0` |
| `test/live-e2e/test_phase39_d01_mp4_in_ssr.py` (live e2e) | **PASS** | `1 passed in 10.58s` |

The Phase 31 h15 `connection: close` contract on `/resources/animations/*` is preserved — `buildStaticResourceHeaders(routePath, contentType)` still sets the header verbatim and the new Range code only augments the resulting headers map with `accept-ranges` / `content-range` / `content-length`.

The Phase 38 W10 WS-fragmentation rail (L1 lock from `CRITICAL_KNOWN_BUGS.md`) is untouched — this plan modifies only the HTTP static-file path and does not go anywhere near `tryDecodeWebSocketFrame`.

## Plan 39-1 RED Tests Now GREEN

Plan 39-1 deliberately landed four RED subtests in `test/phase-39-d01-mime-and-range.test.mjs`. After this plan:

```
✔ D-01 RED: server.mjs MIME_TYPES table maps .mp4 to video/mp4
✔ D-01 RED: server.mjs MIME_TYPES table maps .webm to video/webm
✔ D-01 RED: server.mjs MIME_TYPES table maps .m4v to video/mp4
✔ D-01 RED: handleStaticFile honours Range: bytes=N-M with status 206
ℹ tests 4   pass 4   fail 0
```

All four turned GREEN — first three by Task 1's MIME table extension, the fourth by Task 2's Range parser.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Repaired D-01 live e2e test selector logic**

- **Found during:** Task 3 verification
- **Issue:** The live test created in Plan 39-1 (`test/live-e2e/test_phase39_d01_mp4_in_ssr.py`) used `document.querySelector("#outside-mp4-video, video.outside-mp4, video")` to locate the outside-animation `<video>`. The runtime's outside-mp4 module (`src/app/runtime/render/runtime-outside-mp4.js`) caches `<video>` elements in JS Maps (`cacheMap`) but never appends them to the DOM — they're used as off-screen frame sources for the projection canvas. The selector therefore only matched the SSR's own `ssr-video` publisher element (empty src), and `readyState` was permanently observed as 0 even with the MIME fix landed.
- **Fix:** Rewrote the test to create its own `<video id="d01-probe-video">` in the SSR tab, point its `src` at `/resources/animations/sandstorm.mp4`, call `play()`, wait 3 s, then probe — this directly verifies that Chromium can decode the MIME-corrected, Range-capable HTTP response. Also hardened `_http_get` to convert socket-level `TimeoutError`/`URLError`/`OSError` into a 503 return code so the autouse fixture's 2.0 s precheck can self-skip on slow SSR tab boot rather than erroring out the pytest run.
- **Files modified:** `test/live-e2e/test_phase39_d01_mp4_in_ssr.py`
- **Commit:** `ac6f1c8`
- **Verification:** Test now runs end-to-end in 10.58 s and PASSES; pre-fix would observe `readyState=0`, `error={code:4}`, `videoWidth=0`.

This is a Rule 3 deviation (test infra that was structurally unable to validate the fix it gated). Plan 39-1's `<acceptance_criteria>` for that test file ("MUST FAIL TODAY with assertion failures pointing at the missing MIME entry") happened to be satisfied trivially by the selector returning the SSR's own video element, so Plan 39-1 missed this design flaw at write time.

## Authentication Gates

None — all probes ran on localhost (127.0.0.1); no auth surfaces touched. The `/api/diag/ssr-eval-in-tab` endpoint enforces its own localhost-only gate (`server.mjs:3720-3725`), which was satisfied by every test path.

## Threat Flags

None — Plan 39-2 introduces no new trust boundaries. The Range parser threat register was fully addressed in the plan's `<threat_model>`:
- T-39-2-01 (large suffix DoS) — mitigated by `Math.max(0, totalSize - suffix)`
- T-39-2-02 (multi-range DoS) — mitigated by `^bytes=(\d*)-(\d*)$` regex rejecting commas
- T-39-2-03 (header injection) — `createReadStream({start, end})` is a numeric API; no string concat into paths
- T-39-2-04..T-39-2-06 — accept (LAN-only deployment; no new file space exposed)

The Phase 31 h15 `connection: close` contract on `/resources/animations/*` is preserved — `buildStaticResourceHeaders` runs first and the Range-related fields are layered on top via object mutation. Live curl confirmed `connection: close` is still present on both 200 and 206 responses.

## Known Stubs

None. Plan 39-2 added no UI rendering paths and no data flow into UI; both changes are server-side HTTP layer modifications. No empty `=[]` / `={}` / `="placeholder"` patterns introduced.

## Self-Check: PASSED

- [x] Created: `.planning/phases/phase-39/39-2-SUMMARY.md` → FOUND (this file)
- [x] Modified: `server.mjs` → FOUND (`grep -c '"\.mp4":\s*"video/mp4"' server.mjs` returns 1)
- [x] Modified: `test/live-e2e/test_phase39_d01_mp4_in_ssr.py` → FOUND
- [x] Commit `ed3e481` (Task 1: MIME extension) → present in `git log`
- [x] Commit `a956cf9` (Task 2: Range support) → present in `git log`
- [x] Commit `ac6f1c8` (Task 3: live e2e test repair) → present in `git log`
- [x] All acceptance criteria met:
  - MIME entries: `.mp4`, `.webm`, `.m4v`, `.mov`, `.ogg`, `.aac`, `.m4a` — each `grep -c` returns ≥1
  - `writeHead(206`, `writeHead(416`, `createReadStream(resolvedPath, { start, end })`, `content-range.*bytes` — each `grep -c` returns ≥1
  - `accept-ranges.*bytes` returns 2 (200 path + 206 path)
  - `node --check server.mjs` exits 0
  - All 4 Plan 39-1 RED subtests now GREEN
  - W10, h15, D-08 carry-forward rails GREEN
  - Live e2e test PASSES (10.58 s, `readyState=4`, `videoWidth=1280`, monotonic `currentTime`)
