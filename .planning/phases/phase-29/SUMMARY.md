# Phase 29 — Persistence Audit & Legacy Cleanup (CLOSURE)

## Status

**CLOSED (h1 final).** 7/7 plans executed (B1..B4 coverage) + 1 hotfix.
Test-Suite: 48/48 grün (`node --test "test/**/*.test.mjs"`), 0 skipped.
Verifier: 6/6 must_haves automated PASS. 3 Items im 29-HUMAN-UAT.md
warten auf User-Side-Browser-Smoke (visual sound playback, bundle
roundtrip UI, undo/redo gesture).

## Source

User-Audit nach Phase-28-Closure: "Persistierung überprüfen und redundante
Dinge rausschmeißen". Drei explizite Verdachtsfelder vom User
(`animationSoundMap`, `deletedRoomIds`, `roomStateProfiles`); zwei weitere
vom Pre-Audit-Scout aufgespürt (`hiddenRoomNames`, `playAreaPolygon`).
Alle 5 Felder via 29-AUDIT.md klassifiziert; alle als DEAD oder
REDUNDANT bestätigt; alle entfernt.

## Wave delivery

### W0 — Test-Scaffolding — Plan 29-W0
- **29-W0-T1** `62c6b58` — `phase-29-dead-grep.test.mjs` mit 5 W2-grep-gates.
- **29-W0-T2** `1c7eaa4` — `phase-29-purge.test.mjs` (3 W3-gates) + `phase-29-sound-migration.test.mjs` (3 W3-gates).
- **29-W0-T3** `1897757` — `bundle-schema.test.mjs` (3 W4-gates) + extension to `board-profile-fields.test.mjs`.

### W1 — Audit Doc — Plan 29-01
- **29-01-T1** `c88ca27` — `29-AUDIT.md` mit Klassifikationstabelle. 5 Felder DEAD/REDUNDANT bestätigt.
- **29-01-T2** auto-resolved — Wave-2 unblocked per locked answer.

### W2 — Source Cleanup — Plans 29-02, 29-03, 29-04

| Plan | Felder | Commits |
|------|--------|---------|
| 29-02 | `hiddenRoomNames` + `roomStateProfiles` | `72cc5fe` + `5438a11` |
| 29-03 | `animationSoundMap` (source-side only) | `3ff963a` + `7409dab` |
| 29-04 | `playAreaPolygon` + `deletedRoomIds`/tombstones | `8795f6b` + `082cbc6` |

`BOARD_PROFILE_FIELDS` schrumpft von 15 → 13 → 13 → 11 LIVE entries.
Pitfall-1-Mitigation in 29-04: undo-Pfad zuerst editiert + suite-getestet,
dann Array-Drop. `runtime-polygon-undo.js` byte-unchanged für die
DROPS — undo arbeitet rein über `board.rooms` Snapshots.

### W3 — Boot Disk Migration — Plan 29-05
- **29-05-T1** `c5565b0` — Neues Modul `lib/migrations/phase-29-purge.mjs`
  mit `migrateAnimationSoundMap()` + `purgeDeadFieldsOnBoot()`. Critical
  ordering durch literal `MIGRATION FIRST — DO NOT REORDER (Pitfall 2)`
  Comment.
- **29-05-T2** `864230f` — Wired in server.mjs Boot-Block. Live-Run-Evidence:
  `[phase-29-purge] complete (... migrated 0 sound refs across 0 boards;
  orphans 3; global stripped; 4 board file(s) stripped)` (first boot) →
  `[phase-29-purge] complete (...migrated 0... global unchanged; 0 board
  file(s) stripped)` (second boot) — **Idempotenz live verifiziert**.
- **29-05-T3** `027f8a9` — 6 W3-skip-gates flipped → live + passing.

### W4 — Bundle Schema v3 → v4 — Plan 29-06
- **29-06-T1** `24a364f` — `BOARD_PACKAGE_SCHEMA = "tt-beamer.board-package.v4"`.
  v3-Imports werden mit HTTP 400 + `code: "SCHEMA_OUTDATED"` +
  *"Package format outdated (schema=...). Re-export from a v0.29+ server."*
  abgewiesen.
- **29-06-T2** `2333832` — `filterBoardToLiveFields(board)` Helper +
  Wiring in Bundle-Export. Allowed-Set spreaded direkt aus
  `BOARD_PROFILE_FIELDS` — keine hardcoded Field-Liste, automatisch
  konsistent mit Cleanup. 3 W4-skip-gates flipped → live + passing.

## Aggregate metrics

- **Commits since `phase-28-end` (`3741285`):** 27 + 5 (h1) = 32 total.
- **Plan hierarchy:** 7 plans × 5 sequential waves + 1 hotfix series.
- **BOARD_PROFILE_FIELDS:** 15 → 11 → **9 LIVE entries** final shape:
  `hitareaCalibration, playAreas, selectedPlayAreaId, outsideFx,
  insideFx, roomFx, defaultAnimations, frozenRooms, lastUsedProfileName`.
- **Net source removal:** ~250 LOC across 13+ files (Wave 2-4) + ~50 LOC
  delta across 21 files (h1).
- **Final version:** `0.29.3` (h3 final — release-prep).

## Decision coverage (D-01..D-11)

| Decision | Implemented in |
|----------|----------------|
| D-01 (DEAD = render-and-UI-traceable) | 29-01 (Audit verdict authority) |
| D-02 (Source first → disk one-shot → schema bump) | Wave structure W2→W3→W4 |
| D-03 (animationSoundMap lossless migrate → drop) | 29-05-T1 (migrateAnimationSoundMap before purge) |
| D-04 (BOARD_PACKAGE_SCHEMA v3 → v4) | 29-06-T1 |
| D-05 (Verdachts-Liste verifiziert) | 29-01 (alle 5 als DEAD/REDUNDANT bestätigt) |
| D-06 (Hard delete; git history = safety net) | implementiert in 29-05 (no quarantine file) |
| D-07 (Bundle export emits LIVE-only) | 29-06-T2 (filterBoardToLiveFields) |
| D-08 (Bundle import filters to LIVE) | 29-06-T1 (BOARD_PROFILE_FIELDS shrunk; normalize uses it) |
| D-09..D-11 (Claude's discretion) | Wave-Granularität gewählt nach Audit-Befund; Migration-Modul separat |

## Backlog coverage (B1..B4)

| Backlog | Status |
|---------|--------|
| B1 — animationSoundMap weg | ✓ source clean (29-03) + disk migrated lossless (29-05) |
| B2 — deletedRoomIds weg | ✓ Audit bestätigt REDUNDANT, dropped (29-04) |
| B3 — roomStateProfiles weg | ✓ Audit bestätigt DEAD, dropped (29-02) |
| B4 — Voller Schema-Audit + sleek schema | ✓ 29-AUDIT.md (22 Felder klassifiziert), 4 zusätzliche dead/redundant Felder gefunden + entfernt, Schema v4 |

## Bonus discoveries during audit

- **`hiddenRoomNames`** — 0 src refs außer in `BOARD_PROFILE_FIELDS`-Liste.
  Klassisches "wurde mal hinzugefügt, nie konsumiert"-Feld.
- **`playAreaPolygon`** — Single-Polygon-Legacy-Field aus Pre-Multi-PlayArea-
  Migration. Modern wird `playAreas[]` Array verwendet.

## Known limitations

- **Browser-side visual + bundle roundtrip + undo/redo** — strukturell
  verifiziert, aber Browser-Smoke pending (siehe 29-HUMAN-UAT.md).
- **`config/asset-manifest.json` working-tree churn** — Phase 28 W4 boot-
  timestamp behavior; absichtlich aus Phase-29-Commits ausgeschlossen
  (siehe 29-05-SUMMARY decisions[3]).
- ~~**`roomGeometry` disk vs runtime asymmetry**~~ — RESOLVED in 29-h1.

## Hotfix series (h1..h3) — post-closure audit

| # | Commits | Fix |
|---|---------|-----|
| h1 | `dd71aeb` + `df04e1b` + `bc02a76` + `d9164fe` + closure | Eliminate two redundant disk-side fields surfaced post-closure: (1) `specialPolygons` was a per-room polygon shadow map fully redundant with `roomCatalog[*].polygon` (verified Nemesis Board B: all 75 keys = roomCatalog room IDs, polygons byte-identical; polygon-editor wrote 3-fold and read with fallback). Collapsed to single source: `room.polygon`. (2) `roomGeometry` (resolves Open Question 3): on-disk field was empty `{}` on all 4 boards. Runtime state slice `state.roomGeometryByBoard` stays LIVE (drawAnimation reads stretchX/offsetX defaults via `ensureBoardRoomStateMaps`); disk persistence dropped. **BOARD_PROFILE_FIELDS shrank 11→9.** Accessor pair renamed: `getSpecialPolygonPoints/setSpecialPolygonPoints` → `getRoomPolygonPoints/setRoomPolygonPoints`. Tests: 3 new dead-grep zero-hit gates + bundle-export exclusion gate; suite 47→48 green. |
| h2 | `eea52c3` | Pre-release boot-noise removal: the Phase-29 one-shot disk migration (`lib/migrations/phase-29-purge.mjs` + `purgeDeadFieldsOnBoot()` boot-block + import + 2 test files) printed `[phase-29-purge] complete (...)` on every server start. Migration was already complete on disk — single-user pre-release, no other installations to migrate. Hard-deleted: migration module, server.mjs import + boot try-block, `test/phase-29-purge.test.mjs`, `test/phase-29-sound-migration.test.mjs`, empty `lib/` directory. dead-grep + bundle-schema + board-profile-fields tests stay (regression value). Suite 48→40 green. |
| h3 | `725df29` | **Critical bug:** dashboard "Unsaved on /output/" chip showed on fresh boot even with align mode OFF and no /output/ unsaved changes against any profile. Root cause in `isDirty()`: the no-profile branch compared current geometry against `buildNewProfileDefaultGrid()` and returned dirty=true if /output/ had ever panned (localStorage diverged from default). The /output/ broadcaster then POSTed `dirty=true` to server on every boot. Fix: when `_loadedProfileSnapshot === null`, `isDirty()` is permanently false. "Unsaved" exclusively means "loaded profile has changes since load" (user-mental-model contract). Server stale-flag cleared via direct `curl POST /api/align-mode-dirty {dirty:false}`. |

## Tags

| Tag | Hash | Marker |
|-----|------|--------|
| `phase-28-end` | `3741285` | Phase 29 starts at this commit |
| `phase-29-end` | (HEAD; re-tagged at h1 final) | Phase 29 closed — persistence cleanup + h1 |

## Closure marker

- Tag: `phase-29-end` (re-tagged at h1 closure commit).
- Final version: `0.29.3` (h3 final — release-prep).
- Phase artifact: this `SUMMARY.md` + `29-AUDIT.md` (authoritative Verdict-Doku).
- Alle commits auf `master` zwischen `phase-28-end` und dem closure marker.
- Nächster Schritt: User-Smoke der 3 Items in `29-HUMAN-UAT.md`. Falls
  weitere Issues entstehen, folgen Hotfixes im h*-Pattern wie Phase 27/28.
