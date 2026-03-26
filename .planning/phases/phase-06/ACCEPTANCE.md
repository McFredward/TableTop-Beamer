# Phase 6 Acceptance

## Regression- und Verifikationsstrategie
- Data-first: Katalog-/Import-/Migrationslogik wird vor UI-Flows isoliert verifiziert.
- Operator-first: alle sichtbaren Operator-Texte und Handlungsfehler muessen Englisch-only sein.
- Behavior-parity: Einzelraum-Klick, Trigger/Edit/Stop/Clear-All und Running-Liste duerfen durch Cluster/Catalog-Migration nicht regressieren.
- Persistence-duty: Importierte Boards und migrierte Daten gelten erst mit Reload/Restart-Nachweis als bestanden.
- Edit-safety-first: Polygon-Editing muss Room-Vertices und Play-Area-Vertices getrennt steuern koennen, ohne versehentliche Cross-Edits.
- Selection-integrity: Room-Selektion muss bei leerem Board-Klick deterministisch auf `none` gehen, ohne Play-Area-Nebenwirkungen.
- Selection-consistency: visuell selektierter Room (sichtbares Polygon/Handles) ist immer die aktive Auswahl fuer Copy/Paste/Delete.
- Pointer-arbitration-integrity: Selection (`Click`) und Drag (`Hold/Move`) duerfen sich nicht gegenseitig invalidieren.
- Click-without-move-integrity: kurzer no-move Click muss persistente Selection ohne Drag-Zwang liefern.
- Vertex-selection-integrity: Vertex-Interaktion darf persistente Room-Selektion nicht verlieren; Handles bleiben sichtbar.
- Direct-vertex-edit-integrity: direkter Vertex-Click muss stabile Move/Delete-Aktionen (Delete-Key/Panel) ohne Dropdown-Re-Select erlauben.
- Drag-ux-integrity: waehrend Room-Drag darf keine unbeabsichtigte Browser-Text-Selektion auftreten (low-risk Guard).
- Edge-selection-integrity: Edge-Bubble-Interaktion folgt Vertex-Paritaet; Room-Selektion bleibt persistent und aktive Edge bleibt editierbar.
- Deletion-tombstone-integrity: geloeschte Rooms bleiben auch nach Defaults-Rehydrate dauerhaft geloescht.

## Language-Sweep Pflichtnachweis (P0)
- Sweep Scope: `Control`, `Settings`, `Final-Flow`, operatorrelevante Statusmeldungen, Fehlermeldungen und Diagnose-Logs.
- Verbot: deutschsprachige operatorrelevante Strings in produktiven Runtime-/UI-Pfaden.
- Nachweisform: kombinierter Pattern-Scan (Code + Templates + Runtime-Strings) plus manuelle UI-Laufmatrix.
- Artefakt: `.planning/phases/phase-06/P6-HF1-LANGUAGE-SWEEP.md` mit Fundstellenliste, bereinigten Stellen und Final-Befund `no open P0 blocker`.

## Testplan (Pflichtmatrix)
- Catalog-Load-Test: Boardliste wird dynamisch aus Katalog geladen; kein hardcoded A/B-Fallback in Normalpfaden.
- Catalog-Selection-Test: Boardwechsel aus Katalog aktualisiert Render-/Room-Kontext deterministisch.
- Board-Import-Happy-Path-Test: gueltiges Board kann importiert, gespeichert und sofort ausgewaehlt werden.
- Board-Import-Restart-Test: importiertes Board ist nach Serverneustart weiterhin im Katalog vorhanden.
- Board-Import-Validation-Negativtest: ungueltige Payload liefert klare englische Fehlermeldung und schreibt keine defekten Daten.
- Server-Storage-Integrity-Test: persistierte Boarddatei bleibt strukturell gueltig und reproduzierbar ladbar.

- Cluster-Model-Test: Cluster je Board werden korrekt geladen/gespeichert (`clusterId`, `name`, `roomIds`).
- Cluster-Dropdown-Test: Cluster erscheinen als waehlbare Ziele zusammen mit Einzelraeumen.
- Cluster-Trigger-Fanout-Test: Cluster-Start erzeugt sichtbare Instanzen fuer alle enthaltenen Raeume.
- Cluster-Edit-Consistency-Test: Edit auf Cluster-Instanzen bleibt instanzscharf konsistent in Running-Liste.
- Single-Room-Click-Parity-Test: Klick auf Board-Raum selektiert nur diesen Raum, nie implizit den zugehoerigen Cluster.

- Vertex-Visibility-Split-Test: `Show Room Vertices` und `Show Play Area Vertices` sind getrennt schaltbar und beeinflussen nur die jeweilige Gruppe.
- Vertex-Drag-Guard-Test: ausgeblendete Vertex-Gruppe ist nicht selektierbar/dragbar; sichtbare Gruppe bleibt voll editierbar.
- Play-Area-Wording-Test: UI/Model/Operator-Texte verwenden `Play Area`; `Ship Polygon` erscheint nicht mehr in Operator-Pfaden.
- No-Special-Room-Visual-Test: fruehere Spezialraeume haben keine Sonderfarbe/Sonderstile gegenueber normalen Raeumen.
- Room-From-Template-Test: neuer Raum kann aus bestehendem Polygon erzeugt werden; Startpunkte sind identisch kopiert und danach unabhaengig editierbar.
- Template-Persistency-Test: per Template erzeugter Raum bleibt nach Save/Reload/Restart geometrisch stabil.
- Room-Copy-Full-Geometry-Test: Room-Copy uebernimmt alle Geometrie-Eigenschaften (inkl. Scale/Offsets/Transform) vollstaendig und als tiefe Kopie.
- Keyboard-Copy-Paste-Delete-Test: bei selektiertem Raum funktionieren `CTRL+C`, `CTRL+V`, `Delete` deterministisch und kollisionsfrei.
- Visual-Selection-Is-Active-Test: wenn Room-Polygon/Handles sichtbar selektiert sind, gilt der Room ohne LMB-Hold als aktiv selektiert.
- Delete-Without-Hold-Test: `Delete` loescht den aktiv selektierten Room sofort auch nach Mouse-Up und ohne laufenden Drag.
- Single-Click-Persistent-Selection-Test: einmaliger Click auf Room selektiert persistent; Selection bleibt nach Pointer-Up erhalten.
- No-Move-Click-Persistence-Test: kurzer Click ohne Pointer-Move selektiert persistent; Selection ist nicht an Hold oder Mini-Drag gebunden.
- Handles-Visibility-Persistence-Test: selektiertes Room-Polygon/Handles bleiben sichtbar bis Empty-Space-Deselect oder explizitem Room-Wechsel.
- Select-vs-Drag-Arbitration-Test: kurzer Click triggert nur Selection; Drag/Move startet nur mit Pointer-Move/Hold-Drag-Intent.
- Drag-Still-Works-Test: Room-Drag funktioniert weiterhin ueber Move-Intent/Threshold und wird durch no-move Click-Fix nicht blockiert.
- Vertex-Click-Keeps-Room-Selection-Test: Klick auf Vertex behaelt Room-Selektion persistent; Room/Handles verschwinden nicht.
- Vertex-Direct-Delete-Key-Test: nach direktem Vertex-Click loescht `Delete` den aktiven Vertex ohne Dropdown-Re-Select.
- Vertex-Direct-Delete-Panel-Test: nach direktem Vertex-Click entfernt das Delete-Panel denselben aktiven Vertex ohne Re-Select.
- Room-vs-Vertex-Arbitration-Test: Vertex-Drag/Edit und Room-Drag bleiben getrennt; Vertex-Pointerevents invalidieren Room-Selektion nicht.
- Room-Drag-Text-Selection-Guard-Test: waehrend Room-Drag entsteht keine unbeabsichtigte Textmarkierung; Textinputs ausserhalb des Drags bleiben funktionsfaehig.
- Edge-Click-Keeps-Room-Selection-Test: Klick auf Edge-Bubble behaelt persistente Room-Selektion und sichtbare Handles.
- Edge-Click-Keeps-Edge-Active-Test: nach Edge-Bubble-Click bleibt dieselbe Edge aktiv bis Insert/Wechsel/Deselect.
- Insert-Vertex-Without-Reselect-Test: Insert-Vertex funktioniert direkt nach Edge-Bubble-Click ohne erneute Room-Selektion.
- Hotkey-On-Persistent-Selection-Test: Buttons/Hotkeys (`Delete`, `CTRL+C`, `CTRL+V`) funktionieren auf persistenter Selection ohne erneuten Hold.
- Empty-Space-Deselect-Test: Klick auf board-leere Flaeche setzt Room-Selektion auf `none`.
- Play-Area-Non-Regression-Test: Room-Copy/Keyboard/Deselection veraendern Play-Area-Selection/-Editing nicht.
- Room-Delete-Persistence-Reload-Test: geloeschter Room bleibt nach Save + Reload dauerhaft entfernt.
- Room-Delete-Persistence-Restart-Test: geloeschter Room bleibt nach Server-Restart entfernt.
- Room-Delete-Persistence-Defaults-Apply-Test: `Defaults laden & anwenden` oder global-defaults merge stellt geloeschte Rooms nicht wieder her.
- Room-Delete-vs-Move-Parity-Test: Move/Transform-Persistenz nicht geloeschter Rooms bleibt unter Tombstone-Semantik unveraendert korrekt.

- English-UI-Text-Test: UI-Texte/Labels/Buttons sind Englisch-only.
- English-Status-Test: Statusmeldungen/Toasts/Operator-Hinweise sind Englisch-only.
- English-Log-Error-Test: operatorrelevante Logs und Errors sind Englisch-only und handlungsorientiert.
- English-README-Test: README-/Operator-Startanleitung enthaelt englische Hinweise fuer neue Flows.
- English-Control-Settings-Final-Test: In `Control`/`Settings`/`Final-Flow` bleibt kein deutscher operatorrelevanter Text zurueck.

- Legacy-Migration-Load-Test: bestehende Nemesis-Daten werden beim Laden automatisch in neues Schema ueberfuehrt.
- Legacy-Migration-Polygon-Test: vorhandene Polygone bleiben nach Migration identisch nutzbar.
- Legacy-Migration-Animation-Test: bestehende Animationsconfigs bleiben funktional und werden korrekt normalisiert.
- Migration-Idempotency-Test: mehrfaches Laden/Speichern erzeugt keine weiteren strukturellen Aenderungen.
- Migration-Rollforward-Test: Save schreibt konsistent nur noch das neue Standardschema.

## Inkrementelle Pflicht-Gates
- Nach P6-T1..P6-T3: Katalog und Importpersistenz sind serverseitig stabil; ungueltige Imports werden sauber abgewiesen.
- Nach P6-T4..P6-T5: Board-Auswahl laeuft dynamisch ueber Katalog ohne Nemesis-only-Hardcoding.
- Nach P6-T6..P6-T9: Cluster-Flow funktioniert, Einzelraum-Klick bleibt regressionsfrei.
- Nach P6-T10..P6-T11: Operator-Flow ist in UI/Status/Doku/Logs/Errors Englisch-only.
- Nach P6-T18..P6-T22: verify-work-6 P0-Blocker `English-only operator flow` ist mit Language-Sweep-Artefakt geschlossen.
- Nach P6-T12: Legacy-Migration ist verlustfrei und idempotent aktiv.
- Nach P6-T13: Plan-6-1-Regressionsartefakte sind vollstaendig dokumentiert; verbleibende P0-Blocker werden explizit in HF1 geschlossen.
- Nach P6-T23..P6-T24: Polygon-Editor trennt Vertex-Gruppen robust; keine Cross-Drag-Selektion bei ausgeblendeter Gegengruppe.
- Nach P6-T25..P6-T26: Play-Area-Wording ist konsistent und Spezialraum-Sondervisuals sind entfernt.
- Nach P6-T27..P6-T29: Template-basierte Room-Creation ist persistenzstabil und als Plan-6-2-Regression dokumentiert.
- Nach P6-T30: Room-Copy uebernimmt vollstaendige Geometrie inkl. Scale/Offset/Transform ohne Referenzkopplung.
- Nach P6-T31..P6-T32: Keyboard-Editing + Empty-Space-Deselection sind deterministisch aktiv.
- Nach P6-T33..P6-T34: Play-Area bleibt unberuehrt; Plan-6-HF2-Regression ist artefaktbasiert abgeschlossen.
- Nach P6-T35..P6-T36: aktive Room-Selektion ist persistent visuell gebunden; `Delete` funktioniert ohne Hold-Abhaengigkeit.
- Nach P6-T37..P6-T38: kombinierte Regression (Copy/Paste/Delete + deselect + play-area guard) ist nachgewiesen und alle Planungsartefakte sind HF3-konsistent.
- Nach P6-T39..P6-T40: Pointer-Arbitration ist click-persistent; Room-Polygone/Handles bleiben nach Pointer-Up sichtbar bis expliziter Deselection.
- Nach P6-T41..P6-T42: Hold ist Drag-only, Buttons/Hotkeys laufen auf persistenter Selection und kombinierte Regression bleibt PASS.
- Nach P6-T44..P6-T45: no-move Short-Click selektiert persistent, Pointer-Up behaelt Handles/Polygone sichtbar ohne Zwischen-Move.
- Nach P6-T46..P6-T47: Drag bleibt funktionsfaehig und Guard-Matrix (empty-space deselect, play-area guard, copy/paste/delete) bleibt regressionsfrei.
- Nach P6-T48: alle Phase-6- und globalen Planungsartefakte sind HF5-konsistent und Plan 6-3 ist freigegeben.
- Nach P6-T49..P6-T50: Vertex-Click behaelt Room-Selektion persistent und stabilisiert direkten Vertex-Edit-Flow ohne Dropdown-Re-Select.
- Nach P6-T51..P6-T52: Delete-Key/Delete-Panel laufen direkt auf Vertex-Selection; Room-Drag unterdrueckt Text-Selektion ohne Input-Regression.
- Nach P6-T53..P6-T54: HF6-Kombinationsmatrix ist PASS, Artefakte sind HF6-konsistent und Plan 6-3 ist freigegeben.
- Nach P6-T55..P6-T56: Edge-Bubble-Click behaelt persistente Room-Selektion und stabile aktive Edge fuer Insert-Vertex ohne Re-Select.
- Nach P6-T57..P6-T58: Tombstone-Delete-Persistenz blockiert Defaults-Rehydrate fuer geloeschte Rooms bei Reload/Restart/Defaults-Apply.
- Nach P6-T59..P6-T60: HF7-Kombinationsmatrix ist PASS, Artefakte sind HF7-konsistent und Plan 6-3 ist freigegeben.

## Definition of Done
- Alle P0-Tasks P6-T1..P6-T13, P6-T18..P6-T22, P6-T23..P6-T29, P6-T30..P6-T34, P6-T35..P6-T38, P6-T39..P6-T43, P6-T44..P6-T48, P6-T49..P6-T51, P6-T53..P6-T54 und P6-T55..P6-T60 sind abgeschlossen.
- Dynamischer Board-Katalog ersetzt hardcoded Board-A/B-Pfade vollstaendig.
- Eigene Boards sind importierbar, serverseitig persistent und nach Restart verfuegbar.
- Room-Clusters sind als Dropdown-Ziele nutzbar; Gruppenstarts funktionieren ohne Einzelraumklick-Regression.
- Operator-Flow ist durchgaengig Englisch fuer UI, Status, Doku-Hinweise und relevante Logs/Errors.
- In `Control`, `Settings` und `Final-Flow` sind keine deutschen operatorrelevanten Texte/Fehler mehr vorhanden.
- Legacy Nemesis-/Polygon-/Animationsdaten sind verlustfrei in den neuen Standard migriert.
- Polygon-Editor bietet getrennte Room-/Play-Area-Vertex-Visibility inklusive Drag/Selection-Guard fuer ausgeblendete Gruppen.
- `Ship Polygon` ist in Operator-UI/Model-Wording durch `Play Area` ersetzt; keine sichtbaren Restbegriffe in Operator-Pfaden.
- Ehemalige Spezialraeume werden visuell wie normale Raeume behandelt (keine Sondermarkierung).
- Neue Raeume lassen sich aus bestehenden Polygonen als Vorlage erstellen und bleiben nach Save/Reload/Restart stabil.
- Room-Copy ist geometrisch vollstaendig (inkl. Scale/Offset/Transform) und erzeugt keine gekoppelten Referenzen.
- Room-Keyboard-Editing (`CTRL+C`, `CTRL+V`, `Delete`) funktioniert fuer selektierte Raeume ohne Shortcut-Kollision.
- Ein visuell selektierter Room (Polygon/Handles sichtbar) gilt jederzeit als aktive Selection fuer Editing-Hotkeys.
- `Delete` loescht den aktiv selektierten Room ohne LMB-Hold-/Drag-Abhaengigkeit.
- Einmaliger Click auf einen Room erzeugt persistente Selection; Pointer-Up darf diese Selection nicht zuruecksetzen.
- Room-Polygone/Handles bleiben fuer aktive Selection sichtbar bis Empty-Space-Deselect oder Room-Wechsel.
- Pointer-Hold ist ausschliesslich fuer Drag/Move erforderlich und nicht fuer Selection-Aktivierung.
- Room-Buttons/Hotkeys arbeiten konsistent gegen persistente Selection (kein Hold-only Verhalten).
- Kurzer Click ohne Move selektiert persistent; ein Drag ist nicht erforderlich, damit Selection aktiv bleibt.
- Vertex-Interaktion (Click/Drag/Delete) behaelt persistente Room-Selektion stabil; Room-Handles bleiben sichtbar.
- Direkter Vertex-Click aktiviert stabile Vertex-Auswahl fuer Move/Delete ueber Delete-Key und Delete-Panel ohne Dropdown-Re-Select.
- Pointer-Arbitration trennt Room-Drag und Vertex-Edit deterministisch ohne Selection-Drift.
- Waehrend Room-Drag ist Browser-Text-Selektion unterdrueckt, ohne Textinput-/Shortcut-Bedienung ausserhalb des Drags zu brechen.
- Edge-Bubble-Click behaelt persistente Room-Selektion und aktive Edge-Selection; Insert-Vertex ist ohne Re-Select direkt moeglich.
- Klick auf leere Boardflaeche setzt Room-Selektion auf `none`; Play-Area-Verhalten bleibt unveraendert.
- Geloeschte Rooms bleiben ueber Save/Reload/Restart/Defaults-Apply dauerhaft geloescht; Defaults-Merge rehydriert keine getombstoneten Rooms.
- Keine Regression in Trigger/Edit/Stop/Clear-All, Running-Liste, Persistenz, Live-Sync und Final-Output.
- Phase-6-Artefakte sowie `.planning/STATE.md`, `.planning/ROADMAP.md` und `.planning/CURRENT_PHASE.md` sind konsistent aktualisiert.

## Evidence Update - HF6 Completed
- HF4/HF5-Basisnachweise bleiben gueltig (`P6-T42-REGRESSION.md`, `P6-T46-DRAG-PARITY.md`, `P6-T47-REGRESSION.md`).
- HF6-Nachweis ist erbracht: `P6-T53-REGRESSION.md` dokumentiert PASS fuer vertex-click persistence, delete-key/delete-panel parity, empty-space deselect, play-area guard und drag parity.
- Plan-6-3-Gate war aus HF6-Sicht freigegeben, wird jedoch durch neues verpflichtendes Feedback mit HF7-Pflichtgate ersetzt.

## Evidence Update - HF7 Completed
- HF7-Nachweis ist erbracht: `P6-T59-REGRESSION.md` dokumentiert PASS fuer edge-click selection persistence, stable edge->insert flow ohne reselect, delete persistence (reload/restart/defaults-apply) sowie empty-space/play-area guards.
- Das HF7-Pflichtgate vor Plan 6-3 ist geschlossen.
