# P6-HF1 Language Sweep Verification

Date: 2026-03-26
Status: DONE

## Goal

Close verify-work-6 P0 blocker `English-only operator flow` with reproducible evidence.

## Scope

- Control flow UI texts and action hints
- Settings flow UI texts and action hints
- Final-flow operator-facing messages
- Operator-relevant status messages and errors (client + server)
- README and phase-06 documentation consistency

## Method

1. Pattern-based sweep for German text remnants in operator-facing files.
2. Manual runtime walkthrough across Control -> Settings -> Final-flow.
3. Error-path spot checks (invalid import, API/server errors, save/preflight diagnostics).
4. Documentation pass (`README.md` + phase-06 artifacts) for English-only operator wording.

## Inventory (Task P6-T18)

### Control / Settings UI findings

- `index.html`
  - `aria-label="Seitenwechsel"`
  - `Global Defaults: noch nicht gespeichert`
  - `Board-Zoom (Settings)`
  - `Polygon-Handle-Groesse`
  - `placeholder="z. B. Brutkammer"`
  - `Startform beim Anlegen`
  - `Relativ (Offset)` / `Absolut (Zielkoordinate)`
  - `Globaler Speed-Faktor`
  - `Sound-Mapping pro Animation`
  - `Performance-Snapshot erstellen`
  - `Mobile Performance: noch kein Snapshot`

### Final-flow / status / error findings

- `src/app.js`
  - Save / diagnostics messages still in German (`Speichern ...`, `API Diagnose ...`, `Save nicht moeglich ...`).
  - Control/status guard messages in German (navigation guard, projection guard, view exclusivity, regression summaries).
  - Settings/editor statuses in German (room geometry, polygon editor, ship polygon editor, insert/delete/reset/focus).
  - Outside FX and audio statuses contain German segments (`aktiviert/deaktiviert`, `stumm`, `Lautstaerke`, `Persistenz fehlgeschlagen`).
  - Startup/defaults flow still uses German strings (`Laden & Anwenden`, startup fallback diagnostics).

### Server/client operator-relevant error-path findings

- Client save-preflight + save feedback in `src/app.js` still partially German.
- Runtime error-isolation status in `src/app.js` still German (`fehlerhafte Animation isoliert ...`).

## Evidence Log

### Pattern checks (post-fix)

1. `grep(path=/home/claw/tt-beamer/src, include=*.js, pattern=German-token-list)`
   - Result: no matches in operator runtime paths after final conversion.
2. `node --check src/app.js`
   - Result: pass.
3. `node --check src/app/lib/api/global-defaults-api.js`
   - Result: pass.

### Manual sweep matrix

| Area | Path | Check | Result |
| --- | --- | --- | --- |
| Control UI labels/hints | `index.html` | No German operator-facing labels/buttons/empty states | PASS |
| Settings UI labels/hints | `index.html` | No German settings copy or placeholders | PASS |
| Runtime status messages | `src/app.js` | Trigger/status feedback in English | PASS |
| Save/preflight/startup errors | `src/app.js`, `src/app/lib/api/global-defaults-api.js` | Operator-facing errors/diagnostics in English | PASS |
| Final-flow messaging | `src/app.js` | Final-flow relevant status/error copy in English | PASS |
| Operator docs | `README.md`, `.planning/phases/phase-06/README.md` | English-only policy stated consistently | PASS |

### Error-path spot checks

- Static-only preflight classification message: English.
- API endpoint unavailable / server error message families: English.
- Startup fallback failure and diagnostics: English.
- Runtime fault isolation status (`faulty animation isolated...`): English.

## Findings

- Open findings count: `0`
- Closed findings count: `all identified HF1 findings`
- Remaining blocker: `none`

## Result

- Final verdict: `PASS`
- Gate statement: `verify-work-6 P0 blocker 'English-only operator flow' is closed for Control/Settings/Final-flow + status/errors/docs scope.`
