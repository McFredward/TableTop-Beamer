# Phase 5 Backlog (Prepared)

## Epics
- Final Output Route (FX-only Beamer View)
- Shared Live-State and Multi-Client Synchronisation
- Align-Mode for Physical Beamer Calibration
- Output-Aware Audio Routing
- Persistent Server-Side Logging
- Phase-05 Bugfix Hotfix (Outside-Sync + Final-Output Renderpfad)
- Phase-05 Sync-Reliability-Hotfix (Single-Click Determinism)
- Phase-05 Context-Parity-Hotfix (Board/Layout Sync + Output-Route Decommission)
- Runtime Hardening and Real-Setup Verification

## Story Mapping
- P5-S1.1 Dedizierte Serverroute fuer Final-Output bereitstellen (`/output/final`).
- P5-S1.2 Final-Output-Rendervertrag definieren: keine Board-Hintergrundgrafik, keine Raum-Polygone, keine Raumnamen.
- P5-S1.3 Final-Output auf vorhandene FX-Pipelines mappen (room/global/inside/outside), ohne Controller-UI zu rendern.

- P5-S2.1 Gemeinsamen Session-State am Server halten (Snapshot + Versionierung).
- P5-S2.2 Client-Events (Trigger/Edit/Stop/Clear-All/Align-Toggle) serverseitig validieren und mutieren.
- P5-S2.3 State-Aenderungen an alle verbundenen Clients sofort broadcasten.
- P5-S2.4 Reconnect-Semantik: spaet joinende Clients erhalten aktuellen Snapshot ohne manuellen Refresh.

- P5-S3.1 Globalen Align-Mode-Flag in den Shared-State aufnehmen.
- P5-S3.2 Final-Output zeigt bei aktivem Align-Mode Polygon-Overlay fuer Ausrichtung, sonst nicht.
- P5-S3.3 Control-Views erzwingen dauerhaft sichtbare Polygone, unabhaengig vom Align-Mode.

- P5-S4.1 Output-Rolle im Client ableiten (`control` vs `final-output`).
- P5-S4.2 Audio-Engine auf rollenbasiertes Routing umstellen (nur `final-output` spielt Sound).
- P5-S4.3 Regression fuer `Clear All`, Stop und Ablauf: Audio stoppt sofort und nur am Final-Output.

- P5-S5.1 Persistentes Server-Logging als append-only Datei einbauen.
- P5-S5.2 Strukturierte Logevents definieren: `session_event`, `state_change`, `error`.
- P5-S5.3 Log-Kontext aufnehmen: timestamp, client-id, client-role, action/event-name, key payload summary.

- P5-S6.1 Operator-Diagnostik fuer Sync-Latenz/Verbindungsstatus sichtbar machen.
- P5-S6.2 End-to-End-Abnahme im echten 3-Geraete-Setup dokumentieren.

- P5-S7.1 Outside-Space-State als verpflichtenden Shared-State fuehren (`enabled`, `speed`, relevante Outside-Parameter inkl. Richtung/Modus, falls aktiv genutzt).
- P5-S7.2 Outside-Trigger/Edit/Stop/Clear-All-Mutationen serverseitig so haerten, dass Outside-State immer vollstaendig auf alle Clients repliziert.
- P5-S7.3 Join/Reconnect-Snapshot liefert Outside-State vollstaendig ohne manuellen Refresh.
- P5-S7.4 `/output/final` Bootstrap-/Renderpfad haerten: keine White-Page, kein UI-Leak, nur FX-Layer.
- P5-S7.5 Align-Ausnahme verifizieren: Polygon-Overlay ist nur bei Align-Mode ON sichtbar, sonst nicht.

- P5-S8.1 Root-Cause auf Event-/Mutation-/Dedup-/Ack-Ebene fuer Outside-Toggles und Room-Animation-Aktionen analysieren und beheben.
- P5-S8.2 Mutationspfad auf idempotentes, serverautoritatives Apply umstellen; jede Mutation erzeugt sofortige Broadcast-Bestaetigung (Ack + Version).
- P5-S8.3 Robustes Ordering/Versioning fuer schnelle Toggle-Folgen einziehen (keine stale Applies, keine stillen Drops, keine Duplikate).
- P5-S8.4 Regressionstests fuer Single-Click-Sync ergaenzen: Outside `direction`/`mode` und Room-Animation-Aktionen (`trigger`/`edit`/`stop`/`clear-all`).
- P5-S8.5 Join/Reconnect- und Inflight-Verhalten haerten: Snapshot + letzte bestaetigte Version muessen deterministisch zusammenpassen.

- P5-S9.1 Board-/Layout-Auswahl in den serverautoritativen Shared-State aufnehmen (kanonisches Feld inkl. Versionierung).
- P5-S9.2 Board-/Layout-Mutationen serverseitig validieren, anwenden und sofort an alle Rollen broadcasten.
- P5-S9.3 Join/Reconnect-Snapshot auf Board-/Layout-Kontext erweitern, sodass spaete Clients den identischen Arbeitsstand erhalten.
- P5-S9.4 Legacy-`Output Route` aus UI/State/Interaktionspfaden entfernen; dedizierter Ausgabepfad bleibt ausschliesslich `/output/final`.
- P5-S9.5 Regressionen fuer Board/Layout-Paritaet + Output-Route-Entfernung als Pflichtnachweis dokumentieren.

## Priorisierte erste Ausfuehrungswelle (P0) - Plan 5-1 execute-ready
- Story P5-S1.1 + P5-S1.2 + P5-S1.3.
  - Ziel: finaler Beamerpfad ist sauber getrennt und zeigt ausschliesslich FX.
- Story P5-S2.1 + P5-S2.2 + P5-S2.3 + P5-S2.4.
  - Ziel: gemeinsamer serverautoritiver Live-State mit sofortiger Multi-Client-Synchronisation.
- Story P5-S3.1 + P5-S3.2 + P5-S3.3.
  - Ziel: Align-Mode fuer Beamer-Kalibrierung, ohne Polygonverlust in Controller-Views.
- Story P5-S4.1 + P5-S4.2 + P5-S4.3.
  - Ziel: Audio strikt auf Final-Output begrenzen.
- Story P5-S5.1 + P5-S5.2 + P5-S5.3.
  - Ziel: persistente, auswertbare Serverlogs fuer Session, State und Fehler.

## Priorisierte Hotfix-Welle (P0) - Plan 5-HF1 execute-ready
- Story P5-S7.1 + P5-S7.2 + P5-S7.3.
  - Ziel: Outside-Space-State ist auf allen Clients strikt synchron (inkl. Join/Reconnect).
- Story P5-S7.4 + P5-S7.5.
  - Ziel: `/output/final` rendert stabil FX-only im Vollbild ohne UI; Align-Ausnahme bleibt korrekt.

## Priorisierte Hotfix-Welle (P0) - Plan 5-HF2 execute-ready
- Story P5-S8.1.
  - Ziel: Event-/Mutation-/Dedup-/Ack-Root-Cause fuer Mehrfachklick-Symptome ist reproduzierbar isoliert und beseitigt.
- Story P5-S8.2 + P5-S8.3.
  - Ziel: Jede einzelne Aktion repliziert beim ersten Klick serverautoritativ, idempotent und versionsstabil auf alle Clients.
- Story P5-S8.4 + P5-S8.5.
  - Ziel: Single-Click-Regression inkl. schneller Toggle-Folgen und Join/Reconnect ist abgesichert.

## Priorisierte Hotfix-Welle (P0) - Plan 5-HF3 execute-ready
- Story P5-S9.1 + P5-S9.2 + P5-S9.3.
  - Ziel: Ausgewaehltes Board/Layout bleibt ueber alle Clients inkl. Join/Reconnect deterministisch synchron.
- Story P5-S9.4 + P5-S9.5.
  - Ziel: `Output Route` ist vollstaendig entfernt; `/output/final` bleibt einziger dedizierter Output-Pfad ohne Regression.

## P1 direkt danach (Plan 5-2)
- Story P5-S6.1.
  - Ziel: transparente Verbindungs-/Sync-Diagnostik in der Runtime.
- Story P5-S6.2.
  - Ziel: formaler Real-Setup-Nachweis auf Handy + PC + Raspberry Pi.
