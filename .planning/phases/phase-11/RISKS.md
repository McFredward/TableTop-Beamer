# Phase 11 Risks

## R0a Non-loop multi-client sync fix misses root-cause
- Risk: fix only patches a symptom and non-loop globals still fail to replicate beyond initiator in specific lifecycle sequences.
- Impact: Critical.
- Mitigation: deterministic RED repro before fix, with explicit lifecycle-branch tracing for one-shot vs loop runtime path.

## R0h Initiator-only path survives partial fix
- Risk: non-loop triggers still run only on initiating client while peers or `/output/final` miss events in specific command/apply/fanout orders.
- Impact: Critical.
- Mitigation: root-cause gate explicitly partitions command emission vs server apply vs fanout and requires branch-level closure evidence.

## R0i Local optimistic one-shot render masks distributed failure
- Risk: initiating client appears correct because of local optimistic start while server-authoritative replication is missing.
- Impact: Critical.
- Mitigation: block/guard local-only optimistic one-shot path and require all PASS gates to validate on initiator + peers + `/output/final` simultaneously.

## R0j Exactly-once contract regresses into duplicates
- Risk: once server-authoritative fanout is restored, initiator may receive both local and server event and run one-shot twice.
- Impact: Critical.
- Mitigation: exactly-once run-id/idempotency assertions in acceptance matrix for all clients.

## R0k Snapshot fanout delay breaks full-duration parity
- Risk: peers or `/output/final` receive late one-shot state and show shortened duration despite successful trigger arrival.
- Impact: Critical.
- Mitigation: strict full-duration parity assertions across initiator + peers + `/output/final` with wall-clock tolerance bounds.

## R0b One-shot sync recovery regresses loop mode
- Risk: changes for non-loop replication accidentally alter loop start/sustain/stop semantics.
- Impact: Critical.
- Mitigation: dedicated loop non-regression gate with start/sustain/stop matrix.

## R0c Duration fix introduces repeat/retrigger drift
- Risk: one-shot globals become visible again but replay more than once or terminate before full intended duration.
- Impact: Critical.
- Mitigation: exactly-once completion assertions with run-id/lifecycle guards in acceptance tests.

## R0d Multi-client one-shot parity remains broken
- Risk: initiator shows one-shot correctly but peers or `/output/final` still miss or short-run events.
- Impact: Critical.
- Mitigation: strict initiator/peer/final duration parity matrix with FAIL->PASS evidence closure.

## R0e Stop/Clear semantic regression
- Risk: one-shot lifecycle fix alters existing stop or clear behavior (late stop, partial clear, or stuck run).
- Impact: Critical.
- Mitigation: explicit stop/clear regression suite across all global runs.

## R0f One-shot fix regresses sync determinism
- Risk: lifecycle corrections introduce ordering/idempotency drift in trigger/stop application.
- Impact: Critical.
- Mitigation: mandatory sync determinism non-regression matrix.

## R0g HF5 changes regress render correctness
- Risk: global lifecycle recovery changes produce new initiator/peer/final mismatch.
- Impact: Critical.
- Mitigation: multi-client parity checks under lifecycle and board-switch scenarios.

## R1 Artifact drift across planning trackers
- Risk: phase documents and global trackers diverge during hotfix execution.
- Impact: High.
- Mitigation: explicit artifact sync task (P11-HF5-T8) and closure gate.

## HF5 Risk Closure Snapshot
- R0h/R0i/R0j/R0k are closed by HF5 PASS evidence (`11-HF5-VERIFICATION.md`, `P11-HF5-T7-FAIL-PASS-PROOF.md`).
