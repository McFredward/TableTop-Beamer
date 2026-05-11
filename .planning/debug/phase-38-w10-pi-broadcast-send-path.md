---
status: verifying
trigger: "operator log shows xrandrv2 EMIT log fires from Pi /output/ but no server-recv follows; ESC eventually unblocks it"
created: 2026-05-11T12:00:00Z
updated: 2026-05-11T13:30:00Z
---

## Current Focus

hypothesis: CONFIRMED. Server.mjs's hand-rolled WebSocket decoder
`decodeWebSocketTextFrame` (server.mjs:1485-1534) cannot reassemble
WS frames split across multiple TCP chunks. On real Ethernet (MTU 1500),
xrandrv2's ~5KB frame splits across ~4 TCP segments. The server receives
the first segment with frame header + partial payload, fails the
`chunk.length < cursor + 4 + payloadLength` check at line 1522, returns
null → `[invalid-ws-frame]` logged to LIVE_LOG (not stdout, so operator
doesn't see it) → frame silently dropped. Subsequent segments have no
WS frame header → also dropped.

test: test/phase-38-w10-ws-frame-fragmentation.test.mjs
proved:
  - SMALL (532 bytes) atomic write → server-recv appears
  - LARGE (3185 bytes) written in two halves → server-recv NEVER appears

ESC eventually works because:
  - Discard broadcast happens in a less-loaded TCP send window after
    drag-burst quiesces
  - With Nagle's algorithm + delayed-ACK, frames may sometimes coalesce
    into a single chunk if the OS write buffer happens to be empty
  - On localhost (MTU 65536) this NEVER reproduces, which is why our
    Playwright live-e2e tests pass on master

fix: replace the single-chunk decoder with a streaming reassembly buffer
that accumulates bytes across socket.on("data") events and yields complete
WS frames as they become available.

next_action: implement streaming WS frame reassembler. Preserve existing
text frame contract (close frame, 8MB cap, masked client→server). Verify
W10 fragmentation test goes GREEN, then re-run all Phase 38 + connection-
stability tests.

## Symptoms

expected: After Pi /output/ loads xrandrv2 via picker, server logs
`[align-grid-snapshot] server-recv ... dims=9×9 profile=xrandrv2`
within 500ms.

actual: Server receives the `EMIT` diag-log (via piDiag/HTTP), then
~1m 23s of silence. ESC #1 eventually produces a server-recv. ESC #2
finally triggers the SSR-tab apply.

errors: None. No `[align-grid-snapshot-rejected]` log. No socket-error.
The xrandrv2 broadcast WS message is silently lost.

reproduction: Per operator log:
1. Server boots with xrandrv2 (9×9) on disk → SSR applies via live-hello.
2. Operator loads test2 → broadcasts → server-recv → SSR applies.
3. Operator drags handles on test2 (~30Hz, ~50 broadcasts) → all reach.
4. Operator loads xrandrv2 via Pi /output/'s Load profile picker.
5. Pi piDiag-logs the EMIT (via HTTP POST /api/diag-log → server stdout).
6. NO server-recv WS log appears.
7. ~1m 23s gap. Operator presses ESC → ESC handler fires
   discardChanges → broadcastGridSnapshot → server-recv appears.
8. Second ESC finally applies.

started: 2026-05-11 UAT, after W2..W9 patches landed.

## Eliminated

(empty)

## Evidence

- timestamp: 2026-05-11T12:00:00Z
  checked: grid-state.broadcastGridSnapshot rate-limit (line 442-513).
  found: force=true bypasses the rate-limit at line 463 entirely.
  EMIT log is logged at line 484-501 BEFORE the void
  liveSyncCore.emitLiveMutation call at line 503. So if EMIT log
  appears, emitLiveMutation IS invoked.
  implication: The fault is downstream of grid-state — either in
  output-live-sync's emitLiveMutation, the WS send, or server-side
  WS message handler.

- timestamp: 2026-05-11T12:00:00Z
  checked: output-live-sync.emitLiveMutation (lines 404-448).
  found: When ws.readyState !== OPEN, message queued in
  _pendingLatestByType, console.warn on Pi (invisible to server).
  When ws.readyState === OPEN, ws.send + sets _lastLocalBroadcastAtMs.
  Catch block on send-throw: queues + console.warn (invisible).
  implication: If ws.send fails or queues silently, there's no
  server-side trace. Need to instrument.

- timestamp: 2026-05-11T12:00:00Z
  checked: Server WS message handler (server.mjs:1830-1864).
  found: Every parsed live-mutation goes through enqueueLiveMutation.
  No logging on receive — the only log is in applyLiveMutation at
  line 1242 (after validation passes). validateAlignGridSnapshotPayload
  rejects log `[align-grid-snapshot-rejected]` (via logErrorEvent →
  file log, NOT stdout). Operator log shows no rejection.
  implication: Need to add a server-side log on every incoming
  WS message to confirm whether the xrandrv2 broadcast reaches the
  handler at all.

- timestamp: 2026-05-11T12:00:00Z
  checked: Coalesce key for align-grid-snapshot (line 1003-1012).
  found: NON_COALESCING_MUTATIONS does NOT include align-grid-snapshot.
  So coalesce key = `${clientId}:align-grid-snapshot:global`.
  All snapshot broadcasts from same client coalesce.
  Coalesce REPLACES the previous entry with the new payload — last
  writer wins. The xrandrv2 snap would replace any previous test2
  snap in the queue.
  implication: Coalescing per se isn't a loss path; it's actually
  a "newest wins" path.

- timestamp: 2026-05-11T12:00:00Z
  checked: Profile-load on Pi /output/ via Load profile button.
  found: Pi's bundle DOES include profile-persistence.js (line 57
  of output-align-mode-loader.js). _getProfilePersistApi resolves
  to window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE.
  profileLoadFlow at line 511 of profile-persistence.js does:
  pushUndo → applyGridPayload → _loadedProfileName=name →
  _loadedProfileSnapshot=snapshot → ... → broadcastGridSnapshot.
  implication: The broadcast IS issued from Pi /output/ via profile
  picker. The path runs through synchronous JS — no chance for ws
  state to change between EMIT log and ws.send unless there's an
  await between.

- timestamp: 2026-05-11T12:00:00Z
  checked: profileLoadFlow body (lines 518-583 of profile-persistence.js).
  found: There IS an await between EMIT log and ws.send:
  - line 520: await fetch(`/api/projection-profiles/load?...`)
  - line 522: const body = await resp.json()
  - line 552: pushUndo (sync)
  - line 553: applyGridPayload (sync) — sets grid points
  - line 554: _loadedProfileName = name (sync)
  - line 555-568: misc sync
  - line 578: broadcastGridSnapshot({ force: true })

  The HTTP fetch is BEFORE the broadcast — no await between.
  Within broadcastGridSnapshot, EMIT log fires BEFORE
  liveSyncCore.emitLiveMutation. piDiag's fetch is fire-and-forget
  (no await). So in the synchronous frame: EMIT log POSTed via
  HTTP (asynchronous), emitLiveMutation called (synchronous).

  But emitLiveMutation calls ws.send which IS synchronous on the
  WebSocket — it pushes onto the send buffer. There's no way for
  the EMIT log to land at server BEFORE ws.send completes locally.
  Unless... ws.send buffer is full and the call returns without
  actually writing the frame to the socket?
  implication: Need to instrument ws.send entry to log whether the
  call returned normally vs threw.

- timestamp: 2026-05-11T13:00:00Z
  checked: Server's hand-rolled decodeWebSocketTextFrame (server.mjs:1485-1534).
  found: The function decodes a single WS frame from ONE Buffer chunk.
  - Line 1486: `chunk.length < 6` → null
  - Line 1522: `chunk.length < cursor + 4 + payloadLength` → null
  - Line 1516: payload > 8 MB → null
  The decoder is called from socket.on("data", chunk) at line 1797 with NO
  accumulation across chunks. Any frame that spans multiple TCP segments
  is silently dropped (only logged via logErrorEvent → file, not stdout).
  implication: This is the root cause. Confirmed by W10 fragmentation
  test in test/phase-38-w10-ws-frame-fragmentation.test.mjs:
    - SMALL (532 bytes) atomic ws.write → server-recv appears ✓
    - LARGE (3185 bytes) split as two half-writes → server-recv MISSING ✗

- timestamp: 2026-05-11T13:00:00Z
  checked: Loopback MTU vs Ethernet MTU.
  found: lo has MTU 65536. Real Pi → server LAN has MTU 1500.
  xrandrv2's 9×9 grid serialised to WS frame is ~3-5 KB depending on
  fp precision. On localhost this fits one chunk; on real LAN it
  splits across 3-4 TCP segments.
  implication: This is why every prior Playwright live-e2e test
  (which uses localhost 127.0.0.1) PASSES — they all benefit from
  the giant loopback MTU. The bug only surfaces on real-network
  deployments — i.e., the operator's Pi → server setup.

## Resolution

root_cause: Server's hand-rolled decodeWebSocketTextFrame at server.mjs:1485
assumes each `socket.on("data", chunk)` event delivers a complete WebSocket
frame. It performs no accumulation across chunks and no reassembly. On real
Ethernet (MTU 1500), the xrandrv2 grid-snapshot's ~3-5KB frame fragments
across multiple TCP segments. Only the first chunk reaches
decodeWebSocketTextFrame, which fails its frame-length check and returns
null. Subsequent chunks are also treated as standalone frames with no
header — also dropped. The xrandrv2 broadcast is silently lost while
test2's smaller (~1KB) broadcasts continue to fit in single chunks. ESC's
identical-size discard broadcast happens later when the TCP send window
is in a different state — sometimes it coalesces on the wire into a
single segment too, depending on Nagle/cwnd/ack timing.

fix: Replaced the single-chunk decoder with tryDecodeWebSocketFrame
(returns "need-more"/"frame"/"protocol-error" + consumed-bytes). Per-socket
recvBuf accumulates bytes from each `socket.on("data")` event; a drain
loop yields complete frames as they become decodable. 8 MB cap on both
the accumulator and individual frame payload preserved. text + close
opcodes handled. Unmasked client frames (RFC 6455 §5.1 violation) and
unknown opcodes treated as protocol-error and advance past the broken
header to make forward progress.

verification:
  - test/phase-38-w10-ws-frame-fragmentation.test.mjs: 4/4 passing
    (SMALL atomic, LARGE two-halves, LARGE byte-by-byte, two frames
    concatenated). All four cases proved the bug on master 0283ee8.
  - test/live-e2e/test_phase38_*.py: 21/21 passing including W10.
  - test/connection-stability/live-fixture-smoke.test.mjs (D-08): 1/1
    passing with RUN_LIVE_TESTS=1.
  - node --test 'test/*.test.mjs' 'test/**/*.test.mjs': 400 tests,
    383 pass, 17 skip, 0 fail.

files_changed:
  - server.mjs (decodeWebSocketTextFrame → tryDecodeWebSocketFrame +
    per-socket recvBuf reassembly buffer; drain loop in socket.on("data"))
  - test/phase-38-w10-ws-frame-fragmentation.test.mjs (new — 4 frag
    pattern tests proving fix)
  - test/live-e2e/test_phase38_w10_drag_burst_then_profile_load.py
    (new — operator-scenario Playwright reproducer)
  - .planning/phases/phase-38/38-DEBUG-W10.md (debug report)
