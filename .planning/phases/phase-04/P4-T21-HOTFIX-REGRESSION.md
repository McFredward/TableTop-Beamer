# P4-T21 Hotfix Regression (Plan 4-3)

## Scope
- Desktop-Containment der Running-Liste: aktive Animationen duerfen restliche Dashboard-Controls nicht blockieren.
- Preview-Decommission: kein Preview-Staging mehr in UI, Runtime-State, Event-Flows oder Server-Runtime-Endpunkten.
- Kernflow-Paritaet bleibt erhalten: Trigger/Edit/Stop/Save ohne Preview-Abhaengigkeit.

## Automated Checks

### Syntax Gate
```bash
node --check src/app.js
node --check src/app/lib/state/runtime-state.js
node --check server.mjs
```

Result: ✅ alle Checks erfolgreich.

### Preview-Removal Static Gate
- Source-Scan `src/*.js`, `index.html`, `server.mjs` auf Preview-Staging-Selektoren/-Flows:
  - `preview-global-select`
  - `stage-global-preview`
  - `stage-room-preview`
  - `send-preview-live`
  - `rollback-last-send`
  - `preview-queue`
  - `state.preview`
  - `state.live`
  - `/api/live`
  - `previewItems`

Result: ✅ keine Treffer im produktiven Source-Pfad.

### Desktop-Containment Static Gate
- `src/styles.css`:
  - `#running-animations` nutzt jetzt `max-height` + `overflow-y: auto` + `scrollbar-gutter: stable`.
  - `.running-overview-panel` nutzt `contain: layout paint` und ist nicht mehr sticky/fixed.
- `src/app.js` (`runLayoutScrollRegression`):
  - erzwingt fuer Running-Panel `position: static|relative`
  - validiert fuer Desktop `running list overflowY in [auto, scroll]`
  - validiert fuer Desktop `running list maxHeight != none`

Result: ✅ Layout-Guard deckt Containment-Bedingungen explizit ab.

## Acceptance Mapping

| Acceptance | Nachweis |
| --- | --- |
| Desktop-Containment-Test | Running-Liste ist begrenzt und scrollbar (`#running-animations`), Panel nicht sticky/fixed, Runtime-Guard prueft diese Invarianten. |
| Preview-Removal-Test | Preview-Panel in `index.html` entfernt; Preview-/Live-Queue-State und Flows aus `src/app.js` entfernt; `/api/live/*`-Routen aus `server.mjs` entfernt. |
| Running-List-Test (1:1) | `renderRunningAnimationsList()` bleibt unveraendert aktiv; Start/Edit/Stop-Flow wurde nicht an Preview gekoppelt. |
| Save/API-Test | Global-Defaults-Endpunkte (`/api/global-defaults`, `/api/health`) bleiben unveraendert aktiv; nur obsoleter Preview-Live-Pfad entfernt. |

## Notes
- `windowed-preview` bei Output-Route bleibt absichtlich erhalten; dies ist ein Display-Routing-Mode und kein Preview-Staging-Flow.
- Historische Planning-Dokumente aus Phase 2 enthalten weiterhin Preview-Referenzen; sie sind Archiv-/Historiennachweise und kein aktiver Runtime-Pfad.
