# Plan 8-HF2 Verification

Date: 2026-03-27
Status: PASS

## Scope
- P8-T25..P8-T34 (Outside Animations Mars Feature Pack)

## Automated Evidence

1. **Syntax/Runtime guard**
   - Command: `node --check src/app.js && node --check src/app/shared/config.js && node --check src/app/persistence/board-profiles.js && node --check server.mjs`
   - Result: PASS

2. **Resource picker API availability**
   - Command flow: start `node server.mjs`, query `GET /api/resources`, stop server
   - Evidence: `debug/p8-hf2-api-resources.json`
   - Result: PASS (`sandstorm.mp4`, GIF assets, sound assets listed from `/resources`)

3. **API baseline still healthy**
   - Evidence: `debug/p8-hf2-api-health.json`
   - Result: PASS (`postSupported: true`)

## Acceptance Matrix (HF2)

- Outside Sandstorm available and mapped to `sandstorm.mp4`: **PASS**
- Outside Sandstorm muted (no audio path): **PASS**
- Per-animation boomerang playback option implemented: **PASS**
- Outside settings moved out of Play Area Editor into `Outside Animations`: **PASS**
- Dropdown-based outside animation editor: **PASS**
- Asset mapping editor (`coded`/`gif`/`mp4` + `assetRef`): **PASS**
- UI create flow for new outside animations: **PASS**
- Resource asset picker backed by `/api/resources`: **PASS**
- Persistence/load/default guards for outside definitions and options: **PASS**

## Notes
- `Outside Animations` now owns all outside configuration controls.
- Legacy outside payloads (`outside`, `outsideAnimations`, `selectedOutsideAnimationId`) are normalized into canonical `outsideFx` definitions.
