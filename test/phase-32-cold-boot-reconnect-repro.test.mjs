// test/phase-32-cold-boot-reconnect-repro.test.mjs
//
// Phase 32 — deterministic cold-boot reconnect-storm repro.
// Rewritten GREEN by 32-02-T2:
//   - RED test (Wave 0): asserted source CONTAINED the hard cap check.
//     Now rewritten to assert the cap is GONE (post-patch GREEN).
//   - GREEN test: simulates Pi consuming after waitForProducer gate resolves.
//
// Contains: phase-32-cold-boot-reconnect-repro

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

// ── POST-PATCH: hard cap check is GONE from receiver-bootstrap.js ──────────
// Wave 0 RED asserted the cap existed. 32-02-T2 removes it — assert it's gone.

test("POST-PATCH: receiver-bootstrap.js does NOT contain 'if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS)' — hard cap removed in 32-02-T2", () => {
  const src = readFileSync(
    new URL(
      "../src/app/runtime/output-receiver/receiver-bootstrap.js",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    !src.includes("if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS)"),
    "receiver-bootstrap.js must NOT contain the hard cap check after 32-02-T2 removes it",
  );
});

// ── GREEN: cold-boot recovery simulation (producer comes up after delay) ────

test(
  "GREEN: Pi recovers within 10s when producer comes up after 500ms delay",
  async () => {
    // Simulate the cold-boot scenario:
    //   - Server starts, producer is null for 500ms
    //   - Pi calls waitForProducer() — should NOT call consume() until ready
    //   - After producer up, Pi connects within 1s
    //
    // Assert:
    //   - waitForProducer resolved true
    //   - mock consume was called exactly 1x
    //   - first consume call happened AFTER producer became ready

    let fetchCallCount = 0;
    let producerReadyAt = Date.now() + 500;

    // Mock fetch: returns 503 until producerReadyAt, then 200.
    const mockFetch = async () => {
      fetchCallCount += 1;
      const ready = Date.now() >= producerReadyAt;
      return {
        ok: ready,
        json: async () => ({ ready, reason: ready ? "producer-up" : "producer-starting" }),
        status: ready ? 200 : 503,
      };
    };

    // Import the real waitForProducer from the patched bootstrap.
    const { waitForProducer } = await import(
      "../src/app/runtime/output-receiver/receiver-bootstrap.js"
    );

    let consumeCallCount = 0;
    let consumeCallTimestamp = null;
    const mockConsume = async () => {
      consumeCallCount += 1;
      consumeCallTimestamp = Date.now();
    };

    // Pi flow: wait for ready → then consume.
    const ready = await waitForProducer({
      fetch: mockFetch,
      maxWaitMs: 10000,
      pollIntervalMs: 100,
    });
    if (ready) {
      await mockConsume();
    }

    assert.equal(ready, true, "waitForProducer must return true when producer becomes available");
    assert.equal(consumeCallCount, 1, "consume must be called exactly once after producer is ready");
    assert.ok(
      consumeCallTimestamp >= producerReadyAt,
      `consume must be called AFTER producer became ready (${producerReadyAt}ms), actual: ${consumeCallTimestamp}ms`,
    );
    assert.ok(fetchCallCount >= 2, `fetch must be polled at least twice (503 then 200), got ${fetchCallCount}`);
  },
);
