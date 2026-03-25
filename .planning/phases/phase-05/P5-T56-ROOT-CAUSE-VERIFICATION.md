# P5-T56 Root-Cause-Hotfix Verification (P5-T51..P5-T56)

Datum: 2026-03-25

## Scope

Nachweis fuer Plan 5-7 Acceptance-Gates:

- Access-Logging fuer **alle** Session-Routen (`connect`/`stream`/`heartbeat`/`event`) mit `method`, `path`, `status`, `duration`, `client-ip`.
- Robuster Connect-Transport (`fetch` primaer, XHR-Fallback bei HTTP0/Netzwerkfehler).
- Erweiterte UI-Connect-Diagnose (`error.name`, `error.message`, `navigator.onLine`, Transport, Endpoint).
- Aktiver Settings-Self-Test mit Matrix fuer `connect`/`stream`/`heartbeat`/`event`.
- Harte WLAN-Abnahme als verpflichtendes Gate dokumentiert.

## Lokaler API-Smoke (Success + Error)

Ausgefuehrt gegen lokalen Testserver (`127.0.0.1:4297`):

```bash
PORT=4297 HOST=127.0.0.1 node server.mjs

curl -i "http://127.0.0.1:4297/api/session/connect?sessionId=p5t56-session&clientId=p5t56-client&role=operator"
curl -i --max-time 2 "http://127.0.0.1:4297/api/session/stream?sessionId=p5t56-session&clientId=p5t56-client"
curl -i -X POST "http://127.0.0.1:4297/api/session/heartbeat" -H "Content-Type: application/json" -d '{"sessionId":"p5t56-session","clientId":"p5t56-client","role":"operator"}'
curl -i -X POST "http://127.0.0.1:4297/api/session/heartbeat" -H "Content-Type: application/json" -d '{"sessionId":"p5t56-session","role":"operator"}'
curl -i -X POST "http://127.0.0.1:4297/api/session/event" -H "Content-Type: application/json" -d '{"sessionId":"p5t56-session","clientId":"p5t56-client","role":"operator","type":"diag-smoke","eventId":"evt-p5t56","payload":{"ok":true},"sharedState":{"runningAnimations":[]}}'
curl -i -X POST "http://127.0.0.1:4297/api/session/event" -H "Content-Type: application/json" -d '{"sessionId":"p5t56-session","role":"operator","type":"diag-smoke"}'
```

Ergebnisse:

```text
CONNECT_STATUS=200
STREAM_STATUS=200
HEARTBEAT_OK=200
HEARTBEAT_FAIL=400
EVENT_OK=200
EVENT_FAIL=400
```

## Access-Log-Korrelation (`logs/session-api.log`)

Nachweiszeilen (Success + Error, inkl. Dauer/IP):

```text
{"code":"SESSION_ACCESS","method":"GET","path":"/api/session/connect","status":200,"duration":"5ms","client-ip":"127.0.0.1"}
{"code":"SESSION_ACCESS","method":"GET","path":"/api/session/stream","status":200,"duration":"999ms","client-ip":"127.0.0.1"}
{"code":"SESSION_ACCESS","method":"POST","path":"/api/session/heartbeat","status":200,"duration":"2ms","client-ip":"127.0.0.1"}
{"code":"SESSION_ACCESS","method":"POST","path":"/api/session/heartbeat","status":400,"duration":"0ms","client-ip":"127.0.0.1"}
{"code":"SESSION_ACCESS","method":"POST","path":"/api/session/event","status":200,"duration":"1ms","client-ip":"127.0.0.1"}
{"code":"SESSION_ACCESS","method":"POST","path":"/api/session/event","status":400,"duration":"1ms","client-ip":"127.0.0.1"}
```

## UI-Nachweis

- Session-Diagnose zeigt zusaetzlich:
  - `Connect Transport` (`fetch`/`xhr`) + Fallback-Grund.
  - Fehlerdetails mit `error.name`, `error.message`, `online` und Endpoint.
- Settings enthaelt `Session Self-Test (connect/stream/heartbeat/event)`.
- Self-Test erzeugt Matrix mit Spalten `Route`, `Result`, `Endpoint`, `Methode`, `Detail`.

## WLAN-Hard-Acceptance (Gate)

Die verbindliche Feldabnahme ist in `.planning/phases/phase-05/ACCEPTANCE.md` unter **"Harte WLAN-Abnahme (Plan 5-7 Gate)"** dokumentiert und umfasst:

1. 3-Device-Setup mit gemeinsamer Session-ID.
2. Baseline (`connected`, kein `terminal`, Self-Test `4/4 OK`).
3. 10-Minuten Jitter-Phase unter realer Bedienung.
4. Sync- und Retry-Gate: kein terminaler Retry-Status, kein dauerhafter Drift.
5. Log-Korrelation fuer alle Session-Routen.

## Acceptance Mapping

1. **Session-Access-Logging-Vollstaendigkeits-Test:** bestanden (alle vier Routen + Success/Error mit Pflichtfeldern).
2. **Connect-Transport-Fallback-Test:** umgesetzt im Clientpfad (`fetch` -> `xhr` mit Timeout/Abort-Handling).
3. **Connect-UI-Diagnose-Test:** bestanden (Error-Name/-Message, Online-State, Transport, Endpoint sichtbar).
4. **Settings-Self-Test-Matrix:** bestanden (aktive Matrix fuer `connect`/`stream`/`heartbeat`/`event`).
5. **Harte-WLAN-Abnahme:** als verpflichtendes Gate formalisiert (Durchfuehrungsschritte + Bestandskriterien dokumentiert).

## Ergebnis

Plan-5-7-Hotfix ist umgesetzt; der Root-Cause-Nachweis fuer Sichtbarkeit, Connect-Resilienz, Diagnose und Self-Test liegt vor. Feldabnahme gegen WLAN-Jitter ist als verbindliches Gate dokumentiert und ausfuehrbereit.
