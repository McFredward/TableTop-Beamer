"""Phase 38 — CDP-based ground-truth test for SSR tab grid state.

The phase 36-iter2 bug "single-shot profile-load doesn't propagate to the
streamed video" was previously diagnosed via console.log scraping, but:

1. The RECV log was rate-limited (first 5 + every 30th) so single-shot
   mutations after a drag burst appeared to be "missing" when they were
   actually applied — just not logged. Phase 38 commit 1f7582e removed
   that rate limit.

2. Even unrated, console.log → stderr buffering can hide writes for
   hundreds of milliseconds, making log-counting non-deterministic.

This test bypasses console.log entirely. It queries the SSR Chromium tab's
runtime state directly via CDP through the new /api/diag/ssr-grid endpoint.

Three regression rails:

A. Baseline propagation — a single-shot broadcast applied to a fresh,
   idle SSR tab MUST result in matching grid.points within 1s.

B. Post-burst single-shot — after 20 drag broadcasts at 20Hz, a single
   profile-load broadcast MUST still propagate to the SSR tab within 2s.
   This is the operator's exact repro.

C. ESC reset propagation — broadcast an identity grid (the ESC reset
   equivalent) and verify the SSR tab snaps back to identity. Bug 4.
"""
from __future__ import annotations
import json, time, urllib.request, urllib.error
import pytest
from _flake_retry import flaky_3x


def _http_get(port: int, path: str, timeout: float = 5.0) -> tuple[int, str]:
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{port}{path}", timeout=timeout,
        ) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def _post_json(port: int, path: str, body: dict) -> tuple[int, str]:
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


def _toggle_align_mode(port: int, on: bool) -> None:
    code, _ = _post_json(port, "/api/live/command", {
        "mutationType": "context-update",
        "payload": {"alignMode": bool(on)},
    })
    assert code in (200, 202), f"context-update failed: {code}"


def _broadcast_grid(port: int, srcXs, srcYs, points, profile: str) -> tuple[int, str]:
    return _post_json(port, "/api/live/command", {
        "mutationType": "align-grid-snapshot",
        "payload": {
            "srcXs": srcXs,
            "srcYs": srcYs,
            "points": points,
            "profileId": profile,
        },
    })


def _identity_grid():
    """Identity 3x3 grid — points coincide with srcXs/srcYs (no warp)."""
    srcXs = [0.0, 0.5, 1.0]
    srcYs = [0.0, 0.5, 1.0]
    points = []
    for r in range(3):
        for c in range(3):
            points.append({"row": r, "col": c, "x": srcXs[c], "y": srcYs[r]})
    return srcXs, srcYs, points


def _warped_grid(tl_x: float, tl_y: float):
    """3x3 grid with TL corner pulled to (tl_x, tl_y)."""
    srcXs = [0.0, 0.5, 1.0]
    srcYs = [0.0, 0.5, 1.0]
    points = []
    for r in range(3):
        for c in range(3):
            x = srcXs[c]
            y = srcYs[r]
            if r == 0 and c == 0:
                x = tl_x
                y = tl_y
            points.append({"row": r, "col": c, "x": x, "y": y})
    return srcXs, srcYs, points


def _fetch_ssr_grid(port: int, retries: int = 10):
    """Fetch the SSR tab's grid state. Returns dict {srcXs, srcYs, points} or None."""
    for _ in range(retries):
        code, body = _http_get(port, "/api/diag/ssr-grid")
        if code == 200:
            data = json.loads(body)
            if data.get("ok") and data.get("grid"):
                return data["grid"]
        time.sleep(0.3)
    return None


def _wait_for_ssr_grid_match(port: int, expected_tl, timeout_s: float = 3.0,
                              tol: float = 0.005) -> tuple[bool, dict | None]:
    """Poll the SSR tab's grid until grid.points[0][0] matches expected_tl
    (within tol) OR timeout. Returns (matched, last_grid)."""
    deadline = time.time() + timeout_s
    last_grid = None
    while time.time() < deadline:
        grid = _fetch_ssr_grid(port, retries=1)
        if grid:
            last_grid = grid
            tl = grid["points"][0][0]
            if abs(tl["x"] - expected_tl[0]) < tol and abs(tl["y"] - expected_tl[1]) < tol:
                return True, grid
        time.sleep(0.1)
    return False, last_grid


def _wait_for_ssr_warmup(port: int, timeout_s: float = 30.0) -> bool:
    """Wait until the SSR tab is responsive on /api/diag/ssr-grid. The SSR tab
    needs time to: (a) start Chromium, (b) attach CDP, (c) load /ssr, (d) init
    the grid-state module. On a fresh server boot this takes 5-15s."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        code, body = _http_get(port, "/api/diag/ssr-grid", timeout=2.0)
        if code == 200:
            try:
                data = json.loads(body)
                if data.get("ok") and data.get("grid"):
                    return True
            except Exception:
                pass
        time.sleep(0.5)
    return False


@pytest.fixture(autouse=True)
def _require_ssr_host(live_server):
    """Skip this whole file when SSR_RENDER_HOST!=1 — the test fundamentally
    relies on the SSR Chromium tab being live."""
    port = live_server["port"]
    code, body = _http_get(port, "/api/diag/ssr-grid", timeout=2.0)
    if code == 503 and "ssr-host-inactive" in body:
        pytest.skip("SSR_RENDER_HOST not active — Phase 38 CDP test requires SSR tab")


@flaky_3x
def test_phase38_A_baseline_propagation(live_server, page):
    """A — single-shot broadcast on a quiescent SSR tab must propagate."""
    port = live_server["port"]
    assert _wait_for_ssr_warmup(port, timeout_s=30), "SSR tab did not warm up"

    _toggle_align_mode(port, True)
    time.sleep(0.5)

    # Drain initial state by waiting an idle moment, then capturing baseline
    baseline = _fetch_ssr_grid(port)
    assert baseline is not None, "could not read baseline SSR grid"

    # Pull TL corner to (0.27, 0.31) — a unique target unlikely to collide
    srcXs, srcYs, points = _warped_grid(0.27, 0.31)
    code, _ = _broadcast_grid(port, srcXs, srcYs, points, "phase38-A-baseline")
    assert code in (200, 202), f"broadcast rejected: {code}"

    matched, last = _wait_for_ssr_grid_match(port, (0.27, 0.31), timeout_s=3.0)
    assert matched, (
        f"SSR tab grid did NOT match expected TL=(0.27,0.31) after broadcast.\n"
        f"Last observed grid TL: {last['points'][0][0] if last else 'unreadable'}\n"
        f"This means single-shot broadcasts do NOT propagate to the SSR tab "
        f"at the apply layer. Bug 2 ROOT CAUSE."
    )


@flaky_3x
def test_phase38_B_post_burst_single_shot(live_server, page):
    """B — operator's exact repro: 20 drag broadcasts followed by a single-shot
    profile-load. The profile-load MUST propagate (no backlog starvation)."""
    port = live_server["port"]
    assert _wait_for_ssr_warmup(port, timeout_s=30), "SSR tab did not warm up"

    _toggle_align_mode(port, True)
    time.sleep(0.5)

    # 20 drag-like broadcasts at 20Hz — mimics operator's drag gesture
    for i in range(20):
        srcXs, srcYs, points = _warped_grid(0.12 + i * 0.005, 0.12 + i * 0.005)
        code, _ = _broadcast_grid(port, srcXs, srcYs, points, "drag-burst")
        assert code in (200, 202), f"drag broadcast #{i} rejected: {code}"
        time.sleep(0.05)

    # Let the burst settle a moment
    time.sleep(0.6)

    # NOW the operator's profile-load — pick a UNIQUE TL no drag had
    srcXs, srcYs, points = _warped_grid(0.42, 0.38)
    code, _ = _broadcast_grid(port, srcXs, srcYs, points, "phase38-B-profile-load")
    assert code in (200, 202), f"profile-load broadcast rejected: {code}"

    matched, last = _wait_for_ssr_grid_match(port, (0.42, 0.38), timeout_s=3.0)
    assert matched, (
        f"After 20 drag broadcasts + 1 profile-load, SSR tab grid did NOT "
        f"reflect the profile-load TL=(0.42,0.38).\n"
        f"Last observed grid TL: {last['points'][0][0] if last else 'unreadable'}\n"
        f"This is the operator's exact bug 2 scenario."
    )


@flaky_3x
def test_phase38_C_identity_reset_propagation(live_server, page):
    """C — ESC reset equivalent: warp first, then broadcast identity grid.
    The SSR tab MUST snap back to identity (no double-ESC needed). Bug 4."""
    port = live_server["port"]
    assert _wait_for_ssr_warmup(port, timeout_s=30), "SSR tab did not warm up"

    _toggle_align_mode(port, True)
    time.sleep(0.5)

    # First warp
    srcXs, srcYs, points = _warped_grid(0.31, 0.29)
    code, _ = _broadcast_grid(port, srcXs, srcYs, points, "phase38-C-pre-warp")
    assert code in (200, 202)
    matched, _ = _wait_for_ssr_grid_match(port, (0.31, 0.29), timeout_s=3.0)
    assert matched, "pre-warp didn't apply"

    # Now the "ESC reset" — broadcast identity grid
    srcXs, srcYs, points = _identity_grid()
    code, _ = _broadcast_grid(port, srcXs, srcYs, points, "phase38-C-reset")
    assert code in (200, 202)

    matched, last = _wait_for_ssr_grid_match(port, (0.0, 0.0), timeout_s=3.0)
    assert matched, (
        f"After ESC reset (identity grid broadcast), SSR tab did NOT snap "
        f"to identity. Last observed TL: "
        f"{last['points'][0][0] if last else 'unreadable'}\n"
        f"Bug 4: single ESC press not propagating; operator must press ESC twice."
    )
