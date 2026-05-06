// Phase 31 Plan 05 (Wave 5) — getRuntimeEnvironment helper + hotfix-gating
// regression test. The helper itself is shipped as a browser-side IIFE
// (window.TT_BEAMER_RUNTIME_ENV) so we can't `import` it from Node; instead
// we (a) extract its pure function body via eval and exercise it with stub
// inputs, and (b) grep the gating sites to confirm the runtime-env import
// + the `=== 'pi'` branch are present where the audit
// (.planning/phases/phase-31/31-HOTFIX-AUDIT.md) requires them.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const RUNTIME_ENV_SRC = readFileSync(
  "./src/app/lib/shared/runtime-env.js",
  "utf8",
);
const GIF_DECODER_SRC = readFileSync(
  "./src/app/runtime/render/runtime-gif-decoder.js",
  "utf8",
);
const GIF_PLAYBACK_SRC = readFileSync(
  "./src/app/runtime/render/runtime-gif-playback.js",
  "utf8",
);

// Build a callable copy of `getRuntimeEnvironment` for unit testing without
// a browser. We extract the function source (signature + body) by walking
// braces starting from the first `(` of the parameter list — this correctly
// pairs the destructuring-default `{...} = {}` braces with their closers
// before reaching the function body.
function buildGetRuntimeEnvironmentCallable() {
  const startMarker = "function getRuntimeEnvironment(";
  const start = RUNTIME_ENV_SRC.indexOf(startMarker);
  if (start < 0) throw new Error("getRuntimeEnvironment definition not found");
  // Walk through the parameter list to skip past the destructuring-default
  // braces (e.g. `{ location: loc, userAgent: ua } = {}`).
  const parenOpen = RUNTIME_ENV_SRC.indexOf("(", start);
  let parenDepth = 0;
  let cursor = parenOpen;
  for (; cursor < RUNTIME_ENV_SRC.length; cursor += 1) {
    const ch = RUNTIME_ENV_SRC[cursor];
    if (ch === "(") parenDepth += 1;
    else if (ch === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        cursor += 1;
        break;
      }
    }
  }
  // Now walk to the function body's opening `{`.
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
      if (depth === 0) {
        i += 1;
        break;
      }
    }
  }
  const fnSrc = RUNTIME_ENV_SRC.slice(start, i);
  // eslint-disable-next-line no-new-func
  const factory = new Function(`${fnSrc}\nreturn getRuntimeEnvironment;`);
  return factory();
}

test("runtime-env.js: getRuntimeEnvironment defined and exported", () => {
  assert.match(
    RUNTIME_ENV_SRC,
    /function getRuntimeEnvironment\(/,
    "function defined",
  );
  assert.match(
    RUNTIME_ENV_SRC,
    /getRuntimeEnvironment,/,
    "function added to TT_BEAMER_RUNTIME_ENV exports",
  );
  assert.match(
    RUNTIME_ENV_SRC,
    /server-ssr/,
    "server-ssr classification present",
  );
  assert.match(
    RUNTIME_ENV_SRC,
    /armv7l|armv8|aarch64/,
    "ARM UA defense-in-depth present",
  );
});

test("getRuntimeEnvironment: ?ssr=1 → server-ssr", () => {
  const fn = buildGetRuntimeEnvironmentCallable();
  const result = fn({
    location: { pathname: "/output/", search: "?ssr=1" },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/131.0",
  });
  assert.equal(result, "server-ssr");
});

test("getRuntimeEnvironment: /output/ without ?ssr=1 → pi", () => {
  const fn = buildGetRuntimeEnvironmentCallable();
  const result = fn({
    location: { pathname: "/output/", search: "" },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/131.0",
  });
  assert.equal(result, "pi");
});

test("getRuntimeEnvironment: /output (no trailing slash) → pi", () => {
  const fn = buildGetRuntimeEnvironmentCallable();
  const result = fn({
    location: { pathname: "/output", search: "" },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/131.0",
  });
  assert.equal(result, "pi");
});

test("getRuntimeEnvironment: dashboard root → desktop", () => {
  const fn = buildGetRuntimeEnvironmentCallable();
  const result = fn({
    location: { pathname: "/", search: "" },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/131.0",
  });
  assert.equal(result, "desktop");
});

test("getRuntimeEnvironment: /dashboard → desktop", () => {
  const fn = buildGetRuntimeEnvironmentCallable();
  const result = fn({
    location: { pathname: "/dashboard", search: "" },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/131.0",
  });
  assert.equal(result, "desktop");
});

test("getRuntimeEnvironment: ARM UA forces 'pi' even with ?ssr=1 (defense-in-depth)", () => {
  const fn = buildGetRuntimeEnvironmentCallable();
  const result = fn({
    location: { pathname: "/output/", search: "?ssr=1" },
    userAgent: "Mozilla/5.0 (Linux; armv7l) Chromium/120",
  });
  assert.equal(
    result,
    "pi",
    "ARM UA must clamp to 'pi' even when URL claims ssr=1",
  );
});

test("getRuntimeEnvironment: aarch64 UA forces 'pi'", () => {
  const fn = buildGetRuntimeEnvironmentCallable();
  const result = fn({
    location: { pathname: "/", search: "" },
    userAgent: "Mozilla/5.0 (Linux; aarch64) Chromium/120",
  });
  assert.equal(result, "pi");
});

test("runtime-gif-decoder.js: T7+T15 256px cap applies to all final-output (h8 revert)", () => {
  // h8 hotfix (2026-05-06): the Plan-05 environment gate that scoped the
  // 256px cap to Pi was reverted because users reported GIFs not starting
  // reliably on /output/ — exact Phase-30 B2 regression. The cap now
  // applies to all final-output (Pi-direct AND SSR-tab render) which
  // matches Phase-30 closure state.
  assert.match(
    GIF_DECODER_SRC,
    /GIF_MAX_PIXEL_DIM/,
    "GIF cap constant still defined",
  );
  assert.match(
    GIF_DECODER_SRC,
    /isFinalOutput/,
    "decoder gates the cap on isFinalOutput, not env-class",
  );
});

test("runtime-gif-playback.js: T12 WARM_DECODE_TIMEOUT_MS = 30000 universal (h8 revert)", () => {
  // h8 hotfix: revert Plan-05 env-gate. Phase-30 closure used 30s for
  // /output/final regardless of hardware; SSR Chromium tab uses the
  // same canvas-heavy parser path that needs >5s on slime.gif.
  assert.match(
    GIF_PLAYBACK_SRC,
    /WARM_DECODE_TIMEOUT_MS\s*=\s*30000/,
    "WARM_DECODE_TIMEOUT_MS = 30000 universal",
  );
});

test("runtime-outside-mp4.js + runtime-draw-loop.js: server-keep hotfixes NOT modified", () => {
  // These files are classified server-keep by the audit (T4/T13/T16 stay
  // unchanged). The verification is purely structural: their hotfix
  // markers remain present and unchanged in shape.
  const mp4 = readFileSync(
    "./src/app/runtime/render/runtime-outside-mp4.js",
    "utf8",
  );
  const drawLoop = readFileSync(
    "./src/app/runtime/render/runtime-draw-loop.js",
    "utf8",
  );
  assert.match(mp4, /T16:\s*bumped 350 → 1500 ms/, "T16 untouched");
  assert.match(drawLoop, /T4 \(Option B\)/, "T4 untouched");
  assert.match(drawLoop, /T10\/T13/, "T13 untouched");
  // Neither file should have been wrapped with getRuntimeEnvironment
  // (audit classifies them as environment-agnostic).
  assert.equal(
    mp4.includes("getRuntimeEnvironment"),
    false,
    "outside-mp4 stays unconditional (server-keep)",
  );
  assert.equal(
    drawLoop.includes("getRuntimeEnvironment"),
    false,
    "draw-loop stays unconditional (server-keep)",
  );
});
