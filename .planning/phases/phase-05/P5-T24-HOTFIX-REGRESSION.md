# P5-T24 Hotfix Regression (Plan 5-HF1)

Datum: 2026-03-26

## Scope
- Outside-Space Shared Sync (Toggle/Speed/Intensity/Mode/Direction)
- Join/Reconnect Snapshot fuer Outside-State
- `/output/final` Bootstrap-/Renderpfad ohne White-Page
- Final-Output FX-only Guard (kein UI-Leak), Align-Overlay nur bei Align ON

## Nachweise

### 1) Syntax/Build Guards
```bash
node --check src/app.js
node --check server.mjs
node --check src/app/shared/config.js
```
Ergebnis: PASS

### 2) Outside-Sync Join/Reconnect Contract
```bash
node debug/p5-t24-outside-join-regression.mjs
```
Ergebnis:
- `OUTSIDE_JOIN_SYNC=PASS`

Prueft statisch die verpflichtenden Sync-Pfade:
- Client-Snapshot enthaelt `outsideFxByBoard`
- Snapshot-Apply nutzt Top-Level `outsideFxByBoard` + Runtime-Fallback
- Outside-Mutationspfad emittiert `outside-update`
- Server akzeptiert `outside-update` und schreibt `outsideFxByBoard` in den Shared Snapshot
- Join-Snapshot wird ueber `live-hello` ausgeliefert

### 3) Final-Output FX-only Contract + Align-Ausnahme
```bash
node debug/p5-t24-final-output-contract-check.mjs
```
Ergebnis:
- `FINAL_CONTRACT=PASS`

Prueft:
- Root-absolute Asset-Referenzen fuer `/output/final` Bootstrap
- Finale CSS-Hard-Guards gegen UI-Leaks
- Align-Ausnahme-Regel fuer `#room-overlay`

### 4) White-Page Negativtest (`/output/final` Bootstrap)
```bash
curl -s -o /tmp/tt-beamer-p5-t24-final.html -w "%{http_code}" http://127.0.0.1:4173/output/final
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4173/src/app.js
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4173/src/styles.css
```
Ergebnis:
- `FINAL_ROUTE=200`
- `APP_ASSET=200`
- `STYLE_ASSET=200`

Interpretation:
- Kein route-relativer Asset-Drift mehr auf `/output/final`
- Bootstrap startet deterministisch (keine White-Page durch fehlende JS/CSS-Assets)

## Acceptance-Mapping
- Outside-Sync-Toggle/Speed/Parameter: abgedeckt durch Shared-Snapshot + outside-update Contract
- Outside-Join-Snapshot: abgedeckt durch `live-hello` Snapshot-Pfad (Contract)
- Final-Bootstrap-Stability/White-Page: abgedeckt durch `/output/final` + Asset-200 Nachweis
- Final-UI-Leak-Negativtest + Align-Ausnahme: abgedeckt durch FX-only/Align Contract Checks
