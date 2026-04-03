---
phase: phase-09
plan: 9-HF4
subsystem: runtime
tags: [outside-lifecycle, mp4-playback, sync-determinism, regression]
requires:
  - phase: phase-09
    provides: HF3 runtime baseline (mapping/mixed-media/sync safety)
provides:
  - Outside playback lifecycle is decoupled from room/cluster/global-inside trigger churn
  - Outside MP4 restart is blocked on unrelated room starts
  - Stop outside and clear-all semantics preserved with deterministic reset behavior
affects: [phase-09-plan-9-2, runtime-stability, final-output]
tech-stack:
  added: []
  patterns: [board-scoped outside lifecycle key, outside timeline ownership isolation]
key-files:
  created:
    - .planning/phases/phase-09/P9-HF4-T1-REPRO-TRACE.md
    - .planning/phases/phase-09/P9-HF4-T2-LIFECYCLE-ISOLATION.md
    - .planning/phases/phase-09/P9-HF4-T3-CACHE-RESET-GUARD.md
    - .planning/phases/phase-09/P9-HF4-T4-STOP-CLEAR-NON-REGRESSION.md
    - .planning/phases/phase-09/P9-HF4-T5-SYNC-INVARIANTS.md
    - .planning/phases/phase-09/P9-HF4-T6-REPEATED-ROOM-START-REGRESSION.md
    - .planning/phases/phase-09/9-HF4-VERIFICATION.md
    - debug/p9-hf4-repeated-room-start-regression.mjs
    - debug/p9-hf4-repeated-room-start-regression-output.json
  modified:
    - src/app/runtime/runtime-orchestration.js
    - .planning/phases/phase-09/PLAN.md
    - .planning/phases/phase-09/BACKLOG.md
    - .planning/phases/phase-09/TASKS.md
    - .planning/phases/phase-09/ACCEPTANCE.md
    - .planning/phases/phase-09/EXECUTE.md
    - .planning/phases/phase-09/RISKS.md
key-decisions:
  - "Outside playback lifecycle identity is definition-scoped (outside config), not runtime run-id scoped"
  - "Unrelated room/cluster/global-inside starts are non-reset events for outside playback cursor/cache"
patterns-established:
  - "Outside lifecycle isolation: derive lifecycle key from outside definition + board scope"
  - "Outside non-regression: stop outside and clear-all keep deterministic teardown"
requirements-completed: []
duration: 24min
completed: 2026-04-03
---

# Phase 9 Plan 9-HF4: Outside Lifecycle Independence Summary

**Outside sandstorm playback now uses a stable outside-definition lifecycle key so repeated room starts cannot restart/rewind outside media while stop/clear semantics remain deterministic.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-04-03T22:31:00Z
- **Completed:** 2026-04-03T22:55:00Z
- **Tasks:** 7
- **Files modified:** 17

## Accomplishments
- Isolated outside timeline ownership from room/cluster/global-inside trigger lifecycle churn.
- Re-keyed outside MP4 playback lifecycle to outside config identity, removing run-id coupling.
- Added executable regression evidence proving repeated room starts do not restart outside sandstorm.
- Preserved and verified existing `stop outside` and `clear all` deterministic reset semantics.
- Revalidated deterministic sync invariants and synchronized phase planning artifacts to PASS.

## Task Commits

1. **Task 1: Reproduce/root-cause coupling** - `2e5fc81` (fix)
2. **Task 2: Isolate outside lifecycle ownership** - `88f11b0` (feat)
3. **Task 3: Guard outside cache/reset paths** - `bf0ca58` (fix)
4. **Task 4: Preserve stop/clear semantics** - `c7cffda` (test)
5. **Task 5: Validate sync invariants** - `71fee5b` (test)
6. **Task 6: Repeated room-start regression evidence** - `591a4f9` (test)
7. **Task 7: Artifact synchronization** - `b29e851` (docs)

## Files Created/Modified
- `src/app/runtime/runtime-orchestration.js` - decouples outside timeline + MP4 lifecycle key from volatile runtime run IDs.
- `debug/p9-hf4-repeated-room-start-regression.mjs` - executable regression for no-restart repeated room starts.
- `debug/p9-hf4-repeated-room-start-regression-output.json` - recorded PASS evidence output.
- `.planning/phases/phase-09/P9-HF4-T1-REPRO-TRACE.md` - root-cause trace.
- `.planning/phases/phase-09/P9-HF4-T2-LIFECYCLE-ISOLATION.md` - lifecycle isolation notes.
- `.planning/phases/phase-09/P9-HF4-T3-CACHE-RESET-GUARD.md` - reset guard boundaries.
- `.planning/phases/phase-09/P9-HF4-T4-STOP-CLEAR-NON-REGRESSION.md` - stop/clear non-regression.
- `.planning/phases/phase-09/P9-HF4-T5-SYNC-INVARIANTS.md` - sync invariant validation.
- `.planning/phases/phase-09/P9-HF4-T6-REPEATED-ROOM-START-REGRESSION.md` - repeated-start regression evidence.
- `.planning/phases/phase-09/9-HF4-VERIFICATION.md` - consolidated HF4 verification result.

## Decisions Made
- Outside playback reset authority is now outside-scoped lifecycle/config changes only.
- Room/cluster/global-inside trigger churn is explicitly non-authoritative for outside playback lifecycle.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- HF4 hard gates are PASS with reproducible artifacts.
- Plan 9-2 can proceed without outside-lifecycle coupling blockers.

## Known Stubs
None.

## Self-Check: PASSED
- FOUND: `.planning/phases/phase-09/9-HF4-SUMMARY.md`
- FOUND: task commit hashes (`2e5fc81`, `88f11b0`, `bf0ca58`, `c7cffda`, `71fee5b`, `591a4f9`, `b29e851`)
