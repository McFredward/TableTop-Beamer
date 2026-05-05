---
phase: 29
plan: 05
subsystem: persistence-cleanup
tags: [persistence, boot-migration, disk-cleanup, wave-3, idempotent, lossless-migration]
requires:
  - 29-W0-SUMMARY.md (test scaffolds with skip-gates)
  - 29-02-SUMMARY.md (Wave 2 batch 1 — hiddenRoomNames + roomStateProfiles)
  - 29-03-SUMMARY.md (Wave 2 batch 2 — animationSoundMap source-side removal)
  - 29-04-SUMMARY.md (Wave 2 batch 3 — playAreaPolygon + deletedRoomIds, source clean)
provides:
  - "lib/migrations/phase-29-purge.mjs — boot-time disk-migration module with 4 named helpers"
  - "purgeDeadFieldsOnBoot() invoked from server.mjs after ensureAssetManifestOnBoot() and before server.listen()"
  - "Lossless animationSoundMap → per-animation soundAssetRef migration (D-03)"
  - "Idempotent disk cleanup: boots 2..N leave config/ files mtime-unchanged"
  - "All 6 W3 skip-gates flipped from skip → pass"
affects:
  - server.mjs
  - test/phase-29-purge.test.mjs
  - test/phase-29-sound-migration.test.mjs
  - lib/migrations/phase-29-purge.mjs
  - config/global-defaults.json
  - config/boards/nemesis-board-a.json
  - config/boards/nemesis-board-b.json
  - config/boards/nemesis-lockdown-a.json
  - config/boards/nemesis-lockdown-b.json
tech-stack:
  added: []
  patterns:
    - "Idempotent boot migration: write-only-on-change semantics + malformed-JSON tolerance (mirrors Phase 28 ensureAssetManifestOnBoot pattern)"
    - "Two-shape input handling: outer.board wrapped (board-import.v1) AND flat board.v2 — same helper handles both"
    - "Order-critical orchestrator: 'MIGRATION FIRST — DO NOT REORDER (Pitfall 2)' explicitly commented at the call site"
    - "ES-module extraction (lib/migrations/) so the same helpers are testable WITHOUT booting the server"
key-files:
  created:
    - lib/migrations/phase-29-purge.mjs
    - .planning/phases/phase-29/29-05-SUMMARY.md
  modified:
    - server.mjs
    - test/phase-29-purge.test.mjs
    - test/phase-29-sound-migration.test.mjs
    - config/global-defaults.json
    - config/boards/nemesis-board-a.json
    - config/boards/nemesis-board-b.json
    - config/boards/nemesis-lockdown-a.json
    - config/boards/nemesis-lockdown-b.json
decisions:
  - "Extracted helpers to a NEW module lib/migrations/phase-29-purge.mjs (D-10 grants discretion). Rationale: server.mjs has top-level boot-time await side effects, so importing helpers directly from it would boot the server during tests. The extracted module is import-clean for tests and re-imported by server.mjs at boot — same source of truth, two consumers."
  - "Migration ran on real disk during smoke-boot in this same session: 4 board JSONs were stripped of hiddenRoomNames / roomStateProfiles / playAreaPolygon / deletedRoomIds (the DEAD board fields per Wave 2). global-defaults.json was stripped of animationSoundMap. The committed state already reflects post-migration disk shape — Phase 29 W3's one-shot job is DONE (subsequent boots are no-ops). Per D-06 (hard delete; git history is the safety net), the deletion is captured in commit 864230f."
  - "All 3 non-'none' animationSoundMap entries (intruder-alert, power-outage, fire) turned out to be ORPHANS at migration-time: no animation in any of the 4 boards' outsideFx/roomFx/insideFx arrays had a matching def.type. Per D-03 these were silently dropped. Lossless migration semantics are still proven in test/phase-29-sound-migration.test.mjs Test 1 (synthetic fixture with matching type → ref copied)."
  - "Excluded config/asset-manifest.json from the Phase 29 commit. The file shows as modified in working-tree because ensureAssetManifestOnBoot() bumped its generatedAt timestamp during smoke-boots — that is Phase 28 W4 behavior, not Phase 29 work."
metrics:
  duration: ~4 min (autonomous)
  completed: 2026-05-05
---

# Phase 29 Plan 05: Wave 3 Boot Disk Migration Summary

Wave 3 — disk-side cleanup mirroring the Wave 2 source-tree cleanup. Adds a
boot-time `purgeDeadFieldsOnBoot()` step (mirroring the Phase 28 W4
`ensureAssetManifestOnBoot()` pattern) that runs ONCE per server start and:

1. Performs the lossless `animationSoundMap` → per-animation `soundAssetRef`
   migration (D-03) FIRST, so no map values are lost.
2. Strips `animationSoundMap` from `config/global-defaults.json`.
3. Strips `hiddenRoomNames`, `roomStateProfiles`, `playAreaPolygon`,
   `deletedRoomIds` from every `config/boards/<id>.json`.

The function is **idempotent** — boots 2..N find nothing to do and don't
touch any file's mtime. After this plan, the disk is in the same shape the
Wave 2 source cleanup expected.

## Path to New Migration Module

`lib/migrations/phase-29-purge.mjs` (215 lines, new file)

Exports (sorted):
`PHASE_29_DEAD_BOARD_FIELDS, PHASE_29_DEAD_GLOBAL_FIELDS, listBoardJsonFiles, migrateAnimationSoundMap, purgeBoardFile, purgeDeadFieldsOnBoot, purgeGlobalDefaultsFields`

## Boot-Block Snippet (verbatim from server.mjs:3781-3802)

```javascript
// Phase 29 W3 — one-shot disk-side cleanup mirroring the Wave 2 source cleanup.
// The migration is idempotent: boots 2..N find nothing to do and don't touch
// any file. Runs BEFORE attachLiveWebSocket() / server.listen so no
// global-config-update broadcast fires (Pitfall 6). Internally orders:
// (1) lossless animationSoundMap → per-animation soundAssetRef migration FIRST
// (Pitfall 2), (2) strip animationSoundMap from global-defaults.json,
// (3) strip DEAD fields from each config/boards/<id>.json.
try {
  const phase29Result = await purgeDeadFieldsOnBoot({
    globalDefaultsPath: GLOBAL_DEFAULTS_PATH,
    boardStorageDir: BOARD_STORAGE_DIR,
  });
  const { migration, globalStripped, boardsStripped } = phase29Result;
  console.log(
    `[phase-29-purge] complete (migrated ${migration.copiedCount} sound refs across ${migration.boardFilesModified} boards; orphans ${migration.orphanCount}; global ${globalStripped.changed ? "stripped" : "unchanged"}; ${boardsStripped} board file(s) stripped)`,
  );
} catch (error) {
  console.warn(
    "[phase-29-purge] failed (continuing — re-run will retry):",
    error?.message || error,
  );
}
```

Import (server.mjs:13):

```javascript
import { purgeDeadFieldsOnBoot } from "./lib/migrations/phase-29-purge.mjs";
```

Boot ordering (verified): `await ensureAssetManifestOnBoot()` (line 3773) →
`await purgeDeadFieldsOnBoot(...)` (line 3789) → `server.listen(PORT, HOST, ...)` (line 3804).

## Tasks Executed

### Task 1 — Create lib/migrations/phase-29-purge.mjs (commit `c5565b0`)

Pure ES module with four named helpers + two frozen field-list constants. All
helpers idempotent (write-only-on-change), malformed-JSON tolerated (no throw),
both flat and `outer.board`-wrapped JSON shapes handled by the same code path.

| Helper | Behavior |
|--------|----------|
| `purgeBoardFile(filePath, deadFields?)` | Strip DEAD fields from one board JSON; returns `{ changed: boolean }` |
| `purgeGlobalDefaultsFields(filePath, deadFields?)` | Strip DEAD fields from global-defaults; returns `{ changed: boolean }` |
| `migrateAnimationSoundMap(globalDefaults, boardFilePaths)` | D-03 lossless migration; returns `{ boardFilesModified, copiedCount, orphanCount }` |
| `purgeDeadFieldsOnBoot({ globalDefaultsPath, boardStorageDir })` | Top-level orchestrator with explicit `// MIGRATION FIRST — DO NOT REORDER (Pitfall 2)` comment |

`DEAD_BOARD_FIELDS = [hiddenRoomNames, roomStateProfiles, playAreaPolygon, deletedRoomIds]`
`DEAD_GLOBAL_FIELDS = [animationSoundMap]`

### Task 2 — Wire purgeDeadFieldsOnBoot into server.mjs boot block (commit `864230f`)

Two-line server.mjs source change (1 import, 1 try/catch boot-time call) +
the actual disk-migration outcome from running it once on real config files.

server.mjs diff:
- Line 13: new import.
- Lines 3781-3802: new try/catch block AFTER `ensureAssetManifestOnBoot()` and
  BEFORE `server.listen(...)` (verified ordering: 3773 < 3789 < 3804).

Disk migration result captured in this commit (the one-shot Wave 3 cleanup):

```
[phase-29-purge] complete (migrated 0 sound refs across 0 boards; orphans 3; global stripped; 4 board file(s) stripped)
```

- 4 board JSONs stripped: `nemesis-board-a.json`, `nemesis-board-b.json`,
  `nemesis-lockdown-a.json`, `nemesis-lockdown-b.json`. Total: −4466 lines
  (DEAD `roomStateProfiles` blocks were the bulk; also removed
  `deletedRoomIds`, `hiddenRoomNames`, `playAreaPolygon` entries).
- `global-defaults.json`: `animationSoundMap` field removed (−12 lines: 10
  type-mappings + 2 braces).
- `migrated 0 sound refs / 0 boards`: all 3 non-"none" map entries
  (`intruder-alert`, `power-outage`, `fire`) were orphans — no matching
  `def.type` in any board's animation slots — silently dropped per D-03.

### Task 3 — Un-skip + populate 6 W3 tests (commit `027f8a9`)

| File | Tests added | Skip-gates removed |
|------|------------|---------------------|
| `test/phase-29-purge.test.mjs` | 3 substantive (idempotence, strip + LIVE preservation, malformed-JSON) | 3 |
| `test/phase-29-sound-migration.test.mjs` | 3 substantive (copy-when-empty, skip-on-conflict, drop-orphan) | 3 |

Both files now `import { ... } from "../lib/migrations/phase-29-purge.mjs"` —
exercising the same helpers the boot path uses.

## Test Suite Counts

```
Before plan:  ℹ tests 44   pass 35   fail 0   skipped 9
After plan:   ℹ tests 44   pass 41   fail 0   skipped 3
```

Net: **+6 pass, −6 skipped, 0 fail** — exactly the 6 W3 skip-gates targeted by
this plan flipped from skip → pass. The 3 remaining skipped tests belong to
later phases / waves and were not in scope.

## Idempotence Verification (live, on real config files)

Two consecutive `timeout 5 node server.mjs` runs:

```
$ timeout 5 node server.mjs 2>&1 | grep "phase-29-purge"
[phase-29-purge] complete (migrated 0 sound refs across 0 boards; orphans 3; global stripped; 4 board file(s) stripped)

$ stat -c '%Y' config/boards/nemesis-board-a.json config/global-defaults.json
1777987579
1777987579

$ timeout 5 node server.mjs 2>&1 | grep "phase-29-purge"
[phase-29-purge] complete (migrated 0 sound refs across 0 boards; orphans 0; global unchanged; 0 board file(s) stripped)

$ stat -c '%Y' config/boards/nemesis-board-a.json config/global-defaults.json
1777987579       (unchanged — no writeFile)
1777987579       (unchanged — no writeFile)
```

**IDEMPOTENT: OK** — boot 2 reports zero modifications, mtimes byte-stable.

## Post-Migration Disk State

```
$ git diff --stat HEAD~3 HEAD config/
 config/boards/nemesis-board-a.json     |  932 -------------------
 config/boards/nemesis-board-b.json     | 1095 ----------------------
 config/boards/nemesis-lockdown-a.json  | 1594 --------------------------------
 config/boards/nemesis-lockdown-b.json  |  845 -----------------
 config/global-defaults.json            |   12 -
 5 files changed, 4478 deletions(-)
```

`config/asset-manifest.json` is unaffected by Phase 29 (it had a stale
`generatedAt` timestamp from earlier Phase 28 boot churn; not part of this
phase's commits).

## Sample Boot Log Lines (live)

```
[asset-manifest] ready (8 entries)
[phase-29-purge] complete (migrated 0 sound refs across 0 boards; orphans 3; global stripped; 4 board file(s) stripped)
TT Beamer server listening on http://0.0.0.0:4173
```

## Acceptance Criteria

- [x] `lib/migrations/phase-29-purge.mjs` exists; `node --check` passes
- [x] Module exports (sorted): `PHASE_29_DEAD_BOARD_FIELDS, PHASE_29_DEAD_GLOBAL_FIELDS, listBoardJsonFiles, migrateAnimationSoundMap, purgeBoardFile, purgeDeadFieldsOnBoot, purgeGlobalDefaultsFields`
- [x] Order-comment `// MIGRATION FIRST — DO NOT REORDER (Pitfall 2)` present in module
- [x] `DEAD_BOARD_FIELDS` = `[hiddenRoomNames, roomStateProfiles, playAreaPolygon, deletedRoomIds]`
- [x] `DEAD_GLOBAL_FIELDS` = `[animationSoundMap]`
- [x] `node --check server.mjs` exits 0
- [x] `grep -c "purgeDeadFieldsOnBoot" server.mjs` → 2 (1 import + 1 call)
- [x] `grep -c "phase-29-purge" server.mjs` → 3 (header comment + success log + failure log)
- [x] Call site after `await ensureAssetManifestOnBoot();` (3773) and before `server.listen(PORT, ...)` (3804); `await purgeDeadFieldsOnBoot` at 3789
- [x] `node --test test/` exits 0; `fail 0`
- [x] `grep -c "skip:" test/phase-29-purge.test.mjs` → 0
- [x] `grep -c "skip:" test/phase-29-sound-migration.test.mjs` → 0
- [x] Both test files import from `../lib/migrations/phase-29-purge.mjs`
- [x] Idempotence: a second boot does NOT modify any disk file (mtime byte-stable, log says "global unchanged; 0 board file(s) stripped")
- [x] After first boot: `config/global-defaults.json` no longer contains `animationSoundMap`
- [x] After first boot: every `config/boards/<id>.json` no longer contains `hiddenRoomNames`, `roomStateProfiles`, `playAreaPolygon`, `deletedRoomIds`
- [x] Lossless migration proven (sound-migration Test 1 + 2 — synthetic fixture)
- [x] Skip-on-conflict proven (sound-migration Test 2)
- [x] Drop-orphan proven (sound-migration Test 3)
- [x] Malformed-JSON tolerance proven (purge Test 3)

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Editorial / Discretionary

**1. [Plan-discretionary] Excluded config/asset-manifest.json from Phase 29 commits**

- **Found during:** Task 2, after smoke-booting the server
- **Issue:** `config/asset-manifest.json` showed as modified in `git status`
  because `ensureAssetManifestOnBoot()` (Phase 28 W4) bumps its `generatedAt`
  timestamp on every boot regardless of content hash matches. This change is
  unrelated to Phase 29's work.
- **Action:** Did NOT stage it in any of the 3 task commits. Left in working
  tree so it can be committed by an explicit Phase 28 housekeeping pass if
  desired.
- **Files affected:** None inside the Phase 29 commit boundary.

**2. [Module placement decision per D-10] Extracted helpers to a NEW module rather than inlining in server.mjs**

- **Reason:** server.mjs has top-level boot-time `await server.listen()` side
  effects. If helpers were inlined and tests imported them via
  `import { purgeBoardFile } from "../server.mjs"`, the tests would boot the
  server every time they imported. Extracting to `lib/migrations/phase-29-purge.mjs`
  keeps server.mjs at "1 import + 1 call" and gives tests a clean import surface.
- **D-10 explicitly grants this discretion** ("Migration-Script-Form — separates
  Modul oder inline in bestehendem Boot-Hook in server.mjs. Implementer wählt
  Minimum-Invasivität.").

## Authentication Gates

None — fully autonomous execution.

## Threat Flags

None. The boot migration runs on already-authoritative local files
(`config/global-defaults.json`, `config/boards/*.json`) BEFORE
`attachLiveWebSocket` / `server.listen` — no network surface, no
broadcast trigger, no new auth path. The only side effects are:

- `writeFile` to existing config files (with strip-only / copy-only semantics
  — no field synthesis, no schema upgrade)
- `console.log` / `console.warn` to stdout

Pre-existing single-tenant local-app threat model preserved.

## Wave 3 Closure Marker

**Wave 3 disk-side cleanup is COMPLETE on this developer's working copy.**

The next Wave to execute is **Wave 4 (29-06)**: bump
`BOARD_PACKAGE_SCHEMA` v3 → v4, update bundle-import handler to reject
v3 packages with a clear "Package format outdated" error message, and
update bundle-export to filter through `BOARD_PROFILE_FIELDS` so v4
packages contain ONLY LIVE fields (D-04 + D-07 + D-08).

For other developers / fresh checkouts: pulling these commits → first server
boot will repeat the migration on whatever state their local config files
are in. Idempotence guarantees this is safe: any developer whose config files
were already at the post-Wave-2 shape (e.g., they pulled 29-04 + 29-05
together) will see `[phase-29-purge] complete (migrated 0 ... global
unchanged; 0 board file(s) stripped)` on first boot, no file mtime change.

## Self-Check: PASSED

- File `lib/migrations/phase-29-purge.mjs`: present (`ls -la lib/migrations/phase-29-purge.mjs` confirms 215 lines, mode 644).
- File `.planning/phases/phase-29/29-05-SUMMARY.md`: written by this Write call.
- Commit `c5565b0` (Task 1 — module): present in `git log` (verified via `git log --oneline -5`).
- Commit `864230f` (Task 2 — boot wiring + disk migration): present in `git log`.
- Commit `027f8a9` (Task 3 — test gates flipped): present in `git log`.
- `node --check server.mjs`: exit 0.
- `node --test 'test/**/*.test.mjs'`: 44 tests / 41 pass / 0 fail / 3 skipped.
- `grep -c "skip:" test/phase-29-purge.test.mjs test/phase-29-sound-migration.test.mjs`: 0 + 0.
- Boot-block ordering: manifest@3773 < purge@3789 < listen@3804.
- Idempotence: live-boot test confirmed second-pass mtimes byte-stable (1777987579 == 1777987579).

---

*Phase: 29-persistence-audit-legacy-cleanup, Wave 3 (boot disk migration).*
