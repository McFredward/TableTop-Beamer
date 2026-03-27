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

## R11 Room-Klick-Selection wird weiter von Play-Area-Input ueberlagert
- Risiko: Room bleibt trotz Klick nicht aktiv selektiert; Editing/Keyboard-Aktionen wirken auf falschen Kontext oder gar nicht.
- Impact: Kritisch.
- Gegenmassnahme: Play-Area-Click-Selection komplett entfernen und Room-Klick als einzige Selection-Quelle im Board-Input priorisieren.

## R12 Image-Import bleibt ohne sichtbaren Success-Apply
- Risiko: Upload ist serverseitig erfolgreich, aber UI aktualisiert Board-Dropdown/Aktivboard nicht deterministisch.
- Impact: Kritisch.
- Gegenmassnahme: transaktionaler Importabschluss mit direktem Catalog-Refresh + sofortigem Active-Board-Switch im selben Success-Pfad.

## R13 Empty-Start bei Bildimport triggert unbeabsichtigte Default-/Fallback-Polygone
- Risiko: Importierter Board-Kontext ohne Polygone wird durch implizite Defaults ueberschrieben oder erzeugt Editor/Runtime-Fehler.
- Impact: Hoch.
- Gegenmassnahme: expliziter Empty-Start-Guard ohne Zwangsdefaults; manueller Play-Area/Room-Create bleibt der erste gueltige Operator-Schritt.

## R14 Outside-Sandstorm verletzt Audio-Stumm-Regel
- Risiko: `Outside Sandstorm` erbt unbeabsichtigt globale Audio-Pfade und spielt trotz Vorgabe mit Ton.
- Impact: Kritisch.
- Gegenmassnahme: harter mute-Guard auf Animationsebene plus Regressionstest fuer Start/Edit/Reload.

## R15 Boomerang-Playback erzeugt Lifecycle-Drift
- Risiko: Rueckwaertsphase des Boomerang-Modus erzeugt Desync/Freeze oder laesst Stop/Clear nicht deterministisch greifen.
- Impact: Kritisch.
- Gegenmassnahme: expliziter Playback-State-Machine-Pfad mit dedizierten Tests fuer Start/Stop/Clear/Join-Reconnect.

## R16 Settings-Refactor mischt Outside-Controls weiter in Play-Area-Editor
- Risiko: doppelte oder verstreute Controls erzeugen inkonsistente Ownership und Fehlbedienung.
- Impact: Hoch.
- Gegenmassnahme: klare UI-Ownership (`Outside Animations`) mit Negativtest, dass Play-Area-Editor keine Outside-Controls mehr rendert.

## R17 Asset-Mapping akzeptiert ungueltige Quellen/Typen
- Risiko: fehlerhafte `assetRef`/`assetType` fuehren zu Laufzeitfehlern oder no-op Rendering.
- Impact: Hoch.
- Gegenmassnahme: strikte Typ-/Pfadvalidierung, Resource-Picker als bevorzugter Auswahlpfad, klare Fallback-Fehlermeldungen.

## R18 Persistenz fuer Outside-Animationsdefinitionen ist nicht migrationsstabil
- Risiko: bestehende Defaults/Profile verlieren Outside-Settings oder erzeugen Drift zwischen Legacy und neuem Modell.
- Impact: Kritisch.
- Gegenmassnahme: idempotente Migration, Schema-Normalizer, Save/Reload/Restart-Matrix fuer Definitionen + Settings.

## Risk Review after Plan 8-1
- 2026-03-27: R1-R4, R6-R8 wurden in 8-1 implementierungsseitig mitigiert (Union-Maskenpfad, Migration, Delete-Guard, Upload-Validierung, UX-Hinweise).
- Verbleibende Beobachtung: R5 (Performance bei vielen Areas/Vertices) bleibt als Hardening-Thema fuer Plan 8-2.

## Risk Review for Plan 8-HF1 (planned)
- 2026-03-27: Neues P0-Betriebsfeedback priorisiert R11 und R12 als Hotfix-Blocker vor Plan 8-2.
- 2026-03-27: R13 wird als begleitender Guard in derselben Welle abgesichert, damit Bildimport ohne Start-Polygone stabil bleibt.

## Risk Review after Plan 8-HF1
- 2026-03-27: R11 ist mitigiert; Play-Area-Board-Click-Selektion ist entfernt, Room-Klick bleibt kanonisch selektionsfuehrend.
- 2026-03-27: R12 ist mitigiert; Import-Success aktualisiert Katalog/Dropdown deterministisch im selben Flow inkl. sofortiger Aktivselektion.
- 2026-03-27: R13 ist mitigiert; leere importierte Bildboards bleiben als gueltiger manueller Startzustand stabil (inkl. Evidence-Guard).

## Risk Review for Plan 8-HF2 (planned)
- 2026-03-27: Neues verpflichtendes Mars-Featurepaket priorisiert R14-R18 als P0-Welle vor Plan 8-2.
- 2026-03-27: Fokus liegt auf stummem Sandstorm-Default, boomerang-stabilem Lifecycle, UI-Ownership-Refactor, asset-validiertem Mapping und persistenzsicherer Migration.

## Risk Review after Plan 8-HF2
- 2026-03-27: R14 ist mitigiert; Outside-Sandstorm ist als mp4-Definition eingebunden und Outside-Audio wird fuer `outside-space` hart unterdrueckt.
- 2026-03-27: R15 ist mitigiert; Boomerang-Timeline laeuft per Definition optional vorwaerts/rueckwaerts mit Start/Stop/Clear-kompatiblem Runtime-Anker.
- 2026-03-27: R16 ist mitigiert; Outside-Controls sind in eigener Sektion `Outside Animations`, der Play-Area-Editor enthaelt keine Outside-Konfiguration mehr.
- 2026-03-27: R17 ist mitigiert; Asset-Typ/Ref sind explizit editierbar, Resource-Picker bezieht gueltige Dateien aus `/api/resources`.
- 2026-03-27: R18 ist mitigiert; Legacy-Aliase fuer Outside-Definitionen werden normalisiert und persistieren kanonisch ueber Profile/Defaults.
