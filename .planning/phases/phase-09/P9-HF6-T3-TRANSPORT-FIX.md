# P9-HF6-T3 - Command transport fix verification

## Implemented fix

- Elevated start/stop command families (`trigger-room`, `trigger-global`, `stop-animation`, `clear-all`) to control-critical queue priority.
- This removes overflow-drop routing for control start/stop under active stream load.

## Evidence

- Script: `debug/p9-hf6-t3-transport-reliability.mjs`
- Output: `debug/p9-hf6-t3-transport-reliability-output.json`

## Result

- Stress: `500` stream-mode `trigger-room:start` commands with active stream subscribers.
- Applied: `500 / 500`
- Not applied: `0`
- Overflow: `0`
- Timeout: `0`

Transport no-op/drop path for start commands is closed.
