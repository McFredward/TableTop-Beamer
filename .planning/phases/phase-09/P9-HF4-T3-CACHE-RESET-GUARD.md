# P9-HF4-T3 Outside Cache/Reset Guard

## Guard Rule Implemented
Outside MP4 playback reset is no longer keyed to room/cluster/global-inside runtime run IDs.

Reset now occurs only when outside-scoped lifecycle changes happen:
- outside disabled / stopped
- clear-all
- outside definition/config mutation (lifecycle key change)

## Non-Reset Cases
- room animation starts/stops/edits
- cluster animation starts/stops/edits
- global-inside trigger churn

These cases keep the same outside lifecycle key and therefore preserve cursor continuity.
