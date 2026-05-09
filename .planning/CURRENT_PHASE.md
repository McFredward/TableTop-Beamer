# CURRENT PHASE

- Active: none — Phase 33 (Connection Stability Deep Dive)
  CLOSED-PASS-WITH-LIVE-FIX on 2026-05-09. Root cause was VAAPI hardware
  encoder starving the SSR-tab's main thread (Phase 32 introduced VAAPI
  auto-pick); fixed by default-disabling VAAPI (commit 3cd6748). User
  confirmed stable connection on 2026-05-09. See 33-CLOSURE.md for full
  root-cause analysis + iter-cycle history.
- Status: Phase 33 automated 363 tests / 346 pass / 17 skip / 0 fail +
  80/80 live integration tests + 10/10 manual repro 10× cold-boot script.
  All 14 suspects from 33-STATE-MACHINE.md fixed + regression-tested
  (S1-S14 all addressed). Plans W0/01/02/03/04/05 + 3 hotfixes (h1/h2/h3)
  delivered. Architectural shifts: producer-lifecycle server-push (replaces
  8s frame-stale polling — 80× recovery improvement); ConnectionState enum
  + capped retry + GIVEN_UP state (replaces forever-retry); mediasoup-worker
  auto-respawn + ssr-tab WS watchdog (closes BUG-B from Phase 32);
  multi-consumer-per-IP via Map<addr,Set<entry>>; comprehensive test
  infrastructure under `test/connection-stability/**` that **would have
  caught** the Phase-32 manual-UAT regression.
  Eight Pi-hardware UAT scenarios (33-HUMAN-UAT.md) deferred to operator
  hardware testing.
- App version: `0.33.0-delivered-to-uat`
- Previous Phase: Phase 32 (SSR Stream Performance + Connection Stability)
  CLOSED-FAILED-AT-MANUAL-UAT 2026-05-08 — superseded by Phase 33.
  Phase-32 FPS-Lift code (Block A) remains landed and carries forward.
- Next Phase: Phase 34 — TBD (await Phase 33 manual UAT outcome).

Phase 33 closure: `.planning/phases/phase-33/33-SUMMARY.md` (tag pending `phase-33-delivered-to-uat`)
Phase 32 closure: `.planning/phases/phase-32/32-CLOSURE-ADDENDUM.md` + `32-SUMMARY.md` (status FAILED-AT-MANUAL-UAT, superseded by phase-33)
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
