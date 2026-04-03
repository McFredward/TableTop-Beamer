# Phase 10 Backlog (Operator Speed UI/UX)

## Planning Mode Note
- Plan 10-HF1 execution is PASS with evidence artifacts committed.
- Priority execute-ready wave is now Plan 10-1 (after HF1 closure).

## Epics
- Final Output Blackout Recovery (Board-Specific P0)
- Settings Information Architecture Sub-Tabs
- Quick Room Action Modes (Activate / Deactivate / Clear)
- Mobile One-Handed Speed Operations
- Deterministic Rapid-Action Safety + Evidence

## Story Mapping
- P10-HF1-S1 Reproduce and isolate root cause for board-specific `/output/final` blackout on `Nemesis Lockdown A` (outside `sandstorm.mp4`).
- P10-HF1-S2 Fix final-output render lifecycle so board/media-specific outside state cannot short-circuit composition to black.
- P10-HF1-S3 Enforce room+outside co-render contract on `/output/final` for all boards and outside asset types.
- P10-HF1-S4 Validate non-regression for sync invariants and existing controls (`stop`, `clear-all`, global toggles).
- P10-HF1-S5 Execute cross-board regression matrix with explicit mp4 outside-background board coverage.
- P10-HF1-S6 Synchronize all phase/global planning artifacts after HF1 PASS.
- P10-S1 Define Settings sub-tab taxonomy and group existing controls by operator intent.
- P10-S2 Implement Settings sub-tab navigation with stable state retention across tab switches.
- P10-S3 Add shared quick-mode state machine with explicit status, cancel path, and conflict guards.
- P10-S4 Implement quick activation mode with selected animation lock and sequential room apply.
- P10-S5 Implement quick deactivation mode with selected animation lock and sequential room removal.
- P10-S6 Implement quick clear mode to remove all animations from tapped/clicked rooms.
- P10-S7 Add mobile sticky action rail and large one-hand controls for rapid reaction.
- P10-S8 Improve mobile overview so operator can keep board context while acting quickly.
- P10-S9 Add telemetry/log traces for rapid sequential operations and mode transitions.
- P10-S10 Validate sync determinism and idempotency under burst interaction on desktop/mobile.
- P10-S11 Run full non-regression for stop/clear-all/global behavior and `/output/final` stability.
- P10-S12 Synchronize all phase/global planning artifacts after verification PASS.

## Prioritized Execution Wave (P0) - Plan 10-HF1 execute-ready
- Story P10-HF1-S1.
  - Goal: reproducible, bounded root-cause map for board-specific final blackout.
- Story P10-HF1-S2 + P10-HF1-S3.
  - Goal: final composition path stays active and renders room+outside on all boards.
- Story P10-HF1-S4 + P10-HF1-S5.
  - Goal: sync/control non-regression and all-board PASS evidence.
- Story P10-HF1-S6.
  - Goal: phase/global trackers are synchronized at wave closure.

## Prioritized Execution Wave (P0) - Plan 10-1 execute-ready
- Story P10-S1 + P10-S2.
  - Goal: Settings sub-tabs are logically grouped and fast to navigate.
- Story P10-S3.
  - Goal: one deterministic quick-mode state machine for all speed operations.
- Story P10-S4 + P10-S5 + P10-S6.
  - Goal: activation/deactivation/clear sequential room tap flows are usable and safe.
- Story P10-S7 + P10-S8.
  - Goal: mobile one-handed operation and overview are materially faster.
- Story P10-S9 + P10-S10 + P10-S11.
  - Goal: deterministic rapid-operation behavior is proven with non-regression evidence.
- Story P10-S12.
  - Goal: phase and global trackers are synchronized at closure.

## Follow-up Waves
- Plan 10-1: speed-first operator UX baseline (sub-tabs + quick activation/deactivation/clear + mobile one-hand flow) after HF1 PASS.
- Plan 10-2: UX polish and performance micro-optimizations from field feedback.
- Plan 10-3: optional operator presets for quick-mode templates if needed after live validation.
