# P7-T13 Non-Regression Matrix

- Scope: polling-deterministic room/global lifecycle with 3-4 clients, `/output/final` participation, snapshot trigger revision parity, explicit-stop gating, stagger-offset replication/parity, ghost-state elimination, command/snapshot gate visibility, plus HF4 room/cluster draft stability, HF5 align roundtrip + board-switch running-clear no-residue parity, HF6 switch+reconnect residue-zero invariant, and HF7 room/global/cluster stop parity with anim-id non-increment invariant.
- Script: `node debug/p7-t13-non-regression.mjs`

## Result

- PASS (Plan 7-HF7): Deterministic room/global/cluster stop behavior remains reproducible across 4 polling clients; HF4/HF5/HF6 guards stay stable, and HF7 stop parity + anim-id non-increment invariants pass including `/output/final`.

## Behavior Matrix Coverage

- `/output/final` route availability in deterministic polling workflow (PASS)
- HF5 align ON visible via server-authoritative `context-update` snapshot on all clients incl. `/output/final` (PASS)
- HF5 align OFF roundtrip remains deterministic on all polling clients (PASS)
- Shared context command visible on all polling clients (PASS)
- HF4 draft baseline replication (`animation/target/sliders`) without drift (PASS)
- Room animation start visible on all 4 polling clients (PASS)
- HF4 room-start no-jump proof (`animation`/`target`/sliders stable; no fallback to `Malfunction` or `cluster`) (PASS)
- Room animation stop visible on all 4 polling clients (PASS)
- HF7 room-stop invariant: no unexpected new animation IDs after stop (no increment/retrigger) (PASS)
- Global trigger revision/key parity visible on all 4 polling clients (PASS)
- Global trigger remains active without explicit stop snapshot (PASS)
- Explicit global stop removes runtime entry and records stop revision in snapshot runtime map (PASS)
- HF7 global-stop invariant: stop via `stop-animation` keeps anim-id non-increment parity on all clients (PASS)
- Room-draft stagger config (`staggerStart`, `staggerOffsetMs`) replicated via snapshot runtime state (PASS)
- Sequential stagger member delay map parity (`memberStartDelays`) across all polling clients (PASS)
- HF4 cluster-start draft target stability retained (PASS)
- Cluster stop propagates from controller run to all member runs on all clients incl. `/output/final` (PASS)
- HF7 cluster-stop invariant: no unexpected new animation IDs after stop (PASS)
- HF4 source-level parity check: room-click target autofill remains target-only (`targetType`/`targetId`) (PASS)
- Burst start sequence followed by `clear-all` leaves zero residual animations (ghost-state elimination, PASS)
- HF5 board-switch atomically clears running list on all polling clients (PASS)
- HF5 reconnect snapshot parity: no stale running rehydration after board switch (PASS)
- HF6 residue invariant: `crossBoardResidueCount = 0` after board switch + reconnect across all clients incl. final-output (PASS)
- HF7 matrix closure: room/global/cluster stop parity holds across control + `/output/final` clients (PASS)
- Telemetry exposes command/snapshot gate counters (`commandAccepted`, `snapshotVersionVisible`) (PASS)

## Evidence

- Command: `TT_BEAMER_BASE_URL=http://127.0.0.1:4318 node debug/p7-t13-non-regression.mjs`
- Output: `debug/p7-hf7-t13-output.json`

## Open Verify Gap

- None for HF4/HF5/HF6/HF7 gate coverage.
