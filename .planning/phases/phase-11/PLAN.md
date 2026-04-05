# Phase 11 Plan (Hotfix Wave: 11-HF6 Non-Loop Polling/Hydration One-Shot Playback Guarantee)

## Planning Mode Note
- Plan 11-1, 11-HF1, 11-HF2, 11-HF3, and 11-HF4 remain historical implementation baselines (`11-1-*`, `11-HF1-*`, `11-HF2-*`, `11-HF3-*`, `11-HF4-*`).
- Plan 11-HF5 remains implemented but is field-invalidated by critical P0 follow-up behavior under polling/hydration.
- Plan 11-HF6 is now the execute-ready priority wave and blocks Plan 11-2.

## Mandatory Objectives (binding)
1. Ensure that once a client sees a non-loop global trigger revision, it plays locally exactly once for the full configured duration.
2. Ensure polling snapshots cannot prematurely cancel a started non-loop run unless an explicit stop/clear revision is received.
3. Keep loop-mode behavior unchanged.
4. Keep explicit `stop` and `clear` semantics authoritative and immediate.
5. Add deterministic multi-client tests for seen-once -> full local playback under polling/hydration timing pressure.
6. Produce strict FAIL->PASS evidence across initiator + peers + `/output/final`.

## Target State
Phase 11 exits HF6 with non-loop global animations guaranteed to complete full local one-shot playback once started from a seen revision, immune to polling/hydration premature cancellation except explicit stop/clear revisions, while loop behavior remains unchanged.

## Binding Product Decisions
- Non-loop trigger revisions are server-authoritative; once observed by a client they establish a local one-shot run contract that must complete exactly once for full configured duration.
- Polling/hydration snapshots may advance state but cannot cancel an already-started one-shot unless snapshot carries a newer explicit stop/clear revision.
- Loop and non-loop paths remain behaviorally distinct and loop semantics must not regress.
- Existing explicit `stop` and `clear` actions remain immediate and authoritative.
- HF6 scope is runtime lifecycle correctness under polling/hydration; no unrelated UX scope expansion.

## Scope (Plan 11-HF6, execute-ready)
- Isolate and fix polling/hydration interactions that cancel one-shot non-loop playback before visible completion.
- Enforce per-client seen-revision playback contract: seen once -> play once -> full duration.
- Gate cancellation paths so only explicit stop/clear revisions can terminate active one-shot playback early.
- Preserve loop behavior with explicit non-regression validation.
- Preserve authoritative stop/clear behavior with immediate effect.
- Add deterministic multi-client polling tests for seen-once full local playback on initiator/peers/`/output/final`.
- Synchronize all phase/global planning artifacts.

## Out of Scope
- New animation content packs beyond audio/loop control.
- Non-phase-11 UX redesign not required for the mandatory items.
- Protocol-family rewrite beyond deterministic lifecycle/audio fixes in scope.

## Prioritized Next Execution Wave (Plan 11-HF6, execute-ready)
1. Create deterministic RED repro where polling/hydration cancels a just-started non-loop run before full visible duration on peers/`/output/final`.
2. Isolate root-cause ordering between trigger revision observation and polling snapshot reconciliation.
3. Implement seen-revision local playback lock so started one-shot completes exactly once for full configured duration.
4. Enforce cancellation guard: ignore non-explicit snapshot cancellation of active one-shot runs.
5. Preserve loop-mode behavior via explicit start/sustain/stop non-regression matrix.
6. Preserve stop/clear authority via explicit immediate cancellation matrix.
7. Execute deterministic multi-client polling tests for seen-once -> full local playback parity.
8. Capture explicit FAIL->PASS evidence and synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Milestones
1. M1 Polling/Hydration Premature-Cancel Root-Cause Isolation Closure.
2. M2 Seen-Revision Full-Duration Exactly-Once Local Playback Contract Closure.
3. M3 Snapshot Cancellation Guard (explicit stop/clear only) Closure.
4. M4 Loop Non-Regression Closure.
5. M5 Stop/Clear Authority Non-Regression Closure.
6. M6 Deterministic Multi-Client Polling Evidence FAIL->PASS Closure.
7. M7 Artifact Sync Closure.

## Regression/Evidence Matrix Policy
- P11-HF6-NonLoop-PollingPrematureCancel-RED-Test
- P11-HF6-NonLoop-SeenRevision-FullDuration-ExactlyOnce-Test
- P11-HF6-NonLoop-PollingSnapshot-NoPrematureCancel-Test
- P11-HF6-Loop-Mode-NonRegression-Test
- P11-HF6-Global-Stop-Immediate-Authority-Test
- P11-HF6-Global-Clear-Immediate-Authority-Test
- P11-HF6-MultiClient-Polling-SeenOnce-FullPlayback-FAIL-PASS-Test

## Definition of Done
- All Plan 11-HF6 hard gates pass.
- Any client that sees a non-loop trigger revision completes exactly one full-duration local playback.
- Polling/hydration snapshots do not prematurely cancel started one-shots without explicit stop/clear revision.
- Loop behavior remains unchanged.
- Stop/clear semantics remain immediate and authoritative.
- Deterministic multi-client polling parity is closed with explicit FAIL->PASS evidence.
- Phase and global planning artifacts are synchronized (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Execution Closure (11-HF6)
- PASS: seen non-loop trigger revision now guarantees exactly-once full local playback once observed.
- PASS: polling/hydration snapshots cannot prematurely cancel started one-shots without explicit stop/clear authority.
- PASS: loop mode and stop/clear behavior are non-regressed.
- PASS: deterministic multi-client FAIL->PASS evidence is closed for initiator + peers + `/output/final`.
