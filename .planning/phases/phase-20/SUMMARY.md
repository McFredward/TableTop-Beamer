---
phase: 20
title: Quality-of-life fixes + per-board bundle export/import
status: CLOSED
closed_at: 2026-04-19
---

# Phase 20 Closure — QoL fixes + Board Bundle Export/Import

Six user-listed items, plus the bug fixes that surfaced while iterating.

## Shipped

1. **Clear All** gained a `Also clear default animations` checkbox. By default, Clear All now keeps default (outside / auto-started) animations running and only stops the user-initiated ones. Checkbox-on restores the old "stop everything" behavior. Wired through the live-sync `clear-all` mutation so the server-side reducer respects the flag and all clients see a consistent snapshot.
2. **Play-area polygon double-click bug** fixed. Old code spliced the `*1000` SVG-display point array and passed it to `setShipPolygonPoints`, which then stored values ~1000× too large and got reset by the next `normalizeShipPolygon` call. Now the handler works in normalized 0–1 space like the room editor.
3. **Animation editor two-tab UI**. Every animation section (Inside / Outside / Room) was rewritten into a `Create new` / `Edit existing` tab pair. The Create tab is just a name field + button; clicking it creates a new definition with defaults and flips the section to the Edit tab with the new animation preselected. Eliminates the old "enter name → pick type under the edit-dropdown → scroll up → Create → confirm dirty-type prompt" flow.
4. **Dropdown labels** stripped the `(internal-id)` suffix. `Hull Flicker` instead of `Hull Flicker (hull-flicker)`.
5. **README** expanded with a full "Using the app" chapter covering Dashboard, Settings, rooms, play areas, clusters, animations, sounds, custom assets, boards, export/import, and align mode.
6. **Per-board bundle export/import**. New `Export / Import Board` panel in Settings → Board. Bundle schema `tt-beamer.board-bundle.v1` wraps the board definition + the board's runtime profile from `global-defaults.json` + the board's align-mode profiles from `projection-profiles.json` into one JSON for end-to-end board sharing. Server endpoints: `GET /api/boards/bundle-export?boardId=X`, `POST /api/boards/bundle-import`.

## Bug fixes during iteration

- `applyTransform` in `runtime-projection-mapping.js` was writing `stage.style.transform = "none"`, overriding the CSS zoom/pan transform on the control client. Mouse-wheel and pinch zoom worked (the CSS vars got updated) but nothing moved visually. Turned `applyTransform` into a true no-op.
- The same wheel/pinch gesture binder bound listeners on `/output`, which shouldn't have any zoom UI. Added an early-return guarded by `outputRole === OUTPUT_ROLE_FINAL`.
- `isTypingShortcutTarget` treated every `HTMLInputElement` (including checkbox/radio/button/file/color/range) as a "typing" target. After the Clear-All checkbox landed, Ctrl+Z for polygon undo stopped working whenever that checkbox had focus. Tightened to only text-entry inputs, textareas, selects and contenteditable.
- `getSpecialRooms` / `renderRoomOverlay` crashed with "ctx.getBoard(...) is undefined" during the init-time nav regression. Added defensive fallbacks on both ends.
- Polygon Ctrl+Z was gated on `state.settingsSubtab === "board"`. Dropped the subtab gate so undo works in any Settings subtab.
- Context menu in align mode wasn't dismissed on outside click because `onLinePointerDown` `stopPropagation`'d the event. Moved the dismiss listener to the capture phase.

## Key Files Touched

- `server.mjs` — projection-profiles endpoints from Phase 19 already present; added bundle-export / bundle-import endpoints; tweaked clear-all reducer for the opt-in flag.
- `src/app/runtime/viewport/runtime-projection-mapping.js` — `applyTransform` no-op fix.
- `src/app/runtime/wire/runtime-wire-stage-gesture-binders.js` — role-gated on FINAL.
- `src/app/runtime/animation/runtime-room-management.js` — narrower `isTypingShortcutTarget`.
- `src/app/runtime/state/runtime-board-state-accessors.js` / `src/app/runtime/polygon-editor/runtime-polygon-editor.js` — null-board guards.
- `src/app/runtime/polygon-editor/runtime-polygon-editor.js` — play-area double-click normalized-space fix.
- `src/app/runtime/wire/runtime-wire-fx-panel-binders.js` — two-tab switcher + defaults-on-create.
- `src/app/runtime/wire/runtime-wire-overlay-window-binders.js` — dropped subtab gate on polygon Ctrl+Z.
- `src/app/runtime/wire/runtime-wire-room-audio-binders.js` — wired bundle export/import.
- `src/app/runtime/animation/runtime-runtime-controls.js` — clearDefaults flag plumbing.
- `src/app/runtime/panels/runtime-fx-panels.js` / `src/app/runtime/polygon-editor/runtime-polygon-editor-panels.js` — label-only dropdown text.
- `index.html` — Clear All checkbox, Export/Import Board section, animation tab structure (3 sections).
- `src/styles.css` — `.animation-tabs` / `.animation-tab-button` / `.animation-tab-panel`.
- `README.md` — full "Using the app" chapter.

## Decisions Worth Remembering

- `stage.style.transform` must not be written from the projection-mapping module — the control client's CSS zoom/pan rule is load-bearing.
- Zoom/pan gesture listeners must early-return on FINAL. `/output` is driven by the align-mode system only.
- `isTypingShortcutTarget` should never treat non-text input types (checkbox/radio/etc.) as typing. That breaks keybindings when the user's last click landed on such a control.
- Animation creation should *not* inherit the current editor draft — users get confused when unrelated state leaks into a new animation. Defaults first, then user tweaks in Edit tab.
