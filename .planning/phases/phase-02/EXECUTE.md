# Execute Phase 2

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution Add-on (Plan Update 2 - verbindlich)
1. P0 zuerst: P2-T1..P2-T4 (Mobile UX-Blueprint, Portrait/Landscape-Struktur, Touch-Target-Hardening).
2. P0 danach: P2-T5..P2-T6 (Einhand-Flow und Fehlklick-Schutz fuer Touch, inkl. Safety-Aktionen).
3. P1 danach: P2-T7..P2-T8 (Lesbarkeit am Spieltisch + stabiler Orientation-Wechsel ohne State-Drift).
4. P1 Hardening: P2-T9..P2-T10 (Mobile Performance/Responsiveness-Verifikation + reales Spieltisch-Protokoll).

## Priority Execution Add-on (Verpflichtendes Feedback Phase 2 - verbindlich)
1. P0 zuerst: P2-T26..P2-T27 (Global-Defaults-Bugfix + kein stilles Ignorieren bei leerem Local Storage).
2. P0 danach: P2-T28 (Settings-Button `Defaults laden & anwenden` mit unmittelbarer Session-Wirkung).
3. P0 danach: P2-T29 (Mobile Sticky/Fixierung ohne Content-Ueberdeckung).
4. P1 Hardening: P2-T30 (Desktop-Paritaetscheck fuer Mobile-Sticky-Aenderungen).

## Priority Execution Add-on (Neues verpflichtendes Feedback Phase 2 - Plan Update 3)
1. P0 zuerst: P2-T31..P2-T32 (Mobile-Cluster darf Board-Projektionsflaeche nicht ueberdecken; Board-Interaktion bleibt frei).
2. P0 danach: P2-T33..P2-T34 (View-Navigation `Dashboard` <-> `Settings` state-robust und verlaesslich erreichbar).
3. P1 Hardening: P2-T35 (verbindliches Mobile/Desktop-Nachweisprotokoll fuer die Bugfixes).

## Priority Execution Add-on (Neues verpflichtendes Feedback Phase 2 - Plan Update 4, P0-Hotfix)
1. P0 zuerst: P2-T36..P2-T37 (Trigger-Modus-No-Overlay + `Dashboard`/`Settings` non-sticky im Mobile-Flow).
2. P0 danach: P2-T38..P2-T39 (Board-Containment-Guard + Regression fuer Scroll/Orientation/View-Switch inkl. Desktop-Paritaet).
3. P1 Hardening: P2-T40 (Vorher/Nachher-Nachweis mit Referenz `debug/screenshot_debug.jpg`).

## Priority Execution Add-on (Phase 2 Abschluss - Plan Update 5)
1. P0 zuerst: P2-T41..P2-T42 (externe Zonen-JSON als Source-of-Truth + Validator/Fallback als Pflichtpfad).
2. P0 danach: P2-T44..P2-T45 (echtes Preview/Kombi-Staging + Live-Absenden/Undo-Rollback inkl. API-Verdrahtung).
3. P1 danach: P2-T43 (Negativtests und Hardening fuer malformed/missing/partial Zonen-Daten).
4. P1 Abschluss: P2-T46..P2-T47 (README finalisieren + Re-Verification/Exit-Gate dokumentieren).

## Execution Order (Phase 2 gesamt)
1. Phase-2 Abschluss-Add-on (P2-T41..P2-T47).
2. Neues verpflichtendes Feedback Hotfix 2 (P2-T36..P2-T40).
3. Neues verpflichtendes Feedback Hotfix (P2-T31..P2-T35).
4. Verpflichtendes Feedback Hotfix (P2-T26..P2-T30).
5. Mobile-First Foundation (P2-T1..P2-T10).
6. Core Data (P2-T11..P2-T13).
7. Calibration UX (P2-T14..P2-T16).
8. Control & Audio (P2-T17..P2-T19).
9. Preview/Live (P2-T20..P2-T22).
10. Hardening & Verification (P2-T23..P2-T25).

## Update Rules
- Taskstatus im `TASKS.md` laufend pflegen.
- Abweichungen am Scope im `STATE.md` Decision Log dokumentieren.
- Vor Abschluss von Phase 2 alle Punkte in `ACCEPTANCE.md` nachweisen.
- Mobile-Pflicht fuer Plan-Update 2: ohne nachgewiesene Smartphone-Bedienbarkeit (Portrait + Landscape, einhaendig, fehlklickarm) kein Milestone-Abschluss.
- Pflichtfeedback-Gate: ohne Nachweis fuer (a) Global-Defaults-Autoload bei leerem Storage, (b) `Defaults laden & anwenden`, (c) Mobile-Top-Control-ohne-Overlap und (d) Desktop-Paritaet kein Fortschritt in nachgelagerte Milestones.
- Pflichtfeedback-Gate Plan-Update 3: ohne Nachweis fuer (a) Board-Projektionsflaeche bleibt auf Mobile sichtbar/bedienbar und (b) Navigation `Dashboard` <-> `Settings` bleibt robust erreichbar kein Fortschritt in nachgelagerte Milestones.
- Pflichtfeedback-Gate Plan-Update 4 (P0-Hotfix): ohne Nachweis fuer (a) non-sticky `Dashboard`/`Settings` auf Mobile, (b) No-Overlay-Layout fuer Triggern/Running managen/Raum starten und (c) Board-Sichtbarkeit/-Bedienbarkeit in Scroll/Orientation/View-Switch kein Fortschritt in nachgelagerte Milestones.
- Abschluss-Gate Plan-Update 5: ohne Nachweis fuer (a) externe Zonen-JSON mit Validator+Fallback, (b) echten Preview/Kombi/Absenden+Rollback-Datenpfad und (c) README-Workflow-Update kein formaler Phase-2-Abschluss.
