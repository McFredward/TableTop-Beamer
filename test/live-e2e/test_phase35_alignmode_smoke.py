"""
Phase 35 D-05 — live-E2E smoke for /output/ thin path + align-mode (a-f).

The 6 D-05 assertions, each a separate pytest test function:

  a) test_ready_state          — videoReadyState === 4 within 10s
  b) test_current_time         — videoCurrentTime > 5 after 8s wait
  c) test_bg_color             — body backgroundColor === "rgb(0, 0, 0)"
  d) test_server_log_clean     — zero "health ping failed" in server stderr
  e) test_handles_visible      — alignMode handles in DOM and visible
  f) test_drag_triggers_mut    — pointer-drag triggers `align-corner-drag`
                                 (observed via [input-forwarder] sent phase=start
                                 console log)

RED-on-master expectation:
  - a, b, c, d should PASS on current master (the /output/ thin path already
    delivers video and a clean server log post-Phase-34).
  - e, f are GATED on Track A (35-A-PLAN — bootAlignMode landing). They will
    FAIL on current master because /output/ does not yet render
    `.projection-corner-handle` elements. That RED state is correct — they
    transition to GREEN automatically when 35-A-PLAN lands. The Wave-0 rail's
    job is to MAKE the assertions executable (not to make them pass yet).

All tests use the @flaky_3x decorator per CONTEXT.md A5 (3× inline retry +
opt-in skip on WAVE0_FLAKE_TOLERANCE=1).
"""

from __future__ import annotations

import json
import time
import urllib.request

import pytest

from _flake_retry import flaky_3x


VIDEO_QUERY = "document.querySelector('video.ssr-video, video')"


def _trigger_align_mode(port: int) -> None:
    """POST /api/live/command to enable alignMode globally.

    Phase 35 35-B deferred-items.md: server.mjs exposes /api/live/command
    (POST) and /api/live/snapshot (GET); the original /api/live/mutate path
    used in Wave-0 W0 does not exist. The accepted body shape is
    {mutationType, payload, ...}. Track A fix: route to /api/live/command.
    """
    body = json.dumps(
        {
            "mutationType": "context-update",
            "payload": {"alignMode": True},
        }
    ).encode()
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}/api/live/command",
        data=body,
        headers={"content-type": "application/json"},
    )
    urllib.request.urlopen(req, timeout=5).read()


# ──────────────────────────────────────────────────────────────────────────
# D-05 (a): videoReadyState === 4 within 10s
# ──────────────────────────────────────────────────────────────────────────
@flaky_3x
def test_ready_state(live_server, page):
    page.goto(
        f"http://127.0.0.1:{live_server['port']}/output/",
        wait_until="domcontentloaded",
        timeout=15_000,
    )
    page.wait_for_function(
        f"{VIDEO_QUERY}?.readyState === 4",
        timeout=10_000,
    )


# ──────────────────────────────────────────────────────────────────────────
# D-05 (b): videoCurrentTime > 5 after 8s wait
# ──────────────────────────────────────────────────────────────────────────
@flaky_3x
def test_current_time(live_server, page):
    page.goto(
        f"http://127.0.0.1:{live_server['port']}/output/",
        wait_until="domcontentloaded",
        timeout=15_000,
    )
    page.wait_for_function(
        f"{VIDEO_QUERY}?.readyState === 4",
        timeout=10_000,
    )
    time.sleep(8)
    ct = page.evaluate(f"{VIDEO_QUERY}.currentTime")
    assert ct is not None and ct > 5, f"videoCurrentTime={ct} (expected > 5)"


# ──────────────────────────────────────────────────────────────────────────
# D-05 (c): body backgroundColor === "rgb(0, 0, 0)"
# ──────────────────────────────────────────────────────────────────────────
@flaky_3x
def test_bg_color(live_server, page):
    page.goto(
        f"http://127.0.0.1:{live_server['port']}/output/",
        wait_until="domcontentloaded",
        timeout=15_000,
    )
    bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
    assert bg == "rgb(0, 0, 0)", f"body backgroundColor={bg}"


# ──────────────────────────────────────────────────────────────────────────
# D-05 (d): zero "health ping failed" in server stderr after 30s steady-state
# ──────────────────────────────────────────────────────────────────────────
@flaky_3x
def test_server_log_clean(live_server, page):
    page.goto(
        f"http://127.0.0.1:{live_server['port']}/output/",
        wait_until="domcontentloaded",
        timeout=15_000,
    )
    # 30s steady-state observation
    time.sleep(30)
    with open(live_server["stderr_path"], "r", encoding="utf-8", errors="replace") as f:
        log = f.read()
    assert "health ping failed" not in log, (
        f"server stderr contained 'health ping failed':\n"
        f"{log[-2000:]}"
    )


# ──────────────────────────────────────────────────────────────────────────
# D-05 (e): align-mode handles in DOM and visible (RED on master — Track A gate)
# ──────────────────────────────────────────────────────────────────────────
@flaky_3x
def test_handles_visible(live_server, page):
    page.goto(
        f"http://127.0.0.1:{live_server['port']}/output/",
        wait_until="domcontentloaded",
        timeout=15_000,
    )
    page.wait_for_function(
        f"{VIDEO_QUERY}?.readyState === 4",
        timeout=10_000,
    )
    _trigger_align_mode(live_server["port"])
    # Wait up to 5s for handles to appear
    page.wait_for_function(
        "document.querySelectorAll('.projection-corner-handle').length > 0",
        timeout=5_000,
    )
    visible = page.evaluate(
        "Array.from(document.querySelectorAll('.projection-corner-handle'))"
        ".every(el => el.offsetWidth > 0 && el.offsetHeight > 0)"
    )
    assert visible, "handles exist but not visible"


# ──────────────────────────────────────────────────────────────────────────
# D-05 (f): pointer-drag triggers align-corner-drag mutation
#           (observed via "[input-forwarder] sent phase=start" console log)
#           — RED on master (Track A gate, same as test_handles_visible)
# ──────────────────────────────────────────────────────────────────────────
@flaky_3x
def test_drag_triggers_mutation(live_server, page):
    console_lines: list[str] = []
    page.on("console", lambda m: console_lines.append(m.text))

    page.goto(
        f"http://127.0.0.1:{live_server['port']}/output/",
        wait_until="domcontentloaded",
        timeout=15_000,
    )
    page.wait_for_function(
        f"{VIDEO_QUERY}?.readyState === 4",
        timeout=10_000,
    )
    _trigger_align_mode(live_server["port"])
    page.wait_for_function(
        "document.querySelectorAll('.projection-corner-handle').length > 0",
        timeout=5_000,
    )
    handle = page.locator(".projection-corner-handle").first
    box = handle.bounding_box()
    assert box is not None, "first handle has no bounding box"
    cx = box["x"] + box["width"] / 2
    cy = box["y"] + box["height"] / 2
    page.mouse.move(cx, cy)
    page.mouse.down()
    page.mouse.move(cx + 10, cy + 10, steps=5)
    page.mouse.up()
    time.sleep(1)

    matched = any(
        "[input-forwarder] sent phase=start" in line for line in console_lines
    )
    assert matched, (
        "no input-forwarder phase=start log captured. "
        f"recent console lines:\n" + "\n".join(console_lines[-20:])
    )
