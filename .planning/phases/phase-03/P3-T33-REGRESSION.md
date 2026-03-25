# P3-T33 Regression - Direct-Start + Edit-Flow + Reload (3-4)

Datum: 2026-03-25

## Scope
- Plan 3-4 Hotfix: P3-T32..P3-T33
- Fokus: End-to-End-GIF-Mapping im Pfad `Direct-Start -> Edit -> Reload`

## Automatisierte Checks

1. Syntax
   - `node --check src/app.js`
   - `node --check server.mjs`
   - Ergebnis: **OK**

2. Direct-Start-Mapping bis `createAnimation`
   - `startRoomAnimationFromDraft()` uebergibt `draftPayload.gifAssetPath` explizit an `createAnimation(...)`.
   - Ergebnis: **OK** (`gifAssetPath` wird im Startpfad nicht mehr implizit verworfen)

3. Runtime-Regression fuer Kette Direct-Start -> Edit -> Reload
   - `runGifDirectStartEditReloadRegression()` in `src/app.js`
   - Gepruefte Guards:
     - Direct-Start erzeugt Instanz mit gemapptem `gifAssetPath`
     - Edit aktualisiert dieselbe Instanz-ID in-place ohne GIF-Drift
     - Reload-Snapshot (`buildLocalProfileSnapshotFromState` + `applyLocalProfileSnapshotToState`) stellt Mapping stabil wieder her
   - Ergebnis: **OK** (Guard aktiv im Startup-Regression-Block)

## Ergebnis
Regression fuer Plan-3-4-Hotfix ist **gruen**; der GIF-Mapping-Pfad bleibt ueber Direct-Start, Edit und Reload konsistent.
