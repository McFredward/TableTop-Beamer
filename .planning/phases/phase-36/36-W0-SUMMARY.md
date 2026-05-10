---
phase: 36
plan: W0
subsystem: align-mode-thin-output
tags: [red-rails, live-e2e, dashboard-parity, boot-handle-ui-contract, dirty-flag]
status: completed
completed: 2026-05-10
duration_minutes: 6
dependency_graph:
  requires:
    - "Phase 35 W0 fixtures (live_server, chrome_browser, page, @flaky_3x)"
    - "scripts/with_server.py — already in tree"
    - "Server-side log strings already in server.mjs at lines 1202, 1240"
  provides:
    - "T1-T10 RED rail (test/live-e2e/test_phase36_align_handles.py)"
    - "Dashboard parity rail (test/live-e2e/test_phase36_dashboard_parity.py)"
    - "bootHandleUi export contract RED unit (test/phase-36-boot-handle-ui-shape.test.mjs)"
    - "Stdout marker `[align-mode-dirty] received dirty=` in /api/align-mode-dirty handler"
  affects:
    - "Every Phase 36 implementation wave (A1, A2, M3, M4, M5) MUST flip a subset of T1-T10 from RED to GREEN; final closure requires all GREEN."
tech_stack:
  added: []
  patterns:
    - "Lazy-loaded module RED unit via dynamic file:// URL import (ERR_MODULE_NOT_FOUND is the correct RED state)"
    - "Server stdout log capture via `live_server['stdout_path']` for grep-asserted live-E2E mutations"
    - "Parametrized parity tests via `@pytest.mark.parametrize('path', ['/', '/output/'])`"
key_files:
  created:
    - "test/live-e2e/test_phase36_align_handles.py"
    - "test/live-e2e/test_phase36_dashboard_parity.py"
    - "test/phase-36-boot-handle-ui-shape.test.mjs"
  modified:
    - "server.mjs (one additive console.log line inside existing /api/align-mode-dirty POST handler)"
decisions:
  - "Q1 LOCKED: Dirty-flag uses existing POST /api/align-mode-dirty endpoint (NOT piggyback on align-grid-snapshot). CONTEXT.md D-06 literal text revised — same observable outcome, lower diff/risk."
  - "Q2 LOCKED: Keep test_phase35_dashboard_alignmode.py unchanged AND add test_phase36_dashboard_parity.py with parametrized [/, /output/] T2/T7/T8 variants."
  - "Q3 LOCKED: Right-click add/remove line will trigger immediate broadcastGridSnapshot({force:true}) (deferred to Wave M5 task — not W0 scope)."
  - "Q4 LOCKED: handle-ui internal modularization NOT done in Phase 36 (deferred per RESEARCH §6 + CONTEXT.md deferred ideas)."
  - "Q5 LOCKED: Undo stack capped at 1000 entries with FIFO eviction (deferred to Wave M5 task — not W0 scope)."
metrics:
  tasks_completed: 3
  tests_collected_t1_t10: 10
  tests_collected_parity: 6
  unit_red_exit_code: 1
  script_tag_budget: 1
  red_invariant_holds: true
---

# Phase 36 Plan W0: Comprehensive Align-Mode-on-Thin-/output/ — RED-rails wave Summary

**One-liner:** Established 16 RED test rails (10 live-E2E + 6 dashboard parity) plus a 3-test bootHandleUi shape contract — all failing for the right reasons today (no Phase 36 production code exists yet) — plus a single-line stdout marker in server.mjs `/api/align-mode-dirty` that T9 grep-asserts; this wave is BLOCKING and must precede every implementation wave A1/A2/M3/M4/M5.

## Objective recap

W0 codifies every observable handle-ui behavior on `/output/` as a Playwright live-E2E test BEFORE any implementation work begins, plus a dashboard-parity rail forcing every implementation wave to keep dashboard regression GREEN, plus a node-test contract for the new `bootHandleUi(...)` API. Phase 35-A's regret was a missing pre-implementation rail; W0 closes that gap.

## Tasks executed

### Task 1 — T1-T10 Live-E2E rail
**Commit:** `fd0078e` `test(36-W0): add T1-T10 RED rail for /output/ align-mode handle-ui`

Created `test/live-e2e/test_phase36_align_handles.py` (234 lines, 10 tests):
- T1: Sizing — handle frame bbox aligns with `video.ssr-video` bbox within 4px on each edge.
- T2: 4 corner pulls each produce `[align-grid-snapshot] server-recv` server log line (≥4 total).
- T3: Vertex `[data-row="0"][data-col="1"]` drag shifts the right point in `/api/live/snapshot.runtime.lastAlignGridSnapshot.points` (>0.2 normalized x-shift vs col=0).
- T4: Squish-bar (`.projection-grid-handle`) drag emits grid mutation.
- T5: Rotation handle (`.projection-rotation-handle, [data-handle-role="rotate"]`) 30° arc emits grid mutation.
- T6: Free-area image-pan emits grid mutation.
- T7: Right-click `.board-context-menu` appears with ≥2 items; clicking "Add line through this point" produces dirty-flag OR grid-snapshot in server log.
- T8: CTRL+Z undoes last 50px corner-handle drag (within 3px of initial position).
- T9: Drag on `/output/` causes dashboard `#align-mode-dirty-hint.hidden===false` AND server stdout shows `[align-mode-dirty] received dirty=`.
- T10: Single corner drag produces exactly 1 `[align-grid-snapshot] server-recv`, 0 `[align-drag] received phase=start`, 0 `[input-forwarder] sent phase=start` console messages (forwarder dormant during align-mode).

All 10 wrapped with `@flaky_3x` per Phase 35 W0 retry pattern. All reuse `live_server`, `chrome_browser`, `page` fixtures unchanged.

**Acceptance evidence:**
- `pytest test/live-e2e/test_phase36_align_handles.py --collect-only -q | grep -c "::test_t"` → **10** ✓
- `python3 -c "import ast; ast.parse(open(...).read())"` exits 0 ✓
- `grep -c "@flaky_3x"` → **10** ✓

### Task 2 — Dashboard parity rail
**Commit:** `a6e2529` `test(36-W0): add dashboard parity rail (T2/T7/T8 parametrized across / and /output/)`

Created `test/live-e2e/test_phase36_dashboard_parity.py` (88 lines, 3 functions × 2 paths = 6 collectible tests):
- `test_t2_corner_pull_parity[/]` and `[/output/]` — corner drag produces grid mutation in server log on both paths.
- `test_t7_right_click_menu_parity[/]` and `[/output/]` — right-click yields ≥2 menu items on both paths.
- `test_t8_ctrl_z_undo_parity[/]` and `[/output/]` — drag + CTRL+Z returns handle within 3px on both paths.

Q2 reconciliation locked: Phase 35 dashboard test (`test_phase35_dashboard_alignmode.py`) is **untouched** — `git status` confirms.

**Acceptance evidence:**
- `pytest test/live-e2e/test_phase36_dashboard_parity.py --collect-only -q | grep -c "::test_t"` → **6** ✓
- 3 `@pytest.mark.parametrize("path", ["/", "/output/"])` decorators present ✓
- 3 `@flaky_3x` decorators present ✓

### Task 3 — bootHandleUi shape RED unit + server.mjs dirty-flag log line
**Commit:** `3a0c99a` `test(36-W0): add bootHandleUi shape RED unit + server.mjs dirty-flag stdout marker`

#### Sub-task 3a: `test/phase-36-boot-handle-ui-shape.test.mjs` (52 lines, 3 tests)
- "Phase 36: bootHandleUi is exported as a function" — RED via ERR_MODULE_NOT_FOUND
- "Phase 36: bootHandleUi returns object with stop() and hitTestVertex()" — RED via ERR_MODULE_NOT_FOUND
- "Phase 36: bootHandleUi throws on missing required args" — RED via ERR_MODULE_NOT_FOUND

Imports `../src/app/runtime/output-receiver/boot-handle-ui.js` via `new URL(MODULE_PATH, import.meta.url).href`. The module deliberately does NOT exist yet — Wave A1 will create it, flipping all 3 to GREEN.

#### Sub-task 3b: `server.mjs` additive log line (1 line of code + 3 lines of comment, 4 net additions)
At line 4140 (inside existing `/api/align-mode-dirty` POST handler block — the handler spans lines 4120-4149), after `dirty` is assigned and before `_setAlignModeDirty()` is called:
```js
console.log(`[align-mode-dirty] received dirty=${Boolean(dirty)} from=http-post`);
```
The `from=http-post` literal is a constant (the handler is HTTP-only — no `role`/`clientId` in scope; this matches the plan's "if neither exists, log `from=server`" instruction with `http-post` as the equivalent). T9 anchors only on the `[align-mode-dirty] received dirty=` prefix substring, not the `from=` field.

**Acceptance evidence:**
- `node --test test/phase-36-boot-handle-ui-shape.test.mjs` → exit=**1** (RED) ✓
- `grep -c "[align-mode-dirty] received dirty=" server.mjs` → **2** (1 comment, 1 actual log call) ✓
- `node --check server.mjs` exits 0 (no syntax errors) ✓
- Original POST handler still present at line 4120 ✓
- Log line is INSIDE the handler block (verified via Read of server.mjs:4118-4150) ✓

## Q1-Q5 reconciliations locked into the plan (verbatim)

- **Q1:** Dirty-flag uses existing `POST /api/align-mode-dirty` endpoint (NOT piggyback on `align-grid-snapshot`). RESEARCH §1.3 / §5 / Open Q1 — lower risk, matches current implementation. CONTEXT.md D-06 literal text "broadcast piggybacks on align-grid-snapshot" is interpreted as "the dirty-broadcast is local + observable on dashboard via existing live-sync mechanism" — same goal, different mechanism.
- **Q2:** Keep `test_phase35_dashboard_alignmode.py` unchanged AND add `test_phase36_dashboard_parity.py` with parametrized variants per RESEARCH §5.
- **Q3:** Right-click "add line" / "remove line" SHALL trigger an immediate `broadcastGridSnapshot({force:true})` (locked in Wave M5 task).
- **Q4:** handle-ui internal modularization NOT done in Phase 36 (deferred per RESEARCH §6 + CONTEXT.md deferred ideas).
- **Q5:** Undo stack capped at 1000 entries with FIFO eviction (locked in Wave M5 task).

## Closure gates (verification)

| Gate | Expected | Observed | Status |
|------|----------|----------|--------|
| T1-T10 collect-only count | 10 | 10 | ✓ |
| Dashboard parity collect-only count | 6 | 6 | ✓ |
| bootHandleUi node --test exit | non-zero (RED) | 1 | ✓ |
| `[align-mode-dirty] received dirty=` in server.mjs | ≥1 | 2 | ✓ |
| D-09 script-tag budget on output.html | ≤8 | 1 | ✓ |
| D-08 connection-stability regression risk | nil (additive log only) | confirmed | ✓ |
| `node --check server.mjs` | exit 0 | exit 0 | ✓ |
| Phase 35 dashboard test unchanged | yes | yes (`git status` clean for that file) | ✓ |
| ast.parse on both .py files | exit 0 | exit 0 (both) | ✓ |

**RED-rail invariant confirmed:** All 10+6 live-E2E tests will FAIL today because `bootHandleUi` does not exist and `/output/` does not yet render `.projection-corner-handle` elements. Tests are not collected-but-stuck; they fail on the deepest right reason (`page.wait_for_function` timeout on the handle selector) — not on syntax, missing imports, or fixture errors. Subsequent waves (A1-M5) flip them GREEN one cluster at a time.

## Deviations from Plan

None — plan executed exactly as written. The single planner-discretionary decision was the `from=http-post` constant in the new server.mjs log line (no `role`/`clientId` in HTTP handler scope); this matches the plan's documented fallback "if neither exists, log `from=server` instead. The exact `from=` field value is NOT asserted by tests — only the prefix `[align-mode-dirty] received dirty=` matters."

## Authentication gates

None encountered.

## Known Stubs

None. This wave creates RED tests + one log line — no UI/data wiring stubs. All Phase 36 production code (boot-handle-ui.js, etc.) is intentionally absent and tracked as RED rails until later waves ship implementations.

## Threat Flags

None. The single server.mjs change is one additive `console.log` inside an already-rate-limited (T-27-03), already-validated (T-27-02), already-CSRF-bounded handler — no new HTTP route, no new auth path, no new file/schema access. The threat register dispositions in the plan (`T-DOS-1` accept, `T-XSS-1` accept, `T-LB-1` mitigate-in-M5) are unchanged.

## Self-Check: PASSED

Files verified to exist:
- `/home/claw/tt-beamer/test/live-e2e/test_phase36_align_handles.py` — FOUND
- `/home/claw/tt-beamer/test/live-e2e/test_phase36_dashboard_parity.py` — FOUND
- `/home/claw/tt-beamer/test/phase-36-boot-handle-ui-shape.test.mjs` — FOUND
- `/home/claw/tt-beamer/server.mjs` — modified (line 4140 contains the new log call)

Commits verified to exist on master:
- `fd0078e` test(36-W0): add T1-T10 RED rail for /output/ align-mode handle-ui — FOUND
- `a6e2529` test(36-W0): add dashboard parity rail (T2/T7/T8 parametrized across / and /output/) — FOUND
- `3a0c99a` test(36-W0): add bootHandleUi shape RED unit + server.mjs dirty-flag stdout marker — FOUND

All closure gates pass. Phase 36 implementation waves (A1, A2, M3, M4, M5) are unblocked.
