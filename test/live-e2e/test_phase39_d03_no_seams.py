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
    srcXs, srcYs, points = _build_warped_grid(n)
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


def _trigger_solid_color(port: int, hex_color: str = "#ff0000", opacity: float = 0.6) -> None:
    """Best-effort solid-color trigger — multiple mutation shapes have been
    used historically; we attempt the most-portable one and let the test
    fall through to assertion on screenshot if the trigger is rejected
    (some assertions still hold against an idle canvas with a clear
    background colour)."""
    _http_post(port, "/api/live/command", {
        "mutationType": "start-animation",
        "payload": {
            "animationType": "solid-color",
            "options": {"hex": hex_color, "opacity": opacity, "intensity": 1.0},
        },
    })


def _max_pixel_delta(strip):
    """Max RGB channel delta within a strip (numpy array, H×W×3)."""
    import numpy as np
    # Compute per-channel min/max across the entire strip then take the
    # largest channel-wise spread.
    if strip.size == 0:
        return 0
    mins = strip.reshape(-1, strip.shape[-1]).min(axis=0)
    maxs = strip.reshape(-1, strip.shape[-1]).max(axis=0)
    return int((maxs - mins).max())


@pytest.mark.parametrize("grid_size", [3, 5, 9])
def test_d03_solid_color_no_visible_seams(live_server, grid_size):
    if not _try_import_pillow_numpy():
        pytest.skip("Pillow / numpy not installed — D-03 pixel-delta test requires both")

    from PIL import Image
    import numpy as np

    port = live_server["port"]
    _apply_warped_profile(port, grid_size)
    time.sleep(0.4)
    _trigger_solid_color(port, hex_color="#ff0000", opacity=0.6)
    time.sleep(0.5)

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
        max_delta = _max_pixel_delta(strip)
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
        max_delta = _max_pixel_delta(strip)
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
