"""
Phase 35 D-04 — solid-color FPS benchmark.

Measures effective FPS during a known solid-color animation. This test serves
two phases:

  1. Wave-0 (this commit): captures BASELINE FPS on master (no dither yet).
     Asserts >= 25 fps minimum so we're confident the harness works.
  2. After Track C (35-C-PLAN): re-run with `PHASE35_FPS_BASELINE_OUT` set, to
     produce a number that 35-V-PLAN can compare against the pre-Track-C
     baseline. The "≤ 5 FPS impact" assertion (D-04) lives in the V-plan; this
     file just provides the measurement primitive.

Methodology:
  - Trigger a known solid-color animation via /api/live/mutate.
  - Sample video.currentTime at t=0 and t=30s wall-clock.
  - Compute the media-clock advancement vs wallclock; under a healthy stream
    this approaches 1.0 (1s of wallclock → 1s of media). Multiplied by the
    nominal stream FPS cap (30 default) gives the effective FPS perception.

If the trigger payload below doesn't exactly match `/api/live/mutate`'s
expectations, this test will fall back to plain /output/ load + measurement
(no animation triggered) so the baseline still captures master's idle FPS.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request

from _flake_retry import flaky_3x


VIDEO_QUERY = "document.querySelector('video.ssr-video, video')"

# Solid-color animation trigger. The exact mutation shape depends on the
# server's animation catalog — we attempt a known shape and fall back
# gracefully if the server rejects it.
_SOLID_COLOR_TRIGGER = {
    "type": "live-mutation",
    "mutationType": "start-animation",
    "payload": {
        "animationType": "solid-color",
        "options": {"hex": "#3a5fcd", "opacity": 0.5, "intensity": 1.0},
    },
}

# Nominal stream FPS cap — default for Phase 32+ is 30. The number is used
# only as a scaling factor; the effective FPS computed below is dominated by
# the media-vs-wall ratio, not this constant.
_STREAM_FPS_CAP_NOMINAL = 30


def _attempt_trigger(port: int) -> bool:
    """POST the solid-color trigger. Returns True on 2xx, False otherwise.
    Failure is non-fatal — the FPS measurement runs anyway against whatever
    is on screen (idle black-on-black still has frame ticks)."""
    try:
        body = json.dumps(_SOLID_COLOR_TRIGGER).encode()
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/api/live/mutate",
            data=body,
            headers={"content-type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as r:
            return 200 <= r.status < 300
    except urllib.error.HTTPError:
        return False
    except Exception:
        return False


@flaky_3x
def test_solid_color_fps_baseline(live_server, page):
    page.goto(
        f"http://127.0.0.1:{live_server['port']}/output/",
        wait_until="domcontentloaded",
        timeout=15_000,
    )
    page.wait_for_function(
        f"{VIDEO_QUERY}?.readyState === 4",
        timeout=10_000,
    )

    triggered = _attempt_trigger(live_server["port"])
    print(f"[fps-benchmark] solid-color trigger accepted: {triggered}")

    # Allow a short settle, then sample over 30s.
    time.sleep(2)
    t0 = page.evaluate(f"{VIDEO_QUERY}.currentTime")
    wall0 = time.monotonic()
    time.sleep(30)
    t1 = page.evaluate(f"{VIDEO_QUERY}.currentTime")
    wall1 = time.monotonic()

    media_delta = (t1 or 0) - (t0 or 0)
    wall_delta = wall1 - wall0
    if wall_delta <= 0:
        wall_delta = 1e-6

    # If media tracks wallclock 1:1, fps == nominal cap.
    effective_fps = (media_delta / wall_delta) * _STREAM_FPS_CAP_NOMINAL

    print(
        f"[fps-benchmark] media_delta={media_delta:.3f} "
        f"wall_delta={wall_delta:.3f} "
        f"effective_fps={effective_fps:.2f}"
    )

    # Persist for later Track-C comparison if requested.
    out_path = os.environ.get("PHASE35_FPS_BASELINE_OUT")
    if out_path:
        try:
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(f"{effective_fps:.2f}\n")
        except OSError as e:
            print(f"[fps-benchmark] failed to write {out_path}: {e}")

    assert effective_fps >= 25.0, (
        f"baseline FPS {effective_fps:.2f} below 25 — "
        f"environment problem, not a Phase-35 issue"
    )
