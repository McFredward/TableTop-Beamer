# P1-T121 Verification - Plan Update 19

Datum: 2026-03-24

## Ziel

Pflichtabnahme fuer P1-T117..P1-T121:

- dedizierten `API Diagnose`-Button aus der Settings-UI entfernen
- Diagnose weiterhin ueber Save-Preflight + Save-Feedback nutzbar halten
- Download-/Export-Fallback neutral benennen (kein Notfall-Wording)
- Primaerpfad `Speichern` bleibt klar priorisiert

## Automatisierte Checks

### 1) Syntax-Regression

- `node --check src/app.js` ✅
- `node --check server.mjs` ✅

### 2) No-Button-Regression (`API Diagnose` ohne separaten Trigger)

Suche in relevanten UI-/App-Dateien:

- Pattern: `run-api-diagnose|API Diagnose (One-Click)`
- Targets: `index.html`, `src/app.js`, `README.md`
- Ergebnis: **No files found** ✅

Zusatzcheck:

- `api-diagnose-status` bleibt im UI vorhanden und wird im Save-Handler aktualisiert
  (`Speichern` setzt laufenden Preflight-Status und schreibt Success/Fail in dieselbe Statuszeile).

### 3) Wording-Regression (neutraler sekundaerer Fallback)

Suche in relevanten UI-/App-Dateien:

- Pattern: `Notfall|Notfallpfad|Notfall-Export`
- Targets: `index.html`, `src/app.js`, `README.md`
- Ergebnis: **No files found** ✅

### 4) Save-Preflight + Save-Smoke auf Node-API

Command sequence (Port 4180):

- `GET /api/health` => `200`
- `OPTIONS /api/global-defaults` => `204`
- `POST /api/global-defaults` => `200`

Konsolen-Evidence:

`HEALTH=200 OPTIONS=204 SAVE=200`

Bewertung:

- Save-Preflight ist aktiv (Health + OPTIONS)
- Save bleibt primaerer funktionaler Pfad

## Ergebnis

Plan-Update-19 ist fuer P1-T117..P1-T121 im Pflichtumfang nachgewiesen:

- Kein separater Diagnose-Button mehr sichtbar
- Diagnose bleibt im Save-Feedback reproduzierbar nutzbar
- Download-Fallback ist neutral benannt und explizit sekundaer
- Save-Flow bleibt primaer und lauffaehig
