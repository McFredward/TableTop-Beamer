---
phase: 29
plan: 02
subsystem: persistence-cleanup
tags: [persistence, dead-fields, source-cleanup, wave-2]
requires:
  - 29-W0-SUMMARY.md (test scaffolds with skip-gates)
  - 29-01-SUMMARY.md (29-AUDIT.md verdict authority §F1, §F2)
provides:
  - "BOARD_PROFILE_FIELDS shrunk from 15 → 13 entries (hiddenRoomNames + roomStateProfiles dropped)"
  - "runtime-state.js without state.roomStateProfilesByBoard slice"
  - "runtime-board-state-accessors.js without RoomStateProfile accessor surface"
  - "runtime-board-switch.js ensureBoardRoomStateMaps no longer touches state-profile map"
  - "Two phase-29-dead-grep tests now LIVE (hiddenRoomNames + roomStateProfiles)"
affects:
  - server.mjs
  - src/app/lib/state/runtime-state.js
  - src/app/lib/shared/config.js
  - src/app/lib/persistence/board-profiles.js
  - src/app/runtime/core/runtime-bootstrap.js
  - src/app/runtime/core/runtime-board-switch.js
  - src/app/runtime/animation/runtime-room-management.js
  - src/app/runtime/state/runtime-board-profiles.js
  - src/app/runtime/state/runtime-board-state-accessors.js
  - src/app/runtime/runtime-orchestration.js
  - src/app/runtime/runtime-orchestration-ctx-builder.js
  - test/phase-29-dead-grep.test.mjs
tech-stack:
  added: []
  patterns:
    - "Atomic dead-field plumbing removal across server constant + runtime state slice + accessors + ctx-builder + apply path + delete-on-room-delete + legacy persistence reads"
key-files:
  created: []
  modified:
    - server.mjs
    - src/app/lib/state/runtime-state.js
    - src/app/lib/shared/config.js
    - src/app/lib/persistence/board-profiles.js
    - src/app/runtime/core/runtime-bootstrap.js
    - src/app/runtime/core/runtime-board-switch.js
    - src/app/runtime/animation/runtime-room-management.js
    - src/app/runtime/state/runtime-board-profiles.js
    - src/app/runtime/state/runtime-board-state-accessors.js
    - src/app/runtime/runtime-orchestration.js
    - src/app/runtime/runtime-orchestration-ctx-builder.js
    - test/phase-29-dead-grep.test.mjs
decisions:
  - "Dropped ROOM_STATE_DEFAULT constant from src/app/lib/shared/config.js as Step 2.7 — orphaned after accessor strip; verified 0 remaining consumers"
  - "Pitfall 1 (29-AUDIT §F2 risk note) honored — runtime-polygon-undo.js byte-unchanged; undo flow uses tombstone IDs, never reads roomStateProfilesByBoard"
  - "buildMigratedBoardProfiles in lib/persistence/board-profiles.js: removed roomStateProfiles param + record field but kept the function (Pitfall 4 — applyGlobalDefaultsPayloadToState still calls it)"
metrics:
  duration: ~10 min (autonomous)
  completed: 2026-05-05
---

# Phase 29 Plan 02: Drop hiddenRoomNames + roomStateProfiles Plumbing Summary

Wave 2 cleanup batch 1 — atomically removed two zero-consumer DEAD fields
(`hiddenRoomNames` and `roomStateProfiles`) from the source tree per
29-AUDIT.md §5 verdict authority. BOARD_PROFILE_FIELDS shrank from 15 → 13
entries; two `phase-29-dead-grep.test.mjs` skip gates now live and
asserting; suite green (31 pass / 13 skip / 0 fail; was 29 pass / 15 skip).

## Tasks Executed

### Task 1 — Drop `hiddenRoomNames` (commit 72cc5fe)

`hiddenRoomNames` had **zero src/ consumers** per 29-AUDIT.md §F1 — the
only mention was the `BOARD_PROFILE_FIELDS` literal entry. Pure
config-list-only deletion.

- Removed `"hiddenRoomNames",` from `BOARD_PROFILE_FIELDS` in `server.mjs`.
- Un-skipped the dead-grep test `W2: hiddenRoomNames has zero src/ hits`;
  assertion now LIVE and passing.

### Task 2 — Drop `roomStateProfiles` plumbing chain (commit 5438a11)

Per 29-AUDIT.md §F2: plumbing-only field with state slice + 6
helpers/accessors + ctx-builder re-exports + apply/synth/hydrate/delete
paths but **zero render or UI consumers**. Removed the entire chain in a
single atomic commit:

| Layer | File | Removed |
|-------|------|---------|
| Server constant | `server.mjs` | `"roomStateProfiles"` BOARD_PROFILE_FIELDS entry |
| Initial state | `src/app/lib/state/runtime-state.js` | `roomStateProfilesByBoard: {}` slice |
| Bootstrap | `src/app/runtime/core/runtime-bootstrap.js` | `state.roomStateProfilesByBoard = ctx.createDefaultRoomStateProfilesByBoard()` |
| Accessors | `src/app/runtime/state/runtime-board-state-accessors.js` | `normalizeRoomStateProfile`, `createDefaultRoomStateProfileMap`, `createDefaultRoomStateProfilesByBoard`, `normalizeRoomStateProfileMap`, `getRoomStateProfile`, `setRoomStateProfile` (defs + window exports) |
| Synth + apply | `src/app/runtime/state/runtime-board-profiles.js` | 3 sites — default builder, buildBoardProfilesFromState entry, applyBoardProfilesToState slice hydration; also dropped the `createDefaultRoomStateProfileMap` ctx pass-through |
| Delete-on-delete | `src/app/runtime/animation/runtime-room-management.js` | `delete state.roomStateProfilesByBoard[state.boardId][room.id]` |
| Board-switch hydration | `src/app/runtime/core/runtime-board-switch.js` | `ensureBoardRoomStateMaps` state-map block (state-profile fallback writes) |
| Ctx-builder | `src/app/runtime/runtime-orchestration-ctx-builder.js` | `createDefaultRoomStateProfilesByBoard` destructure + factory entry |
| Orchestration | `src/app/runtime/runtime-orchestration.js` | 6 ctx re-exports + 2 init pass-throughs + 1 import (ROOM_STATE_DEFAULT cascade) |
| Legacy persistence | `src/app/lib/persistence/board-profiles.js` | 2 candidate-shape reads + migrated-record entry + buildMigratedBoardProfiles param |
| Constants | `src/app/lib/shared/config.js` | `ROOM_STATE_DEFAULT` declaration + export (orphaned after accessor strip — Step 2.7) |
| Test | `test/phase-29-dead-grep.test.mjs` | `roomStateProfiles` skip gate (now LIVE) |

## Diff Summary

```
 server.mjs                                         |  2 -
 src/app/lib/persistence/board-profiles.js          |  6 ---
 src/app/lib/shared/config.js                       |  8 ----
 src/app/lib/state/runtime-state.js                 |  1 -
 src/app/runtime/animation/runtime-room-management.js |  3 --
 src/app/runtime/core/runtime-board-switch.js       |  7 +--
 src/app/runtime/core/runtime-bootstrap.js          |  1 -
 src/app/runtime/runtime-orchestration-ctx-builder.js |  2 -
 src/app/runtime/runtime-orchestration.js           | 13 ------
 src/app/runtime/state/runtime-board-profiles.js    |  9 ----
 src/app/runtime/state/runtime-board-state-accessors.js | 54 ++------------------
 test/phase-29-dead-grep.test.mjs                   |  4 +-
 12 files changed, 6 insertions(+), 104 deletions(-)
```

Net: **-98 lines** removed; pure source-side dead-code purge with no
behavioural surface change (no LIVE consumers existed).

## Test Suite Counts

```
Before plan:  ℹ tests 44   pass 29   fail 0   skipped 15
After plan:   ℹ tests 44   pass 31   fail 0   skipped 13
```

Net: **+2 pass, -2 skipped, 0 fail** — exactly the two un-skipped W2
dead-grep tests flipping from skip → pass, no regressions.

## Acceptance Criteria

- [x] `grep -c '"hiddenRoomNames"' server.mjs` → 0
- [x] `grep -rn "\bhiddenRoomNames\b" src/ server.mjs` → 0 hits
- [x] `grep -c '"roomStateProfiles"' server.mjs` → 0
- [x] `grep -rn "\broomStateProfiles?\b\|RoomStateProfile" src/ server.mjs` → 0 hits
- [x] `grep -c '"lastUsedProfileName"' server.mjs` → 1 (Phase 28 B1 preserved)
- [x] BOARD_PROFILE_FIELDS array length: **13** (down from 15; verified by `awk` grep — see Verification below)
- [x] `git diff src/app/runtime/polygon-editor/runtime-polygon-undo.js` → empty (Pitfall 1 honored)
- [x] `node --test 'test/**/*.test.mjs'` → fail 0
- [x] Two phase-29-dead-grep skip gates removed; both assertions now LIVE and passing
- [x] `phase-29 W2` skip gate in `board-profile-fields.test.mjs` STAYS skipped (un-skips after 29-04 lands)

## Verification (post-plan)

```
$ grep -rn "\bhiddenRoomNames\b\|\broomStateProfiles?\b\|RoomStateProfile" src/ server.mjs | grep -v test/
(0 hits)

$ git diff --stat HEAD~2..HEAD -- src/app/runtime/polygon-editor/runtime-polygon-undo.js
(empty — undo file byte-unchanged; Pitfall 1 honored)

$ awk '/BOARD_PROFILE_FIELDS = Object.freeze/,/\]\);/' server.mjs | grep -c '^\s*"'
13
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed orphaned ROOM_STATE_DEFAULT constant**
- **Found during:** Task 2, Step 2.7 (planner-anticipated check)
- **Issue:** After dropping the accessor surface (Step 2.2), `ROOM_STATE_DEFAULT`
  in `src/app/lib/shared/config.js` had zero remaining src consumers — it was
  also imported in `runtime-orchestration.js` and passed via `ctx` to two modules
  (`runtime-board-state-accessors`, `runtime-board-switch`) that no longer used it.
  Leaving the orphaned constant + import + 2 ctx pass-throughs would have left
  dead code that future audits would catch.
- **Fix:** Dropped `ROOM_STATE_DEFAULT` declaration + export from `config.js`,
  the import in `runtime-orchestration.js`, and both ctx pass-throughs.
- **Files modified:** `src/app/lib/shared/config.js`,
  `src/app/runtime/runtime-orchestration.js`
- **Commit:** 5438a11 (folded into Task 2's atomic commit per Step 2.7 plan
  guidance)

**2. [Plan-discretionary cleanup] Updated stale module header comments**
- **Found during:** Task 2 implementation — after stripping the
  RoomStateProfile accessor surface, the file-header docstrings in
  `runtime-board-state-accessors.js` and `runtime-board-switch.js` referenced
  "room state profiles" / "state profile entries" as part of the module's
  responsibilities.
- **Fix:** Trimmed those docstring lines to match the post-cleanup module
  surface. Pure documentation hygiene.
- **Files modified:** `src/app/runtime/state/runtime-board-state-accessors.js`,
  `src/app/runtime/core/runtime-board-switch.js`
- **Commit:** 5438a11

## Authentication Gates

None — fully autonomous execution.

## Threat Flags

None — pure dead-code removal at trust boundaries that already iterated the
shrunk `BOARD_PROFILE_FIELDS` constant. No new network, file, or schema
surface introduced.

## Self-Check: PASSED

- File `.planning/phases/phase-29/29-02-SUMMARY.md`: written by this Write call.
- Commit `72cc5fe` (Task 1 — hiddenRoomNames): present in `git log`.
- Commit `5438a11` (Task 2 — roomStateProfiles): present in `git log`.
- `grep -rn "hiddenRoomNames\|roomStateProfiles" src/ server.mjs`: 0 hits.
- Test suite: `fail 0`, `pass 31`, `skipped 13`.
- `runtime-polygon-undo.js`: byte-unchanged across both commits (Pitfall 1).
- BOARD_PROFILE_FIELDS entry count: 13 (verified by awk).

---

*Phase: 29-persistence-audit-legacy-cleanup, Wave 2 batch 1.*
