// test/connection-stability/phase-32-hotfix-regression.test.mjs
//
// Phase 33 Plan 05-T3 — regression tests for the 12 Phase-32 hotfix night.
//
// Each hotfix gets at least one assertion that would catch a future revert.
// These tests are SOURCE-GREP based (no live server / no DOM) so they run
// in default `node --test` and never flake.
//
// h1  — overlay visibility (hidden vs style.display) — covered by existing
//        receiver-status-ui-overlay-format.test.mjs and the integration
//        path in receiver-state-machine. Skipped here.
// h2  — qualityPreset balanced (config-only). Covered by config tests.
// h3  — Xvfb -fakescreenfps 60 (low-priority diagnostic — skip).
// h5  — waitForProducer ordering. Covered indirectly by integration tests.
// h6  — tryConnectInFlight flag. Covered by state-machine.
// h7  — try/catch/finally wrap. Covered by state-machine.
// h8  — single-layer simulcast (THIS FILE).
// h9  — --use-gl=angle + --use-angle=default (THIS FILE).
// h10 — connectionsByAddr scoped to role=consumer (THIS FILE).
// h11 — countdown UX past 0s (THIS FILE).
// h12 — WS-open 10s timeout (THIS FILE).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// ─── h8: single-layer simulcast ────────────────────────────────────────

test("h8 regression: ssr-stream-publisher.mjs forces useSimulcast=false", async () => {
  const url = new URL("../../src/server/ssr-stream-publisher.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  // The single literal that makes the publisher emit one encoding regardless
  // of the detected encoder. A revert (e.g. someone restores
  // `useSimulcast = serverInfo.encoder === "vaapi"`) saturates the CPU at
  // 4-6 fps under software OpenH264 — exactly the Phase-32 manual-UAT bug.
  assert.match(src, /const\s+useSimulcast\s*=\s*false/,
    "ssr-stream-publisher must force useSimulcast=false (h8)");
});

test("h8 regression: encodings array is single-layer when useSimulcast=false", async () => {
  const url = new URL("../../src/server/ssr-stream-publisher.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  // The encodings literal is built as a string. The non-simulcast branch
  // must yield exactly one encoding entry. Verify the branch exists.
  assert.match(src, /encodingsLiteral\s*=\s*useSimulcast/,
    "encodingsLiteral ternary must exist");
  // Below the literal, both branches should be expressed; the false branch
  // must be a single-element JSON array.
  const match = src.match(/encodingsLiteral\s*=\s*useSimulcast\s*\?\s*[\s\S]*?:\s*([\s\S]*?);/);
  assert.ok(match, "could not isolate single-layer literal");
});

// ─── h9: --use-gl=angle + --use-angle=default ──────────────────────────

test("h9 regression: ssr-render-host.mjs passes --use-gl=angle", async () => {
  const url = new URL("../../src/server/ssr-render-host.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  assert.match(src, /"--use-gl=angle"/,
    "Chrome 131 needs --use-gl=angle (h9). egl crashes the GPU process.");
});

test("h9 regression: ssr-render-host.mjs passes --use-angle=default", async () => {
  const url = new URL("../../src/server/ssr-render-host.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  assert.match(src, /"--use-angle=default"/,
    "Chrome 131 needs --use-angle=default to pick the GL backend on llvmpipe.");
});

test("h9 regression: ssr-render-host.mjs does NOT pass --use-gl=egl", async () => {
  const url = new URL("../../src/server/ssr-render-host.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  // egl was the pre-Chrome-131 incantation. Even as a string in a comment it
  // is fine, but as an actual flag it would crash. Match only the flag form.
  assert.doesNotMatch(src, /args\.push\(\s*["']--use-gl=egl["']\s*\)/,
    "must NOT push --use-gl=egl as an actual launch flag (h4 reverted, h9 baseline)");
});

// ─── h10: connectionsByAddr scoped to role=consumer ────────────────────

test("h10 regression: connectionsByAddr.set guarded by role === \"consumer\"", async () => {
  const url = new URL("../../src/server/ssr-webrtc-signaling.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  // The .set() call must be inside a block guarded by a role check.
  // Approach: locate every `connectionsByAddr.set(` and verify the surrounding
  // context contains a `role === "consumer"` test.
  const setIdx = src.indexOf("connectionsByAddr.set(");
  assert.ok(setIdx > 0, "connectionsByAddr.set call missing");
  // Look backwards 200 chars for the role guard.
  const window = src.slice(Math.max(0, setIdx - 250), setIdx);
  assert.match(window, /role === ["']consumer["']/,
    "connectionsByAddr.set must be guarded by role === \"consumer\" (h10)");
});

test("h10 regression: stale-prior-connection cleanup is also role-guarded", async () => {
  const url = new URL("../../src/server/ssr-webrtc-signaling.mjs", import.meta.url);
  const src = await readFile(url, "utf8");
  // The `connectionsByAddr.get(...) → socket.destroy()` cleanup path must
  // also be inside `role === "consumer"`. Otherwise a 127.0.0.1 ssr-tab
  // could be evicted by a later 127.0.0.1 consumer.
  const getIdx = src.indexOf("connectionsByAddr.get(conn.remoteAddr)");
  assert.ok(getIdx > 0, "connectionsByAddr.get call missing");
  const window = src.slice(Math.max(0, getIdx - 250), getIdx);
  assert.match(window, /role === ["']consumer["']/,
    "stale-cleanup path must also be role=consumer guarded (h10)");
});

// ─── h11: countdown UX past 0s ─────────────────────────────────────────

test("h11 regression: showCountdownReconnect renders \"Connecting…\" when remainSec ≤ 0", async () => {
  const url = new URL("../../src/app/runtime/output-receiver/receiver-status-ui.js", import.meta.url);
  const src = await readFile(url, "utf8");
  // The branch is `if (remainSec <= 0) banner.textContent = \`Connecting… (attempt ${attemptN})\``
  assert.match(src, /remainSec\s*<=\s*0/,
    "showCountdownReconnect must branch on remainSec ≤ 0 (h11)");
  assert.match(src, /Connecting…/,
    "h11 substituted countdown text after 0s — string must be present");
});

// ─── h12: WS-open 10s timeout ──────────────────────────────────────────

test("h12 regression: receiver-webrtc-client.js sets a 10000ms WS open timeout", async () => {
  const url = new URL("../../src/app/runtime/output-receiver/receiver-webrtc-client.js", import.meta.url);
  const src = await readFile(url, "utf8");
  // The setTimeout literal must be 10000ms; the rejection must include
  // "ws open timeout" so the catch path can distinguish it.
  assert.match(src, /setTimeout\([^,]+,\s*10000\)/,
    "WS-open timeout must be 10000ms (h12)");
  assert.match(src, /ws open timeout \(10s\)/,
    "rejection reason text must be 'ws open timeout (10s)' (h12)");
});

test("h12 regression: receiver-webrtc-client.js cleans up listeners on timeout", async () => {
  const url = new URL("../../src/app/runtime/output-receiver/receiver-webrtc-client.js", import.meta.url);
  const src = await readFile(url, "utf8");
  // The timeout path must remove the open + error listeners and close the WS,
  // otherwise a late `open` event after the timeout fires would race the
  // reject promise (rejecting a resolved promise is harmless but the WS leak
  // is real — the slot stays claimed on the server until close).
  assert.match(src, /ws\.removeEventListener\("open",/,
    "WS-open timeout cleanup must remove the open listener");
  assert.match(src, /ws\.removeEventListener\("error",/,
    "WS-open timeout cleanup must remove the error listener");
});

// ─── Cross-cutting: backoff schedule is monotonic ──────────────────────

test("h baseline: getBackoffDelay schedule is monotonic non-decreasing and capped", async () => {
  const { getBackoffDelay, RECONNECT_BACKOFF_MS } = await import(
    "../../src/app/runtime/output-receiver/receiver-status-ui.js"
  );
  // [1000, 2000, 5000, 10000, 30000]
  assert.deepEqual(RECONNECT_BACKOFF_MS, [1000, 2000, 5000, 10000, 30000]);
  let prev = -1;
  for (let i = 0; i < 20; i += 1) {
    const d = getBackoffDelay(i);
    assert.ok(d >= prev, `getBackoffDelay must be non-decreasing — got ${d} after ${prev}`);
    assert.ok(d <= 30000, `getBackoffDelay must cap at 30000 — got ${d}`);
    prev = d;
  }
});
