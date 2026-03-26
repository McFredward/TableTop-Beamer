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

- [x] DONE P5-T11 [P0] Rollenbasierte Audio-Routing-Entscheidung (`control` muted, `final-output` audible) implementieren.
- [x] DONE P5-T12 [P0] Audio-Lifecycle-Guard pruefen (`start/loop/stop/clear-all`) mit strikter Output-Rollenbindung.

- [x] DONE P5-T13 [P0] Persistentes Server-Logging als append-only Datei integrieren (konfigurierbarer Pfad, Rotation optional vorbereitet).
- [x] DONE P5-T14 [P0] Strukturierte Log-Events fuer Session-Events, State-Aenderungen und Fehler schreiben.
- [x] DONE P5-T15 [P0] P5-1 Gate-Regression dokumentieren (3-Client Live-Sync, Align-Mode, Audio-Routing, Log-Nachweise).

## Plan 5-HF1 - Verbindlicher Bugfix-Hotfix (priorisiert, execute-ready)
- [x] DONE P5-T19 [P0] Shared-State-Schema fuer Outside-Space vervollstaendigen (`enabled`, `speed`, relevante Outside-Parameter) und serverseitig versioniert fuehren.
- [x] DONE P5-T20 [P0] Outside-Mutationen serverautoritiv haerten (ON/OFF, Speed, relevante Parameter) und vollstaendig an alle Clients broadcasten.
- [x] DONE P5-T21 [P0] Join/Reconnect-Snapshot fuer Outside-State nachziehen, damit neue Clients ohne Reload den identischen Outside-Stand erhalten.
- [x] DONE P5-T22 [P0] `/output/final` Bootstrap-/Mount-Pfad reparieren, sodass die Final-Seite nicht weiss bleibt und der FX-Renderpfad deterministisch startet.
- [x] DONE P5-T23 [P0] Final-Output-UI-Guard verstaerken: keine Slider/Settings/UI-Elemente im Final-Render; Align-Mode ON bleibt die einzige Overlay-Ausnahme.
- [x] DONE P5-T24 [P0] Hotfix-Regression dokumentieren (3-Client Outside-Sync + Final-Output FX-only/Align-Ausnahme + White-Page-Negativtest).

## Plan 5-HF2 - Sync-Reliability-Hotfix (P0, execute-ready)
- [x] DONE P5-T25 [P0] Root-Cause fuer nicht-deterministischen First-Click-Sync analysieren (Event->Mutation->Dedup->Ack) und reproduzierbare Fehlerfaelle dokumentieren.
- [x] DONE P5-T26 [P0] Serverseitige Apply-Logik fuer Outside `direction`/`mode` und Room-Animation-Aktionen idempotent + autoritativ haerten.
- [x] DONE P5-T27 [P0] Sofortige Broadcast-Bestaetigung je Mutation einziehen (Ack mit Mutation-ID/Version) und Client-Apply daran binden.
- [x] DONE P5-T28 [P0] Ordering/Versioning fuer schnelle Toggle-Folgen robust machen (monotone Version, stale-drop, deterministic last-write).
- [x] DONE P5-T29 [P0] Join/Reconnect + Inflight-Synchronisierung absichern (Snapshot + letzte bestaetigte Version ohne Drift).
- [x] DONE P5-T30 [P0] Regressiontests fuer Single-Click-Sync ergaenzen: Outside mode/direction sowie Room trigger/edit/stop/clear-all.
- [x] DONE P5-T31 [P0] Hotfix-Abnahme dokumentieren (Mehrfachklick-Negativtest, Burst-Toggle-Soak, 3-Client-Paritaet).

## Plan 5-2 - Diagnostics + Hardening (nach P0-Hotfixes)
- [ ] TODO P5-T16 [P1] Sichtbare Sync-/Connection-Diagnostik fuer Operator-Views ergaenzen (Rolle, verbunden, letzte Sync-Zeit).
- [ ] TODO P5-T17 [P1] Latenz-/Burst-Soak fuer parallele Trigger aus 2 Controller-Clients dokumentieren.
- [ ] TODO P5-T18 [P1] E2E-Abnahme im echten Setup (Handy + PC + Raspberry Pi/Beamer) als Artefakt protokollieren.
