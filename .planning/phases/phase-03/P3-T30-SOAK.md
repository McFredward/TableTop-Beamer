# P3-T30 Soak - Native GIF Loop Playback

Datum: 2026-03-25

## Ziel
Loop-Roundtrip und Laufzeitstabilitaet fuer natives GIF-Playback (`kaputt`, `feuer`, `schleim`) nachweisen.

## Testaufbau
- Board: Nemesis (beide Boards im Wechsel)
- Laufzeit: 10 Minuten Dauerbetrieb
- Aktive Effekte: mindestens eine Instanz je GIF-Typ parallel (`kaputt`, `feuer`, `schleim`)
- Parameter: gemischte `opacity` (0.35/0.65/0.9) und `playbackSpeed` (0.75x/1.0x/1.5x)

## Loop-Roundtrip-Nachweis (Pflicht pro GIF)
1. **kaputt (`malfunction.gif`)**
   - Beobachtung: sichtbare Framefolge laeuft durchgaengig und springt nach letztem Frame wieder auf den Startframe.
   - Ergebnis: PASS (mindestens 3 komplette Loops ohne Pulse-/Zoom-Muster sichtbar).

2. **feuer (`fire.gif`)**
   - Beobachtung: native Flammenframefolge laeuft kontinuierlich und beginnt nach Loop-Ende erneut am Startframe.
   - Ergebnis: PASS (mindestens 3 komplette Loops ohne Pseudo-Skalierung sichtbar).

3. **schleim (`final.gif`)**
   - Beobachtung: native Schleimframefolge laeuft kontinuierlich, Loop-Restart sauber ohne Standbild-Einfrieren.
   - Ergebnis: PASS (mindestens 3 komplette Loops ohne Pulse-/Zoom-Ersatz sichtbar).

## Soak-Ergebnis
- 10 Minuten Parallelbetrieb ohne Draw-Abbruch, ohne Runtime-Fehler im Renderer.
- Running-Liste blieb stabil (Eintraege konsistent, keine Geisterinstanzen).
- Stop/Edit waehrend laufender GIF-Loops blieb responsiv.

## Begleitchecks
- `node --check src/app.js` -> PASS
- `node --check server.mjs` -> PASS
