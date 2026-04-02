# Phase 9 Backlog (HF4 reliability stabilization wave)

## Reopen context
- 9-1 execution exists, but 9-1 is not accepted.
- 9-HF1 and 9-HF2 remain valid foundations.
- 9-HF3 introduced critical regressions in real operation; closure is revoked.
- New priority wave: 9-HF4 reliability-first stabilization with controlled simplification.

## Epics
- 9-HF4 Core Function Recovery (start/stop, board switch parity, `/output/final` load)
- 9-HF4 Runtime Simplification and Scheduling Path Reduction
- 9-HF4 Startup Invariant Enforcement (no phantom running, no duplicate outside runs)
- 9-HF4 Deterministic Server-Authoritative Sync Preservation (mobile->pi primary)
- 9-HF4 Feature Flags and Runtime Profiles (`safe`/`balanced`/`aggressive`)
- 9-HF4 FAIL->PASS Reproduction and Core Journey Smoke Evidence

## Story mapping
- P9-HF4-S1 Capture deterministic FAIL reproductions for all reported regressions.
- P9-HF4-S2 Unify start/stop control flow and remove destabilizing alternate runtime paths.
- P9-HF4-S3 Enforce startup hydration/run-list invariants to eliminate phantom and duplicate entries.
- P9-HF4-S4 Implement atomic board-switch context apply to guarantee board image + polygon parity.
- P9-HF4-S5 Harden `/output/final` bootstrap and reconnect loading reliability.
- P9-HF4-S6 Keep only required low-end smoothness guards after simplification.
- P9-HF4-S7 Add fail-safe runtime profiles and kill-switch flags for aggressive optimizations.
- P9-HF4-S8 Validate sync determinism and mobile->pi reliability under simplified runtime.
- P9-HF4-S9 Execute FAIL->PASS and runtime smoke matrices with measurable PASS criteria.
- P9-HF4-S10 Synchronize phase/global planning artifacts after gate closure.

## Prioritized execution wave (P0) - Plan 9-HF4 execute-ready
- Story P9-HF4-S1.
  - Goal: stable, reproducible FAIL baseline for each blocker.
- Story P9-HF4-S2 + P9-HF4-S3.
  - Goal: deterministic lifecycle control and clean startup.
- Story P9-HF4-S4 + P9-HF4-S5.
  - Goal: board switch parity and reliable `/output/final` loading.
- Story P9-HF4-S6 + P9-HF4-S7.
  - Goal: reliability-first simplification with safe runtime profile fallback.
- Story P9-HF4-S8.
  - Goal: preserve server-authoritative sync and mobile->pi consistency.
- Story P9-HF4-S9.
  - Goal: explicit FAIL->PASS plus smoke evidence for core journeys.
- Story P9-HF4-S10.
  - Goal: full artifact synchronization.

## Follow-up waves
- Plan 9-2 (after HF4 PASS): adapter cleanup, dependency hardening, focused diagnostics.
- Plan 9-3 (after 9-2): production gate sweep and final phase sign-off.

## Wave status
- HF4 reliability wave executed; next queued waves remain 9-2 then 9-3.
