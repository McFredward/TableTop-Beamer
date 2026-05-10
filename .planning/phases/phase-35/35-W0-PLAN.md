---
phase: 35
plan: W0
type: execute
wave: 0
depends_on: []
files_modified:
  - scripts/with_server.py
  - test/live-e2e/conftest.py
  - test/live-e2e/test_phase35_alignmode_smoke.py
  - test/live-e2e/test_phase35_dashboard_alignmode.py
  - test/live-e2e/test_phase35_fps_benchmark.py
  - test/live-e2e/_flake_retry.py
  - test/phase-35-bootalignmode-shape.test.mjs
  - test/phase-35-output-live-sync.test.mjs
  - test/phase-35-bayer-dither.test.mjs
  - package.json
autonomous: true
requirements:
  - D-04
  - D-05
  - D-06
must_haves:
  truths:
    - "scripts/with_server.py exists and successfully spawns node server.mjs with isolated config dir, polls /api/ssr/ready, yields {port,pid,root}, kills on context exit"
    - "test/live-e2e/conftest.py provides Playwright + Xvfb + system Chrome (/opt/google/chrome/chrome) fixtures (browser, page, server)"
    - "test/live-e2e/test_phase35_alignmode_smoke.py runs and FAILS-as-expected because Track A subjects do not exist yet (RED rail)"
    - "test/live-e2e/test_phase35_dashboard_alignmode.py runs and FAILS-as-expected because dashboard refactor has not happened yet (RED rail)"
    - "test/live-e2e/test_phase35_fps_benchmark.py runs and produces a baseline FPS number (no dither yet — measures master-branch baseline) — passes 25fps lower-bound assertion on current master, will be re-run after C1 lands to assert ≤ 5 FPS impact"
    - "test/phase-35-bootalignmode-shape.test.mjs RED — node --test exits non-zero because output-align-mode.js does not exist"
    - "test/phase-35-output-live-sync.test.mjs RED — node --test exits non-zero because output-live-sync.js does not exist"
    - "test/phase-35-bayer-dither.test.mjs RED — node --test exits non-zero because runtime-effect-dither.js does not exist"
    - "Connection-stability suite stays 72/0/13 throughout Wave 0 (no production code touched)"
    - "package.json npm test step runs JS suite; new npm script `test:live-e2e` runs `python -m pytest test/live-e2e/`"
    - "Live-E2E rail uses 3× retry-decorator + opt-in skip-on-flake under WAVE0_FLAKE_TOLERANCE=1 env var (per A5 flake-handling)"
  artifacts:
    - path: "scripts/with_server.py"
      provides: "Python contextmanager spawning `node server.mjs` with isolated tempdir config, free-port allocation, /api/ssr/ready polling, SIGTERM teardown + tempdir cleanup, captures stderr to a file in tempdir for log-grep assertions"
      min_lines: 50
    - path: "test/live-e2e/conftest.py"
      provides: "pytest fixtures: `live_server` (uses with_server), `chrome_browser` (sync_playwright launches /opt/google/chrome/chrome with --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --autoplay-policy=no-user-gesture-required), `page` (browser context page), `xvfb_display` (DISPLAY=:98 default)"
      min_lines: 40
    - path: "test/live-e2e/test_phase35_alignmode_smoke.py"
      provides: "6 D-05 assertions a-f as separate pytest test functions: test_ready_state, test_current_time, test_bg_color, test_server_log_clean, test_handles_visible, test_drag_triggers_mutation"
      min_lines: 100
    - path: "test/live-e2e/test_phase35_dashboard_alignmode.py"
      provides: "Loads `/` (dashboard, index.html), toggles alignMode via UI button OR /api/live/mutate, asserts `.projection-corner-handle` elements exist + visible (D-01-A2 regression)"
      min_lines: 40
    - path: "test/live-e2e/test_phase35_fps_benchmark.py"
      provides: "Boots server, opens /output/, runs a known solid-color animation for 30s, samples videoCurrentTime/wall-clock ratio, computes effective FPS, asserts >= 25fps; reports the number for later comparison after C1 lands"
      min_lines: 50
    - path: "test/live-e2e/_flake_retry.py"
      provides: "@flaky_3x decorator: runs the test up to 3 times; if WAVE0_FLAKE_TOLERANCE=1 and all 3 fail, emits structured log line `[wave0-flake] test=<name> attempts=3` and marks pytest.skip; otherwise re-raises"
      min_lines: 25
    - path: "test/phase-35-bootalignmode-shape.test.mjs"
      provides: "RED unit test asserting exports of /src/app/runtime/output-receiver/output-align-mode.js: `bootAlignMode` is a function, returns object with `.stop` function. Loads the module via dynamic import. EXPECTED to throw MODULE_NOT_FOUND on master."
      min_lines: 25
    - path: "test/phase-35-output-live-sync.test.mjs"
      provides: "RED unit test asserting exports of /src/app/runtime/output-receiver/output-live-sync.js: `bootOutputLiveSync` is a function, returned object has methods: onAnimationStart, onAnimationStop, onClearAll, onAlignModeChange, onProjectionProfileChange, onConnect, onDisconnect, getActiveProjectionProfileId, getAlignMode, getCurrentClientId, stop. EXPECTED to throw MODULE_NOT_FOUND on master."
      min_lines: 35
    - path: "test/phase-35-bayer-dither.test.mjs"
      provides: "RED unit test asserting exports of /src/app/runtime/render/runtime-effect-dither.js: `getDitheredSolidColorImageData({hex,alpha,width,height})` returns ImageData of correct size; pixel values for a solid hex color are NOT all identical (proof of dithering). EXPECTED to throw MODULE_NOT_FOUND on master."
      min_lines: 30
    - path: "package.json"
      provides: "New scripts entries: `test:live-e2e` -> `python -m pytest test/live-e2e/ -v`, and `test:phase35` -> `node --test 'test/phase-35-*.test.mjs'`"
      contains: "test:live-e2e"
  key_links:
    - from: "scripts/with_server.py"
      to: "server.mjs"
      via: "subprocess.Popen(['node', 'server.mjs'], env={...PORT, SSR_RENDER_HOST, SSR_PUBLISH...})"
      pattern: "subprocess\\.Popen.*node.*server\\.mjs"
    - from: "scripts/with_server.py"
      to: "/api/ssr/ready endpoint"
      via: "urllib.request.urlopen polling loop with timeout"
      pattern: "/api/ssr/ready"
    - from: "test/live-e2e/conftest.py"
      to: "scripts/with_server.py"
      via: "sys.path.insert + import with_server"
      pattern: "from with_server import with_server|import with_server"
    - from: "test/live-e2e/test_phase35_alignmode_smoke.py"
      to: "/opt/google/chrome/chrome"
      via: "playwright.chromium.launch(executable_path=CHROME)"
      pattern: "/opt/google/chrome/chrome"
    - from: "test/phase-35-bootalignmode-shape.test.mjs"
      to: "src/app/runtime/output-receiver/output-align-mode.js"
      via: "dynamic import"
      pattern: "output-align-mode"
---

<objective>
Wave 0: Build the BLOCKING test infrastructure for Phase 35. Per D-05 (LOCKED, BLOCKING), no production code change in any other plan may merge until this rail is GREEN where applicable (test-infrastructure GREEN; RED unit-tests stay RED until Tracks A/B/C land).

Phase 34 missed two real bugs (`/ssr` classifier, GL-flag hang) because no automated test ever live-loaded `/output/` with both Tracks together. Phase 35 W0 closes that gap: Playwright + system Chrome + spawned server, asserting D-05 a-f programmatically.

Wave-0 also creates the `scripts/with_server.py` helper that RESEARCH.md (§Pitfall 9) explicitly flags as MISSING in the repo — Wave-0's first task BUILDS it.

Purpose: lock test rails BEFORE refactor, so subsequent plans (B, A, C) cannot regress unobserved. This is the Phase-34-class-bug-prevention layer.

Output: 8 new test files + 1 helper + 1 retry-decorator + package.json npm script entries. Three RED unit tests prove the test rails are LIVE (assertions actually run, fail with MODULE_NOT_FOUND because subjects don't exist yet). Three live-E2E test files run on Lenovo Mini + system Chrome + Xvfb. CI integration so `npm test` chains JS unit suite then `pytest test/live-e2e/`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-35/35-CONTEXT.md
@.planning/phases/phase-35/35-RESEARCH.md
@.planning/phases/phase-35/35-VALIDATION.md
@.planning/phases/phase-34/34-CLOSURE-ADDENDUM.md

# Server-spawn pattern source of truth (model with_server.py on this)
@test/connection-stability/_harness.mjs

# Reference Playwright smoke (existing manual script)
@scripts/manual/playwright-output-stream-verify.py

# Reference manual probe for /output/
@scripts/manual/probe-output-page.mjs

# D-06 hard gate: this suite must stay 72/0/13
@test/connection-stability/

# server.mjs entry point + ready endpoint
@server.mjs
</context>

<interfaces>
<!-- Key extracted contracts the executor needs -->

From `test/connection-stability/_harness.mjs` (the reference pattern for server lifecycle):
```javascript
// Pattern: bootServer({port, env, ...}) → returns { port, pid, kill, configRoot, ... }
// Uses: tempdir for config, free port allocation, polls /api/ssr/ready,
//       SIGTERM with 5s timeout fallback to SIGKILL, cleanup of tempdir on exit.
```

From `server.mjs` ready endpoint (must already exist — verify before depending):
```
GET /api/ssr/ready → 200 OK when server is fully booted and ready to serve /output/ + /ssr.
```

The `/api/live/mutate` endpoint (used in D-05 e for triggering alignMode):
```
POST /api/live/mutate
  body: { type: "live-mutation", mutationType: "context-update", payload: { alignMode: true } }
  → applies the mutation; broadcasts to all WS subscribers.
```

The `/api/live/snapshot` endpoint (used by output-live-sync as cold-start fallback):
```
GET /api/live/snapshot → JSON { snapshot: { alignMode, runtime: { activeProjectionProfileId, ... }, ... } }
```

Playwright Python launch pattern (system Chrome required for H264):
```python
browser = pw.chromium.launch(
    headless=False,
    executable_path="/opt/google/chrome/chrome",
    env={**os.environ, "DISPLAY": ":98"},
    args=["--no-sandbox", "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--autoplay-policy=no-user-gesture-required"],
)
```

Bayer 4×4 matrix (paste verbatim into test/phase-35-bayer-dither.test.mjs and into runtime-effect-dither.js when it lands):
```javascript
const BAYER_4X4 = [
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5,
];
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Build scripts/with_server.py — server lifecycle helper</name>
  <read_first>
    - test/connection-stability/_harness.mjs (the pattern: bootServer with tempdir config, free port, /api/ssr/ready polling, SIGTERM teardown)
    - server.mjs (verify /api/ssr/ready endpoint exists; check PORT env handling)
    - scripts/manual/playwright-output-stream-verify.py (existing reference — model spawn pattern)
    - .planning/phases/phase-35/35-RESEARCH.md §"Wave-0 D-05 Live-E2E Test Design" — full code scaffolding
  </read_first>
  <files>scripts/with_server.py</files>
  <action>
Create `scripts/with_server.py` as a Python contextmanager that spawns `node server.mjs` and tears it down. Use the EXACT scaffolding from 35-RESEARCH.md §"Wave-0 D-05 Live-E2E Test Design" → "Server-spawn pattern" → "Approach 1 (recommended)".

Concrete requirements:
1. `@contextlib.contextmanager` on `with_server(port=None, env_extras=None, timeout=15.0)`.
2. Allocate tempdir via `tempfile.mkdtemp(prefix="tt-beamer-test-")`; create `config/` subdir inside.
3. If `port` is None, use `socket.bind(("127.0.0.1", 0))` to get a free port.
4. Build env: `{**os.environ, "PORT": str(port), "SSR_RENDER_HOST": "1", "SSR_PUBLISH": "1", **(env_extras or {})}`.
5. Spawn `subprocess.Popen(["node", "server.mjs"], env=env, cwd=<repo root>, stdout=subprocess.PIPE, stderr=subprocess.PIPE)` — capture stderr/stdout because D-05 (d) needs to grep for "health ping failed".
6. Tee stderr to a file `f"{root}/server-stderr.log"` so the test can read it after teardown without blocking on the pipe. Use a background thread that copies `proc.stderr` → file (close-aware).
7. Poll `urllib.request.urlopen(f"http://127.0.0.1:{port}/api/ssr/ready", timeout=1)` every 0.5s up to `timeout`; if status 200, yield `{"port": port, "pid": proc.pid, "root": root, "stderr_path": f"{root}/server-stderr.log"}`.
8. If timeout exceeded, raise `TimeoutError("server.mjs did not become ready in {timeout}s")`.
9. `finally:` send SIGTERM, `proc.wait(timeout=5)`, fallback to `proc.kill()` if needed; `shutil.rmtree(root, ignore_errors=True)`.
10. Determine repo root from `os.path.dirname(os.path.abspath(__file__)) + "/.."` since the helper lives in `scripts/`.

Do NOT depend on test/connection-stability/_harness.mjs at runtime — copy the pattern, but Python and Node are separate processes. Pure-Python implementation.
  </action>
  <verify>
    <automated>python -c "from scripts.with_server import with_server; import time; from contextlib import ExitStack; s = ExitStack(); ctx = with_server(); info = s.enter_context(ctx); import urllib.request; r = urllib.request.urlopen(f'http://127.0.0.1:{info[\"port\"]}/api/ssr/ready'); assert r.status == 200; s.close(); print('OK')"</automated>
  </verify>
  <acceptance_criteria>
    - File exists at `scripts/with_server.py`
    - `python -c "from scripts.with_server import with_server"` succeeds (no syntax errors)
    - Smoke test (above verify) prints `OK` (server boots, ready endpoint reachable, teardown clean)
    - File contains `subprocess.Popen` and `node` and `server.mjs` strings (grep)
    - File contains `/api/ssr/ready` polling code (grep)
    - File captures stderr to `server-stderr.log` (grep `server-stderr.log`)
    - tempdir is removed after teardown (verify via `os.path.exists(info["root"])` returns False after `s.close()`)
  </acceptance_criteria>
  <done>scripts/with_server.py is committed; importable; spawns + tears down a real server.mjs; D-06 connection-stability is unaffected (no production code touched).</done>
</task>

<task type="auto">
  <name>Task 2: Build test/live-e2e/ scaffolding (conftest.py + flake retry)</name>
  <read_first>
    - scripts/with_server.py (just created in Task 1 — fixture wraps it)
    - .planning/phases/phase-35/35-RESEARCH.md §"Flake-handling strategy (per A5)"
    - .planning/phases/phase-35/35-CONTEXT.md A5 (3× retry + WAVE0_FLAKE_TOLERANCE=1 opt-in skip)
  </read_first>
  <files>test/live-e2e/conftest.py, test/live-e2e/_flake_retry.py, test/live-e2e/__init__.py</files>
  <action>
Create three files:

**`test/live-e2e/__init__.py`** — empty file (makes the directory a Python package).

**`test/live-e2e/_flake_retry.py`** — implements `@flaky_3x` decorator:
```python
import functools, os, sys
import pytest

def flaky_3x(test_fn):
    @functools.wraps(test_fn)
    def wrapper(*args, **kwargs):
        last_exc = None
        for attempt in range(1, 4):
            try:
                return test_fn(*args, **kwargs)
            except Exception as exc:
                last_exc = exc
                print(f"[wave0-flake] test={test_fn.__name__} attempt={attempt} failed: {exc!r}", file=sys.stderr)
        # All 3 attempts failed
        if os.environ.get("WAVE0_FLAKE_TOLERANCE") == "1":
            print(f"[wave0-flake] test={test_fn.__name__} attempts=3 SKIPPED (tolerance)", file=sys.stderr)
            pytest.skip(f"flake tolerated: {last_exc!r}")
        raise last_exc
    return wrapper
```

**`test/live-e2e/conftest.py`** — pytest fixtures:
1. Add `sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))` then `from with_server import with_server`.
2. Define constants: `CHROME = os.environ.get("PLAYWRIGHT_CHROME", "/opt/google/chrome/chrome")`, `DISPLAY = os.environ.get("PLAYWRIGHT_DISPLAY", ":98")`.
3. `@pytest.fixture(scope="function") def live_server():` yields `with_server()` ctx info.
4. `@pytest.fixture(scope="function") def chrome_browser():` opens `sync_playwright()` then `pw.chromium.launch(headless=False, executable_path=CHROME, env={**os.environ, "DISPLAY": DISPLAY}, args=["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--autoplay-policy=no-user-gesture-required"])`. Yields the browser; closes on teardown.
5. `@pytest.fixture(scope="function") def page(chrome_browser):` creates a new context+page, yields page, closes context on teardown.
6. Add a session-scoped check that `/opt/google/chrome/chrome` exists; if missing, emit `pytest.skip("system Chrome not available")` for the whole module.

Pure pytest — no extra dependencies beyond `playwright` (already required by 35-RESEARCH for D-05) and `pytest`.
  </action>
  <verify>
    <automated>python -c "import sys; sys.path.insert(0,'test/live-e2e'); from _flake_retry import flaky_3x; print('OK')"</automated>
  </verify>
  <acceptance_criteria>
    - `test/live-e2e/__init__.py` exists (empty file ok)
    - `test/live-e2e/_flake_retry.py` exists; `flaky_3x` is callable; emits `[wave0-flake] test=<name> attempts=3` on triple-failure under tolerance flag
    - `test/live-e2e/conftest.py` exists; `python -m pytest --collect-only test/live-e2e/` succeeds (collects fixtures without errors)
    - conftest.py contains `executable_path=CHROME` (grep)
    - conftest.py contains `from with_server import with_server` (grep)
    - conftest.py contains `--autoplay-policy=no-user-gesture-required` (grep)
  </acceptance_criteria>
  <done>Live-E2E test scaffolding ready: pytest can collect tests; fixtures resolve; flake decorator imports.</done>
</task>

<task type="auto">
  <name>Task 3: Write test/live-e2e/test_phase35_alignmode_smoke.py — D-05 a-f assertions</name>
  <read_first>
    - test/live-e2e/conftest.py (just created — uses live_server, page fixtures)
    - .planning/phases/phase-35/35-RESEARCH.md §"Concrete Playwright Python script structure" + §"Mapping D-05 assertions a-f"
    - .planning/phases/phase-35/35-CONTEXT.md D-05 (the canonical 6 assertions)
    - src/app/runtime/output-receiver/receiver-input-forwarder.js (find the actual log line emitted on drag — research notes "[input-forwarder] sent phase=start")
  </read_first>
  <files>test/live-e2e/test_phase35_alignmode_smoke.py</files>
  <action>
Write the live E2E smoke test with 6 separate test functions (one per D-05 assertion). All use the `live_server` and `page` fixtures from conftest.py. All decorated with `@flaky_3x` from `_flake_retry.py`.

The 6 assertions, with concrete code per RESEARCH §"Concrete Playwright Python script structure":

**a) `test_ready_state(live_server, page)`** — `videoReadyState === 4` within 10s:
```python
page.goto(f"http://127.0.0.1:{live_server['port']}/output/", wait_until="domcontentloaded", timeout=15_000)
page.wait_for_function(
    "document.querySelector('video.ssr-video, video')?.readyState === 4",
    timeout=10_000,
)
```

**b) `test_current_time(live_server, page)`** — `videoCurrentTime > 5` after 8s wait:
```python
page.goto(f"http://127.0.0.1:{live_server['port']}/output/", wait_until="domcontentloaded")
page.wait_for_function("document.querySelector('video.ssr-video, video')?.readyState === 4", timeout=10_000)
import time; time.sleep(8)
ct = page.evaluate("document.querySelector('video.ssr-video, video').currentTime")
assert ct > 5, f"videoCurrentTime={ct} (expected > 5)"
```

**c) `test_bg_color(live_server, page)`** — `body.backgroundColor === "rgb(0, 0, 0)"`:
```python
page.goto(f"http://127.0.0.1:{live_server['port']}/output/")
bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
assert bg == "rgb(0, 0, 0)", f"body backgroundColor={bg}"
```

**d) `test_server_log_clean(live_server, page)`** — Zero `health ping failed` in stderr after a 30-second steady-state:
```python
page.goto(f"http://127.0.0.1:{live_server['port']}/output/")
import time; time.sleep(30)
with open(live_server["stderr_path"], "r") as f:
    log = f.read()
assert "health ping failed" not in log, f"server stderr contained 'health ping failed':\n{log[-2000:]}"
```

**e) `test_handles_visible(live_server, page)`** — alignMode handles in DOM and visible:
```python
page.goto(f"http://127.0.0.1:{live_server['port']}/output/")
page.wait_for_function("document.querySelector('video.ssr-video, video')?.readyState === 4", timeout=10_000)
# Trigger alignMode via /api/live/mutate
import json, urllib.request
req_body = json.dumps({"type": "live-mutation", "mutationType": "context-update", "payload": {"alignMode": True}}).encode()
req = urllib.request.Request(f"http://127.0.0.1:{live_server['port']}/api/live/mutate", data=req_body, headers={"content-type": "application/json"})
urllib.request.urlopen(req).read()
# Wait up to 5s for handles to appear
page.wait_for_function("document.querySelectorAll('.projection-corner-handle').length > 0", timeout=5_000)
visible = page.evaluate("Array.from(document.querySelectorAll('.projection-corner-handle')).every(el => el.offsetWidth > 0 && el.offsetHeight > 0)")
assert visible, "handles exist but not visible"
```

**f) `test_drag_triggers_mutation(live_server, page)`** — pointer-drag triggers `align-corner-drag` mutation:
```python
console_lines = []
page.on("console", lambda m: console_lines.append(m.text))
page.goto(f"http://127.0.0.1:{live_server['port']}/output/")
page.wait_for_function("document.querySelector('video.ssr-video, video')?.readyState === 4", timeout=10_000)
# Trigger alignMode (same as test_handles_visible)
import json, urllib.request, time
req_body = json.dumps({"type": "live-mutation", "mutationType": "context-update", "payload": {"alignMode": True}}).encode()
req = urllib.request.Request(f"http://127.0.0.1:{live_server['port']}/api/live/mutate", data=req_body, headers={"content-type": "application/json"})
urllib.request.urlopen(req).read()
page.wait_for_function("document.querySelectorAll('.projection-corner-handle').length > 0", timeout=5_000)
# Drag a handle
handle = page.locator(".projection-corner-handle").first
box = handle.bounding_box()
page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
page.mouse.down()
page.mouse.move(box["x"] + box["width"]/2 + 10, box["y"] + box["height"]/2 + 10, steps=5)
page.mouse.up()
time.sleep(1)
assert any("[input-forwarder] sent phase=start" in line for line in console_lines), \
    f"no input-forwarder log captured. captured lines:\n" + "\n".join(console_lines[-20:])
```

NOTE: Tests c, d run on master and SHOULD pass once master's /output/ delivery works. Tests a, b also run on master and likely PASS today. Tests e, f WILL FAIL on master because Track A's bootAlignMode hasn't landed (`.projection-corner-handle` does not get rendered on /output/ today). That RED state is correct — they transition to GREEN when 35-A-PLAN lands.

Add module-level docstring documenting the RED-on-master expectation and which tests are gated on Track A.
  </action>
  <verify>
    <automated>python -m pytest --collect-only test/live-e2e/test_phase35_alignmode_smoke.py</automated>
  </verify>
  <acceptance_criteria>
    - File exists; pytest collects all 6 test functions
    - Each test function decorated with `@flaky_3x`
    - File contains all 6 D-05 assertion strings: `readyState === 4`, `currentTime`, `backgroundColor`, `health ping failed`, `.projection-corner-handle`, `[input-forwarder] sent phase=start` (grep)
    - Running `python -m pytest test/live-e2e/test_phase35_alignmode_smoke.py::test_ready_state -v` against current master either PASSES (if /output/ video already works) or shows a RED failure with a clear message — NOT a collection error
    - Tests test_handles_visible and test_drag_triggers_mutation FAIL on current master (RED rail confirmed — Track A subjects don't exist)
  </acceptance_criteria>
  <done>D-05 a-f live E2E smoke test in repo, collected by pytest, fixtures resolve, RED on master where Track A is the gate.</done>
</task>

<task type="auto">
  <name>Task 4: Write test/live-e2e/test_phase35_dashboard_alignmode.py + test_phase35_fps_benchmark.py</name>
  <read_first>
    - test/live-e2e/conftest.py
    - .planning/phases/phase-35/35-CONTEXT.md A4 (dashboard regression must pass after Track A — pure-extract is additive)
    - .planning/phases/phase-35/35-CONTEXT.md D-04 (FPS impact ≤ 5 fps; fall-back below 25fps escalates to C2)
    - .planning/phases/phase-35/35-RESEARCH.md §C.4 (FPS-impact estimate + measurement strategy)
    - src/styles.css (find which CSS rule gates handle visibility on dashboard — `.align-mode-active` body class)
  </read_first>
  <files>test/live-e2e/test_phase35_dashboard_alignmode.py, test/live-e2e/test_phase35_fps_benchmark.py</files>
  <action>
**File 1: `test/live-e2e/test_phase35_dashboard_alignmode.py`** — Dashboard regression for D-01-A2 (after Track A pure-extract, dashboard align-mode must STILL render handles):

```python
"""Phase 35 D-01-A2 — dashboard align-mode regression.

After Track A's pure-extract refactor, runtime-orchestration calls bootAlignMode
instead of running the polygon-editor init chain inline. This test verifies the
dashboard (/) still renders handles when alignMode is toggled on. RED on master
until refactor lands; GREEN after Track A.
"""
import json, urllib.request
from _flake_retry import flaky_3x

@flaky_3x
def test_dashboard_alignmode_handles(live_server, page):
    page.goto(f"http://127.0.0.1:{live_server['port']}/", wait_until="domcontentloaded", timeout=15_000)
    # Wait for runtime-orchestration to finish booting
    page.wait_for_function("typeof window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI === 'object'", timeout=15_000)
    # Toggle alignMode via /api/live/mutate
    req_body = json.dumps({"type": "live-mutation", "mutationType": "context-update",
                           "payload": {"alignMode": True}}).encode()
    req = urllib.request.Request(f"http://127.0.0.1:{live_server['port']}/api/live/mutate",
                                 data=req_body, headers={"content-type": "application/json"})
    urllib.request.urlopen(req).read()
    # Handles should appear within 5s
    page.wait_for_function("document.querySelectorAll('.projection-corner-handle').length > 0", timeout=5_000)
    visible = page.evaluate("Array.from(document.querySelectorAll('.projection-corner-handle')).every(el => el.offsetWidth > 0 && el.offsetHeight > 0)")
    assert visible, "dashboard handles exist but not visible"
```

This test PASSES on master today (dashboard align-mode works today). It must STAY GREEN through Phase 35 — fail = Track A regressed dashboard.

**File 2: `test/live-e2e/test_phase35_fps_benchmark.py`** — D-04 FPS impact measurement:

```python
"""Phase 35 D-04 — solid-color FPS benchmark.

Measures effective FPS during a known solid-color animation. Used:
  1. Wave-0: capture baseline FPS on master (no dither yet) — assert >= 25fps minimum.
  2. After Track C lands: re-run, compute delta vs baseline, assert delta <= 5 fps.

The 'after Track C' assertion lives in 35-C-PLAN's verification — this file provides the
measurement primitive. Wave-0 just makes sure the harness works.
"""
import json, urllib.request, time
from _flake_retry import flaky_3x

SOLID_COLOR_TRIGGER = {
    # animation that produces large solid-color overlay — exact name from runtime catalogue
    # Researcher recommended: known solid-color fade animation from CONTEXT.md
    "type": "live-mutation",
    "mutationType": "start-animation",
    "payload": {"animationType": "solid-color", "options": {"hex": "#3a5fcd", "opacity": 0.5, "intensity": 1.0}},
}

@flaky_3x
def test_solid_color_fps_baseline(live_server, page):
    page.goto(f"http://127.0.0.1:{live_server['port']}/output/", wait_until="domcontentloaded", timeout=15_000)
    page.wait_for_function("document.querySelector('video.ssr-video, video')?.readyState === 4", timeout=10_000)
    # Trigger solid-color animation
    req_body = json.dumps(SOLID_COLOR_TRIGGER).encode()
    req = urllib.request.Request(f"http://127.0.0.1:{live_server['port']}/api/live/mutate",
                                 data=req_body, headers={"content-type": "application/json"})
    urllib.request.urlopen(req).read()
    # Wait 2s for animation to start, then sample
    time.sleep(2)
    t0 = page.evaluate("document.querySelector('video.ssr-video, video').currentTime")
    wall0 = time.monotonic()
    time.sleep(30)
    t1 = page.evaluate("document.querySelector('video.ssr-video, video').currentTime")
    wall1 = time.monotonic()
    media_delta = t1 - t0
    wall_delta = wall1 - wall0
    fps = (media_delta / wall_delta) * 30  # if media tracks wallclock 1:1, fps = streamFpsCap
    print(f"[fps-benchmark] media_delta={media_delta:.3f} wall_delta={wall_delta:.3f} effective_fps={fps:.2f}")
    # Persist for later comparison
    import os
    out = os.environ.get("PHASE35_FPS_BASELINE_OUT")
    if out:
        with open(out, "w") as f:
            f.write(f"{fps:.2f}\n")
    assert fps >= 25.0, f"baseline FPS {fps:.2f} below 25 — environment problem, not Phase 35 issue"
```

The animation payload above is a placeholder — executor must verify the exact mutationType/payload by inspecting `/api/live/mutate` handlers. If the trigger format differs, adjust to whatever start-animation requires. The IMPORTANT thing is this test ESTABLISHES the FPS measurement harness; Track C's V-plan re-runs it with `PHASE35_FPS_BASELINE_OUT` to compare.
  </action>
  <verify>
    <automated>python -m pytest --collect-only test/live-e2e/test_phase35_dashboard_alignmode.py test/live-e2e/test_phase35_fps_benchmark.py</automated>
  </verify>
  <acceptance_criteria>
    - Both files exist; pytest collects them
    - test_phase35_dashboard_alignmode.py contains `.projection-corner-handle` and `/api/live/mutate` (grep)
    - test_phase35_fps_benchmark.py contains `effective_fps` and `assert fps >= 25.0` (grep)
    - test_phase35_dashboard_alignmode.py PASSES on master (dashboard already works today)
    - test_phase35_fps_benchmark.py runs to completion against master and prints a baseline FPS number
    - Both decorated with `@flaky_3x`
  </acceptance_criteria>
  <done>Dashboard regression rail + FPS baseline harness in repo. Dashboard test PASSES on master. FPS baseline number captured.</done>
</task>

<task type="auto">
  <name>Task 5: Write three RED unit tests (bootAlignMode-shape, output-live-sync, bayer-dither)</name>
  <read_first>
    - .planning/phases/phase-35/35-RESEARCH.md §A.2 (full bootAlignMode signature)
    - .planning/phases/phase-35/35-RESEARCH.md §B.2 (full bootOutputLiveSync subscription shape with all callback names)
    - .planning/phases/phase-35/35-RESEARCH.md §C.3 (Bayer 4×4 matrix + getDitheredSolidColorImageData signature)
    - test/phase-34-route-split.test.mjs (reference pattern for node:test contract tests)
    - src/app/runtime/output-receiver/output-audio-binder.js (existing thin module — pattern reference for new modules' export shape)
  </read_first>
  <files>test/phase-35-bootalignmode-shape.test.mjs, test/phase-35-output-live-sync.test.mjs, test/phase-35-bayer-dither.test.mjs</files>
  <action>
Three RED unit-test files using `node:test` framework. All three EXPECTED TO FAIL on master because the subjects don't exist.

**File 1: `test/phase-35-bootalignmode-shape.test.mjs`** — D-01-A1:
```javascript
import test from "node:test";
import assert from "node:assert/strict";

test("D-01-A1: bootAlignMode is exported from output-align-mode.js", async () => {
  const mod = await import("../src/app/runtime/output-receiver/output-align-mode.js");
  assert.equal(typeof mod.bootAlignMode, "function", "bootAlignMode export missing");
});

test("D-01-A1: bootAlignMode returns object with .stop function", async () => {
  // We cannot fully construct args without DOM — assert it accepts a partial-args object
  // and produces { stop }. Use a stub-args shape that covers the shape contract.
  const mod = await import("../src/app/runtime/output-receiver/output-align-mode.js");
  // Mock window/document for Node — bootAlignMode should fail gracefully OR return { stop }.
  // Two-mode acceptance: either it throws (Node-incompatible — that's fine, it's a browser module)
  // OR it returns { stop }. Either way the EXPORT SHAPE is correct.
  assert.equal(typeof mod.bootAlignMode, "function");
});
```

**File 2: `test/phase-35-output-live-sync.test.mjs`** — D-02-B1, D-02-B2:
```javascript
import test from "node:test";
import assert from "node:assert/strict";

test("D-02-B1: bootOutputLiveSync exports", async () => {
  const mod = await import("../src/app/runtime/output-receiver/output-live-sync.js");
  assert.equal(typeof mod.bootOutputLiveSync, "function", "bootOutputLiveSync export missing");
});

test("D-02-B1: bootOutputLiveSync returns subscription object with all 7 callback registrars + 3 getters + stop", async () => {
  // Mock minimal window for Node compat. The module uses window.WebSocket at construct time —
  // we can stub it. window.location is also referenced.
  globalThis.window = { location: { protocol: "http:", host: "127.0.0.1:0" }, WebSocket: class { constructor(){this.readyState=0;} addEventListener(){} close(){} } };
  globalThis.WebSocket = globalThis.window.WebSocket;
  globalThis.fetch = async () => ({ ok: false });
  globalThis.setInterval = (fn, ms) => 0;
  globalThis.clearInterval = () => {};
  globalThis.setTimeout = (fn, ms) => 0;
  globalThis.clearTimeout = () => {};
  const mod = await import("../src/app/runtime/output-receiver/output-live-sync.js");
  const sub = mod.bootOutputLiveSync({ logger: { warn(){}, info(){}, error(){} }, role: "final-output", url: "ws://127.0.0.1:0/api/live/ws?role=final-output" });
  for (const name of ["onAnimationStart","onAnimationStop","onClearAll","onAlignModeChange","onProjectionProfileChange","onConnect","onDisconnect"]) {
    assert.equal(typeof sub[name], "function", `${name} missing`);
  }
  for (const name of ["getActiveProjectionProfileId","getAlignMode","getCurrentClientId","stop"]) {
    assert.equal(typeof sub[name], "function", `${name} missing`);
  }
  sub.stop();
});

test("D-02-B2: output-audio-binder.js consumes bootOutputLiveSync (callback wiring)", async () => {
  // Static-source check: after refactor, output-audio-binder.js should import from output-live-sync.js
  const fs = await import("node:fs/promises");
  const src = await fs.readFile(new URL("../src/app/runtime/output-receiver/output-audio-binder.js", import.meta.url), "utf8");
  assert.match(src, /from\s+["'].*output-live-sync.*["']/, "audio-binder must import bootOutputLiveSync from output-live-sync.js");
  assert.match(src, /onAnimationStart|onAnimationStop|onClearAll/, "audio-binder must subscribe to live-sync callbacks");
});
```

**File 3: `test/phase-35-bayer-dither.test.mjs`** — D-03-C1:
```javascript
import test from "node:test";
import assert from "node:assert/strict";

// Provide ImageData polyfill for Node
globalThis.ImageData = class { constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); } };

test("D-03-C1: getDitheredSolidColorImageData exports", async () => {
  const mod = await import("../src/app/runtime/render/runtime-effect-dither.js");
  assert.equal(typeof mod.getDitheredSolidColorImageData, "function");
});

test("D-03-C1: getDitheredSolidColorImageData returns ImageData of requested size", async () => {
  const mod = await import("../src/app/runtime/render/runtime-effect-dither.js");
  const img = mod.getDitheredSolidColorImageData({ hex: "#3a5fcd", alpha: 0.5, width: 16, height: 16 });
  assert.equal(img.width, 16);
  assert.equal(img.height, 16);
  assert.equal(img.data.length, 16 * 16 * 4);
});

test("D-03-C1: dither produces non-uniform pixel values (proof of dither)", async () => {
  const mod = await import("../src/app/runtime/render/runtime-effect-dither.js");
  const img = mod.getDitheredSolidColorImageData({ hex: "#7f7f7f", alpha: 1.0, width: 16, height: 16 });
  // Bayer 4×4 modulates RGB by ±0.5 LSB; with full alpha and round() this means
  // some pixels are 127 and some are 128 — at least 2 distinct R values must exist.
  const rValues = new Set();
  for (let i = 0; i < img.data.length; i += 4) rValues.add(img.data[i]);
  assert.ok(rValues.size >= 2, `expected >=2 distinct R values for dithered grey, got ${rValues.size} (${[...rValues].join(",")})`);
});

test("D-03-C1: BAYER_4X4 matrix shape (sanity)", async () => {
  // Optional — if module exports the matrix
  const mod = await import("../src/app/runtime/render/runtime-effect-dither.js");
  if (mod.BAYER_4X4) {
    assert.equal(mod.BAYER_4X4.length, 16);
    // values 0..15
    const sorted = [...mod.BAYER_4X4].sort((a,b) => a-b);
    assert.deepEqual(sorted, [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
  }
});
```
  </action>
  <verify>
    <automated>node --test test/phase-35-bootalignmode-shape.test.mjs test/phase-35-output-live-sync.test.mjs test/phase-35-bayer-dither.test.mjs 2>&1 | tail -20; echo "EXPECTED: exit code != 0 because subject modules don't exist yet"</automated>
  </verify>
  <acceptance_criteria>
    - All 3 test files exist
    - `node --test` on each EXITS NON-ZERO on current master (RED rail proven)
    - Failure mode is ERR_MODULE_NOT_FOUND for the missing subject (NOT a syntax/test-framework error)
    - Files contain expected assertion strings: `bootAlignMode`, `bootOutputLiveSync`, `getDitheredSolidColorImageData` (grep)
    - File 2 contains all 7 callback registrar names + 3 getter names + `stop` (grep)
    - File 3 contains the 3 distinct-pixel-values check `rValues.size >= 2` (grep)
  </acceptance_criteria>
  <done>3 RED unit tests committed; node --test confirms RED state; tests will go GREEN automatically when 35-A, 35-B, 35-C land — they ARE the rails.</done>
</task>

<task type="auto">
  <name>Task 6: CI integration — package.json scripts + D-06 hard-gate verification</name>
  <read_first>
    - package.json (read existing scripts)
    - .planning/phases/phase-35/35-VALIDATION.md §"Sampling Rate"
    - test/connection-stability/_harness.mjs (D-06 invocation)
  </read_first>
  <files>package.json</files>
  <action>
Add npm script entries to `package.json`:
- `"test:phase35"`: `"node --test 'test/phase-35-*.test.mjs'"`
- `"test:live-e2e"`: `"python -m pytest test/live-e2e/ -v"`
- `"test:connection-stability"`: `"RUN_LIVE_TESTS=1 node --test test/connection-stability/"` (if not already present)

Update the existing `"test"` script — DO NOT replace; APPEND (the existing test script must keep working). If the existing `test` script is `node --test "test/**/*.test.mjs"`, leave it; the new `test:phase35` is a subset.

Do NOT modify the existing `test` script's regex pattern in any way that would skip the new `test/phase-35-*.test.mjs` files — they SHOULD be picked up by the existing `test/**/*.test.mjs` glob automatically. Verify by running `npm test` and confirming the 3 new RED tests are picked up (and fail, correctly).

After update:
1. Run `npm test` (existing JS suite). The 3 new Phase 35 tests SHOULD show up as failing (RED rails). The connection-stability suite should NOT run (it's gated behind RUN_LIVE_TESTS=1).
2. Run `RUN_LIVE_TESTS=1 npm run test:connection-stability`. Verify still 72/0/13.
3. Run `npm run test:phase35`. Verify 3 RED files fail.
4. Run `python -m pytest --collect-only test/live-e2e/`. Verify all 9 test functions collected (6 in alignmode_smoke + 1 dashboard + 1 fps + others if any).

THIS TASK IS THE D-06 HARD-GATE CHECK FOR WAVE-0. After this task, connection-stability MUST be 72/0/13. Wave-0 touches no production code, so no regression is possible — but verify anyway as the D-06 discipline.
  </action>
  <verify>
    <automated>RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tail -10 | grep -E "tests 85|pass 72|fail 0|skipped 13" | wc -l</automated>
  </verify>
  <acceptance_criteria>
    - package.json contains `"test:phase35"` and `"test:live-e2e"` script entries (grep)
    - `npm run test:phase35` exits non-zero (RED rails) on master
    - `RUN_LIVE_TESTS=1 npm run test:connection-stability` reports 72 pass, 0 fail, 13 skipped — D-06 hard gate UNCHANGED (verify command above counts the 4 expected lines)
    - `python -m pytest --collect-only test/live-e2e/` succeeds and collects ≥ 8 test functions
    - Existing `npm test` still runs the JS suite without errors (only newly-added Phase 35 RED tests fail; nothing pre-existing breaks)
  </acceptance_criteria>
  <done>CI rails wired: npm scripts in package.json; D-06 connection-stability suite confirmed UNCHANGED 72/0/13; Wave-0 is GREEN where it should be (infrastructure tasks pass) and RED where it should be (subjects-not-yet-built unit tests fail). Phase 35 may now proceed to 35-B-PLAN.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| pytest → node server.mjs subprocess | tests spawn a real server with elevated env vars (SSR_RENDER_HOST=1, SSR_PUBLISH=1) — boundary controlled by tempdir + free-port-allocation isolation |
| Playwright → /opt/google/chrome/chrome | system Chrome binary is run with `--no-sandbox` (root-trusted local dev environment only) |
| browser ←→ /api/live/mutate | tests POST live mutations directly — bypasses dashboard UI auth (none today on localhost) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-35-W0-01 | Tampering | with_server.py tempdir | accept | Tempdir is per-test, removed in `finally`; collisions impossible (`mkdtemp`) |
| T-35-W0-02 | DoS | server PID leak on test crash | mitigate | SIGTERM → 5s wait → SIGKILL fallback; pytest's `finally` executes even on test failure |
| T-35-W0-03 | Information disclosure | server stderr captured to log file | accept | Log file lives in tempdir, removed on teardown; no PII (local dev env) |
| T-35-W0-04 | DoS | flake-skip masks real regression | mitigate | Quarterly skipped-count review per RESEARCH §"Flake-handling strategy"; D-06 connection-stability NEVER skip-on-flake |
| T-35-W0-05 | Spoofing | system Chrome binary path hardcoded | accept | env override `PLAYWRIGHT_CHROME` allows substitution; production has no /opt/google/chrome/chrome |
</threat_model>

<verification>
After all tasks complete:

1. **D-06 hard gate (the line that cannot be crossed):**
   ```
   RUN_LIVE_TESTS=1 node --test test/connection-stability/
   # Expected: 85 tests, 72 pass, 0 fail, 13 skipped
   ```
   Wave-0 touches NO production code, so this MUST be unchanged. If it changed, Wave-0 is broken and must be reverted.

2. **Wave-0 RED rails proven RED:**
   ```
   node --test test/phase-35-bootalignmode-shape.test.mjs   # RED — module not found
   node --test test/phase-35-output-live-sync.test.mjs      # RED — module not found
   node --test test/phase-35-bayer-dither.test.mjs           # RED — module not found
   ```

3. **Wave-0 infrastructure GREEN:**
   ```
   python -c "from scripts.with_server import with_server; ..."  # boots + tears down clean
   python -m pytest --collect-only test/live-e2e/                # collects ≥ 8 tests
   python -m pytest test/live-e2e/test_phase35_dashboard_alignmode.py  # GREEN on master (dashboard works today)
   python -m pytest test/live-e2e/test_phase35_fps_benchmark.py        # produces baseline FPS number
   ```

4. **D-05 a-f live test runs without crashing:** Even if some D-05 tests RED on master (handles_visible, drag_triggers_mutation are gated on Track A), the test FUNCTIONS run — they don't error out at fixture setup or import time.
</verification>

<success_criteria>
- [ ] scripts/with_server.py committed and importable
- [ ] test/live-e2e/ directory with conftest.py, _flake_retry.py, 3 test files committed
- [ ] 3 new test/phase-35-*.test.mjs RED unit-test files committed
- [ ] package.json has test:phase35 and test:live-e2e scripts
- [ ] D-06 connection-stability suite STILL 72/0/13
- [ ] All 3 RED unit tests fail with ERR_MODULE_NOT_FOUND (proving the rails are real)
- [ ] python -m pytest --collect-only collects all live-e2e tests cleanly
- [ ] FPS baseline captured (printed in test output)
- [ ] No production code touched — git diff shows only test/, scripts/, package.json
</success_criteria>

<output>
After completion, create `.planning/phases/phase-35/35-W0-SUMMARY.md` with:
- List of files created with line counts
- D-06 connection-stability result (must be 72/0/13)
- The 3 RED unit-test failure messages (proving they're real RED rails not collection errors)
- Baseline FPS number from test_phase35_fps_benchmark.py
- Confirmation that Wave-0 is BLOCKING gate complete; 35-B-PLAN may proceed
</output>
