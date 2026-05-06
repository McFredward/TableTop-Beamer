// test/phase-32-producer-ready.test.mjs
//
// Phase 32 Wave 0 — Block B tests B1-B2, B12-B13 (SKIP-GATED).
// These tests will be flipped GREEN by Wave 1 when:
//   - /api/ssr/ready endpoint is added to server.mjs
//   - waitForProducer() is exported from receiver-bootstrap.js
//
// Contains: phase-32-producer-ready

import { test } from "node:test";
import { strict as assert } from "node:assert";

// ── B1: /api/ssr/ready returns 503 when no producer ──────────────────────

test(
  "B1: GET /api/ssr/ready returns 503 with body { ready: false, reason: 'producer-starting' } when state.videoProducer is null",
  { skip: "Wave 1 will add /api/ssr/ready endpoint to server.mjs" },
  async () => {
    // Simulate the handler logic directly (unit-test the handler function,
    // not the full HTTP server).
    // Wave 1 will export handleSsrReadyRequest or similar from a module.
    // For now: assert the response shape we expect.
    const videoProducer = null;
    const ready = videoProducer != null;
    const body = { ready, reason: ready ? "producer-up" : "producer-starting" };
    const statusCode = ready ? 200 : 503;

    assert.equal(statusCode, 503);
    assert.deepEqual(body, { ready: false, reason: "producer-starting" });
  },
);

// ── B2: /api/ssr/ready returns 200 when producer is up ───────────────────

test(
  "B2: GET /api/ssr/ready returns 200 with body { ready: true, reason: 'producer-up' } when state.videoProducer is non-null",
  { skip: "Wave 1 will add /api/ssr/ready endpoint to server.mjs" },
  async () => {
    // Simulate the handler logic with a non-null producer.
    const videoProducer = { id: "mock-producer-123" };
    const ready = videoProducer != null;
    const body = { ready, reason: ready ? "producer-up" : "producer-starting" };
    const statusCode = ready ? 200 : 503;

    assert.equal(statusCode, 200);
    assert.deepEqual(body, { ready: true, reason: "producer-up" });
  },
);

// ── B12: waitForProducer resolves true when fetch returns 200 ─────────────

test(
  "B12: waitForProducer({ fetch: mockFetch, maxWaitMs: 5000, pollIntervalMs: 100 }) resolves to true when mockFetch returns 200",
  { skip: "Wave 1 will export waitForProducer from receiver-bootstrap.js" },
  async () => {
    // Wave 1 will export waitForProducer from receiver-bootstrap.js.
    // Mock implementation to assert the expected contract:
    async function waitForProducer({ fetch: mockFetch, maxWaitMs, pollIntervalMs }) {
      const deadline = Date.now() + maxWaitMs;
      while (Date.now() < deadline) {
        try {
          const r = await mockFetch("/api/ssr/ready");
          const j = await r.json();
          if (j.ready) return true;
        } catch { /* network hiccup */ }
        await new Promise((res) => setTimeout(res, pollIntervalMs));
      }
      return false;
    }

    let callCount = 0;
    const mockFetch = async () => {
      callCount += 1;
      return {
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
  { skip: "Wave 1 will export waitForProducer from receiver-bootstrap.js" },
  async () => {
    // Same contract assertion as B12 but with perpetual 503 response.
    async function waitForProducer({ fetch: mockFetch, maxWaitMs, pollIntervalMs }) {
      const deadline = Date.now() + maxWaitMs;
      while (Date.now() < deadline) {
        try {
          const r = await mockFetch("/api/ssr/ready");
          const j = await r.json();
          if (j.ready) return true;
        } catch { /* network hiccup */ }
        await new Promise((res) => setTimeout(res, pollIntervalMs));
      }
      return false;
    }

    const mockFetch = async () => ({
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
