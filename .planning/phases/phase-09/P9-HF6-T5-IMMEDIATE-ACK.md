# P9-HF6-T5 - Immediate acknowledgement semantics (stream on/off)

## Objective

Verify strict ack responsiveness parity for start/stop across stream mode ON/OFF.

## Evidence

- Script: `debug/p9-hf6-t5-immediate-ack-matrix.mjs`
- Output: `debug/p9-hf6-t5-immediate-ack-matrix-output.json`

## Result (PASS)

30 start/stop samples per mode:

- **Stream mode**
  - Start ack p95: `6ms`
  - Stop ack p95: `6ms`
- **Client mode**
  - Start ack p95: `7ms`
  - Stop ack p95: `6ms`

All accepted commands were applied with no overflow/timeout in the verification matrix.
