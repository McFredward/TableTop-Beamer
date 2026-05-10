---
phase: 34
slug: render-quality-thin-consumer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-10
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

This file is a draft. Planner is responsible for filling the per-task verification map after creating PLAN.md files.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none — node test runner default |
| **Quick run command** | `node --test test/connection-stability/` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~60s for connection-stability suite |

---

## Sampling Rate

- **After every task commit:** Run `node --test test/connection-stability/` (D-06 hard gate — must stay green)
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

To be filled by planner after PLAN.md files exist. Each task in PLAN-A and PLAN-B gets a row with the automated command that proves it.

---

## Wave 0 Requirements

- Render-mode probe contract test — assertion that `__ttBeamerEffectiveRenderMode()` is exposed and returns one of `webgl|webgl2|2d|auto` (Track A pre-req).
- Route-resolver contract test — assertion that `/output` resolves to thin HTML and `/ssr` resolves to full HTML (Track B pre-req).
- Thin-output script-graph snapshot — capture the minimum-viable script set so regressions are caught.

*Final list: planner specifies based on RESEARCH.md findings.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Banding-free SSR render | D-05 | Visual perception cannot be reliably automated for solid-color gradient banding | Operator plays known solid-color animation on gaming-PC desktop browser, confirms no banding. Logged in `34-HUMAN-UAT.md`. |
| Pi-hardware /output/ thin-mode CPU drop | Track B exit | Requires actual Pi hardware | Deferred until Pi available — `34-HUMAN-UAT.md`. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter
- [ ] D-06 hard gate: `test/connection-stability/**` green at every commit

**Approval:** pending
