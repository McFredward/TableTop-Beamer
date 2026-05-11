---
status: investigation-incomplete (could not reproduce; defensive fix applied)
trigger: "Operator: profile-load desync persists after W7+W8. ESC 3-6 times converges. Need WHY multiple identical broadcasts converge when one doesn't."
created: 2026-05-11
updated: 2026-05-11
---

## Current Focus

hypothesis: code-audit found a latent bug in slow-path key gate ordering (key set before apply), but cannot prove it's THE operator bug
test: 5 Playwright reproducers (W9-A through W9-E), all pass on master
expecting: defensive fix lands + diagnostic logs added; await operator UAT for ground truth
next_action: operator runs UAT with new SSR-tab logs to surface which apply path is failing

## Symptoms

expected: Load profile via dashboard picker → Pi + SSR + stream all reflect new geometry within ~1s
actual: Profile loads but stream/SSR/Pi shows desync. ESC 3-6 times eventually converges.
errors: No console error. Visual desync only.
reproduction: Dashboard align-mode ON → click profile picker → select xrandrv2 (9×9 complex) → Pi keeps OLD geometry visually. ESC repeatedly on dashboard eventually fixes.
started: After W7+W8 commits. Earlier W7 fixed wackel-test only.

## Eliminated

- hypothesis: W7 SSR defensive broadcast was sole cause
  evidence: W7 in production, operator reports still broken
  timestamp: 2026-05-11

- hypothesis: W8 Pi /output/ defensive activate broadcast was sole remaining cause
  evidence: W8 in production, operator reports still broken
  timestamp: 2026-05-11

- hypothesis: Dashboard browser as 2nd WS client interferes with broadcast fanout
  evidence: W9 reproducer with TWO browser contexts (dashboard + Pi) loading xrandrv2 (9×9) via picker — PASSES on master b210473. All clients reach 9×9 within 3s. The version gate works correctly. Test passed in 13.78s.
  timestamp: 2026-05-11

- hypothesis: chained profile loads or rapid succession exposes the bug
  evidence: W9-B (test→xrandrv2) and W9-C (test→xrandrv2→test→xrandrv2 at 0.5s) both PASS on master. SSR, server, Pi all converge correctly.
  timestamp: 2026-05-11

- hypothesis: server boot with seeded xrandrv2 then load test profile
  evidence: W9-D (seed runtime-active-grid.json with xrandrv2, boot, then load test) PASSES. SSR/server/Pi all reach 6×5.
  timestamp: 2026-05-11

- hypothesis: Pi localStorage seeded with stale grid (test 5x6) interferes when loading xrandrv2
  evidence: W9-E (seed Pi LS with test profile, then load xrandrv2 via picker) PASSES. All clients reach 9×9.
  timestamp: 2026-05-11

## Evidence

- timestamp: 2026-05-11T-start
  checked: master commit log
  found: c047cca (W5) → f14cfa2 (W4) → 0c58142 (W3) → 7e9aa3a (W2) → 48888af (W1). W7+W8 already in.
  implication: Investigating beyond W8.

- timestamp: 2026-05-11T-tests
  checked: operator's saved evidence (output_desync_load.png + ssr-grid.json)
  found: ssr-grid.json from operator shows SSR's grid was 3×3 (test2 shape). But the operator was loading 'test' (5×6). Visual SSR screenshot also shows board warped at narrow inner rectangle (clipped at ~84% width). This evidence is from PRE-W7 (per W6 doc).
  implication: The operator's CURRENT post-W7+W8 desync may be a DIFFERENT bug than what's documented in those screenshots.

- timestamp: 2026-05-11T-tests
  checked: 5 Playwright reproducer tests (W9-A through W9-E) — single load, chained load, rapid chain, seeded-active-grid, seeded-Pi-LS
  found: ALL PASS on master b210473. SSR grid, server snapshot, and Pi grid all converge to expected dimensions within 2-3s of a picker pick.
  implication: The bug does NOT reproduce in synthetic Playwright tests. Operator's environment has some characteristic my tests don't capture — possibly: real Pi hardware (RPi vs x86), real network latency, real long-running session state, or specific operator interaction pattern.

## Resolution

root_cause: NOT CONCLUSIVELY IDENTIFIED. Code audit identified one latent bug (slow-path key-gate ordering — key set before apply could leave gridState=null window with key marked applied, blocking future polls). Whether this is the operator's actual bug is unknown.

fix: Two changes:
1. `src/app/runtime/live-sync/runtime-live-sync-core.js`: slow-path L621-651 — move `state._lastAppliedAlignGridSnapshotKey = snapKey` to AFTER `restoreGridSnapshot()` returns. Add diagnostic `console.log` on successful apply and `console.warn` when gridState isn't ready.
2. `src/app/runtime/output-receiver/boot-handle-ui.js`: in-flight W9 fix preserved — `HANDLE_UI.onAlignModeChange(Boolean(on))` (correct branching for on/off) instead of `showHandles?.(Boolean(on))` (boolean arg ignored).

verification: All 20 Phase 38 e2e tests PASS. D-08 connection-stability live-fixture-smoke GREEN. 5 new W9 reproducer tests PASS on master + fix. None reproduce the operator's reported bug.

files_changed:
- src/app/runtime/live-sync/runtime-live-sync-core.js (W9 slow-path key-ordering fix + diag logs)
- src/app/runtime/output-receiver/boot-handle-ui.js (preserved operator's W9 onAlignModeChange fix)
- test/live-e2e/test_phase38_w9_picker_with_dashboard.py (5 new reproducer tests, all GREEN — they don't reproduce bug)
- .planning/phases/phase-38/38-DEBUG-W9.md (systematic investigation log)
