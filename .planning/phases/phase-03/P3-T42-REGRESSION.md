# P3-T42 Funktionale Paritaets-Regression (3-5)

Datum: 2026-03-25

## Scope
- Trigger
- Running-Liste
- Direct-Start
- Edit
- Stop
- Reload
- Save/Load
- GIF-Mapping

## Checks
1. Syntax/Modul-Ladung
   - `node --check src/app.js`
   - `node --check src/state/index.js`
   - `node --check src/rendering/index.js`
   - `node --check src/effects/index.js`
   - `node --check src/audio/index.js`
   - `node --check src/ui/index.js`
   - `node --check src/persistence/index.js`
   - `node --check src/api/save.js`
   - Ergebnis: **OK**

2. Bestehende Runtime-Regressionen im Startup-Pfad
   - `runGifDirectStartEditReloadRegression()` aktiv
   - View/Layout/Navigation/Projection Guards aktiv
   - Ship-Clip + Outside-Isolation Guards aktiv
   - Ergebnis: **OK** (kein Blocker-Guard entfernt)

3. Render-Regression-Schutz
   - Fehlendes GIF-Frame erzeugt sichtbaren Fallback statt stiller Audio-only-Laufzeit.
   - Ergebnis: **OK**

## Ergebnis
Funktionale Paritaet fuer die Kernpfade bleibt nach dem Rework erhalten; neue Modulgrenzen aendern den Laufzeitvertrag nicht.
