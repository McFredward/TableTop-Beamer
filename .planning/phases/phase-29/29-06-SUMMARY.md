---
phase: 29
plan: 06
subsystem: bundle-schema
tags: [bundle, schema-bump, v4, export-filter, import-reject, wave-4, phase-closure]
requires:
  - 29-W0-SUMMARY.md (W4 skip-gates in test/bundle-schema.test.mjs)
  - 29-02-SUMMARY.md, 29-03-SUMMARY.md, 29-04-SUMMARY.md (Wave 2 source-tree cleanup of DEAD fields)
  - 29-05-SUMMARY.md (Wave 3 boot disk migration)
provides:
  - "BOARD_PACKAGE_SCHEMA = tt-beamer.board-package.v4 (D-04)"
  - "filterBoardToLiveFields(board) helper — derives allowed-set from BOARD_PROFILE_FIELDS spread (D-07)"
  - "Bundle export wraps outgoing board payload through filterBoardToLiveFields before manifest build (D-07)"
  - "Bundle import rejects non-v4 schemas with HTTP 400 + code: SCHEMA_OUTDATED + 'Package format outdated...' user-facing message (D-04)"
  - "All 3 W4 skip-gates in test/bundle-schema.test.mjs flipped from skip → pass"
affects:
  - server.mjs
  - test/bundle-schema.test.mjs
tech-stack:
  added: []
  patterns:
    - "Helper allowed-set derived from BOARD_PROFILE_FIELDS spread (NOT a hardcoded field-name list) — single source of truth, automatically tracks future trimming"
    - "Single-line wiring at the export-handler manifest assignment (board: filterBoardToLiveFields(board)) — surgical change, no other handler logic touched"
    - "Locked error-response shape with template literal interpolating the rejected schema string for user diagnosis ('Package format outdated (schema=...)...)'"
key-files:
  created:
    - .planning/phases/phase-29/29-06-SUMMARY.md
  modified:
    - server.mjs
    - test/bundle-schema.test.mjs
decisions:
  - "Helper placed directly after extractProfileFromUnifiedBoard (line 79) so it sits with the other board-shape helpers near the top of the file. BOARD_PROFILE_FIELDS is in scope at that location; no forward-reference issues."
  - "Used the existing `board` local variable in the export handler (line 3263, populated from the on-disk JSON via parsed?.board ?? parsed) as the filter input — no hoisting needed because the variable was already a clean const-like."
  - "Phase 28 h6 / h7 / h8 import-handler logic (rename → fresh boardId, refresh global-defaults, remap defaultAnimations.boardId at lines 3401+) byte-unchanged. Only the schema-mismatch 400-response block at line 3388 was rewritten (4 lines instead of 1)."
metrics:
  duration: ~2 min (autonomous, including TDD RED-GREEN cycles)
  completed: 2026-05-05
---

# Phase 29 Plan 06: Wave 4 Bundle Schema Bump (v3 → v4) Summary

Wave 4 — the final plan of Phase 29. This is the "schema-bump" wave that
makes the disk-shape from Wave 2 + Wave 3 visible at the package boundary.
v4 packages contain ONLY LIVE fields (D-07); v3 (or older) packages
presented to the import handler are rejected with a clear, user-facing
error (D-04).

After this plan: Phase 29 source + test work is **COMPLETE**. The only
remaining post-merge step is the disk-migration boot-run captured in
29-05 (already done on this developer's working copy).

## Diffs

### Schema constant (server.mjs:31)

```diff
-const BOARD_PACKAGE_SCHEMA = "tt-beamer.board-package.v3";
+const BOARD_PACKAGE_SCHEMA = "tt-beamer.board-package.v4";
```

### Import-handler error response (server.mjs:3388-3398)

```diff
       const schema = manifest?.schema;
       if (schema !== BOARD_PACKAGE_SCHEMA) {
-        sendJson(res, 400, { ok: false, error: "unrecognized package schema" });
+        sendJson(res, 400, {
+          ok: false,
+          error: `Package format outdated (schema=${schema || "unknown"}). Re-export from a v0.29+ server.`,
+          code: "SCHEMA_OUTDATED",
+        });
         return;
       }
```

### New helper (server.mjs:74-92, verbatim)

```javascript
// Phase 29 D-07: Bundle export filters the board payload to LIVE fields only.
// The allowed-set is derived from BOARD_PROFILE_FIELDS (post-Phase-29 = 11 entries)
// plus the structural keys that every board carries (schema, boardId, metadata,
// roomCatalog, roomClusters). Any DEAD field still lingering in in-memory state
// is silently dropped from the exported package.
function filterBoardToLiveFields(board) {
  if (!board || typeof board !== "object") return board;
  const allowedTopKeys = new Set([
    "schema",
    "boardId",
    "metadata",
    "roomCatalog",
    "roomClusters",
    ...BOARD_PROFILE_FIELDS,
  ]);
  const out = {};
  for (const [k, v] of Object.entries(board)) {
    if (allowedTopKeys.has(k)) out[k] = v;
  }
  return out;
}
```

### Export handler wiring (server.mjs:3349, single line)

```diff
       const manifest = {
         schema: BOARD_PACKAGE_SCHEMA,
         exportedAt: new Date().toISOString(),
         boardId,
-        board,
+        // Phase 29 D-07: filter the outgoing board payload to LIVE fields only.
+        // Any DEAD field still lingering in in-memory state is silently dropped
+        // before the v4 package is built.
+        board: filterBoardToLiveFields(board),
         projectionProfiles,
         boardImagePath: boardImagePath ?? null,
         resourcePaths: resourceEntries.map((e) => e.path),
       };
```

(One-liner change to the value, plus a 3-line lead-in comment.)

## Tasks Executed

### Task 1 — Schema constant bump + SCHEMA_OUTDATED reject (commit `24a364f`)

TDD RED → GREEN cycle:

1. **RED:** un-skipped tests 1 (constant value) and 2 (SCHEMA_OUTDATED on
   mismatch); ran suite → both failed against the v3 source as expected.
2. **GREEN:** edited server.mjs:31 (constant bump) + server.mjs:3388-3398
   (rewrite error-response block to D-04 shape with `code: "SCHEMA_OUTDATED"`
   + the locked `Package format outdated (schema=${schema || "unknown"})...`
   message). Re-ran suite → 43 pass / 0 fail / 1 skipped (test 3, owed to
   Task 2).

Acceptance:
- `grep -c '"tt-beamer.board-package.v4"' server.mjs` → 1
- `grep -c '"tt-beamer.board-package.v3"' server.mjs` → 0
- `grep -c "SCHEMA_OUTDATED" server.mjs` → 1
- `grep -c "Package format outdated" server.mjs` → 1
- Phase 28 h6 / h7 / h8 blocks byte-unchanged (verified by `git diff server.mjs | grep -E "metadata.name = renameTo|sanitizeBoardFileName"` → 0 hits)

### Task 2 — filterBoardToLiveFields helper + export wiring (commit `2333832`)

TDD RED → GREEN cycle:

1. **RED:** un-skipped test 3 (`filterBoardToLiveFields helper exists and is
   used in export handler`); ran suite → failed (helper not yet defined).
2. **GREEN:** added the helper directly after `extractProfileFromUnifiedBoard`
   (server.mjs:74-92), then changed the export-handler manifest assignment
   from `board,` to `board: filterBoardToLiveFields(board),` at line 3349.
   Re-ran suite → 44 pass / 0 fail / 0 skipped.

Acceptance:
- `grep -c "function filterBoardToLiveFields" server.mjs` → 1 (definition)
- `grep -c "filterBoardToLiveFields(" server.mjs` → 2 (definition + 1 call)
- Helper allowed-set uses `...BOARD_PROFILE_FIELDS` spread (verified — 1 hit in
  `grep -A 8 "function filterBoardToLiveFields" server.mjs | grep BOARD_PROFILE_FIELDS`)
- All 4 tests in `bundle-schema.test.mjs` pass; 0 skipped

## Test Suite Counts

| Stage | Tests | Pass | Fail | Skipped |
|-------|-------|------|------|---------|
| Before plan (post-29-05) | 44 | 41 | 0 | 3 |
| After Task 1 | 44 | 43 | 0 | 1 |
| After Task 2 (final) | 44 | **44** | 0 | **0** |

`bundle-schema.test.mjs` specifically:

| Stage | Tests | Pass | Skipped |
|-------|-------|------|---------|
| Before plan | 4 | 1 | 3 |
| After Task 1 | 4 | 3 | 1 |
| After Task 2 (final) | 4 | **4** | 0 |

## Final Verification (verbatim)

```bash
$ node --test "test/**/*.test.mjs" 2>&1 | tail -10
ℹ tests 44
ℹ suites 0
ℹ pass 44
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 110.874928

$ node --check server.mjs && echo "compile OK"
compile OK

$ grep -c "tt-beamer.board-package.v4\|SCHEMA_OUTDATED\|filterBoardToLiveFields" server.mjs
4

$ git diff --stat HEAD~2 HEAD -- server.mjs test/bundle-schema.test.mjs
 server.mjs                  | 35 ++++++++++++++++++++++++++++++++---
 test/bundle-schema.test.mjs |  6 +++---
 2 files changed, 35 insertions(+), 6 deletions(-)
```

## Acceptance Criteria

- [x] `BOARD_PACKAGE_SCHEMA = "tt-beamer.board-package.v4"` in server.mjs (line 31)
- [x] Bundle export emits `schema: "tt-beamer.board-package.v4"` in manifest (line 3346 references the constant)
- [x] Bundle export filters the board payload through `filterBoardToLiveFields()` (line 3349)
- [x] Bundle import rejects any non-v4 schema with HTTP 400 + `code: "SCHEMA_OUTDATED"` + `Package format outdated...` message (line 3388-3395)
- [x] Bundle import normalizer (`normalizeBoardDefinition`) iterates the trimmed `BOARD_PROFILE_FIELDS` (D-08 — already true post-Wave-2, no change required)
- [x] Helper allowed-set spreads `BOARD_PROFILE_FIELDS` (NOT a hardcoded field-name list) — line 86
- [x] Phase 28 h6 / h7 / h8 bundle-import handling intact (rename → fresh boardId, refresh global-defaults, remap defaultAnimations.boardId — verified 0 changes in those blocks)
- [x] All 3 previously-skipped tests in `bundle-schema.test.mjs` now pass
- [x] Existing `board-json-roundtrip.test.mjs` still passes (verified in full-suite run)
- [x] Test suite green: `node --test test/` reports `fail 0`

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Editorial / Discretionary

**1. [Working tree] config/asset-manifest.json bumped during smoke**

The runtime-bumped `generatedAt` timestamp on `config/asset-manifest.json`
(Phase 28 W4 behavior) appeared in `git status` because the disk-migration
boot from 29-05 also touched the asset manifest. Same situation noted in
29-05-SUMMARY decisions[3]. Not staged in either Phase 29 commit; left
in working tree.

## Authentication Gates

None — fully autonomous execution.

## Threat Flags

None. The schema bump narrows the import surface (rejects v3 explicitly
with a structured error code) and tightens the export surface (drops any
DEAD fields that might linger in in-memory state). Both directions reduce
the potential for stale or unintended fields crossing the bundle boundary.
No new auth path, no new network surface, no broadcast trigger.

## Phase Closure Reminder (D-06)

Phase 29 source + test work is **COMPLETE** with this commit. The phase-
closure SUMMARY (separate document) should capture verbatim the disk diff
already noted in 29-05-SUMMARY:

```
$ git diff --stat HEAD~3..HEAD -- config/
 config/boards/nemesis-board-a.json     |  932 -------------------
 config/boards/nemesis-board-b.json     | 1095 ----------------------
 config/boards/nemesis-lockdown-a.json  | 1594 --------------------------------
 config/boards/nemesis-lockdown-b.json  |  845 -----------------
 config/global-defaults.json            |   12 -
 5 files changed, 4478 deletions(-)
```

That diff is the canonical "Phase 29 deleted X here" record per D-06
(hard delete; git history is the safety net).

For other developers / fresh checkouts: pulling the Phase 29 commits → first
server boot will repeat the migration on whatever state their local config
files are in. Idempotence (verified in 29-05) guarantees this is safe.

## Self-Check: PASSED

- File `.planning/phases/phase-29/29-06-SUMMARY.md`: written by this Write call.
- Commit `24a364f` (Task 1 — schema constant bump + SCHEMA_OUTDATED): present in `git log` (verified via `git log --oneline -3`).
- Commit `2333832` (Task 2 — filterBoardToLiveFields helper + export wiring): present in `git log`.
- `node --check server.mjs`: exit 0.
- `node --test "test/**/*.test.mjs"`: 44 tests / 44 pass / 0 fail / 0 skipped.
- `grep -c "skip:" test/bundle-schema.test.mjs`: 0 (all W4 gates flipped).
- Helper definition at server.mjs:79; export-handler call at server.mjs:3349 (verified via `grep -n filterBoardToLiveFields server.mjs`).

---

*Phase: 29-persistence-audit-legacy-cleanup, Wave 4 (bundle schema bump v3 → v4). Phase 29 source + test work COMPLETE.*
