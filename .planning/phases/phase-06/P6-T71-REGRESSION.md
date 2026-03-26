# P6-T71 Regression - HF9 Target Auto+Manual Parity Matrix

Date: 2026-03-26
Scope: P6-T67 .. P6-T71

## Checks Executed

1. Syntax checks
   - `node --check src/app.js`
   - `node --check src/app/state/runtime-state.js`
   - Result: PASS

2. Draft contract (`target` exception)
   - Empty-space deselect and pointer lifecycle refresh no longer rewrite `roomDraft.targetId`.
   - Animation + parameter draft values remain untouched while target behavior is handled by dedicated auto/manual rules.
   - Result: PASS

3. Room-click target autofill
   - Board room polygon click now sets `roomDraft.targetType = room` and `roomDraft.targetId = clickedRoomId` deterministically.
   - No implicit reset of animation or parameter draft fields during the autofill flow.
   - Result: PASS

4. Always-manual target availability
   - `#room-target-select` remains enabled when `selectedRoomId = none`.
   - Target options continue to refresh from board room/cluster catalogs while selection is empty.
   - Result: PASS

5. Room/cluster manual override hardening
   - Manual target selection no longer forces room selection state changes.
   - Post-autofill manual override to room or cluster remains available independent of persistent selection visuals.
   - Result: PASS

## Combined HF9 Regression Matrix

| Scenario | Preconditions | Action | Expected | Result |
| --- | --- | --- | --- | --- |
| Draft target exception holds | Custom animation + params set, target currently cluster | Empty-space deselect / pointer lifecycle refresh | Animation + params stay unchanged; target is not cleared by selection reset | PASS |
| Room click autofills target | Target set to cluster or another room | Click a different room polygon on board | `target` switches immediately to clicked room | PASS |
| Room click does not reset draft params | Non-default animation/params configured | Click another room | Animation dropdown + parameters keep current draft values | PASS |
| Target dropdown stays enabled with no selection | `selectedRoomId = none` after empty-space click | Open target dropdown | Dropdown remains interactive and lists room + cluster options | PASS |
| Manual override after autofill (room -> cluster) | Room click already auto-set target to room | Change target dropdown to a cluster | Manual cluster target is applied and kept | PASS |
| Manual override independent from selection | Room A selected, target manually set to Room B/Cluster C | Keep selection unchanged / clear selection | Manual target remains selectable and editable | PASS |
| Cluster stagger guard parity | Target set to room vs cluster | Toggle target types | `stagger start` remains cluster-only and never blocks target manual selection | PASS |

## Final Result

HF9 regression matrix is PASS: room click now auto-fills target to the clicked room, target remains manually operable at all times (including `selection = none`), draft persistence is stable for animation/parameters with `target` explicitly excluded, and room/cluster manual overrides remain robust after autofill.
