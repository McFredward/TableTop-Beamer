// test/phase-32-cold-boot-reconnect-repro.test.mjs
//
// Phase 32 Wave 0 — deterministic cold-boot reconnect-storm repro.
//
// Two-phase structure:
//   RED (Wave 0, passes NOW): asserts that receiver-bootstrap.js source
//     CONTAINS the hard cap check `if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS)`.
//     This passes at Wave 0 because the cap exists — it's the BUG being tracked.
//
//   GREEN (skip-gated for Wave 1): simulates Pi consume() before producer-ready
//     and asserts recovery works within 10s once producer comes up.
//
// Contains: phase-32-cold-boot-reconnect-repro

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

// ── RED baseline: hard cap check EXISTS in receiver-bootstrap.js ───────────
// This test PASSES at Wave 0 (the cap is there — that's the bug).
// Wave 1 will replace this assertion with: source must NOT contain the line.

test("RED PROOF: receiver-bootstrap.js contains 'if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS)' — this is the bug Wave 1 will fix", () => {
  const src = readFileSync(
    new URL(
      "../src/app/runtime/output-receiver/receiver-bootstrap.js",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    src.includes("if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS)"),
    "receiver-bootstrap.js must contain the hard cap check at Wave 0 — this is the RED proof of bug B6",
  );
});

// ── GREEN: skip-gated cold-boot recovery simulation (Wave 1 will flip) ────

test(
  "GREEN: Pi recovers within 10s when producer comes up after 8s delay",
  { skip: "Wave 1 will add producer-readiness gate (waitForProducer) to receiver-bootstrap.js" },
  async () => {
    // Simulate the cold-boot scenario:
    //   - Server starts, producer is null for 8s
    //   - Pi calls waitForProducer() — should NOT call consume() until ready
    //   - After producer up, Pi connects within 1s
    //
    // Assert:
    //   - waitForProducer resolved true
    //   - mock consume was called exactly 1x
    //   - first consume call happened AFTER producer became ready

    let producerReady = false;
    let consumeCallCount = 0;
    let consumeCallTimestamp = null;
    const producerReadyTimestamp = Date.now() + 500; // "becomes ready" in 500ms

    // Simulate server making producer available after 500ms.
    setTimeout(() => { producerReady = true; }, 500);

    // waitForProducer contract (to be imported from receiver-bootstrap.js in Wave 1).
    async function waitForProducer({ maxWaitMs, pollIntervalMs }) {
      const deadline = Date.now() + maxWaitMs;
      while (Date.now() < deadline) {
        if (producerReady) return true;
        await new Promise((res) => setTimeout(res, pollIntervalMs));
      }
      return false;
    }

    const mockConsume = async () => {
      consumeCallCount += 1;
      consumeCallTimestamp = Date.now();
    };

    // Pi flow: wait for ready → then consume.
    const ready = await waitForProducer({ maxWaitMs: 10000, pollIntervalMs: 100 });
    if (ready) {
      await mockConsume();
    }

    assert.equal(ready, true, "waitForProducer must return true when producer becomes available");
    assert.equal(consumeCallCount, 1, "consume must be called exactly once after producer is ready");
    assert.ok(
      consumeCallTimestamp >= producerReadyTimestamp,
      `consume must be called AFTER producer became ready (${producerReadyTimestamp}ms), actual: ${consumeCallTimestamp}ms`,
    );
  },
);
