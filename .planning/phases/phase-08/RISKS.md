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

## R37 Boomerang-Reste bleiben aktiv in UI/Runtime/Persistenz
- Risiko: Teilpfade behalten Boomerang-Controls oder Reverse-Lifecycle, wodurch unerwartete Playback-Semantik und Bedieninkonsistenz bestehen bleiben.
- Impact: Kritisch.
- Gegenmassnahme: vollstaendige Decommission ueber UI, Runtime und Persistenzpfad mit Negativtests auf nicht mehr vorhandene Boomerang-Aktivierung.

## R38 Persistenzbereinigung bricht Legacy-Ladekompatibilitaet
- Risiko: alte Payloads mit boomerang-bezogenen Feldern lassen sich nicht mehr laden oder fuehren zu Fehlern im Normalizer.
- Impact: Hoch.
- Gegenmassnahme: Legacy-Felder tolerant lesen (no-op), kanonisch ohne Boomerang speichern, dedizierte Legacy-Load-Regression.

## R39 Inside-Editor-Paritaet driftet gegen Outside-Editor
- Risiko: Inside-Animationssektion nutzt abweichende Bedienlogik ohne Dropdown/Create/Apply-Paritaet; Operator-Flow wird inkonsistent.
- Impact: Hoch.
- Gegenmassnahme: gemeinsame Editor-Patterns/State-Ownership fuer Inside/Outside und parity-basierte Akzeptanzmatrix.

## R40 Inside-Asset-Picker filtert Typen nicht strikt
- Risiko: bei `assetType` werden ungueltige Quellen angeboten (z. B. mp4 im gif-Modus), was no-op Rendering oder fehlerhafte Persistenz erzeugt.
- Impact: Kritisch.
- Gegenmassnahme: strikte typspezifische Filterung (`coded` keys, `mp4` `.mp4`, `gif` `.gif` aus `resources`) plus deterministic type-switch refresh.

## R41 Zielbild verfehlt: neue Animationen bleiben codegebunden
- Risiko: neue Inside/Outside-Animationen erfordern weiterhin Codeaenderungen statt rein definitionsgetriebener UI-/Persistenzintegration.
- Impact: Hoch.
- Gegenmassnahme: kanonisches definitionsgetriebenes Modell fuer Inside/Outside mit Create-Flow und persistenter Registry statt harter Einzelverdrahtung.

## R42 Hardening-Welle startet trotz offenem HF7-P0-Blocker
- Risiko: Plan 8-2 startet, obwohl Boomerang-Decommission und Inside-Editor-Paritaet noch offen sind.
- Impact: Hoch.
- Gegenmassnahme: Gate-Regel: kein Plan 8-2 vor PASS von Plan 8-HF7 inkl. Artefakt-Sync.

## R43 Outside-mp4-Playback bleibt regressiert
- Risiko: Outside-Animationen mit `assetType=mp4` bleiben no-op/schwarz, waehrend gif/coded laufen; Outside-Videopfade sind damit produktiv unbrauchbar.
- Impact: Kritisch.
- Gegenmassnahme: reproduzierbare Root-Cause-Isolation fuer den mp4-Lifecycle/Resolver und Restore auf stabilen non-boomerang Playbackpfad inkl. Regressionstest.

## R44 Conditional-Visibility driftet im Outside-Editor
- Risiko: `outside mode`/`outside direction` bleiben in nicht-applicablen Kontexten sichtbar (oder fehlen in gueltigen Kontexten) und erzeugen Fehlbedienung/inkonsistente Persistenz.
- Impact: Hoch.
- Gegenmassnahme: harte Kontext-Regeln fuer Sichtbarkeit (z. B. nur `coded` + `outside-space`) plus Negativtests fuer `gif`/`mp4` und nicht-applicable coded renderer.

## R45 Redundante Asset-Commit-Buttons erzeugen UX-Mehrdeutigkeit
- Risiko: parallele CTAs (`Use selected resource asset` vs `Apply changes`) fuehren zu Teilupdates, Bedienirrtum und inkonsistentem Erwartungsmodell.
- Impact: Mittel bis hoch.
- Gegenmassnahme: Apply-only UX mit einem eindeutigen Commit-CTA; redundante Asset-Buttons entfernen.

## R46 Hardening-Welle startet trotz offenem HF8-P0-Blocker
- Risiko: Plan 8-2 startet, obwohl Outside-mp4-Restore, conditional visibility und Apply-only UX-Cleanup nicht abgeschlossen sind.
- Impact: Hoch.
- Gegenmassnahme: Gate-Regel: kein Plan 8-2 vor PASS von Plan 8-HF8 inkl. Artefakt-Sync.

## R47 Outside-mp4-Playback bleibt im Lifecycle regressionsanfaellig
- Risiko: mp4 laeuft ggf. beim Erststart, faellt aber bei Stop/Re-Start oder nach Reload auf no-op/Black/Frozen Frame zurueck.
- Impact: Kritisch.
- Gegenmassnahme: Root-Cause-Fix auf gesamten Lifecycle (Start/Stop/Re-Start/Reload/Restart) ausrichten und mit dedizierter Zyklus-Matrix absichern.

## R48 Conditional Controls werden nur disabled statt entfernt
- Risiko: nicht-applicable Controls bleiben sichtbar (disabled) und verletzen die strengere UX-Regel `hide statt disable`.
- Impact: Hoch.
- Gegenmassnahme: strikt bedingtes Rendering mit Unmount-Guard fuer `outside mode`/`outside direction` in nicht-gueltigen Kontexten.

## R49 Visibility-Transitions zeigen stale UI-Reste
- Risiko: bei Type-/Asset-Wechseln bleiben alte Controls kurz sichtbar oder tauchen inkonsistent wieder auf.
- Impact: Hoch.
- Gegenmassnahme: deterministische Sichtbarkeitsberechnung aus aktuellem Draft-Kontext plus Transition-Regressionstests.

## R50 Hardening-Welle startet trotz offenem HF9-P0-Blocker
- Risiko: Plan 8-2 startet, obwohl Outside-mp4-Lifecycle und strict conditional unmounting noch offen sind.
- Impact: Hoch.
- Gegenmassnahme: Gate-Regel: kein Plan 8-2 vor PASS von Plan 8-HF9 inkl. Artefakt-Sync.

## R51 Outside-mp4 bleibt intermittierend unsichtbar trotz Lifecycle-Fix
- Risiko: mp4 wird in Outside-Layer nicht deterministisch sichtbar (hidden/no-op/first-frame-black), insbesondere in Restart-/Reload-Pfaden.
- Impact: Kritisch.
- Gegenmassnahme: reproduzierbare Root-Cause-Isolation fuer Visibility-Lifecycle und deterministischer Renderstart-Guard inkl. mehrzyklischer Runtime-Evidenz.

## R52 MP4-Loop zeigt sichtbaren Replay-Bruch
- Risiko: Loop-Neustart erzeugt Black-Frame, Restart-Gap oder sichtbaren Replay-Sprung/Flicker und wirkt im Betrieb nicht nahtlos.
- Impact: Kritisch.
- Gegenmassnahme: explizite seamless-loop Strategie mit no-black-frame/no-gap Guards und Laufzeitmatrix ueber mehrere Zyklen.

## R53 HF10-Fix regressiert Apply-/Persistenzpfade
- Risiko: Runtime-Fix fuer Sichtbarkeit/Loop bricht `Apply changes`, Save/Reload/Restart oder erzeugt Drift in Animationsdefinitionen.
- Impact: Hoch.
- Gegenmassnahme: dedizierte Non-Regression-Matrix fuer Apply + Persistenz mit unveraendertem atomaren Commitpfad.

## R54 Evidence bleibt auf Initialstart beschraenkt
- Risiko: kurzfristiger PASS beim Erststart verdeckt intermittierende Visibility-/Loop-Ausfaelle unter laengerer Runtime.
- Impact: Hoch.
- Gegenmassnahme: runtime-fokussierte Mehrzyklus-Evidenz fuer Sichtbarkeit und Loop-Kontinuitaet als Pflicht-Gate.

## R55 Hardening-Welle startet trotz offenem HF10-P0-Blocker
- Risiko: Plan 8-2 startet, obwohl Outside-mp4-Visibility und seamless-loop Kontinuitaet im Realbetrieb nicht geschlossen sind.
- Impact: Hoch.
- Gegenmassnahme: Gate-Regel: kein Plan 8-2 vor PASS von Plan 8-HF10 inkl. Artefakt-Sync.

## R56 Room-Animationen bleiben teilweise codegebunden statt definitionsgetrieben
- Risiko: Room-Animationen lassen sich nicht wie outside/effects per create/edit/delete erweitern; neue Eintraege benoetigen weiterhin Codeaenderungen.
- Impact: Kritisch.
- Gegenmassnahme: kanonisches definitionsgetriebenes Room-Animationsmodell mit CRUD-Editor und runtime-seitiger dynamischer Nutzung ohne Einzelverdrahtung.

## R57 Room-Asset-Mapping ist nicht typstreng (`coded`/`mp4`/`gif`)
- Risiko: Room-Animationen verwenden ungueltige Asset-Kombinationen, was no-op Rendering, fehlerhafte Persistenz oder inkonsistente Editierpfade erzeugt.
- Impact: Hoch.
- Gegenmassnahme: typspezifische Picker-/Validator-Regeln fuer Room-Animationen analog Outside/Inside inkl. Persistenz-Non-Regression.

## R58 First-start Defaults werden ohne lokale Daten nicht automatisch angewendet
- Risiko: neue Browser/Geraete starten weiterhin ohne wirksame Defaults und benoetigen manuellen Eingriff, wodurch der Operator-Startflow regressiert.
- Impact: Kritisch.
- Gegenmassnahme: expliziter first-start bootstrap guard (empty-local-state -> server-defaults load+apply) mit deterministic startup evidence.

## R59 `Load and apply defaults` verliert Reset-/Wiederherstellen-Semantik
- Risiko: durch Autoload-Aenderungen wird der bestehende Button semantisch unklar oder funktional eingeschraenkt.
- Impact: Hoch.
- Gegenmassnahme: klare Trennung zwischen automatisch erstem Bootstrap und explizitem spaeteren Reset-Flow inklusive UX- und Regressionstest.

## R60 Hardening-Welle startet trotz offenem HF11-P0-Blocker
- Risiko: Plan 8-2 startet, obwohl all-type editable room animations und first-start default-autoload nicht abgeschlossen sind.
- Impact: Hoch.
- Gegenmassnahme: Gate-Regel: kein Plan 8-2 vor PASS von Plan 8-HF11 inkl. Artefakt-Sync.

## R61 Doppelter Speed-Control-Pfad erzeugt Room-Editor-Drift
- Risiko: dedizierter `GIF Playback speed` plus allgemeiner `Speed` fuehren zu konkurrierenden Werten und inkonsistenter Runtime-/Persistenzsemantik.
- Impact: Hoch.
- Gegenmassnahme: dedizierten GIF-Speed-Control entfernen und einen einzigen `Speed`-Pfad fuer alle Room-Assettypen erzwingen.

## R62 Unified-Speed-Refactor regressiert Room-Assettypen
- Risiko: Vereinheitlichung von `Speed` bricht `coded`/`gif`/`mp4`-Paritaet oder erzeugt type-spezifische no-op/Drift-Pfade.
- Impact: Kritisch.
- Gegenmassnahme: typspezifische Regression-Matrix fuer Room-Animationen mit einheitlichem `Speed` ueber Start/Edit/Save/Reload/Restart.

## R63 Opacity bleibt fuer mp4 unbedienbar
- Risiko: `Opacity` ist fuer `assetType=mp4` weiterhin disabled/hidden und verletzt die geforderte Cross-Type-Paritaet.
- Impact: Kritisch.
- Gegenmassnahme: expliziter UI-Guard auf immer editierbare `Opacity` fuer alle Room-Assettypen inklusive mp4.

## R64 Hardening-Welle startet trotz offenem HF12-P0-Blocker
- Risiko: Plan 8-2 startet, obwohl Unified-Speed und Opacity-Paritaet fuer Room-Animationen nicht abgeschlossen/verifiziert sind.
- Impact: Hoch.
- Gegenmassnahme: Gate-Regel: kein Plan 8-2 vor PASS von Plan 8-HF12 inkl. Artefakt-Sync.

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

## Risk Review for Plan 8-HF7 (planned)
- 2026-03-30: Neues verpflichtendes P0-Feature-/Cleanup-Paket priorisiert R37 als unmittelbaren Blocker (Boomerang muss vollstaendig entfernt werden).
- 2026-03-30: R38 ist verpflichtender Guard fuer rueckwaertskompatibles Legacy-Lesen bei gleichzeitiger Persistenzbereinigung.
- 2026-03-30: R39 und R40 sind verpflichtende Guards fuer Outside-paritaetischen Inside-Editor mit streng typspezifischem Asset-Picker + Apply-Atomicity.
- 2026-03-30: R41 verankert das Zielbild definitionsgetriebener Erweiterbarkeit ohne Codeaenderung pro neuer Animation.
- 2026-03-30: R42 setzt den Gate-Guard, dass Plan 8-2 erst nach HF7-PASS und Vollsync startet.

## Risk Review after Plan 8-HF7
- 2026-03-30: R37 ist mitigiert; Boomerang ist aus Outside-UI und Runtime-Lifecycle entfernt, aktive Playback-Pfade nutzen keine Boomerang-State-Machine mehr.
- 2026-03-30: R38 ist mitigiert; boomerang-bezogene Legacy-Felder bleiben ladbar, werden aber als no-op ignoriert und nicht mehr aktiv persistiert.
- 2026-03-30: R39 und R40 sind mitigiert; `Inside Animations` bietet Dropdown/Create, typspezifischen Asset-Picker (`coded`/`gif`/`mp4`) und atomaren `Apply changes`.
- 2026-03-30: R41 ist mitigiert; Inside-/Outside-Animationseintraege sind definitionsgetrieben erweiterbar, inklusive inside save/load/defaults persistence.
- 2026-03-30: R42 Gate ist erfuellt; Plan 8-HF7 ist PASS verifiziert (`8-HF7-VERIFICATION.md`, `P8-T64-HF7-REGRESSION.md`).

## Risk Review for Plan 8-HF8 (planned)
- 2026-03-30: Neues verpflichtendes P0-Feedback priorisiert R43 als unmittelbaren Hotfix-Blocker (Outside-mp4 spielt nicht mehr).
- 2026-03-30: R44 und R45 sind verpflichtende Guard-Risiken fuer kontextsensitive Outside-Controls und Apply-only UX ohne redundante Commit-CTAs.
- 2026-03-30: R46 setzt den Gate-Guard, dass Plan 8-2 erst nach HF8-PASS und Vollsync startet.

## Risk Review after Plan 8-HF8
- 2026-03-30: R43 ist mitigiert; Outside-mp4 nutzt wieder einen stabilen non-boomerang Forward-Loop-Pfad (`P8-T65-OUTSIDE-MP4-ROOT-CAUSE.md`).
- 2026-03-30: R44 ist mitigiert; `outside mode`/`outside direction` sind strikt kontextsensitiv und fuer `gif`/`mp4` ausgeblendet.
- 2026-03-30: R45 ist mitigiert; redundante `Use selected resource asset`-CTAs sind entfernt, `Apply changes` bleibt der einzige Commitpfad.
- 2026-03-30: R46 Gate ist erfuellt; Plan 8-HF8 ist PASS verifiziert (`8-HF8-VERIFICATION.md`, `P8-T66-MP4-NON-REGRESSION.md`).

## Risk Review for Plan 8-HF9 (planned)
- 2026-03-30: Neues verpflichtendes P0-Follow-up priorisiert R47 als unmittelbaren Hotfix-Blocker (Outside-mp4 bleibt im Realbetrieb regressiert).
- 2026-03-30: R48 und R49 sind verpflichtende Guard-Risiken fuer strict conditional unmounting und deterministic visibility transitions.
- 2026-03-30: R50 setzt den Gate-Guard, dass Plan 8-2 erst nach HF9-PASS und Vollsync startet.

## Risk Review after Plan 8-HF9
- 2026-03-30: R47 ist mitigiert; Outside-mp4-Lifecycle ist ueber run-bound playback hardening stabil fuer Start/Stop/Re-Start sowie reload-sensitive Kontexte (`P8-T71-OUTSIDE-MP4-LIFECYCLE-ROOT-CAUSE.md`, `P8-T73-MP4-REGRESSION-GUARD.md`).
- 2026-03-30: R48 ist mitigiert; `outside mode`/`outside direction` werden in nicht-applicable Kontexten strikt unmounted statt disabled-only gehalten (`P8-T74-STRICT-CONDITIONAL-UNMOUNT.md`).
- 2026-03-30: R49 ist mitigiert; Type-/Asset-Transitions aktualisieren die Visibility deterministisch auf `input`+`change` ohne stale reappear drift (`P8-T75-VISIBILITY-TRANSITION-REGRESSION.md`).
- 2026-03-30: R50 Gate ist erfuellt; Plan 8-HF9 ist PASS verifiziert (`8-HF9-VERIFICATION.md`).

## Risk Review for Plan 8-HF10 (planned)
- 2026-03-31: Kritisches P0-Follow-up priorisiert R51 als unmittelbaren Hotfix-Blocker (Outside-mp4 ist im Feldbetrieb erneut nicht deterministisch sichtbar).
- 2026-03-31: R52 ist verpflichtender Guard fuer nahtlosen mp4-Loop ohne Replay-Break/Black-Frame/Restart-Gap.
- 2026-03-31: R53 und R54 sind verpflichtende Guard-Risiken fuer Apply-/Persistenz-Non-Regression und runtime-fokussierte Mehrzyklus-Evidenz.
- 2026-03-31: R55 setzt den Gate-Guard, dass Plan 8-2 erst nach HF10-PASS und Vollsync startet.

## Risk Review after Plan 8-HF10
- 2026-03-31: R51 ist mitigiert; Outside-mp4-Visibility-Restore ist deterministisch abgesichert (inkl. start/stop/restart + reload-sensitive Pfade) (`P8-T77-OUTSIDE-MP4-VISIBILITY-ROOT-CAUSE.md`).
- 2026-03-31: R52 ist mitigiert; mp4-Loop nutzt seamless continuity guards ohne replay break/black frame/restart gap (`P8-T80-VISIBILITY-LOOP-LIFECYCLE-REGRESSION.md`).
- 2026-03-31: R53 und R54 sind mitigiert; `Apply changes` + Persistenzpfade bleiben regressionsfrei und runtime-fokussiert evidenzgestuetzt (`P8-T81-APPLY-PERSISTENCE-NON-REGRESSION.md`, `8-HF10-VERIFICATION.md`).
- 2026-03-31: R55 Gate ist erfuellt; Plan 8-HF10 ist PASS verifiziert (`8-HF10-VERIFICATION.md`).

## Risk Review for Plan 8-HF11 (planned)
- 2026-04-01: Neues verpflichtendes P0-Featurepaket priorisiert R56 und R58 als unmittelbare Blocker (all-type editable room animations + first-start default-autoload).
- 2026-04-01: R57 und R59 sind verpflichtende Guard-Risiken fuer typed room assets und klare Reset-Semantik des Buttons `Load and apply defaults`.
- 2026-04-01: R60 setzt den Gate-Guard, dass Plan 8-2 erst nach HF11-PASS und Vollsync startet.

## Risk Review after Plan 8-HF11
- 2026-04-01: R56 ist mitigiert; Room-Animationen sind definitionsgetrieben CRUD-faehig in einer eigenen Settings-Sektion inklusive create/edit/delete und Dashboard-Paritaet.
- 2026-04-01: R57 ist mitigiert; typed room assets (`coded`/`gif`/`mp4`) sind ueber typspezifischen Picker + Persistenz deterministisch normalisiert.
- 2026-04-01: R58 ist mitigiert; Runtime-Start/Edit/Stop nutzt definitionsgetriebene Room-Assets ohne neue codegebundene Einzelverdrahtung.
- 2026-04-01: R59 ist mitigiert; first-start Startup-Guard erzwingt Defaults-Autoload bei leerem Local-Storage, waehrend der manuelle Reset-Button unveraendert bleibt.
- 2026-04-01: R60 Gate ist erfuellt; Plan 8-HF11 ist PASS verifiziert (`8-HF11-VERIFICATION.md`, `P8-T88-HF11-REGRESSION.md`).

## Risk Review for Plan 8-HF12 (planned)
- 2026-04-01: Neues verpflichtendes P0-Refinement priorisiert R61 und R63 als unmittelbare Blocker (dedizierter GIF-Speed-Slider muss weg; `Opacity` fuer mp4 muss editierbar bleiben).
- 2026-04-01: R62 ist verpflichtender Guard fuer typparitaetischen Unified-Speed-Refactor ohne `coded`/`gif`/`mp4`-Regression.
- 2026-04-01: R64 setzt den Gate-Guard, dass Plan 8-2 erst nach HF12-PASS und Vollsync startet.

## Risk Review after Plan 8-HF12
- 2026-04-01: R61 ist mitigiert; dedizierter GIF-Speed-Slider wurde aus dem Room-Editor entfernt, ein einheitlicher `Speed`-Control ist kanonisch.
- 2026-04-01: R62 ist mitigiert; Room-Speed wiring ist typparitaetisch (`coded`/`gif`/`mp4`) und bleibt legacy-kompatibel ueber `playbackSpeed`-Mirror aus `speed`.
- 2026-04-01: R63 ist mitigiert; `Opacity` bleibt fuer `assetType=mp4` aktiv editierbar ohne type-spezifische Disable-/Hide-Pfade.
- 2026-04-01: R64 Gate ist erfuellt; Plan 8-HF12 ist PASS verifiziert (`8-HF12-VERIFICATION.md`, `P8-T92-SPEED-OPACITY-PERSISTENCE-REGRESSION.md`, `P8-T93-ROOM-CRUD-TYPED-ASSET-NON-REGRESSION.md`).
