# Phase 6 Plan (Prepared)

## Zielbild
Phase 6 transformiert TT Beamer von einem Nemesis-spezifischen Setup zu einer boardspiel-agnostischen Plattform. Operator koennen eigene Boards importieren, diese serverseitig persistieren und direkt ueber einen dynamischen Katalog auswaehlen. Parallel wird der komplette Operator-Flow auf Englisch vereinheitlicht (UI, Statusmeldungen, Dokuhinweise, relevante Logs/Errors). Darauf aufbauend werden Room-Clusters eingefuehrt, sodass mehrere Raeume als gemeinsames Triggerziel im Dropdown bedient werden koennen, ohne das etablierte Einzelraum-Klickverhalten auf dem Board zu brechen. Der Polygon-Editor wird fuer sichere Bearbeitung erweitert (separate Vertex-Visibility-Toggles fuer Room vs Play Area), die Begrifflichkeit wird von `Ship Polygon` auf `Play Area` vereinheitlicht, fruehere Spezialraum-Sondermarkierungen entfallen vollstaendig, und neue Raeume koennen aus bestehenden Polygonvorlagen erzeugt werden. Zusaetzlich wird das Room-Editing ueber verpflichtende Hotfix-Wellen erweitert: vollstaendiges Room-Copy inkl. saemtlicher Geometrie-Properties (Skalierung/Offsets etc.), Keyboard-Shortcuts fuer Copy/Paste/Delete am selektierten Raum, deterministische Deselection bei Klick auf leere Boardflaeche sowie persistente Selection-Semantik (`visuell selektiert = aktiv selektiert`) mit Delete ohne LMB-Hold-Abhaengigkeit. Bestehende Nemesis-Daten inklusive Polygon- und Animationskonfigurationen werden in ein neues Standardschema migriert.

## Hotfix Trigger (verify-work 6 Follow-up)
- Der verify-work-6 Follow-up meldet den P0-Blocker `English-only operator flow` als offen.
- Konsequenz: Plan 6-HF1 ist als verpflichtende P0-Hotfix-Welle zwischen 6-1 und 6-2 gesetzt.
- Ziel von 6-HF1: keine deutschen Operator-Texte mehr in `Control`, `Settings` und `Final-Flow`, konsistente Doku (`README` + Phase-06-Artefakte) und artefaktbasierter Language-Sweep-Nachweis.

## Hotfix Trigger (Regression nach 6-HF3)
- Neues verpflichtendes Feedback meldet eine P0-Regression: Room-Polygone/Handles sind nur waehrend LMB-Hold sichtbar.
- Konsequenz: Plan 6-HF4 ist als verpflichtende P0-Hotfix-Welle zwischen 6-HF3 und 6-3 gesetzt.
- Ziel von 6-HF4: Pointerdown/Click/Pointerup-Arbitration zwischen Select vs Drag korrigieren, persistente Selection-Lifecycle stabilisieren und Buttons/Hotkeys auf persistenter Selection absichern.

## Hotfix Trigger (Regression nach 6-HF4)
- Neues verpflichtendes Feedback meldet eine weiterhin offene P0-Regression: kurzer Click selektiert Room nicht persistent, Selection erscheint nur waehrend Hold und wird erst nach kurzem Move persistent.
- Konsequenz: Plan 6-HF5 ist als verpflichtende P0-Hotfix-Welle zwischen 6-HF4 und 6-3 gesetzt.
- Ziel von 6-HF5: `click-without-move` als persistente Selection garantieren, Pointer-Up-Sichtbarkeit stabil halten, Drag-Verhalten unveraendert erhalten und bestehende Guards regressionsfrei absichern.

## Hotfix Trigger (Regression nach 6-HF5)
- Neues verpflichtendes Feedback meldet eine P0-Regression im Vertex-Edit-Flow: Klick auf Vertex deselektiert den Room sofort; Handles verschwinden und Vertex-Auswahl ist fuer Move/Delete instabil.
- Konsequenz: Plan 6-HF6 ist als verpflichtende priorisierte Hotfix-Welle zwischen 6-HF5 und 6-3 gesetzt.
- Ziel von 6-HF6: Pointer-Arbitration Room vs Vertex sauber trennen, Vertex-Selection-Lifecycle fuer direkte Klick-Editierung stabilisieren und optionalen UX-Fix gegen Text-Selektion bei Room-Drag aufnehmen (low-risk only).

## Hotfix Trigger (Neues verpflichtendes Feedback nach 6-HF6)
- Neues verpflichtendes Feedback meldet zwei P0-Hotfix-Themen: (1) Edge-Bubble-Click zwischen Vertices deselektiert den Room, (2) geloeschte Rooms aus Global-Defaults erscheinen nach Reload wieder.
- Konsequenz: Plan 6-HF7 ist als verpflichtende priorisierte Hotfix-Welle zwischen 6-HF6 und 6-3 gesetzt.
- Ziel von 6-HF7: Edge-Pointer-Arbitration auf Vertex-Paritaet bringen (Selection persistent + Edge aktiv fuer Insert-Vertex) und persistente Tombstone-Semantik fuer geloeschte Rooms gegen Defaults-Rehydrate absichern.

## Hotfix Trigger (Neues verpflichtendes Feedback nach 6-HF7)
- Neues verpflichtendes Feedback meldet zwei offene P0-Themen: (1) Room-Animation-Draft-Werte werden bei Raumwechsel unzulaessig zurueckgesetzt, (2) Cluster-UX/Flow ist unvollstaendig (fehlendes CRUD, fehlende Zielauswahl-/Startoptionen).
- Konsequenz: Plan 6-HF8 ist als verpflichtende priorisierte Hotfix-Welle zwischen 6-HF7 und 6-3 gesetzt.
- Ziel von 6-HF8: persistente Draft-Voreinstellungen ueber Room-Wechsel sicherstellen und vollstaendige Cluster-Bedienung inkl. CRUD + Trigger-Option `stagger start` (an/aus) execute-ready liefern.

## Hotfix Trigger (Neues verpflichtendes Feedback nach 6-HF8)
- Neues verpflichtendes Feedback praezisiert den Target-/Draft-Flow als P0-Hotfix: Draft-Persistenz bleibt fuer Animation + Parameter stabil, `target` ist explizit ausgenommen und wird bei Raumklick automatisch auf den geklickten Raum gesetzt.
- Konsequenz: Plan 6-HF9 ist als verpflichtende priorisierte Hotfix-Welle zwischen 6-HF8 und 6-3 gesetzt.
- Ziel von 6-HF9: auto+manual Target-Paritaet execute-ready liefern (Raumklick => `target=room`, danach jederzeit manuelle Umstellung auf Room/Cluster, Dropdown nie deaktiviert - auch ohne selektierten Raum).

## Hotfix Trigger (Neues verpflichtendes Feedback nach 6-HF9)
- Neues verpflichtendes Feedback meldet zwei offene P0-Regressionen: (1) Cluster-Start fanout startet aktuell nur in einem Raum statt in allen Cluster-Membern (betrifft sync + `stagger start`), (2) Running-Liste fuehrt Cluster nicht als eigenen Scope-Eintrag.
- Konsequenz: Plan 6-HF10 ist als verpflichtende priorisierte Hotfix-Welle zwischen 6-HF9 und 6-3 gesetzt.
- Ziel von 6-HF10: Cluster-Fanout robust auf alle Member-Raeume korrigieren, `stagger start`/simultaneous fuer komplette Cluster-Mengen absichern und Running-Model/-Rendering um Scope `CLUSTER` (eigener Eintrag + visuelle Abgrenzung) execute-ready liefern.

## Hotfix Trigger (Neues verpflichtendes Feedback nach 6-HF10)
- Neues verpflichtendes Feedback meldet zwei neue P0-Defekte: (1) Cluster-Animationen sind lifecycle-instabil (starten teils nur kurz und verschwinden/werden ueberschrieben), (2) Board-Switch-Sync ist nicht deterministisch und braucht teils Mehrfach-Toggles.
- Konsequenz: Plan 6-HF11 ist als verpflichtende priorisierte Hotfix-Welle zwischen 6-HF10 und 6-3 gesetzt.
- Ziel von 6-HF11: root-cause fuer Cluster-Lifecycle/Overwrite/Cleanup schliessen und serverautoritiven Board-Context-Sync (Ack/Version/Ordering/Reconnect) fuer alle Clients inkl. `/output/final` deterministisch haerten.

## Hotfix Trigger (Neues verpflichtendes Feedback nach 6-HF11)
- Neues verpflichtendes Feedback meldet weiterhin einen P0-Determinismus-Defekt beim Cluster-Start: Running-Liste ist inkonsistent (teils zusaetzliche ROOM-Eintraege, teils nur CLUSTER ohne sichtbare Wirkung).
- Konsequenz: Plan 6-HF12 ist als verpflichtende priorisierte Hotfix-Welle zwischen 6-HF11 und 6-3 gesetzt.
- Ziel von 6-HF12: Cluster-Start auf einen kanonischen `CLUSTER`-Controller-Eintrag determinisieren (keine ROOM-Duplikate), dabei Runtime-Fanout fuer alle Cluster-Member sichern und Stop/Edit-Semantik fuer Cluster-Member konsistent durchziehen, ohne Room-Target-Regression.

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
- Pointer-Arbitration trennt Selection und Drag strikt: Click erzeugt persistente Selection, Drag startet erst bei aktiver Move-Intention/Threshold.
- Pointer-Up darf aktive Room-Selection nicht invalidieren; Deaktivierung erfolgt nur ueber Empty-Space-Deselect oder explizite Umschaltung auf anderen Room.
- Room-Polygone/Handles bleiben bei aktiver Selection sichtbar, unabhaengig vom Pointer-Hold-State.
- Room-Buttons/Hotkeys arbeiten gegen denselben persistenten Selection-State (`single source of truth`) und nicht gegen transienten Pointer-State.
- Click-Commit erfolgt ohne Drag-Zwang: `pointerup` nach kurzem Click ohne Move muss dieselbe persistente Room-Selection aktivieren wie ein Click mit nachfolgendem Ruhe-State.
- Drag-Promotion bleibt threshold-basiert: nur Move-Intent startet Drag; Selection darf durch no-move Click nicht auf Drag-Pfade umgebogen werden.
- Bestehende Guards bleiben unveraendert bindend: Empty-Space-Deselect, Play-Area-Guard sowie Copy/Paste/Delete duerfen durch Arbitration-Fix nicht regressieren.
- Vertex-Interaktion darf aktive Room-Selektion nicht aufheben: Vertex-Click waehlt Vertex-Kontext innerhalb desselben selektierten Rooms, ohne Handles/Room-Selection zu verlieren.
- Vertex-Move/Delete muss direkt nach Vertex-Click stabil funktionieren (Delete-Key/Panel), ohne zusaetzlichen Re-Select ueber Dropdown.
- Pointer-Arbitration trennt Room-Drag und Vertex-Edit-Pointerpfade deterministisch; Room-Deselect ist nur ueber Empty-Space oder expliziten Room-Wechsel erlaubt.
- Optionaler UX-Guard: waehrend aktivem Room-Drag wird Browser-Textselektion unterdrueckt, sofern dies ohne Nebenwirkungen auf Input-Felder/Keyboard-Editing bleibt.
- Edge-Bubble-Click folgt derselben Selection-Lifecycle wie Vertex-Click: aktiver Room bleibt persistent selektiert, aktive Edge bleibt fuer Insert-Vertex erhalten.
- Insert-Vertex-Flow darf nach Edge-Bubble-Click keinen Re-Select erfordern; Edge-Selection bleibt bis explizitem Wechsel/Deselect stabil.
- Room-Delete nutzt persistente Tombstones im Room-Katalog (board-spezifisch), damit geloeschte Rooms bei Global-Defaults-Merge/Overlay nicht rehydratisiert werden.
- Defaults-Merge priorisiert Tombstones gegen Legacy/Default-Room-Quellen; Move/Update-Persistenz fuer nicht geloeschte Rooms bleibt unveraendert.
- Room-Animation-Draft-State ist board-/sessionweit persistent und nicht an den aktuell selektierten Room gebunden: zuletzt gewaehltes Animationstemplate und Parameterwerte bleiben bei Room-Wechsel als aktive Voreinstellung erhalten.
- Draft-Persistenz bleibt fuer Animation + Trigger-Parameter stabil; `target` ist der einzige ausgenommene Draft-Baustein und wird nicht als room-gebundene Persistenzquelle behandelt.
- Board-Raumklick setzt `target` deterministisch auf den geklickten Room (`auto target sync`), ohne Animation-/Parameter-Drafts zu resetten.
- `target`-Dropdown bleibt jederzeit manuell bedienbar (auch ohne aktive Room-Selektion); ein deaktivierter Zustand aufgrund fehlender Selection ist unzulaessig.
- Auto- und Manual-Flow sind kombinierbar: nach Room-Autofill darf der Operator `target` jederzeit auf einen anderen Room oder Cluster umstellen, unabhaengig vom Selection-State.
- Draft-Reset erfolgt nur explizit (z. B. ueber bewusstes UI-Reset) und nicht implizit durch Target-/Room-Navigation oder Trigger-Start.
- Cluster sind als vollwertige board-spezifische Domainobjekte in der Operator-UX verwaltbar (create/edit/delete) und nicht nur passiv ladbar.
- Trigger-Konfiguration unterstuetzt pro Ausloesung `staggerStart` als explizite Option: `off` startet alle Cluster-Raeume zeitgleich, `on` startet mit kurzem randomisiertem Versatz pro Room.
- Cluster-Fanout ist member-vollstaendig verpflichtend: jeder Cluster-Start (sync oder staggered) erzeugt fuer jede gueltige `roomId` im Cluster genau eine Startaktion; partieller First-Room-Start ist unzulaessig.
- Running-Model besitzt fuer Cluster-Starts einen eigenen Scope-Typ `CLUSTER` (nicht `ROOM`, nicht `GLOBAL-INSIDE`) mit eigener visueller Kennzeichnung in der Running-Liste.
- Stop/Edit-Semantik fuer Cluster arbeitet auf dem Cluster-Scope-Eintrag deterministisch und beeinflusst die zugehoerigen Member-Instanzen konsistent, ohne bestehende Room/Global-Guards zu regressieren.
- Cluster-Animation-Lifecycle ist parity-pflichtig zu Room-Animationen: hold-by-default, keine implizite Sofortentfernung, keine self-cancel cleanup races.
- Cluster-Instanzen und Member-Instanzen werden instanzscharf verarbeitet (`animation.id`/run-context); Update/Stop/Cleanup duerfen nur den zugehoerigen Kontext mutieren.
- Cluster-Start besitzt genau einen kanonischen Running-Scope-Eintrag `CLUSTER`; member-interne `ROOM`-Runs fuer denselben Trigger werden nicht als zusaetzliche Running-Zeilen exponiert.
- Der kanonische `CLUSTER`-Eintrag bleibt reine Controller-Sicht: Rendering/Runtime-Fanout muss weiterhin alle Cluster-Member animieren (sync + `stagger start`) und darf durch Running-Dedupe nicht ausfallen.
- Stop/Edit auf dem `CLUSTER`-Controller mutiert deterministisch alle zugeordneten Cluster-Member-Instanzen desselben Run-Kontexts.
- Einzelraum-Target-Pfade (`targetType=room`) bleiben durch Cluster-Controller-Dedupe semantisch unveraendert.
- Board-/Layout-Context ist serverautoritativ versioniert; `context-update` nutzt monotone Version + Ack und stale-drop fuer deterministic last-write.
- Board-Switch wird als sofortiger Shared-State propagiert und auf Join/Reconnect deterministisch rehydriert, inklusive `/output/final` ohne Zusatzklick.
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
- Pointerdown/Click/Pointerup-Arbitration zwischen Selection und Drag korrigieren (Click != Hold-only Selection).
- Selection-Lifecycle fixen: Single-Click selektiert persistent, Sichtbarkeit bleibt bis Deselect/Room-Wechsel bestehen.
- Drag/Move klar entkoppeln: Hold ist nur fuer Move relevant, nicht fuer Selection-Aktivierung.
- Regression gegen Delete/Copy/Paste + Empty-space deselect + Play-Area-Guard unter neuer Pointer-Arbitration dokumentieren.
- Planungsartefakte inkl. globaler Tracking-Dateien auf HF4-Stand synchronisieren und execute-ready halten.
- Pointer-Arbitration-Rework nachziehen: no-move Short-Click muss persistente Selection deterministisch aufbauen (ohne Zwischen-Move).
- Selection-Lifecycle gegen Click-only-Regression haerten: Handles/Polygone bleiben nach Pointer-Up sichtbar, auch wenn kein Drag gestartet wurde.
- Drag-Funktionalitaet explizit erhalten: Move-Threshold/Drag-Start und laufende Drag-Flows bleiben unveraendert nutzbar.
- Regression fuer Empty-Space-Deselect, Play-Area-Guard sowie Copy/Paste/Delete unter HF5 erneut als Pflichtmatrix dokumentieren.
- Planungsartefakte inkl. globaler Tracking-Dateien auf HF5-Stand synchronisieren und execute-ready halten.
- Pointer-Arbitration fuer Room vs Vertex finalisieren: Vertex-Klick darf keinen Room-Deselect/Handle-Verlust ausloesen.
- Vertex-Selection-Lifecycle stabilisieren: direkter Vertex-Klick bleibt aktive Quelle fuer Move/Delete (Delete-Key + Panel) ohne Dropdown-Re-Select.
- Optionalen UX-Fix fuer Room-Drag integrieren: Text-Selection waehrend Drag unterdruecken (nur low-risk, keine Input-Regression).
- Regression fuer Vertex-Klick/Delete-Key/Panel + Empty-Space-Deselect + Play-Area-Guard + Drag-Paritaet dokumentieren.
- Planungsartefakte inkl. globaler Tracking-Dateien auf HF6-Stand synchronisieren und execute-ready halten.
- Pointer-Arbitration fuer Edge-Bubbles an Vertex-Paritaet angleichen: Edge-Click darf Room-Selektion nicht deselektieren.
- Edge-Selection-Lifecycle stabilisieren: aktive Edge bleibt nach Click/Pointer-Up fuer Insert-Vertex direkt nutzbar.
- Persistente Delete-Semantik fuer Room-Katalog liefern: Tombstone-/Deletion-Overlay gegen Global-Defaults-Rehydrate einfuehren.
- Save/Load/Merge-Guards absichern: geloeschte Rooms bleiben nach Reload/Restart/Defaults-Apply dauerhaft geloescht.
- Regression fuer Insert-Vertex-Flow + Delete-Persistenz + bestehende Selection/Play-Area-Guards als Pflichtmatrix dokumentieren.
- Planungsartefakte inkl. globaler Tracking-Dateien auf HF7-Stand synchronisieren und execute-ready halten.
- Draft-Persistenz-Hotfix liefern: zuletzt gewaehlte Room-Animation + Parameter (`speed`, `opacity`, `soundVolume`, weitere Trigger-Parameter) bleiben bei Room-/Target-Wechsel als Startvoreinstellung erhalten.
- Cluster-UX-Hotfix liefern: Cluster im Operator-Flow erstellen/bearbeiten/loeschen koennen (beliebige Room-Mengen, board-spezifisch persistiert).
- Target-Hotfix liefern: Cluster in `target` deterministisch waehlbar machen und Trigger-Start fuer alle Cluster-Raeume ausfuehren.
- Trigger-Option-Hotfix liefern: pro Trigger eine Option `stagger start` integrieren (random short delay je Room, optional deaktivierbar fuer synchronen Start).
- Regression fuer Draft-Persistenz + Cluster-CRUD + Cluster-Start (sync/staggered) + bestehende Guards als Pflichtmatrix dokumentieren.
- Planungsartefakte inkl. globaler Tracking-Dateien auf HF8-Stand synchronisieren und execute-ready halten.
- Target-Autofill-Hotfix liefern: Board-Raumklick setzt `target` sofort auf den geklickten Room, ohne Animation-/Parameter-Drafts zu veraendern.
- Target-Manual-Hotfix liefern: `target`-Dropdown bleibt immer aktiv und manuell bedienbar (auch ohne Selection, inkl. Room/Cluster-Auswahl).
- Auto+Manual-Paritaet-Hotfix liefern: manueller Target-Wechsel bleibt nach Autofill jederzeit moeglich und ist nicht an Selection-State gekoppelt.
- Regression fuer Draft-Ausnahme `target` + Room-Click-Autofill + always-enabled manual target + cluster/room manual override als Pflichtmatrix dokumentieren.
- Planungsartefakte inkl. globaler Tracking-Dateien auf HF9-Stand synchronisieren und execute-ready halten.
- Cluster-Fanout-Hotfix liefern: Startpfad fuer `targetType=cluster` fanout auf alle Cluster-Member-Raeume robust korrigieren (keine First-Room-Verkuerzung).
- Stagger-Paritaet-Hotfix liefern: `stagger start = off|on` wirkt fuer jeden Cluster-Member konsistent (off = synchron fuer alle, on = kurzer randomisierter Versatz fuer alle).
- Running-Scope-Hotfix liefern: Running-Model/-Rendering um eigene Scope-Art `CLUSTER` erweitern (eigener Eintrag, Label `CLUSTER`, visuell unterscheidbare Farbe).
- Regression fuer Cluster-Start (sync/stagger), Stop/Edit-Verhalten auf Cluster-Eintrag und bestehende Guards als Pflichtmatrix dokumentieren.
- Planungsartefakte inkl. globaler Tracking-Dateien auf HF10-Stand synchronisieren und execute-ready halten.
- Cluster-Lifecycle-Hotfix liefern: root-cause fuer vorzeitiges Verschwinden/overwrite von Cluster-Animationen beseitigen (hold-by-default Paritaet zu Room-Instanzen).
- Cluster-Cleanup-Hotfix liefern: cleanup-/expiry-/merge-pfade instanzscharf auf run-context begrenzen, keine fremden Cluster-Member-Removals.
- Board-Context-Sync-Hotfix liefern: serverautoritives `context-update` fuer Board/Layout mit Ack/Version/Ordering robust haerten, inkl. stale-drop und reconnect replay.
- Deterministische Propagation nachweisen: Board-Wechsel repliziert beim ersten Toggle sofort auf alle Clients inkl. `/output/final`, ohne Mehrfach-Toggle.
- Regression fuer Cluster-Lifecycle + Board-Context-Sync + Join/Reconnect/Burst-Ordering als Pflichtmatrix dokumentieren.
- Planungsartefakte inkl. globaler Tracking-Dateien auf HF11-Stand synchronisieren und execute-ready halten.
- Cluster-Controller-Dedupe-Hotfix liefern: pro Cluster-Start genau ein Running-Eintrag `CLUSTER`, keine zusaetzlichen member-`ROOM`-Eintraege fuer denselben Trigger.
- Runtime-Fanout-Hotfix absichern: dedupter `CLUSTER`-Run muss weiterhin alle Cluster-Member sichtbar animieren (kein no-op/silent run).
- Stop/Edit-Propagation-Hotfix liefern: Cluster-Aktionen am `CLUSTER`-Eintrag wirken deterministisch auf alle zugeordneten Member-Instanzen.
- Regression fuer cluster single-entry running + full-member runtime effect + cluster stop/edit propagation + room-target non-regression als Pflichtmatrix dokumentieren.
- Planungsartefakte inkl. globaler Tracking-Dateien auf HF12-Stand synchronisieren und execute-ready halten.

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
12. Pointer-Arbitration-Hotfix ausrollen: click-persist selection, hold-only-drag semantics, persistent handles/polygons.
13. Pointer-Arbitration-Regression-Hotfix ausrollen: no-move short-click persistiert Selection, Drag bleibt unveraendert.
14. Vertex-Selection-Hotfix ausrollen: Room-vs-Vertex-Arbitration stabilisieren, direkter Vertex-Click/Delete fixen, optional Text-Selection-Guard waehrend Room-Drag absichern.
15. Edge+Deletion-Hotfix ausrollen: Edge-Bubble-Selection persistent halten und Tombstone-Delete-Persistenz gegen Defaults-Rehydrate absichern.
16. Draft-Persistenz-Hotfix ausrollen: room-unabhaengige Trigger-Drafts (Animation + Parameter) ueber Room-/Target-Wechsel stabil halten.
17. Cluster-UX-Hotfix ausrollen: Cluster CRUD in Operator-Flow + Target-Selection + Cluster-Startoption `stagger start` integrieren.
18. Target-Flow-Paritaet-Hotfix ausrollen: Room-Click setzt `target` automatisch auf Room, `target` bleibt immer manuell editierbar (Room/Cluster, auch ohne Selection), Draft-Persistenz bleibt fuer Animation/Parameter stabil.
19. Cluster-Fanout/Running-Scope-Hotfix ausrollen: Cluster-Start fanout fuer alle Member (sync + stagger) stabilisieren und Running-Scope `CLUSTER` mit dediziertem Eintrag/Farbkennung integrieren.
20. Cluster-Lifecycle-Hotfix ausrollen: Cluster-Instanzen gegen vorzeitiges cleanup/overwrite haerten und hold-by-default-Paritaet zu Room-Animationen sichern.
21. Board-Context-Sync-Hotfix ausrollen: serverautoritiven Board/Layout-Sync mit Ack/Version/Ordering/Reconnect fuer alle Clients inkl. `/output/final` deterministisch machen.
22. Cluster-Controller-Scope-Hotfix ausrollen: Running-Liste auf single-entry `CLUSTER` determinisieren und Member-ROOM-Duplikate fuer denselben Trigger unterdruecken.
23. End-to-End-Regression (Import -> Select -> Trigger -> Save/Reload/Restart, inkl. Draft-Persistenz + Target-Auto/Manual-Paritaet + Cluster sync/stagger + CLUSTER running scope + lifecycle/sync determinism + cluster single-entry determinism) dokumentieren.

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
10. M10 Pointer Arbitration Hotfix: Selection bleibt persistent nach Click/Pointer-Up; Hold bleibt Drag-only.
11. M11 Pointer Arbitration Regression Closure: no-move short-click selektiert persistent; Guards bleiben intakt.
12. M12 Vertex Selection Lifecycle Hotfix: Vertex-Click behaelt Room-Selektion/Handles persistent; direkter Vertex-Edit/Delete-Flow ist stabil.
13. M13 Optional Drag-UX Guard: Text-Selection waehrend Room-Drag ist unterdrueckt, ohne Edit-/Input-Nebenwirkungen.
14. M14 Selection Hardening Gate: HF4/HF5/HF6-Lifecycle-Regression bleibt artefaktbasiert ohne Re-Open.
15. M15 Edge-Bubble Arbitration Hotfix: Edge-Click behaelt persistente Room-Selection und aktive Edge fuer Insert-Vertex ohne Re-Select.
16. M16 Room Deletion Tombstone Hotfix: geloeschte Rooms bleiben ueber Save/Reload/Defaults-Merge dauerhaft geloescht.
17. M17 Draft Persistence Hotfix: zuletzt gewaehltes Animationstemplate und Parameterwerte bleiben ueber Room-/Target-Wechsel als aktive Trigger-Voreinstellung erhalten.
18. M18 Cluster UX Completion Hotfix: Cluster koennen erstellt/bearbeitet/geloescht werden und sind als `target` voll nutzbar.
19. M19 Cluster Stagger Start Hotfix: Cluster-Start unterstuetzt pro Trigger `stagger start` (an/aus) fuer randomisierten Kurzversatz vs synchronen Start.
20. M20 Target Auto+Manual Parity Hotfix: Room-Click setzt `target` automatisch auf Room; manuelle Umstellung auf Room/Cluster bleibt jederzeit verfuegbar (auch ohne Selection).
21. M21 Cluster Fanout Reliability Hotfix: Cluster-Start fanout erreicht alle Cluster-Member robust fuer sync + stagger.
22. M22 Cluster Running Scope Hotfix: Running-Liste zeigt Cluster als eigenen Scope `CLUSTER` mit visueller Abgrenzung und konsistenter Stop/Edit-Semantik.
23. M23 Cluster Lifecycle Stability Hotfix: Cluster-Animationen bleiben stabil hold-by-default ohne unerwartetes Selbstentfernen.
24. M24 Board Context Determinism Hotfix: Board-Switch repliziert first-try deterministisch auf alle Clients inkl. `/output/final`.
25. M25 Cluster Controller Determinism Hotfix: Running-Liste zeigt pro Cluster-Start exakt einen `CLUSTER`-Eintrag bei weiterhin vollstaendigem Member-Rendering und konsistenter Stop/Edit-Propagation.
26. M26 Hardening: Artefaktbasierte Regression ohne P0-Blocker.

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
- Neues verpflichtendes Feedback (Selection nur waehrend LMB-Hold sichtbar) wird als Plan 6-HF4 (P0) vor Plan 6-3 ausgefuehrt.
- Neues verpflichtendes Feedback (kurzer Click selektiert nicht persistent ohne Move) wird als Plan 6-HF5 (P0) vor Plan 6-3 ausgefuehrt.
- Neues verpflichtendes Feedback (Vertex-Klick deselektiert Room, Vertex-Delete instabil, Textmarkierung bei Room-Drag) wird als Plan 6-HF6 (P0/P1) vor Plan 6-3 ausgefuehrt.
- Neues verpflichtendes Feedback (Edge-Bubble deselect + delete persistence gegen defaults rehydrate) wird als Plan 6-HF7 (P0) vor Plan 6-3 ausgefuehrt.
- Neues verpflichtendes Feedback (Draft-Reset bei Room-Wechsel + fehlender Cluster-UX-Flow inkl. stagger start) wird als Plan 6-HF8 (P0) vor Plan 6-3 ausgefuehrt.
- Neues verpflichtendes Feedback (Draft-Persistenz praezisiert: alles stabil ausser `target`, Room-Click-Autofill + always-manual target dropdown) wird als Plan 6-HF9 (P0) vor Plan 6-3 ausgefuehrt.
- Neues verpflichtendes Feedback (Cluster-Start fanout nur erster Room + fehlender Cluster-Scope in Running-Liste) wird als Plan 6-HF10 (P0) vor Plan 6-3 ausgefuehrt.
- Neues verpflichtendes Feedback (Cluster-Lifecycle instabil + nicht-deterministischer Board-Switch-Sync inkl. `/output/final`) wird als Plan 6-HF11 (P0) vor Plan 6-3 ausgefuehrt.
- Neues verpflichtendes Feedback (Cluster-Start weiterhin inkonsistent: zusaetzliche ROOM-Eintraege oder CLUSTER ohne sichtbare Wirkung) wird als Plan 6-HF12 (P0) vor Plan 6-3 ausgefuehrt.

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
- Ein einzelner Click auf Room-Polygon aktiviert persistente Room-Selektion auch nach Pointer-Up.
- Room-Polygone/Handles bleiben sichtbar, bis der Room aktiv deselektiert oder ein anderer Room selektiert wird.
- Pointer-Hold ist ausschliesslich fuer Drag/Move relevant; Selection bleibt davon entkoppelt.
- Buttons/Hotkeys (`Delete`, `CTRL+C`, `CTRL+V`) funktionieren auf persistenter Selection ohne erneuten Hold.
- Kurzer Single-Click ohne Move selektiert den Room persistent; kein Drag und kein Zwischen-Move sind erforderlich.
- Pointer-Up nach no-move Click behaelt Polygon/Handles sichtbar und active-selection-stabil.
- Drag bleibt voll funktionsfaehig und startet weiterhin nur bei Move-Intent/Threshold.
- Empty-space deselect, Play-Area-Guard sowie Copy/Paste/Delete bleiben unter no-move Click-Fix regressionsfrei.
- Vertex-Click innerhalb eines selektierten Rooms behaelt Room-Selektion/Handles sichtbar; Room wird nicht durch Vertex-Interaktion deselektiert.
- Direkter Vertex-Click setzt stabile aktive Vertex-Selektion fuer Move/Delete; Delete-Key und Delete-Panel funktionieren ohne Dropdown-Re-Select.
- Pointer-Arbitration Room-vs-Vertex bleibt stabil: Room-Drag, Vertex-Drag und Vertex-Delete beeinflussen die persistente Room-Selektion nicht ungewollt.
- Optionaler UX-Fix greift: waehrend Room-Drag tritt keine unbeabsichtigte Browser-Textmarkierung auf; Textinputs ausserhalb des Drags bleiben bedienbar.
- Edge-Bubble-Click innerhalb eines selektierten Rooms behaelt Room-Selektion/Handles sichtbar und aktiviert eine stabile Edge-Selektion.
- Insert-Vertex ist direkt nach Edge-Bubble-Click moeglich, ohne erneute Room-Selektion ueber Dropdown oder Board-Reclick.
- Geloeschte Rooms bleiben nach Save/Reload/Restart/Defaults-Apply dauerhaft geloescht; Default-Rehydrate kann Tombstones nicht ueberschreiben.
- Defaults-Merge/Overlay respektiert Deletion-Tombstones fuer Room-Kataloge board-spezifisch und regressiert bestehende Move/Update-Persistenz nicht.
- Room-Animation-Drafts bleiben bei Room-/Target-Wechsel erhalten; Dropdown und Parameter resetten nicht implizit auf Defaultwerte.
- Cluster koennen in der UX erstellt, bearbeitet und geloescht werden (beliebige Room-Mengen) und sind in `target` waehlbar.
- Cluster-Start triggert in allen enthaltenen Rooms; `stagger start` aus startet zeitgleich, `stagger start` an nutzt kurzen randomisierten Startversatz pro Room.
- Cluster-Start fanout verarbeitet jeden Cluster-Member robust und verliert keinen Room in Sync- oder Stagger-Modus.
- Running-Liste zeigt pro Cluster-Start einen eigenen Scope-Eintrag mit Label `CLUSTER` und eindeutig abgesetzter Scope-Farbe.
- Stop/Edit fuer den `CLUSTER`-Eintrag arbeitet konsistent auf dem Cluster-Run und laesst bestehende Room/Global-Controls regressionsfrei.
- Cluster-Animationen laufen stabil wie Room-Animationen (hold-by-default) und verschwinden nicht unmittelbar durch Cleanup-/Overwrite-Races.
- Cluster-Lifecycle (start/edit/stop/cleanup) ist instanzscharf; nur zugehoerige Member-Instanzen werden mutiert/entfernt.
- Running-Liste zeigt bei Cluster-Start deterministisch genau einen `CLUSTER`-Eintrag; zusaetzliche `ROOM`-Eintraege fuer denselben Trigger werden nicht erzeugt.
- Der dedizierte `CLUSTER`-Eintrag hat trotz Dedupe sichtbare Runtime-Wirkung auf alle Cluster-Member-Raeume.
- Stop/Edit auf dem `CLUSTER`-Eintrag wirkt konsistent auf alle zugeordneten Cluster-Member-Instanzen desselben Runs.
- Board-Wechsel aus Settings repliziert beim ersten Toggle deterministisch auf alle Clients inkl. `/output/final`.
- Serverautoritiver Board-Context-Sync nutzt Ack/Version/Ordering/Reconnect-Guards gegen stale apply und Kontextdrift.
- `target` bleibt vom Draft-Persistenzvertrag ausgenommen: Room-Klick setzt `target` auto auf den geklickten Room, waehrend Animation + Parameter unveraendert bleiben.
- `target`-Dropdown ist nie selection-bedingt deaktiviert und bleibt auch ohne aktive Room-Selektion manuell bedienbar.
- Nach Auto-Set durch Room-Klick kann der Operator `target` jederzeit manuell auf Room oder Cluster umstellen, unabhaengig vom Selection-State.
- Play-Area-Selection/-Editing zeigt keine Regression durch Room-Copy/Keyboard/Deselection.
- Keine Regression in Trigger/Edit/Stop/Clear-All, Running-Liste, Clipping, Persistenz, Live-Sync und Final-Output.
- Phase-6-Artefakte (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE`) sind konsistent mit globalen Planungsdateien (`STATE/ROADMAP/CURRENT_PHASE`) synchronisiert.
- Language-Sweep-Regression ist als Artefakt dokumentiert und schliesst den P0-Blocker aus verify-work 6 explizit.

## Execution Update - 6-HF6 Completed (P0/P1)
- HF6 ist umgesetzt: Room-vs-Vertex arbitration bleibt deterministisch getrennt, vertex-click behaelt aktive Room-Selektion/Handles stabil.
- Direkter Vertex-Click ist jetzt persistente Edit-Quelle fuer Move/Delete ohne Dropdown-Re-Select; Delete-Key und Delete-Panel nutzen dieselbe Vertex-Selection.
- Optionaler low-risk UX-Fix ist aktiv: Text-Selektion waehrend Room-Drag wird unterdrueckt.
- HF6-Regressionsevidenz liegt in `P6-T53-REGRESSION.md`; nachfolgendes verpflichtendes Feedback setzt jedoch ein neues HF7-Gate vor Plan 6-3.

## Plan Update - 6-HF7 Execute-Ready (P0)
- Verpflichtendes Feedback nach HF6 setzt zwei neue P0-Hotfixes: Edge-Bubble-Click darf Room-Selektion nicht verlieren und Room-Delete muss defaults-resistent persistent bleiben.
- HF7 wird vor Plan 6-3 ausgefuehrt; Hardening startet erst nach PASS fuer Insert-Vertex-Regression + Delete-Persistenzmatrix.

## Execution Update - 6-HF7 Completed (P0)
- HF7 ist umgesetzt: Edge-Bubble-Click folgt jetzt dem Vertex-Lifecycle, behaelt persistente Room-Selektion und stabilisiert aktive Edge-Selection fuer Insert-Vertex ohne Re-Select.
- Room-Delete wird board-spezifisch als `deletedRoomIds`-Tombstone persistiert; Room-Katalog-Anwendung und Global-Defaults-Merge respektieren Tombstones gegen Rehydrate.
- HF7-Regressionsevidenz ist erbracht (`P6-T59-REGRESSION.md`) und das Gate vor Plan 6-3 ist geschlossen.

## Plan Update - 6-HF8 Execute-Ready (P0)
- Neues verpflichtendes Feedback nach HF7 setzt ein weiteres P0-Gate: Draft-Voreinstellungen duerfen bei Room-Wechsel nicht resetten und Cluster-UX/Flow muss vollstaendig bedienbar werden.
- HF8 wird vor Plan 6-3 ausgefuehrt; Hardening startet erst nach PASS fuer Draft-Persistenz + Cluster-CRUD + Cluster-Start (`sync`/`stagger`).

## Execution Update - 6-HF8 Completed (P0)
- HF8 ist umgesetzt: Room-Animation-Drafts bleiben ueber Room-/Target-Wechsel sowie nach Trigger-Start als aktive Voreinstellung erhalten.
- Cluster-UX ist vollstaendig: create/edit/delete inkl. board-spezifischer Persistenz und room-assignment-management sind im Operator-Flow verfuegbar.
- Trigger-Option `stagger start` ist umgesetzt (`off = synchron`, `on = kurzer randomisierter Room-Offset`) und in `P6-T66-REGRESSION.md` als PASS dokumentiert.

## Plan Update - 6-HF9 Execute-Ready (P0)
- Neues verpflichtendes Feedback nach HF8 praezisiert den Target-Flow: Draft-Persistenz bleibt fuer Animation + Parameter stabil, `target` ist ausgenommen und wird bei Room-Klick automatisch auf den geklickten Raum gesetzt.
- Gleichzeitig bleibt `target` jederzeit manuell waehlbar (Room/Cluster), auch ohne aktive Room-Selektion; ein deaktiviertes Target-Dropdown ist nicht mehr zulaessig.
- HF9 wird vor Plan 6-3 ausgefuehrt; Hardening startet erst nach PASS fuer Target-Autofill + always-manual Target-Selection + Draft-Non-Target-Persistenz.

## Execution Update - 6-HF9 Completed (P0)
- HF9 ist umgesetzt: Draft-Persistenz bleibt stabil fuer Animation + Parameter, waehrend `target` explizit aus dem Selection-Lifecycle-Reset ausgeschlossen ist.
- Board-Raumklick setzt `target` deterministisch auf den geklickten Raum; Target-Dropdown bleibt auch bei `selection = none` manuell bedienbar.
- Auto+Manual-Paritaet ist mit `P6-T71-REGRESSION.md` als PASS nachgewiesen; nachfolgendes Pflichtfeedback setzt jedoch ein neues HF10-Gate vor Plan 6-3.

## Plan Update - 6-HF10 Execute-Ready (P0)
- Neues verpflichtendes Feedback nach HF9 setzt ein weiteres P0-Gate: Cluster-Start fanout muss fuer alle Cluster-Member robust funktionieren (sync + stagger), aktuell beobachteter First-Room-Only-Start ist unzulaessig.
- Running-Model/-Rendering wird um eigene Scope-Art `CLUSTER` erweitert: separater Running-Eintrag, Label `CLUSTER`, visuell unterscheidbare Farbe sowie konsistente Stop/Edit-Semantik.
- HF10 wird vor Plan 6-3 ausgefuehrt; Hardening startet erst nach PASS fuer Cluster fanout, stagger parity, stop/edit behavior und guard non-regression.

## Execution Update - 6-HF10 Completed (P0)
- HF10 ist umgesetzt: Cluster-Fanout startet in beiden Modi (`stagger start off|on`) deterministisch fuer alle gueltigen Cluster-Member-Raeume.
- Running-Liste fuehrt Cluster-Runs jetzt als dedizierten Scope `CLUSTER` mit eigener Farbe; Stop/Edit auf Cluster-Eintrag arbeiten run-konsistent fuer verlinkte Member-Instanzen.
- HF10-Regressionsevidenz ist erbracht (`P6-T76-REGRESSION.md`) und das Gate vor Plan 6-3 ist geschlossen.

## Plan Update - 6-HF11 Execute-Ready (P0)
- Neues verpflichtendes Feedback nach HF10 setzt ein weiteres P0-Gate: Cluster-Animationen sind lifecycle-instabil (kurz sichtbar, dann weg) und muessen parity-stabil wie Room-Animationen laufen.
- Board-Switch-Sync ist aktuell nicht first-try-deterministisch; serverautoritiver Context-Sync fuer Board/Layout wird mit Ack/Version/Ordering/Reconnect gehaertet und fuer alle Clients inkl. `/output/final` verbindlich gemacht.
- HF11 wird vor Plan 6-3 ausgefuehrt; Hardening startet erst nach PASS fuer Cluster-lifecycle regression + board-context propagation/reconnect matrix und vollstaendigem Artefakt-Sync.

## Execution Update - 6-HF11 Completed (P0)
- HF11 ist umgesetzt: Cluster-Lifecycle bleibt hold-by-default stabil; prune/cleanup entfernt keine Cluster-Controller oder Member mehr implizit durch Parent-Race.
- Cluster-Edit/Stop arbeitet run-context-scharf: laufende Cluster-Runs werden in-place aktualisiert, Member-Reconciliation bleibt `animation.id`-gebunden ohne Fremdinstanzen zu entfernen.
- Board-Context-Sync ist reconnect-stabil gehaertet: mutation-id-dedup, stale-context-replay-drop und socket-generation guards liefern first-toggle-deterministische Propagation inkl. `/output/final`.
- HF11-Regressionsevidenz ist in `P6-T81-REGRESSION.md` als PASS dokumentiert; Gate vor Plan 6-3 ist geschlossen.

## Plan Update - 6-HF12 Execute-Ready (P0)
- Neues verpflichtendes Feedback nach HF11 setzt ein weiteres P0-Gate: Cluster-Start bleibt nicht deterministisch (teils zusaetzliche `ROOM`-Eintraege, teils nur `CLUSTER` ohne sichtbare Wirkung).
- Running-Liste wird auf einen kanonischen Cluster-Controller-Eintrag gehaertet: pro Cluster-Trigger genau ein `CLUSTER`-Eintrag, keine memberbezogenen Doppelzeilen fuer denselben Trigger.
- Runtime-Fanout/Rendering bleibt dabei verpflichtend member-vollstaendig; Stop/Edit auf `CLUSTER` propagiert konsistent auf alle Cluster-Member, Room-Target bleibt regressionsfrei.
- HF12 wird vor Plan 6-3 ausgefuehrt; Hardening startet erst nach PASS fuer single-entry running determinism + full-member runtime effect + cluster stop/edit propagation + room-target non-regression und vollstaendigem Artefakt-Sync.

## Execution Update - 6-HF12 Completed (P0)
- HF12 ist umgesetzt: Running-Liste projiziert Cluster-Starts deterministisch als genau einen kanonischen `CLUSTER`-Controller-Eintrag ohne member-`ROOM`-Duplikate.
- Runtime-Fanout bleibt vollstaendig wirksam (sync + stagger) auch unter dedupter Running-Projektion; controller-first Snapshot-Faelle behalten sichtbare Member-Wirkung.
- Stop/Edit auf dem `CLUSTER`-Eintrag propagiert run-kontextscharf auf alle zugeordneten Member-Instanzen; room-target Pfad (`targetType=room`) bleibt unveraendert stabil.
- HF12-Regressionsevidenz ist in `P6-T87-REGRESSION.md` (plus `P6-T86-ROOM-TARGET-REGRESSION.md`) als PASS dokumentiert; Gate vor Plan 6-3 ist geschlossen.
