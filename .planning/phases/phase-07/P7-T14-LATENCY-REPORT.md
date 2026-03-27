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

## Refreshed Evidence (Plan 7-HF7)

- `debug/p7-hf7-t12-output.json`
- `debug/p7-hf7-t13-output.json`
- `debug/p7-hf7-t14-output.json`

Hotfix closure note: HF7 confirms stop-only routing, idempotent server stop semantics, immediate stop snapshot propagation, and room/global/cluster stop parity (incl. anim-id non-increment) on top of HF6 residue elimination, HF5 align/context determinism, HF4 draft-immutability, HF3 trigger/audio/stagger determinism, and HF2 polling correctness. Production SLO sign-off for Phase 7 still requires dedicated live multi-device latency capture.
