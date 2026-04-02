# Phase 9 Plan (Replanned after long-run stability feedback)

## Acceptance Correction
- User correction remains binding: Plan 9-1 is executed but not accepted.
- Plan 9-HF1 remains completed as foundation (monolith reduction + modular seams).
- New mandatory execution wave is Plan 9-HF2 and supersedes 9-2 as immediate next step.

## Mandatory Stability Feedback (binding)
1. Browser reload currently replays expired one-shot events (for example `Intruder Alert`, `Power Outage`); this must stop.
2. Under sustained load, stability degrades on weak mobile devices; robust load hardening is mandatory without feature regression.

## Target State
Phase 9 now closes with lifecycle-correct and load-hardened runtime behavior on top of the completed modular refactor. Expired events are reconciled as completed during rehydrate/reconnect and never replayed. Runtime remains deterministic across clients while adding frame-budget aware shedding/caps/coalescing for low-end devices so long-run operation stays stable.

## Binding Architecture Decisions
- Preserve HF1 module boundaries; stability fixes land in dedicated lifecycle/runtime modules, not as new monolith blocks.
- Event lifecycle ownership is explicit: create -> active -> expired/completed -> persisted -> rehydrated as terminal when elapsed.
- One-shot event replay guard is mandatory on both reload and reconnect paths.
- Rehydrate must reconcile against authoritative timing/version context before event scheduling.
- Performance hardening uses deterministic degradation ladders (caps/coalescing/shedding) and must not alter sync correctness.
- Deterministic sync contract stays binding: idempotent apply, version monotonicity, no optimistic drift.

## Scope (9-HF2)
- Fix lifecycle rehydrate correctness so expired one-shot events stay terminal after reload/reconnect.
- Add explicit no-replay guards for elapsed one-shot events in runtime/event scheduler paths.
- Introduce frame-budget aware load shedding and particle/effect caps for weak/mobile devices.
- Add coalescing for non-critical visual updates under pressure while preserving semantic outcomes.
- Preserve deterministic multi-client sync and lifecycle parity under hardening paths.
- Produce long-run and mobile evidence matrix with reproducible PASS criteria.

## Out of Scope
- New operator-facing features or UI redesign.
- Protocol redesign or non-essential server API changes.
- Non-deterministic adaptive behavior that can diverge across clients.
- Cosmetic tuning without measurable stability impact.

## Prioritized Next Execution Wave (Plan 9-HF2, execute-ready, hard-gated)
1. Implement rehydrate lifecycle reconciliation for event terminal states, including elapsed one-shot expiry restoration.
2. Add strict replay suppression so expired one-shot events are never re-enqueued on reload/reconnect.
3. Harden runtime load handling with frame-budget guards, particle/effect caps, and update coalescing for low-end profiles.
4. Keep deterministic sync invariant intact (ordering/version/idempotent apply unchanged).
5. Execute long-run soak plus low-end mobile stress matrix with evidence artifacts.
6. Close only after full artifact synchronization and explicit gate PASS.

## Milestones
1. M1 Rehydrate Lifecycle Correctness: expired/terminal events are restored correctly and never replayed.
2. M2 One-Shot Replay Guard: reload/reconnect paths enforce no-replay for elapsed one-shot events.
3. M3 Runtime Load Hardening: frame-budget aware shedding/caps/coalescing active for weak devices.
4. M4 Determinism Preservation: sync behavior remains version-stable and idempotent under hardening.
5. M5 Evidence Closure: long-run + mobile regression matrix passes with documented traces.

## Regression/Evidence Matrix Policy
- Long-run soak: repeated trigger/start/stop/clear/reload cycles with elapsed-event checkpoints.
- Rehydrate correctness: restart/rejoin/reload at multiple event ages (pre-expiry, at-expiry, post-expiry).
- Mobile constraints: low-end budget runs validate frame stability and graceful degradation without crashes.
- Deterministic sync: cross-client parity checks for lifecycle/version ordering under pressure.
- Final-output parity: `/output/final` remains lifecycle-correct with no expired event replay artifacts.

## Definition of Done
- Expired one-shot events are terminal after reload/reconnect and never replay.
- Event lifecycle reconciliation is deterministic across local rehydrate and synced rejoin.
- Runtime remains stable under long-run load, including weak mobile devices, via controlled load shedding.
- Deterministic sync invariants remain intact with no ordering/version regressions.
- Regression/evidence matrix is PASS for long-run and mobile constraints.
- Phase-09 and global planning artifacts are synchronized.

## Execution Update

- Plan 9-1 remains documented but not accepted.
- Plan 9-HF1 remains completed foundation (`src/app.js`: 12163 -> 28 lines).
- Plan 9-HF2 is completed with lifecycle no-replay reconciliation, frame-budget hardening, and PASS evidence (`P9-HF2-T6-SYNC-INVARIANTS.md`, `P9-HF2-T7-LONG-RUN-SOAK.md`, `P9-HF2-T8-LOW-END-STRESS.md`).
