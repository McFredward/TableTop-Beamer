# P1-T111 Verification - Plan Update 17

Datum: 2026-03-24

## Ziel

Pflichtabnahme + Doku-Sync fuer Plan-Update 17 (P1-T107..P1-T111):

- LAN-sicherer Resolver-Default (UI-Host statt Client-`localhost`)
- Override-Prioritaet bleibt kompatibel (`override > ui-host-default > fallback`)
- Save/Diagnose host-transparent mit Remote/LAN-Hinweisen
- Reproduzierbarer Save-Roundtrip (5x + Reload/Restart)

## Nachweise

### 1) Pflichtkriterien aus `ACCEPTANCE.md`

Abgedeckt in Abschnitt **"Plan Update 17 - Pflichtabnahme (P1-T107..P1-T111)"**.

### 2) Technische Regression

Siehe `.planning/phases/phase-01/P1-T110-VERIFICATION.md`:

- Resolver-Regression (`REMOTE_FIRST=192.168.0.80`, `REMOTE_HAS_LOCALHOST=false`)
- Override-Regel (`OVERRIDE_FIRST=localhost`, `OVERRIDE_SOURCE=override:url(ttApiBase)`)
- Save-Repro (`HEALTH=200 OPTIONS=204 SAVE=[200,200,200,200,200] SAVE_AFTER_RESTART=200`)

### 3) Runbook-/Startdoku-Sync

`README.md` aktualisiert:

- API-Resolver-Prioritaet und LAN-sicherer UI-Host-Default beschrieben
- expliziter Hinweis gegen stillen Client-`localhost`-Fallback im Remote-Betrieb
- Save/Diagnose-Transparenz (`UI-Host -> API-Host`, Quelle, Endpoint)
- LAN-Kurzsequenz fuer Zweitgeraet (`http://<SERVER-IP>:4173`)

## Ergebnis

Plan-Update 17 ist fachlich und dokumentarisch synchronisiert; Pflichtabnahme-Referenzen fuer Resolver, UX und LAN-Repro sind vorhanden.
