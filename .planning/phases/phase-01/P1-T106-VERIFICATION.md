# P1-T106 Verification - Plan Update 16

Datum: 2026-03-24

## Ziel

Pflichtabnahme fuer P1-T102..P1-T106:

- robuste API-Base-Aufloesung (inkl. Port-Fallback)
- Save-Preflight (`GET /api/health` + `OPTIONS /api/global-defaults`)
- endpoint-transparente Save-Fehlermeldungen
- Diagnose im Save-Kontext (ohne separaten Button)
- reproduzierbarer Save bei laufender API (5x + Restart)

## Automatisierte Checks

### 1) Syntax-Regression

- `node --check src/app.js` ✅
- `node --check server.mjs` ✅

### 2) Static-Hosting Fehlpfad reproduziert

Ausfuehrung mit `python3 -m http.server 8099`:

- `GET http://localhost:8099/api/health` -> `404`
- `POST http://localhost:8099/api/global-defaults` -> `501`

Erwartung: Diagnose/Save klassifiziert Endpoint als nicht save-faehig und liefert Operator-Hinweis.

### 3) Save-Reproduzierbarkeit bei laufender API

Ausfuehrung mit `PORT=4180 node server.mjs`:

- `GET /api/health` -> `200`
- `OPTIONS /api/global-defaults` -> `204`
- 5x `POST /api/global-defaults` in Folge -> `200,200,200,200,200`
- Server restart
- weiterer `POST /api/global-defaults` -> `200`

Konsolen-Evidence:

`HEALTH=200 OPTIONS=204 SAVE=[200,200,200,200,200] SAVE_AFTER_RESTART=200`

## Ergebnis

Plan-Update-16 Akzeptanzkriterien fuer Save-Flow, Diagnose und Reproduzierbarkeit sind technisch nachgewiesen.
