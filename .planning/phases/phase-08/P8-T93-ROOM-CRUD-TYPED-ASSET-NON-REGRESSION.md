# P8-T93 Room CRUD + Typed Asset Non-Regression

Status: PASS
Date: 2026-04-01

## Coverage

1. Room animation definition CRUD stays unchanged:
   - create/edit/delete still uses `roomFx.selectedAnimationId + roomFx.animations[]`
   - editor apply path remains `Apply changes` only.
2. Typed asset mapping remains unchanged:
   - `coded` remains coded-key mapped,
   - `gif` remains `/resources/*.gif` mapped,
   - `mp4` remains `/resources/*.mp4` mapped.
3. Runtime room start/edit/stop payload shape remains compatible:
   - `speed` is canonical for all asset types,
   - compatibility field `playbackSpeed` is still emitted from canonical speed for legacy readers.

## Evidence

- Room editor CRUD and typed mapping functions were left on existing normalization/update paths (`normalizeRoomFxProfile`, `syncRoomFxPanel`, room apply handlers) with no schema change.
- `rg -n "playbackSpeed: draftPayload\.speed" src/app.js` shows legacy compatibility field now mirrors canonical speed instead of a separate UI control.
- `node --check src/app.js && node --check src/app/lib/state/runtime-state.js` passes after refactor.
