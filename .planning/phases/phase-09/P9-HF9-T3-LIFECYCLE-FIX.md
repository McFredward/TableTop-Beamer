# P9-HF9-T3 Lifecycle + Reporting Fix

## Goal

Fix lifecycle/reporting so `compositorAlwaysOn=true` is enforced and observable across normal startup/runtime sequences.

## Implementation

Updated `buildFinalStreamHealthSnapshot()` in `server.mjs` to publish an explicit lifecycle-aware `compositorAlwaysOn` signal.

Signal criteria:

- `producer.running === true`
- `producer.watchdogActive === true`
- `producer.timerActive === true`
- recent tick freshness (`msSinceLastTick` within active window)
- recent frame freshness (`msSinceLastFrame` within active window, or warm startup with producer ticks)

Additional producer telemetry exposed:

- `producer.timerActive`
- `producer.msSinceLastTick`

## Verification Run

- Script: `node debug/p9-hf9-t3-lifecycle-gate-fix.mjs`
- Output: `debug/p9-hf9-t3-lifecycle-gate-fix-output.json`
- Base URL: `http://127.0.0.1:4211`

## Result

- PASS (`pass: true`)
- `compositorAlwaysOn: true` across:
  - boot
  - zero-subscriber idle
  - first attach
  - post-detach churn
  - reconnect

## Contract Preservation

This change is server health/reporting and lifecycle gating only. It does not alter `/output/final` stream-only receiver contract or reintroduce client polling/orchestration.
