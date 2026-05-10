---
phase: 36
slug: comprehensive-alignmode-thin-output
status: PASS-AUTOMATED-PENDING-PI-HARDWARE-UAT
verified: 2026-05-10
---

# Phase 36 — Verification

## TL;DR

All 10 Phase 36 RED rails (T1-T10) are GREEN on `/output/` (`pytest test/live-e2e/test_phase36_align_handles.py -v` → 10 passed in 63.88s). The dashboard parity rail's 3 `/output/` variants are GREEN; the 3 `/` (dashboard) variants are RED — consistent with M3's documented path-(b) deferral (M3-LATE migration of `runtime-orchestration.js` to `bootHandleUi` is recorded in `.planning/phases/phase-36/deferred-items.md` and is captured as the new Phase 36.1 ROADMAP follow-up by this V wave). The bootHandleUi shape contract (node --test test/phase-36-boot-handle-ui-shape.test.mjs) passes 3/3 fail=0. Connection-stability hard gate (D-08) passes 84/84 fail=0 with `RUN_LIVE_TESTS=1`. D-09 grep budget: 1 ≤ 8 src-based scripts in `output.html`. Phase 35-A `pointer-events:none !important` CSS workaround is verifiably ABSENT (D-02 confirms removal). Full JS unit suite: 396 tests, 379 pass, 0 fail, 17 skipped. All Q1-Q5 planner reconciliations landed and source-traceable. Phase 36 ready for operator Pi-hardware UAT (deferred per D-10 carry-forward).

## Decision Coverage (D-01..D-10)

| Decision | Description | Verification | Status |
|----------|-------------|--------------|--------|
| D-01 | Option H first-class thin-export pattern via `bootHandleUi` | `grep -c "export function bootHandleUi" src/app/runtime/output-receiver/boot-handle-ui.js` → 1; unit pass=3 fail=0 (A1) | PASS |
| D-02 | Overlay `pointer-events:none` on /output/ when align-mode active; Phase 35-A `!important` rule REMOVED | `grep -nE 'pointer-events:\s*none\s*!important' src/styles.css \| grep -E 'projection-corner-handle\|projection-grid-handle\|projection-grid-line-canvas'` returns 0 lines (verbatim "ABSENT"); receiver-bootstrap.js sets `overlayEl.style.pointerEvents="none"` permanently (A2) | PASS |
| D-03 | RED-test form: Pure Live-E2E via Playwright + system Chrome | `pytest test/live-e2e/test_phase36_align_handles.py -v` → 10/10 passed | PASS |
| D-04 | Client-local undo on /output/ | T8 GREEN; `_UNDO_STACK_MAX=1000` FIFO eviction in grid-state.js (Q5 LOCK, M5) | PASS |
| D-05 | Right-click context menu fully rendered in /output/ DOM | T7 GREEN; menu DOM appears at click coords (M5) | PASS |
| D-06 | Dirty-flag local + broadcast via existing endpoint | T9 GREEN; `[align-mode-dirty] received dirty=` stdout marker fires; dashboard hint flips visible (W0+M5; Q1 LOCK reconciliation) | PASS |
| D-07 | runtime-trace + AST union ctx-inventur methodology | `grep -c "_ctxTraceEnabled\|ctx-trace=1" src/app/runtime/runtime-orchestration.js` → 7; harness exists; operator UAT optional | PASS (harness exists; operator UAT optional) |
| D-08 | Connection-stability hard gate `fail=0` | `RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs'` → tests=85 pass=84 fail=0 skipped=1 | PASS |
| D-09 | ≤8 src-based scripts in `output.html` (BLOCKING grep) | `grep -cE '<script[^>]*src=' output.html` → 1 | PASS |
| D-10 | Pi-hardware UAT deferred until hardware accessible | `.planning/phases/phase-36/36-HUMAN-UAT.md` exists with `status: deferred` (created by V wave Task 2) | PASS (deferred carry-forward) |

## RED Test Status (T1..T10)

| Test | Description | Wave Closed | Status |
|------|-------------|-------------|--------|
| T1 | Sizing — handle frame visually aligned with `video.ssr-video` bbox (±4px) | M3 | GREEN |
| T2 | 4 corner pulls each emit `[align-grid-snapshot]` server-recv | M3 | GREEN |
| T3 | Vertex drag shifts targeted point (>0.2 normalized) without disturbing anchors | M4 | GREEN |
| T4 | Midpoint drag (`.projection-grid-handle` squish bar) emits grid mutation | M4 | GREEN |
| T5 | Rotation handle (`[data-handle-role="rotate"]`) 30° arc emits grid mutation | M4 | GREEN |
| T6 | Free-area image-pan emits grid mutation | M3 (bonus carry) | GREEN |
| T7 | Right-click `.board-context-menu` with ≥2 items; "Add line through this point" triggers broadcast/dirty | M5 (Q3 LOCK + menu-callback) | GREEN |
| T8 | CTRL+Z undo reverts last 50px corner-handle drag (within 3px) | M3 (bonus carry) | GREEN |
| T9 | /output/ gesture → dashboard `#align-mode-dirty-hint.hidden === false` + server stdout `[align-mode-dirty] received dirty=` | M5 (gesture-driven dirty + test fix) | GREEN |
| T10 | Single corner drag = exactly 1 `[align-grid-snapshot]`, 0 `[align-drag] phase=start`, 0 `[input-forwarder] phase=start` | M3 (drag-end-only on /output/) | GREEN |

10 of 10 GREEN.

## Q1-Q5 Planner Reconciliations (locked)

| Q | Description | Lock Value | Source / Evidence |
|---|-------------|------------|-------------------|
| Q1 | Dirty-flag broadcast: existing endpoint vs piggyback | EXISTING `POST /api/align-mode-dirty` endpoint (D-06 literal revised; same observable outcome, lower diff/risk) | W0 plan, A2 loader `alignModeDirtyEndpoint: "/api/align-mode-dirty"`, server.mjs:4140 `[align-mode-dirty] received dirty=` (grep count 2) |
| Q2 | Dashboard regression test rewrite | KEEP `test_phase35_dashboard_alignmode.py` unchanged + ADD `test_phase36_dashboard_parity.py` with parametrized `[/, /output/]` variants | W0 plan, both files in `test/live-e2e/` — Phase 35 dashboard test untouched per `git status` |
| Q3 | Right-click line add: immediate broadcast | `addHorizontalLine/addVerticalLine/removeHorizontalLine/removeVerticalLine` call `broadcastGridSnapshot({force:true})` immediately; menu-callback fallback for no-op adds (intersection/line hit branches) | M5, `runtime-projection-handle-ui.js` — 4 function-level + 2 menu-callback Q3 broadcasts |
| Q4 | handle-ui internal modularization | NO split (deferred — preserves diff bound; revisit in future cleanup phase) | RESEARCH §6, CONTEXT.md Deferred Ideas |
| Q5 | Undo stack memory cap | `_UNDO_STACK_MAX = 1000` with `while (length >= 1000) shift()` FIFO eviction (T-LB-1 mitigation) | M5, `runtime-projection-grid-state.js` lines 202-241 |

## Carry-Forward Locks (UNCHANGED, verified preserved)

- VAAPI default-disabled (Phase 33 commit `3cd6748`) — UNCHANGED
- Phase 34 hotfix h2 (`hasVaapiEnabled`-gated GL flags) — UNCHANGED
- Phase 35-iter2 h3 banding fix (Bayer dither + drawImage clip) — UNCHANGED
- Phase 35-iter2 h1 lazy-load infrastructure pattern — preserved as Phase 36 starting point (output-align-mode-loader.js extended additively in A2)
- Phase 35-iter2 h2 polygon-data wiring (real `runtimeBoards`-backed `buildBoardAccess`) — preserved verbatim
- Phase 35-B `output-live-sync.js` thin subscription (proven, extended additively with `emitLiveMutation` in A1)
- Connection-stability hard gate (D-08, equivalent to Phase 35 D-06 numbering) — `RUN_LIVE_TESTS=1` 84/84 pass fail=0

## Test Run Evidence

### pytest test/live-e2e/test_phase36_align_handles.py -v

```
============================= test session starts ==============================
platform linux -- Python 3.14.3, pytest-9.0.3, pluggy-1.6.0
collected 10 items

test/live-e2e/test_phase36_align_handles.py::test_t1_handle_frame_matches_stream_content PASSED [ 10%]
test/live-e2e/test_phase36_align_handles.py::test_t2_corner_pulls_emit_align_grid_snapshot PASSED [ 20%]
test/live-e2e/test_phase36_align_handles.py::test_t3_vertex_drag_modifies_correct_vertex PASSED [ 30%]
test/live-e2e/test_phase36_align_handles.py::test_t4_midpoint_drag_emits_squish PASSED [ 40%]
test/live-e2e/test_phase36_align_handles.py::test_t5_rotation_handle_emits_mutation PASSED [ 50%]
test/live-e2e/test_phase36_align_handles.py::test_t6_image_pan_emits_mutation PASSED [ 60%]
test/live-e2e/test_phase36_align_handles.py::test_t7_right_click_context_menu PASSED [ 70%]
test/live-e2e/test_phase36_align_handles.py::test_t8_ctrl_z_undoes_last_gesture PASSED [ 80%]
test/live-e2e/test_phase36_align_handles.py::test_t9_dirty_flag_visible_on_dashboard PASSED [ 90%]
test/live-e2e/test_phase36_align_handles.py::test_t10_no_duplicate_mutations PASSED [100%]

======================== 10 passed in 63.88s (0:01:03) =========================
```

### pytest test/live-e2e/test_phase36_dashboard_parity.py -v

```
test/live-e2e/test_phase36_dashboard_parity.py::test_t2_corner_pull_parity[/] FAILED [ 16%]
test/live-e2e/test_phase36_dashboard_parity.py::test_t2_corner_pull_parity[/output/] PASSED [ 33%]
test/live-e2e/test_phase36_dashboard_parity.py::test_t7_right_click_menu_parity[/] FAILED [ 50%]
test/live-e2e/test_phase36_dashboard_parity.py::test_t7_right_click_menu_parity[/output/] PASSED [ 66%]
test/live-e2e/test_phase36_dashboard_parity.py::test_t8_ctrl_z_undo_parity[/] FAILED [ 83%]
test/live-e2e/test_phase36_dashboard_parity.py::test_t8_ctrl_z_undo_parity[/output/] PASSED [100%]

=================== 3 failed, 3 passed in 123.42s (0:02:03) ====================
```

**Interpretation:** All three `/output/` variants pass. All three `/` (dashboard) variants fail consistently with M3's documented path-(b) deferral. Dashboard parity RED is expected and NOT a Phase 36 regression — it represents the M3-LATE deferred work (dashboard `runtime-orchestration.js` migration to `bootHandleUi`), captured in `.planning/phases/phase-36/deferred-items.md` and (by this V wave) added to ROADMAP.md as Phase 36.1 follow-up.

### pytest test/live-e2e/test_phase35_dashboard_alignmode.py -v

```
test/live-e2e/test_phase35_dashboard_alignmode.py::test_dashboard_alignmode_handles FAILED
============================== 1 failed in 20.65s ==============================
```

**Interpretation:** Phase 35 W0 dashboard regression test remains RED. This was the M3 path-(b) deferral (the test was authored as a forward-looking guard that depends on dashboard migration to `bootHandleUi`). Status formally documented as deferred — flips GREEN once Phase 36.1 (dashboard migration) closes. Not a Phase 36 regression.

### node --test test/phase-36-boot-handle-ui-shape.test.mjs

```
[boot-handle-ui] required arg "state" is undefined
✔ Phase 36: bootHandleUi is exported as a function (1.142239ms)
✔ Phase 36: bootHandleUi returns object with stop() and hitTestVertex() (0.670502ms)
✔ Phase 36: bootHandleUi throws on missing required args (1.397978ms)
ℹ tests 3
ℹ pass 3
ℹ fail 0
```

bootHandleUi contract pass=3 fail=0.

### Connection-stability gate (D-08, RUN_LIVE_TESTS=1)

```
ℹ tests 85
ℹ pass 84
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 92176.13865
```

D-08 hard gate preserved — fail=0 confirmed with live-server real-server-boot tests enabled. The single skipped test is the 1-hour steady-state test gated by `RUN_LONG_TESTS=1` (deliberately not run in V wave).

### Phase 35 unit tests (regression check)

```
$ node --test test/phase-35-*.test.mjs
✔ D-03-C1: getDitheredSolidColorImageData is exported
✔ D-03-C1: returns ImageData of requested size
✔ D-03-C1: dither produces non-uniform pixel values (proof of dither)
✔ D-03-C1: BAYER_4X4 matrix shape
✔ D-01-A1: bootAlignMode is exported from output-align-mode.js
✔ D-01-A1: bootAlignMode export shape — function callable, returns { stop }
✔ D-02-B1: bootOutputLiveSync is exported from output-live-sync.js
✔ D-02-B1: bootOutputLiveSync subscription has 7 callback registrars + 3 getters + stop
✔ D-02-B2: output-audio-binder.js imports + uses bootOutputLiveSync
ℹ tests 9
ℹ pass 9
ℹ fail 0
```

No Phase 35 regression. All carry-forward modules (Bayer dither, bootAlignMode, bootOutputLiveSync, output-audio-binder) still GREEN.

### Full JS unit suite

```
$ node --test 'test/**/*.test.mjs'
ℹ tests 396
ℹ pass 379
ℹ fail 0
ℹ cancelled 0
ℹ skipped 17
ℹ todo 0
ℹ duration_ms 5218.690758
```

396 tests collected, 379 pass, 0 fail, 17 skipped (all env-gated live tests). No unrelated regressions surfaced. fail=0 holds.

### D-09 grep — output.html src-based script-tag budget

```
$ grep -cE '<script[^>]*src=' output.html
1
```

1 ≤ 8. D-09 budget preserved. The Phase 36 align-mode bundle continues to lazy-load via the Phase 35-iter2 h1 pattern; the loader was wired into `output.html` in M3 via an inline `<script type="module">` (no `src=` attribute, so it does not count against the budget).

### D-02 — Phase 35-A CSS rule absence

```
$ grep -nE 'pointer-events:\s*none\s*!important' src/styles.css | \
    grep -E 'projection-corner-handle|projection-grid-handle|projection-grid-line-canvas'
(no output)
$ echo "ABSENT (correct — Phase 36 D-02 removed)"
ABSENT (correct — Phase 36 D-02 removed)
```

The Phase 35-A `pointer-events:none !important` rule on `.projection-corner-handle / .projection-grid-handle / #projection-grid-line-canvas` is verifiably ABSENT in `src/styles.css`. Replaced by Phase 36 D-02 audit-trace comment + JS-toggled `overlayEl.style.pointerEvents = "none"` in `receiver-bootstrap.js`.

### Source-artifact existence grep (A1/W0 contract markers)

```
$ grep -c "export function bootHandleUi" src/app/runtime/output-receiver/boot-handle-ui.js
1
$ grep -c "emitLiveMutation" src/app/runtime/output-receiver/output-live-sync.js
6
$ grep -c "_ctxTraceEnabled\|ctx-trace=1" src/app/runtime/runtime-orchestration.js
7
$ grep -c '\[align-mode-dirty\] received dirty=' server.mjs
2
```

All A1/W0 artifacts present in source.

## Threat Mitigation Audit

| Threat | STRIDE | Disposition | Verification |
|--------|--------|-------------|--------------|
| T-DOS-1 | Denial of Service via gesture-driven broadcast flooding | `accept` (existing 30Hz `_BROADCAST_MIN_INTERVAL_MS=33` throttle in `grid-state.broadcastGridSnapshot` + 100ms server-side rate-limit on `/api/align-mode-dirty` per T-27-03) | Preserved unchanged in source (M5 added gesture-driven dirty POST, server still rate-limits) |
| T-XSS-1 | Cross-site scripting via right-click menu DOM rendering | `accept` with documented call-site trust requirement | `grep -nE 'innerHTML\s*=' src/app/runtime/viewport/runtime-projection-handle-ui.js \| grep -iE "menu\|item\|name"` → 0 matches; `showContextMenu` uses `.textContent` exclusively (M5 verified at line 1450) |
| T-LB-1 | Long-running session memory growth via unbounded undo stack | `mitigate` via Q5 LOCK (1000-entry FIFO cap) | `_UNDO_STACK_MAX=1000` + `while (length >= 1000) shift()` in `runtime-projection-grid-state.js` (M5 lines 202-241) |
| T-DASH-1 | Dashboard regression from M3-LATE migration | `mitigate` via path-(b) deferral | Dashboard MAPPING.init + POLYGON_EDITOR.init two-call structure preserved unchanged; dashboard E2E parity rail RED as expected (deferred to Phase 36.1) |

All threats either mitigated or accepted with documented rationale + source-traceable evidence.

## Deferred Items

See `.planning/phases/phase-36/36-HUMAN-UAT.md` and `.planning/phases/phase-36/deferred-items.md`:

1. **Pi-hardware UAT (D-10 carry-forward):** Operator runs all T1-T10 visually + functionally on Pi 4 hardware when accessible. Status: `deferred` (same carry-forward pattern as Phase 33/34/35).

2. **M3-LATE dashboard migration (path-(b) per plan-checker round-1 warning #2):** Dashboard's `runtime-orchestration.js` MAPPING.init (line 472) + POLYGON_EDITOR.init (line ~1953) two-call structure NOT migrated to single `bootHandleUi(...)` call. Architectural complexity (~1500 LOC of state setup between the two init points) makes the refactor high-risk; deferred to Phase 36.1 follow-up. Documented in `.planning/phases/phase-36/deferred-items.md` D1+D2; recorded in ROADMAP.md by this V wave as Phase 36.1 PLANNING entry.

3. **Phase 35 W0 dashboard regression test (`test_phase35_dashboard_alignmode.py`):** Currently RED — flips GREEN once D2 (dashboard migration) closes. Tracked as Phase 36.1 acceptance criterion in ROADMAP.

4. **Phase 36 dashboard parity rail (`test_phase36_dashboard_parity.py` `/` variants):** Same root cause as #3 — flips GREEN with D2.

## Closure Verdict

**Status:** PASS-AUTOMATED-PENDING-PI-HARDWARE-UAT

Phase 36 closes pending operator Pi-hardware UAT (D-10 carry-forward pattern, same as Phase 33/34/35). Automated acceptance criteria all PASS:
- All 10 T1-T10 RED rails GREEN
- D-08 connection-stability fail=0 with live-server tests enabled
- D-09 script-tag budget ≤8 (currently 1)
- Phase 35-A CSS workaround removed (D-02 verified)
- All Q1-Q5 reconciliations source-traceable
- All carry-forward locks (VAAPI, Phase 34 h2, Phase 35-iter2 h1/h2/h3, Phase 35-B) preserved
- Threat register fully mitigated/accepted

Operator visual/functional verification on Pi 4 hardware required before tagging `phase-36-end` (canonical Phase 33/34/35 pattern).

## Tag Recommendation

`phase-36-end-pending-pi-uat` until operator confirms Pi-hardware UAT (`36-HUMAN-UAT.md` items 1-12 OK). Then retag `phase-36-end` and start Phase 36.1 (dashboard `bootHandleUi` migration follow-up) when scheduled.
