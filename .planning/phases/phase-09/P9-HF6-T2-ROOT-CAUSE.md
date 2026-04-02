# P9-HF6-T2 - Root-cause isolation (client->server command transport)

## Isolated Root Cause

### 1) Start commands were routed through overflow-prone queue class

- `trigger-room` and `trigger-global:start` were classified as `state-sync` (non-high priority).
- Queue overflow guard (`LIVE_QUEUE_MAX_SIZE=512`) drops non-high entries and returns ack with:
  - `applied: false`
  - `overflow: true`
- Under active stream load/churn, start commands can be dropped before authoritative apply.

### 2) Client transport treated non-applied ack as success

- `emitLiveMutation` only checked HTTP status (`202`) and always marked mutation as accepted.
- Ack payload flags (`applied=false`, `overflow=true`, `timeout=true`) were not enforced.
- Result: UI reports pending/accepted while command never reached authoritative mutation cycle (perceived no-op/drop).

## Why this matches observed field behavior

- Symptoms are most visible when stream mode is active and command pressure rises.
- Start/stop workflows appear non-responsive because upstream start commands can drop silently while stop attempts operate on stale/absent runtime state.

## Closure strategy used in HF6

1. Elevate start/stop command classes to control-critical high priority to remove overflow-drop path for control commands.
2. Enforce strict client ack semantics: non-applied ack is transport failure, not success.
3. Add targeted retry for start/stop command family and immediate snapshot poll on accepted ack.
