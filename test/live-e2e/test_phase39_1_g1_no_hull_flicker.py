"""Phase 39.1 G1 BACKSTOP test — probe runningAnimations for stray flicker.

Catches Hypothesis-Alt: a stray flicker pipeline (hull-flicker /
power-outage) is overriding solid-color rendering at autostart. Does
NOT catch Hypothesis-Main (H.264 temporal noise at mesh-cell boundaries
perceived as flickering — that's covered by G2). Primary G1 acceptance
gate is operator UAT; this is a REGRESSION BACKSTOP that pins the
current state (13× solid-color, 0× hull-flicker per
``config/runtime-active-animations.json``) so future plans can't
silently re-introduce a flicker pipeline.

Status (Wave 0): EXPECTED GREEN today (config files show no flicker
entries). Test stays GREEN unless a future regression injects a
hull-flicker or power-outage animation into autostart.
"""
from __future__ import annotations

import os
import re
import sys
import time

import pytest

sys.path.insert(0, os.path.dirname(__file__))

from helpers import read_running_animations  # noqa: E402


def test_g1_no_stray_flicker_entries_at_autostart(live_server, page):
    """G1 backstop: no hull-flicker or power-outage entries in
    runningAnimations after autostart settles."""
    port = live_server["port"]
    page.goto(f"http://127.0.0.1:{port}/output/")

    # Wait for the H.264 track to attach so we know /output/ has fully
    # booted and autostart has had a chance to enqueue its animations.
    page.wait_for_function(
        "document.querySelector('video') && "
        "document.querySelector('video').videoWidth > 0",
        timeout=30000,
    )
    # Allow autostart pipeline to fully boot and start its animations.
    time.sleep(10)

    running = read_running_animations(page) or []
    # ``running`` is a list of { type, assetRef, scope, ... } dicts.

    bad_pattern = re.compile(r"hull-flicker|power-outage", re.IGNORECASE)
    stray = [
        e for e in running
        if isinstance(e, dict) and bad_pattern.search(
            (e.get("type") or "") + "|" + (e.get("assetRef") or "")
        )
    ]
    assert not stray, (
        f"G1 backstop violated: stray flicker/outage animations running "
        f"at autostart: {stray}. Configuration in "
        f"config/runtime-active-animations.json says 13x solid-color, "
        f"so any flicker entry here indicates a pipeline override "
        f"regression."
    )


@pytest.fixture(autouse=True)
def _skip_if_no_ssr_publish(live_server):
    """Skip if SSR publishing is not active — G1 needs autostart to run."""
    import urllib.error
    import urllib.request
    port = live_server["port"]
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{port}/api/diag/ssr-screenshot",
            timeout=3.0,
        ) as resp:
            if resp.status == 503:
                pytest.skip("SSR_RENDER_HOST not active — G1 requires SSR")
    except urllib.error.HTTPError as e:
        if e.code == 503:
            pytest.skip("SSR_RENDER_HOST not active — G1 requires SSR")
    except Exception:
        pass
