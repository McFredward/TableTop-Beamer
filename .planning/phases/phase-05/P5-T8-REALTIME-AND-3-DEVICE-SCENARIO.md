# P5-T8 Realtime + 3-Device Scenario Nachweis

## Scope
- Plan 5-1 Fokus P5-T1..P5-T8
- Multi-Client Session-Handshake + Heartbeat + Event-Contract
- Final-Output Rolle (`final-output`) ohne Board/Overlay-Hilfen
- Alignment-Overlay Toggle mit Rollen-Guard

## API Smoke (lokal, Port 4291)

Ausgefuehrter Smoke-Flow:
1. `GET /api/health`
2. `GET /api/session/connect?sessionId=smoke&role=operator&version=5-1`
3. `POST /api/session/event` mit `type=room-start` + `sharedState.runningAnimations`
4. `POST /api/session/heartbeat`

Ergebnis:
- Health: `200 OK`, Session-Endpoints + Version `5-1` vorhanden
- Connect: Session-Snapshot mit `clientId`, `role`, `heartbeatIntervalMs`, `staleTimeoutMs`
- Event: `seq` inkrementiert (`0 -> 1`), shared state serverseitig uebernommen
- Heartbeat: Snapshot konsistent, Client weiterhin aktiv

## 3-Device Szenario (Acceptance-orientierter Durchlaufplan)

### Rollenbelegung
- Device A (Laptop): `operator`
- Device B (Tablet): `alignment`
- Device C (Raspberry/Beamer): `final-output`

### Session Setup
- Alle drei Clients mit identischer Session-ID starten (z. B. `nemesis-lan`)
- Rolle pro Client im Settings-Panel setzen
- `Session verbinden / reconnect` pro Client ausfuehren

### Acceptance Checks
1. **Boot/Join:** alle Clients zeigen `Session: verbunden (...)`
2. **Final-Output clean:** Device C zeigt nur Effekt-Canvas (kein Board, kein Overlay, keine Labels, keine Settings)
3. **Alignment Toggle:** Device B kann Overlay toggeln; Device C bleibt unveraendert clean
4. **Trigger/Edit/Stop/Clear-All Sync:** Aktionen auf Device A replizieren in Echtzeit auf B/C
5. **Reconnect:** WLAN kurz trennen (z. B. Device B), danach reconnect; Snapshot stellt Zustand wieder her
6. **Role Switch:** Wechsel auf/von `final-output` aktualisiert Renderpfad sofort

## Ergebnisstatus
- Implementiert und lokal API-seitig verifiziert: **Handshake + Heartbeat + Event-Contract + Snapshot-Recover**
- Implementiert im Client: **Role-Gates, Final-Output Clean-Route, Alignment-Toggle + Rollenguard, Trigger/Edit/Stop/Clear-All Event-Emission**
- Reales 3-Device-LAN mit physischem Raspberry/Beamer: **bereit zur manuellen Endabnahme nach obigem Ablauf**
