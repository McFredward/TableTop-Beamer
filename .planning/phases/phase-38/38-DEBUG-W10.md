# Phase 38 W10 — debug log: WebSocket frame fragmentation drop on real LAN

**Status:** RESOLVED 2026-05-11
**Master:** 0283ee8 (RED reproducer) → fix on this branch
**Operator evidence:** Server stdout log captured 2026-05-11 showing
xrandrv2 EMIT followed by 1m 23s gap with no `server-recv` until ESC.

## Phase summary

W2–W9 fixed the apply path (Pi receives + applies remote grid snapshots,
SSR + dashboard converge on operator gestures). The operator's
ground-truth log proved a separate bug on the SEND path: xrandrv2's
9×9 grid-snapshot broadcast from Pi /output/ never reached the server's
mutation handler, while test2's 3×3 drag broadcasts continued to land.

## Root cause

`server.mjs:1485` shipped a hand-rolled `decodeWebSocketTextFrame` that
decoded a single WebSocket frame from one Buffer chunk. The handler
treated `socket.on("data", chunk)` as if every chunk delivered a
complete frame:

```js
function decodeWebSocketTextFrame(chunk) {
  if (!chunk || chunk.length < 6) return null;
  ...
  if (chunk.length < cursor + 4 + payloadLength) return null;
  ...
}
```

There is no per-socket reassembly buffer and no accumulation across
`data` events. On localhost (MTU 65536), even a 5 KB frame is delivered
in a single chunk — so every Playwright live-e2e test (W2..W9, all
21 tests) passed. On real Ethernet (MTU 1500), the OS splits the WS
frame across multiple TCP segments. Each segment arrives as a separate
`data` event:

- Segment 1: WS frame header + ~1380 bytes of payload. `chunk.length`
  is too small for `cursor + 4 + payloadLength` (e.g. 1380 < 2 + 4 + 5000).
  Decoder returns `null`. Error logged to LIVE_LOG (file, not stdout),
  frame dropped.
- Segments 2..N: tail bytes without a frame header → opcode is whatever
  random payload byte happened to be first → also dropped silently.

xrandrv2 is 9×9 = 81 points → serialized JSON ~3-5 KB → ALWAYS fragments
on MTU 1500. test2 is 3×3 = 9 points → ~1 KB → fits in one segment.
That's why the operator's drag-of-test2 burst all reached the server
but the subsequent xrandrv2 profile-load did not.

ESC eventually works because its discard broadcast hits a less-loaded
TCP send window — sometimes the OS coalesces all bytes into a single
chunk before delivering to the application layer (depends on Nagle/cwnd/
ack timing). Multiple ESCs increase the probability one falls in such
a window — explaining the operator's "ESC once → still desync, ESC
twice → finally OK" experience.

## Reproducer

`test/phase-38-w10-ws-frame-fragmentation.test.mjs` connects a raw TCP
socket to the WS endpoint, completes the upgrade handshake, then sends
WebSocket frames as separate `socket.write()` calls (mimicking MTU-1500
TCP segment delivery). Four cases:

1. SMALL frame (532 B, atomic write) → server-recv appears (sanity)
2. LARGE frame (3185 B, two half-writes) → on master `server-recv`
   does NOT appear within 2s. Test fails. **THIS IS THE BUG.**
3. LARGE frame (3185 B, byte-by-byte writes) → on master fails too.
4. Two frames concatenated in one write → on master only first byte
   of the concat is decoded (pre-fix), both decoded post-fix.

Cases 2–4 all pass after the fix.

## Fix

Replace `decodeWebSocketTextFrame(chunk)` with `tryDecodeWebSocketFrame(buf)`
returning `{kind: "need-more"|"frame"|"protocol-error", frame?, consumed}`.
Per-socket `recvBuf` accumulates bytes from each `data` event; a drain
loop calls `tryDecodeWebSocketFrame` until either `need-more` (wait for
more bytes) or buffer empty. `protocol-error` advances past the broken
header to make forward progress.

Hard 8 MB cap on the accumulator + 8 MB cap on individual frame payload
(unchanged from pre-W10) preserves the existing memory budget against
misbehaving clients.

## Files changed

- `server.mjs`: replaced `decodeWebSocketTextFrame` with
  `tryDecodeWebSocketFrame` (streaming-capable). Per-socket `recvBuf` +
  drain loop in `socket.on("data")` handler.
- `test/phase-38-w10-ws-frame-fragmentation.test.mjs`: NEW reproducer +
  regression test (4 cases).
- `test/live-e2e/test_phase38_w10_drag_burst_then_profile_load.py`: NEW
  Playwright reproducer (passes pre-fix on localhost; documents operator
  scenario as a sanity check).
- `.planning/debug/phase-38-w10-pi-broadcast-send-path.md`: investigation
  log.

## Verification

- `node --test test/phase-38-w10-ws-frame-fragmentation.test.mjs` →
  4/4 passing.
- `python3 -m pytest test/live-e2e/test_phase38_*.py -v` → 21/21 passing.
- `RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs`
  → 1/1 passing (D-08 stays GREEN).
- `node --test 'test/*.test.mjs' 'test/**/*.test.mjs'` → 400 tests,
  383 pass, 17 skip, 0 fail (unit-suite regression-clean).

## Why 8 weeks of fixes missed this

Every prior wave (W2..W9) tested over localhost — MTU 65536 → no
fragmentation → bug invisible. The W6 picker test even loaded xrandrv2
(9×9) through the same code path, with the same broadcast — but
because the test was localhost-only the 5 KB frame never split, so
the test passed on master while real-world operator UAT failed.

The operator's "ESC eventually fixes it" feedback was a critical clue:
identical-content broadcasts where one fails and another succeeds points
to wire-level (not state-level) loss. Once we instrumented `bufferedAmount`
and `ws.readyState` on the Pi side, both showed clean (OPEN, 0 buffered)
— pushing the suspicion onto the server's receive path. Reading
`decodeWebSocketTextFrame` revealed the single-chunk assumption.

Mental model lesson: a "test passes locally but the operator's real
deployment fails" pattern that recurs over multiple waves is a signal
to question the test environment itself, not just the production code.
Loopback MTU vs Ethernet MTU is a common gap. The W10 fragmentation
test deliberately bypasses kernel networking entirely to force the
fragmented-delivery condition the operator's LAN exhibits naturally.
