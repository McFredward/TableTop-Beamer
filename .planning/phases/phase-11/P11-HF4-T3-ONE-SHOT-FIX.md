# P11-HF4-T3 One-Shot Final-Output Recovery Fix

## Change

- Updated `applyGlobalMutationPatch(payload)` in `server.mjs` to stamp global trigger starts with
  **server-authoritative** `startedAtEpochMs`.

## Why this fixes HF4

- One-shot expiry is finite-duration (`4s`) and therefore time-origin sensitive.
- Rebasing to server time removes control-vs-final wall-clock skew from the lifecycle contract.
- `/output/final` now receives one-shot globals with a stable start epoch and renders full duration once.

## Verification

- RED repro after fix: `debug/p11-hf4-t1-non-loop-suppression-red.mjs` -> PASS (regression removed)
- One-shot full-duration exactly-once contract: `debug/p11-hf4-t3-oneshot-final-full-duration-pass.mjs` -> PASS
