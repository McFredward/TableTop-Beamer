// Phase 39 Plan 39-1 Task 2 — D-02 RED test for INITIAL_CONNECT state.
//
// Purpose
// -------
// Lock the acceptance contract for D-02 (cold-boot reconnect storms). The
// recommended fix (39-RESEARCH.md §"D-02 Implementation approach") adds an
// INITIAL_CONNECT state to the ConnectionState enum and re-routes the
// first connect attempt through it. The legal-transitions graph must then
// allow:
//
//   NEW            → INITIAL_CONNECT   (new entry edge)
//   INITIAL_CONNECT → CONNECTED        (success path)
//   INITIAL_CONNECT → RECONNECTING     (after 5s grace, escalation)
//
// AND DISALLOW:
//
//   NEW → CONNECTING   (must go via INITIAL_CONNECT now)
//
// These tests MUST FAIL today (master) because:
//   - ConnectionState.INITIAL_CONNECT is undefined
//   - The first three assertions throw "Unknown ConnectionState: undefined"
//     or "Illegal ConnectionState transition: NEW → undefined"
//   - The "NEW → CONNECTING NOT legal" assertion FAILS because that
//     transition IS currently legal (receiver-bootstrap.js:86)
//
// After Plan 39-3 (D-02 fix) lands, all five tests pass.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ConnectionState,
  assertLegalTransition,
} from "../src/app/runtime/output-receiver/receiver-bootstrap.js";

// ──────────────────────────────────────────────────────────────────────
// Enum membership — RED today (INITIAL_CONNECT does not exist)
// ──────────────────────────────────────────────────────────────────────

test("D-02 RED: ConnectionState.INITIAL_CONNECT exists as a string", () => {
  assert.equal(
    typeof ConnectionState.INITIAL_CONNECT,
    "string",
    "ConnectionState.INITIAL_CONNECT is undefined. Plan 39-3 must add it "
    + "to the enum at receiver-bootstrap.js:61 (per 39-RESEARCH.md §"
    + "'D-02 Implementation approach' step 1).",
  );
});

// ──────────────────────────────────────────────────────────────────────
// Legal transitions — RED today (all four throw because INITIAL_CONNECT
// is undefined, or because the legal-graph is the pre-fix version)
// ──────────────────────────────────────────────────────────────────────

test("D-02 RED: NEW → INITIAL_CONNECT is legal", () => {
  // Currently throws because ConnectionState.INITIAL_CONNECT === undefined
  // and `LEGAL_TRANSITIONS[NEW]` does not include undefined.
  assert.doesNotThrow(
    () => assertLegalTransition(ConnectionState.NEW, ConnectionState.INITIAL_CONNECT),
    "NEW → INITIAL_CONNECT must be a legal transition after Plan 39-3. "
    + "Today the call throws because ConnectionState.INITIAL_CONNECT is "
    + "undefined and LEGAL_TRANSITIONS[NEW] only allows CONNECTING/STOPPED.",
  );
});

test("D-02 RED: NEW → CONNECTING is NOT legal (must route via INITIAL_CONNECT)", () => {
  // Currently SUCCEEDS — NEW → CONNECTING is in LEGAL_TRANSITIONS at line 86.
  // After Plan 39-3 this transition is removed so the first connect attempt
  // MUST go through INITIAL_CONNECT and inherit its 5s grace timer.
  assert.throws(
    () => assertLegalTransition(ConnectionState.NEW, ConnectionState.CONNECTING),
    /Illegal ConnectionState transition/,
    "NEW → CONNECTING is currently legal (receiver-bootstrap.js:86) but "
    + "Plan 39-3 must remove it so the first attempt enters INITIAL_CONNECT "
    + "first. Without this removal, INITIAL_CONNECT is bypassable.",
  );
});

test("D-02 RED: INITIAL_CONNECT → CONNECTED is legal", () => {
  assert.doesNotThrow(
    () => assertLegalTransition(ConnectionState.INITIAL_CONNECT, ConnectionState.CONNECTED),
    "INITIAL_CONNECT → CONNECTED must be legal (happy-path success during "
    + "first-attempt window). Plan 39-3 adds this edge.",
  );
});

test("D-02 RED: INITIAL_CONNECT → RECONNECTING is legal (after 5s grace)", () => {
  assert.doesNotThrow(
    () => assertLegalTransition(ConnectionState.INITIAL_CONNECT, ConnectionState.RECONNECTING),
    "INITIAL_CONNECT → RECONNECTING must be legal — the grace-timer "
    + "escalation path. Plan 39-3 adds this edge.",
  );
});
