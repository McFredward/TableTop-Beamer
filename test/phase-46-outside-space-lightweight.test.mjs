// Phase 46 mobile-freeze fix regression test.
//
// Asserts that runtime-effect-visuals.js exposes a `lightweight: true`
// fast path for outside-space that:
//   - is wired via the `options.lightweight === true` flag
//   - uses Path2D batching (single stroke()/fill() call per layer)
//   - is invoked from drawOutsideFxLayer in runtime-draw-loop.js
//     when getOutputRole() !== OUTPUT_ROLE_FINAL (i.e. on dashboard
//     CONTROL — the operator's mobile preview)
//   - is NOT invoked on the SSR /ssr tab (final-output role) so the
//     projector image keeps its full immersive parallax.
//
// Background: on iPhone / mid-range Android, the original outside-
// space case in drawEffectVisual generated ~71 strokes + 68 fillRects
// + ~213 per-frame canvas state changes (strokeStyle/fillStyle/
// lineWidth set per star) PLUS allocated a fresh parallaxLayers
// array literal each frame. The first frame after an animation
// trigger could exceed 100 ms; cumulatively the operator saw a
// visible ~1 s UI freeze. Source-level assertions here keep the
// fix in place — a future refactor that inlines the lightweight
// path back into the original loop body will fail this test.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

const EFFECT_VISUALS_SRC = readFileSync(
  join(REPO_ROOT, "src/app/runtime/render/runtime-effect-visuals.js"),
  "utf8",
);

const DRAW_LOOP_SRC = readFileSync(
  join(REPO_ROOT, "src/app/runtime/render/runtime-draw-loop.js"),
  "utf8",
);

test("phase-46: drawEffectVisual outside-space honours options.lightweight", () => {
  // The lightweight branch must exist and be gated by
  // `options.lightweight === true` so other call sites (animation
  // editor preview, etc.) can opt in or out independently.
  assert.match(
    EFFECT_VISUALS_SRC,
    /options\.lightweight\s*===\s*true/,
    "expected outside-space case to gate on options.lightweight === true",
  );
});

test("phase-46: lightweight outside-space uses Path2D batching", () => {
  // The minimal-cost path collapses per-star strokes + fillRects
  // into a single Path2D per layer. Without these batching primitives
  // we would silently regress to the slow per-star ops on dashboards.
  assert.match(EFFECT_VISUALS_SRC, /new\s+Path2D\s*\(\s*\)/);
  assert.match(EFFECT_VISUALS_SRC, /\.stroke\(\s*strokePath\s*\)/);
  assert.match(EFFECT_VISUALS_SRC, /\.fill\(\s*fillPath\s*\)/);
});

test("phase-46: drawOutsideFxLayer requests lightweight when not final-output", () => {
  // Wire-up assertion: the dashboard preview canvas must ask for
  // the lightweight path. The SSR /ssr tab (role=FINAL) must NOT —
  // its projector image keeps the full immersive parallax for the
  // operator's audience.
  assert.match(
    DRAW_LOOP_SRC,
    /lightweight:\s*!isFinalOutput/,
    "expected drawOutsideFxLayer to pass lightweight: !isFinalOutput to drawEffectVisual",
  );
  // And that isFinalOutput is derived from the role helper so a
  // future role rename keeps the gating intact.
  assert.match(DRAW_LOOP_SRC, /ctx\.getOutputRole\?\.\(\)\s*===\s*ctx\.OUTPUT_ROLE_FINAL/);
});

test("phase-46: full immersive parallax loop remains for final-output", () => {
  // Defense-in-depth — the original 4-layer immersive table is still
  // present and unchanged so the SSR tab keeps painting the full
  // starfield. Catches an accidental future cleanup that strips the
  // "non-lightweight" path.
  assert.match(EFFECT_VISUALS_SRC, /density:\s*98,\s*speed:\s*660/);
  assert.match(EFFECT_VISUALS_SRC, /density:\s*82,\s*speed:\s*470/);
  assert.match(EFFECT_VISUALS_SRC, /density:\s*66,\s*speed:\s*310/);
  assert.match(EFFECT_VISUALS_SRC, /density:\s*46,\s*speed:\s*190/);
});
