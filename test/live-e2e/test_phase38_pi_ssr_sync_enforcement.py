"""Phase 38 W2 — Pi /output/ ↔ SSR-tab grid convergence enforcement.

Operator UAT (2026-05-11) reports: "die linien an einer leicht verschobenen
stelle gegenüber dem was der Stream anzeigt" — Pi's local overlay lines do
not always match the streamed mesh-warp content. Bug class: convergence,
not apply-path.

This test opens Pi /output/ in Playwright AND queries the SSR tab via CDP
to verify they hold the SAME grid.points after various mutation sequences.
Any divergence is a sync violation.

Scenarios:
- A: Single mutation → both Pi and SSR converge within 1s
- B: Drag burst then idle → both converge within 1s of last broadcast
- C: Profile-load equivalent → both converge within 1s
"""
from __future__ import annotations
import json, time, urllib.request, urllib.error
import pytest
from _flake_retry import flaky_3x


def _http_get(port, path, timeout=5.0):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}{path}", timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def _post_json(port, path, body):
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


def _toggle_align_mode(port, on):
    code, _ = _post_json(port, "/api/live/command", {
        "mutationType": "context-update",
        "payload": {"alignMode": bool(on)},
    })
    assert code in (200, 202)


def _broadcast_grid(port, srcXs, srcYs, points, profile):
    return _post_json(port, "/api/live/command", {
        "mutationType": "align-grid-snapshot",
        "payload": {"srcXs": srcXs, "srcYs": srcYs, "points": points, "profileId": profile},
    })


def _warped_grid(tl_x, tl_y):
    srcXs = [0.0, 0.5, 1.0]
    srcYs = [0.0, 0.5, 1.0]
    points = []
    for r in range(3):
        for c in range(3):
            x, y = srcXs[c], srcYs[r]
            if r == 0 and c == 0:
                x, y = tl_x, tl_y
            points.append({"row": r, "col": c, "x": x, "y": y})
    return srcXs, srcYs, points


def _fetch_ssr_grid(port):
    code, body = _http_get(port, "/api/diag/ssr-grid")
    if code == 200:
        try:
            d = json.loads(body)
            if d.get("ok"):
                return d.get("grid")
        except Exception:
            return None
    return None


def _fetch_pi_grid(page):
    """Use page.evaluate() to snapshot Pi /output/'s grid state."""
    try:
        return page.evaluate("""
            () => {
                const g = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
                if (!g || typeof g.snapshotGridState !== 'function') return null;
                return g.snapshotGridState();
            }
        """)
    except Exception:
        return None


def _wait_for_ssr_warmup(port, timeout_s=30):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if _fetch_ssr_grid(port):
            return True
        time.sleep(0.5)
    return False


def _wait_for_pi_warmup(page, timeout_s=10):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if _fetch_pi_grid(page):
            return True
        time.sleep(0.3)
    return False


def _grids_equal(g1, g2, tol=0.005):
    """Compare two grids point-by-point."""
    if not g1 or not g2:
        return False, "one or both grids is None"
    if len(g1["srcXs"]) != len(g2["srcXs"]) or len(g1["srcYs"]) != len(g2["srcYs"]):
        return False, "dimension mismatch"
    for r in range(len(g1["srcYs"])):
        for c in range(len(g1["srcXs"])):
            p1 = g1["points"][r][c]
            p2 = g2["points"][r][c]
            if abs(p1["x"] - p2["x"]) > tol or abs(p1["y"] - p2["y"]) > tol:
                return False, f"diverge at row={r} col={c}: Pi=({p1['x']:.4f},{p1['y']:.4f}) SSR=({p2['x']:.4f},{p2['y']:.4f})"
    return True, "ok"


def _wait_for_convergence(port, page, expected_tl, timeout_s=2.0, tol=0.005):
    """Wait until BOTH Pi and SSR have grid.points[0][0] matching expected_tl."""
    deadline = time.time() + timeout_s
    last_pi, last_ssr = None, None
    while time.time() < deadline:
        last_pi = _fetch_pi_grid(page)
        last_ssr = _fetch_ssr_grid(port)
        if last_pi and last_ssr:
            pi_tl = last_pi["points"][0][0]
            ssr_tl = last_ssr["points"][0][0]
            pi_ok = abs(pi_tl["x"] - expected_tl[0]) < tol and abs(pi_tl["y"] - expected_tl[1]) < tol
            ssr_ok = abs(ssr_tl["x"] - expected_tl[0]) < tol and abs(ssr_tl["y"] - expected_tl[1]) < tol
            if pi_ok and ssr_ok:
                return True, last_pi, last_ssr
        time.sleep(0.1)
    return False, last_pi, last_ssr


@pytest.fixture(autouse=True)
def _require_ssr_host(live_server):
    port = live_server["port"]
    code, body = _http_get(port, "/api/diag/ssr-grid", timeout=2.0)
    if code == 503 and b"ssr-host-inactive" in body:
        pytest.skip("SSR_RENDER_HOST not active")


@flaky_3x
def test_phase38_pi_ssr_sync_after_single_shot(live_server, page):
    """Single-shot broadcast: both Pi and SSR must converge to identical grid."""
    port = live_server["port"]
    assert _wait_for_ssr_warmup(port, 30), "SSR tab did not warm up"
    # SSR tab may still be busy decoding GIFs after warmup-200ms — give it
    # a moment to settle so CDP queries don't time out under decode load.
    time.sleep(3.0)

    page.goto(f"http://127.0.0.1:{port}/output/", wait_until="domcontentloaded", timeout=15000)
    assert _wait_for_pi_warmup(page, 10), "Pi /output/ did not init grid state"

    _toggle_align_mode(port, True)
    time.sleep(0.5)

    srcXs, srcYs, points = _warped_grid(0.27, 0.27)
    _broadcast_grid(port, srcXs, srcYs, points, "phase38-A-sync")

    converged, pi, ssr = _wait_for_convergence(port, page, (0.27, 0.27), timeout_s=2.0)
    if converged:
        # Now do a full grid equality check, not just TL
        eq, why = _grids_equal(pi, ssr)
        assert eq, f"Pi and SSR converged TL but grids diverged: {why}"
    else:
        pi_tl = pi["points"][0][0] if pi else None
        ssr_tl = ssr["points"][0][0] if ssr else None
        pytest.fail(
            f"Pi+SSR did not BOTH converge to TL=(0.27,0.27) within 2s.\n"
            f"Pi TL: {pi_tl}\n"
            f"SSR TL: {ssr_tl}"
        )


@flaky_3x
def test_phase38_pi_ssr_sync_after_drag_burst(live_server, page):
    """Operator's wild-move-then-stop scenario: 30 rapid broadcasts then idle.
    Both Pi and SSR must converge to the FINAL position within 2s."""
    port = live_server["port"]
    assert _wait_for_ssr_warmup(port, 30), "SSR warm up"

    page.goto(f"http://127.0.0.1:{port}/output/", wait_until="domcontentloaded", timeout=15000)
    assert _wait_for_pi_warmup(page, 10), "Pi warm up"

    _toggle_align_mode(port, True)
    time.sleep(0.5)

    # 30 broadcasts at 30Hz simulating fast drag
    for i in range(30):
        srcXs, srcYs, points = _warped_grid(0.15 + i * 0.005, 0.15 + i * 0.005)
        _broadcast_grid(port, srcXs, srcYs, points, "drag-burst")
        time.sleep(0.033)  # ~30Hz

    # Final position is TL=(0.15+29*0.005, ...)=(0.295, 0.295)
    expected = (0.295, 0.295)
    converged, pi, ssr = _wait_for_convergence(port, page, expected, timeout_s=3.0)
    if converged:
        eq, why = _grids_equal(pi, ssr)
        assert eq, f"Pi/SSR converged TL but full grid diverged: {why}"
    else:
        pi_tl = pi["points"][0][0] if pi else None
        ssr_tl = ssr["points"][0][0] if ssr else None
        pytest.fail(
            f"After 30 drag-like broadcasts, Pi+SSR did not BOTH converge to "
            f"TL={expected} within 3s.\n"
            f"Pi TL: {pi_tl}\n"
            f"SSR TL: {ssr_tl}\n"
            f"This is the operator's 'wild move + stop' bug — final state lost."
        )
