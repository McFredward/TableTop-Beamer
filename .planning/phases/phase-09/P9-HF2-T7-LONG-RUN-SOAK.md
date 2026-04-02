# P9-HF2-T7 Long-Run Soak Matrix

- Date: 2026-04-02T20:02:30Z
- Scope: Replay regression guard for expired one-shot events during repeated reload/reconnect-style hydration cycles.

## Harness

- Script: `debug/p9-hf2-long-run-soak.mjs`
- Command: `node debug/p9-hf2-long-run-soak.mjs`
- Iterations: 800 hydration cycles

## Result

`PASS`

Observed metrics:

- `activeExpiredDetected`: `0` (no expired one-shot survived active hydration)
- `replaySuppressed`: `0` (no stale terminal fingerprint was admitted)

## Matrix Focus

1. Expired `intruder-alert` one-shot hydration path
2. Expired `power-outage` one-shot hydration path
3. Mixed payload with active hold animation in same snapshot
4. Repeated cycle stability across many iterations

## Conclusion

Long-run hydration does not replay expired one-shot events. Active events remain active, while elapsed finite-duration entries stay terminal.
