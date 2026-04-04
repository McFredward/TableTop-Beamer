# P10-HF4-T7 Fix - browser-neutral ship-clip validity semantics

## Change

- Added `extractRenderablePlayAreaPolygons` to polygon contract for strict clip-source selection.
- Clip-source behavior now rejects invalid provided polygons instead of silently normalizing them to renderable defaults.
- Runtime clip paths (`clipToInsideShip`, `clipToOutsideShip`) now return `false` when no renderable canonical polygons exist.
- Final clip pixel extraction uses strict canonical polygons from board state, with default fallback only when no play-area data exists at all.

## Verification

- `node debug/p10-hf4-t6-ship-clip-repro.mjs` -> PASS
