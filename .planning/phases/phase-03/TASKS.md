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

## Plan 3-3 - Rework GIF-Loop + GIF-Mapping (priorisiert)
- [x] DONE P3-T26 [P0] GIF-Runtime fuer `kaputt`/`feuer`/`schleim` von Einzelbild-Pulsing auf echte GIF-Frame-Loops umstellen.
- [x] DONE P3-T27 [P0] GIF-Decoder-/Renderer-Pfad so anbinden, dass eingebettete GIF-Loop-Informationen deterministisch respektiert werden (inkl. `playbackSpeed`).
- [x] DONE P3-T28 [P0] Settings-UI fuer GIF-Mapping pro Animation einfuehren (analog Sound-Mapping, inkl. `none`/Fallback-Auswahl).
- [x] DONE P3-T29 [P0] Persistenz fuer GIF-Mapping pro Animation implementieren und robust ueber Save/Load/Reload/Restart verifizieren.
- [x] DONE P3-T30 [P1] Regression + Soak fuer Multi-GIF-Loop-Betrieb und Mapping-Edit waehrend laufender Instanzen dokumentieren.
- [x] DONE P3-T31 [P1] Plan-3-3-Verifikation + Artefakt-Sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE`) abschliessen.

## Plan 3-4 - Hotfix Direct-Start GIF-Mapping (verify-work follow-up)
- [x] DONE P3-T32 [P0] Direct-Start-Flow auf gemappten GIF-Pfad verdrahten, damit `createAnimation` bei Raumstart den Mapping-Wert (`gifAssetPath`) statt Default-GIF nutzt.
- [x] DONE P3-T33 [P1] Regressionstest ergaenzen fuer Kette Direct-Start -> Edit-Flow -> Reload mit stablem GIF-Mapping-Endzustand.
- [x] DONE P3-T34 [P1] Planungsartefakte + Acceptance auf End-to-End-GIF-Mapping synchronisieren und Abschlussnachweis dokumentieren.

## Plan 3-5 - P0 Render-Regression + Pflicht-Refactor `app.js` (execute-ready)
- [x] DONE P3-T35 [P0] Kritischen Regression-Bug reproduzieren und fixen: Board rendert laufende Animationen wieder sichtbar, waehrend Audio parallel korrekt weiterlaeuft.
- [x] DONE P3-T36 [P0] Render-/Audio-Entkopplung hardenen: Draw-Tick/Render-Scheduler gegen Audio-Lifecycle-Ereignisse (`loop`, `stop`, `clear all`, `edit`) absichern.
- [x] DONE P3-T37 [P0] Zielstruktur fuer Modulgrenzen einfuehren (Ordner/Dateien fuer `state`, `rendering`, `effects`, `audio`, `ui`, `persistence`, `api/save`) und Entry-Composition definieren.
- [x] DONE P3-T38 [P0] `state` + `persistence` aus `app.js` extrahieren (inkl. Load/Save-Flow) und API-gleiches Verhalten sichern.
- [x] DONE P3-T39 [P0] `rendering` + `effects` aus `app.js` extrahieren; Board-Renderpfad inkl. Clipping/GIF-Loop bleibt funktional identisch.
- [x] DONE P3-T40 [P0] `audio` + `ui` + `api/save` aus `app.js` extrahieren und Integrationspunkte ueber explizite Modulgrenzen stabilisieren.
- [x] DONE P3-T41 [P1] Nicht-offensichtliche Bereiche gezielt kommentieren (Timing, Fallbacks, Entkopplungs-Guards, Persistenznormalisierung).
- [x] DONE P3-T42 [P1] Funktionale Paritaets-Regression dokumentieren (Trigger, Running-Liste, Direct-Start, Edit, Stop, Reload, Save/Load, GIF-Mapping).
- [x] DONE P3-T43 [P1] Stabilitaets-/Soak-Check nach Refactor dokumentieren (insb. parallele Raumanimationen + Audio).
- [ ] TODO P3-T44 [P1] Plan-3-5-Verifikation + Artefakt-Sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE`) abschliessen.
