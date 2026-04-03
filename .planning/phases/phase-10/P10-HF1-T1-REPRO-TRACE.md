# P10-HF1-T1 Reproduction and Root-Cause Trace

## Scope
- Board: `nemesis-lockdown-a` (`Nemesis Lockdown A`)
- Final route: `/output/final`
- Outside asset: `sandstorm.mp4`

## Deterministic Failure Chain (pre-fix)
1. Final compositor enters outside layer path (`drawOutsideFxLayer`).
2. Outside/inside clipping uses polygon clip guards that can return `false` on invalid or degenerate clip geometry.
3. Room rendering also depends on strict room polygon clipping; invalid room polygons return early.
4. With board-specific malformed/degenerate clip data, both outside and room layers can be skipped in the same frame.
5. `/output/final` then clears the canvas and presents persistent black output (fail-closed behavior).

## Root Cause
- Final render path used **fail-closed clipping semantics** for board-specific polygon edge-cases.
- A bad clip path in outside/play-area or room polygon flow could suppress whole visual layers in the same frame.
- This violated the HF1 render contract (`fail-open` under clip/readiness issues).

## Fix Target
- Switch final compositor clipping behavior to fail-open for invalid/degenerate polygon inputs.
- Keep sync/control behavior unchanged.
