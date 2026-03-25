# Phase 5 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

## Plan 5-1 - Multi-Client Final-Output Routing (execute-ready)
- [x] DONE P5-T1 [P0] Rollenmodell im Runtime-State einfuehren (`operator`, `alignment`, `final-output`) inkl. safe fallback fuer unbekannte Rollen.
- [x] DONE P5-T2 [P0] Session-Handshake/Join-Protokoll erweitern (Role-Announcement, Session-ID, Client-ID, Version-Guard).
- [x] DONE P5-T3 [P0] Reconnect-/Heartbeat-Guard implementieren (stale client cleanup, Snapshot-Recover bei Rejoin).
- [x] DONE P5-T4 [P0] Final-Output-Renderroute einbauen: Board-Hintergrund, Polygon-Overlay, Handles und Raumlabels fuer Rolle `final-output` unterdruecken.
- [x] DONE P5-T5 [P0] Render-Layer-Guard zentralisieren, damit `final-output` niemals Editor-/Settings-Hilfselemente rendert.
- [x] DONE P5-T6 [P0] Alignment-Mode-Toggle in UI + Session-State + Persistenz integrieren.
- [x] DONE P5-T7 [P0] Rollenregel fuer Alignment-Mode durchsetzen: Toggle wirkt nur auf `operator`/`alignment`, nicht auf `final-output`.
- [x] DONE P5-T8 [P0] Realtime-Sync fuer Trigger/Edit/Stop/Clear-All als verbindlichen Event-Contract stabilisieren.
- [ ] TODO P5-T9 [P0] Running-Instanzen clientuebergreifend konsistent replizieren (IDs, Parameter, lifecycle, stop reasons).
- [ ] TODO P5-T10 [P0] Snapshot-/Delta-Drift-Guard ergaenzen (Out-of-order events, missed packets, full-resync fallback).
- [ ] TODO P5-T11 [P0] Audio-Initialisierung rollenbasiert kapseln: Audio nur bei Rolle `final-output` aktivieren.
- [ ] TODO P5-T12 [P0] Audio-Role-Switch-Handling absichern: bei Rollenwechsel sofortiger Audio-Stop/Start ohne Doppelausgabe.
- [ ] TODO P5-T13 [P0] 3-Device-Verifikationsprotokoll erstellen (Laptop Operator, Tablet Alignment, Raspberry/Beamer Final Output).
- [ ] TODO P5-T14 [P0] Plan-5-1-Fokusregression dokumentieren (clean final output, realtime sync, alignment toggle, audio role isolation).

## Optional direkt danach (P1)
- [ ] TODO P5-T15 [P1] Netzwerkdiagnosepanel fuer Sync-Latenz/Jitter/Resync-Counter als Debug-only Option.
- [ ] TODO P5-T16 [P1] Minimaler Operator-Hinweis fuer aktive Rolle + Endpoint, um Fehlkonfiguration schneller zu erkennen.
