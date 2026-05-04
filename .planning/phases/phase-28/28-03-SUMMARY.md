---
phase: 28-cross-cutting-ux-state-polish
plan: 03
subsystem: animation-editor-asset-picker-dirty-and-modal
tags: [asset-picker, dirty-gate, save-gate, showConfirm-modal, window-confirm-purge, phase-28-b3, phase-28-b4]

# Dependency graph
requires:
  - phase: 28-cross-cutting-ux-state-polish
    plan: 00
    provides: Wave-0 test scaffolds asset-picker-dirty-gate.test.mjs (4 skips) + asset-delete-modal.test.mjs (2 skips). Plan 28-03 converts all 6 to live source-pattern tests.
  - phase: 28-cross-cutting-ux-state-polish
    plan: 02
    provides: B2 board-switch save-gate. Plan 28-03 is independent of B2's gate logic — they touch disjoint surfaces (B2 = nav binders / zone loader / live-editor; B3+B4 = asset-picker IIFE).
  - phase: 24-modular-runtime-extraction
    provides: animation-editor-edit-pane-asset-picker.js IIFE structure (W3.6-Cextra-edit-pane). Plan 28-03 modifies this file in place — patchAnimation injection contract preserved.
  - phase: 26-h1-or-earlier
    provides: window.TT_BEAMER_RUNTIME_MODAL.showConfirm({ danger:true }) glassmorphism modal already used by board-delete. Plan 28-03 reuses it 1:1 (per D-21 / D-10 reuse rule).
provides:
  - "B3 selection-match upload guard: animation upload patchAnimation is now wrapped in `if (currentAssetRef && uploadedPath === currentAssetRef)` — pure-library uploads no longer fire dirty."
  - "B3 sound-symmetric guard: sound upload patchAnimation wrapped in `if (currentSoundRef && uploadedSoundPath === currentSoundRef)`."
  - "Two IIFE-private hash trackers `_lastSeenAssetHashByPath` and `_lastSeenSoundHashByPath` (Map instances) — staged for Plan 28-04 to wire to server-returned `payload.hash`."
  - "Two `TODO(28-04): hash-diff gate per D-07.3` markers — one per picker — providing precise grep targets for Plan 28-04 to convert into live hash-compare gates."
  - "B4 modal-reuse: both delete handlers replaced `window.confirm()` with `await window.TT_BEAMER_RUNTIME_MODAL.showConfirm({ ..., danger:true })` and abort on `false`."
  - "Six Wave-3 tests now active (B3-D07.1 / B3-D07.2 / B3-D07.3 / B3-D08 / B4-D09 / B4-D10) — six skips converted to passes."
affects: [28-04, 28-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Selection-match upload gating: re-upload of the SAME path the def already references = content-change → patchAnimation; any other upload (no selection-match OR different path) = library-only mutation → no patchAnimation, no dirty."
    - "Forward-pinned TODO marker: `TODO(28-04): hash-diff gate per D-07.3` provides precise grep target for the next plan; tracker Maps are pre-staged so 28-04 only edits the inside of the existing guard block."
    - "Modal reuse 1:1 (D-10 / D-21): no new modal component, no new CSS — both delete handlers call the existing `TT_BEAMER_RUNTIME_MODAL.showConfirm` with the same `{ title, body, confirmLabel: \"Delete\", cancelLabel: \"Cancel\", danger: true }` shape used by board-delete since Phase 26-h1."
    - "Source-pattern tests (no DOM bootstrap): all 6 Wave-3 tests assert against the asset-picker source as text via `node:fs/promises` `readFile`. The IIFE pattern resists direct unit testing without jsdom; source-pattern is the cleanest cross-test contract."

key-files:
  created:
    - .planning/phases/phase-28/28-03-SUMMARY.md
  modified:
    - src/app/runtime/ui/animation-editor-edit-pane-asset-picker.js
    - test/asset-picker-dirty-gate.test.mjs
    - test/asset-delete-modal.test.mjs

key-decisions:
  - "Tests are pure-Node source-pattern grep (not jsdom). The B3+B4 contracts are structural: presence/absence of guard text + showConfirm calls + TODO markers. This matches the Plan-28-02 source-pattern precedent and avoids importing the IIFE (which immediately tries to bind to `document` / `window`)."
  - "Hash-diff branch (D-07.2 + D-07.3) is intentionally a TODO until Plan 28-04 introduces the asset manifest with `payload.hash`. The trackers `_lastSeenAssetHashByPath` / `_lastSeenSoundHashByPath` are pre-staged so 28-04 only needs to (a) consume `payload.hash`, (b) replace the unconditional `patchAnimation(...)` inside the existing guard with `if (tracker.get(uploadedPath) !== payload.hash) { patchAnimation(...); tracker.set(uploadedPath, payload.hash); }`."
  - "Plan 28-03's structural test for B3-D07.3 verifies patchAnimation is INSIDE the selection-match guard block (between the `if (...)` line and the `// else: pure-library upload` comment). Plan 28-04 will keep the test name but flip the assertion to check the hash-compare branch — guard-shape stays stable."
  - "Animation-delete guard preserved verbatim. The existing `if (String(def.assetRef || \"\").trim() === current)` guard at line 159 (post-edit) was already a selection-match check — Plan 28-03 leaves it intact (per Plan SUB-STEP C). Sound-delete guard at line 360 likewise preserved."
  - "Header comment updated minimally. Replaced `window.confirm` reference in the file's leading comment with `window.TT_BEAMER_RUNTIME_MODAL.showConfirm` to keep grep verifications honest (zero `window.confirm` substrings anywhere in the file)."

requirements-completed: [B3, B4]

# Metrics
duration: 3min5s
completed: 2026-05-04
---

# Phase 28 Plan 03: B3 Asset Dirty-Gate + B4 Asset Delete Modal Summary

**B3 + B4 wired together: the animation-editor asset-picker IIFE now (a) gates animation/sound upload `patchAnimation` calls on selection-match (`payload.path === def.assetRef` / `def.soundAssetRef`), (b) preserves the existing animation/sound delete selection-match guards, and (c) replaces both legacy `window.confirm()` calls with the shared `window.TT_BEAMER_RUNTIME_MODAL.showConfirm({ danger:true })` glassmorphism modal already used by board-delete. Two IIFE-private `Map` trackers (`_lastSeenAssetHashByPath` / `_lastSeenSoundHashByPath`) and two `TODO(28-04)` markers are pre-staged for Plan 28-04 to wire the hash-diff branch (D-07.3) once the server-side `payload.hash` lands. Six Wave-0 test scaffolds were converted from `test.skip` to live source-pattern assertions; the suite moved from 13 pass / 10 skip → 19 pass / 4 skip on this plan.**

## Performance

- **Duration:** ~3 min 5 s
- **Started:** 2026-05-04T15:26:26Z
- **Completed:** 2026-05-04T15:29:31Z
- **Tasks:** 2 (both TDD: RED → GREEN)
- **Files modified:** 3 (1 source + 2 tests)
- **Files created:** 1 (this SUMMARY)
- **Commits:** 4 (2 RED + 2 GREEN — one TDD pair per task)

## Accomplishments

- **B3-D07.1 implemented:** Pure-library uploads (no selection-match) do NOT fire dirty. Both animation and sound upload `patchAnimation` calls are wrapped in selection-match guards.
- **B3-D08 implemented (preserved):** Library-only deletes do NOT fire dirty. The pre-existing animation-delete and sound-delete selection-match guards are kept verbatim.
- **B3-D07.2 + B3-D07.3 deferred to Plan 28-04 via TODO markers:** Two `TODO(28-04): hash-diff gate per D-07.3` markers exist in the source (one per picker). Two private Map trackers (`_lastSeenAssetHashByPath` / `_lastSeenSoundHashByPath`) are pre-staged for the next plan to consume.
- **B4-D09 implemented:** Zero `window.confirm` substrings remain anywhere in the asset-picker file (including the leading file-header comment, which was minimally updated to reference `showConfirm`).
- **B4-D10 implemented:** Both delete handlers (animation + sound) call `window.TT_BEAMER_RUNTIME_MODAL.showConfirm({ ..., danger: true })` with `confirmLabel: "Delete"` and `cancelLabel: "Cancel"`. The handler aborts on `false` (Cancel / Esc / click-outside).
- **Six Wave-0 test scaffolds converted to live tests:** B3-D07.1, B3-D07.2, B3-D07.3, B3-D08, B4-D09, B4-D10. Suite count moved from `13 pass / 10 skip` → `19 pass / 4 skip` (delta +6 active, exactly matching the Wave-3 plan target).

## Exact Insertion Sites (per Plan `<output>` spec)

### 1. Upload guards — line numbers (post-edit)

| Picker | Guard line | patchAnimation line (inside guard) | Else-comment line |
|--------|------------|------------------------------------|--------------------|
| Animation upload | `src/app/runtime/ui/animation-editor-edit-pane-asset-picker.js:135` (`if (currentAssetRef && uploadedPath === currentAssetRef)`) | `:144` (`patchAnimation(scope, boardId, def.id, { assetRef: payload.path });`) | `:146–147` (`// else: pure-library upload (no selection match) → no patchAnimation, no dirty.`) |
| Sound upload | `:329` (`if (currentSoundRef && uploadedSoundPath === currentSoundRef)`) | `:333` (`patchAnimation(scope, boardId, def.id, { soundAssetRef: payload.path });`) | `:335–336` (`// else: pure-library sound upload (no selection match) → no patchAnimation, no dirty.`) |

### 2. window.confirm → showConfirm replacements — line numbers (post-edit)

| Handler | Old `window.confirm` (pre-edit) | New `await showConfirm({...})` (post-edit) |
|---------|----------------------------------|---------------------------------------------|
| Animation delete | line 133 (pre-edit) | `:160–166` — `window.TT_BEAMER_RUNTIME_MODAL.showConfirm({ title: \`Delete ${name}?\`, body: "This removes the file from disk and frees its slot.", confirmLabel: "Delete", cancelLabel: "Cancel", danger: true })` |
| Sound delete | line 304 (pre-edit) | `:350–356` — symmetric showConfirm call |

Each handler's `if (!ok) return;` line follows the modal call (animation `:167`, sound `:357`).

### 3. TODO(28-04) markers — line numbers (post-edit)

| Picker | Line | Contents |
|--------|------|----------|
| Animation upload (inside selection-match block) | `:139` | `// TODO(28-04): hash-diff gate per D-07.3 — when Plan 28-04 lands the` (continued through `:142`) |
| Sound upload (inside symmetric guard block) | `:330` | `// TODO(28-04): hash-diff gate per D-07.3 — see _lastSeenSoundHashByPath.` |

Plan 28-04 must update both markers AND the corresponding tests (`B3-D07.2` and `B3-D07.3` in `test/asset-picker-dirty-gate.test.mjs`) once it lands `payload.hash` on the upload response.

### 4. IIFE-private hash trackers — line numbers (post-edit)

| Tracker | Declaration line | Type |
|---------|------------------|------|
| `_lastSeenAssetHashByPath` | `:28` | `new Map()` |
| `_lastSeenSoundHashByPath` | `:29` | `new Map()` |

Both are unused in Plan 28-03 (intentional — Plan 28-04 wires them up).

### 5. Preserved selection-match guards (untouched by Plan 28-03)

| Picker | Guard text | Line (post-edit) |
|--------|-----------|-------------------|
| Animation delete | `if (String(def.assetRef \|\| "").trim() === current) { patchAnimation(scope, boardId, def.id, { assetRef: "" }); }` | `:177` |
| Sound delete | `if (String(def.soundAssetRef \|\| "").trim() === current) { patchAnimation(scope, boardId, def.id, { soundAssetRef: noneValue }); }` | `:368` |

## Test Suite Output

Run command: `node --test "test/**/*.test.mjs"`

```
ℹ tests 23
ℹ suites 0
ℹ pass 19
ℹ fail 0
ℹ cancelled 0
ℹ skipped 4
ℹ todo 0
```

| Test ID | Test | File | Status |
|---------|------|------|--------|
| B3-D07.1 | `upload of asset NOT in current selection fires no dirty` | asset-picker-dirty-gate.test.mjs | ACTIVE PASS (was skip) |
| B3-D07.2 | `upload with same content-hash fires no dirty (TODO marker for Plan 28-04)` | asset-picker-dirty-gate.test.mjs | ACTIVE PASS (was skip; TODO-marker assertion until 28-04) |
| B3-D07.3 | `upload with different content-hash fires dirty=true (structural — patchAnimation is INSIDE the guard)` | asset-picker-dirty-gate.test.mjs | ACTIVE PASS (was skip; structural assertion until 28-04) |
| B3-D08 | `library-only delete fires no dirty (existing animation-delete guard preserved)` | asset-picker-dirty-gate.test.mjs | ACTIVE PASS (was skip) |
| B4-D09 | `delete path does not call window.confirm` | asset-delete-modal.test.mjs | ACTIVE PASS (was skip) |
| B4-D10 | `delete path reuses TT_BEAMER_RUNTIME_MODAL.showConfirm with danger:true` | asset-delete-modal.test.mjs | ACTIVE PASS (was skip) |

The remaining 4 skips are downstream Wave-3+ scaffolds (asset-hash, asset-manifest, plus 2 unrelated subsystems for Plans 28-04 / 28-05). Plan 28-03's wave-3 contract was: "B3-D07.1 / D-08 / B4-D09 / B4-D10 active; B3-D07.2 / D-07.3 active in TODO-marker form" — all four hard-active tests + both TODO-marker tests pass.

## Task Commits

1. **Task 1 RED — failing tests for B3 selection-match + hash-TODO gating** — `1643a17` (test)
2. **Task 1 GREEN — gate asset-picker upload patchAnimation on selection-match (B3)** — `154133c` (feat)
3. **Task 2 RED — failing tests for B4 showConfirm reuse with danger:true** — `1f4d958` (test)
4. **Task 2 GREEN — replace window.confirm with TT_BEAMER_RUNTIME_MODAL.showConfirm (B4)** — `09279f0` (feat)

## Acceptance Criteria Evidence (per Plan)

### Task 1 (B3)

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `grep -c "if (currentAssetRef && uploadedPath === currentAssetRef)"` | 1 | 1 |
| `grep -c "if (currentSoundRef && uploadedSoundPath === currentSoundRef)"` | 1 | 1 |
| `grep -c "TODO(28-04): hash-diff gate per D-07.3"` | 2 | 2 |
| `grep -c "_lastSeenAssetHashByPath"` | ≥1 | 3 (1 declaration + 2 TODO references) |
| `grep -c "_lastSeenSoundHashByPath"` | ≥1 | 2 (1 declaration + 1 TODO reference) |
| Animation-delete guard preserved | 1 line | 1 |
| `node --test test/asset-picker-dirty-gate.test.mjs` exit 0; B3 skips → real | yes | yes (5 pass / 0 skip / 0 fail) |

### Task 2 (B4)

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `grep -c "window.confirm"` | 0 | 0 |
| `grep -c "window.TT_BEAMER_RUNTIME_MODAL.showConfirm({"` | 2 | 2 |
| `grep -c "danger: true,"` | ≥2 | 2 |
| `node --test test/asset-delete-modal.test.mjs` exit 0; B4 skips → real | yes | yes (3 pass / 0 skip / 0 fail) |
| Full suite `node --test "test/**/*.test.mjs"` exits 0 | yes | yes (19 pass / 4 skip / 0 fail) |

### Plan-level `<verification>` block

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `node --test "test/**/*.test.mjs"` exits 0 | yes | yes |
| `grep -c "window.confirm" src/.../asset-picker.js` | 0 | 0 |
| `grep -c "showConfirm({" src/.../asset-picker.js` | 2 | 2 |
| `grep -c "TODO(28-04): hash-diff gate per D-07.3"` | 2 | 2 |

## Decisions Made

- **Tests stay source-pattern (no DOM bootstrap).** Following Plan 28-02's precedent. The asset-picker IIFE binds to `document` / `window` immediately on import, which would require jsdom; source-pattern grep is sufficient for the structural contract and matches how the rest of Phase 28 has been validated.
- **TODO marker phrase is grep-literal.** `TODO(28-04): hash-diff gate per D-07.3` — verbatim across both pickers. Plan 28-04 must search for this exact string to find both edit sites. Plan 28-03's tests assert `(src.match(/TODO\(28-04\): hash-diff gate per D-07\.3/g) || []).length === 2` so any drift in the marker text fails the test immediately.
- **Hash trackers declared but unused.** `_lastSeenAssetHashByPath` / `_lastSeenSoundHashByPath` Maps are present in Plan 28-03 only as a contract for Plan 28-04. They are referenced from the TODO comment text but never `.set()` / `.get()` until 28-04 lands. Test B3-D07.2 asserts both names exist — locking the contract.
- **Header comment minimally updated.** The leading file comment that previously enumerated `window.confirm` as one of the IIFE's `window.*` globals was rewritten to reference `window.TT_BEAMER_RUNTIME_MODAL.showConfirm` instead. This keeps `grep -c "window.confirm"` at 0 across the entire file (including comments) so B4-D09's strict assertion holds.
- **No animation/sound DELETE-side change for Plan 28-03.** The pre-existing `if (String(def.assetRef || "").trim() === current)` and `if (String(def.soundAssetRef || "").trim() === current)` guards were already selection-match checks (per the plan's interfaces section). Plan 28-03 leaves them untouched; B3-D08 is satisfied by their preserved presence. B3 was a partial gate already on the delete side — this plan only finishes the gate on the upload side (and the modal swap on the confirm side).

## Deviations from Plan

None — plan executed exactly as written. Zero auto-fixes (Rules 1-3), zero authentication gates, zero architectural decisions (Rule 4). Both TDD cycles ran cleanly: RED tests authored and committed → minimal source edit → GREEN passed on first run.

## Issues Encountered

None. The plan's interfaces section called out exact line numbers for both upload `patchAnimation` calls and both `window.confirm` calls; matching `Edit` operations with the surrounding context produced unique matches for `replace_all: false` on the first attempt.

## User Setup Required

None — no external service configuration, no migrations, no env vars. The change is purely client-side: an extended IIFE-private hash-tracker contract + two upload guards + two modal reuse calls + one comment-block update + six converted tests.

## Manual Verification (per 28-VALIDATION.md §Manual-Only Verifications §B3 §B4)

Per the plan's `<verification>` block, manual smoke matrix is owned by the Phase Verifier. Steps:

1. Open the dashboard + animation editor; pick any animation def in the edit pane.
2. **B3 upload no-dirty:** with the def's GIF/MP4 unchanged from server, hit Upload + select a NEW filename that no animation references → verify the Apply / Save bar does NOT activate (state.localConfigDirty stays false).
3. **B3 upload dirty (selection match):** select an existing GIF, then Upload a new file with the SAME filename as the current `assetRef` → verify Apply DOES activate (since `payload.path === def.assetRef`, the upload patchAnimation fires). Plan 28-04 will further constrain this to "different hash only".
4. **B3 delete no-dirty:** click Delete on an asset that the currently-selected def does NOT reference (e.g. an unused library entry) → verify Apply does NOT activate.
5. **B3 delete dirty (selection match):** click Delete on the asset the currently-selected def DOES reference → verify Apply activates and `def.assetRef` is cleared.
6. **B4 modal:** click Delete on any asset (animation or sound) → verify the glassmorphism modal appears with title "Delete X?", danger-styled "Delete" button + "Cancel" button, NOT the browser's native `window.confirm` dialog. Confirm Cancel / Esc / click-outside aborts the delete.
7. Smoke same flow on the sound picker (symmetric).

## Forward-pinned 28-04 Wire-up Checklist

When Plan 28-04 lands the server-side `payload.hash`, it must:

1. Locate the two `TODO(28-04): hash-diff gate per D-07.3` markers in `src/app/runtime/ui/animation-editor-edit-pane-asset-picker.js` (lines `:139` + `:330` post-Plan-28-03).
2. Inside each existing selection-match guard block, replace the unconditional `patchAnimation(...)` call with:
   ```js
   const prevHash = _lastSeenAssetHashByPath.get(uploadedPath); // or _lastSeenSoundHashByPath
   if (payload.hash && prevHash !== payload.hash) {
     patchAnimation(scope, boardId, def.id, { assetRef: payload.path }); // or soundAssetRef
   }
   if (payload.hash) _lastSeenAssetHashByPath.set(uploadedPath, payload.hash);
   ```
3. Update `test/asset-picker-dirty-gate.test.mjs`:
   - B3-D07.2: replace TODO-marker assertion with a behavioural assertion that re-uploading with the same hash does NOT fire `patchAnimation`.
   - B3-D07.3: replace structural-block assertion with a behavioural assertion that re-uploading with a different hash DOES fire `patchAnimation`.
4. Remove the `TODO(28-04)` markers from both pickers.

## Next Phase Readiness

- **Plan 28-04 (B5 asset-cache invalidation + manifest)** is unblocked. Plan 28-04's hash-diff requirement landed pre-staged via the IIFE Map trackers and TODO markers — its source-edit footprint in this file is minimal (modify two `if` blocks, one per picker).
- **Plan 28-05 (B6 diagnostic overlay live-sync)** is independent of this file.
- The asset-picker IIFE remains a coherent single-file unit (~370 lines post-edit), well below the W3.6-Cextra-edit-pane ≤800-line acceptance bar.
- Test suite baseline for Wave 3+: `19 pass / 4 skip / 0 fail` (was `13 pass / 10 skip / 0 fail` post-Wave-2).

## Self-Check: PASSED

- FOUND: `src/app/runtime/ui/animation-editor-edit-pane-asset-picker.js` (line counts: 1 currentAssetRef guard + 1 currentSoundRef guard + 2 TODO(28-04) markers + 2 showConfirm calls + 2 `danger: true` + 0 window.confirm)
- FOUND: `test/asset-picker-dirty-gate.test.mjs` (5 tests, 0 skips, 0 fails)
- FOUND: `test/asset-delete-modal.test.mjs` (3 tests, 0 skips, 0 fails)
- FOUND commit: `1643a17` (Task 1 RED — test for B3)
- FOUND commit: `154133c` (Task 1 GREEN — feat B3 selection-match guard)
- FOUND commit: `1f4d958` (Task 2 RED — test for B4)
- FOUND commit: `09279f0` (Task 2 GREEN — feat B4 showConfirm reuse)
- TEST suite: 23 tests, 19 pass, 0 fail, 4 skipped (Wave-3 baseline +6 active matches expected)
- TEST file `node --test test/asset-picker-dirty-gate.test.mjs` exits 0 (5 pass)
- TEST file `node --test test/asset-delete-modal.test.mjs` exits 0 (3 pass)

---
*Phase: 28-cross-cutting-ux-state-polish*
*Completed: 2026-05-04*
