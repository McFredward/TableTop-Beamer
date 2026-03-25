# P3-T29 Regression - GIF-Loop Guardrails

Datum: 2026-03-25

## Fokus
- Running-Liste bleibt 1:1 pro GIF-Runtime-Instanz
- `hold` bleibt Default fuer GIF-Raumanimationen
- Raumclipping bleibt dicht (kein Leak ausserhalb Zielraum)

## Nachweise
1. **Running-Liste 1:1 (GIF only)**
   - Trigger: je 2 Instanzen von `kaputt`, `feuer`, `schleim` auf unterschiedlichen Raeumen.
   - Erwartung: pro Trigger genau ein Running-Eintrag mit eigener `Instanz:`-ID.
   - Ergebnis: PASS (keine Sammel-/Merge-Eintraege, Edit/Stop bleibt instanzgenau).

2. **Hold-by-default unveraendert**
   - Trigger: GIF-Raumanimation starten ohne Duration-Aenderung.
   - Erwartung: Running-Eintrag bleibt aktiv, bis explizit `Stop` oder `Clear All`.
   - Ergebnis: PASS (`Mode: hold` bleibt im Running-Meta sichtbar).

3. **Clipping-Integritaet (GIF)**
   - Trigger: `kaputt`, `feuer`, `schleim` in Rand-/Nachbarraeumen.
   - Erwartung: sichtbarer Draw strikt nur innerhalb Zielpolygon, keine Leaks in Nachbarraum/Outside.
   - Ergebnis: PASS.

4. **Schneller Start/Edit/Stop-Roundtrip**
   - Trigger: GIF starten -> `Edit` (`opacity`/`playbackSpeed`) -> speichern -> stoppen.
   - Erwartung: gleiche Instanz-ID bleibt beim Edit erhalten; Stop entfernt nur Zielinstanz.
   - Ergebnis: PASS.

## Technischer Guard
- `validateRunningListParity()` deckt weiterhin Instanz-ID-Paritaet in der Running-Liste ab (`src/app.js`).
- GIF-Renderer nutzt weiterhin room-scope Clipping ueber `clipToRoom()` im Draw-Pfad (`drawAnimation` in `src/app.js`).
- Raumtrigger erzwingen weiterhin `hold: true` im Start/Edit-Flow (`startOrEditRoomAnimation` in `src/app.js`).
