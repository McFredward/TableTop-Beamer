"""Phase 38 W10 — RED reproducer: operator's surviving Bug A.

Operator's ground-truth log (2026-05-11):
  1. Server boot with xrandrv2 (9×9) on disk → SSR applies via live-hello.
  2. Operator loads test2 via Pi /output/'s picker → broadcasts → server-recv → SSR applies.
  3. Operator DRAGS handles on test2 (30Hz flurry, ~50 broadcasts, corners drift) → ALL reach.
  4. Operator loads xrandrv2 via Pi /output/'s picker.
  5. Pi piDiag-logs the EMIT (force=true dims=9×9 corners=(0.20,0.11)..(0.75,0.82) profile=xrandrv2).
  6. NO server-recv WS log appears.  ← BUG
  7. ~1m 23s of silent ssr-stats heartbeats.
  8. Operator presses ESC → discardChanges fires → broadcastGridSnapshot → server-recv eventually appears.

The previous W2..W9 reproducers tested the profile-load IN ISOLATION (no drag-burst
priming). They couldn't reproduce because the bug is **send-path state corruption
caused by the drag burst**, not an apply-path issue.

This reproducer drives the EXACT operator flow:
  - Server boots with xrandrv2 on disk
  - Pi /output/ opens, align-mode on
  - Pi /output/ LOADs test2 via picker (UI click)
  - Pi /output/ DRAGS handles on test2 (Playwright mouse moves, 30Hz × ~50 frames)
  - Pi /output/ LOADs xrandrv2 via picker (UI click) — IMMEDIATELY after drag end
  - Assert server stdout contains `[align-grid-snapshot] server-recv ... profile=xrandrv2`
    within 3 seconds.

If this test FAILs on master 0283ee8, we've reproduced the operator's bug.
"""
from __future__ import annotations

import json
import os
import re
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
def _seed_xrandrv2_active():
    """Seed runtime-active-grid.json with xrandrv2 (9×9) on disk."""
    bak = _ACTIVE_GRID_PATH + ".w10bak"
    if os.path.exists(_ACTIVE_GRID_PATH):
        shutil.copy(_ACTIVE_GRID_PATH, bak)
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
    page.wait_for_function(
        "!!window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE",
        timeout=15000,
    )
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
          if (!target) throw new Error('menu item not found: {profile_name}');
          target.click();
        }}
        """
    )


def _drive_drag_burst_via_grid_state(page, n_broadcasts=80, base_delay_ms=8):
    """Drive a Pi-side drag burst by directly mutating grid points + broadcasting,
    mimicking the handle-drag pointermove loop. This mimics the REAL drag
    pattern: high-frequency `force=false` calls (120Hz pointermove) that
    bounce off the throttle + a final `force=true` on drag-end.

    The throttle behavior creates `_broadcastScheduled` deferred broadcasts.
    During a real drag at 120Hz pointermove:
      - Each move calls broadcastGridSnapshot({force:false})
      - The first call fires immediately; subsequent moves within 33ms get
        gated by `_broadcastScheduled=true`
      - A setTimeout is scheduled to re-emit with force=true after the rate-limit
      - On drag-end, `force=true` bypasses the rate-limit and emits immediately
        BUT does NOT clear `_broadcastScheduled` — the pending setTimeout
        will still fire after drag-end.

    This recreates the operator's "30Hz flurry" through realistic throttle paths.
    """
    page.evaluate(
        f"""
        async () => {{
          const gs = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
          if (!gs) throw new Error('grid-state not loaded');
          const N = {n_broadcasts};
          const startTL = {{ x: 0.09, y: 0.11 }};
          const endTL = {{ x: 0.03, y: 0.20 }};
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          for (let i = 0; i < N; i++) {{
            const t = i / Math.max(1, N - 1);
            const x = startTL.x + (endTL.x - startTL.x) * t;
            const y = startTL.y + (endTL.y - startTL.y) * t;
            const grid = gs.grid;
            if (grid && grid.points && grid.points[0] && grid.points[0][0]) {{
              grid.points[0][0].x = x;
              grid.points[0][0].y = y;
            }}
            // Real drag uses force=false during move (throttled to 30Hz inside grid-state)
            gs.broadcastGridSnapshot({{ force: false }});
            await sleep({base_delay_ms});
          }}
          // Drag-end: force=true emit (matches real drag end behavior)
          gs.broadcastGridSnapshot({{ force: true }});
        }}
        """
    )


def _grep_server_log(stdout_path, pattern, since_offset=0):
    """Read server stdout from since_offset and grep for pattern (regex).
    Returns list of matching lines."""
    if not os.path.exists(stdout_path):
        return []
    with open(stdout_path) as f:
        f.seek(since_offset)
        data = f.read()
    out = []
    for line in data.splitlines():
        if re.search(pattern, line):
            out.append(line)
    return out


def _stat_log_size(path):
    try:
        return os.path.getsize(path)
    except Exception:
        return 0


def test_phase38_w10_drag_burst_then_profile_load(
    _seed_xrandrv2_active, live_server, page
):
    """RED reproducer: drag burst on test2, then load xrandrv2.

    Steps mirror operator's UAT log:
      1. Server boots with xrandrv2 (9×9) seeded on disk.
      2. Open Pi /output/, toggle align mode.
      3. Click 'Load profile…' → pick 'test2' (3×3).
      4. Drive a 30Hz × 50-iteration drag burst on test2 via grid-state mutation
         + broadcastGridSnapshot({force:true}).
      5. IMMEDIATELY click 'Load profile…' → pick 'xrandrv2' (9×9).
      6. Wait up to 3s for [align-grid-snapshot] server-recv profile=xrandrv2
         to appear in server stdout.

    On master 0283ee8 this should FAIL — no server-recv after xrandrv2 EMIT.
    """
    port = live_server["port"]
    stdout_path = live_server["stdout_path"]
    _require_ssr_host(port)
    assert _wait_for_ssr_warmup(port, 30), "SSR tab did not warm up"
    time.sleep(2.0)

    pi_output = page
    _open_pi_output_align(pi_output, port)
    time.sleep(1.5)

    # Step 1: load test2 (3×3)
    _click_load_profile_pick(pi_output, "test2")
    time.sleep(2.0)

    pre_test2_grid = _fetch_ssr_grid(port)
    print(f"[w10] after test2 load: SSR dims={len(pre_test2_grid['srcXs'])}×{len(pre_test2_grid['srcYs'])}")
    assert len(pre_test2_grid["srcXs"]) == 3 and len(pre_test2_grid["srcYs"]) == 3, (
        f"expected SSR 3×3 after test2 load, got {len(pre_test2_grid['srcXs'])}×{len(pre_test2_grid['srcYs'])}"
    )

    # Step 2: drag burst on test2 (30Hz × 50 broadcasts ≈ 1.5s)
    pre_burst_offset = _stat_log_size(stdout_path)
    print(f"[w10] starting drag burst; pre_burst_offset={pre_burst_offset}")
    _drive_drag_burst_via_grid_state(pi_output, n_broadcasts=50, base_delay_ms=33)
    print(f"[w10] drag burst complete")

    # Brief settle for last broadcasts to drain
    time.sleep(0.3)

    # Sample what the server received during the burst (should be many)
    burst_recv = _grep_server_log(
        stdout_path,
        r"\[align-grid-snapshot\] server-recv .+ profile=test2",
        pre_burst_offset,
    )
    print(f"[w10] burst server-recv count (profile=test2): {len(burst_recv)}")

    # Step 3: NOW load xrandrv2 — this is the operator's critical step
    post_burst_offset = _stat_log_size(stdout_path)
    print(f"[w10] loading xrandrv2; post_burst_offset={post_burst_offset}")
    _click_load_profile_pick(pi_output, "xrandrv2")

    # Wait up to 5s for server-recv profile=xrandrv2 to appear
    deadline = time.time() + 5.0
    recv_xrandrv2 = []
    emit_xrandrv2 = []
    while time.time() < deadline:
        recv_xrandrv2 = _grep_server_log(
            stdout_path,
            r"\[align-grid-snapshot\] server-recv .+ profile=xrandrv2",
            post_burst_offset,
        )
        emit_xrandrv2 = _grep_server_log(
            stdout_path,
            r"\[align-grid-snapshot-log\] EMIT .+ profile=xrandrv2",
            post_burst_offset,
        )
        if recv_xrandrv2:
            break
        time.sleep(0.15)

    print(f"[w10] EMIT xrandrv2 count: {len(emit_xrandrv2)}")
    if emit_xrandrv2:
        print(f"[w10] first EMIT xrandrv2: {emit_xrandrv2[0]}")
    print(f"[w10] server-recv xrandrv2 count: {len(recv_xrandrv2)}")
    if recv_xrandrv2:
        print(f"[w10] first server-recv xrandrv2: {recv_xrandrv2[0]}")

    # The bug: EMIT fires (Pi side) but server-recv never appears.
    # If reproduced, this assertion FAILS.
    assert recv_xrandrv2, (
        f"BUG W10 REPRODUCED: EMIT for xrandrv2 fired {len(emit_xrandrv2)} time(s) "
        f"but NO server-recv appeared within 5s after burst. "
        f"Server received {len(burst_recv)} test2 broadcasts during burst. "
        f"This is the operator's 1m23s silent-gap bug — the Pi WS send for the "
        f"xrandrv2 broadcast doesn't reach the server's mutation handler."
    )

    # Sanity check: server snapshot should be xrandrv2 (9×9)
    snap = _fetch_server_snapshot(port)
    server_grid = (snap or {}).get("runtime", {}).get("lastAlignGridSnapshot")
    print(f"[w10] server lastAlignGridSnapshot: "
          f"{len(server_grid['srcXs']) if server_grid else 0}×"
          f"{len(server_grid['srcYs']) if server_grid else 0} "
          f"profile={server_grid.get('profileId') if server_grid else None}")
    assert server_grid and len(server_grid["srcXs"]) == 9 and len(server_grid["srcYs"]) == 9, (
        f"server snapshot did not become 9×9 after xrandrv2 load"
    )
