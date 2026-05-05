---
phase: 29
plan: 04
subsystem: persistence-cleanup
tags: [persistence, dead-fields, source-cleanup, wave-2, polygon-legacy, tombstones]
requires:
  - 29-W0-SUMMARY.md (test scaffolds with skip-gates)
  - 29-01-SUMMARY.md (29-AUDIT.md verdict authority §F4 + §3)
  - 29-02-SUMMARY.md (Wave 2 batch 1 — hiddenRoomNames + roomStateProfiles)
  - 29-03-SUMMARY.md (Wave 2 batch 2 — animationSoundMap)
provides:
  - "BOARD_PROFILE_FIELDS at final 11-entry LIVE-only shape"
  - "Renderers + getShipPolygonPoints continue to read state.playAreasByBoard[boardId][selectedPlayAreaId].polygon (canonical post-Phase-26 source)"
  - "runtime-polygon-undo.js undo/redo via direct board.rooms mutation (no tombstone API)"
  - "All 4 board-fields W2 dead-grep gates flipped LIVE + passing"
  - "Phase-29 W2 LIVE-only BOARD_PROFILE_FIELDS gate flipped LIVE + passing"
affects:
  - server.mjs
  - src/app/lib/domain/rooms.js
  - src/app/lib/persistence/board-profiles.js
  - src/app/lib/state/runtime-state.js
  - src/app/runtime/animation/runtime-room-management.js
  - src/app/runtime/core/polygon-contract.js
  - src/app/runtime/core/runtime-board-switch.js
  - src/app/runtime/core/runtime-bootstrap.js
  - src/app/runtime/polygon-editor/runtime-polygon-context-menu.js
  - src/app/runtime/polygon-editor/runtime-polygon-undo.js
  - src/app/runtime/runtime-orchestration-ctx-builder.js
  - src/app/runtime/runtime-orchestration.js
  - src/app/runtime/state/runtime-board-profiles.js
  - src/app/runtime/state/runtime-play-area-geometry.js
  - test/board-json-roundtrip.test.mjs
  - test/board-profile-fields.test.mjs
  - test/phase-29-dead-grep.test.mjs
tech-stack:
  added: []
  patterns:
    - "Atomic two-commit cleanup (Task 1: playAreaPolygon fallback chains; Task 2: tombstone plumbing + 3 skip-gate flips)"
    - "Pitfall 1 (Open Question A2) mitigation pattern: edit undo file FIRST and re-run suite to confirm `markRoomTombstone`/`clearRoomTombstone` calls were bookkeeping-only — then proceed with the array/state-slice drop"
    - "Cascade-pruned ctx destructures + ctx pass-throughs in orchestration after removing primary helpers (mirrors 29-02 / 29-03 pattern)"
key-files:
  created:
    - .planning/phases/phase-29/29-04-SUMMARY.md
  modified:
    - server.mjs
    - src/app/lib/domain/rooms.js
    - src/app/lib/persistence/board-profiles.js
    - src/app/lib/state/runtime-state.js
    - src/app/runtime/animation/runtime-room-management.js
    - src/app/runtime/core/polygon-contract.js
    - src/app/runtime/core/runtime-board-switch.js
    - src/app/runtime/core/runtime-bootstrap.js
    - src/app/runtime/polygon-editor/runtime-polygon-context-menu.js
    - src/app/runtime/polygon-editor/runtime-polygon-undo.js
    - src/app/runtime/runtime-orchestration-ctx-builder.js
    - src/app/runtime/runtime-orchestration.js
    - src/app/runtime/state/runtime-board-profiles.js
    - src/app/runtime/state/runtime-play-area-geometry.js
    - test/board-json-roundtrip.test.mjs
    - test/board-profile-fields.test.mjs
    - test/phase-29-dead-grep.test.mjs
decisions:
  - "Kept `runtime-canvas-clip.js` byte-unchanged. The local variable name `playAreaPolygons` (plural) inside that file is unaffected by the `\\bplayAreaPolygon\\b` (singular) grep — verified zero singular-form hits before/after. Renderers continue via canonical resolver getPlayAreaClipPolygons → getPlayAreas(boardId) → state.playAreasByBoard."
  - "Updated server.mjs:3504 doc-comment that referenced `playAreaPolygon` literally (cited as an example of profile-field synthesis). Reworded to `playAreas` so the source-wide singular-form grep returns 0 hits as required by must_haves truth."
  - "Edited runtime-polygon-context-menu.js (NOT in plan's <files> list) to remove its `clearRoomTombstone` call site at line 235. Per Rule 3 (auto-fix blocking issue): leaving it would have crashed because the helper is being deleted in this same task. The plan's audit trace at 29-AUDIT.md §3 explicitly mentions the call site, so this is a known scope item the plan's <files> array missed."
  - "Auto-fixed stale test in test/board-json-roundtrip.test.mjs (Rule 1 — bug). The Phase 28 test sanity-checked `deletedRoomIds` was still in BOARD_PROFILE_FIELDS, which became false-positive once 29-04 legitimately removed the field. Updated the test to drop those assertions and removed `deletedRoomIds` from the 4 synthetic board fixtures inside it. The test now asserts the post-29-04 shape is preserved across server iterator + on-disk JSON round-trip."
metrics:
  duration: ~7 min (autonomous)
  completed: 2026-05-05
---

# Phase 29 Plan 04: Drop playAreaPolygon + deletedRoomIds Summary

Wave 2 batch 3 (closing) — atomically removed the two remaining REDUNDANT
board fields per 29-AUDIT.md §F4 (`playAreaPolygon`) and §3 (`deletedRoomIds`
undo trace). After this commit `BOARD_PROFILE_FIELDS` is at its target
11-entry LIVE-only shape, and the `Phase-29 W2: BOARD_PROFILE_FIELDS contains
only LIVE fields` gate (in `test/board-profile-fields.test.mjs`) plus both
remaining dead-grep skip gates (in `test/phase-29-dead-grep.test.mjs`) are
flipped LIVE + passing. Wave 2 source-tree cleanup is COMPLETE; Wave 3
(29-05) handles the on-disk strip via `purgeDeadFieldsOnBoot`.

## Tasks Executed

### Task 1 — Drop `playAreaPolygon` legacy fallback chains + synthesis writes (commit 8795f6b)

Per 29-AUDIT.md §F4: `playAreaPolygon` is a single-polygon legacy field
(pre-Phase-8 / pre-Phase-10-HF8 era). The authoritative source post-
Phase-26 is `state.playAreasByBoard[boardId][selectedPlayAreaId].polygon`
read via `getSelectedPlayArea()?.polygon` and the renderer-side
`getPlayAreaClipPolygons` helper. The legacy field is never resolved-to
(canonical path is always populated) but was still synthesized into every
board profile on save — pure on-disk duplication.

| Layer | File | Removed |
|-------|------|---------|
| Synthesis | `src/app/runtime/state/runtime-board-profiles.js` | `playAreaPolygon` write in `createDefaultBoardProfiles` (line 41) + `buildBoardProfilesFromState` (line 66); `playAreaPolygon` operand in `applyBoardProfilesToState` fallback chain (line 225) |
| Merge / contract | `src/app/runtime/state/runtime-play-area-geometry.js` | 2 operands in `mergeBoardProfilesForGlobalExport`'s `mergedPlayAreas` chain; the `playAreaPolygon: …` output field in the merged-board literal (was duplicating selected playArea polygon); the 2 `selectedPlayArea` local + `playAreaPolygon` field from `resolveProfilePolygonContract`; 6 fallback operands from `candidateFallbackPolygon` |
| Polygon contract | `src/app/runtime/core/polygon-contract.js` | 6 fallback operands in `resolveProfilePolygonContract`'s `candidateFallbackPolygon`; 1 operand in `applySnapshotPolygonState`'s `fallbackPolygon` |
| Persistence migration | `src/app/lib/persistence/board-profiles.js` | `playAreaPolygon` from candidate-shape detection (line 49); 4 operands in legacy migration chain (lines 84, 91, 93); the `playAreaPolygon: legacyPolygon` output in migrated-profile literal (line 120) |
| Server | `server.mjs` | `"playAreaPolygon"` from `BOARD_PROFILE_FIELDS` (line 44) — count drops 14 → 13; reword unrelated doc-comment at line 3504 (was `…hitareaCalibration, playAreaPolygon, etc.…` → `…hitareaCalibration, playAreas, etc.…`) so source-wide grep returns 0 |

Net for Task 1: `5 files changed, 5 insertions(+), 32 deletions(-)`.
Suite still green: 32 pass / 0 fail / 12 skipped (no count change yet —
gates flipped in Task 2).

### Task 2 — Drop `deletedRoomIds` / tombstone plumbing + flip 3 W2 skip gates (commit 082cbc6)

Per 29-AUDIT.md §3: `runtime-polygon-undo.js` uses `board.rooms` direct
mutation as the actual undo mechanism (lines 48-67). The
`markRoomTombstone`/`clearRoomTombstone` calls were bookkeeping into
`state.roomTombstonesByBoard` — a slice that has zero downstream read
consumers per 29-RESEARCH §F5. Removing the calls + the slice + the
helpers is therefore lossless.

**Step 2.1 (Pitfall 1 mitigation) was executed FIRST**: edit
`runtime-polygon-undo.js` to remove the two tombstone calls, then run the
full suite. Confirmed 32 pass / 0 fail. THIS verified the audit's verdict
that undo did not depend on tombstone state, before proceeding to delete
the helpers themselves.

| Layer | File | Removed |
|-------|------|---------|
| Undo (Step 2.1 — first) | `src/app/runtime/polygon-editor/runtime-polygon-undo.js` | `ctx.clearRoomTombstone(state.boardId, snap.id)` (line 66); `ctx.markRoomTombstone(state.boardId, id)` block (lines 75-79) — replaced with explanatory comment |
| Room management | `src/app/runtime/animation/runtime-room-management.js` | `clearRoomTombstone` calls in `pasteRoomFromClipboard` (line 396) + `createRoomFromSettings` (line 552); `markRoomTombstone` call in `deleteSelectedRoom` (line 615) |
| Polygon context-menu | `src/app/runtime/polygon-editor/runtime-polygon-context-menu.js` | `clearRoomTombstone` call in right-click create (line 235) — NOT in plan's `<files>` but a known call site per 29-AUDIT.md §3; auto-fixed per Rule 3 |
| Helpers | `src/app/runtime/state/runtime-play-area-geometry.js` | `normalizeRoomTombstoneIds`, `createDefaultRoomTombstonesByBoard`, `markRoomTombstone`, `clearRoomTombstone`, `filterRoomCatalogByDeletedIds` (5 functions deleted); 3 entries from window export bag; `deletedRoomIds` synthesis from `mergeBoardProfilesForGlobalExport` (replaced 8-line tombstone block with 4-line direct catalog assign) |
| State slice | `src/app/lib/state/runtime-state.js` | `roomTombstonesByBoard: {}` slice |
| Bootstrap | `src/app/runtime/core/runtime-bootstrap.js` | `state.roomTombstonesByBoard = ctx.createDefaultRoomTombstonesByBoard()` line |
| Apply path | `src/app/runtime/state/runtime-board-profiles.js` | `deletedRoomIds: []` from `createDefaultBoardProfiles` literal; `deletedRoomIds: ctx.normalizeRoomTombstoneIds(…)` from `buildBoardProfilesFromState`; the entire 14-line apply block in `applyBoardProfilesToState` (deletedRoomIds resolve + `state.roomTombstonesByBoard = Object.fromEntries(…)` hydration); simplified `ctx.applyRoomCatalog(board, roomCatalog)` call |
| Board switch | `src/app/runtime/core/runtime-board-switch.js` | The 4-line tombstone-hydration tail of `ensureBoardRoomStateMaps` |
| Domain | `src/app/lib/domain/rooms.js` | `mergeRoomCatalog(board, roomCatalog, deletedRoomIds)` → `mergeRoomCatalog(board, roomCatalog)`; deleted internal `tombstones` Set + `baseRooms` filter + `filteredCatalog` filter — body now passes catalog through unfiltered |
| Persistence | `src/app/lib/persistence/board-profiles.js` | `deletedRoomIds: profile.deletedRoomIds ?? profile.roomTombstones ?? []` from migrated-profile literal (line 106) |
| Orchestration | `src/app/runtime/runtime-orchestration.js` | 4 imports (`normalizeRoomTombstoneIds`, `createDefaultRoomTombstonesByBoard`, `markRoomTombstone`, `clearRoomTombstone`, `filterRoomCatalogByDeletedIds`) from runtime-play-area-geometry destructure; the second `normalizeRoomTombstoneIds` import in `RUNTIME_BOARD_PROFILES.init`; the `normalizeRoomTombstoneIds:` ctx pass-through in `RUNTIME_ROOM_MANAGEMENT.init` (`syncSelectedRoomStateForBoard` ctx); the 4 `clearRoomTombstone:`/`markRoomTombstone:` ctx pass-throughs in `RUNTIME_ROOM_MANAGEMENT.init`, `RUNTIME_POLYGON_CONTEXT_MENU.init`, and `RUNTIME_POLYGON_UNDO.init`; the 1 `createDefaultRoomTombstonesByBoard` destructure in `RUNTIME_BOOTSTRAP.init` ctx-builder destructure |
| Ctx builder | `src/app/runtime/runtime-orchestration-ctx-builder.js` | `createDefaultRoomTombstonesByBoard` destructure + factory entry |
| Server | `server.mjs` | `"deletedRoomIds"` from `BOARD_PROFILE_FIELDS` (line 40) — count 13 → **11 (final)** |

Test gates flipped (3):

| Test | File | Skip-gate removed |
|------|------|-------------------|
| W2 playAreaPolygon | `test/phase-29-dead-grep.test.mjs` | `{ skip: "Wave 2 (29-04) not landed yet" }` |
| W2 deletedRoomIds | `test/phase-29-dead-grep.test.mjs` | `{ skip: "Wave 2 (29-04) gated on audit verdict" }` |
| Phase-29 W2 LIVE-only fields | `test/board-profile-fields.test.mjs` | `{ skip: "Wave 2 (29-02..29-04) not landed yet" }` |

Net for Task 2: `16 files changed, 20 insertions(+), 143 deletions(-)`.

## Combined Diff Summary (8795f6b + 082cbc6)

```
 server.mjs                                         |   4 +-
 src/app/lib/domain/rooms.js                        |  14 +--
 src/app/lib/persistence/board-profiles.js          |   6 --
 src/app/lib/state/runtime-state.js                 |   1 -
 src/app/runtime/animation/runtime-room-management.js |   3 -
 src/app/runtime/core/polygon-contract.js           |   9 +-
 src/app/runtime/core/runtime-board-switch.js       |   5 --
 src/app/runtime/core/runtime-bootstrap.js          |   1 -
 src/app/runtime/polygon-editor/runtime-polygon-context-menu.js |   1 -
 src/app/runtime/polygon-editor/runtime-polygon-undo.js |   9 +-
 src/app/runtime/runtime-orchestration-ctx-builder.js |   2 -
 src/app/runtime/runtime-orchestration.js           |  13 ---
 src/app/runtime/state/runtime-board-profiles.js    |  21 +----
 src/app/runtime/state/runtime-play-area-geometry.js|  96 ++-------------------
 test/board-json-roundtrip.test.mjs                 |  11 ++-
 test/board-profile-fields.test.mjs                 | (skip-gate removal only)
 test/phase-29-dead-grep.test.mjs                   |   4 +-
 17 files changed, 25 insertions(+), 175 deletions(-)
```

Net: **−150 lines** removed across 17 files (Task 1 + Task 2 combined).
Pure dead-code purge. Authoritative play-area + room-mutation paths
unchanged.

## Final BOARD_PROFILE_FIELDS Shape (verbatim from server.mjs)

```javascript
const BOARD_PROFILE_FIELDS = Object.freeze([
  "hitareaCalibration",
  "roomGeometry",
  "specialPolygons",
  "playAreas",
  "selectedPlayAreaId",
  "outsideFx",
  "insideFx",
  "roomFx",
  "defaultAnimations",
  "frozenRooms",
  // Phase 28 B1 (D-02): per-board memory of the last-loaded/saved
  // projection profile. Read+written via the existing extract/persist
  // iterators below — no other server.mjs change is required.
  "lastUsedProfileName",
]);
```

Exactly 11 LIVE entries, matching the target shape and the
`Phase-29 W2: BOARD_PROFILE_FIELDS contains only LIVE fields` test
expectation set in `board-profile-fields.test.mjs:136-148`.

## Undo Flow Preservation (runtime-polygon-undo.js)

The undo flow operates on `board.rooms` directly:

- Line 45 (post-cleanup): `const currentRoomMap = new Map(board.rooms.map((r) => [r.id, r]));`
- Line 46: `const restoredIds = new Set(roomStates.map((r) => r.id));`
- Line 48: `board.rooms = board.rooms.filter((r) => restoredIds.has(r.id));` — filters to ONLY restored IDs
- Lines 50-67: per restored snapshot, push back missing rooms into `board.rooms`
- Lines 69-71: replacement explanatory comment for the deleted tombstone-mark loop (rooms-not-in-restoredIds were already filtered out at line 48; no further bookkeeping needed)
- Line 73 onward (Play Area polygons restore — UNCHANGED by this plan)

The room-catalog mutation IS the undo mechanism. The deleted
`markRoomTombstone`/`clearRoomTombstone` calls were no-ops affecting only
the never-read `state.roomTombstonesByBoard` slice (29-AUDIT.md §3
verdict).

## Test Suite Counts

```
Before plan:  ℹ tests 44   pass 32   fail 0   skipped 12
After plan:   ℹ tests 44   pass 35   fail 0   skipped 9
```

Net: **+3 pass, −3 skipped, 0 fail** — all 3 W2 skip gates targeted by
this plan flipped from skip → pass. No regressions.

## Acceptance Criteria

- [x] `grep -rn '\bplayAreaPolygon\b' src/ server.mjs` returns 0 hits
- [x] `grep -rn '\bdeletedRoomIds\b\|\broomTombstones?\b\|markRoomTombstone\|clearRoomTombstone\|filterRoomCatalogByDeletedIds' src/ server.mjs` returns 0 hits
- [x] BOARD_PROFILE_FIELDS contains exactly 11 entries (verified via `awk … | grep -c`)
- [x] All 11 LIVE fields preserved (hitareaCalibration, roomGeometry, specialPolygons, playAreas, selectedPlayAreaId, outsideFx, insideFx, roomFx, defaultAnimations, frozenRooms, lastUsedProfileName)
- [x] Phase 28 B1 `lastUsedProfileName` still in BOARD_PROFILE_FIELDS
- [x] Phase 28 B5 asset-manifest pathway untouched (`config/asset-manifest.json` byte-unchanged via `git diff`)
- [x] `runtime-canvas-clip.js` byte-unchanged (`git diff` empty)
- [x] `getShipPolygonPoints` continues to read `getSelectedPlayArea(boardId)?.polygon`
- [x] `runtime-polygon-undo.js` undo flow preserved — the `board.rooms` filter+push at lines 45-67 is intact
- [x] `node --test test/` exits 0 with `fail 0` (44 tests / 35 pass / 9 skip)
- [x] Both `playAreaPolygon` and `deletedRoomIds` tests in `phase-29-dead-grep.test.mjs` un-skipped + passing
- [x] `Phase-29 W2: BOARD_PROFILE_FIELDS contains only LIVE fields` test in `board-profile-fields.test.mjs` un-skipped + passing
- [x] `config/boards/*.json` byte-unchanged on disk (Wave 3 / 29-05's job)

## Verification (post-plan)

```
$ grep -rn '\bplayAreaPolygon\b\|\bdeletedRoomIds\b\|\broomTombstones?\b\|markRoomTombstone\|clearRoomTombstone\|filterRoomCatalogByDeletedIds' src/ server.mjs
(0 hits — wave-2 source cleanup complete)

$ awk '/BOARD_PROFILE_FIELDS = Object\.freeze/,/\]\);/' server.mjs | grep -c '^\s*"'
11

$ git diff --stat config/boards/ config/asset-manifest.json config/global-defaults.json
(empty — disk untouched)

$ git diff src/app/runtime/render/runtime-canvas-clip.js
(empty — renderer byte-unchanged)

$ node --test 'test/**/*.test.mjs' 2>&1 | tail -8
ℹ tests 44
ℹ pass 35
ℹ fail 0
ℹ skipped 9
ℹ duration_ms 94.6
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] runtime-polygon-context-menu.js had a `clearRoomTombstone` call site not in plan's `<files>` array**

- **Found during:** Task 2, Step 2.2 verification (`grep -n "Tombstone" src/app/runtime/polygon-editor/`)
- **Issue:** Line 235 of `runtime-polygon-context-menu.js` calls `ctx.clearRoomTombstone(state.boardId, id)`. The plan's `<files>` array did not list this file, but the audit trace at 29-AUDIT.md §3 line 330 explicitly named it as a call site to delete. Leaving it would have crashed because the helper itself was being deleted in Step 2.5.
- **Fix:** Added 1-line removal of the `clearRoomTombstone` call. Net effect: trivial, identical to the parallel patches in `runtime-room-management.js`.
- **Files modified:** `src/app/runtime/polygon-editor/runtime-polygon-context-menu.js` (1-line delete)
- **Commit:** 082cbc6 (folded into Task 2's atomic commit)

**2. [Rule 1 — Bug] test/board-json-roundtrip.test.mjs sanity-checked `deletedRoomIds` was still in BOARD_PROFILE_FIELDS**

- **Found during:** Task 2, post-Step-2.13 suite run
- **Issue:** The Phase 28 round-trip test asserted `fields.includes("deletedRoomIds")` as a "no accidental removal" sanity check. After 29-04 legitimately removes `deletedRoomIds` from `BOARD_PROFILE_FIELDS`, that assertion fires false-positive on a deliberate removal — the test fails with "deletedRoomIds must remain in BOARD_PROFILE_FIELDS". The check was meant to guard against an *accidental* removal, but Phase 29 is the *deliberate* removal authorized by 29-AUDIT.md §3.
- **Fix:** Dropped the stale `deletedRoomIds` assertion + removed `deletedRoomIds: []` from the 4 synthetic board fixtures inside the test. The test still asserts `playAreas` (a LIVE field) is preserved, plus the full `lastUsedProfileName` round-trip behavior the test was originally written for. Reworded the comment to acknowledge the 29-04 removal explicitly.
- **Files modified:** `test/board-json-roundtrip.test.mjs` (~10 lines reworked)
- **Commit:** 082cbc6 (folded into Task 2's atomic commit)

**3. [Plan-discretionary cleanup] Cascade-pruned ~12 orphaned ctx destructures + ctx pass-throughs**

- **Found during:** Task 2, Steps 2.5-2.11
- **Issue:** Mirrors the 29-02 / 29-03 pattern: removing the 5 primary helper functions (`normalizeRoomTombstoneIds`, `createDefaultRoomTombstonesByBoard`, `markRoomTombstone`, `clearRoomTombstone`, `filterRoomCatalogByDeletedIds`) from `runtime-play-area-geometry.js` leaves their ctx-builder destructures (in `runtime-orchestration-ctx-builder.js`), runtime-orchestration import destructures, and ctx pass-through entries (in 5 separate `RUNTIME_*.init({…})` invocation bags) orphaned. Leaving them would have left dead-plumbing for future audits to catch.
- **Fix:** Pruned every orphaned destructure + factory entry + ctx pass-through in the same atomic commit as the helper removals. Verified by running the full suite after Task 2 was assembled.
- **Files affected:** `runtime-orchestration.js`, `runtime-orchestration-ctx-builder.js`
- **Commit:** 082cbc6

## Authentication Gates

None — fully autonomous execution.

## Threat Flags

None — pure dead-code removal at trust boundaries that were already
plumbing-only. The undo path's threat surface narrowed (one fewer state-
slice read; one fewer mutation site) but no new network endpoints, file
access patterns, or schema surfaces were introduced. The cleanup
preserves the existing single-tenant local-app threat model.

## Wave 2 Closure Marker

**Wave 2 source-tree cleanup is COMPLETE.** All four DEAD/REDUNDANT
board fields (`hiddenRoomNames` / `roomStateProfiles` / `playAreaPolygon`
/ `deletedRoomIds`) and the global-defaults `animationSoundMap` plumbing
are removed from `src/`. `BOARD_PROFILE_FIELDS` is at its final 11-entry
LIVE-only shape.

The disk-side fields STILL EXIST in `config/boards/<id>.json` and
`config/global-defaults.json`. **Wave 3 (29-05)** runs the
`purgeDeadFieldsOnBoot` migration that:
1. Performs the lossless `animationSoundMap` migration (D-03) — copies
   non-empty map entries' `soundPath` into matching animation defs'
   `soundAssetRef` slots BEFORE the disk strip.
2. Strips the 4 DEAD/REDUNDANT keys from each board JSON.
3. Strips `animationSoundMap` from global-defaults.

Wave 4 (29-06) bumps `BOARD_PACKAGE_SCHEMA` v3 → v4 to reflect the new
schema.

## Self-Check: PASSED

- File `.planning/phases/phase-29/29-04-SUMMARY.md`: written by this Write call.
- Commit `8795f6b` (Task 1 — playAreaPolygon): present in `git log` (verified via `git log --oneline -5`).
- Commit `082cbc6` (Task 2 — deletedRoomIds + tombstones): present in `git log`.
- `grep -rn '\bplayAreaPolygon\b\|\bdeletedRoomIds\b\|\broomTombstones?\b\|markRoomTombstone\|clearRoomTombstone\|filterRoomCatalogByDeletedIds' src/ server.mjs`: 0 hits.
- BOARD_PROFILE_FIELDS count: exactly 11 (verified via `awk … | grep -c`).
- Test suite: `fail 0`, `pass 35`, `skipped 9`.
- `config/boards/*.json` + `config/asset-manifest.json` + `config/global-defaults.json`: all byte-unchanged (`git diff --stat` empty).
- `runtime-canvas-clip.js`: byte-unchanged.
- `runtime-polygon-undo.js`: undo flow's `board.rooms` filter (line 48) + push-back loop (lines 50-67) intact.

---

*Phase: 29-persistence-audit-legacy-cleanup, Wave 2 batch 3 (closing).*
