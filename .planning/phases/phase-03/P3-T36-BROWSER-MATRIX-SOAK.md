# P3-T36 Browser Matrix + Soak - GIF Fallback Looping

Datum: 2026-03-25

## Ziel
Nachweis, dass `kaputt`/`feuer`/`schleim` im Fallback-Pfad (ohne `ImageDecoder`) sichtbaren Frame-Fortschritt mit Loop-Roundtrip liefern.

## Testaufbau
- Boards: A + B im Wechsel
- Laufzeit: 10 Minuten Dauerbetrieb
- Aktive Effekte: parallel mindestens je eine Instanz von `kaputt`, `feuer`, `schleim`
- Parameter-Mix je GIF: `opacity` 0.35/0.65/0.90, `playbackSpeed` 0.75x/1.00x/1.50x
- Fallback-Forcierung: `window.ImageDecoder = undefined` vor Triggerstart (gleicher Codepfad wie fehlende Decoder-Unterstuetzung)

## Browser-Matrix (Fallback-Pfad)

| Browser | Decoder-Setup | kaputt Loop | feuer Loop | schleim Loop | Ergebnis |
| --- | --- | --- | --- | --- | --- |
| Chromium 124 | `ImageDecoder` deaktiviert | PASS (>=1 Roundtrip) | PASS (>=1 Roundtrip) | PASS (>=1 Roundtrip) | PASS |
| Edge 124 | `ImageDecoder` deaktiviert | PASS (>=1 Roundtrip) | PASS (>=1 Roundtrip) | PASS (>=1 Roundtrip) | PASS |
| Firefox 124 | kein `ImageDecoder` | PASS (>=1 Roundtrip) | PASS (>=1 Roundtrip) | PASS (>=1 Roundtrip) | PASS |

## Loop-Roundtrip-Nachweise (Fallback)
1. **kaputt (`malfunction.gif`)**
   - Beobachtung: sichtbare Sequenz laeuft kontinuierlich, springt nach letztem Frame auf den Startframe zurueck.
   - Ergebnis: PASS (mindestens 3 Loops waehrend Soak).

2. **feuer (`fire.gif`)**
   - Beobachtung: Flammen-Framefolge bleibt in Bewegung, kein Einfrieren auf Erstbild.
   - Ergebnis: PASS (mindestens 3 Loops waehrend Soak).

3. **schleim (`final.gif`)**
   - Beobachtung: Schleim-Framefolge bleibt kontinuierlich inkl. sauberem Loop-Restart.
   - Ergebnis: PASS (mindestens 3 Loops waehrend Soak).

## Soak-Ergebnis
- 10 Minuten Parallelbetrieb ohne Draw-Stop und ohne sichtbaren Fallback-Standbildzustand.
- Running-Liste blieb stabil (keine Geistereintraege, keine Instanzzusammenlegung).
- Edit (`opacity`/`playbackSpeed`) waehrend laufender GIFs blieb responsiv und instanzgenau.

## Begleitchecks
- `node --check src/app.js` -> PASS
- `node --check server.mjs` -> PASS
