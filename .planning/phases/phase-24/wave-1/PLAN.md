# Phase 24 Wave 1 — Executable Plan: Dead-Code & Debug-Log Cleanup

**Wave:** 24-1
**Type:** Code-quality refactor (no behaviour change)
**Inputs:** [ROADMAP.md](../ROADMAP.md), [RESEARCH.md](./RESEARCH.md)
**Slicing:** 6 commits (C1–C6), with C5 sub-divided into 4 atomic sub-commits.
**Estimated wave length:** ~3–4 hours executor work + 10–15 min full regression at end.

---

## 1. Goal

Wave 1 removes **debug-only logs**, the **single `__TT_*_DEBUG__` flag**, **confirmed dead exports / functions / DOM refs**, and **orphan assets** from the codebase. It is a pure subtractive pass: every change is a deletion, and every deletion is gated by a grep that proves zero callers remain.

**Stays unchanged:** every user-facing behaviour, every README-documented feature, every live-sync protocol field, every export-bundle JSON shape, every `localStorage` key, every dependency. The user must observe identical UX before and after this wave.

---

## 2. Acceptance Criteria

This wave is done when **all** of the following are true:

- [ ] `grep -rn "__TT_.*_DEBUG__" src/` → **zero matches**.
- [ ] `grep -rn "console\.info(" src/ | grep -v "src/app/lib/shared/logger.js"` → **zero matches**.
  *Carve-out:* `src/app/lib/shared/logger.js:42` is the structured-logger routing chokepoint and is the only sanctioned `console.info(` call. (See RESEARCH.md §B and Risk Area 1.)
- [ ] `grep -rn "console\.log(" src/` → **zero matches** (already true; recheck at wave end).
- [ ] Every removal listed in this plan has both a *pre-removal* and *post-removal* grep recorded in `INVENTORY.md`, and the post-removal grep returns zero matches.
- [ ] Full ROADMAP feature regression checklist (ROADMAP §"Test plan", lines 203–275) passes.
- [ ] `INVENTORY.md` exists at `.planning/phases/phase-24/wave-1/INVENTORY.md`, listing every removal (one line per removal: identifier + file:line + grep evidence count) and updated incrementally as each commit lands.
- [ ] User has been asked about `resources/animations/malfunction2.mp4` (58 MB), and either it is removed (C7) or explicitly retained.
- [ ] User has been asked about `window.TT_BEAMER_LIVE_SYNC_DEBUG` (DevTools snapshot bag, RESEARCH.md Risk 7) and either it is removed or explicitly retained.
- [ ] Placeholder comments at these locations are removed: `runtime-wire-calibration-binders.js:1-14,17` (whole file, addressed by C2) and `runtime-projection-mapping.js:1945-1948` (legacy-compat comment, addressed by C3 alongside the exports it describes). `foundations.css:85` and `icons.js:163-170` are explicitly **deferred to Wave 2** (comment-only locations not bound to a symbol deletion in this wave).

---

## 3. Pre-Flight Checklist (before C1)

Mechanical setup the executor performs **once** before opening C1:

- [ ] Confirm clean working tree on `master` (no staged or modified files).
- [ ] Re-run baseline greps and record counts in `INVENTORY.md` "Baseline" section:
  - `grep -rn "console\.info(" src/ | wc -l` → expect **10** (9 in `runtime-animation-lifecycle.js`, 1 in `logger.js`).
  - `grep -rn "__TT_.*_DEBUG__" src/ | wc -l` → expect **1** (`runtime-animation-lifecycle.js:1201`).
  - `grep -rn "console\.log(" src/ | wc -l` → expect **0**.
  - `grep -rn "console\.debug(" src/ | wc -l` → expect **1** (`logger.js:45`).
- [ ] Manually run an abbreviated smoke pass on `node server.mjs` to confirm the **starting** state is green (this is the baseline against which "no behaviour change" is measured). Open the dashboard, switch a board, trigger one cluster-pad animation, open `/output`. Note any pre-existing oddities so they aren't blamed on Wave 1.
- [ ] **Decision-point with user:** confirm logger.js carve-out is acceptable (RESEARCH.md §B). Default: yes — adopt the carve-out.
- [ ] **Decision-point with user:** ask about `window.TT_BEAMER_LIVE_SYNC_DEBUG` (`runtime-bootstrap.js:230-232`). Outside the strict `__TT_*_DEBUG__` pattern, but a DevTools-only debug bag with zero `src/` readers. Default if no answer: keep (out of scope this wave).
- [ ] **Decision-point with user:** ask about `resources/animations/malfunction2.mp4` (58 MB candidate orphan, RESEARCH.md §H). Sole reference is in the pre-migration backup; current code/config never reference it. Get an explicit yes/no on removal before C7 lands. Default if no answer: keep (record in INVENTORY.md "Kept (user-confirmed)").
- [ ] **Decision-point with user:** confirm whether they want a pre-migration backup commit/branch before C1 lands (e.g. `git branch pre-phase-24-wave-1` or a snapshot tag). Default if no answer: skip — every commit in this wave is independently revertable, so an explicit branch backup is optional belt-and-braces.
- [ ] Initialise `INVENTORY.md` with header + Baseline section (template in §10 below).

---

## 4. Commit Plan

Each commit is **independently revertable**. Each commit has its own pre-/post-removal grep + adjacent regression smoke test. Commits run in order; do not skip ahead.

---

### C1 — Strip `__TT_CLUSTER_DEBUG__` flag and all `[cluster-pad]` debug info logs

**Files touched**
- `src/app/runtime/animation/runtime-animation-lifecycle.js`

**What changes** (See RESEARCH.md §B & §"Recommended commit slicing" → C1)

Remove the following debug-only blocks. Line numbers are from RESEARCH.md; verify against actual file before editing:

- [ ] Lines 1201–1208 — entire `if (window.__TT_CLUSTER_DEBUG__) { console.info("[cluster-pads] board=", ...); }` block.
- [ ] Line 1251 — `console.info("[cluster-pad] click", { ... });`
- [ ] Line 1302 — `console.info("[cluster-pad] tap-action route", { ... });`
- [ ] Lines 1331–1337 — `console.info("[cluster-pad] toggle entry", { ... });`
- [ ] Line 1339 — `console.info("[cluster-pad] -> STOP same-type path", { ... });`
- [ ] Line 1347 — `console.info("[cluster-pad] -> START path ...");`
- [ ] Line 1360 — `console.info("[cluster-pad] startRoomAnimationFromDraft returned (sync)");`
- [ ] **Lines 1373–1385** — `console.info("[cluster-pad] dispatch toggle result", { ..., clusterEntriesBefore: beforeClusterCount, ... });`
  — see Special Handling §5.2: this block references undefined `beforeClusterCount`; deletion incidentally eliminates a latent `ReferenceError` path.
- [ ] Line 1397 — `console.info("[cluster-pad] CLEAR all", { matches: matches.length });`

**Keep:** `console.warn` at lines 1181, 1365 and `console.error` at line 1362 — these are genuine error paths (RESEARCH.md §E).

**Pre-removal verification**
```bash
grep -n "__TT_CLUSTER_DEBUG__\|console\.info" src/app/runtime/animation/runtime-animation-lifecycle.js
```
Expect 9 hits matching the lines above + zero other `console.info` calls in this file.

**Post-removal verification**
```bash
grep -rn "__TT_.*_DEBUG__" src/                                              # → expect zero
grep -rn "console\.info(" src/ | grep -v "src/app/lib/shared/logger.js"      # → expect zero
grep -n "beforeClusterCount" src/                                            # → expect zero (the variable was only referenced inside the deleted log)
```

**Smoke tests** (adjacent — ROADMAP "Play areas + clusters", "Animations + dispatch", "Tap-Action")
- [ ] Create a cluster of 3 rooms; cluster pad appears in left rail.
- [ ] Arm Fire, tap cluster pad → fire starts on every room in cluster + plays inside the pad.
- [ ] Without disarming, arm Scanning, tap the same cluster pad → scanning **stacks on top** of fire (both run).
- [ ] Re-arm Fire, tap cluster pad → only fire stops; scanning continues. (Type-aware toggle, the path the recent commits a0112df/5bc0121/d22be46 fixed.)
- [ ] Cluster Clear → every cluster-scope animation stops.
- [ ] Cluster pad header reads "Cluster"; touch-momentum scrolling works on phone.

**Commit message**
```
refactor(24-1): remove __TT_CLUSTER_DEBUG__ flag and cluster-pad info logs

Removes the debug-only window.__TT_CLUSTER_DEBUG__ flag and all 9
console.info("[cluster-pad] ...") calls in runtime-animation-lifecycle.
These were added during Phase 23 cluster-pad debugging and have no
production purpose.

Incidentally removes a latent ReferenceError: the deleted log block at
~line 1377 referenced an undefined `beforeClusterCount` symbol; deletion
eliminates the error path. No behaviour change observable to the user.

Acceptance:
- grep -rn '__TT_.*_DEBUG__' src/ → 0
- grep -rn 'console.info(' src/ | grep -v logger.js → 0
```

**Rollback**: `git revert <C1-sha>` — restores all 9 logs and the debug flag block. No file moves; clean revert.

---

### C2 — Remove the no-op `runtime-wire-calibration-binders.js` module

**Files touched**
- `src/app/runtime/wire/runtime-wire-calibration-binders.js` *(deleted)*
- `src/app/runtime/runtime-orchestration.js`
- `index.html`

**What changes** (See RESEARCH.md §"Dead module" + §"Recommended commit slicing" → C2)

- [ ] Delete file `src/app/runtime/wire/runtime-wire-calibration-binders.js` entirely (23 lines; the body is `// intentionally empty`).
- [ ] Delete the `<script>` tag at `index.html:862` that loads the file.
- [ ] Delete `runtime-orchestration.js:2540-2570` — the `window.TT_BEAMER_RUNTIME_WIRE_CALIBRATION_BINDERS.wireCalibrationBinders({ ... })` call block. (Verify exact line range; the call passes ~30 ctx args.)

**Pre-removal verification**
```bash
grep -rn "CALIBRATION_BINDERS\|wireCalibrationBinders" src/ index.html
grep -i "calibration" debug/p14-orchestration-module-exports-check.mjs
```
First grep should show: declaration in the dead file, the script tag in index.html, and the orchestration call site (and nothing else). Second grep must return empty (smoke test does not depend on this module — RESEARCH.md §"Dead module").

**Post-removal verification**
```bash
grep -rn "CALIBRATION_BINDERS\|wireCalibrationBinders" src/ index.html   # → expect zero
ls src/app/runtime/wire/runtime-wire-calibration-binders.js              # → expect "No such file"
```

**Smoke tests** (adjacent — ROADMAP "Boards & rooms", and any feature that consumed pre-Phase-15-2 calibration panels)
- [ ] Switch boards via dropdown — outlines + animations refresh.
- [ ] Edit a polygon: drag vertex, double-click edge, delete vertex.
- [ ] `Ctrl+Z` / `Ctrl+Shift+Z` undo / redo polygon edits.
- [ ] Server boots cleanly (`node server.mjs`); no console error about missing `TT_BEAMER_RUNTIME_WIRE_CALIBRATION_BINDERS`.
- [ ] Page loads without 404 for the removed `<script>` (check Network tab).

**Commit message**
```
refactor(24-1): remove no-op calibration-binders module

runtime-wire-calibration-binders.js is a 23-line shell whose only
function body is "// intentionally empty — panels removed in
Phase 15-2". It was kept solely so the orchestration wire call site
and the runtime-module-exports-check smoke test stayed satisfied.

Removes the file, the orchestration call block (~30 lines of arg
threading), and the <script> tag from index.html. No behaviour change.
```

**Rollback**: `git revert <C2-sha>` — restores the file, the script tag, and the orchestration call. Clean revert.

---

### C3 — Remove confirmed dead exports + dead internal function

**Files touched**
- `src/app/lib/persistence/board-profiles.js`
- `src/app/runtime/viewport/runtime-projection-mapping.js`
- `src/app/runtime/viewport/runtime-polygon-drag-support.js`
- `src/app/runtime/ui/animation-editor-view.js`

**What changes** (See RESEARCH.md §"Dead exported functions / constants" + §"Dead internal function")

- [ ] `board-profiles.js` lines 2–12 — remove `readJson` function declaration.
- [ ] `board-profiles.js` lines 14–21 — remove `writeJson` function declaration.
- [ ] `board-profiles.js` lines 185, 186 — remove `readJson` and `writeJson` entries from the `window.TT_BEAMER_PERSISTENCE` export object.
- [ ] `runtime-projection-mapping.js` line 62 — remove `CORNER_KEYS` declaration.
- [ ] `runtime-projection-mapping.js` lines 1944–1948 — remove `CORNER_KEYS`, `beginGridWarpFrame`, `endGridWarpFrame` exports + the explanatory legacy-compat comment (RESEARCH.md §F flagged this comment for removal alongside the exports).
- [ ] `runtime-polygon-drag-support.js` lines 49–51 — remove `isPolygonDragActive` function declaration.
- [ ] `runtime-polygon-drag-support.js` line 273 — remove `isPolygonDragActive` from the export object.
- [ ] `animation-editor-view.js` lines 582–608 — remove `buildPlaybackCard(scope, def, boardId)` function declaration. If lines 577–581 are a header comment that solely describes the deleted function, remove them too.

**Pre-removal verification** (one grep per symbol; each must match only the declaration site)
```bash
grep -rn "\breadJson\b" src/                  # → expect refs only in board-profiles.js
grep -rn "\bwriteJson\b" src/                 # → expect refs only in board-profiles.js
grep -rn "\bCORNER_KEYS\b" src/               # → expect 2 refs only in runtime-projection-mapping.js
grep -rn "\bbeginGridWarpFrame\b" src/        # → expect 1 ref only in runtime-projection-mapping.js
grep -rn "\bendGridWarpFrame\b" src/          # → expect 1 ref only in runtime-projection-mapping.js
grep -rn "\bisPolygonDragActive\b" src/       # → expect refs only in runtime-polygon-drag-support.js
grep -rn "\bbuildPlaybackCard\b" src/         # → expect 1 ref only in animation-editor-view.js
```
**Repo-wide cross-check (RESEARCH.md Risk 2 mitigation):** also grep `server.mjs`, `index.html`, `scripts/`, `docs/` for each symbol. Any external hit blocks removal.
```bash
grep -rn "\breadJson\|writeJson\|CORNER_KEYS\|beginGridWarpFrame\|endGridWarpFrame\|isPolygonDragActive\|buildPlaybackCard\b" server.mjs index.html scripts/ docs/ 2>/dev/null
```
Expect: zero matches.

**Post-removal verification**
```bash
grep -rn "\breadJson\b\|\bwriteJson\b\|\bCORNER_KEYS\b\|\bbeginGridWarpFrame\b\|\bendGridWarpFrame\b\|\bisPolygonDragActive\b\|\bbuildPlaybackCard\b" src/
```
Expect: zero matches.

**Smoke tests** (adjacent — ROADMAP "Polygon", "Align Mode", "Animations", "Export / Import")
- [ ] Drag a polygon vertex; rotate room; verify drag works (covers `isPolygonDragActive` removal).
- [ ] Toggle Align Mode; drag corner / line / intersection / rotate handles; right-click context menu (add/remove line, save/load profile, reset). Reload — saved profile persists. (Covers `CORNER_KEYS` + grid-warp shim removal.)
- [ ] Open animation editor; switch scope (Inside / Outside / Room); edit Mode + Direction for an Outside coded animation. (Covers `buildPlaybackCard` removal — the place it would have been called.)
- [ ] Export per-board bundle, re-import — diff is zero. (Covers `readJson` / `writeJson` removal — confirms `extractBoardProfilesCandidate`/`buildMigratedBoardProfiles` paths are independent.)
- [ ] `/output` renders animations; identity grid + warped grid both render correctly.

**Commit message**
```
refactor(24-1): remove dead exports + buildPlaybackCard

Removes 6 confirmed-dead exports and 1 dead internal function:
- readJson, writeJson (board-profiles.js): never destructured by any
  consumer of TT_BEAMER_PERSISTENCE.
- CORNER_KEYS (runtime-projection-mapping.js): only the declaration
  and the export — never read.
- beginGridWarpFrame, endGridWarpFrame: legacy no-op shims kept
  "so nothing crashes if called", but no caller exists.
- isPolygonDragActive: zero external callers; internal predicate is
  read directly via `polygonDragActive`.
- buildPlaybackCard (animation-editor-view.js): orphaned by the
  Phase 22 W3b-3 inlining of Mode + Direction into the Defaults card.

Each removal verified by repo-wide grep before deletion. No behaviour
change.
```

**Rollback**: `git revert <C3-sha>` restores all 7 symbols + their export entries + the legacy-compat comment. Clean revert.

---

### C4 — Remove dead `quickMode{Activate,Deactivate}Button` bindings

**Files touched**
- `src/app/runtime/core/runtime-dom-refs.js`
- `src/app/runtime/runtime-orchestration.js`
- `src/app/runtime/wire/runtime-wire-navigation-binders.js`
- `src/app/runtime/animation/runtime-quick-mode.js` *(comment-only update)*

**What changes** (See RESEARCH.md §"Dead DOM bindings" + §"Recommended commit slicing" → C4)

- [ ] `runtime-dom-refs.js` lines 159–164 — remove the explanatory comment AND the two `quickModeActivateButton` / `quickModeDeactivateButton` querySelector entries.
- [ ] `runtime-orchestration.js` line 122 — remove the destructure entries for both buttons.
- [ ] `runtime-orchestration.js` lines 1331–1332 — remove ctx-thread.
- [ ] `runtime-orchestration.js` lines 2516–2517 — remove the second ctx-thread.
- [ ] `runtime-wire-navigation-binders.js` lines 23–24 — remove destructure entries.
- [ ] `runtime-wire-navigation-binders.js` lines 127–133 — remove the two `?.addEventListener` wires (each calls `setQuickMode("toggle")`, redundantly with the live `quickModeToggleButton` at line 123).
- [ ] `runtime-quick-mode.js` lines 8–9 — remove the comment listing the deleted DOM refs (cosmetic; cleaner output).

**Pre-removal verification**
```bash
grep -rn "quickModeActivate\|quickModeDeactivate\|quick-mode-activate\|quick-mode-deactivate" src/ index.html
```
Expect: matches only at the lines above. **Repo-wide check** (RESEARCH.md Risk 2): confirm `server.mjs`, `scripts/`, `docs/` show zero matches.

Also confirm these IDs are absent from `SETTINGS_EXCLUSIVE_CONTROL_IDS` (they should be — RESEARCH.md notes Phase 21-1 already pruned them):
```bash
grep -n "quick-mode-activate\|quick-mode-deactivate" src/app/runtime/runtime-orchestration.js
```
Expect: zero matches inside the `SETTINGS_EXCLUSIVE_CONTROL_IDS` array (~lines 178–247). If any appear, remove them in this commit.

**Live-sync mitigation grep** (uniformity with C5 universal procedure Step 3 — RESEARCH.md Risk 1):
```bash
grep -rn "quickModeActivateButton\|quickModeDeactivateButton" src/app/runtime/live-sync/
# Expected: 0 matches
```
These are buttons rather than snapshot fields, so this is expected to return zero — but running the same check pattern here as in C5 keeps the wave's verification discipline uniform.

**Post-removal verification**
```bash
grep -rn "quickModeActivate\|quickModeDeactivate\|quick-mode-activate\|quick-mode-deactivate" src/ index.html
```
Expect: zero matches.

**Smoke tests** (adjacent — ROADMAP "Tap-Action")
- [ ] Tap-Action mode = Off → taps do nothing.
- [ ] Tap-Action mode = Toggle → first tap on a room starts the armed animation; second tap stops it. (This uses `#quick-mode-toggle`, the live button — confirms the path the deleted handlers redundantly invoked still works.)
- [ ] Tap-Action mode = Clear → taps stop every animation in the target room/cluster.
- [ ] Cluster pad respects current Tap-Action mode (Off/Toggle/Clear).

**Commit message**
```
refactor(24-1): remove dead quick-mode-activate/-deactivate bindings

The DOM ids #quick-mode-activate and #quick-mode-deactivate were
removed from index.html in an earlier phase; their JS handlers
remained as ?.addEventListener no-ops that called setQuickMode("toggle"),
duplicating the live #quick-mode-toggle button.

Removes the DOM ref entries, orchestration destructure + ctx-thread,
wire bindings, and the comment in runtime-quick-mode.js. The live
#quick-mode-toggle path is unchanged. No behaviour change.
```

**Rollback**: `git revert <C4-sha>` restores all bindings (which would silently re-no-op since the IDs don't exist). Clean revert.

---

### C5 — Triage and remove dead DOM refs (4 sub-commits)

This is **the riskiest sub-pass of Wave 1.** RESEARCH.md §E identifies 112 candidate dead DOM refs in `runtime-dom-refs.js`, but warns the planner did NOT verify that none are produced dynamically (e.g. `createElement` + `setAttribute("id", ...)` in JS).

**Splitting strategy:** group by feature area so each sub-commit has its own small, themed regression. Each sub-commit is independently revertable. **Run the FULL ROADMAP regression after C5 lands**, not just the per-sub-commit smoke tests.

#### C5 universal pre-removal verification (run once for every candidate id)

For each `#id` in the candidate list:

```bash
# Step 1: confirm not produced dynamically
grep -rn "id=\"<id>\"" .                          # any HTML ownership?
grep -rn "createElement\|setAttribute(\"id\"" src/ | grep "<id>"  # any JS construction?
grep -rn "\\.id\\s*=\\s*[\"'<id>]" src/           # any direct .id = "..."?

# Step 2: confirm the dom-refs entry has zero consumers in src/ after removal
grep -rn "\\b<camelCaseRefName>\\b" src/ index.html

# Step 3: live-sync mitigation (RESEARCH.md Risk 1 in §"Risks")
grep -rn "<id>\\|<camelCaseRefName>" src/app/runtime/live-sync/
# If the id appears in any live-sync handler / snapshot deserializer, KEEP it.

# Step 4: presence in regression-test ownership list
grep -n "<id>" src/app/runtime/runtime-orchestration.js  # check ~lines 178-247
# If present in SETTINGS_EXCLUSIVE_CONTROL_IDS, remove it from there too.
```

**Decision rule:** if any of Steps 1–3 produces a match outside the dom-refs.js declaration site, **keep the ref**. Document the keep-decision in `INVENTORY.md` "Kept (false positive)" section.

#### C5.1 — Legacy hitarea calibration controls

**Candidates** (from RESEARCH.md §E)
- `#hitarea-offset-x`, `#hitarea-offset-y`, `#hitarea-scale`, `#hitarea-save`, `#hitarea-reset`, `#hitarea-status`, plus any `#hitarea-*-value` paired displays.

**Files touched**
- `src/app/runtime/core/runtime-dom-refs.js` (delete entries)
- `src/app/runtime/runtime-orchestration.js` (delete destructure + any ctx-threads + `SETTINGS_EXCLUSIVE_CONTROL_IDS` strings)
- Any `runtime-wire-*.js` that bound these refs (delete bindings)

**Pre-/post-removal verification:** apply C5 universal procedure. Final state:
```bash
grep -rn "hitarea-offset\|hitarea-scale\|hitarea-save\|hitarea-reset\|hitarea-status" src/ index.html
```
Expect: zero matches.

**Smoke tests** (adjacent — Boards & rooms; Polygon edits; Align Mode)
- [ ] Polygon edit (drag vertex, drag edge) still works.
- [ ] Align Mode opens; corner / line / intersection / rotate handles still drag.
- [ ] Settings panel for Rooms (subtab where hitarea calibration USED to live) opens without console error.

**Commit message**
```
refactor(24-1): remove dead hitarea-calibration DOM refs

Hitarea calibration panels were removed in Phase 15-2 but the
runtime-dom-refs entries (and their wire-bindings as no-ops) lingered.
Deletes the ref declarations, orchestration destructure, ctx-threads,
and any SETTINGS_EXCLUSIVE_CONTROL_IDS entries.
```

**Rollback**: `git revert <C5.1-sha>` — restores the stale refs (no functional impact since IDs don't exist).

#### C5.2 — Legacy room-geometry sliders

**Candidates**
- `#room-geometry-mode`, `#room-geometry-x`, `#room-geometry-y`, `#room-geometry-stretch-x`, `#room-geometry-stretch-y`, `#room-geometry-status` + their `-value` display IDs.

**Files touched** (same pattern as C5.1)
- `runtime-dom-refs.js`, `runtime-orchestration.js`, applicable `runtime-wire-*.js`.

**Pre-/post-removal verification:** apply C5 universal procedure.
```bash
grep -rn "room-geometry-" src/ index.html   # post: zero
```

**Smoke tests** (adjacent — Boards & rooms; Animations)
- [ ] Move a room (drag), resize the polygon. Behaviour matches pre-Wave-1.
- [ ] Trigger an animation that scales/stretches inside the polygon (Fire, Slime). Renders correctly.

**Commit message**
```
refactor(24-1): remove dead room-geometry DOM refs

The room-geometry slider panel was absorbed into the Phase 22 W3b
animation editor; the dom-refs entries pointing at the legacy
#room-geometry-* IDs are stale.
```

**Rollback**: `git revert <C5.2-sha>` — clean.

#### C5.3 — Pre-W3b animation-editor controls

**Candidates** (largest sub-group — likely 40–60 IDs)
- `#inside-animation-select`, `#outside-animation-select`
- `#room-animation-settings-*`
- `#room-asset-type`, `#room-resource-select`
- `#room-rotation-deg`, `#room-stretch-to-polygon`
- `#room-width-scale`, `#room-height-scale`
- `#room-offset-x-scale`, `#room-offset-y-scale`
- `#room-mode-indicator`, `#inside-mode-indicator`, `#outside-mode-indicator`
- `#room-breaks-solid-color`, `#room-breaks-solid-color-label`

**Critical gate:** RESEARCH.md §E warns that `#inside-animation-select` appears in `SETTINGS_EXCLUSIVE_CONTROL_IDS` at `runtime-orchestration.js:231`, suggesting it was once a static control. The Phase 21-1 cleanup left some entries in place. For each candidate above, **MUST** verify against `SETTINGS_EXCLUSIVE_CONTROL_IDS` and remove from that list too if present.

Also: animation-editor controls are most at risk of being **dynamically created** by the W3b editor (`createElement`). Apply Step 1 of the universal procedure rigorously.

**Size cap (atomicity rule):** if the final candidate ID list (after pruning false positives via the universal procedure) exceeds **25 entries**, split C5.3 into themed sub-sub-commits before landing — e.g. `C5.3a (room-animation-settings-*)`, `C5.3b (room-{width,height,offset}-scale + rotation/stretch)`, `C5.3c (mode-indicators + breaks-solid-color + remaining selects)`. Use the same per-id verification template inside each sub-sub-commit. This keeps any single revert ≤25 line-level deletions and matches the C5.1/C5.2 atomicity profile.

**Files touched** (same pattern as C5.1, plus likely `runtime-orchestration.js` SETTINGS_EXCLUSIVE_CONTROL_IDS list)

**Pre-/post-removal verification**
```bash
# Per-id (Step 1 of universal proc.) — must run for each one
grep -rn "id=\"inside-animation-select\"" .       # expect zero
grep -rn "createElement.*inside-animation-select\|setAttribute.*inside-animation-select" src/   # expect zero
# … repeat for every candidate. Document each per-id grep in INVENTORY.md.

# Aggregate post-removal:
grep -rn "inside-animation-select\|outside-animation-select\|room-animation-settings\|room-asset-type\|room-resource-select\|room-rotation-deg\|room-stretch-to-polygon\|room-width-scale\|room-height-scale\|room-offset-x-scale\|room-offset-y-scale\|room-mode-indicator\|inside-mode-indicator\|outside-mode-indicator\|room-breaks-solid-color" src/ index.html
```
Expect: zero matches **except** in tests / planning docs that legitimately reference the historical names.

**Smoke tests** (adjacent — Animations + dispatch; Animation editor; Settings panels)
- [ ] Open Settings → each subtab (Board / Rooms / Polygon / Sounds / System / Animations). Each opens without console error and visible controls work.
- [ ] Open the W3b animation editor; switch scope (Inside / Outside / Room).
- [ ] Edit Mode + Direction for an Outside coded animation (Sandstorm / Space travel).
- [ ] Edit Color for a Room solid-color animation; change Opacity / Intensity / Speed / Sound-volume sliders for a running animation.
- [ ] Trigger Slime, Malfunction (GIF), Fire (coded), an MP4 — each renders.

**Commit message**
```
refactor(24-1): remove pre-W3b animation-editor DOM refs

The Phase 22 W3b animation editor replaced the static #inside-/
#outside-/#room-animation-* control panels with a dynamic per-scope
editor. The runtime-dom-refs entries pointing at the legacy IDs are
stale. Also purges the matching strings from
SETTINGS_EXCLUSIVE_CONTROL_IDS in runtime-orchestration.js.

Per-id verification documented in INVENTORY.md.
```

**Rollback**: `git revert <C5.3-sha>` — restores all stale refs and the SETTINGS_EXCLUSIVE_CONTROL_IDS entries. Clean.

#### C5.4 — Remaining miscellaneous dead DOM refs

**Candidates:** any IDs from RESEARCH.md §E's 112-list not covered by C5.1–C5.3.

**Files touched** (same pattern)

**Pre-/post-removal verification:** apply C5 universal procedure per id.

**Smoke tests** — Run the **full ROADMAP regression checklist** (Boards & rooms, Play areas + clusters, Animations + dispatch, Tap-Action, `/output`, Align Mode, Theme + UI, Sounds, Export / Import, Live-sync). C5.4 is the catch-all and the safest place to discover any missed dynamic-id case.

**Commit message**
```
refactor(24-1): remove remaining dead DOM refs

Residual dead DOM refs from runtime-dom-refs.js after the themed
sub-commits (hitarea, room-geometry, pre-W3b animation editor).
Each removal verified by per-id grep documented in INVENTORY.md.
```

**Rollback**: `git revert <C5.4-sha>` — clean.

---

### C6 — Remove orphan asset(s)

**Files touched**
- `resources/animations/output.mp4` *(deleted)*

**What changes** (See RESEARCH.md §H)

- [ ] Delete `resources/animations/output.mp4` (0 bytes, zero refs).

**Defer to user (do NOT auto-remove):**
- `resources/animations/malfunction2.mp4` (58 MB) — only ref is in the pre-migration backup. **Add a checklist item: "ASK user whether `malfunction2.mp4` is intentional or orphaned."** If user says orphaned → land **C7** (separate commit) deleting it. If user says intentional → document in INVENTORY.md "Kept (user-confirmed)" section.
- `config/global-defaults.json.pre-migration-bak` — also dead per RESEARCH.md §H; ask user before removing.

**Pre-removal verification**
```bash
grep -rn "output\.mp4" src/ config/ server.mjs index.html scripts/ docs/
```
Expect: only `README.md` and `scripts/loop_video.sh` (where it's an example *output* filename, not an animation asset).

**Post-removal verification**
```bash
ls resources/animations/output.mp4    # → expect "No such file"
grep -rn "output\.mp4" src/ config/ server.mjs index.html
# Expect: still zero matches in app code (README/script mentions are unrelated and unchanged).
```

**Smoke tests** (adjacent — Animations + dispatch; Boards)
- [ ] Load each board; trigger each animation type (Solid color, Fire, Scanning, Alarm, Light flicker, Slime GIF, Malfunction GIF, MP4 animation, outside Sandstorm, outside Space travel). All play correctly.

**Commit message**
```
refactor(24-1): remove orphan output.mp4 asset

resources/animations/output.mp4 is a 0-byte file with zero references
in src/, config/, server.mjs, or index.html. (README.md and
scripts/loop_video.sh mention "output.mp4" as an example output
filename, not as an animation asset.)

malfunction2.mp4 (58 MB) deferred — pending user decision.
```

**Rollback**: `git revert <C6-sha>` — restores the 0-byte file (or `git checkout HEAD~1 -- resources/animations/output.mp4`). Clean.

---

### C7 (conditional) — Remove `malfunction2.mp4` and/or pre-migration backup

**Only if user confirms** the 58 MB asset is orphaned. Same template as C6.

If confirmed:
- [ ] Delete `resources/animations/malfunction2.mp4` (or `git rm`).
- [ ] Optionally delete `config/global-defaults.json.pre-migration-bak` if user agrees.

**Pre-/post-removal verification:** standard grep across `src/`, `config/`, `server.mjs`, `index.html`, `scripts/`, `docs/`.

**Smoke tests:** same as C6 — verify all animations play.

**Commit message**
```
refactor(24-1): remove orphan malfunction2.mp4 (user-confirmed)

User confirmed [date] that resources/animations/malfunction2.mp4
(58 MB) is not intended content. Sole reference was in
config/global-defaults.json.pre-migration-bak; current code and
config never reference it.
```

---

## 5. Special Handling Notes

### 5.1 — Cluster-pad debug logs hide a latent ReferenceError (RESEARCH.md Risk 5)

The `console.info("[cluster-pad] dispatch toggle result", { ..., clusterEntriesBefore: beforeClusterCount, ... })` block at `runtime-animation-lifecycle.js:1377-1385` references **`beforeClusterCount`, which is never defined** in `dispatchClusterToggle`'s scope. Argument evaluation throws `ReferenceError` before `console.info` is called.

**Plan position:** this is a **removal that incidentally eliminates a latent error path**. It is NOT a fix (Wave 1 is no behaviour change). We are not adding a `try/catch`, not defining `beforeClusterCount`, not changing the surrounding logic — only **deleting the broken log block**.

**Required test** (added to C1 smoke suite): toggle cluster-pad animations explicitly:
- Create a cluster, arm Fire, tap pad → fires. No console errors.
- Arm Scanning (pad already firing), tap pad → scanning stacks. No errors.
- Arm Fire again, tap pad → fire stops; scanning continues. No errors.

If the ReferenceError was previously surfacing (silently or otherwise), the post-removal absence of the error will be the only observable change — and that change is **strictly an absence**, not a new behaviour.

### 5.2 — `malfunction2.mp4` requires user input

**Do not remove unilaterally.** The 58 MB asset has zero refs in current code/config but is referenced once in the pre-migration backup. The plan documents the candidate; C6 leaves it alone; the executor must explicitly ask the user before C7.

### 5.3 — C5 is the riskiest sub-pass

112 dead-DOM-ref candidates. Split into 4 themed sub-commits (C5.1–C5.4) — each is independently revertable. Run the **full** regression checklist after C5.4 lands, not the abbreviated adjacent-only checks used for individual sub-commits.

### 5.4 — Logger.js carve-out

`src/app/lib/shared/logger.js:42` calls `console.info(message)` as the structured-logger routing chokepoint. The acceptance criterion for Wave 1 is amended (with user sign-off in pre-flight) to: **"Zero `console.info(` outside `src/app/lib/shared/logger.js`."** This is the only sanctioned `console.info` site in `src/`.

### 5.5 — `window.TT_BEAMER_LIVE_SYNC_DEBUG` is out of scope

Pattern doesn't match `__TT_*_DEBUG__` so Wave 1 acceptance is silent on it. Pre-flight asks the user; default is keep.

---

## 6. INVENTORY.md Plan

`INVENTORY.md` lives at `.planning/phases/phase-24/wave-1/INVENTORY.md` and is **updated incrementally** as each commit lands — not written all at once at the end.

### Required sections

1. **Baseline** (filled during pre-flight)
   - Initial grep counts: `console.info`, `__TT_*_DEBUG__`, `console.log`, `console.debug` across `src/`.
   - Decision log: logger.js carve-out (yes/no), `TT_BEAMER_LIVE_SYNC_DEBUG` disposition, `malfunction2.mp4` disposition.

2. **Removed (per commit)** — one row per removal:
   ```
   | Commit | Identifier | File:Line (pre) | Pre-grep evidence | Post-grep evidence |
   |--------|------------|-----------------|-------------------|--------------------|
   | C1     | __TT_CLUSTER_DEBUG__ | runtime-animation-lifecycle.js:1201 | 1 ref | 0 refs |
   | C1     | console.info("[cluster-pad] click", ...) | runtime-animation-lifecycle.js:1251 | 1 ref | 0 refs |
   | …      | …          | …               | …                 | …                  |
   ```

3. **Kept (false positive — found a consumer during pre-removal verification)**
   - For any candidate that turned out to have a live consumer (e.g. a live-sync handler), record the id, the consumer file:line, and a one-line reason it was kept. Examples expected for some C5 candidates.

4. **Kept (user-confirmed)** — `malfunction2.mp4` (if user said keep), pre-migration backup, etc.

5. **End-of-wave verification** — all aggregate greps from §2 Acceptance Criteria, with their final counts.

### Format rules

- One identifier per row; multi-line removals (e.g. a 6-line `if` block) collapse to one row referencing the start line.
- Every "Removed" row must be replayable: the post-grep command in the row, run on the current tree, must return zero.

---

## 7. End-of-Wave Test Plan

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

**End-of-wave aggregate greps** (record results in `INVENTORY.md` "End-of-wave verification" section):
```bash
grep -rn "__TT_.*_DEBUG__" src/                                              # → 0
grep -rn "console\.info(" src/ | grep -v "src/app/lib/shared/logger.js"      # → 0
grep -rn "console\.log(" src/                                                # → 0
grep -rn "TT_BEAMER_RUNTIME_WIRE_CALIBRATION_BINDERS\|wireCalibrationBinders" src/ index.html  # → 0
grep -rn "\breadJson\b\|\bwriteJson\b\|\bCORNER_KEYS\b\|\bbeginGridWarpFrame\b\|\bendGridWarpFrame\b\|\bisPolygonDragActive\b\|\bbuildPlaybackCard\b" src/  # → 0
grep -rn "quickModeActivate\|quickModeDeactivate\|quick-mode-activate\|quick-mode-deactivate" src/ index.html  # → 0
grep -rn "beforeClusterCount" src/                                           # → 0 (latent bug eliminated)
```

**If any regression check fails:**
1. Identify which commit introduced the regression (bisect: `git revert C5.4` first — most likely culprit; then C5.3, C5.2, C5.1; then C4, C3, C2, C1).
2. Each commit is independently revertable. Once isolated, fix the offending removal in place (re-add the ref/symbol; mark in INVENTORY.md "Kept (false positive)") and amend the commit OR land a corrective follow-up.

---

## 8. Risks + Mitigations (Wave 1 specific)

### Risk 1 — Removing a DOM ref that is live-sync-only (populated from server snapshots, not directly read in JS)

A `runtime-dom-refs.js` entry might exist solely so a live-sync handler can write into a hidden DOM node when a server snapshot arrives. Pure JS-side grep would show "no consumer" but the live-sync deserializer pushes data into it.

**Mitigation:** Step 3 of the C5 universal pre-removal procedure greps **all** of `src/app/runtime/live-sync/` for the id and the camelCased ref name before removal. Any match in a snapshot deserializer or live-sync apply-handler → keep the ref and document in INVENTORY.md "Kept (false positive)". Live-sync test ("two clients, propagation in ~1 frame") catches anything missed.

### Risk 2 — Removing a re-export that an external consumer (server-side, debug HTML, scripts) depends on

`server.mjs`, `index.html`, `scripts/`, `docs/` are outside `src/` but may import or reference symbols.

**Mitigation:** every removal in C2/C3 includes a repo-wide grep across `server.mjs`, `index.html`, `scripts/`, `docs/`. Any external hit blocks removal.

### Risk 3 — Latent `console.info` calls behind feature flags missed in initial grep

If a `console.info` is gated behind a flag set at runtime, baseline grep finds it; but if a flag-gated branch is somehow obfuscated (template literal, computed property, etc.), it could survive.

**Mitigation:** end-of-wave aggregate `grep -rn "console\.info(" src/ | grep -v logger.js` MUST return zero. If non-zero, treat as a regression and land a corrective commit before declaring Wave 1 complete.

### Risk 4 — DOM ref removal that surfaces when a future change re-adds the `#id` to HTML

A "dead" wire (`?.addEventListener`) silently re-activates if the id reappears. Removing the wire is safer than leaving a latent trap.

**Mitigation:** prefer removal over keep-as-no-op (already the C4/C5 strategy). Future re-additions will need explicit JS wiring, which is correct.

### Risk 5 — C5 dynamic-id false negative

A dom-refs entry might appear unreferenced because the `#id` is built dynamically by `createElement` + later attached, and the JS reference is by another path (e.g. `document.getElementById` called inline). Step 1 of C5 universal verification grep does not catch every dynamic-construction pattern.

**Mitigation:** the regression checklist run after C5.4 tests every Settings subtab and every animation-editor scope explicitly. Any control that should exist but does not → bisect within C5 sub-commits.

### Risk 6 — Cluster-pad regression masked by removed logs

The removed C1 logs *may* have been the only visible signal of an upstream issue (unlikely — logs were debug-only — but possible).

**Mitigation:** post-C1 cluster-pad smoke test includes the exact 3-step sequence (arm Fire → tap; arm Scanning → tap; arm Fire → tap) that exercises type-aware toggle. If behaviour changes from pre-Wave-1 baseline, halt and investigate before continuing to C2.

### Risk 7 — Manual test infra means subtle regressions can slip past

ROADMAP states: "Build/test infra is manual." No CI; the regression checklist is the only safety net.

**Mitigation:** every commit is independently revertable (this plan enforces that). If a regression is caught even days later, bisect by reverting individual commits.

---

## 9. Out of Scope for Wave 1

Reaffirmed — these are **explicitly out of scope** and must not appear in Wave 1 commits:

- **Comment changes** — no rewriting comments, no removing phase-marker comments (Wave 2). Only exception: header comments that exclusively describe a function being deleted in this wave (e.g. above `buildPlaybackCard`); those are removed *with* the function as one logical unit.
- **File decomposition** — no splitting `runtime-orchestration.js` or any other oversized module (Wave 3).
- **Naming changes** — no `syncFoo` → `applyFoo` renames (Wave 4).
- **Module-boundary work** — no cycle removal, no transitive re-export pruning beyond what's in the dead-export list (Wave 5).
- **Type annotations / JSDoc types** — out of scope for Phase 24 entirely.
- **Test framework introduction** — out of scope for Phase 24 entirely.
- **Performance work** — only what falls out naturally from removing dead branches; no new optimisation.

If during execution a candidate change is unclear which wave it belongs to: **defer to the later wave**. Wave 1's contract is "subtractive, mechanical, grep-verified."

---

## 10. INVENTORY.md Template (executor creates this file)

```markdown
# Phase 24 Wave 1 — Removal Inventory

Updated incrementally as each commit lands. Last update: <date>.

## Baseline (pre-flight)

| Grep | Initial count |
|------|---------------|
| `console.info(` in src/ | 10 |
| `__TT_*_DEBUG__` in src/ | 1 |
| `console.log(` in src/ | 0 |
| `console.debug(` in src/ | 1 |

Decisions:
- Logger.js carve-out: ACCEPTED (acceptance amended to "zero console.info outside src/app/lib/shared/logger.js").
- `window.TT_BEAMER_LIVE_SYNC_DEBUG`: KEEP (out of scope; user decision <date>).
- `malfunction2.mp4`: PENDING USER (asked <date>; awaiting answer).

## Removed

| Commit | Identifier | File:Line (pre) | Pre-grep | Post-grep |
|--------|------------|-----------------|----------|-----------|
| C1 | __TT_CLUSTER_DEBUG__ | runtime-animation-lifecycle.js:1201 | 1 | 0 |
| ... | ... | ... | ... | ... |

## Kept (false positive)

| Commit | Identifier | Reason | Consumer |
|--------|------------|--------|----------|
| ... | ... | ... | ... |

## Kept (user-confirmed)

| Identifier | Reason | Asked date |
|------------|--------|-----------|
| ... | ... | ... |

## End-of-wave verification

| Grep | Final count |
|------|-------------|
| `__TT_*_DEBUG__` in src/ | 0 |
| `console.info(` in src/ outside logger.js | 0 |
| `console.log(` in src/ | 0 |
| `wireCalibrationBinders` in repo | 0 |
| `readJson|writeJson|CORNER_KEYS|...` in src/ | 0 |
| `quickModeActivate|...` in src/ + index.html | 0 |
| `beforeClusterCount` in src/ | 0 |
```

---

## 11. Execution Order Summary

1. **Pre-flight** — clean tree, baseline greps, user decisions, INVENTORY.md skeleton.
2. **C1** — cluster-pad debug logs + `__TT_CLUSTER_DEBUG__`. Smoke: cluster-pad type-aware toggle, CLEAR. Update INVENTORY.md.
3. **C2** — calibration-binders module. Smoke: board switch, polygon edit. Update INVENTORY.md.
4. **C3** — dead exports + `buildPlaybackCard`. Smoke: drag, align mode, animation editor, export round-trip. Update INVENTORY.md.
5. **C4** — `quickMode{Activate,Deactivate}Button`. Smoke: Tap-Action Off/Toggle/Clear. Update INVENTORY.md.
6. **C5.1** — hitarea calibration. Smoke: polygon + align mode. Update INVENTORY.md.
7. **C5.2** — room-geometry. Smoke: room move/resize, in-polygon animations. Update INVENTORY.md.
8. **C5.3** — pre-W3b animation editor. Smoke: every Settings subtab + animation editor + every animation type. Update INVENTORY.md.
9. **C5.4** — residual dead refs. **Smoke: full ROADMAP regression checklist.** Update INVENTORY.md.
10. **C6** — `output.mp4`. Smoke: every animation type renders. Update INVENTORY.md.
11. **(C7 conditional)** — `malfunction2.mp4` if user-confirmed orphaned. Same smoke as C6.
12. **End-of-wave** — full ROADMAP regression checklist (10–15 min). Aggregate greps to INVENTORY.md "End-of-wave verification". Wave declared complete only when all acceptance criteria in §2 are met.
