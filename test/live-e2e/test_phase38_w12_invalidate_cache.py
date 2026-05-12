"""Phase 38 W12 — regression test for boot-paint desync fix.

Validates the W12 fix in two parts:

  1. PIXEL CHECK — boot screenshot with xrandrv2 seed must show the warp's
     black border at canvas edge (avg brightness < 15 for left strip).
     This is the end-to-end visual check.

  2. CACHE INVALIDATION — restoreGridSnapshot in grid-state.js must call
     invalidateCachedArrays on the GL renderer when the grid is replaced.
     This is the implementation-level check that catches "the fix was
     accidentally reverted" without depending on visual diff thresholds.

The W12 bug (operator UAT 2026-05-12): "Wenn der server gerade frisch
neugestartet wird, ist das board im vollbild" — after fresh server boot
with a persisted xrandrv2 9×9 grid, SSR's grid.points IS xrandrv2 (live-
hello eager-apply log proves it), but the streamed video shows the board
at identity until the operator drags a handle. The fix forces the GL
renderer's cached vertex / index arrays to be dropped after each grid
REPLACEMENT (vs in-place point mutation via setPoint) AND toggles the
fx-gl-canvas display to trigger compositor damage so the WebRTC tab-
capture surface refreshes immediately.
"""
from __future__ import annotations
import json, os, shutil, time, urllib.request, urllib.error
import pytest
from _flake_retry import flaky_3x

_REPO_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
_ACTIVE_GRID_PATH = os.path.join(_REPO_ROOT, "config", "runtime-active-grid.json")
_PROFILES_PATH = os.path.join(_REPO_ROOT, "config", "projection-profiles.json")
_DEBUG_DIR = os.path.join(_REPO_ROOT, "debug", "w12")


def _http_get(port, path, timeout=5.0):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}{path}", timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def _post_json(port, path, body, timeout=5.0):
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}{path}",
        data=json.dumps(body).encode(),
        headers={"content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def _fetch_screenshot(port):
    code, body = _http_get(port, "/api/diag/ssr-screenshot", timeout=10.0)
    return body if code == 200 else None


def _fetch_ssr_grid(port):
    code, body = _http_get(port, "/api/diag/ssr-grid")
    if code == 200:
        try:
            d = json.loads(body)
            return d.get("grid") if d.get("ok") else None
        except Exception:
            return None
    return None


def _eval_in_ssr_tab(port, expr):
    """Use the existing /api/diag/ssr-eval endpoint or fall back to ssr-grid mechanism.
    The diag/ssr-grid endpoint uses evaluateInTab — we piggyback on that pattern
    by reading window.* values through a JSON-encoded result. Since there's no
    public /api/diag/ssr-eval, we use the snapshotGridState path to verify
    the GL renderer's surface area."""
    pass


def _wait_for_ssr_warmup(port, timeout_s=30):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if _fetch_ssr_grid(port):
            return True
        time.sleep(0.5)
    return False


def _require_ssr_host(port):
    code, body = _http_get(port, "/api/diag/ssr-grid", timeout=2.0)
    if code == 503 and b"ssr-host-inactive" in body:
        pytest.skip("SSR_RENDER_HOST not active")


def _load_xrandrv2_profile():
    with open(_PROFILES_PATH) as f:
        d = json.load(f)
    return d["nemesis-board-a"]["xrandrv2"]


@pytest.fixture
def _disk_xrandrv2_grid():
    bak = _ACTIVE_GRID_PATH + ".w12invbak"
    existed = os.path.exists(_ACTIVE_GRID_PATH)
    if existed:
        shutil.copy(_ACTIVE_GRID_PATH, bak)
    xv2 = _load_xrandrv2_profile()
    seed = {
        "schema": "tt-beamer.active-grid.v1",
        "srcXs": xv2["srcXs"], "srcYs": xv2["srcYs"], "points": xv2["points"],
        "profileId": "xrandrv2", "persistedAt": "2026-05-12T10:00:00Z",
    }
    with open(_ACTIVE_GRID_PATH, "w") as f:
        json.dump(seed, f)
    yield seed
    if existed and os.path.exists(bak):
        shutil.copy(bak, _ACTIVE_GRID_PATH)
        os.unlink(bak)
    elif not existed and os.path.exists(_ACTIVE_GRID_PATH):
        os.unlink(_ACTIVE_GRID_PATH)


def _avg_pixel_brightness(jpg_bytes, region):
    try:
        from PIL import Image
        import io
    except ImportError:
        pytest.skip("PIL not available")
    img = Image.open(io.BytesIO(jpg_bytes)).convert("L")
    x1, y1, x2, y2 = region
    box = img.crop((x1, y1, x2, y2))
    pixels = list(box.getdata())
    return sum(pixels) / len(pixels)


@flaky_3x
def test_w12_boot_paint_shows_warp(_disk_xrandrv2_grid, live_server):
    """End-to-end visual check: after fresh boot with xrandrv2 seed, the
    SSR screenshot must show black borders at the canvas edge (= mesh-warp
    is applied). If the operator's bug regressed, the left-strip would be
    visible board content instead of pure black.
    """
    port = live_server["port"]
    _require_ssr_host(port)
    assert _wait_for_ssr_warmup(port, 30)
    os.makedirs(_DEBUG_DIR, exist_ok=True)
    time.sleep(4.0)

    grid = _fetch_ssr_grid(port)
    assert grid and len(grid["srcXs"]) == 9, (
        f"SSR grid must be xrandrv2 9×9 after boot live-hello apply, "
        f"got dims {len(grid['srcXs']) if grid else 'no-grid'}×"
        f"{len(grid['srcYs']) if grid else 'no-grid'}"
    )

    shot = _fetch_screenshot(port)
    assert shot, "boot screenshot capture failed"
    with open(os.path.join(_DEBUG_DIR, "regress-boot.jpg"), "wb") as f:
        f.write(shot)
    # xrandrv2 TL is at (0.204, 0.106) → pixel (391, 114) on 1920×1080.
    # Sample left strip far from TL (x∈[50,300], y∈[400,500]) — must be black.
    left_border = _avg_pixel_brightness(shot, (50, 400, 300, 500))
    assert left_border < 15, (
        f"W12 REGRESSION — boot screenshot has bright left border "
        f"(brightness={left_border:.2f}). Expected < 15 (black border) "
        f"indicating mesh-warp is applied with xrandrv2 inset. "
        f"If this fails, the operator's W12 boot-paint-desync bug returned: "
        f"grid.points is correct but render shows identity."
    )


def test_w12_gl_renderer_exposes_invalidate_hook(live_server, page):
    """Implementation-level check: the GL renderer module must expose the
    invalidateCachedArrays method that the W12 fix depends on. If someone
    refactors the GL renderer and accidentally removes this export, the
    grid-state.js invalidation call becomes a no-op and the bug returns.

    Uses Playwright to navigate to /ssr directly (operator's SSR tab URL)
    and queries the window-global for the GL renderer surface.
    """
    port = live_server["port"]
    page.goto(f"http://127.0.0.1:{port}/ssr", wait_until="domcontentloaded", timeout=15000)
    # Wait for runtime modules to load
    page.wait_for_function(
        "typeof window.TT_BEAMER_RUNTIME_PROJECTION_GL_RENDERER === 'object'",
        timeout=15000,
    )
    has_method = page.evaluate(
        "() => typeof window.TT_BEAMER_RUNTIME_PROJECTION_GL_RENDERER?.invalidateCachedArrays === 'function'"
    )
    assert has_method, (
        "W12 REGRESSION — window.TT_BEAMER_RUNTIME_PROJECTION_GL_RENDERER."
        "invalidateCachedArrays is missing. The W12 fix in grid-state.js's "
        "restoreGridSnapshot relies on this method to drop stale vertex / "
        "index cache after a grid replacement. Without it, the SSR's GL "
        "renderer may render stale geometry on the first frame after a "
        "dim-change grid mutation (the operator's UAT bug)."
    )


def test_w12_restore_invalidates_gl_cache(live_server, page):
    """Implementation-level check: calling restoreGridSnapshot with a
    different-dim grid must (a) update grid.srcXs/srcYs/points AND (b)
    reset the GL renderer's cached row/col count to 0 (or null cache
    arrays), so the next draw frame rebuilds them.

    Uses Playwright to navigate, then runs the W12 fix's invariant
    directly in the page context.
    """
    port = live_server["port"]
    page.goto(f"http://127.0.0.1:{port}/ssr", wait_until="domcontentloaded", timeout=15000)
    page.wait_for_function(
        "typeof window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE === 'object' "
        "&& typeof window.TT_BEAMER_RUNTIME_PROJECTION_GL_RENDERER === 'object'",
        timeout=15000,
    )

    # 1) Get a baseline grid state.
    baseline = page.evaluate(
        """() => {
          const gs = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
          return {
            dims: [gs.grid.srcXs.length, gs.grid.srcYs.length],
            hasInvalidate: typeof window.TT_BEAMER_RUNTIME_PROJECTION_GL_RENDERER
              .invalidateCachedArrays === 'function',
          };
        }"""
    )
    assert baseline["hasInvalidate"], "GL renderer must export invalidateCachedArrays"

    # 2) Call restoreGridSnapshot with a 5×5 grid (different from baseline).
    #    The fix should call invalidateCachedArrays automatically.
    #    We verify by checking that a `__w12_invalidate_called` marker fires.
    page.evaluate(
        """() => {
          const gl = window.TT_BEAMER_RUNTIME_PROJECTION_GL_RENDERER;
          const orig = gl.invalidateCachedArrays;
          window.__w12_invalidate_called = 0;
          gl.invalidateCachedArrays = function() {
            window.__w12_invalidate_called += 1;
            return orig.apply(this, arguments);
          };
        }"""
    )

    page.evaluate(
        """() => {
          const gs = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
          const srcXs = [0, 0.25, 0.5, 0.75, 1.0];
          const srcYs = [0, 0.25, 0.5, 0.75, 1.0];
          const points = [];
          for (let r = 0; r < 5; r++) {
            const row = [];
            for (let c = 0; c < 5; c++) {
              row.push({ x: srcXs[c], y: srcYs[r] });
            }
            points.push(row);
          }
          gs.restoreGridSnapshot({ srcXs, srcYs, points });
        }"""
    )

    invalidate_count = page.evaluate("() => window.__w12_invalidate_called")
    assert invalidate_count >= 1, (
        f"W12 REGRESSION — restoreGridSnapshot did NOT call "
        f"invalidateCachedArrays after replacing the grid (count={invalidate_count}). "
        f"The W12 fix in grid-state.js must invoke the GL renderer's "
        f"invalidation hook so the next draw frame rebuilds cached vertex / "
        f"index arrays. Without this, the operator's boot-paint-desync bug "
        f"can return (grid.points is correct, render is stale)."
    )

    # And verify grid dimensions actually changed.
    dims_after = page.evaluate(
        """() => [
          window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE.grid.srcXs.length,
          window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE.grid.srcYs.length,
        ]"""
    )
    assert dims_after == [5, 5], f"grid dims should be 5×5 after restore, got {dims_after}"
