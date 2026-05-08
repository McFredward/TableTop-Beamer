# CURRENT PHASE

- Active: Phase 33 — Connection Stability Deep Dive (PLANNING). Opened 2026-05-08.
- Status: Phase 33 stub created with 33-CONTEXT.md.
  Next step: run `/gsd-plan-phase 33` to drive the research → plan → verify
  flow with the 5 Phase-32-night debug docs as inputs. Phase scope is
  exclusively connection stability — investigation BEFORE code, reproducible
  failure harness, multi-cycle live-hardware acceptance matrix, no "just
  another hotfix" pattern (D-06).
- Previous Phase: Phase 32 (SSR Stream Performance + Connection Stability)
  CLOSED-FAILED-AT-MANUAL-UAT 2026-05-08. Automated coverage 13/13 PASS, but
  live UAT reproduced image-hang + persistent reconnect-loop despite 12
  nightly hotfixes h1-h12 (h4 reverted). Connection-stability scope
  escalated to Phase 33. Phase-32 FPS-Lift code (Block A) remains landed and
  carries forward. See `.planning/phases/phase-32/32-CLOSURE-ADDENDUM.md`.
- App version: `0.32.0-closed-failed-manual` (tag pending: `phase-32-closed-failed-manual`).
- Test-Suite 274 total / 270 pass / 4 skipped / 0 fail (unchanged through all 12 hotfixes — the central gap Phase 33 must close).

Phase 33 stub:    `.planning/phases/phase-33/33-CONTEXT.md`
Phase 32 closure: `.planning/phases/phase-32/32-CLOSURE-ADDENDUM.md` + `32-SUMMARY.md` (status FAILED-AT-MANUAL-UAT, supersedes by phase-33)
Phase 31 closure: `.planning/phases/phase-31/31-SUMMARY.md` (tag `phase-31-end`)
Phase 30 closure: `.planning/phases/phase-30/SUMMARY.md` (tag `phase-30-end-partial`)
Phase 29 closure: `.planning/phases/phase-29/SUMMARY.md` (tag `phase-29-end`)
Phase 28 closure: `.planning/phases/phase-28/SUMMARY.md` (tag `phase-28-end`)
Phase 27 closure: `.planning/phases/phase-27/SUMMARY.md` (tag `phase-27-end`)
Phase 26 closure: `.planning/phases/phase-26/SUMMARY.md` (tag `phase-26-end-h9`)
Phase 25 closure: `.planning/phases/phase-25/SUMMARY.md` (tag `phase-25-end-h30`)
Phase 24 closure: `.planning/phases/phase-24/SUMMARY.md` (tag `phase-24-end`)
Phase 23 closure: `.planning/phases/phase-23/SUMMARY.md`
Phase 22 closure: `.planning/phases/phase-22/SUMMARY.md`
Phase 21 closure: `.planning/phases/phase-21/SUMMARY.md`
Phase 20 closure: `.planning/phases/phase-20/SUMMARY.md`
Phase 19 closure: `.planning/phases/phase-19/SUMMARY.md`
Phase 15 closure: `.planning/phases/phase-15/SUMMARY.md`
Phase 14 closure: `.planning/phases/phase-14/14-2-SUMMARY.md` + hotfix commit `2bed48c`
Phase 13 closure: `.planning/phases/phase-13/CLOSURE.md`
