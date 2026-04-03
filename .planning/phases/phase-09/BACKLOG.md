# Phase 9 Backlog (Replanned after mandatory outside-lifecycle P0 bugfix)

## Acceptance Correction
- 9-1 execution exists, but 9-1 is not accepted.
- 9-HF1, 9-HF2, and 9-HF3 are completed baselines, but not final closure.
- New priority wave: 9-HF4 (mandatory outside lifecycle independence hotfix).

## Epics
- 9-HF4 Mandatory Outside Lifecycle Independence Wave
- Outside Playback State Isolation
- Outside Media Cache Reset Guard
- Deterministic Sync + Stop/Clear Semantics Preservation
- Outside No-Restart Regression Evidence Closure

## Story Mapping
- P9-HF4-S1 Reproduce and isolate the coupling path where room animation starts restart outside sandstorm playback.
- P9-HF4-S2 Separate outside playback state ownership from room/cluster/global-inside trigger lifecycle.
- P9-HF4-S3 Introduce strict guardrails so outside media cache/reset can only occur on outside-scoped lifecycle events.
- P9-HF4-S4 Preserve explicit outside stop/clear behavior and ensure no semantic drift in existing teardown flows.
- P9-HF4-S5 Prove deterministic sync invariants remain intact under lifecycle-decoupled implementation.
- P9-HF4-S6 Add regression scenarios for repeated room starts while outside is active and verify no restart/rewind.
- P9-HF4-S7 Add cross-scope non-regression scenarios (room/cluster/global-inside starts vs active outside lifecycle).
- P9-HF4-S8 Synchronize all phase/global planning artifacts after HF4 closure evidence.

## Prioritized Execution Wave (P0) - Plan 9-HF4 execute-ready
- Story P9-HF4-S1 + P9-HF4-S2.
  - Goal: enforce strict lifecycle isolation between outside playback and non-outside trigger scopes.
- Story P9-HF4-S3.
  - Goal: prevent outside media cache reset on unrelated starts.
- Story P9-HF4-S4 + P9-HF4-S5.
  - Goal: preserve deterministic sync and existing stop/clear semantics.
- Story P9-HF4-S6 + P9-HF4-S7.
  - Goal: evidence-backed proof that repeated room starts do not restart outside sandstorm.
- Story P9-HF4-S8.
  - Goal: phase + global artifacts are fully synchronized.

## Follow-up Waves
- Plan 9-2 (after HF4 PASS): adapter cleanup, dependency hardening, optional diagnostics refinements.
- Plan 9-3 (after 9-2): production gate sweep and final sign-off.

## Execution Status Update

- Plan 9-1 executed and documented, but rejected by acceptance correction.
- Plan 9-HF1 completed and remains accepted as modularization baseline.
- Plan 9-HF2 is completed; lifecycle no-replay + low-end hardening stories are closed with evidence artifacts.
- Plan 9-HF3 is completed with PASS evidence.
- Plan 9-HF4 is completed PASS; Plan 9-2 may proceed with HF4 lifecycle-independence evidence locked.
