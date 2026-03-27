# Phase 7 Workspace

Planning and execution workspace for the multi-device sync overhaul focused on deterministic low-latency behavior across controller clients and `/output/final`.

- `PLAN.md`: target state, architecture decisions, latency targets, and rollout strategy for Phase 7.
- `BACKLOG.md`: epics and story mapping for event pipeline hardening, deterministic apply/stop, output-first runtime path, and observability.
- `TASKS.md`: prioritized execution waves; Plan 7-1 is the first execute-ready wave.
- `ACCEPTANCE.md`: mandatory quality matrix for end-to-end latency, ordering/ack/dedup semantics, render/audio responsiveness, and non-regression.
- `RISKS.md`: key risks for ordering races, ack/backpressure drift, stale apply, telemetry overhead, and compatibility regressions.
- `EXECUTE.md`: binding execution order and gates.

## Status

- Phase 7 remains active.
- Plan 7-1 and hotfix waves 7-HF1..7-HF6 are executed with synchronized evidence artifacts.
- Plan 7-HF6 closes the residue-elimination blocker gate with authoritative atomic switch-clear transactions, pre-broadcast snapshot sanitization, and reconnect board-context filtering.
- Deterministic HF6 evidence confirms `crossBoardResidueCount = 0` after switch+reconnect across 4 polling clients including `/output/final` (`debug/p7-hf6-*`).
- Next planned wave is Plan 7-2 hardening.
