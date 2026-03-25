# Phase 5 Workspace

Planung fuer den netzwerkfaehigen Mehrgeraete-Betrieb mit klaren Rollen (`operator`, `alignment`, `final-output`) und echtzeitfaehiger Synchronisierung. Nach dritter Eskalation ist Root-Cause-Hotfix 5-7 execute-ready als neue P0-Spitze priorisiert (vollstaendiges Session-Access-Logging, Connect-Transportfallback fuer HTTP0, aktive Self-Tests, harte WLAN-Abnahme), danach 5-6/5-5/5-4/5-3 und 5-2/5-1 Rest.

- `PLAN.md`: Zielbild fuer Rollenmodell, Sync-Architektur, Overlay-Semantik und Hotfix-Priorisierung.
- `BACKLOG.md`: Epics und Story-Mapping fuer Plan 5-1 plus Hotfix-Add-ons 5-2/5-3/5-4/5-5/5-6/5-7.
- `TASKS.md`: priorisierte Ausfuehrungswellen (5-7 P0 sofort, danach 5-6/5-5/5-4/5-3/5-2 und 5-1-Rest).
- `ACCEPTANCE.md`: 3-Device-Verifikationsmatrix inkl. Overlay-/Session-Diagnose-Pflichtfaellen.
- `RISKS.md`: zentrale Netzwerk-, Sync- und Rollenrisiken inkl. Diagnose- und Verbindungsrisiken.
- `EXECUTE.md`: verbindliche Reihenfolge und Gate-Regeln fuer den Hotfix-first Ablauf.

## Stand

- Plan 5-1 ist teilweise umgesetzt (P5-T1..P5-T8 done), Resttasks bleiben offen.
- Plan 5-2 Core ist umgesetzt (P5-T15..P5-T20 done), Gate-Nachweise P5-T21..P5-T22 bleiben offen.
- Plan 5-7 ist als neue P0-Sofortwelle execute-ready: End-to-End-Session-Access-Logging, fetch->XHR Connect-Fallback, erweiterte Connect-Fehlerdiagnose und aktiver Settings-Self-Test mit harter WLAN-Abnahme.
- Plan 5-6 ist umgesetzt und bleibt Baseline: persistentes Server-Logfile, Heartbeat-POST->GET-Fallback, optionaler Event-Fallback und methodenscharfe UI-Diagnose/Runbook.
- Plan 5-5 ist umgesetzt und bleibt Baseline: Session-Timeout-Entkopplung, Heartbeat-N-Failure-Guard und deterministischer Retry-Loop.
- Plan 5-4 ist umgesetzt (P5-T31..P5-T36 done) und bleibt Baseline fuer Session/SSE-Stabilitaet.
- Plan 5-3 ist umgesetzt (P5-T23..P5-T28 done) und bleibt Baseline fuer Resolver-/Diagnose-Konsistenz.

## Kurz-Runbook Feldbetrieb (Plan 5-7 + 5-6 Baseline)

1. **Server starten (API + UI auf demselben Port):**
   - `node server.mjs --host 0.0.0.0 --port 4173`
2. **Client-URLs im selben LAN verwenden:**
   - Operator: `http://<SERVER-IP>:4173/?role=operator&session=default-session`
   - Alignment: `http://<SERVER-IP>:4173/?role=alignment&session=default-session`
   - Final Output: `http://<SERVER-IP>:4173/?role=final-output&session=default-session`
3. **Diagnose direkt in der UI pruefen:**
    - `Session Endpoint` zeigt `resolved endpoint + selected via + fallback reason`.
    - `Heartbeat/Event Transport` zeigt je Pfad die zuletzt aktive Methode (`POST` oder `GET-fallback`).
    - Zielzustand im Standardfall: `selected via session:ui-origin-default`, Port `:4173`.
    - Bei stale Override: `fallback reason` nennt den verworfenen Override und den UI-Origin-Fallback.
4. **Logfile pruefen (persistente Session-Diagnose):**
    - Pfad: `logs/session-api.log`
    - Live-Check: `tail -f logs/session-api.log`
5. **Heartbeat/Event-Transport testen (POST-primaer + GET-Fallback):**
    - POST-Smoke Heartbeat:
       - `curl -i -X POST "http://<SERVER-IP>:4173/api/session/heartbeat" -H "Content-Type: application/json" -d '{"sessionId":"default-session","clientId":"diag-client","role":"operator"}'`
    - GET-Fallback Heartbeat (Server-Support-Smoke):
       - `curl -i "http://<SERVER-IP>:4173/api/session/heartbeat?sessionId=default-session&clientId=diag-client&role=operator"`
    - Event-POST-Smoke:
       - `curl -i -X POST "http://<SERVER-IP>:4173/api/session/event" -H "Content-Type: application/json" -d '{"sessionId":"default-session","clientId":"diag-client","type":"diag-smoke","payload":{"ok":true}}'`
     - Event-GET-Fallback-Smoke (wenn Fallback aktiv):
        - `curl -i "http://<SERVER-IP>:4173/api/session/event?sessionId=default-session&clientId=diag-client&type=diag-smoke"`
6. **Aktiven Self-Test in Settings ausfuehren (neu Plan 5-7):**
    - Button `Session Self-Test` startet `connect`/`stream`/`heartbeat`/`event` Checks.
    - Erwartung: Matrix zeigt pro Zeile `OK|FAIL`, Endpoint und Methode; Connect zeigt zusaetzlich verwendeten Transport (`fetch`/`xhr`).
7. **Logauslese-Checkliste:**
     - Heartbeat/Event-Methode nachvollziehen:
       - `rg '"endpoint":"/api/session/(heartbeat|event)"' logs/session-api.log`
     - Methodenswitch/Fallback-Faelle sichtbar machen:
        - `rg '"method":"GET"|"code":"SESSION_EVENT_DUPLICATE_IGNORED"' logs/session-api.log`
     - Connect-Access mit Dauer/IP sichtbar machen:
      - `rg '"path":"/api/session/connect"|"duration"|"client-ip"' logs/session-api.log`
     - Erwartung: Session-Requests enthalten fuer Success+Error immer Methode, Path, Status, Duration und Client-IP.
8. **WLAN-Jitter-Abnahme (verbindlich):**
    - 10 Minuten Feldlauf mit normalem Trigger/Edit/Stop sowie kurzen WLAN-Unterbrechungen.
    - Gate: kein terminaler Retry-Zustand, Running-Liste bleibt nach Rejoin konsistent, Self-Test danach erneut `4/4 OK`.
