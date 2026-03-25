# P4-T16 Room Model Regression (Plan 4-2)

## Scope
- Room-CRUD in Settings (`create/delete`) inkl. Integritaets-Guards.
- Freie Polygonbearbeitung fuer alle Raeume (Insert/Delete/Move, Mindestpunkt-Guard >= 3).
- Custom-Raumnamen inkl. sofortigem Overlay-/Runtime-Sync.
- Migration/Kompatibilitaet: Legacy lesen, neues Schema (`roomCatalog`) schreiben.

## Automated Checks

### Syntax Gate
```bash
node --check src/app.js
node --check src/app/domain/rooms.js
node --check src/app/ui/settings/rooms.js
node --check src/app/persistence/board-profiles.js
node --check src/app/shared/normalizers.js
```

Result: ✅ alle Checks erfolgreich (kein Syntaxfehler).

### Schema/Migration Static Checks
- `buildBoardProfilesFromState()` schreibt `roomCatalog` je Board.
- `applyBoardProfilesToState()` migriert via `applyRoomCatalog(...)` in Runtime-Boards.
- `buildMigratedBoardProfiles()` akzeptiert Legacy (`rooms`, `roomModel`) und neues `roomCatalog`.
- Zone-Normalizer akzeptiert `name/polygon` sowie Legacy `label/points|x/y/radius`.

Result: ✅ neues Schema und Legacy-Pfade sind gleichzeitig vorhanden.

## Functional Regression Checklist (Acceptance Mapping)

| Acceptance | Nachweis |
| --- | --- |
| Room-CRUD | Neue Settings-Controls (`#room-create`, `#room-delete`) und Guards gegen Delete letzter Raum + Referenzbereinigung (Running/Preview/Selection) |
| Room-Name | Sofortiger Sync via `#room-rename-input` in Overlay/Status/Selektoren |
| Room-Polygon | Polygoneditor arbeitet auf allen Raeumen (`polygon-room-select` aus gesamter Room-Liste), Insert/Delete/Drag mit Mindestpunkt-Guard |
| Schema-Migration | Persistenzpfad fuehrt `roomCatalog` ein, Loader migriert Altstaende in kanonische Runtime-Form |
| Legacy-Kompatibilitaet | Normalizer und Persistence lesen alte Felder weiter; Save schreibt konsistent das neue Room-Catalog-Feld |

## Notes
- Hexagon ist nur Startvorlage beim Erstellen (`room-create-shape=hexagon`), danach voll frei editierbar.
- Freie Startform ist als kleines Dreieck (`room-create-shape=free`) implementiert und direkt polygon-editierbar.
