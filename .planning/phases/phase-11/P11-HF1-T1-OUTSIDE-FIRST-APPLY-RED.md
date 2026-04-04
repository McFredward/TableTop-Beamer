# P11-HF1-T1 RED Repro - Outside first-apply sync lag

## Symptom (before fix)
- Changing Outside settings (`mode`, `direction`, typed `assetRef`) and clicking `Apply changes` once could leave remote clients and `/output/final` on stale values until a second apply.

## Deterministic Repro
1. Open one control client and one `/output/final` client on the same room.
2. In **Settings -> Outside Animations**, choose a coded outside definition where `Outside mode` / `Outside direction` are visible.
3. Change at least one value and click `Apply changes` once.
4. Observe the remote client/final output state.

## Expected RED result (before fix)
- First apply not deterministically reflected across all clients.
- A second apply is needed to converge.

## PASS expectation (after fix)
- First valid apply is snapshot-authoritative and converges to all clients/final without a second click.
