---
phase: phase-06
plan: 6-HF7
subsystem: ui
tags: [polygon-editor, selection-lifecycle, tombstones, global-defaults, persistence]
requires:
  - phase: phase-06
    provides: HF6 vertex lifecycle stabilization and persistent room selection base
provides:
  - Edge-bubble lifecycle parity with vertex selection
  - Board-scoped room deletion tombstones with defaults-merge precedence
  - HF7 combined regression evidence and artifact sync
affects: [phase-06, plan-6-3, polygon-editing, room-persistence]
tech-stack:
  added: []
  patterns: [persistent selection source-of-truth, tombstone-over-default merge guard]
key-files:
  created:
    - .planning/phases/phase-06/P6-T59-REGRESSION.md
  modified:
    - src/app.js
    - src/app/domain/rooms.js
    - src/app/state/runtime-state.js
    - src/app/persistence/board-profiles.js
    - .planning/phases/phase-06/TASKS.md
    - .planning/phases/phase-06/PLAN.md
    - .planning/phases/phase-06/ACCEPTANCE.md
    - .planning/phases/phase-06/BACKLOG.md
    - .planning/phases/phase-06/RISKS.md
    - .planning/phases/phase-06/EXECUTE.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
key-decisions:
  - "Edge bubble pointerdown must reassert persistent room selection and suppress same-cycle deselect races."
  - "Room deletion persistence uses board-scoped `deletedRoomIds` tombstones and applies `tombstone > defaults` during catalog/defaults merges."
patterns-established:
  - "Editor parity: edge-click lifecycle must match vertex-click lifecycle."
  - "Deletion safety: room catalogs are always filtered by tombstones before apply/export."
requirements-completed: []
duration: 5m
completed: 2026-03-26
---

# Phase 6 Plan 6-HF7: Edge-Bubble Arbitration + Deletion Tombstone Persistence Hotfix Summary

**Edge bubble editing now keeps persistent room selection for direct insert-vertex flow, while deleted rooms persist as tombstones that block defaults-based rehydrate after reload/restart/apply.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-26T14:35:54Z
- **Completed:** 2026-03-26T14:41:01Z
- **Tasks:** 6
- **Files modified:** 13

## Accomplishments
- Fixed edge-bubble pointer arbitration so edge clicks preserve persistent selected-room lifecycle and same-cycle deselect races are blocked.
- Hardened insert-vertex flow by resolving insert context from persistent selection without requiring dropdown/room reselect.
- Introduced board-scoped deletion tombstones (`deletedRoomIds`) and applied tombstone precedence to room catalog apply + global defaults export merge.
- Added HF7 combined regression evidence (`P6-T59-REGRESSION.md`) and synchronized phase/global planning artifacts for HF7 closure.

## Task Commits

1. **Task 55: Edge-pointer arbitration fix** - `0bb74e1` (fix)
2. **Task 56: Edge-selection lifecycle stabilization** - `b6b4a5b` (fix)
3. **Task 57: Room-delete tombstone semantics** - `d93de78` (fix)
4. **Task 58: Defaults merge/rehydrate tombstone guard** - `8f5c869` (fix)
5. **Task 59: HF7 regression documentation** - `00f49fe` (test)
6. **Task 60: Artifact synchronization** - `3c6a07c` (chore)

## Files Created/Modified
- `src/app.js` - edge-click lifecycle parity, insert flow room resolution, tombstone state/persistence/export guards.
- `src/app/domain/rooms.js` - room catalog application now filters by tombstoned room IDs.
- `src/app/state/runtime-state.js` - added runtime storage for board-scoped room tombstones.
- `src/app/persistence/board-profiles.js` - migration alias support for `deletedRoomIds`/`roomTombstones`.
- `.planning/phases/phase-06/P6-T59-REGRESSION.md` - HF7 regression matrix (edge lifecycle + deletion persistence + guards).
- `.planning/phases/phase-06/{TASKS,PLAN,ACCEPTANCE,BACKLOG,RISKS,EXECUTE}.md` - HF7 completion status and evidence synchronization.
- `.planning/{STATE,ROADMAP}.md` - global tracking updated to HF7-complete and 6-3 ready.

## Decisions Made
- Persisted room deletion as explicit board tombstones instead of implicit absence in room catalogs.
- Enforced merge precedence `tombstone > defaults` for global-defaults export so deleted default rooms cannot reappear on apply.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## Known Stubs
None.

## Next Phase Readiness
- Plan 6-HF7 gate is closed with PASS evidence (`P6-T59-REGRESSION.md`).
- Plan 6-3 hardening can proceed without open HF7 blockers.

## Self-Check: PASSED
- FOUND: `.planning/phases/phase-06/6-HF7-SUMMARY.md`
- FOUND commits: `0bb74e1`, `b6b4a5b`, `d93de78`, `8f5c869`, `00f49fe`, `3c6a07c`
