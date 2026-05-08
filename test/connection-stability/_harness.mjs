// test/connection-stability/_harness.mjs
//
// Phase 33 Plan 33-W0 — integration test harness for connection-stability suite.
//
// Boots a real `node server.mjs` child with SSR_RENDER_HOST=1 SSR_PUBLISH=1
// against an isolated config dir + random port, exposes:
//   - bootServer({ port?, configDir? })  → spawn + return { pid, port, kill() }
//   - waitReady(port, opts)               → poll /api/ssr/ready until ready
//   - connectConsumer(port)               → minimal WS consumer (mediasoup-light)
//   - killMediasoupWorker(serverPid)      → SIGKILL the mediasoup-worker child
//   - killSsrTab(serverPid)               → SIGKILL the Chromium child
//   - teardown({ pid })                   → kill server + wait for exit
//
// All helpers PID-scope via `pgrep -P <serverPid>` so test runs do not
// collateral-kill sibling processes.
//
// SAFETY: every helper accepts a serverPid and never uses `pkill -f`.

import { spawn } from "node:child_process";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:net";

import { WebSocket } from "ws";

const execFileP = promisify(execFile);

const REPO_ROOT = resolve(process.cwd());

/**
 * Pick a free TCP port by binding to 0 and reading back the assigned port.
 * Closes immediately. There is a tiny TOCTOU window but the harness uses
 * the picked port within milliseconds.
 *
 * @returns {Promise<number>}
 */
export async function pickFreePort() {
  return new Promise((resolveP, rejectP) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", rejectP);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = (typeof addr === "object" && addr) ? addr.port : 0;
      srv.close(() => resolveP(port));
    });
  });
}

/**
 * Build an isolated config dir for a test server. Copies the bare-minimum
 * configs that server.mjs requires from the repo's `config/` dir; falls
 * back to an empty config dir if the source files are missing.
 *
 * @returns {Promise<{ rootDir: string, configDir: string, cleanup: () => Promise<void> }>}
 */
export async function makeIsolatedRoot() {
  const root = await mkdtemp(join(tmpdir(), "tt-beamer-test-"));
  const cfg = join(root, "config");
  await mkdir(cfg, { recursive: true });
  // Copy a minimal set of config files that server boot reads. server.mjs
  // tolerates missing files (most are optional with built-in defaults), but
  // having an empty json prevents accidental cross-test contamination.
  const optional = [
    "global-defaults.json",
    "asset-manifest.json",
    "projection-profiles.json",
  ];
  for (const name of optional) {
    const src = join(REPO_ROOT, "config", name);
    if (existsSync(src)) {
      try {
        await copyFile(src, join(cfg, name));
      } catch {
        // ignore — server tolerates missing
      }
    }
  }
  // Empty runtime files so the server's bootstrap path doesn't carry over
  // an operator's running animations / grids into the test.
  await writeFile(join(cfg, "runtime-active-animations.json"), "{}\n").catch(() => {});
  await writeFile(join(cfg, "runtime-active-grid.json"), "{}\n").catch(() => {});

  return {
    rootDir: root,
    configDir: cfg,
    cleanup: async () => {
      try { await rm(root, { recursive: true, force: true }); } catch {}
    },
  };
}

/**
 * Spawn a server.mjs child. Returns {pid, port, kill, child, stdout, stderr}.
 *
 * @param {object} [opts]
 * @param {number} [opts.port] - random if omitted
 * @param {string} [opts.rootDir] - SSR_ROOT_DIR override
 * @param {boolean} [opts.publish=true] - SSR_PUBLISH (controls Chromium tab)
 * @param {boolean} [opts.renderHost=true] - SSR_RENDER_HOST
 * @param {object} [opts.env] - extra env vars
 * @param {boolean} [opts.captureLogs=false] - true = collect stdout/stderr
 * @returns {Promise<{ pid: number, port: number, kill: (signal?:string)=>void, child: import('node:child_process').ChildProcess, getLogs: ()=>{stdout:string,stderr:string} }>}
 */
// Module-level rotating display number. Each bootServer() call picks the
// next free Xvfb display number so consecutive tests in the same Node
// process don't fight over /tmp/.X<N>-lock when prior Xvfb processes haven't
// fully cleaned up yet. The render-host's pickFreeDisplay() walks 20 slots
// from the start point.
//
// The base is randomized at module-load time (range 200..800) so that two
// parallel test processes (multiple agents running RUN_LIVE_TESTS=1
// simultaneously, or `node --test --test-isolation=process` spawning N
// worker processes) almost certainly land in non-overlapping display ranges.
// Without this, two tests racing on display :100 caused Chromium-launch
// failures that the watchdog interpreted as render-host-down events.
const _DISPLAY_RANGE_START = 200 + Math.floor(Math.random() * 600);
let _nextDisplayBase = _DISPLAY_RANGE_START;
function _allocDisplay() {
  const n = _nextDisplayBase;
  _nextDisplayBase += 20;
  if (_nextDisplayBase > 950) _nextDisplayBase = 200;
  return `:${n}`;
}

export async function bootServer({
  port,
  rootDir,
  publish = true,
  renderHost = true,
  env: extraEnv = {},
  captureLogs = false,
  display = _allocDisplay(),
} = {}) {
  const usePort = port ?? (await pickFreePort());
  const env = {
    ...process.env,
    PORT: String(usePort),
    HOST: "127.0.0.1",
    NODE_ENV: "test",
    SSR_DISPLAY: display,
    ...(renderHost ? { SSR_RENDER_HOST: "1" } : {}),
    ...(publish ? { SSR_PUBLISH: "1" } : {}),
    ...(rootDir ? { SSR_ROOT_DIR: rootDir } : {}),
    ...extraEnv,
  };

  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: REPO_ROOT,
    env,
    stdio: captureLogs ? ["ignore", "pipe", "pipe"] : ["ignore", "ignore", "ignore"],
    detached: false,
  });

  let stdout = "";
  let stderr = "";
  if (captureLogs) {
    child.stdout?.on("data", (b) => { stdout += b.toString("utf8"); });
    child.stderr?.on("data", (b) => { stderr += b.toString("utf8"); });
  }

  return {
    pid: child.pid,
    port: usePort,
    child,
    getLogs: () => ({ stdout, stderr }),
    kill: (sig = "SIGTERM") => { try { child.kill(sig); } catch {} },
  };
}

/**
 * Poll /api/ssr/ready until { ready: true } (server has a live producer).
 *
 * @param {number} port
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs=15000]
 * @param {number} [opts.intervalMs=300]
 * @returns {Promise<void>}
 */
export async function waitReady(port, { timeoutMs = 60000, intervalMs = 300 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastErr = null;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/ssr/ready`);
      if (r.ok) {
        const j = await r.json().catch(() => null);
        if (j && j.ready === true) return;
      }
    } catch (err) {
      lastErr = err;
    }
    await sleep(intervalMs);
  }
  throw new Error(
    `waitReady(${port}) timed out after ${timeoutMs}ms` +
    (lastErr ? ` — last error: ${lastErr?.message}` : ""),
  );
}

/**
 * Wait for /api/health to respond — proves the HTTP server itself is up,
 * even before the producer is ready. Useful for tests that connect a
 * consumer before there's a producer (server holds the consume RPC up to
 * 8 s waiting for the publisher).
 */
export async function waitHttpUp(port, { timeoutMs = 10000, intervalMs = 200 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (r.ok) return;
    } catch {}
    await sleep(intervalMs);
  }
  throw new Error(`waitHttpUp(${port}) timed out after ${timeoutMs}ms`);
}

/**
 * Open a minimal-protocol WebSocket consumer to /api/webrtc/signal?role=consumer.
 *
 * This is intentionally NOT a full mediasoup-client — we only do enough RPC
 * to exercise the signaling layer:
 *   - get-router-rtp-capabilities (for state-leak / smoke tests)
 *   - heartbeat tracking
 *   - producer-ready / producer-closed / render-host-down message capture
 *
 * Returns a handle whose `getState()` exposes counters the test asserts on.
 *
 * @param {number} port
 * @param {object} [opts]
 * @param {boolean} [opts.doRpc=false] - issue get-router-rtp-capabilities once on open
 * @returns {Promise<{
 *   stop: () => void,
 *   getState: () => object,
 *   waitForFrame: (timeoutMs?:number) => Promise<void>,
 *   waitForMessage: (typePred:Function, timeoutMs?:number) => Promise<object>,
 *   ws: import('ws').WebSocket
 * }>}
 */
export async function connectConsumer(port, { doRpc = false, timeoutMs = 10000 } = {}) {
  const url = `ws://127.0.0.1:${port}/api/webrtc/signal?role=consumer`;
  const ws = new WebSocket(url);
  const state = {
    open: false,
    closed: false,
    closeCode: null,
    closeReason: null,
    heartbeats: 0,
    producerReady: 0,
    producerClosed: 0,
    renderHostDown: 0,
    lastHeartbeatAtMs: 0,
    messagesReceived: 0,
    rpcResponses: new Map(), // requestId -> message
    capturedTypes: [], // sequence of received `type` field values
  };
  const messageWaiters = []; // { pred, resolve, reject, timer }

  ws.on("open", () => { state.open = true; });
  ws.on("close", (code, reason) => {
    state.closed = true;
    state.closeCode = code;
    state.closeReason = reason?.toString?.() || "";
    // resolve any frame-waiters as failures
    for (const w of messageWaiters) {
      try { w.reject(new Error("ws closed")); } catch {}
      if (w.timer) clearTimeout(w.timer);
    }
    messageWaiters.length = 0;
  });
  ws.on("message", (data) => {
    let m;
    try { m = JSON.parse(data.toString("utf8")); } catch { return; }
    state.messagesReceived += 1;
    if (typeof m?.type === "string") state.capturedTypes.push(m.type);
    if (m?.type === "heartbeat") {
      state.heartbeats += 1;
      state.lastHeartbeatAtMs = Date.now();
    } else if (m?.type === "producer-ready") {
      state.producerReady += 1;
    } else if (m?.type === "producer-closed") {
      state.producerClosed += 1;
    } else if (m?.type === "render-host-down") {
      state.renderHostDown += 1;
    }
    if (m?.requestId != null) {
      state.rpcResponses.set(String(m.requestId), m);
    }
    // notify waiters
    for (let i = messageWaiters.length - 1; i >= 0; i -= 1) {
      const w = messageWaiters[i];
      try {
        if (w.pred(m)) {
          if (w.timer) clearTimeout(w.timer);
          messageWaiters.splice(i, 1);
          w.resolve(m);
        }
      } catch {}
    }
  });

  await new Promise((res, rej) => {
    const t = setTimeout(() => {
      try { ws.close(); } catch {}
      rej(new Error(`ws open timeout (${timeoutMs}ms)`));
    }, timeoutMs);
    ws.once("open", () => { clearTimeout(t); res(); });
    ws.once("error", (err) => { clearTimeout(t); rej(err); });
  });

  // Optional RPC roundtrip to prove the consumer is actually wired.
  if (doRpc) {
    try {
      ws.send(JSON.stringify({ action: "get-router-rtp-capabilities", requestId: "_init" }));
    } catch {}
  }

  return {
    ws,
    stop: () => { try { ws.close(); } catch {} },
    getState: () => ({ ...state, capturedTypes: state.capturedTypes.slice() }),
    waitForFrame: async (waitMs = 5000) => {
      // Frames as RTP are not delivered to a WS-only consumer, so we use
      // heartbeat as a proxy for "the connection is healthy".
      const startCount = state.heartbeats;
      await waitFor(() => state.heartbeats > startCount, waitMs, 50);
    },
    waitForMessage: (pred, waitMs = 5000) => {
      // First check if any captured message already matches.
      // (We only have the most-recent — caller can also peek state.capturedTypes.)
      return new Promise((resolveW, rejectW) => {
        const w = { pred, resolve: resolveW, reject: rejectW, timer: null };
        w.timer = setTimeout(() => {
          const i = messageWaiters.indexOf(w);
          if (i >= 0) messageWaiters.splice(i, 1);
          rejectW(new Error(`waitForMessage timeout after ${waitMs}ms`));
        }, waitMs);
        messageWaiters.push(w);
      });
    },
  };
}

/**
 * Find direct child PIDs of `serverPid` whose comm matches `pattern`. Uses
 * pgrep -P which is PID-scoped (no -f, no system-wide search).
 *
 * @param {number} serverPid
 * @param {RegExp} pattern  - matched against the `comm` (process name)
 * @returns {Promise<number[]>}
 */
export async function findChildPids(serverPid, pattern) {
  if (!Number.isFinite(serverPid)) return [];
  let out;
  try {
    const r = await execFileP("pgrep", ["-P", String(serverPid)]);
    out = r.stdout;
  } catch (err) {
    if (err?.code === 1) return []; // no children
    throw err;
  }
  const pids = out.split(/\s+/).map((s) => Number(s)).filter((n) => Number.isFinite(n) && n > 0);
  if (!pattern) return pids;
  // Read /proc/<pid>/comm for each
  const matches = [];
  for (const p of pids) {
    try {
      const { readFile } = await import("node:fs/promises");
      const comm = (await readFile(`/proc/${p}/comm`, "utf8")).trim();
      if (pattern.test(comm)) matches.push(p);
    } catch { /* dead pid, ignore */ }
  }
  return matches;
}

/**
 * Recursively find descendant PIDs of `rootPid`.
 *
 * @param {number} rootPid
 * @returns {Promise<number[]>}
 */
export async function findAllDescendants(rootPid) {
  const out = [];
  const stack = [rootPid];
  const seen = new Set();
  while (stack.length > 0) {
    const p = stack.pop();
    if (seen.has(p)) continue;
    seen.add(p);
    let kids;
    try {
      const r = await execFileP("pgrep", ["-P", String(p)]);
      kids = r.stdout;
    } catch (err) {
      if (err?.code === 1) continue;
      continue;
    }
    for (const k of kids.split(/\s+/).map(Number).filter(Boolean)) {
      out.push(k);
      stack.push(k);
    }
  }
  return out;
}

/**
 * SIGKILL the mediasoup-worker child of the given server PID. The worker
 * is spawned by the mediasoup library as a direct child of the server.
 *
 * @param {number} serverPid
 * @returns {Promise<number>} number of processes killed
 */
export async function killMediasoupWorker(serverPid) {
  // The mediasoup-worker shows up in /proc/<pid>/comm as "mediasoup-work"
  // (truncated) on Linux. Match liberally.
  const all = await findAllDescendants(serverPid);
  let killed = 0;
  for (const p of all) {
    try {
      const { readFile } = await import("node:fs/promises");
      const comm = (await readFile(`/proc/${p}/comm`, "utf8")).trim();
      if (/mediasoup/i.test(comm)) {
        try { process.kill(p, "SIGKILL"); killed += 1; } catch {}
      }
    } catch {}
  }
  return killed;
}

/**
 * SIGKILL the Chromium tab spawned by the SSR render-host. Looks for
 * `chrome|chromium|google-chrome` among descendants of the server PID.
 *
 * @param {number} serverPid
 * @returns {Promise<number>} number of processes killed
 */
export async function killSsrTab(serverPid) {
  const all = await findAllDescendants(serverPid);
  let killed = 0;
  for (const p of all) {
    try {
      const { readFile } = await import("node:fs/promises");
      const comm = (await readFile(`/proc/${p}/comm`, "utf8")).trim();
      if (/chrome|chromium|Xvfb/i.test(comm)) {
        try { process.kill(p, "SIGKILL"); killed += 1; } catch {}
      }
    } catch {}
  }
  return killed;
}

/**
 * Send SIGTERM to the server, wait for clean exit (or SIGKILL after grace).
 * Also force-kills any leftover descendants (Xvfb, Chromium) so the next
 * test in the same run starts with a clean slate.
 *
 * @param {{ pid: number, child: import('node:child_process').ChildProcess }} handle
 * @param {number} [graceMs=4000]
 */
export async function teardown(handle, graceMs = 4000) {
  if (!handle?.child) return;
  if (handle.child.exitCode !== null) return; // already exited
  try { handle.child.kill("SIGTERM"); } catch {}

  const exited = await new Promise((res) => {
    const t = setTimeout(() => res(false), graceMs);
    handle.child.once("exit", () => { clearTimeout(t); res(true); });
  });

  // Always sweep descendants — server.mjs's SIGINT handler may not have
  // had time to clean up Xvfb / Chromium before we got here, especially
  // if the test forced SIGKILL. Leaking these locks causes subsequent
  // tests to fail when they pick the same display.
  try {
    const all = await findAllDescendants(handle.pid);
    for (const p of all) { try { process.kill(p, "SIGKILL"); } catch {} }
  } catch {}

  if (!exited) {
    try { handle.child.kill("SIGKILL"); } catch {}
    await new Promise((res) => {
      const t = setTimeout(() => res(), 1000);
      handle.child.once("exit", () => { clearTimeout(t); res(); });
    });
  }

  // Brief grace so OS can reap zombies + remove /tmp/.X<N>-lock files.
  await sleep(300);

  // Sweep puppeteer-stream's /tmp/puppeteer_dev_chrome_profile-XXXXXX
  // directories. The teardown SIGKILLs the Chromium child but doesn't
  // clean up its profile dir. Without periodic sweep, /tmp accumulates
  // hundreds of stale profile dirs across stress runs, eventually
  // slowing down Chromium spawn enough that waitHttpUp() times out.
  // This is a TEST harness concern only — production uses one long-
  // lived Chromium tab.
  try {
    const { readdir, rm } = await import("node:fs/promises");
    const entries = await readdir("/tmp");
    const stale = entries.filter((n) => n.startsWith("puppeteer_dev_chrome_profile-"));
    for (const n of stale) {
      try { await rm(`/tmp/${n}`, { recursive: true, force: true }); } catch {}
    }
  } catch {}
}

/**
 * Read RSS + open FD count for a PID. Linux-only (uses /proc).
 *
 * @param {number} pid
 * @returns {Promise<{ rssKb: number | null, fdCount: number | null }>}
 */
export async function readPidMetrics(pid) {
  const { readFile, readdir } = await import("node:fs/promises");
  let rssKb = null;
  let fdCount = null;
  try {
    const status = await readFile(`/proc/${pid}/status`, "utf8");
    const m = status.match(/VmRSS:\s*(\d+)\s*kB/);
    if (m) rssKb = Number(m[1]);
  } catch {}
  try {
    const entries = await readdir(`/proc/${pid}/fd`);
    fdCount = entries.length;
  } catch {}
  return { rssKb, fdCount };
}

// ── tiny utils ────────────────────────────────────────────────────────────

export function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function waitFor(predFn, timeoutMs = 5000, intervalMs = 50) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let ok = false;
    try { ok = await predFn(); } catch { ok = false; }
    if (ok) return;
    await sleep(intervalMs);
  }
  throw new Error(`waitFor timeout after ${timeoutMs}ms`);
}

/**
 * Convenience: returns true when RUN_LIVE_TESTS=1 in env. Test files use
 * this to skip slow live-fixture suites in default `node --test` runs.
 */
export function liveTestsEnabled() {
  return process.env.RUN_LIVE_TESTS === "1";
}

/**
 * Standard skip-message for live tests.
 */
export const LIVE_SKIP_MSG = "live test — set RUN_LIVE_TESTS=1 to run (boots real server + Chromium)";
