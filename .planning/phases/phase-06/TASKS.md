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

## Plan 6-2 - Polygon Editor Safety + Play-Area Generalization (nach 6-HF1, execute-ready)
- [x] DONE P6-T23 [P0] Polygon-Editor-Toggles aufsplitten: `Show Room Vertices` und `Show Play Area Vertices` als getrennte Controls einfuehren.
- [ ] TODO P6-T24 [P0] Hit-Test-/Selection-Guards implementieren: ausgeblendete Vertex-Gruppen sind nicht selektierbar, nicht dragbar und nicht als aktiv markierbar.
- [ ] TODO P6-T25 [P0] UI/Model/Operator-Wording migrieren: `Ship Polygon` vollstaendig auf `Play Area` umbenennen (inkl. Labels, Settings, relevante Runtime-Texte).
- [ ] TODO P6-T26 [P0] Legacy-Spezialraum-Visualisierung entfernen: ehemalige Spezialraeume folgen derselben Farbe/Markierung wie normale Raeume.
- [ ] TODO P6-T27 [P0] Room-Creation erweitern: Option `Create room from existing polygon` (Template-Quelle waehlen, Punkte kopieren, neue `roomId` erzeugen).
- [ ] TODO P6-T28 [P0] Persistenz-/Migration-Guard ergaenzen: Play-Area-Rename + Polygon-Template-Copy bleiben Save/Reload/Restart-stabil.
- [ ] TODO P6-T29 [P0] Plan-6-2-Regression dokumentieren (Toggle-Separation, no-special-room-visuals, Play-Area-Wording, Template-Creation).

## Plan 6-3 - Hardening + Operator Verification (nach 6-2)
- [ ] TODO P6-T14 [P1] Import-Konfliktstrategie finalisieren (duplicate boardId/name, Versionierung, Operator-Feedback).
- [ ] TODO P6-T15 [P1] Negativtests fuer fehlerhafte Boardimporte (ungueltige Polygone, fehlende Pflichtfelder, zu grosse Payloads) dokumentieren.
- [ ] TODO P6-T16 [P1] Multi-Board-Soaktest dokumentieren (schneller Boardwechsel, Cluster-Triggerfolgen, Reload/Restart-Paritaet).
- [ ] TODO P6-T17 [P1] Operator-E2E-Abnahme im Realsetup dokumentieren (Import -> Auswahl -> Trigger/Stop -> Save/Reload).
