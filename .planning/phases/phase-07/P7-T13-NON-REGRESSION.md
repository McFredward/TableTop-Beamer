# P7-T13 Non-Regression Matrix

- Scope: polling-deterministic room/global lifecycle with 3-4 clients, `/output/final` participation, snapshot trigger revision parity, explicit-stop gating, stagger-offset replication/parity, ghost-state elimination, and command/snapshot gate visibility.
- Script: `node debug/p7-t13-non-regression.mjs`

## Result

- PASS (Plan 7-HF3): Deterministic room/global start-stop behavior incl. trigger revision parity, explicit-stop-only global teardown, and sequential stagger offset replication is reproducible across 4 polling clients including `/output/final`.

## Behavior Matrix Coverage

- `/output/final` route availability in deterministic polling workflow (PASS)
- Shared context command visible on all polling clients (PASS)
- Room animation start visible on all 4 polling clients (PASS)
- Room animation stop visible on all 4 polling clients (PASS)
- Global trigger revision/key parity visible on all 4 polling clients (PASS)
- Global trigger remains active without explicit stop snapshot (PASS)
- Explicit global stop removes runtime entry and records stop revision in snapshot runtime map (PASS)
- Room-draft stagger config (`staggerStart`, `staggerOffsetMs`) replicated via snapshot runtime state (PASS)
- Sequential stagger member delay map parity (`memberStartDelays`) across all polling clients (PASS)
- Burst start sequence followed by `clear-all` leaves zero residual animations (ghost-state elimination, PASS)
- Telemetry exposes command/snapshot gate counters (`commandAccepted`, `snapshotVersionVisible`) (PASS)

## Evidence

- Command: `TT_BEAMER_BASE_URL=http://127.0.0.1:4173 node debug/p7-t13-non-regression.mjs`
- Output: `debug/p7-hf3-t13-output.json`

## Open Verify Gap

- None for HF3 snapshot trigger/audio/stagger gate.
