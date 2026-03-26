# TT Beamer Prototype

Board-agnostic tabletop beamer overlay controller with shared live sync, final output rendering, and server-backed defaults.

## Start

1. Start API + frontend:
   - `node server.mjs`
2. Open control UI:
   - `http://localhost:4173`
3. Optional final output (FX only):
   - `http://localhost:4173/output/final`

## Save flow

- `Save (local -> global defaults)` sends `POST /api/global-defaults`.
- Requires the Node API server (`node server.mjs`).
- Static hosting only (for example `python3 -m http.server`) cannot save defaults.

## Board catalog and import

- Catalog endpoint: `GET /api/boards`
- Import endpoint: `POST /api/boards/import`
- Imported boards are persisted in:
  - `config/boards/imported/*.json`
- Built-in boards are loaded from:
  - `config/zones/*.json`

### Import format (`tt-beamer.board-definition.v1`)

```json
{
  "board": {
    "boardId": "my-board-id",
    "metadata": {
      "name": "My Board",
      "imageSrc": "/resources/my-board.png"
    },
    "roomCatalog": [
      { "id": "r-1", "name": "Bridge", "x": 0.2, "y": 0.3, "radius": 0.06 }
    ],
    "roomClusters": [
      { "clusterId": "cluster-top", "name": "Top Side", "roomIds": ["r-1"] }
    ]
  }
}
```

## Notes

- Room clicks always select a single room.
- Cluster execution is available through the room target dropdown.
- UI/operator-facing copy is English-only in Phase 6 flows.
