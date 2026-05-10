---
phase: 35
plan: V
type: execute
wave: 3
depends_on:
  - 35-W0-PLAN
  - 35-A-PLAN
  - 35-B-PLAN
  - 35-C-PLAN
files_modified:
  - .planning/phases/phase-35/35-VERIFICATION.md
  - .planning/phases/phase-35/35-HUMAN-UAT.md
  - .planning/phases/phase-35/35-CLOSURE.md
autonomous: false
requirements:
  - D-01
  - D-02
  - D-03
  - D-04
  - D-05
  - D-06
  - D-07
  - D-08
must_haves:
  truths:
    - "All 6 D-05 a-f Playwright tests GREEN — captured with timestamps in 35-VERIFICATION.md"
    - "test/connection-stability/** reports 72/0/13 — D-06 hard gate FINAL VERIFICATION"
    - "Dashboard regression test_phase35_dashboard_alignmode.py GREEN"
    - "FPS benchmark within 5 fps of Wave-0 baseline AND ≥ 25 fps (D-04)"
    - "All 3 RED unit tests now GREEN: phase-35-bootalignmode-shape, phase-35-output-live-sync, phase-35-bayer-dither"
    - "Phase 33 + 34 regression rails STAY GREEN — no carry-forward broken"
    - "Manual visual UAT instructions captured in 35-HUMAN-UAT.md (operator on gaming-PC, before/after solid-color screenshots)"
    - "Pi-hardware UAT items captured as `status: deferred` per D-08"
    - "35-CLOSURE.md documents track outcomes (A/B/C), Track-C decision (C1 sufficient or C2 escalation), carry-forward LOCKS confirmed unchanged"
  artifacts:
    - path: ".planning/phases/phase-35/35-VERIFICATION.md"
      provides: "Full automated-test results matrix: every D-* requirement → test → result. D-06 final pass log. Phase 33+34 regression rail status. Track-by-track summary (W0 → B → A → C wave-merge results)."
      min_lines: 80
    - path: ".planning/phases/phase-35/35-HUMAN-UAT.md"
      provides: "Operator-facing UAT instructions: gaming-PC desktop browser visual smoketest (handles + drag + no banding); Pi UAT items marked `status: deferred` per D-08."
      min_lines: 50
    - path: ".planning/phases/phase-35/35-CLOSURE.md"
      provides: "Phase 35 closure: outcomes per D-01..D-08, Track-A/B/C summary, Track-C decision (c1/c2/deferred), carry-forward LOCKS reconfirmed (VAAPI default-disabled, Phase 34 h2 GL gate, Phase 34 h1 /ssr classifier, Phase 33 watchdog stack)."
      min_lines: 80
  key_links:
    - from: "35-VERIFICATION.md"
      to: "All 8 D-decisions automated test results"
      via: "embedded test commands + their exit codes/outputs"
      pattern: "D-01|D-02|D-03|D-04|D-05|D-06|D-07|D-08"
    - from: "35-HUMAN-UAT.md"
      to: "Operator visual UAT steps + Pi deferred items"
      via: "explicit step list with screenshots-comparison instructions"
      pattern: "deferred|gaming-PC|solid-color"
    - from: "35-CLOSURE.md"
      to: "Carry-forward LOCKS"
      via: "explicit reconfirmation table"
      pattern: "VAAPI|Phase 34 h2|Phase 33"
---

<objective>
Phase 35 verification + closure: confirm every D-decision is satisfied with green automated tests + manual UAT instructions captured + closure document written. NO production code changes — pure documentation + verification.

This plan runs LAST. Depends on W0, A, B, C all complete. Produces the 3 closure artifacts: VERIFICATION.md (automated results matrix), HUMAN-UAT.md (operator visual UAT script), CLOSURE.md (phase outcome).

Per D-06 LOCKED: connection-stability 72/0/13 is the FINAL gate. If it fails here, Phase 35 cannot close — root-cause + revert.

Per D-08: Pi-hardware UAT items captured as deferred (carry-forward Phase 33+34 pattern).

Track ordering recommendation in RESEARCH §"Track ordering recommendations" maps W0 → B → A → C → V — this is the V step. C may have run parallel to A; that's fine.
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
@.planning/phases/phase-35/35-B-SUMMARY.md
@.planning/phases/phase-35/35-A-SUMMARY.md
@.planning/phases/phase-35/35-C-SUMMARY.md

# Reference closure docs from prior phases (style template)
@.planning/phases/phase-34/34-CLOSURE.md
@.planning/phases/phase-34/34-CLOSURE-ADDENDUM.md
@.planning/phases/phase-34/34-VERIFICATION.md
@.planning/phases/phase-34/34-HUMAN-UAT.md

# Final D-06 gate
@test/connection-stability/

# Final live-E2E gate
@test/live-e2e/
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run final verification gauntlet — capture all results</name>
  <read_first>
    - .planning/phases/phase-35/35-VALIDATION.md (the test-map matrix — every D-* row)
    - test/live-e2e/ (all live tests)
    - test/connection-stability/ (D-06 final gate)
    - test/phase-35-*.test.mjs (all 3 RED→GREEN unit tests)
    - test/phase-34-*.test.mjs (Phase 34 carry-forward — must STAY GREEN)
  </read_first>
  <files></files>
  <action>
Execute the full Phase 35 test gauntlet, capturing exit codes + last-N-lines of output for each. Save outputs to a temporary file for use in Task 2 when writing 35-VERIFICATION.md.

```bash
set +e
mkdir -p /tmp/phase-35-verification
{
  echo "=== TS: $(date -Iseconds) ==="
  echo

  echo "=== JS QUICK SUITE (no live) ==="
  node --test "test/**/*.test.mjs" 2>&1 | tail -10
  echo "EXIT: $?"
  echo

  echo "=== Phase 35 RED→GREEN unit tests ==="
  node --test test/phase-35-bootalignmode-shape.test.mjs 2>&1 | tail -8
  echo "EXIT (bootalignmode-shape): $?"
  node --test test/phase-35-output-live-sync.test.mjs 2>&1 | tail -8
  echo "EXIT (output-live-sync): $?"
  node --test test/phase-35-bayer-dither.test.mjs 2>&1 | tail -8
  echo "EXIT (bayer-dither): $?"
  echo

  echo "=== D-06 HARD GATE: connection-stability ==="
  RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tail -10
  echo "EXIT: $?"
  echo

  echo "=== Phase 34 regression rails (24 GREEN expected) ==="
  node --test "test/phase-34-*.test.mjs" 2>&1 | tail -10
  echo "EXIT: $?"
  echo

  echo "=== Phase 32 regression rails ==="
  node --test test/phase-32-hotfix-regression.test.mjs test/phase-32-xvfb-fakescreenfps.test.mjs 2>&1 | tail -10
  echo "EXIT: $?"
  echo

  echo "=== LIVE E2E: D-05 a-f smoke ==="
  python -m pytest test/live-e2e/test_phase35_alignmode_smoke.py -v 2>&1 | tail -25
  echo "EXIT: $?"
  echo

  echo "=== LIVE E2E: dashboard regression (D-01-A2) ==="
  python -m pytest test/live-e2e/test_phase35_dashboard_alignmode.py -v 2>&1 | tail -10
  echo "EXIT: $?"
  echo

  echo "=== LIVE E2E: FPS benchmark (D-04) ==="
  python -m pytest test/live-e2e/test_phase35_fps_benchmark.py -v 2>&1 | tail -15
  echo "EXIT: $?"
  echo
} > /tmp/phase-35-verification/run.log 2>&1
set -e
cat /tmp/phase-35-verification/run.log
```

Confirm:
- All exit codes are 0
- D-06 line shows `pass 72`, `fail 0`, `skipped 13`
- All 3 phase-35-*.test.mjs unit tests pass
- All 6 D-05 a-f tests pass
- Dashboard regression passes
- FPS benchmark passes (≥ 25 fps)

If ANY exit code is non-zero or counts mismatch, halt phase closure and root-cause. The most likely failure modes:
- D-06 regress: revert the most recent ssr-render-host.mjs / receiver-bootstrap.js change (Track C2 or Track A respectively)
- D-05 e/f regress: bootAlignMode setup broken — re-check IIFE script-tag order in output.html
- Dashboard regress: a polygon-editor ctx field stub leaked into the dashboard path — fix runtime-orchestration.js buildAlignModeArgs

Save the captured log; reference it in 35-VERIFICATION.md.
  </action>
  <verify>
    <automated>grep -E "EXIT: 0|pass 72.*fail 0.*skipped 13" /tmp/phase-35-verification/run.log | wc -l</automated>
  </verify>
  <acceptance_criteria>
    - /tmp/phase-35-verification/run.log captured
    - All EXIT lines are `EXIT: 0`
    - D-06 line shows pass 72, fail 0, skipped 13
    - All 3 phase-35-*.test.mjs unit tests pass
    - All 6 D-05 a-f tests pass
    - Dashboard regression passes
    - FPS benchmark prints effective_fps and asserts pass
    - Phase 33 + 34 regression rails GREEN
  </acceptance_criteria>
  <done>Verification gauntlet GREEN; results captured in /tmp/phase-35-verification/run.log for documentation.</done>
</task>

<task type="auto">
  <name>Task 2: Write .planning/phases/phase-35/35-VERIFICATION.md</name>
  <read_first>
    - /tmp/phase-35-verification/run.log (Task 1 output)
    - .planning/phases/phase-34/34-VERIFICATION.md (template/style reference)
    - .planning/phases/phase-35/35-VALIDATION.md (the requirement→test map)
  </read_first>
  <files>.planning/phases/phase-35/35-VERIFICATION.md</files>
  <action>
Create `35-VERIFICATION.md` documenting all automated results.

Required structure:

~~~markdown
 ---
phase: 35
slug: thin-output-refactor-align-banding
status: PASS-AUTOMATED-PENDING-VISUAL-UAT
verified: <today's date — 2026-05-10>
 ---

# Phase 35 — Verification

**Status:** PASS-AUTOMATED-PENDING-VISUAL-UAT (operator visual UAT in 35-HUMAN-UAT.md before final close)

## Test Results Matrix

| Req ID | Behavior | Test | Result | Notes |
|--------|----------|------|--------|-------|
| D-01-A1 | bootAlignMode exported | `node --test test/phase-35-bootalignmode-shape.test.mjs` | GREEN | RED→GREEN transition verified |
| D-01-A2 | Dashboard align-mode regression | `python -m pytest test/live-e2e/test_phase35_dashboard_alignmode.py` | GREEN | Pure-extract refactor was additive — dashboard unchanged from user POV |
| D-01-A3 | output.html align-mode renders handles | `pytest ...test_handles_visible` | GREEN | D-05 e |
| D-02-B1 | bootOutputLiveSync exports + 11 methods | `node --test test/phase-35-output-live-sync.test.mjs` | GREEN | |
| D-02-B2 | output-audio-binder consumes new live-sync | same file (source-grep test) | GREEN | |
| D-03-C1 | Bayer dither produces non-uniform pixel values | `node --test test/phase-35-bayer-dither.test.mjs` | GREEN | |
| D-03-C1-V | Visual: solid-color animation has no bands | manual operator UAT | PENDING | See 35-HUMAN-UAT.md |
| D-04 | FPS impact ≤ 5 fps at 1080p@30fps | `pytest ...test_solid_color_fps_baseline` | GREEN | <baseline> → <post-C1>; delta <delta> fps |
| D-05-a | videoReadyState === 4 within 10s | `pytest ...test_ready_state` | GREEN | |
| D-05-b | videoCurrentTime > 5 after 8s wait | `pytest ...test_current_time` | GREEN | |
| D-05-c | body backgroundColor === rgb(0,0,0) | `pytest ...test_bg_color` | GREEN | |
| D-05-d | Zero `health ping failed` in stderr | `pytest ...test_server_log_clean` | GREEN | |
| D-05-e | Handles visible at /output/ alignMode=true | `pytest ...test_handles_visible` | GREEN | |
| D-05-f | Pointer-drag triggers align-corner-drag | `pytest ...test_drag_triggers_mutation` | GREEN | |
| D-06 | connection-stability 72/0/13 | `RUN_LIVE_TESTS=1 node --test test/connection-stability/` | GREEN | 72 pass / 0 fail / 13 skip — UNCHANGED |
| D-07 | Plan ordering W0 → B → A → C → V | n/a (planning constraint) | SATISFIED | |
| D-08 | Pi-hardware UAT items deferred | n/a | DEFERRED | See 35-HUMAN-UAT.md |

## Carry-Forward Regression Rails

| Phase | Tests | Result |
|-------|-------|--------|
| 32 | phase-32-hotfix-regression + xvfb-fakescreenfps | GREEN |
| 33 | connection-stability/** (72/0/13) | GREEN |
| 34 | phase-34-*.test.mjs (24 tests) | GREEN |

## Track-by-Track Summary

### Wave 0 — Test Infrastructure
- scripts/with_server.py: <LOC> lines
- test/live-e2e/ scaffolding: <test count> tests
- 3 RED unit tests planted as rails

### Track B — Live-Sync Minimal Subset (D-02)
- output-live-sync.js: <LOC> lines (target ~186)
- output-audio-binder.js: <before> → <after> LOC
- receiver-bootstrap.js: inline poll loop REMOVED
- D-02-B1, B2, B3: GREEN

### Track A — Align-Mode Decoupling (D-01)
- output-align-mode.js: <LOC> lines
- runtime-orchestration.js: refactored additively
- output.html: 11 IIFE script tags + bootAlignMode call (defer attribute on all)
- receiver-bootstrap.js: 4-corner Wave-4 approximation REMOVED
- D-01-A1, A2, A3 + D-05 e, f: GREEN

### Track C — Banding Fix (D-03 + D-04)
- runtime-effect-dither.js: <LOC> lines
- runtime-effect-visuals.js solid-color path: putImageData(getDitheredSolidColorImageData(...)) wired
- Track C decision: c1-sufficient | c2-escalate | c1-degraded-and-defer (PICK ONE per actual outcome)
- (If c2 ran:) ssr-render-host.mjs: --use-angle=default → --use-angle=swiftshader
- D-03-C1: GREEN; D-04: GREEN; D-03-C1-V: PENDING UAT

## Carry-Forward LOCKS Reconfirmed UNCHANGED

| Lock | Source | Status |
|------|--------|--------|
| VAAPI default-disabled | Phase 33 commit `3cd6748` | UNCHANGED |
| Phase 34 hotfix h1 (`/ssr` → OUTPUT_ROLE_FINAL) | Phase 34 | UNCHANGED |
| Phase 34 hotfix h2 (GL flags gated on hasVaapiEnabled) | Phase 34 | UNCHANGED |
| Phase 33 watchdog tolerance 150s + frame-stale 30s + RPC 20s + heartbeat-reset | Phase 33 | UNCHANGED |
| H264 codec | D-A1 | UNCHANGED |
| Headful Chromium 131 + Xvfb | D-A3 | UNCHANGED |
| Pi-local audio (D-D2) | Phase 31 | UNCHANGED |
| streamFpsCap + alignModeBoost | Phase 32 | UNCHANGED |

## Run Log

<paste excerpts from /tmp/phase-35-verification/run.log here>
~~~

Replace placeholder values (`<LOC>`, `<baseline>`, etc.) with actual numbers from the SUMMARY files (35-W0-SUMMARY.md, 35-B-SUMMARY.md, 35-A-SUMMARY.md, 35-C-SUMMARY.md) and the run.log.
  </action>
  <verify>
    <automated>test -f .planning/phases/phase-35/35-VERIFICATION.md && grep -c "GREEN" .planning/phases/phase-35/35-VERIFICATION.md</automated>
  </verify>
  <acceptance_criteria>
    - 35-VERIFICATION.md exists
    - File contains the matrix with all 17 rows (D-01-A1, D-01-A2, D-01-A3, D-02-B1, D-02-B2, D-03-C1, D-03-C1-V, D-04, D-05 a-f, D-06, D-07, D-08) — verify ≥ 16 D-* references
    - File contains "GREEN" at least 14 times (one per fully-automated row)
    - File contains "DEFERRED" or "PENDING" for D-03-C1-V and D-08
    - File references the run.log lines (excerpt or pointer)
    - File reconfirms all 8 carry-forward LOCKS as UNCHANGED
  </acceptance_criteria>
  <done>35-VERIFICATION.md captures all automated results.</done>
</task>

<task type="auto">
  <name>Task 3: Write .planning/phases/phase-35/35-HUMAN-UAT.md</name>
  <read_first>
    - .planning/phases/phase-34/34-HUMAN-UAT.md (template/style)
    - .planning/phases/phase-35/35-CONTEXT.md (D-08 — Pi UAT deferred)
    - .planning/phases/phase-35/35-VALIDATION.md §"Manual-Only Verifications"
  </read_first>
  <files>.planning/phases/phase-35/35-HUMAN-UAT.md</files>
  <action>
Create `35-HUMAN-UAT.md` with operator-facing visual UAT instructions.

Required structure:

~~~markdown
 ---
phase: 35
status: pending-operator-uat
gaming_pc_uat: required
pi_uat: deferred
 ---

# Phase 35 — Human UAT

**Performed by:** Operator (gaming-PC desktop browser primary; Pi UAT deferred)
**Status:** Phase 35 cannot CLOSE until gaming-PC visual UAT completes; Pi items track as deferred per D-08.

## UAT-1 (REQUIRED): Gaming-PC desktop browser /output/ smoketest

**Goal:** Verify /output/ thin path renders H264 stream + align-mode handles + drag interaction works.

**Setup:**
1. Server running on Lenovo Mini at <ip>:<port>
2. Operator on gaming-PC, desktop browser (Chrome/Firefox/Edge)
3. Open dashboard `/` in one tab; open `/output/` in second tab

**Steps:**
1. **Stream smoketest** — /output/ tab shows the stream (no black screen, no error overlay). Pass: visible movement matches what dashboard is rendering.
2. **Align-mode toggle** — In dashboard, toggle align-mode. /output/ tab should show 4 corner handles (filled circles) at the projection-mapping corners within ~1s.
3. **Handle drag** — In /output/ tab, click-and-drag one handle. Handle moves with mouse. Dashboard's projection-mapping reflects the drag (visible in dashboard's preview).
4. **Polygon visibility** — If a room polygon is selected on dashboard, the polygon outline + vertex handles should be visible on /output/ in alignMode.

**Pass criteria:** All 4 steps complete without browser console errors. Handles render visibly. Drag mutations propagate.

## UAT-2 (REQUIRED): No solid-color banding (D-03-C1-V)

**Goal:** Verify Bayer 4×4 dither eliminates visible Mach-band step artifacts.

**Setup:**
1. Operator triggers a known solid-color fade animation from dashboard
2. /output/ tab is visible on gaming-PC

**Steps:**
1. Take a screenshot of /output/ during the fade — at the dim midpoint where bands were most visible pre-Phase-35.
2. Compare to a pre-Phase-35 screenshot (operator should have one from Phase 34 UAT). If unavailable, the side-by-side comparison can be done qualitatively from memory.
3. Pass: bands are GONE or visibly reduced. Fail: bands look identical to pre-Phase-35.

**If FAIL:** Track C1 dithering insufficient. Escalate to operator: try `c2-escalate` (re-run 35-C-PLAN with c2 flag) and capture another screenshot.

**Pass criteria:** Bands gone OR visibly reduced. If marginal, operator decides whether C2 is worth the D-06 risk.

## UAT-3 (DEFERRED per D-08): Pi 4 hardware UAT

**Status:** DEFERRED — Pi 4 hardware not always accessible. Same pattern as Phase 33 + Phase 34.

**Items deferred to Pi-hardware-available session:**
- /output/ on Pi shows H264 stream without thin-/output/ regressions
- align-mode handles visible on Pi /output/
- align-mode drag triggers /api/live/mutate from Pi
- Pi CPU usage in idle stream: measurably lower than pre-Phase-34 baseline (per ROADMAP exit criterion 6)
- Pi /output/ no banding (visual UAT analogous to UAT-2)
- 60-minute steady-state on Pi: no reconnect, no health-ping failures

**Process:** When Pi available, operator runs the above checks; results are appended to this file as `## UAT-3 result: <date>`.

## UAT-4 (REQUIRED before close): D-06 final automated re-run

**Goal:** Pre-merge regression sanity check.

**Steps:**
1. Operator runs `RUN_LIVE_TESTS=1 npm run test:connection-stability`.
2. Confirms 72 pass / 0 fail / 13 skip.

**Pass criteria:** counts match exactly.

## Sign-off

When UAT-1, UAT-2, and UAT-4 are GREEN, operator types `phase-35-uat-approved` in 35-CLOSURE.md and the phase closes.

UAT-3 (Pi) closes the phase deferred items independently when hardware permits — does NOT block phase close per D-08.
~~~
  </action>
  <verify>
    <automated>test -f .planning/phases/phase-35/35-HUMAN-UAT.md && grep -c "DEFERRED\|deferred" .planning/phases/phase-35/35-HUMAN-UAT.md</automated>
  </verify>
  <acceptance_criteria>
    - 35-HUMAN-UAT.md exists
    - File documents UAT-1 (gaming-PC /output/ + align-mode + drag), UAT-2 (no banding), UAT-3 (Pi DEFERRED), UAT-4 (D-06 re-run)
    - File contains `DEFERRED` or `deferred` for Pi items per D-08
    - File contains `phase-35-uat-approved` sign-off line
    - File references D-03-C1-V, D-08
  </acceptance_criteria>
  <done>35-HUMAN-UAT.md ready for operator.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: HUMAN UAT — operator verification (gaming-PC visual smoketest)</name>
  <what-built>
    Phase 35 delivers:
    - /output/ thin path with working align-mode UI (Track A)
    - Minimal live-sync subscription module (Track B) consumed by /output/'s align-mode + audio-binder
    - Bayer 4×4 dither in solid-color rendering (Track C, possibly with C2 SwiftShader escalation)
    - Wave-0 live-E2E test rail blocking-prerequisite for future phases (D-05)
  </what-built>
  <how-to-verify>
    Operator: please run UAT-1 + UAT-2 + UAT-4 from `.planning/phases/phase-35/35-HUMAN-UAT.md`.

    Quick checklist (full instructions in the file):
    1. Open `/output/` in gaming-PC desktop browser
    2. Stream renders, no black screen
    3. Toggle alignMode from dashboard — handles appear at /output/ corners
    4. Drag a handle — it moves with mouse, dashboard reflects the change
    5. Trigger known solid-color fade — verify NO visible step bands (or visibly reduced)
    6. Run `RUN_LIVE_TESTS=1 npm run test:connection-stability` — confirm 72/0/13

    Optional: take before/after screenshots of step 5 for the closure record.
  </how-to-verify>
  <resume-signal>Type "phase-35-uat-approved" if PASS; describe any issues if FAIL.</resume-signal>
  <files>(none — operator runs verification commands externally)</files>
  <action>Operator opens /output/ in gaming-PC desktop browser; runs UAT-1, UAT-2, UAT-4 from 35-HUMAN-UAT.md; types resume-signal accordingly. If FAIL, describe issue + halt phase close + return to orchestrator for hotfix planning.</action>
  <verify>
    <automated>RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tail -5 | grep -E "pass 72.*fail 0.*skipped 13"</automated>
  </verify>
  <acceptance_criteria>
    - Operator runs UAT-1 (gaming-PC /output/ smoketest) and reports PASS
    - Operator runs UAT-2 (visual no-banding check) and reports PASS or DEGRADED with note
    - Operator runs UAT-4 (D-06 final automated re-run) — connection-stability 72/0/13
    - Resume signal received: phase-35-uat-approved (PASS) or detailed FAIL description
  </acceptance_criteria>
  <done>Operator UAT GREEN; phase-35-uat-approved sign-off received; phase ready for closure document write.</done>
</task>

<task type="auto">
  <name>Task 5: Write .planning/phases/phase-35/35-CLOSURE.md</name>
  <read_first>
    - 35-VERIFICATION.md (Task 2 output)
    - 35-HUMAN-UAT.md + Task 4 result
    - .planning/phases/phase-35/35-W0-SUMMARY.md
    - .planning/phases/phase-35/35-B-SUMMARY.md
    - .planning/phases/phase-35/35-A-SUMMARY.md
    - .planning/phases/phase-35/35-C-SUMMARY.md
    - .planning/phases/phase-34/34-CLOSURE.md (template/style)
    - .planning/phases/phase-34/34-CLOSURE-ADDENDUM.md (style for closure record)
  </read_first>
  <files>.planning/phases/phase-35/35-CLOSURE.md</files>
  <action>
Create `35-CLOSURE.md` documenting the phase outcome.

Required structure:

~~~markdown
 ---
phase: 35
slug: thin-output-refactor-align-banding
status: PASS  # or PASS-PENDING-PI-UAT if deferred items remain
closed: <today's date — 2026-05-10>
 ---

# Phase 35 — Closure

**Status:** PASS-PENDING-PI-UAT (D-08 deferred items remain; gaming-PC UAT GREEN; D-06 GREEN)

## Goal Recap

Phase 35 closed three Phase 34 deferred defects:
1. Align-mode UI was missing on /output/ (thin path). Track A pure-extracted bootAlignMode.
2. Live-sync minimal subset for /output/'s align-mode + audio-binder. Track B built bootOutputLiveSync.
3. Solid-color banding from 8-bit-per-channel canvas blending. Track C applied Bayer 4×4 dither at runtime-effect-visuals.js.

Plus a non-negotiable Wave-0 mandate: live-end-to-end smoke-test rail (D-05). Closed with scripts/with_server.py + test/live-e2e/ + 6 D-05 a-f assertions.

## Track Outcomes

### Wave 0 (D-05) — Live-E2E Test Rail
- scripts/with_server.py NEW (~80 LOC subprocess wrapper around node server.mjs)
- test/live-e2e/ NEW (conftest.py + _flake_retry.py + 3 test files)
- 3 RED unit-test rails planted (phase-35-bootalignmode-shape, phase-35-output-live-sync, phase-35-bayer-dither)
- All RED rails transitioned to GREEN by the time Tracks A/B/C landed.

### Track B (D-02) — Live-Sync Minimal Subset
- output-live-sync.js NEW (<actual LOC>; target ~186)
- output-audio-binder.js refactored to consume bootOutputLiveSync
- receiver-bootstrap.js inline 1Hz /api/live/snapshot poll loop REMOVED
- Single source of truth for alignMode + activeProjectionProfileId on /output/.

### Track A (D-01) — Align-Mode Decoupling
- output-align-mode.js NEW (<actual LOC>)
- runtime-orchestration.js refactored to call bootAlignMode (additive — dashboard unchanged from user POV)
- output.html: 11 IIFE script tags with `defer` + bootAlignMode call (per RESEARCH §A.4)
- receiver-bootstrap.js Wave-4 4-corner approximation REMOVED (real handle hit-test from bootAlignMode)

### Track C (D-03 + D-04) — Banding Fix
- runtime-effect-dither.js NEW (<actual LOC>; Bayer 4×4 matrix per RESEARCH §C.3)
- runtime-effect-visuals.js solid-color path uses putImageData(getDitheredSolidColorImageData(...))
- Track C decision: <c1-sufficient | c2-escalate | c1-degraded-and-defer> (per actual Task 3 outcome from 35-C-PLAN)
- (If c2 ran:) ssr-render-host.mjs flag swap `--use-angle=default` → `--use-angle=swiftshader`; D-06 still 72/0/13.
- FPS impact: <baseline> → <post> = <delta> fps (D-04 ≤ 5 fps target met)

## Verification

All 8 D-decisions satisfied:
- D-01..D-04, D-06: automated tests GREEN (see 35-VERIFICATION.md)
- D-05: 6 a-f Playwright tests GREEN
- D-07: track ordering W0 → B → A → C → V satisfied
- D-08: Pi UAT items captured as deferred in 35-HUMAN-UAT.md

D-03-C1-V (visual no-bands UAT) GREEN per operator sign-off in Task 4.

## Carry-Forward LOCKS

All carry-forward locks from CONTEXT.md remain UNCHANGED:
- VAAPI default-disabled (Phase 33 `3cd6748`) ✓
- Phase 34 hotfix h1 (/ssr → OUTPUT_ROLE_FINAL) ✓
- Phase 34 hotfix h2 (GL flags gated on hasVaapiEnabled) ✓
- Phase 33 watchdog tolerance 150s + frame-stale 30s + RPC 20s + heartbeat-reset ✓
- H264 codec, headful Chromium 131 + Xvfb, Pi-local audio, streamFpsCap, alignModeBoost ✓

## Outstanding (Carry to Phase 36+ or operator)

- **Pi UAT (D-08 deferred):** Track in 35-HUMAN-UAT.md UAT-3 section; resolves when Pi accessible
- **C3 VAAPI opt-in test:** explicitly deferred per D-03 — separate phase or operator-driven manual test
- **GL-renderer SwiftShader-only refactor:** out of scope per CONTEXT.md `<deferred>` section
- **Animation-engine higher-color-depth refactor:** out of scope, multi-phase effort

## Lessons (for retrospective)

- Phase 34's missed bugs (`/ssr` classifier, GL hang) were both invisible to automated tests because no test live-loaded `/output/`. Phase 35 D-05 closes that class — the live-E2E rail is now permanent test infrastructure.
- Pure-extract refactor over hybrid-flag (D-01 LOCKED) was the right choice — flag-based branching would have left dashboard modules loading in /output/, defeating the thin-consumer goal.
- The 60-field polygon-editor ctx was the highest-risk surface (Pitfall 6) — stub audit per RESEARCH §A.1 prevented runtime TypeErrors.
- C1 Bayer dither <was sufficient | required C2 escalation>; the planned escalation path proved <decision-correct | unnecessary>.

## Sign-Off

Operator visual UAT: `phase-35-uat-approved` (per Task 4 resume signal)
D-06 final gate: 72/0/13 GREEN (per 35-VERIFICATION.md)
Phase 35: CLOSED <today's date>
~~~

Replace `<actual LOC>`, `<delta>`, `<decision>` etc. with actual numbers/values from the SUMMARY files.

If Task 4 resume-signal was NOT `phase-35-uat-approved` (i.e., operator reported issues), do NOT mark CLOSED — instead, document the issue, set status to `BLOCKED`, and return to the orchestrator for hotfix planning.
  </action>
  <verify>
    <automated>test -f .planning/phases/phase-35/35-CLOSURE.md && grep -c "UNCHANGED\|GREEN" .planning/phases/phase-35/35-CLOSURE.md</automated>
  </verify>
  <acceptance_criteria>
    - 35-CLOSURE.md exists
    - File documents all 4 tracks (W0, B, A, C) with LOC + decisions
    - File reconfirms all carry-forward LOCKS as UNCHANGED
    - File documents D-08 Pi-deferred items
    - File contains operator sign-off line `phase-35-uat-approved` (or `BLOCKED` if Task 4 reported issues)
    - File contains "GREEN" + "UNCHANGED" markers
    - Status frontmatter is `PASS` or `PASS-PENDING-PI-UAT` or `BLOCKED`
  </acceptance_criteria>
  <done>Phase 35 CLOSURE document complete; phase closed (or BLOCKED with hotfix path documented).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| documentation only | this plan touches only .planning/phases/phase-35/*.md — no production code surface |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-35-V-01 | Repudiation | closure document mis-states a carry-forward LOCK as changed | mitigate | Task 5 explicitly reconfirms each LOCK; Task 1 verifies via tests |
| T-35-V-02 | Information disclosure | run.log captured to /tmp may contain server stderr with PII | accept | local dev environment; tempfile cleanup; no PII in test data |
| T-35-V-03 | Tampering | operator types fake `phase-35-uat-approved` without actually running UAT | accept | trust-the-operator model; carry-forward from Phase 33 + 34 closure pattern |
</threat_model>

<verification>
1. **All 8 D-* automated GREEN**: D-01-A1, D-01-A2, D-01-A3, D-02-B1, D-02-B2, D-03-C1, D-04, D-05 a-f, D-06 — collected in 35-VERIFICATION.md.
2. **D-03-C1-V + D-08 captured as PENDING/DEFERRED** in 35-HUMAN-UAT.md.
3. **Operator sign-off** `phase-35-uat-approved` in Task 4 (or hotfix loop if BLOCKED).
4. **Carry-forward LOCKS reconfirmed UNCHANGED** in 35-CLOSURE.md.
5. **D-06 final gate**: connection-stability 72/0/13 — captured in 35-VERIFICATION.md AND re-verifiable by operator via `npm run test:connection-stability`.
</verification>

<success_criteria>
- [ ] /tmp/phase-35-verification/run.log captured with all GREEN exit codes
- [ ] 35-VERIFICATION.md exists, documents all D-* results
- [ ] 35-HUMAN-UAT.md exists, captures gaming-PC UAT + Pi-deferred items
- [ ] Operator runs UAT-1, UAT-2, UAT-4 and types `phase-35-uat-approved`
- [ ] 35-CLOSURE.md exists, status=PASS or PASS-PENDING-PI-UAT
- [ ] All carry-forward LOCKS reconfirmed UNCHANGED in 35-CLOSURE.md
- [ ] No production code touched in this plan
</success_criteria>

<output>
After completion, no SUMMARY.md is needed for the V plan — 35-CLOSURE.md serves as the V-plan summary.

Phase 35 closed (or BLOCKED with hotfix path documented). Update ROADMAP.md status from PLANNING → CLOSED (or BLOCKED) — handled by parent orchestrator.
</output>
