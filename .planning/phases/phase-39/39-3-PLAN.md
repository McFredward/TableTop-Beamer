---
phase: 39
plan: 3
type: execute
wave: 1
depends_on: [39-1]
files_modified:
  - src/app/runtime/output-receiver/receiver-bootstrap.js
  - src/app/runtime/output-receiver/receiver-status-ui.js
autonomous: true
requirements:
  - D-02-COLD-START-STABILITY
must_haves:
  truths:
    - "First-attempt cold-boot connect runs through a new INITIAL_CONNECT state, not CONNECTING"
    - "Failures during INITIAL_CONNECT remain in INITIAL_CONNECT until the 5s grace elapses, then escalate to RECONNECTING"
    - "The 'RECONNECTING' UI banner does NOT appear during INITIAL_CONNECT — a 'Connecting to render server…' splash shows instead"
    - "30s cold-boot test counts <2 distinct RECONNECTING-state entries (RED→GREEN turn for the D-02 RED test)"
    - "Capped-retry quota (10 attempts / 120s) does NOT count INITIAL_CONNECT attempts — only RECONNECTING attempts"
    - "All D-08 connection-stability tests remain green; Phase 38 W10 WS-fragmentation test remains green"
  artifacts:
    - path: "src/app/runtime/output-receiver/receiver-bootstrap.js"
      provides: "ConnectionState.INITIAL_CONNECT enum entry; LEGAL_TRANSITIONS for it; INITIAL_CONNECT_GRACE_MS constant; tryConnect() routes first attempt through INITIAL_CONNECT"
      contains: "INITIAL_CONNECT"
    - path: "src/app/runtime/output-receiver/receiver-status-ui.js"
      provides: "showInitialConnect() method or equivalent UI gating that suppresses RECONNECTING banner during INITIAL_CONNECT"
      contains: "INITIAL_CONNECT"
  key_links:
    - from: "receiver-bootstrap.js tryConnect()"
      to: "INITIAL_CONNECT state on first call"
      via: "currentState === NEW check at entry"
      pattern: "INITIAL_CONNECT"
    - from: "receiver-bootstrap.js failure handler"
      to: "RECONNECTING transition after INITIAL_CONNECT_GRACE_MS"
      via: "firstAttemptStartedAtMs + Date.now() comparison"
      pattern: "INITIAL_CONNECT_GRACE_MS"
    - from: "receiver-status-ui.js banner gating"
      to: "INITIAL_CONNECT state value"
      via: "switch(state) or if-chain in render path"
      pattern: "INITIAL_CONNECT"
    - from: "Plan 39-1 RED tests (state-machine + cold-boot)"
      to: "this plan's fix"
      via: "RED → GREEN turn"
      pattern: "INITIAL_CONNECT"
---

<objective>
Fix D-02: cold-boot reconnect storms are reclassified, not retried.

Root cause (per 39-RESEARCH.md): the receiver's `LEGAL_TRANSITIONS` enum has no state distinguishing "first ever connect attempt" from "subsequent reconnect attempt". Every pre-CONNECTED failure routes to RECONNECTING, which fires the visible banner. Phase 38 W10 made the WS layer reliable, exposing the structurally-racy publisher-boot sequence (Chromium tab boot → in-page publisher inject → mediasoup `produce` RPC → `producer-ready` broadcast — typically 3-10s) as visible "RECONNECTING — Xs (attempt N)" cycles to the operator.

Fix: add a new `INITIAL_CONNECT` state to the existing LiveKit-style state machine. Failures during the first 5-second grace window stay in INITIAL_CONNECT (no banner) and silently retry. Only after grace expires does the state escalate to RECONNECTING (banner appears) and start counting against the capped-retry quota.

Output:
- Extended `ConnectionState` enum + `LEGAL_TRANSITIONS` in receiver-bootstrap.js
- `INITIAL_CONNECT_GRACE_MS = 5000` constant (env-configurable)
- `tryConnect()` routes first call through INITIAL_CONNECT, subsequent calls through CONNECTING
- `shouldGiveUp()` updated to NOT count INITIAL_CONNECT attempts against MAX_RECONNECT_ATTEMPTS_BEFORE_GIVEUP
- UI surface: receiver-status-ui.js suppresses RECONNECTING banner during INITIAL_CONNECT
- All carry-forward rails GREEN (D-08, W10, Phase 32/33 receiver-state-machine tests)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/CRITICAL_KNOWN_BUGS.md
@.planning/phases/phase-39/39-RESEARCH.md
@.planning/phases/phase-33/33-CLOSURE.md
@.planning/phases/phase-39/39-1-PLAN.md

<interfaces>
<!-- The current ConnectionState enum and LEGAL_TRANSITIONS, verbatim from receiver-bootstrap.js. -->

From src/app/runtime/output-receiver/receiver-bootstrap.js:61-114 (current state — must extend, not replace):
```javascript
export const ConnectionState = Object.freeze({
  NEW: "NEW",
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  RECONNECTING: "RECONNECTING",
  GIVEN_UP: "GIVEN_UP",
  HOST_DOWN: "HOST_DOWN",
  STOPPED: "STOPPED",
});

const LEGAL_TRANSITIONS = Object.freeze({
  [ConnectionState.NEW]:          new Set([ConnectionState.CONNECTING, ConnectionState.STOPPED]),
  [ConnectionState.CONNECTING]:   new Set([
    ConnectionState.CONNECTED,
    ConnectionState.RECONNECTING,
    ConnectionState.HOST_DOWN,
    ConnectionState.GIVEN_UP,
    ConnectionState.STOPPED,
  ]),
  [ConnectionState.CONNECTED]:    new Set([
    ConnectionState.RECONNECTING,
    ConnectionState.HOST_DOWN,
    ConnectionState.STOPPED,
  ]),
  [ConnectionState.RECONNECTING]: new Set([
    ConnectionState.CONNECTING,
    ConnectionState.HOST_DOWN,
    ConnectionState.GIVEN_UP,
    ConnectionState.STOPPED,
  ]),
  // ... HOST_DOWN, GIVEN_UP, STOPPED transitions follow ...
});
```

From .planning/phases/phase-39/39-RESEARCH.md §"D-02 Implementation approach":
```
1. Add new state INITIAL_CONNECT to ConnectionState enum
2. Legal transitions:
   NEW            → INITIAL_CONNECT   (replaces NEW → CONNECTING)
   INITIAL_CONNECT → CONNECTED
   INITIAL_CONNECT → RECONNECTING  (after grace expires)
   INITIAL_CONNECT → HOST_DOWN
   INITIAL_CONNECT → STOPPED
3. tryConnect() entry: if (currentState === NEW || (reconnectAttempts === 0 && firstFailureAtMs === null)): enter INITIAL_CONNECT
   else: enter CONNECTING (the existing path)
4. UI: while state === INITIAL_CONNECT, show splash "Connecting to render server…" (no RECONNECTING banner)
5. INITIAL_CONNECT_GRACE_MS = 5000 (env-configurable via process.env.RECEIVER_INITIAL_CONNECT_GRACE_MS or window-side equivalent)
6. shouldGiveUp(): only count escalations FROM RECONNECTING, NOT INITIAL_CONNECT (preserves 10-attempt / 120s cap semantics for genuine reconnect storms)
```

From .planning/phases/phase-39/39-RESEARCH.md §"D-02 Risks":
```
| Existing tests that assume `NEW → CONNECTING` transition fail | High | Update test fixtures to use the new transition |
```
Action: also check test/connection-stability/receiver-state-machine.test.mjs — any test that explicitly asserts NEW → CONNECTING legal will now fail. Update its assertion to NEW → INITIAL_CONNECT.

From src/app/runtime/output-receiver/receiver-bootstrap.js (search for these symbols to confirm exact line numbers in your local copy):
- `assertLegalTransition` (export — already exported per Plan 39-1 Task 2 test-only export)
- `MAX_RECONNECT_ATTEMPTS_BEFORE_GIVEUP` (Phase 33 T2)
- `MAX_TOTAL_RECONNECT_DURATION_MS` (Phase 33 T2)
- `tryConnect` function
- `shouldGiveUp` function
- `firstFailureAtMs` variable (Phase 33 iter-4)
- `reconnectAttempts` counter

The current `receiver-status-ui.js` exposes:
- `showConnecting()`, `showConnected()`, `showReconnecting()`, `showHostDown()`, `showGivenUp()` (approximate names — grep the file to confirm)
- Phase 39 adds `showInitialConnect()` which renders the splash without the "RECONNECTING — Xs (attempt N)" countdown.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extend ConnectionState enum + LEGAL_TRANSITIONS + INITIAL_CONNECT_GRACE_MS</name>
  <read_first>
    - src/app/runtime/output-receiver/receiver-bootstrap.js lines 1-200 (the whole file head — to see enum, transitions, transition asserter, exports)
    - src/app/runtime/output-receiver/receiver-bootstrap.js — search and read the bodies of: tryConnect, shouldGiveUp, firstFailureAtMs initialization, reconnectAttempts reset paths
    - test/phase-39-d02-state-machine.test.mjs (created in Plan 39-1) — to see the EXACT assertions this task must satisfy (e.g. "NEW → INITIAL_CONNECT legal", "NEW → CONNECTING NOT legal", "INITIAL_CONNECT → CONNECTED legal")
    - test/connection-stability/receiver-state-machine.test.mjs — to identify any existing assertions that will break and need updating
  </read_first>
  <files>src/app/runtime/output-receiver/receiver-bootstrap.js</files>
  <behavior>
    - ConnectionState.INITIAL_CONNECT === "INITIAL_CONNECT"
    - LEGAL_TRANSITIONS[ConnectionState.NEW] === new Set([ConnectionState.INITIAL_CONNECT, ConnectionState.STOPPED])   ← CONNECTING REMOVED from NEW's set
    - LEGAL_TRANSITIONS[ConnectionState.INITIAL_CONNECT] === new Set([ConnectionState.CONNECTED, ConnectionState.RECONNECTING, ConnectionState.HOST_DOWN, ConnectionState.STOPPED])
    - LEGAL_TRANSITIONS[ConnectionState.CONNECTING] unchanged
    - LEGAL_TRANSITIONS[ConnectionState.CONNECTED] unchanged
    - LEGAL_TRANSITIONS[ConnectionState.RECONNECTING] unchanged (still transitions to CONNECTING, HOST_DOWN, GIVEN_UP, STOPPED)
    - INITIAL_CONNECT_GRACE_MS = 5000 (configurable via process.env.RECEIVER_INITIAL_CONNECT_GRACE_MS in node test env, AND via a window-side override window.__TT_BEAMER_INITIAL_CONNECT_GRACE_MS for runtime tuning)
    - assertLegalTransition(NEW, INITIAL_CONNECT) does NOT throw
    - assertLegalTransition(NEW, CONNECTING) THROWS
    - assertLegalTransition(INITIAL_CONNECT, CONNECTED) does NOT throw
    - assertLegalTransition(INITIAL_CONNECT, RECONNECTING) does NOT throw
    - tryConnect() and shouldGiveUp() bodies UNCHANGED in this task (Task 2 will edit them)
  </behavior>
  <action>
1. Read src/app/runtime/output-receiver/receiver-bootstrap.js fully (use `grep -n` to find exact line numbers for the enum, the LEGAL_TRANSITIONS object, and tryConnect / shouldGiveUp functions).

2. Modify the ConnectionState enum (currently at line 61) — insert `INITIAL_CONNECT` between `NEW` and `CONNECTING`:

```javascript
export const ConnectionState = Object.freeze({
  NEW: "NEW",
  INITIAL_CONNECT: "INITIAL_CONNECT",  // Phase 39 Plan 39-3 D-02: first-attempt window, no RECONNECTING banner.
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  RECONNECTING: "RECONNECTING",
  GIVEN_UP: "GIVEN_UP",
  HOST_DOWN: "HOST_DOWN",
  STOPPED: "STOPPED",
});
```

3. Modify the LEGAL_TRANSITIONS object. Replace `[ConnectionState.NEW]:` line with the line below (CONNECTING REMOVED), AND add a new INITIAL_CONNECT entry:

```javascript
const LEGAL_TRANSITIONS = Object.freeze({
  [ConnectionState.NEW]: new Set([
    ConnectionState.INITIAL_CONNECT,  // Phase 39 D-02: cold boot must go via INITIAL_CONNECT (no RECONNECTING banner).
    ConnectionState.STOPPED,
  ]),
  [ConnectionState.INITIAL_CONNECT]: new Set([
    ConnectionState.CONNECTED,
    ConnectionState.RECONNECTING,
    ConnectionState.HOST_DOWN,
    ConnectionState.STOPPED,
  ]),
  [ConnectionState.CONNECTING]: new Set([
    ConnectionState.CONNECTED,
    ConnectionState.RECONNECTING,
    ConnectionState.HOST_DOWN,
    ConnectionState.GIVEN_UP,
    ConnectionState.STOPPED,
  ]),
  // ... rest unchanged ...
});
```

DO NOT change CONNECTING, CONNECTED, RECONNECTING, HOST_DOWN, GIVEN_UP, STOPPED transition sets — copy them through unchanged.

4. Add the grace constant near the existing reconnect-tuning constants (search for `MAX_RECONNECT_ATTEMPTS_BEFORE_GIVEUP` to find the spot):

```javascript
// Phase 39 Plan 39-3 D-02: first-attempt grace window. While in INITIAL_CONNECT,
// failures silently re-enter INITIAL_CONNECT (no RECONNECTING banner) until
// this many milliseconds have elapsed since firstAttemptStartedAtMs. Configurable
// via process.env.RECEIVER_INITIAL_CONNECT_GRACE_MS (Node test harness) or
// window.__TT_BEAMER_INITIAL_CONNECT_GRACE_MS (browser-side tuning).
const _ENV_GRACE = (typeof process !== "undefined" && process?.env?.RECEIVER_INITIAL_CONNECT_GRACE_MS) || null;
const _WIN_GRACE = (typeof window !== "undefined" && window?.__TT_BEAMER_INITIAL_CONNECT_GRACE_MS) || null;
const INITIAL_CONNECT_GRACE_MS = Number(_WIN_GRACE ?? _ENV_GRACE) > 0
  ? Number(_WIN_GRACE ?? _ENV_GRACE)
  : 5000;
```

5. Export INITIAL_CONNECT_GRACE_MS for tests (add to the existing `export { ... }` block or use an inline `export const`).

6. DO NOT modify tryConnect() or shouldGiveUp() in this task — Task 2 owns them.

7. After the edit, run:
```bash
node --test test/phase-39-d02-state-machine.test.mjs
```
The state-machine assertions (NEW → INITIAL_CONNECT legal, NEW → CONNECTING NOT legal, INITIAL_CONNECT → CONNECTED, INITIAL_CONNECT → RECONNECTING) should now ALL PASS.

8. Also run:
```bash
node --test test/connection-stability/receiver-state-machine.test.mjs
```
If this fails because an existing test asserted `assertLegalTransition(NEW, CONNECTING)` does NOT throw — that's the breaking-change risk flagged in 39-RESEARCH.md §"D-02 Risks". Update those assertions to use NEW → INITIAL_CONNECT instead. Use a surgical edit: change only the state-name in the assertion, not the test structure. If a test asserts the OLD path was correct for behavioral reasons (not just transition legality), STOP and flag — that's a deeper semantic conflict.
  </action>
  <verify>
    <automated>node --test test/phase-39-d02-state-machine.test.mjs && node --test test/connection-stability/receiver-state-machine.test.mjs</automated>
  </verify>
  <acceptance_criteria>
    - grep -n "INITIAL_CONNECT" src/app/runtime/output-receiver/receiver-bootstrap.js returns ≥4 matches (enum + transition source + transition target + constant comment)
    - grep -nE 'INITIAL_CONNECT_GRACE_MS\s*=\s*[0-9]' src/app/runtime/output-receiver/receiver-bootstrap.js returns ≥1
    - grep -n "ConnectionState.NEW" src/app/runtime/output-receiver/receiver-bootstrap.js shows that NEW's transition set NO LONGER includes CONNECTING directly (only INITIAL_CONNECT and STOPPED)
    - node --check src/app/runtime/output-receiver/receiver-bootstrap.js (syntactic check) exits 0  ← if file is ESM, use `node --input-type=module --check` equivalent or skip if not applicable
    - `node --test test/phase-39-d02-state-machine.test.mjs` exits 0 (all four new transition assertions PASS)
    - `node --test test/connection-stability/receiver-state-machine.test.mjs` exits 0 (existing assertions still hold, possibly with surgical updates to NEW transitions)
    - The CONNECTING, CONNECTED, RECONNECTING transition sets remain literally identical to before: `git diff src/app/runtime/output-receiver/receiver-bootstrap.js` shows changes ONLY in NEW's set, the new INITIAL_CONNECT entry, the new INITIAL_CONNECT_GRACE_MS constant, and the enum addition — NOWHERE ELSE
  </acceptance_criteria>
  <done>ConnectionState enum has INITIAL_CONNECT; LEGAL_TRANSITIONS has the new entry; NEW's transition set is restricted to {INITIAL_CONNECT, STOPPED}; INITIAL_CONNECT_GRACE_MS=5000 is defined and env-configurable. All Plan 39-1 state-machine tests turn GREEN. Existing receiver-state-machine.test.mjs adapted minimally to the new NEW → INITIAL_CONNECT transition and still passes.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Route tryConnect() through INITIAL_CONNECT on first call + update shouldGiveUp() to skip INITIAL_CONNECT attempts</name>
  <read_first>
    - src/app/runtime/output-receiver/receiver-bootstrap.js — full body of `tryConnect`, `shouldGiveUp`, the initial state setup (where currentState first gets a value), all `transitionTo(ConnectionState.XXX)` calls and the close-handler / RPC-timeout / mediasoup-event paths that currently call transitionTo(RECONNECTING)
    - src/app/runtime/output-receiver/receiver-bootstrap.js — `reconnectAttempts`, `firstFailureAtMs`, `firstAttemptStartedAtMs` (if it exists; if not, add it) variables
    - test/connection-stability/phase-39-cold-boot.test.mjs (Plan 39-1) — the assertion is `count of distinct entries to RECONNECTING state < 2 in 30s` — re-read it to lock in the contract
    - test/connection-stability/_harness.mjs — what `onConnectionState` callback gets invoked with (the state string)
  </read_first>
  <files>src/app/runtime/output-receiver/receiver-bootstrap.js</files>
  <behavior>
    - On the FIRST call to tryConnect() when currentState === NEW: transition NEW → INITIAL_CONNECT, set `firstAttemptStartedAtMs = Date.now()`, then proceed with the connection attempt (same body as the existing CONNECTING path, just routed through INITIAL_CONNECT)
    - On a failure during INITIAL_CONNECT:
        - If Date.now() - firstAttemptStartedAtMs < INITIAL_CONNECT_GRACE_MS: silent retry — stay in INITIAL_CONNECT (NOT in RECONNECTING). reconnectAttempts is NOT incremented. firstFailureAtMs is NOT set.
        - If Date.now() - firstAttemptStartedAtMs >= INITIAL_CONNECT_GRACE_MS: escalate INITIAL_CONNECT → RECONNECTING. NOW set firstFailureAtMs, increment reconnectAttempts, follow the existing reconnect path.
    - On success during INITIAL_CONNECT: INITIAL_CONNECT → CONNECTED (normal path).
    - On subsequent tryConnect() calls (currentState === RECONNECTING): continue with the existing CONNECTING → CONNECTED / RECONNECTING cycle (unchanged from today). NEW does NOT recur after first connect.
    - shouldGiveUp(): only considers attempts logged AFTER first escalation to RECONNECTING. Specifically: if currentState === INITIAL_CONNECT OR reconnectAttempts === 0, shouldGiveUp() returns false unconditionally. The 10-attempt / 120s cap kicks in ONLY when reconnectAttempts ≥ 1.
    - On stop() / teardown() during INITIAL_CONNECT: transition INITIAL_CONNECT → STOPPED (legal per Task 1).
    - The `onConnectionState` subscriber callback is invoked with "INITIAL_CONNECT" on entry. Downstream UI (Task 3) maps that to the splash banner.
  </behavior>
  <action>
1. Re-read tryConnect() and shouldGiveUp() fully. Identify every transitionTo() call in tryConnect's failure path AND every external trigger (ws-close, RPC timeout, transport-connectionstatechange failed/disconnected, heartbeat-stale, frame-stale, render-host-down, producer-closed) that currently does `transitionTo(ConnectionState.RECONNECTING)`.

2. Add `firstAttemptStartedAtMs` to the module-level state (near `firstFailureAtMs`):
```javascript
let firstAttemptStartedAtMs = null;
```

3. At the entry to tryConnect():
```javascript
function tryConnect() {
  // Phase 39 Plan 39-3 D-02: first-ever attempt goes through INITIAL_CONNECT,
  // not CONNECTING. This suppresses the RECONNECTING banner during the
  // legitimate publisher-boot race window.
  if (currentState === ConnectionState.NEW) {
    transitionTo(ConnectionState.INITIAL_CONNECT);
    firstAttemptStartedAtMs = Date.now();
  } else if (currentState === ConnectionState.RECONNECTING) {
    transitionTo(ConnectionState.CONNECTING);
  }
  // ... rest of existing tryConnect body, unchanged ...
}
```

4. Wrap every failure-path `transitionTo(ConnectionState.RECONNECTING)` site with a helper. Add this helper near transitionTo():
```javascript
// Phase 39 Plan 39-3 D-02: failure routing helper.
// Stays in INITIAL_CONNECT during grace, escalates to RECONNECTING after.
function handleConnectFailure(reason) {
  const now = Date.now();
  if (currentState === ConnectionState.INITIAL_CONNECT) {
    const elapsed = firstAttemptStartedAtMs ? (now - firstAttemptStartedAtMs) : Infinity;
    if (elapsed < INITIAL_CONNECT_GRACE_MS) {
      // Silent retry — stay in INITIAL_CONNECT. Schedule the next tryConnect
      // via the existing backoff scheduler (use 250-500ms for INITIAL_CONNECT
      // retries; the existing exponential backoff applies after escalation).
      scheduleInitialConnectRetry(reason);
      return;
    }
    // Grace expired — escalate.
    transitionTo(ConnectionState.RECONNECTING);
    firstFailureAtMs = now;
    reconnectAttempts = 1;
    scheduleReconnect(reason);
    return;
  }
  // Existing path for CONNECTING / CONNECTED → RECONNECTING.
  transitionTo(ConnectionState.RECONNECTING);
  if (firstFailureAtMs === null) firstFailureAtMs = now;
  reconnectAttempts += 1;
  scheduleReconnect(reason);
}

function scheduleInitialConnectRetry(reason) {
  // Quick retry — does NOT increment reconnectAttempts and does NOT count
  // against capped-retry. Use a fixed 300ms delay (small enough to not
  // delay legitimate cold-boots; large enough to not busy-loop).
  setTimeout(() => {
    if (currentState === ConnectionState.INITIAL_CONNECT) tryConnect();
  }, 300);
}
```

5. Replace every existing failure-path `transitionTo(ConnectionState.RECONNECTING)` call in tryConnect's body and in the external triggers (ws-close, RPC timeout, etc.) with `handleConnectFailure(<short string reason>)`. Examples to grep for and update:
   - `ws.addEventListener("close", ...)` handler
   - RPC timeout error path
   - `recvTransport.on("connectionstatechange")` → "failed" / "disconnected" branches
   - Heartbeat-stale gate
   - Frame-stale gate
   Each existing call to `transitionTo(ConnectionState.RECONNECTING)` (or equivalent) at the consumer-failure sites becomes `handleConnectFailure("<existing-reason-string-or-similar>")`.

   Do NOT replace transitionTo calls that are unrelated to failure routing (e.g. STOPPED on stop(), HOST_DOWN on `render-host-down` server message — those remain direct transitions).

6. Update shouldGiveUp():
```javascript
function shouldGiveUp() {
  // Phase 39 Plan 39-3 D-02: INITIAL_CONNECT attempts do NOT count against
  // the capped-retry budget. The 10-attempt / 120s cap engages only after
  // the first escalation to RECONNECTING.
  if (currentState === ConnectionState.INITIAL_CONNECT) return false;
  if (reconnectAttempts < 1) return false;
  // ... existing cap logic unchanged from Phase 33 T2 ...
}
```

7. Reset firstAttemptStartedAtMs on entry to tryConnect when currentState === NEW (already covered in step 3). Reset on STOPPED transition so a future "restart from NEW" works correctly. Reset on CONNECTED transition (no longer needed, but cleanup is cheap):
```javascript
// In the CONNECTED transition handler:
firstAttemptStartedAtMs = null;
firstFailureAtMs = null;
reconnectAttempts = 0;  // existing
```

8. After all edits, run:
```bash
# Unit-level state machine
node --test test/phase-39-d02-state-machine.test.mjs

# Cold-boot integration (this is the BIG RED → GREEN turn)
RUN_LIVE_TESTS=1 node --test test/connection-stability/phase-39-cold-boot.test.mjs

# Phase 32/33 regression rails
node --test test/connection-stability/receiver-state-machine.test.mjs
node --test test/phase-32-cold-boot-reconnect-repro.test.mjs

# D-08 hard gate
RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs
```

If a phase-32 / phase-33 regression test fails because it asserts the OLD NEW → CONNECTING path: investigate and either (a) update the assertion to the new path if it's a transition-legality test, or (b) STOP and report semantic conflict to the orchestrator.
  </action>
  <verify>
    <automated>RUN_LIVE_TESTS=1 node --test test/connection-stability/phase-39-cold-boot.test.mjs && node --test test/connection-stability/receiver-state-machine.test.mjs</automated>
  </verify>
  <acceptance_criteria>
    - grep -n "handleConnectFailure" src/app/runtime/output-receiver/receiver-bootstrap.js returns ≥3 matches (definition + ≥2 call sites)
    - grep -n "scheduleInitialConnectRetry" src/app/runtime/output-receiver/receiver-bootstrap.js returns ≥2 matches (definition + at least 1 call site inside handleConnectFailure)
    - grep -cn "transitionTo(ConnectionState.RECONNECTING)" src/app/runtime/output-receiver/receiver-bootstrap.js — should be a SMALL number (only the escalation site inside handleConnectFailure and possibly internal cleanup); the multiple call sites that existed before are now routed through handleConnectFailure
    - grep -n "firstAttemptStartedAtMs" src/app/runtime/output-receiver/receiver-bootstrap.js returns ≥3 matches (declaration + entry-set + reset)
    - grep -n "INITIAL_CONNECT_GRACE_MS" src/app/runtime/output-receiver/receiver-bootstrap.js returns ≥2 matches (constant + check in handleConnectFailure)
    - grep -n "currentState === ConnectionState.INITIAL_CONNECT" src/app/runtime/output-receiver/receiver-bootstrap.js returns ≥2 matches (in shouldGiveUp + in handleConnectFailure)
    - `RUN_LIVE_TESTS=1 node --test test/connection-stability/phase-39-cold-boot.test.mjs` exits 0 AND stdout contains `\[d-02-cold-boot\] reconnectingEvents=[01]` (0 or 1 RECONNECTING events in 30s cold-boot — the RED → GREEN turn)
    - `node --test test/connection-stability/receiver-state-machine.test.mjs` exits 0
    - `node --test test/phase-32-cold-boot-reconnect-repro.test.mjs` exits 0
    - `RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs` shows `sustained >=30000ms heartbeats>=20 closed=false producerReady=0 renderHostDown=0`
    - No changes outside receiver-bootstrap.js: `git diff --name-only HEAD~1 HEAD -- src/` shows only this file modified by this task
  </acceptance_criteria>
  <done>tryConnect() routes the first attempt through INITIAL_CONNECT. handleConnectFailure helper centralizes failure routing — silent retry during grace, escalate to RECONNECTING after. shouldGiveUp() skips INITIAL_CONNECT attempts so the capped-retry budget is preserved for real reconnects. D-02 cold-boot RED test turns GREEN: <2 RECONNECTING events in 30s.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Wire receiver-status-ui to suppress RECONNECTING banner during INITIAL_CONNECT</name>
  <read_first>
    - src/app/runtime/output-receiver/receiver-status-ui.js (the entire file) — to see the existing banner-render methods and how they react to state transitions
    - src/app/runtime/output-receiver/receiver-bootstrap.js — search for where onConnectionState subscribers are notified (transitionTo body); confirm the state string passed to subscribers
    - src/app/runtime/output-receiver/receiver-status-ui.js — search for any existing "Connecting…" / "Reconnecting…" string literals; the new splash should use the existing "Connecting to render server…" wording (or whatever the codebase uses for the CONNECTING state pre-CONNECTED). If no splash exists, add a minimal "Connecting…" banner without the attempt-counter.
  </read_first>
  <files>src/app/runtime/output-receiver/receiver-status-ui.js</files>
  <behavior>
    - When the receiver's connection state is INITIAL_CONNECT: render a non-alarming splash "Connecting to render server…" (or equivalent existing CONNECTING-state banner). Do NOT show the "RECONNECTING — Xs (attempt N)" countdown.
    - When the state is CONNECTING (post-INITIAL_CONNECT, normal reconnect path): existing CONNECTING UI unchanged.
    - When the state is RECONNECTING: existing RECONNECTING banner (with countdown) unchanged.
    - When the state is CONNECTED: existing CONNECTED UI unchanged.
    - The UI does NOT flash between INITIAL_CONNECT and any other state during the cold-boot grace window — it stays on the splash until either CONNECTED (success) or RECONNECTING (escalation after grace).
  </behavior>
  <action>
1. Read src/app/runtime/output-receiver/receiver-status-ui.js fully. Locate:
   - The state-driven render dispatcher (likely a switch or if-chain over the incoming state string)
   - The existing CONNECTING handler (it probably already renders a "Connecting…" splash)
   - The existing RECONNECTING handler (with attempt counter)

2. Add a new branch for `INITIAL_CONNECT` to the dispatcher. Reuse the CONNECTING render method (or whatever the project already shows during legitimate CONNECTING) so the user sees a consistent splash. Example (adapt to the actual dispatcher style in the file):

```javascript
// Phase 39 Plan 39-3 D-02: INITIAL_CONNECT shows the same splash as CONNECTING.
// The visible UI difference is: NO "RECONNECTING — Xs (attempt N)" banner appears
// during the legitimate publisher-boot race window (typically 3-10s).
case "INITIAL_CONNECT":
  // Reuse the existing CONNECTING render path — splash with "Connecting to render server…"
  showConnecting();  // or the equivalent existing method name
  break;
```

If the project uses an if-chain instead of a switch, add the equivalent if-branch.

If the existing CONNECTING handler shows ANYTHING that hints at reconnect (e.g. an attempt counter), make sure the INITIAL_CONNECT path does NOT show that. The INITIAL_CONNECT splash should look like a normal first-load splash, indistinguishable from a clean cold-boot.

3. Verify the UI does NOT regress in any other state. Specifically:
   - CONNECTED: previously connected, still connected — no change.
   - RECONNECTING: existing banner with attempt counter — no change.
   - HOST_DOWN: existing error UI — no change.
   - GIVEN_UP: existing error UI — no change.

4. After editing, manually run the receiver via a fresh /output/ load in a browser (or via the existing test/live-e2e Playwright fixture) and confirm:
   - On first load, the splash "Connecting to render server…" appears.
   - After ~3-10s, the splash disappears and the stream renders.
   - The "RECONNECTING" banner does NOT appear during this window.
   - If the publisher takes >5s and the state escalates to RECONNECTING, the banner DOES appear (correct behavior — grace expired, real reconnect path).

5. Run the existing live-e2e tests that cover /output/ UI to confirm no regression:
```bash
python3 -m pytest test/live-e2e/test_phase38_ssr_grid_state_cdp.py -v
```

Expected: PASS (this test does not assert on the banner text but it does exercise /output/ load).

DO NOT modify receiver-bootstrap.js in this task (Task 2 owned it).
DO NOT add new banner-message strings — reuse the existing CONNECTING / loading splash.
  </action>
  <verify>
    <automated>grep -n "INITIAL_CONNECT" src/app/runtime/output-receiver/receiver-status-ui.js | head -3 && python3 -m pytest test/live-e2e/test_phase38_ssr_grid_state_cdp.py -v --maxfail=1</automated>
  </verify>
  <acceptance_criteria>
    - grep -n "INITIAL_CONNECT" src/app/runtime/output-receiver/receiver-status-ui.js returns ≥1 match
    - The new code path in receiver-status-ui.js dispatches INITIAL_CONNECT to an existing splash render method (no new string literals invented — re-uses the project's existing CONNECTING / loading copy)
    - `python3 -m pytest test/live-e2e/test_phase38_ssr_grid_state_cdp.py -v` exits 0 (no /output/ UI regression)
    - `RUN_LIVE_TESTS=1 node --test test/connection-stability/phase-39-cold-boot.test.mjs` exits 0 (RED → GREEN turn confirmed end-to-end)
    - No banner-text changes to RECONNECTING / CONNECTED / HOST_DOWN / GIVEN_UP rendering paths
    - `git diff --name-only HEAD~2 HEAD` shows only receiver-bootstrap.js + receiver-status-ui.js modified across Plan 39-3's three tasks
  </acceptance_criteria>
  <done>receiver-status-ui.js routes the INITIAL_CONNECT state to the existing CONNECTING splash, suppressing the RECONNECTING banner during the cold-boot grace window. Phase 38 live-e2e UI test passes; D-02 cold-boot integration test passes.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Network → mediasoup transport | WebRTC ICE / DTLS negotiation crosses untrusted network |
| Server → receiver state machine | Server-originated `render-host-down` / `producer-closed` messages affect receiver state |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-39-3-01 | DoS | A real attacker delays publisher-boot indefinitely to keep the receiver stuck in INITIAL_CONNECT | mitigate | INITIAL_CONNECT_GRACE_MS=5000 hard limit. After 5s the state ESCALATES to RECONNECTING and the existing 10-attempt / 120s capped-retry budget engages. The receiver eventually reaches GIVEN_UP. |
| T-39-3-02 | DoS | scheduleInitialConnectRetry tight loop | mitigate | Fixed 300ms delay between retries during grace; grace is hard-capped at 5000ms → ≤ ~17 retries per cold-boot worst case |
| T-39-3-03 | Tampering | window.__TT_BEAMER_INITIAL_CONNECT_GRACE_MS could be set to a huge value to delay reconnect detection | accept | The window object is same-origin and already trusted; the runtime is single-user LAN; no security boundary crossed |
| T-39-3-04 | Spoofing | A malicious server keeps sending `producer-ready=false` to keep the receiver in INITIAL_CONNECT | accept | Server is trusted in this product (LAN-only single-user). After grace, normal capped-retry engages and HOST_DOWN / GIVEN_UP fires per existing Phase 33 logic |
</threat_model>

<verification>
Phase-level gate for Plan 39-3:

```bash
# Unit + integration
node --test test/phase-39-d02-state-machine.test.mjs
node --test test/connection-stability/receiver-state-machine.test.mjs

# The big RED → GREEN turn
RUN_LIVE_TESTS=1 node --test test/connection-stability/phase-39-cold-boot.test.mjs

# Phase 32/33 reconnect regression rails
node --test test/phase-32-cold-boot-reconnect-repro.test.mjs
RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs

# Phase 38 carry-forwards (must stay green)
node --test test/phase-38-w10-ws-frame-fragmentation.test.mjs
python3 -m pytest test/live-e2e/test_phase38_w11_align_off_overlay_disappears.py test/live-e2e/test_phase38_w12_invalidate_cache.py -v

# UI smoke
python3 -m pytest test/live-e2e/test_phase38_ssr_grid_state_cdp.py -v
```

All exit codes 0. The cold-boot test stdout MUST show `reconnectingEvents=0` or `=1` (the RED test asserted `< 2`).
</verification>

<success_criteria>
- ConnectionState.INITIAL_CONNECT enum entry exists; LEGAL_TRANSITIONS routes NEW → INITIAL_CONNECT only (CONNECTING removed from NEW's set)
- INITIAL_CONNECT_GRACE_MS = 5000, env-configurable via RECEIVER_INITIAL_CONNECT_GRACE_MS and window.__TT_BEAMER_INITIAL_CONNECT_GRACE_MS
- tryConnect() routes first call through INITIAL_CONNECT, subsequent through CONNECTING
- handleConnectFailure() helper centralizes failure routing; silent retry during grace; escalates to RECONNECTING after
- shouldGiveUp() does not count INITIAL_CONNECT attempts
- receiver-status-ui.js renders the existing CONNECTING splash for INITIAL_CONNECT — no RECONNECTING banner during grace
- D-02 cold-boot test PASSES with <2 RECONNECTING events in 30s
- All Phase 32/33/38 carry-forward rails GREEN (D-08 connection-stability fail=0, W10 WS-fragmentation, W11/W12 align-off + cache-invalidate, ssr-grid-state CDP)
</success_criteria>

<output>
After completion, create `.planning/phases/phase-39/39-3-SUMMARY.md` containing:
- Diff stats per file (LOC added/removed)
- The cold-boot test result: pre-fix `reconnectingEvents=` vs post-fix
- A short timeline of state transitions in a typical successful cold boot (NEW → INITIAL_CONNECT → ... → CONNECTED) extracted from test logs
- All carry-forward test results
- Confirm Plan 39-1 RED tests for D-02 are now GREEN
</output>
