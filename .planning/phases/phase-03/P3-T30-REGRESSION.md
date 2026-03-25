# P3-T30 Regression - GIF-Loop + Mapping Rework (3-3)

Datum: 2026-03-25

## Scope
- Plan 3-3 Rework: P3-T26..P3-T29
- Fokus: echte GIF-Loop-Runtime, GIF-Mapping-UI, Persistenzpfad

## Automatisierte Checks

1. Syntax
   - `node --check src/app.js`
   - `node --check server.mjs`
   - Ergebnis: **OK**

2. Runtime-Pfad fuer echte GIF-Frames vorhanden
   - `ImageDecoder` + `getGifPlayback` + `getGifFrameForElapsedMs` in `src/app.js`
   - Ergebnis: **OK** (Decoder-/Frame-Selektion aktiv)

3. GIF-Mapping-UI vorhanden
   - `#gif-mapping-animation`, `#gif-mapping-asset`, `#gif-mapping-status` in `index.html`
   - Ergebnis: **OK**

4. Persistenzfelder vorhanden
   - `animationGifMap` in `src/app.js` (State + Normalisierung + Local Snapshot + Global Defaults Apply)
   - `animationGifMap` in `server.mjs` (`POST /api/global-defaults` Save-Payload)
   - Ergebnis: **OK**

## Guard-Fokus gegen Regression
- GIF-Renderer nutzt keine Pulsing-Einzelbild-Simulation mehr als Primärpfad; stattdessen framebasierte Selektion aus Decoderdaten.
- Running-Instanzen behalten `gifAssetPath` instanzscharf (kein Mapping-Drift auf bereits laufende IDs).
- Mapping-Aenderungen triggern unmittelbare lokale Persistenz (`persistBoardProfiles`).

## Ergebnis
Regression-Baseline fuer Plan-3-3-Rework ist **gruen**.
