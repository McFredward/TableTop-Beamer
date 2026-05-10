---
phase: 36
plan: W0
type: execute
wave: 0
depends_on: []
files_modified:
  - test/live-e2e/test_phase36_align_handles.py
  - test/live-e2e/test_phase36_dashboard_parity.py
  - test/phase-36-boot-handle-ui-shape.test.mjs
  - server.mjs
autonomous: true
requirements_addressed: [D-03, D-06, D-07, D-08, D-09, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]
gap_closure: false
must_haves:
  truths:
    - "All 10 RED tests T1-T10 exist as Playwright Live-E2E tests under test/live-e2e/test_phase36_align_handles.py"
    - "All 10 RED tests CURRENTLY FAIL because no Phase 36 production code has shipped yet (RED rail invariant)"
    - "Dashboard parity tests exist parametrizing T2/T7/T8 across [/, /output/]"
    - "bootHandleUi export-shape unit RED test exists at test/phase-36-boot-handle-ui-shape.test.mjs (no boot-handle-ui.js yet)"
    - "server.mjs /api/align-mode-dirty handler emits stdout line that T9 can grep"
    - "Connection-stability suite stays fail=0 (D-08 baseline preserved)"
    - "Q1 reconciliation locked in plan: dirty-flag uses existing POST /api/align-mode-dirty endpoint (NOT piggyback on align-grid-snapshot)"
    - "Q2 reconciliation locked: keep test_phase35_dashboard_alignmode.py as-is and ADD parametrized phase36 dashboard parity test"
  artifacts:
    - path: "test/live-e2e/test_phase36_align_handles.py"
      provides: "T1-T10 RED rails wired to scripts/with_server.py + Playwright fixtures"
      contains: "test_t1_handle_frame_matches_stream_content"
    - path: "test/live-e2e/test_phase36_dashboard_parity.py"
      provides: "Parametrized T2/T7/T8 across [/, /output/] for dashboard regression coverage"
      contains: "@pytest.mark.parametrize"
    - path: "test/phase-36-boot-handle-ui-shape.test.mjs"
      provides: "node:test RED unit asserting bootHandleUi export contract"
      contains: "bootHandleUi"
    - path: "server.mjs"
      provides: "console.log added to /api/align-mode-dirty POST handler"
      contains: "[align-mode-dirty] received dirty="
  key_links:
    - from: "test_phase36_align_handles.py"
      to: "scripts/with_server.py via conftest.py live_server fixture"
      via: "Phase 35 W0 fixture re-use"
      pattern: "from _flake_retry import flaky_3x"
    - from: "test_phase36_align_handles.py T9"
      to: "server.mjs /api/align-mode-dirty stdout"
      via: "live_server['stdout_path']"
      pattern: "\\[align-mode-dirty\\] received dirty="
    - from: "test_phase36_dashboard_parity.py"
      to: "test_phase35_dashboard_alignmode.py"
      via: "complementary coverage (parity does NOT replace, it augments)"
      pattern: "@pytest.mark.parametrize.*path.*\\[\"/\", \"/output/\"\\]"
threat_model:
  threats:
    - id: T-DOS-1
      title: "Mutation flood DoS during drag gesture"
      stride: DoS
      asvs: V11
      severity: low
      description: "Drag generates broadcastGridSnapshot calls. Without throttle, /api/live/command could be flooded."
      existing_mitigation: "30Hz client-side throttle (existing in grid-state.js). 100ms server-side dirty-flag floor (server.mjs:2112)."
      new_mitigation: "None — existing controls are sufficient. T9 must NOT exercise this rate."
    - id: T-XSS-1
      title: "XSS via room name in context menu"
      stride: Tampering
      asvs: V5
      severity: low
      description: "Right-click menu shows room name. If it used innerHTML, attacker-controlled room names could execute script."
      existing_mitigation: "handle-ui.js:1390 uses .textContent. Verified by grep."
      new_mitigation: "None — verify by code-review during Wave A1."
    - id: T-LB-1
      title: "Memory leak from unbounded undo stack"
      stride: DoS
      asvs: V11
      severity: low
      description: "Operator drags for hours → history stack grows unbounded → page memory growth."
      existing_mitigation: "None."
      new_mitigation: "1000-entry FIFO cap on undo stack (Q5 LOCKED). Wave M5 task."
---

<objective>
Establish RED test rails (T1-T10 + dashboard parity + bootHandleUi shape unit + dirty-flag log line) BEFORE any Phase 36 production code lands. This wave is BLOCKING per CONTEXT.md D-03 — no implementation work begins until these tests exist and FAIL for the right reasons (no implementation present yet).

**Locked planner reconciliations recorded in this wave:**
- Q1: Dirty-flag uses existing `POST /api/align-mode-dirty` endpoint (NOT piggyback on `align-grid-snapshot`). RESEARCH §1.3 / §5 / Open Q1 — lower risk, matches current implementation. CONTEXT.md D-06 literal text "broadcast piggybacks on align-grid-snapshot" is interpreted as "the dirty-broadcast is local + observable on dashboard via existing live-sync mechanism" — same goal, different mechanism.
- Q2: Keep `test_phase35_dashboard_alignmode.py` unchanged AND add `test_phase36_dashboard_parity.py` with parametrized variants per RESEARCH §5.
- Q3: Right-click "add line" / "remove line" SHALL trigger an immediate `broadcastGridSnapshot({force:true})` (locked in Wave M5 task).
- Q4: handle-ui internal modularization NOT done in Phase 36 (deferred per RESEARCH §6 + CONTEXT.md deferred ideas).
- Q5: Undo stack capped at 1000 entries with FIFO eviction (locked in Wave M5 task).

Purpose: Phase 35 W0 deferred-items.md showed that without RED-driven rails the gap-spiral repeats. Phase 36 W0 fixes this by codifying every observable handle-ui behavior as a test BEFORE any implementation work.

Output: Three test files (Python live-e2e + node unit) + a one-line server.mjs log line. After this plan: every subsequent plan MUST keep T1-T10 GREEN-trajectory (each implementation wave flips its corresponding T<n> from RED→GREEN).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-36/36-CONTEXT.md
@.planning/phases/phase-36/36-RESEARCH.md
@.planning/phases/phase-36/36-VALIDATION.md
@.planning/phases/phase-35/35-CLOSURE-ITER2-ADDENDUM.md
@.planning/phases/phase-35/deferred-items.md
@test/live-e2e/conftest.py
@test/live-e2e/_flake_retry.py
@test/live-e2e/test_phase35_alignmode_smoke.py
@test/live-e2e/test_phase35_dashboard_alignmode.py
@scripts/with_server.py

<interfaces>
<!-- Phase 35 W0 fixtures already provide everything Phase 36 needs. -->
<!-- Executor MUST reuse these — DO NOT introduce new fixtures or framework code. -->

From test/live-e2e/conftest.py (Phase 35 W0):
```python
@pytest.fixture
def live_server(...) -> dict:
    """Yields {'port': int, 'stdout_path': pathlib.Path, 'stderr_path': pathlib.Path, 'http_url': str, ...}.
    Server is booted via scripts/with_server.py with a tempdir CONFIG_ROOT and torn down on test exit.
    Skips test if /opt/google/chrome/chrome not installed."""

@pytest.fixture
def chrome_browser(...):
    """Playwright sync chrome handle pointing at /opt/google/chrome/chrome under DISPLAY=:98."""

@pytest.fixture
def page(chrome_browser):
    """New page on chrome_browser. Closed after test."""
```

From test/live-e2e/_flake_retry.py:
```python
def flaky_3x(test_fn):
    """Decorator: 3× inline retry. If WAVE0_FLAKE_TOLERANCE=1 env var set, an opt-in skip on persistent flake."""
```

From server.mjs (existing — line 4120 area):
```js
if (req.method === "POST" && routePath === "/api/align-mode-dirty") {
  // ... reads JSON body, calls broadcastAlignModeDirtyChange(...).
  // PHASE 36 W0 ADDS: console.log(`[align-mode-dirty] received dirty=${Boolean(payload.dirty)} from=${role}/${clientId}`);
}
```

From server.mjs (existing log line — verified by RESEARCH §4):
```js
// align-grid-snapshot mutation handler at line 1239:
console.log(`[align-grid-snapshot] server-recv from=${role}/${clientId} corners=TL(...)..BR(...) profile=${payload.profileId}`);
// align-corner-drag mutation handler at line 1201:
console.log(`[align-drag] received phase=${phase} v=${vertexId} xy=(...) from=${role}/${clientId}`);
```

CSS selectors verified in handle-ui.js source (RESEARCH §4):
- `.projection-corner-handle` — corner + interior vertex handles
- `.projection-grid-handle` — squish-bar / midpoint handles
- `.projection-rotation-handle` — rotation handles (also `[data-handle-role="rotate"]`)
- `.board-context-menu` — right-click context menu (handle-ui.js:1381)
- `.board-context-menu-item` — menu items (handle-ui.js:1389)
- `#projection-grid-line-canvas` — line canvas (handle-ui.js:191)
- `#align-mode-dirty-hint` — dashboard dirty indicator (index.html:188)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create T1-T10 RED Live-E2E test rail (test_phase36_align_handles.py)</name>
  <files>test/live-e2e/test_phase36_align_handles.py</files>
  <read_first>
    - .planning/phases/phase-36/36-RESEARCH.md (§4 — full per-test design with verified selectors and mutation log strings)
    - .planning/phases/phase-36/36-CONTEXT.md (D-03 — Per-test mechanism table T1-T10)
    - test/live-e2e/conftest.py (live_server, chrome_browser, page fixtures — re-use as-is)
    - test/live-e2e/_flake_retry.py (@flaky_3x decorator)
    - test/live-e2e/test_phase35_alignmode_smoke.py (Phase 35 W0 reference for fixture invocation)
  </read_first>
  <behavior>
    - test_t1_handle_frame_matches_stream_content: opens /output/, toggles align-mode ON via POST /api/live/command (mutationType="context-update", payload={"alignMode":true}), waits for `.projection-corner-handle` count > 0, asserts handle-frame bbox aligns with `video.ssr-video` bbox within 4px on every edge. Currently FAILS (no handles render — bootHandleUi does not exist yet).
    - test_t2_corner_pulls_emit_align_grid_snapshot: drags each of 4 corner handles 20px right+down, sleeps 500ms after each, reads server stdout, counts `[align-grid-snapshot] server-recv` ≥ 4. Currently FAILS (no handles).
    - test_t3_vertex_drag_modifies_correct_vertex: drags `.projection-corner-handle[data-row="0"][data-col="1"]` 30px right, fetches `/api/live/snapshot` JSON, asserts `lastAlignGridSnapshot.points` shows row=0,col=1 x-shifted by >0.2 normalized vs row=0,col=0. Currently FAILS.
    - test_t4_midpoint_drag_emits_squish: waits for `.projection-grid-handle` (midpoint bar), drags 15px right, asserts `[align-grid-snapshot] server-recv` in stdout. Currently FAILS.
    - test_t5_rotation_handle_emits_mutation: waits for `.projection-rotation-handle, [data-handle-role="rotate"]`, traces 30deg arc with 5deg steps, asserts `[align-grid-snapshot] server-recv` in stdout. Currently FAILS.
    - test_t6_image_pan_emits_mutation: clicks center of viewport (free area), drags 50px diagonal, asserts `[align-grid-snapshot] server-recv` in stdout. Currently FAILS.
    - test_t7_right_click_context_menu: right-clicks center, waits for `.board-context-menu`, asserts `.board-context-menu-item` count >= 2, clicks "Add line through this point", asserts EITHER `/api/align-mode-dirty` OR `[align-grid-snapshot] server-recv` in stdout. Currently FAILS.
    - test_t8_ctrl_z_undoes_last_gesture: records initial bbox of first `.projection-corner-handle`, drags 50px, then `page.keyboard.press("Control+z")`, asserts handle returns within 3px of initial position. Currently FAILS.
    - test_t9_dirty_flag_visible_on_dashboard: opens `/` in second context, drags handle on `/output/`, asserts dashboard `#align-mode-dirty-hint` becomes `hidden===false` within 5s. Currently FAILS.
    - test_t10_no_duplicate_mutations: drags handle, captures console messages, asserts ZERO `[input-forwarder] sent phase=start` console lines AND server log shows exactly 1 `[align-grid-snapshot] server-recv` AND 0 `[align-drag] received phase=start`. Currently FAILS.
    - File-level skip: NOT applied. Tests should hard-fail (not skip) when bootHandleUi missing — they're RED rails by design.
  </behavior>
  <action>
Create `test/live-e2e/test_phase36_align_handles.py` containing the 10 RED tests verbatim per RESEARCH §4 per-test design. Use this exact structure:

```python
"""Phase 36 RED test rail — comprehensive align-mode on /output/.

T1-T10 from CONTEXT.md D-03. All BLOCKING: no Phase 36 production code lands
until these exist and FAIL. They transition to GREEN when the corresponding
implementation wave (M3-M5) lands.

DO NOT skip on missing bootHandleUi — this rail is RED by design until M3-M5.
"""
from __future__ import annotations
import json, math, time, urllib.request
import pytest
from _flake_retry import flaky_3x


def _trigger_align_mode(port: int, on: bool) -> None:
    body = json.dumps({"mutationType": "context-update",
                       "payload": {"alignMode": bool(on)}}).encode()
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}/api/live/command",
        data=body, headers={"content-type": "application/json"})
    urllib.request.urlopen(req, timeout=5).read()


def _open_output_align_on(live_server, page):
    port = live_server["port"]
    page.goto(f"http://127.0.0.1:{port}/output/",
              wait_until="domcontentloaded", timeout=15_000)
    page.wait_for_function(
        "document.querySelector('video.ssr-video, video')?.readyState === 4",
        timeout=10_000)
    _trigger_align_mode(port, True)
    # bootHandleUi is lazy-loaded via output-align-mode-loader.js — wait for handles
    page.wait_for_function(
        "document.querySelectorAll('.projection-corner-handle').length > 0",
        timeout=8_000)


@flaky_3x
def test_t1_handle_frame_matches_stream_content(live_server, page):
    _open_output_align_on(live_server, page)
    rect = page.evaluate("""(() => {
        const v = document.querySelector('video.ssr-video, video');
        const h = document.querySelectorAll('.projection-corner-handle');
        if (!v || !h.length) return null;
        const vb = v.getBoundingClientRect();
        const xs = Array.from(h).map(el => el.getBoundingClientRect());
        return {
            vb_l: vb.left, vb_t: vb.top, vb_r: vb.right, vb_b: vb.bottom,
            hl: Math.min(...xs.map(r => r.left + r.width/2)),
            ht: Math.min(...xs.map(r => r.top + r.height/2)),
            hr: Math.max(...xs.map(r => r.left + r.width/2)),
            hb: Math.max(...xs.map(r => r.top + r.height/2)),
        };
    })()""")
    assert rect is not None, "no video or handles"
    assert abs(rect["hl"] - rect["vb_l"]) < 4, f"handle-frame left misaligned: {rect}"
    assert abs(rect["ht"] - rect["vb_t"]) < 4, f"handle-frame top: {rect}"
    assert abs(rect["hr"] - rect["vb_r"]) < 4, f"handle-frame right: {rect}"
    assert abs(rect["hb"] - rect["vb_b"]) < 4, f"handle-frame bottom: {rect}"


@flaky_3x
def test_t2_corner_pulls_emit_align_grid_snapshot(live_server, page):
    _open_output_align_on(live_server, page)
    for corner_idx in range(4):
        h = page.locator(".projection-corner-handle").nth(corner_idx)
        b = h.bounding_box()
        page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2)
        page.mouse.down()
        page.mouse.move(b["x"]+b["width"]/2 + 20, b["y"]+b["height"]/2 + 20, steps=4)
        page.mouse.up()
        time.sleep(0.5)
    log = open(live_server["stdout_path"]).read()
    n = log.count("[align-grid-snapshot] server-recv")
    assert n >= 4, f"expected >=4 align-grid-snapshot, got {n}\nLog tail:\n{log[-2000:]}"


@flaky_3x
def test_t3_vertex_drag_modifies_correct_vertex(live_server, page):
    _open_output_align_on(live_server, page)
    h = page.locator('.projection-corner-handle[data-row="0"][data-col="1"]').first
    b = h.bounding_box()
    page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2)
    page.mouse.down()
    page.mouse.move(b["x"]+b["width"]/2 + 30, b["y"]+b["height"]/2, steps=5)
    page.mouse.up()
    time.sleep(0.5)
    snap_url = f"http://127.0.0.1:{live_server['port']}/api/live/snapshot"
    snap = json.loads(urllib.request.urlopen(snap_url, timeout=5).read())
    last = snap.get("snapshot", snap).get("runtime", {}).get("lastAlignGridSnapshot", {})
    pts = last.get("points", [])
    p_dragged = next((p for p in pts if p.get("row") == 0 and p.get("col") == 1), None)
    p_anchor  = next((p for p in pts if p.get("row") == 0 and p.get("col") == 0), None)
    assert p_dragged and p_anchor, f"missing pts: {pts}"
    assert p_dragged["x"] - p_anchor["x"] > 0.2, f"vertex (0,1) didn't move past (0,0): {pts}"


@flaky_3x
def test_t4_midpoint_drag_emits_squish(live_server, page):
    _open_output_align_on(live_server, page)
    page.wait_for_function(
        "document.querySelectorAll('.projection-grid-handle').length > 0",
        timeout=4_000)
    bar = page.locator(".projection-grid-handle").first
    b = bar.bounding_box()
    page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2)
    page.mouse.down()
    page.mouse.move(b["x"]+b["width"]/2 + 15, b["y"]+b["height"]/2, steps=4)
    page.mouse.up()
    time.sleep(0.5)
    log = open(live_server["stdout_path"]).read()
    assert "[align-grid-snapshot] server-recv" in log, f"no grid mutation\nLog tail:\n{log[-2000:]}"


@flaky_3x
def test_t5_rotation_handle_emits_mutation(live_server, page):
    _open_output_align_on(live_server, page)
    page.wait_for_function(
        "document.querySelectorAll('.projection-rotation-handle, [data-handle-role=\"rotate\"]').length > 0",
        timeout=4_000)
    rot = page.locator(".projection-rotation-handle, [data-handle-role='rotate']").first
    b = rot.bounding_box()
    cx, cy = b["x"]+b["width"]/2, b["y"]+b["height"]/2
    page.mouse.move(cx, cy); page.mouse.down()
    for ang in range(0, 30, 5):
        a = math.radians(ang)
        page.mouse.move(cx + 60*math.cos(a) - 60, cy + 60*math.sin(a))
    page.mouse.up()
    time.sleep(0.5)
    log = open(live_server["stdout_path"]).read()
    assert "[align-grid-snapshot] server-recv" in log


@flaky_3x
def test_t6_image_pan_emits_mutation(live_server, page):
    _open_output_align_on(live_server, page)
    cx = page.evaluate("window.innerWidth/2")
    cy = page.evaluate("window.innerHeight/2")
    page.mouse.move(cx, cy); page.mouse.down()
    page.mouse.move(cx + 50, cy + 50, steps=8)
    page.mouse.up()
    time.sleep(0.5)
    log = open(live_server["stdout_path"]).read()
    assert "[align-grid-snapshot] server-recv" in log


@flaky_3x
def test_t7_right_click_context_menu(live_server, page):
    _open_output_align_on(live_server, page)
    cx = page.evaluate("window.innerWidth/2")
    cy = page.evaluate("window.innerHeight/2")
    page.mouse.click(cx, cy, button="right")
    page.wait_for_selector(".board-context-menu", timeout=2_000)
    items = page.locator(".board-context-menu .board-context-menu-item")
    assert items.count() >= 2, f"expected >=2 menu items, got {items.count()}"
    page.locator(".board-context-menu-item", has_text="Add line through this point").first.click()
    time.sleep(0.5)
    log = open(live_server["stdout_path"]).read()
    assert ("/api/align-mode-dirty" in log) or ("[align-grid-snapshot] server-recv" in log), \
        f"no dirty-flag or grid-snapshot after add-line\nLog tail:\n{log[-2000:]}"


@flaky_3x
def test_t8_ctrl_z_undoes_last_gesture(live_server, page):
    _open_output_align_on(live_server, page)
    h = page.locator(".projection-corner-handle").first
    b = h.bounding_box()
    initial = page.evaluate("""(() => {
        const h = document.querySelector('.projection-corner-handle');
        const r = h.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2 };
    })()""")
    page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2)
    page.mouse.down()
    page.mouse.move(b["x"]+b["width"]/2 + 50, b["y"]+b["height"]/2, steps=5)
    page.mouse.up()
    time.sleep(0.4)
    page.keyboard.press("Control+z")
    time.sleep(0.4)
    final = page.evaluate("""(() => {
        const h = document.querySelector('.projection-corner-handle');
        const r = h.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2 };
    })()""")
    assert abs(final["x"] - initial["x"]) < 3, f"undo failed: {initial} -> {final}"


@flaky_3x
def test_t9_dirty_flag_visible_on_dashboard(live_server, page, chrome_browser):
    dashboard_ctx = chrome_browser.new_context()
    dash = dashboard_ctx.new_page()
    try:
        dash.goto(f"http://127.0.0.1:{live_server['port']}/",
                  wait_until="domcontentloaded", timeout=15_000)
        dash.wait_for_selector("#align-mode-dirty-hint", timeout=10_000)
        _open_output_align_on(live_server, page)
        h = page.locator(".projection-corner-handle").first
        b = h.bounding_box()
        page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2)
        page.mouse.down()
        page.mouse.move(b["x"]+b["width"]/2 + 30, b["y"]+b["height"]/2 + 30, steps=4)
        page.mouse.up()
        time.sleep(1.0)
        dash.wait_for_function(
            "document.getElementById('align-mode-dirty-hint')?.hidden === false",
            timeout=5_000)
        # ALSO assert server-side log line (Q1 reconciliation: existing endpoint)
        log = open(live_server["stdout_path"]).read()
        assert "[align-mode-dirty] received dirty=" in log, \
            f"server stdout missing align-mode-dirty log\nTail:\n{log[-2000:]}"
    finally:
        try: dashboard_ctx.close()
        except Exception: pass


@flaky_3x
def test_t10_no_duplicate_mutations(live_server, page):
    console_lines: list[str] = []
    page.on("console", lambda m: console_lines.append(m.text))
    _open_output_align_on(live_server, page)
    h = page.locator(".projection-corner-handle").first
    b = h.bounding_box()
    page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2)
    page.mouse.down()
    page.mouse.move(b["x"]+b["width"]/2 + 30, b["y"]+b["height"]/2 + 30, steps=4)
    page.mouse.up()
    time.sleep(0.6)
    fwd = [l for l in console_lines if "[input-forwarder] sent phase=start" in l]
    assert len(fwd) == 0, f"forwarder fired during align-mode: {fwd}"
    log = open(live_server["stdout_path"]).read()
    n_grid = log.count("[align-grid-snapshot] server-recv")
    n_corner = log.count("[align-drag] received phase=start")
    assert n_grid == 1, f"expected 1 align-grid-snapshot, got {n_grid}"
    assert n_corner == 0, f"expected 0 align-corner-drag, got {n_corner}"
```

Implements per RESEARCH §4 — every selector and log string has been source-grep-verified. No fabrication.
  </action>
  <verify>
    <automated>pytest test/live-e2e/test_phase36_align_handles.py -v --collect-only 2>&1 | grep -cE "test_t[0-9]+ "</automated>
    Expected output: 10 (10 tests collected)
  </verify>
  <acceptance_criteria>
    - File `test/live-e2e/test_phase36_align_handles.py` exists
    - `pytest test/live-e2e/test_phase36_align_handles.py --collect-only -q 2>&1 | grep -c "::test_t"` returns `10`
    - All 10 tests reference `live_server` fixture (grep `live_server` returns ≥10 matches)
    - All 10 tests are wrapped with `@flaky_3x` (grep `@flaky_3x` returns exactly 10)
    - File imports `from _flake_retry import flaky_3x`
    - File contains string literal `[align-grid-snapshot] server-recv` (used in log assertions)
    - File contains string literal `.projection-corner-handle`, `.projection-grid-handle`, `.projection-rotation-handle`, `.board-context-menu`, `[align-mode-dirty] received dirty=` (selectors + log strings)
    - When run, tests CURRENTLY FAIL: `pytest test/live-e2e/test_phase36_align_handles.py::test_t1_handle_frame_matches_stream_content -v 2>&1 | grep -E "(FAILED|TimeoutError)"` returns at least one match (RED-rail invariant — handles do not yet render via bootHandleUi)
    - No Python syntax errors: `python -c "import ast; ast.parse(open('test/live-e2e/test_phase36_align_handles.py').read())"` exits 0
  </acceptance_criteria>
  <done>
    File exists with 10 collectible RED tests using verified selectors and verified server stdout strings. Tests fail (because no bootHandleUi yet) — that is the RED-rail invariant.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create dashboard parity test (test_phase36_dashboard_parity.py)</name>
  <files>test/live-e2e/test_phase36_dashboard_parity.py</files>
  <read_first>
    - .planning/phases/phase-36/36-RESEARCH.md (§4 last subsection + §5 — Q2 reconciliation: keep + add)
    - test/live-e2e/test_phase35_dashboard_alignmode.py (existing — DO NOT modify; reference shape)
    - test/live-e2e/conftest.py (live_server, chrome_browser, page fixtures)
  </read_first>
  <behavior>
    - test_t2_corner_pull_parametrized[/]: drags first corner handle on dashboard `/`, asserts `[align-grid-snapshot] server-recv` in server stdout. RED today (handles render on dashboard but the broadcast path uses different mutation type pre-Phase-36).
    - test_t2_corner_pull_parametrized[/output/]: same assertion via `/output/`. RED today (no bootHandleUi yet).
    - test_t7_right_click_menu_parametrized[/]: right-click in canvas area, assert `.board-context-menu` visible. Already GREEN on dashboard (handle-ui already runs); kept as a parity-check anchor.
    - test_t7_right_click_menu_parametrized[/output/]: same on `/output/`. RED today.
    - test_t8_ctrl_z_parametrized[/]: drag + CTRL+Z, assert handle returns near initial position. Already GREEN on dashboard.
    - test_t8_ctrl_z_parametrized[/output/]: same on `/output/`. RED today.
  </behavior>
  <action>
Create `test/live-e2e/test_phase36_dashboard_parity.py`. Goal: prove parity between dashboard `/` and thin `/output/` for the three most diagnostic interactions (T2, T7, T8). Use `@pytest.mark.parametrize("path", ["/", "/output/"])`.

```python
"""Phase 36 dashboard parity rail — same handle-ui interactions on / and /output/.

Q2 reconciliation (LOCKED in W0 plan): keep test_phase35_dashboard_alignmode.py
unchanged; this NEW file adds parametrized variants of T2/T7/T8 across both
paths so that M3-M5 implementations are forced to keep dashboard regression
GREEN at every wave.
"""
from __future__ import annotations
import json, time, urllib.request
import pytest
from _flake_retry import flaky_3x


def _trigger_align_mode(port: int, on: bool) -> None:
    body = json.dumps({"mutationType": "context-update",
                       "payload": {"alignMode": bool(on)}}).encode()
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}/api/live/command",
        data=body, headers={"content-type": "application/json"})
    urllib.request.urlopen(req, timeout=5).read()


def _open_path_align_on(live_server, page, path):
    port = live_server["port"]
    page.goto(f"http://127.0.0.1:{port}{path}",
              wait_until="domcontentloaded", timeout=15_000)
    if path == "/output/":
        page.wait_for_function(
            "document.querySelector('video.ssr-video, video')?.readyState === 4",
            timeout=10_000)
    _trigger_align_mode(port, True)
    page.wait_for_function(
        "document.querySelectorAll('.projection-corner-handle').length > 0",
        timeout=10_000)


@pytest.mark.parametrize("path", ["/", "/output/"])
@flaky_3x
def test_t2_corner_pull_parity(live_server, page, path):
    _open_path_align_on(live_server, page, path)
    h = page.locator(".projection-corner-handle").first
    b = h.bounding_box()
    page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2)
    page.mouse.down()
    page.mouse.move(b["x"]+b["width"]/2 + 25, b["y"]+b["height"]/2 + 25, steps=4)
    page.mouse.up()
    time.sleep(0.6)
    log = open(live_server["stdout_path"]).read()
    assert "[align-grid-snapshot] server-recv" in log, \
        f"no grid mutation on {path}\nLog tail:\n{log[-2000:]}"


@pytest.mark.parametrize("path", ["/", "/output/"])
@flaky_3x
def test_t7_right_click_menu_parity(live_server, page, path):
    _open_path_align_on(live_server, page, path)
    cx = page.evaluate("window.innerWidth/2")
    cy = page.evaluate("window.innerHeight/2")
    page.mouse.click(cx, cy, button="right")
    page.wait_for_selector(".board-context-menu", timeout=3_000)
    items = page.locator(".board-context-menu .board-context-menu-item")
    assert items.count() >= 2, f"expected >=2 menu items on {path}, got {items.count()}"


@pytest.mark.parametrize("path", ["/", "/output/"])
@flaky_3x
def test_t8_ctrl_z_undo_parity(live_server, page, path):
    _open_path_align_on(live_server, page, path)
    h = page.locator(".projection-corner-handle").first
    b = h.bounding_box()
    initial = page.evaluate("""(() => {
        const h = document.querySelector('.projection-corner-handle');
        const r = h.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2 };
    })()""")
    page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2)
    page.mouse.down()
    page.mouse.move(b["x"]+b["width"]/2 + 50, b["y"]+b["height"]/2, steps=5)
    page.mouse.up()
    time.sleep(0.4)
    page.keyboard.press("Control+z")
    time.sleep(0.4)
    final = page.evaluate("""(() => {
        const h = document.querySelector('.projection-corner-handle');
        const r = h.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2 };
    })()""")
    assert abs(final["x"] - initial["x"]) < 3, f"undo failed on {path}: {initial} -> {final}"
```
  </action>
  <verify>
    <automated>pytest test/live-e2e/test_phase36_dashboard_parity.py --collect-only -q 2>&1 | grep -cE "::test_t"</automated>
    Expected output: 6 (3 tests × 2 paths)
  </verify>
  <acceptance_criteria>
    - File `test/live-e2e/test_phase36_dashboard_parity.py` exists
    - `pytest test/live-e2e/test_phase36_dashboard_parity.py --collect-only -q 2>&1 | grep -c "::test_t"` returns `6`
    - File contains the literal `@pytest.mark.parametrize("path", ["/", "/output/"])` (exactly that string with both paths)
    - Existing test file `test/live-e2e/test_phase35_dashboard_alignmode.py` is UNCHANGED — `git diff --name-only` does NOT include this path
    - `python -c "import ast; ast.parse(open('test/live-e2e/test_phase36_dashboard_parity.py').read())"` exits 0
    - 3 functions named `test_t2_corner_pull_parity`, `test_t7_right_click_menu_parity`, `test_t8_ctrl_z_undo_parity` exist (grep returns exactly 3 `def test_t` matches)
    - All 3 functions wrapped with `@flaky_3x` (grep returns exactly 3 `@flaky_3x`)
  </acceptance_criteria>
  <done>
    Parity rail file exists, collects 6 tests, leaves Phase 35 dashboard test untouched. Q2 reconciliation locked.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Create bootHandleUi shape unit RED test (phase-36-boot-handle-ui-shape.test.mjs) AND add server.mjs dirty-flag stdout log line</name>
  <files>
    - test/phase-36-boot-handle-ui-shape.test.mjs
    - server.mjs
  </files>
  <read_first>
    - .planning/phases/phase-36/36-RESEARCH.md (§2 — full bootHandleUi signature, §4 — log format requirement, §10 — file touch Wave-0 entry)
    - server.mjs lines 4100-4150 (existing /api/align-mode-dirty handler — see grep results in init context)
    - test/phase-35-bootalignmode-shape.test.mjs (analogous Phase 35 W0 shape test — reference style)
  </read_first>
  <behavior>
    - test_phase36_bootHandleUi_export_shape: imports module, asserts `bootHandleUi` is exported as a function. RED today (file does not exist yet — this RED-rail flips GREEN when Wave A1 ships boot-handle-ui.js).
    - test_phase36_bootHandleUi_returns_stop: calls bootHandleUi with minimal stub args, asserts return value has `.stop` method (function) and `.hitTestVertex` method (function). RED today.
    - test_phase36_bootHandleUi_throws_on_missing_required_args: calls bootHandleUi with empty `{}`, asserts it throws. RED today.
    - server.mjs change: in the existing `/api/align-mode-dirty` POST handler (around line 4120), after the existing body parse, ADD ONE console.log line: `console.log(`[align-mode-dirty] received dirty=${Boolean(payload.dirty)} from=${role || "unknown"}/${clientId || "unknown"}`);` — placed BEFORE the broadcast call so the log is visible regardless of broadcast success.
  </behavior>
  <action>
**Sub-task 3a — Create `test/phase-36-boot-handle-ui-shape.test.mjs`:**

```js
// Phase 36 W0 RED unit — bootHandleUi export shape contract.
// File `src/app/runtime/output-receiver/boot-handle-ui.js` does NOT exist yet
// (Wave A1 creates it). These tests are RED until A1 ships.
import { test } from "node:test";
import assert from "node:assert/strict";

const MODULE_PATH = "../src/app/runtime/output-receiver/boot-handle-ui.js";

async function _import() {
  // Use file:// so node resolves relative to repo root (this test sits in test/).
  const url = new URL(MODULE_PATH, import.meta.url).href;
  return await import(url);
}

test("Phase 36: bootHandleUi is exported as a function", async () => {
  const mod = await _import();
  assert.equal(typeof mod.bootHandleUi, "function",
    "expected bootHandleUi function export");
});

test("Phase 36: bootHandleUi returns object with stop() and hitTestVertex()", async () => {
  const mod = await _import();
  // Build a minimal stub-arg bag — every named arg from §2 signature with a no-op value.
  const noop = () => {};
  const fakeStage = { appendChild: noop, removeChild: noop, addEventListener: noop, removeEventListener: noop };
  const fakeOverlay = { ...fakeStage, replaceChildren: noop };
  const handle = mod.bootHandleUi({
    stage: fakeStage, roomOverlay: fakeOverlay, videoEl: null, feedbackEl: null,
    state: { boardId: "test", alignMode: false, uiView: "dashboard",
             polygonEditor: {}, shipPolygonEditor: {}, runtime: {} },
    outputRole: "final-output", OUTPUT_ROLE_FINAL: "final-output", OUTPUT_ROLE_CONTROL: "control",
    liveSync: { onAlignModeChange: noop, onProjectionProfileChange: noop,
                getAlignMode: () => false, getActiveProjectionProfileId: () => null,
                getCurrentClientId: () => "test", stop: noop, emitLiveMutation: noop },
    liveSyncCoreOverride: null,
    polygonContract: null, normalizers: {}, boardAccess: {}, polygonState: {},
    interactions: {}, persistence: {}, alignModeDirtyEndpoint: "/api/align-mode-dirty",
    sync: {}, dashboard: {},
    renderRoomOverlay: noop, showToast: noop, getRenderMode: () => "auto",
    getBoardId: () => "test",
    logger: { log: noop, warn: noop, error: noop },
  });
  assert.equal(typeof handle.stop, "function", "expected handle.stop function");
  assert.equal(typeof handle.hitTestVertex, "function", "expected handle.hitTestVertex function");
  handle.stop(); // teardown should not throw
});

test("Phase 36: bootHandleUi throws on missing required args", async () => {
  const mod = await _import();
  assert.throws(() => mod.bootHandleUi({}), /required|missing|undefined/i);
});
```

**Sub-task 3b — Modify server.mjs:**

Locate the existing `/api/align-mode-dirty` POST handler (verified at line 4120 by init-context grep). Find the spot just AFTER `payload` is parsed and BEFORE `broadcastAlignModeDirtyChange` (or equivalent broadcast call) is invoked. Add this exact line:

```js
console.log(`[align-mode-dirty] received dirty=${Boolean(payload?.dirty)} from=${role || "unknown"}/${clientId || "unknown"}`);
```

The string `[align-mode-dirty] received dirty=` is what T9 (in `test_phase36_align_handles.py`) greps for. Substring match on `received dirty=` is the test's anchor.

**Important:** Do NOT remove or alter any existing logic in this handler. The change is PURELY additive — one new line of stdout output before the existing broadcast.

**If `role` or `clientId` are not in scope at the handler:** use the existing variable names from server.mjs's request-handler closure (read context lines 4100-4140 to identify them). If neither exists, log `from=server` instead. The exact `from=` field value is NOT asserted by tests — only the prefix `[align-mode-dirty] received dirty=` matters.
  </action>
  <verify>
    <automated>node --test test/phase-36-boot-handle-ui-shape.test.mjs 2>&1 | grep -cE "(fail|FAIL)" && grep -c "\[align-mode-dirty\] received dirty=" server.mjs</automated>
    Expected output: at least 3 fails (RED rail) + at least 1 grep match for the new server.mjs log line (so the count line shows ≥1)
  </verify>
  <acceptance_criteria>
    - File `test/phase-36-boot-handle-ui-shape.test.mjs` exists
    - File contains exactly 3 `test(` calls (RED rails for export, return shape, error path)
    - Running `node --test test/phase-36-boot-handle-ui-shape.test.mjs` produces at least 1 failure (RED-rail invariant — boot-handle-ui.js does not yet exist)
    - `grep -c "\[align-mode-dirty\] received dirty=" server.mjs` returns ≥ 1 (new log line added)
    - `grep -nE "POST.*align-mode-dirty" server.mjs` still finds the original handler (existing logic preserved)
    - Server boots successfully: `node -c server.mjs` exits 0 (no syntax errors)
    - The newly added server.mjs log line appears within the `/api/align-mode-dirty` handler block (not at top-level / not in another handler)
  </acceptance_criteria>
  <done>
    bootHandleUi RED unit exists and fails. server.mjs emits the dirty-flag stdout line so T9 can assert it. Both rails ready for A1 to flip the unit and M5 to flip T9.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Server WebSocket /api/live/ws | Untrusted JSON live-mutations cross this boundary |
| Browser → Server POST /api/live/command | Untrusted HTTP mutations |
| Browser → Server POST /api/align-mode-dirty | Untrusted dirty-flag toggles |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-DOS-1 | DoS | broadcastGridSnapshot drag flood | accept | Existing 30Hz client throttle + 100ms server dirty-flag floor (server.mjs:2112) sufficient |
| T-XSS-1 | Tampering | board-context-menu room name | accept | Verified handle-ui.js:1390 uses .textContent, not innerHTML |
| T-LB-1 | DoS | grid-state undo stack memory leak | mitigate | Wave M5 task adds 1000-entry FIFO cap (Q5 LOCKED) |
</threat_model>

<verification>
Phase-36 W0 closure gates:
- All three task acceptance criteria pass
- `pytest test/live-e2e/test_phase36_align_handles.py --collect-only -q 2>&1 | grep -c "::test_t"` returns 10
- `pytest test/live-e2e/test_phase36_dashboard_parity.py --collect-only -q 2>&1 | grep -c "::test_t"` returns 6
- `node --test test/phase-36-boot-handle-ui-shape.test.mjs` exits non-zero (RED rail)
- `grep -c "\[align-mode-dirty\] received dirty=" server.mjs` ≥ 1
- `RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs'` reports `fail=0` (D-08 baseline preserved — no production code changed beyond the additive log line)
- `[ "$(grep -cE '<script[^>]*src=' output.html)" -le 8 ]` exits 0 (D-09 budget unchanged)
</verification>

<success_criteria>
- T1-T10 RED rails exist and fail (correctly — no implementation yet)
- Dashboard parity rails exist (parametrized 3×2)
- bootHandleUi shape unit test exists and fails
- server.mjs emits `[align-mode-dirty] received dirty=` log line
- D-08 connection-stability fail=0 preserved
- D-09 ≤8 src-based scripts preserved (no change to output.html in W0)
- W0 outputs are RED-by-design — they DO NOT pass yet, and the executor MUST NOT attempt to make them pass in W0. Subsequent waves (A1-M5) flip them GREEN.
</success_criteria>

<output>
After completion, create `.planning/phases/phase-36/36-W0-SUMMARY.md` documenting:
- The exact lines/files created
- The Q1-Q5 reconciliations locked into the plan (verbatim from this objective section)
- Confirmation that all 10 + 6 tests collect but fail
- Evidence of D-08 fail=0 baseline run
</output>
