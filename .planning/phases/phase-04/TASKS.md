# Phase 4 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

## Plan 4-1 - Refactoring-Foundation (erste Ausfuehrungswelle)
- [x] DONE P4-T1 [P0] Zielordner `src/app/*` anlegen und kompatiblen Bootstrap-Entry aufsetzen (Runtime unveraendert startbar).
- [x] DONE P4-T2 [P0] Zentrale Constants/Config (`boards`, animation maps, defaults, storage keys) in dedizierte Module extrahieren.
- [x] DONE P4-T3 [P0] Pure Helper/Normalizer-Cluster auslagern (Zone-Validation, Geometry-Normalizer, Sound-Mapping-Helper).
- [x] DONE P4-T4 [P0] State-Kern extrahieren (`state`, defaults, selector helper) und bestehende Aufrufe auf Modul-API umstellen.
- [x] DONE P4-T5 [P0] Persistenz-Schicht extrahieren (Board-Profiles, Legacy-Migration, LocalStorage read/write) mit unveraendertem Datenformat.
- [x] DONE P4-T6 [P0] API-Schicht extrahieren (Resolver, Preflight, Save/Load, Error-Klassifikation) und Save-Flow auf Facade umstellen.
- [x] DONE P4-T7 [P0] Smoke-Regression fuer P4-T1..P4-T6 dokumentieren (`node --check`, Save/Load, Startup, View-Switch).

## Plan 4-2 - Raummodell-Generalisierung + Schema-Migration (priorisiert, execute-ready)
- [x] DONE P4-T8 [P0] `src/app.js` weiter entkoppeln: Room-Ownership in `domain/rooms` + `ui/settings/rooms` verschieben; Entry auf Orchestrierung reduzieren.
- [x] DONE P4-T9 [P0] Neues Room-JSON-Modell (`rooms[]` mit `id`, `name`, `polygon`, Metadaten) als kanonische Runtime-Struktur einfuehren.
- [x] DONE P4-T10 [P0] Settings-Flow: neuen Raum anlegen koennen (Hexagon als optionale Startform, alternativ leeres/freies Polygon).
- [x] DONE P4-T11 [P0] Settings-Flow: vorhandenen Raum loeschen koennen inkl. Integritaets-Guards (Selection/Running/Referenzen).
- [x] DONE P4-T12 [P0] Jeder Raum als frei editierbares Polygon fuehren (Insert/Delete/Move + Mindestpunkt-/Validierungsregeln).
- [x] DONE P4-T13 [P0] Jeder Raum bekommt editierbaren Custom-Namen inkl. sofortigem UI-/Runtime-Sync.
- [x] DONE P4-T14 [P0] Datenmigration: bestehende Defaults/Profile automatisch auf neuen JSON-Standard migrieren (verlustfrei).
- [x] DONE P4-T15 [P0] Rueckwaertskompatibilitaet: Legacy-Daten robust lesen; nach Save nur noch neues Schema schreiben.
- [x] DONE P4-T16 [P0] Plan-4-2-Gate: gezielte Regression fuer Room-CRUD, Polygon-Editing, Name-Editing, Save/Load alt+neu dokumentieren.

## Plan 4-3 - Render/GIF/UI Isolation
- [ ] TODO P4-T17 [P1] GIF-Subsystem modularisieren (`loader`, `decoder`, `scheduler`, `cache`) mit nativer und fallback Paritaet.
- [ ] TODO P4-T18 [P1] Render-Engine splitten (`room`, `global-inside`, `global-outside`, clipping utils) bei unveraendertem Output.
- [ ] TODO P4-T19 [P1] UI-Bindings fuer Dashboard/Settings in View-Controller aufteilen; Settings-Ownership-Guard erhalten.
- [ ] TODO P4-T20 [P1] Input-Handling fuer Pointer/Touch/Keyboard/Pan in dediziertes Modul ziehen; Pan-vs-Edit-Guards erhalten.
- [ ] TODO P4-T21 [P1] Running-Liste + Preview/Live-Bindings auf neue Domain-Services umstellen und 1:1-Instanzparitaet verifizieren.

## Plan 4-4 - Abschluss und Hardening
- [ ] TODO P4-T22 [P1] Vollstaendige Regression-Matrix aus `ACCEPTANCE.md` durchfuehren (Desktop, Mobile, GIF fallback, Save/API, Clipping, Room-CRUD).
- [ ] TODO P4-T23 [P1] Wartbarkeitsdoku finalisieren (Modulkarte, Import-Regeln, Erweiterungspunkte) und Artefakt-Sync abschliessen.
