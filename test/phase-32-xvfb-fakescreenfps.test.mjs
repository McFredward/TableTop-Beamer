// test/phase-32-xvfb-fakescreenfps.test.mjs
//
// Phase 32 Wave 1 — Block A test A9 (GREEN — flipped from skip by 32-01-T1).
// Verifies that Xvfb spawn args include -fakescreenfps 120, the primary
// root-cause fix for the 20-25fps cap (Research I-1A).
//
// Contains: phase-32-xvfb-fakescreenfps

import { test } from "node:test";
import { strict as assert } from "node:assert";

// ── A9: Xvfb args include -fakescreenfps ──────────────────────────────────

test(
  "A9a: Xvfb spawn args include the literal string '-fakescreenfps'",
  async () => {
    const { getXvfbArgs } = await import("../src/server/ssr-render-host.mjs");
    const args = getXvfbArgs({ display: ":99", width: 1920, height: 1080 });
    const flagIdx = args.indexOf("-fakescreenfps");
    assert.notEqual(
      flagIdx,
      -1,
      `getXvfbArgs must include '-fakescreenfps' flag, got: ${JSON.stringify(args)}`,
    );
  },
);

test(
  "A9b: -fakescreenfps value is one of '60', '120', or '240' (a numeric string suitable for Xvfb)",
  async () => {
    const { getXvfbArgs } = await import("../src/server/ssr-render-host.mjs");
    const args = getXvfbArgs({ display: ":99", width: 1920, height: 1080 });
    const flagIdx = args.indexOf("-fakescreenfps");
    assert.notEqual(flagIdx, -1, "Expected -fakescreenfps flag in args");
    const value = args[flagIdx + 1];
    assert.ok(
      ["60", "120", "240"].includes(value),
      `-fakescreenfps value must be '60', '120', or '240', got: '${value}'`,
    );
  },
);
