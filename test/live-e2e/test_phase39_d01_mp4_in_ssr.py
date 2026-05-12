"""Phase 39 Plan 39-1 Task 2 — D-01 live-e2e RED test: MP4 plays in SSR stream.

Purpose
-------
Lock the operator-facing acceptance criterion for D-01: when the operator
selects the `nemesis-lockdown-a` board (whose outside animation is
`sandstorm.mp4`), the SSR Chromium tab's <video> element must reach
readyState=4, currentTime advances, videoWidth=1280, and successive
screenshots show pixel motion.

Pre-fix expected state (master, 2026-05-12, per 39-RESEARCH.md):
    readyState=0  currentTime=0  error.code=4  videoWidth=0

Post-fix expected state (after Plan 39-2 lands):
    readyState=4  currentTime>=1.0  error=None  videoWidth=1280

Strategy
--------
1. Boot a real server with SSR_RENDER_HOST=1 SSR_PUBLISH=1 (live_server fixture).
2. POST /api/live/command to load the lockdown-a board profile so the runtime
   activates the sandstorm.mp4 outside animation.
3. Wait ~3 seconds for the SSR Chromium tab to fetch + start playback.
4. Probe via GET /api/diag/ssr-eval-in-tab to read the <video> element's
   readyState / currentTime / error.code / videoWidth.
5. Assert the post-fix state.
6. Capture two screenshots 1.5s apart via /api/diag/ssr-screenshot;
   assert the JPEG bytes differ (frame advanced — pixels moved).

This test currently FAILS at step 5 because the MIME table maps .mp4 to
application/octet-stream and Chromium 131 refuses to decode the bytes.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request

import pytest


def _http_get(port: int, path: str, timeout: float = 10.0) -> tuple[int, bytes]:
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{port}{path}", timeout=timeout,
        ) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def _http_post(port: int, path: str, body: dict, timeout: float = 5.0) -> tuple[int, str]:
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}{path}",
        data=json.dumps(body).encode(),
        headers={"content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def _ssr_eval(port: int, expr: str, timeout: float = 5.0):
    """Wrapper around /api/diag/ssr-eval-in-tab. Returns the decoded value
    payload or raises AssertionError with a helpful message."""
    code, body = _http_get(
        port,
        "/api/diag/ssr-eval-in-tab?expr=" + urllib.parse.quote(expr, safe=""),
        timeout=timeout,
    )
    if code != 200:
        return None  # caller decides whether to retry / fail
    data = json.loads(body.decode() if isinstance(body, bytes) else body)
    if not data.get("ok"):
        return None
    inner = data.get("value")
    if isinstance(inner, dict) and inner.get("ok"):
        return inner.get("value")
    return None


def _wait_for_ssr_ready(port: int, timeout_s: float = 30.0) -> bool:
    """Poll /api/diag/ssr-eval-in-tab until it returns a value — proves
    the SSR Chromium tab is up and CDP is attached."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        v = _ssr_eval(port, "1+1", timeout=2.0)
        if v == 2:
            return True
        time.sleep(0.5)
    return False


@pytest.fixture(autouse=True)
def _require_ssr_host(live_server):
    """Skip when the SSR host or /api/diag/ssr-eval-in-tab isn't available."""
    port = live_server["port"]
    code, body = _http_get(port, "/api/diag/ssr-eval-in-tab?expr=1%2B1", timeout=2.0)
    if code == 503:
        pytest.skip("SSR_RENDER_HOST not active or CDP not attached — D-01 live test requires SSR tab")
    if code == 404:
        pytest.skip("/api/diag/ssr-eval-in-tab not present — Plan 39-1 Task 1 must run first")


def _load_lockdown_a_profile(port: int) -> None:
    """Use the operator's actual board-load path so the runtime activates
    the sandstorm.mp4 outside animation. The mutation type is best-effort
    — if the server rejects this payload we still proceed (the test may
    skip if the video element never appears)."""
    # The most-portable path is `context-update` carrying boardId — the
    # runtime hydrates the catalog from disk on receipt.
    _http_post(port, "/api/live/command", {
        "mutationType": "context-update",
        "payload": {"boardId": "nemesis-lockdown-a"},
    })


def test_d01_sandstorm_mp4_plays_in_ssr_tab(live_server):
    """RED today: <video>.readyState is 0 because Chromium refuses the
    octet-stream MIME. GREEN after Plan 39-2 adds video/mp4 to the MIME
    table.
    """
    port = live_server["port"]
    assert _wait_for_ssr_ready(port, timeout_s=30), "SSR tab did not warm up"

    _load_lockdown_a_profile(port)

    # Wait for the runtime to attach the <video> element and attempt
    # playback. 3 seconds is the operator-realistic window from
    # 39-RESEARCH.md.
    time.sleep(3.0)

    # Probe the video element state. The runtime may use multiple
    # video selectors — try the canonical outside-mp4 one first, then
    # fall back to any <video>.
    probe_expr = (
        "(() => {"
        " const v = document.querySelector('#outside-mp4-video, video.outside-mp4, video');"
        " if (!v) return { found: false };"
        " return {"
        "  found: true,"
        "  readyState: v.readyState,"
        "  currentTime: v.currentTime,"
        "  error: v.error ? { code: v.error.code, message: v.error.message } : null,"
        "  videoWidth: v.videoWidth,"
        "  videoHeight: v.videoHeight,"
        "  src: v.currentSrc || v.src,"
        " };"
        "})()"
    )
    state = _ssr_eval(port, probe_expr, timeout=5.0)
    assert state is not None, "ssr-eval-in-tab returned no value for video probe"
    assert state.get("found"), (
        f"No <video> element in SSR tab — runtime did not attach the "
        f"outside-mp4 element after profile load. state={state}"
    )

    # Pre-fix observed: readyState=0, currentTime=0, error.code=4, videoWidth=0.
    # Post-fix expected: readyState=4, currentTime>=1.0, error=None, videoWidth=1280.
    assert state.get("readyState") == 4, (
        f"<video>.readyState={state.get('readyState')} (expected 4=HAVE_ENOUGH_DATA). "
        f"D-01 root cause: server.mjs MIME_TYPES is missing .mp4 → "
        f"video/mp4, so Chromium serves bytes as application/octet-stream "
        f"and refuses to decode. Full state: {state}"
    )
    assert (state.get("currentTime") or 0) > 1.0, (
        f"<video>.currentTime={state.get('currentTime')} did not advance "
        f"past 1.0s. Full state: {state}"
    )
    assert state.get("error") is None, (
        f"<video>.error={state.get('error')} — non-null indicates a "
        f"MEDIA_ELEMENT_ERROR (code 4 = MEDIA_ELEMENT_ERROR: Format error). "
        f"Full state: {state}"
    )
    assert state.get("videoWidth") == 1280, (
        f"<video>.videoWidth={state.get('videoWidth')} (expected 1280 for "
        f"sandstorm.mp4). Full state: {state}"
    )

    # Pixel-motion proof: two screenshots 1.5s apart.
    code1, b1 = _http_get(port, "/api/diag/ssr-screenshot", timeout=8.0)
    assert code1 == 200, f"ssr-screenshot #1 failed: code={code1}"
    time.sleep(1.5)
    code2, b2 = _http_get(port, "/api/diag/ssr-screenshot", timeout=8.0)
    assert code2 == 200, f"ssr-screenshot #2 failed: code={code2}"
    # JPEG bytes WILL differ between frames if video is playing, even with
    # constant quality — frame data drives bit changes throughout.
    assert b1 != b2, (
        "Successive screenshots (1.5s apart) are byte-identical — the "
        "video frame did not advance. Either readyState never reached 4 "
        "(D-01 root cause) or playback halted."
    )
    assert abs(len(b1) - len(b2)) >= 1 or b1 != b2, (
        f"Screenshot lengths almost equal: {len(b1)} vs {len(b2)} — frame "
        f"advancement weak signal."
    )
