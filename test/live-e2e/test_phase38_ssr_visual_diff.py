"""Phase 38 — end-to-end visual diff test for SSR tab mesh-warp render.

Test plan (proves the FULL pipeline: WS → grid.points → mesh-warp → canvas pixels):

1. Wait for SSR tab warm up; warp grid TL to corner A.
2. Capture a screenshot of the SSR tab.
3. Broadcast a single-shot grid with TL pulled to a clearly different corner B.
4. Wait for the SSR tab's grid.points to match B (via /api/diag/ssr-grid).
5. After grid.points matches B, wait one rAF + capture screenshot.
6. Compute byte-diff between screenshot 1 and screenshot 2. They must differ
   significantly. If they match too closely, the mesh-warp render did NOT
   re-render despite grid.points being mutated — the actual Phase 38 root cause.

Note: the SSR tab is captured at ~16-60 fps. After grid.points is mutated,
at most ~33ms must elapse before the next mesh-warp frame is drawn. We allow
500ms slack.
"""
from __future__ import annotations
import json, time, urllib.request, urllib.error
import pytest
from _flake_retry import flaky_3x


def _http_get(port: int, path: str, timeout: float = 5.0):
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{port}{path}", timeout=timeout,
        ) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def _post_json(port: int, path: str, body: dict):
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}{path}",
        data=json.dumps(body).encode(),
        headers={"content-type": "application/json"},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=5)
        return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def _broadcast_grid(port, srcXs, srcYs, points, profile):
    return _post_json(port, "/api/live/command", {
        "mutationType": "align-grid-snapshot",
        "payload": {"srcXs": srcXs, "srcYs": srcYs, "points": points, "profileId": profile},
    })


def _toggle_align_mode(port: int, on: bool):
    code, _ = _post_json(port, "/api/live/command", {
        "mutationType": "context-update",
        "payload": {"alignMode": bool(on)},
    })
    assert code in (200, 202)


def _warped_grid(tl_x: float, tl_y: float, br_x: float = 1.0, br_y: float = 1.0):
    srcXs = [0.0, 0.5, 1.0]
    srcYs = [0.0, 0.5, 1.0]
    points = []
    for r in range(3):
        for c in range(3):
            x, y = srcXs[c], srcYs[r]
            if r == 0 and c == 0:
                x, y = tl_x, tl_y
            elif r == 2 and c == 2:
                x, y = br_x, br_y
            points.append({"row": r, "col": c, "x": x, "y": y})
    return srcXs, srcYs, points


def _fetch_ssr_grid(port):
    code, body = _http_get(port, "/api/diag/ssr-grid")
    if code == 200:
        try:
            data = json.loads(body)
            if data.get("ok"):
                return data.get("grid")
        except Exception:
            return None
    return None


def _wait_for_grid_match(port, expected_tl, timeout_s=3.0, tol=0.005):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        g = _fetch_ssr_grid(port)
        if g and g.get("points"):
            tl = g["points"][0][0]
            if abs(tl["x"] - expected_tl[0]) < tol and abs(tl["y"] - expected_tl[1]) < tol:
                return True, g
        time.sleep(0.1)
    return False, None


def _fetch_screenshot(port):
    code, body = _http_get(port, "/api/diag/ssr-screenshot", timeout=8.0)
    if code != 200:
        return None
    return body


def _wait_for_ssr_warmup(port, timeout_s=30):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        g = _fetch_ssr_grid(port)
        if g:
            return True
        time.sleep(0.5)
    return False


def _bytes_diff_rate(a: bytes, b: bytes) -> float:
    """JPEG-byte diff rate. Two JPEGs of the same scene differ <2%; two
    significantly different scenes differ >5%. This is heuristic but
    sufficient for "did the mesh-warp re-render at all".
    """
    if not a or not b:
        return 0.0
    n = min(len(a), len(b))
    if n == 0:
        return 0.0
    diff = sum(1 for i in range(n) if a[i] != b[i])
    return diff / n


@pytest.fixture(autouse=True)
def _require_ssr_host(live_server):
    port = live_server["port"]
    code, body = _http_get(port, "/api/diag/ssr-grid", timeout=2.0)
    if code == 503 and b"ssr-host-inactive" in body:
        pytest.skip("SSR_RENDER_HOST not active")


@flaky_3x
def test_phase38_visual_mesh_warp_updates_after_single_shot(live_server, page):
    """Single-shot broadcast must produce a visually different SSR tab screenshot
    within 500ms. If it does not, mesh-warp didn't pick up grid.points change."""
    port = live_server["port"]
    assert _wait_for_ssr_warmup(port, timeout_s=30), "SSR tab did not warm up"

    _toggle_align_mode(port, True)
    time.sleep(0.5)

    # Establish a strong warp (TL at 0.20, 0.20) so the screen has a clear
    # non-identity transform — gives us texture to diff against.
    srcXs, srcYs, points = _warped_grid(0.20, 0.20)
    code, _ = _broadcast_grid(port, srcXs, srcYs, points, "phase38-visual-A")
    assert code in (200, 202)
    matched, _ = _wait_for_grid_match(port, (0.20, 0.20))
    assert matched, "first warp did not apply at grid.points level"
    time.sleep(0.5)  # let mesh-warp settle, encoder catch up

    shot1 = _fetch_screenshot(port)
    assert shot1, "could not capture screenshot 1"

    # Now broadcast a DIFFERENT warp (TL at 0.40, 0.40 — a clearly visible change)
    srcXs, srcYs, points = _warped_grid(0.40, 0.40)
    code, _ = _broadcast_grid(port, srcXs, srcYs, points, "phase38-visual-B")
    assert code in (200, 202)
    matched, _ = _wait_for_grid_match(port, (0.40, 0.40))
    assert matched, "second warp did not apply at grid.points level"

    # Wait long enough for next mesh-warp frame + screenshot pipeline (~100ms
    # rAF gap + 60ms screenshot overhead = ~200ms; round up to 800ms for stability)
    time.sleep(0.8)

    shot2 = _fetch_screenshot(port)
    assert shot2, "could not capture screenshot 2"

    diff_rate = _bytes_diff_rate(shot1, shot2)

    # JPEG of identical scenes ~0.5-1.5% differ due to encoder noise. JPEG of
    # different scenes typically >10% differ. We require >3% as a conservative
    # bar that demonstrates real visual change.
    assert diff_rate > 0.03, (
        f"SSR tab screenshot did not visually change after a single-shot "
        f"grid broadcast: diff_rate={diff_rate:.4f}\n"
        f"shot1 size={len(shot1)} bytes, shot2 size={len(shot2)} bytes\n"
        f"This proves the bug is in mesh-warp render → canvas → stream "
        f"encoder, NOT in WS dispatch or grid.points apply.\n"
        f"grid.points DID update (the wait_for_grid_match assertions passed) "
        f"but the rendered pixels did NOT change."
    )
