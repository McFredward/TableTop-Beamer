# CURRENT PHASE

- Active: Phase 34 — SSR Render-Quality + /output/ Thin-Consumer Refactor
  PLANNING (context captured 2026-05-10). Two tracks bundled: (A) GL→2D
  fallback fix in the SSR-tab (banding in solid colors) + (B) /output/
  thin-consumer refactor with separate HTML entry point and new `/ssr`
  route for the SSR Chromium tab. See 34-CONTEXT.md for full decisions.
- Status: 34-CONTEXT.md complete. Locked decisions: probe + GL-force in
  parallel (D-01); SSR-tab forbids 2D-fallback (D-02, /ssr-route only —
  Phase 30 B2 h10 stays for dashboard + Pi /output/); separate HTML entry
  point (D-03); server-side path split /output/ (thin) vs new /ssr (full
  app) (D-04); render-mode probe + manual visual smoketest on gaming-PC
  (D-05); connection-stability regression hard gate (D-06). Pi-hardware
  visual UAT deferred. Next: /gsd-plan-phase 34.
- Previous Phase: Phase 33 (Connection Stability Deep Dive)
  CLOSED-PASS-WITH-LIVE-FIX on 2026-05-09. Root cause was VAAPI hardware
  encoder starving the SSR-tab's main thread (Phase 32 introduced VAAPI
  auto-pick); fixed by default-disabling VAAPI (commit 3cd6748). User
  confirmed stable connection on 2026-05-09. See 33-CLOSURE.md for full
  root-cause analysis + iter-cycle history.
- App version: `0.33.0-delivered-to-uat`

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
