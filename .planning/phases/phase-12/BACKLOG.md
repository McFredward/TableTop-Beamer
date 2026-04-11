# Phase 12 Backlog (Plan 12-1 Concurrent Room Animation Layering)

## Epics
- Order-Dependent Occlusion Root-Cause Isolation [P0]
- Start-Path No-Implicit-Replace Guard for Room Animations [P0]
- Generic Additive Layering Contract (coded/mp4/gif) [P0]
- Loop-Mode Non-Regression Protection [P0]
- Stop/Clear Authority Preservation [P0]
- Order-Invariance Deterministic Evidence Closure [P0]
- Control-View + `/output/final` Parity [P0]
- Planning Artifact Synchronization [P0]

## Story Mapping
- P12-S1 Reproduce the order-dependent occlusion (e.g. `alarm` disappears after `malfunction -> alarm`).
- P12-S2 Isolate exact start-path or render-path branch that hides/unmounts the earlier animation.
- P12-S3 Enforce "start adds, never replaces" for room-scope animations regardless of type.
- P12-S4 Verify additive canvas composition for coded primitives layered on mp4 drawImage layered on gif drawImage within a single room.
- P12-S5 Validate loop-mode start/sustain/stop remains unchanged across all three types.
- P12-S6 Validate stop/clear remains immediate and authoritative across mixed one-shot + loop same-room sequences.
- P12-S7 Produce deterministic A->B vs B->A order-invariance proof.
- P12-S8 Produce control-view vs `/output/final` parity proof for layered room animations.
- P12-S9 Synchronize phase and global trackers.

## Prioritized Execution Wave (P0) - Plan 12-1 (execute-ready)
- Story P12-S1 + P12-S2.
  - Goal: deterministic RED + root-cause isolation for order-dependent occlusion.
- Story P12-S3 + P12-S4.
  - Goal: generic, type-independent additive layering for room animations with no implicit replacement on start.
- Story P12-S5 + P12-S6.
  - Goal: preserve loop and stop/clear authority with explicit non-regression evidence.
- Story P12-S7 + P12-S8.
  - Goal: strict order-invariance and control-vs-final parity proof.
- Story P12-S9.
  - Goal: full planning artifact sync closure.

## Follow-up Waves
- Plan 12-2 (conditional): UX surfacing of concurrent-run count per room, if operator feedback demands it.
- Plan 12-3 (optional): performance tuning for high concurrency (render budget, frame pacing) if measured regressions emerge.
