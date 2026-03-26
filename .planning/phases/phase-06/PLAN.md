# Phase 6 Plan (Prepared)

## Zielbild
Phase 6 transformiert TT Beamer von einem Nemesis-spezifischen Setup zu einer boardspiel-agnostischen Plattform. Operator koennen eigene Boards importieren, diese serverseitig persistieren und direkt ueber einen dynamischen Katalog auswaehlen. Parallel wird der komplette Operator-Flow auf Englisch vereinheitlicht (UI, Statusmeldungen, Dokuhinweise, relevante Logs/Errors). Darauf aufbauend werden Room-Clusters eingefuehrt, sodass mehrere Raeume als gemeinsames Triggerziel im Dropdown bedient werden koennen, ohne das etablierte Einzelraum-Klickverhalten auf dem Board zu brechen. Der Polygon-Editor wird fuer sichere Bearbeitung erweitert (separate Vertex-Visibility-Toggles fuer Room vs Play Area), die Begrifflichkeit wird von `Ship Polygon` auf `Play Area` vereinheitlicht, fruehere Spezialraum-Sondermarkierungen entfallen vollstaendig, und neue Raeume koennen aus bestehenden Polygonvorlagen erzeugt werden. Zusaetzlich wird das Room-Editing ueber verpflichtende Hotfix-Wellen erweitert: vollstaendiges Room-Copy inkl. saemtlicher Geometrie-Properties (Skalierung/Offsets etc.), Keyboard-Shortcuts fuer Copy/Paste/Delete am selektierten Raum, deterministische Deselection bei Klick auf leere Boardflaeche sowie persistente Selection-Semantik (`visuell selektiert = aktiv selektiert`) mit Delete ohne LMB-Hold-Abhaengigkeit. Bestehende Nemesis-Daten inklusive Polygon- und Animationskonfigurationen werden in ein neues Standardschema migriert.

## Hotfix Trigger (verify-work 6 Follow-up)
- Der verify-work-6 Follow-up meldet den P0-Blocker `English-only operator flow` als offen.
- Konsequenz: Plan 6-HF1 ist als verpflichtende P0-Hotfix-Welle zwischen 6-1 und 6-2 gesetzt.
- Ziel von 6-HF1: keine deutschen Operator-Texte mehr in `Control`, `Settings` und `Final-Flow`, konsistente Doku (`README` + Phase-06-Artefakte) und artefaktbasierter Language-Sweep-Nachweis.

## Verbindliche Architekturentscheidungen
- Board-Katalog ist kanonische Quelle fuer Board-Auswahl und Runtime-Kontext (kein hardcoded A/B-Pfad).
- Board-Import erfolgt datengetrieben ueber ein versioniertes Importformat mit serverseitiger Validierung.
- Persistierte Boards liegen serverseitig in einem dedizierten Storage-Pfad und werden beim Serverstart in den Katalog geladen.
- Runtime nutzt `boardId`-basierte Aufloesung fuer Geometrie, Labels, Rooms, Clusters und Profilzuordnung.
- Operator-Textquellen werden auf Englisch konsolidiert; deutschsprachige Runtime-Texte gelten als Regression.
- Room-Cluster sind explizite Datenobjekte (`clusterId`, `name`, `roomIds`) pro Board und werden als eigene Zieltypen im Dropdown gefuehrt.
- Board-Klick selektiert weiterhin ausschliesslich den einzelnen Zielraum; Cluster werden nur ueber explizite Cluster-Auswahl gestartet.
- Polygon-Editor trennt Vertex-Sichtbarkeit verbindlich nach Typ (`roomVerticesVisible`, `playAreaVerticesVisible`), um Cross-Drag-Fehler zu verhindern.
- Wording `Ship Polygon` wird in UI/Model/Operator-Flows durchgaengig auf `Play Area` umgestellt; Legacy-Bezeichner sind nur als kompatibler Ladealias erlaubt.
- Ehemalige Spezialraeume besitzen keine visuelle Sonderbehandlung mehr und folgen denselben Editor-/Renderregeln wie normale Raeume.
- Room-Creation unterstuetzt Polygon-Template-Copy aus bestehendem Room- oder Play-Area-Polygon als Startform.
- Room-Copy ist deep-copy-basiert und uebernimmt alle Room-Geometry-Eigenschaften inkl. Skalierungsfaktoren, Offsets und transform-relevanter Parameter.
- Keyboard-Editing ist fuer selektierten Room verpflichtend: `CTRL+C` kopiert, `CTRL+V` fuegt ein, `Delete` loescht.
- Aktive Room-Selektion basiert auf persistentem Selection-State; sichtbares Polygon/Handles sind bindender Nachweis fuer aktive Auswahl.
- `Delete` orientiert sich ausschliesslich an der aktiven Room-Selektion und nicht an Pointer-Hold-/Drag-Zustaenden.
- Klick auf leere Boardflaeche setzt die Room-Selektion deterministisch auf `none`.
- Play-Area-Editing/-Selection bleibt von Room-Copy/Keyboard/Deselection-Flow unberuehrt.
- Legacy-Migration ist load-time-idempotent: alte Nemesis-Schemata bleiben ladbar und werden beim Speichern vorwaerts normalisiert.

## Scope
- Dynamischen Board-Katalog einfuehren und Board-Auswahl auf Katalog umstellen.
- Importierbare Boards in UI + Serverpfad integrieren (Upload/Validation/Persistenz/Katalog-Refresh).
- Serverseitige Speicherung importierter Boards (inkl. kontrollierter Dateistruktur und Konfliktregeln).
- Room-Cluster-Datenmodell einfuehren und in Runtime/Persistenz verankern.
- Dropdown-Auswahl fuer Trigger/Edit um `cluster`-Targets erweitern.
- Cluster-Triggerflaeche implementieren: eine Auswahl startet Animationen fuer alle Cluster-Raeume.
- Sicherstellen, dass Board-Klick auf Raum weiterhin nur den Einzelraum selektiert.
- Gesamten Operator-Flow auf Englisch umstellen (UI/Status/README-Hinweise/Operator-relevante Logs/Errors).
- Legacy-Migration fuer Nemesis + vorhandene Polygone + Animation-Configs auf neues Standardschema liefern.
- Regressionsnachweise fuer Import, Cluster, Englisch-Flow und Migration dokumentieren.
- P0-Hotfix 6-HF1 fuer English-only durchfuehren (UI/Status/Errors/Final-Flow + Doku + Regressionsevidenz).
- Separate Vertex-Visibility-Toggles fuer Room-Vertices und Play-Area-Vertices im Polygon-Editor liefern.
- `Ship Polygon` in UI/Model/Operator-Wording auf `Play Area` generalisieren.
- Visuelle Spezialraum-Sondermarkierung entfernen; Spezialraeume wie normale Raeume rendern/editieren.
- Room-Creation aus Polygonvorlagen liefern (bestehendes Polygon kopieren inkl. Geometriepunkte als Startform).
- Room-Copy auf vollstaendige Geometrie-Paritaet erweitern (inkl. Scale/Offset/Transform-Parameter).
- Keyboard-Shortcuts fuer Room-Editing liefern (`CTRL+C`, `CTRL+V`, `Delete` bei selektiertem Room).
- Selection-Behavior absichern: Klick auf leere Flaeche hebt Room-Selektion auf.
- Selection-Semantik konsistent machen: visuell selektierter Room gilt immer als aktiv selektiert.
- Delete-Hotkey an persistenter Selection ausrichten, unabhaengig von LMB-Hold/Drag.
- Regression fuer Copy/Paste/Delete + Empty-space deselect + Play-Area-Guard als verpflichtende Hotfix-Evidenz liefern.
- Sicherstellen, dass Play-Area-Interaktion durch Room-Copy/Keyboard/Deselection nicht regressiert.

## Out of Scope
- Mehrsprachiges i18n-System mit Laufzeit-Sprachumschaltung.
- Cloud-Repository fuer Board-Sharing oder Benutzerrechteverwaltung.
- Automatische Geometrie-Erkennung per CV/Kamera.
- Neue Effektarten ausserhalb der noetigen Cluster-/Catalog-Integration.

## Migrationsstrategie (sichere Inkremente)
1. Katalogschema und `boardId`-Routing definieren; bestehende Nemesis-Boards als Katalogeintraege abbilden.
2. Serverpersistenz fuer Board-Imports mit Validator und konfliktfreiem Dateinamenpfad einfuehren.
3. UI-Board-Auswahl auf dynamische Katalogdaten umstellen.
4. Room-Cluster-Domain in Datenmodell, Persistenz und Triggerpfad integrieren.
5. Dropdown-Ziele auf `room` + `cluster` erweitern; Cluster-Fanout in Runtime absichern.
6. Einzelraum-Klickfluss regressionssicher halten (kein implizites Cluster-Mapping).
7. English-only Sweep fuer UI/Status/README/Logs/Errors durchfuehren.
8. Legacy-Migration fuer Polygone/Animation-Configs aktivieren und idempotent absichern.
9. Polygon-Editor-Safety-Welle ausrollen: getrennte Vertex-Visibility-Toggles, Play-Area-Wording, no-special-room-visuals, Polygon-Template-Copy.
10. Room-Editing-Hotfix ausrollen: full room-copy geometry parity, keyboard copy/paste/delete, empty-space deselection, play-area non-regression.
11. Selection-Semantik-Hotfix ausrollen: persistent selected room state, delete-without-hold, copy/paste/delete+deselect+play-area regression matrix.
12. End-to-End-Regression (Import -> Select -> Trigger -> Save/Reload/Restart) dokumentieren.

## Milestones (priorisiert)
1. M1 Catalog Core: boardspiel-agnostischer Katalog mit dynamischer Board-Auswahl.
2. M2 Import + Server Storage: importierte Boards werden validiert, gespeichert und sofort im Katalog sichtbar.
3. M3 Cluster Runtime: Cluster sind als Dropdown-Ziele triggerbar, Einzelraumklick bleibt unveraendert.
4. M4 English Operator Flow: Operator sieht nur englische Texte und Fehlermeldungen.
5. M5 Migration + Compatibility: bestehende Nemesis-Daten laufen verlustfrei im neuen Standard.
6. M6 English-Hotfix Closure: Language Sweep fuer Control/Settings/Final-Flow und Doku ohne offene P0-Blocker.
7. M7 Polygon Editor Safety + Terminology Generalization: getrennte Vertex-Toggles, Play-Area-Wording, no-special-room visuals, Polygon-Template-Copy.
8. M8 Room Editing Hotfix: Room-Copy-Paritaet, Keyboard-Editing und Empty-Space-Deselection ohne Play-Area-Regression.
9. M9 Selection Semantics Hotfix: visuell selektiert = aktiv selektiert, Delete ohne Hold-Abhaengigkeit.
10. M10 Hardening: Artefaktbasierte Regression ohne P0-Blocker.

## Verbindliches Feedback (Phase 6)
- Das Produkt muss boardspiel-agnostisch werden; Nemesis-only-Hardcoding ist nicht mehr zulaessig.
- Eigene Boards muessen importierbar und serverseitig persistiert sein.
- Board-Auswahl muss aus einem dynamischen Katalog stammen.
- Operator-Flow muss vollstaendig Englisch sein.
- Room-Clusters muessen als gruppierte Triggerziele auswaehlbar sein.
- Board-Klick darf weiterhin nur den einzelnen Raum selektieren.
- Bestehende Daten muessen in den neuen Standard migriert werden.
- Polygon-Editor braucht getrennte Vertex-Visibility-Toggles fuer Room-Vertices und Play-Area-Vertices.
- Begriff `Ship Polygon` wird auf `Play Area` generalisiert (UI/Model/Operator-Wording).
- Alte Spezialraum-Markierungen entfallen; Spezialraeume sind visuell normale Raeume.
- Neue Raeume muessen aus bestehenden Polygonen als Startvorlage erzeugbar sein.
- Room-Copy muss vollstaendig sein und alle Room-Geometry-Properties (inkl. Scale/Offsets/Transform-Werte) mitkopieren.
- Keyboard-Editing muss fuer selektierten Room `CTRL+C` (copy), `CTRL+V` (paste) und `Delete` (loeschen) unterstuetzen.
- Klick auf leere Flaeche muss die Room-Selektion auf `keinen Raum` setzen.
- Play-Area-Verhalten darf durch diese Erweiterungen nicht veraendert werden.
- Plan 6-1 ist als verbindliche execute-ready erste Welle vor allen Folgearbeiten auszufuehren.
- Verify-work-6 Follow-up setzt zusaetzlich: offener P0-Blocker `English-only operator flow` muss ueber Plan 6-HF1 geschlossen werden, bevor Plan 6-2 startet.
- Neues verpflichtendes Feedback wird als Plan 6-HF2 (P0) vor Plan 6-3 ausgefuehrt.
- Neues verpflichtendes Feedback (Selection/Delete-Konsistenz) wird als Plan 6-HF3 (P0) vor Plan 6-3 ausgefuehrt.

## Definition of Done
- Hardcoded Board A/B ist aus Auswahlpfaden entfernt; Boardliste kommt aus dem Katalog.
- Importierte Boards sind nach Save/Reload/Restart serverseitig erhalten.
- Dropdown zeigt sowohl Einzelraeume als auch Cluster und startet Cluster-Fanout korrekt.
- Raumklick auf dem Board selektiert weiterhin nur den geklickten Raum.
- UI/Status/README-Hinweise/Operator-Logs und Errors sind Englisch-only.
- In `Control`, `Settings` und `Final-Flow` existieren keine deutschen operatorrelevanten Texte/Status/Fehlermeldungen mehr.
- Legacy Nemesis + vorhandene Polygone + Animationsconfigs werden automatisch, verlustfrei und idempotent migriert.
- Polygon-Editor bietet getrennte Sichtbarkeits-Toggles fuer Room-Vertices und Play-Area-Vertices; beide Gruppen sind unabhaengig schaltbar.
- UI-/Model-/Operator-Wording verwendet durchgaengig `Play Area` statt `Ship Polygon` (mit Legacy-Ladekompatibilitaet).
- Spezialraeume besitzen keine visuelle Sondermarkierung mehr und folgen Standard-Raumdarstellung.
- Room-Creation kann ein bestehendes Polygon als Template uebernehmen und dessen Punkte als Startgeometrie kopieren.
- Room-Copy uebernimmt vollstaendig saemtliche Room-Geometry-Properties (inkl. Scale/Offset/Transform) als tiefe Kopie.
- Keyboard-Editing fuer selektierten Room ist aktiv (`CTRL+C`, `CTRL+V`, `Delete`) und kollidiert nicht mit bestehenden Shortcuts.
- Ein visuell selektierter Room (Polygon/Handles sichtbar) ist immer aktive Auswahlquelle fuer Editing-Hotkeys.
- `Delete` loescht den aktiv selektierten Room sofort, auch ohne laufenden LMB-Hold/Drag auf dem Room.
- Klick auf leere Boardflaeche setzt die Room-Selektion auf `none`.
- Play-Area-Selection/-Editing zeigt keine Regression durch Room-Copy/Keyboard/Deselection.
- Keine Regression in Trigger/Edit/Stop/Clear-All, Running-Liste, Clipping, Persistenz, Live-Sync und Final-Output.
- Phase-6-Artefakte (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE`) sind konsistent mit globalen Planungsdateien synchronisiert.
- Language-Sweep-Regression ist als Artefakt dokumentiert und schliesst den P0-Blocker aus verify-work 6 explizit.

## Execution Update - 6-HF3
- P6-T35 umgesetzt: persistente Selection-Normalisierung verhindert Drift zwischen sichtbarer Room-Auswahl und aktivem Hotkey-Target.
- P6-T36 umgesetzt: `Delete` nutzt persistente aktive Selection (ohne LMB-Hold-/Drag-Abhaengigkeit) bei unveraenderten Typing/Play-Area-Guards.
- P6-T37 umgesetzt: kombinierte Regression dokumentiert in `.planning/phases/phase-06/P6-T37-REGRESSION.md`.
- P6-T38 umgesetzt: Planungsartefakte und globale Tracking-Dateien auf HF3-Stand synchronisiert; Plan 6-3 ist entblockt.
