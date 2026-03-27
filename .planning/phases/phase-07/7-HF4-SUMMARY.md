---
phase: phase-07
plan: 7-HF4
subsystem: ui
tags: [draft-immutability, room-targeting, snapshot-polling, regression, hotfix]
requires:
  - phase: phase-07
    provides: HF3 snapshot-trigger/audio/stagger deterministic polling baseline
provides:
  - Draft-immutable room/cluster start flow (no dropdown/slider/target jumps on start)
  - Control-side snapshot apply guard that prevents runtime `roomDraft` overwrite
  - HF4 regression/non-regression evidence (`debug/p7-hf4-t12/t13/t14-output.json`)
affects: [phase-07-7-2-hardening, dashboard-trigger-flow, multi-client-control]
tech-stack:
  added: []
  patterns: [start-immutability guard, click-only target autofill path, control-draft snapshot decoupling]
key-files:
  created:
    - debug/p7-hf4-t12-output.json
    - debug/p7-hf4-t13-output.json
    - debug/p7-hf4-t14-output.json
  modified:
    - src/app.js
    - debug/p7-t12-sync-regression.mjs
    - debug/p7-t13-non-regression.mjs
    - .planning/phases/phase-07/P7-T12-REGRESSION.md
    - .planning/phases/phase-07/P7-T13-NON-REGRESSION.md
    - .planning/phases/phase-07/P7-T14-LATENCY-REPORT.md
    - .planning/phases/phase-07/{PLAN,BACKLOG,TASKS,ACCEPTANCE,RISKS,EXECUTE}.md
key-decisions:
  - "Start actions are draft-immutable: room/cluster start cannot write draft animation/target/slider fields."
  - "Control clients ignore snapshot runtime.roomDraft merges to prevent polling-based draft UI rewrites."
  - "Room-click autofill remains a dedicated target-only path and is explicitly regression-guarded."
patterns-established:
  - "Start guard pattern: capture immutable draft fields before start and restore on accidental setter drift."
  - "Snapshot decoupling pattern: runtime replication may exist server-side, but control draft UI remains local source-of-truth."
requirements-completed: []
duration: 18min
completed: 2026-03-27
---

# Phase 7 Plan 7-HF4: Draft-UI Immutability on Start Summary

**Room and cluster starts now keep animation/target/slider drafts stable while polling snapshots can no longer overwrite control-side draft selections.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-27T01:07:00Z
- **Completed:** 2026-03-27T01:25:46Z
- **Tasks:** 7/7
- **Files modified:** 15

## Accomplishments
- Removed start-path draft resets so room/cluster start no longer jumps to fallback animation (`Malfunction`) or target (`cluster`).
- Added explicit draft immutability guard around room start and retained room-click target autofill as target-only behavior.
- Decoupled control snapshot apply from `runtime.roomDraft` and refreshed HF4 regression/non-regression evidence artifacts.

## Task Commits

1. **P7-HF4-T1 start path draft-immutable hardening** - `bd3bcf4` (fix)
2. **P7-HF4-T2 draft reducer/setter guard** - `24e8186` (fix)
3. **P7-HF4-T3 room-click-only target autofill guard** - `3ce8487` (fix)
4. **P7-HF4-T4 snapshot/polling draft decoupling** - `748d5a9` (fix)
5. **P7-HF4-T5 regression matrix extension** - `9d176e7` (test)
6. **P7-HF4-T6 non-regression coverage for room-click + cluster stability** - `d64ba6e` (test)
7. **P7-HF4-T7 evidence + artifact sync** - `35218e9` (test)

## Files Created/Modified
- `src/app.js` - Removed start-time draft rewrites, added immutable draft guard, and blocked control snapshot roomDraft back-write.
- `debug/p7-t12-sync-regression.mjs` - Added HF4 code-level regression assertions for start immutability and snapshot guard.
- `debug/p7-t13-non-regression.mjs` - Added HF4 room/cluster draft stability checks and room-click target-only parity checks.
- `debug/p7-hf4-t12-output.json` - HF4 regression output (PASS).
- `debug/p7-hf4-t13-output.json` - HF4 non-regression output (PASS).
- `debug/p7-hf4-t14-output.json` - HF4 latency/report snapshot.
- `.planning/phases/phase-07/{PLAN,BACKLOG,TASKS,ACCEPTANCE,RISKS,EXECUTE}.md` - HF4 gate closure sync and next-wave readiness.

## Decisions Made
- Draft fields (`animation`, `target`, slider values) are immutable across start operations.
- `runtime.roomDraft` remains server-replicated metadata, but control UI ignores it during snapshot apply.
- Room-click autofill stays explicit and target-only; start path never becomes an autofill source.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed false-positive assignment detection in HF4 regression guard**
- **Found during:** Task 5 (regression matrix extension)
- **Issue:** Initial static assignment check incorrectly flagged equality expressions (`===`) as draft mutations.
- **Fix:** Switched regression guard to assignment-specific regex (`=(?!=)`) and marker-based function slicing.
- **Files modified:** `debug/p7-t12-sync-regression.mjs`
- **Verification:** `node debug/p7-t12-sync-regression.mjs` passes with HF4 guard assertions.
- **Committed in:** `9d176e7`

---

**Total deviations:** 1 auto-fixed (Rule 1 bug)
**Impact on plan:** Fix was required to keep HF4 regression evidence reliable; no scope creep.

## Issues Encountered

- Initial HF4 non-regression draft-stability assertion failed during cluster scenario because expected baseline was not updated after intentional cluster draft context change; fixed by introducing explicit cluster baseline expectation in script.

## Auth Gates

None.

## Known Stubs

None found in files modified by this plan.

## Next Phase Readiness

- Plan 7-HF4 gate is closed and Plan 7-2 hardening is unblocked.
- HF4 evidence artifacts are available and aligned with updated acceptance/regression documentation.

## Self-Check: PASSED

- FOUND: `.planning/phases/phase-07/7-HF4-SUMMARY.md`
- FOUND commits: `bd3bcf4`, `24e8186`, `3ce8487`, `748d5a9`, `9d176e7`, `d64ba6e`, `35218e9`
