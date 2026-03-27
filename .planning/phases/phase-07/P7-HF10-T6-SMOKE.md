# P7-HF10-T6 Hard Smoke Gates (`room` / `global-inside` / `cluster`)

## Command

```bash
PORT=4399 node server.mjs
TT_BEAMER_BASE_URL=http://127.0.0.1:4399 node debug/p7-hf10-smoke-gates.mjs
```

## PASS artifact

- `debug/p7-hf10-t6-smoke-output.json`

## Required gate results

- `room` starts deterministically and appears in running list ✅
- `global-inside` starts deterministically and appears in running list ✅
- `cluster` starts deterministically and appears in running list ✅
- all three remain active across persistence sampling window (6 samples) ✅
- explicit `stop-animation` removes only stopped target without neutralizing others ✅
- `clear-all` deterministically empties running list ✅

## Additional verify outputs

- `debug/p7-hf10-t12-output.json` (source/invariant guards PASS)
- `debug/p7-hf10-t13-output.json` (behavior matrix PASS)
- `debug/p7-hf10-t14-output.json` (telemetry snapshot)

## Notes

- Smoke run is executed against isolated server on port `4399` to avoid interference from already running local sessions.
- Snapshot board context remains stable (`selectedBoard = nemesis-board-a`) throughout start/stop/clear lifecycle.
