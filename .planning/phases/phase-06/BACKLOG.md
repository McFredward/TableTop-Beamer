# Phase 6 Backlog (Prepared)

## Epics
- Board-Agnostic Catalog Core
- Board Import + Server Persistence
- English-Only Operator Flow
- English-Only Operator Flow Hotfix Closure
- Room Groups / Room Clusters
- Polygon Editor Safety + Play-Area Generalization
- Room Editing Hotfix (Copy Parity + Keyboard + Deselection)
- Selection Semantics + Delete Consistency Hotfix
- Pointer Arbitration + Persistent Selection Regression Hotfix
- Click-Without-Move Persistence Re-Regression Hotfix
- Vertex Selection Lifecycle Regression Hotfix
- Edge-Bubble Arbitration + Room Deletion Tombstone Hotfix
- Draft Persistence + Cluster UX Completion Hotfix
- Target Auto+Manual Parity Hotfix
- Cluster Fanout + Running Scope Hotfix
- Cluster Lifecycle + Board Context Determinism Hotfix
- Cluster Controller Determinism Hotfix
- Legacy Compatibility + Migration
- Runtime Hardening + Operator Verification

## Story Mapping
- P6-S1.1 Kanonisches Board-Katalogschema definieren (boardId, metadata, rooms, optional clusters).
- P6-S1.2 Bestehende Nemesis-Boards in das Katalogschema ueberfuehren.
- P6-S1.3 Board-Auswahl in UI/State/Runtime auf dynamischen Katalog umstellen.

- P6-S2.1 Importformat fuer eigene Boards definieren und serverseitig validieren.
- P6-S2.2 Upload/Import-Endpunkt bereitstellen und Boarddaten serverseitig persistieren.
- P6-S2.3 Katalog nach Import ohne Neustart aktualisieren (oder deterministisch invalidieren/reloaden).
- P6-S2.4 Konfliktstrategie fuer doppelte Board-IDs/Namen festlegen (reject/rename/version).

- P6-S3.1 Alle UI-Texte fuer Operator-Flow auf Englisch umstellen.
- P6-S3.2 Statusmeldungen und handlungsrelevante Errors auf Englisch vereinheitlichen.
- P6-S3.3 Operator-relevante README-/Doku-Hinweise auf Englisch aktualisieren.
- P6-S3.4 Relevante Logs fuer Operator-Diagnosepfade auf Englisch konsolidieren.
- P6-S3.5 Language Sweep fuer Control/Settings/Final-Flow mit Verbot deutscher operatorrelevanter Strings absichern.
- P6-S3.6 Verifikationsartefakt fuer Language Sweep liefern (Pattern-Checks + manuelle UI-Matrix + Failure-Samples).

- P6-S4.1 Room-Cluster-Datenmodell (`clusterId`, `name`, `roomIds`) pro Board einfuehren.
- P6-S4.2 Cluster im Dropdown als waeren es Raeume auswaehlbar machen (`targetType: room|cluster`).
- P6-S4.3 Cluster-Trigger/Edit-Fanout implementieren (Animationsstart fuer alle Cluster-Raeume).
- P6-S4.4 Board-Klickverhalten absichern: Einzelraumklick bleibt unveraendert einzelraumbezogen.

- P6-S7.1 Polygon-Editor-Visibility splitten: Room-Vertices und Play-Area-Vertices getrennt ein/ausblendbar.
- P6-S7.2 Interaktionsguard absichern: ausgeblendete Vertex-Gruppe darf nicht selektierbar/ziehbar sein.
- P6-S7.3 Terminologie umstellen: `Ship Polygon` in UI/Model/Operator-Wording auf `Play Area` vereinheitlichen.
- P6-S7.4 Legacy-Spezialraum-Visuals entfernen: Spezialraeume folgen Standard-Raumdarstellung ohne Sonderfarbe.
- P6-S7.5 Room-Creation aus Polygon-Template liefern (bestehendes Polygon als Startform inkl. Punktkopie).

- P6-S8.1 Room-Copy auf Geometrie-Paritaet bringen: alle Room-Geometry-Properties inkl. Scale/Offset/Transform deep-copy uebernehmen.
- P6-S8.2 Keyboard-Editing fuer selektierten Room liefern: `CTRL+C` kopiert, `CTRL+V` fuegt ein, `Delete` loescht.
- P6-S8.3 Selection-Behavior absichern: Klick auf leere Boardflaeche hebt Room-Selektion auf (`none`).
- P6-S8.4 Play-Area-Guard: Room-Copy/Keyboard/Deselection duerfen Play-Area-Editing/-Selection nicht beeinflussen.

- P6-S9.1 Selection-Semantik vereinheitlichen: visuell selektierter Room (Polygon/Handles sichtbar) ist kanonisch aktiv selektiert.
- P6-S9.2 Delete-Hotkey entkoppeln: `Delete` loescht anhand persistenter Selection und nicht anhand LMB-Hold-/Drag-Zustand.
- P6-S9.3 Regression fuer Copy/Paste/Delete + Empty-space deselect + Play-Area-Guard als kombinierte Pflichtmatrix nachweisen.
- P6-S9.4 Selection-State-Hardening dokumentieren (State-Transitions, Input-Guards, Negativpfade) und in Phase-06-Artefakte synchronisieren.

- P6-S10.1 Pointerdown/Click/Pointerup-Arbitration korrigieren: Click selektiert persistent, Drag bleibt separater Move-Flow.
- P6-S10.2 Selection-Lifecycle fixen: sichtbare Room-Polygone/Handles bleiben bis expliziter Deselection oder Room-Wechsel aktiv.
- P6-S10.3 Input-Semantik absichern: Hold ist nur fuer Drag/Move noetig, Buttons/Hotkeys arbeiten auf persistenter Selection.
- P6-S10.4 Regression fuer Delete/Copy/Paste + Empty-space deselect + Play-Area-Guard unter neuer Arbitration matrixbasiert nachweisen und Artefakte synchronisieren.

- P6-S11.1 Click-Commit fixen: kurzer Click ohne Move aktiviert persistente Room-Selection deterministisch.
- P6-S11.2 Pointer-Up-Lifecycle stabilisieren: Polygone/Handles bleiben nach no-move Click sichtbar bis Deselect/Room-Wechsel.
- P6-S11.3 Drag-Paritaet absichern: Hold/Move-Drag bleibt unveraendert nutzbar, Selection-Click startet keinen erzwungenen Drag.
- P6-S11.4 Guard-Regression verifizieren: Empty-space deselect, Play-Area-Guard und Copy/Paste/Delete bleiben unter no-move Click-Fix intakt.
- P6-S11.5 HF5-Artefakt-Sync abschliessen (PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

- P6-S12.1 Pointer-Arbitration Room-vs-Vertex korrigieren: Vertex-Klick darf aktive Room-Selektion/Handles nicht invalidieren.
- P6-S12.2 Vertex-Selection-Lifecycle stabilisieren: direkter Vertex-Klick ist sofortige, persistente Edit-Quelle fuer Move/Delete ohne Dropdown-Re-Select.
- P6-S12.3 Delete-Key/Delete-Panel auf stabile Vertex-Auswahl binden, ohne Room-Re-Select oder Pointer-Hold-Zwang.
- P6-S12.4 Optionalen UX-Guard liefern: Text-Selektion waehrend Room-Drag unterdruecken (low-risk, keine Input-Regression).
- P6-S12.5 HF6-Kombinations-Regression + Artefakt-Sync abschliessen (PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

- P6-S13.1 Pointer-Arbitration fuer Edge-Bubbles angleichen: Edge-Click zwischen Vertices darf aktive Room-Selektion nicht deselektieren.
- P6-S13.2 Edge-Selection-Lifecycle haerten: aktive Edge bleibt nach Click/Pointer-Up stabil und ist direkte Insert-Vertex-Quelle ohne Re-Select.
- P6-S13.3 Room-Delete-Persistenz absichern: Tombstone-/Deletion-Semantik im board-spezifischen Room-Katalog einfuehren.
- P6-S13.4 Defaults-Merge/Overlay-Guard liefern: Global-Defaults-Rehydrate darf geloeschte Rooms nicht wiederherstellen; bestehende Move/Update-Persistenz bleibt intakt.
- P6-S13.5 HF7-Kombinations-Regression + Artefakt-Sync abschliessen (Insert-Vertex flow + delete persistence + guards + PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

- P6-S14.1 Draft-Persistenz fuer Room-Animationen absichern: zuletzt gewaehltes Animationstemplate bleibt bei Room-/Target-Wechsel als aktive Voreinstellung erhalten.
- P6-S14.2 Parameter-Persistenz absichern: aktuelle Triggerwerte (`speed`, `opacity`, `soundVolume`, weitere Parameter) bleiben ueber Room-Wechsel und Trigger-Starts als Draft-Voreinstellung erhalten.
- P6-S14.3 Cluster-UX vervollstaendigen: Cluster create/edit/delete im Operator-Flow fuer beliebige Room-Mengen liefern (board-spezifisch persistiert).
- P6-S14.4 Target-Flow vervollstaendigen: Cluster als Ziel waehlbar halten und Cluster-Start fuer alle enthaltenen Rooms stabil ausfuehren.
- P6-S14.5 Trigger-Option `stagger start` liefern: pro Trigger optional kurzer randomisierter Room-Startversatz; deaktiviert = synchroner Start.
- P6-S14.6 HF8-Kombinations-Regression + Artefakt-Sync abschliessen (draft persistence + cluster CRUD + sync/staggered start + guards + PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

- P6-S15.1 Draft-Persistenz praezisieren: Animation + Parameter bleiben ueber Room-/Target-Wechsel stabil, `target` ist explizit ausgenommen.
- P6-S15.2 Target-Autofill erzwingen: Raumklick auf Board setzt `target` sofort auf den geklickten Room, ohne Draft-Parameter zu resetten.
- P6-S15.3 Target-Dropdown immer manuell bedienbar machen: nie selection-bedingt deaktivieren, auch nicht bei `none`-Selection.
- P6-S15.4 Auto+Manual-Flow absichern: nach Room-Autofill darf `target` jederzeit manuell auf Room/Cluster umgestellt werden, unabhaengig vom Selection-State.
- P6-S15.5 HF9-Kombinations-Regression + Artefakt-Sync abschliessen (target autofill + always-manual dropdown + draft-non-target persistence + guards + PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

- P6-S16.1 Cluster-Fanout robust machen: Cluster-Start (sync + staggered) startet deterministisch fuer alle gueltigen Cluster-Member-Raeume statt nur fuer den ersten Room.
- P6-S16.2 Stagger/Sync-Paritaet absichern: `stagger start = off` startet alle Member zeitgleich, `on` wendet kurzen randomisierten Versatz auf alle Member an (kein Room-Verlust).
- P6-S16.3 Running-Model erweitern: Cluster-Run wird als eigener Scope-Typ `CLUSTER` modelliert (nicht `ROOM`, nicht `GLOBAL-INSIDE`).
- P6-S16.4 Running-Rendering erweitern: dedizierter Cluster-Eintrag mit Label `CLUSTER` und visuell unterscheidbarer Farbe inkl. konsistenter Stop/Edit-Semantik.
- P6-S16.5 HF10-Kombinations-Regression + Artefakt-Sync abschliessen (cluster fanout sync/stagger + cluster stop/edit behavior + guards + PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

- P6-S17.1 Cluster-Lifecycle root-cause fixen: vorzeitiges Verschwinden durch overwrite/cleanup races eliminieren; hold-by-default-Paritaet zu Room-Animationen herstellen.
- P6-S17.2 Cluster-Cleanup semantisch haerten: cleanup/expiry/edit/stop auf run-context begrenzen, keine fremden Member-Instanzen entfernen.
- P6-S17.3 Serverautoritiven Board-Context-Sync haerten: `context-update` mit Ack/Version/Ordering (stale drop + deterministic last-write).
- P6-S17.4 Join/Reconnect-/InFlight-Verhalten absichern: context-version replay fuer spaet joinende Clients inkl. `/output/final` ohne Mehrfach-Toggle.
- P6-S17.5 HF11-Kombinations-Regression + Artefakt-Sync abschliessen (cluster lifecycle stability + board-switch determinism + reconnect/order matrix + PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

- P6-S18.1 Running-Dedupe determinisieren: Cluster-Start fuehrt genau einen kanonischen Running-Scope-Eintrag `CLUSTER` (keine memberbezogenen `ROOM`-Duplikate fuer denselben Trigger).
- P6-S18.2 Runtime-Fanout absichern: dedupter `CLUSTER`-Controller startet/rendert weiterhin alle gueltigen Cluster-Member-Raeume (`sync` + `stagger`).
- P6-S18.3 Stop-Semantik haerten: Stop auf `CLUSTER` wirkt deterministisch auf alle Member-Instanzen des zugehoerigen Cluster-Runs.
- P6-S18.4 Edit-Semantik haerten: Edit auf `CLUSTER` bleibt run-kontextscharf und aktualisiert alle zugeordneten Member konsistent.
- P6-S18.5 Room-Target-Non-Regression absichern: `targetType=room` bleibt unveraendert funktionsstabil trotz Cluster-Controller-Dedupe.
- P6-S18.6 HF12-Kombinations-Regression + Artefakt-Sync abschliessen (single-entry running + full-member runtime effect + cluster stop/edit propagation + room-target guard + PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

- P6-S5.1 Legacy-Datenanalyse fuer Nemesis, Polygone und Animationsconfigs dokumentieren.
- P6-S5.2 Load-time Migration in neuen Standard implementieren (idempotent, verlustfrei, rueckwaertskompatibel).
- P6-S5.3 Save-Pfad auf neues Standardschema normalisieren, ohne bestehende Daten zu verwerfen.
- P6-S5.4 Migrations-Regression fuer Reload/Restart und Multi-Board-Kontext dokumentieren.

- P6-S6.1 Import-/Cluster-/Migration-Soaktests und Negativtests als Pflichtartefakte erfassen.
- P6-S6.2 Operator-Flow-E2E (Import -> Board Select -> Trigger -> Save/Reload) dokumentieren.

## Priorisierte erste Ausfuehrungswelle (P0) - Plan 6-1 execute-ready
- Story P6-S1.1 + P6-S1.2 + P6-S1.3.
  - Ziel: dynamischer Board-Katalog ersetzt Nemesis-only-Hardcoding.
- Story P6-S2.1 + P6-S2.2 + P6-S2.3.
  - Ziel: eigene Boards sind importierbar und serverseitig persistent.
- Story P6-S4.1 + P6-S4.2 + P6-S4.3 + P6-S4.4.
  - Ziel: Room-Clusters sind triggerbar, Einzelraumklick bleibt stabil.
- Story P6-S3.1 + P6-S3.2 + P6-S3.3 + P6-S3.4.
  - Ziel: Operator-Flow ist vollstaendig Englisch.
- Story P6-S5.1 + P6-S5.2 + P6-S5.3.
  - Ziel: Legacy-Daten laufen verlustfrei im neuen Standard.

## Priorisierte Hotfix-Welle (P0) - Plan 6-HF1 execute-ready
- Story P6-S3.5 + P6-S3.6.
  - Ziel: verify-work-6 P0-Blocker fuer English-only Operator-Flow schliessen.
- Story P6-S3.1 + P6-S3.2 + P6-S3.3 + P6-S3.4 (Restluecken).
  - Ziel: keine deutschen Operator-Texte mehr in Control/Settings/Final-Flow, inklusive Logs/Errors/Doku.

## Priorisierte zweite Ausfuehrungswelle (P0) - Plan 6-2 execute-ready
- Story P6-S7.1 + P6-S7.2.
  - Ziel: Polygon-Editor verhindert Cross-Drag-Fehler ueber getrennte Vertex-Visibility-Toggles.
- Story P6-S7.3.
  - Ziel: `Ship Polygon` ist in UI/Model/Operator-Flows durchgaengig auf `Play Area` umbenannt.
- Story P6-S7.4.
  - Ziel: ehemalige Spezialraeume sind visuell voll normalisiert ohne Sondermarkierung.
- Story P6-S7.5.
  - Ziel: neue Raeume koennen aus bestehender Polygongeometrie vorbefuellt erstellt werden.

## Priorisierte Hotfix-Welle 2 (P0) - Plan 6-HF2 execute-ready
- Story P6-S8.1.
  - Ziel: Room-Copy ist vollstaendig und uebernimmt alle Geometrie-Parameter inkl. Scale/Offset/Transform als tiefe Kopie.
- Story P6-S8.2.
  - Ziel: Keyboard-Editing fuer selektierte Raeume funktioniert deterministisch ueber `CTRL+C`, `CTRL+V`, `Delete`.
- Story P6-S8.3.
  - Ziel: Klick auf leere Flaeche setzt Selektion sauber auf `keinen Raum`.
- Story P6-S8.4.
  - Ziel: Play-Area bleibt funktional unberuehrt und regressionsfrei.

## Priorisierte Hotfix-Welle 3 (P0) - Plan 6-HF3 execute-ready
- Story P6-S9.1.
  - Ziel: Selection-Semantik ist konsistent (`visuell selektiert = aktiv selektiert`).
- Story P6-S9.2.
  - Ziel: `Delete` funktioniert fuer aktiv selektierten Room sofort ohne LMB-Hold-Abhaengigkeit.
- Story P6-S9.3.
  - Ziel: Regression fuer Copy/Paste/Delete + Empty-space deselect + Play-Area-Guard ist artefaktbasiert abgesichert.
- Story P6-S9.4.
  - Ziel: Selection-State-Hardening ist nachvollziehbar dokumentiert und in allen Phase-6-Artefakten konsistent.

## Priorisierte Hotfix-Welle 4 (P0) - Plan 6-HF4 execute-ready
- Story P6-S10.1.
  - Ziel: Pointer-Arbitration trennt Selection (Click) und Drag (Hold/Move) deterministisch.
- Story P6-S10.2.
  - Ziel: aktive Room-Selektion bleibt nach Pointer-Up persistent sichtbar (Polygon/Handles).
- Story P6-S10.3.
  - Ziel: Hold ist nur Drag-relevant; Delete/Copy/Paste + Buttons funktionieren auf persistenter Selection.
- Story P6-S10.4.
  - Ziel: kombinierte Regression (Delete/Copy/Paste + Empty-space deselect + Play-Area-Guard) ist unter neuer Arbitration artefaktbasiert PASS.

## Priorisierte Hotfix-Welle 5 (P0) - Plan 6-HF5 execute-ready
- Story P6-S11.1.
  - Ziel: kurzer Click ohne Move selektiert Room persistent (kein Drag, kein Zwischen-Move erforderlich).
- Story P6-S11.2.
  - Ziel: Room-Polygon/Handles bleiben nach Pointer-Up sichtbar, solange keine explizite Deselection erfolgt.
- Story P6-S11.3.
  - Ziel: Drag bleibt unveraendert funktionsfaehig und move-threshold-basiert.
- Story P6-S11.4.
  - Ziel: Empty-space deselect, Play-Area-Guard und Copy/Paste/Delete bleiben regressionsfrei.
- Story P6-S11.5.
  - Ziel: alle Phase-6- und globalen Planungsartefakte sind HF5-konsistent und execute-ready synchronisiert.

## Priorisierte Hotfix-Welle 6 (P0/P1) - Plan 6-HF6 execute-ready
- Story P6-S12.1.
  - Ziel: Vertex-Interaktion behaelt persistente Room-Selektion und sichtbare Handles stabil.
- Story P6-S12.2 + P6-S12.3.
  - Ziel: direkter Vertex-Click startet stabile Move/Delete-Selection inkl. Delete-Key/Panel ohne Dropdown-Re-Select.
- Story P6-S12.4.
  - Ziel: waehrend Room-Drag wird unbeabsichtigte Text-Selektion unterdrueckt (nur low-risk Umsetzung).
- Story P6-S12.5.
  - Ziel: kombinierte HF6-Regression und kompletter Artefakt-Sync liefern execute-ready Gate-Closure.

## Priorisierte Hotfix-Welle 7 (P0) - Plan 6-HF7 execute-ready
- Story P6-S13.1 + P6-S13.2.
  - Ziel: Edge-Bubble-Klick arbeitet lifecycle-paritaetisch zu Vertex-Click (persistente Room-Selektion + stabile Edge-Selektion fuer Insert-Vertex).
- Story P6-S13.3 + P6-S13.4.
  - Ziel: geloeschte Rooms bleiben dauerhaft geloescht, auch bei Reload/Restart/Global-Defaults-Merge.
- Story P6-S13.5.
  - Ziel: kombinierte HF7-Regression und kompletter Artefakt-Sync liefern execute-ready Gate-Closure.

## Priorisierte Hotfix-Welle 8 (P0) - Plan 6-HF8 execute-ready
- Story P6-S14.1 + P6-S14.2.
  - Ziel: Room-Animation-Drafts (Dropdown + Parameter) bleiben ueber Room-/Target-Wechsel und Trigger-Starts stabil erhalten.
- Story P6-S14.3 + P6-S14.4.
  - Ziel: Cluster koennen erstellt/bearbeitet/geloescht werden und sind als vollwertiges `target` fuer Cluster-Starts nutzbar.
- Story P6-S14.5.
  - Ziel: `stagger start` ist pro Trigger schaltbar (`off` synchron, `on` kurzer randomisierter Versatz je Room).
- Story P6-S14.6.
  - Ziel: kombinierte HF8-Regression und kompletter Artefakt-Sync liefern execute-ready Gate-Closure.

## Priorisierte Hotfix-Welle 9 (P0) - Plan 6-HF9 execute-ready
- Story P6-S15.1.
  - Ziel: Draft-Vertrag ist praezisiert (`animation + parameter` stabil, `target` explizit ausgenommen).
- Story P6-S15.2 + P6-S15.3.
  - Ziel: Raumklick setzt `target` automatisch auf Room; Target-Dropdown bleibt immer aktiv/manuell bedienbar (auch ohne Selection).
- Story P6-S15.4.
  - Ziel: nach Autofill bleibt manueller Target-Wechsel auf Room/Cluster jederzeit moeglich, unabhaengig vom Selection-State.
- Story P6-S15.5.
  - Ziel: kombinierte HF9-Regression und kompletter Artefakt-Sync liefern execute-ready Gate-Closure.

## Priorisierte Hotfix-Welle 10 (P0) - Plan 6-HF10 execute-ready
- Story P6-S16.1 + P6-S16.2.
  - Ziel: Cluster-Fanout startet in allen Cluster-Member-Raeumen robust und haelt Sync/Stagger-Semantik fuer alle Member ein.
- Story P6-S16.3 + P6-S16.4.
  - Ziel: Running-Liste fuehrt Cluster als dedizierten Scope `CLUSTER` mit eigener visueller Kennzeichnung und konsistenter Stop/Edit-Logik.
- Story P6-S16.5.
  - Ziel: kombinierte HF10-Regression und kompletter Artefakt-Sync liefern execute-ready Gate-Closure.

## Priorisierte Hotfix-Welle 11 (P0) - Plan 6-HF11 execute-ready
- Story P6-S17.1 + P6-S17.2.
  - Ziel: Cluster-Animationen bleiben lifecycle-stabil wie Room-Animationen (hold-by-default, kein sofortiges Self-cleanup/overwrite).
- Story P6-S17.3 + P6-S17.4.
  - Ziel: Board-Wechsel ist serverautoritativ first-try-deterministisch auf allen Clients inkl. `/output/final` (Ack/Version/Ordering/Reconnect).
- Story P6-S17.5.
  - Ziel: kombinierte HF11-Regression und kompletter Artefakt-Sync liefern execute-ready Gate-Closure.

## Priorisierte Hotfix-Welle 12 (P0) - Plan 6-HF12 execute-ready
- Story P6-S18.1.
  - Ziel: Running-Liste ist bei Cluster-Start deterministisch auf exakt einen `CLUSTER`-Eintrag begrenzt.
- Story P6-S18.2.
  - Ziel: dedupter `CLUSTER`-Eintrag animiert weiterhin alle Cluster-Member robust (sync + stagger).
- Story P6-S18.3 + P6-S18.4.
  - Ziel: Stop/Edit auf `CLUSTER` propagiert konsistent auf alle Cluster-Member-Instanzen desselben Run-Kontexts.
- Story P6-S18.5.
  - Ziel: Room-Target-Flow bleibt unveraendert regressionsfrei.
- Story P6-S18.6.
  - Ziel: kombinierte HF12-Regression und kompletter Artefakt-Sync liefern execute-ready Gate-Closure.

## P1 direkt danach (Plan 6-3, nach 6-HF12)
- Story P6-S2.4.
  - Ziel: robuste Konfliktstrategie und Import-Hardening fuer produktive Nutzung.
- Story P6-S5.4 + P6-S6.1 + P6-S6.2.
  - Ziel: formale Hardening-/Soak-/E2E-Nachweise ohne offene P0-Luecken.

## Execution Update - 6-HF6 Completed (P0/P1)
- HF6 regression closure is complete: Room-vs-Vertex arbitration no longer drops persistent room selection on vertex click.
- Vertex selection lifecycle is stable for direct click -> move/delete flows; delete key + delete panel parity is now deterministic without dropdown reselect.
- Optional low-risk UX hardening is implemented: text selection is suppressed during room drag.
- HF6 combined regression matrix is PASS (`P6-T53-REGRESSION.md`); subsequent mandatory feedback inserts HF7 before Plan 6-3 hardening tasks.

## Execution Update - 6-HF7 completed (P0)
- Edge-bubble click no longer drops persistent room selection; active edge remains stable for insert-vertex without reselect.
- Deleted rooms are now persisted as board-scoped tombstones and cannot be rehydrated by defaults merge/apply.
- HF7 combined evidence is PASS (`P6-T59-REGRESSION.md`); backlog flow proceeds to Plan 6-3 hardening.

## Plan Update - 6-HF8 inserted (P0)
- Mandatory feedback introduces an additional P0 gate before hardening: draft values must persist across room switches and cluster UX/flow must support CRUD + staggered starts.
- Backlog flow is updated to execute Plan 6-HF8 before Plan 6-3.

## Execution Update - 6-HF8 completed (P0)
- Room animation drafts are now session-persistent across room/target switches: selected animation and parameter sliders no longer reset implicitly.
- Cluster UX is complete in Settings (create/edit/delete with board-scoped room assignment persistence), and target flow supports room/cluster selection with deterministic fanout.
- Optional `stagger start` is active for cluster launches (`off = sync`, `on = short randomized delay`) with regression evidence in `P6-T66-REGRESSION.md`.

## Plan Update - 6-HF9 inserted (P0)
- Mandatory feedback adds a new P0 gate before hardening: room click must auto-set `target` to the clicked room, while draft persistence remains stable for animation/parameters and explicitly excludes `target`.
- Target dropdown must remain manually operable at all times (including no active room selection), and manual override to room/cluster must stay available after auto-fill.
- Backlog flow is updated to execute Plan 6-HF9 before Plan 6-3.

## Execution Update - 6-HF9 completed (P0)
- Draft contract is closed: animation + parameter drafts persist; `target` is now explicitly excluded from deselection/pointer refresh resets.
- Room-click target autofill is active and deterministic, and target dropdown remains manually operable even with no active room selection.
- Auto+manual target parity is verified: manual room/cluster override remains robust after autofill; combined evidence is PASS in `P6-T71-REGRESSION.md`.

## Plan Update - 6-HF10 inserted (P0)
- Mandatory feedback introduces an additional P0 gate before hardening: cluster launches must fan out to all cluster member rooms in both sync and stagger mode (no first-room-only starts).
- Running model/rendering must represent cluster launches as a dedicated `CLUSTER` scope entry with distinct visual color and consistent stop/edit behavior.
- Backlog flow is updated to execute Plan 6-HF10 before Plan 6-3.

## Execution Update - 6-HF10 completed (P0)
- Cluster launch fanout is now member-complete for both modes (`off = sync`, `on = staggered`) without first-room truncation.
- Running model/rendering now includes a dedicated `CLUSTER` scope entry (label + distinct color) and linked cluster stop/edit semantics.
- Combined HF10 evidence is PASS in `P6-T76-REGRESSION.md`; backlog flow proceeds to Plan 6-3 hardening.

## Plan Update - 6-HF11 inserted (P0)
- Mandatory feedback introduces an additional P0 gate before hardening: cluster animation lifecycle is unstable (premature disappearance after start) and must be parity-stable to room animation lifecycle.
- Board context switch currently is not deterministic; server-authoritative context sync must be hardened with ack/version/order/reconnect so first toggle replicates reliably to every client including `/output/final`.
- Backlog flow is updated to execute Plan 6-HF11 before Plan 6-3.

## Execution Update - 6-HF11 completed (P0)
- Cluster lifecycle stability is closed: hold-by-default parity is enforced for cluster controller/member flows and prune no longer causes implicit self-cleanup races.
- Cluster edit/stop semantics are now run-context isolated: edits stay in-place on the same cluster run and member cleanup/removal is `animation.id`-scoped.
- Board context determinism is hardened: reconnect replay uses stale-context drop + mutation-id dedup and socket ordering guards, so first-toggle board propagation remains deterministic across controllers and `/output/final`.
- Combined HF11 evidence is PASS in `P6-T81-REGRESSION.md`; backlog flow proceeds to Plan 6-3 hardening.

## Plan Update - 6-HF12 inserted (P0)
- Mandatory feedback introduces another P0 gate before hardening: cluster start is still non-deterministic in the running list (extra member `ROOM` rows or only `CLUSTER` row without visible member animation effect).
- Backlog flow is updated to execute Plan 6-HF12 before Plan 6-3 with strict closure on single-entry `CLUSTER` running determinism, full-member runtime effect, and consistent cluster stop/edit propagation plus room-target non-regression.

## Execution Update - 6-HF12 completed (P0)
- Running list determinism is closed: cluster starts now expose a canonical single `CLUSTER` controller row without member `ROOM` duplicates.
- Cluster runtime fanout remains member-complete under deduped running projection (sync + stagger), including cluster-only fallback rendering safeguards.
- Cluster stop/edit propagation remains run-context consistent across all linked members; room-target flow is unchanged and documented as non-regression.
- Combined HF12 evidence is PASS in `P6-T87-REGRESSION.md` with room-path guard evidence in `P6-T86-ROOM-TARGET-REGRESSION.md`; backlog flow proceeds to Plan 6-3 hardening.
