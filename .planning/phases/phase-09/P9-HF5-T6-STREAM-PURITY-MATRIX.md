# P9-HF5-T6 - Stream Purity Regression Matrix

## Method

- Ran isolated server (`PORT=4174`).
- Opened primary SSE subscriber plus churn subscribers.
- For each board (`nemesis-board-a`, `nemesis-board-b`, `nemesis-lockdown-a`):
  - Forced stream mode via `context-update`.
  - Triggered outside animation and captured stream frame.
  - Asserted strict visual-only payload contract and no overlay text fields.
  - Executed subscriber churn (join/leave) during matrix run.

## Evidence

- Script: `debug/p9-hf5-t6-stream-purity-matrix.mjs`
- Output: `debug/p9-hf5-t6-stream-purity-matrix-output.json`

## Assertions

- No forbidden top-level or visual keys.
- No legacy overlay fields (`mode`, `board.label`, `roomLabel`).
- No payload text leak (`SERVER STREAM ACTIVE`).
- Visual block exists on every frame and command latency remains bounded.

## Result

- Board coverage: `3/3` PASS.
- Contract checks: PASS for all matrix rows.
- Stream health: PASS (`healthy=true`).

## Conclusion

Mandatory stream-purity matrix is PASS across stream mode, subscriber churn, and board/profile coverage.
