# P4-T7 Smoke Regression (Plan 4-1)

Datum: 2026-03-25

## 1) Syntax Smoke (`node --check`)

Erfolgreich ohne Fehler fuer:

- `src/app.js`
- `src/app/shared/config.js`
- `src/app/shared/normalizers.js`
- `src/app/state/runtime-state.js`
- `src/app/persistence/board-profiles.js`
- `src/app/api/global-defaults-api.js`
- `server.mjs`

## 2) Save/Load API Smoke (Node-Server)

Serverstart (lokal): `HOST=127.0.0.1 PORT=4199 node server.mjs`

Ergebnisse:

- `GET /api/health` -> `200`
- `OPTIONS /api/global-defaults` -> `204`
- `POST /api/global-defaults` -> `200`
- `GET /api/global-defaults` -> `200`

Zusammenfassung: `HEALTH=200 OPTIONS=204 SAVE=200 LOAD=200`

## 3) Startup / View-Switch Guard Presence

Quellcode-Checks bestaetigen unveraenderte Startup- und View-Regression-Hooks:

- `void window.TT_BEAMER_BOOT.run(initializeApplication);`
- `setActiveView("dashboard");`
- `runViewVisibilityRegression();`

Bewertung: Die Refactoring-Extraktion P4-T1..P4-T6 behaelt den bisherigen Startup- und View-Switch-Guard-Pfad bei.
