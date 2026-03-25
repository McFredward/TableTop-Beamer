# Phase 3 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

## Plan 3-1 - Erste Ausfuehrungswelle (execute-ready)
- [x] DONE P3-T1 [P0] Raumzustandsmodell implementieren (`broken`, `burning`, `alienCount:0-2`, `corpse`) inkl. Runtime-Defaults.
- [x] DONE P3-T2 [P0] Deterministische Layer-Prioritaet und Konfliktregeln fuer Zustandskombinationen als zentrale Kompositionslogik umsetzen.
- [x] DONE P3-T3 [P0] Clipping-Guard vereinheitlichen: Standard- und Spezialraum-Renderer strikt auf Zielpolygone begrenzen.
- [x] DONE P3-T4 [P0] Standardraum-Renderer fuer kombinierte Zustandsdarstellung (kaputt + brennend + alienCount + leiche) umbauen.
- [x] DONE P3-T5 [P0] Spezialraum-Effekt `nest` implementieren und in Trigger-/Runtime-Pfad integrieren.
- [x] DONE P3-T6 [P0] Spezialraum-Effekt `slime` implementieren und in Trigger-/Runtime-Pfad integrieren.
- [x] DONE P3-T7 [P0] Spezialraum-Effekt `decompression` implementieren und in Trigger-/Runtime-Pfad integrieren.
- [x] DONE P3-T8 [P0] Trigger/Edit-Flow hardenen: kombinierte Zustaende setzen/aendern ohne State-Drift oder falsch zugeordnetes Rendering.
- [x] DONE P3-T9 [P1] Immersions-Tuning: visuelle Intensitaet/Tempo/Layer-Dichte je Zustandsprofil kalibrieren.
- [x] DONE P3-T10 [P1] Performance-Hardening: Framezeitprofiling und Optimierungen fuer Mehrfachzustand + Parallelraeume.
- [x] DONE P3-T11 [P1] Plan-3-1-Verifikation dokumentieren (Kombinationsmatrix, Clipping-Negativtests, Spezialraum-Nachweise).
- [x] DONE P3-T12 [P1] README-/Planungsartefakte final synchronisieren (Phase-3-Stand, Execute-Gates, Nachweise).

## Plan 3-2 - Rework auf separates Trigger-Modell (priorisiert)
- [x] DONE P3-T13 [P0] Kombi-Zustandsmodell im Room-Flow rueckbauen und separates Instanzmodell pro Raumanimation als Runtime-Source-of-Truth verankern.
- [x] DONE P3-T14 [P0] Trigger/Stop/Edit auf Einzelanimation umstellen: jede Aktion arbeitet auf genau einer Raum-Animationsinstanz.
- [x] DONE P3-T15 [P0] Running-Uebersicht hardenen: jede aktive Raumanimation (`kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`) erscheint als eigener Eintrag.
- [x] DONE P3-T16 [P0] `kaputt` auf `resources/nemesis/animations/malfunction.gif` umstellen und sauber im Zielraum clippen.
- [x] DONE P3-T17 [P0] `feuer` auf `resources/nemesis/animations/fire.gif` umstellen und sauber im Zielraum clippen.
- [x] DONE P3-T18 [P0] `schleim` auf `resources/nemesis/animations/final.gif` umstellen und sauber im Zielraum clippen.
- [x] DONE P3-T19 [P0] `alarm` als globales Aequivalent raumbegrenzt anbinden (globaler Effektpfad + harter Raum-Clip).
- [x] DONE P3-T20 [P0] `lichtflackern` als globales Aequivalent raumbegrenzt anbinden (globaler Effektpfad + harter Raum-Clip).
- [x] DONE P3-T21 [P0] GIF-Instanzparameter pro laufender Animation steuerbar machen (`opacity`, `playbackSpeed`) inkl. Edit-Roundtrip.
- [x] DONE P3-T22 [P0] Default-Verhalten `hold` fuer alle Raumanimationen erzwingen (aktiv bis expliziter Stop).
- [x] DONE P3-T23 [P1] Regression fuer Parallelkombinationen aus Einzelanimationen dokumentieren (Running-List, Clipping, Stop/Edit-Konsistenz).
- [x] DONE P3-T24 [P1] Performance-/Soak-Check fuer mehrere daueraktive Raum-Animationen protokollieren.
- [ ] TODO P3-T25 [P1] Plan-3-2-Verifikation + Artefakt-Sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE`) abschliessen.
