// test/phase-32-status-overlay.test.mjs
//
// Phase 32 Wave 0 — Block B tests B10-B11 (SKIP-GATED).
// These tests will be flipped GREEN by Wave 1 when:
//   - showCountdownReconnect() is added to receiver-status-ui.js or receiver-bootstrap.js
//   - markConnectionStable() and evaluateOverlayHide() are exported
//
// Contains: phase-32-status-overlay

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mockDocument } from "./helpers/phase-32-ssr-test-harness.mjs";

// ── B10a: showCountdownReconnect sets banner text in correct format ────────

test(
  "B10a: showCountdownReconnect({ doc: mockDoc, delayMs: 5000, attemptN: 3 }) sets #ssr-reconnect-banner text matching /^RECONNECTING — \\d+s \\(attempt 3\\)$/",
  { skip: "Wave 1 will export showCountdownReconnect from receiver-status-ui.js or receiver-bootstrap.js" },
  async () => {
    const { showCountdownReconnect } = await import(
      "../src/app/runtime/output-receiver/receiver-status-ui.js"
    );

    const doc = mockDocument();
    // showCountdownReconnect should synchronously set the initial text,
    // then update via setTimeout. We check the initial call.
    showCountdownReconnect({ doc, delayMs: 5000, attemptN: 3 });

    const banner = doc.getElementById("ssr-reconnect-banner");
    assert.ok(
      banner !== null && banner !== undefined,
      "#ssr-reconnect-banner element must be queried",
    );
    const text = banner.textContent;
    assert.match(
      text,
      /^RECONNECTING — \d+s \(attempt 3\)$/,
      `Banner text must match /^RECONNECTING — \\d+s \\(attempt 3\\)$/ but got: "${text}"`,
    );
  },
);

// ── B10b: countdown text decrements over time ─────────────────────────────

test(
  "B10b: showCountdownReconnect countdown shows decremented text after ~1100ms (second-to-last value is '4s')",
  { skip: "Wave 1 will add countdown tick logic to showCountdownReconnect" },
  async () => {
    const { showCountdownReconnect } = await import(
      "../src/app/runtime/output-receiver/receiver-status-ui.js"
    );

    const doc = mockDocument();
    const texts = [];

    // Override getElementById to capture text updates.
    const origGet = doc.getElementById.bind(doc);
    const banner = origGet("ssr-reconnect-banner");
    let _textContent = "";
    Object.defineProperty(banner, "textContent", {
      get: () => _textContent,
      set: (v) => { _textContent = v; texts.push(v); },
    });

    showCountdownReconnect({ doc, delayMs: 5000, attemptN: 3 });

    // Wait ~1100ms for at least one tick to fire.
    await new Promise((res) => setTimeout(res, 1100));

    // There should be at least 2 text updates (initial + at least one decrement).
    assert.ok(
      texts.length >= 2,
      `Expected at least 2 text updates (initial + decrement), got ${texts.length}: ${JSON.stringify(texts)}`,
    );

    // The second-to-last update should show 4s remaining (5s - 1s = 4s).
    const secondToLast = texts[texts.length - 2];
    assert.match(
      secondToLast,
      /4s \(attempt 3\)/,
      `Second-to-last text must show 4s, got: "${secondToLast}"`,
    );
  },
);

// ── B11a: evaluateOverlayHide returns true after ≥5s stable ──────────────

test(
  "B11a: markConnectionStable({ now: 1000 }) + evaluateOverlayHide({ now: 6500 }) returns { shouldHide: true } (5500ms ≥ 5000ms)",
  { skip: "Wave 1 will export markConnectionStable and evaluateOverlayHide from receiver-status-ui.js" },
  async () => {
    const { markConnectionStable, evaluateOverlayHide } = await import(
      "../src/app/runtime/output-receiver/receiver-status-ui.js"
    );

    markConnectionStable({ now: 1000 });
    const result = evaluateOverlayHide({ now: 6500 });

    assert.deepEqual(
      result,
      { shouldHide: true },
      `Expected { shouldHide: true } when 5500ms ≥ 5000ms stable threshold, got: ${JSON.stringify(result)}`,
    );
  },
);

// ── B11b: evaluateOverlayHide returns false before 5s stable ──────────────

test(
  "B11b: markConnectionStable({ now: 1000 }) + evaluateOverlayHide({ now: 5500 }) returns { shouldHide: false } (4500ms < 5000ms)",
  { skip: "Wave 1 will export markConnectionStable and evaluateOverlayHide from receiver-status-ui.js" },
  async () => {
    const { markConnectionStable, evaluateOverlayHide } = await import(
      "../src/app/runtime/output-receiver/receiver-status-ui.js"
    );

    markConnectionStable({ now: 1000 });
    const result = evaluateOverlayHide({ now: 5500 });

    assert.deepEqual(
      result,
      { shouldHide: false },
      `Expected { shouldHide: false } when 4500ms < 5000ms stable threshold, got: ${JSON.stringify(result)}`,
    );
  },
);
