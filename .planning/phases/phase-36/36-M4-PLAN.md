---
phase: 36
plan: M4
type: execute
wave: 4
depends_on: [M3]
files_modified:
  - src/app/runtime/output-receiver/boot-handle-ui.js
  - src/app/runtime/output-receiver/output-align-mode-loader.js
autonomous: true
requirements_addressed: [D-01, T3, T4, T5, T10]
gap_closure: false
must_haves:
  truths:
    - "T3 (vertex drag modifies the correct vertex — drags vertex (row=0, col=1) → grid points show (0,1).x > (0,0).x by >0.2 normalized) PASSES on /output/"
    - "T4 (midpoint drag emits align-grid-snapshot — squish-bar 15px right → server-recv stdout) PASSES on /output/"
    - "T5 (rotation handle traces 30deg arc → align-grid-snapshot in stdout) PASSES on /output/"
    - "T10 stays GREEN (no dual-path conflict on M4 interactions)"
    - "T1 + T2 stay GREEN (no regression from M4 wiring)"
    - "T6-T9 still RED (M5's work)"
    - "Connection-stability fail=0 (D-08)"
    - "output.html ≤8 src-based scripts (D-09)"
  artifacts:
    - path: "src/app/runtime/output-receiver/boot-handle-ui.js"
      provides: "Vertex / midpoint / rotation drag wiring complete via interactions + polygonState dep-bag"
      contains: "areRoomVerticesEditable"
    - path: "src/app/runtime/output-receiver/output-align-mode-loader.js"
      provides: "interactions + polygonState stubs upgraded to support vertex/midpoint/rotation"
      contains: "areRoomVerticesEditable"
  key_links:
    - from: "Playwright drag on .projection-corner-handle[data-row='0'][data-col='1']"
      to: "handle-drag.js vertex-drag handler → grid-state.broadcastGridSnapshot → emitLiveMutation → server log"
      via: "handle-drag's onPointerMove updates grid.points[row][col], onPointerUp triggers broadcast"
      pattern: "row.*0.*col.*1"
    - from: "Playwright drag on .projection-grid-handle (midpoint)"
      to: "handle-drag.js midpoint-drag handler → grid-state.broadcastGridSnapshot"
      via: "midpoint-drag adds an inner row/col point and broadcasts"
      pattern: "projection-grid-handle"
    - from: "Playwright drag on .projection-rotation-handle"
      to: "handle-drag.js rotation handler → grid-state.broadcastGridSnapshot (with rotated points)"
      via: "rotation transforms all points around the centroid"
      pattern: "projection-rotation-handle"
threat_model:
  threats:
    - id: T-DOS-1
      title: "Vertex drag loop creates unbounded mutations"
      stride: DoS
      asvs: V11
      severity: low
      description: "Drag at 60Hz could saturate /api/live/ws"
      existing_mitigation: "30Hz client throttle in grid-state.broadcastGridSnapshot (preserved from Phase 31)"
      new_mitigation: "T10 verifies exactly 1 mutation per gesture (no burst)"
---

<objective>
Wire T3 (vertex drag), T4 (midpoint drag), T5 (rotation handle) on /output/. These three interactions ALL flow through the same handle-drag.js pipeline as corner pulls (T2) but use different handle classes (`.projection-corner-handle[data-row][data-col]` for interior vertices, `.projection-grid-handle` for midpoints, `.projection-rotation-handle` for rotation). The handle-drag IIFE already implements the math; M4 ensures the loader's stubs (interactions, polygonState) provide the right callable methods so that handle-drag's pointer handlers fire correctly.

Per RESEARCH §9: M4 is sequential after M3 (file-conflict on boot-handle-ui.js + output-align-mode-loader.js). Per RESEARCH §6: handle-ui internally is universal — same code runs on dashboard and /output/ — so wiring is purely a matter of stub completeness in the dep-bag.

Purpose: Flip T3+T4+T5 from RED to GREEN, holding T1+T2+T10 GREEN.

Output: 6 of 10 RED tests now GREEN. T6-T9 remain M5's job.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-36/36-CONTEXT.md
@.planning/phases/phase-36/36-RESEARCH.md
@.planning/phases/phase-36/36-A1-SUMMARY.md
@.planning/phases/phase-36/36-A2-SUMMARY.md
@.planning/phases/phase-36/36-M3-SUMMARY.md
@src/app/runtime/output-receiver/boot-handle-ui.js
@src/app/runtime/output-receiver/output-align-mode-loader.js
@src/app/runtime/viewport/runtime-projection-handle-ui.js
@src/app/runtime/viewport/runtime-projection-handle-drag.js
@test/live-e2e/test_phase36_align_handles.py

<interfaces>
<!-- handle-drag.js relevant entry points (from RESEARCH §1.1 + §6) -->
<!-- Each pointer-down on a handle elem dispatches to the handler matching its class. -->

From src/app/runtime/viewport/runtime-projection-handle-drag.js (~941 LOC):
- Vertex drag: triggered by `.projection-corner-handle` pointerdown.
  - Reads `data-row`, `data-col` attrs.
  - On pointermove: updates `grid.points[row][col].x/y` via `_state.applyDrag(...)`.
  - On pointerup: `pushUndo()`, calls `broadcastGridSnapshot(...)`.
  - Calls `ctx.beginPolygonDragInteraction()` and `ctx.endPolygonDragInteraction()`.
  - Reads `state.polygonEditor.dragVertexIndex` and writes back drag session state.

- Midpoint drag: triggered by `.projection-grid-handle` pointerdown.
  - Reads handle's `data-orientation` ("h"|"v") and `data-index`.
  - On move: shifts the corresponding row or column.
  - On up: broadcasts via grid-state.

- Rotation drag: triggered by `.projection-rotation-handle` pointerdown.
  - Reads handle's `data-axis` (or similar attribute).
  - On move: applies a rotation matrix to all `grid.points` around the centroid.
  - On up: broadcasts.

<!-- Required interactions/polygonState fields for these three drags (verified via handle-drag.js grep) -->
- `interactions.beginPolygonDragInteraction()` — called on pointerdown
- `interactions.endPolygonDragInteraction()` — called on pointerup
- `interactions.isPanArbitrating()` — called on pointerdown to suppress pan during drag
- `interactions.isAcceptablePolygonPointerEvent(event)` — guard
- `interactions.areRoomVerticesEditable()` — return value affects whether vertex drag is enabled
- `polygonState.getActivePolygonRoomId()` — used to scope drag to room
- `persistence.pushUndoState(desc)` — called on pointerdown
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Wire T3 (vertex drag) — fix interactions stub so vertex drag fires; verify pushUndoState bridges to grid-state's local stack</name>
  <files>
    - src/app/runtime/output-receiver/output-align-mode-loader.js
    - src/app/runtime/output-receiver/boot-handle-ui.js
  </files>
  <read_first>
    - src/app/runtime/viewport/runtime-projection-handle-drag.js (locate vertex-drag handler — pointerdown attached to .projection-corner-handle; trace which ctx.* fields it calls)
    - src/app/runtime/viewport/runtime-projection-grid-state.js (locate pushUndo function — verify grid-state owns local undo stack independent of polygon-editor's pushUndoState)
    - src/app/runtime/output-receiver/output-align-mode-loader.js (existing _buildInteractionsStub from A2 — review areRoomVerticesEditable=false stub)
    - test/live-e2e/test_phase36_align_handles.py::test_t3_vertex_drag_modifies_correct_vertex (target test)
  </read_first>
  <behavior>
    - T3 expectation: drag of `.projection-corner-handle[data-row="0"][data-col="1"]` 30px right → `/api/live/snapshot` shows `lastAlignGridSnapshot.points[(0,1)].x > points[(0,0)].x + 0.2`. The mutation flows: pointerdown → handle-drag's vertex-drag handler → onPointerMove updates `grid.points[0][1]` → onPointerUp → grid-state.broadcastGridSnapshot → emitLiveMutation → server validates + stores → snapshot reflects.
    - The current `_buildInteractionsStub()` from A2 returns `areRoomVerticesEditable: () => false`. This was correct for "polygon vertex" drag (polygon-editor IIFE's per-room vertex), but it must NOT block "GRID vertex" drag (handle-drag's `.projection-corner-handle` interior vertices). These are DIFFERENT code paths:
      - Polygon vertex drag = `runtime-polygon-editor.js`'s drag of room polygon vertices on the SVG #room-overlay.
      - Grid vertex drag = `runtime-projection-handle-drag.js`'s drag of `.projection-corner-handle[data-row][data-col]` on the projection grid.
    - Per RESEARCH §1.5, `areRoomVerticesEditable` is consumed by polygon-editor (room vertex), NOT by handle-drag (grid vertex). So `false` is correct for /output/ (room polygon edits are dashboard-only).
    - Therefore: T3 may already pass IF the corner handles render with `data-row="0" data-col="1"` for interior vertices. Run the test first; if it passes, no code change. If it fails, diagnose:
      1. Are interior corner-handles being created? Check via Playwright: `document.querySelectorAll('.projection-corner-handle').length` should be > 4 (the 4 outer corners) — typically a 3×3 grid yields 9 handles.
      2. If only 4 corners exist: handle-ui's grid-density is wrong on /output/. The grid is sized by grid-state's `_gridRows × _gridCols`. Default may be 2×2 (4 corners only). Increase via state initialization or grid-state.init args.
      3. If 9 handles exist but T3 fails: pushUndoState may not be wired. Verify `persistence.pushUndoState` from loader is non-null and reaches handle-drag.
  </behavior>
  <action>
**Step 1: Run T3 first to see current status.**

```
pytest test/live-e2e/test_phase36_align_handles.py::test_t3_vertex_drag_modifies_correct_vertex -v
```

**If T3 PASSES:** No code change needed for vertex drag. Skip to Task 2 (midpoint).

**If T3 FAILS with selector not found (`Locator('.projection-corner-handle[data-row="0"][data-col="1"]')`):** Interior vertices not rendered. The grid is too coarse.

Diagnose grid density:
```
# In a temp test or via DevTools console:
document.querySelectorAll('.projection-corner-handle').forEach(h =>
  console.log(h.getAttribute('data-row'), h.getAttribute('data-col')));
```

If only 0,0 / 0,1 / 1,0 / 1,1 print: grid is 2×2 (4 corners, no interior). The default needs to be 3×3 OR the test should grab `[data-row="0"][data-col="1"]` which may work for 2×2 too (col=1 is right-edge).

Check the existing default in `src/app/runtime/viewport/runtime-projection-grid-state.js` for `_gridRows`, `_gridCols`, or `defaultGridDensity`. If 2×2: T3 selector `[data-row="0"][data-col="1"]` IS the top-right corner — the test should still pass. If T3 still fails it's a different issue.

**Step 2: Verify pushUndoState is reaching handle-drag.**

Check loader's `_buildPersistenceStub`. The current A2 stub had `pushUndoState: (desc) => { /* delegated... no-op */ }`. Update to actually push to grid-state's undo stack:

```js
function _buildPersistenceStub(liveSync) {
  return {
    persistBoardProfiles: () => {},
    pushUndoState: (desc) => {
      // Phase 36 M4 — delegate to grid-state's pushUndo (local stack on /output/).
      // grid-state owns the per-grid-snapshot undo stack; CTRL+Z handler in handle-ui
      // pops it. This stub bridge lets polygon-editor's drag-start path also push,
      // even though the actual undo for grid drags happens via grid-state's own pushUndo.
      try {
        window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE?.pushUndo?.(desc || "polygon-edit");
      } catch (e) { /* tolerated */ }
    },
    saveProjectionMapping: () => {},
  };
}
```

**Step 3: Verify the polygon-editor (read path on /output/) doesn't block vertex drag.**

handle-drag's vertex drag handler runs INDEPENDENTLY of polygon-editor — `.projection-corner-handle` is not a polygon vertex handle (which would have class `.polygon-vertex` on the SVG). So polygon-editor stubs (areRoomVerticesEditable=false) DO NOT prevent grid vertex drag. Document this in M4 SUMMARY for clarity.

**Step 4: If T3 STILL fails after the above:**

Add debug instrumentation to bootHandleUi:

```js
// One-line trace at boot — visible in Playwright console
logger?.log?.(`${_LOG_PREFIX} M4 wiring: gridState=${typeof window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE} handle-drag=${typeof window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_DRAG}`);
```

Run T3 with `page.on("console", lambda m: print(m.text))` to capture this trace and diagnose the missing module.

**Step 5: Run T1 + T2 + T10 + T3 together** to ensure no regression:

```
pytest test/live-e2e/test_phase36_align_handles.py::test_t1_handle_frame_matches_stream_content \
       test/live-e2e/test_phase36_align_handles.py::test_t2_corner_pulls_emit_align_grid_snapshot \
       test/live-e2e/test_phase36_align_handles.py::test_t3_vertex_drag_modifies_correct_vertex \
       test/live-e2e/test_phase36_align_handles.py::test_t10_no_duplicate_mutations -v
```

All 4 should pass.
  </action>
  <verify>
    <automated>pytest test/live-e2e/test_phase36_align_handles.py::test_t3_vertex_drag_modifies_correct_vertex -v 2>&1 | tail -5</automated>
    Expected: `1 passed`
  </verify>
  <acceptance_criteria>
    - T3 GREEN: `pytest test/live-e2e/test_phase36_align_handles.py::test_t3_vertex_drag_modifies_correct_vertex -v 2>&1 | grep -cE "1 passed"` returns 1
    - T1 + T2 + T10 still GREEN (no regression)
    - `grep -nE "pushUndoState" src/app/runtime/output-receiver/output-align-mode-loader.js` returns at least 1 with the grid-state delegation update (or original stub if no change was needed)
    - Connection-stability fail=0
  </acceptance_criteria>
  <done>
    T3 vertex drag works end-to-end. Interior vertices grab the correct grid point.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Wire T4 (midpoint drag) — ensure .projection-grid-handle dispatches and broadcasts</name>
  <files>
    - src/app/runtime/output-receiver/boot-handle-ui.js
    - src/app/runtime/output-receiver/output-align-mode-loader.js
  </files>
  <read_first>
    - src/app/runtime/viewport/runtime-projection-handle-drag.js (midpoint handler — find `.projection-grid-handle` pointerdown listener)
    - src/app/runtime/viewport/runtime-projection-handle-ui.js (look for `createProjectionGridHandle` or similar — confirm midpoint handles are created at boot when grid has rows/cols)
    - test/live-e2e/test_phase36_align_handles.py::test_t4_midpoint_drag_emits_squish (target test)
  </read_first>
  <behavior>
    - T4 expectation: `.projection-grid-handle` element exists in DOM after align-mode toggle. Drag 15px → `[align-grid-snapshot] server-recv` in stdout.
    - Midpoint handles render between adjacent corner handles. With a 2×2 grid: 4 midpoints. With 3×3: 12 midpoints.
    - The pointerdown handler is wired internally in handle-drag.js (universal — RESEARCH §6). Same dep-bag (interactions + polygonState + persistence) covers it.
    - If T4 fails because `.projection-grid-handle` is not in DOM: handle-ui's createProjectionGridHandle is gated by some condition (likely grid-rows > 1). Verify state has correct grid setup.
  </behavior>
  <action>
**Step 1: Run T4.**

```
pytest test/live-e2e/test_phase36_align_handles.py::test_t4_midpoint_drag_emits_squish -v
```

**If T4 PASSES:** No code change. Skip to Task 3.

**If T4 FAILS at `wait_for_function('.projection-grid-handle')`:** Midpoint handles not rendered. Diagnose:

1. In Playwright console (or via temp test): `document.querySelectorAll('.projection-grid-handle').length`. Expect ≥ 4 for a 2×2 grid; 0 means handle-ui isn't creating them.

2. Read `src/app/runtime/viewport/runtime-projection-handle-ui.js` for the midpoint creation logic (grep for `projection-grid-handle`):
   ```
   grep -nE "projection-grid-handle" src/app/runtime/viewport/runtime-projection-handle-ui.js
   ```

3. The creation may depend on `state.polygonEditor.suppressRoomClickUntil` or similar timing state. Verify the loader's `_createOutputState()` initializes `suppressRoomClickUntil: 0` (already in A2 helper).

4. The creation may depend on `_gridRows > 1` etc. — verify grid-state.init produces a grid with > 1 row and column. Default is typically 2×2 for fresh boards.

**If T4 FAILS at `assert "[align-grid-snapshot] server-recv" in log`:** Drag fired but didn't broadcast. Same diagnostic path as T2 in M3:
- Check `[output-live-sync] emitLiveMutation skipped` in console.
- Check server validator rejection.

**Step 2: Run T1-T4 + T10 together:**

```
pytest test/live-e2e/test_phase36_align_handles.py::test_t1_handle_frame_matches_stream_content \
       test/live-e2e/test_phase36_align_handles.py::test_t2_corner_pulls_emit_align_grid_snapshot \
       test/live-e2e/test_phase36_align_handles.py::test_t3_vertex_drag_modifies_correct_vertex \
       test/live-e2e/test_phase36_align_handles.py::test_t4_midpoint_drag_emits_squish \
       test/live-e2e/test_phase36_align_handles.py::test_t10_no_duplicate_mutations -v
```

All 5 should pass.

**Step 3:** Document any non-trivial fixes in M4 SUMMARY (e.g. "had to add data-orientation attribute to handle-ui's midpoint creation" or "grid was 1×1 by default — fixed by initializing _gridRows=2 in loader's _createOutputState").
  </action>
  <verify>
    <automated>pytest test/live-e2e/test_phase36_align_handles.py::test_t4_midpoint_drag_emits_squish -v 2>&1 | tail -5</automated>
    Expected: `1 passed`
  </verify>
  <acceptance_criteria>
    - T4 GREEN: `pytest test/live-e2e/test_phase36_align_handles.py::test_t4_midpoint_drag_emits_squish -v 2>&1 | grep -cE "1 passed"` returns 1
    - T1, T2, T3, T10 still GREEN
    - Connection-stability fail=0
  </acceptance_criteria>
  <done>
    T4 midpoint/squish drag works end-to-end.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Wire T5 (rotation handle) — verify .projection-rotation-handle dispatches and broadcasts</name>
  <files>
    - src/app/runtime/output-receiver/boot-handle-ui.js
    - src/app/runtime/output-receiver/output-align-mode-loader.js
  </files>
  <read_first>
    - src/app/runtime/viewport/runtime-projection-handle-drag.js (rotation handler — find `.projection-rotation-handle` or `[data-handle-role="rotate"]` pointerdown)
    - src/app/runtime/viewport/runtime-projection-handle-ui.js (rotation handle creation — typically gated by `state.polygonEditor.rotatingRoomId !== null` OR a feature flag)
    - test/live-e2e/test_phase36_align_handles.py::test_t5_rotation_handle_emits_mutation (target test)
  </read_first>
  <behavior>
    - T5 expectation: `.projection-rotation-handle` (or `[data-handle-role="rotate"]`) element exists in DOM. Trace 30deg arc → `[align-grid-snapshot] server-recv` in stdout.
    - Rotation handles may be conditionally rendered (only when a room is selected for rotation, or when rotation mode is active). For /output/, the typical UX is: align-mode ON shows rotation handle for the active board's whole-grid rotation. If the handle doesn't render by default: investigate creation gate; force-enable for /output/ if appropriate.
    - Rotation handle drag → handle-drag.js applies rotation matrix to all `grid.points` → grid-state.broadcastGridSnapshot.
  </behavior>
  <action>
**Step 1: Run T5.**

```
pytest test/live-e2e/test_phase36_align_handles.py::test_t5_rotation_handle_emits_mutation -v
```

**If T5 PASSES:** No code change. Skip to Task verification.

**If T5 FAILS at `wait_for_function('.projection-rotation-handle, [data-handle-role="rotate"]')`:** Rotation handle not rendered. Diagnose:

1. Search for rotation handle creation:
   ```
   grep -nE "projection-rotation-handle|data-handle-role.*rotate|createRotationHandle" src/app/runtime/viewport/runtime-projection-handle-ui.js
   ```

2. Determine the gate condition. Common possibilities:
   - Gated by `state.polygonEditor.rotatingRoomId` — fix: not applicable (this is per-room rotation, not grid rotation)
   - Gated by a feature flag in state — fix: ensure that flag is true at boot for /output/
   - Gated by `outputRole === OUTPUT_ROLE_FINAL` — fix: ensure state has correct outputRole

3. If the rotation handle is dashboard-only by design and there's no /output/ counterpart: this is a Phase-36 deferral candidate. Document in deferred-items.md.

**If T5 FAILS at `assert "[align-grid-snapshot] server-recv" in log`:** Drag fired but didn't broadcast. Apply same diagnostic path as T2/T4.

**Step 2: Verify selector compatibility.**

The test uses `.projection-rotation-handle, [data-handle-role="rotate"]` (OR-list — either selector matches). If handle-ui creates the element with a DIFFERENT class (e.g. `.projection-rotate-handle`) or different attribute, ALIGN the source code to one of these. RESEARCH §4 noted "OR `[data-handle-role="rotate"]` — confirm during Wave-0 RED authoring" — Wave 0 is now done; M4 confirms which selector handle-ui actually uses. If the source uses something else, change handle-ui to use one of the two. The test is already expressed loosely.

**Step 3: Run T1-T5 + T10 together.**

```
pytest test/live-e2e/test_phase36_align_handles.py -v -k "test_t1 or test_t2 or test_t3 or test_t4 or test_t5 or test_t10"
```

All 6 should pass.

**Step 4: Verify T6-T9 still RED** (M5 will flip):

```
pytest test/live-e2e/test_phase36_align_handles.py -v -k "test_t6 or test_t7 or test_t8 or test_t9"
```

These should fail (RED-rail status preserved for M5).
  </action>
  <verify>
    <automated>pytest test/live-e2e/test_phase36_align_handles.py::test_t5_rotation_handle_emits_mutation -v 2>&1 | tail -5</automated>
    Expected: `1 passed`
  </verify>
  <acceptance_criteria>
    - T5 GREEN: `pytest test/live-e2e/test_phase36_align_handles.py::test_t5_rotation_handle_emits_mutation -v 2>&1 | grep -cE "1 passed"` returns 1
    - T1-T5 + T10 (6 tests) all GREEN: `pytest test/live-e2e/test_phase36_align_handles.py -v -k "test_t1 or test_t2 or test_t3 or test_t4 or test_t5 or test_t10" 2>&1 | grep -cE "6 passed"` returns 1
    - T6-T9 still RED (M5 work): `pytest test/live-e2e/test_phase36_align_handles.py -v -k "test_t6 or test_t7 or test_t8 or test_t9" --no-header 2>&1 | grep -cE "FAILED|ERROR"` returns ≥ 4
    - Connection-stability fail=0
    - output.html ≤8 src-based scripts
  </acceptance_criteria>
  <done>
    T5 rotation works end-to-end. T1-T5 + T10 all GREEN. T6-T9 remain RED for M5.
  </done>
</task>

</tasks>

<threat_model>
## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-DOS-1 | DoS | Vertex/midpoint/rotation drag mutation flood | accept | Existing 30Hz throttle preserved |
| T-LB-1 | DoS | Memory growth from per-drag undo entries | mitigate | M5 task adds 1000-entry cap |
</threat_model>

<verification>
M4 wave closure gates:
- T3, T4, T5 RED→GREEN
- T1, T2, T10 stay GREEN (regression check)
- T6-T9 stay RED (correctly — M5 work)
- Connection-stability fail=0
- D-09 ≤8 src-based scripts
</verification>

<success_criteria>
- 6 of 10 RED tests now GREEN (T1, T2, T3, T4, T5, T10)
- D-08 + D-09 preserved
</success_criteria>

<output>
After completion, create `.planning/phases/phase-36/36-M4-SUMMARY.md` documenting:
- T3, T4, T5 pass evidence
- Any debug-trace fixes required (e.g. handle-ui rotation-handle gate adjustment)
- Confirmation that no `[input-forwarder] sent phase=start` console messages during M4 gestures (T10 still GREEN)
</output>
