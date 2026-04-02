# P9-HF6-T1 - Deterministic repro trace for stream-mode command drop/no-op

## Goal

Produce deterministic pre-fix evidence for dropped/no-op control commands while stream mode is active.

## Harness

- Script: `debug/p9-hf6-t1-command-drop-repro.mjs`
- Output: `debug/p9-hf6-t1-command-drop-repro-output.json`

## Method

1. Open six `/api/final-stream/events` subscribers (active stream lifecycle).
2. Force `finalOutputMode=stream` via `context-update` command.
3. Fire `1400` concurrent `trigger-room` start commands (`/api/live/command`).
4. Collect ack payloads and queue telemetry.

## Pre-fix Result

- Total commands: `1400`
- Applied: `917`
- Not applied: `483`
- Overflow acks: `483`
- Queue reached hard limit: `maxDepthObserved=512`

## Interpretation

Pre-fix transport path allows `trigger-room:start` commands to be accepted by HTTP command endpoint but not applied when queue overflow is hit. This is observed as command no-op/drop from client perspective under active stream mode load.
