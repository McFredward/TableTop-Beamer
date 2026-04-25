# Phase 24 Wave 1 — Research

**Researched:** 2026-04-25
**Domain:** TableTop Beamer (vanilla JS browser app + Node.js server)
**Confidence:** HIGH for grep-verified inventories; MEDIUM for "dead but uncertain" candidates that touch the live-sync protocol or persisted-bundle schema.

## Summary

Wave 1's acceptance bar is a tight grep contract — zero `console.info(` in `src/`, zero `window.__TT_*_DEBUG__` references, no stale `// removed in Phase X` placeholders. The codebase is well within reach: there are exactly **10 `console.info(` call sites** (9 of them in `runtime-animation-lifecycle.js` and 1 inside `logger.js`), exactly **1 `window.__TT_*_DEBUG__` reference** (`__TT_CLUSTER_DEBUG__` at `runtime-animation-lifecycle.js:1201`), zero `console.log`, and one `console.debug` (also inside `logger.js`).

Beyond logs, the audit surfaced a meaningful but not enormous dead-code surface: 6 confirmed unused exports across 3 modules, 1 fully no-op module (`runtime-wire-calibration-binders.js`) preserved with an apologetic header comment from Phase 15-2, 1 fully unused internal function (`buildPlaybackCard` in `animation-editor-view.js`), 2 dead DOM-id wirings (the legacy `quick-mode-activate`/`-deactivate` buttons), and 112 DOM refs in `runtime-dom-refs.js` whose `#id` no longer exists in `index.html` (these include `#room-breaks-solid-color`, `#inside-animation-select`, `#hitarea-*`, `#room-geometry-*`, etc. — controls that were absorbed into the Phase 22 W3b animation editor or removed in Phase 15-2). The 112-ref DOM cleanup is best deferred to a careful sub-pass within Wave 1 because each ID needs cross-checking against the regression test list at `runtime-orchestration.js:178-247`.

**Primary recommendation:** Land Wave 1 in 6 commits. C1 removes the single `__TT_CLUSTER_DEBUG__` block and its 9 cluster-pad info logs. C2 removes the no-op `runtime-wire-calibration-binders.js` module + its orchestration call site. C3 removes 6 confirmed dead exports (`readJson`, `writeJson`, `beginGridWarpFrame`, `endGridWarpFrame`, `CORNER_KEYS`, `isPolygonDragActive`) and 1 dead internal function (`buildPlaybackCard`). C4 removes the dead `quick-mode-activate`/`-deactivate` DOM refs + bindings. C5 (optional, scoped to dashboard-side dead controls) removes the dead DOM refs whose `#id` is provably absent from `index.html` AND not dynamically created — the planner should triage this list before committing. C6 removes orphan asset `resources/animations/output.mp4` (0 bytes). The 58 MB `malfunction2.mp4` is kept pending user decision — it is referenced only in the pre-migration backup and looks orphan but is too large to delete without explicit sign-off.

## Codebase orientation for Wave 1

### Layout

```
src/
├── app.js                                  # 22-line bootstrap shell
├── live/
│   └── hf9-command-pipeline.mjs            # Server-side import (loaded by server.mjs, not by HTML)
├── styles/, styles.css                     # CSS (touched by Wave 2 comment hygiene, not Wave 1)
└── app/
    ├── lib/                                # Foundational primitives (config, logger, state factories, domain helpers)
    │   ├── api/                            # global-defaults-api.js (window.TT_BEAMER_API)
    │   ├── boot/                           # runtime-bootstrap.js + app-composition.js (window.TT_BEAMER_BOOT, _BOOT_COMPOSITION)
    │   ├── domain/                         # rooms.js, event-lifecycle.js, live-sync-domain.js
    │   ├── input/, persistence/, render/, ui/  # Cross-cutting helpers
    │   ├── shared/                         # config.js, logger.js, normalizers.js, runtime-env.js
    │   └── state/                          # runtime-state.js, live-sync-state.js (state factories)
    └── runtime/
        ├── runtime-orchestration.js        # 3258-line wire-up file — destructures from every TT_BEAMER_RUNTIME_* global and threads ctx to module init() calls
        ├── core/                           # bootstrap, dom-refs, polygon-metrics, board-switch, animation-factory, polygon-contract
        ├── animation/                      # lifecycle, dispatch, draft, room-management, runtime-controls, quick-mode
        ├── live-sync/                      # core, helpers, config-sync, zone-loader, global-defaults
        ├── panels/                         # fx-panels, regression-tests, clamp-sync-panels
        ├── polygon-editor/                 # editor, panels, context-menu, undo, rotation
        ├── render/                         # draw-loop, effect-visuals, gif-decoder/playback, outside-mp4, perf, audio, canvas-clip
        ├── state/                          # board-profiles, board-state-accessors, fx-normalizers, polygon-normalizers, etc.
        ├── ui/                             # icons, icon-picker, animation-editor-view
        ├── viewport/                       # projection-mapping, stage-viewport, viewport-zoom, mobile-layout, etc.
        └── wire/                           # 7 wire-* binder modules (one of which is fully no-op — see C2 below)
```

All 78 `.js` files in `src/` are loaded as `<script defer>` tags by `index.html` (lines 804–883). I confirmed by diffing the loaded list against `find src -name '*.js'` — every file is loaded; there are no orphan modules.

### IIFE-with-ctx pattern

Each runtime module is wrapped as `(() => { ... window.TT_BEAMER_RUNTIME_<NAME> = { init, ... }; })();`. `runtime-orchestration.js` then does one of three things with each module:

1. **Destructure utilities** (synchronous helpers exported on the global):
   `const { normalizePolygonPoint, ... } = window.TT_BEAMER_RUNTIME_POLYGON_NORMALIZERS;`
2. **Call a wire/init function once at boot:**
   `window.TT_BEAMER_RUNTIME_WIRE_CALIBRATION_BINDERS.wireCalibrationBinders({ ... });`
3. **Init with a long ctx object that the module retains in module scope:**
   `window.TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE.init({ state, ...domRefs, helperFn1, helperFn2, ... });`
   — modules then call `ctx.helperFn1(...)` to reach back into orchestration-scope helpers.

**Implication for "is X used":** an exported function `foo` from module M can be reached two ways:
- `window.TT_BEAMER_RUNTIME_M.foo()` (rare — usually only `init()` is called this way)
- via the orchestration-built `ctx`: another module's code calls `ctx.foo(...)` after orchestration threaded `foo` into the second module's init.

So when an export looks unused, you must search BOTH:
- `\bfoo\b` across `src/` (catches `ctx.foo` / `{ foo }` destructure / direct calls)
- and confirm it's not a name that appears purely as a string key

Throughout this research I used `grep -rn "\bNAME\b" /src` and required at least 3 references (declaration in module; destructure or ctx-thread in orchestration; one or more callsites) before treating a symbol as "used."

### Where logs and debug flags sit in the architecture

There are TWO logging surfaces in this codebase, and they must be distinguished before Wave 1 starts:

1. **Structured logger** (`src/app/lib/shared/logger.js` → `window.TT_BEAMER_LOGGER`):
   gated `info`/`warn`/`error`/`debug` events with JSON payloads. Keyed by `__TT_BEAMER_LOG_LEVEL__` or the `?logLevel=` URL param (default `warn`). USED BY orchestration, bootstrap, regression tests, view-visibility, mobile-layout, etc. via `ctx.logBootstrap.info(...)` / `ctx.logUi.error(...)` / `ctx.logRender.warn(...)` etc.
   - **This logger internally calls `console.info`, `console.warn`, `console.error`, `console.debug`** (lines 34, 38, 42, 45 of `logger.js`). It is **the ONLY remaining `console.info(` call site after Wave 1**. The acceptance criterion "Zero `console.info(` calls in `src/`" must therefore either:
     (a) carve out `logger.js` as the sanctioned routing layer (recommended — it's the production-supported "one chokepoint" pattern), or
     (b) replace the internal `console.info` with `console.log` or `console.debug` (less honest — `info` is exactly the right severity).
     **The planner should resolve this with the user before C1 lands.** RECOMMENDATION: amend acceptance to "Zero `console.info(` outside `src/app/lib/shared/logger.js`."

2. **Ad-hoc `console.info("[cluster-pad] ...")` calls** in `runtime-animation-lifecycle.js`. These are bare debug statements that bypass the structured logger and were added during Phase 23 cluster-pad debugging. ALL of these are Wave 1 removal targets.

The `__TT_BEAMER_*` `window` globals are subdivided too:
- **Production config / overrides (KEEP):** `__TT_BEAMER_API_BASE__` (4 refs), `__TT_BEAMER_BOOTSTRAP_CONFIG__` (3 refs), `__TT_BEAMER_LOG_LEVEL__` (1 ref). Documented in `global-defaults-api.js` as override mechanism.
- **Debug-only flag (REMOVE):** `__TT_CLUSTER_DEBUG__` (1 ref, `runtime-animation-lifecycle.js:1201`).
- **Debug snapshot bag (REMOVE candidate):** `window.TT_BEAMER_LIVE_SYNC_DEBUG = { getLiveTraceSnapshot }` at `runtime-bootstrap.js:230`. Never read by any other `src/` code; only useful from a DevTools console. The acceptance criterion targets `__TT_*_DEBUG__` (the underscore-flag pattern), not `TT_BEAMER_LIVE_SYNC_DEBUG`. The planner should decide whether to keep this DevTools entry-point or include it in Wave 1.

## Concrete inventory — debug-only code to remove

### A. `window.__TT_*_DEBUG__` flags

Acceptance: **zero references in `src/` after Wave 1.**

| File:Line | Text | Judgement |
|-----------|------|-----------|
| `src/app/runtime/animation/runtime-animation-lifecycle.js:1201` | `if (window.__TT_CLUSTER_DEBUG__) { console.info("[cluster-pads] board=", state.boardId, ...); }` | **REMOVE** — entire `if` block + its 6-line `console.info`. |

There is exactly one `__TT_*_DEBUG__` flag in the codebase. The ROADMAP also mentions `__TT_GL_DEBUG__`, but that flag does not exist in `src/` (only as a historical reference in `.planning/phases/phase-23/SUMMARY.md`).

**Adjacent target — DevTools snapshot:**

| File:Line | Text | Judgement |
|-----------|------|-----------|
| `src/app/runtime/core/runtime-bootstrap.js:230-232` | `window.TT_BEAMER_LIVE_SYNC_DEBUG = { getLiveTraceSnapshot: ctx.getLiveTraceSnapshot };` | **UNCERTAIN** — pattern doesn't match `__TT_*_DEBUG__` so strictly outside acceptance, but it's a debug-only DevTools hook that no `src/` code reads. Planner decision. |

### B. `console.info(` calls

Acceptance: **zero `console.info(` calls in `src/` (except possibly the structured-logger chokepoint).**

| File:Line | Text | Judgement |
|-----------|------|-----------|
| `src/app/runtime/animation/runtime-animation-lifecycle.js:1202` | `console.info("[cluster-pads] board=", state.boardId, "clusters=", clusters.length, "names=", ...)` | **REMOVE** — entire `if (window.__TT_CLUSTER_DEBUG__) { ... }` block (lines 1201–1208). |
| `src/app/runtime/animation/runtime-animation-lifecycle.js:1251` | `console.info("[cluster-pad] click", { clusterId, mode, armedAnimation });` | **REMOVE** — debug-only entry log inside pad click handler. |
| `src/app/runtime/animation/runtime-animation-lifecycle.js:1302` | `console.info("[cluster-pad] tap-action route", { clusterId, mode, armedId });` | **REMOVE** — debug-only routing trace. |
| `src/app/runtime/animation/runtime-animation-lifecycle.js:1331` | `console.info("[cluster-pad] toggle entry", { clusterId, armedType, ... });` | **REMOVE** — debug-only path trace. |
| `src/app/runtime/animation/runtime-animation-lifecycle.js:1339` | `console.info("[cluster-pad] -> STOP same-type path", { count: ... });` | **REMOVE** — debug-only branch trace. |
| `src/app/runtime/animation/runtime-animation-lifecycle.js:1347` | `console.info("[cluster-pad] -> START path (no same-type cluster running, dispatching)");` | **REMOVE** — debug-only branch trace. |
| `src/app/runtime/animation/runtime-animation-lifecycle.js:1360` | `console.info("[cluster-pad] startRoomAnimationFromDraft returned (sync)");` | **REMOVE** — debug-only success log. Note the surrounding `try { ... } catch` should keep the `console.error` at line 1362. |
| `src/app/runtime/animation/runtime-animation-lifecycle.js:1377` | `console.info("[cluster-pad] dispatch toggle result", { ..., clusterEntriesBefore: beforeClusterCount, ... });` | **REMOVE** — debug-only result trace. **Also fixes a latent bug:** `beforeClusterCount` (line 1382) is referenced but never defined in scope; it is only "harmless" because the surrounding `console.info` is itself slated for deletion. Removing the log removes the bug. |
| `src/app/runtime/animation/runtime-animation-lifecycle.js:1397` | `console.info("[cluster-pad] CLEAR all", { matches: matches.length });` | **REMOVE** — debug-only CLEAR trace. |
| `src/app/lib/shared/logger.js:42` | `console.info(message);` | **KEEP (with carve-out)** — this is the structured logger's routing chokepoint for `.info()` events. Acceptance criterion needs amendment to allow this single line, OR the line gets switched to `console.log(message)` (not recommended — semantics drift). |

**Total:** 10 `console.info(` call sites; 9 are debug-only and removable; 1 (logger.js:42) is the production routing chokepoint.

### C. `console.log(` calls

| File:Line | Text |
|-----------|------|
| (none) | — |

Zero `console.log(` calls in `src/`. Acceptance trivially met.

### D. `console.debug(` calls

| File:Line | Text | Judgement |
|-----------|------|-----------|
| `src/app/lib/shared/logger.js:45` | `console.debug(message);` | **KEEP** — same logger chokepoint, `.debug()` event routing. |

### E. `console.warn(` and `console.error(` — confirmation list (KEEP all)

These are NOT removal targets — listed here so the planner can verify "genuine error path" in each case if there's any doubt:

| File:Line | Text | Why kept |
|-----------|------|----------|
| `src/app/runtime/wire/runtime-wire-stage-gesture-binders.js:268` | `console.warn("[touch-gesture] commit drag failed:", error?.message || error);` | Genuine error path — drag-finalize failed. |
| `src/app/runtime/live-sync/runtime-config-sync.js:175,198,219` | 3 × `console.warn("[global-config] ...")` | Genuine error paths — apply/save/discard failures. |
| `src/app/runtime/live-sync/runtime-live-sync-core.js:510` | `console.warn(...)` | Genuine error path. |
| `src/app/runtime/render/runtime-draw-loop.js:659` | `console.warn("[cluster-pad] drawRoomComposition error", error);` | Genuine error path inside per-frame try/catch. |
| `src/app/runtime/animation/runtime-animation-lifecycle.js:1181` | `console.warn("[cluster-pads] container element missing from DOM");` | Genuine "DOM out of sync" warning. The `[cluster-pads]` tag matches the debug pattern but the call is `console.warn`, not `info`, and its content is a real error. |
| `src/app/runtime/animation/runtime-animation-lifecycle.js:1365` | `console.warn("[cluster-pad] ctx.startRoomAnimationFromDraft is not a function");` | Genuine error path — missing dependency. |
| `src/app/lib/shared/logger.js:34, 38` | `console.error(message); / console.warn(message);` | Logger chokepoints. |
| `src/app/runtime/viewport/runtime-projection-mapping.js:231,252,271,299` | 4 × `console.error("mesh-warp ...:", ...)` | Genuine GL init / shader errors. |
| `src/app/runtime/ui/animation-editor-view.js:796,827,967,998,1266,1716` | 6 × `console.error("...", error)` | Genuine upload/delete/preview/handler errors. |
| `src/app/runtime/animation/runtime-animation-lifecycle.js:1362` | `console.error("[cluster-pad] startRoomAnimationFromDraft THREW:", error);` | Genuine throw path inside a try/catch. **KEEP** even though the surrounding info logs go away. |

### F. Placeholder comments

The narrow Wave 1 target ("`// removed in Phase X` / `// Wave N: ...` markers that no longer point at active decisions") finds:

| File:Line | Comment | Judgement |
|-----------|---------|-----------|
| `src/app/runtime/wire/runtime-wire-calibration-binders.js:1-14, 17` | `// Phase 15-2: hitarea calibration + room geometry panels removed.` (file-level docstring) and `// intentionally empty — panels removed in Phase 15-2` (function body) | **REMOVE THE WHOLE MODULE** in C2 (see Dead Code §A). The comment exists to justify the empty no-op shell. |
| `src/app/runtime/viewport/runtime-projection-mapping.js:1945-1948` | `// Legacy compat — grid warp is now post-draw, no begin/end needed. // These are kept so nothing crashes if called.` | **REMOVE** with the dead exports `beginGridWarpFrame` / `endGridWarpFrame` in C3 (see Dead Code §B). |
| `src/styles/design-system/foundations.css:85` | `* Obsidian — light (stub for Wave 5; same grammar, warm gray)` | **DEFER** — points at a future Wave 5; that's still active forward-looking. Leave for Wave 2 comment hygiene to revisit. |
| `src/app/runtime/ui/icons.js:163-170` | `// Phase 22 W2c: heuristic icon resolver used until Wave 3 ships per-animation user-assigned icons via the animation editor.` (Wave 3 has shipped) | **DEFER to Wave 2** — this is comment archaeology rather than dead-code marker. Wave 2's "comment hygiene" deliverable is the right scope. |

The vast majority (447 phase-marker lines across 63 JS files; 84 in CSS) are **Wave 2 territory** per the ROADMAP — Wave 1 only takes placeholders that point at non-existent code. Don't conflate them.

## Concrete inventory — likely-dead code

### A. Dead module (entire file is a no-op shell)

| File | Status | Evidence |
|------|--------|----------|
| `src/app/runtime/wire/runtime-wire-calibration-binders.js` | **DEAD** — 23 lines, 1 no-op function | Only callsite `src/app/runtime/runtime-orchestration.js:2541-2570` passes ~30 args; the function body is `// intentionally empty`. The file's own header comment (lines 1-14) explicitly states it was kept as a stub "so the orchestration wire call site and the runtime-module-exports-check smoke test stay satisfied." Grep verifies the smoke test at `debug/p14-orchestration-module-exports-check.mjs` does NOT reference it: `grep -i calibration debug/p14-orchestration-module-exports-check.mjs` → no output. |

**Removal in C2:** delete the file, the orchestration call block at `runtime-orchestration.js:2540-2570`, and the `<script>` tag at `index.html:862`.

### B. Dead exported functions / constants

For each: I searched the symbol with `grep -rn "\bNAME\b" /home/claw/tt-beamer/src/`, then read the surviving call sites.

| Symbol | Defined in | Export site | Consumer | Status |
|--------|------------|-------------|----------|--------|
| `readJson` | `src/app/lib/persistence/board-profiles.js:2-12` | line 185 (object literal under `window.TT_BEAMER_PERSISTENCE`) | None — orchestration's only destructure of `TT_BEAMER_PERSISTENCE` is `{ extractBoardProfilesCandidate, buildMigratedBoardProfiles }` at `runtime-orchestration.js:600-603`. | **DEAD.** |
| `writeJson` | `src/app/lib/persistence/board-profiles.js:14-21` | line 186 | Same — not in orchestration's destructure. | **DEAD.** |
| `beginGridWarpFrame` | `src/app/runtime/viewport/runtime-projection-mapping.js:1947` (exported as no-op `() => null`) | line 1947 | None. Comment at line 1945 admits "These are kept so nothing crashes if called." Phase 19 SUMMARY.md confirms the hooks were removed from the draw loop. | **DEAD.** |
| `endGridWarpFrame` | same file, line 1948 (no-op `() => {}`) | line 1948 | None. | **DEAD.** |
| `CORNER_KEYS` | `src/app/runtime/viewport/runtime-projection-mapping.js:62` | line 1944 | None — not used internally in the file (verified: only 2 occurrences, the declaration and the export). | **DEAD.** |
| `isPolygonDragActive` | `src/app/runtime/viewport/runtime-polygon-drag-support.js:49-51` | line 273 | None — internally `polygonDragActive` is only read by `isHeavyInteractionActive` (line 44). The exported function has zero external callers. | **DEAD.** |

**Removal in C3:** drop the function bodies + the export-object entries. No call-site changes needed because there are no call sites.

### C. Dead internal function (never called)

| Symbol | Location | Status |
|--------|----------|--------|
| `buildPlaybackCard(scope, def, boardId)` | `src/app/runtime/ui/animation-editor-view.js:582-608` | **DEAD** — only one occurrence in the entire repo (the declaration). Phase 22 W3b-3 inlined Mode + Direction into the Defaults card (see lines 493-514, comment at 494-498 explicitly states "mode + direction used to live in a separate Playback card; inlined into Defaults"). The Playback card builder was orphaned but never deleted. |

### D. Dead DOM bindings (button handlers wired to non-existent IDs)

| DOM ref | querySelector ID | Wire site | Status |
|---------|------------------|-----------|--------|
| `quickModeActivateButton` | `#quick-mode-activate` | `runtime-wire-navigation-binders.js:127-129` (no-op due to `?.`) | DOM id absent from `index.html`; runtime-dom-refs.js:159-162 explicitly comments "legacy Activate/Deactivate buttons are gone from the DOM — querySelector returns null so the old bindings are no-ops". The handler also calls `setQuickMode("toggle")` (line 128), the same as `quickModeToggleButton` at line 123. **DEAD.** |
| `quickModeDeactivateButton` | `#quick-mode-deactivate` | `runtime-wire-navigation-binders.js:131-133` | Same — also calls `setQuickMode("toggle")`. **DEAD.** |

**Removal in C4:** delete the two `dom-refs.js` lines (163-164), the explanatory comment (159-162), the destructure in `runtime-orchestration.js:122, 1331-1332, 2516-2517`, and the wire bindings in `runtime-wire-navigation-binders.js:23-24, 127-133`. Also delete `quick-mode-activate` and `quick-mode-deactivate` from the regression test list at `runtime-orchestration.js:178-247` if present (verified absent — those IDs don't appear in `SETTINGS_EXCLUSIVE_CONTROL_IDS`).

### E. Mass dead-DOM-ref candidate list (112 IDs)

Of the 290 keys in `runtime-dom-refs.js`'s returned object, **112 query `#id` strings that do not exist in `index.html`** (verified via Python set-difference of querySelector strings vs `id="..."` attributes). Examples include:

- Legacy hitarea calibration controls: `#hitarea-offset-x`, `#hitarea-offset-y`, `#hitarea-scale`, `#hitarea-save`, `#hitarea-reset`, `#hitarea-status`
- Legacy room-geometry sliders: `#room-geometry-mode`, `#room-geometry-x`, `#room-geometry-y`, `#room-geometry-stretch-x`, `#room-geometry-stretch-y`, `#room-geometry-status` (all 5 + value display IDs)
- Pre-W3b animation-editor controls: `#inside-animation-select`, `#outside-animation-select`, `#room-animation-settings-*`, `#room-asset-type`, `#room-resource-select`, `#room-rotation-deg`, `#room-stretch-to-polygon`, `#room-width-scale`, `#room-height-scale`, `#room-offset-{x,y}-scale`, etc.
- Legacy mode indicators: `#room-mode-indicator`, `#inside-mode-indicator`, `#outside-mode-indicator`
- Already-flagged: `#quick-mode-activate`, `#quick-mode-deactivate`, `#room-breaks-solid-color`, `#room-breaks-solid-color-label`

**Critical caveat:** I did NOT verify that NONE of these are dynamically created at runtime (e.g., the W3b animation editor builds `<select>` controls in JS via `createElement`). The fact that `#inside-animation-select` is referenced in `SETTINGS_EXCLUSIVE_CONTROL_IDS` at `runtime-orchestration.js:231` for the regression-test ownership check suggests it was once a static control — but per the comment at lines 173-177, that list ALREADY had stale entries purged in Phase 21-1, so other entries may be newly stale.

**Recommendation for the planner:** treat the 112 missing-DOM-refs as a SECOND-PASS cleanup within Wave 1 (C5 in slicing below) after C1-C4 land. For each candidate, verify:
1. The `#id` is not built dynamically (search for `createElement` + the id pattern, OR `id =` / `setAttribute("id", ...)` strings).
2. The dom-refs entry has no consumers in `src/` after the dom-ref destructure is removed.
3. The associated wire bindings use `?.` and become genuinely no-op deletes.

A safer alternative is to defer the bulk DOM-ref cleanup to a **separate Wave 1.5 PR** (still Wave 1 scope per ROADMAP — "every unused DOM ref" is in scope) so each removal can be reviewed as an atomic group. This research does not block-list any specific entry; the planner should produce the final removal list.

### F. State fields with very low reference count

I audited 30 candidates from `runtime-state.js`'s `createInitialState`. Most are heavily used. Three are notable:

| Field | Refs | Status |
|-------|------|--------|
| `state.selectedBoard` | 5 | **KEEP — protocol field.** Written by `runtime-board-switch.js:49`, mirrored over live-sync (`runtime-live-sync-core.js:228-231, 244`) and serialized in `runtime-snapshot-helpers.js:20`. Removing it would change the live-sync wire format, which the ROADMAP explicitly forbids ("No public-API changes to the WebSocket / live-sync protocol"). |
| `state.selectedLayout` | 7 | **KEEP — protocol field.** Same pattern: `runtime-board-switch.js:50`, `runtime-live-sync-core.js:229-231, 245-247`, snapshot serialization. |
| `state.touchActionGuard` | 2 | **KEEP** — read AND mutated inside `src/app/lib/input/interaction-guards.js`; both refs are at lines 4 and 8 of the same function. The guard map is the single mutation owner. |

These look "low-ref" but each is intentional. No safe state-field deletions identified in this pass; flagging for the planner to revisit in Wave 4 (naming/API consistency) where the protocol shadow-keys can be discussed.

### G. Legacy-migration fields in `runtime-board-profiles.js`

The `extractBoardProfilesCandidate` and `buildMigratedBoardProfiles` functions in `src/app/lib/persistence/board-profiles.js` read many fallback keys (`profile.rooms`, `profile.roomModel`, `profile.hitarea`, `profile.roomStates`, `profile.polygons`, `profile.outsideAnimations`, `profile.insideAnimations`, `profile.roomAnimations`, `profile.playArea`, `profile.shipPolygon`, `profile.shipMask`, `profile.insidePolygon`, `profile.outsidePolygon`, `profile.selectedRoomAnimationId`, `profile.selectedInsideAnimationId`, `profile.selectedOutsideAnimationId`, `profile.roomTombstones`) — most appear only 1–2 times in `src/`. **They look dead but are load-bearing on legacy persisted bundles.** The ROADMAP says "No public-API changes to the export-bundle JSON schema" — these are read-only fallbacks, so the schema CONTRACT is unchanged either way, but removing them breaks ingestion of older bundles that exist in user systems. **Conservative call: keep all of them.**

### H. Asset files in `resources/`

Following the brief's direction (skip `resources/boards/` and `resources/sounds/` user content), I audited only `resources/animations/` (7 files):

| File | Refs in src/ + config + server.mjs + index.html | Status |
|------|----------|--------|
| `burst.gif` | 7 | LIVE |
| `fire.gif` | 9 | LIVE |
| `malfunction.gif` | 7 | LIVE |
| `sandstorm.mp4` | 8 | LIVE |
| `slime.gif` | 5 | LIVE |
| `output.mp4` (0 bytes) | 0 | **DEAD** — empty file, only mentioned in `README.md` and `scripts/loop_video.sh` as an example output filename, not as an animation asset. |
| `malfunction2.mp4` (58 MB) | 0 in current code; 1 ref in `config/global-defaults.json.pre-migration-bak:7280` only | **UNCERTAIN** — not referenced anywhere in current code or current `global-defaults.json`. Removing it saves 58 MB. The pre-migration backup reference suggests it was used pre-Phase-N migration. **Defer to user — too large to delete unilaterally; could still be wanted content.** |

`config/global-defaults.json.pre-migration-bak` is itself dead (a one-time migration backup) — flagging here as well in case the planner wants to clean it up alongside the asset.

## Risk areas the planner must be careful about

### 1. The structured logger is a `console.info` chokepoint
`src/app/lib/shared/logger.js:42` calls `console.info(message)` as the routing target for all `.info()` events from the structured logger (used by `ctx.logBootstrap`, `ctx.logRender`, `ctx.logUi`, `ctx.logRuntime`). Many production logging events flow through here. **The Wave 1 acceptance "zero `console.info(` in `src/`" cannot be met without explicitly carving out logger.js or replacing the call with `console.log`/`console.debug`.** Verify with the user before C1 lands. Recommended carve-out: "Zero `console.info(` outside `src/app/lib/shared/logger.js`."

### 2. Live-sync protocol shadow fields look dead but are load-bearing
`state.selectedBoard` and `state.selectedLayout` are written as live-sync protocol fields and serialized into snapshots, but never read by UI code (the UI reads `state.boardId`). They look dead by single-grep but removing them changes the wire format. **Do not remove without a protocol-evolution discussion.**

### 3. The 112-DOM-ref cleanup must consult the regression-test ownership list
`runtime-orchestration.js:178-247` defines `SETTINGS_EXCLUSIVE_CONTROL_IDS`, which the regression suite checks for "this control is owned by the settings view, not the dashboard." When you delete a DOM ref, also delete the matching string from this list AND from any per-zone ownership lists. The Phase 21-1 comment at lines 173-177 confirms this maintenance was done before; it must be done again.

### 4. Some "dead-looking" callsites use `?.` and may hide live behaviour
`runtime-wire-navigation-binders.js:127-133` looks dead because the DOM refs are null — but if someone re-adds `#quick-mode-activate` to the HTML in a future change, the binding will silently re-activate (and call `setQuickMode("toggle")`, the same as the Toggle button — so harmless, but surprising). Removing the dead bindings is safer than leaving them as latent traps.

### 5. The cluster-pad debug logs hide a latent bug
The `console.info("[cluster-pad] dispatch toggle result", { ..., clusterEntriesBefore: beforeClusterCount, ... })` at `runtime-animation-lifecycle.js:1377-1385` references `beforeClusterCount`, which is **never defined** in `dispatchClusterToggle`'s scope. Today this throws a `ReferenceError` only when the log is reached (which is "always when clicking a cluster pad while toggle mode is armed"). The error is swallowed because `console.info` arguments are evaluated… wait, no — argument evaluation throws BEFORE the call. So this branch DOES throw on every cluster-pad click. The fact it hasn't been observed in regression suggests either (a) the error is silently logged elsewhere (unlikely — `console.error` would surface it), or (b) the log line itself is somehow not reached in the user's path. **Either way, deleting the log fixes the bug.** The planner should note this in C1's commit message: "removes debug logs (also fixes ReferenceError on undefined `beforeClusterCount`)."

### 6. Dynamic dispatch via `ctx[name]()` — none observed
I searched for `ctx\[\w+\]\(` and `ctx\[".*"\]` patterns in `src/`. Only `ctx[propertyName]` lookups via static destructuring exist; no string-keyed dynamic dispatch. So if a function is unreferenced by name, it is genuinely unreferenced (not dispatched-by-string).

### 7. `window.TT_BEAMER_LIVE_SYNC_DEBUG` is only useful from DevTools
`runtime-bootstrap.js:230` writes a one-key snapshot bag for DevTools console use. Never read by `src/`. Strictly speaking it's outside the `__TT_*_DEBUG__` flag pattern (the global is `TT_BEAMER_LIVE_SYNC_DEBUG`, not `__TT_LIVE_SYNC_DEBUG__`), so the ROADMAP acceptance criterion is silent on it. The planner should ask the user whether DevTools debug entry-points stay or go.

### 8. Test infrastructure is manual
Per ROADMAP, "Build/test infra is manual." There is no automated test command to run after each commit. The full feature regression checklist at ROADMAP lines 203-275 is the only safety net. **Each Wave 1 commit must be independently revertable** so a regression caught two commits later can be bisected.

## Recommended commit slicing for Wave 1

The ROADMAP says "atomic commits, one logical group per commit." I recommend 6 commits in this order; each is independently revertable.

### C1 — Strip `__TT_CLUSTER_DEBUG__` flag and all `[cluster-pad]` debug info logs
- Delete `runtime-animation-lifecycle.js:1201-1208` (the `if (window.__TT_CLUSTER_DEBUG__) { ... }` block).
- Delete `runtime-animation-lifecycle.js:1251` (cluster-pad click info log).
- Delete `runtime-animation-lifecycle.js:1302` (tap-action route info log).
- Delete `runtime-animation-lifecycle.js:1331-1337` (toggle entry info log).
- Delete `runtime-animation-lifecycle.js:1339` (STOP same-type path info log).
- Delete `runtime-animation-lifecycle.js:1347` (START path info log).
- Delete `runtime-animation-lifecycle.js:1360` (startRoomAnimationFromDraft sync info log).
- Delete `runtime-animation-lifecycle.js:1373-1385` (dispatch toggle result info log — **also fixes `beforeClusterCount` ReferenceError**).
- Delete `runtime-animation-lifecycle.js:1397` (CLEAR all info log).

After C1: `grep -rn "console\.info(" src/ | grep -v "logger.js"` returns zero. `grep -rn "__TT_.*_DEBUG__" src/` returns zero.

**Verify with regression test:** cluster-pad toggle on a board with multiple clusters; multi-animation stacking; CLEAR mode (per ROADMAP play-areas/clusters checklist).

### C2 — Remove the no-op calibration-binders module
- Delete `src/app/runtime/wire/runtime-wire-calibration-binders.js` entirely.
- Delete the `<script>` tag at `index.html:862`.
- Delete `runtime-orchestration.js:2540-2570` (the `wireCalibrationBinders({...})` call block — verify exact range; the call passes ~30 args so this is roughly 30 lines).

After C2: `grep -rn "CALIBRATION_BINDERS\|wireCalibrationBinders" src/` returns zero.

**Verify with regression test:** boards & rooms checklist (board switch, polygon edit) — these are the features that consumed the original (now-removed-in-Phase-15-2) calibration panels, so any latent dependency would surface here.

### C3 — Remove confirmed dead exports + dead internal function
- `src/app/lib/persistence/board-profiles.js`: remove `readJson` (lines 2-12), `writeJson` (lines 14-21), and their entries in the export object (lines 185, 186).
- `src/app/runtime/viewport/runtime-projection-mapping.js`: remove `CORNER_KEYS` declaration (line 62) and export (line 1944); remove `beginGridWarpFrame` (line 1947) + `endGridWarpFrame` (line 1948) exports + the explanatory comment (lines 1945-1946).
- `src/app/runtime/viewport/runtime-polygon-drag-support.js`: remove `isPolygonDragActive` (lines 49-51) and its export entry (line 273).
- `src/app/runtime/ui/animation-editor-view.js`: remove `buildPlaybackCard` (lines 582-608) and its surrounding header comment (lines 577-581 if they describe the now-deleted function).

After C3: each removed symbol returns zero results from `grep -rn "\b<name>\b" src/`.

**Verify with regression test:** projection / align mode checklist (CORNER_KEYS, grid warp shims), drag interaction (polygon drag), animation-editor (Outside scope — the place that would have used `buildPlaybackCard`).

### C4 — Remove dead `quickMode {Activate,Deactivate}Button` bindings
- Delete `runtime-dom-refs.js:159-164` (the comment + the two `quickModeActivate*Button` queries).
- Delete `runtime-orchestration.js:122` (the destructure entries), `1331-1332` (ctx-thread), `2516-2517` (the second ctx-thread).
- Delete `runtime-wire-navigation-binders.js:23-24` (destructure), `127-133` (the two `?.addEventListener` wires).
- Update `runtime-quick-mode.js:8-9` (DOM-ref docstring listing them — they're just in a comment, harmless to leave but cleaner to remove).

After C4: `grep -rn "quickModeActivate\|quickModeDeactivate\|quick-mode-activate\|quick-mode-deactivate" src/` returns zero.

**Verify with regression test:** Tap-Action checklist (Off / Toggle / Clear). The Toggle button (`#quick-mode-toggle`) is wired separately and is the path the deleted handlers redundantly invoked — Toggle still works.

### C5 — Triage and remove the 112 dead DOM refs (planner decides scope)
This is the biggest line-count reduction but also the most error-prone. The planner should:
1. Pull the 112-id list from this RESEARCH.md's §E.
2. For each id, confirm with `grep -rn "id=\"<id>\"" .` and `grep -rn "createElement\|setAttribute(\"id\"" src/` that nothing produces it dynamically.
3. For each remaining truly-dead id, delete the dom-refs.js line, the orchestration destructure, the orchestration ctx-thread (if any), and any wire bindings.
4. Also purge the matching string from `SETTINGS_EXCLUSIVE_CONTROL_IDS` at `runtime-orchestration.js:178-247` if present (Phase 21-1 already did partial cleanup — repeat).
5. Run the FULL regression checklist after this commit — this commit has the highest collision risk with hidden runtime expectations.

If C5 ends up too large for one commit, split it by feature group (legacy hitarea, legacy room-geometry, legacy mode indicators, pre-W3b animation editor controls, etc.) and land each as its own atomic commit. Each sub-commit must be independently revertable.

### C6 — Remove orphan asset(s)
- Delete `resources/animations/output.mp4` (0 bytes; not referenced anywhere).
- **Defer `resources/animations/malfunction2.mp4` (58 MB)** until user confirms — it is not referenced in current code/config but the planner should not delete 58 MB of media unilaterally.
- Optional: delete `config/global-defaults.json.pre-migration-bak` if the planner confirms with the user that the pre-migration backup is no longer needed.

After C6: the listed orphan files are gone; `git status` confirms the deletion.

**Verify with regression test:** boards-and-animations smoke check — load each board, trigger each animation type. None of them point at `output.mp4` (verified by grep), so this should pass clean.

### Aggregate impact estimate
- **Lines removed:** roughly 250-400 (C1: ~30, C2: ~60, C3: ~50, C4: ~25, C5: ~150-300 depending on scope, C6: 0 src + 1 file).
- **Files deleted:** 1 src module (calibration-binders), 1-2 asset files.
- **Files touched:** approximately 8 source files for C1-C4, 3-5 for C5 (orchestration + dom-refs + wire binders + regression test list).

## Test plan for Wave 1

Run the **full** ROADMAP test plan (lines 203-275) after the wave merges. The cleanup areas with the highest risk of surfacing latent dependencies, in order, are:

### Top priority — recently debugged (high risk for C1)
- **Cluster pads** — tap a single cluster pad, verify it fires. Stack two animation types (e.g., fire + scanning) on one cluster, verify type-aware toggle stops only the matching type. Verify CLEAR stops every cluster animation. Verify the cluster rail stays glued to the stage during pan/zoom (the rAF-tick doesn't depend on the deleted logs but exercises the same code path).
- **Type-aware multi-animation per cluster** — the bug fixed in commits a0112df / 5bc0121 / d22be46 was in this exact code path. Specifically test: arm fire, tap cluster (fire starts on all rooms in cluster); arm scanning, tap cluster (scanning starts ON TOP of fire, both run); arm fire again, tap cluster (only fire stops, scanning keeps running).

### High priority — large surface change (risk for C5)
- **All Settings panels** — open each subtab (Board / Rooms / Polygon / Sounds / System / Animations), verify every visible control still works. The 112 dead DOM refs include legacy controls; their absence is harmless but if any are accidentally still in use the regression will surface here.
- **Animation editor** — open the W3b full-page editor, switch scope (Inside / Outside / Room), edit each property type (Mode + Direction for Outside coded; Color for solid-color Room; etc.). The deleted `buildPlaybackCard` was the old Outside Mode/Direction builder.
- **Live-sync** — open two control clients, trigger from one, see in the other within 1 frame. The protocol shadow fields (`selectedBoard`, `selectedLayout`) were intentionally kept; this verifies that.

### Medium priority — touched-by-removal
- **Polygon editing & drag** — drag vertex, drag edge, rotate room, undo / redo. Verifies `isPolygonDragActive` removal and the drag-state machinery still works.
- **Projection mapping & align mode** — toggle align mode, drag corner / line / intersection handles. Verifies `CORNER_KEYS` and the grid-warp shim removal didn't break the GL path.
- **Persistence import/export** — export a board bundle, re-import, verify zero diff. Verifies `readJson` / `writeJson` removal didn't affect the live `extractBoardProfilesCandidate` / `buildMigratedBoardProfiles` paths (they're separate).

### Standard priority — full feature regression
- All other items in the ROADMAP test plan: theme toggle, sound, output renderer (`/output`), tap-action modes, board switching.

**Bisect strategy if regression appears:** since each commit is independently revertable, `git revert C5` then re-run the failing scenario. If green: the regression is in the bulk DOM-ref cleanup (most likely). Continue bisecting by group within C5.
