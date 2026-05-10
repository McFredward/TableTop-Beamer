---
phase: 35-thin-output-refactor-align-banding
plan: B
subsystem: live-sync
tags: [live-sync, websocket, output, thin-receiver, refactor, subscription-primitive]

# Dependency graph
requires:
  - phase: 35
    plan: W0
    provides: "test/phase-35-output-live-sync.test.mjs RED rail (D-02-B1+B2); /output/ live-E2E smoke test (D-05 a-d) baseline-GREEN; D-06 hard gate baseline 85/84/0/1"
provides:
  - "src/app/runtime/output-receiver/output-live-sync.js — NEW thin live-sync subscriber (211 LOC) modeled on output-audio-binder.js's WS reconnect pattern. Exports bootOutputLiveSync({logger, role, url}) returning the 13-method subscription contract."
  - "Refactored output-audio-binder.js (160 → 118 LOC, -42 net) — drops own WS plumbing; consumes shared subscription via 7 callback registrars."
  - "Refactored receiver-bootstrap.js — bootReceiver({logger, liveSync}) accepts shared subscription; inline 1Hz /api/live/snapshot poll loop REPLACED with onAlignModeChange + onProjectionProfileChange subscriptions when liveSync provided. Legacy fallback poll preserved for callers that omit liveSync."
  - "Refactored output.html — single window.__ttbLiveSync subscription is shared across receiver-bootstrap + audio-binder (one WS to /api/live/ws?role=final-output instead of two)."
  - "13-method subscription contract LOCKED for downstream Track A bootAlignMode consumption."
affects: [35-A-PLAN, 35-C-PLAN, 35-V-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared single-instance live-sync subscription via window.__ttbLiveSync (matches Phase 31+ window.TT_BEAMER_* convention)."
    - "Subscription primitive = handler-set + on(event) closure returning unsubscribe function. Pattern is reusable for future thin-consumer modules (Track A bootAlignMode will consume the same primitive)."
    - "Cold-start fallback: 1Hz HTTP poll of /api/live/snapshot until WS live-hello arrives; replaces the inline poll loop receiver-bootstrap.js used to run."

key-files:
  created:
    - "src/app/runtime/output-receiver/output-live-sync.js (211 LOC)"
    - ".planning/phases/phase-35/deferred-items.md (14 LOC — log of out-of-scope discoveries)"
  modified:
    - "src/app/runtime/output-receiver/output-audio-binder.js (160 → 118 LOC, -42 net)"
    - "src/app/runtime/output-receiver/receiver-bootstrap.js (+42 LOC, refactored alignMode/projectionProfile mirror block + stop() teardown)"
    - "output.html (added bootOutputLiveSync <script type='module'> + threaded liveSync arg through bootReceiver + bootOutputAudioBinder)"

key-decisions:
  - "Built NEW output-live-sync.js module rather than extracting from runtime-live-sync-core.js, per RESEARCH §B.1 — the dashboard core's ~30 ctx callbacks (playSoundForAnimation, persistGridState, applyTransform, etc.) make extraction unsafe. Parallel module modeled on output-audio-binder.js was the proven-low-risk path."
  - "13-method subscription shape locked verbatim per RESEARCH §B.2: 7 callback registrars (each returning unsubscribe), 3 getters, stop(). Track A's bootAlignMode will consume the SAME shape for alignMode + projection-profile state tracking."
  - "Single shared subscription per page via window.__ttbLiveSync — avoids opening 2 WS connections (one per consumer). Output.html boot order: live-sync → receiver → audio-binder. Receiver and audio-binder accept liveSync as optional arg with legacy fallbacks preserved."
  - "Receiver-bootstrap preserves legacy inline poll fallback when liveSync omitted — callers pre-Phase-35 keep working unchanged."
  - "Wave-4 4-corner hit-test approximation in receiver-bootstrap.js KEPT untouched — Track A's bootAlignMode replaces it later. Track B is strictly the live-sync subscription extraction; alignMode UI is Track A scope."

requirements-completed: [D-02, D-06]

# Metrics
duration: 12min 3s
completed: 2026-05-10
---

# Phase 35 Plan B: Track B — Live-Sync Minimal Subset Extract Summary

**Thin /output/ now consumes a shared 13-method live-sync subscription primitive — phase-35-output-live-sync test rail RED→GREEN, D-06 connection-stability baseline preserved, /output/ D-05 a-d still PASS.**

## Performance

- **Duration:** ~12 min 3 s
- **Started:** 2026-05-10T11:35:37Z
- **Completed:** 2026-05-10T11:47:40Z
- **Tasks:** 4/4
- **Files created:** 2 (output-live-sync.js, deferred-items.md)
- **Files modified:** 3 (output-audio-binder.js, receiver-bootstrap.js, output.html)

## Accomplishments

- **`src/app/runtime/output-receiver/output-live-sync.js` shipped (211 LOC)** — NEW thin live-sync subscriber, parallel to runtime-live-sync-core.js (NOT an extraction per RESEARCH §B.1). Exports `bootOutputLiveSync({logger, role, url})` returning the 13-method subscription. Behaviour: WS to `/api/live/ws?role=final-output` with [500,1000,2000,5000,10000,30000]ms exponential backoff (T-35-B-01 mitigation), parses `live-hello` + `live-session-update` (context-update / start-animation / stop-animation / clear-all mutationTypes), 1Hz `/api/live/snapshot` cold-start fallback, malformed-envelope silent-drop (T-35-B-03 mitigation).
- **`output-audio-binder.js` refactored (-42 LOC)** — drops own WS plumbing; consumes shared subscription via `onAnimationStart` / `onAnimationStop` / `onClearAll`. `new WebSocket(` count = 0 in this file. All audio-side logic (voice pool, sound playback) UNCHANGED.
- **`receiver-bootstrap.js` refactored** — `bootReceiver({logger, liveSync})` now accepts an optional shared subscription. When provided, the inline 1Hz `/api/live/snapshot` poll loop (was lines 968-987) is REPLACED with `onAlignModeChange` + `onProjectionProfileChange` subscriptions for the overlay pointer-events toggle. `attachInputForwarder` closures read getters via `liveSync.getAlignMode()` + `liveSync.getActiveProjectionProfileId()`. Legacy fallback poll preserved for callers that omit liveSync.
- **`output.html` refactored** — new `<script type="module">` boots `bootOutputLiveSync` FIRST and exposes it as `window.__ttbLiveSync`; both `bootReceiver` and `bootOutputAudioBinder` consume it. Single WS per page. Total script tags: 5 (was 4) — under the ≤8 ceiling.
- **D-02-B1 + D-02-B2 RED → GREEN** — `node --test test/phase-35-output-live-sync.test.mjs` reports 3/3 pass.
- **D-06 hard gate UNCHANGED** — `RUN_LIVE_TESTS=1 node --test test/connection-stability/*.test.mjs` reports 85/84/0/1 (actual master baseline; `fail=0` invariant upheld).
- **D-05 a-d on /output/ PASS** — `test_ready_state`, `test_current_time`, `test_bg_color`, `test_server_log_clean` all GREEN in 58.43s.
- **Phase 35 may now proceed to 35-A-PLAN.** Track A's `bootAlignMode` can consume `bootOutputLiveSync`'s 13-method subscription unchanged.

## Task Commits

Each task committed atomically:

1. **Task 1: feat(35-B): output-live-sync.js** — `4124749`
2. **Task 2: refactor(35-B): output-audio-binder consumes bootOutputLiveSync** — `5c3c39f`
3. **Task 3: refactor(35-B): receiver-bootstrap + output.html consume shared liveSync** — `89f7845`
4. **Task 4: chore(35-B): verification — D-05 a-d PASS, D-06 PASS, dashboard test deferred** — `76b8e1e`

## Files Created/Modified

### Created (2)
- `src/app/runtime/output-receiver/output-live-sync.js` (211 LOC) — thin live-sync subscriber. Exports `bootOutputLiveSync({logger, role, url})` returning `{ onAnimationStart, onAnimationStop, onClearAll, onAlignModeChange, onProjectionProfileChange, onConnect, onDisconnect, getAlignMode, getActiveProjectionProfileId, getCurrentClientId, stop }`. Handler-set + on(event) closure pattern; each callback registrar returns its own unsubscribe function. Backoff array `[500,1000,2000,5000,10000,30000]`. Reconciliation reads `snap.alignMode` (boolean) and `snap.runtime.activeProjectionProfileId ?? snap.selectedBoard.lastUsedProfileName ?? snap.selectedBoard ?? null`.
- `.planning/phases/phase-35/deferred-items.md` (14 LOC) — log of out-of-scope discoveries (the W0 dashboard regression test's pre-existing `/api/live/mutate` 405 bug).

### Modified (3)
- `src/app/runtime/output-receiver/output-audio-binder.js` (160 → 118 LOC, -42 LOC) — added `import { bootOutputLiveSync } from "./output-live-sync.js"`; `bootOutputAudioBinder({logger, liveSync})` now accepts optional shared subscription; subscribes to 3 callbacks (`onAnimationStart`, `onAnimationStop`, `onClearAll`) and calls existing `handleStartAnimation` / `handleStopAnimation` / `handleClearAll` helpers. Drops `RECONNECT_BACKOFF_MS` array (now lives in output-live-sync.js), `connect()`, `scheduleReconnect()`, all WS event handlers — all WS plumbing extracted.
- `src/app/runtime/output-receiver/receiver-bootstrap.js` — `bootReceiver({logger, liveSync = null})` signature updated; inline `setInterval(snapshotInterval, 1000)` block (was lines 968-987) REPLACED with branching: when `liveSync` provided → call `liveSync.onAlignModeChange(...)` + `liveSync.onProjectionProfileChange(...)` for state mirror + overlay pointer-events toggle; when omitted → legacy poll preserved. `attachInputForwarder` closures read `liveSync.getAlignMode()` + `liveSync.getActiveProjectionProfileId()` when available, else local mirror. `stop()` teardown calls `offAlignModeChange()` + `offProjectionProfileChange()`. The Wave-4 4-corner hit-test KEPT (Track A's bootAlignMode replaces it later).
- `output.html` (107 → 117 LOC) — added new `<script type="module">` block (lines ~92-95) booting `bootOutputLiveSync` FIRST and exposing it as `window.__ttbLiveSync`. Updated existing `bootReceiver` + `bootOutputAudioBinder` calls to thread `liveSync: window.__ttbLiveSync`. Boot-order comment block updated. Script-tag count: 5 (under ≤8 ceiling).

## D-02-B1 + D-02-B2 Test Transition (RED → GREEN)

```
Before Task 1 (master pre-Track-B):
$ node --test test/phase-35-output-live-sync.test.mjs
✖ D-02-B1: bootOutputLiveSync is exported from output-live-sync.js
  ERR_MODULE_NOT_FOUND
✖ D-02-B1: subscription has 7 callback registrars + 3 getters + stop
  ERR_MODULE_NOT_FOUND
✖ D-02-B2: output-audio-binder.js imports + uses bootOutputLiveSync
  AssertionError [ERR_ASSERTION]: audio-binder must import bootOutputLiveSync
ℹ tests 3 / pass 0 / fail 3

After Task 2 (bootOutputLiveSync + audio-binder refactor):
$ node --test test/phase-35-output-live-sync.test.mjs
✔ D-02-B1: bootOutputLiveSync is exported from output-live-sync.js
✔ D-02-B1: subscription has 7 callback registrars + 3 getters + stop
✔ D-02-B2: output-audio-binder.js imports + uses bootOutputLiveSync
ℹ tests 3 / pass 3 / fail 0
```

## D-06 Hard-Gate Result

```
$ RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs'
ℹ tests 85
ℹ pass 84
ℹ fail 0
ℹ skipped 1   (1-hour steady-state — set RUN_LONG_TESTS=1 to run)
ℹ duration_ms 98458.208248
```

**ZERO-FAILURE invariant preserved.** Plan-level docs reference a stale `72/0/13` count; per Wave-0 SUMMARY the actual master baseline is `85/84/0/1` and the only invariant that matters is `fail=0`. Track B's receiver-bootstrap.js refactor preserves it exactly. The 1 skip is the 1-hour steady-state test (always skipped without `RUN_LONG_TESTS=1`).

## D-05 a-d Live-E2E Result

```
$ python3 -m pytest test/live-e2e/test_phase35_alignmode_smoke.py::test_ready_state \
    test/live-e2e/test_phase35_alignmode_smoke.py::test_current_time \
    test/live-e2e/test_phase35_alignmode_smoke.py::test_bg_color \
    test/live-e2e/test_phase35_alignmode_smoke.py::test_server_log_clean -v
test_ready_state           PASSED
test_current_time          PASSED
test_bg_color              PASSED
test_server_log_clean      PASSED
============================== 4 passed in 58.43s ==============================
```

`/output/` thin path still delivers H264 video with `videoReadyState === 4` within 10s, `videoCurrentTime > 5` after 8s, `body { background-color: rgb(0,0,0) }`, and zero `health ping failed` entries in server log. Refactor preserved /output/ behaviour exactly.

## Full JS Suite Result

```
$ node --test "test/**/*.test.mjs"
ℹ tests 393 / pass 370 / fail 6 / skipped 17
```

The 6 failures are the documented RED rails:
- D-01-A1 (2 tests): `bootAlignMode` shape — Track A not landed yet, RED is expected
- D-03-C1 (4 tests): Bayer-dither — Track C not landed yet, RED is expected

Phase-35-output-live-sync (D-02-B1+B2, 3 tests): **GREEN**. Track B test rail RED→GREEN transition complete.

## Decisions Made

- **NEW module, not extraction:** Per RESEARCH §B.1 the dashboard's runtime-live-sync-core.js is entangled with ~30 dashboard ctx callbacks. Pulling the subscription primitive out cleanly would require breaking those closures — multi-day refactor, high regression risk. Instead, model a thin parallel module on output-audio-binder.js (proven WS reconnect pattern from Phase 34). Result: 211 LOC focused module, zero dashboard regression risk.
- **13-method subscription contract verbatim:** 7 callback registrars + 3 getters + stop, exactly per RESEARCH §B.2. Track A's `bootAlignMode` will consume the SAME shape for alignMode + projection-profile state.
- **Single shared subscription via `window.__ttbLiveSync`:** the page opens ONE WS to `/api/live/ws?role=final-output` instead of two. Pattern matches existing `window.TT_BEAMER_*` global convention.
- **Backwards-compatible signatures:** Both `bootReceiver` and `bootOutputAudioBinder` accept `liveSync` as an OPTIONAL arg; pre-Phase-35 callers (none in production today, but tests / future scripts) keep working with the legacy inline poll fallback.
- **Wave-4 4-corner hit-test PRESERVED in receiver-bootstrap.js:** Track A's `bootAlignMode` replaces it. Track B is strictly the live-sync extraction; the alignMode UI is Track A scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test bug] Updated D-06 expected count documentation in commit messages**
- **Found during:** Task 3 verification
- **Issue:** Plan documented `72/0/13` as the connection-stability baseline; actual master baseline is `85/84/0/1` (the suite has grown organically; Wave-0 SUMMARY already documented this).
- **Fix:** Used the actual baseline (`85/84/0/1`) in commit messages and this SUMMARY. The HARD-GATE INVARIANT is `fail=0`, which is preserved exactly. No code changes needed.
- **Files modified:** none (just commit-message documentation accuracy)
- **Verification:** `RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs'` → `pass 84, fail 0, skipped 1`. Hard-gate invariant upheld.
- **Committed in:** `89f7845` (Task 3 commit message)

### Out-of-Scope Discoveries (Deferred)

**1. W0 dashboard regression test uses non-existent `/api/live/mutate` route**
- **Found during:** Task 4 (live-E2E regression check)
- **Test:** `test/live-e2e/test_phase35_dashboard_alignmode.py::test_dashboard_alignmode_handles`
- **Failure:** HTTP 405 on POST to `/api/live/mutate`. server.mjs has `/api/live/command` (POST) + `/api/live/snapshot` (GET) but NOT `/api/live/mutate`.
- **Confirmed pre-existing:** verified by checking out pre-Track-B code (commit `0154b96`) — same 405 failure. Track B did not introduce this; the W0 test was authored against a non-existent endpoint and never actually passed.
- **Scope decision:** Out of scope for Track B. The endpoint is server-side routing, unrelated to live-sync extraction. Logged in `.planning/phases/phase-35/deferred-items.md` for resolution in a follow-up plan (likely 35-A or a Wave-0 followup).
- **Impact on Track B:** Zero. Track B preserved all REAL must-stay-green canaries: D-05 a-d on /output/ (PASS) + D-06 connection-stability (85/84/0/1 unchanged).
- **Committed in:** `76b8e1e` (Task 4)

---

**Total deviations:** 1 documentation accuracy fix (D-06 baseline numbers); 1 out-of-scope discovery (deferred). **Impact on plan:** zero scope change, zero unintended code impact.

## Issues Encountered

- The dashboard regression test (D-01-A2 canary) was authored in Wave-0 against a non-existent server route. This is not Track B's concern but worth flagging: the canary cannot actually catch dashboard regressions until its endpoint mismatch is fixed.
- Output of `node --test "test/**/*.test.mjs"` showed `369 pass / 7 fail` on one run and `370 pass / 6 fail` on the next — the 7th "fail" is a parsing artifact from the trailing `✖ failing tests:` header line; `ℹ fail` numerator confirms 6 actual failing tests on every run.

## Known Stubs

None. Track B is a pure extraction + wiring refactor; all code paths flow real subscription state from the live-sync WS through the new shared primitive into receiver-bootstrap + audio-binder. The Wave-4 4-corner hit-test in receiver-bootstrap.js is intentionally preserved as a fallback (Track A's bootAlignMode replaces it).

## Threat Flags

None. Track B introduces no new trust boundaries beyond what 35-B-PLAN.md `<threat_model>` already enumerated:
- T-35-B-01 (DoS reconnect storm): mitigated by exponential backoff [500,1000,2000,5000,10000,30000]ms.
- T-35-B-02 (snapshot replay): accepted — same payload as Phase 13's existing /api/live/snapshot; no new exposure.
- T-35-B-03 (malformed JSON envelope): mitigated by `try { JSON.parse } catch { /* skip */ }` in dispatch.
- T-35-B-04 (dashboard race): accepted — dashboard URL `/` does not load output.html.
- T-35-B-05 (no telemetry on connect/disconnect): mitigated — `logger.warn` wired in error paths, `logger.log` for WS open/close.

## Next Phase Readiness

- **35-B-PLAN: COMPLETE.** All 4 tasks executed; all `must_haves.truths` and `success_criteria` met (modulo the documented baseline-number discrepancy and the out-of-scope deferred dashboard test).
- **35-A-PLAN may proceed.** Track A's `bootAlignMode` can consume `bootOutputLiveSync`'s 13-method subscription unchanged. The shared `window.__ttbLiveSync` instance is already exposed on output.html and ready for `bootAlignMode` to subscribe to `onAlignModeChange` + `onProjectionProfileChange` for handle-visibility gating.
- **35-C-PLAN remains independent.** Track C (banding fix) is fully orthogonal to live-sync; lands when Track A is done or in parallel with it.
- **D-06 connection-stability** is the standing hard gate — re-verified at Task 3 + Task 4, leaves it at `fail=0`.

## Self-Check: PASSED

Verified existence of all created files:
- FOUND: src/app/runtime/output-receiver/output-live-sync.js
- FOUND: .planning/phases/phase-35/deferred-items.md

Verified all 4 task commits exist in git log:
- FOUND: 4124749 (Task 1 — feat: output-live-sync.js)
- FOUND: 5c3c39f (Task 2 — refactor: audio-binder consumes liveSync)
- FOUND: 89f7845 (Task 3 — refactor: receiver-bootstrap + output.html)
- FOUND: 76b8e1e (Task 4 — chore: verification + deferred-items log)

---
*Phase: 35-thin-output-refactor-align-banding · Plan: B · Wave: 1 (Track B — Live-Sync Minimal Subset Extract)*
*Completed: 2026-05-10*
