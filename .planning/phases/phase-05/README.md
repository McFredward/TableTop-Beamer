# Phase 5 Workspace

Planung fuer den netzwerkfaehigen Mehrgeraete-Betrieb mit klaren Rollen (`operator`, `alignment`, `final-output`) und echtzeitfaehiger Synchronisierung. Nach verbindlichem Feldfeedback sind Plan 5-2 und der nachgezogene Realbetrieb-Hotfix Plan 5-3 execute-ready priorisiert (Overlay-Semantik + robuste Session-Verbindung/Diagnostik + Endpoint-Resolver-Konsistenz).

- `PLAN.md`: Zielbild fuer Rollenmodell, Sync-Architektur, Overlay-Semantik und Hotfix-Priorisierung.
- `BACKLOG.md`: Epics und Story-Mapping fuer Plan 5-1 plus Hotfix-Add-ons 5-2/5-3.
- `TASKS.md`: priorisierte Ausfuehrungswellen (5-3 P0 zuerst, danach 5-2-Gates und 5-1-Rest).
- `ACCEPTANCE.md`: 3-Device-Verifikationsmatrix inkl. Overlay-/Session-Diagnose-Pflichtfaellen.
- `RISKS.md`: zentrale Netzwerk-, Sync- und Rollenrisiken inkl. Diagnose- und Verbindungsrisiken.
- `EXECUTE.md`: verbindliche Reihenfolge und Gate-Regeln fuer den Hotfix-first Ablauf.

## Stand

- Plan 5-1 ist teilweise umgesetzt (P5-T1..P5-T8 done), Resttasks bleiben offen.
- Plan 5-2 Core ist umgesetzt (P5-T15..P5-T20 done), Gate-Nachweise P5-T21..P5-T22 bleiben offen.
- Plan 5-3 ist als neuer P0-Hotfix hoechstpriorisiert: Resolver-Default auf UI-Origin-Port (`:4173`), stale-override-Guard, konsistente Session-Diagnose, aktualisierte Betriebsanleitung.

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
