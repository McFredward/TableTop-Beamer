# ROADMAP

## Direction
Liefere zuerst einen stabilen Vertical Slice fuer OG-Nemesis (Phase 1), erweitere danach auf wiederholbaren Session-Betrieb mit Profilen und Datenzonen (Phase 2), halte den Runtime-Operator-Flow in Phase 4 bewusst preview-frei, fuehre in Phase 5 einen serverautoritativen Multi-Device-Livebetrieb mit dediziertem Final-Beamer-Output ein, generalisiere in Phase 6 auf boardspiel-agnostischen Betrieb mit englischem Operator-Flow, haerte in Phase 7 die Multi-Device-Synchronisation fuer deterministisches Low-Latency-Verhalten auf allen Clients und fokussiere in Phase 8 Multi-Play-Area-Support plus boardseitigen Bildupload-Import sowie ein verpflichtendes Outside-/Inside-Animationspaket inklusive priorisierter P0-Wellen fuer Outside-Regressionen, Final-Output-Fullscreen-Fit, Boomerang-Entfernung mit Inside-Editor-Paritaet und den anschliessenden HF8-Hotfix fuer Outside-mp4-Restore/conditional-visibility/Apply-only-UX.

## Phase 1 - Vertical Slice + Priority Add-on inkl. Plan-Update-19 (Completed)
Ziel: Operator kann Board waehlen, kalibrieren, Effekte triggern und jederzeit sicher stoppen.

Status: 121/121 Tasks inkl. Plan-Update-19 abgeschlossen (siehe `.planning/phases/phase-01/1-1-SUMMARY.md`, `.planning/phases/phase-01/1-2-SUMMARY.md`, `.planning/phases/phase-01/1-3-SUMMARY.md`, `.planning/phases/phase-01/1-4-SUMMARY.md`, `.planning/phases/phase-01/1-5-SUMMARY.md`, `.planning/phases/phase-01/1-6-SUMMARY.md`, `.planning/phases/phase-01/1-7-SUMMARY.md`, `.planning/phases/phase-01/1-8-SUMMARY.md`, `.planning/phases/phase-01/1-9-SUMMARY.md`, `.planning/phases/phase-01/1-10-SUMMARY.md`, `.planning/phases/phase-01/1-11-SUMMARY.md`, `.planning/phases/phase-01/1-12-SUMMARY.md`, `.planning/phases/phase-01/1-13-SUMMARY.md`, `.planning/phases/phase-01/1-14-SUMMARY.md`, `.planning/phases/phase-01/1-15-SUMMARY.md`, `.planning/phases/phase-01/1-16-SUMMARY.md`, `.planning/phases/phase-01/1-17-SUMMARY.md`, `.planning/phases/phase-01/1-18-SUMMARY.md`, `.planning/phases/phase-01/1-19-SUMMARY.md`, `.planning/phases/phase-01/1-20-SUMMARY.md`, `.planning/phases/phase-01/1-21-SUMMARY.md`).

Milestones:
1. Projection Core: Board-Auswahl + Kalibrierung stabil.
2. Effects Core: Ambient + Event-Trigger + Master-Intensity.
3. Operator UX: kompaktes Dashboard mit klaren Zustandsanzeigen.
4. Safety Hardening: `Clear All` priorisiert, Lastchecks, Fixes.
5. Priority Add-on: Power-Outage-Hardening, Room-Click + Per-Room Mapping, Output-Routing mit Fallback.

Exit Criteria:
- Stories aus Phase-1-Backlog inkl. Akzeptanzkriterien umgesetzt.
- Bedienbarkeit auf Desktop und kleinem Display gegeben.
- Reproduzierbarer Safety-Stop auch unter Last.

## Phase 2 - Session Betrieb (In Progress)
Ziel: Schnellstart pro Spielabend, reproduzierbare Kalibrierung, datengetriebene Zonen, Preview/Kombi/Absenden fuer Live-Ausgabe.

Status: 32/47 Tasks abgeschlossen (P2-T1..P2-T10, P2-T26..P2-T47); Gap-Closure Add-on fuer externe Zonen + Preview/Live/Rollback + README ist abgeschlossen, siehe `.planning/phases/phase-02/2-1-SUMMARY.md`, `.planning/phases/phase-02/2-2-SUMMARY.md`, `.planning/phases/phase-02/2-3-SUMMARY.md`, `.planning/phases/phase-02/2-4-SUMMARY.md`, `.planning/phases/phase-02/2-5-SUMMARY.md`.

Milestones:
1. Core Data: Profile + Zone-JSON.
2. Control: Hotkeys + Presets + Safety-Feinschliff.
3. Preview/Live: aktive Session-Anzeige, Preview-Panel, Kombinationen, Absenden.
4. Hardening: Debug-Overlay, Soak-Test, UX-Polish.
5. Abschluss-Add-on: externe Zonen mit Validator/Fallback, echter Preview/Kombi/Absenden-Flow mit Rollback, README-Finalisierung.

Exit Criteria:
- Phase-2-Stories mit Akzeptanzkriterien umgesetzt.
- Laufzeit- und Bedien-Checks dokumentiert.
- README auf neuen Session-Workflow aktualisiert.

## Phase 3 - Nemesis Animations Overhaul (Rework Completed)
Ziel: Separat triggerbare Raumanimationen (`kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`) mit 1:1-Running-Liste, raumstrengem Clipping und echter GIF-Loop-Wiedergabe fuer die 3 GIF-basierten Raumtypen bei instanzscharfer Steuerung (`opacity`, `playbackSpeed`) und Default `hold`.

Status: 37/37 Tasks abgeschlossen; Plan 3-1 (P3-T1..P3-T12), Plan 3-2 Rework (P3-T13..P3-T25), Plan 3-3 P0-Bugfix (P3-T26..P3-T31) und Plan 3-4 Cross-Browser-Fallback-Fix (P3-T32..P3-T37) sind abgeschlossen (`.planning/phases/phase-03/3-1-SUMMARY.md`, `.planning/phases/phase-03/3-2-SUMMARY.md`, `.planning/phases/phase-03/3-3-SUMMARY.md`, `.planning/phases/phase-03/3-4-SUMMARY.md`).

Milestones:
1. P0 Runtime-Rework: separates Trigger-/Instanzmodell pro Raumanimation.
2. P0 Render-Rework: GIF-Vorgaben + globale Aequivalente (`alarm`/`lichtflackern`) strikt raumbegrenzt.
3. P0 Bugfix Plan 3-3: echtes GIF-Playback fuer `kaputt`/`feuer`/`schleim` (native Loops statt Pulse-/Zoom-Ersatz).
4. P0 Bugfix Plan 3-4: echter GIF-Frame-Fortschritt im Fallback-Pfad (kein Standbild ohne `ImageDecoder`).
5. P0 UX-Paritaet: Running-Uebersicht 1:1 pro aktiver Animation + hold-by-default bleibt stabil.
6. P1 Hardening: Regression, Browser-Matrix, Performance, Verifikation, Artefakt-Sync.

Exit Criteria:
- Plan-3-2-P0 und Plan-3-3-P0 bleiben abgeschlossen; Plan-3-4-P0 (Fallback-Loop-Fix) ist vollstaendig umgesetzt und nachgewiesen.
- Alle 7 separaten Raumanimationen sind einzeln triggerbar/stoppbar und in Running 1:1 sichtbar.
- `alarm` und `lichtflackern` laufen als globale Aequivalente ohne Clipping-Leaks ausserhalb des Zielraums.
- GIF-Vorgaben fuer `kaputt`/`feuer`/`schleim` laufen als echte Loops in nativen und fallback Pfaden; `opacity`/`playbackSpeed` bleiben instanzscharf steuerbar.
- Verifikation und Planungsartefakte konsistent abgeschlossen.

## Phase 4 - Maintainability Refactor (In Progress)
Ziel: `src/app.js` in eine modulare, wartbare Architektur ueberfuehren und gleichzeitig das Raummodell auf einen allgemeinen, datengetriebenen Standard umstellen (Room-CRUD, freie Polygone, Custom-Namen), ohne funktionale Regression in Runtime, Rendering, Persistenz, Save/API und Mobile-Bedienung.

Status: 35/38 Tasks abgeschlossen (Plan 4-1 bis Plan 4-5b erledigt); naechster priorisierter Schritt ist Plan 4-6 (GIF/Render/UI-Isolation).

Milestones:
1. Architektur-Skeleton: `src/app/*` Struktur + kompatibler Bootstrap-Entry.
2. State/Domain-Zerlegung: Config, pure Utilities, Runtime-State und Domain-Aktionen modularisieren.
3. Persistenz/API-Zerlegung: LocalStorage-Migration, Resolver/Preflight/Save-Client isolieren.
4. Raum-Generalization: Room-CRUD, freie Polygonraeume und editierbare Custom-Namen produktiv umsetzen.
5. Datenmigration/Kompatibilitaet: neuer Room-JSON-Standard mit verlustfreier Migration und Legacy-Load-Pfad.
6. P0 UX-Hotfix: Desktop-Running-Liste hart begrenzen, damit restliche Controls immer bedienbar bleiben.
7. P0 Decommission: Preview-Staging vollstaendig aus UI/Runtime/State entfernen.
8. P0 Editor-Polish-Hotfix: Polygon-Handle-Groesse nahe Zoom einstellbar und hitarea-konsistent.
9. P0 Immersion-Hotfix: `lichtflackern` als unregelmaessiges Horror-Random-Flicker, weiterhin strikt raumgeclippt.
10. P0 Edit-Flow-Hotfix: gesamtes Room-Polygon per LMB-Flaechen-Drag verschiebbar ohne Vertex-Edit-Regression.
11. P0 Editor-Paritaet-Hotfix: Handle-Groesse gilt fuer alle Editor-Punkte inkl. Ship-Polygon-Vertices.
12. P0 Flicker-Cleanup-Hotfix: `lichtflackern` ohne horizontale Weissstreifen, plus 10%-Mindest-Speed.
13. P0 Audio-Persistenz-Hotfix: Sound-Mapping-Auswahl bleibt reload-stabil und ist ueber Global Defaults speicherbar.
14. GIF/Render-Zerlegung: decoder-agnostisches GIF-Subsystem und Render-Pipelines modularisieren.
15. UI/Input-Zerlegung: Dashboard/Settings-Controller, Running-Bindings und Pan/Edit-Guards entkoppeln.
16. Hardening: Vollmatrix-Regression und Abschlussdokumentation.

Exit Criteria:
- `src/app.js` ist auf schlanke Bootstrap-Orchestrierung reduziert; Kernlogik lebt in Modulen.
- Settings unterstuetzt Raum anlegen/loeschen; jeder Raum bleibt frei als Polygon editierbar und hat einen frei editierbaren Namen.
- Bestehende Defaults/Profile sind auf den neuen JSON-Standard migriert, bei voller Rueckwaertskompatibilitaet fuer Bestandsdaten.
- Running-Liste bleibt auf Desktop auch unter Last begrenzt; keine Ueberdeckung/Vertreibung anderer Bedienmodule.
- Preview-Staging ist vollstaendig entfernt; es gibt keine Preview-Queue/Commit/Rollback-Pfade mehr.
- Polygon-Editor bietet eine sichtbare Handle-Groessensteuerung nahe Zoom; hohe Zoomstufen bleiben praezise editierbar.
- Handle-Groessensteuerung gilt konsistent fuer alle Polygon-Editoren inkl. Ship-Vertices (Visual + Hitarea).
- `lichtflackern` zeigt unregelmaessiges Random-Flicker statt periodischem Pulsieren und bleibt strikt auf den Zielraum begrenzt.
- `lichtflackern` zeigt keine horizontalen weissen Streifen/Glitch-Baender und unterstuetzt mindestens 10% Playback-Speed.
- Room-Polygon kann in Settings per Flaechen-Drag verschoben werden, ohne Insert/Delete/Vertex-Drag zu beeintraechtigen.
- Sound-Mappings/Sound-Auswahl bleiben nach Reload stabil und werden ueber Global Defaults verlustfrei gespeichert/geladen.
- Keine Regression bei Dashboard/Settings, Running-Liste, GIF-Looping (native+fallback), Clipping, Persistenz, Save/API und Mobile-UX.
- Phase-4-Artefakte und Verifikationsnachweise sind konsistent synchronisiert.

## Phase 5 - Multi-Device Live Sync + Final Beamer Output (In Progress)
Ziel: Gemeinsamer Live-State fuer Handy-Controller, PC-Controller und Raspberry-Pi-Beamer mit dediziertem Final-Output-Pfad, Align-Mode fuer physische Kalibrierung, strengem Audio-Routing und persistentem Server-Logging.

Status: Plan 5-1 (P5-T1..P5-T15), Plan 5-HF1 (P5-T19..P5-T24), Plan 5-HF2 (P5-T25..P5-T31) und Plan 5-HF3 (P5-T32..P5-T36) sind abgeschlossen (`.planning/phases/phase-05/5-1-SUMMARY.md`, `.planning/phases/phase-05/5-HF1-SUMMARY.md`, `.planning/phases/phase-05/5-HF2-SUMMARY.md`, `.planning/phases/phase-05/5-HF3-SUMMARY.md`); naechster Schritt ist Plan 5-2.

Milestones:
1. Final Output Core: Serverpfad `/output/final` liefert ausschliesslich FX/Animationen.
2. Live Sync Core: serverautoritiver Shared-State repliziert Trigger/Edit/Stop sofort auf alle Clients.
3. Align Mode: globale Kalibrier-Option blendet Polygone nur im Final-Output ein/aus; Controller behalten Polygone immer sichtbar.
4. Audio Routing: Sound laeuft nur auf Final-Output, Controller bleiben stumm.
5. Logging Core: persistente Dateilogs fuer Session-Events, State-Aenderungen und Fehler.
6. P0 Hotfix: Outside-Space-Sync vollstaendig (ON/OFF, Speed, relevante Parameter inkl. Join/Reconnect).
7. P0 Hotfix: `/output/final` stabiler Vollbild-FX-only-Pfad ohne UI-Leaks/White-Page; Align-Ausnahme bleibt erhalten.
8. P0 Hotfix: Sync-Reliability fuer Outside-Mode/-Direction und Room-Animation-Aktionen (First-Click, idempotentes Apply, Ack, Ordering/Versioning).
9. P0 Hotfix: Board-/Layout-Auswahl repliziert ueber alle Clients inkl. Join/Reconnect ohne Kontextdrift.
10. P0 Hotfix: Legacy-`Output Route` ist entfernt; dedizierter Ausgabepfad bleibt ausschliesslich `/output/final`.
11. Real Setup Gate: 3-Geraete-E2E (Handy + PC + Raspberry Pi) ohne P0-Blocker.

Exit Criteria:
- Final-Output verletzt nie den FX-only-Vertrag (kein Board-Bild, keine Raum-Polygone, keine Raumnamen).
- Aenderungen von Handy werden sofort auf PC und Beamer sichtbar (und umgekehrt fuer Controller-Aktionen).
- Outside-Space-State ist fuer alle Clients vollstaendig synchron (ON/OFF, Speed, relevante Parameter) inklusive Join/Reconnect.
- Outside `direction`/`mode` und Room-Animation-Aktionen sind beim ersten Klick deterministisch auf allen Clients synchron.
- Mutationsverarbeitung ist serverautoritativ-idempotent mit sofortigem Broadcast-Ack und versionsstabilem Ordering bei Burst-Toggles.
- Ausgewaehltes Board/Layout ist auf allen Clients identisch und bleibt auch bei Join/Reconnect synchron.
- Align-Mode ist global steuerbar und wirkt nur auf den Final-Output-Polygonlayer.
- `/output/final` zeigt keine Slider/Settings/Control-UI und faellt nicht in White-Page-Bootstraps; einzige Sichtbarkeitsausnahme ist Align-Overlay ON.
- `Output Route` ist nicht mehr Teil von UI/Runtime; `/output/final` bleibt der einzige dedizierte Ausgabepfad.
- Audio ist strikt auf Final-Output begrenzt.
- Persistente Serverlogs enthalten Session-, State- und Error-Ereignisse mit Kontext.
- Phase-5-Artefakte sowie globale Planungsdateien sind konsistent synchronisiert.

## Phase 6 - Board-Agnostic Catalog + English Operator Flow + Room Clusters (Completed)
Ziel: Das System von Nemesis-only auf boardspiel-agnostischen Betrieb umstellen: eigene Boards importieren und serverseitig speichern, Board-Auswahl dynamisch aus einem Katalog laden, den gesamten Operator-Flow auf Englisch vereinheitlichen und Room-Clusters als gruppierbare Triggerziele einfuehren, ohne Klickverhalten einzelner Raeume zu brechen. Bestehende Nemesis-Daten und vorhandene Polygon-/Animationskonfigurationen werden verlustfrei in einen neuen Standard migriert.

Status: Plan 6-1, Plan 6-HF1, Plan 6-2, Plan 6-HF2, Plan 6-HF3, Plan 6-HF4, Plan 6-HF5, Plan 6-HF6, Plan 6-HF7, Plan 6-HF8, Plan 6-HF9, Plan 6-HF10, Plan 6-HF11 und Plan 6-HF12 sind abgeschlossen; verify-work-6 P0-Blocker `English-only operator flow` bleibt geschlossen, HF6 ist mit `P6-T53-REGRESSION.md` geschlossen, HF7 ist mit `P6-T59-REGRESSION.md` geschlossen, HF8 ist mit `P6-T66-REGRESSION.md` geschlossen, HF9 ist mit `P6-T71-REGRESSION.md` geschlossen, HF10 ist mit `P6-T76-REGRESSION.md` geschlossen, HF11 ist mit `P6-T81-REGRESSION.md` geschlossen und HF12 ist mit `P6-T87-REGRESSION.md` (plus `P6-T86-ROOM-TARGET-REGRESSION.md`) geschlossen. Der nachgelagerte Hardening-Track wird in Phase 7 als dedizierter Sync-Overhaul mit strengeren Latenz- und Determinismuszielen weitergefuehrt.

Milestones:
1. M1 Board Catalog Foundation: kanonisches Board-Schema + dynamische Katalogquelle statt hardcoded A/B.
2. M2 Board Import Pipeline: Import-Validierung, serverseitige Persistenz und unmittelbare Katalog-Aktualisierung.
3. M3 Runtime Generalization: Render-/State-/Selection-Pfade nutzen boardId-kataloggetrieben statt Nemesis-Spezialfall.
4. M4 English-Only Operator Flow: UI-Texte, Statusmeldungen, relevante Logs/Errors und Doku in durchgaengigem Englisch.
5. M5 Room Clusters: frei definierbare Raumgruppen als Dropdown-Ziele fuer Gruppenstarts bei unveraendertem Einzelraum-Klick.
6. M6 Compatibility Migration: Legacy Nemesis + bestehende Polygone/Animation-Configs werden in das neue Standardschema ueberfuehrt.
7. M7 HF1 Closure Gate: Language Sweep fuer Control/Settings/Final-Flow schliesst den offenen P0-Blocker artefaktbasiert.
8. M8 Polygon Editor Safety: getrennte Vertex-Visibility-Toggles fuer Room vs Play Area mit Selection/Drag-Guard.
9. M9 Terminology + Visual Generalization: `Ship Polygon` -> `Play Area` und Entfernung alter Spezialraum-Sondermarkierungen.
10. M10 Room Creation Template Flow: neue Raeume koennen Polygonpunkte aus bestehender Vorlage kopieren.
11. M11 Room Editing Completion Hotfix: full geometry copy parity + keyboard room editing + empty-space deselection bei stabiler Play-Area.
12. M12 Selection Semantics Hotfix: persistente aktive Auswahl fuer visuell selektierte Raeume und Delete ohne Hold-/Drag-Zwang.
13. M13 Pointer Arbitration Hotfix: Click-Selection bleibt persistent nach Pointer-Up; Hold ist ausschliesslich Drag/Move.
14. M14 Click-Without-Move Hotfix: no-move kurzer Click selektiert persistent, Handles/Polygone bleiben nach Pointer-Up sichtbar.
15. M15 Vertex Selection Lifecycle Hotfix: Vertex-Interaktion bleibt stabil ohne Room-Deselect; direkter Vertex-Click ist delete-/panel-faehig ohne Dropdown-Re-Select.
16. M16 Drag UX Guard Hotfix (low risk): unbeabsichtigte Text-Selektion wird waehrend Room-Drag unterdrueckt, ohne Input-/Keyboard-Regression.
17. M17 Edge-Bubble Arbitration Hotfix: Edge-Bubble-Click behaelt persistente Room-Selektion und aktive Edge fuer Insert-Vertex ohne Re-Select.
18. M18 Room Deletion Tombstone Hotfix: geloeschte Rooms bleiben auch nach Reload/Restart/Defaults-Apply dauerhaft geloescht.
19. M19 Draft Persistence Hotfix: zuletzt gewaehlte Animation und Trigger-Parameter bleiben ueber Room-/Target-Wechsel als aktive Voreinstellung erhalten.
20. M20 Cluster UX Completion Hotfix: Cluster sind per CRUD im Operator-Flow verwaltbar und als `target` voll nutzbar.
21. M21 Cluster Stagger Start Hotfix: Cluster-Start unterstuetzt pro Trigger `stagger start` (`off` synchron, `on` kurzer randomisierter Versatz).
22. M22 Target Auto+Manual Parity Hotfix: Room-Klick setzt `target` automatisch auf Room, Target-Dropdown bleibt immer manuell bedienbar und manuelle Overrides auf Room/Cluster bleiben selection-unabhaengig moeglich.
23. M23 Cluster Fanout Reliability Hotfix: Cluster-Start fanout erreicht in sync/stagger deterministisch alle Cluster-Member (kein First-Room-Only-Start).
24. M24 Cluster Running Scope Hotfix: Running-Liste fuehrt dedizierten Scope `CLUSTER` (eigener Eintrag, Label `CLUSTER`, distinct color) inkl. konsistenter Stop/Edit-Semantik.
25. M25 Cluster Lifecycle Stability Hotfix: Cluster-Animationen bleiben hold-by-default stabil und werden nicht durch vorzeitige Cleanup-/Overwrite-Pfade entfernt.
26. M26 Board Context Determinism Hotfix: Board-Switch in Settings repliziert serverautoritativ sofort und zuverlaessig auf alle Clients inkl. `/output/final` (Ack/Version/Ordering/Reconnect).
27. M27 Cluster Controller Determinism Hotfix: Running-Liste fuehrt pro Cluster-Start exakt einen `CLUSTER`-Eintrag ohne member-`ROOM`-Duplikate bei weiterhin vollstaendigem Member-Rendering.
28. M28 Hardening: Import-/Migration-/Cluster-/Editor-Regression inkl. Reload/Restart/Join-Paritaet dokumentiert.

Exit Criteria:
- Board-Auswahl basiert ausschliesslich auf dynamischem Katalog; hardcoded Board A/B ist entfernt.
- Eigene Boards koennen importiert, serverseitig gespeichert und nach Neustart erneut geladen werden.
- Gesamter Operator-Flow (UI, Status, Doku-Hinweise, relevante Operator-Logs/Errors) ist Englisch-only.
- Room-Clusters sind frei konfigurierbar, im Dropdown als Ziel waehlbar und starten Effekte fuer alle enthaltenen Raeume.
- Klick auf einzelnen Raum auf dem Board selektiert weiterhin nur diesen Raum und startet keine Cluster-Selektion implizit.
- Legacy-Datenmigration fuer Nemesis/Polygone/Animation-Configs ist verlustfrei, idempotent und dokumentiert.
- Polygon-Editor trennt Room-Vertices und Play-Area-Vertices ueber getrennte Sichtbarkeitstoggles; versteckte Gruppen sind nicht drag-/selektierbar.
- Operator-/Model-Wording nutzt durchgaengig `Play Area`; `Ship Polygon` bleibt hoechstens als Legacy-Ladealias.
- Ehemalige Spezialraeume besitzen keine visuelle Sondermarkierung mehr.
- Room-Creation erlaubt Start aus bestehendem Polygon (Punkte werden als neue, unabhaengige Geometrie kopiert).
- Room-Copy uebernimmt vollstaendig alle Room-Geometry-Properties inkl. Scale/Offset/Transform als tiefe Kopie.
- Keyboard-Editing fuer selektierten Room funktioniert ueber `CTRL+C`, `CTRL+V` und `Delete` ohne Shortcut-Kollision.
- Ein visuell selektierter Room (Polygon/Handles sichtbar) gilt immer als aktive Auswahlquelle fuer Room-Hotkeys.
- `Delete` loescht aktiv selektierte Raeume sofort ohne Abhaengigkeit von LMB-Hold oder Drag.
- Single-Click auf Room setzt persistente Selection; Pointer-Up beendet nur Pointer-Session, nicht die aktive Selection.
- Kurzer Click ohne Move selektiert den Room persistent; persistente Selection darf nicht erst durch kurzes Verschieben entstehen.
- Room-Polygone/Handles bleiben sichtbar bis expliziter Deselection (Empty-Space) oder Selektion eines anderen Rooms.
- Pointer-Arbitration trennt deterministisch Selection (`click`) von Drag (`hold/move`); Hold ist kein Selection-Zwang.
- Drag bleibt voll funktionsfaehig und threshold-basiert; no-move Click-Fix darf Drag nicht blockieren.
- Vertex-Click innerhalb eines selektierten Rooms laesst Room-Selektion/Handles bestehen und wechselt nur den aktiven Vertex-Kontext.
- Vertex-Move/Delete bleibt nach direktem Vertex-Click stabil; Delete-Key/Panel arbeiten ohne Dropdown-Re-Select.
- Pointer-Arbitration trennt Room-Drag und Vertex-Edit robust, sodass Room-Selection nicht durch Vertex-Pointerevents verlorengeht.
- Unbeabsichtigte Browser-Textmarkierung wird waehrend Room-Drag unterdrueckt (mindestens fuer den Drag-Lifecycle), ohne Textinput-Bedienung ausserhalb des Drags zu brechen.
- Edge-Bubble-Click zwischen Vertices behaelt persistente Room-Selektion und eine stabile aktive Edge fuer direkten Insert-Vertex-Flow.
- Geloeschte Rooms bleiben ueber Save/Reload/Restart/Defaults-Apply dauerhaft geloescht; defaults-merge/overlay rehydriert keine getombstoneten Rooms.
- Room-Animation-Drafts bleiben ueber Room-/Target-Wechsel erhalten; Dropdown-Animation und Parameter werden nicht implizit auf Defaults resetet.
- Draft-Persistenz ist praezisiert: Animation + Parameter bleiben stabil, `target` ist explizit ausgenommen.
- Raumklick auf dem Board setzt `target` automatisch auf den geklickten Room, ohne Animation-/Parameter-Drafts zu aendern.
- `target`-Dropdown bleibt immer manuell bedienbar (auch ohne aktive Room-Selektion); deaktivierter Selection-Zustand ist unzulaessig.
- Nach Auto-Set per Raumklick bleibt manueller Target-Wechsel auf Room/Cluster jederzeit moeglich, unabhaengig vom Selection-State.
- Cluster koennen in der Operator-UX erstellt/bearbeitet/geloescht werden und bleiben board-spezifisch persistent.
- Cluster sind in `target` waehlbar; Start auf Cluster fuehrt Fanout fuer alle Cluster-Raeume aus.
- Pro Trigger ist `stagger start` verfuegbar: `off` startet alle Cluster-Raeume zeitgleich, `on` startet mit kurzem randomisiertem Versatz je Room.
- Cluster-Fanout bleibt member-vollstaendig fuer beide Modi (`off`/`on`); kein Cluster-Member geht im Startpfad verloren.
- Running-Liste fuehrt Cluster-Starts als dedizierten Scope `CLUSTER` mit klar unterscheidbarer Farbe statt ROOM/global-inside-Mischdarstellung.
- Stop/Edit auf `CLUSTER`-Eintraegen arbeitet robust und konsistent fuer Cluster-Run-Kontext ohne Regression bestehender Guards.
- Cluster-Animationen verhalten sich lifecycle-paritaetisch zu Room-Animationen: hold-by-default bleibt stabil, kein unerwartetes Verschwinden nach dem Start.
- Cluster-Start/Edit/Stop/Cleanup nutzen instanzscharfe Kontextbindung; keine vorzeitige Selbstentfernung durch overwrite oder stale cleanup.
- Running-Liste ist bei Cluster-Start deterministisch single-entry (`CLUSTER` only); zusaetzliche member-`ROOM`-Eintraege fuer denselben Trigger sind ausgeschlossen.
- Single-entry `CLUSTER` bleibt ein sichtwirksamer Controller: alle Cluster-Member werden weiterhin animiert (sync + stagger) und Stop/Edit auf `CLUSTER` propagiert konsistent.
- Board/Layout-Kontextwechsel aus Settings repliziert deterministisch beim ersten Toggle auf alle Controller und `/output/final` ohne manuelle Wiederholung.
- Board-Context-Sync ist serverautoritativ versioniert; Ack/Reconnect/Ordering verhindern stale apply und Kontextdrift.
- Buttons/Hotkeys funktionieren auf derselben persistenten Selection-Quelle wie visuelle Handles/Polygone.
- Klick auf leere Boardflaeche setzt Room-Selektion deterministisch auf `none`.
- Play-Area-Verhalten bleibt durch Room-Copy/Keyboard/Deselection unveraendert.
- Phase-6-Artefakte sowie `.planning/STATE.md`, `.planning/ROADMAP.md` und `.planning/CURRENT_PHASE.md` sind konsistent synchronisiert.
- verify-work-6 Follow-up P0-Blocker `English-only operator flow` ist mit HF1-Regressionsevidenz explizit geschlossen.

## Phase 7 - Multi-Device Sync Determinism + Low-Latency Final Output (Completed)
Ziel: End-to-end Sync-Latenz spuerbar reduzieren und deterministisches first-click Apply/Stop ueber alle Clients erreichen, mit priorisiertem low-latency Pfad fuer `/output/final`, robuster Event-Pipeline (ordering/ack/dedup/backpressure) sowie messbarer Telemetrie und Regression-Absicherung.

Status: Plan 7-1, 7-HF1, 7-HF2, 7-HF3, 7-HF4, 7-HF5, 7-HF6, 7-HF7, 7-HF8, 7-HF9 und 7-HF10 sind abgeschlossen (`.planning/phases/phase-07/7-1-SUMMARY.md`, `.planning/phases/phase-07/7-HF1-SUMMARY.md`, `.planning/phases/phase-07/7-HF2-SUMMARY.md`, `.planning/phases/phase-07/7-HF3-SUMMARY.md`, `.planning/phases/phase-07/7-HF4-SUMMARY.md`, `.planning/phases/phase-07/7-HF5-SUMMARY.md`, `.planning/phases/phase-07/7-HF6-SUMMARY.md`, `.planning/phases/phase-07/7-HF7-SUMMARY.md`, `.planning/phases/phase-07/7-HF8-SUMMARY.md`, `.planning/phases/phase-07/7-HF9-SUMMARY.md`, `.planning/phases/phase-07/7-HF10-SUMMARY.md`); verbleibende Hardening-Themen werden in Phase 8 weitergefuehrt.

Milestones:
1. M1 Deterministic Event Contract: mutation envelope mit ordering-/ack-/dedup-Regeln.
2. M2 Ordered Server Pipeline: ingest->commit->fanout deterministisch und backpressure-stabil.
3. M3 Deterministic Client Apply: stale-drop und idempotentes apply ohne second-click Effekte.
4. M4 Priority Stop Path: `stop/toggle-off/clear-all` preemptiv ohne visual/audio Reste.
5. M5 Final Fast Path: `/output/final` reagiert priorisiert mit minimalem apply overhead.
6. M6 GIF Responsiveness: room GIF trigger-to-first-frame Latenz deutlich reduziert.
7. M7 Telemetry and Tracing: P50/P95/P99 pro Hop/Rolle mit mutation correlation.
8. M8 Non-Regression Closure: room/cluster, align-mode, audio-role-routing, persistence bleiben stabil.
9. M9 Polling Determinism Pivot: server-only source of truth, snapshot-versioned polling (120-250 ms), no optimistic local states, optional WS wakeup hints.
10. M10 Trigger/Audio/Stagger Consistency Hotfix: snapshot-trigger full-run parity, explicit-stop-only lifecycle, audio stale-replay guard, sequential stagger offset slider.
11. M11 Draft Immutability Hotfix: Start mutiert keine Draft-UI; room-click bleibt einziger auto-target Pfad; room/cluster parity fuer Serienstarts.
12. M12 Align/Board-Switch Determinism Hotfix: Align-Mode serverautoritativ ueber alle Clients inkl. `/output/final`; Board-Switch leert Running deterministisch ohne Alt-Reste.
13. M13 Board-Context Residue Elimination Hotfix: switch-clear als authoritative atomare Transaktion, snapshot sanitize vor persist/broadcast, reconnect board-context filter mit Invariante `crossBoardResidueCount = 0`.
14. M14 Stop-Action Determinism Hotfix: Running-List-Stop routed strikt als stop-only command ohne create/start side-effects; serverautoritative Stop-Propagation bleibt rollenparitaetisch inkl. `/output/final`.
15. M15 Global-Outside Stop + Hover Stability Hotfix: all-scope stop parity inkl. `global-outside`, vereinheitlichte globale stop semantics server/client und flickerfreies Running-List-hover behavior.
16. M16 Start-Lifecycle Determinism + Status Arbitration Hotfix: Start-Mutationen duerfen nicht sofort neutralisiert werden; `board switched` bleibt nicht-maskierendes Kontextsignal; full-scope start/stop parity (`room`, `global-inside`, `global-outside`, `cluster`) bleibt deterministisch inkl. `/output/final`.
17. M17 Root-Cause Debug + Start Dispatch/Apply Determinism Hotfix: reproduzierbare Analyse fuer `start ignored/overwritten`, gemeinsamer Fix ueber Start-Dispatch + Server-Apply + Snapshot-Apply, status-non-masking und harte Running-Smoke-Gates fuer `room`/`global-inside`/`cluster`.

Exit Criteria:
- E2E input-to-final-apply erreicht Zielwerte (P50 <= 90 ms, P95 <= 180 ms, P99 <= 280 ms) oder dokumentierte akzeptierte Restabweichung.
- Stop/Toggle-Off reagieren first-click-deterministisch ohne kurz haengende visuelle/audio Reste.
- Event-Pipeline ist gehaertet fuer ordering, ack, dedup, backpressure und semantisch sicheres coalescing.
- `/output/final` zeigt priorisierte low-latency Reaktion ohne UI-overhead-induzierte Verzoegerung.
- Telemetrie/Tracing und Regression-Suite liefern reproduzierbare Evidenz fuer Latenz und Determinismus.
- Korrektheitspfad ist deterministisch polling-basiert: sichtbare Client-Zustaende kommen nur aus serverseitigen Snapshots mit monotoner Version.
- Lokale optimistische Zielstates sind entfernt; WS ist optionaler Wakeup-Hint und nicht Teil der Korrektheitslogik.
- Globale Trigger laufen client-uebergreifend vollstaendig und werden nur per explizitem Snapshot-Stop vorzeitig beendet.
- Audio startet/stoppt revisionsstabil ohne spaete Alt-Effekte; cluster stagger ist sequenziell mit konfigurierbarem Offset repliziert.
- Start einer room/cluster Animation mutiert Draft-Felder nicht; Dropdowns (`animation`, `target`) und Slider bleiben nach Start unveraendert.
- Board-Raumklick bleibt als einziger erlaubter Auto-Pfad fuer `target` erhalten; Start aendert `target` nicht.
- Workflow `mehrere Raeume nacheinander mit gleichen Einstellungen` bleibt stabil fuer room- und cluster-targets.
- Align-Mode-Toggle ist serverautoritativ und synchron auf allen Clients inklusive `/output/final` sichtbar.
- Board-Wechsel fuehrt deterministisch zu einer leeren Running-Liste ohne Reste vom vorherigen Board (inkl. Reload/Reconnect).
- Board-Switch-Clear ist als atomare authoritative Transaktion sichtbar (kein Zwischenzustand mit neuem Board + alten Running-Eintraegen).
- Persistierte und broadcastete Server-Snapshots enthalten keine cross-board Running-Reste.
- Reconnect-Hydrierung filtert Running strikt auf den aktiven Board-Kontext; Invariante `crossBoardResidueCount = 0` bleibt in Pflichtmatrix stabil.
- Running-List-Stop darf niemals eine neue Instanz erzeugen; `stop-animation` beendet exakt die gewaehlte `animation.id` ohne create/start side-effects.
- Running-List-Stop-Paritaet gilt explizit fuer `room`, `global-inside`, `global-outside` und `cluster`; `global-outside` hat keinen Sonder-/No-Op-Pfad.
- Stop-Mutationen sind serverautoritativ versionsgebunden und auf allen Clients inkl. `/output/final` deterministisch sichtbar.
- UI-Stop-Aktion ist gegen Mehrfachklick/Re-Trigger gehaertet (inflight-guard), ohne room/global/cluster stop semantics zu regressieren.
- Running-List-Hover bleibt stabil highlightend ohne Blink-/Loop-Flicker und entspricht visuell den restlichen Button-Hover-Zustaenden.
- Start-Mutationen bleiben nach Trigger erhalten und werden nicht durch nachlaufende Kontext-/Board-Statusmutationen neutralisiert oder ueberschrieben.
- `board switched` maskiert laufende Start-/Running-Statusereignisse nicht; Statusprioritaet bleibt deterministisch (`start/run > context info`).
- Alle Animationsarten (`room`, `global-inside`, `global-outside`, `cluster`) sind startbar/stoppbar mit lifecycle-paritaetisch stabilem Running-State bis Timerablauf oder explizitem Stop/Clear.
- Root-Cause fuer `start ignored/overwritten` ist im echten Laufzeitpfad reproduzierbar dokumentiert (Dispatch -> Server-Apply -> Snapshot-Apply) und als Fix-Baseline nachweisbar.
- `room`, `global-inside` und `cluster` erscheinen nach Start deterministisch in der Running-Liste und bleiben aktiv bis Timerablauf oder explizitem `stop-animation`/`clear-all`.
- Statusmeldungen maskieren Start-/Running-Feedback nicht; Kontextinfos bleiben sichtbar, aber nicht lifecycle-ueberschreibend.
- Verify-Artefakte enthalten verpflichtend eine echte Reproduktion des Blockers und den anschliessenden PASS-Nachweis im selben Gate-Set.
- Keine Regression in room/cluster, align-mode, audio-role-routing und persistence.
- Phase-7-Artefakte sowie `.planning/STATE.md`, `.planning/ROADMAP.md` und `.planning/CURRENT_PHASE.md` sind konsistent synchronisiert.

Execution Update (7-HF2):
- Server exposes `/api/live/snapshot` (authoritative read) and `/api/live/command` (write-only commands).
- Client runtime applies only versioned snapshots with adaptive polling cadence (~120ms active / ~250ms idle + backoff/jitter).
- Deterministic 4-client regression incl. `/output/final` is PASS (`debug/p7-hf2-*`).

Execution Update (7-HF3):
- Global trigger lifecycle is revisioned server-side (`globalTriggerRevisions` / `globalStopRevisions`) and applied once per trigger revision on clients.
- Explicit-stop-only global teardown and revision-aware audio dedup/stale-drop are active in snapshot apply path.
- Cluster stagger start is deterministic sequential with replicated `staggerOffsetMs` slider config; HF3 evidence PASS (`debug/p7-hf3-*`).

Execution Update (7-HF4):
- Room/cluster start path is draft-immutable: no start-side reset/jump of `animation`, `target`, or slider drafts.
- Control snapshot apply no longer back-writes `runtime.roomDraft` into local draft controls.
- HF4 regression/non-regression/latency evidence is PASS (`debug/p7-hf4-t12-output.json`, `debug/p7-hf4-t13-output.json`, `debug/p7-hf4-t14-output.json`).

Execution Update (7-HF5):
- Align toggle now flows as server-authoritative `context-update` with ack/version/dedup and snapshot-only apply across clients including `/output/final`.
- Polling and reconnect replay enforce strict stale/equal-version reject (`incomingVersion <= appliedVersion => drop`).
- Board switch clears running atomically in server context mutation and client apply prevents old-board residue rehydration.
- HF5 evidence is PASS (`debug/p7-hf5-t12-output.json`, `debug/p7-hf5-t13-output.json`, `debug/p7-hf5-t14-output.json`).

Next Wave:
- Plan 7-2 Hardening is unblocked and is now the next executable wave.

New Blocking Wave (verify-work 7-HF5 follow-up):
- Two remaining P0 blockers reopen the gate before 7-2: non-deterministic board-switch clear and reconnect cross-board residue rehydrate.
- Plan 7-HF6 is now the next executable wave; Plan 7-2 remains blocked until HF6 PASS.

Execution Update (7-HF6):
- Board-switch clear now runs as authoritative atomic context transaction with idempotent `contextSwitchTransactionId` guard.
- Server snapshots sanitize running entries before persist/broadcast so only `selectedBoard`-matching entries survive fanout.
- Reconnect/join hydration applies hard board-context filtering; deterministic regression confirms `crossBoardResidueCount = 0` across 4 clients incl. `/output/final` (`debug/p7-hf6-*`).

Gate Closure (7-HF6):
- Board-context residue elimination blocker is closed; Plan 7-2 remains unblocked as next wave.

Execution Update (7-HF7):
- Running-list stop routing is strict stop-only (`stop-animation`) and does not touch trigger/create paths.
- Server stop mutation is idempotent for stale/unknown IDs and cluster-linked stop reconciliation.
- Stop/clear snapshots are applied immediately from `live-session-update` with version/dedup guards across control + `/output/final`.
- UI stop controls are inflight-locked per animation ID (`Stopping...` disabled state) until snapshot confirmation.
- HF7 evidence PASS (`debug/p7-hf7-t12-output.json`, `debug/p7-hf7-t13-output.json`, `debug/p7-hf7-t14-output.json`).

Gate Closure (7-HF7):
- Stop-action determinism blocker is closed; Plan 7-2 is the next executable wave.

Execution Update (7-HF8):
- Running-list stop fuer `global-outside` ist stop-only gehaertet und bleibt frei von trigger/create/no-op drift.
- Globale stop semantics sind server/client vereinheitlicht (`global-inside` + `global-outside`) mit ack/version/dedup parity und idempotent stale handling.
- Running-List-Hover bleibt unter periodischem Refresh stabil (interaction guard + non-transform hover/focus path).
- HF8 evidence PASS (`debug/p7-hf8-t12-output.json`, `debug/p7-hf8-t13-output.json`, `debug/p7-hf8-t14-output.json`).

Gate Closure (7-HF8):
- Global-outside stop parity and hover stability blocker is closed; Plan 7-2 is the next executable wave.

New Blocking Wave (verify-work 7-HF8 follow-up):
- Kritischer P0-Regression-Blocker: Start-Mutationen werden nach Trigger sofort neutralisiert/ueberschrieben; dadurch starten ausser `global-outside` faktisch keine Animationen mehr stabil.
- `board switched` springt als Statussignal sofort zurueck und maskiert laufende Start-Events, was Running-Lifecycle und Operator-Feedback inkonsistent macht.
- Plan 7-HF9 ist als naechste execute-ready P0-Welle gesetzt; Plan 7-2 bleibt bis HF9-PASS blockiert.

Execution Update (7-HF9):
- Root-cause fix verhindert Board-Kontext-Mutation durch nachlaufende `room-draft-sync`/`align-toggle` context-updates und schuetzt frisch gestartete room/global/cluster Runs vor Neutralisierung.
- Status-Arbitration ist korrigiert: `board switched` bleibt kontextuell und maskiert Start-/Running-Feedback im Runtime-Sync nicht mehr.
- Pflichtmatrix bestaetigt all-scope start/stop parity + lifecycle persistence (`room`, `global-inside`, `global-outside`, `cluster`) ueber 4 Clients inkl. `/output/final`.
- HF9 evidence PASS (`debug/p7-hf9-t12-output.json`, `debug/p7-hf9-t13-output.json`, `debug/p7-hf9-t14-output.json`).

Gate Closure (7-HF9):
- Start-Lifecycle Determinism + Status-Arbitration blocker ist geschlossen; Plan 7-2 ist als naechste Hardening-Welle freigegeben.

New Blocking Wave (verify-work 7-HF9 follow-up):
- Kritischer P0-Blocker bleibt im Realbetrieb bestehen: `room`/`global-inside`/`cluster` starten nicht deterministisch stabil, Status blitzt nur kurz und faellt zurueck.
- Plan 7-HF10 ist als naechste execute-ready P0-Welle gesetzt: explizite Root-Cause-Reproduktion `start ignored/overwritten`, Fix ueber Start-Dispatch + Server-Apply + Snapshot-Apply, status-non-masking, harte Running-Smoke-Gates.
- Plan 7-2 bleibt bis HF10-PASS blockiert.

Execution Update (7-HF10):
- FAIL->PASS closure is complete: root cause reproduced with accepted-command/empty-running evidence (`debug/p7-hf10-t1-fail-output.json`) and fixed parity repro (`debug/p7-hf10-t1-pass-output.json`).
- Start dispatch metadata is deterministic for room/global-inside/cluster and server/client snapshot apply now preserve board-context lifecycle under missing-top-level-board edge cases.
- Hard smoke gate confirms room/global-inside/cluster start persistence until explicit stop/clear (`debug/p7-hf10-t6-smoke-output.json`).
- HF10 verify artifacts PASS (`debug/p7-hf10-t12-output.json`, `debug/p7-hf10-t13-output.json`, `debug/p7-hf10-t14-output.json`).

Gate Closure (7-HF10):
- Root-Cause-Dispatch/Apply blocker is closed; Plan 7-2 is unblocked as the next wave.

## Phase 8 - Multi-Play-Area + Board Image Import + Mars Outside Animations (In Progress)
Ziel: Mehrere getrennte Play-Areas pro Board produktiv nutzbar machen und inside/outside strikt auf die Vereinigungsflaeche aller Play-Areas umstellen; zusaetzlich Board-Import um einfachen Bildupload erweitern, damit neue Boards ohne JSON-Authoring erstellt und danach manuell polygonisiert werden koennen, sowie ein verpflichtendes Outside-Animationspaket fuer Mars mit Sandstorm-Video, Boomerang-Option, UI-Asset-Mapping und persistenter Definitionsverwaltung liefern.

Status: 70/70 Tasks abgeschlossen; Plan 8-1 (P8-T1..P8-T12), Plan 8-HF1 (P8-T18..P8-T24), Plan 8-HF2 (P8-T25..P8-T34), Plan 8-HF3 (P8-T35..P8-T40), Plan 8-HF4 (P8-T41..P8-T46), Plan 8-HF5 (P8-T47..P8-T52), Plan 8-HF6 (P8-T53..P8-T58), Plan 8-HF7 (P8-T59..P8-T64) und Plan 8-HF8 (P8-T65..P8-T70) sind umgesetzt und verifiziert (`.planning/phases/phase-08/8-1-SUMMARY.md`, `.planning/phases/phase-08/8-1-VERIFICATION.md`, `.planning/phases/phase-08/8-HF1-SUMMARY.md`, `.planning/phases/phase-08/8-HF1-VERIFICATION.md`, `.planning/phases/phase-08/8-HF2-SUMMARY.md`, `.planning/phases/phase-08/8-HF2-VERIFICATION.md`, `.planning/phases/phase-08/8-HF3-SUMMARY.md`, `.planning/phases/phase-08/8-HF3-VERIFICATION.md`, `.planning/phases/phase-08/8-HF4-VERIFICATION.md`, `.planning/phases/phase-08/8-HF5-VERIFICATION.md`, `.planning/phases/phase-08/8-HF6-VERIFICATION.md`, `.planning/phases/phase-08/8-HF7-VERIFICATION.md`, `.planning/phases/phase-08/8-HF8-VERIFICATION.md`). Naechste Welle: Plan 8-2 (Hardening Wave).

Milestones:
1. M1 Multi-Play-Area Model: kanonisches `playAreas[]` mit Legacy-Ladealias fuer Single-Area-Daten.
2. M2 Migration Safety: idempotente, verlustfreie Ueberfuehrung bestehender gespeicherter Daten.
3. M3 Union Runtime Semantics: inside/outside und Clipping basieren auf Union aller Play-Areas.
4. M4 Play-Area Editor UX: mehrere Areas koennen angelegt/geloescht/selektiert werden.
5. M5 Image Import Pipeline: Upload (`jpg`/`jpeg`/`png`/`webp`) wird serverseitig gespeichert und als Board-Hintergrund registriert.
6. M6 Non-Regression: Running/Save/Reload/Sync/`/output/final` bleiben stabil.
7. M7 P0 Hotfix Closure: Room-Klick-Selection hat Prioritaet (ohne Play-Area-Click-Selection), und Bildimport aktiviert neues Board sofort im Dropdown.
8. M8 Mars Outside Feature Pack: `Outside Sandstorm` (stumm), optionales Boomerang-Playback und neue Settings-Sektion `Outside Animations`.
9. M9 Outside Asset Mapping + Persistence: UI-editierbares Mapping (`gif`/`mp4`/coded key), UI-Create-Flow und persistente Definitionen/Settings.
10. M10 Outside Regression Closure: `Coded/Space` Restore, Sandstorm-Stabilisierung, stabile Editor-Inputs und atomarer `Apply changes` Commit.
11. M11 Outside HF4 Regression Closure: erneuter `Coded/Space` Restore, strikt typgebundener Asset-Picker und flickerfreier Boomerang-Vollzyklus.
12. M12 Outside HF5 Reverse Stability Closure: Root-Cause-basierter Fix fuer Sandstorm-Reverse-Flicker bei voller Boomerang-Zyklusparitaet ohne mp4-/Persistenz-Regression.
13. M13 Final Output Fullscreen Fit Closure: `/output/final` passt sich robust an Display-Aufloesung, Resize/Orientation/Fullscreen und DPR an.
14. M14 Boomerang Removal + Inside Parity Closure: Boomerang ist decommissioned; `Inside Animations` erreicht Outside-Paritaet mit definitionsgetriebenem Erweiterungsziel.
15. M15 HF8 Outside MP4 + Conditional Visibility + Apply-Only UX Closure: Outside-mp4 ist wiederhergestellt, Mode/Direction sind kontextsensitiv und redundante Asset-Commit-Buttons sind entfernt.

Exit Criteria:
- UI erlaubt mehrere getrennte Play-Areas pro Board inkl. persistenter CRUD-Bedienung.
- Inside/Outside-Logik verwendet ausschliesslich die Vereinigung aller Play-Areas.
- Legacy-Bestaende bleiben nach Schemaanhebung erhalten und werden idempotent migriert.
- Board-Import akzeptiert JSON und Bildupload; hochgeladene Bilder sind serverseitig gespeichert.
- Nach Bildupload ist manueller Polygon-Workflow direkt verfuegbar.
- Room-Klick in Settings selektiert den Room deterministisch; Play-Area-Selektion per Board-Klick ist entfernt.
- Erfolgreicher Bildimport macht das neue Board sofort im Dropdown sichtbar und setzt es direkt als aktive Auswahl.
- Importierte Bildboards ohne Start-Polygone sind ein gueltiger, stabiler Startzustand fuer manuelles Play-Area/Room-Editing.
- `Outside Sandstorm` ist als verpflichtende neue Outside-Animation vorhanden, nutzt `sandstorm.mp4` und bleibt ohne Audio.
- Outside-Animationseinstellungen sind aus dem Play-Area-Editor ausgelagert und leben in einer separaten Settings-Sektion `Outside Animations`.
- Dropdown-basierte Bearbeitung pro Outside-Animation ist deterministisch nutzbar.
- Asset-Mapping ist pro Outside-Animation in UI editierbar (`gif`/`mp4`/coded animation key); neue Outside-Animationen koennen in UI angelegt werden.
- Vorhandene Dateien aus `resources` sind als Asset-Quelle auswaehlbar.
- Outside-Animationsdefinitionen und Settings bleiben ueber Save/Reload/Restart/Defaults persistent und migrationsstabil.
- `Coded/Space` bleibt auf dem funktionierenden coded Star-Space-Pfad stabil (kein Black-Screen-Rueckfall).
- `Outside Sandstorm` spielt stabil ohne permanentes Restart-/Rewind-Flackern.
- Outside-Editor uebernimmt Type/Resource/Optionen nur ueber explizites `Apply changes` atomar im selben Commit.
- Asset-Picker ist typstreng: `coded` zeigt nur coded keys, `mp4` nur `.mp4` aus `resources`, `gif` nur `.gif` aus `resources`.
- `Apply changes` sowie Save/Reload/Restart bleiben fuer Outside-Einstellungen intakt und deterministisch.
- `/output/final` skaliert im Browser-Fullscreen auf jede Display-Aufloesung ohne Top-Left-Offset oder Letterbox-Bug.
- Canvas/Stage werden bei Resize, Orientation, Browser-Fullscreen und Device-Pixel-Ratio-Aenderung deterministisch neu berechnet.
- Rendering/Koordinaten/Clipping bleiben unter dynamischem Reflow/Fit regressionsfrei intakt.
- Boomerang ist vollstaendig entfernt (UI/Runtime/Persistenznutzung); Legacy-Lesen alter boomerang-Felder bleibt tolerant als no-op.
- `Inside Animations` ist Outside-paritaetisch verfuegbar (Dropdown/Create/Apply/Type-Filter/Persistenz).
- Pro Inside-Animation sind `assetType` (`coded`/`gif`/`mp4`) und typspezifisch gefilterte `assetRef` aus `resources` editierbar.
- Neue Inside-/Outside-Animationen sind definitionsgetrieben ueber UI hinzufuegbar, ohne Codeaenderung pro neuem Eintrag.
- Outside-mp4-Playback ist fuer non-boomerang Betrieb wieder stabil verfuegbar und regressionsfrei gegen gif/coded abgesichert.
- `outside mode`/`outside direction` sind nur in fachlich anwendbaren Kontexten sichtbar und fuer `gif`/`mp4` sowie nicht-applicable coded renderer ausgeblendet.
- Redundante `Use selected resource asset`-Buttons sind entfernt; `Apply changes` bleibt der einzige Commitpfad.
- Phase-8-Artefakte sowie `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/CURRENT_PHASE.md` sind konsistent synchronisiert.

Execution Update (8-1):
- Board-Profile nutzen jetzt kanonisch `playAreas[]` + `selectedPlayAreaId` mit Legacy-Ladealias fuer `playAreaPolygon`/`shipPolygon`.
- Inside/Outside-Clipping verwendet die Union aller gueltigen Play-Area-Polygone (kein Single-Polygon-Fallbackpfad).
- `/api/boards/import` unterstuetzt neben JSON jetzt Multipart-Bildupload (`jpg`/`jpeg`/`png`/`webp`) mit serverseitiger Asset-Persistenz und sofortiger Katalogsichtbarkeit.

Execution Update (8-HF1):
- Play-Area-Selektion per Board-Klick ist entfernt; Room-Klick bleibt der kanonische Selection-Pfad im Settings-Overlay.
- Import-Success aktualisiert den Katalog deterministisch im selben Flow (inkl. stale-catalog guard) und setzt das neue Board sofort aktiv.
- Leere importierte Bildboards bleiben als gueltiger manueller Startzustand erhalten (kein Runtime-Ausfilterungspfad fuer empty rooms).

New Blocking Wave (Phase 8 follow-up):
- Verbindliches P0-Betriebsfeedback setzt Plan 8-HF1 als naechste execute-ready Hotfix-Welle vor Plan 8-2.
- Blocker A: Play-Area-Click-Selektion ueberlagert Room-Klick-Selektion im Settings-Board.
- Blocker B: Bildimport zeigt keinen sofort sichtbaren Success-Flow (Dropdown + Auto-Select).

Gate Closure (8-HF1):
- P0-Blocker A/B sind geschlossen; Plan 8-HF2 ist als naechste Welle freigegeben.

New Blocking Wave (Phase 8 Mars feature pack):
- Verbindliches Featurepaket fuer neues Board `Mars` wird als P0 vor Plan 8-2 priorisiert und als Plan 8-HF2 execute-ready gesetzt.
- Pflichtumfang: neue Outside-Animation `Outside Sandstorm` auf `sandstorm.mp4` (stumm), optionale Boomerang-Wiedergabe, ausgelagerte Settings-Sektion `Outside Animations`, UI-editierbares Asset-Mapping inkl. Create-Flow und `resources`-Asset-Auswahl, persistente Definitionen/Settings.
- Plan 8-2 bleibt bis 8-HF2-PASS blockiert.

Gate Closure (8-HF2):
- P0-Mars-Featurepaket ist geschlossen; Outside Sandstorm, boomerang playback, outside settings ownership, asset mapping/create/resource picker und persistence/migration guards sind PASS.

New Blocking Wave (Phase 8 Outside regression follow-up):
- Verbindliches P0-Betriebsfeedback priorisiert Plan 8-HF3 als unmittelbare Hotfix-Welle vor Plan 8-2.
- Blocker A: `Coded/Space` rendert aktuell nur schwarz statt erwarteter coded animation.
- Blocker B: `Outside Sandstorm` flackert/rewindet als Restart-Loop und ist nicht stabil abspielbar.
- Blocker C: Boomerang-Checkbox ist nicht setzbar; Asset-Type-Dropdown springt auf alten Wert zurueck.
- Blocker D: Outside-Editor braucht verpflichtenden `Apply changes`-Commit fuer atomares Uebernehmen von Type/Resource/Optionen.
- Plan 8-2 bleibt bis 8-HF3-PASS blockiert.

Gate Closure (8-HF3):
- P0-Outside-Regressionen sind geschlossen: coded restore, sandstorm stability, editor input stability und atomarer apply-path sind PASS.
- Plan 8-2 ist als naechste Hardening-Welle freigegeben.

New Blocking Wave (Phase 8 Outside regression follow-up 2):
- Neues verpflichtendes P0-Betriebsfeedback priorisiert Plan 8-HF4 als unmittelbare Hotfix-Welle vor Plan 8-2.
- Blocker A: `Coded/Space` ist erneut regressiert und zeigt nur Black-Screen statt coded Star-Space.
- Blocker B: Asset-Picker filtert nicht typspezifisch (`coded`/`mp4`/`gif`) und bietet ungueltige Quellen.
- Blocker C: Boomerang-Playback flickert/instabil, statt vollstaendig Forward->Reverse->Repeat ohne sichtbare Restart-Uebergaenge.
- Plan 8-2 bleibt bis 8-HF4-PASS blockiert.

Gate Closure (8-HF4):
- P0-Outside-Rueckfaelle sind geschlossen: coded path restore, strikt typspezifischer picker und boomerang full-cycle stability sind PASS.

New Blocking Wave (Phase 8 Outside reverse-lifecycle follow-up):
- Neues verpflichtendes P0-Betriebsfeedback priorisiert Plan 8-HF5 als unmittelbare Hotfix-Welle vor Plan 8-2.
- Blocker A: `Outside Sandstorm` flackert im Boomerang-Reverse-Abschnitt stark; Root-Cause liegt im Reverse-Playback-Lifecycle.
- Blocker B: Boomerang muss als nahtloser full-cycle (`forward -> smooth reverse -> repeat`) ohne sichtbares Reverse-Flicker laufen.
- Blocker C: normaler mp4-Playback-Pfad ohne Boomerang darf nicht regressieren; `Apply changes`/Persistenz muessen intakt bleiben.
- Plan 8-2 bleibt bis 8-HF5-PASS blockiert.

Gate Closure (8-HF5):
- Reverse-Flicker-Blocker ist geschlossen: Root-Cause isoliert, Reverse-Lifecycle fix geliefert, full-cycle Boomerang laeuft stabil.
- Non-Boomerang mp4 und Apply/Persistenz bleiben regressionsfrei verifiziert (`P8-T49-MP4-NON-BOOMERANG-REGRESSION.md`, `P8-T50-APPLY-PERSISTENCE-REGRESSION.md`).

New Blocking Wave (Phase 8 final-output fullscreen follow-up):
- Neues verpflichtendes P0-Problem priorisiert Plan 8-HF6 als unmittelbare Hotfix-Welle vor Plan 8-2.
- Blocker A: `/output/final` skaliert im Browser-Fullscreen nicht auf Display-Aufloesung und zeigt nur einen kleinen Top-Left-Bereich.
- Blocker B: Stage/Canvas-Recompute bei Resize/Orientation/Fullscreen/DPR ist nicht deterministisch; Offset-/Letterbox-Drift entsteht.
- Blocker C: Fullscreen-Fit-Fix darf Rendering/Coords/Clip nicht regressieren.
- Plan 8-2 bleibt bis 8-HF6-PASS blockiert.

Gate Closure (8-HF6):
- Fullscreen-Fit-Blocker ist geschlossen: `/output/final` nutzt robustes viewport+dpr Recompute fuer resize/orientation/fullscreen/DPR und fuellt den Zielbereich ohne Top-Left-Offset.
- Rendering/Coords/Clip bleiben unter dynamischem Reflow regressionsfrei (`P8-T57-FINAL-OUTPUT-REFLOW-REGRESSION.md`, `8-HF6-VERIFICATION.md`).

New Blocking Wave (Phase 8 boomerang-removal + inside-parity follow-up):
- Neues verpflichtendes P0-Feature-/Cleanup-Paket priorisiert Plan 8-HF7 als unmittelbare Welle vor Plan 8-2.
- Blocker A: Boomerang muss vollstaendig entfernt werden (UI, Runtime, Persistenznutzung), Legacy-Lesen bleibt nur als no-op-Kompatibilitaet.
- Blocker B: Inside-Animation-Editor braucht Outside-Paritaet (eigene Sektion, Dropdown/Create, assetType `coded`/`gif`/`mp4`, typspezifischer Picker, `Apply changes`).
- Blocker C: Persistenz fuer Inside-Definitionsmodell (save/load/defaults) muss Outside-paritaetisch robust sein.
- Blocker D: Zielbild fordert definitionsgetriebene Erweiterbarkeit fuer neue Inside/Outside-Animationen ohne Codeaenderung.
- Plan 8-2 bleibt bis 8-HF7-PASS blockiert.

Gate Closure (8-HF7):
- Boomerang-Decommission ist geschlossen; UI/Runtime/Persistenzpfad verwenden kein aktives Boomerang-Feature mehr.
- Inside-Animationsparitaet ist geliefert: eigene Sektion, Create/Dropdown, typed mapping + Apply-Atomicity und persistentes Definitionsmodell sind PASS.

New Blocking Wave (Phase 8 outside mp4 + conditional visibility follow-up):
- Neues verpflichtendes P0-Feedback priorisiert Plan 8-HF8 als unmittelbare Hotfix-Welle vor Plan 8-2.
- Blocker A: Outside-mp4 spielt nicht mehr (gif/coded funktionieren), Root-Cause muss isoliert und Playback wiederhergestellt werden.
- Blocker B: `outside mode`/`outside direction` muessen kontextsensitiv sichtbar sein und fuer `gif`/`mp4` sowie nicht-applicable coded renderer verborgen bleiben.
- Blocker C: redundante `Use selected resource asset`-Buttons muessen entfernt werden; `Apply changes` bleibt einziger Commitpfad.
- Plan 8-2 bleibt bis 8-HF8-PASS blockiert.

Gate Closure (8-HF8):
- Outside-mp4-Restore ist geschlossen; non-boomerang Forward-Loop-Playback ist wieder stabil und evidenzbasiert dokumentiert.
- `outside mode`/`outside direction` folgen kontextsensitiver Visibility-Logik (nur coded `outside-space`) und sind fuer `gif`/`mp4` ausgeblendet.
- Apply-only UX ist durchgesetzt; redundante `Use selected resource asset`-Buttons sind entfernt.
- Plan 8-2 ist als naechste Hardening-Welle freigegeben.

## Deferred (Post-Phase-2)
- Kamera/CV-Ausrichtung
- Cloud-/WAN-Mehrstandortbetrieb
- Vollwertiger Effekt-Editor
