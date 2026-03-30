# P8-T64 Regression Matrix - Plan 8-HF7

Date: 2026-03-30
Status: PASS

## Scope
- P8-T59..P8-T64

## Regression Checks

1. **Boomerang decommission guard**
   - Check: no boomerang UI control and no active boomerang runtime branch.
   - Evidence: `index.html` (Outside section has no boomerang checkbox), `src/app.js` (outside playback has only forward/reverse handling).
   - Result: PASS

2. **Outside non-boomerang playback stability path**
   - Check: outside mp4 path remains deterministic for forward/reverse without boomerang state machine.
   - Evidence: `src/app.js` (`drawOutsideFxLayer` simplified playback key + reverse mapping).
   - Result: PASS

3. **Inside editor parity shell**
   - Check: dedicated `Inside Animations` settings section with dropdown + create flow exists.
   - Evidence: `index.html`, `src/app.js` (`syncInsideFxPanel`, create/select handlers).
   - Result: PASS

4. **Inside typed mapping + apply atomicity**
   - Check: `assetType` (`coded`/`gif`/`mp4`) typed picker + explicit `Apply changes` for inside definitions.
   - Evidence: `index.html` inside controls, `src/app.js` (`syncInsideResourcePicker`, `insideApplyChangesButton` handler).
   - Result: PASS

5. **Inside persistence/load/defaults migration stability**
   - Check: inside definition model is written/read via board profiles and included in migrated payloads/default flow.
   - Evidence: `src/app.js` (`buildBoardProfilesFromState`, `applyBoardProfilesToState`, live snapshot hydration), `src/app/persistence/board-profiles.js` migration mapping.
   - Result: PASS
