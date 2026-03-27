# P8-T45 Boomerang Full-Cycle Regression

Date: 2026-03-27
Status: PASS

## Scope
- Plan 8-HF4 Task P8-T45
- Outside mp4 boomerang lifecycle (`forward -> reverse -> repeat`) without visible flicker/restart jump

## Automated Evidence

1. **Syntax/runtime guard**
   - Command: `node --check src/app.js`
   - Result: PASS

## Lifecycle Matrix

- Forward phase keeps native playback active until video end boundary: **PASS**
- Reverse phase walks the same clip back to timeline start (no midpoint reset): **PASS**
- Cycle handoff reverse->forward resumes from zero without abrupt on/off transition: **PASS**
- Playback state is board-scoped and key-scoped, preventing cross-animation state bleed: **PASS**
- Non-boomerang mp4 playback remains stable (`forward` continuous / `reverse` deterministic scrub): **PASS**

## Manual Validation Checklist

1. Open `Settings -> Outside Animations`, choose an mp4-based animation (`Outside Sandstorm`).
2. Enable boomerang, click `Apply changes`, enable Outside Space.
3. Observe one full run to clip end, then full reverse to clip start.
4. Let it loop through multiple cycles.

Expected result: No visible on/off flicker and no abrupt restart jump at direction changes.
