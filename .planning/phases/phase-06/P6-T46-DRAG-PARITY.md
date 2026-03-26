# P6-T46 Verification - Drag Parity After No-Move Click Fix

Date: 2026-03-26
Scope: P6-T46

## Checks Executed

1. Syntax check
   - `node --check src/app.js`
   - Result: PASS

2. Drag promotion threshold unchanged
   - `maybePromotePendingPolygonAreaDrag` still promotes only when movement distance is `>= 0.0025`.
   - Result: PASS

3. No-move click remains drag-free
   - Pending pointer sessions are cleared on pointer-up and now preserve persistent selection visibility without forcing drag.
   - Result: PASS

4. Hold/move drag path intact
   - Pointer lifecycle for promoted area drag still uses `finishPolygonAreaDrag` and preserves moved-state persistence semantics.
   - Result: PASS

## Final Result

Drag parity is preserved: selection click remains drag-free, while hold/move drag keeps existing promotion + move behavior.
