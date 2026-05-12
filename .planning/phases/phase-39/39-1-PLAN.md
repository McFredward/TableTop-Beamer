---
phase: 39
plan: 1
type: execute
wave: 0
depends_on: []
files_modified:
  - server.mjs
  - test/phase-39-d01-mime-and-range.test.mjs
  - test/phase-39-d02-state-machine.test.mjs
  - test/phase-39-d03-render-mode-probe.test.mjs
  - test/connection-stability/phase-39-cold-boot.test.mjs
  - test/live-e2e/test_phase39_d01_mp4_in_ssr.py
  - test/live-e2e/test_phase39_d03_no_seams.py
  - .planning/phases/phase-39/39-1-DIAG.md
autonomous: true
requirements:
  - D-01-MP4-PLAYBACK
  - D-02-COLD-START-STABILITY
  - D-03-NO-SEAMS
must_haves:
  truths:
    - "Diagnostic endpoint /api/diag/ssr-eval-in-tab returns SSR-tab JS expression results when SSR_RENDER_HOST=1"
    - "A RED test exists for D-01 that fails today (readyState=0, error.code=4) and will pass after MP4 MIME fix"
    - "A RED test exists for D-02 that fails today (≥2 RECONNECTING events in 30s cold-boot) and will pass after INITIAL_CONNECT state lands"
    - "A RED test exists for D-03 that fails today (boundary pixel ridge > threshold on 3×3 grid) and will pass after seam fix"
    - "The operator's renderMode telemetry value (from server log or live probe) is recorded in 39-1-DIAG.md to choose D-03 sub-path A vs B"
  artifacts:
    - path: "server.mjs"
      provides: "GET /api/diag/ssr-eval-in-tab?expr=... endpoint"
      contains: "/api/diag/ssr-eval-in-tab"
    - path: "test/phase-39-d01-mime-and-range.test.mjs"
      provides: "Unit test exercising getMimeType('.mp4') and Range header parsing"
    - path: "test/phase-39-d02-state-machine.test.mjs"
      provides: "Unit test asserting NEW → INITIAL_CONNECT legal and NEW → CONNECTING NOT legal"
    - path: "test/phase-39-d03-render-mode-probe.test.mjs"
      provides: "Integration test asserting SSR-tab renderMode does NOT contain '2d'"
    - path: "test/connection-stability/phase-39-cold-boot.test.mjs"
      provides: "Counts RECONNECTING events during 30s cold-boot — asserts < 2"
    - path: "test/live-e2e/test_phase39_d01_mp4_in_ssr.py"
      provides: "Live test: SSR-tab <video> readyState=4, currentTime>1.0, screenshot pixel diff > THRESHOLD"
    - path: "test/live-e2e/test_phase39_d03_no_seams.py"
      provides: "Live test: solid-color 3×3/5×5/9×9 grid boundary pixel ridge < SEAM_THRESHOLD"
    - path: ".planning/phases/phase-39/39-1-DIAG.md"
      provides: "Operator renderMode telemetry record — choose D-03 sub-path A or B"
  key_links:
    - from: "test/live-e2e/test_phase39_d01_mp4_in_ssr.py"
      to: "/api/diag/ssr-eval-in-tab"
      via: "HTTP GET with URL-encoded expr"
      pattern: "ssr-eval-in-tab"
    - from: "server.mjs handler for /api/diag/ssr-eval-in-tab"
      to: "host.evaluateInTab(expr)"
      via: "getActiveSsrRenderHost().evaluateInTab"
      pattern: "evaluateInTab"
    - from: "39-1-DIAG.md"
      to: "39-4-PLAN sub-path A vs B choice"
      via: "operator renderMode value documented in DIAG.md"
      pattern: "renderMode"
---

<objective>
Wave-0 diagnostic infrastructure + three RED tests, one per defect.

This plan is the gate. Wave 1 fix plans cannot start until this plan's RED tests are demonstrated to fail today (they MUST fail today, MUST pass after fix). D-03's diagnostic step is BLOCKING — Plan 39-4 cannot choose its sub-path (A: SwiftShader flag swap, B: UV-inset shader edit) without the operator's renderMode telemetry value recorded in 39-1-DIAG.md.

Purpose: Lock acceptance evidence before any fix lands. Phase 38 W10 spent 9 weeks behind a localhost-invisible bug because every test passed before the fix. Phase 39 will not repeat that.

Output:
- One new HTTP endpoint (/api/diag/ssr-eval-in-tab) used by D-01 + D-03 live tests
- Three RED unit/integration tests + two RED live tests
- One DIAG.md capturing operator renderMode telemetry
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/CRITICAL_KNOWN_BUGS.md
@.planning/phases/phase-39/39-RESEARCH.md
@.planning/phases/phase-38/38-CLOSURE.md

<interfaces>
<!-- Key types and contracts the executor needs. -->
<!-- Executor should use these directly — no codebase exploration needed. -->

From src/server/ssr-render-host.mjs (around line 952):
```javascript
// host.evaluateInTab(expression, { timeoutMs = 2000 } = {}) — runs JS expression
//   inside the SSR Chromium tab via CDP. Returns { ok: boolean, value: any, error?: string }.
//   `value` is JSON-serialized via returnByValue:true.
// host.captureScreenshot({ timeoutMs = 4000, quality = 60 } = {}) — returns
//   { ok: boolean, base64: string } (JPEG-base64).
// const host = { start, stop, restart, getStatus, evaluateInTab, captureScreenshot };
```

From server.mjs (around line 3595, existing /api/diag/ssr-grid pattern to mirror):
```javascript
// Existing pattern:
if (req.method === "GET" && routePath === "/api/diag/ssr-grid") {
  const host = getActiveSsrRenderHost();
  if (!host || typeof host.evaluateInTab !== "function") {
    res.writeHead(503, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "ssr_host_not_available" }));
    return;
  }
  // ... uses host.evaluateInTab("(() => { return window.grid; })()") ...
}
```

From .planning/phases/phase-39/39-RESEARCH.md §"D-01 Implementation approach":
```
Pre-fix expected output (verified empirically 2026-05-12):
  readyState=0, currentTime=0, error.code=4, videoWidth=0
Post-fix expected output:
  readyState=4, currentTime≥1.0, error=null, videoWidth=1280
```

From .planning/phases/phase-39/39-RESEARCH.md §"D-02 Validation architecture":
```javascript
// Today this test fires 3-6 RECONNECTING events on cold boot.
// After INITIAL_CONNECT lands, the first failure stays in INITIAL_CONNECT
// (no RECONNECTING event) until the 5s grace elapses, then escalates.
```

From .planning/phases/phase-39/39-RESEARCH.md §"D-03 Implementation Step 1":
```
Read the operator's server stdout for `[ssr-stats] renderMode=...` lines.
If "2d"/"swiftshader" → D-03 fix is the GL-flag swap (Plan 39-4 sub-path A).
If "webgl"/"webgl2"   → D-03 fix is the shader UV-inset (Plan 39-4 sub-path B).
```

From src/server/ssr-webrtc-signaling.mjs:485-491:
```javascript
// Server logs [ssr-stats] renderMode=<value> every 10th ssr-stats message
// (~every 10s). Search server.log or recent stdout for these lines.
```

From .planning/phases/phase-39/39-RESEARCH.md §"Security baseline":
```
/api/diag/ssr-eval-in-tab MUST:
  - require req.socket.remoteAddress === "127.0.0.1" (or "::1") OR
    process.env.SSR_DIAG_ENABLE === "1"
  - validate expr is a string, length ≤ 2048, no \n, no \r,
    reject patterns matching /eval\s*\(|Function\s*\(/
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add /api/diag/ssr-eval-in-tab endpoint to server.mjs</name>
  <read_first>
    - server.mjs (the file being modified) — read lines 3580-3700 to see the EXISTING /api/diag/ssr-grid and /api/diag/ssr-screenshot handlers; the new handler MUST mirror their structure (same getActiveSsrRenderHost() guard, same 503 envelope shape, same try/catch style)
    - src/server/ssr-render-host.mjs lines 940-1000 — see the exact signatures of host.evaluateInTab and host.captureScreenshot
    - src/server/ssr-webrtc-signaling.mjs lines 60-90 — the existing isLocalhost guard pattern to mirror for security
  </read_first>
  <files>server.mjs</files>
  <behavior>
    - GET /api/diag/ssr-eval-in-tab?expr=<url-encoded-js-expression> returns JSON {ok, value, error?}
    - When SSR_RENDER_HOST is not set OR host has no evaluateInTab method: returns 503 with {ok:false, error:"ssr_host_not_available"}
    - When remoteAddress is not 127.0.0.1 / ::1 AND SSR_DIAG_ENABLE !== "1": returns 403 with {ok:false, error:"forbidden"}
    - When expr is missing, not a string, length > 2048, contains \n or \r, or matches /eval\s*\(|Function\s*\(/: returns 400 with {ok:false, error:"invalid_expr"}
    - When all gates pass: returns 200 with {ok:true, value:<result of host.evaluateInTab>}
    - On evaluateInTab throw: returns 500 with {ok:false, error:<string>}
    - Curl probe: `curl -s 'http://127.0.0.1:4173/api/diag/ssr-eval-in-tab?expr=1%2B1'` returns `{"ok":true,"value":2}`
    - Curl probe: `curl -s 'http://127.0.0.1:4173/api/diag/ssr-eval-in-tab?expr=eval(%221%22)'` returns 400 with `invalid_expr`
  </behavior>
  <action>
Add a new handler to server.mjs immediately after the existing `/api/diag/ssr-screenshot` block (around server.mjs:3620-3700; the new handler comes BEFORE the closing brace of the request-router function). Use this exact structure:

```javascript
if (req.method === "GET" && routePath === "/api/diag/ssr-eval-in-tab") {
  // Phase 39 Plan 39-1: Generic CDP eval endpoint for diagnostic tests.
  // Reused by D-01 (probe <video> readyState) and D-03 (probe renderMode + DOM state).
  // Security: localhost-only OR SSR_DIAG_ENABLE=1; expr length ≤ 2048; no newlines;
  // no nested eval/Function patterns. See 39-RESEARCH.md §"Security baseline".
  const remote = req.socket?.remoteAddress || "";
  const isLocalhost = remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1";
  if (!isLocalhost && process.env.SSR_DIAG_ENABLE !== "1") {
    res.writeHead(403, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "forbidden" }));
    return;
  }
  const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const expr = urlObj.searchParams.get("expr");
  if (typeof expr !== "string" || expr.length === 0 || expr.length > 2048 || /[\n\r]/.test(expr) || /eval\s*\(|Function\s*\(/.test(expr)) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "invalid_expr" }));
    return;
  }
  const host = getActiveSsrRenderHost();
  if (!host || typeof host.evaluateInTab !== "function") {
    res.writeHead(503, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "ssr_host_not_available" }));
    return;
  }
  try {
    const result = await host.evaluateInTab(expr, { timeoutMs: 3000 });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, value: result }));
  } catch (err) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
  }
  return;
}
```

DO NOT touch the existing `/api/diag/ssr-grid` or `/api/diag/ssr-screenshot` handlers — they remain unchanged. DO NOT change any MIME table entries in this task (Plan 39-2 owns that). DO NOT touch handleStaticFile (Plan 39-2 owns that).

After editing, restart server and run the curl probes listed in <behavior>. Both must return the expected output.
  </action>
  <verify>
    <automated>node --check server.mjs && grep -q '"/api/diag/ssr-eval-in-tab"' server.mjs && grep -q "invalid_expr" server.mjs && grep -q "ssr_host_not_available" server.mjs && echo ok</automated>
  </verify>
  <acceptance_criteria>
    - grep -n "ssr-eval-in-tab" server.mjs returns ≥2 matches (the route string and a comment)
    - grep -n "invalid_expr" server.mjs returns ≥1 match
    - grep -n "ssr_host_not_available" server.mjs returns ≥2 matches (existing + new handler)
    - The new handler does NOT modify the existing MIME_TYPES table at server.mjs:1968
    - The new handler does NOT modify handleStaticFile at server.mjs:3545
    - `git diff server.mjs` shows ONLY additions inside the request-router (no deletions outside the new block)
    - node -c server.mjs (syntax check via node --check server.mjs) exits 0
  </acceptance_criteria>
  <done>Server.mjs has a new /api/diag/ssr-eval-in-tab handler mirroring the structure of the existing /api/diag/ssr-grid handler with localhost+env-gate, expr validation (length ≤ 2048, no \n\r, no nested eval/Function), and a returnByValue passthrough to host.evaluateInTab. The existing diag endpoints + MIME table + handleStaticFile are untouched.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Write 5 RED tests (3 unit/integration + 2 live-e2e) — one per defect, plus the renderMode probe</name>
  <read_first>
    - test/phase-38-w12-invalidate-cache.test.mjs — Phase 38 W12 test as a template for new MJS unit tests (assertion style, harness use)
    - test/connection-stability/_harness.mjs — bootServer/connectConsumer/teardown contract that the cold-boot test will use
    - test/live-e2e/test_phase38_ssr_grid_state_cdp.py — Python live-e2e template (fixture imports, /api/diag/ usage)
    - test/live-e2e/conftest.py — running_server + ssr_ready fixtures available to tests
    - src/app/runtime/output-receiver/receiver-bootstrap.js lines 61-114 — current ConnectionState enum and LEGAL_TRANSITIONS (the state-machine test asserts what is and is NOT currently legal)
    - .planning/phases/phase-39/39-RESEARCH.md §"Validation architecture" sub-sections under D-01, D-02, D-03 — the sketch code in research is the contract these tests must satisfy
  </read_first>
  <files>test/phase-39-d01-mime-and-range.test.mjs, test/phase-39-d02-state-machine.test.mjs, test/phase-39-d03-render-mode-probe.test.mjs, test/connection-stability/phase-39-cold-boot.test.mjs, test/live-e2e/test_phase39_d01_mp4_in_ssr.py, test/live-e2e/test_phase39_d03_no_seams.py</files>
  <behavior>
    Test 1 (test/phase-39-d01-mime-and-range.test.mjs — unit, MUST FAIL TODAY):
      - import { getMimeType } from "../server.mjs" (or via dynamic import + ESM module load if not directly exported — see existing test patterns)
      - test "getMimeType('.mp4') returns 'video/mp4'" → ASSERT EQUAL "video/mp4" (FAILS TODAY: returns "application/octet-stream")
      - test "getMimeType('.webm') returns 'video/webm'" → ASSERT EQUAL "video/webm" (FAILS TODAY)
      - test "getMimeType('.m4v') returns 'video/mp4'" → ASSERT EQUAL "video/mp4" (FAILS TODAY)
      - test "handleStaticFile responds to Range: bytes=0-1023 with status 206 and content-length 1024" — needs harness or curl-via-server (FAILS TODAY: returns 200 + full file)

    Test 2 (test/phase-39-d02-state-machine.test.mjs — unit, MUST FAIL TODAY):
      - import { ConnectionState, assertLegalTransition } from "../src/app/runtime/output-receiver/receiver-bootstrap.js"
      - test "ConnectionState.INITIAL_CONNECT is defined" → ASSERT typeof ConnectionState.INITIAL_CONNECT === "string" (FAILS TODAY: undefined)
      - test "NEW → INITIAL_CONNECT is legal" → assertLegalTransition does NOT throw (FAILS TODAY: throws because INITIAL_CONNECT doesn't exist)
      - test "NEW → CONNECTING is NOT legal" → assert.throws (FAILS TODAY: succeeds — currently legal per receiver-bootstrap.js:86)
      - test "INITIAL_CONNECT → CONNECTED is legal" → assertLegalTransition does NOT throw (FAILS TODAY)
      - test "INITIAL_CONNECT → RECONNECTING is legal" → assertLegalTransition does NOT throw (FAILS TODAY)

    Test 3 (test/phase-39-d03-render-mode-probe.test.mjs — integration, MUST FAIL TODAY OR REVEAL renderMode):
      - bootServer with SSR_RENDER_HOST=1 SSR_PUBLISH=1 via _harness.mjs
      - poll for ~15s for an ssr-stats heartbeat that includes renderMode
      - fetch /api/diag/ssr-eval-in-tab?expr=window.__ttBeamerEffectiveRenderMode%3F.()
      - WRITE the renderMode value to .planning/phases/phase-39/39-1-DIAG.md (append line "renderMode=<value> captured=<ISO timestamp>")
      - assert renderMode does NOT contain "2d" (this MAY fail today depending on operator hardware — if it fails, Plan 39-4 takes sub-path A; if it passes today, Plan 39-4 takes sub-path B but the test STILL is a regression rail)
      - test name: "D-03 SSR renderMode probe and record"

    Test 4 (test/connection-stability/phase-39-cold-boot.test.mjs — integration, MUST FAIL TODAY):
      - bootServer fresh (clean isolated config dir, no warm caches)
      - connectConsumer; capture every connectionState transition with timestamp
      - Wait 30000ms
      - Count distinct entries to ConnectionState === "RECONNECTING" (NOT the count of attempts within RECONNECTING)
      - ASSERT count < 2  (FAILS TODAY: research says 3-6 RECONNECTING events fire on cold boot)
      - teardown; emit a log line "[d-02-cold-boot] reconnectingEvents=<N>"

    Test 5 (test/live-e2e/test_phase39_d01_mp4_in_ssr.py — live, MUST FAIL TODAY):
      - Use running_server + ssr_ready fixtures
      - POST /api/live/command to load nemesis-lockdown-a.json (the outside is sandstorm.mp4)
      - Wait 3 seconds
      - GET /api/diag/ssr-eval-in-tab?expr=(()=>{const+v=document.querySelector('video');return+{readyState:v?.readyState,currentTime:v?.currentTime,error:v?.error?.code,videoWidth:v?.videoWidth};})()
      - assert value.readyState === 4
      - assert value.currentTime > 1.0
      - assert value.error is None
      - assert value.videoWidth === 1280
      - Capture two screenshots 1.5s apart via /api/diag/ssr-screenshot; assert pixel-byte-length differs (frame advanced)
      - PRE-FIX expected (per research): readyState=0, currentTime=0, error.code=4, videoWidth=0 → test FAILS today

    Test 6 (test/live-e2e/test_phase39_d03_no_seams.py — live, MUST FAIL TODAY):
      - Parametrized over grid_size in [3, 5, 9]
      - Set projection profile to NxN with non-identity warp via /api/live/command
      - Trigger solid-color animation ("#ff0000", alpha 0.6) via /api/live/command
      - Wait 500ms
      - GET /api/diag/ssr-screenshot, decode JPEG (Pillow)
      - For each interior boundary (vertical AND horizontal), sample a 10-px strip perpendicular to the boundary, compute max RGB delta within strip
      - assert max_delta < 4 (SEAM_THRESHOLD)
      - test FAILS today on at least grid_size=3 (operator-reported visible seams)
  </behavior>
  <action>
Write the 6 test files exactly as specified in <behavior>. Tests MUST be RED today — do NOT modify any production code to make them green; that is Wave 1's job.

Implementation notes:
1. For test 1 (MJS unit), if server.mjs doesn't export getMimeType, expose it by either (a) adding `export { getMimeType };` near server.mjs:1983 (this is a test-only export, fine), or (b) using a separate small unit-test that boots the server child-process and curl-probes the response Content-Type. Prefer option (a) — single-line addition.
2. For test 2 (state-machine unit), check if assertLegalTransition is exported from receiver-bootstrap.js. If not, add `export { assertLegalTransition };` (do NOT modify behavior — this is a test-only re-export). Verify by grep `export.*assertLegalTransition` in receiver-bootstrap.js after edit.
3. For test 3 (renderMode probe), the test MUST write its observed renderMode value to `.planning/phases/phase-39/39-1-DIAG.md` regardless of pass/fail — this is the BLOCKING diagnostic input for Plan 39-4. Use fs.appendFileSync from the test body in an `after` hook.
4. For test 4 (cold-boot reconnecting), use the existing `_harness.mjs` bootServer + connectConsumer helpers. Wrap onConnectionState callback to push ALL states (not just RECONNECTING) — then filter to count only NEW entries to RECONNECTING (not re-entries within a single attempt).
5. For test 5 (D-01 live), follow the pattern of test/live-e2e/test_phase38_ssr_grid_state_cdp.py for fixture setup. The /api/live/command body for profile-load should mirror what existing /live-e2e tests do; reuse helpers if available.
6. For test 6 (D-03 live), use Pillow's Image.open + numpy for max-pixel-delta. Threshold SEAM_THRESHOLD = 4 (i.e. RGB component max delta < 4 across the strip). If the screenshot endpoint returns base64 JPEG, decode via `base64.b64decode` + `Image.open(io.BytesIO(...))`.

DO NOT change server.mjs MIME table, handleStaticFile, receiver-bootstrap.js state enum, or any GL renderer code in this task. The only production-code edits permitted are test-only exports (item 1 + 2 above) of pre-existing internal symbols.

After writing all 6 tests, run them and verify they FAIL with the exact failure modes expected per <behavior>.
  </action>
  <verify>
    <automated>node --test test/phase-39-d01-mime-and-range.test.mjs test/phase-39-d02-state-machine.test.mjs 2>&1 | tee /tmp/p39-1-t2.out; grep -qE "video/mp4|application/octet-stream" /tmp/p39-1-t2.out && grep -q "INITIAL_CONNECT" /tmp/p39-1-t2.out && echo "OK: RED tests run, assertion subjects present" || echo "FAIL: assertion subjects missing — tests may have collection error"</automated>
  </verify>
  <acceptance_criteria>
    - Files exist: test/phase-39-d01-mime-and-range.test.mjs, test/phase-39-d02-state-machine.test.mjs, test/phase-39-d03-render-mode-probe.test.mjs, test/connection-stability/phase-39-cold-boot.test.mjs, test/live-e2e/test_phase39_d01_mp4_in_ssr.py, test/live-e2e/test_phase39_d03_no_seams.py
    - `node --test test/phase-39-d01-mime-and-range.test.mjs` exits NON-ZERO (RED today) AND its failure output contains "video/mp4" OR "application/octet-stream" (the assertion subject)
    - `node --test test/phase-39-d02-state-machine.test.mjs` exits NON-ZERO (RED today) AND output mentions "INITIAL_CONNECT"
    - `RUN_LIVE_TESTS=1 node --test test/connection-stability/phase-39-cold-boot.test.mjs` either fails OR logs a line matching `\[d-02-cold-boot\] reconnectingEvents=[0-9]+`
    - grep -n "INITIAL_CONNECT" test/phase-39-d02-state-machine.test.mjs returns ≥4 matches (each new transition test references it)
    - grep -n "readyState" test/live-e2e/test_phase39_d01_mp4_in_ssr.py returns ≥2 matches
    - grep -n "max_delta\|SEAM_THRESHOLD\|seam" test/live-e2e/test_phase39_d03_no_seams.py returns ≥3 matches
    - grep -n "renderMode" test/phase-39-d03-render-mode-probe.test.mjs returns ≥2 matches
    - server.mjs adds at most one new line `export { getMimeType };` (test-only export). `git diff server.mjs | grep -E "^[+-]" | grep -v "ssr-eval-in-tab\|export.*getMimeType"` returns 0 lines outside the Task 1 + this export
    - receiver-bootstrap.js gains at most one new line exporting assertLegalTransition (test-only). No state-enum changes.
  </acceptance_criteria>
  <done>All 6 RED tests exist on disk. The MJS unit tests demonstrably FAIL today with assertion failures pointing at the missing MIME entry and missing INITIAL_CONNECT state. The live-e2e tests are runnable (collect without errors) and FAIL their assertions. Only test-only exports of getMimeType + assertLegalTransition were added to production files; no behavioral changes.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Capture operator renderMode telemetry and write 39-1-DIAG.md</name>
  <read_first>
    - src/server/ssr-webrtc-signaling.mjs lines 480-495 — the [ssr-stats] renderMode log line format
    - .planning/phases/phase-39/39-RESEARCH.md §"D-03 Implementation Step 1 (mandatory)" — the diagnostic gate that blocks Plan 39-4
    - .planning/phases/phase-38/38-CLOSURE.md (already read in Task 0) — for the connection-stability harness usage precedent
  </read_first>
  <files>.planning/phases/phase-39/39-1-DIAG.md</files>
  <behavior>
    - The executor boots a fresh server with SSR_RENDER_HOST=1 SSR_PUBLISH=1 (use scripts/with_server.py or the _harness.mjs precedent)
    - Wait for the SSR tab to come up and at least one full [ssr-stats] heartbeat to log (logs every 10s per ssr-webrtc-signaling.mjs:485-491)
    - grep the server stdout for `[ssr-stats] renderMode=` and record the EXACT value(s)
    - ALSO query /api/diag/ssr-eval-in-tab?expr=window.__ttBeamerEffectiveRenderMode%3F.() and record the response value
    - Both values should match. If they differ, record both.
    - Write the values to 39-1-DIAG.md along with the recommendation (sub-path A or B) for Plan 39-4
  </behavior>
  <action>
1. Start the server with SSR enabled:
   ```bash
   cd /home/claw/tt-beamer
   SSR_RENDER_HOST=1 SSR_PUBLISH=1 SSR_DIAG_ENABLE=1 node server.mjs 2>&1 | tee /tmp/phase39-diag-stdout.log &
   SERVER_PID=$!
   ```
2. Wait 30 seconds for the SSR tab to fully boot and emit at least 2 ssr-stats heartbeats:
   ```bash
   sleep 30
   ```
3. Grep the log for the renderMode value:
   ```bash
   grep "\[ssr-stats\] renderMode=" /tmp/phase39-diag-stdout.log | tail -5
   ```
4. Probe the CDP endpoint for a live-fetched value:
   ```bash
   curl -s 'http://127.0.0.1:4173/api/diag/ssr-eval-in-tab?expr=window.__ttBeamerEffectiveRenderMode%3F.()%20%7C%7C%20%22unknown%22'
   ```
5. Kill the server:
   ```bash
   kill $SERVER_PID; wait $SERVER_PID 2>/dev/null
   ```
6. Write `.planning/phases/phase-39/39-1-DIAG.md` with this exact structure:

```markdown
# Phase 39 Plan 39-1 — D-03 renderMode Diagnostic

**Captured:** <ISO timestamp>
**Host:** <hostname uname -a output>
**Chromium binary:** <result of detectChromiumBinary — grep `chromiumBinary` in server stdout>

## Server log [ssr-stats] renderMode values (last 5)

\`\`\`
<paste last 5 grep lines from step 3>
\`\`\`

## Live CDP probe value

\`\`\`
<paste curl response from step 4>
\`\`\`

## Plan 39-4 sub-path decision

- If renderMode value contains "2d" or "swiftshader" or "gl->2d" → Plan 39-4 takes **sub-path A** (Chrome flag swap to `--use-angle=swiftshader`)
- If renderMode value is "webgl" or "webgl2" or "gl" → Plan 39-4 takes **sub-path B** (UV-inset epsilon in fragment shader at `src/app/runtime/viewport/runtime-projection-gl-renderer.js:264-275`)

**Observed value:** <exact string>
**Decision for Plan 39-4:** <"sub-path A" | "sub-path B">
**Rationale:** <one sentence>

## Notes

- This DIAG.md is the BLOCKING input for Plan 39-4 — that plan's first task reads this file before touching any GL code.
- If the operator's actual hardware reports a different value than this dev-box capture, the operator UAT in Plan 39-5 must re-capture renderMode and Plan 39-4 may need to be re-executed with the other sub-path.
```

7. If the server fails to boot (e.g. SSR_RENDER_HOST is unavailable in this environment), document the failure in 39-1-DIAG.md and record renderMode="UNKNOWN — DIAG capture failed: <reason>". Plan 39-4 will then have to attempt sub-path B (UV-inset) FIRST as the safer default and add the renderMode-based gate to its own first task.

DO NOT modify any production code in this task. DO NOT modify any test files.
  </action>
  <verify>
    <automated>test -f .planning/phases/phase-39/39-1-DIAG.md && grep -q "Plan 39-4 sub-path decision" .planning/phases/phase-39/39-1-DIAG.md && grep -q "Observed value:" .planning/phases/phase-39/39-1-DIAG.md && echo "ok"</automated>
  </verify>
  <acceptance_criteria>
    - File exists: .planning/phases/phase-39/39-1-DIAG.md
    - grep -q "Observed value:" 39-1-DIAG.md (the value is recorded; "UNKNOWN" is acceptable if SSR capture failed)
    - grep -q "Decision for Plan 39-4:" 39-1-DIAG.md (a sub-path is selected)
    - grep -qE "sub-path [AB]" 39-1-DIAG.md (decision is A or B)
    - File is NOT empty (wc -l > 15)
    - No production code (server.mjs, src/**, test/**) was modified in this task: `git diff --name-only HEAD | grep -vE "^\.planning/phases/phase-39/39-1-(DIAG|PLAN)\.md$"` returns empty
  </acceptance_criteria>
  <done>.planning/phases/phase-39/39-1-DIAG.md exists with the operator/dev-box renderMode value recorded and the Plan 39-4 sub-path decision (A or B) made. Plan 39-4 can now proceed deterministically. No production code or tests modified.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| HTTP client → /api/diag/ssr-eval-in-tab | Arbitrary string `expr` crosses into JS eval inside the SSR Chromium tab |
| Server process → SSR Chromium tab (via CDP) | Untrusted-shape `expr` becomes a string passed to Runtime.evaluate |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-39-1-01 | Tampering | /api/diag/ssr-eval-in-tab endpoint | mitigate | Localhost-only (req.socket.remoteAddress === "127.0.0.1" / "::1") OR explicit env flag SSR_DIAG_ENABLE=1 |
| T-39-1-02 | Elevation | /api/diag/ssr-eval-in-tab — JS execution context | mitigate | Reject expr with /eval\s*\(|Function\s*\(/ regex; cap length to 2048 chars; reject \n and \r to disallow multi-statement |
| T-39-1-03 | Information disclosure | /api/diag/ssr-eval-in-tab response | accept | Returns SSR-tab internal state to localhost-only callers; not a confidentiality boundary in a LAN-single-user product |
| T-39-1-04 | DoS | /api/diag/ssr-eval-in-tab — long-running expr | mitigate | host.evaluateInTab is called with timeoutMs: 3000 — CDP aborts and returns error after 3s |
| T-39-1-05 | Spoofing | Non-localhost client claiming localhost | accept | Server binds to all interfaces in production but req.socket.remoteAddress is a kernel-trusted value; cannot be spoofed across IP layer |
</threat_model>

<verification>
After all three tasks complete:

1. **Endpoint smoke test:**
   ```bash
   SSR_DIAG_ENABLE=1 node server.mjs &
   sleep 5
   # Localhost allowed:
   curl -s 'http://127.0.0.1:4173/api/diag/ssr-eval-in-tab?expr=1%2B1'
   # → {"ok":true,"value":2}  (when SSR host is up) OR {"ok":false,"error":"ssr_host_not_available"} (CI-only)
   # Bad expr rejected:
   curl -s 'http://127.0.0.1:4173/api/diag/ssr-eval-in-tab?expr=eval(%221%22)'
   # → {"ok":false,"error":"invalid_expr"}
   # Length cap:
   curl -s "http://127.0.0.1:4173/api/diag/ssr-eval-in-tab?expr=$(python3 -c 'print("x"*2049)')"
   # → {"ok":false,"error":"invalid_expr"}
   kill %1
   ```

2. **All 6 RED tests are demonstrably failing today** (this is the WHOLE POINT of Wave 0):
   ```bash
   node --test test/phase-39-d01-mime-and-range.test.mjs ; echo "exit=$?"  # exit≠0 expected
   node --test test/phase-39-d02-state-machine.test.mjs ; echo "exit=$?"  # exit≠0 expected
   RUN_LIVE_TESTS=1 node --test test/connection-stability/phase-39-cold-boot.test.mjs  # may take ~35s; logs reconnectingEvents count
   ```

3. **39-1-DIAG.md exists with a sub-path decision.**

4. **Phase 38 carry-forward regression rails still GREEN** (must not break):
   ```bash
   node --test test/phase-38-w10-ws-frame-fragmentation.test.mjs   # must PASS — L1 lock
   node --test test/static-resource-headers.test.mjs               # must PASS — Phase 31 h15
   RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs  # must show fail=0, producerReady=0, renderHostDown=0
   ```
</verification>

<success_criteria>
- New /api/diag/ssr-eval-in-tab endpoint exists, gated, and returns expected envelopes
- 6 RED tests written and demonstrably failing today (exit non-zero) with failure modes matching the research-predicted pre-fix state
- 39-1-DIAG.md captures operator/dev-box renderMode and selects sub-path A or B for Plan 39-4
- ALL Phase 38 carry-forward regression rails remain green (WS fragmentation, static-resource-headers, connection-stability smoke)
- No production code changes beyond the new endpoint + 2 test-only re-exports (getMimeType, assertLegalTransition)
</success_criteria>

<output>
After completion, create `.planning/phases/phase-39/39-1-SUMMARY.md` containing:
- Endpoint addition diff size (LOC)
- Test files created + line counts
- Each RED test's current failure mode (paste assertion message)
- 39-1-DIAG.md sub-path decision quoted
- Phase 38 carry-forward verification results
</output>
