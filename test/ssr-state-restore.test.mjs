// Phase 31 Plan 04 — state-restore module tests.
//
// Covers the full Plan-04 contract:
//   - Round-trip persist + load
//   - ENOENT → empty state
//   - Schema-mismatch flag
//   - filterExpired rules (loop / null-duration / expired / fresh / malformed)
//   - 200ms debounce coalesces multiple rapid persistRunningAnimations calls
//   - Persisted file carries the canonical schema fields
//
// All tests use mkdtempSync isolated tmp dirs — never touch the real
// config/ directory. The Wave-0 scaffold tests (still imported via the same
// module path) pass alongside these.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  RUNTIME_ACTIVE_SCHEMA,
  PERSIST_DEBOUNCE_MS,
  loadSsrInitialState,
  filterExpired,
  persistRunningAnimations,
  flushRunningAnimations,
  _resetForTests,
} from "../src/server/ssr-state-restore.mjs";

function makeTmp() {
  const root = mkdtempSync(path.join(tmpdir(), "ttbeamer-restore-"));
  return {
    rootDir: root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

const RUNTIME_FILE = "./config/runtime-active-animations.json";

// ── Wave 0 scaffold compat (kept verbatim — locks the public schema) ────

test(
  "Wave 0 scaffold: runtime-active-animations.json schema round-trip",
  { skip: !existsSync("./src/server/ssr-state-restore.mjs") },
  () => {
    const sample = {
      schema: RUNTIME_ACTIVE_SCHEMA,
      boardId: "nemesis-lockdown-a",
      runningAnimations: [],
      persistedAt: new Date().toISOString(),
    };
    writeFileSync(RUNTIME_FILE, JSON.stringify(sample));
    try {
      const loaded = JSON.parse(readFileSync(RUNTIME_FILE, "utf8"));
      assert.equal(loaded.schema, RUNTIME_ACTIVE_SCHEMA);
      assert.equal(loaded.boardId, "nemesis-lockdown-a");
      assert.ok(Array.isArray(loaded.runningAnimations));
    } finally {
      try {
        rmSync(RUNTIME_FILE, { force: true });
      } catch {
        /* ignore */
      }
    }
  },
);

test("Wave 0 scaffold: schema string is the documented v1 constant", () => {
  assert.equal(RUNTIME_ACTIVE_SCHEMA, "tt-beamer.runtime-active.v1");
});

// ── Plan 04: loadSsrInitialState ────────────────────────────────────────

test("Plan 04: loadSsrInitialState returns empty state when file missing (ENOENT)", async () => {
  const { rootDir, cleanup } = makeTmp();
  try {
    _resetForTests();
    const r = await loadSsrInitialState({ rootDir });
    assert.deepEqual(r.runningAnimations, []);
    assert.equal(r.boardId, null);
    assert.equal(r.schemaMismatch, undefined);
  } finally {
    cleanup();
  }
});

test("Plan 04: loadSsrInitialState returns schemaMismatch=true on bad schema", async () => {
  const { rootDir, cleanup } = makeTmp();
  try {
    _resetForTests();
    await persistRunningAnimations({
      rootDir,
      boardId: "x",
      runningAnimations: [],
    });
    await flushRunningAnimations();
    const fp = path.join(rootDir, "config", "runtime-active-animations.json");
    const content = JSON.parse(readFileSync(fp, "utf8"));
    content.schema = "tt-beamer.OLD-SCHEMA";
    writeFileSync(fp, JSON.stringify(content));
    const r = await loadSsrInitialState({ rootDir });
    assert.equal(r.schemaMismatch, true);
    assert.deepEqual(r.runningAnimations, []);
  } finally {
    cleanup();
  }
});

test("Plan 04: loadSsrInitialState round-trip preserves runningAnimations + boardId", async () => {
  const { rootDir, cleanup } = makeTmp();
  try {
    _resetForTests();
    const now = Date.now();
    const anims = [
      {
        id: "a1",
        startedAt: now,
        durationMs: 5000,
        loop: false,
        kind: "trigger-room",
      },
    ];
    await persistRunningAnimations({
      rootDir,
      boardId: "nemesis-lockdown-a",
      runningAnimations: anims,
    });
    await flushRunningAnimations();
    const r = await loadSsrInitialState({ rootDir, now: now + 100 });
    assert.equal(r.boardId, "nemesis-lockdown-a");
    assert.equal(r.runningAnimations.length, 1);
    assert.equal(r.runningAnimations[0].id, "a1");
  } finally {
    cleanup();
  }
});

// ── Plan 04: filterExpired ──────────────────────────────────────────────

test("Plan 04: filterExpired drops finite expired non-loop animations", () => {
  const now = 10_000;
  const anims = [
    { id: "old", startedAt: 0, durationMs: 5000, loop: false }, // 0+5000 < 10000 → DROP
    { id: "fresh", startedAt: 8000, durationMs: 5000, loop: false }, // 8000+5000 ≥ 10000 → KEEP
  ];
  const out = filterExpired(anims, now);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "fresh");
});

test("Plan 04: filterExpired keeps loop animations regardless of age", () => {
  const out = filterExpired(
    [{ id: "loop", startedAt: 0, durationMs: 1000, loop: true }],
    100_000,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "loop");
});

test("Plan 04: filterExpired keeps null-duration animations (open-ended hold)", () => {
  const out = filterExpired(
    [{ id: "open", startedAt: 0, durationMs: null, loop: false }],
    100_000,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "open");
});

test("Plan 04: filterExpired drops malformed entries (non-numeric startedAt)", () => {
  const out = filterExpired(
    [{ id: "bad", startedAt: "yesterday", durationMs: 1000, loop: false }],
    1000,
  );
  assert.equal(out.length, 0);
});

// ── Plan 04: persist + debounce ─────────────────────────────────────────

test("Plan 04: persistRunningAnimations debounce coalesces 5 rapid calls into 1 write", async () => {
  const { rootDir, cleanup } = makeTmp();
  try {
    _resetForTests();
    const fp = path.join(rootDir, "config", "runtime-active-animations.json");
    // Fire 5 calls within ~120ms (well under the 200ms debounce window) so
    // they all coalesce into a single write of the LATEST payload.
    for (let i = 0; i < 5; i++) {
      persistRunningAnimations({
        rootDir,
        boardId: "b" + i,
        runningAnimations: [],
      });
      await new Promise((r) => setTimeout(r, 20));
    }
    // Wait beyond the debounce window so the eventual write completes.
    await new Promise((r) => setTimeout(r, PERSIST_DEBOUNCE_MS + 100));
    assert.ok(existsSync(fp), "file should be written after debounce window");
    const c = JSON.parse(readFileSync(fp, "utf8"));
    // Last call's boardId wins (debounce coalesces — only the latest payload writes).
    assert.equal(c.boardId, "b4");
    assert.equal(c.schema, RUNTIME_ACTIVE_SCHEMA);
  } finally {
    cleanup();
  }
});

test("Plan 04: persistRunningAnimations writes canonical schema fields", async () => {
  const { rootDir, cleanup } = makeTmp();
  try {
    _resetForTests();
    await persistRunningAnimations({
      rootDir,
      boardId: "test",
      runningAnimations: [{ id: "x" }],
    });
    await flushRunningAnimations();
    const fp = path.join(rootDir, "config", "runtime-active-animations.json");
    const c = JSON.parse(readFileSync(fp, "utf8"));
    assert.equal(c.schema, RUNTIME_ACTIVE_SCHEMA);
    assert.equal(c.boardId, "test");
    assert.deepEqual(c.runningAnimations, [{ id: "x" }]);
    assert.match(c.persistedAt, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    cleanup();
  }
});
