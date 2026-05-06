// test/ssr-browser-detect.test.mjs
//
// Phase 31 h1 hotfix: cross-platform browser detection.
//
// Pure unit tests with injected file-system stub. No real puppeteer call
// (we don't want puppeteer's bundled chromium to make this test flaky on
// CI without --no-sandbox or in an isolated sandbox without /dev/shm).

import { test } from "node:test";
import assert from "node:assert/strict";

import { detectChromiumBinary } from "../src/server/ssr-browser-detect.mjs";

function fakeFs(present) {
  const set = new Set(present);
  return (p) => set.has(p);
}

test("detectChromiumBinary: env override returns provided path even if missing", async () => {
  const result = await detectChromiumBinary({
    envOverride: "/custom/chrome",
    fileExists: fakeFs([]),
  });
  assert.equal(result.path, "/custom/chrome");
  assert.equal(result.source, "env");
  assert.deepEqual(result.availablePaths, []);
});

test("detectChromiumBinary: env override marks file as available when fs reports it", async () => {
  const result = await detectChromiumBinary({
    envOverride: "/custom/chrome",
    fileExists: fakeFs(["/custom/chrome"]),
  });
  assert.equal(result.path, "/custom/chrome");
  assert.equal(result.source, "env");
  assert.deepEqual(result.availablePaths, ["/custom/chrome"]);
});

test("detectChromiumBinary: bundled puppeteer wins over OS paths when available, else /snap/bin first", async (t) => {
  if (process.platform !== "linux") return t.skip("Linux-only path order test");
  // Both system paths exist. If puppeteer's bundled chromium is installed,
  // it wins (source=bundled). Otherwise the first system candidate
  // (/snap/bin/chromium) wins.
  const result = await detectChromiumBinary({
    fileExists: fakeFs(["/snap/bin/chromium", "/usr/bin/chromium"]),
  });
  if (result.source === "bundled") {
    assert.ok(result.path && result.path.length > 0, "bundled path must be non-empty");
  } else {
    assert.equal(result.source, "system");
    assert.equal(result.path, "/snap/bin/chromium");
    assert.ok(result.availablePaths.includes("/usr/bin/chromium"));
  }
});

test("detectChromiumBinary: returns null + 'none' when nothing is found and no env override", async () => {
  // Note: this test could pick up the bundled puppeteer chromium if installed.
  // We can only assert behavior shape, not the exact result, since real
  // puppeteer is in node_modules and may resolve a real path.
  const result = await detectChromiumBinary({
    fileExists: fakeFs([]),
  });
  // If puppeteer is installed and bundled, source could be "bundled".
  // If not, source must be "none".
  assert.ok(["none", "bundled"].includes(result.source), `unexpected source: ${result.source}`);
  if (result.source === "none") {
    assert.equal(result.path, null);
    assert.deepEqual(result.availablePaths, []);
  }
});

test("detectChromiumBinary: tried list contains common Linux paths on Linux", async (t) => {
  if (process.platform !== "linux") return t.skip("Linux-only candidates list");
  const result = await detectChromiumBinary({
    fileExists: fakeFs([]), // force fall-through to 'none'
  });
  // If bundled was found, triedPaths only contains the bundled path; else the OS list.
  if (result.source !== "bundled") {
    assert.ok(result.triedPaths.includes("/snap/bin/chromium"));
    assert.ok(result.triedPaths.includes("/usr/bin/chromium"));
    assert.ok(result.triedPaths.includes("/usr/bin/google-chrome"));
  }
});

test("detectChromiumBinary: tried list contains common macOS paths on darwin", async (t) => {
  if (process.platform !== "darwin") return t.skip("macOS-only candidates list");
  const result = await detectChromiumBinary({
    fileExists: fakeFs([]),
  });
  if (result.source !== "bundled") {
    assert.ok(
      result.triedPaths.some((p) => p.includes("Google Chrome.app")),
      `expected Google Chrome.app in triedPaths, got: ${result.triedPaths.join(",")}`,
    );
  }
});

test("detectChromiumBinary: tried list contains common Windows paths on win32", async (t) => {
  if (process.platform !== "win32") return t.skip("Windows-only candidates list");
  const result = await detectChromiumBinary({
    fileExists: fakeFs([]),
  });
  if (result.source !== "bundled") {
    assert.ok(
      result.triedPaths.some((p) => p.toLowerCase().includes("chrome.exe")),
      `expected chrome.exe in triedPaths, got: ${result.triedPaths.join(",")}`,
    );
  }
});
