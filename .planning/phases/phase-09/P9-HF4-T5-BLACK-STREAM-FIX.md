# P9-HF4-T5 - Black-Stream Closure (including sandstorm path)

## Root Cause

- Final-output draw loop returned early whenever stream path was considered healthy.
- In that branch the canvas was cleared and no FX/animation rendering was executed.
- Final-output CSS also forced the board image hidden, so stream mode could collapse to black output.

## Fix

- Remove draw-loop early return for stream mode so render pipeline continues deterministically.
- Keep stream metadata layer as informational overlay while canvas rendering remains active.
- Stop forcing board image hidden in final-output mode to preserve visible output baseline.
- Add `stream-fault` handling to force client fallback on producer fault events.

## Result

- Stream mode no longer forces a black frame when effects/assets (including sandstorm flows) are active.
- Output parity remains aligned because canonical render path remains active while stream metadata runs.
