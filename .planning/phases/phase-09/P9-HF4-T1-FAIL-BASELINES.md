# P9-HF4-T1 FAIL Baselines

## Scope
- start/stop reliability baseline regressions
- startup phantom + duplicate outside runs
- board switch image/polygon parity race
- `/output/final` bootstrap double-run risk

## Deterministic baseline harness
- Command: `node debug/p9-hf4-fail-pass.mjs`
- FAIL baseline encoded first, PASS invariant guard encoded second.

## Baseline findings (FAIL)
1. Duplicate outside global entries were possible on startup hydration.
2. Phantom running entries (missing runtime identity) could survive into draw state.
3. Board-switch order could render polygons before image readiness.

## PASS after HF4 guards
1. Startup invariant normalization enforces one outside run per board.
2. Phantom entries are removed before first authoritative apply.
3. Board switch now uses overlay hold until board image readiness/timeout.

## Artifact
- `debug/p9-hf4-fail-pass-output.json`
