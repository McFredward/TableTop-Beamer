---
phase: 36
slug: comprehensive-alignmode-thin-output
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-10
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `36-RESEARCH.md` §7 Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x + Playwright sync 1.x (Python) + node --test (JS) |
| **Config file** | `pytest.ini` + `test/live-e2e/conftest.py` |
| **Quick run command** | `pytest test/live-e2e/test_phase36_align_handles.py::test_t1_handle_frame_matches_stream_content -v` |
| **Full suite command** | `pytest test/live-e2e/ -v` |
| **Connection-stability command** | `RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs'` |
| **Estimated runtime** | ~3 minutes (pytest live-e2e) + ~2 minutes (connection-stability) |

---

## Sampling Rate

- **After every task commit:** Run quick command for the relevant T<n> + the dashboard-parametrized variants of that interaction.
- **After every plan wave:** Run `pytest test/live-e2e/ -v` AND `RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs'`.
- **Before `/gsd-verify-work`:** Full suite green + connection-stability `fail=0` + grep-assertion `[ "$(grep -cE '<script[^>]*src=' output.html)" -le 8 ]`.
- **Max feedback latency:** ~10 seconds per quick test (Playwright spawn + browser launch dominates); ~3 minutes for full suite.
- **Smallest signal frequency to detect:** 30Hz throttle inside `broadcastGridSnapshot`. Test sleeps ≥500ms after gestures (well over 16ms Nyquist window for 30Hz). Adequate.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Decision | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|----------|------------|-----------------|-----------|-------------------|-------------|--------|
| 36-W0-01 | W0 | 0 | D-03 | — | T1-T10 RED tests exist | live-e2e | `pytest test/live-e2e/test_phase36_align_handles.py -v --collect-only` | ❌ W0 | ⬜ pending |
| 36-W0-02 | W0 | 0 | D-03 | — | Dashboard parity tests exist | live-e2e | `pytest test/live-e2e/test_phase36_dashboard_parity.py -v --collect-only` | ❌ W0 | ⬜ pending |
| 36-W0-03 | W0 | 0 | D-08 | — | Connection-stability fail=0 baseline | node | `RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs'` | ✅ | ⬜ pending |
| 36-A1-01 | A1 | 1 | D-01 | — | bootHandleUi exports correct shape | unit | `node --test test/phase-36-boot-handle-ui-shape.test.mjs` | ❌ W0 | ⬜ pending |
| 36-A1-02 | A1 | 1 | D-01, D-07 | T-DOS-1 | runtime-trace harness produces ctx inventory | manual | (operator drives dashboard with `?ctx-trace=1`) | ❌ W0 | ⬜ pending |
| 36-A2-01 | A2 | 2 | D-01, D-09 | — | Loader integrates bootHandleUi without bundle bloat | live-e2e | `pytest test/live-e2e/test_phase36_align_handles.py::test_t10_no_dual_path_conflict -v` | ❌ W0 | ⬜ pending |
| 36-A3-01 | A3 | 2 | D-09 | — | output.html stays ≤8 src-based scripts | grep | `[ "$(grep -cE '<script[^>]*src=' output.html)" -le 8 ]` | ✅ | ⬜ pending |
| 36-A4-01 | A4 | 2 | D-02 | — | Phase 35-A pointer-events:none rule removed | grep | `! grep -nE '"final-output".*\.projection-corner-handle' src/styles.css` | ✅ | ⬜ pending |
| 36-M3-01 | M3 | 3 | T1 | — | Handle frame visually matches stream content | live-e2e | `pytest test/live-e2e/test_phase36_align_handles.py::test_t1_handle_frame_matches_stream_content -v` | ❌ W0 | ⬜ pending |
| 36-M3-02 | M3 | 3 | T2 | — | Corner pulls visible in stream | live-e2e | `pytest test/live-e2e/test_phase36_align_handles.py::test_t2_corner_pull_emits_grid_snapshot -v` | ❌ W0 | ⬜ pending |
| 36-M4-01 | M4 | 4 | T3 | — | Vertex drag grabs correct vertex | live-e2e | `pytest test/live-e2e/test_phase36_align_handles.py::test_t3_vertex_drag_correct_index -v` | ❌ W0 | ⬜ pending |
| 36-M4-02 | M4 | 4 | T4 | — | Midpoint clickable + functional | live-e2e | `pytest test/live-e2e/test_phase36_align_handles.py::test_t4_midpoint_drag -v` | ❌ W0 | ⬜ pending |
| 36-M4-03 | M4 | 4 | T5 | — | Rotation handle works | live-e2e | `pytest test/live-e2e/test_phase36_align_handles.py::test_t5_rotation_drag -v` | ❌ W0 | ⬜ pending |
| 36-M5-01 | M5 | 5 | T6 | — | Image-pan free-area drag | live-e2e | `pytest test/live-e2e/test_phase36_align_handles.py::test_t6_image_pan -v` | ❌ W0 | ⬜ pending |
| 36-M5-02 | M5 | 5 | T7 | T-XSS-1 | Right-click context menu appears | live-e2e | `pytest test/live-e2e/test_phase36_align_handles.py::test_t7_right_click_menu -v` | ❌ W0 | ⬜ pending |
| 36-M5-03 | M5 | 5 | T8, D-04 | — | CTRL+Z reverts last gesture | live-e2e | `pytest test/live-e2e/test_phase36_align_handles.py::test_t8_undo_reverts_grid -v` | ❌ W0 | ⬜ pending |
| 36-M5-04 | M5 | 5 | T9, D-06 | T-LB-1 | Dirty-flag local + broadcast | live-e2e | `pytest test/live-e2e/test_phase36_align_handles.py::test_t9_dirty_flag_propagates -v` | ❌ W0 | ⬜ pending |
| 36-V-01 | V | 6 | D-08 | — | Connection-stability fail=0 preserved | node | `RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs'` | ✅ | ⬜ pending |
| 36-V-02 | V | 6 | D-09 | — | output.html ≤8 src-based scripts | grep | `[ "$(grep -cE '<script[^>]*src=' output.html)" -le 8 ]` | ✅ | ⬜ pending |
| 36-V-03 | V | 6 | All T1-T10 | — | Full live-e2e suite green | live-e2e | `pytest test/live-e2e/ -v` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/live-e2e/test_phase36_align_handles.py` — T1-T10 RED tests
- [ ] `test/live-e2e/test_phase36_dashboard_parity.py` — parametrized [`/`, `/output/`] variants of T2/T7/T8 for dashboard regression coverage
- [ ] `test/phase-36-boot-handle-ui-shape.test.mjs` — RED unit test for bootHandleUi export shape
- [ ] (server.mjs) one-line `console.log` in the `/api/align-mode-dirty` POST handler so T9 can assert dirty-flag propagation via stdout
- [ ] No new Python frameworks needed
- [ ] No new fixtures needed (Phase 35 W0's `live_server`, `chrome_browser`, `page`, `@flaky_3x` cover all T1-T10)
- [ ] No new browser binaries (uses `/opt/google/chrome/chrome` from Phase 35 W0)

---

## Manual-Only Verifications

| Behavior | Decision | Why Manual | Test Instructions |
|----------|----------|------------|-------------------|
| Pi 4 hardware UAT | D-10 | Hardware not in CI; carry-forward pattern from Phase 33/34/35 | Operator boots Pi against staging, runs each T1-T10 visually, reports OK/regression |
| Dashboard align-mode UX (operator end-to-end save flow) | D-01 | Live-e2e covers gesture mechanics; full save→reload→verify is multi-page workflow | Operator: open `/`, align-mode on, drag handles, save profile, reload, verify persisted |
| Runtime ctx-trace harness output | D-07 | Requires interactive operator session driving every align gesture on dashboard | Operator: open `/?ctx-trace=1`, exercise corner pull, vertex drag, midpoint, rotation, image-pan, right-click add line, right-click remove line, CTRL+Z, save, discard, ESC. Capture console log, paste into research-supplement.md for planner cross-check |

---

## Validation Sign-Off

- [ ] All tasks have automated verify command OR Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING test references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s per quick test
- [ ] `nyquist_compliant: true` set in frontmatter (after planner sign-off)

**Approval:** pending
