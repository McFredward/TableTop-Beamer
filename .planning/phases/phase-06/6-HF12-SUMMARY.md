---
phase: phase-06
plan: 6-HF12
subsystem: runtime
tags: [clusters, running-list, fanout, regression, room-target]
requires:
  - phase: phase-06
    provides: HF11 cluster lifecycle and sync hardening baseline
provides:
  - Canonical single-entry CLUSTER running projection
  - Deterministic cluster controller fanout under sync and stagger modes
  - Run-context-safe cluster stop/edit propagation with room-path non-regression
affects: [phase-06-6-3, running-list, cluster-runtime, operator-flow]
tech-stack:
  added: []
  patterns:
    - Cluster-controller projection hides linked member ROOM rows in operator running list
    - Cluster renderer can fall back to controller member metadata when snapshot ordering is controller-first
key-files:
  created:
    - .planning/phases/phase-06/P6-T86-ROOM-TARGET-REGRESSION.md
    - .planning/phases/phase-06/P6-T87-REGRESSION.md
  modified:
    - src/app.js
    - .planning/phases/phase-06/TASKS.md
    - .planning/phases/phase-06/PLAN.md
    - .planning/phases/phase-06/ACCEPTANCE.md
    - .planning/phases/phase-06/BACKLOG.md
    - .planning/phases/phase-06/RISKS.md
    - .planning/phases/phase-06/EXECUTE.md
    - .planning/CURRENT_PHASE.md
key-decisions:
  - "Running list should expose cluster triggers through one canonical CLUSTER controller row while member ROOM runs stay runtime-internal."
  - "Cluster controller rendering must remain effective even when live snapshots briefly arrive without linked member rows."
  - "Cluster stop/edit propagation resolves members via merged direct IDs and linked parentClusterRunId context."
patterns-established:
  - "Deterministic running projection: render list view derived from runtime state, not a 1:1 raw dump."
  - "Controller-first resiliency: cluster run stores member room IDs/delays for fallback render continuity."
requirements-completed: []
duration: 3min
completed: 2026-03-26
---

# Phase 6 Plan 6-HF12: Cluster Deterministic Controller Scope Hotfix Summary

**Cluster starts now show exactly one CLUSTER controller row while still animating all cluster member rooms deterministically and preserving room-target behavior.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T19:10:18Z
- **Completed:** 2026-03-26T19:13:03Z
- **Tasks:** 6
- **Files modified:** 10

## Accomplishments
- Enforced single-entry `CLUSTER` projection in the running list (no linked member `ROOM` duplicates for the same cluster trigger).
- Preserved full-member runtime fanout by rendering cluster members from controller context with fallback metadata for controller-first snapshot ordering.
- Hardened cluster stop/edit propagation resolution and documented HF12 combined regression + room-target non-regression evidence.

## Task Commits

1. **Task P6-T83: Running-Dedupe fix** - `4bbdb68` (fix)
2. **Task P6-T84: Runtime-Fanout entkoppeln** - `dbc177c` (fix)
3. **Task P6-T85: Stop/Edit-Semantik haerten** - `e278c0a` (fix)
4. **Task P6-T86: Room-Target-Regression absichern** - `8c1e1de` (test)
5. **Task P6-T87: HF12-Regression dokumentieren** - `1015872` (test)
6. **Task P6-T88: Artefakt-Sync abschliessen** - `f3aa63d` (chore)

## Files Created/Modified
- `src/app.js` - Running-list cluster dedupe projection, cluster fallback member rendering, and merged member-resolution for cluster propagation.
- `.planning/phases/phase-06/P6-T86-ROOM-TARGET-REGRESSION.md` - Dedicated room-target non-regression evidence for HF12.
- `.planning/phases/phase-06/P6-T87-REGRESSION.md` - Combined HF12 matrix evidence.
- `.planning/phases/phase-06/{TASKS,PLAN,ACCEPTANCE,BACKLOG,RISKS,EXECUTE}.md` - HF12 completion and gate-closure updates.
- `.planning/CURRENT_PHASE.md` - Next-plan pointer advanced to 6-3.

## Decisions Made
- Keep cluster member runs available for runtime/audio internals, but expose only canonical controller rows in operator running UI.
- Allow cluster controller to render members via persisted `memberRoomIds`/`memberStartDelays` when linked member entries are temporarily absent.
- Resolve cluster stop/edit member targeting through union of explicit `memberAnimationIds` and linked `parentClusterRunId` rows.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HF12 P0 gate is closed with PASS evidence in `P6-T87-REGRESSION.md` and `P6-T86-ROOM-TARGET-REGRESSION.md`.
- Plan 6-3 hardening workflow can proceed.

## Self-Check: PASSED

- Verified summary file exists at `.planning/phases/phase-06/6-HF12-SUMMARY.md`.
- Verified all HF12 task commit hashes exist in git history (`4bbdb68`, `dbc177c`, `e278c0a`, `8c1e1de`, `1015872`, `f3aa63d`).
