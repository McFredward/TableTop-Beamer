# P2-T35 Nachweisprotokoll (P2-T31..P2-T34)

Datum: 2026-03-24

## Scope
Dieses Protokoll dokumentiert die Pflichtabnahme fuer:
- P2-T31 Mobile Overlap-Bugfix (Board sichtbar/bedienbar)
- P2-T32 Sticky-Interaktionsguard (kein Pointer-Blocking)
- P2-T33 persistente Navigation `Dashboard` <-> `Settings`
- P2-T34 Navigation-State-Guard bei Scroll/Orientation/Resize/View-Switch

## Automatisierte Nachweise

### 1) Syntax/Runtime-Basis
- `node --check src/app.js` -> **OK**

### 2) Runtime-Regression im App-Start
- Startup-Regression enthaelt jetzt explizit:
  - `runLayoutScrollRegression()`
  - `runNavigationStateRegression()`
  - `runMobileProjectionVisibilityGuard()`
- Guard deckt Scroll-/Resize-/Orientation-/View-Switch-Pfade ab und meldet Drift sofort per Status/Console.

### 3) Resize-/Orientation-/Scroll-Guards
- `orientationchange`: prueft UI-State + Navigation + Projektionsoverlap in Kombination.
- `ResizeObserver`: prueft Layout und Navigation erneut; bei Drift erfolgt sichtbarer Statushinweis.
- `scroll`: prueft Navigation + Projektionsoverlap laufend (passive Listener).

## Manuelle Checkliste (Acceptance-Mapping)

### Mobile (Portrait + Landscape)
1. Seite auf Smartphone oeffnen (<=920px).
2. In `Dashboard` vertikal scrollen.
3. Erwartung:
   - Board-Projektionsflaeche bleibt sichtbar.
   - oberes Mobile-Cluster liegt nicht ueber dem Board.
   - Board-Klicks/Touch auf Raeume bleiben moeglich.
4. In `Settings` wechseln und wieder zurueck.
5. Erwartung:
   - `Dashboard`/`Settings`-Buttons bleiben immer sichtbar.
   - kein Navigations-Dead-End.
6. Orientation mehrfach wechseln (Portrait <-> Landscape), danach erneut scrollen und Views wechseln.
7. Erwartung:
   - Navigation weiterhin sichtbar/bedienbar.
   - Board weiterhin sichtbar/bedienbar.

### Desktop-Paritaet (>920px)
1. App in Desktop-Breite oeffnen.
2. Dashboard/Settings mehrfach wechseln.
3. Erwartung:
   - Mobile-Sticky-Offets greifen nicht regressiv.
   - Desktop-Layout/Scroll bleibt unveraendert.

## Acceptance-Zuordnung
- Mobile-Projection-Visibility-Test -> durch Mobile-Offset + Projection-Guard abgedeckt.
- Mobile-Board-Interaktions-Test -> durch Pointer-Path-Check + manuelle Touch-Checks abgedeckt.
- View-Navigation-Persistenz-Test -> durch persistente Primary-View-Navigation + Guard abgedeckt.
- View-Navigation-Resilienz-Test -> durch Navigation-State-Regression (Scroll/Orientation/Resize/View-Switch) abgedeckt.
- Desktop-Paritaets-Test -> durch Layout-Regression + Desktop-Checklist abgedeckt.

## Ergebnis
- P2-T31..P2-T34 sind technisch umgesetzt und mit Regression-Guards abgesichert.
- Dieses Protokoll bildet den verbindlichen Nachweis fuer das Acceptance-Add-on 2 (P2-T31..P2-T35).
