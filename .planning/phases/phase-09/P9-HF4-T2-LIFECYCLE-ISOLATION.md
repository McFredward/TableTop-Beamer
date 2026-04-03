# P9-HF4-T2 Lifecycle Isolation

## Change
- Outside timeline ownership moved to explicit board-scoped lifecycle state.
- Renderer now derives outside elapsed time from a stable `outsideLifecycleKey` built from outside definition/config, instead of runtime room/cluster/global-inside trigger entries.

## Technical Notes
- Added board-scoped outside timeline state map.
- Added lifecycle-key builder based on outside definition payload.
- Added elapsed-time resolver that only resets on outside-scoped lifecycle/config transitions.

## Why this isolates lifecycle
Room/cluster/global-inside starts mutate running animation lists, but they do not mutate outside definition lifecycle key. Therefore outside playback cursor is no longer coupled to unrelated trigger churn.
