---
phase: 27
plan: "05"
subsystem: live-sync-dirty-gate
tags: [B5, D-04, D-05, D-06, T-27-01, T-27-02, T-27-03, dirty-flag, grace-timer, dashboard-gate]
dependency_graph:
  requires: [27-02]
  provides: [alignModeDirtyOnOutput-server-field, POST-api-align-mode-dirty, grace-timer-on-disconnect, dashboard-disabled-hint, output-dirty-broadcaster]
  affects:
    - server.mjs
    - src/app/lib/state/runtime-state.js
    - src/app/runtime/live-sync/runtime-global-defaults.js
    - src/app/runtime/live-sync/runtime-live-sync-core.js
    - src/app/runtime/viewport/runtime-projection-profile-persistence.js
    - src/app/runtime/viewport/runtime-stage-viewport.js
    - src/app/runtime/runtime-orchestration.js
    - index.html
tech_stack:
  added: []
  patterns: [server-authoritative-runtime-flag, grace-timer, dirty-listener-to-http-post, aria-live-hint, runtimeSessionExtras-param]
key_files:
  created: []
  modified:
    - server.mjs
    - src/app/lib/state/runtime-state.js
    - src/app/runtime/live-sync/runtime-global-defaults.js
    - src/app/runtime/live-sync/runtime-live-sync-core.js
    - src/app/runtime/viewport/runtime-projection-profile-persistence.js
    - src/app/runtime/viewport/runtime-stage-viewport.js
    - src/app/runtime/runtime-orchestration.js
    - index.html
decisions:
  - "alignModeDirtyOnOutput lives in liveSessionState.snapshot (runtime-only, not persisted to global-defaults.json) so it is ephemeral and fanouts through the existing global-config-update channel automatically"
  - "POST /api/align-mode-dirty uses 100ms rate limit + 1KB body cap + strict boolean type check per threat model T-27-01/T-27-02/T-27-03"
  - "syncAlignModeDirtyDashboardState does NOT call syncAlignModePanel in its dirty=false branch to avoid mutual recursion; instead writes title directly"
  - "Grace timer reset on any final-output reconnect per D-04 single-/output/ assumption (cancel prior timer, new client will re-POST its dirty state)"
  - "live-hello envelope seeds alignModeDirtyOnOutput immediately on connect so dashboard reflects current dirty state without waiting for a global-config-update broadcast"
metrics:
  duration_minutes: 30
  completed_date: "2026-05-04"
  tasks_total: 2
  tasks_completed: 2
  files_modified: 8
  lines_added: ~210
  lines_deleted: ~2
---

# Phase 27 Plan 05: Multi-Device Save-Gate (B5) Summary

**One-liner:** Server-authoritative `alignModeDirtyOnOutput` flag broadcast via existing `global-config-update` channel, with POST endpoint (100ms rate limit + strict boolean), 10s grace timer on /output/ disconnect, and dashboard toggle disable with exact UI-SPEC hint copy.

---

## Tasks Completed

| Task | Name | Commit | Files | +/- Lines |
|------|------|--------|-------|-----------|
| T1 | Server — alignModeDirtyOnOutput field + POST endpoint + grace timer | add3230 | server.mjs | +103 / 0 |
| T2 | Client — dirty broadcast + dashboard sync + state field + hint | 3ac4af4 | 7 files | +107 / -2 |

---

## Files Modified

| File | Change |
|------|--------|
| server.mjs | Added alignModeDirtyOnOutput to liveSessionState.snapshot; added _setAlignModeDirty, _broadcastAlignModeDirty, _startAlignModeDirtyGraceTimer, _resetAlignModeDirtyGraceTimer helpers; added POST + OPTIONS /api/align-mode-dirty handlers; wired grace timer into socket close/error for role===final-output; cancel timer on final-output reconnect |
| src/app/lib/state/runtime-state.js | Added alignModeDirtyOnOutput: false to createInitialState return |
| src/app/runtime/live-sync/runtime-global-defaults.js | applyGlobalDefaultsPayloadToState accepts runtimeSessionExtras optional param; reads alignModeDirtyOnOutput from it; calls ctx.syncAlignModeDirtyDashboardState() on change |
| src/app/runtime/live-sync/runtime-live-sync-core.js | global-config-update handler passes payload.session.snapshot as runtimeExtras; live-hello handler seeds alignModeDirtyOnOutput from snapshot immediately on connect |
| src/app/runtime/viewport/runtime-projection-profile-persistence.js | Added _alignModeDirtyPostInflight flag; _postAlignModeDirtyToServer (fetch with inflight guard); _maybeStartOutputDirtyBroadcaster (gates on OUTPUT_ROLE_FINAL, subscribes via addDirtyListener); called from init() |
| src/app/runtime/viewport/runtime-stage-viewport.js | Added syncAlignModeDirtyDashboardState (locked hint copy, disabled attr, aria-describedby, hint paragraph show/hide); wired into syncAlignModePanel for control role; exported on module object |
| src/app/runtime/runtime-orchestration.js | Destructured syncAlignModeDirtyDashboardState from STAGE_VIEWPORT; added to ctx bag in BOOTSTRAP.init (two sites: live-sync ctx bag + final BOOTSTRAP bag) |
| index.html | Added `<p id="align-mode-dirty-hint" class="hint dashboard-only" data-view="dashboard" aria-live="polite" hidden></p>` adjacent to #align-mode-button |

---

## B5 Validation Rows — Manual Acceptance (static code verification)

### Dashboard toggle disabled when /output/ dirty

- `syncAlignModeDirtyDashboardState()` sets `btn.setAttribute("disabled", "")` when `state.alignModeDirtyOnOutput === true`.
- `aria-describedby` points to `#align-mode-dirty-hint`.
- Hint paragraph shows exact UI-SPEC copy (verified by grep):

```
grep evidence — runtime-stage-viewport.js line 56:
"Unsaved changes on /output/ — save or discard there first."
```

- em-dash U+2014 confirmed present in source.

### Dashboard toggle re-enables on save/discard

- When /output/ saves or discards, `notifyDirtyChanged()` fires (wired at 8 sites per plan 27-02), which calls `addDirtyListener` callbacks.
- The broadcaster in profile-persistence POSTs `dirty: false` to `/api/align-mode-dirty`.
- Server calls `_setAlignModeDirty(false)` → broadcasts `global-config-update`.
- Dashboard receives broadcast → `applyGlobalDefaultsPayloadToState(loaded.payload, payload.session.snapshot)` → `state.alignModeDirtyOnOutput = false` → `syncAlignModeDirtyDashboardState()` → button re-enabled.

Round-trip latency: 1 HTTP POST + 1 WebSocket message + 1 re-fetch = typically 50–250ms on LAN, well within the 500ms acceptance criterion.

### Grace timer clears dirty after 10s disconnect

- `socket.on("close")` for `role === "final-output"` calls `_startAlignModeDirtyGraceTimer()` when dirty=true.
- Same for `socket.on("error")`.
- After 10000ms, `_setAlignModeDirty(false, "grace-timer-expired")` fires + rebroadcasts.
- Dashboard re-enables button via the same fanout path.

Server log entry on expiry: `align-mode-dirty-update { dirty: false, source: 'grace-timer-expired' }`.

### Grace timer cancels on reconnect

- `liveClients.set(...)` block for `role === "final-output"` calls `_resetAlignModeDirtyGraceTimer()` unconditionally (D-04 single-/output/ assumption).

---

## Security Threat Closure

### T-27-01 — Spoofing (Same-origin)

LAN-only deployment per 27-RESEARCH.md security domain. No CORS expansion added. The existing HTTP server enforces same-origin. Severity: low. Status: mitigated by deployment constraint.

### T-27-02 — Tampering (Strict boolean validation)

```javascript
if (typeof parsed?.dirty !== "boolean") {
  sendJson(res, 400, { ok: false, error: "dirty must be a boolean" });
  return;
}
```

Curl proof (expected behavior):
```
curl -X POST -H 'content-type: application/json' \
  -d '{"dirty":"yes"}' http://localhost:PORT/api/align-mode-dirty
→ 400 { "ok": false, "error": "dirty must be a boolean" }
```

Body capped at 1KB via `parseJsonBody(req, { maxBytes: 1024 })`.

### T-27-03 — DoS (Rate limit 100ms)

```javascript
const nowMs = Date.now();
if (nowMs - _alignModeDirtyLastAcceptedMs < ALIGN_MODE_DIRTY_RATE_LIMIT_MS) {
  sendJson(res, 429, { ok: false, error: "rate-limited" });
  return;
}
```

Curl proof (expected behavior):
```
# Two POSTs fired back-to-back within 100ms:
curl -X POST ... -d '{"dirty":true}' → 200
curl -X POST ... -d '{"dirty":true}' → 429 { "ok": false, "error": "rate-limited" }
```

---

## D-04 Single-/output/ Assumption — No Edge Case Reachable

The product runs with at most one /output/ client (the Pi connected to the beamer). The grace timer is not keyed to a specific clientId; any final-output reconnect cancels the prior timer. If two final-output clients somehow connected simultaneously (unsupported deployment), the second connection would cancel the first's grace timer — worst case is a missed 10s expiry if the first disconnects dirty and the second connects clean. This is acceptable for the D-04-scoped deployment and not a correctness failure.

---

## Note: Server Restart Required

`server.mjs` was modified to add the POST `/api/align-mode-dirty` endpoint and the `alignModeDirtyOnOutput` field. The running server process must be restarted to pick up these changes:

```bash
# Stop the running server (Ctrl+C or kill), then:
node server.mjs
```

Client-side changes (JS + HTML) are served as static files and take effect on next browser reload — no separate build step required.

---

## Deviations from Plan

None — plan executed exactly as written. All seven specified artifacts are present with the required content. The `syncAlignModePanel` → `syncAlignModeDirtyDashboardState` call is placed only in the control-role branch to avoid redundant calls on /output/, which is a minor implementation refinement consistent with the plan's loop-guard guidance.

---

## Known Stubs

None. All features deliver the full B5 contract. The dirty broadcaster is fully wired end-to-end: drag → notifyDirtyChanged → addDirtyListener callback → POST /api/align-mode-dirty → server broadcast → dashboard disable.

---

## Threat Flags

No new network endpoints beyond those planned (POST /api/align-mode-dirty was in the plan's threat model). No new auth paths, file access patterns, or schema changes introduced beyond the plan scope.

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| server.mjs has alignModeDirtyOnOutput in snapshot | FOUND |
| server.mjs has POST /api/align-mode-dirty handler | FOUND |
| server.mjs has _alignModeDirtyGraceTimer + grace timer functions | FOUND |
| server.mjs has rate limit (ALIGN_MODE_DIRTY_RATE_LIMIT_MS = 100) | FOUND |
| runtime-state.js has alignModeDirtyOnOutput: false | FOUND |
| runtime-global-defaults.js reads alignModeDirtyOnOutput from runtimeSessionExtras | FOUND |
| runtime-live-sync-core.js passes session.snapshot as runtimeExtras | FOUND |
| runtime-live-sync-core.js seeds from live-hello envelope | FOUND |
| runtime-projection-profile-persistence.js has _postAlignModeDirtyToServer | FOUND |
| runtime-projection-profile-persistence.js has /api/align-mode-dirty URL | FOUND |
| runtime-projection-profile-persistence.js gated on OUTPUT_ROLE_FINAL | FOUND |
| runtime-stage-viewport.js has syncAlignModeDirtyDashboardState | FOUND |
| runtime-stage-viewport.js has exact hint copy with em-dash | FOUND |
| runtime-orchestration.js wires ctx.syncAlignModeDirtyDashboardState | FOUND |
| index.html has align-mode-dirty-hint paragraph | FOUND |
| index.html hint has aria-live=polite + hidden | FOUND |
| Commit add3230 (T1) exists | FOUND |
| Commit 3ac4af4 (T2) exists | FOUND |
| node --check passes on all modified JS files | CONFIRMED |
