# P2-T40 Nachweisprotokoll (P2-T36..P2-T39)

Datum: 2026-03-25

## Scope
Dieses Protokoll dokumentiert die Pflichtabnahme fuer:
- P2-T36 Mobile Trigger-Cluster im normalen Layoutfluss ohne Board-Overlay
- P2-T37 `Dashboard`/`Settings` auf Mobile nicht sticky/fixed
- P2-T38 Board-Containment-Guard gegen Overlay-/Pointer-Blocking
- P2-T39 Regression fuer No-Overlay-Layout inkl. Desktop-Paritaet

## Referenzbilder (Vorher/Nachher)
- **Vorher (Bug-Referenz):** `debug/screenshot_debug.jpg`
- **Nachher Mobile (Portrait):** `debug/opencode_debug1.png`
- **Nachher Mobile (Landscape):** `debug/opencode_debug2.png`

## Automatisierte Nachweise

### 1) Syntax-Basis
- `node --check src/app.js` -> **OK**

### 2) Runtime-Guards fuer Mobile No-Overlay
- `runMobileProjectionVisibilityGuard()` prueft im Mobile-Viewport:
  - keine sticky/fixed Top-Control-Elemente fuer `Dashboard`/`Settings` und Trigger-Cluster,
  - keine Pointer-Blockade auf der Projektionsflaeche (Multi-Point-Probes),
  - keine Overlays ueber dem Board bei Scroll/View-Switch/Orientation.

### 3) Regression-Checks (Mobile + Desktop)
- `runLayoutScrollRegression()` validiert:
  - Mobile: `Dashboard`/`Settings`, Trigger-/Running-/Raumstart-Cluster **nicht** sticky/fixed.
  - Desktop: bestehendes Sticky-Verhalten der Desktop-Running-Section bleibt erhalten.
- Aufrufpfade bleiben aktiv in Startup, Resize, Orientation und Navigation-Roundtrips.

## Manuelle Checkliste (Acceptance-Mapping)

### Mobile (<=920px, Portrait + Landscape)
1. Seite laden, am oberen Seitenstart bleiben.
2. Erwartung: `Dashboard` und `Settings` sind sichtbar.
3. Nach unten scrollen.
4. Erwartung:
   - Buttons scrollen normal aus dem Viewport (nicht sticky/fixed).
   - `Triggern`/`Running managen`/`Raum starten` ueberdecken das Board nicht.
   - Board bleibt sichtbar und Touch-interaktiv.
5. Zwischen `Dashboard` und `Settings` wechseln, danach Orientation wechseln, erneut scrollen.
6. Erwartung:
   - No-Overlay-Verhalten bleibt stabil,
   - keine Pointer-Blockade auf der Boardflaeche,
   - kein Navigations-Dead-End.

### Desktop-Paritaet (>920px)
1. App in Desktop-Breite oeffnen und scrollen.
2. Erwartung:
   - Desktop-Layout unveraendert,
   - Running-Panel verhaelt sich wie zuvor sticky,
   - Mobile No-Overlay-Fixes greifen nicht regressiv in Desktop ein.

## Acceptance-Zuordnung
- Mobile Trigger-Modus ohne Board-Overlay -> P2-T36 + Guard/Regression.
- Mobile `Dashboard`/`Settings` non-sticky -> P2-T37 + Layout-Regression.
- Mobile Board-Containment bei Scroll/Orientation/View-Switch -> P2-T38.
- No-Overlay + Desktop-Paritaet regressionsgeprueft -> P2-T39.
- Screenshot-Referenz `debug/screenshot_debug.jpg` als Vorher-Bezug dokumentiert -> P2-T40.

## Ergebnis
- P2-T36..P2-T39 sind technisch umgesetzt und ueber Runtime-Guards/Regression abgesichert.
- Der Vorher-/Nachher-Bezug fuer das P0-Hotfix-Add-on ist dokumentiert.
