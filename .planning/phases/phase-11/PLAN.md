# Phase 11 Plan (Hotfix Wave: 11-HF5 Non-Loop Global Multi-Client Sync Recovery)

## Planning Mode Note
- Plan 11-1, 11-HF1, 11-HF2, 11-HF3, and 11-HF4 remain historical implementation baselines (`11-1-*`, `11-HF1-*`, `11-HF2-*`, `11-HF3-*`, `11-HF4-*`).
- New critical P0 follow-up regression after HF4 reopens Phase 11 before 11-2.
- Plan 11-HF5 is now the execute-ready priority wave.
- Plan 11-HF5 execution is completed with PASS closure evidence (`11-HF5-VERIFICATION.md`).

## Mandatory Objectives (binding)
1. Isolate root cause for initiator-only non-loop global sync failure (command emission vs server apply vs snapshot fanout).
2. Ensure non-loop global triggers are server-authoritative and replicated exactly once to initiator, peers, and `/output/final`.
3. Remove/guard local-only optimistic render paths that can mask missing synchronization.
4. Preserve loop-mode behavior (no regression for global loop path).
5. Preserve explicit `stop` and `clear` semantics unchanged.
6. Produce strict multi-client FAIL->PASS evidence for full-duration one-shot parity across initiator + peers + `/output/final`.

## Target State
Phase 11 exits HF5 with non-loop global animations synchronized server-authoritatively to initiator, peers, and `/output/final`, playing full intended duration exactly once, while loop behavior and stop/clear semantics remain unchanged and evidence-backed.

## Binding Product Decisions
- Non-loop global trigger path is required to be server-authoritative and replicated exactly once to all clients (initiator + peers + `/output/final`) for full configured duration.
- Loop and non-loop global paths share deterministic lifecycle semantics but remain behaviorally distinct (repeat vs one-shot).
- Local-only optimistic one-shot rendering is not allowed to be the source of truth for sync correctness.
- Existing explicit `stop` and `clear` actions retain authority and lifecycle behavior.
- HF5 scope does not relax HF3 audio-toggle semantics; this wave focuses on non-loop multi-client synchronization recovery.

## Scope (Plan 11-HF5, execute-ready)
- Isolate root cause for post-HF4 initiator-only behavior where non-loop globals start only on initiating client.
- Trace and close the failing branch among command emission, server apply, and snapshot/event fanout.
- Implement deterministic fix so one-shot global trigger is server-applied and replicated exactly once across all clients.
- Remove or guard local optimistic one-shot trigger path to prevent false-local PASS masking distributed FAIL.
- Validate no regression in loop-mode path.
- Validate explicit stop/clear semantics remain unchanged.
- Run strict multi-client regression matrix focused on initiator/peer/`/output/final` one-shot duration parity.
- Synchronize all phase/global planning artifacts.

## Out of Scope
- New animation content packs beyond audio/loop control.
- Non-phase-11 UX redesign not required for the mandatory items.
- Protocol-family rewrite beyond deterministic lifecycle/audio fixes in scope.

## Prioritized Next Execution Wave (Plan 11-HF5, execute-ready)
1. Create deterministic RED repro: non-loop globals run only on initiator while peers and `/output/final` miss the event (loop path remains synchronized).
2. Isolate root-cause branch among command emission, server apply pipeline, and snapshot/event fanout.
3. Implement server-authoritative exactly-once non-loop trigger replication to initiator + peers + `/output/final`.
4. Remove/guard local optimistic one-shot render path so local UI cannot mask distributed sync failures.
5. Verify no loop-mode regression (start, sustained loop, stop).
6. Verify stop/clear non-regression in mixed one-shot + loop sequences.
7. Execute strict multi-client parity matrix for one-shot full-duration completion (initiator + peers + `/output/final`).
8. Capture explicit FAIL->PASS evidence and synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Milestones
1. M1 Initiator-Only Non-Loop Root-Cause Isolation Closure.
2. M2 Server-Authoritative Exactly-Once Non-Loop Replication Closure.
3. M3 Local Optimistic One-Shot Guard/Removal Closure.
4. M4 Loop/Stop/Clear Non-Regression Closure.
5. M5 Multi-Client One-Shot Duration Parity FAIL->PASS Closure.
6. M6 Artifact Sync Closure.

## Regression/Evidence Matrix Policy
- P11-HF5-NonLoop-InitiatorOnly-RED-Test
- P11-HF5-NonLoop-ServerApply-Fanout-RootCause-Test
- P11-HF5-NonLoop-ServerAuthoritative-ExactlyOnce-Replication-Test
- P11-HF5-NonLoop-NoLocalOptimisticMasking-Test
- P11-HF5-Loop-Mode-NonRegression-Test
- P11-HF5-Global-Stop-NonRegression-Test
- P11-HF5-Global-Clear-NonRegression-Test
- P11-HF5-MultiClient-OneShot-FullDuration-Parity-FAIL-PASS-Test

## Definition of Done
- All Plan 11-HF5 hard gates pass.
- Non-loop global triggers replicate exactly once from server to initiator + peers + `/output/final` with full intended duration.
- No local optimistic one-shot path can produce a local-only false PASS.
- Loop-mode behavior remains PASS and unchanged.
- Stop/clear semantics remain deterministic and unchanged.
- Multi-client one-shot duration parity is closed with explicit FAIL->PASS evidence.
- Phase and global planning artifacts are synchronized (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).
