// test/phase-47-gap-closure-windows-launcher.test.mjs
//
// Phase 47 gap-closure (2026-05-17): pin the source-level changes that
// flipped the Win32 SSR launcher off puppeteer-stream and onto puppeteer
// direct (no MV3 extension, no pipe-transport).
//
// Why: operator UAT against the Wave-1-2-3 build still saw
//   [ssr-tab:reqfailed] http://127.0.0.1:4173/ssr :: net::ERR_ABORTED
//   [ssr-host] browser disconnected unexpectedly
// after switching to `headless: "new"`. Diagnosis (see 47-CLOSURE.md
// § Gap Closure): puppeteer-stream's launch() forces `opts.pipe = true`
// (stdio DevTools transport — flaky on Win11 headless-new builds) AND
// auto-injects an MV3 extension via `--load-extension=`, then opens a
// second page to `chrome-extension://<id>/options.html` AFTER launch.
// Chrome headless-new on Windows races the extension-page navigation,
// killing the renderer mid-`page.goto(/ssr)`.
//
// Our publisher uses `navigator.mediaDevices.getDisplayMedia` (NOT
// chrome.tabCapture) and never calls puppeteer-stream's getStream, so
// the MV3 extension is entirely unnecessary on our code path.
//
// Linux path (puppeteer-stream + Xvfb) is the operator-validated gold
// rail through Phase 31-46 — DO NOT regress.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const HOST_PATH = "src/server/ssr-render-host.mjs";

test("gap-closure: launchBrowser selects puppeteer on win32, puppeteer-stream on linux", async () => {
  const src = await readFile(HOST_PATH, "utf8");

  // The branching constant must exist and use process.platform.
  assert.match(
    src,
    /isWin32Launcher\s*=\s*process\.platform\s*===\s*"win32"/,
    "expect `isWin32Launcher = process.platform === \"win32\"` switch",
  );

  // The package selection must be conditional.
  assert.match(
    src,
    /launcherPkg\s*=\s*isWin32Launcher\s*\?\s*"puppeteer"\s*:\s*"puppeteer-stream"/,
    "expect `launcherPkg = isWin32Launcher ? \"puppeteer\" : \"puppeteer-stream\"`",
  );

  // Dynamic import must use the conditional variable, not a literal.
  assert.match(
    src,
    /await\s+import\s*\(\s*launcherPkg\s*\)/,
    "expect `await import(launcherPkg)` (no literal package name)",
  );

  // The Linux import literal "puppeteer-stream" should appear ONLY in the
  // launcherPkg ternary above. There must NOT be a separate hard-coded
  // `await import("puppeteer-stream")` anywhere in launchBrowser.
  const launchBrowserBody = src.split("async function launchBrowser")[1] ?? "";
  // First close-brace ends the function (approximate, defensive).
  const launchBrowserBodyTrimmed = launchBrowserBody.slice(
    0,
    launchBrowserBody.indexOf("\n  async function "),
  );
  const literalStreamImports = (
    launchBrowserBodyTrimmed.match(/import\s*\(\s*"puppeteer-stream"\s*\)/g) || []
  ).length;
  assert.equal(
    literalStreamImports,
    0,
    "launchBrowser body must not import('puppeteer-stream') by literal — use launcherPkg",
  );
});

test("gap-closure: --auto-accept-this-tab-capture is appended on win32 only", async () => {
  const src = await readFile(HOST_PATH, "utf8");
  // The puppeteer-stream library implicitly adds this flag at launch time;
  // when we use puppeteer directly on Win32 we must add it ourselves so
  // getDisplayMedia auto-accepts the tab-capture prompt instead of hanging.
  assert.match(
    src,
    /chromiumArgs\s*=\s*isWin32Launcher\s*\?\s*\[\s*\.\.\.chromiumArgsBase\s*,\s*"--auto-accept-this-tab-capture"\s*\]/,
    "expect win32-only spread that appends --auto-accept-this-tab-capture",
  );
  // Linux non-regression: the bare base array is reused — no extra flag.
  assert.match(
    src,
    /:\s*chromiumArgsBase/,
    "Linux fallback must keep chromiumArgsBase unchanged (no extra flag)",
  );
});

test("gap-closure: operator-greppable INFO line names the launcher path", async () => {
  const src = await readFile(HOST_PATH, "utf8");
  // The operator UAT runbook (47-UAT-RUNBOOK.md) greps start.log for this
  // string to disambiguate which launcher actually ran.
  assert.match(
    src,
    /\[ssr-host\] using puppeteer direct \(no MV3 extension\) on Win32/,
    "expect operator-greppable INFO line for Win32 launcher path",
  );
});

test("gap-closure: SSR_DEBUG_CHROME=1 enables puppeteer dumpio", async () => {
  const src = await readFile(HOST_PATH, "utf8");
  // Diagnostic-only env knob: forwards Chrome's stdout+stderr so a renderer
  // crash on launch surfaces in start.log instead of being swallowed.
  assert.match(
    src,
    /SSR_DEBUG_CHROME\s*===\s*"1".*dumpio:\s*true/s,
    "expect SSR_DEBUG_CHROME=1 → dumpio: true gate on launcher options",
  );
});

test("gap-closure: Linux path still uses puppeteer-stream (gold rail intact)", async () => {
  const src = await readFile(HOST_PATH, "utf8");
  // The ternary's false branch must be exactly "puppeteer-stream" — Linux
  // is operator-validated; do not silently drop the dep.
  assert.match(
    src,
    /isWin32Launcher\s*\?\s*"puppeteer"\s*:\s*"puppeteer-stream"/,
    "Linux launcher branch must remain `puppeteer-stream`",
  );
});
