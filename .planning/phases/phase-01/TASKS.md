# Phase 1 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

## Milestone A - Projection Core
- [x] DONE P1-T1 Board-Katalog und Auswahl-UI stabilisieren.
- [x] DONE P1-T2 Boardwechselzeit messen und auf <1s bringen.
- [x] DONE P1-T3 Kalibrierregler (X/Y/Scale/Rotation) mit Stage-Update verbinden.
- [x] DONE P1-T4 Reset-Defaults und session-lokalen State absichern.

## Milestone B - Effects Core
- [x] DONE P1-T5 Einheitliches Animation-Start/Stop-Modell aufbauen.
- [x] DONE P1-T6 Ambient-Toggles (Ambient Drift, Ash Fall, Hull Flicker) anbinden.
- [x] DONE P1-T7 Event-Buttons (Intruder Alert, Reactor Pulse, Power Outage) mit Trigger-Feedback bauen.
- [x] DONE P1-T8 Laufzeitmodell fuer Intensity/Duration/Hold pro Animation anbinden.

## Milestone C - Operator UX
- [x] DONE P1-T9 Dashboard-Grid fuer Schnellzugriff optimieren.
- [x] DONE P1-T10 Aktive Zustandsmarkierung fuer Dauer-Effekte verstaerken.
- [x] DONE P1-T11 Responsive Verhalten fuer kleine Displays pruefen und fixen.
- [x] DONE P1-T12 Setup-Flow im UI sichtbar strukturieren.

## Milestone D - Safety & Hardening
- [x] DONE P1-T13 `Clear All` als priorisierten globalen Stop implementieren.
- [x] DONE P1-T14 Lasttest mit parallelen Effekten durchfuehren.
- [x] DONE P1-T15 Smoke- und Safety-Regression dokumentieren.
- [x] DONE P1-T16 README um Session-Flow und Safety-Hinweise aktualisieren.

## Priority Add-on - Plan Update 1
- [x] DONE P1-T17 [P0] Power-Outage Triggerpfad unter Last messen und haerten.
- [x] DONE P1-T18 [P0] Deterministisches Zusammenspiel von Power Outage und `Clear All` sicherstellen.
- [x] DONE P1-T19 [P1] Board-spezifische hexagonale Room-Hitareas mit Hover/Selection-Feedback umsetzen.
- [x] DONE P1-T20 [P1] Raum-Submenu (Animation, Intensitaet, Dauer/Hold) an roomDraft anbinden.
- [x] DONE P1-T21 [P1] Scope-Trennung global/room plus geclipptes Room-Rendering im Canvas liefern.
- [x] DONE P1-T22 [P2] Output Device Auswahlpfad inkl. robustem Fallback implementieren.
- [x] DONE P1-T23 [P2] Running-Animations-Liste mit Stop/Edit plus Output-Routing Smoke-Test abschliessen.

## Feedback Rework - Plan 1-3
- [x] DONE P1-R1 Room Interaction Geometry Hardening (board-hex hitareas, hover-only highlight, stabile selection pro Board).
- [x] DONE P1-R2 Room Control Submenu Reliability (context auf selected room, Intensity/Duration/Hold, Start-Guard).
- [x] DONE P1-R3 Animation Scope Model + Runtime List (GLOBAL/ROOM Trennung, Stop/Edit je Eintrag, Edit-Reload).
- [x] DONE P1-R4 Power Outage Visibility + Output Route (sichtbare Outage-Dunkelheit, expliziter Fullscreen-Fallback).
- [x] DONE P1-R5 Regression Checks + Docs Sync (`node --check src/app.js`, Akzeptanz-/Task-Doku abgeglichen).

## Priority Add-on - Plan Update 2
- [x] DONE P1-T24 [P0] Hex-Hitareas auf beiden Boards gegen reale Raumflaechen nachkalibrieren (inkl. Rand-/Mitte-Treffmatrix).
- [x] DONE P1-T25 [P1] Fuenf Special-Raeume aufnehmen und board-spezifisch mappen (Cockpit links, Cryoschlaf Mitte, Maschinenraum 1-3 rechts).
- [x] DONE P1-T26 [P1] Event-Sounds fuer Intruder Alert, Reactor Pulse und Power Outage in den Triggerpfad integrieren.
- [x] DONE P1-T27 [P1] Audio-Settings um globales Enable/Disable und Lautstaerke-Regler erweitern.
- [x] DONE P1-T28 [P0] Manuelle Verifikations-Checkliste fuer Phase 1 finalisieren und als Pflichtabnahme durchlaufen.

## Priority Add-on - Plan Update 3
- [x] DONE P1-T29 [P0] Hitarea-Auto-Tuning aus dem Setup-Pfad entfernen und eine kleine Calibration-Settingsseite mit Slidern (Hitarea-X/Y/Scale) bereitstellen.
- [ ] TODO P1-T30 [P0] Board-spezifische Persistenz fuer Hitarea-Kalibrierwerte umsetzen (laden/speichern/reset pro Board, sofort wirksam im Hit-Test).
- [ ] TODO P1-T31 [P0] Spezialraum-Animationen debuggen und den visuellen Renderpfad reparieren, sodass Running-List und sichtbarer Zustand konsistent sind.
- [ ] TODO P1-T32 [P0] Bugfix fuer Kombination `Spezialraum + Alarm Beacon`: globaler Timer darf nicht stoppen, andere Animationen muessen sichtbar weiterlaufen.
- [ ] TODO P1-T33 [P0] Regression-Absicherung ergaenzen (kombinierter Triggerpfad inkl. Audio-parallel), Nachweis in Acceptance-Artefakten dokumentieren.
