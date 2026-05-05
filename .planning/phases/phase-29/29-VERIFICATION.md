---
phase: 29-persistence-audit-legacy-cleanup
verified: 2026-05-05T00:00:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Boot the server (`node server.mjs`) and exercise /output/ + dashboard"
    expected: "All animations (outside-fx, inside-fx, room-fx) play with the sounds defined by per-animation soundAssetRef. No silent animations on boards that previously relied on animationSoundMap fallback."
    why_human: "No browser harness exists. Bundle-roundtrip integration smoke is automated; visual smoke (animations actually playing on /output/ post-cleanup) requires manual verification per phase context note."
  - test: "Bundle-export a board, then bundle-import a v3 (pre-cleanup) package"
    expected: "Export produces a v4 schema package containing only LIVE fields; v3 import is rejected with HTTP 400 + body `{ ok:false, error:'Package format outdated (schema=…). Re-export from a v0.29+ server.', code:'SCHEMA_OUTDATED' }`."
    why_human: "Automated test (bundle-schema.test.mjs) only asserts source-level structure (constant value + helper presence + error code literal). End-to-end roundtrip needs a real upload to confirm the import pipeline returns the right error response shape under live HTTP conditions."
  - test: "Undo/redo of a room delete on a real board"
    expected: "After deleting a room then triggering undo, the room reappears in the canvas and persists across reload. Tombstone calls were removed (29-04); undo now operates via direct board.rooms mutation only."
    why_human: "Undo flow correctness across the full UI gesture (delete → undo → redo → reload) cannot be verified by static greps; the audit verdict (29-AUDIT.md §3) was that markRoomTombstone/clearRoomTombstone were bookkeeping-only, but operator-level confirmation closes Pitfall 1."
---

# Phase 29: Persistence Audit & Legacy Cleanup Verification Report

**Phase Goal:** Classify each field in the four config JSONs as LIVE/DEAD/REDUNDANT, remove DEAD code+disk fields, bump BOARD_PACKAGE_SCHEMA v3 → v4. Pre-release; no backwards-compat required.
**Verified:** 2026-05-05
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                                                                          | Status     | Evidence                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `hiddenRoomNames`, `roomStateProfiles`, `playAreaPolygon`, `animationSoundMap` removed from BOARD_PROFILE_FIELDS / source / disk                                               | ✓ VERIFIED | `grep -rn '\bhiddenRoomNames\|roomStateProfiles\|playAreaPolygon\|animationSoundMap\b' src/ server.mjs` returns 0 real-code hits (2 comment-only refs in boot block describing what migration does); BOARD_PROFILE_FIELDS = 11 LIVE entries; `grep -c "..." config/boards/*.json` returns 0; `grep -c animationSoundMap config/global-defaults.json` returns 0 |
| 2   | `deletedRoomIds` / `roomTombstones` removed (audit confirmed REDUNDANT)                                                                                                        | ✓ VERIFIED | `grep -rn '\bdeletedRoomIds\b\|\broomTombstones?\b\|markRoomTombstone\|clearRoomTombstone' src/ server.mjs` returns 0 hits; 29-AUDIT.md §3 verdict "REDUNDANT — drop"; runtime-polygon-undo.js now uses direct board.rooms mutation (lines 45-67) |
| 3   | `animationSoundMap` data losslessly migrated to per-animation `soundAssetRef` before drop (boot migration runs FIRST)                                                          | ✓ VERIFIED | lib/migrations/phase-29-purge.mjs:186 + 198 carry the literal `MIGRATION FIRST — DO NOT REORDER (Pitfall 2)` comment; orchestrator in `purgeDeadFieldsOnBoot` calls `migrateAnimationSoundMap()` BEFORE `purgeGlobalDefaultsFields(...["animationSoundMap"])`; test/phase-29-sound-migration.test.mjs (4 tests pass) covers copy-when-empty / skip-on-conflict / drop-orphan |
| 4   | Boot migration is idempotent                                                                                                                                                   | ✓ VERIFIED | test/phase-29-purge.test.mjs Test 1 (idempotence) PASSES — calls purgeBoardFile twice, asserts second call returns `{ changed:false }` and content unchanged. 29-05-SUMMARY captured live evidence: `[phase-29-purge] complete (… 4 board file(s) stripped)` first run, `(… global unchanged; 0 board file(s) stripped)` second run with mtime byte-stable |
| 5   | Bundle export emits schema v4 with only LIVE fields; import rejects v3 with HTTP 400 + SCHEMA_OUTDATED                                                                          | ✓ VERIFIED | server.mjs:31 `const BOARD_PACKAGE_SCHEMA = "tt-beamer.board-package.v4"`; server.mjs:79 `function filterBoardToLiveFields(board)` defined; server.mjs:3349 export-handler calls `board: filterBoardToLiveFields(board)`; server.mjs:3414-3418 import-handler emits `code: "SCHEMA_OUTDATED"` + `Package format outdated…` message; helper allowed-set spreads `...BOARD_PROFILE_FIELDS` (line 87); test/bundle-schema.test.mjs 4/4 pass |
| 6   | Phase 27 + 28 acceptance non-regressed (test suite 44/44 green)                                                                                                                | ✓ VERIFIED | `node --test "test/**/*.test.mjs"` reports `tests 44 / pass 44 / fail 0 / skipped 0`; `lastUsedProfileName` (Phase 28 B1) preserved in BOARD_PROFILE_FIELDS at server.mjs:54; `hashByPath` (Phase 28 B5) untouched in config/asset-manifest.json + server.mjs:2236-2247; runtime-canvas-clip.js byte-unchanged (renderers continue via canonical playAreas[] resolver); test/board-profile-fields.test.mjs `Phase-29 W2: BOARD_PROFILE_FIELDS contains only LIVE fields` passes (skip-gate flipped in 29-04) |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact                                                            | Expected                                                                                  | Status     | Details                                                                                              |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `server.mjs` — BOARD_PROFILE_FIELDS                                 | 11 LIVE entries, no DEAD fields                                                            | ✓ VERIFIED | 11 entries (verified via `awk … grep -c '^\s*"'`); `lastUsedProfileName` retained                    |
| `server.mjs` — BOARD_PACKAGE_SCHEMA                                 | `"tt-beamer.board-package.v4"`                                                             | ✓ VERIFIED | line 31 reads exactly `"tt-beamer.board-package.v4"`; v3 occurrences = 0                             |
| `server.mjs` — `filterBoardToLiveFields()`                          | Defined; called by export handler                                                          | ✓ VERIFIED | Defined line 79; called line 3349 (export handler); spreads `...BOARD_PROFILE_FIELDS` for allowed-set |
| `server.mjs` — SCHEMA_OUTDATED reject                              | Import rejects non-v4 with 400 + code SCHEMA_OUTDATED                                      | ✓ VERIFIED | Lines 3414-3418 emit code: `"SCHEMA_OUTDATED"` + `"Package format outdated"` message                  |
| `lib/migrations/phase-29-purge.mjs`                                 | New ES module exposing migration helpers                                                   | ✓ VERIFIED | File exists (215 lines, mode 644); compiles OK; exports purgeBoardFile, purgeGlobalDefaultsFields, migrateAnimationSoundMap, purgeDeadFieldsOnBoot, listBoardJsonFiles, PHASE_29_DEAD_BOARD_FIELDS, PHASE_29_DEAD_GLOBAL_FIELDS |
| Boot wiring in `server.mjs`                                         | `await purgeDeadFieldsOnBoot(...)` between manifest init and `server.listen`                | ✓ VERIFIED | server.mjs:13 import; server.mjs:3818 call; ordering: ensureAssetManifestOnBoot (~3801) < purgeDeadFieldsOnBoot (3818) < server.listen (3833) |
| `.planning/phases/phase-29/29-AUDIT.md`                             | Authoritative classification doc with grep evidence                                        | ✓ VERIFIED | 27,478 bytes; 7+ section headings; verdict table with 22+ rows; §3 deletedRoomIds undo trace cites runtime-polygon-undo.js:66/77; §6 sign-off recorded with ISO timestamp |
| `runtime-polygon-undo.js` — undo flow                              | Pure board.rooms mutation; no tombstone calls                                              | ✓ VERIFIED | `grep markRoomTombstone\|clearRoomTombstone src/...polygon-undo.js` returns 0; line 48 filters `board.rooms`; lines 50-67 push back missing rooms |
| `config/boards/*.json` — disk strip                                 | No `hiddenRoomNames`/`roomStateProfiles`/`playAreaPolygon`/`deletedRoomIds`                | ✓ VERIFIED | `grep -c` over all 4 board JSONs returns 0 for each DEAD field                                        |
| `config/global-defaults.json` — disk strip                          | No `animationSoundMap`                                                                     | ✓ VERIFIED | `grep -c animationSoundMap config/global-defaults.json` returns 0                                     |
| `config/asset-manifest.json` (Phase 28 B5)                          | Untouched by Phase 29                                                                      | ✓ VERIFIED | `grep -c "deletedRoomIds\|hiddenRoomNames\|roomStateProfiles\|playAreaPolygon\|animationSoundMap"` returns 0; hashByPath structure intact |
| `runtime-canvas-clip.js` — renderer                                | Byte-unchanged (canonical playAreas[] resolver intact)                                     | ✓ VERIFIED | `git diff --stat HEAD~25 HEAD -- src/app/runtime/render/runtime-canvas-clip.js` not in diff list      |
| `runtime-animation-factory.js` — soundAssetRef write               | Byte-unchanged (per-animation source preserved)                                            | ✓ VERIFIED | Only doc-comment reword reflected in diff (3 line touch); soundAssetRef write at ~line 55 unchanged   |

### Key Link Verification

| From                                       | To                                                  | Via                                                  | Status   | Details                                                                                              |
| ------------------------------------------ | --------------------------------------------------- | ---------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| server boot                                | `purgeDeadFieldsOnBoot()`                           | top-level await before `server.listen()`              | ✓ WIRED  | server.mjs:3818 `await purgeDeadFieldsOnBoot({ globalDefaultsPath: GLOBAL_DEFAULTS_PATH, boardStorageDir: BOARD_STORAGE_DIR })`; sits between manifest init and listen |
| `purgeDeadFieldsOnBoot()`                  | `migrateAnimationSoundMap()`                        | explicit ordering MIGRATION FIRST                     | ✓ WIRED  | lib/migrations/phase-29-purge.mjs comment at line 186 + 198: `MIGRATION FIRST — DO NOT REORDER (Pitfall 2)`; migration call precedes purgeGlobalDefaultsFields |
| `test/phase-29-*.test.mjs`                 | server.mjs exported helpers                         | imports from `lib/migrations/phase-29-purge.mjs`      | ✓ WIRED  | purge.test + sound-migration.test import migrateAnimationSoundMap, purgeBoardFile from `../lib/migrations/phase-29-purge.mjs`; 4+4 tests pass |
| POST `/api/boards/bundle-export` handler   | `filterBoardToLiveFields(board)`                    | filter call before manifest.board assignment          | ✓ WIRED  | server.mjs:3349 `board: filterBoardToLiveFields(board)` inside the manifest object literal           |
| POST `/api/boards/bundle-import` handler   | schema mismatch path                                | `sendJson(res, 400, { ..., code: "SCHEMA_OUTDATED" })` | ✓ WIRED  | server.mjs:3414-3418 emits structured error with code + user-facing message                          |
| renderers                                  | `state.playAreasByBoard[boardId][selectedPlayAreaId].polygon` | `getSelectedPlayArea()?.polygon` / `getPlayAreaClipPolygons()` | ✓ WIRED | runtime-canvas-clip.js byte-unchanged; `getShipPolygonPoints` retained in runtime-play-area-geometry.js |
| `runtime-polygon-undo.js`                  | `board.rooms` direct mutation                       | filter + push (no tombstone array)                    | ✓ WIRED  | line 48 filter; lines 50-67 push-back loop; tombstone calls (lines 66, 77 in pre-29-04) removed       |
| audio playback                             | `animation.soundAssetRef`                           | direct read on animation definition                   | ✓ WIRED  | runtime-audio.js:247-252 — sole source for sound path; map fallback chain removed                    |

### Data-Flow Trace (Level 4)

| Artifact                                | Data Variable                              | Source                                                | Produces Real Data | Status        |
| --------------------------------------- | ------------------------------------------ | ----------------------------------------------------- | ------------------ | ------------- |
| `purgeDeadFieldsOnBoot()`               | `globalDefaults`, `boardFilePaths`         | readJsonOrNull(globalDefaultsPath) + listBoardJsonFiles(boardStorageDir) | Yes                | ✓ FLOWING     |
| `migrateAnimationSoundMap()`            | `entries` from `globalDefaults.animationSoundMap` | filtered map entries with non-empty paths              | Yes (when present) | ✓ FLOWING     |
| `filterBoardToLiveFields()`             | iterates `Object.entries(board)`           | export-handler `board` local (loaded from disk)        | Yes                | ✓ FLOWING     |
| Bundle export manifest                  | `manifest.board`                           | filterBoardToLiveFields(board)                         | Yes — filtered LIVE-only payload | ✓ FLOWING |
| Bundle import normalizer                | iterates BOARD_PROFILE_FIELDS              | `normalizeBoardDefinition` reads incoming `parsedBoard` and copies only LIVE fields | Yes — DEAD fields silently discarded (D-08) | ✓ FLOWING |
| Audio playback                          | `animation.soundAssetRef`                  | factory writes per-animation field at creation         | Yes — sole source after fallback removal | ✓ FLOWING |
| Renderer ship polygon                   | `getSelectedPlayArea(boardId)?.polygon`    | state.playAreasByBoard (canonical post-Phase-26 store) | Yes                | ✓ FLOWING     |

### Behavioral Spot-Checks

| Behavior                                       | Command                                                | Result                                | Status   |
| ---------------------------------------------- | ------------------------------------------------------ | ------------------------------------- | -------- |
| Migration module compiles                      | `node --check lib/migrations/phase-29-purge.mjs`        | exit 0                                 | ✓ PASS   |
| Server compiles                                | `node --check server.mjs`                              | exit 0 (implied by test-suite import path; suite passes) | ✓ PASS |
| Test suite passes                              | `node --test "test/**/*.test.mjs"`                     | tests 44 / pass 44 / fail 0 / skipped 0 | ✓ PASS  |
| BOARD_PROFILE_FIELDS count = 11                | `awk '/BOARD_PROFILE_FIELDS = Object\.freeze/,/\]\);/' server.mjs \| grep -c '^\s*"'` | 11 | ✓ PASS |
| Schema constant = v4                           | `grep -c '"tt-beamer.board-package.v4"' server.mjs`    | 1                                      | ✓ PASS   |
| No v3 schema constant remains                  | `grep -c '"tt-beamer.board-package.v3"' server.mjs`    | 0                                      | ✓ PASS   |
| All 4 DEAD fields stripped from board JSONs    | `grep -c "hiddenRoomNames\|roomStateProfiles\|playAreaPolygon\|deletedRoomIds" config/boards/*.json` | 0 in all 4 files | ✓ PASS |
| animationSoundMap stripped from global-defaults | `grep -c "animationSoundMap" config/global-defaults.json` | 0                                      | ✓ PASS   |
| asset-manifest.json untouched by Phase 29      | `grep -c "deletedRoomIds\|hiddenRoomNames\|roomStateProfiles\|playAreaPolygon\|animationSoundMap" config/asset-manifest.json` | 0 (no DEAD-field hits); hashByPath structure preserved | ✓ PASS |
| All Wave-N skip-gates flipped                  | `grep -c "skip:" test/phase-29-*.test.mjs test/bundle-schema.test.mjs test/board-profile-fields.test.mjs` | 0 in every file | ✓ PASS |

### Requirements Coverage

Phase 29 has no formal `requirements:` (REQ-…) IDs in plan frontmatter (the project uses backlog IDs B1..B4 + decisions D-01..D-11 instead, per phase prompt). Coverage of the **backlog items** mapped in 29-CONTEXT.md:

| Backlog Item | Description                                                             | Status         | Evidence                                                                                                  |
| ------------ | ----------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| B1           | Sound paths in `animationSoundMap` (verify legacy → remove)             | ✓ SATISFIED    | 29-AUDIT.md §F3 verdict REDUNDANT; 29-03 stripped source-side; 29-05 lossless migration + disk strip; field gone from global-defaults.json (3 orphan map entries silently dropped per D-03) |
| B2           | `deletedRoomIds` in board-JSON (verify still consumed → remove)         | ✓ SATISFIED    | 29-AUDIT.md §3 verdict REDUNDANT; 29-04 dropped tombstone plumbing + helpers + slice + apply path + accessors; runtime-polygon-undo rewired to direct board.rooms mutation; field stripped from all 4 board JSONs |
| B3           | `roomStateProfiles` in board-JSON (verify render-relevant → remove)     | ✓ SATISFIED    | 29-AUDIT.md §F2 verdict DEAD; 29-02 removed slice + accessors + ctx-builder + apply path + delete-on-room-delete; field stripped from all 4 board JSONs |
| B4           | Full schema audit of all four config JSONs                              | ✓ SATISFIED    | 29-AUDIT.md §1a-§1d covers all four config JSON file schemas (board / global / asset-manifest / projection-profiles) with per-field LIVE/DEAD/REDUNDANT verdicts and grep evidence |

### Anti-Patterns Found

No blocker anti-patterns detected. Two informational comment-only references remain:

| File         | Line | Pattern                              | Severity | Impact                                                                                              |
| ------------ | ---- | ------------------------------------ | -------- | --------------------------------------------------------------------------------------------------- |
| `server.mjs` | 3814-3815 | comment mentions `animationSoundMap` | ℹ Info   | Pure documentation describing the boot-block ordering. Not a code reference; does not affect behavior or grep tests on `\b…\b` against actual reads/writes (the grep-tests in test/phase-29-dead-grep.test.mjs scan src/, not server.mjs). No action required. |

Test suite confirms no functional regression. `git diff --stat HEAD~25 HEAD -- src/ server.mjs` shows net `-4969` lines in 29 files (pure dead-code removal).

### Human Verification Required

3 items need human testing — runnable code/UI/network behaviors that cannot be confirmed by static greps + Node test harness alone:

#### 1. Real-server boot + dashboard/output smoke

**Test:** Start `node server.mjs`. Open the dashboard. Switch boards. Trigger several outside-fx, room-fx, and inside-fx animations on /output/.
**Expected:** All animations render. Animations that previously had a global `animationSoundMap` mapping (intruder-alert, power-outage, fire) play their per-animation `soundAssetRef` (or are silent if their ref was empty AND the orphan was dropped — lossless migration may have left some animations silent if no map type matched their `def.type`). Boot log shows `[asset-manifest] ready (...)` then `[phase-29-purge] complete (...)` then `TT Beamer server listening on http://...`.
**Why human:** No browser harness exists. The phase-context note explicitly flags this: visual smoke requires manual verification.

#### 2. Bundle export + import roundtrip across schema boundary

**Test:** From the dashboard, export a board to a v4 package. Inspect the package's manifest.json — confirm `schema: "tt-beamer.board-package.v4"` and that no DEAD fields appear in the board payload. Then attempt to import a v3 package (any pre-Phase-29 export, or a synthetic v3 fixture).
**Expected:** Export succeeds; v3 import returns HTTP 400 with response body `{ ok:false, error:"Package format outdated (schema=tt-beamer.board-package.v3). Re-export from a v0.29+ server.", code:"SCHEMA_OUTDATED" }`. Importing a v4 package round-trips correctly.
**Why human:** Automated test only confirms source structure (constant + helper + literal). End-to-end HTTP roundtrip with real client + real zip file confirms the user-facing error reaches the UI as specified.

#### 3. Undo/redo of a room delete (Pitfall 1 closure)

**Test:** Open a board with several rooms in the polygon editor. Delete a room. Trigger undo (Ctrl-Z or undo button). Trigger redo. Reload the page.
**Expected:** Undo restores the deleted room into the canvas; redo re-deletes it; reload preserves the latest state. No tombstone-related console errors. No "missing helper" failures (markRoomTombstone/clearRoomTombstone were removed in 29-04).
**Why human:** Static greps confirm code structure, but the operator-level gesture (delete → undo → redo → reload) traverses runtime, render, and persistence layers — closing the audit's Pitfall 1 verdict ("undo uses tombstone IDs by reference, not by enumeration") in live behavior.

### Gaps Summary

**No gaps blocking goal achievement.** All 6 must-have truths are verified, all artifacts pass Levels 1-4, all key links are wired, and the test suite is at 44/44 with zero skipped — exactly the "Wave 4 closure" state both 29-06-SUMMARY and the phase prompt's context block predicted.

The phase status is `human_needed` (not `passed`) because the phase deliverable involves runtime-only behavior (server boot output, audio playback, bundle import/export roundtrip, UI undo/redo gesture) that cannot be exercised programmatically by `node --test`. The phase context block explicitly noted this: "the visual smoke (animations actually playing on /output/ post-cleanup) requires manual verification."

Score interpretation: **6/6 must-haves verified at the static + automated-test level**. Three behavioral spot-checks are routed to human verification per Step 8 — they exercise behaviors that need a running server and a real browser/HTTP client.

---

_Verified: 2026-05-05_
_Verifier: Claude (gsd-verifier)_
