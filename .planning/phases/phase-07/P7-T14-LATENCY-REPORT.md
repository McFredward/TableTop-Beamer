# P7-T14 Latency Compliance Report

## Data Source

- Endpoint: `/api/live/telemetry`
- Script: `node debug/p7-t14-latency-report.mjs`
- Hop metrics: `ingestToCommit`, `commitToClientAck`, `commitToApplyAck`

## Targets

| Metric | Target |
| --- | --- |
| E2E input-to-final-apply P95 | <= 180 ms |
| Stop-to-audio-silence P95 | <= 120 ms |
| Stop-to-visual-clear P95 | <= 150 ms |
| GIF trigger-to-first-frame P95 | <= 220 ms |

## Current Status

- Instrumentation wired and queryable.
- Polling pivot metrics now include command/snapshot gates (`commandAccepted`, `snapshotVersionVisible`, `snapshotApplied`).
- Final target pass/fail for production SLO still requires dedicated live multi-device run capture.

## Refreshed Evidence (Plan 7-HF8)

- `debug/p7-hf8-t12-output.json`
- `debug/p7-hf8-t13-output.json`
- `debug/p7-hf8-t14-output.json`

Hotfix closure note: HF8 confirms global-outside stop parity (inkl. authoritative outside disable convergence), unified global stop semantics server/client, and running-list hover stability, in addition to previously closed HF7/HF6/HF5/HF4/HF3/HF2 gates. Production SLO sign-off for Phase 7 still requires dedicated live multi-device latency capture.
