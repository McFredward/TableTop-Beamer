# Execute Phase 3

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 3-2 Rework (verbindlich)
1. P0 zuerst: P3-T13..P3-T15 (separates Instanzmodell + Trigger/Stop/Edit + Running-List-Paritaet).
2. P0 danach: P3-T16..P3-T18 (`kaputt`/`feuer`/`schleim` auf verbindliche GIF-Assets).
3. P0 danach: P3-T19..P3-T20 (`alarm` + `lichtflackern` als globales Aequivalent, strikt raumbegrenzt).
4. P0 Abschluss: P3-T21..P3-T22 (instanzscharfe GIF-Parameter + `hold`-Default).
5. P1 Hardening: P3-T23..P3-T24 (Regression, Parallelbetrieb, Soak/Performance).
6. P1 Abschluss: P3-T25 (Plan-3-2-Verifikation + Artefakt-Sync).

## Gate-Regeln Plan 3-2
- Ohne nachgewiesenes separates Instanzmodell kein Fortschritt ueber P3-T15 hinaus.
- Ohne 1:1-Paritaet Triggerinstanz zu Running-Eintrag kein Fortschritt zu GIF-/Global-Aequivalent-Tasks.
- Ohne verbindliche GIF-Assets fuer `kaputt`/`feuer`/`schleim` kein P0-Abschluss.
- Ohne raumbegrenztes Clipping fuer `alarm` und `lichtflackern` kein P0-Abschluss.
- Ohne nachgewiesenes `hold`-Default-Verhalten kein Plan-3-2-Abschluss.
- Ohne Verifikationsartefakt fuer Plan 3-2 kein Wechsel in weitere Ausbauwellen.

## Update Rules
- Taskstatus in `TASKS.md` kontinuierlich pflegen.
- Scope-/Prioritaetsaenderungen in `.planning/STATE.md` Decision Log dokumentieren.
- Vor Abschluss von Plan 3-2 alle Pflichtpunkte in `ACCEPTANCE.md` nachweisen.

## Execution Result
- Plan 3-2 abgeschlossen; siehe `3-2-VERIFICATION.md` sowie Task-Nachweise `P3-T23-REGRESSION.md` und `P3-T24-SOAK.md`.
