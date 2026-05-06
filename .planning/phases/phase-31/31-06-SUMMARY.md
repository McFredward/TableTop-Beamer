---
phase: 31
plan: 06
plan_id: 31-06
subsystem: ssr-pivot-wave6
tags: [ssr, uat, regression, soak, fps, mesh-warp, audio, d-d2-reversal, delivered-to-uat]

# Dependency graph
requires:
  - phase: 31-00
    provides:
      - "test/ssr-* scaffolds + encoder-detect unit tests (Wave-0 baseline)"
  - phase: 31-01
    provides:
      - "src/server/ssr-render-host.mjs (SSR Chromium tab lifecycle)"
  - phase: 31-02
    provides:
      - "mediasoup H264 video-only Producer + /api/webrtc/signal"
  - phase: 31-03
    provides:
      - "Pi /output/ thin-client receiver + reconnect/error overlays"
  - phase: 31-04
    provides:
      - "Align-corner-drag + active-anims persistence + serverRendering config schema"
  - phase: 31-05
    provides:
      - "runtime-env helper + Pi-only hotfix gates + System & Performance UI subtab"
provides:
  - ".planning/phases/phase-31/31-VERIFICATION.md — phase-level verification doc with M1-M7 + hard constraint + D-B4 + D-D2-reversal acceptance matrix"
  - ".planning/phases/phase-31/31-HUMAN-UAT.md — 15-scenario UAT specification (11 baseline + 3 publishability + 1 D-D2-reversal-NEW) with measurements, D-B4 audit table, performance targets, closure decision options"
  - ".planning/phases/phase-31/31-UAT-RESULTS.md — detailed per-scenario log template for operator on-Pi UAT pass"
  - "debug/p31-acceptance-output.json — machine-readable acceptance matrix (automated PASS-marked, manual PENDING-marked)"
  - ".planning/phases/phase-31/31-SUMMARY.md — phase-level closure summary aggregating Wave 0-6 + ready-for-UAT marker"
affects:
  - "Phase 31 closure: PARTIAL — automated 9/9 PASS · manual 15/15 PENDING (Pi hardware required). Final close-pass / close-partial / reopen decision deferred to operator UAT pass."

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DELIVERED-TO-UAT closure pattern: automated executor runs every gate it can, generates the manual-UAT spec + result-template, marks the phase as 'partial' until human verifies on real hardware"
    - "Acceptance matrix JSON with explicit PENDING_MANUAL markers per scenario — one-to-one mapping to HUMAN-UAT.md sections so the operator updates a single source of truth"
    - "D-D2 reversal applied throughout UAT: Scenario 6 renamed (audio = Pi-local now); Scenario 15 NEW (audioRoute toggle graceful disabled-state)"

key-files:
  created:
    - "debug/p31-acceptance-output.json"
    - ".planning/phases/phase-31/31-VERIFICATION.md"
    - ".planning/phases/phase-31/31-HUMAN-UAT.md"
    - ".planning/phases/phase-31/31-UAT-RESULTS.md"
    - ".planning/phases/phase-31/31-06-SUMMARY.md"
    - ".planning/phases/phase-31/31-SUMMARY.md"
  modified: []

key-decisions:
  - "Plan 31-06 is observation+documentation: no code changes. Phase-29 baseline 40/40 still green within the 137-test total at acceptance time. The plan's Task 2 + Task 4 are CHECKPOINTS that require Pi hardware — auto-mode cannot complete them, so they are deferred to the operator and documented in 31-HUMAN-UAT.md with structured measurements + PASS/FAIL slots."
  - "DELIVERED-TO-UAT marker set in 31-VERIFICATION.md frontmatter (status: PARTIAL — automated_complete + manual_pending). Once the operator runs the 15 scenarios + 30-min soak + records measurements, the closure decision (close-pass / close-partial / reopen-wave-N) is recorded in STATE.md decision log and ROADMAP.md, and Phase 31 is tagged `phase-31-end` (or `-partial`)."
  - "Scenario 6 RENAMED per 31-D-D2-REVERSAL-ADDENDUM.md: 'Audio plays from Pi-local Audio when triggered' (was 'Audio + video sync'). Verifies: trigger animation → WS → Pi HTML5-Audio → Pi audio HW. WebRTC stream itself is video-only."
  - "Scenario 15 NEW per 31-D-D2-REVERSAL-ADDENDUM.md: 'audioRoute toggle in System UI — graceful disabled-state'. Verifies HTML disabled attribute + tooltip + server-side validator rejection of forced in-stream patches while WAVE0_AUDIO_CAPTURE_VERIFIED is false. No crash, no broken UI state."
  - "30-min soak (Scenario 11) is a real-time test that intentionally has no automated equivalent — fps stability, memory stability, GL-context-loss absence, audio sync over 30 min are all measured by the operator. Documented but not executed automatically."

patterns-established:
  - "Acceptance JSON skeleton with structured 'pending' fields: enables a single canonical artifact that flows from automated executor → manual UAT operator → final closure-decision document"
  - "HUMAN-UAT.md structured measurement format (per-scenario expected + result + measurements_to_record fields) keeps the operator's data entry shallow + greppable"

requirements-completed: [M7]
requirements-pending: [M7-manual-portion]

# Test summary
test_count_before: 137
test_count_after: 137
test_pass_after: 135
test_skip_after: 2
test_fail_after: 0
new_tests: []

# Risk register coverage
threats_mitigated:
  - "T-31-06-01 (Repudiation — manual UAT log unverifiable): accepted per Phase-26+30 tradition. UAT-RESULTS.md is operator-signed; sufficient for kiosk."
  - "T-31-06-02 (Tampering — acceptance JSON edited post-hoc): accepted. Git history is the audit trail; no compliance scope."

# Metrics
duration: ~10 min (executor portion)
completed: 2026-05-06T09:50:00Z
---

# Phase 31 Plan 06: Wave 6 — UAT Preparation, Automated Regression Sweep, Closure Hand-Off Summary

Wave 6 is the closure gate for the Phase-31 SSR pivot. The automated executor finalised every gate that doesn't require Pi hardware (test suite green, Phase-29 40/40 baseline preserved, acceptance JSON generated, all UAT scenarios documented). The manual portion — 15 UAT scenarios + 30-minute soak on real Pi 4 connected to Test-Board (Nemesis Lockdown Board A) on 5GHz WLAN — is documented in `31-HUMAN-UAT.md` and is BLOCKING for closure. Plan delivery state: **DELIVERED-TO-UAT**.

## Completed Tasks

| Task | Name | Commit | Status |
|------|------|--------|--------|
| T1 | Run full automated test suite + acceptance JSON skeleton | `22881af` | PASS |
| T2 | CHECKPOINT — 11 UAT scenarios on Pi (Test-Board: Nemesis Lockdown Board A) | (deferred — requires Pi hardware) | DEFERRED-TO-OPERATOR |
| T3 | Write 31-VERIFICATION.md + 31-UAT-RESULTS.md + 31-HUMAN-UAT.md closure documents | `c167c6c` | PASS |
| T4 | CHECKPOINT — Phase 31 closure decision (close-pass / close-partial / reopen) | (deferred — requires manual UAT results) | DEFERRED-TO-OPERATOR |

## Verification Results

### Test suite (Task 1 baseline)

```
$ node --test --test-reporter=tap "test/**/*.test.mjs"
# tests 137
# pass 135
# fail 0
# skipped 2
# duration_ms 1135
```

- Phase-29 baseline (40 tests) still green within the 137-total. **No regression.**
- Phase-31 contributions: 97 new tests (Wave 0-5 cumulative).
- 2 skipped: `ssr-audio-capture-smoke.test.mjs` (D-D2 reversal future-feature scaffold) + 1 opt-in real-Chromium-launch test in `ssr-render-host-lifecycle.test.mjs`.
- Exit code 0.

### Acceptance JSON (Task 1 artifact)

`debug/p31-acceptance-output.json` created with:

- `automated.totalTests = 137`, `automated.pass = 135`, `automated.fail = 0`, `automated.skip = 2`, `phase29NonRegression = true`.
- `wave0Audio.status = "RESOLVED_VIA_D-D2_REVERSAL"` — see `31-D-D2-REVERSAL-ADDENDUM.md`.
- `uatScenarios` — all 15 keyed `PENDING_MANUAL` (1-11 baseline + 12-14 publishability + 15 D-D2-reversal-NEW).
- `bindingConstraints.D_B4_no_black_screen` — 4 disconnect scenarios listed (Server SIGINT, tab kill -9, WLAN drop, encoder UI change), all currently `null` pending Pi-hardware verification.
- `phaseContractNonRegression` — Phase-11-HF6 + Phase-13 + Phase-29 all PASS (automated); Phase-12, 19/27, 26 h9, 28 B6, 30 B1+B2+B3 are PENDING_MANUAL.
- `automatedGates` — all 9 PASS (test suite green, Phase-29 baseline preserved, ssr-encoder-detect / ssr-state-restore / ssr-server-rendering-config / ssr-webrtc-signaling / ssr-receiver-disconnect-detection / runtime-env-environment unit tests PASS, schema-drift PASS).
- `ddReversal.scenario6_renamed` + `ddReversal.scenario15_added` records the D-D2 reversal acceptance changes.

### 31-VERIFICATION.md (Task 3)

Phase-level acceptance matrix mirroring the Phase-29/30 closure-document format. Status: PARTIAL — automated 9/9 PASS · manual 0/15 (PENDING). Acceptance Matrix rows for M1-M7, hard constraints (Phase-29 / Phase-12 / Phase-13 / Phase-19/27 / Phase-26 h9 / Phase-28 B6 / Phase-30 B1+B2+B3), D-B4 BINDING, D-D2-reversal entries (Scenario 6 + 15), publishability rows (UI encoder, forced x264, software-only).

### 31-HUMAN-UAT.md (Task 3)

15 UAT scenarios with per-scenario steps, expected outcomes, measurements-to-record placeholders, D-B4 audit table, performance targets summary, and closure decision options. The operator runs through this document on real Pi hardware and updates the result fields + `debug/p31-acceptance-output.json`.

### 31-UAT-RESULTS.md (Task 3)

Detailed per-scenario log template with timestamp slots, raw measurement slots, screenshot reference slots. Operator fills during UAT pass.

## What Was NOT Done (Deferred to Operator)

- **Task 2 manual UAT execution:** 11 baseline + 3 publishability + 1 D-D2-reversal scenarios on Pi 4 connected to Nemesis Lockdown Board A. **CANNOT** be executed by an automated harness — requires Pi-VC4 GPU, real WLAN, real beamer, real audio output, real touch input, 30-minute realtime soak.
- **Task 4 closure decision:** close-pass / close-partial / reopen-wave-N. **DEFERRED** to operator after UAT results are recorded.
- **STATE.md / ROADMAP.md updates:** the orchestrator instruction explicitly says "Do NOT update STATE.md or ROADMAP.md." Closure-time updates happen at the operator's UAT pass.
- **Tag `phase-31-end`:** deferred to operator per CLOSE-PASS/CLOSE-PARTIAL decision.

## Deviations from Plan

### Auto-deferrals (auto-mode + Pi-hardware unavailability)

**1. [Auto-deferred] Task 2 — 11+3 manual UAT scenarios on Pi**
- **Found during:** Task 2 attempt
- **Issue:** Pi hardware not in executor's possession; 14 scenarios require physical Pi 4 + Test-Board on 5GHz WLAN.
- **Action:** Generated `31-HUMAN-UAT.md` with all 15 scenarios documented (D-D2 reversal applied: Scenario 6 renamed, Scenario 15 added). Generated `31-UAT-RESULTS.md` template for operator log entry. Marked all `uatScenarios` as `PENDING_MANUAL` in acceptance JSON.
- **Files modified:** none new vs. those listed; this is the documentation produced by Task 3.

**2. [Auto-deferred] Task 4 — closure decision**
- **Found during:** Task 4 attempt
- **Issue:** Closure decision (close-pass / close-partial / reopen) depends on manual UAT results that haven't been collected yet.
- **Action:** Recorded `DELIVERED-TO-UAT` marker in `31-VERIFICATION.md` frontmatter (`status: PARTIAL — automated_complete + manual_pending`). Operator runs Task 4 after UAT pass.

No code-level deviations. The automated portions of the plan executed exactly as written.

### D-D2 Reversal applied (per addendum)

- Scenario 6 RENAMED in HUMAN-UAT.md, UAT-RESULTS.md, acceptance JSON, VERIFICATION.md: "Audio plays from Pi-local Audio when triggered" (was "Audio + video sync").
- Scenario 15 NEW in HUMAN-UAT.md, UAT-RESULTS.md, acceptance JSON: "audioRoute toggle in System UI — graceful disabled-state".

## Authentication Gates

None encountered.

## Manual UAT (deferred to operator — see 31-HUMAN-UAT.md)

15 scenarios on Pi hardware. Boot stack via `cd /home/claw/tt-beamer && SSR_RENDER_HOST=1 SSR_PUBLISH=1 node server.mjs`, open `http://<server-ip>:4173/output/` on Pi, run scenarios, record results in `31-HUMAN-UAT.md` + `31-UAT-RESULTS.md` + `debug/p31-acceptance-output.json`.

## Known Stubs

None. The acceptance JSON contains explicit `PENDING_MANUAL` markers — these are NOT stubs but documented gates awaiting operator verification on Pi hardware. The `WAVE0_AUDIO_CAPTURE_VERIFIED` feature flag stays `false` per D-D2 reversal — that's a documented future-feature gate, not a stub.

## Threat Flags

None new. Plan 31-06's threat register entries (T-31-06-01 + T-31-06-02) are both `accepted` per phase-31 plan policy (kiosk operator-context, git audit trail).

## Self-Check: PASSED

Files verified:
- `debug/p31-acceptance-output.json` — present, valid JSON, contains `phase29NonRegression: true` and `D_B4_no_black_screen` keys.
- `.planning/phases/phase-31/31-VERIFICATION.md` — present, contains Acceptance Matrix, M1-M7, D-B4, Phase-29 40/40, Phase-12 layering refs.
- `.planning/phases/phase-31/31-HUMAN-UAT.md` — present, 15 scenarios (1-11 baseline + 12-14 publishability + 15 D-D2-reversal-NEW), Scenario 6 renamed, D-B4 audit table, performance targets, closure options.
- `.planning/phases/phase-31/31-UAT-RESULTS.md` — present, scenarios 1-15 detailed log slots, D-B4 audit table, performance targets table, operator sign-off slot.

Commits verified:
- `22881af` chore(31-06-T1): add acceptance matrix JSON + automated baseline gate — FOUND in `git log --oneline`.
- `c167c6c` docs(31-06-T3): Phase-31 verification + HUMAN-UAT + UAT-RESULTS template — FOUND in `git log --oneline`.

Test suite at acceptance:
- `node --test "test/**/*.test.mjs"` → 137 tests / 135 pass / 0 fail / 2 skip / exit 0 (regression-free).

*Phase: 31-server-side-rendering-pivot · Plan 06 · Wave 6 — DELIVERED-TO-UAT · 2026-05-06*
