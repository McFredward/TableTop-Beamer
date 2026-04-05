# P11-HF6-T5 Loop Non-Regression

## Goal
Prove loop mode remains behaviorally unchanged after HF6 seen-once/polling cancellation work.

## Matrix
- start-loop: dashboard loop toggle still maps to server loop payload.
- sustain-loop: server loop path remains `hold=true` with `durationMs=null`.
- stop-loop: explicit stop action path remains available.
- finite-only seen-lock: HF6 seen-run retention logic stays scoped to finite non-loop animations.

## Evidence Artifact
- Script: `debug/p11-hf6-t5-loop-non-regression.mjs`
- Output: `debug/p11-hf6-t5-loop-non-regression-output.json`

## Verdict
- **PASS:** loop semantics remain non-regressed.
