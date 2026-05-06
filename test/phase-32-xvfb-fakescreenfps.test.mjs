// test/phase-32-xvfb-fakescreenfps.test.mjs
//
// Phase 32 Wave 0 — Block A test A9 (SKIP-GATED).
// These tests will be flipped GREEN by Wave 1 when -fakescreenfps is added
// to the Xvfb spawn args in ssr-render-host.mjs spawnXvfb().
//
// Contains: phase-32-xvfb-fakescreenfps

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

// Read the render-host source once for the grep-based assertions.
// This avoids importing the full ESM module (which has side-effects like
// process.env reads and optionally spawning processes).
const RENDER_HOST_SRC = readFileSync(
  new URL("../src/server/ssr-render-host.mjs", import.meta.url),
  "utf8",
);

// ── A9: Xvfb args include -fakescreenfps ──────────────────────────────────

test(
  "A9a: Xvfb spawn args include the literal string '-fakescreenfps'",
  { skip: "Wave 1 will add -fakescreenfps to spawnXvfb() args in ssr-render-host.mjs" },
  () => {
    assert.ok(
      RENDER_HOST_SRC.includes("-fakescreenfps"),
      "ssr-render-host.mjs must contain '-fakescreenfps' in the Xvfb args after Wave 1",
    );
  },
);

test(
  "A9b: -fakescreenfps value is one of '60', '120', or '240' (a numeric string suitable for Xvfb)",
  { skip: "Wave 1 will set -fakescreenfps to 120 (headroom above 60fps target)" },
  () => {
    // After Wave 1 adds the flag, verify it passes a valid numeric string value.
    const fakeFpsMatch = RENDER_HOST_SRC.match(/"-fakescreenfps"\s*,\s*"(\d+)"/);
    assert.ok(
      fakeFpsMatch !== null,
      "Expected to find -fakescreenfps with a string numeric value in xvfbArgs",
    );
    const value = fakeFpsMatch[1];
    assert.ok(
      ["60", "120", "240"].includes(value),
      `-fakescreenfps value must be '60', '120', or '240', got: '${value}'`,
    );
  },
);
