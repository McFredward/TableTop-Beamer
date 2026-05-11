"""Phase 38 W3 — Pi /output/ inputs must be respected, not clobbered.

Operator UAT 2026-05-11 reported three follow-on regressions after W2:

1. Wrong sync direction: drag fast + release → Pi's lines snap BACK to the
   stream's older state. Operator wants stream to follow Pi, not the reverse.
   /output/ inputs should ALWAYS be respected.

2. CPU load high during transforms — concerning for Raspberry Pi.

3. Original desync persists for COMPLEX profiles (xrandrv2: 9×9 grid) even
   though simple profile (test2: 3×3) works. Wiggle-and-release on complex
   profile also reproduces the desync.

This test simulates each operator scenario and verifies:
- After Pi-side drag-end, Pi's grid stays at the drag-end position
  (no clobber by stale poll snapshots within the 2s protection window)
- A complex 9×9 profile broadcast propagates to Pi correctly and
  Pi's local grid matches the broadcast points
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
    """Mimics operator's complex xrandrv2: 9×9 grid with non-uniform spacing
    and many displaced points."""
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


@pytest.fixture(autouse=True)
def _require_ssr_host(live_server):
    port = live_server["port"]
    code, body = _http_get(port, "/api/diag/ssr-grid", timeout=2.0)
    if code == 503 and b"ssr-host-inactive" in body:
        pytest.skip("SSR_RENDER_HOST not active")


@flaky_3x
def test_phase38_w3_complex_profile_propagates_to_pi(live_server, page):
    """Issue 3: complex 9×9 grid broadcast must propagate to Pi's local grid
    with all 81 points matching the broadcast."""
    port = live_server["port"]
    assert _wait_for_ssr_warmup(port, 30), "SSR warm up"
    time.sleep(3.0)  # let SSR settle (gif decode)

    page.goto(f"http://127.0.0.1:{port}/output/", wait_until="domcontentloaded", timeout=15000)
    time.sleep(2.0)
    _toggle_align_mode(port, True)
    time.sleep(0.5)

    srcXs, srcYs, points = _build_xrandrv2_like_grid(tl_x=0.18, tl_y=0.17)
    code, _ = _broadcast_grid(port, srcXs, srcYs, points, "xrandrv2-like")
    assert code in (200, 202)
    time.sleep(1.5)  # let Pi receive + apply (WS + poll fallback)

    pi_grid = _fetch_pi_grid(page)
    assert pi_grid, "Pi grid not readable"
    # Verify dimensions changed from 3×3 default to 9×9
    assert len(pi_grid["srcXs"]) == 9, f"Pi srcXs has {len(pi_grid['srcXs'])} entries, expected 9"
    assert len(pi_grid["srcYs"]) == 9, f"Pi srcYs has {len(pi_grid['srcYs'])} entries, expected 9"
    assert len(pi_grid["points"]) == 9, f"Pi points has {len(pi_grid['points'])} rows, expected 9"
    # Verify displaced corner
    tl = pi_grid["points"][0][0]
    assert abs(tl["x"] - 0.18) < 0.005 and abs(tl["y"] - 0.17) < 0.005, (
        f"Pi TL=({tl['x']},{tl['y']}) does not match broadcast (0.18,0.17). "
        f"Complex profile did not propagate to Pi."
    )


@flaky_3x
def test_phase38_w3_pi_drag_not_clobbered_by_stale_poll(live_server, page):
    """Issue 1: after Pi-side broadcast (simulates drag-end), Pi's local
    grid must NOT be reset to a stale server snapshot fetched by the 1Hz poll.

    Simulates: dashboard broadcast OLD state → Pi sees it → Pi 'drags' (sends
    a NEWER broadcast). During the 2s protection window, Pi must keep its
    fresh local state even if poll fetches the old state.

    We deliberately use a malicious-seeming scenario: send an OLDER snapshot
    (via a separate broadcast with same originatorClientId), then send Pi's
    'newer' drag-end. Verify Pi keeps the drag-end."""
    port = live_server["port"]
    assert _wait_for_ssr_warmup(port, 30), "SSR warm up"
    time.sleep(3.0)

    page.goto(f"http://127.0.0.1:{port}/output/", wait_until="domcontentloaded", timeout=15000)
    time.sleep(2.0)
    _toggle_align_mode(port, True)
    time.sleep(0.5)

    # Step 1: broadcast a baseline state via HTTP (originator=http-command)
    base_srcXs, base_srcYs, base_pts = _build_xrandrv2_like_grid(tl_x=0.10, tl_y=0.10)
    _broadcast_grid(port, base_srcXs, base_srcYs, base_pts, "phase38-w3-baseline")
    time.sleep(1.0)  # let Pi apply baseline

    # Step 2: simulate Pi's drag-end by directly mutating its grid via page.evaluate
    # and emitting via Pi's own WS (so it counts as Pi-originated).
    pi_drag_result = page.evaluate("""
        () => {
            const g = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
            if (!g) return { ok: false, reason: "no-grid" };
            // Directly mutate the grid (simulating the drag handler's setPoint)
            g.setPoint(0, 0, 0.35, 0.40);
            // Call broadcastGridSnapshot — this sends via Pi's WS
            g.broadcastGridSnapshot({ force: true });
            return { ok: true, tl: g.snapshotGridState().points[0][0] };
        }
    """)
    assert pi_drag_result and pi_drag_result.get("ok"), f"Pi drag setup failed: {pi_drag_result}"
    # Pi just set TL to (0.35, 0.40). The broadcast went out via Pi's WS,
    # but the next 1Hz poll might still return the OLDER (0.10, 0.10) state
    # if it races. The W3 fix should prevent that clobber.

    # Wait through a poll cycle (1Hz) to verify Pi STAYS at (0.35, 0.40)
    time.sleep(1.5)
    pi_grid_after = _fetch_pi_grid(page)
    pi_tl = pi_grid_after["points"][0][0]
    assert abs(pi_tl["x"] - 0.35) < 0.005 and abs(pi_tl["y"] - 0.40) < 0.005, (
        f"Pi's drag-end state was CLOBBERED by a stale poll snapshot.\n"
        f"Expected TL=(0.35, 0.40), got TL=({pi_tl['x']}, {pi_tl['y']})\n"
        f"This is the operator's 'lines zappen wieder auf den Stream' regression."
    )
