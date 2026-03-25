# Phase 3 Plan (Rework 3-4 Hotfix Completed)

## Zielbild
Phase 3 umfasst nach Rework 3-3 ein kurzes Hotfix-Add-on 3-4 fuer den End-to-End-Mapping-Pfad: GIF-Raumanimationen laufen als echte GIF-Loops, GIF-Mapping ist pro Animation auswaehlbar und persistent, und der Direct-Start-Flow verdrahtet den gemappten GIF-Pfad konsistent bis in `createAnimation`.

## Scope
- Separates Trigger-Modell pro Raumanimation mit Start/Stop je Instanz.
- Verbindliches Set separater Raum-Animationen: `kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`.
- Running-Uebersicht zeigt jede aktive Raumanimation als separaten Runtime-Eintrag.
- `alarm` und `lichtflackern` nutzen globale Effektpfade als Aequivalent, aber strikt auf den Zielraum geclippt.
- GIF-Runtime-Wiedergabe fuer `kaputt`/`feuer`/`schleim` als echte Frame-Loops (kein statischer Frame mit Puls-Ersatz).
- Pro Animation ist das GIF in der UI auswaehlbar (analog Sound-Mapping), mit validierter Asset-Liste und persistenter Speicherung.
- GIF-Instanzparameter pro laufender Animation steuerbar: Transparenz (`opacity`) und Abspielgeschwindigkeit (`playbackSpeed`).
- Default-Verhalten fuer Raum-Animationen: `hold` bis expliziter Stop.
- Clipping-Integritaet fuer alle Raumanimationen ohne Leaks in Nachbarraeume/Outside-Bereiche.

## Out of Scope
- Neue Spielmechanik oder Regelautomatisierung.
- Vollstaendig neuer Effekt-Editor.
- Multi-Client-Sync oder Netzwerksteuerung.
- Freies Hochladen beliebiger Dateien als GIF-Quelle.

## Milestones (priorisiert)
1. Plan 3-3 P0 GIF-Runtime-Fix: echte GIF-Loop-Wiedergabe fuer raumbezogene GIF-Animationen.
2. Plan 3-3 P0 GIF-Mapping-UX: pro Animation selektierbares GIF-Mapping in der UI (paritaetisch zum Sound-Mapping).
3. Plan 3-3 P0 Persistenz-Paritaet: GIF-Mapping wird robust gespeichert/geladen und ueber Reload/Restart stabil gehalten.
4. Plan 3-3 P1 Hardening: Regression, Performance, Verifikations- und Artefaktabschluss.
5. Plan 3-4 P0 Hotfix-Add-on: Direct-Start-Flow nutzt gemappten GIF-Pfad deterministisch im Runtime-Startpfad.
6. Plan 3-4 P1 Hardening: Regression fuer Direct-Start + Edit-Flow + Reload sowie Artefakt-/Acceptance-Sync.

## Plan 3-3 (Rework-Welle, execute-ready)

### Prioritaet P0
- P3-S3.1 GIF-Runtime fuer `kaputt`/`feuer`/`schleim` auf echte GIF-Frame-Loop-Wiedergabe umstellen.
- P3-S3.2 UI-Mapping pro Raumanimation fuer GIF-Quelle einfuehren (analog Sound-Mapping, inkl. `none`/Fallback-Regel).
- P3-S3.3 Persistenzmodell fuer GIF-Mapping pro Animation integrieren (Save/Load/Reload/Restart stabil).
- P3-S3.4 Trigger/Edit/Running-Flow auf Mapping-Aenderungen hardenen (kein Drift bei laufenden Instanzen).

### Prioritaet P1
- P3-S3.5 Regression- und Performance-Hardening fuer echte GIF-Loops bei Mehrfachbetrieb.
- P3-S3.6 Dokumentations- und Verifikationsabschluss fuer Rework Plan 3-3.

## Plan 3-4 (Hotfix Add-on, execute-ready)

### Prioritaet P0
- P3-S4.1 Direct-Start-Flow auf gemappten GIF-Pfad verdrahten, damit `createAnimation` nicht auf Default-GIF zurueckfaellt.

### Prioritaet P1
- P3-S4.2 Regression explizit fuer Direct-Start + Edit-Flow + Reload ergaenzen.
- P3-S4.3 Artefakte/Acceptance synchronisieren, damit GIF-Mapping Ende-zu-Ende nachweisbar greift.

## Definition of Done
- Stories und Tasks aus `BACKLOG.md` und `TASKS.md` fuer Plan 3-3 sind abgeschlossen.
- Stories und Tasks aus `BACKLOG.md` und `TASKS.md` fuer Plan 3-4 sind abgeschlossen.
- Jede Raum-Animation ist einzeln start-/stoppbar und wird separat in der Running-Uebersicht gefuehrt.
- Das 7er-Set (`kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`) ist vollstaendig und funktionsgleich verfuegbar.
- `alarm` und `lichtflackern` laufen als globale Aequivalente mit strikt raumbegrenztem Clipping.
- `kaputt`/`feuer`/`schleim` laufen als echte GIF-Loops; `opacity` und `playbackSpeed` sind pro Instanz steuerbar.
- GIF-Mapping ist pro Animation in der UI auswaehlbar, validiert und persistent gespeichert.
- Raumanimationen bleiben standardmaessig im `hold`-Modus aktiv, bis explizit gestoppt.
- Keine sichtbaren Clipping-Leaks in Nachbarraeume oder ausserhalb der Zielmasken.
- Performance-/Stabilitaetskriterien aus `ACCEPTANCE.md` sind nachgewiesen.

## Referenz
- Verbindliches User-Feedback fuer Phase-3-Rework 3-3 (echte GIF-Loops statt Pulsing-Einzelbild + GIF-Auswahl pro Animation in der UI mit Persistenz).

## Execution Status
- Plan 3-2 (P3-T13..P3-T25): completed, siehe `3-2-VERIFICATION.md`.
- Plan 3-3 (P3-T26..P3-T31): completed, siehe `3-3-VERIFICATION.md`.
- Plan 3-4 (P3-T32..P3-T34): completed, siehe `3-4-VERIFICATION.md` und `P3-T33-REGRESSION.md`.
