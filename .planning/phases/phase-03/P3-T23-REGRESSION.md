# P3-T23 Regression - Einzelanimationen Parallelbetrieb

Datum: 2026-03-25

## Fokus
- Running-Liste 1:1 zur Runtime-Instanz
- Trigger/Edit/Stop-Konsistenz fuer das 7er-Set
- Clipping-Integritaet pro Raum

## Nachweise
1. **7x Einzeltrigger (gleicher Raum)**
   - Startreihenfolge: `kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`
   - Erwartung: 7 Running-Eintraege mit unterschiedlichen `Instanz:` IDs
   - Ergebnis: PASS (Running-Meta zeigt `Instanz`, `Typ`, Raumlabel, optional `GIF`/`GlobalEq`)

2. **Edit-Roundtrip einer GIF-Instanz**
   - Ziel: laufende `kaputt`-Instanz via `Edit` oeffnen, `opacity`/`playbackSpeed` anpassen, speichern
   - Erwartung: identische Instanz-ID bleibt erhalten, Werte in Running-Meta aktualisiert
   - Ergebnis: PASS

3. **Einzel-Stop ohne Seiteneffekt**
   - Ziel: genau eine laufende Instanz stoppen
   - Erwartung: nur Ziel-ID verschwindet, restliche Eintraege bleiben aktiv
   - Ergebnis: PASS

4. **Global-Aequivalente raumbegrenzt**
   - Trigger: `alarm`, `lichtflackern`
   - Erwartung: Rendering nur innerhalb des Zielraum-Polygons
   - Ergebnis: PASS

## Implementationsanker
- `ROOM_GIF_ANIMATION_ASSETS` + `ROOM_GLOBAL_EQUIVALENT_MAP` in `src/app.js`
- `validateRunningListParity()` in `src/app.js`
- Running-Meta mit `Instanz`, `Typ`, `GIF`, `GlobalEq` in `renderRunningAnimationsList()`
