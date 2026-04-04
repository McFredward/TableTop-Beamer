# Phase 4 Acceptance

## Regression- und Verifikationsstrategie
- Baseline-first: vor jedem Refactoring-Block wird ein identischer Smoke-Pfad gegen die letzte stabile Baseline gefahren.
- Inkrementelle Gates: jede Extraktion endet mit Syntax-, Runtime- und Kernflow-Checks.
- High-risk-Domains (`gif`, `render`, `api`, `mobile input`) erhalten zusaetzliche focused Regression.
- High-risk-Domain `room-model` (CRUD + Polygon + Migration) erhaelt zusaetzliche Datenintegritaets-Gates.
- Abschlussabnahme erfolgt erst nach kompletter Matrix (Desktop + Mobile + Cross-Browser GIF + Save/API).

## Testplan (Pflichtmatrix)
- Boot-Test: App startet fehlerfrei, Board/Room-Auswahl funktioniert, Views wechseln robust.
- Dashboard/Settings-Test: strikte Tab-Trennung bleibt intakt; Settings-Controls nur in Settings sichtbar/aktiv.
- Room-CRUD-Test: in Settings lassen sich Raeume anlegen und loeschen; Auswahl-/Listenstatus bleibt konsistent.
- Room-Name-Test: jeder Raumname ist frei editierbar und erscheint sofort konsistent in UI/Runtime.
- Room-Polygon-Test: jeder Raum ist als frei editierbares Polygon bearbeitbar (Insert/Delete/Move), inkl. Mindestpunkt-Guard.
- Polygon-Handle-Size-Test: Handle-Groesse ist nahe Zoom-Controls einstellbar; Radius/Hitarea reagieren sofort und bleiben bei hohem Zoom praezise nutzbar.
- Editor-Handle-Paritaetstest: Handle-Groesse wirkt auf alle Editor-Punkte inkl. Ship-Polygon-Vertices identisch (Visual + Hitarea + Zoom-Verhalten).
- Room-Drag-Test: gesamter Raum laesst sich in Settings per LMB-Flaechen-Drag verschieben; Vertex-Insert/Delete/Move bleiben unveraendert funktionsfaehig.
- Running-List-Test: Start/Edit/Stop bildet Instanzen weiterhin 1:1 ab.
- Desktop-Containment-Test: Running-Liste bleibt bei vielen aktiven Instanzen begrenzt (scrollbar/layout-separiert); alle Dashboard-Controls bleiben erreichbar und klickbar.
- Room-Animation-Test: alle 7 Raumtypen triggern/stoppbar, bleiben raumstreng geclippt.
- Lichtflackern-Rework-Test: `lichtflackern` zeigt unregelmaessiges Random-Flicker (kein periodischer Puls), bleibt strikt auf Zielraum geclippt und beeintraechtigt andere Layer nicht.
- Lichtflackern-Visual-Cleanup-Test: keine stoerenden horizontalen weissen Streifen/Glitch-Baender sichtbar; Stil bleibt als unregelmaessiges Flicker erkennbar.
- Lichtflackern-Speed-Floor-Test: Playback-Speed bis mindestens 10% einstellbar und wirksam (inkl. Runtime/Edit/Reload).
- GIF-Playback-Test: `kaputt`/`feuer`/`schleim` laufen als echte Loops, nativer und fallback Pfad gleichwertig.
- GIF-Parameter-Test: `opacity`/`playbackSpeed` bleiben pro Instanz isoliert.
- Save/API-Test: Resolver, Preflight, Save, Diagnose-Feedback und Fehlermeldungsklassen bleiben funktional.
- Persistenz-Test: Board-Profile, Ship-/Special-Polygone, Geometrie, Outside-FX und Zoom/Pan bleiben reload-stabil.
- Sound-Persistenz-Test: Sound-Mapping/Sound-Auswahl pro Animation bleibt nach Save/Reload/Restart unveraendert erhalten.
- Global-Defaults-Sound-Test: Sound-Einstellungen werden via Global Defaults gespeichert, geladen und auf neue/geleerte Clients korrekt angewendet.
- Audio-Persist-on-Change-Test: Aenderungen an Audio-Enable, Audio-Volume und Sound-Mapping schreiben sofort in LocalStorage (ohne separaten Save-Button).
- Direkt-Reload-Determinismus-Test: Reload unmittelbar nach Audio-/Sound-Mapping-Aenderung laedt exakt den zuletzt gesetzten Wert.
- Schema-Migration-Test: Altprofile/Defaults werden beim Laden verlustfrei auf neuen Room-JSON-Standard ueberfuehrt.
- Legacy-Kompatibilitaetstest: bestehende gespeicherte Daten bleiben ladbar; erneutes Speichern schreibt konsistent den neuen Standard.
- Preview-Removal-Test: keine Preview-Staging-UI sichtbar, keine Preview-States/Actions im Runtime-Pfad, kein Rollback-/Commit-Flow mehr aktiv.
- Mobile-UX-Test: No-Overlay-Regeln, non-sticky Navigation, Touch-Flows, Orientation-Roundtrip ohne State-Drift.

## Inkrementelle Pflicht-Gates
- Nach P4-T2/P4-T3: keine Verhaltensaenderung bei Triggern, Save, Overlay-Interaktion.
- Nach P4-T4: State-Mutationen laufen nur noch ueber State-Module; keine versteckten globalen Seiteneffekte.
- Nach P4-T5/P4-T6: Persistenz- und API-Payloads sind schema-kompatibel zur Baseline.
- Nach P4-T8..P4-T13: Room-CRUD, freie Polygon-Editierung, Custom-Namen stabil und ohne Runtime-Drift.
- Nach P4-T14/P4-T15: Alt- und Neudaten bestehen Save/Load-Roundtrip ohne Datenverlust.
- Nach P4-T17/P4-T18: Desktop-Controls bleiben unter hoher Running-Last erreichbar; keine Overlap-/Verdraengungsfehler.
- Nach P4-T19/P4-T20: Preview-Staging vollstaendig entfernt, ohne Trigger/Edit/Stop/Save-Regression.
- Nach P4-T28/P4-T29: variable Handle-Groesse bleibt visuell + hitarea-seitig konsistent und zoomstabil.
- Nach P4-T30: `lichtflackern` liefert unregelmaessiges Flicker ohne Clipping-Leak und ohne Performance-Einbruch.
- Nach P4-T31: Room-Flaechen-Drag kollidiert nicht mit Vertex-Edit-Guards; bestehende Edit-Shortcuts bleiben stabil.
- Nach P4-T33/P4-T34: Handle-Groessensteuerung greift editoruebergreifend inkl. Ship-Vertices ohne Visual-/Hitarea-Drift.
- Nach P4-T35/P4-T36: `lichtflackern` bleibt stiltreu ohne horizontale Weissstreifen und unterstuetzt 10%-Mindest-Speed konsistent.
- Nach P4-T37/P4-T38: Sound-Mapping ist lokal persistent und wird ueber Global Defaults verlustfrei transportiert.
- Nach P4-T39/P4-T40: Audio-/Sound-Mapping-Handler persistieren sofort; Direkt-Reload bleibt ohne Timing-Luecke deterministisch.
- Nach P4-T41: Kurzregression dokumentiert Change->Storage->Reload-Roundtrip inkl. Fehlpfad-Hinweis bei LocalStorage-Write-Fehler.
- Nach P4-T22/P4-T23: keine GIF-Loop-, Clipping- oder Performance-Regression.
- Nach P4-T24/P4-T25: keine Navigation-/Input-Regression auf Mobile/Desktop.

## Definition of Done
- Alle Tasks P4-T1..P4-T41 sind abgeschlossen oder bewusst de-scoped mit dokumentierter Begruendung.
- Pflichtmatrix ist dokumentiert und ohne Blocker bestanden.
- Kein offenes P0/P1-Risiko aus `RISKS.md` fuer Runtime-Paritaet.
- Wartbarkeitsziele sind sichtbar erreicht (modulare Struktur, reduzierte Monolith-Groesse, klare Ownership).
- Neues Raummodell ist produktiv: Room-CRUD + freie Polygone + Custom-Namen + kompatible Migration nachweislich stabil.
- Desktop-Operator-Flow bleibt bedienbar, auch bei langer Running-Liste; Preview-Staging ist technisch vollstaendig decommissioned.
- Editor/Immersion-Polish ist produktiv: Handle-Size-Control verfuegbar, `lichtflackern` als Random-Flicker aktiv, Room-Flaechen-Drag in Settings stabil ohne Vertex-Regression.
- Weiteres Pflicht-Feedback ist produktiv: Handle-Size-Paritaet inkl. Ship-Vertices, `lichtflackern` ohne horizontale Weissstreifen mit 10%-Speed-Floor, Sound-Mapping inkl. Global-Defaults-Persistenz reload-stabil.
- Verify-4-5-Rest-Gap ist geschlossen: Persist-on-change fuer relevante Audio-/Sound-Mapping-Handler aktiv und Direkt-Reload deterministisch nachweisbar.
