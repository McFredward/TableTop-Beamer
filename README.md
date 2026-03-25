# TT Beamer Prototype

Kleiner Nemesis-Prototype fur visuelle Beamer-Overlays am Spieltisch.

## Starten

1. **API + Frontend gemeinsam starten (empfohlen fuer Save-Flow):**
   - `node server.mjs`
2. Browser offnen: `http://localhost:4173`
3. Optional `F11` fur Fullscreen auf dem Beamer.

### Multi-Client Session Start (Operator / Tablet / Beamer)

1. Server im LAN starten: `node server.mjs --host 0.0.0.0 --port 4173`
2. Auf allen Geraeten denselben Host + Port verwenden (kein `:8080` Drift):
   - **Operator (Laptop):** `http://<SERVER-IP>:4173/?role=operator&session=default-session`
   - **Alignment (Tablet):** `http://<SERVER-IP>:4173/?role=alignment&session=default-session`
   - **Final Output (Raspberry/Beamer):** `http://<SERVER-IP>:4173/?role=final-output&session=default-session`
3. Im Settings-Diagnoseblock pruefen:
   - `Session Endpoint` zeigt einen `resolved endpoint` auf `http://<SERVER-IP>:4173/...`
   - `selected via` und `fallback reason` sind gesetzt und konsistent mit dem Verbindungsversuch.

### Wichtiger Save-Hinweis

- Der Button `Speichern (lokal -> globale Defaults)` schreibt per `POST /api/global-defaults` nach
  `config/global-defaults.json`.
- Dafuer muss ein **POST-faehiger API-Server** laufen (`node server.mjs`).
- Ein reiner Static-Server oder Datei-Hosting ohne API reicht **nicht** fuer Save (typischer Fehler:
  `501 Unsupported method POST`).

### API-Base konfigurieren (statisches Frontend)

- Prioritaet der API-Base-Aufloesung:
  1. `window.__TT_BEAMER_API_BASE__`
  2. URL-Parameter `?ttApiBase=http://localhost:4173` (alternativ `apiBase` / `api_base`)
  3. `localStorage["tt-beamer.api-base.v1"]`
  4. UI-Host als sicherer Default (`window.location.hostname`) mit deterministischen Port-Fallbacks `4173`, `4174`, `3000`, `8080`
- Resolver-Reihenfolge bleibt: `Override > UI-Host-Default > Fallback`.
- Im Remote/LAN-Betrieb wird **kein** stiller Client-`localhost`-Default verwendet.
- Save- und Diagnose-Status zeigen explizit `UI-Host -> API-Host`, Quelle und finalen Endpoint.
- Save + Diagnose pruefen den Endpunkt vor dem eigentlichen POST mit:
  - `GET /api/health`
  - `OPTIONS /api/global-defaults` (POST erlaubt?)
- Im `Settings`-Tab zeigt der Save-Preflight den aktiven Endpoint und konkrete Next Steps direkt im Save-/Diagnose-Feedback.

### Kurzsequenz (wenn du getrennt startest)

1. Terminal A: `node server.mjs` (API fuer Save auf Port 4173)
2. Terminal B: optional eigener Frontend-Server
3. Lokal: `http://localhost:4173`; im LAN: `http://<SERVER-IP>:4173` (zweites Geraet)
4. In `Settings` bei Save/Diagnose pruefen: `UI-Host <SERVER-IP> -> API-Host <SERVER-IP>`

### Session Resolver Verhalten (Plan 5-3 Hotfix)

- Default fuer Session-Connect ist strikt **UI-Origin inkl. aktivem Port** (z. B. `:4173`).
- Legacy-Overrides (`window.__TT_BEAMER_API_BASE__`, URL `ttApiBase`, `localStorage`) werden nur genutzt, wenn sie gueltig **und erreichbar** sind.
- Unerreichbare/stale `localStorage`-Overrides werden automatisch verworfen; der Connect faellt auf den UI-Origin-Endpoint zurueck.

## Session-Flow (Phase 2 - final)

1. **Startup + Defaults**
   - App starten (`node server.mjs`) und `Settings` oeffnen.
   - Auf neuen/geleerten Geraeten werden globale Defaults automatisch geladen.
   - Optional manuell: `Defaults laden & anwenden`.

2. **Board + Profile/Kalibrierung**
   - `Layout` waehlen (Board A/B).
   - Hitarea, Raum-Geometrie, Spezialraum-Polygone und Ship-Maske im `Settings`-Workspace kalibrieren.
   - Persistenz erfolgt board-spezifisch ueber Board-Profile.

3. **Zonenquelle pruefen**
   - Board-Zonen kommen aus `config/zones/nemesis-board-*.json`.
   - Der Settings-Status `Zonenquelle` zeigt pro Board, ob JSON geladen wurde oder Fallback aktiv ist.

4. **Preview/Kombi aufbauen**
   - Im Dashboard zuerst Preview nutzen: `Global zu Preview` und/oder `Raum-Draft zu Preview`.
   - Mehrere Eintraege ergeben eine Kombi-Queue.

5. **Live senden + Undo**
   - `Preview an Live senden` uebernimmt die Queue in die laufende Live-Ausgabe.
   - `Letzten Send rueckgaengig` macht den letzten Commit wieder rueckgaengig (Rollback).
   - Laufende Animationen bleiben separat unter `Aktive Animationen` steuerbar (`Stop`, `Edit`, `Clear All`).

## Enthalten (Ist-Stand)

- Mobile-First Dashboard/Settings-Flow ohne Board-Overlay.
- Externe Board-Zonen (`config/zones/*.json`) inkl. Validator, Fehlerklassifikation und Fallback.
- Board-spezifische Kalibrier-/Polygon-/Outside-Profile inkl. Persistenz.
- Preview-Queue (Einzel + Kombi), Live-Send und Undo/Rollback des letzten Sends.
- Audio-Mapping pro Animation und globale Audio-Settings.
- Kombinierbare Raumzustaende fuer Raum-Rendering (`kaputt`, `brennend`, `alienCount 0..2`, `leiche`) inkl. deterministischer Layer-Komposition.
- Spezialraum-Effekte `nest`, `slime`, `decompression` mit strikt raumbezogenem Clipping.

## Safety-Hinweise

- `Clear All` ist als priorisierter Stop-Pfad implementiert und wird bereits auf
  `pointerdown` ausgelost.
- Der Stop setzt Dauer-Effekte und Event-Timer zurueck und leert Partikel sofort.
- Fuer Lastpruefungen und Regression siehe:
  - `.planning/phases/phase-01/P1-T14-LOADTEST.md`
  - `.planning/phases/phase-01/P1-T15-REGRESSION.md`

## Verifikationsartefakte (Phase 2)

- `.planning/phases/phase-02/2-VERIFICATION.md`
- `.planning/phases/phase-02/P2-T40-MOBILE-NO-OVERLAY-VERIFIKATION.md`
- `.planning/phases/phase-02/P2-T43-ZONEN-NEGATIVTESTS.md`

## Verifikationsartefakte (Phase 3)

- `.planning/phases/phase-03/3-1-VERIFICATION.md`
