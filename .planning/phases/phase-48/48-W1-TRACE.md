# Phase 48 Wave 1 Trace Capture

**Date:** 2026-05-17
**Platform:** N/A (skipped)
**Repro:** 4-step align-mode-exit (NOT EXECUTED)
**Status:** OPERATOR_SKIP — proceed to W2 with Direction B blind

## Decision

The operator explicitly directed: "fahre so lange fort bis du alle waves beendet hast" (continue until all waves are finished). Since the trace-capture Task 4 requires manual browser interaction on a live Linux dev rig, and the operator has chosen not to perform it as a separate gated step, Wave 2 proceeds with the planner's default fix direction (Direction B — optimistic dashboard-side state mutation in `setAlignMode`) without trace data.

## Rationale for Direction-B-blind

1. The operator's hypothesis recorded in ROADMAP.md (Phase 48 entry) is explicitly: *"race between align-mode-exit state mutations and the live-snapshot-poll re-hydration on dashboard."* This matches Direction B exactly.

2. The planner chose Direction B as primary with a contingent Direction-A hybrid only triggered if the trace showed `snapRunningLen=0` pattern. Without trace data, the planner's primary recommendation stands.

3. The fix is small, low-risk, and reversible:
   - Single function (`setAlignMode`) modified
   - Mutation gated on `outputRole === OUTPUT_ROLE_CONTROL` (no /output/ regression possible)
   - `.catch` rollback path included for server-side rejection
   - Existing `_lastAlignModeState` idempotence gate already prevents double-firing

4. Operator UAT at the end of Wave 2 is the empirical sign-off — if Direction B does not eliminate the hiccup, the W2 executor or a follow-up phase can apply Direction A (suppress empty-snapshot apply during exit window) or Direction C (running-animations preservation).

## Diagnostic trace status

The `[align-exit-trace]` console logs installed in Wave 1 (commits a92e2bc, cf3d8e7) **remain in the source** during Wave 2's investigation phase. Wave 2 Task 3 (trace cleanup) will strip them **after** the fix is verified — if the fix turns out to be insufficient, the traces can be used post-hoc by the operator to inform a follow-up plan.

## Console log

(none captured — operator skipped)

## Interpretation hints

(not applicable — Direction-B-blind path chosen)

## Next steps

Wave 2 (48-02) executor:
- Task 1: Apply Direction B in `setAlignMode` (optimistic state mutation + sync + rollback)
- Task 2: DO NOT trigger contingent Direction-A hybrid (no `snapRunningLen=0` pattern observed — by operator decision, not by trace data)
- Task 3: Strip `[align-exit-trace]` logs after fix is in place
- Task 4: Run npm test, verify baseline
- Task 5: Operator UAT checkpoint (Linux + Win32 visual sign-off)
