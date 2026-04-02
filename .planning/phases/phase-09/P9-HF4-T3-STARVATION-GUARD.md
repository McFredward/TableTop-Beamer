# P9-HF4-T3 - Queue Starvation and Lock Hazard Guard

## Method

- Start server and attach 16 concurrent stream subscribers.
- Dispatch 160 control commands while stream mode stays enabled.
- Capture ACK queue depths, max observed queue telemetry, and producer health.

## Evidence

- Script: `debug/p9-hf4-t3-starvation-guard.mjs`
- Output: `debug/p9-hf4-t3-starvation-guard-output.json`

## Result

- Command path remains bounded under stream pressure.
- Queue depth stays low and no starvation symptoms are observed.
- PASS when ACK queue depth, observed queue depth, and max command latency stay within guard thresholds.
