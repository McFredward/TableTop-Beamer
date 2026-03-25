# Phase 5 Workspace

Planung fuer den netzwerkfaehigen Mehrgeraete-Betrieb mit klaren Rollen (`operator`, `alignment`, `final-output`) und echtzeitfaehiger Synchronisierung. Nach verbindlichem Feldfeedback sind die Hotfix-Bloecke 5-5/5-4/5-3 execute-ready priorisiert (Session-Resilience + Session/SSE-Stabilitaet + Endpoint-Resolver-Konsistenz), danach 5-2/5-1 Rest.

- `PLAN.md`: Zielbild fuer Rollenmodell, Sync-Architektur, Overlay-Semantik und Hotfix-Priorisierung.
- `BACKLOG.md`: Epics und Story-Mapping fuer Plan 5-1 plus Hotfix-Add-ons 5-2/5-3/5-4/5-5.
- `TASKS.md`: priorisierte Ausfuehrungswellen (5-5 P0 sofort, danach 5-4/5-3/5-2 und 5-1-Rest).
- `ACCEPTANCE.md`: 3-Device-Verifikationsmatrix inkl. Overlay-/Session-Diagnose-Pflichtfaellen.
- `RISKS.md`: zentrale Netzwerk-, Sync- und Rollenrisiken inkl. Diagnose- und Verbindungsrisiken.
- `EXECUTE.md`: verbindliche Reihenfolge und Gate-Regeln fuer den Hotfix-first Ablauf.

## Stand

- Plan 5-1 ist teilweise umgesetzt (P5-T1..P5-T8 done), Resttasks bleiben offen.
- Plan 5-2 Core ist umgesetzt (P5-T15..P5-T20 done), Gate-Nachweise P5-T21..P5-T22 bleiben offen.
- Plan 5-5 ist als neuer P0-Hotfix hoechstpriorisiert: Session-Timeout-Entkopplung, Heartbeat-N-Failure-Guard, deterministischer Retry-Loop und POST-only-Heartbeat-Runbook.
- Plan 5-4 ist umgesetzt (P5-T31..P5-T36 done) und bleibt Baseline fuer Session/SSE-Stabilitaet.
- Plan 5-3 ist umgesetzt (P5-T23..P5-T28 done) und bleibt Baseline fuer Resolver-/Diagnose-Konsistenz.

## Kurz-Runbook Feldbetrieb (Plan 5-3)

1. **Server starten (API + UI auf demselben Port):**
   - `node server.mjs --host 0.0.0.0 --port 4173`
2. **Client-URLs im selben LAN verwenden:**
   - Operator: `http://<SERVER-IP>:4173/?role=operator&session=default-session`
   - Alignment: `http://<SERVER-IP>:4173/?role=alignment&session=default-session`
   - Final Output: `http://<SERVER-IP>:4173/?role=final-output&session=default-session`
3. **Diagnose direkt in der UI pruefen:**
   - `Session Endpoint` zeigt `resolved endpoint + selected via + fallback reason`.
   - Zielzustand im Standardfall: `selected via session:ui-origin-default`, Port `:4173`.
   - Bei stale Override: `fallback reason` nennt den verworfenen Override und den UI-Origin-Fallback.
4. **Heartbeat manuell testen (POST-only):**
   - Erwartung: `GET /api/session/heartbeat` liefert `404` (by design, kein Fehler im Hotfix).
   - Korrekt ist ausschliesslich `POST` gegen denselben Endpoint, z. B.:
      - `curl -i -X POST "http://<SERVER-IP>:4173/api/session/heartbeat" -H "Content-Type: application/json" -d '{"sessionId":"default-session","clientId":"diag-client","role":"operator"}'`
