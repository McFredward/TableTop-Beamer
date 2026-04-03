# Phase 9 Plan (Replanned after mandatory outside-lifecycle P0 bugfix)

## Acceptance Correction
- User correction remains binding: Plan 9-1 is executed but not accepted.
- Plan 9-HF1, 9-HF2, and 9-HF3 remain completed as foundations.
- New mandatory execution wave is Plan 9-HF4 and supersedes 9-2 as immediate next step.

## New Mandatory Runtime Feedback (binding)
1. Starting a new room animation currently restarts outside sandstorm from the beginning.
2. Outside sandstorm lifecycle must be fully independent from room animation start/stop events and from other animation scopes generally.

## Target State
Phase 9 now closes with outside playback state isolated from room/cluster/global trigger lifecycles, no outside media cache reset on unrelated starts, deterministic sync preserved, and existing stop/clear semantics unchanged.

## Binding Architecture Decisions
- Preserve HF1 module boundaries; lifecycle fixes land in runtime/lifecycle modules, not as new monolith blocks.
- Outside playback state ownership is explicit and scope-isolated: room/cluster/global-inside starts must never reset outside playback cursor or cache.
- Outside cache invalidation is narrowed to legitimate outside lifecycle transitions only (outside stop/clear/reset or outside asset/config mutation).
- Existing stop/clear semantics remain authoritative: `stop outside` and `clear all` still stop outside immediately and deterministically.
- Deterministic sync contract stays binding: idempotent apply, version monotonicity, and no optimistic drift.

## Scope (9-HF4)
- Isolate outside video playback state from room/cluster/global-inside trigger lifecycle and dispatch paths.
- Prevent outside media cache/reset from unrelated starts while preserving legitimate outside teardown paths.
- Preserve deterministic sync and existing stop/clear semantics without behavior broadening.
- Add targeted regression coverage proving no outside restart during repeated room starts.
- Produce reproducible evidence artifacts for lifecycle independence and non-regression.

## Out of Scope
- New operator-facing features or UI redesign.
- Protocol redesign or non-essential server API changes.
- Behavior changes to intentional outside stop/clear/reset semantics.
- Cosmetic tuning without measurable lifecycle stability impact.

## Prioritized Next Execution Wave (Plan 9-HF4, execute-ready, hard-gated)
1. Root-cause map current coupling path where room animation start restarts outside sandstorm playback.
2. Refactor runtime ownership so outside playback state/cache lifecycle is decoupled from room/cluster/global-inside triggers.
3. Guard cache/reset paths so unrelated starts cannot invalidate outside media state.
4. Validate deterministic sync invariants remain unchanged under HF4 lifecycle isolation.
5. Verify existing stop/clear semantics remain unchanged for outside lifecycle endpoints.
6. Execute repeated room-start regression matrix proving no outside restart and record evidence.
7. Close only after full artifact synchronization and explicit gate PASS.

## Milestones
1. M1 Coupling Root-Cause Locked: restart path from room start into outside lifecycle is identified and bounded.
2. M2 Lifecycle Isolation Fix: outside playback cursor/cache survive unrelated room/cluster/global-inside starts.
3. M3 Cache Reset Guard: outside cache resets only on outside-scoped stop/clear/reset/config mutation.
4. M4 Determinism Preservation: ordering/version/idempotent apply remains unchanged.
5. M5 Semantics Preservation: outside stop/clear behavior remains deterministic and unchanged.
6. M6 Evidence Closure: repeated room-start regression matrix passes with documented traces.

## Regression/Evidence Matrix Policy
- Outside-independence repeat test: start outside sandstorm, repeatedly start room animations; outside playback must continue without restart/rewind.
- Scope-crossing lifecycle test: run room, cluster, and global-inside starts while outside is active; no outside restart/cursor reset allowed.
- Outside-stop/clear semantics test: explicit outside stop and `clear all` still terminate outside deterministically.
- Cache-reset guard test: outside cache reset only on outside-scoped reset events, not on unrelated starts.
- Deterministic sync test: cross-client ordering/version/idempotent apply parity remains stable under HF4 changes.

## Definition of Done
- Outside sandstorm playback lifecycle is independent from room/cluster/global-inside animation start/stop events.
- Outside media cache is not reset by unrelated starts.
- Existing outside stop/clear semantics remain deterministic and unchanged.
- Deterministic sync invariants remain intact with no ordering/version regressions.
- Regression/evidence matrix is PASS, including repeated room-start proof of no outside restart.
- Phase-09 and global planning artifacts are synchronized.

## Execution Update

- Plan 9-1 remains documented but not accepted.
- Plan 9-HF1 remains completed foundation (`src/app.js`: 12163 -> 28 lines).
- Plan 9-HF2 is completed with lifecycle no-replay reconciliation, frame-budget hardening, and PASS evidence (`P9-HF2-T6-SYNC-INVARIANTS.md`, `P9-HF2-T7-LONG-RUN-SOAK.md`, `P9-HF2-T8-LOW-END-STRESS.md`).
- Plan 9-HF3 is completed with PASS evidence (`9-HF3-SUMMARY.md`, `P9-HF3-REGRESSION-EVIDENCE.md`).
- Plan 9-HF4 is completed PASS with outside lifecycle independence evidence; Plan 9-2 is unblocked.
