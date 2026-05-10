// Phase 35 D-02-B1 / D-02-B2 — bootOutputLiveSync export-shape contract +
// audio-binder consumer wiring tests.
//
// RED on master: src/app/runtime/output-receiver/output-live-sync.js does
// not exist yet. ERR_MODULE_NOT_FOUND is the EXPECTED failure — proof the
// rail is real. When 35-B-PLAN lands the module + refactors output-audio-binder
// to consume it, this test transitions to GREEN automatically.

import test from "node:test";
import assert from "node:assert/strict";

// Minimal browser-like global polyfill so the module import doesn't blow up
// at top-level. The module only uses these inside bootOutputLiveSync().
function installBrowserGlobals() {
  globalThis.window = {
    location: { protocol: "http:", host: "127.0.0.1:0" },
    WebSocket: class FakeWS {
      constructor() {
        this.readyState = 0;
      }
      addEventListener() {}
      removeEventListener() {}
      close() {}
      send() {}
    },
  };
  globalThis.WebSocket = globalThis.window.WebSocket;
  if (typeof globalThis.fetch !== "function") {
    globalThis.fetch = async () => ({ ok: false, json: async () => ({}) });
  }
  globalThis.setInterval = (fn, ms) => 0;
  globalThis.clearInterval = () => {};
  // Don't override setTimeout/clearTimeout — Node has them.
}

test("D-02-B1: bootOutputLiveSync is exported from output-live-sync.js", async () => {
  const mod = await import(
    "../src/app/runtime/output-receiver/output-live-sync.js"
  );
  assert.equal(
    typeof mod.bootOutputLiveSync,
    "function",
    "bootOutputLiveSync export missing",
  );
});

test("D-02-B1: bootOutputLiveSync subscription has 7 callback registrars + 3 getters + stop", async () => {
  installBrowserGlobals();
  const mod = await import(
    "../src/app/runtime/output-receiver/output-live-sync.js"
  );
  const sub = mod.bootOutputLiveSync({
    logger: { warn() {}, info() {}, error() {} },
    role: "final-output",
    url: "ws://127.0.0.1:0/api/live/ws?role=final-output",
  });

  // 7 callback registrars
  for (const name of [
    "onAnimationStart",
    "onAnimationStop",
    "onClearAll",
    "onAlignModeChange",
    "onProjectionProfileChange",
    "onConnect",
    "onDisconnect",
  ]) {
    assert.equal(
      typeof sub[name],
      "function",
      `subscription is missing callback registrar: ${name}`,
    );
  }

  // 3 getters
  for (const name of [
    "getActiveProjectionProfileId",
    "getAlignMode",
    "getCurrentClientId",
  ]) {
    assert.equal(
      typeof sub[name],
      "function",
      `subscription is missing getter: ${name}`,
    );
  }

  // stop()
  assert.equal(
    typeof sub.stop,
    "function",
    "subscription is missing stop()",
  );
  sub.stop();
});

test("D-02-B2: output-audio-binder.js imports + uses bootOutputLiveSync", async () => {
  // Static-source check: after Track B's refactor, output-audio-binder.js
  // must consume the new shared subscription module.
  const fs = await import("node:fs/promises");
  const src = await fs.readFile(
    new URL(
      "../src/app/runtime/output-receiver/output-audio-binder.js",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(
    src,
    /from\s+["'].*output-live-sync.*["']/,
    "audio-binder must import bootOutputLiveSync from output-live-sync.js",
  );
  assert.match(
    src,
    /onAnimationStart|onAnimationStop|onClearAll/,
    "audio-binder must subscribe to live-sync animation callbacks",
  );
});
