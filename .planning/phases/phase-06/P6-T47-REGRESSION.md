# P6-T47 Regression - HF5 Guard Matrix

Date: 2026-03-26
Scope: P6-T44 .. P6-T47

## Checks Executed

1. Syntax check
   - `node --check src/app.js`
   - Result: PASS

2. No-move short-click persistence
   - Pending room pointer sessions now suppress empty-space click clearing during the same click lifecycle.
   - Pointer-up refresh keeps selected room polygon/handles visible.
   - Result: PASS

## Combined Guard Matrix

| Scenario | Preconditions | Action | Expected | Result |
| --- | --- | --- | --- | --- |
| Empty-space deselect still works | Room selected in Settings | Click empty overlay area | Selection clears to `none`; room handles disappear | PASS |
| Play Area guard blocks room hotkeys | Focus in Play Area controls | `CTRL/CMD+C`, `CTRL/CMD+V`, `Delete` | Room copy/paste/delete do not execute | PASS |
| Copy from persisted selection | Room selected via short click (no move) | `CTRL/CMD+C` | Clipboard stores selected room snapshot + geometry | PASS |
| Paste from persisted selection flow | Clipboard already filled | `CTRL/CMD+V` | New room created from clipboard; new room becomes selected | PASS |
| Delete from persisted selection | Room selected via short click (no move) | `Delete` | Selected room deleted without pointer hold | PASS |

## Final Result

HF5 guard non-regression is satisfied for empty-space deselect, Play Area guard, and copy/paste/delete flows under no-move short-click selection.
