# Phase 24 — Code-quality refactor (CLOSURE)

## Status

**CLOSED.** Six waves delivered. No behaviour changes — every
README-documented feature works identically pre- and post-Phase-24.
Public-API contracts (100 namespaces + 7 wire-protocol literals + 13
storage literals = 120 immutable items) preserved verbatim through
every wave.

The codebase is now leaner and more navigable: dead code and
debug-only flags are gone; comment hygiene is enforced (zero
phase-marker comments outside the carve-out); the four oversized
modules from Phase 23 have been decomposed into responsibility-scoped
sub-modules; naming conventions are consistent; and the namespace
graph has zero non-trivial cycles.

## Wave delivery

### Wave 1 — Dead code + debug-log cleanup ✅
- Removed `__TT_CLUSTER_DEBUG__` flag + 9 cluster-pad `console.info`
  log sites (C1).
- Removed `runtime-wire-calibration-binders.js` no-op module + its
  `<script>` tag + orchestration call (C2).
- Removed dead exports — `readJson`, `writeJson`, `CORNER_KEYS`,
  `beginGridWarpFrame`, `endGridWarpFrame`, `isPolygonDragActive`,
  `buildPlaybackCard` (C3).
- Removed dead `quickModeActivateButton` / `quickModeDeactivateButton`
  bindings across 4 files (C4).
- Removed zero-byte stale `resources/animations/output.mp4` (C6).
- **6 commits** + 1 deferred (C5: 110 dead DOM-id refs deferred to
  Wave 3 as paired ref-and-consumer cleanup — see Decisions below).
- INVENTORY: `.planning/phases/phase-24/wave-1/INVENTORY.md`.

### Wave 2 — Comment hygiene ✅
- **507 phase-marker comments eliminated** (434 JS + 73 CSS) — every
  `// Phase X W Y v Z:` prefix stripped or block deleted.
- **Comment density dropped 7.64% → 6.93%** (-0.71 pp; 2342 → 2109
  comment lines on a 30k-line tree).
- 10 multi-paragraph rewrites in load-bearing comment bodies (5
  orchestration + 5 cross-file kernels) — kept the WHY, dropped the
  historical narrative.
- 73 CSS prefix strips landed in 1 commit (C6).
- A late "sweep" commit (`3946967`) neutralized 13 mid-sentence body
  citations that survived prefix-only stripping, hitting the strict
  zero-marker target.
- 13 load-bearing init-order kernels inventoried under
  `Kept (load-bearing WHY)` — these became the kernel-preservation
  contract for Wave 3.
- **12 commits.**
- INVENTORY: `.planning/phases/phase-24/wave-2/INVENTORY.md`.

### Wave 3 — File / function decomposition ✅

The largest wave. 6 sub-waves. Targets: oversized modules from the
Phase 23 baseline (orchestration 3258 → 2965 sanctioned shell;
projection-mapping 1945 → 277 shim + 5 sub-modules; animation-editor-
view 1698 → 105 shim + 4 sub-modules; animation-lifecycle 1421 → 5
sub-modules) plus a W3.6 sweep of secondary >800-line files
(fx-panels 985, wire-room-audio-binders 924, wire-fx-panel-binders
923, polygon-editor 846, draw-loop 836).

**W3.1 — Utility consolidation.** Introduced
`src/app/runtime/runtime-utils.js` with `clamp(min, max, v)`,
`clamp01(v)`, `bboxOfPolygon(points)`. Hoisted to the first
runtime-tier `<script>` tag (line 805) for parse-time availability.
11 call sites consolidated across 10 files. **7 commits.**

**W3.2 — Projection-mapping decomposition.** 1945-line module split
into 5 sub-modules — `runtime-projection-grid-state.js`,
`runtime-projection-gl-renderer.js`,
`runtime-projection-2d-fallback-renderer.js`,
`runtime-projection-handle-ui.js`,
`runtime-projection-profile-persistence.js` — under a 277-line
re-export shell. 60/60 functions byte-identical body diff. The 2
load-bearing kernel comments (WebGL fallback rationale, RPi/Chromium
lean GL options) traveled with `_initMeshWarpGL` into the gl-renderer
module. **6 commits.**

**W3.3 — Animation-editor decomposition.** 1698-line module split
into 4 sub-modules — `animation-editor-shell.js`,
`animation-editor-library-list.js`,
`animation-editor-edit-pane.js`,
`animation-editor-live-preview.js` — under a 105-line re-export
shell. 37/37 named functions byte-identical body diff. Legacy 7-key
namespace `TT_BEAMER_ANIMATION_EDITOR_VIEW` (no `RUNTIME_` segment)
preserved verbatim. **4 commits.**

**W3.4 — Animation-lifecycle decomposition.** 1421-line module split
into 5 sub-modules under the lifecycle shell —
`runtime-lifecycle-state.js`,
`runtime-lifecycle-stop-pipeline.js`,
`runtime-lifecycle-live-editor.js`,
`runtime-lifecycle-running-list.js`,
`runtime-lifecycle-cluster-pads.js` (the rAF rail tracker).
`openLiveEditor` (180 lines → 13 + 4 helpers) and
`renderRunningAnimationsList` (369 → 48 + 4 per-row helpers)
decomposed into named helpers. **6 commits.**

**W3.5 — Orchestration safer-path carve-out.** Per the ROADMAP
exception clause, orchestration is allowed to remain a re-export
shell. Extracted 3 helpers (`shouldSuppressRapidTap`,
`createConditionalFieldMountSlot`, `setConditionalFieldMounted`) to
`runtime-orchestration-helpers.js` and the 95-key BOOTSTRAP dep-bag
to `runtime-orchestration-ctx-builder.js`. All 13 load-bearing
init-order kernels stayed in the orchestration shim with verbatim
text. Final shell size: 2965 lines (the safer-path approach hit its
structural ceiling per the W3.5-C2 calibration analysis). **2 code
commits + 2 hygiene fixes** (see "Pre-existing bugs" below).

**W3.6 — Secondary-file sweep.** Closed every >800-line file under
the Option B "smallest viable extraction" principle:
- `runtime-projection-handle-ui.js` 1182 → 781 (extracted
  `runtime-projection-handle-drag.js`).
- `animation-editor-edit-pane.js` 1006 → 722 (extracted
  `animation-editor-edit-pane-asset-picker.js`).
- `runtime-fx-panels.js` 985 → 62 shim + 414 room + 672 inside-
  outside.
- `runtime-wire-room-audio-binders.js` 924 → 619 (extracted
  bundle IIFE).
- `runtime-wire-fx-panel-binders.js` 923 → 673 (extracted outside
  cluster).
- `runtime-polygon-editor.js` 846 → 554 (extracted handle render fns).
- `runtime-draw-loop.js` 836 → 716 (extracted
  `drawClusterPadCanvases`).
- In-place decompositions: `wireOverlayWindowBinders` (525 → 14
  dispatch + 14 helpers), `wirePolygonEditorBinders` (447 → 21
  dispatch + 21 helpers), `initializeApplication` (188 → 8 dispatch
  + 7 phase helpers).

5 functions ≥150 lines remained as accepted deviations (see Notable
decisions below).

**Wave 3 totals: 41 refactor commits + 6 docs commits + 2 hygiene
fixes = ~46 commits across 6 sub-waves.** End-of-wave acceptance:
only the orchestration shell exceeds 800 lines (sanctioned per
ROADMAP exception). All 4 primary targets and 5 secondary targets
brought under the bar.
INVENTORY: `.planning/phases/phase-24/wave-3/INVENTORY.md`.

### Wave 4 — Naming + API consistency ✅
- **`runtime-orchestration-ctx-builder.js` reorganised** with 17
  area-divider banners (`// ─── Area X ───`) on both the destructure
  block and the return literal (W4.1, 1 commit).
- **10 renames** (W4.2, 10 commits) aligning the codebase to the
  prefix convention (`syncFooFromBar` family vs `applyFoo` vs
  `renderFoo` etc.):

  | Old | New | Pin verdict |
  |-----|-----|-------------|
  | `applyDisposalToGifCanvas` | `applyGifDisposalToCanvas` | SAFE-SED |
  | `buildTiles` | `renderTiles` | SAFE-SED |
  | `applyHitareaCalibration` | `computeHitareaCalibratedPoint` | PIN |
  | `applyPolygonPrecedence` | `mergePolygonPrecedence` | PIN |
  | `applyMenuMode` | `setMenuMode` | SAFE-SED |
  | `applyRoomCatalog` | `mergeRoomCatalog` | PIN |
  | `updateClusterPadsRect` | `syncClusterPadsRect` | PIN |
  | `applyMediaPreviewProps` | `syncMediaPreviewProps` | PIN |
  | `applyAudioGain` | `syncAudioGain` | PIN |
  | `updateMobilePerformanceStatus` | `syncMobilePerformanceStatus` | PIN |
- **7 of 10 renames required namespace pinning** (vs PLAN's expected
  1) — see Notable decisions below.
- All 100 namespace keys + 7 wire-protocol literals + 13 storage
  literals byte-identical pre/post W4.
- **12 commits.**
- INVENTORY: `.planning/phases/phase-24/wave-4/INVENTORY.md`.

### Wave 5 — Module-boundary cleanup ✅
- **20 module headers added** (W5.2, 1 commit) — every `.js` file in
  `src/app/runtime/` + `src/app/lib/` now carries a substantive
  file-level header (101/101).
- **Single SCC resolved** (W5.3-C1) — the bootstrap ↔ panels-controller
  cycle. The defensive write block in `runtime-bootstrap.js` was
  unreachable under the documented `<script>` load order
  (panels-controller at index.html:835 before bootstrap at :907,
  both `defer`); deletion eliminated the back-edge. Tarjan over the
  namespace-graph: 1 non-trivial SCC → 0.
- **`TT_BEAMER_UI_RUNTIME_PANELS` removed** (W5.3-C2) — zero external
  readers per the Wave 5 audit. Namespace count 101 → 100.
- **8 W3 shim re-exports audited** (W5.5) — 7 confirmed load-bearing
  (each has at least one external reader; in every case
  `runtime-orchestration.js` destructures from the parent
  namespace), 1 removed (`UI_RUNTIME_PANELS`).
- `<script>` order verified unchanged across the wave (W5.6).
- **8 commits** (3 code + 5 docs/INVENTORY).
- INVENTORY: `.planning/phases/phase-24/wave-5/INVENTORY.md`.

### Wave 6 — Closure ✅
- `docs/ARCHITECTURE.md` written — post-refactor module map for
  external readers.
- This SUMMARY.md.
- Final tag `phase-24-end` set on HEAD.
- **2 commits.**

## Aggregate metrics

| Metric | Pre-Phase-24 | Post-Phase-24 | Delta |
|--------|------------:|-------------:|------:|
| Total commits in Phase 24 | — | 90 | — |
| `.js` modules in `src/app/runtime/` + `src/app/lib/` | 77 | 101 | +24 (sub-modules from W3 splits) |
| Total `.js` lines in `src/app/runtime/` + `src/app/lib/` | 39 313 | 32 928 | -6 385 |
| `src/` net line delta (`git diff --shortstat phase-24-w1-start..HEAD -- src/`) | — | +2 084 (10 043 ins / 7 959 del across 107 files) | — |
| Largest file | `runtime-orchestration.js` (3 258) | `runtime-orchestration.js` (2 965, sanctioned shell) | -293 |
| Files >800 lines | 9 (orchestration 3258, projection 1945, editor 1698, lifecycle 1421, fx-panels 985, audio-binders 924, fx-binders 923, polygon-editor 846, draw-loop 836) | 1 (orchestration shell, sanctioned per ROADMAP) | reduced to the single sanctioned exception |
| Public `window.TT_BEAMER_*` namespaces | 101 | 100 | -1 (intentional: `UI_RUNTIME_PANELS`) |
| Wire-protocol literals | 7 | 7 | 0 |
| localStorage / JSON-schema literals | 13 | 13 | 0 |
| Total immutable contracts | 120 (101 + 7 + 13 with the now-removed alias) | 120 (100 + 7 + 13) | 0 (preserved net of one intentional alias removal) |
| Init-order kernels in orchestration | 13 | 13 | 0 (verbatim text) |
| `__TT_*_DEBUG__` flags in `src/` | 1 | 0 | -1 |
| `console.info(` outside logger.js | 9 | 0 | -9 |
| Non-trivial SCCs in namespace graph | 1 | 0 | -1 |
| Modules with substantive header | 81/101 | 101/101 | +20 |
| Phase-marker comments (JS + CSS) | 507 | 0 | -507 |
| Comment density (JS) | 7.64% | 6.93% | -0.71 pp |

The +2 084-line `src/` net delta is the cumulative result of additive
work (95-key ctx-builder destructure block, 7 W3 sub-module IIFE
wrappers, area-divider banners, 20 module headers) net of the
subtractive work (~6 385 lines of duplicate code consolidation, dead
code removal, oversized modules collapsed into thin shells). The
Wave 5 INVENTORY documents the per-wave delta.

## Pre-existing bugs surfaced and fixed during Phase 24

Two latent bugs in the Phase 23 codebase were surfaced during W3.5
acceptance verification and fixed as W3.5 hygiene commits. Both were
pre-existing — not Phase 24 regressions — and both are documented in
the Wave 3 INVENTORY:

- **`SETTINGS_EXCLUSIVE_CONTROL_IDS` had dead control IDs**
  (`1e35b2f`) — IDs that no longer existed in `index.html` but were
  still being suppressed in the missing-control log. Cosmetic but
  noise.
- **`polygon-editor-panels` null-guard missing** (`6f34488`) —
  `ctx.getBoard()` could return null in a transient state and the
  panel sync wasn't guarded.

Counted as 2 hygiene fixes in the Wave 3 commit total.

## Notable decisions / deviations

- **Wave 1 C5 deferred** (110 dead DOM-id candidates). Per the
  decision rule, "if a dead DOM id has any live JS consumer, KEEP
  the ref." Every one of the 110 candidates failed Step 2: missing
  HTML id, but the camelCase ref name had live JS consumers. Removing
  the dom-refs entry without also pruning consumers would leave dead
  `?.`-chained calls scattered. Deferred to Wave 3 as paired
  ref-and-consumer cleanup; partially addressed during W3.6's
  in-place decompositions of the affected wire-binders.

- **Wave 3 W3.5 safer-path approach.** ROADMAP §"Wave 3 Acceptance"
  exception clause allows the orchestration wire-up to be a
  re-export shell. Extracted only the ctx-builder + 3 top-level
  functions; final shell residual is 2965 lines. Calibration miss
  in PLAN math (projected ~2870; ceiling at 2991/2965) documented in
  Wave 3 INVENTORY's W3.5-C2 deviation.

- **Wave 3 deferred decompositions (5 functions ≥150 lines).** All
  documented as accepted deviations in W3.6:
  - `wireStageGestureBinders` (397 lines) — touch state machine has
    tight closure coupling around the `touchGesture` object;
    decomposition would require state-bag rewriting.
  - `startRoomAnimationFromDraft` (637 lines) — dense per-step state
    mutation across phases; decomposition would change call shapes.
  - `decodeGifPlaybackFramesWithParser` (176 lines) — tight
    intra-iteration state mutation in a while-loop dispatch.
  - `collectDomRefs` (298 lines) — pure flat `querySelector`
    dictionary; no behaviour risk; decomposition is mechanical
    boilerplate without functional benefit.
  - `_wireOverlayPointerMove` (165 lines) — multi-branch dispatch
    callback; sub-splitting would add closure indirection without
    behaviour benefit.
  - The two polygon-editor render-handle fns were also kept at
    159 / 171 lines as a W3.6-C9 carry-over.

- **Wave 4 namespace-pinning expanded from 1 to 7.** PLAN §3 expected
  only 1 confirmed PIN; reality was 7 of 10 renames required it. The
  PIN pattern `oldKey: newFn,` retains the public namespace key while
  the implementation switches to the new name — preserving the
  100-namespace lock-list while the codebase migrates. Mechanical
  adjustment; no semantic deviation.

- **Wave 5 single SCC resolved.** Per RESEARCH §1.5 Tarjan over the
  namespace-graph (`madge` cannot run since the codebase has zero ES
  module imports), the only non-trivial SCC was bootstrap ↔
  panels-controller. Resolved by deleting the unreachable defensive
  write block.

## Pre-existing console-error issues remaining (cosmetic)

- **`view-exclusivity-violation`** at runtime — observed by the user
  during W4 testing. Pre-existing per the W4 debugger investigation
  (the message body and stack pre-date Phase 24). Cosmetic only;
  the view-switch behaviour is correct. Deferred to a future hygiene
  wave when next reproduced with browser DevTools open.

## Follow-ups (not phase-blocking)

- **The 5 ≥150-line functions noted as accepted deviations** could
  be revisited in a future cleanup if their size becomes a
  navigation hazard during feature work.
- **`view-exclusivity-violation` root cause** — investigate when next
  reproduced with browser DevTools.
- **Per-area ctx builders** (Option (a) declined in W4) — could be
  reconsidered if `runtime-orchestration-ctx-builder.js` grows
  significantly past its current 95 keys / 17 areas.
- **`scripts/dev/extract-module-graph.cjs`** — the Wave 5 RESEARCH
  §1.5 Node-based module-graph extraction script was deferred to a
  future wave; would replace the manual grep-based methodology.

## Final commits (wave closure hashes)

```
e3d1249 docs(24-5): INVENTORY end-of-W5 — 8 commits + W5 closure verification        # W5 closure
6cfc682 docs(24-4): INVENTORY end-of-W4 — 12 commits + W4 closure verification       # W4 closure
23af592 docs(24-3): INVENTORY end-of-W3.6 — 7 commits + 4 deviations recorded        # W3 closure
4643ec7 docs(24-2): wave-2 PLAN, RESEARCH, INVENTORY + wave-1 PLAN/RESEARCH           # W2 closure
727a169 chore(24-1): remove zero-byte resources/animations/output.mp4                # W1 closure
```

## Tags

| Tag | Hash | Marker |
|-----|------|--------|
| `phase-24-w1-start` | `450902d` | Pre-W1 (ROADMAP landed; W1 dead-code work begins) |
| `phase-24-w2-start` | `890bc16` | Pre-W2 (W1 closed; W2 comment hygiene begins) |
| `phase-24-w3-start` | `4643ec7` | Pre-W3 (W2 closed; W3 file decomposition begins) |
| `phase-24-w3-5-start` | `4f43e78` | Pre-W3.5 (W3.4 lifecycle split closed; W3.5 orchestration carve-out begins) |
| `phase-24-w3-6-start` | `6f34488` | Pre-W3.6 (W3.5 closed + 2 hygiene fixes; W3.6 secondary-file sweep begins) |
| `phase-24-w4-start` | `23af592` | Pre-W4 (W3 closed; W4 naming + API consistency begins) |
| `phase-24-w5-start` | `6cfc682` | Pre-W5 (W4 closed; W5 module-boundary cleanup begins) |
| `phase-24-end` | (HEAD) | Phase 24 closed — code-quality refactor (waves 1-6) complete |

Tags are rollback targets for selective revert if a regression is
discovered downstream.
