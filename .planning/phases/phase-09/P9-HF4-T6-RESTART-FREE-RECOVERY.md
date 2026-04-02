# P9-HF4-T6 - Restart-Free Recovery for Stream Fault Paths

## Method

- Connect stream subscriber A, run mutation burst, capture health.
- Drop subscriber A, reconnect as subscriber B without restarting server.
- Run second mutation burst and verify health + queue telemetry.

## Evidence

- Script: `debug/p9-hf4-t6-restart-free-recovery.mjs`
- Output: `debug/p9-hf4-t6-restart-free-recovery-output.json`

## Result

- Producer remains running across disconnect/reconnect cycles.
- Stream health recovers after reconnect with advancing source version.
- No server restart is required to continue command and stream operation.
