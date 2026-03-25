# Execute Phase 3

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 3-7 P0 Hotfix Add-on (verbindlich)
1. P0 sofort: P3-T51 (Repro-Harness + Telemetrie fuer den statischen Board-Fehlmodus bei laufendem Audio).
2. P0 sofort: P3-T52 (Render-Loop fail-safe hardenen: Einzel-Layer-/Clip-Fehler duerfen globalen Draw-Tick nie stoppen).
3. P0 sofort: P3-T53 (Outside-/Ship-Clip-Kompatibilitaet inkl. mobilem WebView-Fallback ohne evenodd-Abhaengigkeit).
4. P0 Gate: P3-T54 + P3-T55 (Outside-Fehler-Isolation + Mobile-Hard-Proof fuer sichtbare `global`/`room`/`gif`-Effekte).
5. P1 Abschluss: P3-T56 (Plan-3-7-Verifikation + Artefakt-Sync inkl. STATE/ROADMAP).

## Gate-Regeln Plan 3-7
- Ohne reproduzierbaren Nachweis des Fehlmodus (Board statisch, Audio laeuft) kein Abschluss von P3-T51.
- Ohne Render-Loop-Liveness unter injizierten Layer-/Clip-Fehlern kein Abschluss von P3-T52.
- Ohne browserrobusten Clip-Fallback fuer Outside/Ship (inkl. Mobile-WebView-Pfad) kein Abschluss von P3-T53.
- Ohne Negativtest `outside fail` mit weiterlaufenden Inside/Room/GIF-Effekten kein Abschluss von P3-T54.
- Ohne mobilen Sichtbarkeits-Hartnachweis fuer `global` + `room` + `gif` kein Abschluss von P3-T55.
- Ohne konsistenten Artefakt-Sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP`) kein Abschluss von P3-T56.

## Update Rules
- Taskstatus in `TASKS.md` kontinuierlich pflegen.
- Scope-/Prioritaetsaenderungen in `.planning/STATE.md` Decision Log dokumentieren.
- Vor Abschluss von Plan 3-7 alle Pflichtpunkte in `ACCEPTANCE.md` nachweisen.

## Execution Result
- Plan 3-2 abgeschlossen; siehe `3-2-VERIFICATION.md` sowie Task-Nachweise `P3-T23-REGRESSION.md` und `P3-T24-SOAK.md`.
- Plan 3-3 abgeschlossen; siehe `3-3-VERIFICATION.md` sowie Task-Nachweise `P3-T30-REGRESSION.md` und `P3-T30-SOAK.md`.
- Plan 3-4 abgeschlossen; siehe `3-4-VERIFICATION.md` sowie Task-Nachweis `P3-T33-REGRESSION.md`.
- Plan 3-5 ist abgeschlossen; siehe `3-5-VERIFICATION.md`, `P3-T42-REGRESSION.md`, `P3-T43-SOAK.md`.
- Plan 3-6 ist abgeschlossen; siehe `3-6-VERIFICATION.md`, `P3-T49-REGRESSION.md`, `P3-T49-SOAK.md`.
- Plan 3-7 ist abgeschlossen; siehe `3-7-VERIFICATION.md`, `P3-T55-REGRESSION.md`, `P3-T55-SOAK.md`.
