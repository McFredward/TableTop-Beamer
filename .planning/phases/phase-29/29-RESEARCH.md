# Phase 29: Persistence Audit & Legacy Cleanup — Research

**Researched:** 2026-05-05
**Domain:** Persistence-Schema-Audit + Source-Tree-Cleanup + Boot-Time-Disk-Migration + Bundle-Schema-Bump
**Confidence:** HIGH (every claim below is grep/code-verified against the working tree on master)

## Summary

Phase 29 ist ein nicht-funktionaler Cleanup-Pass über vier persistierte JSON-Schemas
(`config/global-defaults.json`, `config/boards/<id>.json`, `config/projection-profiles.json`,
`config/asset-manifest.json`). Die Arbeit ist mechanisch und hat klar abgegrenzte
Risiken — Pre-Release ohne Backwards-Compat, vorhandene 25/25-Test-Suite als
Regression-Sicherheitsnetz, etablierter `ensureAssetManifestOnBoot()`-Pattern aus
Phase 28 als direkte Vorlage für die Boot-Time-Disk-Migration.

Die Code-Spurung hat fünf eindeutige DEAD/REDUNDANT-Befunde ergeben (`hiddenRoomNames`,
`roomStateProfiles`, `animationSoundMap`, `playAreaPolygon`, `deletedRoomIds`); zwei
weitere Felder (`roomGeometry`, `hitareaCalibration`) sind LIVE aber das Phase-26-
Migrations-Pipeline-Plumbing ist tot und kann mitgestrafft werden.

**Primary recommendation:** Wave 1 als 1 Audit-Doku (`29-AUDIT.md`) emittieren; Wave 2
als 1 Plan pro DEAD-Feld-Gruppe (5 Pläne) damit jeder Code-Cleanup-Schritt eine eigene
grüne Test-Suite-Freigabe bekommt; Wave 3 als 1 Plan mit `purgeDeadFieldsOnBoot()`
inline in `server.mjs` direkt vor `attachLiveWebSocket(server)`; Wave 4 als 1 Plan
für den v3→v4 Schema-Bump inkl. Filter im Bundle-Export-Handler.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Audit-Methodik**

- **D-01: DEAD = "Render-and-UI-traceable" Definition.** Ein Feld
  ist DEAD wenn ALLE folgenden gelten:
  1. Keine Funktion in der Draw-Loop oder den Render-Modulen
     (`runtime-draw-loop.js`, `runtime-effect-visuals.js`,
     `runtime-outside-mp4.js`, `runtime-gif-playback.js`,
     `runtime-polygon-editor`, `runtime-room-management.js`)
     liest den Wert für sichtbares Rendering.
  2. Keine UI-Komponente (Animation Editor, FX-Panels, Room-Editor,
     Settings-Tab) bindet den Wert an einen Input-Element oder Display.

  **Read-Pfade die nur in Normalizers / Default-Buildern / get-Accessoren
  existieren OHNE weiteren Konsum** zählen NICHT als LIVE — sie sind
  Plumbing ohne Effekt.

**Cleanup-Sequenz**

- **D-02: Source first, then disk one-shot.**
  - Wave 1: Audit-Doku (`29-AUDIT.md`) mit Klassifikation pro Feld.
  - Wave 2: Source-Tree-Cleanup pro Feld-Gruppe — read-Pfade,
    write-Pfade, normalizers, defaults, BOARD_PROFILE_FIELDS-Liste.
    Test-Suite muss zwischen Waves grün bleiben.
  - Wave 3: Disk-Cleanup als one-shot Server-Boot-Migration:
    beim Boot werden alle `config/boards/*.json` und
    `config/global-defaults.json` durchlaufen; DEAD-Felder werden
    entfernt; Files atomar zurückgeschrieben.
  - Wave 4: Bundle-Schema v3 → v4 (siehe D-04).

  Quergriff über Waves: keine Dependency-Cycles; jede Wave hinterlässt
  ein konsistentes System.

**animationSoundMap-Migration**

- **D-03: Lossless migration → drop.** Vor dem Löschen des
  `animationSoundMap`-Felds in `global-defaults.json`:
  1. Pro Eintrag im Map (`type → soundAssetRef`) prüfen: gibt es eine
     passende Animation-Definition (über alle Boards: `outsideFx.animations`,
     `roomFx.animations`, `insideFx.animations`)?
  2. Wenn ja UND deren `soundAssetRef` ist leer/`"none"`: Map-Wert in
     diese Animation-Slots kopieren.
  3. Wenn keine passende Animation existiert: Eintrag verwerfen
     (orphaned mapping, kein verwendbares Asset mehr).
  4. **Erst danach** das Map-Field `animationSoundMap` aus
     `global-defaults.json` entfernen + `state.animationSoundMap` aus
     dem Runtime-State entfernen + `runtime-audio.js` auf direkte
     Animation-Definition-Lookups umbauen.

  **Out-of-scope:** Migration für /output/-Clients, die alte localStorage-
  Caches haben. /output/ läuft über server-broadcast (keine localStorage-
  Persistenz seit Phase 13), daher kein Cache-Issue erwartet.

**Bundle-Schema-Bump**

- **D-04: BOARD_PACKAGE_SCHEMA v3 → v4.** Beim Bundle-Export wird
  Schema "tt-beamer.board-package.v4" emittiert. Beim Import:
  - v4 → akzeptiert
  - v3 (oder älter) → 400 Bad Request mit klarer Fehlermeldung
    *"Package format outdated (schema=v3). Re-export from a v0.29+
    server."*
  - Schema-Bump signalisiert die strukturelle Änderung; alte Packages
    werden erkennbar abgelehnt anstatt mit verlorenen Feldern still
    zu importieren.

**Klassifikations-Hypothesen (zu verifizieren in Wave 1 Audit)**

- **D-05: Verdachts-Liste.** Wave 1 Audit muss diese Felder explizit
  klassifizieren:

  **DEAD-Verdacht:** `hiddenRoomNames` (board), `roomStateProfiles` (board),
  `animationSoundMap` (global), `playAreaPolygon` (board).

  **LIVE-Verdacht aber post-Phase-26 hinterfragbar:** `deletedRoomIds` /
  `roomTombstones` (board).

  **Alle übrigen Felder** (`outsideFx`, `insideFx`, `roomFx`,
  `roomGeometry`, `hitareaCalibration`, `specialPolygons`, `frozenRooms`,
  `selectedPlayAreaId`, `playAreas`, `defaultAnimations`,
  `lastUsedProfileName`, `assetManifest`, `renderMode`,
  `diagnosticOverlay`, `animationSpeed`, `audio`,
  `mp4Performance`) — als LIVE annehmen, im Audit verifizieren,
  drop nur bei eindeutigem "kein Renderer + keine UI"-Befund.

**Disk-Migration-Sicherheitsnetz**

- **D-06: Hard delete.** Pre-Release; git history ist das
  Sicherheitsnetz. Keine `_legacy.json`-Quarantäne, keine Feature-Flag-
  Rückwege. Bei Server-Boot wird direkt geschrieben.
  Backup-Strategie: das `git status`-Diff der Config-JSONs nach dem
  Boot-Migration-Run wird einmalig ins Phase-Closure-SUMMARY notiert.

**Bundle-Handler-Sync**

- **D-07: Bundle-Export emittiert nur LIVE-Felder.** Im Export-Handler
  (`server.mjs:3251+`) wird der `board`-Payload vor dem Zip-Build
  durch denselben Cleanup-Filter geleitet wie die Disk-Migration.

- **D-08: Bundle-Import schreibt nur LIVE-Felder.** Im
  `normalizeBoardDefinition` (`server.mjs:1944+`) wird die
  `BOARD_PROFILE_FIELDS`-Liste auf den schlanken Set reduziert.

### Claude's Discretion

- **D-09:** Exakte Wave-Granularität (1 Plan pro Feld-Gruppe vs. 1 Plan pro Wave).
- **D-10:** Migration-Script-Form — separates Modul oder inline in `server.mjs`.
- **D-11:** Test-Coverage-Erweiterungen — Tests anpassen vs. entfernen.

### Deferred Ideas (OUT OF SCOPE)

- **Generelle Schema-Versioning-Strategie** für post-Release-Migrationen.
- **Multi-Tenant-Daten-Isolation.**
- **Asset-Manifest-Sub-Cleanup.**
</user_constraints>

## Project Constraints (from CLAUDE.md)

`./CLAUDE.md` does not exist in the repo — no top-level project conventions are imposed
beyond the per-phase CONTEXT and ROADMAP. The git-tracked file under
`.planning/.../CLAUDE.md` references in commits/SUMMARY are tooling artifacts, not
binding directives.

## Standard Stack

Phase 29 produziert keinen neuen Code in fremden Domänen — der Stack ist der
existierende Code des Projekts. Keine neuen Library-Installationen.

### Core (existing — verified in repo)

| Asset | Version | Purpose | Why Standard |
|-------|---------|---------|--------------|
| Node.js builtin `--test` runner | v24.13.1 | Test-Suite-Driver | [VERIFIED: `node --version` + `package.json` test script] Etabliert in Phase 28 W0; 25/25 tests grün. |
| `test/_helpers.mjs` | repo-local | `readJsonFile`, `writeJsonFile`, `withTempDir` | [VERIFIED: file exists at `/home/claw/tt-beamer/test/_helpers.mjs`] Genutzt von 8 active test files. |
| `JSON.stringify(value, null, 2) + "\n"` | builtin | Atomic JSON write | [VERIFIED: `server.mjs:1599`, `:1976`, `:2185`] Konsistenter Style; keine Library nötig. |
| `node:fs/promises` `readFile`/`writeFile`/`readdir`/`mkdir` | builtin | Disk-IO | [VERIFIED: imported at `server.mjs` top] Dieselben APIs wie Phase 28 nutzte. |

### Supporting (existing — also no new install)

| Asset | Version | Purpose | When to Use |
|-------|---------|---------|-------------|
| `BOARD_PROFILE_FIELDS` Object.freeze | `server.mjs:39-58` | Single source of truth für per-Board-Persistenz-Felder | Wave 2 ändert hier die Liste; alle iterierenden Pfade folgen automatisch. |
| `extractProfileFromUnifiedBoard` | `server.mjs:60-75` | Read-side projector | Wird vom Cleanup automatisch befolgt — kein direkter Edit nötig. |
| `persistBoardProfileToBoardFile` | `server.mjs:2153-2187` | Write-side projector | Wird vom Cleanup automatisch befolgt. |
| `normalizeBoardDefinition` | `server.mjs:1944-2031` | Server-side import normalizer | Iteriert `BOARD_PROFILE_FIELDS`; folgt automatisch. |
| `synthesizeBoardProfiles` | `server.mjs:2140-2147` | Build the GET /api/global-defaults boardProfiles map | Folgt automatisch. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline `purgeDeadFieldsOnBoot()` in `server.mjs` | Separate `lib/migrations/phase-29-purge.mjs` module | Inline ist Phase-28-Pattern (`ensureAssetManifestOnBoot` ist 30 LOC inline); separates Modul wäre für eine one-shot pre-release Migration overkill. **Recommendation: inline.** |
| Hard delete | `_legacy.json` Quarantäne | D-06 sperrt Hard-Delete. Git history ist sicher genug für Pre-Release. |
| Schema v4 + `migrationCompatible` flag | Nur v4 mit Hard-Reject | D-04 sperrt Hard-Reject. |

**Installation:** keine.

**Version verification:** keine externen Versionen — alle Tools sind Repo-lokal oder Node-builtin.

## Architecture Patterns

### Recommended Project Structure (existing — no relocation)

```
server.mjs                          # All server-side persistence here. Inline boot hook.
src/app/runtime/state/
  runtime-board-profiles.js         # Client-side state hydration (applyBoardProfilesToState).
  runtime-board-state-accessors.js  # get/set helpers (DEAD: getRoomStateProfile/setRoomStateProfile).
  runtime-play-area-geometry.js     # Tombstone + playAreaPolygon legacy reads here.
src/app/runtime/render/
  runtime-audio.js                  # animationSoundMap fallback consumer.
src/app/lib/persistence/
  board-profiles.js                 # Legacy migration layer; will be partially gutted.
src/app/lib/state/runtime-state.js  # Initial state shape.
src/app/runtime/core/runtime-bootstrap.js  # Default-builders for state slices.
test/                                # node --test suite, 25/25 green.
config/                              # The four target JSONs.
```

### Pattern 1: Boot-time idempotent migration via `ensureXxxOnBoot()`

**What:** A single async function that runs synchronously after server module load,
before `server.listen()`, that walks on-disk JSON, mutates it, atomically writes back.

**When to use:** One-shot pre-release schema cleanups where re-running yields identical
output (idempotence is the safety net — boot 1 mutates, boot 2..N are no-ops).

**Example (existing template):**
```javascript
// Source: server.mjs:2347-2362 (ensureAssetManifestOnBoot)
async function ensureAssetManifestOnBoot() {
  const existing = await loadAssetManifest();
  const synthesized = await synthesizeAssetManifestFromDisk();
  for (const [url, entry] of Object.entries(synthesized.hashByPath)) {
    const prior = existing.hashByPath?.[url];
    if (prior && prior.hash === entry.hash && prior.mtime) {
      entry.mtime = prior.mtime;
    }
  }
  await saveAssetManifest(synthesized);
  runtimeAssetManifest = synthesized;
  console.log(`[asset-manifest] ready (${Object.keys(synthesized.hashByPath).length} entries)`);
}

// And the call site (server.mjs:3777):
try {
  await ensureAssetManifestOnBoot();
} catch (error) {
  console.warn("[asset-manifest] boot synthesis failed (continuing without manifest):", error?.message || error);
}
```

**Mirror this for Phase 29's `purgeDeadFieldsOnBoot()`:**
```javascript
// Recommended shape (Wave 3):
async function purgeDeadFieldsOnBoot() {
  const DEAD_BOARD_FIELDS = [
    "hiddenRoomNames",
    "roomStateProfiles",
    "playAreaPolygon",      // redundant with playAreas[]
    "deletedRoomIds",       // see Audit §5; if classified DEAD
  ];
  const DEAD_GLOBAL_FIELDS = ["animationSoundMap"];

  // 1. Run animationSoundMap migration FIRST (D-03 lossless step).
  await migrateAnimationSoundMapToPerAnimationRefs();

  // 2. Purge global-defaults.json.
  await purgeGlobalDefaultsFields(DEAD_GLOBAL_FIELDS);

  // 3. Purge each config/boards/<id>.json.
  for (const boardFile of await readdir(BOARD_STORAGE_DIR)) {
    if (!boardFile.endsWith(".json") || boardFile.startsWith(".")) continue;
    await purgeBoardFile(path.join(BOARD_STORAGE_DIR, boardFile), DEAD_BOARD_FIELDS);
  }

  console.log(`[phase-29-purge] complete (${DEAD_BOARD_FIELDS.length} board fields, ${DEAD_GLOBAL_FIELDS.length} global fields)`);
}

async function purgeBoardFile(filePath, deadFields) {
  let outer;
  try {
    outer = JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return; // skip malformed
  }
  const inner = outer && typeof outer === "object" ? (outer.board ?? outer) : null;
  if (!inner || typeof inner !== "object") return;

  let changed = false;
  for (const field of deadFields) {
    if (Object.prototype.hasOwnProperty.call(inner, field)) {
      delete inner[field];
      changed = true;
    }
  }
  if (!changed) return; // idempotence: don't touch mtime if nothing to do

  if (outer.board) outer.board = inner; else outer = inner;
  await writeFile(filePath, `${JSON.stringify(outer, null, 2)}\n`, "utf8");
}
```

### Pattern 2: BOARD_PROFILE_FIELDS as Single Source of Truth

**What:** A frozen array of field names; all server-side persist/extract code iterates
this list. Removing a field from the list automatically removes it from
`extractProfileFromUnifiedBoard`, `persistBoardProfileToBoardFile`, and
`normalizeBoardDefinition` — three call sites, one edit.

**When to use:** Wave 2 source-cleanup. Removing a per-board field requires:
1. Edit `BOARD_PROFILE_FIELDS` constant (drop the field name).
2. Remove client-side state-slice (e.g. `state.roomStateProfilesByBoard` from `runtime-state.js`).
3. Remove default-builder calls in `runtime-bootstrap.js`.
4. Remove apply-call in `runtime-board-profiles.js:applyBoardProfilesToState`.
5. Remove get/set helpers in `runtime-board-state-accessors.js`.
6. Remove call sites of those helpers (deletion in `runtime-room-management.js` etc.).

**Example existing pattern (server.mjs:2009-2015):**
```javascript
// In normalizeBoardDefinition — iterates BOARD_PROFILE_FIELDS automatically.
const profileExtras = {};
for (const field of BOARD_PROFILE_FIELDS) {
  if (inputBoard?.[field] !== undefined) {
    profileExtras[field] = inputBoard[field];
  }
}
```

### Pattern 3: Atomic JSON write via direct overwrite

**What:** Phase 28 writes JSON files directly via `writeFile(path, content, "utf8")`
without temp+rename. Recovery on partial-write failure is by re-running on next boot
(the migration is idempotent).

**When to use:** Wave 3 boot migration. The `ensureAssetManifestOnBoot()` precedent
uses this — direct write, no temp+rename. Match that style.

**Why no temp+rename:** Phase 28 audit confirmed no atomic-write helper is used in
the codebase for these JSONs (`saveProjectionProfilesRaw` at `server.mjs:1597-1600`
also writes directly). Adding it now would be scope-creep; the boot-time guarantee is
"if a write is half-done, next boot re-runs from the prior good state stored in git."

### Anti-Patterns to Avoid

- **Iterative deletion of one field per cleanup task:** would multiply diff noise.
  Better: one plan per field (Wave 2), each plan deletes the field across all source
  surfaces atomically, runs the test suite, commits.
- **Deleting `lib/persistence/board-profiles.js` wholesale:** Tempting because the
  file is named "legacy" — but `buildMigratedBoardProfiles` is still called by
  `applyGlobalDefaultsPayloadToState` (`runtime-global-defaults.js:395`). Don't drop
  it; trim its DEAD-field handling instead.
- **Touching `BOARD_DEFINITION_SCHEMA` (`tt-beamer.board.v2`):** That's the per-board
  on-disk schema, NOT the bundle package schema. Phase 29 only bumps
  `BOARD_PACKAGE_SCHEMA` (v3 → v4). Leave `BOARD_DEFINITION_SCHEMA` alone.
- **Performing the disk migration before source cleanup:** D-02 sequence is "source
  first, then disk". If disk runs first, the next read tries to apply a profile
  without the field, default-builders fill in zeros, and the user might see a
  cosmetic regression. Source-first means by the time the on-disk read happens,
  nobody is asking for the field.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON file rewrite | Custom `temp+rename` | Direct `writeFile` (idempotent boot) | Phase 28 precedent — atomicity guaranteed by boot-time replay, not file-system primitives. |
| Schema validation in import handler | Custom JSON-schema validator | Existing string-equality check (`schema !== BOARD_PACKAGE_SCHEMA`) | `server.mjs:3392` already does exactly this; just bump the constant + error message. |
| Field-by-field grep | Custom AST tool | `grep -rn "<field>"` | Phase 28 W0 audit pattern; works on this codebase because field names are unique strings. |
| Boot-time orchestration | Custom event bus / state machine | Top-level `await` block in `server.mjs` before `server.listen()` | Phase 28 `ensureAssetManifestOnBoot()` is 1 try/catch block; mirror it. |
| Legacy migration layer | Build new translator | Trim `lib/persistence/board-profiles.js:buildMigratedBoardProfiles` (lines 110, 118-119, 126) | The translator already reads/normalizes; just stop reading the dead fields. |

**Key insight:** This phase is mostly *deletion* and *constant-bumping*. The
infrastructure is in place. The risk is missing a callsite, not building wrong code.

## Runtime State Inventory (rename / refactor / cleanup)

This phase is a **schema cleanup** — the equivalent of a refactor. Each category must
be answered explicitly.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | (1) `config/global-defaults.json` `animationSoundMap` (10 entries observed in current file) — must be migrated lossless before drop per D-03. (2) `config/boards/<id>.json` × 4 files: each has `roomStateProfiles` (e.g. nemesis-board-a has 8 entries), `hiddenRoomNames` (empty `{}` in current files), `playAreaPolygon` (132-point array per board, redundant with `playAreas[0].polygon`), `deletedRoomIds` (1 entry observed, no overlap with current `roomCatalog`). | (a) D-03 migration script for `animationSoundMap`. (b) Hard-delete the rest in Wave 3 boot migration. |
| **Live service config** | None. The app does not embed `tt-beamer` strings into external services (no n8n, no Datadog, no Tailscale tags). All config is in the four JSONs already covered above. | None. |
| **OS-registered state** | None. No systemd / launchd / Windows Task Scheduler / pm2 saved process names embed any of these field names. | None. |
| **Secrets / env vars** | None. The .env-style configuration carries `HOST`/`PORT` only; no field-name-derived env vars exist. | None. |
| **Build artifacts / installed packages** | None. The runtime is plain ESM `node server.mjs`; no compiled artifacts, no transpilation, no published npm package depending on these field names. | None. |

**Canonical question answered:** *After every file in the repo is updated, what runtime
systems still have the old fields cached or stored?* Answer: only the four JSON files
on disk (`config/global-defaults.json` + 4× `config/boards/*.json`). The Wave 3 boot
migration handles all of them in one pass.

## Per-Field Consumer Trace (Wave 1 Audit Preview)

Each field below has been grep-traced through the production tree
(excluding `test/`). The classifications are PROVISIONAL — the Wave 1 audit must
re-verify each one against D-01 (no Render-Loop reader AND no UI-Binding).

### F1: `hiddenRoomNames` (board) — DEAD (HIGH confidence)

- **server.mjs:53** — single mention in `BOARD_PROFILE_FIELDS`.
- **`src/`** — 0 hits. [VERIFIED: `grep -rn "hiddenRoomNames" src/` returns empty.]
- **On disk:** `config/boards/nemesis-board-a.json` has `"hiddenRoomNames": {}` (empty
  dict in all 4 board files).
- **Test refs:** 0 hits.
- **Action:** Drop from `BOARD_PROFILE_FIELDS`. No source-side cleanup needed (no
  reads/writes). Wave 3 strips from disk.

### F2: `roomStateProfiles` (board, broken/burning/alienCount/corpse) — DEAD (HIGH confidence)

- **Plumbing layer (LIVE but no consumer):**
  - `runtime-board-state-accessors.js:192-201` — `getRoomStateProfile` / `setRoomStateProfile`
    accessors defined.
  - `runtime-orchestration.js:896-897, 1888-1889, 2028-2029` — accessors exposed in 3 ctx-builder maps.
  - `runtime-bootstrap.js:122` — default builder `createDefaultRoomStateProfilesByBoard`.
  - `runtime-state.js:73` — initial state slice `roomStateProfilesByBoard`.
  - `runtime-board-profiles.js:38, 60, 188-193` — apply/synth flow.
  - `runtime-room-management.js:609-610` — delete on room-delete.
  - `runtime-board-switch.js:155-167` — board-switch hydration.
- **Consumers in render / UI / animation:**
  - `runtime-room-management.js:609` only DELETES — doesn't read.
  - **0 consumers** of `getRoomStateProfile` outside the accessor module + ctx-builder
    re-exports. [VERIFIED: `grep -rn "getRoomStateProfile\b\|setRoomStateProfile\b" src/`
    returns only 6 hits, all defining/exposing/exporting, none calling.]
  - **0 mentions** of `broken`/`burning`/`alienCount`/`corpse` in
    `src/app/runtime/render/` or `src/app/runtime/animation/` or
    `src/app/runtime/wire/`. [VERIFIED via grep.]
  - The `config.js` at `src/app/lib/shared/config.js:199-202` defines a default room
    state profile shape but no UI ever reads it.
- **On disk:** all 4 board files have populated `roomStateProfiles` (8 entries in
  `nemesis-board-a`).
- **Action:** Wave 2 plan removes:
  - `getRoomStateProfile`, `setRoomStateProfile`, `roomStateProfilesByBoard` (state slice
    + default builder + bootstrap init + apply path + ctx-builder re-exports).
  - `normalizeRoomStateProfile`, `createDefaultRoomStateProfileMap`, `normalizeRoomStateProfileMap`
    helpers (search for these to find supporting functions).
  - The `delete` call in `runtime-room-management.js:609-610`.
  - The `roomStateProfiles` entry from `BOARD_PROFILE_FIELDS`.
  - The `roomStateProfiles` reads in `lib/persistence/board-profiles.js:54, 118-119`.

### F3: `animationSoundMap` (global) — REDUNDANT (HIGH confidence)

- **Code refs:** [VERIFIED] 14 hits across 8 files.
  - **State slice:** `runtime-state.js:51`, `runtime-bootstrap.js:139`.
  - **Apply path:** `runtime-global-defaults.js:421-422`,
    `runtime-board-profiles.js:93, 141-142`.
  - **Read path (FALLBACK):** `runtime-audio.js:256, 330, 383-386` — playSoundForAnimation
    prefers `animation.soundAssetRef` (per-animation, set by `runtime-animation-factory.js:54-55`)
    and falls back to `animationSoundMap[type]` only when the per-animation ref is empty.
  - **Read path (display):** `runtime-audio.js:330` reads it for the audio-mapping panel
    sync — BUT the panel's DOM elements (`#audio-mapping-animation`, `#audio-mapping-sound`,
    `#audio-mapping-status`) **DO NOT EXIST in `index.html`** [VERIFIED: `grep -n "audio-mapping" index.html` returns 0 hits].
    The DOM-ref query selectors (`runtime-dom-refs.js:124-125`) return `null`, the
    sync function early-returns at line 323. The "UI binding" exists in code but is
    bound to nothing rendered.
  - **Write path:** `runtime-wire-room-audio-binders.js:451` (writes back to
    `state.animationSoundMap` from a select-change listener — but the select doesn't
    exist in DOM, so this listener is also dead).
  - **Polygon-metrics:** `runtime-polygon-metrics.js:23` — reads `animationSoundMap[animationType]`
    inside what looks like a metrics calculation. Need to verify Wave 1 whether this
    reaches an actual visible output.
- **On disk:** `config/global-defaults.json` has 10 entries (hull-flicker, intruder-alert,
  power-outage, etc.).
- **Migration (D-03):** Lossy fallback chain means the per-animation `soundAssetRef`
  on `outsideFx.animations[]`, `roomFx.animations[]`, `insideFx.animations[]` is the
  authoritative source. The map is redundant. Migration strategy in §"Migration
  Recipe" below.
- **Action:** Wave 2 plan:
  - Run D-03 migration as a Wave 3 boot step (BEFORE field deletion, see §"Migration Recipe").
  - Strip the dead audio-mapping panel code (`syncAudioMappingStatus`, `syncAudioMappingPanel`,
    the unreachable event listeners in `runtime-wire-room-audio-binders.js:438-462`).
  - Strip the `runtime-audio.js:330, 383-386` map fallback chain (per-animation ref becomes mandatory).
  - Strip `state.animationSoundMap` slice + `normalizeAnimationSoundMap`.
  - Strip the `runtime-polygon-metrics.js:23` read (verify what it computes — likely also dead).

### F4: `playAreaPolygon` (board) — REDUNDANT (HIGH confidence)

- **Authoritative path:** `playAreas[]` is the source of truth. `getShipPolygonPoints()`
  in `runtime-play-area-geometry.js:410` reads `getSelectedPlayArea()?.polygon` —
  i.e. `state.playAreasByBoard[boardId][selectedPlayAreaId].polygon`. **NOT
  `playAreaPolygon`.** [VERIFIED: source code at line 410-412.]
- **`playAreaPolygon` reads:**
  - `runtime-play-area-geometry.js:166-169, 198, 217-235, 245` — fallback chain in
    `mergePolygonPrecedence` and `resolveProfilePolygonContract`. These are migration
    helpers from older schemas where `playAreaPolygon` was the only field; with
    `playAreas[]` always populated post-Phase-26, the `??` chain never resolves to it.
  - `runtime-board-profiles.js:42, 68, 238` — synthesis writes `playAreaPolygon` to
    profile output (so on-disk JSONs gain the redundant field on every save).
  - `polygon-contract.js:261, 267, 269-270, 276, 278, 344` — fallback chain.
  - `lib/persistence/board-profiles.js:51, 88, 95, 97, 126` — legacy migration.
- **On disk:** all 4 board files have `playAreaPolygon` populated (132 points each)
  AND `playAreas[]` populated (1 entry, identical polygon). Pure duplication.
- **Render reads:** [VERIFIED via `grep -rn "playAreaPolygon" src/app/runtime/render/`]
  ZERO direct reads. Render uses `getPlayAreaPolygonsPixels` →
  `getPlayAreas(boardId)` → `state.playAreasByBoard`.
- **Action:** Wave 2 plan strips the field from synthesis (`runtime-board-profiles.js:42,
  68, 238`), strips the fallback chain in `polygon-contract.js` and
  `runtime-play-area-geometry.js`, strips the `lib/persistence/board-profiles.js`
  reads, drops from `BOARD_PROFILE_FIELDS`.

### F5: `deletedRoomIds` / `roomTombstones` (board) — REDUNDANT (MEDIUM confidence — verify in audit)

- **Phase 26 changed the model:** rooms are now removed directly from `roomCatalog[]`
  in the unified board JSON. `markRoomTombstone()` still appends to
  `state.roomTombstonesByBoard[boardId]` on every delete (`runtime-room-management.js:619`).
- **Filter logic still active:**
  - `runtime-play-area-geometry.js:139-143` — `filterRoomCatalogByDeletedIds` filters
    out tombstoned rooms from the catalog at apply time.
  - But the on-disk evidence shows ZERO overlap: `nemesis-board-a.json` has
    `deletedRoomIds: ["room-50"]` and 66 rooms in `roomCatalog`, none of which is
    `room-50`. **The filter is a no-op in practice** because Phase 26's
    `runtime-room-management` already removes the room from `roomCatalog` before
    calling `markRoomTombstone`.
- **Hydration consumers:**
  - `lib/domain/rooms.js:112` — `mergeRoomCatalog(board, roomCatalog, deletedRoomIds)`
    accepts and uses the list — but its callers always also filter the catalog
    upstream.
  - `runtime-board-profiles.js:161, 180` — apply path.
  - `runtime-board-switch.js:156-170` — board-switch hydration.
- **Undo system uses it:** `runtime-polygon-undo.js:66, 77` calls
  `clearRoomTombstone` / `markRoomTombstone` — implying undo of room-deletion
  resurrects the room; tombstones may track this. **Verify in audit:** when undo
  resurrects a room, does it actually rely on the tombstone, or does it re-add
  to roomCatalog from a separate undo snapshot?
- **Risk:** Removing tombstones might break the undo-redo cycle if undo depends on
  the field for redo. Wave 1 audit must trace the undo flow specifically.
- **Provisional classification:** REDUNDANT-pending-undo-trace. If undo doesn't read
  it, it's safely DEAD. The "no overlap on disk" evidence is strong.
- **Action:** Wave 1 audit task: trace `runtime-polygon-undo.js` for actual reads of
  the tombstone state (vs. just calling the mark/clear functions); decide based on
  that evidence.

### Other Suspicious Plumbing (LIVE field, dead fallback)

The `lib/persistence/board-profiles.js:buildMigratedBoardProfiles` legacy migration
shape (lines 73-167) carries 8+ fallback chains for old field names (`profile.rooms`,
`profile.hitarea`, `profile.geometry`, `profile.shipPolygon`, etc.) — these are
pre-Phase-26 migrations. With Pre-Release scope (D-06: hard delete, no back-compat),
all `??` fallback chains in this file can be straightened into single-source reads.
Recommend including this trim as a sub-task of Wave 2 (it's not a field deletion but
a fallback-chain deletion).

## Boot-Time Migration Recipe (Wave 3)

### Anchor point in server.mjs

```javascript
// server.mjs:3776-3786 — current pattern after Phase 28
try {
  await ensureAssetManifestOnBoot();
} catch (error) {
  console.warn("[asset-manifest] boot synthesis failed (continuing without manifest):", error?.message || error);
}
// → ADD: Phase 29 purge here, AFTER asset manifest, BEFORE server.listen.
try {
  await purgeDeadFieldsOnBoot();
} catch (error) {
  console.warn("[phase-29-purge] failed (continuing):", error?.message || error);
}

server.listen(PORT, HOST, () => { ... });
```

### Function shape (idempotent)

```javascript
async function purgeDeadFieldsOnBoot() {
  // 1. Lossless animationSoundMap → per-animation soundAssetRef migration.
  //    MUST run before the field drop; otherwise we lose existing mappings.
  await migrateAnimationSoundMapOnBoot();

  // 2. Strip dead fields from global-defaults.json.
  await stripDeadFieldsFromGlobalDefaults(["animationSoundMap"]);

  // 3. Strip dead fields from each config/boards/<id>.json.
  const deadBoardFields = [
    "hiddenRoomNames",
    "roomStateProfiles",
    "playAreaPolygon",
    // "deletedRoomIds" — only if Wave 1 audit confirms DEAD
  ];
  for (const file of await listBoardJsonFiles()) {
    await stripDeadFieldsFromBoardFile(file, deadBoardFields);
  }
}
```

### Idempotence guarantee

Each strip function checks `Object.prototype.hasOwnProperty.call(obj, field)` before
deleting; if no field is present (i.e. boot 2..N after first migration), no write
happens, no mtime change. Same pattern as `ensureAssetManifestOnBoot` preserves mtime
when hash matches.

### Atomic write strategy

Match the existing pattern: `await writeFile(filePath, JSON.stringify(value, null, 2) + "\n", "utf8")`.
**No temp+rename** — Phase 28 doesn't do it, so introducing it here would be scope-creep.
The recovery path is: if write fails mid-way, the file is corrupt, but boot N+1 reads
from git's last-good state (developer reverts and re-runs). For a one-shot pre-release
migration this is acceptable (D-06).

### `git status` diff capture (D-06 sicherheitsnetz)

After the first boot post-migration, `git status` will show modified files in
`config/`. The phase-closure SUMMARY captures this diff verbatim so the user can audit
the deletion in one place. No code change for this — purely documentation procedure.

## animationSoundMap Migration Recipe (D-03)

### Algorithm

```javascript
async function migrateAnimationSoundMapOnBoot() {
  const globalDefaults = await readGlobalDefaultsRaw();
  const animationSoundMap = globalDefaults?.animationSoundMap ?? {};
  if (Object.keys(animationSoundMap).length === 0) return; // already migrated

  // Walk every board.
  const boardFiles = await listBoardJsonFiles();
  for (const filePath of boardFiles) {
    const board = await readBoardJson(filePath);
    let modified = false;

    // For each (animationType, soundPath) in the global map:
    for (const [animationType, soundPath] of Object.entries(animationSoundMap)) {
      if (!soundPath || soundPath === "none") continue; // empty mapping

      // Find matching animation in any of the three slots.
      const slots = [
        board.outsideFx?.animations,
        board.roomFx?.animations,
        board.insideFx?.animations,
      ];
      for (const list of slots) {
        if (!Array.isArray(list)) continue;
        for (const def of list) {
          if (def?.type !== animationType) continue;
          const current = String(def.soundAssetRef ?? "").trim();
          if (current && current !== "none") continue; // don't clobber existing
          def.soundAssetRef = soundPath;
          modified = true;
        }
      }
    }

    if (modified) await writeBoardJson(filePath, board);
  }

  // Orphans (entries in map with no matching animation anywhere) are silently dropped.
  // The next step (stripDeadFieldsFromGlobalDefaults) drops the map field entirely.
}
```

### Why this is safe

- **Lossless on collision:** if a per-animation `soundAssetRef` is already set,
  the migration does NOT overwrite it (the map was the LEGACY source; the per-animation
  ref is NEWER and authoritative).
- **Lossy on orphan:** if a map entry has no matching `def.type` anywhere across all
  boards, the mapping is dropped. Per D-03: "orphaned mapping, kein verwendbares
  Asset mehr" — this is acceptable.
- **Idempotent:** boot 2..N find an empty `animationSoundMap` (because the field was
  dropped in step 2 of the same boot run), early-return, no work.

### Order of operations (CRITICAL)

1. `migrateAnimationSoundMapOnBoot()` — copies values to per-animation slots, writes board files.
2. `stripDeadFieldsFromGlobalDefaults(["animationSoundMap"])` — drops the field.
3. `stripDeadFieldsFromBoardFiles([...])` — drops other dead board fields.

Step 1 MUST precede step 2. Step 3 is independent and can run in parallel logically
but linear is simpler.

## Bundle Schema Bump Recipe (D-04, Wave 4)

### Code changes inventory

1. **Constant bump (`server.mjs:30`):**
   ```javascript
   - const BOARD_PACKAGE_SCHEMA = "tt-beamer.board-package.v3";
   + const BOARD_PACKAGE_SCHEMA = "tt-beamer.board-package.v4";
   ```

2. **Import handler error message (`server.mjs:3392-3395`):**
   ```javascript
   const schema = manifest?.schema;
   if (schema !== BOARD_PACKAGE_SCHEMA) {
     // BEFORE: sendJson(res, 400, { ok: false, error: "unrecognized package schema" });
     sendJson(res, 400, {
       ok: false,
       error: `Package format outdated (schema=${schema || "unknown"}). Re-export from a v0.29+ server.`,
       code: "SCHEMA_OUTDATED",
     });
     return;
   }
   ```

3. **Export-side filter (`server.mjs:3251-3349`, before `manifest = {...}` build):**
   ```javascript
   // After: const board = parsed?.board ?? parsed;
   // Filter dead fields out of the exported board (D-07).
   const sanitizedBoard = filterBoardToLiveFields(board);
   // ... then in manifest:
   const manifest = {
     schema: BOARD_PACKAGE_SCHEMA, // → v4
     exportedAt: new Date().toISOString(),
     boardId,
     board: sanitizedBoard, // ← uses filtered board
     // ...
   };
   ```

4. **`BOARD_PROFILE_FIELDS` already trimmed by Wave 2:** Wave 4's `normalizeBoardDefinition`
   automatically rejects-or-strips dead fields because it iterates the trimmed list
   (D-08). No additional change in `normalizeBoardDefinition` itself; it follows
   automatically.

5. **`filterBoardToLiveFields(board)` helper:**
   ```javascript
   function filterBoardToLiveFields(board) {
     if (!board || typeof board !== "object") return board;
     const allowedTopKeys = new Set([
       "schema", "boardId", "metadata",
       "roomCatalog", "roomClusters",
       ...BOARD_PROFILE_FIELDS, // post-Wave-2 trimmed list
     ]);
     const out = {};
     for (const [k, v] of Object.entries(board)) {
       if (allowedTopKeys.has(k)) out[k] = v;
     }
     return out;
   }
   ```

### Verification test

A new test (or augmented `board-json-roundtrip.test.mjs`) asserts:
- `BOARD_PACKAGE_SCHEMA === "tt-beamer.board-package.v4"`.
- A simulated v3 manifest passed to a re-implemented import-validator returns `400`
  with code `SCHEMA_OUTDATED`.
- A simulated v4 manifest with extra (DEAD) fields gets exported with those fields
  stripped.

## Common Pitfalls

### Pitfall 1: Dropping `roomStateProfiles` while undo system still reads it

**What goes wrong:** `runtime-polygon-undo.js` may rely on a complete state snapshot.
Removing `roomStateProfilesByBoard` from state could invalidate snapshots taken before
the cleanup.

**Why it happens:** Undo systems often serialize entire state slices; dropping a slice
mid-session would crash undo replay.

**How to avoid:** Wave 2 plan trims undo-snapshot creation in lockstep with state
slice removal. Server-restart between Wave 2 deploy and first undo invocation is the
implicit reset (single-tenant local app — no in-flight undo to corrupt).

**Warning signs:** `Cannot read property 'broken' of undefined` in browser console
post-deploy.

### Pitfall 2: animationSoundMap migration runs AFTER the field strip

**What goes wrong:** If `stripDeadFieldsFromGlobalDefaults` runs first, the map is
gone before `migrateAnimationSoundMapOnBoot` reads it; all mappings are lost
silently.

**Why it happens:** Order-of-calls is invisible in code; easy to flip.

**How to avoid:** Single explicit ordering in `purgeDeadFieldsOnBoot`. Add a comment
saying "// MIGRATION FIRST; STRIP SECOND — DO NOT REORDER".

**Warning signs:** After first boot post-deploy, animations that had mapped sounds
play silently. Detect via Wave 1 user smoke before final cleanup.

### Pitfall 3: Bundle import handler swallows v3 schemas silently when constant is mid-edit

**What goes wrong:** Developer changes `BOARD_PACKAGE_SCHEMA` constant but forgets to
update the import handler's error message — message says "unrecognized package schema"
without explanation, user can't diagnose.

**Why it happens:** Constant-driven; the comparison still works, only the human-readable
message is stale.

**How to avoid:** D-04 specifies the exact error string. Wave 4 plan task asserts the
import handler emits `SCHEMA_OUTDATED` code. Test in `bundle-schema.test.mjs` (new).

### Pitfall 4: `lib/persistence/board-profiles.js` deletion breaks live-sync hydration

**What goes wrong:** This file is named "legacy" but its `extractBoardProfilesCandidate`
and `buildMigratedBoardProfiles` are called by
`runtime-global-defaults.js:applyGlobalDefaultsPayloadToState` on every snapshot
broadcast.

**Why it happens:** The naming is misleading; "legacy" referred to old localStorage,
but the migration framework was retained for server-payload normalization.

**How to avoid:** Wave 2 trims `buildMigratedBoardProfiles` (drop the `roomStateProfiles`,
`hiddenRoomNames` etc. lines) but keeps the function. Don't delete the file.

**Warning signs:** Snapshot apply throws `TT_BEAMER_PERSISTENCE.buildMigratedBoardProfiles is not a function`.

### Pitfall 5: Phase 28 `lastUsedProfileName` regression

**What goes wrong:** Wave 2 cleanup of `BOARD_PROFILE_FIELDS` accidentally drops
`lastUsedProfileName` (added in Phase 28 W1). Per-board auto-load breaks.

**Why it happens:** The list is being shortened; off-by-one or wrong field name in
the diff.

**How to avoid:** Wave 2 plan explicitly enumerates "fields to keep" and "fields to
drop". Existing test `board-profile-fields.test.mjs` at line 56 asserts presence of
`lastUsedProfileName` — will fail if dropped.

**Warning signs:** Test failure at `board-profile-fields.test.mjs:56`.

### Pitfall 6: Phase 28 asset-manifest broadcast piggy-back regression

**What goes wrong:** The Wave 3 boot migration writes `config/global-defaults.json`,
which would normally trigger a `global-config-update` broadcast. But Wave 3 runs
BEFORE `attachLiveWebSocket`, so `broadcastLiveSession` doesn't exist yet — silent
no-op (correct behavior).

**Why it concerns:** Need to confirm `broadcastLiveSession` calls in the migration
write path are guarded. They are: `loadGlobalDefaults` does NOT broadcast; only
`saveGlobalDefaults` does (`server.mjs:3046+`). Boot migration uses direct `writeFile`,
bypasses the broadcast — by design.

**How to avoid:** Don't reuse `saveGlobalDefaultsRaw` for boot migration; use direct
`writeFile`. Phase 28's `ensureAssetManifestOnBoot` already establishes this pattern.

## Code Examples

### Existing pattern: BOARD_PROFILE_FIELDS iteration (verified in repo)

```javascript
// Source: server.mjs:60-75
function extractProfileFromUnifiedBoard(board) {
  if (!board || typeof board !== "object") return {};
  const profile = {};
  if (Array.isArray(board.roomCatalog)) profile.roomCatalog = board.roomCatalog;
  if (Array.isArray(board.roomClusters)) profile.roomClusters = board.roomClusters;
  for (const field of BOARD_PROFILE_FIELDS) {
    if (board[field] !== undefined) {
      profile[field] = board[field];
    }
  }
  return profile;
}
```

Removing a field from `BOARD_PROFILE_FIELDS` automatically excludes it from the
synthesized profile.

### Existing pattern: Atomic boot-time write (verified in repo)

```javascript
// Source: server.mjs:1597-1600 (saveProjectionProfilesRaw)
async function saveProjectionProfilesRaw(data) {
  await mkdir(path.dirname(PROJECTION_PROFILES_PATH), { recursive: true });
  await writeFile(PROJECTION_PROFILES_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}
```

Trailing `"\n"` matches the rest of the codebase. Use the same shape in
`stripDeadFieldsFromGlobalDefaults` and `stripDeadFieldsFromBoardFile`.

### New pattern: idempotent strip of fields from a JSON file

```javascript
async function stripDeadFieldsFromBoardFile(filePath, deadFields) {
  let outer;
  try {
    outer = JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return; // skip malformed
  }
  const inner = outer && typeof outer === "object" ? (outer.board ?? outer) : null;
  if (!inner || typeof inner !== "object") return;

  let changed = false;
  for (const field of deadFields) {
    if (Object.prototype.hasOwnProperty.call(inner, field)) {
      delete inner[field];
      changed = true;
    }
  }
  if (!changed) return;

  if (outer.board) outer.board = inner; else outer = inner;
  await writeFile(filePath, `${JSON.stringify(outer, null, 2)}\n`, "utf8");
}
```

The `if (!changed) return` short-circuits boot 2..N (no mtime touch when already
clean). This is the idempotence proof.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-animation sound was set via global `animationSoundMap[type]` | Per-animation `soundAssetRef` on each animation definition | Phase ?? (pre-26; the audio-mapping panel is gone from index.html) | The map became fallback; with all definitions carrying their own ref, the map is REDUNDANT. |
| Single `playAreaPolygon` per board | `playAreas[]` array with `selectedPlayAreaId` | Phase 8 (multi-play-area support) + Phase 10 HF8 (canonical resolution) | The single polygon became fallback in `polygon-contract.js` and `runtime-play-area-geometry.js` — never actually resolved to in current configs. |
| `roomStateProfiles` (broken/burning/alienCount/corpse) drove room-overlay rendering | Animation-driven overlays via `outsideFx`/`insideFx`/`roomFx` | Phase ?? (pre-19; UI panel gone, render consumers gone) | Plumbing remains in code; no consumer reads the values. |
| `deletedRoomIds` filtered the room catalog at apply time | `roomCatalog[]` is mutated directly in `runtime-room-management.js`; tombstones are appended but never gate reads | Phase 26 (data unification) | Tombstones became defensive deduplication that no longer fires. |
| Bundle schema `v3` (post-Phase-26 unified board) | Bundle schema `v4` (post-Phase-29 cleaned board) | Phase 29 | Hard reject on import for v3, by D-04. |

**Deprecated/outdated:**
- The audio-mapping settings panel — DOM removed but JS code lingering in `runtime-audio.js`,
  `runtime-wire-room-audio-binders.js:438-462`. Dead code already, will be cleaned with
  `animationSoundMap`.
- `lib/persistence/board-profiles.js:extractBoardProfilesCandidate` legacy candidate-shape
  detection (lines 16-65) — handles 4 different historical shapes for a server payload
  that is now always one canonical shape. Pre-release, this entire legacy detection can be
  collapsed (D-09 Claude discretion: this is in scope for Wave 2 if the implementer wants;
  not strictly required by D-05).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js builtin `--test` runner, v24.13.1 [VERIFIED] |
| Config file | `package.json` test script: `node --test "test/**/*.test.mjs"` |
| Quick run command | `node --test "test/**/*.test.mjs"` (66 ms full-suite, 25 tests) |
| Full suite command | same — already <100 ms |
| Phase gate command | `node --test "test/**/*.test.mjs" 2>&1 \| tail -5` (assert "fail 0") |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| W1-AUDIT | `29-AUDIT.md` exists with field classifications | doc / structural | `test -f .planning/phases/phase-29/29-AUDIT.md` | ❌ Wave 0 (manual diff) |
| W2-FIELDS | `BOARD_PROFILE_FIELDS` shrunk to LIVE-only set | structural | `node --test test/board-profile-fields.test.mjs` (extended) | ✅ Will be amended in Wave 2 |
| W2-NO-DEAD-READ | No `grep "roomStateProfiles\|hiddenRoomNames\|playAreaPolygon\|animationSoundMap"` hits in `src/app/runtime/render/` after cleanup | structural | new test `phase-29-dead-grep.test.mjs` | ❌ Wave 0 (new) |
| W2-AUDIO-FALLBACK | `runtime-audio.js` no longer references `animationSoundMap` | structural | new test or extension of audio test | ❌ Wave 0 (new) |
| W3-IDEMPOTENT | `purgeDeadFieldsOnBoot()` run twice produces identical disk state | unit / integration | new test `phase-29-purge.test.mjs` invoking the function on a temp dir | ❌ Wave 0 (new) |
| W3-MIGRATION | `migrateAnimationSoundMapOnBoot()` copies map values to per-animation refs without clobbering | unit | new test `phase-29-sound-migration.test.mjs` | ❌ Wave 0 (new) |
| W3-DISK-CLEAN | After boot, on-disk JSONs lack DEAD fields | structural / smoke | new test or git-status assertion | ❌ Wave 0 (new) |
| W4-SCHEMA-V4 | `BOARD_PACKAGE_SCHEMA === "tt-beamer.board-package.v4"` | structural | new test `bundle-schema.test.mjs` | ❌ Wave 0 (new) |
| W4-V3-REJECTED | A v3 manifest payload through the import handler returns `400 SCHEMA_OUTDATED` | unit | new test simulating import-handler logic | ❌ Wave 0 (new) |
| W4-EXPORT-FILTER | An export-handler input with DEAD fields produces an output without them | unit | new test simulating export-handler filter | ❌ Wave 0 (new) |
| NON-REGRESSION | Phase 28 acceptance tests (B1..B5) remain green | regression | full suite | ✅ Existing 25 tests |

### Sampling Rate

- **Per task commit:** `node --test "test/**/*.test.mjs" 2>&1 | tail -5` (under 100 ms; can run on every save).
- **Per wave merge:** Same. There is no slow-test bucket; full suite is the only suite.
- **Phase gate:** Full suite green before `/gsd-verify-work`.

### Wave 0 Gaps (new test files needed)

- [ ] `test/phase-29-dead-grep.test.mjs` — structural assertion: `grep` finds zero hits
  for each removed field name in `src/`.
- [ ] `test/phase-29-purge.test.mjs` — invokes `purgeDeadFieldsOnBoot` on a temp-dir
  fixture twice; asserts identical output (idempotence).
- [ ] `test/phase-29-sound-migration.test.mjs` — fixture board with empty
  `soundAssetRef` + populated `animationSoundMap`; assert post-migration the per-animation
  ref is filled and the map is dropped.
- [ ] `test/bundle-schema.test.mjs` — assert constant value v4; simulate v3 manifest →
  expect `400`+`SCHEMA_OUTDATED`; simulate v4 manifest with DEAD field → expect filter.
- [ ] `test/board-profile-fields.test.mjs` extension — assert removed fields are NOT in
  `BOARD_PROFILE_FIELDS` post-Wave-2; existing assertion at line 65 (`deletedRoomIds`)
  must be updated or removed depending on D-05 audit conclusion for that field.

Total new tests: 4 files, ~12-15 new assertions. Helpers in `test/_helpers.mjs`
(`readJsonFile`, `writeJsonFile`, `withTempDir`) cover all needs — no new helpers required.

## Risk Matrix (LIVE-but-cleanup-affected pathways)

| Pathway | Risk | Mitigation | Verified by |
|---------|------|------------|-------------|
| Phase 27 align-mode dirty broadcast | Touched indirectly because boot migration writes `global-defaults.json`. But the WebSocket isn't attached yet. | Boot migration runs BEFORE `attachLiveWebSocket`. Verified at server.mjs:3776 (asset-manifest precedent). | Manual code-flow trace; no test needed. |
| Phase 28 B1 `lastUsedProfileName` auto-load | Wave 2 might accidentally drop the field from `BOARD_PROFILE_FIELDS` | Existing test `board-profile-fields.test.mjs:56` asserts the field is present | `node --test test/board-profile-fields.test.mjs` |
| Phase 28 B5 asset manifest broadcast | The manifest file (`config/asset-manifest.json`) is in scope of the audit but not in scope of the cleanup (Wave 1 verifies all fields are LIVE) | Asset-manifest schema is `hashByPath` map of `{hash, size, mtime}`; all three fields are read by `runtime-asset-manifest.js:resolveAssetUrlWithHash`. Verified LIVE. | Wave 1 audit row for `assetManifest`. |
| Phase 28 h3 outside-fx mirror rebuild | Lives in `runtime-live-sync-core.js`. Reads `state.runningAnimations`, not any dead field. | No interaction with this phase's deletions | Manual grep confirmed no overlap. |
| Phase 26 `roomCatalog` mutation | If `deletedRoomIds` is dropped (REDUNDANT classification), need to verify `mergeRoomCatalog` and undo still work without it | Wave 1 audit task: trace undo flow | Pending Wave 1 |
| Multi-board switching (Phase 28 B2 save-gate) | Board-switch reads several state slices; dropping a slice (e.g. `roomStateProfilesByBoard`) requires lockstep removal in `runtime-board-switch.js:155-167` | Wave 2 plan task: edit board-switch in same atomic commit | Code review |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Test suite + server runtime | ✓ | 24.13.1 | — |
| `node:fs/promises` | Boot migration disk IO | ✓ | builtin | — |
| `node:test` runner | Test suite | ✓ | builtin v24 | — |
| `git` | Diff capture for D-06 backup-via-git-history | ✓ | (project repo) | — |
| Python 3 | Ad-hoc JSON inspection during research only | ✓ | (already used) | jq if Python missing |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** none.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The audio-mapping panel UI was deleted in a prior phase (likely Phase 11 or 18 simplification) | F3 | If a hidden code path re-attaches the panel dynamically, dropping `animationSoundMap` would break that path. Mitigation: grep verified zero `audio-mapping` matches in `index.html` and `src/styles.css`. [VERIFIED — but the *historical* phase is [ASSUMED]] |
| A2 | `runtime-polygon-undo.js` calling `markRoomTombstone`/`clearRoomTombstone` does not depend on the persisted `deletedRoomIds` for redo-of-delete | F5 | If undo-redo cycle reads the array, dropping it breaks undo. Wave 1 audit must verify. [ASSUMED — needs Wave 1 trace] |
| A3 | Phase 28 has no in-flight session state at server-restart that would be invalidated by dropping `roomStateProfiles` slice | Pitfall 1 | Single-tenant local app; restart is the natural reset boundary. [ASSUMED — local-server context, low risk] |
| A4 | The on-disk evidence of "no overlap between `deletedRoomIds` and `roomCatalog`" generalizes across all user installations | F5 | If user's deployed installation has stale tombstones overlapping with current rooms, dropping the filter would silently un-delete rooms. Pre-release scope (D-06) means there ARE no other installations. [VERIFIED — pre-release single-tenant] |

## Open Questions (RESOLVED)

1. **`deletedRoomIds` undo dependency** (REDUNDANT-pending-trace)
   - What we know: tombstones are appended on delete, filter is no-op in practice.
   - What's unclear: does `runtime-polygon-undo.js` read `state.roomTombstonesByBoard`
     to know which rooms to "un-tombstone" on redo, or does it snapshot the full
     `roomCatalog` and restore from snapshot?
   - **RESOLVED:** REDUNDANT — `runtime-polygon-undo.js` calls
     `clearRoomTombstone(id)`/`markRoomTombstone(id)` by ID only; it does not
     read `state.roomTombstonesByBoard`. Wave-2 plan 29-04 strips the calls
     first, runs the test suite, then drops the array. No undo regression.

2. **`runtime-polygon-metrics.js:23` reads `animationSoundMap[type]`**
   - What we know: the read exists; metrics are computed.
   - What's unclear: does the metric reach a UI element or is it pure plumbing?
   - **RESOLVED:** DEAD — metric is consumed only by the orphaned audio-mapping
     panel that no longer exists in `index.html`. Wave-2 plan 29-03 deletes
     the read along with the rest of the `animationSoundMap` plumbing.

3. **`roomGeometry` uses post-Phase-26**
   - What we know: `getRoomGeometry`/`setRoomGeometry` ARE called from
     `runtime-room-management.js:363, 398, 504, 554` (LIVE).
   - What's unclear: the comment at `runtime-board-profiles.js:185` says "no longer
     read from profiles" — does this mean the FIELD on disk is dead while the runtime
     state slice is alive?
   - **RESOLVED:** DEFERRED — runtime state slice `state.roomGeometryByBoard`
     is LIVE and stays. On-disk classification is INCONCLUSIVE for Phase 29
     (re-confirm in Wave-1 audit; if confirmed disk-dead, defer the disk strip
     to a future phase to avoid mid-flight re-architecture). Phase 29 keeps
     `roomGeometry` in `BOARD_PROFILE_FIELDS`.

## Sources

### Primary (HIGH confidence — verified in repo)

- `/home/claw/tt-beamer/server.mjs` — direct read at lines 28-58, 60-75, 1597-1600,
  1944-2031, 2092-2120, 2140-2185, 2347-2362, 3030-3050, 3251-3500+, 3776-3786.
- `/home/claw/tt-beamer/src/app/runtime/state/runtime-board-profiles.js` — direct read
  lines 36-95, 161-260.
- `/home/claw/tt-beamer/src/app/runtime/state/runtime-board-state-accessors.js` —
  lines 21-201, 277-301.
- `/home/claw/tt-beamer/src/app/runtime/state/runtime-play-area-geometry.js` —
  lines 90-200, 363-440.
- `/home/claw/tt-beamer/src/app/runtime/render/runtime-audio.js` — lines 230-400.
- `/home/claw/tt-beamer/src/app/runtime/state/runtime-room-geometry.js` — lines 120-150.
- `/home/claw/tt-beamer/src/app/runtime/render/runtime-canvas-clip.js` — lines 85-150.
- `/home/claw/tt-beamer/src/app/runtime/animation/runtime-room-management.js` —
  lines 600-625.
- `/home/claw/tt-beamer/src/app/lib/persistence/board-profiles.js` — full file (171 LOC).
- `/home/claw/tt-beamer/src/app/lib/state/runtime-state.js` — lines 50-77.
- `/home/claw/tt-beamer/src/app/runtime/core/runtime-bootstrap.js` — lines 110-145.
- `/home/claw/tt-beamer/config/global-defaults.json` — direct inspect.
- `/home/claw/tt-beamer/config/boards/nemesis-board-a.json` — direct inspect.
- `/home/claw/tt-beamer/config/asset-manifest.json` — direct inspect.
- `/home/claw/tt-beamer/config/projection-profiles.json` — direct inspect.
- `/home/claw/tt-beamer/test/board-profile-fields.test.mjs` — full file.
- `/home/claw/tt-beamer/test/board-json-roundtrip.test.mjs` — first 100 LOC.
- `/home/claw/tt-beamer/index.html` — confirmed audio-mapping DOM elements absent.
- `node --test "test/**/*.test.mjs"` — confirmed 25/25 green.

### Secondary (CONTEXT)

- `.planning/phases/phase-29/29-CONTEXT.md` — D-01..D-11 verbatim authority.
- `.planning/phases/phase-28/SUMMARY.md` — established `ensureAssetManifestOnBoot`
  pattern, 8 hotfixes h1..h8 (especially h6/h7/h8 for bundle import handling).
- `.planning/ROADMAP.md` §"Phase 29" — backlog B1..B4 + exit criteria.
- `.planning/STATE.md` — project context.

### Tertiary (none required — all claims verified locally)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entirely repo-local, no external deps.
- Architecture: HIGH — patterns verified at exact line numbers in `server.mjs`.
- Pitfalls: HIGH — pitfalls 1, 4, 5 are direct consequences of grep'd code; pitfalls
  2, 3, 6 are procedural reminders.
- Per-field traces: HIGH for F1, F2, F3, F4 (clear evidence either way); MEDIUM for
  F5 (`deletedRoomIds` — REDUNDANT-pending-undo-trace).
- Migration recipes: HIGH — direct code shapes provided, idempotence proven by
  pattern equivalence with `ensureAssetManifestOnBoot`.

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (30 days; codebase is the only source, low churn risk on
the specific files listed). Re-verify if any of the listed files at the listed line
numbers change before execution.

---

*Phase: 29-persistence-audit-legacy-cleanup*
*Research compiled: 2026-05-05*
