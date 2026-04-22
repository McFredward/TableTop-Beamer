# Phase 21 — Summary

**Status:** CLOSED
**Scope:** Started with Plan 21-1 (hull-flicker breaks solid-color in the
same room, opt-in). Grew during hands-on testing into a broad run of bug
fixes and QoL features touching outside animations, solid-color rendering,
Live Editor, Active Animations list, settings dirty-flag integrity,
rename inputs, room polygon rotation, and the board share/import UX.

## Shipped

### Plan 21-1 — Hull-Flicker breaks Solid-Color (per-room, opt-in)
- `room-breaks-solid-color` checkbox on the hull-flicker backbone, per-room.
- `runtime-effect-visuals.js`: `computeHullFlickerGate(age, speed, intensity)`
  + `isHullFlickerLampOff` extracted so the draw-loop can probe the gate.
- `runtime-draw-loop.js`:
  - `findActiveHullFlickerGate(boardId, roomId)` + `roomHasSolidColorSibling(…)`
    helpers.
  - Solid-color early-returns its draw when a sibling hull-flicker with
    `breaksSolidColor=true` has its lamp in the OFF phase.
  - Hull-flicker visual is suppressed entirely when the same room carries
    a solid-color and `breaksSolidColor=true`, to avoid a bright flash on
    top of the solid-color dip.

### Outside animation: definition vs instance rewire (Phase 20 follow-up)
- `upsertGlobalAnimation`: copies `matchedDefinition.{intensity,speed,opacity,mode,direction}`
  onto each created instance so Settings defaults are captured at trigger time.
- `effectiveLoopUntilStopped = isOutside ? true : loopUntilStopped` — outside
  animations no longer vanish from the Active Animations list after 4 s.
- Draw path uses `pickInstance(instance, definition, field)` so instance edits
  survive server broadcast.
- `applyGlobalMutationPatch` server-side: preserves `speed/opacity/mode/direction`
  on incoming outside animations.
- Outside enabled / create / delete / apply-changes paths now emit optimistic
  local apply + `persistBoardProfiles()` before the live-sync emit, so the
  dirty flag actually fires.

### Solid-color Live Editor + rendering
- Live Editor slider changes on a solid-color animation propagate to cluster
  children via per-child `edit-room` emits.
- Solid-color draw alpha: `clamp(opacity * intensity)` (was `intensity * 0.8`).
- `applyLiveEditorValue` writes through to every linked room animation of a
  cluster, not just the cluster owner.
- Color picker added to the Live Editor (visible for `solid-color` coded
  animations) with autostart persisting the chosen `colorHex`.
- `openLiveEditor` auto-scrolls to the Live Editor panel.

### Active Animations list
- Categorized sections: Outside, Inside, Cluster, Room, Frozen Rooms.
- Newest animation first per section.
- `isRoomFrozen` + `resolveRoomCodedEffectType` + `getOutsideFxProfile`
  threaded into `animation-lifecycle` ctx.
- `isRenderCriticalAnimation` now treats `hold===true` or `durationMs===null`
  as critical — fixes loop-until-stopped Inside animations not rendering.

### Settings integrity + Rename
- `stripSelectionOnlyFields` strips mirrored fields from `insideFx` + `outsideFx`
  (intensity, speed, assetType, assetRef, mode, direction, loopUntilStopped,
  colorHex) so simply selecting an animation under "Edit existing" no longer
  trips the dirty flag.
- Rename inputs for Inside / Outside / Room animations (no separate button;
  typing sets dirty, Apply confirms).
- `commitRoomDraftToDefinition` patches `state.roomDraft` + calls
  `syncRoomPanelFromSelection` when the dashboard selection matches, so the
  first trigger after a Settings change uses the new defaults.

### Startup hardening
- Purged stale `SETTINGS_EXCLUSIVE_CONTROL_IDS` entries (`board-import-*`,
  `export/import-global-defaults`) that leaked ownership errors on load.
- Null-guard for `ctx.getBoard()` in `syncPolygonEditorPanel` rename input
  refresh path.
- Removed the obsolete ship-clip regression sub-test that fired against the
  `SHIP_POLYGON_DEFAULT` fallback.

### Polygon rotation mode (new file: `runtime-polygon-rotation.js`)
- Right-click a polygon → **Rotate polygon** / **Exit rotation**.
- While rotating, vertex + edge handles hide immediately.
- Aspect-corrected **pixel-space** rotation (via `canvas.width/height`) so a
  90° rotation is a true rigid rotation and doesn't squash the polygon
  into an ellipse on a non-square board.
- ESC cancels mid-drag and exits mode; ctx wired via orchestration.

### Board Share + Import UX rework
- Single combined file input split into two tabs: **Import package** (.zip)
  and **From image** (PNG/JPG/WEBP). New `bundle-share-panel` styling with
  segmented tab switcher, styled file picker, file card, primary CTA.
- Two-step flow: pick file → file card appears with name + size → **Upload**
  button commits the import.
- **Package rename prefilled**: browser-side zip reader (`DecompressionStream`
  `deflate-raw`) extracts `package.json`'s `board.metadata.name` on file
  selection and fills the rename input — no double-upload.
- Server `/api/boards/bundle-import?renameTo=<label>` applies the user-edited
  name before normalization.
- `min-width: 0` cascade down the bundle-share-panel to prevent long
  filenames from stretching the 390 px sidebar.

## Files touched

**Code (24 modified + 1 new):**
`index.html`, `server.mjs`, `src/styles.css`,
`src/app/lib/state/runtime-state.js`,
`src/app/runtime/animation/{runtime-animation-lifecycle,runtime-runtime-controls}.js`,
`src/app/runtime/core/{runtime-animation-factory,runtime-dom-refs}.js`,
`src/app/runtime/live-sync/runtime-config-sync.js`,
`src/app/runtime/panels/{runtime-fx-panels,runtime-regression-tests}.js`,
`src/app/runtime/polygon-editor/{runtime-polygon-context-menu,runtime-polygon-editor,runtime-polygon-editor-panels}.js`,
`src/app/runtime/polygon-editor/runtime-polygon-rotation.js` (NEW),
`src/app/runtime/render/{runtime-draw-loop,runtime-effect-visuals,runtime-perf}.js`,
`src/app/runtime/runtime-orchestration.js`,
`src/app/runtime/state/runtime-fx-normalizers.js`,
`src/app/runtime/wire/{runtime-wire-fx-panel-binders,runtime-wire-room-audio-binders}.js`.

**Config (runtime state churn during dev):**
`config/boards/nemesis-board-a.json`, `config/global-defaults.json`,
`config/projection-profiles.json`.

## Known gaps / follow-ups

None blocking — Phase 21 closes here. All user-reported issues during
hands-on testing are addressed or verified.
