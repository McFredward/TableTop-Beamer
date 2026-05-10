"""
Phase 35 Wave-0 (D-05) — shared pytest fixtures for live-E2E tests.

Fixtures provided:
  - `live_server` — yields a `with_server` context info dict
                    {port, pid, root, stderr_path, stdout_path}
  - `chrome_browser` — Playwright sync_playwright launching system Chrome
                       (`/opt/google/chrome/chrome`) headful under Xvfb
  - `page` — fresh browser context + page per test
  - module-level skip if `/opt/google/chrome/chrome` is not present

Environment overrides:
  - PLAYWRIGHT_CHROME — path to Chrome binary (default /opt/google/chrome/chrome)
  - PLAYWRIGHT_DISPLAY — Xvfb DISPLAY (default :98)
"""

from __future__ import annotations

import os
import sys

import pytest

# Make `scripts/with_server.py` importable as `with_server`.
_REPO_SCRIPTS = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "scripts")
)
if _REPO_SCRIPTS not in sys.path:
    sys.path.insert(0, _REPO_SCRIPTS)

from with_server import with_server  # noqa: E402  (path-mutated import)


CHROME = os.environ.get("PLAYWRIGHT_CHROME", "/opt/google/chrome/chrome")
DISPLAY = os.environ.get("PLAYWRIGHT_DISPLAY", ":98")


def pytest_collection_modifyitems(config, items):
    """Module-level skip if system Chrome is missing — keeps CI green on
    machines that don't provide /opt/google/chrome/chrome (the live-E2E rail
    is environment-gated by D-05's hardware spec)."""
    if not os.path.exists(CHROME):
        skip_marker = pytest.mark.skip(reason=f"system Chrome not at {CHROME}")
        for item in items:
            # Only mark items in test/live-e2e/
            if "live-e2e" in str(item.fspath):
                item.add_marker(skip_marker)


@pytest.fixture(scope="function")
def live_server():
    """Spawn a fresh `node server.mjs` per test via `with_server`."""
    with with_server() as info:
        yield info


@pytest.fixture(scope="function")
def chrome_browser():
    """Launch headful system Chrome under Xvfb. One browser per test for
    isolation; teardown closes the browser cleanly."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        pytest.skip("playwright not installed; `pip install --user playwright`")

    pw = sync_playwright().start()
    try:
        browser = pw.chromium.launch(
            headless=False,
            executable_path=CHROME,
            env={**os.environ, "DISPLAY": DISPLAY},
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--autoplay-policy=no-user-gesture-required",
            ],
        )
        try:
            yield browser
        finally:
            try:
                browser.close()
            except Exception:
                pass
    finally:
        try:
            pw.stop()
        except Exception:
            pass


@pytest.fixture(scope="function")
def page(chrome_browser):
    """Per-test browser context + page. Closed on test teardown."""
    ctx = chrome_browser.new_context()
    pg = ctx.new_page()
    try:
        yield pg
    finally:
        try:
            ctx.close()
        except Exception:
            pass
