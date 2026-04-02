# Phase 9 Backlog (Replanned after long-run stability feedback)

## Acceptance Correction
- 9-1 execution exists, but 9-1 is not accepted.
- 9-HF1 is completed baseline, but not final closure.
- New priority wave: 9-HF2 (mandatory lifecycle correctness + load hardening).

## Epics
- 9-HF2 Mandatory Stability Hotfix Wave
- Event Lifecycle Correctness Across Reload/Reconnect
- One-Shot Expiry No-Replay Enforcement
- Low-End Device Runtime Hardening
- Deterministic Sync Non-Regression Guard
- Long-Run and Mobile Evidence Matrix Closure

## Story Mapping
- P9-HF2-S1 Add canonical lifecycle reconciliation on rehydrate: elapsed one-shot events are restored as terminal/completed.
- P9-HF2-S2 Add hard no-replay guard for expired one-shot events on browser reload and reconnect.
- P9-HF2-S3 Align local rehydrate and synced rejoin lifecycle semantics to a deterministic state contract.
- P9-HF2-S4 Add frame-budget monitor and deterministic load-shedding ladder (caps/coalescing/defer) for weak devices.
- P9-HF2-S5 Apply particle/effect caps under pressure with defined lower/upper bounds and non-crashing fallback.
- P9-HF2-S6 Coalesce non-critical visual updates while preserving event semantics and final state parity.
- P9-HF2-S7 Prove deterministic sync remains intact under hardening paths (ordering/version/idempotent apply).
- P9-HF2-S8 Execute long-run soak and low-end mobile stress matrix with evidence artifacts.
- P9-HF2-S9 Synchronize all phase/global planning artifacts after HF2 closure.

## Prioritized Execution Wave (P0) - Plan 9-HF2 execute-ready
- Story P9-HF2-S1 + P9-HF2-S2.
  - Goal: no replay of expired one-shot events after reload/reconnect.
- Story P9-HF2-S3.
  - Goal: deterministic lifecycle parity across local rehydrate and multi-client reconnect.
- Story P9-HF2-S4 + P9-HF2-S5 + P9-HF2-S6.
  - Goal: stable runtime under sustained load on low-end devices via budget-aware hardening.
- Story P9-HF2-S7.
  - Goal: deterministic sync contract remains unchanged and verified.
- Story P9-HF2-S8.
  - Goal: evidence-backed PASS matrix for long-run and mobile constraints.
- Story P9-HF2-S9.
  - Goal: phase + global artifacts are fully synchronized.

## Follow-up Waves
- Plan 9-2 (after HF2 PASS): adapter cleanup, dependency hardening, optional diagnostics refinements.
- Plan 9-3 (after 9-2): production gate sweep and final sign-off.

## Execution Status Update

- Plan 9-1 executed and documented, but rejected by acceptance correction.
- Plan 9-HF1 completed and remains accepted as modularization baseline.
- Plan 9-HF2 is completed; lifecycle no-replay + low-end hardening stories are closed with evidence artifacts.
