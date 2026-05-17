// Phase 47 Wave 1 (originally) / Wave 2 (updated) — Unit tests for buildChromiumLaunchArgs.
//
// This file pins the platform-branch FINGERPRINTS of the Chromium launch arg
// array constructed by `buildChromiumLaunchArgs({ platform, opts })` in
// src/server/ssr-render-host.mjs.
//
// Wave 2 update (2026-05-17): Test C is INVERTED — now asserts the post-Wave-2
// Win32 default-path behavior. The new default on Win32 is `useHeadlessNew=true`
// (driven by `process.env.SSR_WIN_HEADLESS !== "0"` in launchBrowser), which
// drops the iter15 off-screen-window hack (`--app=about:blank` +
// `--window-position=-32000,-32000`). The Win32 `--display=` gate is unconditional
// (Wave 2 cosmetic cleanup — Windows Chrome has no X server). All other Wave-1
// tests (A, B, D, E, F) are unchanged.
//
// Test scope:
//   - Test A: export presence
//   - Test B: Linux fingerprint flags (unchanged)
//   - Test C (UPDATED): Windows fingerprint flags — post-Wave-2 headless-new path
//             drops --app=, --window-position=, --display= (Wave 2: headless-new
//             drops the iter15 off-screen-window hack; --display= dropped on
//             Win32 regardless via the unconditional isWin32 gate).
//   - Test D: --auto-select-tab-capture-source-by-title on win32 (D-D2, unchanged)
//   - Test E: VAAPI-gated GL flags present when hasVaapiEnabled=true (unchanged)
//   - Test F: VAAPI-gated GL flags absent when hasVaapiEnabled=false (unchanged)
//
// Pairs with test/phase-47-linux-non-regression.test.mjs (byte-identity) and
// test/phase-47-windows-headless-new.test.mjs (Wave-2 Tests J-O).

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

test("Test C (UPDATED Wave 2): platform='win32' + useHeadlessNew=true drops --app=, --window-position=, --display= (headless-new + Wave-2 Win32 --display= cleanup)", () => {
  // Wave 2: headless-new drops the iter15 off-screen-window hack
  // (--app=about:blank + --window-position=-32000,-32000). The Win32
  // --display= gate is unconditional (orthogonal to useHeadlessNew) — it's
  // a cosmetic no-op cleanup; Windows Chrome has no X server so iter15's
  // --display=:99 emit on Win32 was always inert.
  const args = buildChromiumLaunchArgs({
    platform: "win32",
    useHeadlessNew: true,
    ...BASE_OPTS,
  });
  assert.ok(Array.isArray(args), "args must be an array");
  // iter15 win32 EXCLUSIONS (Linux-gated flags) — unchanged from Wave 1:
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
    "win32 args must NOT include --app=<ssrUrl>",
  );
  // Wave 2 NEW EXCLUSIONS (post-headless-new + Win32 --display= cleanup):
  assert.ok(
    !args.some((a) => a.startsWith("--window-position=")),
    "Wave 2: win32 headless-new must NOT include any --window-position= flag (drops iter15 off-screen-window hack — no window under headless-new)",
  );
  assert.ok(
    !args.some((a) => a.startsWith("--app=")),
    "Wave 2: win32 headless-new must NOT include any --app= flag (drops iter15 --app=about:blank hack — no app-mode chrome to hide under headless-new)",
  );
  assert.ok(
    !args.some((a) => a.startsWith("--display=")),
    "Wave 2: win32 args must NOT include any --display= flag (unconditional Win32 gate — cosmetic cleanup, Windows Chrome has no X server)",
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
