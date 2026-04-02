# P9-HF3-T2 Decode/Render Scheduling Hardening

- Date: 2026-04-02T20:28:26Z
- Scope: Prevent frame-budget starvation by bounding non-critical video operations per frame and prioritizing critical final-output operations.

## Runtime Changes

- Added frame-local video operation scheduler in `runtime-orchestration`.
- Introduced role-aware budgets (`final-output` gets larger per-frame video op budget under pressure).
- Deferred non-critical play/rate/seek operations when budget is exhausted; critical outside/final ops may preempt.

## Harness

- Script: `debug/p9-hf3-video-scheduler.mjs`
- Command: `node debug/p9-hf3-video-scheduler.mjs`

## Result

`PASS`

Measured snapshot at pressure level 2:

- `final-output`: budget `7`, applied ops `5`, deferred `3`
- `control`: budget `2`, applied ops `3` (critical preemption), deferred `5`

## Conclusion

Decode/render lifecycle mutations are no longer unbounded per frame. Non-critical operations are shed first, reducing starvation risk during concurrent video playback while keeping critical final-output continuity operations intact.
