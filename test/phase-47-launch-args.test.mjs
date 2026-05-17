// Phase 47 Wave 1 — Unit tests for buildChromiumLaunchArgs (Task 1 RED).
//
// This file pins the platform-branch FINGERPRINTS of the Chromium launch arg
// array constructed by `buildChromiumLaunchArgs({ platform, opts })` in
// src/server/ssr-render-host.mjs.
//
// On RED (master, before Task 2 refactor) every test in this file will fail
// with an import error because `buildChromiumLaunchArgs` is not yet exported.
// That failure is the explicit signal that the unit-test rail is wired —
// Task 2's refactor flips them GREEN.
//
// Test scope:
//   - Test A: export presence
//   - Test B: Linux fingerprint flags
//   - Test C: Windows fingerprint flags (iter15 — `--display=:99` IS present
//             because iter15 source line 644 emits it unconditionally; this
//             is byte-identity to iter15. Wave 2 will gate it on isWin32.)
//   - Test D: --auto-select-tab-capture-source-by-title on win32 (D-D2)
//   - Test E: VAAPI-gated GL flags present when hasVaapiEnabled=true
//   - Test F: VAAPI-gated GL flags absent when hasVaapiEnabled=false
//
// Pairs with test/phase-47-linux-non-regression.test.mjs (byte-identity).

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildChromiumLaunchArgs } from "../src/server/ssr-render-host.mjs";

// Canonical fixture options — match iter15 module-scope defaults at the
// time launchBrowser() composes them. Re-used across tests.
const DISABLED_FEATURES = [
  "CalculateNativeWinOcclusion",
  "IntensiveWakeUpThrottling",
  "BackForwardCache",
  "Translate",
  "TranslateUI",
  "PasswordManagerOnboarding",
  "InterestFeedV2",
  "AutofillServerCommunication",
];

const ENABLED_FEATURES_DEFAULT = ["TabCaptureFastPath"];

const BASE_OPTS = {
  ssrUrl: "http://127.0.0.1:4173/ssr",
  viewport: { width: 1920, height: 1080 },
  display: ":99",
  disabledFeatures: DISABLED_FEATURES,
  enabledFeatures: ENABLED_FEATURES_DEFAULT,
  hasVaapiEnabled: false,
};

test("Test A: buildChromiumLaunchArgs is exported as a function", () => {
  assert.strictEqual(
    typeof buildChromiumLaunchArgs,
    "function",
    "buildChromiumLaunchArgs must be exported from src/server/ssr-render-host.mjs as a function",
  );
});

test("Test B: platform='linux' returns Linux iter15 fingerprint", () => {
  const args = buildChromiumLaunchArgs({ platform: "linux", ...BASE_OPTS });
  assert.ok(Array.isArray(args), "args must be an array");
  // Linux iter15 marker flags:
  assert.ok(args.includes("--ozone-platform=x11"), "Linux args must include --ozone-platform=x11");
  assert.ok(args.includes("--display=:99"), "Linux args must include --display=:99");
  assert.ok(
    args.includes("--app=http://127.0.0.1:4173/ssr"),
    "Linux args must include --app=<ssrUrl>",
  );
  assert.ok(args.includes("--start-fullscreen"), "Linux args must include --start-fullscreen");
  assert.ok(
    args.includes("--window-position=0,0"),
    "Linux args must include --window-position=0,0",
  );
});

test("Test C: platform='win32' returns Windows iter15 fingerprint (with --display=:99 — iter15 unconditional)", () => {
  const args = buildChromiumLaunchArgs({ platform: "win32", ...BASE_OPTS });
  assert.ok(Array.isArray(args), "args must be an array");
  // iter15 win32 EXCLUSIONS (Linux-gated flags):
  assert.ok(
    !args.includes("--ozone-platform=x11"),
    "win32 args must NOT include --ozone-platform=x11 (iter15-gated to Linux)",
  );
  assert.ok(
    !args.includes("--start-fullscreen"),
    "win32 args must NOT include --start-fullscreen (iter15-gated to Linux)",
  );
  assert.ok(
    !args.includes("--window-position=0,0"),
    "win32 args must NOT include the Linux --window-position=0,0",
  );
  assert.ok(
    !args.includes("--app=http://127.0.0.1:4173/ssr"),
    "win32 args must NOT include --app=<ssrUrl> (uses --app=about:blank instead per iter15)",
  );
  // iter15 win32 INCLUSIONS:
  assert.ok(
    args.includes("--window-position=-32000,-32000"),
    "win32 args must include --window-position=-32000,-32000 (iter15 off-screen hack)",
  );
  assert.ok(
    args.includes("--app=about:blank"),
    "win32 args must include --app=about:blank (iter15 single-instance-attach defense)",
  );
  // iter15 LINE 644 — `--display=${display}` is emitted UNCONDITIONALLY.
  // No isWin32 gate. Wave 1 preserves this; Wave 2 will add the gate.
  assert.ok(
    args.includes("--display=:99"),
    "win32 args MUST include --display=:99 in Wave 1 (iter15 source line 644 emits it unconditionally; Wave 2 will gate it)",
  );
});

test("Test D: platform='win32' includes tab-capture title selector (D-D2 carry-over)", () => {
  const args = buildChromiumLaunchArgs({ platform: "win32", ...BASE_OPTS });
  assert.ok(
    args.includes("--auto-select-tab-capture-source-by-title=TableTop Beamer"),
    "win32 args must include --auto-select-tab-capture-source-by-title=TableTop Beamer (works in headless-new and iter15)",
  );
});

test("Test E: platform='linux' + hasVaapiEnabled=true includes Phase 34 h2 GL flags", () => {
  const args = buildChromiumLaunchArgs({
    platform: "linux",
    ...BASE_OPTS,
    hasVaapiEnabled: true,
  });
  assert.ok(
    args.includes("--ignore-gpu-blocklist"),
    "VAAPI-enabled linux must include --ignore-gpu-blocklist (Phase 34 h2)",
  );
  assert.ok(
    args.includes("--enable-gpu-rasterization"),
    "VAAPI-enabled linux must include --enable-gpu-rasterization (Phase 34 h2)",
  );
});

test("Test F: platform='linux' + hasVaapiEnabled=false omits VAAPI-gated GL flags", () => {
  const args = buildChromiumLaunchArgs({
    platform: "linux",
    ...BASE_OPTS,
    hasVaapiEnabled: false,
  });
  assert.ok(
    !args.includes("--ignore-gpu-blocklist"),
    "VAAPI-disabled linux must NOT include --ignore-gpu-blocklist (Phase 34 h2 gate)",
  );
  assert.ok(
    !args.includes("--enable-gpu-rasterization"),
    "VAAPI-disabled linux must NOT include --enable-gpu-rasterization (Phase 34 h2 gate)",
  );
});
