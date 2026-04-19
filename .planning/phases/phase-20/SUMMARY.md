---
phase: 20
title: Quality-of-life fixes + per-board board packages + Outside animation overhaul
status: CLOSED
closed_at: 2026-04-19
---

# Phase 20 Closure — QoL fixes, Board Packages, Outside Rewire

Phase 20 started as the six user-listed QoL items and grew into a sizeable
Outside-animation rewire plus a full .zip-based board package format.

## Shipped

### Original six items

1. **Clear All** gained a `Also clear default animations` checkbox. By default, Clear All keeps default (outside / auto-started) animations running and only stops user-initiated ones. Checkbox-on restores the old "stop everything" behavior. Plumbed through the live-sync `clear-all` mutation so server + all clients agree.
2. **Play-area polygon double-click bug** fixed. Old code spliced the `*1000` SVG-display point array and passed it to `setShipPolygonPoints`, which then stored values ~1000× too large and got reset by the next `normalizeShipPolygon` call. Handler now works in normalized 0–1 space like the room editor.
3. **Animation editor two-tab UI** (Inside / Outside / Room). Each section now has `Create new` / `Edit existing` tabs. Create is just a name field + button; it makes the definition with defaults and flips to Edit with the new animation preselected. Eliminates the old confusing flow.
4. **Dropdown labels** stripped the `(internal-id)` suffix. `Hull Flicker`, not `Hull Flicker (hull-flicker)`.
5. **README** expanded with a full "Using the app" chapter covering Dashboard, Settings, rooms, play areas, clusters, animations, sounds, custom assets, boards, export/import, and align mode.
6. **Per-board board package** under a new "Share a Board" panel. Single file input that accepts both a board package and a raw image for a fresh board. Old Board Setup import/export controls removed.

### Board package format — three iterations

- v1: JSON with base64-embedded board image.
- v2: JSON that also bundles base64 of every referenced GIF / MP4 / sound asset.
- v3 (final): **Real `.zip`** with a `package.json` manifest plus the board image and `resources/…` assets at their canonical paths. Implemented a ~150-line pure-Node ZIP encoder/decoder using built-in `node:zlib` — no new npm dependencies. Already-compressed media (mp4/mp3/gif/png/jpg/webp) stored uncompressed to avoid wasting CPU. Import skips existing files so identical assets don't duplicate on disk.

### Outside animation rewire

The Outside animation editor and dispatch path were substantially reworked:

- **Editor dropdown no longer switches the running animation.** A UI-only per-board `outsideEditingAnimationIdByBoard` tracks which definition is displayed in the Edit tab. The persisted `selectedAnimationId` (what plays) stays untouched until the user actually triggers via the dashboard.
- **Dashboard renders one button per outside animation** (like Inside). The hardcoded `<button data-global="outside-space">Outside Space</button>` is gone — `renderOutsideGlobalButtons()` populates from the outside profile.
- **Delete button** added to Outside Edit tab (with "keep at least one" guard).
- **Only one outside plays at a time.** Starting a new outside stops any other that's running on the same board.
- **`isOutsideAnimationType(type, boardId)` central helper** eliminates a dozen hardcoded `"outside-space"` checks scattered across render / audio / lifecycle / controls code. Any animation id in the board's outside profile is now first-class — custom Outside animations work the same as built-ins.

## Bug fixes during iteration

- `applyTransform` in `runtime-projection-mapping.js` wrote `stage.style.transform = "none"`, killing the control client's CSS zoom/pan. Turned into a true no-op.
- Wheel/pinch gesture binder now early-returns on FINAL so `/output` isn't zoom-interactive.
- `isTypingShortcutTarget` relaxed so the Clear-All checkbox (and other non-text inputs) don't block polygon Ctrl+Z.
- Null-board guards added to `getSpecialRooms` and `renderRoomOverlay` so init-time nav regression doesn't throw.
- Polygon Ctrl+Z subtab gate dropped — works in any Settings subtab.
- Align-mode context menu now dismisses on capture phase so `stopPropagation` in drag handlers doesn't leave it stuck.
- `clampOutsideIntensity` / `clampOutsideSpeed` had `ctx.OUTSIDE_FX_DEFAULT.intensity/.speed` fallbacks, but that constant has no such keys. Any falsy input produced NaN, which then propagated: the editor showed `NaN`, the renderer used `NaN` alpha → outside layer invisible (black). Replaced with literal defaults and `Number.isFinite` checks.
- `syncRuntimePanelsFromState` was re-syncing Room + Outside panels on Discard but not Inside — Inside sliders stuck on the discarded value. Added.
- Outside animation edits were being lost across off/on toggle: some server-side stop/start patches wrote a partial outside profile (no `animations` array) and the client's normalize refilled from hard-coded defaults. The snapshot-apply path now preserves the local `animations` array when the incoming profile doesn't carry one.

## Key Files Touched

- `server.mjs` — clear-all reducer flag, pure-Node ZIP encoder/decoder, board-package export/import, projection profiles (carried forward from Phase 19), outside `selectedAnimationId` on trigger-global.
- `src/app/runtime/viewport/runtime-projection-mapping.js` — `applyTransform` no-op.
- `src/app/runtime/wire/runtime-wire-stage-gesture-binders.js` — FINAL early-return.
- `src/app/runtime/animation/runtime-room-management.js` — `isTypingShortcutTarget` narrowing.
- `src/app/runtime/state/runtime-board-state-accessors.js` — null-board fallback.
- `src/app/runtime/polygon-editor/runtime-polygon-editor.js` — null-board guard + play-area vertex fix.
- `src/app/runtime/state/runtime-fx-normalizers.js` — new `isOutsideAnimationType`.
- `src/app/runtime/panels/runtime-fx-panels.js` — outside editing id, outside global buttons, outside mirror using `selectedAnimationId` for the running type.
- `src/app/runtime/panels/runtime-clamp-sync-panels.js` — NaN-safe outside clamps.
- `src/app/runtime/wire/runtime-wire-fx-panel-binders.js` — two-tab switcher, outside delete, dropdown-does-not-switch-running logic.
- `src/app/runtime/wire/runtime-wire-overlay-window-binders.js` — any-subtab polygon Ctrl+Z.
- `src/app/runtime/wire/runtime-wire-room-audio-binders.js` — bundle export/import, ZIP upload path.
- `src/app/runtime/animation/runtime-runtime-controls.js` — clearDefaults plumbing, isOutside via profile, stop-other-outside.
- `src/app/runtime/animation/runtime-animation-lifecycle.js` — outsideHint for any outside type, enabled=false on stop for custom outside.
- `src/app/runtime/render/runtime-draw-loop.js` — outside-layer skip for any outside type.
- `src/app/runtime/render/runtime-audio.js` — short-circuit for any outside type.
- `src/app/runtime/live-sync/runtime-live-sync-core.js` — preserve local `animations` on partial snapshots.
- `src/app/lib/ui/runtime-panels-controller.js` — Inside sync on discard.
- `src/app/runtime/runtime-orchestration.js` — threaded `isOutsideAnimationType` into every consumer's ctx.
- `src/app/runtime/core/runtime-bootstrap.js` — Inside sync wiring.
- `src/app/runtime/core/runtime-dom-refs.js` — new refs (Clear All checkbox, outside global container, outside delete button, bundle widgets).
- `index.html` — Clear All checkbox, Share a Board panel, animation tabs, outside global container, outside delete.
- `src/styles.css` — `.animation-tabs` / `.animation-tab-button` / `.animation-tab-panel`.
- `README.md` — "Using the app" chapter.

## Decisions Worth Remembering

- **Hardcoded built-ins only where they're genuinely built-in.** Animation definition IDs (`outside-sandstorm` etc.) must never be hardcoded into dispatch logic. Use the board's profile as the source of truth; fall back to a single literal only as a legacy-snapshot safety net.
- **`stage.style.transform` must not be written from the projection-mapping module.** The control client's CSS zoom/pan rule is load-bearing.
- **`isTypingShortcutTarget` should not treat non-text inputs (checkbox/radio/file/range/…) as typing** — otherwise hotkeys silently break after any click on such a control.
- **Animation creation uses defaults, not draft-inheritance.** Users got confused when unrelated state leaked into a new animation. Defaults first, then user tweaks in Edit tab.
- **Server-side mutation patches that touch `outsideFxByBoard` must carry the full profile** (spread existing), or the client will fill the `animations` array from hard-coded defaults. The snapshot-apply path now has a belt-and-suspenders guard for this, but the right fix is to send the full profile.
- **Pure-Node ZIP is doable and small.** `node:zlib` + ~150 lines of ZIP encoder/decoder beats adding a dependency for the board-package format.
