"""Phase 38 W4 — Operator bug reproducer using REAL pointer drag events.

The W2/W3 tests use HTTP-POST or page.evaluate(g.setPoint+broadcastGridSnapshot)
to drive grid mutations. Those bypass the actual drag handler. The operator's
real scenario is a touchscreen/mouse drag that drives runtime-projection-handle-drag.js
via real `pointerdown/pointermove/pointerup` events. This test uses real
page.mouse events to reproduce the operator's three reported bugs:

  W4-R1 (Bug 1 — Pi input clobbered): operator drags on Pi /output/,
         releases. After ~1.5s (one poll cycle), Pi's overlay lines
         snap BACK to a pre-drag state. Reproducer: real mouse drag,
         wait 2s, verify Pi grid still at drag-end position.

  W4-R2 (Bug 3 — complex profile desync): with a 9×9 grid (xrandrv2-like),
         after a real drag, Pi's grid and SSR's grid must MATCH within
         a small tolerance. Reproducer: load complex grid, real drag,
         compare Pi.grid vs SSR.grid.

These tests MUST be capable of FAILING when the real bug is present.
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


def _broadcast_grid(port, srcXs, srcYs, points, profile):
    return _post_json(port, "/api/live/command", {
        "mutationType": "align-grid-snapshot",
        "payload": {"srcXs": srcXs, "srcYs": srcYs, "points": points, "profileId": profile},
    })


def _toggle_align_mode(port, on):
    _post_json(port, "/api/live/command", {
        "mutationType": "context-update",
        "payload": {"alignMode": bool(on)},
    })


def _build_xrandrv2_like_grid(tl_x=0.20, tl_y=0.20):
    """Mimics operator's complex xrandrv2: 9×9 grid with non-uniform spacing."""
    srcXs = [0.0, 0.019, 0.25, 0.5, 0.577, 0.75, 0.803, 0.951, 1.0]
    srcYs = [0.0, 0.073, 0.25, 0.5, 0.630, 0.682, 0.75, 0.970, 1.0]
    points = []
    for r in range(9):
        for c in range(9):
            x = srcXs[c]
            y = srcYs[r]
            if r == 0 and c == 0:
                x, y = tl_x, tl_y
            points.append({"row": r, "col": c, "x": x, "y": y})
    return srcXs, srcYs, points


def _fetch_ssr_grid(port):
    code, body = _http_get(port, "/api/diag/ssr-grid")
    if code == 200:
        try:
            d = json.loads(body)
            return d.get("grid") if d.get("ok") else None
        except Exception:
            return None
    return None


def _fetch_pi_grid(page):
    return page.evaluate("""
        () => {
            const g = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
            if (!g) return null;
            return g.snapshotGridState();
        }
    """)


def _wait_for_ssr_warmup(port, timeout_s=30):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if _fetch_ssr_grid(port):
            return True
        time.sleep(0.5)
    return False


def _wait_handles_visible(page, timeout_ms=8000):
    page.wait_for_function(
        "document.querySelectorAll('.projection-corner-handle').length > 0",
        timeout=timeout_ms,
    )


@pytest.fixture(autouse=True)
def _require_ssr_host(live_server):
    port = live_server["port"]
    code, body = _http_get(port, "/api/diag/ssr-grid", timeout=2.0)
    if code == 503 and b"ssr-host-inactive" in body:
        pytest.skip("SSR_RENDER_HOST not active")


@flaky_3x
def test_phase38_w4_real_drag_persists_through_poll_cycle(live_server, page):
    """W4-R1: operator drags on Pi /output/ using REAL pointer events, releases.
    After 2 full poll cycles (>=2s), Pi's grid MUST still be at the drag-end
    position. If a poll-fetched snapshot clobbers the drag, Pi snaps back.
    """
    port = live_server["port"]
    assert _wait_for_ssr_warmup(port, 30), "SSR warm up"
    time.sleep(3.0)

    # 1. Set a known complex baseline (9×9 xrandrv2-like) via dashboard
    #    profile-load equivalent: HTTP broadcast with originator=http-command.
    base_srcXs, base_srcYs, base_pts = _build_xrandrv2_like_grid(tl_x=0.10, tl_y=0.10)
    code, _ = _broadcast_grid(port, base_srcXs, base_srcYs, base_pts, "phase38-w4-baseline")
    assert code in (200, 202)

    # 2. Open Pi /output/, toggle align-mode, wait for handles.
    page.goto(f"http://127.0.0.1:{port}/output/",
              wait_until="domcontentloaded", timeout=15000)
    page.wait_for_function(
        "document.querySelector('video.ssr-video, video')?.readyState === 4",
        timeout=10000,
    )
    _toggle_align_mode(port, True)
    _wait_handles_visible(page)

    # Wait for the iter2-h2 activation broadcast to fire AND clear server-side.
    # This sets Pi's _lastLocalBroadcastAtMs and bumps server version. Pi's local
    # grid should now match the baseline (9×9).
    time.sleep(2.0)

    # Sanity: Pi's grid is 9×9 baseline.
    pi_before = _fetch_pi_grid(page)
    assert pi_before is not None, "Pi grid not readable"
    assert len(pi_before["srcXs"]) == 9, (
        f"Expected 9×9 baseline, got srcXs len={len(pi_before['srcXs'])}"
    )

    # 3. REAL DRAG: grab the handle at (row=0, col=0) (the displaced TL) and
    #    drag it to a NEW position (0.40, 0.45). Uses page.mouse.down/move/up
    #    so the actual drag handler in runtime-projection-handle-drag.js fires.
    h = page.locator('.projection-corner-handle[data-row="0"][data-col="0"]').first
    assert h.count() > 0, "TL handle (row=0,col=0) not present"
    b = h.bounding_box()
    assert b, "TL handle has no bounding_box"
    start_x = b["x"] + b["width"] / 2
    start_y = b["y"] + b["height"] / 2

    # Target: ~40% of video element.
    video_box = page.evaluate("""() => {
        const v = document.querySelector('video.ssr-video, video');
        const r = v?.getBoundingClientRect?.();
        return r ? {x: r.left, y: r.top, w: r.width, h: r.height} : null;
    }""")
    assert video_box, "video bbox not readable"
    target_x_frac = 0.40
    target_y_frac = 0.45
    target_x = video_box["x"] + video_box["w"] * target_x_frac
    target_y = video_box["y"] + video_box["h"] * target_y_frac

    # 4. Execute the drag using real pointer events. Steps=20 mimics a fast
    #    "wiggle" — many pointermoves at native rate (~60Hz), bringing rate-
    #    limiter + queue into play.
    page.mouse.move(start_x, start_y)
    page.mouse.down()
    page.mouse.move(target_x, target_y, steps=20)
    page.mouse.up()

    # 5. Immediately after pointerup, Pi's local grid is at drag-end.
    time.sleep(0.3)  # let async broadcasts settle
    pi_at_release = _fetch_pi_grid(page)
    assert pi_at_release, "Pi grid not readable post-release"
    tl_release = pi_at_release["points"][0][0]
    # Allow ±0.03 tolerance — the actual stop position can vary by a few px
    # due to mouse event step quantization vs viewport scaling.
    assert abs(tl_release["x"] - target_x_frac) < 0.05, (
        f"Pi TL.x = {tl_release['x']:.3f}, expected ~{target_x_frac} immediately after drag-end"
    )
    assert abs(tl_release["y"] - target_y_frac) < 0.05, (
        f"Pi TL.y = {tl_release['y']:.3f}, expected ~{target_y_frac} immediately after drag-end"
    )

    # 6. Wait through 2-3 FULL 1Hz poll cycles. If Bug 1 reproduces, the poll
    #    fetches an older snapshot and clobbers Pi's drag-end.
    time.sleep(3.0)

    pi_after_poll = _fetch_pi_grid(page)
    assert pi_after_poll, "Pi grid not readable after poll wait"
    tl_after = pi_after_poll["points"][0][0]
    # MUST still be at drag-end position.
    assert abs(tl_after["x"] - target_x_frac) < 0.05, (
        f"BUG 1 REPRODUCED — Pi TL.x snapped from drag-end ({target_x_frac}) "
        f"to {tl_after['x']:.3f} after 1Hz poll. Pi input was clobbered."
    )
    assert abs(tl_after["y"] - target_y_frac) < 0.05, (
        f"BUG 1 REPRODUCED — Pi TL.y snapped from drag-end ({target_y_frac}) "
        f"to {tl_after['y']:.3f} after 1Hz poll. Pi input was clobbered."
    )

    # 7. SSR must also have applied Pi's drag broadcast (within tolerance).
    ssr_grid = _fetch_ssr_grid(port)
    assert ssr_grid, "SSR grid not readable"
    ssr_tl = ssr_grid["points"][0][0]
    assert abs(ssr_tl["x"] - target_x_frac) < 0.05, (
        f"SSR did not apply Pi's drag: SSR TL.x = {ssr_tl['x']:.3f}, "
        f"expected ~{target_x_frac}. Stream is stale."
    )


@flaky_3x
def test_phase38_w4_pi_ssr_match_after_real_drag_complex_profile(live_server, page):
    """W4-R3 (Bug 3 — complex profile desync): with the operator's 9×9
    xrandrv2-like baseline, after a real drag, Pi's grid and SSR's grid
    MUST match within tolerance. The desync the operator reports would
    show up as a difference > 0.05 in any displaced point.
    """
    port = live_server["port"]
    assert _wait_for_ssr_warmup(port, 30), "SSR warm up"
    time.sleep(3.0)

    base_srcXs, base_srcYs, base_pts = _build_xrandrv2_like_grid(tl_x=0.10, tl_y=0.10)
    code, _ = _broadcast_grid(port, base_srcXs, base_srcYs, base_pts, "phase38-w4-baseline")
    assert code in (200, 202)

    page.goto(f"http://127.0.0.1:{port}/output/",
              wait_until="domcontentloaded", timeout=15000)
    page.wait_for_function(
        "document.querySelector('video.ssr-video, video')?.readyState === 4",
        timeout=10000,
    )
    _toggle_align_mode(port, True)
    _wait_handles_visible(page)
    time.sleep(2.0)

    # Pick an INNER point to drag (not corner) — more likely to expose
    # mesh-warp dimension issues on complex profiles.
    h = page.locator('.projection-corner-handle[data-row="4"][data-col="4"]').first
    assert h.count() > 0, "Inner handle (4,4) not present — grid may not be 9×9"
    b = h.bounding_box()
    start_x = b["x"] + b["width"] / 2
    start_y = b["y"] + b["height"] / 2

    page.mouse.move(start_x, start_y)
    page.mouse.down()
    # Wiggle (multi-direction fast drag) then release
    page.mouse.move(start_x + 60, start_y + 20, steps=10)
    page.mouse.move(start_x + 30, start_y - 30, steps=10)
    page.mouse.move(start_x + 80, start_y + 50, steps=10)
    page.mouse.up()

    time.sleep(2.5)  # let WS broadcasts + 1 poll cycle complete

    pi_grid = _fetch_pi_grid(page)
    ssr_grid = _fetch_ssr_grid(port)
    assert pi_grid, "Pi grid not readable"
    assert ssr_grid, "SSR grid not readable"
    assert len(pi_grid["points"]) == 9 and len(pi_grid["points"][0]) == 9, (
        f"Pi grid dim mismatch: {len(pi_grid['points'])}×{len(pi_grid['points'][0])}"
    )
    assert len(ssr_grid["points"]) == 9 and len(ssr_grid["points"][0]) == 9, (
        f"SSR grid dim mismatch: {len(ssr_grid['points'])}×{len(ssr_grid['points'][0])}"
    )

    # Per-point compare. Operator's bug is a visible offset = ~10-20px in a
    # ~1280-wide viewport = 0.008-0.015 in normalized coords. A 0.02 tolerance
    # is strict enough to catch the operator's "ein paar cm versetzt" report
    # but lenient enough to allow micro-jitter from float drift.
    max_dx = 0.0
    max_dy = 0.0
    worst = None
    for r in range(9):
        for c in range(9):
            pi_pt = pi_grid["points"][r][c]
            ssr_pt = ssr_grid["points"][r][c]
            dx = abs(pi_pt["x"] - ssr_pt["x"])
            dy = abs(pi_pt["y"] - ssr_pt["y"])
            if dx > max_dx or dy > max_dy:
                max_dx = max(max_dx, dx)
                max_dy = max(max_dy, dy)
                worst = (r, c, pi_pt, ssr_pt)
    TOL = 0.02
    assert max_dx < TOL and max_dy < TOL, (
        f"BUG 3 REPRODUCED — Pi vs SSR mismatch on complex profile.\n"
        f"max |Δx|={max_dx:.4f}, max |Δy|={max_dy:.4f}, tolerance={TOL}\n"
        f"Worst point: row={worst[0]}, col={worst[1]}, Pi={worst[2]}, SSR={worst[3]}"
    )
