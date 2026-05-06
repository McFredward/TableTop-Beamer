// test/phase-32-status-overlay.test.mjs
//
// Phase 32 Block B tests B10-B11. Flipped GREEN by 32-02-T3.
// Verifies:
//   - showCountdownReconnect() sets banner text in correct format
//   - countdown text decrements over time
//   - markConnectionStable() / evaluateOverlayHide() logic is correct
//
// Contains: phase-32-status-overlay

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mockDocument } from "./helpers/phase-32-ssr-test-harness.mjs";

// ── B10a: showCountdownReconnect sets banner text in correct format ────────

test(
  "B10a: showCountdownReconnect({ doc: mockDoc, delayMs: 5000, attemptN: 3 }) sets #ssr-reconnect-banner text matching /^RECONNECTING — \\d+s \\(attempt 3\\)$/",
  async () => {
    const { showCountdownReconnect } = await import(
      "../src/app/runtime/output-receiver/receiver-status-ui.js"
    );

    const doc = mockDocument();
    // showCountdownReconnect synchronously sets the initial text on first tick.
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
  "B10b: showCountdownReconnect countdown shows decremented text after ~1100ms (latest value is '4s')",
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
      configurable: true,
    });

    showCountdownReconnect({ doc, delayMs: 5000, attemptN: 3 });

    // Wait ~1100ms for ticks at 0ms (5s), 500ms (5s), 1000ms (4s) to fire.
    await new Promise((res) => setTimeout(res, 1100));

    // There should be at least 3 text updates (0ms→5s, 500ms→5s, 1000ms→4s).
    assert.ok(
      texts.length >= 2,
      `Expected at least 2 text updates, got ${texts.length}: ${JSON.stringify(texts)}`,
    );

    // The latest (last) text should show 4s remaining after ~1s elapsed.
    // With tickMs=500ms: tick at 0ms→5s, 500ms→5s, 1000ms→4s.
    const lastText = texts[texts.length - 1];
    assert.match(
      lastText,
      /4s \(attempt 3\)/,
      `Last text must show 4s after ~1s elapsed, got: "${lastText}" (all: ${JSON.stringify(texts)})`,
    );
  },
);

// ── B11a: evaluateOverlayHide returns true after ≥5s stable ──────────────

test(
  "B11a: markConnectionStable({ now: 1000 }) + evaluateOverlayHide({ now: 6500 }) returns { shouldHide: true } (5500ms ≥ 5000ms)",
  async () => {
    const { markConnectionStable, evaluateOverlayHide } = await import(
      "../src/app/runtime/output-receiver/receiver-status-ui.js"
    );

    const store = {};
    markConnectionStable({ now: 1000, store });
    const result = evaluateOverlayHide({ now: 6500, store });

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
  async () => {
    const { markConnectionStable, evaluateOverlayHide } = await import(
      "../src/app/runtime/output-receiver/receiver-status-ui.js"
    );

    const store = {};
    markConnectionStable({ now: 1000, store });
    const result = evaluateOverlayHide({ now: 5500, store });

    assert.deepEqual(
      result,
      { shouldHide: false },
      `Expected { shouldHide: false } when 4500ms < 5000ms stable threshold, got: ${JSON.stringify(result)}`,
    );
  },
);
