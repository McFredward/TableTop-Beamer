# Execute Phase 3

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 3-6 P0 Hotfix (verbindlich)
1. P0 sofort: P3-T45 (Preview-Flow komplett entfernen: UI + State + Routing + Send/Rollback).
2. P0 sofort: P3-T46 + P3-T47 (direkten Live-Trigger wiederherstellen und sichtbares Rendering fuer `global`/`room`/`gif` fixen).
3. P0 Gate: P3-T48 (Running-Liste sowie `Stop`/`Edit` unter Hotfix-Bedingungen regressionsfest halten).
4. P1 danach: P3-T49 (Hotfix-Regression + Soak fuer Trigger/Edit/Stop/Reload/Save-Load ohne Preview-Pfad).
5. P1 Abschluss: P3-T50 (Artefakt-Sync + Refactor-Resume-Gate formalisieren).

## Gate-Regeln Plan 3-6
- Ohne vollstaendige Entfernung von Preview-UI/State/Routing/Send/Rollback kein Abschluss von P3-T45.
- Ohne direkten Live-Trigger-Pfad fuer Start/Edit/Stop kein Abschluss von P3-T46.
- Ohne sichtbaren Matrix-Nachweis fuer `global` + `room` + `gif` kein Abschluss von P3-T47 (Audio-only gilt explizit nicht als Pass).
- Ohne Running-1:1-Integritaet und stabile `Stop`/`Edit`-Bedienung kein Abschluss von P3-T48.
- Ohne Regression + Soak ueber Hotfix-Pfade kein Abschluss von P3-T49.
- Ohne konsistenten Artefakt-Sync und dokumentiertes Refactor-Resume-Gate kein Abschluss von P3-T50.

## Update Rules
- Taskstatus in `TASKS.md` kontinuierlich pflegen.
- Scope-/Prioritaetsaenderungen in `.planning/STATE.md` Decision Log dokumentieren.
- Vor Abschluss von Plan 3-6 alle Pflichtpunkte in `ACCEPTANCE.md` nachweisen.

## Execution Result
- Plan 3-2 abgeschlossen; siehe `3-2-VERIFICATION.md` sowie Task-Nachweise `P3-T23-REGRESSION.md` und `P3-T24-SOAK.md`.
- Plan 3-3 abgeschlossen; siehe `3-3-VERIFICATION.md` sowie Task-Nachweise `P3-T30-REGRESSION.md` und `P3-T30-SOAK.md`.
- Plan 3-4 abgeschlossen; siehe `3-4-VERIFICATION.md` sowie Task-Nachweis `P3-T33-REGRESSION.md`.
- Plan 3-5 ist abgeschlossen; siehe `3-5-VERIFICATION.md`, `P3-T42-REGRESSION.md`, `P3-T43-SOAK.md`.
- Plan 3-6 ist abgeschlossen; siehe `3-6-VERIFICATION.md`, `P3-T49-REGRESSION.md`, `P3-T49-SOAK.md`.
