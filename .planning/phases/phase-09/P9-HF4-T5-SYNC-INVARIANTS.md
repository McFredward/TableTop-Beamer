# P9-HF4-T5 Deterministic Sync Invariants

## Scope
HF4 changes are renderer-lifecycle scoped and must not alter sync determinism.

## Validation
Executed:
- `node debug/p9-hf2-sync-invariants.mjs`

Result: **PASS**

## Invariants Confirmed
- version monotonic apply
- stale version rejection
- duplicate mutation rejection
- envelope version precedence over payload version

Conclusion: HF4 lifecycle isolation does not regress ordering/version/idempotent apply behavior.
