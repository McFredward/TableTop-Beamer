<!-- generated-by: gsd-doc-writer -->
# TableTop Beamer — Architecture Overview

This document describes the post-Phase-24 module map of TableTop Beamer.
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
- **101 modules** in `src/app/runtime/` + `src/app/lib/`, exposing
  **100** `window.TT_BEAMER_*` namespaces (one shim removed in W5.3).
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
│   ├── runtime/        # runtime tier — 84 modules
│   │   ├── runtime-orchestration.js          # the wire-up centre
│   │   ├── runtime-orchestration-helpers.js  # split out in W3.5
│   │   ├── runtime-orchestration-ctx-builder.js  # split out in W3.5; 95 keys grouped into 17 areas (W4)
│   │   ├── runtime-utils.js                  # introduced W3.1 — clamp/clamp01/bboxOfPolygon
│   │   ├── animation/      # animation lifecycle + dispatch + lifecycle cluster
│   │   ├── core/           # bootstrap + polygon contract
│   │   ├── live-sync/      # WebSocket protocol clients
│   │   ├── panels/         # FX panels (room + inside/outside split in W3.6) + regression tests
│   │   ├── polygon-editor/ # polygon edit + handle render (split in W3.6)
│   │   ├── render/         # draw loop + audio + effect-visuals
│   │   ├── state/          # board profiles + fx normalizers + play-area geometry
│   │   ├── ui/             # animation-editor (split into 4+1 sub-modules in W3.3 / W3.6) + icons
│   │   ├── viewport/       # projection mapping (split into 5 sub-modules in W3.2 + handle-drag in W3.6)
│   │   └── wire/           # event-binder modules
│   └── lib/            # lib tier — 17 modules (utility / contract / domain helpers)
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

`index.html` carries 102 `<script>` tags, all `defer`. The order in
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
(`runtime-orchestration-ctx-builder.js`, 251 lines) with its 95 keys
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
| `runtime-orchestration.js` | Wire-up shell. Destructures every namespace, builds the `ctx`, calls `init({ ctx })` on every module in dependency order. 2965-line sanctioned residual. |
| `runtime-orchestration-helpers.js` | 3 helpers extracted from orchestration in W3.5 (`shouldSuppressRapidTap`, `createConditionalFieldMountSlot`, `setConditionalFieldMounted`). |
| `runtime-orchestration-ctx-builder.js` | `buildBootstrapCtx({…95 refs…})` — extracted in W3.5; area-grouped in W4. |
| `core/runtime-bootstrap.js` | The runtime-tier application bootstrap (`syncRuntimePanelsFromState`, `initializeApplication` decomposed into 7 phase helpers in W3.6). |
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
| `state/runtime-fx-normalizers.js` | Normalizer functions for FX field values. |
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
| `animation/runtime-lifecycle-cluster-pads.js` | Cluster-pad rendering + the rAF rail-tracker that mirrors stage rect into `position: fixed` rail. |

Adjacent in `animation/`:

| Module | Role |
|--------|------|
| `animation/runtime-room-management.js` | Room CRUD + selection. |
| `animation/runtime-room-dispatch.js` | `startRoomAnimationFromDraft` (637 lines — accepted deviation per W3.6). |
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
| `ui/animation-editor-edit-pane.js` | Identity / Defaults / Source / Sound cards + create/delete/patch helpers. |
| `ui/animation-editor-edit-pane-asset-picker.js` | Asset / sound picker rows extracted in W3.6. |
| `ui/animation-editor-live-preview.js` | Live preview swatch + coded preview rAF + GIF preview. |

### Projection mapping

Split into 5 sub-modules in W3.2 under the `runtime-projection-mapping.js` shell, plus a handle-drag sub-module added in W3.6:

| Module | Role |
|--------|------|
| `viewport/runtime-projection-mapping.js` | Re-export shell. 277-line aggregator; 15-key namespace. |
| `viewport/runtime-projection-grid-state.js` | Grid corner/point state, undo stack, localStorage persistence. |
| `viewport/runtime-projection-gl-renderer.js` | WebGL mesh-warp renderer — the Phase 23 W3 perf path. Carries the load-bearing "WebGL fallback rationale" + "RPi/Chromium lean WebGL options" kernel comments. |
| `viewport/runtime-projection-2d-fallback-renderer.js` | 2D-canvas fallback (per-triangle clip+drawImage) for boards without WebGL. |
| `viewport/runtime-projection-handle-ui.js` | Handle DOM elements + grid-line overlay + context menu. |
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
| `render/runtime-draw-loop.js` | The main rAF draw loop (`draw`, `drawAnimation`, `drawOutsideFxLayer`). |
| `render/runtime-draw-loop-cluster-pads.js` | `drawClusterPadCanvases` extracted in W3.6 to drop draw-loop under 800 lines. |
| `render/runtime-effect-visuals.js` | Per-effect visual generators (solid color, fire, scanning, alarm, flicker). |
| `render/runtime-audio.js` | Per-animation sample playback + master gain. |
| `render/runtime-perf.js` | Mobile / RPi perf controls + frame-cost telemetry. |
| `render/runtime-gif-decoder.js` | GIF playback frame decoder. |
| `render/runtime-gif-playback.js` | GIF playback scheduler. |

### Live-sync

| Module | Role |
|--------|------|
| `live-sync/runtime-live-sync-core.js` | WebSocket connection lifecycle + send/receive multiplexing. |
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

`index.html` loads 102 `<script src>` tags with `defer`. With every
tag deferred, the browser executes them in document order after HTML
parse — which means HTML line order IS the dependency graph topology.

Conceptual load order:

```
1. runtime-utils.js         (line 805 — first runtime-tier tag, no
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
9. core/runtime-bootstrap   (line 907)
10. orchestration           (line 910 — last; consumes everything)
11. app.js                  (line 911 — invokes TT_BEAMER_BOOT.run)
```

Critical orderings (verified at every wave):

- `runtime-utils.js` at line 805 — every consumer reads it at parse
  time, so it must load first.
- `lib/ui/runtime-panels-controller.js` at line 835 must load before
  `runtime/core/runtime-bootstrap.js` at line 907 — bootstrap reads
  the panels controller's namespace at parse time. This was the SCC
  resolved in Wave 5 (the cycle came from a defensive bootstrap-side
  write that became unreachable under the documented load order).
- `runtime-orchestration.js` at line 910 is always last — it
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
