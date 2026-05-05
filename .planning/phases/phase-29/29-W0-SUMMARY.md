---
phase: 29-persistence-audit-legacy-cleanup
plan: W0
subsystem: testing
tags: [node-test, scaffolding, skip-gated, persistence-audit]

# Dependency graph
requires:
  - phase: 28-cross-cutting-ux-state-polish
    provides: test/_helpers.mjs (readJsonFile, writeJsonFile, withTempDir) — reused verbatim
provides:
  - Wave-0 test scaffolds for Phase 29 Waves 2-4 verification surface
  - 14 future-gated assertions parked behind t.skip() with owning-wave references
  - 4 new *.test.mjs files + 1 extended (board-profile-fields.test.mjs)
affects: [29-01, 29-02, 29-03, 29-04, 29-05, 29-06]

# Tech tracking
tech-stack:
  added: []  # all infrastructure already shipped in Phase 28 W0
  patterns:
    - "Wave-prefixed skip names (W2/W3/W4) reference owning-plan IDs"
    - "Each skip-gated test contains assert.fail(...) so removing the gate trips the test until the production helper lands"
    - "Recursive grep helper (grepRecursive) inlined in dead-grep test — no shared infra changes"

key-files:
  created:
    - test/phase-29-dead-grep.test.mjs
    - test/phase-29-purge.test.mjs
    - test/phase-29-sound-migration.test.mjs
    - test/bundle-schema.test.mjs
  modified:
    - test/board-profile-fields.test.mjs  # appended one new skip-gated test only

key-decisions:
  - "Reuse existing test/_helpers.mjs as-is — no new helpers needed for Wave 0."
  - "All Phase-29 W0 assertions are skip-gated with assert.fail() bodies so Wave 2-4 plans MUST flip the gate AND wire production code together — un-skipping alone cannot vacuously pass."
  - "Skip-reason format is locked to 'Wave N (29-NN) not landed yet' so the Wave-N executor can grep its owning skip-gates by literal substring."

requirements-completed: []  # Wave 0 has no production-code requirements; verification surface only

# Metrics
duration: ~5min
completed: 2026-05-05
---

# Phase 29 Plan W0: Wave-0 Test Scaffold Summary

**Four new `*.test.mjs` scaffolds plus a one-test extension of the existing `board-profile-fields.test.mjs` establish the Nyquist-compliant verification surface for Phase 29 Waves 2-4. Every substantive assertion is parked behind `t.skip(...)` with the owning wave/plan name in the skip reason; removing a gate trips an `assert.fail(...)` body until the matching production helper is wired in.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-05T12:36Z
- **Completed:** 2026-05-05T12:40Z
- **Tasks:** 3
- **Files created:** 4
- **Files modified:** 1 (append-only)

## Suite Count Before / After

**Before (baseline):**
```
ℹ tests 25
ℹ pass 25
ℹ fail 0
ℹ skipped 0
```

**After Wave 0:**
```
ℹ tests 44
ℹ pass 29
ℹ fail 0
ℹ skipped 15
```

Delta: `+19 tests` (4 new liveness scaffolds + 14 skip-gated future assertions + 1 extension test for board-profile-fields).

Run command: `node --test "test/**/*.test.mjs"` (or bare `node --test` — Node 24 auto-discovers `*.test.mjs`).

## Skip-Gates Parked

- `test/phase-29-dead-grep.test.mjs:W2: hiddenRoomNames has zero src/ hits` — gated on Wave 2 (29-02)
- `test/phase-29-dead-grep.test.mjs:W2: roomStateProfiles has zero src/ hits (excluding state-accessor module which is removed in 29-03)` — gated on Wave 2 (29-03)
- `test/phase-29-dead-grep.test.mjs:W2: animationSoundMap has zero src/ hits` — gated on Wave 2 (29-03)
- `test/phase-29-dead-grep.test.mjs:W2: playAreaPolygon has zero src/ hits (legacy single-polygon path)` — gated on Wave 2 (29-04)
- `test/phase-29-dead-grep.test.mjs:W2: deletedRoomIds has zero src/ hits (if Wave 1 audit confirms REDUNDANT)` — gated on Wave 2 (29-04)
- `test/phase-29-purge.test.mjs:W3: purgeDeadFieldsOnBoot is idempotent` — gated on Wave 3 (29-05)
- `test/phase-29-purge.test.mjs:W3: purgeBoardFile drops DEAD fields, preserves LIVE fields` — gated on Wave 3 (29-05)
- `test/phase-29-purge.test.mjs:W3: purgeBoardFile skips malformed JSON without throwing` — gated on Wave 3 (29-05)
- `test/phase-29-sound-migration.test.mjs:W3: migrateAnimationSoundMap copies map value to empty soundAssetRef` — gated on Wave 3 (29-05)
- `test/phase-29-sound-migration.test.mjs:W3: migrateAnimationSoundMap does NOT overwrite an already-set soundAssetRef` — gated on Wave 3 (29-05)
- `test/phase-29-sound-migration.test.mjs:W3: migrateAnimationSoundMap silently drops orphan map entries` — gated on Wave 3 (29-05)
- `test/bundle-schema.test.mjs:W4: BOARD_PACKAGE_SCHEMA constant bumped to v4` — gated on Wave 4 (29-06)
- `test/bundle-schema.test.mjs:W4: bundle import handler emits SCHEMA_OUTDATED on non-v4 manifest` — gated on Wave 4 (29-06)
- `test/bundle-schema.test.mjs:W4: filterBoardToLiveFields helper exists and is used in export handler` — gated on Wave 4 (29-06)
- `test/board-profile-fields.test.mjs:Phase-29 W2: BOARD_PROFILE_FIELDS contains only LIVE fields` — gated on Wave 2 (29-02..29-04)

Total skip-gated assertions: **15** (5 dead-grep + 3 purge + 3 sound + 3 bundle + 1 board-profile extension).

## Files Created

- `test/phase-29-dead-grep.test.mjs` — 5 skip-gated DEAD-field grep assertions + grepRecursive helper + 1 liveness test.
- `test/phase-29-purge.test.mjs` — 3 skip-gated boot-migration purge tests (idempotence, strip-semantics, malformed-JSON tolerance) + 1 liveness test. Uses `withTempDir` + `writeJsonFile` from `_helpers.mjs`.
- `test/phase-29-sound-migration.test.mjs` — 3 skip-gated D-03 migration tests (copy-when-empty, skip-on-conflict, drop-orphan) + 1 liveness test. Uses `withTempDir` + `writeJsonFile` from `_helpers.mjs`.
- `test/bundle-schema.test.mjs` — 3 skip-gated D-04 tests (v4 constant bump, SCHEMA_OUTDATED on import, filterBoardToLiveFields export filter) + 1 liveness test.

## Files Modified

- `test/board-profile-fields.test.mjs` — append-only: one new skip-gated test (`Phase-29 W2: BOARD_PROFILE_FIELDS contains only LIVE fields`) appended after the existing 3 tests. Pre-existing tests are byte-unchanged. `git diff --text` shows additions only (lines 122-158).

## Task Commits

1. **Task 1: dead-grep scaffold** — `62c6b58` (test: 5 skip-gated grep assertions + grepRecursive helper)
2. **Task 2: purge + sound-migration scaffolds** — `1c7eaa4` (test: 6 skip-gated D-03/Wave-3 helper assertions)
3. **Task 3: bundle-schema scaffold + board-profile-fields extension** — `1897757` (test: 4 skip-gated assertions; board-profile-fields appended only)

## Decisions Made

- **Reuse `_helpers.mjs` verbatim.** Phase 28 W0 already shipped `withTempDir`, `readJsonFile`, `writeJsonFile`, `makeMinimalDocumentStub`. No additional helpers needed for Phase 29 W0.
- **`assert.fail(...)` body inside skip-gated tests.** Each skip-gated test body contains `assert.fail("Wave N helper not exported yet — this test is skip-gated")` (or a stronger fixture-based body for purge Test 1). When the Wave-N plan removes the skip gate, the test MUST FAIL until the production helper lands — un-skipping alone cannot vacuously pass.
- **Skip-reason format locked.** Each skip-gate uses `"Wave N (29-NN) not landed yet"` (or a small variant for the audit-gated `deletedRoomIds` check). Wave-N executors can grep their owning gates by literal substring.
- **`grepRecursive` inlined, not shared.** The recursive grep helper lives only in `phase-29-dead-grep.test.mjs`; no shared infra change. Keeps Wave-0 surface minimal and avoids cross-file coupling.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria met:

- 4 new test files exist at the exact paths specified.
- `board-profile-fields.test.mjs` extension is append-only (verified via `git diff --text` showing only additions).
- `node --test "test/**/*.test.mjs"` exits 0.
- Suite count rises from 25 to 44 (+19), with `pass=29, fail=0, skipped=15`.
- Each skip-gate references the OWNING wave/plan in its skip reason.

## Issues Encountered

- None. Test runner accepted all skip-gates and `assert.fail(...)` bodies cleanly under Node 24.

## User Setup Required

None — `_helpers.mjs` already in place from Phase 28; `node --test` is built into the dev Node 24 runtime.

## Next Wave Readiness

- **Wave 1 (29-01):** Audit doc — does not interact with these scaffolds.
- **Wave 2 (29-02..29-04):** Each Wave-2 plan removes its owning skip-gate(s) from `phase-29-dead-grep.test.mjs` AND `board-profile-fields.test.mjs` (the LIVE-only fields assertion is the union-gate for 29-02..29-04). The `assert.equal(hits.length, 0)` assertions then validate that the production cleanup actually removed every reference.
- **Wave 3 (29-05):** Removes skip-gates in `phase-29-purge.test.mjs` and `phase-29-sound-migration.test.mjs` after exporting `purgeBoardFile` / `migrateAnimationSoundMap` from a testable module. Bodies must be filled in (currently `assert.fail`).
- **Wave 4 (29-06):** Removes skip-gates in `bundle-schema.test.mjs` after the v3→v4 constant bump, SCHEMA_OUTDATED rejection, and `filterBoardToLiveFields` helper land in `server.mjs`.

## Self-Check: PASSED

- FOUND: test/phase-29-dead-grep.test.mjs
- FOUND: test/phase-29-purge.test.mjs
- FOUND: test/phase-29-sound-migration.test.mjs
- FOUND: test/bundle-schema.test.mjs
- FOUND: test/board-profile-fields.test.mjs (extension verified via `git diff --text` showing additions only)
- FOUND commit: 62c6b58 (Task 1: test(29-W0) dead-grep scaffold)
- FOUND commit: 1c7eaa4 (Task 2: test(29-W0) purge + sound-migration scaffolds)
- FOUND commit: 1897757 (Task 3: test(29-W0) bundle-schema scaffold + board-profile-fields extension)
- Suite check: `node --test "test/**/*.test.mjs"` reports `tests 44 / pass 29 / fail 0 / skipped 15` — matches expected Wave-0 baseline.

---
*Phase: 29-persistence-audit-legacy-cleanup*
*Completed: 2026-05-05*
