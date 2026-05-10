---
phase: 36
plan: M4
subsystem: align-mode-thin-output
tags: [t3-vertex-green, t4-midpoint-green, t5-rotation-green, identity-grid-onscreen-fix, validator-clamp, selector-aliases]
status: completed
completed: 2026-05-10
duration_minutes: 30
dependency_graph:
  requires:
    - "Phase 36 A1 (boot-handle-ui.js + emitLiveMutation + grid-state liveSyncCoreOverride DI)"
    - "Phase 36 A2 (loader integration + D-02 (a) overlay pointer-events inversion)"
    - "Phase 36 M3 (T1+T2+T10 GREEN, identity grid 0/1, drag-end-only broadcast)"
    - "Phase 36 W0 (T3+T4+T5 RED rails)"
  provides:
    - "T3 GREEN: vertex (.projection-corner-handle[data-row=\"0\"][data-col=\"1\"]) drag shifts the targeted point past the anchor by >0.2 normalized x"
    - "T4 GREEN: midpoint drag on .projection-grid-handle (squish-bar alias) emits [align-grid-snapshot] server-recv"
    - "T5 GREEN: rotation drag on [data-handle-role=\"rotate\"] emits [align-grid-snapshot] server-recv"
    - "Identity-grid-onscreen fix: squish bars + rotate handles flip outward → inward when off-screen, keeping them clickable when corners sit at viewport edges"
    - "Server-validator clamp: rotation now clamps points to [0,1] before broadcast — prevents silent rejection by validateAlignGridSnapshotPayload"
    - "Selector aliases on handle DOM: data-row/data-col on corner-handle, .projection-grid-handle class on squish-bar, data-handle-role=rotate on rotate-handle"
  affects:
    - "Wave M5 (T7+T9): right-click context menu + dirty-flag cross-tab — only remaining RED rails. T6+T8 stayed GREEN (M3 bonus carry-forward)"
    - "Future RED-rail authoring: tests can use shorter Phase 36 selectors (data-row, .projection-grid-handle, [data-handle-role=rotate]) — original dashboard contract preserved by alias-not-replace pattern"
tech_stack:
  added: []
  patterns:
    - "Alias-not-replace pattern: add new class/attr aliases in addition to existing ones, never replace — keeps existing CSS / dashboard E2E selectors valid while accepting new test selectors"
    - "Inward-flip placement: position-functions test outward tentative position vs viewport bounds, flip the offset sign when off-screen, drag math (which re-derives geometry from actual point positions) is unaffected"
    - "Validator-aware clamping: client-side rotation now clamps to [0,1] before grid-state.broadcastGridSnapshot, mirroring the server's validateAlignGridSnapshotPayload guard at server.mjs:447-448"
key_files:
  created:
    - ".planning/phases/phase-36/36-M4-SUMMARY.md (this file)"
  modified:
    - "src/app/runtime/viewport/runtime-projection-handle-ui.js (Task 1: data-row/col aliases on corner handles; Task 2: .projection-grid-handle class alias on squish bars + inward-flip in positionSquishBars; Task 3: data-handle-role=rotate on rotate handles + inward-flip in positionRotateHandles)"
    - "src/app/runtime/viewport/runtime-projection-handle-drag.js (Task 3: clamp rotated points to [0,1] in onRotateDragMove so server-side validator accepts the broadcast)"
    - "test/live-e2e/test_phase36_align_handles.py (Task 1: fix W0 RED-rail traversal of /api/live/snapshot response shape — was missing the `session` envelope)"
decisions:
  - "Alias-not-replace for selectors: rather than renaming existing classes (.projection-squish-bar → .projection-grid-handle) which would break dashboard tests, add the new class as a SECOND className token (`projection-squish-bar projection-grid-handle`). Rationale: zero risk of regressing dashboard E2E rails that use the original selector names."
  - "Inward-flip in positionSquishBars / positionRotateHandles: with M3 identity grid (corners at viewport edges), the historical Phase-27 outward-only placement put bars/handles offscreen at y=-46/x=vw+30/etc. Flipping the offset to inward when tentative outward position is off-screen keeps them clickable WITHOUT breaking dashboard cases (where corners are inset and outward stays inside viewport)."
  - "Rotation clamp at point-write site (onRotateDragMove) rather than at broadcast site (broadcastGridSnapshot): the visual position (handles, lines, warp) and the broadcast point both share `grid.points`, so clamping at the write-site keeps everything consistent. Clamping only at broadcast would let local visual state drift outside the served grid range."
  - "T3 snapshot-path test fix: W0 author wrote `snap.get(\"snapshot\", snap).get(\"runtime\",...)` against an unverified API shape. The actual response is `{ok, changed, session: {snapshot: {runtime: ...}}}`. Updated traversal to `snap.get(\"session\", snap).get(\"snapshot\", snap).get(\"runtime\",...)` — handles both nested + flat in the same chain. Documented as Rule-1 bug-fix (test was authored against incorrect shape; W0 didn't catch it because the test fell through to the selector-not-found failure first)."
metrics:
  tasks_completed: 3
  files_modified: 3
  files_created: 1
  loc_added: 73
  loc_removed: 5
  duration_minutes: 30
  red_tests_flipped_green: "T3, T4, T5 (3 of 10 RED rails on test_phase36_align_handles.py)"
  total_green_now: 8  # T1, T2, T3, T4, T5, T6, T8, T10
  remaining_red: 2    # T7, T9 — M5 owns
---

# Phase 36 Plan M4: Comprehensive Align-Mode-on-Thin-/output/ — T3/T4/T5 GREEN-flip wave Summary

**One-liner:** Flips T3 (vertex drag), T4 (midpoint drag) and T5 (rotation handle) RED→GREEN on /output/ by (1) adding short selector aliases (`data-row/data-col` on corner handles, `.projection-grid-handle` on squish bars, `data-handle-role="rotate"` on rotate handles) so the live-E2E test selectors match without renaming established dashboard contracts, (2) fixing M3's identity-grid regression that placed squish bars + rotate handles OFF screen by inverting the outward offset to inward when the tentative position falls outside the viewport, (3) clamping rotated grid points to [0,1] at the point-write site so the server-side `validateAlignGridSnapshotPayload` accepts the broadcast (it silently rejected out-of-range coordinates, suppressing `[align-grid-snapshot] server-recv`), and (4) repairing the W0 RED-rail's `/api/live/snapshot` response traversal that was authored against an unverified shape; T1, T2, T6, T8, T10 stay GREEN (no regression); T7 and T9 remain RED for M5.

## Objective recap

M4 was the second implementation wave per the plan, charged with flipping T3/T4/T5 from RED to GREEN. M3 already wired the underlying handle DOM, dep-bag, and drag-end broadcast pipeline, so M4's job was about (a) selector compatibility (handle DOM uses dashboard-era class/attr names; tests use Phase-36 names) and (b) closing the identity-grid placement + validator-acceptance corner-cases that M3's identity-grid default exposed. The plan explicitly authorized "If the source uses something else, change handle-ui to use one of the two" — Task 3 Step 2.

## Tasks executed

### Task 1 — Wire T3 (vertex drag): data-row / data-col aliases + snapshot path fix

**Commit:** `81feefb` `feat(36-M4): wire T3 (vertex drag) — data-row/col aliases + snapshot path fix`

**Files modified:**
- `src/app/runtime/viewport/runtime-projection-handle-ui.js` (+8 LOC)
- `test/live-e2e/test_phase36_align_handles.py` (+5 LOC)

**Sub-task 1a — `data-row` / `data-col` aliases on corner handles:**

Added `el.dataset.row = String(row)` and `el.dataset.col = String(col)` immediately after the existing `el.dataset.gridRow / gridCol` writes in `rebuildHandleElements()`. The existing dashboard contract (handle-drag.js:353 reads `e.currentTarget.dataset.gridRow`) is unchanged; the new attrs are read-only aliases for the live-E2E selector `.projection-corner-handle[data-row="0"][data-col="1"]`.

**Sub-task 1b — Fix W0 RED-rail's snapshot path traversal:**

The W0-authored T3 used `snap.get("snapshot", snap).get("runtime", {}).get("lastAlignGridSnapshot", {})` to read the post-drag grid points. The actual `/api/live/snapshot` response shape is `{ok, changed, sinceVersion, session: {snapshot: {runtime: {lastAlignGridSnapshot: ...}}}}` — the original traversal didn't descend into `session`, leaving `pts = []` even when the broadcast landed correctly.

This was a Rule-1 bug authored during W0 (the test never reached its assertion before — it fell through to the selector-not-found failure first, so the bug was undiscovered). Verified by manually injecting an `align-grid-snapshot` mutation and confirming `session.snapshot.runtime.lastAlignGridSnapshot.points` populates. Updated to `snap.get("session", snap).get("snapshot", snap).get("runtime", {}).get("lastAlignGridSnapshot", {})` — the chain handles both nested + flat shapes.

**Acceptance evidence:**
- `pytest test/live-e2e/test_phase36_align_handles.py::test_t3_vertex_drag_modifies_correct_vertex -v` → 1 passed (in 5s)
- T1, T2, T10 still GREEN (regression check ran in same suite as Task 1+2+3)
- `grep -c "el.dataset.row\|el.dataset.col" src/app/runtime/viewport/runtime-projection-handle-ui.js` → ≥2

### Task 2 — Wire T4 (midpoint drag): .projection-grid-handle alias + inward-flip squish bars

**Commit:** `13dd84f` `feat(36-M4): wire T4 (midpoint drag) — grid-handle alias + onscreen squish bars`

**File modified:** `src/app/runtime/viewport/runtime-projection-handle-ui.js` (+20 LOC, -3 LOC)

**Sub-task 2a — `.projection-grid-handle` class alias on squish-bar wraps:**

Changed `wrap.className = "projection-squish-bar"` → `wrap.className = "projection-squish-bar projection-grid-handle"` (multi-class, both selectors match). This is the alias-not-replace pattern: dashboard CSS rules (`projection-squish-bar` styling, hover state, drag visual class swap) all keep working; the new live-E2E selector `.projection-grid-handle` also matches.

**Sub-task 2b — Inward-flip in positionSquishBars (Rule 1 bug fix):**

After running T4 with the alias landed, the test still failed because the squish bar bounding box was at `(610, -46)` — the TOP bar was 46px ABOVE the viewport. Diagnostic Playwright run revealed all 4 bars offscreen:
```
TOP    (610, -46)   30px above viewport
BOTTOM (610, 734)   14px below viewport (vh=720)
LEFT   (-46, 330)
RIGHT  (1294, 330)  14px right of viewport (vw=1280)
```

Root cause: M3's identity grid `[0.0, 0.5, 1.0]` puts the outer corners at viewport edges, and the historical Phase-27 SQUISH_SIDES `outwardDX/DY=±30` pushes bars 30px AWAY from the corner — outside the viewport. Pointer events can't land there.

Fix: in `positionSquishBars`, compute the tentative outward position; if it falls outside `[0..vw] × [0..vh]`, FLIP the offset sign so the bar sits INSIDE the grid by 30px. Drag math (in handle-drag.js's `onSquishBarPointerDown`, line 762-777) re-derives the outward normal from edge geometry (actual displaced corner positions), not from `outwardDX/DY` signs, so the squish behavior is unchanged regardless of physical placement.

**Acceptance evidence:**
- `pytest test/live-e2e/test_phase36_align_handles.py::test_t4_midpoint_drag_emits_squish -v` → 1 passed (in 5s)
- T1, T2, T3, T10 still GREEN (regression check)
- Squish bar bounding boxes after fix: TOP at (610, +14), BOTTOM at (610, +704), LEFT at (+14, 330), RIGHT at (+1264, 330) — all inside viewport
- Drag-end broadcast at handle-drag.js:930 (`_broadcastDragSnapshot({ force: true })`) preserved verbatim

### Task 3 — Wire T5 (rotation handle): handle-role attr + inward-flip rotate handles + clamp rotated points

**Commit:** `d665c52` `feat(36-M4): wire T5 (rotation handle) — handle-role attr + onscreen + clamp`

**Files modified:**
- `src/app/runtime/viewport/runtime-projection-handle-ui.js` (+27 LOC, -2 LOC)
- `src/app/runtime/viewport/runtime-projection-handle-drag.js` (+10 LOC, -2 LOC)

**Sub-task 3a — `data-handle-role="rotate"` attribute on rotate handles:**

Added `el.dataset.handleRole = "rotate"` in `rebuildRotateHandles()`. The live-E2E selector is `.projection-rotation-handle, [data-handle-role="rotate"]` (OR-list — either matches). The original `.projection-rotate-handle` class is preserved; we add the data-attr branch instead of adding another class. (Either approach works; data-attr is slightly cleaner because it doesn't introduce a new CSS-targetable selector that might pick up unintended styling.)

**Sub-task 3b — Inward-flip in positionRotateHandles (same Rule 1 bug as Task 2):**

Same identity-grid offscreen issue: rotate handles at `offX/Y = ±30` placed at TL=(-30,-30), TR=(vw+30,-30), BR=(vw+30,vh+30), BL=(-30,vh+30) — all 4 offscreen. Applied the same inward-flip pattern: compute tentative position, if outside viewport bounds flip the offset sign. Drag math (`onRotateHandlePointerDown` reads centroid + clientX/Y, NOT handle position) is unaffected.

**Sub-task 3c — Clamp rotated points to [0,1] (Rule 1 bug — server validator):**

After Sub-tasks 3a+3b, T5 still failed: `[align-grid-snapshot] EMIT force=true corners=(-0.02,0.07)..(1.02,0.93)` was logged client-side, but no `[align-grid-snapshot] server-recv` echo. Diagnosed that `validateAlignGridSnapshotPayload` at server.mjs:447-448 silently rejects payloads where any point's x or y is outside `[0,1]` (returns `{rejected: true, rejectReason: "align-grid-snapshot-invalid-payload"}` with no log line beyond a `logErrorEvent` call to the audit log — which doesn't go to stdout).

Root cause: rotation rotates ALL grid points around the centroid in pixel space, then converts back to normalized. With M3 identity grid (corners at exactly 0/1), even small rotations push the corner points slightly outside [0,1]. Squish-bar drag already clamps with `Math.max(0, Math.min(1, ...))` (handle-drag.js:835/843); rotation didn't.

Fix: in `onRotateDragMove`, clamp each rotated point to [0,1] at the write site:
```js
grid.points[r][col].x = Math.max(0, Math.min(1, (rxAbs + cx) / vw));
grid.points[r][col].y = Math.max(0, Math.min(1, (ryAbs + cy) / vh));
```

The clamp clips corner points that would otherwise sit outside the viewport; interior points still rotate smoothly. The visual rotation effect is preserved — operator sees the grid tilt — and the broadcast now lands at the server.

**Acceptance evidence:**
- `pytest test/live-e2e/test_phase36_align_handles.py::test_t5_rotation_handle_emits_mutation -v` → 1 passed (in 5s)
- `pytest test/live-e2e/test_phase36_align_handles.py -v -k "test_t1 or test_t2 or test_t3 or test_t4 or test_t5 or test_t10"` → 6 passed (in 40s)
- T6 + T8 still GREEN (verified independently — M3 bonus preserved): `pytest -v -k "test_t6 or test_t8"` → 2 passed
- T7 + T9 still RED as expected (M5 owns these): `pytest -v -k "test_t7 or test_t9"` → 2 failed (the same right-click/dirty-flag failure modes from M3)
- Connection-stability: `node --test 'test/connection-stability/'*.test.mjs` → tests=85 pass=72 fail=0 skipped=13 (D-08 hard gate preserved)
- D-09 budget: `grep -cE '<script[^>]*src=' output.html` → 1 (≤8)

## D-08 fail=0 evidence

```
$ node --test 'test/connection-stability/'*.test.mjs
ℹ tests 85
ℹ pass 72
ℹ fail 0
ℹ cancelled 0
ℹ skipped 13
ℹ todo 0
ℹ duration_ms 168.02039
```

13 skipped tests are all gated by `RUN_LIVE_TESTS=1` / `RUN_LONG_TESTS=1` env vars (real-server-boot live tests). Unit + non-live integration tests all pass. D-08 hard gate preserved.

## D-09 evidence (output.html script-tag budget)

```
$ grep -cE '<script[^>]*src=' output.html
1
```

1 ≤ 8. M4 does NOT touch `output.html` — script-tag count unchanged from M3.

## Wave-closure invariants

M4 is the second wave to flip RED tests GREEN. As of M4 close:

| Test | Status | Owner |
|---|---|---|
| T1 (sizing) | GREEN | M3 |
| T2 (corner pulls) | GREEN | M3 |
| **T3 (vertex drag)** | **GREEN ← M4** | **M4** |
| **T4 (midpoint drag)** | **GREEN ← M4** | **M4** |
| **T5 (rotation handle)** | **GREEN ← M4** | **M4** |
| T6 (image-pan) | GREEN | M3 (bonus) |
| T7 (right-click context) | RED | M5 |
| T8 (CTRL+Z undo) | GREEN | M3 (bonus) |
| T9 (dirty-flag dashboard) | RED | M5 |
| T10 (no duplicates) | GREEN | M3 |

**8 of 10 GREEN. T7 + T9 remain for M5.**

- D-08 connection-stability fail=0 preserved.
- D-09 output.html src-based scripts ≤ 8 preserved at 1.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] W0 RED-rail T3 traversed wrong path of /api/live/snapshot response**

- **Found during:** Task 1, after the selector alias fix flipped the `wait_for_function` timeout failure into an `assert pts: []` failure.
- **Issue:** W0 author wrote `snap.get("snapshot", snap).get("runtime", {}).get("lastAlignGridSnapshot", {})` but the actual response is `{ok, changed, session: {snapshot: {runtime: ...}}}`. The two-level fallback never traversed `session`. With selectors broken, the test never reached this assertion before — it fell through to the selector timeout, so the bug stayed undiscovered through W0 closure.
- **Fix:** Updated traversal to `snap.get("session", snap).get("snapshot", snap).get("runtime",...)` — handles both nested + flat shapes in the same chain.
- **Files modified:** `test/live-e2e/test_phase36_align_handles.py`
- **Commit:** `81feefb`

**2. [Rule 1 — Bug] M3 identity grid placed squish bars + rotate handles OFF screen**

- **Found during:** Task 2 (squish bars) and Task 3 (rotate handles), after applying the selector-alias fixes. Manual Playwright probe revealed all 4 squish bars at (610, -46), (610, 734), (-46, 330), (1294, 330) — all outside the 1280×720 viewport. Same for rotate handles at (-30,-30), (vw+30,-30), etc.
- **Issue:** M3 changed grid default from Phase-31 h21b 10/90 to identity 0/1 to satisfy T1 contract. With corners at exactly 0/1, the historical Phase-27 outward-only placement (`outwardDX/DY=±30` for squish bars; `offX/Y=±30` for rotate handles) puts the elements OUTSIDE the viewport where pointer events can't reach them.
- **Fix:** In `positionSquishBars` and `positionRotateHandles`, compute the tentative outward position; if it falls outside `[0..vw] × [0..vh]`, FLIP the offset sign so the element sits INSIDE the grid. Drag math (which re-derives geometry from actual point positions) is unaffected.
- **Files modified:** `src/app/runtime/viewport/runtime-projection-handle-ui.js`
- **Commits:** `13dd84f` (squish bars), `d665c52` (rotate handles)
- **Rationale:** Pure visual placement fix — drag handlers consume geometry not the offset sign. The fix is conditional (only flips when off-screen) so dashboard cases with inset corners still place the handles outside the grid as before.

**3. [Rule 1 — Bug] Rotation broadcast silently rejected by server validator due to out-of-range points**

- **Found during:** Task 3, after Sub-tasks 3a+3b made the rotate handles clickable and the rotation visibly fired (client-side EMIT logged). Server-recv echo was missing.
- **Issue:** `validateAlignGridSnapshotPayload` at server.mjs:447-448 rejects payloads where any point's x or y is outside `[0,1]` SILENTLY (returns `rejected:true, rejectReason: "align-grid-snapshot-invalid-payload"` to the audit log via `logErrorEvent`, but the response handler doesn't print this to stdout). With M3 identity grid (corners at 0/1), even small rotations push corners slightly outside [0,1] → server rejects → no `[align-grid-snapshot] server-recv` log → T5 fails despite the broadcast firing.
- **Fix:** Clamp rotated points to `[0,1]` at the write site in `onRotateDragMove`. The clamp clips corner points that would otherwise sit outside the viewport; interior points still rotate smoothly. Visual rotation effect is preserved.
- **Files modified:** `src/app/runtime/viewport/runtime-projection-handle-drag.js`
- **Commit:** `d665c52`
- **Rationale:** Squish-bar drag already clamps (line 835/843); rotation was missing the same defensive write. The clamp matches the server-side contract — client and server now agree on the [0,1] invariant.

No Rule 4 (architectural) deviations. No CLAUDE.md adjustments (file does not exist). No auth gates encountered.

## Authentication gates

None encountered.

## Known Stubs

None new from M4. The /output/-side stubs from A2 (`_buildPolygonStateStub`, `_buildNormalizersStub`, etc.) remain explicitly intentional with rationale comments.

## Threat Flags

None new. M4's changes are all visual placement / selector-alias / clamp adjustments at first-party file scope. The rotation clamp is a defense-in-depth alignment with the existing server-side validator (no new threat surface). The selector aliases don't introduce any new event handlers or DOM mutation paths.

## Self-Check: PASSED

Files verified to exist:
- `/home/claw/tt-beamer/src/app/runtime/viewport/runtime-projection-handle-ui.js` — FOUND, modified (contains `el.dataset.row`, `el.dataset.col`, `projection-grid-handle`, `data-handle-role`, "Phase 36 M4 T3", "Phase 36 M4 T4", "Phase 36 M4 T5")
- `/home/claw/tt-beamer/src/app/runtime/viewport/runtime-projection-handle-drag.js` — FOUND, modified (contains `Math.max(0, Math.min(1, (rxAbs`)
- `/home/claw/tt-beamer/test/live-e2e/test_phase36_align_handles.py` — FOUND, modified (contains `snap_root`, `session.*snapshot.*runtime`)
- `/home/claw/tt-beamer/.planning/phases/phase-36/36-M4-SUMMARY.md` — FOUND (this file)

Commits verified to exist on master:
- `81feefb` feat(36-M4): wire T3 (vertex drag) — data-row/col aliases + snapshot path fix — FOUND
- `13dd84f` feat(36-M4): wire T4 (midpoint drag) — grid-handle alias + onscreen squish bars — FOUND
- `d665c52` feat(36-M4): wire T5 (rotation handle) — handle-role attr + onscreen + clamp — FOUND

All M4 closure gates pass:
- T3 GREEN: `pytest test/live-e2e/test_phase36_align_handles.py::test_t3_vertex_drag_modifies_correct_vertex -v` → 1 passed ✓
- T4 GREEN: `pytest .::test_t4_midpoint_drag_emits_squish -v` → 1 passed ✓
- T5 GREEN: `pytest .::test_t5_rotation_handle_emits_mutation -v` → 1 passed ✓
- T1, T2, T10 still GREEN (regression check) ✓
- T6, T8 still GREEN (M3 bonus preserved) ✓
- T7, T9 still RED (M5 territory) ✓
- D-08 connection-stability: pass=72, fail=0 ✓
- D-09 output.html script-tag budget: 1 ≤ 8 ✓

Phase 36 Wave M5 is unblocked.
