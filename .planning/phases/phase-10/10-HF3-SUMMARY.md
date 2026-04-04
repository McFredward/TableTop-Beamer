---
phase: phase-10
plan: 10-HF3
subsystem: runtime
tags: [polygons, snapshot-hydration, final-output, firefox, mobile, imported-boards]
requires:
  - phase: phase-10
    provides: HF1/HF2 polygon and compositor hardening baseline
provides:
  - Deterministic RED diagnostics for Lockdown A/defaults/final-output symptom set
  - Generic canonical polygon snapshot hydration across control/final clients
  - FAIL->PASS proof plus imported-board/browser matrix evidence
affects: [phase-10, output-final, live-sync, board-import]
tech-stack:
  added: []
  patterns: [executable-fail-pass-diagnostics, canonical-snapshot-polygon-hydration, control-final-source-parity]
key-files:
  created:
    - src/app/runtime/polygon-contract.js
    - debug/p10-hf3-t1-lockdown-firefox-mobile-repro.mjs
    - debug/p10-hf3-t2-defaults-override-repro.mjs
    - debug/p10-hf3-t3-final-black-rectangle-repro.mjs
    - debug/p10-hf3-t4-lifecycle-diagnostics.mjs
    - debug/p10-hf3-t5-board-switch-final-contract.mjs
    - debug/p10-hf3-t6-canonical-source-selection.mjs
    - debug/p10-hf3-t8-fail-pass-proof.mjs
    - debug/p10-hf3-t9-imported-browser-matrix.mjs
  modified:
    - src/app/runtime/runtime-orchestration.js
    - index.html
    - .planning/phases/phase-10/TASKS.md
    - .planning/phases/phase-10/PLAN.md
    - .planning/phases/phase-10/BACKLOG.md
    - .planning/phases/phase-10/ACCEPTANCE.md
    - .planning/phases/phase-10/RISKS.md
    - .planning/phases/phase-10/EXECUTE.md
    - .planning/CURRENT_PHASE.md
key-decisions:
  - "Use a shared canonical polygon contract helper to hydrate snapshot/runtime polygon maps for both control and final paths."
  - "Treat HF3 closure as test-first: retain deterministic RED traces and prove PASS on the exact same suites."
patterns-established:
  - "Snapshot polygon ownership must hydrate `playAreasByBoard` and `selectedPlayAreaIdByBoard` before final clip/render paths execute."
  - "Browser/imported-board parity evidence is captured as executable matrix artifacts, not static checklists."
requirements-completed: []
duration: 7min
completed: 2026-04-04
---

# Phase 10 Plan HF3: Mandatory Polygon Recovery Wave Summary

**Canonical snapshot polygon hydration now keeps Lockdown/defaults/final-output polygon ownership deterministic across control and final clients, with explicit RED->GREEN proof and imported-board browser-matrix PASS evidence.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-04T09:04:58Z
- **Completed:** 2026-04-04T09:12:06Z
- **Tasks:** 10
- **Files modified:** 36

## Accomplishments
- Implemented six executable RED diagnostics reproducing the exact field symptom set plus lifecycle/source-contract drift.
- Fixed the generic root cause by hydrating canonical polygon maps from runtime snapshots in shared control/final path code.
- Captured explicit FAIL->PASS and imported-board/browser matrix artifacts proving closure for HF3 gates.

## Task Commits

1. **Task 1: Lockdown A failing repro** - `4614b60` (test)
2. **Task 2: Defaults override failing repro** - `2634f6b` (test)
3. **Task 3: Final-output black/fallback failing repro** - `da12dd0` (test)
4. **Task 4: Lifecycle executable diagnostics** - `77c9904` (test)
5. **Task 5: Board-switch final contract diagnostics** - `2797b39` (test)
6. **Task 6: Canonical source-selection diagnostics** - `ca217a0` (test)
7. **Task 7: Generic root-cause fix** - `907cbab` (fix)
8. **Task 8: FAIL->PASS evidence capture** - `ea664b5` (test)
9. **Task 9: Imported-board/browser matrix** - `b8f87bd` (test)
10. **Task 10: Artifact sync** - `7860917` (chore)

## Files Created/Modified
- `src/app/runtime/polygon-contract.js` - shared polygon normalization + snapshot hydration contract used by diagnostics and runtime.
- `src/app/runtime/runtime-orchestration.js` - snapshot apply path now hydrates canonical polygon maps and refreshes selected ship polygons.
- `index.html` - ensures polygon contract helper loads before runtime orchestration.
- `debug/p10-hf3-t*-*.mjs` + `*-output.json` - deterministic repro/diagnostic/matrix evidence artifacts.
- `.planning/phases/phase-10/P10-HF3-*.md` - trace/evidence docs for RED baseline, GREEN proof, matrix, and sync closure.

## Decisions Made
- Snapshot/runtime polygon data is the canonical source for cross-client polygon ownership and must be applied before render contract checks.
- HF3 gate closure requires executable diagnostics with committed RED baselines and GREEN reruns for the same suite IDs.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Repository had broad unrelated dirty state; all task commits were scoped strictly to HF3 files only.

## Next Phase Readiness
- HF3 blocker wave is closed PASS with explicit evidence artifacts.
- Plan 10-1 is now unblocked and ready as the next execution wave.

## Self-Check: PASSED
- FOUND: `.planning/phases/phase-10/10-HF3-SUMMARY.md`
- FOUND: `src/app/runtime/polygon-contract.js`
- FOUND: `debug/p10-hf3-t8-fail-pass-proof-output.json`
- FOUND commits: `4614b60`, `2634f6b`, `da12dd0`, `77c9904`, `2797b39`, `ca217a0`, `907cbab`, `ea664b5`, `b8f87bd`, `7860917`
