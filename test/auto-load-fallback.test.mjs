// Phase 28 Wave 1 — auto-load-fallback (B1 silent default fallback when no remembered profile).
// Replaces Wave 0 skip placeholder with real assertions per 28-01-PLAN Task 2.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

test("scaffold: auto-load-fallback.test.mjs loads", () => {
  // Trivial liveness check so the file always has at least one passing assertion.
  assert.equal(1, 1);
});

// ---------------------------------------------------------------------------
// Source-pattern test — the auto-load helper exists, has the silent-fallback
// branch, and is fired from switchBoard. Pure-Node textual assertions so the
// test stays decoupled from the browser IIFE wiring (no jsdom needed).
// ---------------------------------------------------------------------------
test("B1-D03 fallback: null lastUsedProfileName loads default geometry without popup", () => {
  const switchSrc = readFileSync(
    join(REPO_ROOT, "src/app/runtime/core/runtime-board-switch.js"),
    "utf8",
  );

  // 1. autoLoadRememberedProjectionProfile is defined.
  assert.match(
    switchSrc,
    /async function autoLoadRememberedProjectionProfile\(boardId\)/,
    "autoLoadRememberedProjectionProfile must be defined as an async function",
  );

  // 2. switchBoard fires the helper fire-and-forget on every switch.
  assert.match(
    switchSrc,
    /void autoLoadRememberedProjectionProfile\(board\.id\)/,
    "switchBoard must fire-and-forget autoLoadRememberedProjectionProfile",
  );

  // 3. Helper is exported on the IIFE's window object.
  assert.match(
    switchSrc,
    /\bautoLoadRememberedProjectionProfile,/,
    "autoLoadRememberedProjectionProfile must be exported on window.TT_BEAMER_RUNTIME_BOARD_SWITCH",
  );

  // 4. Extract the helper body and assert the silent-fallback contract.
  const helperMatch = switchSrc.match(
    /async function autoLoadRememberedProjectionProfile\(boardId\) \{[\s\S]*?\n  \}/,
  );
  assert.ok(helperMatch, "autoLoadRememberedProjectionProfile body must be extractable");
  const helperBody = helperMatch[0];

  // 4a. Silent default branch on null/missing remembered name.
  assert.match(
    helperBody,
    /if \(!remembered\)/,
    "null-name branch must call default-snapshot helper",
  );
  assert.match(
    helperBody,
    /persist\.applyDefaultAndCaptureSnapshot\(\)/,
    "fallback path must call applyDefaultAndCaptureSnapshot",
  );

  // 4b. Successful load path uses applyAndCaptureSnapshot (the canonical
  //     load+snapshot+notify sequence so isDirty()===false post-load).
  assert.match(
    helperBody,
    /persist\.applyAndCaptureSnapshot\(body\.data, remembered\)/,
    "happy path must call applyAndCaptureSnapshot(data, name)",
  );

  // 4c. The helper MUST NOT show any popup/picker/confirm.
  assert.equal(
    /showProfilePickerMenu/.test(helperBody),
    false,
    "auto-load helper must NOT call showProfilePickerMenu (D-03 silent contract)",
  );
  assert.equal(
    /\bconfirm\s*\(/.test(helperBody),
    false,
    "auto-load helper must NOT call window.confirm (D-03 silent contract)",
  );
  assert.equal(
    /\balert\s*\(/.test(helperBody),
    false,
    "auto-load helper must NOT call window.alert (D-03 silent contract)",
  );

  // 4d. The helper MUST NOT mutate state.lastUsedProfileNameByBoard
  //     (D-01 binding: only user-explicit save/load triggers do).
  //     This guards against the auto-load recursion pitfall (RESEARCH §"Pitfall 2").
  assert.equal(
    /lastUsedProfileNameByBoard\s*\[/.test(helperBody.replace(/\.lastUsedProfileNameByBoard\?\.\[boardId\]/, "")),
    false,
    "auto-load helper must NOT write lastUsedProfileNameByBoard (D-01)",
  );

  // 4e. 4xx response and JSON parse failure must both fall back to default,
  //     not throw or surface a toast.
  assert.match(
    helperBody,
    /if \(!resp\.ok\)/,
    "auto-load helper must check resp.ok before parsing",
  );
  assert.match(
    helperBody,
    /catch[\s\S]*persist\.applyDefaultAndCaptureSnapshot\(\)/,
    "auto-load helper must fall back to default on thrown errors",
  );
});
