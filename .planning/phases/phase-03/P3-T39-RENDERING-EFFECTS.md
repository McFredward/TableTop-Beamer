# P3-T39 Rendering + Effects Extraktion

Datum: 2026-03-25

## Umgesetzt
- `src/effects/index.js` kapselt Effekt-Typ-Aufloesung (inkl. Spezialraum-Mapping).
- `src/rendering/index.js` kapselt den sichtbaren Render-Fallback fuer Ausfallfaelle.
- `drawAnimation()` in `app.js` nutzt jetzt explizite Render-Resultate und fallbackt bei GIF-Frame-Ausfall sichtbar.

## Clipping/GIF-Loop Integritaet
- Room-Clipping bleibt unveraendert (`clipToRoom` + bestehender Polygonpfad).
- GIF-Loop-Pfad bleibt ueber `getGifPlayback`/`getGifFrameForElapsedMs` erhalten; bei temporaer fehlendem Frame wird kein stiller Audio-only-Zustand mehr gezeigt.

## Check
- `node --check src/effects/index.js`
- `node --check src/rendering/index.js`
- `node --check src/app.js`
