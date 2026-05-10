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
    # Phase 36 M4 — traverse the actual server response shape:
    # `{ok, changed, session: {snapshot: {runtime: {lastAlignGridSnapshot: ...}}}}`.
    # The original W0 path `snap.get("snapshot", snap).get("runtime", ...)` did
    # not traverse `session`, leaving `pts` empty even when the broadcast landed.
    snap_root = snap.get("session", snap).get("snapshot", snap)
    last = snap_root.get("runtime", {}).get("lastAlignGridSnapshot", {})
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
        # Phase 36 M5 — element exists in dashboard DOM but starts hidden;
        # wait for attached (not visible) — visibility flips when the
        # /output/ drag below propagates dirty=true through live-sync.
        dash.wait_for_selector("#align-mode-dirty-hint", state="attached", timeout=10_000)
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
