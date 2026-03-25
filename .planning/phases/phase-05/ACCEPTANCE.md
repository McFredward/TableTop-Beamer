# Phase 5 Acceptance

## Verifikationsstrategie
- Pflicht ist ein 3-Device-Szenario im selben LAN: (A) Laptop `operator`, (B) Tablet `alignment`, (C) Raspberry/Beamer `final-output`.
- Tests laufen als Positiv- und Negativpfade (Role-Switch, Reconnect, Netzwerkunterbrechung, Audio-Leak-Check).
- Jede P0-Aenderung endet mit kurzem Smoke plus einem rollenbezogenen Cross-Client-Check.
- Exit erst nach dokumentierter End-to-End-Abnahme aller Kernanforderungen.

## Pflichtmatrix (Plan 5-1)
- Boot/Join-Test: alle drei Clients joinen dieselbe Session mit korrekter Rolle und stabiler Anzeige.
- Final-Output-Clean-Test: Raspberry/Beamer zeigt bei deaktiviertem Final-Overlay-Toggle keine Boards, Polygone, Handles oder Raumnamen.
- Overlay-Semantik-Test: `operator` sieht Polygon-Overlay immer; Toggle beeinflusst nur die Overlay-Sichtbarkeit auf `final-output`.
- Trigger-Sync-Test: Start/Edit/Stop/Clear-All propagiert in Echtzeit auf alle Clients ohne Drift.
- Running-List-Sync-Test: Instanzanzahl, IDs und Parameter sind auf allen Clients konsistent.
- Reconnect-Test: getrennten Client wieder verbinden; Snapshot-Recover stellt konsistenten Zustand her.
- Role-Switch-Test: Wechsel zu/von `final-output` aktualisiert Render- und Audioverhalten sofort korrekt.
- Session-Hotfix-Test: Verbindungsaufbau funktioniert reproduzierbar ohne `Session-Verbindung fehlgeschlagen (default-session)`.
- Resolver-Default-Test: Bei UI-Aufruf auf `http://<host>:4173` nutzt Session-Connect standardmaessig denselben Host+Port (`:4173`) und nicht `:8080`.
- Stale-Override-Negativtest: Legacy-`localStorage`-Override auf unerreichbaren Endpoint wird nicht blind priorisiert; Connect faellt nachvollziehbar auf gueltigen Endpoint zurueck.
- Diagnose-Transparenz-Test: UI zeigt Endpoint, aktuellen Status, letzte Fehlermeldung und Retry-Status fuer den Session-Pfad.
- Diagnose-Konsistenz-Test: UI zeigt nie gleichzeitig `Endpoint noch nicht aufgeloest` und einen konkreten Last-Endpoint im Fehlertext; `resolved endpoint` + `selection source` sind synchron.
- SSE-Close-Robustheits-Test: geschlossener/abgebrochener SSE-Stream waehrend Broadcast erzeugt keinen Prozessabbruch; defekter Stream wird aus Session-Registry entfernt.
- Multi-Reconnect-Stabilitaets-Test: mindestens 5 Connect/Disconnect-Zyklen pro Client ohne HTTP0-Heartbeat-Fehlerkaskade und ohne terminalen reconnect loop.
- Session-Timeout-Entkopplungs-Test: Session-Requests verwenden dediziertes Timeout-Budget; kurze Jitter triggern keinen sofortigen Global-Timeout-Abbruch.
- Heartbeat-N-Failure-Test: Reconnect startet erst nach definierter Zahl aufeinanderfolgender Heartbeat-Fehlschlaege (z. B. 3), nicht nach Einzel-Fehler.
- Retry-Determinismus-Test: bei kurzen WLAN-Aussetzern kein schneller terminal state; Retry-Zustandsuebergaenge sind reproduzierbar.
- Persistentes-Logfile-Test: Server schreibt dauerhaft in `logs/session-api.log`; `connect`/`stream`/`heartbeat`/`event` enthalten Methode, Endpoint, Status, Fehlercode, Session-/Client-Korrelation.
- Session-Access-Logging-Vollstaendigkeits-Test: jeder Session-Request (`connect`/`stream`/`heartbeat`/`event`) erzeugt einen Logeintrag mit `method`, `path`, `status`, `duration`, `client-ip` (Success + Error).
- Heartbeat-Fallback-Test: bei erzwungenem POST-Fehler wird Heartbeat via GET-Fallback erfolgreich fortgesetzt (kein sofortiger terminal loop).
- Event-Fallback-Test (optional aktiv): bei erzwungenem Event-POST-Fehler wird GET-Fallback genutzt, ohne Event-Duplikate oder Event-Verlust.
- Connect-Transport-Fallback-Test: bei erzwungenem Connect-HTTP0/Network-Fehler wechselt der Client deterministisch von `fetch` auf XHR-Fallback (oder gleichwertig) und verbindet ohne terminalen Retry.
- Connect-UI-Diagnose-Test: Fehleranzeige enthaelt `error.name`, `error.message`, `navigator.onLine`, verwendeten Transport und Endpoint.
- Settings-Self-Test-Matrix: aktiver Button prueft `connect`/`stream`/`heartbeat`/`event`; Matrix zeigt pro Testfall `OK|FAIL`, Endpoint und Methode reproduzierbar.
- Transport-UI-Diagnose-Test: UI zeigt fuer Heartbeat/Event Endpoint plus effektiv genutzte Methode (`POST` oder `GET-fallback`) und letzten Methodenwechsel reproduzierbar.
- Runbook-Methoden-Test: Runbook dokumentiert POST-primaer + GET-Fallback fuer Heartbeat/Event inkl. konkreter `curl`-Kommandos und Logfile-Auslese.
- Harte-WLAN-Abnahme: im normalen Feld-WLAN bleibt Session stabil verbunden und synchronisiert; kein terminaler Retry-Status in der Dauerbeobachtung.
- Audio-Isolation-Test: Audio ist ausschliesslich auf `final-output` hoerbar; `operator` und `alignment` bleiben stumm.
- Audio-Negativtest: gleichzeitige Audioausgabe auf mehreren Clients tritt nicht auf, auch nicht nach Rejoin/Role-Switch.
- Raspberry-Betriebstest: mindestens 20 Minuten Laufzeit im 3-Device-Betrieb ohne sichtbaren Sync-Drift oder Audio-Fehlroute.

## Inkrementelle Gates
- Nach P5-T1..P5-T3: Rollen/Session/Reconnect stabil, keine stale-state Leaks.
- Nach P5-T4..P5-T5: finaler Output ist dauerhaft clean ohne Hilfsebenen.
- Nach P5-T15..P5-T16: Overlay-Semantik ist korrigiert (`operator` immer, Toggle nur `final-output`).
- Nach P5-T17..P5-T20: Session-Hotfix und Diagnosepfad sind stabil und transparent.
- Nach P5-T23..P5-T26: Resolver-Portdrift ist beseitigt, stale-Override-Guard aktiv, Diagnose konsistent.
- Nach P5-T27..P5-T28: Realbetrieb-Startanleitung + Verifikationsnachweis fuer Endpoint-Default/Override-Negativfall liegen vor.
- Nach P5-T31..P5-T35: serverseitiger Session/SSE-Pfad ist crash-safe, Heartbeat-Reconnect stabil und endpoint-spezifische Diagnose in Server+UI konsistent.
- Nach P5-T39..P5-T42: Session-Timeout-Entkopplung aktiv, Heartbeat-N-Failure-Guard wirksam, Retry-Loop deterministisch und Runbook-Basis fuer Transportdiagnose aktualisiert.
- Nach P5-T45..P5-T50: persistentes Logfile ist aktiv, Heartbeat/Event-Fallback transportstabil, methodenscharfe UI-Diagnose und erweitertes Runbook sind nachgewiesen.
- Nach P5-T51..P5-T55: End-to-End-Access-Logging ist vollstaendig, Connect-Fallback ist HTTP0-robust, UI-Diagnose erweitert, Self-Test-Matrix aktiv und harte WLAN-Abnahme als Gate definiert.
- Nach P5-T8..P5-T10: Realtime-Eventfluss und Snapshot-Recover bestehen Drift-/Loss-Checks.
- Nach P5-T11..P5-T12: Audio-Rollenregel ist technisch erzwungen und bei Role-Switch robust.
- Nach P5-T21..P5-T22: Hotfix-3-Device-Abnahme inkl. Nachweisprotokoll liegt vor.
- Nach P5-T36: P0-Session/SSE-Hotfix-Nachweis (Negativ + Positiv) liegt als Gate-Artefakt vor.
- Nach P5-T43..P5-T44: WLAN-Jitter-Nachweis und Plan-5-5-Hotfix-Verifikation liegen als Gate-Artefakt vor.
- Nach P5-T56: Root-Cause-Hotfix-Verifikation fuer Plan 5-7 liegt als Gate-Artefakt vor.
- Nach P5-T13..P5-T14: Plan-5-1-Abnahme inkl. Rest-Regression liegt vor.

## Definition of Done
- Alle P0-Tasks P5-T1..P5-T56 sind abgeschlossen oder mit Begruendung de-scoped.
- Final-Output-Rolle liefert bei deaktiviertem Final-Overlay-Toggle den geforderten cleanen Beamer-Output ohne Board/Polygone/Namen.
- Multi-Client-Realtime-Sync ist unter realem 3-Device-LAN-Betrieb nachgewiesen.
- Overlay-Semantik entspricht Betriebsvorgabe: `operator` immer sichtbar, Toggle steuert nur Final-Output-Overlay.
- Session-Verbindung und Diagnosepfad sind feldtauglich (klarer Endpoint, Status, Fehler- und Retry-Info in der UI).
- Resolver-Default bleibt im Zielsetup host/port-konsistent zur UI (`:4173`), und unerreichbare Legacy-Overrides werden transparent degradiert.
- Serverseitiger Session/SSE-Pfad bleibt bei defekten Streams stabil (kein Prozessabbruch, sauberes Stream-Cleanup).
- Mehrfache Reconnect-Zyklen fuehren nicht mehr in einen Heartbeat-HTTP0->terminal loop.
- Session-Requests sind gegen kurze WLAN-Jitter per dediziertem Session-Timeout robust und werden nicht durch Global-Defaults vorschnell abgebrochen.
- Heartbeat-Eskalation erfolgt erst nach N aufeinanderfolgenden Fehlschlaegen; Einzel-Fehler loesen keinen sofortigen Reconnect aus.
- Retry-State bleibt bei Kurzunterbrechungen deterministisch und faellt nicht schnell in terminal.
- Persistente Session-Serverlogs liegen unter `logs/session-api.log` vor und sind fuer Feldanalyse nachtraeglich auslesbar.
- Session-Access-Logging ist fuer alle Session-Endpoints vollstaendig (Methode, Path, Status, Duration, Client-IP fuer Success+Error).
- Server- und UI-Diagnose unterscheiden Connect vs Heartbeat/Event endpoint- und methodenspezifisch korrekt.
- Connect nutzt in HTTP0-/Network-Umgebungen robusten Transport-Fallback (`fetch` -> XHR oder gleichwertig) ohne sofortigen terminalen Retry-Abbruch.
- UI-Connect-Diagnose zeigt `error.name`, `error.message`, Online-State, Transport und Endpoint klar reproduzierbar.
- Settings-Self-Test liefert eine reproduzierbare OK/Fail-Matrix fuer `connect`/`stream`/`heartbeat`/`event` inkl. Endpoint+Methode.
- Im normalen WLAN-Feldsetup tritt kein terminaler Retry-Status mehr auf; Verbindung und Sync bleiben stabil.
- Runbook dokumentiert Heartbeat/Event als POST-primaer mit GET-Fallback inklusive korrekter `curl`-Beispiele und Logfile-Checks.
- Audio-Routing ist strikt `final-output` only verifiziert.
- Keine offenen P0-Blocker aus `RISKS.md`.

## Harte WLAN-Abnahme (Plan 5-7 Gate)

1. **Setup fixieren:** 3 Clients im selben WLAN (`operator`, `alignment`, `final-output`) auf identische `sessionId` bringen.
2. **Baseline sichern:** `Session Status` zeigt `connected`, `Session Retry` bleibt ohne `terminal`, Self-Test liefert `4/4 OK`.
3. **Jitter-Phase (10 min):**
   - Normale Bedienung: Trigger/Edit/Stop im Wechsel ausfuehren.
   - Kurzstoerungen simulieren (z. B. Handy-Hotspot kurz toggeln / WLAN kurz aus-ein auf einem Client).
   - Erwartung: kurzfristige `reconnecting`-Phasen sind zulaessig, aber **kein terminaler Retry-State**.
4. **Sync-Gate:** Running-Liste/State auf allen 3 Clients bleibt nach Rejoin konsistent (keine dauerhafte Drift).
5. **Log-Korrelation:** `logs/session-api.log` enthaelt waehrend der Abnahme fuer alle Session-Routen Access-Eintraege mit `method`, `path`, `status`, `duration`, `client-ip`.
6. **Abnahme bestanden nur wenn:**
   - kein `terminal` im Retry-Status,
   - Connect bleibt reproduzierbar erreichbar,
   - Self-Test nach Jitter erneut mindestens `4/4 OK` liefert.
