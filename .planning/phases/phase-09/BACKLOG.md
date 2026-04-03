# Phase 9 Backlog (Replanned after runtime P0 bugfix package)

## Acceptance Correction
- 9-1 execution exists, but 9-1 is not accepted.
- 9-HF1 and 9-HF2 are completed baselines, but not final closure.
- New priority wave: 9-HF3 (mandatory runtime alignment + mixed-media lifecycle + weak-hardware controls + explicit error feedback).

## Epics
- 9-HF3 Mandatory Runtime Bugfix Wave
- Cross-Browser Coordinate Determinism
- `/output/final` Mixed-Media Lifecycle Integrity
- Weak-Hardware Concurrent MP4 Stability Controls
- Explicit Operator Error Feedback Contract
- Deterministic Sync Non-Regression Guard
- Browser/Final-Output/Weak-Hardware Evidence Matrix Closure

## Story Mapping
- P9-HF3-S1 Add canonical coordinate transform contract shared by control and final render pipelines.
- P9-HF3-S2 Ensure deterministic recompute on resize/orientation/fullscreen/DPR changes to eliminate browser-specific polygon drift.
- P9-HF3-S3 Root-cause and isolate mixed-media renderer lifecycle so room `mp4` start (`malfunction`) does not suppress room GIFs on `/output/final`.
- P9-HF3-S4 Add lifecycle-safe renderer ownership and recovery guards for mixed media (`gif` + `mp4`) in final output path.
- P9-HF3-S5 Add configurable quality/performance profile controls for concurrent `mp4` pressure (quality tier, cap, degrade/recover thresholds).
- P9-HF3-S6 Implement deterministic degrade strategy (compression/skip/defer) with bounded floor and safe recovery hysteresis.
- P9-HF3-S7 Add explicit failure/timeout feedback surface (toast-level UX) for command/API actions with actionable error copy.
- P9-HF3-S8 Ensure no silent failure remains in runtime command dispatch and async API interactions.
- P9-HF3-S9 Prove deterministic sync invariants remain intact under HF3 hotfix logic.
- P9-HF3-S10 Execute browser matrix + mixed-media final-output regression + weak-hardware stress + feedback matrix with evidence artifacts.
- P9-HF3-S11 Synchronize all phase/global planning artifacts after HF3 closure.

## Prioritized Execution Wave (P0) - Plan 9-HF3 execute-ready
- Story P9-HF3-S1 + P9-HF3-S2.
  - Goal: deterministic polygon coordinate mapping across browser/DPR/fullscreen paths.
- Story P9-HF3-S3 + P9-HF3-S4.
  - Goal: mixed-media lifecycle on `/output/final` remains stable after `malfunction` (`mp4`) start.
- Story P9-HF3-S5 + P9-HF3-S6.
  - Goal: weak hardware maintains stable playback under many concurrent `mp4` streams via configurable degrade controls.
- Story P9-HF3-S7 + P9-HF3-S8.
  - Goal: explicit operator-facing errors for command/API failure and timeout, zero silent no-op.
- Story P9-HF3-S9.
  - Goal: deterministic sync contract remains unchanged and verified.
- Story P9-HF3-S10.
  - Goal: evidence-backed PASS matrix for browser/final-output/weak-hardware/feedback constraints.
- Story P9-HF3-S11.
  - Goal: phase + global artifacts are fully synchronized.

## Follow-up Waves
- Plan 9-2 (after HF3 PASS): adapter cleanup, dependency hardening, optional diagnostics refinements.
- Plan 9-3 (after 9-2): production gate sweep and final sign-off.

## Execution Status Update

- Plan 9-1 executed and documented, but rejected by acceptance correction.
- Plan 9-HF1 completed and remains accepted as modularization baseline.
- Plan 9-HF2 is completed; lifecycle no-replay + low-end hardening stories are closed with evidence artifacts.
- Plan 9-HF3 is completed with PASS evidence and no longer blocks Plan 9-2.
