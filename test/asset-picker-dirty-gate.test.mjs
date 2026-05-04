// Phase 28 Wave 3 — asset-picker-dirty-gate (B3 dirty-fires-only-on-effective-change semantics).
// Plan 28-04 upgraded the B3-D07.2 + B3-D07.3 hash-TODO assertions to LIVE
// hash-diff behaviour assertions: the source now wires `_lastSeenAssetHashByPath`
// (and the sound-side counterpart) to the server-returned `payload.hash`.
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

test("B3-D07.2: upload with same content-hash fires no dirty (live hash-diff gate)", async () => {
  // Plan 28-04 upgraded this from a TODO-marker assertion to a real behavior
  // contract: the upload handler reads `payload.hash` (now returned by the
  // server) and compares against `_lastSeenAssetHashByPath` / `_lastSeenSoundHashByPath`.
  // Same hash → patchAnimation is skipped (no dirty fire).
  const src = await readFile(ASSET_PICKER_PATH, "utf8");

  // The TODO(28-04) markers MUST be gone now that the gate is live.
  assert.equal(
    (src.match(/TODO\(28-04\)/g) || []).length,
    0,
    "TODO(28-04) markers must be removed once Plan 28-04 lands the live hash-diff gate",
  );

  // Animation-side hash-diff guard.
  assert.ok(
    src.includes("const prevHash = _lastSeenAssetHashByPath.get(uploadedPath)"),
    "animation upload must read previous hash from _lastSeenAssetHashByPath",
  );
  assert.ok(
    src.includes("if (newHash && prevHash !== newHash)"),
    "animation upload must compare prev vs new hash to gate dirty fire",
  );
  assert.ok(
    src.includes("_lastSeenAssetHashByPath.set(uploadedPath, newHash)"),
    "animation upload must update tracker map after firing patchAnimation",
  );

  // Sound-side symmetric guard.
  assert.ok(
    src.includes("const prevSoundHash = _lastSeenSoundHashByPath.get(uploadedSoundPath)"),
    "sound upload must read previous hash from _lastSeenSoundHashByPath",
  );
  assert.ok(
    src.includes("if (newSoundHash && prevSoundHash !== newSoundHash)"),
    "sound upload must compare prev vs new hash to gate dirty fire",
  );
  assert.ok(
    src.includes("_lastSeenSoundHashByPath.set(uploadedSoundPath, newSoundHash)"),
    "sound upload must update tracker map after firing patchAnimation",
  );
});

test("B3-D07.3: upload with different content-hash fires dirty=true (patchAnimation is INSIDE the hash-diff branch)", async () => {
  // Live behaviour contract (Plan 28-04 upgrade): the patchAnimation call lives
  // INSIDE the `if (newHash && prevHash !== newHash)` branch — so re-uploading
  // identical bytes (same hash) does NOT fire patchAnimation, while re-uploading
  // different bytes (different hash) DOES.
  const src = await readFile(ASSET_PICKER_PATH, "utf8");

  // Animation: extract the hash-diff guard block and verify patchAnimation is inside it.
  const animGuardStart = src.indexOf("if (newHash && prevHash !== newHash)");
  assert.ok(animGuardStart > 0, "animation hash-diff guard must exist");
  // The block extends to the matching close brace; for a structural assertion
  // it's enough to slice forward to the next `else if` or `// else:` marker.
  const animGuardEnd = src.indexOf("else if (!newHash)", animGuardStart);
  assert.ok(animGuardEnd > animGuardStart, "animation guard must have an else-if fallback");
  const animGuardBlock = src.slice(animGuardStart, animGuardEnd);
  assert.ok(
    animGuardBlock.includes("_lastSeenAssetHashByPath.set(uploadedPath, newHash)"),
    "animation tracker update must live INSIDE the hash-diff branch",
  );
  assert.ok(
    animGuardBlock.includes(
      "patchAnimation(scope, boardId, def.id, { assetRef: payload.path })",
    ),
    "animation patchAnimation must live INSIDE the hash-diff branch",
  );

  // Sound: same shape.
  const soundGuardStart = src.indexOf("if (newSoundHash && prevSoundHash !== newSoundHash)");
  assert.ok(soundGuardStart > 0, "sound hash-diff guard must exist");
  const soundGuardEnd = src.indexOf("else if (!newSoundHash)", soundGuardStart);
  assert.ok(soundGuardEnd > soundGuardStart, "sound guard must have an else-if fallback");
  const soundGuardBlock = src.slice(soundGuardStart, soundGuardEnd);
  assert.ok(
    soundGuardBlock.includes("_lastSeenSoundHashByPath.set(uploadedSoundPath, newSoundHash)"),
    "sound tracker update must live INSIDE the hash-diff branch",
  );
  assert.ok(
    soundGuardBlock.includes(
      "patchAnimation(scope, boardId, def.id, { soundAssetRef: payload.path })",
    ),
    "sound patchAnimation must live INSIDE the hash-diff branch",
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
