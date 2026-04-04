# P10-HF2-T1 Repro Trace - Cross-Browser Polygon Hydration/Apply

## Scope
- Startup/reload hydration path for board polygons (`playAreas`, legacy aliases, inside/outside polygon aliases)
- `Load & apply defaults` precedence behavior
- `/output/final` clip source hydration

## Reproduced Failure Modes (pre-fix)
1. **Alias-only polygon payloads** (`inside.polygon`, `outside.polygon`, `insidePolygon`, `outsidePolygon`) were not normalized consistently into the canonical runtime play-area contract.
2. **Degenerate polygon acceptance** (>=3 points but near-zero area) survived normalization and reached render-time clipping.
3. **Defaults apply silently replacing board polygons** happened when defaults payload was applied wholesale to state.
4. **Final-output blackout path** occurred when outside render path used effectively invalid clip geometry and fell back to full-frame outside draw.

## Root-Cause Summary
- Canonical polygon hydration was only partially alias-aware in migration paths.
- Polygon validity checks were mostly "point count" based and not area-aware during normalization.
- Global defaults apply path replaced board profiles without preserving persisted local polygon ownership.
- Clip polygon source could be read from non-normalized board arrays, allowing drift between persisted and render-time geometry.

## Fix Direction Chosen
- Normalize all polygon aliases into one canonical play-area contract before apply/hydration.
- Validate normalized polygons with area guard to reject degenerate geometry.
- Preserve local persisted board polygons during defaults-apply unless explicit polygon reset flow is introduced.
- Resolve final clip sources via canonical `getPlayAreas()` path for control and `/output/final` parity.
