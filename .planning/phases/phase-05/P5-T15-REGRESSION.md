# P5-T15 Gate Regression (Plan 5-1)

## Endpoint Smoke

- `GET /output/final` => `200`
- `GET /api/live/state` => `200`
- `GET /api/health` => `200`

Nachweis (lokaler Run): `FINAL=200 LIVE=200 HEALTH=200`

## Live-Sync Broadcast

- 2-Client WebSocket Sync: `WS_SYNC=ok`
- 3-Client Szenario (`control`, `control`, `final-output`): `SYNC_3C=ok receivers=2`

## Align-Mode Sync

- Mutation `align-toggle` wurde ueber WebSocket verteilt.
- Log-Nachweis in `logs/live-sync.jsonl`:
  - `"class":"state_change","mutationType":"align-toggle"`

## Audio-Routing / Lifecycle

- Rollenvertrag dokumentiert in `.planning/phases/phase-05/P5-T12-AUDIO-LIFECYCLE.md`.
- Control-Views sind hard-muted; Final-Output bleibt der einzige audible role.

## Persistentes Logging (Session/State/Error)

- Logdatei: `logs/live-sync.jsonl` (append-only)
- Nachweis Klassen:
  - `session_event` (connect/disconnect/join/server-start)
  - `state_change` (z. B. `clear-all`, `align-toggle`)
  - `error` (z. B. `invalid-mutation-type`)

## Ergebnis

- Plan-5-1-Pflichtnachweise fuer Multi-Client-Sync, Align-Mode, Audio-Routing und Logging sind als Regression dokumentiert.
