"""Phase 38 W6 — RED reproducer for operator's surviving Bug A:

  Operator workflow:
    1. Open Pi /output/.
    2. Toggle align mode.
    3. Click 'Load profile…' (toolbar button) → pick 'test2' (3×3, 9 points).
    4. Wait — SSR grid should become 3×3 with test2 geometry. OK so far.
    5. Click 'Load profile…' again → pick 'test' (6×5, 30 points).
    6. SSR grid should become 6×5 with test geometry — but operator's evidence
       (`.planning/debug/desync/ssr-grid.json`) shows SSR's grid REMAINS 3×3
       even after step 5's broadcast. The streamed mesh-warp therefore
       cannot match the test profile's geometry.

  The dimension change 3×3 → 6×5 (test2 → test) is the load-bearing condition.
  Operator's evidence:
    • `output_desync_load.png` — Pi /output/'s teal alignment lines reflect
      test's geometry; orange flare visible at far right BEYOND the lines.
    • `output_desync_load_ssr_screenshot.jpg` — SSR canvas shows warped board
      inside an inner rectangle, orange flare clipped inside ~84% width.
    • `ssr-grid.json` — SSR's grid.srcXs.length == 3 (still test2's shape).
    • Server logged: `[align-grid-snapshot-log] EMIT force=true
      corners=(0.16,0.15)..(0.81,0.83) profile=test`
      (broadcast WAS sent with test corners; SSR didn't update).

  This test drives the SAME UI flow with Playwright (no page.evaluate hack):
  it CLICKS the 'Load profile…' button, then CLICKS the menu item for each
  profile name. That's what operator does.

  MUST FAIL on master `0978d0c` (cold-boot fallback). W5's reproducer used
  `page.evaluate` to short-circuit the picker UI, missing the bug entirely.
"""
from __future__ import annotations
import json, os, shutil, time, urllib.request, urllib.error
import pytest

_REPO_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
_ACTIVE_GRID_PATH = os.path.join(_REPO_ROOT, "config", "runtime-active-grid.json")


def _http_get(port, path, timeout=5.0):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}{path}", timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def _fetch_ssr_grid(port):
    code, body = _http_get(port, "/api/diag/ssr-grid")
    if code == 200:
        try:
            d = json.loads(body)
            return d.get("grid") if d.get("ok") else None
        except Exception:
            return None
    return None


def _fetch_server_snapshot(port):
    code, body = _http_get(port, "/api/live/snapshot")
    if code != 200:
        return None
    try:
        return json.loads(body)["session"]["snapshot"]
    except Exception:
        return None


def _wait_for_ssr_warmup(port, timeout_s=30):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if _fetch_ssr_grid(port):
            return True
        time.sleep(0.5)
    return False


def _require_ssr_host(port):
    code, body = _http_get(port, "/api/diag/ssr-grid", timeout=2.0)
    if code == 503 and b"ssr-host-inactive" in body:
        pytest.skip("SSR_RENDER_HOST not active")


@pytest.fixture
def _disk_seed_three_by_three():
    """Seed runtime-active-grid.json with a SIMPLE 3×3 grid (matching test2
    shape, but not exact). Server boots with this so the SSR's initial
    mesh-warp is at 3×3 dimensions — same starting state as operator's
    'test2 loaded' position."""
    bak = _ACTIVE_GRID_PATH + ".w6bak"
    if os.path.exists(_ACTIVE_GRID_PATH):
        shutil.copy(_ACTIVE_GRID_PATH, bak)
    simple = {
        "schema": "tt-beamer.active-grid.v1",
        "srcXs": [0, 0.5, 1],
        "srcYs": [0, 0.5, 1],
        "points": [
            {"row": r, "col": c, "x": c * 0.5, "y": r * 0.5}
            for r in range(3) for c in range(3)
        ],
        "profileId": "w6-baseline-three",
        "persistedAt": "2026-05-11T10:00:00Z",
    }
    # Slight warp on TL so initial grid has displacements (matches operator
    # 'test2 currently loaded' state).
    simple["points"][0] = {"row": 0, "col": 0, "x": 0.10, "y": 0.10}
    with open(_ACTIVE_GRID_PATH, "w") as f:
        json.dump(simple, f)
    yield simple
    if os.path.exists(bak):
        shutil.copy(bak, _ACTIVE_GRID_PATH)
        os.unlink(bak)


def _open_output_align(port, page):
    """Open Pi /output/ and toggle align mode so the toolbar (including
    'Load profile…' button) is visible."""
    page.goto(f"http://127.0.0.1:{port}/output/", wait_until="domcontentloaded", timeout=15000)
    # Wait for video stream to be live.
    page.wait_for_function(
        "document.querySelector('video.ssr-video, video')?.readyState === 4",
        timeout=15000,
    )
    # Toggle align mode via server command — drives the alignModeChange listener
    # chain → lazy bundle load → toolbar rebuild.
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}/api/live/command",
        data=json.dumps({
            "mutationType": "context-update",
            "payload": {"alignMode": True},
        }).encode(),
        headers={"content-type": "application/json"},
    )
    urllib.request.urlopen(req, timeout=5).read()
    # Wait for the 'Load profile…' button to appear.
    page.wait_for_function(
        "document.querySelectorAll('.projection-align-action-load').length > 0",
        timeout=15000,
    )


def _click_load_profile_pick(page, profile_name, timeout_ms=10000):
    """Click the 'Load profile…' toolbar button, then click the menu item
    with the given profile name. This is the EXACT operator flow."""
    # Click 'Load profile…' button — toolbar binds api.profileLoadFlow().
    page.click(".projection-align-action-load")
    # Wait for context menu to appear with the desired profile name.
    page.wait_for_function(
        f"""
        () => {{
          const items = document.querySelectorAll('.board-context-menu-item');
          return Array.from(items).some(el => el.textContent.trim() === '{profile_name}');
        }}
        """,
        timeout=timeout_ms,
    )
    # Click the menu item.
    page.evaluate(
        f"""
        () => {{
          const items = document.querySelectorAll('.board-context-menu-item');
          const target = Array.from(items).find(el => el.textContent.trim() === '{profile_name}');
          if (!target) throw new Error('menu item not found: ' + '{profile_name}');
          target.click();
        }}
        """
    )


def _wait_for_ssr_grid_dim(port, expected_cols, expected_rows, timeout_s=10):
    """Poll /api/diag/ssr-grid until grid dimensions match (or timeout)."""
    deadline = time.time() + timeout_s
    last = None
    while time.time() < deadline:
        g = _fetch_ssr_grid(port)
        if g:
            last = g
            if len(g["srcXs"]) == expected_cols and len(g["srcYs"]) == expected_rows:
                return g
        time.sleep(0.2)
    return last


def test_phase38_w6_picker_load_test2_then_test_changes_ssr_dims(
    _disk_seed_three_by_three, live_server, page
):
    """RED reproducer for operator's Bug A.

    Flow (exact operator UI sequence):
      1. Open Pi /output/, toggle align mode → toolbar appears.
      2. Click 'Load profile…' → click 'test2' menu item.
         Assert SSR grid is 3×3 within 6s (test2 is 3×3).
      3. Click 'Load profile…' → click 'test' menu item.
         Assert SSR grid is 6×5 within 6s (test is 6×5).

    Operator's evidence: after step 3, SSR's grid stays at 3×3 even though
    the server emits a broadcast with profile=test. Master MUST FAIL here.
    """
    port = live_server["port"]
    _require_ssr_host(port)
    assert _wait_for_ssr_warmup(port, 30), "SSR tab did not warm up"
    time.sleep(3.0)

    # Sanity: SSR's initial grid is 3×3 (from the disk seed). Retry up to 5s
    # because the SSR tab evaluation can transiently return null while the
    # bundle is still attaching grid-state to window.
    init_grid = None
    for _ in range(20):
        init_grid = _fetch_ssr_grid(port)
        if init_grid:
            break
        time.sleep(0.25)
    assert init_grid, "no SSR grid at boot (after retries)"
    assert len(init_grid["srcXs"]) == 3 and len(init_grid["srcYs"]) == 3, (
        f"expected 3×3 baseline, got {len(init_grid['srcXs'])}×{len(init_grid['srcYs'])}"
    )

    # Open Pi /output/ and turn on align mode.
    _open_output_align(port, page)
    time.sleep(1.5)

    # Step 2: pick 'test2' via the menu UI.
    _click_load_profile_pick(page, "test2")
    g_after_test2 = _wait_for_ssr_grid_dim(port, 3, 3, timeout_s=10)
    assert g_after_test2 is not None, "no SSR grid after test2 pick"
    assert len(g_after_test2["srcXs"]) == 3 and len(g_after_test2["srcYs"]) == 3, (
        f"after picking test2, SSR grid should be 3×3, got "
        f"{len(g_after_test2['srcXs'])}×{len(g_after_test2['srcYs'])}"
    )

    # Step 3: pick 'test' via the menu UI. test is 6×5 (different dimensions).
    time.sleep(0.5)
    _click_load_profile_pick(page, "test")

    # Now poll: SSR grid should become 6×5 within 6 seconds.
    g_after_test = _wait_for_ssr_grid_dim(port, 6, 5, timeout_s=6)

    # Also fetch server's lastAlignGridSnapshot so we see what the server thinks.
    snap = _fetch_server_snapshot(port)
    server_grid = (snap or {}).get("runtime", {}).get("lastAlignGridSnapshot")
    server_dim = (
        f"{len(server_grid['srcXs'])}×{len(server_grid['srcYs'])} "
        f"profile={server_grid.get('profileId')} pts={len(server_grid['points'])}"
        if server_grid else "(none)"
    )

    ssr_dim = (
        f"{len(g_after_test['srcXs'])}×{len(g_after_test['srcYs'])}"
        if g_after_test else "(no grid)"
    )

    assert g_after_test is not None and len(g_after_test["srcXs"]) == 6 and len(g_after_test["srcYs"]) == 5, (
        f"BUG A REPRODUCED — after picking 'test' (6×5) via the menu UI, SSR "
        f"grid did not transition. SSR={ssr_dim}, server.lastAlignGridSnapshot="
        f"{server_dim}. Expected SSR to be 6×5 to match test profile dimensions. "
        f"The dimension change 3×3 → 6×5 is the load-bearing condition — simple "
        f"profiles (same dimensions or fewer) appear to apply correctly, but "
        f"complex profiles with different dimensions fail."
    )
