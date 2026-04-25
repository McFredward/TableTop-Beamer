# Phase 24 Wave 2 — Executable Plan: Comment Hygiene

**Wave:** 24-2
**Type:** Code-quality refactor (no behaviour change — comment-only)
**Inputs:** [ROADMAP.md](../ROADMAP.md), [RESEARCH.md](./RESEARCH.md), [Wave-1 PLAN](../wave-1/PLAN.md), [Wave-1 INVENTORY](../wave-1/INVENTORY.md)
**Slicing:** 6 main commits (C1–C6) with sub-splits; total ~12 atomic units (C1, C2.1–C2.5, C3, C4, C5a, C5b, C6). CSS is included (C6 is no longer conditional).
**Estimated wave length:** ~3–4 hours executor work + 10–15 min full regression at end.

---

## 1. Goal

Wave 2 strips **historical phase markers** (`// Phase X W Y v Z:`, `// HF7:`, `// P12-1:`, `// W3b-2:`, etc.), **paraphrase-of-code comments**, and the **historical narrative wrapped around real WHY** in long blocks, in both JS (`src/**/*.js`) and CSS (`src/styles*.css` + `src/styles/design-system/*.css`). Comments that document a hidden constraint, surprising invariant, workaround, or non-obvious behaviour stay — only the marker prefix on those is removed.

**Hard rule (non-negotiable):** every commit in this wave is **comment-only**. No executable line is touched. No identifier renamed. No code reordered, moved, or deleted (even comment-only "moved this here" structural changes are out of scope). Each commit must be revertable with zero functional impact. The accidental-code-deletion failure mode is policed per-commit by the **primary gate** (the strong `grep -v` chain in §2 / §5.7) returning empty; the `git diff -G '^[^/*\s]'` ping is a fast preliminary filter only.

**Stays unchanged:** every user-facing behaviour, every README-documented feature, every live-sync protocol field, every export-bundle JSON shape, every `localStorage` key, every dependency. The user must observe identical UX before and after this wave.

---

## 2. Acceptance Criteria

This wave is done when **all** of the following are true:

- [ ] **Zero phase-marker hits in JS** outside the test-file carve-out:
  ```bash
  grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|\bHF[0-9]+\b|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+|^\s*//\s*v[0-9]+:" src/ --include="*.js" \
    | grep -v "src/app/runtime/panels/runtime-regression-tests.js" \
    | wc -l
  # → 0
  ```
  Baseline (RESEARCH §1): **434**.

- [ ] **Zero phase-marker hits in CSS:**
  ```bash
  grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|\bHF[0-9]+\b|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+" src/ --include="*.css" | wc -l
  # → 0
  ```
  Baseline (RESEARCH §1 + components.css gap-fill): **75** (RESEARCH §1 reported 73 from styles.css + theme-obsidian + animation-editor + foundations; this plan adds 2 from `src/styles/design-system/components.css` lines 2 and 353). Total markers eliminated across JS + CSS: **509**.

- [ ] **Comment-line count drops by ≥ 200 in JS.** Baseline 2 342 → target ≤ 2 142. RESEARCH estimate: ~2 100 (~−240).
  ```bash
  find src -type f -name "*.js" | xargs grep -E '^\s*(//|\*|/\*)' | wc -l   # ≤ 2142
  ```

- [ ] **Comment density drops from 7.63 % to ≤ 6.95 %** in JS.
  ```bash
  COMMENTS=$(find src -type f -name "*.js" | xargs grep -E '^\s*(//|\*|/\*)' | wc -l)
  TOTAL=$(find src -type f -name "*.js" -exec wc -l {} + | tail -1 | awk '{print $1}')
  echo "scale=4; $COMMENTS / $TOTAL * 100" | bc   # ≤ 6.95
  ```

- [ ] **Long-comment-block count (≥ 8 lines) drops from 66 to ≤ 55** in JS.

- [ ] **Every commit is comment-only.** For every commit in the wave, the **primary acceptance gate** is the strong check (catches indented code, the dominant shape in this codebase):
  ```bash
  # PRIMARY GATE — must return empty for the commit to be allowed to land.
  git diff <commit>~..<commit> -- 'src/**/*.js' 'src/**/*.css' \
    | grep -E '^[+-]' \
    | grep -v -E '^[+-]\s*(//|\*|/\*|\*/)' \
    | grep -v -E '^[+-]\s*$' \
    | grep -v -E '^(---|\+\+\+)\s'
  # → empty
  ```
  The `-G '^[^/*\s]'` check below is a **fast preliminary filter** — useful as an early sanity ping but it produces false negatives for indented lines (most code in this codebase). It does **not** decide whether the commit lands:
  ```bash
  # PRELIMINARY FILTER — fast first ping, NOT the gate.
  git diff -G '^[^/*\s]' <commit>~..<commit> -- 'src/**/*.js' 'src/**/*.css'
  ```
  Empty output on the **primary gate** proves the commit added/removed no non-comment lines. The wave-aggregate end-of-wave check (§7) uses the same primary-gate form.

- [ ] **Test-file carve-out documented.** `runtime-regression-tests.js` markers are partially preserved per §6 below; INVENTORY.md enumerates which lines were touched and which were left.

- [ ] **Load-bearing markers preserved.** RESEARCH §6a's ~10 markers and the ~22 §4B blocks have their bodies intact (only the prefix removed). INVENTORY.md "Kept (load-bearing WHY)" section lists every entry with a one-line "what WHY it carries."

- [ ] **Section dividers in `runtime-projection-mapping.js` (20) are unchanged.** Wave 3 uses them as split boundaries.

- [ ] **Duplicate zoom-around-anchor math at `runtime-viewport-zoom.js:310-322` and `runtime-orchestration.js:2574-2593` stays duplicated.** Per §5.3: viewport-zoom carries only `Phase 13-HF4:` (STRIP PREFIX, body kept). Orchestration's `:2574-2593` carries the same `Phase 13-HF4:` (STRIP PREFIX, body kept) and a tail `:2594-2596` `Phase 14-2: ... moved to ...` block (DELETE WHOLE in C1 — pure history). After this wave both sites still carry the math derivation body verbatim with prefix stripped. Wave 3 will dedupe at the code level.

- [ ] **Full ROADMAP regression checklist passes** (ROADMAP §"Test plan", lines 203–275). Manual smoke pass, ~10–15 min.

- [ ] **`INVENTORY.md` exists** at `.planning/phases/phase-24/wave-2/INVENTORY.md`, updated incrementally per commit, with: per-commit stats (hash, lines changed, comment-lines removed, markers eliminated), a "Kept (load-bearing WHY)" section, and a final aggregate row showing total marker reduction and density delta.

---

## 3. Pre-Flight Checklist (before C1)

Mechanical setup the executor performs **once** before opening C1:

- [ ] **Confirm clean working tree** on `master` (`git status` returns clean). The current uncommitted change in `config/global-defaults.json` (visible in pre-execution `git status`) is unrelated to Wave 2 — stash it as `phase-24-w2-prestart` before proceeding:
  ```bash
  git stash push -u -m "phase-24-w2-prestart" -- config/global-defaults.json 2>/dev/null || true
  git status   # must be clean
  ```
- [ ] **Set rollback tag:**
  ```bash
  git tag phase-24-w2-start
  ```
- [ ] **Snapshot baseline metrics** (re-run RESEARCH §1 commands fresh; record in INVENTORY.md "Baseline" section). Verify counts within ±2 % of RESEARCH:
  ```bash
  find src -type f -name "*.js" -exec wc -l {} + | tail -1                                  # expect ~30 659
  find src -type f -name "*.js" | xargs grep -E '^\s*(//|\*|/\*)' | wc -l                   # expect ~2 342
  grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|\bHF[0-9]+\b|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+|^\s*//\s*v[0-9]+:" src/ --include="*.js" | wc -l   # expect ~434
  grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|\bHF[0-9]+\b|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+" src/ --include="*.css" | wc -l                  # expect ~75 (RESEARCH §1 73 + components.css 2)
  ```
  If any count drifts >2 % from RESEARCH, halt — codebase has changed since research; re-evaluate before continuing.

- [ ] **Log user-decision items as confirmed** in INVENTORY.md "Decisions" section (do **not** re-ask — the orchestrator settled these):
  - **CSS scope = INCLUDED.** C6 lands. (Resolves RESEARCH §6e "CSS scope" open question.)
  - **Load-bearing markers strip prefix only.** RESEARCH §6a's ~10 entries get prefix stripped, body kept verbatim.
  - **`runtime-regression-tests.js` carve-out applies** (RESEARCH §6f). Touch only obvious phase-prefix-only markers (e.g. `// Phase 14-2: runtime regression self-tests module.` → `// runtime regression self-tests module.`); leave fix-documenting comments (`Phase 18:` / `Phase 21-1:` test-rationale blocks at ~lines 463-471) as-is.
  - **Section dividers in `runtime-projection-mapping.js` (20)** stay through Wave 2. Wave 3 splits at those boundaries.
  - **Duplicate zoom math** at `runtime-viewport-zoom.js:310` and `runtime-orchestration.js:2574` stays duplicated. Wave 3 dedupes.

- [ ] **Initialise INVENTORY.md** with header + Baseline section + Decisions section (template in §10 below).

- [ ] **Run an abbreviated smoke pass** on `node server.mjs` to confirm the **starting** state is green (the baseline against which "no behaviour change" is measured): switch a board, trigger one cluster-pad animation, open `/output`. Note any pre-existing oddities so they aren't blamed on Wave 2.

---

## 4. Commit Plan

Each commit is **independently revertable**. Each commit has its own pre-/post-removal grep + adjacent regression smoke test + comment-only verification. Commits run in order C1 → C2.1 → C2.2 → C2.3 → C2.4 → C2.5 → C3 → C4 → C5a → C5b → C6 (10 atomic landings); do not skip ahead. Within C2 the sub-commits run in the order listed (orchestration first because of blast radius); within C5 the order is C5a then C5b.

---

### C1 — Strip orchestrator-bulk `Phase 14-2:` headers + module-header prefixes

**Files touched** (~40 files; one cluster of changes per file)

- `src/app/runtime/runtime-orchestration.js` — ~30 trivial `// Phase 14-2: X moved to Y` blocks deleted whole. (Was ~38 in original plan; 8 blocks reclassified to C5a STRIP-PREFIX during the 2026-04-25 sweep — see callout further below.)
- `src/app/runtime/animation/runtime-mobile-layout.js` — line 1 prefix strip.
- `src/app/runtime/zone/runtime-zone-loader.js` — line 1 prefix strip.
- `src/app/runtime/live-sync/runtime-live-sync-helpers.js` — line 1.
- `src/app/runtime/config/runtime-config-sync.js` — line 1.
- `src/app/runtime/config/runtime-global-defaults.js` — line 1.
- `src/app/runtime/wire/runtime-wire-navigation-binders.js` — line 1.
- `src/app/runtime/viewport/runtime-viewport-zoom.js` — line 1 only (in-function markers handled in C2).
- `src/app/runtime/view/runtime-view-visibility.js` — line 1.
- `src/app/runtime/viewport/runtime-polygon-drag-support.js` — line 1.
- `src/app/runtime/state/runtime-snapshot-helpers.js` — line 1.
- `src/app/runtime/render/runtime-canvas-clip.js` — line 1.
- `src/app/runtime/animation/runtime-animation-lifecycle.js` — line 1 only (in-function markers handled in C2).
- `src/app/runtime/animation/runtime-quick-mode.js` — line 1 only.
- `src/app/runtime/animation/runtime-room-dispatch.js` — line 1.
- `src/app/runtime/animation/runtime-room-draft.js` — line 1.
- `src/app/runtime/animation/runtime-room-management.js` — line 1.
- `src/app/runtime/animation/runtime-runtime-controls.js` — line 1 only.
- `src/app/runtime/animation/runtime-board-switch.js` — line 1.
- `src/app/runtime/runtime-bootstrap.js` — line 1.
- `src/app/runtime/panels/runtime-fx-panels.js` — line 1 only (in-function in C2/C3).
- `src/app/runtime/panels/runtime-regression-tests.js` — line 1 only (per carve-out: only the obvious header prefix; in-function fix-documenting bodies left intact for C2 to skip).
- `src/app/runtime/polygon-editor/runtime-polygon-editor.js` — line 1 only.
- `src/app/runtime/audio/runtime-audio.js` — line 1.
- `src/app/runtime/render/runtime-draw-loop.js` — line 1 only.
- `src/app/runtime/render/runtime-effect-visuals.js` — line 1.
- `src/app/runtime/animation/runtime-gif-decoder.js` — line 1.
- `src/app/runtime/animation/runtime-gif-playback.js` — line 1.
- `src/app/runtime/animation/runtime-outside-mp4.js` — line 1.
- `src/app/runtime/perf/runtime-perf.js` — line 1.
- `src/app/runtime/state/runtime-board-profiles.js` — line 1.
- `src/app/runtime/state/runtime-fx-normalizers.js` — line 1 only.
- `src/app/runtime/state/runtime-play-area-geometry.js` — line 1.
- `src/app/runtime/state/runtime-polygon-normalizers.js` — line 1.
- `src/app/runtime/state/runtime-room-geometry.js` — line 1.
- `src/app/runtime/viewport/runtime-stage-viewport.js` — line 1.
- `src/app/runtime/wire/runtime-wire-room-audio-binders.js` — line 1.
- `src/app/runtime/live-sync/runtime-live-sync-core.js` — line 1.
- `src/app/runtime/polygon-editor/runtime-polygon-context-menu.js` — line 1.
- `src/app/runtime/polygon-editor/runtime-polygon-rotation.js` — line 1.
- `src/app/runtime/polygon-editor/runtime-polygon-undo.js` — line 1.

(Exact paths verify against the codebase; the RESEARCH §2 list of 41 module-header files is the source of truth. If a file's header is already `// X module.` (no prefix), skip it.)

**What changes — patterns**

**Pattern A — module-header prefix strip** (one-line edit per file):

BEFORE:
```js
// Phase 14-2: animation lifecycle module.
//
// Owns ...
```
AFTER:
```js
// animation lifecycle module.
//
// Owns ...
```

Verification regex (per file): the literal `// Phase 14-2: ` token at line 1 disappears.

**Pattern B — `Phase 14-2: X moved to Y` whole-block delete** (in `runtime-orchestration.js`):

BEFORE:
```js
// Phase 14-2: stage viewport cluster (...) moved to runtime-stage-viewport.js.
window.TT_BEAMER_RUNTIME_STAGE_VIEWPORT.init({ ... });
```
AFTER:
```js
window.TT_BEAMER_RUNTIME_STAGE_VIEWPORT.init({ ... });
```

The `init({...})` line is self-documenting (module name in symbol). Apply at every `// Phase 14-2:` location in `runtime-orchestration.js` listed in RESEARCH §2 "Phase 14-2: X moved to Y" table — **except** the entries below, which carry load-bearing WHY in their bodies and belong in C5 (STRIP PREFIX, body kept), not C1. Skip them in C1:
- `runtime-orchestration.js:960-969` (10-line init-order constraint — SHORTEN in C5.1)
- `runtime-orchestration.js:2539-2543` (`Phase 13-HF6` global touch-gesture flag — SHORTEN in C5.4; this is HF6, not 14-2, but it's adjacent in the file and easy to miss)
- **`runtime-orchestration.js:656-659`** — RECLASSIFIED (sweep 2026-04-25): body documents `BOARDS` mutation-via-callback constraint. STRIP PREFIX in **C5a (sub-entry C5.0a)**, body kept verbatim. RESEARCH miscounted size as 2; actual is 4.
- **`runtime-orchestration.js:691-694`** — RECLASSIFIED: body documents init-order WHY (zoom module needs `getCachedStageGeometry` / `getTouchGestureActive`). STRIP PREFIX in **C5a (C5.0b)**. RESEARCH miscounted size as 2; actual is 4.
- **`runtime-orchestration.js:756-759`** — RECLASSIFIED: body documents fx-normalizers/perf-controls ctx-arrow wiring (downstream-destructure ordering). STRIP PREFIX in **C5a (C5.0c)**. RESEARCH miscounted size as 2; actual is 4.
- **`runtime-orchestration.js:836-841`** — RECLASSIFIED: body documents board-profiles direct-refs vs fx/config-sync ctx-arrow wiring. STRIP PREFIX in **C5a (C5.0d)**. RESEARCH miscounted size as 2; actual is 6.
- **`runtime-orchestration.js:1552-1555`** — RECLASSIFIED: body documents asset-ref normalizers ctx-arrow injection (top-level-const dependency). STRIP PREFIX in **C5a (C5.0e)**. RESEARCH miscounted size as 1; actual is 4.
- **`runtime-orchestration.js:1640-1644`** — RECLASSIFIED: body documents editor draft storage + `outsideResourceAssets` staying in orchestration scope (state-ownership invariant). STRIP PREFIX in **C5a (C5.0f)**. RESEARCH miscounted size as 1; actual is 5.
- **`runtime-orchestration.js:1791-1795`** — RECLASSIFIED: body documents cross-module deps via ctx arrows so downstream destructures can land later without TDZ. STRIP PREFIX in **C5a (C5.0g)**. RESEARCH miscounted size as 1; actual is 5.
- **`runtime-orchestration.js:2200-2204`** — RECLASSIFIED: body documents deferred init order (drawRoomComposition init waits for upstream destructures). STRIP PREFIX in **C5a (C5.0h)**. RESEARCH miscounted size as 1; actual is 5.

For C1's purposes, the orchestration deletions are the entries in RESEARCH §2 marked "**DELETE WHOLE**" or "**DELETE**" with a `Phase 14-2:` prefix, **MINUS the 8 reclassified blocks above**. Revised count: **30 blocks** (was 38), totalling **~58 deleted lines** (was ~70). The 8 reclassified blocks add ~36 lines to C5a as STRIP-PREFIX edits (each block keeps its body verbatim with the `Phase 14-2:` / `Phase 14-2 reorg fix:` prefix removed from line 1). **Including: the 3-line `// Phase 14-2: viewport zoom + pan ... moved to ...` block at `runtime-orchestration.js:2594-2596`** — this is adjacent to the `Phase 13-HF4:` math derivation at `:2574-2593` (which C2 strips prefix from). C1 deletes only the 3-line `Phase 14-2:` tail; C2 strips prefix from the preceding math. See §5.3 for the disambiguation.

**Bracket-scope deletion safety (mandatory per deletion).** After each whole-block deletion in C1 Pattern B, run a 5-line context print on the *post-deletion* file and confirm the surrounding non-comment lines are intact:
```bash
sed -n '<startLine-2>,<endLine+2>p' src/app/runtime/runtime-orchestration.js
```
where `<startLine>` / `<endLine>` are computed from the **post-deletion** file state (line numbers shift as you delete from the top down — process deletions bottom-up to keep numbers stable, or recompute per deletion). The block immediately above and immediately below each deleted comment block must be unchanged from the BEFORE state. **Specifically for C1 Pattern B: the line immediately following each deleted block must be a `window.TT_BEAMER_RUNTIME_*.init(...)` call** (this is the "self-documenting" line the deletion relies on). Verify by visual inspection of every sed output. If any non-comment surrounding line differs from the BEFORE state, halt and revert that deletion.

**Pre-removal verification**
```bash
grep -rn "Phase 14-2" src/ --include="*.js" | wc -l   # baseline ~110
```

**Post-removal verification**
```bash
grep -rn "Phase 14-2" src/ --include="*.js" | wc -l   # → 0
# Carve-out residual check (header in regression-tests should also be gone — it gets the prefix-strip):
grep -n "Phase 14-2" src/app/runtime/panels/runtime-regression-tests.js   # → 0
```

**Code-untouched verification**
```bash
# PRIMARY GATE (must return empty for the commit to land):
git diff HEAD~..HEAD -- 'src/**/*.js' 'src/**/*.css' \
  | grep -E '^[+-]' \
  | grep -v -E '^[+-]\s*(//|\*|/\*|\*/)' \
  | grep -v -E '^[+-]\s*$' \
  | grep -v -E '^(---|\+\+\+)\s'
# → empty
# Preliminary fast filter (informational; not the gate):
git diff -G '^[^/*\s]' HEAD~..HEAD -- 'src/**/*.js'
```
If the **primary gate** is non-empty: the diff added/removed an executable line. Halt, inspect each non-comment hit, fix or revert.

**Adjacent smoke-test scenarios** (orchestration edits touch wide surface area)
- [ ] `node server.mjs` boots cleanly; dashboard loads; no console errors at boot.
- [ ] Switch boards via dropdown — outlines + animations refresh.
- [ ] Trigger a coded room animation (Fire). Trigger a cluster pad. Both render.
- [ ] Open `/output` — animations render; mesh warp (if grid has displacement) shows no seams.
- [ ] Open Live Editor on a running animation; opacity slider takes effect.

**Commit message**
```
refactor(24-2): strip Phase 14-2 module-header prefixes + orchestration "moved to" blocks

Module-header prefix strip on ~40 runtime modules:
  // Phase 14-2: X module.   →   // X module.

In runtime-orchestration.js, deletes 30 trivial "Phase 14-2: X moved
to Y" blocks. The window.TT_BEAMER_RUNTIME_X.init({...}) line beneath
each one is self-documenting (module name in symbol).

10 Phase-14-2 / Phase-13-HF6 blocks deferred to C5a/C5.4 because they
carry real WHY (init-order, ctx-arrow wiring, state-ownership):
:54-61, :656-659, :691-694, :756-759, :836-841, :960-969, :1552-1555,
:1640-1644, :1791-1795, :2200-2204, :2539-2543. (8 of these were
reclassified during the 2026-04-25 sweep; 2 were already SHORTEN.)

Comment-only change. No executable line touched.
Acceptance: grep -rn "Phase 14-2" src/ --include="*.js" → only the
 reclassified C5a entries remain (closed in C5a).
```

**Rollback**: `git revert <C1-sha>` — restores all ~40 module-header prefixes and the 30 orchestration blocks. Clean revert; no file moves.

---

### C2 — Strip phase-marker prefixes from in-function comments (real-WHY band)

**Files touched** (file-by-file, in this order — RESEARCH §2 marker counts in parens):

1. `src/app/runtime/runtime-orchestration.js` (~30 remaining markers post-C1)
2. `src/app/runtime/panels/runtime-fx-panels.js` (27 → ~4-6 paraphrase ones survive C2 and get deleted in C3)
3. `src/app/runtime/animation/runtime-animation-lifecycle.js` (27 → ~25 stripped)
4. `src/app/runtime/ui/animation-editor-view.js` (25; **C4 also touches this file** for `(W3b-3)` / `(W3b-4)` divider suffixes, but C2 handles in-function markers; C2 must NOT touch divider lines at 577 / 1020 / 1397)
5. `src/app/runtime/wire/runtime-wire-fx-panel-binders.js` (19)
6. `src/app/runtime/render/runtime-draw-loop.js` (18 → ~17 stripped, 1 deleted in C3)
7. `src/app/runtime/state/runtime-fx-normalizers.js` (16)
8. `src/app/runtime/viewport/runtime-viewport-zoom.js` (13)
9. `src/app/runtime/viewport/runtime-projection-mapping.js` (13)
10. `src/app/runtime/polygon-editor/runtime-polygon-editor.js` (13)
11. `src/app/runtime/animation/runtime-runtime-controls.js` (10)
12. `src/app/runtime/animation/runtime-quick-mode.js` (10)
13. `src/app/runtime/wire/runtime-wire-room-audio-binders.js` (9)
14. `src/app/runtime/viewport/runtime-polygon-drag-support.js` (7)
15. `src/app/runtime/core/runtime-dom-refs.js` (7)
16. The 22 long-tail JS files at 2–6 markers each (RESEARCH §2 tail).
17. The 25 long-tail JS files at 1 marker each (RESEARCH §2 tail; most already handled in C1 if it was a header).

---

**Sub-split (mandatory).** C2 lands as **5 thematic sub-commits** (C2.1 → C2.5), each independently revertable, mirroring Wave 1's C5 thematic pattern. Each sub-commit has its own pre/post grep + per-file BEFORE/AFTER spot check + adjacent regression scenarios.

**C2.1 — orchestration alone**
- Files: `src/app/runtime/runtime-orchestration.js`
- Why isolated: highest blast radius (boot path, wiring); regressions surface immediately on `node server.mjs`.
- Pre-grep: `grep -cE "Phase\s*[0-9]+|Wave\s*[0-9]+|\bHF[0-9]+\b|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+" src/app/runtime/runtime-orchestration.js` → ~30 (post-C1).
- Post-grep: same command → ~22 (excluding the C3-DELETE pool [~17] and C5-SHORTEN [~5]; the C2.1 strip-prefix band is ~8 markers).
- Per-file primary-gate check: empty.
- BEFORE/AFTER spot check: every entry in RESEARCH §2's STRIP PREFIX band for this file, manually verified.
- Adjacent regression: boot dashboard, switch boards, trigger one coded room animation + one cluster pad, open `/output` (mesh warp visible).
- Commit: `refactor(24-2.1): strip in-function phase-marker prefixes — orchestration`

**C2.2 — animation cluster**
- Files: `src/app/runtime/animation/runtime-animation-lifecycle.js`, `src/app/runtime/ui/animation-editor-view.js`, `src/app/runtime/render/runtime-draw-loop.js`
- Why grouped: tight render-pipeline coupling; rendering correctness verifiable as one smoke pass.
- Pre-grep / post-grep: per-file marker counts before and after; cluster-aggregate count before/after.
- Per-file primary-gate check: empty for each file. Stage files independently inside this commit.
- BEFORE/AFTER spot check: animation-editor-view's load-bearing entries (esp. divider lines must NOT be touched — those are C4); draw-loop's hull-flicker / solid-color rationale (lines 114-118, 125-132) intact.
- Adjacent regression: trigger room + cluster animations; cluster type-aware toggle (arm Fire → tap, arm Scanning → tap; only fire stops, scanning continues); hull-flicker + solid-color stack with `breaksSolidColor=true`; `/output` mesh warp.
- Commit: `refactor(24-2.2): strip in-function phase-marker prefixes — animation cluster`

**C2.3 — viewport cluster**
- Files: `src/app/runtime/viewport/runtime-viewport-zoom.js`, `src/app/runtime/viewport/runtime-projection-mapping.js`, `src/app/runtime/viewport/runtime-polygon-drag-support.js`
- Why grouped: pan/zoom/drag perf path; regressions surface as visible jitter on mobile gesture.
- Note: `:310-322` (viewport-zoom duplicate-math), `:160-162` (ABI-stable shim), `:219-225` (drag heavy-interaction lifecycle) are SHORTEN candidates → defer to C5; this sub-commit only strips the non-SHORTEN markers.
- Per-file primary-gate check: empty for each file.
- Adjacent regression: pinch-zoom on dashboard; pan; drag a polygon vertex; verify SVG-incremental render path; `/output` mesh warp + projection corners.
- Commit: `refactor(24-2.3): strip in-function phase-marker prefixes — viewport cluster`

**C2.4 — FX cluster**
- Files: `src/app/runtime/panels/runtime-fx-panels.js`, `src/app/runtime/state/runtime-fx-normalizers.js`, `src/app/runtime/wire/runtime-wire-fx-panel-binders.js`
- Why grouped: Settings / Live Editor surface; regressions surface as a panel failing to open or controls failing to bind.
- Note: fx-panels' ~10 paraphrase-comments (RESEARCH §3 DELETE band) are NOT touched in C2.4 — they go in C3.
- Per-file primary-gate check: empty for each file.
- Adjacent regression: open Settings → Inside / Outside / Room subtabs; rename input + icon picker function in each; open Live Editor on a running animation; toggle opacity / intensity / speed sliders.
- Commit: `refactor(24-2.4): strip in-function phase-marker prefixes — fx cluster`

**C2.5 — long-tail (everything else)**
- Files: `src/app/runtime/animation/runtime-runtime-controls.js`, `src/app/runtime/animation/runtime-quick-mode.js`, `src/app/runtime/wire/runtime-wire-room-audio-binders.js`, `src/app/runtime/core/runtime-dom-refs.js`, `src/app/runtime/animation/runtime-room-management.js`, `src/app/runtime/animation/runtime-room-dispatch.js`, `src/app/runtime/live-sync/runtime-live-sync-core.js`, `src/app/runtime/runtime-bootstrap.js`, `src/app/runtime/polygon-editor/runtime-polygon-editor.js`, plus all 22 long-tail files at 2-6 markers + 25 long-tail at 1 marker (RESEARCH §2 tail).
- Why last: low individual blast radius; bulk of the file count, low per-file complexity.
- Per-file primary-gate check: empty for each file. Stage files in groups of ~5 inside this commit; check primary gate after each group.
- Adjacent regression: full broad smoke (boot + boards + room animation + cluster + Live Editor + `/output`).
- Commit: `refactor(24-2.5): strip in-function phase-marker prefixes — long-tail`

**Aggregate post-C2 verification (after all 5 sub-commits land):**
```bash
grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|\bHF[0-9]+\b|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+|^\s*//\s*v[0-9]+:" src/ --include="*.js" \
  | grep -v "src/app/runtime/panels/runtime-regression-tests.js" \
  | wc -l
# → ~30 (the C3-DELETE pool + C5-SHORTEN markers; not yet zero — C3 + C5 close the gap)
```

Each sub-commit has its own primary-gate (strong `grep -v` chain) check showing empty. Each sub-commit independently revertable: `git revert <C2.N-sha>`. The C2 commit-message and rollback notes below describe the **aggregate** of C2.1–C2.5; the per-sub-commit messages above are the actual landed commit titles.

---

**What changes — patterns**

**Pattern A — strip leading marker token** (most common):

BEFORE:
```js
// Phase 22 W5 v3: WebGL mesh-warp state. The 2D-canvas per-triangle clip+drawImage approach
// produced seams because per-triangle affine transforms and clip-boundary AA disagree at
// shared edges. GL samples a single texture with per-vertex UVs — no clipping, no seam.
```
AFTER:
```js
// WebGL mesh-warp state. The 2D-canvas per-triangle clip+drawImage approach
// produced seams because per-triangle affine transforms and clip-boundary AA disagree at
// shared edges. GL samples a single texture with per-vertex UVs — no clipping, no seam.
```

The full body — every load-bearing WHY — stays. Only the `Phase X[ W Y[ vZ]]:` token at the start of the first comment line goes. If stripping the token leaves a stray space after `//`, the preferred form is `// Word…` (single space).

**Pattern B — strip token, line becomes empty → delete the whole line**:

BEFORE:
```js
  // Phase 22 W3a:
  someStatement();
```
AFTER:
```js
  someStatement();
```

If the marker is the entire comment, the line is dead. Delete it (and any blank line that precedes it solely because of the comment).

**Pattern C — multi-marker line** (rare; 2 sites in `runtime-draw-loop.js:711-719` and `runtime-animation-lifecycle.js:1143-1156`):

These are SHORTEN candidates and belong to C5, not C2. **Skip them in C2** — leave the `Phase 13-HF7:` / `Phase 13-HF8:` and the dual `Phase 23 W2:` / `Phase 23 W2 v6:` markers in place. C5 will rewrite them.

**Load-bearing markers that MUST get prefix-only strip** (executor checklist — re-read the body before editing each, confirm the kernel is real WHY).

For each entry below, the **AFTER body kernel** is the sentence(s) that MUST survive in the comment after prefix strip. INVENTORY.md verifies by quoting the surviving body against the planned kernel; if the kernel is missing or paraphrased away, the edit failed and must be reverted.

From RESEARCH §6a (the ~10 critical sites):
- [ ] `runtime-orchestration.js:385-390` — `Phase 22 W2e:` `QUICK_MODE_VALUES`. Strip prefix only.
  AFTER body kernel: "Back-compat: 'activate' / 'deactivate' must remain valid quick-mode values so existing snapshots still load."
- [ ] `runtime-projection-mapping.js:159-163` — `Phase 22 W5 v3:` GL state. Strip prefix only.
  AFTER body kernel: "WebGL fallback exists because the 2D-canvas affine path produces faint colour seams on textured sources; GL samples one texture with per-vertex UVs — no clipping, no seam."
- [ ] `runtime-projection-mapping.js:197-202` — `Phase 22 W5 v3:` lean GL options for RPi. Strip prefix only.
  AFTER body kernel: "Lean GL options (no antialias, preserveDrawingBuffer:false, powerPreference:'low-power') are tuned for RPi — the default options blow the per-frame budget."
- [ ] `runtime-viewport-zoom.js:160-162` — `Phase 13-2:` ABI-stable shim. *(Also a SHORTEN candidate — defer to C5.)*
  AFTER body kernel (post-C5.8): "Kept for ABI stability of ~20 call sites: refreshes the status line and the stage transform without writing to a slider/label."
- [ ] `runtime-runtime-controls.js:275-284` — `Phase 21-1:` snapshot fields onto running instance. Strip prefix only.
  AFTER body kernel: "Snapshot the definition's fields onto the running instance so the Live Editor's edit target is the running instance, not the definition; otherwise edits leak across animation triggers."
- [ ] `runtime-fx-normalizers.js:40-47` — `Phase 22 W3a:` icon key normalizer + boot-order tolerance. Strip prefix only.
  AFTER body kernel: "Icon key normaliser must tolerate missing-on-boot state — definitions can load before icon registry; fallback to default until registry resolves."
- [ ] `runtime-draw-loop.js:114-118` — `Phase 21-1:` opt-in hull-flicker → solid-color coupling. Strip prefix only.
  AFTER body kernel: "When `breaksSolidColor=true` and a solid-color animation is also running, hull-flicker delivers itself by gating the solid-color overlay rather than drawing on top — prevents double overlay."
- [ ] `runtime-draw-loop.js:125-132` — `Phase 21-1:` flicker via gating, not overlay. Strip prefix only.
  AFTER body kernel: "Flicker is delivered via the solid-color gate (above), not as a separate overlay pass — adding an overlay pass would double-blend with solid-color and clip the AA at room edges."
- [ ] `runtime-fx-panels.js:16-21` — `Phase 20:` separate "editing" from "playing" outside animation. Strip prefix only.
  AFTER body kernel: "The 'editing' definition is the user's draft; the 'playing' definition is the running instance. They must be tracked separately so opening the editor on a running animation doesn't clobber the running state."
- [ ] `runtime-orchestration.js:359-366` — `Phase 13-HF13:` stable stretch-anchor cache. Strip prefix only; keep planning-doc URL on line 366 verbatim.
  AFTER body kernel: "Stable stretch-anchor cache: the per-board anchor coords MUST be cached and re-used across pan/zoom; recomputing per frame produces visible drift. (See planning-doc URL for derivation.)"

From RESEARCH §2 "STRIP PREFIX, KEEP BODY" (the larger band — ~22 entries). Each entry's AFTER body kernel is a one-line summary of the WHY that MUST survive; the executor verifies the surviving body contains the kernel sentence (paraphrase OK; deletion NOT OK):
- [ ] `runtime-projection-mapping.js:74-77` — kernel: "remap() reads from the warp grid, not the corners — corners are user-edited inputs; the grid is the rendered representation."
- [ ] `runtime-projection-mapping.js:290-293` — kernel: "barycentric remap exists because affine remap produces fold-back at near-degenerate triangles."
- [ ] `runtime-projection-mapping.js:384-386` — kernel: "drawAffineTriangle is preferred over drawImage rect-mapping because rect-mapping only handles axis-aligned rotations."
- [ ] `runtime-projection-mapping.js:426-435` — kernel: "WebGL post-draw warp replaces the begin/end grid warp because per-triangle clip+drawImage produced visible seams at shared edges."
- [ ] `runtime-projection-mapping.js:480-482` — kernel: "render the grid only when changed: per-frame remap is too expensive on RPi."
- [ ] `runtime-projection-mapping.js:484-487` — kernel: "skip render if grid unchanged AND no upstream redraw — gates the GL draw to user-input frames."
- [ ] `runtime-viewport-zoom.js:36-39` — kernel: "min/max zoom clamps prevent UI lock-up on touch overshoot."
- [ ] `runtime-viewport-zoom.js:108-111` — kernel: "anchor-based zoom keeps the cursor (or pinch centre) stationary in world space across the zoom step."
- [ ] `runtime-viewport-zoom.js:116-119` — kernel: "absolute zoom set is preferred over delta application during pinch — delta drift accumulates."
- [ ] `runtime-viewport-zoom.js:136-139` — kernel: "wheel deltaY uses logarithmic step so high-DPI mice don't blast through zoom range."
- [ ] `runtime-viewport-zoom.js:259-262` — kernel: "pan offset is clamped post-zoom: zooming in near a board edge would otherwise leave the user looking at empty space."
- [ ] `runtime-viewport-zoom.js:310-322` — kernel: "zoom-around-anchor math (full derivation): newOffset = anchor - (anchor - oldOffset) * (newZoom / oldZoom). Duplicated in orchestration for callers." *(Wave 3 dedupes at code level. Per §5.3: this site has only the `Phase 13-HF4:` prefix — no `Phase 14-2:` tail to delete.)*
- [ ] `runtime-polygon-drag-support.js:49-51` — kernel: "drag uses pointer capture so leaving the document stops the gesture — touch-leave doesn't fire reliably on Safari/iOS."
- [ ] `runtime-polygon-drag-support.js:67-72` — kernel: "vertex move tolerance is in screen pixels (not world units) so high-zoom edits don't snap to neighbours."
- [ ] `runtime-polygon-drag-support.js:129-132` — kernel: "edge-insert hit-test uses Möller perpendicular distance: the simpler box test produces false-misses on near-vertical edges."
- [ ] `runtime-polygon-drag-support.js:198-201` — kernel: "rotate gesture uses two-finger angular delta — single-finger rotate would conflict with pan."
- [ ] `runtime-polygon-drag-support.js:219-225` — kernel: "heavy-interaction flag pauses the draw loop's render pipeline so polygon edit gestures stay smooth (see runtime-draw-loop.js's heavy-interaction guard)." *(Also SHORTEN — see C5.10.)*
- [ ] `runtime-polygon-drag-support.js:250-253` — kernel: "undo snapshot is taken on pointerdown (not pointerup) so cancel-during-drag still restores."
- [ ] `runtime-draw-loop.js:346-349` — kernel: "P12-1 render layering rule: outline → fill → flicker → overlay → cursor; reordering produces z-order glitches at room overlap."
- [ ] `runtime-draw-loop.js:705-707` — kernel: "pause guard at top of draw() — see heavy-interaction lifecycle in polygon-drag-support."
- [ ] `runtime-draw-loop.js:726-729` — kernel: "loading-overlay rendered separately from animation pipeline so it survives a paused animation render."
- [ ] `runtime-draw-loop.js:552-559` — kernel: "cluster pad ticks live inside the room render loop so cluster-relative positions stay synced with pan/zoom."
- [ ] `runtime-draw-loop.js:569-571` — kernel: "cluster pad fast-path skip when no clusters — avoids full DOM walk per frame."
- [ ] `runtime-draw-loop.js:771-775` — kernel: "post-draw mesh warp is invoked exactly once per frame after all room layers — repeating per layer breaks composition."
- [ ] `runtime-draw-loop.js:794-798` — kernel: "mesh-warp consumer must be a function; null-coalesce so non-warped boards skip cleanly."
- [ ] `runtime-animation-lifecycle.js` (~18 entries from `:23-30` through `:1278-1281`) — kernels: each entry preserves the WHY behind its specific code site. Sample kernels: `:23-30` "lifecycle is keyed by `(scope, defId)` so the same definition triggered twice produces two instances"; `:419-421` "graceful-stop path waits for sample 'ended' event"; `:740-744` "live-sync replay uses snapshot definition ids, not instance ids — instance ids regenerate per replay"; `:1278-1281` "outside-MP4 audio decoupled from video element so video pause doesn't stop ambient track". Executor enumerates every entry's kernel in INVENTORY.md.
- [ ] `runtime-fx-panels.js:16-21` — kernel: see §6a entry above (separate editing from playing).
- [ ] `runtime-fx-panels.js:38-43` — kernel: "panel mount is idempotent — re-mounting on resize must not duplicate listeners."
- [ ] `runtime-fx-panels.js:208-211` — kernel: "rename input value mirrors the selected definition; controlled-input write triggers the dirty comparator."
- [ ] `runtime-fx-panels.js:407` — kernel (single-line): "icon picker delegates to global registry; do not embed the icon list here."
- [ ] `runtime-fx-panels.js:442-444` — kernel: "Settings panel context-switch must clear the rename-input value to prevent stale carry-over."
- [ ] `runtime-fx-panels.js:802-806` — kernel: "outside variant uses optimistic-apply (see wire-fx-panel-binders) — local state updates first, server roundtrip second."
- [ ] `runtime-fx-panels.js:893` — kernel (single-line): "outside icon picker root pinned here so re-mounts on tab switch don't re-create it."
- [ ] `runtime-wire-fx-panel-binders.js:486` — kernel: "optimistic apply: send patch + locally-update; revert on server reject. Without this, slider drag feels laggy."
- [ ] `runtime-wire-fx-panel-binders.js:533, 613, 716, 863` — kernels: each is a binder mount-site doc; "icon picker root mount is here because the panel ctx owns the parent DOM; mounting elsewhere would orphan the listeners."
- [ ] `runtime-orchestration.js:2065-2068` — kernel: "board-picker no-switch rule: clicking the active board does NOT trigger a board switch (would clobber unsaved Live Editor state)."
- [ ] `runtime-orchestration.js:2085-2087` — *(DELETE in C3 per the note below — not a STRIP-PREFIX entry.)*
- [ ] `runtime-orchestration.js:2326-2328` — kernel: "Live Editor getter has back-compat: if instance.solidColorBaseRgb is missing, derive from the running solid-color animation; older snapshots used a different field."
- NOTE: `:2073-2079` and `:173-177` are SHORTEN — defer to C5 (C5.2, C5.3); `:2085-2087, :2348-2349, :2315-2316, :2890-2891, :2351-2353, :2480-2481, :2482-2483, :2795-2796, :2254-2256, :1737-1740, :1696-1697, :1895-1896, :3092-3093, :3103-3104, :309-310, :319-321, :336-338, :79-80, :81-86, :100-102, :2065-2068 [the W3b-3 dup], :277, :2480-2481` are DELETE — defer to C3.

**Test-file carve-out** (RESEARCH §6f + §5.1 hard-coded table). The runtime-regression-tests.js file has exactly 3 marker hits. Per §5.1's per-line table:
- [ ] **Line 1** — already handled in C1 (STRIP PREFIX). No change in C2.
- [ ] **Line 112** — **C2 must NOT touch this comment** (KEEP entire comment incl. `Phase 18:` prefix per §5.1).
- [ ] **Line 463** (8-line block ending at 471) — **C2 must NOT touch this comment** (KEEP entire comment incl. `Phase 21-1:` prefix per §5.1).

If `grep -n "Phase\s\|HF\d" src/app/runtime/panels/runtime-regression-tests.js` returns anything other than these 3 lines after this wave, the executor halts: either C2 accidentally touched a KEEP line, or new markers were introduced since planning.

INVENTORY.md "Carve-out: regression-tests touched lines" must reproduce the §5.1 3-row table verbatim — the executor does not re-classify.

**Pre-removal verification**
```bash
grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|\bHF[0-9]+\b|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+|^\s*//\s*v[0-9]+:" src/ --include="*.js" | wc -l
# Post-C1: ~324 (~110 less than 434).
```

**Post-removal verification**
```bash
# Aggregate: post-C2 should be ~30 (only the C3-DELETE band remains, plus C5-SHORTEN markers, plus the regression-tests carve-out keepers).
grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|\bHF[0-9]+\b|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+|^\s*//\s*v[0-9]+:" src/ --include="*.js" \
  | grep -v "src/app/runtime/panels/runtime-regression-tests.js" \
  | wc -l
# → ~30 (the C3-DELETE pool + C5-SHORTEN markers; not yet zero)
```

**Code-untouched verification (per file, per save)**
```bash
# PRIMARY GATE (must return empty before staging this file):
git diff HEAD -- <file_being_edited> \
  | grep -E '^[+-]' \
  | grep -v -E '^[+-]\s*(//|\*|/\*|\*/)' \
  | grep -v -E '^[+-]\s*$' \
  | grep -v -E '^(---|\+\+\+)\s'
# → empty
# Preliminary fast filter (informational; not the gate):
git diff -G '^[^/*\s]' HEAD -- <file_being_edited>
```
If the **primary gate** is non-empty: a non-comment line was added/removed (most likely a string literal containing "Phase X" or "v2", or an accidentally edited code line). Halt, inspect, manually edit only the comment line.

**Per-file granularity (mandatory):** stage each file independently inside this commit. After editing each top-5 file (orchestration, fx-panels, animation-lifecycle, animation-editor-view, wire-fx-panel-binders), run the per-file **primary gate** (the strong `grep -v` chain shown above) before moving on. Stage all files as one commit only after every file passes the primary gate.

**Adjacent smoke-test scenarios** (broad — touches every major area)
- [ ] **After orchestration edits:** `node server.mjs` boots, dashboard loads.
- [ ] **After fx-panels edits:** open Settings → Inside / Outside / Room subtabs; each opens without console error; rename input + icon picker function in each.
- [ ] **After animation-lifecycle edits:** trigger a room animation; trigger a cluster pad; verify cluster type-aware toggle (arm Fire → tap, arm Scanning → tap, arm Fire → tap; only fire stops, scanning continues).
- [ ] **After animation-editor-view edits:** open editor; switch scope (Inside / Outside / Room); edit Mode + Direction for an Outside coded animation.
- [ ] **After draw-loop edits:** verify hull-flicker + solid-color stack (run hull-flicker in a room with `breaksSolidColor=true` while solid-color is also running — solid-color must gate, not double up).
- [ ] **After viewport-zoom / projection-mapping edits:** `/output` mesh warp visible without seams; pan + pinch zoom on dashboard works.

**Commit messages (5 atomic sub-commits — see sub-split above for per-commit details)**

C2 lands as five commits whose messages follow this template (one per sub-commit):
```
refactor(24-2.N): strip in-function phase-marker prefixes — <cluster>

Strips "Phase X[-Y]:", "Phase X W Y[-Z]:", "HFn:", "Pxx-yy:" prefixes
from in-function comments in the <cluster> files. Comment bodies (the
load-bearing WHY) are preserved verbatim.

Markers in runtime-regression-tests.js fix-documenting blocks are
preserved per the test-file carve-out (RESEARCH §6f).

Markers slated for whole-comment delete (paraphrase pattern) defer to
C3. Markers in long blocks needing manual rewrite defer to C5.

Comment-only change. No executable line touched.
```

**Rollback**: each sub-commit is independently revertable — `git revert <C2.N-sha>` restores that cluster's prefixes only. Reverting C2.1–C2.5 in any order leaves the rest of the wave intact.

---

### C3 — Delete redundant comments (paraphrase-the-code pattern)

**Files touched**

- `src/app/runtime/runtime-orchestration.js` (~18 deletions — original ~17 + the :2535-2537 zoom-slider-removed block per Warning 10)
- `src/app/runtime/panels/runtime-fx-panels.js` (~10 deletions)
- `src/app/runtime/render/runtime-draw-loop.js` (1 deletion)
- `src/app/runtime/animation/runtime-animation-lifecycle.js` (1 deletion)
- (a few stragglers from RESEARCH §2's "**DELETE**" entries that also marked "redundant")

**What changes — every entry from RESEARCH §3 marked DELETE, by file:line**

`runtime-fx-panels.js` (10):
- [ ] `:238` — `// Phase 18-2: update mode indicator badge` → DELETE (mode-indicator if/else block self-evident)
- [ ] `:462` — `// Phase 18-2: update mode indicator badge and delete button visibility` → DELETE
- [ ] `:840` — `// Phase 18-2: update mode indicator badge` → DELETE
- [ ] `:227-230` — `// Phase 21-1: keep the rename input in sync with the selected def.` (inside variant) → DELETE (variable name + assignment is the comment)
- [ ] `:475` — same comment, room variant → DELETE
- [ ] `:830` — same comment, outside variant → DELETE
- [ ] `:231` — `// Phase 22 W3a: reflect selected definition's icon in the picker.` → DELETE
- [ ] `:479` — same, room → DELETE
- [ ] `:834` — same, outside → DELETE
- [ ] `:299` and `:744` — `Phase 20: one dashboard button per outside animation definition.` / `Phase 20: wire the two-tab switcher in every animation section.` → DELETE (loop / wire is self-evident)

`runtime-orchestration.js` (~18):
- [ ] `:79-80` — `// Phase 22 W3a: animation icon picker roots (Inside / Outside / Room).` → DELETE (names self-evident)
- [ ] `:81-86` — `// Phase 22 W3b: full-page animation editor DOM refs.` → DELETE
- [ ] `:100-102` — `// Phase 22 W2b: topbar elements …` → DELETE
- [ ] `:277` — `// Phase 19-2: projection mapping align mode integration` → DELETE (sub-block label)
- [ ] `:309-310` — `// Phase 19-2: projection mapping — 4-corner warp for /output.` → DELETE (module name says it)
- [ ] `:319-321` — `// Phase 19-2: persist projection corners …` → DELETE
- [ ] `:336-338` — `// Phase 19-4: post-draw mesh warp (replaces begin/end grid warp)` → DELETE ("replaces X" is dead history)
- [ ] `:1696-1697` — `// Phase 22 W3a: icon picker roots threaded into the fx-panel ctx.` → DELETE
- [ ] `:1737-1740` — `// Phase 21-1: needed to detect "hull-flicker" backbone …` → DELETE (function name says it)
- [ ] `:1895-1896` — `// Phase 22 W2b: topbar brand sub-line mirrors the board label.` → DELETE
- [ ] `:2085-2087` — `// Phase 22 W3b-3: needed by the Room color card to detect solid-color / hull-flicker coded effects.` → DELETE
- [ ] `:2254-2256` — `// Phase 22 W2b: topbar running-count chip refs, consumed by …` → DELETE
- [ ] `:2315-2316` — `// Phase 21-1: Live Editor needs this to detect the solid-color coded effect.` → DELETE
- [ ] `:2348-2349` — `// Phase 21-1: needed by the Active Animations list …` → DELETE
- [ ] `:2351-2353` — `// Phase 23 W2: cluster pads need access to …` → DELETE (mostly paraphrase; RESEARCH §2 marks "recommend DELETE")
- [ ] `:2480-2481` — `// Phase 19-4: post-draw mesh warp (unified grid projection)` → DELETE
- [ ] `:2482-2483` — `// Phase 23 W2 v7: cluster pads need the room polygon pixels …` → DELETE
- [ ] `:2795-2796` — `// Phase 22 W3a: icon-picker roots consumed by the mount() calls in fx-panel binders.` → DELETE
- [ ] `:2890-2891` — `// Phase 21-1: called by commitRoomDraftToDefinition …` → DELETE
- [ ] `:3092-3093` — `// Phase 19-2: recompute projection mapping on resize` → DELETE
- [ ] `:3103-3104` — `// Phase 18: initialize slider touch guard …` → DELETE
- [ ] `:2535-2537` — `// Phase 13-2: zoom slider removed. Wheel + pinch gestures below replace it. // Mouse wheel over the stage: exponential scale delta, cursor-anchored. // Two-finger pinch: midpoint-anchored scale via pointer pair distance ratio.` → DELETE WHOLE (3 lines). RESEARCH §2 line 156 marks this as DELETE; the body is "wheel + pinch replace removed slider" — pure history (slider is gone, so "removed" is dead context) plus paraphrase ("wheel = exponential scale" is what the code does). The two `addEventListener('wheel'/'pointerdown')` blocks immediately below are self-documenting.

`runtime-draw-loop.js` (1):
- [ ] `:768-770` — `// Phase 19-4: post-draw mesh warp — deform canvas through grid if needed` → DELETE (paraphrases `ctx.postDrawMeshWarp?.(...)` immediately below)

`runtime-animation-lifecycle.js` (1):
- [ ] `:1135-1137` — `// Phase 23 W2: cluster pads share the same state-driven update pipeline …` → DELETE (one line, marginal — RESEARCH §2 says "**STRIP PREFIX** or **DELETE**, marginal"; here we DELETE since `try { renderClusterPads(); }` is self-evident)

**Conservatism rule (executor must follow):** when in doubt, KEEP the comment with prefix already stripped (i.e. it survives in C2). Only delete if the comment genuinely paraphrases the immediately-following identifier and adds zero information.

**Bracket-scope deletion safety (mandatory per deletion).** After each paraphrase-comment deletion in C3, run a 5-line context print on the *post-deletion* file and confirm the surrounding non-comment lines are intact:
```bash
sed -n '<startLine-2>,<endLine+2>p' <file>
```
where `<startLine>` / `<endLine>` are computed from the **post-deletion** file state (process deletions bottom-up to keep line numbers stable, or recompute per deletion). The lines immediately above and below each deleted comment must be the same non-comment statements that were there before the deletion. Halt and revert if any surrounding non-comment line differs from the BEFORE state. (~30 deletions across the C3 set; one sed-print per deletion.)

**Pre-removal verification**
```bash
# Sanity: each deletion target is currently a comment-only line (or block).
# Use sed -n '238,238p' or rg --line-number to inspect each location before editing.
```

**Post-removal verification**
```bash
# Total marker count after C3 should be ~0 (only C5-SHORTEN remains, plus regression-tests carve-out).
grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|\bHF[0-9]+\b|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+|^\s*//\s*v[0-9]+:" src/ --include="*.js" \
  | grep -v "src/app/runtime/panels/runtime-regression-tests.js" \
  | wc -l
# → ≤ 12 (the C5-SHORTEN list)
```

**Code-untouched verification**
```bash
# PRIMARY GATE (must return empty for the commit to land):
git diff HEAD~..HEAD -- 'src/**/*.js' 'src/**/*.css' \
  | grep -E '^[+-]' \
  | grep -v -E '^[+-]\s*(//|\*|/\*|\*/)' \
  | grep -v -E '^[+-]\s*$' \
  | grep -v -E '^(---|\+\+\+)\s'
# → empty
# Preliminary fast filter (informational; not the gate):
git diff -G '^[^/*\s]' HEAD~..HEAD -- 'src/**/*.js'
```

**Adjacent smoke-test scenarios**
- [ ] Open Live Editor on a running animation; rename a definition; pick a different icon; verify all three controls update.
- [ ] Open `/output`; mesh warp renders without seams.
- [ ] Trigger Slime, Malfunction (GIF), Fire (coded), an MP4 — each renders.
- [ ] Resize browser window; projection mapping recomputes (no console error).

**Commit message**
```
refactor(24-2): delete redundant comments that paraphrase code beneath

Removes ~30 single-line "// Phase X: <what the next identifier already
says>" comments concentrated in:
  runtime-orchestration.js   ~18 deletions
  runtime-fx-panels.js       ~10 deletions
  runtime-draw-loop.js        1 deletion
  runtime-animation-lifecycle.js 1 deletion

Pattern is "// Phase X: needed by Y" → `Y: (...) => Y(...)`. The
identifier name carries the same information.

Comment-only change. No executable line touched.
```

**Rollback**: `git revert <C3-sha>` — restores all ~30 comments. Clean revert.

---

### C4 — Strip W3b suffixes from `animation-editor-view.js` section dividers

**Files touched**
- `src/app/runtime/ui/animation-editor-view.js`

**What changes** (RESEARCH §5)

3 divider lines + 1 `// =====` block:

- [ ] **Line 577**:
  BEFORE: `// -------- Scope-specific cards (W3b-3) --------------------------`
  AFTER:  `// -------- Scope-specific cards --------------------------`
- [ ] **Line 1020**:
  BEFORE: `// -------- Preview column (W3b-4) ---------------------------------`
  AFTER:  `// -------- Preview column ---------------------------------`
- [ ] **Line 1397**:
  BEFORE: `// -------- Create + Delete (W3b-4) --------------------------------`
  AFTER:  `// -------- Create + Delete --------------------------------`
- [ ] **Lines 253-256** (`// =====` block):
  BEFORE:
  ```
  // =====
  // W3b-2 — editor pane: Identity + Defaults cards.
  // =====
  ```
  AFTER:
  ```
  // =====
  // editor pane: Identity + Defaults cards.
  // =====
  ```

**Pre-removal verification**
```bash
grep -n "(W3b" src/app/runtime/ui/animation-editor-view.js   # expect 3
grep -n "W3b-2 —" src/app/runtime/ui/animation-editor-view.js   # expect 1
```

**Post-removal verification**
```bash
grep -n "W3b" src/app/runtime/ui/animation-editor-view.js   # → 0
```

**Code-untouched verification**
```bash
# PRIMARY GATE (must return empty for the commit to land):
git diff HEAD~..HEAD -- src/app/runtime/ui/animation-editor-view.js \
  | grep -E '^[+-]' \
  | grep -v -E '^[+-]\s*(//|\*|/\*|\*/)' \
  | grep -v -E '^[+-]\s*$' \
  | grep -v -E '^(---|\+\+\+)\s'
# → empty
# Preliminary fast filter (informational; not the gate):
git diff -G '^[^/*\s]' HEAD~..HEAD -- src/app/runtime/ui/animation-editor-view.js
```

**Adjacent smoke-test scenarios**
- [ ] Open Animation Editor; switch scope (Inside / Outside / Room); each scope's cards render.
- [ ] Edit a Defaults card field; preview column updates.
- [ ] Click Create; click Delete on a definition; confirmation works.
- [ ] Click Back with unsaved edits; `window.confirm` blocks exit.

**Commit message**
```
refactor(24-2): strip W3b- suffixes from animation-editor section dividers

Cleans up 3 section divider lines and 1 // ===== block in
animation-editor-view.js that still carry "(W3b-3)", "(W3b-4)", or
"W3b-2 —" wave-marker prefixes. Divider semantics (which card the
section is) preserved.

Comment-only change. No executable line touched.
```

**Rollback**: `git revert <C4-sha>` — restores 4 markers. Clean revert.

---

### C5 — Long-block manual shortening (2 atomic sub-commits: C5a + C5b)

C5 lands as **two atomic sub-commits**, each independently revertable:
- **C5a** — orchestration's 5 blocks (C5.0, C5.1, C5.2, C5.3, C5.4). All edits live in `src/app/runtime/runtime-orchestration.js`. One file, one revert target.
- **C5b** — the remaining 7 blocks (C5.5 through C5.11). Spans 6 files: `runtime-runtime-controls.js`, `runtime-animation-lifecycle.js`, `runtime-draw-loop.js`, `runtime-viewport-zoom.js` (2 blocks), `runtime-polygon-drag-support.js`, `icons.js`. Independent of C5a.

**Files touched** (per RESEARCH §4B + §2 SHORTEN entries + load-bearing-WHY ambiguity resolution)

- `src/app/runtime/runtime-orchestration.js` (13 blocks: **C5.0** at :54-61 + **C5.0a** at :656-659 + **C5.0b** at :691-694 + **C5.0c** at :756-759 + **C5.0d** at :836-841 + **C5.1** at :960-969 + **C5.0e** at :1552-1555 + **C5.0f** at :1640-1644 + **C5.0g** at :1791-1795 + **C5.0h** at :2200-2204 + **C5.2** at :2073-2079 + **C5.3** at :173-177 + **C5.4** at :2539-2543) — **all 13 land in C5a**. C5.0a–C5.0h were added during the 2026-04-25 sweep when their bodies were found to carry load-bearing init-order / wiring / state-ownership constraints (originally classified DELETE WHOLE in C1).
- `src/app/runtime/animation/runtime-runtime-controls.js` (1 block — C5.5) — C5b.
- `src/app/runtime/animation/runtime-animation-lifecycle.js` (1 block — C5.6) — C5b.
- `src/app/runtime/render/runtime-draw-loop.js` (1 block — C5.7) — C5b.
- `src/app/runtime/viewport/runtime-viewport-zoom.js` (2 blocks — C5.8, C5.9) — C5b.
- `src/app/runtime/viewport/runtime-polygon-drag-support.js` (1 block — C5.10) — C5b.
- `src/app/runtime/icons.js` (1 block — C5.11) — C5b.

Total long-block rewrites: **20** (was 12; +8 from the sweep — C5.0a–C5.0h are STRIP-PREFIX edits, body kept verbatim, no manual rewriting).

**What changes — per-block BEFORE → AFTER (executor lands these texts verbatim)**

---

### C5a — orchestration long-block shortening (sub-commit 1 of 2)

Files: `src/app/runtime/runtime-orchestration.js` only.
Blocks: C5.0, C5.0a, C5.0b, C5.0c, C5.0d, C5.0e, C5.0f, C5.0g, C5.0h, C5.1, C5.2, C5.3, C5.4 (13 entries: 5 multi-paragraph rewrites + 8 STRIP-PREFIX edits added per the 2026-04-25 sweep). The 8 STRIP-PREFIX entries (C5.0a–C5.0h) were originally in C1 as DELETE WHOLE; they were reclassified once their bodies were found to document load-bearing init-order / wiring / state-ownership constraints. **Edit order within C5a: bottom-up by line number** (so earlier line numbers don't shift): C5.4 (:2539) → C5.0h (:2200) → C5.2 (:2073) → C5.0g (:1791) → C5.0f (:1640) → C5.0e (:1552) → C5.1 (:960) → C5.0d (:836) → C5.0c (:756) → C5.0b (:691) → C5.0a (:656) → C5.3 (:173) → C5.0 (:54).

#### C5.0 — `runtime-orchestration.js:54-61` (init-order ReferenceError constraint — RESEARCH ambiguity resolution)

This 8-line block documents a real `ReferenceError` constraint about `normalizeSpecialPolygon` / `isValidSpecialPolygon` destructuring. RESEARCH gave three contradictory verdicts on whether to keep, strip, or delete it. **Resolution: STRIP PREFIX, BODY KEPT** — this is a real WHY about module-load wiring order, not history.

BEFORE (8 lines):
```js
// Phase 14-2 reorg fix: orchestration must destructure
// normalizeSpecialPolygon / isValidSpecialPolygon into local scope before
// binding event handlers. The direct shorthand at the wire site references
// them outside the ctx-arrow wrappers and would otherwise throw
// ReferenceError during module-load wiring. (See runtime-polygon-normalizers
// re-exports + the wire-* binders that consume them via ctx.)
```
*(Spot-check: the kernel constraint is "must destructure before binding"; the RESEARCH §6a / §4B / §3 verdicts disagreed because each evaluator focused on a different fragment of the body. The kernel above is real WHY — without the local-scope destructure the boot path throws ReferenceError.)*

AFTER (5 lines):
```js
// Init order: orchestration must destructure normalizeSpecialPolygon /
// isValidSpecialPolygon into local scope before binding event handlers.
// The direct shorthand at the wire site references them outside the
// ctx-arrow wrappers and would otherwise throw ReferenceError during
// module-load wiring.
```

INVENTORY.md "Kept (load-bearing WHY)" must record this entry with the kernel:
> `runtime-orchestration.js:54-61` — orchestration destructures normalizeSpecialPolygon / isValidSpecialPolygon to local scope before wire binding; otherwise the wire-site shorthand throws ReferenceError during module-load.

#### C5.0a — `runtime-orchestration.js:656-659` (STRIP PREFIX, body kept — sweep reclassification)

Reclassified from C1 DELETE WHOLE during the 2026-04-25 sweep: body documents the `BOARDS` mutation-via-`setBoards`-callback constraint, which is real WHY about a wiring boundary (modules cannot mutate the outer `let`).

BEFORE (4 lines):
```js
// Phase 14-2: zone loader + board import (~295 LOC) moved to
// src/app/runtime/runtime-zone-loader.js. BOARDS is reassigned via
// the setBoards callback since the module cannot mutate the outer
// let directly.
```
AFTER (3 lines):
```js
// BOARDS is reassigned via the setBoards callback since the
// runtime-zone-loader module cannot mutate the outer let directly.
//
```
*(The trailing blank `//` is dropped if doing so leaves the spacing intact; otherwise the surviving form is the 2-line version. Keep blank-line separation against the `window.TT_BEAMER_RUNTIME_ZONE_LOADER.init({` line below.)*

INVENTORY kernel: `runtime-orchestration.js:656-659` — `BOARDS` reassigned via the `setBoards` callback because the zone-loader module cannot mutate the outer `let` directly.

#### C5.0b — `runtime-orchestration.js:691-694` (STRIP PREFIX, body kept — sweep reclassification)

Reclassified from C1 DELETE WHOLE during the 2026-04-25 sweep: body documents init-order WHY (zoom module needs `getCachedStageGeometry` + `getTouchGestureActive` at call time, which are defined later in orchestration).

BEFORE (4 lines):
```js
// Phase 14-2: viewport zoom functions now live in runtime-viewport-zoom.js.
// Init + destructure block is placed later in the file (after touchGestureActive
// and polygon-drag-support are initialized, since the zoom module needs
// getCachedStageGeometry and getTouchGestureActive at call time).
```
AFTER (3 lines):
```js
// Init + destructure for the viewport-zoom module is placed later in the
// file (after touchGestureActive and polygon-drag-support are initialized,
// since the zoom module needs getCachedStageGeometry and getTouchGestureActive at call time).
```

INVENTORY kernel: `runtime-orchestration.js:691-694` — viewport-zoom `init()` is deferred until after `touchGestureActive` + polygon-drag-support are initialized; the zoom module needs `getCachedStageGeometry` / `getTouchGestureActive` at call time.

#### C5.0c — `runtime-orchestration.js:756-759` (STRIP PREFIX, body kept — sweep reclassification)

Reclassified from C1 DELETE WHOLE during the 2026-04-25 sweep: body documents ctx-arrow injection ordering (fx-normalizers and perf-controls destructures sit later in the file).

BEFORE (4 lines):
```js
// Phase 14-2: board profile hydration moved to
// src/app/runtime/runtime-board-profiles.js. fx-normalizers and
// perf controls are injected via ctx arrows because their
// destructures sit below this position in orchestration.
```
AFTER (3 lines):
```js
// fx-normalizers and perf controls are injected via ctx arrows
// because their destructures sit below this position in
// orchestration.
```

INVENTORY kernel: `runtime-orchestration.js:756-759` — board-profiles' fx-normalizers / perf-controls deps are injected via ctx arrows because their destructures sit below this position in orchestration.

#### C5.0d — `runtime-orchestration.js:836-841` (STRIP PREFIX, body kept — sweep reclassification)

Reclassified from C1 DELETE WHOLE during the 2026-04-25 sweep: body documents two-tier wiring strategy (board-profiles direct refs vs fx/config-sync ctx arrows), which is real WHY about ordering.

BEFORE (6 lines):
```js
// Phase 14-2: global defaults API facade + error/hint formatters +
// load/save/apply glue moved to src/app/runtime/runtime-global-defaults.js.
// board-profiles helpers are injected as direct refs (already
// destructured above). fx/config-sync helpers used only by
// loadAndApplyGlobalDefaults come from ctx arrows so downstream
// destructures can resolve later.
```
AFTER (4 lines):
```js
// board-profiles helpers are injected as direct refs (already
// destructured above). fx/config-sync helpers used only by
// loadAndApplyGlobalDefaults come from ctx arrows so downstream
// destructures can resolve later.
```

INVENTORY kernel: `runtime-orchestration.js:836-841` — global-defaults wiring uses direct refs for board-profiles (already destructured) and ctx arrows for fx/config-sync helpers (so downstream destructures can resolve later).

#### C5.0e — `runtime-orchestration.js:1552-1555` (STRIP PREFIX, body kept — sweep reclassification)

Reclassified from C1 DELETE during the 2026-04-25 sweep: body documents asset-ref normalizers ctx-arrow injection (top-level-const dependency).

BEFORE (4 lines):
```js
// Phase 14-2: inside/outside/room FX profile normalizers moved to
// src/app/runtime/runtime-fx-normalizers.js. The asset-ref normalizers
// are injected via ctx arrows because the asset-refs destructure above
// supplies them as top-level consts.
```
AFTER (3 lines):
```js
// fx-normalizers' asset-ref normalizer dependencies are injected via
// ctx arrows because the asset-refs destructure above supplies them
// as top-level consts.
```

INVENTORY kernel: `runtime-orchestration.js:1552-1555` — fx-normalizers' asset-ref deps are injected via ctx arrows because the asset-refs destructure above supplies them as top-level consts.

#### C5.0f — `runtime-orchestration.js:1640-1644` (STRIP PREFIX, body kept — sweep reclassification)

Reclassified from C1 DELETE during the 2026-04-25 sweep: body documents state-ownership invariant (editor draft storage and `outsideResourceAssets` stay in orchestration scope, passed by reference).

BEFORE (5 lines):
```js
// Phase 14-2: FX panel syncs (~560 LOC) moved to
// src/app/runtime/runtime-fx-panels.js. Init + destructure so
// existing call sites resolve the same names. Editor draft storage
// and outsideResourceAssets remain in orchestration scope (passed
// by reference) — mutations to the objects propagate naturally.
```
AFTER (3 lines):
```js
// Editor draft storage and outsideResourceAssets remain in
// orchestration scope (passed by reference) — mutations to the
// objects propagate naturally to runtime-fx-panels.
```

INVENTORY kernel: `runtime-orchestration.js:1640-1644` — editor draft storage and `outsideResourceAssets` stay in orchestration scope, passed by reference; mutations propagate naturally to runtime-fx-panels.

#### C5.0g — `runtime-orchestration.js:1791-1795` (STRIP PREFIX, body kept — sweep reclassification)

Reclassified from C1 DELETE during the 2026-04-25 sweep: body documents ctx-arrow wiring strategy that prevents TDZ for downstream destructures.

BEFORE (5 lines):
```js
// Phase 14-2: polygon editor drag/render + renderRoomOverlay moved to
// src/app/runtime/runtime-polygon-editor.js. Init + destructure so
// existing call sites resolve the same names. All cross-module deps
// are injected via ctx arrows so downstream destructures (room-geometry,
// room-management, room-draft, viewport-zoom) can land later without TDZ.
```
AFTER (3 lines):
```js
// All cross-module deps for the polygon editor are injected via ctx
// arrows so downstream destructures (room-geometry, room-management,
// room-draft, viewport-zoom) can land later without TDZ.
```

INVENTORY kernel: `runtime-orchestration.js:1791-1795` — polygon-editor cross-module deps are injected via ctx arrows so downstream destructures (room-geometry, room-management, room-draft, viewport-zoom) can land later without TDZ.

#### C5.0h — `runtime-orchestration.js:2200-2204` (STRIP PREFIX, body kept — sweep reclassification)

Reclassified from C1 DELETE during the 2026-04-25 sweep: body documents deferred-init order — `drawRoomComposition`'s init waits for upstream helpers (`drawEffectVisual`, `clipToRoom`) to be destructured first.

BEFORE (5 lines):
```js
// Phase 14-2: drawRoomComposition now lives in runtime-draw-loop.js
// along with the rest of the draw pipeline. Init + destructure is
// deferred until after all upstream helpers (drawEffectVisual,
// clipToRoom, etc.) have been destructured — see the init block
// after flickerNoise below.
```
AFTER (3 lines):
```js
// drawRoomComposition's init + destructure is deferred until after
// all upstream helpers (drawEffectVisual, clipToRoom, etc.) have
// been destructured — see the init block after flickerNoise below.
```

INVENTORY kernel: `runtime-orchestration.js:2200-2204` — `drawRoomComposition` init is deferred until after upstream helpers (`drawEffectVisual`, `clipToRoom`) are destructured (see init block after `flickerNoise`).

---

#### C5.1 — `runtime-orchestration.js:960-969` (init-order constraint)

BEFORE (10 lines):
```js
// Phase 14-2 reorg fix: three runtime modules (AUDIO, ROOM_GEOMETRY,
// LIVE_SYNC_HELPERS) lost their init() blocks during the original
// Phase 14-2 split. Restore all three blocks here. They are placed
// after BOARD_STATE_ACCESSORS destructure because ROOM_GEOMETRY needs
// its direct refs (getHitareaCalibration, getRoomGeometry).
```
AFTER (2 lines):
```js
// Init order: must follow BOARD_STATE_ACCESSORS — ROOM_GEOMETRY
// destructures getHitareaCalibration / getRoomGeometry from it.
```

#### C5.2 — `runtime-orchestration.js:2073-2079` (W3b-2 setters)

BEFORE (7 lines):
```js
// Phase 22 W3b-2: setters + persist for the editor's patch flow.
// Phase 22 W3b-4d fix: use the raw setOutsideFxProfile, not
// updateOutsideFxProfile — the latter re-derives intensity / speed /
// mode / direction from the profile ROOT (the selection mirrors) and
// throws away whatever we patched on the animation definition itself,
// so sliders appeared stuck and never tripped the dirty comparison.
```
AFTER (3 lines):
```js
// Use raw setters (not the update* wrappers): the wrappers re-derive
// intensity/speed/mode/direction from the profile root and clobber
// per-definition patches, leaving sliders stuck.
```

#### C5.3 — `runtime-orchestration.js:173-177` (settings exclusive control IDs)

BEFORE (5 lines):
```js
// Phase 21-1: purge stale entries. The board-import-* and export/import-
// global-defaults controls were replaced by the unified "Share a Board"
// zip bundle in Phase 20 — their IDs no longer exist in index.html, so
// validateSettingsControlOwnership was logging a noisy "missing control"
// leak on every resize / view switch.
```
AFTER (2 lines):
```js
// These IDs no longer exist in index.html (replaced by the "Share a
// Board" bundle); listing them here suppressed the noisy "missing control" log.
```

#### C5.4 — `runtime-orchestration.js:2539-2543` (touch-gesture flag)

BEFORE (5 lines):
```js
// Phase 13-HF6: global "touch gesture in progress" flag. When true,
// the rAF zoom-pan writer skips its DOM write so the writer doesn't
// fight the gesture handler. Set by the touch handlers below; cleared
// on touchend / touchcancel. Read by the rAF writer in
// runtime-viewport-zoom.js.
```
AFTER (3 lines):
```js
// Global "touch gesture in progress" flag: blocks the rAF zoom-pan
// writer's DOM writes during a touch gesture so the writer doesn't
// fight the gesture handler. Set by touch handlers; cleared on touchend.
```

---

### C5b — non-orchestration long-block shortening (sub-commit 2 of 2)

Files: `runtime-runtime-controls.js`, `runtime-animation-lifecycle.js`, `runtime-draw-loop.js`, `runtime-viewport-zoom.js`, `runtime-polygon-drag-support.js`, `icons.js`.
Blocks: C5.5, C5.6, C5.7, C5.8, C5.9, C5.10, C5.11 (7 multi-paragraph rewrites).

#### C5.5 — `runtime-runtime-controls.js:23-33` (graceful audio)

BEFORE (11 lines):
```js
// Phase 15-6: graceful audio for global inside non-loop animations.
// When a non-loop inside global is stopped (e.g. user toggles it off),
// we previously called stopAnimationSound which hard-cut the voice
// mid-sample. That produced an audible click on short SFX. Now we
// pass `graceful: true` so the active iteration plays to its natural
// `ended` event, and only the queue of further iterations is cancelled.
// Outside / loop animations still hard-cut because their audio is
// ambient and a graceful-tail leak would drift across triggers.
```
AFTER (4 lines):
```js
// Inside non-loop globals stop with `graceful: true` so the active
// sample plays to its natural `ended` event (no click on short SFX);
// outside / loop animations still hard-cut so ambient audio doesn't
// drift across triggers.
```

#### C5.6 — `runtime-animation-lifecycle.js:1143-1156` (cluster pads + rail rect)

BEFORE (14 lines, two adjacent Phase prefixes):
```js
// Phase 23 W2: cluster pads — artificial mini-rooms next to the board
// for each cluster, so users can fire / clear cluster animations
// without selecting individual rooms.
// Phase 23 W2 v6: sync the position:fixed cluster rail to the stage's
// current screen rect. Called on every renderClusterPads tick + on
// window resize so the rail tracks pan/zoom in real time. The rail
// sits outside #stage in the DOM (avoiding the overflow:hidden chain
// inside the dashboard tree) but visually behaves as if attached to
// the stage's left edge.
```
AFTER (6 lines):
```js
// Cluster pads: artificial mini-rooms beside the board for each cluster
// (users fire/clear cluster animations without picking individual rooms).
// The position:fixed cluster rail is synced to the stage's current screen
// rect on every tick + on resize — the rail sits outside #stage (avoiding
// the dashboard's overflow:hidden chain) but visually attaches to the
// stage's left edge.
```

#### C5.7 — `runtime-draw-loop.js:711-719` (heavy-interaction pause)

BEFORE (9 lines, two `Phase 13-HF*` prefixes):
```js
// Phase 13-HF7: pause the heavy animation render pipeline while a
// touch gesture is in flight. Skipping draw() during the gesture
// recovers 20–40 ms of main-thread time per frame on mobile, which
// is what made pinch-zoom go from janky to smooth.
// Phase 13-HF8: also pause during polygon drag. Same rationale —
// drag handlers run at pointermove rate and need the main thread free
// for the SVG-incremental render path.
```
AFTER (3 lines):
```js
// Pause the render pipeline while a touch gesture or polygon drag is
// active. Recovers 20–40 ms / frame on mobile and removes drag lag.
// (See heavy-interaction guards in runtime-polygon-drag-support.)
```

#### C5.8 — `runtime-viewport-zoom.js:160-162` (ABI-stable shim)

BEFORE (3 lines):
```js
// Phase 13-2: zoom slider removed. This function is kept for ABI
// stability of the ~20 call sites that use it — it still refreshes the
// status line and the stage transform, it just no longer writes to a slider/label.
```
AFTER (2 lines):
```js
// Kept for ABI stability of ~20 call sites: refreshes the status line
// and the stage transform without writing to a slider/label.
```

#### C5.9 — `runtime-viewport-zoom.js:192-196` (rAF-coalesced zoom/pan writer)

BEFORE (5 lines):
```js
// Phase 13-HF5: rAF-coalesced zoom/pan writer. Called from high-frequency
// pan/zoom pointermove paths (touch pan, mouse wheel, pinch). Collapses
// many same-frame calls into a single updateCurrentBoardZoom() + DOM
// write per animation frame, which eliminates the mobile lag seen in
// HF4 touch pan.
```
AFTER (3 lines):
```js
// rAF-coalesced zoom/pan writer: collapses many same-frame calls
// (from pan, wheel, pinch) into one updateCurrentBoardZoom() + DOM
// write per frame, fixing mobile pan lag.
```

#### C5.10 — `runtime-polygon-drag-support.js:219-225` (heavy-interaction lifecycle)

BEFORE (7 lines):
```js
// Phase 13-HF8: heavy-interaction lifecycle shared by all polygon edit
// gestures. The flag tells the draw loop to pause its render pipeline
// (see runtime-draw-loop.js HF7/HF8 guards) so the gesture stays smooth.
// Set on dragstart / pointerdown for vertex / edge / rotate; cleared on
// pointerup / pointercancel.
```
AFTER (3 lines):
```js
// Heavy-interaction flag: pauses the draw loop's render pipeline so
// polygon edit gestures stay smooth (see runtime-draw-loop.js's
// heavy-interaction guard). Set on gesture start; cleared on end.
```

#### C5.11 — `icons.js:163-170` (icon resolution heuristic)

BEFORE (8 lines):
```js
// Phase 22 W2c: heuristic icon resolver used until Wave 3 ships per-
// animation user-assigned icons via the animation editor. Phase 22 W3
// has shipped — explicit `definition.icon` is now the primary signal;
// the heuristic is the fallback. Resolution order:
// explicit `definition.icon` (set once Wave 3 lands) → coded-effect
// type → asset type → name keyword → fallback.
```
AFTER (4 lines):
```js
// Icon resolution order: explicit `definition.icon` (user-assigned via
// the animation editor) → coded-effect type → asset type → name
// keyword → fallback.
```

**Decision rule for any block not listed above** (executor judgement, last resort):
> "If the comment after the marker explains a hidden constraint, subtle invariant, workaround, or non-obvious behaviour → keep with prefix stripped. Otherwise → delete entire comment block. **When in doubt, keep with prefix stripped.** Don't go beyond stripping prefixes in C5 entries the plan didn't pre-decide."

If the executor encounters a block in `runtime-fx-panels.js` or elsewhere that wasn't on the list above and they're tempted to shorten it, the answer is **don't** — leave it as a strip-prefix-only edit (which C2 already did). Adding it to C5 requires planner approval.

**Pre-removal verification**
```bash
# Per-block: verify each BEFORE text matches the current file content before editing.
# Example for C5.1:
sed -n '960,969p' src/app/runtime/runtime-orchestration.js
# Compare against BEFORE block; halt if mismatch (file has shifted since RESEARCH).
```

**Post-removal verification**
```bash
# Aggregate marker grep should now hit zero (excluding regression-tests carve-out).
grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|\bHF[0-9]+\b|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+|^\s*//\s*v[0-9]+:" src/ --include="*.js" \
  | grep -v "src/app/runtime/panels/runtime-regression-tests.js" \
  | wc -l
# → 0
```

**Code-untouched verification**
```bash
# PRIMARY GATE (must return empty for the commit to land):
git diff HEAD~..HEAD -- 'src/**/*.js' 'src/**/*.css' \
  | grep -E '^[+-]' \
  | grep -v -E '^[+-]\s*(//|\*|/\*|\*/)' \
  | grep -v -E '^[+-]\s*$' \
  | grep -v -E '^(---|\+\+\+)\s'
# → empty
# Preliminary fast filter (informational; not the gate):
git diff -G '^[^/*\s]' HEAD~..HEAD -- 'src/**/*.js'
```

**Adjacent smoke-test scenarios** (full smoke pass — these blocks touch many subsystems)
- [ ] Boot dashboard; switch boards.
- [ ] Trigger every animation type (Solid color, Fire, Scanning, Alarm, Light flicker, Slime GIF, Malfunction GIF, MP4, Sandstorm, Space travel).
- [ ] Trigger a cluster pad; type-aware toggle (Fire → tap, Scanning → tap, Fire → tap; only fire stops).
- [ ] Open Live Editor; toggle opacity, intensity, speed, sound-volume sliders.
- [ ] Pinch-zoom on dashboard; pan; ensure no jitter (HF5/HF6/HF8 paths still smooth).
- [ ] Drag polygon vertex; verify SVG-incremental render works.
- [ ] Open `/output`; mesh warp renders without seams.
- [ ] Stop a global inside non-loop animation with sound; ensure no audible click (HF — graceful-stop path preserved).

**Commit messages (2 atomic sub-commits)**

```
refactor(24-2.5a): shorten long comment blocks — orchestration

Manually rewrites 5 multi-paragraph comments in runtime-orchestration.js
where the kernel is real WHY but historical narrative wrapped it. Plus
8 STRIP-PREFIX edits added during the 2026-04-25 sweep: blocks
originally classified DELETE WHOLE in C1 whose bodies turned out to
carry load-bearing init-order / wiring / state-ownership constraints.

Multi-paragraph rewrites (5):
  C5.0 (:54-61) — init-order ReferenceError constraint
  C5.1 (:960-969) — init-order BOARD_STATE_ACCESSORS dependency
  C5.2 (:2073-2079) — raw setters vs update* wrappers
  C5.3 (:173-177) — settings-exclusive control IDs
  C5.4 (:2539-2543) — touch-gesture flag

STRIP-PREFIX (body kept verbatim, 8 — sweep reclassification):
  C5.0a (:656-659) — BOARDS reassigned via setBoards callback
  C5.0b (:691-694) — viewport-zoom init deferred for getCachedStageGeometry / getTouchGestureActive
  C5.0c (:756-759) — fx-normalizers/perf-controls injected via ctx arrows
  C5.0d (:836-841) — board-profiles direct refs vs fx/config-sync ctx arrows
  C5.0e (:1552-1555) — asset-ref normalizers injected via ctx arrows
  C5.0f (:1640-1644) — editor-draft / outsideResourceAssets stay in orchestration scope
  C5.0g (:1791-1795) — polygon-editor cross-module deps via ctx arrows (avoid TDZ)
  C5.0h (:2200-2204) — drawRoomComposition init deferred for upstream helpers

Edit order: bottom-up by line number (so earlier lines don't shift).

Comment-only change. No executable line touched.
```

```
refactor(24-2.5b): shorten long comment blocks — non-orchestration

Manually rewrites 7 multi-paragraph comments outside orchestration where
the kernel is real WHY but historical narrative wrapped it.

Files: runtime-runtime-controls.js (C5.5 graceful audio),
runtime-animation-lifecycle.js (C5.6 cluster pads + rail rect),
runtime-draw-loop.js (C5.7 heavy-interaction pause),
runtime-viewport-zoom.js (C5.8 ABI-stable shim, C5.9 rAF zoom/pan
writer), runtime-polygon-drag-support.js (C5.10 heavy-interaction
lifecycle), icons.js (C5.11 icon resolution heuristic).

Comment-only change. No executable line touched.
```

**Rollback**: each sub-commit independently revertable.
- `git revert <C5a-sha>` — restores 5 orchestration long blocks; leaves C5b's 7 blocks shortened.
- `git revert <C5b-sha>` — restores 7 non-orchestration long blocks; leaves C5a's 5 blocks shortened.
- `git revert <C5b-sha> <C5a-sha>` — restores all 12 long blocks verbatim. Clean revert.

---

### C6 — CSS phase-marker strip

**Files touched** (RESEARCH §6e + components.css gap-fill)

- `src/styles.css` (37 markers)
- `src/styles/design-system/theme-obsidian.css` (24 markers)
- `src/styles/design-system/animation-editor.css` (6 markers)
- `src/styles/design-system/foundations.css` (4 markers; foundations.css:85 was specifically called out as deferred from Wave 1 — handled here)
- `src/styles/design-system/components.css` (2 markers — line 2 `Phase 22 Wave 1` file header, line 353 `Phase 22 W3a` icon-picker section comment; both Phase 22 references)

Total CSS markers: **75** (RESEARCH §1's 73 + 2 from components.css that the original baseline grep missed).

**What changes — patterns** (same as C2)

**Pattern A — strip leading marker token** (most common). Same BEFORE/AFTER shape as JS but with CSS comment syntax:

BEFORE:
```css
/* Phase 22 W4: theme-obsidian background uses a layered radial gradient
 * because flat fill produces a visible banding seam on the projected
 * surface. */
```
AFTER:
```css
/* theme-obsidian background uses a layered radial gradient because
 * flat fill produces a visible banding seam on the projected surface. */
```

Or for single-line CSS comments:

BEFORE:
```css
/* Phase 13-HF6: skip pointer-events during touch gesture */
```
AFTER:
```css
/* Skip pointer-events during touch gesture. */
```

**Pattern B — pure-history delete** (whole comment block). For markers like `/* Phase 19-2: replaced by … */` where the body is purely historical, delete the whole block.

**Conservatism rule:** same as C2 — when in doubt, strip prefix and keep body. CSS comments are less navigationally distracting than JS markers (CSS is read top-down, rarely greppable for identifier names — RESEARCH §6e), so over-deletion has no upside.

**Single commit, all 4 files** — CSS comment density is much lower than JS (RESEARCH §1: 429 CSS comment lines total vs 2 342 JS), so combining into one commit keeps the wave revert-friendly without bloating any one diff.

**Pre-removal verification**
```bash
grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|\bHF[0-9]+\b|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+" src/ --include="*.css" | wc -l
# → 75 (RESEARCH §1 baseline 73 + 2 from components.css)
# Per-file confirmation that components.css carries 2 markers:
grep -E "Phase\s+\d+|Wave\s+\d+|HF\d+|W\d+\s*v\d+" src/styles/design-system/components.css
# → exactly 2 hits (line 2 Phase 22 Wave 1, line 353 Phase 22 W3a)
```

**Post-removal verification**
```bash
grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|\bHF[0-9]+\b|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+" src/ --include="*.css" | wc -l
# → 0 (all 75 markers eliminated)
# Per-file confirmation:
grep -E "Phase\s+\d+|Wave\s+\d+|HF\d+|W\d+\s*v\d+" src/styles/design-system/components.css
# → 0 hits
```

**Code-untouched verification** (CSS variant)
```bash
# PRIMARY GATE (must return empty for the commit to land):
git diff HEAD~..HEAD -- 'src/**/*.css' \
  | grep -E '^[+-]' \
  | grep -v -E '^[+-]\s*(//|\*|/\*|\*/)' \
  | grep -v -E '^[+-]\s*$' \
  | grep -v -E '^(---|\+\+\+)\s'
# → empty
# Preliminary fast filter (informational; not the gate):
git diff -G '^[^/*\s]' HEAD~..HEAD -- 'src/**/*.css'
```
If the **primary gate** is non-empty: a CSS rule line was added/removed. Halt, inspect each non-comment hit (CSS rules typically start with a selector or `}`, both of which the strong check catches even when indented).

**Adjacent smoke-test scenarios** (visual — CSS edits are inert at the rule level but visual smoke catches a stray rule deletion)
- [ ] Light/dark theme toggle persists across reload; both themes render correctly.
- [ ] Topbar layout (brand row + actions row) doesn't clip on mobile or desktop.
- [ ] Settings ↔ Dashboard switch animates correctly.
- [ ] Animation editor full-page layout renders (cards, preview column, scope tabs).
- [ ] `/output` styles intact: no black bars, no seams.

**Commit message**
```
refactor(24-2): strip phase-marker prefixes from CSS comments

Strips "Phase X[-Y]:", "Phase X W Y[-Z]:", "HFn:" prefixes from 75 CSS
comments across:
  src/styles.css                                 (37)
  src/styles/design-system/theme-obsidian.css    (24)
  src/styles/design-system/animation-editor.css   (6)
  src/styles/design-system/foundations.css        (4)
  src/styles/design-system/components.css         (2)

Pure-history blocks deleted whole. Comment bodies (load-bearing render
rationale: pinch-zoom touch handling, projection seams, RPi tuning,
theme banding) preserved verbatim.

Comment-only change. No CSS rule touched.
Acceptance: CSS marker grep → 0; components.css grep → 0.
```

**Rollback**: `git revert <C6-sha>` — restores all 75 markers. Clean revert.

---

## 5. Special Handling Notes

### 5.1 — `runtime-regression-tests.js` test-file carve-out (RESEARCH §6f)

This is the runtime self-test panel — not an external Jest/Vitest file. ROADMAP says markers stay in test files that document a fix.

**Per-line enumeration (HARD-CODED — executor does NOT decide; just applies these decisions verbatim).** A grep of `Phase\s+\d+|HF\d+` in this file currently returns exactly 3 hits:

| Line | Marker text | Decision | Why |
|------|-------------|----------|-----|
| 1 | `// Phase 14-2: runtime regression self-tests module.` | **STRIP PREFIX, KEEP BODY** | File header; the "runtime regression self-tests module." body stays. AFTER: `// runtime regression self-tests module.` Handled in **C1**. |
| 112 | `// Phase 18: running-overview-panel (dashboard manage zone) and global-animation-panel (settings board tab) are in different views. DOM order between cross-view panels is not functionally relevant — skip this positional check.` | **KEEP** (carve-out — leave entire comment intact, including the `Phase 18:` prefix) | Skip-test rationale: documents why a specific positional check is skipped. The `Phase 18:` prefix carries the test-context hook the comment references; stripping it loses the link to when the skip was introduced. |
| 463 | `// Phase 21-1: the old "invalid polygon must be rejected" subtest no longer matches system behavior. ...` (8-line block ending at line 471) | **KEEP** (carve-out — leave entire comment intact, including the `Phase 21-1:` prefix) | Fix-documenting test rationale: explains why the subtest was dropped after `extractRenderablePlayAreaPolygons` changed semantics. Per existing carve-out (RESEARCH §6f). |

**Touched in this wave:** line 1 only (handled in C1).
**NOT touched in this wave:** lines 112 and 463 — both KEEP including their `Phase X:` prefix.

**Acceptance grep specifically excludes this file** (see §2 acceptance criteria) — these 2 KEEP markers don't pollute the global pass/fail. INVENTORY.md "Carve-out: regression-tests touched lines" must reproduce this 3-row table verbatim as the audit trail.

### 5.2 — Section dividers in `runtime-projection-mapping.js` defer to Wave 3 (RESEARCH §5)

20 `// ── Section ──` dividers stay through Wave 2. Wave 3 will use them as the natural split boundaries when decomposing the 1 952-line file. Do **not** delete them in C2/C3/C4/C5 even if they look like wave-marker noise — they are load-bearing structural navigation.

### 5.3 — Duplicate zoom-around-anchor math defers to Wave 3 (RESEARCH §6g) — WITH DISAMBIGUATION

The same ~20-line math derivation lives in two places. The two sites have **different prefix shapes** that require different handling:

**Site A — `runtime-orchestration.js:2574-2596`** (the orchestration echo)
- Lines 2574-2593: `// Phase 13-HF4: cursor-accurate zoom-around-anchor math ...` — the full math derivation. **STRIP PREFIX, body kept verbatim** (real WHY: derivation justifies the differential math vs the buggy HF1 absolute-anchor approach).
- Lines 2594-2596: a SECOND `// Phase 14-2: viewport zoom + pan (~300 LOC scattered across 4 regions) moved to src/app/runtime/runtime-viewport-zoom.js.` block — pure "moved to" history echoing the Phase 14-2 split. **DELETE WHOLE** (3 lines). This is part of the C1 Pattern B "Phase 14-2: X moved to Y" deletion sweep, not a SHORTEN — the body is purely historical.
  - C1 already enumerates the 38 Phase 14-2 deletions in orchestration; this 3-line block is one of them. The executor does NOT process it as a single 23-line block — it is a 20-line math derivation (STRIP PREFIX in C2) followed by a 3-line history block (DELETE WHOLE in C1).
  - Net effect on the file: lines 2574-2593 keep their bodies (prefix stripped), lines 2594-2596 disappear entirely.

**Site B — `runtime-viewport-zoom.js:310-322`** (the canonical site)
- Single `// Phase 13-HF4:` prefix at line 310. NO `Phase 14-2` history block. **STRIP PREFIX, body kept verbatim** in C2. Same rule as Site A's lines 2574-2593.
- Do NOT add a "moved to" deletion here — there is none to delete.

**Both sites: do not move, dedupe, or consolidate the math at the comment level.** Wave 3 will dedupe at the code level (the function lives in viewport-zoom; the orchestration site is a documentation echo for callers). After this wave, both sites still carry the math derivation body verbatim, with prefix stripped — and orchestration's tail "moved to" history is gone.

### 5.4 — JSDoc `/** … */` blocks above public functions stay intact (RESEARCH §6d)

3 JSDoc blocks exist, all in `runtime-projection-mapping.js`:
- Line 72: `/** Check whether any points differ from their default positions. */`
- Lines 93-99: `remapPoint` API doc with barycentric algorithm note.
- Lines 407-412: `drawAffineTriangle` API doc explaining why over `drawImage` rect mapping.

**Don't strip phase markers from these even if present** — they're API contract docs. Spot-check after C2: confirm none of them was touched.

### 5.5 — License headers / file-level disclaimers

There are no license headers in `src/`. The file-header comments are all `// Phase 14-2: X module.\n// Owns ...` style — those get prefix stripped per C1. No license text to preserve.

### 5.6 — C5 judgement work decision rule

**The decision rule (executor must apply mechanically):**
> "If the comment after the marker explains a hidden constraint, subtle invariant, workaround, or non-obvious behaviour → keep with prefix stripped. Otherwise → delete entire comment block. **When in doubt, keep with prefix stripped.** Don't go beyond stripping prefixes in C5 entries the plan didn't pre-decide."

If the executor wants to shorten a block not in the C5 list, that's a planner-approval scope expansion. Leave it as-is for this wave; surface it in INVENTORY.md "Deferred to future wave" with the file:line and proposed shortening for review.

### 5.7 — Two-check structure: PRIMARY GATE vs preliminary filter

This wave runs **two** comment-only checks per commit. They are **not** redundant — only the primary gate decides whether the commit is allowed to land:

**PRIMARY GATE — strong `grep -v` chain (authoritative, decides commit landing).**
```bash
git diff HEAD~..HEAD -- 'src/**/*.js' 'src/**/*.css' \
  | grep -E '^[+-]' \
  | grep -v -E '^[+-]\s*(//|\*|/\*|\*/)' \
  | grep -v -E '^[+-]\s*$' \
  | grep -v -E '^(---|\+\+\+)\s'
# → empty for a clean comment-only commit
```
This filters added/removed lines whose first non-whitespace character (after `+`/`-`) is a comment marker (`//`, `*`, `/*`, `*/`) or blank, plus drops the diff `---`/`+++` headers. Anything that survives is an executable-code line — and the commit must NOT land while non-empty. **This is the gate.**

**PRELIMINARY FILTER — `git diff -G '^[^/*\s]'` (fast first ping, NOT the gate).**
```bash
git diff -G '^[^/*\s]' HEAD~..HEAD -- 'src/**/*.js' 'src/**/*.css'
```
Matches lines whose first character is not `/`, `*`, or whitespace. It is fast and catches **non-indented** executable lines (top-level declarations, file-scope code). It produces **false negatives** for indented code (most code in this codebase, since runtime modules are mostly inside IIFEs / functions / object literals). Use it as a quick first ping during editing, but never as the acceptance gate.

**False-positive shape on the preliminary filter** (rare, ignore if seen):
- A code line that begins with `/` (regex literals on their own line) or `*` (JSDoc continuation outside a `/** */` block).

**False-negative shape on the preliminary filter** (the reason it is NOT the gate):
- Any line that begins with leading whitespace followed by code — i.e. virtually all indented code. The strong gate catches these because it strips the `+`/`-` and the leading whitespace before classifying.

Both checks should be run per commit; INVENTORY.md records the result of **each** in the per-commit table (two columns: primary gate empty? preliminary filter empty?). The primary gate's "empty" is the commit-landing condition.

---

## 6. INVENTORY.md Plan

`INVENTORY.md` lives at `.planning/phases/phase-24/wave-2/INVENTORY.md` and is **updated incrementally** as each commit lands — not written all at once at the end. Format mirrors Wave 1's.

### Required sections

1. **Baseline** (filled during pre-flight)
   - Initial counts: total JS lines, comment lines, comment density, marker hits (JS + CSS), long blocks ≥ 8, dividers.
   - Decision log: CSS scope, load-bearing markers, regression-tests carve-out, section dividers, duplicate zoom math (all marked CONFIRMED with date).

2. **Per-commit table** (one row per commit):
   ```
   | # | Hash | Files | Lines added | Lines removed | Comment lines removed (net) | Markers eliminated | Verification |
   ```
   Updated after each commit lands. "Verification" cell records: marker-grep result, comment-line count, primary gate (strong `grep -v` chain) empty (yes/no), preliminary `-G '^[^/*\s]'` filter empty (yes/no).

3. **Carve-out: regression-tests touched lines**
   - Per-line: file:line, `STRIP` or `KEEP`, one-line reason.

4. **Kept (load-bearing WHY)** — every comment whose prefix was stripped in C1/C2/C5 with a one-line "what WHY it carries":
   ```
   | File:Line | WHY it carries |
   |-----------|----------------|
   | runtime-projection-mapping.js:159-163 | WebGL fallback exists because 2D-canvas produces seams |
   | runtime-orchestration.js:385-390 | Snapshot back-compat keeps "activate"/"deactivate" valid |
   | …         | … |
   ```
   Target row count: ~32 (the §6a 10 + §4B 22 minus a few that were already covered by C5 SHORTEN).

5. **Deferred to future wave**
   - Section dividers in `runtime-projection-mapping.js` (20) → Wave 3 split boundaries.
   - Duplicate zoom math at viewport-zoom.js:310 / orchestration.js:2574 → Wave 3 code-level dedupe.
   - Any C5 candidate the executor surfaced but the plan didn't pre-decide → noted with file:line and proposed shortening.

6. **End-of-wave aggregate row**
   - Total marker reduction (JS + CSS): 509 → 0 (JS 434 + CSS 75; excluding regression-tests carve-out keepers).
   - Comment-density delta: 7.63 % → x.xx %.
   - Long-block delta: 66 → x.
   - Comment-line delta: 2 342 → x (target ≤ 2 142).

### Format rules

- Maintain incrementally per commit; do not write all at end.
- Every "Markers eliminated" cell must be replayable: the marker-grep command in the row, run on the current tree at that commit, must return the recorded count.
- The "Kept (load-bearing WHY)" section is the executor's contract that they preserved every constraint.

---

## 7. End-of-Wave Test Plan

### Per-commit (already enumerated above)
Each commit has its own "Adjacent smoke-test scenarios" section. Comment-only changes should mathematically never break code; the per-commit smoke is a sanity check, not a true regression test. The high-risk failure mode is "executor accidentally deleted a code line via overzealous comment regex" — the per-commit **primary gate** (the strong `grep -v` chain in §2 / §5.7) catches that, including indented executable lines that the `-G '^[^/*\s]'` ping would miss.

### End-of-wave (mandatory)

Run the **full** ROADMAP regression checklist (`ROADMAP.md` lines 203–275). Estimated duration: **10–15 minutes**.

- [ ] Boards & rooms (6 items)
- [ ] Play areas + clusters (3 items)
- [ ] Animations + dispatch (8 items)
- [ ] Tap-Action (3 items)
- [ ] `/output` (4 items, including RPi if available)
- [ ] Align Mode (4 items)
- [ ] Theme + UI (3 items)
- [ ] Sounds (3 items)
- [ ] Export / Import (2 items — round-trip diff = 0)
- [ ] Live-sync (1 item — two clients, ~1 frame propagation)

### End-of-wave aggregate verification (record results in INVENTORY.md "End-of-wave verification" section)

```bash
# JS markers (excluding carve-out)
grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|\bHF[0-9]+\b|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+|^\s*//\s*v[0-9]+:" src/ --include="*.js" \
  | grep -v "src/app/runtime/panels/runtime-regression-tests.js" \
  | wc -l
# → 0

# CSS markers
grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|\bHF[0-9]+\b|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+" src/ --include="*.css" | wc -l
# → 0

# Comment line count + density
COMMENTS=$(find src -type f -name "*.js" | xargs grep -E '^\s*(//|\*|/\*)' | wc -l)
TOTAL=$(find src -type f -name "*.js" -exec wc -l {} + | tail -1 | awk '{print $1}')
echo "Comment lines: $COMMENTS"   # ≤ 2142
echo "scale=4; $COMMENTS / $TOTAL * 100" | bc   # ≤ 6.95

# Per-commit code-untouched aggregate (across the wave's range) — PRIMARY GATE:
git diff phase-24-w2-start..HEAD -- 'src/**/*.js' 'src/**/*.css' \
  | grep -E '^[+-]' \
  | grep -v -E '^[+-]\s*(//|\*|/\*|\*/)' \
  | grep -v -E '^[+-]\s*$' \
  | grep -v -E '^(---|\+\+\+)\s'
# → empty
# Preliminary fast filter (informational; not the gate):
git diff -G '^[^/*\s]' phase-24-w2-start..HEAD -- 'src/**/*.js' 'src/**/*.css'
```

### If any regression check fails

1. Identify the culprit commit by bisect (most likely C2 or C5 — those have the most surface area):
   ```bash
   git bisect start HEAD phase-24-w2-start
   git bisect run <regression-test-script>   # if scriptable; otherwise manual bisect
   ```
2. Once isolated, run the **primary gate** (strong `grep -v` chain) on `<commit>~..<commit>`. Any non-empty output = the bug; that's the accidentally-deleted code line. (The `-G '^[^/*\s]'` ping may miss it because most code in this codebase is indented.)
3. Each commit is independently revertable. Revert the offending commit, fix the comment-only edit by hand, and re-land.

---

## 8. Risks + Mitigations (Wave 2 specific)

### Risk 1 — Regex matching code lines instead of comments

A bulk sed/regex pass might match a string literal, template literal, or inline comment that looks like a phase marker (e.g. a `console.warn("Phase X invalid")` string left over somewhere, or a CSS variable named `--phase-22`).

**Mitigation:**
- **Per-commit, per-file:** the **primary gate** is the strong `grep -v` chain (catches indented code); the `git diff -G '^[^/*\s]'` ping is a preliminary filter. Empty output on the primary gate = clean.
- **Per-file granularity in C2:** stage each file independently; check the diff before committing the whole file.
- **If non-empty:** the executor inspects each non-comment hit by hand and reverts the regex on that line before staging.

### Risk 2 — Removing a load-bearing constraint disguised as a phase marker

RESEARCH §6a identifies ~10 markers where the body documents a constraint that looks like overengineering until you read it. Dropping the body with the prefix would silently revert a real WHY.

**Mitigation:**
- §4 C2 enumerates all 10 explicitly with a one-line summary of the WHY each carries.
- §5 ("Special Handling Notes") cross-references the same 10.
- INVENTORY.md "Kept (load-bearing WHY)" section is the executor's contract that each of the ~32 critical comments survived. This is reviewed before declaring the wave done.
- Conservatism rule throughout: when in doubt, KEEP body with prefix stripped.

### Risk 3 — Executor judgement drift on C5 long-block shortening

C5 has 12 pre-decided blocks (split across C5a/C5b sub-commits) with explicit BEFORE/AFTER text. The executor must land them verbatim. The risk is the executor decides to "improve" a block beyond the planned text or shortens a non-listed block on initiative.

**Mitigation:**
- §4 C5 lists every block with verbatim AFTER text.
- §5.6 decision rule: don't shorten anything not on the C5 list. If tempted, surface to INVENTORY.md "Deferred" instead.
- C5 commit review: the executor diffs each rewritten block against the plan before staging. Any deviation requires planner approval.

### Risk 4 — Comment density metric drift past target without regression catching it

If final density is < 6.95 % but the regression checklist fails, the metric isn't a sufficient acceptance signal alone — the manual smoke pass is the true gate.

**Mitigation:**
- Acceptance criteria explicitly require BOTH the metric AND the regression checklist to pass. Either failing blocks wave closure.
- The aggregate **primary gate** (strong `grep -v` chain on `phase-24-w2-start..HEAD`) end-of-wave check should also be empty — a final guard against accidental code edits.

### Risk 5 — Test-file carve-out enumeration ambiguity

The carve-out applies to `runtime-regression-tests.js` but not every `// Phase X:` in that file qualifies. Misclassifying a header (which should be stripped) as a fix-documenting comment (which should be kept) means the marker-count acceptance silently fails.

**Mitigation:**
- §5.1 mandates the executor enumerate every `Phase\s` match in the file with a per-line `STRIP` / `KEEP` decision in INVENTORY.md before C2 runs.
- The acceptance grep specifically excludes this file's path — so the carve-out doesn't pollute the global pass/fail. But the enumeration is the audit trail: if a future reader asks "why does this file still have markers?", the INVENTORY answer is on record.

### Risk 6 — CSS comment regex matching a CSS rule

CSS rules don't typically start with `/` or `*`, so even the preliminary `git diff -G '^[^/*\s]'` filter is reasonably accurate for CSS. The **primary gate** (strong `grep -v` chain) remains the authoritative check. CSS multi-line comments use `*` continuation lines — those are correctly classified as comments by both checks.

**Mitigation:**
- §4 C6 includes both verifications. If a CSS rule got accidentally edited (e.g. a `}` removed), the diff check shows it.
- Visual smoke pass after C6 catches a missed rule deletion.

### Risk 7 — Stash collision on pre-flight

If the pre-flight `git stash` command picks up changes the user wanted left alone, those changes get hidden behind the stash.

**Mitigation:**
- The stash command is scoped to `config/global-defaults.json` (the only known uncommitted change at planning time). The executor verifies `git status` is otherwise clean before running the stash command.
- Stash name `phase-24-w2-prestart` is unique and recoverable: `git stash list` → `git stash show -p stash@{N}` → `git stash pop stash@{N}` after the wave lands.

---

## 9. Out of Scope for Wave 2

Reaffirmed — these are **explicitly out of scope** and must not appear in Wave 2 commits:

- **No code changes.** No identifier renamed. No executable line edited / moved / deleted. No reordering.
- **No file decomposition** (Wave 3) — section dividers in `runtime-projection-mapping.js` stay; the duplicate zoom math stays duplicated.
- **No naming changes** (Wave 4) — `syncFoo` / `applyFoo` patterns stay as-is.
- **No module-boundary work** (Wave 5) — no cycle removal, no transitive re-export pruning.
- **No dead-code removal beyond what already happened in Wave 1.** If the executor notices new dead code while editing comments, surface to INVENTORY.md "Discovered but deferred"; don't act in this wave.
- **No type annotations / JSDoc types** — out of scope for Phase 24 entirely.
- **No new tests** — out of scope for Phase 24 entirely.
- **No README / docs rewrites** — already done in Phase 23.

If during execution a candidate change is unclear which wave it belongs to: **defer to the later wave.** Wave 2's contract is "comment-only, mechanical, grep-verified, zero behaviour change."

---

## 10. INVENTORY.md Template (executor creates this file)

```markdown
# Phase 24 Wave 2 — Comment-Hygiene Inventory

Updated incrementally as each commit lands. Last update: <date>.

## Baseline (pre-flight)

| Metric | Pre-Wave-2 |
|--------|-----------:|
| `.js` files in `src/` | 77 |
| Total `.js` lines | 30 659 |
| Comment lines (JS) | 2 342 |
| Comment density (JS) | 7.6300 % |
| Comment blocks ≥ 3 lines | 332 |
| Long blocks ≥ 8 lines | 66 |
| Phase-marker hits (JS) | 434 |
| Phase-marker hits (CSS) | 75 (73 from RESEARCH §1 + 2 from components.css) |
| Section dividers (── style) | 20 (all in projection-mapping) |
| Section dividers (=== / --- style) | 12 |
| JSDoc `/** … */` blocks | 3 (all in projection-mapping) |

## Decisions (confirmed pre-flight)

- **CSS scope:** INCLUDED (C6 lands). Confirmed <date>.
- **Load-bearing markers (~10 sites):** strip prefix only; bodies kept verbatim. Confirmed <date>.
- **`runtime-regression-tests.js` carve-out:** strip header prefixes only; leave fix-documenting bodies intact. Per-line enumeration in §"Carve-out" below. Confirmed <date>.
- **Section dividers in `runtime-projection-mapping.js` (20):** retained through Wave 2; Wave 3 will use them as split boundaries. Confirmed <date>.
- **Duplicate zoom-around-anchor math (`runtime-viewport-zoom.js:310-322` + `runtime-orchestration.js:2574-2593`):** prefix-stripped in both sites; bodies kept verbatim and duplicated. Orchestration's tail `:2594-2596` `Phase 14-2: ... moved to ...` is a separate DELETE WHOLE block in C1 (per §5.3 disambiguation) — not part of the math derivation. Wave 3 dedupes the math at code level. Confirmed <date>.
- **Pre-execution stash:** `phase-24-w2-prestart` (stashed config/global-defaults.json before C1).
- **Pre-execution tag:** `phase-24-w2-start` set on HEAD `<sha>` (rollback target).

## Per-commit progress

| # | Hash | Files | Added | Removed | Comment-lines net delta | Markers eliminated | Primary gate empty | Smoke pass |
|---|------|-------|------:|--------:|------------------------:|-------------------:|:------------------|:-----------|
| C1 | … | … | … | … | … | … | yes | yes |
| C2 | … | … | … | … | … | … | yes | yes |
| C3 | … | … | … | … | … | … | yes | yes |
| C4 | … | … | … | … | … | … | yes | yes |
| C5 | … | … | … | … | … | … | yes | yes |
| C6 | … | … | … | … | … | … | yes | yes |

## Carve-out: regression-tests touched lines

| File:Line | Decision | Reason |
|-----------|----------|--------|
| `runtime-regression-tests.js:1` | STRIP (C1) | Pure module-header prefix; no body |
| `runtime-regression-tests.js:NNN` | KEEP | Body documents why a subtest changed |
| … | … | … |

## Kept (load-bearing WHY) — every prefix-stripped survivor

| File:Line | WHY it carries |
|-----------|----------------|
| `runtime-projection-mapping.js:159-163` | WebGL fallback exists because 2D-canvas produces seams |
| `runtime-projection-mapping.js:197-202` | Lean GL options tuned for RPi |
| `runtime-orchestration.js:385-390` | QUICK_MODE_VALUES back-compat for old snapshots |
| `runtime-runtime-controls.js:275-284` | Snapshot definition fields onto running instance — Live Editor edit target |
| `runtime-fx-normalizers.js:40-47` | Icon key boot-order tolerance |
| `runtime-draw-loop.js:114-118` | Hull-flicker × solid-color rendering rule |
| `runtime-draw-loop.js:125-132` | Flicker delivered via solid-color gate, not double overlay |
| `runtime-fx-panels.js:16-21` | Separate "editing" from "playing" outside animation |
| `runtime-orchestration.js:359-366` | Stable stretch-anchor cache (full WHY + planning-doc URL) |
| `runtime-viewport-zoom.js:310-322` | Zoom-around-anchor math derivation |
| `runtime-orchestration.js:2574-2596` | Same math derivation (duplicated; Wave 3 dedupes) |
| (continue for all ~32 entries) | … |

## Deferred to future wave

| Item | Reason | Defer-to |
|------|--------|----------|
| Section dividers in `runtime-projection-mapping.js` (20) | Used as Wave 3 split boundaries | Wave 3 |
| Duplicate zoom math (viewport-zoom.js:310 + orchestration.js:2574) | Code-level dedupe out of scope; comments stripped in this wave | Wave 3 |

## End-of-wave verification

Run date: <date> (post-C6).

| Acceptance grep / metric | Pre-Wave-2 | Post-Wave-2 | Pass |
|---------------------------|------------|-------------|------|
| JS phase-marker hits (excl. regression-tests carve-out) | 434 | 0 | yes |
| CSS phase-marker hits | 75 | 0 | yes |
| JS comment lines | 2 342 | ≤ 2 142 | yes |
| JS comment density | 7.63 % | ≤ 6.95 % | yes |
| Long-block count (≥ 8) | 66 | ≤ 55 | yes |
| Primary gate (strong `grep -v` chain) `phase-24-w2-start..HEAD -- 'src/**/*.js' 'src/**/*.css'` | — | empty | yes |
| ROADMAP regression checklist | — | pass | yes |

## Wave 2 commits

| # | Hash | Message |
|---|------|---------|
| 1 | `…` | refactor(24-2): strip Phase 14-2 module-header prefixes + orchestration "moved to" blocks |
| 2.1 | `…` | refactor(24-2.1): strip in-function phase-marker prefixes — orchestration |
| 2.2 | `…` | refactor(24-2.2): strip in-function phase-marker prefixes — animation cluster |
| 2.3 | `…` | refactor(24-2.3): strip in-function phase-marker prefixes — viewport cluster |
| 2.4 | `…` | refactor(24-2.4): strip in-function phase-marker prefixes — fx cluster |
| 2.5 | `…` | refactor(24-2.5): strip in-function phase-marker prefixes — long-tail |
| 3 | `…` | refactor(24-2): delete redundant comments that paraphrase code beneath |
| 4 | `…` | refactor(24-2): strip W3b- suffixes from animation-editor section dividers |
| 5a | `…` | refactor(24-2.5a): shorten long comment blocks — orchestration |
| 5b | `…` | refactor(24-2.5b): shorten long comment blocks — non-orchestration |
| 6 | `…` | refactor(24-2): strip phase-marker prefixes from CSS comments |
```

---

## 11. Execution Order Summary

1. **Pre-flight** — clean tree (stash unrelated changes), set rollback tag `phase-24-w2-start`, baseline metrics, decision log, INVENTORY.md skeleton, abbreviated smoke pass to confirm green starting state.
2. **C1** — orchestrator-bulk Phase 14-2 headers + module-header prefixes (~110 line changes). Smoke: boot + boards + one animation + `/output`. Update INVENTORY.md.
3. **C2** — in-function phase-marker prefix strip (real-WHY band, file-by-file, ~250-300 line edits) across 5 atomic sub-commits: **C2.1** orchestration; **C2.2** animation cluster; **C2.3** viewport cluster; **C2.4** FX cluster; **C2.5** long-tail. Smoke after each sub-commit + per-file primary-gate checks; broad smoke at end of C2.5. Update INVENTORY.md after each sub-commit.
4. **C3** — delete redundant paraphrase-of-code comments (~31 deletions: ~17 orchestration + ~10 fx-panels + 1 draw-loop + 1 animation-lifecycle + 1 orchestration:2535 zoom-slider-removed block per Warning 10). Smoke: Live Editor + `/output` + animations. Update INVENTORY.md.
5. **C4** — strip W3b- suffixes from animation-editor section dividers (4 line edits). Smoke: animation editor scope-switch + create/delete. Update INVENTORY.md.
6. **C5** — long-block manual shortening (12 pre-decided blocks across 2 atomic sub-commits: **C5a** orchestration's 5 blocks; **C5b** the remaining 7 blocks across 6 files). Smoke after each sub-commit: full smoke pass (every animation type + cluster pad + zoom + drag + `/output`). Update INVENTORY.md.
7. **C6** — CSS phase-marker strip (75 markers, 5 files: styles.css 37 + theme-obsidian 24 + animation-editor 6 + foundations 4 + components.css 2). Smoke: theme toggle + topbar + animation editor layout + `/output` styles. Update INVENTORY.md.
8. **End-of-wave** — full ROADMAP regression checklist (10–15 min). Aggregate greps + comment-density check + the **primary gate** (strong `grep -v` chain on `phase-24-w2-start..HEAD`) returning empty. Wave declared complete only when all acceptance criteria in §2 are met.
