# P1-T110 Verification - Plan Update 17

Datum: 2026-03-24

## Ziel

Regression fuer LAN-IP-Setup dokumentieren:

- UI-Host bleibt im headless/remote Fall Default fuer API-Resolver
- kein stiller Rueckfall auf Client-`localhost`
- Save bleibt reproduzierbar (mindestens 5x + Restart)

## Automatisierte Checks

### 1) Resolver-LAN-Regression (Host-Drift-Guard)

Ausfuehrung:

- `node debug/p1-t110-resolver-regression.mjs`

Ergebnis:

- `REMOTE_FIRST=192.168.0.80`
- `REMOTE_HAS_LOCALHOST=false`
- `OVERRIDE_FIRST=localhost`
- `OVERRIDE_SOURCE=override:url(ttApiBase)`

Interpretation:

- Ohne Override bleibt `UI-Host -> API-Host` im LAN-Fall stabil auf dem UI-Host.
- Mit explizitem Override bleibt die Prioritaet/Kompatibilitaet erhalten.

### 2) Save-Reproduzierbarkeit (5x + Restart)

Ausfuehrung mit `PORT=4180 node server.mjs` + HTTP-Save-Loop:

- `GET /api/health` -> `200`
- `OPTIONS /api/global-defaults` -> `204`
- 5x `POST /api/global-defaults` -> `200,200,200,200,200`
- Server-Restart
- weiterer `POST /api/global-defaults` -> `200`

Konsolen-Evidence:

`HEALTH=200 OPTIONS=204 SAVE=[200,200,200,200,200] SAVE_AFTER_RESTART=200`

## LAN-Abnahmeprotokoll (zweites Geraet)

Pflichtdurchlauf gemaess Acceptance im realen LAN-Setup:

1. UI auf Server-Geraet via `node server.mjs` starten.
2. Zweites LAN-Geraet oeffnet `http://192.168.x.x:4173`.
3. In `Settings` 5x `Speichern (lokal -> globale Defaults)` ausfuehren.
4. Browser-Reload + API-Neustart + erneuter Save.
5. Bei jedem Save muss die Statuszeile `UI-Host 192.168.x.x -> API-Host 192.168.x.x` zeigen (kein Drift auf `localhost`).

## Ergebnis

Die technische Regression fuer Resolver-Prioritaet, Host-Drift-Guard und Save-Reproduzierbarkeit ist nachgewiesen.
Das LAN-Zweitgeraet-Protokoll ist als Pflichtabnahme dokumentiert.
