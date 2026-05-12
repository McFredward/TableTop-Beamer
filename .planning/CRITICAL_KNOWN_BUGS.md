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
