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

## Plan 4-3 - Pflicht-Feedback-Hotfix (execute-ready)
- [x] DONE P4-T17 [P0] Desktop-Running-Liste begrenzen (maximale Hoehe + eigener Scrollbereich oder layout-separiert), sodass restliche Dashboard-Controls stets erreichbar bleiben.
- [x] DONE P4-T18 [P0] Desktop-Layout-Guard einbauen (keine Ueberdeckung/Vertreibung anderer Bedienmodule durch Laufzeitliste bei vielen Instanzen).
- [x] DONE P4-T19 [P0] Preview-Staging-UI komplett entfernen (Panels, Buttons, Labels, Hinweise) inkl. leerer States im DOM-Wiring.
- [x] DONE P4-T20 [P0] Preview-Staging-Runtime entfernen (Preview-Queue/Commit/Rollback-Logik, Actions, Event-Pfade, State-Felder).
- [x] DONE P4-T21 [P0] Regression fuer Pflicht-Feedback dokumentieren (Desktop-Erreichbarkeit unter Last + Kernflow-Paritaet ohne Preview-Staging).

## Plan 4-4 - Editor/Immersion-Polish Hotfix (execute-ready)
- [x] DONE P4-T28 [P0] Polygon-Editor: Handle-Groesse als eigene Settings-Steuerung nahe Zoom-Controls einbauen (klarer Wertebereich, sofort wirksam).
- [x] DONE P4-T29 [P0] Polygon-Editor-Render/Input auf variable Handle-Groesse umstellen (sichtbarer Radius + Hit-Target konsistent, auch bei hohem Zoom).
- [x] DONE P4-T30 [P0] `lichtflackern` von Pulsieren auf unregelmaessiges kaputtes Random-Flicker reworken (Dead-Space-artig), weiterhin strikt raumgeclippt.
- [x] DONE P4-T31 [P0] Settings-Edit-Mode erweitern: Room-Polygon per LMB-Flaechen-Drag als Ganzes verschiebbar machen, mit eindeutigen Guards gegen Vertex-Edit-Kollision.
- [x] DONE P4-T32 [P0] Hotfix-Regression dokumentieren (High-Zoom-Precision, Random-Flicker-Charakter, Room-Drag ohne Vertex-Regression, Clipping unveraendert).

## Plan 4-5 - weiteres Pflicht-Feedback (priorisierter P0-Hotfix, execute-ready)
- [x] DONE P4-T33 [P0] Handle-Groessen-Contract editoruebergreifend vereinheitlichen, sodass ALLE Editor-Punkte inkl. Ship-Polygon-Vertices denselben Visual-/Hitarea-Skalierungspfad nutzen.
- [x] DONE P4-T34 [P0] Ship-Polygon-Editor auf die gemeinsame Handle-Groessensteuerung anbinden (sofort wirksam, zoomstabil, keine eigene Sonderlogik).
- [x] DONE P4-T35 [P0] `lichtflackern` visuell bereinigen: stoerende horizontale weisse Streifen/Glitch-Baender entfernen, Random-Flicker-Stil beibehalten.
- [x] DONE P4-T36 [P0] `lichtflackern`-Speed-Floor auf 10% absenken (UI-Range, Normalisierung, Runtime-Playback konsistent).
- [x] DONE P4-T37 [P0] Sound-Mapping/Sound-Auswahl in Profil-/Board-Persistenz aufnehmen, inklusive Reload-Paritaet und Legacy-Fallback.
- [ ] TODO P4-T38 [P0] Global-Defaults-Save/Load auf Sound-Mappings erweitern und Hotfix-Regression dokumentieren (Persistenz lokal + Global Defaults + Reload).

## Plan 4-6 - Render/GIF/UI Isolation
- [ ] TODO P4-T22 [P1] GIF-Subsystem modularisieren (`loader`, `decoder`, `scheduler`, `cache`) mit nativer und fallback Paritaet.
- [ ] TODO P4-T23 [P1] Render-Engine splitten (`room`, `global-inside`, `global-outside`, clipping utils) bei unveraendertem Output.
- [ ] TODO P4-T24 [P1] UI-Bindings fuer Dashboard/Settings in View-Controller aufteilen; Settings-Ownership-Guard erhalten.
- [ ] TODO P4-T25 [P1] Input-Handling fuer Pointer/Touch/Keyboard/Pan in dediziertes Modul ziehen; Pan-vs-Edit-Guards erhalten.

## Plan 4-7 - Abschluss und Hardening
- [ ] TODO P4-T26 [P1] Vollstaendige Regression-Matrix aus `ACCEPTANCE.md` durchfuehren (Desktop, Mobile, GIF fallback, Save/API, Clipping, Room-CRUD, Preview-entfernt).
- [ ] TODO P4-T27 [P1] Wartbarkeitsdoku finalisieren (Modulkarte, Import-Regeln, Erweiterungspunkte) und Artefakt-Sync abschliessen.
