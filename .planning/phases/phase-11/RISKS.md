# Phase 11 Risks

## R0a Non-loop final-output suppression fix misses root-cause
- Risk: fix only patches a symptom and non-loop globals still fail to render on `/output/final` in specific lifecycle sequences.
- Impact: Critical.
- Mitigation: deterministic RED repro before fix, with explicit lifecycle-branch tracing for one-shot vs loop runtime path.

## R0b One-shot recovery regresses loop mode
- Risk: changes for non-loop visibility accidentally alter loop start/sustain/stop semantics.
- Impact: Critical.
- Mitigation: dedicated loop non-regression gate with start/sustain/stop matrix.

## R0c Duration fix introduces repeat/retrigger drift
- Risk: one-shot globals become visible again but replay more than once or terminate before full intended duration.
- Impact: Critical.
- Mitigation: exactly-once completion assertions with run-id/lifecycle guards in acceptance tests.

## R0d Control/final one-shot parity remains broken
- Risk: control view shows one-shot correctly but `/output/final` still suppresses or short-runs.
- Impact: Critical.
- Mitigation: strict control-vs-final duration parity matrix with FAIL->PASS evidence closure.

## R0e Stop/Clear semantic regression
- Risk: one-shot lifecycle fix alters existing stop or clear behavior (late stop, partial clear, or stuck run).
- Impact: Critical.
- Mitigation: explicit stop/clear regression suite across all global runs.

## R0f One-shot fix regresses sync determinism
- Risk: lifecycle corrections introduce ordering/idempotency drift in trigger/stop application.
- Impact: Critical.
- Mitigation: mandatory sync determinism non-regression matrix.

## R0g HF4 changes regress render correctness
- Risk: global lifecycle recovery changes produce new control/final mismatch.
- Impact: Critical.
- Mitigation: control-vs-final parity checks under lifecycle and board-switch scenarios.

## R1 Artifact drift across planning trackers
- Risk: phase documents and global trackers diverge during hotfix execution.
- Impact: High.
- Mitigation: explicit artifact sync task (P11-HF4-T7) and closure gate.
