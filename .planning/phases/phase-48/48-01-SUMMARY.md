---
phase: 48
plan: 01
title: "Align-exit diagnostic trace + source-grep regression rail"
date: 2026-05-17
status: complete-with-skip
wave: 1
tasks_completed: "3/4 (Task 4 operator trace-capture skipped by operator decision)"
key_files:
  modified:
    - src/app/runtime/viewport/runtime-stage-viewport.js
    - src/app/runtime/live-sync/runtime-live-sync-core.js
  created:
    - test/phase-48-align-exit-trace.test.mjs
    - .planning/phases/phase-48/48-W1-TRACE.md
commits:
  - "a92e2bc feat(48-01): add [align-exit-trace] diagnostic logs in stage-viewport"
  - "cf3d8e7 feat(48-01): add [align-exit-trace] log in applyLiveRuntimeSnapshot"
  - "4abc3e4 test(48-01): pin [align-exit-trace] sites with source-grep regression rail"
---

# Plan 48-01 Summary — Align-exit Trace Capture

## What was built

Diagnostic `[align-exit-trace]` console-log instrumentation at 5 source sites across the align-mode + snapshot-poll surfaces, plus a source-grep regression test that pins the trace sites.

**Instrumented call sites:**
- `src/app/runtime/viewport/runtime-stage-viewport.js` (4 hits: 2 marker comments + 2 console.log lines)
  - `syncAlignModeDirtyDashboardState` entry
  - `setAlignMode` emit path
- `src/app/runtime/live-sync/runtime-live-sync-core.js` (2 hits: 1 marker comment + 1 console.log line)
  - `applyLiveRuntimeSnapshot` entry (logs mutationType + alignMode + alignModeDirtyOnOutput + runningAnimations.length)

**Regression rail:**
- `test/phase-48-align-exit-trace.test.mjs` (4 tests) — source-grep assertions pinning the trace sites. Prevents accidental removal of any single trace before W2 cleanup.

## Tests

- `node --test test/phase-48-align-exit-trace.test.mjs` → 4/4 pass
- `npm test` → 414 pass / 1 fail (pre-existing 04-T3) / 19 skipped — baseline preserved, no new failures

## Deviations from plan

**Task 4 (operator trace capture) skipped.** The operator explicitly directed continuation through all waves without gating on the manual browser repro. Details + rationale captured in `48-W1-TRACE.md` with status `OPERATOR_SKIP`. Wave 2 proceeds with Direction B (planner's default primary fix) without trace data.

The diagnostic traces themselves remain in source through Wave 2 — Wave 2 Task 3 will strip them after the fix is verified, so they serve as fallback diagnostic capability if the blind Direction-B fix proves insufficient.

## What this enables for Wave 2

- Wave 2 Task 1 reads `48-W1-TRACE.md` → sees `OPERATOR_SKIP` → applies Direction B without contingent gates
- Wave 2 Task 2 (contingent Direction-A hybrid) is BYPASSED — no trace data means no empirical trigger for the hybrid
- Wave 2 Task 3 strips the trace logs added in this plan
- Wave 2 Task 4-5 verify the fix and request operator UAT
