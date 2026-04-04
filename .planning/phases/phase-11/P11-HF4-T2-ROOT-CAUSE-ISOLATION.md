# P11-HF4-T2 Root-Cause Isolation (Non-Loop Suppression on `/output/final`)

## Symptom Split

- **Loop globals:** still visible on `/output/final`.
- **Non-loop globals:** frequently invisible/suppressed on `/output/final`.

## Isolated Cause

`trigger-global` start payload currently carries `animation.startedAtEpochMs` from the **control client clock**.

- For loop globals (`hold=true`), finite-duration expiry is not used, so they survive clock drift.
- For one-shot globals (`hold=false`, `durationMs=4000`), `/output/final` evaluates expiry against its own wall clock.
- With control/final clock skew, one-shot events can be classified as already elapsed immediately, causing suppression before render.

## Exact Divergence Point

- Server patch path: `applyGlobalMutationPatch(payload)` in `server.mjs`
- Current behavior before fix: server stores incoming `payload.animation.startedAtEpochMs` without rebasing to server-authoritative time.

## Fix Contract for T3

1. Rebase global start events to a **server-authoritative start epoch**.
2. Keep loop behavior unchanged.
3. Keep `stop`/`clear` semantics unchanged.
4. Preserve exactly-once one-shot semantics with full configured duration.
