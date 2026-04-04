# Phase 2 Risks

## R1 Mobile UI-Ueberladung
- Risiko: Zu viele Controls auf kleinem Screen verlangsamen Triggern und fuehren zu Fehlbedienung.
- Impact: Hoch, Live-Bedienung verliert Tempo.
- Gegenmassnahme: harte Trennung Triggern vs Running-Management, reduzierte Paneldichte, Mobile-First-Layout als P0.

## R2 Daumenreichweite unguenstig
- Risiko: Primaere Trigger liegen ausserhalb des natuerlichen Daumenradius und erfordern Umgreifen.
- Impact: Hoch, einhaendige Bedienung am Tisch scheitert.
- Gegenmassnahme: Thumb-Zonen in Portrait/Landscape definieren und mit realen Geraeten gegenpruefen.

## R3 Touch-Targets zu klein oder zu dicht
- Risiko: Kleine Buttons erzeugen Fehlklicks, insbesondere bei hektischen Spielsituationen.
- Impact: Hoch, falsche Trigger/Stops.
- Gegenmassnahme: Mindestgroesse >=44x44 px, konsistente Abstaende, Touch-Hitarea-Checks in Acceptance.

## R4 Fehlklick auf Safety-Aktionen
- Risiko: `Clear All` wird versehentlich ausgeloest.
- Impact: Hoch, Stimmung/Flow am Spieltisch bricht.
- Gegenmassnahme: visuelle Absetzung, Guard gegen accidental touch, expliziter Fehlklicktest.

## R5 Landscape/Portrait State-Drift
- Risiko: Orientation-Wechsel verliert Auswahl- oder Running-State.
- Impact: Mittel bis hoch, Operator muss Zustand neu herstellen.
- Gegenmassnahme: zentraler UI-State, Orientation-Roundtrip-Regression und Pflichttest.

## R6 Lesbarkeit unter Reallicht
- Risiko: Kontrast/Typografie sind unter Beamer- und Raumlicht schlecht erkennbar.
- Impact: Mittel bis hoch, Bedienfehler steigen.
- Gegenmassnahme: klare Kontrastregeln, groessere Kernlabels, Tisch-Lesbarkeitstest als Pflicht.

## R7 Mobile Performance-Einbruch
- Risiko: Bei mehreren laufenden Animationen werden Touch und Scroll zoegerlich.
- Impact: Hoch, Triggerreaktion zu langsam.
- Gegenmassnahme: Performance-Budget fuer mobile UI, 30+ min Mobile-Soak, Profiling der Triggerpfade.

## R8 Konflikt zwischen Touch-Bedienung und Desktop-Hotkeys
- Risiko: Neuer Mobile-Flow regressiert bestehende Desktop-Bedienung.
- Impact: Mittel, uneinheitlicher Betrieb je Setup.
- Gegenmassnahme: getrennte Interaktionspfade mit gemeinsamen Runtime-Guards und Cross-Device-Smoke.

## R9 Unklare Trennung Triggern vs Managen
- Risiko: Operator stoppt/editiert statt zu triggern (oder umgekehrt), weil UI-Bereiche vermischt sind.
- Impact: Mittel bis hoch, fehlerhafte Live-Aktionen.
- Gegenmassnahme: eigene Bereiche mit klarer Ueberschrift, feste Reihenfolge und sichtbare Modi.

## R10 Verifikationsluecke am echten Spieltisch
- Risiko: Tests erfolgen nur im Lab-Setup; reale Einhand- und Fehlklickprobleme bleiben unentdeckt.
- Impact: Hoch, Release scheitert in der Praxis.
- Gegenmassnahme: verpflichtendes Spieltisch-Protokoll mit Smartphone (Portrait + Landscape).

## R11 Globale Defaults werden auf neuen Geraeten nicht wirksam
- Risiko: Neu initialisierte Browser ohne lokale Daten starten ohne gueltige Defaults.
- Impact: Hoch, inkonsistente Session-Parameter und fehleranfaellige Live-Bedienung.
- Gegenmassnahme: verpflichtender Bootstrap-Fallback (autoload + apply) bei leerem/fehlendem Local Storage, inklusive Acceptance-Test.

## R12 Kein expliziter Operator-Flow fuer Default-Reapply
- Risiko: Ohne dedizierte Settings-Aktion bleibt Wiederherstellung globaler Defaults in der laufenden Session intransparent.
- Impact: Mittel bis hoch, Bedienfehler und Zeitverlust unter Live-Druck.
- Gegenmassnahme: Settings-Button `Defaults laden & anwenden` mit sofortiger Laufzeitwirkung und klarer Rueckmeldung.

## R13 Mobile Top-Cluster ueberdecken Scroll-Content
- Risiko: Trigger-/Running-Cluster verdecken im mobilen Scrollflow wichtige Dashboard-Inhalte.
- Impact: Hoch, reduzierte Bedienbarkeit und Fehlaktionen.
- Gegenmassnahme: Mobile-spezifischer Top-Control-Flow im normalen Dokumentlayout mit verpflichtendem Content-Offset und Overlap-Regressionstest.

## R14 Mobile-Fix erzeugt Desktop-Regression
- Risiko: CSS-/Layout-Aenderungen fuer Mobile veraendern versehentlich Desktop-Verhalten.
- Impact: Mittel, etablierte Desktop-Workflows verschlechtern sich.
- Gegenmassnahme: klare Mobile-Scoped Breakpoints, Desktop-Paritaetscheck als Pflichtabnahme.

## R15 Mobile-Cluster ueberdeckt Board-Projektionsflaeche
- Risiko: Oberes Mobile-Cluster liegt beim Scrollen ueber der Board-Flaeche und blockiert Sicht/Interaktion.
- Impact: Hoch, Projektionsflaeche ist nicht stabil bedienbar.
- Gegenmassnahme: Non-Overlay-Containment + Content-Offset + Pointer-Interaktionsguard auf Mobile; Pflichttest fuer Sichtbarkeit und Bedienbarkeit der Board-Flaeche.

## R16 Dashboard-Button verschwindet in Settings
- Risiko: View-Navigation driftet im UI-State; Rueckweg von `Settings` nach `Dashboard` faellt zeitweise weg.
- Impact: Hoch, Operator geraet in Navigations-Dead-End.
- Gegenmassnahme: persistente, view-unabhaengige Navigation mit Runtime-Guard und Regressionstest fuer Scroll/Orientation/Resize/View-Switch.

## R17 Mobile Top-Buttons bleiben faelschlich sticky/fixed
- Risiko: Trotz Hotfix bleiben `Dashboard`/`Settings` auf Mobile fixiert und ueberdecken weiter Teile des Workflows.
- Impact: Hoch, Feedback-Anforderung wird verfehlt und Board-Sichtbarkeit leidet.
- Gegenmassnahme: sticky/fixed auf Mobile explizit entfernen, Scroll-Start-Sichtbarkeit separat absichern, CSS-Regressionstest fuer relevante Breakpoints.

## R18 Trigger-Modus erzeugt weiterhin Board-Overlay
- Risiko: Control-Cluster (`Triggern`/`Running managen`/`Raum starten`) driftet bei Scroll/Orientation/View-Switch zurueck in ueberlagernde Positionen.
- Impact: Hoch, Board-Interaktion ist in Live-Situationen blockiert.
- Gegenmassnahme: No-Overlay-Layout-Regel als harter Mobile-Guard, inklusive Laufzeit-Checks fuer Scroll, Orientation-Wechsel und View-Switch.

## R19 Non-Sticky-Navigation wird im langen Scrollpfad zu schwer erreichbar
- Risiko: Durch Entfernen von Sticky-Verhalten steigt Scrollaufwand fuer `Dashboard`/`Settings`-Wechsel.
- Impact: Mittel, langsamere Bedienung in hektischen Runden.
- Gegenmassnahme: kompakter oberer Steuerblock, klare Top-Anker-Struktur und Verifikation der Wechselzeit im mobilen Spieltischtest.

## R20 Externe Zonen-JSON sind unvollstaendig oder fehlerhaft
- Risiko: Missing/malformed/partial Zonen-Dateien fuehren zu Rendering-Fehlern oder inkonsistenten Klickflaechen.
- Impact: Hoch, Raum-Trigger und Session-Start werden unzuverlaessig.
- Gegenmassnahme: verpflichtender Validator mit klarer Fehlerklassifikation, deterministischem Fallback und Negativtests fuer alle Fehlerklassen.

## R21 Preview-Staging und Live-Commit laufen auseinander
- Risiko: Preview/Kombi-Zustand unterscheidet sich vom tatsaechlich gesendeten Live-Stand; Operator verliert Vertrauenswuerdigkeit der Vorschau.
- Impact: Hoch, falsche Live-Ausgabe unter Spielbetrieb.
- Gegenmassnahme: einheitliches Preview-Live-Datenmodell, expliziter Commit-Pfad und konsistente Statusanzeige (`preview`, `live`, `last-send`).

## R22 Rollback ist nicht idempotent oder rueckgaengig unvollstaendig
- Risiko: Undo/Rollback stellt den letzten Live-Stand nicht sauber wieder her oder erzeugt Seiteneffekte bei Mehrfachausfuehrung.
- Impact: Hoch, Safety-Pfad fuer Live-Betrieb fehlt.
- Gegenmassnahme: atomarer Send-Snapshot mit eindeutigem `last-send`-Token, idempotente Rollback-Operation und API/UI-Smoketests fuer Wiederholaufrufe.
