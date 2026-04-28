# Phase 24 Wave 3 — Executable Plan: File / Function Decomposition

**Wave:** 24-3
**Type:** Code-quality refactor (no behaviour change — code MOVE, no rewrite)
**Inputs:** [ROADMAP.md](../ROADMAP.md), [RESEARCH.md](./RESEARCH.md), [Wave-1 PLAN](../wave-1/PLAN.md), [Wave-2 PLAN](../wave-2/PLAN.md), [Wave-2 INVENTORY](../wave-2/INVENTORY.md)
**Slicing:** 6 sub-waves (W3.1–W3.6) with **~38 atomic commits** total (W3.4-C3 split into C3a/C3b, W3.4-C4 split into C4a/C4b, W3.6-C5 split into C5a/C5b/C5c per checker BLOCKER + warnings). Every commit is independently revertable. Bisect-friendly granularity: one extraction per commit.
**Estimated wave length:** ~10–14 hours executor work spread over multiple sessions + 10–15 min full ROADMAP regression at end of each sub-wave + a final regression at end of wave.

---

## 1. Goal

Wave 3 **physically decomposes** the four ROADMAP-named oversized runtime modules (orchestration, projection-mapping, animation-editor-view, animation-lifecycle) plus a set of secondary >800-line files into smaller sub-modules, splits every function ≥150 lines into named helpers, and consolidates verified-duplicate utility helpers into a shared `runtime-utils.js`. The result is a runtime tree where **no file exceeds 800 lines** (orchestration shim is the sanctioned exception per ROADMAP) and **no function exceeds 150 lines** — without changing a single byte of executable behaviour.

**Hard rules — non-negotiable:**

- **Code MOVES; it does NOT REWRITE.** Function bodies must be byte-identical pre/post move. The verifier per commit is `git diff -w --no-color HEAD~..HEAD -- <old-path> <new-path>` showing only relocation (deletion in source file ↔ identical addition in destination file). No reformatting, no renaming, no inlining of guards, no "while we're here" tidying. (Wave 4 owns naming. Wave 5 owns boundary cleanup. Wave 3 owns the move only.)
- **`index.html` `<script>` load order grows but the relative order of pre-existing scripts MUST not change.** New sub-module `<script>` tags are inserted *between* existing tags; no existing tag is reordered, removed, or relocated.
- **Every `window.TT_BEAMER_RUNTIME_<NAME>` global remains, with the same `init({ctx})` contract.** The shim file at the original path keeps the same namespace key string, exposes the same Object.keys, and accepts the same dep-bag shape from orchestration. Verification: `Object.keys(window.TT_BEAMER_RUNTIME_<NAME>)` snapshot pre-split equals snapshot post-split.
- **The 13 init-order kernels documented in Wave 2 INVENTORY (Kept (load-bearing WHY), §"Kept (load-bearing WHY)") are preserved.** Each kernel's verbatim text travels with the code it documents. If a kernel's host code stays in the orchestration shim, its comment stays. If the host code moves to a sub-module, the comment moves with it. Section §7 below enumerates each kernel and its assigned post-split location.
- **No public-API changes.** No live-sync protocol fields touched, no export-bundle JSON shapes touched, no `localStorage` keys touched. No npm packages added. Same Node version, same browser targets.
- **One commit per logical refactor.** No bundling. Each commit must revert cleanly via `git revert <hash>` and leave a working app.

**Stays unchanged:** every user-facing behaviour, every README-documented feature, every live-sync protocol field, every export-bundle JSON shape, every `localStorage` key, every dependency, every IIFE namespace key, every comment that survives Wave 2's "Kept (load-bearing WHY)" list.

---

## 2. Acceptance Criteria

This wave is done when **all** of the following are true:

- [ ] **No `.js` file in `src/app/runtime/` exceeds 800 lines** except the orchestration shim (sanctioned by ROADMAP §"Wave 3 → Acceptance" → "excluding the orchestration wire-up which is allowed to be a re-export shell"):
  ```bash
  find src/app/runtime/ -name "*.js" -exec wc -l {} + | awk '$1 > 800 && $2 != "total" && $2 !~ /runtime-orchestration\.js$/'
  # → empty
  ```
- [ ] **Orchestration shim is ≤800 lines OR explicitly justified.** Document the residual line count in INVENTORY.md "Final file-size table". The safer-path target is ~2400 lines residual; if the planner / executor takes the safer path, INVENTORY.md must record the residual count and quote the ROADMAP exception clause that sanctions it.
- [ ] **No function exceeds 150 lines.** Heuristic check (RESEARCH §3 inventory; verifies all 14 currently-≥150-line functions are split):
  ```bash
  node /tmp/find-large-funcs2.js src/app/runtime/**/*.js | grep -E '1[5-9][0-9] lines|[2-9][0-9][0-9] lines'
  # → empty
  ```
  Manual spot-check on top-N largest files complements the heuristic (arrow-function expressions are not caught by the scanner — RESEARCH Assumption A6).
- [ ] **All existing IIFE namespaces remain accessible via `window.TT_BEAMER_RUNTIME_<NAME>`.** Browser DevTools verification:
  ```javascript
  Object.keys(window).filter(k => k.startsWith("TT_BEAMER_"))
  // post-Wave-3: superset of the pre-Wave-3 keys (same names + new sub-module names)
  ```
- [ ] **Every `init({ctx})` contract honoured by the new shells.** Verified via boot smoke: dashboard loads with **zero red console errors**, `Status: Ready` appears, `/output` loads with zero red errors.
- [ ] **Per-commit primary gate passes:**
  - `node --check <each modified .js>` exits 0.
  - Browser-load smoke shows zero new console errors at boot (control client + `/output`).
  - For pure-extraction commits: `git diff -w --no-color HEAD~..HEAD -- <old-path> <new-path>` shows only relocation — moved-out hunks in source file match moved-in hunks in destination file byte-for-byte after whitespace-tolerant diff. (For shim-write commits this gate doesn't apply — the shim is new code; the gate is `node --check` + boot smoke.)
- [ ] **Full ROADMAP regression checklist passes** at end of wave (ROADMAP §"Test plan", lines 203–275). Manual smoke pass, ~10–15 min on a fresh `node server.mjs` start.
- [ ] **`INVENTORY.md` exists** at `.planning/phases/phase-24/wave-3/INVENTORY.md`, updated incrementally per commit, with: per-commit table (hash, sub-wave, files moved-from / moved-to, lines moved, primary-gate status), an "Init-order kernels preserved" section enumerating all 13 kernels with verification quotes, a final file-size table (every file in `src/app/runtime/` with pre-W3 size + post-W3 size + delta), and a decision-log section recording any deviations from this plan.
- [ ] **Pre-execution rollback tag set.** `git tag phase-24-w3-start` lands on HEAD before C1 of W3.1. INVENTORY.md records the tagged commit hash.
- [ ] **No stray side effects.** `git diff phase-24-w3-start..HEAD -- src/` post-wave shows ONLY moves, ONLY new sub-module files, and ONLY shim-aggregator code in the original-path files. Comment changes are limited to the kernel-comment relocations (no new comments, no comment deletions).

---

## 3. Pre-Flight Checklist (before W3.1 C1)

Mechanical setup the executor performs **once** before opening C1 of W3.1:

- [ ] **Confirm `git status` working-tree state.** Current state (verified 2026-04-25):
  - `config/global-defaults.json` — pre-existing user edit, unrelated to runtime tree, leave untouched. Continues to surface in `git status` throughout the wave; user resolves separately.
  - `.planning/phases/phase-24/wave-3/` — untracked planning dir (this PLAN.md, RESEARCH.md, future INVENTORY.md). Add to staging only when committing planning artifacts; don't bundle with code commits.
  - **No other unrelated edits in `src/`.** If the executor finds any, stash them as `phase-24-w3-prestart` before C1 lands. (Linter-touched `polygon-editor.js`, `styles.css`, `theme-obsidian.css` mentioned in user pre-flight notes are not currently dirty — verified clean as of plan-write.)
- [ ] **Set rollback tag:**
  ```bash
  git tag phase-24-w3-start    # lands on current HEAD
  ```
  Record the tagged hash in INVENTORY.md "Tags" section.
- [ ] **Snapshot baseline metrics** (re-run RESEARCH §2 commands fresh; record in INVENTORY.md "Baseline" section). Verify counts within ±2 % of RESEARCH:
  ```bash
  find src/app/runtime/ -name "*.js" -exec wc -l {} + | sort -rn | head -25
  # Expected (verified 2026-04-26 + 2026-04-25): 28307 total; orchestration 3037, projection-mapping 1945,
  # animation-editor-view 1698, animation-lifecycle 1369, fx-panels 985, wire-room-audio-binders 924,
  # wire-fx-panel-binders 923, polygon-editor 846, draw-loop 836.
  ```
- [ ] **Snapshot pre-split namespace keys** for each of the 4 primary targets and the 5 secondary >800-line files (a "before" reading the executor will diff against). For each affected module, after a clean boot of `node server.mjs` and opening `/`, in DevTools:
  ```javascript
  console.log(JSON.stringify(Object.keys(window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING).sort()));
  console.log(JSON.stringify(Object.keys(window.TT_BEAMER_ANIMATION_EDITOR_VIEW).sort()));
  console.log(JSON.stringify(Object.keys(window.TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE).sort()));
  // ... and for each secondary target before W3.6 begins.
  ```
  Paste the output into INVENTORY.md "Namespace snapshots" section. Each split commit's verification re-captures the keys and asserts equality (allowing additions to the pre-existing key set is permissible only if the executor explicitly notes the addition; deletions are forbidden).
- [ ] **User-decision items batch (already settled — log as "confirmed" in INVENTORY.md "Decisions"):**
  - **Scope expansion to all unnamed >800-line files** (fx-panels 985, wire-room-audio-binders 924, wire-fx-panel-binders 923, polygon-editor 846, draw-loop 836) → **APPROVED for W3.6** per orchestrator pre-flight. The "no module exceeds 800 lines" acceptance bar applies to all of `src/app/runtime/`.
  - **Orchestration safer-path approach** (extract only ctx-builder + 4 top-level functions; keep rest as wire-up shell) → **APPROVED for W3.5** per orchestrator pre-flight. ROADMAP exception clause "excluding the orchestration wire-up which is allowed to be a re-export shell" sanctions this; INVENTORY.md cites the clause when recording the residual line count.
  - **`runtime-utils.js` location** = `src/app/runtime/runtime-utils.js` (per RESEARCH §5 + Open-Question §3 recommendation: ROADMAP wording "single `runtime-utils.js`" wins; new file in `src/app/runtime/`, not `src/app/lib/`). Loaded as a `<script>` early — see W3.1 §4.1 for exact `index.html` insertion point.
- [ ] **Manually run an abbreviated boot smoke** on a fresh `node server.mjs`. Open `/`, switch a board, trigger one cluster-pad animation, open `/output`. Note any pre-existing console oddities so they aren't blamed on Wave 3. Record in INVENTORY.md "Pre-flight smoke" section.
- [ ] **Initialize `INVENTORY.md`** with the template skeleton (see §11 below).

---

## 4. Sub-Wave Breakdown

Six sub-waves, ordered low→high risk per RESEARCH §7. Each sub-wave is itself a sequence of atomic commits; each commit is independently revertable. Per-commit task structure is uniform across the wave — see §6 ("Per-commit task structure").

### W3.1 — Utility Consolidation (LOWEST risk, foundational)

**Goal:** Create `src/app/runtime/runtime-utils.js`. Move shared utilities here. Replace verified duplicate sites with `runtime-utils.js` exports. Drop the duplicate zoom-anchor *comment* block from orchestration (the *code* is single-source already — RESEARCH §5).

**Per-commit count:** ~6.

**Estimated time:** 1.5–2 h.

**Commits:**

- [ ] **W3.1-C1 — Introduce `runtime-utils.js`** (additive, no call sites yet).
  - **Files touched:**
    - `src/app/runtime/runtime-utils.js` (new file, ~25 lines).
    - `index.html` (one new `<script>` line).
  - **What moves:** none — this commit is purely additive.
  - **What's added:** the IIFE-with-window-globals scaffold from RESEARCH §5 ("Recommended `runtime-utils.js`"):
    - `clamp(min, max, v)` — generic 3-arg clamp.
    - `clamp01(v)` — shorthand for `clamp(0, 1, v)`.
    - `bboxOfPolygon(points)` — min/max iteration, returns `{ minX, maxX, minY, maxY }`.
    - Namespace: `window.TT_BEAMER_RUNTIME_UTILS = { clamp, clamp01, bboxOfPolygon };`.
  - **`index.html` updates:** insert
    ```html
    <script src="/src/app/runtime/runtime-utils.js" defer></script>
    ```
    BEFORE line 826 (`/src/app/runtime/core/polygon-contract.js`) and AFTER line 825 (`/src/app/lib/ui/runtime-panels-controller.js`). (Loaded after `lib/shared/normalizers.js` per RESEARCH §5 recommendation; loaded before any consumer.)
  - **Pre-move verification:** `grep -n "TT_BEAMER_RUNTIME_UTILS" src/` returns nothing. `wc -l src/app/runtime/runtime-utils.js` errors (file doesn't exist yet).
  - **Post-move verification:**
    - `node --check src/app/runtime/runtime-utils.js` exits 0.
    - Boot smoke: `/` and `/output` load with zero red errors. DevTools: `Object.keys(window.TT_BEAMER_RUNTIME_UTILS).sort()` returns `["bboxOfPolygon", "clamp", "clamp01"]`.
    - All other namespaces' keys unchanged (snapshot diff vs. pre-flight pass).
  - **Adjacent smoke:** none — file is unused.
  - **Commit message:** `refactor(24-3): introduce src/app/runtime/runtime-utils.js with clamp/clamp01/bboxOfPolygon`
  - **Rollback:** `git revert <hash>` removes the file + the `index.html` line.

- [ ] **W3.1-C2 — Replace 2 polygon-bbox sites with `bboxOfPolygon`.**
  - **Files touched:**
    - `src/app/runtime/viewport/runtime-viewport-zoom.js` (lines 223–232 — current location; verify before edit).
    - `src/app/runtime/state/runtime-room-geometry.js` (lines 180–191 — current location; verify before edit).
  - **What moves:** RESEARCH §5 ("Polygon BBox") — these two sites use byte-identical min/max-iteration patterns over `[x,y]` points. Replace each with a call to `window.TT_BEAMER_RUNTIME_UTILS.bboxOfPolygon(points)`, destructuring `{ minX, maxX, minY, maxY }`. Keep the existing variable names (the local code references `minX`, `maxX`, etc., as bare names — the destructure preserves that).
  - **What stays local (do NOT touch):**
    - `runtime-projection-mapping.js:1203-1213` — 2D-grid iteration variant. Different shape, do NOT consolidate.
    - `runtime-polygon-editor.js:760-769` — uses 1000-sentinel because polygon coords are 0–1000 SVG units. Different sentinel, do NOT consolidate.
  - **`index.html` updates:** none.
  - **Pre-move verification:**
    - `grep -n "minX = Number.POSITIVE_INFINITY" src/app/runtime/viewport/runtime-viewport-zoom.js` returns one hit.
    - Confirm exact line range against current file (lines may have drifted since RESEARCH §5).
  - **Post-move verification:**
    - `node --check` clean for both files.
    - Boot smoke: `/` loads, polygon-edit drag works (zoom-around-anchor uses bbox in viewport-zoom).
    - `git diff -w` post-edit shows only the bbox loop removed and `bboxOfPolygon` call inserted.
  - **Adjacent smoke:** drag a polygon vertex (room-geometry uses bbox); pinch-zoom on a board (viewport-zoom uses bbox).
  - **Commit message:** `refactor(24-3): consolidate 2 polygon-bbox sites onto runtime-utils.bboxOfPolygon`
  - **Rollback:** `git revert <hash>` restores the inline loops.

- [ ] **W3.1-C3 — Replace `Math.max(0, Math.min(1, …))` patterns with `clamp01` — audio/sound topical group.**
  - **Files touched:**
    - `src/app/runtime/wire/runtime-wire-room-audio-binders.js:365` — `Math.max(0, Math.min(100, …))` → keep this one (range is 0–100, not 0–1; use `clamp(0, 100, …)`).
    - `src/app/runtime/state/runtime-board-profiles.js:71, :108` — `Math.max(0, Math.min(1, …))` → `clamp01(…)`.
    - `src/app/runtime/live-sync/runtime-global-defaults.js:413` — `clamp01`.
    - `src/app/runtime/wire/runtime-wire-fx-panel-binders.js:315` — range 0–100 → `clamp(0, 100, Math.round(Number(...) || 0))`.
  - **What moves:** every `Math.max(0, Math.min(1, expr))` becomes `window.TT_BEAMER_RUNTIME_UTILS.clamp01(expr)`. Every `Math.max(0, Math.min(100, expr))` becomes `window.TT_BEAMER_RUNTIME_UTILS.clamp(0, 100, expr)`. The inner `expr` (e.g., `Number(state.audio.volume) || 0`) is preserved verbatim — this is the byte-identical-body rule applied to expression-level moves.
  - **`index.html` updates:** none.
  - **Pre-move verification:** `grep -nE "Math\.max\(0, Math\.min\(1," <each file>` enumerates current sites.
  - **Post-move verification:**
    - `node --check` clean for all touched files.
    - Boot smoke: trigger a sound-bearing animation; adjust master volume in System; adjust per-animation volume in Live Editor — sounds clamp at 0/1 / 0/100 the same way.
    - `git diff -w` shows only the clamp-pattern replacement.
  - **Adjacent smoke:** trigger an animation with sound, change `roomSoundVolumeInput` slider 0→100, observe sound volume tracks linearly.
  - **Commit message:** `refactor(24-3): replace Math.max/Math.min clamp patterns with runtime-utils.clamp/clamp01 — audio cluster`
  - **Rollback:** `git revert <hash>` restores inline patterns.

- [ ] **W3.1-C4 — Replace `Math.max(0, Math.min(1, …))` patterns — polygon-drag / slider-touch-guard group.**
  - **Files touched:**
    - `src/app/runtime/viewport/runtime-slider-touch-guard.js:94`.
    - `src/app/runtime/viewport/runtime-polygon-drag-support.js:216`.
    - `src/app/runtime/core/polygon-contract.js:7`.
  - **What moves:** same pattern → `clamp01`. RESEARCH §5 verified all three sites use the [0,1] range.
  - **`index.html` updates:** none.
  - **Pre-move verification:** `grep -nE "Math\.max\(0, Math\.min\(1," <each file>` enumerates sites.
  - **Post-move verification:**
    - `node --check` clean for all touched files.
    - Boot smoke: drag a polygon vertex (polygon-drag-support clamp), drag a slider with finger (slider-touch-guard clamp), open polygon-contract-using flow.
    - `git diff -w` shows only the clamp-pattern replacement.
  - **Adjacent smoke:** drag polygon vertex, edit room polygon, finger-drag any slider (Live Editor opacity).
  - **Commit message:** `refactor(24-3): replace Math.max/Math.min clamp patterns with runtime-utils.clamp01 — polygon-drag cluster`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.1-C5 — Replace `Math.max(0, Math.min(1, …))` patterns — animation-editor-view + animation-lifecycle group.**
  - **Files touched:**
    - `src/app/runtime/ui/animation-editor-view.js:1286, :1363` (two sites — both `opacity * intensity`).
    - `src/app/runtime/animation/runtime-animation-lifecycle.js:81-110` (10 inline clamps in slider handlers — RESEARCH §5 inventory; verify each before edit).
  - **What moves:** same pattern → `clamp01`. The 10 clamps in animation-lifecycle are inside Live Editor slider event-listeners wired during `init`; preserve the exact wiring shape — only the inner expression changes.
  - **`index.html` updates:** none.
  - **Pre-move verification:** `grep -nE "Math\.max\(0, Math\.min\(1," src/app/runtime/animation/runtime-animation-lifecycle.js` enumerates exactly 10 sites.
  - **Post-move verification:**
    - `node --check` clean for both files.
    - Boot smoke: open Live Editor on a running animation, drag opacity / intensity / speed sliders, observe values clamp at 0/1 the same way.
    - `git diff -w` shows only the clamp-pattern replacement.
  - **Adjacent smoke:** Live Editor full-flow regression — trigger animation, open editor, drag every slider, save, discard.
  - **Commit message:** `refactor(24-3): replace Math.max/Math.min clamp patterns with runtime-utils.clamp01 — editor + lifecycle cluster`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.1-C6 — Drop the duplicate zoom-anchor comment from orchestration.**
  - **Files touched:**
    - `src/app/runtime/runtime-orchestration.js` (lines 2410–2426 per Wave 2 INVENTORY post-edit positions; verify before edit).
  - **What moves:** the math derivation comment block at orchestration `:2410-2426`. RESEARCH §5 verified the *code* is single-source in `viewport-zoom.js:311-339`; orchestration only re-exposes via ctx-arrow at `:2486`. Wave 2 INVENTORY deferred this comment dedupe to Wave 3 explicitly. **Replace** the 17-line derivation block with a single-line breadcrumb pointing to viewport-zoom — e.g.
    ```javascript
    // Math derivation lives in runtime-viewport-zoom.js — single source of truth.
    ```
    Keep one line of comment to maintain the breadcrumb; Wave 4/5 may further normalize.
  - **What stays:** the comment in `runtime-viewport-zoom.js:307-323` is the canonical derivation. Do NOT touch it.
  - **`index.html` updates:** none.
  - **Pre-move verification:** `grep -nA20 "HF4 zoom-around-anchor" src/app/runtime/runtime-orchestration.js` shows the duplicated block.
  - **Post-move verification:**
    - `node --check src/app/runtime/runtime-orchestration.js` clean.
    - Boot smoke: `/` loads. Zoom in / out via wheel + pinch — `applyZoomScaleAroundClientPoint` is unchanged at the code level (only the comment shrinks).
    - **Primary gate (this is a near-comment-only edit, so the strong gate from Wave 2 §2 applies):**
      ```bash
      git diff <hash>~..<hash> -- 'src/**/*.js' \
        | grep -E '^[+-]' \
        | grep -v -E '^[+-]\s*(//|\*|/\*|\*/)' \
        | grep -v -E '^[+-]\s*$' \
        | grep -v -E '^(---|\+\+\+)\s'
      # → empty
      ```
  - **Adjacent smoke:** zoom + pan on a board.
  - **Commit message:** `refactor(24-3): drop duplicate zoom-anchor comment from orchestration (single source: viewport-zoom)`
  - **Rollback:** `git revert <hash>`.

**End-of-W3.1 gate:** abbreviated smoke (boot + cluster-pad fire + Live Editor slider + zoom). All 6 commits revertable independently.

---

### W3.2 — `runtime-projection-mapping.js` Split (MEDIUM risk; section-divider boundaries pre-marked by Wave 2)

**Goal:** 1945 lines → 5 sub-modules + a shim ≤300 lines. RESEARCH §4.1 mapping is the source of truth for source ranges; verify each range against the current file before extracting.

**Per-commit count:** ~6 (one per sub-module + shim cleanup).

**Estimated time:** 2–3 h.

**Commits:**

- [ ] **W3.2-C1 — Extract `runtime-projection-grid-state.js`.**
  - **Files touched:**
    - `src/app/runtime/viewport/runtime-projection-grid-state.js` (new file).
    - `src/app/runtime/viewport/runtime-projection-mapping.js` (delete moved blocks; convert to shim entry; calls grid-state via window-global).
    - `index.html` (insert new `<script>`).
  - **What moves:** RESEARCH §4.1 ranges 24–138 + 1834–1888 (grid data structure, helpers, persistence: `grid` const, `getPoint`, `setPoint`, `hasGridDisplacements`, `buildDefaultPoints`, `loadFromLocalStorage`, `saveToLocalStorage`, LS keys, undo stack — `pushUndo`, `undo`, `clearUndo`, `snapshotGridState`, `restoreGridSnapshot`, `MAX_UNDO`). Functions move byte-identically; only the surrounding IIFE wrapper and the namespace export at the end of the new file are added.
  - **Pattern:** new file follows the IIFE-with-window-globals pattern from §5 below. Namespace key: `window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE`. Exports: `init`, `grid`, `getPoint`, `setPoint`, `hasGridDisplacements`, `saveToLocalStorage`, `loadFromLocalStorage`, `pushUndo`, `undo`, `clearUndo`, `snapshotGridState`, `restoreGridSnapshot`, `LS_KEY_V2`, `LS_KEY_OLD`, `MAX_UNDO`, `getCorners`, `resetGrid`, `getGrid` (per RESEARCH §4.1 "External call surface").
  - **`index.html` updates:** insert
    ```html
    <script src="/src/app/runtime/viewport/runtime-projection-grid-state.js" defer></script>
    ```
    BEFORE line 871 (`/src/app/runtime/viewport/runtime-projection-mapping.js`). The shim stays at line 871; sub-modules occupy new consecutive lines just above.
  - **Pre-move verification:**
    - `wc -l src/app/runtime/viewport/runtime-projection-mapping.js` → 1945.
    - `grep -n "let grid\|const grid\|function getPoint\|function setPoint\|function hasGridDisplacements\|function buildDefaultPoints\|function loadFromLocalStorage\|function saveToLocalStorage\|function pushUndo\|function undo\|function clearUndo\|function snapshotGridState\|function restoreGridSnapshot\|LS_KEY_V2\|LS_KEY_OLD\|MAX_UNDO" src/app/runtime/viewport/runtime-projection-mapping.js` enumerates current line numbers; cross-reference RESEARCH §4.1 ranges.
    - In DevTools (pre-split): `Object.keys(window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING).sort()` — record (already done in Pre-flight Snapshot).
  - **Post-move verification:**
    - `node --check` clean on both files + `index.html` parsing OK (browser load).
    - **Byte-identical body check:** for each moved function, run
      ```bash
      git show HEAD~:src/app/runtime/viewport/runtime-projection-mapping.js | awk '/^function getPoint/,/^}/' > /tmp/before-getPoint
      git show HEAD:src/app/runtime/viewport/runtime-projection-grid-state.js | awk '/^function getPoint/,/^}/' > /tmp/after-getPoint
      diff -w /tmp/before-getPoint /tmp/after-getPoint
      # → empty (only indentation changes if any)
      ```
      Repeat per moved function. Exec convention: collect into a single helper script, run once for the commit's full move-set.
    - DevTools (post-split): `Object.keys(window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING).sort()` matches pre-split snapshot exactly. New: `Object.keys(window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE).sort()` returns the expected list above.
    - All grep call sites for the moved symbols still resolve (e.g., handle-ui code that calls `getPoint` now calls it via grid-state's window-global; the shim re-exposes for orchestration).
  - **Adjacent smoke (per RESEARCH §7 W3.2 list):** dashboard loads, `/output` loads, Align Mode toggle works, drag a corner handle (reads `grid` via getPoint), save+load profile.
  - **Closures over IIFE-local state — special attention:** the `grid` const is mutated by undo/load/save/applyGridPayload. RESEARCH §4.1 "Risk areas" warns: promote `grid` to grid-state's IIFE; sub-modules access via `gridState.getGrid()` / `gridState.getPoint()`. Do NOT keep a duplicate `grid` reference in the shim.
  - **Commit message:** `refactor(24-3): extract runtime-projection-grid-state.js from runtime-projection-mapping.js`
  - **Rollback:** `git revert <hash>` restores the original projection-mapping.js + removes the new file + removes the `<script>` tag. Cleanly revertable.

- [ ] **W3.2-C2 — Extract `runtime-projection-gl-renderer.js`.**
  - **Files touched:**
    - `src/app/runtime/viewport/runtime-projection-gl-renderer.js` (new).
    - `src/app/runtime/viewport/runtime-projection-mapping.js` (delete moved blocks).
    - `index.html` (one new `<script>`, BEFORE line 871).
  - **What moves:** RESEARCH §4.1 source range 159–405 (`_glCanvas...` block + `_initMeshWarpGL` + `_postDrawMeshWarpGL`). All `_gl*` private state moves with the GL functions (it's only touched here — RESEARCH §4.1 "Risk areas").
  - **Namespace:** `window.TT_BEAMER_RUNTIME_PROJECTION_GL_RENDERER`. Exports: `init`, `postDrawMeshWarpGL`, `tryInitGL`, `dropGL`. Imports `grid`/`getPoint` via `init({ getGrid: () => gridState.grid, getPoint: gridState.getPoint, ...deps })` from the shim.
  - **`index.html` updates:** insert immediately AFTER the grid-state line, BEFORE `runtime-projection-mapping.js`.
  - **Pre-move verification:** `grep -n "_initMeshWarpGL\|_postDrawMeshWarpGL\|_glCanvas\|_glInitOk" src/app/runtime/viewport/runtime-projection-mapping.js` enumerates current lines.
  - **Post-move verification:**
    - `node --check` clean.
    - Byte-identical body check per moved function.
    - DevTools: existing `runtime-projection-mapping`'s `postDrawMeshWarp` re-export still works (shim delegates to `glRenderer.postDrawMeshWarpGL` then falls back). `Object.keys` parity vs. pre-split.
  - **Adjacent smoke:** open `/output` with Align Mode displacement applied — WebGL mesh warp renders without seams. Toggle Align Mode → identity grid → fx-canvas displays directly with no GL overlay (RESEARCH §4.1 risk: `_warpTmp*` state vs `_gl*` state separation). Per ROADMAP §"`/output`": "Identity grid: fx-canvas displays directly, no GL overlay" + "No black borders / seams (WebGL mesh warp active when grid has displacement)".
  - **Closures-over-state special attention:** `_glCanvasOnStage`, `_glInitOk`, etc. — module-private to the new gl-renderer file; the 2D-fallback's `_warpTmpCanvas` does NOT travel here.
  - **Kernel-comment verification (per §7 lower table; same rigor as W3.5-C5):** the WebGL-fallback rationale at `runtime-projection-mapping.js:159-164` and the lean-GL-options rationale at `:197-201` MUST move with the gl-renderer code into `runtime-projection-gl-renderer.js`. Run:
    ```bash
    # WebGL fallback rationale
    grep -n "WebGL" src/app/runtime/viewport/runtime-projection-gl-renderer.js
    # Expected: 1 hit at the gl-renderer's GL-init guard region (top of the file's GL-setup block)

    # Lean GL options rationale
    grep -n "lean GL\|GL options\|antialias" src/app/runtime/viewport/runtime-projection-gl-renderer.js
    # Expected: 1 hit at the GL-context-creation options region

    # Confirm comments NO LONGER live in the original file
    grep -n "WebGL fallback\|lean GL options" src/app/runtime/viewport/runtime-projection-mapping.js
    # Expected: zero hits (comments traveled with the code)
    ```
    Use the kernel sentence fragment that's distinctive to each kernel; if the executor is unsure of the fragment, read Wave 2 INVENTORY for the verbatim text.
  - **Commit message:** `refactor(24-3): extract runtime-projection-gl-renderer.js from runtime-projection-mapping.js`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.2-C3 — Extract `runtime-projection-2d-fallback-renderer.js`.**
  - **Files touched:**
    - `src/app/runtime/viewport/runtime-projection-2d-fallback-renderer.js` (new).
    - `src/app/runtime/viewport/runtime-projection-mapping.js` (delete moved blocks).
    - `index.html`.
  - **What moves:** RESEARCH §4.1 source range 150–158 + 406–558 (2D-canvas per-triangle clip+drawImage path). `_warpTmpCanvas`, `_warpTmpCtx` private state moves with these functions.
  - **Namespace:** `window.TT_BEAMER_RUNTIME_PROJECTION_2D_FALLBACK_RENDERER`. Exports: `init`, `postDrawMeshWarp2D`. Imports `getGrid`/`getPoint` via init-ctx.
  - **`index.html` updates:** insert AFTER gl-renderer line, BEFORE `runtime-projection-mapping.js`.
  - **Pre/post-move verification:** as W3.2-C2.
  - **Adjacent smoke:** force the 2D fallback path (browser without WebGL or `_glInitOk=false`) and verify no seams (the well-documented WebGL-fallback rationale at projection-mapping:159-164 — Wave 2 INVENTORY entry C2.3). On a normal browser with WebGL, the 2D path is dormant; visual smoke confirms the GL output unchanged.
  - **Commit message:** `refactor(24-3): extract runtime-projection-2d-fallback-renderer.js`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.2-C4 — Extract `runtime-projection-handle-ui.js` (largest cut — ~1100 lines moved; may need 2 commits).**
  - **Files touched:**
    - `src/app/runtime/viewport/runtime-projection-handle-ui.js` (new).
    - `src/app/runtime/viewport/runtime-projection-mapping.js` (delete moved blocks).
    - `index.html`.
  - **What moves:** RESEARCH §4.1 source ranges 560–712 + 713–971 + 972–1102 + 1103–1347 + 1348–1410 + 1411–1482 + 1657–1790 + 1791–1820 (handle creation, drag, rotate, lines, context menu, grid-line add/remove, show/hide, align mode integration). Functions: `showHandles`, `hideHandles`, `rebuildHandleElements`, `positionHandles`, `positionRotateHandles`, `drawLines`, `onKeyDown`, plus all internal handle/line/rotate/pan drag state.
  - **Sub-split if too noisy:** if the single commit's diff exceeds review-friendly size, split into two commits along section-divider boundary at line ~1102 (handle creation + drag = C4a; rotate + lines + context menu + grid-line + show/hide = C4b).
  - **Namespace:** `window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI`. Exports per RESEARCH §4.1 list. Imports grid-state via init-ctx + a callback from main shim to trigger `applyTransform` / `renderRoomOverlay` (the shim's `applyTransform` stays in the shim — it's the small thin function that fires after handle drag).
  - **`index.html` updates:** insert AFTER 2D-fallback-renderer line, BEFORE `runtime-projection-mapping.js`.
  - **Pre/post-move verification:**
    - `drawLines` is in RESEARCH §3 inventory at 103 lines (under 150 — doesn't need internal split). After move, byte-identical body check applies.
    - DevTools: `Object.keys(window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI).sort()` returns the expected exports list.
  - **Adjacent smoke:** Align Mode toggle, drag intersection / line / corner / rotate handles, right-click context menu (add/remove line, save/load profile, reset). Per ROADMAP §"Align Mode" line 252–257.
  - **Closures special attention:** all handle drag state (drag-active flags, last-pointer coords, rotate-angle accumulators) is private to handle-ui's IIFE. Cross-module read of `applyTransform` is via init-ctx callback (shim provides).
  - **Commit message:** `refactor(24-3): extract runtime-projection-handle-ui.js from runtime-projection-mapping.js`
  - **Rollback:** `git revert <hash>`. (If sub-split into C4a+C4b, revert both.)

- [ ] **W3.2-C5 — Extract `runtime-projection-profile-persistence.js`.**
  - **Files touched:**
    - `src/app/runtime/viewport/runtime-projection-profile-persistence.js` (new).
    - `src/app/runtime/viewport/runtime-projection-mapping.js` (delete moved blocks).
    - `index.html`.
  - **What moves:** RESEARCH §4.1 source range 1483–1656 (server-side profile flows: `profileSaveFlow`, `profileLoadFlow`, `profileDeleteFlow`, `fetchProfileList`, `applyGridPayload`, `buildGridPayload`).
  - **Namespace:** `window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE`. Imports grid-state via init-ctx for `applyGridPayload`. The `localStorage` keys are NOT touched (still in grid-state); these are the *server-side* save/load flows (HTTP fetch).
  - **`index.html` updates:** insert AFTER handle-ui line, BEFORE `runtime-projection-mapping.js`.
  - **Pre/post-move verification:** as W3.2-C2.
  - **Adjacent smoke:** save a profile (server POST), load it back, delete it, list profiles. Per ROADMAP §"Align Mode" → "right-click context menu: ... save/load/delete profile".
  - **Public-API check:** the export-bundle JSON schema is NOT touched (per ROADMAP hard constraint). The HTTP request body shape is unchanged — only the function lives in a new file.
  - **Commit message:** `refactor(24-3): extract runtime-projection-profile-persistence.js`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.2-C6 — Shim cleanup of `runtime-projection-mapping.js`.**
  - **Files touched:**
    - `src/app/runtime/viewport/runtime-projection-mapping.js` (rewrite as shim).
  - **What stays in the shim (RESEARCH §4.1 "Proposed module breakdown" → SHIM line):** lines 1–22 (header), 139–149 (apply transform — small thin function), 1822–1832 (resize handling), 1890–1944 (legacy compat: `getCorners`, `loadCornersFromConfig`, `resetCorners`) + the shim's `init` that calls each sub-module's `init` in order + the public-API namespace assembly.
  - **What's deleted:** any blank/orphan lines left over from the 4 extractions.
  - **Public-API namespace shape (per shim recipe, §5 below):**
    ```javascript
    window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING = {
      init,
      applyTransform,
      showHandles: (...args) => handleUi.showHandles(...args),
      hideHandles: (...args) => handleUi.hideHandles(...args),
      onAlignModeChange: (...args) => handleUi.onAlignModeChange(...args),
      onWindowResize,
      resetCorners: () => gridState.resetGrid(),
      loadCornersFromConfig: () => {},  // legacy compat preserved
      getCornersForPersistence: () => /* legacy compat */,
      postDrawMeshWarp: (...args) => glRenderer.postDrawMeshWarpGL(...args)
                                  || fallback.postDrawMeshWarp2D(...args),
      remapPoint: handleUi.remapPoint,
      hasGridDisplacements: () => gridState.hasGridDisplacements(),
      getCorners: () => gridState.getCorners(),
      getGrid: () => gridState.getGrid(),
      resetGrid: () => gridState.resetGrid(),
    };
    ```
  - **Pre-move verification:** `wc -l src/app/runtime/viewport/runtime-projection-mapping.js` (current after C5) — record. Target: ≤300 lines after cleanup.
  - **Post-move verification:**
    - `node --check` clean.
    - **Critical: `Object.keys(window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING).sort()` matches pre-Wave-3 snapshot byte-for-byte.** Any key missing or added is a regression.
    - Boot smoke: `/`, `/output`, Align Mode, save/load profile, drag handles, fire animation through projection — full local feature set passes.
    - Orchestration's destructure at runtime-orchestration.js (the `const { applyTransform, showHandles, ... } = window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING` block) compiles and resolves all names.
  - **Adjacent smoke:** full ROADMAP §"Align Mode" + §"`/output`" subset.
  - **Commit message:** `refactor(24-3): re-export shell for runtime-projection-mapping (delegates to 5 sub-modules)`
  - **Rollback:** `git revert <hash>` reverses the shim rewrite. Combined with C1–C5 reverts, restores original 1945-line file.

**End-of-W3.2 gate:** abbreviated smoke (boot + Align Mode + projection rendering + save/load profile). All 6 commits revertable independently.

---

### W3.3 — `animation-editor-view.js` Split (MEDIUM risk; UI-only, no live-sync)

**Goal:** 1698 lines → 4 sub-modules + a shim. RESEARCH §4.2 mapping is the source of truth.

**Per-commit count:** ~5.

**Estimated time:** 1.5–2 h.

**Note on namespace key:** `window.TT_BEAMER_ANIMATION_EDITOR_VIEW` (skips the `RUNTIME` segment — RESEARCH §1 pitfall #1). Sub-modules likewise skip `RUNTIME` for consistency, OR they include `RUNTIME_` per the convention used by every other split. **Decision (planner):** sub-modules USE `RUNTIME_` prefix (`window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_SHELL`, etc.) because the sub-modules are new files with no legacy callers. The shim's namespace stays `TT_BEAMER_ANIMATION_EDITOR_VIEW` (legacy contract preserved). Orchestration's conditional guard `if (window.TT_BEAMER_ANIMATION_EDITOR_VIEW)` at orchestration:1937 must continue to resolve to truthy after split.

**Commits:**

- [ ] **W3.3-C1 — Extract `animation-editor-shell.js`.**
  - **Files touched:**
    - `src/app/runtime/ui/animation-editor-shell.js` (new).
    - `src/app/runtime/ui/animation-editor-view.js` (delete moved blocks).
    - `index.html`.
  - **What moves:** RESEARCH §4.2 functions: `init`, `bindDom`, `populateBoardSelect`, `isOpen`, `open`, `close`, `handleBack`, `flashDirtyBar`, `syncDirtyBar`, `getEditorBoardId`, `notifySelection`, `getSelection`, `onSelectionChange` (source ranges :40–229 + :1670–1688). Plus the module-private `state` object (scope, search, selectedIds, open, editorBoardId) and the `listeners` Set — these become shell-module-private. Sub-modules read via `getState()` / `getEditorBoardId()` getters.
  - **Namespace:** `window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_SHELL`. Exports: `init`, `getState`, `getEditorBoardId`, `setEditorBoardId`, `open`, `close`, `isOpen`, `getSelection`, `onSelectionChange`, `flashDirtyBar`, `syncDirtyBar`, `markDirty`, `notifySelection`, `populateBoardSelect`, `bindDom`, `handleBack`.
  - **`index.html` updates:** insert
    ```html
    <script src="/src/app/runtime/ui/animation-editor-shell.js" defer></script>
    ```
    BEFORE line 808 (`/src/app/runtime/ui/animation-editor-view.js`). The shim stays at line 808.
  - **Pre/post-move verification:** as W3.2-C1.
  - **Adjacent smoke:** open editor, switch board picker (uses `populateBoardSelect`), close editor, click Back.
  - **Commit message:** `refactor(24-3): extract animation-editor-shell.js from animation-editor-view.js`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.3-C2 — Extract `animation-editor-library-list.js`.**
  - **Files touched:**
    - `src/app/runtime/ui/animation-editor-library-list.js` (new).
    - `src/app/runtime/ui/animation-editor-view.js`.
    - `index.html`.
  - **What moves:** RESEARCH §4.2 functions: `collectAnimations`, `render`, `renderScopeTabs`, `renderList` (source ranges :230–263 + :1566–1669).
  - **Namespace:** `window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIBRARY_LIST`. Imports from shell: `getState`, `setSelection` callback. Imports from edit-pane (later C3): `renderPane` callback. Imports from live-preview (later C4): `renderPreview` callback. RESEARCH §4.2 "Risk areas" #2: mutual call patterns resolved via init-time callback wiring, not direct cross-imports. The library-list's `init({ shell, renderPane, renderPreview, ...deps })` accepts the callbacks; shim wires them at orchestration init time.
  - **`index.html` updates:** insert AFTER shell line, BEFORE `animation-editor-view.js`.
  - **Pre/post-move verification:** as W3.2-C1.
  - **Adjacent smoke:** open editor, switch scope tabs (room / inside / outside), select a different animation in the list — pane + preview re-render.
  - **Commit message:** `refactor(24-3): extract animation-editor-library-list.js`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.3-C3 — Extract `animation-editor-edit-pane.js` (largest cut).**
  - **Files touched:**
    - `src/app/runtime/ui/animation-editor-edit-pane.js` (new).
    - `src/app/runtime/ui/animation-editor-view.js`.
    - `index.html`.
  - **What moves:** RESEARCH §4.2 functions: `renderPane`, `buildHeader`, `scopeLabel`, `buildIdentityCard`, `buildDefaultsCard`, `getDefaultFields`, `buildSliderRow`, `buildToggleRow`, `buildColorCard`, `buildSourceCard`, `buildAssetPickerRow`, `buildSoundCard`, `buildSoundPickerRow`, `buildSelectRow`, `createAnimation`, `deleteAnimation`, `sanitizeName`, `findDefinition`, `patchAnimation`, `updatePaneDynamicBits` (source ranges :264–1021 + :1399–1565).
  - **Namespace:** `window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_EDIT_PANE`. Imports from shell: `getState`, `getEditorBoardId`, `markDirty`, `flashDirtyBar`. Imports from library-list: `renderList` callback (so an `applyAndRefresh` after a patch redraws the list).
  - **`index.html` updates:** insert AFTER library-list line, BEFORE `animation-editor-view.js`.
  - **Pre/post-move verification:**
    - **`buildSoundPickerRow` (139 lines) and `buildAssetPickerRow` (136 lines)** are at the edge of 150 (RESEARCH §3 100-149 inventory). Per RESEARCH §4.2 "Notes" + §3, the planner *may* pre-emptively extract per-asset-type branches into helpers — but Wave 3 hard rule is "MOVE not REWRITE". **Decision: do NOT split these in C3; defer to W3.6 if and only if the function-size scanner shows them ≥150 post-move. The current 136/139 readings are below 150, so no split needed.** If post-move readings unexpectedly exceed 150, that's a W3.6 task.
  - **Adjacent smoke:** open editor, edit a coded effect default (color picker, intensity slider), edit a GIF source picker, save (Apply).
  - **Commit message:** `refactor(24-3): extract animation-editor-edit-pane.js (largest cut)`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.3-C4 — Extract `animation-editor-live-preview.js`.**
  - **Files touched:**
    - `src/app/runtime/ui/animation-editor-live-preview.js` (new).
    - `src/app/runtime/ui/animation-editor-view.js`.
    - `index.html`.
  - **What moves:** RESEARCH §4.2 functions: `renderPreview`, `buildPreviewSwatch`, `startCodedPreview`, `stopCodedPreview`, `startGifPreview`, `toResourceUrl`, `buildPreviewMeta`, `formatAssetType`, `applyMediaPreviewProps`, `updatePreviewDynamicBits`, `buildPreviewMissingNotice` (source range :1022–1398).
  - **Namespace:** `window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIVE_PREVIEW`. Imports from shell: `getState`, `getEditorBoardId`. Reads `ctx.animEditorPreview` only.
  - **`index.html` updates:** insert AFTER edit-pane line, BEFORE `animation-editor-view.js`.
  - **Pre/post-move verification:** as W3.2-C1.
  - **Adjacent smoke:** open editor, switch animation in list — preview swatch updates; for GIF/MP4, preview media plays.
  - **Commit message:** `refactor(24-3): extract animation-editor-live-preview.js`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.3-C5 — Shim cleanup of `animation-editor-view.js`.**
  - **Files touched:**
    - `src/app/runtime/ui/animation-editor-view.js` (rewrite as shim).
  - **What stays in the shim:** the IIFE wrapper, the `init` that calls each sub-module's `init` in order with cross-callback wiring, the public namespace assembly:
    ```javascript
    window.TT_BEAMER_ANIMATION_EDITOR_VIEW = {
      init,
      open: shell.open,
      close: shell.close,
      isOpen: shell.isOpen,
      render: libraryList.render,
      getSelection: shell.getSelection,
      onSelectionChange: shell.onSelectionChange,
    };
    ```
    Per RESEARCH §4.2 "External call surface" → "shim".
  - **Init order for `animation-editor-view.shim.init`:**
    1. `shell.init(deps)` — creates module-private state.
    2. `libraryList.init({ ...deps, shell, renderPane: editPane.renderPane, renderPreview: livePreview.renderPreview })` — wires callbacks.
    3. `editPane.init({ ...deps, shell, renderList: libraryList.render })` — wires Apply→refresh callback.
    4. `livePreview.init({ ...deps, shell })` — read-only consumer.
  - **Pre-move verification:** `wc -l src/app/runtime/ui/animation-editor-view.js` (current) — record.
  - **Post-move verification:**
    - `node --check` clean.
    - **`Object.keys(window.TT_BEAMER_ANIMATION_EDITOR_VIEW).sort()` matches pre-Wave-3 snapshot byte-for-byte.**
    - **The orchestration conditional guard** at runtime-orchestration.js:1937 (`if (window.TT_BEAMER_ANIMATION_EDITOR_VIEW) { ... .init({ ... }); }`) still resolves to truthy and successfully runs `.init`.
  - **Adjacent smoke:** full editor flow — open, switch scope tabs, edit a coded effect default, watch preview swatch update, Apply, Discard, Back.
  - **Commit message:** `refactor(24-3): re-export shell for animation-editor-view (delegates to 4 sub-modules)`
  - **Rollback:** `git revert <hash>`.

**End-of-W3.3 gate:** abbreviated smoke (open editor, every scope tab, edit + Apply, edit + Discard, switch board picker). All 5 commits revertable.

---

### W3.4 — `runtime-animation-lifecycle.js` Split (HIGH risk; cluster pads + Live Editor + cluster dispatch)

**Goal:** 1369 lines → 5 sub-modules + a shim. RESEARCH §4.3 mapping is the source of truth. Highest pre-orchestration risk because cluster pads, Live Editor sliders, and cluster dispatch are deeply tied to runtime state and live-sync.

**Per-commit count:** 8 (C1 state, C2 stop-pipeline, C3a code-move + C3b decompose for live-editor, C4a code-move + C4b decompose for running-list, C5 cluster-pads, C6 shim).

**Estimated time:** 2–3 h.

**Special pre-flight risks per RESEARCH §9:**
- The rAF rail-tracker at `init` lines 23–52 must move with `cluster-pads` (not stay in the shim). Otherwise rail freezes silently.
- `liveEditorAnimationId` and `liveEditorSnapshot` are read by both `openLiveEditor` and slider event-handlers wired in `init`. Promote to lifecycle-state module; sub-modules access via getter/setter.
- `closeLiveEditor` is destructured externally at runtime-orchestration.js:2236. Shim must still export it.
- Cluster pad recent fix (commits d22be46, 5bc0121, a0112df, 8b7b452, 55edf2f at HEAD~5..HEAD) — this code is hot, treat with extra care.

**Commits:**

- [ ] **W3.4-C1 — Extract `runtime-lifecycle-state.js`.**
  - **Files touched:**
    - `src/app/runtime/animation/runtime-lifecycle-state.js` (new).
    - `src/app/runtime/animation/runtime-animation-lifecycle.js`.
    - `index.html`.
  - **What moves:** RESEARCH §4.3 — top-of-IIFE local state (`liveEditorAnimationId`, `liveEditorSnapshot`, `liveEditorDirty`); helpers `markLiveEditorDirty`, `applyLiveEditorValue`. Note: `applyLiveEditorValue` is referenced in the §4.3 inventory under both lifecycle-state AND lifecycle-live-editor; current location varies by file. **Decision:** the *helper* `applyLiveEditorValue` (the one called by slider listeners) lives in the **state** module because it mutates the editor state. The *slider-listener wiring* that *calls* `applyLiveEditorValue` stays in **live-editor** module (W3.4-C3a — code-move; the listener wiring travels with the live-editor extraction).
  - **Namespace:** `window.TT_BEAMER_RUNTIME_LIFECYCLE_STATE`. Exports: `init`, `getLiveEditorAnimationId`, `setLiveEditorAnimationId`, `getLiveEditorSnapshot`, `setLiveEditorSnapshot`, `isLiveEditorDirty`, `markLiveEditorDirty`, `clearLiveEditorDirty`, `applyLiveEditorValue`.
  - **`index.html` updates:** insert
    ```html
    <script src="/src/app/runtime/animation/runtime-lifecycle-state.js" defer></script>
    ```
    BEFORE line 838 (`/src/app/runtime/animation/runtime-animation-lifecycle.js`).
  - **Pre/post-move verification:** as W3.2-C1.
  - **Adjacent smoke:** trigger an animation, open Live Editor, drag opacity → drag persists across slider release. Drag → Discard → snapshot restored.
  - **Commit message:** `refactor(24-3): extract runtime-lifecycle-state.js from runtime-animation-lifecycle.js`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.4-C2 — Extract `runtime-lifecycle-stop-pipeline.js`.**
  - **Files touched:**
    - `src/app/runtime/animation/runtime-lifecycle-stop-pipeline.js` (new).
    - `src/app/runtime/animation/runtime-animation-lifecycle.js`.
    - `index.html`.
  - **What moves:** RESEARCH §4.3 functions: `collectAnimationStopIds`, `isStopPendingForAnimationId`, `markStopPending`, `clearStopPending`, `reconcileStopPendingFromSnapshot`, `buildStopCommandTargetMeta`, `emitStopAnimationCommand`, `stopAnimation` (source range :464–632).
  - **Namespace:** `window.TT_BEAMER_RUNTIME_LIFECYCLE_STOP_PIPELINE`. Imports `state.runningAnimations`, `liveSync`, `STOP_ANIMATION_MUTATION_TYPE` via init-ctx.
  - **`index.html` updates:** insert AFTER lifecycle-state line.
  - **Pre/post-move verification:** as W3.2-C1.
  - **Adjacent smoke:** trigger an animation, click Stop on the running list — stop emits via live-sync, animation removed from running list.
  - **Special-case verification:** the recent cluster-pad fix at d22be46 ("cluster pad — coded effects route via withPreviewCanvas") and 5bc0121 ("cluster pad — stop calls + multi-anim render via ctx-swap") touched stop-pipeline-adjacent code paths. After move, stop a cluster animation via cluster-pad Clear — verify the recent fix's behavior is preserved.
  - **Commit message:** `refactor(24-3): extract runtime-lifecycle-stop-pipeline.js`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.4-C3a — Extract `runtime-lifecycle-live-editor.js` (HIGH risk — code-move only; byte-identical bodies, no internal split).**
  - **Files touched:**
    - `src/app/runtime/animation/runtime-lifecycle-live-editor.js` (new).
    - `src/app/runtime/animation/runtime-animation-lifecycle.js`.
    - `index.html`.
  - **What moves:** RESEARCH §4.3 functions extracted **as-is, byte-identical**: `openLiveEditor` (174 lines — internal split deferred to C3b), `editAnimation`, `discardLiveEditor`, `closeLiveEditor` (102 lines). Plus the slider-event-listener wiring block at original lines 55–131 (which calls `applyLiveEditorValue` from state). Source range :147–462.
  - **Pattern:** code-move (extract-as-is). C3b will perform the function-decomposition.
  - **Namespace:** `window.TT_BEAMER_RUNTIME_LIFECYCLE_LIVE_EDITOR`. Imports from state: `getLiveEditorAnimationId`, `setLiveEditorAnimationId`, `getLiveEditorSnapshot`, `setLiveEditorSnapshot`, `markLiveEditorDirty`, `applyLiveEditorValue`. Imports `state.runningAnimations`, ctx DOM refs (liveEditorPanel, liveEditorOpacity, etc.), `clampRoom*`, `state` setters from board-profiles, via init-ctx.
  - **`index.html` updates:** insert AFTER stop-pipeline line.
  - **Special handling — slider event listeners:** the slider-listener wiring at original lines 55–131 (e.g., `ctx.liveEditorOpacity.addEventListener("input", ...)`) currently lives in the original module's `init`. After C3a, this wiring moves to live-editor's `init`. The handlers reference `applyLiveEditorValue` (from state module) and `clampRoom*` (from ctx). Verification: listener references resolve correctly and slider drag still updates the running animation in real time.
  - **Pre/post-move verification:**
    - `node --check` clean on both files.
    - **Byte-identical body check (whole-function level):** for each moved function, `git show HEAD~:<orig> | awk '/^function NAME/,/^}/' > /tmp/before` ; `git show HEAD:<new> | awk '/^function NAME/,/^}/' > /tmp/after` ; `diff -w /tmp/before /tmp/after` → empty. Repeat for `openLiveEditor`, `editAnimation`, `discardLiveEditor`, `closeLiveEditor`.
    - `Object.keys(window.TT_BEAMER_RUNTIME_LIFECYCLE_LIVE_EDITOR).sort()` returns the expected exports.
    - DevTools: open Live Editor on a running animation, drag every slider — every slider takes effect. Discard → all sliders restore. Save → values persist.
  - **Adjacent smoke:** ROADMAP §"Animations + dispatch" full subset.
  - **Commit message:** `refactor(24-3): extract runtime-lifecycle-live-editor.js (code-move; byte-identical, no internal split)`
  - **Rollback:** `git revert <hash>`. Reverts cleanly; restores the original animation-lifecycle.js content + removes the new file + removes the `<script>` tag.

- [ ] **W3.4-C3b — Decompose `openLiveEditor` (174 lines) into named helpers within `runtime-lifecycle-live-editor.js`.**
  - **Files touched:**
    - `src/app/runtime/animation/runtime-lifecycle-live-editor.js` (decompose function in place; no new files).
  - **Pattern:** function-decomposition. The file already exists (from C3a); this commit only adds named helpers and trims the outer shell.
  - **What moves:** the body of `openLiveEditor` (174 lines) splits into named helpers per RESEARCH §3:
    - `_buildLiveEditorSnapshot(animation)` — captures the animation's pre-edit state.
    - `_populateLiveEditorPanel(animation, snapshot)` — DOM population.
    - `_wireLiveEditorListeners(animation)` — attach listeners (per-open wiring, distinct from init-time wiring).
    - `_finalizeLiveEditorOpen(animation)` — final UI flag flips.
    - The body of `openLiveEditor` post-split delegates to the helpers in the same order. Byte-identical-body rule applied at the helper level (each helper's body matches the original sub-block byte-for-byte after `diff -w`).
  - **`index.html` updates:** none.
  - **Pre/post-move verification:**
    - `node --check` clean.
    - **Function-size check post-split:** `node /tmp/find-large-funcs2.js src/app/runtime/animation/runtime-lifecycle-live-editor.js` — `openLiveEditor` <150 AND every extracted helper <150.
    - **Byte-identical helper-body check:** for each helper, `awk '/^\s*function _NAME/,/^\s*}/'` extraction + `diff -w` against the corresponding sub-block in the C3a-state of `openLiveEditor`. Zero diff (modulo whitespace).
    - DevTools: open Live Editor — same behaviour as before C3b. Discard → snapshot restored. Save → persists.
  - **Adjacent smoke:** open Live Editor on coded effect + GIF + MP4 (all 3 asset types exercise different branches of `openLiveEditor`).
  - **Commit message:** `refactor(24-3): decompose openLiveEditor (174→<150) into 4 named helpers`
  - **Rollback:** `git revert <hash>`. Reverts cleanly to the C3a-state of the file (single 174-line `openLiveEditor`).

- [ ] **W3.4-C4a — Extract `runtime-lifecycle-running-list.js` (code-move only; byte-identical bodies, no internal split).**
  - **Files touched:**
    - `src/app/runtime/animation/runtime-lifecycle-running-list.js` (new).
    - `src/app/runtime/animation/runtime-animation-lifecycle.js`.
    - `index.html`.
  - **What moves:** RESEARCH §4.3 functions extracted **as-is, byte-identical**: `renderRunningAnimationsList` (369 lines — internal split deferred to C4b), `isRunningListInteractionActive`, `validateRunningListParity`, `refreshGlobalButtons`. Source ranges :719–1087, :1089–1142.
  - **Pattern:** code-move (extract-as-is). C4b will perform the function-decomposition.
  - **Namespace:** `window.TT_BEAMER_RUNTIME_LIFECYCLE_RUNNING_LIST`. Imports `runningAnimationsList` ref, `state`, `editAnimation` (from live-editor), `stopAnimation` (from stop-pipeline), `clampRoom*` via init-ctx.
  - **`index.html` updates:** insert AFTER live-editor line.
  - **Pre/post-move verification:**
    - `node --check` clean on both files.
    - **Byte-identical body check (whole-function level):** for each moved function, `awk '/^function NAME/,/^}/'` extraction from before/after + `diff -w` → empty. Repeat for `renderRunningAnimationsList`, `isRunningListInteractionActive`, `validateRunningListParity`, `refreshGlobalButtons`.
    - `Object.keys(window.TT_BEAMER_RUNTIME_LIFECYCLE_RUNNING_LIST).sort()` returns the expected exports.
    - DevTools: trigger animations, observe running list renders correctly; click Stop on a row; click Edit on a row.
  - **Adjacent smoke:** trigger 3 animations across scopes (room, inside, outside), running list shows 3 rows; click Stop on one — row removes, others remain.
  - **Commit message:** `refactor(24-3): extract runtime-lifecycle-running-list.js (code-move; byte-identical, no internal split)`
  - **Rollback:** `git revert <hash>`. Reverts cleanly; restores the original animation-lifecycle.js content.

- [ ] **W3.4-C4b — Decompose `renderRunningAnimationsList` (369 lines) into named per-row helpers.**
  - **Files touched:**
    - `src/app/runtime/animation/runtime-lifecycle-running-list.js` (decompose function in place; no new files).
  - **Pattern:** function-decomposition. The file already exists (from C4a); this commit only adds named helpers and trims the outer shell.
  - **What moves:** the body of `renderRunningAnimationsList` (369 lines) splits into named helpers per RESEARCH §3:
    - `_buildRunningRow(anim, ctx)` — DOM build for one row (~60–80 lines).
    - `_applyRunningRowState(row, anim)` — updates row classes/text per current animation state (~30–50 lines).
    - `_wireRunningRowListeners(row, anim)` — attach Stop button + Edit button listeners (~30 lines).
    - `_renderRunningRowsContainer(container, animations)` — outer loop body that iterates animations and calls the helpers above (~100 lines).
    - The body of `renderRunningAnimationsList` post-split delegates to helpers in the same order. Byte-identical-body rule at the helper level.
    - Target: `renderRunningAnimationsList` post-split is <150 lines (the outer-shell function); each extracted helper is <150.
  - **`index.html` updates:** none.
  - **Pre/post-move verification:**
    - `node --check` clean.
    - **Function-size check post-split:** `node /tmp/find-large-funcs2.js src/app/runtime/animation/runtime-lifecycle-running-list.js` — `renderRunningAnimationsList` <150 AND every extracted helper <150.
    - **Byte-identical helper-body check:** for each helper, `awk '/^\s*function _NAME/,/^\s*}/'` extraction + `diff -w` against the corresponding sub-block in the C4a-state of `renderRunningAnimationsList`. Zero diff (modulo whitespace).
    - DevTools: same behaviour as before C4b — trigger 3 animations, click Stop on each row, observe rows remove correctly. Click Edit, observe Live Editor opens.
  - **Adjacent smoke:** trigger 3 animations across scopes; click Stop on each; click Edit on one. Same as C4a's smoke — must produce identical user-visible behaviour.
  - **Commit message:** `refactor(24-3): decompose renderRunningAnimationsList (369→<150) into 4 per-row helpers`
  - **Rollback:** `git revert <hash>`. Reverts cleanly to the C4a-state of the file.

- [ ] **W3.4-C5 — Extract `runtime-lifecycle-cluster-pads.js` (the rAF tracker MUST move with this).**
  - **Files touched:**
    - `src/app/runtime/animation/runtime-lifecycle-cluster-pads.js` (new).
    - `src/app/runtime/animation/runtime-animation-lifecycle.js`.
    - `index.html`.
  - **What moves:** RESEARCH §4.3 functions: `updateClusterPadsRect`, `renderClusterPads` (100 lines, near edge but currently <150), `dispatchClusterByTapAction`, `dispatchClusterToggle`, `dispatchClusterClear` (source ranges :1164–1263, :1268–1349). **Plus the rAF rail-tracker registration at init lines 23–52** — RESEARCH §9 risk #6 + §4.3 "Risk areas" #1: this rAF must register inside cluster-pads' `init`, not stay in the shim. Otherwise rail freezes.
  - **Namespace:** `window.TT_BEAMER_RUNTIME_LIFECYCLE_CLUSTER_PADS`. Imports `state.runningAnimations`, `cluster-pads` DOM, `startRoomAnimationFromDraft`, `stopAnimation`, `getClusterTargetById`, `setRoomFxProfile`/`getRoomFxProfile` via init-ctx.
  - **`index.html` updates:** insert AFTER running-list line.
  - **Special verification — rAF registration:** before C5 lands, in DevTools, run
    ```javascript
    window.requestAnimationFrame.toString();
    ```
    (a sanity check that the function isn't shimmed). After C5 lands, panning the board moves the cluster pad rail in lockstep with the stage's left edge during pan (RESEARCH §4.3 risk #1 + Wave 2 INVENTORY C5.6 kernel: "the position:fixed cluster rail is synced to the stage's current screen rect on every tick + on resize").
  - **Recent cluster-pad fix verification:** commits d22be46, 5bc0121, a0112df, 8b7b452, 55edf2f — these touched cluster-pad routing, multi-anim rendering, type-aware toggle, dispatch tracing. After C5, run the recent regression scenarios:
    - Tap fire on cluster pad → fires across rooms + plays in pad.
    - Tap fire (already running) → stops only fire (type-aware toggle), scanning still runs.
    - Tap Clear → stops every cluster-scope animation.
    - Per ROADMAP §"Play areas + clusters" + §"Animations + dispatch" cluster lines.
  - **Pre/post-move verification:**
    - `node --check` clean.
    - DevTools: `Object.keys(window.TT_BEAMER_RUNTIME_LIFECYCLE_CLUSTER_PADS).sort()` returns expected.
    - Fire animation through cluster pad (pad receives and shows animation per d22be46 fix).
  - **Kernel-comment verification (per §7 lower table; same rigor as W3.5-C5):** the cluster-pads-rail rationale at `runtime-animation-lifecycle.js:1138-1143` ("the position:fixed cluster rail is synced to the stage's current screen rect on every tick + on resize") MUST move with the cluster-pads code into `runtime-lifecycle-cluster-pads.js`. Run:
    ```bash
    grep -n "position:fixed cluster rail\|synced to the stage" src/app/runtime/animation/runtime-lifecycle-cluster-pads.js
    # Expected: 1 hit at the rAF-tracker registration region (near `init`)

    # Confirm comment NO LONGER lives in the original shim
    grep -n "position:fixed cluster rail\|synced to the stage" src/app/runtime/animation/runtime-animation-lifecycle.js
    # Expected: zero hits (comment traveled with the code)
    ```
  - **Adjacent smoke:** create a cluster of N rooms, cluster pad appears in left rail; pan the board, rail glues to stage edge; tap fire → cluster animation fires + pad shows it; tap Clear → all cluster animations stop.
  - **Commit message:** `refactor(24-3): extract runtime-lifecycle-cluster-pads.js (incl. rAF rail-tracker)`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.4-C6 — Shim cleanup of `runtime-animation-lifecycle.js`.**
  - **Files touched:**
    - `src/app/runtime/animation/runtime-animation-lifecycle.js` (rewrite as shim).
  - **What stays in the shim:** the IIFE wrapper, the `init` that fans out to each sub-module's `init` in order, the public namespace assembly. Per current `:1351-1368` shape:
    ```javascript
    window.TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE = {
      init,
      collectAnimationStopIds: stopPipeline.collectAnimationStopIds,
      isStopPendingForAnimationId: stopPipeline.isStopPendingForAnimationId,
      markStopPending: stopPipeline.markStopPending,
      clearStopPending: stopPipeline.clearStopPending,
      reconcileStopPendingFromSnapshot: stopPipeline.reconcileStopPendingFromSnapshot,
      stopAnimation: stopPipeline.stopAnimation,
      openLiveEditor: liveEditor.openLiveEditor,
      editAnimation: liveEditor.editAnimation,
      closeLiveEditor: liveEditor.closeLiveEditor,    // <-- destructured externally at orchestration:2236
      discardLiveEditor: liveEditor.discardLiveEditor,
      renderRunningAnimationsList: runningList.renderRunningAnimationsList,
      isRunningListInteractionActive: runningList.isRunningListInteractionActive,
      refreshGlobalButtons: runningList.refreshGlobalButtons,
      validateRunningListParity: runningList.validateRunningListParity,
      updateClusterPadsRect: clusterPads.updateClusterPadsRect,
      renderClusterPads: clusterPads.renderClusterPads,
      dispatchClusterByTapAction: clusterPads.dispatchClusterByTapAction,
      dispatchClusterToggle: clusterPads.dispatchClusterToggle,
      dispatchClusterClear: clusterPads.dispatchClusterClear,
    };
    ```
    The actual key list MUST match the pre-Wave-3 snapshot byte-for-byte (re-verify the snapshot from pre-flight).
  - **Init order for the shim's `init`:**
    1. `lifecycleState.init(deps)` — establishes shared state.
    2. `stopPipeline.init({ ...deps, lifecycleState })`.
    3. `liveEditor.init({ ...deps, lifecycleState, stopPipeline })`.
    4. `runningList.init({ ...deps, editAnimation: liveEditor.editAnimation, stopAnimation: stopPipeline.stopAnimation })`.
    5. `clusterPads.init({ ...deps, lifecycleState, stopAnimation: stopPipeline.stopAnimation })` — registers the rAF.
  - **Pre-move verification:** `wc -l src/app/runtime/animation/runtime-animation-lifecycle.js` (current).
  - **Post-move verification:**
    - `node --check` clean.
    - **`Object.keys(window.TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE).sort()` matches pre-Wave-3 snapshot byte-for-byte.**
    - Orchestration's destructure at runtime-orchestration.js:2236 (`closeLiveEditor`) resolves correctly.
    - Boot smoke: full animation flow.
  - **Adjacent smoke:** end-of-W3.4 full smoke (next gate).
  - **Commit message:** `refactor(24-3): re-export shell for runtime-animation-lifecycle (delegates to 5 sub-modules)`
  - **Rollback:** `git revert <hash>`.

**End-of-W3.4 gate (high stakes — this sub-wave touches the most user-visible runtime code):**
- Trigger an animation in each scope (room, inside, outside, cluster) — every variant works.
- Open Live Editor, drag every slider, save, discard.
- Click cluster pad, Clear.
- Pan the board, cluster pad rail glues to stage edge.
- Multi-animation stacking in one room (per ROADMAP §"Animations + dispatch" line 230).
- Type-aware cluster toggle (per recent commit a0112df).

---

### W3.5 — `runtime-orchestration.js` Safer-Path Split (HIGHEST risk; SANCTIONED carve-out)

**Goal:** Per orchestrator pre-flight decision, take the **SAFER PATH** (RESEARCH §4.4 "Alternative" + §7 W3.5 "safer"): extract only the ctx-builder block + the 4 top-level functions into helper modules; rest stays as wire-up shell. ROADMAP exception clause "the orchestration wire-up which is allowed to be a re-export shell" sanctions this.

**4 top-level functions (verified at runtime-orchestration.js current state, 2026-04-25):**
- `function shouldSuppressRapidTap(actionKey, thresholdMs = 320)` — line 1149.
- `function createConditionalFieldMountSlot(field, anchorName)` — line 1514.
- `function setConditionalFieldMounted(slot, mounted)` — line 1528.
- `function deleteSelectedPolygonVertex()` — line 2510.

**Ctx-builder identification:** RESEARCH §4.4 references "ctx-builder block (`:2725-3022`)" — the giant payload assembled and passed to `BOOTSTRAP.init({...})` at line 2926 (verified). The "ctx-builder" is the dep-bag construction work spanning roughly lines 2725 (the wire-binder ctx for overlay-window-binders) through 3022 (the BOOTSTRAP.init payload close). However, the *cleanest extractable boundary* is the **BOOTSTRAP.init dep-bag** at lines 2926–3024 — a single contiguous object literal passed to one consumer. The 6 wire-binder ctx-bags above (at 2344, 2478, 2545, 2616, 2725, 2789) are *also* candidates, but they're each addressed to a *different* consumer with non-overlapping dep shapes, so they're harder to consolidate.

**Decision (planner, with RESEARCH §4.4 safer-path latitude):** extract the **BOOTSTRAP.init dep-bag** (lines 2926–3024, ~99 lines) AND the 4 top-level functions (~67 lines combined) into a new helper module. Result: orchestration drops from 3037 to **≤2925, expected ~2870** lines (math: 3037 − 99 BOOTSTRAP-bag + 3 replacement-call wrapper − 67 four-functions = ~2874). The 6 wire-binder ctx-bags stay in orchestration (they're inline assignments to function calls, not easy to lift without changing call shape). Residual ~2870 lines stays as the shim sanctioned by the ROADMAP exception. INVENTORY.md cites the exception clause when recording the residual.

**Per-commit count:** 5 (one per top-level function + one for ctx-builder).

**Estimated time:** 1.5–2 h.

**13 init-order kernels — preservation map for W3.5:**

The kernels stay in `runtime-orchestration.js` (the shim). None are touched by W3.5's commits because all 13 kernels live OUTSIDE the lines this sub-wave moves (1149, 1514, 1528, 2510 for the 4 functions; 2926–3024 for the ctx-builder). Verification per W3.5 commit: `grep -n "BOARDS is reassigned via" src/app/runtime/runtime-orchestration.js` continues to return a hit at the expected line. See §7 below for the full per-kernel preservation map.

**Commits:**

- [ ] **W3.5-C1 — Extract `runtime-orchestration-helpers.js` with 4 top-level functions.**
  - **Files touched:**
    - `src/app/runtime/runtime-orchestration-helpers.js` (new).
    - `src/app/runtime/runtime-orchestration.js` (delete moved blocks).
    - `index.html`.
  - **What moves:** the 4 top-level `function` declarations at lines 1149 (`shouldSuppressRapidTap`), 1514 (`createConditionalFieldMountSlot`), 1528 (`setConditionalFieldMounted`), 2510 (`deleteSelectedPolygonVertex`).
  - **Closure-over-orchestration-state risk:** RESEARCH §4.4 "Risk areas" #1: "The 4 top-level functions ... are closures over module-top destructures." Each function may reference symbols destructured at the top of orchestration. The executor MUST `grep` each function's body for non-local references before extracting. If any reference is found that resolves to an orchestration-scoped destructure, the helper module accepts those references via init-ctx. Concrete checks per function:
    - `shouldSuppressRapidTap` — likely uses a module-private `recentTapTimestamps` map or similar; check `grep -n` in surrounding orchestration scope. If found, move the map with the function.
    - `createConditionalFieldMountSlot` / `setConditionalFieldMounted` — DOM-touching helpers; likely reference `state` or DOM refs. Pass via init-ctx.
    - `deleteSelectedPolygonVertex` — references polygon-editor state, undo, room-geometry. Pass via init-ctx.
  - **Decision rule:** if a function closes over MORE than ~3 orchestration-scoped symbols, **do NOT extract it** — keep it in orchestration. Mark it as deferred to Wave 5 module-boundary cleanup. Note in INVENTORY.md "Decision-log".
  - **Namespace:** `window.TT_BEAMER_RUNTIME_ORCHESTRATION_HELPERS`. Exports: `init`, plus the 4 functions (or fewer, if any are deferred).
  - **`index.html` updates:** insert
    ```html
    <script src="/src/app/runtime/runtime-orchestration-helpers.js" defer></script>
    ```
    BEFORE line 881 (`/src/app/runtime/runtime-orchestration.js`). Helpers MUST load before orchestration.
  - **Pre-move verification:** `awk '/^function /{print NR":"$0}' src/app/runtime/runtime-orchestration.js` returns 4 entries at the expected lines.
  - **Post-move verification:**
    - `node --check` clean on both files.
    - Byte-identical body check per function.
    - In orchestration, the call sites of the 4 functions now reference `window.TT_BEAMER_RUNTIME_ORCHESTRATION_HELPERS.shouldSuppressRapidTap(...)` (or destructured at top: `const { shouldSuppressRapidTap, ... } = window.TT_BEAMER_RUNTIME_ORCHESTRATION_HELPERS;`).
    - Boot smoke: dashboard loads, every feature that exercises one of the 4 functions works (rapid-tap suppression on cluster pads, conditional-field mount in fx-panels, polygon vertex delete via Backspace key).
  - **Adjacent smoke:** trigger a rapid double-tap on a cluster pad (rapid-tap suppression). Open fx-panel, toggle a conditional field. Select a polygon vertex, press Backspace.
  - **Commit message:** `refactor(24-3): extract 4 top-level functions to runtime-orchestration-helpers.js`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.5-C2 — Extract `runtime-orchestration-ctx-builder.js` for the BOOTSTRAP.init dep-bag.**
  - **Files touched:**
    - `src/app/runtime/runtime-orchestration-ctx-builder.js` (new).
    - `src/app/runtime/runtime-orchestration.js` (replace inline BOOTSTRAP dep-bag with helper call).
    - `index.html`.
  - **What moves:** the BOOTSTRAP.init dep-bag construction at lines 2926–3024. The current shape is:
    ```javascript
    window.TT_BEAMER_RUNTIME_BOOTSTRAP.init({
      state, liveSync, logBootstrap, triggerFeedback, /* ... 95 keys total ... */
      buildAnimationSnapshotForLiveSync: (animation) => buildAnimationSnapshotForLiveSync(animation),
    });
    ```
    Post-extract, replace with:
    ```javascript
    window.TT_BEAMER_RUNTIME_BOOTSTRAP.init(
      window.TT_BEAMER_RUNTIME_ORCHESTRATION_CTX_BUILDER.buildBootstrapCtx({
        // pass all the orchestration-scoped refs the builder needs
        state, liveSync, logBootstrap, triggerFeedback, /* ... arrow-bound refs ... */
      })
    );
    ```
    The new `buildBootstrapCtx(refs)` function takes the orchestration-scoped refs and returns the 95-key object literal byte-identical to the original. Body of the returned object is byte-identical to the original `:2926-3024` content; only the surrounding "passed args" wrapper is new.
  - **Closure risk:** the dep-bag references many destructured symbols from orchestration scope. The cleanest extraction passes ALL referenced symbols as args to `buildBootstrapCtx`. **The executor MUST enumerate every distinct identifier referenced inside the `:2926-3024` block** (via grep + manual review) and accept them as args. If the arg list exceeds ~50 entries, the extraction *still works* but is verbose; that's OK — Wave 3 doesn't optimize for elegance, only for size.
  - **Namespace:** `window.TT_BEAMER_RUNTIME_ORCHESTRATION_CTX_BUILDER`. Exports: `buildBootstrapCtx(refs)`.
  - **`index.html` updates:** insert
    ```html
    <script src="/src/app/runtime/runtime-orchestration-ctx-builder.js" defer></script>
    ```
    AFTER `runtime-orchestration-helpers.js` (W3.5-C1's line), BEFORE `runtime-orchestration.js`.
  - **Pre-move verification:** `sed -n '2926,3024p' src/app/runtime/runtime-orchestration.js` shows the dep-bag block. Count keys: `grep -cE '^\s+[a-zA-Z_]+:' <bag>` ≈ 95.
  - **Arrow-pattern handling note:** the BOOTSTRAP dep-bag in orchestration uses `(args) => fn(args)` arrow-wrappers for many entries (e.g., `buildAnimationSnapshotForLiveSync: (animation) => buildAnimationSnapshotForLiveSync(animation)`). When the dep-bag is extracted to the ctx-builder helper, these arrow-wrappers MUST be **re-created as arrows** in the helper (NOT reduced to direct function refs). Rationale: arrow wrappers and direct refs differ only when the underlying name is reassigned post-init, but preserving arrows is the trivially safe choice — it maintains byte-identical semantics for the byte-identical-body conformance check. Convert direct refs only if the executor has *positively* verified the underlying name is never reassigned.
  - **Post-move verification:**
    - `node --check` clean.
    - **Critical: the BOOTSTRAP module receives a dep-bag with byte-identical key/value content.** Verification: in DevTools, post-boot, inspect a few BOOTSTRAP-side ctx accesses (e.g., `ctx.state`, `ctx.liveSync`, `ctx.draw`) — they resolve to the same references as before.
    - **Content-level diff command (because standard `git diff -w` shows the wrapper function as new code, masking the "only relocation" property):**
      ```bash
      # Capture the dep-bag content from BEFORE (last commit before W3.5-C2)
      BEFORE_FILE=$(git rev-parse HEAD~):src/app/runtime/runtime-orchestration.js
      git show "$BEFORE_FILE" | awk '/window\.TT_BEAMER_RUNTIME_BOOTSTRAP\.init\(\{/,/^\s*\}\);$/' \
        | sed -e '1d' -e '$d' \
        > /tmp/before-bag.txt

      # Capture the dep-bag content from AFTER (the body of buildBootstrapCtx's return)
      awk '/return \{$/,/^\s*\};$/' src/app/runtime/runtime-orchestration-ctx-builder.js \
        | sed -e '1d' -e '$d' \
        > /tmp/after-bag.txt

      # Whitespace-tolerant diff on the dep-bag body content
      diff -w /tmp/before-bag.txt /tmp/after-bag.txt
      # Expected: zero diff (modulo whitespace) on the dep-bag content. Any non-whitespace diff = body drift, revert and re-extract.
      ```
      Adjust the `awk` patterns to match the actual code shape if the wrapper function body is structured differently (e.g., `function buildBootstrapCtx(refs) { return { ... }; }` vs an arrow form). The intent is: extract just the key:value pairs from before and after, diff them, expect zero non-whitespace difference.
    - Boot smoke: full BOOTSTRAP-driven flow runs. `Status: Ready` appears.
    - **`Object.keys` snapshot of every other namespace unchanged.**
  - **Adjacent smoke:** full boot + first interaction (board switch, animation trigger).
  - **Commit message:** `refactor(24-3): extract BOOTSTRAP.init ctx-builder to runtime-orchestration-ctx-builder.js`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.5-C3 — (Optional) Extract one of the 6 wire-binder ctx-bags if the orchestration residual is still uncomfortably large.**
  - **Decision criterion:** if W3.5-C1 + W3.5-C2 leave orchestration <2500 lines, SKIP this commit. If still >2500, extract the largest of the 6 wire-binder ctx-bags (likely `wireFxPanelBinders` at line 2616).
  - **Files touched:** if executed: `src/app/runtime/runtime-orchestration-ctx-builder.js` (extend), `runtime-orchestration.js`.
  - **Commit message:** `refactor(24-3): lift wireFxPanelBinders ctx-bag into ctx-builder helper`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.5-C4 — Verify residual orchestration size + record in INVENTORY.md.**
  - **Files touched:** none (this is a verification-only "commit" — actually a step in the W3.5-C2 commit, not a separate commit; included here to make the verification explicit). NO COMMIT lands for this step; it's a checklist item folded into W3.5-C3 (or C2 if C3 skipped).
  - **Verification:**
    ```bash
    wc -l src/app/runtime/runtime-orchestration.js
    # Expected: ≤2925, expected ~2870 (after C1+C2; 3037 − 99 BOOTSTRAP-bag + 3 replacement − 67 four-functions = ~2874) OR ~2770 (after C3 if executed)
    ```
  - Record the residual in INVENTORY.md "Final file-size table" with the note: "Sanctioned by ROADMAP §Wave 3 Acceptance: 'excluding the orchestration wire-up which is allowed to be a re-export shell'."

- [ ] **W3.5-C5 — Init-order kernel verification commit (verification only — no code change).**
  - **Files touched:** none — INVENTORY.md only.
  - **What this is:** a verification step (NOT a code commit) where the executor re-runs the Wave 2 INVENTORY pre-C1 sweep grep to confirm all 13 kernels are still in `runtime-orchestration.js` at their expected line ranges. RESEARCH §1 enumerates the 13 kernels (8 + 5) and Wave 2 INVENTORY records the verbatim text. Executor:
    1. For each of the 13 kernels (per §7 below), run `grep -n "<kernel-snippet>" src/app/runtime/runtime-orchestration.js` and verify the hit count is exactly 1 (or 0 if the kernel's host code moved to a sub-module — see §7 mapping).
    2. If any kernel is missing, the W3.5-C1/C2 extraction broke it; revert the offending commit and re-extract more carefully.
    3. Record verification log in INVENTORY.md "Init-order kernels preserved" section: 13 entries with kernel sentence + new line number + "verified" mark.

**End-of-W3.5 gate (this is the make-or-break moment):**
- **Full ROADMAP regression checklist** (ROADMAP lines 203–275). ~10–15 min manual smoke. Every section: Boards & rooms, Play areas + clusters, Animations + dispatch, Tap-Action, `/output`, Align Mode, Theme + UI, Sounds, Export / Import, Live-sync.
- INVENTORY.md updated with kernel-preservation log + residual orchestration size (target **≤2925, expected ~2870**; INVENTORY.md skeleton records the actual residual post-W3.5-C2).

---

### W3.6 — Secondaries + Function Decomposition (final cleanup)

**Goal:**
1. Bring all 5 unnamed >800-line files under 800 (fx-panels 985, wire-room-audio-binders 924, wire-fx-panel-binders 923, polygon-editor 846, draw-loop 836).
2. Split every remaining function ≥150 lines from RESEARCH §3 inventory.
3. Decompose 100–149-line functions if and only if the post-W3.4 file size demands it (most won't).

**Per-commit count:** 12 (C1 fx-panels split, C2 wire-room-audio split, C3 wire-fx-panel split, C4 startRoomAnimationFromDraft decompose, C5a wireOverlayWindowBinders decompose, C5b wirePolygonEditorBinders decompose, C5c wireStageGestureBinders decompose, C6 collectDomRefs decompose, C7 initializeApplication decompose, C8 decodeGifPlaybackFramesWithParser decompose, C9 polygon-editor split, C10 draw-loop split). C5 was split into C5a/C5b/C5c per checker BLOCKER (one logical refactor per commit, §1 hard rule).

**Estimated time:** 2.5–3.5 h.

**Function-size inventory (RESEARCH §3, MUST-split list ≥150 lines, after accounting for splits already done in W3.3 and W3.4):**

| Function | File:Lines | Lines | Status post W3.1–W3.5 | W3.6 task |
|----------|------------|------:|-----------------------|-----------|
| `wireFxPanelBinders` | `runtime-wire-fx-panel-binders.js:8-905` | 898 | not split | W3.6-C1 |
| `wireRoomAudioBinders` | `runtime-wire-room-audio-binders.js:10-919` | 910 | not split | W3.6-C2 |
| `startRoomAnimationFromDraft` | `runtime-room-dispatch.js:17-653` | 637 | not split | W3.6-C3 |
| `wireOverlayWindowBinders` | `runtime-wire-overlay-window-binders.js:9-533` | 525 | not split | W3.6-C5a |
| `wirePolygonEditorBinders` | `runtime-wire-polygon-editor-binders.js:8-454` | 447 | not split | W3.6-C5b |
| `wireStageGestureBinders` | `runtime-wire-stage-gesture-binders.js:8-404` | 397 | not split | W3.6-C5c |
| `renderRunningAnimationsList` | `runtime-animation-lifecycle.js → lifecycle-running-list.js` | 369 | **DONE in W3.4-C4a (code-move) + C4b (decompose)** | n/a |
| `collectDomRefs` | `runtime-dom-refs.js:7-304` | 298 | not split | W3.6-C6 |
| `syncRoomFxPanel` | `runtime-fx-panels.js:436-626` | 191 | not split | W3.6-C1 (folded — fx-panels file split addresses this) |
| `initializeApplication` | `runtime-bootstrap.js:71-258` | 188 | not split | W3.6-C7 |
| `decodeGifPlaybackFramesWithParser` | `runtime-gif-decoder.js:191-366` | 176 | not split | W3.6-C8 |
| `openLiveEditor` | `runtime-animation-lifecycle.js → lifecycle-live-editor.js` | 174 | **DONE in W3.4-C3a (code-move) + C3b (decompose)** | n/a |
| `renderPolygonEditorHandles` | `runtime-polygon-editor.js:270-440` | 171 | not split | W3.6-C9 (folded — polygon-editor split addresses) |
| `renderShipPolygonEditorHandles` | `runtime-polygon-editor.js:89-247` | 159 | not split | W3.6-C9 (folded) |

**Commits:**

- [ ] **W3.6-C1 — Split `runtime-fx-panels.js` (985 lines) into 2 sub-modules + shim, addressing `syncRoomFxPanel` (191 lines).**
  - **Files touched:**
    - `src/app/runtime/panels/runtime-fx-panels-room.js` (new).
    - `src/app/runtime/panels/runtime-fx-panels-inside-outside.js` (new).
    - `src/app/runtime/panels/runtime-fx-panels.js` (shim).
    - `index.html`.
  - **What moves:** room-specific fx-panel functions including `syncRoomFxPanel` go to `runtime-fx-panels-room.js`; inside/outside fx-panel functions go to `runtime-fx-panels-inside-outside.js`. The shim aggregates per the recipe in §5.

  - **Explicit 28-key shim namespace mapping** (verified against `src/app/runtime/panels/runtime-fx-panels.js:955-984` public surface — actual count breaks down as 1 init + 7 inside + 6 room + 14 outside, NOT the rough estimate suggested in plan-checker; no misc bucket needed):

    | # | Namespace key | Target sub-module |
    |--:|---------------|-------------------|
    | 1 | `init` | shim (fans out to room-init + inside-outside-init) |
    | 2 | `syncOutsideModeDirectionVisibility` | `runtime-fx-panels-inside-outside.js` |
    | 3 | `buildInsideProfileWithSelectedAnimationPatch` | `runtime-fx-panels-inside-outside.js` |
    | 4 | `syncInsideResourcePicker` | `runtime-fx-panels-inside-outside.js` |
    | 5 | `getInsideEditorDraft` | `runtime-fx-panels-inside-outside.js` |
    | 6 | `setInsideEditorDraft` | `runtime-fx-panels-inside-outside.js` |
    | 7 | `collectInsideEditorDraftFromInputs` | `runtime-fx-panels-inside-outside.js` |
    | 8 | `syncInsideFxPanel` | `runtime-fx-panels-inside-outside.js` |
    | 9 | `renderInsideGlobalButtons` | `runtime-fx-panels-inside-outside.js` |
    | 10 | `getRoomAnimationLabelById` | `runtime-fx-panels-room.js` |
    | 11 | `syncRoomResourcePicker` | `runtime-fx-panels-room.js` |
    | 12 | `getRoomEditorDraft` | `runtime-fx-panels-room.js` |
    | 13 | `setRoomEditorDraft` | `runtime-fx-panels-room.js` |
    | 14 | `collectRoomEditorDraftFromInputs` | `runtime-fx-panels-room.js` |
    | 15 | `syncRoomFxPanel` | `runtime-fx-panels-room.js` (subject of internal split — see below) |
    | 16 | `buildOutsideProfileWithSelectedAnimationPatch` | `runtime-fx-panels-inside-outside.js` |
    | 17 | `syncOutsideResourcePicker` | `runtime-fx-panels-inside-outside.js` |
    | 18 | `loadOutsideResourceAssets` | `runtime-fx-panels-inside-outside.js` |
    | 19 | `getOutsideEditorDraft` | `runtime-fx-panels-inside-outside.js` |
    | 20 | `setOutsideEditorDraft` | `runtime-fx-panels-inside-outside.js` |
    | 21 | `collectOutsideEditorDraftFromInputs` | `runtime-fx-panels-inside-outside.js` |
    | 22 | `syncOutsideDraftVisibilityFromInputs` | `runtime-fx-panels-inside-outside.js` |
    | 23 | `syncOutsideFxPanel` | `runtime-fx-panels-inside-outside.js` |
    | 24 | `findOutsideGlobalAnimation` | `runtime-fx-panels-inside-outside.js` |
    | 25 | `syncOutsideRuntimeMirror` | `runtime-fx-panels-inside-outside.js` |
    | 26 | `getOutsideEditingAnimationId` | `runtime-fx-panels-inside-outside.js` |
    | 27 | `setOutsideEditingAnimationId` | `runtime-fx-panels-inside-outside.js` |
    | 28 | `renderOutsideGlobalButtons` | `runtime-fx-panels-inside-outside.js` |

    Shim aggregation pattern (per §5):

    ```javascript
    const room = window.TT_BEAMER_RUNTIME_FX_PANELS_ROOM;
    const insideOutside = window.TT_BEAMER_RUNTIME_FX_PANELS_INSIDE_OUTSIDE;
    function init(deps) {
      room.init(deps);
      insideOutside.init(deps);
    }
    window.TT_BEAMER_RUNTIME_FX_PANELS = {
      init,
      // inside-* (7 keys) + outside-* (14 keys) — both groups live in the inside-outside sub-module
      syncOutsideModeDirectionVisibility: insideOutside.syncOutsideModeDirectionVisibility,
      buildInsideProfileWithSelectedAnimationPatch: insideOutside.buildInsideProfileWithSelectedAnimationPatch,
      // ... (all 7 inside-* + 14 outside-* keys delegated to insideOutside)
      // room-* (6 keys) — live in the room sub-module
      getRoomAnimationLabelById: room.getRoomAnimationLabelById,
      syncRoomResourcePicker: room.syncRoomResourcePicker,
      getRoomEditorDraft: room.getRoomEditorDraft,
      setRoomEditorDraft: room.setRoomEditorDraft,
      collectRoomEditorDraftFromInputs: room.collectRoomEditorDraftFromInputs,
      syncRoomFxPanel: room.syncRoomFxPanel,
    };
    ```

    **Pre-commit verification of the key list:** `Object.keys(window.TT_BEAMER_RUNTIME_FX_PANELS).sort()` post-split MUST byte-for-byte match the pre-split snapshot of 28 keys.

    **Naming note:** the namespace key in source is `TT_BEAMER_RUNTIME_FX_PANELS` (not `TT_BEAMER_RUNTIME_RUNTIME_FX_PANELS`); the sub-module names follow the `RUNTIME_FX_PANELS_ROOM` and `RUNTIME_FX_PANELS_INSIDE_OUTSIDE` convention from §5.
  - **`syncRoomFxPanel` 191-line internal split:** extract per-section helpers (`_renderRoomFxIdentitySection`, `_renderRoomFxColorSection`, `_renderRoomFxSourceSection`, `_renderRoomFxSoundSection`, `_renderRoomFxConditionalFields`). Body of `syncRoomFxPanel` post-split delegates to helpers in same order. Each helper <150 lines.
  - **`index.html` updates:** insert sub-module `<script>` tags BEFORE line 841 (`/src/app/runtime/panels/runtime-fx-panels.js`).
  - **Pre/post-move verification:** as W3.2-C1.
  - **Kernel-comment verification (per §7 lower table; same rigor as W3.5-C5):** the separate-editing/playing-state rationale at `runtime-fx-panels.js:16-20` MUST move with the room fx-panel code into `runtime-fx-panels-room.js` (per §7 mapping). Run:
    ```bash
    grep -n "separate editing\|editing.*playing\|edit state.*play state" src/app/runtime/panels/runtime-fx-panels-room.js
    # Expected: 1 hit at the top of the room-fx-panel state block (near the editing/playing state declarations)

    # Confirm comment NO LONGER lives in the shim
    grep -n "separate editing\|editing.*playing" src/app/runtime/panels/runtime-fx-panels.js
    # Expected: zero hits (comment traveled with the code)
    ```
    Use the verbatim kernel sentence from Wave 2 INVENTORY if the fragment match is ambiguous.
  - **Adjacent smoke:** open fx-panel for a room, edit color / source / sound — every section renders + persists. Repeat for inside / outside.
  - **Commit message:** `refactor(24-3): split runtime-fx-panels.js (985→<800) and decompose syncRoomFxPanel`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.6-C2 — Split `runtime-wire-room-audio-binders.js` (924 lines) by topical group.**
  - **Files touched:**
    - `src/app/runtime/wire/runtime-wire-room-audio-binders-volume.js` (new).
    - `src/app/runtime/wire/runtime-wire-room-audio-binders-source.js` (new).
    - `src/app/runtime/wire/runtime-wire-room-audio-binders-effects.js` (new).
    - `src/app/runtime/wire/runtime-wire-room-audio-binders.js` (shim).
    - `index.html`.
  - **What moves:** the mega `wireRoomAudioBinders(ctx)` (910 lines) splits into topical sub-binder calls invoked by the shim's `wireRoomAudioBinders` wrapper. **Important:** wire-binders use the `wireXxxBinders(ctx)` entry-point pattern (NOT `init({ctx})`) — RESEARCH §1 + §9 #10. The shim's wrapper preserves this:
    ```javascript
    window.TT_BEAMER_RUNTIME_WIRE_ROOM_AUDIO_BINDERS = {
      wireRoomAudioBinders: (ctx) => {
        window.TT_BEAMER_RUNTIME_WIRE_ROOM_AUDIO_BINDERS_VOLUME.wireRoomAudioBindersVolume(ctx);
        window.TT_BEAMER_RUNTIME_WIRE_ROOM_AUDIO_BINDERS_SOURCE.wireRoomAudioBindersSource(ctx);
        window.TT_BEAMER_RUNTIME_WIRE_ROOM_AUDIO_BINDERS_EFFECTS.wireRoomAudioBindersEffects(ctx);
      },
    };
    ```
    Each sub-binder file is its own IIFE exposing one `wireXxxBindersTopic(ctx)` function. NO `init({ctx})` introduced.
  - **Topical groupings:** volume sliders + master volume; source pickers (asset selection); effect-related bindings (loop, one-shot, gain).
  - **`index.html` updates:** insert sub-binder `<script>` tags BEFORE line 865 (`/src/app/runtime/wire/runtime-wire-room-audio-binders.js`).
  - **Pre/post-move verification:** as W3.2-C1. Plus: `grep -n "wireRoomAudioBinders" src/` returns exactly the orchestration call site at runtime-orchestration.js:2789 (or wherever current line) — orchestration's call shape unchanged.
  - **Adjacent smoke:** ROADMAP §"Sounds" — Animation with sound plays sound on start; Per-animation volume in Live Editor; Master volume + global enable in System.
  - **Commit message:** `refactor(24-3): split wireRoomAudioBinders (910 lines) into 3 topical wire-binder modules`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.6-C3 — Split `wireFxPanelBinders` (898 lines) into topical groups.**
  - **Files touched:**
    - `src/app/runtime/wire/runtime-wire-fx-panel-binders-room.js` (new).
    - `src/app/runtime/wire/runtime-wire-fx-panel-binders-inside.js` (new).
    - `src/app/runtime/wire/runtime-wire-fx-panel-binders-outside.js` (new).
    - `src/app/runtime/wire/runtime-wire-fx-panel-binders.js` (shim).
    - `index.html`.
  - **What moves:** topical groupings of fx-panel binders by scope (room / inside / outside). Wire-binder pattern preserved (no `init({ctx})` introduced).
  - **`index.html` updates:** insert sub-binder `<script>` tags BEFORE line 863 (`/src/app/runtime/wire/runtime-wire-fx-panel-binders.js`).
  - **Pre/post-move verification:** as W3.6-C2.
  - **Adjacent smoke:** open every fx-panel scope (room, inside, outside), edit one field per panel, confirm dirty-flag behaviour (Wave 2 INVENTORY C2.4 kernel: "optimistic local apply + persist on broadcast-snapshot fields so the dirty flag fires").
  - **Commit message:** `refactor(24-3): split wireFxPanelBinders (898 lines) into 3 scope-topical wire-binder modules`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.6-C4 — Split `startRoomAnimationFromDraft` (637 lines) into named helpers within `runtime-room-dispatch.js`.**
  - **Files touched:**
    - `src/app/runtime/animation/runtime-room-dispatch.js` (extract helpers; file stays at <800 currently — 659 lines).
  - **What moves:** the 637-line function body splits into 5–7 named helpers per validation step / dispatch phase. RESEARCH §3 + RESEARCH §7 W3.6-C3 describes the approach. Suggested helper boundaries (executor verifies against actual function structure):
    - `_validateAnimationDraft(draft)` — input validation.
    - `_resolveAnimationProfile(draft, board)` — profile lookup + merge.
    - `_assembleRunningAnimation(draft, profile)` — runtime instance construction.
    - `_emitDispatchLiveSync(animation)` — live-sync emit.
    - `_finalizeDispatchSideEffects(animation)` — DOM + audio + render-list updates.
    - The body of `startRoomAnimationFromDraft` post-split delegates to helpers in the same order. Byte-identical body content at the helper level. Function shell post-split <150 lines.
  - **`index.html` updates:** none — same file.
  - **Pre/post-move verification:**
    - `node --check` clean.
    - Function-size scanner: `startRoomAnimationFromDraft` <150 AND every extracted helper <150.
    - Byte-identical body check at helper level.
  - **Adjacent smoke:** trigger a coded animation, GIF animation, MP4 animation — each dispatches successfully through the new helpers. ROADMAP §"Animations + dispatch" full subset.
  - **Commit message:** `refactor(24-3): decompose startRoomAnimationFromDraft (637→<150) into named dispatch-phase helpers`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.6-C5a — Decompose `wireOverlayWindowBinders` (525 lines) into named helpers.**
  - **Files touched:**
    - `src/app/runtime/wire/runtime-wire-overlay-window-binders.js` (533 lines total — decompose function in place; file stays under 800).
    - `index.html` (script-order verification only — no edits expected).
  - **What moves:** the 525-line `wireOverlayWindowBinders(ctx)` body splits into named helpers per topical area (e.g., `_wireOverlayWindowOpenClose`, `_wireOverlayWindowResize`, `_wireOverlayWindowDrag`, `_wireOverlayWindowZIndex`). Per-helper ≤150 lines. The function's outer shell delegates to helpers in same order. **No new files** — file size stays within budget; only function size shrinks.
  - **`index.html` updates:** none expected. Per Issue #8 verification, run the `<script>`-order grep post-edit to confirm no tag was reordered.
  - **Pre-move verification:**
    - `grep -n "function wireOverlayWindowBinders" src/app/runtime/wire/runtime-wire-overlay-window-binders.js` returns exactly 1 hit.
    - `node /tmp/find-large-funcs2.js src/app/runtime/wire/runtime-wire-overlay-window-binders.js` shows `wireOverlayWindowBinders` at 525 lines.
  - **Post-move verification:**
    - `node --check src/app/runtime/wire/runtime-wire-overlay-window-binders.js` exits 0.
    - Function-size scanner: `wireOverlayWindowBinders` shell <150 AND every extracted helper <150.
    - Byte-identical body check at the helper level: each helper's body matches the original sub-block byte-for-byte after `diff -w`.
    - **`<script>` order check** (per Issue #8 / §5):
      ```bash
      grep -n '<script src="src/app/runtime/.*\.js"></script>' index.html
      # Verify no existing `<script>` was reordered. wire-binder shim line stays at its original position.
      ```
  - **Adjacent smoke:** ROADMAP regression — overlay-window flows: open animation editor as a popup, drag the window header, resize the window, click the X to close, observe stacking-order changes when multiple overlays open.
  - **Commit message:** `refactor(24-3): decompose wireOverlayWindowBinders (525→<150) into named topical helpers`
  - **Rollback:** `git revert <hash>`. Reverts cleanly; restores the single 525-line function.

- [ ] **W3.6-C5b — Decompose `wirePolygonEditorBinders` (447 lines) into named helpers.**
  - **Files touched:**
    - `src/app/runtime/wire/runtime-wire-polygon-editor-binders.js` (459 lines total — decompose function in place; file stays under 800).
    - `index.html` (script-order verification only — no edits expected).
  - **What moves:** the 447-line `wirePolygonEditorBinders(ctx)` body splits into named helpers per topical area (e.g., `_wirePolygonEditorVertexHandlers`, `_wirePolygonEditorEdgeHandlers`, `_wirePolygonEditorContextMenu`, `_wirePolygonEditorKeyboard`, `_wirePolygonEditorUndoRedo`). Per-helper ≤150 lines. The function's outer shell delegates to helpers in same order. **No new files**.
  - **`index.html` updates:** none expected. Per Issue #8 verification, run the `<script>`-order grep post-edit.
  - **Pre-move verification:**
    - `grep -n "function wirePolygonEditorBinders" src/app/runtime/wire/runtime-wire-polygon-editor-binders.js` returns exactly 1 hit.
    - `node /tmp/find-large-funcs2.js src/app/runtime/wire/runtime-wire-polygon-editor-binders.js` shows `wirePolygonEditorBinders` at 447 lines.
  - **Post-move verification:**
    - `node --check src/app/runtime/wire/runtime-wire-polygon-editor-binders.js` exits 0.
    - Function-size scanner: `wirePolygonEditorBinders` shell <150 AND every extracted helper <150.
    - Byte-identical body check at the helper level (`diff -w` between original sub-block and helper body).
    - **`<script>` order check** (per Issue #8 / §5):
      ```bash
      grep -n '<script src="src/app/runtime/.*\.js"></script>' index.html
      # Verify no existing `<script>` was reordered.
      ```
  - **Adjacent smoke:** ROADMAP regression — polygon-editor flows: drag a polygon vertex, double-click an edge to add a vertex, right-click for context menu (delete vertex), undo (Ctrl+Z), redo (Ctrl+Y), Backspace to delete selected vertex.
  - **Commit message:** `refactor(24-3): decompose wirePolygonEditorBinders (447→<150) into named topical helpers`
  - **Rollback:** `git revert <hash>`. Reverts cleanly; restores the single 447-line function.

- [ ] **W3.6-C5c — Decompose `wireStageGestureBinders` (397 lines) into named helpers.**
  - **Files touched:**
    - `src/app/runtime/wire/runtime-wire-stage-gesture-binders.js` (409 lines total — decompose function in place; file stays under 800).
    - `index.html` (script-order verification only — no edits expected).
  - **What moves:** the 397-line `wireStageGestureBinders(ctx)` body splits into named helpers per gesture (`_wireStagePanGesture`, `_wireStagePinchGesture`, `_wireStageTouchGesture`, `_wireStageWheelGesture`). Per-helper ≤150 lines. The function's outer shell delegates to helpers in same order. **No new files**.
  - **`index.html` updates:** none expected. Per Issue #8 verification, run the `<script>`-order grep post-edit.
  - **Pre-move verification:**
    - `grep -n "function wireStageGestureBinders" src/app/runtime/wire/runtime-wire-stage-gesture-binders.js` returns exactly 1 hit.
    - `node /tmp/find-large-funcs2.js src/app/runtime/wire/runtime-wire-stage-gesture-binders.js` shows `wireStageGestureBinders` at 397 lines.
  - **Post-move verification:**
    - `node --check src/app/runtime/wire/runtime-wire-stage-gesture-binders.js` exits 0.
    - Function-size scanner: `wireStageGestureBinders` shell <150 AND every extracted helper <150.
    - Byte-identical body check at the helper level (`diff -w` between original sub-block and helper body).
    - **`<script>` order check** (per Issue #8 / §5):
      ```bash
      grep -n '<script src="src/app/runtime/.*\.js"></script>' index.html
      # Verify no existing `<script>` was reordered.
      ```
  - **Adjacent smoke:** ROADMAP regression — stage-gesture flows: pan the board with one finger, pinch-zoom with two fingers, single-tap a room (touch gesture), wheel-scroll to zoom on desktop. Verify the rAF zoom-pan writer doesn't fight the gesture handler (Wave 2 INVENTORY C5.4 kernel still preserved).
  - **Commit message:** `refactor(24-3): decompose wireStageGestureBinders (397→<150) into named per-gesture helpers`
  - **Rollback:** `git revert <hash>`. Reverts cleanly; restores the single 397-line function.

- [ ] **W3.6-C6 — Decompose `collectDomRefs` (298 lines) in `runtime-dom-refs.js`.**
  - **Files touched:**
    - `src/app/runtime/core/runtime-dom-refs.js` (304 lines total — decompose in place).
  - **What moves:** the 298-line `collectDomRefs(...)` body splits into named helpers per area: `_collectStageDomRefs`, `_collectFxPanelDomRefs`, `_collectAnimationEditorDomRefs`, `_collectAlignModeDomRefs`, etc. Outer shell delegates.
  - **`index.html` updates:** none.
  - **Pre/post-move verification:** function-size scanner ≤150 per function.
  - **Adjacent smoke:** boot smoke (collectDomRefs runs once at startup).
  - **Commit message:** `refactor(24-3): decompose collectDomRefs (298→<150) into per-area helpers`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.6-C7 — Decompose `initializeApplication` (188 lines) in `runtime-bootstrap.js`.**
  - **Files touched:**
    - `src/app/runtime/core/runtime-bootstrap.js`.
  - **What moves:** body splits into per-phase helpers: `_initializeApplicationPhaseSetup`, `_initializeApplicationPhaseLoadConfig`, `_initializeApplicationPhaseStartLiveSync`, `_initializeApplicationPhaseRender`. Outer shell delegates.
  - **Adjacent smoke:** boot smoke + cross-tab live-sync.
  - **Commit message:** `refactor(24-3): decompose initializeApplication (188→<150) into per-phase helpers`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.6-C8 — Decompose `decodeGifPlaybackFramesWithParser` (176 lines) in `runtime-gif-decoder.js`.**
  - **Files touched:**
    - `src/app/runtime/render/runtime-gif-decoder.js`.
  - **What moves:** body splits into `_extractGifFrameMetadata`, `_decodeGifFrameToImageData`, `_assembleGifPlaybackFrames`, etc. Outer shell delegates.
  - **Adjacent smoke:** trigger a GIF animation (Slime, Malfunction).
  - **Commit message:** `refactor(24-3): decompose decodeGifPlaybackFramesWithParser (176→<150)`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.6-C9 — Split `runtime-polygon-editor.js` (846 lines) — single helper extraction OR full split.**
  - **Files touched (decision):** the file is 846 — only 46 over the cap. Three large functions inside: `renderPolygonEditorHandles` (171), `renderShipPolygonEditorHandles` (159), `renderRoomOverlay` (146 — under cap). **Decision:** decompose `renderPolygonEditorHandles` and `renderShipPolygonEditorHandles` in place, both <150 post-decompose. The function-decomposition naturally trims the file under 800 (each function shell + helpers occupy roughly the same lines as the original, but the file gains slight inflation from helper signatures — net effect: ~860 lines, still over). If still over 800 post-decompose: extract `renderPolygonEditorHandles` + `renderShipPolygonEditorHandles` to a new `runtime-polygon-editor-handles.js` sub-module.
  - **Files touched (likely):**
    - `src/app/runtime/polygon-editor/runtime-polygon-editor.js` (decompose in place).
    - `src/app/runtime/polygon-editor/runtime-polygon-editor-handles.js` (new — only if needed).
    - `index.html` (only if new file).
  - **Adjacent smoke:** drag a polygon vertex, double-click an edge to add a vertex, delete a vertex via context menu.
  - **Commit message:** `refactor(24-3): decompose polygon-editor render functions (171/159 → <150) and bring file under 800`
  - **Rollback:** `git revert <hash>`.

- [ ] **W3.6-C10 — Split `runtime-draw-loop.js` (836 lines) — single helper extraction OR full split.**
  - **Files touched (decision):** the file is 836 — 36 over the cap. Largest functions: `drawClusterPadCanvases` (115), `draw` (110), `drawAnimation` (101), `drawOutsideFxLayer` (101) — all under 150 already. The over-800 problem is **file-size, not function-size**. **Decision:** extract `drawClusterPadCanvases` (115) to a new `runtime-draw-loop-cluster-pads.js` sub-module — that's ~115 lines moved, file drops to ~720, comfortably under 800.
  - **Files touched:**
    - `src/app/runtime/render/runtime-draw-loop.js` (delete `drawClusterPadCanvases` block).
    - `src/app/runtime/render/runtime-draw-loop-cluster-pads.js` (new).
    - `index.html` (insert new `<script>` BEFORE line 839 which is `/src/app/runtime/render/runtime-draw-loop.js`).
  - **Adjacent smoke:** trigger cluster animation, observe cluster pad canvases render correctly. Per ROADMAP cluster lines.
  - **Commit message:** `refactor(24-3): extract drawClusterPadCanvases to runtime-draw-loop-cluster-pads.js (file drops to <800)`
  - **Rollback:** `git revert <hash>`.

**End-of-W3.6 gate (also end-of-Wave-3 gate — see §10):**
- All 5 secondary >800-line files now ≤800.
- All ≥150-line functions split.
- File-size + function-size verification commands return empty.

---

## 5. Re-Export Shell Pattern

**Current IIFE pattern (per RESEARCH §1):**

```javascript
// runtime-X.js
(() => {
  let ctx = null;
  // ... module-local state and helpers ...
  function init(dependencies) {
    ctx = dependencies;
    // bind dom listeners, wire ctx.* dependencies, etc.
  }
  window.TT_BEAMER_RUNTIME_X = {
    init,
    publicHelper1,
    publicHelper2,
  };
})();
```

**New shell pattern (Wave 3 splits):**

```javascript
// src/app/runtime/X/runtime-X.js (SHIM at original path)
(() => {
  // Reference each sub-module's namespace (already populated by their own IIFE — they loaded earlier).
  const partA = window.TT_BEAMER_RUNTIME_X_PART_A;
  const partB = window.TT_BEAMER_RUNTIME_X_PART_B;
  const partC = window.TT_BEAMER_RUNTIME_X_PART_C;

  // The shim's init fans out to each sub-module's init in dependency order.
  function init(deps) {
    partA.init(deps);                                  // pure module — no cross-deps
    partB.init({ ...deps, partA });                    // partB needs A's exports
    partC.init({ ...deps, partA, renderList: partB.render });  // partC needs A + a callback from B
  }

  // Aggregate the public API into the original namespace.
  // Keys MUST match the pre-split snapshot byte-for-byte.
  window.TT_BEAMER_RUNTIME_X = {
    init,
    publicHelper1: partA.publicHelper1,
    publicHelper2: partB.publicHelper2,
    publicHelper3: (...args) => partC.publicHelper3(...args),  // arrow when call-time deferral matters
  };
})();
```

**`<script>` load order in `index.html` (CRITICAL):**

Sub-module `<script>` tags appear BEFORE the shim's `<script>` tag. The shim's `<script>` tag stays at the original line. Existing pre-Wave-3 `<script>` tags do NOT move.

**Expected ordering rule (canonical, MUST hold after every commit that touches `index.html`):**

1. Each new sub-module's `<script>` tag appears **before** its parent shim's tag.
2. Each parent shim's tag stays at its **original relative position** within the runtime block (no existing tag is reordered, removed, or relocated).
3. `runtime-orchestration.js` MUST always be the **last** runtime-block `<script>` (it consumes every other namespace at IIFE-execute time).
4. The runtime block (between `runtime-utils.js` and `runtime-orchestration.js`) is the only region where Wave 3 inserts new tags.

**Per-commit `<script>`-order verification command** (run after every edit to `index.html`):

```bash
grep -n '<script src="src/app/runtime/.*\.js"></script>' index.html
# Verify:
#   (a) Every new sub-module added by this commit appears BEFORE its shim.
#   (b) Every shim is at the same relative position (within the runtime block) as before this commit.
#   (c) runtime-orchestration.js is the LAST runtime-block <script>.
```

Each commit that touches `index.html` MUST run this command and confirm all three properties hold. The §6 "Per-Commit Task Structure" references this rule as a mandatory verification step.

**Concrete example (W3.2 projection-mapping):**

```html
<!-- index.html — BEFORE Wave 3 (line 871): -->
<script src="/src/app/runtime/viewport/runtime-projection-mapping.js" defer></script>

<!-- index.html — AFTER W3.2 (insert 5 new lines before, original stays at the same relative position): -->
<script src="/src/app/runtime/viewport/runtime-projection-grid-state.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-gl-renderer.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-2d-fallback-renderer.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-handle-ui.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-profile-persistence.js" defer></script>
<script src="/src/app/runtime/viewport/runtime-projection-mapping.js" defer></script>  <!-- shim, original line position -->
```

**Shell-API consistency rule (planner decision):**

- The shim **exposes the aggregate API** matching the pre-split namespace key set byte-for-byte. This preserves all external destructure call sites in orchestration without changing them.
- Sub-modules expose their OWN namespace key sets too — these are NEW keys that orchestration may reference directly OR may not (the shim is the legacy contract; sub-modules are the new internal API).
- The aggregate API in the shim is the **legacy contract**. Sub-module namespaces are **internal**, intended for the shim and (optionally) other sub-modules of the same parent. Direct cross-parent imports of sub-module namespaces are out of scope for Wave 3 — Wave 5 owns boundary cleanup.

**What MUST be preserved per re-export shell (RESEARCH §6):**

1. The exact public-API key set (`Object.keys(window.TT_BEAMER_RUNTIME_X).sort()` equality pre/post split).
2. The exact namespace key string (`PROJECTION_MAPPING`, not `PROJ_MAPPING`).
3. The exact init-call signature (`init({ deps })` with the dep bag's exact shape; sub-modules can take a *narrower* bag, but the shim's `init` must accept the orchestration's bag).
4. `<script>` order: sub-modules ALWAYS load before shim; shim ALWAYS loads before orchestration.
5. The IIFE wrapper: each new file is `(() => { ... })();` — no top-level identifiers leak.

**Single-failure-mode warning (RESEARCH §6):**

If one sub-module's `init` is forgotten in the shim, the entire namespace silently fails — orchestration's destructure returns `undefined` for missing keys, then the first call site throws `TypeError: undefined is not a function`. Pre-commit verification MUST include `node --check` AND a manual smoke that loads `/` + `/output` to surface this class of bug immediately.

---

## 6. Per-Commit Task Structure

For every commit in Wave 3, the executor follows this checklist:

- [ ] **Files touched** — paths + line ranges (including new files).
- [ ] **What moves** — exact identifier / function / line range from source location to new location. Body byte-identical.
- [ ] **`index.html` updates** — new `<script>` line, exact position (BEFORE / AFTER which existing entry).
- [ ] **Pre-move verification** — grep / line-count to confirm starting state.
- [ ] **Post-move verification:**
  - `node --check <each modified .js>` exits 0.
  - **Byte-identical body check (extraction commits):** `git diff -w --no-color HEAD~..HEAD -- <old-path> <new-path>` shows only relocation; no body diff. Per-function check via `awk '/^function NAME/,/^}/'` extraction + `diff -w`.
  - **Browser-load smoke:** open `/`, observe console — zero red errors, `Status: Ready`. Open `/output`, observe — zero red errors, animation renders.
  - **Namespace key parity (split commits):** `Object.keys(window.TT_BEAMER_RUNTIME_X).sort()` equals pre-split snapshot.
  - **Original call sites resolve:** `grep -rn "TT_BEAMER_RUNTIME_X\.<key>" src/` shows expected hits; each call resolves at runtime.
  - **`<script>` order check (every commit that touches `index.html`):** per the canonical ordering rule in §5, run
    ```bash
    grep -n '<script src="src/app/runtime/.*\.js"></script>' index.html
    ```
    and verify (a) new sub-module(s) appear before their shim, (b) the shim stays at its original relative position within the runtime block, (c) `runtime-orchestration.js` is the last runtime-block tag. Required for: W3.1-C1, W3.2-C1..C5, W3.3-C1..C4, W3.4-C1, W3.4-C2, W3.4-C3a, W3.4-C4a, W3.4-C5, W3.5-C1, W3.5-C2, W3.6-C1, W3.6-C2, W3.6-C3, W3.6-C5a, W3.6-C5b, W3.6-C5c, W3.6-C9 (only if new file is created), W3.6-C10. Skip the check on commits that don't touch `index.html`.
- [ ] **Adjacent smoke-test scenarios** — pulled from ROADMAP regression checklist scoped to features in the touched files.
- [ ] **Commit message** — `refactor(24-3): <short verb-leading description>`. Body (optional): one-line context.
- [ ] **Rollback note** — `git revert <hash>` reverses cleanly. (If a commit needs supplementary cleanup on revert, note it here.)

---

## 7. Init-Order Constraint Preservation

Wave 2 INVENTORY recorded **13 init-order kernels** in `runtime-orchestration.js` (8 from the pre-C1 sweep + 5 multi-paragraph rewrites). Each kernel is load-bearing comment text whose verbatim content was preserved through Wave 2. Wave 3 must keep them alive.

**Pre-flight verification rule:** before W3.5 starts, re-run Wave 2's pre-C1 sweep grep to confirm all 13 are still in place at their post-Wave-2 line numbers. After every commit that touches `runtime-orchestration.js`, re-run an init-order regression smoke (load `/`, check console, verify modules initialize without ReferenceError).

**Per-kernel preservation map:**

| # | File:Line (post-Wave-2) | Sub | Kernel sentence (one-line) | Wave 3 sub-wave touching its location | Post-W3 location |
|---|-------------------------|-----|----------------------------|---------------------------------------|------------------|
| 1 | `runtime-orchestration.js:54-58` | C5.0 | "Init order: orchestration must destructure normalizeSpecialPolygon / isValidSpecialPolygon into local scope before binding event handlers." | none — outside W3.5's move ranges (1149, 1514, 1528, 2510, 2926-3024) | stays in shim at same line |
| 2 | `runtime-orchestration.js:170-171` | C5.3 | "These IDs no longer exist in index.html (replaced by 'Share a Board' bundle); listing them here suppressed the noisy 'missing control' log." | none | stays in shim |
| 3 | `runtime-orchestration.js:617-618` | C5.0a | "BOARDS is reassigned via the setBoards callback since the runtime-zone-loader module cannot mutate the outer let directly." | none | stays in shim |
| 4 | `runtime-orchestration.js:650-652` | C5.0b | "Init + destructure for the viewport-zoom module is placed later in the file (after touchGestureActive and polygon-drag-support are initialized, since the zoom module needs getCachedStageGeometry and getTouchGestureActive at call time)." | none | stays in shim |
| 5 | `runtime-orchestration.js:711-713` | C5.0c | "fx-normalizers and perf controls are injected via ctx arrows because their destructures sit below this position in orchestration." | none | stays in shim |
| 6 | `runtime-orchestration.js:785-788` | C5.0d | "board-profiles helpers are injected as direct refs (already destructured above). fx/config-sync helpers used only by loadAndApplyGlobalDefaults come from ctx arrows so downstream destructures can resolve later." | none | stays in shim |
| 7 | `runtime-orchestration.js:905-906` | C5.1 | "Init order: must follow BOARD_STATE_ACCESSORS — ROOM_GEOMETRY destructures getHitareaCalibration / getRoomGeometry from it." | none | stays in shim |
| 8 | `runtime-orchestration.js:1456-1458` | C5.0e | "fx-normalizers' asset-ref normalizer dependencies are injected via ctx arrows because the asset-refs destructure above supplies them as top-level consts." | none | stays in shim |
| 9 | `runtime-orchestration.js:1543-1545` | C5.0f | "Editor draft storage and outsideResourceAssets remain in orchestration scope (passed by reference) — mutations to the objects propagate naturally to runtime-fx-panels." | none | stays in shim |
| 10 | `runtime-orchestration.js:1689-1691` | C5.0g | "All cross-module deps for the polygon editor are injected via ctx arrows so downstream destructures (room-geometry, room-management, room-draft, viewport-zoom) can land later without TDZ." | none | stays in shim |
| 11 | `runtime-orchestration.js:1963-1965` | C5.2 | "Use raw setters (not the update* wrappers): the wrappers re-derive intensity/speed/mode/direction from the profile root and clobber per-definition patches, leaving sliders stuck." | none | stays in shim |
| 12 | `runtime-orchestration.js:2081-2083` | C5.0h | "drawRoomComposition's init + destructure is deferred until after all upstream helpers (drawEffectVisual, clipToRoom, etc.) have been destructured — see the init block after flickerNoise below." | none | stays in shim |
| 13 | `runtime-orchestration.js:2382-2384` | C5.4 | "Global 'touch gesture in progress' flag: blocks the rAF zoom-pan writer's DOM writes during a touch gesture so the writer doesn't fight the gesture handler. Set by touch handlers; cleared on touchend." | none | stays in shim |

**All 13 kernels stay in the orchestration shim** under the safer-path approach. This is by design: the safer path moves only the ctx-builder dep-bag and the 4 top-level functions, none of which neighbour the kernels. Verification per W3.5 commit: `grep -nF "<kernel-snippet>" src/app/runtime/runtime-orchestration.js` returns exactly 1 hit per kernel, at the expected line ±5 (lines may shift slightly as code above/below changes; the kernel content is what matters, not the line number).

**Additional non-orchestration kernels surviving from Wave 2 (per Wave 2 INVENTORY "Non-orchestration C5b rewrites" + "Other STRIP-PREFIX kernels"):**

These live OUTSIDE `runtime-orchestration.js` and W3.5 doesn't touch them. But W3.4 (animation-lifecycle), W3.2 (projection-mapping), and W3.6 (polygon-drag-support, viewport-zoom, draw-loop, runtime-controls, etc.) DO touch their host files. Mapping:

| File:Line | Wave 3 sub-wave | Action |
|-----------|-----------------|--------|
| `runtime-runtime-controls.js:23-26` (graceful audio) | none | stays in place |
| `runtime-animation-lifecycle.js:1138-1143` (cluster pads rail) | W3.4-C5 (cluster-pads extraction) | **comment moves with the cluster-pads code into `runtime-lifecycle-cluster-pads.js`** |
| `runtime-draw-loop.js:711-713` (heavy-interaction pause) | W3.6-C10 (only if the pause-region is in `drawClusterPadCanvases`'s extracted block — verify; if not, stays in place) | most likely stays |
| `runtime-viewport-zoom.js:160-161` (ABI stability) | none | stays |
| `runtime-viewport-zoom.js:191-193` (rAF zoom/pan writer) | none | stays |
| `runtime-polygon-drag-support.js:219-221` (heavy-interaction flag) | none | stays |
| `ui/icons.js:163-165` (icon resolution order) | none | stays |
| `runtime-projection-mapping.js:159-164` (WebGL fallback) | W3.2-C2 or C3 (depends on if the comment lives in gl-renderer or 2d-fallback-renderer block) | **comment moves with the gl-renderer code** |
| `runtime-projection-mapping.js:197-201` (lean GL options) | W3.2-C2 (gl-renderer extraction) | **comment moves with the gl-renderer code** |
| `runtime-fx-normalizers.js:40-47` | none | stays |
| `runtime-fx-panels.js:16-20` | W3.6-C1 (fx-panels split — if comment is at top of room-fx-panel section) | likely moves to `runtime-fx-panels-room.js` |
| `runtime-draw-loop.js:114-118, :125-132, :344-348` | W3.6-C10 (only if these lines are in `drawClusterPadCanvases`'s block — verify; most likely stay in `runtime-draw-loop.js`) | likely stay |

**Rule:** when a comment's host code moves to a sub-module, the comment moves with it. The comment's verbatim text is preserved (Wave 2 commitment); only its file location changes. INVENTORY.md "Init-order kernels preserved" section records every kernel's pre-W3 line + post-W3 file:line + verification quote.

---

## 8. Function-Size Inventory (W3.6 task list)

Verified via RESEARCH §3 inventory. Each row maps to a W3.6 commit (or, where the function lives in a W3.3/W3.4 split file, the split commit).

| Function | File | Lines | Decomposition | Wave 3 commit |
|----------|------|------:|---------------|---------------|
| `wireFxPanelBinders` | `runtime-wire-fx-panel-binders.js:8-905` | 898 | split into 3 scope-topical files (room/inside/outside) | W3.6-C3 |
| `wireRoomAudioBinders` | `runtime-wire-room-audio-binders.js:10-919` | 910 | split into 3 topical files (volume/source/effects) | W3.6-C2 |
| `startRoomAnimationFromDraft` | `runtime-room-dispatch.js:17-653` | 637 | extract 5–7 named helpers (validation/profile-resolve/assemble/emit/finalize) | W3.6-C4 |
| `wireOverlayWindowBinders` | `runtime-wire-overlay-window-binders.js:9-533` | 525 | extract named helpers per topical area | W3.6-C5a |
| `wirePolygonEditorBinders` | `runtime-wire-polygon-editor-binders.js:8-454` | 447 | extract named helpers | W3.6-C5b |
| `wireStageGestureBinders` | `runtime-wire-stage-gesture-binders.js:8-404` | 397 | extract named helpers (pan/pinch/touch/wheel) | W3.6-C5c |
| `renderRunningAnimationsList` | `runtime-animation-lifecycle.js → lifecycle-running-list.js:719-1087` | 369 | extract `_buildRunningRow`, `_applyRunningRowState`, `_wireRunningRowListeners`, `_renderRunningRowsContainer` | **W3.4-C4a (code-move) + C4b (decompose)** |
| `collectDomRefs` | `runtime-dom-refs.js:7-304` | 298 | extract per-area helpers (stage/fx-panel/animation-editor/align-mode/...) | W3.6-C6 |
| `syncRoomFxPanel` | `runtime-fx-panels.js:436-626 → runtime-fx-panels-room.js` | 191 | extract per-section helpers (`_renderRoomFxIdentitySection`, etc.) | W3.6-C1 |
| `initializeApplication` | `runtime-bootstrap.js:71-258` | 188 | extract per-phase helpers (setup/load-config/start-live-sync/render) | W3.6-C7 |
| `decodeGifPlaybackFramesWithParser` | `runtime-gif-decoder.js:191-366` | 176 | extract `_extractGifFrameMetadata`, `_decodeGifFrameToImageData`, `_assembleGifPlaybackFrames` | W3.6-C8 |
| `openLiveEditor` | `runtime-animation-lifecycle.js → lifecycle-live-editor.js:147-320` | 174 | extract `_buildLiveEditorSnapshot`, `_populateLiveEditorPanel`, `_wireLiveEditorListeners`, `_finalizeLiveEditorOpen` | **W3.4-C3a (code-move) + C3b (decompose)** |
| `renderPolygonEditorHandles` | `runtime-polygon-editor.js:270-440` | 171 | extract per-handle-type render helpers | W3.6-C9 |
| `renderShipPolygonEditorHandles` | `runtime-polygon-editor.js:89-247` | 159 | extract per-handle-type render helpers | W3.6-C9 |

**Rule for every decomposition:** the function's body content remains byte-identical at the helper level. Each helper takes a contiguous block of the original function's body. The function's outer shell post-decomposition delegates to the helpers in the same order. No logic is rewritten; only structure changes.

---

## 9. Special Handling Notes

### Closures over IIFE-local state

When extracting a function from one IIFE to a new file, any state it closes over (`let _foo = ...` at IIFE scope) must travel with it. **Two repair patterns** (RESEARCH §9 #2):

1. **Promote to ctx + pass via init-injected references** — good for state shared across multiple sub-modules (e.g., the `state` object in animation-editor-view; promoted to shell, accessed by sub-modules via `getState()`).
2. **Move the state into the sub-file along with its functions** — good for state that only the moved functions touch (e.g., `_glCanvas`, `_glInitOk` in projection-mapping; only the GL renderer touches them, so they go with the GL renderer module).

**Decision rule per extraction:** if 2+ sub-modules need the state → promote. If 1 sub-module needs the state → move with it.

**Pre-move grep checklist:** for each function being extracted, the executor runs:
```bash
# Enumerate all `let` / `const` / `var` symbols at the IIFE-top scope of the source file.
grep -nE "^\s+(let|const|var)\s+[a-zA-Z_]" src/app/runtime/X/runtime-X.js

# Cross-reference: which of those symbols does the extracted function reference?
grep -n "<symbol>" src/app/runtime/X/runtime-X.js | grep -i "<function-name>"
```
For each referenced IIFE-local symbol, the executor decides "promote to shim ctx" OR "move with the function". Decision recorded in INVENTORY.md "Decision-log" if non-trivial.

### Direct `state.X` mutations

Extracted functions need ctx access to `state` — preserve the existing ctx pattern (RESEARCH §9 #3). After extraction, `grep state\\.` in each new sub-file should yield zero matches that aren't via `ctx.state.` (or via getter from a state module). Easy to miss; easier to detect with a post-extraction grep.

### `<script>` load-order rule

New sub-module scripts go BEFORE their parent shell script. RESEARCH §9 #5: getting this wrong fails silently, surfaces as `TypeError: undefined is not a function` at first call. Test-this-failure-mode mentally only — do NOT introduce a deliberate-failure test (we don't want to land a broken `index.html` even briefly).

### `runtime-utils.js` location

Per orchestrator pre-flight decision + RESEARCH §5 + Open Question §3: `src/app/runtime/runtime-utils.js`. Loaded as a `<script>` at `index.html` between line 825 (`/src/app/lib/ui/runtime-panels-controller.js`) and line 826 (`/src/app/runtime/core/polygon-contract.js`).

### Wire-binder pattern preservation (W3.6 secondary pass)

Wire-binder files use a different entry-point pattern (`wireXxxBinders(ctx)`, NOT `init({ctx})`). RESEARCH §9 #10. Splits MUST preserve that pattern OR introduce a new wrapper. Do NOT silently switch a wire-binder to the `init` pattern; the orchestration call sites at runtime-orchestration.js:2344, 2478, 2545, 2616, 2725, 2789 call `wireXxxBinders({...})` directly. The shim's wrapper preserves this:
```javascript
window.TT_BEAMER_RUNTIME_WIRE_X_BINDERS = {
  wireXBinders: (ctx) => {
    window.TT_BEAMER_RUNTIME_WIRE_X_BINDERS_PART_A.wireXBindersPartA(ctx);
    window.TT_BEAMER_RUNTIME_WIRE_X_BINDERS_PART_B.wireXBindersPartB(ctx);
  },
};
```
Each sub-binder file is its own IIFE exposing one `wireXxxBindersTopic(ctx)` function.

### Shim conditional-guard pattern (W3.3 only)

Orchestration's `if (window.TT_BEAMER_ANIMATION_EDITOR_VIEW)` guard at runtime-orchestration.js:1937 must continue to resolve to truthy after the editor split. The shim assigns the namespace at IIFE-execute time, so the `if` resolves correctly as long as the shim's `<script>` loads (which it does — it stays at `index.html:808`).

### Reading current line numbers vs. RESEARCH ranges

RESEARCH §3, §4 line ranges were captured 2026-04-26. Lines may have shifted slightly during recent commits (d22be46, 5bc0121, etc., 2026-04-25 dates pre-research). Per W3.x commit, the executor:
1. `grep -n "<distinctive token>" <file>` to find current line numbers.
2. Use the current numbers, NOT the RESEARCH numbers, when slicing.
3. If the difference exceeds ±20 lines, double-check the executor isn't editing the wrong block — could mean a section boundary moved or a function got extracted/inlined.

---

## 10. End-of-Wave Gate

Before declaring Wave 3 done, **all** of the following must be true:

- [ ] All ~38 commits landed (post plan-checker patches: W3.4 = 8, W3.6 = 12).
- [ ] **File-size verification:**
  ```bash
  find src/app/runtime/ -name "*.js" -exec wc -l {} + | awk '$1 > 800 && $2 != "total" && $2 !~ /runtime-orchestration\.js$/'
  # → empty (orchestration shim exception sanctioned by ROADMAP)
  ```
- [ ] **Nested directory check:**
  ```bash
  find src/app/runtime/ -type d -not -path 'src/app/runtime/' | xargs -I{} find {} -name "*.js" -exec wc -l {} + | awk '$1 > 800 && $2 != "total"'
  # → empty (no creeping size in newly-created sub-module folders)
  ```
- [ ] **Function-size verification:**
  ```bash
  node /tmp/find-large-funcs2.js src/app/runtime/**/*.js | grep -E '1[5-9][0-9] lines|[2-9][0-9][0-9] lines'
  # → empty
  ```
  Plus manual spot-check of arrow-function-expressions in the top 5 largest files (RESEARCH §3 limitation — scanner doesn't catch arrow-as-const).
- [ ] **All `window.TT_BEAMER_RUNTIME_*` namespaces resolve.** Browser DevTools:
  ```javascript
  Object.keys(window).filter(k => k.startsWith("TT_BEAMER_")).sort()
  // post-Wave-3: same pre-existing keys + new sub-module keys (additive).
  ```
- [ ] **All `init()` contracts honoured.** Boot smoke: `/` and `/output` load with zero red console errors.
- [ ] **INVENTORY.md exists** at `.planning/phases/phase-24/wave-3/INVENTORY.md` with:
  - Per-commit table (hash, sub-wave, files moved-from, files moved-to, lines moved, primary-gate status).
  - "Init-order kernels preserved" section: 13 entries with kernel sentence + post-W3 file:line + verification quote.
  - Final file-size table: every file in `src/app/runtime/` with pre-W3 size, post-W3 size, delta. Total runtime LOC pre/post.
  - "Namespace snapshots" section: pre-W3 + post-W3 `Object.keys` for every modified namespace.
  - Decision-log: any deviations from this plan (e.g. an orchestration extraction that grew beyond expected scope; a wire-binder split that needed an extra commit).
  - "Wave 3 commits" table mirroring Wave 2 INVENTORY's format.
  - "Tags" section with `phase-24-w3-start` hash.
- [ ] **Full ROADMAP regression checklist passes** (ROADMAP lines 203–275). Manual smoke pass on a fresh `node server.mjs` start. ~10–15 min. Every section: Boards & rooms, Play areas + clusters, Animations + dispatch, Tap-Action, `/output`, Align Mode, Theme + UI, Sounds, Export / Import, Live-sync.
- [ ] **`config/global-defaults.json`** is unchanged from pre-flight (still showing as modified in `git status`, same diff). User resolves separately.

---

## 11. INVENTORY.md Format

Mirror Wave 2's format. Skeleton:

```markdown
# Phase 24 Wave 3 — File / Function Decomposition Inventory

Updated incrementally as each commit lands. Last update: 2026-04-26.

## Baseline (pre-flight, captured against `phase-24-w3-start`)

| Metric | Pre-Wave-3 |
|--------|-----------:|
| `.js` files in `src/app/runtime/` | (computed) |
| Total runtime LOC | 28 307 |
| Files >800 lines | 9 |
| Functions ≥150 lines | 14 |
| Pre-Wave-3 head | <hash> |

| File | Pre-W3 lines | (filled in post-wave) Post-W3 lines | Delta |
|------|-------------:|------------------------------------:|------:|
| `runtime-orchestration.js` | 3037 | | |
| `viewport/runtime-projection-mapping.js` | 1945 | | |
| ... (every runtime file) | | | |

## Decisions (confirmed pre-flight)

- **Scope expansion to 5 unnamed >800-line files in W3.6:** APPROVED.
- **Orchestration safer-path approach in W3.5:** APPROVED. ROADMAP exception clause cited: "the orchestration wire-up which is allowed to be a re-export shell".
- **`runtime-utils.js` location:** `src/app/runtime/runtime-utils.js`.
- **Pre-execution stash:** `config/global-defaults.json` outside scope, leave dirty.
- **Pre-execution tag:** `phase-24-w3-start` set on HEAD `<hash>`.

## Namespace snapshots

### Pre-Wave-3 (captured before C1)

```
TT_BEAMER_RUNTIME_PROJECTION_MAPPING: [...]
TT_BEAMER_ANIMATION_EDITOR_VIEW: [...]
TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE: [...]
... (every namespace touched by Wave 3)
```

### Post-Wave-3 (captured at end-of-wave)

```
TT_BEAMER_RUNTIME_PROJECTION_MAPPING: [...]   # MUST match pre-W3 byte-for-byte
TT_BEAMER_ANIMATION_EDITOR_VIEW: [...]        # MUST match pre-W3 byte-for-byte
TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE: [...]  # MUST match pre-W3 byte-for-byte
TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE: [...]  # NEW — sub-module
... (every new sub-module namespace)
```

## Per-commit progress

| #     | Hash | Sub-wave | Files moved-from | Files moved-to | Lines moved | `node --check` | Boot smoke | Body byte-identical | Notes |
|-------|------|----------|------------------|----------------|------------:|:--------------:|:----------:|:-------------------:|:------|
| W3.1-C1 | | W3.1 | n/a | runtime-utils.js, index.html | n/a (additive) | yes | yes | n/a (new file) | introduces clamp/clamp01/bboxOfPolygon |
| W3.1-C2 | | W3.1 | viewport-zoom.js, room-geometry.js | (in-place) | ~10 | yes | yes | yes | 2 polygon-bbox sites consolidated |
| ... (one row per commit) | | | | | | | | | |
| **Σ** | — | — | — | — | <total lines moved> | all yes | all yes | all yes | <wave-aggregate notes> |

## Init-order kernels preserved

Verified post-W3.5 + post-W3.4: each entry's kernel sentence quoted in the body of the surviving comment.

| # | Kernel pre-W3 location | Kernel post-W3 location | Sub-entry | Kernel sentence (verified verbatim) |
|---|-----------------------|-------------------------|-----------|-------------------------------------|
| 1 | runtime-orchestration.js:54-58 | runtime-orchestration.js:<post-W3 line> | C5.0 | "Init order: orchestration must destructure ..." ✓ |
| ... (13 rows) | | | | |

## Final file-size table

| File | Pre-W3 lines | Post-W3 lines | Delta | Notes |
|------|-------------:|--------------:|------:|------:|
| `runtime-orchestration.js` | 3037 | <post> | <delta> | Sanctioned by ROADMAP exception clause |
| `viewport/runtime-projection-mapping.js` | 1945 | <post> | <delta> | Now shim |
| `viewport/runtime-projection-grid-state.js` | 0 (new) | <post> | +<post> | New sub-module |
| ... (every file in src/app/runtime/) | | | | |

## Decision-log

(Filled in as deviations from plan occur.)

| Date | Sub-wave | Decision | Reason |
|------|----------|----------|--------|

## Wave 3 commits

| #     | Hash | Message |
|-------|------|---------|
| W3.1-C1 | | refactor(24-3): introduce src/app/runtime/runtime-utils.js with clamp/clamp01/bboxOfPolygon |
| ... | | |

## Tags

- `phase-24-w2-start` — stable, set during Wave 2
- `phase-24-w3-start` (`<hash>`) — set during pre-flight; rollback target

## End-of-wave verification

(Filled in at end of wave with the gate checks from §10 passing/failing.)
```

---

## 12. Test Plan

### Per-commit (mandatory before push, every commit)

1. `node --check <each modified .js>` — exits 0.
2. **Browser smoke (control client):** open `/`, observe console for **zero red errors**, verify `Status: Ready` appears.
3. **Browser smoke (output):** open `/output`, observe console for zero red errors, verify a known animation renders.
4. **Adjacent feature smoke** (per sub-wave):
   - W3.1 utility commits: trigger one animation in each scope; drag a slider; drag a polygon vertex.
   - W3.2 projection-mapping: align mode toggle, drag a corner, drag an interior point, save+load a profile.
   - W3.3 animation-editor: open editor, edit one coded effect, edit one GIF, Apply, Discard.
   - W3.4 animation-lifecycle: trigger a coded room animation, open Live Editor, drag every slider, click cluster pad, Clear, pan board (rail tracks).
   - W3.5 orchestration: full ROADMAP regression checklist (this is unavoidable — orchestration touches everything).
   - W3.6 function-size + secondary splits: targeted to the function's call site.
5. **Byte-identical body check (extraction commits only):** `git diff -w --no-color HEAD~..HEAD -- <old-path> <new-path>` shows only relocation.
6. **Namespace key parity (split-creating commits only):** `Object.keys(window.TT_BEAMER_RUNTIME_X).sort()` equals pre-split snapshot.

### Per-sub-wave (after the sub-wave's last commit)

Run the adjacent-feature smoke for every commit in the sub-wave, end-to-end. ~5 min per sub-wave.

### End-of-wave (mandatory before declaring W3 done)

Full ROADMAP "Test plan" (lines 203–275 of ROADMAP.md). Run on fresh `node server.mjs`. ~10–15 min manual pass. Every section: Boards & rooms, Play areas + clusters, Animations + dispatch, Tap-Action, `/output`, Align Mode, Theme + UI, Sounds, Export / Import, Live-sync.

### Most-likely break per sub-wave (per RESEARCH §8 "Most-likely break per primary target")

| Target | Failure mode | Symptom |
|--------|--------------|---------|
| W3.1 utility consolidation | wrong clamp range | sliders feel "stiff" or jump |
| W3.2 projection-mapping | seams in `/output` rendering | black hairlines between mesh cells (regression of WebGL→2D fallback) |
| W3.2 projection-mapping | align mode handles disappear | calibration unusable |
| W3.3 animation-editor | preview swatch stops updating | editor still works, but preview frozen |
| W3.3 animation-editor | Apply doesn't persist | profile changes lost on reload |
| W3.4 animation-lifecycle | cluster pad rail freezes | rail stays in last position during pan |
| W3.4 animation-lifecycle | Live Editor sliders don't edit running anim | sliders move, animation doesn't change |
| W3.4 animation-lifecycle | running list doesn't render | dashboard shows zero running animations even when active |
| W3.5 orchestration | TDZ ReferenceError on boot | dashboard never loads; black screen |
| W3.5 orchestration | wrong ctx-arrow reference | one feature dead, rest works |
| W3.5 orchestration | init-order kernel violated | intermittent / timing-dependent boot failure |
| W3.6 wire-binder split | listener re-binds twice → double-fires | slider events fire twice; animation doubles |
| W3.6 function decomposition | helper extracted with off-by-one body slice | edge-case behaviour drifts (e.g., one row in running list missing edit button) |

---

## 13. Risks + Mitigations Specific to Wave 3

| # | Risk | Mitigation |
|---|------|------------|
| 1 | **TDZ / ReferenceError on boot** from wrong `<script>` order. Sub-module `<script>` after shim → shim's `window.TT_BEAMER_RUNTIME_X_PART_A` reference is `undefined` at IIFE-execute time → namespace setter references `undefined.init` → TypeError. | Per-commit browser-load smoke catches this immediately. Pre-W3.2-C1 mental "deliberate-failure" walkthrough: imagine `<script>` order reversed; predict the failure mode; commit code that keeps the order correct. |
| 2 | **Init-order kernel violations** when orchestration moves code. | Kernel-preservation log enumerated up front (§7 above). Per W3.5 commit + post-W3.5 commit, re-run Wave 2 pre-C1 sweep grep. If a kernel goes missing, revert. |
| 3 | **Closures over IIFE state silently break** when extracted. Function references `let _foo = ...` in source IIFE; after move, `_foo` is `undefined` in the new file. | Each extraction's pre-move grep enumerates all `let` / `const` references the function uses (§9 "Closures" checklist). New module declares them OR receives via ctx. Post-extraction grep for residual references confirms zero leaks. |
| 4 | **Function-body drift** during move (executor "tidies up" while moving — adjusts a guard, reformats whitespace, renames a local var). | Byte-identical body check via `git diff -w --no-color HEAD~..HEAD`. If the diff shows ANY lines that aren't pure relocation, revert and re-extract. Wave 3 hard rule: MOVE not REWRITE. |
| 5 | **Bisect granularity**. If W3 lands as one mega-commit, bisect can't isolate the culprit. | Every commit is bisectable; one extraction per commit; no bundling. ~32 commits total — granular enough to bisect to the offending change in 4–5 steps. |
| 6 | **`node --check` insufficient for browser-only failures** (e.g. wrong namespace key, missing window-global lookup). | Manual browser-load smoke per commit. Adding a CI check is OUT OF SCOPE for this wave (ROADMAP). |
| 7 | **Recent cluster-pad fix (commits d22be46, 5bc0121, a0112df, 8b7b452, 55edf2f) regressed by W3.4-C5 cluster-pads extraction.** | W3.4-C5's adjacent smoke specifically exercises the recent fix scenarios: tap fire on cluster pad routes through withPreviewCanvas; multi-anim render via ctx-swap; type-aware toggle (fire/scanning); cluster pad Clear stops everything. If any regresses, revert C5 and re-extract more carefully. |
| 8 | **Wire-binder file split accidentally switches to `init({ctx})` pattern** instead of preserving `wireXxxBinders(ctx)`. | §9 "Wire-binder pattern preservation" rule. Pre-W3.6-C2/C3 grep `grep -n "wireRoomAudioBinders\|wireFxPanelBinders" src/` to confirm orchestration call shape unchanged post-split. |
| 9 | **Orchestration safer-path mistakenly grows scope** (executor extracts more than ctx-builder + 4 functions during W3.5). | W3.5 commits are bounded explicitly: only `runtime-orchestration-helpers.js` (4 functions) + `runtime-orchestration-ctx-builder.js` (BOOTSTRAP.init dep-bag). If executor wants to extract more, that's a new commit recorded as a deviation in INVENTORY.md "Decision-log" with explicit rationale. |
| 10 | **`config/global-defaults.json` pre-existing dirty file accidentally bundled into a Wave 3 commit.** | Per-commit `git add -- src/ index.html` (NOT `git add -A`). The dirty `config/global-defaults.json` stays unstaged through the wave. End-of-wave check: `git status` still shows `config/global-defaults.json` modified, no other unrelated changes staged. |

---

## 14. Out of Scope for Wave 3

Reaffirmed from ROADMAP:

- **No naming changes** — `syncFooFromBar` vs `applyFoo` etc. stay as-is. Wave 4 owns naming.
- **No module-boundary cleanup beyond mechanical necessity for the splits.** Don't reroute imports just because the split surfaces an awkward dependency. Wave 5 owns boundary cleanup.
- **No function-body rewriting.** Bodies move byte-identical. No "while we're here" simplifications. No inlining of guards. No deletion of comments (Wave 2's surviving comments are preserved).
- **No API changes** to the WebSocket / live-sync protocol, the export-bundle JSON schema, or `localStorage` keys.
- **No comment changes** beyond the W3.1-C6 zoom-anchor dedupe (which Wave 2 explicitly deferred to Wave 3) and the mechanical kernel-comment relocations from §7. No new comments. No deletion of comments. No reformatting.
- **No new dependencies.** No npm packages, no build step, no bundler.
- **No test framework introduction.** Manual smoke pass only.
- **No README rewrites** (Phase 23 owned that).
- **No performance optimizations** beyond what falls out mechanically from removing dead branches (which mostly happened in Wave 1 anyway).

---

## 15. Summary

**Total estimated commits across the 6 sub-waves:** ~38 (post plan-checker patches: W3.4 grew from 6 to 8 via C3→C3a/C3b + C4→C4a/C4b extract-then-decompose splits; W3.6 grew from 10 to 12 via C5→C5a/C5b/C5c per-file decomposition split)

| Sub-wave | Commits | Risk |
|----------|--------:|------|
| W3.1 utility consolidation | 6 | LOW |
| W3.2 projection-mapping split | 6 | MEDIUM |
| W3.3 animation-editor-view split | 5 | MEDIUM |
| W3.4 animation-lifecycle split | 8 (C1, C2, C3a, C3b, C4a, C4b, C5, C6) | HIGH |
| W3.5 orchestration safer-path | 2 (+ 2 verification steps) | HIGHEST |
| W3.6 secondaries + function decomposition | 12 (C1..C4, C5a, C5b, C5c, C6..C10) | MEDIUM-HIGH |
| **Total** | **~38** (or ~40 counting W3.5's 2 verification-only steps) | — |

**Residual orchestration size target:** ≤2925, expected ~2870 (sanctioned shim per ROADMAP exception; see W3.5 §4 for math: 3037 − 99 BOOTSTRAP-bag + 3 replacement-call wrapper − 67 four-functions = ~2874).

**Riskiest commit:** **W3.4-C5** (cluster-pads extraction with the rAF rail-tracker, plus preserving the recent cluster-pad-fix commits d22be46/5bc0121/a0112df/8b7b452/55edf2f). The rAF tracker is registered once and runs forever; if it stays in the wrong place the rail freezes silently with no error. Plus this is the most user-visible interactive surface (cluster pads are the marquee feature of the dashboard).

**Total estimated wave length:** ~10–14 hours executor work spread across the sub-waves + ~10–15 min full ROADMAP regression at end of each sub-wave + ~10–15 min final regression at end of wave. Total wall time including all regression: ~12–16 hours.

**Baseline → target metric deltas:**

| Metric | Pre-W3 | Post-W3 target |
|--------|-------:|---------------:|
| File count >800 lines (excl. orchestration shim) | 8 (4 ROADMAP-named + 5 secondaries) | **0** |
| Orchestration line count | 3037 | ≤2925, expected ~2870 (sanctioned shim per ROADMAP exception; see W3.5 §4 for math) |
| Function count ≥150 lines | 14 | **0** |
| Total `.js` files in `src/app/runtime/` | (current count) | (current count) + ~22 new sub-modules |
| Total runtime LOC | 28 307 | ~28 600 (slight inflation from IIFE wrappers + namespace declarations + arg-passing — normal for split + decompose work) |

**Path to PLAN.md:** `/home/claw/tt-beamer/.planning/phases/phase-24/wave-3/PLAN.md` (this file).
