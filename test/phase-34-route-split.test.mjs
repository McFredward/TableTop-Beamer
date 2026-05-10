// Phase 34 Wave 0 — Contract tests for server-side route split (Track B rails).
//
// These tests pin the POST-34-B behavior of resolveStaticPath() and
// normalizeRoutePath() in server.mjs. Tests marked RED will fail on master
// (before Track B lands) and must flip GREEN when resolveStaticPath() is
// updated to route /ssr → index.html and /output* → output.html.
//
// Strategy: read server.mjs source as a string and assert the target logic
// via regex (same pattern as test/ssr-chromium-flags-merge.test.mjs). This
// avoids the complexity of importing a 4000-line CommonJS-style server module
// with its own process.exit calls.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SERVER_SRC = readFileSync("./server.mjs", "utf8");

// Extract the resolveStaticPath function body for targeted assertions.
function extractResolveStaticPath() {
  const marker = "function resolveStaticPath(";
  const start = SERVER_SRC.indexOf(marker);
  assert.ok(start >= 0, "server.mjs must contain function resolveStaticPath(");
  let depth = 0;
  let i = SERVER_SRC.indexOf("{", start);
  assert.ok(i >= 0, "resolveStaticPath: opening brace not found");
  const bodyStart = i;
  for (; i < SERVER_SRC.length; i++) {
    if (SERVER_SRC[i] === "{") depth++;
    else if (SERVER_SRC[i] === "}") {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  return SERVER_SRC.slice(start, i);
}

const resolveStaticPathSrc = extractResolveStaticPath();

// EXPECTED: RED on master, GREEN after 34-B
test("resolveStaticPath(/ssr) returns index.html path (post-Track-B)", () => {
  // Post-34-B: resolveStaticPath must have a branch for routePath === "/ssr"
  // that maps to path.join(ROOT_DIR, "index.html").
  // Current master has no such branch — the /ssr route does not exist yet.
  const hasSsrBranch = /routePath\s*===\s*["']\/ssr["']/.test(resolveStaticPathSrc);
  assert.ok(
    hasSsrBranch,
    "resolveStaticPath must contain a branch for routePath === '/ssr' (post-34-B). " +
    "Currently server.mjs has no /ssr route — Track B must add it.",
  );
  // Also assert the /ssr branch resolves to index.html (not output.html).
  // We check the block following the /ssr === check.
  const ssrBranchIdx = resolveStaticPathSrc.search(/routePath\s*===\s*["']\/ssr["']/);
  const afterSsrBranch = resolveStaticPathSrc.slice(ssrBranchIdx, ssrBranchIdx + 200);
  assert.ok(
    /index\.html/.test(afterSsrBranch),
    "The /ssr branch in resolveStaticPath must resolve to index.html (full app for SSR tab).",
  );
});

// EXPECTED: RED on master, GREEN after 34-B
test("resolveStaticPath(/output) returns output.html path (post-Track-B)", () => {
  // Post-34-B: resolveStaticPath must map /output → output.html (thin consumer).
  // Current master maps both /output and /output/final to index.html.
  // Find the block that handles routePath === "/output".
  const outputBranchMatch = resolveStaticPathSrc.match(
    /routePath\s*===\s*["']\/output["'][^}]{0,200}/s,
  );
  assert.ok(
    outputBranchMatch,
    "resolveStaticPath must contain a branch for routePath === '/output'.",
  );
  const outputBlock = outputBranchMatch[0];
  assert.ok(
    /output\.html/.test(outputBlock),
    "The /output branch in resolveStaticPath must resolve to output.html (thin consumer, post-34-B). " +
    "Current master returns index.html — Track B must change it to output.html.",
  );
});

// EXPECTED: RED on master, GREEN after 34-B
test("resolveStaticPath(/output/final) returns output.html path (post-Track-B)", () => {
  // Post-34-B: /output/final must also map to output.html.
  // Current master maps it to index.html.
  const finalBranchMatch = resolveStaticPathSrc.match(
    /routePath\s*===\s*["']\/output\/final["'][^}]{0,300}/s,
  );
  assert.ok(
    finalBranchMatch,
    "resolveStaticPath must contain a branch for routePath === '/output/final'.",
  );
  const finalBlock = finalBranchMatch[0];
  assert.ok(
    /output\.html/.test(finalBlock),
    "The /output/final branch must resolve to output.html (post-34-B). " +
    "Current master returns index.html — Track B must change it to output.html.",
  );
});

// EXPECTED: GREEN on master (regression)
test("normalizeRoutePath strips ?ssr=1 query (regression)", () => {
  // normalizeRoutePath is a pure function — extract it directly from source
  // and exercise it. This is regression coverage: the behavior must stay
  // correct after 34-B removes ?ssr=1 as a discriminator.
  const marker = "function normalizeRoutePath(";
  const start = SERVER_SRC.indexOf(marker);
  assert.ok(start >= 0, "server.mjs must contain function normalizeRoutePath(");
  let depth = 0;
  let i = SERVER_SRC.indexOf("{", start);
  const bodyStart = i;
  for (; i < SERVER_SRC.length; i++) {
    if (SERVER_SRC[i] === "{") depth++;
    else if (SERVER_SRC[i] === "}") {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  const fnSrc = SERVER_SRC.slice(start, i);
  // eslint-disable-next-line no-new-func
  const factory = new Function(`${fnSrc}\nreturn normalizeRoutePath;`);
  const normalizeRoutePath = factory();

  const result = normalizeRoutePath("/output?ssr=1");
  assert.equal(
    result,
    "/output",
    "normalizeRoutePath('/output?ssr=1') must strip the query string and return '/output'.",
  );
  // Additional regression cases.
  assert.equal(normalizeRoutePath("/output/"), "/output", "trailing slash stripped");
  assert.equal(normalizeRoutePath("/"), "/", "root path unchanged");
});
