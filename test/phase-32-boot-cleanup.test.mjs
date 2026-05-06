// test/phase-32-boot-cleanup.test.mjs
//
// Phase 32 Block B test B9. Flipped GREEN by 32-02-T3.
// Verifies:
//   - purgeStaleMediasoupWorker() exported from ssr-mediasoup-router.mjs
//   - calls pkill -f mediasoup-worker via injected exec
//   - swallows errors (no stale worker = OK)
//   - server.mjs calls it BEFORE bootMediasoupRouter
//
// Contains: phase-32-boot-cleanup

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

// ── B9a: purgeStaleMediasoupWorker runs pkill -f mediasoup-worker ─────────

test(
  "B9a: purgeStaleMediasoupWorker({ exec: mockExec }) calls pkill -f mediasoup-worker",
  async () => {
    const { purgeStaleMediasoupWorker } = await import(
      "../src/server/ssr-mediasoup-router.mjs"
    );

    const calls = [];
    const mockExec = (cmd, _opts, cb) => {
      calls.push(cmd);
      if (typeof cb === "function") cb(null, "", ""); // success
    };

    await purgeStaleMediasoupWorker({ exec: mockExec, gracePeriodMs: 0 });

    assert.ok(
      calls.some((cmd) => cmd.includes("pkill") && cmd.includes("mediasoup-worker")),
      `Expected pkill -f mediasoup-worker to be called, got: ${JSON.stringify(calls)}`,
    );
  },
);

// ── B9b: purgeStaleMediasoupWorker resolves even when exec throws ─────────

test(
  "B9b: purgeStaleMediasoupWorker resolves even when mockExec signals error (no stale worker = OK)",
  async () => {
    const { purgeStaleMediasoupWorker } = await import(
      "../src/server/ssr-mediasoup-router.mjs"
    );

    const mockExec = (_cmd, _opts, cb) => {
      if (typeof cb === "function") {
        cb(new Error("No such process"), "", "");
      }
    };

    // Must not throw — "no stale worker" is the happy path on a clean boot.
    await assert.doesNotReject(
      purgeStaleMediasoupWorker({ exec: mockExec, gracePeriodMs: 0 }),
      "purgeStaleMediasoupWorker must resolve (not reject) when exec signals no process found",
    );
  },
);

// ── B9c: server.mjs calls purgeStaleMediasoupWorker before bootMediasoupRouter ──

test(
  "B9c: server.mjs source contains purgeStaleMediasoupWorker call AND bootMediasoupRouter call AFTER it",
  () => {
    const src = readFileSync(
      new URL("../server.mjs", import.meta.url),
      "utf8",
    );

    const purgeIdx = src.indexOf("purgeStaleMediasoupWorker(");
    const bootIdx = src.indexOf("bootMediasoupRouter(");

    assert.ok(
      purgeIdx !== -1,
      "server.mjs must contain 'purgeStaleMediasoupWorker(' call",
    );
    assert.ok(
      bootIdx !== -1,
      "server.mjs must contain 'bootMediasoupRouter(' call",
    );
    assert.ok(
      purgeIdx < bootIdx,
      `purgeStaleMediasoupWorker (pos ${purgeIdx}) must appear BEFORE bootMediasoupRouter (pos ${bootIdx}) in server.mjs`,
    );
  },
);
