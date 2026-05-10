---
phase: 35
plan: B
type: execute
wave: 1
depends_on:
  - 35-W0-PLAN
files_modified:
  - src/app/runtime/output-receiver/output-live-sync.js
  - src/app/runtime/output-receiver/output-audio-binder.js
  - src/app/runtime/output-receiver/receiver-bootstrap.js
  - output.html
autonomous: true
requirements:
  - D-02
  - D-06
must_haves:
  truths:
    - "src/app/runtime/output-receiver/output-live-sync.js exists, exports bootOutputLiveSync, with the EXACT 13-method subscription shape from RESEARCH §B.2"
    - "test/phase-35-output-live-sync.test.mjs goes from RED to GREEN — node --test exits 0"
    - "output-audio-binder.js refactored to consume bootOutputLiveSync (drops its own WS reconnect code, subscribes to onAnimationStart/onAnimationStop/onClearAll)"
    - "receiver-bootstrap.js refactored: lines 968-987 inline 1Hz /api/live/snapshot poll REMOVED; isAlignModeActive + getCurrentProfileId now delegate to liveSync.getAlignMode() + liveSync.getActiveProjectionProfileId()"
    - "output.html loads bootOutputLiveSync as a module before bootOutputAudioBinder + bootReceiver"
    - "Audio still plays when start-animation arrives via WS (no regression in /output/ audio path)"
    - "test/connection-stability/** stays 72/0/13 (D-06 hard gate; receiver-bootstrap.js IS in the 5-critical-files list)"
  artifacts:
    - path: "src/app/runtime/output-receiver/output-live-sync.js"
      provides: "NEW thin live-sync subscriber. ~186 LOC. Exports bootOutputLiveSync({logger, role, url}) → 13-method subscription object."
      min_lines: 130
      contains: "bootOutputLiveSync"
    - path: "src/app/runtime/output-receiver/output-audio-binder.js"
      provides: "Refactored to import bootOutputLiveSync; subscribes to onAnimationStart/onAnimationStop/onClearAll; drops its own WS reconnect implementation."
      min_lines: 50
    - path: "src/app/runtime/output-receiver/receiver-bootstrap.js"
      provides: "Inline 1Hz /api/live/snapshot poll loop REMOVED (was lines 968-987); replaced with `liveSync.getAlignMode()` + `liveSync.getActiveProjectionProfileId()` getter calls in the input-forwarder closures."
    - path: "output.html"
      provides: "New <script type='module'> tag importing bootOutputLiveSync, calling it, and exposing the result so audio-binder + receiver-bootstrap can consume it."
  key_links:
    - from: "src/app/runtime/output-receiver/output-live-sync.js"
      to: "/api/live/ws?role=final-output"
      via: "new WebSocket(wsUrl)"
      pattern: "/api/live/ws\\?role=final-output|new WebSocket"
    - from: "src/app/runtime/output-receiver/output-audio-binder.js"
      to: "src/app/runtime/output-receiver/output-live-sync.js"
      via: "import { bootOutputLiveSync } from './output-live-sync.js'"
      pattern: "from\\s+[\"'].*output-live-sync"
    - from: "src/app/runtime/output-receiver/receiver-bootstrap.js"
      to: "live-sync subscription getters"
      via: "liveSync.getAlignMode() + liveSync.getActiveProjectionProfileId() in attachInputForwarder closures"
      pattern: "liveSync\\.getAlignMode|liveSync\\.getActiveProjectionProfileId"
    - from: "output.html"
      to: "src/app/runtime/output-receiver/output-live-sync.js"
      via: "<script type='module'> import + bootOutputLiveSync()"
      pattern: "bootOutputLiveSync"
---

<objective>
Track B per D-02 (LOCKED): build a thin live-sync subscriber that opens its own WS to `/api/live/ws?role=final-output`, parses live-mutation envelopes, and emits 7 named callbacks + 3 getters + stop. ~186 LOC target.

This is the SHARED subscription primitive that:
- `output-audio-binder.js` (existing, refactored) consumes for animation start/stop/clear-all events
- `bootAlignMode()` from Track A consumes for alignMode + projection-profile state changes
- `receiver-bootstrap.js` (existing, refactored) consumes via getter calls instead of its own /api/live/snapshot poll loop

Per RESEARCH §B.1: do NOT extract from runtime-live-sync-core.js (entangled with ~30 dashboard ctx callbacks). BUILD A NEW THIN MODULE modeled on output-audio-binder.js's WS reconnect pattern.

Track B lands BEFORE Track A because Track A consumes B's API.

Purpose: Phase 35 D-02 LOCKED — minimal live-sync subscription extraction.

Output: 1 new module (~186 LOC) + refactored audio-binder + refactored receiver-bootstrap + output.html script-tag added. test/phase-35-output-live-sync.test.mjs RED→GREEN.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-35/35-CONTEXT.md
@.planning/phases/phase-35/35-RESEARCH.md
@.planning/phases/phase-35/35-VALIDATION.md
@.planning/phases/phase-35/35-W0-SUMMARY.md

# Pattern source — output-audio-binder is the proven thin subscriber pattern
@src/app/runtime/output-receiver/output-audio-binder.js

# Files being modified
@src/app/runtime/output-receiver/receiver-bootstrap.js
@output.html

# Reference for envelope structure (do NOT modify; only read for envelope shape)
@src/app/runtime/live-sync/runtime-live-sync-core.js

# RED test that must transition to GREEN
@test/phase-35-output-live-sync.test.mjs

# D-06 hard gate
@test/connection-stability/
</context>

<interfaces>
<!-- Full bootOutputLiveSync skeleton — paste verbatim from RESEARCH §"Track B: bootOutputLiveSync skeleton" -->

```javascript
// New: src/app/runtime/output-receiver/output-live-sync.js
const RECONNECT_BACKOFF_MS = [500, 1000, 2000, 5000, 10000, 30000];

export function bootOutputLiveSync({ logger = console, role = "final-output", url } = {}) {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const wsUrl = url ?? `${proto}//${host}/api/live/ws?role=${role}`;

  const handlers = {
    animationStart: new Set(), animationStop: new Set(), clearAll: new Set(),
    alignModeChange: new Set(), projectionProfileChange: new Set(),
    connect: new Set(), disconnect: new Set(),
  };
  let alignMode = false;
  let profileId = null;
  let clientId = null;
  let ws = null, stopped = false, attempt = 0, reconnectTimer = null, pollTimer = null;

  function emit(event, ...args) { for (const h of handlers[event]) try { h(...args); } catch (e) { logger.warn?.(`[output-live-sync] ${event} handler:`, e); } }
  function on(event) { return (handler) => { handlers[event].add(handler); return () => handlers[event].delete(handler); }; }

  function dispatch(envelope) {
    if (envelope?.type === "live-hello") {
      clientId = envelope.clientId ?? null;
      const snap = envelope?.session?.snapshot;
      if (snap) {
        if (typeof snap.alignMode === "boolean" && snap.alignMode !== alignMode) {
          alignMode = snap.alignMode; emit("alignModeChange", alignMode);
        }
        const pid = snap?.runtime?.activeProjectionProfileId ?? null;
        if (pid !== profileId) { profileId = pid; emit("projectionProfileChange", profileId); }
      }
      emit("connect");
      return;
    }
    if (envelope?.type !== "live-session-update") return;
    const mt = envelope.mutationType;
    const mutation = envelope.mutation ?? {};
    if (mt === "context-update") {
      const snap = envelope?.session?.snapshot;
      if (snap && typeof snap.alignMode === "boolean" && snap.alignMode !== alignMode) {
        alignMode = snap.alignMode; emit("alignModeChange", alignMode);
      }
      const pid = snap?.runtime?.activeProjectionProfileId ?? profileId;
      if (pid !== profileId) { profileId = pid; emit("projectionProfileChange", profileId); }
    } else if (mt === "start-animation") {
      emit("animationStart", mutation.animation);
    } else if (mt === "stop-animation") {
      emit("animationStop", mutation.animationId ?? mutation.animation?.id);
    } else if (mt === "clear-all") {
      emit("clearAll");
    }
  }

  function delayMs() { return RECONNECT_BACKOFF_MS[Math.min(attempt, RECONNECT_BACKOFF_MS.length - 1)]; }
  function scheduleReconnect() {
    if (stopped) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, delayMs());
  }
  function connect() {
    if (stopped) return;
    try { ws = new WebSocket(wsUrl); }
    catch (e) { logger.warn?.(`[output-live-sync] WS construct: ${e?.message}`); scheduleReconnect(); return; }
    ws.addEventListener("open", () => { attempt = 0; });
    ws.addEventListener("message", (event) => {
      try { dispatch(JSON.parse(event.data)); } catch (e) { /* malformed — skip */ }
    });
    ws.addEventListener("close", () => { attempt += 1; emit("disconnect"); scheduleReconnect(); });
    ws.addEventListener("error", () => { /* close handler owns reconnect */ });
  }

  async function pollOnce() {
    if (stopped) return;
    try {
      const r = await fetch("/api/live/snapshot");
      if (r.ok) {
        const j = await r.json();
        const snap = j?.snapshot ?? j?.session?.snapshot ?? {};
        if (typeof snap.alignMode === "boolean" && snap.alignMode !== alignMode) {
          alignMode = snap.alignMode; emit("alignModeChange", alignMode);
        }
        const pid = snap?.runtime?.activeProjectionProfileId
          ?? snap?.selectedBoard?.lastUsedProfileName ?? null;
        if (pid !== profileId) { profileId = pid; emit("projectionProfileChange", profileId); }
      }
    } catch { /* ignore */ }
  }
  pollTimer = setInterval(pollOnce, 1000);
  pollOnce();
  connect();

  return {
    onAnimationStart: on("animationStart"),
    onAnimationStop: on("animationStop"),
    onClearAll: on("clearAll"),
    onAlignModeChange: on("alignModeChange"),
    onProjectionProfileChange: on("projectionProfileChange"),
    onConnect: on("connect"),
    onDisconnect: on("disconnect"),
    getAlignMode: () => alignMode,
    getActiveProjectionProfileId: () => profileId,
    getCurrentClientId: () => clientId,
    stop() { stopped = true; if (reconnectTimer) clearTimeout(reconnectTimer); if (pollTimer) clearInterval(pollTimer); try { ws?.close(); } catch {} },
  };
}
```

The 13-method subscription shape contract (executor MUST match exactly):
- 7 callback registrars: `onAnimationStart`, `onAnimationStop`, `onClearAll`, `onAlignModeChange`, `onProjectionProfileChange`, `onConnect`, `onDisconnect` — each takes a handler, returns an unsubscribe function
- 3 getters: `getAlignMode()`, `getActiveProjectionProfileId()`, `getCurrentClientId()`
- 1 teardown: `stop()`

receiver-bootstrap.js current poll loop (to be REMOVED — lines 968-987):
```javascript
let alignMode = false;
let currentProfileId = null;
function pollSnapshot() {
  fetch("/api/live/snapshot")
    .then(r => r.json())
    .then(snap => {
      alignMode = Boolean(snap?.alignMode);
      currentProfileId = snap?.runtime?.activeProjectionProfileId ?? null;
      overlayEl.style.pointerEvents = alignMode ? "auto" : "none";
    })
    .catch(() => {});
}
setInterval(pollSnapshot, 1000);
pollSnapshot();
```

After refactor, `bootReceiver()` must accept a `liveSync` arg OR `attachInputForwarder` reads from a passed-in liveSync. Output.html is responsible for boot ordering: bootOutputLiveSync FIRST, then pass result to bootReceiver and bootOutputAudioBinder.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Create src/app/runtime/output-receiver/output-live-sync.js — turn RED test GREEN</name>
  <read_first>
    - .planning/phases/phase-35/35-RESEARCH.md §"Track B: bootOutputLiveSync skeleton" (paste-ready code)
    - .planning/phases/phase-35/35-RESEARCH.md §B.2 (full API surface contract)
    - test/phase-35-output-live-sync.test.mjs (the contract — 13 methods, callback registrars return unsubscribe functions)
    - src/app/runtime/output-receiver/output-audio-binder.js (RECONNECT_BACKOFF_MS verbatim copy)
    - src/app/runtime/live-sync/runtime-live-sync-core.js (envelope shape reference — read live-hello and live-session-update parsing for context-update / start-animation / stop-animation / clear-all mutationTypes)
  </read_first>
  <files>src/app/runtime/output-receiver/output-live-sync.js</files>
  <action>
Create `src/app/runtime/output-receiver/output-live-sync.js` per D-02. Paste the FULL skeleton from RESEARCH §"Track B: bootOutputLiveSync skeleton" verbatim — that code is the spec.

Key requirements:
1. Use the EXACT `RECONNECT_BACKOFF_MS = [500, 1000, 2000, 5000, 10000, 30000]` array (copy from output-audio-binder.js).
2. Return object with EXACTLY these 11 named methods (matching the contract in test/phase-35-output-live-sync.test.mjs):
   - 7 callback registrars: onAnimationStart, onAnimationStop, onClearAll, onAlignModeChange, onProjectionProfileChange, onConnect, onDisconnect
   - 3 getters: getAlignMode, getActiveProjectionProfileId, getCurrentClientId
   - 1 teardown: stop
3. Each callback registrar returns an unsubscribe function (per the JSDoc in RESEARCH §B.2).
4. Dispatch logic handles both `live-hello` (initial state) and `live-session-update` (mutations: context-update, start-animation, stop-animation, clear-all).
5. HTTP 1Hz fallback poll (`fetch("/api/live/snapshot")`) for cold-start before WS arrives.
6. Per Pitfall 7 quantization not needed here — that's for Track C dither cache. This module just polls 1Hz like receiver-bootstrap did.
7. JSDoc per RESEARCH §B.2 — full @typedef LiveSyncSubscription block.
8. Add module-level comment explaining why this is a parallel module to runtime-live-sync-core.js (NOT an extraction — see RESEARCH §B.1 rationale).

Total target: ~186 LOC (per RESEARCH §B.4 estimate). Hard ceiling: 220 LOC. If approaching ceiling, audit for inline-able helpers.

After creating, run `node --test test/phase-35-output-live-sync.test.mjs` — must transition RED → GREEN.
  </action>
  <verify>
    <automated>node --test test/phase-35-output-live-sync.test.mjs</automated>
  </verify>
  <acceptance_criteria>
    - File exists at src/app/runtime/output-receiver/output-live-sync.js
    - File contains `export function bootOutputLiveSync` (grep)
    - File contains all 11 method names: onAnimationStart, onAnimationStop, onClearAll, onAlignModeChange, onProjectionProfileChange, onConnect, onDisconnect, getAlignMode, getActiveProjectionProfileId, getCurrentClientId, stop (grep all 11)
    - File contains `RECONNECT_BACKOFF_MS = [500, 1000, 2000, 5000, 10000, 30000]` (grep verbatim)
    - File contains `/api/live/ws?role=` and `/api/live/snapshot` URL patterns (grep both)
    - File handles all 4 mutationTypes: context-update, start-animation, stop-animation, clear-all (grep each)
    - File total length: 130 < LOC < 220 (`wc -l < target.js`)
    - `node --test test/phase-35-output-live-sync.test.mjs` exits 0 (RED → GREEN)
  </acceptance_criteria>
  <done>output-live-sync.js shipped; D-02-B1 unit test GREEN; module ready for consumption by audio-binder + receiver-bootstrap.</done>
</task>

<task type="auto">
  <name>Task 2: Refactor output-audio-binder.js to consume bootOutputLiveSync</name>
  <read_first>
    - src/app/runtime/output-receiver/output-audio-binder.js (current ~120 LOC; identify the WS reconnect block to remove)
    - src/app/runtime/output-receiver/output-live-sync.js (just created — exports + return shape)
    - .planning/phases/phase-35/35-RESEARCH.md §B.3 (Migration plan: audio-binder drops ~70 LOC of WS code)
    - test/phase-35-output-live-sync.test.mjs (D-02-B2 test asserts audio-binder imports from output-live-sync)
  </read_first>
  <files>src/app/runtime/output-receiver/output-audio-binder.js</files>
  <action>
Refactor `output-audio-binder.js`:

1. **Remove its own WS implementation** (the ~70 LOC block per RESEARCH §B.3): delete the `new WebSocket(...)`, reconnect-backoff array (if present), envelope-parsing, and lifecycle code that's now duplicated by output-live-sync.

2. **Import bootOutputLiveSync**:
```javascript
import { bootOutputLiveSync } from "./output-live-sync.js";
```

3. **Refactor `bootOutputAudioBinder()`** to ACCEPT a `liveSync` argument (subscription object). If not passed, fall back to creating its own (transitional, but warn in logger):
```javascript
export function bootOutputAudioBinder({ logger = console, liveSync = null, ... } = {}) {
  const sub = liveSync ?? bootOutputLiveSync({ logger, role: "final-output" });
  const ownsLiveSync = !liveSync;

  const offStart = sub.onAnimationStart((animation) => {
    // existing audio-trigger logic for start-animation
  });
  const offStop = sub.onAnimationStop((animationId) => {
    // existing audio-trigger logic for stop-animation
  });
  const offClear = sub.onClearAll(() => {
    // existing logic for clear-all (stop all audio)
  });

  return {
    stop() {
      offStart(); offStop(); offClear();
      if (ownsLiveSync) sub.stop();
    },
  };
}
```

4. **Preserve all existing audio-side logic** — only the WS plumbing is removed. Audio decode, playback, volume, GIF-tagged-audio, etc., all stay intact.

5. **Net LOC change**: target ~50 LOC final (from ~120 LOC original; ~70 LOC removed). Document in module top-level comment: "Refactored Phase 35 to consume bootOutputLiveSync — WS plumbing extracted to output-live-sync.js per D-02."

After refactor:
- `node --test test/phase-35-output-live-sync.test.mjs` — D-02-B2 test should now PASS (audio-binder imports from output-live-sync, subscribes to callbacks).
- The full JS test suite must still pass (no regression to other tests).
  </action>
  <verify>
    <automated>node --test test/phase-35-output-live-sync.test.mjs && node --test test/**/*.test.mjs 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - output-audio-binder.js contains `from "./output-live-sync.js"` or `from './output-live-sync.js'` (grep)
    - output-audio-binder.js does NOT contain a top-level `new WebSocket(` call (grep returns 0)
    - output-audio-binder.js calls `liveSync.onAnimationStart`, `liveSync.onAnimationStop`, `liveSync.onClearAll` (grep all 3, OR through the shared `sub` variable)
    - output-audio-binder.js LOC drops by at least 40 (compare git diff line counts)
    - `node --test test/phase-35-output-live-sync.test.mjs` GREEN (all 3 sub-tests pass, including D-02-B2 source-grep test)
    - Full JS suite still passes — no regression to existing tests
  </acceptance_criteria>
  <done>output-audio-binder.js refactored; D-02-B2 test GREEN; audio path still works.</done>
</task>

<task type="auto">
  <name>Task 3: Refactor receiver-bootstrap.js + output.html — remove inline poll, wire liveSync getters</name>
  <read_first>
    - src/app/runtime/output-receiver/receiver-bootstrap.js lines 940-1021 (the snapshot-poll loop AND the input-forwarder closures)
    - src/app/runtime/output-receiver/output-live-sync.js (exports getAlignMode + getActiveProjectionProfileId)
    - output.html (current script-tag list)
    - .planning/phases/phase-35/35-RESEARCH.md §B.3 row "receiver-bootstrap.js" (refactor plan)
    - .planning/phases/phase-35/35-RESEARCH.md §"Pitfall 10" (snapshot-poll-vs-WS conflict — root cause for the refactor)
  </read_first>
  <files>src/app/runtime/output-receiver/receiver-bootstrap.js, output.html</files>
  <action>
**Part A — receiver-bootstrap.js refactor:**

1. Identify the inline 1Hz poll block at approximately lines 968-987 (from grep: `let alignMode = false`, `let currentProfileId = null`, `setInterval(pollSnapshot, 1000)`, etc.). Read context (940-1021) to capture the full extent.

2. Replace with a `liveSync`-aware shape. Modify `bootReceiver(...)` to accept a new optional arg:
```javascript
export function bootReceiver({ ..., liveSync = null } = {}) {
  // ...
  // Within attachInputForwarder closure setup:
  const isAlignModeActive = () => liveSync ? liveSync.getAlignMode() : false;
  const getCurrentProfileId = () => liveSync ? liveSync.getActiveProjectionProfileId() : null;

  // Subscribe to alignModeChange to update overlayEl pointer-events:
  if (liveSync) {
    liveSync.onAlignModeChange((enabled) => {
      overlayEl.style.pointerEvents = enabled ? "auto" : "none";
    });
  }
  // ...
}
```

3. **REMOVE** the entire `pollSnapshot` + `setInterval(pollSnapshot, 1000)` block — it's now owned by output-live-sync.js. Keep the 4-corner Wave-4 hit-test approximation for now (Track A's bootAlignMode will replace it in 35-A-PLAN; the 4-corner block stays as a fallback during this wave).

4. **D-06 IS REQUIRED FOR THIS TASK** — receiver-bootstrap.js IS in the 5-critical-files list. After modification, run `RUN_LIVE_TESTS=1 node --test test/connection-stability/` and verify still 72/0/13.

**Part B — output.html refactor:**

Add a new `<script type="module">` block BEFORE the bootReceiver and bootOutputAudioBinder script tags:

```html
<script type="module">
  import { bootOutputLiveSync } from "/src/app/runtime/output-receiver/output-live-sync.js";
  window.__ttbLiveSync = bootOutputLiveSync({ logger: console, role: "final-output" });
</script>
```

Then update the existing `<script type="module">` blocks for receiver and audio-binder to pass the liveSync arg:

```html
<script type="module">
  import { bootReceiver } from "/src/app/runtime/output-receiver/receiver-bootstrap.js";
  bootReceiver({ ..., liveSync: window.__ttbLiveSync });
</script>
<script type="module">
  import { bootOutputAudioBinder } from "/src/app/runtime/output-receiver/output-audio-binder.js";
  bootOutputAudioBinder({ logger: console, liveSync: window.__ttbLiveSync });
</script>
```

Boot order: live-sync → receiver → audio-binder. Live-sync must be FIRST so the others have a populated subscription.

NOTE: `window.__ttbLiveSync` is a deliberate global "single live-sync instance per page" pattern. This is the same convention as window.TT_BEAMER_* globals (per RESEARCH §"window.TT_BEAMER_* global namespace" pattern).

Do NOT change `output.html`'s stylesheet path (`/src/styles.css`) — Pitfall 3 — leave as-is.
Do NOT remove the existing diagnostic-chip rAF inline script — leave as-is.
  </action>
  <verify>
    <automated>RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tail -10 | grep -E "pass 72|fail 0|skipped 13" | wc -l</automated>
  </verify>
  <acceptance_criteria>
    - receiver-bootstrap.js no longer contains `setInterval(pollSnapshot` (grep returns 0)
    - receiver-bootstrap.js contains `liveSync` parameter in bootReceiver signature (grep)
    - receiver-bootstrap.js contains `liveSync.getAlignMode()` and `liveSync.getActiveProjectionProfileId()` (grep both)
    - receiver-bootstrap.js still has the 4-corner Wave-4 hit-test block (Track A removes it later — keep for now)
    - output.html contains `bootOutputLiveSync` (grep)
    - output.html script-tag order: live-sync BEFORE receiver-bootstrap BEFORE output-audio-binder (manual review of HTML)
    - **D-06 hard gate verified:** `RUN_LIVE_TESTS=1 node --test test/connection-stability/` reports 72 pass, 0 fail, 13 skipped (the verify command counts 3 expected lines)
    - Full JS suite still passes (no regression to other tests)
  </acceptance_criteria>
  <done>receiver-bootstrap refactored to single source of truth via liveSync; output.html wires the boot order; D-06 connection-stability UNCHANGED 72/0/13. Track B complete; Track A may proceed.</done>
</task>

<task type="auto">
  <name>Task 4: Live-E2E regression check — D-05 a-d still GREEN, D-06 final gate</name>
  <read_first>
    - test/live-e2e/test_phase35_alignmode_smoke.py (the D-05 a-f tests — only a-d expected GREEN at this point; e-f gated on Track A)
    - test/live-e2e/test_phase35_dashboard_alignmode.py (must STILL be GREEN — Track B doesn't touch dashboard live-sync)
  </read_first>
  <files></files>
  <action>
Run live-E2E and connection-stability gate as the wave-merge verification step (no code changes — pure verification task).

Commands to run:
1. `python -m pytest test/live-e2e/test_phase35_alignmode_smoke.py::test_ready_state -v`
2. `python -m pytest test/live-e2e/test_phase35_alignmode_smoke.py::test_current_time -v`
3. `python -m pytest test/live-e2e/test_phase35_alignmode_smoke.py::test_bg_color -v`
4. `python -m pytest test/live-e2e/test_phase35_alignmode_smoke.py::test_server_log_clean -v`
5. `python -m pytest test/live-e2e/test_phase35_dashboard_alignmode.py -v`
6. `RUN_LIVE_TESTS=1 node --test test/connection-stability/`
7. `node --test test/**/*.test.mjs`

Expected results:
- Tests 1-4 (D-05 a-d): GREEN (these were GREEN on master too; refactor must not regress them)
- Test 5 (dashboard regression): GREEN (Track B doesn't touch dashboard; if RED, halt and investigate)
- Test 6 (D-06 hard gate): 72/0/13 (D-06 LOCKED)
- Test 7 (full JS suite): 35-output-live-sync GREEN; 35-bootalignmode-shape still RED (Track A not landed yet); 35-bayer-dither still RED (Track C not landed yet)

If ANY of tests 1-6 fail, halt this wave merge and investigate. Specifically:
- If test_server_log_clean fails with "health ping failed" — Track B regressed connection stability via WS plumbing change. Investigate output-live-sync's reconnect logic.
- If test_ready_state / test_current_time fail — receiver-bootstrap got broken; revert and investigate.
- If dashboard regression fails — receiver-bootstrap was somehow shared with dashboard; this should not happen (dashboard uses runtime-live-sync-core.js). If it does, the live-sync coupling is wrong.

Document results in commit message OR in a Wave-1-merge note.
  </action>
  <verify>
    <automated>RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tail -10 | grep -E "pass 72" | wc -l</automated>
  </verify>
  <acceptance_criteria>
    - All D-05 a-d Playwright tests PASS
    - test_phase35_dashboard_alignmode.py PASSES (no dashboard regression)
    - D-06 hard gate: connection-stability 72/0/13 (verify command counts the expected line)
    - Full JS suite: phase-35-output-live-sync GREEN; phase-35-bootalignmode-shape RED (gated on Track A); phase-35-bayer-dither RED (gated on Track C)
    - No regression in any pre-existing test (Phase 33, 34 rails still GREEN)
  </acceptance_criteria>
  <done>Track B wave-merge verification complete. All D-06 + dashboard regression gates GREEN. Phase 35 may proceed to 35-A-PLAN.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser ←→ /api/live/ws | live-sync WebSocket — same-origin, no auth on localhost (carry-forward from Phase 33+) |
| browser ←→ /api/live/snapshot | HTTP fallback poll for cold-start state — same trust profile as WS |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-35-B-01 | DoS | output-live-sync reconnect storm if server flaps | mitigate | Exponential backoff [500,1000,2000,5000,10000,30000] — same as Phase 34 audio-binder pattern, already proven in production |
| T-35-B-02 | Information disclosure | live-sync replays snapshot on cold-start | accept | No PII in snapshot; same payload as Phase 33+ /api/live/snapshot — no new exposure |
| T-35-B-03 | Tampering | malformed JSON envelope from server | mitigate | `try { JSON.parse } catch { /* skip */ }` — silent skip, no crash |
| T-35-B-04 | DoS | dashboard's runtime-live-sync-core AND output-live-sync racing on dashboard tab | accept | Dashboard URL `/` does not load output.html — different script-graph; no race possible |
| T-35-B-05 | Repudiation | live-sync emits no telemetry on connect/disconnect | mitigate | logger.warn already wired in error paths; per-event console.debug already supplied via emit() handler-error path |
</threat_model>

<verification>
1. **D-02 unit test transition:** `node --test test/phase-35-output-live-sync.test.mjs` MUST go RED → GREEN (was 3 failures pre-Task-1, now 3 passes post-Task-2).
2. **D-06 hard gate:** `RUN_LIVE_TESTS=1 node --test test/connection-stability/` reports 72/0/13 unchanged.
3. **D-05 a-d on /output/:** Tests test_ready_state, test_current_time, test_bg_color, test_server_log_clean PASS — refactor preserved /output/ behavior.
4. **Dashboard regression:** test_phase35_dashboard_alignmode.py PASSES — runtime-live-sync-core.js untouched, dashboard align-mode still works.
5. **Audio path:** D-02-B3 spec — start-animation arrives via WS, audio plays. Verify by adding a temporary trigger from `/api/live/mutate` with `mutationType: "start-animation"` and confirming audio plays in the Playwright session (manual verify step OR extend test_output_smoke).
</verification>

<success_criteria>
- [ ] src/app/runtime/output-receiver/output-live-sync.js exists, ~186 LOC, 11 methods on returned object
- [ ] test/phase-35-output-live-sync.test.mjs GREEN (RED→GREEN transition for D-02-B1, D-02-B2)
- [ ] output-audio-binder.js refactored; LOC dropped by ≥40; subscribes to bootOutputLiveSync's callbacks
- [ ] receiver-bootstrap.js inline poll loop REMOVED; isAlignModeActive + getCurrentProfileId now read from liveSync
- [ ] output.html loads bootOutputLiveSync FIRST then passes result to bootReceiver and bootOutputAudioBinder
- [ ] D-06 hard gate: connection-stability stays 72/0/13
- [ ] D-05 a-d tests: GREEN
- [ ] Dashboard regression test: GREEN
- [ ] No production code touched outside the 4 listed files_modified
</success_criteria>

<output>
After completion, create `.planning/phases/phase-35/35-B-SUMMARY.md` with:
- output-live-sync.js LOC count (target ~186, ceiling 220)
- output-audio-binder.js before/after LOC delta
- D-06 connection-stability result line
- D-05 a-d test results
- Dashboard regression test result
- Confirmation: 35-A-PLAN may proceed (Track B API ready for Track A consumption)
</output>
