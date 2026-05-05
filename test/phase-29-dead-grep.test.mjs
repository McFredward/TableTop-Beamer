// Phase 29 Wave 0 — DEAD-field grep scaffold.
//
// Asserts that legacy / DEAD persistence-field names have ZERO hits in the
// `src/` tree once Wave 2 (29-02..29-04) lands. Every substantive assertion is
// gated behind `t.skip(...)` so the suite stays GREEN until those waves remove
// the gate and start enforcing the assertion.
//
// When a Wave 2 plan removes the skip gate, this test MUST FAIL until the
// production code that still references the DEAD field is removed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

// ---------------------------------------------------------------------------
// Liveness — guarantees the file always contributes one passing assertion to
// the suite, so suite-count regressions are easy to spot.
// ---------------------------------------------------------------------------
test("scaffold: phase-29-dead-grep loads", () => assert.equal(1, 1));

// ---------------------------------------------------------------------------
// Helper — recursive grep across .js / .mjs files under `dir`.
// Skips node_modules and dotfile-prefixed entries.
// Returns a list of `path:line: text` hits.
// ---------------------------------------------------------------------------
function grepRecursive(dir, pattern, hits = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      grepRecursive(full, pattern, hits);
      continue;
    }
    if (!entry.name.endsWith(".js") && !entry.name.endsWith(".mjs")) continue;
    const text = readFileSync(full, "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) hits.push(`${full}:${i + 1}: ${lines[i].trim()}`);
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Future-gated assertions — one per DEAD / REDUNDANT field. Skip-gate references
// the OWNING wave/plan that will remove the gate.
// ---------------------------------------------------------------------------

test("W2: hiddenRoomNames has zero src/ hits", () => {
  const hits = grepRecursive(join(REPO_ROOT, "src"), /\bhiddenRoomNames\b/);
  assert.equal(hits.length, 0, `expected 0 hits, found:\n${hits.join("\n")}`);
});

test("W2: roomStateProfiles has zero src/ hits (excluding state-accessor module which is removed in 29-03)", () => {
  const hits = grepRecursive(join(REPO_ROOT, "src"), /\broomStateProfiles?\b/);
  assert.equal(hits.length, 0, `expected 0 hits, found:\n${hits.join("\n")}`);
});

test("W2: animationSoundMap has zero src/ hits", () => {
  const hits = grepRecursive(join(REPO_ROOT, "src"), /\banimationSoundMap\b/);
  assert.equal(hits.length, 0, `expected 0 hits, found:\n${hits.join("\n")}`);
});

test("W2: playAreaPolygon has zero src/ hits (legacy single-polygon path)", { skip: "Wave 2 (29-04) not landed yet" }, () => {
  const hits = grepRecursive(join(REPO_ROOT, "src"), /\bplayAreaPolygon\b/);
  assert.equal(hits.length, 0, `expected 0 hits, found:\n${hits.join("\n")}`);
});

test("W2: deletedRoomIds has zero src/ hits (if Wave 1 audit confirms REDUNDANT)", { skip: "Wave 2 (29-04) gated on audit verdict" }, () => {
  const hits = grepRecursive(join(REPO_ROOT, "src"), /\bdeletedRoomIds\b/);
  assert.equal(hits.length, 0, `expected 0 hits, found:\n${hits.join("\n")}`);
});
