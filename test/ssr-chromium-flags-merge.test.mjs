// Phase-31 h15 — regression test for the Chromium flag merge fix.
//
// THE BUG: The SSR host originally passed two separate --disable-features
// flags (one for anti-throttling, one for popup suppression). Chromium
// silently uses ONLY THE LAST instance, so the anti-throttling defenses
// never took effect — which is what made the SSR Chromium tab go
// "occluded" and stall the network service mid-fetch (the symptom user
// observed: malfunction.gif decoded but burst.gif/fire.gif fetches hung
// forever). Same gotcha applies to --enable-features.
//
// THIS TEST: greps the source of ssr-render-host.mjs for the launch arg
// list and asserts that there is at most one literal `--disable-features=`
// and one literal `--enable-features=` in the args array. Catches the
// "two flags one is silently dropped" pattern at CI time.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync("./src/server/ssr-render-host.mjs", "utf8");

// Phase 47 Wave 1 (2026-05-17): the args block was extracted from
// launchBrowser into the top-level exported pure function
// `buildChromiumLaunchArgs`. The disabled/enabled feature ARRAYS still
// live in launchBrowser (they read process.env / status.encoderConfig
// and are not pure), but the `--disable-features=…`/`--enable-features=…`
// arg STRINGS live in buildChromiumLaunchArgs. We extract both function
// bodies and concatenate so the regression greps below stay accurate
// regardless of which side of the refactor any given token lives on.
function extractFunctionBody(marker) {
  const startIdx = SRC.indexOf(marker);
  if (startIdx < 0) return "";
  // Function body ends at the next top-level `^}\n` (zero-indent closing
  // brace for top-level exported functions like buildChromiumLaunchArgs)
  // OR `^  }\n` (two-space-indent closing brace used for inner async
  // functions like launchBrowser). Try both, take the earlier match.
  const tail = SRC.slice(startIdx);
  const closingTwoSpace = /\n  \}\n/.exec(tail);
  const closingTopLevel = /\n\}\n/.exec(tail);
  // Pick the closer one (smaller index). If neither matches, return all.
  let endRel = Infinity;
  if (closingTwoSpace) endRel = Math.min(endRel, closingTwoSpace.index + closingTwoSpace[0].length);
  if (closingTopLevel) endRel = Math.min(endRel, closingTopLevel.index + closingTopLevel[0].length);
  if (endRel === Infinity) return tail;
  return tail.slice(0, endRel);
}

function extractLaunchBrowserBody() {
  const startMarker = "async function launchBrowser(";
  const startIdx = SRC.indexOf(startMarker);
  assert.ok(startIdx >= 0, "ssr-render-host.mjs must contain `async function launchBrowser(`");
  return extractFunctionBody(startMarker);
}

function extractBuildChromiumLaunchArgsBody() {
  const startMarker = "export function buildChromiumLaunchArgs";
  const startIdx = SRC.indexOf(startMarker);
  if (startIdx < 0) {
    // Pre-Phase-47-Wave-1 master: the function does not exist yet. Tests
    // fall back to launchBrowser-only behavior in that case.
    return "";
  }
  return extractFunctionBody(startMarker);
}

// Concatenated: launchBrowser body + buildChromiumLaunchArgs body. This
// is the surface against which all Phase 31 h15 / Phase 32 h9 / Phase 34
// h2 regression greps below run. Keeping the search surface unified
// keeps the contract stable regardless of where in the module any given
// token physically lives.
const launchBody = extractLaunchBrowserBody() + "\n" + extractBuildChromiumLaunchArgsBody();
// `argsLiteral` covers the line range where Chromium-flag arg strings
// actually appear (so the regression test for "two --disable-features="
// is precise). For feature-content checks we look at the whole
// launchBrowser body since the names live in adjacent arrays.
const argsLiteral = launchBody;

// Strip line comments (`//…`) so the rationale block's mentions of the
// flag name don't false-positive. Block comments are not used in this
// section of the file.
function stripLineComments(src) {
  return src
    .split("\n")
    .map((line) => line.replace(/\s*\/\/.*$/, ""))
    .join("\n");
}
const launchBodyNoComments = stripLineComments(launchBody);

test("regression h15: at most ONE literal --disable-features= in launch args", () => {
  const matches = launchBodyNoComments.match(/--disable-features=/g) || [];
  assert.equal(
    matches.length,
    1,
    `Found ${matches.length} --disable-features= instances in launch args. ` +
      "Chromium silently uses only the last one — passing the flag twice " +
      "drops the first set. Merge all features into ONE --disable-features=…",
  );
});

test("regression h15: at most ONE literal --enable-features= in launch args", () => {
  const matches = launchBodyNoComments.match(/--enable-features=/g) || [];
  assert.ok(
    matches.length <= 1,
    `Found ${matches.length} --enable-features= instances in launch args. ` +
      "Chromium silently uses only the last one — merge all features into ONE " +
      "--enable-features=… (or use a conditional `enabledFeatures.length > 0` guard).",
  );
});

test("h15: anti-throttling features survive the merge (occlusion + intensive wake-up)", () => {
  // The original bug erased these tokens. They MUST appear in the
  // disable-features list — otherwise the SSR tab gets throttled when
  // Chromium decides it's occluded under Xvfb, which is the network-
  // service-stall scenario that hung GIF fetches.
  assert.ok(
    /CalculateNativeWinOcclusion/.test(argsLiteral),
    "CalculateNativeWinOcclusion must be in the disabled-features set",
  );
  assert.ok(
    /IntensiveWakeUpThrottling/.test(argsLiteral),
    "IntensiveWakeUpThrottling must be in the disabled-features set",
  );
  assert.ok(
    /BackForwardCache/.test(argsLiteral),
    "BackForwardCache must be in the disabled-features set",
  );
});

test("h15: popup-suppression features survive the merge (capture cleanliness)", () => {
  // The merge must keep these too — without Translate/TranslateUI
  // disabled, the browser shows a translate popup that gets captured
  // into the streamed video frame.
  assert.ok(/Translate/.test(argsLiteral), "Translate must be in disabled-features");
  assert.ok(/TranslateUI/.test(argsLiteral), "TranslateUI must be in disabled-features");
});
