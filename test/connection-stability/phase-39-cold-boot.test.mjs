// Phase 39 Plan 39-1 Task 2 — D-02 RED test for cold-boot RECONNECTING storm.
//
// Purpose
// -------
// Reproduce the operator-visible cold-boot reconnect storm: on the first
// ~5-15 seconds after a fresh server boot, the Pi /output/ consumer racks
// up 3-6 RECONNECTING transitions before the publisher comes up. The
// receiver's state machine classifies every failed `tryConnect()` as
// RECONNECTING because there is no INITIAL_CONNECT state.
//
// This test boots a fresh server, opens a consumer WS, observes the
// `connectionState`-equivalent server signals (producer-ready / heartbeat
// / consume-rpc replies), and counts how many times the consumer-side
// state machine WOULD transition to RECONNECTING.
//
// Since the harness's `connectConsumer` is a raw WS client (not the full
// receiver state machine), we PROXY the count via:
//   - WS open → 1 attempt counter started
//   - 'producer-not-yet' / consume RPC failure / WS close events =>
//     count as one transition to RECONNECTING
//
// After Plan 39-3 lands (INITIAL_CONNECT state + 5s grace), the first
// failure should stay in INITIAL_CONNECT (no RECONNECTING event) until
// the grace elapses. On a healthy box where publisher boots in <5s,
// zero RECONNECTING events should fire.
//
// Today the test asserts `< 2 RECONNECTING transitions` and FAILS
// because the receiver's pre-CONNECTED retries are all RECONNECTING.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  bootServer,
  waitHttpUp,
  connectConsumer,
  teardown,
  liveTestsEnabled,
  LIVE_SKIP_MSG,
  sleep,
} from "./_harness.mjs";

test("D-02 cold-boot RECONNECTING events < 2 in first 30s", async (t) => {
  if (!liveTestsEnabled()) {
    t.skip(LIVE_SKIP_MSG);
    return;
  }

  // Fresh server boot — isolated config, fresh display, no warm cache.
  const handle = await bootServer({ publish: true, renderHost: true, captureLogs: true });
  let reconnectingEvents = 0;
  let connectionStateLog = [];
  let consumer = null;

  try {
    // Don't wait for /api/ssr/ready — the whole point is to attach a
    // consumer DURING the cold-boot window. We do wait for HTTP so the
    // WS upgrade can route.
    await waitHttpUp(handle.port, { timeoutMs: 30000 });

    // Open a consumer WS. The harness consumer captures producer-ready /
    // producer-closed / render-host-down events. We synthesize the
    // receiver-side state-transition equivalents from these.
    //
    // For RED purposes, we use the simplest proxy: each gap between WS
    // open and producer-ready that exceeds the 8s server-side hold OR
    // each render-host-down event counts as one RECONNECTING transition.
    consumer = await connectConsumer(handle.port, { timeoutMs: 15000 });
    connectionStateLog.push({ ts: Date.now(), state: "NEW->CONNECTING (ws-open)" });

    // The receiver-bootstrap state machine fires RECONNECTING when:
    //   1. WS closes before producer-ready
    //   2. consume RPC returns no-producer-yet
    //   3. recvTransport state goes "failed" / "disconnected"
    //   4. heartbeat-stale OR frame-stale gates
    // Since the raw consumer doesn't run the state machine, we
    // approximate by counting:
    //   - WS close events (handle.getState().closed becomes true)
    //   - producer-closed events
    //   - render-host-down events
    //   - heartbeat-stale (no heartbeat for > 8s) episodes
    //
    // ALL of the above land the receiver in RECONNECTING in production
    // today (per receiver-bootstrap.js).
    const T_START = Date.now();
    const T_END = T_START + 30000;
    let lastHeartbeatAt = T_START;
    let heartbeatStaleEpisodes = 0;

    while (Date.now() < T_END) {
      const state = consumer.getState();
      if (state.closed && connectionStateLog[connectionStateLog.length - 1]?.state !== "ws-closed") {
        reconnectingEvents += 1;
        connectionStateLog.push({ ts: Date.now(), state: "ws-closed" });
        break; // can't observe further
      }
      // Heartbeat-stale gate: receiver fires reconnect after 8s without a heartbeat.
      if (state.lastHeartbeatAtMs > lastHeartbeatAt) {
        lastHeartbeatAt = state.lastHeartbeatAtMs;
      }
      const heartbeatAge = Date.now() - lastHeartbeatAt;
      if (heartbeatAge > 8000 && heartbeatStaleEpisodes === 0 && state.heartbeats === 0) {
        // Never got a heartbeat in the first 8s → this would trip the
        // receiver's heartbeat-stale gate → RECONNECTING transition.
        heartbeatStaleEpisodes += 1;
        reconnectingEvents += 1;
        connectionStateLog.push({ ts: Date.now(), state: "heartbeat-stale → RECONNECTING" });
        lastHeartbeatAt = Date.now(); // avoid re-counting
      }
      // Render-host-down or producer-closed both fire RECONNECTING.
      if (state.renderHostDown > 0
          && !connectionStateLog.some((e) => e.state.includes("render-host-down"))) {
        reconnectingEvents += 1;
        connectionStateLog.push({ ts: Date.now(), state: "render-host-down → RECONNECTING" });
      }
      if (state.producerClosed > 0
          && !connectionStateLog.some((e) => e.state.includes("producer-closed"))) {
        reconnectingEvents += 1;
        connectionStateLog.push({ ts: Date.now(), state: "producer-closed → RECONNECTING" });
      }
      await sleep(500);
    }

    // Emit a diagnostic line that test 39-1 verify can grep for.
    console.log(`[d-02-cold-boot] reconnectingEvents=${reconnectingEvents}`);
    console.log(`[d-02-cold-boot] connectionStateLog=${JSON.stringify(connectionStateLog)}`);

    assert.ok(
      reconnectingEvents < 2,
      `Expected <2 RECONNECTING events in 30s cold-boot, got ${reconnectingEvents}. `
      + `Transition log: ${JSON.stringify(connectionStateLog)}. `
      + `After Plan 39-3 (INITIAL_CONNECT state) the receiver should stay in `
      + `INITIAL_CONNECT during the first 5s grace and only escalate to `
      + `RECONNECTING if publisher-boot takes longer.`,
    );
  } finally {
    try { consumer?.stop?.(); } catch { /* ignore */ }
    await teardown(handle).catch(() => {});
  }
});
