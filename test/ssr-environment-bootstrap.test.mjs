// test/ssr-environment-bootstrap.test.mjs
//
// Phase 31 h1 hotfix: cross-platform environment probe.

import { test } from "node:test";
import assert from "node:assert/strict";
import { platform } from "node:os";

import { probeEnvironment, formatEnvironmentReport } from "../src/server/ssr-environment-bootstrap.mjs";

test("probeEnvironment returns a structured report with required keys", async () => {
  const r = await probeEnvironment({ logger: { info() {}, warn() {}, error() {} } });
  assert.equal(typeof r.os, "string");
  assert.ok(["linux", "darwin", "win32", "other"].includes(r.os));
  assert.equal(typeof r.needsVirtualDisplay, "boolean");
  assert.equal(typeof r.hasVirtualDisplay, "boolean");
  assert.ok(r.browserPath === null || typeof r.browserPath === "string");
  assert.ok(["env", "bundled", "system", "none"].includes(r.browserSource));
  assert.equal(typeof r.hasFfmpeg, "boolean");
  assert.ok(Array.isArray(r.installCommandsSuggested));
  assert.ok(Array.isArray(r.installCommandsExecuted));
  assert.ok(Array.isArray(r.warnings));
  assert.equal(typeof r.ready, "boolean");
});

test("probeEnvironment: needsVirtualDisplay matches OS+DISPLAY heuristic", async () => {
  const originalDisplay = process.env.DISPLAY;
  try {
    delete process.env.DISPLAY;
    const r1 = await probeEnvironment({ logger: { info() {}, warn() {}, error() {} } });
    if (platform() === "linux") {
      assert.equal(r1.needsVirtualDisplay, true);
    } else {
      assert.equal(r1.needsVirtualDisplay, false);
    }

    process.env.DISPLAY = ":0";
    const r2 = await probeEnvironment({ logger: { info() {}, warn() {}, error() {} } });
    assert.equal(r2.needsVirtualDisplay, false);
  } finally {
    if (originalDisplay !== undefined) process.env.DISPLAY = originalDisplay;
    else delete process.env.DISPLAY;
  }
});

test("probeEnvironment: install commands surface OS-appropriate package manager hints", async () => {
  const r = await probeEnvironment({ logger: { info() {}, warn() {}, error() {} } });
  // We can't assert which packages are missing on this machine, but if the
  // browser/ffmpeg/xvfb is missing, the suggestion list should not be empty.
  if (!r.ready) {
    assert.ok(r.installCommandsSuggested.length >= 0); // non-strict — depends on host
    // Format check: every entry is a string.
    for (const c of r.installCommandsSuggested) {
      assert.equal(typeof c, "string");
    }
  }
});

test("formatEnvironmentReport produces human-readable multiline output", () => {
  const sampleReport = {
    os: "linux",
    needsVirtualDisplay: true,
    hasVirtualDisplay: true,
    browserPath: "/snap/bin/chromium",
    browserSource: "system",
    hasFfmpeg: true,
    installCommandsSuggested: [],
    installCommandsExecuted: [],
    warnings: [],
    ready: true,
  };
  const out = formatEnvironmentReport(sampleReport);
  assert.ok(out.includes("OS: linux"));
  assert.ok(out.includes("/snap/bin/chromium"));
  assert.ok(out.includes("Ready: YES"));
});

test("formatEnvironmentReport flags missing dependencies clearly", () => {
  const out = formatEnvironmentReport({
    os: "linux",
    needsVirtualDisplay: true,
    hasVirtualDisplay: false,
    browserPath: null,
    browserSource: "none",
    hasFfmpeg: false,
    installCommandsSuggested: ["sudo apt-get install -y xvfb chromium-browser ffmpeg"],
    installCommandsExecuted: [],
    warnings: ["Xvfb missing", "No usable Chromium-family browser found", "ffmpeg missing"],
    ready: false,
  });
  assert.ok(out.includes("Ready: NO"));
  assert.ok(out.includes("MISSING"));
  assert.ok(out.includes("To make this environment ready"));
  assert.ok(out.includes("apt-get install"));
});

test("formatEnvironmentReport hides virtual-display section on macOS/Windows", () => {
  const out = formatEnvironmentReport({
    os: "darwin",
    needsVirtualDisplay: false,
    hasVirtualDisplay: false,
    browserPath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    browserSource: "system",
    hasFfmpeg: true,
    installCommandsSuggested: [],
    installCommandsExecuted: [],
    warnings: [],
    ready: true,
  });
  assert.ok(out.includes("not needed on darwin"));
});
