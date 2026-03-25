# Phase 3 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

## Plan 3-1 - Erste Ausfuehrungswelle (execute-ready)
- [x] DONE P3-T1 [P0] Raumzustandsmodell implementieren (`broken`, `burning`, `alienCount:0-2`, `corpse`) inkl. Runtime-Defaults.
- [x] DONE P3-T2 [P0] Deterministische Layer-Prioritaet und Konfliktregeln fuer Zustandskombinationen als zentrale Kompositionslogik umsetzen.
- [x] DONE P3-T3 [P0] Clipping-Guard vereinheitlichen: Standard- und Spezialraum-Renderer strikt auf Zielpolygone begrenzen.
- [x] DONE P3-T4 [P0] Standardraum-Renderer fuer kombinierte Zustandsdarstellung (kaputt + brennend + alienCount + leiche) umbauen.
- [ ] TODO P3-T5 [P0] Spezialraum-Effekt `nest` implementieren und in Trigger-/Runtime-Pfad integrieren.
- [ ] TODO P3-T6 [P0] Spezialraum-Effekt `slime` implementieren und in Trigger-/Runtime-Pfad integrieren.
- [ ] TODO P3-T7 [P0] Spezialraum-Effekt `decompression` implementieren und in Trigger-/Runtime-Pfad integrieren.
- [ ] TODO P3-T8 [P0] Trigger/Edit-Flow hardenen: kombinierte Zustaende setzen/aendern ohne State-Drift oder falsch zugeordnetes Rendering.
- [ ] TODO P3-T9 [P1] Immersions-Tuning: visuelle Intensitaet/Tempo/Layer-Dichte je Zustandsprofil kalibrieren.
- [ ] TODO P3-T10 [P1] Performance-Hardening: Framezeitprofiling und Optimierungen fuer Mehrfachzustand + Parallelraeume.
- [ ] TODO P3-T11 [P1] Plan-3-1-Verifikation dokumentieren (Kombinationsmatrix, Clipping-Negativtests, Spezialraum-Nachweise).
- [ ] TODO P3-T12 [P1] README-/Planungsartefakte final synchronisieren (Phase-3-Stand, Execute-Gates, Nachweise).

## Plan 3-2 - Nachgelagerte Ausbauwelle
- [ ] TODO P3-T13 [P1] Erweiterte Zustandsprofile und Presets fuer typische Nemesis-Szenarien definieren.
- [ ] TODO P3-T14 [P2] Zusatzeffekte fuer Raumuebergaenge und weiche Zustandswechsel evaluieren.
- [ ] TODO P3-T15 [P2] Langzeit-Soak-Test (>=3h) fuer kombinierte Mehrraum-Szenarien protokollieren.
