# Phase 5 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

Aktuelle P0-Prioritaet (verbindlich): Plan 5-8 (P5-T57..P5-T62) vor allen offenen Resttasks aus 5-2 und 5-1.

## Plan 5-1 - Multi-Client Final-Output Routing (execute-ready)
- [x] DONE P5-T1 [P0] Rollenmodell im Runtime-State einfuehren (`operator`, `alignment`, `final-output`) inkl. safe fallback fuer unbekannte Rollen.
- [x] DONE P5-T2 [P0] Session-Handshake/Join-Protokoll erweitern (Role-Announcement, Session-ID, Client-ID, Version-Guard).
- [x] DONE P5-T3 [P0] Reconnect-/Heartbeat-Guard implementieren (stale client cleanup, Snapshot-Recover bei Rejoin).
- [x] DONE P5-T4 [P0] Final-Output-Renderroute einbauen: Board-Hintergrund, Polygon-Overlay, Handles und Raumlabels fuer Rolle `final-output` unterdruecken.
- [x] DONE P5-T5 [P0] Render-Layer-Guard zentralisieren, damit `final-output` niemals Editor-/Settings-Hilfselemente rendert.
- [x] DONE P5-T6 [P0] Alignment-Mode-Toggle in UI + Session-State + Persistenz integrieren.
- [x] DONE P5-T7 [P0] Erste Rollenregel fuer Alignment-Mode umgesetzt (wird durch Plan-5-2-Hotfix semantisch korrigiert).
- [x] DONE P5-T8 [P0] Realtime-Sync fuer Trigger/Edit/Stop/Clear-All als verbindlichen Event-Contract stabilisieren.
- [ ] TODO P5-T9 [P0] Running-Instanzen clientuebergreifend konsistent replizieren (IDs, Parameter, lifecycle, stop reasons).
- [ ] TODO P5-T10 [P0] Snapshot-/Delta-Drift-Guard ergaenzen (Out-of-order events, missed packets, full-resync fallback).
- [ ] TODO P5-T11 [P0] Audio-Initialisierung rollenbasiert kapseln: Audio nur bei Rolle `final-output` aktivieren.
- [ ] TODO P5-T12 [P0] Audio-Role-Switch-Handling absichern: bei Rollenwechsel sofortiger Audio-Stop/Start ohne Doppelausgabe.
- [ ] TODO P5-T13 [P0] 3-Device-Verifikationsprotokoll erstellen (Laptop Operator, Tablet Alignment, Raspberry/Beamer Final Output).
- [ ] TODO P5-T14 [P0] Plan-5-1-Fokusregression dokumentieren (clean final output, realtime sync, alignment toggle, audio role isolation).

## Plan 5-2 - Priorisierter Hotfix (execute-ready, nach Plan 5-8/5-7/5-6/5-5/5-3 Abschluss)
- [x] DONE P5-T15 [P0] Overlay-Semantik hart korrigieren: `operator` sieht Alignment-Overlay immer (unabhaengig vom Toggle).
- [x] DONE P5-T16 [P0] Toggle-Wirkung auf `final-output` begrenzen: Flag steuert nur Overlay-Einblendung im Beamer-Output.
- [x] DONE P5-T17 [P0] Session-Connect-Pfad robust machen (Endpoint-Resolver + Join-Fallback + Guard gegen `default-session` Fehlpfad).
- [x] DONE P5-T18 [P0] Retry/Backoff fuer Session-Verbindung stabilisieren (Jitter, Retry-Counter, klarer terminal state bei permanentem Fehler).
- [x] DONE P5-T19 [P0] Diagnosepanel im Control-UI erweitern: Endpoint, Verbindungsstatus, letzte Fehlermeldung, Retry-Status, letzter erfolgreicher Connect.
- [x] DONE P5-T20 [P0] Session-/Diagnose-Events strukturieren und im UI konsistent ausgeben (kein Rohfehler-Noise, klare Feldhinweise).
- [ ] TODO P5-T21 [P0] 3-Device-Hotfix-Verifikation dokumentieren (Operator immer Overlay, Final-Output Toggle-Verhalten, Connect-Failure-Recovery).
- [ ] TODO P5-T22 [P0] Hotfix-Regressionsprotokoll finalisieren und als Gate fuer Rest von Plan 5-1 markieren.

## Plan 5-3 - Realbetrieb Endpoint-Drift Hotfix (execute-ready, hoechste Prioritaet)
- [x] DONE P5-T23 [P0] Session-Resolver auf UI-Origin-Port-Default fixieren (`:4173` im Node-Standardsetup), Legacy-Portdrift auf `:8080` verhindern.
- [x] DONE P5-T24 [P0] `localStorage`-Override-Guard einbauen: stale/legacy API-Bases validieren und nur bei Erreichbarkeit priorisieren.
- [x] DONE P5-T25 [P0] Resolver-Fallback-Regeln transparent machen (selection source + fallback reason) und fuer Connect/Retry vereinheitlichen.
- [x] DONE P5-T26 [P0] Session-Diagnose konsolidieren: aufgeloester Endpoint immer anzeigen, keine inkonsistenten `unaufgeloest`-Texte bei vorhandenem Last-Endpoint.
- [x] DONE P5-T27 [P0] Feldbetriebs-Startanleitung aktualisieren (Node-Start `--host 0.0.0.0 --port 4173`, UI-/Client-URLs, Troubleshooting-Kurzform).
- [x] DONE P5-T28 [P0] Realbetrieb-Hotfix-Verifikation dokumentieren (Negativfall stale `:8080` Override + Positivfall UI-Origin `:4173` + Diagnosekonsistenz).

## Plan 5-4 - Session/SSE-Stabilitaets-Hotfix (execute-ready, P0 sofort)
- [x] DONE P5-T31 [P0] Server-SSE-Broadcast haerten: write/broadcast-Fehler auf geschlossenen Sockets pro Stream abfangen, ohne Prozessabbruch.
- [x] DONE P5-T32 [P0] Defekte SSE-Streams hygienisch entfernen (close/error cleanup, keine stale stream handles in Sessions).
- [x] DONE P5-T33 [P0] Connect/Heartbeat-Reconnect stabilisieren: mehrfaches Reconnect nach Kurzunterbrechung ohne HTTP0->terminal loop.
- [x] DONE P5-T34 [P0] Session-Serverdiagnose ausbauen: strukturierte Fehlercodes fuer `connect`, `stream`, `heartbeat`, `event` inkl. Session-/Client-Korrelation.
- [x] DONE P5-T35 [P0] UI-Diagnose korrigieren: Heartbeat-Endpoint korrekt und getrennt von Connect-Endpoint anzeigen.
- [x] DONE P5-T36 [P0] Hotfix-Verifikation dokumentieren (SSE-close-Negativtest, Multi-Reconnect-Stabilitaet, endpoint-spezifische Logs/UI-Diagnose).

## Plan 5-5 - Session-Resilience-Hotfix aus Feldfeedback (execute-ready, P0 sofort)
- [x] DONE P5-T39 [P0] Session-Timeout-Budget entkoppeln: `connect`/`heartbeat`/`stream` nutzen dediziertes Session-Timeout statt Global-HTTP-Default.
- [x] DONE P5-T40 [P0] Heartbeat-Ausfalltoleranz einbauen: Reconnect erst nach N aufeinanderfolgenden Heartbeat-Fehlschlaegen (konfigurierbare Schwelle, Startwert 3).
- [x] DONE P5-T41 [P0] Retry-Determinismus verbessern: serialisierte Reconnect-Transition, sauberer Retry-Reset, kein schneller terminal state bei Kurzjitter.
- [x] DONE P5-T42 [P0] Diagnose/Runbook korrigieren: Heartbeat-Methodik als damalige Basisdoku vereinheitlichen inkl. reproduzierbarem `curl`-Smoke.
- [x] DONE P5-T43 [P0] WLAN-Jitter-Regressionstest erfassen (Handy im WLAN): kurze Aussetzer duerfen Session nicht sofort zerlegen.
- [x] DONE P5-T44 [P0] Hotfix-Nachweis dokumentieren (Timeout-Entkopplung, N-Failure-Guard, deterministischer Retry-Loop, damaliges Heartbeat-Runbook als Ausgangsbasis).

## Plan 5-6 - Transport-Fallback + persistente Logdiagnose (execute-ready, P0 sofort)
- [x] DONE P5-T45 [P0] Persistente Session-Server-Logdatei einbauen (`logs/session-api.log`): Request-Methode, Endpoint, Status, Fehlercode, Session-ID, Client-ID, Timestamp.
- [x] DONE P5-T46 [P0] Server-Heartbeat-Endpoint um GET-Unterstuetzung erweitern, kompatibel zu bestehendem POST-Pfad und identischem Error-Code-Schema.
- [x] DONE P5-T47 [P0] Client-Heartbeat auf POST-primaer mit deterministischem GET-Fallback umbauen (nur bei POST-Fehler, mit klarer Fallback-Ursache).
- [x] DONE P5-T48 [P0] Optionalen Session-Event-GET-Fallback implementieren (konfigurierbar), inklusive Duplikat-/Loss-Guard und nachvollziehbarer Diagnose.
- [x] DONE P5-T49 [P0] UI-Diagnose erweitern: aktuell genutzte Methode (`POST`/`GET-fallback`) fuer Heartbeat/Event samt Endpoint und letztem Methodenwechsel anzeigen.
- [x] DONE P5-T50 [P0] Runbook + Feldtestprotokoll erweitern: Logfile-Pfad, POST/GET-Fallback-Testbefehle, erwartete Logzeilen und Auslese-Checkliste dokumentieren.

## Plan 5-7 - Root-Cause-Hotfix CONNECT_UNREACHABLE (execute-ready, P0 sofort, hoechste Prioritaet, dritte Eskalation)
- [x] DONE P5-T51 [P0] Access-Logging fuer ALLE Session-API Requests (`connect`/`stream`/`heartbeat`/`event`) in `logs/session-api.log` verbindlich machen: immer Methode, Path, Status, Duration und Client-IP fuer Success + Error.
- [x] DONE P5-T52 [P0] Connect-Transport robust machen: `fetch` als Primaerpfad, deterministischer XHR-Fallback (oder gleichwertig) fuer HTTP0/Network-Error-Umgebungen mit sauberem Timeout-/Abort-Verhalten.
- [x] DONE P5-T53 [P0] UI-Fehlerdiagnose fuer Connect ausbauen: `error.name`, `error.message`, `navigator.onLine`, verwendeter Transport (`fetch`/`xhr`) und betroffener Endpoint immer sichtbar.
- [x] DONE P5-T54 [P0] Aktiven Self-Test-Button in `Settings` implementieren: testet `connect`/`stream`/`heartbeat`/`event` und zeigt eine Ergebnis-Matrix (`OK|FAIL`, Endpoint, Methode, Detail).
- [x] DONE P5-T55 [P0] Hard-Acceptance fuer Feldbetrieb ergaenzen: Stabil verbinden + synchronisieren ohne terminalen Retry-Status unter normalem WLAN als verpflichtendes Gate.
- [x] DONE P5-T56 [P0] Root-Cause-Hotfix-Verifikation dokumentieren (3-Device-Feldsetup, Access-Log-Korrelation, Self-Test-Matrix, kein Retry-Terminal im Normalbetrieb).

## Plan 5-8 - SSE-first Session-Stabilitaet aus dringendem Feldfeedback (execute-ready, P0 sofort, hoechste Prioritaet)
- [x] DONE P5-T57 [P0] SSE-first-Guard einziehen: solange Stream aktiv/offen ist, duerfen Heartbeat-Fehler die Session nicht auf `failed` setzen.
- [x] DONE P5-T58 [P0] Connectivity-State trennen: `streamConnected` und `heartbeatStatus` als getrennte Source-of-Truth in Runtime + UI fuehren.
- [x] DONE P5-T59 [P0] Reconnect-Policy korrigieren: Reconnect nur bei Stream-Abbruch oder explizitem Connect-Fehler; Heartbeat bleibt optionaler Liveness-Check/Fallback.
- [ ] TODO P5-T60 [P0] Emit-/Sync-Pfad robust halten: Event-Emit und State-Sync laufen weiter, auch wenn Heartbeat auf `degraded` steht.
- [ ] TODO P5-T61 [P0] Stream-State-Transitions diagnostisch erweitern: `opened|healthy|degraded|closed|reconnecting` mit Ursache in Logs erfassen.
- [ ] TODO P5-T62 [P0] Plan-5-8-Verifikation dokumentieren (SSE-first-Stabilitaet, getrennte Statusanzeige, Reconnect-Regel, Sync trotz heartbeat degraded).

## Optional direkt danach (P1)
- [ ] TODO P5-T37 [P1] Netzwerkdiagnosepanel fuer Sync-Latenz/Jitter/Resync-Counter als Debug-only Option.
- [ ] TODO P5-T38 [P1] Minimaler Operator-Hinweis fuer aktive Rolle + Endpoint, um Fehlkonfiguration schneller zu erkennen.
