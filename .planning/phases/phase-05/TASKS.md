# Phase 5 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

## Plan 5-1 - Multi-Device Live-Sync Core (erste Ausfuehrungswelle, execute-ready)
- [x] DONE P5-T1 [P0] Serverseitige Final-Output-Route `/output/final` bereitstellen und in Startup-Doku verankern.
- [x] DONE P5-T2 [P0] Final-Output-Render-Guard implementieren: kein Board-Bild, keine Raum-Polygone, keine Raum-Namen.
- [x] DONE P5-T3 [P0] Final-Output an bestehende FX-Renderpfade anbinden (room/global/inside/outside), ohne Controller-UI-Anteile.

- [x] DONE P5-T4 [P0] Shared Session-State am Server einfuehren (Snapshot + Versionszaehler + letzte Mutation).
- [x] DONE P5-T5 [P0] Client-Aktionen serverautoritiv mutieren (Trigger/Edit/Stop/Clear-All/Align-Toggle).
- [x] DONE P5-T6 [P0] Broadcast-Kanal fuer sofortige Push-Synchronisierung auf alle verbundenen Clients einbauen.
- [x] DONE P5-T7 [P0] Reconnect-/Join-Flow: neuer Client erhaelt unmittelbar den aktuellen Live-Snapshot.

- [x] DONE P5-T8 [P0] Globalen Align-Mode als Shared-State-Flag integrieren und ueber Controller toggelbar machen.
- [x] DONE P5-T9 [P0] Final-Output: Polygone nur bei aktivem Align-Mode einblenden; im Normalbetrieb ausblenden.
- [x] DONE P5-T10 [P0] Control-Views: Polygone unabhaengig vom Align-Mode immer sichtbar halten.

- [ ] TODO P5-T11 [P0] Rollenbasierte Audio-Routing-Entscheidung (`control` muted, `final-output` audible) implementieren.
- [ ] TODO P5-T12 [P0] Audio-Lifecycle-Guard pruefen (`start/loop/stop/clear-all`) mit strikter Output-Rollenbindung.

- [ ] TODO P5-T13 [P0] Persistentes Server-Logging als append-only Datei integrieren (konfigurierbarer Pfad, Rotation optional vorbereitet).
- [ ] TODO P5-T14 [P0] Strukturierte Log-Events fuer Session-Events, State-Aenderungen und Fehler schreiben.
- [ ] TODO P5-T15 [P0] P5-1 Gate-Regression dokumentieren (3-Client Live-Sync, Align-Mode, Audio-Routing, Log-Nachweise).

## Plan 5-2 - Diagnostics + Hardening
- [ ] TODO P5-T16 [P1] Sichtbare Sync-/Connection-Diagnostik fuer Operator-Views ergaenzen (Rolle, verbunden, letzte Sync-Zeit).
- [ ] TODO P5-T17 [P1] Latenz-/Burst-Soak fuer parallele Trigger aus 2 Controller-Clients dokumentieren.
- [ ] TODO P5-T18 [P1] E2E-Abnahme im echten Setup (Handy + PC + Raspberry Pi/Beamer) als Artefakt protokollieren.
