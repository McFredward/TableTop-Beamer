# CURRENT PHASE

- Active: Phase 26 (Data-storage cleanup) — in progress
- Status: 6 commits + 1 hotfix shipped. 26-1..26-4 cleaned dead
  zones, normalized board schemas, scrubbed Maschinenraum, retired
  imported/ migration. h1 cascaded board-delete to profiles.
  26-6 unified per-board state into config/boards/<id>.json (board
  JSON now holds both static catalog data AND live state),
  shrunk global-defaults.json to truly-global fields, consolidated
  images under /config/boards/assets/. Package format bumped to
  tt-beamer.board-package.v3 (no boardProfile field — board carries
  it inline).
- App version: `0.26.2`
- Previous Phase: Phase 25 (Bug & Polish) CLOSED — final

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
