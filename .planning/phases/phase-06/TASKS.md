# Phase 6 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

## Plan 6-1 - Board-Agnostic Foundation Wave (erste Ausfuehrungswelle, execute-ready)
- [x] DONE P6-T1 [P0] Katalogschema und kanonisches Board-Modell festlegen (`boardId`, metadata, roomCatalog, roomClusters) und Nemesis-Bestand darauf mappen.
- [x] DONE P6-T2 [P0] Server-Storage und Import-Validator implementieren (Importformat pruefen, persistieren, sichere Dateipfade, klare Fehlercodes).
- [x] DONE P6-T3 [P0] Board-Import-Endpunkt + Katalog-Refresh integrieren, damit importierte Boards ohne manuellen Neustart sichtbar sind.
- [x] DONE P6-T4 [P0] Client-Board-Auswahl auf dynamischen Katalog umstellen (kein hardcoded A/B, boardId als Source-of-Truth).
- [x] DONE P6-T5 [P0] Runtime-Pfade fuer Boarddaten generalisieren (Render/Selection/Profile anhand boardId aus Katalog aufloesen).

- [ ] TODO P6-T6 [P0] Room-Cluster-Domain + Persistenzmodell einfuehren (`clusterId`, `name`, `roomIds`, board-spezifisch).
- [ ] TODO P6-T7 [P0] Dropdown-Zielliste auf `room` + `cluster` erweitern und UI-Darstellung eindeutig kennzeichnen.
- [ ] TODO P6-T8 [P0] Cluster-Trigger/Edit-Fanout implementieren (Animationsstart fuer alle Cluster-Raeume, Running-Liste instanzscharf konsistent).
- [ ] TODO P6-T9 [P0] Einzelraum-Klickguard absichern: Board-Klick selektiert weiterhin nur den einzelnen Raum ohne implizite Cluster-Selektion.

- [ ] TODO P6-T10 [P0] English-only Sweep fuer UI-Texte/Labels/Statusmeldungen im Operator-Flow umsetzen.
- [ ] TODO P6-T11 [P0] Relevante Logs/Errors und README-/Operator-Hinweise auf Englisch vereinheitlichen.

- [ ] TODO P6-T12 [P0] Legacy-Migration implementieren: Nemesis + bestehende Polygone/Animationsconfigs in neuen Standard ueberfuehren (idempotent, verlustfrei).
- [ ] TODO P6-T13 [P0] Plan-6-1-Regression dokumentieren (Import/Persistenz, Katalogauswahl, Cluster-Verhalten, Einzelraumklick, English-Flow, Migration).

## Plan 6-2 - Hardening + Operator Verification (nach 6-1)
- [ ] TODO P6-T14 [P1] Import-Konfliktstrategie finalisieren (duplicate boardId/name, Versionierung, Operator-Feedback).
- [ ] TODO P6-T15 [P1] Negativtests fuer fehlerhafte Boardimporte (ungueltige Polygone, fehlende Pflichtfelder, zu grosse Payloads) dokumentieren.
- [ ] TODO P6-T16 [P1] Multi-Board-Soaktest dokumentieren (schneller Boardwechsel, Cluster-Triggerfolgen, Reload/Restart-Paritaet).
- [ ] TODO P6-T17 [P1] Operator-E2E-Abnahme im Realsetup dokumentieren (Import -> Auswahl -> Trigger/Stop -> Save/Reload).
