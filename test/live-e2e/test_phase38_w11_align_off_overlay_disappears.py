"""Phase 38 W11 — Align-mode-off must tear down Pi /output/'s overlay.

Operator UAT 2026-05-12: "Das deaktivieren des Align Modes funktioniert
aktuell nicht mehr. /output/ overlay bleibt aktiv - SSR deaktiviert wie
erwartet die room-outlines."

Root cause: handler-deletion-during-Set-iteration race. The
output-align-mode-loader subscribes to onAlignModeChange FIRST (module
init). boot-handle-ui's subscription is added LATER (during activate()).
When align-off fires, the loader's handler runs first → deactivate() →
stop() → _offAlignModeChange() removes boot-handle-ui's handler from
the Set. JavaScript Set iteration skips items deleted before visiting,
so boot-handle-ui's listener (which would call HANDLE_UI.onAlignModeChange(false)
to tear down handles + lineCanvas + room polygons) NEVER fires.

Fix: stop() in boot-handle-ui.js calls HANDLE_UI.onAlignModeChange(false)
BEFORE unsubscribing the listeners. Teardown runs regardless of the
iteration-deletion race.

This test:
1. Opens Pi /output/
2. Toggles align-mode ON  → asserts handles + lineCanvas DOM exists
3. Toggles align-mode OFF → asserts handles + lineCanvas DOM GONE
"""
from __future__ import annotations
import json, time, urllib.request
import pytest
from _flake_retry import flaky_3x


def _post_json(port, path, body):
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}{path}",
        data=json.dumps(body).encode(),
        headers={"content-type": "application/json"},
    )
    resp = urllib.request.urlopen(req, timeout=5)
    return resp.status, resp.read().decode()


def _toggle_align_mode(port, on):
    code, _ = _post_json(port, "/api/live/command", {
        "mutationType": "context-update",
        "payload": {"alignMode": bool(on)},
    })
    assert code in (200, 202)


def _count_handles(page) -> dict:
    return page.evaluate("""() => ({
        cornerHandles: document.querySelectorAll('.projection-corner-handle').length,
        gridHandles: document.querySelectorAll('.projection-grid-handle').length,
        lineCanvas: document.getElementById('projection-grid-line-canvas') ? 1 : 0,
        alignModeClass: document.body.classList.contains('align-mode-active') ? 1 : 0,
    })""")


@flaky_3x
def test_phase38_w11_overlay_disappears_on_align_off(live_server, page):
    """Toggle align-mode on then off; overlay DOM must be torn down."""
    port = live_server["port"]
    page.goto(
        f"http://127.0.0.1:{port}/output/",
        wait_until="domcontentloaded",
        timeout=15_000,
    )
    page.wait_for_function(
        "document.querySelector('video.ssr-video, video')?.readyState === 4",
        timeout=10_000,
    )

    # Toggle ON
    _toggle_align_mode(port, True)
    page.wait_for_function(
        "document.querySelectorAll('.projection-corner-handle').length > 0",
        timeout=5_000,
    )
    on_state = _count_handles(page)
    assert on_state["cornerHandles"] > 0, f"handles never appeared: {on_state}"
    assert on_state["lineCanvas"] == 1, f"lineCanvas missing on align-on: {on_state}"
    assert on_state["alignModeClass"] == 1, f"align-mode-active class missing: {on_state}"

    # Toggle OFF
    _toggle_align_mode(port, False)
    # Allow up to 2s for the teardown to propagate through the WS roundtrip
    deadline = time.time() + 2.0
    off_state = on_state
    while time.time() < deadline:
        off_state = _count_handles(page)
        if (off_state["cornerHandles"] == 0
                and off_state["lineCanvas"] == 0
                and off_state["alignModeClass"] == 0):
            break
        time.sleep(0.1)

    assert off_state["cornerHandles"] == 0, (
        f"Corner handles STILL VISIBLE after align-off: {off_state}\n"
        f"This is the W11 bug — boot-handle-ui's stop() didn't tear down "
        f"because its onAlignModeChange listener was unsubscribed by the "
        f"loader's deactivate before being visited in the Set iteration."
    )
    assert off_state["lineCanvas"] == 0, (
        f"#projection-grid-line-canvas STILL in DOM after align-off: {off_state}"
    )
    assert off_state["alignModeClass"] == 0, (
        f"body.align-mode-active class STILL set after align-off: {off_state}"
    )
