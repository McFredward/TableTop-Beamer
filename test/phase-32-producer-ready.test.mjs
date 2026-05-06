// test/phase-32-producer-ready.test.mjs
//
// Phase 32 Block B tests B1-B2, B12-B13.
// Flipped GREEN by 32-02-T1 when:
//   - buildSsrReadyResponse exported from src/server/ssr-ready-handler.mjs
//   - /api/ssr/ready route added to server.mjs
//   - waitForProducer() exported from receiver-bootstrap.js
//
// Contains: phase-32-producer-ready

import { test } from "node:test";
import { strict as assert } from "node:assert";

// ── B1: /api/ssr/ready returns 503 when no producer ──────────────────────

test(
  "B1: GET /api/ssr/ready returns 503 with body { ready: false, reason: 'producer-starting' } when state.videoProducer is null",
  async () => {
    const { buildSsrReadyResponse } = await import(
      "../src/server/ssr-ready-handler.mjs"
    );
    const result = buildSsrReadyResponse({ videoProducer: null });
    assert.equal(result.status, 503);
    assert.deepEqual(result.body, { ready: false, reason: "producer-starting" });
  },
);

// ── B2: /api/ssr/ready returns 200 when producer is up ───────────────────

test(
  "B2: GET /api/ssr/ready returns 200 with body { ready: true, reason: 'producer-up' } when state.videoProducer is non-null",
  async () => {
    const { buildSsrReadyResponse } = await import(
      "../src/server/ssr-ready-handler.mjs"
    );
    const result = buildSsrReadyResponse({ videoProducer: { id: "mock-producer-123" } });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { ready: true, reason: "producer-up" });
  },
);

// ── B2b: /api/ssr/ready returns 503 with signaling-not-attached when signalingState is null ──

test(
  "B2b: GET /api/ssr/ready returns 503 with reason 'signaling-not-attached' when signalingState is null",
  async () => {
    const { buildSsrReadyResponse } = await import(
      "../src/server/ssr-ready-handler.mjs"
    );
    const result = buildSsrReadyResponse(null);
    assert.equal(result.status, 503);
    assert.deepEqual(result.body, { ready: false, reason: "signaling-not-attached" });
  },
);

// ── B12: waitForProducer resolves true when fetch returns 200 ─────────────

test(
  "B12: waitForProducer({ fetch: mockFetch, maxWaitMs: 5000, pollIntervalMs: 100 }) resolves to true when mockFetch returns 200",
  async () => {
    const { waitForProducer } = await import(
      "../src/app/runtime/output-receiver/receiver-bootstrap.js"
    );

    let callCount = 0;
    const mockFetch = async () => {
      callCount += 1;
      return {
        ok: true,
        json: async () => ({ ready: true, reason: "producer-up" }),
        status: 200,
      };
    };

    const result = await waitForProducer({
      fetch: mockFetch,
      maxWaitMs: 5000,
      pollIntervalMs: 100,
    });

    assert.equal(result, true, "waitForProducer must resolve true when fetch returns ready:true");
    assert.ok(callCount >= 1, "mockFetch must have been called at least once");
  },
);

// ── B13: waitForProducer resolves false after maxWaitMs with 503 ──────────

test(
  "B13: waitForProducer({ fetch: mockFetch, maxWaitMs: 200, pollIntervalMs: 50 }) resolves to false when mockFetch returns 503 throughout",
  async () => {
    const { waitForProducer } = await import(
      "../src/app/runtime/output-receiver/receiver-bootstrap.js"
    );

    const mockFetch = async () => ({
      ok: false,
      json: async () => ({ ready: false, reason: "producer-starting" }),
      status: 503,
    });

    const result = await waitForProducer({
      fetch: mockFetch,
      maxWaitMs: 200,
      pollIntervalMs: 50,
    });

    assert.equal(result, false, "waitForProducer must resolve false when fetch never returns ready:true within maxWaitMs");
  },
);
