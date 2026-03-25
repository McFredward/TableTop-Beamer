# P3-T55 Regression (3-7)

Datum: 2026-03-25

## Scope
- Render-Loop bleibt trotz Layer-/Clip-Fehlern aktiv.
- Outside-/Ship-Clipping nutzt browserrobusten Fallback ohne harte `evenodd`-Abhaengigkeit.
- Outside-Fehler blockieren Inside/Room/GIF nicht.
- Preview bleibt entfernt.

## Checks
1. Syntax
   - `node --check src/app.js`
   - `node --check server.mjs`
   - Ergebnis: **OK**

2. Preview- und Live-Rollback-Restpfade
   - Pattern-Check auf `preview-*` IDs sowie `/api/live/*` Endpunkte in `index.html`, `src/*.js`, `server.mjs`
   - Ergebnis: **kein Treffer**

3. Render-Loop-Fail-Safe + Telemetrie
   - Draw-Tick fuehrt pro Frame Fehlerzaehler (`outside`, `animation`, `clip`, `scheduler`) mit weiterlaufendem `requestAnimationFrame`.
   - Repro-Harness verfuegbar: `window.__TT_BEAMER_RENDER_HARNESS__` mit `injectOutsideLayerFailureOnce()`, `injectClipFailureOnce()`, `getSnapshot()`.
   - Ergebnis: **OK**

4. Clip-Kompatibilitaet
   - Capability-Detection prueft `ctx.clip("evenodd")` Verhalten.
   - Bei Inkompatibilitaet: Outside wird voll gezeichnet und Schiffsmaskenflaeche per `destination-out` ausgeschnitten.
   - Ergebnis: **OK**

5. Outside-Failure-Isolation
   - Startup-Regression injiziert Outside-Fehler und prueft, dass ein Inside/Global-Probe-Layer weiterhin erfolgreich rendert.
   - Ergebnis: **OK**

## Ergebnis
Die Root-Cause-Hotfixes aus Plan 3-7 sind regressionsseitig abgesichert: Render-Loop bleibt lebendig, Outside-Clip ist kompatibel gehaertet, und Outside-Fehler kaskadieren nicht mehr auf Inside/Room/GIF.
