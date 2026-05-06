// src/server/ssr-state-restore.mjs
// D-X7: server-side state-restore for active animations across SSR tab
// restart. Reads/writes config/runtime-active-animations.json (NEW Phase-31
// file) using a debounced 200ms write pattern (mirrors Phase-13).
// Filters expired animations on load per Phase-11-HF6 + Phase-12 contracts:
//   - loop===true → keep (loops never expire)
//   - durationMs==null → keep (open-ended hold-until-stop)
//   - startedAt + durationMs < now → drop (non-loop expired during downtime)
//   - malformed numeric fields → drop (defensive)
//
// Wave 4 of Phase 31. The 200ms debounce coalesces rapid runningAnimations
// mutations (e.g. simultaneous trigger-room + edit-room) into a single
// disk write — STRIDE T-31-04-06 mitigation against persist-hammers-disk.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const RUNTIME_ACTIVE_SCHEMA = "tt-beamer.runtime-active.v1";
export const PERSIST_DEBOUNCE_MS = 200;

// Module-scoped debounce state. Single SSR render-host process is the only
// writer; tests reset via _resetForTests().
let pendingTimer = null;
let pendingPayload = null;
let writeTargetPath = null;
let pendingResolvers = [];
let lastWriteAt = 0;

/**
 * Load the SSR-specific initial replay state.
 *
 * @param {object} opts
 * @param {string} opts.rootDir — repo root (server.mjs's ROOT_DIR)
 * @param {number} [opts.now] — epoch-ms cut-off for filterExpired (test injection)
 * @returns {Promise<{
 *   runningAnimations: Array<object>,
 *   boardId: string|null,
 *   schemaMismatch?: boolean,
 *   persistedAt?: string|null,
 *   droppedExpired?: number,
 * }>}
 */
export async function loadSsrInitialState({ rootDir, now = Date.now() } = {}) {
  if (!rootDir) {
    throw new Error("loadSsrInitialState: rootDir is required");
  }
  const filePath = path.join(rootDir, "config", "runtime-active-animations.json");
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.schema !== RUNTIME_ACTIVE_SCHEMA) {
      return { runningAnimations: [], boardId: null, schemaMismatch: true };
    }
    const animations = Array.isArray(parsed.runningAnimations) ? parsed.runningAnimations : [];
    const survivors = filterExpired(animations, now);
    return {
      runningAnimations: survivors,
      boardId: typeof parsed.boardId === "string" ? parsed.boardId : null,
      persistedAt: typeof parsed.persistedAt === "string" ? parsed.persistedAt : null,
      droppedExpired: animations.length - survivors.length,
    };
  } catch (err) {
    if (err && err.code === "ENOENT") {
      return { runningAnimations: [], boardId: null };
    }
    throw err;
  }
}

/**
 * Filter expired animations per Phase-11-HF6 + Phase-12 contract.
 *
 * Rule:
 *   - loop===true → keep (loop animations never expire)
 *   - durationMs==null → keep (open-ended hold-until-stop)
 *   - startedAt+durationMs < now → drop (non-loop has finished its run)
 *   - non-numeric startedAt or durationMs → drop (malformed → defensive)
 *
 * @param {Array<object>} animations
 * @param {number} now epoch-ms
 * @returns {Array<object>}
 */
export function filterExpired(animations, now) {
  if (!Array.isArray(animations)) return [];
  const out = [];
  for (const anim of animations) {
    if (!anim || typeof anim !== "object") continue;
    if (anim.loop === true) {
      out.push(anim);
      continue;
    }
    if (anim.durationMs == null) {
      out.push(anim);
      continue;
    }
    const startedAt = Number(anim.startedAt ?? anim.startedAtEpochMs ?? 0);
    const dur = Number(anim.durationMs);
    if (!Number.isFinite(startedAt) || !Number.isFinite(dur)) {
      // malformed → drop (Phase-11-HF6 defensive contract)
      continue;
    }
    if (startedAt + dur >= now) out.push(anim);
  }
  return out;
}

/**
 * Debounced write. Multiple calls within PERSIST_DEBOUNCE_MS coalesce to a
 * single write of the LATEST payload (last-write-wins). The returned
 * Promise resolves when the eventual write completes (or rejects on I/O
 * failure).
 *
 * @param {object} input
 * @param {string} input.rootDir
 * @param {string|null} input.boardId
 * @param {Array<object>} input.runningAnimations
 * @returns {Promise<void>}
 */
export function persistRunningAnimations({ rootDir, boardId, runningAnimations }) {
  if (!rootDir) {
    return Promise.reject(new Error("persistRunningAnimations: rootDir is required"));
  }
  writeTargetPath = path.join(rootDir, "config", "runtime-active-animations.json");
  pendingPayload = {
    schema: RUNTIME_ACTIVE_SCHEMA,
    boardId: typeof boardId === "string" ? boardId : null,
    runningAnimations: Array.isArray(runningAnimations) ? runningAnimations : [],
    persistedAt: new Date().toISOString(),
  };
  if (pendingTimer) clearTimeout(pendingTimer);
  return new Promise((resolve, reject) => {
    pendingResolvers.push({ resolve, reject });
    pendingTimer = setTimeout(async () => {
      pendingTimer = null;
      const payload = pendingPayload;
      const resolvers = pendingResolvers;
      pendingPayload = null;
      pendingResolvers = [];
      try {
        await mkdir(path.dirname(writeTargetPath), { recursive: true });
        await writeFile(writeTargetPath, JSON.stringify(payload, null, 2), "utf8");
        lastWriteAt = Date.now();
        for (const r of resolvers) r.resolve();
      } catch (err) {
        for (const r of resolvers) r.reject(err);
      }
    }, PERSIST_DEBOUNCE_MS);
  });
}

/**
 * Force flush any pending debounced write. Used at server shutdown so the
 * latest active-animations state is on disk before the process exits.
 */
export async function flushRunningAnimations() {
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  if (!pendingPayload || !writeTargetPath) {
    // Settle any pending resolvers from earlier debounces with no payload.
    const resolvers = pendingResolvers;
    pendingResolvers = [];
    for (const r of resolvers) r.resolve();
    return;
  }
  const payload = pendingPayload;
  const resolvers = pendingResolvers;
  pendingPayload = null;
  pendingResolvers = [];
  try {
    await mkdir(path.dirname(writeTargetPath), { recursive: true });
    await writeFile(writeTargetPath, JSON.stringify(payload, null, 2), "utf8");
    lastWriteAt = Date.now();
    for (const r of resolvers) r.resolve();
  } catch (err) {
    for (const r of resolvers) r.reject(err);
    throw err;
  }
}

/** Resets module state — for tests only. */
export function _resetForTests() {
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = null;
  pendingPayload = null;
  writeTargetPath = null;
  const resolvers = pendingResolvers;
  pendingResolvers = [];
  for (const r of resolvers) r.resolve();
  lastWriteAt = 0;
  if (_gridPendingTimer) clearTimeout(_gridPendingTimer);
  _gridPendingTimer = null;
  _gridPendingPayload = null;
  _gridWriteTargetPath = null;
}

// =====================================================================
// Phase-31 h41 (2026-05-06) — server-side persistence of the active
// projection grid.
//
// User-reported issue: at /output/ first start the streamed warped
// board and the locally-rendered handle/polygon overlay are out of
// sync until the operator triggers any transformation. Root cause is
// a race between client-side auto-loads of remembered profile names
// (per-client localStorage state, can diverge between Pi and the SSR
// Chromium tab). Fix: stop relying on per-client localStorage for the
// "currently active grid" — persist the grid server-side, write it on
// every align-grid-snapshot mutation, and restore it into
// liveSessionState on server boot. New clients (incl. the SSR tab on
// fresh spawn) pick it up via live-hello and the h40 apply path
// snaps the warp + handles + polygons in lockstep.
// =====================================================================

export const ACTIVE_GRID_SCHEMA = "tt-beamer.active-grid.v1";

let _gridPendingTimer = null;
let _gridPendingPayload = null;
let _gridWriteTargetPath = null;
let _gridPendingResolvers = [];

/**
 * Load the persisted active projection grid. Returns null if no file
 * yet (fresh install) or schema mismatch / corrupt JSON.
 *
 * @param {object} input
 * @param {string} input.rootDir
 * @returns {Promise<{
 *   srcXs: number[], srcYs: number[],
 *   points: Array<{row:number, col:number, x:number, y:number}>,
 *   profileId: string|null, persistedAt: string|null,
 * } | null>}
 */
export async function loadActiveGrid({ rootDir } = {}) {
  if (!rootDir) throw new Error("loadActiveGrid: rootDir is required");
  const filePath = path.join(rootDir, "config", "runtime-active-grid.json");
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.schema !== ACTIVE_GRID_SCHEMA) {
      return null;
    }
    if (
      !Array.isArray(parsed.srcXs) || !Array.isArray(parsed.srcYs)
      || !Array.isArray(parsed.points)
    ) {
      return null;
    }
    return {
      srcXs: parsed.srcXs.slice(),
      srcYs: parsed.srcYs.slice(),
      points: parsed.points.map((p) => ({
        row: Number(p.row), col: Number(p.col),
        x: Number(p.x), y: Number(p.y),
      })),
      profileId: typeof parsed.profileId === "string" ? parsed.profileId : null,
      persistedAt: typeof parsed.persistedAt === "string" ? parsed.persistedAt : null,
    };
  } catch (err) {
    if (err && err.code === "ENOENT") return null;
    return null;
  }
}

/**
 * Debounced write for the active grid. Mirrors persistRunningAnimations
 * pattern: 200 ms debounce, last-write-wins. Returns a Promise that
 * resolves when the eventual write hits disk.
 *
 * @param {object} input
 * @param {string} input.rootDir
 * @param {Array<number>} input.srcXs
 * @param {Array<number>} input.srcYs
 * @param {Array<{row:number,col:number,x:number,y:number}>} input.points
 * @param {string|null} input.profileId
 */
export function persistActiveGrid({ rootDir, srcXs, srcYs, points, profileId }) {
  if (!rootDir) {
    return Promise.reject(new Error("persistActiveGrid: rootDir is required"));
  }
  _gridWriteTargetPath = path.join(rootDir, "config", "runtime-active-grid.json");
  _gridPendingPayload = {
    schema: ACTIVE_GRID_SCHEMA,
    srcXs: Array.isArray(srcXs) ? srcXs.slice() : [],
    srcYs: Array.isArray(srcYs) ? srcYs.slice() : [],
    points: Array.isArray(points) ? points.map((p) => ({
      row: Number(p.row), col: Number(p.col),
      x: Number(p.x), y: Number(p.y),
    })) : [],
    profileId: typeof profileId === "string" ? profileId : null,
    persistedAt: new Date().toISOString(),
  };
  if (_gridPendingTimer) clearTimeout(_gridPendingTimer);
  return new Promise((resolve, reject) => {
    _gridPendingResolvers.push({ resolve, reject });
    _gridPendingTimer = setTimeout(async () => {
      _gridPendingTimer = null;
      const payload = _gridPendingPayload;
      const resolvers = _gridPendingResolvers;
      _gridPendingPayload = null;
      _gridPendingResolvers = [];
      try {
        await mkdir(path.dirname(_gridWriteTargetPath), { recursive: true });
        await writeFile(_gridWriteTargetPath, JSON.stringify(payload, null, 2), "utf8");
        for (const r of resolvers) r.resolve();
      } catch (err) {
        for (const r of resolvers) r.reject(err);
      }
    }, PERSIST_DEBOUNCE_MS);
  });
}

/** Force flush any pending grid write. Used at shutdown. */
export async function flushActiveGrid() {
  if (_gridPendingTimer) {
    clearTimeout(_gridPendingTimer);
    _gridPendingTimer = null;
  }
  if (!_gridPendingPayload || !_gridWriteTargetPath) {
    const resolvers = _gridPendingResolvers;
    _gridPendingResolvers = [];
    for (const r of resolvers) r.resolve();
    return;
  }
  const payload = _gridPendingPayload;
  const resolvers = _gridPendingResolvers;
  _gridPendingPayload = null;
  _gridPendingResolvers = [];
  try {
    await mkdir(path.dirname(_gridWriteTargetPath), { recursive: true });
    await writeFile(_gridWriteTargetPath, JSON.stringify(payload, null, 2), "utf8");
    for (const r of resolvers) r.resolve();
  } catch (err) {
    for (const r of resolvers) r.reject(err);
    throw err;
  }
}
