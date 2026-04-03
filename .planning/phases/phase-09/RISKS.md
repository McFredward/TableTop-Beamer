# Phase 9 Risks

## Acceptance Correction Context
- 9-1 is not accepted; 9-HF1 is completed foundation.
- 9-HF2 and 9-HF3 are completed baselines.
- 9-HF4 is the binding runtime bugfix wave for outside lifecycle independence.

## R1 Outside lifecycle still coupled to room/cluster/global-inside starts
- Risk: room/cluster/global-inside animation starts still touch outside playback lifecycle and cause restart/rewind.
- Impact: Critical.
- Mitigation: strict runtime ownership split with outside lifecycle state isolated from non-outside scopes.

## R2 Outside media cache resets on unrelated starts
- Risk: cache invalidation paths are too broad and reset outside media on room-start side effects.
- Impact: Critical.
- Mitigation: narrow reset guards to outside-scoped lifecycle events only.

## R3 Fix masks bug but breaks explicit outside stop/clear semantics
- Risk: decoupling outside lifecycle accidentally weakens `stop outside` or `clear all` guarantees.
- Impact: Critical.
- Mitigation: explicit teardown tests ensure stop/clear remain immediate and deterministic.

## R4 Sequence-specific flake remains under repeated room starts
- Risk: no-restart behavior passes single run but fails in repeated start loops.
- Impact: Critical.
- Mitigation: mandatory repeated-room-start matrix with long-loop assertions on playback continuity.

## R5 Hidden cross-scope lifecycle coupling remains in cluster/global-inside paths
- Risk: room path is fixed but cluster/global-inside paths still trigger outside restart side effects.
- Impact: Critical.
- Mitigation: cross-scope start/stop regression tests while outside is active.

## R6 Lifecycle isolation introduces non-deterministic cross-client behavior
- Risk: lifecycle branching diverges across clients and breaks sync determinism.
- Impact: Critical.
- Mitigation: keep server-authoritative lifecycle semantics unchanged; validate ordering/version/idempotent apply invariants.

## R7 Artifact drift across phase/global trackers
- Risk: phase files and global tracking files become inconsistent.
- Impact: High.
- Mitigation: mandatory full artifact sync in P9-HF4-T7.

## R8 Regression escape under operator real usage loops
- Risk: short smoke tests pass but repeated starts in live operation still rewind outside.
- Impact: Critical.
- Mitigation: mandatory repeated-room-start and cross-scope lifecycle evidence as closure gate.

## Execution Notes

- 9-HF1 baseline is complete and remains valid for modular ownership.
- 9-HF2 is completed and remains valid baseline for lifecycle no-replay and low-end hardening.
- 9-HF3 is completed and remains valid baseline for mapping/mixed-media/weak-hardware/fail-feedback.
- 9-HF4 gates are PASS; R1-R8 are mitigated by lifecycle isolation + repeated-room-start evidence (`9-HF4-VERIFICATION.md`).
