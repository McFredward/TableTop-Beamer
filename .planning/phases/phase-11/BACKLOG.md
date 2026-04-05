# Phase 11 Backlog (Mandatory HF6 Non-Loop Polling/Hydration Playback Guarantee Package)

## Epics
- Non-Loop Polling/Hydration Premature-Cancel Root-Cause Isolation [P0]
- Seen-Revision One-Shot Full-Duration Local Playback Contract [P0]
- Polling Snapshot Cancellation Guard (explicit stop/clear only) [P0]
- Loop Mode Non-Regression Protection [P0]
- Stop/Clear Lifecycle Semantics Preservation [P0]
- Deterministic Multi-Client Polling Seen-Once Playback Evidence Closure [P0]
- Planning Artifact Synchronization [P0]

## Story Mapping
- P11-HF6-S1 Reproduce P0 regression: non-loop trigger revision is seen, but polling/hydration cancels playback before full visible duration.
- P11-HF6-S2 Isolate root-cause ordering between revision observation and polling snapshot reconciliation.
- P11-HF6-S3 Implement per-client seen-revision playback lock (play once, full duration).
- P11-HF6-S4 Enforce cancellation guard so only explicit stop/clear revisions can terminate active one-shots early.
- P11-HF6-S5 Execute loop-mode non-regression matrix to ensure sustained looping/start-stop behavior remains intact.
- P11-HF6-S6 Execute stop/clear immediate-authority non-regression matrix across mixed one-shot + loop runs.
- P11-HF6-S7 Capture FAIL->PASS evidence for deterministic multi-client polling seen-once full playback parity.
- P11-HF6-S8 Synchronize phase and global planning trackers.

## Prioritized Execution Wave (P0) - Plan 11-HF6 (execute-ready now)
- Story P11-HF6-S1 + P11-HF6-S2.
  - Goal: deterministic RED + root-cause isolation for polling/hydration premature cancellation.
- Story P11-HF6-S3 + P11-HF6-S4.
  - Goal: seen-once full local playback lock with explicit-cancel-only guard.
- Story P11-HF6-S5 + P11-HF6-S6.
  - Goal: preserve loop behavior and stop/clear authority with explicit non-regression evidence.
- Story P11-HF6-S7.
  - Goal: strict FAIL->PASS parity proof for seen-once full playback on initiator + peers + `/output/final`.
- Story P11-HF6-S8.
  - Goal: full planning artifact sync closure.

## Follow-up Waves
- Plan 11-2: post-HF6 UX polish and optional operator ergonomics refinements.
- Plan 11-3: optional presets/macros after HF6 stability confirmation.

## HF6 Activation Update
- Plan 11-HF5 remains implemented but is field-invalidated by polling/hydration one-shot premature-cancel behavior.
- Plan 11-HF6 closure is PASS with deterministic polling seen-once full-playback evidence across initiator + peers + `/output/final`.
- Active backlog focus may return to Plan 11-2 refinement scope.
