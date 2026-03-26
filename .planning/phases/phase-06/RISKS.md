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

## R21 Pointer-Arbitration invalidiert persistente Click-Selection
- Risiko: Pointerdown/Pointerup-Logik behandelt Selection weiterhin als Hold-gebunden; nach Mouse-Up verschwinden Polygone/Handles trotz Room-Click.
- Impact: Kritisch, Kernworkflow `einmal klicken -> persistent selektiert` ist gebrochen und erzeugt Fehlbedienung.
- Gegenmassnahme: klare Arbitration-Regel (`click => select`, `hold+move => drag`), inklusive Transition-Tests fuer pointerdown/click/pointerup ohne Selection-Reset.

## R22 Hotkeys/Buttons bleiben an transienten Pointer-State gekoppelt
- Risiko: `Delete`/`CTRL+C`/`CTRL+V` und UI-Buttons lesen weiterhin Hold-/Drag-Status statt persistenter Selection und reagieren inkonsistent.
- Impact: Kritisch, Editing-Operationen wirken zufaellig und regressieren bestehende HF2/HF3-Gates.
- Gegenmassnahme: einheitliche Selection-Source-of-Truth fuer alle Editing-Entry-Points und kombinierte Regression (Delete/Copy/Paste + Empty-space deselect + Play-Area-Guard) unter neuer Arbitration.

## R23 No-Move-Click persistiert Selection nicht
- Risiko: kurzer Click ohne Move bleibt transient; persistente Selection entsteht erst nach kurzem Verschieben.
- Impact: Kritisch, Kern-Interaction `einfach klicken = selektiert` ist fuer Operator unzuverlaessig.
- Gegenmassnahme: Click-Commit explizit an no-move Pointer-Up koppeln, dedizierter no-move Regressionstest und Guard gegen Hold-only-Fallback.

## R24 Drag-Paritaet regressiert durch Click-Fix
- Risiko: Fix fuer no-move Click blockiert oder verzoegert Drag-Start, sodass Room-Drag subjektiv "kaputt" wirkt.
- Impact: Hoch, bestehende Bearbeitungsworkflows verlieren Praezision/Vertrauen.
- Gegenmassnahme: Drag-Promotion/Threshold unveraendert halten und getrennte Positivtests fuer Selection-only Click vs Move-Drag ausfuehren.

## R25 Guard-Regression bei HF5
- Risiko: Empty-space deselect, Play-Area-Guard oder Copy/Paste/Delete verhalten sich unter neuer Click-Arbitration inkonsistent.
- Impact: Kritisch, bereits geschlossene P0-Gates aus HF2/HF3/HF4 werden erneut geoeffnet.
- Gegenmassnahme: verpflichtende HF5-Kombinationsmatrix fuer no-move click + guard non-regression mit expliziten Negativpfaden.

## R26 Vertex-Click invalidiert Room-Selection
- Risiko: Pointer-Arbitration behandelt Vertex-Interaktion als Room-Deselect, dadurch verschwinden Room-Handles sofort.
- Impact: Kritisch, Vertex-Edit-Workflow wird faktisch unbenutzbar.
- Gegenmassnahme: dedizierte Room-vs-Vertex-Arbitration mit persistenter Room-Selection als kanonischer Source-of-Truth.

## R27 Vertex-Delete bleibt an Dropdown-Re-Select gekoppelt
- Risiko: Delete-Key/Delete-Panel wirken nicht stabil auf den direkt geklickten Vertex und erfordern erneute Auswahl ueber Dropdown.
- Impact: Kritisch, direkter Editor-Workflow ist nicht praktikabel und fehleranfaellig.
- Gegenmassnahme: Vertex-Selection-Lifecycle vereinheitlichen (direct-click -> active vertex), Delete-Entry-Points an denselben Selection-State binden.

## R28 Room-Drag markiert unbeabsichtigt Browser-Text
- Risiko: waehrend Drag selektiert der Browser Text im UI, was Pointer-Flows stoert und Bedienung unpraezise macht.
- Impact: Mittel bis hoch, UX-Qualitaet sinkt und Drag kann subjektiv "hakeln".
- Gegenmassnahme: low-risk Text-Selection-Suppression nur im Room-Drag-Lifecycle, mit Guard gegen Input-Feld-/Keyboard-Regression.

## R29 Edge-Bubble-Click deselektiert Room-Selection
- Risiko: Pointer-Arbitration behandelt Edge-Bubble-Click als Deselect-Pfad; aktive Room-Selektion und Handles gehen verloren.
- Impact: Kritisch, Insert-Vertex-Workflow bricht und erfordert fehleranfaelligen Re-Select.
- Gegenmassnahme: Edge-Pointerpfad an Vertex-Pfad angleichen (`edge click => keep room selected + keep edge active`) und durch Lifecycle-Regression absichern.

## R30 Deleted Rooms werden durch Defaults-Merge rehydriert
- Risiko: global-defaults overlay setzt geloeschte Rooms erneut ein, weil Delete nicht als persistenter Tombstone modelliert ist.
- Impact: Kritisch, Datenintegritaet und Operator-Vertrauen brechen bei Reload/Restart.
- Gegenmassnahme: board-spezifische Tombstone-/Deletion-Semantik im Room-Katalog einziehen und Merge-Prioritaet `tombstone > defaults` erzwingen.

## R31 Tombstone-Guard regressiert bestehende Room-Persistenz
- Risiko: neue Delete-Semantik beeinflusst versehentlich Move/Transform-Persistenz oder Legacy-Migration fuer nicht geloeschte Rooms.
- Impact: Hoch, bestehende Geometrie-Workflows werden instabil.
- Gegenmassnahme: kombinierte Regression fuer delete persistence + move parity + defaults apply + legacy load als Pflichtgate vor Plan 6-3.

## Risk Update - HF6 Closed
- R19/R20 bleiben als Basisrisiken dokumentiert und fuer HF5-Pfad weiter PASS, sind aber indirekt von Room-vs-Vertex-Arbitration betroffen.
- R21/R22 bleiben fuer Room-Click/Hold-Pfade geschlossen; R26/R27 sind durch HF6-Arbitration + Vertex-Selection-Fix ebenfalls geschlossen (siehe `P6-T53-REGRESSION.md`).
- R23/R24/R25 bleiben ueber HF5-Evidenz geschlossen (`P6-T46-DRAG-PARITY.md`, `P6-T47-REGRESSION.md`).
- R28 ist als optionaler UX-Risikopfad mit low-risk Umsetzung geschlossen (Text-Selection-Suppression nur im Room-Drag-Lifecycle).
- R29/R30/R31 sind mit HF7 geschlossen: Edge-Bubble lifecycle parity + tombstone precedence gegen defaults rehydrate sind umgesetzt und in `P6-T59-REGRESSION.md` als PASS belegt.
