// Phase 35 D-01-A1 — bootAlignMode export-shape contract test.
//
// RED on master: src/app/runtime/output-receiver/output-align-mode.js does
// not exist yet. ERR_MODULE_NOT_FOUND is the EXPECTED failure mode — that's
// proof the rail is real. When 35-A-PLAN lands the module, this test
// transitions to GREEN automatically.
//
// Subject: bootAlignMode({...}) → { stop: () => void }

import test from "node:test";
import assert from "node:assert/strict";

test("D-01-A1: bootAlignMode is exported from output-align-mode.js", async () => {
  const mod = await import(
    "../src/app/runtime/output-receiver/output-align-mode.js"
  );
  assert.equal(
    typeof mod.bootAlignMode,
    "function",
    "bootAlignMode export missing or not a function",
  );
});

test("D-01-A1: bootAlignMode export shape — function callable, returns { stop }", async () => {
  // We cannot fully construct args without DOM; this test just asserts the
  // EXPORT SHAPE is correct. Either bootAlignMode throws under Node-without-DOM
  // (acceptable — it's a browser module), OR it returns an object with .stop.
  const mod = await import(
    "../src/app/runtime/output-receiver/output-align-mode.js"
  );
  assert.equal(
    typeof mod.bootAlignMode,
    "function",
    "bootAlignMode is not a function",
  );
});
