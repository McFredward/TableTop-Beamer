# Execute Phase 6

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 6-1 (verbindlich, erste execute-ready Welle)
1. P0 zuerst: P6-T1..P6-T3 (Katalogschema + Server-Import + Persistenz + Katalog-Refresh).
2. P0 danach: P6-T4..P6-T5 (UI/Runtime auf dynamische Katalogauswahl umstellen).
3. P0 danach: P6-T6..P6-T9 (Room-Clusters inkl. Dropdown-Zielen und Einzelraum-Klickguard).
4. P0 danach: P6-T10..P6-T11 (English-only Sweep fuer UI/Status/Doku/Logs/Errors).
5. P0 danach: P6-T12 (Legacy-Migration fuer Nemesis/Polygone/Animationsconfigs idempotent integrieren).
6. P0 Abschluss: P6-T13 (Plan-6-1-Regression und Artefaktnachweis).

## Priority Execution - Plan 6-HF1 (verbindlich, P0-Hotfix vor 6-2)
1. P0 zuerst: P6-T18 (Language-Inventur fuer Control/Settings/Final-Flow inkl. Status/Errors/Logs).
2. P0 danach: P6-T19..P6-T20 (UI + Status/Error-Pfade vollstaendig auf Englisch vereinheitlichen).
3. P0 danach: P6-T21 (README + Phase-06-Doku konsistent auf English-only Operator Policy nachziehen).
4. P0 Abschluss: P6-T22 (Language-Sweep-Regression artefaktbasiert dokumentieren).

## Priority Execution - Plan 6-2 (verbindlich, P0-Welle nach 6-HF1)
1. P0 zuerst: P6-T23..P6-T24 (separate Vertex-Visibility-Toggles + Interaktionsguards fuer ausgeblendete Gruppen).
2. P0 danach: P6-T25..P6-T26 (Play-Area-Rename in UI/Model/Operator-Wording + Entfernung alter Spezialraum-Sondervisuals).
3. P0 danach: P6-T27..P6-T28 (Room-Creation aus Polygon-Template + Persistenz-/Migrationsguard).
4. P0 Abschluss: P6-T29 (Plan-6-2-Regression artefaktbasiert dokumentieren).

## Priority Execution - Plan 6-HF2 (verbindlich, P0-Hotfix vor 6-3)
1. P0 zuerst: P6-T30 (Room-Copy vollstaendig auf Geometry-Paritaet inkl. Scale/Offset/Transform bringen).
2. P0 danach: P6-T31..P6-T32 (Keyboard copy/paste/delete fuer selektierten Room + Empty-Space-Deselection).
3. P0 danach: P6-T33 (Play-Area-Non-Regression fuer Room-Editing-Hotfix absichern).
4. P0 Abschluss: P6-T34 (Plan-6-HF2-Regression artefaktbasiert dokumentieren).

## Priority Execution - Plan 6-HF3 (verbindlich, P0-Hotfix vor 6-3)
1. P0 zuerst: P6-T35 (Selection-Source-of-Truth fixieren: visuell selektiert = aktiv selektiert).
2. P0 danach: P6-T36 (Delete-Hotkey auf persistente Selection entkoppeln, ohne Hold/Drag-Abhaengigkeit).
3. P0 danach: P6-T37 (kombinierte Regression fuer Copy/Paste/Delete + Empty-space deselect + Play-Area-Guard nachweisen).
4. P0 Abschluss: P6-T38 (HF3-Artefakt-Sync fuer PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP).

## Priority Execution - Plan 6-HF4 (verbindlich, P0-Hotfix vor 6-3)
1. P0 zuerst: P6-T39 (Pointerdown/Click/Pointerup-Arbitration korrigieren: Click selektiert persistent, Hold/Move startet Drag).
2. P0 danach: P6-T40 (Selection-Lifecycle fixen: Room-Polygone/Handles bleiben nach Pointer-Up sichtbar bis Deselect/Room-Wechsel).
3. P0 danach: P6-T41 (Input-Consistency: Hold nur fuer Drag, Delete/Copy/Paste + Buttons strikt auf persistente Selection binden).
4. P0 danach: P6-T42 (kombinierte Regression unter neuer Arbitration dokumentieren: Delete/Copy/Paste + Empty-space deselect + Play-Area-Guard).
5. P0 Abschluss: P6-T43 (HF4-Artefakt-Sync fuer PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

## Priority Execution - Plan 6-3 (verbindlich, nach 6-HF4)
1. P1 zuerst: P6-T14 (Import-Konfliktstrategie finalisieren und Operator-Feedback absichern).
2. P1 danach: P6-T15..P6-T16 (Negativtests + Multi-Board-Soak fuer Import/Cluster/Migration).
3. P1 Abschluss: P6-T17 (formale Operator-E2E-Abnahme im Realsetup).

## Gate-Regeln
- Kein Weitergehen zu P6-T4+, bevor P6-T3 Importpersistenz + Katalog-Refresh ohne Neustart nachweisbar liefert.
- Kein Weitergehen zu P6-T6+, bevor P6-T5 die boardId-kataloggetriebene Runtime ohne A/B-Hardcoding nachweist.
- Kein Weitergehen zu P6-T10+, bevor P6-T9 Cluster-Fanout und Einzelraum-Klickguard regressionsfrei bestaetigt.
- Kein Weitergehen zu P6-T12+, bevor P6-T11 English-only fuer UI/Status/Doku/Logs/Errors artefaktbasiert bestaetigt.
- Kein Weitergehen zu P6-T23+, bevor P6-T22 den verify-work-6 P0-Blocker (`English-only operator flow`) artefaktbasiert geschlossen hat.
- Kein Weitergehen zu P6-T25+, bevor P6-T24 die Vertex-Interaktionsguards fuer ausgeblendete Gruppen nachweist.
- Kein Weitergehen zu P6-T27+, bevor P6-T26 die Play-Area-Terminologie und no-special-room-visuals konsistent nachweist.
- Kein Weitergehen zu P6-T30+, bevor P6-T29 die Plan-6-2-Regression artefaktbasiert abgeschlossen hat.
- Kein Weitergehen zu P6-T31+, bevor P6-T30 die vollstaendige Room-Copy-Geometrieparitaet nachweist.
- Kein Weitergehen zu P6-T33+, bevor P6-T32 Keyboard-Editing + Empty-Space-Deselection regressionsfrei bestaetigt.
- Kein Weitergehen zu P6-T35+, bevor P6-T34 die Plan-6-HF2-Regression artefaktbasiert abgeschlossen hat.
- Kein Weitergehen zu P6-T36+, bevor P6-T35 die persistente Selection-Semantik (`visuell selektiert = aktiv`) nachweist.
- Kein Weitergehen zu P6-T37+, bevor P6-T36 Delete ohne Hold-/Drag-Abhaengigkeit regressionsfrei bestaetigt.
- Kein Weitergehen zu P6-T39+, bevor P6-T38 die Plan-6-HF3-Regression inkl. Artefakt-Sync abgeschlossen hat.
- Kein Weitergehen zu P6-T40+, bevor P6-T39 die Pointer-Arbitration (`click select` vs `hold-drag move`) regressionsfrei nachweist.
- Kein Weitergehen zu P6-T41+, bevor P6-T40 die persistente Selection-Sichtbarkeit nach Pointer-Up bestaetigt.
- Kein Weitergehen zu P6-T42+, bevor P6-T41 die Hotkey/Button-Bindung an persistente Selection bestaetigt.
- Kein Weitergehen zu P6-T14+, bevor P6-T43 die Plan-6-HF4-Regression inkl. Artefakt-Sync abgeschlossen hat.
- Kein Phase-6-Exit ohne Migration-Idempotenznachweis und Reload/Restart-Paritaet.

## Update Rules
- Taskstatus in `TASKS.md` nach jedem abgeschlossenen Task aktualisieren.
- Relevante Architekturentscheidungen in `.planning/STATE.md` Decision Log erfassen.
- Bei Scope-Aenderungen `PLAN.md`, `BACKLOG.md` und `ACCEPTANCE.md` im selben Schritt synchronisieren.

## Execution Update - 6-HF4 Completed
- 6-HF4 ist abgeschlossen: click selection bleibt persistent, hold/move bleibt drag-only.
- Pointer-up invalidiert Selection nicht mehr; Room-Polygone/Handles bleiben sichtbar bis expliziter Deselection oder Room-Wechsel.
- Regression inklusive Delete/Copy/Paste + Empty-space deselect + Play-Area-Guard ist als PASS dokumentiert (`P6-T42-REGRESSION.md`).
- Gate zu Plan 6-3 ist geoeffnet.
