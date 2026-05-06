---
phase: 32
plan: W0
type: execute
wave: 0
depends_on: []
files_modified:
  - test/phase-32-fps-baseline.test.mjs
  - test/phase-32-fps-presets.test.mjs
  - test/phase-32-server-rendering-config.test.mjs
  - test/phase-32-encoder-detect-vaapi.test.mjs
  - test/phase-32-xvfb-fakescreenfps.test.mjs
  - test/phase-32-producer-ready.test.mjs
  - test/phase-32-reconnect-backoff.test.mjs
  - test/phase-32-boot-cleanup.test.mjs
  - test/phase-32-status-overlay.test.mjs
  - test/phase-32-cold-boot-reconnect-repro.test.mjs
  - test/helpers/phase-32-ssr-test-harness.mjs
autonomous: true
requirements:
  - phase-32-block-A
  - phase-32-block-B
must_haves:
  truths:
    - "Test scaffolding exists for every Block A and Block B acceptance criterion"
    - "Wave 0 establishes a measurable baseline before any production code is patched"
    - "Phase 31 baseline (215 total / 211 pass / 4 skip / 0 fail) remains intact"
  artifacts:
    - path: "test/phase-32-fps-presets.test.mjs"
      provides: "Skip-gated assertions for streamFpsCap + alignModeBoost in QUALITY_PRESETS / resolveEncoderConfig / publisher script"
      contains: "phase-32-fps-presets"
    - path: "test/phase-32-server-rendering-config.test.mjs"
      provides: "Skip-gated assertions for STREAM_FPS_CAP_VALUES enum, streamFpsCap validator, alignModeBoost validator, defaults"
      contains: "phase-32-server-rendering-config"
    - path: "test/phase-32-encoder-detect-vaapi.test.mjs"
      provides: "Skip-gated assertion that detectAvailableEncoders returns 'vaapi' when libva + renderD128 present (independent of ffmpeg)"
      contains: "phase-32-encoder-detect-vaapi"
    - path: "test/phase-32-xvfb-fakescreenfps.test.mjs"
      provides: "Skip-gated assertion that spawnXvfb args include '-fakescreenfps'"
      contains: "phase-32-xvfb-fakescreenfps"
    - path: "test/phase-32-producer-ready.test.mjs"
      provides: "Skip-gated assertions for /api/ssr/ready endpoint + waitForProducer client helper"
      contains: "phase-32-producer-ready"
    - path: "test/phase-32-reconnect-backoff.test.mjs"
      provides: "Skip-gated assertions for getBackoffDelay schedule [1000,2000,5000,10000,30000], stable reset, sessionStorage round-trip, forever-retry"
      contains: "phase-32-reconnect-backoff"
    - path: "test/phase-32-boot-cleanup.test.mjs"
      provides: "Skip-gated assertions that server boot purges stale mediasoup-worker process before bootMediasoupRouter()"
      contains: "phase-32-boot-cleanup"
    - path: "test/phase-32-status-overlay.test.mjs"
      provides: "Skip-gated assertions for 'RECONNECTING — Xs (attempt N)' overlay + hide after >=5s stable"
      contains: "phase-32-status-overlay"
    - path: "test/phase-32-fps-baseline.test.mjs"
      provides: "Baseline measurement that records current FPS_VALUES, current MAX_RECONNECT_ATTEMPTS=10, current backoff cap=10000ms — used as RED proof before patches"
      contains: "phase-32-fps-baseline"
    - path: "test/phase-32-cold-boot-reconnect-repro.test.mjs"
      provides: "Skip-gated repro that simulates Pi consume() before producer-ready and asserts current code path exhausts MAX_RECONNECT_ATTEMPTS=10 — flips to GREEN after Wave 1"
      contains: "phase-32-cold-boot-reconnect-repro"
    - path: "test/helpers/phase-32-ssr-test-harness.mjs"
      provides: "Helper exports loadConfigModule, loadSignalingModule, loadReceiverBootstrap, loadEncoderDetect, loadRenderHost — dynamic ESM imports for unit tests"
      contains: "export"
  key_links:
    - from: "test/phase-32-*.test.mjs"
      to: "test/helpers/phase-32-ssr-test-harness.mjs"
      via: "import { ... } from './helpers/phase-32-ssr-test-harness.mjs'"
      pattern: "phase-32-ssr-test-harness"
    - from: "test/phase-32-fps-baseline.test.mjs"
      to: "src/server/ssr-server-rendering-config.mjs and src/app/runtime/output-receiver/receiver-status-ui.js"
      via: "imports + assertions on current pre-patch values"
      pattern: "FPS_VALUES.*MAX_RECONNECT_ATTEMPTS"
---

<objective>
Wave 0 — establish measurement infrastructure and test scaffolding BEFORE any production patches land. Each Wave 1 task will flip the relevant skip-gated test from RED/skip to GREEN as the patch goes in.

Purpose: Tests-first per phase orchestrator constraint. Capture quantitative baseline (current FPS_VALUES, MAX_RECONNECT_ATTEMPTS=10, backoff cap=10s, no streamFpsCap field, no /api/ssr/ready) so Wave 1 outcomes are provable. Phase 31 baseline (215/211/0/4) MUST stay green throughout.

Output: 10 new test files + 1 helper file. Skip-gated assertions for every Block A and Block B acceptance criterion. Baseline file capturing pre-patch values as RED proof.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/phase-32/32-CONTEXT.md
@.planning/phases/phase-32/32-RESEARCH.md
@.planning/phases/phase-32/32-VALIDATION.md
@.planning/phases/phase-31/31-SUMMARY.md
@test/ssr-server-rendering-config.test.mjs
@test/ssr-encoder-detect.test.mjs
@test/ssr-receiver-disconnect-detection.test.mjs

<interfaces>
<!-- Pre-patch state the tests will assert against (RED proof) -->

From src/server/ssr-server-rendering-config.mjs:
```javascript
export const ENCODER_VALUES = ["auto", "nvenc", "vaapi", "videotoolbox", "x264-software"];
export const QUALITY_PRESET_VALUES = ["low-latency", "balanced", "high-quality"];
export const RESOLUTION_VALUES = ["auto", "1080p", "720p"];
export const FPS_VALUES = [30, 24, 15];
export const AUDIO_ROUTE_VALUES = ["in-stream", "pi-local"];
export function SERVER_RENDERING_DEFAULTS({ available = [] } = {});
export function validateServerRenderingPatch(patch);
```

From src/app/runtime/output-receiver/receiver-status-ui.js:
```javascript
export const DISCONNECT_THRESHOLD_MS = 8000;
export const MAX_RECONNECT_ATTEMPTS = 10;  // ← Wave 1 will REMOVE this
export function createStatusUi({ ... });   // returns { showReconnect, hideReconnect, ... }
```

From src/app/runtime/output-receiver/receiver-bootstrap.js (line 194):
```javascript
const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);  // ← Wave 1 will REPLACE
```

From src/server/server-encoder-detect.mjs:
```javascript
export const ENCODER_PRIORITY = ["nvenc", "vaapi", "videotoolbox", "x264-software"];
export async function detectAvailableEncoders(opts = {});
```

Existing test pattern (from test/ssr-server-rendering-config.test.mjs):
```javascript
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { validateServerRenderingPatch } from "../src/server/ssr-server-rendering-config.mjs";

test("validateServerRenderingPatch accepts valid encoder", () => {
  const r = validateServerRenderingPatch({ encoder: "auto" });
  assert.equal(r.valid, true);
});
```

Skip pattern for Wave-0 future-feature gates:
```javascript
test("future Wave-1: streamFpsCap is in enum", { skip: "Wave 1 will add STREAM_FPS_CAP_VALUES" }, () => {
  // assertion body to flip ON in Wave 1
});
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create test harness helper + 4 Block-A test scaffolds (skip-gated future assertions)</name>
  <files>test/helpers/phase-32-ssr-test-harness.mjs, test/phase-32-fps-baseline.test.mjs, test/phase-32-fps-presets.test.mjs, test/phase-32-server-rendering-config.test.mjs, test/phase-32-encoder-detect-vaapi.test.mjs, test/phase-32-xvfb-fakescreenfps.test.mjs</files>
  <read_first>
    - test/ssr-server-rendering-config.test.mjs (existing pattern for config tests)
    - test/ssr-encoder-detect.test.mjs (existing pattern for encoder probes)
    - src/server/ssr-server-rendering-config.mjs (current ENCODER_VALUES, FPS_VALUES, validator)
    - src/server/ssr-render-host.mjs (current QUALITY_PRESETS lines 49-53, spawnXvfb line 252)
    - src/server/server-encoder-detect.mjs (current detectAvailableEncoders + probeVaapiDevice)
    - .planning/phases/phase-32/32-RESEARCH.md "Phase 32 Test Map" section (test IDs A1-A9)
  </read_first>
  <action>
Create test scaffolding for Block A. Use `node:test` framework, `import { test } from "node:test"` and `import { strict as assert } from "node:assert"`. Files to create:

1. **`test/helpers/phase-32-ssr-test-harness.mjs`** — helper exports for dynamic ESM imports + small mocks. Export:
   - `async function loadServerRenderingConfig()` — returns `await import("../../src/server/ssr-server-rendering-config.mjs")`
   - `async function loadEncoderDetect()` — returns `await import("../../src/server/server-encoder-detect.mjs")`
   - `async function loadRenderHost()` — returns `await import("../../src/server/ssr-render-host.mjs")`
   - `async function loadStatusUi()` — returns `await import("../../src/app/runtime/output-receiver/receiver-status-ui.js")`
   - `async function loadReceiverBootstrap()` — returns `await import("../../src/app/runtime/output-receiver/receiver-bootstrap.js")`
   - `function mockSessionStorage()` — returns `{ getItem, setItem, removeItem, clear }` backed by Map (for backoff state tests)
   - `function mockDocument()` — returns `{ getElementById }` backed by Map of stub elements (for status-overlay tests)
   - `function mockExistsSync(map)` — returns `(p) => map[p] === true` (for VAAPI probe tests)

2. **`test/phase-32-fps-baseline.test.mjs`** — record pre-patch values (RED proof). All tests pass NOW (no skip):
   - "BASELINE: FPS_VALUES is currently [30, 24, 15] — Wave 1 will extend to include 45, 60, 0"
   - "BASELINE: serverRendering schema lacks streamFpsCap field — Wave 1 will add"
   - "BASELINE: serverRendering schema lacks alignModeBoost field — Wave 1 will add"
   - "BASELINE: MAX_RECONNECT_ATTEMPTS exports value 10 — Wave 1 will remove the hard cap"
   - "BASELINE: receiver-bootstrap backoff formula caps at 10000ms — Wave 1 will replace with 30000ms schedule"
   Use exports from `loadServerRenderingConfig()` and `loadStatusUi()`. For the receiver-bootstrap formula, read the file source via `fs.readFileSync` and assert it CONTAINS the literal string `Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000)`. This baseline file MUST stay all-green at Wave-0 close and is REWRITTEN by Wave 1 tasks to flip to the new expected values.

3. **`test/phase-32-fps-presets.test.mjs`** — Block A tests A1-A3, all `skip: "Wave 1 will wire streamFpsCap"` initially:
   - A1: `QUALITY_PRESETS` exposes `streamFpsCap` per preset OR `resolveEncoderConfig` accepts `streamFpsCap` override
   - A2: `resolveEncoderConfig({ serverRendering: { streamFpsCap: 60 } })` returns `{ streamFpsCap: 60 }` in result
   - A3: `buildInPagePublisherScript()` output (string) contains `frameRate: { ideal: 60, max: 60 }` when streamFpsCap=60 and contains `frameRate: { ideal: 30, max: 30 }` when streamFpsCap=30 (assert via substring match on the generated script source)

4. **`test/phase-32-server-rendering-config.test.mjs`** — Block A tests A4-A7, all skip-gated:
   - A4a: `STREAM_FPS_CAP_VALUES` export exists and equals `[30, 45, 60, 0]`
   - A4b: `validateServerRenderingPatch({ streamFpsCap: 30 })` valid
   - A4c: `validateServerRenderingPatch({ streamFpsCap: 45 })` valid
   - A4d: `validateServerRenderingPatch({ streamFpsCap: 60 })` valid
   - A4e: `validateServerRenderingPatch({ streamFpsCap: 0 })` valid
   - A4f: `validateServerRenderingPatch({ streamFpsCap: 99 })` invalid with reason `streamFpsCap-not-in-enum`
   - A4g: `validateServerRenderingPatch({ streamFpsCap: "60" })` invalid with reason `streamFpsCap-wrong-type`
   - A5a: `validateServerRenderingPatch({ alignModeBoost: true })` valid
   - A5b: `validateServerRenderingPatch({ alignModeBoost: false })` valid
   - A5c: `validateServerRenderingPatch({ alignModeBoost: "yes" })` invalid with reason `alignModeBoost-wrong-type`
   - A6: `SERVER_RENDERING_DEFAULTS({ available: ["x264-software"] })` returns object with `streamFpsCap: 60` and `alignModeBoost: true`
   - A7: `applyServerRenderingPatch` (or equivalent merge function) preserves new fields when other fields change

5. **`test/phase-32-encoder-detect-vaapi.test.mjs`** — Block A test A8, skip-gated:
   - A8a: `detectAvailableEncoders({ probe: { hasVaapiDevice: true, hasLibva: true, ffmpegEncoders: [] } })` returns array containing `"vaapi"` (decoupled from ffmpeg presence)
   - A8b: `detectAvailableEncoders({ probe: { hasVaapiDevice: true, hasLibva: false, ffmpegEncoders: [] } })` does NOT contain `"vaapi"`
   - A8c: `detectAvailableEncoders({ probe: { hasVaapiDevice: false, hasLibva: true, ffmpegEncoders: [] } })` does NOT contain `"vaapi"`
   - A8d: `probeLibvaRuntime()` is exported as a function

6. **`test/phase-32-xvfb-fakescreenfps.test.mjs`** — Block A test A9, skip-gated:
   - A9a: import `getXvfbArgs` (or read `spawnXvfb` source via fs.readFileSync) and assert args include the literal string `"-fakescreenfps"`
   - A9b: assert the value passed is one of `"60"`, `"120"`, `"240"` (ie a number string)

For every skip-gated test use the `node:test` skip option:
```javascript
test("A1: ...", { skip: "Wave 1 task will implement" }, () => { ... });
```

Run `node --test test/phase-32-*.test.mjs` after creation. Expected: baseline tests pass (all green); skip-gated tests show as skipped. Total new tests created: ≥20.
  </action>
  <verify>
    <automated>node --test "test/phase-32-fps-baseline.test.mjs" "test/phase-32-fps-presets.test.mjs" "test/phase-32-server-rendering-config.test.mjs" "test/phase-32-encoder-detect-vaapi.test.mjs" "test/phase-32-xvfb-fakescreenfps.test.mjs" 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - File `test/helpers/phase-32-ssr-test-harness.mjs` exists, grep returns: `grep -c "export" test/helpers/phase-32-ssr-test-harness.mjs` ≥ 8
    - File `test/phase-32-fps-baseline.test.mjs` exists with ≥5 baseline tests, ALL PASS (no skip on baseline tests)
    - File `test/phase-32-fps-presets.test.mjs` exists with ≥3 skip-gated tests
    - File `test/phase-32-server-rendering-config.test.mjs` exists with ≥10 skip-gated tests covering streamFpsCap+alignModeBoost validators+defaults
    - File `test/phase-32-encoder-detect-vaapi.test.mjs` exists with ≥4 skip-gated tests
    - File `test/phase-32-xvfb-fakescreenfps.test.mjs` exists with ≥2 skip-gated tests
    - Run `node --test test/phase-32-*.test.mjs` exits 0
    - Phase 31 baseline preserved: `node --test "test/**/*.test.mjs" 2>&1 | tail -5` shows `pass: 211+` (was 211, may increase) and `fail: 0`
  </acceptance_criteria>
  <done>5 Block-A test files + 1 helper exist; baseline tests pass; skip-gated tests are recognized as skipped; phase-31 baseline (211 pass / 0 fail) preserved.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create 4 Block-B test scaffolds + cold-boot reconnect repro (skip-gated)</name>
  <files>test/phase-32-producer-ready.test.mjs, test/phase-32-reconnect-backoff.test.mjs, test/phase-32-boot-cleanup.test.mjs, test/phase-32-status-overlay.test.mjs, test/phase-32-cold-boot-reconnect-repro.test.mjs</files>
  <read_first>
    - test/ssr-receiver-disconnect-detection.test.mjs (existing pattern for receiver tests)
    - src/app/runtime/output-receiver/receiver-bootstrap.js (current backoff formula at line 194, MAX_RECONNECT_ATTEMPTS use at lines 178+196)
    - src/app/runtime/output-receiver/receiver-status-ui.js (current showReconnect at line 95, exports at line 22-23)
    - src/server/ssr-webrtc-signaling.mjs (consume hold at lines 479-494, state.videoProducer)
    - server.mjs (boot sequence at lines 13-15 + bootSsrRenderHost line 1300)
    - test/helpers/phase-32-ssr-test-harness.mjs (created in Task 1)
    - .planning/phases/phase-32/32-RESEARCH.md "Phase 32 Test Map" section (test IDs B1-B13)
  </read_first>
  <action>
Create test scaffolding for Block B. Use the helper from Task 1.

1. **`test/phase-32-producer-ready.test.mjs`** — Block B tests B1-B2, B12-B13, skip-gated:
   - B1: `GET /api/ssr/ready` returns 503 with body `{ ready: false, reason: "producer-starting" }` when `state.videoProducer` is null
   - B2: `GET /api/ssr/ready` returns 200 with body `{ ready: true, reason: "producer-up" }` when `state.videoProducer` is non-null
   - B12: `waitForProducer({ fetch: mockFetch, maxWaitMs: 5000, pollIntervalMs: 100 })` resolves to `true` when mockFetch returns 200
   - B13: `waitForProducer({ fetch: mockFetch, maxWaitMs: 200, pollIntervalMs: 50 })` resolves to `false` when mockFetch returns 503 throughout
   - Where `waitForProducer` is to be exported from `receiver-bootstrap.js` in Wave 1

2. **`test/phase-32-reconnect-backoff.test.mjs`** — Block B tests B3-B7, skip-gated:
   - B3: `getBackoffDelay(0)` === 1000, `getBackoffDelay(1)` === 2000, `getBackoffDelay(2)` === 5000, `getBackoffDelay(3)` === 10000, `getBackoffDelay(4)` === 30000
   - B4: `getBackoffDelay(5)` === 30000, `getBackoffDelay(99)` === 30000 (cap at 30s)
   - B5: `loadBackoffState()` reads from sessionStorage; `saveBackoffState({ attempts: 3 })` writes JSON `{"attempts":3}` to key `"ssr-reconnect-state"`. Use `mockSessionStorage()` from helper.
   - B5b: `loadBackoffState()` returns `{ attempts: 0 }` when sessionStorage is empty or contains invalid JSON
   - B6: forever-retry — `MAX_RECONNECT_ATTEMPTS` export does NOT exist OR equals `Infinity` (assert via `typeof` check + `=== Infinity` OR `=== undefined`)
   - B6b: `receiver-bootstrap.js` source file does NOT contain literal `MAX_RECONNECT_ATTEMPTS = 10` (read source via fs.readFileSync, grep)
   - B7: `getBackoffDelay` invoked with `attempts: 0` after a `markStable()` call returns 1000 (simulate a stable connection then a disconnect: backoff resets to first-step)

3. **`test/phase-32-boot-cleanup.test.mjs`** — Block B test B9, skip-gated:
   - B9a: `purgeStaleMediasoupWorker({ exec: mockExec })` is exported from a new helper module (or from `ssr-mediasoup-router.mjs`); when called, `mockExec` receives `pkill -f mediasoup-worker` as the command argument
   - B9b: `purgeStaleMediasoupWorker` resolves even when `mockExec` throws (no stale worker == OK case)
   - B9c: server.mjs source file CONTAINS the call `purgeStaleMediasoupWorker(` and CONTAINS `await bootMediasoupRouter(` AFTER the purge call (assert via fs.readFileSync + grep + line ordering)

4. **`test/phase-32-status-overlay.test.mjs`** — Block B tests B10-B11, skip-gated:
   - B10a: `showCountdownReconnect({ doc: mockDoc, delayMs: 5000, attemptN: 3 })` sets `#ssr-reconnect-banner` text matching regex `^RECONNECTING — \d+s \(attempt 3\)$`
   - B10b: After 1100ms (use timer mock or `setTimeout` real), the text decrements (asserts the second-to-last value is "RECONNECTING — 4s (attempt 3)")
   - B11a: `markConnectionStable({ now: 1000 })` followed by `evaluateOverlayHide({ now: 6500 })` returns `{ shouldHide: true }` (5500ms ≥ 5000ms threshold)
   - B11b: `markConnectionStable({ now: 1000 })` followed by `evaluateOverlayHide({ now: 5500 })` returns `{ shouldHide: false }` (4500ms < 5000ms)
   - Where `showCountdownReconnect`, `markConnectionStable`, `evaluateOverlayHide` are to be exported from `receiver-status-ui.js` in Wave 1

5. **`test/phase-32-cold-boot-reconnect-repro.test.mjs`** — deterministic repro of cold-boot storm. Two-phase:
   - **RED (Wave 0, must fail-by-design or assert current behavior):** A test that reads `receiver-bootstrap.js` source and asserts that line containing `if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS)` EXISTS. This test passes NOW (RED proof of bug); Wave 1 will replace this assertion with: source must NOT contain the line.
   - **GREEN (skip-gated for Wave 1):** Simulate consume() before producer-ready scenario:
     ```javascript
     test("GREEN: Pi recovers within 10s when producer comes up after 8s", { skip: "Wave 1 will add producer-readiness gate" }, async () => {
       // Mock: server with producer null for 8s, then non-null
       // Pi calls waitForProducer() — should NOT call consume() until ready
       // After producer up, Pi connects within 1s
       // assert: waitForProducer resolved true; mock consume was called exactly 1x; never with retries
     });
     ```

Run `node --test test/phase-32-*.test.mjs` after creation.
  </action>
  <verify>
    <automated>node --test "test/phase-32-producer-ready.test.mjs" "test/phase-32-reconnect-backoff.test.mjs" "test/phase-32-boot-cleanup.test.mjs" "test/phase-32-status-overlay.test.mjs" "test/phase-32-cold-boot-reconnect-repro.test.mjs" 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - File `test/phase-32-producer-ready.test.mjs` exists with ≥4 skip-gated tests
    - File `test/phase-32-reconnect-backoff.test.mjs` exists with ≥7 skip-gated tests
    - File `test/phase-32-boot-cleanup.test.mjs` exists with ≥3 skip-gated tests
    - File `test/phase-32-status-overlay.test.mjs` exists with ≥4 skip-gated tests
    - File `test/phase-32-cold-boot-reconnect-repro.test.mjs` exists with ≥1 RED-baseline test (passes now) AND ≥1 skip-gated GREEN test (Wave 1)
    - Run `node --test test/phase-32-producer-ready.test.mjs test/phase-32-reconnect-backoff.test.mjs test/phase-32-boot-cleanup.test.mjs test/phase-32-status-overlay.test.mjs test/phase-32-cold-boot-reconnect-repro.test.mjs` exits 0
    - Phase 31 baseline preserved: `node --test "test/**/*.test.mjs" 2>&1 | tail -5` shows `fail: 0`
  </acceptance_criteria>
  <done>5 Block-B test files exist; RED baseline passes; skip-gated tests recognized as skipped; full suite still 0 fail.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Run full suite + commit Wave 0 baseline</name>
  <files>(no source changes — verification + commit only)</files>
  <read_first>
    - .planning/phases/phase-32/32-VALIDATION.md (sampling rate + baseline contract)
    - All test/phase-32-*.test.mjs files created in Tasks 1-2
  </read_first>
  <action>
Run full test suite via `node --test "test/**/*.test.mjs"` and capture summary line. Expected: total ≥ 235 (was 215 + ≥20 new), pass ≥ 215 (was 211 + ≥4 baseline tests now passing), fail = 0, skip ≥ 24 (was 4 + ≥20 skip-gated). Record numbers in commit message.

If any unexpected failure appears, STOP and fix the broken test before committing — Wave 0 must leave a perfectly green baseline.

Commit with message:
```
test(32-W0-T3): wave-0 baseline + skip-gated scaffolds for Phase 32

- 10 new test files (5 Block A + 5 Block B) + 1 helper
- ≥20 skip-gated assertions for Wave-1 acceptance criteria
- baseline file records pre-patch values (FPS_VALUES=[30,24,15], MAX_RECONNECT_ATTEMPTS=10, backoff cap=10000ms)
- cold-boot reconnect-repro: RED proof passes, GREEN skip-gated for Wave 1
- Phase 31 baseline preserved (211 pass + N skip / 0 fail)
- Total: <new-total> tests / <pass> pass / 0 fail / <skip> skip
```

Use `node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "test(32-W0-T3): ..." --files test/phase-32-*.test.mjs test/helpers/phase-32-ssr-test-harness.mjs` if available, else `git add` + `git commit`.
  </action>
  <verify>
    <automated>node --test "test/**/*.test.mjs" 2>&1 | tail -10 | grep -E "^# (tests|pass|fail|skipped|cancelled)"</automated>
  </verify>
  <acceptance_criteria>
    - Full suite exit code 0: `node --test "test/**/*.test.mjs" 2>&1 > /tmp/p32w0.log; echo $?` outputs `0`
    - Pass count ≥ 215: `grep "^# pass" /tmp/p32w0.log | grep -oE "[0-9]+" | awk '{print ($1>=215)?"OK":"FAIL"}'` prints `OK`
    - Fail count == 0: `grep "^# fail" /tmp/p32w0.log | grep -oE "[0-9]+"` outputs `0`
    - Skip count ≥ 24: `grep "^# skipped" /tmp/p32w0.log | grep -oE "[0-9]+" | awk '{print ($1>=24)?"OK":"FAIL"}'` prints `OK`
    - Git commit created: `git log -1 --pretty=%s | grep -q "32-W0"` exits 0
  </acceptance_criteria>
  <done>Full suite green; Wave 0 baseline committed; Wave 1 plans can begin flipping skip-gated tests to GREEN.</done>
</task>

</tasks>

<verification>
- All 10 new test files + 1 helper exist with executable test bodies (no `throw new Error("not implemented")` placeholders).
- Baseline file (`phase-32-fps-baseline.test.mjs`) all-pass — RED proof of pre-patch state.
- All other Phase-32 tests skip-gated (will flip to GREEN in Wave 1).
- Phase 31 baseline (211 pass / 0 fail) preserved.
- Atomic commit created with hotfix-style commit message.
</verification>

<success_criteria>
- `node --test test/phase-32-*.test.mjs` exits 0 with ≥20 tests reported (mix of pass + skip).
- `node --test "test/**/*.test.mjs"` exits 0 with `# fail 0` line.
- `git log -1 --name-only` lists all 11 new files under `test/`.
</success_criteria>

<output>
After completion, create `.planning/phases/phase-32/32-W0-SUMMARY.md` recording:
- Total new tests added (target ≥20)
- Pass / fail / skip counts pre-patch
- Skip-gated test IDs that Wave 1 must flip
- Commit SHA
</output>
