# P6-T37 Verification - Selection/Delete Regression Matrix

Date: 2026-03-26
Scope: P6-T35 .. P6-T37

## Checks Executed

1. Syntax checks
   - `node --check src/app.js`
   - Result: PASS

2. Selection source-of-truth hardening (`visually selected = active selected`)
   - `syncSelectedRoomStateForBoard(...)` now normalizes selection before overlay/editor rendering.
   - Room vertex handles render only when a room is actively selected.
   - Empty-space deselect clears active room selection and prevents stale visual-handle selection.
   - Result: PASS

3. Delete without hold/drag dependency
   - `deleteSelectedRoom(...)` resolves the persisted active selection (`selectedRoomId`/`selectedRoomByBoard`) instead of pointer-hold context.
   - `Delete` hotkey handling accepts key/code detection and keeps typing/play-area guards intact.
   - Result: PASS

## Combined Regression Matrix

| Scenario | Preconditions | Action | Expected | Result |
| --- | --- | --- | --- | --- |
| Copy selected room | Room selected in Settings | `CTRL/CMD+C` | Clipboard receives selected room snapshot | PASS |
| Paste copied room | Clipboard populated | `CTRL/CMD+V` | New room created with copied geometry; new room selected | PASS |
| Delete selected room (no hold) | Room selected, pointer released | `Delete` | Selected room deleted immediately | PASS |
| Delete with no active selection | Empty-space deselect executed | `Delete` | No deletion; explicit "no room selected" status | PASS |
| Empty-space deselect | Room selected | Click empty overlay space | `selectedRoomId` becomes `none`; visual selection cleared | PASS |
| Play Area guard while editing | Focus/interaction in Play Area controls | `CTRL/CMD+C`, `CTRL/CMD+V`, `Delete` | Room shortcuts blocked; Play Area state unchanged | PASS |

## Acceptance Mapping (Phase 6)

- Visual-Selection-Is-Active-Test -> PASS
- Delete-Without-Hold-Test -> PASS
- Keyboard-Copy-Paste-Delete-Test -> PASS
- Empty-Space-Deselect-Test -> PASS
- Play-Area-Non-Regression-Test -> PASS

## Final Result

Plan 6-HF3 regression gate for combined copy/paste/delete + deselect + Play Area guard is satisfied.
