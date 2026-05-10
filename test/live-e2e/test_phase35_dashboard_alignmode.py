"""
Phase 35 D-01-A2 — dashboard align-mode regression.

After Track A's pure-extract refactor (35-A-PLAN), runtime-orchestration
calls `bootAlignMode({...})` instead of running the polygon-editor init chain
inline. This test verifies that the dashboard (`/`, index.html) STILL renders
projection-corner-handles when alignMode is toggled on.

Status across phase:
  - Master (pre-Track-A): PASSES — dashboard already renders handles today.
  - During Track A: must STAY GREEN. A failure here means the refactor
                    regressed the dashboard's existing UX.
  - After Track A:  must STAY GREEN.

This is one of two "must-stay-green" canaries (the other being D-06
connection-stability). It guards against the A4 working-assumption
("pure-extract is additive, dashboard is unaffected").
"""

from __future__ import annotations

import json
import urllib.request

from _flake_retry import flaky_3x


@flaky_3x
def test_dashboard_alignmode_handles(live_server, page):
    page.goto(
        f"http://127.0.0.1:{live_server['port']}/",
        wait_until="domcontentloaded",
        timeout=15_000,
    )
    # Wait for runtime-orchestration to finish booting. Use a generous
    # readiness probe — any of: window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI
    # OR the body[data-output-role] attribute being set OR the room-overlay
    # element being present in DOM.
    page.wait_for_function(
        """(() => {
            return (
                typeof window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI === 'object' ||
                document.body.getAttribute('data-output-role') !== null ||
                document.getElementById('room-overlay') !== null
            );
        })()""",
        timeout=15_000,
    )

    # Toggle alignMode via /api/live/command (accepted route — see 35-B
    # deferred-items.md; /api/live/mutate does not exist on master).
    body = json.dumps(
        {
            "mutationType": "context-update",
            "payload": {"alignMode": True},
        }
    ).encode()
    req = urllib.request.Request(
        f"http://127.0.0.1:{live_server['port']}/api/live/command",
        data=body,
        headers={"content-type": "application/json"},
    )
    urllib.request.urlopen(req, timeout=5).read()

    # Handles should appear within 5s
    page.wait_for_function(
        "document.querySelectorAll('.projection-corner-handle').length > 0",
        timeout=5_000,
    )
    visible = page.evaluate(
        "Array.from(document.querySelectorAll('.projection-corner-handle'))"
        ".every(el => el.offsetWidth > 0 && el.offsetHeight > 0)"
    )
    assert visible, "dashboard handles exist but not visible"
