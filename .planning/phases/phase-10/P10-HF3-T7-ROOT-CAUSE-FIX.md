# P10-HF3-T7 Root Cause and Fix

## Root cause

`applyLiveRuntimeSnapshot` did not hydrate `playAreasByBoard` / `selectedPlayAreaIdByBoard` from runtime snapshot payloads.
As a result, clients (especially `/output/final` and browser-specific runtime paths) could continue rendering with stale fallback play-area polygons even when canonical board polygons were available.

## Generic fix (no board-specific branching)

1. Added shared polygon contract module: `src/app/runtime/core/polygon-contract.js`
2. Implemented `applySnapshotPolygonState(...)` to hydrate polygon ownership from:
   - `snapshot.playAreasByBoard` / `runtime.playAreasByBoard`
   - `snapshot.selectedPlayAreaIdByBoard` / `runtime.selectedPlayAreaIdByBoard`
   - `snapshot.boardProfiles` / `runtime.boardProfiles` (legacy alias fallback)
3. Wired runtime snapshot apply path to use the shared hydration helper and refresh `shipPolygonsByBoard` canonically.
4. Registered module in `index.html` before `runtime-orchestration.js`.

## Verification executed

- `node --check src/app/runtime/core/polygon-contract.js`
- `node --check src/app/runtime/runtime-orchestration.js`

Both commands completed successfully.
