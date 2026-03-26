# P7-T13 Non-Regression Matrix

- Scope: room/cluster lifecycle, align sync contract, audio-role routing invariants, persistence endpoint/schema stability.
- Script: `node debug/p7-t13-non-regression.mjs`

## Result

- PASS (Plan 7-HF1): Behavior-level matrix is executable and validated for required dimensions.

## Behavior Matrix Coverage

- Room lifecycle: Start, Edit, Stop (PASS)
- Cluster lifecycle: Start, Edit, Stop (PASS)
- Align mode: Start, Clear interaction, Stop (PASS)
- Audio role routing: control + final-output role visibility in live telemetry (PASS)
- Persistence: Save + Reload parity through `/api/global-defaults` (PASS)
- Reload/Rejoin parity: live-hello snapshot version equals current session version after reconnect (PASS)

## Evidence

- Command: `TT_BEAMER_BASE_URL=http://127.0.0.1:4273 node debug/p7-t13-non-regression.mjs`
- Output: `debug/p7-hf1-t13-output.json`

## Open Verify Gap

- Closed in Plan 7-HF1-T2.
