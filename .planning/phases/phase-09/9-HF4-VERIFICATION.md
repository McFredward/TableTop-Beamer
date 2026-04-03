# 9-HF4 Verification

## Scope
- Decouple outside sandstorm playback lifecycle from room/cluster/global-inside trigger churn.
- Prevent unrelated room starts from restarting outside media.
- Preserve `stop outside` and `clear all` deterministic semantics.
- Preserve deterministic sync invariants.

## Evidence
- Root-cause trace: `P9-HF4-T1-REPRO-TRACE.md`
- Lifecycle isolation: `P9-HF4-T2-LIFECYCLE-ISOLATION.md`
- Cache/reset guard: `P9-HF4-T3-CACHE-RESET-GUARD.md`
- Stop/Clear non-regression: `P9-HF4-T4-STOP-CLEAR-NON-REGRESSION.md`
- Sync invariants: `P9-HF4-T5-SYNC-INVARIANTS.md`
- Repeated room-start regression: `P9-HF4-T6-REPEATED-ROOM-START-REGRESSION.md`
- Executable regression output: `debug/p9-hf4-repeated-room-start-regression-output.json`

## Result
**PASS**

Repeated room starts no longer restart/rewind outside sandstorm playback. Outside stop/clear semantics remain deterministic and unchanged. Deterministic sync apply invariants remain intact.
