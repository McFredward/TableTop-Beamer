# Phase 11 Backlog (Mandatory HF5 Non-Loop Multi-Client Sync Recovery Package)

## Epics
- Non-Loop Global Initiator-Only Sync Failure Root-Cause Isolation [P0]
- One-Shot Server-Authoritative Exactly-Once Replication Recovery [P0]
- Local Optimistic One-Shot Masking Guard/Removal [P0]
- Loop Mode Non-Regression Protection [P0]
- Stop/Clear Lifecycle Semantics Preservation [P0]
- Multi-Client One-Shot Duration Parity FAIL->PASS Evidence Closure [P0]
- Planning Artifact Synchronization [P0]

## Story Mapping
- P11-HF5-S1 Reproduce P0 regression: non-loop global triggers run only on initiating client while peers and `/output/final` miss the event.
- P11-HF5-S2 Isolate root-cause branch (command emission vs server apply vs snapshot/event fanout) for one-shot global sync failure.
- P11-HF5-S3 Implement deterministic server-authoritative one-shot replication exactly once across initiator + peers + `/output/final`.
- P11-HF5-S4 Remove/guard local optimistic one-shot render path that can hide distributed sync failures.
- P11-HF5-S5 Execute loop-mode non-regression matrix to ensure sustained looping/start-stop behavior remains intact.
- P11-HF5-S6 Execute stop/clear non-regression matrix across mixed one-shot + loop runs.
- P11-HF5-S7 Capture FAIL->PASS evidence for strict multi-client one-shot full-duration parity.
- P11-HF5-S8 Synchronize phase and global planning trackers.

## Prioritized Execution Wave (P0) - Plan 11-HF5 (execute-ready now)
- Story P11-HF5-S1 + P11-HF5-S2.
  - Goal: deterministic RED + root-cause isolation for initiator-only one-shot desync.
- Story P11-HF5-S3 + P11-HF5-S4.
  - Goal: server-authoritative exactly-once replication with no local optimistic masking.
- Story P11-HF5-S5 + P11-HF5-S6.
  - Goal: preserve loop mode and stop/clear semantics with explicit non-regression evidence.
- Story P11-HF5-S7.
  - Goal: strict FAIL->PASS parity proof for one-shot duration on initiator + peers + `/output/final`.
- Story P11-HF5-S8.
  - Goal: full planning artifact sync closure.

## Follow-up Waves
- Plan 11-2: post-HF5 UX polish and optional operator ergonomics refinements.
- Plan 11-3: optional presets/macros after HF5 stability confirmation.

## HF5 Closure Update
- Plan 11-HF5 stories P11-HF5-S1..S8 are implemented and verified PASS.
- Active backlog focus moves to Plan 11-2 refinement preparation.
