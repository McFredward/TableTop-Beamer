# BACKLOG — Phase 14

## Plan 14-1 — Inventory + Dead Code Purge
- [ ] P14-1-T1 Write `INVENTORY.md`: file-size matrix, function counts, section markers.
- [ ] P14-1-T2 Write `DEAD-CODE.md`: verified-dead symbols + grep proof.
- [ ] P14-1-T3 Purge in atomic commits.
- [ ] P14-1-T4 `14-1-SUMMARY.md` closure.

## Plan 14-2 — Runtime Module Split
- [ ] P14-2-T1 `MODULE-BOUNDARIES.md` (line ranges, entry symbols, shared-state touch matrix).
- [ ] P14-2-T2 Shared state seam (one accessor file, commit before extractions).
- [ ] P14-2-T3 Extract `viewport-zoom.js`.
- [ ] P14-2-T4 Extract `touch-gesture.js`.
- [ ] P14-2-T5 Extract `polygon-editor.js` (includes HF9-HF13 drag pipeline + stable anchor cache).
- [ ] P14-2-T6 Extract `room-overlay.js`.
- [ ] P14-2-T7 Extract `config-hydrate.js`.
- [ ] P14-2-T8 Extract `live-sync-glue.js`.
- [ ] P14-2-T9 Extract `draw-loop.js`.
- [ ] P14-2-T10 Extract `settings-panels.js`.
- [ ] P14-2-T11 Collapse the old file to a thin entry point.
- [ ] P14-2-T12 `14-2-SUMMARY.md` closure.
