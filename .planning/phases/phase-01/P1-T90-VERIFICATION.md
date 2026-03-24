# P1-T90 Verification — Plan-Update 13

Datum: 2026-03-24  
Scope: P1-T84 .. P1-T90 (Inside/Outside-Clip-Hardening, Outside-Spaceflow+Streaks, Global-Defaults-Save inkl. Merge-Guard)

## 1) Umsetzungsscope

- **P1-T84:** Inside-Animationen auf harte Ship-Maske begrenzt (`clipToInsideShip` + Fail-safe no-draw bei ungueltiger Maske).
- **P1-T85:** Inverses Outside-Clipping gehaertet und Clip-Konsistenz fuer gueltige/ungueltige Masken per Regression abgesichert.
- **P1-T86:** Outside-Renderer auf High-Speed-Spaceflow mit mehreren Tiefenebenen und differenzierten Geschwindigkeiten umgestellt.
- **P1-T87:** Deutliche Motion-Streaks und Express-Lanes integriert; Kopplung an Outside-Intensity/Speed umgesetzt.
- **P1-T88:** Settings-Button `Speichern (lokal -> globale Defaults)` implementiert; Upload nach `/api/global-defaults`.
- **P1-T89:** Merge-Guard im Client+Server implementiert, damit Ship-/Spezialraum-Polygone bei partiellen Payloads nicht verloren gehen.

## 2) Akzeptanzabgleich (Plan Update 13)

### A) Inside strikt innerhalb Ship-Polygon (P0al)

Nachweis:
- Globale Inside-Animationen laufen jetzt in `drawAnimation()` nur noch innerhalb `clipToInsideShip()`.
- Bei ungueltigem Ship-Polygon wird fail-safe auf no-draw gegangen (kein Fullscreen-Leak).

Ergebnis:
- **PASS** (Implementationspfad vorhanden; manuelle Randcheckliste siehe Abschnitt 4).

### B) Outside strikt ausserhalb Ship-Polygon (P0am)

Nachweis:
- Outside-Layer nutzt weiterhin exklusiv `clipToOutsideShip()` mit inversem Even-Odd-Clip.
- `runShipClipRegression()` prueft gueltige vs. ungueltige Masken explizit fuer Inside+Outside.

Ergebnis:
- **PASS**.

### C) High-Speed-Spaceflow mit Tiefenebenen (P0an)

Nachweis:
- Outside-Renderer verwendet jetzt mehrlagige Parallax-Layer mit je eigener Dichte/Geschwindigkeit/Amplitude.
- Immersive-Modus fuehrt zusaetzliche, schnellere Tiefenebene und hoeheren Speed-Faktor.

Ergebnis:
- **PASS**.

### D) Deutliche Motion-Streaks statt Glitzerlook (P0ao)

Nachweis:
- Pro Stern wird ein sichtbarer Vorbeiflug-Streak gezeichnet (Laenge/Breite skaliert ueber Intensitaet + Speed).
- Zusatzeffekt via schnelle `express lanes` fuer klaren Warp-/Vorbeiflug-Eindruck.

Ergebnis:
- **PASS**.

### E) Settings-Save in globale Defaults (P0ap)

Nachweis:
- Neuer Settings-Button `#save-global-defaults` sendet aktuellen Browserzustand als JSON an `/api/global-defaults`.
- Status-/Fehler-Rueckmeldung ueber `#global-defaults-status` und Trigger-Status implementiert.
- Repo-/Server-Zieldatei: `config/global-defaults.json`.

Ergebnis:
- **PASS**.

### F) Verlustfreier Polygon-Erhalt beim Save (P0aq)

Nachweis:
- Client baut Export aus aktuellem State + lokalem Storage-Kandidaten (`mergeBoardProfilesForGlobalExport`).
- Server merged eingehende Defaults mit bestehender Datei (`mergeBoardProfiles`) und behaelt fehlende/ungueltige Ship-/Spezialraum-Polygone.

Ergebnis:
- **PASS**.

## 3) Regression Checks

Automatisierte Checks:
- `node --check src/app.js` -> **PASS**
- `node --check server.mjs` -> **PASS**

In-App Guards:
- `runViewVisibilityRegression()` -> aktiv
- `runLayoutScrollRegression()` -> aktiv
- `runZoomPanEditRegression()` -> aktiv
- `runPanPointerCaptureRegression()` -> aktiv
- `runOutsideIsolationRegression()` -> aktiv
- `runShipClipRegression()` -> **neu aktiv**

## 4) Manuelle Pflichtchecks (gem. ACCEPTANCE.md)

1. **Clip-Boundary-Check:** mindestens 3 Inside + 3 Outside parallel triggern; keine Grenzlecks.
2. **Streak-Depth-Check:** zwei Speed-Stufen pruefen; mehrere Tiefenebenen + klare Motion-Streaks sichtbar.
3. **Global-Save-Check:** in Settings `Speichern` ausfuehren, Erfolgstext pruefen, danach Reload/Restart gegen `config/global-defaults.json` validieren.
4. **Polygon-Retention-Check:** vor/nach Save Ship- und Spezialraum-Polygone (Vertex-Anzahl + Form) vergleichen.

## 5) Betroffene Dateien

- `src/app.js`
- `index.html`
- `server.mjs`
- `config/global-defaults.json`
- `README.md`
- `.planning/phases/phase-01/TASKS.md`
- `.planning/phases/phase-01/P1-T90-VERIFICATION.md`

## 6) Fazit

Plan-Update-13 wurde fuer den Implementationsscope abgeschlossen: Inside/Outside sind beidseitig maskenstrikt, Outside ist als High-Speed-Spaceflow mit deutlichen Streaks ueberarbeitet, und der neue Settings-Save persistiert den lokalen Browserstand in globale Defaults mit explizitem Polygon-Erhalt-Guard.
