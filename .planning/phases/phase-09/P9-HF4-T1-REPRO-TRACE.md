# P9-HF4-T1 Repro & Root-Cause Trace

## Scope
- Bug: Starting unrelated room animations can rewind/restart active outside sandstorm playback.
- Expected: Outside playback lifecycle is isolated from room/cluster/global-inside triggers.

## Root Cause
Outside playback continuity was keyed by a volatile runtime run identity (`runtimeEntry.id`) from the global running-animation list.

When unrelated lifecycle churn occurs (room/cluster trigger flows, snapshot hydration, list reshaping), that run identity can change or disappear transiently even though outside config (`outsideFx.enabled + selected outside definition`) did not change. The MP4 path treated this as lifecycle replacement and sought to loop-start again.

## Failure Path
1. Outside sandstorm is active.
2. Room start mutations update runtime animation snapshots.
3. Outside runtime-entry identity can drift from the renderer's perspective.
4. MP4 playback state detects lifecycle change and seeks to loop start.
5. Operator observes rewind/restart of outside sandstorm during unrelated room starts.

## Boundaries for Fix
- Lifecycle ownership must be board+outside-definition scoped, not room/cluster trigger scoped.
- Reset remains valid only for explicit outside stop/clear or outside definition mutation.
- Deterministic sync semantics remain unchanged.
