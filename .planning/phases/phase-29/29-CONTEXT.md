# Phase 29: Persistence Audit & Legacy Cleanup - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Systematische Bereinigung der vier Persistenz-Schemas auf tote / redundante
Felder. Pre-Release — keine Backwards-Compat erforderlich. Scope:

- **Audit:** jedes Feld in den vier Config-JSONs (`config/global-defaults.json`,
  `config/boards/<id>.json`, `config/projection-profiles.json`,
  `config/asset-manifest.json`) klassifizieren als LIVE / DEAD / REDUNDANT.
- **Source-Cleanup:** Reads/Writes/Normalizers/Defaults für DEAD-/REDUNDANT-
  Felder entfernen.
- **Disk-Cleanup:** tote Felder aus on-disk JSON-Files purgen
  (one-shot Migration auf Server-Boot).
- **Schema-Bump:** `BOARD_PACKAGE_SCHEMA` v3 → v4 für Bundle-Export/Import.
  Bundle-Handler an schlankes Schema anpassen.

**Explizit nicht im Scope:**
- Backwards-Compat zu alten exportierten Packages (Pre-Release).
- Neue Persistence-Features.
- Datenbankmigration / Multi-Tenant.
- Add-only Schema-Erweiterungen.

</domain>

<decisions>
## Implementation Decisions

### Audit-Methodik

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

### Cleanup-Sequenz

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

### animationSoundMap-Migration

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

### Bundle-Schema-Bump

- **D-04: BOARD_PACKAGE_SCHEMA v3 → v4.** Beim Bundle-Export wird
  Schema "tt-beamer.board-package.v4" emittiert. Beim Import:
  - v4 → akzeptiert
  - v3 (oder älter) → 400 Bad Request mit klarer Fehlermeldung
    *"Package format outdated (schema=v3). Re-export from a v0.29+
    server."*
  - Schema-Bump signalisiert die strukturelle Änderung; alte Packages
    werden erkennbar abgelehnt anstatt mit verlorenen Feldern still
    zu importieren.

### Klassifikations-Hypothesen (zu verifizieren in Wave 1 Audit)

- **D-05: Verdachts-Liste.** Wave 1 Audit muss diese Felder explizit
  klassifizieren:
  
  **DEAD-Verdacht (drei in `BOARD_PROFILE_FIELDS`, ein global):**
  - `hiddenRoomNames` (board) — 0 Treffer im src-Tree.
  - `roomStateProfiles` (board) — broken/burning/alienCount/corpse;
    Get/Set + Normalizer existieren, aber keine Render-Consumer in
    grep gefunden.
  - `animationSoundMap` (global) — Read/Write existiert in
    `runtime-audio.js`, aber semantisch redundant zu
    per-Animation `soundAssetRef`.
  - `playAreaPolygon` (board) — Single-Polygon-Legacy; modern ist
    `playAreas[]` Array. Read-Pfade nur als fallback chain.
  
  **LIVE-Verdacht aber post-Phase-26 hinterfragbar:**
  - `deletedRoomIds` / `roomTombstones` (board) — Soft-Delete-
    Tombstones. Phase 26 hat das Daten-Modell auf unified board JSONs
    geändert, wo Räume tatsächlich aus dem Array entfernt werden.
    Verifizieren ob Tombstones noch nötig sind oder Pre-Phase-26-Relikt.
  
  **Alle übrigen Felder** (`outsideFx`, `insideFx`, `roomFx`,
  `roomGeometry`, `hitareaCalibration`, `specialPolygons`, `frozenRooms`,
  `selectedPlayAreaId`, `playAreas`, `defaultAnimations`,
  `lastUsedProfileName`, `assetManifest`, `renderMode`,
  `diagnosticOverlay`, `animationSpeed`, `audio`,
  `mp4Performance`) — als LIVE annehmen, im Audit verifizieren,
  drop nur bei eindeutigem "kein Renderer + keine UI"-Befund.

### Disk-Migration-Sicherheitsnetz

- **D-06: Hard delete.** Pre-Release; git history ist das
  Sicherheitsnetz. Keine `_legacy.json`-Quarantäne, keine Feature-Flag-
  Rückwege. Bei Server-Boot wird direkt geschrieben.
  Backup-Strategie: das `git status`-Diff der Config-JSONs nach dem
  Boot-Migration-Run wird einmalig ins Phase-Closure-SUMMARY notiert,
  damit man den Diff jederzeit lesen kann.

### Bundle-Handler-Sync

- **D-07: Bundle-Export emittiert nur LIVE-Felder.** Im Export-Handler
  (`server.mjs:3251+`) wird der `board`-Payload vor dem Zip-Build
  durch denselben Cleanup-Filter geleitet wie die Disk-Migration.
  Damit enthält ein v4-Package nur die im aktuellen Schema gültigen
  Felder.

- **D-08: Bundle-Import schreibt nur LIVE-Felder.** Im
  `normalizeBoardDefinition` (`server.mjs:1944+`) wird die
  `BOARD_PROFILE_FIELDS`-Liste auf den schlanken Set reduziert. Alte
  Felder in einem importierten Package werden verworfen.

### Claude's Discretion

- **D-09:** Exakte Wave-Granularität (z.B. "1 Plan pro Feld-Gruppe"
  vs. "1 Plan pro Wave") — Implementer wählt, was am besten zu der
  Anzahl identifizierter DEAD-Felder passt.
- **D-10:** Migration-Script-Form — separates Modul oder inline in
  bestehendem Boot-Hook in `server.mjs`. Implementer wählt
  Minimum-Invasivität.
- **D-11:** Test-Coverage-Erweiterungen — wenn ein Feld entfernt
  wird, dessen Wert von einem `node --test`-Test verifiziert wurde,
  Test entfernen oder umbauen. Implementer entscheidet pro Test.

### Folded Todos

[None — no pending todos in the GSD todo system matched Phase 29 scope.]

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 29 Inputs
- `.planning/ROADMAP.md` §`Phase 29 - Persistence Audit & Legacy Cleanup` —
  Backlog B1..B4 + Milestones + Exit Criteria.
- `.planning/phases/phase-28/SUMMARY.md` — Phase-28-Closure mit der Liste
  zuletzt-hinzugefügter Felder (lastUsedProfileName, assetManifest etc.).

### Persistenz-Schemas (must read before audit)
- `server.mjs` §`BOARD_PROFILE_FIELDS` (Zeile 39-58) — kanonische Liste
  der per-Board-Persistenz-Felder.
- `server.mjs` §`extractProfileFromUnifiedBoard` (Z.60-75),
  §`persistBoardProfileToBoardFile` (Z.2153-2187),
  §`synthesizeBoardProfiles` (Z.2140-2147) — Server-Side-Read/Write-Pfade.
- `server.mjs` §`normalizeBoardDefinition` (Z.1944-2031) — Server-Side-
  Normalisierung beim Save + Import.
- `server.mjs` §`buildDefaultAnimationsForBoard` (Z.3683-3730) — Boot-
  Autostart-Pfad.

### Client-Side-State-Hydration
- `src/app/runtime/state/runtime-board-profiles.js` —
  `applyBoardProfilesToState` baut alle per-board State-Maps. Das ist
  die zentrale Read-Site jedes per-board Felds.
- `src/app/lib/persistence/board-profiles.js` — legacy
  Migration-Layer von älteren Schemas. Bei Schema-Bump auf v4 muss
  diese Datei evtl. komplett raus, da Pre-Release keine alten Schemas
  unterstützt werden müssen.
- `src/app/lib/state/runtime-state.js` — initial state shape;
  enthält die per-board Maps und globale Felder.
- `src/app/runtime/core/runtime-bootstrap.js` — initialisiert
  `state.animationSoundMap`, `state.roomTombstonesByBoard`,
  `state.roomStateProfilesByBoard`, etc. mit Defaults.

### Spezifische Verdachts-Felder
- **animationSoundMap:**
  - `src/app/runtime/render/runtime-audio.js` (Z.256, 330, 383-386) —
    runtime read+write.
  - `src/app/runtime/wire/runtime-wire-room-audio-binders.js` (Z.451) —
    UI write.
  - `src/app/runtime/core/runtime-polygon-metrics.js` (Z.23) — read.
  - `src/app/runtime/live-sync/runtime-global-defaults.js` (Z.421-422) —
    snapshot apply.
  - `server.mjs` (Z.3037) — server load path.
- **deletedRoomIds / roomTombstones:**
  - `src/app/runtime/state/runtime-play-area-geometry.js` (Z.99-188) —
    full lifecycle.
  - `src/app/lib/domain/rooms.js` (Z.112) — `mergeRoomCatalog`.
  - `src/app/lib/persistence/board-profiles.js` (Z.110) — legacy load.
- **roomStateProfiles:**
  - `src/app/runtime/state/runtime-board-state-accessors.js` (Z.193-201) —
    get/set; values broken/burning/alienCount/corpse.
  - `src/app/runtime/animation/runtime-room-management.js` (Z.609-610) —
    delete on room delete.
  - Render-Konsumenten: GREP konnte keinen finden — verifizieren!
- **hiddenRoomNames:**
  - `server.mjs` §`BOARD_PROFILE_FIELDS` enthält den Eintrag —
    sonst nirgendwo.

### Bundle-Schema (für Wave 4)
- `server.mjs` §`BOARD_PACKAGE_SCHEMA` (sucht `tt-beamer.board-package.v3`) —
  Schema-Konstante.
- `server.mjs` §`POST /api/boards/bundle-export` (Z.3251-3349) — Export-Pfad.
- `server.mjs` §`POST /api/boards/bundle-import` (Z.3352-3500+) — Import-Pfad.

### Test-Infrastruktur (Wave 0 von Phase 28)
- `test/_helpers.mjs` — `readJsonFile`, `writeJsonFile`, `withTempDir`,
  `makeMinimalDocumentStub`. Wave-2-Tests nutzen das bestehende Setup.
- `test/board-json-roundtrip.test.mjs`, `test/board-profile-fields.test.mjs` —
  Phase-28-Tests; werden ggf. erweitert oder gestrafft.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`BOARD_PROFILE_FIELDS`-Konstanten-Liste** (server.mjs Z.39-58) — eine
  zentrale Quelle der Wahrheit. Wave 2 Cleanup ändert hier die Liste,
  und alle iterierenden Code-Pfade (extractProfileFromUnifiedBoard,
  persistBoardProfileToBoardFile, normalizeBoardDefinition) folgen
  automatisch.
- **`grep`+`node --test`-Audit-Toolchain** — bewährt aus Phase 28 W0.
  Wave 1 Audit kann reines grep + manuelles Tracing verwenden.
- **`writeJsonFile` / `readJsonFile`** in `test/_helpers.mjs` — nutzbar
  für Wave-2-Tests und auch für die Disk-Migration-Helper.

### Established Patterns
- **Server-authoritative Persistenz mit broadcast** — nach jedem disk
  write läuft `global-config-update`. Bei Wave-3-Migration:
  Server-Boot schreibt → existing reload-on-broadcast greift nicht
  (kein Client connected beim Boot), aber sobald Clients connecten,
  bekommen sie den schlanken State direkt.
- **Atomare File-Writes via temp+rename** — siehe
  `saveProjectionProfilesRaw` als Referenz; gleicher Pattern für
  die Migration-Writes.

### Risiken / Watch-outs
- **`runtime-board-profiles.js:188-193`** liest `roomStateProfiles`
  aus profiles und schreibt in state. Wenn das Feld entfernt wird,
  diese ganze Block raus. Aber: prüfen ob `state.roomStateProfilesByBoard`
  noch von etwas anderem konsumiert wird (z.B. ein State-Sub-Slice in
  einem anderen Modul).
- **`runtime-play-area-geometry.js`** macht extensiven Gebrauch von
  `roomTombstones`. Wenn deletedRoomIds entfernt wird, muss diese
  ganze Tombstone-Logik raus, was Sub-Funktionen (filterRoomCatalogByDeletedIds,
  hydrateRoomTombstones) trifft. Phase-28-Acceptance-Tests vorher
  prüfen ob das was kaputt macht.
- **Animation-Sound-Migration vor Drop:** D-03 erfordert ein
  Migration-Script, das vor dem Source-Cleanup läuft. Reihenfolge:
  Boot-Migration im Server (das Feld migrieren) → Source-Cleanup im
  Client. Nicht umgekehrt — sonst verlieren wir orphaned mappings.

### Integration Points
- **`server.mjs` Boot-Block** (vor `attachLiveWebSocket`) ist der
  natürliche Ort für die Disk-Migration. Schon jetzt enthält dieser
  Block `ensureAssetManifestOnBoot`-Pattern aus Phase 28.
- **`global-defaults.json` Reads** sind in
  `runtime-global-defaults.js`/applyGlobalDefaultsPayloadToState
  zentralisiert. Eine Stelle für globale Field-Removals.
- **`config/boards/<id>.json` Reads** sind in
  `loadCanonicalBoardsFromStorage` (server) + `loadExternalBoardZones`
  (client) zentralisiert. Zwei Stellen für per-board Field-Removals.

</code_context>

<specifics>
## Specific Ideas

- **Audit-Doku-Form:** `.planning/phases/phase-29/29-AUDIT.md` als
  Tabelle pro Feld mit Spalten: Feld | Source-Reads | UI-Bindings |
  Render-Konsumenten | Klassifikation | Action.
- **animationSoundMap Migration als Server-Boot-Step:** Das ist ein
  one-shot Schritt, der einmal läuft, dann ist die Map weg.
  Symmetrisch zum existing `ensureAssetManifestOnBoot`-Pattern aus
  Phase 28.
- **Schema-Bump-Kommunikation:** Die Bundle-Import-Fehlermeldung
  bei v3 ist gut sichtbar — User sieht sofort warum es nicht klappt.
  Implementation-Detail: `if (manifest.schema !== "tt-beamer.board-package.v4")
  { sendJson(res, 400, { error: "Package format outdated. Re-export from a v0.29+ server.", code: "SCHEMA_OUTDATED" }); }`
- **Pre-Release-OK:** Der User hat explizit gesagt no Backwards-Compat.
  Das macht Phase 29 deutlich einfacher als typische Schema-Migrationen.

</specifics>

<deferred>
## Deferred Ideas

- **Generelle Schema-Versioning-Strategie** für post-Release-Migrationen.
  Phase 29 löscht legacy ohne Replacement; ein Migration-Framework
  kommt erst wenn die App released ist.
- **Multi-Tenant-Daten-Isolation.** Aus Phase 27/28 deferred, bleibt
  deferred — die App läuft single-tenant local.
- **Asset-Manifest-Sub-Cleanup.** Falls die Asset-Manifest-Form sich
  als unnötig kompliziert erweist, separater Cleanup-Plan in einer
  späteren Phase.

### Reviewed Todos (not folded)
[None — no todos were surfaced for review.]

</deferred>

---

*Phase: 29-persistence-audit-legacy-cleanup*
*Context gathered: 2026-05-04*
