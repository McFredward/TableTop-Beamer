// src/server/ssr-mediasoup-router.mjs
//
// Phase 31 Plan 02 — Wave 2: WebRTC stream bring-up.
// Owns the mediasoup Worker + Router lifecycle and the WebRtcTransport
// factory used by the signaling endpoint. Per D-D2 reversal addendum
// (.planning/phases/phase-31/31-D-D2-REVERSAL-ADDENDUM.md), the router
// only advertises H264 video — audio is Pi-local via WebSocket trigger
// and therefore lives outside the WebRTC stream entirely.
//
// Per RESEARCH.md § Standard Stack: mediasoup ^3.x, Node-native SFU.
// Producer/Consumer model — one Producer (the SSR Chromium tab) is
// fanned out to N Consumers (Pi /output/, dashboard preview, test
// harness) via WebRtcTransport.

import * as mediasoup from "mediasoup";
import { networkInterfaces } from "node:os";
import { execSync, execFile as _execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile as _readFile } from "node:fs/promises";

const execFileP = promisify(_execFile);

const RTC_MIN_PORT = Number(process.env.SSR_RTC_MIN_PORT ?? 40000);
const RTC_MAX_PORT = Number(process.env.SSR_RTC_MAX_PORT ?? 40100);
const LISTEN_IP = process.env.SSR_LISTEN_IP ?? "0.0.0.0";

/**
 * h3 hotfix: WebRTC clients (Pi, dashboard from another laptop, etc.) need
 * an announcedIp that's actually reachable from their network — 0.0.0.0
 * is invalid as a connection target, so without an explicit announcedIp
 * the SDP carries an unusable address and consume() silently times out
 * after a few seconds (which is exactly what the user saw: rapid
 * connect/disconnect cycles in the signaling log).
 *
 * Resolution priority:
 *   1. SSR_ANNOUNCED_IP env override (operator wins).
 *   2. First non-internal IPv4 address on a UP interface (LAN IP).
 *   3. Fall back to null and log a clear warning so the operator can set
 *      SSR_ANNOUNCED_IP manually.
 */
function detectAnnouncedIp(logger) {
  const explicit = process.env.SSR_ANNOUNCED_IP;
  if (explicit && explicit.length > 0) return explicit;

  const ifaces = networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const addr of ifaces[name] ?? []) {
      if (addr.family !== "IPv4") continue;
      if (addr.internal) continue; // skip 127.0.0.1
      if (typeof addr.address !== "string") continue;
      // Skip docker / virtual interfaces by name heuristic — the operator can
      // still override via SSR_ANNOUNCED_IP if their LAN goes through one of
      // these.
      if (/^(docker|br-|veth|virbr|tailscale|tun|tap)/i.test(name)) continue;
      logger?.info?.(`[ssr-mediasoup] announcedIp auto-detected: ${addr.address} (interface=${name})`);
      return addr.address;
    }
  }
  logger?.warn?.(
    `[ssr-mediasoup] no non-internal IPv4 found — set SSR_ANNOUNCED_IP=<server-LAN-IP> if remote clients can't connect`,
  );
  return null;
}

// D-D2 reversal: video-only. Audio lives on Pi /output/ via the
// existing runtime-wire-room-audio-binders.js path. We intentionally
// do NOT advertise audio/opus here so that no part of the pipeline
// can accidentally subscribe to a non-existent audio track.
const MEDIA_CODECS = [
  {
    kind: "video",
    mimeType: "video/H264",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "profile-level-id": "42e01f",
      "level-asymmetry-allowed": 1,
    },
  },
];

let activeWorker = null;
let activeRouter = null;
let activeAnnouncedIp = null;

// Phase 33 Plan 02-T1 (Suspect 8): bounded auto-respawn state.
// On worker.died: try [1s, 2s, 5s, 10s, 30s] in order, capped at 5
// attempts before logging fatal + leaving the router null. Reset on a
// successful respawn so a single "this time it worked" boots the
// counter back to 0.
const RESPAWN_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];
let respawnAttempts = 0;
let respawnInFlight = false;
// Optional hook so the signaling layer can broadcast `producer-ready` to
// reconnecting consumers once a fresh router is up. Wired from server.mjs.
let onRouterRecreated = null;

/**
 * Phase 33 Plan 02-T1: register a callback fired after a successful
 * mediasoup-router auto-respawn. The signaling layer uses this to
 * broadcast `producer-ready` so consumers know a new producer is
 * about to come up (the SSR Chromium tab will re-attach + re-publish).
 */
export function setOnRouterRecreated(fn) {
  onRouterRecreated = (typeof fn === "function") ? fn : null;
}

/**
 * Test-only hook to reset the respawn counter. Useful for unit tests.
 */
export function __test_resetRespawnState() {
  respawnAttempts = 0;
  respawnInFlight = false;
}

/**
 * Test-only accessor for the respawn attempt counter.
 */
export function __test_getRespawnState() {
  return { respawnAttempts, respawnInFlight };
}

function attachWorkerDiedHandler(worker, logger) {
  worker.on("died", (err) => {
    logger.error(`[ssr-mediasoup] worker died: ${err?.message ?? "unknown"}`);
    activeWorker = null;
    activeRouter = null;
    // Phase 33 Plan 02-T1 (Suspect 8): kick off bounded auto-respawn.
    void scheduleRespawn(logger);
  });
}

async function scheduleRespawn(logger) {
  if (respawnInFlight) return;
  respawnInFlight = true;
  try {
    while (respawnAttempts < RESPAWN_DELAYS_MS.length) {
      const delay = RESPAWN_DELAYS_MS[respawnAttempts];
      respawnAttempts += 1;
      logger.warn(`[ssr-mediasoup] auto-respawn attempt ${respawnAttempts}/${RESPAWN_DELAYS_MS.length} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
      try {
        await bootMediasoupRouter({ logger });
        // Successful boot — reset counter and notify any hook.
        respawnAttempts = 0;
        respawnInFlight = false;
        logger.info(`[ssr-mediasoup] auto-respawn succeeded; router back up`);
        if (typeof onRouterRecreated === "function") {
          try { onRouterRecreated(); } catch (cbErr) {
            logger.warn(`[ssr-mediasoup] onRouterRecreated threw: ${cbErr?.message ?? cbErr}`);
          }
        }
        return;
      } catch (err) {
        logger.error(`[ssr-mediasoup] respawn attempt ${respawnAttempts} failed: ${err?.message ?? err}`);
      }
    }
    // Exhausted all retries — operator must intervene.
    logger.error(`[ssr-mediasoup] FATAL: ${RESPAWN_DELAYS_MS.length} respawn attempts failed; router is down — operator must restart server`);
  } finally {
    respawnInFlight = false;
  }
}

/**
 * Boot (idempotent) the mediasoup Worker + Router.
 * @param {{ logger?: { info: Function, warn: Function, error: Function } }} [opts]
 * @returns {Promise<{ worker: import('mediasoup').types.Worker, router: import('mediasoup').types.Router }>}
 */
export async function bootMediasoupRouter({ logger = console } = {}) {
  if (activeRouter && activeWorker) {
    return { worker: activeWorker, router: activeRouter };
  }
  activeWorker = await mediasoup.createWorker({
    logLevel: "warn",
    rtcMinPort: RTC_MIN_PORT,
    rtcMaxPort: RTC_MAX_PORT,
  });
  attachWorkerDiedHandler(activeWorker, logger);
  activeRouter = await activeWorker.createRouter({ mediaCodecs: MEDIA_CODECS });
  activeAnnouncedIp = detectAnnouncedIp(logger);
  logger.info(
    `[ssr-mediasoup] router up — codecs: H264 (video-only per D-D2 reversal), ports ${RTC_MIN_PORT}-${RTC_MAX_PORT}, announcedIp=${activeAnnouncedIp ?? "(none — remote clients may not connect)"}`,
  );
  return { worker: activeWorker, router: activeRouter };
}

/**
 * Create a WebRtcTransport on the given (or active) router.
 * @param {{ router?: import('mediasoup').types.Router }} [opts]
 * @returns {Promise<import('mediasoup').types.WebRtcTransport>}
 */
export async function createWebRtcTransport({ router } = {}) {
  const r = router ?? activeRouter;
  if (!r) {
    throw new Error("createWebRtcTransport: router not initialized — call bootMediasoupRouter() first");
  }
  const transport = await r.createWebRtcTransport({
    listenIps: [{ ip: LISTEN_IP, announcedIp: activeAnnouncedIp }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    // Bitrate target — derived from the active Stream-Quality preset
    // resolved at server boot (Plan 01 resolveEncoderConfig). Defaults to
    // 8 Mbit/s (`balanced` preset). Override via SSR_INITIAL_BITRATE.
    initialAvailableOutgoingBitrate: Number(process.env.SSR_INITIAL_BITRATE ?? 8_000_000),
  });
  return transport;
}

/**
 * @returns {import('mediasoup').types.Router | null}
 */
export function getRouter() {
  return activeRouter;
}

/**
 * @returns {import('mediasoup').types.Worker | null}
 */
export function getWorker() {
  return activeWorker;
}

/**
 * Cleanly close the active worker + router. Safe to call repeatedly.
 */
export async function shutdownMediasoupRouter() {
  if (activeRouter) {
    try { activeRouter.close(); } catch { /* already closed */ }
    activeRouter = null;
  }
  if (activeWorker) {
    try { activeWorker.close(); } catch { /* already closed */ }
    activeWorker = null;
  }
}

/**
 * Phase 32 D-B4: purge stale mediasoup-worker processes left behind by
 * a crashed prior server run. Called from server.mjs boot block BEFORE
 * bootMediasoupRouter() so port bindings (40000-40100 RTC range) are free.
 *
 * Phase 33 Plan 02-T3 (Suspect 12): PID-scoped behavior.
 * Default mode finds direct children of THIS server's PID via `pgrep -P $$`,
 * filters for mediasoup-worker (or mediasoup-work — the comm field truncates
 * at 15 chars on Linux), and SIGKILLs only those. This means a dev rebuild
 * cannot collateral-kill a sibling production server's mediasoup-worker.
 *
 * Falls back to the legacy `pkill -f mediasoup-worker` behaviour if
 * `pgrep -P` fails (older Alpine builds without procps), with a loud warn.
 *
 * @param {object} [opts]
 * @param {Function} [opts.exec]         - callback-style exec(cmd, opts, cb); defaults to execSync wrapper
 * @param {number}   [opts.gracePeriodMs] - ms to wait after kill (default 200)
 * @param {Function} [opts.pgrep]        - injectable pgrep wrapper (returns Promise<string>); for tests
 * @param {Function} [opts.readComm]     - injectable /proc/<pid>/comm reader (returns Promise<string>); for tests
 * @param {Function} [opts.kill]         - injectable kill (defaults to process.kill); for tests
 * @param {number}   [opts.serverPid]    - override the parent PID to scope to (defaults to process.pid)
 * @param {{warn:Function,info:Function}} [opts.logger]
 * @returns {Promise<{ scoped:boolean, killed:number[] }>}
 */
export async function purgeStaleMediasoupWorker({
  exec: _exec,
  gracePeriodMs = 200,
  pgrep: _pgrep,
  readComm: _readComm,
  kill: _kill,
  serverPid = process.pid,
  logger = console,
} = {}) {
  // ── PID-scoped path ──────────────────────────────────────────────────
  // Phase 33 Plan 02-T3 (Suspect 12) — strictly scoped to children of
  // serverPid so we never collateral-kill a sibling deployment.
  const pgrepFn = _pgrep ?? (async (parentPid) => {
    try {
      const r = await execFileP("pgrep", ["-P", String(parentPid)]);
      return r.stdout || "";
    } catch (err) {
      // exit 1 = no children; that's OK. Other failures fall through.
      if (err?.code === 1) return "";
      throw err;
    }
  });
  const readCommFn = _readComm ?? (async (pid) => {
    try {
      return (await _readFile(`/proc/${pid}/comm`, "utf8")).trim();
    } catch {
      return "";
    }
  });
  const killFn = _kill ?? ((pid, sig) => {
    try { process.kill(pid, sig); return true; } catch { return false; }
  });

  let scoped = false;
  const killed = [];
  try {
    const out = await pgrepFn(serverPid);
    const children = String(out).split(/\s+/).map(Number).filter((n) => Number.isFinite(n) && n > 0);
    for (const childPid of children) {
      const comm = await readCommFn(childPid);
      // /proc/<pid>/comm truncates at 15 chars: "mediasoup-worke" or
      // "mediasoup-work" depending on kernel; match liberally.
      if (/mediasoup/i.test(comm)) {
        if (killFn(childPid, "SIGKILL")) killed.push(childPid);
      }
    }
    scoped = true;
    logger.info?.(`[ssr-mediasoup] PID-scoped purge: parent=${serverPid} killed=${killed.join(",") || "(none)"}`);
    if (gracePeriodMs > 0 && killed.length > 0) {
      await new Promise((r) => setTimeout(r, gracePeriodMs));
    }
    return { scoped, killed };
  } catch (err) {
    // pgrep itself failed (or other unexpected); fall through to legacy
    // pkill -f for safety net (with a loud warn). This preserves the
    // existing dev-machine behaviour on systems where /proc isn't
    // available (BSD, macOS, Alpine without procps).
    logger.warn?.(`[ssr-mediasoup] PID-scoped purge unavailable (${err?.message ?? err}); falling back to system-wide pkill -f mediasoup-worker — this MAY collateral-kill sibling deployments`);
  }

  // ── Legacy fallback (collateral-kill risk) ───────────────────────────
  // Default exec: synchronous wrapper that presents a callback interface
  // consistent with child_process.exec so the test injector works uniformly.
  const execFn = _exec ?? ((cmd, _opts, cb) => {
    try {
      execSync(cmd, { stdio: "ignore" });
      if (typeof cb === "function") cb(null, "", "");
    } catch (err) {
      if (typeof cb === "function") cb(err, "", "");
    }
  });

  await new Promise((resolve) => {
    try {
      execFn("pkill -f mediasoup-worker", {}, (err) => {
        // Ignore errors — pkill exits 1 when no matching process is found,
        // which is the normal clean-boot case.
        void err;
        resolve();
      });
    } catch {
      // Synchronous throw from a non-async exec wrapper — still OK.
      resolve();
    }
  });

  if (gracePeriodMs > 0) {
    await new Promise((r) => setTimeout(r, gracePeriodMs));
  }
  return { scoped: false, killed: [] };
}
