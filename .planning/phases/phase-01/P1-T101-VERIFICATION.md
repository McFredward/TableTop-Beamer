# P1-T101 Verification — Plan-Update 15

Datum: 2026-03-24  
Scope: P1-T97 .. P1-T101 (Save-Transport-Repair, API-Fehler-UX, Startdoku, optionaler Fallback)

## 1) Umsetzungsscope

- **P1-T97:** Global-Defaults-Save-Transport gehaertet (API-Candidate-Aufloesung im Client + robustes Server-Routing fuer `/api/global-defaults` mit/ohne Trailing-Slash).
- **P1-T98:** Save-Fehlerpfad klassifiziert (`API unreachable`, `method unavailable`, `HTML error`, `server error`) und auf kurze Klartextmeldungen mit Startanweisung umgestellt.
- **P1-T99:** README-Startflow auf POST-faehigen Node-Server (`node server.mjs`) geschliffen, inkl. Kurzsequenz API + Frontend.
- **P1-T100:** Optionaler Download-/Export-Fallback als explizit sekundaerer Notfallpfad im Settings-Save-Bereich ergaenzt.

## 2) Akzeptanzabgleich (Plan Update 15)

### A) POST-Save reproduzierbar ohne `501` auf Node-API (P0aw)

Nachweis:
- Smoke-Test gegen Node-Server auf freiem Port:
  - `PORT=4180 node server.mjs`
  - `curl -X POST http://localhost:4180/api/global-defaults ...` -> **200**
  - `curl -X POST http://localhost:4180/api/global-defaults/ ...` -> **200**
- Server routet `/api/global-defaults` und `/api/global-defaults/` gleichwertig.

Ergebnis:
- **PASS**.

### B) API-offline UX ohne HTML-Rohdump (P0ax)

Nachweis:
- Save-Fehler werden nicht mehr mit Roh-Response in der UI angezeigt.
- Stattdessen: kurze Klartextmeldung inkl. konkreter Aktion
  - `node server.mjs` starten
  - App ueber `http://localhost:4173` nutzen

Ergebnis:
- **PASS**.

### C) Startdoku mit klarer API-Pflicht (P0ay)

Nachweis:
- README benennt jetzt explizit:
  - POST-Save braucht API-Server
  - statisches Hosting allein ist unzureichend
  - kurze Startsequenz fuer API + optional getrennten Frontend-Start

Ergebnis:
- **PASS**.

### D) Optionaler Fallback bleibt sekundaer (P0az)

Nachweis:
- Neuer Settings-Button `Notfall-Export herunterladen (sekundaer)` vorhanden.
- UI-Hinweistext + Statusfeedback markieren den Download klar als Notfallpfad.
- Primaerer Pfad bleibt unveraendert der API-Save via `Speichern`.

Ergebnis:
- **PASS**.

## 3) Regression Checks

Automatisierte Checks:
- `node --check src/app.js` -> **PASS**
- `node --check server.mjs` -> **PASS**
- Endpoint-Smoke:
  - `POST /api/global-defaults` -> **200**
  - `POST /api/global-defaults/` -> **200**

In-App Guards (weiterhin aktiv):
- `runViewVisibilityRegression()`
- `runLayoutScrollRegression()`
- `runZoomPanEditRegression()`
- `runPanPointerCaptureRegression()`
- `runOutsideIsolationRegression()`
- `runShipClipRegression()`

## 4) Manuelle Pflichtchecks (gem. ACCEPTANCE.md)

1. **API-Method-Check:** Save auf Node-Setup triggern, kein `501 Unsupported method POST`.
2. **API-Offline-UX-Check:** Save bei statischem Server ohne API triggern; kurze Startanweisung statt HTML-Rohinhalt.
3. **Start-Flow-Doku-Check:** README auf API-Pflicht + Startsequenz pruefen.
4. **Optional-Fallback-Check:** Notfall-Export ausfuehren; Sekundaer-Label und Hinweistext bestaetigen.

## 5) Betroffene Dateien

- `src/app.js`
- `server.mjs`
- `index.html`
- `README.md`
- `.planning/phases/phase-01/TASKS.md`
- `.planning/phases/phase-01/P1-T101-VERIFICATION.md`

## 6) Fazit

Plan-Update-15 ist im Scope umgesetzt: Der Save-Transport ist auf das Node-API-Setup gehaertet, der Fehlerpfad liefert klare Operator-Hinweise statt HTML-Dumps, die Startdoku fuehrt explizit ueber den POST-faehigen Server, und ein optionaler Download-Fallback ist als sekundaerer Notfallpfad verfuegbar.
