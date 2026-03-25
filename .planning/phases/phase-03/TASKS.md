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
- [x] DONE P3-T25 [P1] Plan-3-2-Verifikation + Artefakt-Sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE`) abschliessen.

## Plan 3-3 - P0 Bugfix echtes GIF-Playback (priorisiert)
- [x] DONE P3-T26 [P0] Renderer fuer `kaputt` auf natives GIF-Loop-Playback aus `resources/nemesis/animations/malfunction.gif` umstellen (kein Pulse-/Zoom-Ersatz).
- [x] DONE P3-T27 [P0] Renderer fuer `feuer` und `schleim` auf natives GIF-Loop-Playback aus `fire.gif`/`final.gif` umstellen (kein Pulse-/Zoom-Ersatz).
- [x] DONE P3-T28 [P0] Instanzparameter-Paritaet fuer native GIF-Wiedergabe hardenen: `opacity` und `playbackSpeed` bleiben pro Instanz editierbar und querwirkungsfrei.
- [x] DONE P3-T29 [P0] Regression-Guard fuer GIF-Raumtrigger nachziehen: Running-List-1:1, hold-by-default und raumstrenges Clipping unveraendert sicherstellen.
- [x] DONE P3-T30 [P1] Loop-Playback- und Soak-Nachweise fuer echte GIF-Framefolge dokumentieren (inkl. mindestens einem kompletten Loop-Roundtrip pro GIF).
- [x] DONE P3-T31 [P1] Plan-3-3-Verifikation + Artefakt-Sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP`) abschliessen.

## Plan 3-4 - P0 Cross-Browser-Fallback-Fix (priorisiert)
- [x] DONE P3-T32 [P0] Fallback-Root-Cause fixieren: GIF-Raumtrigger duerfen bei fehlendem nativen Decoder nicht auf statisches Erstframe zurueckfallen.
- [x] DONE P3-T33 [P0] Decoder-agnostischen GIF-Frame-Scheduler fuer `kaputt`/`feuer`/`schleim` implementieren (echter Frame-Fortschritt + nativer/fallback Loop).
- [x] DONE P3-T34 [P0] Instanzparitaet in beiden Playback-Pfaden hardenen: `opacity`/`playbackSpeed` bleiben pro `animation.id` isoliert und editierbar.
- [x] DONE P3-T35 [P0] Regression-Gate erneuern: Running-List-1:1, hold-by-default und raumstrenges Clipping bleiben unveraendert.
- [x] DONE P3-T36 [P1] Browser-Matrix + Soak fuer Fallback-Looping dokumentieren (mind. 1 kompletter Loop-Roundtrip je GIF ohne `ImageDecoder`).
- [x] DONE P3-T37 [P1] Plan-3-4-Verifikation + Artefakt-Sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP`) abschliessen.
