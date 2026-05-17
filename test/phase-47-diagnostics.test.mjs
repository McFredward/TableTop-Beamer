// Phase 47 Wave 3 — Operator-facing diagnostic log strings (source-grep tests).
//
// Wave 3 adds three diagnostic log lines to src/server/ssr-render-host.mjs so
// the Windows operator can grep start.log for a single PASS/FAIL string at
// boot. These tests pin the literal substrings — Wave 4 UAT runbook depends
// on them being stable string-for-string.
//
// Strategy: same pattern as test/phase-34-render-mode-probe.test.mjs —
// readFileSync the host source, assert presence of the literal substrings.
// No host spawn, no Puppeteer launch, no Win32 simulation needed; these are
// pure source-level contracts that the GREEN edit in Task 2 must satisfy.
//
// Expected on Wave-2 master (post-7c0fa03, pre-Wave-3): all three RED — the
// Wave-2 transient log line is `[ssr-host] win32 launch:` (note: NOT
// `[ssr-host] launching headless=` — that is the Wave-3 banner format).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync("./src/server/ssr-render-host.mjs", "utf8");

// Test P — launch banner (replaces Wave-2 transient `[ssr-host] win32 launch:`).
// The banner format is `[ssr-host] launching headless=${useHeadlessNew ? "new" : "false"} on Win32 (userDataDir=...)`.
// The literal stable substring is `[ssr-host] launching headless=`.
test("P: launch banner — [ssr-host] launching headless= is logged", () => {
  assert.ok(
    SRC.includes("[ssr-host] launching headless="),
    "src/server/ssr-render-host.mjs must contain a launch banner with literal " +
    "`[ssr-host] launching headless=` so the operator can grep start.log for " +
    "the resolved Win32 headless mode at boot. Wave 3 contract.",
  );
});

// Test Q — verdict line (post-publisher-injection PASS/FAIL summary).
// Format: `[ssr-host] win32 verdict: OK ...` OR `[ssr-host] win32 verdict: FAILED ...`.
// The literal stable substring is `[ssr-host] win32 verdict:`.
test("Q: verdict line — [ssr-host] win32 verdict: is logged", () => {
  assert.ok(
    SRC.includes("[ssr-host] win32 verdict:"),
    "src/server/ssr-render-host.mjs must contain a verdict line with literal " +
    "`[ssr-host] win32 verdict:` emitted ONCE after browser-connect + publisher " +
    "try/catch so the operator can grep start.log for a single PASS/FAIL string. " +
    "Wave 3 contract.",
  );
});

// Test R — optional full-args dump gated by SSR_LOG_LAUNCH_ARGS=1.
// Must reference both the env var and the `launch args` log substring.
test("R: args dump — SSR_LOG_LAUNCH_ARGS=1 logs launch args", () => {
  assert.ok(
    SRC.includes("SSR_LOG_LAUNCH_ARGS"),
    "src/server/ssr-render-host.mjs must reference the env var SSR_LOG_LAUNCH_ARGS " +
    "so the operator can opt into a one-line full Chromium-args dump without " +
    "enabling DEBUG=puppeteer:*. Wave 3 contract.",
  );
  assert.ok(
    /launch args/.test(SRC),
    "src/server/ssr-render-host.mjs must log `launch args` (the literal substring) " +
    "when SSR_LOG_LAUNCH_ARGS=1 is set, so the dumped line is greppable. " +
    "Wave 3 contract.",
  );
});
