<!-- generated-by: gsd-doc-writer -->
# TableTop Beamer — Architecture Overview

This document describes the post-Phase-24 module map of TableTop Beamer,
updated through Phase 58 (v1.3.1).
It is a static-codebase reference: how the source tree is organised,
how modules talk to each other, what the load order is, and what the
public-API surface looks like.

For history and per-wave detail, see the Phase 24 closure summary at
`.planning/phases/phase-24/SUMMARY.md`.

## TL;DR

- **No bundler.** `index.html` is the runtime entry point; it loads
  `<script src="/src/app/...">` tags directly with `defer`. Browser
  document-order = dependency-load order.
- **No automated test framework.** Manual regression checklist in the
  Phase 24 ROADMAP (`Test plan` section) is the gate; one pass takes
  10–15 minutes.
- **IIFE-with-window-globals module pattern.** Each `.js` file wraps
  its body in `(() => { … window.TT_BEAMER_<NAME> = { … }; })()` and
  consumers read other modules via `window.TT_BEAMER_*`.
- **118 modules** in `src/app/runtime/` + `src/app/lib/`, exposing
  **~109** `window.TT_BEAMER_*` namespaces (the locked Phase-24 set of 100
  plus the Phase-58 additions, e.g. `…ANIMATION_CODED_OPTIONS`).
- **`runtime-orchestration.js`** is the wire-up centre — it
  destructures every other module's namespace, builds a 95-key context
  bag (the `ctx`), and fans `init({ ctx })` calls out in dependency
  order. It is sanctioned to remain a re-export shell per the Phase
  24 ROADMAP exception clause.

---

## Top-level structure

```
src/
├── app/
│   ├── runtime/        # runtime tier — 99 modules
│   │   ├── runtime-orchestration.js          # the wire-up centre
│   │   ├── runtime-orchestration-helpers.js  # split out in W3.5
│   │   ├── runtime-orchestration-ctx-builder.js  # split out in W3.5; 95 keys grouped into 17 areas (W4)
│   │   ├── runtime-utils.js                  # introduced W3.1 — clamp/clamp01/bboxOfPolygon
│   │   ├── animation/      # animation lifecycle + dispatch + lifecycle cluster
│   │   ├── core/           # bootstrap + polygon contract + animation factory
│   │   ├── live-sync/      # WebSocket protocol clients
│   │   ├── panels/         # FX panels (room + inside/outside split in W3.6) + regression tests
│   │   ├── polygon-editor/ # polygon edit + handle render (split in W3.6)
│   │   ├── render/         # draw loop + audio + effect-visuals + mp4/gif playback + perf
│   │   ├── state/          # board profiles + fx normalizers + play-area geometry
│   │   ├── ui/             # animation-editor (split into 4+1 sub-modules in W3.3 / W3.6) + icons
│   │   ├── viewport/       # projection mapping (split into 5 sub-modules in W3.2 + handle-drag in W3.6)
│   │   └── wire/           # event-binder modules
│   └── lib/            # lib tier — 19 modules (utility / contract / domain helpers)
│       ├── api/        # global-defaults HTTP API
│       ├── boot/       # composition + bootstrap factory
│       ├── domain/     # rooms / event-lifecycle / live-sync domain types
│       ├── input/      # input guards
│       ├── persistence/# board-profile persistence
│       ├── render/     # viewport lifecycle
│       ├── shared/     # config / logger / normalizers / runtime-env
│       ├── state/      # runtime-state / live-sync-state factories
│       └── ui/         # panels controller + settings/rooms helpers
└── styles/             # CSS only — design system + theme
```

`index.html` carries 109 `<script src>` tags, all `defer`. The order in
`index.html` IS the dependency-load contract.

---

## Module pattern

Every `.js` file follows this shape:

```js
// File-level header: one paragraph stating what callers can rely on.
(() => {
  // Local helpers (private to the IIFE)…

  // Read other modules' namespaces:
  const { someFn } = window.TT_BEAMER_OTHER_MODULE;

  function init({ ctx }) {
    // Wire DOM listeners / state subscriptions / draw-loop hooks…
  }

  window.TT_BEAMER_<MY_MODULE> = { init, /* public functions… */ };
})();
```

Conventions:

- **Namespace name = module purpose.** Runtime-tier modules use
  `window.TT_BEAMER_RUNTIME_<NAME>`. A handful of legacy lib-tier
  modules and one cross-tier shim (`TT_BEAMER_ANIMATION_EDITOR_VIEW`)
  use `window.TT_BEAMER_<NAME>` without the `RUNTIME_` segment — this
  is preserved for back-compat.
- **`init({ ctx })` is the standard entry point.** Modules that have
  setup to do (DOM bindings, subscriptions, lifecycle registration)
  expose an `init` and orchestration calls it at boot.
- **Pure functions are exposed directly.** Modules that only export
  pure helpers (e.g. `runtime-utils.js` with `clamp`, `clamp01`,
  `bboxOfPolygon`) do not expose `init`.
- **No ES module `import` / `export`.** This codebase predates the ES
  module migration; namespace globals fill the same slot. Tooling
  consequence: `madge` cannot run on the tree (it parses ES `import`
  syntax). Module-graph analysis is done by grepping
  `window.TT_BEAMER_*` reads/writes — see Wave 5 INVENTORY for the
  Tarjan-over-grep methodology.

### The `ctx` bag

`runtime-orchestration.js` builds a single shared context object (the
`ctx`) and threads it into every module's `init({ ctx })`. It is the
narrow waist of the application — the place where state accessors,
DOM refs, and cross-module callbacks meet.

After Wave 4 the ctx-builder is its own module
(`runtime-orchestration-ctx-builder.js`, 248 lines) with its 95 keys
grouped into 17 named areas via `// ─── Area X ───` banners (state,
geometry, perf, audio, fx, polygon-editor, viewport-zoom, lifecycle,
live-sync, etc.). The destructure block at the call site mirrors the
return literal so each area appears in the same position twice.

---

## Tier breakdown

The runtime tier (`src/app/runtime/`) is grouped by responsibility.
Each group below lists the modules that participate, with a one-line
description.

### Core / bootstrap

| Module | Role |
|--------|------|
| `runtime-orchestration.js` | Wire-up shell. Destructures every namespace, builds the `ctx`, calls `init({ ctx })` on every module in dependency order. 3307-line sanctioned residual. |
| `runtime-orchestration-helpers.js` | 3 helpers extracted from orchestration in W3.5 (`shouldSuppressRapidTap`, `createConditionalFieldMountSlot`, `setConditionalFieldMounted`). |
| `runtime-orchestration-ctx-builder.js` | `buildBootstrapCtx({…95 refs…})` — extracted in W3.5; area-grouped in W4. |
| `core/runtime-bootstrap.js` | The runtime-tier application bootstrap (`syncRuntimePanelsFromState`, `initializeApplication` decomposed into 7 phase helpers in W3.6). |
| `core/runtime-animation-factory.js` | Animation instance factory. Generates collision-free ids (`anim-<session>-<counter>`) using a per-page-load session suffix (`Date.now().toString(36)` + random). Added in Phase 58 to prevent id reuse across page reloads from inheriting stale video/playback caches. |
| `core/polygon-contract.js` | Polygon-clip contract (BBox, point-in-polygon, hit testing). |
| `core/runtime-dom-refs.js` | `collectDomRefs()` — flat dictionary of `document.querySelector` calls for every controlled DOM element. |

There is a second file named `runtime-bootstrap.js` at
`lib/boot/runtime-bootstrap.js` — that one is the BOOT factory whose
`run()` invokes the application initializer. The two are intentionally
co-named; `index.html` loads them at different positions (lib first
at line 830, runtime/core second at line 907) and they expose
distinct namespaces (`TT_BEAMER_BOOT` and `TT_BEAMER_RUNTIME_BOOTSTRAP`).

### State management

| Module | Role |
|--------|------|
| `lib/state/runtime-state.js` | Runtime-state factory — owns `state` (rooms, animations, drafts, selection). |
| `lib/state/live-sync-state.js` | Live-sync state factory (echo suppression, ack tracking). |
| `state/runtime-board-profiles.js` | Board-profile sync into `state` via `applyBoardProfilesToState`. |
| `state/runtime-fx-normalizers.js` | Normalizer functions for FX field values. Carries Phase 58 schema fields: `playbackMode`, `onRetrigger`, `playbackDirection` (default `"forward"`) on every gif/mp4 definition; `fadeEnabled` / `fadeDurationMs` on every definition; and the coded-effect option fields (e.g. `snowFlakeSize`, `workerStyle`) flowed through the Phase-50 definition→normalizer→dispatch→instance→snapshot chain. |
| `state/runtime-play-area-geometry.js` | Play-area polygon geometry + `mergePolygonPrecedence`. |
| `lib/persistence/board-profiles.js` | Board-profile localStorage persistence. |
| `lib/shared/normalizers.js` | Cross-cutting value normalizers. |

### Animation lifecycle

Split into 5 sub-modules in W3.4 under the `runtime-animation-lifecycle.js` shell:

| Module | Role |
|--------|------|
| `animation/runtime-animation-lifecycle.js` | Re-export shell. Destructures the 5 sub-modules and exposes the 16-key parent namespace. |
| `animation/runtime-lifecycle-state.js` | Lifecycle state object (running animations, draft promotion, prune). |
| `animation/runtime-lifecycle-stop-pipeline.js` | Stop / clear / cleanup. |
| `animation/runtime-lifecycle-live-editor.js` | Live-Editor interactions on a running animation. `openLiveEditor` decomposed into 4 helpers in W3.4. |
| `animation/runtime-lifecycle-running-list.js` | Render the running-animations list in the dashboard. `renderRunningAnimationsList` decomposed into 4 per-row helpers in W3.4. |
| `animation/runtime-lifecycle-cluster-pads.js` | Cluster-pad rendering + the rAF rail-tracker that mirrors stage rect into `position: fixed` rail. Also owns `dispatchClusterToggle`, which since Phase 58 v1.2.20 diverts a re-tap on a play-then-freeze cluster to the phase-advance path instead of the toggle-stop path. |

Adjacent in `animation/`:

| Module | Role |
|--------|------|
| `animation/runtime-room-management.js` | Room CRUD + selection. |
| `animation/runtime-room-dispatch.js` | `startRoomAnimationFromDraft` — single-room phase-advance candidate block (v1.2.16) plus cluster member-wise phase flip (v1.2.20). Quick-tap retrigger diverts frozen play-then-freeze instances with a reverse `onRetrigger` to the activate path here. |
| `animation/runtime-room-draft.js` | Editing draft → running animation transitions. |
| `animation/runtime-runtime-controls.js` | Top-level dashboard controls. |
| `animation/runtime-quick-mode.js` | Tap-Action mode (Off / Toggle / Clear) state + dispatch. |

### Animation editor (UI)

Split into 4 sub-modules in W3.3 under the `animation-editor-view.js` shell, plus an asset-picker sub-module added in W3.6:

| Module | Role |
|--------|------|
| `ui/animation-editor-view.js` | Re-export shell. 105-line aggregator over the 4 sub-modules; legacy 7-key namespace `TT_BEAMER_ANIMATION_EDITOR_VIEW` (no `RUNTIME_` segment, preserved for back-compat). |
| `ui/animation-editor-shell.js` | Editor open/close/dirty-bar + selection state. |
| `ui/animation-editor-library-list.js` | Library list rendering + scope tabs. |
| `ui/animation-editor-edit-pane.js` | Identity / Defaults / Source / Sound cards + create/delete/patch helpers. Hosts the Phase 58 playback-mode dropdown (Loop / Play-once-disappear / Play-then-freeze / Boomerang) and the conditional On-retrigger sub-dropdown. |
| `ui/animation-editor-edit-pane-asset-picker.js` | Asset / sound picker rows extracted in W3.6. |
| `ui/animation-editor-live-preview.js` | Live preview swatch + coded preview rAF + GIF preview. Phase 58: preview respects `playbackMode`, `playbackDirection`, and boomerang src-swap; GIF preview honors mode + direction. |
| `ui/animation-coded-options.js` | Per-coded-effect option rows (namespace `TT_BEAMER_RUNTIME_ANIMATION_CODED_OPTIONS`, exposing `CODED_OPTION_KEYS`). Builds the "Coded Settings" controls for snow (density/speed/mean-size/storm), city-workers (count/size/walk-sway/trails/center-ring + `workerStyle` toggle via `makeToggleRow` `trueValue`/`falseValue`), heat, and break-solid-color. Shared by the edit-pane and the live editor so the same field set persists from definition to running instance. |

### Projection mapping

Split into 5 sub-modules in W3.2 under the `runtime-projection-mapping.js` shell, plus a handle-drag sub-module added in W3.6:

| Module | Role |
|--------|------|
| `viewport/runtime-projection-mapping.js` | Re-export shell. 277-line aggregator; 15-key namespace. |
| `viewport/runtime-projection-grid-state.js` | Grid corner/point state, undo stack, localStorage persistence. |
| `viewport/runtime-projection-gl-renderer.js` | WebGL mesh-warp renderer — the Phase 23 W3 perf path. Carries the load-bearing "WebGL fallback rationale" + "RPi/Chromium lean WebGL options" kernel comments. |
| `viewport/runtime-projection-2d-fallback-renderer.js` | 2D-canvas fallback (per-triangle clip+drawImage) for boards without WebGL. |
| `viewport/runtime-projection-handle-ui.js` | Handle DOM elements + grid-line overlay + context menu. Phase 58 v1.2.24: corner scale handles (⤢) clamp into the visible viewport when their natural outward ±62 px offset would go off-screen — flips inward first, then hard-clamps to a 14 px margin. Clamped handles carry `data-clamped="1"`. Drag math measures from the grid centroid and is unaffected. |
| `viewport/runtime-projection-handle-drag.js` | Drag/rotate/pan listeners (12 fns) — extracted in W3.6 to bring handle-ui under 800 lines. |
| `viewport/runtime-projection-profile-persistence.js` | Server-side projection profile save/load/delete flows. |

### FX panels

Split into 2 sub-modules in W3.6 under the `runtime-fx-panels.js` shell:

| Module | Role |
|--------|------|
| `panels/runtime-fx-panels.js` | Re-export shell. 28-key namespace. |
| `panels/runtime-fx-panels-room.js` | Per-room FX panel sync (`syncRoomFxPanel`). |
| `panels/runtime-fx-panels-inside-outside.js` | Inside / Outside FX panel sync (mode toggle, direction, asset picker, etc.). |
| `panels/runtime-regression-tests.js` | In-app regression test fixtures (manually invoked). |

### Wire-binders

Event-binding modules. Most own `wireXBinders()` functions called from
orchestration. Several were sub-split in W3.6 to bring them under the
800-line bar.

| Module | Role |
|--------|------|
| `wire/runtime-wire-fx-panel-binders.js` | FX-panel listeners. |
| `wire/runtime-wire-fx-panel-binders-outside.js` | Outside-cluster sub-binder extracted in W3.6. |
| `wire/runtime-wire-room-audio-binders.js` | Room audio listeners. |
| `wire/runtime-wire-room-audio-binders-bundle.js` | Bundle export/import IIFE extracted in W3.6. |
| `wire/runtime-wire-overlay-window-binders.js` | Overlay/window listeners (decomposed into 14 named helpers in W3.6). |
| `wire/runtime-wire-polygon-editor-binders.js` | Polygon-editor listeners (decomposed into 21 named helpers in W3.6). |
| `wire/runtime-wire-stage-gesture-binders.js` | Touch / pinch / pan gesture state machine. |
| `wire/runtime-wire-navigation-binders.js` | Top-bar navigation listeners. |

### Render

| Module | Role |
|--------|------|
| `render/runtime-draw-loop.js` | The main rAF draw loop (`draw`, `drawAnimation`, `drawOutsideFxLayer`). Phase 58: per-rAF `isRvfcFresh()` gate on all three mp4 paths; frozen instances branch on `playbackPhase` and paint exclusively from fallback canvas; pressure-skipped rooms fold into the fallback-blit gate (never leave region transparent). |
| `render/runtime-draw-loop-cluster-pads.js` | `drawClusterPadCanvases` extracted in W3.6 to drop draw-loop under 800 lines. |
| `render/runtime-effect-visuals.js` | Per-effect visual generators for every coded effect: solid color, scanning, alarm/intruder, hull-flicker, power-outage, **heat**, **city-workers** (lantern figures, configurable count/size/walk-sway/trails/center-ring + `workerStyle` lit-vs-silhouette), and **snow** (depth-of-field flurry plus a soft volumetric-bokeh **Storm** blizzard; deterministic, allocation-free, with a minimum flake footprint tuned to survive SSR encoder quantization). |
| `render/runtime-audio.js` | Per-animation sample playback + master gain. |
| `render/runtime-perf.js` | Mobile / RPi perf controls + frame-cost telemetry. Phase 58 v1.2.19: adaptive video quality controller (`_adaptiveTier`: `"full"` / `"proxy480"`). Downswitches on sustained distress (fps EMA < 20 or pressure ≥ 2 for ≥ 2.5 s with ≥ 2 playing room-mp4 instances); upswitches on sustained health (fps > 28, pressure = 0 for ≥ 10 s, ≤ 1 playing instance). Toggle persisted in localStorage `tt-beamer.adaptive-video-quality.v1`. |
| `render/runtime-gif-decoder.js` | GIF playback frame decoder. |
| `render/runtime-gif-playback.js` | GIF playback scheduler. Phase 58: boomerang ping-pong via cursor math in `_resolveFrameIndex` across `[0, 2 × totalDurationMs)`; reverse direction walks frames backward. |
| `render/runtime-outside-mp4.js` | Outside and room MP4 playback caches, lifecycle state, fallback canvas capture/replay, and rVFC binding. Phase 58 key additions: `isRvfcFresh()` (Firefox starvation fallback — gate fires if rVFC has not arrived within 150 ms); `maybeTransitionPlaybackPhase(animation, video, playbackState)` — idempotent phase state machine (`forward` → `frozen-last` → `reverse` → `frozen-first`), gated on `currentTime >= duration − 0.5 s` to survive the post-`load()` stale `ended` race; `maybeTransitionGifPlaybackPhase(animation, {totalDurationSec, elapsedScaledSec})` — gif equivalent with timeline-mirrored reverse and frozen-frame clamp; per-instance playback-state caches keyed `${assetRef}#${instanceId}` for all non-loop modes; boomerang EOS src ping-pong detects current leg by URL route (`/api/animation-reverse`) rather than exact equality so adaptive quality-tier changes do not break the cycle; `_rvfcBoundVideo` per-state guard so rVFC re-binds only when the video element actually changes. |

### Live-sync

| Module | Role |
|--------|------|
| `live-sync/runtime-live-sync-core.js` | WebSocket connection lifecycle + send/receive multiplexing. Phase 58 snapshot model: an animation is removed only by explicit remove mutation (`stop-animation` / `clear-all`), board mismatch, or sustained absence > 2 s (`absentSinceMsById`, `ABSENCE_REMOVAL_GRACE_MS = 2000`). Frozen/reverse phases (`playbackPhase` in `{frozen-last, frozen-first, reverse}`) never expire by absence. Re-stamp detection (v1.2.22): an incoming `startedAtEpochMs` more than 250 ms newer than the locally-known epoch for the same animation id marks a re-trigger — incoming phase + render bookkeeping become authoritative, preservation is skipped, and a permanent `[58] re-stamp-accepted` warn fires. `RENDER_PLAYBACK_FIELDS = ["playbackPhase", "_endedDispatched", "_phaseChangedAt"]` are preserved on all roles across non-edit-room snapshots. Absence-grace removal model: an animation is removed only by explicit remove mutation (`stop-animation` / `clear-all`), board mismatch, or sustained absence (`ABSENCE_REMOVAL_GRACE_MS = 2000`, 2 s) from snapshots; frozen/reverse phases (`playbackPhase` in `{frozen-last, frozen-first, reverse}`) never expire by absence. Re-stamp acceptance: incoming `startedAtEpochMs` > 250 ms newer than the locally-known epoch for the same animation id ⇒ incoming phase wins. |
| `live-sync/runtime-live-sync-helpers.js` | Encode/decode helpers + ack handling. |
| `live-sync/runtime-global-defaults.js` | Global-defaults bidirectional sync. |
| `lib/domain/live-sync-domain.js` | Wire-protocol message-type definitions. |

### Polygon editor

| Module | Role |
|--------|------|
| `polygon-editor/runtime-polygon-editor.js` | Polygon editor shell — vertex / edge / handle interactions. |
| `polygon-editor/runtime-polygon-editor-handles.js` | `renderShipPolygonEditorHandles` + `renderPolygonEditorHandles` extracted in W3.6. |
| `polygon-editor/runtime-polygon-editor-panels.js` | Side-panel sync (room list, play-area selectors). |
| `runtime-polygon-drag-support.js` | Drag-state flag (`heavy interaction`) that pauses the draw loop. |
| `runtime-polygon-rotation.js` | Polygon rotation helpers. |
| `runtime-polygon-undo.js` | Per-board undo stack. |
| `runtime-polygon-context-menu.js` | Right-click context menu for polygon edits. |
| `runtime-polygon-metrics.js` | BBox / area / centroid utilities. |
| `runtime-polygon-normalizers.js` | Polygon shape normalizers. |

### Viewport

| Module | Role |
|--------|------|
| `viewport/runtime-view-visibility.js` | View-exclusivity controller (Dashboard / Editor / Align). |
| `viewport/runtime-viewport-zoom.js` | Zoom + pan state, rAF-coalesced writer. Carries the load-bearing zoom-around-anchor derivation comment. |
| `runtime-mobile-layout.js` | Mobile-only layout breakpoints + topbar two-row stack. |
| `runtime-stage-viewport.js` | Stage-frame layout. |

### Lib tier

| Module | Role |
|--------|------|
| `lib/shared/runtime-utils.js` is at `runtime/runtime-utils.js` | Shared utilities: `clamp(min, max, v)`, `clamp01(v)`, `bboxOfPolygon(points)`. Loaded first in the runtime block. |
| `lib/shared/logger.js` | Logger factory (the only sanctioned `console.info(` call site in `src/`). |
| `lib/shared/config.js` | Shared config constants. |
| `lib/shared/normalizers.js` | Cross-cutting value normalizers. |
| `lib/shared/runtime-env.js` | Runtime-env constants. |
| `lib/api/global-defaults-api.js` | Global-defaults HTTP API facade. |
| `lib/boot/app-composition.js` | Bootstrap composition root. |
| `lib/boot/runtime-bootstrap.js` | BOOT factory (`run`) — distinct from `runtime/core/runtime-bootstrap.js`. |
| `lib/domain/rooms.js` | Rooms domain — `mergeRoomCatalog` (renamed in W4 from `applyRoomCatalog`). |
| `lib/domain/event-lifecycle.js` | Event-lifecycle helpers. |
| `lib/domain/live-sync-domain.js` | Live-sync wire-protocol message types. |
| `lib/input/interaction-guards.js` | Tap/pointer guards (`shouldSuppressRapidTap` consumer). |
| `lib/persistence/board-profiles.js` | Board-profile localStorage persistence. |
| `lib/render/viewport-lifecycle.js` | Viewport lifecycle hooks. |
| `lib/state/runtime-state.js` | Runtime-state factory. |
| `lib/state/live-sync-state.js` | Live-sync state factory. |
| `lib/ui/runtime-panels-controller.js` | Panels controller — owns `TT_BEAMER_RUNTIME_PANELS`. |
| `lib/ui/settings/rooms.js` | Settings/rooms UI helpers. |

---

## Re-export shells (W3 shims)

Six shims emerged from W3 file-decomposition. Each is a thin
aggregator that:

1. Loads its sub-modules first via separate `<script>` tags (the
   sub-modules' IIFEs run before the shim's IIFE).
2. Destructures the sub-module namespaces and re-exposes the same
   public-API key set under the original parent namespace, so
   consumers never need to update.

| Shim | Sub-modules | Parent namespace keys | External readers |
|------|------------:|----------------------:|------------------|
| `viewport/runtime-projection-mapping.js` | 5 (grid-state, gl-renderer, 2d-fallback, handle-ui, profile-persistence) + handle-drag in W3.6 | 15 | orchestration + state/runtime-board-profiles |
| `ui/animation-editor-view.js` | 4 (shell, library-list, edit-pane, live-preview) + edit-pane-asset-picker in W3.6 | 7 | orchestration + animation/runtime-runtime-controls |
| `animation/runtime-animation-lifecycle.js` | 5 (state, stop-pipeline, live-editor, running-list, cluster-pads) | 16 | orchestration |
| `panels/runtime-fx-panels.js` | 2 (room, inside-outside) | 28 | orchestration |
| `polygon-editor/runtime-polygon-editor.js` | 1 (handles) extracted in W3.6 | 24 | orchestration |
| `render/runtime-draw-loop.js` | 1 (cluster-pads) extracted in W3.6 | ~5 | orchestration |

Two more shims were audited as effectively shim-style in Wave 5 and
kept as load-bearing:

- `wire/runtime-wire-room-audio-binders.js` — re-exports `bundle` sub-module.
- `wire/runtime-wire-fx-panel-binders.js` — re-exports `outside` sub-module.

The Wave 5 per-shim audit confirmed each shim has at least one
external reader (orchestration in every case), so none can be
removed without rewriting consumer call sites.

---

## Phase 58 subsystems

Phase 58 (v1.2.0 – v1.3.0) shipped per-animation playback modes and
a cluster of supporting runtime subsystems. This section collects them
for cross-module reference. The v1.2.6 → v1.3.0 collection work
(rolled up into the 1.3.0 release) added the coded-effect catalog,
fade, live coded editing, and the auto-start persistence fix — see
[Coded-effect catalog & live editing](#coded-effect-catalog--live-editing-v126--130)
below.

### Playback-mode runtime

Every running animation instance carries three new fields from
definition through the dispatch path to the render layer:

- `playbackMode` — `"loop"` | `"play-once-disappear"` | `"play-then-freeze"` | `"boomerang"`
- `onRetrigger` — `"instant-disappear"` | `"reverse-then-freeze-first"` | `"reverse-then-disappear"`
- `playbackDirection` — `"forward"` | `"reverse"` (initial direction)

For `play-then-freeze` instances the draw loop drives a four-state
phase machine via `maybeTransitionPlaybackPhase` (mp4) and
`maybeTransitionGifPlaybackPhase` (gif):

```
forward → frozen-last → reverse → frozen-first
                    (or → disappear for reverse-then-disappear)
```

Phase advances persist on the instance in `animation.playbackPhase`
and are broadcast via `edit-room` mutations with a fresh
`startedAtEpochMs` re-stamp.

**Re-trigger diversion** (v1.2.16 + v1.2.18): tapping a room whose
running instance is `play-then-freeze` with a reverse `onRetrigger`
diverts from `toggleRoomAnimationByQuickTap` (which would stop the
instance) to `startRoomAnimationFromDraft` → phase-advance. Works in
any playback phase (not only frozen states) since v1.2.18.

**Cluster re-trigger** (v1.2.20): `dispatchClusterToggle` in
`runtime-lifecycle-cluster-pads.js` diverts to the start path when the
cluster entry is retriggerable; `startRoomAnimationFromDraft` iterates
all cluster members and flips each by its own current `playbackPhase`.
Mixed-phase clusters (rooms individually re-triggered between cluster
taps) flip independently per member.

**GIF reverse** is implemented by timeline mirroring in
`runtime-gif-playback.js`: the `_resolveFrameIndex` cursor walks
backwards for phase `reverse`, and `maybeTransitionGifPlaybackPhase`
advances `forward` → `frozen-last` at EOS and `reverse` →
`frozen-first` (or `reverse` → disappear for
`reverse-then-disappear`). No server-side transcoding needed.

### Server media endpoints

`server.mjs` exposes two Phase 58 media-processing endpoints:

| Endpoint | Cache location | Description |
|----------|---------------|-------------|
| `GET /api/animation-reverse?asset=…[&height=N]` | `resources/.reverse-cache/<basename>-<mtimeMs>[-hN].mp4` | ffmpeg `-vf reverse` (optionally combined with `-vf reverse,scale=-2:<height>`). Height whitelist: 360 / 480 / 720. In-flight encodes deduped via a shared promise; atomic temp-file rename on completion. |
| `GET /api/animation-proxy?asset=…[&height=N]` | `resources/.proxy-cache/<basename>-<mtimeMs>-h<N>.mp4` | ffmpeg `-vf scale=-2:<height>`, fps preserved, h264, audio dropped. Default height 480; height whitelist 360 / 480 / 720. Same dedup + atomic-rename pattern as the reverse cache. |

The `/api/animation-reverse` optional `height` param (v1.2.19) allows
the adaptive quality controller to request a combined reverse +
downscale in one ffmpeg pass, keeping boomerang and reverse-on-retrigger
seamless at the proxy tier.

### Per-board video codec (v1.3.1)

The SSR encoder codec is per-board. `ssr-server-rendering-config.mjs` is the
single source of truth: `resolveEffectiveCodec({rootDir})` reads the global
codec **mode** (`serverRendering.codecMode` ∈ `board` | `h264` | `vp9`,
default `board`) and, in board mode, the active board's `videoCodec` (from
`config/boards/<id>.json`), falling back to `defaultCodecForBoard(boardId)`
(Frostpunk → `h264`, all others → `vp9`). It is consumed by both the SSR
host's `resolveEncoderConfig` (so crash self-restarts pick the right codec)
and `server.mjs`.

Because the codec is baked into the in-page WebRTC publisher at stream start,
changing it requires a full SSR host restart. `server.mjs` writes the active
board to `config/active-board.json` (also persisting board selection across
restarts) and calls `maybeRestartSsrForCodec(reason)` on board switch
(`context-update`), per-board codec edit (`/api/global-defaults` save), and
the global-mode change (`serverRendering-update`; `codecMode` is in
`restartKeys`). The restart fires **only when the effective codec actually
differs** from the running one. Per-board state flows through the standard
board-profile chain (`videoCodecByBoard` ↔ `BOARD_PROFILE_FIELDS.videoCodec`);
the client mirror of the default lives in `lib/shared/config.js`
(`defaultVideoCodecForBoard`).

### Adaptive quality controller (`runtime-perf.js`)

A global video quality tier for all non-loop room-mp4 instances:

- **`"full"`** — original asset / full-resolution reverse cache (default)
- **`"proxy480"`** — `/api/animation-proxy` (forward) and `/api/animation-reverse?height=480` (reverse)

Downswitch trigger: fps EMA < 20 OR pressure level ≥ 2 sustained
≥ 2.5 s, AND ≥ 2 actively playing (non-frozen) room-mp4 instances.

Upswitch (hysteresis): fps EMA > 28 AND pressure = 0 sustained ≥ 10 s,
AND ≤ 1 playing instance. The ≤ 1 guard prevents oscillation while a
multi-video burst is still active.

Mid-play src swaps are position-preserving (`currentTime` captured,
re-applied on `loadedmetadata`, clamped to duration; fallback canvas
bridges the load window). Frozen instances never swap mid-freeze; they
adopt the current tier on their next phase change. Loop-mode room mp4s
are exempt (they share one decoder per asset).

Toggled via Settings → System; per-client localStorage key
`tt-beamer.adaptive-video-quality.v1`. Default: ON.

### Live-sync hardening (Phase 58)

Multiple snapshot-safety mechanisms were added or extended:

**Absence-grace removal model** (v1.2.14): `applyLiveRuntimeSnapshot`
no longer wholesale-replaces `state.runningAnimations` with the raw
snapshot array. An animation is removed only by: (1) explicit remove
mutation (`stop-animation` / `clear-all`), (2) board mismatch, or (3)
sustained absence > 2 s. The `absentSinceMsById` map tracks the first
time an id goes missing from a snapshot. Frozen/reverse phases
(`playbackPhase` ∈ `{frozen-last, frozen-first, reverse}`) never expire
by absence — they are client-derived and have no server-side equivalent.

**Re-stamp acceptance rule** (v1.2.22): when an incoming snapshot
carries a `startedAtEpochMs` more than 250 ms newer than the locally-
known epoch for the same animation id, the runtime treats it as a
genuine re-trigger. The incoming `playbackPhase` and render bookkeeping
become authoritative (preservation skipped). Identical or older epochs
keep the existing preservation so in-progress client-derived transitions
(e.g. a forward → frozen-last EOS mid-flight) survive stale snapshots.

**RENDER_PLAYBACK_FIELDS preservation**: `playbackPhase`,
`_endedDispatched`, and `_phaseChangedAt` are preserved across all
non-edit-room snapshots on all roles (the earlier `OUTPUT_ROLE_CONTROL`
gate was removed in v1.2.11 to protect the projector role equally).

**Collision-free animation ids** (v1.2.14): ids now carry a per-page-load
session suffix (`anim-<session>-<counter>`) generated in
`core/runtime-animation-factory.js`, preventing a page reload from
reusing an id that a still-running instance on another client holds.

### Diagnostics layer

Phase 58 added permanent (always-on) `console.warn` event logs prefixed
`[58]`. These fire on state-change events only — never per-frame:

| Log key | Trigger |
|---------|---------|
| `[58] re-trigger` | Every room-trigger phase-advance check (per-instance phase/mode/onRetrigger) |
| `[58] anim-removed` | Every snapshot removal (reason: explicit-remove / board-mismatch / sustained-absence + absentMs) |
| `[58] anim-absent-start` / `anim-absent-recovered` | Absence-grace tracking start / recovery |
| `[58] release-video` | Immediately before any per-instance video element release |
| `[58] phase` | Playback phase transitions (forward→frozen-last, reverse→frozen-first, etc.) |
| `[58] src-swap` | Forward ↔ reverse URL swaps |
| `[58] prune-release` | Release-debounce decisions |
| `[58] quick-toggle` | Every tap-on-occupied-room decision (retrigger vs stop) |
| `[58] quality` / `[58] quality-swap` | Adaptive tier changes + position-preserving src swaps |
| `[58] re-stamp-accepted` | Re-trigger re-stamp detection in snapshot preservation |
| `[58] cluster-toggle` / `[58] cluster-retrigger` | Cluster pad toggle decisions + per-member phase-advance outcomes |
| `[58] boomerang-degraded` | Once per element when no reverse variant is resolvable for a boomerang mp4 |

Two opt-in debug gates remain for deeper investigation:
`window.TT_DEBUG_58` (verbose per-rAF video state in `runtime-draw-loop.js`
and `runtime-outside-mp4.js`) and `window.TT_MP4_DIAG` (per-1000 ms
mp4 paint summary, also activatable via `?mp4diag=1` URL query param).

### Coded-effect catalog & live editing (v1.2.6 – 1.3.0)

The 1.3.0 collection work extended the coded layer:

- **Unified coded-effect catalog.** `ALL_CODED_EFFECT_TYPES` in
  `lib/shared/config.js` is the single source of truth; the room / inside /
  outside pickers all resolve their keys from it (see `runtime-asset-refs.js`),
  so every coded effect is selectable in every scope and renders against that
  scope's region. New entries: `heat`, `city-workers`, `snow`.
- **`snow`** (`runtime-effect-visuals.js`) — a deterministic, allocation-free
  soft-bokeh snow with a calm depth-of-field flurry and a menacing gusting
  **Storm** blizzard. Controls: density, speed, `snowFlakeSize` (mean size),
  and a storm toggle. The minimum drawn flake footprint and the contrast/alpha
  floor are tuned so small flakes survive the SSR H.264 encoder's spatial
  quantization (the `/output/` "stick-then-jump" stutter was an encoder-QP
  artifact, not a render-cost or temporal issue — software VP9 only sustained
  ~15 fps, H.264 reaches ~30 fps; `CODEC_DEFAULT = "h264"`).
- **`city-workers`** — lantern-carrying figures with configurable count
  (≤ 24), size, walk-sway, trail intensity (≤ 300 %, non-compounding on
  overlap), a movable/toggleable center-exclusion ring, and a `workerStyle`
  field (`"lit"` vs `"dark"`) surfaced as the **Stronger lighting** toggle.
- **Per-coded-effect option plumbing** lives in
  `ui/animation-coded-options.js` (`CODED_OPTION_KEYS`). Each option field
  flows the Phase-50 chain (definition → `runtime-fx-normalizers` →
  dispatch sites → `runtime-animation-factory` → instance → snapshot spread →
  draw loop), so a configured effect renders identically on dashboard, SSR,
  and `/output/` from the first trigger — not only in the editor preview.
- **Fade** — `fadeEnabled` / `fadeDurationMs` on every definition; the draw
  loop ramps opacity in on start and out on stop.
- **Live coded editing** — `animation/runtime-lifecycle-live-editor.js`
  edits a running instance's coded options, fade, and transform under a
  collapsible "Coded Settings" block. Edits preview dashboard-local and
  commit to all clients on **Done** (run-local) or **Save as default**
  (persisted to the definition).
- **Auto-start persistence fix** — the live editor's "Auto-start" checkbox
  folds the instance into `state.defaultAnimationsByBoard[boardId]`, which
  `buildBoardProfilesFromState` serializes to `defaultAnimations` in the
  board JSON via `POST /api/global-defaults`. `closeLiveEditor` now persists
  when that membership changes (Done previously never POSTed), and
  `saveLiveEditorAsDefault` saves *after* folding the entry in (it previously
  saved before, capturing stale defaults) — so an auto-started animation
  survives a server restart and is re-created by
  `buildDefaultAnimationsForBoard` on boot.

---

## Public API surface (locked through Phase 24)

Phase 24 is a no-behaviour-change refactor. Three contract surfaces
were locked at start-of-phase and verified byte-identical at end-of-
phase:

- **100 `window.TT_BEAMER_*` namespaces.** Was 101 pre-W5; the legacy
  `TT_BEAMER_UI_RUNTIME_PANELS` alias was removed in W5.3-C2 (zero
  external readers). The remaining 100 have at least one external
  reader.
- **7 wire-protocol message-type literals** emitted via
  `emitLiveMutation(...)`: `clear-all`, `context-update`, `edit-room`,
  `outside-update`, `stop-animation`, `trigger-global`, `trigger-room`.
- **13 localStorage / JSON-schema literals** — `tt-beamer.api-base.v1`,
  `tt-beamer.board-profiles.v1`, `tt-beamer.board-profiles.v3`,
  `tt-beamer.global-defaults.v1`, `tt-beamer.hitarea-calibration.v1`,
  `tt-beamer.last-board-id.v1`, `tt-beamer.projection-mapping.corners`,
  `tt-beamer.projection-mapping-v2`, `tt-beamer.room-geometry.v1`,
  `tt-beamer.room.v2`, `tt-beamer-server-unreachable-overlay`,
  `tt-beamer.settings-subtab.v1`, `tt-beamer.special-polygons.v1`.

Total: **120 immutable contracts** across the wire and storage
boundaries. All preserved verbatim through every Phase 24 wave.

Phase 58 added one new localStorage key outside the locked set:
`tt-beamer.adaptive-video-quality.v1` (per-client adaptive quality toggle).

For per-namespace inner-key lock-list verification, see Wave 4 and
Wave 5 INVENTORYs in `.planning/phases/phase-24/`.

---

## Init-order kernels

The orchestration shell carries 13 short comment kernels documenting
non-obvious init / destructure ordering. Each kernel is a single
sentence explaining WHY a particular line position matters — usually
because a downstream destructure depends on it, or because a let-
binding cannot be replaced with an arrow without breaking
reassignability. They were preserved verbatim through every wave.

The 13 kernels (Wave 5 line numbers):

1. Polygon-handler init must destructure `normalizeSpecialPolygon`
   into local scope before binding handlers.
2. Suppression list of `dom-ref` IDs that no longer exist in
   `index.html`.
3. `BOARDS` is reassigned via the `setBoards` callback (zone-loader
   cannot mutate the outer `let` directly).
4. `viewport-zoom` init is deferred until `touchGestureActive` and
   `polygon-drag-support` are initialized.
5. `fx-normalizers` and perf controls are injected via ctx arrows
   because their destructures sit below this position.
6. `board-profiles` helpers — direct refs vs ctx arrows depending
   on whether the destructure has landed yet.
7. `ROOM_GEOMETRY` init must follow `BOARD_STATE_ACCESSORS` —
   destructures `getHitareaCalibration` from it.
8. `fx-normalizers'` asset-ref dependencies via ctx arrows.
9. Editor draft storage and `outsideResourceAssets` stay in
   orchestration scope (passed by reference).
10. Polygon-editor cross-module deps via ctx arrows so downstream
    destructures can land later without TDZ.
11. Use raw setters (not the `update*` wrappers) — wrappers re-derive
    intensity/speed/mode/direction from the profile root and clobber
    per-definition patches.
12. `drawRoomComposition`'s init is deferred until `drawEffectVisual`
    + `clipToRoom` are destructured.
13. Global "touch gesture in progress" flag — blocks the rAF zoom-pan
    writer's DOM writes during a touch gesture.

These kernels are the codified institutional knowledge that survived
the refactor. Treat them as load-bearing — moving them requires
verifying the new line still satisfies the constraint they describe.

---

## Load order

`index.html` loads 109 `<script src>` tags with `defer`. With every
tag deferred, the browser executes them in document order after HTML
parse — which means HTML line order IS the dependency graph topology.

Conceptual load order:

```
1. runtime-utils.js         (line 984 — first runtime-tier tag, no
                              cross-module deps; pure self-contained
                              IIFE)
2. lib helpers              (icons, panels-controller, etc.)
3. lib state factories      (runtime-state, live-sync-state)
4. runtime/lib/persistence  (board-profiles)
5. lib/api                  (global-defaults-api)
6. runtime sub-modules      (state, geometry, lifecycle, projection,
                              animation-editor sub-modules)
7. W3 shells                (animation-editor-view, projection-mapping,
                              animation-lifecycle, fx-panels,
                              polygon-editor, draw-loop) — each loads
                              after its sub-modules
8. wire-binders             (read most other namespaces during init)
9. core/runtime-bootstrap   (line 1187)
10. orchestration           (line 1190 — last; consumes everything)
11. app.js                  (line 911 — invokes TT_BEAMER_BOOT.run)
```

Critical orderings (verified at every wave):

- `runtime-utils.js` at line 984 — every consumer reads it at parse
  time, so it must load first.
- `lib/ui/runtime-panels-controller.js` at line 1100 must load before
  `runtime/core/runtime-bootstrap.js` at line 1187 — bootstrap reads
  the panels controller's namespace at parse time. This was the SCC
  resolved in Wave 5 (the cycle came from a defensive bootstrap-side
  write that became unreachable under the documented load order).
- `runtime-orchestration.js` at line 1190 is always last — it
  destructures every other namespace.

For the full per-shim load-order verification, see Wave 5 INVENTORY
section "`<script>` load-order verification".

---

## Build / test infrastructure

- **No bundler.** Browser loads `<script>` tags directly. Server is
  `node server.mjs` (vanilla static + WebSocket relay).
- **No automated test framework.** Manual regression checklist in the
  Phase 24 ROADMAP (`Test plan` section, ~10–15 minutes) is the
  acceptance gate after every wave.
- **`node --check` is the per-commit primary gate.** Combined with
  byte-identical body diff (`git diff -w`) for refactor commits and
  namespace-existence + `<script>` order checks for any commit that
  touches module structure.
- **Module-graph analysis** is grep-based (`grep -rn
  "window\.TT_BEAMER_<NAME>" src/`) — `madge` cannot run because the
  codebase has zero ES module `import` statements. The Phase 24 Wave
  5 INVENTORY documents the Tarjan-over-grep methodology used for SCC
  detection.
- **In-app regression fixtures** live in
  `runtime/panels/runtime-regression-tests.js` for layout / scroll
  smoke tests; manually invoked from the dashboard.

---

## Where to look for more detail

- **Phase 24 closure summary** — `.planning/phases/phase-24/SUMMARY.md`
  (per-wave delivery, aggregate metrics, follow-ups).
- **Wave 1 INVENTORY** — `.planning/phases/phase-24/wave-1/INVENTORY.md`
  (dead code + debug-log removal).
- **Wave 2 INVENTORY** — `.planning/phases/phase-24/wave-2/INVENTORY.md`
  (comment hygiene + load-bearing kernel verification).
- **Wave 3 INVENTORY** — `.planning/phases/phase-24/wave-3/INVENTORY.md`
  (file decomposition; sub-module namespaces; shim audit).
- **Wave 4 INVENTORY** — `.planning/phases/phase-24/wave-4/INVENTORY.md`
  (renames + ctx-builder area-grouping; namespace-pinning verdicts).
- **Wave 5 INVENTORY** — `.planning/phases/phase-24/wave-5/INVENTORY.md`
  (module-graph cleanup; SCC resolution; per-shim re-export audit;
  `<script>` load-order verification).
- **README.md** — user-facing feature description.
- **Phase 22 / Phase 23 SUMMARY.md** — design-system migration and
  cluster-pad / `/output` perf history.
