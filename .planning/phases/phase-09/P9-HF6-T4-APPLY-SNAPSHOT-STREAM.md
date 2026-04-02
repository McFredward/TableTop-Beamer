# P9-HF6-T4 - Immediate apply + snapshot + stream propagation verification

## Objective

Validate that accepted start/stop commands under stream mode immediately:

1. Ack from server,
2. Update authoritative snapshot version,
3. Propagate to `/api/final-stream/events` frame stream.

## Evidence

- Script: `debug/p9-hf6-t4-apply-snapshot-stream.mjs`
- Output: `debug/p9-hf6-t4-apply-snapshot-stream-output.json`

## Result (PASS)

- Start command:
  - Ack latency: `9ms`
  - Snapshot wait: `5ms` (version `1403`)
  - Stream frame wait: `11ms` (sourceVersion `1403`)
- Stop command:
  - Ack latency: `6ms`
  - Snapshot wait: `5ms` (version `1404`)
  - Stream frame wait: `2ms` (sourceVersion `1404`)

Ack, snapshot mutation, and stream visibility move in immediate version-aligned sequence.
