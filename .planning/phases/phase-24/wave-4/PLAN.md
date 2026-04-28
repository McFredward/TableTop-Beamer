# Phase 24 Wave 4 — Executable Plan: Naming + API Consistency

**Wave:** 24-4
**Type:** Code-quality refactor (no behaviour change — IDENTIFIER rename only, no logic edit, no module move)
**Inputs:** [ROADMAP.md](../ROADMAP.md), [RESEARCH.md](./RESEARCH.md), [Wave-1 PLAN](../wave-1/PLAN.md), [Wave-2 PLAN](../wave-2/PLAN.md), [Wave-3 PLAN](../wave-3/PLAN.md), [Wave-3 INVENTORY](../wave-3/INVENTORY.md)
**Slicing:** 3 sub-waves (W4.1 ctx-grouping, W4.2 atomic renames, W4.3 closure) with **12 atomic commits** total: 1 ctx-builder reorganization + 10 atomic renames (one per commit, low→high call sites) + 1 wave-closure INVENTORY commit. Every commit independently revertable.
**Estimated wave length:** ~5–7 hours of executor work + 10–15 min full ROADMAP regression at end of wave. Smallest code-touching wave of Phase 24.

---

## 1. Goal

Wave 4 brings IDENTIFIER consistency to the post-W3.6 runtime tree without changing one line of behaviour. Two things land:

1. **The 95-key BOOTSTRAP dep-bag in `runtime-orchestration-ctx-builder.js` is reorganised by area** with `// ─── Area … ───` comment headers (per RESEARCH §4.1, 17 natural areas). The keys themselves and their value expressions are PRESERVED verbatim; only their order in the destructure block + return literal changes, with comment dividers added.
2. **10 inconsistent function names are renamed** to align with the §2 prefix convention (`render*` mounts; `apply*` side-effects state; `sync*` reconciles UI; `compute*` is pure; `merge*` returns merged data; `set*` writes a single value). Each rename lands as ONE atomic commit with EVERY call site updated in lockstep.

Wave 4 changes IDENTIFIERS, not logic. Logic is unchanged. Module structure is unchanged. The `<script>` order in `index.html` is unchanged (no new files this wave). Public API contracts are LOCKED — see §6.

**Hard rules — non-negotiable:**

- **Identifier-only diff.** Every rename commit's `git diff -w` shows token-level swap only. The function body, the surrounding logic, the call-site context — all unchanged except for the renamed token. No "while we're here" tidying.
- **Lockstep call-site updates.** When a function is renamed, EVERY reference (definition, namespace export entry, ctx-bag entry, every call site, every comment that names it) is updated in the SAME commit. Pre-rename grep at the OLD name returns N occurrences; post-rename grep at the OLD name returns 0; post-rename grep at the NEW name returns N. The total count is preserved exactly.
- **Public API contracts are LOCKED — see §6.** The 101 `window.TT_BEAMER_*` IIFE namespace keys, the 9 wire-protocol message-type literals, and the 13 localStorage / JSON-schema string literals do NOT change. None of the 10 in-scope renames touches a namespace-export key.
- **`<script>` order in `index.html` does NOT change.** No new sub-module files this wave; index.html is not edited.
- **Per-commit primary gate (§7.1):** pre-rename grep proof, sed/Edit pass, post-rename grep proof at OLD = 0 + at NEW = original-OLD count, `node --check` clean on every modified `.js`, namespace-key parity verified, INVENTORY row appended.
- **One commit per rename.** Bisect-friendly granularity. If a rename is wrong, bisect points to it directly.

**Stays unchanged:** every user-facing behaviour, every README-documented feature, every live-sync protocol field, every export-bundle JSON shape, every `localStorage` key, every dependency, every IIFE namespace key, every comment that survived Wave 2, every module's structural decomposition from Wave 3.

---

## 2. Acceptance Criteria

This wave is done when **all** of the following are true:

- [ ] **All 10 in-scope renames landed.** R1, R2, R3, R4, R6, R7, R8, R9, R10, R11 (per RESEARCH §3 / this PLAN §5). R5 (`refreshGlobalButtons` → `syncGlobalButtonsActiveState`, 47 sites) is OUT OF SCOPE per orchestrator pre-flight decision (`refresh*` prefix retained).
- [ ] **Zero residual references at every old name.** Aggregate post-W4 verification:
  ```bash
  for old in updateMobilePerformanceStatus applyHitareaCalibration \
            applyPolygonPrecedence applyRoomCatalog updateClusterPadsRect \
            applyAudioGain applyMediaPreviewProps applyMenuMode \
            applyDisposalToGifCanvas buildTiles; do
    count=$(grep -rn "\b${old}\b" src/ | wc -l)
    echo "${old}: ${count}"
  done
  # Every line MUST end with ": 0".
  ```
- [ ] **Every new name resolves at exactly the old name's call-site count.** Per-rename verifier in §5 records both counts; aggregate sum across the 10 renames matches the §5 totals (R1=16, R2=3, R3=3, R4=5, R6=5, R7=13, R8=6, R9=3, R10=2, R11=2 → **58 total occurrences swapped**).
- [ ] **`runtime-orchestration-ctx-builder.js` is area-grouped** with 17 `// ─── Area … ───` comment headers (one per area enumerated in RESEARCH §4.1). The 95 keys are present in the same count, with the same names, with the same value expressions; only their order within the destructure block and the return literal changes. `Object.keys(buildBootstrapCtx({…}))` post-W4.1 returns the same 95 keys as pre-W4.1 (just reordered).
- [ ] **Public API contracts unchanged (LOCKED — §6).**
  - 101 IIFE namespace keys: `Object.keys(window).filter(k => k.startsWith("TT_BEAMER_"))` returns the same 101-element set pre/post Wave 4. The keys exposed within each namespace (e.g. the 15 keys on `TT_BEAMER_RUNTIME_PROJECTION_MAPPING`) are also identical.
  - 9 wire-protocol message-type literals: `grep -rohE 'emitLiveMutation\("[a-z-]+"' src/app/runtime/ | sort -u` returns the same set pre/post.
  - 13 localStorage / JSON-schema literals: `grep -rohE "['\"]tt-beamer[a-zA-Z0-9._-]+['\"]" src/ | sort -u` returns the same set pre/post.
- [ ] **`node --check` clean on every modified `.js` file at every commit.** No `node --check` regression at any HEAD between `phase-24-w4-start` and end-of-wave.
- [ ] **`<script>` order verified unchanged.** `git diff phase-24-w4-start..HEAD -- index.html` returns empty (no edits).
- [ ] **Identifier-only diff verified per commit.** For each rename commit: `git diff -w HEAD~..HEAD` shows token-level swap only — no surrounding logic changes, no formatting changes, no comment changes beyond comments that mention the renamed identifier (which can be updated in the same commit).
- [ ] **`wc -l` shows minimal line count change.** Aggregate `find src/ -name "*.js" -exec wc -l {} +` total line count between `phase-24-w4-start` and end-of-wave delta is < ±25 lines (~17 lines from W4.1 ctx-builder area-divider injection + headroom for 1-2-line shifts from R8 namespace-pinning + R7/R1 ctx-cascade reflows; renames themselves are token-only swaps that don't shift sizes).
- [ ] **Full ROADMAP regression checklist passes** at end of wave (ROADMAP §"Test plan", lines 203–275). Manual smoke pass, ~10–15 min on a fresh `node server.mjs` start.
- [ ] **`INVENTORY.md` exists** at `.planning/phases/phase-24/wave-4/INVENTORY.md`, updated incrementally per commit, with: per-commit table, public-API lock-list verification section, final aggregate row, decision-log section. See §11.
- [ ] **Pre-execution rollback tag set.** `git tag phase-24-w4-start` on HEAD before W4.1-C1. INVENTORY.md records the tagged hash.

---

## 3. Pre-Flight Checklist (before W4.1-C1)

Mechanical setup the executor performs **once** before opening the first commit:

- [ ] **Confirm `git status` working-tree state.** Expected pre-flight state:
  - `config/global-defaults.json` — pre-existing user edit, unrelated. Continues to surface in `git status`; do NOT bundle into Wave 4 commits.
  - `.planning/phases/phase-24/wave-3/PLAN.md`, `RESEARCH.md`, `INVENTORY.md` — already committed (W3 closure landed at `c9038bc`).
  - `.planning/phases/phase-24/wave-4/RESEARCH.md` and `PLAN.md` — untracked planning dir; add to staging only when committing planning artifacts; do NOT bundle into rename commits.
  - **No other unrelated edits in `src/`.** If found, stash as `phase-24-w4-prestart` before W4.1-C1 lands.
- [ ] **Set rollback tag:**
  ```bash
  git tag phase-24-w4-start    # lands on current HEAD (post-W3 closure)
  ```
  Record the tagged hash in INVENTORY.md "Tags" section.
- [ ] **Snapshot baseline metrics.** Re-run RESEARCH §1 grep commands fresh; record in INVENTORY.md "Baseline" section. Verify counts within ±5 % of RESEARCH:
  ```bash
  # Public namespace count (expected: 101)
  grep -rohE "window\.TT_BEAMER_[A-Z_]+" src/ | sort -u | wc -l

  # Wire-protocol literals (expected: 9 — see §6.2 for full list)
  grep -rohE 'emitLiveMutation\("[a-z-]+"' src/app/runtime/ | sort -u

  # localStorage / JSON-schema literals (expected: 13 — see §6.3 for full list)
  grep -rohE "['\"]tt-beamer[a-zA-Z0-9._-]+['\"]" src/ | sort -u

  # Per-rename baseline counts (R1..R11 except R5 — see §5 for the regex per row)
  for r in updateMobilePerformanceStatus applyHitareaCalibration \
           applyPolygonPrecedence applyRoomCatalog updateClusterPadsRect \
           applyAudioGain applyMediaPreviewProps applyMenuMode \
           applyDisposalToGifCanvas buildTiles; do
    n=$(grep -rn "\b${r}\b" src/ | wc -l)
    echo "${r}: ${n}"
  done
  # Expected (per RESEARCH §3.4 + §5 below):
  #   updateMobilePerformanceStatus: 16   applyAudioGain: 13
  #   applyHitareaCalibration: 3          applyMediaPreviewProps: 6
  #   applyPolygonPrecedence: 3           applyMenuMode: 3
  #   applyRoomCatalog: 5                 applyDisposalToGifCanvas: 2
  #   updateClusterPadsRect: 5            buildTiles: 2
  ```
- [ ] **Snapshot the 101 public namespace keys.** In a fresh `node server.mjs` boot, in DevTools console:
  ```javascript
  const ttKeys = Object.keys(window).filter(k => k.startsWith("TT_BEAMER_")).sort();
  console.log(JSON.stringify(ttKeys, null, 2));
  // For each namespace, also dump its inner Object.keys:
  for (const k of ttKeys) {
    const ns = window[k];
    if (ns && typeof ns === "object") {
      console.log(k + ": " + JSON.stringify(Object.keys(ns).sort()));
    }
  }
  ```
  Paste the output into INVENTORY.md "Pre-W4 namespace snapshot" section. Each rename commit's verification will run the same dump (it MUST be byte-identical).
- [ ] **User-decision items batch (already settled by orchestrator pre-flight — log as "confirmed" in INVENTORY.md "Decisions"):**
  - **`refresh*` prefix RETAINED.** R5 (`refreshGlobalButtons` → `syncGlobalButtonsActiveState`, 47 sites) is **OUT OF SCOPE**. The 4 `refresh*` functions stay as-is (`refreshGlobalButtons`, `refreshApplyDiscardButtonsUi`, `refreshPersistentRoomSelectionVisualState`, `refreshStageGeometryCache`). RESEARCH §6.5 + Assumption A3 are answered: **keep the prefix as an established alias for "reconcile-style class-toggle"**. Acceptance: §2 prefix table in RESEARCH unchanged in spirit; W4 rename list excludes R5.
  - **Option-bag conversions OUT OF SCOPE.** RESEARCH §5 W4.4 (3 candidates O1/O2/O3) is **DEFERRED** entirely. The 14-arg `drawAffineTriangle` is documented as a hot-loop exception that legitimately uses positionals. No option-bag work this wave.
  - **ctx-builder reorganization = Option (b) comment-grouped (single-file).** RESEARCH §4.2 Option (a) (per-area builder helpers) is **DEFERRED** to W5 if module-boundary cleanup needs the per-area exports. ROADMAP acceptance "ctx keys grouped by area in the source" is satisfied by Option (b)'s in-source comment-banner grouping.
- [ ] **Manually run an abbreviated boot smoke** on a fresh `node server.mjs`. Open `/`, switch a board, trigger one cluster-pad animation, open `/output`. Note any pre-existing console oddities so they aren't blamed on Wave 4. Record in INVENTORY.md "Pre-flight smoke" section.
- [ ] **Pre-flight resolution of conditional renames (R2, R3, R7, R9).** Each of these 4 renames currently has a "if exposed via namespace, use pinning; else SAFE-SED" branch in §5. Resolve all 4 at pre-flight time so each W4.2 commit references a recorded verdict instead of re-deciding live.

  For each of R2 (`applyHitareaCalibration`), R3 (`applyPolygonPrecedence`), R7 (`applyAudioGain`), R9 (`applyMenuMode`), run:

  ```bash
  for old in applyHitareaCalibration applyPolygonPrecedence applyAudioGain applyMenuMode; do
    n=$(grep -rn "window\.TT_BEAMER_[A-Z_]*\.${old}" src/ | wc -l)
    echo "${old}: ${n}"
  done
  ```

  - **If hit count > 0:** verdict = **PIN** (use namespace-key-pinning pattern — same shape as R8/W4.2-C8).
  - **If hit count = 0:** verdict = **SAFE-SED** (rename freely; no namespace pinning needed).

  Record the verdict per row in INVENTORY's "Decisions" section. Each W4.2 commit references the pre-flight verdict instead of re-deciding live. This eliminates 4 in-flight branching paths and makes the rename commits fully mechanical.

- [ ] **Pre-rename baseline smoke (R7 + R1 risk surfaces).** Capture working behavior of the user-visible surfaces affected by the two riskiest renames, so post-rename verification has a concrete baseline:

  - **Audio volume slider** (per-animation Live Editor + System master volume) — this is R7's user-visible surface. Confirm: master volume slider audibly attenuates a playing animation; per-animation volume slider in the Live Editor audibly attenuates that one animation; mute via `audioEnabled` toggle silences output.
  - **Mobile performance status display** (whatever surfaces `updateMobilePerformanceStatus` updates — the on-screen DOM status node) — this is R1's user-visible surface. Confirm: status text updates after a few seconds of activity; matches the expected format.

  Note expected behavior in INVENTORY.md "Pre-flight smoke" section. Re-verify after **W4.2-C9 (R7)** and **W4.2-C10 (R1)** land — these are the riskiest commits and the most likely to silently break their respective user-visible surfaces (a missed ctx-bag reader resolves `undefined` at call time → silent no-op, no console error).

- [ ] **Initialize `INVENTORY.md`** with the template skeleton (see §11 below).

---

## 4. Sub-Wave Breakdown

Three sub-waves, ordered low→high risk per RESEARCH §7. Each sub-wave is itself a sequence of atomic commits; each commit is independently revertable.

### W4.1 — ctx-builder area-grouping (LOW risk, foundational)

**Goal:** Reorganise the 95 keys in `runtime-orchestration-ctx-builder.js` into the 17 natural areas with comment headers, per RESEARCH §4.1 + Option (b).

**Per-commit count:** 1.

**Estimated time:** 30–60 min (mechanical reorder).

**Commits:**

- [ ] **W4.1-C1 — Area-group the 95-key BOOTSTRAP dep-bag.**
  - **Files touched:** `src/app/runtime/runtime-orchestration-ctx-builder.js` (only).
  - **What changes:**
    1. Open `runtime-orchestration-ctx-builder.js` (211 lines post-W3.5).
    2. **Destructure block** (currently lines 12–108, the `const { … } = refs` block): reorder the 95 keys to follow the area sequence in §4.1.1 below. Insert a `// ─── Area X — Name ───────────────────────────` comment header BEFORE each area's key group.
    3. **Return literal** (currently lines 109–205, the returned object literal): reorder the 95 entries to MATCH the destructure block's order. Insert the same area-divider comment headers at the matching points.
    4. **PRESERVE every key's name.** No renames in this commit (R1 and R7 will rename `updateMobilePerformanceStatus` and `applyAudioGain` later in W4.2; W4.1 keeps both at their old names).
    5. **PRESERVE every key's value expression** verbatim. The 75 arrow-wrapped entries (`updateMobilePerformanceStatus: () => updateMobilePerformanceStatus()`) keep both sides byte-identical; the 19 direct-ref entries (`syncRoomFxPanel`) keep their shorthand; the 1 BOARDS-let bridge (`getBoards: () => getBoards()`) is unchanged.
  - **`index.html` updates:** none.
  - **Pre-rename verification:**
    ```bash
    # Snapshot the pre-edit key list (sorted by current insertion order):
    awk '/^  const \{/,/^  \} = refs;/' \
      src/app/runtime/runtime-orchestration-ctx-builder.js \
      | grep -oE '^[ ]{4}[a-zA-Z_$][a-zA-Z0-9_$]*' \
      | awk '{print $1}' | sort > /tmp/ctx-keys-pre.txt
    wc -l /tmp/ctx-keys-pre.txt   # → 95
    ```
  - **Post-rename verification:**
    ```bash
    # Same dump post-edit; sorted set MUST match.
    awk '/^  const \{/,/^  \} = refs;/' \
      src/app/runtime/runtime-orchestration-ctx-builder.js \
      | grep -oE '^[ ]{4}[a-zA-Z_$][a-zA-Z0-9_$]*' \
      | awk '{print $1}' | sort > /tmp/ctx-keys-post.txt
    diff /tmp/ctx-keys-pre.txt /tmp/ctx-keys-post.txt
    # → empty (same 95 keys, just rearranged before sort)

    node --check src/app/runtime/runtime-orchestration-ctx-builder.js
    # → exits 0

    # Verify return literal entries match destructure block (count + names):
    awk '/^  return \{/,/^  \};/' \
      src/app/runtime/runtime-orchestration-ctx-builder.js \
      | grep -oE '^[ ]{4}[a-zA-Z_$][a-zA-Z0-9_$]*' | sort -u | wc -l
    # → 95

    # Verify 17 area-divider comments inserted (aggregate):
    grep -c "// ─── Area" src/app/runtime/runtime-orchestration-ctx-builder.js
    # → 34   (17 in destructure block + 17 in return literal — one per area at each location)

    # Tighter check: each block must have exactly 17 dividers. If they split
    # unevenly (e.g. 17 + 16 = 33), an area header was missed in the second
    # block. The aggregate `34` count alone would not catch that.
    N_DESTRUCTURE=$(awk '/^  const \{$/,/^  \} = refs;$/' src/app/runtime/runtime-orchestration-ctx-builder.js | grep -c "// ─── Area")
    N_RETURN=$(awk '/^  return \{$/,/^  \};$/' src/app/runtime/runtime-orchestration-ctx-builder.js | grep -c "// ─── Area")
    echo "N_DESTRUCTURE=${N_DESTRUCTURE}  N_RETURN=${N_RETURN}"
    # Both must equal 17. If unequal, an area was missed in one of the blocks.
    [ "${N_DESTRUCTURE}" = "17" ] && [ "${N_RETURN}" = "17" ] || { echo "FAIL: per-block divider count mismatch"; exit 1; }
    ```
  - **Adjacent smoke (browser):** boot the dashboard + `/output`. The 95-key reorder is a no-op semantically; nothing visible should change. Trigger one animation in each scope to confirm.
  - **Commit message:** `refactor(24-4): area-group runtime-orchestration-ctx-builder.js (17 areas, comment-banner grouping)`
  - **Rollback:** `git revert <hash>` restores the pre-W4 alphabetical-by-insertion order.

#### 4.1.1 The 17 areas (sequence for the destructure block + return literal)

In the order they appear top-to-bottom in the post-W4.1 file. Each area's comment header reads `// ─── Area X — <Name> ───────────────────────────────────────────`.

| Area | Name | Key count | Keys (ordered by RESEARCH §4.1 enumeration) |
|------|------|----------:|---------------------------------------------|
| A | Runtime state + globals | 4 | `state`, `liveSync`, `logBootstrap`, `triggerFeedback` |
| B | DOM refs (panel inputs / status nodes) | 13 | `globalDefaultsStatus`, `apiDiagnoseStatus`, `animationSpeedInput`, `roomAnimationSelect`, `roomOpacityInput`, `roomOpacityValue`, `roomIntensityValue`, `roomSpeedValue`, `roomSoundVolumeValue`, `roomDurationInput`, `audioEnabledInput`, `audioVolumeInput`, `audioVolumeValue` |
| C | Boards | 2 | `getBoards`, `switchBoard` |
| D | Clamps | 4 | `clampRoomOpacity`, `clampRoomSpeed`, `clampRoomSoundVolume`, `clampAnimationSpeed` |
| E | Panel sync | 16 | `syncRoomDraftActionButton`, `syncAudioMappingPanel`, `syncAnimationSpeedPanel`, `syncHitareaCalibrationPanel`, `syncRoomGeometryPanel`, `syncPolygonEditorPanel`, `syncShipPolygonEditorPanel`, `syncRoomFxPanel`, `syncOutsideFxPanel`, `syncAlignModePanel`, `syncBoardZoomPanel`, `syncDashboardZoneVisibility`, `syncMp4PerformanceControlsPanel`, `syncMobileStickyOffsets`, `syncQuickModePanel`, `syncBoardSelectOptions` |
| F | Status sync | 2 | `syncAudioStatus`, `updateMobilePerformanceStatus` ⚠ (R1 — kept at OLD name in W4.1; renamed in W4.2-C8) |
| G | Audio side-effects | 3 | `applyAudioGain` ⚠ (R7 — kept at OLD name in W4.1; renamed in W4.2-C9), `enforceAudioLifecycleGuard`, `playSoundForAnimation` |
| H | View + viewport | 5 | `applyOutputRoleViewContract`, `loadProjectionCornersFromConfig`, `applyProjectionTransform`, `setActiveView`, `setPanCursorState` |
| I | Default-data factories | 12 | `createDefaultHitareaCalibrationMap`, `createDefaultRoomTombstonesByBoard`, `createDefaultRoomGeometryByBoard`, `createDefaultRoomStateProfilesByBoard`, `createDefaultSpecialPolygonsByBoard`, `createDefaultPlayAreasByBoard`, `createDefaultSelectedPlayAreaIdByBoard`, `createDefaultInsideFxByBoard`, `createDefaultRoomFxByBoard`, `createDefaultOutsideFxByBoard`, `createDefaultBoardZoomByBoard`, `createDefaultAnimationSoundMap` |
| J | Domain getters / normalizers | 3 | `getShipPolygonPoints`, `normalizeQuickMode`, `normalizeAnimationSoundMap` |
| K | Boot-flow | 6 | `fetchGlobalDefaultsPayload`, `loadBoardProfiles`, `captureCleanBaseline`, `restoreSettingsSubtabPreference`, `loadExternalBoardZones`, `loadOutsideResourceAssets` |
| L | Error / overlay UI | 3 | `buildResolveSnapshot`, `formatResolveSnapshot`, `renderServerUnreachableOverlay` |
| M | Live-sync | 4 | `connectLiveSyncSocket`, `scheduleNextLiveSnapshotPoll`, `emitLiveMutation`, `buildAnimationSnapshotForLiveSync` |
| N | Asset warm-up | 3 | `warmEventSoundAssets`, `warmRoomGifAssets`, `prewarmBoardOutsideMp4Asset` |
| O | Regression tests | 10 | `runViewVisibilityRegression`, `runLayoutScrollRegression`, `runStartupDefaultsGuardRegression`, `runZoomPanEditRegression`, `runPanPointerCaptureRegression`, `runOrientationStateRegression`, `runNavigationStateRegression`, `runMobileProjectionVisibilityGuard`, `runOutsideIsolationRegression`, `runShipClipRegression` |
| P | Animation lifecycle hooks | 4 | `renderRunningAnimationsList`, `refreshGlobalButtons` ⚠ (R5 — RETAINED at current name; out of scope), `draw`, `createAnimation` |
| Q | Diagnostics | 1 | `getLiveTraceSnapshot` |

**Total: 4 + 13 + 2 + 4 + 16 + 2 + 3 + 5 + 12 + 3 + 6 + 3 + 4 + 3 + 10 + 4 + 1 = 95 keys** ✓ (matches RESEARCH §4.1).

**⚠ Reminder:** W4.1 KEEPS the names `updateMobilePerformanceStatus`, `applyAudioGain`, `refreshGlobalButtons` as-is. R1/R7 are renamed later in W4.2; R5 is OUT of scope per pre-flight.

---

### W4.2 — Atomic renames, ordered fewest → most call sites (MEDIUM risk)

**Goal:** Land 10 atomic rename commits, one per rename candidate, ordered low→high call-site count so the riskiest renames (R7, R1) land last on a battle-tested tree.

**Per-commit count:** 10.

**Estimated time:** 20–60 min per commit, mostly mechanical sed/Edit + grep verification + `node --check`.

**Per-commit task structure (uniform across all 10 W4.2 commits):**

1. **Pre-rename grep** — confirm the OLD name's occurrence count matches the §5 expected count (within ±1 to allow for minor file drift since RESEARCH was written).
2. **Public-API safety check** — confirm the OLD name is NOT in the 101 IIFE namespace key list (pre-flight snapshot). All 10 in-scope renames have been pre-checked against §6.1 — none touches a namespace key. If a future drift introduces one, BLOCK the rename.
3. **Sed/Edit pass** — apply the rename. Prefer `sed -i 's/\b<OLD>\b/<NEW>/g'` for word-boundary safety; for files where the regex risks false-positives (e.g. the same prefix appears in unrelated identifiers), fall back to file-by-file Edit. The §5 row-per-rename specifies which approach to use.
4. **Post-rename grep at OLD name** — MUST return 0:
   ```bash
   grep -rn "\b<OLD>\b" src/ | wc -l   # → 0
   ```
5. **Post-rename grep at NEW name** — MUST equal the original OLD-name count:
   ```bash
   grep -rn "\b<NEW>\b" src/ | wc -l   # → N (matches step 1's count)
   ```
6. **`node --check`** on every modified `.js` file — exits 0 for each.
7. **Public namespace snapshot** — DevTools dump of `Object.keys(window).filter(k => k.startsWith("TT_BEAMER_"))` returns the same 101 keys; each namespace's inner key set is unchanged.
8. **`<script>` order check** — `git diff HEAD~..HEAD -- index.html` returns empty.
9. **`git diff -w` token-only check** — shows ONLY the OLD→NEW token swap; no surrounding logic, no formatting, no comment-block edits beyond comments that mention the renamed name.
10. **INVENTORY row appended** with hash, OLD→NEW, files-touched count, sites-updated count, primary-gate status (all `yes`).
11. **Atomic commit** with the canonical message `refactor(24-4): rename <OLD> → <NEW>`.

#### Commit order (low→high call sites)

| Commit | ID | OLD → NEW | Sites | Files | Risk |
|--------|----|-----------|------:|------:|------|
| W4.2-C1 | R10 | `applyDisposalToGifCanvas` → `applyGifDisposalToCanvas` | 2 | 1 | LOW |
| W4.2-C2 | R11 | `buildTiles` → `renderTiles` | 2 | 1 | LOW |
| W4.2-C3 | R2 | `applyHitareaCalibration` → `computeHitareaCalibratedPoint` | 3 | 2 | LOW |
| W4.2-C4 | R3 | `applyPolygonPrecedence` → `mergePolygonPrecedence` | 3 | 2 | LOW |
| W4.2-C5 | R9 | `applyMenuMode` → `setMenuMode` | 3 | 1 | LOW |
| W4.2-C6 | R4 | `applyRoomCatalog` → `mergeRoomCatalog` | 5 | 3 | LOW |
| W4.2-C7 | R6 | `updateClusterPadsRect` → `syncClusterPadsRect` | 5 | 2 | LOW |
| W4.2-C8 | R8 | `applyMediaPreviewProps` → `syncMediaPreviewProps` | 6 | 1 | LOW |
| W4.2-C9 | R7 | `applyAudioGain` → `syncAudioGain` | 13 | 6 | MEDIUM (ctx-key change) |
| W4.2-C10 | R1 | `updateMobilePerformanceStatus` → `syncMobilePerformanceStatus` | 16 | 7 | MEDIUM (ctx-key change) |

**Riskiest in-scope rename:** **W4.2-C10 (R1)** — 16 sites across 7 files, including the ctx-bag entry in `runtime-orchestration-ctx-builder.js`. Lockstep update across all 7 files in one commit. (R5 at 47 sites would have been riskier, but it's deferred per pre-flight.)

**See §5 below** for the per-rename detail rows (file:line of definition, sed regex, pre/post grep commands, commit message).

---

### W4.3 — INVENTORY closure + final verification (LOW risk)

**Goal:** Append final aggregate row to INVENTORY, run public-API lock-list verification, run full ROADMAP regression.

**Per-commit count:** 1.

**Estimated time:** 30–45 min (15 min INVENTORY edit + 10–15 min full ROADMAP regression manual smoke).

**Commits:**

- [ ] **W4.3-C1 — End-of-W4 INVENTORY commit + final verification.**
  - **Files touched:** `.planning/phases/phase-24/wave-4/INVENTORY.md` only.
  - **What changes:**
    1. Append the **aggregate row** to the per-commit table: total renames (10), total sites updated (58), total files touched (sum across the 10 commits, with deduplication — expected ~12–15 unique files).
    2. Run **public-API lock-list verification** (§6 below) and record the byte-identical pre/post snapshots in INVENTORY.md "Public API lock-list verification" section. Each of the 101 + 9 + 13 = 123 immutable items confirmed unchanged.
    3. Run **aggregate residual-grep sweep:**
       ```bash
       for old in updateMobilePerformanceStatus applyHitareaCalibration \
                  applyPolygonPrecedence applyRoomCatalog updateClusterPadsRect \
                  applyAudioGain applyMediaPreviewProps applyMenuMode \
                  applyDisposalToGifCanvas buildTiles; do
         count=$(grep -rn "\b${old}\b" src/ | wc -l)
         echo "${old}: ${count}"
       done
       # Every line: ": 0".
       ```
       Paste output into INVENTORY.md "End-of-W4 verification" section.
    4. Run **`wc -l` line-count delta sweep:**
       ```bash
       # Compare against W3 closure baseline.
       find src/ -name "*.js" -exec wc -l {} + | tail -1
       # Expected delta vs phase-24-w4-start: < ±25 lines (only W4.1 area-divider comments).
       ```
    5. Run the **full ROADMAP regression checklist** (lines 203–275 of ROADMAP.md, ~10–15 min manual smoke on a fresh `node server.mjs` start). Record any failures in INVENTORY's "Decision-log" with revert plans.
    6. Append the **wave-closure summary** to INVENTORY: total commits (12 = 1 ctx + 10 renames + 1 closure), riskiest rename (R1 — 16 sites, 7 files, ctx-key change), wave length (actual hours), residual deviations (if any).
  - **`index.html` updates:** none.
  - **Pre-commit verification:** all 10 W4.2 commits landed; `phase-24-w4-start..HEAD` log shows 11 commits + this closure commit pending.
  - **Post-commit verification:** end-of-wave gate (§8) passes.
  - **Adjacent smoke:** the full ROADMAP regression checklist IS the closing smoke. No additional smoke needed.
  - **Commit message:** `docs(24-4): INVENTORY end-of-W4 — 12 commits + W4 closure verification`
  - **Rollback:** `git revert <hash>` removes the INVENTORY closure summary; the rename commits themselves are independently revertable upstream.

---

## 5. Rename candidate enumeration (10 in-scope renames)

For each W4.2 commit. Numbered in execution order (low→high call sites). RESEARCH §3 cross-reference in the row label.

### W4.2-C1 — R10: `applyDisposalToGifCanvas` → `applyGifDisposalToCanvas`

- **Justification:** Word-order clarity. The function mutates `canvasPixels` based on GIF disposal flags — legitimate `apply*` (side-effect, no return). New name puts the modifier (`Gif`) before the action target (`Disposal`) → reads "apply [GIF disposal] to [canvas]" instead of "apply [disposal to GIF] [canvas]".
- **Definition:** `src/app/runtime/render/runtime-gif-decoder.js:167` (verify line on Edit).
- **Sites (RESEARCH-VERIFIED):** 2 occurrences (1 def + 1 ref). Both inside `runtime-gif-decoder.js`.
- **Files touched:** `src/app/runtime/render/runtime-gif-decoder.js` (1 file).
- **Pre-rename grep:**
  ```bash
  grep -rn "\bapplyDisposalToGifCanvas\b" src/ | wc -l   # → 2
  grep -rn "\bapplyDisposalToGifCanvas\b" src/                  # → enumerate the 2 sites
  ```
- **Sed regex (single-file safe):**
  ```bash
  sed -i 's/\bapplyDisposalToGifCanvas\b/applyGifDisposalToCanvas/g' \
    src/app/runtime/render/runtime-gif-decoder.js
  ```
- **Post-rename grep:**
  ```bash
  grep -rn "\bapplyDisposalToGifCanvas\b" src/ | wc -l   # → 0
  grep -rn "\bapplyGifDisposalToCanvas\b" src/ | wc -l   # → 2
  ```
- **`node --check`:** `node --check src/app/runtime/render/runtime-gif-decoder.js` exits 0.
- **Public namespace check:** `applyDisposalToGifCanvas` is NOT a key on `window.TT_BEAMER_RUNTIME_GIF_DECODER` (verify pre-rename — it's an IIFE-private helper). VERIFIED safe.
- **ctx-bag check:** NOT a ctx-bag key (verify against `runtime-orchestration-ctx-builder.js`). VERIFIED safe.
- **Commit message:** `refactor(24-4): rename applyDisposalToGifCanvas → applyGifDisposalToCanvas`

---

### W4.2-C2 — R11: `buildTiles` → `renderTiles`

- **Justification:** Behaviour matches `render*` per §2 convention. Function calls `root.replaceChildren()` then appends new tile children — it MOUNTS DOM. The fact that it also returns the array of created nodes is a secondary contract; the primary side-effect is the mount. `renderTiles` chosen over the alternative `mountTiles` because §2 prefix table standardises on `render*` for DOM-mounting operations (consistent with `renderRunningAnimationsList`, `renderServerUnreachableOverlay`).
- **Definition:** `src/app/runtime/ui/icon-picker.js:17` (verify line on Edit).
- **Sites (RESEARCH-VERIFIED):** 2 occurrences (1 def + 1 internal call). Both inside `icon-picker.js`.
- **Files touched:** `src/app/runtime/ui/icon-picker.js` (1 file).
- **Pre-rename grep:**
  ```bash
  grep -rn "\bbuildTiles\b" src/ | wc -l   # → 2
  grep -rn "\bbuildTiles\b" src/
  ```
- **Sed regex:**
  ```bash
  sed -i 's/\bbuildTiles\b/renderTiles/g' src/app/runtime/ui/icon-picker.js
  ```
- **Post-rename grep:**
  ```bash
  grep -rn "\bbuildTiles\b" src/ | wc -l   # → 0
  grep -rn "\brenderTiles\b" src/ | wc -l  # → 2
  ```
- **`node --check`:** `node --check src/app/runtime/ui/icon-picker.js` exits 0.
- **Public namespace check:** `buildTiles` is NOT on `window.TT_BEAMER_RUNTIME_ICON_PICKER` (verify pre-rename — IIFE-private). VERIFIED safe.
- **Commit message:** `refactor(24-4): rename buildTiles → renderTiles (icon-picker mounts via replaceChildren)`

---

### W4.2-C3 — R2: `applyHitareaCalibration` → `computeHitareaCalibratedPoint`

- **Justification:** Body is `(x, y, calibration) ⇒ [scaledX, scaledY]` — pure function, no side effects. Per §2, `apply*` is reserved for side-effecting state mutations; this is `compute*`. New name disambiguates from `getHitareaCalibration` / `setHitareaCalibration` (the actual state accessors) by emphasising "calibrated POINT" (the output), not "calibration" (the input).
- **Definition:** `src/app/runtime/state/runtime-room-geometry.js:23`.
- **Sites (RESEARCH-VERIFIED):** 3 occurrences (1 def + 1 namespace export entry + 1 ref in `runtime-orchestration.js:955`).
- **Files touched:** `src/app/runtime/state/runtime-room-geometry.js`, `src/app/runtime/runtime-orchestration.js` (2 files).
- **Pre-rename grep:**
  ```bash
  grep -rn "\bapplyHitareaCalibration\b" src/ | wc -l   # → 3
  grep -rn "\bapplyHitareaCalibration\b" src/
  ```
- **Sed regex (multi-file):**
  ```bash
  grep -rl "\bapplyHitareaCalibration\b" src/ | \
    xargs sed -i 's/\bapplyHitareaCalibration\b/computeHitareaCalibratedPoint/g'
  ```
- **Post-rename grep:**
  ```bash
  grep -rn "\bapplyHitareaCalibration\b" src/ | wc -l   # → 0
  grep -rn "\bcomputeHitareaCalibratedPoint\b" src/ | wc -l   # → 3
  ```
- **`node --check`:** clean for both files.
- **Public namespace check:** Per pre-flight verdict (recorded in INVENTORY's "Decisions" section): **[PIN | SAFE-SED]** — read the recorded verdict and follow the matching path:
  - **If PIN:** keep the namespace export key at the old name (`applyHitareaCalibration: computeHitareaCalibratedPoint`); rename only the internal definition. Pattern documented under §6.1 "internal-rename-with-namespace-key-pinning". The namespace export-line maps the old key to the new fn name; preserves both the public key and the new internal identifier.
  - **If SAFE-SED:** proceed with the simple sed below — `applyHitareaCalibration` is not exposed via any `window.TT_BEAMER_*.<key>`, so no pinning is needed.
- **ctx-bag check:** NOT a ctx-bag key (RESEARCH-VERIFIED). Safe.
- **Commit message:** `refactor(24-4): rename applyHitareaCalibration → computeHitareaCalibratedPoint (pure function)`

---

### W4.2-C4 — R3: `applyPolygonPrecedence` → `mergePolygonPrecedence`

- **Justification:** Body is `(baseProfiles, polygonOwnerProfiles) ⇒ merged` — pure merge returning a new object. Per §2, `apply*` should be side-effecting. `merge*` is the closest verb matching the body's behaviour.
- **Definition:** `src/app/runtime/state/runtime-play-area-geometry.js:249`.
- **Sites (RESEARCH-VERIFIED):** 3 occurrences (1 def + 1 namespace export entry + 1 ref).
- **Files touched:** `src/app/runtime/state/runtime-play-area-geometry.js` + 1 caller (verify via grep). Expected 2 files total.
- **Pre-rename grep:**
  ```bash
  grep -rn "\bapplyPolygonPrecedence\b" src/ | wc -l   # → 3
  grep -rn "\bapplyPolygonPrecedence\b" src/
  ```
- **Sed regex:**
  ```bash
  grep -rl "\bapplyPolygonPrecedence\b" src/ | \
    xargs sed -i 's/\bapplyPolygonPrecedence\b/mergePolygonPrecedence/g'
  ```
- **Post-rename grep:**
  ```bash
  grep -rn "\bapplyPolygonPrecedence\b" src/ | wc -l   # → 0
  grep -rn "\bmergePolygonPrecedence\b" src/ | wc -l   # → 3
  ```
- **`node --check`:** clean for all touched files.
- **Public namespace check:** Per pre-flight verdict (recorded in INVENTORY's "Decisions" section): **[PIN | SAFE-SED]** — read the recorded verdict and follow the matching path. If PIN, the namespace export-line maps the old key (`applyPolygonPrecedence`) to the new fn name (`mergePolygonPrecedence`); only the internal definition is renamed. If SAFE-SED, the simple sed below covers it.
- **ctx-bag check:** NOT a ctx-bag key (RESEARCH-VERIFIED). Safe.
- **Commit message:** `refactor(24-4): rename applyPolygonPrecedence → mergePolygonPrecedence (pure merge)`

---

### W4.2-C5 — R9: `applyMenuMode` → `setMenuMode`

- **Justification:** Body takes `{mode, roomId}` — sets internal state + toggles class names. Per §2, `set*` writes a single value verbatim; this is closest to `set*` because the entire mode object is being written, not partially merged. RESEARCH labels it borderline — could go either way; planner choice is `setMenuMode` for symmetry with `setActiveView` etc.
- **Definition:** `src/app/runtime/polygon-editor/runtime-polygon-context-menu.js:97`.
- **Sites (RESEARCH-VERIFIED):** 3 occurrences. All inside `runtime-polygon-context-menu.js` (verify on grep).
- **Files touched:** `src/app/runtime/polygon-editor/runtime-polygon-context-menu.js` (1 file).
- **Pre-rename grep:**
  ```bash
  grep -rn "\bapplyMenuMode\b" src/ | wc -l   # → 3
  grep -rn "\bapplyMenuMode\b" src/
  ```
- **Sed regex:**
  ```bash
  sed -i 's/\bapplyMenuMode\b/setMenuMode/g' \
    src/app/runtime/polygon-editor/runtime-polygon-context-menu.js
  ```
- **Post-rename grep:**
  ```bash
  grep -rn "\bapplyMenuMode\b" src/ | wc -l   # → 0
  grep -rn "\bsetMenuMode\b" src/ | wc -l   # → 3
  ```
- **`node --check`:** clean.
- **Public namespace check:** Per pre-flight verdict (recorded in INVENTORY's "Decisions" section): **[PIN | SAFE-SED]** — read the recorded verdict and follow the matching path. RESEARCH §3.2 R9 does not tag it as a namespace export, so the expected verdict is SAFE-SED, but the pre-flight snapshot is the source of truth. If PIN, apply namespace-key-pinning.
- **ctx-bag check:** NOT a ctx-bag key. Safe.
- **Commit message:** `refactor(24-4): rename applyMenuMode → setMenuMode`

---

### W4.2-C6 — R4: `applyRoomCatalog` → `mergeRoomCatalog`

- **Justification:** Body is `(board, roomCatalog, deletedRoomIds) ⇒ normalizeBoard({...board, rooms: nextRooms})` — pure function returning a new board. Per §2, `apply*` should be side-effecting. `merge*` matches the body's behaviour exactly (merging room data into board). NOTE: this rename is in `src/app/lib/domain/`, NOT in `src/app/runtime/`.
- **Definition:** `src/app/lib/domain/rooms.js:108`.
- **Sites (RESEARCH-VERIFIED):** 5 occurrences (1 def + 4 refs across the lib + runtime trees).
- **Files touched:** `src/app/lib/domain/rooms.js` + ~2 callers (verify via grep). Expected ~3 files total.
- **Pre-rename grep:**
  ```bash
  grep -rn "\bapplyRoomCatalog\b" src/ | wc -l   # → 5
  grep -rn "\bapplyRoomCatalog\b" src/
  ```
- **Sed regex (multi-file):**
  ```bash
  grep -rl "\bapplyRoomCatalog\b" src/ | \
    xargs sed -i 's/\bapplyRoomCatalog\b/mergeRoomCatalog/g'
  ```
- **Post-rename grep:**
  ```bash
  grep -rn "\bapplyRoomCatalog\b" src/ | wc -l   # → 0
  grep -rn "\bmergeRoomCatalog\b" src/ | wc -l   # → 5
  ```
- **`node --check`:** clean for all touched files.
- **Public namespace check:** `applyRoomCatalog` lives in `src/app/lib/domain/` not `runtime/`; verify if the lib exposes a `window.TT_BEAMER_*` namespace (likely not — `lib/` modules are imported by the runtime tier). If exposed via any namespace, apply key-pinning. Otherwise sed cleanly.
- **ctx-bag check:** NOT a ctx-bag key (cross-checked against ctx-builder which has no entry by that name). Safe.
- **Commit message:** `refactor(24-4): rename applyRoomCatalog → mergeRoomCatalog (lib/domain/rooms)`

---

### W4.2-C7 — R6: `updateClusterPadsRect` → `syncClusterPadsRect`

- **Justification:** Body writes CSS variables (`--rail-left`, `--rail-top`, etc.) on `#cluster-pads` based on `getBoundingClientRect()`. Reconciles DOM CSS vars to state — exactly the §2 `sync*` convention (idempotent, safe to call repeatedly). `update*` was likely chosen because it's called per-frame from the rAF rail tracker; semantics are reconciliation.
- **Definition:** `src/app/runtime/animation/runtime-lifecycle-cluster-pads.js:65`.
- **Sites (RESEARCH-VERIFIED):** 5 occurrences. Files: `runtime-lifecycle-cluster-pads.js` + ~1 rAF-tracker caller (verify via grep). Expected 2 files.
- **Files touched:** Expected `src/app/runtime/animation/runtime-lifecycle-cluster-pads.js` + 1 caller.
- **Pre-rename grep:**
  ```bash
  grep -rn "\bupdateClusterPadsRect\b" src/ | wc -l   # → 5
  grep -rn "\bupdateClusterPadsRect\b" src/
  ```
- **Sed regex:**
  ```bash
  grep -rl "\bupdateClusterPadsRect\b" src/ | \
    xargs sed -i 's/\bupdateClusterPadsRect\b/syncClusterPadsRect/g'
  ```
- **Post-rename grep:**
  ```bash
  grep -rn "\bupdateClusterPadsRect\b" src/ | wc -l   # → 0
  grep -rn "\bsyncClusterPadsRect\b" src/ | wc -l   # → 5
  ```
- **`node --check`:** clean for all touched files.
- **Public namespace check:** verify against `TT_BEAMER_RUNTIME_LIFECYCLE_CLUSTER_PADS` snapshot. If exposed, apply key-pinning.
- **ctx-bag check:** NOT a ctx-bag key. Safe.
- **Commit message:** `refactor(24-4): rename updateClusterPadsRect → syncClusterPadsRect`

---

### W4.2-C8 — R8: `applyMediaPreviewProps` → `syncMediaPreviewProps`

- **Justification:** Body writes `el.opacity`, `el.style.transform`, etc. based on def. Same shape as a `sync*Panel` — reconciles DOM properties to state.
- **Definition:** `src/app/runtime/ui/animation-editor-live-preview.js:376`.
- **Sites (RESEARCH-VERIFIED):** 6 occurrences. All inside `animation-editor-live-preview.js` (verify on grep — namespace-exported via `TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIVE_PREVIEW`, see Wave-3 INVENTORY).
- **Files touched:** Expected `src/app/runtime/ui/animation-editor-live-preview.js` + 0–1 cross-callback consumers. Verify on grep.
- **Pre-rename grep:**
  ```bash
  grep -rn "\bapplyMediaPreviewProps\b" src/ | wc -l   # → 6
  grep -rn "\bapplyMediaPreviewProps\b" src/
  ```
- **PUBLIC NAMESPACE CHECK (CRITICAL):** Wave-3 INVENTORY confirms `applyMediaPreviewProps` IS a key on `window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIVE_PREVIEW` (the 12-key set, see W3.3 INVENTORY end-of-W3.3 verification). Per §6.1 the namespace key is LOCKED. **Pattern: namespace-key-pinning.** The internal function name is renamed to `syncMediaPreviewProps`; the namespace export entry maps the OLD key to the NEW function name:
  ```js
  window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIVE_PREVIEW = {
    // ... other 11 keys ...
    applyMediaPreviewProps: syncMediaPreviewProps,   // old key → new fn (pinned)
  };
  ```
  Internal callers within the IIFE use the new bare identifier `syncMediaPreviewProps`; external callers (if any) continue accessing `window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIVE_PREVIEW.applyMediaPreviewProps` and resolve via the pinning map. Verify post-rename namespace dump still shows `applyMediaPreviewProps` in the 12-key set.
- **Sed regex (filtered to skip the namespace export line):** Since the namespace key MUST stay, use file-by-file Edit, not blanket sed:
  1. Edit `animation-editor-live-preview.js`: rename every internal occurrence of `applyMediaPreviewProps` to `syncMediaPreviewProps` EXCEPT the namespace export entry. The namespace export entry switches from `applyMediaPreviewProps,` (shorthand) to `applyMediaPreviewProps: syncMediaPreviewProps,` (pinned).
  2. Update any cross-IIFE consumer that accesses the function via `window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIVE_PREVIEW.applyMediaPreviewProps` — leave AS-IS (the namespace key stays at the old name).
- **Post-rename grep:**
  ```bash
  # Internal references are all renamed:
  grep -rn "\bapplyMediaPreviewProps\b" src/ | wc -l
  # → 1 (only the namespace export line, which keeps the old key)

  grep -rn "\bsyncMediaPreviewProps\b" src/ | wc -l
  # → 6 (5 internal references + 1 namespace export RHS)
  ```
  **NOTE:** total occurrence count post-rename is 7 (6 new + 1 old retained as namespace key), not 6. This is the expected pattern when a rename touches a namespace-exported function. Document in INVENTORY's per-commit row: "applyMediaPreviewProps: 1 (namespace key pinned); syncMediaPreviewProps: 6 (internal refs)".
- **`node --check`:** clean.
- **ctx-bag check:** NOT a ctx-bag key. Safe.
- **Commit message:** `refactor(24-4): rename applyMediaPreviewProps → syncMediaPreviewProps (namespace key pinned)`

---

### W4.2-C9 — R7: `applyAudioGain` → `syncAudioGain` (ctx-key change)

- **Justification:** Body mutates `audioVoice.volume` on every active voice + every animation's voice based on `state.audio.volume` + per-animation soundVolume. Reconciles audio output to state — same shape as `sync*Status` reconciles DOM-text. Convention-wise `sync*` is closer than `apply*`.
- **Definition:** `src/app/runtime/render/runtime-audio.js:101`.
- **Sites (RESEARCH-VERIFIED):** 13 occurrences across **6 files** (per RESEARCH §3.2 R7 + §6.2 ctx-cascade analysis).
- **Files touched:** Expected `runtime-audio.js`, `runtime-orchestration-ctx-builder.js` (the ctx-bag entry — Area G), `runtime-orchestration.js` (the ctx-bag entry's RHS arrow + any direct call), plus 3 sub-modules that read `ctx.applyAudioGain`. Verify exact 6-file set via grep.
- **Pre-rename grep:**
  ```bash
  grep -rn "\bapplyAudioGain\b" src/ | wc -l   # → 13
  grep -rn "\bapplyAudioGain\b" src/
  # also: identify ctx readers
  grep -rn "ctx\.applyAudioGain" src/ | wc -l

  # Wire-protocol guard — MUST return 0 (otherwise STOP — wire serialization at risk):
  grep -n "\bapplyAudioGain\b" src/app/runtime/render/runtime-live-sync-helpers.js src/app/runtime/render/runtime-live-sync-core.js 2>/dev/null | wc -l
  # Expected: 0. If non-zero, R7 has bled into the wire-protocol deserializer files;
  # halt the rename, audit which message-type branch the identifier sits in, and
  # consult §6.2 before proceeding.
  ```
- **PUBLIC NAMESPACE CHECK (CRITICAL):** Per pre-flight verdict (recorded in INVENTORY's "Decisions" section): **[PIN | SAFE-SED]** — read the recorded verdict and follow the matching path. If PIN, namespace-key-pinning required (same pattern as R8/W4.2-C8: the namespace export-line maps `applyAudioGain` → `syncAudioGain`). If SAFE-SED, the multi-file sed below covers it without pinning.
- **CTX-BAG CASCADE:** RESEARCH §6.2 specifically calls out R7 as a ctx-bag key. The rename touches:
  1. The ctx-bag definition in `runtime-orchestration-ctx-builder.js` (Area G key, post-W4.1).
  2. The arrow's RHS reference in the corresponding `refs.applyAudioGain` direct-ref (or `refs.applyAudioGain: () => applyAudioGain()` arrow if it's wrapped — verify).
  3. The orchestration's `refs` bag construction site that passes `applyAudioGain` to `buildBootstrapCtx`.
  4. Every sub-module that reads `ctx.applyAudioGain` from its received bag.
  All 4 layers updated in lockstep in this single commit.
- **Sed regex (multi-file safe — `applyAudioGain` is a unique-prefix identifier, no false positive risk):**
  ```bash
  grep -rl "\bapplyAudioGain\b" src/ | \
    xargs sed -i 's/\bapplyAudioGain\b/syncAudioGain/g'
  ```
  Then handle the namespace-export pinning (if `applyAudioGain` IS exposed): edit the relevant namespace export line to `applyAudioGain: syncAudioGain,` (key pinned, RHS new name).
- **Post-rename grep:**
  ```bash
  # Without namespace pinning:
  grep -rn "\bapplyAudioGain\b" src/ | wc -l   # → 0
  grep -rn "\bsyncAudioGain\b" src/ | wc -l    # → 13

  # With namespace pinning (if locked):
  # → applyAudioGain: 1 (namespace key); syncAudioGain: 13 internal
  ```
  Plus: ctx-bag entry rename verifier:
  ```bash
  grep -n "syncAudioGain" src/app/runtime/runtime-orchestration-ctx-builder.js
  # → must show entry under Area G — Audio side-effects
  grep -n "applyAudioGain" src/app/runtime/runtime-orchestration-ctx-builder.js
  # → 0 (or 1 only if namespace-pinning is needed for the bag itself, which it is NOT — the bag is internal)
  ```
  Plus: **Ctx-cascade parity — MUST be equal pre/post-rename.** Run BEFORE the sed pass (records N_OLD_CTX), then AFTER (records N_NEW_CTX). N_NEW_CTX must equal N_OLD_CTX; if they differ, a `ctx.applyAudioGain` reader was missed. STOP.
  ```bash
  # BEFORE sed:
  N_OLD_CTX=$(grep -rn "ctx\.applyAudioGain" src/ | wc -l)
  echo "N_OLD_CTX=${N_OLD_CTX}"

  # AFTER sed:
  N_NEW_CTX=$(grep -rn "ctx\.syncAudioGain" src/ | wc -l)
  echo "N_NEW_CTX=${N_NEW_CTX}"

  # Assertion: N_NEW_CTX must equal N_OLD_CTX. If they differ, a reader was missed; STOP.
  [ "${N_NEW_CTX}" = "${N_OLD_CTX}" ] || { echo "FAIL: ctx-cascade parity broken (was ${N_OLD_CTX}, now ${N_NEW_CTX})"; exit 1; }
  ```
- **`node --check`:** clean for ALL 6 touched files.
- **ctx-bag check (POSITIVE):** R7 IS a ctx-bag key. The rename changes the bag's Area G key from `applyAudioGain` to `syncAudioGain`. Cross-module readers (`ctx.applyAudioGain`) MUST be updated in this same commit — the lockstep rule.
- **Commit message:** `refactor(24-4): rename applyAudioGain → syncAudioGain (13 sites, ctx-bag key)`

---

### W4.2-C10 — R1: `updateMobilePerformanceStatus` → `syncMobilePerformanceStatus` (ctx-key change, riskiest in-scope)

- **Justification:** ROADMAP §Wave 4 example shape (`syncRoomList` vs `applyRoomList` — same op, two prefixes — forbidden). Body writes `textContent` to a status DOM element — exactly the §2 `sync*Status` convention. 9 sibling functions already follow `sync*Status` (`syncAudioStatus`, `syncBoardZoomStatus`, etc.); `updateMobilePerformanceStatus` is the lone outlier.
- **Definition:** `src/app/runtime/render/runtime-perf.js:222`.
- **Sites (RESEARCH-VERIFIED):** 16 occurrences across **7 files** (per RESEARCH §3.1 R1 + §6.2): `runtime-perf.js`, `runtime-stage-viewport.js`, `runtime-bootstrap.js`, `runtime-panels-controller.js`, `viewport-lifecycle.js`, `runtime-orchestration.js`, `runtime-orchestration-ctx-builder.js`.
- **Files touched:** 7 files. Verify exact list via grep before sed.
- **Pre-rename grep:**
  ```bash
  grep -rn "\bupdateMobilePerformanceStatus\b" src/ | wc -l   # → 16
  grep -rn "\bupdateMobilePerformanceStatus\b" src/
  # also: ctx readers
  grep -rn "ctx\.updateMobilePerformanceStatus" src/ | wc -l
  ```
- **PUBLIC NAMESPACE CHECK (CRITICAL):** verify whether `updateMobilePerformanceStatus` is exposed on `window.TT_BEAMER_RUNTIME_PERF`. RESEARCH §3.1 R1 mentions it as a ctx-bag key but does NOT explicitly call it a namespace key. Run pre-rename DevTools snapshot to confirm. If YES, namespace-key-pinning required.
- **CTX-BAG CASCADE:** Same shape as R7. Touches:
  1. Area F key in `runtime-orchestration-ctx-builder.js` (post-W4.1).
  2. Refs construction in `runtime-orchestration.js` passing the function to `buildBootstrapCtx`.
  3. ~5 sub-modules / consumers reading `ctx.updateMobilePerformanceStatus`.
  4. Direct internal calls (the 16 occurrence count includes ALL of these).
  All updated in lockstep.
- **Sed regex (multi-file — unique prefix, no false-positive risk):**
  ```bash
  grep -rl "\bupdateMobilePerformanceStatus\b" src/ | \
    xargs sed -i 's/\bupdateMobilePerformanceStatus\b/syncMobilePerformanceStatus/g'
  ```
  Handle namespace pinning if locked.
- **Post-rename grep:**
  ```bash
  grep -rn "\bupdateMobilePerformanceStatus\b" src/ | wc -l   # → 0 (or 1 if namespace-pinned)
  grep -rn "\bsyncMobilePerformanceStatus\b" src/ | wc -l    # → 16
  ```
  ctx-bag entry verifier:
  ```bash
  grep -n "syncMobilePerformanceStatus" src/app/runtime/runtime-orchestration-ctx-builder.js
  # → 2 hits (1 in destructure block under Area F, 1 in return literal under Area F)
  ```
  Plus: **Ctx-cascade parity — MUST be equal pre/post-rename.** Run BEFORE the sed pass (records N_OLD_CTX), then AFTER (records N_NEW_CTX). N_NEW_CTX must equal N_OLD_CTX; if they differ, a `ctx.updateMobilePerformanceStatus` reader was missed. STOP.
  ```bash
  # BEFORE sed:
  N_OLD_CTX=$(grep -rn "ctx\.updateMobilePerformanceStatus" src/ | wc -l)
  echo "N_OLD_CTX=${N_OLD_CTX}"

  # AFTER sed:
  N_NEW_CTX=$(grep -rn "ctx\.syncMobilePerformanceStatus" src/ | wc -l)
  echo "N_NEW_CTX=${N_NEW_CTX}"

  # Assertion: N_NEW_CTX must equal N_OLD_CTX. If they differ, a reader was missed; STOP.
  [ "${N_NEW_CTX}" = "${N_OLD_CTX}" ] || { echo "FAIL: ctx-cascade parity broken (was ${N_OLD_CTX}, now ${N_NEW_CTX})"; exit 1; }
  ```
- **`node --check`:** clean for ALL 7 touched files.
- **ctx-bag check (POSITIVE):** R1 IS a ctx-bag key. The rename changes the bag's Area F key from `updateMobilePerformanceStatus` to `syncMobilePerformanceStatus`. Cross-module readers updated in lockstep.
- **Commit message:** `refactor(24-4): rename updateMobilePerformanceStatus → syncMobilePerformanceStatus (16 sites, 7 files, ctx-bag key)`

---

### Aggregate W4.2 totals

| Metric | Value |
|--------|------:|
| Renames | 10 |
| Total sites swapped | 58 (2+2+3+3+3+5+5+6+13+16) |
| Total unique files touched | ~12–15 (with cross-file dedup; verify on closure) |
| ctx-bag keys renamed | 2 (R1, R7) |
| Renames potentially needing namespace-key-pinning | 4 (R2, R3, R8, R9 — confirm via pre-flight namespace snapshot) |
| Renames touching `lib/` not `runtime/` | 1 (R4) |
| Riskiest commit | W4.2-C10 (R1, 16 sites / 7 files / ctx-bag) |

---

## 6. Public-API lock-list (123 immutable items)

**These items DO NOT CHANGE in Wave 4.** Each has a verifier that must return byte-identical pre/post. The lock-list is the safety net for the rename pass: if any verifier fails, STOP and revert.

### 6.1 The 101 IIFE namespace keys (RESEARCH §1.1)

The `window.TT_BEAMER_*` namespace keys exposed by IIFEs in `src/app/runtime/`. Verifier:

```bash
grep -rohE "window\.TT_BEAMER_[A-Z_]+" src/ | sort -u | wc -l
# → 101 (pre and post Wave 4)

grep -rohE "window\.TT_BEAMER_[A-Z_]+" src/ | sort -u > /tmp/ttkeys-pre.txt
# (after every W4 commit:)
grep -rohE "window\.TT_BEAMER_[A-Z_]+" src/ | sort -u > /tmp/ttkeys-post.txt
diff /tmp/ttkeys-pre.txt /tmp/ttkeys-post.txt    # → empty
```

**The keys exposed within each namespace are also locked.** For each of the 101 namespaces, `Object.keys(window.TT_BEAMER_…)` MUST return the same array pre/post. Per-namespace snapshots are captured in pre-flight (§3) and re-verified in W4.3-C1 closure.

**Renames that intersect this lock-list use namespace-key-pinning:** the namespace export line maps the OLD key to the NEW function name (`oldKey: newFn,`), preserving the public key while renaming the internal symbol. Affected candidates: R2, R3, R8, R9 — and possibly R7, R10 — depending on the per-flight snapshot. R8 (`applyMediaPreviewProps`) is CONFIRMED a namespace key per Wave-3 INVENTORY; the others must be verified during pre-flight.

**Rule:** before any rename commit lands, the executor confirms whether the OLD identifier is in the per-namespace key list. If YES → namespace-key-pinning. If NO → simple sed.

### 6.2 The 9 wire-protocol message-type literals (RESEARCH §1.2 — LOCKED)

```
clear-all
context-update
edit-room
outside-update
stop-animation
trigger-global
trigger-room
live-receive-ack
live-apply-ack
```

Verifier (must return identical output pre and post Wave 4):

```bash
grep -rohE 'emitLiveMutation\("[a-z-]+"' src/app/runtime/ | sort -u
# Expected:
#   emitLiveMutation("clear-all"
#   emitLiveMutation("context-update"
#   emitLiveMutation("edit-room"
#   emitLiveMutation("outside-update"
#   emitLiveMutation("stop-animation"
#   emitLiveMutation("trigger-global"
#   emitLiveMutation("trigger-room"

# Plus the ack literals (separate emit pattern):
grep -rohE '"(live-receive-ack|live-apply-ack)"' src/app/runtime/ | sort -u
# Expected:
#   "live-apply-ack"
#   "live-receive-ack"
```

**No W4 rename touches these strings.** The JS function names that emit them (`emitOutsideFxMutation`, `emitRoomDraftSyncMutation`, `emitBoardLayoutContextMutation`, `emitStopAnimationCommand`) are internal and could in principle be renamed — but none is in the §5 list, so this wave does not touch them.

**Wire-protocol deserializer files** (where the literals are read off incoming messages and dispatched): `runtime-live-sync-helpers.js` (the ack handlers at `:289, :301`), `runtime-live-sync-core.js` (the message-type switch). Renames that touch these files MUST NOT alter the literal-string comparison branches. Check by inspecting the diff: if a renamed identifier is on the LHS of a `case` or `===` against one of the 9 literals, the rename has bled into the wire protocol.

**None of the 10 in-scope renames touches a deserializer field**, but the executor must SCAN the wire-protocol files for any incidental occurrence of the old identifier before sed-running. R7 (`applyAudioGain`) is the most likely to surface since audio config flows through live-sync; verify pre-rename grep against `runtime-live-sync-helpers.js` and `runtime-live-sync-core.js` returns 0 hits.

### 6.3 The 13 localStorage / JSON-schema string literals (RESEARCH §1.3 — LOCKED)

13 string literals (plus the `tt-beamer-server-unreachable-overlay` DOM ID, treated separately as a documentation-only sibling — total surface 14, but the locked-string set verifier targets the 13 LS/JSON keys).

```
"tt-beamer.api-base.v1"
"tt-beamer.board-bundle.v1"
"tt-beamer.board-profiles.v1"
"tt-beamer.board-profiles.v3"
"tt-beamer.global-defaults.v1"
"tt-beamer.hitarea-calibration.v1"
"tt-beamer.last-board-id.v1"
"tt-beamer.projection-mapping.corners"
"tt-beamer.projection-mapping-v2"
"tt-beamer.room-geometry.v1"
"tt-beamer.room.v2"
"tt-beamer.settings-subtab.v1"
"tt-beamer.special-polygons.v1"
```

(The DOM ID `tt-beamer-server-unreachable-overlay` from RESEARCH §1.3 follows the same naming convention but is NOT a localStorage key; the locked-string verifier targets the 13 LS/JSON keys above. The DOM ID is treated as a documentation-only sibling — locked by convention but tracked separately. Aggregate §6.4 lock-list count remains 123, NOT 124.)

Verifier (must return identical output pre and post):

```bash
grep -rohE "['\"]tt-beamer[a-zA-Z0-9._-]+['\"]" src/ | sort -u
```

**No W4 rename touches these strings.** The JS variables holding them (`LS_KEY_OLD`, `LS_KEY_V2` in `runtime-projection-grid-state.js`, etc.) could be renamed without affecting the strings — but none is in the §5 list, so this wave does not touch them.

### 6.4 Aggregate lock-list summary

| Category | Count | Verifier |
|----------|------:|----------|
| Top-level `window.TT_BEAMER_*` namespace keys | 101 | `grep -rohE "window\\.TT_BEAMER_[A-Z_]+" src/ \| sort -u \| wc -l` |
| Wire-protocol message-type literals | 9 | `grep -rohE 'emitLiveMutation\\("[a-z-]+"' src/app/runtime/ \| sort -u` + ack pattern |
| localStorage / JSON-schema string literals | 13 | `grep -rohE "['\"]tt-beamer[a-zA-Z0-9._-]+['\"]" src/ \| sort -u` |
| **TOTAL** | **123** | — |

These 123 items form the public API contract. Each W4 commit verifies the relevant subset; W4.3-C1 verifies the full set as part of wave closure.

---

## 7. Per-commit Task Structure

### 7.1 Per-commit primary gate

Every W4.2 rename commit (and W4.1 ctx-grouping, and W4.3 closure) must pass the following gate before push:

| # | Gate | Command / Check |
|--:|------|-----------------|
| 1 | Pre-rename grep at OLD name returns N (matches §5 expected) | `grep -rn "\b<OLD>\b" src/ \| wc -l` |
| 2 | Public-API safety (OLD name is NOT a namespace key OR is handled via pinning) | DevTools `Object.keys(window.TT_BEAMER_…)` snapshot vs pre-flight |
| 3 | sed/Edit pass applied | (the rename change itself) |
| 4 | Post-rename grep at OLD name returns 0 (or 1 if pinning) | `grep -rn "\b<OLD>\b" src/ \| wc -l` |
| 5 | Post-rename grep at NEW name returns N (the original count) | `grep -rn "\b<NEW>\b" src/ \| wc -l` |
| 6 | `node --check` clean for every modified `.js` | `node --check <each file>` exits 0 |
| 7 | Public namespace-key list unchanged | `grep -rohE "window\.TT_BEAMER_[A-Z_]+" src/ \| sort -u \| diff …` |
| 8 | Wire-protocol literals unchanged | §6.2 verifier |
| 9 | localStorage literals unchanged | §6.3 verifier |
| 10 | `<script>` order unchanged | `git diff HEAD~..HEAD -- index.html` returns empty |
| 11 | `git diff -w` shows token-only swap | `git diff -w HEAD~..HEAD -- src/` |
| 12 | INVENTORY row appended | edit `.planning/phases/phase-24/wave-4/INVENTORY.md` |
| 13 | Atomic commit | `git commit -m "refactor(24-4): rename <OLD> → <NEW>"` |

**If any gate fails:** STOP. Investigate. The most common failure is gate 4 (residual references) — usually means the sed regex missed a case-variant or a comment occurrence. Check:

- Comments that name the function (often appear at the top of an IIFE describing its purpose).
- String literals that name the function (rare but possible — search code may contain `"applyAudioGain"` for an error message).
- Aliased imports (`const myAlias = ctx.applyAudioGain;`) — the assignment is at the new name; the use of `myAlias` is unchanged.

If non-zero residuals are found: do NOT commit. Resolve, re-run gates 4 and 5, then commit.

### 7.2 Per-sub-wave smoke

Browser-load smoke (manual, per W3 norm) at end of each sub-wave:

- **End of W4.1:** dashboard + `/output` boot clean. The 95-key reorder is semantically a no-op; nothing visible should change. Trigger one animation in each scope (Inside, Outside, Room) to confirm the ctx-bag still wires correctly.
- **End of W4.2:** ROADMAP regression checklist (lines 203–275), but particularly:
  - Mobile performance status visible after a few seconds (R1).
  - Audio plays + master volume + per-animation volume slider responds (R7).
  - Animation editor live preview updates as sliders move (R8).
  - GIF animation renders correctly in `/output` (R10 — gif-decoder change).
  - Icon picker tile selection works (R11 — icon-picker change).
- **End of W4.3 (wave closure):** full ROADMAP regression checklist, all 11 sections.

### 7.3 Why renames are SAFER than W3 structural moves

Wave 3 moved code between IIFEs — a rename of an IIFE-local identifier could break a closure capture; a missed export could leave a sub-module dangling. Wave 4 changes **identifiers only** with **no IIFE-boundary movement** and **no logic rewrite**. The verification is mechanical: identifier counts must add up (every removed token at the old name has a matching insertion at the new name). The bisect granularity is tight (one rename per commit) so any hidden breakage points exactly to its rename, not to a bundle of them.

---

## 8. End-of-Wave Gate

Wave 4 closure requires ALL of the following to be true at HEAD:

- [ ] **All 12 commits landed:** 1 ctx-builder reorganization (W4.1-C1) + 10 atomic renames (W4.2-C1..W4.2-C10) + 1 INVENTORY closure (W4.3-C1).
- [ ] **Aggregate post-rename grep at every old name returns 0:**
  ```bash
  for old in updateMobilePerformanceStatus applyHitareaCalibration \
             applyPolygonPrecedence applyRoomCatalog updateClusterPadsRect \
             applyAudioGain applyMediaPreviewProps applyMenuMode \
             applyDisposalToGifCanvas buildTiles; do
    n=$(grep -rn "\b${old}\b" src/ | wc -l)
    [ "$n" = "0" ] || echo "FAIL: ${old} has ${n} residual"
  done
  # Note: applyMediaPreviewProps will show 1 IF namespace-pinning is in effect
  # (the old key remains as a namespace export entry per §6.1). Document in
  # INVENTORY's "Public API lock-list verification" section.
  ```
- [ ] **Aggregate post-rename grep at every new name returns the original old-name count:** verify R1=16, R2=3, R3=3, R4=5, R6=5, R7=13, R8=6, R9=3, R10=2, R11=2 → total 58 swaps ✓.
- [ ] **Public API lock-list intact:**
  - 101 namespace keys: `grep -rohE "window\.TT_BEAMER_[A-Z_]+" src/ | sort -u | wc -l` → 101.
  - Per-namespace inner key sets: `Object.keys(window.TT_BEAMER_…)` per namespace matches pre-flight snapshot.
  - 9 wire-protocol literals: §6.2 verifier returns identical output.
  - 13 localStorage / JSON-schema literals: §6.3 verifier returns identical output.
- [ ] **Line-count delta minimal:**
  ```bash
  git diff --stat phase-24-w4-start..HEAD -- src/ | tail -1
  # Expected: < ±25 net lines. The only line-count change is from the W4.1
  # ctx-builder area-divider comments (~17 added). Renames don't shift sizes.
  ```
- [ ] **`node --check` clean at HEAD** for every `.js` file modified during Wave 4. Spot-check on the top 5 most-touched files:
  ```bash
  for f in src/app/runtime/runtime-orchestration-ctx-builder.js \
           src/app/runtime/runtime-orchestration.js \
           src/app/runtime/render/runtime-audio.js \
           src/app/runtime/render/runtime-perf.js \
           src/app/runtime/ui/animation-editor-live-preview.js; do
    node --check "$f" || echo "FAIL: $f"
  done
  ```
- [ ] **`<script>` order unchanged:** `git diff phase-24-w4-start..HEAD -- index.html` returns empty.
- [ ] **INVENTORY.md complete:** per-commit table fully populated, public-API lock-list verification section present and PASS, decision-log section present, end-of-wave aggregate row present.
- [ ] **Full ROADMAP regression checklist passes** (ROADMAP.md lines 203–275, ~10–15 min manual smoke on fresh `node server.mjs` start).

If any item fails: STOP. Investigate. Likely culprits: a missed reference (gate 4 of §7.1 missed it), a namespace-key-pinning rename was applied without pinning (which deletes the public key), a wire-protocol or localStorage literal was unintentionally captured by an over-broad sed regex.

---

## 9. INVENTORY.md plan

`.planning/phases/phase-24/wave-4/INVENTORY.md` mirrors Wave 1/2/3 INVENTORY format. Skeleton:

```markdown
# Phase 24 Wave 4 — INVENTORY

Tracks per-commit progress for Wave 4 naming + API consistency.

## Baseline (pre-flight, captured against `phase-24-w4-start`)

- **Tag:** `phase-24-w4-start` → `<hash>` (commit `<message>`).
- **Captured:** 2026-04-26.

### Per-rename baseline counts (RESEARCH §3.4 + PLAN §5)

| ID | OLD name | Sites (pre) |
|----|----------|------------:|
| R1 | updateMobilePerformanceStatus | 16 |
| R2 | applyHitareaCalibration | 3 |
| R3 | applyPolygonPrecedence | 3 |
| R4 | applyRoomCatalog | 5 |
| R6 | updateClusterPadsRect | 5 |
| R7 | applyAudioGain | 13 |
| R8 | applyMediaPreviewProps | 6 |
| R9 | applyMenuMode | 3 |
| R10 | applyDisposalToGifCanvas | 2 |
| R11 | buildTiles | 2 |
| **Σ** | — | **58** |

### Public API lock-list — pre-flight snapshot

(101 IIFE namespace keys; 9 wire-protocol literals; 13 localStorage / JSON-schema literals. See PLAN §6 for the full list. Snapshot captured via the §3 pre-flight commands.)

### Pre-flight smoke

(record any pre-existing console oddities before W4.1-C1 lands)

## Decisions (confirmed pre-flight)

- **`refresh*` prefix RETAINED.** R5 (47 sites) is OUT OF SCOPE.
- **Option-bag conversions OUT OF SCOPE.** Hot-loop `drawAffineTriangle` (14 args) documented as legitimate exception.
- **ctx-builder reorganization = Option (b) comment-grouped (single file).** 17 areas with `// ─── Area … ───` headers. Option (a) per-area builders deferred to W5 if needed.

## Per-commit progress

| Commit | Hash | Sub-wave | Old name | New name | Files touched | Sites updated | Pre-grep | Sed-pass | Post-grep OLD | Post-grep NEW | `node --check` | Namespace OK | `<script>` order OK | Notes |
|--------|------|----------|----------|----------|--------------:|--------------:|---------:|---------:|--------------:|--------------:|---------------:|--------------|----------------------|-------|
| W4.1-C1 | `<hash>` | W4.1 | (n/a — area-grouping) | (n/a) | 1 (ctx-builder) | n/a (95 keys reordered) | (95 keys) | yes | (95 keys) | (95 keys) | yes | yes | yes (no edits) | 17 area-divider comments inserted; key set unchanged |
| W4.2-C1 | `<hash>` | W4.2 | applyDisposalToGifCanvas | applyGifDisposalToCanvas | 1 | 2 | 2 | yes | 0 | 2 | yes | yes | yes | — |
| W4.2-C2 | `<hash>` | W4.2 | buildTiles | renderTiles | 1 | 2 | 2 | yes | 0 | 2 | yes | yes | yes | — |
| W4.2-C3 | `<hash>` | W4.2 | applyHitareaCalibration | computeHitareaCalibratedPoint | 2 | 3 | 3 | yes | 0 (or 1 if pinned) | 3 | yes | yes | yes | namespace pin if needed |
| W4.2-C4 | `<hash>` | W4.2 | applyPolygonPrecedence | mergePolygonPrecedence | 2 | 3 | 3 | yes | 0 (or 1) | 3 | yes | yes | yes | namespace pin if needed |
| W4.2-C5 | `<hash>` | W4.2 | applyMenuMode | setMenuMode | 1 | 3 | 3 | yes | 0 | 3 | yes | yes | yes | — |
| W4.2-C6 | `<hash>` | W4.2 | applyRoomCatalog | mergeRoomCatalog | ~3 | 5 | 5 | yes | 0 | 5 | yes | yes | yes | lib/domain — outside runtime/ |
| W4.2-C7 | `<hash>` | W4.2 | updateClusterPadsRect | syncClusterPadsRect | 2 | 5 | 5 | yes | 0 | 5 | yes | yes | yes | — |
| W4.2-C8 | `<hash>` | W4.2 | applyMediaPreviewProps | syncMediaPreviewProps | 1 | 6 | 6 | yes | 1 (namespace key pinned) | 6 | yes | yes | yes | namespace key on TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIVE_PREVIEW PINNED |
| W4.2-C9 | `<hash>` | W4.2 | applyAudioGain | syncAudioGain | 6 | 13 | 13 | yes | 0 (or 1) | 13 | yes | yes | yes | ctx-bag Area G key change; namespace pin if needed |
| W4.2-C10 | `<hash>` | W4.2 | updateMobilePerformanceStatus | syncMobilePerformanceStatus | 7 | 16 | 16 | yes | 0 (or 1) | 16 | yes | yes | yes | ctx-bag Area F key change; namespace pin if needed; RIGHT-MOST IN-SCOPE rename |
| W4.3-C1 | `<hash>` | W4.3 | (n/a — INVENTORY closure) | — | 1 (INVENTORY.md) | n/a | n/a | n/a | n/a | n/a | n/a | yes (final) | yes | aggregate row + ROADMAP regression result |
| **Σ** | — | — | — | — | (dedup unique) | **58 swaps** | — | — | **0 residual** | **58 new** | all yes | all yes | all yes | — |

## Public API lock-list verification

### Pre-W4 vs Post-W4 namespace key snapshot (101 keys)

(Full diff output of `Object.keys(window).filter(k => k.startsWith("TT_BEAMER_")).sort()` pre vs post — MUST be empty.)

### Per-namespace inner key set verification

(For each of the 101 namespaces, `Object.keys(window.TT_BEAMER_…)` pre vs post — MUST be empty diff. Notable: `TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIVE_PREVIEW.applyMediaPreviewProps` retained as namespace key per §6.1 pinning pattern.)

### Wire-protocol literals verification (9 items)

(Output of `grep -rohE 'emitLiveMutation\("[a-z-]+"' src/app/runtime/ | sort -u` pre vs post — MUST be byte-identical.)

### localStorage / JSON-schema literals verification (13 items)

(Output of `grep -rohE "['\"]tt-beamer[a-zA-Z0-9._-]+['\"]" src/ | sort -u` pre vs post — MUST be byte-identical.)

## Decision-log

(Deviations from PLAN are recorded here as commits land. Format: per-deviation paragraph with PLAN-section / commit-hash / rationale.)

## Tags

- `phase-24-w4-start` (`<hash>`) — set during pre-flight; rollback target.

## End-of-W4 verification

(Filled in at end of wave with the gate checks from PLAN §8 passing/failing. Includes the full ROADMAP regression checklist results and a note on any residual deviations.)

## Wave 4 commits

| Commit | Hash | Message |
|--------|------|---------|
| W4.1-C1 | `<hash>` | refactor(24-4): area-group runtime-orchestration-ctx-builder.js (17 areas, comment-banner grouping) |
| W4.2-C1 | `<hash>` | refactor(24-4): rename applyDisposalToGifCanvas → applyGifDisposalToCanvas |
| W4.2-C2 | `<hash>` | refactor(24-4): rename buildTiles → renderTiles (icon-picker mounts via replaceChildren) |
| W4.2-C3 | `<hash>` | refactor(24-4): rename applyHitareaCalibration → computeHitareaCalibratedPoint (pure function) |
| W4.2-C4 | `<hash>` | refactor(24-4): rename applyPolygonPrecedence → mergePolygonPrecedence (pure merge) |
| W4.2-C5 | `<hash>` | refactor(24-4): rename applyMenuMode → setMenuMode |
| W4.2-C6 | `<hash>` | refactor(24-4): rename applyRoomCatalog → mergeRoomCatalog (lib/domain/rooms) |
| W4.2-C7 | `<hash>` | refactor(24-4): rename updateClusterPadsRect → syncClusterPadsRect |
| W4.2-C8 | `<hash>` | refactor(24-4): rename applyMediaPreviewProps → syncMediaPreviewProps (namespace key pinned) |
| W4.2-C9 | `<hash>` | refactor(24-4): rename applyAudioGain → syncAudioGain (13 sites, ctx-bag key) |
| W4.2-C10 | `<hash>` | refactor(24-4): rename updateMobilePerformanceStatus → syncMobilePerformanceStatus (16 sites, 7 files, ctx-bag key) |
| W4.3-C1 | `<hash>` | docs(24-4): INVENTORY end-of-W4 — 12 commits + W4 closure verification |
```

---

## 10. Risks + Mitigations Specific to Wave 4

| # | Risk | Mitigation |
|---|------|------------|
| 1 | **Cascading consumer updates missed.** A rename leaves dangling references at the OLD name; `node --check` doesn't catch this (an unused identifier doesn't fail parse — it surfaces as a runtime ReferenceError or, worse, silently shadows a global). | **Per-commit gate §7.1 step 4: post-rename grep at OLD name returns 0** (or 1 only if namespace-key-pinning is in effect — documented per row in §5). If non-zero, STOP and check what was missed. Most common: a comment that names the function, an aliased import, a dynamic property access (`obj["applyAudioGain"]`). |
| 2 | **Public-API drift.** A rename accidentally hits a namespace-export key, breaking external callers (other IIFEs that read `window.TT_BEAMER_…`) without breaking parse-check. | Pre-rename DevTools snapshot of `Object.keys(window.TT_BEAMER_…)` per namespace; cross-reference the OLD identifier against the snapshot. If the OLD name IS a namespace key, switch to namespace-key-pinning (RHS rename only, key preserved). Per-commit gate §7.1 step 7: post-rename namespace key list MUST equal pre-rename list. Affected candidates: R8 (CONFIRMED keyed), R2/R3/R7/R9 (likely keyed — verify in pre-flight), R10/R11 (likely IIFE-private — verify). |
| 3 | **Wire-protocol drift.** A rename touches a deserializer field — the literal-string-to-handler dispatch in `runtime-live-sync-helpers.js` / `runtime-live-sync-core.js`. The 9 wire literals are LOCKED, but a renamed JS function name in the wrong place could break the dispatch table. | §6.2 verifier per commit: `grep -rohE 'emitLiveMutation\("[a-z-]+"' src/app/runtime/ \| sort -u` returns identical output pre/post. Plus: pre-rename grep against the 2 wire-protocol files for any incidental occurrence of the OLD identifier. R7 (`applyAudioGain`) is the most likely to surface — audio config flows through live-sync; verify its pre-rename grep against `runtime-live-sync-helpers.js` / `runtime-live-sync-core.js` returns 0 hits. |
| 4 | **Build/test infra is manual.** No CI yet — same as W1/W2/W3. Browser-load smoke is by hand at end of each sub-wave. | Per-commit `node --check` is the cheap gate; per-sub-wave manual smoke pass catches namespace-load failures; full ROADMAP regression at wave-close catches everything else. Same pattern as the prior 3 waves. |
| 5 | **ctx-bag cascade missed.** R1 and R7 are ctx-bag keys; their renames must update `runtime-orchestration-ctx-builder.js` (the bag definition) AND every sub-module that reads `ctx.<oldName>` from its received init bag. If any sub-module reader is missed, the consuming code resolves `undefined` at call time → silent no-op (especially bad for `applyAudioGain` since it's called per-frame from audio sync — a missed update means audio gain just stops responding to volume changes; user sees "volume slider does nothing" with no console error). | Per-commit gate §7.1 step 4 catches this: post-rename grep at OLD name AT ZERO across the entire `src/` tree, including the ctx-builder, the orchestration `refs` construction, and every sub-module that reads `ctx.<oldName>`. Plus: pre-rename grep `grep -rn "ctx\.<oldName>" src/` enumerates ctx readers; this list MUST match the consumer files updated in the commit. Sub-wave smoke specifically tests the ctx-cascade scenarios (audio volume slider for R7; mobile performance status display for R1). |
| 6 | **Sed regex over-matches.** A rename like `buildTiles` → `renderTiles` could collide with an unrelated identifier containing the substring `buildTiles` (e.g. `_buildTilesCache`, `buildTilesetMap`). Word-boundary regex (`\b`) prevents this for most cases, but sed's regex flavor can have edge cases. | All §5 sed commands use `\b<OLD>\b` word-boundary anchors. Pre-rename: enumerate all matches via `grep -n "<OLD>" src/` (without `\b`) AND `grep -rn "\b<OLD>\b" src/`; verify counts agree. If they don't, the OLD name has substring collisions; switch to file-by-file Edit instead of sed. The §5 candidates are pre-screened: all 10 OLD names are unique-prefix identifiers in the post-W3 tree, low collision risk. |
| 7 | **Namespace-key-pinning misapplied.** The pattern `applyMediaPreviewProps: syncMediaPreviewProps` MUST be applied AT the namespace export object literal — not at every call site. If applied at a call site, the rename fails. | §5 W4.2-C8 row spells out the pattern explicitly. Per-commit gate §7.1 step 9: `git diff -w` shows ONLY token swaps + the namespace export line's `oldKey,` → `oldKey: newFn,` change. Spot-check the namespace export line manually before commit. |
| 8 | **Comment text mentions the OLD name.** Comments documenting the function (e.g. "// applyAudioGain mutates active voices") will retain the OLD name after sed. This is a documentation drift, not a logic break, but the post-rename grep at OLD name will return >0 from the comment hit. | Per-commit grep enumerates ALL hits (code + comments); the executor inspects each pre-commit. If a comment names the function, update the comment in the same commit (allowed under "comment changes that mechanically tie to a rename" per pre-flight scope). The diff still shows token-only swap (the comment's token also flips). Net post-rename grep at OLD = 0. |
| 9 | **Rollback fragility.** Wave 4's atomic-commit doctrine guarantees per-rename revertability — but a chain-revert of multiple W4 commits requires they're applied in REVERSE order (most-recent first). Reverting an early commit out of order can leave the tree in a state where a later rename's references resolve to a different OLD name than the early rename intended. | Document in INVENTORY (Decision-log) any partial-revert scenarios. The Wave 4 12-commit sequence is small enough that a full revert via `git reset --hard phase-24-w4-start` is fast (and verified safe by the rollback tag). Prefer full-wave revert over selective revert if any single rename misbehaves badly. |

---

## 11. Out of Scope for Wave 4

Reaffirmed from ROADMAP + pre-flight scope decisions:

- **No behaviour changes.** W4 changes IDENTIFIERS only.
- **No new files created.** Wave 3 territory; W3 closed at `c9038bc`. No new sub-modules. No new `<script>` tags. `index.html` is not edited.
- **No comment changes beyond what's mechanically tied to a rename.** Wave 2 territory; W2 closed. The only comment edits in W4 are: (a) the 17 area-divider comments added by W4.1; (b) inline comments that name a renamed function (allowed under risk-mitigation #8 above). No reformatting, no rewriting of explanatory comments.
- **No dead code removal.** Wave 1 territory; closed.
- **`refresh*` prefix RETAINED.** R5 (`refreshGlobalButtons` → `syncGlobalButtonsActiveState`, 47 sites) is OUT OF SCOPE. The 4 `refresh*` functions stay as-is. Per orchestrator pre-flight decision; reduces wave-4 rename volume by ~47 sites and avoids the highest-risk single rename.
- **Option-bag conversions excluded.** RESEARCH §5 W4.4 candidates (O1: `_buildRunningRow`, O2: `_categorizeAndOrderAnimations`, O3: `buildSliderRow` cluster) DEFERRED. The 14-arg `drawAffineTriangle` hot-loop helper in `runtime-projection-2d-fallback-renderer.js` is documented as a legitimate positional-arg exception per RESEARCH §5.1.
- **ctx-builder Option (a) per-area builder helpers EXCLUDED.** RESEARCH §4.2 Option (a) (split `buildBootstrapCtx` into 17 per-area builder fns) DEFERRED to Wave 5 if module-boundary cleanup needs the per-area exports. W4.2 uses Option (b) — single-file comment-grouped — only.
- **Sub-module init-bag reorganization OUT OF SCOPE.** RESEARCH §4.3: the 45 sub-module `init({...})` ctx-bags in `runtime-orchestration.js` (separate from BOOTSTRAP) are NOT touched. ROADMAP acceptance "ctx keys grouped by area" applies to the BOOTSTRAP bag (the `runtime-orchestration-ctx-builder.js` 95-key bag), per RESEARCH's reading.
- **No public-API changes** (§6 lock-list — 123 immutable items).
- **No dependency changes.** Same Node version, same browser targets, same npm packages.
- **No `<script>` order changes.** No new files; `index.html` not edited.
- **No test framework introduction.** Manual smoke pass only.
- **No README rewrites.**
- **No performance optimizations.**

---

## 12. Summary

**Total commits across the 3 sub-waves:** **12** (1 ctx-grouping + 10 atomic renames + 1 INVENTORY closure).

| Sub-wave | Commits | Risk |
|----------|--------:|------|
| W4.1 ctx-builder area-grouping | 1 | LOW |
| W4.2 atomic renames (low→high call sites) | 10 | MEDIUM (R1, R7, R8 with namespace-key-pinning + ctx-cascade) |
| W4.3 INVENTORY closure + final regression | 1 | LOW |
| **Total** | **12** | — |

**Riskiest single in-scope rename:** **W4.2-C10 (R1) — `updateMobilePerformanceStatus` → `syncMobilePerformanceStatus`** — 16 sites across 7 files (`runtime-perf.js`, `runtime-stage-viewport.js`, `runtime-bootstrap.js`, `runtime-panels-controller.js`, `viewport-lifecycle.js`, `runtime-orchestration.js`, `runtime-orchestration-ctx-builder.js`); ctx-bag Area F key change; potentially also a namespace-export key (verify in pre-flight). The 7-file lockstep update is the largest in the wave. Lands LAST in W4.2 so all earlier renames have battle-tested the rename machinery; bisect points cleanly if R1 alone misbehaves.

**Total estimated wave length:** **~5–7 hours of executor work** — far smaller than W3's ~10–14 hours. Distribution:

| Step | Time |
|------|------|
| Pre-flight (§3) | 30–45 min |
| W4.1-C1 ctx area-grouping | 30–60 min |
| W4.2-C1 to W4.2-C8 (8 small renames, ≤6 sites each) | 20–40 min × 8 = 2.5–5 h |
| W4.2-C9 R7 (13 sites, 6 files, ctx-cascade) | 45–60 min |
| W4.2-C10 R1 (16 sites, 7 files, ctx-cascade) | 45–60 min |
| W4.3-C1 INVENTORY closure + ROADMAP regression | 30–45 min |
| **Total** | **~5–7 hours** |

Plus ~10–15 min full ROADMAP regression at end of wave (manual browser smoke).

**Baseline → target metric deltas:**

| Metric | Pre-W4 (post-W3) | Post-W4 target |
|--------|-----------------:|---------------:|
| Function-prefix inconsistencies (R1-R4, R6-R11 from RESEARCH §3) | 10 candidates | **0** (all renamed) |
| Public IIFE namespace keys (`window.TT_BEAMER_*`) | 101 | **101** (unchanged — LOCKED) |
| Wire-protocol message-type literals | 9 | **9** (unchanged — LOCKED) |
| localStorage / JSON-schema literals | 13 | **13** (unchanged — LOCKED) |
| ctx-builder dep-bag size | 95 keys | **95** (unchanged — keys reordered + area-grouped) |
| ctx-builder area-divider comments | 0 | **17** (added by W4.1) |
| Total `.js` files in `src/app/runtime/` | (post-W3 count) | (same) — no new files |
| Total runtime LOC | (post-W3 count) | (post-W3 count) ± 0 (renames don't shift sizes; +~17 from area-divider comments) |
| `refresh*` prefix functions | 4 | **4** (RETAINED — out-of-scope decision) |
| Option-bag conversions | 0 | **0** (deferred) |

**Path to PLAN.md:** `/home/claw/tt-beamer/.planning/phases/phase-24/wave-4/PLAN.md` (this file).
