// Phase 34 Wave 0 — Contract tests for runtime-env.js path-based SSR detection (Track B rails).
//
// These tests pin the POST-34-B behavior of getRuntimeEnvironment() which
// must classify pathname="/ssr" as "server-ssr" after the ?ssr=1 query param
// is removed as a discriminator (D-04).
//
// Strategy: load getRuntimeEnvironment via the same brace-walking extractor
// pattern used in test/runtime-env-environment.test.mjs. The function is a
// pure browser-side IIFE that can be extracted and tested in Node.
//
// Tests marked RED will fail on master (current code only checks ?ssr=1) and
// must flip GREEN when runtime-env.js is updated to also check pathname.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const RUNTIME_ENV_SRC = readFileSync("./src/app/lib/shared/runtime-env.js", "utf8");

// Extract and build a callable getRuntimeEnvironment without a browser.
// Identical brace-walking approach from runtime-env-environment.test.mjs.
function buildGetRuntimeEnvironmentCallable() {
  const startMarker = "function getRuntimeEnvironment(";
  const start = RUNTIME_ENV_SRC.indexOf(startMarker);
  if (start < 0) throw new Error("getRuntimeEnvironment definition not found in runtime-env.js");
  const parenOpen = RUNTIME_ENV_SRC.indexOf("(", start);
  let parenDepth = 0;
  let cursor = parenOpen;
  for (; cursor < RUNTIME_ENV_SRC.length; cursor += 1) {
    const ch = RUNTIME_ENV_SRC[cursor];
    if (ch === "(") parenDepth += 1;
    else if (ch === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) { cursor += 1; break; }
    }
  }
  while (cursor < RUNTIME_ENV_SRC.length && RUNTIME_ENV_SRC[cursor] !== "{") {
    cursor += 1;
  }
  let depth = 0;
  let i = cursor;
  for (; i < RUNTIME_ENV_SRC.length; i += 1) {
    const ch = RUNTIME_ENV_SRC[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) { i += 1; break; }
    }
  }
  const fnSrc = RUNTIME_ENV_SRC.slice(start, i);
  // eslint-disable-next-line no-new-func
  const factory = new Function(`${fnSrc}\nreturn getRuntimeEnvironment;`);
  return factory();
}

const getRuntimeEnvironment = buildGetRuntimeEnvironmentCallable();

// EXPECTED: RED on master, GREEN after 34-B
test("getRuntimeEnvironment returns 'server-ssr' for pathname=/ssr (post-Track-B)", () => {
  // Post-34-B: the SSR tab navigates to /ssr (not /output?ssr=1).
  // Current runtime-env.js only checks for ?ssr=1 in the search string —
  // it has no pathname-based detection. This must change in Track B.
  const result = getRuntimeEnvironment({
    location: { pathname: "/ssr", search: "" },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/147.0",
  });
  assert.equal(
    result,
    "server-ssr",
    "getRuntimeEnvironment({pathname:'/ssr'}) must return 'server-ssr' after Track B " +
    "migrates SSR detection from ?ssr=1 to pathname. Current master returns 'desktop'.",
  );
});

// EXPECTED: RED on master, GREEN after 34-B
test("getRuntimeEnvironment returns 'server-ssr' for pathname=/ssr/something (post-Track-B)", () => {
  // Any /ssr/* sub-path must also classify as server-ssr (future-proof for
  // possible sub-routes like /ssr/probe). Track B migration target.
  const result = getRuntimeEnvironment({
    location: { pathname: "/ssr/foo", search: "" },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/147.0",
  });
  assert.equal(
    result,
    "server-ssr",
    "getRuntimeEnvironment({pathname:'/ssr/foo'}) must return 'server-ssr' after Track B. " +
    "Current master returns 'desktop'.",
  );
});

// EXPECTED: GREEN on master (regression)
test("getRuntimeEnvironment returns 'pi' for /output without ?ssr=1 (regression)", () => {
  // /output without any ssr marker must continue to classify as "pi".
  // This is the Pi kiosk thin-consumer path — must stay green throughout Phase 34.
  const result = getRuntimeEnvironment({
    location: { pathname: "/output", search: "" },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/131.0",
  });
  assert.equal(result, "pi", "'/output' without ?ssr=1 must classify as 'pi' (Pi kiosk).");
});

// EXPECTED: GREEN on master (regression)
// Track B may DELETE this test if the legacy ?ssr=1 path is fully removed;
// until then it asserts the existing behavior.
test("getRuntimeEnvironment returns 'server-ssr' for /output?ssr=1 (legacy regression — must keep working until hard-cut)", () => {
  // The legacy URL /output?ssr=1 is only consumed by ssr-render-host.mjs
  // (server-side). Until Track B hard-cuts ?ssr=1 from the URL and removes
  // this detector, the existing behavior must not regress.
  const result = getRuntimeEnvironment({
    location: { pathname: "/output", search: "?ssr=1" },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/131.0",
  });
  assert.equal(
    result,
    "server-ssr",
    "Legacy ?ssr=1 discriminator must still return 'server-ssr' until Track B hard-cuts it.",
  );
});

// Phase 34 D-04 post-UAT bug fix: resolveOutputRoleFromLocation must also
// classify /ssr as OUTPUT_ROLE_FINAL — otherwise the SSR Chromium tab boots
// in OUTPUT_ROLE_CONTROL (dashboard mode) and the captured H264 stream shows
// the operator UI instead of the polygon-mapped projection. Operator-reported
// regression on first /output/ test of Phase 34.
test("resolveOutputRoleFromLocation returns FINAL for pathname=/ssr (post-UAT fix)", () => {
  const startMarker = "function resolveOutputRoleFromLocation(";
  const start = RUNTIME_ENV_SRC.indexOf(startMarker);
  if (start < 0) throw new Error("resolveOutputRoleFromLocation definition not found");
  let depth = 0;
  let i = start;
  while (i < RUNTIME_ENV_SRC.length && RUNTIME_ENV_SRC[i] !== "{") i += 1;
  for (; i < RUNTIME_ENV_SRC.length; i += 1) {
    const ch = RUNTIME_ENV_SRC[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) { i += 1; break; }
    }
  }
  const fnSrc = RUNTIME_ENV_SRC.slice(start, i);
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    `const OUTPUT_ROLE_CONTROL = "control"; const OUTPUT_ROLE_FINAL = "final-output"; ${fnSrc} return resolveOutputRoleFromLocation;`,
  );
  const resolveOutputRoleFromLocation = factory();
  assert.equal(
    resolveOutputRoleFromLocation({ pathname: "/ssr" }),
    "final-output",
    "/ssr must classify as OUTPUT_ROLE_FINAL — the SSR tab renders the projection, " +
    "not the operator dashboard. Without this the captured stream shows the dashboard view.",
  );
  assert.equal(
    resolveOutputRoleFromLocation({ pathname: "/ssr/probe" }),
    "final-output",
    "/ssr/* sub-paths must also classify as FINAL.",
  );
  // Regression: existing /output and /output/final still work
  assert.equal(resolveOutputRoleFromLocation({ pathname: "/output" }), "final-output");
  assert.equal(resolveOutputRoleFromLocation({ pathname: "/output/final" }), "final-output");
  // Regression: dashboard remains CONTROL
  assert.equal(resolveOutputRoleFromLocation({ pathname: "/" }), "control");
});

// EXPECTED: GREEN on master (regression)
test("getRuntimeEnvironment returns 'pi' for ARM UA regardless of pathname (regression)", () => {
  // ARM-UA defense-in-depth: armv7l/armv8/aarch64 user agents are always
  // clamped to 'pi' regardless of URL. This must survive all Phase 34 edits.
  const result = getRuntimeEnvironment({
    location: { pathname: "/", search: "" },
    userAgent: "Mozilla/5.0 (Linux; armv7l) Chromium/120",
  });
  assert.equal(result, "pi", "ARM UA must clamp to 'pi' (defense-in-depth).");
});
