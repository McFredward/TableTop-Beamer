# ACCEPTANCE — Phase 14

## Hard gates (must all pass before phase close)

### Size
- [ ] `wc -l src/app/runtime/runtime-orchestration.js` < 1500.
- [ ] Every file under `src/app/**` < 1500 LOC (soft cap) or < 2000 LOC (hard cap) with explicit justification in its closest SUMMARY.

### Structure
- [ ] At least the following modules exist under `src/app/runtime/**`:
  - `viewport-zoom.js`
  - `touch-gesture.js`
  - `polygon-editor.js`
  - `room-overlay.js`
  - `draw-loop.js`
  - `live-sync-glue.js`
  - `config-hydrate.js`
  - `settings-panels.js`
- [ ] No circular imports among the new modules.
- [ ] `runtime-orchestration.js` is a thin entry that imports from those modules and wires DOM listeners.

### Non-regression
- [ ] `node debug/p11-hf6-acceptance-regression.mjs` PASS.
- [ ] `node debug/p12-1-acceptance-regression.mjs` PASS.
- [ ] `node debug/p13-1-acceptance-regression.mjs` PASS.
- [ ] `node debug/p13-2-acceptance-regression.mjs` PASS.
- [ ] `node debug/p13-3-acceptance-regression.mjs` PASS.
- [ ] `node debug/p13-hf7-acceptance-regression.mjs` PASS.
- [ ] `node debug/p13-hf8-acceptance-regression.mjs` PASS.
- [ ] `node debug/p13-hf9-acceptance-regression.mjs` PASS.
- [ ] `node debug/p13-hf10-acceptance-regression.mjs` PASS.
- [ ] `node debug/p13-hf11-acceptance-regression.mjs` PASS.
- [ ] `node debug/p13-hf12-acceptance-regression.mjs` PASS.
- [ ] `node debug/p13-hf13-acceptance-regression.mjs` PASS.

Note: HF12 gates check for literal `createFrozenRoomTransform` / `projectDisplayToRawWithFrozenTransform` / `dragFrozenTransform` references; HF13 explicitly asserts they are **removed**. HF12 therefore cannot pass after HF13 and must not be re-enabled by the refactor. Only HF13 is a live non-regression gate; HF12 is historical (superseded).

### Dead-code
- [ ] No `// removed` / `// legacy` / `// TODO (unclaimed)` blocks remain in `src/app/**`.
- [ ] `DEAD-CODE.md` exists with one entry per removed symbol and a grep proof.

### Startup
- [ ] Dev server starts without runtime errors.
- [ ] In-browser smoke: settings panel renders, a board/room is selectable, zoom works, polygon editor opens, a polygon vertex drag completes without console errors.
