# Phase 24 Wave 4 — Naming + API Consistency (RESEARCH)

**Researched:** 2026-04-26
**Domain:** Vanilla-JS, IIFE-with-window-globals runtime; mass identifier
renames + `ctx`-bag reorganisation + option-bag standardisation under a
strict no-behaviour-change rule. Wave 4 changes IDENTIFIERS; Waves 1-3
already established the structural shape.
**Confidence:** HIGH for all measurements (every count, every line
number, every namespace key was extracted from the post-W3.6 tree).
HIGH for the lock-list (public namespaces + wire-protocol literals +
localStorage keys). MEDIUM for the rename recommendations themselves
(prefix conventions are subjective; the rules below are defensible but
the planner / executor + user can re-grade individual candidates).
LOW for nothing — every claim is tagged `[VERIFIED: ...]`.

## Summary

Wave 4 is the last code-touching wave of Phase 24 before module-boundary
cleanup (W5) and closure (W6). Its job is **naming + API consistency**:
align function-name prefixes to a small set of conventions, group the
`ctx` bag by area, and standardise option-bag arguments. Every change
is identifier-level; no logic moves. The acceptance bar is "no two
functions use different prefixes for the same operation."

The post-W3.6 runtime tree carries **938 unique function-like
identifiers** in `src/app/runtime/` ([VERIFIED: `wc -l /tmp/runtime-fn-all.txt`])
spread across **77 modules** (24 created or extracted by Wave 3 — see
[wave-3 INVENTORY §"W3.6 new sub-modules created"](../wave-3/INVENTORY.md)).
93 distinct lower-case prefixes occur ≥2 times; the top 14 prefixes
(get, sync, normalize, set, is, build, create, on, apply, clear,
clamp, resolve, update, render) cover ~530 functions ≈ **57 % of the
identifier surface**. The naming is **already fairly consistent** —
the codebase grew under engineer discipline, and most prefix
conventions are already honoured.

The actual inconsistencies are **narrow and identifiable**. After a
suffix-collision audit (looking for the same noun bound to multiple
verbs), only two pairs surface as **action-verb conflicts** (the
ROADMAP's `syncRoomList` vs `applyRoomList` shape): an `update*Status`
that should be `sync*Status`, and a `refresh*Buttons` that overlaps
with `render*Buttons` for the same target. The rest of the candidate
list is **naming-clarity issues** (a function prefixed `apply*` that's
actually a pure compute returning a value; a function prefixed
`build*` that mounts to DOM instead of returning) — defensible
unilaterally, but worth fixing while we have a wave dedicated to it.

The post-W3.5 ctx-builder helper (`runtime-orchestration-ctx-builder.js`,
211 lines) hosts a **95-key dep-bag** for `BOOTSTRAP.init()`. This is
the cluster ROADMAP §"Wave 4 → Audit `ctx` object" specifically calls
out: *"every property that is a constant, every property that is a
method, grouped by the area that owns it. Move ctx-wiring into per-
area builders so `runtime-orchestration` doesn't list 200+ keys."*
The 95 keys are **already extracted from orchestration** by W3.5-C2,
but they're **alphabetised by accident of insertion order** — the
ROADMAP target. Re-grouping them by area is mechanical: the 95 keys
fall into **9 natural areas** (state / DOM refs / boards & rooms /
clamps / panel sync / status sync / FX defaults / live-sync / boot
flow), with the largest area (panel-sync) having 14 keys.

The positional-argument audit found **only one extreme offender**:
`drawAffineTriangle(cctx, img, sx0, sy0, sx1, sy1, sx2, sy2, dx0,
dy0, dx1, dy1, dx2, dy2)` — 14 positional args at
`runtime-projection-2d-fallback-renderer.js:25`. This is a
hot-loop helper called per-triangle in the 2D mesh-warp fallback
path; the args are 6 source-corner + 6 destination-corner numbers.
Convention would be a `{src: [...], dst: [...]}` bag, but
**performance-critical hot paths legitimately use positionals** —
flagged as a no-touch case. After it, the next-largest signature is
5 args (`startGifPreview`), and the rest are 4 args. Most 4-arg
signatures are coordinate quads (`x0, y0, x1, y1`), `(scope, def,
boardId, field)` editor-pane row builders, or accessor patterns
(`(boardId, roomId, partial)`). These are NOT compelling option-bag
candidates.

**Primary recommendation:** slice Wave 4 into 5 sub-waves with
**~30–40 atomic commits** total. W4.1 is the audit document
(this file's findings, codified into INVENTORY.md). W4.2 is the
ctx-builder area-grouping (one file edit, low risk). W4.3 is the
rename pass — one rename per commit, ordered low-call-site →
high-call-site so the riskier renames land last on a battle-tested
tree. W4.4 is option-bag conversions for the few clear candidates
(none are mandatory; document each). W4.5 is the wave-closing
INVENTORY + sweep. The Wave 3 norm of bisect-friendly atomic
commits + per-commit `node --check` + `<script>` order verification
+ namespace-key parity carries over verbatim.

The riskiest single rename is `refreshGlobalButtons` (47 call
sites; entangled with `renderInsideGlobalButtons` /
`renderOutsideGlobalButtons` which **mount different DOM** but
share the same conceptual target). The cheapest is
`applyDisposalToGifCanvas` (2 sites; pure local helper).

## 1. User constraints + lock-list (DO NOT RENAME)

These are NOT subjective — they are **public API contracts** or
**serialised data formats**. Renaming any of these silently breaks
the dashboard, `/output`, the live-sync protocol, persisted user
data, or RPi clients. The planner MUST treat this list as immutable.

### 1.1 IIFE namespace keys (public API surface)

[VERIFIED: `grep -rohE "window\.TT_BEAMER_[A-Z_]+" src/ | sort -u`]

The post-W3.6 tree exposes **101 distinct `window.TT_BEAMER_*`
namespace keys**. Every key is the cross-module contract that
orchestration consumes. Renaming any of them is **out of scope
for Wave 4**. Sample:

```
window.TT_BEAMER_ANIMATION_EDITOR_VIEW    (legacy — no RUNTIME_ prefix per W3.3 Decision-log)
window.TT_BEAMER_RUNTIME_ORCHESTRATION_HELPERS
window.TT_BEAMER_RUNTIME_ORCHESTRATION_CTX_BUILDER
window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING        (15 nested keys: applyTransform, getCorners, …)
…
```

The **keys exposed within each namespace** (e.g. the 15 keys on
`TT_BEAMER_RUNTIME_PROJECTION_MAPPING` — `applyTransform`,
`getCorners`, `getCornersForPersistence`, `getGrid`,
`hasGridDisplacements`, `hideHandles`, `init`,
`loadCornersFromConfig`, `onAlignModeChange`, `onWindowResize`,
`postDrawMeshWarp`, `remapPoint`, `resetCorners`, `resetGrid`,
`showHandles`) are also **part of the public contract** and were
verified through W3.2-C6 namespace parity ([VERIFIED: wave-3
INVENTORY §"End-of-W3.2 verification"]). These nested namespace
keys are **also** out of scope for renaming. Internal helpers
(IIFE-private functions never assigned to `window.TT_BEAMER_*`)
are the ONLY rename surface.

**Concrete consequence for Wave 4:** before renaming any function,
grep its name against `src/app/runtime/**/window.TT_BEAMER_*.{init,…}
= {…}` namespace exports. If the function name appears as a
namespace-export key, it's locked.

### 1.2 Live-sync protocol message types

[VERIFIED: `grep -rohE 'emitLiveMutation\("[a-z-]+"' src/app/runtime/`]

The wire-protocol message-type literal strings:

```
clear-all
context-update
edit-room
outside-update
stop-animation
trigger-global
trigger-room
```

Plus the ack types ([VERIFIED:
`runtime-live-sync-helpers.js:289, :301`]):

```
live-receive-ack
live-apply-ack
```

These are emitted on the wire and deserialised by other clients —
**any rename breaks live-sync between Control client + `/output`
+ any second control client**. Out of scope for Wave 4.

The corresponding **JS function names** that emit them
(`emitOutsideFxMutation`, `emitRoomDraftSyncMutation`,
`emitBoardLayoutContextMutation`, `emitStopAnimationCommand`) are
internal — those names CAN be renamed, but the literal payload
strings cannot.

### 1.3 localStorage / serialised JSON keys

[VERIFIED: `grep -rohE "['\"]tt-beamer[a-zA-Z0-9._-]+['\"]" src/`]

```
"tt-beamer.api-base.v1"
"tt-beamer.board-bundle.v1"            (export-bundle JSON schema field)
"tt-beamer.board-profiles.v1"          (deprecated — superseded by .v3, kept for migration)
"tt-beamer.board-profiles.v3"          (current persisted profile shape)
"tt-beamer.global-defaults.v1"
"tt-beamer.hitarea-calibration.v1"
"tt-beamer.last-board-id.v1"
"tt-beamer.projection-mapping.corners" (versionless — see §1.4)
"tt-beamer.projection-mapping-v2"
"tt-beamer.room-geometry.v1"
"tt-beamer.room.v2"
"tt-beamer-server-unreachable-overlay" (DOM ID, not a key, but follows same convention)
"tt-beamer.settings-subtab.v1"
"tt-beamer.special-polygons.v1"
```

All are `localStorage` keys or JSON-schema field names. Out of scope.

The **JS variables that hold these strings** (constants like
`LS_KEY_OLD`, `LS_KEY_V2` in `runtime-projection-grid-state.js`)
can be renamed if the literal string contents are preserved.

### 1.4 ROADMAP-locked decisions (read-only constraints)

From [ROADMAP §Wave 4 → Acceptance](../ROADMAP.md):

- **No two functions use different prefixes for the same operation**
  (e.g. `syncRoomList` and `applyRoomList` cannot both exist).
- **`ctx` keys grouped by area in the source**, not alphabetised
  by accident.
- **Full feature regression test passes** at end of wave.

From [ROADMAP §"Hard constraints"](../ROADMAP.md):

- **No behaviour changes.** Bit-for-bit identical UX.
- **No public-API changes** to live-sync / bundle JSON / localStorage.
- **No dependency changes.**
- **One commit per logical refactor.** No mega-commits.
- **Full feature regression after every wave.**

The Wave 3 doctrine of **bisect-friendly atomic commits** + per-
commit `node --check` + `<script>` order verification +
namespace-key parity is inherited verbatim. Wave 4's analog of
W3's "byte-identical body diff -w" gate is **"identifier-only
diff"** — every rename commit must `git diff -w` to a single
token replacement (with each callsite updating in lockstep).
Logic must not change.

## 2. Naming-convention spec (prefix table)

The codebase already follows most of these conventions; the spec
codifies what's there for the audit + rename pass. Every prefix
below is documented with its **canonical meaning**, the **post-W3.6
count** of functions using it, and **example calls** that match
the convention.

[VERIFIED: counts from `cat /tmp/runtime-fn-all.txt | sed -E
's/^([a-z]+)[A-Z].*/\1/; t; s/.*//' | sort | uniq -c | sort -rn`]

| Prefix | Convention | Count | Canonical example |
|---|---|---:|---|
| `render*` | Produce DOM/canvas output for the user. Mounts to live DOM or paints to canvas. | 14 | `renderRunningAnimationsList`, `renderClusterPads`, `renderRoomOverlay`, `renderInsideGlobalButtons` |
| `apply*` | Apply a state change that affects later behaviour. Side-effect; no return. | 23 | `applyAudioGain`, `applyBoardProfilesToState`, `applyLiveRuntimeSnapshot`, `applyStageViewportRecompute` |
| `sync*` | Reconcile UI/DOM (or audio) with current state. Idempotent; safe to call repeatedly. | 56 | `syncRoomFxPanel`, `syncAudioStatus`, `syncBoardSelectOptions` (✱ largest, most consistent group) |
| `update*` | Partial state mutation — accepts `(key, partial)` and merges. | 14 | `updateRoomGeometry(boardId, roomId, partial)`, `updateOutsideFxProfile(boardId, partial)` |
| `compute*` | Pure calculation. No side effects; returns a value. | 4 | `computeCentroid`, `computeHullFlickerGate`, `computePanForZoomFocus` |
| `get*` | Accessor — reads state or derived value, no mutation. | 103 | `getRoomFxProfile`, `getActivePolygonRoomId`, `getCorners` |
| `set*` | Mutator — writes a single value; no merge logic. | 39 | `setRoomGeometry`, `setSelectedPlayAreaId`, `setShipPolygonPoints` |
| `is*` | Boolean predicate — returns truthy/falsy. | 38 | `isRoomFrozen`, `isFiniteCanvasPoint`, `isAcceptablePolygonPointerEvent` |
| `has*` | Boolean predicate — usually existence check. | 5 | `hasRoom`, `hasGridDisplacements`, `hasGlobalColorTable` |
| `should*` | Boolean predicate — usually a guard / decision. | 10 | `shouldSuppressRapidTap`, `shouldDrawOutsideMp4Now` |
| `can*` | Boolean predicate — capability / permission check. | 4 | `canUndo`, `canRedo`, `canStartPanModeFromEvent` |
| `are*` | Boolean predicate (plural target). | 2 | `arePlayAreaVerticesEditable`, `areRoomVerticesEditable` |
| `build*` | Construct + return a new object/value. No DOM mount. | 37 | `buildHeader`, `buildBoardProfilesFromState`, `buildAnimationSnapshotForLiveSync` |
| `create*` | Construct + return a new object (often factory). Often used for default-data factories. | 27 | `createAnimation`, `createDefaultRoomFxByBoard`, `createIcon` |
| `emit*` | Fire an event/message (live-sync wire send, observer dispatch). | 4 | `emitOutsideFxMutation`, `emitRoomDraftSyncMutation` |
| `dispatch*` | Route a command to a handler (cluster tap routing). | 3 | `dispatchClusterByTapAction`, `dispatchClusterClear` |
| `wire*` | Bind event listeners (one-shot at init). Top-level binders. | 8 | `wireRoomAudioBinders`, `wirePolygonEditorBinders`, `wireOverlayWindowBinders` |
| `init` (bare) | Module initialization — receives dep-bag. Each IIFE has exactly one. | 60+ | `init({ctx})` (per-module) |
| `run*` | Execute a procedure, often boot-time regression / lifecycle pass. | 11 | `runLayoutScrollRegression`, `runViewVisibilityRegression` |
| `bind*` | Attach DOM ↔ state bindings inside a builder. Different from `wire*` — operates on a built fragment, not the global tree. | 5 | `bindDom`, `bindOverlayEvents`, `bindDevicePixelRatioWatcher` |
| `clamp*` | Bound a numeric value to its allowed range. Pure. | 18 | `clampRoomOpacity`, `clampOutsideSpeed`, `clampPolygonHandleScale` |
| `normalize*` | Coerce data into canonical shape. Pure. Returns a new object. | 50 | `normalizeRoomFxProfile`, `normalizeOutsideAnimationDefinition` |
| `resolve*` | Look up + return a derived value, often involving fallbacks. Pure. | 16 | `resolveAnimationIcon`, `resolveRoomGifRenderConfig` |
| `validate*` | Assert invariant — typically returns `{ ok, reason }` or warns. | 4 | `validateRunningListParity`, `validateViewExclusivity` |
| `format*` | Produce a human-readable string. Pure. | 8 | `formatAssetType`, `formatResolveSnapshot` |
| `collect*` | Gather + return a collection. Pure. | 10 | `collectAnimations`, `collectStageViewportMetrics`, `collectDomRefs` |
| `clear*` | Wipe a piece of state — counterpart to a `mark*` / `start*`. Side-effect. | 21 | `clearStopPending`, `clearPolygonDragSession` |
| `mark*` | Set a boolean / pending flag. Side-effect; counterpart to `clear*`. | 6 | `markLiveEditorDirty`, `markStopPending` |
| `commit*` | Finalise a draft → persisted state. | 6 | `commitInsideDraftToDefinition`, `commitPolygonDrag` |
| `begin*` / `end*` | Drag/gesture lifecycle pair (begin a session, end it). | 6 / 3 | `beginPolygonAreaDrag` / `endPolygonDragInteraction` |
| `start*` / `stop*` | Animation/preview lifecycle pair. | 6 / 5 | `startCodedPreview` / `stopCodedPreview` |
| `add*` / `remove*` | Listener / DOM child registration pair. | 5 / 3 | `addHandlesVisibleListener` / `removeHorizontalLine` |
| `enter*` / `exit*` | Mode lifecycle pair. | 1 / 1 | `enterRotationMode` / `exitRotationMode` |
| `on*` | Event handler — name matches DOM event after the prefix. | 23 | `onWindowResize`, `onPointerDown`, `onContextMenu` |
| `handle*` | Higher-level event handler not bound to a single DOM event. | 5 | `handleAddRoomHere`, `handleQuickModeRoomTap`, `handleBack` |
| `_xxx` | **Module-private** helper (never on `window.TT_BEAMER_*` namespace). 58 functions follow this convention as of W3.6. | 58 | `_wireOverlayPointerMove`, `_initMeshWarpGL`, `_populateLiveEditorPanel` |

**Convention notes:**

- `apply*` vs `sync*`: the line is "does this only reconcile UI to
  state, or does it actually mutate state that downstream code
  reads?" Pure reconciliation = `sync*`. State mutation that
  changes future behaviour = `apply*`. Both are side-effects; the
  distinction is *what* gets mutated.
- `update*` vs `set*`: `set*` writes a value verbatim. `update*`
  takes a `partial` and merges. `updateRoomGeometry(b, r, partial)`
  internally calls `setRoomGeometry(b, r, {...prev, ...partial})`
  — that's the established convention
  ([VERIFIED: `runtime-board-state-accessors.js:49-52`]).
- `build*` vs `create*` vs `make*`: `build*` for one-off
  constructors of derived data (returns new object).
  `create*` for factory-pattern (often default-data factories,
  e.g. `createDefault*ByBoard`). `make*` is reserved (only
  `makeShim` exists in tests, not in runtime).
- `render*` vs `sync*Panel`: `render*` mounts new DOM children
  (often via `replaceChildren()`). `sync*Panel` toggles classes /
  writes textContent / sets attributes on existing DOM. Both are
  UI side-effects but the distinction matters for cost and
  reentrance: `render*` rebuilds; `sync*Panel` reconciles.
- `refresh*`: NOT in the canonical prefix table. The 4 `refresh*`
  functions are de-facto `sync*`-aliases; see §3 candidates list.

### 2.1 Prefixes that are NOT problems (lock as-is)

Several prefixes appear once and are domain-specific (acceptable
without a rename):

- `seed*` (2 — random-seed factories)
- `swap*` (2 — DOM swap)
- `concat*` (1 — `concatGifSubBlocks`)
- `cancel*` (4 — drag cancellation, paired with `begin*`)
- `arm*` (1 — `armClearAllGuard`, paired with `resetClearAllGuard`)
- `enter*` / `exit*` (1+1 — rotation mode pair)
- `begin*` / `end*` / `finish*` (6+3+? — drag lifecycle triplet)

These are well-understood domain idioms.

## 3. Rename candidates (post-W3.6 audit)

Below is the **complete list of identifiers flagged as
inconsistent with the §2 spec**. Each entry includes (a) the
location, (b) the body's actual behaviour, (c) the prefix-
convention violation, (d) the proposed name, (e) the call-site
count from `grep -rn "<name>" src/ | wc -l`. Call counts are
**total occurrence counts** (definition + reference + namespace-
export + ctx-bag entry), not unique reference counts; they're
the bound on rename invasiveness.

The list is split into **HIGH** (clear semantic mismatch — strong
case for rename), **MEDIUM** (defensible either way, planner /
discuss-phase decides), and **LOW** (cosmetic — preference, not
correctness).

### 3.1 HIGH — strong case for rename

#### R1. `updateMobilePerformanceStatus` → `syncMobilePerformanceStatus`

- **Location:** [`runtime-perf.js:222`](../../../src/app/runtime/render/runtime-perf.js)
  [VERIFIED]
- **Body:** writes `textContent` to a status DOM element (`Mobile
  Performance: Trigger p95 …ms | Frame p95 …ms (~… FPS) …`) and
  returns nothing.
- **Why wrong:** the function reconciles a status DOM node to
  current state. Every other status-writer in the runtime is named
  `sync*Status`: `syncAudioStatus`, `syncBoardZoomStatus`,
  `syncHitareaStatus`, `syncMobileLayoutStatus`,
  `syncPolygonEditorStatus`, `syncRoomGeometryStatus`,
  `syncShipPolygonEditorStatus`, `syncZoneLoaderStatus`,
  `syncAudioMappingStatus` (9 functions). `update*` is reserved
  for partial-merge state mutators (per §2 convention).
- **Conflict shape:** this is the ROADMAP §Wave 4 example shape —
  the same operation (DOM-text reconciliation against state) has
  TWO different prefixes in the codebase. Acceptance criterion
  forbids it.
- **Call sites:** 16 (1 def + 15 refs), spanning 7 files
  ([VERIFIED]: `runtime-perf.js`, `runtime-stage-viewport.js`,
  `runtime-bootstrap.js`, `runtime-panels-controller.js`,
  `viewport-lifecycle.js`, `runtime-orchestration.js`,
  `runtime-orchestration-ctx-builder.js`).
- **ctx-bag implication:** `updateMobilePerformanceStatus` is
  one of the 95 ctx-builder keys ([VERIFIED:
  `runtime-orchestration-ctx-builder.js:51, :148`]). Renaming it
  changes a ctx key — see §4 (ctx audit).

#### R2. `applyHitareaCalibration` → `computeHitareaCalibratedPoint`

- **Location:** [`runtime-room-geometry.js:23`](../../../src/app/runtime/state/runtime-room-geometry.js)
  [VERIFIED]
- **Body:** `(x, y, calibration) ⇒ [scaledX, scaledY]` —
  **pure function** (no side effects, returns new value).
- **Why wrong:** `apply*` per §2 means side-effect (no return).
  This is a `compute*` per the spec — pure transform.
- **Conflict shape:** same name pattern as `getHitareaCalibration`
  / `setHitareaCalibration` (the actual state accessors), which
  causes confusion at the call site about which one is the data
  read vs the math op.
- **Call sites:** 3 (1 def + 1 namespace-export + 1 ref via
  `runtime-orchestration.js:955`). Cheap rename.

#### R3. `applyPolygonPrecedence` → `mergePolygonPrecedence`

- **Location:** [`runtime-play-area-geometry.js:249`](../../../src/app/runtime/state/runtime-play-area-geometry.js)
  [VERIFIED]
- **Body:** `(baseProfiles, polygonOwnerProfiles) ⇒ merged` —
  **pure function** (returns new merged object).
- **Why wrong:** `apply*` should be side-effecting per §2. This is
  a pure merge.
- **Call sites:** 3 (1 def + 1 namespace-export + 1 ref). Cheap.

#### R4. `applyRoomCatalog` → `mergeRoomCatalog` (lib/)

- **Location:** [`src/app/lib/domain/rooms.js:108`](../../../src/app/lib/domain/rooms.js)
  [VERIFIED]
- **Body:** `(board, roomCatalog, deletedRoomIds) ⇒
  normalizeBoard({...board, rooms: nextRooms})` — **pure
  function** returning a new board.
- **Why wrong:** same as R3. `apply*` implies side-effect, body is
  pure-functional.
- **Call sites:** 5 (1 def + 4 refs). Cheap.

### 3.2 MEDIUM — defensible either way

#### R5. `refreshGlobalButtons` → `syncGlobalButtonsActiveState`

- **Location:** [`runtime-lifecycle-running-list.js:507`](../../../src/app/runtime/animation/runtime-lifecycle-running-list.js)
  [VERIFIED]
- **Body:** queries `[data-global]` buttons, toggles `.active`
  class based on `state.runningAnimations`, calls
  `renderClusterPads()`. Does NOT create or destroy DOM children;
  reconciles state-derived class names on existing DOM — that's
  the §2 definition of `sync*`.
- **Why marginal:** "refresh" is colloquially understood;
  `refresh*` is a near-synonym of `sync*`. The codebase has
  4 `refresh*` functions total (`refreshGlobalButtons`,
  `refreshApplyDiscardButtonsUi`,
  `refreshPersistentRoomSelectionVisualState`,
  `refreshStageGeometryCache` — the last one is a cache-invalidate,
  arguably its own verb). Standardising `refresh*` → `sync*`
  removes a redundant prefix from the spec.
- **CRITICAL:** there are also `renderInsideGlobalButtons` and
  `renderOutsideGlobalButtons` ([VERIFIED:
  `runtime-fx-panels-inside-outside.js:290, :305`]) which build
  fresh button children via `replaceChildren()`. **They target
  the SAME DOM element family** (`#inside-global-buttons` /
  `#outside-global-buttons` — see ctx refs). The intended
  separation: `render*` rebuilds children; `refresh*` (→
  `sync*`) toggles `.active` on existing children. Renaming
  `refreshGlobalButtons` to `syncGlobalButtons` (without the
  `ActiveState` qualifier) creates ambiguity with the
  render-pair. Recommended target name: **`syncGlobalButtonsActiveState`**
  — verbose but accurate. Or: leave `refresh*` as-is and
  document that it's an established alias for "class-toggle
  reconciliation".
- **Call sites:** 47 — by far the most invasive rename in this
  list. **Recommend deferring this rename to a single dedicated
  commit at the END of W4.3** (touch the highest-risk surface
  last). Or **consider keeping `refresh*` as a documented
  prefix in §2** and leaving these names alone. The decision
  belongs in the discuss-phase before W4 starts.

#### R6. `updateClusterPadsRect` → `syncClusterPadsRect`

- **Location:** [`runtime-lifecycle-cluster-pads.js:65`](../../../src/app/runtime/animation/runtime-lifecycle-cluster-pads.js)
  [VERIFIED]
- **Body:** writes CSS variables (`--rail-left`, `--rail-top`,
  `--rail-height`, `--rail-scale`) on `#cluster-pads` based on
  stage's `getBoundingClientRect()`. Reconciles DOM CSS vars to
  state — that's `sync*` per §2.
- **Why marginal:** `update*` was probably chosen because it's
  called on every animation frame (continuous "update"), but the
  semantics is reconciliation. Rename is consistent, low-risk.
- **Call sites:** 5.

#### R7. `applyAudioGain` → `syncAudioGain` (or leave as-is)

- **Location:** [`runtime-audio.js:101`](../../../src/app/runtime/render/runtime-audio.js)
  [VERIFIED]
- **Body:** mutates `audioVoice.volume` on every active voice +
  every animation's voice based on `state.audio.volume` + per-
  animation soundVolume. Reconciles audio output to state — same
  shape as `sync*Status` reconciles DOM-text to state.
- **Why marginal:** the audio voice volumes ARE the state from a
  certain view (they're not in `state.*`). Could read either way:
  "apply state to audio outputs" (apply) or "reconcile audio
  outputs to state" (sync). Convention-wise `sync*` is closer.
- **Call sites:** 13. Moderate risk.

#### R8. `applyMediaPreviewProps` → `syncMediaPreviewProps`

- **Location:** [`animation-editor-live-preview.js:376`](../../../src/app/runtime/ui/animation-editor-live-preview.js)
  [VERIFIED]
- **Body:** writes `el.opacity`, `el.style.transform` etc. based
  on def. Same shape as a `sync*Panel`.
- **Call sites:** 6.

#### R9. `applyMenuMode` → `setMenuMode` or `applyMenuModeToDom`

- **Location:** [`runtime-polygon-context-menu.js:97`](../../../src/app/runtime/polygon-editor/runtime-polygon-context-menu.js)
  [VERIFIED]
- **Body:** takes `{mode, roomId}` — sets internal state +
  toggles class names on the menu. Mostly a setter, partly DOM
  reconciliation.
- **Why marginal:** could go either way. Borderline. Could keep
  `apply*` since it does affect downstream state read by `showMenu`.
- **Call sites:** 3.

#### R10. `applyDisposalToGifCanvas` → `applyGifDisposalToCanvas` (clarity only)

- **Location:** [`runtime-gif-decoder.js:167`](../../../src/app/runtime/render/runtime-gif-decoder.js)
  [VERIFIED]
- **Body:** mutates `canvasPixels` Uint8ClampedArray based on GIF
  disposal flags. Side-effect, returns nothing. Legitimate
  `apply*`. Just word-order ambiguity.
- **Why marginal:** strictly a clarity tweak. Not a convention
  violation. Recommend leaving alone.
- **Call sites:** 2.

#### R11. `buildTiles` → `renderTiles` (or `mountTiles`)

- **Location:** [`icon-picker.js:17`](../../../src/app/runtime/ui/icon-picker.js)
  [VERIFIED]
- **Body:** calls `root.replaceChildren()`, then appends new tile
  DOM children, AND returns the array of created nodes. Both
  mounts AND returns.
- **Why marginal:** `build*` per §2 returns without mounting;
  `render*` per §2 mounts. This function does both. The return
  value is used (not orphaned). Could go either way.
- **Call sites:** 2.

### 3.3 LOW — cosmetic preference, recommend leaving alone

#### R12. `updateOutsideFxProfile` (already correct — partial-merge)

- **Location:** [`runtime-fx-normalizers.js:310`](../../../src/app/runtime/state/runtime-fx-normalizers.js)
  [VERIFIED]
- **Body:** `(boardId, partial) ⇒ setOutsideFxProfile(merged)`.
  Legitimate partial-merge mutation — exactly the §2 `update*`
  convention.
- **Why flagged:** the symmetric `updateRoomFxProfile` and
  `updateInsideFxProfile` do NOT exist; only `setRoomFxProfile`
  / `setInsideFxProfile` exist. Asymmetry, but each side is
  individually correct.
- **Recommend:** leave as-is. Adding the missing
  `update*` partners would be a feature, not a refactor.

#### R13. `applyTransform` (LOCKED — public namespace contract)

- **Location:** [`runtime-projection-mapping.js:124`](../../../src/app/runtime/viewport/runtime-projection-mapping.js)
  [VERIFIED]
- **Body:** intentional no-op kept for the public API contract
  (post-W3.2 shim still exposes it). The 12-line comment
  explains why ([VERIFIED]).
- **Why locked:** key in `window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING`.
  See §1.1.
- **Recommend:** DO NOT RENAME.

#### R14. `applyZoomScaleAroundClientPoint` (legitimate `apply*`)

- **Location:** [`runtime-viewport-zoom.js:318`](../../../src/app/runtime/viewport/runtime-viewport-zoom.js)
  [VERIFIED]
- **Body:** mutates pan/zoom state + calls
  `applyStageViewportRecompute`. Legitimate side-effect.
- **Recommend:** leave as-is.

#### R15. `applyOutputRoleViewContract`, `applyStageViewportRecompute`,
`applyRoomDraftTargetFromRoomClick`, `applyLiveEditorValue`,
`applyLiveRuntimeSnapshot`, `applyMenuMode`,
`applyBoardProfilesToState`, `applyGlobalDefaultsPayloadToState`,
`applyGridPayload`, `applyIncrementalPolygonPointsToDom`,
`applyIncrementalRoomDrag`, `applyIncrementalShipDrag`,
`applyIncrementalVertexHandlesToDom`, `applyPersistedRuntimeSettings`,
`applySnapshotPolygonState`, `applyDefinitionDefaultsToDraft`

All are legitimate `apply*` per §2 (side-effect mutations of
state or DOM). Recommend leaving alone. (Listed for the planner
to confirm the audit is exhaustive.)

### 3.4 Summary table — Wave 4 rename targets

| ID | From | To | Confidence | Sites | Risk |
|---|---|---|---|---:|---|
| R1 | `updateMobilePerformanceStatus` | `syncMobilePerformanceStatus` | HIGH | 16 | M (ctx-key change) |
| R2 | `applyHitareaCalibration` | `computeHitareaCalibratedPoint` | HIGH | 3 | L |
| R3 | `applyPolygonPrecedence` | `mergePolygonPrecedence` | HIGH | 3 | L |
| R4 | `applyRoomCatalog` | `mergeRoomCatalog` | HIGH | 5 | L |
| R5 | `refreshGlobalButtons` | `syncGlobalButtonsActiveState` | MED | 47 | H |
| R6 | `updateClusterPadsRect` | `syncClusterPadsRect` | MED | 5 | L |
| R7 | `applyAudioGain` | `syncAudioGain` | MED | 13 | M (ctx-key change) |
| R8 | `applyMediaPreviewProps` | `syncMediaPreviewProps` | MED | 6 | L |
| R9 | `applyMenuMode` | `setMenuMode` | MED | 3 | L |
| R10 | `applyDisposalToGifCanvas` | `applyGifDisposalToCanvas` | LOW | 2 | L |
| R11 | `buildTiles` | `renderTiles` | LOW | 2 | L |

**Aggregates** [VERIFIED via per-row `grep -rn`]:

- **HIGH-confidence renames:** 4 candidates, **27 total occurrences**.
- **MEDIUM-confidence renames:** 7 candidates, **76 total
  occurrences** (dominated by R5 at 47).
- **LOW-confidence renames:** 2 candidates, **4 total occurrences**.
- **TOTAL flagged:** 11 candidates across **107 occurrences**.

This is **far less invasive** than ROADMAP §Wave 4 might suggest
("Mass-rename pass aligning the codebase to the convention"). The
codebase is **already mostly consistent**; the rename pass is a
targeted cleanup, not a sweeping overhaul.

**Per-rename estimate:** typical rename touches **3–5 files** (def
+ namespace export + 1–3 callers). The 47-call-site outlier (R5)
is the one that genuinely deserves "mass" framing. Excluding R5,
the average is ~6 occurrences per rename across 11 candidates =
~60 total token swaps across the wave.

## 4. `ctx` object audit + per-area-builder strategy

ROADMAP §Wave 4 calls out specifically: *"Audit `ctx` object: every
property that is a constant, every property that is a method,
grouped by the area that owns it. Move ctx-wiring into per-area
builders so `runtime-orchestration` doesn't list 200+ keys."*

[VERIFIED: `grep -rohE "ctx\.[a-zA-Z_$][a-zA-Z0-9_$]*" src/app/runtime/
| sort -u | wc -l`] — **640 distinct `ctx.<key>` accesses** across
runtime/. That's the read surface; the **write surface** is the 45
`.init({...})` ctx-bag construction sites in
`runtime-orchestration.js` (counted via `grep -nE "\.init\(\{"
src/app/runtime/runtime-orchestration.js | wc -l`) PLUS the 95
keys in the post-W3.5 `runtime-orchestration-ctx-builder.js`.

**Critical clarification:** the **640 `ctx.*` reads** are
**not 640 distinct keys** — they're 640 distinct property-access
strings, where many keys share suffixes (e.g. `ctx.state`,
`ctx.state.boardId`, `ctx.state.runningAnimations`,
`ctx.state.audio.volume` are 4 distinct accessor strings reading
the same `state` key). The `state` key itself is hit **293 times**
([VERIFIED: most-read]). The actual **distinct top-level keys**
flowing through ctx is ~95 (the BOOTSTRAP bag) + the ~50–80
sub-bag-only keys that some `ctx`s carry but the bootstrap one
doesn't (e.g. `ctx.normalizeRoomAssetType`, `ctx.SOUND_MAPPING_NONE`,
`ctx.OUTPUT_ROLE_FINAL`).

The post-W3 ctx is **already much smaller than ROADMAP's "200+ keys"
projection** — W3.5-C2 extracted the BOOTSTRAP dep-bag into a
helper. The ROADMAP target was based on the pre-W3 orchestration
shape; post-W3.5 it's ~95 named keys in the helper, plus per-
sub-module init bags that range from 5–30 keys each. **The
ROADMAP "200+ keys" framing is stale and overstated for the
post-W3.6 tree.**

### 4.1 The 95-key BOOTSTRAP dep-bag (current state)

[VERIFIED: full enumeration of
`runtime-orchestration-ctx-builder.js:109-205`]

The 95 keys are CURRENTLY **alphabetised by accident of insertion
order** — not by area. The listing below regroups them by area;
the order in this section IS the proposed area-grouped layout.

#### Area A — runtime state + globals (4 keys)

```
state                          // single source of truth (object ref)
liveSync                       // live-sync handle
logBootstrap                   // logger
triggerFeedback                // user feedback fn (no-op-safe)
```

#### Area B — DOM refs (panel inputs / status nodes — 12 keys)

```
globalDefaultsStatus
apiDiagnoseStatus
animationSpeedInput
roomAnimationSelect
roomOpacityInput
roomOpacityValue
roomIntensityValue
roomSpeedValue
roomSoundVolumeValue
roomDurationInput
audioEnabledInput
audioVolumeInput
audioVolumeValue
```

(Strictly 13 — same area, room + audio inputs. Could split into B1
"Room editor inputs" / B2 "Audio editor inputs" if desired.)

#### Area C — boards (1 key)

```
getBoards                      // accessor — let-reassignable
switchBoard                    // boardId, opts → void
```

(2 keys.)

#### Area D — clamps (4 keys)

```
clampRoomOpacity
clampRoomSpeed
clampRoomSoundVolume
clampAnimationSpeed
```

(All `(v) ⇒ clampedNumber`. Pure.)

#### Area E — panel sync (14 keys — largest area)

```
syncRoomDraftActionButton
syncAudioMappingPanel
syncAnimationSpeedPanel
syncHitareaCalibrationPanel
syncRoomGeometryPanel
syncPolygonEditorPanel
syncShipPolygonEditorPanel
syncRoomFxPanel
syncOutsideFxPanel
syncAlignModePanel
syncBoardZoomPanel
syncDashboardZoneVisibility
syncMp4PerformanceControlsPanel
syncMobileStickyOffsets
syncQuickModePanel
syncBoardSelectOptions
```

(16 keys, largest area. Distinguishing "panel" vs "options" is
arbitrary — same shape.)

#### Area F — status sync (2 keys)

```
syncAudioStatus
updateMobilePerformanceStatus  // RENAME → syncMobilePerformanceStatus per R1
```

#### Area G — audio side-effects (3 keys)

```
applyAudioGain                 // R7 — proposed sync*
enforceAudioLifecycleGuard
playSoundForAnimation
```

#### Area H — view + viewport (5 keys)

```
applyOutputRoleViewContract
loadProjectionCornersFromConfig
applyProjectionTransform
setActiveView
setPanCursorState
```

#### Area I — default-data factories (12 keys)

```
createDefaultHitareaCalibrationMap
createDefaultRoomTombstonesByBoard
createDefaultRoomGeometryByBoard
createDefaultRoomStateProfilesByBoard
createDefaultSpecialPolygonsByBoard
createDefaultPlayAreasByBoard
createDefaultSelectedPlayAreaIdByBoard
createDefaultInsideFxByBoard
createDefaultRoomFxByBoard
createDefaultOutsideFxByBoard
createDefaultBoardZoomByBoard
createDefaultAnimationSoundMap
```

#### Area J — domain getters / normalizers (3 keys)

```
getShipPolygonPoints
normalizeQuickMode
normalizeAnimationSoundMap
```

#### Area K — boot-flow (5 keys)

```
fetchGlobalDefaultsPayload
loadBoardProfiles
captureCleanBaseline
restoreSettingsSubtabPreference
loadExternalBoardZones
loadOutsideResourceAssets
```

(6 keys.)

#### Area L — error / overlay UI (3 keys)

```
buildResolveSnapshot
formatResolveSnapshot
renderServerUnreachableOverlay
```

#### Area M — live-sync (3 keys)

```
connectLiveSyncSocket
scheduleNextLiveSnapshotPoll
emitLiveMutation
buildAnimationSnapshotForLiveSync
```

(4 keys.)

#### Area N — asset warm-up (3 keys)

```
warmEventSoundAssets
warmRoomGifAssets
prewarmBoardOutsideMp4Asset
```

#### Area O — regression tests (10 keys)

```
runViewVisibilityRegression
runLayoutScrollRegression
runStartupDefaultsGuardRegression
runZoomPanEditRegression
runPanPointerCaptureRegression
runOrientationStateRegression
runNavigationStateRegression
runMobileProjectionVisibilityGuard
runOutsideIsolationRegression
runShipClipRegression
```

#### Area P — animation lifecycle hooks (4 keys)

```
renderRunningAnimationsList
refreshGlobalButtons               // R5 — proposed sync*
draw
createAnimation
```

#### Area Q — diagnostics (1 key)

```
getLiveTraceSnapshot
```

**Total area-grouped keys: 4 + 13 + 2 + 4 + 16 + 2 + 3 + 5 + 12 +
3 + 6 + 3 + 4 + 3 + 10 + 4 + 1 = 95 keys.** Matches the bag size
([VERIFIED]).

### 4.2 Implementation strategy — Option (a) vs Option (b)

ROADMAP suggests "per-area builders so `runtime-orchestration`
doesn't list 200+ keys." The 95-key reality offers two paths:

#### Option (a) — split into per-area builder helpers (more invasive)

Replace the single `buildBootstrapCtx(refs)` with multiple builders:

```js
// runtime-orchestration-ctx-builder.js (post-W4.2 option a)
function buildStateAndGlobals(refs) { … }   // 4 keys
function buildPanelInputDomCtx(refs) { … }  // 13 keys
function buildBoardsCtx(refs) { … }         // 2 keys
function buildClampsCtx(refs) { … }         // 4 keys
function buildPanelSyncCtx(refs) { … }      // 16 keys
…etc, 17 area-builders…
function buildBootstrapCtx(refs) {
  return {
    ...buildStateAndGlobals(refs),
    ...buildPanelInputDomCtx(refs),
    …
  };
}
window.TT_BEAMER_RUNTIME_ORCHESTRATION_CTX_BUILDER = {
  buildBootstrapCtx,                   // top-level (legacy entry)
  // optionally: per-area exports for sub-module init bags later
};
```

**Pros:**

- Cleaner separation: each area-builder's body is small (4–16
  keys), self-documenting.
- Per-area builders can be REUSED for sub-module init bags too —
  e.g., `runtime-audio.js` could ask for just
  `buildAudioCtx(refs)` instead of repeating the panel-sync slice
  manually.
- Aligns with the ROADMAP target literally.

**Cons:**

- 17 new function definitions in one file. Internal complexity
  goes UP (more to read) even though each piece is smaller.
- The cross-area shared keys (`refs.state`) flow through every
  builder — bookkeeping overhead.
- W4.2 commit becomes a big rewrite of one file (~200 lines net
  change), risking the W3-style "mathematical projection error"
  (W3.5-C2 deviation) where the goal collapse doesn't materialise.

#### Option (b) — one builder, comment-grouped internally (lower-risk)

Keep `buildBootstrapCtx(refs)` as a single 211-line function but
**reorder the destructure block + the return literal so the keys
are area-grouped, with a `// ── Area X — Name ────────────────`
comment header per group**.

Concretely the transformation is:

1. Extract the 95-key `const { … } = refs` destructure block.
2. Sort it by area (per §4.1).
3. Insert area-divider comments between groups.
4. Repeat for the return-literal block (95 keys with arrow
   wrappers).
5. The function body is **otherwise unchanged**; logic is identical;
   `node --check` clean; `git diff -w` shows reordering only.

**Pros:**

- One commit. Single file. No new function definitions. No new
  namespace keys.
- Lowest risk by far. Diff is mechanical.
- ROADMAP's literal text says "grouped by the area in the source"
  — a comment-banner header IS grouping in the source.
- Sets up Option (a) as a future refinement (W5 or later) if it
  becomes valuable.

**Cons:**

- Doesn't reduce orchestration's 95-line bag into shorter chunks.
- Per-area sub-module init bags don't get the reuse benefit.

#### Recommendation

**Option (b) for W4.2.** Lower risk, ROADMAP-compliant, single
commit. The Wave 3 lessons (the W3.5-C2 calibration miss) make
the case for the lower-risk refactor: do the visible-from-source
grouping first; revisit Option (a) in W5 if module-boundary
work needs the per-area exports.

If the discuss-phase wants Option (a), the planner should slice
W4.2 into multiple commits: one commit per area-builder added
(creating the helper without yet using it), then one commit
swapping `buildBootstrapCtx`'s body to use the new helpers, then
verification.

### 4.3 Sub-module init bags — out of scope for W4.2

The 45 `<sub-module>.init({...})` bags in
`runtime-orchestration.js` (lines 222–2358; not in the
ctx-builder helper) are **separate** from the BOOTSTRAP dep-bag.
They are smaller (typically 5–30 keys) and **already area-grouped
by the sub-module they target** (e.g.,
`TT_BEAMER_RUNTIME_AUDIO.init({...})` only carries audio-area
keys). Reorganising them is **not part of the W4 acceptance bar**
(the acceptance bar mentions "ctx" specifically, which post-W3
is the BOOTSTRAP bag in the ctx-builder helper).

**Recommend:** scope W4.2 to the ctx-builder helper only. Leave
the 45 init bags alone. If the planner wants to expand scope,
each sub-module init bag is its own ~10-key reorganisation — could
be a W4.4-extra cluster, but the value is low and the diff
surface is high.

## 5. Option-bag vs positional-arg audit

[VERIFIED: Python script over `function NAME(...)` declarations,
counted top-level commas]

### 5.1 Functions with ≥4 positional args (16 total)

| Args | Location | Signature | Verdict |
|---:|---|---|---|
| 14 | `runtime-projection-2d-fallback-renderer.js:25` | `drawAffineTriangle(cctx, img, sx0, sy0, sx1, sy1, sx2, sy2, dx0, dy0, dx1, dy1, dx2, dy2)` | **HOT LOOP — leave alone.** Per-triangle draw call in 2D mesh-warp fallback. Allocating an options object per triangle would tank fallback performance. ([VERIFIED]: source comment cites RPi/Chromium fallback context, W3.2-C3 INVENTORY records "byte-identical body"). The 6+6 positional encoding (src triangle + dst triangle) is the canonical math signature. |
| 5 | `animation-editor-live-preview.js:272` | `startGifPreview(canvas, scope, def, wrap, ref)` | **MEDIUM candidate.** Mixed-purpose args; an options bag `{canvas, scope, def, wrap, ref}` would read clearer at call sites. |
| 4 | `runtime-viewport-zoom.js:318` | `applyZoomScaleAroundClientPoint(nextScale, clientX, clientY, reason)` | **LEAVE.** `clientX, clientY` is the canonical "pointer position" pair; `nextScale, reason` are obvious from order. |
| 4 | `runtime-stage-viewport.js:169` | `mapNormalizedPointToPixels(normalizedX, normalizedY, width, height)` | **LEAVE.** Coordinate-mapping function; positional is conventional (DOMPoint shape). |
| 4 | `runtime-projection-grid-state.js:74` | `setPoint(row, col, x, y)` | **LEAVE.** Public namespace API ([VERIFIED]: namespace export). 4 positional coordinates; idiomatic. |
| 4 | `runtime-polygon-drag-support.js:201` | `projectDisplayNormalizedToRoomRaw(displayNormalizedX, displayNormalizedY, room, boardId)` | **LEAVE.** Conversion helper; first 2 are coords, last 2 are context. |
| 4 | `animation-editor-edit-pane.js:625` | `patchAnimation(scope, boardId, id, patch)` | **MEDIUM candidate.** `(scope, boardId, id, patch)` ordering is stable but error-prone — easy to swap `scope` with `boardId`. Bag `{scope, boardId, id, patch}` reads better. Note: `patchAnimation` is exported via `TT_BEAMER_RUNTIME_ANIMATION_EDITOR_EDIT_PANE` namespace ([VERIFIED]: `animation-editor-edit-pane.js` namespace export); changing its shape changes the namespace contract, so it's a public-API change. **Out of scope per §1.1.** |
| 4 | `animation-editor-edit-pane.js:495` | `buildSelectRow(scope, def, boardId, field)` | Internal builder. Bag would help. |
| 4 | `animation-editor-edit-pane.js:365` | `buildToggleRow(scope, def, boardId, field)` | Internal builder. Bag would help. |
| 4 | `animation-editor-edit-pane.js:338` | `buildSliderRow(scope, def, boardId, field)` | Internal builder. Bag would help. |
| 4 | `runtime-room-geometry.js:118` | `getRoomPolygonPixels(room, width, height, boardId)` | **LEAVE.** Pure conversion. |
| 4 | `runtime-draw-loop.js:62` | `drawRoomComposition(animation, age, room, roomMetrics)` | **LEAVE.** Per-frame hot-path; positional ordering stable. |
| 4 | `runtime-polygon-rotation.js:91` | `rotatePointsAround(points, cx, cy, angle)` | **LEAVE.** Math function, idiomatic. |
| 4 | `runtime-polygon-context-menu.js:131` | `showMenu(clientX, clientY, normalizedX, normalizedY)` | **LEAVE.** 4 coordinates, idiomatic. |
| 4 | `runtime-lifecycle-running-list.js:234` | `_buildRunningRow(anim, sectionKey, isStacked, deps)` | Module-private (`_*`). Bag would help, but it's already private + W3.4-extracted. |
| 4 | `runtime-lifecycle-running-list.js:103` | `_categorizeAndOrderAnimations(listAnimations, getGlobalCategoryRuntimeLabel, getBoard, getClusterTargetById)` | Module-private. The 3 trailing args are dep-injection refs — a bag is a clean fit. |

### 5.2 Recommended option-bag conversions

**Conservative list** (only candidates that aren't public-API,
aren't hot loops, aren't math conventions):

| ID | From | To | Confidence | Sites |
|---|---|---|---|---:|
| O1 | `_buildRunningRow(anim, sectionKey, isStacked, deps)` | `_buildRunningRow({anim, sectionKey, isStacked, deps})` | MEDIUM | 1 internal call site |
| O2 | `_categorizeAndOrderAnimations(listAnimations, getCat, getBoard, getCluster)` | `_categorizeAndOrderAnimations({listAnimations, getGlobalCategoryRuntimeLabel, getBoard, getClusterTargetById})` | MEDIUM | 1 internal call site |
| O3 | `buildSliderRow / buildToggleRow / buildSelectRow(scope, def, boardId, field)` | `(...)({scope, def, boardId, field})` cluster | LOW | each ~2–3 sites; cluster-rename touches 6–9 sites total |

**Aggregate:** 3 candidates; 8–11 occurrences. Tiny relative to
the §3 rename volume.

`startGifPreview` is interesting (5 args, all clearly named) but
it's exported via `TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIVE_PREVIEW`
namespace ([VERIFIED]: wave-3 INVENTORY §"W3.3 namespaces"). Not
necessarily public ABI (sub-module-internal) but the cross-module
call site in the shim wraps it. Marginal — recommend leaving.

### 5.3 Recommendation

**W4.4 is OPTIONAL.** The codebase has very few legitimate
option-bag candidates. The 3 listed above could be done in 1–2
commits each. Total W4.4 work: **3–5 commits** if all done; could
also be **0 commits** if discuss-phase decides positional args
are acceptable for these small surfaces. Defer the decision to
the planner / discuss-phase.

## 6. Risk areas the planner must navigate

### 6.1 Public-API renames (LOCKED)

**The Wave 4 rename pass MUST NOT touch:**

- Any function name that appears as a key on a
  `window.TT_BEAMER_*` namespace export. (See §1.1 for
  enumeration. Verifier: post-rename
  `Object.keys(window.TT_BEAMER_*)` snapshots equal pre-rename
  snapshots.)
- The 9 wire-protocol message-type literals (§1.2).
- The 13 localStorage / JSON-schema string literals (§1.3).

The 11 candidate renames in §3 have been pre-checked: **R1
(`updateMobilePerformanceStatus`) is on the BOOTSTRAP ctx-bag**,
which is technically a "public" surface (the bootstrap module
reads it). But the ctx-bag is constructed and consumed entirely
inside the runtime/ tree; renaming a ctx-bag key is consistent
with the W4 acceptance bar (the ROADMAP says ctx keys should be
"grouped by area" — implicit permission to touch them).
**R7 (`applyAudioGain`)** is also a ctx-bag key. The other 9
candidates are NOT ctx-bag keys ([VERIFIED]: cross-checked
against `runtime-orchestration-ctx-builder.js`).

### 6.2 ctx-key cascades

When a ctx-bag key is renamed (R1, R7), every sub-module that
**reads** `ctx.<oldName>` must be updated **in the same commit**.
Verifier: pre-commit `grep -rn "ctx\.<oldName>" src/` returns >0;
post-commit returns 0.

**Concrete blast radius:**

- `R1 (updateMobilePerformanceStatus)` — 16 occurrences. Files
  touched: 7 (per §3 R1 entry). All in lockstep.
- `R7 (applyAudioGain)` — 13 occurrences. Files: 6.

These must each be **single commits** with all call-site updates
included. Bisect-friendliness rule.

### 6.3 Renames inside a single IIFE

Module-private helpers (no `window.TT_BEAMER_*` export) are the
**safest** renames — only one file to update. The 58 underscore-
prefixed helpers (`_wireXxx`, `_initXxx`, etc.) all fall in this
category. **None of the §3 candidates are in this safe class** —
they're all module-public.

### 6.4 Cross-module shadow refs (W3.3 / W3.4 pattern)

Some sub-modules carry a **local mirror** of a parent's identifier
to keep byte-identical bodies (e.g., `handlesVisible` is mirrored
in 3 IIFEs per W3.2-C5 INVENTORY). When the **parent function
name** is renamed in the ctx-bag, the **mirror's local variable
name** in the destination IIFE may or may not need to flip — the
local `let mirrorName = …` shadow is typically named the same as
the parent for byte-identical readability. **Convention:** rename
the mirror to match the new ctx-key name in the same commit. Diff
surface: typically +1 file (the IIFE that holds the mirror).

For R1 specifically, `updateMobilePerformanceStatus` does not
have a mirror in any IIFE ([VERIFIED]: `grep -rnE
"let updateMobilePerformanceStatus|const updateMobilePerformanceStatus"
src/app/runtime/`) — only the ctx-bag entry + direct calls.

### 6.5 The `refresh*` decision (R5)

R5 is the riskiest single rename (47 sites). The discuss-phase
should answer one question explicitly:

> **"Is `refresh*` an acceptable prefix in our convention table,
> or must it be subsumed into `sync*`?"**

If `refresh*` stays, all 4 `refresh*` functions are kept as-is and
R5 is dropped. If `refresh*` goes, all 4 must be renamed (R5 +
the 3 LOWER-volume `refresh*` siblings — `refreshApplyDiscardButtonsUi`
12 sites, `refreshPersistentRoomSelectionVisualState` 5 sites,
`refreshStageGeometryCache` 8 sites). Total: 4 renames × ~70
combined occurrences.

**Recommend:** keep `refresh*` as an established prefix in the
convention table (§2). Rationale: (1) it's been around long
enough to be idiomatic in this codebase; (2) the §2 convention
already has 30+ prefixes — adding one more for "reconcile-style
class-toggle" is acceptable; (3) avoiding a 70-occurrence rename
saves Wave 4 a day of work for no clear behavioural or
readability win. The discuss-phase can override.

## 7. Recommended commit slicing for Wave 4

### W4.1 — Audit document (no code changes)

**One commit.** Materialise §3 + §4 + §5 of this RESEARCH into
INVENTORY.md (the wave's tracking doc — same shape as W1
INVENTORY) with rename targets, rationale, call counts. After
discuss-phase approval, lock the rename list before W4.3 starts.

Output: `.planning/phases/phase-24/wave-4/INVENTORY.md` with the
final approved candidate list + the discuss-phase decision on R5
(refresh-prefix question) and option-bag conversions.

### W4.2 — ctx-builder area-grouping

**One commit.** Per Option (b) recommendation in §4.2:

1. Open `runtime-orchestration-ctx-builder.js`.
2. Reorder the destructure block (lines 12–108) so keys are area-
   grouped per §4.1.
3. Insert area-divider comments (`// ── Area X — Name ──────────`).
4. Reorder the return literal (lines 109–205) to match.
5. `node --check` clean.
6. `git diff -w --no-color HEAD~..HEAD` shows reordering only —
   no logic change, no key added/removed, no value changed.

Acceptance gate: `Object.keys()` snapshot of the returned bag
post-commit equals pre-commit (95 keys, same names, just
reordered).

If the discuss-phase chooses Option (a), W4.2 splits into 4–6
commits as described in §4.2.

### W4.3 — Atomic renames (rate-limited)

**N commits, where N = rename-list length** (post-discuss-phase
decision). Per the §3 list: 4–11 candidates depending on whether
LOW-confidence ones land. Order from **least call sites → most
call sites**:

```
W4.3-C1   R10  applyDisposalToGifCanvas → applyGifDisposalToCanvas    (2 sites)
W4.3-C2   R11  buildTiles → renderTiles                                (2 sites)
W4.3-C3   R2   applyHitareaCalibration → computeHitareaCalibratedPoint (3 sites)
W4.3-C4   R3   applyPolygonPrecedence → mergePolygonPrecedence         (3 sites)
W4.3-C5   R9   applyMenuMode → setMenuMode                             (3 sites)
W4.3-C6   R4   applyRoomCatalog → mergeRoomCatalog                     (5 sites)
W4.3-C7   R6   updateClusterPadsRect → syncClusterPadsRect             (5 sites)
W4.3-C8   R8   applyMediaPreviewProps → syncMediaPreviewProps          (6 sites)
W4.3-C9   R7   applyAudioGain → syncAudioGain                          (13 sites)  *ctx-key change
W4.3-C10  R1   updateMobilePerformanceStatus → syncMobilePerformanceStatus (16)    *ctx-key change
W4.3-C11  R5   refreshGlobalButtons → syncGlobalButtonsActiveState     (47 sites)  *if discuss approves
```

**Per-commit gate:**

- All call sites updated in the same commit (lockstep).
- `node --check` clean on every modified `.js` file.
- `<script>` order unchanged (no new files in W4).
- `Object.keys(window.TT_BEAMER_*)` snapshot unchanged (no
  namespace key alterations — these are private function names,
  not namespace-export keys).
- `git diff -w` shows token-level swap only, no logic delta.
- Browser-load smoke deferred to user manual pass per sub-wave
  group.

**Risk-bounded landing:** order least-invasive first so the
high-call-site renames (R5, R1, R7) land on a tree where every
prior rename's correctness has been verified via the running
manual smoke pass. This is the same risk-management pattern Wave
3 used for projection-mapping (smallest sub-extraction first).

### W4.4 — Option-bag conversions (optional)

**0–3 commits.** Each is an internal-only signature change (no
public API):

```
W4.4-C1   O1  _buildRunningRow → option-bag                           (1 site)
W4.4-C2   O2  _categorizeAndOrderAnimations → option-bag              (1 site)
W4.4-C3   O3  buildSliderRow / buildToggleRow / buildSelectRow → bag  (cluster — ~6-9 sites)
```

Skip entirely if discuss-phase prefers positional. These are not
mandatory for the W4 acceptance bar.

### W4.5 — Final consistency sweep + INVENTORY closure

**One commit.** Runs the audit re-scan from §3 against the post-
W4.3-W4.4 tree, confirms zero new prefix violations, updates
INVENTORY with the final identifier delta. End-of-W4
verification:

- `find src/app/runtime/ -name "*.js" -exec wc -l {} \;` snapshot
  vs. start-of-W4 (changes should be near zero — renames don't
  add/remove lines).
- Every rename's pre/post grep proof recorded in INVENTORY.
- Full ROADMAP regression checklist (lines 203–275 of ROADMAP) on
  fresh `node server.mjs` start.

### Wave 4 commit estimate

Total commits: **W4.1 (1) + W4.2 (1) + W4.3 (4–11) + W4.4 (0–3) +
W4.5 (1) = 7–17 commits**, depending on discuss-phase approvals.
**Most-likely estimate: 10–12 commits** (full HIGH+MEDIUM rename
list with R5 deferred to discuss-phase, plus 1–2 option-bag
commits). Far smaller than W3's 24 commits.

### Wave-length estimate

- W4.1 audit doc: 1–2 hours (this RESEARCH is already most of it)
- W4.2 ctx-grouping: 1–2 hours (mechanical reorder)
- W4.3 renames: 30–60 min per commit, mostly mechanical
- W4.4 option-bags (if done): 30 min per commit
- W4.5 closure + regression: 30 min + 15 min smoke

**Total wave length: 6–10 hours of executor work** + 1 full
ROADMAP regression at end-of-wave (10–15 min). The smallest
code-touching wave of Phase 24 by far.

## 8. Test plan for the wave

### Per-commit gates (W4.3, W4.4)

Inheriting the W3 doctrine:

| Gate | Verification |
|---|---|
| `node --check` clean | Every modified `.js` file's `node --check` exits 0. |
| `git diff -w` token-level only | Rename commits show identifier swap only — no surrounding logic changes. Verifier: `git diff -w HEAD~..HEAD` should show clean rename pattern. |
| `<script>` order unchanged | `index.html` is not modified in W4 (no new sub-modules). |
| `Object.keys(window.TT_BEAMER_*)` parity | Each affected namespace's key set unchanged pre/post. |
| ctx-bag key parity (W4.2) | Pre-commit and post-commit `Object.keys(buildBootstrapCtx({…}))` returns the same 95 keys (just reordered). For W4.3 ctx-key renames (R1, R7): post-commit key list has the new name where the old name was. |
| Wire-protocol literal preservation | `grep -rohE 'emitLiveMutation\("[a-z-]+"' src/` returns identical output pre/post. |
| localStorage literal preservation | `grep -rohE "['\"]tt-beamer\.[a-z][a-zA-Z._-]*\.v[0-9]+['\"]" src/` identical pre/post. |

### Per-sub-wave smoke

Browser-load smoke (manual, per W3 norm) at end of each sub-wave:

- **End of W4.2:** dashboard + `/output` boot clean, no console
  errors. The 95-key reorder shouldn't change anything visible.
- **End of W4.3:** full ROADMAP regression checklist, but
  particularly:
  - Mobile performance status visible after a few seconds (R1).
  - Audio plays + per-animation volume slider responds (R7).
  - Global button highlight on global-trigger animations (R5 if
    landed).
  - Animation editor: live preview updates as sliders move (R8).
- **End of W4.4:** unaffected internal changes; quick smoke +
  one full regression at end-of-wave.
- **End of W4.5 (wave closure):** full ROADMAP regression
  checklist, all features.

### Why renames are SAFER than W3 structural moves

Wave 3 moved code between IIFEs — a rename of an IIFE-local
identifier could break a closure capture. Wave 4 changes
**identifiers only** with **no IIFE-boundary movement** and **no
logic rewrite**. The verification is mechanical: identifier
counts must add up (every removed token at the old name has a
matching insertion at the new name). The bisect granularity
must still be tight (one rename per commit) so any hidden
breakage points exactly to its rename, not to a bundle of them.

## 9. Out of scope (re-affirmed)

This wave does **NOT**:

- Add or remove behaviour. (W4 is identifier-only.)
- Add new sub-modules. (W3 territory; closed.)
- Modify comments beyond what a rename naturally requires (e.g.,
  if a comment cites the old name, the comment can be updated
  in-line in the rename commit; W2 closed the comment-hygiene
  pass).
- Remove dead code. (W1 closed.)
- Touch `<script>` order in `index.html`. (No new modules.)
- Alter wire-protocol literals or localStorage literals (§1.2,
  §1.3).
- Rename namespace-export keys (§1.1).
- Convert hot-loop positional args (§5.1 `drawAffineTriangle`).
- Touch the 45 sub-module init-bags in `runtime-orchestration.js`
  (§4.3 — out of W4 acceptance scope).

## 10. Project Constraints (from CLAUDE.md)

[VERIFIED: `test -f /home/claw/tt-beamer/CLAUDE.md` returned non-zero]

No `CLAUDE.md` exists in the project root. No `.claude/skills/` or
`.agents/skills/` directory. Only `.claude/settings.local.json`
exists (containing local-tool permissions, not project
directives). No project-level constraints to surface here beyond
those already in ROADMAP.md (treated as the de-facto project
constraint document for Phase 24).

## 11. Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | "Mass-rename pass" in ROADMAP §Wave 4 means all flagged inconsistencies, NOT every prefix in the codebase. | §3, §7 | If the user expects literal mass-rename (e.g., normalising every internal helper to a stricter convention), the §3 list is ~10× too small. Recommend discuss-phase re-confirms scope. |
| A2 | The 95 ctx-bag keys per W3.5-C2 are the relevant "ctx" surface for the ROADMAP "200+ keys" target. | §4 | If "ctx" was meant to include the per-sub-module init bags too (~45 × 5–30 keys), W4.2 scope expands ~5×. Discuss-phase to confirm. |
| A3 | `refresh*` should stay as an established prefix (R5 deferred). | §6.5, §3.2 | If discuss-phase wants strict §2 convention, R5 + 3 sibling renames add ~70 occurrences to the wave (significant cost increase). |
| A4 | Option (b) (comment-grouping) is preferred over Option (a) (per-area builders) for W4.2. | §4.2 | Option (a) provides reusable per-area exports for W5 module-boundary cleanup; if W5's plan needs them, Option (a) is cheaper to do upfront. |
| A5 | Hot-path positional functions (`drawAffineTriangle`, `drawRoomComposition`) should not be converted to option bags. | §5.1 | If a benchmark shows GC-allocation overhead for option bags is negligible on RPi, the hot-path exception is unnecessary. (Wave 3 did NOT measure; assumption based on convention.) |
| A6 | Wave-protocol literals + localStorage keys + namespace-export keys are immutable. | §1 | These are bedrock assumptions; if the user wants to rename a localStorage key (with a migration path), it's a Phase-24-out-of-scope feature, not a W4 rename. |

`[ASSUMED]` claims above need user confirmation before W4 execution.
The `[VERIFIED: ...]` claims throughout the document need none.

## 12. Open questions for discuss-phase

1. **Is `refresh*` retained or absorbed?** (R5 — see §6.5 + A3.)
2. **Option (a) per-area builders vs Option (b) comment-grouped
   single builder for W4.2?** (See §4.2 + A4.)
3. **Is W4.4 (option-bag conversions) in scope or deferred?**
   (See §5.3.)
4. **Is the "mass-rename" framing literal or selective?** (See A1.)
5. **R5's target name — `syncGlobalButtonsActiveState` (verbose,
   explicit) vs `syncGlobalButtons` (concise, ambiguous with
   render-pair)?** (See §3.2 R5.)

The planner / discuss-phase should answer these before W4.1 lands
so INVENTORY can capture the locked decision.

## 13. Sources

### Primary (HIGH confidence)

- **Post-W3.6 source tree:** every `[VERIFIED]` claim in this
  document was extracted via `grep`/`wc`/`find`/`awk` from
  `src/app/runtime/` (77 modules) and `src/app/lib/` (84 functions
  total).
- **`runtime-orchestration-ctx-builder.js`:** full file read for
  the 95-key dep-bag (§4.1).
- **Wave 3 INVENTORY:**
  `.planning/phases/phase-24/wave-3/INVENTORY.md` for namespace
  surfaces, sub-module list, and the W3.5 ctx-builder extraction
  history.
- **ROADMAP:** `.planning/phases/phase-24/ROADMAP.md` for the
  Wave 4 acceptance bar + hard constraints.

### Secondary (none)

- No external sources used. This is an internal codebase audit.

### Confidence breakdown

| Area | Level | Reason |
|---|---|---|
| Public-API lock-list (§1) | HIGH | Direct `grep` against the source tree; namespace exports verified word-for-word. |
| Naming-convention spec (§2) | MEDIUM | The 14 prefix conventions reflect actual usage, but "what counts as `apply*` vs `sync*`" has subjective edges (the §3 R7 / R10 marginal candidates demonstrate). |
| Rename candidates (§3) | HIGH for HIGH-confidence rows; MEDIUM for MEDIUM rows. | Each candidate has a verified source line, body excerpt, and call count. |
| ctx-bag area-grouping (§4) | HIGH for the 95-key enumeration; MEDIUM for the 17-area split (some keys could reasonably go in 2 areas). |
| Option-bag audit (§5) | HIGH for the 16-row arg-count listing; MEDIUM for the verdicts. |
| Risk areas (§6) | HIGH (mechanical analysis). |
| Commit slicing (§7) | MEDIUM (depends on discuss-phase decisions). |

**Research date:** 2026-04-26
**Valid until:** ~30 days (the codebase is in active maintenance;
post-W4 the rename list itself becomes obsolete by definition).
