# P6-HF1 Language Sweep Verification

Date: 2026-03-26
Status: IN PROGRESS (T18 inventory complete)

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

- Pattern checks:
  - Manual file sweep completed for `index.html` and `src/app.js` (operator-facing hotspots listed above).
- Manual sweep protocol:
  - Baseline inventory captured before string conversion.
- Error-path checks:
  - Save/preflight, startup-fallback, and runtime-guard message families identified for conversion.
- Documentation sync checks:
  - `README.md` and Phase-06 docs flagged for explicit policy alignment in P6-T21.

## Findings

- Open findings count: `3 families` (UI copy, status/error copy, docs policy consistency)
- Closed findings count: `0`
- Remaining blocker: `English-only operator flow` still open until P6-T19..P6-T22

## Result

- Final verdict: `Inventory complete`
- Gate statement: `P6-T18 complete; proceed with conversion tasks P6-T19 and P6-T20`
