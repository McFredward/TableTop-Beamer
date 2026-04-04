---
phase: phase-10
plan: 10-HF6
subsystem: runtime
tags: [multi-area, canonical-merge, fallback-guard, browser-parity, output-final]
requires:
  - phase: phase-10
    provides: HF5 canonical resolver baseline
provides:
  - Deterministic RED repros for Lockdown A `Bunker` drop and subset fallback replacement
  - Canonical merge hardening that retains full valid multi-area sets across browser lanes
  - Explicit parity gates for `areaCount` + `areaIdSet` + control vs `/output/final` set consistency
  - Imported-board and lifecycle regression matrix plus FAIL->PASS closure artifacts
affects: [phase-10, runtime-hydration, output-final, diagnostics]
tech-stack:
  added: []
  patterns: [test-first RED->GREEN diagnostics, canonical-first merge, subset-aware fallback guard]
key-files:
  created:
    - debug/p10-hf6-t1-lockdown-a-area-drop-repro.mjs
    - debug/p10-hf6-t2-merge-lineage-diagnostics.mjs
    - debug/p10-hf6-t3-fallback-subset-replacement-repro.mjs
    - debug/p10-hf6-t4-area-count-parity.mjs
    - debug/p10-hf6-t5-area-id-set-parity.mjs
    - debug/p10-hf6-t6-control-final-set-parity.mjs
    - debug/p10-hf6-t8-fallback-guard.mjs
    - debug/p10-hf6-t9-browser-imported-multiarea-regression.mjs
    - debug/p10-hf6-t10-fail-pass-proof.mjs
    - .planning/phases/phase-10/P10-HF6-T10-FAIL-PASS-PROOF.md
  modified:
    - src/app/runtime/polygon-contract.js
    - .planning/phases/phase-10/TASKS.md
    - .planning/phases/phase-10/PLAN.md
    - .planning/phases/phase-10/BACKLOG.md
    - .planning/phases/phase-10/ACCEPTANCE.md
    - .planning/phases/phase-10/RISKS.md
    - .planning/phases/phase-10/EXECUTE.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/CURRENT_PHASE.md
key-decisions:
  - "Snapshot play-area payloads are merged with canonical contracted sets instead of replacing them wholesale."
  - "Strict-subset snapshots cannot override canonical area ownership or canonical selection."
duration: 8min
completed: 2026-04-04
---

# Phase 10 Plan HF6: Multi-area retention parity blocker summary

**Canonical play-area merge/hydration now deterministically retains all valid areas (`Play Area 1` + `Bunker`) across Chrome/Firefox/mobile-class and across control + `/output/final`, with strict FAIL->PASS evidence.**

## Task Commits

1. T1 RED Lockdown area-drop repro — `8992fec`
2. T2 RED merge-lineage diagnostics — `11eb527`
3. T3 RED fallback subset replacement repro — `f9558a1`
4. T4 RED area-count parity assertions — `9e52c4f`
5. T5 RED area-id-set parity assertions — `04c1be5`
6. T6 RED control/final set parity assertions — `7d39598`
7. T7 generic merge root-cause fix — `54972e5`
8. T8 fallback guard enforcement — `02ad2c3`
9. T9 browser + imported/multi-area matrix — `b71b66f`
10. T10 FAIL->PASS proof + tracker sync — `603d53b`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Canonical selection drift under invalid/empty snapshot payloads**
- **Found during:** Task 8
- **Issue:** After subset-merge hardening, invalid/empty snapshot lanes could still keep `snapshotSelected` over canonical `contractedSelected`.
- **Fix:** Added `preferCanonicalSelection` guard in merge result to enforce canonical selected-area precedence when snapshot contributes no valid entries.
- **Files modified:** `src/app/runtime/polygon-contract.js`
- **Commit:** `02ad2c3`

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `.planning/phases/phase-10/10-HF6-SUMMARY.md`
- FOUND commits: `8992fec`, `11eb527`, `f9558a1`, `9e52c4f`, `04c1be5`, `7d39598`, `54972e5`, `02ad2c3`, `b71b66f`, `603d53b`
