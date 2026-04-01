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

## Priority Execution - Plan 8-HF5 (verbindlich, priorisierte P0-Hotfix-Welle)
1. P0 zuerst: P8-T47 (Root-Cause Analyse Reverse-Lifecycle/Flicker fuer Sandstorm-Boomerang reproduzierbar dokumentieren).
2. P0 danach: P8-T48 (Reverse-Playback-Lifecycle fixen fuer stabilen full-cycle `forward -> reverse -> repeat` ohne sichtbares Flackern).
3. P0 danach: P8-T49 (Non-Regression fuer normalen mp4-Playback-Pfad ohne Boomerang absichern).
4. P0 danach: P8-T50..P8-T51 (`Apply changes`/Persistenz-Paritaet verifizieren und Evidence-Artefakte vervollstaendigen).
5. P0 Abschluss: P8-T52 (Hotfix-Verifikation + Artefakt-Sync inkl. globaler Tracking-Dateien).

## Priority Execution - Plan 8-HF6 (verbindlich, priorisierte P0-Hotfix-Welle)
1. P0 zuerst: P8-T53 (Root-Cause fuer `/output/final` Fullscreen-Missfit reproduzierbar isolieren).
2. P0 danach: P8-T54..P8-T55 (Stage/Canvas-Recompute fuer Viewport + DPR haerten und alle Resize/Orientation/Fullscreen/DPR-Trigger anbinden).
3. P0 danach: P8-T56 (Fullscreen-Fit fixen: kein Top-Left-Offset, kein Letterbox-Drift, volle Flaechennutzung).
4. P0 danach: P8-T57 (Rendering/Coords/Clip-Non-Regression unter dynamischem Reflow absichern).
5. P0 Abschluss: P8-T58 (Hotfix-Verifikation + Artefakt-Sync inkl. globaler Tracking-Dateien).

## Priority Execution - Plan 8-HF7 (verbindlich, priorisierte P0-Feature-/Cleanup-Welle)
1. P0 zuerst: P8-T59..P8-T60 (Boomerang aus UI/Runtime entfernen und Persistenz auf boomerang-freies kanonisches Verhalten bereinigen, Legacy-Read no-op-kompatibel halten).
2. P0 danach: P8-T61 (Inside-Animationssektion `Inside Animations` mit Dropdown-Editor + Create-Flow Outside-paritaetisch liefern).
3. P0 danach: P8-T62 (Inside-Asset-Mapping mit `assetType` `coded`/`gif`/`mp4`, typspezifischem `resources`-Picker und atomarem `Apply changes` umsetzen).
4. P0 danach: P8-T63 (Inside-Definitionsmodell ueber Save/Reload/Restart/Defaults inkl. Legacy-Guards persistenzstabil absichern).
5. P0 Abschluss: P8-T64 (P0-Verifikation + Artefakt-Sync inkl. globaler Tracking-Dateien).

## Priority Execution - Plan 8-HF8 (verbindlich, priorisierte P0-Hotfix-Welle)
1. P0 zuerst: P8-T65 (Outside-mp4 Root-Cause reproduzierbar isolieren und non-boomerang Playbackpfad wiederherstellen).
2. P0 danach: P8-T66 (Regression-Guard fuer gif/coded + stabile bestehende Playbackpfade nach mp4-Restore absichern).
3. P0 danach: P8-T67..P8-T68 (kontextsensitive Visibility fuer `outside mode`/`outside direction` umsetzen; fuer `gif`/`mp4` und nicht-applicable coded renderer ausblenden).
4. P0 danach: P8-T69 (UX-Cleanup: redundante `Use selected resource asset`-Buttons entfernen; `Apply changes` als einzigen Commit-CTA belassen).
5. P0 Abschluss: P8-T70 (Hotfix-Verifikation + Artefakt-Sync inkl. globaler Tracking-Dateien).

## Priority Execution - Plan 8-HF9 (verbindlich, priorisierte P0-Hotfix-Welle)
1. P0 zuerst: P8-T71 (Outside-mp4-Rueckfallpfad reproduzierbar isolieren, inkl. Start/Stop/Re-Start und Reload/Restart-Kontext).
2. P0 danach: P8-T72 (Outside-mp4-Lifecycle stabilisieren: deterministischer Start/Stop/Re-Start ohne no-op/Black/Frozen Rueckfall).
3. P0 danach: P8-T73 (Regression-Guard fuer gif/coded sowie Apply-/Persistenzpfade nach mp4-Fix absichern).
4. P0 danach: P8-T74..P8-T75 (strict conditional rendering: nicht-applicable Controls unmounten und Visibility-Transitions deterministic haerten).
5. P0 Abschluss: P8-T76 (Hotfix-Verifikation + Artefakt-Sync inkl. globaler Tracking-Dateien).

## Priority Execution - Plan 8-HF10 (verbindlich, priorisierte P0-Hotfix-Welle)
1. P0 zuerst: P8-T77 (Outside-mp4-Nicht-Sichtbarkeit reproduzierbar isolieren, inkl. Start/Stop/Re-Start und Save/Reload/Restart-Kontext).
2. P0 danach: P8-T78..P8-T79 (deterministischen Visible-Start im Outside-Renderpfad wiederherstellen und nahtlosen Loop ohne replay break/black frame/restart gap implementieren).
3. P0 danach: P8-T80 (Lifecycle-Hardening: visibility + seamless-loop continuity ueber Start/Stop/Re-Start sowie Save/Reload/Restart absichern).
4. P0 danach: P8-T81 (Apply-/Persistenz-Non-Regression absichern; `Apply changes` bleibt atomarer Commitpfad).
5. P0 Abschluss: P8-T82 (Hotfix-Verifikation + Artefakt-Sync inkl. runtime-fokussierter Evidence-Matrix fuer visibility/loop continuity).

## Priority Execution - Plan 8-HF11 (verbindlich, priorisierte P0-Hotfix-Welle)
1. P0 zuerst: P8-T83..P8-T84 (room-animations definitionsgetriebenes CRUD-Modell + typed asset mapping `coded`/`mp4`/`gif` analog outside/effects liefern).
2. P0 danach: P8-T85 (runtime-seitige start/edit/stop Paritaet fuer definitionsgetriebene Room-Animationen ohne codegebundene Einzelintegration absichern).
3. P0 danach: P8-T86..P8-T87 (first-start default-autoload bei leerem lokalen Zustand implementieren; `Load and apply defaults` als expliziten spaeteren Reset-Flow erhalten).
4. P0 Abschluss: P8-T88 (Hotfix-Verifikation + Artefakt-Sync inkl. globaler Tracking-Dateien).

## Priority Execution - Plan 8-HF12 (verbindlich, priorisierte P0-Hotfix-Welle)
1. P0 zuerst: P8-T89..P8-T90 (dedizierten `GIF Playback speed`-Slider entfernen und einheitlichen `Speed`-Control fuer `coded`/`gif`/`mp4` liefern).
2. P0 danach: P8-T91 (Opacity-Paritaet fuer Room-Animationen durchsetzen: `Opacity` bleibt fuer mp4 aktiv editierbar).
3. P0 danach: P8-T92..P8-T93 (Apply-/Persistenz-Determinismus fuer `Speed` + `Opacity` absichern und Room-CRUD/typed-asset Non-Regression verifizieren).
4. P0 Abschluss: P8-T94 (Hotfix-Verifikation + Artefakt-Sync inkl. globaler Tracking-Dateien).

## Priority Execution - Plan 8-2 (nach 8-HF12)
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
- Kein Weitergehen zu Plan 8-HF5, bevor Plan 8-HF4 vollstaendig PASS ist.
- Kein Weitergehen zu Plan 8-HF6, bevor Plan 8-HF5 vollstaendig PASS ist.
- Kein Weitergehen zu Plan 8-HF7, bevor Plan 8-HF6 vollstaendig PASS ist.
- Kein Weitergehen zu Plan 8-HF8, bevor Plan 8-HF7 vollstaendig PASS ist.
- Kein Weitergehen zu Plan 8-HF9, bevor Plan 8-HF8 vollstaendig PASS ist.
- Kein Weitergehen zu Plan 8-HF10, bevor Plan 8-HF9 vollstaendig PASS ist.
- Kein Weitergehen zu Plan 8-HF11, bevor Plan 8-HF10 vollstaendig PASS ist.
- Kein Weitergehen zu Plan 8-HF12, bevor Plan 8-HF11 vollstaendig PASS ist.
- Kein Weitergehen zu Plan 8-2, bevor Plan 8-HF12 vollstaendig PASS ist.
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
- 2026-03-27: Neues verpflichtendes P0-Feedback (Sandstorm Reverse-Flicker) priorisiert Plan 8-HF5 als naechste execute-ready Welle (P8-T47..P8-T52 TODO) vor Plan 8-2.
- 2026-03-27: Plan 8-HF5 abgeschlossen (P8-T47..P8-T52 done).
- Verify-Artefakte: `.planning/phases/phase-08/8-HF5-VERIFICATION.md`, `.planning/phases/phase-08/P8-T47-REVERSE-ROOT-CAUSE.md`, `.planning/phases/phase-08/P8-T51-HF5-REGRESSION.md`.
- 2026-03-29: Neues verpflichtendes P0-Problem priorisiert Plan 8-HF6 als naechste execute-ready Welle (P8-T53..P8-T58 TODO) vor Plan 8-2.
- 2026-03-29: Plan 8-HF6 abgeschlossen (P8-T53..P8-T58 done).
- Verify-Artefakte: `.planning/phases/phase-08/8-HF6-VERIFICATION.md`, `.planning/phases/phase-08/P8-T53-FINAL-OUTPUT-FULLSCREEN-ROOT-CAUSE.md`, `.planning/phases/phase-08/P8-T57-FINAL-OUTPUT-REFLOW-REGRESSION.md`.
- 2026-03-30: Neues verpflichtendes P0-Feature-/Cleanup-Paket priorisiert Plan 8-HF7 als naechste execute-ready Welle (P8-T59..P8-T64 TODO) vor Plan 8-2.
- 2026-03-30: Plan 8-HF7 abgeschlossen (P8-T59..P8-T64 done).
- Verify-Artefakte: `.planning/phases/phase-08/8-HF7-VERIFICATION.md`, `.planning/phases/phase-08/P8-T64-HF7-REGRESSION.md`.
- 2026-03-30: Neues verpflichtendes P0-Feedback priorisiert Plan 8-HF8 als naechste execute-ready Hotfix-Welle (P8-T65..P8-T70 TODO) vor Plan 8-2.
- 2026-03-30: Plan 8-HF8 abgeschlossen (P8-T65..P8-T70 done).
- Verify-Artefakte: `.planning/phases/phase-08/8-HF8-VERIFICATION.md`, `.planning/phases/phase-08/P8-T65-OUTSIDE-MP4-ROOT-CAUSE.md`, `.planning/phases/phase-08/P8-T66-MP4-NON-REGRESSION.md`.
- 2026-03-30: Neues verpflichtendes P0-Follow-up priorisiert Plan 8-HF9 als naechste execute-ready Hotfix-Welle (P8-T71..P8-T76 TODO) vor Plan 8-2.
- 2026-03-30: Plan 8-HF9 abgeschlossen (P8-T71..P8-T76 done).
- Verify-Artefakte: `.planning/phases/phase-08/8-HF9-VERIFICATION.md`, `.planning/phases/phase-08/P8-T71-OUTSIDE-MP4-LIFECYCLE-ROOT-CAUSE.md`, `.planning/phases/phase-08/P8-T73-MP4-REGRESSION-GUARD.md`, `.planning/phases/phase-08/P8-T74-STRICT-CONDITIONAL-UNMOUNT.md`, `.planning/phases/phase-08/P8-T75-VISIBILITY-TRANSITION-REGRESSION.md`.
- 2026-03-31: Kritisches P0-Follow-up priorisiert Plan 8-HF10 als naechste execute-ready Hotfix-Welle (P8-T77..P8-T82 TODO) vor Plan 8-2.
- 2026-03-31: Plan 8-HF10 abgeschlossen (P8-T77..P8-T82 done).
- Verify-Artefakte: `.planning/phases/phase-08/8-HF10-VERIFICATION.md`, `.planning/phases/phase-08/P8-T77-OUTSIDE-MP4-VISIBILITY-ROOT-CAUSE.md`, `.planning/phases/phase-08/P8-T80-VISIBILITY-LOOP-LIFECYCLE-REGRESSION.md`, `.planning/phases/phase-08/P8-T81-APPLY-PERSISTENCE-NON-REGRESSION.md`.
- 2026-04-01: Neues verpflichtendes P0-Featurepaket priorisiert Plan 8-HF11 als naechste execute-ready Hotfix-Welle (P8-T83..P8-T88 TODO) vor Plan 8-2.
- 2026-04-01: Plan 8-HF11 abgeschlossen (P8-T83..P8-T88 done).
- Verify-Artefakte: `.planning/phases/phase-08/8-HF11-VERIFICATION.md`, `.planning/phases/phase-08/P8-T88-HF11-REGRESSION.md`.
- 2026-04-01: Neues verpflichtendes P0-Refinement priorisiert Plan 8-HF12 als naechste execute-ready Hotfix-Welle (P8-T89..P8-T94 TODO) vor Plan 8-2.
- 2026-04-01: Plan 8-HF12 abgeschlossen (P8-T89..P8-T94 done).
- Verify-Artefakte: `.planning/phases/phase-08/8-HF12-VERIFICATION.md`, `.planning/phases/phase-08/P8-T92-SPEED-OPACITY-PERSISTENCE-REGRESSION.md`, `.planning/phases/phase-08/P8-T93-ROOM-CRUD-TYPED-ASSET-NON-REGRESSION.md`.
