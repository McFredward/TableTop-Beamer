---
phase: phase-08
plan: 8-HF4
subsystem: ui
tags: [outside-animations, asset-picker, boomerang, video-playback, regression-hotfix]
requires:
  - phase: phase-08
    provides: Outside animation definitions editor with apply flow from 8-HF3
provides:
  - Restored coded outside renderer path for Coded/Space
  - Type-specific outside asset picker filtering for coded/mp4/gif
  - Stable boomerang mp4 forward-reverse loop lifecycle
affects: [phase-08-plan-8-2, outside-runtime, settings-editor]
tech-stack:
  added: []
  patterns: [typed asset ref normalization, board-scoped boomerang playback state machine]
key-files:
  created:
    - .planning/phases/phase-08/8-HF4-VERIFICATION.md
    - .planning/phases/phase-08/P8-T45-BOOMERANG-REGRESSION.md
  modified:
    - src/app.js
    - .planning/phases/phase-08/TASKS.md
    - .planning/STATE.md
key-decisions:
  - "Normalize outside asset refs by selected assetType to prevent stale type/ref drift"
  - "Run boomerang mp4 playback as explicit forward/reverse phase lifecycle instead of restart seeks"
patterns-established:
  - "Outside picker candidates are derived from assetType, never mixed across coded/mp4/gif"
  - "Outside video playback state is board-scoped and key-scoped for deterministic phase transitions"
requirements-completed: []
duration: 7min
completed: 2026-03-27
---

# Phase 8 Plan 8-HF4: Coded/Picker/Boomerang Regression Hotfix Summary

**Outside animation editor now enforces typed asset sources and runs boomerang mp4 clips as full forward-to-reverse loops without visible restart flicker.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-27T18:18:54Z
- **Completed:** 2026-03-27T18:25:41Z
- **Tasks:** 6
- **Files modified:** 12

## Accomplishments
- Restored `Coded/Space` to deterministic coded renderer key resolution, removing black-frame fallback behavior.
- Implemented strict type-specific asset picker filtering (`coded` keys only, `mp4` only `.mp4`, `gif` only `.gif`) with deterministic type-switch updates.
- Reworked outside mp4 boomerang lifecycle to complete full forward and full reverse phases in repeat without abrupt restart jumps.
- Added HF4 verification evidence and synchronized phase/global planning trackers to unblock Plan 8-2.

## Task Commits

1. **Task 41: Coded/Space restore** - `6e8f737` (fix)
2. **Task 42: coded-only picker options** - `62e7d62` (fix)
3. **Task 43: mp4/gif picker filtering** - `46f2f27` (fix)
4. **Task 44: type-switch determinism hardening** - `4685317` (fix)
5. **Task 45: boomerang full-cycle lifecycle** - `83c9d9b` (fix)
6. **Task 46: verification + artifact sync** - `34257c5` (docs)

## Files Created/Modified
- `src/app.js` - coded asset normalization, typed picker candidate resolution, deterministic type/ref normalization, boomerang state-machine playback.
- `.planning/phases/phase-08/8-HF4-VERIFICATION.md` - HF4 acceptance verification report.
- `.planning/phases/phase-08/P8-T45-BOOMERANG-REGRESSION.md` - boomerang lifecycle regression evidence.
- `.planning/phases/phase-08/{TASKS,PLAN,BACKLOG,EXECUTE,ACCEPTANCE,RISKS}.md` - HF4 completion + evidence synchronization.
- `.planning/{STATE,ROADMAP,CURRENT_PHASE}.md` - global tracking updates for HF4 completion and next-plan readiness.

## Decisions Made
- Asset refs are now normalized against `assetType` both in draft sync and apply collection, preventing stale invalid combinations from reappearing after panel sync.
- Boomerang mp4 playback uses explicit phase transitions (`forward` native playback, `reverse` timeline walkback) to satisfy full-cycle behavior without boundary flicker.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reverse-only mp4 timeline was not deterministic**
- **Found during:** Task 45 (Boomerang playback state machine)
- **Issue:** Reverse direction path reused short timeline mapping and could jump/restart visibly.
- **Fix:** Added deterministic reverse timeline mapping plus board/key-scoped playback phase state.
- **Files modified:** `src/app.js`
- **Verification:** `node --check src/app.js`, HF4 boomerang regression checklist
- **Committed in:** `83c9d9b`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bugfix was required to meet HF4 boomerang acceptance criteria; no scope creep beyond planned hotfix behavior.

## Issues Encountered
- None beyond the planned HF4 regression scope.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None.

## Next Phase Readiness
- Plan 8-HF4 P0 gates are closed and evidence is synchronized.
- Plan 8-2 is unblocked for the next hardening wave.

## Self-Check: PASSED
- FOUND: `.planning/phases/phase-08/8-HF4-SUMMARY.md`
- FOUND: `.planning/phases/phase-08/8-HF4-VERIFICATION.md`
- FOUND: `.planning/phases/phase-08/P8-T45-BOOMERANG-REGRESSION.md`
- FOUND commits: `6e8f737`, `62e7d62`, `46f2f27`, `4685317`, `83c9d9b`, `34257c5`
