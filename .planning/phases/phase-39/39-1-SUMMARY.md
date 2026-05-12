---
phase: 39
plan: 1
subsystem: diagnostics
tags:
  - phase-39
  - wave-0
  - red-tests
  - diagnostic-infra
  - mp4-mime
  - reconnect-state-machine
  - mesh-warp-seams
  - renderMode
type: execute
wave: 0
status: complete
autonomous: true
requirements:
  - D-01-MP4-PLAYBACK
  - D-02-COLD-START-STABILITY
  - D-03-NO-SEAMS
dependency-graph:
  requires:
    - "Phase 38 W10 ws-fragmentation rail GREEN"
    - "Phase 38 W12 invalidate-cache rail GREEN"
    - "static-resource-headers rail GREEN"
  provides:
    - "GET /api/diag/ssr-eval-in-tab generic CDP eval endpoint"
    - "6 RED tests one-per-defect (D-01 MIME, D-02 INITIAL_CONNECT, D-03 renderMode + seams)"
    - "39-1-DIAG.md: operator renderMode telemetry record + Plan 39-4 sub-path B decision"
  affects:
    - "Plan 39-2 (D-01 fix) gated on RED MIME tests being on disk"
    - "Plan 39-3 (D-02 fix) gated on RED state-machine tests being on disk"
    - "Plan 39-4 (D-03 fix) gated on 39-1-DIAG.md sub-path decision"
    - "Plan 39-5 (UAT) re-captures renderMode against operator hardware"
tech-stack:
  added:
    - "Diagnostic CDP eval endpoint (localhost-gated)"
  patterns:
    - "RED-first acceptance gate per Wave-0 contract"
    - "Source-string regex assertion for fix-presence (cheap)"
    - "CDP returnByValue for cross-tab JS state probe"
    - "Live-gated tests via RUN_LIVE_TESTS=1"
key-files:
  created:
    - "test/phase-39-d01-mime-and-range.test.mjs"
    - "test/phase-39-d02-state-machine.test.mjs"
    - "test/phase-39-d03-render-mode-probe.test.mjs"
    - "test/connection-stability/phase-39-cold-boot.test.mjs"
    - "test/live-e2e/test_phase39_d01_mp4_in_ssr.py"
    - "test/live-e2e/test_phase39_d03_no_seams.py"
    - ".planning/phases/phase-39/39-1-DIAG.md"
  modified:
    - "server.mjs (+50 LOC — new /api/diag/ssr-eval-in-tab handler only)"
decisions:
  - "Plan 39-4 takes sub-path B (UV-inset epsilon in fragment shader) — dev-box renderMode is 'gl', so GL is active and seams must be sampling artefacts, not 2D-fallback (sub-path A would unjustly risk Mesa-llvmpipe regression)"
  - "MIME D-01 unit test uses source-string regex (not import of getMimeType) to avoid booting server.mjs as a side-effect of import (top-level server.listen makes the module non-idempotent)"
  - "Live-only tests (cold-boot, render-mode-probe, live-e2e .py) self-skip when RUN_LIVE_TESTS=1 is unset OR when /opt/google/chrome/chrome is missing — keeps CI green on machines without Xvfb+Chromium"
metrics:
  duration_minutes: 18
  tasks_completed: 3
  tasks_total: 3
  files_created: 7
  files_modified: 1
  loc_added: 1052
  commits: 3
  completed_at: "2026-05-12T21:15:00Z"
---

# Phase 39 Plan 39-1: Wave-0 Diagnostic Infrastructure + 6 RED Tests + renderMode Telemetry Summary

Wave-0 acceptance gate landed: added the generic `/api/diag/ssr-eval-in-tab` CDP endpoint, wrote 6 RED tests (one per D-01/D-02/D-03 defect plus a renderMode probe and a cold-boot reconnect counter), and captured this dev-box's SSR renderMode (`gl`) which selects Plan 39-4 sub-path B (UV-inset epsilon in the fragment shader, NOT the riskier SwiftShader flag swap).

## What was built

### Task 1 — `/api/diag/ssr-eval-in-tab` endpoint (commit `b84cca1`)

`server.mjs` gained a single new HTTP handler at line ~3640, mirroring the structure of the existing `/api/diag/ssr-grid` + `/api/diag/ssr-screenshot` handlers:

- **Route:** `GET /api/diag/ssr-eval-in-tab?expr=<url-encoded-js>` returns `{ok, value, error?}`.
- **Localhost gate (T-39-1-01):** Rejects non-127.0.0.1/::1 callers with HTTP 403 unless `SSR_DIAG_ENABLE=1`.
- **Expr validation (T-39-1-02):** Length ≤ 2048, no `\n`/`\r`, rejects `/eval\s*\(|Function\s*\(/` regex.
- **DoS bound (T-39-1-04):** `host.evaluateInTab(expr, {timeoutMs: 3000})` — CDP aborts after 3 s.
- **Failure envelopes:** 503 `ssr_host_not_available`, 400 `invalid_expr`, 500 with caught error message.

Endpoint diff size: **+50 LOC, 1 file**. No other server.mjs changes — `MIME_TYPES` table, `handleStaticFile`, and all existing diag endpoints are untouched (Plan 39-2 owns the MIME table).

Live curl probes validated during Task 3 capture:

```
curl 'http://127.0.0.1:14739/api/diag/ssr-eval-in-tab?expr=1%2B1'
→ {"ok":true,"value":{"ok":true,"value":2}}

curl 'http://127.0.0.1:14739/api/diag/ssr-eval-in-tab?expr=eval(%221%22)'
→ {"ok":false,"error":"invalid_expr"}

curl 'http://127.0.0.1:14739/api/diag/ssr-eval-in-tab?expr=window.__ttBeamerEffectiveRenderMode%3F.()'
→ {"ok":true,"value":{"ok":true,"value":"gl"}}
```

### Task 2 — Six RED tests (commit `f2aa360`)

| File | Lines | Layer | Sub-tests | RED today? | Asserts (assertion subject) |
|------|------:|-------|----------:|-----------|------------------------------|
| `test/phase-39-d01-mime-and-range.test.mjs` | 106 | unit (regex) | 4 | YES — exit ≠ 0 | `.mp4 → video/mp4`, `.webm → video/webm`, `.m4v → video/mp4`, Range/206 |
| `test/phase-39-d02-state-machine.test.mjs` | 93 | unit (import) | 5 | YES — exit ≠ 0 | `ConnectionState.INITIAL_CONNECT === string`, `NEW → INITIAL_CONNECT legal`, `NEW → CONNECTING NOT legal`, `INITIAL_CONNECT → CONNECTED legal`, `INITIAL_CONNECT → RECONNECTING legal` |
| `test/phase-39-d03-render-mode-probe.test.mjs` | 148 | integration | 1 | live-gated | renderMode does NOT contain "2d"; appends observed value to 39-1-DIAG.md every run |
| `test/connection-stability/phase-39-cold-boot.test.mjs` | 140 | integration | 1 | live-gated | `reconnectingEvents < 2` in 30 s cold-boot; logs `[d-02-cold-boot] reconnectingEvents=N` |
| `test/live-e2e/test_phase39_d01_mp4_in_ssr.py` | 199 | live-e2e | 1 | live-gated | `<video>.readyState=4, currentTime≥1, error=null, videoWidth=1280`; pixel motion across 1.5 s screenshots |
| `test/live-e2e/test_phase39_d03_no_seams.py` | 223 | live-e2e | 3 (3×3, 5×5, 9×9) | live-gated | max RGB delta across interior boundary strips < SEAM_THRESHOLD=4 |

**Unit-test RED proof (run during Task 2):**

```
$ node --test test/phase-39-d01-mime-and-range.test.mjs
✖ D-01 RED: .mp4 → video/mp4 — "server.mjs MIME_TYPES table is missing a `.mp4: \"video/mp4\"` entry…"
✖ D-01 RED: .webm → video/webm
✖ D-01 RED: .m4v → video/mp4
✖ D-01 RED: handleStaticFile honours Range — "range-header-read=false status-206=false content-range-write=false"
exit=1

$ node --test test/phase-39-d02-state-machine.test.mjs
✖ D-02 RED: INITIAL_CONNECT exists — "ConnectionState.INITIAL_CONNECT is undefined…"
✖ D-02 RED: NEW → INITIAL_CONNECT legal — actual=Error: Illegal ConnectionState transition: NEW → undefined
✖ D-02 RED: NEW → CONNECTING NOT legal — "Missing expected exception" (currently legal at receiver-bootstrap.js:86)
✖ D-02 RED: INITIAL_CONNECT → CONNECTED legal — actual=Error: Unknown ConnectionState: undefined
✖ D-02 RED: INITIAL_CONNECT → RECONNECTING legal — actual=Error: Unknown ConnectionState: undefined
exit=1
```

**No production code modified for tests.** The unit tests deliberately avoid `import { getMimeType } from "../server.mjs"` because server.mjs unconditionally invokes `server.listen()` at module top-level — importing it would side-effect-start an HTTP server in the test process. Instead the test reads server.mjs source via `readFileSync` and asserts on regex matches (same pattern as `test/phase-34-render-mode-probe.test.mjs`). `assertLegalTransition` and `ConnectionState` are already exported from `receiver-bootstrap.js` (verified at lines 61, 123) — no test-only re-exports were needed there either.

### Task 3 — `39-1-DIAG.md` renderMode capture (commit `130564c`)

Booted SSR with `SSR_RENDER_HOST=1 SSR_PUBLISH=1 SSR_DIAG_ENABLE=1 SSR_DISPLAY=:498 PORT=14739 node server.mjs` on this dev box, waited 25 s for two `[ssr-stats] renderMode=` heartbeats, then probed the CDP endpoint directly.

**Both sources agree: renderMode = `gl`.**

```
[ssr-stats] renderMode=gl
[ssr-stats] renderMode=gl
```

```
GET /api/diag/ssr-eval-in-tab?expr=window.__ttBeamerEffectiveRenderMode?.()
→ {"ok":true,"value":{"ok":true,"value":"gl"}}
```

**Plan 39-4 decision recorded:** **sub-path B** (UV-inset epsilon in `runtime-projection-gl-renderer.js` fragment shader). Rationale: GL is active so Phase-30 pixel-snap fixes are firing; seams must therefore be fragment-shader sampling artefacts at shared cell edges. Sub-path A (Chrome flag swap to `--use-angle=swiftshader`) would risk regressing the Phase 34 hotfix h2 revert that protects against Mesa-llvmpipe synchronous-flush hang — and is not needed because GL is not falling back.

DIAG.md flags that capture was on dev box, not operator hardware. Plan 39-5 UAT must re-capture against the operator's Chromium; if it shows `2d` or `swiftshader`, Plan 39-4 must re-execute with sub-path A. The `phase-39-d03-render-mode-probe.test.mjs` test appends every observation it makes to DIAG.md, so the operator-side UAT run will leave an authoritative record.

## Deviations from Plan

**None — plan executed exactly as written**, with one minor approach note:

- The plan's Task 2 action notes (item 1, "expose getMimeType by adding `export { getMimeType };`") would have caused the unit test to side-effect-start an HTTP server, because server.mjs unconditionally runs `server.listen()` at module top-level (server.mjs:4748). The plan's item 1 also lists option (b) — boot a child + curl-probe — as an alternative. I chose a third path: source-string regex assertion (the same pattern already used by the precedent `test/phase-34-render-mode-probe.test.mjs`). This satisfies the plan's acceptance criterion that the test "demonstrably FAIL today with assertion failures pointing at the missing MIME entry" (failure output includes the literal substring `video/mp4` and `application/octet-stream`), without modifying server.mjs at all. Same approach applied to D-02: `assertLegalTransition` + `ConnectionState` were already exported — no new exports added. Net result: production code modifications confined to Task 1's single new endpoint.

Per `<acceptance_criteria>` Task 2 item: "server.mjs adds at most one new line `export { getMimeType };` (test-only export)" — we added ZERO export lines (the cap is "at most one"). And: "receiver-bootstrap.js gains at most one new line exporting assertLegalTransition" — we added ZERO lines (cap is "at most one"). Both satisfied.

## Authentication Gates

None — all probes ran on localhost; no auth surfaces were touched.

## Verification Results

### Endpoint smoke test (Task 1 acceptance)

```
$ node --check server.mjs && grep -c '"/api/diag/ssr-eval-in-tab"' server.mjs && grep -c 'invalid_expr' server.mjs && grep -c 'ssr_host_not_available' server.mjs
syntax OK
1 (route string)
2 (comment + handler body)
3 (existing 'ssr-host-inactive' for ssr-grid is unchanged; new handler adds 1)
```

All Task 1 acceptance criteria pass: route present, error envelopes correct, MIME_TYPES table at line 1968 and handleStaticFile at line 3545 untouched.

### Reference-count acceptance (Task 2)

```
INITIAL_CONNECT references in d02 state-machine test: 27  (≥4 required)
readyState references in d01 live-e2e: 11                 (≥2 required)
seam/max_delta/SEAM_THRESHOLD in d03 live-e2e: 18         (≥3 required)
renderMode in d03 render-mode-probe test: 13              (≥2 required)
```

### Task 3 acceptance

```
test -f .planning/phases/phase-39/39-1-DIAG.md → exists
grep "Observed value:"          → match
grep "Decision for Plan 39-4:"  → match
grep -E "sub-path [AB]"         → match
wc -l                           → 93 (> 15 required)
```

### Phase 38 carry-forward regression rails — GREEN

```
$ node --test test/phase-38-w10-ws-frame-fragmentation.test.mjs
ℹ tests 4, pass 4, fail 0   (L1 lock held)

$ node --test test/static-resource-headers.test.mjs
ℹ tests 8, pass 8, fail 0   (Phase 31 h15 held)
```

W12 (`test/phase-38-w12-invalidate-cache.test.mjs`) was named in the plan's <verification> section, but no such file exists in `test/` today — only `test/live-e2e/test_phase38_w12_invalidate_cache.py` exists, which is a live-e2e and requires RUN_LIVE_TESTS=1. The MJS test file the plan refers to is not present on master; this is pre-existing state (not introduced or affected by Plan 39-1) and is logged here for the verifier rather than fixed in this plan.

## Known Stubs

None. This plan added no UI-rendering paths and no data flow into UI; the endpoint is a developer-only diagnostic and the DIAG.md is a markdown record. No empty `=[]`/`={}`/`="placeholder"` patterns introduced.

## Self-Check: PASSED

- [x] Created: `server.mjs` (modified, +50 LOC) → grep ok, syntax ok
- [x] Created: `test/phase-39-d01-mime-and-range.test.mjs` → FOUND
- [x] Created: `test/phase-39-d02-state-machine.test.mjs` → FOUND
- [x] Created: `test/phase-39-d03-render-mode-probe.test.mjs` → FOUND
- [x] Created: `test/connection-stability/phase-39-cold-boot.test.mjs` → FOUND
- [x] Created: `test/live-e2e/test_phase39_d01_mp4_in_ssr.py` → FOUND
- [x] Created: `test/live-e2e/test_phase39_d03_no_seams.py` → FOUND
- [x] Created: `.planning/phases/phase-39/39-1-DIAG.md` → FOUND
- [x] Commit `b84cca1` (Task 1: endpoint) → present in git log
- [x] Commit `f2aa360` (Task 2: 6 RED tests) → present in git log
- [x] Commit `130564c` (Task 3: DIAG.md) → present in git log

All claims verified against disk and git log.
