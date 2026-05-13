"""Phase 39.1 G2 RED test — H.264 stream-pipeline seam detection.

THIS test captures pixels from the H.264-decoded ``<video>`` element on
the Pi /output/ tab. It is the EXPLICIT counter-anti-pattern to Phase 39
Plan 39-4's ``test_phase39_d03_no_seams.py``, which captured pixels via
the CDP JPEG screenshot RPC (quality=60) — that capture path samples
the GL framebuffer BEFORE the
``getDisplayMedia`` → H.264 encode → mediasoup → Pi decode pipeline
even runs. Phase 39 fell into that anti-pattern: D-03 reported
``max_delta=0`` and Phase 39 closed automated, but the operator's UAT
on 2026-05-13 reported that seams were STILL visible because the
operator's stream is the H.264-decoded ``<video>`` element, not the
JPEG diagnostic screenshot.

See .planning/CRITICAL_KNOWN_BUGS.md #5 for the full anti-pattern
post-mortem. NEVER replace the ``<video>``-element + ``drawImage(v, ...)``
capture path below with the high-level page screenshotting helper nor
with the CDP screenshotting RPC — doing so would silently regress G2
back to Phase 39's false-green
state.

Status (Wave 0): RED today. Wave 1 (39.1-2) lands the bitrate bump
(``serverRendering.bitrate`` to high) + the 2-px mesh-cell-overlap
shader edit, after which this test must turn GREEN.
"""
from __future__ import annotations

import time

import pytest

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from helpers import apply_warped_profile, trigger_solid_color  # noqa: E402


# Carry-forward from Phase 39-4 D-03 threshold. Phase 39 Plan 39-RESEARCH
# §G2 confirmed 4 is roughly the noise floor of LINEAR sampling in an
# identical-color fill, ABOVE which a seam is operator-visible.
SEAM_THRESHOLD = 4
STRIP_WIDTH = 10  # 10-pixel-wide vertical strip centered on each boundary


def test_g2_h264_stream_no_seams_grid9(live_server, page):
    """G2: solid-color over 9x9 warp produces no operator-visible seams.

    Captures pixels from the H.264-decoded ``<video>`` element via
    offscreen canvas + getImageData. Asserts the max mean adjacent-column
    RGB delta along EACH interior cell boundary (i=1..8 of 0..9) is below
    SEAM_THRESHOLD. Excludes the outermost boundaries (i=0 and i=9) per
    R2.1 — those are viewport-edge / triangle-inflate clip artifacts.
    """
    port = live_server["port"]
    page.goto(f"http://127.0.0.1:{port}/output/")

    # CRITICAL: wait for actual H.264 WebRTC track attach to <video>.
    # NOT JPEG-CDP screenshot. The fact that <video>.videoWidth > 0
    # proves the H.264 track is attached, decoded, and producing frames.
    page.wait_for_function(
        "document.querySelector('video') && "
        "document.querySelector('video').videoWidth > 0",
        timeout=30000,
    )
    # Let the stream stabilize through H.264 keyframes (GOP ~= 2s per
    # QUALITY_PRESETS in config/global-defaults.json).
    time.sleep(5)

    # Apply a non-identity 9x9 warped grid (interior points shifted ~5%).
    apply_warped_profile(page, grid_size=9)
    # Trigger uniform-red solid-color on all rooms (opaque — worst case
    # for seam visibility).
    trigger_solid_color(page)
    # Let geometry change propagate through:
    #   GL → getDisplayMedia → H.264 encode → mediasoup → Pi decode.
    time.sleep(2)

    # CAPTURE PIXELS FROM <video> ELEMENT (H.264-decoded operator-
    # visible pixels). EXPLICITLY NOT the Playwright page screenshotting
    # helper nor the CDP screenshotting RPC — those would be JPEG-
    # recompressed and would NOT exercise the operator pipeline.
    pixels_bytes = page.evaluate("""
        () => {
            const v = document.querySelector('video');
            if (!v || !v.videoWidth) return null;
            const c = document.createElement('canvas');
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            const cx = c.getContext('2d');
            cx.drawImage(v, 0, 0);
            const data = cx.getImageData(0, 0, c.width, c.height).data;
            return { w: c.width, h: c.height, data: Array.from(data) };
        }
    """)
    assert pixels_bytes is not None, (
        "video element returned no pixels — H.264 track was not attached "
        "(videoWidth=0). Test cannot proceed without a real stream."
    )

    w = pixels_bytes["w"]
    h = pixels_bytes["h"]
    data = pixels_bytes["data"]

    failures = []
    # Interior cell boundaries for a 9x9 grid: pixel x at i*(w/9)
    # for i in [1..8]. SKIP outermost (i=0 and i=9).
    for i in range(1, 9):
        boundary_x = int(round(i * w / 9))
        x_start = max(0, boundary_x - STRIP_WIDTH // 2)
        x_end = min(w - 1, boundary_x + STRIP_WIDTH // 2)

        total_delta = 0.0
        sample_count = 0
        for x in range(x_start, x_end):
            # Compare column x to column x+1; average over all rows.
            row_delta = 0
            for y in range(h):
                idx_a = (y * w + x) * 4
                idx_b = (y * w + x + 1) * 4
                row_delta += (
                    abs(data[idx_a] - data[idx_b])
                    + abs(data[idx_a + 1] - data[idx_b + 1])
                    + abs(data[idx_a + 2] - data[idx_b + 2])
                )
            total_delta += row_delta / h / 3  # mean per-channel for this pair
            sample_count += 1
        mean_delta = total_delta / max(sample_count, 1)
        if mean_delta >= SEAM_THRESHOLD:
            failures.append((boundary_x, round(mean_delta, 2)))

    assert not failures, (
        f"H.264 stream shows seams at interior boundaries: {failures} "
        f"(threshold={SEAM_THRESHOLD}, grid=9x9). "
        f"This test captures pixels from <video> via drawImage(v) "
        f"(H.264-decoded), NOT a CDP JPEG screenshot — failure here "
        f"= operator-visible seams. See "
        f".planning/CRITICAL_KNOWN_BUGS.md #5."
    )


@pytest.fixture(autouse=True)
def _skip_if_no_ssr_publish(live_server):
    """Skip if SSR publishing is not active — G2 fundamentally requires a
    H.264 WebRTC track to capture pixels from. The test will hang at
    wait_for_function otherwise."""
    import urllib.error
    import urllib.request
    port = live_server["port"]
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{port}/api/diag/ssr-screenshot",
            timeout=3.0,
        ) as resp:
            if resp.status == 503:
                pytest.skip("SSR_RENDER_HOST not active — G2 requires SSR")
    except urllib.error.HTTPError as e:
        if e.code == 503:
            pytest.skip("SSR_RENDER_HOST not active — G2 requires SSR")
    except Exception:
        pass
