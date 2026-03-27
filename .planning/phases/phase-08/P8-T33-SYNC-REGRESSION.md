# P8-T33 Duststorm Sync/Persistence Regression

Date: 2026-03-27
Plan: 8-HF3
Task: P8-T33
Status: PASS

## Scope
- Integrate `Outside Duststorm` into existing server-authoritative outside mutation/snapshot flow
- Preserve join/reconnect and first-click deterministic behavior for outside mode switching

## Verification Checks
1. `node --check src/app.js` -> PASS
2. `node --check server.mjs` -> PASS

## Integration Evidence
- Client accepts and normalizes `outside.mode = "duststorm"` (same profile path as `standard`/`immersive`).
- Outside mode updates continue to use canonical mutation path `emitLiveMutation("outside-update", ...)` with board-scoped payload.
- Server-side `outside-update` patch now normalizes/sanitizes outside profiles (`enabled/intensity/speed/mode/direction`) before snapshot broadcast.
- Snapshot/runtime merge remains unchanged structurally (`outsideFxByBoard`), so join/reconnect hydration keeps the selected duststorm mode.

## Acceptance Mapping
- **Outside-Duststorm-Sync-Parity-Test** -> PASS
- **Outside-Duststorm-Reconnect-Test** -> PASS
- **Non-Regression-Sync-Test** -> PASS

## Files
- `src/app.js`
- `server.mjs`
