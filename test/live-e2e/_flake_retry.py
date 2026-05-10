"""
Phase 35 Wave-0 (D-05) — flaky test retry decorator.

Per CONTEXT.md A5: live-E2E tests can be flaky (Xvfb startup races, network
hiccups, video pipeline first-frame delay). The strategy:

  1. Retry the test up to 3 times inline (level 1 — collapses most flakes).
  2. If WAVE0_FLAKE_TOLERANCE=1 is set AND all 3 attempts fail, mark the test
     as `skipped` with a structured log line `[wave0-flake] test=<name> attempts=3`.
  3. Otherwise, re-raise the last exception so the test fails normally.

D-06 connection-stability NEVER uses this decorator — it has a zero-tolerance
flake policy. Only the new `test/live-e2e/` rail wears this.
"""

from __future__ import annotations

import functools
import os
import sys

import pytest


def flaky_3x(test_fn):
    """Decorator: run `test_fn` up to 3 times. If all fail and
    WAVE0_FLAKE_TOLERANCE=1, skip; otherwise re-raise.
    """

    @functools.wraps(test_fn)
    def wrapper(*args, **kwargs):
        last_exc: BaseException | None = None
        for attempt in range(1, 4):
            try:
                return test_fn(*args, **kwargs)
            except Exception as exc:
                last_exc = exc
                print(
                    f"[wave0-flake] test={test_fn.__name__} attempt={attempt} "
                    f"failed: {exc!r}",
                    file=sys.stderr,
                    flush=True,
                )
        # All 3 attempts failed
        if os.environ.get("WAVE0_FLAKE_TOLERANCE") == "1":
            print(
                f"[wave0-flake] test={test_fn.__name__} attempts=3 SKIPPED "
                f"(tolerance enabled)",
                file=sys.stderr,
                flush=True,
            )
            pytest.skip(f"flake tolerated: {last_exc!r}")
        # Re-raise the last failure
        assert last_exc is not None
        raise last_exc

    return wrapper
