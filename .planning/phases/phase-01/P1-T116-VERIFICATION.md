# P1-T116 Verification - Plan Update 18

Datum: 2026-03-24

## Ziel

Pflicht-Roundtrip fuer Plan-Update 18 nachweisen:

- Negativtest mit `python3 -m http.server 4173` (Static-only)
- Direkter Positivtest mit Node-API-Server auf **demselben Host/Port**
- Save reproduzierbar erfolgreich inkl. Restart

## Testaufbau

- Host/Port: `127.0.0.1:4173`
- Reihenfolge (verbindlich):
  1. Python Static-Server starten
  2. API-Endpunkte pruefen (`GET /api/health`, `POST /api/global-defaults`)
  3. Python stoppen
  4. Node-Server auf identischem Port starten (`HOST=0.0.0.0 PORT=4173 node server.mjs`)
  5. Health/OPTIONS + 5x Save + Save nach Restart pruefen

## Ergebnisse

### A) Negativtest - Python Static-only

Konsolen-Evidence:

`PY_HEALTH=404 PY_POST=501 PY_SERVER=SimpleHTTP/0.6 Python/3.14.3`

Body-Signatur (Auszug):

`<!DOCTYPE HTML> <html lang="en"> ...`

Interpretation:

- `GET /api/health` liefert `404` mit Python-SimpleHTTP-Signatur.
- `POST /api/global-defaults` liefert `501`.
- Ergebnis ist ein klarer Static-only-Fall (nicht POST-faehig).

### B) Positivtest - Node-API (gleicher Host/Port)

Konsolen-Evidence:

`NODE_HEALTH=200 NODE_OPTIONS=204 NODE_SAVES=[200,200,200,200,200] NODE_AFTER_RESTART=200`

Interpretation:

- API ist erreichbar (`GET /api/health` = `200`).
- Save-Endpunkt ist POST-faehig (`OPTIONS` = `204`).
- Save funktioniert reproduzierbar (5x `POST` erfolgreich).
- Nach Server-Restart bleibt Save erfolgreich (`200`).

## Ergebnis

Der verpflichtende Roundtrip ist erfuellt: Python-Static-Negativtest und direkt folgender Node-API-Positivtest liefen auf demselben Host/Port (`4173`) reproduzierbar durch.
