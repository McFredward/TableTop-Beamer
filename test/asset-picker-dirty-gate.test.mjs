// Phase 28 Wave 3 — asset-picker-dirty-gate (B3 dirty-fires-only-on-effective-change semantics).
// Source-pattern tests on the asset-picker IIFE. Plan 28-04 will convert the two
// hash-related TODO assertions into live hash-compare assertions when the server
// returns `payload.hash`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ASSET_PICKER_PATH =
  "src/app/runtime/ui/animation-editor-edit-pane-asset-picker.js";

test("scaffold: asset-picker-dirty-gate.test.mjs loads", () => {
  // Trivial liveness check so the file always has at least one passing assertion.
  assert.equal(1, 1);
});

test("B3-D07.1: upload of asset NOT in current selection fires no dirty", async () => {
  // The contract is enforced as a guard around the two patchAnimation upload calls
  // (one in the animation picker, one in the sound picker). When the uploaded
  // path does NOT match the current def's assetRef / soundAssetRef, the
  // patchAnimation call is short-circuited and dirty does not fire.
  const src = await readFile(ASSET_PICKER_PATH, "utf8");
  // Animation upload guard
  assert.ok(
    src.includes("if (currentAssetRef && uploadedPath === currentAssetRef)"),
    "animation upload must be gated by selection-match (currentAssetRef === uploadedPath)",
  );
  // Sound upload guard (symmetric)
  assert.ok(
    src.includes("if (currentSoundRef && uploadedSoundPath === currentSoundRef)"),
    "sound upload must be gated by selection-match (currentSoundRef === uploadedSoundPath)",
  );
});

test("B3-D07.2: upload with same content-hash fires no dirty (TODO marker for Plan 28-04)", async () => {
  // Plan 28-03 only lands selection-match gating (D-07.1) + the existing
  // delete-side guard (D-08). The hash-diff branch (D-07.3) is deferred to
  // Plan 28-04 — until then, both upload guards carry a TODO marker referring
  // forward to Plan 28-04. This test guarantees the marker exists in BOTH
  // pickers so Plan 28-04 has a precise grep target.
  const src = await readFile(ASSET_PICKER_PATH, "utf8");
  assert.ok(
    src.includes("TODO(28-04): hash-diff gate per D-07.3"),
    "TODO marker for Plan 28-04 hash gate must be present",
  );
  const occurrences = (
    src.match(/TODO\(28-04\): hash-diff gate per D-07\.3/g) || []
  ).length;
  assert.equal(
    occurrences,
    2,
    "exactly two TODO markers — one per picker (animation + sound)",
  );
  // Hash-tracker maps must be in place so Plan 28-04 can wire them to payload.hash.
  assert.ok(
    src.includes("_lastSeenAssetHashByPath"),
    "_lastSeenAssetHashByPath tracker must exist",
  );
  assert.ok(
    src.includes("_lastSeenSoundHashByPath"),
    "_lastSeenSoundHashByPath tracker must exist",
  );
});

test("B3-D07.3: upload with different content-hash fires dirty=true (structural — patchAnimation is INSIDE the guard)", async () => {
  // Until Plan 28-04 lands payload.hash, the structural contract is: the
  // patchAnimation call for the upload path lives INSIDE the selection-match
  // guard block (i.e. between the `if (currentAssetRef && ...)` and the
  // `// else: pure-library upload` comment). When 28-04 lands, it will replace
  // the unconditional patchAnimation call with `if (hash differs) { ... }`
  // and update this test to verify the hash compare instead.
  const src = await readFile(ASSET_PICKER_PATH, "utf8");
  // Animation upload — patchAnimation must be inside the selection-match block.
  const animUploadStart = src.indexOf(
    "if (currentAssetRef && uploadedPath === currentAssetRef)",
  );
  const animUploadEnd = src.indexOf("// else: pure-library upload");
  assert.ok(animUploadStart > 0, "animation upload guard must exist");
  assert.ok(
    animUploadEnd > animUploadStart,
    "animation upload guard must be followed by the // else: pure-library upload comment",
  );
  const animUploadBlock = src.slice(animUploadStart, animUploadEnd);
  assert.ok(
    animUploadBlock.includes(
      "patchAnimation(scope, boardId, def.id, { assetRef: payload.path })",
    ),
    "animation patchAnimation must be inside the selection-match block",
  );
  // Sound upload — patchAnimation must be inside the symmetric guard block.
  const soundUploadStart = src.indexOf(
    "if (currentSoundRef && uploadedSoundPath === currentSoundRef)",
  );
  const soundUploadEnd = src.indexOf("// else: pure-library sound upload");
  assert.ok(soundUploadStart > 0, "sound upload guard must exist");
  assert.ok(
    soundUploadEnd > soundUploadStart,
    "sound upload guard must be followed by the // else: pure-library sound upload comment",
  );
  const soundUploadBlock = src.slice(soundUploadStart, soundUploadEnd);
  assert.ok(
    soundUploadBlock.includes(
      "patchAnimation(scope, boardId, def.id, { soundAssetRef: payload.path })",
    ),
    "sound patchAnimation must be inside the symmetric selection-match block",
  );
});

test("B3-D08: library-only delete fires no dirty (existing animation-delete guard preserved)", async () => {
  // The animation-delete handler already wraps patchAnimation in
  // `if (String(def.assetRef || "").trim() === current) { patchAnimation(...) }`.
  // Plan 28-03 keeps this guard untouched. The test verifies (a) the guard
  // text is still present, and (b) the patchAnimation call sits within the
  // guard block (not outside it).
  const src = await readFile(ASSET_PICKER_PATH, "utf8");
  const delGuard = 'if (String(def.assetRef || "").trim() === current)';
  assert.ok(
    src.includes(delGuard),
    "animation-delete selection-match guard must be preserved verbatim",
  );
  const guardIdx = src.indexOf(delGuard);
  const patchIdx = src.indexOf(
    'patchAnimation(scope, boardId, def.id, { assetRef: "" })',
    guardIdx,
  );
  assert.ok(
    patchIdx > guardIdx && patchIdx - guardIdx < 200,
    "animation-delete patchAnimation must be inside the selection-match guard block",
  );
  // Sound-delete also has its existing guard preserved.
  const soundDelGuard = 'if (String(def.soundAssetRef || "").trim() === current)';
  assert.ok(
    src.includes(soundDelGuard),
    "sound-delete selection-match guard must be preserved verbatim",
  );
});
