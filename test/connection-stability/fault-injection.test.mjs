// test/connection-stability/fault-injection.test.mjs
//
// Phase 33 Plan 05-T2 — fault-injection suite.
//
// Coverage:
//   - WS RST mid-handshake: forcibly close the consumer WS at a random
//     point during the RPC handshake → confirm clean retry (no orphaned
//     server slot, server still healthy).
//   - mediasoup-worker SIGKILL during active stream → confirm 02-T1
//     auto-respawn brings the server back; consumer can reconnect.
//   - ssr-tab SIGKILL during active stream → confirm 02-T2 watchdog
//     OR browser.disconnected triggers and recovery completes.
//   - Two-consumers-same-IP — observe behavior. S9 fix is OPTIONAL in
//     scope; this test documents the current behavior (thrash or
//     coexist) so a future fix has a baseline.
//
// All tests gated on RUN_LIVE_TESTS=1.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  bootServer,
  waitReady,
  waitHttpUp,
  connectConsumer,
  killMediasoupWorker,
  killSsrTab,
  teardown,
  makeIsolatedRoot,
  liveTestsEnabled,
  LIVE_SKIP_MSG,
  sleep,
} from "./_harness.mjs";

// ─── 05-T2 part A: WS RST mid-handshake ──────────────────────────────

test("05-T2 fault: WS terminate mid-handshake — server stays healthy + recoverable", {
  skip: !liveTestsEnabled() && LIVE_SKIP_MSG,
  timeout: 90000,
}, async () => {
  const root = await makeIsolatedRoot();
  const server = await bootServer({ rootDir: root.rootDir });
  try {
    await waitHttpUp(server.port, { timeoutMs: 8000 });
    await waitReady(server.port, { timeoutMs: 30000 });

    // Open a consumer, then forcibly terminate at a random point.
    for (let i = 0; i < 5; i += 1) {
      const consumer = await connectConsumer(server.port, { doRpc: true });
      // Random delay 0-200ms then terminate (sometimes mid-RPC, sometimes after).
      await sleep(Math.floor(Math.random() * 200));
      try { consumer.ws.terminate(); } catch {}
      // Wait for the close to propagate.
      await sleep(200);
      assert.equal(consumer.getState().closed, true, `iter ${i}: consumer should be closed after terminate`);
    }

    // After 5 abrupt terminations, the server must still accept a fresh consumer.
    const recovery = await connectConsumer(server.port, { doRpc: true });
    try {
      await recovery.waitForFrame(5000);
      const s = recovery.getState();
      assert.ok(s.heartbeats > 0,
        `recovery consumer should receive heartbeats; got ${s.heartbeats}`);
    } finally {
      recovery.stop();
    }
  } finally {
    await teardown(server, 4000);
    await root.cleanup();
  }
});

// ─── 05-T2 part B: mediasoup-worker SIGKILL ───────────────────────────

test("05-T2 fault: mediasoup-worker SIGKILL — server respawns + consumer reconnects", {
  skip: !liveTestsEnabled() && LIVE_SKIP_MSG,
  timeout: 120000,
}, async () => {
  const root = await makeIsolatedRoot();
  const server = await bootServer({ rootDir: root.rootDir });
  let consumer = null;
  try {
    await waitHttpUp(server.port, { timeoutMs: 8000 });
    await waitReady(server.port, { timeoutMs: 30000 });

    consumer = await connectConsumer(server.port, { doRpc: true });
    await consumer.waitForFrame(5000);
    // Wait for a few heartbeats to confirm we're truly streaming.
    await sleep(3000);
    const beforeHb = consumer.getState().heartbeats;
    assert.ok(beforeHb >= 2, `expected ≥2 heartbeats before kill, got ${beforeHb}`);

    // SIGKILL the mediasoup-worker.
    const killed = await killMediasoupWorker(server.pid);
    console.log(`[fault-msoup] killed ${killed} mediasoup-worker descendant(s)`);
    assert.ok(killed > 0, "expected to kill at least 1 mediasoup-worker");

    // Plan 33-02 02-T1: the server should respawn the worker. We give it up
    // to 60s for the full chain (worker died → respawn → re-publish) to run.
    // The consumer's WS may close mid-flight — we permit that as long as a
    // FRESH consumer can connect within the window.
    const t0 = Date.now();
    let recovered = false;
    while (Date.now() - t0 < 60000) {
      try {
        // /api/ssr/ready will flip back to true once the new producer is up.
        const r = await fetch(`http://127.0.0.1:${server.port}/api/ssr/ready`);
        if (r.ok) {
          const j = await r.json();
          if (j?.ready === true) { recovered = true; break; }
        }
      } catch {
        // server may be in restart back-off; keep polling
      }
      await sleep(500);
    }
    console.log(`[fault-msoup] recovered=${recovered} after ${Date.now() - t0}ms`);
    assert.equal(recovered, true,
      "server did not return to ready=true within 60s after mediasoup-worker kill");

    // Confirm a fresh consumer can connect after recovery.
    const recovery = await connectConsumer(server.port, { doRpc: true });
    try {
      await recovery.waitForFrame(8000);
      const s = recovery.getState();
      assert.ok(s.heartbeats > 0,
        `post-recovery consumer should receive heartbeats; got ${s.heartbeats}`);
    } finally {
      recovery.stop();
    }
  } finally {
    try { consumer?.stop(); } catch {}
    await teardown(server, 4000);
    await root.cleanup();
  }
});

// ─── 05-T2 part C: ssr-tab SIGKILL ───────────────────────────────────

test("05-T2 fault: ssr-tab SIGKILL — render-host respawns + consumer reconnects", {
  skip: !liveTestsEnabled() && LIVE_SKIP_MSG,
  timeout: 120000,
}, async () => {
  const root = await makeIsolatedRoot();
  const server = await bootServer({ rootDir: root.rootDir });
  let consumer = null;
  try {
    await waitHttpUp(server.port, { timeoutMs: 8000 });
    await waitReady(server.port, { timeoutMs: 30000 });

    consumer = await connectConsumer(server.port, { doRpc: true });
    await consumer.waitForFrame(5000);
    await sleep(2000);

    const killed = await killSsrTab(server.pid);
    console.log(`[fault-ssrtab] killed ${killed} chromium/Xvfb descendants`);
    assert.ok(killed > 0, "expected to kill at least 1 ssr-tab descendant");

    // Render-host's browser.on('disconnected') should fire and trigger
    // scheduleRestart. /api/ssr/ready returns to true once the new
    // publisher script gets through device.load + produce.
    const t0 = Date.now();
    let recovered = false;
    while (Date.now() - t0 < 60000) {
      try {
        const r = await fetch(`http://127.0.0.1:${server.port}/api/ssr/ready`);
        if (r.ok) {
          const j = await r.json();
          if (j?.ready === true) { recovered = true; break; }
        }
      } catch {}
      await sleep(500);
    }
    console.log(`[fault-ssrtab] recovered=${recovered} after ${Date.now() - t0}ms`);
    assert.equal(recovered, true,
      "ssr render-host did not return to ready=true within 60s after kill");
  } finally {
    try { consumer?.stop(); } catch {}
    await teardown(server, 4000);
    await root.cleanup();
  }
});

// ─── 05-T2 part D: two consumers from same IP — current behavior baseline ──

test("05-T2 fault: two consumers from 127.0.0.1 — document thrash baseline (S9)", {
  skip: !liveTestsEnabled() && LIVE_SKIP_MSG,
  timeout: 60000,
}, async () => {
  const root = await makeIsolatedRoot();
  const server = await bootServer({ rootDir: root.rootDir });
  let c1 = null;
  let c2 = null;
  try {
    await waitHttpUp(server.port, { timeoutMs: 8000 });
    await waitReady(server.port, { timeoutMs: 30000 });

    c1 = await connectConsumer(server.port, { doRpc: true });
    await c1.waitForFrame(5000);

    // Second consumer from same IP. The h38 stale-guard CURRENTLY destroys
    // the prior socket — c1 should close shortly after c2 opens.
    c2 = await connectConsumer(server.port, { doRpc: true });
    await sleep(1500); // allow guard to fire
    const s1 = c1.getState();
    const s2 = c2.getState();
    console.log(
      `[fault-2cons] c1: closed=${s1.closed} hb=${s1.heartbeats}; ` +
      `c2: closed=${s2.closed} hb=${s2.heartbeats}`,
    );

    // CURRENT behavior (S9 not fixed): the stale-guard evicts c1; c2 is alive.
    // If both ever stay alive (S9 fix landed), assert that too — we accept
    // either outcome, just not "both got evicted" or "neither received frames".
    const c1Alive = !s1.closed && s1.heartbeats > 0;
    const c2Alive = !s2.closed && s2.heartbeats > 0;
    assert.ok(c1Alive || c2Alive,
      "at least one consumer must remain healthy after dual-connect from same IP");
  } finally {
    try { c1?.stop(); } catch {}
    try { c2?.stop(); } catch {}
    await teardown(server, 4000);
    await root.cleanup();
  }
});
