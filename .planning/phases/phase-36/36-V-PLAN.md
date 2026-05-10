---
phase: 36
plan: V
type: execute
wave: 6
depends_on: [M5]
files_modified:
  - .planning/phases/phase-36/36-VERIFICATION.md
  - .planning/phases/phase-36/36-HUMAN-UAT.md
autonomous: true
requirements_addressed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]
gap_closure: false
must_haves:
  truths:
    - "Full Phase 36 live-e2e suite GREEN: 10 align-handles tests + 6 dashboard parity tests"
    - "Phase 35 W0 dashboard regression test (test_phase35_dashboard_alignmode.py) GREEN OR formally deferred per M3 path-b"
    - "node --test test/phase-36-boot-handle-ui-shape.test.mjs reports fail=0"
    - "Connection-stability suite reports fail=0 (D-08 hard gate)"
    - "output.html ≤8 src-based scripts (D-09 grep gate)"
    - "Phase 35-A pointer-events:none !important CSS rule REMOVED (grep verifies absence)"
    - "bootHandleUi exists as exported function (D-01 Option H delivered)"
    - "runtime-trace harness exists with ?ctx-trace=1 activation (D-07)"
    - "emitLiveMutation method exists on output-live-sync.js (RESEARCH §1.3 critical fix)"
    - "/api/align-mode-dirty endpoint logs to stdout (W0 wiring)"
    - "36-HUMAN-UAT.md exists documenting Pi-hardware items as deferred (D-10)"
    - "36-VERIFICATION.md exists summarizing test outcomes + decision coverage"
  artifacts:
    - path: ".planning/phases/phase-36/36-VERIFICATION.md"
      provides: "Phase 36 verification report — D-01..D-10 coverage table + T1-T10 GREEN evidence + carry-forward locks confirmation"
      contains: "D-01"
    - path: ".planning/phases/phase-36/36-HUMAN-UAT.md"
      provides: "Pi-hardware deferred UAT checklist (D-10 carry-forward pattern)"
      contains: "deferred"
  key_links:
    - from: "36-VERIFICATION.md"
      to: "test outputs (pytest + node --test) referenced by command + last-line"
      via: "executor runs commands and captures stdout into the verification doc"
      pattern: "pytest test/live-e2e/test_phase36"
    - from: "36-HUMAN-UAT.md"
      to: "operator UAT against Pi 4 hardware (deferred per D-10)"
      via: "carry-forward pattern from Phase 33/34/35 35-HUMAN-UAT.md"
      pattern: "status: deferred"
threat_model:
  threats:
    - id: T-NA-1
      title: "No new threats — verification wave"
      stride: "N/A"
      asvs: "N/A"
      severity: low
      description: "V wave introduces no production code changes; existing mitigations from W0-M5 cover the surface"
      existing_mitigation: "All"
      new_mitigation: "None"
---

<objective>
Final verification wave for Phase 36. No production code changes. Runs the full live-e2e suite, the connection-stability gate, the JS unit suite, and the D-09 grep assertion. Produces 36-VERIFICATION.md + 36-HUMAN-UAT.md.

The Pi-hardware UAT is explicitly deferred per D-10 (carry-forward from Phase 33/34/35). Operator runs visual + functional verification on actual Pi 4 hardware later; Phase 36 closure does NOT block on it.

Purpose: Capture closure evidence + document the Pi-deferred items separately.

Output: Two documentation files. Phase 36 ready for closure.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-36/36-CONTEXT.md
@.planning/phases/phase-36/36-RESEARCH.md
@.planning/phases/phase-36/36-VALIDATION.md
@.planning/phases/phase-36/36-W0-SUMMARY.md
@.planning/phases/phase-36/36-A1-SUMMARY.md
@.planning/phases/phase-36/36-A2-SUMMARY.md
@.planning/phases/phase-36/36-M3-SUMMARY.md
@.planning/phases/phase-36/36-M4-SUMMARY.md
@.planning/phases/phase-36/36-M5-SUMMARY.md
@.planning/phases/phase-35/35-HUMAN-UAT.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Run full verification suite + capture evidence into 36-VERIFICATION.md</name>
  <files>.planning/phases/phase-36/36-VERIFICATION.md</files>
  <read_first>
    - .planning/phases/phase-36/36-CONTEXT.md (D-01..D-10 — verification table maps each decision to a test)
    - .planning/phases/phase-36/36-VALIDATION.md (per-task verification map — produces the Status column updates)
    - .planning/phases/phase-35/35-VERIFICATION.md (reference style for closure evidence formatting)
  </read_first>
  <behavior>
    - Run all six test commands and capture last-N-lines of stdout for each.
    - Build a Decision Coverage table: D-01..D-10 each with the artifact/test that proves it.
    - Build a Carry-forward Locks table: VAAPI default-disabled, Phase 34 h2, Phase 35-iter2 h3, Phase 35-iter2 h1, Phase 35-B output-live-sync, connection-stability hard gate.
    - Document Q1-Q5 reconciliations as resolved with their lock value.
    - State Phase 36 closure verdict: PASS-AUTOMATED-PENDING-PI-HARDWARE-UAT (per Phase 33/34/35 carry-forward pattern).
    - If any test fails: list the failure verbatim + which plan needs revision.
  </behavior>
  <action>
**Step 1: Run all verification commands and capture outputs.**

```bash
# 1. Phase 36 align-handles full suite
pytest test/live-e2e/test_phase36_align_handles.py -v 2>&1 | tee /tmp/phase36-align-handles.log
echo "---"
tail -20 /tmp/phase36-align-handles.log

# 2. Phase 36 dashboard parity full suite
pytest test/live-e2e/test_phase36_dashboard_parity.py -v 2>&1 | tee /tmp/phase36-dashboard-parity.log
echo "---"
tail -10 /tmp/phase36-dashboard-parity.log

# 3. Phase 35 dashboard regression (kept per Q2 reconciliation)
pytest test/live-e2e/test_phase35_dashboard_alignmode.py -v 2>&1 | tee /tmp/phase35-dashboard.log
echo "---"
tail -10 /tmp/phase35-dashboard.log

# 4. bootHandleUi unit
node --test test/phase-36-boot-handle-ui-shape.test.mjs 2>&1 | tee /tmp/phase36-bhu-unit.log
echo "---"
grep -E "^# (pass|fail|tests)" /tmp/phase36-bhu-unit.log

# 5. Connection-stability hard gate (D-08)
RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs' 2>&1 | tee /tmp/phase36-conn-stab.log
echo "---"
grep -E "fail=" /tmp/phase36-conn-stab.log | tail -3

# 6. D-09 script-tag budget
SCRIPT_COUNT=$(grep -cE "<script[^>]*src=" output.html)
echo "output.html src-based script count: $SCRIPT_COUNT (budget: 8)"

# 7. CSS rule removal (D-02 verification)
echo "Phase 35-A pointer-events:none !important rule presence:"
grep -nE 'pointer-events:\s*none\s*!important' src/styles.css | grep -E 'projection-corner-handle|projection-grid-handle|projection-grid-line-canvas' || echo "ABSENT (correct — Phase 36 D-02 removed)"

# 8. bootHandleUi export shape grep
grep -c "export function bootHandleUi" src/app/runtime/output-receiver/boot-handle-ui.js

# 9. emitLiveMutation grep
grep -c "emitLiveMutation" src/app/runtime/output-receiver/output-live-sync.js

# 10. ?ctx-trace=1 harness grep
grep -c "_ctxTraceEnabled\|ctx-trace=1" src/app/runtime/runtime-orchestration.js

# 11. /api/align-mode-dirty server log line
grep -c '\[align-mode-dirty\] received dirty=' server.mjs
```

**Step 2: Build 36-VERIFICATION.md** with the following structure (use Write tool):

```markdown
  ---
phase: 36
slug: comprehensive-alignmode-thin-output
status: PASS-AUTOMATED-PENDING-PI-HARDWARE-UAT
verified: 2026-05-10
  ---

# Phase 36 — Verification

## TL;DR

[1-paragraph summary: All 10 RED tests GREEN, dashboard regression GREEN/deferred,
D-08 fail=0, D-09 ≤8 scripts, Phase 35-A CSS rule removed, Q1-Q5 reconciliations
landed. Phase 36 ready for operator Pi-hardware UAT (deferred per D-10).]

## Decision Coverage (D-01..D-10)

| Decision | Description | Verification | Status |
|----------|-------------|--------------|--------|
| D-01 | Option H bootHandleUi | grep "export function bootHandleUi" boot-handle-ui.js -> 1 + unit GREEN | PASS |
| D-02 | overlay pointer-events:none on /output/; Phase 35-A !important rule removed | grep absence in styles.css + receiver-bootstrap "none" | PASS |
| D-03 | 10 RED tests Live-E2E | pytest test_phase36_align_handles.py 10 passed | PASS |
| D-04 | Client-local undo via align-grid-snapshot | T8 GREEN | PASS |
| D-05 | Right-click context menu local | T7 GREEN | PASS |
| D-06 | Dirty-flag broadcast (Q1 reconciliation: existing /api/align-mode-dirty endpoint) | T9 GREEN + server log line | PASS |
| D-07 | runtime-trace + AST union | grep _ctxTraceEnabled in runtime-orchestration.js | PASS (harness exists; operator UAT optional) |
| D-08 | Connection-stability fail=0 | node --test test/connection-stability fail=0 | PASS |
| D-09 | <=8 src-based scripts in output.html | grep -cE "<script[^>]*src=" output.html -le 8 | PASS |
| D-10 | Pi UAT deferred docs | 36-HUMAN-UAT.md exists with status: deferred | PASS |

## RED Test Status (T1..T10)

| Test | Description | Wave Closed | Status |
|------|-------------|-------------|--------|
| T1 | Sizing | M3 | GREEN |
| T2 | Corner pulls | M3 | GREEN |
| T3 | Vertex drag | M4 | GREEN |
| T4 | Midpoint drag | M4 | GREEN |
| T5 | Rotation | M4 | GREEN |
| T6 | Image-pan | M5 | GREEN |
| T7 | Right-click context menu | M5 | GREEN |
| T8 | CTRL+Z undo | M5 | GREEN |
| T9 | Dirty-flag | M5 | GREEN |
| T10 | No dual-path conflict | M3 (verified across all M waves) | GREEN |

## Q1-Q5 Planner Reconciliations

| Q | Description | Lock | Source |
|---|-------------|------|--------|
| Q1 | dirty-flag broadcast: existing endpoint vs piggyback | EXISTING /api/align-mode-dirty endpoint (lower risk; same goal as D-06 literal) | W0 plan, A2 loader, server.mjs |
| Q2 | dashboard regression test rewrite | KEEP test_phase35_dashboard_alignmode.py + ADD test_phase36_dashboard_parity.py | W0 plan |
| Q3 | line-add immediate broadcast | IMMEDIATE broadcastGridSnapshot({force:true}) | M5 plan, handle-ui.js |
| Q4 | handle-ui internal modularization | NO split (deferred — preserves diff bound) | RESEARCH §6 |
| Q5 | undo stack memory cap | 1000-entry FIFO eviction | M5 plan, grid-state.js |

## Carry-Forward Locks (UNCHANGED, verified preserved)

- VAAPI default-disabled (Phase 33 commit 3cd6748)
- Phase 34 hotfix h2 (hasVaapiEnabled-gated GL flags)
- Phase 35-iter2 h3 banding fix (Bayer dither + drawImage clip)
- Phase 35-iter2 h1 lazy-load infrastructure
- Phase 35-iter2 h2 polygon-data wiring
- Phase 35-B output-live-sync.js (13-method subscription)
- Connection-stability hard gate (D-06 -> D-08 in Phase 36 numbering)

## Test Run Evidence

### pytest test/live-e2e/test_phase36_align_handles.py -v

[paste tail -20 of /tmp/phase36-align-handles.log here, last lines containing pass/fail summary]

### pytest test/live-e2e/test_phase36_dashboard_parity.py -v

[paste tail -10 of /tmp/phase36-dashboard-parity.log]

### pytest test/live-e2e/test_phase35_dashboard_alignmode.py -v

[paste tail -10 of /tmp/phase35-dashboard.log; if it failed and was deferred per M3 path-b, document deferral here with link to deferred-items.md]

### node --test test/phase-36-boot-handle-ui-shape.test.mjs

[paste # pass / # fail summary]

### Connection-stability gate

[paste fail= line]

### D-09 grep

`output.html src-based script count: <N> (budget: 8)` -> PASS if <=8

### D-02 CSS rule absence

[paste output of grep — should say "ABSENT (correct ...)"]

## Pending Items (deferred to Pi UAT)

See 36-HUMAN-UAT.md — Pi-hardware visual + functional verification.

## Closure Verdict

**Status:** PASS-AUTOMATED-PENDING-PI-HARDWARE-UAT

Phase 36 closes pending operator Pi-hardware UAT (D-10 carry-forward).

## Tag Recommendation

`phase-36-end-pending-pi-uat` until operator confirms Pi UAT; then retag `phase-36-end`.
```

**Step 3: Replace bracketed [paste ...] markers with actual command output captured in Step 1.**

**Step 4: If ANY test failed:** mark Status as `BLOCKED` and list the failing test + recommended re-plan target wave (e.g. "T8 still RED — re-open M5"). Do NOT mark PASS-AUTOMATED if any T1-T10 test is RED.
  </action>
  <verify>
    <automated>test -f .planning/phases/phase-36/36-VERIFICATION.md && grep -c "PASS\|GREEN\|fail=0" .planning/phases/phase-36/36-VERIFICATION.md</automated>
    Expected output: at least 10 (decision coverage table + test status table contain many PASS/GREEN markers)
  </verify>
  <acceptance_criteria>
    - File `.planning/phases/phase-36/36-VERIFICATION.md` exists
    - File contains the literal `D-01` through `D-10` (all 10 decisions covered)
    - File contains the literal `T1` through `T10` (all 10 tests covered)
    - File contains the literal `Q1` through `Q5` (all 5 planner reconciliations documented)
    - File contains test-output evidence (not bracketed placeholders) — `grep -c "passed\|GREEN\|fail=0\|fail=" .planning/phases/phase-36/36-VERIFICATION.md` returns at least 5
    - File contains `Carry-Forward Locks` section listing VAAPI + Phase 34 h2 + Phase 35-iter2 h3 + h1 + h2 + Phase 35-B + connection-stability
    - Closure verdict line is present: `grep -c "PASS-AUTOMATED-PENDING-PI-HARDWARE-UAT\|BLOCKED" .planning/phases/phase-36/36-VERIFICATION.md` returns at least 1
  </acceptance_criteria>
  <done>
    36-VERIFICATION.md exists with full evidence + decision coverage + Q-reconciliations + carry-forward locks + closure verdict.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create 36-HUMAN-UAT.md documenting Pi-hardware deferred items per D-10</name>
  <files>.planning/phases/phase-36/36-HUMAN-UAT.md</files>
  <read_first>
    - .planning/phases/phase-35/35-HUMAN-UAT.md (Phase 35 reference)
    - .planning/phases/phase-36/36-CONTEXT.md (D-10 carry-forward pattern)
    - .planning/phases/phase-36/36-RESEARCH.md §8 threat T-DOS-1, T-XSS-1, T-LB-1 (mitigations to verify on Pi)
  </read_first>
  <behavior>
    - File documents Pi-4 visual + functional UAT items as `status: deferred`.
    - Items map to T1-T10 plus the Pi-specific overlay-pointer-events behavior (RESEARCH §8: "Pi browser quirk re overlay pointer-events:none allows finger to fall through to OS").
    - Each item has: behavior, expected result, deferred reason (`hardware not in CI`).
    - Operator opens, drives, signs each item with date + OK/regression note when Pi accessible.
  </behavior>
  <action>
Create `.planning/phases/phase-36/36-HUMAN-UAT.md`:

```markdown
  ---
phase: 36
slug: comprehensive-alignmode-thin-output
status: deferred
audience: operator
deferred_reason: "Pi 4 hardware not in CI — D-10 carry-forward pattern from Phase 33/34/35"
created: 2026-05-10
  ---

# Phase 36 — Human UAT (Pi-hardware deferred)

Per CONTEXT.md D-10 + carry-forward from Phase 33/34/35, the Pi-hardware visual
and functional UAT for Phase 36 is deferred. Operator runs each item below on
actual Pi 4 hardware when accessible and records OK / regression.

## Setup

1. Boot Pi 4 with the latest Phase 36 build deployed.
2. Open `/output/` in the Pi's default browser (Chromium).
3. Have a second device open `/` (gaming-PC desktop browser) for dirty-flag UAT.
4. Trigger align-mode ON via dashboard or `POST /api/live/command {"mutationType":"context-update","payload":{"alignMode":true}}`.

## UAT Items

### Item 1 — Sizing (T1 hardware verification)

- **Behavior:** Handle frame visually aligns with the streamed video content (no ESC required).
- **Expected:** All 4 corner handles + interior vertices sit on the visible video edges/grid.
- **Status:** deferred
- **Operator note:** ___________________

### Item 2 — Corner pulls (T2 hardware verification)

- **Behavior:** Drag each of the 4 outer corner handles 50px in any direction.
- **Expected:** Streamed video content visibly distorts toward the dragged corner.
- **Status:** deferred
- **Operator note:** ___________________

### Item 3 — Vertex drag (T3 hardware verification)

- **Behavior:** Drag an interior vertex (e.g. row=0, col=1).
- **Expected:** Only that vertex moves; neighboring vertices remain anchored. Stream reflects.
- **Status:** deferred
- **Operator note:** ___________________

### Item 4 — Midpoint drag (T4 hardware verification)

- **Behavior:** Drag a `.projection-grid-handle` midpoint bar.
- **Expected:** The corresponding row or column shifts (squish behavior). Stream reflects.
- **Status:** deferred
- **Operator note:** ___________________

### Item 5 — Rotation (T5 hardware verification)

- **Behavior:** Drag the rotation handle in an arc.
- **Expected:** Whole grid rotates around its centroid. Stream reflects.
- **Status:** deferred
- **Operator note:** ___________________

### Item 6 — Image-pan (T6 hardware verification)

- **Behavior:** Click in a free area between handles and drag.
- **Expected:** Whole grid translates. Stream reflects.
- **Status:** deferred
- **Operator note:** ___________________

### Item 7 — Right-click menu (T7 hardware verification)

- **Behavior:** Right-click on a line. Menu appears with "Add line through this point" / "Delete this line".
- **Expected:** Menu visible. Click "Add line" creates new line; stream updates immediately (Q3 lock).
- **Status:** deferred
- **Operator note:** ___________________

### Item 8 — CTRL+Z undo (T8 hardware verification)

- **Behavior:** Drag a handle. Press CTRL+Z.
- **Expected:** Handle returns to pre-drag position. Stream reverts.
- **Status:** deferred
- **Operator note:** ___________________

### Item 9 — Dirty-flag propagation (T9 hardware verification)

- **Behavior:** With dashboard `/` open on a second device: drag any handle on Pi /output/.
- **Expected:** Dashboard's dirty hint indicator becomes visible within 1-2 seconds.
- **Status:** deferred
- **Operator note:** ___________________

### Item 10 — Pi browser overlay-pointer-events quirk (RESEARCH §8 threat T-DOS-1)

- **Behavior:** With align-mode ON, drag handles for an extended period (~30s).
- **Expected:** No accidental finger fall-through to the OS (no Pi-side scroll, no zoom gesture, no chrome menu).
- **Status:** deferred
- **Operator note:** ___________________

### Item 11 — Connection stability under sustained drag (D-08 hardware confirm)

- **Behavior:** Drag handles for 60 seconds continuously.
- **Expected:** WebRTC connection stays stable; no reconnect; no frame-stale warning in dashboard.
- **Status:** deferred
- **Operator note:** ___________________

### Item 12 — VAAPI default-disabled preserved (carry-forward)

- **Behavior:** Boot Pi /output/ without `SSR_ENABLE_VAAPI=1` env var.
- **Expected:** Server logs show "VAAPI disabled" or equivalent. No GL-flag-related hangs.
- **Status:** deferred
- **Operator note:** ___________________

## Sign-off

When all 12 items are operator-verified OK on Pi hardware:

```bash
# Update each item's "Operator note" with date + OK
# Update frontmatter `status: deferred` to `status: confirmed`
# Tag: phase-36-end-pi-confirmed (or fold into phase-36-end if not branched)
```

## Deferred Items (post-Phase-36 candidates)

Per CONTEXT.md `## Deferred Ideas`:
- handle-ui internal modularization (Q4 LOCKED: not split in Phase 36; future cleanup phase)
- Server-side undo log (D-04 lock is client-local)
- Right-click forwarding to dashboard (D-05 lock is local rendering)
- Phase 37 transformation banding (separate phase)
- Animation-engine refactor (multi-phase effort)
- Pixel-diff visual regression suite (rejected in Phase 34)
```
  </action>
  <verify>
    <automated>test -f .planning/phases/phase-36/36-HUMAN-UAT.md && grep -c "status: deferred" .planning/phases/phase-36/36-HUMAN-UAT.md</automated>
    Expected output: at least 12 (frontmatter + 11 items minimum)
  </verify>
  <acceptance_criteria>
    - File `.planning/phases/phase-36/36-HUMAN-UAT.md` exists
    - Frontmatter contains `status: deferred`
    - File contains at least 12 numbered "Item" sections (Items 1-12 minimum)
    - File contains at least one item per T1-T9 + at least 3 hardware-specific items (overlay quirk, connection stability, VAAPI)
    - File references `D-10` (carry-forward pattern)
    - File references the Q4 LOCK (modularization deferred)
  </acceptance_criteria>
  <done>
    36-HUMAN-UAT.md exists with all Pi-hardware items as `status: deferred`. Operator-driven sign-off path documented.
  </done>
</task>

</tasks>

<threat_model>
## STRIDE Threat Register

(All threats documented + mitigated in earlier waves; V wave does not introduce new threats.)
</threat_model>

<verification>
V wave closure gates:
- 36-VERIFICATION.md exists with all 10 D-X + all 10 T-X + all 5 Q-X marked
- 36-HUMAN-UAT.md exists with status: deferred
- All test command outputs captured in 36-VERIFICATION.md
- Closure verdict: PASS-AUTOMATED-PENDING-PI-HARDWARE-UAT
</verification>

<success_criteria>
- Phase 36 verification complete + documented
- Pi UAT deferral documented per D-10 carry-forward pattern
- Phase 36 ready for operator sign-off (or further iteration if any test failed)
</success_criteria>

<output>
After completion, create `.planning/phases/phase-36/36-V-SUMMARY.md` documenting:
- The exact commands run + their pass/fail status
- That 36-VERIFICATION.md and 36-HUMAN-UAT.md are committed
- Whether Phase 36 reached PASS-AUTOMATED-PENDING-PI-HARDWARE-UAT or BLOCKED
- Tag recommendation: phase-36-end-pending-pi-uat
</output>
