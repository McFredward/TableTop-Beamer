# Phase 11 Acceptance

## Verification Strategy
- Recovery first: polling/hydration premature-cancel of non-loop one-shots is root-caused and fixed.
- Runtime integrity first: once a client sees a non-loop trigger revision, local playback completes exactly once for full configured duration.
- Integrity guard first: polling snapshots cannot terminate active one-shot playback unless explicit stop/clear revision is observed.
- Non-regression first: loop mode behavior remains unchanged.
- Safety first: existing `stop`/`clear` behavior remains unchanged and deterministic.
- Evidence first: deterministic FAIL->PASS proof demonstrates seen-once full-playback parity on initiator + peers + `/output/final` under polling.

## Hard Gates (Plan 11-HF6, mandatory)
- G11-HF6-1 NonLoop-PollingHydration-RootCause-Gate: root cause for one-shot premature cancellation under polling/hydration is isolated and documented.
- G11-HF6-2 NonLoop-SeenRevision-LocalPlayback-Contract-Gate: client-local seen-revision contract (play once, full duration) is implemented and proven.
- G11-HF6-3 NonLoop-NoPrematureSnapshotCancel-Gate: active one-shot is not canceled by polling snapshot without explicit stop/clear revision.
- G11-HF6-4 Loop-Mode-NonRegression-Gate: loop path remains behaviorally unchanged.
- G11-HF6-5 Global-Stop-Immediate-Authority-Gate: explicit stop remains immediate, deterministic, and authoritative.
- G11-HF6-6 Global-Clear-Immediate-Authority-Gate: clear-all remains immediate, deterministic, and authoritative.
- G11-HF6-7 MultiClient-Polling-SeenOnce-Parity-Gate: seen-once full-duration parity remains PASS across initiator + peers + `/output/final`.
- G11-HF6-8 Artifact-Sync-Gate: phase and global planning artifacts are fully synchronized.

## Strict Regression Matrix
- P11-HF6-NonLoop-PollingPrematureCancel-RED-Test
- P11-HF6-NonLoop-PollingHydration-RootCause-Test
- P11-HF6-NonLoop-SeenRevision-FullDuration-ExactlyOnce-Test
- P11-HF6-NonLoop-PollingSnapshot-NoPrematureCancel-Test
- P11-HF6-Loop-Mode-NonRegression-Test
- P11-HF6-Global-Stop-Immediate-Authority-Test
- P11-HF6-Global-Clear-Immediate-Authority-Test
- P11-HF6-MultiClient-Polling-SeenOnce-FullPlayback-FAIL-PASS-Test

## Incremental Mandatory Gates
- After P11-HF6-T1..T2: polling/hydration premature-cancel regression is reproduced and root-cause isolated.
- After P11-HF6-T3..T4: seen-revision playback contract is PASS and premature snapshot cancel is blocked.
- After P11-HF6-T5..T6: loop and stop/clear safety semantics are confirmed non-regressed.
- After P11-HF6-T7: strict multi-client polling FAIL->PASS parity evidence is complete.
- After P11-HF6-T8: artifact sync closure is complete.

## Definition of Done
- All hard gates G11-HF6-1..G11-HF6-8 are PASS.
- Any client that sees a non-loop trigger revision completes exactly one full-duration local playback.
- Polling snapshots never prematurely cancel started one-shot playback unless explicit stop/clear revision is received.
- Loop mode remains non-regressed.
- Stop/clear semantics remain immediate, deterministic, and authoritative.
- No regressions in deterministic multi-client polling parity for seen-once full-duration playback.
- Phase and global trackers are fully synchronized.

## Plan 11-HF6 Evidence Reference
- Verification report: `.planning/phases/phase-11/11-HF6-VERIFICATION.md`
- Static regression artifact: `debug/p11-hf6-acceptance-regression-output.json`

## HF6 Status
- HF6 execution closed: all gates G11-HF6-1..G11-HF6-8 are PASS (`11-HF6-VERIFICATION.md`, `debug/p11-hf6-acceptance-regression-output.json`).
