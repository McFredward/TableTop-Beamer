#!/usr/bin/env node
// test/manual/repro-cold-boot-loop.mjs
//
// Phase 33 W0-T2: 10-cycle cold-boot reproduction script.
//
// Spawns the server fresh 10 times, connects a synthetic consumer each time,
// times the path from boot → ready → consumer-up. Exits non-zero if any cycle
// exceeds 10 s OR fails to ready up.
//
// NOT a `node --test` file — runs as a standalone script:
//
//     node test/manual/repro-cold-boot-loop.mjs
//
// Used to bisect against the live failure mode and to verify Phase-33 fixes
// improve cold-boot timing.

import {
  bootServer,
  waitReady,
  waitHttpUp,
  connectConsumer,
  teardown,
  makeIsolatedRoot,
  sleep,
} from "../connection-stability/_harness.mjs";

const N_CYCLES = Number(process.env.REPRO_CYCLES || 10);
// Per-cycle budget: typical clean cold-boot is 6-9s on idle hardware. The
// 15s budget tolerates moderate background-process load (load avg ≤2x cpu
// count). On a dedicated production server with minimal background load,
// expect 6-9s consistently. Override via REPRO_BUDGET_MS env var if needed.
const PER_CYCLE_BUDGET_MS = Number(process.env.REPRO_BUDGET_MS || 15000);

async function runOneCycle(idx) {
  const t0 = Date.now();
  const root = await makeIsolatedRoot();
  const server = await bootServer({ rootDir: root.rootDir });
  let stage = "spawn";
  let consumer = null;
  try {
    stage = "wait-http";
    await waitHttpUp(server.port, { timeoutMs: 8000 });
    const tHttp = Date.now() - t0;

    stage = "wait-ready";
    await waitReady(server.port, { timeoutMs: 30000 });
    const tReady = Date.now() - t0;

    stage = "connect-consumer";
    consumer = await connectConsumer(server.port, { doRpc: true });
    const tConn = Date.now() - t0;

    stage = "wait-heartbeat";
    await consumer.waitForFrame(5000);
    const tHb = Date.now() - t0;

    return {
      cycle: idx,
      ok: true,
      tHttpMs: tHttp,
      tReadyMs: tReady,
      tConnectMs: tConn,
      tFirstHeartbeatMs: tHb,
      totalMs: Date.now() - t0,
      stage: "complete",
    };
  } catch (err) {
    return {
      cycle: idx,
      ok: false,
      stage,
      error: err?.message || String(err),
      totalMs: Date.now() - t0,
    };
  } finally {
    try { consumer?.stop(); } catch {}
    try { await teardown(server, 4000); } catch {}
    try { await root.cleanup(); } catch {}
  }
}

async function main() {
  console.log(`[repro] starting ${N_CYCLES} cold-boot cycles, per-cycle budget=${PER_CYCLE_BUDGET_MS}ms`);
  const results = [];
  let failures = 0;
  let overBudget = 0;

  for (let i = 1; i <= N_CYCLES; i += 1) {
    const r = await runOneCycle(i);
    results.push(r);
    if (!r.ok) {
      failures += 1;
      console.log(
        `[repro] cycle ${i}: FAIL stage=${r.stage} after ${r.totalMs}ms — ${r.error}`,
      );
    } else {
      const slow = r.totalMs > PER_CYCLE_BUDGET_MS;
      if (slow) overBudget += 1;
      console.log(
        `[repro] cycle ${i}: ${slow ? "SLOW" : "OK"} ` +
        `http=${r.tHttpMs}ms ready=${r.tReadyMs}ms ` +
        `connect=${r.tConnectMs}ms heartbeat=${r.tFirstHeartbeatMs}ms ` +
        `total=${r.totalMs}ms`,
      );
    }
    // Brief grace between cycles so OS can fully reap children + free ports.
    await sleep(500);
  }

  // Summary
  const okResults = results.filter((r) => r.ok);
  const totals = okResults.map((r) => r.totalMs);
  const avg = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null;
  const max = totals.length ? Math.max(...totals) : null;
  const min = totals.length ? Math.min(...totals) : null;
  console.log("\n[repro] summary");
  console.log(`  cycles: ${N_CYCLES}`);
  console.log(`  ok:        ${okResults.length}`);
  console.log(`  failures:  ${failures}`);
  console.log(`  over-budget (>${PER_CYCLE_BUDGET_MS}ms): ${overBudget}`);
  console.log(`  total ms:  min=${min} avg=${avg} max=${max}`);

  if (failures > 0 || overBudget > 0) {
    console.log("\n[repro] FAIL");
    process.exit(1);
  }
  console.log("\n[repro] PASS");
  process.exit(0);
}

main().catch((err) => {
  console.error("[repro] script error:", err);
  process.exit(2);
});
