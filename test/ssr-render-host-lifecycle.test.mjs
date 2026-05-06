// Phase 31 Wave 0 — render-host lifecycle scaffold.
// Plan 01 will create src/server/ssr-render-host.mjs (Xvfb + puppeteer
// launch + tab health-check). Until then the file-existence assertions
// stay skip-gated; the package.json contract assertion runs immediately
// because Wave 0 (Task 0) creates package.json.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

test(
  "Wave 0 scaffold: ssr-render-host module file is reachable post-Plan-01",
  { skip: !existsSync("./src/server/ssr-render-host.mjs") },
  () => {
    assert.ok(
      existsSync("./src/server/ssr-render-host.mjs"),
      "Plan 01 must create src/server/ssr-render-host.mjs",
    );
  },
);

test(
  "Wave 0 scaffold: package.json declares puppeteer + puppeteer-stream + mediasoup",
  () => {
    const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
    assert.ok(pkg.dependencies, "package.json missing dependencies object");
    assert.ok(
      pkg.dependencies.mediasoup,
      "mediasoup missing from package.json dependencies",
    );
    assert.ok(
      pkg.dependencies.puppeteer,
      "puppeteer missing from package.json dependencies",
    );
    assert.ok(
      pkg.dependencies["puppeteer-stream"],
      "puppeteer-stream missing from package.json dependencies",
    );
  },
);
