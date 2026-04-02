# P9-HF3-T9 Deterministic Non-Regression Validation

- Date: 2026-04-02T20:34:13Z
- Scope: Validate sync ordering/version/idempotency, lifecycle no-replay semantics, and stop determinism under HF3 hardening.

## Harness

- Script: `debug/p9-hf3-determinism-regression.mjs`
- Command: `node debug/p9-hf3-determinism-regression.mjs`

## Result

`PASS`

Validated invariants:

1. Sync envelope determinism:
   - stale versions are rejected
   - duplicate mutation IDs are rejected
   - monotonic versions are accepted
2. Lifecycle no-replay:
   - expired one-shot events are not active after hydration
3. Stop determinism:
   - stop removes exactly the requested `animation.id`
   - no collateral removals across other scopes

## Conclusion

HF3 performance hardening preserves the HF2 correctness invariants for sync, lifecycle, and stop behavior.
