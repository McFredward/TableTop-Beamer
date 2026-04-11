# Plan 9-1 Extraction Boundary Map

## Scope Map (`src/app.js` -> module owners)

| Responsibility Group | Current Anchor in `src/app.js` | Target Module Ownership |
| --- | --- | --- |
| Startup orchestration, boot lifecycle | `initializeApplication`, final bootstrap call | `src/app/lib/boot/*` |
| Runtime state creation/selectors and sync caches | `state`, `liveSync`, mutation tracking helpers | `src/app/lib/state/*` |
| Board/room/play-area business rules | room/play-area target resolution and animation-domain helpers | `src/app/lib/domain/*` |
| Viewport, clip/mask and draw lifecycle | stage viewport lifecycle, render guards, draw loop | `src/app/lib/render/*` |
| Dashboard/settings panel synchronization | runtime-to-control sync and panel refresh contracts | `src/app/lib/ui/*` |
| Input arbitration and gesture guards | pan/touch arbitration, anti-double-tap, interaction guards | `src/app/lib/input/*` |
| Persistence and migration flows | board-profile save/load/migration adapters | `src/app/lib/persistence/*` |
| API endpoint resolve/preflight/save | global-defaults endpoint diagnostics and save/load transport | `src/app/lib/api/*` |
| GIF/media lifecycle | GIF warm/decode/playback primitives | `src/app/gif/*` |
| Pure/shared helpers and logging | env/runtime metadata, logger, reusable pure utilities | `src/app/lib/shared/*` |

## Incremental Extraction Sequence (branch-by-abstraction)

1. **Boot seam:** route app start through dedicated boot composition helper.
2. **Shared seam:** extract runtime-env and small pure helpers used by startup and sync.
3. **State seam:** extract live-sync state factory + mutation trace helpers.
4. **Domain seam:** extract live/domain key builders and context metadata helpers.
5. **UI seam:** extract runtime panel synchronization controller as callable adapter.
6. **Input seam:** extract tap/trigger arbitration helpers.
7. **Render/GIF seam:** extract viewport lifecycle scheduler helpers and bind via adapters.
8. **Comments + logs:** add non-obvious lifecycle comments and structured low-noise diagnostics.

## Rollback Notes (per slice)

- **Boot seam rollback:** switch final startup call back to `window.TT_BEAMER_BOOT.run(initializeApplication)`.
- **Shared seam rollback:** inline `resolveOutputRoleFromLocation` / websocket URL helper in `src/app.js`.
- **State seam rollback:** restore local `liveSync` object + helper functions.
- **Domain seam rollback:** restore local key builder functions in `src/app.js`.
- **UI seam rollback:** restore inline `syncRuntimePanelsFromState` function body.
- **Input seam rollback:** restore inline `shouldSuppressRapidTap` / `recordTriggerIntent` functions.
- **Render/GIF seam rollback:** restore local viewport scheduling functions.

All slices remain source-compatible by keeping function signatures and call sites stable until parity is verified.
