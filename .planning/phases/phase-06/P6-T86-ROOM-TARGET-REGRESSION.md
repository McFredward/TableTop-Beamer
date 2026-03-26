# P6-T86 Regression - Room Target Path Non-Regression (HF12)

Date: 2026-03-26  
Scope: `targetType=room` under HF12 cluster-controller dedupe changes

## Checks Executed

1. Syntax checks
   - `node --check src/app.js`
   - `node --check server.mjs`
   - Result: PASS

2. Room trigger path unchanged
   - Room-target start still creates exactly one room-scoped running instance for the selected room.
   - No CLUSTER controller is introduced for `targetType=room`.
   - Result: PASS

3. Room edit/stop lifecycle unchanged
   - Editing a room-scoped running instance updates the same `animation.id` in place.
   - Stopping a room-scoped instance removes only that room run unless it is explicitly linked to a cluster parent.
   - Result: PASS

## Result

HF12 cluster dedupe/fanout hardening does not alter the single-room target flow. `targetType=room` remains deterministic for start/edit/stop.
