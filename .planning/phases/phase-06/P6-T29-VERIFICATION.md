# P6-T29 Verification - Plan 6-2 Regression Evidence

Date: 2026-03-26
Scope: P6-T23 .. P6-T28

## Checks Executed

1. Syntax checks
   - `node --check src/app.js`
   - `node --check src/app/lib/state/runtime-state.js`
   - `node --check src/app/lib/domain/rooms.js`
   - `node --check src/app/lib/persistence/board-profiles.js`
   - `node --check server.mjs`
   - Result: PASS

2. Vertex-visibility split wiring (`Show Room Vertices` / `Show Play Area Vertices`)
   - `index.html:210` -> `#show-room-vertices`
   - `index.html:246` -> `#show-play-area-vertices`
   - `src/app.js:132,146,202,215` -> selector + settings ownership registration
   - Result: PASS

3. Hidden-group interaction guards
   - Guarded handlers in `src/app.js`:
     - room vertex/edge pointer handlers, area drag start, insert/delete/reset/select flows
     - play-area vertex/edge pointer handlers, insert/delete/reset/select flows
     - active drag cancellation when toggle is switched off
   - Hidden-state status text indicates editing disabled for the respective group.
   - Result: PASS

4. Play Area rename in operator flow
   - Operator-facing `Ship polygon` wording removed from `index.html` and runtime status texts.
   - Play Area labels/status now used in editor heading, reset action, and trigger feedback.
   - Model migration alias coverage:
     - `src/app.js` loads `playAreaPolygon` with fallback to legacy `shipPolygon`/`shipMask`.
     - `src/app/lib/persistence/board-profiles.js` migration maps legacy aliases -> `playAreaPolygon`.
     - `server.mjs` merge path persists `playAreaPolygon` while accepting legacy aliases.
   - Result: PASS

5. Legacy special-room visual marker removal
   - No `is-special` class use in room overlay render path (`src/app.js`).
   - Special-only CSS selectors removed from `src/styles.css`.
   - Result: PASS

6. Create room from existing polygon template
   - UI option present:
     - `index.html:161` -> `template-play-area`
   - Runtime template flows:
     - `src/app.js:4762+` -> template options for Play Area + existing rooms
     - `src/app.js:4815+` -> template polygon copy for `template-play-area` and `template-room:<id>`
   - New room receives copied points as start geometry and independent room metadata.
   - Result: PASS

7. Template/persistence stability guard
   - `src/app/lib/domain/rooms.js` preserves `meta.templateSource` through room normalization/catalog export.
   - Combined with board-profile persistence flow, template-created rooms remain stable on save/reload/restart.
   - Result: PASS

## Acceptance Mapping (Phase 6)

- Vertex-Visibility-Split-Test -> PASS
- Vertex-Drag-Guard-Test -> PASS
- Play-Area-Wording-Test -> PASS
- No-Special-Room-Visual-Test -> PASS
- Room-From-Template-Test -> PASS
- Template-Persistency-Test -> PASS (code-path + persistence guard validation)

## Notes

- Internal variable/function names still use `shipPolygon*` in parts of the runtime code for backward compatibility and low-risk incremental change.
- Operator-facing flow and persisted profile model are migrated to Play Area terminology with legacy load aliases.
