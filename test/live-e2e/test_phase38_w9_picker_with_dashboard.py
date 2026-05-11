"""Phase 38 W9 — RED reproducer: operator's surviving Bug A after W7+W8.

Operator's evidence (after both W7 + W8 in production):
  - Profile-load via Pi /output/'s 'Load profile…' toolbar STILL produces desync.
  - ESC 3-6 times eventually converges.
  - xrandrv2 (9×9 complex) is "worst" — also helps to wiggle the board.
  - This is AFTER W7 (SSR no-push) AND W8 (Pi no-push on activate) are in.

Hypothesis: the W6 picker test (which passes on master) does NOT include
a second connected client (dashboard browser). When an additional dashboard
WS client is connected, server's `lastBroadcastVersionByClient` per-client
version gate or other state may interfere with broadcast fanout to SSR.

Test scenario (exact operator workflow):
  1. Boot server with NO runtime-active-grid.json (fresh boot).
  2. Open DASHBOARD page first (root URL '/') — second WS client.
  3. Open Pi /output/ — third WS client (after SSR which is internal).
  4. Toggle align-mode ON via dashboard's align-button.
  5. Click 'Load profile…' on Pi /output/'s toolbar.
  6. Pick 'xrandrv2' (9×9, 81 points) — operator's worst-case.
  7. Verify within 3s:
     - server snapshot lastAlignGridSnapshot is 9×9
     - SSR /api/diag/ssr-grid is 9×9
     - Pi /output/'s grid-state is 9×9 (via page.evaluate)

The test MUST FAIL on master b210473 (W8 latest) if hypothesis is correct.

Logs the full server stdout if test fails for evidence.
"""
from __future__ import annotations
import json
import os
import shutil
import time
import urllib.error
import urllib.request

import pytest

_REPO_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
_ACTIVE_GRID_PATH = os.path.join(_REPO_ROOT, "config", "runtime-active-grid.json")
_PROFILES_PATH = os.path.join(_REPO_ROOT, "config", "projection-profiles.json")


def _http_get(port, path, timeout=5.0):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}{path}", timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def _http_post(port, path, payload, timeout=5.0):
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}{path}",
        data=json.dumps(payload).encode(),
        headers={"content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
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


def _fetch_live_state(port):
    code, body = _http_get(port, "/api/live/state")
    if code != 200:
        return None
    try:
        return json.loads(body)
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
def _fresh_disk_state():
    """Remove runtime-active-grid.json so the server boots fresh from defaults.

    Operator's scenario: no active grid persisted (or one that's at default
    geometry). The bug surfaces specifically when loading a profile via
    the picker UI changes the dimensions.
    """
    bak = _ACTIVE_GRID_PATH + ".w9bak"
    if os.path.exists(_ACTIVE_GRID_PATH):
        shutil.copy(_ACTIVE_GRID_PATH, bak)
        os.unlink(_ACTIVE_GRID_PATH)
    yield
    if os.path.exists(bak):
        shutil.copy(bak, _ACTIVE_GRID_PATH)
        os.unlink(bak)


@pytest.fixture
def _seed_xrandrv2_active():
    """Seed runtime-active-grid.json with xrandrv2 (9×9) — matches operator's
    current production state. Server boots already at xrandrv2 with profileId=xrandrv2.
    """
    bak = _ACTIVE_GRID_PATH + ".w9bak2"
    if os.path.exists(_ACTIVE_GRID_PATH):
        shutil.copy(_ACTIVE_GRID_PATH, bak)
    # Build the active-grid file from xrandrv2 in projection-profiles.json
    with open(_PROFILES_PATH) as f:
        profiles = json.load(f)
    xv2 = profiles["nemesis-board-a"]["xrandrv2"]
    active = {
        "schema": "tt-beamer.active-grid.v1",
        "srcXs": xv2["srcXs"],
        "srcYs": xv2["srcYs"],
        "points": xv2["points"],
        "profileId": "xrandrv2",
        "persistedAt": "2026-05-11T20:05:16.426Z",
    }
    with open(_ACTIVE_GRID_PATH, "w") as f:
        json.dump(active, f)
    yield
    if os.path.exists(bak):
        shutil.copy(bak, _ACTIVE_GRID_PATH)
        os.unlink(bak)
    elif os.path.exists(_ACTIVE_GRID_PATH):
        os.unlink(_ACTIVE_GRID_PATH)


def _open_dashboard(page, port):
    """Open the dashboard at root URL — establishes a CONTROL-role WS client."""
    page.goto(
        f"http://127.0.0.1:{port}/",
        wait_until="domcontentloaded",
        timeout=20000,
    )
    # Wait for live-sync to initialize.
    page.wait_for_function(
        "!!window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE",
        timeout=15000,
    )
    # Wait for live-sync to connect (best-effort).
    time.sleep(1.5)


def _open_pi_output_align(page, port):
    """Open Pi /output/ and toggle align mode so the toolbar appears."""
    page.goto(
        f"http://127.0.0.1:{port}/output/",
        wait_until="domcontentloaded",
        timeout=20000,
    )
    page.wait_for_function(
        "document.querySelector('video.ssr-video, video')?.readyState === 4",
        timeout=20000,
    )
    # Toggle align mode via server command (drives lazy bundle load).
    _http_post(port, "/api/live/command", {
        "mutationType": "context-update",
        "payload": {"alignMode": True},
    })
    page.wait_for_function(
        "document.querySelectorAll('.projection-align-action-load').length > 0",
        timeout=20000,
    )


def _click_load_profile_pick(page, profile_name, timeout_ms=15000):
    """Click 'Load profile…' button then click the menu item for profile_name."""
    page.click(".projection-align-action-load")
    page.wait_for_function(
        f"""
        () => {{
          const items = document.querySelectorAll('.board-context-menu-item');
          return Array.from(items).some(el => el.textContent.trim() === '{profile_name}');
        }}
        """,
        timeout=timeout_ms,
    )
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


def _wait_for_grid_dim(port, expected_cols, expected_rows, timeout_s=10):
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


def _pi_grid_dim(page):
    """Read Pi's grid-state dimensions via page.evaluate."""
    try:
        return page.evaluate(
            """
            () => {
              const gs = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
              if (!gs || typeof gs.getGrid !== 'function') return null;
              const g = gs.getGrid();
              return {
                cols: g.srcXs?.length ?? 0,
                rows: g.srcYs?.length ?? 0,
                tlx: g.points?.[0]?.[0]?.x,
                tly: g.points?.[0]?.[0]?.y,
              };
            }
            """
        )
    except Exception:
        return None


@pytest.fixture
def two_pages(chrome_browser):
    """Provide TWO browser contexts (dashboard + Pi /output/) — separate WS clients."""
    ctx_a = chrome_browser.new_context()
    ctx_b = chrome_browser.new_context()
    pg_a = ctx_a.new_page()
    pg_b = ctx_b.new_page()
    try:
        yield pg_a, pg_b
    finally:
        try: ctx_a.close()
        except Exception: pass
        try: ctx_b.close()
        except Exception: pass


def test_phase38_w9_dashboard_present_during_pi_picker_load(
    _fresh_disk_state, live_server, two_pages
):
    """RED reproducer A: just dashboard+Pi, single load xrandrv2.

    PASSED on master b210473 — bug not reproduced with this setup.
    """
    port = live_server["port"]
    _require_ssr_host(port)
    assert _wait_for_ssr_warmup(port, 30), "SSR tab did not warm up"
    time.sleep(2.0)

    dashboard, pi_output = two_pages

    _open_dashboard(dashboard, port)
    _open_pi_output_align(pi_output, port)
    time.sleep(1.5)

    state = _fetch_live_state(port)
    print(f"[w9-A] live state version pre-load: {state.get('session', {}).get('version')}")

    _click_load_profile_pick(pi_output, "xrandrv2")
    time.sleep(2.0)

    g_ssr = _fetch_ssr_grid(port)
    snap = _fetch_server_snapshot(port)
    server_grid = (snap or {}).get("runtime", {}).get("lastAlignGridSnapshot")
    pi_g = _pi_grid_dim(pi_output)

    ssr_dim = f"{len(g_ssr['srcXs'])}×{len(g_ssr['srcYs'])}" if g_ssr else "(no)"
    server_dim = (
        f"{len(server_grid['srcXs'])}×{len(server_grid['srcYs'])} profile={server_grid.get('profileId')}"
        if server_grid else "(none)"
    )
    pi_dim = f"{pi_g.get('cols')}×{pi_g.get('rows')}" if pi_g else "(none)"
    print(f"[w9-A] post-load SSR={ssr_dim} server={server_dim} Pi={pi_dim}")

    assert g_ssr is not None and len(g_ssr["srcXs"]) == 9 and len(g_ssr["srcYs"]) == 9, (
        f"BUG A REPRODUCED [SSR]: SSR={ssr_dim} server={server_dim} Pi={pi_dim}"
    )
    assert pi_g and pi_g.get("cols") == 9 and pi_g.get("rows") == 9, (
        f"BUG A REPRODUCED [Pi]: SSR={ssr_dim} server={server_dim} Pi={pi_dim}"
    )


def test_phase38_w9_chained_profile_loads(
    _fresh_disk_state, live_server, two_pages
):
    """RED reproducer B: load test (5×6) FIRST, then xrandrv2 (9×9).

    Closer to operator's scenario — they typically have ONE profile already
    loaded, then load a different one. The dimension change PLUS the
    state baggage from the first load may expose the bug.
    """
    port = live_server["port"]
    _require_ssr_host(port)
    assert _wait_for_ssr_warmup(port, 30), "SSR tab did not warm up"
    time.sleep(2.0)

    dashboard, pi_output = two_pages

    _open_dashboard(dashboard, port)
    _open_pi_output_align(pi_output, port)
    time.sleep(1.5)

    # Step 1: Load 'test' (5×6, 30 points) first.
    _click_load_profile_pick(pi_output, "test")
    time.sleep(1.5)
    g1 = _fetch_ssr_grid(port)
    print(f"[w9-B] after test load: SSR dims={len(g1['srcXs'])}×{len(g1['srcYs'])}")
    assert len(g1["srcXs"]) == 6 and len(g1["srcYs"]) == 5

    # Step 2: Load 'xrandrv2' (9×9). The dimension change is 6×5 → 9×9.
    _click_load_profile_pick(pi_output, "xrandrv2")
    time.sleep(2.5)

    g_ssr = _fetch_ssr_grid(port)
    snap = _fetch_server_snapshot(port)
    server_grid = (snap or {}).get("runtime", {}).get("lastAlignGridSnapshot")
    pi_g = _pi_grid_dim(pi_output)

    ssr_dim = f"{len(g_ssr['srcXs'])}×{len(g_ssr['srcYs'])}" if g_ssr else "(no)"
    server_dim = (
        f"{len(server_grid['srcXs'])}×{len(server_grid['srcYs'])} profile={server_grid.get('profileId')}"
        if server_grid else "(none)"
    )
    pi_dim = f"{pi_g.get('cols')}×{pi_g.get('rows')}" if pi_g else "(none)"
    print(f"[w9-B] post-load2: SSR={ssr_dim} server={server_dim} Pi={pi_dim}")

    assert g_ssr is not None and len(g_ssr["srcXs"]) == 9 and len(g_ssr["srcYs"]) == 9, (
        f"BUG A REPRODUCED [SSR after chain]: SSR={ssr_dim} server={server_dim} Pi={pi_dim}"
    )
    assert pi_g and pi_g.get("cols") == 9 and pi_g.get("rows") == 9, (
        f"BUG A REPRODUCED [Pi after chain]: SSR={ssr_dim} server={server_dim} Pi={pi_dim}"
    )


def test_phase38_w9_test_xrandrv2_test_xrandrv2(
    _fresh_disk_state, live_server, two_pages
):
    """RED reproducer C: Rapid back-and-forth profile loads.

    Test profile→xrandrv2→test→xrandrv2. Mirrors operator restoring an old
    profile and a new one rapidly. Rapid succession may saturate the
    version-gate or hit a queue-coalesce edge case.
    """
    port = live_server["port"]
    _require_ssr_host(port)
    assert _wait_for_ssr_warmup(port, 30), "SSR tab did not warm up"
    time.sleep(2.0)

    dashboard, pi_output = two_pages
    _open_dashboard(dashboard, port)
    _open_pi_output_align(pi_output, port)
    time.sleep(1.5)

    profiles_in_order = ["test", "xrandrv2", "test", "xrandrv2"]
    for i, p in enumerate(profiles_in_order):
        _click_load_profile_pick(pi_output, p)
        time.sleep(0.5)  # rapid succession; less than 2s between picks
        print(f"[w9-C] picked {p}")

    # Final wait for any straggler broadcasts.
    time.sleep(3.0)

    g_ssr = _fetch_ssr_grid(port)
    snap = _fetch_server_snapshot(port)
    server_grid = (snap or {}).get("runtime", {}).get("lastAlignGridSnapshot")
    pi_g = _pi_grid_dim(pi_output)
    state = _fetch_live_state(port)

    ssr_dim = f"{len(g_ssr['srcXs'])}×{len(g_ssr['srcYs'])}" if g_ssr else "(no)"
    server_dim = (
        f"{len(server_grid['srcXs'])}×{len(server_grid['srcYs'])} profile={server_grid.get('profileId')}"
        if server_grid else "(none)"
    )
    pi_dim = f"{pi_g.get('cols')}×{pi_g.get('rows')}" if pi_g else "(none)"
    version = state.get('session', {}).get('version')
    print(f"[w9-C] final SSR={ssr_dim} server={server_dim} Pi={pi_dim} version={version}")

    # All three clients should converge on xrandrv2 (9×9), the LAST pick.
    assert g_ssr is not None and len(g_ssr["srcXs"]) == 9 and len(g_ssr["srcYs"]) == 9, (
        f"BUG A REPRODUCED [SSR after rapid chain]: SSR={ssr_dim} server={server_dim} Pi={pi_dim}"
    )
    assert pi_g and pi_g.get("cols") == 9 and pi_g.get("rows") == 9, (
        f"BUG A REPRODUCED [Pi after rapid chain]: SSR={ssr_dim} server={server_dim} Pi={pi_dim}"
    )


def test_phase38_w9_xrandrv2_seeded_load_test(
    _seed_xrandrv2_active, live_server, two_pages
):
    """RED reproducer D: server boots with xrandrv2 already active on disk.
    Operator's CURRENT state. Then load a DIFFERENT profile (test, 5x6).
    """
    port = live_server["port"]
    _require_ssr_host(port)
    assert _wait_for_ssr_warmup(port, 30), "SSR tab did not warm up"
    time.sleep(2.0)

    # Confirm boot: server snapshot should be xrandrv2 (9x9) from disk seed.
    snap = _fetch_server_snapshot(port)
    sg = (snap or {}).get("runtime", {}).get("lastAlignGridSnapshot")
    print(f"[w9-D] boot snapshot: {len(sg['srcXs']) if sg else 0}×{len(sg['srcYs']) if sg else 0} profile={sg.get('profileId') if sg else None}")
    assert sg and len(sg["srcXs"]) == 9 and len(sg["srcYs"]) == 9

    dashboard, pi_output = two_pages
    _open_dashboard(dashboard, port)
    _open_pi_output_align(pi_output, port)
    time.sleep(1.5)

    # Confirm Pi adopted xrandrv2 (9x9) from server live-hello.
    pi_g_before = _pi_grid_dim(pi_output)
    print(f"[w9-D] Pi before load: {pi_g_before}")

    # Load test profile (5x6) — different dims from current xrandrv2 (9x9).
    _click_load_profile_pick(pi_output, "test")
    time.sleep(2.0)

    g_ssr = _fetch_ssr_grid(port)
    snap = _fetch_server_snapshot(port)
    server_grid = (snap or {}).get("runtime", {}).get("lastAlignGridSnapshot")
    pi_g = _pi_grid_dim(pi_output)

    ssr_dim = f"{len(g_ssr['srcXs'])}×{len(g_ssr['srcYs'])}" if g_ssr else "(no)"
    server_dim = (
        f"{len(server_grid['srcXs'])}×{len(server_grid['srcYs'])} profile={server_grid.get('profileId')}"
        if server_grid else "(none)"
    )
    pi_dim = f"{pi_g.get('cols')}×{pi_g.get('rows')}" if pi_g else "(none)"
    print(f"[w9-D] post-load: SSR={ssr_dim} server={server_dim} Pi={pi_dim}")

    assert g_ssr is not None and len(g_ssr["srcXs"]) == 6 and len(g_ssr["srcYs"]) == 5, (
        f"BUG A REPRODUCED [SSR seeded-xrandrv2 load test]: SSR={ssr_dim} server={server_dim} Pi={pi_dim}"
    )
    assert pi_g and pi_g.get("cols") == 6 and pi_g.get("rows") == 5, (
        f"BUG A REPRODUCED [Pi seeded-xrandrv2 load test]: SSR={ssr_dim} server={server_dim} Pi={pi_dim}"
    )


def test_phase38_w9_pi_localstorage_stale_then_load_xrandrv2(
    _fresh_disk_state, live_server, two_pages
):
    """RED reproducer E: Pi /output/'s localStorage has a STALE grid (test 5x6).
    Server starts fresh (no active grid). When Pi connects, it reconciles its
    localStorage grid with server's empty state — server's empty state wins via
    live-hello if a lastAlignGridSnapshot exists, OR Pi's LS stays if not.
    Then user picks xrandrv2 (9x9).
    """
    port = live_server["port"]
    _require_ssr_host(port)
    assert _wait_for_ssr_warmup(port, 30), "SSR tab did not warm up"
    time.sleep(2.0)

    dashboard, pi_output = two_pages

    # Pre-seed Pi's localStorage with a STALE grid: test's geometry (5x6).
    # We need to visit /output/ first to set localStorage on the correct origin.
    pi_output.goto(f"http://127.0.0.1:{port}/output/", wait_until="domcontentloaded", timeout=20000)
    with open(_PROFILES_PATH) as f:
        profiles = json.load(f)
    test_profile = profiles["nemesis-board-a"]["test"]
    pi_output.evaluate(f"""
        () => {{
          const v = {{
            srcXs: {json.dumps(test_profile["srcXs"])},
            srcYs: {json.dumps(test_profile["srcYs"])},
            points: {json.dumps(test_profile["points"])},
          }};
          localStorage.setItem("tt-beamer.projection-mapping-v2", JSON.stringify(v));
          localStorage.setItem("tt-beamer.align-loaded-profile.v1", JSON.stringify({{
            name: "test",
            snapshot: v,
          }}));
        }}
    """)
    # Reload to pick up the seeded LS.
    pi_output.reload(wait_until="domcontentloaded", timeout=20000)
    pi_output.wait_for_function(
        "document.querySelector('video.ssr-video, video')?.readyState === 4",
        timeout=20000,
    )

    _open_dashboard(dashboard, port)

    # Toggle align mode via server command on Pi.
    _http_post(port, "/api/live/command", {
        "mutationType": "context-update",
        "payload": {"alignMode": True},
    })
    pi_output.wait_for_function(
        "document.querySelectorAll('.projection-align-action-load').length > 0",
        timeout=20000,
    )
    time.sleep(1.5)

    # Now Pi's LS has test (5x6). Pi's grid-state may be at test (5x6) too.
    pi_g_before = _pi_grid_dim(pi_output)
    print(f"[w9-E] Pi LS-loaded grid: {pi_g_before}")

    # Pick xrandrv2 (9x9).
    _click_load_profile_pick(pi_output, "xrandrv2")
    time.sleep(2.5)

    g_ssr = _fetch_ssr_grid(port)
    snap = _fetch_server_snapshot(port)
    server_grid = (snap or {}).get("runtime", {}).get("lastAlignGridSnapshot")
    pi_g = _pi_grid_dim(pi_output)

    ssr_dim = f"{len(g_ssr['srcXs'])}×{len(g_ssr['srcYs'])}" if g_ssr else "(no)"
    server_dim = (
        f"{len(server_grid['srcXs'])}×{len(server_grid['srcYs'])} profile={server_grid.get('profileId')}"
        if server_grid else "(none)"
    )
    pi_dim = f"{pi_g.get('cols')}×{pi_g.get('rows')}" if pi_g else "(none)"
    print(f"[w9-E] post-load: SSR={ssr_dim} server={server_dim} Pi={pi_dim}")

    assert g_ssr is not None and len(g_ssr["srcXs"]) == 9 and len(g_ssr["srcYs"]) == 9, (
        f"BUG A REPRODUCED [SSR LS-stale then xrandrv2]: SSR={ssr_dim} server={server_dim} Pi={pi_dim}"
    )
    assert pi_g and pi_g.get("cols") == 9 and pi_g.get("rows") == 9, (
        f"BUG A REPRODUCED [Pi LS-stale then xrandrv2]: SSR={ssr_dim} server={server_dim} Pi={pi_dim}"
    )
