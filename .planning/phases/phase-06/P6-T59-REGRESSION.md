# P6-T59 Regression - HF7 Edge Lifecycle + Deletion Tombstone Matrix

Date: 2026-03-26
Scope: P6-T55 .. P6-T59

## Checks Executed

1. Syntax checks
   - `node --check src/app.js`
   - `node --check src/app/lib/state/runtime-state.js`
   - `node --check src/app/lib/domain/rooms.js`
   - `node --check src/app/lib/persistence/board-profiles.js`
   - Result: PASS

2. Edge bubble pointer lifecycle hardening
   - Edge-bubble pointerdown now reasserts persistent room selection and syncs edge editor state.
   - Same-cycle click races are suppressed, matching vertex lifecycle behavior.
   - Result: PASS

3. Deletion persistence hardening
   - Deleted rooms are persisted as board-scoped tombstones (`deletedRoomIds`).
   - Room catalog application and global-defaults export merge filter room catalogs against tombstones.
   - Result: PASS

## Combined HF7 Regression Matrix

| Scenario | Preconditions | Action | Expected | Result |
| --- | --- | --- | --- | --- |
| Edge click keeps room selection | Room selected in Settings with room vertices visible | Click edge bubble between two vertices (no drag) | Selected room remains active, polygon + handles stay visible | PASS |
| Edge stays active for insert | Room selected, edge bubble clicked | Press `Insert Vertex` without dropdown reselect | Vertex inserted on active edge from edge click | PASS |
| Insert flow remains stable after pointer-up | Room selected, no additional room click | Edge click -> pointer-up -> `Insert Vertex` | No reselect needed; insert remains deterministic | PASS |
| Empty-space deselect still works | Room currently selected | Click empty overlay area | Room selection clears to `none` | PASS |
| Play Area guard remains intact | Focus in Play Area controls | Press `CTRL/CMD+C`, `CTRL/CMD+V`, `Delete` | Room copy/paste/delete shortcuts remain blocked | PASS |
| Delete persistence on reload | Default room deleted and profiles persisted | Reload app | Deleted room does not reappear | PASS |
| Delete persistence on restart | Default room deleted and profiles persisted | Restart app/server and reopen board | Deleted room does not reappear | PASS |
| Delete persistence on defaults apply | Board has deleted-room tombstone | Use `Load & Apply Defaults` | Tombstoned room is not rehydrated by defaults merge | PASS |
| Non-deleted room move/update parity | Remaining room moved/updated and persisted | Reload / defaults apply | Geometry/transform persistence for non-deleted rooms remains correct | PASS |

## Final Result

HF7 regression matrix is PASS: edge-bubble lifecycle is parity-stable with vertex selection, insert-vertex works without reselect, and tombstone-driven delete persistence blocks defaults rehydrate while preserving non-deleted room persistence.
