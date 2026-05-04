---
phase: 28-cross-cutting-ux-state-polish
plan: 02
subsystem: dashboard-save-gate-board-switch
tags: [save-gate, board-switch, align-mode-dirty, dashboard-helper, phase-27-w5-parallel]

# Dependency graph
requires:
  - phase: 28-cross-cutting-ux-state-polish
    plan: 00
    provides: Wave-0 test scaffold dashboard-hint-copy.test.mjs with locked B2-D05 skip name converted to live source-pattern test by this plan.
  - phase: 28-cross-cutting-ux-state-polish
    plan: 01
    provides: B1 contract — switchBoard's silent auto-load helper does NOT trigger alignModeDirtyOnOutput. Plan 28-02 inherits the contract; auto-load remains gate-free.
  - phase: 27-multi-device-align-mode
    provides: W5 alignModeDirtyOnOutput broadcast + 10s grace timer + dashboard helper syncAlignModeDirtyDashboardState. This plan extends the helper IN PLACE — single helper, no duplication.
provides:
  - HINT_COPY_FULL_BOARD_SWITCH constant (locked long-form ending in "…to switch board.").
  - syncAlignModeDirtyDashboardState extended to also gate #board-select dropdown via disabled+title+aria-describedby.
  - Four-site switchBoard guard: dropdown change handler, editAnimation, activateImportedBoard, post-delete fallback.
  - #board-select[disabled] CSS rule mirroring #align-mode-button[disabled] visuals.
affects: [28-03, 28-04, 28-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase 27 W5 dashboard-helper extension pattern: extend syncAlignModeDirtyDashboardState in place (D-05) — single helper covers both gated surfaces."
    - "Locked-copy contract: HINT_COPY_CHIP shared between align-toggle and board-switch gates, but long-form differs by trailing clause (\"…there first.\" vs \"…there first to switch board.\")."
    - "Four-call-site enumeration locked in CONTEXT.md D-06 + RESEARCH.md A6 — board-select dropdown / editAnimation / activateImportedBoard / post-delete fallback. No fifth callsite (animation-editor's own #anim-editor-board-select does NOT call switchBoard per documented comment)."
    - "Toast literal identical across all four sites — easy grep verification + structural test in Wave-2."

key-files:
  created:
    - .planning/phases/phase-28/28-02-SUMMARY.md
  modified:
    - src/app/runtime/viewport/runtime-stage-viewport.js
    - src/app/runtime/wire/runtime-wire-navigation-binders.js
    - src/app/runtime/animation/runtime-lifecycle-live-editor.js
    - src/app/runtime/live-sync/runtime-zone-loader.js
    - src/styles.css
    - test/dashboard-hint-copy.test.mjs

key-decisions:
  - "HINT_COPY_FULL_BOARD_SWITCH defined as a function-scoped const inside syncAlignModeDirtyDashboardState (matches sibling constants HINT_COPY_FULL and HINT_COPY_CHIP)."
  - "#board-select gate placed AFTER the existing align-button gating block (sequential read, no early return interrupts the new block)."
  - "Toast literal identical across all four sites — exact string \"Status: unsaved align changes on /output/ — save or discard there first to switch board.\""
  - "Dropdown rollback (boardSelect.value = state.boardId) is dropdown-only; the other three call sites have no stateful select to rebound."
  - "Post-delete fallback is gated, not bypassed — when /output/ is dirty during a current-board delete, state.boardId stays at the deleted target until the user resolves /output/. Per plan locked decision: this rare branch is acceptable."
  - "Tests are pure-Node source-pattern grep on runtime-stage-viewport.js (no jsdom, no DOM bootstrap). The B2-D05 contract is heavy on locked copy; source-pattern is the cleanest cross-test assertion."

requirements-completed: [B2]

# Metrics
duration: 2min
completed: 2026-05-04
---

# Phase 28 Plan 02: B2 Board-Switch Save-Gate Summary

**B2 wired end-to-end: when `state.alignModeDirtyOnOutput === true`, all four board-switch entry points (dropdown change handler, editAnimation, activateImportedBoard, post-delete fallback) short-circuit with the locked toast `"Status: unsaved align changes on /output/ — save or discard there first to switch board."` and the dashboard's `#board-select` dropdown is disabled with cursor:not-allowed + opacity:0.55. The single helper `syncAlignModeDirtyDashboardState()` is extended in place — no duplicate dashboard-side dirty-watching code. The Phase 27 W5 align-toggle gate continues to work unchanged.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-04T15:20:42Z
- **Completed:** 2026-05-04T15:22:43Z
- **Tasks:** 2
- **Files modified:** 6 (4 source + 1 CSS + 1 test)
- **Files created:** 1 (this SUMMARY)

## Accomplishments

- B2-D04 implemented: gate is server-authoritative — inherits Phase 27 W5 `state.alignModeDirtyOnOutput` flag + 10s grace timer + `applyGlobalDefaultsPayloadToState`-driven dashboard sync. No new server endpoint, no new WebSocket channel, no duplicate state slot.
- B2-D05 implemented: hint copy is grep-verifiable. The locked `HINT_COPY_FULL_BOARD_SWITCH = "Unsaved align changes on /output/ — save or discard there first to switch board."` constant lives inside `syncAlignModeDirtyDashboardState`. The shared `HINT_COPY_CHIP = "Unsaved on /output/"` continues to drive the chip across both gated surfaces.
- B2-D06 implemented: all four board-switch entry points enumerated in RESEARCH §Assumptions A6 are now gated.
- `#board-select[disabled]` CSS rule added — mirrors `#align-mode-button[disabled]` visuals (cursor:not-allowed + opacity:0.55) for visual consistency.
- Wave-0 dashboard-hint-copy.test.mjs converted from `test.skip` to a live source-pattern assertion. Test count moved from 12 pass / 11 skip → 13 pass / 10 skip.

## Exact Insertion Sites (per <output> spec)

### Four switchBoard guards — exact line numbers

| # | File | Function | Guard placement | Rollback? | Approx line (post-edit) |
|---|------|----------|-----------------|-----------|--------------------------|
| 1 | `src/app/runtime/wire/runtime-wire-navigation-binders.js` | `boardSelect.addEventListener("change", ...)` | After arrow-function entry, BEFORE `switchBoard()` call | YES — `boardSelect.value = state.boardId` | ~41–55 |
| 2 | `src/app/runtime/animation/runtime-lifecycle-live-editor.js` | `editAnimation` | After `if (!animation || ...) return;` (animation-validity gate), BEFORE `switchBoard(animation.boardId, ...)` | NO — entry point is a click on a running-animation list item | ~455–464 |
| 3 | `src/app/runtime/live-sync/runtime-zone-loader.js` | `activateImportedBoard` | After `if (!targetId || ...) return false;` (catalog-membership gate), BEFORE `ctx.switchBoard(targetId, ...)` | NO — non-stateful entry; returns false | ~196–205 |
| 4 | `src/app/runtime/live-sync/runtime-zone-loader.js` | post-delete fallback (inside `deleteBoardFromServer`) | Inside `if (fallback) { ... }` branch, the guard chooses between toast vs `ctx.switchBoard(fallback, ...)` | NO — `state.boardId` is left at the deleted target until /output/ resolves | ~325–337 |

### Locked toast literal (exact spelling)

```
Status: unsaved align changes on /output/ — save or discard there first to switch board.
```

This literal appears exactly **4 times** in the four guarded files (1 per site). Verification:

```
$ grep -c "save or discard there first to switch board." \
    src/app/runtime/wire/runtime-wire-navigation-binders.js \
    src/app/runtime/animation/runtime-lifecycle-live-editor.js \
    src/app/runtime/live-sync/runtime-zone-loader.js
src/app/runtime/wire/runtime-wire-navigation-binders.js:1
src/app/runtime/animation/runtime-lifecycle-live-editor.js:1
src/app/runtime/live-sync/runtime-zone-loader.js:2
```

(zone-loader has 2 because it hosts both activateImportedBoard and the post-delete fallback.)

### Helper-extension confirmation

`syncAlignModeDirtyDashboardState` in `src/app/runtime/viewport/runtime-stage-viewport.js` (lines 48–94) is the SINGLE dashboard-side helper. It now contains:

- `HINT_COPY_FULL` — Phase 27 W5 align-toggle long-form (preserved verbatim).
- `HINT_COPY_CHIP` — short amber-chip text (preserved, shared between gates).
- `HINT_COPY_FULL_BOARD_SWITCH` — Phase 28 B2 board-switch long-form (NEW).
- Existing align-button gating block (preserved verbatim).
- NEW board-select gating block (added after the align-button block).

There is NO second helper, NO duplicated dirty-watching code, NO new ctx wiring required (the helper already reads `ctx.state.alignModeDirtyOnOutput` and now also reads `ctx.boardSelect ?? document.getElementById("board-select")`).

## Test Suite Output

Run command: `node --test "test/**/*.test.mjs"`

```
ℹ tests 23
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 10
ℹ todo 0
```

Wave-1 baseline (post-Plan-28-01): `# pass 12 / # skipped 11`. Post Wave-2 Plan-28-02: `# pass 13 / # skipped 10` — exactly one newly-active test as expected (the formerly-skipped B2-D05).

| Test name | File | Status |
|-----------|------|--------|
| `B2-D05: hint copy locked — short chip is "Unsaved on /output/" and tooltip is the full sentence` | dashboard-hint-copy.test.mjs | ACTIVE PASS |

The test asserts (a) HINT_COPY_FULL_BOARD_SWITCH literal, (b) HINT_COPY_CHIP literal, (c) Phase 27 W5 HINT_COPY_FULL literal preserved, (d) the literal call shape `boardSelect.setAttribute("title", HINT_COPY_FULL_BOARD_SWITCH)`. All four `assert.ok(src.includes(...))` checks pass.

## Task Commits

1. **Task 1: Extend syncAlignModeDirtyDashboardState to gate #board-select + add CSS + activate B2-D05 test (TDD)** — `569971f` (feat)
2. **Task 2: Guard all four switchBoard call sites with alignModeDirtyOnOutput** — `7685f53` (feat)

## Acceptance Criteria Evidence (per Plan)

### Task 1

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `grep -F "HINT_COPY_FULL_BOARD_SWITCH" src/app/runtime/viewport/runtime-stage-viewport.js` | ≥2 lines | 2 (definition + usage) |
| `grep -F "Unsaved align changes on /output/ — save or discard there first to switch board." src/app/runtime/viewport/runtime-stage-viewport.js` | 1 line | 1 |
| `grep -F "Unsaved changes on /output/ — save or discard there first." src/app/runtime/viewport/runtime-stage-viewport.js` | 1 line (W5 preserved) | 1 |
| `grep -F 'boardSelect.setAttribute("title", HINT_COPY_FULL_BOARD_SWITCH)' src/app/runtime/viewport/runtime-stage-viewport.js` | 1 line | 1 |
| `grep -F "#board-select[disabled]" src/styles.css` | 1 line | 1 |
| `node --test test/dashboard-hint-copy.test.mjs` exit 0; B2-D05 active+passing | yes | yes |

### Task 2

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `grep -c alignModeDirtyOnOutput` runtime-wire-navigation-binders.js | ≥1 | 1 |
| `grep -c alignModeDirtyOnOutput` runtime-lifecycle-live-editor.js | ≥1 | 1 |
| `grep -c alignModeDirtyOnOutput` runtime-zone-loader.js | ≥2 | 2 |
| Toast literal across 3 guarded files (sum) | ≥4 | 4 (1+1+2) |
| `grep -F "boardSelect.value = state.boardId"` runtime-wire-navigation-binders.js | 1 | 1 |
| `grep -F "switchBoard(animation.boardId"` runtime-lifecycle-live-editor.js | 1 | 1 |
| `node --test test/` exits 0 | yes | yes |
| Combined toast+helper grep (helper + 4 sites) | ≥5 | 5 (1+1+1+2) |

### Plan-level <verification> block

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `node --test test/` exits 0 with B2-D05 real+passing | yes | yes |
| `grep -rn alignModeDirtyOnOutput` across 3 guard files | ≥4 | 4 (1+1+2) |
| `grep -c "save or discard there first to switch board"` across 4 files (helper + 3 guards) | ≥5 | 5 (1+1+1+2) |

## Decisions Made

- **Tests are source-pattern (textual), not DOM-bootstrap.** Per Plan SUB-STEP C of Task 1: "textual-pattern test on source." The B2-D05 contract is locked-copy-heavy; grep on source asserts the contract without needing a jsdom shim. The Wave-0 scaffold's import (`import * as helpers from "./_helpers.mjs"`) was retired in this conversion since the test uses only `node:fs/promises` and `node:path`.
- **HINT_COPY_FULL_BOARD_SWITCH placement.** Defined as a function-scoped const inside the helper (mirrors HINT_COPY_FULL/HINT_COPY_CHIP). Not exported because nothing else needs it — the four guard sites use the toast literal directly (semantically distinct: helper builds a tooltip; guards emit a toast — same sentence content, different roles).
- **Toast literal duplicated, not constant-extracted.** The four guard sites all use the literal string verbatim. A shared constant would require a new export from a runtime module that all four files import; given the lock-copy contract is grep-verified per file, the duplication is the lowest-friction approach and is consistent with how Phase 27 W5 handled HINT_COPY_FULL.

## Deviations from Plan

None — plan executed exactly as written. Zero auto-fixes, zero authentication gates, zero deviations.

## Issues Encountered

- None. Both tasks landed on the first attempt; the TDD RED→GREEN cycle for Task 1 confirmed the test was correctly authored before the source change.

## User Setup Required

None — no external service configuration, no migrations, no env vars. The change is purely client-side: an extended dashboard-helper + four guarded JS call sites + one CSS rule + one converted test.

## Manual Verification (per 28-VALIDATION.md §Manual-Only Verifications §B2)

Per the plan's `<verification>` block, the manual smoke matrix is owned by the Phase Verifier. Steps:

1. Open the dashboard + the Pi /output/ side-by-side.
2. On /output/: enter align mode + drag any line — verify the Phase 27 W5 align-toggle hint chip appears AND the dashboard's `#board-select` is now disabled with cursor:not-allowed + the locked tooltip on hover.
3. Try to switch board via the dashboard dropdown — verify (a) the dropdown bounces back to the active board, (b) the trigger-feedback toast shows the locked Status sentence, (c) `state.boardId` is unchanged.
4. Try to invoke editAnimation by clicking a different board's running animation — verify the toast appears + no board switch occurs.
5. (Hard to reproduce manually) Try the post-import activateImportedBoard path: import a new board JSON while /output/ is dirty — verify the toast appears + the imported board is added to the catalog but NOT switched to.
6. (Hard to reproduce) Try the post-delete fallback: delete the current board while /output/ is dirty — verify the toast appears.
7. On /output/: discard or save the align-mode changes. Verify the dashboard `#board-select` re-enables (no disabled attr, no title attr, no aria-describedby).
8. Verify Phase 27 W5 align-toggle gate continues to work unchanged.

## Next Phase Readiness

- Wave 3 (Plan 28-03 — B3 asset-upload/delete dirty-flag hygiene) can proceed. Plan 28-03 is independent of B2's gate logic.
- The B2 contract is locked-in via:
  - 4 alignModeDirtyOnOutput grep counts (1 nav + 1 editor + 2 zone-loader)
  - 4 toast-literal grep counts (1 nav + 1 editor + 2 zone-loader)
  - 1 helper extension grep (2 HINT_COPY_FULL_BOARD_SWITCH lines + 1 boardSelect.setAttribute call)
  - 1 CSS grep (#board-select[disabled])
  - 1 active source-pattern test
- Future refactor regression: any drift in the locked toast literal will fail the test grep + the source-pattern assertion immediately.

## Self-Check: PASSED

- FOUND: src/app/runtime/viewport/runtime-stage-viewport.js (HINT_COPY_FULL_BOARD_SWITCH x2 + boardSelect.setAttribute call)
- FOUND: src/styles.css (#board-select[disabled])
- FOUND: src/app/runtime/wire/runtime-wire-navigation-binders.js (alignModeDirtyOnOutput x1 + rollback + toast)
- FOUND: src/app/runtime/animation/runtime-lifecycle-live-editor.js (alignModeDirtyOnOutput x1 + toast + switchBoard kept)
- FOUND: src/app/runtime/live-sync/runtime-zone-loader.js (alignModeDirtyOnOutput x2 + toast x2)
- FOUND: test/dashboard-hint-copy.test.mjs (B2-D05 ACTIVE PASS, 0 skips)
- FOUND commit: 569971f (Task 1 — feat helper+CSS+test)
- FOUND commit: 7685f53 (Task 2 — feat four-site guard)
- TEST suite: 23 tests, 13 pass, 0 fail, 10 skipped (Wave-2 baseline-+1 active matches expected)

---
*Phase: 28-cross-cutting-ux-state-polish*
*Completed: 2026-05-04*
