// test/phase-47-gap-closure-windows-launcher.test.mjs
//
// Phase 47 gap-closure (2026-05-17): pin the Win32 SSR launcher hardening
// that closed the operator UAT failure.
//
// History:
// - Initial gap-closure suspected puppeteer-stream as the root cause and
//   switched Win32 to puppeteer-core direct. Operator retest proved this
//   was NOT the fix — Chrome continued to crash with the same ERR_ABORTED
//   pattern. The puppeteer-direct switch was REVERTED to keep the launcher
//   stack symmetric with Linux (operator-validated gold rail).
// - The actual fix lives in `buildChromiumLaunchArgs`: gate
//   `--use-gl=angle` + `--use-angle=default` off on Win32 headless-new
//   (ANGLE→D3D11 init crashes without a platform window) and drop the
//   `H264HardwareEncode` Chrome feature on Win32 (Chrome WebRTC HW H264
//   without GPU context crashes during /ssr navigation).
// - Diagnostics retained from gap-closure-1: always-on `dumpio: true` on
//   Win32 and unconditional `--enable-logging=stderr --v=0` so any future
//   Chrome failure surfaces in start.log.err.
//
// Both platforms use puppeteer-stream. Linux byte-identity preserved.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const HOST_PATH = "src/server/ssr-render-host.mjs";

test("gap-closure: launchBrowser uses puppeteer-stream on BOTH platforms (symmetry with Linux)", async () => {
  const src = await readFile(HOST_PATH, "utf8");
  // The puppeteer-stream import line.
  assert.match(
    src,
    /const\s+puppeteerStream\s*=\s*await\s+import\s*\(\s*"puppeteer-stream"\s*\)/,
    "expect `await import(\"puppeteer-stream\")` in launchBrowser",
  );
  // No legacy "launcherPkg" ternary that selected between packages.
  assert.doesNotMatch(
    src,
    /launcherPkg\s*=\s*isWin32Launcher\s*\?\s*"puppeteer"\s*:\s*"puppeteer-stream"/,
    "expect the Win32-puppeteer-direct ternary to have been REMOVED",
  );
});

test("gap-closure: --enable-logging=stderr + --v=0 always-on on Win32 (diagnostics)", async () => {
  const src = await readFile(HOST_PATH, "utf8");
  // Win32 chromiumArgs MUST append these two diagnostic flags
  // unconditionally so Chrome's own errors land in start.log.err.
  assert.match(
    src,
    /chromiumArgs\s*=\s*isWin32Launcher\s*\?\s*\[[\s\S]*?"--enable-logging=stderr"[\s\S]*?"--v=0"/,
    "expect win32 chromiumArgs append of --enable-logging=stderr + --v=0",
  );
});

test("gap-closure: --auto-accept-this-tab-capture is NOT manually appended (puppeteer-stream adds it)", async () => {
  const src = await readFile(HOST_PATH, "utf8");
  // After reverting to puppeteer-stream on Win32, the explicit append
  // would duplicate the flag — puppeteer-stream's launch() adds it on
  // line 87 of its dist. Removing prevents duplicate args on Win32.
  const explicitAppend = (
    src.match(/"--auto-accept-this-tab-capture"/g) || []
  ).length;
  assert.equal(
    explicitAppend,
    0,
    "expect zero manual mentions of --auto-accept-this-tab-capture in src (puppeteer-stream adds it)",
  );
});

test("gap-closure: dumpio always-on on Win32 (operator-env-var-independent)", async () => {
  const src = await readFile(HOST_PATH, "utf8");
  // dumpio: true must fire when isWin32 (regardless of env).
  assert.match(
    src,
    /isWin32\s*\|\|\s*process\.env\.SSR_DEBUG_CHROME\s*===\s*"1"\s*\?\s*\{\s*dumpio:\s*true\s*\}/,
    "expect dumpio:true gate of the form (isWin32 || env === '1')",
  );
});

test("gap-closure: --use-gl=angle + --use-angle=default dropped on Win32 headless-new", async () => {
  const src = await readFile(HOST_PATH, "utf8");
  // buildChromiumLaunchArgs must spread these flags conditional on
  // !dropOnHeadlessNew (i.e. they DROP when Win32 is in headless-new).
  // On Linux + Xvfb (gold rail) they remain.
  assert.match(
    src,
    /dropOnHeadlessNew\s*\?\s*\[\]\s*:\s*\[\s*"--use-gl=angle"\s*,\s*"--use-angle=default"\s*\]/,
    "expect Win32-headless-new gate dropping --use-gl=angle + --use-angle=default",
  );
});

test("gap-closure: H264HardwareEncode feature gated off on Win32", async () => {
  const src = await readFile(HOST_PATH, "utf8");
  // The enabledFeatures array adds H264HardwareEncode only when NOT win32.
  // (mediasoup's Node-side nvenc encoder is unaffected — different layer.)
  assert.match(
    src,
    /!isWin32Featured\s*&&\s*status\.encoderConfig\?\.encoder\s*===\s*"nvenc"\s*\?\s*\["H264HardwareEncode"\]/,
    "expect !isWin32Featured guard on H264HardwareEncode feature flag",
  );
});
