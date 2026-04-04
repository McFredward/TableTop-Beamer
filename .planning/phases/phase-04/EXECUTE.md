# Execute Phase 4

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 4-1 (verbindlich)
1. P0 zuerst: P4-T1..P4-T3 (Architektur-Skeleton + Config + Pure-Helpers).
2. P0 danach: P4-T4 (State-Extraktion + Aufrufpfad-Umstellung).
3. P0 danach: P4-T5..P4-T6 (Persistenz/API-Isolation).
4. P0 Abschluss: P4-T7 (Smoke-Regression und Baseline-Vergleich).

## Priority Execution - Plan 4-2 (verbindlich)
1. P0 zuerst: P4-T8..P4-T9 (weitere `app.js`-Zerlegung + neues kanonisches Room-JSON-Modell vorbereiten).
2. P0 danach: P4-T10..P4-T13 (Room-CRUD, freie Polygon-Editierung, Custom-Raumnamen in Settings produktiv schalten).
3. P0 danach: P4-T14..P4-T15 (Schema-Migration und Legacy-Kompatibilitaet absichern).
4. P0 Abschluss: P4-T16 (gezielte Plan-4-2-Regression und Nachweis dokumentieren).

## Priority Execution - Plan 4-3 (verbindlich, P0 Pflicht-Feedback)
1. P0 zuerst: P4-T17..P4-T18 (Desktop-Running-Containment + Layout-Guard, Controls immer erreichbar).
2. P0 danach: P4-T19..P4-T20 (Preview-Staging komplett entfernen in UI/Runtime/State/Flows).
3. P0 Abschluss: P4-T21 (gezielte Regression fuer Desktop-Erreichbarkeit + Kernflow-Paritaet ohne Preview).

## Priority Execution - Plan 4-4 (verbindlich, P0 Pflicht-Hotfix)
1. P0 zuerst: P4-T28..P4-T29 (Handle-Size-Control nahe Zoom + konsistente Render/Hitarea-Skalierung).
2. P0 danach: P4-T30 (Random-Flicker-Rework fuer `lichtflackern`, weiterhin strikt raumgeclippt).
3. P0 danach: P4-T31 (Room-Flaechen-Drag im Settings-Edit-Mode mit Guard gegen Vertex-Edit-Kollision).
4. P0 Abschluss: P4-T32 (Hotfix-Fokus-Regression und Nachweisdoku).

## Priority Execution - Plan 4-5 (verbindlich, weiteres P0 Pflicht-Feedback)
1. P0 zuerst: P4-T33..P4-T34 (Handle-Size-Paritaet fuer alle Editoren inkl. Ship-Vertices).
2. P0 danach: P4-T35..P4-T36 (`lichtflackern`-Cleanup ohne horizontale Weissstreifen + 10%-Speed-Floor).
3. P0 danach: P4-T37..P4-T38 (Sound-Mapping-Persistenz inkl. Global-Defaults-Save/Load + Reload-Nachweis).
4. P0 Abschluss: Hotfix-Fokus-Regression gegen `ACCEPTANCE.md` dokumentieren.

## Priority Execution - Plan 4-5b (verbindlich, P0 Mini-Hotfix aus Verify-Follow-up)
1. P0 zuerst: P4-T39 (Persist-on-change in relevanten Audio-/Sound-Mapping-Handlern).
2. P0 danach: P4-T40 (Reload-Determinismus unmittelbar nach Aenderung ohne Zusatzaktion absichern).
3. P0 Abschluss: P4-T41 (kurze Regression-Doku mit direktem Change->Reload-Nachweis).

## Priority Execution - Plan 4-6 (verbindlich)
1. P1 zuerst: P4-T22..P4-T23 (GIF- und Render-Isolation).
2. P1 danach: P4-T24..P4-T25 (UI-/Input-Entkopplung ohne Preview-Pfade).

## Priority Execution - Plan 4-7 (verbindlich)
1. P1 zuerst: P4-T26 (Vollmatrix-Regression).
2. P1 Abschluss: P4-T27 (Wartbarkeitsdoku + Artefakt-Sync).

## Gate-Regeln
- Kein Ueberspringen: P4-T7 muss gruen sein, bevor P4-T8 startet.
- Kein Room-CRUD-GoLive ohne P4-T14/P4-T15-Migrations- und Legacy-Nachweise.
- Kein Weitergehen zu P4-T22+, bevor P4-T21 den Desktop-Containment-Nachweis und Preview-Removal-Nachweis erbracht hat.
- Kein Weitergehen zu P4-T22+, bevor P4-T32 den Editor/Immersion-Hotfix-Nachweis fuer Handle-Size, Random-Flicker und Room-Drag erbracht hat.
- Kein Weitergehen zu P4-T22+, bevor P4-T38 den Nachweis fuer Handle-Paritaet (inkl. Ship), Flicker-Cleanup + 10%-Speed-Floor und Sound-Persistenz inkl. Global Defaults erbracht hat.
- Kein Weitergehen zu P4-T22+, bevor P4-T41 den Verify-4-5-Rest-Gap schliesst (Persist-on-change + deterministischer Direkt-Reload) und dokumentiert.
- Keine API/Persistenz-Aenderung ohne schema-kompatible Save/Load-Nachweise.
- Keine GIF-/Render-Freigabe ohne nativen und fallback Loop-Nachweis.
- Kein Abschluss ohne Mobile-Regression (No-Overlay, Navigation, Pan/Edit).
- Kein Phase-4-Exit ohne aktualisierte Modulkarte und synchronisierte Planungsartefakte.

## Update Rules
- Taskstatus in `TASKS.md` nach jedem abgeschlossenen Task aktualisieren.
- Relevante Architekturentscheidungen in `.planning/STATE.md` Decision Log erfassen.
- Bei Scope-Anpassungen `PLAN.md`, `BACKLOG.md` und `ACCEPTANCE.md` im selben Schritt synchronisieren.
