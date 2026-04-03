# P9-HF9-T5 Full Parity + Acceptance Matrix

## Goal

Re-run the full HF9 parity/acceptance matrix and require complete PASS (no partial closure), including explicit always-on lifecycle gate closure.

## Verification Run

- Script: `node debug/p9-hf9-t5-parity-acceptance-matrix.mjs`
- Output: `debug/p9-hf9-t5-parity-acceptance-matrix-output.json`
- Base URL: `http://127.0.0.1:4211`

## Covered Gates

- canonical server video endpoint (`/api/final-stream/video`)
- `/output/final` receiver-only stream page (no scripts)
- lifecycle-aware compositor always-on gate (`health.compositorAlwaysOn === true`)
- producer lifecycle signals active (`running/watchdog/timer`)
- zero/short/normal cadence checks (short-window false-negative tolerated, normal-window progression required)
- immediate mutation visibility (`start`, `board-switch`, `align-on`, `stop`, `align-off`)
- visual-only stream purity (no diagnostics overlays)
- latency gate PASS (`maxObservedMs <= hardLimitMs`)

## Result

- PASS (`pass: true`)
- Explicit always-on gate: `compositorAlwaysOn: true`
- Ack max latency: `8ms`
- Stream visibility max latency: `1ms`
- Latency gate: PASS (`maxObservedMs: 2`, `hardLimitMs: 1200`)
