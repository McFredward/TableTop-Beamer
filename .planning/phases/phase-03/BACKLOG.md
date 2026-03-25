# Phase 3 Backlog (Rework 3-3 Executed)

## Epics
- Separate Room Trigger Engine (Einzelstart/-stop pro Animation)
- Room Animation Pack 7x (`kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`)
- Global-Equivalent Room Adapters (`alarm`, `lichtflackern` mit Raum-Clip)
- GIF Runtime Controls (`opacity`, `playbackSpeed` pro Instanz)
- GIF Native Loop Playback Integrity (echte Asset-Framefolge ohne Pseudoanimation)
- Running List Integrity (1:1 Triggerinstanz zu Runtime-Eintrag)
- Clipping Integrity (raumgenaue Rendergrenzen ohne Leaks)
- Regression & Performance Hardening

## Story Mapping
- P3-S2.1 Separates Raumanimationsmodell als Runtime-Source-of-Truth einfuehren.
- P3-S2.2 Trigger-/Stop-Semantik auf einzelne Raum-Animationen umstellen (keine kombinierten Zustandsobjekte).
- P3-S2.3 Running-Uebersicht auf separate Runtime-Eintraege pro Animation hardenen.
- P3-S2.4 Animation `kaputt` mit `resources/nemesis/animations/malfunction.gif` anbinden.
- P3-S2.5 Animation `feuer` mit `resources/nemesis/animations/fire.gif` anbinden.
- P3-S2.6 Animation `schleim` mit `resources/nemesis/animations/final.gif` anbinden.
- P3-S2.7 Spezialraum-Animationen `nest` und `dekompression` als separate Triggerpfade absichern.
- P3-S2.8 `alarm` als globales Aequivalent auf Zielraum begrenzt ausfuehren.
- P3-S2.9 `lichtflackern` als globales Aequivalent auf Zielraum begrenzt ausfuehren.
- P3-S2.10 GIF-Instanzparameter `opacity` und `playbackSpeed` pro laufender Instanz steuerbar machen.
- P3-S2.11 Default-Mode `hold` fuer alle Raumanimationen verbindlich setzen.
- P3-S2.12 Clipping-Guard fuer alle 7 Raumanimationen regressionsfest verifizieren.
- P3-S2.13 Performance-/Stabilitaetstuning fuer Mehrfachbetrieb einzelner Animationen.
- P3-S2.14 Verifikations- und Artefaktabschluss fuer Plan 3-2 erstellen.

## Story Mapping - Plan 3-3 (P0 Bugfix echtes GIF-Playback)
- P3-S3.1 `kaputt` rendert als echter GIF-Loop aus `resources/nemesis/animations/malfunction.gif` (native Frames, kein Pulse/Zoom).
- P3-S3.2 `feuer` rendert als echter GIF-Loop aus `resources/nemesis/animations/fire.gif` (native Frames, kein Pulse/Zoom).
- P3-S3.3 `schleim` rendert als echter GIF-Loop aus `resources/nemesis/animations/final.gif` (native Frames, kein Pulse/Zoom).
- P3-S3.4 Instanzparameter `opacity`/`playbackSpeed` bleiben unter nativer GIF-Wiedergabe korrekt und instanzscharf editierbar.
- P3-S3.5 Regression fuer Running-List-Paritaet, hold-by-default und Clipping bei GIF-Raumanimationen verpflichtend durchfuehren.
- P3-S3.6 Plan-3-3-Verifikation inkl. Loop-Playback-Nachweise und Artefaktabschluss erstellen.

## Priorisierte Umsetzungsstrecke - Plan 3-2 (verbindlich)

### Prioritaet P0 - Erste Ausfuehrungswelle
- Story P3-S2.1 + P3-S2.2: Runtime- und Trigger-Rework auf separates Instanzmodell.
  - Ziel: Jede Raumanimation ist einzeln start-/stoppbar, Kombinationen nur ueber Parallelstart.
- Story P3-S2.3: Running-List-Integritaet.
  - Ziel: Jeder Trigger erzeugt genau einen separaten Running-Eintrag mit konsistentem Stop/Edit.
- Story P3-S2.4 + P3-S2.5 + P3-S2.6: GIF-Animationen `kaputt`/`feuer`/`schleim` verbindlich integrieren.
  - Ziel: Vorgabe-Assets sind live und korrekt raumgeclippt.
- Story P3-S2.7: `nest` + `dekompression` als separate Raumtrigger stabil halten.
  - Ziel: Spezialpfade bleiben einzeln steuerbar und kollidieren nicht mit GIF-Pfaden.
- Story P3-S2.8 + P3-S2.9: `alarm` + `lichtflackern` als globales Aequivalent im Raumkontext.
  - Ziel: globaler Renderer wird wiederverwendet, aber Draw bleibt strikt im Zielraum.
- Story P3-S2.10 + P3-S2.11: GIF-Parameter + `hold`-Default.
  - Ziel: `opacity`/`playbackSpeed` sind pro Instanz steuerbar; Stop erfolgt nur explizit.

### Prioritaet P1 - Hardening danach
- Story P3-S2.12 + P3-S2.13: Clipping-/Performance-Hardening.
  - Ziel: keine Leaks und stabile Frametimes bei mehreren parallelen Raum-Animationen.
- Story P3-S2.14: Abschlussnachweise.
  - Ziel: Plan-3-2-Abnahme formal und nachvollziehbar dokumentiert.

## Priorisierte Umsetzungsstrecke - Plan 3-3 (verbindlich)

### Prioritaet P0 - Kritischer Bugfix zuerst
- Story P3-S3.1 + P3-S3.2 + P3-S3.3: Echte GIF-Loops fuer `kaputt`/`feuer`/`schleim`.
  - Ziel: Renderer spielt native GIF-Framefolge und Loop; Pulse-/Zoom-Ersatz ist entfernt.
- Story P3-S3.4: Instanzparameter-Paritaet unter nativer GIF-Wiedergabe.
  - Ziel: `opacity`/`playbackSpeed` bleiben pro Instanz steuerbar und querwirkungsfrei.
- Story P3-S3.5: Regression auf Running-List + hold-default + Clipping.
  - Ziel: keine Rueckschritte gegen Plan-3-2-Basisverhalten.

### Prioritaet P1 - Abschluss danach
- Story P3-S3.6: Verifikation + Artefakt-Sync.
  - Ziel: Loop-Playback-Nachweise und Plan-3-3-Abnahme formal dokumentiert.

## Status
- Rework-Umsetzung Plan 3-2 abgeschlossen; Nachweise in `3-2-VERIFICATION.md`, `P3-T23-REGRESSION.md`, `P3-T24-SOAK.md`.
- Plan 3-3 abgeschlossen; Nachweise in `3-3-VERIFICATION.md`, `P3-T29-REGRESSION.md`, `P3-T30-SOAK.md`.
