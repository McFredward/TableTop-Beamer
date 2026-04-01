# P8-T92 Speed + Opacity Persistence Regression

Status: PASS
Date: 2026-04-01

## Coverage

1. Room editor exposes one shared `Speed` control for room animations; no dedicated GIF speed control exists in settings.
2. Runtime uses unified room speed semantics for all room asset types (`coded` / `gif` / `mp4`):
   - GIF timeline speed comes from `animation.speed` (legacy `playbackSpeed` remains fallback-only).
   - Coded room effects use the same speed multiplier path.
   - MP4 room playback rate stays sourced from `animation.speed`.
3. `Opacity` remains type-agnostic and active for room runs, including `assetType=mp4`.
4. `Apply changes`, Save/Reload/Restart and Defaults load keep using unchanged room profile/schema paths (`roomFx` definitions), so speed/opacity runtime draft behavior remains deterministic without introducing new persistence branches.

## Evidence

- `rg -n "room-playback-speed|GIF Playback Speed" index.html src/app.js src/app/state/runtime-state.js` returns no matches.
- `rg -n "gifPlaybackSpeed: clampRoomSpeed|clampRoomSpeed\(animation\.speed \?\? animation\.playbackSpeed|playbackSpeed: draftPayload\.speed" src/app.js` confirms unified speed wiring.
- `rg -n "roomOpacityInput\.disabled\s*=\s*!|syncGifRoomControls|isGifRoomAnimation" src/app.js` returns no matches (no type-specific opacity disable path).
