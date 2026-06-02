# CURRENT PHASE

- Active: **none.** Phase 57 closed PASS 2026-06-02 at v1.1.7. No phase open.

- App version: `1.1.7` (CHANGELOG.md, package.json, src/app/lib/shared/config.js)

- Previous Phase: **Phase 57 — SSR mp4 playback quality / smoothness**
  CLOSED PASS 2026-06-02. Four iterations shipped: v1.1.4 (tier-gating),
  v1.1.5 (rVFC paint gate + diagnostic infra), v1.1.6 (ANGLE Vulkan
  backend — root-cause fix), v1.1.7 (overlay strobo + inside/room
  layering). See CHANGELOG.md `[1.1.7]` and ROADMAP.md Phase 57 for
  closure detail. Operator confirmed smooth playback + order-independent
  layering at close.

- Pre-Phase-57: **Phase 50 — Post-launch Sammelphase**
  CLOSED at v1.1.0 release on 2026-05-25 (commit `64ade85`). Rolled up
  31 PATCH releases (1.0.1 → 1.0.31): aspect-ratio support for any
  board, VP9 codec option, content-hint dropdown, bitrate preset radio,
  animation editor UX polish, mobile cold-start fixes, all-English UI
  strings, `/output/` overlay stability. See CHANGELOG.md `[1.1.0]` for
  full feature list.

  - **Post-closure hotfixes:**
    - **v1.1.1** (commit `89bbb92`, 2026-05-25) — Win32 SSR stream
      regressed to 1-2 fps when outside-space active. Empirically
      bisected to `f6383b2` (Phase 50 v1.0.31 starfield batch
      optimization). Reverted the batching; introduced
      `SSR_PUBLISHER_DEBUG=1` env var for future Win32 capture-pipeline
      diagnostics.
    - **v1.1.3** (commit `7de162b`, 2026-05-25) — Align-mode handles +
      grid lines persisted on `/output/` after align-OFF → board-switch.
      Empirically reproduced via Playwright on Linux; root cause:
      `_applyAlignGridSnapshot()` rebuilt handle DOM unconditionally on
      WS grid-snapshot. Gated on `getHandlesVisible() === true`. v1.1.2's
      defensive `#room-overlay` scrub kept as belt-and-suspenders.

- **Previous closures (pre-v1.1.0):**
  - Phase 49 — Release-prep small-fixes Sammelphase (rolled into v1.0.0
    on 2026-05-19, then continued as the live v1.0.x patch line until
    Phase 50 cut)
  - Phase 48 — Align-mode exit dashboard hiccup smoothing
  - Phase 47 — Windows SSR Chrome launch (headless=new flip, off-screen
    iter15 baseline, full Win32 gap-closure run)
  - Phase 46 — v1.0.0 release prep
  - Phase 38 — Connection-stability iteration (recv-anchor + grid-snapshot
    machinery in `output-live-sync.js` that v1.1.3 had to gate)
  - Phase 33 — VAAPI default-disable (commit `3cd6748`) — last entry
    documented in this file before this cleanup. Tag pending
    `phase-33-delivered-to-uat`.

Phase summaries from before Phase 33 remain referenced below for archival:

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
