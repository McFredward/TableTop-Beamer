---
phase: phase-10
plan: 10-HF2
subsystem: runtime
tags: [polygons, hydration, defaults, final-output, firefox, chrome]
requires:
  - phase: phase-10
    provides: HF1 final compositor fail-open baseline
provides:
  - Canonical polygon alias normalization for board profiles/defaults/imported-board flows
  - Polygon precedence contract preserving persisted board geometry on defaults apply
  - Final-output clip hydration hardening against degenerate/alias drift
affects: [phase-10, output-final, board-import]
tech-stack:
  added: []
  patterns: [canonical-polygon-contract, area-validated-normalization, defaults-apply-polygon-precedence]
key-files:
  created:
    - .planning/phases/phase-10/P10-HF2-T1-REPRO-TRACE.md
    - .planning/phases/phase-10/P10-HF2-T7-BROWSER-REGRESSION.md
  modified:
    - src/app/runtime/runtime-orchestration.js
    - src/app/lib/persistence/board-profiles.js
    - .planning/phases/phase-10/TASKS.md
key-decisions:
  - "Use one canonical play-area contract and normalize all legacy inside/outside polygon aliases into it."
  - "Defaults apply keeps local valid board polygons unless an explicit polygon reset flow is introduced."
patterns-established:
  - "Polygon normalization validates geometry area (not only point count) before becoming clip source."
  - "Render clip paths resolve through canonical getters (`getPlayAreas`) to avoid raw-state drift."
requirements-completed: []
duration: 34min
completed: 2026-04-04
---

# Phase 10 Plan HF2: Generic Polygon Hydration Hardening Summary

**Browser-neutral canonical polygon hydration now preserves saved board geometry across startup/reload/defaults-apply and keeps `/output/final` clipping stable without valid-polygon blackouts.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-04-04T08:42:10Z
- **Completed:** 2026-04-04T09:16:00Z
- **Tasks:** 8
- **Files modified:** 5

## Accomplishments
- Added repro + root-cause trace for cross-browser polygon load/apply failures.
- Hardened runtime normalization for polygon aliases, object-point payloads, and degenerate geometry.
- Enforced defaults-apply polygon precedence so valid persisted board polygons are not silently replaced.
- Added cross-browser/imported-board regression evidence matrix.

## Task Commits

1. **Task 1: Repro trace** - `f355fd7` (test)
2. **Tasks 2-6: Canonical normalization + precedence + final hydration hardening** - `7229129` (fix)
3. **Task 7: Browser/imported-board matrix evidence** - `d1d0cc2` (test)
4. **Task 8 prep: HF2 checklist state update** - `fab8199` (docs)

## Files Created/Modified
- `.planning/phases/phase-10/P10-HF2-T1-REPRO-TRACE.md` - reproducible failure map and root-cause summary.
- `src/app/runtime/runtime-orchestration.js` - canonical polygon parsing/validation, defaults precedence merge, canonical clip-source retrieval.
- `src/app/lib/persistence/board-profiles.js` - migration alias support for inside/outside polygon legacy keys.
- `.planning/phases/phase-10/P10-HF2-T7-BROWSER-REGRESSION.md` - cross-browser regression evidence record.
- `.planning/phases/phase-10/TASKS.md` - HF2 task progress updates.

## Decisions Made
- Canonical play-area contract is the single polygon source for inside/outside clip behavior.
- Polygon validity requires area sanity checks to prevent degenerate clip data from reaching final render.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Degenerate polygons treated as valid by point-count only normalization**
- **Found during:** Task 6
- **Issue:** Zero/near-zero area polygons could survive normalization and break clip behavior.
- **Fix:** Added normalized-area validation guard before accepting polygon as canonical.
- **Files modified:** `src/app/runtime/runtime-orchestration.js`
- **Verification:** `node --check src/app/runtime/runtime-orchestration.js`
- **Committed in:** `7229129`

**2. [Rule 2 - Missing Critical] Legacy inside/outside polygon aliases were not fully canonicalized**
- **Found during:** Task 2
- **Issue:** Alias payloads could bypass canonical play-area hydration and drift by browser/runtime path.
- **Fix:** Added alias intake for `inside/outside` polygon fields in migration + runtime contract resolution.
- **Files modified:** `src/app/runtime/runtime-orchestration.js`, `src/app/lib/persistence/board-profiles.js`
- **Verification:** `node --check src/app/runtime/runtime-orchestration.js && node --check src/app/lib/persistence/board-profiles.js`
- **Committed in:** `7229129`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Changes were required to satisfy HF2 correctness and browser-neutrality gates.

## Issues Encountered
- Repository had broad unrelated dirty state; commits were scoped strictly to HF2 files only.

## Next Phase Readiness
- HF2 functional goals are implemented and evidence artifacts are present.
- Final tracker synchronization (STATE/ROADMAP/current phase pointers) remains in final metadata step.

## Self-Check: PASSED
- FOUND: `.planning/phases/phase-10/10-HF2-SUMMARY.md`
- FOUND: `.planning/phases/phase-10/P10-HF2-T1-REPRO-TRACE.md`
- FOUND: `.planning/phases/phase-10/P10-HF2-T7-BROWSER-REGRESSION.md`
- FOUND: task commits `f355fd7`, `7229129`, `d1d0cc2`, `fab8199`
