# Phase 4 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

## Plan 4-1 - Refactoring-Foundation (erste Ausfuehrungswelle)
- [x] DONE P4-T1 [P0] Zielordner `src/app/*` anlegen und kompatiblen Bootstrap-Entry aufsetzen (Runtime unveraendert startbar).
- [ ] TODO P4-T2 [P0] Zentrale Constants/Config (`boards`, animation maps, defaults, storage keys) in dedizierte Module extrahieren.
- [ ] TODO P4-T3 [P0] Pure Helper/Normalizer-Cluster auslagern (Zone-Validation, Geometry-Normalizer, Sound-Mapping-Helper).
- [ ] TODO P4-T4 [P0] State-Kern extrahieren (`state`, defaults, selector helper) und bestehende Aufrufe auf Modul-API umstellen.
- [ ] TODO P4-T5 [P0] Persistenz-Schicht extrahieren (Board-Profiles, Legacy-Migration, LocalStorage read/write) mit unveraendertem Datenformat.
- [ ] TODO P4-T6 [P0] API-Schicht extrahieren (Resolver, Preflight, Save/Load, Error-Klassifikation) und Save-Flow auf Facade umstellen.
- [ ] TODO P4-T7 [P0] Smoke-Regression fuer P4-T1..P4-T6 dokumentieren (`node --check`, Save/Load, Startup, View-Switch).

## Plan 4-2 - Render/GIF/UI Isolation
- [ ] TODO P4-T8 [P1] GIF-Subsystem modularisieren (`loader`, `decoder`, `scheduler`, `cache`) mit nativer und fallback Paritaet.
- [ ] TODO P4-T9 [P1] Render-Engine splitten (`room`, `global-inside`, `global-outside`, clipping utils) bei unveraendertem Output.
- [ ] TODO P4-T10 [P1] UI-Bindings fuer Dashboard/Settings in View-Controller aufteilen; Settings-Ownership-Guard erhalten.
- [ ] TODO P4-T11 [P1] Input-Handling fuer Pointer/Touch/Keyboard/Pan in dediziertes Modul ziehen; Pan-vs-Edit-Guards erhalten.
- [ ] TODO P4-T12 [P1] Running-Liste + Preview/Live-Bindings auf neue Domain-Services umstellen und 1:1-Instanzparitaet verifizieren.

## Plan 4-3 - Abschluss und Hardening
- [ ] TODO P4-T13 [P1] Vollstaendige Regression-Matrix aus `ACCEPTANCE.md` durchfuehren (Desktop, Mobile, GIF fallback, Save/API, Clipping).
- [ ] TODO P4-T14 [P1] Wartbarkeitsdoku finalisieren (Modulkarte, Import-Regeln, Erweiterungspunkte) und Artefakt-Sync abschliessen.
