// src/server/ssr-state-restore.mjs
//
// Phase 31 Plan 01: STUB.
//
// Plan 04 will fill this in with active-animations replay logic. For Plan 01
// the contract is just: read `config/runtime-active-animations.json` if
// present, validate the schema, and return a normalized initial-state
// object. If the file is missing OR the schema mismatches the v1 constant,
// return an empty state with the appropriate flag.
//
// Schema constant: `tt-beamer.runtime-active.v1` — locked by the Wave-0
// scaffold test (`test/ssr-state-restore.test.mjs`) and by Plan 04's plan.

import { readFile } from "node:fs/promises";
import path from "node:path";

export const RUNTIME_ACTIVE_SCHEMA = "tt-beamer.runtime-active.v1";

/**
 * Load the SSR-specific initial replay state.
 *
 * @param {object} opts
 * @param {string} opts.rootDir — repo root (server.mjs's ROOT_DIR)
 * @returns {Promise<{
 *   runningAnimations: Array<object>,
 *   boardId: string|null,
 *   schemaMismatch?: boolean,
 * }>}
 */
export async function loadSsrInitialState({ rootDir }) {
  if (!rootDir) {
    throw new Error("loadSsrInitialState: rootDir is required");
  }
  const runtimeActivePath = path.join(rootDir, "config", "runtime-active-animations.json");
  try {
    const raw = await readFile(runtimeActivePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.schema !== RUNTIME_ACTIVE_SCHEMA) {
      return { runningAnimations: [], boardId: null, schemaMismatch: true };
    }
    return {
      runningAnimations: Array.isArray(parsed.runningAnimations) ? parsed.runningAnimations : [],
      boardId: typeof parsed.boardId === "string" ? parsed.boardId : null,
    };
  } catch (err) {
    if (err && err.code === "ENOENT") {
      return { runningAnimations: [], boardId: null };
    }
    throw err;
  }
}
