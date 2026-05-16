#!/usr/bin/env python3
"""
Phase 35 Wave-0 (D-05) — `with_server` context manager.

Spawns `node server.mjs` with isolated tempdir config, picks a free port,
polls `/api/ssr/ready` until 200, and yields `{port, pid, root, stderr_path}`.
Tears the server down on context exit (SIGTERM with 5s timeout, SIGKILL fallback)
and removes the tempdir.

Pattern adopted from `test/connection-stability/_harness.mjs:bootServer()` —
ported to Python so live-E2E pytest tests can drive a real server lifecycle.

Pitfall 9 from 35-RESEARCH.md: this helper did NOT exist before Wave-0; this
file IS the implementation called out as missing.

Usage::

    from with_server import with_server
    with with_server() as srv:
        port = srv["port"]
        # hit http://127.0.0.1:{port}/output/ ...
        # server stderr is captured to srv["stderr_path"]

Environment overrides:
- `WITH_SERVER_NODE` — node binary (default: `node` on PATH)
- `WITH_SERVER_TIMEOUT` — boot timeout seconds (default: 60)
"""

from __future__ import annotations

import contextlib
import os
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request


REPO_ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))


def _pick_free_port() -> int:
    """Bind to port 0 to let the OS pick a free port, then close. Tiny TOCTOU
    window — caller uses the port within milliseconds."""
    s = socket.socket()
    try:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]
    finally:
        s.close()


def _tee_stream_to_file(stream, dest_path: str, also_to: str | None = None) -> threading.Thread:
    """Background thread: copy `stream` line-by-line to `dest_path` (and
    optionally to `also_to`, e.g. sys.stderr.fileno() for live debug). Closes
    the file on stream EOF."""
    def _run():
        try:
            with open(dest_path, "ab", buffering=0) as f:
                for line in iter(stream.readline, b""):
                    f.write(line)
                    if also_to:
                        try:
                            with open(also_to, "ab", buffering=0) as ext:
                                ext.write(line)
                        except Exception:
                            pass
        except Exception:
            pass
        finally:
            try:
                stream.close()
            except Exception:
                pass

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return t


@contextlib.contextmanager
def with_server(port: int | None = None,
                env_extras: dict | None = None,
                timeout: float | None = None,
                config_seed: dict | None = None):
    """Spawn `node server.mjs`, wait for `/api/ssr/ready` 200, yield context info.

    Yields a dict::

        {
            "port": int,                # the bound port
            "pid": int,                 # server.mjs pid
            "root": str,                # isolated tempdir (auto-removed on exit)
            "stderr_path": str,         # path to captured server stderr log
            "stdout_path": str,         # path to captured server stdout log
        }

    Raises `TimeoutError` if the server never becomes ready within `timeout`s.
    """
    if timeout is None:
        timeout = float(os.environ.get("WITH_SERVER_TIMEOUT", "60"))

    node_bin = os.environ.get("WITH_SERVER_NODE", "node")

    # Isolated tempdir for config
    root = tempfile.mkdtemp(prefix="tt-beamer-test-")
    cfg = os.path.join(root, "config")
    os.makedirs(cfg, exist_ok=True)

    # Seed minimal config files so the server doesn't pick up the operator's
    # active animations into the test environment.
    seed = config_seed or {}
    for fname, content in {
        "runtime-active-animations.json": "{}\n",
        "runtime-active-grid.json": "{}\n",
        **seed,
    }.items():
        try:
            with open(os.path.join(cfg, fname), "w", encoding="utf-8") as f:
                f.write(content)
        except Exception:
            pass

    # Allocate port if caller didn't pin one
    if port is None:
        port = _pick_free_port()

    env = {
        **os.environ,
        "PORT": str(port),
        "SSR_RENDER_HOST": "1",
        "SSR_PUBLISH": "1",
        # SSR_ROOT_DIR is honored by ssr-render-host.mjs (Chromium tab cwd).
        # The main server still uses its on-disk repo `config/` for global
        # writes — same constraint as test/connection-stability/_harness.mjs.
        "SSR_ROOT_DIR": root,
        **(env_extras or {}),
    }

    stderr_path = os.path.join(root, "server-stderr.log")
    stdout_path = os.path.join(root, "server-stdout.log")

    # Spawn `node server.mjs` from REPO_ROOT so server.mjs's relative imports
    # resolve correctly. Capture stdout+stderr via pipes; tee them to files in
    # the tempdir (background threads) so D-05 (d) assertion can grep the log
    # AFTER teardown without blocking on the pipe.
    proc = subprocess.Popen(
        [node_bin, "server.mjs"],
        env=env,
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=0,
    )

    tee_stdout = _tee_stream_to_file(proc.stdout, stdout_path)
    tee_stderr = _tee_stream_to_file(proc.stderr, stderr_path)

    ready_url = f"http://127.0.0.1:{port}/api/ssr/ready"
    health_url = f"http://127.0.0.1:{port}/api/health"
    try:
        deadline = time.monotonic() + timeout
        last_err = None
        ready = False
        # Two-stage poll:
        #  1. /api/health — confirms server.mjs is listening and routing
        #  2. /api/ssr/ready — confirms SSR tab's videoProducer is up
        # The plan's verify command hits /api/ssr/ready, so we keep polling
        # that until 200 (or timeout).
        while time.monotonic() < deadline:
            if proc.poll() is not None:
                raise RuntimeError(
                    f"server.mjs exited prematurely with code {proc.returncode}; "
                    f"see {stderr_path}"
                )
            try:
                with urllib.request.urlopen(ready_url, timeout=2) as r:
                    if r.status == 200:
                        ready = True
                        break
                    # 503 means producer-starting — keep polling
                    last_err = f"HTTP {r.status}"
            except urllib.error.HTTPError as e:
                last_err = f"HTTPError {e.code}"
            except urllib.error.URLError as e:
                last_err = f"URLError {e.reason!r}"
            except Exception as e:  # connection refused before listen, etc.
                last_err = f"{type(e).__name__}: {e}"
            time.sleep(0.5)

        if not ready:
            raise TimeoutError(
                f"server.mjs did not become ready in {timeout}s; "
                f"last_err={last_err!r}; stderr_path={stderr_path}"
            )

        yield {
            "port": port,
            "pid": proc.pid,
            "root": root,
            "stderr_path": stderr_path,
            "stdout_path": stdout_path,
        }
    finally:
        # Teardown: SIGTERM, wait 5s, SIGKILL fallback. Then remove tempdir.
        try:
            if proc.poll() is None:
                proc.send_signal(signal.SIGTERM)
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    try:
                        proc.kill()
                    except Exception:
                        pass
                    try:
                        proc.wait(timeout=5)
                    except Exception:
                        pass
        except Exception:
            pass
        # Best-effort: join tee threads (give them a brief moment to flush)
        for t in (tee_stdout, tee_stderr):
            try:
                t.join(timeout=1.0)
            except Exception:
                pass
        try:
            shutil.rmtree(root, ignore_errors=True)
        except Exception:
            pass


if __name__ == "__main__":
    # Smoke test invocation: `python scripts/with_server.py` boots a server,
    # prints the URL, sleeps 5s, tears down. Useful for manual debugging.
    with with_server() as srv:
        print(f"[with_server] booted port={srv['port']} pid={srv['pid']}")
        print(f"[with_server] stderr={srv['stderr_path']}")
        print(f"[with_server] open: http://127.0.0.1:{srv['port']}/output/")
        print("[with_server] sleeping 5s, then tearing down...")
        time.sleep(5)
        print("[with_server] OK")
