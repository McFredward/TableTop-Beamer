"""Phase 39.1 G3 RED test — board-switch sequence with align-mode clean.

Exercises the board-switch race window documented in
``src/app/runtime/output-receiver/output-align-mode-loader.js:807-816``:
``onProjectionProfileChange`` calls ``await activate()`` async; the
dynamic import of ``boot-handle-ui.js`` yields control while
``switchBoard → autoLoadRememberedProjectionProfile →
applyDefaultAndCaptureSnapshot()`` is mutating the global grid state.

Three assertions per iteration of the 5x board rotation:
  (a) If [data-grid-handle] elements exist, at least one #room-overlay
      polygon (or path) must also exist — never handles without overlay.
  (b) /api/live/snapshot's alignModeDirtyOnOutput must be false — no
      spurious dirty flag from board-switch / profile-restore paths.
  (c) After all 5 switches, align-mode-active body class must still be
      present — align mode survived all rotations.

Status (Wave 0): RED today. Wave 1 (39.1-3) lands the sync-teardown +
activation-token + captureCurrentAsLoadedSnapshot fix, after which all
three assertions must hold and this test turns GREEN.

Will be GREEN after 39.1-3 lands the sync-teardown + activation-token
+ captureCurrentAsLoadedSnapshot fix.
"""
from __future__ import annotations

import json
import sys
import os
import time

import pytest

sys.path.insert(0, os.path.dirname(__file__))

from helpers import switch_board, trigger_align_mode_on  # noqa: E402


# Operator-confirmed populated boards in the current dev env. If
# config/boards/<id>.json doesn't exist, switch_board raises with a
# clear error and the test surfaces it instead of hanging.
AVAILABLE_BOARDS = ["nemesis-lockdown-a", "nemesis-board-a"]


def test_g3_board_switch_clean(live_server, page):
    """G3: 5x board-switch rotation must keep align UI consistent and
    must not raise the dirty flag."""
    port = live_server["port"]
    page.goto(f"http://127.0.0.1:{port}/output/")

    # Wait for the H.264 stream to attach so /output/ is fully booted
    # (so the align-mode loader's onProjectionProfileChange handler is
    # actually registered before we start rotating boards).
    page.wait_for_function(
        "document.querySelector('video') && "
        "document.querySelector('video').videoWidth > 0",
        timeout=30000,
    )

    # Enable align mode and wait for boot-handle-ui mount.
    trigger_align_mode_on(page)
    time.sleep(1)  # bundle load + first handle render

    failures = []

    for i in range(5):
        target = AVAILABLE_BOARDS[i % len(AVAILABLE_BOARDS)]
        switch_board(page, target)

        # MID-RACE-WINDOW probe at 0.5s — the race between the new
        # bootHandleUi rendering handles and the new boardId's polygons
        # finishing renderRoomOverlay is at its widest here per
        # research §G3.
        time.sleep(0.5)
        handles_count = page.evaluate(
            "document.querySelectorAll('[data-grid-handle]').length"
        )
        overlay_polygons = page.evaluate(
            "document.querySelectorAll("
            "'#room-overlay polygon, #room-overlay path'"
            ").length"
        )
        if handles_count > 0 and overlay_polygons == 0:
            failures.append({
                "iter": i,
                "target": target,
                "phase": "mid-race",
                "handles": handles_count,
                "overlays": overlay_polygons,
            })

        # Let activate() complete its full await chain.
        time.sleep(1)

        # Probe alignModeDirtyOnOutput from server snapshot via fetch in
        # the page context (same-origin, no CORS).
        dirty_resp = page.evaluate("""
            () => fetch('/api/live/snapshot').then(r => r.json()).then(j => ({
                dirty: !!j?.snapshot?.runtime?.alignModeDirtyOnOutput,
                has_field: j?.snapshot?.runtime?.alignModeDirtyOnOutput !== undefined
            }))
        """)
        if dirty_resp and dirty_resp.get("dirty"):
            failures.append({
                "iter": i,
                "target": target,
                "phase": "post-settle",
                "dirty": True,
            })

    # End-of-test: align mode should still be active. G3 sub-G3a must
    # NOT leave align-mode disabled after teardown — that would mean
    # the board-switch race accidentally killed alignMode globally.
    still_active = page.evaluate(
        "document.body.classList.contains('align-mode-active')"
    )
    if not still_active:
        failures.append({"phase": "end-of-test", "align_mode_active": False})

    assert not failures, (
        f"G3 board-switch race detected: {json.dumps(failures, indent=2)}"
    )


@pytest.fixture(autouse=True)
def _skip_if_no_ssr_publish(live_server):
    """Skip if SSR publishing is not active — G3 needs a real /output/
    runtime to register onProjectionProfileChange."""
    import urllib.error
    import urllib.request
    port = live_server["port"]
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{port}/api/diag/ssr-screenshot",
            timeout=3.0,
        ) as resp:
            if resp.status == 503:
                pytest.skip("SSR_RENDER_HOST not active — G3 requires SSR")
    except urllib.error.HTTPError as e:
        if e.code == 503:
            pytest.skip("SSR_RENDER_HOST not active — G3 requires SSR")
    except Exception:
        pass
