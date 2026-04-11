---
phase: phase-11
plan: 11-HF1
subsystem: runtime-sync
tags: [outside-sync, one-shot-lifecycle, global-loop, room-hold, board-model]
requires:
  - phase: phase-11
    provides: plan 11-1 operator UX baseline
provides:
  - first-apply outside settings propagation across clients/final
  - no replay of expired global one-shots after reload/reconnect
  - per-global loop-until-stopped option
  - canonical board storage model with legacy migration
affects: [server-live-mutations, runtime-hydration, settings-ui, planning-verification]
tech-stack:
  added: []
  patterns: [snapshot-authoritative outside-apply, epoch-preserving one-shot hydration, canonical board storage migration]
key-files:
  created:
    - .planning/phases/phase-11/P11-HF1-T1-OUTSIDE-FIRST-APPLY-RED.md
    - .planning/phases/phase-11/P11-HF1-T3-GLOBAL-ONESHOT-REPLAY-RED.md
    - .planning/phases/phase-11/11-HF1-VERIFICATION.md
    - debug/p11-hf1-acceptance-regression-output.json
  modified:
    - server.mjs
    - src/app/runtime/runtime-orchestration.js
    - src/app/lib/shared/config.js
    - src/app/lib/state/runtime-state.js
    - src/app/lib/ui/runtime-panels-controller.js
    - .planning/phases/phase-11/TASKS.md
key-decisions:
  - "outside-apply-changes mutations are treated as deterministic state-sync events and are not coalesced."
  - "global one-shot hydration preserves authoritative epoch timestamps instead of re-priming to local now."
  - "legacy config/boards/imported storage is migrated into canonical config/boards + config/boards/assets paths."
duration: 8min
completed: 2026-04-04
---

# Phase 11 Plan HF1: Sync/Lifecycle/Board-Model Hotfix Summary

**Outside first-apply sync, one-shot no-replay hydration, per-global loop control, always-hold room runtime, and canonical board storage migration are now closed together with HF1 evidence.**

## Task Commits
1. `3178004` — RED repro docs for outside first-apply and one-shot replay bugs.
2. `e0b92fc` — runtime lifecycle hardening, per-global loop option, room always-hold simplification.
3. `d06bb78` — server first-apply outside sync determinism + canonical board storage migration.
4. `2244a6e` — HF1 verification matrix + regression artifact + TASKS closure.

## Deviations from Plan

### Auto-fixed Issues
1. **[Rule 1 - Bug] One-shot replay root cause fixed in trigger timestamp priming**
   - Found during T4 implementation.
   - Fix: stop resetting global trigger `startedAtEpochMs` to `now` on hydration.
   - Commit: `e0b92fc`.

2. **[Rule 3 - Blocking] Added runtime fallback injection for new loop checkbox**
   - Found during T5/T6 integration because `index.html` is already heavily modified in the current workspace.
   - Fix: runtime now creates `#inside-loop-until-stop` control if missing and removes legacy room hold control at startup.
   - Commit: `e0b92fc`.

## Known Stubs
None.

## Self-Check: PASSED
- FOUND: `.planning/phases/phase-11/11-HF1-SUMMARY.md`
- FOUND commits: `3178004`, `e0b92fc`, `d06bb78`, `2244a6e`
