---
phase: 30
slug: render-stability-regressions-closure
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-05
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Phase 30 has UAT-only acceptance per CONTEXT D-03/D-08/D-12. The
> only automated gate is the existing 40-test non-regression baseline.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (Node 24 builtin), helpers in `test/_helpers.mjs` |
| **Config file** | none — runner is `node --test "test/**/*.test.mjs"` direct |
| **Quick run command** | `node --test "test/**/*.test.mjs"` |
| **Full suite command** | `node --test "test/**/*.test.mjs"` (all sub-100ms) |
| **Estimated runtime** | ~120ms |

**Current baseline (verified 2026-05-05 at HEAD):** 40 tests / 40 pass / 0 fail / 0 skipped.

---

## Sampling Rate

- **After every task commit:** Run `node --test "test/**/*.test.mjs"` — 40/40 must remain green.
- **After every plan wave:** Same command, same suite (all tests sub-100ms; no separate full-suite cost).
- **Before phase verification:** Full suite must be green AND manual UAT signed off on Pi /output/ for B1/B2/B3.
- **Max feedback latency:** ~120ms.

---

## Per-Task Verification Map

> Phase 30 acceptance is UAT-only per CONTEXT D-03/D-08/D-12. The matrix below maps each backlog item to its test posture; per-task IDs will be filled in during planning.

| Backlog | Plan | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|----------|-----------|-------------------|-------------|--------|
| B3 (Diagnostic Overlay live-sync) | 30-01 | Toggle propagates to /output/ ≤100ms | manual UAT | n/a — Sichtprüfung im Browser nach Toggle | n/a (D-12) | ⬜ pending |
| B1 (Animation seams) | 30-02 | solid-color + others seam-frei (2D + GL) | manual UAT | n/a — visuelle Inspektion auf Pi /output/ Test-Board | n/a (D-03) | ⬜ pending |
| B2 (Pi GIF reliability) | 30-03 | All GIFs play deterministically without reload | manual UAT | n/a — UAT auf Pi-Hardware | n/a (D-08) | ⬜ pending |
| Non-Regression | all plans | Phase 29 test suite stays 40/40 | automated | `node --test "test/**/*.test.mjs"` | ✅ 10 test files exist | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- None. Per CONTEXT D-00: "Kein Wave-0-Plan, weil alle Backstops UAT-only sind (keine Test-Scaffold-Vorarbeit nötig)."

`wave_0_complete: true` — there is no Wave 0; the existing 40-test suite is sufficient as the non-regression baseline.

---

## Manual-Only Verifications

| Behavior | Backlog | Why Manual | Test Instructions |
|----------|---------|------------|-------------------|
| Diagnostic-overlay chip appears on Pi /output/ within ~100ms of dashboard toggle | B3 | Cross-browser-context live-sync; ANSWER must be observed on actual /output/ rendering, not Node | (1) Open dashboard + /output/ on Pi. (2) Toggle "Show diagnostic overlay" ON in System tab. (3) Observe /output/ — chip MUST appear with version + fps + mode + canvas + frame cost. (4) Toggle OFF — chip MUST disappear. |
| solid-color animation in any room shows zero seams at projector distance | B1 | Visual perception under projector gamma + viewing distance; cannot be reproduced in headless Node | (1) Load board "Nemesis Lockdown Board A" on Pi /output/. (2) Trigger `solid-color` animation on any room. (3) Inspect at projector viewing distance — NO visible 1-pixel ridges or transformation seams within room. (4) Repeat in both render modes (auto/2d/gl) via System tab. (5) Repeat for Malfunction, Fire, Slime, Scanning, Flicker, Alarm — all must be seam-frei within a room. |
| All configured GIF animations on Pi /output/ play on first trigger after a fresh boot | B2 | Pi-specific timing (idle-callback starvation, ImageDecoder concurrency); not reproducible in Node | (1) Reboot Pi /output/ session. (2) Wait for warmup phase complete. (3) Trigger every configured GIF animation in turn. (4) Each MUST start playing within ~1 frame of the trigger event. (5) Reload /output/ — repeat triggers. (6) GIFs that played before MUST still play; no "reload-breaks-others" pattern. |

---

## Validation Sign-Off

- [x] All tasks have automated verify (the 40-test non-regression baseline) OR manual UAT instructions
- [x] Sampling continuity: every task commit runs the 40-test suite; no 3 consecutive uncovered tasks
- [x] Wave 0 not required (per CONTEXT D-00)
- [x] No watch-mode flags
- [x] Feedback latency < 1s (~120ms)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-05
