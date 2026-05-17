---
phase: 48
plan: 02
subsystem: ui
tags: [align-mode, live-sync, dashboard, optimistic-update, frontend-only]

requires:
  - phase: 48-01
    provides: "Wave 1 diagnostic instrumentation + OPERATOR_SKIP decision selecting Direction B blind"
  - phase: 35
    provides: "_lastAlignModeState idempotence gate in syncAlignModePanel — keeps server-echo applies no-op once optimistic update has landed"
  - phase: 27
    provides: "syncAlignModeDirtyDashboardState chip/disable wiring — re-runs synchronously after optimistic state mutation"

provides:
  - "Optimistic dashboard-side mutation of state.alignMode in setAlignMode for the CONTROL role"
  - "Rollback path on emitLiveMutation rejection via previousAlignMode capture"
  - "Removal of all Wave 1 [align-exit-trace] diagnostic console.log blocks"
  - "Source-grep regression rail at test/phase-48-align-exit-smooth.test.mjs pinning the optimistic mutation pattern"

affects: [phase-49-release-prep, future-align-mode-work, dashboard-state-sync]

tech-stack:
  added: []
  patterns:
    - "Optimistic local mutation + server emit + rollback on rejection (paired with existing idempotence gate on server echo)"

key-files:
  created:
    - test/phase-48-align-exit-smooth.test.mjs
  modified:
    - src/app/runtime/viewport/runtime-stage-viewport.js
    - src/app/runtime/live-sync/runtime-live-sync-core.js
  deleted:
    - test/phase-48-align-exit-trace.test.mjs

key-decisions:
  - "Apply Direction B (optimistic state mutation) blind per W1 OPERATOR_SKIP — operator hypothesis matches the fix exactly"
  - "Bypass Task 2 contingent Direction-A hybrid — no W1 trace data, no empirical trigger for the snapRunningLen=0 guard"
  - "Do NOT optimistically force state.alignModeDirtyOnOutput=false — keep server-authoritative dirty semantics intact; syncAlignModePanel re-reads the existing value via syncAlignModeDirtyDashboardState"
  - "Capture previousAlignMode and roll back in .catch on emit failure (safer than pre-fix which left state stuck at the requested-but-unaccepted value)"

patterns-established:
  - "Optimistic-mutation + rollback for dashboard-side state flips that previously waited for the server snapshot echo"

requirements-completed: []

duration: 3min
completed: 2026-05-17
---

# Phase 48 Plan 02: Align-mode exit dashboard hiccup smoothing — Wave 2 Summary

**Optimistic dashboard-side state mutation in setAlignMode collapses the ~2-3 s align-exit hiccup window by flipping state.alignMode + syncing panels synchronously on the click frame, with rollback on emit failure.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-17T15:11:15Z
- **Completed:** 2026-05-17T15:14:23Z
- **Tasks:** 4/5 executed (Task 2 bypassed; Task 5 is a UAT checkpoint, awaiting operator)
- **Files modified:** 2 source + 2 test files (1 new, 1 deleted)

## Accomplishments

- **Optimistic mutation in setAlignMode (CONTROL role / dashboard branch):** state.alignMode flips synchronously inside the click handler before the server emit, paired with synchronous syncAlignModePanel + renderRoomOverlay calls so the body class, dirty chip, indicator bar, button aria-pressed, and roomOverlay all reflect the new clean state on the same frame.
- **Rollback path:** previousAlignMode captured, server-side rejection (`.catch`) reverts state.alignMode and re-syncs the panel.
- **Server-authoritative dirty flag preserved:** alignModeDirtyOnOutput is never optimistically forced false — syncAlignModePanel transitively calls syncAlignModeDirtyDashboardState which re-reads the existing server value.
- **Idempotence intact:** _lastAlignModeState gate (Phase 35) ensures applyLiveRuntimeSnapshot's later echo is a no-op once the optimistic update has landed.
- **W1 diagnostics stripped:** 3 [align-exit-trace] blocks removed (2 in runtime-stage-viewport.js, 1 in runtime-live-sync-core.js).
- **Regression rail:** 5-test source-grep file pins the optimistic mutation pattern, rollback presence, idempotence gate, and trace-strip canary.

## Task Commits

1. **Task 1: Apply Direction B optimistic mutation in setAlignMode** — `c1db942` (feat)
2. **Task 2: Direction-A hybrid (CONTINGENT)** — BYPASSED per W1 OPERATOR_SKIP (no commit)
3. **Task 3: Strip Wave 1 [align-exit-trace] diagnostic logs** — `e00f5c9` (chore)
4. **Task 4: Replace W1 trace test with W2 fix regression rail** — `b76b86a` (test)
5. **Task 5: Operator UAT (Linux + Win32)** — CHECKPOINT, awaiting operator sign-off

_Plan-metadata commit will be created by the orchestrator together with STATE.md / ROADMAP.md updates._

## Files Created/Modified

- `src/app/runtime/viewport/runtime-stage-viewport.js` — setAlignMode dashboard-emit branch now does optimistic state mutation + syncs + emits + rollback-on-reject; W1 trace blocks at syncAlignModeDirtyDashboardState entry and setAlignMode entry removed.
- `src/app/runtime/live-sync/runtime-live-sync-core.js` — W1 trace block at applyLiveRuntimeSnapshot entry removed; alignMode hoist + end-of-function syncAlignModePanel call unchanged (already idempotent via _lastAlignModeState).
- `test/phase-48-align-exit-smooth.test.mjs` (NEW, 5 tests, passing) — pins:
  - Phase 48 W2 marker in setAlignMode body
  - state.alignMode = nextAlignMode appears BEFORE emitLiveMutation in setAlignMode body (and >= 2 times overall)
  - previousAlignMode declared + referenced inside .catch (rollback path)
  - _lastAlignModeState appears >= 2 times in stage-viewport (Phase 35 idempotence gate preserved)
  - No [align-exit-trace] markers remain in either source file
- `test/phase-48-align-exit-trace.test.mjs` (DELETED) — W1 source-grep rail superseded by the smooth-test rail above.

## Decisions Made

1. **Direction B blind (per W1 OPERATOR_SKIP):** Wave 1 `48-W1-TRACE.md` recorded status `OPERATOR_SKIP` — operator directed proceeding to W2 with Direction B based on the ROADMAP hypothesis ("race between align-mode-exit state mutations and live-snapshot-poll re-hydration on dashboard"). The planner's primary recommendation stands without empirical trace data.

2. **Task 2 BYPASSED:** Without a W1 trace showing `snapRunningLen=0` during the hiccup window, the contingent Direction-A hybrid (suppress one transient empty-running-animations snapshot during the exit window) has no empirical trigger. Per the plan's Task 2 gate, it is skipped. If UAT (Task 5) shows the running-animations flash persists, a follow-up plan can apply Direction A.

3. **Dirty flag stays server-authoritative:** `state.alignModeDirtyOnOutput` is set ONLY by `/output/` via the dirty-POST broadcaster (runtime-projection-profile-persistence.js). The optimistic fix DOES NOT forcibly clear it on align-toggle-off. If the operator turns the toggle off WITHOUT discarding on `/output/` first, the dirty chip remains visible — which is the correct preserved behavior. The chip refresh comes for free from `syncAlignModePanel → syncAlignModeDirtyDashboardState` re-reading the existing value.

4. **Rollback shape — capture-and-restore:** `const previousAlignMode = state.alignMode;` taken before mutation; if the emit promise rejects, `state.alignMode = previousAlignMode;` + `syncAlignModePanel();` + `ctx.renderRoomOverlay();` restore the previous UI state. This is strictly safer than pre-fix (which left state stuck at the requested-but-unaccepted value until the next poll).

## Deviations from Plan

**Planned bypass executed — Task 2 skipped per W1 OPERATOR_SKIP gate.**

Task 2 was explicitly designated CONTINGENT in the plan. Its gate (W1 trace shows `snapRunningLen=0` pattern during hiccup window) cannot evaluate true without trace data. Per `48-W1-TRACE.md` and the orchestrator's Wave 2 plan_context, Task 2 is BYPASSED and not regarded as a deviation — it is the planned outcome of the gate.

**No auto-fixes were required.** The plan's interface snippets matched the source exactly, and all source edits landed first try.

**No other deviations.**

## Issues Encountered

None. Source edits parsed clean on first try (`node --check` exit 0 throughout). Full `npm test` baseline preserved: 415 pass / 1 fail (pre-existing 04-T3) / 19 skipped — net +1 pass vs Wave 1's 414 pass corresponds exactly to (-4 W1 tests + 5 W2 tests).

## Verification

- `node --check src/app/runtime/viewport/runtime-stage-viewport.js` → exit 0
- `node --check src/app/runtime/live-sync/runtime-live-sync-core.js` → exit 0
- `grep -c "state.alignMode = nextAlignMode" src/app/runtime/viewport/runtime-stage-viewport.js` → 2 (optimistic + /output/-side legacy path)
- `grep -c "previousAlignMode" src/app/runtime/viewport/runtime-stage-viewport.js` → 2 (declaration + rollback assignment)
- `grep -rc "\[align-exit-trace\]" src/` → 0 across the entire src tree
- `test -f test/phase-48-align-exit-trace.test.mjs` → false (deleted)
- `test -f test/phase-48-align-exit-smooth.test.mjs` → true (created)
- `node --test test/phase-48-align-exit-smooth.test.mjs` → 5/5 pass
- `npm test` → 415 pass / 1 fail (pre-existing 04-T3) / 19 skipped — baseline preserved

## User Setup Required

None — frontend-only change. No new env vars, no new external services, no schema changes.

## Next Phase Readiness

- **Pending:** Operator UAT on Linux + Win32 (Task 5 checkpoint). Required perceived timing: < 250 ms from align-toggle-off click to fully clean dashboard (no dirty chip, indicator bar removed, body class `.align-mode-active` removed, running animations still visible — no "no active animations" flash).
- **If UAT passes both platforms:** Phase 48 closes; ROADMAP advances to **Phase 49 — Release-Prep Small-Fixes Sammelphase**.
- **If UAT fails on the running-animations flash specifically:** apply Direction A (Task 2's hybrid guard, currently bypassed) — implementation snippets are still present in `48-02-PLAN.md` Task 2 for future use.
- **If UAT fails on the align-mode-toggle state itself:** revisit Direction C (running-animations preservation across snapshot applies) — would require a new plan.

## Self-Check: PASSED

- src/app/runtime/viewport/runtime-stage-viewport.js: present, contains 2 `Phase 48 W2` markers + 2 `previousAlignMode` refs + 2 `state.alignMode = nextAlignMode` mutations.
- src/app/runtime/live-sync/runtime-live-sync-core.js: present, 0 `[align-exit-trace]` markers.
- test/phase-48-align-exit-smooth.test.mjs: present, 5 tests, all passing.
- test/phase-48-align-exit-trace.test.mjs: deleted (git rm).
- Commits c1db942 (feat Task 1), e00f5c9 (chore Task 3), b76b86a (test Task 4): all present on master.

---
*Phase: 48-align-mode-exit-dashboard-hiccup-smoothing*
*Plan: 02 (Wave 2 — the actual fix)*
*Completed: 2026-05-17*
