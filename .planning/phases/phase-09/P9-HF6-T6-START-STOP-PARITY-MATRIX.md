# P9-HF6-T6 - Strict start/stop parity matrix (stream ON/OFF)

## Scope

- Stream mode ON and client mode baseline.
- Multi-client control initiation (`control-a` / `control-b`).
- Start/stop propagation to snapshot and `/api/final-stream/events`.

## Evidence

- Script: `debug/p9-hf6-t6-start-stop-parity-matrix.mjs`
- Output: `debug/p9-hf6-t6-start-stop-parity-matrix-output.json`

## Result (PASS)

- 12 start/stop iterations per mode.
- Stream mode max timings:
  - start ack `2ms`, start snapshot `1ms`, start stream `1ms`
  - stop ack `2ms`, stop snapshot `1ms`, stop stream `0ms`
- Client mode max timings:
  - start ack `1ms`, start snapshot `1ms`, start stream `0ms`
  - stop ack `1ms`, stop snapshot `1ms`, stop stream `1ms`

Control parity is deterministic for stream ON/OFF with immediate propagation to snapshot + stream consumers.
