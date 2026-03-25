# Phase 3 Plan (Rework 3-2 Prepared)

## Zielbild
Phase 3 Rework 3-2 stellt das fruehere, separat steuerbare Trigger-Modell pro Raumanimation wieder her: jede Animation laeuft als eigene Instanz mit eigenem Start/Stop, Kombinationen entstehen ausschliesslich durch paralleles Aktivieren mehrerer Einzelanimationen, und die Running-Uebersicht zeigt jede aktive Animation als eigenen Eintrag.

## Scope
- Separates Trigger-Modell pro Raumanimation mit Start/Stop je Instanz.
- Verbindliches Set separater Raum-Animationen: `kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`.
- Running-Uebersicht zeigt jede aktive Raumanimation als separaten Runtime-Eintrag.
- `alarm` und `lichtflackern` nutzen globale Effektpfade als Aequivalent, aber strikt auf den Zielraum geclippt.
- GIF-Quellen fuer `kaputt`/`feuer`/`schleim` verbindlich: `resources/nemesis/animations/malfunction.gif`, `resources/nemesis/animations/fire.gif`, `resources/nemesis/animations/final.gif`.
- GIF-Instanzparameter pro laufender Animation steuerbar: Transparenz (`opacity`) und Abspielgeschwindigkeit (`playbackSpeed`).
- Default-Verhalten fuer Raum-Animationen: `hold` bis expliziter Stop.
- Clipping-Integritaet fuer alle Raumanimationen ohne Leaks in Nachbarraeume/Outside-Bereiche.

## Out of Scope
- Neue Spielmechanik oder Regelautomatisierung.
- Vollstaendig neuer Effekt-Editor.
- Multi-Client-Sync oder Netzwerksteuerung.

## Milestones (priorisiert)
1. Plan 3-2 P0 Runtime-Rework: Rueckbau des Kombi-Zustandsmodells hin zu separaten Raumanimationen.
2. Plan 3-2 P0 Trigger-/Running-Paritaet: jeder Trigger ergibt genau einen separaten Running-Eintrag.
3. Plan 3-2 P0 Renderer-Rework: `alarm`/`lichtflackern` als globales Aequivalent mit hartem Raum-Clip.
4. Plan 3-2 P0 GIF-Integration: verbindliche Assets + steuerbare `opacity`/`playbackSpeed` pro Instanz.
5. Plan 3-2 P1 Hardening: Regression, Performance, Dokumentationsabschluss.

## Plan 3-2 (Rework-Welle, execute-ready)

### Prioritaet P0
- P3-S2.1 Separates Raumanimationsmodell als Source-of-Truth definieren (pro Animation eine laufende Instanz).
- P3-S2.2 Trigger- und Stop-Semantik auf Einzelanimationen umstellen; Kombination nur durch Parallelaktivierung.
- P3-S2.3 Verbindliches Set `kaputt`/`feuer`/`schleim`/`nest`/`dekompression`/`lichtflackern`/`alarm` vollstaendig anbinden.
- P3-S2.4 `alarm` und `lichtflackern` ueber globale Renderer mit strikt raumbezogenem Clipping ausfuehren.
- P3-S2.5 GIF-Assets fuer `kaputt`/`feuer`/`schleim` inkl. instanzscharfer Parameter `opacity` + `playbackSpeed` integrieren.
- P3-S2.6 Running-Uebersicht auf 1:1-Abbildung Triggerinstanz zu Listeneintrag hardenen.
- P3-S2.7 Default-Mode `hold` fuer alle Raumanimationen als Standard erzwingen.

### Prioritaet P1
- P3-S2.8 Regression- und Performance-Hardening fuer Parallelbetrieb mehrerer Einzelanimationen.
- P3-S2.9 Dokumentations- und Verifikationsabschluss fuer Rework Plan 3-2.

## Definition of Done
- Stories und Tasks aus `BACKLOG.md` und `TASKS.md` fuer Plan 3-2 sind abgeschlossen.
- Jede Raum-Animation ist einzeln start-/stoppbar und wird separat in der Running-Uebersicht gefuehrt.
- Das 7er-Set (`kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`) ist vollstaendig und funktionsgleich verfuegbar.
- `alarm` und `lichtflackern` laufen als globale Aequivalente mit strikt raumbegrenztem Clipping.
- `kaputt`/`feuer`/`schleim` nutzen die verbindlichen GIF-Assets; `opacity` und `playbackSpeed` sind pro Instanz steuerbar.
- Raumanimationen bleiben standardmaessig im `hold`-Modus aktiv, bis explizit gestoppt.
- Keine sichtbaren Clipping-Leaks in Nachbarraeume oder ausserhalb der Zielmasken.
- Performance-/Stabilitaetskriterien aus `ACCEPTANCE.md` sind nachgewiesen.

## Referenz
- Verbindliches User-Feedback fuer Phase-3-Rework (separates Trigger-Modell, 7 Raumanimationen, GIF-Vorgaben, `hold`-Default, globales Aequivalent fuer `alarm`/`lichtflackern` mit Raumlimit).

## Execution Status
- Plan 3-2 (P3-T13..P3-T25): completed, siehe `3-2-VERIFICATION.md`.
