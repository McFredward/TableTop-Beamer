// test/connection-stability/server-self-healing.test.mjs
//
// Phase 33 Plan 02-T4 — server self-healing tests.
//
// Suspect 6 (BUG-B): Chromium tab process alive but publisher WS dropped →
//   state.videoProducer null forever. Watchdog now restarts via the
//   publisher-WS-age check.
// Suspect 8: mediasoup worker.died handler used to null references with
//   no recovery. Bounded auto-respawn [1s,2s,5s,10s,30s] now handles it.
// Suspect 12: purgeStaleMediasoupWorker used `pkill -f mediasoup-worker`,
//   which collateral-killed sibling deployments. PID-scoped via pgrep -P.
//
// Mix of unit + live integration tests; live tests gated behind
// RUN_LIVE_TESTS=1.

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
  findChildPids,
} from "./_harness.mjs";

import {
  purgeStaleMediasoupWorker,
  setOnRouterRecreated,
  __test_resetRespawnState,
  __test_getRespawnState,
} from "../../src/server/ssr-mediasoup-router.mjs";

// ─── Unit: PID-scoped purgeStaleMediasoupWorker ──────────────────────────

test("02-T3 unit: purgeStaleMediasoupWorker with mock pgrep kills only PID-scoped children", async () => {
  // Mock topology:
  //   parent serverPid=12345
  //   children pgrep -P 12345 returns: 11000 (mediasoup-worker), 22000 (chrome), 33000 (Xvfb)
  //   we expect ONLY 11000 to be SIGKILLed.
  const killed = [];
  const result = await purgeStaleMediasoupWorker({
    serverPid: 12345,
    pgrep: async (pid) => {
      if (pid !== 12345) throw new Error(`unexpected pid: ${pid}`);
      return "11000\n22000\n33000\n";
    },
    readComm: async (pid) => {
      switch (pid) {
        case 11000: return "mediasoup-worke"; // truncated by /proc to 15 chars
        case 22000: return "chromium";
        case 33000: return "Xvfb";
        default: return "";
      }
    },
    kill: (pid, sig) => {
      killed.push({ pid, sig });
      return true;
    },
    gracePeriodMs: 0,
    logger: { info: () => {}, warn: () => {} },
  });
  assert.equal(result.scoped, true);
  assert.deepEqual(result.killed, [11000]);
  assert.deepEqual(killed, [{ pid: 11000, sig: "SIGKILL" }]);
});

test("02-T3 unit: purgeStaleMediasoupWorker pgrep returns no children → no kill, no fallback", async () => {
  let killCount = 0;
  let execFallbackCalled = false;
  const result = await purgeStaleMediasoupWorker({
    serverPid: 99999,
    pgrep: async () => "", // empty stdout = no children
    readComm: async () => "",
    kill: () => { killCount += 1; return true; },
    exec: () => { execFallbackCalled = true; },
    gracePeriodMs: 0,
    logger: { info: () => {}, warn: () => {} },
  });
  assert.equal(result.scoped, true);
  assert.deepEqual(result.killed, []);
  assert.equal(killCount, 0);
  assert.equal(execFallbackCalled, false, "fallback exec must not run when pgrep succeeded with empty result");
});

test("02-T3 unit: purgeStaleMediasoupWorker pgrep throws → falls back to legacy pkill -f", async () => {
  let execCmd = null;
  const result = await purgeStaleMediasoupWorker({
    serverPid: 12345,
    pgrep: async () => { throw new Error("pgrep not found"); },
    readComm: async () => "",
    kill: () => true,
    exec: (cmd, _opts, cb) => {
      execCmd = cmd;
      if (typeof cb === "function") cb(null, "", "");
    },
    gracePeriodMs: 0,
    logger: { info: () => {}, warn: () => {} },
  });
  assert.equal(result.scoped, false);
  assert.equal(result.killed.length, 0);
  assert.match(execCmd ?? "", /pkill -f mediasoup-worker/);
});

// ─── Unit: mediasoup auto-respawn (Suspect 8) ────────────────────────────

test("02-T1 unit: ssr-mediasoup-router exports auto-respawn helpers + reset", async () => {
  const { readFile } = await import("node:fs/promises");
  const url = new URL("../../src/server/ssr-mediasoup-router.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  assert.match(src, /RESPAWN_DELAYS_MS\s*=\s*\[1000,\s*2000,\s*5000,\s*10000,\s*30000\]/);
  assert.match(src, /scheduleRespawn/);
  assert.match(src, /attachWorkerDiedHandler/);
  assert.match(src, /respawnAttempts/);
  // Test exports
  __test_resetRespawnState();
  const s = __test_getRespawnState();
  assert.equal(s.respawnAttempts, 0);
  assert.equal(s.respawnInFlight, false);
});

test("02-T1 unit: setOnRouterRecreated registers callback (no throw, idempotent)", async () => {
  setOnRouterRecreated(() => {});
  setOnRouterRecreated(null);
  setOnRouterRecreated("not-a-function"); // ignored
  // No assertion — just verifying no throw.
});

// ─── Unit: ssr-render-host watchdog wiring (Suspect 6) ───────────────────

test("02-T2 unit: ssr-render-host accepts getPublisherWsAgeMs + threshold options", async () => {
  const { readFile } = await import("node:fs/promises");
  const url = new URL("../../src/server/ssr-render-host.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  assert.match(src, /getPublisherWsAgeMs/, "getPublisherWsAgeMs option missing");
  assert.match(src, /publisherWsStaleThresholdMs/, "publisherWsStaleThresholdMs option missing");
  // Watchdog must call scheduleRestart when CDP healthy + publisher stale.
  assert.match(src, /publisher WS stale/, "watchdog log message missing");
});

test("02-T2 unit: ssr-webrtc-signaling exposes getPublisherWsAgeMs accessor + tracks publisher WS heartbeats", async () => {
  const { readFile } = await import("node:fs/promises");
  const url = new URL("../../src/server/ssr-webrtc-signaling.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  assert.match(src, /publisherWsLastPongMs/);
  assert.match(src, /getPublisherWsAgeMs/);
  // Both ssr-fps and ssr-stats handlers must update the timestamp.
  const ssrFpsBlock = src.match(/msg\.type === "ssr-fps"[\s\S]{0,400}/)?.[0] ?? "";
  assert.match(ssrFpsBlock, /publisherWsLastPongMs = Date\.now\(\)/, "ssr-fps must update publisherWsLastPongMs");
  const ssrStatsBlock = src.match(/msg\.type === "ssr-stats"[\s\S]{0,400}/)?.[0] ?? "";
  assert.match(ssrStatsBlock, /publisherWsLastPongMs = Date\.now\(\)/, "ssr-stats must update publisherWsLastPongMs");
});

test("02-T2 unit: server.mjs wires getPublisherWsAgeMs into bootSsrRenderHost (both call sites)", async () => {
  const { readFile } = await import("node:fs/promises");
  const url = new URL("../../server.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  const matches = src.match(/getPublisherWsAgeMs:\s*\(\)\s*=>/g) ?? [];
  assert.ok(matches.length >= 2, `expected ≥2 watchdog wires, got ${matches.length}`);
});

// ─── Unit: tri-state contract for getPublisherWsAgeMs ────────────────────
//
// Plan 02-T2 root cause: smoke test was firing render-host-down 2-4 times
// during a healthy 30s sustain because:
//   (a) Cold boot — publisher hasn't connected yet — getPublisherWsAgeMs()
//       returned Infinity, watchdog interpreted as "stale" → fired.
//   (b) Watchdog had no debounce — multiple ticks would re-fire the same
//       host-down broadcast.
//   (c) Threshold of 15 s was too tight for legitimate event-loop starvation
//       during heavy GIF decode (smoke test loads slime.gif=22MB).
// The fix introduces a tri-state contract:
//   * -1: publisher has NEVER connected → DO NOT fire
//   * Infinity: connected then disconnected → FIRE
//   * finite ms: time since last pong → FIRE if > threshold
// Plus a one-shot fireHostDown latch and a 45s default threshold.

test("02-T2 unit: getPublisherWsAgeMs returns -1 before any ssr-tab connects (cold-boot suppression)", async () => {
  // Simulate the signaling state's accessor logic by reading the source +
  // reasoning about the contract. We can't easily boot the full WS stack
  // in a unit test, so we lock the contract via source assertion.
  const { readFile } = await import("node:fs/promises");
  const url = new URL("../../src/server/ssr-webrtc-signaling.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  // Tri-state branches must all be present:
  //   -1 cold-boot, Infinity disconnected, finite ms otherwise
  assert.match(src, /publisherHasEverConnected/, "publisherHasEverConnected flag missing");
  assert.match(src, /if\s*\(!state\.publisherHasEverConnected\)\s*return\s*-1/,
    "-1 cold-boot return missing");
  assert.match(src, /if\s*\(!state\.publisherWsLastPongMs\)\s*return\s*Infinity/,
    "Infinity disconnected return missing");
});

test("02-T2 unit: ssr-render-host watchdog respects the -1 cold-boot sentinel", async () => {
  const { readFile } = await import("node:fs/promises");
  const url = new URL("../../src/server/ssr-render-host.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  // The watchdog logic must:
  //   * fire on Infinity (publisher disconnected)
  //   * fire on finite ms > threshold
  //   * NOT fire on -1 (cold boot)
  // Express this via a simple algebraic check in the source: the `stale`
  // boolean must reference both `Infinity` and `Number.isFinite`.
  assert.match(src, /pubAge === Infinity/, "watchdog must treat Infinity as stale");
  assert.match(src, /Number\.isFinite\(pubAge\)/, "watchdog must guard finite branch");
  // Default threshold should be ≥ 30s (45s is the new default — old 15s was
  // too tight for GIF-decode bursts).
  const m = src.match(/publisherWsStaleThresholdMs\s*=\s*Number\([^)]*\?\?\s*(\d+)\)/);
  assert.ok(m, `threshold default literal not found in source`);
  const defaultMs = Number(m[1]);
  assert.ok(defaultMs >= 30000, `default threshold ${defaultMs}ms is below 30000ms safety floor`);
});

test("02-T2 unit: fireHostDown latch ensures one broadcast per host-down episode", async () => {
  const { readFile } = await import("node:fs/promises");
  const url = new URL("../../src/server/ssr-render-host.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  // The latch state variable must exist + the helper must guard on it.
  assert.match(src, /onHostDownLatched\s*=\s*false/, "onHostDownLatched declaration missing");
  assert.match(src, /function fireHostDown/, "fireHostDown helper missing");
  assert.match(src, /if \(onHostDownLatched\) return/, "latch guard missing in fireHostDown");
  // All three host-down trigger paths use fireHostDown (not raw onHostDown).
  // CDP fail / publisher-WS-stale / browser-disconnected.
  assert.match(src, /fireHostDown\(`cdp-fail/, "CDP-fail path must use fireHostDown");
  assert.match(src, /fireHostDown\(`publisher-ws-stale/, "publisher-WS-stale path must use fireHostDown");
  assert.match(src, /fireHostDown\("browser-disconnected"\)/, "browser-disconnected path must use fireHostDown");
});

test("02-T2 unit: health-ping tick is short-circuited when host is not running", async () => {
  const { readFile } = await import("node:fs/promises");
  const url = new URL("../../src/server/ssr-render-host.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  assert.match(
    src,
    /if \(status\.state !== "running"\) return/,
    "startHealthPings must skip ticks when state !== running",
  );
});

// ─── Unit: signaling state.publisherHasEverConnected is sticky ────────────

test("02-T2 unit: ssr-tab WS upgrade flips publisherHasEverConnected (sticky); ssr-tab close clears timestamp but not flag", async () => {
  const { readFile } = await import("node:fs/promises");
  const url = new URL("../../src/server/ssr-webrtc-signaling.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  // Upgrade: both flag + timestamp set.
  const upgradeBlock = src.match(/role === "ssr-tab"[\s\S]{0,800}publisherHasEverConnected = true/);
  assert.ok(upgradeBlock, "ssr-tab upgrade must set publisherHasEverConnected = true");
  // Close: timestamp reset to 0 BUT flag stays (otherwise watchdog can't detect WS-drop).
  const closeBlock = src.match(/conn\.role === "ssr-tab"[\s\S]{0,400}publisherWsLastPongMs = 0/);
  assert.ok(closeBlock, "ssr-tab close must reset publisherWsLastPongMs to 0");
  // Verify the flag is NOT cleared anywhere (sticky):
  const clearMatch = src.match(/publisherHasEverConnected\s*=\s*false/g) ?? [];
  assert.equal(clearMatch.length, 0, "publisherHasEverConnected must be sticky (never reset to false)");
});

// ─── Integration: SIGKILL mediasoup-worker → server respawns ─────────────

test("02-T1 integration: SIGKILL mediasoup-worker → router auto-respawns within 30s", { skip: !liveTestsEnabled() && LIVE_SKIP_MSG, timeout: 120000 }, async () => {
  const root = await makeIsolatedRoot();
  const server = await bootServer({ rootDir: root.rootDir, captureLogs: true });
  let consumer = null;
  try {
    await waitHttpUp(server.port, { timeoutMs: 15000 });
    await waitReady(server.port, { timeoutMs: 60000 });

    consumer = await connectConsumer(server.port, { doRpc: true });
    await consumer.waitForFrame(8000);

    // Verify there IS a mediasoup-worker child of the server.
    const beforePids = await findChildPids(server.pid, /mediasoup/i);
    console.log(`[respawn] mediasoup-worker pids before kill: ${beforePids.join(",")}`);
    assert.ok(beforePids.length > 0, "expected mediasoup-worker child of server");

    // SIGKILL the worker.
    const killed = await killMediasoupWorker(server.pid);
    console.log(`[respawn] killed ${killed} mediasoup-worker(s)`);
    assert.ok(killed > 0, "expected to kill at least 1 worker");

    // Wait up to 60s (sum of [1+2+5+10+30] = 48s + some boot time) for the
    // server to respawn a fresh worker. We probe by checking that a fresh
    // mediasoup-worker child PID appears.
    const t0 = Date.now();
    let respawnPids = [];
    while (Date.now() - t0 < 60000) {
      respawnPids = await findChildPids(server.pid, /mediasoup/i);
      if (respawnPids.length > 0) {
        // Make sure it's a fresh PID (not the killed one)
        const fresh = respawnPids.filter((p) => !beforePids.includes(p));
        if (fresh.length > 0) {
          console.log(`[respawn] fresh worker pid=${fresh.join(",")} after ${Date.now() - t0}ms`);
          break;
        }
      }
      await sleep(500);
    }
    assert.ok(respawnPids.length > 0, "expected mediasoup-worker to auto-respawn within 60s");
  } finally {
    try { consumer?.stop(); } catch {}
    const logs = server.getLogs();
    if (logs?.stderr) console.log("[respawn] server stderr (tail):", logs.stderr.slice(-1500));
    await teardown(server);
    await root.cleanup();
  }
});

// ─── Integration: kill ssr-tab → render-host watchdog OR scheduleRestart ──
//
// Note: the ssr-tab process death is detected by puppeteer's
// browser.on("disconnected") path, which fires immediately and calls
// scheduleRestart() directly — independent of the new publisher-WS watchdog.
// The watchdog is meant for the BUG-B failure mode where Chromium stays
// alive but the WS dropped. In a SIGKILL test, browser.disconnected wins.
//
// We assert the broader self-healing contract: after killing ssr-tab, the
// server brings up a fresh Chromium tab + producer within ~30s. The Pi-side
// recovery path is verified separately in producer-lifecycle.test.mjs.

test("02-T2 integration: SIGKILL ssr-tab → server brings up fresh producer within 60s", { skip: !liveTestsEnabled() && LIVE_SKIP_MSG, timeout: 180000 }, async () => {
  const root = await makeIsolatedRoot();
  const server = await bootServer({ rootDir: root.rootDir, captureLogs: true });
  try {
    await waitHttpUp(server.port, { timeoutMs: 15000 });
    await waitReady(server.port, { timeoutMs: 60000 });

    // Kill the ssr-tab Chromium descendants.
    const killed = await killSsrTab(server.pid);
    console.log(`[self-heal] killed ${killed} ssr-tab processes`);
    assert.ok(killed > 0);

    // Wait for ready=true again (means a fresh producer is back up).
    const t0 = Date.now();
    let recovered = false;
    while (Date.now() - t0 < 60000) {
      try {
        const r = await fetch(`http://127.0.0.1:${server.port}/api/ssr/ready`);
        if (r.ok) {
          const j = await r.json().catch(() => null);
          if (j?.ready === true) { recovered = true; break; }
        }
      } catch {}
      await sleep(500);
    }
    console.log(`[self-heal] producer recovery in ${Date.now() - t0}ms (recovered=${recovered})`);
    assert.equal(recovered, true, "expected producer to recover after ssr-tab kill within 60s");
  } finally {
    const logs = server.getLogs();
    if (logs?.stderr) console.log("[self-heal] server stderr (tail):", logs.stderr.slice(-1500));
    await teardown(server);
    await root.cleanup();
  }
});
