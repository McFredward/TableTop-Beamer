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
| W3.1-C3 | (pending) | W3.1 | `runtime-board-profiles.js:71,:108`, `runtime-global-defaults.js:413`, `runtime-wire-room-audio-binders.js:365`, `runtime-wire-fx-panel-binders.js:315` | same files (call-site replacement) | 5 sites (3× `clamp01`, 2× `clamp(0,100,…)`) | yes (4 files clean) | n/a (expression-level replacement; inner `expr` preserved verbatim per PLAN §C3) | yes (utils at :826, all consumers at :861-866) | audio cluster — pre-edit grep matched PLAN exactly: 3 `Math.max(0, Math.min(1, …))` + 2 `Math.max(0, Math.min(100, …))` |

## Init-order kernels preserved

To be enumerated as W3.2–W3.6 commits land. W3.1 does not move any kernel comments.

## Final file-size table

To be filled at end-of-wave.

## Decision-log

(deviations from PLAN are recorded here as commits land)

- **W3.1-C2 deviation — `runtime-room-geometry.js:180-191` site dropped.** RESEARCH §5 noted "also computes radius alongside" but PLAN §W3.1-C2 took the "exact duplicate" framing without propagating the caveat. The room-geometry loop is fused with `radius = Math.max(radius, Math.hypot(x - centerX, y - centerY))` in the same `for` body. Replacing the bbox half would require either (a) a 2-pass split (violates MOVE-not-REWRITE — the radius pass would be a new derived structure, not a relocation) or (b) expanding `bboxOfPolygon` signature to also emit radius (out of C2 scope; would conflate two utilities). Orchestrator decision: consolidate only the clean viewport-zoom site (lines 223–232). `bboxOfPolygon` retains 1 active call site after C2; the room-geometry inline loop stays as-is. Same shape as the C5 revision: drop sites that don't fit byte-identical / MOVE rules and document why.

## Wave 3 commits

| Commit | Hash | Message |
|--------|------|---------|
| W3.1-C1 | `66560f7` | `refactor(24-3): introduce src/app/runtime/runtime-utils.js with clamp/clamp01/bboxOfPolygon` |

## Tags

- `phase-24-w3-start` (`4643ec7`) — set during pre-flight; rollback target.

## End-of-wave verification

To be filled at end-of-wave.
