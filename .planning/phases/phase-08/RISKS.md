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

## R19 `Coded/Space` faellt auf schwarzen Frame/Fallback
- Risiko: coded animation key wird nicht korrekt auf Renderpfad/Asset gemappt und liefert nur Schwarzbild statt erwarteter Animation.
- Impact: Kritisch.
- Gegenmassnahme: Mapping-/Resolverpfad fuer coded assets auf Vorregressionsverhalten rueckfuehren und mit Restore-Regressionstest absichern.

## R20 `Outside Sandstorm` restartet permanent (Flicker/Rewind-Loop)
- Risiko: mp4-Playback wird durch Lifecycle-/Timeline-Reset laufend neu gestartet und wirkt als instabiler Restartloop.
- Impact: Kritisch.
- Gegenmassnahme: kontinuierlichen Playback-Pfad ohne unerwuenschte Timeline-Resets erzwingen; explizite Stability-Regression (Start/Edit/Stop/Clear/Reload).

## R21 Outside-Editor Inputs sind nicht stabil editierbar
- Risiko: Boomerang-Checkbox und Asset-Type-Dropdown verlieren User-Input durch stale re-apply oder Model/UI race.
- Impact: Kritisch.
- Gegenmassnahme: verbindliche Input-Arbitration zwischen Draft und persisted State, plus deterministische UI-State-Ownership im Editor.

## R22 Teilweise Uebernahme von Outside-Aenderungen ohne atomaren Commit
- Risiko: Type/Resource/Optionen werden bei Zwischen-Events inkonsistent einzeln uebernommen und fuehren zu kaputten Mischzustaenden.
- Impact: Hoch.
- Gegenmassnahme: expliziter `Apply changes` Commit-Pfad, der alle Outside-Editfelder atomar in einem Schritt uebernimmt.

## R23 Hardening-Welle startet trotz offener P0-Outside-Regressionen
- Risiko: Plan 8-2 beginnt zu frueh; bekannte Outside-Regressionen gelangen in Hardening/Abnahme und erzeugen Rework.
- Impact: Hoch.
- Gegenmassnahme: Gate-Regel: kein Plan 8-2 vor PASS von Plan 8-HF3 inkl. Artefakt-Sync.

## R24 `Coded/Space` faellt erneut auf Black-Screen zurueck
- Risiko: Resolver-/Renderer-Pfad driftet erneut und mapped coded outside assets nicht auf den funktionierenden Star-Space Laufzeitpfad.
- Impact: Kritisch.
- Gegenmassnahme: Restore auf den zuletzt verifizierten coded runtime key-path plus dedizierter Regressionstest fuer Reload/Restart.

## R25 Asset-Picker mischt Typen und bietet ungueltige Quellen
- Risiko: Picker zeigt bei `assetType` falsche Kandidaten (z. B. GIFs in MP4-Modus), was zu no-op Playback, falschen Saves oder UX-Drift fuehrt.
- Impact: Kritisch.
- Gegenmassnahme: strikte typspezifische Filterung (`coded` keys, `mp4` nur `.mp4`, `gif` nur `.gif` aus `resources`) mit deterministischem Type-Switch-Refresh.

## R26 Boomerang-Playback erzeugt sichtbaren Richtungswechsel-Flicker
- Risiko: Forward/Reverse-Uebergang resetet Video sichtbar (on/off, jump, restart), wodurch der Boomerang-Effekt instabil wirkt.
- Impact: Kritisch.
- Gegenmassnahme: explizite Timeline-State-Machine (forward->reverse->forward) mit nahtlosen Phasenwechseln und Non-Flicker-Regression.

## R27 Hardening-Welle startet trotz offenem HF4-Rueckfall
- Risiko: Plan 8-2 startet nach HF3, obwohl neue P0-Rueckfaelle (`Coded/Space`, Picker-Filter, Boomerang-Flicker) noch offen sind.
- Impact: Hoch.
- Gegenmassnahme: Gate-Regel: kein Plan 8-2 vor PASS von Plan 8-HF4 inkl. Artefakt-Sync.

## R28 Sandstorm-Reverse-Lifecycle bleibt flickernd trotz teilweisem Boomerang-Fix
- Risiko: Forward-Playback bleibt stabil, aber der Reverse-Abschnitt zeigt weiterhin starkes Flackern durch fehlerhafte Richtungswechsel-/Timeline-Steuerung.
- Impact: Kritisch.
- Gegenmassnahme: dedizierte Root-Cause-Analyse fuer den Reverse-Lifecycle (Switch bei Video-Ende, Reverse-Framefortschritt, Phase-Transition) und gezielter Lifecycle-Fix.

## R29 HF5-Fix regressiert normalen mp4-Playback-Pfad ohne Boomerang
- Risiko: Anpassungen am Boomerang-State-Machine-Pfad beeinflussen unbeabsichtigt den Standard-Vorwaerts-Loop und erzeugen neue mp4-Regressionen.
- Impact: Kritisch.
- Gegenmassnahme: explizite Non-Boomerang-Regressionstests und strikte Pfadtrennung zwischen boomerang/non-boomerang lifecycle.

## R30 Apply-/Persistenzpfad driftet nach Reverse-Hotfix
- Risiko: Boomerang-/Asset-Einstellungen werden durch HF5 nur teilweise oder inkonsistent ueber `Apply changes`, Save/Reload/Restart uebernommen.
- Impact: Hoch.
- Gegenmassnahme: verpflichtende Apply+Persistenz-Matrix fuer `boomerang`, `assetType`, `assetRef` mit Reload/Restart-Nachweis.

## R31 Evidence-Luecke verdeckt verbleibende Reverse-Flackerfaelle
- Risiko: Fix wirkt lokal, aber ohne reproduzierbare Artefakte bleiben Randfaelle (mehrere Zyklen, Start/Stop/Clear/Reload) unentdeckt.
- Impact: Hoch.
- Gegenmassnahme: verpflichtende Evidence-Artefakte (Root-Cause-Protokoll, Playback-Matrix, Non-Regression-Report) als Gate fuer Wellenabschluss.

## R32 Hardening-Welle startet trotz offenem HF5-Blocker
- Risiko: Plan 8-2 startet, obwohl Reverse-Flicker/Non-Regression/Persistenz fuer Sandstorm-Boomerang nicht final verifiziert sind.
- Impact: Hoch.
- Gegenmassnahme: Gate-Regel: kein Plan 8-2 vor PASS von Plan 8-HF5 inkl. Artefakt-Sync.

## R33 `/output/final` rendert im Fullscreen nur Top-Left-Teilausschnitt
- Risiko: Stage-/Canvas-Dimensionen bleiben auf alter/generischer Groesse; im Browser-Fullscreen wird nur ein kleiner Bereich oben links gezeigt.
- Impact: Kritisch.
- Gegenmassnahme: verbindliche Fullscreen-Fit-Recompute-Pipeline (Viewport + Backbuffer + DPR) fuer `/output/final`.

## R34 Resize-/Orientation-/Fullscreen-/DPR-Events triggern keinen konsistenten Reflow
- Risiko: Aufloesungs- oder Moduswechsel werden nur teilweise verarbeitet; Offset/Letterbox/Unschraefe und inkonsistente Koordinaten entstehen.
- Impact: Kritisch.
- Gegenmassnahme: zentraler, deterministischer Recompute-Handler fuer `resize`, `orientationchange`, `fullscreenchange` und DPR-Aenderungen.

## R35 Fullscreen-Fix bricht Rendering-, Koordinaten- oder Clipping-Semantik
- Risiko: Korrektur des Viewport-Fits verschiebt Masken/Koordinaten und erzeugt inside/outside bzw. clip-Regressionsfehler.
- Impact: Kritisch.
- Gegenmassnahme: verpflichtende Non-Regression-Matrix fuer Render/Coords/Clip unter dynamischem Reflow.

## R36 Hardening-Welle startet trotz offenem HF6-P0-Blocker
- Risiko: Plan 8-2 startet, obwohl `/output/final` Fullscreen-Fit auf Real-Displays noch nicht stabil ist.
- Impact: Hoch.
- Gegenmassnahme: Gate-Regel: kein Plan 8-2 vor PASS von Plan 8-HF6 inkl. Artefakt-Sync.

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

## Risk Review for Plan 8-HF3 (planned)
- 2026-03-27: Neues verpflichtendes P0-Betriebsfeedback priorisiert R19-R22 als unmittelbare Hotfix-Blocker im Outside-Editor/Playback.
- 2026-03-27: R23 setzt den Gate-Guard, dass Plan 8-2 erst nach HF3-PASS und Vollsync startet.

## Risk Review after Plan 8-HF3
- 2026-03-27: R19 ist mitigiert; coded outside key mapping ist wieder auf den erwarteten Runtime-Pfad normalisiert (kein Black no-op).
- 2026-03-27: R20 ist mitigiert; Sandstorm-MP4 laeuft im kontinuierlichen Forward-Playback ohne frameweises Restart-Seeking.
- 2026-03-27: R21 ist mitigiert; Boomerang-/Asset-Type-Editing bleibt im Draft stabil bis explizitem Apply.
- 2026-03-27: R22 ist mitigiert; `Apply changes` uebernimmt Outside-Type/Resource/Optionen atomar als einzelnes Update.
- 2026-03-27: R23 Gate ist erfuellt; HF3 ist PASS verifiziert (`8-HF3-VERIFICATION.md`).

## Risk Review for Plan 8-HF4 (planned)
- 2026-03-27: Neues verpflichtendes P0-Feedback priorisiert R24-R26 als unmittelbare Hotfix-Blocker (`Coded/Space` Rueckfall, fehlende type-spezifische Pickerfilter, Boomerang-Flicker).
- 2026-03-27: R27 setzt den Gate-Guard, dass Plan 8-2 erst nach HF4-PASS und Vollsync startet.

## Risk Review after Plan 8-HF4
- 2026-03-27: R24 ist mitigiert; coded resolver/picker normalisieren wieder deterministisch auf den funktionsfaehigen outside-space Rendererpfad.
- 2026-03-27: R25 ist mitigiert; Asset-Picker filtert strikt pro Typ (`coded` keys, `mp4` `.mp4`, `gif` `.gif`) ohne stale Drift bei Type-Switch.
- 2026-03-27: R26 ist mitigiert; boomerang mp4 lifecycle laeuft als full-cycle state machine (forward->reverse->repeat) ohne sichtbaren restart flicker.
- 2026-03-27: R27 Gate ist erfuellt; HF4 ist PASS verifiziert (`8-HF4-VERIFICATION.md`).

## Risk Review for Plan 8-HF5 (planned)
- 2026-03-27: Neues verpflichtendes P0-Betriebsfeedback priorisiert R28 als unmittelbaren Hotfix-Blocker (starkes Sandstorm-Flicker im Reverse-Abschnitt).
- 2026-03-27: R29 und R30 sind verpflichtende Guard-Risiken fuer HF5, damit Boomerang-Fix den normalen mp4-Pfad und Apply/Persistenz nicht regressiert.
- 2026-03-27: R31 fordert reproduzierbare Evidence-Artefakte als Wellenabschluss-Pflicht.
- 2026-03-27: R32 setzt den Gate-Guard, dass Plan 8-2 erst nach HF5-PASS und Vollsync startet.

## Risk Review after Plan 8-HF5
- 2026-03-27: R28 ist mitigiert; Reverse-Flicker-Root-Cause wurde reproduzierbar isoliert und der mp4-Boomerang-Reverse-Lifecycle mit seek-arbitration stabilisiert.
- 2026-03-27: R29 ist mitigiert; normaler mp4-Pfad ohne Boomerang bleibt regressionsfrei (`P8-T49-MP4-NON-BOOMERANG-REGRESSION.md`).
- 2026-03-27: R30 ist mitigiert; `Apply changes` + Save/Reload/Restart fuer `boomerang`/`assetType`/`assetRef` bleiben deterministisch (`P8-T50-APPLY-PERSISTENCE-REGRESSION.md`).
- 2026-03-27: R31 ist mitigiert; Evidence-Bundle fuer Root-Cause/Fix/Non-Regression ist vollstaendig (`P8-T47-REVERSE-ROOT-CAUSE.md`, `P8-T51-HF5-REGRESSION.md`).
- 2026-03-27: R32 Gate ist erfuellt; Plan 8-HF5 ist PASS verifiziert (`8-HF5-VERIFICATION.md`) (durch spaeteres neues P0-Feedback wurde Plan 8-2 erneut blockiert).

## Risk Review for Plan 8-HF6 (planned)
- 2026-03-29: Neues verpflichtendes P0-Problem priorisiert R33 als unmittelbaren Hotfix-Blocker (`/output/final` Fullscreen zeigt nur Top-Left-Teilausschnitt).
- 2026-03-29: R34 und R35 sind verpflichtende Guard-Risiken fuer eventvollstaendige Recompute-Pfade und Render/Coords/Clip-Non-Regression.
- 2026-03-29: R36 setzt den Gate-Guard, dass Plan 8-2 erst nach HF6-PASS und Vollsync startet.

## Risk Review after Plan 8-HF6
- 2026-03-29: R33 ist mitigiert; Fullscreen-Missfit-Root-Cause ist reproduzierbar dokumentiert und der Fit-Pfad stabilisiert (`P8-T53-FINAL-OUTPUT-FULLSCREEN-ROOT-CAUSE.md`).
- 2026-03-29: R34 ist mitigiert; Stage/Canvas-Recompute nutzt einen einheitlichen Lifecycle fuer resize/orientation/fullscreen/DPR inkl. RAF-Coalescing.
- 2026-03-29: R35 ist mitigiert; Rendering-/Coords-/Clip-Non-Regression unter dynamischem Reflow ist PASS (`P8-T57-FINAL-OUTPUT-REFLOW-REGRESSION.md`).
- 2026-03-29: R36 Gate ist erfuellt; Plan 8-HF6 ist PASS verifiziert (`8-HF6-VERIFICATION.md`).
