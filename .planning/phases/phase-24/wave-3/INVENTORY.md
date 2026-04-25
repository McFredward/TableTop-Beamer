# Phase 24 Wave 3 — INVENTORY

Tracks per-commit progress for Wave 3 file/function decomposition.

## Baseline (pre-flight, captured against `phase-24-w3-start`)

- **Tag:** `phase-24-w3-start` → `4643ec7` (commit `docs(24-2): wave-2 PLAN, RESEARCH, INVENTORY + wave-1 PLAN/RESEARCH`).
- **Captured:** 2026-04-25.

### Top sizes (`find src/app/runtime/ -name "*.js" -exec wc -l {} + | sort -rn | head -25`)

```
  28329 total
   3037 src/app/runtime/runtime-orchestration.js
   1945 src/app/runtime/viewport/runtime-projection-mapping.js
   1698 src/app/runtime/ui/animation-editor-view.js
   1369 src/app/runtime/animation/runtime-animation-lifecycle.js
    985 src/app/runtime/panels/runtime-fx-panels.js
    924 src/app/runtime/wire/runtime-wire-room-audio-binders.js
    923 src/app/runtime/wire/runtime-wire-fx-panel-binders.js
    846 src/app/runtime/polygon-editor/runtime-polygon-editor.js
    836 src/app/runtime/render/runtime-draw-loop.js
    707 src/app/runtime/animation/runtime-room-management.js
    659 src/app/runtime/animation/runtime-room-dispatch.js
    574 src/app/runtime/state/runtime-fx-normalizers.js
    548 src/app/runtime/live-sync/runtime-live-sync-core.js
    538 src/app/runtime/wire/runtime-wire-overlay-window-binders.js
    517 src/app/runtime/live-sync/runtime-global-defaults.js
    500 src/app/runtime/panels/runtime-regression-tests.js
    480 src/app/runtime/state/runtime-play-area-geometry.js
    474 src/app/runtime/animation/runtime-quick-mode.js
    459 src/app/runtime/wire/runtime-wire-polygon-editor-binders.js
    428 src/app/runtime/render/runtime-audio.js
    427 src/app/runtime/core/polygon-contract.js
    409 src/app/runtime/wire/runtime-wire-stage-gesture-binders.js
    407 src/app/runtime/animation/runtime-room-draft.js
    372 src/app/runtime/render/runtime-gif-decoder.js
```

Counts within ±2 % of RESEARCH §2 expectation (28307 total; primary targets 3037 / 1945 / 1698 / 1369 — exact match).

### Pre-flight smoke

Deferred to user manual pass at end of W3.1 per orchestrator decision (each commit's primary gate is `node --check` + body-identical diff + namespace existence; full browser-load smoke runs once after the wave lands).

## Decisions (confirmed pre-flight)

- **Scope expansion to all unnamed >800-line files** (fx-panels 985, wire-room-audio-binders 924, wire-fx-panel-binders 923, polygon-editor 846, draw-loop 836) → **APPROVED for W3.6**.
- **Orchestration safer-path approach** (extract only ctx-builder + 4 top-level functions) → **APPROVED for W3.5**. ROADMAP exception clause "excluding the orchestration wire-up which is allowed to be a re-export shell" sanctions this.
- **`runtime-utils.js` location** = `src/app/runtime/runtime-utils.js`. Loaded as a `<script>` AFTER `lib/ui/runtime-panels-controller.js`, BEFORE `runtime/core/polygon-contract.js` (per Issue #8 fix in PLAN §6).
- **Pre-execution tag:** `phase-24-w3-start` set on HEAD `4643ec7`.

## Namespace snapshots

Pre-split namespace key snapshots for the 4 primary targets and 5 secondary targets are captured during the relevant sub-wave commits (W3.2–W3.6). For W3.1 (utility consolidation, no module splits), the only new namespace is `window.TT_BEAMER_RUNTIME_UTILS = ["bboxOfPolygon", "clamp", "clamp01"]`.

## Per-commit progress

| Commit | Hash | Sub-wave | Files moved-from | Files moved-to | Lines moved | `node --check` | Body-identical diff | `<script>` order verified | Notes |
|--------|------|----------|------------------|----------------|-------------|----------------|---------------------|---------------------------|-------|
| W3.1-C1 | `66560f7` | W3.1 | n/a | `runtime-utils.js`, `index.html` | n/a (additive) | yes | n/a (new file) | yes (utils after panels-controller, before polygon-contract) | introduces `clamp` / `clamp01` / `bboxOfPolygon`; browser-load smoke deferred to end-of-W3.1 user manual pass |
| W3.1-C2 | `7d959c5` | W3.1 | `runtime-viewport-zoom.js:223-232` | `runtime-viewport-zoom.js` (call site) | 10 → 1 (net -9) | yes | n/a (call-site replacement; canonical body lives in `runtime-utils.js` from C1) | yes (utils loaded at index.html:826, before viewport-zoom at :846) | viewport-zoom site only; see Decision-log below — `runtime-room-geometry.js:180-191` site dropped (fused with radius computation) |
| W3.1-C3 | `fff39e7` | W3.1 | `runtime-board-profiles.js:71,:108`, `runtime-global-defaults.js:413`, `runtime-wire-room-audio-binders.js:365`, `runtime-wire-fx-panel-binders.js:315` | same files (call-site replacement) | 5 sites (3× `clamp01`, 2× `clamp(0,100,…)`) | yes (4 files clean) | n/a (expression-level replacement; inner `expr` preserved verbatim per PLAN §C3) | yes (utils at :826, all consumers at :861-866) | audio cluster — pre-edit grep matched PLAN exactly: 3 `Math.max(0, Math.min(1, …))` + 2 `Math.max(0, Math.min(100, …))` |
| W3.1-C4 | `dbc9922` | W3.1 | `runtime-slider-touch-guard.js:94`, `runtime-polygon-drag-support.js:216`, `polygon-contract.js:7` | same files (call-site replacement) | 3 sites (3× `clamp01`) | yes (3 files clean) | n/a (expression-level replacement) | yes (utils at :826, polygon-contract :827, polygon-drag :829, slider-touch-guard :845) | polygon-drag cluster — pre-edit grep matched PLAN exactly |
| W3.1-C4.5 | `faa447e` | W3.1 | `index.html:826` | `index.html:805` | 1 `<script>` tag relocated (no code change) | n/a (HTML; runtime-utils.js itself unchanged, `node --check` clean) | n/a (HTML reorder) | yes (utils at :805 — first runtime-tier tag, before `runtime/ui/icons.js` at :808 and `runtime/ui/animation-editor-view.js` at :812; orchestration tag still last at :885) | defensive reorder per orchestrator decision (PLAN-deviation; not in PLAN) — guarantees parse-time availability for all current/future consumers; runtime-utils.js is a pure self-contained IIFE so safe to load earliest |
| W3.1-C5 | `54fd5df` | W3.1 | `animation-editor-view.js:1286, :1363` | same file (call-site replacement) | 2 sites (2× `clamp01`) | yes (1 file clean) | n/a (expression-level replacement; inner `opacity * intensity` preserved verbatim) | yes (utils at :805, editor-view at :812 — utils first) | editor cluster only; lifecycle 10-site scope from PLAN §C5 dropped — see Decision-log (varied bounds, would require REWRITE not MOVE) |
| W3.1-C6 | `53c9e96` | W3.1 | `runtime-orchestration.js:2412-2431` (20-line derivation block) | `runtime-viewport-zoom.js:302-321` (canonical single-source) + 1-line breadcrumb in orchestration | comment-only relocation (17-line derivation moved; orchestration shrinks by 19 net lines, viewport-zoom grows by 16 net lines) | yes (both files clean) | strong gate: non-comment diff is empty across both files | n/a (no `<script>` order change) | comment-only consolidation; PLAN §C6 had inverted source-of-truth assumption — see Decision-log |

## Init-order kernels preserved

To be enumerated as W3.2–W3.6 commits land. W3.1 does not move any kernel comments.

## Final file-size table

To be filled at end-of-wave.

## Decision-log

(deviations from PLAN are recorded here as commits land)

- **W3.1-C2 deviation — `runtime-room-geometry.js:180-191` site dropped.** RESEARCH §5 noted "also computes radius alongside" but PLAN §W3.1-C2 took the "exact duplicate" framing without propagating the caveat. The room-geometry loop is fused with `radius = Math.max(radius, Math.hypot(x - centerX, y - centerY))` in the same `for` body. Replacing the bbox half would require either (a) a 2-pass split (violates MOVE-not-REWRITE — the radius pass would be a new derived structure, not a relocation) or (b) expanding `bboxOfPolygon` signature to also emit radius (out of C2 scope; would conflate two utilities). Orchestrator decision: consolidate only the clean viewport-zoom site (lines 223–232). `bboxOfPolygon` retains 1 active call site after C2; the room-geometry inline loop stays as-is. Same shape as the C5 revision: drop sites that don't fit byte-identical / MOVE rules and document why.

- **W3.1-C4.5 added per orchestrator decision (not in PLAN).** `runtime/ui/animation-editor-view.js` (loaded at `index.html:808`) was a positional consumer of `TT_BEAMER_RUNTIME_UTILS` in `runtime-utils.js` (loaded at `:826`). Functionally safe via defer-script ordering (callbacks fire after all defer scripts parse), but PLAN didn't anticipate the asymmetry. Orchestrator chose Option 2 — defensive reorder: hoist `runtime-utils.js` to top of runtime block (line 805 — first runtime-tier `<script>` tag), guaranteeing parse-time availability for any current/future consumer. Landed as separate atomic commit `faa447e` with `fix(24-3):` prefix. No other module's tag moved. C5 / C6 then proceeded without script-order concerns.

- **W3.1-C5 deviation — `runtime-animation-lifecycle.js:81-110` 10-site scope dropped.** PLAN §C5 attributed "10 inline clamps in slider handlers" to lifecycle and prescribed `clamp01` swap for all of them. Pre-edit grep showed those 10 sites use varied bounds (-180..180, 0.1..10, -1..1) — they are NOT `clamp01` patterns. Swapping them would require `TT_BEAMER_RUNTIME_UTILS.clamp(min, max, v)`, which is a different call shape than the editor-view sites — i.e., would change call arity and shape (REWRITE), not byte-identical body relocation. Per Wave 3 hard rule ("code MOVES; it does NOT REWRITE") and orchestrator C5 framing ("consolidate the 2 clamp01 sites at `animation-editor-view.js:1286, :1363`. Clean swap"), only the 2 editor-view sites were swapped. Lifecycle's 10 varied-bound sites remain inline; if Wave 4 wants to consolidate them via the existing `clamp` 3-arg API, that's a separate refactor.

- **W3.1-C6 deviation — PLAN had inverted source-of-truth assumption.** PLAN §C6 read: "the comment in `runtime-viewport-zoom.js:307-323` is the canonical derivation. Do NOT touch it." But pre-edit grep verified `runtime-viewport-zoom.js` carried only the 4-line brief header (`Cursor-accurate zoom-around-anchor math…`); the full 17-line derivation (with `visualX = layoutCenterX + panX + …` etc.) lived solely in `runtime-orchestration.js:2412-2431`. Following PLAN §C6 verbatim — replace orchestration block with breadcrumb to viewport-zoom — would have destroyed the load-bearing rationale. Executor took PLAN-spirit path: relocate the 17-line derivation block into `runtime-viewport-zoom.js` (immediately after the existing 4-line header), then leave a 1-line breadcrumb in orchestration. Net: still single-source-of-truth, comment text preserved verbatim, strong gate (non-comment diff empty) passed.

## Wave 3 commits

| Commit | Hash | Message |
|--------|------|---------|
| W3.1-C1 | `66560f7` | `refactor(24-3): introduce src/app/runtime/runtime-utils.js with clamp/clamp01/bboxOfPolygon` |
| W3.1-C2 | `7d959c5` | `refactor(24-3): consolidate viewport-zoom polygon-bbox site onto runtime-utils.bboxOfPolygon` |
| W3.1-C3 | `fff39e7` | `refactor(24-3): replace Math.max/Math.min clamp patterns with runtime-utils.clamp/clamp01 — audio cluster` |
| W3.1-C4 | `dbc9922` | `refactor(24-3): replace Math.max/Math.min clamp patterns with runtime-utils.clamp01 — polygon-drag cluster` |
| W3.1-C4.5 | `faa447e` | `fix(24-3): hoist runtime-utils.js script tag for parse-time availability` |
| W3.1-C5 | `54fd5df` | `refactor(24-3): replace Math.max/Math.min clamp patterns with runtime-utils.clamp01 — editor cluster` |
| W3.1-C6 | `53c9e96` | `refactor(24-3): consolidate zoom-anchor derivation comment to viewport-zoom` |

## Tags

- `phase-24-w3-start` (`4643ec7`) — set during pre-flight; rollback target.

## End-of-W3.1 verification

W3.1 closed with 7 commits (`66560f7` → `53c9e96`). End-of-W3.1 mechanical checks:

- **`runtime-utils.js` final size:** 22 lines (1 IIFE; 3 functions: `clamp(min, max, v)` 3-line, `clamp01(v)` 3-line, `bboxOfPolygon(points)` 12-line; 1 namespace export line).
- **Namespace introduced:** exactly one — `window.TT_BEAMER_RUNTIME_UTILS = { clamp, clamp01, bboxOfPolygon }`. No other `window.TT_BEAMER_*` added across W3.1 (`grep -c "TT_BEAMER_" runtime-utils.js` = 1; only writer).
- **Consumer count:** 11 call sites across 10 files (`grep -rn "window.TT_BEAMER_RUNTIME_UTILS\." src/`).
  - `clamp01` (8 sites): `runtime-board-profiles.js:71, :108`; `runtime-global-defaults.js:413`; `runtime-slider-touch-guard.js:94`; `runtime-polygon-drag-support.js:216`; `polygon-contract.js:7`; `animation-editor-view.js:1286, :1363`.
  - `clamp(0, 100, …)` (2 sites): `runtime-wire-room-audio-binders.js:365`; `runtime-wire-fx-panel-binders.js:315`.
  - `bboxOfPolygon` (1 site): `runtime-viewport-zoom.js:223`.
- **`<script>` order verified:** `runtime-utils.js` at `index.html:805` — first runtime-tier `<script>` tag, before `runtime/ui/icons.js` (:808), `runtime/ui/animation-editor-view.js` (:812), and the consolidated runtime block starting at :829. `runtime-orchestration.js` is still the last runtime-block tag (:885). No other module reordered.
- **`node --check` clean** for every modified `.js` file in W3.1 commits.
- **`git log --shortstat phase-24-w3-start..HEAD`:** 7 commits; ~149 insertions / ~43 deletions across 11 files (dominated by the additive W3.1-C1 utils file and the bbox 10→1 line replacement in C2).
- **Deviation summary:** 4 deviations recorded above — C2 (room-geometry site dropped, fused with radius), C4.5 (defensive script-tag reorder added), C5 (lifecycle 10-site scope dropped, varied bounds), C6 (PLAN had inverted source-of-truth assumption — derivation moved viewport-zoom-ward instead of breadcrumb-only).
- **Browser-load smoke:** deferred to user manual pass per orchestrator decision. Full ROADMAP regression checklist (lines 203–275) needs to run on a fresh `node server.mjs` start before W3.1 is declared done.

## Final file-size table

To be filled at end-of-wave (after W3.2–W3.6 land).
