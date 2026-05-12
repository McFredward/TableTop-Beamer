// test/connection-stability/receiver-state-machine.test.mjs
//
// Phase 33 Plan 03-T6 — receiver state-machine + capped retry tests.
//
// Suspects addressed: 11 (sessionStorage cross-page-load), 14 (host-down
// monitor guard), R-1/R-2/R-7 (cap retry, reset on first-frame, ConnectionState
// enum).
//
// Approach: this file is mostly UNIT — the integration test in
// receiver-state-machine-live.test.mjs (gated on RUN_LIVE_TESTS=1) drives a
// real server and forces GIVEN_UP. Here we lock the contract via:
//   - assertLegalTransition() pure helper coverage
//   - capped-retry math (shouldGiveUp lookalike)
//   - source-grep regression: the receiver-bootstrap.js source contains the
//     code paths we explicitly added (clearBackoffState on fresh page-load,
//     setState(GIVEN_UP) after the cap, framesSinceLastReconnect on first
//     frame). This catches an accidental revert on refactor.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  ConnectionState,
  assertLegalTransition,
  isFreshPageLoad,
  MAX_RECONNECT_ATTEMPTS_BEFORE_GIVEUP,
  MAX_TOTAL_RECONNECT_DURATION_MS,
} from "../../src/app/runtime/output-receiver/receiver-bootstrap.js";

// ─── 03-T1: ConnectionState enum + transition table ─────────────────────

test("03-T1: ConnectionState enum exposes all 7 states", () => {
  for (const name of ["NEW", "CONNECTING", "CONNECTED", "RECONNECTING", "GIVEN_UP", "HOST_DOWN", "STOPPED"]) {
    assert.equal(typeof ConnectionState[name], "string", `missing ${name}`);
    assert.equal(ConnectionState[name], name, `${name} not self-named`);
  }
});

test("03-T1: ConnectionState is frozen — cannot mutate", () => {
  assert.throws(() => { ConnectionState.NEW = "tampered"; }, TypeError);
});

test("03-T1: legal transitions — NEW → INITIAL_CONNECT + STOPPED only", () => {
  // Phase 39 Plan 39-3 D-02: NEW → CONNECTING was removed. Cold boot must
  // route through INITIAL_CONNECT so the 5s grace window suppresses the
  // RECONNECTING banner during publisher-boot race conditions.
  assertLegalTransition(ConnectionState.NEW, ConnectionState.INITIAL_CONNECT);
  assertLegalTransition(ConnectionState.NEW, ConnectionState.STOPPED);
  assert.throws(() => assertLegalTransition(ConnectionState.NEW, ConnectionState.CONNECTING));
  assert.throws(() => assertLegalTransition(ConnectionState.NEW, ConnectionState.CONNECTED));
  assert.throws(() => assertLegalTransition(ConnectionState.NEW, ConnectionState.GIVEN_UP));
  assert.throws(() => assertLegalTransition(ConnectionState.NEW, ConnectionState.RECONNECTING));
  assert.throws(() => assertLegalTransition(ConnectionState.NEW, ConnectionState.HOST_DOWN));
});

test("03-T1: legal transitions — CONNECTING → CONNECTED|RECONNECTING|HOST_DOWN|GIVEN_UP|STOPPED", () => {
  for (const next of [
    ConnectionState.CONNECTED,
    ConnectionState.RECONNECTING,
    ConnectionState.HOST_DOWN,
    ConnectionState.GIVEN_UP,
    ConnectionState.STOPPED,
  ]) {
    assertLegalTransition(ConnectionState.CONNECTING, next);
  }
  assert.throws(() => assertLegalTransition(ConnectionState.CONNECTING, ConnectionState.NEW));
});

test("03-T1: legal transitions — CONNECTED → RECONNECTING|HOST_DOWN|STOPPED", () => {
  assertLegalTransition(ConnectionState.CONNECTED, ConnectionState.RECONNECTING);
  assertLegalTransition(ConnectionState.CONNECTED, ConnectionState.HOST_DOWN);
  assertLegalTransition(ConnectionState.CONNECTED, ConnectionState.STOPPED);
  assert.throws(() => assertLegalTransition(ConnectionState.CONNECTED, ConnectionState.NEW));
  assert.throws(() => assertLegalTransition(ConnectionState.CONNECTED, ConnectionState.CONNECTING));
  assert.throws(() => assertLegalTransition(ConnectionState.CONNECTED, ConnectionState.GIVEN_UP));
});

test("03-T1: legal transitions — RECONNECTING → CONNECTING|HOST_DOWN|GIVEN_UP|STOPPED", () => {
  assertLegalTransition(ConnectionState.RECONNECTING, ConnectionState.CONNECTING);
  assertLegalTransition(ConnectionState.RECONNECTING, ConnectionState.GIVEN_UP);
  assertLegalTransition(ConnectionState.RECONNECTING, ConnectionState.HOST_DOWN);
  assertLegalTransition(ConnectionState.RECONNECTING, ConnectionState.STOPPED);
  assert.throws(() => assertLegalTransition(ConnectionState.RECONNECTING, ConnectionState.CONNECTED));
});

test("03-T1: legal transitions — HOST_DOWN → CONNECTING|STOPPED only (operator action)", () => {
  assertLegalTransition(ConnectionState.HOST_DOWN, ConnectionState.CONNECTING);
  assertLegalTransition(ConnectionState.HOST_DOWN, ConnectionState.STOPPED);
  assert.throws(() => assertLegalTransition(ConnectionState.HOST_DOWN, ConnectionState.CONNECTED));
  assert.throws(() => assertLegalTransition(ConnectionState.HOST_DOWN, ConnectionState.RECONNECTING));
  assert.throws(() => assertLegalTransition(ConnectionState.HOST_DOWN, ConnectionState.GIVEN_UP));
});

test("03-T1: legal transitions — GIVEN_UP → CONNECTING|STOPPED only (operator retry)", () => {
  assertLegalTransition(ConnectionState.GIVEN_UP, ConnectionState.CONNECTING);
  assertLegalTransition(ConnectionState.GIVEN_UP, ConnectionState.STOPPED);
  assert.throws(() => assertLegalTransition(ConnectionState.GIVEN_UP, ConnectionState.RECONNECTING));
  assert.throws(() => assertLegalTransition(ConnectionState.GIVEN_UP, ConnectionState.CONNECTED));
});

test("03-T1: legal transitions — STOPPED is terminal (no exit)", () => {
  assert.throws(() => assertLegalTransition(ConnectionState.STOPPED, ConnectionState.CONNECTING));
  assert.throws(() => assertLegalTransition(ConnectionState.STOPPED, ConnectionState.NEW));
  assert.throws(() => assertLegalTransition(ConnectionState.STOPPED, ConnectionState.GIVEN_UP));
});

test("03-T1: self-transitions are silently allowed (idempotent)", () => {
  for (const s of Object.values(ConnectionState)) {
    assertLegalTransition(s, s); // does not throw
  }
});

test("03-T1: unknown source state throws on assertLegalTransition", () => {
  assert.throws(() => assertLegalTransition("UNKNOWN_STATE", ConnectionState.CONNECTING));
});

// ─── 03-T2: capped-retry constants + math ──────────────────────────────

test("03-T2: capped-retry constants exported — N=10 / T=120s", () => {
  assert.equal(MAX_RECONNECT_ATTEMPTS_BEFORE_GIVEUP, 10);
  assert.equal(MAX_TOTAL_RECONNECT_DURATION_MS, 120000);
});

test("03-T2: receiver-bootstrap.js source has shouldGiveUp logic referenced", async () => {
  const url = new URL("../../src/app/runtime/output-receiver/receiver-bootstrap.js", import.meta.url);
  const src = await readFile(url, "utf8");
  // The capped-retry exit is wired in two places: tryConnect catch + monitor body.
  assert.match(src, /shouldGiveUp\s*\(\s*\)/, "shouldGiveUp() function call missing");
  assert.match(src, /setState\(\s*ConnectionState\.GIVEN_UP/, "setState(GIVEN_UP) call missing");
  // GIVEN_UP entry must clear sessionStorage (so a manual Retry truly starts at attempt=1).
  assert.match(src, /next === ConnectionState\.GIVEN_UP[\s\S]*?clearBackoffState\(backoffStorage\)/,
    "GIVEN_UP entry must clear backoff state");
});

test("03-T2: receiver-bootstrap.js exports manualRetry handle for tests + UI", async () => {
  const url = new URL("../../src/app/runtime/output-receiver/receiver-bootstrap.js", import.meta.url);
  const src = await readFile(url, "utf8");
  assert.match(src, /manualRetry:/, "manualRetry handle missing on bootReceiver return value");
  assert.match(src, /doManualRetry/, "doManualRetry function missing");
  // Manual retry must reset attempts AND firstFailureAtMs (capped-retry counters).
  assert.match(src, /reconnectAttempts = 0[\s\S]{0,200}firstFailureAtMs = null/,
    "doManualRetry must reset reconnectAttempts AND firstFailureAtMs");
});

// ─── 03-T3: backoff reset gated on first-frame, NOT pcState=connected ──

test("03-T3: receiver-bootstrap.js resets backoff on first FRAME, not RTC connected", async () => {
  const url = new URL("../../src/app/runtime/output-receiver/receiver-bootstrap.js", import.meta.url);
  const src = await readFile(url, "utf8");
  // The `framesSinceLastReconnect` counter must be incremented in onFrameReceived.
  assert.match(src, /framesSinceLastReconnect\s*\+=\s*1/, "frame counter increment missing");
  // It must reset to 0 on every CONNECTING transition (line: framesSinceLastReconnect = 0).
  assert.match(src, /framesSinceLastReconnect\s*=\s*0/, "frame counter reset missing");
  // The legacy "reset on s===connected" path should NO LONGER reset attempts/backoff.
  // Negative regex: between `if (s === "connected")` and the next `if (s ===`,
  // there must NOT be a `clearBackoffState` call (which used to live there).
  const connectedBlock = src.match(/if \(s === "connected"\)\s*\{([\s\S]*?)\}\s*if \(s ===/);
  assert.ok(connectedBlock, "could not locate connected branch");
  assert.doesNotMatch(connectedBlock[1], /clearBackoffState\(backoffStorage\)/,
    "RTC connected branch must NOT clearBackoffState anymore (R-2)");
});

// ─── 03-T4: sessionStorage clear on fresh page-load ───────────────────

test("03-T4: isFreshPageLoad returns true on type='reload' and 'navigate'", () => {
  // mock perf with various navigation types
  const reload = { getEntriesByType: () => [{ type: "reload" }] };
  assert.equal(isFreshPageLoad(reload), true);
  const navigate = { getEntriesByType: () => [{ type: "navigate" }] };
  assert.equal(isFreshPageLoad(navigate), true);
  const backForward = { getEntriesByType: () => [{ type: "back_forward" }] };
  assert.equal(isFreshPageLoad(backForward), true);
});

test("03-T4: isFreshPageLoad returns false on prerender, missing API, empty list", () => {
  const prerender = { getEntriesByType: () => [{ type: "prerender" }] };
  assert.equal(isFreshPageLoad(prerender), false);
  const empty = { getEntriesByType: () => [] };
  assert.equal(isFreshPageLoad(empty), false);
  assert.equal(isFreshPageLoad(null), false);
  assert.equal(isFreshPageLoad({}), false);
});

test("03-T4: isFreshPageLoad swallows getEntriesByType throw", () => {
  const broken = { getEntriesByType: () => { throw new Error("nope"); } };
  assert.equal(isFreshPageLoad(broken), false);
});

test("03-T4: bootReceiver source clears backoff on fresh page-load", async () => {
  const url = new URL("../../src/app/runtime/output-receiver/receiver-bootstrap.js", import.meta.url);
  const src = await readFile(url, "utf8");
  // Must call isFreshPageLoad() and then clearBackoffState BEFORE loading attempts.
  // The order is: declare backoffStorage → if (isFreshPageLoad()) clearBackoffState(...) → loadBackoffState(...).
  const idxFresh = src.indexOf("isFreshPageLoad()");
  const idxLoad = src.indexOf("loadBackoffState(backoffStorage)");
  assert.ok(idxFresh > 0, "isFreshPageLoad call missing");
  assert.ok(idxLoad > 0, "loadBackoffState call missing");
  assert.ok(idxFresh < idxLoad, "isFreshPageLoad must precede loadBackoffState");
});

// ─── 03-T5: host-down monitor guard fix ──────────────────────────────

test("03-T5: monitor blocks tryConnect during HOST_DOWN and GIVEN_UP", async () => {
  const url = new URL("../../src/app/runtime/output-receiver/receiver-bootstrap.js", import.meta.url);
  const src = await readFile(url, "utf8");
  assert.match(src, /currentState === ConnectionState\.GIVEN_UP/, "monitor must gate on GIVEN_UP");
  assert.match(src, /currentState === ConnectionState\.HOST_DOWN/, "monitor must gate on HOST_DOWN");
});

test("03-T5: setState clears pcState when leaving HOST_DOWN", async () => {
  const url = new URL("../../src/app/runtime/output-receiver/receiver-bootstrap.js", import.meta.url);
  const src = await readFile(url, "utf8");
  // The setState() body must include the pcState clear when transitioning out of HOST_DOWN
  assert.match(src,
    /prev === ConnectionState\.HOST_DOWN && next !== ConnectionState\.HOST_DOWN[\s\S]*?pcState\s*=\s*"new"/,
    "setState must clear pcState on exit from HOST_DOWN (Suspect 14)");
});

// ─── 03-T2 simulation: 11-failure capped-retry decision ───────────────

test("03-T2 sim: shouldGiveUp logic — reaches GIVEN_UP after 10 attempts", () => {
  // We replicate the math here. The bootstrap's shouldGiveUp is closure-private,
  // but the math is dead-simple and the constants are exported.
  function simShouldGiveUp(attempts, firstFailureAtMs, nowMs) {
    if (attempts >= MAX_RECONNECT_ATTEMPTS_BEFORE_GIVEUP) return true;
    if (firstFailureAtMs != null) {
      const elapsed = nowMs - firstFailureAtMs;
      if (elapsed >= MAX_TOTAL_RECONNECT_DURATION_MS) return true;
    }
    return false;
  }

  // 10 attempts is the first that trips the cap.
  for (let n = 1; n <= 9; n += 1) {
    assert.equal(simShouldGiveUp(n, 1000, 2000), false, `should NOT give up at attempts=${n}`);
  }
  assert.equal(simShouldGiveUp(10, 1000, 2000), true, "should give up at attempts=10");
  assert.equal(simShouldGiveUp(11, 1000, 2000), true, "should give up at attempts=11");
});

test("03-T2 sim: shouldGiveUp — reaches GIVEN_UP after 120s elapsed", () => {
  function simShouldGiveUp(attempts, firstFailureAtMs, nowMs) {
    if (attempts >= MAX_RECONNECT_ATTEMPTS_BEFORE_GIVEUP) return true;
    if (firstFailureAtMs != null) {
      const elapsed = nowMs - firstFailureAtMs;
      if (elapsed >= MAX_TOTAL_RECONNECT_DURATION_MS) return true;
    }
    return false;
  }

  // 119s elapsed, well below 10 attempts: do not give up.
  assert.equal(simShouldGiveUp(2, 0, 119000), false);
  // 120s elapsed: give up regardless of attempt count.
  assert.equal(simShouldGiveUp(2, 0, 120000), true);
  // 130s elapsed at attempts=1: still gives up.
  assert.equal(simShouldGiveUp(1, 0, 130000), true);
});
