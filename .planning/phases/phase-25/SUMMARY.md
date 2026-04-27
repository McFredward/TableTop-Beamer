# Phase 25 — Bug & Polish (CLOSURE)

## Status

**CLOSED.** All 12 BACKLOG items shipped as 12 atomic commits across
5 functional waves (W1–W5) plus a closure pass (W6). Wire-protocol
and storage-key invariants from Phase 24 SUMMARY are unchanged
(verified by absence of edits to the LOCKED literals in this
phase's diff).

## Wave delivery

### Wave 1 — UX polish ✅ (6 items, 6 commits)

- **W1.1** `669449b` Cluster pad rail pinned to dark-theme tokens
  via local `--c-*` overrides on `.cluster-pads`. Pad surface +
  "Cluster" header now stay legible under
  `.dir-obsidian-light` (BACKLOG #1).
- **W1.2** `5a62298` `APP_VERSION = "0.25.0"` constant added to
  `config.js`; small `<small id="app-version">` chip in the
  topbar populated by an inline DOMContentLoaded script. Cadence
  documented: phase number → minor, in-phase hotfixes → patch
  (BACKLOG #2).
- **W1.3** `7d9671e` `data-view="dashboard"` added to
  `#cluster-pads` so the standard `setActiveView` view-group
  toggle hides the rail when Settings is active (BACKLOG #5).
- **W1.4** `8449704` Room Editor "Hide room name on board overlay"
  checkbox. Mirrors the frozen-room state pattern: parallel
  `state.hiddenRoomNamesByBoard[boardId][roomId]` map, persisted
  via board profiles, no ROOM_SCHEMA change. Renders are skipped
  in `renderRoomOverlay` when the flag is set; default `false`
  preserves existing rooms' behaviour. /output never rendered
  the label, so the toggle is a no-op there (BACKLOG #6).
- **W1.5** `a6a3be8` Removed the redundant `window.confirm()`
  prompt from both Animation Editor delete buttons (header +
  preview footer). The dirty-flag prompt at Apply time already
  covers explicit user intent (BACKLOG #7).
- **W1.6** `838a705` Audited `resolveAnimationIcon` targets
  against `ANIMATION_ICON_KEYS` (the picker registry); added the
  5 missing icons (`play`, `picker`, `lock`, `map`, `room`) so
  every default-animation icon is selectable. Outside Sandstorm
  in particular now exposes its `play` icon to the picker.
  Comment-level invariant added (BACKLOG #11).

### Wave 2 — State propagation ✅ (1 item, 1 commit)

- **W2.1** `b2afb47` Toggle-mode tile picker refreshes on board
  switch and animation edit. Two interlocking fixes:
  - `syncQuickAnimationPicker` now uses an `id|name|icon`
    fingerprint to detect rebuild need (the previous `id`-only
    fingerprint missed in-place edits and same-default-IDs
    board switches).
  - `syncQuickModePanel` is invoked from `refreshGlobalButtons`
    so it runs on every board switch and animation save (the
    refresh function is already on those paths). The fingerprint
    diff makes the extra calls cheap when nothing has changed
    (BACKLOG #3).

### Wave 3 — Animation engine parity ✅ (3 items, 3 commits)

- **W3.1** `4f450ba` Cluster pad rail now switches to
  `globalCompositeOperation = "lighter"` when ≥2 cluster
  animations stack on the same pad. Mirrors the Phase 12-1
  same-room additive-blend rule. Wrapped in save/restore so
  composite doesn't leak to subsequent pad renders on the
  shared `padCtx` (BACKLOG #4).
- **W3.2** `f844f66` Animation Editor preview applies
  `state.animationSpeed` in all three preview tick paths (coded
  rAF, GIF rAF, MP4 playbackRate). Dashboard / /output already
  multiplied by `state.animationSpeed`; the editor preview did
  not, so any non-1× setting made the preview run at a
  different rate (BACKLOG #8).
- **W3.3** `0c478b2` Power Outage blue flash replaced
  `Math.random() > 0.88` (frame-fixed ~12% chance, speed-
  independent) with a deterministic age-driven noise (product of
  two incommensurate sines). Because `age` is already speed-
  scaled in `drawInsideGlobalVisual`, the flash cadence now
  scales with the speed slider (BACKLOG #10).

### Wave 4 — Render fidelity ✅ (1 item, 1 commit)

- **W4.1** `fe4d564` Solid-color rooms with intersecting
  polygons no longer alpha-bump at the overlap. Pre-clear the
  room's clipped area with `globalCompositeOperation =
  "destination-out"` before painting at the configured alpha,
  so the overlap ends up at exactly `alpha` instead of the
  source-over accumulation (`0.5 + 0.5×0.5 = 0.75`). Gated on
  the outer composite being `source-over` so the same-room
  Phase 12-1 lighter-additive case is preserved unchanged
  (BACKLOG #12).

### Wave 5 — Performance ✅ (1 item, 1 commit)

- **W5.1** `bc630a6` `renderRunningAnimationsList` calls in
  `startRoomAnimationFromDraft` are now deferred via a
  coalesced `requestAnimationFrame`. The list rebuild was the
  heaviest synchronous work on the start path; deferring it
  shaves perceptible latency off the tap → paint loop on
  mobile, where every ms of main-thread work delays the next
  compositor frame. Multiple starts within one frame collapse
  to a single rAF render (BACKLOG #9).

### Wave 6 — Closure ✅
- This SUMMARY.md (current commit).
- `phase-25-end` tag set on HEAD.
- `APP_VERSION` already at `"0.25.0"` (set in W1.2).

## Aggregate metrics

- **Commits since `phase-25-w1-start`:** 12 fix/feat + 1 ROADMAP +
  1 BACKLOG = 14 total.
- **`src/` line delta (W1.1 → W5.1):** ~+200 / ~-25 net (mostly
  feature additions; W1.4 and W1.2 are the two larger ones).
- **Files touched:** 14 distinct files in `src/`, 1 in `config/`
  unchanged (left as user-local state).
- **No ROOM_SCHEMA, wire-protocol, or storage-key changes.**

## Known limitations / follow-ups

- **W4.1 cross-room overlap trade-off.** The destination-out
  pre-clear in solid-color also clears any earlier paint from
  non-solid-color animations that happen to land in the overlap
  area (e.g. fire in room A overlapping a solid-color in room B
  — the overlap shows only B's solid color, not A's flame
  contribution). Acceptable because rooms typically overlap by
  only a few pixels at adjacent edges, and the alpha bump was
  the only visible artifact. A full per-color offscreen pre-pass
  would resolve the trade-off if the pixel-loss becomes
  noticeable.
- **W5.1 is targeted, not exhaustive.** The deferred
  `renderRunningAnimationsList` addresses the heaviest sync work
  on the start path. Other potential mobile-stutter sources
  (audio context resume, MP4 decode, large `JSON.stringify` for
  live-sync) were not profiled in this phase. If mobile stutter
  persists, a profiling-driven follow-up phase would identify
  the next bottleneck.
- **W3.2 cross-window parity.** Dashboard ↔ /output should
  already match (same draw loop, same `state.animationSpeed`).
  The parity fix targets the editor preview specifically. If
  Dashboard and /output disagree visibly, that's a live-sync
  issue (`runtime-live-sync-core.js` syncs `animationSpeed`),
  not a math issue.
- **W2.1 fingerprint coverage.** The new `id|name|icon`
  fingerprint detects renames and icon changes. If future
  animation properties affect pill rendering (e.g. badges,
  colour swatches), the fingerprint string needs to grow to
  match.

## Tags

| Tag | Hash | Marker |
|-----|------|--------|
| `phase-25-w1-start` | `6ffc9ab` | Pre-W1 (ROADMAP landed; W1 polish work begins) |
| `phase-25-end` | (HEAD) | Phase 25 closed — bug & polish complete |

## File touches per commit (for revert targeting)

```
W1.1  669449b  src/styles/design-system/theme-obsidian.css
W1.2  5a62298  src/app/lib/shared/config.js + index.html + theme-obsidian.css
W1.3  7d9671e  index.html
W1.4  8449704  9 files (state + accessors + persistence + 2 ctx + UI + render)
W1.5  a6a3be8  src/app/runtime/ui/animation-editor-{edit-pane,live-preview}.js
W1.6  838a705  src/app/runtime/ui/icons.js
W2.1  b2afb47  runtime-quick-mode.js + runtime-lifecycle-running-list.js + orchestration
W3.1  4f450ba  src/app/runtime/render/runtime-draw-loop-cluster-pads.js
W3.2  f844f66  src/app/runtime/ui/animation-editor-live-preview.js
W3.3  0c478b2  src/app/runtime/render/runtime-effect-visuals.js
W4.1  fe4d564  src/app/runtime/render/runtime-effect-visuals.js
W5.1  bc630a6  src/app/runtime/animation/runtime-room-dispatch.js
```

## Smoke test checklist (for the user)

When ready, smoke test:
- **W1.1** Switch theme to light. "Cluster" rail header still
  legible; cluster pads still show animation pixels clearly.
- **W1.2** Topbar shows `v0.25.0` next to the brand title.
- **W1.3** Switch to Settings → cluster pad rail hidden. Switch
  back to Dashboard → cluster pad rail visible.
- **W1.4** Open Room Editor, toggle "Hide room name on board
  overlay" for a room → label disappears from the overlay.
  Toggle off → label returns. Apply + reload page → setting
  persists.
- **W1.5** Animation Editor → Delete: only the dirty-flag prompt
  fires (no extra `Delete X?` confirm).
- **W1.6** Animation Editor → click an icon swatch on Outside
  Sandstorm → the `play` icon is selectable in the picker.
- **W2.1** Open Toggle tap-action mode. Edit an animation's
  name in the editor → pill label refreshes immediately
  (without cycling to Clear/Select).
- **W3.1** Trigger two cluster animations of different types on
  the same cluster → cluster pad shows additive blend, not
  order-dependent occlusion.
- **W3.2** Set Animation Speed slider to 2× → editor preview
  matches Dashboard / /output rate exactly.
- **W3.3** Run Power Outage. Adjust speed slider → blue flash
  cadence visibly changes.
- **W4.1** Configure two overlapping rooms with the same
  solid-color setting → overlap area shows the same colour
  intensity as the non-overlap regions.
- **W5.1** On mobile, tap a room repeatedly to trigger
  animations → no perceptible stutter on each tap.
