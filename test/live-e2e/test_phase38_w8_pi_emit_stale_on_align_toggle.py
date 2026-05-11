"""Phase 38 W8 — operator-reproduced bug: Pi /output/'s defensive activate
broadcast clobbers the server's authoritative `profileId` from a real
profile-name (e.g. `test`) to `unsaved-<boardId>`, persisting the corruption
to disk in `runtime-active-grid.json` and compounding on every server boot.

Operator's evidence (2026-05-11 UAT, log excerpt):

  [active-grid] restored profile=test srcXs=6 srcYs=5 points=30 version=2 source=runtime-active-grid
  [ssr-tab:log] [align-grid-snapshot] poll eager-apply OK profile=test points=30
  ...align-mode toggled ON...
  [ssr-tab:log] [align-grid-snapshot] SSR onAlignModeChange(true) — broadcast SUPPRESSED (W7)
  [align-grid-snapshot-log] EMIT force=true dims=5×6 corners=(0.07,0.11)..(0.72,0.79) profile=unsaved-nemesis-board-a
                                                                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                                                       profileId CLOBBERED to unsaved-*
  [align-grid-snapshot-log] EMIT force=true dims=5×6 corners=(0.16,0.15)..(0.81,0.83) profile=test

The first EMIT is Pi /output/'s `output-align-mode-loader.js` defensive activate
broadcast (Phase 36 iter2 h2). Pi's `_loadedProfileName` is null at the moment
of broadcast (no LS-stored profile match for the just-drained grid) → grid-state
synthesizes `profileId="unsaved-<boardId>"`. The server's align-grid-snapshot
mutation handler then:
  1. Stores the broadcast as the authoritative `lastAlignGridSnapshot` in the
     live session (with the WRONG profileId).
  2. Persists to `runtime-active-grid.json` via `persistActiveGrid({ rootDir })`
     (server.mjs:1269-1276) — clobbering the on-disk profileId from `test`
     to `unsaved-<boardId>`.

Every subsequent server boot reads this corrupted state. The on-disk grid
gradually drifts away from the canonical projection-profile via the
feedback loop: Pi adopts drift → Pi re-broadcasts drift → server re-persists
drift. By the time the operator notices, runtime-active-grid.json's geometry
no longer matches projection-profiles.json's canonical `test` profile.

Reproducer strategy:
  1. Save+restore the repo's `config/runtime-active-grid.json` so we can
     pre-seed test profile state (server reads from REPO_ROOT/config/,
     not the tempdir, since `loadActiveGrid({ rootDir: ROOT_DIR })` uses
     the hardcoded ROOT_DIR).
  2. Seed runtime-active-grid.json with `profileId="test"`, 5×6 grid at
     canonical test corners.
  3. Boot server. It seeds the in-memory `lastAlignGridSnapshot.profileId="test"`.
  4. Open Pi /output/ in Playwright.
  5. Toggle align-mode ON via context-update broadcast.
  6. Wait for Pi /output/'s defensive activate broadcast to fire.
  7. ASSERT: server's `lastAlignGridSnapshot.profileId` is STILL `"test"`
     — NOT clobbered to `"unsaved-*"`.
  8. ASSERT: the on-disk runtime-active-grid.json has profileId STILL `"test"`.

If the bug is present on master 4149b86, this test FAILS (RED).
After the W8 fix lands (Fix B: remove Pi /output/'s defensive activate
broadcast), it PASSES (GREEN).
"""
from __future__ import annotations

import json
import os
import re
import shutil
import time
import urllib.error
import urllib.request

import pytest

from _flake_retry import flaky_3x


REPO_ROOT = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)
RUNTIME_ACTIVE_GRID_PATH = os.path.join(
    REPO_ROOT, "config", "runtime-active-grid.json"
)

# Test profile geometry — matches operator's canonical `test` profile in
# `config/projection-profiles.json` (TL≈0.16/0.15, BR≈0.81/0.83, 5×6).
TEST_PROFILE_TL = (0.1589, 0.1476)
TEST_PROFILE_BR = (0.8112, 0.8276)
TEST_PROFILE_ID = "test"


def _build_test_active_grid() -> dict:
    """Build a runtime-active-grid.json payload matching the canonical
    `test` profile. Dimensions: 5 rows × 6 cols. Corners at TEST_PROFILE_TL
    / TEST_PROFILE_BR with bilinear interpolation of interior points.
    """
    srcXs = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]
    srcYs = [0.0, 0.25, 0.5, 0.75, 1.0]
    tl_x, tl_y = TEST_PROFILE_TL
    br_x, br_y = TEST_PROFILE_BR
    points = []
    rows = len(srcYs)
    cols = len(srcXs)
    for r in range(rows):
        ty = r / (rows - 1)
        for c in range(cols):
            tx = c / (cols - 1)
            x = tl_x + (br_x - tl_x) * tx
            y = tl_y + (br_y - tl_y) * ty
            points.append({"row": r, "col": c, "x": x, "y": y})
    return {
        "schema": "tt-beamer.active-grid.v1",
        "srcXs": srcXs,
        "srcYs": srcYs,
        "points": points,
        "profileId": TEST_PROFILE_ID,
        "persistedAt": "2026-05-11T00:00:00.000Z",
    }


@pytest.fixture(scope="function")
def _seed_test_profile():
    """Save the repo's runtime-active-grid.json, replace with the canonical
    test profile, then restore on teardown. Server reads from <repo>/config/,
    not the tempdir, because `loadActiveGrid({ rootDir: ROOT_DIR })` uses
    the hardcoded ROOT_DIR pointing at the repo.
    """
    backup_path = RUNTIME_ACTIVE_GRID_PATH + ".w8-backup"
    had_existing = os.path.exists(RUNTIME_ACTIVE_GRID_PATH)
    if had_existing:
        shutil.copy2(RUNTIME_ACTIVE_GRID_PATH, backup_path)
    try:
        with open(RUNTIME_ACTIVE_GRID_PATH, "w", encoding="utf-8") as f:
            json.dump(_build_test_active_grid(), f, indent=2)
        yield
    finally:
        # Always restore from backup if we made one; otherwise leave alone
        # since we may have created the file fresh.
        if had_existing and os.path.exists(backup_path):
            shutil.move(backup_path, RUNTIME_ACTIVE_GRID_PATH)


def _http_get(port, path, timeout=5.0):
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{port}{path}", timeout=timeout
        ) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def _post_json(port, path, body):
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}{path}",
        data=json.dumps(body).encode(),
        headers={"content-type": "application/json"},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=5)
        return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def _toggle_align_mode(port, on):
    _post_json(port, "/api/live/command", {
        "mutationType": "context-update",
        "payload": {"alignMode": bool(on)},
    })


def _wait_for_ssr_warmup(port, timeout_s=30):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        code, body = _http_get(port, "/api/diag/ssr-grid", timeout=2.0)
        if code == 200:
            try:
                d = json.loads(body)
                if d.get("ok") and d.get("grid"):
                    return True
            except Exception:
                pass
        time.sleep(0.5)
    return False


def _fetch_server_snapshot(port) -> dict | None:
    code, body = _http_get(port, "/api/live/snapshot", timeout=5)
    if code != 200:
        return None
    return json.loads(body).get("session", {}).get("snapshot") or {}


def _server_profileid(port) -> str | None:
    snap = _fetch_server_snapshot(port)
    if not snap:
        return None
    grid = (snap.get("runtime") or {}).get("lastAlignGridSnapshot") or {}
    return grid.get("profileId")


# Regex parser for the EMIT diagnostic line. Example:
#   [align-grid-snapshot-log] EMIT force=true dims=5×6
#       corners=(0.07,0.11)..(0.72,0.79) profile=unsaved-nemesis-board-a
_EMIT_RE = re.compile(
    r"\[align-grid-snapshot-log\]\s+EMIT\s+"
    r"force=(?P<force>\S+)\s+"
    r"dims=(?P<rows>\d+)\D(?P<cols>\d+)\s+"
    r"corners=\((?P<tlx>[-\d.]+),(?P<tly>[-\d.]+)\)\.\."
    r"\((?P<brx>[-\d.]+),(?P<bry>[-\d.]+)\)\s+"
    r"profile=(?P<profile>\S+)"
)


def _parse_emit_lines(stdout_path: str) -> list[dict]:
    """Scan server stdout for every `[align-grid-snapshot-log] EMIT` line."""
    emits = []
    try:
        with open(stdout_path, "rb") as f:
            for i, line in enumerate(f):
                try:
                    decoded = line.decode("utf-8", errors="replace")
                except Exception:
                    continue
                m = _EMIT_RE.search(decoded)
                if not m:
                    continue
                emits.append({
                    "force": m.group("force"),
                    "rows": int(m.group("rows")),
                    "cols": int(m.group("cols")),
                    "tlx": float(m.group("tlx")),
                    "tly": float(m.group("tly")),
                    "brx": float(m.group("brx")),
                    "bry": float(m.group("bry")),
                    "profile": m.group("profile").strip(),
                    "raw": decoded.rstrip("\n"),
                    "line_idx": i,
                })
    except FileNotFoundError:
        pass
    return emits


@pytest.fixture(scope="function")
def live_server_with_seed(_seed_test_profile):
    """Spawn the server AFTER runtime-active-grid.json is seeded with the
    canonical test profile. pytest evaluates fixture deps left-to-right so
    `_seed_test_profile` runs first; with_server boots from inside this
    fixture so the seed file is on disk when `node server.mjs` starts.
    """
    from with_server import with_server
    with with_server() as info:
        yield info


# NOTE: NOT decorated with @flaky_3x. Pi's defensive broadcast corrupts the
# REPO_ROOT/config/runtime-active-grid.json file via 200ms-debounced
# persistActiveGrid. On retry, the fixture teardown hasn't run yet so the
# next attempt sees the corruption as its baseline (sanity check fails for
# a confusing reason). Running once is enough to prove the bug.
def test_phase38_w8_pi_does_not_clobber_profileid_on_align_toggle(
    live_server_with_seed, page
):
    """W8 RED reproducer: Pi /output/'s defensive activate broadcast must NOT
    overwrite the server's authoritative `profileId` (from a real profile-name
    like `test`) with `unsaved-<boardId>`.

    On master 4149b86 the bug IS present:
      - Pi's `_loadedProfileName` is null (no LS profile match in fresh ctx)
      - grid-state.broadcastGridSnapshot synthesizes profileId=`unsaved-<boardId>`
      - server.mjs's align-grid-snapshot handler persists to disk
      - on-disk profileId is now `unsaved-<boardId>` instead of `test`

    After Fix B (remove Pi's defensive activate broadcast):
      - Pi never emits → server's profileId stays at `test`
      - disk stays at `test`
    """
    port = live_server_with_seed["port"]
    stdout_path = live_server_with_seed["stdout_path"]

    # Sanity: server restored seeded test profile.
    pid_before = _server_profileid(port)
    assert pid_before == TEST_PROFILE_ID, (
        f"Server did NOT restore seeded profileId. Got {pid_before!r}, "
        f"expected {TEST_PROFILE_ID!r}. Check that "
        f"{RUNTIME_ACTIVE_GRID_PATH} was seeded."
    )

    # Wait for SSR warmup so it has the chance to apply the grid via poll
    # eager-apply (mirrors operator's log sequence).
    assert _wait_for_ssr_warmup(port, 30), "SSR warm up failed"
    time.sleep(2.0)

    # Open Pi /output/ with a fresh context (no LS), matching the operator's
    # state AFTER a `localStorage.clear()` or first-ever boot.
    page.goto(
        f"http://127.0.0.1:{port}/output/",
        wait_until="domcontentloaded",
        timeout=15000,
    )
    page.wait_for_function(
        "document.querySelector('video.ssr-video, video')?.readyState >= 2",
        timeout=10000,
    )
    time.sleep(2.0)  # let live-hello + pre-bundle pollOnce settle

    # Capture pre-toggle stdout offset for emit filtering.
    pre_toggle_size = (
        os.path.getsize(stdout_path) if os.path.exists(stdout_path) else 0
    )

    # Toggle align-mode ON via server-side context-update broadcast.
    # This fans out to Pi via WS → onAlignModeChange(true) →
    # output-align-mode-loader.activate() → bundle load → bootHandleUi →
    # drain pending → defensive broadcastGridSnapshot.
    _toggle_align_mode(port, True)

    # Wait long enough for Pi to:
    #   1. lazy-load the align-mode bundle (~500ms cold)
    #   2. boot handle-ui (which runs profile-persistence.init reading LS)
    #   3. drain pending snapshot from live-hello cache
    #   4. fire the iter2-h2 defensive broadcastGridSnapshot
    # And for the server to receive + persist the broadcast (200ms debounced
    # write inside persistActiveGrid).
    time.sleep(7.0)

    # Parse EMITs for diagnostic purposes
    all_emits = _parse_emit_lines(stdout_path)
    pre_toggle_emit_count = 0
    try:
        with open(stdout_path, "rb") as f:
            head = f.read(pre_toggle_size)
            for line in head.splitlines():
                if _EMIT_RE.search(line.decode("utf-8", errors="replace")):
                    pre_toggle_emit_count += 1
    except FileNotFoundError:
        pass
    post_toggle_emits = all_emits[pre_toggle_emit_count:]

    def _dump():
        lines = ["\n=== ALL EMIT lines from server stdout ==="]
        for i, e in enumerate(all_emits):
            marker = "PRE" if i < pre_toggle_emit_count else "POST"
            lines.append(f"  [{marker}] {e['raw']}")
        lines.append(
            f"=== End EMIT dump ({len(all_emits)} total, "
            f"{len(post_toggle_emits)} post-toggle) ==="
        )
        return "\n".join(lines)

    # Always print so we can see what happened.
    print(_dump())

    # ── Assertion 1: server's in-memory profileId is NOT clobbered ──
    pid_after = _server_profileid(port)
    print(f"[w8 test] server profileId before={pid_before!r} after={pid_after!r}")
    assert pid_after == TEST_PROFILE_ID, (
        f"BUG A REPRODUCED — server's `lastAlignGridSnapshot.profileId` "
        f"was clobbered from {TEST_PROFILE_ID!r} to {pid_after!r} after "
        f"Pi /output/ activated align-mode. Pi's defensive activate "
        f"broadcast emitted a synthetic `unsaved-*` profileId because "
        f"its `_loadedProfileName` is null (no LS profile match), and the "
        f"server persisted it. This corrupts the authoritative profile "
        f"label and compounds on next server boot.\n"
        + _dump()
    )

    # ── Assertion 2: on-disk profileId is NOT clobbered ──
    # The runtime-active-grid.json file is the persistent surface. If Pi's
    # broadcast wrote `unsaved-*` here, the next server boot loads the
    # corrupted state. This is the long-term-corruption assertion.
    try:
        with open(RUNTIME_ACTIVE_GRID_PATH, "r", encoding="utf-8") as f:
            disk_state = json.load(f)
    except Exception as err:
        pytest.fail(f"Could not read {RUNTIME_ACTIVE_GRID_PATH} post-toggle: {err}")

    disk_pid = disk_state.get("profileId")
    print(f"[w8 test] disk profileId after toggle = {disk_pid!r}")
    assert disk_pid == TEST_PROFILE_ID, (
        f"BUG A REPRODUCED (disk persistence) — on-disk profileId in "
        f"{RUNTIME_ACTIVE_GRID_PATH} was clobbered from {TEST_PROFILE_ID!r} "
        f"to {disk_pid!r}. Next server boot will load the corrupted state."
        + _dump()
    )
