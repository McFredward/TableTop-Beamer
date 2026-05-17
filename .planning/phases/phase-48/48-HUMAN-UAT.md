---
status: passed
phase: 48-align-mode-exit-dashboard-hiccup-smoothing
source: [48-VERIFICATION.md]
started: 2026-05-17T15:15:00Z
updated: 2026-05-17T15:30:00Z
resolved: 2026-05-17T15:30:00Z
operator_signoff: "Sehr gut! Das hat es deutlich verbessert."
---

## Current Test

[resolved — operator confirmed fix on 2026-05-17]

## Tests

### 1. Linux UAT — 4-step repro under 250 ms
expected: After clicking the align-mode toggle OFF on the dashboard (step d of the 4-step repro: enable → drag-on-/output/ → reset → toggle-off), the dashboard reaches a fully clean state (no align-indicator bar, no dirty chip, running-animations list visible) within < 250 ms (use phone stopwatch or perceptual judgment — pre-fix was ~2-3 s, so the diff should be very obvious).
result: passed (operator confirmed 2026-05-17)

### 2. Win32 UAT — same 4-step repro on Windows
expected: Identical timing target (< 250 ms) on Windows 11 (operator's RTX-4090 dev rig). Parity check with Linux — no platform-specific lag.
result: passed (operator confirmed 2026-05-17)

### 3. align-mode-enter non-regression
expected: Click align-toggle ON works identically to pre-fix — body `.align-mode-active` class applied within ~100 ms, indicator bar appears, button `aria-pressed="true"`. No flicker, no double-fire.
result: passed (operator confirmed 2026-05-17)

### 4. dirty-flag activation non-regression
expected: After enabling align mode, dragging a mesh-warp/handle on `/output/` activates the dirty state — dashboard chip appears, align-toggle disables. Server-authoritative timing (~500 ms one snapshot poll) is unchanged from pre-fix.
result: passed (operator confirmed 2026-05-17)

### 5. reset/discard non-regression
expected: On `/output/`, the reset/discard button clears the dirty state. Dashboard chip disappears, align-toggle re-enables. No regressions in either timing or correctness.
result: passed (operator confirmed 2026-05-17)

### 6. Running-animations no-flash check
expected: During the align-mode-exit transition, the running-animations list in the dashboard stays visible the whole time. No "no active animations" empty-state flash. (If a flash IS observed, the Direction-A hybrid Task 2 from 48-02-PLAN.md needs to be applied — currently bypassed.)
result: passed (operator confirmed 2026-05-17)

### 7. Repeat-cycles stability (3+ runs)
expected: Execute the full 4-step repro at least 3 times back-to-back. No console errors. No stuck states (e.g., align-mode toggle becoming non-clickable, indicator bar getting stuck, dirty chip flickering). No memory leaks visible in DevTools Performance > Memory.
result: passed (operator confirmed 2026-05-17)

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

(none yet — populate during UAT if any test fails)
