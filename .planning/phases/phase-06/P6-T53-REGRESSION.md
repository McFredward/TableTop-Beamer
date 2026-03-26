# P6-T53 Regression - HF6 Vertex Selection Lifecycle Matrix

Date: 2026-03-26
Scope: P6-T49 .. P6-T53

## Checks Executed

1. Syntax checks
   - `node --check src/app.js`
   - `node --check src/app/state/runtime-state.js`
   - Result: PASS

2. Vertex pointer lifecycle hardening
   - Pointer-up after direct vertex click now preserves persistent room selection instead of falling into empty-space deselect.
   - Same-room selection sync no longer resets active vertex/edge indices.
   - Result: PASS

## Combined HF6 Regression Matrix

| Scenario | Preconditions | Action | Expected | Result |
| --- | --- | --- | --- | --- |
| Vertex click keeps room selection | Room selected in Settings with room vertices visible | Click room vertex (no move) | Room stays selected, polygon + handles remain visible | PASS |
| Direct vertex move remains stable | Active room with visible vertices | Drag selected room vertex | Vertex moves deterministically; room selection remains active | PASS |
| Delete key parity on direct vertex selection | Vertex selected by direct click, no dropdown interaction | Press `Delete` | Active vertex is deleted (>=3 guard retained) | PASS |
| Delete panel parity on direct vertex selection | Vertex selected by direct click | Click `Delete Vertex` button | Same active vertex is deleted without room reselect | PASS |
| Empty-space deselect still works | Room currently selected | Click empty overlay area | Room selection clears to `none` | PASS |
| Play Area guard remains intact | Focus in Play Area controls | Press `CTRL/CMD+C`, `CTRL/CMD+V`, `Delete` | Room copy/paste/delete shortcuts remain blocked | PASS |
| Room drag parity + text-selection guard | Room selected for area drag in Settings | Hold + move room polygon area | Room area drag works; no unintended browser text selection | PASS |

## Final Result

HF6 regression matrix is PASS: vertex-click persistence, direct vertex delete parity (key + panel), empty-space deselect, play-area guard, and room-drag parity all remain stable.
