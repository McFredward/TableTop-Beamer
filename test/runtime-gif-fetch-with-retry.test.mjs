// Phase-31 h15 — pure unit test for the hardware-agnostic
// fetch-with-retry helper. Loads the IIFE source via readFileSync,
// strips the IIFE wrapper, and exercises `fetchWithAbortAndRetry` with
// stub fetch + AbortController + setTimeout/clearTimeout deps.
//
// Companion to:
//   - server-side fix: src/server/static-resource-headers.mjs
//   - call-site fix:  src/app/runtime/render/runtime-gif-playback.js
//
// Why eval: the helper is shipped as an IIFE that exposes a global so
// the IIFE-based runtime can consume it via window.TT_BEAMER_FETCH_WITH_RETRY.
// Same pattern as test/runtime-env-environment.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(
  "./src/app/lib/shared/fetch-with-retry.js",
  "utf8",
);

// Load the helper by eval'ing the IIFE source against a fake `window`
// so the module's `window.TT_BEAMER_FETCH_WITH_RETRY = ...` side-effect
// runs. Same trick as the runtime-env test, just simpler — we don't
// need to extract the function body, the IIFE itself binds it for us.
function loadHelperFromSource() {
  const fakeWindow = {};
  const factory = new Function("window", `${SRC}\nreturn window.TT_BEAMER_FETCH_WITH_RETRY;`);
  const exported = factory(fakeWindow);
  if (!exported || typeof exported.fetchWithAbortAndRetry !== "function") {
    throw new Error("fetch-with-retry.js did not expose TT_BEAMER_FETCH_WITH_RETRY.fetchWithAbortAndRetry");
  }
  return exported.fetchWithAbortAndRetry;
}

const fetchWithAbortAndRetry = loadHelperFromSource();

// Minimal AbortController stub: tracks abort calls + emits abort events
// on a fake signal that mimics the DOM AbortSignal interface fetch checks.
class FakeAbortController {
  constructor() {
    this.reason = null;
    const listeners = [];
    const signal = {
      aborted: false,
      addEventListener: (type, fn) => {
        if (type === "abort") listeners.push(fn);
      },
      removeEventListener: () => {},
    };
    this.signal = signal;
    this._listeners = listeners;
  }
  abort(reason) {
    if (this.signal.aborted) return;
    this.signal.aborted = true;
    this.reason = reason;
    for (const fn of this._listeners) {
      try { fn({ type: "abort" }); } catch (_) {}
    }
  }
}

test("fetchWithAbortAndRetry: returns the response on first success (no retry)", async () => {
  let callCount = 0;
  const okResponse = { ok: true, status: 200, body: "first-try" };
  const fetchImpl = async (_url, _init) => {
    callCount += 1;
    return okResponse;
  };
  const result = await fetchWithAbortAndRetry({
    url: "/resources/animations/burst.gif",
    fetchImpl,
    AbortControllerImpl: FakeAbortController,
    setTimeoutImpl: setTimeout,
    clearTimeoutImpl: clearTimeout,
  });
  assert.equal(callCount, 1, "first-success should not retry");
  assert.strictEqual(result, okResponse);
});

test("fetchWithAbortAndRetry: retries once on first-attempt failure, returns second-attempt response", async () => {
  let callCount = 0;
  const fetchImpl = async () => {
    callCount += 1;
    if (callCount === 1) {
      const err = new Error("simulated-network-glitch");
      throw err;
    }
    return { ok: true, status: 200 };
  };
  const probes = [];
  const result = await fetchWithAbortAndRetry({
    url: "/resources/animations/fire.gif",
    fetchImpl,
    AbortControllerImpl: FakeAbortController,
    setTimeoutImpl: setTimeout,
    clearTimeoutImpl: clearTimeout,
    onProbe: (event, payload) => probes.push({ event, payload }),
  });
  assert.equal(callCount, 2, "should retry exactly once");
  assert.equal(result.ok, true);
  assert.equal(probes.length, 1, "one probe for the failed attempt");
  assert.equal(probes[0].event, "fetch-attempt-failed");
  assert.equal(probes[0].payload.attempt, 1);
});

test("fetchWithAbortAndRetry: throws after maxAttempts failures (default = 2 attempts)", async () => {
  let callCount = 0;
  const fetchImpl = async () => {
    callCount += 1;
    throw new Error(`attempt-${callCount}-failed`);
  };
  await assert.rejects(
    () => fetchWithAbortAndRetry({
      url: "/resources/animations/slime.gif",
      fetchImpl,
      AbortControllerImpl: FakeAbortController,
      setTimeoutImpl: setTimeout,
      clearTimeoutImpl: clearTimeout,
    }),
    /attempt-2-failed/,
  );
  assert.equal(callCount, 2, "should attempt exactly maxAttempts (default 2) times");
});

test("fetchWithAbortAndRetry: aborts the in-flight fetch when timeout fires", async () => {
  // Use real timers but tiny timeout so the test runs in ms. The fake
  // fetch never resolves on its own — only the abort can free it.
  let abortReason = null;
  const fetchImpl = (_url, init) => {
    return new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", (ev) => {
        abortReason = "fake-abort";
        const err = new Error("aborted by timeout");
        err.name = "AbortError";
        reject(err);
      });
    });
  };
  const probes = [];
  await assert.rejects(
    () => fetchWithAbortAndRetry({
      url: "/resources/animations/burst.gif",
      timeoutMs: 10,
      maxAttempts: 1, // single attempt so the test is deterministic
      fetchImpl,
      AbortControllerImpl: FakeAbortController,
      setTimeoutImpl: setTimeout,
      clearTimeoutImpl: clearTimeout,
      onProbe: (event, payload) => probes.push({ event, payload }),
    }),
    /aborted/i,
  );
  assert.equal(abortReason, "fake-abort", "fetch saw the abort signal");
  assert.equal(probes.length, 1);
  assert.equal(probes[0].event, "fetch-attempt-failed");
  assert.equal(probes[0].payload.aborted, true);
});

test("fetchWithAbortAndRetry: a single stalled attempt does NOT cascade to others (parallel decodes)", async () => {
  // Regression test for the h14 mutex bug. Two concurrent calls — one
  // hangs forever, one returns immediately. The hung call MUST not
  // block the other.
  const stallController = { resolve: null };
  let okCalls = 0;
  const fetchImpl = async (url, _init) => {
    if (url === "/hang") {
      return new Promise((resolve) => { stallController.resolve = resolve; });
    }
    okCalls += 1;
    return { ok: true, status: 200, url };
  };
  const stallPromise = fetchWithAbortAndRetry({
    url: "/hang",
    timeoutMs: 1_000_000, // effectively never times out for this test
    maxAttempts: 1,
    fetchImpl,
    AbortControllerImpl: FakeAbortController,
    setTimeoutImpl: setTimeout,
    clearTimeoutImpl: clearTimeout,
  });
  // The stalled fetch is in flight. Now run a second fetch — it must
  // NOT wait for the first one (no global mutex).
  const okResult = await fetchWithAbortAndRetry({
    url: "/ok",
    fetchImpl,
    AbortControllerImpl: FakeAbortController,
    setTimeoutImpl: setTimeout,
    clearTimeoutImpl: clearTimeout,
  });
  assert.equal(okResult.ok, true, "second fetch completed independently");
  assert.equal(okCalls, 1);
  // Resolve the stalled one so the test doesn't leak a pending promise.
  stallController.resolve({ ok: true, status: 200, url: "/hang" });
  await stallPromise;
});

// Note: we don't unit-test the "fetchImpl is required" guard in Node
// 18+ because the destructuring default falls back to the global
// `fetch`. The guard exists for older runtimes / pages without fetch.

test("regression: runtime-gif-playback.js no longer contains the global mutex", () => {
  const playbackSrc = readFileSync(
    "./src/app/runtime/render/runtime-gif-playback.js",
    "utf8",
  );
  // The h14 mutex used `window.__ttbGifFetchMutex` as a single-flight
  // gate. h15 removed it because a single hung fetch cascaded into all
  // GIFs blocking forever.
  assert.equal(
    playbackSrc.includes("__ttbGifFetchMutex"),
    false,
    "h14 fetch mutex must be removed — it cascaded a single hang into all GIFs blocking",
  );
  // And it must be calling the new helper.
  assert.ok(
    playbackSrc.includes("TT_BEAMER_FETCH_WITH_RETRY"),
    "playback module must consume the fetch-with-retry helper",
  );
});

test("loader ordering: index.html includes fetch-with-retry.js BEFORE runtime-gif-playback.js", () => {
  const html = readFileSync("./index.html", "utf8");
  const fetchHelperIdx = html.indexOf("fetch-with-retry.js");
  const gifPlaybackIdx = html.indexOf("runtime-gif-playback.js");
  assert.ok(fetchHelperIdx >= 0, "fetch-with-retry.js script tag must be in index.html");
  assert.ok(gifPlaybackIdx >= 0, "runtime-gif-playback.js script tag must be in index.html");
  assert.ok(
    fetchHelperIdx < gifPlaybackIdx,
    "fetch-with-retry.js must load BEFORE runtime-gif-playback.js (window helper must exist when IIFE runs)",
  );
});
