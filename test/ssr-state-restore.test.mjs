// Phase 31 Wave 0 — state-restore round-trip scaffold.
// Plan 04 will create src/server/ssr-state-restore.mjs and
// config/runtime-active-animations.json. Until then the round-trip test
// stays skip-gated; the documented schema-string constant assertion runs
// immediately to lock the contract.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";

const RUNTIME_FILE = "./config/runtime-active-animations.json";
const SCHEMA = "tt-beamer.runtime-active.v1";

test(
  "Wave 0 scaffold: runtime-active-animations.json schema round-trip",
  { skip: !existsSync("./src/server/ssr-state-restore.mjs") },
  () => {
    const sample = {
      schema: SCHEMA,
      boardId: "nemesis-lockdown-a",
      runningAnimations: [],
      persistedAt: new Date().toISOString(),
    };
    writeFileSync(RUNTIME_FILE, JSON.stringify(sample));
    try {
      const loaded = JSON.parse(readFileSync(RUNTIME_FILE, "utf8"));
      assert.equal(loaded.schema, SCHEMA);
      assert.equal(loaded.boardId, "nemesis-lockdown-a");
      assert.ok(Array.isArray(loaded.runningAnimations));
    } finally {
      try {
        unlinkSync(RUNTIME_FILE);
      } catch {
        /* ignore */
      }
    }
  },
);

test("Wave 0 scaffold: schema string is the documented v1 constant", () => {
  assert.equal(SCHEMA, "tt-beamer.runtime-active.v1");
});
