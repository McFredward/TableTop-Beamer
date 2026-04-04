# Phase 4 Risks

## R1 Verdeckte Funktionsregression durch breite Dateiumbauten
- Risiko: Beim Aufteilen von `src/app.js` gehen implizite Seiteneffekte verloren.
- Impact: Kritisch, Kernflows brechen trotz erfolgreichem Build.
- Gegenmassnahme: atomare Extraktion + Pflicht-Smoke nach jedem Task.

## R2 Zyklische Abhaengigkeiten zwischen neuen Modulen
- Risiko: unklare Modulgrenzen erzeugen Import-Zyklen und erschweren Debugging.
- Impact: Hoch, Wartbarkeit sinkt trotz Refactor.
- Gegenmassnahme: feste Layer-Regeln + Facade-Pattern an Boundarys.

## R3 State-Drift waehrend Uebergang auf neue APIs
- Risiko: alter Direktzugriff auf globalen State bleibt teilweise aktiv.
- Impact: Hoch, inkonsistentes Runtime-Verhalten.
- Gegenmassnahme: zentrale State-API, gezielte Suche nach Direktmutationen, Gate nach P4-T4.

## R4 Save/API Regressions durch Schichtentrennung
- Risiko: Resolver- oder Preflight-Details veraendern sich unbemerkt.
- Impact: Hoch, Save im Realbetrieb instabil.
- Gegenmassnahme: Endpoint-/Statusklassen-Regression mit echten Positiv/Negativfaellen.

## R5 GIF-Fallback-Paritaet verliert sich bei Modularisierung
- Risiko: native und fallback Pfade driften auseinander.
- Impact: Kritisch, Browserabhaengige Standbild-/Timing-Fehler.
- Gegenmassnahme: gemeinsame Scheduler-Contracts + Browser-Matrix-Gate.

## R6 Clipping-Leaks nach Render-Aufteilung
- Risiko: raumbezogene Clip-Guards werden in Teilrenderern inkonsistent angewandt.
- Impact: Hoch, sichtbare Leaks ausserhalb Zielraum.
- Gegenmassnahme: zentrale Clipping-Utilities + Negativtests pro Renderpfad.

## R7 Mobile Input-Regression (Pan/Edit/Touch)
- Risiko: Entkopplung des Input-Wirings aendert Guard-Reihenfolgen.
- Impact: Hoch, Polygon-Edit/Pan-Kollisionen auf Touch.
- Gegenmassnahme: Roundtrip-Tests fuer Space+Drag, Pointer-Up/Blur Cleanup, Orientation-Wechsel.

## R8 Scope-Creep waehrend Refactor
- Risiko: nebenbei neue Features/UX-Aenderungen werden eingemischt.
- Impact: Mittel bis hoch, Zeitplan und Risiko steigen.
- Gegenmassnahme: Feature-Freeze fuer Phase 4, nur Wartbarkeitsarbeit mit Verhaltensparitaet.

## R9 Unklare Verantwortlichkeit nach der Zerlegung
- Risiko: neue Struktur existiert, aber Ownership/Erweiterungspunkte bleiben unklar.
- Impact: Mittel, Folgearbeit bleibt langsam.
- Gegenmassnahme: Abschlussdoku mit Modulkarte und Verantwortungsgrenzen.

## R10 Datenverlust bei Migration auf neues Room-JSON-Schema
- Risiko: Legacy-Profile verlieren bei Auto-Migration Raumdaten (Name/Polygon/IDs).
- Impact: Kritisch, bestehende Spielstand-Konfiguration unbrauchbar.
- Gegenmassnahme: versionierter Migrationspfad mit Roundtrip-Tests und Verlustfreiheits-Checks.

## R11 Inkonsistente Referenzen nach Raum-Loeschung
- Risiko: Running-Instanzen, Selection-State oder Profile referenzieren geloeschte Raum-IDs.
- Impact: Hoch, Runtime-Fehler und Edit/Stop-Defekte.
- Gegenmassnahme: Loesch-Guard mit Cascade-Strategie (Selection reset, Running cleanup, Persistenz-Update).

## R12 Ungueltige freie Polygone destabilisieren Render/Input
- Risiko: Selbstschnitt, zu wenige Punkte oder degenerierte Flaechen erzeugen Clipping-/Hitarea-Fehler.
- Impact: Hoch, sichtbare Artefakte und unzuverlaessige Interaktion.
- Gegenmassnahme: zentrale Polygon-Validierung (Mindestpunkte, Flaechen-/BBox-Checks, Normalisierung) vor Save/Render.

## R13 Namens-/ID-Kollisionen im generalisierten Raummodell
- Risiko: neue Raeume kollidieren mit bestehenden IDs oder fuehren zu mehrdeutigen Anzeigenamen.
- Impact: Mittel bis hoch, falsche Zuordnung in UI/Runtime.
- Gegenmassnahme: stabile ID-Generierung, Name-Normalisierung und eindeutige Label-Strategie in UI-Layern.

## R14 Desktop-Bedienverlust durch wachsende Running-Liste
- Risiko: viele aktive Instanzen vergroessern die Running-Liste unkontrolliert und ueberdecken/verdraengen Trigger- und Management-Controls.
- Impact: Kritisch, Operator kann zentrale Buttons nicht mehr erreichen.
- Gegenmassnahme: harte Containment-Regeln (max Hoehe + eigener Scrollbereich oder layout-separiert) und Pflichttest fuer Klickbarkeit aller Controls unter Last.

## R15 Nebenwirkungen beim Entfernen von Preview-Staging
- Risiko: Decommission von Preview-UI/State/Flows entfernt versehentlich benoetigte Runtime-Pfade (Trigger/Edit/Stop/Save).
- Impact: Hoch bis kritisch, Kernfunktionen regressieren trotz erfolgreichem Build.
- Gegenmassnahme: klare Delete-Liste pro Modul, Grep-basierte Restreferenzpruefung und Fokus-Regression fuer Kernflows ohne Preview.

## R16 Handle-Size-Skalierung entkoppelt Visual und Hitarea
- Risiko: einstellbare Vertex-Handle-Groesse aendert nur die Anzeige, nicht aber die echte Hitflaeche (oder umgekehrt).
- Impact: Hoch, Praezisionsarbeit bei hohem Zoom wird unzuverlaessig.
- Gegenmassnahme: einheitlicher Radius-Contract fuer Render + Hit-Test, inkl. Zoom-Szenario-Regressionscheck.

## R17 Random-Flicker-Rework erzeugt unkontrollierte Last oder Stilbruch
- Risiko: unregelmaessiges `lichtflackern` wird zu hektisch, repetitiv oder performancekritisch und verliert den gewuenschten kaputten Horror-Charakter.
- Impact: Mittel bis hoch, Immersion sinkt oder Runtime wird instabil.
- Gegenmassnahme: deterministisch begrenzte Random-Parameter (Amplitude/Frequenz/Jitter), Fokus-Soak fuer FPS-Stabilitaet und visuelle Review.

## R18 Room-Flaechen-Drag kollidiert mit Vertex-Edit-Interaktionen
- Risiko: LMB-Flaechen-Drag verschluckt Vertex-Select/Insert/Delete oder startet unbeabsichtigte Room-Verschiebungen.
- Impact: Kritisch, zentraler Polygon-Editor-Flow wird unzuverlaessig.
- Gegenmassnahme: klare Prioritaetsregeln fuer Pointer-Intent (Vertex zuerst, Flaeche nur ausserhalb Handles/Kanten), plus Regression fuer gemischte Drag-Sequenzen.

## R19 Handle-Groessen-Paritaet bricht zwischen Room- und Ship-Editor
- Risiko: gemeinsame Handle-Steuerung wirkt nur teilweise; Ship-Vertices behalten abweichende Radius-/Hitarea-Logik.
- Impact: Hoch, inkonsistente Editierbarkeit und Fehlklicks bei Wechsel zwischen Editoren.
- Gegenmassnahme: ein zentraler Handle-Scale-Contract fuer alle Editorpfade + Cross-Editor-Regression (Room vs Ship, Zoom low/high).

## R20 Flicker-Cleanup fuehrt zu Stilbruch oder Restartefakten
- Risiko: Entfernen horizontaler Weissstreifen macht `lichtflackern` zu ruhig oder laesst weiterhin sichtbare Glitch-Baender stehen.
- Impact: Mittel bis hoch, Immersion sinkt oder Pflichtfeedback bleibt unerfuellt.
- Gegenmassnahme: visuelle Abnahme mit Referenzshots/Video, Parametergrenzen fuer Noise-Layer und Negativtests auf horizontale Banding-Muster.

## R21 10%-Speed-Floor verursacht Timing-/Validation-Drift
- Risiko: UI erlaubt 10%, Runtime oder Persistenz clampen weiterhin hoeher; Edit/Reload schreibt inkonsistente Werte.
- Impact: Hoch, Operator bekommt andere Geschwindigkeit als konfiguriert.
- Gegenmassnahme: einheitlicher Clamp-/Normalizer-Contract (UI, Runtime, Save/Load) plus Roundtrip-Tests fuer Grenzwerte.

## R22 Sound-Mapping bleibt ausserhalb von Persistenz und Global Defaults
- Risiko: Sound-Auswahl wird zwar in UI geaendert, aber nicht in Profil/Defaults serialisiert oder beim Laden verworfen.
- Impact: Kritisch, Reload/geraeteuebergreifender Betrieb verliert Audio-Konfiguration.
- Gegenmassnahme: Schema-Erweiterung mit Migration/Fallback, explizite Save/Load-Tests fuer Profile + Global Defaults und Snapshot-Vergleich vor/nach Reload.

## R23 Persistenz-Timing-Luecke bei Audio-/Mapping-UI-Aenderungen
- Risiko: UI-Mutation erfolgt vor Storage-Write oder ohne sofortigen Write; Direkt-Reload kann alten Zustand laden.
- Impact: Kritisch, Operator erlebt nicht-deterministisches Verhalten direkt nach Aenderung.
- Gegenmassnahme: Persist-on-change in relevanten Handlern (audio enable/volume, sound mapping), plus Kurzregression fuer Change->Reload inklusive Fehlpfad-Hinweis bei LocalStorage-Write-Fehler.
