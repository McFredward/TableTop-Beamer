---
phase: 36
plan: M5
type: execute
wave: 5
depends_on: [M4]
files_modified:
  - src/app/runtime/output-receiver/boot-handle-ui.js
  - src/app/runtime/output-receiver/output-align-mode-loader.js
  - src/app/runtime/viewport/runtime-projection-grid-state.js
  - src/app/runtime/viewport/runtime-projection-handle-ui.js
autonomous: true
requirements_addressed: [D-01, D-04, D-05, D-06, T6, T7, T8, T9, T10]
gap_closure: false
must_haves:
  truths:
    - "T6 (image-pan in free area emits align-grid-snapshot) PASSES on /output/"
    - "T7 (right-click context menu shows .board-context-menu with at least 2 items; Add line through this point click broadcasts) PASSES on /output/"
    - "T8 (CTRL+Z reverts last drag — handle returns within 3px of initial position) PASSES on /output/"
    - "T9 (gesture sets dashboard #align-mode-dirty-hint hidden=false; AND server stdout shows [align-mode-dirty] received dirty= line) PASSES on /output/"
    - "T1-T5 + T10 stay GREEN (no regression)"
    - "Q3 LOCKED: addHorizontalLine / addVerticalLine / removeHorizontalLine / removeVerticalLine call broadcastGridSnapshot({force:true}) immediately"
    - "Q5 LOCKED: grid-state's undo stack capped at 1000 entries with FIFO eviction"
    - "All 10 RED tests now GREEN; full Phase 36 suite passes"
    - "Connection-stability fail=0 (D-08)"
    - "output.html script-tag count is at most 8 (D-09)"
  artifacts:
    - path: "src/app/runtime/viewport/runtime-projection-grid-state.js"
      provides: "Undo stack with 1000-entry FIFO cap (Q5 LOCKED)"
      contains: "1000"
    - path: "src/app/runtime/viewport/runtime-projection-handle-ui.js"
      provides: "addHorizontalLine etc. call broadcastGridSnapshot({force:true}) immediately (Q3 LOCKED)"
      contains: "force"
    - path: "src/app/runtime/output-receiver/boot-handle-ui.js"
      provides: "Dirty-flag wiring: notifyDirtyChanged plumbs through to /api/align-mode-dirty"
      contains: "alignModeDirtyEndpoint"
    - path: "src/app/runtime/output-receiver/output-align-mode-loader.js"
      provides: "Image-pan, right-click, CTRL+Z, dirty-flag stubs upgraded for full functionality"
      contains: "alignModeDirtyEndpoint"
  key_links:
    - from: "Right-click Add line through this point menu item"
      to: "handle-ui.addHorizontalLine -> grid-state.broadcastGridSnapshot({force: true}) -> emitLiveMutation -> server"
      via: "Q3 immediate-broadcast lock"
      pattern: "broadcastGridSnapshot.*force"
    - from: "CTRL+Z keypress"
      to: "handle-ui keydown listener -> grid-state.popUndo -> grid-state.broadcastGridSnapshot -> server"
      via: "client-local stack pop + broadcast (D-04)"
      pattern: "ctrlKey|metaKey"
    - from: "Drag end on /output/"
      to: "profile-persistence.notifyDirtyChanged -> POST /api/align-mode-dirty -> server.mjs handler logs [align-mode-dirty] received dirty="
      via: "alignModeDirtyEndpoint string passed through bootHandleUi to profile-persistence init"
      pattern: "/api/align-mode-dirty"
threat_model:
  threats:
    - id: T-LB-1
      title: "Unbounded undo stack memory growth"
      stride: DoS
      asvs: V11
      severity: low
      description: "Operator drags for hours -> stack grows to 100k+ entries"
      existing_mitigation: "None"
      new_mitigation: "Q5 LOCKED — 1000-entry FIFO cap (Task 4)"
    - id: T-XSS-1
      title: "XSS via room name in context menu"
      stride: Tampering
      asvs: V5
      severity: low
      description: "Right-click menu shows room name; if innerHTML, attacker-controlled room names execute script"
      existing_mitigation: "handle-ui.js:1390 uses .textContent (verified RESEARCH §8 + Phase 36 grep)"
      new_mitigation: "None — verify by code review"
---

<objective>
Wire T6 (image-pan), T7 (right-click context menu), T8 (CTRL+Z undo), T9 (dirty-flag) on /output/. These are the final 4 RED tests. After M5, all 10 T1-T10 are GREEN.

Two locked planner reconciliations land in this wave:
- Q3 LOCKED: line-add/remove (right-click menu) calls broadcastGridSnapshot({force:true}) immediately. RESEARCH §10 code-example noted the existing implementation defers broadcast to next drag — Q3 lock changes this to immediate so T7 can assert in stdout right after the menu click.
- Q5 LOCKED: grid-state undo stack capped at 1000 entries (FIFO). RESEARCH §8 T-LB-1 mitigation.

For T9 (dirty-flag), the path: drag end -> handle-drag triggers profile-persistence's notifyDirtyChanged -> POST /api/align-mode-dirty -> server.mjs handler logs [align-mode-dirty] received dirty= (W0 wired this) AND broadcasts to dashboard via existing live-sync -> dashboard's #align-mode-dirty-hint becomes visible.

Per RESEARCH §9: M5 is sequential after M4.

Purpose: Final implementation wave. Flips remaining 4 RED tests; lands Q3+Q5 reconciliations.

Output: All 10 T1-T10 GREEN. Phase 36 implementation work complete (V wave is verification + sign-off only).
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
@.planning/phases/phase-36/36-M4-SUMMARY.md
@src/app/runtime/output-receiver/boot-handle-ui.js
@src/app/runtime/output-receiver/output-align-mode-loader.js
@src/app/runtime/viewport/runtime-projection-handle-ui.js
@src/app/runtime/viewport/runtime-projection-handle-drag.js
@src/app/runtime/viewport/runtime-projection-grid-state.js
@src/app/runtime/viewport/runtime-projection-profile-persistence.js
@test/live-e2e/test_phase36_align_handles.py

<interfaces>
From src/app/runtime/viewport/runtime-projection-handle-ui.js (~line 1439-1489):
- addHorizontalLine(normY) inserts a row, calls notifyDirtyChanged. Q3 LOCK adds immediate broadcastGridSnapshot({force:true}).
- Same pattern for addVerticalLine, removeHorizontalLine, removeVerticalLine.

From src/app/runtime/viewport/runtime-projection-grid-state.js:
- broadcastGridSnapshot(opts) — opts.force=true bypasses the 30Hz throttle.
- pushUndo / popUndo — local stack. Q5 LOCK: cap at 1000 entries with FIFO shift.

From src/app/runtime/viewport/runtime-projection-profile-persistence.js (~line 598):
- notifyDirtyChanged() schedules a debounced POST to "/api/align-mode-dirty" (hardcoded today; Phase 36 may parameterize via init arg).

From handle-ui keydown listener (search in handle-ui.js for "ctrlKey" or "keydown"):
- (e.ctrlKey || e.metaKey) && e.key === "z" -> pop grid-state undo, re-render handles, broadcast.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Wire T6 (image-pan) — verify free-area drag triggers handle-ui line-canvas onLinePointerDown empty-hit-test → broadcastGridSnapshot</name>
  <files>
    - src/app/runtime/output-receiver/boot-handle-ui.js
    - src/app/runtime/output-receiver/output-align-mode-loader.js
  </files>
  <read_first>
    - src/app/runtime/viewport/runtime-projection-handle-ui.js (locate `lineCanvas.addEventListener("pointerdown", onLinePointerDown)` — RESEARCH §3 cites line 1095)
    - src/app/runtime/viewport/runtime-projection-handle-drag.js (locate pan-drag handler — distinct from line-drag)
    - test/live-e2e/test_phase36_align_handles.py::test_t6_image_pan_emits_mutation
    - .planning/phases/phase-36/36-RESEARCH.md §3 (image-pan area routing)
  </read_first>
  <behavior>
    - T6 expectation: click center of viewport (free area) + drag 50px diagonal → server stdout shows `[align-grid-snapshot] server-recv`.
    - Per RESEARCH §3: `#projection-grid-line-canvas` (z:9997, pointer-events:auto) captures the click. handle-ui's `onLinePointerDown` runs hit-test: line-hit triggers line-drag; empty-area triggers pan-drag.
    - Pan-drag translates all `grid.points` by the delta and broadcasts via grid-state.
    - May already work after M3 (line-canvas exists when handles render). If T6 fails: investigate the line-canvas presence + pointer-event capture chain.
  </behavior>
  <action>
**Step 1: Run T6 to see status.**

```
pytest test/live-e2e/test_phase36_align_handles.py::test_t6_image_pan_emits_mutation -v
```

**If T6 PASSES:** Skip to Task 2.

**If T6 FAILS:**

1. Verify `#projection-grid-line-canvas` exists when align-mode is on (Playwright eval: `document.getElementById("projection-grid-line-canvas")` returns non-null).

2. If absent: handle-ui's line-canvas creation may be conditional. Find via `grep -nE "projection-grid-line-canvas" src/app/runtime/viewport/runtime-projection-handle-ui.js`. Confirm creation runs on /output/.

3. Verify `pointer-events: auto` on the line-canvas (Phase 35-A `!important` rule was DELETED in A2 — that should have unblocked it).

4. If pan-drag IS firing (handle-drag's onPointerMove logs to console) but not broadcasting: check that pan handler calls `broadcastGridSnapshot` (not just an internal `applyTransform`). Add the call if missing.

**Step 2: Run T1-T6 + T10 together for regression check.**
  </action>
  <verify>
    <automated>pytest test/live-e2e/test_phase36_align_handles.py::test_t6_image_pan_emits_mutation -v 2>&1 | tail -5</automated>
    Expected: `1 passed`
  </verify>
  <acceptance_criteria>
    - T6 GREEN: `pytest test/live-e2e/test_phase36_align_handles.py::test_t6_image_pan_emits_mutation -v 2>&1 | grep -cE "1 passed"` returns 1
    - T1-T5 + T10 still GREEN
    - Connection-stability fail=0
  </acceptance_criteria>
  <done>
    T6 image-pan works end-to-end via line-canvas free-area branch.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Wire T7 (right-click context menu) and lock Q3 — addHorizontalLine etc. broadcast immediately with {force:true}</name>
  <files>
    - src/app/runtime/viewport/runtime-projection-handle-ui.js
    - src/app/runtime/viewport/runtime-projection-grid-state.js
    - src/app/runtime/output-receiver/output-align-mode-loader.js
  </files>
  <read_first>
    - src/app/runtime/viewport/runtime-projection-handle-ui.js (locate addHorizontalLine, addVerticalLine, removeHorizontalLine, removeVerticalLine — typically lines 1430-1570; locate showContextMenu and onContextMenu — lines ~1278 + ~1378-1390)
    - src/app/runtime/viewport/runtime-projection-grid-state.js (broadcastGridSnapshot signature — confirm whether it already accepts opts.force)
    - .planning/phases/phase-36/36-RESEARCH.md §10 verified pattern (existing addHorizontalLine code shape)
    - test/live-e2e/test_phase36_align_handles.py::test_t7_right_click_context_menu
  </read_first>
  <behavior>
    - T7 expectation: right-click center → `.board-context-menu` appears with at least 2 items → click "Add line through this point" → server stdout contains EITHER `/api/align-mode-dirty` OR `[align-grid-snapshot] server-recv`.
    - Q3 LOCKED: line-add and line-remove call `broadcastGridSnapshot({force:true})` IMMEDIATELY. This guarantees the server sees the new grid structure without waiting for a subsequent drag.
    - D-05: context menu fully rendered locally on /output/ via handle-ui's existing infrastructure. handle-ui IIFE is universal (RESEARCH §6) — no /output/-specific gating needed.
    - T-XSS-1: `.textContent` is used (NOT innerHTML) — verify by grep.
  </behavior>
  <action>
**Step 1: Run T7 to see current state.**

```
pytest test/live-e2e/test_phase36_align_handles.py::test_t7_right_click_context_menu -v
```

**If T7 FAILS at `wait_for_selector('.board-context-menu')`:** Right-click not reaching handle-ui's contextmenu handler. Diagnose:

1. Check `interactions.isAcceptablePolygonPointerEvent` from A2 stub: `(event) => event?.button !== 2`. This RETURNS FALSE for right-click. If handle-ui gates contextmenu by this, it would swallow right-click. FIX: Update A2 stub in `output-align-mode-loader.js` `_buildInteractionsStub`:

   ```js
   isAcceptablePolygonPointerEvent: (event) => true,  // /output/: allow all pointer events including right-click
   ```

   (Confirm by reading handle-ui source whether the guard is applied to contextmenu OR only drag-start. If only drag-start, leave as `event.button !== 2`.)

2. Verify `state.alignMode === true` at right-click time.

3. Verify menu items: `.board-context-menu-item` count and "Add line through this point" text exact match (RESEARCH §4 verified at handle-ui.js:1325).

**Step 2: Apply Q3 LOCK regardless of T7 initial status.**

In `src/app/runtime/viewport/runtime-projection-handle-ui.js`, locate addHorizontalLine, addVerticalLine, removeHorizontalLine, removeVerticalLine. After each function's existing `notifyDirtyChanged()` call (or end of function — RESEARCH §10 verified pattern), ADD an immediate broadcastGridSnapshot call:

```js
// Q3 LOCKED (Phase 36 M5) — immediate-broadcast on line add/remove so dashboard
// sees the new structure without waiting for the next drag. {force:true} bypasses
// the 30Hz throttle since line-changes are operator-paced (not gesture-paced).
try {
  const _gs = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
  _gs?.broadcastGridSnapshot?.({ force: true });
} catch (e) { /* tolerated */ }
```

**Step 3: Verify broadcastGridSnapshot accepts {force:true}.**

In `src/app/runtime/viewport/runtime-projection-grid-state.js`, locate the broadcastGridSnapshot function (~line 380-453). If it does NOT already accept opts:

```js
// CURRENT (likely):
function broadcastGridSnapshot() {
  const now = performance.now();
  if (now - _lastBroadcastAt < _BROADCAST_MIN_INTERVAL_MS) return;
  // ... payload + emit ...
  _lastBroadcastAt = now;
}

// PHASE 36 M5 (Q3 LOCK):
function broadcastGridSnapshot(opts = {}) {
  const now = performance.now();
  if (!opts.force && (now - _lastBroadcastAt < _BROADCAST_MIN_INTERVAL_MS)) return;
  // ... payload + emit (UNCHANGED) ...
  _lastBroadcastAt = now;
}
```

If the function ALREADY accepts opts: confirm via grep `broadcastGridSnapshot\s*=\s*function\s*\(\s*opts` or `function\s+broadcastGridSnapshot\s*\(\s*opts`. No further change.

**Step 4: Re-run T7.**

```
pytest test/live-e2e/test_phase36_align_handles.py::test_t7_right_click_context_menu -v
```

T7 should pass.

**Step 5: Verify XSS-safe textContent usage (T-XSS-1):**

```
grep -nE "innerHTML\s*=" src/app/runtime/viewport/runtime-projection-handle-ui.js | grep -iE "menu|item|name"
```

Expect ZERO matches. If any match: replace with `.textContent =` per T-XSS-1 mitigation.
  </action>
  <verify>
    <automated>pytest test/live-e2e/test_phase36_align_handles.py::test_t7_right_click_context_menu -v 2>&1 | tail -5</automated>
    Expected: `1 passed`
  </verify>
  <acceptance_criteria>
    - T7 GREEN: `pytest test/live-e2e/test_phase36_align_handles.py::test_t7_right_click_context_menu -v 2>&1 | grep -cE "1 passed"` returns 1
    - `grep -c "force.*true" src/app/runtime/viewport/runtime-projection-handle-ui.js` returns at least 4 (one per add/remove function — Q3 LOCK)
    - `grep -nE "broadcastGridSnapshot.*opts|opts\.force" src/app/runtime/viewport/runtime-projection-grid-state.js` returns at least 1 (signature supports force)
    - `grep -cnE "innerHTML\s*=" src/app/runtime/viewport/runtime-projection-handle-ui.js | grep -iE "menu|item|name"` returns 0 (T-XSS-1)
    - T1-T6 + T10 still GREEN
    - Connection-stability fail=0
  </acceptance_criteria>
  <done>
    T7 right-click menu renders + Add-line broadcasts immediately. Q3 LOCK applied to all four add/remove line functions. broadcastGridSnapshot supports force:true.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Wire T8 (CTRL+Z undo) — verify keydown listener active on /output/, undo pops grid-state stack and re-broadcasts</name>
  <files>
    - src/app/runtime/output-receiver/boot-handle-ui.js
    - src/app/runtime/viewport/runtime-projection-handle-ui.js
  </files>
  <read_first>
    - src/app/runtime/viewport/runtime-projection-handle-ui.js (locate keydown listener with ctrlKey/metaKey + key=="z" — typically inside the showHandles boot path)
    - src/app/runtime/viewport/runtime-projection-grid-state.js (locate popUndo or undo function — should re-apply the previous grid snapshot from the local stack)
    - test/live-e2e/test_phase36_align_handles.py::test_t8_ctrl_z_undoes_last_gesture
    - .planning/phases/phase-36/36-CONTEXT.md D-04 (client-local undo)
  </read_first>
  <behavior>
    - T8 expectation: drag handle 50px right → CTRL+Z → handle returns within 3px of initial position.
    - handle-ui's keydown listener runs at boot (gated by alignMode toggle? Check). On CTRL+Z: pop grid-state stack, re-render handles, broadcast.
    - The keydown listener may be attached to `document` or `window`. As long as bootHandleUi runs the showHandles path, the listener should be live.
    - If T8 fails: most likely the keydown listener was not attached because handle-ui's boot path was incomplete on /output/. M3 already wired the boot path; M5 just verifies CTRL+Z reaches it.
  </behavior>
  <action>
**Step 1: Run T8.**

```
pytest test/live-e2e/test_phase36_align_handles.py::test_t8_ctrl_z_undoes_last_gesture -v
```

**If T8 PASSES:** Skip to Task 4.

**If T8 FAILS:**

1. Verify the keydown listener exists. `grep -nE "ctrlKey|metaKey" src/app/runtime/viewport/runtime-projection-handle-ui.js` should find at least one match.

2. Verify it's attached on /output/. The listener may be added inside `showHandles(true)` — confirm by reading the surrounding code. If gated by `outputRole === OUTPUT_ROLE_CONTROL` (dashboard-only), REMOVE the gate (handle-ui is universal per RESEARCH §6). If gated by `_isSsrChromiumTab()`, that gate is correct (returns false for /output/ — not the SSR tab — so the listener attaches).

3. Verify popUndo broadcasts. The undo handler should call `broadcastGridSnapshot({force:true})` after popping (use the Q3-locked force flag). Add if missing:

   ```js
   // Inside the CTRL+Z handler, after grid-state.popUndo():
   try {
     window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE?.broadcastGridSnapshot?.({ force: true });
   } catch (e) {}
   ```

**Step 2: Re-run T8.**

```
pytest test/live-e2e/test_phase36_align_handles.py::test_t8_ctrl_z_undoes_last_gesture -v
```

T8 should pass.
  </action>
  <verify>
    <automated>pytest test/live-e2e/test_phase36_align_handles.py::test_t8_ctrl_z_undoes_last_gesture -v 2>&1 | tail -5</automated>
    Expected: `1 passed`
  </verify>
  <acceptance_criteria>
    - T8 GREEN: `pytest test/live-e2e/test_phase36_align_handles.py::test_t8_ctrl_z_undoes_last_gesture -v 2>&1 | grep -cE "1 passed"` returns 1
    - `grep -nE "ctrlKey|metaKey" src/app/runtime/viewport/runtime-projection-handle-ui.js` returns at least 1 match (keydown handler exists)
    - T1-T7 + T10 still GREEN
    - Connection-stability fail=0
  </acceptance_criteria>
  <done>
    T8 CTRL+Z undo works end-to-end. Local grid-state stack pop -> broadcast -> handle re-renders.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Wire T9 (dirty-flag) and lock Q5 — undo stack 1000-entry FIFO cap; alignModeDirtyEndpoint plumbed through profile-persistence</name>
  <files>
    - src/app/runtime/viewport/runtime-projection-grid-state.js
    - src/app/runtime/output-receiver/boot-handle-ui.js
    - src/app/runtime/viewport/runtime-projection-profile-persistence.js
  </files>
  <read_first>
    - src/app/runtime/viewport/runtime-projection-grid-state.js (locate _undoStack array push paths — pushUndo function)
    - src/app/runtime/viewport/runtime-projection-profile-persistence.js (locate notifyDirtyChanged + the hardcoded "/api/align-mode-dirty" POST URL — RESEARCH cites line ~598)
    - test/live-e2e/test_phase36_align_handles.py::test_t9_dirty_flag_visible_on_dashboard
    - .planning/phases/phase-36/36-RESEARCH.md §1.5 dirty-endpoint subsection (alignModeDirtyEndpoint pass-through)
    - .planning/phases/phase-36/36-RESEARCH.md §8 T-LB-1 (Q5 1000-entry cap)
  </read_first>
  <behavior>
    - T9 expectation: drag handle on /output/ → 1) server stdout shows `[align-mode-dirty] received dirty=` (W0 wired this log line), 2) dashboard's `#align-mode-dirty-hint.hidden` becomes false within 5 seconds.
    - Path: drag end → handle-drag triggers grid-state.broadcastGridSnapshot AND handle-ui calls profile-persistence.notifyDirtyChanged → notifyDirtyChanged fires a debounced POST to "/api/align-mode-dirty" → server.mjs handler logs (W0) AND broadcasts to dashboard via existing live-sync → dashboard's existing hint listener fires.
    - Q1 LOCKED (W0): use existing /api/align-mode-dirty endpoint. profile-persistence already POSTs there — confirm the URL is hardcoded OR parameterized via init arg.
    - If parameterized: pass `alignModeDirtyEndpoint: "/api/align-mode-dirty"` through bootHandleUi → MAPPING.init dep-bag → profile-persistence init.
    - Q5 LOCKED: cap grid-state's `_undoStack` at 1000 entries with FIFO eviction (shift the oldest when push exceeds 1000).
  </behavior>
  <action>
**Step 1: Apply Q5 LOCK — 1000-entry undo stack cap.**

In `src/app/runtime/viewport/runtime-projection-grid-state.js`, locate `pushUndo` (or the function that pushes to `_undoStack`). Add a cap check BEFORE the push:

```js
const _UNDO_STACK_MAX = 1000;
function pushUndo(desc) {
  // Q5 LOCKED (Phase 36 M5 + RESEARCH §8 T-LB-1) — FIFO cap to prevent
  // unbounded memory growth on long drag sessions. ~21MB worst-case
  // collapses to ~200KB at the cap.
  while (_undoStack.length >= _UNDO_STACK_MAX) {
    _undoStack.shift();  // evict oldest
  }
  _undoStack.push({ desc, snapshot: _captureCurrentSnapshot() });
}
```

(If the existing implementation uses different variable names like `historyStack`, `undoEntries`, etc., adapt — but the LOGIC is: shift while length >= 1000, then push.)

**Step 2: Verify dirty-flag endpoint propagation.**

Read `src/app/runtime/viewport/runtime-projection-profile-persistence.js` around line 598. The POST URL is likely hardcoded:

```js
// CURRENT (likely):
fetch("/api/align-mode-dirty", { method: "POST", body: JSON.stringify({ dirty }) });
```

Phase 36 D-06 + Q1 LOCKED: keep this endpoint. If parameterizable already, no change. If hardcoded:

OPTION A (preferred — minimal change): leave hardcoded. Tests work because the endpoint string matches W0's server.mjs log line.

OPTION B (config-clean): in profile-persistence's init, read `_alignModeDirtyEndpoint` from deps:

```js
let _alignModeDirtyEndpoint = "/api/align-mode-dirty";
function init(deps) {
  if (typeof deps?.alignModeDirtyEndpoint === "string" && deps.alignModeDirtyEndpoint) {
    _alignModeDirtyEndpoint = deps.alignModeDirtyEndpoint;
  }
  // ... rest of init unchanged ...
}
function notifyDirtyChanged(dirty) {
  fetch(_alignModeDirtyEndpoint, { method: "POST", body: JSON.stringify({ dirty }) });
}
```

Choose OPTION A unless tests need a different endpoint (they don't). Document choice in M5 SUMMARY.

**Step 3: Verify bootHandleUi forwards alignModeDirtyEndpoint into MAPPING.init dep-bag.**

In `boot-handle-ui.js` (created in A1), confirm that `mappingDeps.alignModeDirtyEndpoint` is set from the args. From A1 plan Task 2:

```js
const mappingDeps = {
  ...
  alignModeDirtyEndpoint,        // NEW for Phase 36 — profile-persistence reads this if supplied
  ...
};
```

Verify present. If absent: add it.

**Step 4: Run T9.**

```
pytest test/live-e2e/test_phase36_align_handles.py::test_t9_dirty_flag_visible_on_dashboard -v
```

**If T9 FAILS at "server stdout missing align-mode-dirty log":**
- Verify W0 log line is present: `grep -c "\[align-mode-dirty\] received dirty=" server.mjs` returns at least 1.
- Verify the POST is fired by /output/: add a debug log in profile-persistence or check Playwright Network panel.

**If T9 FAILS at "dash.wait_for_function ... hidden=false":**
- Dashboard's hint listener may not be subscribed to the dirty broadcast. Check dashboard's index.html or runtime-orchestration.js for the `#align-mode-dirty-hint` toggle logic.
- Q3 lock verification: dashboard receives align-mode-dirty broadcasts via the existing server → broadcastAlignModeDirtyChange path (server.mjs line ~2120, verified by init context grep).

**Step 5: Run full Phase 36 suite.**

```
pytest test/live-e2e/test_phase36_align_handles.py -v
pytest test/live-e2e/test_phase36_dashboard_parity.py -v
```

Expected: 10 + 6 = 16 tests pass (or 10 + the parametrized variants — counted as 10 functions x parametrize where applicable; pytest reports per-parameter run).

```
node --test test/phase-36-boot-handle-ui-shape.test.mjs
RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs'
```

All green.

**Step 6: Verify D-09 + D-08 gates.**

```
grep -cE "<script[^>]*src=" output.html
RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs' 2>&1 | grep "fail="
```

Expected: at most 8 (D-09); fail=0 (D-08).
  </action>
  <verify>
    <automated>pytest test/live-e2e/test_phase36_align_handles.py::test_t9_dirty_flag_visible_on_dashboard -v 2>&1 | tail -5</automated>
    Expected: `1 passed`
  </verify>
  <acceptance_criteria>
    - T9 GREEN: `pytest test/live-e2e/test_phase36_align_handles.py::test_t9_dirty_flag_visible_on_dashboard -v 2>&1 | grep -cE "1 passed"` returns 1
    - All 10 T1-T10 GREEN: `pytest test/live-e2e/test_phase36_align_handles.py -v 2>&1 | grep -cE "10 passed"` returns 1
    - Q5 LOCK applied: `grep -c "_UNDO_STACK_MAX\|1000" src/app/runtime/viewport/runtime-projection-grid-state.js` returns at least 2 (constant declaration + while loop using it OR comparison)
    - `grep -c "shift\b" src/app/runtime/viewport/runtime-projection-grid-state.js` returns at least 1 (FIFO eviction)
    - Q3 LOCK applied (from Task 2): `grep -c "force.*true" src/app/runtime/viewport/runtime-projection-handle-ui.js` returns at least 4
    - Connection-stability fail=0: `RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs' 2>&1 | grep -E "fail=0"` matches at least once
    - D-09 budget: `grep -cE "<script[^>]*src=" output.html` returns a value at most 8
  </acceptance_criteria>
  <done>
    T9 dirty-flag works end-to-end on dashboard. Q5 LOCK applied. All 10 RED tests now GREEN.
  </done>
</task>

</tasks>

<threat_model>
## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-LB-1 | DoS | Undo stack memory growth | mitigate | Q5 LOCK — 1000-entry FIFO cap landed in Task 4 |
| T-XSS-1 | Tampering | Context menu room name | accept | textContent verified by grep in Task 2 |
| T-DOS-1 | DoS | broadcastGridSnapshot drag flood | accept | 30Hz throttle preserved; force:true used only for line add/remove (operator-paced) |
</threat_model>

<verification>
M5 wave closure gates:
- T6, T7, T8, T9 RED→GREEN
- T1-T5 + T10 stay GREEN
- Q3 LOCK applied (immediate broadcast on add/remove line)
- Q5 LOCK applied (1000-entry undo cap)
- Connection-stability fail=0
- D-09 ≤8 src-based scripts
- All 10 Phase 36 RED tests GREEN
</verification>

<success_criteria>
- All 10 of 10 RED tests GREEN
- Q3 + Q5 reconciliations landed and traceable in source
- D-08 + D-09 preserved
</success_criteria>

<output>
After completion, create `.planning/phases/phase-36/36-M5-SUMMARY.md` documenting:
- T6, T7, T8, T9 pass evidence (pytest output)
- Q3 LOCK source-evidence (grep output showing force:true in 4 places)
- Q5 LOCK source-evidence (grep output showing _UNDO_STACK_MAX + shift)
- Final 10/10 GREEN evidence
- D-08 + D-09 evidence
- Whether any innerHTML→textContent fix was needed for T-XSS-1
</output>
