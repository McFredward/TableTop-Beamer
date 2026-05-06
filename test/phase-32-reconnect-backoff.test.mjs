// test/phase-32-reconnect-backoff.test.mjs
//
// Phase 32 Block B tests B3-B7. Flipped GREEN by 32-02-T2.
// Verifies:
//   - getBackoffDelay, loadBackoffState, saveBackoffState, markStable exported
//   - MAX_RECONNECT_ATTEMPTS removed (forever-retry)
//   - sessionStorage persistence works correctly
//
// Contains: phase-32-reconnect-backoff

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mockSessionStorage } from "./helpers/phase-32-ssr-test-harness.mjs";

// ── B3: getBackoffDelay schedule [1000, 2000, 5000, 10000, 30000] ─────────

test(
  "B3: getBackoffDelay schedule: attempt 0→1000, 1→2000, 2→5000, 3→10000, 4→30000",
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
  "B5a: saveBackoffState({ attempts: 3 }, storage) writes JSON to sessionStorage key 'ssr-reconnect-state'",
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
  "B6: MAX_RECONNECT_ATTEMPTS export does NOT exist (forever-retry, hard cap removed)",
  async () => {
    const ui = await import(
      "../src/app/runtime/output-receiver/receiver-status-ui.js"
    );
    const val = ui.MAX_RECONNECT_ATTEMPTS;
    const isForeverRetry =
      val === undefined || val === Infinity || val === null;
    assert.ok(
      isForeverRetry,
      `MAX_RECONNECT_ATTEMPTS must be undefined/Infinity after 32-02-T2 removes the hard cap, got: ${val}`,
    );
  },
);

test(
  "B6b: receiver-status-ui.js source does NOT contain literal 'MAX_RECONNECT_ATTEMPTS = 10'",
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
      "receiver-status-ui.js must NOT contain 'MAX_RECONNECT_ATTEMPTS = 10' after 32-02-T2",
    );
  },
);

// ── B7: stable reset — backoff resets after stable connection ─────────────

test(
  "B7: getBackoffDelay after markStable() clears sessionStorage and getBackoffDelay(0) returns 1000",
  async () => {
    const { getBackoffDelay, markStable, saveBackoffState, loadBackoffState } = await import(
      "../src/app/runtime/output-receiver/receiver-bootstrap.js"
    );
    const storage = mockSessionStorage();
    // Simulate 4 failures to get to 30s backoff.
    saveBackoffState({ attempts: 4 }, storage);
    assert.equal(getBackoffDelay(4), 30000);

    // After marking stable, storage should be cleared.
    markStable(storage);

    // Loading from cleared storage yields attempts: 0.
    const state = loadBackoffState(storage);
    assert.equal(state.attempts, 0, "After markStable, loadBackoffState must return attempts: 0");

    // Next failure should start from attempt 0 → 1000ms.
    assert.equal(
      getBackoffDelay(state.attempts),
      1000,
      "After stable reset, first delay must be 1000ms",
    );
  },
);
