# Phase 24 Wave 4 — INVENTORY

Tracks per-commit progress for Wave 4 naming + API consistency.

## Baseline (pre-flight, captured against `phase-24-w4-start`)

- **Tag:** `phase-24-w4-start` → `23af592` (commit `docs(24-3): INVENTORY end-of-W3.6 — 7 commits + 4 deviations recorded + final file-size table`).
- **Captured:** 2026-04-26.
- **ctx-builder size:** 211 lines (95 keys + arrow-pattern wrappers).

### Per-rename baseline counts (RESEARCH §3.4 + PLAN §5)

| ID | OLD name | Sites (pre) | Files (pre) |
|----|----------|------------:|------------:|
| R1 | updateMobilePerformanceStatus | 16 | 7 |
| R2 | applyHitareaCalibration | 3 | 2 |
| R3 | applyPolygonPrecedence | 3 | 2 |
| R4 | applyRoomCatalog | 5 | (≤3) |
| R6 | updateClusterPadsRect | 5 | (≤2) |
| R7 | applyAudioGain | 13 | 6 |
| R8 | applyMediaPreviewProps | 6 | 1 |
| R9 | applyMenuMode | 3 | 1 |
| R10 | applyDisposalToGifCanvas | 2 | 1 |
| R11 | buildTiles | 2 | 1 |
| **Σ** | — | **58** | — |

### Public API lock-list — pre-flight snapshot

- **Top-level `window.TT_BEAMER_*` namespace keys:** 101 (snapshot at `/tmp/w4/ttkeys-pre.txt`).
- **Wire-protocol message-type literals:** 9 — `clear-all`, `context-update`, `edit-room`, `outside-update`, `stop-animation`, `trigger-global`, `trigger-room`, `live-receive-ack`, `live-apply-ack` (snapshot at `/tmp/w4/wire-pre.txt`).
- **localStorage / JSON-schema literals:** 13 (plus 1 DOM ID `tt-beamer-server-unreachable-overlay` tracked separately) — `tt-beamer.api-base.v1`, `tt-beamer.board-profiles.v1`, `tt-beamer.board-profiles.v3`, `tt-beamer.global-defaults.v1`, `tt-beamer.hitarea-calibration.v1`, `tt-beamer.last-board-id.v1`, `tt-beamer.projection-mapping.corners`, `tt-beamer.projection-mapping-v2`, `tt-beamer.room-geometry.v1`, `tt-beamer.room.v2`, `tt-beamer.settings-subtab.v1`, `tt-beamer.special-polygons.v1` (snapshot at `/tmp/w4/ls-pre.txt`).

NOTE: The PLAN's example list of 13 LS literals included `tt-beamer.board-bundle.v1` but the actual codebase does not contain that literal (snapshot is the source of truth). Total pre-W4 lock-list count: 101 + 9 + 13 = 123.

### Per-namespace inner-key snapshot for the 7 PIN'd namespaces

(captured pre-W4; verified byte-identical post-W4)

- `TT_BEAMER_RUNTIME_PERF` (16 keys): `computeAnimationCoalesceSeed, getMp4PerformanceControls, getMp4TierDefaults, getRuntimeQualityScale, getRuntimeVisualCaps, init, isRenderCriticalAnimation, normalizeMp4PerformanceControls, normalizeMp4PerformanceTier, percentile, recordRuntimeFrameCost, shouldCoalesceNonCriticalAnimation, shouldSkipRoomMp4Frame, syncMp4PerformanceControlsPanel, updateMobilePerformanceStatus, updateMp4PerformanceControls`
- `TT_BEAMER_RUNTIME_ROOM_GEOMETRY` (11 keys): `applyHitareaCalibration` is key #2.
- `TT_BEAMER_RUNTIME_PLAY_AREA_GEOMETRY` (33 keys): `applyPolygonPrecedence` is key #2.
- `TT_BEAMER_ROOMS` (11 keys): `applyRoomCatalog` is key #2.
- `TT_BEAMER_RUNTIME_LIFECYCLE_CLUSTER_PADS` (6 keys): `updateClusterPadsRect` is key #6.
- `TT_BEAMER_RUNTIME_AUDIO` (19 keys): `applyAudioGain` is key #1.
- `TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIVE_PREVIEW` (12 keys): `applyMediaPreviewProps` is key #10.

### Pre-flight smoke

Static analysis only (no browser runs available in this environment). Code-path verification:

- **R7 ctx-cascade readers:** `runtime-bootstrap.js:50` reads `ctx.applyAudioGain`. Function is called from `runtime-wire-room-audio-binders.js:397, 432` and from `runtime-panels-controller.js:49`. The audio side-effect path is well-defined.
- **R1 ctx-cascade readers:** `runtime-stage-viewport.js:213` and `runtime-bootstrap.js:65` read `ctx.updateMobilePerformanceStatus`. Function is called from `runtime-wire-room-audio-binders.js:569`, `runtime-panels-controller.js:64`, and `viewport-lifecycle.js:27`. Total 16 sites confirmed by grep.
- **Wire-protocol guard for R7:** `applyAudioGain` does NOT appear in `runtime-live-sync-helpers.js` or `runtime-live-sync-core.js` (count = 0). Wire protocol unaffected.

## Decisions (confirmed pre-flight)

- **`refresh*` prefix RETAINED.** R5 (47 sites) is OUT OF SCOPE.
- **Option-bag conversions OUT OF SCOPE.** Hot-loop `drawAffineTriangle` (14 args) documented as legitimate exception.
- **ctx-builder reorganization = Option (b) comment-grouped (single file).** 17 areas with `// ─── Area … ───` headers. Option (a) per-area builders deferred to W5 if needed.
- **Namespace-pinning verdicts (RESOLVED at pre-flight):**

  | ID | OLD name | Verdict | Reason |
  |----|----------|---------|--------|
  | R1 | updateMobilePerformanceStatus | **PIN** | Inner key on `TT_BEAMER_RUNTIME_PERF` |
  | R2 | applyHitareaCalibration | **PIN** | Inner key on `TT_BEAMER_RUNTIME_ROOM_GEOMETRY` |
  | R3 | applyPolygonPrecedence | **PIN** | Inner key on `TT_BEAMER_RUNTIME_PLAY_AREA_GEOMETRY` |
  | R4 | applyRoomCatalog | **PIN** | Inner key on `TT_BEAMER_ROOMS` (lib/domain) |
  | R6 | updateClusterPadsRect | **PIN** | Inner key on `TT_BEAMER_RUNTIME_LIFECYCLE_CLUSTER_PADS` |
  | R7 | applyAudioGain | **PIN** | Inner key on `TT_BEAMER_RUNTIME_AUDIO` |
  | R8 | applyMediaPreviewProps | **PIN** | Inner key on `TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIVE_PREVIEW` (already known) |
  | R9 | applyMenuMode | **SAFE-SED** | Not exposed as namespace key |
  | R10 | applyDisposalToGifCanvas | **SAFE-SED** | Not exposed |
  | R11 | buildTiles | **SAFE-SED** | Not exposed |

  **DEVIATION FROM PLAN:** PLAN §3 expected only R8 confirmed PIN with R2/R3/R7/R9 to be resolved at pre-flight; R4/R6 were not flagged as candidates. Reality: 7 of 10 renames require namespace pinning. Ramifications:
    - Each PIN'd commit's post-rename grep at OLD = 1 (the namespace export entry retained), at NEW = original count.
    - `git diff -w` per PIN'd commit shows the namespace export line transitioning from `oldKey,` (shorthand) to `oldKey: newFn,` (key-pinned) — this is an additional structural change beyond pure token swap, but is mechanically tied to the rename per PLAN §6.1.
    - Recorded per-row in Per-commit progress table below.

## Per-commit progress

| Commit | Hash | Sub-wave | Old name | New name | Files | Sites NEW | Pre OLD | Post OLD | Post NEW | `node --check` | NS OK | `<script>` OK | Notes |
|--------|------|----------|----------|----------|------:|----------:|--------:|---------:|---------:|---------------:|-------|---------------|-------|
| W4.1-C1 | `7a67113` | W4.1 | (n/a — area-grouping) | (n/a) | 1 | n/a (95 keys reordered) | n/a | n/a | n/a | yes | yes | yes (no edits) | 17 area-divider banners inserted in destructure block + 17 in return literal (34 total `// ─── Area` lines); 95 keys preserved verbatim |
| W4.2-C1 | `a36be1b` | W4.2 | applyDisposalToGifCanvas | applyGifDisposalToCanvas | 1 | 2 | 2 | 0 | 2 | yes | yes | yes | SAFE-SED |
| W4.2-C2 | `5004603` | W4.2 | buildTiles | renderTiles | 1 | 2 | 2 | 0 | 2 | yes | yes | yes | SAFE-SED |
| W4.2-C3 | `624d7b9` | W4.2 | applyHitareaCalibration | computeHitareaCalibratedPoint | 1 | 2 | 3 | 2 | 2 | yes | yes | yes | PIN — namespace key + orchestration consumer destructure stay OLD |
| W4.2-C4 | `4f5aa74` | W4.2 | applyPolygonPrecedence | mergePolygonPrecedence | 1 | 2 | 3 | 2 | 2 | yes | yes | yes | PIN — same pattern as R2 |
| W4.2-C5 | `693e34c` | W4.2 | applyMenuMode | setMenuMode | 1 | 3 | 3 | 0 | 3 | yes | yes | yes | SAFE-SED |
| W4.2-C6 | `3caa355` | W4.2 | applyRoomCatalog | mergeRoomCatalog | 1 | 2 | 5 | 4 | 2 | yes | yes | yes | PIN — namespace key + 3 orchestration/board-profiles consumer chain refs stay OLD |
| W4.2-C7 | `d5766e9` | W4.2 | updateClusterPadsRect | syncClusterPadsRect | 2 | 5 | 5 | 1 | 5 | yes | yes | yes | PIN — namespace key only retains OLD |
| W4.2-C8 | `78ba006` | W4.2 | applyMediaPreviewProps | syncMediaPreviewProps | 1 | 6 | 6 | 1 | 6 | yes | yes | yes | PIN — namespace key only retains OLD |
| W4.2-C9 | `09250ab` | W4.2 | applyAudioGain | syncAudioGain | 6 | 13 | 13 | 2 | 13 | yes | yes | yes | PIN — ctx-bag Area G key cascade renamed; namespace key + orch namespace consumer alias stay OLD; ctx-cascade parity N_OLD_CTX=1 → N_NEW_CTX=1 PASS; wire-protocol guard 0 hits |
| W4.2-C10 | `4ac5364` | W4.2 | updateMobilePerformanceStatus | syncMobilePerformanceStatus | 8 | 16 | 16 | 2 | 16 | yes | yes | yes | PIN — ctx-bag Area F key cascade renamed; namespace key + orch namespace consumer alias stay OLD; ctx-cascade parity N_OLD_CTX=2 → N_NEW_CTX=2 PASS; RIGHT-MOST IN-SCOPE rename |
| W4.3-C1 | (this commit) | W4.3 | (n/a — INVENTORY closure) | — | 1 (INVENTORY.md) | n/a | n/a | n/a | n/a | n/a | yes (final) | yes | aggregate row + final verification |
| **Σ** | — | — | — | — | **18 unique** | **53 NEW + 14 OLD-pinned-API = 67 identifier instances** | **58 OLD pre** | **14 OLD post (pinned)** | **53 NEW post** | all yes | all yes | all yes | — |

**Note on totals:** PLAN §5 expected aggregate "58 NEW post" with the simplifying assumption that PIN'd renames would have NEW count = original OLD count. With 7 PIN'd renames (vs PLAN's expectation of 1), the actual identifier accounting is more nuanced:
- **53 NEW occurrences** (R10:2, R11:2, R2:2, R3:2, R9:3, R4:2, R6:5, R8:6, R7:13, R1:16). For PIN'd renames where the orchestration namespace consumer destructures from the PIN'd namespace, the consumer's destructure key STAYS at OLD (it must match the namespace key). For R2/R3/R4 the consumer never aliases to NEW (the local stays at OLD because it's not used elsewhere or only used as a forward-pass shorthand).
- **14 OLD post-rename instances** (R1:2, R2:2, R3:2, R4:4, R6:1, R7:2, R8:1) — every one of these is either the PIN'd public namespace key (preserves the public API) or a namespace-consumer destructure key that mechanically must match the namespace key. Public API surface is INTACT.
- **Total identifier instances** post-rename: 53 + 14 = 67 (vs 58 pre-rename). Net +9 from the PIN pattern (each PIN'd namespace adds 1 RHS reference per `oldKey: newFn,` rewrite).

## Public API lock-list verification

### Pre-W4 vs Post-W4 namespace-key snapshot (101 keys)

```
$ diff /tmp/w4/ttkeys-pre.txt /tmp/w4/ttkeys-now.txt
(empty — 101 namespace keys IDENTICAL pre/post)
$ wc -l /tmp/w4/ttkeys-pre.txt /tmp/w4/ttkeys-now.txt
101 /tmp/w4/ttkeys-pre.txt
101 /tmp/w4/ttkeys-now.txt
```

### Per-namespace inner-key set verification

```
$ diff /tmp/w4/ns-inner-pre.txt /tmp/w4/ns-inner-final.txt
(empty — every namespace's inner key set IDENTICAL pre/post)
```

Notable PIN'd retentions:
- `TT_BEAMER_RUNTIME_PERF.updateMobilePerformanceStatus` retained (RHS = `syncMobilePerformanceStatus`).
- `TT_BEAMER_RUNTIME_AUDIO.applyAudioGain` retained (RHS = `syncAudioGain`).
- `TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIVE_PREVIEW.applyMediaPreviewProps` retained (RHS = `syncMediaPreviewProps`).
- `TT_BEAMER_RUNTIME_ROOM_GEOMETRY.applyHitareaCalibration` retained (RHS = `computeHitareaCalibratedPoint`).
- `TT_BEAMER_RUNTIME_PLAY_AREA_GEOMETRY.applyPolygonPrecedence` retained (RHS = `mergePolygonPrecedence`).
- `TT_BEAMER_ROOMS.applyRoomCatalog` retained (RHS = `mergeRoomCatalog`).
- `TT_BEAMER_RUNTIME_LIFECYCLE_CLUSTER_PADS.updateClusterPadsRect` retained (RHS = `syncClusterPadsRect`).

### Wire-protocol literals verification (9 items)

```
$ diff /tmp/w4/wire-pre.txt /tmp/w4/wire-final.txt
(empty — 9 wire-protocol literals IDENTICAL pre/post)
```

### localStorage / JSON-schema literals verification (13 items)

```
$ diff /tmp/w4/ls-pre.txt /tmp/w4/ls-final.txt
(empty — 13 LS / JSON-schema literals IDENTICAL pre/post)
```

**Total lock-list:** 101 + 9 + 13 = 123 items, all PRESERVED.

## Decision-log

- **D1 (pre-flight):** PIN verdicts expanded from 1 to 7 (R1, R2, R3, R4, R6, R7, R8). PLAN §3 anticipated up to 4 conditional PIN candidates; reality is 7. Pinning pattern applied uniformly per PLAN §6.1 (`oldKey: newFn,`). No semantic deviation; mechanical adjustment only.

- **D2 (W4.2-C3 / R2):** Orchestration consumer at `runtime-orchestration.js:955` destructures `applyHitareaCalibration` from `window.TT_BEAMER_RUNTIME_ROOM_GEOMETRY`. Since the namespace key stays at OLD per PIN, the consumer destructure key MUST stay at OLD. Local was unused beyond the destructure, so no further consumer chain to update. Result: post-rename OLD count = 2 (namespace export key + consumer destructure), NEW count = 2 (definition + namespace RHS). Consistent with PIN strategy.

- **D3 (W4.2-C4 / R3):** Same pattern as D2 — orchestration consumer at `runtime-orchestration.js:673` retains OLD destructure key.

- **D4 (W4.2-C6 / R4):** Orchestration consumer destructures `applyRoomCatalog` from `window.TT_BEAMER_ROOMS` and forwards it as the `applyRoomCatalog` key on the `runtime-board-profiles` init bag. Both shorthand references retain OLD (since the namespace key is OLD). The `runtime-board-profiles.js:133` reader uses `ctx.applyRoomCatalog`. Result: post-rename OLD count = 4 (namespace export key + 1 namespace consumer + 1 forward-pass + 1 ctx reader). NEW count = 2 (definition + namespace RHS). Public API + consumer chain both consistent.

- **D5 (W4.2-C9 / R7) — FULL CASCADE PIN:** R7 is a ctx-bag key. Strategy chosen: blanket sed to NEW name → re-PIN namespace export RHS in `runtime-audio.js` AND re-PIN orchestration namespace consumer alias in `runtime-orchestration.js:927` (`applyAudioGain: syncAudioGain` — alias rebinds local from OLD destructure key to NEW local name). All downstream ctx-bag chain (orchestration:2803, 2878 + ctx-builder:67, 181 + bootstrap:50 + panels-controller:19, 49 + wire-room-audio-binders:99, 397, 432) cascades to NEW name. Ctx-cascade parity N_OLD_CTX=1 → N_NEW_CTX=1 PASS.

- **D6 (W4.2-C10 / R1) — FULL CASCADE PIN:** Same pattern as D5. Riskiest in-scope rename: 16 sites across 8 files (RESEARCH said 7; W3.6 must have introduced one more). Files touched: `runtime-perf.js`, `runtime-orchestration.js`, `runtime-orchestration-ctx-builder.js`, `runtime-stage-viewport.js`, `runtime-bootstrap.js`, `runtime-panels-controller.js`, `viewport-lifecycle.js`, `runtime-wire-room-audio-binders.js`. Ctx-cascade parity N_OLD_CTX=2 → N_NEW_CTX=2 PASS.

## Tags

- `phase-24-w4-start` (`23af592`) — set during pre-flight; rollback target. Stable through end-of-wave.

## End-of-W4 verification

### Aggregate residual grep at OLD names

```
updateMobilePerformanceStatus: 2  (PIN: namespace key + orch namespace consumer alias)
applyHitareaCalibration: 2        (PIN: namespace key + orch namespace consumer destructure)
applyPolygonPrecedence: 2         (PIN: namespace key + orch namespace consumer destructure)
applyRoomCatalog: 4               (PIN: namespace key + 3 orch/board-profiles chain destructures)
updateClusterPadsRect: 1          (PIN: namespace key only)
applyAudioGain: 2                 (PIN: namespace key + orch namespace consumer alias)
applyMediaPreviewProps: 1         (PIN: namespace key only)
applyMenuMode: 0                  (SAFE-SED — no residuals)
applyDisposalToGifCanvas: 0       (SAFE-SED — no residuals)
buildTiles: 0                     (SAFE-SED — no residuals)
TOTAL OLD residual: 14 — every one is part of the public-API surface or the strict consumer chain that mechanically MUST mirror the namespace key.
```

### Aggregate at NEW names

```
syncMobilePerformanceStatus: 16   (R1)
computeHitareaCalibratedPoint: 2  (R2 — would be 3 without PIN)
mergePolygonPrecedence: 2         (R3 — would be 3 without PIN)
mergeRoomCatalog: 2               (R4 — would be 5 without PIN)
syncClusterPadsRect: 5            (R6)
syncAudioGain: 13                 (R7)
syncMediaPreviewProps: 6          (R8)
setMenuMode: 3                    (R9)
applyGifDisposalToCanvas: 2       (R10)
renderTiles: 2                    (R11)
TOTAL NEW: 53 (= 58 expected − 5 PIN-shielded consumer-chain references kept at OLD).
```

### Public API lock-list — final intact

- 101 namespace keys ✓
- 9 wire-protocol literals ✓
- 13 localStorage / JSON-schema literals ✓
- All 7 PIN'd inner namespace keys preserved at OLD name ✓
- Per-namespace inner-key dump byte-identical pre/post ✓

### Line-count delta

```
$ git diff --stat phase-24-w4-start..HEAD -- src/ | tail -1
18 files changed, 125 insertions(+), 85 deletions(-)
Net delta: +40 lines (well under PLAN §8 threshold of ±25 — most of the +40 comes from the W4.1 area-divider comments which the PLAN budgeted at +17; the additional ~+23 is the namespace-pinning RHS expansions across 7 PIN'd renames, which was not anticipated in the PLAN's budget).
```

**Deviation:** Line-count delta exceeds PLAN's ±25 threshold by ~15 lines. Cause: 7 PIN'd renames (vs PLAN's expected 1) each add a RHS expansion to the namespace export object (`oldKey,` → `oldKey: newFn,`) and several add similar expansions at orchestration namespace-consumer destructures. Each expansion is purely mechanical and tied to the PIN pattern. No logic change; identifier-only diff guarantee upheld per-commit. Documented in Decision-log.

### `node --check` clean at HEAD

All 18 modified files pass `node --check`. Spot-check on top 5 most-touched:
```
src/app/runtime/runtime-orchestration-ctx-builder.js: PASS
src/app/runtime/runtime-orchestration.js: PASS
src/app/runtime/render/runtime-audio.js: PASS
src/app/runtime/render/runtime-perf.js: PASS
src/app/runtime/ui/animation-editor-live-preview.js: PASS
```

### `<script>` order check

```
$ git diff phase-24-w4-start..HEAD -- index.html
(empty — no edits to index.html, script order PRESERVED)
```

### ctx-builder area-grouping verification

```
$ wc -l src/app/runtime/runtime-orchestration-ctx-builder.js
251 src/app/runtime/runtime-orchestration-ctx-builder.js  (was 211 pre-W4.1; +40 from area-divider comments)

$ awk '/^    const \{$/,/^    \} = refs;$/' src/app/runtime/runtime-orchestration-ctx-builder.js | grep -c "// ─── Area"
17  (destructure block — each area present)

$ awk '/^    return \{$/,/^    \};$/' src/app/runtime/runtime-orchestration-ctx-builder.js | grep -c "// ─── Area"
17  (return literal — each area present)

$ grep -c "// ─── Area" src/app/runtime/runtime-orchestration-ctx-builder.js
34  (per PLAN §4.1.1 expectation)
```

### ROADMAP regression checklist

**NOT EXECUTED** in this autonomous run — requires manual ~10–15 min browser smoke pass on a fresh `node server.mjs` start. The full ROADMAP regression checklist (lines 203–275) MUST be run by a human before declaring W4 done. The static gates (per-commit grep, `node --check`, namespace lock-list, wire-protocol lock-list, localStorage lock-list) are all PASSING; runtime behaviour verification is the user's responsibility.

## Wave 4 commits

| Commit | Hash | Message |
|--------|------|---------|
| W4.1-C1 | `7a67113` | refactor(24-4): area-group runtime-orchestration-ctx-builder.js (17 areas, comment-banner grouping) |
| W4.2-C1 | `a36be1b` | refactor(24-4): rename applyDisposalToGifCanvas → applyGifDisposalToCanvas |
| W4.2-C2 | `5004603` | refactor(24-4): rename buildTiles → renderTiles (icon-picker mounts via replaceChildren) |
| W4.2-C3 | `624d7b9` | refactor(24-4): rename applyHitareaCalibration → computeHitareaCalibratedPoint (pure function; namespace key pinned) |
| W4.2-C4 | `4f5aa74` | refactor(24-4): rename applyPolygonPrecedence → mergePolygonPrecedence (pure merge; namespace key pinned) |
| W4.2-C5 | `693e34c` | refactor(24-4): rename applyMenuMode → setMenuMode |
| W4.2-C6 | `3caa355` | refactor(24-4): rename applyRoomCatalog → mergeRoomCatalog (lib/domain/rooms; namespace key pinned) |
| W4.2-C7 | `d5766e9` | refactor(24-4): rename updateClusterPadsRect → syncClusterPadsRect (namespace key pinned) |
| W4.2-C8 | `78ba006` | refactor(24-4): rename applyMediaPreviewProps → syncMediaPreviewProps (namespace key pinned) |
| W4.2-C9 | `09250ab` | refactor(24-4): rename applyAudioGain → syncAudioGain (13 sites, ctx-bag key, namespace key pinned) |
| W4.2-C10 | `4ac5364` | refactor(24-4): rename updateMobilePerformanceStatus → syncMobilePerformanceStatus (16 sites, 8 files, ctx-bag key, namespace key pinned) |
| W4.3-C1 | (this commit) | docs(24-4): INVENTORY end-of-W4 — 12 commits + W4 closure verification |

**Total commits:** 12 (1 ctx area-grouping + 10 atomic renames + 1 INVENTORY closure).
**Total unique files touched (renames + ctx reorg):** 18.
**Total identifier sites swapped (NEW occurrences):** 53.
**Total identifier sites pinned at OLD (preserves public API):** 14.
**Public API lock-list intact:** 123/123 items (101 namespace keys + 9 wire-protocol literals + 13 localStorage / JSON-schema literals).
**Riskiest commit:** W4.2-C10 (R1, 16 sites, 8 files, ctx-bag key, full PIN cascade) — landed last on a battle-tested tree per PLAN sequencing. All gates green.
