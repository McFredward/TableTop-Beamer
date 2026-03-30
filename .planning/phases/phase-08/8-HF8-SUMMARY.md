---
phase: phase-08
plan: HF8
subsystem: outside-runtime-ui
tags: [outside-mp4, conditional-visibility, apply-only, regression]
requires:
  - phase: phase-08
    provides: HF7 outside/inside definition editor baseline
provides:
  - Restored stable outside mp4 non-boomerang playback path
  - Context-sensitive visibility for outside mode/direction controls
  - Apply-only animation editor UX without redundant resource-apply CTAs
affects: [phase-08, plan-8-2, outside-editor, outside-runtime]
tech-stack:
  added: []
  patterns: [deterministic mp4 forward-loop playback, context-gated settings controls, draft-then-apply commit UX]
key-files:
  created:
    - .planning/phases/phase-08/P8-T65-OUTSIDE-MP4-ROOT-CAUSE.md
    - .planning/phases/phase-08/P8-T66-MP4-NON-REGRESSION.md
    - .planning/phases/phase-08/8-HF8-VERIFICATION.md
  modified:
    - src/app.js
    - index.html
    - .planning/phases/phase-08/TASKS.md
    - .planning/phases/phase-08/EXECUTE.md
    - .planning/phases/phase-08/ACCEPTANCE.md
    - .planning/phases/phase-08/BACKLOG.md
    - .planning/phases/phase-08/PLAN.md
    - .planning/phases/phase-08/RISKS.md
key-decisions:
  - "Outside mp4 runtime is explicitly non-boomerang: always forward loop with rate control and paused->play guard."
  - "Outside mode/direction controls are only applicable for coded outside-space and are hidden/disabled elsewhere."
  - "Resource picker remains input-only; Apply changes is the single explicit commit CTA for editor updates."
patterns-established:
  - "Outside settings can enforce applicability rules in both UI visibility and apply-time normalization."
requirements-completed: []
duration: 6min
completed: 2026-03-30
---

# Phase 8 Plan HF8: Outside MP4 + Conditional Visibility + Apply-Only UX Cleanup Summary

**Outside mp4 playback is restored with a stable non-boomerang runtime path, while outside mode/direction controls are now context-gated and editor commits remain Apply-only.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-30T20:33:13Z
- **Completed:** 2026-03-30T20:39:17Z
- **Tasks:** 6
- **Files modified:** 11

## Accomplishments
- Restored outside mp4 rendering by removing reverse-seek/state coupling and enforcing deterministic forward loop playback.
- Added explicit root-cause and non-regression evidence for mp4 restore with gif/coded guard coverage.
- Implemented contextual visibility/enablement for `outside mode` and `outside direction` (shown only for coded `outside-space`).
- Removed redundant `Use selected resource asset` CTAs from inside/outside editors and retained `Apply changes` as the sole commit path.
- Completed HF8 verification and synchronized phase-08 planning artifacts.

## Task Commits

1. **Task P8-T65: Outside mp4 root-cause + restore** - `caee59e` (fix)
2. **Task P8-T66: MP4 non-regression guard evidence** - `7f278ab` (test)
3. **Task P8-T67..P8-T68: Conditional visibility + non-applicable hide guard** - `a314083` (fix)
4. **Task P8-T69: Apply-only UX cleanup** - `26b7400` (fix)
5. **Task P8-T70: Verification + artifact sync** - `55c39a1` (chore)

## Decisions Made
- Outside mp4 is treated as forward-loop media playback; reverse-direction orchestration is not part of non-boomerang mp4 runtime behavior.
- Applicability of outside mode/direction is enforced in UI visibility and in apply normalization to prevent invalid persisted combinations.
- Resource picker selection is passive; only `Apply changes` commits editor draft values.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered
None.

## Known Stubs
None.

## Self-Check: PASSED
- FOUND: `.planning/phases/phase-08/8-HF8-SUMMARY.md`
- FOUND: `.planning/phases/phase-08/8-HF8-VERIFICATION.md`
- FOUND: `.planning/phases/phase-08/P8-T65-OUTSIDE-MP4-ROOT-CAUSE.md`
- FOUND: `.planning/phases/phase-08/P8-T66-MP4-NON-REGRESSION.md`
- FOUND commits: `caee59e`, `7f278ab`, `a314083`, `26b7400`, `55c39a1`
