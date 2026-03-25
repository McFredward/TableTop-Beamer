# Phase 3 Acceptance

## Testplan
- Einzeltrigger-Test: jede Raumanimation ist separat start-/stoppbar (`kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`).
- Parallelaktivierungs-Test: Kombinationen entstehen ausschliesslich ueber gleichzeitige Einzeltrigger ohne implizite Sammelzustaende.
- Running-List-Test: jede aktive Raumanimation erscheint als eigener Eintrag (1:1 zur Runtime-Instanz) und kann einzeln gestoppt/editiert werden.
- GIF-Asset-Test `kaputt`: nutzt `resources/nemesis/animations/malfunction.gif`, startet/stoppt/editiert korrekt und bleibt auf Zielraum geclippt.
- GIF-Asset-Test `feuer`: nutzt `resources/nemesis/animations/fire.gif`, startet/stoppt/editiert korrekt und bleibt auf Zielraum geclippt.
- GIF-Asset-Test `schleim`: nutzt `resources/nemesis/animations/final.gif`, startet/stoppt/editiert korrekt und bleibt auf Zielraum geclippt.
- GIF-Loop-Playback-Test `kaputt`: sichtbare native Framefolge aus dem Asset laeuft kontinuierlich und springt nach letztem Frame wieder auf Frame 1 (kein Pulse-/Zoom-Muster).
- GIF-Loop-Playback-Test `feuer`: sichtbare native Framefolge aus dem Asset laeuft kontinuierlich und springt nach letztem Frame wieder auf Frame 1 (kein Pulse-/Zoom-Muster).
- GIF-Loop-Playback-Test `schleim`: sichtbare native Framefolge aus dem Asset laeuft kontinuierlich und springt nach letztem Frame wieder auf Frame 1 (kein Pulse-/Zoom-Muster).
- Spezialraum-Test `nest`: Effekt startet/stoppt/editiert korrekt und bleibt auf Zielraum geclippt.
- Spezialraum-Test `dekompression`: Effekt startet/stoppt/editiert korrekt und bleibt auf Zielraum geclippt.
- Global-Aequivalent-Test `alarm`: nutzt globalen Renderer, bleibt aber strikt auf den Zielraum geclippt.
- Global-Aequivalent-Test `lichtflackern`: nutzt globalen Renderer, bleibt aber strikt auf den Zielraum geclippt.
- GIF-Parameter-Test: `opacity` und `playbackSpeed` sind pro Instanz einstellbar, editierbar und beeinflussen keine anderen Instanzen.
- Hold-Default-Test: gestartete Raumanimationen laufen dauerhaft weiter, bis explizit `Stop` erfolgt.
- Clipping-Integritaets-Test: keine sichtbaren Leaks in Nachbarraeume, keine Draws ausserhalb der aktiven Raumgrenzen.
- Multi-Room-Paralleltest: gleichzeitige Raumzustaende beeinflussen sich nicht unzulaessig.
- Trigger/Edit-Roundtrip-Test: gesetzte Einzelanimationen bleiben beim Edit konsistent und erzeugen keinen Runtime-State-Drift.
- Performance-Test: stabile Darstellung unter Mehrfachzustand ohne spuerbaren Bedienabfall.

## Pflichtabnahme Plan 3-2 (P3-T13..P3-T25)
- Das Runtime-Modell fuehrt Raumanimationen als separate Instanzen statt als kombiniertes Zustandsobjekt.
- Alle 7 Raumanimationen (`kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`) sind einzeln triggerbar und stoppbar.
- Running-Uebersicht zeigt jede aktive Animation als separaten Eintrag mit korrekter Raumzuordnung.
- `alarm` und `lichtflackern` nutzen globale Aequivalente, sind aber hart auf den Zielraum begrenzt.
- `kaputt`/`feuer`/`schleim` nutzen die vorgegebenen GIF-Assets und unterstuetzen `opacity` + `playbackSpeed` pro Instanz.
- Default-Modus fuer Raumanimationen ist `hold` bis expliziter Stop.
- Clipping bleibt in allen relevanten Renderpfaden dicht (kein Polygon-/Masken-Leak).
- Trigger/Edit-Flow bleibt bei Wiederholaufrufen robust (kein Verlust von Raumbezug oder Parametern).
- Verifikationsdokument fuer Plan 3-2 ist vorhanden und referenziert die wichtigsten Nachweise.

## Pflichtabnahme Plan 3-3 (P3-T26..P3-T31)
- `kaputt`/`feuer`/`schleim` spielen im Renderer als echte GIF-Loops aus den verbindlichen Assets; Pulse-/Zoom-Ersatz gilt als Fehler.
- `opacity` und `playbackSpeed` bleiben unter nativer GIF-Wiedergabe instanzscharf und editierbar.
- Running-Uebersicht bleibt fuer GIF-Raumanimationen 1:1 zur laufenden Instanz (Start/Edit/Stop konsistent).
- hold-by-default bleibt unveraendert: GIF-Raumanimationen stoppen nur explizit.
- Clipping bleibt dicht: keine GIF-Leaks in Nachbarraeume oder ausserhalb der Raumgrenzen.
- Loop-Nachweise enthalten pro GIF mindestens einen dokumentierten kompletten Loop-Roundtrip.

## Definition of Done
- Alle P0-Tasks aus Plan 3-3 sind abgeschlossen.
- Keine offenen Blocker-Risiken fuer GIF-Loop-Playback, Clipping, Instanz-Konsistenz oder Running-List-Paritaet.
- P1-Hardening fuer Stabilitaet, Performance und Loop-Nachweise ist mindestens initial umgesetzt und dokumentiert.
- Artefakte `PLAN.md`, `BACKLOG.md`, `TASKS.md`, `EXECUTE.md`, `RISKS.md`, `STATE.md`, `ROADMAP.md` sind konsistent.

## Abnahmeprotokoll
- Plan 3-2 wurde am 2026-03-25 mit Verweis auf `3-2-VERIFICATION.md` abgenommen.
- Plan 3-3 wurde am 2026-03-25 mit Verweis auf `3-3-VERIFICATION.md` abgenommen.
