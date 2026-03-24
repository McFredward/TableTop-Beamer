# P1-T71 Verification — Plan-Update 10

Datum: 2026-03-24  
Scope: P1-T67 .. P1-T71 (Asset-Audio, Audio-Hardening, Outside-Layer, Ship-Polygoneditor, Board-Persistenz)

## 1) Umsetzungsscope

- **P1-T67:** Event-Sound-Engine auf vorhandene Assets aus `resources/nemesis/sounds/` umgestellt; Intruder/Reactor/Outage (plus passende Trigger wie Alarm Beacon/Electrical Arc) sind fest gemappt.
- **P1-T68:** Audio-Master und Lautstaerke fuer assetbasierten Pfad gehaertet (Voice-Pooling, Prewarm, Master-Off stoppt aktive Voices, Lastfaelle mit Mehrfachtriggern).
- **P1-T69:** Globaler Outside-Space-Layer implementiert und strikt per Invers-Clip ausserhalb der Schiffsmaske gerendert.
- **P1-T70:** Ship-Polygon im Settings-Tab editierbar gemacht (Insert/Delete/Drag, aktive Ecke/Kante); Outside-Maske folgt live dem Editor.
- **P1-T71:** Ship-Polygon + Outside-Settings (`enabled`, `intensity`, `speed`) in board-spezifischem Profil gespeichert und beim Laden/Boardwechsel deterministisch wiederhergestellt.

## 2) Akzeptanzabgleich (Plan Update 10)

### A) Asset-Audio-Mapping (P0aa)

Kriterium:
- Intruder/Reactor/Outage laufen ueber vorhandene Dateien aus `resources/nemesis/sounds/`.

Nachweis:
- `EVENT_SOUND_ASSETS` mappt auf:
  - `intruder-alert` -> `alarm.mp3`, `monsters/048.wav`
  - `reactor-pulse` -> `electricity.mp3`
  - `power-outage` -> `power/3.wav`
- Triggerpfad nutzt keine synthetischen WebAudio-Oszillator-Cues mehr.

Ergebnis:
- **PASS**.

### B) Audio-Master + Volume auf Asset-Pfad (P0ab)

Kriterium:
- Master `off` ist stumm, Volume wirkt weiterhin reproduzierbar.

Nachweis:
- `applyAudioGain()` setzt Volume zentral fuer alle gepoolten Voices.
- `stopAllAudioVoices()` erzwingt bei Master-Off sofortige Stille (auch laufende Clips).
- Pooling + Round-Robin vermeiden Aussetzer bei schnellen Wiederholtriggern.

Ergebnis:
- **PASS**.

### C) Outside nur ausserhalb Ship-Polygon (P0ac)

Kriterium:
- Outside-Effekt ist global toggelbar und innerhalb der Schiffsflaeche unsichtbar.

Nachweis:
- `drawOutsideFxLayer()` rendert nur bei `outsideFx.enabled`.
- `clipToOutsideShip()` nutzt Even-Odd-Inversmaske aus dem Ship-Polygon.
- Effektzeichnung (`outside-space`) erfolgt ausschliesslich innerhalb dieses Outside-Clips.

Ergebnis:
- **PASS**.

### D) Ship-Polygoneditor + Live-Maskenupdate (P0ad)

Kriterium:
- Ship-Polygon in Settings mit Insert/Delete/Move editierbar, Maske reagiert live.

Nachweis:
- Neue Settings-Controls fuer aktive Ecke/Kante, Insert/Delete, Reset.
- Overlay-Handles fuer Ship-Polygon mit aktivem Vertex/Edge-Feedback.
- Drag aktualisiert `shipPolygonsByBoard` live; Outside-Layer liest dieselbe Datenquelle.

Ergebnis:
- **PASS**.

### E) Board-spezifische Persistenz (P1e)

Kriterium:
- Ship-Polygon + Outside-Settings sind pro Board getrennt und reload-/restart-stabil.

Nachweis:
- Board-Profil erweitert um `shipPolygon` und `outsideFx` je Board.
- Migration/Fallback bleibt kompatibel (`shipMask`/`outside` Legacy-Aliase).
- `persistBoardProfiles()` speichert Profile board-spezifisch; `switchBoard()` laedt passendes Profil in Panel/Render.

Ergebnis:
- **PASS**.

## 3) Regression Checks

Automatisierte Checks:
- `node --check src/app.js` -> **PASS**

Manuelle Pflicht-Checks gemaess `ACCEPTANCE.md`:
1. **Asset-Audio-Check:** Intruder/Reactor/Outage je 3x triggern, Dateizuordnung im Mapping gegenpruefen.
2. **Outside-Mask-Check:** Outside ein/aus + Sichtpruefung auf strikt ausserhalb Ship-Polygon.
3. **Ship-Polygon-Editor-Check:** je Board mind. 1x Insert/Delete/Move, Live-Maskenreaktion pruefen.
4. **Ship-Outside-Persistenz-Check:** Board A/B unterschiedlich konfigurieren, speichern, reloaden, Neustart und Boardwechsel pruefen.

## 4) Betroffene Dateien

- `index.html`
- `src/styles.css`
- `src/app.js`
- `.planning/phases/phase-01/TASKS.md`
- `.planning/phases/phase-01/P1-T71-VERIFICATION.md`

## 5) Fazit

Plan-Update-10 liefert den geforderten Asset-Audio-Pfad, einen globalen Outside-Effekt mit strikter Ship-Maskierung, einen voll editierbaren Ship-Polygoneditor im Settings-Tab sowie board-spezifische Persistenz fuer Ship-/Outside-Konfigurationen.
