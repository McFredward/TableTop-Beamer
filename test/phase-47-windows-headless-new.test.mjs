// Phase 47 Wave 2 — Unit tests for the Windows headless-new launch path.
//
// PURPOSE
//   This file pins the post-Wave-2 Windows launch-arg behavior:
//     - When `useHeadlessNew === true` (the new default on Win32):
//         * DROP `--app=` (any value)
//         * DROP `--window-position=` (any value)
//         * DROP `--start-fullscreen` (already iter15-Linux-only — assert stays absent)
//         * DROP `--display=` (Wave-2 unconditional Win32 gate, independent of useHeadlessNew)
//         * KEEP `--auto-select-tab-capture-source-by-title=TableTop Beamer` and `--mute-audio`
//           (D-D2 carry-over — these are NOT headful-only)
//     - When `useHeadlessNew === false` (operator escape hatch, SSR_WIN_HEADLESS=0):
//         * RESTORE `--app=about:blank`, `--window-position=-32000,-32000`
//         * STILL DROP `--display=` (the Win32 gate is unconditional / orthogonal to useHeadlessNew —
//           cosmetic cleanup; Windows Chrome has no X server so the arg was always inert)
//
// RED expectation: Wave-1 master does not yet honor `useHeadlessNew` AND still emits
// `--display=:99` unconditionally on Win32. Tests J/K/L/M/O FAIL; Test N passes.
// Task 2 source change flips them GREEN.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildChromiumLaunchArgs } from "../src/server/ssr-render-host.mjs";

// Canonical fixture options — match iter15 module-scope defaults at launch time.
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

// ---------------------------------------------------------------------
// WIN32_ITER15_BASELINE — post-Wave-2 escape-hatch baseline.
//
// Same as the Wave-1 WIN32_ITER15_BASELINE in
// test/phase-47-linux-non-regression.test.mjs but with the trailing
// `--display=:99` entry REMOVED.
//
// Wave 2: --display=:99 dropped on Win32 (no-op cleanup — it never affected
// Windows Chrome). Matches the corresponding edit in
// test/phase-47-linux-non-regression.test.mjs in this same commit. The
// `isWin32` gate on `--display=` in `buildChromiumLaunchArgs` is unconditional
// (independent of useHeadlessNew): both the default headless-new path AND
// the SSR_WIN_HEADLESS=0 escape-hatch path emit the same Win32-shape arg
// list MINUS `--display=`. This is "iter15 modulo --display= no-op cleanup".
// ---------------------------------------------------------------------
// gap-closure-5 (2026-05-17): --no-sandbox is gated to non-Win32.
const WIN32_ITER15_BASELINE = [
  // (no --no-sandbox — gap-closure-5 gates it to Linux)
  "--autoplay-policy=no-user-gesture-required",
  // (no --ozone-platform=x11 — iter15-gated to Linux)
  "--use-gl=angle",
  "--use-angle=default",
  "--enable-unsafe-swiftshader",
  "--disable-dev-shm-usage",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-ipc-flooding-protection",
  "--disable-gpu-vsync",
  "--disable-frame-rate-limit",
  "--max-gum-fps=60",
  "--app=about:blank",
  "--window-size=1920,1080",
  "--window-position=-32000,-32000",
  // (no --start-fullscreen — iter15-gated to Linux)
  "--auto-select-tab-capture-source-by-title=TableTop Beamer",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-default-apps",
  "--disable-prompt-on-repost",
  "--disable-popup-blocking",
  "--disable-notifications",
  "--disable-sync",
  "--mute-audio",
  "--hide-crash-restore-bubble",
  "--disable-session-crashed-bubble",
  "--disable-infobars",
  "--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling,BackForwardCache,Translate,TranslateUI,PasswordManagerOnboarding,InterestFeedV2,AutofillServerCommunication",
  "--enable-features=TabCaptureFastPath",
  // Wave 2: --display=:99 dropped on Win32 (no-op cleanup — Windows Chrome
  // has no X server, the arg was always inert in iter15 too).
];

// ---------------------------------------------------------------------
// Tests J-O
// ---------------------------------------------------------------------

test("Test J: win32 + useHeadlessNew=true returns no --app= flag", () => {
  const args = buildChromiumLaunchArgs({
    platform: "win32",
    useHeadlessNew: true,
    ...BASE_OPTS,
  });
  assert.ok(Array.isArray(args), "args must be an array");
  assert.ok(
    !args.some((a) => a.startsWith("--app=")),
    "win32 headless-new must NOT include any --app= flag (Wave 2: drops the iter15 --app=about:blank hack — headless-new has no window)",
  );
});

test("Test K: win32 + useHeadlessNew=true returns no --window-position= flag", () => {
  const args = buildChromiumLaunchArgs({
    platform: "win32",
    useHeadlessNew: true,
    ...BASE_OPTS,
  });
  assert.ok(
    !args.some((a) => a.startsWith("--window-position=")),
    "win32 headless-new must NOT include any --window-position= flag (Wave 2: drops the iter15 --window-position=-32000,-32000 off-screen hack — headless-new has no window to position)",
  );
});

test("Test L: win32 + useHeadlessNew=true does not include --start-fullscreen (iter15-Linux-only, asserted to stay absent)", () => {
  const args = buildChromiumLaunchArgs({
    platform: "win32",
    useHeadlessNew: true,
    ...BASE_OPTS,
  });
  assert.ok(
    !args.includes("--start-fullscreen"),
    "win32 headless-new must NOT include --start-fullscreen (iter15 already gated this to Linux-only)",
  );
});

test("Test M: win32 + useHeadlessNew=true returns no --display= flag (Wave-2 unconditional Win32 gate)", () => {
  const args = buildChromiumLaunchArgs({
    platform: "win32",
    useHeadlessNew: true,
    ...BASE_OPTS,
  });
  assert.ok(
    !args.some((a) => a.startsWith("--display=")),
    "win32 args must NOT include any --display= flag (Wave 2: --display= is Win32-gated unconditionally — cosmetic cleanup, Windows Chrome has no X server)",
  );
});

test("Test N: win32 + useHeadlessNew=true retains tab-capture title selector + --mute-audio (D-D2 carry-over)", () => {
  const args = buildChromiumLaunchArgs({
    platform: "win32",
    useHeadlessNew: true,
    ...BASE_OPTS,
  });
  assert.ok(
    args.includes("--auto-select-tab-capture-source-by-title=TableTop Beamer"),
    "win32 headless-new must include --auto-select-tab-capture-source-by-title=TableTop Beamer (D-D2 carry-over — tab-capture title selector works in headless-new and iter15 identically)",
  );
  assert.ok(
    args.includes("--mute-audio"),
    "win32 headless-new must include --mute-audio (D-D2 lock — explicit so puppeteer-stream's ignoreDefaultArgs.push('--mute-audio') is overridden; not headful-only)",
  );
});

test("Test O: win32 + useHeadlessNew=false (SSR_WIN_HEADLESS=0 escape hatch) is byte-identical to post-Wave-2 WIN32_ITER15_BASELINE (iter15 modulo --display= cleanup)", () => {
  const args = buildChromiumLaunchArgs({
    platform: "win32",
    useHeadlessNew: false,
    ...BASE_OPTS,
  });
  assert.deepStrictEqual(
    args,
    WIN32_ITER15_BASELINE,
    "win32 escape-hatch (SSR_WIN_HEADLESS=0) arg list drifted from post-Wave-2 WIN32_ITER15_BASELINE — the escape hatch must restore --app=about:blank + --window-position=-32000,-32000 (headful flags) BUT NOT --display=:99 (the isWin32 gate on --display= is unconditional; this is a cosmetic cleanup orthogonal to useHeadlessNew).",
  );
});
