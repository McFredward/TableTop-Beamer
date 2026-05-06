// test/phase-32-reconnect-backoff.test.mjs
//
// Phase 32 Wave 0 — Block B tests B3-B7 (SKIP-GATED).
// These tests will be flipped GREEN by Wave 1 when:
//   - getBackoffDelay, loadBackoffState, saveBackoffState, markStable are
//     exported from receiver-bootstrap.js
//   - MAX_RECONNECT_ATTEMPTS is removed (forever-retry)
//   - sessionStorage persistence is added
//
// Contains: phase-32-reconnect-backoff

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mockSessionStorage } from "./helpers/phase-32-ssr-test-harness.mjs";

// ── B3: getBackoffDelay schedule [1000, 2000, 5000, 10000, 30000] ─────────

test(
  "B3: getBackoffDelay schedule: attempt 0→1000, 1→2000, 2→5000, 3→10000, 4→30000",
  { skip: "Wave 1 will export getBackoffDelay with D-B2 schedule from receiver-bootstrap.js" },
  async () => {
    const { getBackoffDelay } = await import(
      "../src/app/runtime/output-receiver/receiver-bootstrap.js"
    );
    assert.equal(getBackoffDelay(0), 1000, "attempt 0 → 1000ms");
    assert.equal(getBackoffDelay(1), 2000, "attempt 1 → 2000ms");
    assert.equal(getBackoffDelay(2), 5000, "attempt 2 → 5000ms");
    assert.equal(getBackoffDelay(3), 10000, "attempt 3 → 10000ms");
    assert.equal(getBackoffDelay(4), 30000, "attempt 4 → 30000ms");
  },
);

// ── B4: getBackoffDelay caps at 30000ms ───────────────────────────────────

test(
  "B4: getBackoffDelay(5) === 30000 and getBackoffDelay(99) === 30000 (cap at 30s)",
  { skip: "Wave 1 will export getBackoffDelay with 30s cap from receiver-bootstrap.js" },
  async () => {
    const { getBackoffDelay } = await import(
      "../src/app/runtime/output-receiver/receiver-bootstrap.js"
    );
    assert.equal(getBackoffDelay(5), 30000, "attempt 5 → capped at 30000ms");
    assert.equal(getBackoffDelay(99), 30000, "attempt 99 → capped at 30000ms");
  },
);

// ── B5: loadBackoffState + saveBackoffState round-trip sessionStorage ──────

test(
  "B5a: saveBackoffState({ attempts: 3 }) writes JSON to sessionStorage key 'ssr-reconnect-state'",
  { skip: "Wave 1 will export saveBackoffState from receiver-bootstrap.js" },
  async () => {
    const { saveBackoffState } = await import(
      "../src/app/runtime/output-receiver/receiver-bootstrap.js"
    );
    const storage = mockSessionStorage();
    saveBackoffState({ attempts: 3 }, storage);
    const raw = storage.getItem("ssr-reconnect-state");
    assert.ok(raw !== null, "sessionStorage key 'ssr-reconnect-state' must be set");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.attempts, 3, "stored JSON must have attempts: 3");
  },
);

test(
  "B5b: loadBackoffState() returns { attempts: 0 } when sessionStorage is empty",
  { skip: "Wave 1 will export loadBackoffState from receiver-bootstrap.js" },
  async () => {
    const { loadBackoffState } = await import(
      "../src/app/runtime/output-receiver/receiver-bootstrap.js"
    );
    const storage = mockSessionStorage();
    const state = loadBackoffState(storage);
    assert.deepEqual(state, { attempts: 0 }, "empty storage must yield { attempts: 0 }");
  },
);

test(
  "B5c: loadBackoffState() returns { attempts: 0 } when sessionStorage contains invalid JSON",
  { skip: "Wave 1 will export loadBackoffState from receiver-bootstrap.js" },
  async () => {
    const { loadBackoffState } = await import(
      "../src/app/runtime/output-receiver/receiver-bootstrap.js"
    );
    const storage = mockSessionStorage();
    storage.setItem("ssr-reconnect-state", "{ invalid json !!!}");
    const state = loadBackoffState(storage);
    assert.deepEqual(state, { attempts: 0 }, "invalid JSON must yield { attempts: 0 } fallback");
  },
);

// ── B6: forever-retry — MAX_RECONNECT_ATTEMPTS removed / Infinity ─────────

test(
  "B6: MAX_RECONNECT_ATTEMPTS export does NOT exist OR equals Infinity (forever-retry)",
  { skip: "Wave 1 will remove MAX_RECONNECT_ATTEMPTS hard cap from receiver-status-ui.js" },
  async () => {
    const ui = await import(
      "../src/app/runtime/output-receiver/receiver-status-ui.js"
    );
    const val = ui.MAX_RECONNECT_ATTEMPTS;
    const isForeverRetry =
      val === undefined || val === Infinity || val === null;
    assert.ok(
      isForeverRetry,
      `MAX_RECONNECT_ATTEMPTS must be undefined/Infinity after Wave 1 removes the hard cap, got: ${val}`,
    );
  },
);

test(
  "B6b: receiver-bootstrap.js source does NOT contain literal 'MAX_RECONNECT_ATTEMPTS = 10'",
  { skip: "Wave 1 will remove MAX_RECONNECT_ATTEMPTS = 10 from receiver-status-ui.js" },
  async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(
      new URL(
        "../src/app/runtime/output-receiver/receiver-status-ui.js",
        import.meta.url,
      ),
      "utf8",
    );
    assert.ok(
      !src.includes("MAX_RECONNECT_ATTEMPTS = 10"),
      "receiver-status-ui.js must NOT contain 'MAX_RECONNECT_ATTEMPTS = 10' after Wave 1",
    );
  },
);

// ── B7: stable reset — backoff resets after stable connection ─────────────

test(
  "B7: getBackoffDelay after markStable() returns 1000 (reset to first step)",
  { skip: "Wave 1 will export markStable from receiver-bootstrap.js" },
  async () => {
    const { getBackoffDelay, markStable } = await import(
      "../src/app/runtime/output-receiver/receiver-bootstrap.js"
    );
    const storage = mockSessionStorage();
    // Simulate 4 failures to get to 30s backoff.
    let attempts = 4;
    assert.equal(getBackoffDelay(attempts), 30000);

    // After marking stable, attempts should reset.
    markStable(storage);

    // Next failure should start from attempt 0 → 1000ms.
    const state = { attempts: 0 };
    assert.equal(
      getBackoffDelay(state.attempts),
      1000,
      "After stable reset, first delay must be 1000ms",
    );
  },
);
