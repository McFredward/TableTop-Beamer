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
- Final target pass/fail requires live multi-device run capture (controller + final-output) with production-like burst traffic.
- PASS (Plan 7-HF1 evidence refresh): verifier/schema and behavior-matrix blockers are closed and artifacts regenerated.

## Refreshed Evidence (Plan 7-HF1)

- `debug/p7-hf1-t12-output.json`
- `debug/p7-hf1-t13-output.json`
- `debug/p7-hf1-t14-output.json`

Hotfix closure note: this PASS confirms verifier integrity + evidence freshness. Production SLO sign-off for Phase 7 still requires dedicated multi-device latency capture.
