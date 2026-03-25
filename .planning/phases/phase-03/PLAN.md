# Phase 3 Plan (Rework 3-4 Completed)

## Zielbild
Phase 3 Rework 3-4 behaelt das separate Trigger-Modell aus 3-2 und den Bugfix-Ansatz aus 3-3, schliesst aber die neue P0-Luecke: GIF-Raumanimationen (`kaputt`, `feuer`, `schleim`) muessen auf allen Zielbrowsern als echte Loops laufen, auch wenn native Decoder (z. B. `ImageDecoder`) fehlen. Der Fallback darf nie auf ein statisches Erstbild degradieren.

## Scope
- Separates Trigger-Modell pro Raumanimation mit Start/Stop je Instanz.
- Verbindliches Set separater Raum-Animationen: `kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`.
- Running-Uebersicht zeigt jede aktive Raumanimation als separaten Runtime-Eintrag.
- `alarm` und `lichtflackern` nutzen globale Effektpfade als Aequivalent, aber strikt auf den Zielraum geclippt.
- GIF-Quellen fuer `kaputt`/`feuer`/`schleim` verbindlich: `resources/nemesis/animations/malfunction.gif`, `resources/nemesis/animations/fire.gif`, `resources/nemesis/animations/final.gif`.
- Renderer spielt fuer `kaputt`/`feuer`/`schleim` die echte GIF-Framefolge und den nativen Loop ab (kein Ersatzpfad durch Pulse-/Zoom-Simulation).
- Fallback-Renderpfad liefert ebenfalls echten Frame-Fortschritt mit Loop-Verhalten (kein statisches erstes Frame).
- GIF-Instanzparameter pro laufender Animation steuerbar: Transparenz (`opacity`) und Abspielgeschwindigkeit (`playbackSpeed`).
- Default-Verhalten fuer Raum-Animationen: `hold` bis expliziter Stop.
- Clipping-Integritaet fuer alle Raumanimationen ohne Leaks in Nachbarraeume/Outside-Bereiche.

## Out of Scope
- Neue Spielmechanik oder Regelautomatisierung.
- Vollstaendig neuer Effekt-Editor.
- Multi-Client-Sync oder Netzwerksteuerung.

## Milestones (priorisiert)
1. Plan 3-2 abgeschlossen: separates Trigger-/Instanzmodell inkl. Running-Paritaet, Clipping und hold-default.
2. Plan 3-3 P0 Bugfix: echtes GIF-Playback fuer `kaputt`/`feuer`/`schleim` im Renderer statt Pseudoanimation.
3. Plan 3-3 P0 Parameterguard: `opacity`/`playbackSpeed` bleiben instanzscharf unter nativer GIF-Wiedergabe.
4. Plan 3-3 P0 Regression: keine Rueckschritte bei Running-List, hold-by-default und Clipping.
5. Plan 3-3 P1 Hardening: Loop-Nachweise, Soak/Performance und Artefaktabschluss.
6. Plan 3-4 P0 Cross-Browser-Fix: echter GIF-Loop auch ohne native Decoder (`ImageDecoder` unavailable).
7. Plan 3-4 P0 Fallback-Paritaet: Frame-Fortschritt + `opacity`/`playbackSpeed` bleiben instanzscharf.
8. Plan 3-4 P0 Regression: Running-List/hold-default/Clipping bleiben unveraendert stabil.
9. Plan 3-4 P1 Hardening: Browser-Matrix, Soak und Artefaktabschluss.

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

## Plan 3-3 (P0 Bugfix-Welle, execute-ready)

### Prioritaet P0
- P3-S3.1 Renderer fuer `kaputt`/`feuer`/`schleim` auf echtes GIF-Playback (native Framefolge + Loop) umstellen.
- P3-S3.2 Pseudo-Animationspfad (Frame-Pulsieren/Zoom) fuer GIF-basierte Raumanimationen deaktivieren.
- P3-S3.3 Instanzparameter `opacity` und `playbackSpeed` unter nativer GIF-Wiedergabe regressionsfrei halten.
- P3-S3.4 Running-List-/hold-/Clipping-Paritaet fuer GIF-Raumtrigger als Pflicht-Regression absichern.

### Prioritaet P1
- P3-S3.5 Loop-Playback-Nachweise (Framefolge/Loop-Roundtrip) und Performance-Soak dokumentieren.
- P3-S3.6 Plan-3-3-Verifikation + Artefakt-Sync abschliessen.

## Plan 3-4 (P0 Cross-Browser-Fallback-Fix, execute-ready)

### Prioritaet P0
- P3-S4.1 GIF-Playback-Pfad fuer `kaputt`/`feuer`/`schleim` decoder-agnostisch machen, sodass echte Loops in allen Zielbrowsern laufen.
- P3-S4.2 Fallback-Decoder/-Renderer mit echtem Frame-Fortschritt und Looping liefern (kein statisches Erstframe).
- P3-S4.3 `opacity`/`playbackSpeed` in nativen und Fallback-Pfaden strikt instanzscharf harmonisieren.
- P3-S4.4 Regression fuer Running-List-Paritaet, hold-by-default und Clipping als Pflicht-Gate nachziehen.

### Prioritaet P1
- P3-S4.5 Browser-Matrix- und Soak-Nachweise fuer Fallback-Looping dokumentieren.
- P3-S4.6 Plan-3-4-Verifikation + Artefakt-Sync abschliessen.

## Definition of Done
- Stories und Tasks aus `BACKLOG.md` und `TASKS.md` fuer Plan 3-2 und Plan 3-3 bleiben abgeschlossen; Plan 3-4 ist vollstaendig umgesetzt.
- Jede Raum-Animation ist einzeln start-/stoppbar und wird separat in der Running-Uebersicht gefuehrt.
- Das 7er-Set (`kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`) ist vollstaendig und funktionsgleich verfuegbar.
- `alarm` und `lichtflackern` laufen als globale Aequivalente mit strikt raumbegrenztem Clipping.
- `kaputt`/`feuer`/`schleim` nutzen die verbindlichen GIF-Assets als echte GIF-Loops; es gibt keinen Pseudoanimations-Ersatzpfad.
- Echte GIF-Loops fuer `kaputt`/`feuer`/`schleim` laufen auch im Fallback-Pfad ohne native Decoder (sichtbarer Frame-Fortschritt + Loop).
- `opacity` und `playbackSpeed` bleiben pro Instanz steuerbar und wirken nicht auf andere laufende Animationen.
- Raumanimationen bleiben standardmaessig im `hold`-Modus aktiv, bis explizit gestoppt.
- Keine sichtbaren Clipping-Leaks in Nachbarraeume oder ausserhalb der Zielmasken.
- Performance-/Stabilitaetskriterien aus `ACCEPTANCE.md` sind nachgewiesen.

## Referenz
- Verbindliches User-Feedback fuer Phase-3-Rework (separates Trigger-Modell, 7 Raumanimationen, GIF-Vorgaben, `hold`-Default, globales Aequivalent fuer `alarm`/`lichtflackern` mit Raumlimit).
- Neues verpflichtendes Feedback (Plan-Update 3-4): GIFs stehen in manchen Browsern als Standbild, weil Fallback nur statisch zeichnet.

## Execution Status
- Plan 3-2 (P3-T13..P3-T25): completed, siehe `3-2-VERIFICATION.md`.
- Plan 3-3 (P3-T26..P3-T31): completed, siehe `3-3-VERIFICATION.md`.
- Plan 3-4 (P3-T32..P3-T37): completed, siehe `3-4-VERIFICATION.md`.
