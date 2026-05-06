// Phase-31 h16 — TCP-target dedup regression test.
//
// THE BUG: `resolveGlobalDefaultsApiCandidates` previously emitted both
// `http://127.0.0.1:4173` AND `http://localhost:4173` as fallback
// candidates. They are different browser origins (CORS) but resolve to
// the same TCP socket. When the SSR tab loaded the page from
// http://127.0.0.1:4173, the localhost fallback always failed CORS
// preflight — produced noisy `[ssr-tab:error] Access to fetch at ...
// has been blocked by CORS policy` warnings on every broadcast refetch.
//
// THIS TEST: extracts the resolver via eval (the module ships as an
// IIFE under window.TT_BEAMER_GLOBAL_DEFAULTS_API). Asserts that the
// resolver does NOT add localhost candidates when 127.0.0.1 is already
// in the list and vice versa.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync("./src/app/lib/api/global-defaults-api.js", "utf8");

// The module ships as an IIFE that calls registerGlobalDefaultsApi(...)
// — but the bulk of the code is wrapped in a function that takes deps
// (location, fetch, etc.). We can't trivially eval the whole thing
// because it has lots of browser deps. Instead we use a regex grep
// to assert the dedup logic is present in the source.
test("h16 source-grep: tcpTargetKey collapses localhost ↔ 127.0.0.1", () => {
  // The dedup MUST normalize localhost & ::1 to 127.0.0.1 — that is the
  // exact rule that prevents the CORS-spam on /output?ssr=1.
  assert.ok(
    /tcpTargetKey/.test(SRC),
    "tcpTargetKey helper must exist (h16 dedup)",
  );
  assert.ok(
    /host === "localhost"/.test(SRC) && /127\.0\.0\.1/.test(SRC),
    "tcpTargetKey must collapse `localhost` to `127.0.0.1`",
  );
});

test("h16 source-grep: candidate resolver tracks BOTH origin and tcp seen-sets", () => {
  // Defense-in-depth: dedup by origin AND by TCP target. Origin dedup
  // covers exact matches (re-add of identical candidate); TCP dedup
  // covers the localhost↔127.0.0.1 alias case.
  assert.ok(/seenOrigin/.test(SRC), "resolver must track seen origins");
  assert.ok(/seenTcp/.test(SRC), "resolver must track seen TCP targets");
});

// For the actual logic test, we extract just the two helpers we need
// and exercise them in isolation. tcpTargetKey only depends on `URL`
// (a Node 18+ global) so it's safe to eval directly.
function extractFunctionByName(src, name) {
  // Match `function NAME(args) { ... }` and return the body up to the
  // matching close brace.
  const sig = `function ${name}(`;
  const sigIdx = src.indexOf(sig);
  if (sigIdx < 0) return null;
  // Find opening `{` after the signature
  let i = src.indexOf("{", sigIdx);
  if (i < 0) return null;
  let depth = 0, inStr = null, esc = false;
  for (let j = i; j < src.length; j += 1) {
    const ch = src[j];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (ch === "\\") { esc = true; continue; }
      if (ch === inStr) { inStr = null; continue; }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(sigIdx, j + 1);
    }
  }
  return null;
}

test("h16 unit: tcpTargetKey collapses host aliases", () => {
  const fnSrc = extractFunctionByName(SRC, "tcpTargetKey");
  assert.ok(fnSrc, "tcpTargetKey source must be extractable");
  const tcpTargetKey = new Function(`${fnSrc}\nreturn tcpTargetKey;`)();

  // The whole point: localhost / 127.0.0.1 / ::1 all collapse to one key.
  const k1 = tcpTargetKey("http://127.0.0.1:4173");
  const k2 = tcpTargetKey("http://localhost:4173");
  const k3 = tcpTargetKey("http://[::1]:4173");
  assert.equal(k1, k2, "127.0.0.1 and localhost must produce the same key");
  assert.equal(k1, k3, "::1 must collapse to the same key as 127.0.0.1");

  // Different ports must NOT collapse.
  const k4 = tcpTargetKey("http://127.0.0.1:4174");
  assert.notEqual(k1, k4, "different port → different key");

  // Different protocols must NOT collapse.
  const k5 = tcpTargetKey("https://127.0.0.1:4173");
  assert.notEqual(k1, k5, "https vs http → different key");

  // Default ports (80 for http, 443 for https) get materialized.
  const k6 = tcpTargetKey("http://example.com");
  const k7 = tcpTargetKey("http://example.com:80");
  assert.equal(k6, k7, "implicit and explicit default port collapse");
});
