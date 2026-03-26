# Phase 6 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

## Plan 6-1 - Board-Agnostic Foundation Wave (erste Ausfuehrungswelle, execute-ready)
- [x] DONE P6-T1 [P0] Katalogschema und kanonisches Board-Modell festlegen (`boardId`, metadata, roomCatalog, roomClusters) und Nemesis-Bestand darauf mappen.
- [x] DONE P6-T2 [P0] Server-Storage und Import-Validator implementieren (Importformat pruefen, persistieren, sichere Dateipfade, klare Fehlercodes).
- [x] DONE P6-T3 [P0] Board-Import-Endpunkt + Katalog-Refresh integrieren, damit importierte Boards ohne manuellen Neustart sichtbar sind.
- [x] DONE P6-T4 [P0] Client-Board-Auswahl auf dynamischen Katalog umstellen (kein hardcoded A/B, boardId als Source-of-Truth).
- [x] DONE P6-T5 [P0] Runtime-Pfade fuer Boarddaten generalisieren (Render/Selection/Profile anhand boardId aus Katalog aufloesen).

- [x] DONE P6-T6 [P0] Room-Cluster-Domain + Persistenzmodell einfuehren (`clusterId`, `name`, `roomIds`, board-spezifisch).
- [x] DONE P6-T7 [P0] Dropdown-Zielliste auf `room` + `cluster` erweitern und UI-Darstellung eindeutig kennzeichnen.
- [x] DONE P6-T8 [P0] Cluster-Trigger/Edit-Fanout implementieren (Animationsstart fuer alle Cluster-Raeume, Running-Liste instanzscharf konsistent).
- [x] DONE P6-T9 [P0] Einzelraum-Klickguard absichern: Board-Klick selektiert weiterhin nur den einzelnen Raum ohne implizite Cluster-Selektion.

- [x] DONE P6-T10 [P0] English-only Sweep fuer UI-Texte/Labels/Statusmeldungen im Operator-Flow umsetzen.
- [x] DONE P6-T11 [P0] Relevante Logs/Errors und README-/Operator-Hinweise auf Englisch vereinheitlichen.

- [x] DONE P6-T12 [P0] Legacy-Migration implementieren: Nemesis + bestehende Polygone/Animationsconfigs in neuen Standard ueberfuehren (idempotent, verlustfrei).
- [x] DONE P6-T13 [P0] Plan-6-1-Regression dokumentieren (Import/Persistenz, Katalogauswahl, Cluster-Verhalten, Einzelraumklick, English-Flow, Migration).

## Plan 6-HF1 - English-Only Blocker Hotfix Wave (execute-ready, vor 6-2)
- [x] DONE P6-T18 [P0] Operator-Language-Inventur fuer `Control`/`Settings`/`Final-Flow` erstellen (UI-Texte, Statusmeldungen, Fehlermeldungen, operatorrelevante Logs/Errors).
- [x] DONE P6-T19 [P0] Alle deutschen UI-Texte in `Control` und `Settings` auf Englisch umstellen (inkl. Labels, Buttons, Hinweise, leere Zustaende).
- [x] DONE P6-T20 [P0] Final-Flow, Statusmeldungen und Fehlermeldungen auf Englisch vereinheitlichen (inkl. server/client operatorrelevanter Fehlerpfade).
- [x] DONE P6-T21 [P0] Dokumentationskonsistenz herstellen (`README.md` + Phase-06-Artefakte) mit expliziter English-only Operator Policy.
- [x] DONE P6-T22 [P0] Language-Sweep-Regression artefaktbasiert nachweisen (Pattern-Checks + manuelle Sweep-Matrix + Ergebnisprotokoll).

## Plan 6-2 - Polygon Editor Safety + Play-Area Generalization (nach 6-HF1)
- [x] DONE P6-T23 [P0] Polygon-Editor-Toggles aufsplitten: `Show Room Vertices` und `Show Play Area Vertices` als getrennte Controls einfuehren.
- [x] DONE P6-T24 [P0] Hit-Test-/Selection-Guards implementieren: ausgeblendete Vertex-Gruppen sind nicht selektierbar, nicht dragbar und nicht als aktiv markierbar.
- [x] DONE P6-T25 [P0] UI/Model/Operator-Wording migrieren: `Ship Polygon` vollstaendig auf `Play Area` umbenennen (inkl. Labels, Settings, relevante Runtime-Texte).
- [x] DONE P6-T26 [P0] Legacy-Spezialraum-Visualisierung entfernen: ehemalige Spezialraeume folgen derselben Farbe/Markierung wie normale Raeume.
- [x] DONE P6-T27 [P0] Room-Creation erweitern: Option `Create room from existing polygon` (Template-Quelle waehlen, Punkte kopieren, neue `roomId` erzeugen).
- [x] DONE P6-T28 [P0] Persistenz-/Migration-Guard ergaenzen: Play-Area-Rename + Polygon-Template-Copy bleiben Save/Reload/Restart-stabil.
- [x] DONE P6-T29 [P0] Plan-6-2-Regression dokumentieren (Toggle-Separation, no-special-room-visuals, Play-Area-Wording, Template-Creation).

## Plan 6-HF2 - Room Editing Completion Hotfix (execute-ready, vor 6-3)
- [x] DONE P6-T30 [P0] Room-Copy vervollstaendigen: alle Room-Geometry-Eigenschaften (inkl. Scale/Offsets/Transform-Parameter) als tiefe Kopie uebernehmen.
- [x] DONE P6-T31 [P0] Keyboard-Editing fuer selektierten Room implementieren (`CTRL+C` copy, `CTRL+V` paste, `Delete` remove) inkl. Shortcut-Konfliktguards.
- [x] DONE P6-T32 [P0] Selection-Behavior absichern: Klick auf leere Boardflaeche setzt aktive Room-Selektion deterministisch auf `none`.
- [x] DONE P6-T33 [P0] Play-Area-Guard-Regression nachweisen: Room-Copy/Keyboard/Deselection veraendern Play-Area-Editing und Play-Area-Selection nicht.
- [x] DONE P6-T34 [P0] Plan-6-HF2-Regression dokumentieren (copy parity matrix, keyboard matrix, empty-space deselection, play-area non-regression).

## Plan 6-HF3 - Selection Semantics + Delete Consistency Hotfix (execute-ready, vor 6-3)
- [x] DONE P6-T35 [P0] Selection-Source-of-Truth fixieren: visuell selektierter Room (Polygon/Handles sichtbar) ist persistente aktive Selection, unabhaengig von Pointer-Hold.
- [x] DONE P6-T36 [P0] Delete-Flow korrigieren: `Delete` loescht aktiv selektierten Room sofort ohne LMB-Hold/Drag-Voraussetzung und ohne Input-Fokus-Kollision.
- [x] DONE P6-T37 [P0] Regression absichern: Copy/Paste/Delete + Empty-space deselect + Play-Area-Guard in kombinierter Matrix verifizieren.
- [x] DONE P6-T38 [P0] Artefakt-Sync abschliessen: PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP mit HF3-Ergebnis konsistent halten.

## Plan 6-HF4 - Pointer Arbitration + Persistent Selection Regression Hotfix (execute-ready, vor 6-3)
- [x] DONE P6-T39 [P0] Pointerdown/Click/Pointerup-Arbitration fixen: Single-Click selektiert Room persistent; Drag startet nur bei Move-Intention/Hold-Drag-Pfad.
- [x] DONE P6-T40 [P0] Selection-Lifecycle fixen: Room-Polygon/Handles bleiben nach Pointer-Up sichtbar bis Empty-Space-Deselect oder Room-Wechsel.
- [x] DONE P6-T41 [P0] Input-Consistency absichern: Hold bleibt Drag-only; Delete/Copy/Paste und Room-Buttons nutzen persistente Selection als einzige Source-of-Truth.
- [x] DONE P6-T42 [P0] Kombinierte Regression dokumentieren: Delete/Copy/Paste + Empty-space deselect + Play-Area-Guard unter neuer Pointer-Arbitration.
- [x] DONE P6-T43 [P0] Artefakt-Sync abschliessen: PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE auf HF4-Stand bringen.

## Plan 6-HF5 - Click-Without-Move Persistence Hotfix (execute-ready, vor 6-3)
- [x] DONE P6-T44 [P0] Click-only Selection fixen: kurzer Click auf Room (ohne Move) setzt persistente Selection deterministisch.
- [x] DONE P6-T45 [P0] Pointer-Up-Lifecycle stabilisieren: Room-Polygon/Handles bleiben nach no-move Click sichtbar bis Empty-Space-Deselect oder Room-Wechsel.
- [x] DONE P6-T46 [P0] Drag-Paritaet absichern: Hold/Move-Drag bleibt unveraendert funktionsfaehig, Selection-Click bleibt drag-frei.
- [x] DONE P6-T47 [P0] Guard-Regression dokumentieren: Empty-space deselect + Play-Area-Guard + Copy/Paste/Delete unter HF5-Flow matrixbasiert verifizieren.
- [x] DONE P6-T48 [P0] Artefakt-Sync abschliessen: PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE auf HF5-Stand bringen.

## Plan 6-HF6 - Vertex Selection Lifecycle Hotfix (execute-ready, vor 6-3)
- [x] DONE P6-T49 [P0] Pointer-Arbitration Room-vs-Vertex trennen: Vertex-Klick darf aktive Room-Selektion/Handles nicht deselektieren.
- [x] DONE P6-T50 [P0] Vertex-Selection-Lifecycle stabilisieren: direkter Vertex-Click bleibt aktive Auswahl fuer Move/Delete ohne Re-Select ueber Dropdown.
- [x] DONE P6-T51 [P0] Delete-Key + Delete-Panel an stabile Vertex-Auswahl binden, sodass Loeschen direkt nach Vertex-Click deterministisch funktioniert.
- [x] DONE P6-T52 [P1] Optionalen UX-Guard implementieren: waehrend Room-Drag Browser-Text-Selektion unterdruecken (nur low-risk, keine Input-Regression).
- [x] DONE P6-T53 [P0] HF6-Regression dokumentieren: Vertex-click persistence + delete/panel parity + empty-space deselect + play-area-guard + drag parity.
- [x] DONE P6-T54 [P0] Artefakt-Sync abschliessen: PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE auf HF6-Stand bringen.

## Plan 6-3 - Hardening + Operator Verification (nach 6-HF6)
- [ ] TODO P6-T14 [P1] Import-Konfliktstrategie finalisieren (duplicate boardId/name, Versionierung, Operator-Feedback).
- [ ] TODO P6-T15 [P1] Negativtests fuer fehlerhafte Boardimporte (ungueltige Polygone, fehlende Pflichtfelder, zu grosse Payloads) dokumentieren.
- [ ] TODO P6-T16 [P1] Multi-Board-Soaktest dokumentieren (schneller Boardwechsel, Cluster-Triggerfolgen, Reload/Restart-Paritaet).
- [ ] TODO P6-T17 [P1] Operator-E2E-Abnahme im Realsetup dokumentieren (Import -> Auswahl -> Trigger/Stop -> Save/Reload).
