# P10-HF8-T9 — All-board regression matrix (single/multi/imported)

- Script: `node debug/p10-hf8-t9-all-board-regression-matrix.mjs`
- Output: `debug/p10-hf8-t9-all-board-regression-matrix-output.json`
- Result: **PASS**

Matrix coverage:

- Browsers: Chrome, Firefox, mobile-class Chrome
- Surfaces: control, `/output/final`
- Lifecycle: startup, reload, apply-defaults, board-switch
- Boards: single-area, multi-area, imported multi-area

All lanes preserve canonical selected area + area-id set with zero canonical-issue noise on valid payloads.
