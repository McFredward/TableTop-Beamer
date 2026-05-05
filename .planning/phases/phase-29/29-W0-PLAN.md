---
phase: 29
plan: W0
type: execute
wave: 0
depends_on: []
files_modified:
  - test/phase-29-dead-grep.test.mjs
  - test/phase-29-purge.test.mjs
  - test/phase-29-sound-migration.test.mjs
  - test/bundle-schema.test.mjs
  - test/board-profile-fields.test.mjs
autonomous: true
requirements: []
must_haves:
  truths:
    - "All four new *.test.mjs files exist and pass under `node --test test/`"
    - "The extended board-profile-fields.test.mjs continues to pass"
    - "The new tests INTENTIONALLY skip / xfail their substantive assertions until later waves implement the production code"
    - "Full suite count rises from 25 active tests to 25 + scaffold count, with zero failures"
  artifacts:
    - path: "test/phase-29-dead-grep.test.mjs"
      provides: "Structural assertion that DEAD field names have zero hits in src/ post-cleanup; skipped until Wave 2 lands"
    - path: "test/phase-29-purge.test.mjs"
      provides: "Idempotent boot-migration test fixture; skipped until Wave 3 exposes purgeDeadFieldsOnBoot or its helpers"
    - path: "test/phase-29-sound-migration.test.mjs"
      provides: "D-03 lossless migration algorithm coverage; skipped until Wave 2 exposes the migration helper"
    - path: "test/bundle-schema.test.mjs"
      provides: "D-04 v3-rejected + v4-roundtrip + export-filter coverage; skipped until Wave 4"
    - path: "test/board-profile-fields.test.mjs"
      provides: "Existing test file gets a new assertion enumerating the post-Wave-2 BOARD_PROFILE_FIELDS set; the new assertion is `t.skip(...)`-gated"
  key_links:
    - from: "test/phase-29-*.test.mjs"
      to: "node --test test/"
      via: "Node 24 builtin test runner"
      pattern: "test\\("
    - from: "test/bundle-schema.test.mjs"
      to: "test/_helpers.mjs"
      via: "withTempDir, readJsonFile, writeJsonFile"
      pattern: "from \"./_helpers.mjs\""
---

<objective>
Wave 0 — Create four new test scaffolds plus extend the existing
`board-profile-fields.test.mjs` to cover the Wave 2..4 production code that has
not yet been written. Every substantive assertion is gated by `t.skip(...)` so
the suite stays GREEN until later waves implement the production code, at
which point the gate is removed.

Purpose: Establish the Nyquist-compliant verification surface BEFORE any
production cleanup happens. Phase 28 W0 set the same precedent
(`test/_helpers.mjs` + 8 *.test.mjs scaffolds) and this is the exact mirror
for Phase 29.

Output: 4 new test files + 1 extended test file. Suite stays GREEN
(`node --test test/` exits 0 with zero failures).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/phase-29/29-CONTEXT.md
@.planning/phases/phase-29/29-RESEARCH.md
@.planning/phases/phase-29/29-VALIDATION.md
@.planning/phases/phase-28/SUMMARY.md
@test/_helpers.mjs
@test/board-profile-fields.test.mjs
@test/board-json-roundtrip.test.mjs

<interfaces>
<!-- Helpers available from test/_helpers.mjs (already shipped in Phase 28 W0). -->
<!-- DO NOT add new helpers; reuse these. -->

From test/_helpers.mjs:
```javascript
export function readJsonFile(absolutePath): Promise<object>;
export function writeJsonFile(absolutePath, data): Promise<void>;
export function withTempDir(prefix, fn: (dir: string) => Promise<T>): Promise<T>;
export function makeMinimalDocumentStub(): { body, createElement, getElementById, _register, addEventListener, removeEventListener };
```

From server.mjs (current values — Wave 2..4 will mutate):
```javascript
const BOARD_PACKAGE_SCHEMA = "tt-beamer.board-package.v3";  // line 30, becomes v4 in Wave 4
const BOARD_PROFILE_FIELDS = Object.freeze([                // lines 39-58
  "deletedRoomIds",         // dropped in 29-04 if audit confirms (REDUNDANT)
  "hitareaCalibration",     // KEEP (LIVE)
  "roomGeometry",           // KEEP (LIVE)
  "roomStateProfiles",      // dropped in 29-03 (DEAD)
  "specialPolygons",        // KEEP (LIVE)
  "playAreaPolygon",        // dropped in 29-04 (REDUNDANT)
  "playAreas",              // KEEP (LIVE)
  "selectedPlayAreaId",     // KEEP (LIVE)
  "outsideFx",              // KEEP (LIVE)
  "insideFx",               // KEEP (LIVE)
  "roomFx",                 // KEEP (LIVE)
  "defaultAnimations",      // KEEP (LIVE)
  "frozenRooms",             // KEEP (LIVE)
  "hiddenRoomNames",        // dropped in 29-02 (DEAD)
  "lastUsedProfileName",    // KEEP (Phase 28 B1 — MUST survive cleanup)
]);
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create test/phase-29-dead-grep.test.mjs scaffold</name>
  <read_first>
    - test/_helpers.mjs (full file — to confirm available helpers)
    - test/board-profile-fields.test.mjs (full file — to copy the import header style)
  </read_first>
  <files>test/phase-29-dead-grep.test.mjs</files>
  <behavior>
    - The file MUST register at least one passing test so the suite-count check stays green.
    - Substantive grep assertions for DEAD field absence are written but wrapped in
      `t.skip("Wave 2 not landed yet")` so they DO NOT fire until Wave 2 removes them.
    - Each DEAD field gets one skipped assertion shape that documents the future check.
  </behavior>
  <action>
    Create `test/phase-29-dead-grep.test.mjs` with the following structure:

    1. Imports: `test` from `"node:test"`, `assert from "node:assert/strict"`,
       `readFileSync, readdirSync` from `"node:fs"`, `join, dirname` from `"node:path"`,
       `fileURLToPath` from `"node:url"`. Compute `REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")`.
    2. `test("scaffold: phase-29-dead-grep loads", () => assert.equal(1, 1));` — liveness.
    3. Write a helper inside the file:
       ```javascript
       function grepRecursive(dir, pattern, hits = []) {
         for (const entry of readdirSync(dir, { withFileTypes: true })) {
           if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
           const full = join(dir, entry.name);
           if (entry.isDirectory()) { grepRecursive(full, pattern, hits); continue; }
           if (!entry.name.endsWith(".js") && !entry.name.endsWith(".mjs")) continue;
           const text = readFileSync(full, "utf8");
           const lines = text.split("\n");
           for (let i = 0; i < lines.length; i++) {
             if (pattern.test(lines[i])) hits.push(`${full}:${i + 1}: ${lines[i].trim()}`);
           }
         }
         return hits;
       }
       ```
    4. For each of the four DEAD field names, write a SKIPPED test:
       ```javascript
       test("W2: hiddenRoomNames has zero src/ hits", { skip: "Wave 2 (29-02) not landed yet" }, () => {
         const hits = grepRecursive(join(REPO_ROOT, "src"), /\bhiddenRoomNames\b/);
         assert.equal(hits.length, 0, `expected 0 hits, found:\n${hits.join("\n")}`);
       });
       test("W2: roomStateProfiles has zero src/ hits (excluding state-accessor module which is removed in 29-03)", { skip: "Wave 2 (29-03) not landed yet" }, () => {
         const hits = grepRecursive(join(REPO_ROOT, "src"), /\broomStateProfiles?\b/);
         assert.equal(hits.length, 0, `expected 0 hits, found:\n${hits.join("\n")}`);
       });
       test("W2: animationSoundMap has zero src/ hits", { skip: "Wave 2 (29-03) not landed yet" }, () => {
         const hits = grepRecursive(join(REPO_ROOT, "src"), /\banimationSoundMap\b/);
         assert.equal(hits.length, 0, `expected 0 hits, found:\n${hits.join("\n")}`);
       });
       test("W2: playAreaPolygon has zero src/ hits (legacy single-polygon path)", { skip: "Wave 2 (29-04) not landed yet" }, () => {
         const hits = grepRecursive(join(REPO_ROOT, "src"), /\bplayAreaPolygon\b/);
         assert.equal(hits.length, 0, `expected 0 hits, found:\n${hits.join("\n")}`);
       });
       test("W2: deletedRoomIds has zero src/ hits (if Wave 1 audit confirms REDUNDANT)", { skip: "Wave 2 (29-04) gated on audit verdict" }, () => {
         const hits = grepRecursive(join(REPO_ROOT, "src"), /\bdeletedRoomIds\b/);
         assert.equal(hits.length, 0, `expected 0 hits, found:\n${hits.join("\n")}`);
       });
       ```
    5. End of file — no other assertions.

    DO NOT remove the `skip` gates. Wave 2 plans (29-02, 29-03, 29-04) will remove
    them as part of their own cleanup commits.
  </action>
  <verify>
    <automated>node --test test/phase-29-dead-grep.test.mjs 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - File exists at exact path `test/phase-29-dead-grep.test.mjs`
    - `node --test test/phase-29-dead-grep.test.mjs` exits 0
    - Output reports `tests 6` (1 liveness + 5 skipped DEAD-field checks)
    - Output reports `pass 1`, `fail 0`, `skipped 5` (or equivalent count)
    - File contains the literal string `grepRecursive` (helper defined)
    - File contains 5 distinct `skip:` markers, one per DEAD field
  </acceptance_criteria>
  <done>Scaffold compiles, suite green, 5 future assertions parked behind skip gates.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create test/phase-29-purge.test.mjs + test/phase-29-sound-migration.test.mjs scaffolds</name>
  <read_first>
    - test/_helpers.mjs (for withTempDir / writeJsonFile / readJsonFile)
    - .planning/phases/phase-29/29-RESEARCH.md §"Boot-Time Migration Recipe (Wave 3)" + §"animationSoundMap Migration Recipe (D-03)" (lines 532-663)
  </read_first>
  <files>test/phase-29-purge.test.mjs, test/phase-29-sound-migration.test.mjs</files>
  <behavior>
    purge.test.mjs:
    - Liveness: `test("scaffold: phase-29-purge loads", ...)`.
    - Skipped: idempotence test — invoke `purgeDeadFieldsOnBoot` (Wave 3 helper) on a
      temp dir twice; assert disk state byte-identical after second run.
    - Skipped: strip semantics — fixture board JSON with 4 DEAD fields → run purge → assert
      DEAD fields gone, LIVE fields preserved.
    - Skipped: malformed JSON tolerance — fixture broken JSON → run purge → assert no throw,
      file untouched.

    sound-migration.test.mjs:
    - Liveness: `test("scaffold: phase-29-sound-migration loads", ...)`.
    - Skipped: copy-when-empty — fixture animation with empty `soundAssetRef` + map entry →
      assert per-animation ref filled with map value.
    - Skipped: skip-on-conflict — fixture animation with already-set `soundAssetRef` + map
      entry → assert per-animation ref UNCHANGED.
    - Skipped: drop-orphan — fixture animation that does NOT match any map type → assert no
      change to that animation; map entry silently dropped after migration.
  </behavior>
  <action>
    **`test/phase-29-purge.test.mjs`:**

    Standard imports (`test`, `assert/strict`, `readFile/writeFile/mkdir` from `node:fs/promises`,
    `join` from `node:path`, helpers from `./_helpers.mjs`).

    Liveness test passes immediately:
    ```javascript
    test("scaffold: phase-29-purge loads", () => assert.equal(1, 1));
    ```

    Three skipped tests with full fixture setup written but `skip: "Wave 3 (29-05) not landed"`.

    Test 1 — idempotence:
    ```javascript
    test("W3: purgeDeadFieldsOnBoot is idempotent", { skip: "Wave 3 (29-05) not landed yet" }, async () => {
      await withTempDir("phase-29-purge-idem", async (dir) => {
        const boardPath = join(dir, "boards", "test-a.json");
        const fixture = {
          schema: "tt-beamer.board.v2",
          boardId: "test-a",
          metadata: { name: "Test A" },
          roomCatalog: [],
          roomClusters: [],
          hiddenRoomNames: {},
          roomStateProfiles: { "room-1": { broken: false } },
          playAreaPolygon: [[0, 0], [1, 0], [1, 1], [0, 1]],
          playAreas: [{ id: "play-1", polygon: [[0, 0], [1, 0]] }],
          lastUsedProfileName: "Main",
        };
        await writeJsonFile(boardPath, fixture);
        // Will be replaced when Wave 3 exports purgeBoardFile from a testable module.
        // Placeholder: assert.fail("Wave 3 helper not exported yet");
        assert.fail("Wave 3 helper not exported yet — this test is skip-gated");
      });
    });
    ```

    Test 2 — strip semantics + LIVE preservation:
    ```javascript
    test("W3: purgeBoardFile drops DEAD fields, preserves LIVE fields", { skip: "Wave 3 (29-05) not landed yet" }, async () => {
      assert.fail("Wave 3 helper not exported yet — this test is skip-gated");
    });
    ```

    Test 3 — malformed JSON tolerance:
    ```javascript
    test("W3: purgeBoardFile skips malformed JSON without throwing", { skip: "Wave 3 (29-05) not landed yet" }, async () => {
      assert.fail("Wave 3 helper not exported yet — this test is skip-gated");
    });
    ```

    **`test/phase-29-sound-migration.test.mjs`:**

    Same import pattern. Liveness + three skipped tests:

    Test 1 — copy-when-empty:
    ```javascript
    test("W3: migrateAnimationSoundMap copies map value to empty soundAssetRef", { skip: "Wave 3 (29-05) not landed yet" }, async () => {
      // Fixture: board.outsideFx.animations[0].type === "alarm", soundAssetRef === ""
      // global-defaults.animationSoundMap === { "alarm": "/sounds/alarm.mp3" }
      // After migration: animation.soundAssetRef === "/sounds/alarm.mp3"
      assert.fail("Wave 3 migration helper not exported yet — this test is skip-gated");
    });
    ```

    Test 2 — skip-on-conflict:
    ```javascript
    test("W3: migrateAnimationSoundMap does NOT overwrite an already-set soundAssetRef", { skip: "Wave 3 (29-05) not landed yet" }, async () => {
      // Fixture: animation.soundAssetRef === "/sounds/custom.mp3" (not "none", not empty)
      // global-defaults.animationSoundMap === { "alarm": "/sounds/alarm.mp3" }
      // After migration: animation.soundAssetRef remains "/sounds/custom.mp3"
      assert.fail("Wave 3 migration helper not exported yet — this test is skip-gated");
    });
    ```

    Test 3 — drop-orphan:
    ```javascript
    test("W3: migrateAnimationSoundMap silently drops orphan map entries", { skip: "Wave 3 (29-05) not landed yet" }, async () => {
      // Fixture: NO board has any animation of type "obsolete-type"
      // global-defaults.animationSoundMap === { "obsolete-type": "/sounds/old.mp3" }
      // After migration: no animation got a new soundAssetRef; the map entry is just gone.
      assert.fail("Wave 3 migration helper not exported yet — this test is skip-gated");
    });
    ```
  </action>
  <verify>
    <automated>node --test test/phase-29-purge.test.mjs test/phase-29-sound-migration.test.mjs 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - Both files exist at exact paths
    - `node --test test/phase-29-purge.test.mjs test/phase-29-sound-migration.test.mjs` exits 0
    - purge file: `tests 4` (1 live + 3 skipped); `fail 0`
    - sound-migration file: `tests 4` (1 live + 3 skipped); `fail 0`
    - Each skipped test has the literal `assert.fail(...)` body so when the
      Wave-3 plan removes the skip gate the test MUST FAIL until production helper
      is wired in
    - Each file imports from `./_helpers.mjs`
  </acceptance_criteria>
  <done>Two scaffold files committed, suite green, 6 future assertions parked.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Create test/bundle-schema.test.mjs scaffold + extend test/board-profile-fields.test.mjs</name>
  <read_first>
    - test/board-profile-fields.test.mjs (full file)
    - .planning/phases/phase-29/29-RESEARCH.md §"Bundle Schema Bump Recipe (D-04, Wave 4)" (lines 664-733)
    - server.mjs lines 28-58 (BOARD_PACKAGE_SCHEMA + BOARD_PROFILE_FIELDS)
  </read_first>
  <files>test/bundle-schema.test.mjs, test/board-profile-fields.test.mjs</files>
  <behavior>
    bundle-schema.test.mjs:
    - Liveness test.
    - Skipped: constant value bump → asserts `BOARD_PACKAGE_SCHEMA` literal in `server.mjs`
      reads `"tt-beamer.board-package.v4"`.
    - Skipped: v3-rejected → asserts the import-handler block at line 3392 wraps the
      400-response in the new `code: "SCHEMA_OUTDATED"` shape.
    - Skipped: export-filter → asserts `filterBoardToLiveFields` exists in `server.mjs` and
      is referenced inside the export-handler block.

    board-profile-fields.test.mjs (extension only — DO NOT touch existing tests):
    - Append ONE new skipped test that enumerates the post-Wave-2 expected
      BOARD_PROFILE_FIELDS contents:
      `["hitareaCalibration", "roomGeometry", "specialPolygons", "playAreas",
        "selectedPlayAreaId", "outsideFx", "insideFx", "roomFx",
        "defaultAnimations", "frozenRooms", "lastUsedProfileName"]`
    - Skip note: "Wave 2 (29-02..29-04) not landed — list still has DEAD fields".
    - The assertion uses regex extraction over `server.mjs` so it does not require
      importing the (browser-IIFE-style) module.
  </behavior>
  <action>
    **`test/bundle-schema.test.mjs`:**

    Imports + liveness as in Task 1/2. Then:

    ```javascript
    test("W4: BOARD_PACKAGE_SCHEMA constant bumped to v4", { skip: "Wave 4 (29-06) not landed yet" }, () => {
      const src = readFileSync(join(REPO_ROOT, "server.mjs"), "utf8");
      assert.match(
        src,
        /const BOARD_PACKAGE_SCHEMA = "tt-beamer\.board-package\.v4";/,
        "expected BOARD_PACKAGE_SCHEMA to be the v4 string literal",
      );
    });

    test("W4: bundle import handler emits SCHEMA_OUTDATED on non-v4 manifest", { skip: "Wave 4 (29-06) not landed yet" }, () => {
      const src = readFileSync(join(REPO_ROOT, "server.mjs"), "utf8");
      // Locate the schema-mismatch block (around line 3392) and assert the new error shape.
      assert.match(
        src,
        /code:\s*["']SCHEMA_OUTDATED["']/,
        "expected import handler to emit code: 'SCHEMA_OUTDATED' on schema mismatch",
      );
      assert.match(
        src,
        /Package format outdated/,
        "expected the user-facing error message to include 'Package format outdated'",
      );
    });

    test("W4: filterBoardToLiveFields helper exists and is used in export handler", { skip: "Wave 4 (29-06) not landed yet" }, () => {
      const src = readFileSync(join(REPO_ROOT, "server.mjs"), "utf8");
      assert.match(src, /function filterBoardToLiveFields\(/, "helper must be defined in server.mjs");
      // The export-handler block (currently around server.mjs:3251-3349) must call it
      // before building the manifest.
      const callMatches = src.match(/filterBoardToLiveFields\(/g) || [];
      assert.ok(callMatches.length >= 2, `expected helper to be defined AND called (found ${callMatches.length} occurrences)`);
    });
    ```

    **`test/board-profile-fields.test.mjs` extension:**

    Append a NEW test at the end of the existing file (do not modify existing tests):

    ```javascript
    // ---------------------------------------------------------------------------
    // Phase 29 (Wave 2): post-cleanup BOARD_PROFILE_FIELDS expected contents.
    // The list MUST exactly equal the LIVE-only subset after 29-02..29-04 land.
    // Skipped until those plans complete.
    // ---------------------------------------------------------------------------
    test("Phase-29 W2: BOARD_PROFILE_FIELDS contains only LIVE fields", { skip: "Wave 2 (29-02..29-04) not landed yet" }, () => {
      const src = readFileSync(join(REPO_ROOT, "server.mjs"), "utf8");
      const blockMatch = src.match(/const BOARD_PROFILE_FIELDS = Object\.freeze\(\[([\s\S]*?)\]\);/);
      assert.ok(blockMatch, "BOARD_PROFILE_FIELDS block must be findable");
      const fieldNames = Array.from(blockMatch[1].matchAll(/"([a-zA-Z0-9_]+)"/g)).map((m) => m[1]);

      const expected = new Set([
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
        "lastUsedProfileName",
      ]);
      const dropped = new Set(["deletedRoomIds", "hiddenRoomNames", "roomStateProfiles", "playAreaPolygon"]);

      const actual = new Set(fieldNames);
      for (const field of expected) {
        assert.ok(actual.has(field), `BOARD_PROFILE_FIELDS must still contain LIVE field "${field}"`);
      }
      for (const field of dropped) {
        assert.ok(!actual.has(field), `BOARD_PROFILE_FIELDS MUST NOT contain DEAD/REDUNDANT field "${field}"`);
      }
    });
    ```

    DO NOT modify existing line numbers or behaviour of the prior two tests; only append.
  </action>
  <verify>
    <automated>node --test test/bundle-schema.test.mjs test/board-profile-fields.test.mjs 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - `test/bundle-schema.test.mjs` exists with 4 tests (1 live + 3 skipped); `fail 0`
    - `test/board-profile-fields.test.mjs` now has 4 tests total (3 existing + 1 new skipped); `fail 0`
    - The pre-existing 3 tests in `board-profile-fields.test.mjs` are byte-unchanged
      (verify with `git diff --stat` showing only additions)
    - Each skip gate references the Wave / plan that owns the un-skip
    - Suite-wide assertion: `node --test test/` reports `pass >= 25 + 1` (the new
      live scaffold liveness from this task)
  </acceptance_criteria>
  <done>bundle-schema scaffold committed; board-profile-fields extended; full suite green.</done>
</task>

</tasks>

<verification>
After all 3 tasks complete:

```bash
node --test test/ 2>&1 | tail -10
```

Expected: `pass >= 28` (25 prior + 3 new liveness scaffolds), `fail 0`, `skipped` count
includes the 14 future-gated assertions (5 dead-grep + 3 purge + 3 sound + 3 bundle).
</verification>

<success_criteria>
- All 4 new test files exist
- board-profile-fields.test.mjs extended (existing tests untouched)
- `node --test test/` exits 0
- Zero `fail`
- Future-gated assertions are present and skip-gated with the OWNING wave/plan
  identifier in the skip reason
</success_criteria>

<output>
After completion, create `.planning/phases/phase-29/29-W0-SUMMARY.md` with:
- Files created (paths)
- Suite count before / after (from `node --test test/ 2>&1 | tail -5`)
- List of skip-gates parked, one line per gate, in the format:
  `- test/<file>:<test-name> — gated on Wave N (29-NN)`
</output>