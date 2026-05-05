---
phase: 30
plan: 01
subsystem: live-sync
tags: [diagnostic-overlay, live-sync, websocket-broadcast, output-role, ctx-builder, render-stability]

# Dependency graph
requires:
  - phase: 28
    provides: "B6 — `runtimeFlags.diagnosticOverlay` field in global-defaults.json + `applyGlobalDefaultsPayloadToState` apply-path; cross-client live-sync wiring."
  - phase: 26
    provides: "h9 — Phase 26 baseline: `precision highp float`, `_gl.NEAREST`, ImageDecoder fallback (preserved invariants)."
provides:
  - "Diagnostic overlay chip on Pi /output/ that reflects persisted `state.diagnosticOverlay` at boot AND propagates within ≤200ms when toggled from any dashboard."
  - "Boot-time force-apply of persisted `diagnosticOverlay` field on /output/ (h1 — defensive late-bootstrap call)."
  - "`#output-status-chip` reparented to `<body>` direct child on final-output role (CASE E) so its `position:fixed` styles apply from a renderable subtree."
  - "Explicit `syncDiagnosticOverlayPanel()` invocation on /output/-role broadcast apply-branch (CASE D — closes the `syncRuntimePanelsFromState` /output/ skip-gate at runtime-live-sync-core.js:426)."
  - "Bootstrap ctx-builder now exposes `syncDiagnosticOverlayPanel` and `syncRenderModePanel` (h2 — closed silent-no-op gap where ctx.syncDiagnosticOverlayPanel?.() was undefined at bootstrap-time)."
affects: [phase-30 plan 30-02 (B1 seams discrimination — needs `mode` chip readout on Pi /output/), phase-30 plan 30-03 (B2 Pi GIF reliability — diagnostic readout aids reproduction observability)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Role-aware DOM reparenting in orchestration init: nodes whose CSS visibility depends on `position: fixed` from `<body>` must not live inside an ancestor with `display: none !important` on the active output role."
    - "Bootstrap ctx-builder MUST destructure + return every fn referenced via `ctx.X?.()` in the boot sequence; missing entries silently no-op rather than throw."
    - "Defensive boot-time force-apply of persisted live-sync flags at end of `_initApplicationConnectAndSync()` to bridge first-frame-vs-broadcast race on /output/."

key-files:
  created: []
  modified:
    - "src/app/runtime/runtime-orchestration.js — CASE D ctx-binding for syncDiagnosticOverlayPanel + CASE E `#output-status-chip` reparent to `document.body` on final-output role."
    - "src/app/runtime/live-sync/runtime-live-sync-core.js — CASE D apply-branch invocation: `ctx.syncDiagnosticOverlayPanel?.()` after `applyGlobalDefaultsPayloadToState` on /output/."
    - "src/app/runtime/core/runtime-bootstrap.js — h1 boot-time force-apply of persisted diagnosticOverlay at end of `_initApplicationConnectAndSync()`."
    - "src/app/runtime/runtime-orchestration-ctx-builder.js — h2 ctx-builder fix: added `syncDiagnosticOverlayPanel` + `syncRenderModePanel` to destructure + return literal."

key-decisions:
  - "Skipped Task 2 (probe-trace UAT) inline — but the probes WERE deployed (Task 1 commit 4db79b6) and the user observed the trace; CASE D was selected based on the user-reported trace dump (probe trace showed hop3 and hop5a fired but hop5c never fired on /output/, pointing at the syncRuntimePanelsFromState skip-gate at runtime-live-sync-core.js:426)."
  - "Selected CASE D from PLAN Task 3 cases (broken hop 5c — syncDiagnosticOverlayPanel not called on /output/), with structural extension CASE E (chip-reparent) because the broadcast-apply branch fixed the dataset write but the chip was still inside `display:none` ancestor."
  - "Added two hotfixes after CASE D + E shipped: h1 (boot force-apply for reload-time chip state) and h2 (ctx-builder exposes the panel fns — without it h1 silently no-op'd because bootstrap ctx didn't carry them)."
  - "All 5 [B3-probe] console.log statements removed in Task 5 (commit 5e231fa) — production code carries no leftover console.log noise per Plan 30-01 must-have."

patterns-established:
  - "Pattern: role-aware reparenting at orchestration init — see CASE E in runtime-orchestration.js. Future fixed-position diagnostic overlays on /output/ should use this approach."
  - "Pattern: bootstrap ctx-builder must mirror every panel-sync fn referenced in late-boot or live-sync — h2 documents the silent-no-op failure mode."

requirements-completed: [B3]

# Metrics
duration: ~3h (multi-session: Task 1 probes + UAT + Task 3 CASE D + CASE E ext + Task 5 cleanup + h1 + h2 — final UAT 2026-05-05)
completed: 2026-05-05
---

# Phase 30 Plan 01: Diagnostic Overlay Live-Sync to /output/ Summary

**Diagnostic overlay chip live-syncs to Pi /output/ within ≤200ms via WS-broadcast; chip reflects persisted state on reload; render-mode chip-readout active for downstream B1 seam discrimination.**

## Performance

- **Duration:** Multi-session (Task 1 probe deploy → UAT → Task 3 CASE D → CASE E extension → Task 5 cleanup → h1 → h2 final UAT)
- **Completed:** 2026-05-05
- **Tasks:** 6 (4 from PLAN tasks 1, 3, 5, 6 + 2 hotfixes h1, h2; Task 2 + Task 4 + Task 6 are checkpoint:human-verify gates resolved by user PASS)
- **Commits:** 6 production commits
- **Files modified:** 4 source files

## Accomplishments

- **CASE D** — Closed the `syncRuntimePanelsFromState` /output/ skip-gate at `runtime-live-sync-core.js:426`. The original gate suppressed panel-sync on final-output role inside `applyLiveRuntimeSnapshot`, leaving /output/ with stale DOM dataset despite correct `state.diagnosticOverlay`. Fix: explicit `ctx.syncDiagnosticOverlayPanel?.()` in the broadcast apply-branch.
- **CASE E (structural)** — `#output-status-chip` was rendered inside `<aside id="control-panel">` which carries `display:none !important` on /output/ (the panel is dashboard-only). Even with `body[data-diagnostic-overlay="true"]` set, the chip's `position:fixed` was inside a non-rendered subtree → never visible. Fix: at orchestration init, `document.body.appendChild(chip)` reparents to `<body>` direct child on final-output role.
- **h1** — Defensive force-apply of persisted `state.diagnosticOverlay` at end of `_initApplicationConnectAndSync()` so reload-time /output/ reflects the persisted state without requiring a toggle to fire the broadcast handler.
- **h2** — Closed the silent-no-op gap. The bootstrap ctx-builder (`runtime-orchestration-ctx-builder.js`) was missing `syncDiagnosticOverlayPanel` and `syncRenderModePanel` from its destructure + return literal. Without h2, every boot-time `ctx.syncDiagnosticOverlayPanel?.()` call short-circuited because the value was `undefined` (the live-sync ctx had it; bootstrap ctx didn't). With h2 shipped, h1's force-apply fires correctly AND the render-mode chip readout now also shows mode at boot.
- **Probes removed** — Task 5 commit (5e231fa) removed all 5 `[B3-probe]` console.log statements from `src/`. Production code carries no diagnostic-noise leftover.

## Task Commits

1. **Task 1 (probes)** — `4db79b6` chore(30-01): add 5 transient [B3-probe] console.log probes covering 6 hops
2. **Task 3 (CASE D)** — `53580da` fix(30-01): wire diagnosticOverlay panel-sync into /output/ apply branch (CASE D)
3. **Task 3 (CASE E ext)** — `7ba6fc7` fix(30-01): relocate diagnostic chip out of #control-panel on /output/
4. **Task 5 (cleanup)** — `5e231fa` chore(30-01): remove B3 diagnostic probes after CASE D + E fix verified
5. **Hotfix h1** — `880eacc` fix(30-01-h1): force-apply persisted diagnosticOverlay at boot on /output/
6. **Hotfix h2** — `c96bc13` fix(30-01-h2): expose syncDiagnosticOverlayPanel + syncRenderModePanel in bootstrap ctx

## Files Created/Modified

- `src/app/runtime/runtime-orchestration.js` — CASE D ctx-binding for `syncDiagnosticOverlayPanel`; CASE E `document.body.appendChild(chip)` reparent on final-output role.
- `src/app/runtime/live-sync/runtime-live-sync-core.js` — CASE D explicit `ctx.syncDiagnosticOverlayPanel?.()` invocation in `/output/`-role broadcast apply-branch (after `applyGlobalDefaultsPayloadToState`).
- `src/app/runtime/core/runtime-bootstrap.js` — h1 boot-time force-apply of persisted `diagnosticOverlay` at end of `_initApplicationConnectAndSync()`.
- `src/app/runtime/runtime-orchestration-ctx-builder.js` — h2 added `syncDiagnosticOverlayPanel` + `syncRenderModePanel` to destructure + return literal (closed silent-no-op gap).

## Decisions Made

- **Selected CASE D from PLAN Task 3 cases** based on probe trace evidence: hop3 (broadcast received) and hop5a (state assignment) both fired on /output/, but hop5c (DOM apply) never fired → broken hop = syncDiagnosticOverlayPanel not called → CASE D minimal fix.
- **Extended with CASE E (structural)** because the dataset write succeeded after CASE D but the chip remained invisible — root-cause analysis identified `#output-status-chip` was inside `<aside id="control-panel">` (`display:none !important` on final-output role).
- **Two hotfixes layered after CASE D + E** — h1 alone silently no-op'd because bootstrap ctx-builder lacked `syncDiagnosticOverlayPanel`; h2 closed the gap and surfaced an unexpected bonus (render-mode chip readout now visible at boot, pre-resolving Plan 30-02 Task 1 user observation).
- **Acceptance per CONTEXT D-11/D-12**: ~100ms WS-broadcast latency met; manual UAT only; no automated visual diff. UAT performed against Pi /output/ with reload-time and toggle-time scenarios.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added CASE E structural reparent (not in PLAN Task 3 case list)**
- **Found during:** Task 3 (CASE D applied; UAT after CASE D showed dataset flipped to "true" but chip still invisible on Pi /output/)
- **Issue:** PLAN Task 3 enumerated CASE A–E but CASE E in the PLAN was a CSS specificity scenario, not a DOM-tree structural scenario. The actual broken state was that `#output-status-chip` lived inside `<aside id="control-panel">` which is `display:none !important` on final-output role. Even with `body[data-diagnostic-overlay="true"]` and the visibility CSS rule applied, the chip was inside a non-rendered subtree.
- **Fix:** At orchestration init, after CASE D ctx-binding, reparent the chip to `<body>` direct child via `document.body.appendChild(chip)` on final-output role.
- **Files modified:** src/app/runtime/runtime-orchestration.js
- **Verification:** Pi /output/ chip now appears at toggle-time (commit `7ba6fc7`).
- **Committed in:** 7ba6fc7 (CASE E ext as separate commit, post-CASE D)

**2. [Rule 1 - Bug] h1 boot force-apply (added because CASE D + E only handled toggle-time, not reload-time)**
- **Found during:** Post-CASE-D-+-E UAT (toggle-time worked; reload-time on /output/ showed chip absent until next toggle)
- **Issue:** The CASE D wire fires only on `global-config-update` broadcast — at /output/ reload, no broadcast is delivered (the saved-state was already on disk). State `state.diagnosticOverlay` was correctly hydrated from `applyGlobalDefaultsPayloadToState` at boot, but `syncDiagnosticOverlayPanel` was never called to write the DOM dataset.
- **Fix:** Defensive force-apply at end of `_initApplicationConnectAndSync()` — call `ctx.syncDiagnosticOverlayPanel?.()` after live-sync setup, only on /output/.
- **Files modified:** src/app/runtime/core/runtime-bootstrap.js
- **Verification:** Initial silent no-op on Pi /output/ (uncovered the h2 gap below).
- **Committed in:** 880eacc

**3. [Rule 1 - Bug] h2 bootstrap ctx-builder missing fns**
- **Found during:** Post-h1 UAT (h1 shipped but reload-time chip still absent — discovered via console probing that `ctx.syncDiagnosticOverlayPanel` was `undefined` at bootstrap time)
- **Issue:** `runtime-orchestration-ctx-builder.js` (the bootstrap-side ctx assembler) was missing `syncDiagnosticOverlayPanel` and `syncRenderModePanel` from both its source destructure and its returned ctx object literal. h1's `ctx.syncDiagnosticOverlayPanel?.()` silently short-circuited because the optional-chain saw `undefined`. The live-sync ctx had the functions; bootstrap ctx did not — two distinct ctx assemblers, both feed the same module set, but for reload-time the bootstrap ctx is what runs.
- **Fix:** Add both `syncDiagnosticOverlayPanel` and `syncRenderModePanel` to bootstrap ctx-builder's destructure + return literal.
- **Files modified:** src/app/runtime/runtime-orchestration-ctx-builder.js
- **Verification:** USER PASS at h2 — reload-time chip now appears on Pi /output/, AND render-mode chip-readout also shows mode at boot.
- **Committed in:** c96bc13

---

**Total deviations:** 3 auto-fixed (1 missing critical structural extension CASE E; 2 sequential bug-fixes h1 and h2 to close reload-time gap).
**Impact on plan:** All deviations were necessary for the acceptance bar (D-11 chip propagation ≤200ms toggle + reload-time correctness). No scope creep — every fix is local to the originally-listed PLAN files plus one ctx-builder file (the silent-no-op gap couldn't be diagnosed without runtime probing).

## Issues Encountered

- **Probe trace evidence** showed CASE D was the correct fix branch (broken hop = 5c, NOT hop 4 as RESEARCH §"Probable broken hop" had ranked first). The `syncRuntimePanelsFromState` /output/ skip-gate at runtime-live-sync-core.js:426 (RESEARCH Pitfall 5) was the actual mechanism — the gate is inside `applyLiveRuntimeSnapshot` not the broadcast handler, but on /output/ it bypasses the panel-sync fan-out for this code path.
- **Two-tier ctx-builder** discovered: the live-sync ctx and the bootstrap ctx are independently assembled. Future plans that wire panel-sync fns into late-boot must mirror them in BOTH ctx assemblers.
- **Bonus surfaced for Wave 2:** with overlay now visible on /output/ at boot, the `mode` chip-readout — which Plan 30-02 Task 1 explicitly designed as a UAT discriminator — is the first thing the user sees. User-reported observation during 30-01 UAT: "Pi /output/ in auto-mode shows the same visual as gl-mode; only 2d-mode looks different — and seams visible in BOTH 2d and gl". This pre-resolves Plan 30-02 Task 1 (the answer is BOTH render paths show seams) and makes Plan 30-02 Task 4 GL escalation NON-conditional rather than conditional.

## Threat Flags

None — no new attack surface introduced; all changes are client-side DOM/ctx wiring on existing endpoints.

## User Setup Required

None.

## Next Phase Readiness

- **Plan 30-02 (B1 Seams)** is unblocked: diagnostic overlay's `mode` readout is active on Pi /output/. User has already observed (via the now-visible chip) that BOTH 2d-mode AND gl-mode show seams on Pi → Plan 30-02 Task 4 GL escalation is non-conditional. Task 1 (UAT discriminator) is effectively pre-resolved.
- **All Phase 26 h9 invariants intact:** `precision highp float` (≥1) + `_gl.NEAREST` (≥2) in GL renderer; `canDecodeGifFramesWithImageDecoder` (≥1) in GIF playback; `OUTPUT_ROLE_FINAL` idle-bypass intact.
- **Phase 28 B5 asset-hash flow intact:** asset-manifest broadcast + `resolveAssetUrlWithHash` unchanged.
- **Phase 28 B6 dashboard-inline chip variant intact:** dashboard topbar chip non-regressed (CASE E reparent is gated to final-output role only).
- **Phase 29 BOARD_PROFILE_FIELDS = 9 intact:** no schema changes.
- **40-test suite:** 40/40 throughout the plan.

## Self-Check: PASSED

Files verified to exist:
- src/app/runtime/runtime-orchestration.js: FOUND
- src/app/runtime/live-sync/runtime-live-sync-core.js: FOUND
- src/app/runtime/core/runtime-bootstrap.js: FOUND
- src/app/runtime/runtime-orchestration-ctx-builder.js: FOUND

Commits verified to exist:
- 4db79b6: FOUND
- 53580da: FOUND
- 7ba6fc7: FOUND
- 5e231fa: FOUND
- 880eacc: FOUND
- c96bc13: FOUND

Invariants verified:
- precision highp float: ≥1 (preserved)
- _gl.NEAREST: ≥2 (preserved)
- canDecodeGifFramesWithImageDecoder: ≥1 (preserved)
- ctx.syncDiagnosticOverlayPanel in live-sync-core: ≥2 (CASE D)
- document.body.appendChild in orchestration: ≥1 (CASE E)
- syncDiagnosticOverlayPanel in ctx-builder: 3 (h2)
- BOARD_PROFILE_FIELDS in server.mjs: 1

---
*Phase: 30-render-stability-regressions-closure / Plan 01 (B3 — Diagnostic Overlay Live-Sync to /output/)*
*Completed: 2026-05-05*
