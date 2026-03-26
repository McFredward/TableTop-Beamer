# ROADMAP

## Direction
Liefere zuerst einen stabilen Vertical Slice fuer OG-Nemesis (Phase 1), erweitere danach auf wiederholbaren Session-Betrieb mit Profilen und Datenzonen (Phase 2), halte den Runtime-Operator-Flow in Phase 4 bewusst preview-frei, fuehre in Phase 5 einen serverautoritativen Multi-Device-Livebetrieb mit dediziertem Final-Beamer-Output ein und generalisiere in Phase 6 auf boardspiel-agnostischen Betrieb mit englischem Operator-Flow.

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

## Phase 6 - Board-Agnostic Catalog + English Operator Flow + Room Clusters (In Progress)
Ziel: Das System von Nemesis-only auf boardspiel-agnostischen Betrieb umstellen: eigene Boards importieren und serverseitig speichern, Board-Auswahl dynamisch aus einem Katalog laden, den gesamten Operator-Flow auf Englisch vereinheitlichen und Room-Clusters als gruppierbare Triggerziele einfuehren, ohne Klickverhalten einzelner Raeume zu brechen. Bestehende Nemesis-Daten und vorhandene Polygon-/Animationskonfigurationen werden verlustfrei in einen neuen Standard migriert.

Status: Plan 6-1, Plan 6-HF1, Plan 6-2, Plan 6-HF2, Plan 6-HF3, Plan 6-HF4, Plan 6-HF5, Plan 6-HF6, Plan 6-HF7, Plan 6-HF8, Plan 6-HF9, Plan 6-HF10 und Plan 6-HF11 sind abgeschlossen; verify-work-6 P0-Blocker `English-only operator flow` bleibt geschlossen, HF6 ist mit `P6-T53-REGRESSION.md` geschlossen, HF7 ist mit `P6-T59-REGRESSION.md` geschlossen, HF8 ist mit `P6-T66-REGRESSION.md` geschlossen, HF9 ist mit `P6-T71-REGRESSION.md` geschlossen, HF10 ist mit `P6-T76-REGRESSION.md` geschlossen und HF11 ist mit `P6-T81-REGRESSION.md` geschlossen. Naechster Schritt ist Plan 6-3 (Hardening + Operator Verification).

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
27. M27 Hardening: Import-/Migration-/Cluster-/Editor-Regression inkl. Reload/Restart/Join-Paritaet dokumentiert.

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
- Board/Layout-Kontextwechsel aus Settings repliziert deterministisch beim ersten Toggle auf alle Controller und `/output/final` ohne manuelle Wiederholung.
- Board-Context-Sync ist serverautoritativ versioniert; Ack/Reconnect/Ordering verhindern stale apply und Kontextdrift.
- Buttons/Hotkeys funktionieren auf derselben persistenten Selection-Quelle wie visuelle Handles/Polygone.
- Klick auf leere Boardflaeche setzt Room-Selektion deterministisch auf `none`.
- Play-Area-Verhalten bleibt durch Room-Copy/Keyboard/Deselection unveraendert.
- Phase-6-Artefakte sowie `.planning/STATE.md`, `.planning/ROADMAP.md` und `.planning/CURRENT_PHASE.md` sind konsistent synchronisiert.
- verify-work-6 Follow-up P0-Blocker `English-only operator flow` ist mit HF1-Regressionsevidenz explizit geschlossen.

## Deferred (Post-Phase-2)
- Kamera/CV-Ausrichtung
- Cloud-/WAN-Mehrstandortbetrieb
- Vollwertiger Effekt-Editor
