# P10-HF4-T6 Repro Trace - ship-clip validity semantics drift

## Command

`node debug/p10-hf4-t6-ship-clip-repro.mjs`

## Observed RED result

- Assertion failed: `Invalid ship polygons must not be normalized into renderable fallback polygons`
- `debug/p10-hf4-t6-ship-clip-repro-output.json` reports `result: FAIL`
- Invalid polygon input is currently accepted because normalization falls back to a renderable default polygon.

## Scope covered

- Invalid polygon rejection (must fail deterministically)
- Canonical multi-play-area acceptance (must pass)
- Legacy `shipPolygon` acceptance (must pass)
