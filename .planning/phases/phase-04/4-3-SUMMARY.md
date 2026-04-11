---
phase: phase-04
plan: 4-3
subsystem: ui-runtime
tags: [desktop-layout, running-list, preview-decommission, hotfix]
requires:
  - phase: phase-04
    provides: room-generalization baseline from plan 4-2
provides:
  - desktop running-list containment with dedicated scroll
  - preview staging fully removed from UI/runtime/state/flow
  - acceptance-oriented regression evidence for the hotfix package
affects: [dashboard-ui, runtime-state, api-server, phase-04-plan-4-4]
tech-stack:
  added: []
  patterns: [layout-containment-guard, previewless-live-trigger-flow]
key-files:
  created:
    - .planning/phases/phase-04/P4-T21-HOTFIX-REGRESSION.md
  modified:
    - src/styles.css
    - src/app.js
    - src/app/lib/state/runtime-state.js
    - index.html
    - server.mjs
    - .planning/phases/phase-04/TASKS.md
key-decisions:
  - "Running overview is no longer sticky on desktop; instead the list is height-capped and scroll-contained to prevent control blocking."
  - "Preview staging is decommissioned end-to-end (UI, runtime state, event flows, and obsolete `/api/live/*` server paths)."
patterns-established:
  - "Layout regression now asserts running-list overflow + max-height constraints for desktop containment."
  - "Operator dashboard runs preview-free: trigger/edit/stop act directly on live runtime instances."
requirements-completed: []
duration: 4min
completed: 2026-03-25
---

# Phase 4 Plan 3: Pflicht-Feedback Hotfix Summary

**Desktop controls remain reachable under running-load, and preview staging has been removed completely from UI, runtime flow, and server live-paths.**

## Performance
- **Duration:** 4 min
- **Started:** 2026-03-25T15:52:49Z
- **Completed:** 2026-03-25T15:56:54Z
- **Tasks:** 5
- **Files modified:** 7

## Accomplishments
- Constrained the desktop running list with a dedicated internal scroll area and layout containment, preventing growth-driven control blockage.
- Hardened runtime layout regression checks so desktop containment is actively validated (position, overflow, max-height).
- Removed preview staging UI and all related runtime/state/flow paths, including obsolete `/api/live/*` server endpoints.
- Added acceptance-mapped regression evidence for containment + preview decommission parity.

## Task Commits
1. **P4-T17 (Desktop Running-Liste begrenzen)** - `dbe1704` (fix)
2. **P4-T18 (Desktop Layout Guard)** - `ef97862` (fix)
3. **P4-T19 (Preview-UI entfernen)** - `269c770` (fix)
4. **P4-T20 (Preview-Runtime/State/Flow entfernen)** - `0d88d8e` (fix)
5. **P4-T21 (Regression dokumentieren)** - `c8ad4b1` (test)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `gsd-tools state/*` automation was incompatible with current STATE/ROADMAP format**
- **Found during:** post-task state update
- **Issue:** `state advance-plan`, `state update-progress`, `state record-metric`, `state add-decision`, `state record-session` and `roadmap update-plan-progress` returned parse/not-found errors against existing planning file structure.
- **Fix:** Applied equivalent lifecycle/decision/progress updates manually in `.planning/STATE.md` and `.planning/ROADMAP.md`, then committed via metadata docs commit.
- **Files modified:** `.planning/STATE.md`, `.planning/ROADMAP.md`
- **Commit:** `974e74e`

## Auth Gates
None.

## Issues Encountered
- Repository contained many unrelated pre-existing modifications; plan-4-3 commits were isolated strictly to task-relevant files.

## Known Stubs
- None.

## Self-Check: PASSED
- FOUND: `.planning/phases/phase-04/4-3-SUMMARY.md`
- FOUND: `dbe1704`
- FOUND: `ef97862`
- FOUND: `269c770`
- FOUND: `0d88d8e`
- FOUND: `c8ad4b1`
