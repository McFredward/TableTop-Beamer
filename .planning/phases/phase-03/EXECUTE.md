# Execute Phase 3

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 3-3 Rework (verbindlich)
1. P0 zuerst: P3-T26..P3-T27 (echte GIF-Loop-Runtime statt Einzelbild-Pulsing).
2. P0 danach: P3-T28 (GIF-Mapping-UI pro Animation analog Sound-Mapping).
3. P0 Abschluss: P3-T29 (Persistenz pro Animation fuer GIF-Mapping).
4. P1 Hardening: P3-T30 (Regression + Soak fuer Multi-GIF-Loop + Mapping-Edit unter Last).
5. P1 Abschluss: P3-T31 (Plan-3-3-Verifikation + Artefakt-Sync).

## Gate-Regeln Plan 3-3
- Ohne nachgewiesene echte GIF-Frame-Loop-Wiedergabe fuer `kaputt`/`feuer`/`schleim` kein Fortschritt ueber P3-T27 hinaus.
- Ohne UI-paritaetisches GIF-Mapping pro Animation kein Fortschritt ueber P3-T28 hinaus.
- Ohne persistentes GIF-Mapping (Save/Reload/Restart) kein P0-Abschluss.
- Ohne instanzkonsistente Running-/Edit-Flow-Regressionsnachweise kein Plan-3-3-Abschluss.
- Ohne Verifikationsartefakt fuer Plan 3-3 kein Wechsel in weitere Ausbauwellen.

## Update Rules
- Taskstatus in `TASKS.md` kontinuierlich pflegen.
- Scope-/Prioritaetsaenderungen in `.planning/STATE.md` Decision Log dokumentieren.
- Vor Abschluss von Plan 3-3 alle Pflichtpunkte in `ACCEPTANCE.md` nachweisen.

## Execution Result
- Plan 3-2 abgeschlossen; siehe `3-2-VERIFICATION.md` sowie Task-Nachweise `P3-T23-REGRESSION.md` und `P3-T24-SOAK.md`.
- Plan 3-3 abgeschlossen; siehe `3-3-VERIFICATION.md` sowie Task-Nachweise `P3-T30-REGRESSION.md` und `P3-T30-SOAK.md`.
