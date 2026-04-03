# P9-HF4-T6 Repeated Room-Start Regression

## Objective
Prove that repeated room animation starts do **not** restart/rewind outside sandstorm playback.

## Executed Artifact
- Script: `debug/p9-hf4-repeated-room-start-regression.mjs`
- Output: `debug/p9-hf4-repeated-room-start-regression-output.json`

## PASS Checks
1. Initial outside MP4 start seeks once (expected bootstrap behavior).
2. Repeated room starts (6x) do not trigger outside lifecycle change or restart seek.
3. Explicit outside-stop reset still works.
4. `clear all` reset still works.

## Result
**PASS** — repeated room starts no longer restart outside sandstorm, while stop/clear semantics remain deterministic.
