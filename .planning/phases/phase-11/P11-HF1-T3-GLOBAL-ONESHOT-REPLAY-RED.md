# P11-HF1-T3 RED Repro - Global one-shot replay after reload/reconnect

## Symptom (before fix)
- Finite global one-shot effects (for example `intruder-alert`) could replay from the beginning after reload/reconnect, even when already elapsed.

## Deterministic Repro
1. Start a finite global one-shot on control.
2. Wait until its configured duration is elapsed.
3. Reload the control client (or reconnect another client).
4. Inspect hydrated runtime state.

## Expected RED result (before fix)
- A stale one-shot may be re-primed with a fresh `startedAt` baseline and play again.

## PASS expectation (after fix)
- Rehydration preserves authoritative epoch start timestamps and suppresses expired one-shots.
- Reload/reconnect never replays already elapsed one-shot globals.
