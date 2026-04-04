# Phase 11 Acceptance

## Verification Strategy
- Recovery first: initiator-only non-loop global sync failure is root-caused and fixed.
- Runtime integrity first: one-shot global trigger is server-authoritative and reaches initiator + peers + `/output/final` exactly once for full intended duration.
- Integrity guard first: local-only optimistic one-shot rendering cannot mask distributed sync failures.
- Non-regression first: loop mode behavior remains unchanged.
- Safety first: existing `stop`/`clear` behavior remains unchanged and deterministic.
- Evidence first: FAIL->PASS proof demonstrates one-shot duration parity on initiator + peers + `/output/final`.

## Hard Gates (Plan 11-HF5, mandatory)
- G11-HF5-1 NonLoop-InitiatorOnly-RootCause-Gate: root cause for one-shot initiator-only sync failure is isolated and documented.
- G11-HF5-2 NonLoop-ServerAuthoritative-Replication-Gate: non-loop triggers are server-applied and replicated to initiator + peers + `/output/final`.
- G11-HF5-3 NonLoop-FullDuration-ExactlyOnce-MultiClient-Gate: one-shot globals complete full intended duration exactly once on all clients.
- G11-HF5-4 NonLoop-NoLocalOptimisticMasking-Gate: local-only optimistic trigger path is removed or guarded from masking distributed failures.
- G11-HF5-5 Loop-Mode-NonRegression-Gate: loop path remains behaviorally unchanged.
- G11-HF5-6 Global-Stop-NonRegression-Gate: explicit stop behavior remains deterministic and unchanged.
- G11-HF5-7 Global-Clear-NonRegression-Gate: clear-all behavior remains deterministic and unchanged.
- G11-HF5-8 MultiClient-OneShot-Parity-Gate: one-shot duration parity remains PASS across initiator + peers + `/output/final`.
- G11-HF5-9 Artifact-Sync-Gate: phase and global planning artifacts are fully synchronized.

## Strict Regression Matrix
- P11-HF5-NonLoop-InitiatorOnly-RED-Test
- P11-HF5-NonLoop-ServerApply-Fanout-RootCause-Test
- P11-HF5-NonLoop-ServerAuthoritative-ExactlyOnce-Replication-Test
- P11-HF5-NonLoop-NoLocalOptimisticMasking-Test
- P11-HF5-Loop-Mode-NonRegression-Test
- P11-HF5-Global-Stop-NonRegression-Test
- P11-HF5-Global-Clear-NonRegression-Test
- P11-HF5-MultiClient-OneShot-FullDuration-Parity-FAIL-PASS-Test

## Incremental Mandatory Gates
- After P11-HF5-T1..T2: initiator-only non-loop regression is reproduced and root-cause isolated.
- After P11-HF5-T3..T4: server-authoritative exactly-once replication is PASS and optimistic masking is blocked.
- After P11-HF5-T5..T6: loop and stop/clear safety semantics are confirmed non-regressed.
- After P11-HF5-T7: strict multi-client FAIL->PASS parity evidence is complete.
- After P11-HF5-T8: artifact sync closure is complete.

## Definition of Done
- All hard gates G11-HF5-1..G11-HF5-9 are PASS.
- Non-loop global animations are server-authoritative and replicate exactly once to initiator + peers + `/output/final` with full intended duration.
- No local optimistic one-shot path can produce local-only PASS.
- Loop mode remains non-regressed.
- Stop/clear semantics remain deterministic and unchanged.
- No regressions in multi-client parity for one-shot full-duration playback.
- Phase and global trackers are fully synchronized.

## Plan 11-HF5 Evidence Reference
- Verification report: `.planning/phases/phase-11/11-HF5-VERIFICATION.md`
- Static regression artifact: `debug/p11-hf5-acceptance-regression-output.json`

## HF5 Closure Status
- G11-HF5-1..G11-HF5-9: PASS
