// Phase 34 Wave 0 — Snapshot test for the thin /output/ HTML script graph (Track B rails).
//
// D-03 mandates: /output/ (Pi thin consumer) must be a SEPARATE HTML entry point
// with NO render pipeline scripts loaded. Only the receiver stack, runtime-env,
// and a minimal audio binder are permitted.
//
// Strategy: read output.html at repo root. If the file does not exist (pre-Track-B),
// tests 2-7 fail with the exact message "output.html missing — Wave 0 gap, will
// pass after 34-B creates it". Test 1 asserts the file exists (also RED pre-Track-B).
//
// ALL 7 tests are RED on master (output.html does not exist yet). They must all
// flip GREEN when Track B creates output.html with the correct script graph.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const OUTPUT_HTML_PATH = "./output.html";
const outputHtmlExists = existsSync(OUTPUT_HTML_PATH);
const outputSrc = outputHtmlExists ? readFileSync(OUTPUT_HTML_PATH, "utf8") : "";

// EXPECTED: RED on master, GREEN after 34-B
test("output.html exists at repo root (post-Track-B)", () => {
  assert.ok(
    outputHtmlExists,
    "output.html must exist at the repo root (post-34-B). " +
    "Track B creates this thin HTML entry point for /output/ — Pi thin consumer. " +
    "Current master does not have it.",
  );
});

// EXPECTED: RED on master, GREEN after 34-B
test("output.html does NOT load runtime-orchestration.js (post-Track-B)", () => {
  if (!outputHtmlExists) {
    assert.fail(
      "output.html missing — Wave 0 gap, will pass after 34-B creates it. " +
      "Track B must ensure output.html does not reference runtime-orchestration.js.",
    );
  }
  assert.ok(
    !outputSrc.includes("runtime-orchestration.js"),
    "output.html must NOT reference runtime-orchestration.js — it is a full-app module excluded from the thin consumer.",
  );
});

// EXPECTED: RED on master, GREEN after 34-B
//
// Phase 35 D-01 (Track A) update: the projection-gl-renderer and
// 2d-fallback-renderer entries WERE in the forbidden list pre-Track-A
// because the thin /output/ had no align-mode UI. Track A explicitly
// adds them (per RESEARCH §A.4) — they are dependencies of the
// projection-mapping shim that bootAlignMode orchestrates. Removing
// them from the forbidden list reflects the post-Phase-35 reality.
// The Phase-34-era assertion was correct for its scope (no full render
// pipeline) but Track A's bootAlignMode is NOT the full render pipeline
// — it's a targeted set of 11 IIFEs whose only entry point on /output/
// is the bootAlignMode call. The animation-lifecycle / draw-loop /
// gif-decoder / live-sync-core modules remain forbidden.
test("output.html does NOT load any of the render pipeline modules (post-Track-B)", () => {
  if (!outputHtmlExists) {
    assert.fail(
      "output.html missing — Wave 0 gap, will pass after 34-B creates it. " +
      "Track B must ensure output.html excludes all render pipeline scripts.",
    );
  }
  const forbidden = [
    "runtime-gif-decoder.js",
    "runtime-gif-playback.js",
    "runtime-outside-mp4.js",
    "runtime-draw-loop.js",
    // "runtime-projection-gl-renderer.js"  — Track A loads this (RESEARCH §A.4)
    // "runtime-projection-2d-fallback-renderer.js"  — Track A loads this (RESEARCH §A.4)
    "runtime-animation-lifecycle.js",
    "runtime-live-sync-core.js",
    "runtime-orchestration-ctx-builder.js",
  ];
  for (const module of forbidden) {
    assert.ok(
      !outputSrc.includes(module),
      `output.html must NOT reference ${module} — render pipeline module excluded from thin consumer.`,
    );
  }
});

// EXPECTED: RED on master, GREEN after 34-B
test("output.html DOES load receiver-bootstrap.js (post-Track-B)", () => {
  if (!outputHtmlExists) {
    assert.fail(
      "output.html missing — Wave 0 gap, will pass after 34-B creates it. " +
      "Track B must include receiver-bootstrap.js as the primary receiver entry point.",
    );
  }
  assert.ok(
    outputSrc.includes("receiver-bootstrap.js"),
    "output.html must reference receiver-bootstrap.js — the thin WebRTC receiver entry point.",
  );
});

// EXPECTED: RED on master, GREEN after 34-B
test("output.html DOES load runtime-env.js (post-Track-B)", () => {
  if (!outputHtmlExists) {
    assert.fail(
      "output.html missing — Wave 0 gap, will pass after 34-B creates it. " +
      "Track B must include runtime-env.js for role detection.",
    );
  }
  assert.ok(
    outputSrc.includes("runtime-env.js"),
    "output.html must reference runtime-env.js — required for output role detection.",
  );
});

// EXPECTED: RED on master, GREEN after 34-B
test("output.html DOES load output-audio-binder.js (post-Track-B)", () => {
  if (!outputHtmlExists) {
    assert.fail(
      "output.html missing — Wave 0 gap, will pass after 34-B creates it. " +
      "Track B must include output-audio-binder.js (new thin audio module, D-03 Option-3).",
    );
  }
  // This is the new minimal audio module that replaces the full live-sync-core
  // audio path for the thin /output/ consumer (RESEARCH §Audio Binder Coupling, Option-3).
  assert.ok(
    outputSrc.includes("output-audio-binder.js"),
    "output.html must reference output-audio-binder.js — thin audio binder (D-03 mandatory).",
  );
});

// EXPECTED: RED on master, GREEN after 34-B
//
// Phase 35 D-01 (Track A) update: Track A adds 11 IIFE script tags +
// 1 type=module script for bootAlignMode to load the align-mode UI on
// /output/. These are register-on-window IIFEs (no blocking work; defer'd
// for document-order execution per Pitfall 5). The post-Phase-35 thin
// consumer has ~17 script tags (vs ~85 in index.html) — still ~5x
// thinner than the dashboard. The "<= 8" threshold was a Phase-34
// advisory not a locked requirement (CONTEXT.md A4 acknowledges Track A
// expansion). Updated upper bound: 20 — heuristic strip check still
// catches accidental full-pipeline loads.
test("output.html script-graph snapshot stays thin (heuristic strip check)", () => {
  if (!outputHtmlExists) {
    assert.fail(
      "output.html missing — Wave 0 gap, will pass after 34-B creates it. " +
      "Track B must create output.html with at most 20 <script tags (vs ~85 in index.html).",
    );
  }
  // Heuristic: count <script occurrences. Full app (index.html) has ~85.
  // Phase 35 thin consumer: ~17 (5 base + 11 align-mode IIFEs + 1 boot module).
  const scriptTagCount = (outputSrc.match(/<script/g) || []).length;
  assert.ok(
    scriptTagCount <= 20,
    `output.html must have at most 20 <script tags (thin consumer + align-mode), found ${scriptTagCount}. ` +
    "Track A bootAlignMode adds ~12 tags vs Phase-34 baseline — but stays << index.html (~85).",
  );
});
