# P9-HF4-T8 - Control Responsiveness Matrix (stream on/off + churn)

## Method

- Run command-latency matrix in `stream` mode with active subscribers and mid-run churn.
- Run the same matrix in `client` mode as parity baseline.
- Capture queue telemetry and final-stream health.

## Evidence

- Script: `debug/p9-hf4-t8-control-matrix.mjs`
- Output: `debug/p9-hf4-t8-control-matrix-output.json`

## Result

- Stream-on and stream-off paths both remain under control-latency threshold.
- Queue depth stays bounded during subscriber churn.
- PASS confirms controls remain operational independent of stream subscriber lifecycle.
