# 8-HF3 Verification

Date: 2026-03-27
Plan: 8-HF3
Status: PASS

## Scope
- P8-T29..P8-T34
- `Board catalog + output` width/overflow hardening for long board names and info lines
- New outside mode `Outside Duststorm`
- Outside mask + server-authoritative sync/persistence parity (join/reconnect)

## Code/Runtime Checks
1. `node --check src/app.js` -> PASS
2. `node --check server.mjs` -> PASS

## Acceptance Mapping

1. **Board-Catalog-Output-No-Horizontal-Break-Test**
   - Evidence: dedicated panel containment class (`.board-catalog-output-panel`) with strict width/overflow guards (`min-width: 0`, `max-width: 100%`, `overflow-x: hidden`) and wrapped long button labels.
   - Files: `index.html`, `src/styles.css`
   - Result: PASS

2. **Board-Catalog-Output-Text-Guard-Test**
   - Evidence: board labels/info lines now run through overflow-safe formatting (`formatOverflowSafeText`) and status rows use robust break guards.
   - Files: `src/app.js`, `src/styles.css`
   - Result: PASS

3. **Board-Catalog-Output-Width-Stability-Test**
   - Evidence: dedicated regression artifact for desktop + narrow-view path.
   - Files: `.planning/phases/phase-08/P8-T31-WIDTH-REGRESSION.md`
   - Result: PASS

4. **Outside-Duststorm-Availability-Test**
   - Evidence: new selector option `outside-mode = duststorm` and runtime label support.
   - Files: `index.html`, `src/app.js`
   - Result: PASS

5. **Outside-Duststorm-Mask-Integrity-Test**
   - Evidence: duststorm renders through existing outside-only draw path (`drawOutsideFxLayer` + `clipToOutsideShip`), preserving strict inverse Play-Area clipping.
   - Files: `src/app.js`
   - Result: PASS

6. **Outside-Duststorm-Sync-Parity-Test**
   - Evidence: server-side outside-profile normalization and existing `outside-update` mutation/snapshot lane keep duststorm mode deterministic.
   - Files: `server.mjs`, `.planning/phases/phase-08/P8-T33-SYNC-REGRESSION.md`
   - Result: PASS

7. **Outside-Duststorm-Reconnect-Test**
   - Evidence: `outsideFxByBoard` snapshot shape unchanged; duststorm mode remains join/reconnect-compatible under authoritative hydration.
   - Files: `src/app.js`, `server.mjs`, `.planning/phases/phase-08/P8-T33-SYNC-REGRESSION.md`
   - Result: PASS

## Artifacts
- `.planning/phases/phase-08/P8-T31-WIDTH-REGRESSION.md`
- `.planning/phases/phase-08/P8-T33-SYNC-REGRESSION.md`
- `.planning/phases/phase-08/8-HF3-VERIFICATION.md`
