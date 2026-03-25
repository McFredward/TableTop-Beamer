# P3-T38 State + Persistence Extraktion

Datum: 2026-03-25

## Umgesetzt
- State-Normalisierung aus `app.js` in `src/state/index.js` extrahiert (Clamps/Normalisierer fuer Room/Outside/Animation).
- Persistence-Schutz in `src/persistence/index.js` zentralisiert (`safeLocalStorageGet` / `safeLocalStorageSet`).
- `app.js` nutzt die neuen Module direkt fuer Profil-Lese-/Schreibpfade.

## Verhaltensparitaet
- Board-Profil-Persistenz bleibt ueber `BOARD_PROFILE_STORAGE_KEY` unveraendert.
- Legacy-Fallbacks (Room-Geometry/Special-Polygons/Hitarea) laufen weiterhin, jetzt mit robustem LocalStorage-Guard.

## Check
- `node --check src/state/index.js`
- `node --check src/persistence/index.js`
- `node --check src/app.js`
