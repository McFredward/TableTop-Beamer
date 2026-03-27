# Execute Phase 8

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 8-1 (verbindlich, erste execute-ready Welle)
1. P0 zuerst: P8-T1..P8-T3 (Mehrbereichs-Datenmodell + Legacy-Normalisierung + idempotente Persistenzmigration).
2. P0 danach: P8-T4..P8-T5 (Play-Area CRUD/Selection im Settings-Editor stabilisieren).
3. P0 danach: P8-T6..P8-T7 (Union-Geometrie in Render/Clipping/Input deterministisch anwenden).
4. P0 danach: P8-T8..P8-T9 (serverseitiger Bild-Upload mit Validierung, Speicherung und Katalogintegration).
5. P0 danach: P8-T10 (Import-UX fuer JSON/Bild und direkter manueller Polygon-Startflow).
6. P0 Abschluss: P8-T11 (Regression/Verifikation komplett ausfuehren).
7. P0 Abschluss: P8-T12 (vollstaendiger Artefakt-Sync inkl. globaler Tracking-Dateien).

## Priority Execution - Plan 8-HF1 (verbindlich, priorisierte P0-Hotfix-Welle)
1. P0 zuerst: P8-T18..P8-T20 (Play-Area-Click-Selection entfernen, Room-Klick priorisieren, Selection-Edit-Regression absichern).
2. P0 danach: P8-T21..P8-T22 (Import-Success-Apply + sofortiger Board-Dropdown-Refresh und Active-Board-Switch).
3. P0 danach: P8-T23 (Empty-Start-Guard fuer importierte Bildboards ohne Start-Polygone).
4. P0 Abschluss: P8-T24 (Hotfix-Verifikation + Artefakt-Sync inkl. globaler Tracking-Dateien).

## Priority Execution - Plan 8-HF2 (verbindlich, priorisierte P0-Feature-Welle)
1. P0 zuerst: P8-T25..P8-T27 (Outside-Animationsmodell + `Outside Sandstorm` + optionales Boomerang-Playback ohne Audio).
2. P0 danach: P8-T28..P8-T29 (Settings-Auslagerung in `Outside Animations` + Dropdown-basierte per-animation Bearbeitung).
3. P0 danach: P8-T30..P8-T32 (UI-Asset-Mapping, Create-Flow fuer neue Outside-Animationen, Resource-Asset-Picker).
4. P0 danach: P8-T33 (Persistenz-/Migrationspfad fuer Outside-Animationsdefinitionen + Settings).
5. P0 Abschluss: P8-T34 (P0-Verifikation + Artefakt-Sync inkl. globaler Tracking-Dateien).

## Priority Execution - Plan 8-HF3 (verbindlich, priorisierte P0-Hotfix-Welle)
1. P0 zuerst: P8-T35..P8-T36 (`Coded/Space` Restore + Sandstorm-Playback-Stability gegen Restart/Rewind-Flackern).
2. P0 danach: P8-T37 (Boomerang-Checkbox + Asset-Type-Dropdown im Outside-Editor wieder stabil editierbar machen).
3. P0 danach: P8-T38 (`Apply changes` liefern, damit Type/Resource/Optionen atomar zusammen committen).
4. P0 danach: P8-T39 (Apply/Save/Reload/Restart-Non-Regression fuer Outside-Editorwerte durchziehen).
5. P0 Abschluss: P8-T40 (Hotfix-Verifikation + Artefakt-Sync inkl. globaler Tracking-Dateien).

## Priority Execution - Plan 8-HF4 (verbindlich, priorisierte P0-Hotfix-Welle)
1. P0 zuerst: P8-T41 (`Coded/Space` auf funktionierenden coded Star-Space Pfad zurueckfuehren).
2. P0 danach: P8-T42..P8-T44 (Asset-Picker strikt typspezifisch filtern und Type-Switch ohne stale/revert Drift haerten).
3. P0 danach: P8-T45 (Boomerang-Playback als vollstaendigen Forward->Reverse-Loop ohne sichtbares Flicker/Restart-Jump absichern).
4. P0 Abschluss: P8-T46 (Hotfix-Verifikation + Artefakt-Sync inkl. globaler Tracking-Dateien).

## Priority Execution - Plan 8-2 (nach 8-HF4)
1. P1 zuerst: P8-T13 (Multi-Area UX-Polish).
2. P1 danach: P8-T14 (Migration/Import Soak unter wiederholten Zyklen).
3. P1 Abschluss: P8-T15 (Union-Performance Hardening/Report).

## Priority Execution - Plan 8-3 (nach 8-2)
1. P1 zuerst: P8-T16 (Realsetup-Abnahme control + `/output/final`).
2. P1 Abschluss: P8-T17 (finale Betreiberabnahme + Rollout/Fallback-Checkliste).

## Gate-Regeln
- Kein Weitergehen zu P8-T4+, bevor P8-T3 die migrationssichere Datenbasis nachweist.
- Kein Weitergehen zu P8-T8+, bevor P8-T7 Union-Semantik fuer Render/Clipping/Input ohne Leaks bestaetigt.
- Kein Weitergehen zu P8-T11+, bevor P8-T10 JSON/Bild-Importpfade UX-seitig funktionsfaehig integriert.
- Kein Weitergehen zu Plan 8-HF1, bevor Plan 8-1 vollstaendig PASS ist.
- Kein Weitergehen zu Plan 8-HF2, bevor Plan 8-HF1 vollstaendig PASS ist.
- Kein Weitergehen zu Plan 8-HF3, bevor Plan 8-HF2 vollstaendig PASS ist.
- Kein Weitergehen zu Plan 8-HF4, bevor Plan 8-HF3 vollstaendig PASS ist.
- Kein Weitergehen zu Plan 8-2, bevor Plan 8-HF4 vollstaendig PASS ist.
- Kein Wellenabschluss ohne konsistenten Artefakt-Sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Update Rules
- Taskstatus in `TASKS.md` nach jedem abgeschlossenen Task aktualisieren.
- Relevante Architekturentscheidungen in `.planning/STATE.md` Decision Log erfassen.
- Bei Scope-Aenderungen `PLAN.md`, `BACKLOG.md` und `ACCEPTANCE.md` im selben Schritt synchronisieren.

## Execution Status
- 2026-03-27: Plan 8-1 abgeschlossen (P8-T1..P8-T12 done).
- Verify-Artefakt: `.planning/phases/phase-08/8-1-VERIFICATION.md`.
- 2026-03-27: Plan 8-HF1 abgeschlossen (P8-T18..P8-T24 done).
- Verify-Artefakte: `.planning/phases/phase-08/8-HF1-VERIFICATION.md`, `.planning/phases/phase-08/P8-T20-REGRESSION.md`, `.planning/phases/phase-08/P8-T23-EMPTY-START-VALIDATION.md`.
- 2026-03-27: Plan 8-HF2 abgeschlossen (P8-T25..P8-T34 done).
- Verify-Artefakte: `.planning/phases/phase-08/8-HF2-VERIFICATION.md`, `debug/p8-hf2-api-resources.json`, `debug/p8-hf2-api-health.json`.
- 2026-03-27: Plan 8-HF3 als naechste execute-ready P0-Hotfix-Welle vorbereitet (P8-T35..P8-T40 TODO) und vor Plan 8-2 priorisiert.
- 2026-03-27: Plan 8-HF3 abgeschlossen (P8-T35..P8-T40 done).
- Verify-Artefakte: `.planning/phases/phase-08/8-HF3-VERIFICATION.md`, `.planning/phases/phase-08/P8-T39-OUTSIDE-EDITOR-REGRESSION.md`, `debug/p8-hf3-api-resources.json`, `debug/p8-hf3-api-health.json`.
- 2026-03-27: Neues verpflichtendes P0-Regressionsfeedback priorisiert Plan 8-HF4 als naechste execute-ready Welle (P8-T41..P8-T46 TODO) vor Plan 8-2.
- 2026-03-27: Plan 8-HF4 abgeschlossen (P8-T41..P8-T46 done).
- Verify-Artefakte: `.planning/phases/phase-08/8-HF4-VERIFICATION.md`, `.planning/phases/phase-08/P8-T45-BOOMERANG-REGRESSION.md`.
