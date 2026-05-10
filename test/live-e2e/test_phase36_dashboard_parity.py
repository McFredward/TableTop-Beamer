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
