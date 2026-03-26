# Phase 6 Risks

## R1 Importierte Boarddaten sind unvollstaendig oder inkonsistent
- Risiko: fehlende Pflichtfelder oder kaputte Polygone brechen Render-/Selection-Pfade.
- Impact: Kritisch, importiertes Board ist nicht bedienbar.
- Gegenmassnahme: strikter Server-Validator mit klaren englischen Fehlercodes und Reject vor Persistenz.

## R2 Path-Traversal/unsichere Dateinamen im Importpfad
- Risiko: manipulierte Dateinamen schreiben ausserhalb des vorgesehenen Storage-Verzeichnisses.
- Impact: Kritisch, Sicherheits- und Datenintegritaetsproblem.
- Gegenmassnahme: serverseitiges Path-Sanitizing, feste Zielstruktur und keine direkte Uebernahme externer Pfade.

## R3 Katalog-Refresh ist nicht deterministisch
- Risiko: importiertes Board wird erst nach Restart sichtbar oder erscheint inkonsistent zwischen Clients.
- Impact: Hoch, Operator-Flow wirkt unzuverlaessig.
- Gegenmassnahme: atomarer Katalog-Refresh/Invalidate nach Import plus Snapshot-Paritaet.

## R4 Nemesis-only Annahmen bleiben im Runtime-Code
- Risiko: versteckte Spezialfaelle fuer Board A/B fuehren bei Fremdboards zu Defekten.
- Impact: Kritisch, boardspiel-agnostischer Anspruch wird verfehlt.
- Gegenmassnahme: boardId-kataloggetriebene Aufloesung und Regressionstests ohne Nemesis-Sonderannahmen.

## R5 Cluster-Fanout erzeugt inkonsistente Running-Instanzen
- Risiko: Teilstart/Teilstop innerhalb eines Clusters fuehrt zu driftender Running-Liste.
- Impact: Hoch, Operator verliert Uebersicht.
- Gegenmassnahme: deterministische Fanout-Regeln pro roomId mit instanzscharfen IDs und klarer Edit-/Stop-Semantik.

## R6 Einzelraum-Klickverhalten regressiert durch Cluster-Integration
- Risiko: Raumklick selektiert ploetzlich Cluster oder fuehrt indirekte Mehrfachaktionen aus.
- Impact: Kritisch, bestehender Bedienfluss bricht.
- Gegenmassnahme: expliziter Click-Guard und Pflicht-Negativtests fuer implizite Cluster-Selektion.

## R7 Sprachdrift nach Englisch-Umstellung
- Risiko: Resttexte in Deutsch bleiben in UI/Errors/Logs/README verteilt bestehen.
- Impact: Hoch, Operator-Flow wirkt uneinheitlich.
- Gegenmassnahme: systematischer English sweep mit Pattern-Checks und Abnahmegate.

## R8 Migration verliert Bestandsdaten
- Risiko: Legacy-Polygone oder Animationsconfigs werden bei Migration abgeschnitten/ueberschrieben.
- Impact: Kritisch, vorhandene Setups werden unbrauchbar.
- Gegenmassnahme: idempotente, verlustfreie Migrationsfunktion plus Snapshot-Vergleich vor/nach Save.

## R9 Migration ist nicht idempotent
- Risiko: jeder weitere Load/Save veraendert Daten erneut und fuehrt zu schleichendem Drift.
- Impact: Hoch, langfristige Datenintegritaet sinkt.
- Gegenmassnahme: expliziter Idempotency-Test und stabiler Normalizer mit versionsmarkiertem Schema.

## R10 Import-/Cluster-Komplexitaet erzeugt Performanceeinbrueche
- Risiko: grosse Boards oder grosse Cluster triggern zu viele gleichzeitige Instanzen.
- Impact: Mittel bis hoch, Bedienreaktion und Framerate sinken.
- Gegenmassnahme: begrenzte Fanout-Schutzregeln, Performance-Soak und observierbare Runtime-Metriken.

## R11 Verify-Work-Blocker bleibt trotz Teilfix offen
- Risiko: punktuelle Textanpassungen lassen Rest-Deutsch in Control/Settings/Final-Flow oder Fehlerpfaden stehen.
- Impact: Kritisch, P0-Blocker `English-only operator flow` wuerde erneut geoeffnet und Folgewellen blockieren.
- Gegenmassnahme: verpflichtende HF1-Language-Inventur, systematischer Sweep, README/Phase-Doku-Sync und dediziertes Abschlussartefakt.

## R12 Vertex-Visibility ohne Interaktionsguard
- Risiko: ausgeblendete Vertex-Gruppen bleiben ueber Hit-Tests aktiv und koennen versehentlich gezogen werden.
- Impact: Hoch, Polygon-Editor fuehlt sich unzuverlaessig an und produziert Geometriefehler.
- Gegenmassnahme: Sichtbarkeit an Selection/Drag-Eligibility koppeln und mit Negativtests fuer versteckte Gruppen absichern.

## R13 Terminologie-Drift bei Play-Area-Rename
- Risiko: `Ship Polygon` bleibt in Teilpfaden (UI/Model/Logs/Docs) erhalten und erzeugt Bedien- und Supportverwirrung.
- Impact: Mittel bis hoch, inkonsistente Operator-Sprache.
- Gegenmassnahme: zentraler Wording-Sweep mit Alias-Strategie nur fuer Legacy-Load, plus Pattern-Checks in Abnahme.

## R14 Altlogik fuer Spezialraum-Sonderfarben bleibt aktiv
- Risiko: fruehere Spezialraum-Markierungen greifen weiterhin in Render-/Editorpfaden und widersprechen neuem Standard.
- Impact: Mittel, visuelle Inkonsistenz und Fehlinterpretation durch Operator.
- Gegenmassnahme: Sonderstyling komplett entfernen und UI-Regression mit Vergleich normaler vs ehemaliger Spezialraeume dokumentieren.

## R15 Polygon-Template-Copy erzeugt gekoppelte Referenzen
- Risiko: neue Raeume teilen versehentlich dieselbe Punktliste mit der Vorlage (shallow copy) und aendern sich gegenseitig.
- Impact: Kritisch, Datenintegritaetsfehler in Room-Geometrien.
- Gegenmassnahme: tiefe Kopie erzwingen, roomId-neutrale Neuzuordnung und Persistenztests fuer unabhaengige Nachbearbeitung.

## R16 Room-Copy bleibt geometrisch unvollstaendig
- Risiko: Copy/Paste uebernimmt nur Punktlisten, aber verliert Scale/Offset/Transform-Parameter und erzeugt abweichende Zielgeometrie.
- Impact: Kritisch, kopierte Raeume sind fachlich inkonsistent und schwer nachzujustieren.
- Gegenmassnahme: vollstaendige Geometry-Property-Matrix definieren, deep-copy erzwingen und Feld-fuer-Feld-Regression dokumentieren.

## R17 Keyboard-Shortcuts kollidieren mit bestehenden Editor-Hotkeys
- Risiko: `CTRL+C`/`CTRL+V`/`Delete` greifen in falschen Kontexten (z. B. Input-Felder, Play-Area-Editing) oder loesen Mehrfachaktionen aus.
- Impact: Hoch, Bedienfehler und unbeabsichtigte Datenaenderungen.
- Gegenmassnahme: fokus-/kontextsensitiver Shortcut-Guard, explizite Blockliste fuer Textinputs und Negativtests je View.

## R18 Empty-Space-Deselection verursacht Nebenwirkungen
- Risiko: Klick auf leere Flaeche setzt nicht nur Room-Selektion zurueck, sondern beeinflusst aktive Play-Area-Selection/Editor-Zustaende.
- Impact: Hoch, Regression in etablierten Polygon-Workflows.
- Gegenmassnahme: selektive Deselection nur fuer Room-Kontext, plus Non-Regression-Tests fuer Play-Area-Interaktion.

## R19 Selection-State ist weiterhin an Pointer-Hold gekoppelt
- Risiko: nach Mouse-Up bleibt Room visuell selektiert, gilt intern aber nicht mehr als aktiv; Hotkeys reagieren inkonsistent.
- Impact: Kritisch, Delete/Copy/Paste verhalten sich fuer Operator unvorhersehbar.
- Gegenmassnahme: persistenter Selection-Source-of-Truth mit eindeutiger Bindung `visible selection == active selection` und dedizierten State-Transition-Tests.

## R20 Delete-Trigger ignoriert aktive Selection ohne Drag-Kontext
- Risiko: `Delete` funktioniert nur waehrend LMB-Hold/Drag auf dem Room und nicht im normalen selektierten Ruhezustand.
- Impact: Kritisch, erwarteter Keyboard-Workflow bricht und fuehrt zu Bedienfehlern.
- Gegenmassnahme: Delete-Guard auf persistente Selection statt Pointer-State umstellen; Regression fuer Copy/Paste/Delete + Empty-space deselect + Play-Area-Guard als Pflichtgate.

## Risk Closure Update - 6-HF3
- R19 Status: mitigated in HF3 via persistente Selection-Normalisierung (`src/app.js`, `syncSelectedRoomStateForBoard`).
- R20 Status: mitigated in HF3 via Delete-Entkopplung von Pointer-Hold/Drag und Regression-Nachweis (`.planning/phases/phase-06/P6-T37-REGRESSION.md`).
