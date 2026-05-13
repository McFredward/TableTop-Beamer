"""Phase 39.1 — shared helpers for G1/G2/G3 RED tests.

DO NOT MODIFY WITHOUT RE-CHECKING ALL CONSUMERS:
  - test/live-e2e/test_phase39_1_g1_no_hull_flicker.py
  - test/live-e2e/test_phase39_1_g2_h264_no_seams.py
  - test/live-e2e/test_phase39_1_g3_board_switch_clean.py

Style note (deviation from 39.1-01-PLAN.md):
  The plan specified ``async def`` helpers consumed via
  ``@pytest.mark.asyncio``. The existing live-e2e fixture chain
  (``conftest.py``) launches the browser with ``sync_playwright()`` and
  ``pytest-asyncio`` is not installed in this environment. Switching to
  async would require a new fixture chain AND adding the asyncio
  pytest plugin — neither was in scope for Wave 0. The helpers are
  therefore SYNC functions that operate on the sync Playwright ``page``
  object plus an HTTP ``port``. All five helper NAMES and SEMANTICS
  match the plan; only the I/O style differs. Async signatures can be
  reintroduced cheaply later by wrapping each body in
  ``async def`` + ``await page.evaluate(...)`` once pytest-asyncio is
  added (39.1-01 SUMMARY documents this).
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request

__all__ = [
    "trigger_align_mode_on",
    "switch_board",
    "apply_warped_profile",
    "trigger_solid_color",
    "read_running_animations",
]


def _http_post(port: int, path: str, body: dict, timeout: float = 5.0):
    """POST JSON to the local server. Returns (status_code, body_text)."""
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


def _http_get(port: int, path: str, timeout: float = 5.0):
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{port}{path}", timeout=timeout,
        ) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def trigger_align_mode_on(page):
    """Enable align mode on /output/ and wait for boot-handle-ui mount.

    Plan §Task 1 contract: assert both
      - document.body.classList.contains('align-mode-active')
      - document.querySelectorAll('[data-grid-handle]').length > 0
    are true within 10s.

    Implementation drives align-mode via the same WS mutation path the UI
    toggle uses (``mutationType: "align-toggle"``, ``payload: {on: true}``)
    rather than clicking the off-screen toggle DOM element — the live-e2e
    tests boot /output/ headlessly without the operator toolbar visible,
    so the DOM-click path is not reliable. The mutation reaches
    output-align-mode-loader.js identically.
    """
    # Derive the server port from the page URL (live-e2e fixture pattern).
    url = page.url
    if "://" not in url:
        raise RuntimeError(f"page.url is not absolute: {url!r}")
    host_part = url.split("://", 1)[1].split("/", 1)[0]
    port = int(host_part.rsplit(":", 1)[1])

    code, _ = _http_post(port, "/api/live/command", {
        "mutationType": "align-toggle",
        "payload": {"on": True},
    })
    if code not in (200, 202):
        raise RuntimeError(f"align-toggle on rejected: {code}")

    page.wait_for_function(
        "document.body.classList.contains('align-mode-active') && "
        "document.querySelectorAll('[data-grid-handle]').length > 0",
        timeout=10000,
    )


def switch_board(page, board_id: str):
    """Switch the active board on /output/ via context-update mutation.

    Plan §Task 1 contract: helper makes a server-routed board change and
    waits for the live-session-update WS round-trip by polling the live
    snapshot until ``selectedBoard === board_id`` (5s).

    Deviation from plan literal wording: the plan said to POST to
    ``/api/live/board-switch`` (which does NOT exist in server.mjs —
    verified by ``grep -n "/api/live/board-switch" server.mjs`` → empty)
    or fall back to ``emitLiveMutation('board-switch', ...)`` (also not in
    ``LIVE_MUTATION_TYPES``). The real wire format is
    ``/api/live/command`` with ``mutationType: "context-update"`` and
    ``payload: {selectedBoard: <id>}`` — verified in server.mjs:149-168
    (LIVE_MUTATION_TYPES) and server.mjs:1189 (context-update branch).
    Semantics are identical: server records selectedBoard in the live
    session, broadcasts via WS, every /output/ converges.
    """
    url = page.url
    if "://" not in url:
        raise RuntimeError(f"page.url is not absolute: {url!r}")
    host_part = url.split("://", 1)[1].split("/", 1)[0]
    port = int(host_part.rsplit(":", 1)[1])

    code, _ = _http_post(port, "/api/live/command", {
        "mutationType": "context-update",
        "payload": {"selectedBoard": board_id},
    })
    if code not in (200, 202):
        raise RuntimeError(f"context-update selectedBoard={board_id} rejected: {code}")

    # Poll /api/live/snapshot for selectedBoard == board_id (up to 5s).
    deadline = time.time() + 5.0
    last_seen = None
    while time.time() < deadline:
        code, body = _http_get(port, "/api/live/snapshot", timeout=2.0)
        if code == 200:
            try:
                snap = json.loads(body.decode())
                last_seen = (
                    snap.get("snapshot", {})
                        .get("selectedBoard")
                )
                if last_seen == board_id:
                    return
            except Exception:
                pass
        time.sleep(0.1)
    raise TimeoutError(
        f"switch_board: selectedBoard never became {board_id!r} "
        f"(last_seen={last_seen!r}) within 5s"
    )


def apply_warped_profile(page, grid_size: int = 9):
    """Apply a non-identity grid_size×grid_size mesh-warp profile.

    Plan §Task 1 contract: signature must match the helper in
    ``test_phase39_d03_no_seams.py``. Same wire shape
    (mutationType=align-grid-snapshot, srcXs/srcYs/points). The plan
    requires alignMode to remain ON after this helper returns (the
    G2 test will be capturing solid-color frames over warped geometry
    while align-mode is active so we exercise the same path the
    operator does during UAT). The d03 helper turned alignMode OFF
    again because that test compared CDP screenshots — we keep ON.
    """
    if grid_size not in (3, 5, 9):
        raise ValueError(f"grid_size must be one of {{3, 5, 9}}, got {grid_size}")

    url = page.url
    if "://" not in url:
        raise RuntimeError(f"page.url is not absolute: {url!r}")
    host_part = url.split("://", 1)[1].split("/", 1)[0]
    port = int(host_part.rsplit(":", 1)[1])

    # Non-identity warp: push interior corners inward by eps (~5%).
    eps = 0.05
    n = grid_size
    srcXs = [i / (n - 1) for i in range(n)]
    srcYs = [i / (n - 1) for i in range(n)]
    points = []
    for r in range(n):
        for c in range(n):
            x = srcXs[c]
            y = srcYs[r]
            if 0 < c < n - 1:
                x = max(0.0, x - eps)
            if 0 < r < n - 1:
                y = max(0.0, y - eps)
            points.append({"row": r, "col": c, "x": x, "y": y})

    code, _ = _http_post(port, "/api/live/command", {
        "mutationType": "context-update",
        "payload": {"alignMode": True},
    })
    if code not in (200, 202):
        raise RuntimeError(f"context-update alignMode-on rejected: {code}")

    code, _ = _http_post(port, "/api/live/command", {
        "mutationType": "align-grid-snapshot",
        "payload": {
            "srcXs": srcXs,
            "srcYs": srcYs,
            "points": points,
            "profileId": f"phase39_1-g2-{n}x{n}",
        },
    })
    if code not in (200, 202):
        raise RuntimeError(f"align-grid-snapshot {n}x{n} rejected: {code}")


def trigger_solid_color(page, hex_color: str = "#ff0000", opacity: float = 1.0):
    """Trigger a global solid-color animation across all rooms.

    Plan §Task 1 contract: signature must match the helper in
    ``test_phase39_d03_no_seams.py``. Same wire shape
    (mutationType=trigger-global, animationType=solid-color).
    Defaults to OPAQUE red (opacity=1.0) because the G2 seam test wants
    the worst-case visibility scenario, vs d03's 0.6 alpha.
    """
    url = page.url
    if "://" not in url:
        raise RuntimeError(f"page.url is not absolute: {url!r}")
    host_part = url.split("://", 1)[1].split("/", 1)[0]
    port = int(host_part.rsplit(":", 1)[1])

    code, _ = _http_post(port, "/api/live/command", {
        "mutationType": "trigger-global",
        "payload": {
            "animationType": "solid-color",
            "action": "start",
            "boardId": "nemesis-board-a",
            "outsideHint": False,
            "loopUntilStopped": True,
            "playSound": False,
            "animation": {
                "type": "solid-color",
                "scope": "global",
                "intensity": 1.0,
                "speed": 1.0,
                "opacity": opacity,
                "hold": True,
                "durationSec": 0,
                "options": {"hex": hex_color, "opacity": opacity, "intensity": 1.0},
            },
        },
    })
    if code not in (200, 202):
        raise RuntimeError(f"trigger-global solid-color rejected: {code}")


def read_running_animations(page):
    """Return the list of currently-running animations from the SSR tab.

    Plan §Task 1 contract: queries
    ``window.__TT_BEAMER_STATE_FOR_DIAG__?.runningAnimations`` via the
    Phase 39 Plan 39-1 ``/api/diag/ssr-eval-in-tab`` endpoint (verified
    live at server.mjs:3718).

    Returns the runningAnimations array as a Python list, or [] if the
    eval endpoint returns no result / undefined.
    """
    url = page.url
    if "://" not in url:
        raise RuntimeError(f"page.url is not absolute: {url!r}")
    host_part = url.split("://", 1)[1].split("/", 1)[0]
    port = int(host_part.rsplit(":", 1)[1])

    # Use the SSR-eval-in-tab endpoint (queries the SSR Chromium tab, NOT
    # the current /output/ page — but runtime-orchestration.js publishes
    # __TT_BEAMER_STATE_FOR_DIAG__ on every page that runs the runtime).
    expr = (
        "JSON.stringify("
        "(window.__TT_BEAMER_STATE_FOR_DIAG__ && "
        "window.__TT_BEAMER_STATE_FOR_DIAG__.runningAnimations) || []"
        ")"
    )
    import urllib.parse
    path = "/api/diag/ssr-eval-in-tab?expr=" + urllib.parse.quote(expr)
    code, body = _http_get(port, path, timeout=5.0)
    if code != 200:
        # Fallback: ask the current /output/ page itself.
        try:
            return page.evaluate(
                "() => (window.__TT_BEAMER_STATE_FOR_DIAG__ && "
                "window.__TT_BEAMER_STATE_FOR_DIAG__.runningAnimations) || []"
            )
        except Exception:
            return []
    try:
        wrapper = json.loads(body.decode())
        # /api/diag/ssr-eval-in-tab returns { result: "<stringified>" }
        # or { value: ... } depending on server version.
        if isinstance(wrapper, dict):
            inner = wrapper.get("result") or wrapper.get("value")
            if isinstance(inner, str):
                return json.loads(inner)
            if isinstance(inner, list):
                return inner
            return []
        if isinstance(wrapper, list):
            return wrapper
    except Exception:
        return []
    return []
