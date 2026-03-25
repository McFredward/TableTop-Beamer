# P5-T15..P5-T20 Hotfix Acceptance Evidence

- Datum (UTC): 2026-03-25T21:23:27Z
- Scope: Overlay-Semantik, Session-Connect-Robustheit, Retry/Backoff, UI-Diagnose

## Acceptance Mapping (Phase 5)

Referenz: `.planning/phases/phase-05/ACCEPTANCE.md`

1. **Overlay-Semantik-Test** (`operator` immer sichtbar, Toggle nur `final-output`)
   - `src/app.js:853` `shouldRenderOverlay()` rendert Overlay fuer non-final **oder** bei aktivem Final-Toggle.
   - `src/app.js:857` `shouldShowOverlayGuides()` erzwingt fuer `operator` immer `true` und nutzt fuer `final-output` ausschliesslich `alignmentOverlayEnabled`.

2. **Session-Hotfix-Test** (kein fragiler `default-session`-Pfad)
   - `src/app.js:292` `getPreferredSessionIdCandidates()` priorisiert konkrete Session-IDs vor `default-session`.
   - `src/app.js:321` `resolveSessionApiCandidates()` nutzt deterministische Endpoint-Aufloesung inkl. API-Base-Kandidaten.
   - `src/app.js:715` `connectSession()` probiert Candidate-Endpoints + Join-Fallback ohne stale `clientId`.

3. **Retry/Backoff-Test** (Jitter, Counter, terminal state)
   - `src/app.js:595` `scheduleSessionReconnect()` implementiert exponentielles Backoff + Jitter + Max-Attempts.
   - `src/app.js:607` terminal reconnect-state setzt klaren Abbruchzustand.

4. **Diagnose-Transparenz-Test** (Endpoint/Status/Fehler/Retry/letzter Erfolg in UI)
   - UI-Felder in `index.html:113-121`:
     - `#session-endpoint-status`
     - `#session-connection-state-status`
     - `#session-last-error-status`
     - `#session-retry-status`
     - `#session-last-success-status`
   - Runtime-Sync in `src/app.js:409` `syncSessionDiagnosticsPanel()`.

5. **Structured Session Errors (kein Rohfehler-Noise)**
   - `src/app.js:223` `SESSION_ERROR_MESSAGES` (kanonische Fehlertexte)
   - `src/app.js:477` `setSessionRetryError()` (strukturierte Code+Text-Ausgabe)

## Regression Commands

Ausgefuehrt:

```bash
node --check src/app.js
node --check src/app/state/runtime-state.js
node --check server.mjs
```

Ergebnis: **alle erfolgreich, kein Syntaxfehler**.

## Manual 3-Device Hinweis

Diese Datei dokumentiert den Hotfix-Implementationsnachweis fuer P5-T15..P5-T20.
Der explizite 3-Device-Feldnachweis als Gate ist weiterhin in P5-T21/P5-T22 vorgesehen.
