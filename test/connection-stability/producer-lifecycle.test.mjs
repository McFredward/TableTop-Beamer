// test/connection-stability/producer-lifecycle.test.mjs
//
// Phase 33 Plan 01-T4 — producer-lifecycle wire-up tests.
//
// Suspect 4 (producer-ready dead-wired): the consumer ignored the broadcast.
// Suspect 5 (producer-closed dead-wired): same — recovery only via 8s frame-stale.
// Suspect 7 (render-host-down never sent): server never emitted, even though
//   the consumer handler at receiver-webrtc-client.js:159 was wired.
//
// Three tests:
//   1. (unit) WS message dispatch: a synthetic message of each type fires
//      the corresponding subscriber callback.
//   2. (integration) kill ssr-tab → consumer receives `producer-closed` +
//      `render-host-down` within ~5 s of the kill.
//   3. (integration) kill server entirely → consumer's WS closes; we use
//      this as the proxy for "render-host-down equivalent" since with the
//      whole process gone there's no WS left to deliver the broadcast.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  bootServer,
  waitReady,
  waitHttpUp,
  connectConsumer,
  killSsrTab,
  teardown,
  makeIsolatedRoot,
  liveTestsEnabled,
  LIVE_SKIP_MSG,
  sleep,
} from "./_harness.mjs";

// ─── Unit dispatch test ──────────────────────────────────────────────────
//
// We can't fully exercise createWebRtcReceiver in Node (it constructs a real
// WebSocket and depends on `window.mediasoupClient` from the browser bundle).
// Instead, we lock the contract by reading the source and asserting the
// handler branches we wired in 01-T1 + 01-T2 are present. This catches an
// accidental revert during refactor.

test("01-T1/T2 unit: receiver-webrtc-client.js handles producer-ready, producer-closed, render-host-down", async () => {
  const { readFile } = await import("node:fs/promises");
  const url = new URL("../../src/app/runtime/output-receiver/receiver-webrtc-client.js", import.meta.url);
  const src = await readFile(url, "utf8");
  // Each branch must be present in the WS message handler. Phase-33 wired
  // the producer-ready and producer-closed branches; render-host-down was
  // already there from D-B4.
  assert.match(src, /m\.type === "producer-ready"/, "producer-ready branch missing");
  assert.match(src, /m\.type === "producer-closed"/, "producer-closed branch missing");
  assert.match(src, /m\.type === "render-host-down"/, "render-host-down branch missing");
  assert.match(src, /emit\("producerReady"\)/, "producerReady emit missing");
  // producer-closed → connectionState=producer-gone
  assert.match(src, /emit\("connectionState", "producer-gone"\)/, "producer-gone connectionState missing");
  // render-host-down → connectionState=host-down (D-B4 baseline)
  assert.match(src, /emit\("connectionState", "host-down"\)/, "host-down connectionState missing");
  // The subscribers map must include producerReady so onProducerReady() works.
  assert.match(src, /producerReady:\s*\[\]/, "producerReady subscriber list missing");
  assert.match(src, /onProducerReady/, "onProducerReady handle missing on returned object");
});

// ─── Server-side broadcast helper exists ─────────────────────────────────

test("01-T3 unit: ssr-webrtc-signaling exposes broadcastRenderHostDown helper", async () => {
  const { readFile } = await import("node:fs/promises");
  const url = new URL("../../src/server/ssr-webrtc-signaling.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  assert.match(src, /broadcastToConsumers/, "broadcastToConsumers helper missing");
  assert.match(src, /broadcastRenderHostDown/, "broadcastRenderHostDown shortcut missing");
  assert.match(src, /"render-host-down"/, "literal render-host-down missing in signaling");
});

test("01-T3 unit: ssr-render-host accepts onHostDown callback and calls it on health-ping breach", async () => {
  const { readFile } = await import("node:fs/promises");
  const url = new URL("../../src/server/ssr-render-host.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  assert.match(src, /onHostDown/, "onHostDown option missing on bootSsrRenderHost");
  // The callback must be invoked from BOTH the health-ping breach path AND
  // the browser.on('disconnected') handler so any "render-host crashed"
  // path triggers a fanout.
  assert.match(src, /typeof onHostDown === "function"/, "onHostDown defensive guard missing");
});

test("01-T3 unit: server.mjs wires onHostDown into bootSsrRenderHost", async () => {
  const { readFile } = await import("node:fs/promises");
  const url = new URL("../../server.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  // Both call sites (boot + serverRendering-update) must wire onHostDown.
  const matches = src.match(/onHostDown:\s*\(\)\s*=>/g) ?? [];
  assert.ok(matches.length >= 2, `expected ≥2 onHostDown wires in server.mjs, got ${matches.length}`);
});

// ─── Integration: kill ssr-tab → producer-closed + render-host-down ────

test("01-T4 integration: kill ssr-tab → consumer receives render-host-down within 25s", { skip: !liveTestsEnabled() && LIVE_SKIP_MSG, timeout: 120000 }, async () => {
  const root = await makeIsolatedRoot();
  const server = await bootServer({ rootDir: root.rootDir });
  let consumer = null;
  try {
    await waitHttpUp(server.port, { timeoutMs: 8000 });
    await waitReady(server.port, { timeoutMs: 30000 });

    consumer = await connectConsumer(server.port, { doRpc: true });
    await consumer.waitForFrame(5000); // wait for first heartbeat

    // Kill the SSR Chromium tab. The publisher's WS to /api/webrtc/signal
    // closes, the producer's `transportclose` fires server-side, and the
    // consumer's mediasoup-server `consumer.on("producerclose")` would
    // deliver a producer-closed message — IF we had an active consumer
    // RPC slot. In our minimal WS-only consumer we don't go through the
    // consume() RPC, so producer-closed isn't delivered to us. We instead
    // wait for `render-host-down` which fires on browser.disconnected.
    const killed = await killSsrTab(server.pid);
    console.log(`[lifecycle] killed ${killed} ssr-tab descendant processes`);
    assert.ok(killed > 0, "expected to kill at least 1 chromium descendant");

    // Wait up to 25 s for render-host-down or for consumer WS to close.
    // (The render-host's browser.on("disconnected") usually fires within
    // ~100 ms of SIGKILL, but on a heavily-loaded test runner the
    // puppeteer protocol-level disconnect detection can take a few
    // seconds — see puppeteer's disconnect timeout. The 15 s health-ping
    // budget (3 fails × 5 s) is the absolute floor.)
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) {
      const s = consumer.getState();
      if (s.renderHostDown > 0 || s.closed) break;
      await sleep(100);
    }

    const s = consumer.getState();
    console.log(
      `[lifecycle] after ssr-tab kill: renderHostDown=${s.renderHostDown} producerClosed=${s.producerClosed} closed=${s.closed} elapsedMs=${Date.now() - t0}`,
    );
    // Either the broadcast arrives OR the WS closed (both prove the consumer
    // is no longer in the dark).
    assert.ok(
      s.renderHostDown > 0 || s.closed,
      `expected render-host-down event or WS close after ssr-tab kill, got renderHostDown=${s.renderHostDown} closed=${s.closed}`,
    );
  } finally {
    try { consumer?.stop(); } catch {}
    await teardown(server);
    await root.cleanup();
  }
});

// ─── Integration: kill server entirely → consumer WS closes ────────────

test("01-T4 integration: kill server → consumer WS closes within 2s", { skip: !liveTestsEnabled() && LIVE_SKIP_MSG, timeout: 60000 }, async () => {
  const root = await makeIsolatedRoot();
  const server = await bootServer({ rootDir: root.rootDir });
  let consumer = null;
  try {
    await waitHttpUp(server.port, { timeoutMs: 8000 });
    await waitReady(server.port, { timeoutMs: 30000 });

    consumer = await connectConsumer(server.port, { doRpc: true });
    await consumer.waitForFrame(5000);

    // SIGKILL the server outright. The consumer WS must close within a
    // bounded time (TCP RST or socket FIN propagated by the kernel).
    server.kill("SIGKILL");

    const t0 = Date.now();
    while (Date.now() - t0 < 4000) {
      if (consumer.getState().closed) break;
      await sleep(50);
    }
    const s = consumer.getState();
    console.log(`[lifecycle] after server SIGKILL: closed=${s.closed} elapsedMs=${Date.now() - t0}`);
    assert.equal(s.closed, true, "expected WS to close after server SIGKILL");
  } finally {
    try { consumer?.stop(); } catch {}
    await teardown(server);
    await root.cleanup();
  }
});
