# Phase 8 Risks

## R1 Union-Semantik driftet zwischen Render- und Input-Pfad
- Risiko: inside/outside wirkt visuell korrekt, aber Hit-Tests/Editoraktionen folgen anderer Geometrie.
- Impact: Kritisch.
- Gegenmassnahme: gemeinsame Union-Geometriequelle fuer Render, Clipping und Interaktion.

## R2 Migration verliert Bestandsdaten
- Risiko: bestehende Single-Area- oder Legacy-Ship-Daten werden unvollstaendig ueberfuehrt.
- Impact: Kritisch.
- Gegenmassnahme: idempotente Migration mit Pflichttests fuer Datenvollstaendigkeit vor/nach Save.

## R3 Migration ist nicht idempotent
- Risiko: wiederholtes Laden/Speichern erzeugt Drift, Duplikate oder Geometrieversatz.
- Impact: Hoch.
- Gegenmassnahme: stricte Normalisierungsregeln + Wiederholungstests ueber mehrere Zyklen.

## R4 Play-Area-Delete erzeugt Editor-Dead-End
- Risiko: Loeschen laesst keinen aktiven Bereich zurueck oder entkoppelt Auswahlzustand.
- Impact: Hoch.
- Gegenmassnahme: Delete-Guards, deterministische Active-Area-Fallbacks, UI-Bestaetigung.

## R5 Union-Performance degradiert bei vielen Vertices
- Risiko: mehrere komplexe Areas erzeugen Render-/Input-Lag.
- Impact: Mittel bis hoch.
- Gegenmassnahme: effiziente Maskenberechnung, Caching und Performance-Regression.

## R6 Upload-Endpoint ist sicherheitlich unzureichend
- Risiko: unsichere Dateinamen, ungueltige Typen oder Path-Traversal gelangen in Persistenzpfad.
- Impact: Kritisch.
- Gegenmassnahme: harte MIME/Extension/Groessenvalidierung, Pfadnormalisierung, sichere serverseitige Dateibenennung.

## R7 Upload speichert, aber Katalog aktualisiert nicht deterministisch
- Risiko: Bild ist physisch vorhanden, Board taucht aber nicht sofort im Katalog auf.
- Impact: Hoch.
- Gegenmassnahme: transaktionaler Importabschluss (persist + catalog refresh) mit klarer Fehlersemantik.

## R8 Import-UX ist unklar zwischen JSON und Bildpfad
- Risiko: Operator waehlt falschen Flow oder bleibt ohne naechsten Schritt.
- Impact: Mittel.
- Gegenmassnahme: explizite Importoptionen, klare Success- und Next-Step-Hinweise.

## R9 Non-Regression in Running/Final bricht durch Modellumbau
- Risiko: Multi-Area-Fix erzeugt Nebenwirkungen in Trigger/Stop/Clear oder `/output/final`.
- Impact: Kritisch.
- Gegenmassnahme: verpflichtende Non-Regression-Matrix fuer zentrale Runtime-Flows.

## R10 Artefakte driften zwischen Phase und globalen Tracking-Dateien
- Risiko: Planungsstand ist inkonsistent und erschwert execute-phase.
- Impact: Hoch.
- Gegenmassnahme: verpflichtender Vollsync in P8-T12 (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Risk Review after Plan 8-1
- 2026-03-27: R1-R4, R6-R8 wurden in 8-1 implementierungsseitig mitigiert (Union-Maskenpfad, Migration, Delete-Guard, Upload-Validierung, UX-Hinweise).
- Verbleibende Beobachtung: R5 (Performance bei vielen Areas/Vertices) bleibt als Hardening-Thema fuer Plan 8-2.
