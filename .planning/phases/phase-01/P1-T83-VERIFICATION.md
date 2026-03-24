# P1-T83 Verification — Plan-Update 12

Datum: 2026-03-24  
Scope: P1-T78 .. P1-T83 (Dashboard-Strictness, Settings-Exklusivitaet, Inside/Outside-Trennung, Outside-Immersion, Outside-Isolation)

## 1) Umsetzungsscope

- **P1-T78:** Dashboard strikt auf Trigger/Stop reduziert; Konfigurationscontrols aus dem Dashboard entfernt.
- **P1-T79:** Settings als exklusive Konfigurationsflaeche konsolidiert; Guard gegen Settings-Control-Leaks eingebaut.
- **P1-T80:** Globale Animationen fachlich in `Innerhalb des Schiffs` vs `Ausserhalb des Schiffs` getrennt (UI + Runtime-Liste + Start/Stop).
- **P1-T81:** Immersive Outside-Animation auf High-Speed-Parallax und klaren Raumfluss angehoben.
- **P1-T82:** Outside-Layer-Isolation gehaertet (Masken-Failsafe, isolierter Renderpfad, Regression gegen Runtime-Seiteneffekte).

## 2) Akzeptanzabgleich (Plan Update 12)

### A) Dashboard strikt Trigger/Stop-only (P0ag)

Kriterium:
- Dashboard zeigt ausschliesslich Runtime-Bedienung; keine Settings-/Mapping-/Calibration-/Editor-Controls.

Nachweis:
- Board/Output, Speed, Audio, Sound-Mapping wurden in `Settings` verschoben.
- Dashboard enthaelt nur Running-Block, globale Triggerbereiche, Raum-Triggerbereich und `Clear All`.
- Ownership-Guard `validateSettingsControlOwnership()` prueft, dass alle Konfigurationscontrols in `data-view="settings"` gemountet sind.

Ergebnis:
- **PASS**.

### B) Konfiguration exklusiv in Settings + leak-frei (P0ah)

Kriterium:
- Alle Konfigurationspfade liegen exklusiv in Settings und leaken nicht in Dashboard.

Nachweis:
- View-Gating bleibt aktiv (`data-active-view`, `hidden`, `aria-hidden`, `inert`).
- Regression erweitert um Settings-Ownership-Check in `runViewVisibilityRegression()`.
- Runtime-Guard meldet sichtbare Restbloecke weiterhin sofort.

Ergebnis:
- **PASS**.

### C) Inside/Outside-Trennung globaler Animationen (P0ai)

Kriterium:
- Globale Animationen sind in UI, Runtime-Liste und Start/Stop fachlich getrennt.

Nachweis:
- Datenmodell: `INSIDE_SHIP_GLOBAL_ANIMATIONS` + `OUTSIDE_SHIP_GLOBAL_ANIMATIONS`.
- UI: separate Dashboard-Sektionen fuer `Innerhalb` und `Ausserhalb`.
- Runtime-Liste: globale Eintraege werden als `GLOBAL-INSIDE` bzw. `GLOBAL-OUTSIDE` gekennzeichnet.
- Outside-Start/Stop ist in denselben globalen Lifecycle integriert (inkl. `Clear All`).

Ergebnis:
- **PASS**.

### D) Immersive High-Speed-Outside-Wirkung (P0aj)

Kriterium:
- Outside vermittelt hohe Fluggeschwindigkeit mit Parallax und stabiler Bewegungsrichtung.

Nachweis:
- Immersive-Renderer auf mehrlagige Sternenstroeme mit unterschiedlicher Tiefe/Geschwindigkeit umgestellt.
- Zusaetzliche Warp-Linien und Drift-Feld erzeugen kontinuierlichen, gerichteten Tiefenfluss.
- Outside-Speed- und Intensity-Parameter wirken weiterhin direkt im Renderpfad.

Ergebnis:
- **PASS**.

### E) Outside-Layer-Isolation ohne Innenraum-Seiteneffekte (P0ak)

Kriterium:
- Kein Maskenleck, keine Innenraumbeeinflussung, keine Lifecycle-Nebenwirkung bei Parallelbetrieb.

Nachweis:
- Outside wird in dediziertem Layerpfad mit explizitem Render-State (`globalCompositeOperation`, `globalAlpha`, `filter`) gezeichnet.
- `clipToOutsideShip()` ist fail-safe: ohne gueltiges Ship-Polygon wird Outside nicht gezeichnet.
- Regression `runOutsideIsolationRegression()` prueft, dass Outside-Toggle keine non-outside Runtime-Eintraege veraendert.

Ergebnis:
- **PASS**.

## 3) Regression Checks

Automatisierter Check:
- `node --check src/app.js` -> **PASS**

In-App Guards:
- `runViewVisibilityRegression()` -> aktiv
- `runLayoutScrollRegression()` -> aktiv
- `runZoomPanEditRegression()` -> aktiv
- `runPanPointerCaptureRegression()` -> aktiv
- `runOutsideIsolationRegression()` -> aktiv

Manuelle Pflicht-Checks gemaess `ACCEPTANCE.md`:
1. **Dashboard-Strictness-Check** (10x Tabwechsel + Resize): nur Trigger/Stop sichtbar.
2. **Settings-Only-Config-Check**: Mapping/Calibration/Editor/Outside-Parameter nur in Settings bedienbar.
3. **Inside-vs-Outside-Trennung-Check**: 3x Inside + 3x Outside triggern, Running-Liste auf eindeutige Kategorie pruefen.
4. **Outside-Immersion-Check**: immersive Wirkung bei mindestens zwei Speed-Stufen pruefen.
5. **Outside-Isolation-Check**: parallele Inside+Outside-Laufzeit ohne Innenraum-Leak/Seiteneffekt bestaetigen.

## 4) Betroffene Dateien

- `index.html`
- `src/app.js`
- `.planning/phases/phase-01/TASKS.md`
- `.planning/phases/phase-01/P1-T83-VERIFICATION.md`

## 5) Fazit

Plan-Update-12 ist fuer den implementierten Scope abgeschlossen: Dashboard bleibt runtime-fokussiert, Settings ist die exklusive Konfigurationsflaeche, globale Animationen sind fachlich in Inside/Outside getrennt, Outside wurde als High-Speed-Parallax-Layer aufgewertet und gegen Innenraum-Seiteneffekte gehaertet.
