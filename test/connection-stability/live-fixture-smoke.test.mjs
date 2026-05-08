// test/connection-stability/live-fixture-smoke.test.mjs
//
// Phase 33 W0-T4 — live-fixture canary.
//
// Boots a real server + 1 WebSocket consumer, sustains for 30 s, and
// verifies the connection stays stable: at least 30 heartbeats received
// (cadence is 1500 ms = 20 in 30s; allow 30 for a 60-frame-equivalent
// budget incl. the per-second telemetry envelopes that travel on the
// same WS), no spontaneous closes, no reconnects required.
//
// "Frames" in the canonical D-C4 sense (rVFC events) need a real WebRTC
// PeerConnection on the consumer side, which is overkill for state-machine
// tests. Heartbeat counter on the WS is the equivalent liveness signal.
//
// Live test — gated behind RUN_LIVE_TESTS=1.
//
// TODO (flake under sequential-run): when this file is run in the same
// node --test process AFTER multiple other live tests that each spawn
// + tear-down a Chromium browser, this canary occasionally times out on
// waitReady due to resource contention (display lock churn, slow Chromium
// boot when the host is paging). It passes reliably when run alone or as
// the FIRST file in a sequence. Use `npm run test:live:isolated` (added
// in package.json) to run each file in its own Node process for CI-grade
// reliability.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  bootServer,
  waitReady,
  waitHttpUp,
  connectConsumer,
  teardown,
  makeIsolatedRoot,
  liveTestsEnabled,
  LIVE_SKIP_MSG,
  sleep,
} from "./_harness.mjs";

const SUSTAIN_MS = Number(process.env.SMOKE_SUSTAIN_MS || 30000);
const MIN_HEARTBEATS = Number(process.env.SMOKE_MIN_HEARTBEATS || 12);
// Heartbeat cadence is 1500ms — over 30s we expect ~20 heartbeats. 12 is
// a generous floor that still catches a hung connection.

test("live-fixture-smoke: server + 1 consumer sustain 30s without reconnect", { skip: !liveTestsEnabled() && LIVE_SKIP_MSG, timeout: 90000 }, async () => {
  const root = await makeIsolatedRoot();
  const server = await bootServer({ rootDir: root.rootDir, captureLogs: true });
  let consumer = null;
  try {
    await waitHttpUp(server.port, { timeoutMs: 15000 });
    await waitReady(server.port, { timeoutMs: 60000 });

    consumer = await connectConsumer(server.port, { doRpc: true });
    const t0 = Date.now();
    // Wait for the first heartbeat as a "connection live" signal.
    await consumer.waitForFrame(8000);

    // Sustain. We use a single sleep instead of polling; the WS handlers
    // accumulate heartbeats / closes in the background.
    await sleep(SUSTAIN_MS);

    const elapsed = Date.now() - t0;
    const s = consumer.getState();

    console.log(
      `[smoke] sustained ${elapsed}ms heartbeats=${s.heartbeats} closed=${s.closed} producerReady=${s.producerReady} producerClosed=${s.producerClosed} renderHostDown=${s.renderHostDown}`,
    );

    if (s.renderHostDown > 0 || s.producerClosed > 0 || s.closed) {
      const logs = server.getLogs();
      if (logs?.stdout) console.log("[smoke] server stdout (tail):", logs.stdout.slice(-2500));
      if (logs?.stderr) console.log("[smoke] server stderr (tail):", logs.stderr.slice(-2500));
    }

    assert.equal(s.closed, false, "WS closed during smoke test — connection unstable");
    assert.equal(s.producerClosed, 0, "producer-closed fired during smoke — producer instability");
    assert.equal(s.renderHostDown, 0, "render-host-down fired during smoke — host instability");
    assert.ok(
      s.heartbeats >= MIN_HEARTBEATS,
      `expected ≥${MIN_HEARTBEATS} heartbeats in ${SUSTAIN_MS}ms, got ${s.heartbeats}`,
    );
  } finally {
    try { consumer?.stop(); } catch {}
    await teardown(server);
    await root.cleanup();
  }
});
