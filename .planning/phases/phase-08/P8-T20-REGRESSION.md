# P8-T20 Regression - Selection/Edit Stability

Date: 2026-03-27
Plan: 8-HF1
Status: PASS

## Scope
- Validate that removing Play Area board-click selection does not regress room editing interactions.

## Matrix

1. **Room click selection (no hold)**
   - Action: Click room polygon in Settings without drag.
   - Expected: Room becomes active selection immediately.
   - Result: PASS.

2. **Room vertex edit still works**
   - Action: Select room, drag room vertex handle.
   - Expected: Vertex moves, room remains selected.
   - Result: PASS.

3. **Room polygon area drag still works**
   - Action: Pointer down inside selected room, move pointer.
   - Expected: Room polygon translates, selection persists after pointer up.
   - Result: PASS.

4. **Keyboard copy/paste/delete still routed to selected room**
   - Action: Use CTRL/CMD+C, CTRL/CMD+V, Delete with a selected room.
   - Expected: Operations apply to active room (with existing typing/play-area guards).
   - Result: PASS.

5. **Play Area editing remains available via canonical controls**
   - Action: Use Play Area dropdown + vertex handles.
   - Expected: Active Play Area can still be edited; board click no longer changes Play Area.
   - Result: PASS.
