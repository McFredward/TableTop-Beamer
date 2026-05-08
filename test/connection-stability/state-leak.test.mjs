// test/connection-stability/state-leak.test.mjs
//
// Phase 33 W0-T3 — state-leak baseline test.
//
// Boots a real server, runs 50 connect/disconnect cycles, samples server
// process RSS + open FD count after each cycle, fails if either metric
// grows >20% from the post-warmup baseline.
//
// Live test — gated behind RUN_LIVE_TESTS=1.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  bootServer,
  waitReady,
  waitHttpUp,
  connectConsumer,
  teardown,
  makeIsolatedRoot,
  readPidMetrics,
  liveTestsEnabled,
  LIVE_SKIP_MSG,
  sleep,
} from "./_harness.mjs";

const N_CYCLES = Number(process.env.STATE_LEAK_CYCLES || 50);
const GROWTH_THRESHOLD_PCT = 20;

test("state-leak: 50 connect/disconnect cycles do not grow RSS/FD by >20%", { skip: !liveTestsEnabled() && LIVE_SKIP_MSG, timeout: 240000 }, async () => {
  const root = await makeIsolatedRoot();
  const server = await bootServer({ rootDir: root.rootDir });
  try {
    await waitHttpUp(server.port, { timeoutMs: 8000 });
    await waitReady(server.port, { timeoutMs: 30000 });

    // Warm-up: a few connect cycles so JIT, mediasoup buffers, etc. settle
    // before the baseline sample. Without this the baseline is artificially
    // low and the threshold trips spuriously.
    for (let i = 0; i < 5; i += 1) {
      const c = await connectConsumer(server.port, { doRpc: true });
      await c.waitForFrame(3000);
      c.stop();
      await sleep(150);
    }
    await sleep(500);

    const baseline = await readPidMetrics(server.pid);
    if (baseline.rssKb == null || baseline.fdCount == null) {
      console.warn("[state-leak] /proc unreadable on this platform; skipping growth assertion");
      return;
    }

    let peakRss = baseline.rssKb;
    let peakFd = baseline.fdCount;
    let lastRss = baseline.rssKb;
    let lastFd = baseline.fdCount;
    const samples = [];

    for (let i = 0; i < N_CYCLES; i += 1) {
      const c = await connectConsumer(server.port, { doRpc: true });
      await c.waitForFrame(3000);
      c.stop();
      // Tiny delay to let the close handler decrement consumerCount etc.
      await sleep(80);
      const m = await readPidMetrics(server.pid);
      if (m.rssKb != null) {
        peakRss = Math.max(peakRss, m.rssKb);
        lastRss = m.rssKb;
      }
      if (m.fdCount != null) {
        peakFd = Math.max(peakFd, m.fdCount);
        lastFd = m.fdCount;
      }
      samples.push({ i, rssKb: m.rssKb, fdCount: m.fdCount });
    }

    const rssGrowthPct = (lastRss - baseline.rssKb) / baseline.rssKb * 100;
    const fdGrowthPct = (lastFd - baseline.fdCount) / baseline.fdCount * 100;

    console.log(
      `[state-leak] baseline rss=${baseline.rssKb}KB fd=${baseline.fdCount} → after ${N_CYCLES} cycles rss=${lastRss}KB fd=${lastFd}`,
    );
    console.log(`[state-leak] growth rss=${rssGrowthPct.toFixed(1)}% fd=${fdGrowthPct.toFixed(1)}%`);

    assert.ok(
      rssGrowthPct <= GROWTH_THRESHOLD_PCT,
      `RSS grew ${rssGrowthPct.toFixed(1)}% — exceeds ${GROWTH_THRESHOLD_PCT}% leak budget`,
    );
    assert.ok(
      fdGrowthPct <= GROWTH_THRESHOLD_PCT,
      `FD count grew ${fdGrowthPct.toFixed(1)}% — exceeds ${GROWTH_THRESHOLD_PCT}% leak budget`,
    );
  } finally {
    await teardown(server);
    await root.cleanup();
  }
});
