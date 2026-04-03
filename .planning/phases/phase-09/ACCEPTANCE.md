# Phase 9 Acceptance

## Acceptance Correction
- Binding correction: Plan 9-1 is not accepted.
- Plan 9-HF1, 9-HF2, and 9-HF3 are completed baselines, but not final closure.
- New mandatory closure target is Plan 9-HF4 with hard gates below.

## Regression and Verification Strategy
- Independence-first: outside sandstorm playback lifecycle must remain independent from room/cluster/global-inside start/stop events.
- Cache-guard-first: outside media cache/reset must not be triggered by unrelated starts.
- Semantics-first: existing outside stop/clear semantics must remain deterministic and unchanged.
- Determinism-first: sync ordering/version/idempotent apply invariants remain unchanged.
- Evidence-first: every HF4 P0 item requires reproducible lifecycle/regression evidence.

## Hard Gates (Plan 9-HF4, mandatory)
- G1 Outside-Lifecycle-Independence-Gate: starting/stopping room/cluster/global-inside animations never restarts or rewinds active outside sandstorm playback.
- G2 Outside-Cache-Reset-Guard-Gate: outside media cache/reset is not triggered by unrelated starts.
- G3 Stop-Clear-Semantics-Preservation-Gate: existing outside `stop` and `clear all` semantics stay deterministic and unchanged.
- G4 Deterministic-Sync-Integrity-Gate: ordering/version/idempotent apply behavior remains intact under HF4 hotfix paths.
- G5 Strict-Regression-Gate: full repeated-room-start + cross-scope + stop/clear + sync matrix below must be PASS with evidence.

## Strict Regression Matrix (Plan 9-HF4)
- Outside-Sandstorm-No-Restart-Repeat-Test: start outside sandstorm once, repeatedly start room animations; outside playback must not restart/rewind.
- Cross-Scope-Independence-Test: with outside active, execute room/cluster/global-inside starts and stops; outside playback position must remain continuous unless explicitly stopped/cleared.
- Outside-Cache-Guard-Test: assert no outside cache invalidation/reset on unrelated starts; reset allowed only for outside-scoped lifecycle events.
- Outside-Stop-Semantics-Test: explicit outside stop still halts outside deterministically and immediately.
- Clear-All-Semantics-Test: `clear all` still halts outside deterministically and immediately.
- Deterministic-Sync-Under-HF4-Test: multi-client ordering/version/apply invariants remain stable under HF4 lifecycle isolation code paths.
- Non-Regression-Full-Matrix-Test: core operator workflows and `/output/final` remain functionally equivalent.

## Incremental Mandatory Gates
- After P9-HF4-T1..T2: outside lifecycle coupling path is reproduced and isolation fix is validated.
- After P9-HF4-T3: outside cache reset guard is validated against unrelated starts.
- After P9-HF4-T4: stop/clear semantics are validated as unchanged.
- After P9-HF4-T5: deterministic sync invariants are PASS under HF4 conditions.
- After P9-HF4-T6..T7: full matrix is PASS with evidence and all phase/global planning artifacts are synchronized.

## Definition of Done
- Outside sandstorm lifecycle is independent from room/cluster/global-inside start/stop events.
- Outside media cache is not reset by unrelated starts.
- Existing outside stop/clear semantics remain deterministic and unchanged.
- Deterministic sync remains intact under load and HF4 fix paths.
- HF4 lifecycle independence evidence matrix is PASS and documented.
- Phase-09 artifacts and global tracking files are synchronized.

## Plan 9-1 Closure Note

- 9-1 evidence remains documented in `9-1-VERIFICATION.md`.
- Acceptance status is corrected to NOT ACCEPTED; closure now depends on post-HF3/4 hard gates.

## Plan 9-HF1 Closure Note

- Hard reduction gate achieved: `src/app.js` reduced from 12163 to 28 lines.
- Mandatory extraction artifacts are documented in `9-HF1-BOUNDARY-MAP.md` and `9-HF1-VERIFICATION.md`.

## Plan 9-HF2 Closure Note

- 9-HF2 closure is PASS and remains valid baseline for lifecycle no-replay + low-end hardening.

## Plan 9-HF3 Closure Note

- 9-HF3 closure is PASS and remains valid baseline for mapping + mixed-media + weak-hardware + fail-feedback gates.
- Evidence remains in `9-HF3-SUMMARY.md` and `P9-HF3-REGRESSION-EVIDENCE.md`.

## Plan 9-HF4 Closure Target

- Closure requires explicit PASS evidence that repeated room starts do not restart outside sandstorm and that outside lifecycle/cache is isolated from unrelated scopes.
- Closure requires explicit PASS non-regression evidence that outside `stop` and `clear all` semantics are unchanged and deterministic.
- Gate status: PASS (`9-HF4-VERIFICATION.md`, `P9-HF4-T6-REPEATED-ROOM-START-REGRESSION.md`).
