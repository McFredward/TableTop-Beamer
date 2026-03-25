# P3-T49 Hotfix-Regression (3-6)

Datum: 2026-03-25

## Scope
- Preview-Rueckbau (UI + State + Routing + Send/Rollback)
- Direkter Live-Trigger fuer Global/Room
- Sichtbarkeit fuer `global` + `room` + GIF-basierte Animationen
- Running-Liste inkl. `Stop`/`Edit`

## Checks
1. Syntax
   - `node --check src/app.js`
   - `node --check server.mjs`
   - Ergebnis: **OK**

2. Preview-Artefakte im Runtime-Code
   - `grep -nE "preview-global-select|stage-global-preview|stage-room-preview|send-preview-live|rollback-last-send|preview-queue|preview-status|live-send-status" index.html src/app.js`
   - Ergebnis: **kein Treffer**

3. Entfernte Preview-Live-Routen
   - `grep -nE "/api/live/send|/api/live/rollback|/api/live/state" src/app.js server.mjs`
   - Ergebnis: **kein Treffer**

4. Render-Hotfix-Guards
   - Room- und Global-Pfad zeichnen sichtbaren Fallback bei Clip-Fehlern.
   - Global-Pfad ignoriert Cross-Board-Renderings deterministisch.
   - Ergebnis: **OK**

5. Running-Integritaet
   - Runtime bereinigt doppelte/ungueltige Instanzen und raeumt verwaiste Edit-Targets auf.
   - Ergebnis: **OK**

## Ergebnis
Die P0-Hotfix-Pfade fuer Preview-Removal, direkte Live-Trigger und sichtbares Rendering sind regressionsseitig abgesichert.
