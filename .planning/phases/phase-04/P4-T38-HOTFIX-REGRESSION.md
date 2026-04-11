# P4-T38 Hotfix Regression (Plan 4-5)

## Scope
- Handle-Paritaet: gemeinsame Handle-Groessenlogik fuer Room- und Ship-Polygoneditor.
- `lichtflackern`-Cleanup: keine horizontalen weissen Glitch-Baender, Random-Flicker-Charakter bleibt erhalten.
- `lichtflackern`-Speed-Floor: mindestens `0.10x` in UI + Runtime.
- Sound-Persistenz: Sound-Mapping/Sound-Settings bleiben lokal nach Reload erhalten.
- Global-Defaults-Transport: Sound-Mapping wird via Save/Load exportiert und wieder angewendet.

## Automated Checks

### Syntax Gate
```bash
node --check src/app.js
node --check src/app/lib/state/runtime-state.js
node --check server.mjs
```

Result: ✅ erfolgreich.

### Feature Presence Gate (Static)
- Gemeinsamer Handle-Contract aktiv:
  - `src/app.js`: `getPolygonEditorHandleMetrics(...)` wird von `renderPolygonEditorHandles(...)` und `renderShipPolygonEditorHandles(...)` verwendet.
- Shared Handle-Source-of-Truth aktiv:
  - `src/app.js`: `getCurrentPolygonHandleScale(...)` wird fuer Room + Ship Status/Renderpfad genutzt.
- `lichtflackern` ohne horizontale Streifen:
  - `src/app.js`: `hull-flicker` zeichnet keine horizontalen `fillRect(0, y, w, thickness)`-Baender mehr; stattdessen lokale Spark-Impulse.
- 10%-Speed-Floor:
  - `index.html`: `#room-speed` `min="0.1"`.
  - `src/app.js`: `clampRoomSpeed(...)` auf `0.1..2.5`.
- Lokale Sound-Persistenz:
  - `src/app.js`: `buildBoardProfileStoragePayload(...)` speichert `audio`, `animationSpeed`, `animationSoundMap`.
  - `src/app.js`: `applyPersistedRuntimeSettings(...)` rehydriert diese Felder aus Storage (legacy-safe optional).
- Global-Defaults-Sound-Mapping:
  - `src/app.js`: `buildGlobalDefaultsPayload(...)` exportiert `animationSoundMap`.
  - `src/app.js`: `applyGlobalDefaultsPayloadToState(...)` importiert `animationSoundMap`.

Result: ✅ alle Plan-4-5-Hotfix-Bausteine im produktiven Sourcepfad vorhanden.

## Acceptance Mapping

| Acceptance | Nachweis |
| --- | --- |
| Editor-Handle-Paritaet inkl. Ship | Gemeinsame Metrikfunktion + gemeinsame Handle-Scale-Quelle fuer Room/Ship-Handles, inkl. Hit-Targets und Zoom-Verhalten. |
| `lichtflackern` Visual-Cleanup | Horizontale Glitch-Baender entfernt; unregelmaessige Burst/Dip/Spark-Dynamik bleibt erhalten. |
| `lichtflackern` Speed-Floor 10% | UI-Range (`min=0.1`) + Runtime-Clamp (`clampRoomSpeed=0.1..2.5`) konsistent. |
| Sound-Persistenz lokal | Board-Profile speichern und laden Sound-Mapping/Sound-Settings reload-stabil. |
| Global-Defaults-Sound-Test | Save/Load-Payload fuehrt `animationSoundMap` unveraendert ueber API/Fallback-Pfad. |

## Manual Verify Checklist (Operator)
1. **Settings > Handle-Groesse** auf 70%, 100%, 220%: Room- *und* Ship-Handles + Hitareas skalieren sofort mit.
2. **Lichtflackern** in einem Raum starten: keine horizontalen weissen Streifen sichtbar, aber unregelmaessiges Flackern bleibt.
3. **Speed 0.10x** setzen, Animation starten, laufende Instanz editieren: Wert bleibt wirksam.
4. **Reload** im selben Browser: Audio-Mapping-Auswahl und Audio-Master/Volume bleiben erhalten.
5. **Global Defaults**: Mapping anpassen -> `Speichern` -> Seite/Client zuruecksetzen -> `Defaults laden & anwenden`; Mapping bleibt identisch.
