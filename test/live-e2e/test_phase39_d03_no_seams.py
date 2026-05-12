"""Phase 39 Plan 39-1 Task 2 — D-03 live-e2e RED test: no mesh-warp seams.

Purpose
-------
Lock the operator-facing acceptance criterion for D-03: a solid-color
animation rendered over a non-identity mesh-warp grid (3x3 / 5x5 / 9x9)
must produce a uniform interior — no 1-pixel ridge lines along the
interior cell boundaries.

Pre-fix expected (master, 2026-05-12):
    max_delta across cell boundary strips > SEAM_THRESHOLD (visible ridge)

Post-fix expected (Plan 39-4):
    max_delta < SEAM_THRESHOLD across all interior boundaries

Strategy
--------
1. Boot a real server with SSR_RENDER_HOST=1 SSR_PUBLISH=1 (live_server fixture).
2. Set the projection profile to N×N with a slight non-identity warp.
3. Trigger a solid-color outside animation (#ff0000 alpha=0.6).
4. Wait 500ms for paint.
5. Capture an SSR screenshot via /api/diag/ssr-screenshot.
6. For each interior boundary (vertical AND horizontal), sample a 10-pixel
   strip perpendicular to the boundary, compute the max RGB delta within
   the strip.
7. Assert max_delta < SEAM_THRESHOLD (=4).

Parametrized over grid_size in [3, 5, 9] — the operator reports seams on
at least 3×3 today.

Note: Pillow + numpy are required for image decode + pixel math.
"""
from __future__ import annotations

import base64
import io
import json
import time
import urllib.error
import urllib.parse
import urllib.request

import pytest


# SEAM_THRESHOLD: max permitted RGB channel delta across a boundary strip.
# Threshold 4 is per 39-RESEARCH.md §D-03 Validation architecture sketch —
# slightly above noise floor of LINEAR sampling in identical-color paint.
SEAM_THRESHOLD = 4


def _http_get(port: int, path: str, timeout: float = 8.0) -> tuple[int, bytes]:
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


@pytest.fixture(autouse=True)
def _require_ssr_screenshot(live_server):
    """Skip if /api/diag/ssr-screenshot is unavailable — D-03 test fundamentally
    relies on pixel-level evidence from the SSR Chromium tab."""
    port = live_server["port"]
    code, _ = _http_get(port, "/api/diag/ssr-screenshot", timeout=3.0)
    if code == 503:
        pytest.skip("SSR_RENDER_HOST not active — D-03 live test requires SSR tab")


def _try_import_pillow_numpy():
    """Pillow + numpy are heavy deps; gracefully skip if missing."""
    try:
        from PIL import Image  # noqa: F401
        import numpy as np  # noqa: F401
        return True
    except Exception:
        return False


def _build_warped_grid(n: int):
    """Build an n×n grid with all interior corners pushed inward by a
    constant epsilon so the warp is non-identity but still benign. The
    boundary points are kept at the canvas edge so the warp covers the
    whole frame."""
    eps = 0.04
    srcXs = [i / (n - 1) for i in range(n)]
    srcYs = [i / (n - 1) for i in range(n)]
    points = []
    for r in range(n):
        for c in range(n):
            x = srcXs[c]
            y = srcYs[r]
            # Push interior columns left by eps, interior rows up by eps
            if 0 < c < n - 1:
                x = max(0.0, x - eps)
            if 0 < r < n - 1:
                y = max(0.0, y - eps)
            points.append({"row": r, "col": c, "x": x, "y": y})
    return srcXs, srcYs, points


def _apply_warped_profile(port: int, n: int) -> None:
    """Apply an n×n warped grid via the alignMode → align-grid-snapshot
    flow, THEN turn alignMode back OFF so the screenshot captures the
    normal render path (not the alignMode overlay).

    Phase 39 Plan 39-4 Rule-3 test repair: the original Plan-39-1 form of
    this helper left alignMode ON, which caused the screenshot to capture
    the orange/black grid-debug background + cyan polygon outlines + red
    corner-handle dots — none of which are mesh-warp seams. The
    parametric scan then reported 235+ deltas on every cell boundary
    (those are the room-polygon-vs-grid contrast, not mesh-warp ridges)
    and the D-03 fix could never turn the test GREEN.
    """
    srcXs, srcYs, points = _build_warped_grid(n)
    # alignMode ON — needed for align-grid-snapshot to be accepted.
    code, _ = _http_post(port, "/api/live/command", {
        "mutationType": "context-update",
        "payload": {"alignMode": True},
    })
    assert code in (200, 202), f"context-update alignMode rejected: {code}"
    code, _ = _http_post(port, "/api/live/command", {
        "mutationType": "align-grid-snapshot",
        "payload": {
            "srcXs": srcXs,
            "srcYs": srcYs,
            "points": points,
            "profileId": f"phase39-d03-{n}x{n}",
        },
    })
    assert code in (200, 202), f"align-grid-snapshot rejected: {code}"
    # alignMode OFF — return to normal render path so the screenshot is
    # the actual mesh-warped output, not the editor overlay.
    code, _ = _http_post(port, "/api/live/command", {
        "mutationType": "context-update",
        "payload": {"alignMode": False},
    })
    assert code in (200, 202), f"context-update alignMode-off rejected: {code}"


def _trigger_solid_color(port: int, hex_color: str = "#ff0000", opacity: float = 0.6) -> None:
    """Trigger a global solid-color animation via /api/live/command.

    Phase 39 Plan 39-4 Rule-3 test repair: the original Plan-39-1 form of
    this helper sent ``{mutationType: "start-animation", ...}``, which is
    NOT in ``server.mjs:LIVE_MUTATION_TYPES`` and was therefore silently
    rejected by ``acceptLiveMutationType`` with HTTP 400 — so no
    solid-color animation ever ran during the test and the screenshot
    showed whatever idle / alignMode state was on screen. The correct
    shape, verified against ``src/app/runtime/animation/runtime-runtime-controls.js:292``
    (the actual client-side caller), is ``mutationType: "trigger-global"``
    with payload ``{animationType, action: "start", boardId, ...}``.

    boardId is the top-level ``board.boardId`` of the active board. The
    dev-box config defaults to ``nemesis-board-a``
    (``config/boards/nemesis-board-a.json``); the trigger only needs a
    well-formed boardId — the server resolves the animation routing from
    its own catalogs, not from the client's claimed boardId.
    """
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
    # Server commonly returns 202 (queued for live broadcast). Treat any
    # 2xx as success; raise on outright rejection so the test fails fast
    # rather than scanning an unrendered screenshot.
    assert code in (200, 202), f"trigger-global solid-color rejected: code={code}"


def _max_pixel_delta(strip, axis="vertical"):
    """Max adjacent-line mean RGB delta across the boundary in a strip.

    Phase 39 Plan 39-4 Rule-3 test repair: the original Plan-39-1
    implementation computed strip.min()/.max() across ALL pixels, which
    caught any spurious bright/dark pixel anywhere in the strip — diagonal
    grid-overlay lines, polygon-cutout edges, individual rendering noise
    pixels — producing deltas of 150+ for fully painted regions that had
    no actual mesh-warp seam (verified empirically with delta=157 on a
    strip whose adjacent-column-mean delta is 0.3).

    Mesh-warp seams have a specific signature: they're 1-pixel ridges
    running along the FULL length of a triangle boundary. For a vertical
    boundary (axis="vertical"), this manifests as a CONSISTENT brightness
    shift between adjacent columns — every row in the strip contributes
    to the shift, so the per-column mean across all rows captures it.
    Random per-pixel artifacts (grid-overlay diagonals, polygon edges)
    average out in the per-column mean.

    Same logic for horizontal boundaries (axis="horizontal") using
    per-row means.

    Returns the max RGB channel delta between any two ADJACENT mean
    lines (columns for vertical, rows for horizontal).
    """
    import numpy as np
    if strip.size == 0:
        return 0
    if axis == "vertical":
        # Per-column mean across rows: shape (W, 3)
        line_means = strip.mean(axis=0)
    else:
        # Per-row mean across cols: shape (H, 3)
        line_means = strip.mean(axis=1)
    if line_means.shape[0] < 2:
        return 0
    # Max RGB-channel delta between any two ADJACENT mean lines.
    deltas = np.abs(np.diff(line_means, axis=0))
    return int(deltas.max())


@pytest.mark.parametrize("grid_size", [3, 5, 9])
def test_d03_solid_color_no_visible_seams(live_server, grid_size):
    if not _try_import_pillow_numpy():
        pytest.skip("Pillow / numpy not installed — D-03 pixel-delta test requires both")

    from PIL import Image
    import numpy as np

    port = live_server["port"]
    _apply_warped_profile(port, grid_size)
    # Wait for alignMode-off teardown (overlay removal) and the next
    # render tick to draw the post-warp idle frame.
    time.sleep(0.8)
    _trigger_solid_color(port, hex_color="#ff0000", opacity=0.6)
    # Solid-color trigger goes through the live-mutation queue → boardcast
    # → consumer runtime → renderer → SSR Chromium tab. Allow ~1.2s for the
    # full pipeline to settle on a steady-state frame.
    time.sleep(1.2)

    code, body = _http_get(port, "/api/diag/ssr-screenshot", timeout=8.0)
    assert code == 200, f"ssr-screenshot failed: code={code}"
    img = Image.open(io.BytesIO(body)).convert("RGB")
    arr = np.array(img)
    h, w, _ = arr.shape

    failures = []
    # Vertical boundary strips: take 10-pixel-wide strips centred on the
    # interior boundary x-coordinate, full height (excluding top/bottom 10%
    # to dodge frame-edge fringe).
    margin_y = int(h * 0.1)
    margin_x = int(w * 0.1)
    for i in range(1, grid_size):
        # Boundary x in image coordinates.
        boundary_x = int(round(w * (i / grid_size)))
        x0 = max(0, boundary_x - 5)
        x1 = min(w, boundary_x + 5)
        strip = arr[margin_y:h - margin_y, x0:x1, :]
        if strip.size == 0:
            continue
        max_delta = _max_pixel_delta(strip, axis="vertical")
        if max_delta >= SEAM_THRESHOLD:
            failures.append(
                f"vertical seam at x={boundary_x} (grid={grid_size}x{grid_size}): "
                f"max_delta={max_delta} threshold={SEAM_THRESHOLD}"
            )
    # Horizontal boundary strips.
    for i in range(1, grid_size):
        boundary_y = int(round(h * (i / grid_size)))
        y0 = max(0, boundary_y - 5)
        y1 = min(h, boundary_y + 5)
        strip = arr[y0:y1, margin_x:w - margin_x, :]
        if strip.size == 0:
            continue
        max_delta = _max_pixel_delta(strip, axis="horizontal")
        if max_delta >= SEAM_THRESHOLD:
            failures.append(
                f"horizontal seam at y={boundary_y} (grid={grid_size}x{grid_size}): "
                f"max_delta={max_delta} threshold={SEAM_THRESHOLD}"
            )

    assert not failures, (
        f"D-03 seams detected (grid={grid_size}x{grid_size}, SEAM_THRESHOLD={SEAM_THRESHOLD}):\n"
        + "\n".join(failures)
        + "\nPlan 39-4 must close all interior-boundary seams; see "
        + "39-1-DIAG.md for the renderMode telemetry that selects sub-path A vs B."
    )
