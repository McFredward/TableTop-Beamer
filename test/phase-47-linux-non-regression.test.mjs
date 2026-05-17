// Phase 47 Wave 1 — Pinned snapshot tests for the Chromium launch arg array.
//
// PURPOSE
//   These tests are the BYTE-IDENTITY rail for the iter15 Linux + Windows
//   launch-arg lists. They guard against silent flag drift while Phase 47's
//   later waves modify the Windows path. ANY change to the Linux baseline
//   in this file requires explicit operator approval (D-02: Linux non-
//   regression is locked).
//
//   The Windows baseline pinned here matches iter15 exactly — including
//   `--display=:99` at the tail (iter15 source line 644 emits it
//   unconditionally, no isWin32 gate). Wave 2 (Plan 47-02) will add the
//   gate in `buildChromiumLaunchArgs` AND update WIN32_ITER15_BASELINE in
//   the same commit. Until then, this baseline is the truth.
//
// RED expectation: master does not yet export buildChromiumLaunchArgs;
// import fails; all three tests fail with the same error. Task 2 refactor
// flips them GREEN.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildChromiumLaunchArgs } from "../src/server/ssr-render-host.mjs";

// ---------------------------------------------------------------------
// Fixture options (match iter15 module-scope at launch time)
// ---------------------------------------------------------------------
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
// LINUX_ITER15_BASELINE — copied verbatim from
//   src/server/ssr-render-host.mjs lines 558-645 (iter15)
// in array order, with disabledFeatures/enabledFeatures/viewport/display
// rendered at fixture values. hasVaapiEnabled=false → VAAPI GL flags absent.
// ---------------------------------------------------------------------
const LINUX_ITER15_BASELINE = [
  "--no-sandbox",
  "--autoplay-policy=no-user-gesture-required",
  "--ozone-platform=x11",
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
  "--app=http://127.0.0.1:4173/ssr",
  "--window-size=1920,1080",
  "--window-position=0,0",
  "--start-fullscreen",
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
  "--display=:99",
];

// Same as LINUX_ITER15_BASELINE but with hasVaapiEnabled=true — the two
// VAAPI-gated GL flags are inserted between `--enable-features=...` and
// `--display=:99` (per iter15 source line 643 ordering).
const LINUX_ITER15_BASELINE_VAAPI = [
  "--no-sandbox",
  "--autoplay-policy=no-user-gesture-required",
  "--ozone-platform=x11",
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
  "--app=http://127.0.0.1:4173/ssr",
  "--window-size=1920,1080",
  "--window-position=0,0",
  "--start-fullscreen",
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
  "--ignore-gpu-blocklist",
  "--enable-gpu-rasterization",
  "--display=:99",
];

// ---------------------------------------------------------------------
// WIN32_ITER15_BASELINE — same as LINUX_ITER15_BASELINE but with the
// win32 branches of the iter15 ternaries taken:
//   - DROP `--ozone-platform=x11`                  (iter15 line 564 gates to Linux)
//   - DROP `--start-fullscreen`                    (iter15 line 603 gates to Linux)
//   - REPLACE `--app=...ssr` with `--app=about:blank` (iter15 line 597)
//   - REPLACE `--window-position=0,0` with `--window-position=-32000,-32000` (iter15 line 602)
//
// Wave 2: --display=:99 dropped on Win32 (cosmetic no-op cleanup — Windows
// Chrome has no X server, the arg was always inert). This is the ONE
// documented Wave-2 edit to the Wave-1 WIN32_ITER15_BASELINE; committed in
// the same atomic change as the `isWin32` gate on `--display=` in
// `buildChromiumLaunchArgs`. The Win32 --display= gate is UNCONDITIONAL
// (orthogonal to useHeadlessNew) — both the default headless-new path AND
// the SSR_WIN_HEADLESS=0 escape-hatch path use this baseline. The matching
// constant in test/phase-47-windows-headless-new.test.mjs has the same
// shape and the same comment.
// ---------------------------------------------------------------------
const WIN32_ITER15_BASELINE = [
  "--no-sandbox",
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
  // has no X server). Both default headless-new AND SSR_WIN_HEADLESS=0
  // escape-hatch share this Win32 gate. See comment above the constant.
];

// ---------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------

test("Test G: platform='linux' arg list is byte-identical to iter15 baseline (hasVaapiEnabled=false)", () => {
  const args = buildChromiumLaunchArgs({
    platform: "linux",
    ...BASE_OPTS,
    hasVaapiEnabled: false,
  });
  assert.deepStrictEqual(
    args,
    LINUX_ITER15_BASELINE,
    "Linux arg list drifted from iter15 baseline — Phase 47 Wave 1 is a PURE refactor; Linux must be byte-identical to iter15. If the diff is expected, the baseline change requires explicit operator approval (D-02).",
  );
});

test("Test H: platform='linux' arg list with hasVaapiEnabled=true includes VAAPI GL flags in iter15 position", () => {
  const args = buildChromiumLaunchArgs({
    platform: "linux",
    ...BASE_OPTS,
    hasVaapiEnabled: true,
  });
  assert.deepStrictEqual(
    args,
    LINUX_ITER15_BASELINE_VAAPI,
    "Linux+VAAPI arg list drifted from iter15 baseline. Phase 34 h2 ordering: VAAPI GL flags appear between --enable-features and --display=.",
  );
});

test("Test I (UPDATED Wave 2): platform='win32' arg list matches post-Wave-2 WIN32_ITER15_BASELINE (drops --display=:99 — cosmetic Win32 no-op cleanup)", () => {
  // Wave 2: WIN32_ITER15_BASELINE drops --display= (see constant comment above).
  // The win32 path emits the same arg list regardless of useHeadlessNew when
  // we look at the headful (escape-hatch) flags; this test asserts the
  // implicit Wave-2 default behavior of buildChromiumLaunchArgs (no
  // useHeadlessNew param → falsy → behaves like escape-hatch, but with the
  // unconditional Win32 --display= gate already applied).
  const args = buildChromiumLaunchArgs({
    platform: "win32",
    ...BASE_OPTS,
    hasVaapiEnabled: false,
  });
  assert.deepStrictEqual(
    args,
    WIN32_ITER15_BASELINE,
    "win32 arg list drifted from post-Wave-2 WIN32_ITER15_BASELINE — Wave 2 dropped --display=:99 on Win32 (unconditional cleanup; the arg was always a no-op on Windows Chrome). If the diff includes any OTHER change, that's a Wave-2 contract violation.",
  );
});
