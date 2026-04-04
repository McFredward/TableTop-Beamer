# Phase 11 Risks

## R0a Global runtime recovery misses root-cause path
- Risk: hotfix restores only partial global start paths, leaving intermittent global no-start behavior.
- Impact: Critical.
- Mitigation: deterministic RED repro before fix, rollback-first recovery, and cross-scope start smoke gate.

## R0b Rollback introduces hidden lifecycle drift
- Risk: rollback/fix may reintroduce stale lifecycle assumptions and cause silent run/stop inconsistencies.
- Impact: Critical.
- Mitigation: start/stop/clear non-regression matrix plus control-vs-final parity checks.

## R0c Dashboard loop toggle wired to definition state accidentally
- Risk: quick loop checkbox mutates persisted animation definitions, violating per-trigger UX contract.
- Impact: Critical.
- Mitigation: explicit payload contract separating trigger-time loop mode from definition config; persistence non-mutation test.

## R0d Per-trigger loop mode not propagated to all clients
- Risk: control UI shows chosen loop mode but `/output/final` or peers apply mismatched one-shot/loop behavior.
- Impact: Critical.
- Mitigation: versioned command payload assertions + cross-client parity gate.

## R0e Stop/Clear semantic regression
- Risk: new loop choice path alters existing stop or clear behavior (late stop, partial clear, or stuck run).
- Impact: Critical.
- Mitigation: explicit stop/clear regression suite across one-shot and looping global runs.

## R0f Operator ambiguity in dashboard controls
- Risk: loop checkbox wording/state is unclear and operators accidentally trigger wrong lifecycle mode.
- Impact: Critical.
- Mitigation: clear label (`Loop until stopped`) and deterministic default (`off` => one-shot) with visible immediate state.

## R0g HF2 changes regress sync determinism
- Risk: recovery and trigger-mode wiring introduce ordering/idempotency drift.
- Impact: Critical.
- Mitigation: mandatory sync determinism non-regression matrix.

## R0h HF2 changes regress render correctness
- Risk: global lifecycle recovery changes produce control/final mismatch.
- Impact: Critical.
- Mitigation: control-vs-final parity checks under lifecycle and board-switch scenarios.

## R1 Artifact drift across planning trackers
- Risk: phase documents and global trackers diverge during hotfix execution.
- Impact: High.
- Mitigation: explicit artifact sync task (P11-HF2-T8) and closure gate.
