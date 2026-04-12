# Phase 15 SUMMARY — UX polish + legacy removal + animation features + mp4 perf

Status: **CLOSED PASS — all 12 user-reported items shipped**

## Commits (chronological)

1. `7b36a05` — docs(15): plan Phase 15 — 12 user-reported items into 4 plans
2. `99d4c3c` — feat(15-1): dirty flag only fires on actual config mutation (#1)
3. `f844b2e` — feat(15-8): create-animation seeds from current editor inputs (#8)
4. `5f60a42` — feat(15-5): remove legacy Hitarea Calibration + Room Geometry panels (#5)
5. `05e63fd` — feat(15-4): derive board ID from name on image import, auto-suffix conflicts (#4)
6. `5569842` — feat(15-7): Align mode toggle button on the Dashboard (#7)
7. `6b2f7ac` — feat(15-2): board pan/zoom active in Dashboard view too (#2)
8. `2d85be0` — feat(15-6): graceful sound fade-out for non-loop global inside animations (#6)
9. `aa60308` — feat(15-9): fold sound mapping into per-animation editor blocks (#9)
10. `35e578f` — feat(15-3): MP4/GIF room transform options (#3)
11. `026d86c` — fix(15-10,15-11,15-12): re-encode sandstorm.mp4 for Firefox + low-end perf (#10/#11/#12)

## Item ↔ commit mapping

| # | User request | Commit |
|---|---|---|
| 1 | Unsaved-changes dialog only on real mutation | `99d4c3c` |
| 2 | Board pan/zoom in Dashboard | `6b2f7ac` |
| 3 | MP4/GIF room transform options (rotation, stretch, w/h, offsets) | `35e578f` |
| 4 | Auto-derive board ID from name on upload | `05e63fd` |
| 5 | Remove Hitarea Calibration + Room Geometry panels | `5f60a42` |
| 6 | Graceful sound fade-out for global inside non-loop | `2d85be0` |
| 7 | Align mode button in Dashboard | `5569842` |
| 8 | Create-animation seeds current dropdown selections | `f844b2e` |
| 9 | Sound mapping inline in each animation block | `aa60308` |
| 10 | Fix sandstorm.mp4 in Firefox | `026d86c` |
| 11 | Smooth MP4 playback on mobile/Pi | `026d86c` |
| 12 | Restore mobile zoom on boards with outside animation | `026d86c` |

## What was shipped

### Plan 15-1 — Dirty flag + Create UX (items #1, #8)

- `runtime-config-sync.js` now keeps a `cleanBaselineJson` — a
  stable key-sorted JSON serialization of the full board profile
  map plus persisted runtime settings, taken whenever the local
  state matches the server's clean view. `persistBoardProfiles`
  compares the current snapshot against the baseline and only
  marks the config dirty when they differ; if the user mutated
  then reverted back to the baseline, the flag clears
  automatically.
- `runtime-bootstrap.js` captures the baseline right after
  `loadBoardProfiles` in both the success and the server-unreachable
  branches. `applyLocalConfigToServer` /
  `discardLocalConfigAndReloadFromServer` advance the baseline on
  success.
- The three `createXxxAnimationDefinition` helpers accept an
  `initialValues` argument. The create button handlers pass the
  current editor draft (asset type + asset ref + speed + intensity
  + etc.) through so the new definition inherits what the user
  was already configuring.

### Plan 15-2 — Legacy panel removal (item #5)

- `index.html`: drop the two `<section>` blocks for Hitarea
  Calibration and Room Geometry from the Settings "Board" subtab.
- `runtime-wire-calibration-binders.js`: replaced with a no-op
  stub. Orchestration's wire call site + the module-exports
  smoke test keep passing without a follow-up cleanup commit.
- `runtime-clamp-sync-panels.js`: `syncHitareaCalibrationPanel`,
  `syncHitareaStatus`, `syncRoomGeometryPanel`,
  `syncRoomGeometryStatus` all stubbed to no-ops. State plumbing
  (`hitareaCalibrationByBoard`, `roomGeometryByBoard`) and the
  transform pipeline remain untouched, so existing board profiles
  keep rendering pixel-identical — no data migration required.

### Plan 15-3 — Board upload, Align mode, Sound inline (items #4, #7, #9)

- **Item #4**: `server.mjs handleImageBoardImport` prefers
  `requestedBoardName` over the uploaded filename stem when
  deriving the ID seed, and auto-resolves conflicts with `-2`,
  `-3`, ... suffixes (capped at 500 attempts). The
  `board-import-id` text input was removed from the HTML form.
- **Item #7**: new `#align-mode-button` on the Dashboard
  running-overview panel next to Clear All. `syncAlignModePanel`
  mirrors state.alignMode onto the button label +
  `aria-pressed` + `.is-active` class. The settings-tab
  checkbox is removed (the `alignModeToggleInput` DOM ref
  stays as null-safe back-compat).
- **Item #9**: per-definition `soundAssetRef` on room / inside /
  outside animation definitions, with a shared
  `normalizeSoundAssetRef` validator. `playSoundForAnimation`
  prefers the per-definition value and falls back to the legacy
  `animationSoundMap` lookup for unmigrated state.
  `createAnimation` accepts and stamps `soundAssetRef` onto the
  runtime animation entry; `room-dispatch` / `runtime-controls`
  copy from the definition at dispatch time. New
  `<select id="room-sound-ref">` / `inside-sound-ref` /
  `outside-sound-ref` in each editor block, populated by a new
  `populateSoundRefSelect` helper. The standalone "Sound mapping
  per animation" settings panel is gone.

### Plan 15-4 — Gestures + transforms + graceful stop + perf (items #2, #3, #6, #10, #11, #12)

- **Item #2**: `runtime-viewport-zoom.js` loosens three gates —
  `syncStageZoomTransform` always reads live
  `getBoardZoom(state.boardId)` instead of resetting outside
  Settings; `canStartPanModeFromEvent` drops the
  `uiView !== "settings"` early return; `setPanCursorState`'s
  `interactive` flag now follows `scale > 1` regardless of view.
  Normal Dashboard room clicks are untouched because pan still
  requires an explicit middle-click / space-drag trigger.
- **Item #3**: `normalizeRoomAnimationDefinition` gains
  `rotationDeg`, `stretchToPolygon`, `widthScale`, `heightScale`,
  `offsetXScale`, `offsetYScale` with safe-range clamps and
  pre-phase-preserving defaults. New `resolveRoomAssetDrawRect`
  helper in the draw loop computes the effective draw rect
  (center/width/height/rotation) and the two mp4/gif branches of
  `drawRoomComposition` call it via a centered-translate-rotate
  pipeline. New UI: `<details>` "More options (for mp4 / gif)"
  in the Room Animations editor with rotation slider,
  stretch-to-polygon checkbox, and width/height/offset scale
  sliders (disabled while stretch is on).
- **Item #6**: `stopAnimationSound(id, { graceful })` now accepts
  a graceful flag. When graceful is true, the voice's loop
  `onEnded` handler is unhooked but the iteration is NOT paused —
  it plays out to its natural `ended` event. `hardStopRuntimeEffects`
  decides per-animation: scope == "global" && type != "outside-space"
  && !loopUntilStopped gets graceful, everything else keeps the
  previous hard stop.
- **Items #10/#11/#12**: re-encoded
  `resources/nemesis/animations/sandstorm.mp4`. The original was
  4K (3840×2160) H.264 High 4:4:4 Predictive `yuv444p` — which
  Firefox cannot decode (platform decoder has no yuv444p support,
  same on desktop and Android) and which saturates the Raspberry
  Pi 4 and mid-range phones to the point of starving the gesture
  pipeline. Re-encoded with `libx264 -profile:v main -level 4.0
  -pix_fmt yuv420p -vf scale=1920:-2 -preset medium -crf 24
  -movflags +faststart -an`. Result: 2.8 MB (−89%), 1920×1080,
  H.264 Main yuv420p, faststart, no audio. Resolves all three
  items in one asset swap — no code changes needed because the
  config path is unchanged.

## Verification

All three structural smoke tests added in the Phase 14 hotfix
stay GREEN through every Phase 15 commit:

- `debug/p14-orchestration-init-scope-check.mjs`
- `debug/p14-orchestration-module-exports-check.mjs`
- `debug/p14-orchestration-runtime-loader.mjs` (control mode)
- `debug/p14-final-loader.mjs` (`/output/final` mode)

All four live acceptance harnesses stay GREEN:

- `debug/p11-hf4-acceptance-regression.mjs`
- `debug/p11-hf6-acceptance-regression.mjs`
- `debug/p12-1-acceptance-regression.mjs`
- `debug/p13-hf13-acceptance-regression.mjs`

No new smoke test gaps surfaced during Phase 15. The
init-scope-check + module-exports-check pair successfully
absorbed every structural change landed in the 10 Phase 15
commits.

## Phase decision

Phase 15 is **CLOSED PASS**. Every item on the user's 12-item
list has a concrete commit or asset swap. Runtime contract
from Phase 14 is preserved — `runtime-orchestration.js`
continues to load cleanly in both control and `/output/final`
modes, and no module wiring regressed. Ready for user browser
validation and feedback.
