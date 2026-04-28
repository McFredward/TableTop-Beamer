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

---

## Hotfix series — h1 through h30

After W1–W5 closure (`phase-25-end` tag, `e9c3109`), interactive
testing surfaced a long tail of polish/UX issues and one perf
regression. They were shipped as 30 atomic patch commits over the
course of one sit-down session. Version chip moved to `0.25.30`.

### UX / behaviour

- **h1** `f9b5be6` Cluster pad rail still visible on Settings —
  CSS specificity tie between `.cluster-pads { display: flex }` and
  `.view-hidden { display: none }` resolved by `#id+!important`
  override.
- **h2** `ea6e349` "Hide room names" promoted from per-room toggle
  to a global flag (mirrors "Show Room Vertices").
- **h3** `321bc3b` Solid-color uses `composite: copy` to avoid edge
  alpha mixing at room boundaries.
- **h4** `d099a74` Local UI prefs (handle scale, vertex transparency,
  vertex/name visibility, dashboard zone, quick-mode mode) persist
  to `localStorage` under `tt-beamer.local-ui-prefs.v1`.
- **h5/h6** `5bb349b/ac0a062` (both reverted) Two attempts at
  binarized polygon mask to eliminate solid-color edge rim — first
  was too slow, second was acceptable on perf but the rim still
  bled. Lower-priority issue parked by the user.
- **h7** `0fa5f18` Cluster Mgmt: rooms sort alphabetically + pad
  rail refreshes immediately on cluster CRUD.
- **h8** `7012763` Coded effect picker is now a proper dropdown in
  the Animation Editor (was a free-text input).
- **h9** `8bc16d9` Sliders that don't affect the chosen renderer
  (Speed for solid-color, Intensity for room mp4/gif) hide.
- **h10** `d1f73e0` Imported boards appear in the dropdown
  immediately (no reload). Server-side `deleteBoardFromServer` API
  added.
- **h11** `0c2a662` DEL key in Settings with a room selected
  deletes the whole room. Right-click context menu gains
  "Delete room". Vertex transparency slider (0–100%) added to the
  Room Editor panel.
- **h12** `e61bb3d` Solid-color picker shows on Quick-Mode pill
  click and now also lives in the Tap Action section so the user
  can tweak the colour without leaving Dashboard.

### Selection visuals

- **h13** `2a206ea` Mutual exclusion of polygon selection — clicking
  a room area / room vertex / play-area vertex clears the others.
  Tap-Action picker visibility wired through `ctx`. Strong yellow
  selection accent.
- **h14** `49b6a07` Selected-vertex highlight + edge-handle opacity
  + smaller default handle size (visualTrim 0.75 → 0.5625).
- **h15** `aaf9b26` Strong selection accent gated to Settings via
  `.is-draggable.is-selected` so Dashboard view stays subtle.
- **h16** `7bf0c59` Entering Settings clears any pre-existing
  selection — opens to a clean slate.

### Board management

- **h17** `fd87db5` Board delete actually works (was referencing an
  undefined `activeBoard.id`). Custom in-app modal dialog system
  introduced (`runtime-modal.js` + matching CSS), used by the
  delete-board confirm flow with type-to-confirm + danger styling.
- **h18** `4b91125` Board-delete diagnostic console logs + trimmed
  match comparison (caught the HTTP 405 = stale server, not a
  client bug).
- **h19** `c65ea27` Board delete rendered as a small "Delete" link
  next to Active Board, not a full-width red button. New empty-
  state placeholder when BOARDS becomes empty.

### Animation defaults

- **h20** `69455ea` Solid-color picker resets to the animation's
  saved default on every animation switch — picker is a "short-term
  override" only.

### Polygon editor visuals

- **h21** `7619b34` Max zoom bumped from 8× to 24× (vertex labels
  initially pushed outside the bubble, reverted in h22).
- **h22** `5e99b3e` Labels back inside the handle, hidden entirely
  when handle scale is below 50%.
- **h23/h24** `0260ae3/0dc5503` Vertex handles render as truly
  solid dots — including in the active obsidian theme rules that
  were the actual override winner.
- **h25** `fca17b3` Edge midpoints solid white (distinct hue from
  vertex), polygon outline scales linearly with handle slider.

### Performance — drag-time

- **h26** `97b4faf` Tighter grab radius (~1.5–1.8× the visible
  handle, was ~4×) so adjacent vertices can be picked apart at
  high zoom. `persistBoardProfiles` fast-paths the common
  "already dirty" case — skips the ~1MB JSON.stringify dirty
  diff on every mutation.
- **h27** `4598e69 / f99f2cb` (reverted) Pause draw loop on wheel
  zoom + pan — the user wanted animations to keep running through
  zoom, so the change was reverted.
- **h28** `6aac804` Polygon-drag pointermove coalesced via rAF.
  Gaming mice fire 1000Hz+; the handler now stores the latest
  event and processes one per animation frame, dropping handler
  invocations by ~10–16×.
- **h29** `aae4816` Stage rect cached during drag to skip the
  forced layout flush `getBoundingClientRect` triggered after
  every `applyIncrementalRoomDrag` SVG attribute write.
- **h30** `0b4d24a` Single-vertex drag rewrites only the touched
  vertex + its two adjacent edge midpoints, not all N. Per-frame
  status-line rebuilds removed from the pointermove path
  (vertex-count / handle-% don't change during a drag). Combined
  perf delta: drag of a 50-vertex polygon dropped from ~500
  attribute writes per frame to ~10.

## Known parked / reverted

- **Solid-color rim at room boundaries.** Two binarized-mask
  attempts (h5, h6) reverted. User explicitly de-prioritised
  ("stell es erstmal zurück, ich hab wichtigere Probleme"). Real
  fix likely requires a layered alpha-mask pre-pass on a separate
  off-screen canvas; left for a future targeted phase if it
  resurfaces as a blocker.
- **Wheel/pan pausing animations** (h27). Reverted on user request
  — animations should keep rendering through zoom/pan.

## Closure marker

- Tag: `phase-25-end-h30` (this commit).
- Final version: `0.25.30` (h30 chip).
- Phase artifact: this `SUMMARY.md` (W1–W5 + hotfix appendix).
- All hotfix commits land on `master` between `phase-25-end`
  (`e9c3109`) and the closure marker.
