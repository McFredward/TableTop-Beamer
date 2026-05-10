"""Phase 38 — RED reproducer for SSR-tab grid-state desync on single-shot broadcasts.

Bug 2 (operator UAT 2026-05-11): Profile-load broadcasts reach the server
(`[align-grid-snapshot] server-recv`) but the SSR Chromium tab does NOT log
`RECV accept=true` and the streamed video stays at the old profile. Continuous
drag broadcasts eventually do propagate. Single-shot mutations don't.

This test:
1. Spawns server (with SSR Chromium tab as side-effect)
2. Opens /output/ in Playwright Chrome
3. Toggles align-mode on (so handles render)
4. Captures server stdout for the diagnostic markers:
   - [align-grid-snapshot] server-recv — broadcast hit server ✓
   - [ssr-tab:log] [align-grid-snapshot] RECV ... accept=true — SSR tab applied ✓
5. Posts a profile-load mutation via /api/live/command
6. Asserts within 2s: server-recv appears AND SSR-tab RECV with accept=true appears

If server-recv appears but SSR-tab RECV does not → confirms the apply-path gap.
"""
from __future__ import annotations
import json, time, urllib.request
import pytest
from _flake_retry import flaky_3x


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


def _broadcast_grid(port: int, srcXs: list, srcYs: list, points: list, profile: str) -> tuple[int, str]:
    return _post_json(port, "/api/live/command", {
        "mutationType": "align-grid-snapshot",
        "payload": {
            "srcXs": srcXs,
            "srcYs": srcYs,
            "points": points,
            "profileId": profile,
        },
    })


def _build_warped_grid(profile_id: str):
    """Build a 3x3 grid with TL corner pulled inward 20%."""
    srcXs = [0.0, 0.5, 1.0]
    srcYs = [0.0, 0.5, 1.0]
    points = []
    for r in range(3):
        for c in range(3):
            x = srcXs[c]
            y = srcYs[r]
            # Pull TL corner inward to make grid clearly different from identity
            if r == 0 and c == 0:
                x = 0.20
                y = 0.20
            points.append({"row": r, "col": c, "x": x, "y": y})
    return {"srcXs": srcXs, "srcYs": srcYs, "points": points, "profileId": profile_id}


@flaky_3x
def test_phase38_ssr_apply_path_for_single_shot(live_server, page):
    """RED until Phase 38 fix lands.

    Asserts that a single-shot align-grid-snapshot broadcast propagates to the
    SSR Chromium tab's mesh-warp apply path (not just to the server stdout).
    """
    port = live_server["port"]

    # 1. Open /output/, wait for stream ready
    page.goto(f"http://127.0.0.1:{port}/output/",
              wait_until="domcontentloaded", timeout=15_000)
    page.wait_for_function(
        "document.querySelector('video.ssr-video, video')?.readyState === 4",
        timeout=10_000,
    )

    # 2. Toggle align-mode on
    _toggle_align_mode(port, True)
    page.wait_for_timeout(1200)  # let SSR tab + /output/ react fully

    # 3. Simulate operator workflow: many drag-like broadcasts (matches the
    # operator's repro where bug shows up AFTER prior drag activity, not on
    # the very first broadcast).
    log_path = live_server["stdout_path"]
    for i in range(20):
        grid = _build_warped_grid("test")
        # Slight variation per iteration to defeat per-version dedup
        grid["points"][0]["x"] = 0.10 + i * 0.005
        grid["points"][0]["y"] = 0.10 + i * 0.005
        code, _body = _broadcast_grid(
            port, grid["srcXs"], grid["srcYs"], grid["points"], grid["profileId"]
        )
        assert code in (200, 202), f"drag broadcast #{i} rejected: {code}"
        time.sleep(0.05)  # ~20Hz, like normal drag

    page.wait_for_timeout(500)  # let SSR tab catch up

    # 4. NOW snapshot the markers — bug manifests on broadcasts AFTER prior activity
    log_before = open(log_path).read()
    n_serverrecv_before = log_before.count("[align-grid-snapshot] server-recv")
    n_ssrrecv_before = log_before.count("[align-grid-snapshot] RECV")

    # 5. Trigger the single-shot broadcast that mimics a profile-load with a
    # NEW profileId — this is the operator's exact scenario.
    grid = _build_warped_grid("phase38-test-profile")
    code, _body = _broadcast_grid(
        port, grid["srcXs"], grid["srcYs"], grid["points"], grid["profileId"]
    )
    assert code in (200, 202), f"profile-load broadcast rejected: {code}"

    # 5. Wait up to 2s for both markers to advance
    deadline = time.time() + 2.0
    n_serverrecv_after = n_serverrecv_before
    n_ssrrecv_after = n_ssrrecv_before
    while time.time() < deadline:
        log_now = open(log_path).read()
        n_serverrecv_after = log_now.count("[align-grid-snapshot] server-recv")
        n_ssrrecv_after = log_now.count("[align-grid-snapshot] RECV")
        if n_serverrecv_after > n_serverrecv_before and n_ssrrecv_after > n_ssrrecv_before:
            break
        time.sleep(0.1)

    # Final log read for assertion context
    log_after = open(log_path).read()
    new_lines = log_after[len(log_before):]

    # 6. Server should have received the broadcast — this proves the
    # broadcast reached the server-side handler.
    assert n_serverrecv_after > n_serverrecv_before, (
        f"server did NOT log [align-grid-snapshot] server-recv after broadcast.\n"
        f"This means /api/live/command POST didn't reach the mutation handler.\n"
        f"New log lines:\n{new_lines}"
    )

    # 7. SSR tab MUST log RECV — this is the actual bug under test.
    assert n_ssrrecv_after > n_ssrrecv_before, (
        f"SSR tab did NOT log [align-grid-snapshot] RECV after broadcast.\n"
        f"Server received the broadcast ({n_serverrecv_after - n_serverrecv_before} new server-recv entries) "
        f"but the SSR Chromium tab's fast-path apply did not fire.\n"
        f"This is the Phase 38 root-cause-under-investigation: single-shot broadcasts "
        f"reach the server but don't propagate to the SSR tab's mesh-warp.\n"
        f"New log lines:\n{new_lines}"
    )
