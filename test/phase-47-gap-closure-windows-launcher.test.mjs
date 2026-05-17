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

test("gap-closure-4: launchBrowser splits launcher — puppeteer on Win32, puppeteer-stream on Linux", async () => {
  const src = await readFile(HOST_PATH, "utf8");
  // Re-applied after empirical proof in operator UAT logs (2026-05-17):
  // puppeteer-stream's `opts.pipe = true` (line 85 of its dist) forces
  // `--remote-debugging-pipe` transport, which kills Chrome on Win11
  // headless-new. The puppeteer-core direct path uses WebSocket transport
  // (`--remote-debugging-port=0`) — empirically alive.
  assert.match(
    src,
    /launcherPkg\s*=\s*isWin32Launcher\s*\?\s*"puppeteer"\s*:\s*"puppeteer-stream"/,
    "expect Win32-puppeteer-direct / Linux-puppeteer-stream split",
  );
  assert.match(
    src,
    /await\s+import\s*\(\s*launcherPkg\s*\)/,
    "expect `await import(launcherPkg)` (no literal package name in launchBrowser)",
  );
});

test("gap-closure-4: Win32 chromiumArgs append --auto-accept-this-tab-capture (manual; puppeteer-direct path)", async () => {
  const src = await readFile(HOST_PATH, "utf8");
  // Since Win32 uses puppeteer-core directly (no puppeteer-stream), we
  // add this flag manually so getDisplayMedia auto-accepts the tab-
  // capture prompt instead of hanging. This is the FUNCTIONAL flag —
  // gap-closure-10 moved the diagnostic flags (--enable-logging=stderr,
  // --v=0) behind SSR_DEBUG_CHROME=1, but --auto-accept-this-tab-capture
  // must remain unconditional on Win32 or getDisplayMedia hangs.
  assert.match(
    src,
    /chromiumArgs\s*=\s*isWin32Launcher\s*\?\s*\[[\s\S]*?"--auto-accept-this-tab-capture"/,
    "expect win32 chromiumArgs spread that unconditionally appends --auto-accept-this-tab-capture",
  );
});

test("gap-closure-10: Win32 verbose Chrome diagnostics gated behind SSR_DEBUG_CHROME=1", async () => {
  const src = await readFile(HOST_PATH, "utf8");
  // After the Win32 path stabilized, the always-on Chrome diagnostics
  // (--enable-logging=stderr, --v=0, --log-net-log=...) were spamming
  // start.log with USB/GCM/DXGI noise on every run. They are now
  // gated behind SSR_DEBUG_CHROME=1 so the operator can opt in if a
  // future Win32 launch issue needs diagnosis, but default boots are
  // quiet.
  assert.match(
    src,
    /wantsChromeDiag\s*\?\s*\[\s*"--enable-logging=stderr"\s*,\s*"--v=0"\s*\]\s*:\s*\[\s*\]/,
    "expect --enable-logging/--v=0 conditional on wantsChromeDiag (= SSR_DEBUG_CHROME === '1')",
  );
});

test("gap-closure-10: dumpio is opt-in via SSR_DEBUG_CHROME=1 on both platforms", async () => {
  const src = await readFile(HOST_PATH, "utf8");
  // Earlier gap-closures made dumpio always-on for Win32 to surface
  // launch crashes. The Win32 path is now stable and the always-on
  // dumpio was spamming Chrome's USB/GCM/DXGI warnings (none
  // actionable) into start.log on every run. Move back to opt-in on
  // both platforms so the operator's default experience is quiet.
  assert.match(
    src,
    /process\.env\.SSR_DEBUG_CHROME\s*===\s*"1"\s*\?\s*\{\s*dumpio:\s*true\s*\}/,
    "expect dumpio:true gate of the form (process.env.SSR_DEBUG_CHROME === '1')",
  );
  assert.doesNotMatch(
    src,
    /isWin32\s*\|\|\s*process\.env\.SSR_DEBUG_CHROME\s*===\s*"1"\s*\?\s*\{\s*dumpio:\s*true\s*\}/,
    "the old `isWin32 || env === '1'` always-on Win32 dumpio gate must not be present",
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
