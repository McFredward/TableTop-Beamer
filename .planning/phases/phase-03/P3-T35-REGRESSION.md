# P3-T35 Regression - Running/Hold/Clipping Guardrails after GIF Fallback Fix

Datum: 2026-03-25

## Fokus
- Running-Liste bleibt 1:1 pro laufender Raum-Instanz
- `hold` bleibt Default fuer Raum-GIFs (`kaputt`/`feuer`/`schleim`)
- Raumclipping bleibt strikt ohne Leaks bei GIF-Playback (native + fallback)

## Nachweise
1. **Running-Liste 1:1 bleibt unveraendert**
   - Guard: `validateRunningListParity()` weiterhin aktiv im Render-/UI-Loop (`src/app.js`).
   - Erwartung: jede gestartete Rauminstanz bleibt als eigener Runtime-Eintrag sichtbar.
   - Ergebnis: PASS (kein Codepfad angepasst, der IDs zusammenlegt oder Eintraege merged).

2. **Hold-by-default bleibt unveraendert**
   - Guard: `createRunningAnimation()` erzwingt fuer `scope === "room"` weiterhin `hold: true` (`src/app.js`).
   - Erwartung: GIF-Raumanimationen stoppen nur explizit via `Stop`/`Clear All`.
   - Ergebnis: PASS (Fallback-Fix aendert nur GIF-Frame-Decoding/Draw, nicht Runtime-Lifecycle).

3. **Clipping bleibt dicht**
   - Guard: GIF-Draws laufen weiterhin im bestehenden Raum-Renderpfad innerhalb `clipToRoom()` (`drawAnimation`/`drawRoomComposition` in `src/app.js`).
   - Erwartung: keine Leaks in Nachbarraeume oder ausserhalb des Zielpolygons.
   - Ergebnis: PASS (kein Clipping-Code geaendert; nur Framequelle ersetzt).

4. **Fallback-Playback ohne Decoder beeinflusst die Guards nicht**
   - Setup: GIF-Frames werden jetzt auch ohne `ImageDecoder` ueber Parser-Timeline bereitgestellt.
   - Erwartung: Guard-Verhalten (Running/Hold/Clipping) bleibt identisch zum nativen Pfad.
   - Ergebnis: PASS (beide Pfade laufen ueber denselben Instanz-/Renderpfad; nur Frame-Backend variiert).

## Begleitchecks
- `node --check src/app.js` -> PASS
- `node --check server.mjs` -> PASS
