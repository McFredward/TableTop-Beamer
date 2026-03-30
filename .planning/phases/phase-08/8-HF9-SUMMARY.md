---
phase: phase-08
plan: 8-HF9
subsystem: ui
tags: [outside-mp4, conditional-rendering, lifecycle, visibility, regression]
requires:
  - phase: phase-08
    provides: HF8 outside-mp4 restore baseline and apply-only editor flow
provides:
  - deterministic outside mp4 start/stop/restart lifecycle hardening
  - strict unmounting for non-applicable outside mode/direction controls
  - regression evidence for mp4 lifecycle and visibility transitions
affects: [phase-08-8-2, outside-runtime, settings-ui]
tech-stack:
  added: []
  patterns: [run-bound mp4 playback re-prime, mount-slot conditional unmounting]
key-files:
  created:
    - .planning/phases/phase-08/P8-T71-OUTSIDE-MP4-LIFECYCLE-ROOT-CAUSE.md
    - .planning/phases/phase-08/P8-T73-MP4-REGRESSION-GUARD.md
    - .planning/phases/phase-08/P8-T74-STRICT-CONDITIONAL-UNMOUNT.md
    - .planning/phases/phase-08/P8-T75-VISIBILITY-TRANSITION-REGRESSION.md
    - .planning/phases/phase-08/8-HF9-VERIFICATION.md
  modified:
    - src/app.js
    - .planning/phases/phase-08/TASKS.md
    - .planning/phases/phase-08/PLAN.md
    - .planning/phases/phase-08/BACKLOG.md
    - .planning/phases/phase-08/ACCEPTANCE.md
    - .planning/phases/phase-08/RISKS.md
    - .planning/phases/phase-08/EXECUTE.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/CURRENT_PHASE.md
key-decisions:
  - "Outside mp4 playback is re-primed by board/run lifecycle (`runId + assetRef`) to eliminate stale restart state."
  - "Outside mode/direction controls use true DOM unmounting for non-applicable contexts instead of disabled-only hiding."
patterns-established:
  - "Visibility transitions are synchronized from normalized draft input on both change and input events."
requirements-completed: []
duration: 4min
completed: 2026-03-30
---

# Phase 8 Plan 8-HF9: Outside MP4 Follow-up + Strict Conditional Unmounting Summary

**Outside mp4 now uses run-bound lifecycle re-prime with draw-readiness guards, while non-applicable outside controls are truly unmounted and transition visibility updates immediately on type/asset changes.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T20:59:08Z
- **Completed:** 2026-03-30T21:02:41Z
- **Tasks:** 6
- **Files modified:** 15

## Accomplishments
- Isolated and documented the remaining outside-mp4 realbetrieb fallback path for start/stop/restart + reload-sensitive flow.
- Hardened outside mp4 runtime playback lifecycle to avoid stale/no-op/frozen-first-frame regressions.
- Enforced strict conditional unmounting and deterministic visibility transitions for outside mode/direction controls.
- Added HF9 regression and verification evidence, then synchronized phase/global planning artifacts.

## Task Commits

1. **Task P8-T71: Root-cause follow-up isolation** - `45e65ea` (fix)
2. **Task P8-T72: Outside mp4 lifecycle hardening** - `283f95c` (fix)
3. **Task P8-T73: MP4 non-regression evidence** - `1de7aa1` (test)
4. **Task P8-T74: Strict conditional unmounting** - `65a2149` (fix)
5. **Task P8-T75: Visibility transition regression hardening** - `098bb00` (fix)
6. **Task P8-T76: Verification + artifact sync** - `fbea9aa` (docs)

## Files Created/Modified
- `src/app.js` - Added outside mp4 lifecycle state + playback re-prime, draw guards, unmount slots, and input/change visibility sync.
- `.planning/phases/phase-08/P8-T71-OUTSIDE-MP4-LIFECYCLE-ROOT-CAUSE.md` - Root-cause reproduction and fix rationale.
- `.planning/phases/phase-08/P8-T73-MP4-REGRESSION-GUARD.md` - Non-regression guard for gif/coded/apply/persistence.
- `.planning/phases/phase-08/P8-T74-STRICT-CONDITIONAL-UNMOUNT.md` - Strict unmount evidence.
- `.planning/phases/phase-08/P8-T75-VISIBILITY-TRANSITION-REGRESSION.md` - Type/asset transition regression evidence.
- `.planning/phases/phase-08/8-HF9-VERIFICATION.md` - HF9 acceptance verification bundle.
- `.planning/phases/phase-08/{PLAN,BACKLOG,TASKS,ACCEPTANCE,RISKS,EXECUTE}.md` - HF9 completion + evidence sync.
- `.planning/{STATE,ROADMAP,CURRENT_PHASE}.md` - Lifecycle/next-plan updates.

## Decisions Made
- Used run-bound playback identity (`runId + assetRef`) to force deterministic mp4 restart behavior without reintroducing boomerang complexity.
- Implemented strict unmount semantics through mount slots to satisfy DOM-level conditional rendering rules.

## Deviations from Plan
None - plan executed exactly as written.

## Known Stubs
None detected in files created/modified for 8-HF9.

## Issues Encountered
- No blocking issues; verification remained `node --check src/app.js` + evidence artifacts.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- HF9 gate is closed with PASS evidence and synchronized planning artifacts.
- Plan 8-2 is unblocked and ready as next execution wave.

## Self-Check: PASSED
- Verified required files exist:
  - `.planning/phases/phase-08/8-HF9-SUMMARY.md`
  - `.planning/phases/phase-08/8-HF9-VERIFICATION.md`
- Verified task commit hashes exist in git history:
  - `45e65ea`, `283f95c`, `1de7aa1`, `65a2149`, `098bb00`, `fbea9aa`
