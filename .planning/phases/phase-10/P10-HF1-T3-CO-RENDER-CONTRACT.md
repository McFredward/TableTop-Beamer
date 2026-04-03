# P10-HF1-T3 Co-Render Contract Enforcement

## Contract
`/output/final` must keep both active layer families renderable:
- outside layer (outside animation)
- room layer (room animation)

## Enforcement
- Outside/play-area clipping now fails open when clip polygons are invalid/degenerate.
- Room clipping now fails open when room polygons are invalid/degenerate.
- Result: board-specific clip edge-cases no longer collapse final composition to persistent black.

## Non-goal
- Sync/order/version/idempotency behavior is unchanged in this task.
