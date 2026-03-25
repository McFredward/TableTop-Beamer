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

## Priority Execution - Plan 3-3 P0 Bugfix (verbindlich)
1. P0 zuerst: P3-T26..P3-T27 (native GIF-Loops fuer `kaputt`/`feuer`/`schleim`, kein Pulse-/Zoom-Ersatz).
2. P0 danach: P3-T28 (Instanzparameter-Paritaet `opacity`/`playbackSpeed` unter nativer GIF-Wiedergabe).
3. P0 Abschluss: P3-T29 (Regression-Gate fuer Running-List, hold-by-default, Clipping).
4. P1 Hardening: P3-T30 (Loop-Roundtrip-Nachweise + Soak).
5. P1 Abschluss: P3-T31 (Plan-3-3-Verifikation + Artefakt-Sync).

## Priority Execution - Plan 3-4 P0 Cross-Browser-Fallback-Fix (verbindlich)
1. P0 zuerst: P3-T32..P3-T33 (Fallback-Standbild entfernen, decoder-agnostisches GIF-Looping fuer `kaputt`/`feuer`/`schleim`).
2. P0 danach: P3-T34 (Instanzparameter-Paritaet `opacity`/`playbackSpeed` in nativen + fallback Playback-Pfaden).
3. P0 Abschluss: P3-T35 (Regression-Gate fuer Running-List, hold-by-default, Clipping).
4. P1 Hardening: P3-T36 (Browser-Matrix + Soak inkl. Loop-Roundtrip ohne `ImageDecoder`).
5. P1 Abschluss: P3-T37 (Plan-3-4-Verifikation + Artefakt-Sync).

## Gate-Regeln Plan 3-2
- Ohne nachgewiesenes separates Instanzmodell kein Fortschritt ueber P3-T15 hinaus.
- Ohne 1:1-Paritaet Triggerinstanz zu Running-Eintrag kein Fortschritt zu GIF-/Global-Aequivalent-Tasks.
- Ohne verbindliche GIF-Assets fuer `kaputt`/`feuer`/`schleim` kein P0-Abschluss.
- Ohne raumbegrenztes Clipping fuer `alarm` und `lichtflackern` kein P0-Abschluss.
- Ohne nachgewiesenes `hold`-Default-Verhalten kein Plan-3-2-Abschluss.
- Ohne Verifikationsartefakt fuer Plan 3-2 kein Wechsel in weitere Ausbauwellen.

## Gate-Regeln Plan 3-3
- Ohne echten GIF-Loop-Playback-Nachweis fuer `kaputt`/`feuer`/`schleim` kein P0-Abschluss.
- Wenn fuer GIF-Raumtrigger ein Pulse-/Zoom-Ersatz sichtbar ist, gilt der Task als offen.
- Ohne instanzscharfe Wirkung von `opacity`/`playbackSpeed` kein Fortschritt zu Abschluss-Tasks.
- Ohne Regressionserfolg fuer Running-List, hold-default und Clipping kein Plan-3-3-Abschluss.
- Ohne Plan-3-3-Verifikationsartefakt (`3-3-VERIFICATION.md`) kein Wechsel in weitere Ausbauwellen.

## Gate-Regeln Plan 3-4
- Ohne echten GIF-Frame-Fortschritt im Fallback-Pfad (kein `ImageDecoder`) kein P0-Abschluss.
- Sobald `kaputt`/`feuer`/`schleim` im Fallback als Standbild erscheinen, gilt der jeweilige Task als offen.
- Ohne instanzscharfe Wirkung von `opacity`/`playbackSpeed` in nativen und fallback Pfaden kein Fortschritt zu Abschluss-Tasks.
- Ohne Regressionserfolg fuer Running-List, hold-default und Clipping kein Plan-3-4-Abschluss.
- Ohne Browser-Matrix-Nachweis mit Loop-Roundtrip pro GIF im Fallback kein P1-Abschluss.
- Ohne Plan-3-4-Verifikationsartefakt (`3-4-VERIFICATION.md`) kein Wechsel in weitere Ausbauwellen.

## Update Rules
- Taskstatus in `TASKS.md` kontinuierlich pflegen.
- Scope-/Prioritaetsaenderungen in `.planning/STATE.md` Decision Log dokumentieren.
- Vor Abschluss von Plan 3-3 alle Pflichtpunkte in `ACCEPTANCE.md` nachweisen.
- Vor Abschluss von Plan 3-4 alle Pflichtpunkte in `ACCEPTANCE.md` nachweisen.

## Execution Result
- Plan 3-2 abgeschlossen; siehe `3-2-VERIFICATION.md` sowie Task-Nachweise `P3-T23-REGRESSION.md` und `P3-T24-SOAK.md`.
- Plan 3-3 abgeschlossen; siehe `3-3-VERIFICATION.md` sowie Task-Nachweise `P3-T29-REGRESSION.md` und `P3-T30-SOAK.md`.
- Plan 3-4 ist abgeschlossen; siehe `3-4-VERIFICATION.md` sowie Task-Nachweise `P3-T35-REGRESSION.md` und `P3-T36-BROWSER-MATRIX-SOAK.md`.
