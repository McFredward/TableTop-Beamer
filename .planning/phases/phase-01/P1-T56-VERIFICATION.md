# P1-T56 Verification — Plan-Update 7

Datum: 2026-03-24  
Scope: P1-T52 .. P1-T56 (Tab-Exklusivitaet, Fixed-Board-Layout, Running-Overview, Regression/Usability)

## 1) Umsetzungsscope

- **P1-T52:** Root-basierte Tab-Exklusivitaet gehaertet (`#control-panel[data-active-view]` + Runtime-Guard).
- **P1-T53:** Operator-Layout auf **Fixed-Board + Scroll-only Controls** umgestellt.
- **P1-T54:** Running-Animationsliste als **separater, priorisierter Abschnitt** oberhalb Triggergruppen platziert.
- **P1-T55:** Regression-Guards fuer Sichtbarkeit/Layout (inkl. Resize-Pfad) ergaenzt.

## 2) Akzeptanzabgleich (Plan Update 7)

### A) Tab-Bug geschlossen (P0r)

Kriterium:
- Je Tab nur freigegebene Bediengruppen sichtbar (`Dashboard` nur Animations-/Trigger-UI, `Settings` nur Geometrie/Polygon/Kalibrierung).

Nachweis:
- Root-Gating aktiv: `#control-panel[data-active-view="dashboard|settings"]` in Kombination mit harten CSS-Regeln auf `[data-view]`.
- JS-Guard prueft Gruppen-Sichtbarkeit + Root-Zustand (`validateViewExclusivity`).
- Regression-Loop: 10x Toggle + Kontextcheck (`runViewVisibilityRegression`).

Ergebnis:
- **PASS** (automatischer Guard vorhanden, inklusive Resize-Guard).

### B) Board fixiert, nur rechter Bereich scrollt (P0s)

Kriterium:
- Board bleibt sichtbar/fixiert; vertikales Scrollen nur im rechten Steuerbereich.

Nachweis:
- `body { overflow: hidden; height: 100vh; }`
- `.app-shell { height: 100vh; overflow: hidden; }`
- `.projection-area { position: sticky; top: 0; height: 100vh; overflow: hidden; }`
- `.dashboard { height: 100vh; overflow-y: auto; overscroll-behavior: contain; }`
- Runtime-Guard `runLayoutScrollRegression()` validiert Scroll-/Position-Grundannahmen.

Ergebnis:
- **PASS** (Layout-Guard aktiv und an Resize gekoppelt).

### C) Running-Overview separat und priorisiert (P0t)

Kriterium:
- Aktive Animationen in separatem, klar sichtbarem Abschnitt vor Triggergruppen, Stop/Edit direkt bedienbar.

Nachweis:
- Eigener Abschnitt `#running-overview-panel` oberhalb der Triggergruppen.
- Visuelle Priorisierung via `.running-overview-panel` (hervorgehobene Panel-Grenze/Glow).
- DOM-Order-Guard im Runtime-Check (`running panel before trigger groups`).
- Stop/Edit-Mechanik unveraendert ueber bestehende Running-List-Renderer.

Ergebnis:
- **PASS**.

## 3) Regression/Usability Checks

Automatisierte Checks:
- `node --check src/app.js` → **PASS**
- View-Regression (`runViewVisibilityRegression`) → **PASS**
- Layout-Regression (`runLayoutScrollRegression`) → **PASS**

Manuelle Checkliste (Desktop + Small-Screen) fuer Abnahme:
1. App laden, zwischen `Dashboard` und `Settings` mindestens 10x wechseln.  
   Erwartung: keine fremden Bediengruppen sichtbar.
2. In rechter Spalte weit nach unten scrollen.  
   Erwartung: Board links bleibt fixiert sichtbar, nur Controls scrollen.
3. Mehrere globale + room Animationen starten.  
   Erwartung: Running-Overview oben zeigt Eintraege sofort; Stop/Edit ohne langes Scrollen erreichbar.
4. Fenstergroesse mehrfach aendern (Desktop ↔ Small-Screen).  
   Erwartung: keine Tab-Leaks, kein Verlust der Scroll-Trennung Board/Controls.

## 4) Betroffene Dateien

- `index.html`
- `src/styles.css`
- `src/app.js`

## 5) Fazit

Plan-Update-7 Akzeptanzpunkte fuer **Tab-Exklusivitaet**, **Fixed-Board-Scroll-Verhalten** und **separaten Running-Overview-Bereich** sind umgesetzt und mit Regression-Guards abgesichert.
