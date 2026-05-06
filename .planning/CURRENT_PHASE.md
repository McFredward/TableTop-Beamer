# CURRENT PHASE

- Active: none — Phase 32 delivered to UAT (PASS-AUTOMATED-PENDING-MANUAL) on 2026-05-07.
- Status: Phase 32 (SSR Stream Performance + Connection Stability) automated
  13/13 PASS. Five Pi-hardware UAT scenarios (32-HUMAN-UAT.md) deferred to
  live operator testing. Block A (FPS Lift) delivered Xvfb -fakescreenfps,
  Chromium-VAAPI libva probe, streamFpsCap schema, publisher cap-wiring,
  align-mode boost, settings UI. Block B (Connection Stability) delivered
  /api/ssr/ready producer-readiness gate, MAX_RECONNECT_ATTEMPTS hard cap
  removal, adaptive backoff [1s, 2s, 5s, 10s, 30s] forever-retry,
  sessionStorage backoff state, RECONNECTING countdown overlay, and
  server-side proactive boot mediasoup-worker purge.
  Test-Suite 274 total / 270 pass / 4 skipped / 0 fail. Phase-31 baseline
  211 still green inside the 270.
- App version: `0.32.0-delivered-to-uat`
- Previous Phase: Phase 31 (Server-Side Rendering Pivot) CLOSED-WITH-HOTFIXES.
- Next Phase: Phase 33 — TBD (await Phase 32 manual UAT outcome).

Phase 32 closure: `.planning/phases/phase-32/32-SUMMARY.md` (tag `phase-32-delivered-to-uat`)
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
