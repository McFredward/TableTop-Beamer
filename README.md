# TT Beamer Prototype

Kleiner Nemesis-Prototype fur visuelle Beamer-Overlays am Spieltisch.

## Starten

1. **API + Frontend gemeinsam starten (empfohlen fuer Save-Flow):**
   - `node server.mjs`
2. Browser offnen: `http://localhost:4173`
3. Optional `F11` fur Fullscreen auf dem Beamer.

### Wichtiger Save-Hinweis

- Der Button `Speichern (lokal -> globale Defaults)` schreibt per `POST /api/global-defaults` nach
  `config/global-defaults.json`.
- Dafuer muss ein **POST-faehiger API-Server** laufen (`node server.mjs`).
- Ein reiner Static-Server oder Datei-Hosting ohne API reicht **nicht** fuer Save (typischer Fehler:
  `501 Unsupported method POST`).

### Kurzsequenz (wenn du getrennt startest)

1. Terminal A: `node server.mjs` (API fuer Save auf Port 4173)
2. Terminal B: optional eigener Frontend-Server
3. Fuer Save immer die App ueber `http://localhost:4173` nutzen

## Session-Flow (Phase 1)

1. **Board waehlen** im Panel `Step 1 - Board`.
2. **Kalibrieren** ueber Offset/Scale/Rotation und **Master Intensity** im Panel `Step 2`.
3. **Effekte triggern** im Panel `Step 3 - Quick Triggers`.

Kalibrierung und Board-Auswahl werden session-lokal im Browser gehalten. Mit
`Reset Calibration Defaults` springt die Session auf sichere Startwerte zurueck.

## Enthalten

- Board-Auswahl fur die zwei hinterlegten Nemesis-Boards.
- Manuelle Trigger fur Atmosphare und Event-Effekte.
- Master-Intensity + grobe Kalibrierung (Offset/Scale/Rotation).
- Sofortiges `Clear All` als Safety-Control.

## Safety-Hinweise

- `Clear All` ist als priorisierter Stop-Pfad implementiert und wird bereits auf
  `pointerdown` ausgelost.
- Der Stop setzt Dauer-Effekte und Event-Timer zurueck und leert Partikel sofort.
- Fuer Lastpruefungen und Regression siehe:
  - `.planning/phases/phase-01/P1-T14-LOADTEST.md`
  - `.planning/phases/phase-01/P1-T15-REGRESSION.md`

## Nachechster Schritt

- Kalibrierungsprofile speichern/laden.
- Hotkeys (z. B. Stream Deck/Tastatur).
- Board-Zonen pro Layout als Datenfile auslagern.
