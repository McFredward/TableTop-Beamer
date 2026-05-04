// Phase 28 Wave 3 — asset-delete-modal (B4 replace window.confirm with showConfirm modal).
// Source-pattern tests on the asset-picker IIFE, asserting the two delete handlers
// (animation + sound) reuse window.TT_BEAMER_RUNTIME_MODAL.showConfirm with
// danger:true instead of window.confirm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ASSET_PICKER_PATH =
  "src/app/runtime/ui/animation-editor-edit-pane-asset-picker.js";

test("scaffold: asset-delete-modal.test.mjs loads", () => {
  // Trivial liveness check so the file always has at least one passing assertion.
  assert.equal(1, 1);
});

test("B4-D09: delete path does not call window.confirm", async () => {
  // The asset-picker MUST NOT contain any window.confirm( call. Comments
  // (lines starting with //) are filtered before the bare-confirm( check so
  // the leading file header documenting the migration may still mention it.
  const src = await readFile(ASSET_PICKER_PATH, "utf8");
  const windowConfirmCalls = (src.match(/window\.confirm\(/g) || []).length;
  assert.equal(
    windowConfirmCalls,
    0,
    "delete path must use TT_BEAMER_RUNTIME_MODAL.showConfirm — no window.confirm( calls allowed",
  );
  // Bare `confirm(` (without window. prefix) — only check non-comment lines.
  const codeOnly = src
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
  const bareConfirmCalls = (
    codeOnly.match(/(^|[^.\w])confirm\(/g) || []
  ).length;
  assert.equal(
    bareConfirmCalls,
    0,
    "no bare confirm( call should remain in code (comments are exempt)",
  );
});

test("B4-D10: delete path reuses TT_BEAMER_RUNTIME_MODAL.showConfirm with danger:true", async () => {
  // The two delete handlers (animation + sound) must each invoke
  // window.TT_BEAMER_RUNTIME_MODAL.showConfirm({ ..., danger: true }) and
  // await its boolean. Source-pattern is sufficient — DOM bootstrap not needed.
  const src = await readFile(ASSET_PICKER_PATH, "utf8");
  const showConfirmCalls = (
    src.match(/window\.TT_BEAMER_RUNTIME_MODAL\.showConfirm\(/g) || []
  ).length;
  assert.equal(
    showConfirmCalls,
    2,
    "exactly two showConfirm calls — one per delete handler (animation + sound)",
  );
  // Both invocation blocks must contain `danger: true`.
  const dangerBlocks = (
    src.match(/showConfirm\(\{[\s\S]*?danger:\s*true[\s\S]*?\}\)/g) || []
  ).length;
  assert.equal(
    dangerBlocks,
    2,
    "both showConfirm calls must use danger: true (destructive accent)",
  );
  // Both blocks must include the cancelLabel "Cancel" + confirmLabel "Delete".
  assert.ok(
    (src.match(/confirmLabel:\s*"Delete"/g) || []).length >= 2,
    "both delete handlers must use confirmLabel: \"Delete\"",
  );
  assert.ok(
    (src.match(/cancelLabel:\s*"Cancel"/g) || []).length >= 2,
    "both delete handlers must use cancelLabel: \"Cancel\"",
  );
});
