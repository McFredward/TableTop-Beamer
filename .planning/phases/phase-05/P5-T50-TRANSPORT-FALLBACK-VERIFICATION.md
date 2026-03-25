# P5-T50 Transport-Fallback + Runbook Verification (P5-T45..P5-T50)

Datum: 2026-03-25

## Scope

Nachweis fuer die Acceptance-Gates von Plan 5-6:

- persistentes Session-Logfile unter `logs/session-api.log`
- Heartbeat POST-primaer + GET-kompatibler Fallback
- optionaler Event POST->GET-Fallback inkl. Duplicate-Guard
- methodenscharfe Logzeilen fuer Heartbeat/Event
- Runbook-Update mit Debug-/Auslesebefehlen

## Ausgefuehrter Smoke (lokal)

```bash
HOST=127.0.0.1 PORT=4295 node server.mjs

curl -i "http://127.0.0.1:4295/api/session/connect?sessionId=verify-session&clientId=verify-client&role=operator"
curl -i -X POST "http://127.0.0.1:4295/api/session/heartbeat" -H "Content-Type: application/json" -d '{"sessionId":"verify-session","clientId":"verify-client","role":"operator"}'
curl -i "http://127.0.0.1:4295/api/session/heartbeat?sessionId=verify-session&clientId=verify-client&role=operator"
curl -i -X POST "http://127.0.0.1:4295/api/session/event" -H "Content-Type: application/json" -d '{"sessionId":"verify-session","clientId":"verify-client","role":"operator","type":"diag-smoke","eventId":"evt-p5t50-post","payload":{"ok":true},"sharedState":{"runningAnimations":[]}}'
curl -i "http://127.0.0.1:4295/api/session/event?sessionId=verify-session&clientId=verify-client&role=operator&type=diag-smoke&eventId=evt-p5t50-get&payload=%7B%22ok%22%3Atrue%7D&sharedState=%7B%22runningAnimations%22%3A%5B%5D%7D"
curl -i "http://127.0.0.1:4295/api/session/event?sessionId=verify-session&clientId=verify-client&role=operator&type=diag-smoke&eventId=evt-p5t50-get&payload=%7B%22ok%22%3Atrue%7D&sharedState=%7B%22runningAnimations%22%3A%5B%5D%7D"
```

Ergebnisstatus:

```text
CONNECT_STATUS=200
HB_POST_STATUS=200
HB_GET_STATUS=200
EVENT_POST_STATUS=200
EVENT_GET_STATUS=200
EVENT_DUP_STATUS=200
```

Duplicate-Guard Response (`/tmp/p5t50-event-dup.json`):

```json
{
  "ok": true,
  "duplicate": true
}
```

## Logfile-Nachweis

`logs/session-api.log` enthaelt methodenscharfe Eintraege:

- `SESSION_HEARTBEAT_OK` mit `"method":"POST"`
- `SESSION_HEARTBEAT_OK` mit `"method":"GET"`
- `SESSION_EVENT_OK` mit `"method":"POST"`
- `SESSION_EVENT_OK` mit `"method":"GET"`
- `SESSION_EVENT_DUPLICATE_IGNORED` bei wiederholtem `eventId`

Beispielzeilen:

```text
{"code":"SESSION_HEARTBEAT_OK","endpoint":"/api/session/heartbeat","method":"POST","status":200,...}
{"code":"SESSION_HEARTBEAT_OK","endpoint":"/api/session/heartbeat","method":"GET","status":200,...}
{"code":"SESSION_EVENT_OK","endpoint":"/api/session/event","method":"POST","status":200,...}
{"code":"SESSION_EVENT_OK","endpoint":"/api/session/event","method":"GET","status":200,...}
{"code":"SESSION_EVENT_DUPLICATE_IGNORED","endpoint":"/api/session/event","method":"GET","status":200,...}
```

## Runbook-Nachweis

- `README.md`: Abschnitt **Heartbeat/Event-Diagnose korrekt testen (POST-primaer mit GET-Fallback)**
- `.planning/phases/phase-05/README.md`: Abschnitt **Logauslese-Checkliste** mit konkreten Debug-Befehlen

## Acceptance Mapping

1. **Persistentes-Logfile-Test (ACCEPTANCE Zeile 27 / 65):** `logs/session-api.log` vorhanden, wiederholte API-Requests geschrieben.
2. **Heartbeat-Fallback-Test (Zeile 28):** Heartbeat POST `200`, Heartbeat GET `200`, beide im Log sichtbar.
3. **Event-Fallback-Test optional (Zeile 29):** Event GET erreichbar; Duplicate-Guard (`duplicate=true`, `SESSION_EVENT_DUPLICATE_IGNORED`) verhindert Doppelauslieferung.
4. **Transport-UI/Runbook-Methode (Zeile 30/31/67):** Runbook auf POST-primaer + GET-Fallback aktualisiert, inkl. konkreter `curl`- und Logauslese-Kommandos.

## Ergebnis

P5-T50 bestanden: Transport-Fallback und persistente Logdiagnose sind inklusive Runbook- und Nachweisartefakt umgesetzt.
